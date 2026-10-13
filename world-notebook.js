/* ============================================
   WORLDBUILDER: NOTEBOOK TAB (F38)
   The campaign notebook from notebook.js: every saved roll (Worldbuilder tabs and the
   NPC page), newest first, each with its link back, notes, and links to other entries.
   Export downloads the whole world as JSON; Import folds a notebook file into this one.
   Session log and quest tracker (F50): 📖 Log a Session and ❗ Add a Quest write entries
   by hand (the Toolbox's Quest tab saves rolled quests here too), each with its own fields
   under 📝; quests have a status you set on the card and filter by. 📣 Last Time On… shows
   the latest session's recap, its open threads, and the open quests, to read aloud or print.
   Secret notes (F51): every entry has notes the players may see and 🔒 DM-only notes.
   🖨️ Print for Players prints the entries you tick as parchment sheets (handouts.css), each
   roll rebuilt from its link by notebook-sheets.js with its secrets left out; switch any
   line either way, and the entry remembers it (flip).
   Map pins (F53): a continent's card counts its pins; search and Copy All read them too.
   Nothing here rolls, and the URL holds only the tab: the notebook lives in this browser.
   URL: ?tab=notebook
   ============================================ */

const nbView = { open: new Set(), removing: null, clearing: false, last: false, players: false, pick: [], plOpen: {}, ink: false };
const nbFieldTimers = {};

function nbKindOpt(kind) {
    return NB_KINDS[kind] || { icon: '📄', label: kind };
}

function nbMatches(e, kind, status, q) {
    if (kind !== 'all' && e.kind !== kind) return false;
    if (status !== 'all' && (e.kind !== 'quest' || e.status !== status)) return false;
    if (!q) return true;
    return [e.title, e.sub, e.notes, e.dm, e.giver, e.reward, e.recap, e.npcs, e.loot, e.threads, ...(e.pins || []).flatMap(p => [p.name, p.note])]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
}

// A play date (YYYY-MM-DD) as this browser writes dates.
function nbDateText(d) {
    return d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
}

function nbShort(text, max = 180) {
    const t = text.replace(/\s+/g, ' ');
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

// Lines of a list field, without any bullets typed in front.
function nbLines(text) {
    return (text || '').split('\n').map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
}

function nbChipsHTML(nb, e) {
    if (!e.links.length) return '';
    return `<p class="nb-chips">🔗 ${e.links.map(l => {
        const o = nbFind(nb, l);
        return o ? `<span class="nb-chip"><button type="button" class="nb-jump" data-to="${esc(o.id)}">${nbKindOpt(o.kind).icon} ${esc(o.title)}</button><button type="button" class="nb-unlink" data-id="${esc(e.id)}" data-to="${esc(o.id)}" aria-label="Unlink ${esc(o.title)}" title="Unlink">✕</button></span>` : '';
    }).join('')}</p>`;
}

function nbStatusSelectHTML(e) {
    return `<select class="nb-qs nb-qs-${esc(e.status)}" data-id="${esc(e.id)}" aria-label="Status of ${esc(e.title)}">${Object.entries(NB_QUEST_STATUS).map(([key, s]) =>
        `<option value="${key}"${key === e.status ? ' selected' : ''}>${s.icon} ${s.label}</option>`).join('')}</select>`;
}

// The card's top: icon, title, tag, the lines under it, and its links.
function nbTopHTML(nb, e) {
    const k = nbKindOpt(e.kind);
    const open = nbOpenHref(e);
    const title = open ? `<a class="nb-title" href="${esc(open)}">${esc(e.title)}</a>` : `<span class="nb-title">${esc(e.title)}</span>`;
    let lines = e.sub ? `<p class="nb-sub">${esc(e.sub)}</p>` : '';
    if (e.kind === 'session') {
        lines = `<p class="nb-sub">${e.date ? `📅 ${esc(nbDateText(e.date))} · ` : ''}${e.recap ? esc(nbShort(e.recap)) : '<i>No recap yet.</i>'}</p>`;
        const threads = nbLines(e.threads).length;
        if (threads) lines += `<p class="nb-meta">🧵 ${threads} open ${threads === 1 ? 'thread' : 'threads'}</p>`;
    } else if (e.kind === 'quest') {
        const meta = [e.giver && `🗣️ ${esc(e.giver)}`, e.reward && `💰 ${esc(e.reward)}`].filter(Boolean);
        if (meta.length) lines += `<p class="nb-meta">${meta.join(' · ')}</p>`;
    }
    if (e.pins && e.pins.length) lines += `<p class="nb-meta">📍 ${e.pins.length} ${e.pins.length === 1 ? 'pin' : 'pins'} on the map</p>`;
    return `<div class="nb-top">
            <span class="nb-icon" aria-hidden="true">${k.icon}</span>
            <div class="nb-main">
                ${title}<span class="wb-tag">${esc(k.label)}</span>${e.kind === 'quest' ? nbStatusSelectHTML(e) : ''}
                ${lines}
                ${nbChipsHTML(nb, e)}
            </div>
        </div>`;
}

function nbInput(e, f, label, value, attrs = '') {
    return `<label>${label} <input type="text" class="nb-f" data-id="${esc(e.id)}" data-f="${f}" value="${esc(value)}"${attrs}></label>`;
}

function nbArea(e, f, label, value, max, rows, placeholder) {
    return `<label class="nb-wide">${label} <textarea class="nb-f" data-id="${esc(e.id)}" data-f="${f}" rows="${rows}" maxlength="${max}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
}

// A session's or quest's own fields, saved as you type.
function nbFormHTML(e) {
    if (e.kind === 'session') {
        return `<div class="nb-form">
            ${nbInput(e, 'title', 'Title', e.title, ` maxlength="${NB_LIMITS.title}"`)}
            <label>Session <input type="number" class="nb-f" data-id="${esc(e.id)}" data-f="num" min="1" max="9999" step="1" value="${e.num || ''}"></label>
            <label>Played on <input type="date" class="nb-f" data-id="${esc(e.id)}" data-f="date" value="${esc(e.date)}"></label>
            ${nbArea(e, 'recap', 'What happened', e.recap, NB_LIMITS.notes, 5, 'The recap you\'ll read aloud next time: where the party went, what they did, how it ended…')}
            ${nbArea(e, 'npcs', 'NPCs met', e.npcs, 1000, 2, 'Who the party met, and what they made of them')}
            ${nbArea(e, 'loot', 'Loot handed out', e.loot, 1000, 2, 'Coins, items, favors owed')}
            ${nbArea(e, 'threads', 'Open threads (one per line)', e.threads, 2000, 3, 'The locked door in the cellar\nWho sent the assassin?')}
        </div>`;
    }
    if (e.kind === 'quest') {
        return `<div class="nb-form">
            ${nbInput(e, 'title', 'Quest', e.title, ` maxlength="${NB_LIMITS.title}"`)}
            ${nbInput(e, 'giver', 'Giver', e.giver, ' maxlength="200" placeholder="Who asked"')}
            ${nbInput(e, 'reward', 'Reward', e.reward, ' maxlength="400" placeholder="What they promised"')}
            ${nbArea(e, 'sub', 'The job', e.sub, NB_LIMITS.sub, 2, 'What the party agreed to do')}
        </div>`;
    }
    return '';
}

function nbEntryHTML(nb, e) {
    const others = nb.entries.filter(o => o.id !== e.id && !e.links.includes(o.id));
    const removing = nbView.removing === e.id;
    const form = nbFormHTML(e);
    const hand = !!form;
    const filled = e.notes || e.dm || (e.kind === 'session' && e.recap);
    return `<article class="nb-entry nb-k-${esc(e.kind)}${e.kind === 'quest' ? ' nb-st-' + esc(e.status) : ''}" id="nb-e-${esc(e.id)}">
        ${nbTopHTML(nb, e)}
        <details class="nb-more" data-id="${esc(e.id)}"${nbView.open.has(e.id) ? ' open' : ''}>
            <summary>📝 ${e.kind === 'session' ? 'Log' : e.kind === 'quest' ? 'Quest' : 'Notes'}${filled ? ' ✓' : ''}${hand ? ', notes,' : ''} and links</summary>
            ${form}
            <p class="nb-notes-h">👁️ Notes the players may see</p>
            <textarea class="nb-notes" data-id="${esc(e.id)}" data-k="notes" rows="${hand ? 2 : 3}" maxlength="${NB_LIMITS.notes}" aria-label="Notes on ${esc(e.title)} the players may see"
                placeholder="${hand ? 'Anything else to remember…' : 'What happened here, who the party met, what you changed…'}">${esc(e.notes)}</textarea>
            <p class="nb-notes-h">🔒 DM only (never printed for players)</p>
            <textarea class="nb-notes nb-dm" data-id="${esc(e.id)}" data-k="dm" rows="2" maxlength="${NB_LIMITS.notes}" aria-label="DM-only notes on ${esc(e.title)}"
                placeholder="Secrets, plans, what they don't know yet…">${esc(e.dm || '')}</textarea>
            <div class="nb-row">
                ${others.length ? `<label class="nb-linkto">🔗 Link to <select class="nb-addlink" data-id="${esc(e.id)}">
                    <option value="">Choose an entry…</option>
                    ${others.map(o => `<option value="${esc(o.id)}">${nbKindOpt(o.kind).icon} ${esc(o.title)}</option>`).join('')}
                </select></label>` : ''}
                <span class="nb-row-actions">
                    ${nbOpenHref(e) ? `<a class="btn" href="${esc(nbOpenHref(e))}">${e.kind === 'monster' ? '🐲 Edit in the Monster Maker' : 'Open →'}</a>` : ''}
                    <button type="button" class="btn nb-remove" data-id="${esc(e.id)}">${removing ? '⚠️ Click again to remove' : '🗑️ Remove'}</button>
                </span>
            </div>
            <p class="wb-small">Saved ${esc(new Date(e.added).toLocaleDateString())}</p>
        </details>
    </article>`;
}

// ── Last time on… ─────────────────────────────────────────
function nbOpenQuests(nb) {
    return nb.entries.filter(e => e.kind === 'quest' && e.status === 'open').sort((a, b) => a.added.localeCompare(b.added));
}

function nbLastHTML(nb) {
    const s = nbLastSession(nb);
    if (!s) return '';
    const threads = nbLines(s.threads), quests = nbOpenQuests(nb);
    return `<h3 class="nb-last-h">📣 Last time${nb.name ? ` on ${esc(nb.name)}` : ''}…</h3>
        <p class="nb-last-meta">${esc(s.title)}${s.date ? ` · ${esc(nbDateText(s.date))}` : ''}</p>
        <div class="nb-last-recap">${s.recap.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        ${s.npcs ? `<h4>Faces from last time</h4><p>${esc(s.npcs)}</p>` : ''}
        ${s.loot ? `<h4>What you carried away</h4><p>${esc(s.loot)}</p>` : ''}
        ${threads.length ? `<h4>Still unresolved</h4><ul>${threads.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${quests.length ? `<h4>Quests still open</h4><ul>${quests.map(q => `<li><b>${esc(q.title)}</b>${q.giver ? `, for ${esc(q.giver)}` : ''}</li>`).join('')}</ul>` : ''}`;
}

function nbLastText(nb) {
    const s = nbLastSession(nb);
    if (!s) return '';
    const out = [`Last time${nb.name ? ` on ${nb.name}` : ''}…`, s.title + (s.date ? ` · ${nbDateText(s.date)}` : ''), '', s.recap];
    if (s.npcs) out.push('', 'Faces from last time: ' + s.npcs);
    if (s.loot) out.push('', 'What you carried away: ' + s.loot);
    const threads = nbLines(s.threads), quests = nbOpenQuests(nb);
    if (threads.length) out.push('', 'Still unresolved:', ...threads.map(t => '- ' + t));
    if (quests.length) out.push('', 'Quests still open:', ...quests.map(q => '- ' + q.title + (q.giver ? `, for ${q.giver}` : '')));
    return out.join('\n');
}

function renderLast(nb) {
    const box = document.getElementById('nb-last');
    const html = nbView.last ? nbLastHTML(nb) : '';
    if (!html) nbView.last = false;
    box.hidden = !html;
    document.getElementById('nb-last-body').innerHTML = html;
    document.getElementById('nb-last-btn').setAttribute('aria-expanded', String(!!html));
}

function nbShowLast() {
    const nb = nbLoad();
    if (!nbLastSession(nb)) {
        flash('nb-status', nbSessions(nb).length
            ? '📖 No session has a recap yet. Open one under 📝 and fill in What happened.'
            : '📖 No sessions logged yet. Press 📖 Log a Session after your next game.');
        return;
    }
    nbView.last = !nbView.last;
    renderLast(nb);
    if (nbView.last) document.getElementById('nb-last').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Print for players (F51) ───────────────────────────────
// The ticked entries that still exist, in the order they were ticked.
function nbPicked(nb) {
    return nbView.pick.map(id => nbFind(nb, id)).filter(Boolean);
}

function nbPlayerLineHTML(e, line) {
    const on = nbShown(e, line);
    return `<button type="button" class="nb-pl-line${on ? '' : ' nb-pl-off'}" data-id="${esc(e.id)}" data-key="${esc(line.key)}" aria-pressed="${on}"
        title="${on ? 'The players see this. Click to keep it for the DM.' : 'DM only. Click to show the players.'}"><span aria-hidden="true">${on ? '👁️' : '🔒'}</span> <b>${esc(line.label)}</b> ${esc(nbShort(line.text, 90))}</button>`;
}

// One ticked entry's lines, part by part, each a switch.
function nbPlayerChooserHTML(e) {
    const { parts, broken } = nbSheet(e);
    const note = broken ? `<p class="wb-small">⚠️ This link no longer rolls here, so only the entry's own summary and notes print.</p>` : '';
    if (!parts.length) return note + '<p class="wb-small">Nothing to print yet: add notes the players may see.</p>';
    return note + parts.map((part, i) => {
        const k = `${e.id}|${part.head}`;
        const open = Object.hasOwn(nbView.plOpen, k) ? nbView.plOpen[k] : i === 0;
        const shown = part.lines.filter(l => nbShown(e, l)).length;
        return `<details class="nb-pl-part" data-k="${esc(k)}"${open ? ' open' : ''}>
            <summary>${esc(part.head || 'At a glance')} <span class="nb-pl-n">${shown} of ${part.lines.length} for the players</span></summary>
            <div class="nb-pl-lines">${part.lines.map(l => nbPlayerLineHTML(e, l)).join('')}</div>
        </details>`;
    }).join('');
}

function nbPlayerPickHTML(nb) {
    if (!nb.entries.length) return '<p class="wb-small">The notebook is empty. Save a roll or log a session first.</p>';
    const order = nb.entries.slice().sort((a, b) => b.added.localeCompare(a.added));
    return order.map(e => {
        const on = nbView.pick.includes(e.id);
        return `<div class="nb-pl-item${on ? ' nb-pl-on' : ''}">
            <label class="nb-pl-tick"><input type="checkbox" class="nb-pl-box" data-id="${esc(e.id)}"${on ? ' checked' : ''}>
                <span aria-hidden="true">${nbKindOpt(e.kind).icon}</span> ${esc(e.title)} <span class="wb-tag">${esc(nbKindOpt(e.kind).label)}</span></label>
            ${on ? `<div class="nb-pl-choose">${nbPlayerChooserHTML(e)}</div>` : ''}
        </div>`;
    }).join('');
}

function nbParas(text) {
    return text.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('');
}

// The parchment sheets the players get: only the lines they may see.
function nbPlayerSheetsHTML(nb) {
    return nbPicked(nb).map(e => {
        const parts = nbSheet(e).parts.map(part => ({ head: part.head, lines: part.lines.filter(l => nbShown(e, l)) })).filter(part => part.lines.length);
        return `<article class="ho-sheet ho-lore${nbView.ink ? ' ho-ink' : ''}">
            <div class="ho-lore-kind">${esc(nbKindOpt(e.kind).label)}</div>
            <h3 class="ho-lore-title">${esc(e.title)}</h3>
            <div class="ho-rule"></div>
            ${parts.map(part => `<section class="ho-lore-part">
                ${part.head ? `<h4>${esc(part.head)}</h4>` : ''}
                <dl>${part.lines.map(l => `<div><dt>${esc(l.label)}</dt><dd>${nbParas(l.text)}</dd></div>`).join('')}</dl>
            </section>`).join('') || '<p class="ho-faint">Nothing here for the players yet.</p>'}
        </article>`;
    }).join('');
}

function nbPlayerText(nb) {
    return nbPicked(nb).map(e => {
        const out = [`${nbKindOpt(e.kind).label}: ${e.title}`];
        nbSheet(e).parts.forEach(part => {
            const lines = part.lines.filter(l => nbShown(e, l));
            if (!lines.length) return;
            if (part.head) out.push('', part.head);
            lines.forEach(l => out.push(`${part.head ? '  ' : ''}${l.label}: ${l.text}`));
        });
        return out.join('\n');
    }).join('\n\n');
}

// Redraw the panel. focus: a selector to put keyboard focus back on.
function renderPlayers(nb, focus) {
    const box = document.getElementById('nb-pl');
    box.hidden = !nbView.players;
    document.getElementById('nb-pl-btn').setAttribute('aria-expanded', String(nbView.players));
    if (!nbView.players) return;
    nbView.pick = nbPicked(nb).map(e => e.id);
    const pick = document.getElementById('nb-pl-pick'), top = pick.scrollTop;
    pick.innerHTML = nbPlayerPickHTML(nb);
    pick.scrollTop = top;
    const n = nbView.pick.length;
    document.getElementById('nb-pl-count').textContent = n ? `${n} ${n === 1 ? 'entry' : 'entries'} ticked.` : 'Tick the entries to hand out.';
    document.getElementById('nb-pl-sheets').innerHTML = nbPlayerSheetsHTML(nb);
    ['nb-pl-print', 'nb-pl-copy'].forEach(id => { document.getElementById(id).disabled = !n; });
    if (focus) { const el = pick.querySelector(focus); if (el) el.focus(); }
}

function nbShowPlayers() {
    nbView.players = !nbView.players;
    renderPlayers(nbLoad());
    if (nbView.players) document.getElementById('nb-pl').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Switch one line between the players and the DM.
function nbFlipLine(id, key) {
    const nb = nbLoad();
    const e = nbFind(nb, id);
    if (!e) return;
    const flip = e.flip || [];
    const next = flip.includes(key) ? flip.filter(k => k !== key) : [...flip, key];
    if (next.length > NB_LIMITS.flips) { flash('nb-pl-status', '⚠️ That entry has too many switched lines.'); return; }
    if (next.length) e.flip = next;
    else delete e.flip;
    if (!nbStore(nb, true)) { flash('nb-pl-status', "⚠️ This browser won't keep a notebook (storage is off)."); return; }
    renderPlayers(nb, `.nb-pl-line[data-id="${CSS.escape(id)}"][data-key="${CSS.escape(key)}"]`);
}

function setupPlayers() {
    document.getElementById('nb-pl-btn').addEventListener('click', nbShowPlayers);
    document.getElementById('nb-pl-close').addEventListener('click', () => { nbView.players = false; renderPlayers(nbLoad()); });
    const pick = document.getElementById('nb-pl-pick');
    pick.addEventListener('change', e => {
        const box = e.target.closest('.nb-pl-box');
        if (!box) return;
        const id = box.dataset.id;
        nbView.pick = nbView.pick.filter(x => x !== id);
        if (box.checked) nbView.pick.push(id);
        renderPlayers(nbLoad(), `.nb-pl-box[data-id="${CSS.escape(id)}"]`);
    });
    pick.addEventListener('click', e => {
        const b = e.target.closest('.nb-pl-line');
        if (b) nbFlipLine(b.dataset.id, b.dataset.key);
    });
    pick.addEventListener('toggle', e => {
        const d = e.target;
        if (d.classList && d.classList.contains('nb-pl-part')) nbView.plOpen[d.dataset.k] = d.open;
    }, true);
    document.getElementById('nb-pl-ink').addEventListener('change', e => { nbView.ink = e.target.checked; renderPlayers(nbLoad()); });
    document.getElementById('nb-pl-copy').addEventListener('click', () => {
        const text = nbPlayerText(nbLoad());
        if (text) copyText(text, 'nb-pl-status', 'the player sheets');
    });
    document.getElementById('nb-pl-print').addEventListener('click', () => {
        if (!nbView.pick.length) return;
        document.body.classList.add('print-players');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-players'));
}

// ── Draw ──────────────────────────────────────────────────
function renderNotebook(nb = nbLoad()) {
    const name = document.getElementById('nb-name');
    if (document.activeElement !== name) name.value = nb.name;
    // A redraw keeps keyboard focus on the same control (a quest's status, a link picker).
    const active = document.activeElement;
    const refocus = active && active.closest('#nb-list') && active.dataset.id
        ? `.${active.classList[0]}[data-id="${active.dataset.id}"]${active.dataset.f ? `[data-f="${active.dataset.f}"]` : ''}` : null;
    const kind = document.getElementById('nb-kind').value;
    const status = document.getElementById('nb-qstatus').value;
    const q = document.getElementById('nb-search').value.trim().toLowerCase();
    const matches = nb.entries.filter(e => nbMatches(e, kind, status, q));
    const shown = kind === 'session' ? nbSessions({ entries: matches }) : matches.sort((a, b) => b.added.localeCompare(a.added));
    const links = nb.entries.reduce((n, e) => n + e.links.length, 0) / 2;
    const open = nbOpenQuests(nb).length;
    document.getElementById('nb-count').textContent = nb.entries.length
        ? `${nb.entries.length} ${nb.entries.length === 1 ? 'entry' : 'entries'} · ${links} ${links === 1 ? 'link' : 'links'}${open ? ` · ${open} open ${open === 1 ? 'quest' : 'quests'}` : ''}${shown.length < nb.entries.length ? ` · showing ${shown.length}` : ''}`
        : '';
    const list = document.getElementById('nb-list');
    if (!nb.entries.length) {
        list.innerHTML = `<div class="nb-empty">
            <p>📓 The notebook is empty.</p>
            <p class="wb-small">Roll something on any tab and press 📓 Save to Notebook (NPCs save from the <a href="npc-generator.html">Town Square</a>, quests from the <a href="toolbox.html?tab=quest">Toolbox</a>). Saved rolls land here, where you can add notes and link them together. After a game, press 📖 Log a Session to write down what happened. Or import a notebook file below.</p>
        </div>`;
    } else if (!shown.length) {
        list.innerHTML = '<p class="nb-empty wb-small">Nothing in the notebook matches.</p>';
    } else {
        list.innerHTML = shown.map(e => nbEntryHTML(nb, e)).join('');
    }
    if (refocus) { const el = list.querySelector(refocus); if (el) el.focus(); }
    document.getElementById('nb-clear').textContent = nbView.clearing ? '⚠️ Click again to clear everything' : '🗑️ Clear';
    ['nb-export', 'nb-copy', 'nb-clear'].forEach(id => { document.getElementById(id).disabled = !nb.entries.length; });
    renderLast(nb);
    renderPlayers(nb);
}

// Change the stored notebook and redraw.
function nbEdit(fn) {
    const nb = nbLoad();
    fn(nb);
    if (!nbStore(nb)) flash('nb-status', "⚠️ This browser won't keep a notebook (storage is off).");
}

// Show every entry again (the filters could hide the one we're going to).
function nbShowAll() {
    document.getElementById('nb-kind').value = 'all';
    document.getElementById('nb-qstatus').value = 'all';
    document.getElementById('nb-search').value = '';
    renderNotebook();
}

function nbJump(id) {
    let el = document.getElementById('nb-e-' + id);
    if (!el) {
        nbShowAll();
        el = document.getElementById('nb-e-' + id);
    }
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('nb-flash');
    void el.offsetWidth;
    el.classList.add('nb-flash');
}

// A new hand-written entry: open it and put the cursor in the field to fill first.
function nbAddByHand(item, focus, said) {
    const r = nbAdd(item);
    if (!r) { flash('nb-status', "⚠️ This browser won't keep a notebook (storage is off)."); return; }
    if (r.full) { flash('nb-status', '⚠️ The notebook is full. Remove an entry first.'); return; }
    nbView.open.add(r.entry.id);
    nbShowAll();
    const el = document.querySelector(`#nb-e-${r.entry.id} .nb-f[data-f="${focus}"]`);
    if (el) {
        el.focus({ preventScroll: true });
        if (el.select && focus === 'title') el.select();
        document.getElementById('nb-e-' + r.entry.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    flash('nb-status', said);
}

function nbNewSession() {
    const n = nbNextSessionNum(nbLoad());
    nbAddByHand({ kind: 'session', title: `Session ${n}`, href: '', num: n, date: nbToday() }, 'recap',
        `📖 Session ${n} is in the notebook. Fill it in as you play or after the game; it saves as you type.`);
}

function nbNewQuest() {
    nbAddByHand({ kind: 'quest', title: 'A new quest', href: '', status: 'open' }, 'title', '❗ Quest added. Name it, and set its status on the card as it goes.');
}

// Save one of a session's or quest's fields, then redraw just that card's top (the cursor stays put).
function nbSaveField(box) {
    const nb = nbLoad();
    const e = nbFind(nb, box.dataset.id);
    if (!e) return;
    const f = box.dataset.f;
    if (f === 'title') e.title = nbText(box.value, NB_LIMITS.title) || (e.kind === 'session' && e.num ? `Session ${e.num}` : NB_KINDS[e.kind].label);
    else if (f === 'sub') e.sub = nbText(box.value, NB_LIMITS.sub);
    else nbSetField(e, f, box.value);
    if (!nbStore(nb, true)) { flash('nb-status', "⚠️ This browser won't keep a notebook (storage is off)."); return; }
    const card = document.getElementById('nb-e-' + e.id);
    if (!card) return;
    card.querySelector('.nb-top').outerHTML = nbTopHTML(nb, e);
    const title = card.querySelector('.nb-f[data-f="title"]');
    if (title && title !== document.activeElement) title.value = e.title;
    if (nbView.last) renderLast(nb);
}

function nbAsText(nb) {
    const out = [nb.name || 'Campaign notebook', ''];
    nb.entries.slice().sort((a, b) => a.added.localeCompare(b.added)).forEach(e => {
        out.push(`${nbKindOpt(e.kind).label}: ${e.title}`);
        if (e.kind === 'quest') out.push('Status: ' + NB_QUEST_STATUS[e.status].label);
        if (e.sub) out.push(e.sub);
        if (e.giver) out.push('Giver: ' + e.giver);
        if (e.reward) out.push('Reward: ' + e.reward);
        if (e.date) out.push('Played: ' + nbDateText(e.date));
        if (e.recap) out.push('What happened: ' + e.recap);
        if (e.npcs) out.push('NPCs met: ' + e.npcs);
        if (e.loot) out.push('Loot: ' + e.loot);
        if (e.threads) out.push('Open threads: ' + nbLines(e.threads).join('; '));
        if (e.notes) out.push('Notes: ' + e.notes);
        if (e.dm) out.push('DM only: ' + e.dm);
        (e.pins || []).forEach((p, n) => {
            const to = p.to && nbFind(nb, p.to);
            out.push(`Pin ${n + 1}${p.name ? ': ' + p.name : ''}${p.note ? '. ' + p.note : ''}${to ? ` (see ${to.title})` : ''}`);
        });
        const linked = e.links.map(l => nbFind(nb, l)).filter(Boolean).map(o => o.title);
        if (linked.length) out.push('Linked to: ' + linked.join('; '));
        if (e.href) out.push(new URL(e.href, location.href).href);
        out.push('');
    });
    return out.join('\n').trim();
}

function nbExport() {
    const nb = nbLoad();
    if (!nb.entries.length) return;
    const url = URL.createObjectURL(new Blob([nbExportText(nb)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nbFileName(nb);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('nb-status', '💾 Notebook exported. Import that file to bring the world back, here or in another browser.');
}

function nbImport(file) {
    if (!file) return;
    if (file.size > NB_LIMITS.file) { flash('nb-status', '⚠️ That file is too big to be a notebook.'); return; }
    file.text().then(text => {
        const { nb: incoming, dropped } = nbParseFile(text);
        const nb = nbLoad();
        const r = nbMerge(nb, incoming);
        if (!nbStore(nb)) throw new Error("This browser won't keep a notebook (storage is off).");
        const bits = [`📂 Imported ${r.added} ${r.added === 1 ? 'entry' : 'entries'}`];
        if (r.merged) bits.push(`${r.merged} already here`);
        if (dropped) bits.push(`${dropped} skipped as unreadable`);
        if (r.full) bits.push(`${r.full} left out (the notebook is full)`);
        flash('nb-status', bits.join(', ') + '.');
    }).catch(err => flash('nb-status', '⚠️ ' + (err && err.message ? err.message : "That file couldn't be read.")));
}

function setupNotebook() {
    const kind = document.getElementById('nb-kind');
    Object.entries(NB_KINDS).forEach(([key, k]) => kind.add(new Option(`${k.icon} ${k.label}`, key)));
    kind.addEventListener('change', () => renderNotebook());
    const status = document.getElementById('nb-qstatus');
    Object.entries(NB_QUEST_STATUS).forEach(([key, s]) => status.add(new Option(`${s.icon} ${s.label}`, key)));
    status.addEventListener('change', () => renderNotebook());
    document.getElementById('nb-search').addEventListener('input', () => renderNotebook());

    const name = document.getElementById('nb-name');
    name.addEventListener('input', () => {
        const nb = nbLoad();
        nb.name = nbText(name.value, NB_LIMITS.name);
        nbStore(nb, true);
        if (nbView.last) renderLast(nb);
    });

    document.getElementById('nb-new-session').addEventListener('click', nbNewSession);
    document.getElementById('nb-new-quest').addEventListener('click', nbNewQuest);
    document.getElementById('nb-last-btn').addEventListener('click', nbShowLast);
    document.getElementById('nb-last-close').addEventListener('click', () => { nbView.last = false; renderLast(nbLoad()); });
    document.getElementById('nb-last-copy').addEventListener('click', () => {
        const text = nbLastText(nbLoad());
        if (text) copyText(text, 'nb-last-status', 'the recap');
    });
    document.getElementById('nb-last-print').addEventListener('click', () => {
        document.body.classList.add('print-last');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-last'));
    setupPlayers();

    const list = document.getElementById('nb-list');
    list.addEventListener('click', e => {
        const jump = e.target.closest('.nb-jump');
        if (jump) { nbJump(jump.dataset.to); return; }
        const unlink = e.target.closest('.nb-unlink');
        if (unlink) { nbEdit(nb => nbUnlink(nb, unlink.dataset.id, unlink.dataset.to)); return; }
        const remove = e.target.closest('.nb-remove');
        if (remove) {
            const id = remove.dataset.id;
            if (nbView.removing === id) {
                nbView.removing = null;
                nbView.open.delete(id);
                nbEdit(nb => nbRemove(nb, id));
            } else {
                nbView.removing = id;
                renderNotebook();
                setTimeout(() => { if (nbView.removing === id) { nbView.removing = null; renderNotebook(); } }, 4000);
            }
        }
    });
    list.addEventListener('change', e => {
        const sel = e.target.closest('.nb-addlink');
        if (sel && sel.value) { nbEdit(nb => nbLink(nb, sel.dataset.id, sel.value)); return; }
        const qs = e.target.closest('.nb-qs');
        if (qs) nbEdit(nb => { const q = nbFind(nb, qs.dataset.id); if (q) nbSetField(q, 'status', qs.value); });
    });
    // Notes and fields save as you type (without a full redraw, so the cursor stays put).
    list.addEventListener('input', e => {
        const field = e.target.closest('.nb-f');
        if (field) {
            const key = field.dataset.id + '|' + field.dataset.f;
            clearTimeout(nbFieldTimers[key]);
            nbFieldTimers[key] = setTimeout(() => { delete nbFieldTimers[key]; nbSaveField(field); }, 400);
            return;
        }
        const box = e.target.closest('.nb-notes');
        if (!box) return;
        const k = box.dataset.k === 'dm' ? 'dm' : 'notes', key = box.dataset.id + '|' + k;
        clearTimeout(nbFieldTimers[key]);
        nbFieldTimers[key] = setTimeout(() => {
            delete nbFieldTimers[key];
            const nb = nbLoad();
            const entry = nbFind(nb, box.dataset.id);
            if (!entry) return;
            const v = nbText(box.value, NB_LIMITS.notes);
            if (k === 'dm' && !v) delete entry.dm;
            else entry[k] = v;
            if (!nbStore(nb, true)) flash('nb-status', "⚠️ This browser won't keep a notebook (storage is off).");
            else if (k === 'notes' && nbView.players) renderPlayers(nb);
        }, 400);
    });
    list.addEventListener('toggle', e => {
        const d = e.target;
        if (!d.classList || !d.classList.contains('nb-more')) return;
        d.open ? nbView.open.add(d.dataset.id) : nbView.open.delete(d.dataset.id);
    }, true);

    document.getElementById('nb-export').addEventListener('click', nbExport);
    const file = document.getElementById('nb-file');
    document.getElementById('nb-import').addEventListener('click', () => file.click());
    file.addEventListener('change', () => { nbImport(file.files[0]); file.value = ''; });
    document.getElementById('nb-copy').addEventListener('click', () => {
        const nb = nbLoad();
        if (nb.entries.length) copyText(nbAsText(nb), 'nb-status', 'the notebook');
    });
    document.getElementById('nb-clear').addEventListener('click', () => {
        if (!nbView.clearing) {
            nbView.clearing = true;
            renderNotebook();
            setTimeout(() => { if (nbView.clearing) { nbView.clearing = false; renderNotebook(); } }, 4000);
            return;
        }
        nbView.clearing = false;
        nbView.open.clear();
        const name = nbLoad().name;
        if (nbStore({ name, entries: [] })) flash('nb-status', '🗑️ Notebook cleared.');
    });

    nbOnChange(nb => renderNotebook(nb));
    renderNotebook();
}

WORLD_TABS.notebook = {
    setup: setupNotebook,
    params: () => worldUrlFor('notebook', {}),
    apply: () => { renderNotebook(); return true; },
    fresh: () => renderNotebook(),
    rolled: () => true
};
