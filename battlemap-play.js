/* ============================================
   TABLE PLAY: SHARED (F76)
   What the Battlemap Builder's Play mode (battlemap-table.js) and the Player View window
   (battlemap-view.html, battlemap-view.js) both use: the Initiative Tracker's fight as the map
   reads it, which combatant a token stands for, the Play options, and the players' copy of the
   table (bpPlayerState). That copy is all the Player View is sent: no secret doors, nothing under
   the fog, no tokens the DM hid, no hit points, and monsters named as the tracker names them for
   the players (init-view.js: "Unknown creature A") until the DM reveals them there.
   The Builder posts it on BP_CHANNEL at every change. The Player View asks for it when it opens,
   and builds it from this browser's saves when no message comes (no BroadcastChannel, or the
   Builder closed). Same browser only: no server.
   Needs battlemap-engine.js and init-view.js; monsters-data.js (sizes and pictures for
   monsters placed from the fight) when it's on the page.
   ============================================ */

const BP_CHANNEL = 'gazette-battlemap-view';
const BP_OPTS_KEY = 'gazette-battlemap-play';
const BP_FIGHT_KEY = 'gazette-initiative';   // toolbox-table.js INIT_KEY
const BP_PARTY_KEY = 'gazette-party';        // party.js PARTY_KEY

// names: names under the tokens; labels: room labels on the players' map; hp: monsters' health on
// the players' map ('hide', or 'words': bloodied and down); show: the players' map frames what
// they've seen ('seen') or the whole map ('all').
function bpCleanOpts(raw) {
    const o = raw && typeof raw === 'object' ? raw : {};
    return { names: o.names !== false, labels: o.labels === true, hp: o.hp === 'words' ? 'words' : 'hide', show: o.show === 'all' ? 'all' : 'seen' };
}

function bpLoadOpts() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(BP_OPTS_KEY) || 'null'); } catch (e) {}
    return bpCleanOpts(raw);
}

function bpSaveOpts(o) {
    try { localStorage.setItem(BP_OPTS_KEY, JSON.stringify(o)); } catch (e) {}
}

// The fight as the tracker saved it (raw, null when there's none), and its combatants with only what the map uses.
function bpLoadFight() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(BP_FIGHT_KEY) || 'null'); } catch (e) {}
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.list)) raw = null;
    const n = v => typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;
    const list = raw ? raw.list.filter(c => c && typeof c.id === 'number' && typeof c.name === 'string').slice(0, 60) : [];
    return {
        raw,
        round: Math.max(1, n(raw && raw.round) || 1),
        turn: raw && list.some(c => c.id === raw.turn) ? raw.turn : null,
        list: list.map(c => ({
            id: c.id, name: c.name.slice(0, 40), init: n(c.init) ?? 0, mod: n(c.mod) ?? 0, hp: n(c.hp), max: n(c.max),
            pc: c.pc === true, shown: c.shown === true,
            monster: typeof c.monster === 'string' ? c.monster : null, party: typeof c.party === 'string' ? c.party : null,
            conds: Array.isArray(c.conds) ? c.conds.filter(x => typeof x === 'string').map(x => x.slice(0, 20)).slice(0, 15) : []
        }))
    };
}

// The tracker's order: highest initiative first, then the higher bonus, then who joined first.
function bpOrder(list) {
    return list.slice().sort((a, b) => b.init - a.init || b.mod - a.mod || a.id - b.id);
}

// The combatant a token stands for: same id and same name (a cleared and restarted fight reuses ids).
function bpCombatant(t, fight) {
    if (!t.f) return null;
    const name = t.n.toLowerCase();
    return fight.list.find(c => c.id === t.f && c.name.toLowerCase() === name) || null;
}

let bpMonsterIndex = null;
function bpMonster(id) {
    if (typeof MONSTERS === 'undefined') return null;
    if (!bpMonsterIndex) bpMonsterIndex = new Map(MONSTERS.map(r => [r.id, { size: r.size, type: r.type }]));
    return bpMonsterIndex.get(id) || null;
}

// A player character's class, from the Party tab (by the id the Play Sheet gave it, else by name).
function bpPartyClass(c) {
    let party = [];
    try { party = JSON.parse(localStorage.getItem(BP_PARTY_KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(party)) return '';
    const name = c.name.toLowerCase();
    const m = party.find(p => p && c.party && p.id === c.party)
        || party.find((p, i) => p && String(p.name || p.player || `Character ${i + 1}`).slice(0, 36).toLowerCase() === name);
    return m && typeof m.cls === 'string' ? m.cls.toLowerCase() : '';
}

// A new token for a combatant: its size and picture from the Bestiary, or its class portrait.
function bpTokenFor(c) {
    const mon = c.monster ? bpMonster(c.monster) : null;
    let a = '';
    if (mon) a = 'creature/' + (mon.type === 'swarm' ? 'beast' : mon.type);
    else if (c.pc) a = 'class/' + bpPartyClass(c);
    return {
        n: c.name, s: mon && bmHas(BM_TOKEN_SIZES, mon.size) ? mon.size : 'M', c: c.pc ? 'pc' : 'foe',
        a: bmArtOk(a) ? a : '', f: c.id, hid: false
    };
}

// A token as the DM sees it (bmTokenSvg's shape): hit points, conditions, and the turn from the fight.
function bpDmToken(t, fight, sel = false) {
    const out = { x: t.x, y: t.y, s: t.s, c: t.c, a: t.a, n: t.n, hid: t.hid, sel };
    const c = bpCombatant(t, fight);
    if (!c) return out;
    const health = initHealth(c);
    out.now = c.id === fight.turn;
    out.health = health === 'healthy' ? null : health;
    out.bar = typeof c.hp === 'number' && c.max > 0 ? c.hp / c.max : null;
    out.hp = c.max > 0 ? `HP ${c.hp} / ${c.max}` : '';
    out.conds = c.conds;
    return out;
}

// The players' copy of the table. A map never opened in Play mode counts as all hidden.
// ruler: { a, b } in squares and its text, while the DM measures.
function bpPlayerState(m, fight, opts, ruler = null) {
    const fog = m.fog || new Array(m.w * m.h).fill(0);
    const seen = { ...m, fog };
    const view = initPlayerView(fight);
    const pv = new Map(view.list.map(v => [v.key, v]));
    const tokens = m.tk.filter(t => !t.hid && bmTokenSeen(seen, t)).map(t => {
        const c = bpCombatant(t, fight), v = c ? pv.get(c.id) : null;
        // "Unknown creature A" in the turn order; shorter under a token.
        const out = { x: t.x, y: t.y, s: t.s, c: t.c, a: t.a, n: v ? v.name.replace(/^Unknown creature /, 'Unknown ') : t.n };
        if (v) {
            out.now = v.now;
            out.conds = v.conds;
            if (v.pc || opts.hp === 'words') out.health = v.health === 'healthy' ? null : v.health;
        }
        return out;
    });
    const map = bmPack({ ...m, ob: m.ob.filter(o => o.k !== 'secret'), lb: opts.labels ? m.lb : [], tk: [], fog: null });
    delete map.t;
    return {
        v: 1, map, fog: bmRle(fog), tokens, view, names: opts.names, show: opts.show,
        ruler: ruler ? { ax: ruler.a.x, ay: ruler.a.y, bx: ruler.b.x, by: ruler.b.y, text: ruler.text } : null
    };
}

// A state that came over the channel, checked: the map through bmClean, the rest as plain values.
function bpCleanState(s) {
    if (!s || typeof s !== 'object') return null;
    const m = bmClean(s.map);
    if (!m) return null;
    const key = JSON.stringify(bmPack(m));
    m.fog = bmUnRle(s.fog, m.w * m.h, 1) || new Array(m.w * m.h).fill(0);
    const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
    const tokens = (Array.isArray(s.tokens) ? s.tokens : []).slice(0, BM_LIMITS.tokens).map(t => {
        if (!t || typeof t !== 'object' || typeof t.n !== 'string') return null;
        const x = num(t.x, 0, m.w - 1), y = num(t.y, 0, m.h - 1);
        if (x === null || y === null) return null;
        return {
            x, y, s: bmHas(BM_TOKEN_SIZES, t.s) ? t.s : 'M', c: bmHas(BM_TOKEN_KINDS, t.c) ? t.c : 'mark', a: bmArtOk(t.a) ? t.a : '',
            n: t.n.slice(0, BM_LIMITS.tname), now: t.now === true, health: ['bloodied', 'down'].includes(t.health) ? t.health : null,
            conds: Array.isArray(t.conds) ? t.conds.filter(x => typeof x === 'string').map(x => x.slice(0, 20)).slice(0, 15) : []
        };
    }).filter(Boolean);
    const r = s.ruler;
    const ruler = r && typeof r === 'object' && [r.ax, r.ay, r.bx, r.by].every(v => num(v, -1, 61) !== null)
        ? { ax: num(r.ax, 0, m.w), ay: num(r.ay, 0, m.h), bx: num(r.bx, 0, m.w), by: num(r.by, 0, m.h), text: typeof r.text === 'string' ? r.text.slice(0, 40) : '' }
        : null;
    return { m, key, tokens, view: initCleanView(s.view) || initPlayerView({}), names: s.names !== false, show: s.show === 'all' ? 'all' : 'seen', ruler };
}

// The DM's ruler on the players' map. fs: its text size (map units).
function bpRulerSvg(r, fs = 4.5) {
    if (!r) return '';
    const S = SITE_SQUARE, f = v => bmF1(v * S);
    return `<line class="bm-pruler" x1="${f(r.ax)}" y1="${f(r.ay)}" x2="${f(r.bx)}" y2="${f(r.by)}"/>`
        + `<circle class="bm-pruler-end" cx="${f(r.ax)}" cy="${f(r.ay)}" r="1.4"/><circle class="bm-pruler-end" cx="${f(r.bx)}" cy="${f(r.by)}" r="1.4"/>`
        + (r.text ? `<text class="bm-pruler-text" x="${f(r.bx)}" y="${bmF1(r.by * S - fs)}" style="font-size:${bmF1(fs)}px">${siteAttr(r.text)}</text>` : '');
}
