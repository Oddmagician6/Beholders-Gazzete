/* ============================================
   SPELL PLANNER (F61): pick today's prepared spells against the limit
   (clerics, druids, and paladins from the class list, a wizard from the
   spellbook), star favorites, swap the list after a long rest, and print
   cut-out spell cards (cards.js). Known casters (bard, ranger, sorcerer,
   warlock) get the same list and cards.
   Two modes: a saved Character Builder character (?char=<id>; changes save
   onto it in CB_KEY, favorites in c.spells.fav), or a caster that lives in
   the address bar (cls, lv, sc = casting score, land, and spell slugs in
   ct = cantrips, p = prepared/known/spellbook, w = a wizard's prepared,
   arc = Mystic Arcanum, f = favorites), so nothing new goes in localStorage.
   Needs rng.js, character-data.js, character-engine.js, spells-data.js,
   spell-detail.js (spellSlug), spell-summaries.js, and cards.js.
   ============================================ */

const SP_LEVELS = ['Cantrips', '1st level', '2nd level', '3rd level', '4th level', '5th level', '6th level', '7th level', '8th level', '9th level'];
const SP_SLUG = {};
SPELLS_DATA.forEach(s => { SP_SLUG[spellSlug(s.name)] = s; });

// edit: '' | 'prep' | 'known' | 'cantrips'; before: the spells when editing began (for Cancel and the swap note).
const sp = { charId: '', c: null, edit: '', before: null, filter: '', favOnly: false, cards: 'today', paper: 'letter' };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('sp-status');
    el.textContent = msg;
    el.classList.toggle('sp-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

const spRules = () => cbSpellRules(sp.c);
const spClass = () => cbClass(sp.c.cls);
const spCasterChars = () => cbLoadAll().filter(c => cbClass(c.cls) && cbClass(c.cls).cast);
const spBySpell = (a, b) => a.level - b.level || a.name.localeCompare(b.name);
const spCopy = spells => JSON.parse(JSON.stringify(spells));
const spFavs = () => sp.c.spells.fav || (sp.c.spells.fav = []);

// Every spell of the class from 1st level up to the highest it can cast.
function spClassPool(c, r) {
    const out = [];
    for (let lv = 1; lv <= r.maxLevel; lv++) out.push(...cbClassSpells(c, lv));
    return out;
}

// Keep a caster from the address bar legal for its class and level.
function spFit(c) {
    const r = cbSpellRules(c);
    if (!r) { c.spells = { cantrips: [], list: [], prepared: [], arcanum: {}, fav: c.spells.fav || [] }; return; }
    const onList = s => s && cbClassSpells(c, s.level).includes(s);
    const always = new Set(cbAlwaysSpells(c));
    c.spells.cantrips = c.spells.cantrips.filter(n => { const s = cbSpell(n); return onList(s) && s.level === 0; }).slice(0, r.cantrips);
    c.spells.list = c.spells.list.filter(n => { const s = cbSpell(n); return onList(s) && s.level >= 1 && s.level <= r.maxLevel && !always.has(s.name); });
    if (r.type !== 'book') c.spells.list = c.spells.list.slice(0, r.list);
    c.spells.prepared = r.type === 'book' ? c.spells.prepared.filter(n => c.spells.list.includes(n)).slice(0, r.prepared) : [];
    Object.keys(c.spells.arcanum).forEach(lv => {
        const s = cbSpell(c.spells.arcanum[lv]);
        if (!r.arcanum.includes(Number(lv)) || !onList(s) || s.level !== Number(lv)) delete c.spells.arcanum[lv];
    });
}

// ── Address bar ──────────────────────────────────────────
// A caster as link params (also how a saved character is shared).
function spParams(c) {
    const k = cbClass(c.cls);
    if (!k || !k.cast) return {};
    const slugs = list => list.map(spellSlug).join(',');
    return {
        cls: c.cls, lv: c.level, sc: cbScores(c)[k.cast.ability], land: c.cls === 'druid' ? c.opts.land : '',
        ct: slugs(c.spells.cantrips), p: slugs(c.spells.list), w: slugs(c.spells.prepared),
        arc: slugs(Object.keys(c.spells.arcanum).sort().map(lv => c.spells.arcanum[lv])), f: slugs(c.spells.fav || [])
    };
}

function spFromUrl() {
    const q = urlParams();
    const id = q.get('char') || '';
    const saved = id && spCasterChars().find(c => c.id === id);
    sp.edit = '';
    sp.before = null;
    if (saved) { sp.charId = id; sp.c = saved; return; }
    sp.charId = '';
    const c = cbBlank();
    const k = cbClass(q.get('cls'));
    c.cls = k && k.cast ? k.id : '';
    c.level = Math.min(20, Math.max(1, Math.round(Number(q.get('lv'))) || 1));
    CB_ABILITIES.forEach(a => { c.base[a] = 10; });
    const score = Math.round(Number(q.get('sc')));
    if (c.cls) c.base[k.cast.ability] = score >= 1 && score <= 30 ? score : 16;
    if (CB_TERRAINS.includes(q.get('land'))) c.opts.land = q.get('land');
    const names = key => [...new Set((q.get(key) || '').split(',').map(x => SP_SLUG[x]).filter(Boolean).map(s => s.name))];
    c.spells = { cantrips: names('ct'), list: names('p'), prepared: names('w'), arcanum: {}, fav: names('f').slice(0, 80) };
    names('arc').forEach(n => { const lv = cbSpell(n).level; if (lv >= 6) c.spells.arcanum[lv] = n; });
    spFit(c);
    sp.c = c;
}

function spWriteUrl() {
    setUrlParams(sp.charId ? { char: sp.charId } : spParams(sp.c), false);
}

// Save the spells: onto the builder character, or into the address bar.
// favOnly: just the favorites (a star clicked while the picker is open).
function spSave(favOnly = false) {
    if (sp.charId) {
        const fresh = cbLoadAll().find(x => x.id === sp.charId);
        if (!fresh) {
            sp.charId = '';
            flash('That character is gone (deleted in another tab?). Your picks are kept in the address bar instead.', true);
        } else {
            if (favOnly) fresh.spells.fav = spFavs().slice();
            else fresh.spells = spCopy(sp.c.spells);
            if (!cbSave(fresh)) flash('Could not save: this browser\'s storage is full or blocked.', true);
            if (!favOnly) sp.c = fresh;
        }
    }
    if (sp.charId || !sp.edit) spWriteUrl();
}

// ── Lists ────────────────────────────────────────────────
// Today's spells: [{ s, tag }] (cantrips, always prepared, prepared or known, arcanum).
function spToday() {
    const c = sp.c, r = spRules();
    if (!r) return [];
    const out = [];
    const add = (n, tag) => { const s = cbSpell(n); if (s && !out.some(x => x.s === s)) out.push({ s, tag }); };
    c.spells.cantrips.forEach(n => add(n, 'cantrip'));
    cbAlwaysSpells(c).forEach(n => add(n, 'always prepared'));
    (r.type === 'book' ? c.spells.prepared : c.spells.list).forEach(n => add(n, r.type === 'known' ? 'known' : 'prepared'));
    Object.values(c.spells.arcanum).forEach(n => add(n, 'Mystic Arcanum'));
    return out.sort((a, b) => spBySpell(a.s, b.s));
}

// The spells a card set holds: [{ s, tag }].
function spCardSet(which) {
    const c = sp.c, r = spRules();
    if (!r) return [];
    if (which === 'today') return spToday();
    const out = [];
    const add = (s, tag) => { if (s && !out.some(x => x.s === s)) out.push({ s, tag }); };
    if (which === 'fav') spFavs().forEach(n => add(cbSpell(n), 'favorite'));
    if (which === 'book') {
        c.spells.cantrips.forEach(n => add(cbSpell(n), 'cantrip'));
        c.spells.list.forEach(n => add(cbSpell(n), c.spells.prepared.includes(n) ? 'prepared' : 'spellbook'));
    }
    if (which === 'all') {
        cbClassSpells(c, 0).forEach(s => add(s, 'cantrip'));
        const always = new Set(cbAlwaysSpells(c));
        spClassPool(c, r).forEach(s => add(s, always.has(s.name) ? 'always prepared' : r.type === 'known' ? 'class list' : 'can prepare'));
    }
    return out.sort((a, b) => spBySpell(a.s, b.s));
}

// What the open picker edits: { key, title, limit, cap, pool, note }.
function spEditInfo() {
    const c = sp.c, r = spRules();
    if (!r || !sp.edit) return null;
    const withCurrent = (pool, key) => {
        const extra = c.spells[key].map(cbSpell).filter(s => s && !pool.includes(s));
        return [...pool, ...extra].sort(spBySpell);
    };
    if (sp.edit === 'cantrips') return { key: 'cantrips', title: 'Cantrips', limit: r.cantrips, cap: true, pool: withCurrent(cbClassSpells(c, 0), 'cantrips'), note: 'Cantrips stay the same from day to day; a long rest doesn\'t change them.' };
    if (sp.edit === 'prep' && r.type === 'book') {
        return { key: 'prepared', title: '🌙 Prepare from your spellbook', limit: r.prepared, cap: true,
            pool: c.spells.list.map(cbSpell).filter(s => s && s.level <= r.maxLevel).sort(spBySpell),
            note: `Intelligence modifier + wizard level = ${r.prepared}. Only spells in your spellbook can be prepared.` };
    }
    if (sp.edit === 'prep') {
        const always = new Set(cbAlwaysSpells(c));
        const k = spClass();
        const how = c.cls === 'paladin' ? 'Charisma modifier + half your paladin level (rounded down)' : `${CB_ABILITY_NAMES[k.cast.ability]} modifier + ${k.name.toLowerCase()} level`;
        return { key: 'list', title: '🌙 Prepared spells', limit: r.list, cap: true,
            pool: withCurrent(spClassPool(c, r).filter(s => !always.has(s.name)), 'list'),
            note: `${how} = ${r.list}, at least 1. ${always.size ? 'Always-prepared spells don\'t count against it.' : ''}` };
    }
    const book = r.type === 'book';
    return { key: 'list', title: book ? '📜 Your spellbook' : '✏️ Spells known', limit: r.list, cap: !book, pool: withCurrent(spClassPool(c, r), 'list'),
        note: book ? `Six at 1st level and two more each level makes ${r.list}; spells you copy from scrolls and other books go on top.` : 'You can swap one spell known for another each time you gain a level.' };
}

// "Out: … In: …" against the list as it was when the picker opened.
function spSwapNote(info) {
    if (!sp.before) return '';
    const was = sp.before[info.key], now = sp.c.spells[info.key];
    const out = was.filter(n => !now.includes(n)), inn = now.filter(n => !was.includes(n));
    if (!out.length && !inn.length) return '';
    return [out.length && `Out: ${out.join(', ')}`, inn.length && `In: ${inn.join(', ')}`].filter(Boolean).join(' · ');
}

// ── Drawing ──────────────────────────────────────────────
function renderChars() {
    const sel = document.getElementById('sp-char');
    const list = spCasterChars();
    sel.innerHTML = `<option value="">📝 A caster of my own (not saved)</option>`
        + list.map(c => `<option value="${esc(c.id)}"${c.id === sp.charId ? ' selected' : ''}>🧝 ${esc(c.name || 'Unnamed')} (${esc(cbClass(c.cls).name)} ${c.level})</option>`).join('');
    sel.title = list.length ? 'Pick a saved Character Builder character' : 'Spellcasters you save in the Character Builder show up here';
}

function renderSetup() {
    const el = document.getElementById('sp-setup');
    const c = sp.c, k = spClass();
    if (sp.charId) {
        el.innerHTML = `<p class="sp-hint">${esc(c.name || 'This character')}'s class, level, and scores come from the <a href="character-builder">Character Builder</a>; the spells you pick here save onto the character.
            <button type="button" class="sp-btn sp-small" id="sp-open-builder">🧝 Open in the Builder</button></p>`;
        return;
    }
    const casters = CB_CLASSES.filter(x => x.cast);
    const a = k ? k.cast.ability : '';
    el.innerHTML = `<div class="sp-fields">
        <label class="sp-field">Class<select data-set="cls"><option value="">Pick a spellcasting class</option>${casters.map(x => `<option value="${x.id}"${x.id === c.cls ? ' selected' : ''}>${x.icon} ${esc(x.name)}</option>`).join('')}</select></label>
        <label class="sp-field sp-narrow">Level<select data-set="lv">${Array.from({ length: 20 }, (_, i) => `<option${i + 1 === c.level ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label>
        ${k ? `<label class="sp-field sp-narrow">${esc(CB_ABILITY_NAMES[a])}<input type="number" min="1" max="30" inputmode="numeric" data-set="sc" value="${cbScores(c)[a]}" aria-label="${esc(CB_ABILITY_NAMES[a])} score"></label>` : ''}
        ${c.cls === 'druid' && c.level >= 2 ? `<label class="sp-field">Circle land<select data-set="land"><option value="">Pick the land</option>${CB_TERRAINS.map(t => `<option${t === c.opts.land ? ' selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
    </div>${k ? `<p class="sp-dim sp-small-text">With the SRD subclass: ${esc(k.sub.name)}${k.sub.at > 1 ? ` from level ${k.sub.at}` : ''}. Changing the class or level drops any picks that no longer fit.</p>` : ''}`;
}

function renderStats() {
    const el = document.getElementById('sp-stats');
    const c = sp.c, k = spClass(), r = spRules();
    if (!k || !r) { el.innerHTML = '<p class="sp-hint">Pick a spellcasting class, or a saved character, to plan its spells.</p>'; return; }
    const a = k.cast.ability, mod = cbMod(cbScores(c)[a]), prof = cbProf(c.level);
    const count = r.type === 'prepared' ? `Prepare ${r.list}` : r.type === 'book' ? `Prepare ${r.prepared} of ${c.spells.list.length} in the book` : `${r.list} known`;
    const stats = [
        ['Class', `${k.icon} ${esc(k.name)} ${c.level}`],
        ['Spellcasting', `${a.toUpperCase()} ${cbSign(mod)}`],
        ['Spell save DC', 8 + prof + mod],
        ['Spell attack', cbSign(prof + mod)],
        ['Cantrips', r.cantrips || '—'],
        ['Spells', r.maxLevel ? count : '—']
    ];
    let slots = '';
    if (r.pact) slots = `<b>Pact slots:</b> ${r.pact[0]} of ${cbOrd(r.pact[1])} level, back on a short rest${r.arcanum.length ? `; Mystic Arcanum ${r.arcanum.map(cbOrd).join(', ')} (once each per long rest)` : ''}.`;
    else if (r.slots.length) slots = `<b>Spell slots:</b> ${r.slots.map((n, i) => `${cbOrd(i + 1)} ${n}`).join(' · ')}`;
    el.innerHTML = `<div class="sp-stats">${stats.map(([t, v]) => `<div class="sp-stat"><span>${t}</span><b>${v}</b></div>`).join('')}</div>`
        + (slots ? `<p class="sp-slots">${slots}</p>` : '')
        + (!r.maxLevel ? `<p class="sp-hint">${esc(k.name)}s get their first spells at level 2.</p>` : '');
}

const spMeta = s => [s.cast, s.range, s.concentration && 'concentration', s.ritual && 'ritual'].filter(Boolean).join(' · ');
const spStar = n => { const on = spFavs().includes(n); return `<button type="button" class="sp-star${on ? ' on' : ''}" data-fav="${esc(n)}" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} favorites: ${esc(n)}" title="Favorite">${on ? '★' : '☆'}</button>`; };

function renderToday() {
    const el = document.getElementById('sp-list');
    const r = spRules(), k = spClass();
    if (!r) { el.innerHTML = ''; return; }
    const list = spToday();
    const word = r.type === 'known' ? 'Your spells' : 'Prepared today';
    const prepCount = r.type === 'book' ? `${sp.c.spells.prepared.length} / ${r.prepared}` : r.type === 'prepared' ? `${sp.c.spells.list.length} / ${r.list}` : `${sp.c.spells.list.length} / ${r.list}`;
    const btns = [];
    if (r.maxLevel && r.type !== 'known') btns.push(`<button type="button" class="sp-btn sp-gold" data-edit="prep">🌙 Long Rest: Change Prepared Spells</button>`);
    if (r.maxLevel && r.type !== 'prepared') btns.push(`<button type="button" class="sp-btn" data-edit="known">${r.type === 'book' ? '📜 Edit Spellbook' : '✏️ Change Spells Known'}</button>`);
    if (r.cantrips) btns.push(`<button type="button" class="sp-btn" data-edit="cantrips">✨ Change Cantrips (${sp.c.spells.cantrips.length} / ${r.cantrips})</button>`);
    let h = `<div class="sp-top"><h2 class="sp-h">${word} <span class="sp-count">${r.maxLevel ? prepCount : ''}</span></h2></div><div class="sp-btns">${btns.join('')}</div>`;
    if (!list.length) {
        h += `<p class="sp-hint sp-gap">${r.maxLevel || r.cantrips ? 'No spells picked yet. Use the buttons above to pick them.' : 'Nothing to cast yet.'}</p>`;
    } else {
        for (let lv = 0; lv <= 9; lv++) {
            const at = list.filter(x => x.s.level === lv);
            if (!at.length) continue;
            const slotsHere = r.pact ? (lv === r.pact[1] ? `${r.pact[0]} pact slot${r.pact[0] > 1 ? 's' : ''}` : '') : lv && r.slots[lv - 1] ? `${r.slots[lv - 1]} slot${r.slots[lv - 1] > 1 ? 's' : ''}` : '';
            h += `<h3 class="sp-lvh">${SP_LEVELS[lv]}${slotsHere ? ` <span class="sp-dim">· ${slotsHere}</span>` : ''}</h3><ul class="sp-spells">${at.map(({ s, tag }) => `<li>
                ${spStar(s.name)}<div><a href="spell/${spellSlug(s.name)}">${esc(s.name)}</a>${tag === 'always prepared' || tag === 'Mystic Arcanum' ? ` <span class="sp-tag">${esc(tag)}</span>` : ''} <span class="sp-meta">${esc(spMeta(s))}</span>
                <span class="sp-sum">${esc(spellSummary(s))}</span></div></li>`).join('')}</ul>`;
        }
    }
    if (r.type === 'book' && r.maxLevel && !sp.c.spells.list.length) h += `<p class="sp-warn">Your spellbook is empty: add its spells first with 📜 Edit Spellbook, then prepare from it.</p>`;
    if (sp.c.cls === 'druid' && sp.c.level >= 3 && !sp.c.opts.land) h += `<p class="sp-warn">Pick your Circle land to add its always-prepared circle spells.</p>`;
    h += `<div class="sp-actions"><button type="button" class="sp-btn" id="sp-copy">📋 Copy List</button><button type="button" class="sp-btn" id="sp-link">🔗 Copy Link</button></div>`;
    el.innerHTML = h;
}

function renderEditor() {
    const el = document.getElementById('sp-list');
    const info = spEditInfo();
    const chosen = sp.c.spells[info.key];
    const full = info.cap && chosen.length >= info.limit;
    const q = sp.filter.trim().toLowerCase();
    const favs = spFavs();
    const shown = info.pool.filter(s => (!sp.favOnly || favs.includes(s.name)) && (!q || s.name.toLowerCase().includes(q) || spellSummary(s).toLowerCase().includes(q)));
    const note = spSwapNote(info);
    let h = `<div class="sp-top"><h2 class="sp-h">${info.title} <span class="sp-count${chosen.length > info.limit ? ' sp-over' : ''}">${chosen.length} / ${info.limit}</span></h2></div>
        <p class="sp-dim sp-small-text sp-note">${esc(info.note)}</p>
        <div class="sp-tools">
            <input type="search" id="sp-filter" class="sp-filter" placeholder="Filter by name or effect…" aria-label="Filter spells" autocomplete="off" value="${esc(sp.filter)}">
            <label class="sp-check"><input type="checkbox" id="sp-favonly"${sp.favOnly ? ' checked' : ''}> ★ Favorites only</label>
            ${sp.edit === 'prep' ? '<button type="button" class="sp-btn sp-small" id="sp-from-favs">⭐ Start from Favorites</button>' : ''}
            <button type="button" class="sp-btn sp-small" id="sp-clear">Clear All</button>
        </div>
        <p class="sp-swap" aria-live="polite">${esc(note)}</p>`;
    if (!info.pool.length) h += `<p class="sp-hint">${sp.edit === 'prep' ? 'Nothing to prepare from yet: add spells to your spellbook first.' : 'No spells to pick at this level.'}</p>`;
    else if (!shown.length) h += '<p class="sp-hint">No spells match.</p>';
    for (let lv = 0; lv <= 9; lv++) {
        const at = shown.filter(s => s.level === lv);
        if (!at.length) continue;
        h += `<h3 class="sp-lvh">${SP_LEVELS[lv]}</h3><div class="sp-picks">${at.map(s => {
            const on = chosen.includes(s.name);
            return `<div class="sp-pick${on ? ' on' : ''}${!on && full ? ' sp-off' : ''}">
                <label><input type="checkbox" data-pick="${esc(s.name)}"${on ? ' checked' : ''}${!on && full ? ' disabled' : ''}> <b>${esc(s.name)}</b> <span class="sp-meta">${esc(spMeta(s))}</span></label>
                ${spStar(s.name)}<p class="sp-sum">${esc(spellSummary(s))}</p></div>`;
        }).join('')}</div>`;
    }
    const r = spRules();
    if (sp.edit === 'known' && r.arcanum.length) {
        h += `<h3 class="sp-lvh">Mystic Arcanum</h3><div class="sp-fields">${r.arcanum.map(lv => `<label class="sp-field">${cbOrd(lv)} level<select data-arc="${lv}"><option value="">Pick a spell…</option>${cbClassSpells(sp.c, lv).map(s => `<option${sp.c.spells.arcanum[lv] === s.name ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>`).join('')}</div>`;
    }
    h += `<div class="sp-actions sp-sticky"><button type="button" class="sp-btn sp-gold" id="sp-done">✓ Done</button><button type="button" class="sp-btn" id="sp-cancel">✕ Cancel</button></div>`;
    el.innerHTML = h;
}

function renderCards() {
    const r = spRules();
    const panel = document.getElementById('sp-cards');
    panel.hidden = !r;
    if (!r) return;
    const sel = document.getElementById('sp-cardset');
    const opts = [['today', 'Today\'s spells'], ...(r.type === 'book' ? [['book', 'Whole spellbook']] : []), ['fav', 'Favorites'], ['all', `Every ${spClass().name.toLowerCase()} spell I can cast`]];
    if (!opts.some(([v]) => v === sp.cards)) sp.cards = 'today';
    sel.innerHTML = opts.map(([v, t]) => `<option value="${v}"${v === sp.cards ? ' selected' : ''}>${esc(t)} (${spCardSet(v).length})</option>`).join('');
    document.getElementById('sp-paper').value = sp.paper;
    const set = spCardSet(sp.cards);
    const k = spClass();
    document.getElementById('sp-deck').innerHTML = set.length
        ? set.map(({ s, tag }) => spellCardHtml(s, `${k.name} · ${tag}`)).join('')
        : '<p class="sp-hint">No spells in this set yet.</p>';
    const pages = Math.ceil(set.length / 9);
    document.getElementById('sp-card-count').textContent = set.length ? `${set.length} card${set.length > 1 ? 's' : ''}, ${pages} page${pages > 1 ? 's' : ''}` : '';
    document.getElementById('sp-print-btn').disabled = !set.length;
}

function render() {
    renderChars();
    renderSetup();
    renderStats();
    if (sp.edit && spEditInfo()) renderEditor();
    else { sp.edit = ''; renderToday(); }
    renderCards();
}

// ── Actions ──────────────────────────────────────────────
function spText() {
    const r = spRules(), k = spClass();
    if (!r) return '';
    const list = spToday();
    const out = [`${sp.c.name ? sp.c.name + ', ' : ''}${k.name} ${sp.c.level}: spell save DC ${8 + cbProf(sp.c.level) + cbMod(cbScores(sp.c)[k.cast.ability])}, spell attack ${cbSign(cbProf(sp.c.level) + cbMod(cbScores(sp.c)[k.cast.ability]))}`];
    for (let lv = 0; lv <= 9; lv++) {
        const at = list.filter(x => x.s.level === lv);
        if (at.length) out.push(`${SP_LEVELS[lv]}: ${at.map(x => x.s.name + (x.tag === 'always prepared' ? ' (always)' : '')).join(', ')}`);
    }
    return out.join('\n');
}

function spStartEdit(mode) {
    sp.edit = mode;
    sp.before = spCopy(sp.c.spells);
    sp.filter = '';
    sp.favOnly = false;
    render();
    document.getElementById('sp-list').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function spEndEdit(keep) {
    const info = spEditInfo();
    const note = keep && info ? spSwapNote(info) : '';
    if (!keep && sp.before) {
        const fav = spFavs().slice();
        sp.c.spells = sp.before;
        sp.c.spells.fav = fav;
    }
    const wasPrep = sp.edit === 'prep';
    sp.edit = '';
    sp.before = null;
    if (keep) spSave();
    else spWriteUrl();
    render();
    if (keep) flash(note ? `${wasPrep ? '🌙 ' : '✓ '}${note}.` : '✓ No changes.');
    document.getElementById('sp-list').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function spToggleFav(name) {
    const favs = spFavs();
    const i = favs.indexOf(name);
    if (i >= 0) favs.splice(i, 1);
    else if (favs.length >= 80) return flash('Eighty favorites is the most a list can hold.', true);
    else favs.push(name);
    spSave(true);
    render();
    const btn = document.querySelector(`.sp-star[data-fav="${CSS.escape(name)}"]`);
    if (btn) btn.focus();
}

function spPick(name, on) {
    const info = spEditInfo();
    const list = sp.c.spells[info.key];
    if (on && !list.includes(name)) {
        if (info.cap && list.length >= info.limit) return flash(`That's the limit: ${info.limit}. Take one off first.`, true);
        list.push(name);
    }
    if (!on) sp.c.spells[info.key] = list.filter(n => n !== name);
    if (info.key === 'list' && spRules().type === 'book') sp.c.spells.prepared = sp.c.spells.prepared.filter(n => sp.c.spells.list.includes(n));
    renderEditor();
    renderCards();
    const box = document.querySelector(`input[data-pick="${CSS.escape(name)}"]`);
    if (box) box.focus();
}

function spPrint() {
    const set = spCardSet(sp.cards);
    if (!set.length) return;
    const k = spClass();
    document.getElementById('sp-print').innerHTML = gcPages(set.map(({ s, tag }) => spellCardHtml(s, `${k.name} · ${tag}`)));
    document.getElementById('sp-page-css').textContent = gcPageCss(sp.paper);
    window.print();
}

function spSetStandalone(field, value) {
    const c = sp.c;
    if (field === 'cls') {
        const k = cbClass(value);
        c.cls = k && k.cast ? k.id : '';
        CB_ABILITIES.forEach(a => { c.base[a] = 10; });
        if (c.cls) c.base[k.cast.ability] = 16;
        c.opts.land = '';
    }
    if (field === 'lv') c.level = Math.min(20, Math.max(1, Number(value) || 1));
    if (field === 'sc' && spClass()) {
        const n = Math.round(Number(value));
        c.base[spClass().cast.ability] = Number.isFinite(n) ? Math.min(30, Math.max(1, n)) : 10;
    }
    if (field === 'land') c.opts.land = CB_TERRAINS.includes(value) ? value : '';
    spFit(c);
    spWriteUrl();
    render();
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.fav) return spToggleFav(b.dataset.fav);
    if (b.dataset.edit) return spStartEdit(b.dataset.edit);
    if (b.id === 'sp-done') return spEndEdit(true);
    if (b.id === 'sp-cancel') return spEndEdit(false);
    if (b.id === 'sp-clear') {
        sp.c.spells[spEditInfo().key] = [];
        if (spEditInfo().key === 'list' && spRules().type === 'book') sp.c.spells.prepared = [];
        renderEditor();
        return renderCards();
    }
    if (b.id === 'sp-from-favs') {
        const info = spEditInfo();
        const picks = info.pool.filter(s => spFavs().includes(s.name)).map(s => s.name);
        if (!picks.length) return flash('No favorites here yet: star the spells you prepare most (☆).', true);
        sp.c.spells[info.key] = picks.slice(0, info.limit);
        renderEditor();
        renderCards();
        return flash(picks.length > info.limit ? `⭐ Took the first ${info.limit} of your ${picks.length} favorites.` : `⭐ ${picks.length} favorite${picks.length > 1 ? 's' : ''} in; ${info.limit - picks.length} to pick.`);
    }
    if (b.id === 'sp-copy') {
        const text = spText();
        if (!text) return;
        return (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => flash('📋 List copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    }
    if (b.id === 'sp-link') {
        const url = location.origin + location.pathname + '?' + paramsQuery(spParams(sp.c));
        return (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(() => flash(sp.charId ? '🔗 Link copied: it opens these spells as a caster of their own, not the saved character.' : '🔗 Link copied.'), () => flash('Could not copy the link.', true));
    }
    if (b.id === 'sp-open-builder') {
        const c = cbLoadAll().find(x => x.id === sp.charId);
        if (c) cbSave(c);   // newest first, so the builder opens on it
        location.href = 'character-builder';
    }
}

function onChange(e) {
    const el = e.target;
    if (el.dataset.pick) return spPick(el.dataset.pick, el.checked);
    if (el.dataset.set) return spSetStandalone(el.dataset.set, el.value);
    if (el.dataset.arc) {
        if (el.value) sp.c.spells.arcanum[el.dataset.arc] = el.value;
        else delete sp.c.spells.arcanum[el.dataset.arc];
        return renderCards();
    }
    if (el.id === 'sp-favonly') { sp.favOnly = el.checked; return renderEditor(); }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    spFromUrl();
    spWriteUrl();
    render();

    const tool = document.getElementById('sp-tool');
    tool.addEventListener('click', onClick);
    tool.addEventListener('change', onChange);
    tool.addEventListener('input', e => {
        if (e.target.id !== 'sp-filter') return;
        sp.filter = e.target.value;
        const pos = e.target.selectionStart;
        renderEditor();
        const f = document.getElementById('sp-filter');
        f.focus();
        f.setSelectionRange(pos, pos);
    });
    document.getElementById('sp-char').addEventListener('change', e => {
        if (sp.edit) spEndEdit(false);
        setUrlParams(e.target.value ? { char: e.target.value } : {}, true);
        spFromUrl();
        render();
    });
    document.getElementById('sp-cardset').addEventListener('change', e => { sp.cards = e.target.value; renderCards(); });
    document.getElementById('sp-paper').addEventListener('change', e => { sp.paper = e.target.value === 'a4' ? 'a4' : 'letter'; });
    document.getElementById('sp-print-btn').addEventListener('click', spPrint);
    window.addEventListener('popstate', () => { spFromUrl(); render(); });
    window.addEventListener('storage', e => {
        if (e.key !== CB_KEY) return;
        if (sp.charId && !sp.edit) spFromUrl();
        render();
    });
});
