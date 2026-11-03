/* ============================================
   PATHFINDER SPELL PLANNER (ROADMAP L3 P5.5): a Pathfinder caster's spells from
   Player Core 1 and 2. Prepared casters (cleric, druid) fill each slot from their
   tradition; a wizard fills them from the spellbook (one slot a rank for the
   curriculum) and a witch from the familiar; spontaneous casters (bard, oracle,
   sorcerer) build a repertoire by rank and pick signature spells. Granted spells
   (sorcerous gifts, an oracle's mystery, a muse) and focus spells from the class
   choice, class features, and feats are found in the rules text; other focus
   spells are added by hand. A cleric's divine font is counted for you.
   Two modes: a saved Character Builder character (?char=<id>; the picks save onto
   it in PC_KEY, c.spells), or a caster that lives in the address bar (cls, lv, ch,
   ch2, tr, m = spell attribute modifier, ct, bk, r1-r10 repertoire, p1-p10 slots
   ('-' = empty), sg = rank.key signature spells, fo focus, f favorites, ra = show
   uncommon and rare). Rules come from pf2e-character.js; needs pf2e-character-data.js,
   pf2e-items-data.js (pcClean), and pf2e-spells-data.js before it, and loads
   pf2e-character-text.js for the grants.
   ============================================ */

const PS_ACTS = { 1: '◆', 2: '◆◆', 3: '◆◆◆', reaction: '⟲', free: '◇', '1 to 3': '◆ to ◆◆◆', '1 or 2': '◆ or ◆◆', '2 or 3': '◆◆ or ◆◆◆' };
const PS_RARITY = { u: 'Uncommon', r: 'Rare', q: 'Unique' };
const PS_BOOK_WORD = { wizard: ['📜 Spellbook', 'spellbook'], witch: ['🐈‍⬛ Familiar\'s spells', 'familiar'] };
// Focus spells a class picks from a short list, which the planner can't guess.
const PS_FOCUS_HINT = {
    witch: 'Your first hex is your choice: add Patron\'s Puppet or Phase Familiar below.',
    champion: 'Your devotion spell is your choice: add Lay on Hands, Touch of the Void, or Shields of the Spirit below.',
    cleric: 'Domain Initiate and other domain feats give a domain spell of your choice: add it below.',
    monk: 'Qi spell feats give the spell they name: add it below.',
    ranger: 'Warden spell feats give the spell they name: add it below.'
};

// edit: '' | 'ct' | 'book'; before: the spells when editing began (for Cancel).
const ps = { charId: '', c: null, g: null, m: 4, edit: '', before: null, filter: '', favOnly: false, rare: false, textReady: false };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('ps-status');
    el.textContent = msg;
    el.classList.toggle('ps-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

const S = k => PF2E_SPELLS[k];
const psRules = () => pcSpellRules(ps.c);
const psCopy = x => JSON.parse(JSON.stringify(x));
const psByRank = (a, b) => S(a).r - S(b).r || S(a).n.localeCompare(S(b).n);
const psOrd = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
const psFav = k => ps.c.spells.fav.includes(k);

function psGrants() {
    ps.g = pcSpellGrants(ps.c);
    return ps.g;
}

// Drop picks that no longer fit, once the class text is in (before it, grants like a curriculum are unknown).
function psFit() {
    if (ps.textReady) pcFitSpells(ps.c, ps.g);
}

// ── Address bar ──────────────────────────────────────────
function psParams() {
    const c = ps.c, s = c.spells;
    if (ps.charId) return { char: ps.charId, ra: ps.rare ? 1 : '' };
    const p = { cls: c.cls, lv: c.level, ch: c.ch, ch2: c.ch2, tr: c.sub, m: ps.m, ct: s.ct.join(','), bk: s.book.join(','),
        sg: Object.entries(s.sig).map(([r, k]) => `${r}.${k}`).join(','), fo: s.focus.join(','), f: s.fav.join(','), ra: ps.rare ? 1 : '' };
    Object.entries(s.rep).forEach(([r, list]) => { p['r' + r] = list.join(','); });
    Object.entries(s.prep).forEach(([r, list]) => { p['p' + r] = list.map(k => k || '-').join(','); });
    return p;
}

function psFromUrl() {
    const q = urlParams();
    ps.edit = '';
    ps.before = null;
    ps.rare = q.get('ra') === '1';
    const id = q.get('char') || '';
    const saved = id && pcLoadAll().find(c => c.id === id);
    if (saved) {
        ps.charId = id;
        ps.c = saved;
    } else {
        ps.charId = '';
        const list = v => (q.get(v) || '').split(',').filter(Boolean);
        const c = pcBlank();
        c.cls = Object.hasOwn(PF2E_CLASSES, q.get('cls')) && PF2E_CLASSES[q.get('cls')].cast ? q.get('cls') : '';
        c.level = Math.min(20, Math.max(1, Math.round(Number(q.get('lv'))) || 1));
        c.ch = PF2E_CHOICES[q.get('ch')] && PF2E_CHOICES[q.get('ch')].c === c.cls ? q.get('ch') : '';
        c.ch2 = PF2E_CHOICES[q.get('ch2')] && PF2E_CHOICES[q.get('ch2')].c === c.cls ? q.get('ch2') : '';
        c.sub = PC_TRADITIONS.includes(q.get('tr')) ? q.get('tr') : '';
        const m = Math.round(Number(q.get('m')));
        ps.m = Number.isFinite(m) && q.get('m') !== null ? Math.min(7, Math.max(-1, m)) : 4;
        const raw = { ct: list('ct'), book: list('bk'), rep: {}, prep: {}, sig: {}, focus: list('fo'), fav: list('f') };
        for (let r = 1; r <= 10; r++) {
            if (q.get('r' + r)) raw.rep[r] = list('r' + r);
            if (q.get('p' + r)) raw.prep[r] = (q.get('p' + r) || '').split(',').map(k => (k === '-' ? '' : k));
        }
        list('sg').forEach(x => { const [r, k] = x.split('.'); raw.sig[r] = k; });
        c.spells = pcCleanSpells(raw);
        ps.c = c;
    }
    psGrants();
    psFit();
}

function psWriteUrl() {
    setUrlParams(psParams(), false);
}

// Save the spells: onto the builder character, or into the address bar.
function psSave() {
    if (ps.charId) {
        const fresh = pcLoadAll().find(x => x.id === ps.charId);
        if (!fresh) {
            ps.charId = '';
            flash('That character is gone (deleted in another tab?). Your picks are kept in the address bar instead.', true);
        } else {
            fresh.spells = psCopy(ps.c.spells);
            if (!pcSave(fresh)) flash('Could not save: this browser\'s storage is full or blocked.', true);
            ps.c = fresh;
        }
    }
    psWriteUrl();
}

function psChanged() {
    psFit();
    psSave();
    render();
}

// ── Numbers ──────────────────────────────────────────────
// Spell DC and attack: the saved character's own, or the address-bar modifier.
function psNumbers() {
    const r = psRules();
    if (!r) return null;
    if (ps.charId) { const s = pcStats(ps.c); return { atk: s.spellAtk, dc: s.spellDc, mod: s.mods[r.attr] || 0, rank: s.prof.spell }; }
    const rank = pcProfs(ps.c).spell;
    const atk = ps.m + pcBonus(rank, ps.c.level);
    return { atk, dc: 10 + atk, mod: ps.m, rank };
}

// ── Drawing helpers ──────────────────────────────────────
const psCast = s => PS_ACTS[s.t] || s.t || '';
function psMeta(s) {
    return [psCast(s), s.rg, s.ar, s.df, s.du].filter(Boolean).join(' · ');
}
function psSum(s) {
    const first = String(s.x || '').split('\n')[0].replace(/\*\*/g, '');
    const m = /^.{20,}?[.!?](?=\s|$)/.exec(first);
    const t = m ? m[0] : first;
    return t.length > 170 ? t.slice(0, 167).replace(/\s+\S*$/, '') + '…' : t;
}
function psName(k, tag = '') {
    const s = S(k);
    return `<a href="pf2e/spell/${k}">${esc(s.n)}</a>${s.ra && !pcIsFocus(k) ? ` <span class="ps-tag ps-rare">${PS_RARITY[s.ra]}</span>` : ''}${tag ? ` <span class="ps-tag">${esc(tag)}</span>` : ''}`;
}
function psStar(k) {
    const on = psFav(k);
    return `<button type="button" class="ps-star${on ? ' on' : ''}" data-fav="${k}" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} favorites: ${esc(S(k).n)}" title="Favorite">${on ? '★' : '☆'}</button>`;
}
function psRow(k, { tag = '', extra = '', at = 0 } = {}) {
    const s = S(k);
    const up = at && s.r < at ? ` <span class="ps-dim">(rank ${s.r}, heightened)</span>` : '';
    return `<li>${psStar(k)}<div class="ps-row-main">${psName(k, tag)}${up} <span class="ps-meta">${esc(psMeta(s))}</span>
        <span class="ps-sum">${esc(psSum(s))}</span></div>${extra}</li>`;
}

// <option>s for a select: favorites first, then by base rank (highest first).
function psOptions(keys, current, emptyLabel) {
    const list = [...new Set(keys)].filter(k => S(k)).sort(psByRank);
    const opt = k => `<option value="${k}"${k === current ? ' selected' : ''}>${esc(S(k).n)}${S(k).ra ? ` (${PS_RARITY[S(k).ra].toLowerCase()})` : ''}</option>`;
    let h = `<option value="">${esc(emptyLabel)}</option>`;
    const favs = list.filter(psFav);
    if (favs.length) h += `<optgroup label="★ Favorites">${favs.map(opt).join('')}</optgroup>`;
    const ranks = [...new Set(list.map(k => S(k).r))].sort((a, b) => b - a);
    ranks.forEach(r => { h += `<optgroup label="${S(list.find(k => S(k).r === r)).k === 'c' ? 'Cantrips' : 'Rank ' + r}">${list.filter(k => S(k).r === r).map(opt).join('')}</optgroup>`; });
    return h;
}

// ── Lists ────────────────────────────────────────────────
const psGivenAt = (to, n) => ps.g.list.filter(g => g.to === to && g.rank === n);
const psBookHas = k => ps.c.spells.book.includes(k) || ps.g.list.some(g => g.key === k && g.to === 'book');
const psCurr = () => Object.values(ps.g.curr).flat();

// The pool a picker draws on: cantrips for ct, every spell and cantrip for the book.
function psEditPool() {
    const r = psRules(), c = ps.c;
    if (ps.edit === 'ct') {
        if (r.type === 'book') return c.spells.book.filter(k => S(k).k === 'c').concat(ps.g.list.filter(g => g.to === 'book' && g.rank === 0).map(g => g.key));
        const given = psGivenAt('rep', 0).map(g => g.key);
        return pcSpellPool(c, 0, ps.rare).concat(c.spells.ct).filter(k => !given.includes(k));
    }
    return pcSpellPool(c, 0, ps.rare).concat(pcSpellPool(c, r.top, ps.rare), c.spells.book).filter(k => !ps.g.list.some(g => g.key === k && g.to === 'book'));
}

function psEditInfo() {
    const r = psRules();
    if (!r || !ps.edit) return null;
    if (ps.edit === 'ct') {
        const limit = pcCantripLimit(r, ps.g);
        const note = r.type === 'book' ? `Prepare ${limit} cantrips from your ${PS_BOOK_WORD[ps.c.cls][1]} each day${r.curr ? ', one of them from your curriculum' : ''}.`
            : r.type === 'rep' ? 'Cantrips in your repertoire: you can swap one each time you gain a level.' : `Prepare ${limit} cantrips each day from the ${r.trad} list.`;
        return { key: 'ct', title: '✨ Cantrips', limit, cap: true, note };
    }
    const b = r.book;
    return { key: 'book', title: PS_BOOK_WORD[ps.c.cls][0], limit: b.cantrips + b.spells, cap: false,
        note: ps.c.cls === 'wizard'
            ? `A wizard's book starts with 10 cantrips and 5 1st-rank spells${r.curr ? ' plus 2 from the curriculum' : ''}, and gains 2 spells each level${r.curr ? ' and a curriculum spell with each new rank' : ''}: ${b.cantrips} cantrips and ${b.spells} spells at level ${ps.c.level}. Spells copied with Learn a Spell go on top.`
            : `A witch's familiar starts with 10 cantrips, 5 1st-rank spells, and the spell from your patron's lesson, and learns 2 spells each level: ${b.cantrips} cantrips and ${b.spells} spells at level ${ps.c.level}. Scrolls it eats (Learn a Spell) go on top.` };
}

// ── Drawing ──────────────────────────────────────────────
function renderChars() {
    const sel = document.getElementById('ps-char');
    const list = pcLoadAll();
    sel.innerHTML = '<option value="">📝 A caster of my own (not saved)</option>'
        + list.map(c => `<option value="${esc(c.id)}"${c.id === ps.charId ? ' selected' : ''}>🧝 ${esc(c.name || 'Unnamed hero')} (${esc(pcLine(c))})</option>`).join('');
    sel.title = list.length ? 'Pick a saved Character Builder character' : 'Characters you save in the Character Builder show up here';
}

function renderSetup() {
    const el = document.getElementById('ps-setup');
    const c = ps.c;
    if (ps.charId) {
        el.innerHTML = `<p class="ps-hint">${esc(c.name || 'This character')}'s class, level, choices, and attributes come from the <a href="pathfinder-character-builder">Character Builder</a>; the spells you pick here save onto the character.
            <button type="button" class="ps-btn ps-small" id="ps-open-builder">🧝 Open in the Builder</button></p>`;
        return;
    }
    const cls = PF2E_CLASSES[c.cls];
    const casters = Object.entries(PF2E_CLASSES).filter(([, k]) => k.cast).sort((a, b) => a[1].n.localeCompare(b[1].n));
    const choiceSel = (field, tag) => {
        if (!tag) return '';
        const opts = Object.entries(PF2E_CHOICES).filter(([, x]) => x.c === c.cls && x.t === tag[0]).sort((a, b) => a[1].n.localeCompare(b[1].n));
        return `<label class="ps-field">${esc(tag[1])}<select data-set="${field}"><option value="">Pick one</option>${opts.map(([id, x]) => `<option value="${id}"${id === c[field] ? ' selected' : ''}>${esc(x.n.replace(/^Bloodline: /, ''))}</option>`).join('')}</select></label>`;
    };
    const ch = PF2E_CHOICES[c.ch];
    const r = psRules();
    el.innerHTML = `<div class="ps-fields">
        <label class="ps-field">Class<select data-set="cls"><option value="">Pick a spellcasting class</option>${casters.map(([id, k]) => `<option value="${id}"${id === c.cls ? ' selected' : ''}>${esc(k.n)}</option>`).join('')}</select></label>
        <label class="ps-field ps-narrow">Level<select data-set="lv">${Array.from({ length: 20 }, (_, i) => `<option${i + 1 === c.level ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label>
        ${cls ? choiceSel('ch', cls.ch) + choiceSel('ch2', cls.ch2) : ''}
        ${ch && ch.tr === 'choice' ? `<label class="ps-field">Tradition<select data-set="tr"><option value="">Pick one</option>${PC_TRADITIONS.map(t => `<option value="${t}"${t === c.sub ? ' selected' : ''}>${pcCap(t)}</option>`).join('')}</select></label>` : ''}
        ${r ? `<label class="ps-field ps-narrow">${esc(PC_ABIL_NAMES[r.attr] || 'Attribute')}<select data-set="m" aria-label="Spellcasting attribute modifier">${[-1, 0, 1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}"${n === ps.m ? ' selected' : ''}>${pcSign(n)}</option>`).join('')}</select></label>` : ''}
    </div><p class="ps-dim ps-small-text">Changing the class, level, or choice drops any picks that no longer fit. A character from the <a href="pathfinder-character-builder">Character Builder</a> brings its own numbers and feats.</p>`;
}

function renderStats() {
    const el = document.getElementById('ps-stats');
    const r = psRules();
    const c = ps.c;
    if (!r) {
        el.innerHTML = PF2E_CLASSES[c.cls]
            ? `<p class="ps-hint">${esc(PF2E_CLASSES[c.cls].n)}s don't cast spells from a class list, but feats can give them focus spells.</p>`
            : '<p class="ps-hint">Pick a spellcasting class, or a saved character, to plan its spells.</p>';
        return;
    }
    const num = psNumbers();
    const f = pcFocus(c, ps.g);
    const stats = [
        ['Class', `${esc(PF2E_CLASSES[c.cls].n)} ${c.level}`],
        ['Tradition', r.trad ? pcCap(r.trad) : '—'],
        ['Spell DC', num.dc],
        ['Spell attack', pcSign(num.atk)],
        ['Proficiency', PC_RANKS[num.rank]],
        ['Focus Points', f.points || '—']
    ];
    let slots = '';
    if (r.slots.length) slots = `<b>Spell slots:</b> ${r.slots.map((n, i) => (n ? `${psOrd(i + 1)} ${n}` : '')).filter(Boolean).join(' · ')}${r.curr ? ' (one a rank for the curriculum)' : ''}${r.font ? ` · <b>Divine font:</b> ${r.font.n} × ${r.font.spell ? pcCap(r.font.spell) : 'heal or harm'} at ${psOrd(r.font.rank)} rank` : ''}`;
    el.innerHTML = `<div class="ps-stats">${stats.map(([t, v]) => `<div class="ps-stat"><span>${t}</span><b>${v}</b></div>`).join('')}</div>`
        + (slots ? `<p class="ps-slots">${slots}</p>` : '')
        + `<p class="ps-dim ps-small-text">Cantrips and focus spells are heightened to rank ${Math.ceil(c.level / 2)}.${r.sig.length ? ' Signature spells (✦) heighten freely to any rank you can cast.' : ''}</p>`
        + (!r.trad && r.type !== 'focus' ? `<p class="ps-warn">Pick your ${esc((PF2E_CLASSES[c.cls].ch || ['', 'choice'])[1].toLowerCase())}${PF2E_CHOICES[c.ch] && PF2E_CHOICES[c.ch].tr === 'choice' ? '\'s tradition' : ''} to set your tradition.</p>` : '');
}

// Cantrips: picked ones, plus granted ones.
function sectionCantrips(r) {
    const c = ps.c;
    const given = psGivenAt('rep', 0);
    const limit = pcCantripLimit(r, ps.g);
    const rows = [...given.map(g => psRow(g.key, { tag: g.from })), ...c.spells.ct.slice().sort(psByRank).map(k => psRow(k, { tag: r.curr && psCurr().includes(k) ? 'curriculum' : '' }))];
    let h = `<section class="ps-sec"><div class="ps-top"><h2 class="ps-h">Cantrips <span class="ps-count">${c.spells.ct.length} / ${limit}</span></h2>
        <button type="button" class="ps-btn" data-edit="ct">✨ ${r.type === 'rep' ? 'Change Cantrips' : 'Prepare Cantrips'}</button></div>`;
    h += rows.length ? `<ul class="ps-spells">${rows.join('')}</ul>` : '<p class="ps-hint">No cantrips picked yet.</p>';
    if (r.curr && c.spells.ct.length && !c.spells.ct.some(k => psCurr().includes(k))) h += `<p class="ps-warn">One of your cantrips should come from your curriculum (${psCurr().filter(k => S(k).k === 'c').map(k => S(k).n).join(' or ')}).</p>`;
    if (r.type === 'book' && !c.spells.book.some(k => S(k).k === 'c')) h += `<p class="ps-warn">Add cantrips to your ${PS_BOOK_WORD[c.cls][1]} first, then prepare them here.</p>`;
    return h + '</section>';
}

function sectionBook(r) {
    const c = ps.c;
    const book = c.spells.book;
    const given = ps.g.list.filter(g => g.to === 'book');
    const nC = book.filter(k => S(k).k === 'c').length, nS = book.length - nC;
    let h = `<section class="ps-sec"><div class="ps-top"><h2 class="ps-h">${PS_BOOK_WORD[c.cls][0]} <span class="ps-count">${nC} cantrip${nC === 1 ? '' : 's'} · ${nS + given.length} spell${nS + given.length === 1 ? '' : 's'}</span></h2>
        <button type="button" class="ps-btn" data-edit="book">✏️ Edit</button></div>
        <p class="ps-dim ps-small-text">A new one holds ${r.book.cantrips} cantrips and ${r.book.spells} spells at level ${c.level}.${given.length ? ` From your ${esc(given[0].from)}: ${given.map(g => esc(S(g.key).n)).join(', ')}.` : ''}</p>`;
    if (book.length) {
        const byR = {};
        book.forEach(k => { const n = S(k).k === 'c' ? 0 : S(k).r; (byR[n] = byR[n] || []).push(k); });
        h += `<p class="ps-book">${Object.keys(byR).sort((a, b) => a - b).map(n => `<b>${n === '0' ? 'Cantrips' : 'Rank ' + n}:</b> ${byR[n].sort(psByRank).map(k => `<a href="pf2e/spell/${k}">${esc(S(k).n)}</a>${r.curr && psCurr().includes(k) ? ' 📚' : ''}`).join(', ')}`).join('<br>')}</p>`;
    } else h += `<p class="ps-warn">Add your ${PS_BOOK_WORD[c.cls][1]}'s spells first (✏️ Edit), then prepare from it.</p>`;
    return h + '</section>';
}

// A spontaneous caster's repertoire, rank by rank, with signature spells.
function sectionRepertoire(r) {
    const c = ps.c;
    let h = '<section class="ps-sec"><div class="ps-top"><h2 class="ps-h">Spell repertoire</h2></div>';
    for (let n = 1; n <= r.top; n++) {
        const slots = r.slots[n - 1];
        if (!slots) continue;
        const given = psGivenAt('rep', n);
        const mine = c.spells.rep[n] || [];
        const limit = pcRepLimit(r, ps.g, n);
        const sigOk = r.sig.includes(n);
        const sigBtn = k => (sigOk ? `<button type="button" class="ps-sig${c.spells.sig[n] === k ? ' on' : ''}" data-sig="${n}.${k}" aria-pressed="${c.spells.sig[n] === k}" title="Signature spell">✦</button>` : '');
        const rm = k => `<button type="button" class="ps-x" data-rep-off="${n}.${k}" aria-label="Take ${esc(S(k).n)} out of rank ${n}">✕</button>`;
        h += `<h3 class="ps-lvh">${psOrd(n)} rank <span class="ps-dim">· ${slots} slot${slots > 1 ? 's' : ''} · ${mine.length} / ${Math.max(0, limit)} picked</span></h3><ul class="ps-spells">`
            + given.map(g => psRow(g.key, { tag: g.from, at: n, extra: sigBtn(g.key) })).join('')
            + mine.slice().sort(psByRank).map(k => psRow(k, { at: n, extra: sigBtn(k) + rm(k) })).join('') + '</ul>';
        if (mine.length < limit) {
            const taken = new Set([...mine, ...given.map(g => g.key)]);
            const pool = pcSpellPool(c, n, ps.rare).filter(k => !taken.has(k) && (!ps.favOnly || psFav(k)));
            h += `<label class="ps-add">Add a spell<select data-rep-add="${n}">${psOptions(pool, '', `Pick a ${psOrd(n)}-rank spell (or a lower one to heighten)…`)}</select></label>`;
        }
    }
    if (r.sig.length) {
        const missing = r.sig.filter(n => !c.spells.sig[n] && ((c.spells.rep[n] || []).length || psGivenAt('rep', n).length));
        if (missing.length) h += `<p class="ps-dim ps-small-text">✦ Pick one signature spell for rank ${missing.join(', ')}.</p>`;
    }
    return h + '</section>';
}

// Prepared slots, rank by rank (and a cleric's font).
function sectionSlots(r) {
    const c = ps.c;
    let h = `<section class="ps-sec"><div class="ps-top"><h2 class="ps-h">🌙 Prepared today</h2>
        <button type="button" class="ps-btn ps-small" id="ps-clear-slots">Clear All Slots</button></div>`;
    if (r.type === 'list') h += `<p class="ps-dim ps-small-text">Fill each slot from the ${r.trad} list. The same spell can go in more than one slot; a lower-rank spell in a higher slot is heightened.</p>`;
    else h += `<p class="ps-dim ps-small-text">Fill each slot from your ${PS_BOOK_WORD[c.cls][1]}. The same spell can go in more than one slot; a lower-rank spell in a higher slot is heightened.</p>`;
    for (let n = 1; n <= r.top; n++) {
        const slots = r.slots[n - 1];
        if (!slots) continue;
        const row = c.spells.prep[n] || [];
        let pool;
        if (r.type === 'list') pool = pcSpellPool(c, n, ps.rare);
        else pool = c.spells.book.concat(ps.g.list.filter(g => g.to === 'book').map(g => g.key)).filter(k => S(k).k === 's' && S(k).r <= n);
        if (ps.favOnly) pool = pool.filter(psFav);
        const filled = row.filter(Boolean).length;
        h += `<h3 class="ps-lvh">${psOrd(n)} rank <span class="ps-dim">· ${filled} / ${slots}</span></h3><div class="ps-slots-grid">`;
        for (let i = 0; i < slots; i++) {
            const k = row[i] || '';
            const curr = r.curr && n <= 9 && i === slots - 1;
            const opts = curr ? pool.filter(x => psCurr().includes(x)) : pool;
            h += `<div class="ps-slot${curr ? ' ps-curr' : ''}"><label><span class="ps-slot-label">${curr ? '📚 Curriculum' : `Slot ${i + 1}`}</span>
                <select data-prep="${n}.${i}">${psOptions(k ? opts.concat(k) : opts, k, curr ? 'Empty (curriculum spells only)' : 'Empty')}</select></label>
                ${k ? `<span class="ps-meta">${esc(psMeta(S(k)))}${S(k).r < n ? ` · heightened from ${S(k).r}` : ''}</span>` : ''}</div>`;
        }
        h += '</div>';
        if (r.font && r.font.rank === n) h += `<p class="ps-font">✨ Divine font: ${r.font.n} more slots at this rank for ${r.font.spell ? `<a href="pf2e/spell/${r.font.spell}">${pcCap(r.font.spell)}</a>` : 'heal or harm (pick your font in the Character Builder)'} only.</p>`;
    }
    if (r.type === 'book' && !c.spells.book.some(k => S(k).k === 's') && !ps.g.list.some(g => g.to === 'book')) h += `<p class="ps-warn">Nothing to prepare yet: add spells to your ${PS_BOOK_WORD[c.cls][1]} first.</p>`;
    return h + '</section>';
}

function sectionFocus() {
    const c = ps.c;
    const f = pcFocus(c, ps.g);
    const manual = new Set(c.spells.focus);
    let h = `<section class="ps-sec"><div class="ps-top"><h2 class="ps-h">Focus spells <span class="ps-count">${f.points} Focus Point${f.points === 1 ? '' : 's'}</span></h2></div>`;
    if (f.list.length) {
        h += `<ul class="ps-spells">${f.list.map(x => psRow(x.key, {
            tag: S(x.key).k === 'c' ? `focus cantrip${x.from ? ' · ' + x.from : ''}` : x.from,
            extra: manual.has(x.key) && !ps.g.focus.some(g => g.key === x.key) ? `<button type="button" class="ps-x" data-focus-off="${x.key}" aria-label="Take ${esc(S(x.key).n)} off">✕</button>` : ''
        })).join('')}</ul>`;
    } else h += '<p class="ps-hint">No focus spells yet.</p>';
    if (!ps.textReady) h += '<p class="ps-dim ps-small-text">Reading your class and feats for focus spells…</p>';
    if (PS_FOCUS_HINT[c.cls]) h += `<p class="ps-dim ps-small-text">${esc(PS_FOCUS_HINT[c.cls])}</p>`;
    const have = new Set(f.list.map(x => x.key));
    const pool = pcFocusPool(c).filter(k => !have.has(k));
    if (pool.length && c.spells.focus.length < 12) h += `<label class="ps-add">Add a focus spell<select data-focus-add="1">${psOptions(pool, '', `Pick a ${PF2E_CLASSES[c.cls] ? PF2E_CLASSES[c.cls].n.toLowerCase() : ''} focus spell…`)}</select></label>`;
    h += '<p class="ps-dim ps-small-text">Your pool holds one Focus Point per focus spell, up to 3 (focus cantrips cost none). Refocus for 10 minutes to get one back.</p>';
    return h + '</section>';
}

function renderPlan() {
    const el = document.getElementById('ps-plan');
    const r = psRules();
    if (!ps.c.cls) { el.innerHTML = ''; return; }
    let h = '';
    if (r && r.type !== 'focus') {
        if (r.type === 'book') h += sectionBook(r);
        h += sectionCantrips(r);
        h += r.type === 'rep' ? sectionRepertoire(r) : sectionSlots(r);
    }
    h += sectionFocus();
    h += `<div class="ps-actions"><button type="button" class="ps-btn" id="ps-copy">📋 Copy List</button><button type="button" class="ps-btn" id="ps-link">🔗 Copy Link</button></div>`;
    el.innerHTML = h;
}

function renderEditor() {
    const el = document.getElementById('ps-plan');
    const info = psEditInfo();
    const list = info.key === 'ct' ? ps.c.spells.ct : ps.c.spells.book;
    const full = info.cap && list.length >= info.limit;
    const q = ps.filter.trim().toLowerCase();
    const pool = [...new Set(psEditPool())].filter(k => S(k)).sort(psByRank);
    const shown = pool.filter(k => (!ps.favOnly || psFav(k)) && (!q || S(k).n.toLowerCase().includes(q) || String(S(k).x).toLowerCase().includes(q)));
    let h = `<div class="ps-top"><h2 class="ps-h">${info.title} <span class="ps-count${list.length > info.limit ? ' ps-over' : ''}">${list.length} / ${info.limit}</span></h2></div>
        <p class="ps-dim ps-small-text ps-note">${esc(info.note)}</p>
        <div class="ps-tools">
            <input type="search" id="ps-filter" class="ps-filter" placeholder="Filter by name or effect…" aria-label="Filter spells" autocomplete="off" value="${esc(ps.filter)}">
            <button type="button" class="ps-btn ps-small" id="ps-clear">Clear All</button>
        </div>`;
    if (!pool.length) h += `<p class="ps-hint">${info.key === 'ct' && psRules().type === 'book' ? `No cantrips in your ${PS_BOOK_WORD[ps.c.cls][1]} yet.` : 'No spells to pick.'}</p>`;
    else if (!shown.length) h += '<p class="ps-hint">No spells match.</p>';
    const ranks = [...new Set(shown.map(k => (S(k).k === 'c' ? 0 : S(k).r)))].sort((a, b) => a - b);
    ranks.forEach(n => {
        const at = shown.filter(k => (S(k).k === 'c' ? 0 : S(k).r) === n);
        h += `<h3 class="ps-lvh">${n ? `${psOrd(n)} rank` : 'Cantrips'}</h3><div class="ps-picks">${at.map(k => {
            const on = list.includes(k);
            const s = S(k);
            return `<div class="ps-pick${on ? ' on' : ''}${!on && full ? ' ps-off' : ''}">
                <label><input type="checkbox" data-pick="${k}"${on ? ' checked' : ''}${!on && full ? ' disabled' : ''}> <b>${esc(s.n)}</b>${s.ra ? ` <span class="ps-tag ps-rare">${PS_RARITY[s.ra]}</span>` : ''}${psCurr().includes(k) ? ' <span class="ps-tag">📚 curriculum</span>' : ''} <span class="ps-meta">${esc(psMeta(s))}</span></label>
                ${psStar(k)}<p class="ps-sum">${esc(psSum(s))}</p></div>`;
        }).join('')}</div>`;
    });
    h += `<div class="ps-actions ps-sticky"><button type="button" class="ps-btn ps-gold" id="ps-done">✓ Done</button><button type="button" class="ps-btn" id="ps-cancel">✕ Cancel</button></div>`;
    el.innerHTML = h;
}

function renderToggles() {
    document.getElementById('ps-rare').checked = ps.rare;
    document.getElementById('ps-favonly').checked = ps.favOnly;
}

function render() {
    renderChars();
    renderSetup();
    renderStats();
    renderToggles();
    if (ps.edit && psEditInfo()) renderEditor();
    else { ps.edit = ''; renderPlan(); }
}

// ── Actions ──────────────────────────────────────────────
function psText() {
    const c = ps.c, r = psRules();
    const f = pcFocus(c, ps.g);
    const out = [];
    const num = psNumbers();
    if (r) out.push(`${c.name ? c.name + ', ' : ''}${PF2E_CLASSES[c.cls].n} ${c.level}${r.trad ? ` (${r.trad})` : ''}: spell DC ${num.dc}, spell attack ${pcSign(num.atk)}`);
    const names = keys => keys.map(k => S(k).n + (Object.values(c.spells.sig).includes(k) ? ' ✦' : '')).join(', ');
    if (r && r.type !== 'focus') {
        const ct = [...psGivenAt('rep', 0).map(g => g.key), ...c.spells.ct];
        if (ct.length) out.push(`Cantrips: ${names(ct)}`);
        for (let n = 1; n <= r.top; n++) {
            if (!r.slots[n - 1]) continue;
            if (r.type === 'rep') {
                const all = [...psGivenAt('rep', n).map(g => g.key), ...(c.spells.rep[n] || [])];
                if (all.length) out.push(`${psOrd(n)} rank (${r.slots[n - 1]} slots): ${names(all)}`);
            } else {
                const row = (c.spells.prep[n] || []).filter(Boolean);
                if (row.length) out.push(`${psOrd(n)} rank: ${row.map(k => S(k).n).join(', ')}`);
            }
            if (r.font && r.font.rank === n) out.push(`Divine font: ${r.font.n} × ${r.font.spell ? pcCap(r.font.spell) : 'heal or harm'} (${psOrd(n)} rank)`);
        }
    }
    if (f.list.length) out.push(`Focus spells (${f.points} Focus Point${f.points === 1 ? '' : 's'}): ${f.list.map(x => S(x.key).n).join(', ')}`);
    return out.join('\n');
}

function psStartEdit(mode) {
    ps.edit = mode;
    ps.before = psCopy(ps.c.spells);
    ps.filter = '';
    render();
    document.getElementById('ps-plan').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function psEndEdit(keep) {
    if (!keep && ps.before) {
        const fav = ps.c.spells.fav.slice();
        ps.c.spells = ps.before;
        ps.c.spells.fav = fav;
    }
    ps.edit = '';
    ps.before = null;
    psFit();
    if (keep) { psSave(); flash('✓ Saved.'); } else psWriteUrl();
    render();
    document.getElementById('ps-plan').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function psToggleFav(k) {
    const favs = ps.c.spells.fav;
    const i = favs.indexOf(k);
    if (i >= 0) favs.splice(i, 1);
    else if (favs.length >= 80) return flash('Eighty favorites is the most a list can hold.', true);
    else favs.push(k);
    if (!ps.edit) psSave();
    render();
    const btn = document.querySelector(`.ps-star[data-fav="${k}"]`);
    if (btn) btn.focus();
}

function psPick(k, on) {
    const info = psEditInfo();
    const key = info.key;
    const list = ps.c.spells[key];
    if (on && !list.includes(k)) {
        if (info.cap && list.length >= info.limit) return flash(`That's the limit: ${info.limit}. Take one off first.`, true);
        list.push(k);
    }
    if (!on) ps.c.spells[key] = list.filter(x => x !== k);
    renderEditor();
    const box = document.querySelector(`input[data-pick="${k}"]`);
    if (box) box.focus();
}

function psSetStandalone(field, value) {
    const c = ps.c;
    if (field === 'cls') { c.cls = Object.hasOwn(PF2E_CLASSES, value) ? value : ''; c.ch = ''; c.ch2 = ''; c.sub = ''; }
    if (field === 'lv') c.level = Math.min(20, Math.max(1, Number(value) || 1));
    if (field === 'ch' || field === 'ch2') { c[field] = PF2E_CHOICES[value] && PF2E_CHOICES[value].c === c.cls ? value : ''; if (field === 'ch') c.sub = ''; }
    if (field === 'tr') c.sub = PC_TRADITIONS.includes(value) ? value : '';
    if (field === 'm') ps.m = Math.min(7, Math.max(-1, Number(value) || 0));
    psGrants();
    psChanged();
}

function psCopyText(text, done) {
    return (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => flash(done), () => flash('Could not copy; select the text and copy it by hand.', true));
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.fav) return psToggleFav(d.fav);
    if (d.edit) return psStartEdit(d.edit);
    if (b.id === 'ps-done') return psEndEdit(true);
    if (b.id === 'ps-cancel') return psEndEdit(false);
    if (b.id === 'ps-clear') { ps.c.spells[psEditInfo().key] = []; return renderEditor(); }
    if (d.sig) {
        const [n, k] = d.sig.split('.');
        if (ps.c.spells.sig[n] === k) delete ps.c.spells.sig[n];
        else ps.c.spells.sig[n] = k;
        return psChanged();
    }
    if (d.repOff) {
        const [n, k] = d.repOff.split('.');
        ps.c.spells.rep[n] = (ps.c.spells.rep[n] || []).filter(x => x !== k);
        return psChanged();
    }
    if (d.focusOff) { ps.c.spells.focus = ps.c.spells.focus.filter(x => x !== d.focusOff); return psChanged(); }
    if (b.id === 'ps-clear-slots') { ps.c.spells.prep = {}; psChanged(); return flash('🌙 Every slot is empty.'); }
    if (b.id === 'ps-copy') { const t = psText(); if (t) psCopyText(t, '📋 List copied.'); return; }
    if (b.id === 'ps-link') {
        const was = ps.charId;
        ps.charId = '';
        if (was && psNumbers()) ps.m = psNumbers().mod;
        const p = psParams();
        ps.charId = was;
        return psCopyText(location.origin + location.pathname + '?' + paramsQuery(p), was ? '🔗 Link copied: it opens these spells as a caster of their own, not the saved character.' : '🔗 Link copied.');
    }
    if (b.id === 'ps-open-builder') {
        const c = pcLoadAll().find(x => x.id === ps.charId);
        if (c) pcSave(c);   // newest first, so the builder opens on it
        location.href = 'pathfinder-character-builder';
    }
}

function onChange(e) {
    const el = e.target;
    const d = el.dataset;
    if (d.pick) return psPick(d.pick, el.checked);
    if (d.set) return psSetStandalone(d.set, el.value);
    if (d.repAdd && el.value) {
        const n = d.repAdd;
        ps.c.spells.rep[n] = [...(ps.c.spells.rep[n] || []), el.value];
        psChanged();
        const next = document.querySelector(`select[data-rep-add="${n}"]`);
        if (next) next.focus();
        return;
    }
    if (d.prep) {
        const [n, i] = d.prep.split('.').map(Number);
        const slots = psRules().slots[n - 1];
        const row = (ps.c.spells.prep[n] || []).slice();
        while (row.length < slots) row.push('');
        row[i] = el.value;
        ps.c.spells.prep[n] = row;
        psChanged();
        const again = document.querySelector(`select[data-prep="${n}.${i}"]`);
        if (again) again.focus();
        return;
    }
    if (d.focusAdd && el.value) { ps.c.spells.focus.push(el.value); return psChanged(); }
    if (el.id === 'ps-rare') { ps.rare = el.checked; psWriteUrl(); return render(); }
    if (el.id === 'ps-favonly') { ps.favOnly = el.checked; return render(); }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    psFromUrl();
    psWriteUrl();
    render();
    pcLoadText(ok => {
        ps.textReady = true;
        psGrants();
        if (!ps.edit) psFit();
        render();
        if (!ok) flash('Could not load the class text, so granted and focus spells are missing. Reload to try again.', true);
    });

    const tool = document.getElementById('ps-tool');
    tool.addEventListener('click', onClick);
    tool.addEventListener('change', onChange);
    tool.addEventListener('input', e => {
        if (e.target.id !== 'ps-filter') return;
        ps.filter = e.target.value;
        const pos = e.target.selectionStart;
        renderEditor();
        const f = document.getElementById('ps-filter');
        f.focus();
        f.setSelectionRange(pos, pos);
    });
    document.getElementById('ps-char').addEventListener('change', e => {
        if (ps.edit) psEndEdit(false);
        setUrlParams(e.target.value ? { char: e.target.value } : {}, true);
        psFromUrl();
        render();
    });
    window.addEventListener('popstate', () => { psFromUrl(); render(); });
    window.addEventListener('storage', e => {
        if (e.key !== PC_KEY) return;
        if (ps.charId && !ps.edit) psFromUrl();
        render();
    });
});
