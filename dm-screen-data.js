/* ============================================
   DM SCREEN (F57): the data side
   Named layouts of cards, kept in localStorage DS_KEY:
     { cur: layout id, layouts: [{ id, name, cards: [card] }] }
   A card is { id, type, w (1–3 columns), h (DS_HEIGHTS), show (in the player view) } plus its type's own:
     rules { rule: RULES_CARDS id }   clock { clock: gazette-clocks id }   table { table, rolls: [{ t, s }] }
     dice { f, rolls: [{ f, total, d, crit }] }   init, party (nothing: they read the Toolbox)
     entry { entry: notebook id }   monster { m: MONSTER_BY_ID id, 'hb-…' for homebrew }   notes { title, text }
   Clocks, tables, the party, the fight, and the notebook stay where their tools keep them, so a
   card and its tool always agree. Every piece lives in localStorage, so the player view
   (screen-view.html) rebuilds from storage on each 'storage' event and needs no channel.
   dsPlayerCardHtml() is the only thing the players see: it never draws DM-only notes, HP, AC,
   or a stat block, and hides monster names the way the Initiative tab's player view does.
   Needs rules-data.js, toolbox-clocks.js (clockSvg, cleanClock), table-engine.js, party.js,
   init-view.js, and notebook.js on the page.
   ============================================ */

const DS_KEY = 'gazette-dm-screen';
const DS_LIMITS = { layouts: 12, cards: 24, name: 40, title: 60, text: 4000, formula: 80, diceRolls: 6, tableRolls: 5, result: 1000, steps: 300, detail: 300 };
// show: whether the card may go to the player view (a stat block never does).
const DS_TYPES = {
    rules: { icon: '📋', label: 'Rules', h: 'm', show: true, pick: true },
    clock: { icon: '⏳', label: 'Clock', h: 'auto', show: true, pick: true },
    table: { icon: '🗂️', label: 'Random table', h: 'auto', show: true, pick: true },
    dice: { icon: '🎲', label: 'Dice', h: 'auto', show: true },
    init: { icon: '⚔️', label: 'Initiative', h: 'm', show: true },
    party: { icon: '👥', label: 'The party', h: 'auto', show: true },
    entry: { icon: '📓', label: 'Notebook entry', h: 'm', show: true, pick: true },
    monster: { icon: '🐉', label: 'Stat block', h: 'l', show: false, pick: true },
    notes: { icon: '📝', label: 'Notes', h: 'auto', show: true }
};
const DS_HEIGHTS = { auto: 'Fit', s: 'Short', m: 'Medium', l: 'Tall' };
const DS_WIDTHS = { 1: 'Narrow', 2: 'Wide', 3: 'Full' };
const DS_ID = /^[a-z0-9]{1,16}$/;

function dsEsc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dsText(v, max) {
    return typeof v === 'string' ? v.slice(0, max) : '';
}

function dsLine(v, max) {
    return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function dsNewId() {
    return Date.now().toString(36) + Math.floor(Math.random() * 1679616).toString(36);
}

// ── Cleaning (storage is untrusted: another tab, a backup file) ──
function dsRolls(list, max, clean) {
    return Array.isArray(list) ? list.filter(r => r && typeof r === 'object').map(clean).filter(Boolean).slice(0, max) : [];
}

function dsCleanCard(c) {
    if (!c || typeof c !== 'object' || !Object.hasOwn(DS_TYPES, c.type)) return null;
    const type = DS_TYPES[c.type];
    const id = v => (typeof v === 'string' && DS_ID.test(v) ? v : '');
    const out = {
        id: id(c.id) || dsNewId(),
        type: c.type,
        w: [1, 2, 3].includes(c.w) ? c.w : 1,
        h: Object.hasOwn(DS_HEIGHTS, c.h) ? c.h : type.h,
        show: c.show === true && type.show
    };
    if (c.type === 'rules') out.rule = typeof c.rule === 'string' && /^[a-z0-9-]{1,30}$/.test(c.rule) ? c.rule : '';
    else if (c.type === 'clock') out.clock = id(c.clock);
    else if (c.type === 'table') {
        out.table = id(c.table);
        out.rolls = dsRolls(c.rolls, DS_LIMITS.tableRolls, r => (typeof r.t === 'string' ? { t: dsText(r.t, DS_LIMITS.result), s: dsText(r.s, DS_LIMITS.steps) } : null));
    } else if (c.type === 'dice') {
        out.f = dsLine(c.f, DS_LIMITS.formula);
        out.rolls = dsRolls(c.rolls, DS_LIMITS.diceRolls, r => (typeof r.f === 'string' && Number.isFinite(r.total)
            ? { f: dsLine(r.f, DS_LIMITS.formula), total: r.total, d: dsText(r.d, DS_LIMITS.detail), crit: r.crit === 'nat20' || r.crit === 'nat1' ? r.crit : null } : null));
    } else if (c.type === 'entry') out.entry = id(c.entry);
    else if (c.type === 'monster') out.m = typeof c.m === 'string' && /^[a-z0-9-]{1,60}$/.test(c.m) ? c.m : '';
    else if (c.type === 'notes') {
        out.title = dsLine(c.title, DS_LIMITS.title);
        out.text = dsText(c.text, DS_LIMITS.text);
    }
    return out;
}

function dsCleanLayout(l, ids) {
    if (!l || typeof l !== 'object') return null;
    const cardIds = new Set();
    const cards = (Array.isArray(l.cards) ? l.cards : []).map(dsCleanCard).filter(Boolean).slice(0, DS_LIMITS.cards);
    cards.forEach(c => { while (cardIds.has(c.id)) c.id = dsNewId(); cardIds.add(c.id); });
    let id = typeof l.id === 'string' && DS_ID.test(l.id) ? l.id : dsNewId();
    while (ids.has(id)) id = dsNewId();
    ids.add(id);
    return { id, name: dsLine(l.name, DS_LIMITS.name), cards };
}

// The starter screen: what most tables want behind the screen.
function dsStarter() {
    const card = dsCleanCard;
    return {
        id: dsNewId(), name: 'My Screen',
        cards: [
            card({ type: 'rules', rule: 'conditions', w: 2 }),
            card({ type: 'dice', f: '1d20' }),
            card({ type: 'init' }),
            card({ type: 'party' }),
            card({ type: 'notes', title: 'Session notes' })
        ]
    };
}

function dsClean(raw) {
    const ids = new Set();
    const layouts = raw && typeof raw === 'object' && Array.isArray(raw.layouts)
        ? raw.layouts.map(l => dsCleanLayout(l, ids)).filter(Boolean).slice(0, DS_LIMITS.layouts) : [];
    if (!layouts.length) layouts.push(dsStarter());
    const cur = layouts.some(l => l.id === raw?.cur) ? raw.cur : layouts[0].id;
    return { cur, layouts };
}

function dsLoad() {
    try { return dsClean(JSON.parse(localStorage.getItem(DS_KEY))); } catch (e) { return dsClean(null); }
}

// Returns false when the browser wouldn't store it.
function dsSave(state) {
    try { localStorage.setItem(DS_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}

function dsCurrent(state) {
    return state.layouts.find(l => l.id === state.cur) || state.layouts[0];
}

// ── What the cards read (each tool's own key) ─────────────
function dsReadJson(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

function dsClocks() {
    const saved = dsReadJson(CLOCKS_KEY);
    return Array.isArray(saved) ? saved.map(cleanClock).filter(Boolean).slice(0, CLOCKS_MAX) : [];
}

function dsSaveClocks(list) {
    try { localStorage.setItem(CLOCKS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}

// The Toolbox's tables ('gazette-tables'), each with its id.
function dsTables() {
    const saved = dsReadJson('gazette-tables');
    if (!Array.isArray(saved)) return [];
    return saved.map(t => {
        const c = tableClean(t);
        return c && typeof t.id === 'string' && DS_ID.test(t.id) ? { ...c, id: t.id } : null;
    }).filter(Boolean).slice(0, 50);
}

// The Initiative tab's fight, as saved (the tracker keeps it in turn order).
function dsFight() {
    const f = dsReadJson(INIT_VIEW_KEY);
    return f && typeof f === 'object' && Array.isArray(f.list) ? f : { round: 1, turn: null, list: [] };
}

// Reads each source once per draw.
function dsContext() {
    const memo = {};
    const get = (k, fn) => (Object.hasOwn(memo, k) ? memo[k] : (memo[k] = fn()));
    return {
        clocks: () => get('clocks', dsClocks),
        tables: () => get('tables', dsTables),
        party: () => get('party', loadParty),
        nb: () => get('nb', nbLoad),
        fight: () => get('fight', dsFight)
    };
}

function dsRule(id) {
    return RULES_CARDS.find(r => r.id === id) || null;
}

// A rules card's body without its own <section> and heading (the card frame has the title).
function dsRuleBody(rule) {
    return rulesCardHtml(rule, '').replace(/^<section[^>]*><h2>[\s\S]*?<\/h2>/, '').replace(/<\/section>$/, '');
}

// The title in a card's header.
function dsCardTitle(c, ctx) {
    if (c.type === 'rules') { const r = dsRule(c.rule); return r ? r.title : 'Rules'; }
    if (c.type === 'clock') { const k = ctx.clocks().find(x => x.id === c.clock); return k ? k.name || 'Unnamed clock' : 'Clock'; }
    if (c.type === 'table') { const t = ctx.tables().find(x => x.id === c.table); return t ? t.name || 'Untitled table' : 'Random table'; }
    if (c.type === 'entry') { const e = nbFind(ctx.nb(), c.entry); return e ? e.title : 'Notebook entry'; }
    if (c.type === 'monster') {
        const m = typeof MONSTER_BY_ID !== 'undefined' && Object.hasOwn(MONSTER_BY_ID, c.m) ? MONSTER_BY_ID[c.m] : null;
        return m ? m.name : 'Stat block';
    }
    if (c.type === 'notes') return c.title || 'Notes';
    return DS_TYPES[c.type].label;
}

// Text with its line breaks, escaped.
function dsPre(text) {
    return `<div class="ds-pre">${dsEsc(text)}</div>`;
}

const DS_CRIT = { nat20: '<span class="ds-crit hit">Natural 20!</span>', nat1: '<span class="ds-crit miss">Natural 1</span>' };

// ── The player view ───────────────────────────────────────
// One card as the players see it, or '' when there's nothing safe to show.
function dsPlayerCardHtml(c, ctx) {
    if (!DS_TYPES[c.type].show) return '';
    const t = DS_TYPES[c.type];
    let title = dsCardTitle(c, ctx);
    let body = '';
    if (c.type === 'rules') {
        const r = dsRule(c.rule);
        if (!r) return '';
        body = `<div class="rules-card">${dsRuleBody(r)}</div>`;
    } else if (c.type === 'clock') {
        const k = ctx.clocks().find(x => x.id === c.clock);
        if (!k) return '';
        const full = k.filled >= k.size;
        body = `<div class="sv-clock${full ? ' full' : ''}">${clockSvg(k.size, k.filled)}</div><p class="sv-sub">${full ? '⏰ Complete' : `${k.filled} / ${k.size}`}</p>`;
    } else if (c.type === 'table') {
        if (!ctx.tables().some(x => x.id === c.table)) return '';
        body = c.rolls.length ? `<p class="sv-result">${dsEsc(c.rolls[0].t)}</p>` : '<p class="sv-faint">No roll yet.</p>';
    } else if (c.type === 'dice') {
        const r = c.rolls[0];
        body = r ? `<p class="sv-total">${r.total}</p><p class="sv-sub">${dsEsc(r.f)}: ${dsEsc(r.d)}</p>${r.crit ? `<p class="sv-sub">${DS_CRIT[r.crit]}</p>` : ''}` : '<p class="sv-faint">No roll yet.</p>';
    } else if (c.type === 'init') {
        const view = initPlayerView(ctx.fight());
        const turn = initViewTurnText(view);
        title = turn.head;
        body = `${turn.now ? `<p class="sv-sub">Now: <strong>${dsEsc(turn.now)}</strong>${turn.next ? ` · Next: ${dsEsc(turn.next)}` : ''}</p>` : `<p class="sv-sub">${dsEsc(turn.sub || '')}</p>`}
            ${view.list.length ? `<ol class="pv-list">${initViewListHtml(view)}</ol>` : ''}`;
    } else if (c.type === 'party') {
        const party = ctx.party();
        body = party.length ? `<ul class="sv-party">${party.map((p, i) => `<li><strong>${dsEsc(partyMemberName(p, i))}</strong>
            <span>${dsEsc([p.cls, `level ${p.level}`].filter(Boolean).join(' '))}</span>
            ${p.ac !== null ? `<span>AC ${p.ac}</span>` : ''}${p.pp !== null ? `<span>Passive Perception ${p.pp}</span>` : ''}</li>`).join('')}</ul>`
            : '<p class="sv-faint">No party yet.</p>';
    } else if (c.type === 'entry') {
        const e = nbFind(ctx.nb(), c.entry);
        if (!e) return '';
        // Only the notes the players may see: never the DM-only notes or the rolled details.
        body = e.notes ? dsPre(e.notes) : '<p class="sv-faint">Nothing to read yet.</p>';
        title = e.title;
    } else if (c.type === 'notes') {
        body = c.text ? dsPre(c.text) : '<p class="sv-faint">Nothing written yet.</p>';
    }
    const icon = c.type === 'entry' ? (NB_KINDS[(nbFind(ctx.nb(), c.entry) || {}).kind] || t).icon : t.icon;
    return `<section class="sv-card ds-w${c.w}"><h2><span aria-hidden="true">${icon}</span> ${dsEsc(title)}</h2>${body}</section>`;
}
