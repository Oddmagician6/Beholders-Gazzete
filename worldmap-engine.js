/* ============================================
   WORLD MAP ENGINE
   A world map drawn by hand, for the World Map Maker (fantasy-world-map-maker.html,
   worldmap.js), the Map Maker's other half beside the Battlemap Builder. Page-free: the
   map, its saved and shared form, and its picture as SVG. The pictures are the
   Continent tab's (img/map: place, terrain, ornament, heraldry, and the textures).
   A map: { id, name, w, h (cells of WM_CELL units, 40-300), style (WM_STYLES), t (last saved),
     land: w × h Uint8Array, row by row (1 land, 0 sea),
     bio: w × h Uint8Array (0 none, else WM_BIOMES[n - 1]: a tint painted over the land),
     ic: [{ k (a WM_ICONS key), x, y (its middle, in units), w (its width), r (degrees), fx (flipped),
       v (a terrain symbol's picture, 1 to n), fc, tc (a coat of arms' field and charge colors) }],
     tx: [{ t (lines split by \n), x, y, f (WM_FONTS), s (size), c (color), h (halo color, '' none),
       b, i, u (bold, italic, capitals), ls (letter spacing, hundredths of an em), r, cv (curve, -100 to 100) }],
     ln: [{ p: [[x, y], …], c, w, d (WM_DASHES), gl (a soft band under it), sm (smooth), cl (closed),
       fl (fill color, '' none), fo (fill opacity), lc (closed and kept to the land) }]: borders,
       roads, rivers, and regions,
     lk: { sea, land, coast (colors, '' the style's own), cw (coast width), ro (coast roughness, 0-10),
       sh (shallows), fr (WM_FRAMES), gr (WM_GRIDS), gs (grid size), go (grid opacity),
       mi (miles across the map, for the ruler and the scale bar), sb (scale bar) } }
   Saved under WM_KEY as { cur, maps: [wmPack(map)] } and shared as one share code
   (rng.js packShareCode) of wmPack(map). wmClean reads either back, trimming what's out of
   shape. The SVG carries its colors in attributes, so it draws the same as a PNG.
   ============================================ */

const WM_KEY = 'gazette-worldmaps';
const WM_CELL = 8;
const WM_ART_DIR = 'img/map/';
const WM_LIMITS = { min: 40, max: 300, maps: 30, icons: 4000, texts: 600, lines: 500, pts: 3000, name: 60, text: 200, code: 600000, bytes: 6000000 };
const WM_SIZES = {
    s: ['Small (1200 × 800)', 150, 100], m: ['Medium (1600 × 1040)', 200, 130], l: ['Large (2080 × 1360)', 260, 170],
    q: ['Square (1360 × 1360)', 170, 170], p: ['Portrait (1040 × 1520)', 130, 190]
};
const WM_STYLES = { art: '🎨 Illustrated', parchment: '📜 Parchment ink', dark: '🌑 Dark' };
// Each style's colors. '' for the illustrated sea and land: the textures. pick: what the
// color pickers show for a texture.
const WM_COLORS = {
    art: { sea: '', land: '', coast: '#4a3a22', shallow: '', grid: '#2a2116', pick: { sea: '#3f6476', land: '#d8c79a' } },
    parchment: { sea: '#b9cfcb', land: '#f0e3c2', coast: '#3a2a18', shallow: '#d6e3dd', grid: '#3a2a18' },
    dark: { sea: '#122029', land: '#2f2a20', coast: '#c9a040', shallow: '#1d3340', grid: '#f0e6c8' }
};
// Biome numbers in bio are these plus one. New ones go on the end: saved maps keep their numbers.
const WM_BIOMES = [
    ['forest', '🌳 Forest', '#4f6b35', 0.38], ['jungle', '🌴 Jungle', '#2f5a2a', 0.45], ['grass', '🌾 Grassland', '#a3b85e', 0.32],
    ['desert', '🏜️ Desert', '#e3c27a', 0.55], ['badlands', '🪨 Badlands', '#a5603a', 0.4], ['swamp', '🐸 Swamp', '#56633a', 0.45],
    ['snow', '❄️ Snow', '#ffffff', 0.72], ['tundra', '🧊 Tundra', '#b8c4c0', 0.5]
];
const WM_FONTS = {
    cinzel: ['Cinzel', "'Cinzel', Georgia, serif", 'wght@400;700'],
    deco: ['Cinzel Decorative', "'Cinzel Decorative', Georgia, serif", 'wght@400;700'],
    fell: ['IM Fell English', "'IM Fell English', Georgia, serif", 'ital@0;1'],
    lato: ['Lato', "'Lato', system-ui, sans-serif", 'ital,wght@0,400;0,700;1,400;1,700'],
    georgia: ['Georgia', 'Georgia, serif', '']
};
const WM_DASHES = { solid: 'Solid', dash: 'Dashed', dot: 'Dotted', dashdot: 'Dash and dot', long: 'Long dashes' };
const WM_FRAMES = { ornate: '🌿 Vine border', double: '═ Double line', line: '─ Thin line', none: 'No frame' };
const WM_GRIDS = { none: 'No grid', hex: '⬡ Hexes', square: '▦ Squares' };
const WM_RANDOM = { continent: 'One big continent', two: 'Two continents', islands: 'Scattered islands', coast: 'A coast, land to the west' };
const WM_ARMS = ['#8a2a22', '#e8c860'];
const WM_SHIELD = 'M6 6H94V58C94 88 72 106 50 116C28 106 6 88 6 58Z';

// What a new line or a new label starts as (the inspector changes any of it afterward).
const WM_LINES = {
    border: { label: '🚩 Border', c: '#8a2a22', w: 3, d: 'dashdot', gl: 1, sm: 1 },
    road: { label: '🛤️ Road', c: '#6b4521', w: 2.5, d: 'dash', sm: 1 },
    trail: { label: '👣 Trail', c: '#6b4521', w: 2, d: 'dot', sm: 1 },
    river: { label: '🌊 River', c: '#3f6f87', w: 3, d: 'solid', sm: 1 },
    route: { label: '⛵ Sea route', c: '#f0e6c8', w: 2, d: 'long', sm: 1 },
    region: { label: '🗺️ Region', c: '#8a2a22', w: 2.5, d: 'dash', sm: 1, cl: 1, fl: '#c0503a', fo: 0.18, lc: 1 },
    wall: { label: '🧱 Great wall', c: '#3a2a18', w: 4, d: 'solid' }
};
const WM_TEXTS = {
    realm: { label: '👑 Realm', t: 'The Kingdom', f: 'deco', s: 44, c: '#3a2414', h: '#f0e6c8', b: 1, u: 1, ls: 30 },
    region: { label: '⛰️ Region', t: 'The Wild Hills', f: 'cinzel', s: 24, c: '#4a3420', h: '', u: 1, ls: 20 },
    sea: { label: '🌊 Sea', t: 'The Sunless Sea', f: 'fell', s: 30, c: '#2d4a5a', h: '', i: 1, ls: 15 },
    town: { label: '🏰 Town', t: 'Town name', f: 'fell', s: 17, c: '#2a2116', h: '#f0e6c8' },
    note: { label: '📝 Note', t: 'Here be dragons', f: 'fell', s: 15, c: '#6a221e', h: '', i: 1 },
    title: { label: '📜 Title', t: 'The Known World', f: 'deco', s: 60, c: '#3a2414', h: '#f0e6c8', b: 1, ls: 8 }
};

// Everything that can be put on the map: { label, file (under img/map), w (its width when
// put down), ar (height ÷ width), n (a terrain sheet's pictures), terrain, arms }.
const WM_ICONS = {};
const WM_ICON_GROUPS = [];
(() => {
    const nice = k => (k.charAt(0).toUpperCase() + k.slice(1)).replace(/-/g, ' ');
    const group = (name, list) => WM_ICON_GROUPS.push([name, list.map(e => {
        const [key, def] = e;
        WM_ICONS[key] = def;
        return key;
    })]);
    const caps = ['kingdom', 'empire', 'republic', 'theocracy', 'magocracy', 'league', 'clans'];
    group('🏰 Settlements', caps.map(c => ['capital-' + c, { label: `Capital (${c})`, file: 'place/capital-' + c, w: 46, ar: 0.95 }]).concat(
        [['metropolis', 44], ['city', 40], ['port-city', 40], ['town', 34], ['port-town', 34], ['village', 28], ['hamlet', 24],
            ['walled-city', 40], ['desert-city', 40], ['elven-city', 40], ['dwarven-hold', 36], ['harbor', 36], ['oasis-town', 34],
            ['gnome-town', 32], ['halfling-shire', 32], ['fishing-village', 30], ['plague-village', 30], ['trading-post', 28],
            ['crossroads-inn', 26], ['logging-camp', 28], ['nomad-camp', 28], ['orc-warcamp', 32]]
            .map(([k, w]) => [k, { label: nice(k), file: 'place/' + k, w, ar: 0.95 }])));
    group('🗝️ Places', ['ruined-keep', 'wizard-tower', 'dragon-lair', 'lost-mine', 'sunken-temple', 'bandit-fort', 'barrow', 'cursed-wood',
        'witch-hut', 'standing-stones', 'monastery', 'oracle', 'lighthouse', 'battlefield', 'portal', 'giant-bones', 'shipwreck', 'floating-isle',
        'abbey-ruins', 'tower-ruins', 'haunted-manor', 'lich-tower', 'hag-s-hut', 'beholder-lair', 'spider-caves', 'cave-entrance', 'graveyard',
        'shrine', 'cathedral', 'academy', 'observatory', 'colosseum', 'sky-castle', 'ice-palace', 'pyramid', 'ziggurat', 'volcano-forge',
        'mine', 'gold-mine', 'quarry', 'crashed-airship', 'frozen-ship']
        .map(k => [k, { label: nice(k).replace(/ s /, "'s "), file: 'place/' + k, w: 34, ar: 0.95 }]));
    group('🌋 Landmarks', ['great-tree', 'treant-grove', 'fey-ring', 'hydra-swamp', 'kraken-reef', 'whirlpool', 'waterfall', 'geyser', 'crater',
        'giant-s-causeway', 'bridge', 'aqueduct', 'dam', 'great-wall']
        .map(k => [k, { label: nice(k).replace(/ s /, "'s "), file: 'place/' + k, w: 34, ar: 0.95 }]));
    group('🎄 Winter festival', [['winter-market-town', 40], ['frost-giant-hall', 40], ['toymaker-s-workshop', 32], ['snow-lodge', 30],
        ['star-tree', 30], ['reindeer-herd', 30]]
        .map(([k, w]) => [k, { label: nice(k).replace(/ s /, "'s "), file: 'place/' + k, w, ar: 0.95 }]));
    group('⛰️ Terrain', [['mountains', 9, 46], ['snowy-mountains', 9, 46], ['volcanoes', 6, 46], ['hills', 9, 34], ['mesas', 9, 34],
        ['trees', 9, 26], ['pines', 9, 26], ['snowy-pines', 9, 26], ['jungle', 9, 28], ['marsh', 9, 28], ['moor', 9, 26],
        ['grass', 9, 22], ['dunes', 9, 36], ['oases', 6, 30], ['tundra', 9, 28], ['frosted-firs', 13, 26], ['snow-hills', 15, 34]]
        .map(([k, n, w]) => ['tr-' + k, { label: nice(k), file: 'terrain/' + k, w, ar: 0.87, n, terrain: true }]));
    group('🐉 Sea and sky', [['ship', 70, 0.652], ['galley', 70, 0.629], ['whale', 70, 0.621], ['kraken', 80, 0.605],
        ['sea-serpent', 90, 0.559], ['dragon', 110, 0.473], ['wind-face', 80, 0.566], ['flying-sleigh', 100, 0.555]]
        .map(([k, w, ar]) => ['or-' + k, { label: nice(k), file: 'ornament/' + k, w, ar }]));
    group('🧭 Decor', [['compass', 'Compass rose', 110, 1.03], ['banner', 'Title scroll', 320, 0.2525], ['border-corner', 'Corner flourish', 70, 0.945],
        ['snowflake-rose', 'Snowflake compass', 110, 1.003], ['winter-star', 'Winter star', 110, 1.022], ['holly-corner', 'Holly corner', 70, 1.026]]
        .map(([k, label, w, ar]) => ['or-' + k, { label, file: 'ornament/' + k, w, ar }]));
    group('🛡️ Coats of arms', ['crowned-lion', 'eagle', 'wolf-head', 'bear', 'stag', 'horse', 'serpent', 'oak', 'rose', 'sun', 'crescent-moon',
        'three-stars', 'tower', 'sword', 'hammer', 'gauntlet', 'key', 'lantern', 'bell', 'ship',
        'snowflake', 'holly-leaf', 'mistletoe', 'pine-cone', 'candle']
        .map(k => ['ar-' + k, { label: nice(k), file: 'heraldry/' + k, w: 40, ar: 1.2, arms: true }]));
})();

const wmHas = (obj, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k);
const wmObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const wmF = v => String(Math.round(v * 10) / 10);

function wmEsc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wmId() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 16);
}

function wmAngle(r) {
    const a = ((Math.round(r) % 360) + 360) % 360;
    return a > 180 ? a - 360 : a;
}

function wmLook() {
    return { sea: '', land: '', coast: '', cw: 2, ro: 5, sh: 1, fr: 'ornate', gr: 'none', gs: 60, go: 0.25, mi: 1200, sb: 0 };
}

function wmBlank(w = 200, h = 130, name = 'New world', style = 'art') {
    return { id: wmId(), name, w, h, style, t: Date.now(), land: new Uint8Array(w * h), bio: new Uint8Array(w * h), ic: [], tx: [], ln: [], lk: wmLook() };
}

function wmCopy(m) {
    return {
        ...m, land: m.land.slice(), bio: m.bio.slice(), ic: m.ic.map(o => ({ ...o })), tx: m.tx.map(o => ({ ...o })),
        ln: m.ln.map(l => ({ ...l, p: l.p.map(q => q.slice()) })), lk: { ...m.lk }
    };
}

// A new icon of kind k at x, y.
function wmNewIcon(k, x, y, scale = 1, rnd = Math.random) {
    const it = WM_ICONS[k], o = { k, x, y, w: Math.round(it.w * scale * 10) / 10, r: 0 };
    if (it.n) o.v = 1 + Math.floor(rnd() * it.n);
    if (it.arms) { o.fc = WM_ARMS[0]; o.tc = WM_ARMS[1]; }
    return o;
}

function wmNewText(k, x, y, t) {
    const p = WM_TEXTS[k];
    return { t: t || p.t, x, y, f: p.f, s: p.s, c: p.c, h: p.h, b: p.b || 0, i: p.i || 0, u: p.u || 0, ls: p.ls || 0, r: 0, cv: 0 };
}

function wmNewLine(k, pts, close) {
    const p = WM_LINES[k];
    return { p: pts, c: p.c, w: p.w, d: p.d, gl: p.gl || 0, sm: p.sm || 0, cl: (close || p.cl) && pts.length >= 3 ? 1 : 0, fl: p.fl || '', fo: p.fo === undefined ? 0.2 : p.fo, lc: p.lc || 0 };
}

// ── The saved and shared form ─────────────────────────────
// A run of small numbers as letters with counts: [0, 0, 0, 2] → "a3c".
function wmRle(arr) {
    let out = '';
    for (let i = 0; i < arr.length;) {
        let j = i;
        while (j < arr.length && arr[j] === arr[i]) j++;
        out += String.fromCharCode(97 + arr[i]) + (j - i > 1 ? j - i : '');
        i = j;
    }
    return out;
}

// Back to n numbers from 0 to max, or null when it doesn't add up to n.
function wmUnRle(s, n, max) {
    if (typeof s !== 'string' || s.length > n * 8 + 8) return null;
    const out = new Uint8Array(n);
    const re = /([a-z])(\d*)/gy;
    let m, at = 0;
    while ((m = re.exec(s))) {
        const v = m[1].charCodeAt(0) - 97, c = m[2] ? parseInt(m[2], 10) : 1;
        if (v > max || c < 1 || at + c > n) return null;
        if (v) out.fill(v, at, at + c);
        at += c;
        if (re.lastIndex === s.length) break;
    }
    return at === n ? out : null;
}

const wmR1 = v => Math.round(v * 10) / 10;

function wmPack(m) {
    return {
        v: 1, id: m.id, n: m.name, w: m.w, h: m.h, s: m.style, t: m.t,
        l: wmRle(m.land), b: wmRle(m.bio),
        i: m.ic.map(o => {
            const a = [o.k, wmR1(o.x), wmR1(o.y), wmR1(o.w), Math.round(o.r)];
            if (o.fx || o.v || o.fc) a.push(o.fx ? 1 : 0, o.v || 0);
            if (o.fc) a.push(o.fc, o.tc);
            return a;
        }),
        x: m.tx.map(o => ({ ...o, x: wmR1(o.x), y: wmR1(o.y) })),
        ln: m.ln.map(l => ({ ...l, p: l.p.map(q => [wmR1(q[0]), wmR1(q[1])]) })),
        k: { ...m.lk }
    };
}

// Typed text: no control characters but line breaks, at most six lines.
function wmText(v, max) {
    if (typeof v !== 'string') return '';
    return v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 6).join('\n').slice(0, max);
}

// A packed map back into a map, or null when it isn't one. Text is kept as typed (the page escapes it).
function wmClean(p) {
    if (!wmObj(p)) return null;
    const side = v => Number.isInteger(v) && v >= WM_LIMITS.min && v <= WM_LIMITS.max ? v : 0;
    const w = side(p.w), h = side(p.h);
    if (!w || !h) return null;
    const W = w * WM_CELL, H = h * WM_CELL;
    const num = (v, lo, hi, d = null) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
    const color = (v, d) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d;
    const pick = (v, list, d) => wmHas(list, v) ? v : d;
    const bit = v => v ? 1 : 0;

    const ic = (Array.isArray(p.i) ? p.i : []).slice(0, WM_LIMITS.icons).map(a => {
        if (!Array.isArray(a) || !wmHas(WM_ICONS, a[0])) return null;
        const it = WM_ICONS[a[0]];
        const x = num(a[1], -60, W + 60), y = num(a[2], -60, H + 60), ow = num(a[3], 4, 900), r = num(a[4], -360, 360);
        if ([x, y, ow, r].includes(null)) return null;
        const o = { k: a[0], x, y, w: ow, r: wmAngle(r) };
        if (a[5]) o.fx = 1;
        if (it.n) o.v = Number.isInteger(a[6]) && a[6] >= 1 && a[6] <= it.n ? a[6] : 1;
        if (it.arms) { o.fc = color(a[7], WM_ARMS[0]); o.tc = color(a[8], WM_ARMS[1]); }
        return o;
    }).filter(Boolean);

    const tx = (Array.isArray(p.x) ? p.x : []).slice(0, WM_LIMITS.texts).map(o => {
        if (!wmObj(o)) return null;
        const t = wmText(o.t, WM_LIMITS.text), x = num(o.x, -60, W + 60), y = num(o.y, -60, H + 60);
        if (!t || x === null || y === null) return null;
        return {
            t, x, y, f: pick(o.f, WM_FONTS, 'cinzel'), s: num(o.s, 4, 300, 20), c: color(o.c, '#2a2116'), h: color(o.h, ''),
            b: bit(o.b), i: bit(o.i), u: bit(o.u), ls: num(o.ls, -10, 100, 0), r: wmAngle(num(o.r, -360, 360, 0)), cv: num(o.cv, -100, 100, 0)
        };
    }).filter(Boolean);

    const ln = (Array.isArray(p.ln) ? p.ln : []).slice(0, WM_LIMITS.lines).map(l => {
        if (!wmObj(l) || !Array.isArray(l.p)) return null;
        const pts = [];
        l.p.slice(0, WM_LIMITS.pts).forEach(q => {
            if (!Array.isArray(q)) return;
            const x = num(q[0], -60, W + 60), y = num(q[1], -60, H + 60);
            if (x !== null && y !== null) pts.push([x, y]);
        });
        if (pts.length < 2) return null;
        return {
            p: pts, c: color(l.c, '#8a2a22'), w: num(l.w, 0.5, 40, 3), d: pick(l.d, WM_DASHES, 'solid'), gl: bit(l.gl), sm: bit(l.sm),
            cl: l.cl && pts.length >= 3 ? 1 : 0, fl: color(l.fl, ''), fo: num(l.fo, 0, 1, 0.2), lc: bit(l.lc)
        };
    }).filter(Boolean);

    const k = wmObj(p.k) ? p.k : {}, d = wmLook();
    const lk = {
        sea: color(k.sea, ''), land: color(k.land, ''), coast: color(k.coast, ''),
        cw: num(k.cw, 0, 8, d.cw), ro: num(k.ro, 0, 10, d.ro), sh: k.sh === undefined ? d.sh : bit(k.sh),
        fr: pick(k.fr, WM_FRAMES, d.fr), gr: pick(k.gr, WM_GRIDS, d.gr), gs: num(k.gs, 24, 400, d.gs), go: num(k.go, 0.05, 1, d.go),
        mi: num(k.mi, 0, 100000, d.mi), sb: bit(k.sb)
    };
    return {
        id: typeof p.id === 'string' && /^[a-z0-9]{1,16}$/.test(p.id) ? p.id : wmId(),
        name: wmText(p.n, WM_LIMITS.name).replace(/\n/g, ' ') || 'Untitled world', w, h,
        style: pick(p.s, WM_STYLES, 'art'), t: num(p.t, 0, 1e15, 0),
        land: wmUnRle(p.l, w * h, 1) || new Uint8Array(w * h), bio: wmUnRle(p.b, w * h, WM_BIOMES.length) || new Uint8Array(w * h),
        ic, tx, ln, lk
    };
}

// ── Saving ────────────────────────────────────────────────
function wmLoadStore() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(WM_KEY) || 'null'); } catch (e) {}
    return wmCleanStore(raw);
}

// A saved store as the page keeps it (backup.js cleans an imported one with this too).
function wmCleanStore(raw) {
    const maps = raw && Array.isArray(raw.maps) ? raw.maps.slice(0, WM_LIMITS.maps).map(wmClean).filter(Boolean) : [];
    const seen = new Set();
    maps.forEach(m => { if (seen.has(m.id)) m.id = wmId(); seen.add(m.id); });
    const cur = raw && maps.some(m => m.id === raw.cur) ? raw.cur : (maps[0] ? maps[0].id : null);
    return { cur, maps };
}

// False when the browser wouldn't keep it (storage full or turned off).
function wmSaveStore(store) {
    try {
        localStorage.setItem(WM_KEY, JSON.stringify({ v: 1, cur: store.cur, maps: store.maps.map(wmPack) }));
        return true;
    } catch (e) {
        return false;
    }
}

// ── Editing ───────────────────────────────────────────────
// Every cell within r cells of x, y (units) set to v in grid (land or bio).
function wmPaint(m, grid, x, y, r, v) {
    const cx = x / WM_CELL, cy = y / WM_CELL;
    let hit = false;
    for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(m.h - 1, Math.ceil(cy + r)); j++) {
        for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(m.w - 1, Math.ceil(cx + r)); i++) {
            if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) > r) continue;
            if (grid[j * m.w + i] !== v) { grid[j * m.w + i] = v; hit = true; }
        }
    }
    return hit;
}

// The map at a new size, cut or grown evenly on all sides; everything on it moves with the land.
function wmResize(m, w, h) {
    const n = { ...wmCopy(m), w, h, land: new Uint8Array(w * h), bio: new Uint8Array(w * h) };
    const ox = Math.floor((w - m.w) / 2), oy = Math.floor((h - m.h) / 2), dx = ox * WM_CELL, dy = oy * WM_CELL;
    for (let y = 0; y < m.h; y++) {
        const ny = y + oy;
        if (ny < 0 || ny >= h) continue;
        for (let x = 0; x < m.w; x++) {
            const nx = x + ox;
            if (nx < 0 || nx >= w) continue;
            n.land[ny * w + nx] = m.land[y * m.w + x];
            n.bio[ny * w + nx] = m.bio[y * m.w + x];
        }
    }
    const W = w * WM_CELL, H = h * WM_CELL, on = (x, y) => x >= -60 && y >= -60 && x <= W + 60 && y <= H + 60;
    n.ic = n.ic.map(o => ({ ...o, x: o.x + dx, y: o.y + dy })).filter(o => on(o.x, o.y));
    n.tx = n.tx.map(o => ({ ...o, x: o.x + dx, y: o.y + dy })).filter(o => on(o.x, o.y));
    n.ln = n.ln.map(l => ({ ...l, p: l.p.map(q => [q[0] + dx, q[1] + dy]).filter(q => on(q[0], q[1])) })).filter(l => l.p.length >= 2);
    n.ln.forEach(l => { if (l.p.length < 3) l.cl = 0; });
    return n;
}

// ── Random land ───────────────────────────────────────────
function wmRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A lattice point's hash, from 0 to 1.
function wmHash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function wmNoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = wmHash(xi, yi, s), b = wmHash(xi + 1, yi, s), c = wmHash(xi, yi + 1, s), d = wmHash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function wmFbm(x, y, s, oct = 5) {
    let t = 0, amp = 1, sum = 0, f = 1;
    for (let k = 0; k < oct; k++) {
        t += wmNoise(x * f, y * f, s + k * 101) * amp;
        sum += amp;
        amp *= 0.5;
        f *= 2;
    }
    return t / sum;
}

// New land (and with terrain, biomes and terrain symbols in place of the old) over the whole map.
// The rest (places, text, lines) stays.
function wmRandomLand(m, kind, seed, terrain) {
    const { w, h } = m, n = w * h, side = Math.max(w, h), elev = new Float32Array(n);
    const sc = kind === 'islands' ? 9 : 4.5;
    const centers = kind === 'two' ? [[0.3, 0.4], [0.72, 0.62]] : [[0.5, 0.5]];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const nx = x / w, ny = y / h;
            const e = wmFbm(x / side * sc, y / side * sc, seed);
            const d = Math.min(...centers.map(([cx, cy]) => Math.hypot((nx - cx) * 2, (ny - cy) * 2) * (centers.length > 1 ? 1.6 : 1)));
            let v;
            if (kind === 'coast') v = e + (0.5 - nx) * 1.3;
            else if (kind === 'islands') v = e - 0.3 * d * d;
            else v = e - 0.75 * d * d;
            // The sea runs around the edge (but a coast's land runs off the west side).
            const edge = Math.min(kind === 'coast' ? 99 : x, w - 1 - x, y, h - 1 - y);
            if (edge < 4) v -= (4 - edge) * 0.08;
            elev[y * w + x] = v;
        }
    }
    const share = { continent: 0.4, two: 0.38, islands: 0.24, coast: 0.45 }[kind] || 0.4;
    const sorted = Float32Array.from(elev).sort();
    const thr = sorted[Math.floor(n * (1 - share))];
    m.land = new Uint8Array(n);
    for (let i = 0; i < n; i++) m.land[i] = elev[i] >= thr ? 1 : 0;
    if (!terrain) return;

    m.bio = new Uint8Array(n);
    const bi = name => WM_BIOMES.findIndex(b => b[0] === name) + 1;
    const top = sorted[n - 1], hi = thr + (top - thr) * 0.55, mid = thr + (top - thr) * 0.38;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (!m.land[i]) continue;
            const t = 0.1 + (y / h) * 0.9 - (elev[i] - thr) * 0.6 + (wmFbm(x / side * 6, y / side * 6, seed + 31, 3) - 0.5) * 0.3;
            const wet = wmFbm(x / side * 5, y / side * 5, seed + 57, 4);
            let b = 'grass';
            if (t < 0.2) b = 'snow';
            else if (t < 0.32) b = 'tundra';
            else if (t > 0.74) b = wet > 0.56 ? 'jungle' : wet < 0.45 ? 'desert' : 'grass';
            else if (wet > 0.6 && elev[i] < mid) b = 'swamp';
            else if (wet > 0.5) b = 'forest';
            else if (wet < 0.38 && t > 0.55) b = 'badlands';
            m.bio[i] = bi(b);
        }
    }
    // Symbols on a jittered lattice: mountains on the heights, hills below them, then each biome's own.
    const rnd = wmRng(seed + 7);
    const sym = { forest: 'tr-trees', jungle: 'tr-jungle', desert: 'tr-dunes', badlands: 'tr-mesas', swamp: 'tr-marsh', snow: 'tr-snowy-pines', tundra: 'tr-tundra', grass: 'tr-grass' };
    const keep = { forest: 0.85, jungle: 0.85, desert: 0.45, badlands: 0.5, swamp: 0.6, snow: 0.35, tundra: 0.35, grass: 0.12 };
    m.ic = m.ic.filter(o => !WM_ICONS[o.k].terrain);
    const add = [];
    const step = 5;
    for (let y = 1; y < h - 1; y += step) {
        for (let x = 1; x < w - 1; x += step) {
            const cx = Math.min(w - 1, Math.floor(x + rnd() * step)), cy = Math.min(h - 1, Math.floor(y + rnd() * step)), i = cy * w + cx;
            if (!m.land[i]) continue;
            const b = WM_BIOMES[m.bio[i] - 1][0];
            let k = null;
            if (elev[i] >= hi) k = b === 'snow' || b === 'tundra' ? 'tr-snowy-mountains' : (rnd() < 0.06 ? 'tr-volcanoes' : 'tr-mountains');
            else if (elev[i] >= mid && rnd() < 0.7) k = 'tr-hills';
            else if (rnd() < keep[b]) k = b === 'forest' && cy < h * 0.45 && rnd() < 0.5 ? 'tr-pines' : sym[b];
            if (k) add.push(wmNewIcon(k, (cx + 0.5) * WM_CELL, (cy + 0.5) * WM_CELL, 0.85 + rnd() * 0.3, rnd));
        }
    }
    m.ic = add.slice(0, WM_LIMITS.icons - m.ic.length).concat(m.ic);
}

// ── Coastlines ────────────────────────────────────────────
// The outlines of the cells where inside(i) holds, as closed loops of grid points [x, y]. Each
// cell side between inside and out is an edge going round the inside clockwise; at a point where
// two inside cells only touch corners, the loop turns toward the cell it's on, so they stay apart.
function wmLoops(w, h, inside) {
    const V = w + 1, nV = V * (h + 1);
    const outA = new Int8Array(nV).fill(-1), outB = new Int8Array(nV).fill(-1);
    const add = (x, y, d) => { const v = y * V + x; if (outA[v] < 0) outA[v] = d; else outB[v] = d; };
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && inside(y * w + x);
    let any = false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!inside(y * w + x)) continue;
            any = true;
            if (!at(x, y - 1)) add(x, y, 0);
            if (!at(x + 1, y)) add(x + 1, y, 1);
            if (!at(x, y + 1)) add(x + 1, y + 1, 2);
            if (!at(x - 1, y)) add(x, y + 1, 3);
        }
    }
    if (!any) return [];
    const DX = [1, 0, -1, 0], DY = [0, V, 0, -V];
    const take = (v, prev) => {
        const a = outA[v], b = outB[v];
        if (a < 0 && b < 0) return -1;
        let d = a >= 0 ? a : b;
        if (a >= 0 && b >= 0 && prev >= 0 && b === ((prev + 1) & 3)) d = b;
        if (d === a && a >= 0) outA[v] = -1; else outB[v] = -1;
        return d;
    };
    const loops = [];
    for (let v0 = 0; v0 < nV; v0++) {
        while (outA[v0] >= 0 || outB[v0] >= 0) {
            const pts = [];
            let v = v0, d = take(v0, -1);
            while (d >= 0) {
                pts.push([v % V, Math.floor(v / V)]);
                v += DX[d] + DY[d];
                if (v === v0) break;
                d = take(v, d);
            }
            if (pts.length >= 4) loops.push(pts);
        }
    }
    return loops;
}

// The loops as one SVG path (units): each grid point nudged by up to jit cells (not the ones on
// the map's edge), then rounded off q times.
function wmLoopPath(loops, w, h, jit, q) {
    const C = WM_CELL;
    let d = '';
    loops.forEach(loop => {
        let pts = loop.map(([x, y]) => {
            if (!jit || x === 0 || y === 0 || x === w || y === h) return [x, y];
            return [x + (wmHash(x, y, 11) - 0.5) * 2 * jit, y + (wmHash(x, y, 23) - 0.5) * 2 * jit];
        });
        for (let k = 0; k < q; k++) {
            const out = [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length];
                out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
            }
            pts = out;
        }
        d += 'M' + pts.map(p => `${wmF(p[0] * C)} ${wmF(p[1] * C)}`).join('L') + 'Z';
    });
    return d;
}

function wmHasLand(m) {
    return m.land.includes(1);
}

// ── Drawing ───────────────────────────────────────────────
function wmMix(a, b, t) {
    const n = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    const x = n(a), y = n(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// The map's colors (or its textures, as url(#…)).
function wmColors(m, uid) {
    const st = WM_COLORS[m.style] || WM_COLORS.art, lk = m.lk, art = m.style === 'art';
    const land = lk.land || (art ? `url(#${uid}-paper)` : st.land);
    return {
        sea: lk.sea || (art ? `url(#${uid}-sea)` : st.sea), land, coast: lk.coast || st.coast,
        shallow: lk.sea ? wmMix(lk.sea, '#ffffff', 0.22) : art ? `url(#${uid}-shallows)` : st.shallow,
        grid: st.grid, frame: land, ink: lk.coast || st.coast
    };
}

// The pictures the map tiles (one set per SVG on the page).
function wmDefs(uid) {
    const tex = (name, file, size) => `<pattern id="${uid}-${name}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><image href="${WM_ART_DIR}${file}.webp" width="${size}" height="${size}"/></pattern>`;
    const T = 18;
    return tex('paper', 'parchment', 220) + tex('sea', 'sea', 240) + tex('shallows', 'shallows', 180)
        + `<pattern id="${uid}-edge" patternUnits="userSpaceOnUse" width="${wmF(T * 16.5)}" height="${T}"><image href="${WM_ART_DIR}ornament/border-edge.webp" width="${wmF(T * 16.5)}" height="${T}" preserveAspectRatio="none"/></pattern>`;
}

// The sea, the shallows, the land and its biomes, the coast, and the grid. q: how many times the
// coast is rounded off (fewer while painting).
function wmBaseSvg(m, uid, q = 2) {
    const C = WM_CELL, W = m.w * C, H = m.h * C, c = wmColors(m, uid), lk = m.lk;
    const jit = lk.ro * 0.06;
    let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="${c.sea}"/>`;
    const land = wmLoopPath(wmLoops(m.w, m.h, i => m.land[i] === 1), m.w, m.h, jit, q);
    if (land) {
        if (lk.sh) {
            s += `<path d="${land}" fill="none" stroke="${c.shallow}" stroke-width="${6 * C}" stroke-linejoin="round" opacity="0.35"/>`
                + `<path d="${land}" fill="none" stroke="${c.shallow}" stroke-width="${3 * C}" stroke-linejoin="round" opacity="0.6"/>`;
        }
        s += `<clipPath id="${uid}-land"><path d="${land}" clip-rule="evenodd"/></clipPath>`
            + `<path d="${land}" fill="${c.land}" fill-rule="evenodd"/>`;
        const used = new Set(m.bio);
        let bio = '';
        WM_BIOMES.forEach(([, , color, op], k) => {
            if (!used.has(k + 1)) return;
            const d = wmLoopPath(wmLoops(m.w, m.h, i => m.bio[i] === k + 1), m.w, m.h, jit, q);
            if (d) bio += `<path d="${d}" fill="${color}" fill-opacity="${op}" fill-rule="evenodd"/>`;
        });
        // Softened at the edges, so one wash runs into the next.
        if (bio) s += `<filter id="${uid}-soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${C * 0.9}"/></filter>`
            + `<g clip-path="url(#${uid}-land)"><g filter="url(#${uid}-soft)">${bio}</g></g>`;
        if (lk.cw) s += `<path d="${land}" fill="none" stroke="${c.coast}" stroke-width="${lk.cw}" stroke-linejoin="round"/>`;
    }
    return s + wmGridSvg(m, c);
}

function wmGridSvg(m, c) {
    const lk = m.lk, W = m.w * WM_CELL, H = m.h * WM_CELL, s = lk.gs;
    if (lk.gr === 'none') return '';
    let d = '';
    if (lk.gr === 'square') {
        for (let x = s; x < W; x += s) d += `M${wmF(x)} 0V${H}`;
        for (let y = s; y < H; y += s) d += `M0 ${wmF(y)}H${W}`;
    } else {
        // Pointy-topped hexes, s across the flats.
        const r = s / Math.sqrt(3);
        for (let j = 0, cy = 0; cy - r < H; j++, cy += r * 1.5) {
            for (let cx = (j % 2) * s / 2; cx - s / 2 < W; cx += s) {
                d += 'M' + [0, 1, 2, 3, 4, 5].map(k => {
                    const a = Math.PI / 6 + k * Math.PI / 3;
                    return `${wmF(cx + r * Math.cos(a))} ${wmF(cy + r * Math.sin(a))}`;
                }).join('L') + 'Z';
            }
        }
    }
    return `<path d="${d}" fill="none" stroke="${c.grid}" stroke-width="1" opacity="${lk.go}"/>`;
}

// A line's path: straight between its points, or a smooth curve through them (Catmull-Rom).
function wmLinePath(l) {
    const p = l.p, n = p.length, f = wmF;
    if (!l.sm || n < 3) return 'M' + p.map(q => `${f(q[0])} ${f(q[1])}`).join('L') + (l.cl ? 'Z' : '');
    const at = i => l.cl ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
    let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 0; i < (l.cl ? n : n - 1); i++) {
        const a = at(i - 1), b = at(i), c = at(i + 1), e = at(i + 2);
        d += `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
    }
    return d + (l.cl ? 'Z' : '');
}

function wmDash(l) {
    const w = l.w, f = wmF;
    return {
        solid: '', dash: `${f(w * 3)} ${f(w * 2)}`, dot: `0.1 ${f(w * 2.2)}`,
        dashdot: `${f(w * 5)} ${f(w * 2)} 0.1 ${f(w * 2)}`, long: `${f(w * 8)} ${f(w * 4)}`
    }[l.d] || '';
}

// One line. edit: with a wide see-through stroke to click it by. land: whether the map has land
// to keep a region to.
function wmLineSvg(l, i, uid, edit = false, land = true) {
    const d = wmLinePath(l), dash = wmDash(l), round = l.d === 'dot' || l.d === 'dashdot';
    let g = '';
    if (l.cl && l.fl) g += `<path d="${d}" fill="${l.fl}" fill-opacity="${l.fo}" stroke="none"/>`;
    if (l.gl) g += `<path d="${d}" fill="none" stroke="${l.c}" stroke-width="${wmF(l.w * 4)}" stroke-opacity="0.22" stroke-linejoin="round" stroke-linecap="round"/>`;
    g += `<path d="${d}" fill="none" stroke="${l.c}" stroke-width="${l.w}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="round" stroke-linecap="${round ? 'round' : 'butt'}"/>`;
    if (edit) g += `<path class="wm-hit" d="${d}" fill="${l.cl && l.fl ? 'transparent' : 'none'}" stroke="transparent" stroke-width="${wmF(Math.max(12, l.w + 10))}"/>`;
    const clip = l.cl && l.lc && land ? ` clip-path="url(#${uid}-land)"` : '';
    return `<g data-wm="ln:${i}"${clip}>${g}</g>`;
}

function wmLinesSvg(m, uid, edit = false) {
    const land = wmHasLand(m);
    return m.ln.map((l, i) => wmLineSvg(l, i, uid, edit, land)).join('');
}

function wmArmsSvg(o, id) {
    return `<g transform="scale(${(o.w / 100).toFixed(3)}) translate(-50 -60)"><mask id="${id}"><rect width="100" height="120" fill="#000"/>`
        + `<image href="${WM_ART_DIR}${WM_ICONS[o.k].file}.webp" x="21" y="18" width="58" height="68" preserveAspectRatio="xMidYMid meet"/></mask>`
        + `<path d="${WM_SHIELD}" fill="${o.fc}"/><rect width="100" height="120" fill="${o.tc}" mask="url(#${id})"/>`
        + `<path d="${WM_SHIELD}" fill="none" stroke="#3a2414" stroke-width="4"/></g>`;
}

// An icon's turn and flip, as an SVG transform.
function wmIconTransform(o) {
    return `translate(${wmF(o.x)} ${wmF(o.y)})${o.r ? ` rotate(${o.r})` : ''}${o.fx ? ' scale(-1 1)' : ''}`;
}

function wmIconSvg(o, i, uid) {
    const it = WM_ICONS[o.k], w = o.w, h = w * it.ar;
    const body = it.arms ? wmArmsSvg(o, `${uid}-a${i}`)
        : `<image href="${WM_ART_DIR}${it.file}${it.n ? '-' + (o.v || 1) : ''}.webp" x="${wmF(-w / 2)}" y="${wmF(-h / 2)}" width="${wmF(w)}" height="${wmF(h)}" preserveAspectRatio="xMidYMid meet"/>`;
    return `<g data-wm="ic:${i}" transform="${wmIconTransform(o)}">${body}</g>`;
}

// Terrain symbols first, the lower ones over the higher (so a range of mountains overlaps
// the right way); then everything else in the order it was put down.
function wmIconOrder(m) {
    const all = m.ic.map((o, i) => i);
    const terr = all.filter(i => WM_ICONS[m.ic[i].k].terrain).sort((a, b) => m.ic[a].y - m.ic[b].y || a - b);
    return terr.concat(all.filter(i => !WM_ICONS[m.ic[i].k].terrain));
}

function wmIconsSvg(m, uid) {
    return wmIconOrder(m).map(i => wmIconSvg(m.ic[i], i, uid)).join('');
}

// A rough width for a line of text (for the curve's length).
function wmTextWidth(o, t) {
    return [...t].length * o.s * (0.62 + o.ls / 100);
}

function wmTextSvg(o, i, uid) {
    const F = WM_FONTS[o.f] || WM_FONTS.cinzel, t = o.u ? o.t.toUpperCase() : o.t;
    const style = `font-family:${F[1]};font-size:${wmF(o.s)}px;font-weight:${o.b ? 700 : 400};font-style:${o.i ? 'italic' : 'normal'};letter-spacing:${(o.ls / 100).toFixed(2)}em`;
    const halo = o.h ? ` stroke="${o.h}" stroke-width="${wmF(o.s * 0.16)}" stroke-linejoin="round" paint-order="stroke"` : '';
    const attrs = `text-anchor="middle" fill="${o.c}"${halo} style="${style.replace(/"/g, "'")}"`;
    const lines = t.split('\n');
    let inner;
    if (o.cv && lines.length === 1) {
        const L = wmTextWidth(o, t) * 0.75 + o.s, sag = o.cv / 100 * L * 0.6, pid = `${uid}-tp${i}`;
        inner = `<path id="${pid}" d="M${wmF(-L)} ${wmF(sag)}Q0 ${wmF(-sag)} ${wmF(L)} ${wmF(sag)}" fill="none"/>`
            + `<text ${attrs} dy="0.35em"><textPath href="#${pid}" startOffset="50%">${wmEsc(t)}</textPath></text>`;
    } else {
        inner = `<text ${attrs}>` + lines.map((s, k) => `<tspan x="0" dy="${k ? '1.2em' : (0.35 - (lines.length - 1) * 0.6).toFixed(2) + 'em'}">${wmEsc(s)}</tspan>`).join('') + '</text>';
    }
    return `<g data-wm="tx:${i}" transform="translate(${wmF(o.x)} ${wmF(o.y)})${o.r ? ` rotate(${o.r})` : ''}">${inner}</g>`;
}

function wmTextsSvg(m, uid) {
    return m.tx.map((o, i) => wmTextSvg(o, i, uid)).join('');
}

// The scale bar: a round number of miles, about a sixth of the map across.
function wmScaleSvg(m, c) {
    const lk = m.lk, W = m.w * WM_CELL, H = m.h * WM_CELL;
    if (!lk.sb || !lk.mi) return '';
    const raw = lk.mi / 6, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const miles = [1, 2, 5, 10].map(k => k * p).reduce((a, b) => Math.abs(b - raw) < Math.abs(a - raw) ? b : a);
    const len = miles / lk.mi * W, inset = lk.fr === 'ornate' ? 30 : lk.fr === 'none' ? 14 : 22;
    const x = inset + 6, y = H - inset - 12, seg = len / 4;
    let bars = '';
    for (let k = 0; k < 4; k++) bars += `<rect x="${wmF(x + k * seg)}" y="${y}" width="${wmF(seg)}" height="6" fill="${k % 2 ? '#f0e6c8' : c.ink}" stroke="${c.ink}" stroke-width="1"/>`;
    const label = `${miles.toLocaleString('en-US')} mile${miles === 1 ? '' : 's'}`;
    return `<g>${bars}<text x="${wmF(x + len / 2)}" y="${y - 5}" text-anchor="middle" fill="${c.ink}" stroke="#f0e6c8" stroke-width="2.5" paint-order="stroke" style="font-family:Georgia, serif;font-size:12px;font-style:italic">${label}</text></g>`;
}

// The frame round the map, and the scale bar.
function wmFrameSvg(m, uid) {
    const lk = m.lk, W = m.w * WM_CELL, H = m.h * WM_CELL, c = wmColors(m, uid);
    let s = '';
    if (lk.fr === 'line') s = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" fill="none" stroke="${c.ink}" stroke-width="3"/>`;
    else if (lk.fr === 'double') {
        s = `<rect x="5" y="5" width="${W - 10}" height="${H - 10}" fill="none" stroke="${c.ink}" stroke-width="4"/>`
            + `<rect x="13" y="13" width="${W - 26}" height="${H - 26}" fill="none" stroke="${c.ink}" stroke-width="1.5"/>`;
    } else if (lk.fr === 'ornate') {
        // A parchment band with the vine strip on it, and a flourish at each corner.
        const T = 18, k = T * 3.4;
        const band = len => `<rect width="${len}" height="${T}" fill="${c.frame}"/><rect width="${len}" height="${T}" fill="url(#${uid}-edge)"/>`;
        const corner = tr => `<image href="${WM_ART_DIR}ornament/border-corner.webp" width="${wmF(k)}" height="${wmF(k)}" preserveAspectRatio="xMidYMid meet" transform="${tr}"/>`;
        s = `<g>${band(W)}<g transform="translate(0 ${H - T})">${band(W)}</g>
            <g transform="translate(${T} 0) rotate(90)">${band(H)}</g><g transform="translate(${W} 0) rotate(90)">${band(H)}</g>
            ${corner('translate(0 0)')}${corner(`translate(${W} 0) scale(-1 1)`)}${corner(`translate(0 ${H}) scale(1 -1)`)}${corner(`translate(${W} ${H}) scale(-1 -1)`)}</g>`;
    }
    return s + wmScaleSvg(m, c);
}

// The whole map. uid: the ids inside it (one per SVG on the page).
function wmSvg(m, opts = {}) {
    const { uid = 'wm', title = m.name } = opts;
    const W = m.w * WM_CELL, H = m.h * WM_CELL;
    return `<svg class="wm-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${wmEsc(title)}" xmlns="http://www.w3.org/2000/svg">`
        + `<defs>${wmDefs(uid)}</defs>${wmBaseSvg(m, uid)}<g>${wmLinesSvg(m, uid)}</g><g>${wmIconsSvg(m, uid)}</g><g>${wmTextsSvg(m, uid)}</g>${wmFrameSvg(m, uid)}</svg>`;
}
