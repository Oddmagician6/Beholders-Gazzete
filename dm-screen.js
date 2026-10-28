/* ============================================
   DM SCREEN PAGE (F57): dm-screen.html
   A board of cards in named layouts (dm-screen-data.js keeps them). Drag a card by its ⠿ grip (mouse or touch),
   or use the grip's arrow keys or the ⋯ menu's Earlier / Later; the ⋯ menu also sets the width
   (1–3 columns on a wide screen, one column on a phone) and height, and removes the card.
   📺 on a card puts it in the player view (screen-view.html), which follows this browser's storage.
   Clock, table, party, initiative, and notebook cards read and write their own tools' keys,
   and redraw when another tab changes them.
   ============================================ */

let ds = dsLoad();
const dsUi = { menu: null, pick: new Set(), msgs: {}, msgTimers: {}, blocksFailed: false };

// Page helpers: toolbox-statblock.js and spell-detail.js use esc().
function esc(text) {
    return dsEsc(text);
}

function flash(text) {
    const el = document.getElementById('ds-status');
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 3000);
}

function armedClick(btn, label, action) {
    if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = '⚠️ Click again';
        btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 3000);
        return;
    }
    clearTimeout(btn._t);
    delete btn.dataset.armed;
    btn.textContent = label;
    action();
}

function dsLayout() {
    return dsCurrent(ds);
}

function dsCard(id) {
    return dsLayout().cards.find(c => c.id === id) || null;
}

function dsStore() {
    if (!dsSave(ds)) flash("⚠️ This browser wouldn't save the screen (storage full or blocked).");
}

// A message under one card (a bad dice formula), cleared on its next draw after a while.
function cardMsg(id, text) {
    dsUi.msgs[id] = text;
    renderCard(id);
    clearTimeout(dsUi.msgTimers[id]);
    dsUi.msgTimers[id] = setTimeout(() => {
        delete dsUi.msgs[id];
        const p = document.querySelector(`.ds-card[data-card="${id}"] .ds-msg`);
        if (p) p.remove();
    }, 4000);
}

// ── Pickers: what a card shows ────────────────────────────
function optionsHtml(list, cur, blank) {
    return `<option value="">${dsEsc(blank)}</option>` + list.map(([v, label]) => `<option value="${dsEsc(v)}"${v === cur ? ' selected' : ''}>${dsEsc(label)}</option>`).join('');
}

function pickerHtml(c, ctx) {
    const lab = (text, field) => `<label class="ds-pick-label"><span>${text}</span>${field}</label>`;
    if (c.type === 'rules') {
        return lab('Rules card', `<select data-pick="rule">${optionsHtml(RULES_CARDS.map(r => [r.id, `${r.icon} ${r.title}`]), c.rule, 'Choose a card…')}</select>`);
    }
    if (c.type === 'clock') {
        const list = ctx.clocks();
        return (list.length ? lab('Clock', `<select data-pick="clock">${optionsHtml(list.map(k => [k.id, `${k.name || 'Unnamed clock'} (${k.filled}/${k.size})`]), c.clock, 'Choose a clock…')}</select>`) : '')
            + `<form class="ds-inline" data-form="clock-new">
                <label class="ds-pick-label"><span>${list.length ? 'Or start a new one' : 'Start a clock'}</span><input type="text" name="name" maxlength="60" placeholder="Clock name" autocomplete="off"></label>
                <label class="ds-pick-label ds-narrow"><span>Segments</span><select name="size">${CLOCK_SIZES.map(n => `<option${n === 6 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
                <button type="submit" class="ds-btn">➕ New Clock</button>
            </form>`;
    }
    if (c.type === 'table') {
        const list = ctx.tables();
        if (!list.length) return '<p class="ds-faint">No tables yet. Make one (or add the examples) on the <a href="toolbox?tab=tables">Toolbox\'s Tables tab</a>.</p>';
        return lab('Table', `<select data-pick="table">${optionsHtml(list.map(t => [t.id, t.name || 'Untitled table']), c.table, 'Choose a table…')}</select>`);
    }
    if (c.type === 'entry') {
        const nb = ctx.nb();
        if (!nb.entries.length) return '<p class="ds-faint">The notebook is empty. Save rolls, sessions, or quests in the <a href="worldbuilder?tab=notebook">Worldbuilder\'s notebook</a>.</p>';
        const groups = Object.entries(NB_KINDS).map(([kind, k]) => {
            const list = nb.entries.filter(e => e.kind === kind);
            return list.length ? `<optgroup label="${dsEsc(`${k.icon} ${k.label}`)}">${list.map(e => `<option value="${e.id}"${e.id === c.entry ? ' selected' : ''}>${dsEsc(e.title)}</option>`).join('')}</optgroup>` : '';
        }).join('');
        return lab('Entry', `<select data-pick="entry"><option value="">Choose an entry…</option>${groups}</select>`);
    }
    if (c.type === 'monster') {
        const m = Object.hasOwn(MONSTER_BY_ID, c.m) ? MONSTER_BY_ID[c.m] : null;
        return `<form class="ds-inline" data-form="monster">
            <label class="ds-pick-label"><span>Monster (SRD or your homebrew)</span><input type="text" name="m" list="ds-monsters" maxlength="80" placeholder="Type a name: goblin, lich…" autocomplete="off" value="${m ? dsEsc(monsterLabel(m)) : ''}"></label>
            <button type="submit" class="ds-btn">🐉 Show</button>
        </form>`;
    }
    return '';
}

function monsterLabel(m) {
    return m.hb ? `${m.name} (homebrew)` : m.name;
}

function renderMonsterList() {
    const rows = [...hbRows, ...MONSTERS];
    document.getElementById('ds-monsters').innerHTML = rows.map(m => `<option value="${dsEsc(monsterLabel(m))}"></option>`).join('');
}

function findMonster(text) {
    const k = text.trim().toLowerCase();
    if (!k) return null;
    const rows = [...hbRows, ...MONSTERS];
    return rows.find(m => monsterLabel(m).toLowerCase() === k) || rows.find(m => m.name.toLowerCase() === k)
        || rows.find(m => m.name.toLowerCase().startsWith(k)) || null;
}

// ── Card bodies ───────────────────────────────────────────
function rulesBody(c) {
    const r = dsRule(c.rule);
    return r ? `<div class="rules-card ds-rules">${dsRuleBody(r)}</div>` : null;
}

function clockBody(c, ctx) {
    const k = ctx.clocks().find(x => x.id === c.clock);
    if (!k) return c.clock ? '<p class="ds-faint">This clock is gone (removed in the Toolbox). Choose another.</p>' + pickerHtml(c, ctx) : null;
    const full = k.filled >= k.size;
    return `<div class="ds-clock${full ? ' full' : ''}" title="Click a segment to fill up to it; click the last filled one to empty it">${clockSvg(k.size, k.filled)}</div>
        <div class="ds-clock-row">
            <button type="button" class="ds-btn" data-act="clk-dec" aria-label="Empty a segment"${k.filled ? '' : ' disabled'}>−</button>
            <span class="ds-clock-state">${full ? '⏰ Complete' : `${k.filled} / ${k.size}`}</span>
            <button type="button" class="ds-btn" data-act="clk-inc" aria-label="Fill a segment"${full ? ' disabled' : ''}>+</button>
        </div>
        <p class="ds-links"><a href="toolbox?tab=clocks">⏳ All clocks</a></p>`;
}

function tableBody(c, ctx) {
    const t = ctx.tables().find(x => x.id === c.table);
    if (!t) return c.table ? '<p class="ds-faint">This table is gone (deleted in the Toolbox). Choose another.</p>' + pickerHtml(c, ctx) : null;
    let entries = '';
    try {
        const p = parseTable(t.src, t.die);
        entries = `<ol class="ds-print-only ds-entries">${p.entries.map(e => `<li><b>${e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</b> ${dsEsc(e.text)}</li>`).join('')}</ol>`;
    } catch (e) {
        entries = `<p class="ds-faint">⚠️ ${dsEsc(e.message)}</p>`;
    }
    return `<div class="ds-row">
            <button type="button" class="ds-btn ds-gold" data-act="table-roll">🎲 Roll</button>
            ${c.rolls.length ? '<button type="button" class="ds-btn" data-act="table-clear">🧹 Clear</button>' : ''}
            <a class="ds-small-link" href="toolbox?tab=tables">Edit tables</a>
        </div>
        ${c.rolls.length ? `<ol class="ds-results">${c.rolls.map((r, i) => `<li${i ? '' : ' class="ds-latest"'}><span class="ds-result">${dsEsc(r.t)}</span>${r.s ? `<span class="ds-steps">${dsEsc(r.s)}</span>` : ''}</li>`).join('')}</ol>` : ''}
        ${entries}`;
}

function diceBody(c) {
    const quick = [4, 6, 8, 10, 12, 20, 100].map(n => `<button type="button" class="ds-die" data-act="die" data-v="1d${n}">d${n}</button>`).join('');
    return `<div class="ds-dice-quick">${quick}</div>
        <form class="ds-inline" data-form="dice">
            <label class="ds-pick-label"><span>Roll</span><input type="text" name="f" maxlength="${DS_LIMITS.formula}" value="${dsEsc(c.f)}" placeholder="2d6+3, 4d6kh3" autocomplete="off" spellcheck="false"></label>
            <button type="submit" class="ds-btn ds-gold" name="mode" value="normal">🎲 Roll</button>
            <button type="submit" class="ds-btn" name="mode" value="adv" title="Roll the d20 twice, keep the higher">Adv</button>
            <button type="submit" class="ds-btn" name="mode" value="dis" title="Roll the d20 twice, keep the lower">Dis</button>
        </form>
        ${c.rolls.length ? `<ol class="ds-results ds-dice-results">${c.rolls.map((r, i) => `<li${i ? '' : ' class="ds-latest"'}>
            <span class="ds-total">${r.total}</span><span class="ds-dice-f">${dsEsc(r.f)}</span>${r.crit ? DS_CRIT[r.crit] : ''}<span class="ds-steps">${dsEsc(r.d)}</span></li>`).join('')}</ol>
            <button type="button" class="ds-btn ds-mini" data-act="dice-clear">🧹 Clear</button>` : ''}`;
}

const DS_HEALTH = { healthy: '💚', bloodied: '🩸', down: '💀' };

function initBody(ctx) {
    const f = ctx.fight();
    const links = '<p class="ds-links"><a href="toolbox?tab=init">⚔️ Open the tracker</a> <a href="player-view" target="gazette-player-view">📺 Players\' initiative</a></p>';
    const blank = `<table class="ds-print-only ds-grid-table"><thead><tr><th>Init</th><th>Name</th><th>HP</th><th>Conditions</th></tr></thead><tbody>${'<tr><td></td><td></td><td></td><td></td></tr>'.repeat(10)}</tbody></table>`;
    const list = f.list.filter(c => c && typeof c.name === 'string').slice(0, 40);
    if (!list.length) return `<p class="ds-faint">No fight yet. Add combatants on the Toolbox's Initiative tab, and they show up here.</p>${blank}${links}`;
    const turn = list.some(c => c.id === f.turn) ? f.turn : null;
    const rows = list.map(c => {
        const hp = typeof c.hp === 'number' ? `${c.hp}${typeof c.max === 'number' ? `/${c.max}` : ''}${c.temp > 0 ? ` +${Math.round(c.temp)}` : ''}` : '';
        const health = initHealth(c);
        const conds = Array.isArray(c.conds) ? c.conds.filter(x => typeof x === 'string').slice(0, 15) : [];
        return `<tr class="${c.id === turn ? 'ds-now' : ''}${health === 'down' ? ' ds-down' : ''}">
            <td>${c.id === turn ? '▶ ' : ''}${Number.isFinite(c.init) ? c.init : ''}</td>
            <td>${c.pc ? '👤 ' : ''}${dsEsc(c.name.slice(0, 40))}${!c.pc && c.shown !== true ? ' <span class="ds-hidden-name" title="Players see an unknown creature">🙈</span>' : ''}
                ${conds.length ? `<span class="ds-conds">${conds.map(x => `<span>${dsEsc(x.slice(0, 20))}</span>`).join('')}</span>` : ''}</td>
            <td>${health ? `<span aria-hidden="true">${DS_HEALTH[health]}</span> ` : ''}${hp}</td>
            <td>${typeof c.ac === 'number' ? c.ac : ''}</td>
        </tr>`;
    }).join('');
    return `<p class="ds-init-head">Round ${Math.max(1, Math.round(Number(f.round)) || 1)}${turn === null ? ' · not started' : ''}</p>
        <table class="ds-table"><thead><tr><th>Init</th><th>Name</th><th>HP</th><th>AC</th></tr></thead><tbody>${rows}</tbody></table>${links}`;
}

// Max HP, or the Play Sheet's current HP when it pushes one (F68), with its conditions.
function partyHpCell(p) {
    if (!p.live) return p.hp === null ? '' : p.hp;
    const l = p.live, conds = [...l.conds, ...(l.exh ? [`Exhaustion ${l.exh}`] : []), ...(l.conc ? [`🧠 ${l.conc}`] : [])];
    return `<span title="From the Play Sheet">${l.hp}/${l.max}${l.temp ? ` +${l.temp}` : ''}</span>${conds.length ? `<span class="ds-conds">${conds.map(x => `<span>${dsEsc(x)}</span>`).join('')}</span>` : ''}`;
}

function partyBody(ctx) {
    const party = ctx.party();
    if (!party.length) return '<p class="ds-faint">No party yet. Enter the characters once on the <a href="toolbox?tab=party">Toolbox\'s Party tab</a>.</p>';
    const n = v => (v === null ? '' : v);
    return `<table class="ds-table"><thead><tr><th>Character</th><th>Class</th><th>AC</th><th>HP</th><th title="Passive Perception">PP</th></tr></thead><tbody>
        ${party.map((p, i) => `<tr><td>${dsEsc(partyMemberName(p, i))}${p.player && p.name ? `<span class="ds-steps">${dsEsc(p.player)}</span>` : ''}</td>
            <td>${dsEsc(p.cls)} ${p.level}</td><td>${n(p.ac)}</td><td>${partyHpCell(p)}</td><td>${n(p.pp)}</td></tr>`).join('')}
        </tbody></table>
        <p class="ds-links"><a href="toolbox?tab=party">👥 Edit the party</a></p>`;
}

function entryBody(c, ctx) {
    const e = nbFind(ctx.nb(), c.entry);
    if (!e) return c.entry ? '<p class="ds-faint">This entry is gone from the notebook. Choose another.</p>' + pickerHtml(c, ctx) : null;
    const k = NB_KINDS[e.kind];
    const field = (label, text) => (text ? `<p class="ds-field"><b>${label}</b> ${dsEsc(text)}</p>` : '');
    const href = nbOpenHref(e);
    const parts = [
        `<p class="ds-kind">${k.icon} ${dsEsc(k.label)}${e.sub ? ` · ${dsEsc(e.sub)}` : ''}</p>`,
        e.kind === 'quest' ? field('Status', `${NB_QUEST_STATUS[e.status || 'open'].icon} ${NB_QUEST_STATUS[e.status || 'open'].label}`) + field('Giver', e.giver) + field('Reward', e.reward) : '',
        e.kind === 'session' ? field('Session', e.num ? `#${e.num}` : '') + field('Played', e.date) : '',
        e.kind === 'monster' && e.mon && typeof hbSummary === 'function' ? `<p class="ds-field">${dsEsc(hbSummary(e.mon))}</p>` : '',
        e.kind === 'session' && e.recap ? `<p class="ds-notes-h">Recap</p>${dsPre(e.recap)}` : '',
        e.kind === 'session' ? field('NPCs met', e.npcs) + field('Loot', e.loot) + field('Open threads', e.threads) : '',
        e.notes ? `<p class="ds-notes-h">👁️ Notes the players may see</p>${dsPre(e.notes)}` : '',
        e.dm ? `<p class="ds-notes-h">🔒 DM only</p>${dsPre(e.dm)}` : '',
        href ? `<p class="ds-links"><a href="${dsEsc(href)}">Open it ↗</a></p>` : ''
    ];
    return parts.join('');
}

function monsterBody(c) {
    const m = Object.hasOwn(MONSTER_BY_ID, c.m) ? MONSTER_BY_ID[c.m] : null;
    if (!m) return c.m ? '<p class="ds-faint">That monster is gone (a homebrew monster removed from the notebook?). Choose another.</p>' + pickerHtml(c) : null;
    const failed = !m.block && dsUi.blocksFailed;
    const links = [
        `<a href="toolbox?${paramsQuery({ tab: 'init', add: `${m.id}.1` })}">⚔️ Add to Initiative</a>`,
        m.hb ? `<a href="monster-maker?nb=${dsEsc(m.id.slice(HB_PREFIX.length))}">🐲 Open in the Monster Maker</a>` : `<a href="bestiary?m=${dsEsc(m.id)}">🐉 Open in the Bestiary</a>`
    ];
    return `${failed ? '<p class="ds-faint">⚠️ The stat blocks didn\'t load (offline?). <button type="button" class="ds-btn ds-mini" data-act="blocks-retry">Try again</button></p>' : `<div class="sb-box">${monsterBlockHtml(m)}</div>`}
        <p class="ds-links">${links.join(' ')}</p>`;
}

function notesBody(c) {
    return `<label class="sr-only" for="ds-nt-${c.id}">Title</label>
        <input type="text" class="ds-note-title" id="ds-nt-${c.id}" data-field="title" maxlength="${DS_LIMITS.title}" value="${dsEsc(c.title)}" placeholder="Title" autocomplete="off">
        <label class="sr-only" for="ds-nx-${c.id}">Notes</label>
        <textarea class="ds-note-text" id="ds-nx-${c.id}" data-field="text" rows="6" maxlength="${DS_LIMITS.text}" placeholder="Names to remember, a reminder, boxed text to read aloud…">${dsEsc(c.text)}</textarea>
        <div class="ds-print-only">${dsPre(c.text)}</div>`;
}

function bodyHtml(c, ctx) {
    let body;
    if (c.type === 'rules') body = rulesBody(c);
    else if (c.type === 'clock') body = clockBody(c, ctx);
    else if (c.type === 'table') body = tableBody(c, ctx);
    else if (c.type === 'dice') body = diceBody(c);
    else if (c.type === 'init') body = initBody(ctx);
    else if (c.type === 'party') body = partyBody(ctx);
    else if (c.type === 'entry') body = entryBody(c, ctx);
    else if (c.type === 'monster') body = monsterBody(c);
    else body = notesBody(c);
    // null: nothing chosen yet, so the picker is the body.
    if (body === null) return `<div class="ds-pick">${pickerHtml(c, ctx)}</div>`;
    const pick = dsUi.pick.has(c.id) ? `<div class="ds-pick ds-pick-open">${pickerHtml(c, ctx)}</div>` : '';
    return pick + body;
}

function cardHtml(c, i, n, ctx) {
    const t = DS_TYPES[c.type];
    const title = dsCardTitle(c, ctx);
    const open = dsUi.menu === c.id;
    const icon = c.type === 'entry' ? (NB_KINDS[(nbFind(ctx.nb(), c.entry) || {}).kind] || t).icon : t.icon;
    const seg = (act, values, cur) => Object.entries(values).map(([v, label]) =>
        `<button type="button" class="ds-seg" data-act="${act}" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    const msg = dsUi.msgs[c.id];
    return `<section class="ds-card ds-w${c.w} ds-h-${c.h}${c.show ? ' ds-shown' : ''}" data-card="${c.id}" data-type="${c.type}" aria-labelledby="ds-t-${c.id}">
        <header class="ds-head">
            <span class="ds-grip" role="button" tabindex="0" title="Drag to move (or focus and use the arrow keys)" aria-label="Move ${dsEsc(title)} with the arrow keys">⠿</span>
            <h2 class="ds-title" id="ds-t-${c.id}"><span aria-hidden="true">${icon}</span> <span class="ds-title-text">${dsEsc(title)}</span></h2>
            ${t.show ? `<button type="button" class="ds-tool ds-show" data-act="show" aria-pressed="${c.show}" title="${c.show ? 'The players see this card. Click to take it off the player view.' : 'Show this card in the player view'}">📺<span class="sr-only"> Show players</span></button>` : ''}
            <button type="button" class="ds-tool" data-act="menu" aria-expanded="${open}" aria-controls="ds-menu-${c.id}" title="Move, resize, change, or remove">⋯<span class="sr-only"> Card options</span></button>
        </header>
        <div class="ds-menu" id="ds-menu-${c.id}"${open ? '' : ' hidden'}>
            <div class="ds-menu-row"><span>Move</span>
                <button type="button" class="ds-seg" data-act="up"${i ? '' : ' disabled'}>▲ Earlier</button>
                <button type="button" class="ds-seg" data-act="down"${i < n - 1 ? '' : ' disabled'}>▼ Later</button></div>
            <div class="ds-menu-row" role="group" aria-label="Width"><span>Width</span>${seg('w', DS_WIDTHS, c.w)}</div>
            <div class="ds-menu-row" role="group" aria-label="Height"><span>Height</span>${seg('h', DS_HEIGHTS, c.h)}</div>
            <div class="ds-menu-row">
                ${t.pick ? `<button type="button" class="ds-seg" data-act="pick" aria-pressed="${dsUi.pick.has(c.id)}">🔁 Change ${t.label.toLowerCase()}</button>` : ''}
                <button type="button" class="ds-seg ds-x" data-act="remove">✕ Remove</button>
            </div>
        </div>
        ${msg ? `<p class="ds-msg" role="status">${dsEsc(msg)}</p>` : ''}
        <div class="ds-body">${bodyHtml(c, ctx)}</div>
    </section>`;
}

// ── Drawing ───────────────────────────────────────────────
function renderBar() {
    const sel = document.getElementById('ds-layout');
    sel.innerHTML = ds.layouts.map((l, i) => `<option value="${l.id}"${l.id === ds.cur ? ' selected' : ''}>${dsEsc(l.name || `Layout ${i + 1}`)}</option>`).join('');
    const name = document.getElementById('ds-name');
    if (document.activeElement !== name) name.value = dsLayout().name;
    document.getElementById('ds-del').disabled = ds.layouts.length < 2;
    document.getElementById('ds-new').disabled = document.getElementById('ds-copy').disabled = ds.layouts.length >= DS_LIMITS.layouts;
    const L = dsLayout();
    document.getElementById('ds-print-head').textContent = `The Beholder's Gazette · DM Screen${L.name ? ` · ${L.name}` : ''}`;
    const shown = L.cards.filter(c => c.show).length;
    document.getElementById('ds-count').textContent = `${L.cards.length} of ${DS_LIMITS.cards} cards${shown ? ` · ${shown} in the player view` : ''}`;
    document.querySelectorAll('[data-add]').forEach(b => { b.disabled = L.cards.length >= DS_LIMITS.cards; });
}

function renderBoard() {
    const L = dsLayout();
    const ctx = dsContext();
    document.getElementById('ds-board').innerHTML = L.cards.map((c, i) => cardHtml(c, i, L.cards.length, ctx)).join('');
    document.getElementById('ds-empty').hidden = L.cards.length > 0;
    renderBar();
    needBlocks();
}

function renderCard(id) {
    const el = document.querySelector(`.ds-card[data-card="${id}"]`);
    const L = dsLayout();
    const i = L.cards.findIndex(c => c.id === id);
    if (!el || i < 0) return;
    el.outerHTML = cardHtml(L.cards[i], i, L.cards.length, dsContext());
}

// Redraw the cards of some types (another tab changed their tool), sparing a note being typed.
function renderTypes(...types) {
    dsLayout().cards.filter(c => types.includes(c.type)).forEach(c => {
        const el = document.querySelector(`.ds-card[data-card="${c.id}"]`);
        if (el && el.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
        renderCard(c.id);
    });
}

// Redraw the whole board, putting the box being typed in back as it was (its text, cursor, and scroll).
function renderBoardKeepingFocus() {
    const el = document.activeElement;
    const cardEl = el && el.closest('.ds-card');
    const sel = cardEl && el.matches('input, textarea') && (el.dataset.field ? `[data-field="${el.dataset.field}"]` : el.name ? `[name="${el.name}"]` : '');
    if (!sel) { renderBoard(); return; }
    const keep = { value: el.value, start: el.selectionStart, end: el.selectionEnd, scroll: el.scrollTop };
    renderBoard();
    const again = document.querySelector(`.ds-card[data-card="${cardEl.dataset.card}"] ${sel}`);
    if (!again) return;
    again.focus({ preventScroll: true });
    // The other tab saved before this one's last keystroke: keep the keystroke.
    if (again.value !== keep.value) {
        again.value = keep.value;
        again.dispatchEvent(new Event('input', { bubbles: true }));
    }
    try { again.setSelectionRange(keep.start, keep.end); } catch (e) {}
    again.scrollTop = keep.scroll;
}

// Stat blocks and spell text load the first time a stat block card is on the board.
function needBlocks() {
    if (blocksReady() || !dsLayout().cards.some(c => c.type === 'monster' && c.m && !(MONSTER_BY_ID[c.m] || {}).block)) return;
    loadMonsterBlocks().then(() => { dsUi.blocksFailed = false; renderTypes('monster'); })
        .catch(() => { dsUi.blocksFailed = true; renderTypes('monster'); });
}

// Put focus back on a control after its card was redrawn.
function refocus(id, selector) {
    const el = document.querySelector(`.ds-card[data-card="${id}"] ${selector}`);
    if (el && !el.disabled) el.focus();
}

// ── Changing the board ────────────────────────────────────
function addCard(type) {
    const L = dsLayout();
    if (L.cards.length >= DS_LIMITS.cards) { flash(`⚠️ ${DS_LIMITS.cards} cards at most on one screen. Remove some, or start another layout.`); return; }
    const ctx = dsContext();
    const raw = { type };
    // Start with something to show where we can: the first rules card or clock not on the board yet.
    const unused = (list, key) => (list.find(x => !L.cards.some(c => c.type === type && c[key] === x.id)) || list[0] || {}).id;
    if (type === 'rules') raw.rule = unused(RULES_CARDS, 'rule');
    if (type === 'clock') raw.clock = unused(ctx.clocks(), 'clock');
    if (type === 'table') raw.table = unused(ctx.tables(), 'table');
    if (type === 'dice') raw.f = '1d20';
    if (type === 'monster' || type === 'rules') raw.w = 2;
    const card = dsCleanCard(raw);
    L.cards.push(card);
    dsStore();
    renderBoard();
    const el = document.querySelector(`.ds-card[data-card="${card.id}"]`);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const first = el.querySelector('.ds-pick select, .ds-pick input, .ds-note-title') || el.querySelector('.ds-grip');
    first.focus({ preventScroll: true });
    flash(`➕ Added a ${DS_TYPES[type].label.toLowerCase()} card.`);
}

function moveCard(id, by, focusSel) {
    const cards = dsLayout().cards;
    const i = cards.findIndex(c => c.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= cards.length) return;
    [cards[i], cards[j]] = [cards[j], cards[i]];
    dsStore();
    renderBoard();
    refocus(id, focusSel);
}

function removeCard(id) {
    const L = dsLayout();
    const c = dsCard(id);
    L.cards = L.cards.filter(x => x.id !== id);
    if (dsUi.menu === id) dsUi.menu = null;
    dsUi.pick.delete(id);
    dsStore();
    renderBoard();
    flash(`🗑️ Removed the ${DS_TYPES[c.type].label.toLowerCase()} card.`);
}

function setClock(id, fn) {
    const c = dsCard(id);
    const list = dsClocks();
    const k = list.find(x => x.id === c.clock);
    if (!k) return;
    k.filled = Math.min(k.size, Math.max(0, fn(k)));
    if (!dsSaveClocks(list)) { flash("⚠️ This browser wouldn't save the clock."); return; }
    // The same clock may sit on more than one card.
    renderTypes('clock');
    if (k.filled >= k.size) flash(`⏰ ${k.name || 'A clock'} is complete.`);
}

function rollTableCard(c) {
    const t = dsTables().find(x => x.id === c.table);
    if (!t) return;
    try {
        const r = rollTable(dsTables(), t);
        const steps = tableStepsText(r.steps) + (r.warnings.length ? ` · ⚠️ ${r.warnings.join(' ')}` : '');
        c.rolls = [{ t: r.text.slice(0, DS_LIMITS.result), s: steps.slice(0, DS_LIMITS.steps) }, ...c.rolls].slice(0, DS_LIMITS.tableRolls);
        dsStore();
        renderCard(c.id);
        refocus(c.id, '[data-act="table-roll"]');
    } catch (e) {
        cardMsg(c.id, `⚠️ ${e.message}`);
    }
}

function rollDiceCard(c, formula, mode) {
    let r;
    try {
        r = rollAndRecord(formula, mode, 'DM screen');
    } catch (e) {
        cardMsg(c.id, `⚠️ ${e.message}`);
        refocus(c.id, 'input[name="f"]');
        return;
    }
    c.f = r.formula.slice(0, DS_LIMITS.formula);
    c.rolls = [{ f: r.formula + (r.mode !== 'normal' ? ` (${diceModeLabel(r.mode)})` : ''), total: r.total, d: diceDetail(r).slice(0, DS_LIMITS.detail), crit: r.crit }, ...c.rolls].slice(0, DS_LIMITS.diceRolls);
    delete dsUi.msgs[c.id];
    dsStore();
    if (r.note) cardMsg(c.id, r.note); else renderCard(c.id);
}

function onBoardClick(e) {
    const cardEl = e.target.closest('.ds-card');
    if (!cardEl) return;
    const id = cardEl.dataset.card;
    const c = dsCard(id);
    if (!c) return;
    const seg = e.target.closest('.clk-seg');
    if (seg && c.type === 'clock') {
        const s = Number(seg.dataset.seg);
        setClock(id, k => (s === k.filled - 1 ? s : s + 1));
        return;
    }
    const spell = e.target.closest('.sb-spell');
    if (spell) { sbSpellClick(spell, cardEl); return; }
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'menu') {
        dsUi.menu = dsUi.menu === id ? null : id;
        renderCard(id);
        refocus(id, '[data-act="menu"]');
    } else if (act === 'show') {
        c.show = !c.show;
        dsStore();
        renderCard(id);
        renderBar();
        refocus(id, '[data-act="show"]');
        flash(c.show ? '📺 The players see this card now.' : '🙈 Taken off the player view.');
    } else if (act === 'up' || act === 'down') moveCard(id, act === 'up' ? -1 : 1, `[data-act="${act}"]`);
    else if (act === 'w' || act === 'h') {
        c[act] = act === 'w' ? Number(btn.dataset.v) : btn.dataset.v;
        dsStore();
        renderCard(id);
        refocus(id, `[data-act="${act}"][data-v="${btn.dataset.v}"]`);
    } else if (act === 'pick') {
        if (dsUi.pick.has(id)) dsUi.pick.delete(id); else dsUi.pick.add(id);
        renderCard(id);
        refocus(id, dsUi.pick.has(id) ? '.ds-pick select, .ds-pick input' : '[data-act="pick"]');
    } else if (act === 'remove') armedClick(btn, '✕ Remove', () => removeCard(id));
    else if (act === 'clk-inc' || act === 'clk-dec') {
        setClock(id, k => k.filled + (act === 'clk-inc' ? 1 : -1));
        refocus(id, `[data-act="${act}"]`);
    } else if (act === 'table-roll') rollTableCard(c);
    else if (act === 'table-clear' || act === 'dice-clear') {
        c.rolls = [];
        dsStore();
        renderCard(id);
        refocus(id, act === 'table-clear' ? '[data-act="table-roll"]' : 'input[name="f"]');
    } else if (act === 'die') {
        rollDiceCard(c, btn.dataset.v, 'normal');
        refocus(id, `[data-act="die"][data-v="${btn.dataset.v}"]`);
    } else if (act === 'blocks-retry') {
        dsUi.blocksFailed = false;
        renderTypes('monster');
        needBlocks();
    }
}

function onBoardSubmit(e) {
    const form = e.target.closest('form[data-form]');
    const cardEl = form && form.closest('.ds-card');
    if (!cardEl) return;
    e.preventDefault();
    const id = cardEl.dataset.card;
    const c = dsCard(id);
    const kind = form.dataset.form;
    if (kind === 'dice') {
        const mode = e.submitter && e.submitter.value ? e.submitter.value : 'normal';
        rollDiceCard(c, form.elements.f.value, mode);
        refocus(id, e.submitter ? `button[value="${mode}"]` : 'input[name="f"]');
    } else if (kind === 'clock-new') {
        const list = dsClocks();
        if (list.length >= CLOCKS_MAX) { cardMsg(id, `⚠️ ${CLOCKS_MAX} clocks at most. Remove some in the Toolbox first.`); return; }
        const k = cleanClock({ name: form.elements.name.value.trim(), size: form.elements.size.value, filled: 0 });
        list.push(k);
        if (!dsSaveClocks(list)) { flash("⚠️ This browser wouldn't save the clock."); return; }
        c.clock = k.id;
        dsUi.pick.delete(id);
        dsStore();
        renderCard(id);
        refocus(id, '.clk-seg');
        flash(`⏳ Started ${k.name || 'a clock'} (it's in the Toolbox's Clocks tab too).`);
    } else if (kind === 'monster') {
        const m = findMonster(form.elements.m.value);
        if (!m) { cardMsg(id, '⚠️ No monster by that name. Pick one from the list as you type.'); refocus(id, 'input[name="m"]'); return; }
        c.m = m.id;
        dsUi.pick.delete(id);
        dsStore();
        renderCard(id);
        needBlocks();
        refocus(id, '.ds-grip');
    }
}

function onBoardChange(e) {
    const sel = e.target.closest('select[data-pick]');
    if (!sel) return;
    const id = sel.closest('.ds-card').dataset.card;
    const c = dsCard(id);
    if (!sel.value) return;
    c[sel.dataset.pick] = sel.value;
    if (c.type === 'table') c.rolls = [];
    dsUi.pick.delete(id);
    dsStore();
    renderCard(id);
    refocus(id, '.ds-grip');
}

// Notes save as you type (no redraw, so the field keeps focus).
function onBoardInput(e) {
    const field = e.target.dataset.field;
    if (!field) return;
    const cardEl = e.target.closest('.ds-card');
    const c = dsCard(cardEl.dataset.card);
    if (!c || c.type !== 'notes') return;
    if (field === 'title') {
        c.title = dsLine(e.target.value, DS_LIMITS.title);
        cardEl.querySelector('.ds-title-text').textContent = c.title || 'Notes';
    } else {
        c.text = dsText(e.target.value, DS_LIMITS.text);
        cardEl.querySelector('.ds-print-only').innerHTML = dsPre(c.text);
    }
    dsStore();
}

function onBoardKey(e) {
    if (!e.target.classList.contains('ds-grip')) return;
    const by = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!by) return;
    e.preventDefault();
    moveCard(e.target.closest('.ds-card').dataset.card, by, '.ds-grip');
}

// ── Dragging by the ⠿ grip (pointer events, so a mouse, a pen, and a finger all work) ──
// The card moves through the board as the pointer passes other cards; letting go saves the order,
// and a cancelled drag (Esc, a lost pointer) puts everything back.
function dragSlot(board, dragging, x, y) {
    const over = document.elementFromPoint(x, y)?.closest('.ds-card');
    if (!over || over === dragging || over.parentNode !== board) return;
    // Past the middle of the card under the pointer (across in a row, down in a column): after it.
    const r = over.getBoundingClientRect();
    const column = getComputedStyle(board).gridTemplateColumns.split(' ').length === 1 || r.width > board.clientWidth * 0.9;
    const after = column ? y > r.top + r.height / 2 : x > r.left + r.width / 2;
    if (after ? over.nextElementSibling === dragging : over.previousElementSibling === dragging) return;
    board.insertBefore(dragging, after ? over.nextSibling : over);
}

function setupDrag(board) {
    let drag = null;
    const end = save => {
        if (!drag) return;
        const { id, moved, scroll } = drag;
        clearInterval(scroll);
        drag = null;
        document.body.classList.remove('ds-dragging-now');
        if (!moved) return;
        if (save) {
            const order = [...board.querySelectorAll('.ds-card')].map(el => el.dataset.card);
            dsLayout().cards.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
            dsStore();
        }
        renderBoard();
        refocus(id, '.ds-grip');
        flash(save ? '✋ Moved.' : 'Left where it was.');
    };
    board.addEventListener('pointerdown', e => {
        const grip = e.target.closest('.ds-grip');
        if (!grip || e.button !== 0) return;
        e.preventDefault();
        grip.focus({ preventScroll: true });
        try { grip.setPointerCapture(e.pointerId); } catch (err) {}
        drag = { id: grip.closest('.ds-card').dataset.card, el: grip.closest('.ds-card'), pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false, scroll: null, dy: 0 };
    });
    board.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.pointer) return;
        if (!drag.moved) {
            if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
            drag.moved = true;
            drag.el.classList.add('ds-dragging');
            document.body.classList.add('ds-dragging-now');
            // Near the top or bottom of the window, the page scrolls so a card can travel the whole board.
            drag.scroll = setInterval(() => {
                if (!drag || !drag.dy) return;
                window.scrollBy(0, drag.dy);
                dragSlot(board, drag.el, drag.x, drag.y);
            }, 30);
        }
        drag.x = e.clientX;
        drag.y = e.clientY;
        const edge = 60;
        drag.dy = e.clientY < edge ? -14 : e.clientY > innerHeight - edge ? 14 : 0;
        dragSlot(board, drag.el, e.clientX, e.clientY);
    });
    board.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.pointer) end(true); });
    board.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.pointer) end(false); });
    document.addEventListener('keydown', e => { if (drag && drag.moved && e.key === 'Escape') end(false); });
}

// ── Layouts ───────────────────────────────────────────────
function setupLayouts() {
    document.getElementById('ds-layout').addEventListener('change', e => {
        ds.cur = e.target.value;
        dsUi.menu = null;
        dsUi.pick.clear();
        dsStore();
        renderBoard();
        flash(`🛡️ Showing ${dsLayout().name || 'that layout'}.`);
    });
    document.getElementById('ds-name').addEventListener('input', e => {
        dsLayout().name = dsLine(e.target.value, DS_LIMITS.name);
        dsStore();
        renderBar();
    });
    const make = (layout, text) => {
        if (ds.layouts.length >= DS_LIMITS.layouts) { flash(`⚠️ ${DS_LIMITS.layouts} layouts at most. Delete one first.`); return; }
        ds.layouts.push(layout);
        ds.cur = layout.id;
        dsUi.menu = null;
        dsUi.pick.clear();
        dsStore();
        renderBoard();
        document.getElementById('ds-name').select();
        flash(text);
    };
    document.getElementById('ds-new').addEventListener('click', () => {
        make({ id: dsNewId(), name: `Layout ${ds.layouts.length + 1}`, cards: [] }, '➕ A new, empty layout. Name it, then add cards.');
    });
    document.getElementById('ds-copy').addEventListener('click', () => {
        const L = dsLayout();
        const ids = new Set();
        const cards = L.cards.map(c => {
            let id;
            do id = dsNewId(); while (ids.has(id));
            ids.add(id);
            return { ...JSON.parse(JSON.stringify(c)), id };
        });
        make({ id: dsNewId(), name: `${L.name || 'Layout'} (copy)`.slice(0, DS_LIMITS.name), cards }, `⧉ Copied ${L.name || 'the layout'}.`);
    });
    const del = document.getElementById('ds-del');
    del.addEventListener('click', () => {
        if (ds.layouts.length < 2) return;
        armedClick(del, '🗑️ Delete', () => {
            const L = dsLayout();
            ds.layouts = ds.layouts.filter(l => l.id !== L.id);
            ds.cur = ds.layouts[0].id;
            dsUi.menu = null;
            dsUi.pick.clear();
            dsStore();
            renderBoard();
            flash(`🗑️ Deleted ${L.name || 'the layout'}.`);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('ds-add').innerHTML = Object.entries(DS_TYPES).map(([type, t]) =>
        `<button type="button" class="ds-add-btn" data-add="${type}"><span aria-hidden="true">${t.icon}</span> ${t.label}</button>`).join('');
    document.getElementById('ds-add').addEventListener('click', e => {
        const b = e.target.closest('[data-add]');
        if (b) addCard(b.dataset.add);
    });
    renderMonsterList();
    renderBoard();
    setupLayouts();

    const board = document.getElementById('ds-board');
    board.addEventListener('click', onBoardClick);
    board.addEventListener('submit', onBoardSubmit);
    board.addEventListener('change', onBoardChange);
    board.addEventListener('input', onBoardInput);
    board.addEventListener('keydown', onBoardKey);
    setupDrag(board);

    document.getElementById('ds-print').addEventListener('click', () => {
        if (!dsLayout().cards.length) { flash('Add some cards first.'); return; }
        // Stat blocks print only once they're loaded.
        if (dsLayout().cards.some(c => c.type === 'monster' && c.m) && !blocksReady()) {
            flash('⏳ Loading the stat blocks first…');
            loadMonsterBlocks().then(() => { renderTypes('monster'); window.print(); }).catch(() => window.print());
            return;
        }
        window.print();
    });

    // Another tab changed a tool these cards read (or this screen itself).
    window.addEventListener('storage', e => {
        if (e.key === DS_KEY || e.key === null) {
            ds = dsLoad();
            renderBoardKeepingFocus();
            return;
        }
        if (e.key === CLOCKS_KEY) renderTypes('clock');
        else if (e.key === ruleKey('gazette-tables')) renderTypes('table');
        else if (e.key === PARTY_KEY) renderTypes('party');
        else if (e.key === INIT_VIEW_KEY) renderTypes('init');
    });
    // The notebook (entries and homebrew monsters) has its own listener; homebrew.js's runs first.
    nbOnChange(() => {
        renderMonsterList();
        renderTypes('entry', 'monster');
    });
});
