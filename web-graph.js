/* ============================================
   RELATIONS WEB (F56): the data side
   The campaign notebook as a graph: every entry a node, and a line wherever two entries
   meet. Three things draw a line (WEB_EDGE_TYPES): the notebook's own links (`links`),
   a map pin that opens another entry (a continent's or your own map's `pins[].to`), and a
   family member who is a saved NPC (`fam.people[].to`). Two entries that meet more than
   one way share one line that remembers every reason.
   webLayout is a small force layout (no library): entries push each other apart, lines
   pull them together, and a light pull keeps it all near the middle. Its start comes from a
   seed, so the same notebook lays out the same way in any browser. Positions the tab has
   already worked out (or you dragged) are kept: a new entry finds its own spot without the
   rest of the web moving.
   Saved in localStorage (WEB_KEY): { pos: { <entry id>: [x, y] }, fixed: [ids you dragged],
   loose: [ids that had no lines when last drawn] }.
   The page side is world-web.js. Needs rng.js (mulberry32, hashString).
   ============================================ */

const WEB_KEY = 'gazette-web';
const WEB_GAP = 125;   // the distance entries settle at
const WEB_LIMITS = { nodes: 500, coord: 100000 };
const WEB_EDGE_TYPES = {
    link: { icon: '🔗', label: 'Links' },
    pin: { icon: '📍', label: 'Pins' },
    family: { icon: '🌳', label: 'Families' }
};
// The ring around each kind's icon.
const WEB_KIND_COLORS = {
    calendar: '#6fa8dc', pantheon: '#f1c232', factions: '#e06666', history: '#b4a7d6', town: '#93c47d',
    sites: '#b08560', continent: '#45b5aa', npc: '#f6a04d', session: '#c9d1d9', quest: '#ff7fbf',
    monster: '#b45fd9', map: '#8dd3f0', family: '#c27ba0'
};

// The notebook as { nodes: [{ id, kind, title, deg }], edges: [{ a, b, types: { link?, pin?, family? }, why: [...] }] }.
// why: { type, from (the map or family entry), name (the pin or person) } for pins and family members.
function webGraph(nb) {
    const ids = new Set(nb.entries.map(e => e.id));
    const pairs = new Map();
    const add = (from, to, type, name) => {
        if (from === to || !ids.has(from) || !ids.has(to)) return;
        const [a, b] = from < to ? [from, to] : [to, from];
        const key = a + ' ' + b;
        let ed = pairs.get(key);
        if (!ed) pairs.set(key, ed = { a, b, types: {}, why: [] });
        // A link counts once (both entries list it); pins and family members count each.
        ed.types[type] = type === 'link' ? 1 : (ed.types[type] || 0) + 1;
        if (type !== 'link') ed.why.push({ type, from, name });
    };
    nb.entries.forEach(e => {
        e.links.forEach(l => add(e.id, l, 'link'));
        (e.pins || []).forEach((p, i) => { if (p.to) add(e.id, p.to, 'pin', typeof pinLabel === 'function' ? pinLabel(p, i) : p.name); });
        if (e.fam && Array.isArray(e.fam.people)) e.fam.people.forEach(p => { if (p.to) add(e.id, p.to, 'family', p.name); });
    });
    const edges = [...pairs.values()];
    const deg = {};
    edges.forEach(ed => { deg[ed.a] = (deg[ed.a] || 0) + 1; deg[ed.b] = (deg[ed.b] || 0) + 1; });
    const nodes = nb.entries.map(e => ({ id: e.id, kind: e.kind, title: e.title, deg: deg[e.id] || 0 }));
    return { nodes, edges };
}

// The line style an edge is drawn in: a notebook link first, then a pin, then a family.
function webEdgeType(ed, on = WEB_EDGE_TYPES) {
    return Object.keys(WEB_EDGE_TYPES).find(t => ed.types[t] && on[t]) || null;
}

// The seed a notebook lays out from: its entries, so the same notebook gives the same web.
function webSeed(nodes) {
    return hashString(nodes.map(n => n.id).sort().join(' '));
}

// Lay out the graph. Returns { <id>: [x, y] }.
//   pos: positions already known; fixed: ids that must not move (dragged);
//   seed: the start; still: keep known positions as they are and place only the new entries
//   (the default when at least half the web is known already); gentle: let everything settle a
//   little from where it is (🧲 Tidy Up), fixed entries still staying put.
function webLayout(nodes, edges, { pos = {}, fixed = new Set(), seed = webSeed(nodes), still = null, gentle = false, iterations = null } = {}) {
    const n = nodes.length;
    const out = {};
    if (!n) return out;
    const rng = mulberry32(seed >>> 0);
    const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
    const X = new Float64Array(n), Y = new Float64Array(n);
    const placed = new Uint8Array(n), frozen = new Uint8Array(n);
    const nbrs = nodes.map(() => []);
    const E = [];
    edges.forEach(ed => {
        const a = idx.get(ed.a), b = idx.get(ed.b);
        if (a === undefined || b === undefined) return;
        E.push(a, b);
        nbrs[a].push(b);
        nbrs[b].push(a);
    });
    let known = 0;
    nodes.forEach((nd, i) => {
        const p = Object.hasOwn(pos, nd.id) ? pos[nd.id] : null;
        if (p) { X[i] = p[0]; Y[i] = p[1]; placed[i] = 1; known++; }
    });
    const k = WEB_GAP;
    const spread = k * Math.sqrt(n) * 0.7;
    if (gentle) still = false;
    else if (still === null) still = known >= n / 2;
    // Where the known part of the web is, so new entries without lines start near it.
    let cx = 0, cy = 0;
    if (known) { for (let i = 0; i < n; i++) if (placed[i]) { cx += X[i]; cy += Y[i]; } cx /= known; cy /= known; }
    // New entries start beside the entries they're linked to; the rest go anywhere in the disc.
    // Chains place outward from what's known, one ring at a time.
    for (let left = n - known; left > 0;) {
        let grew = false;
        for (let i = 0; i < n; i++) {
            if (placed[i]) continue;
            const by = nbrs[i].filter(j => placed[j]);
            if (!by.length) continue;
            const a = rng() * Math.PI * 2, r = k * (0.6 + rng() * 0.6);
            X[i] = by.reduce((s, j) => s + X[j], 0) / by.length + Math.cos(a) * r;
            Y[i] = by.reduce((s, j) => s + Y[j], 0) / by.length + Math.sin(a) * r;
            placed[i] = 2;
            left--;
            grew = true;
        }
        if (grew) continue;
        const i = placed.indexOf(0);
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (known && still ? spread * 1.1 : spread);
        X[i] = cx + Math.cos(a) * r;
        Y[i] = cy + Math.sin(a) * r;
        placed[i] = 2;
        left--;
    }
    nodes.forEach((nd, i) => { if (fixed.has(nd.id) || (still && placed[i] === 1)) frozen[i] = 1; });
    const free = frozen.reduce((s, f) => s + (f ? 0 : 1), 0);
    if (free) {
        const calm = still || gentle;
        const steps = iterations || (calm ? 120 : 300);
        const DX = new Float64Array(n), DY = new Float64Array(n);
        const k2 = k * k, far2 = (k * 12) * (k * 12);
        let t = calm ? k * 1.5 : Math.max(k * 2, spread / 3);
        const cool = t / steps;
        for (let s = 0; s < steps; s++) {
            DX.fill(0);
            DY.fill(0);
            // Every pair pushes apart (k² / d), up to a long way off.
            for (let i = 0; i < n; i++) {
                const xi = X[i], yi = Y[i];
                for (let j = i + 1; j < n; j++) {
                    if (frozen[i] && frozen[j]) continue;
                    let dx = xi - X[j], dy = yi - Y[j];
                    let d2 = dx * dx + dy * dy;
                    if (d2 > far2) continue;
                    if (d2 < 0.01) { dx = rng() - 0.5; dy = rng() - 0.5; d2 = dx * dx + dy * dy; }
                    const f = k2 / d2;
                    DX[i] += dx * f; DY[i] += dy * f;
                    DX[j] -= dx * f; DY[j] -= dy * f;
                }
            }
            // Lines pull together (d² / k).
            for (let e = 0; e < E.length; e += 2) {
                const a = E[e], b = E[e + 1];
                const dx = X[a] - X[b], dy = Y[a] - Y[b];
                const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
                const f = d / k;
                DX[a] -= dx * f; DY[a] -= dy * f;
                DX[b] += dx * f; DY[b] += dy * f;
            }
            // A light pull toward the middle keeps separate clusters (and loose entries) close by.
            for (let i = 0; i < n; i++) {
                if (frozen[i]) continue;
                DX[i] -= (X[i] - cx) * 0.9;
                DY[i] -= (Y[i] - cy) * 0.9;
                const d = Math.sqrt(DX[i] * DX[i] + DY[i] * DY[i]);
                if (d > 0) {
                    const m = Math.min(d, t) / d;
                    X[i] += DX[i] * m;
                    Y[i] += DY[i] * m;
                }
            }
            t = Math.max(k * 0.02, t - cool);
        }
    }
    const lim = WEB_LIMITS.coord;
    nodes.forEach((nd, i) => {
        out[nd.id] = [Math.round(Math.max(-lim, Math.min(lim, X[i])) * 10) / 10, Math.round(Math.max(-lim, Math.min(lim, Y[i])) * 10) / 10];
    });
    return out;
}

// ── Saved layout ──────────────────────────────────────────
function webCleanStore(raw) {
    const pos = {}, fixed = [], loose = [];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const src = raw.pos && typeof raw.pos === 'object' && !Array.isArray(raw.pos) ? raw.pos : {};
        Object.keys(src).slice(0, WEB_LIMITS.nodes).forEach(id => {
            const p = src[id];
            if (/^[a-z0-9]{1,16}$/.test(id) && Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(v) && Math.abs(v) <= WEB_LIMITS.coord)) pos[id] = [p[0], p[1]];
        });
        const ids = list => (Array.isArray(list) ? [...new Set(list)].filter(id => typeof id === 'string' && Object.hasOwn(pos, id)) : []);
        fixed.push(...ids(raw.fixed));
        loose.push(...ids(raw.loose));
    }
    return { pos, fixed, loose };
}

function webLoadStore() {
    try {
        const raw = localStorage.getItem(WEB_KEY);
        return webCleanStore(raw ? JSON.parse(raw) : null);
    } catch (e) {
        return webCleanStore(null);
    }
}

// Keep only the entries still in the notebook (ids). loose: the entries with no lines (placed
// anywhere, so they move in beside the first entry they're tied to). Returns false if storage failed.
function webSaveStore(pos, fixed, ids, loose = []) {
    const keep = {};
    Object.keys(pos).forEach(id => { if (ids.has(id)) keep[id] = pos[id]; });
    try {
        localStorage.setItem(WEB_KEY, JSON.stringify({ pos: keep, fixed: [...fixed].filter(id => Object.hasOwn(keep, id)), loose: loose.filter(id => Object.hasOwn(keep, id)) }));
        return true;
    } catch (e) {
        return false;
    }
}
