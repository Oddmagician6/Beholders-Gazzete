/* ============================================
   BATTLEMAP ENGINE (F75)
   A battle map drawn by hand on a 5-foot grid, for the Battlemap Builder
   (dnd-battlemap-builder.html, battlemap.js). Page-free: the map, its saved and shared
   form, and its picture as SVG. The pictures and the helpers that place them are the
   Sites tab's own (site-engine.js: SITE_SQUARE, SITE_ART_DIR, SITE_FLOOR_TILE,
   siteArtImg, siteAttr), and bmFromSite turns a rolled site into a map to edit.
   A map: { id, name, w, h (squares, 1-60), style ('art' | 'classic'), t (last saved),
     fl: w × h floor numbers, row by row (0 bare rock, else BM_FLOORS[n - 1]),
     hw: (h + 1) × w walls drawn on grid lines across (hw[y * w + x]: above square x, y),
     vw: h × (w + 1) walls drawn on grid lines down (vw[y * (w + 1) + x]: left of square x, y),
     ob: [{ k (a BM_ITEMS key), x, y (its middle, in squares), w, h (squares), r (degrees) }],
     lb: [{ x, y, t }] labels,
     tk: [] tokens and fog: null, for table play (F76): every map has them, nothing fills
       or draws them yet, and bmClean resets them until F76 gives them a shape. }
   Walls are also drawn wherever floor meets bare rock.
   Saved under BM_KEY as { cur, maps: [bmPack(map)] } and shared as one share code
   (rng.js packShareCode) of bmPack(map). bmClean reads either back, trimming what's out
   of shape. bmClean needs nothing else; drawing needs site-engine.js, and bmFromSite
   needs a page with a canvas (cave rooms are found with isPointInPath).
   ============================================ */

const BM_KEY = 'gazette-battlemaps';
const BM_LIMITS = { side: 60, maps: 30, objs: 800, labels: 300, name: 60, label: 24, code: 200000, bytes: 2000000 };
const BM_STYLES = { art: '🎨 Illustrated', classic: '✒️ Classic ink' };
// Floor numbers in fl are these plus one (img/map/floor).
// New floors go on the end: saved maps keep their numbers.
const BM_FLOORS = ['flagstones', 'planks', 'dirt', 'cave', 'mossy-cave', 'marble', 'temple-tiles', 'bone', 'water',
    'carpet', 'grass', 'sand', 'ice', 'lava'];
const BM_FLOOR_NAMES = {
    flagstones: 'Flagstones', planks: 'Planks', dirt: 'Dirt', cave: 'Cave rock', 'mossy-cave': 'Mossy cave',
    marble: 'Marble', 'temple-tiles': 'Temple tiles', bone: 'Bones', water: 'Water',
    carpet: 'Carpet', grass: 'Overgrown', sand: 'Sand', ice: 'Ice', lava: 'Lava'
};
// Everything that stands on the map. Doors and stairs (img/map/door): edge doors sit on a grid
// line between two squares, and their pictures run past the square (pw, ph) as the Sites
// tab draws them. Furniture (img/map/prop): w × h is its size in squares when placed.
const BM_ITEMS = {
    wood: { label: 'Wooden door', file: 'door/wooden-door', door: true, edge: true, pw: 1.2, ph: 1.2 },
    iron: { label: 'Iron door (locked)', file: 'door/iron-door', door: true, edge: true, pw: 1.2, ph: 1.2 },
    barred: { label: 'Barred door', file: 'door/barred-door', door: true, edge: true, pw: 1.2, ph: 1.2 },
    seal: { label: 'Magic seal', file: 'door/magic-seal', door: true, edge: true, pw: 1.2, ph: 1.2 },
    portcullis: { label: 'Portcullis', file: 'door/portcullis', door: true, edge: true, pw: 1.4, ph: 1 },
    secret: { label: 'Secret door', file: null, door: true, edge: true },
    stairs: { label: 'Stairs', file: 'door/stairs', door: true },
    spiral: { label: 'Spiral stairs', file: 'door/spiral-stairs', door: true },
    trapdoor: { label: 'Trapdoor', file: 'door/trapdoor', door: true }
};
// Furniture in the builder's groups: [key, label, w, h] (1 × 1 when left out).
const BM_PROP_GROUPS = [
    ['🍺 Tavern and home', [['chair', 'Chair'], ['stool', 'Stool'], ['bench', 'Bench', 2, 1], ['table', 'Table', 2, 1],
        ['round-table', 'Round table', 2, 2], ['bar-counter', 'Bar counter', 3, 1], ['fireplace', 'Fireplace', 2, 1], ['stove', 'Stove'],
        ['kitchen-counter', 'Kitchen counter', 2, 1], ['wardrobe', 'Wardrobe', 2, 1], ['bed', 'Bed', 1, 2], ['bathtub', 'Bathtub', 2, 1],
        ['candelabra', 'Candelabra'], ['piano', 'Harpsichord', 2, 2], ['rug', 'Rug', 2, 3], ['mirror', 'Mirror'], ['tapestry', 'Tapestry', 2, 1],
        ['chest', 'Chest'], ['throne', 'Throne']]],
    ['📦 Stores and smithy', [['barrels', 'Barrels'], ['crates', 'Crates'], ['sacks', 'Sacks'], ['hay', 'Hay'], ['forge', 'Forge', 2, 2],
        ['anvil', 'Anvil'], ['weapon-rack', 'Weapon rack', 2, 1], ['mine-cart', 'Mine cart', 1, 2]]],
    ['💀 Dungeon and lair', [['bone-pile', 'Bone pile'], ['skeleton', 'Skeleton'], ['dead-adventurer', 'Dead adventurer', 2, 1],
        ['carcass', 'Carcass', 2, 1], ['slime', 'Slime'], ['blood-pool', 'Blood pool'], ['cage', 'Cage'], ['shackles', 'Shackles'],
        ['prison-cell', 'Prison cell', 2, 2], ['torture-rack', 'Torture rack', 1, 2], ['stocks', 'Stocks'], ['gallows', 'Gallows', 2, 2],
        ['pit-trap', 'Pit trap'], ['spike-trap', 'Spike trap'], ['lever', 'Lever'], ['rubble', 'Rubble'], ['broken-pillar', 'Broken pillar', 2, 1],
        ['ladder', 'Ladder', 2, 1], ['spider-web', 'Spider web'], ['stalagmites', 'Stalagmites'], ['crystal', 'Crystals'],
        ['mushrooms', 'Mushrooms'], ['egg-nest', 'Egg nest', 2, 2], ['coin-pile', 'Coin pile'], ['treasure-hoard', 'Treasure hoard']]],
    ['🔮 Wizard', [['alchemy-table', 'Alchemy table', 2, 1], ['bookshelf', 'Bookshelf', 2, 1], ['desk', 'Desk', 2, 1], ['cauldron', 'Cauldron'],
        ['magic-circle', 'Magic circle', 3, 3], ['telescope', 'Telescope'], ['globe', 'Globe'], ['scroll-pile', 'Scroll pile'],
        ['specimen-shelf', 'Specimen shelf', 2, 1]]],
    ['🕯️ Temple', [['altar', 'Altar', 2, 1], ['idol', 'Idol'], ['statue', 'Statue'], ['pillar', 'Pillar'], ['brazier', 'Brazier'],
        ['fountain', 'Fountain', 2, 2], ['pews', 'Pew', 2, 1], ['font', 'Font'], ['candles', 'Candles'], ['gong', 'Gong']]],
    ['⚰️ Crypt and barrow', [['coffin', 'Coffin', 1, 2], ['sarcophagus', 'Sarcophagus', 1, 2], ['urns', 'Urns'], ['headstone', 'Headstone'],
        ['open-grave', 'Open grave', 2, 1], ['burial-niche', 'Burial niche', 2, 1]]],
    ['⚓ Ship and water', [['ship-wheel', "Ship's wheel"], ['rowboat', 'Rowboat', 2, 1], ['cannon', 'Cannon', 2, 1], ['anchor', 'Anchor'],
        ['nets', 'Nets'], ['mast', 'Broken mast', 3, 1]]],
    ['🌲 Outdoors and camp', [['tree', 'Tree', 2, 2], ['bush', 'Bush'], ['boulder', 'Boulder'], ['fallen-log', 'Fallen log', 2, 1],
        ['tent', 'Tent', 2, 2], ['campfire', 'Campfire'], ['bedrolls', 'Bedrolls'], ['well', 'Well']]]
];
BM_PROP_GROUPS.forEach(([, items]) => items.forEach(([k, label, w = 1, h = 1]) => { BM_ITEMS[k] = { label, file: 'prop/' + k, w, h }; }));

function bmId() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 16);
}

function bmBlank(w = 30, h = 20, name = 'New battlemap', style = 'art') {
    return {
        id: bmId(), name, w, h, style, t: Date.now(),
        fl: new Array(w * h).fill(0), hw: new Array((h + 1) * w).fill(0), vw: new Array(h * (w + 1)).fill(0),
        ob: [], lb: [], tk: [], fog: null
    };
}

function bmCopy(m) {
    return { ...m, fl: m.fl.slice(), hw: m.hw.slice(), vw: m.vw.slice(), ob: m.ob.map(o => ({ ...o })), lb: m.lb.map(l => ({ ...l })), tk: m.tk.slice() };
}

// ── The saved and shared form ─────────────────────────────
// A run of numbers as letters with counts: [0, 0, 0, 2] → "a3c" (a = 0, b = 1, …).
function bmRle(arr) {
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
function bmUnRle(s, n, max) {
    if (typeof s !== 'string' || s.length > n * 8 + 8) return null;
    const out = [];
    const re = /([a-z])(\d*)/gy;
    let m;
    while ((m = re.exec(s))) {
        const v = m[1].charCodeAt(0) - 97, c = m[2] ? parseInt(m[2], 10) : 1;
        if (v > max || c < 1 || out.length + c > n) return null;
        for (let k = 0; k < c; k++) out.push(v);
        if (re.lastIndex === s.length) break;
    }
    return out.length === n ? out : null;
}

const bmR2 = v => Math.round(v * 100) / 100;

function bmPack(m) {
    const p = {
        v: 1, id: m.id, n: m.name, w: m.w, h: m.h, s: m.style, t: m.t,
        f: bmRle(m.fl), e: bmRle(m.hw.concat(m.vw)),
        o: m.ob.map(o => [o.k, bmR2(o.x), bmR2(o.y), bmR2(o.w), bmR2(o.h), Math.round(o.r) % 360]),
        l: m.lb.map(l => [bmR2(l.x), bmR2(l.y), l.t])
    };
    if (m.tk.length) p.tk = m.tk;
    if (m.fog !== null) p.fog = m.fog;
    return p;
}

// A packed map back into a map, or null when it isn't one. Text is trimmed but kept as typed
// (the page escapes it).
function bmClean(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const side = v => Number.isInteger(v) && v >= 1 && v <= BM_LIMITS.side ? v : 0;
    const w = side(p.w), h = side(p.h);
    if (!w || !h) return null;
    const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
    const text = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
    const fl = bmUnRle(p.f, w * h, BM_FLOORS.length) || new Array(w * h).fill(0);
    const nh = (h + 1) * w, nv = h * (w + 1);
    const e = bmUnRle(p.e, nh + nv, 1) || new Array(nh + nv).fill(0);
    const ob = (Array.isArray(p.o) ? p.o : []).slice(0, BM_LIMITS.objs).map(o => {
        if (!Array.isArray(o) || typeof o[0] !== 'string' || !Object.prototype.hasOwnProperty.call(BM_ITEMS, o[0])) return null;
        const x = num(o[1], -2, w + 2), y = num(o[2], -2, h + 2), ow = num(o[3], 0.25, 20), oh = num(o[4], 0.25, 20), r = num(o[5], -360, 360);
        if ([x, y, ow, oh, r].includes(null)) return null;
        return { k: o[0], x, y, w: ow, h: oh, r: ((Math.round(r) % 360) + 360) % 360 };
    }).filter(Boolean);
    const lb = (Array.isArray(p.l) ? p.l : []).slice(0, BM_LIMITS.labels).map(l => {
        if (!Array.isArray(l)) return null;
        const x = num(l[0], 0, w), y = num(l[1], 0, h), t = text(l[2], BM_LIMITS.label);
        return x === null || y === null || !t ? null : { x, y, t };
    }).filter(Boolean);
    return {
        id: typeof p.id === 'string' && /^[a-z0-9]{1,16}$/.test(p.id) ? p.id : bmId(),
        name: text(p.n, BM_LIMITS.name) || 'Untitled battlemap', w, h,
        style: BM_STYLES[p.s] ? p.s : 'art',
        t: num(p.t, 0, 1e15) || 0,
        fl, hw: e.slice(0, nh), vw: e.slice(nh), ob, lb, tk: [], fog: null
    };
}

// ── Saving ────────────────────────────────────────────────
function bmLoadStore() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(BM_KEY) || 'null'); } catch (e) {}
    return bmCleanStore(raw);
}

// A saved store as the page keeps it (backup.js cleans an imported one with this too).
function bmCleanStore(raw) {
    const maps = raw && Array.isArray(raw.maps) ? raw.maps.slice(0, BM_LIMITS.maps).map(bmClean).filter(Boolean) : [];
    const seen = new Set();
    maps.forEach(m => { if (seen.has(m.id)) m.id = bmId(); seen.add(m.id); });
    const cur = raw && maps.some(m => m.id === raw.cur) ? raw.cur : (maps[0] ? maps[0].id : null);
    return { cur, maps };
}

// False when the browser wouldn't keep it (storage full or turned off).
function bmSaveStore(store) {
    try {
        localStorage.setItem(BM_KEY, JSON.stringify({ v: 1, cur: store.cur, maps: store.maps.map(bmPack) }));
        return true;
    } catch (e) {
        return false;
    }
}

// ── Editing ───────────────────────────────────────────────
function bmIn(m, x, y) {
    return x >= 0 && y >= 0 && x < m.w && y < m.h;
}

function bmFloorAt(m, x, y) {
    return bmIn(m, x, y) ? m.fl[y * m.w + x] : 0;
}

// The map at a new size, cut or grown at the right and bottom. Things left off it go.
function bmResize(m, w, h) {
    const n = { ...bmBlank(w, h, m.name, m.style), id: m.id, t: m.t, tk: m.tk.slice(), fog: m.fog };
    for (let y = 0; y < Math.min(h, m.h); y++) {
        for (let x = 0; x < Math.min(w, m.w); x++) n.fl[y * w + x] = m.fl[y * m.w + x];
    }
    for (let y = 0; y <= Math.min(h, m.h); y++) {
        for (let x = 0; x < Math.min(w, m.w); x++) n.hw[y * w + x] = m.hw[y * m.w + x];
    }
    for (let y = 0; y < Math.min(h, m.h); y++) {
        for (let x = 0; x <= Math.min(w, m.w); x++) n.vw[y * (w + 1) + x] = m.vw[y * (m.w + 1) + x];
    }
    n.ob = m.ob.filter(o => o.x >= 0 && o.y >= 0 && o.x <= w && o.y <= h).map(o => ({ ...o }));
    n.lb = m.lb.filter(l => l.x <= w && l.y <= h).map(l => ({ ...l }));
    return n;
}

// Fill the squares joined to x, y that have its floor with floor v. Drawn walls stop it.
// Returns how many squares changed.
function bmFill(m, x, y, v) {
    if (!bmIn(m, x, y)) return 0;
    const from = m.fl[y * m.w + x];
    if (from === v) return 0;
    const stack = [[x, y]];
    let n = 0;
    while (stack.length) {
        const [cx, cy] = stack.pop();
        const i = cy * m.w + cx;
        if (m.fl[i] !== from) continue;
        m.fl[i] = v;
        n++;
        if (cx > 0 && !m.vw[cy * (m.w + 1) + cx]) stack.push([cx - 1, cy]);
        if (cx < m.w - 1 && !m.vw[cy * (m.w + 1) + cx + 1]) stack.push([cx + 1, cy]);
        if (cy > 0 && !m.hw[cy * m.w + cx]) stack.push([cx, cy - 1]);
        if (cy < m.h - 1 && !m.hw[(cy + 1) * m.w + cx]) stack.push([cx, cy + 1]);
    }
    return n;
}

// An object's size as it lies, turned (for snapping it to the grid).
function bmLaidSize(o) {
    const turned = Math.round(o.r / 90) % 2 === 1 && o.r % 90 === 0;
    return turned ? [o.h, o.w] : [o.w, o.h];
}

// Where an object goes when it snaps: an edge door's middle on the nearest grid line between
// two squares (turned to lie along it); anything else with its sides on grid lines.
function bmSnap(o, x, y) {
    const it = BM_ITEMS[o.k];
    if (it.edge) {
        const fx = x - Math.floor(x), fy = y - Math.floor(y);
        // The nearer of the square's sides: across (top or bottom) or down (left or right).
        const across = Math.min(fy, 1 - fy) < Math.min(fx, 1 - fx);
        return across ? { x: Math.floor(x) + 0.5, y: Math.round(y), r: 0 } : { x: Math.round(x), y: Math.floor(y) + 0.5, r: 90 };
    }
    const [w, h] = bmLaidSize(o);
    const to = (v, s) => Math.round(s) % 2 ? Math.floor(v) + 0.5 : Math.round(v);
    return { x: to(x, w), y: to(y, h), r: o.r };
}

// Is the point x, y (squares) on the object, turned as it is?
function bmHit(o, x, y) {
    const a = -o.r * Math.PI / 180, dx = x - o.x, dy = y - o.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    const it = BM_ITEMS[o.k];
    const hw = Math.max(o.w * (it.pw || 1), 0.5) / 2, hh = Math.max(o.h * (it.ph || 1), 0.5) / 2;
    return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

// ── Drawing ───────────────────────────────────────────────
const bmF1 = v => String(Math.round(v * 10) / 10);

// The floor pictures as patterns (one floor tile covers 4 × 4 squares, as on the Sites tab).
function bmDefs(uid, floors = BM_FLOORS) {
    const T = SITE_FLOOR_TILE;
    return floors.map(name => `<pattern id="${uid}-fl-${name}" patternUnits="userSpaceOnUse" width="${T}" height="${T}"><image href="${SITE_ART_DIR}floor/${name}.webp" width="${T}" height="${T}"/></pattern>`).join('');
}

function bmFloorsUsed(m) {
    const used = new Set(m.fl);
    return BM_FLOORS.filter((_, k) => used.has(k + 1));
}

// Each floor as one path of row runs.
function bmFloorSvg(m, art, uid) {
    const S = SITE_SQUARE, d = {};
    for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w;) {
            const v = m.fl[y * m.w + x];
            let e = x + 1;
            while (e < m.w && m.fl[y * m.w + e] === v) e++;
            if (v) d[v] = (d[v] || '') + `M${x * S} ${y * S}h${(e - x) * S}v${S}h${(x - e) * S}z`;
            x = e;
        }
    }
    return Object.entries(d).map(([v, path]) => {
        const name = BM_FLOORS[v - 1];
        return art ? `<path class="bm-afloor" style="fill:url(#${uid}-fl-${name})" d="${path}"/>` : `<path class="bm-floor bm-fl-${name}" d="${path}"/>`;
    }).join('');
}

// Every wall as one path: the drawn ones, and wherever floor meets bare rock.
function bmWallPath(m) {
    const S = SITE_SQUARE, on = (x, y) => bmFloorAt(m, x, y) > 0;
    let d = '';
    for (let y = 0; y <= m.h; y++) {
        let run = -1;
        for (let x = 0; x <= m.w; x++) {
            const wall = x < m.w && (m.hw[y * m.w + x] || on(x, y - 1) !== on(x, y));
            if (wall && run < 0) run = x;
            if (!wall && run >= 0) { d += `M${run * S} ${y * S}H${x * S}`; run = -1; }
        }
    }
    for (let x = 0; x <= m.w; x++) {
        let run = -1;
        for (let y = 0; y <= m.h; y++) {
            const wall = y < m.h && (m.vw[y * (m.w + 1) + x] || on(x - 1, y) !== on(x, y));
            if (wall && run < 0) run = y;
            if (!wall && run >= 0) { d += `M${x * S} ${run * S}V${y * S}`; run = -1; }
        }
    }
    return d;
}

function bmWallSvg(m) {
    const d = bmWallPath(m);
    return d ? `<path class="bm-wall" d="${d}"/>` : '';
}

// One object, drawn lying along x before it's turned. Classic ink draws the doors and stairs
// as the Sites tab's classic map does; furniture keeps its picture in both styles.
function bmObjSvg(o, art, secret = true) {
    const it = BM_ITEMS[o.k], S = SITE_SQUARE;
    const w = o.w * S, h = o.h * S;
    const at = `translate(${bmF1(o.x * S)} ${bmF1(o.y * S)})`;
    if (o.k === 'secret') return secret ? `<text class="bm-s" x="${bmF1(o.x * S)}" y="${bmF1(o.y * S)}" style="font-size:${bmF1(13 * Math.min(o.w, o.h))}px">S</text>` : '';
    let body;
    if (art || !it.door) {
        body = siteArtImg(it.file, 0, 0, w * (it.pw || 1), h * (it.ph || 1));
    } else if (['wood', 'iron', 'barred', 'seal'].includes(o.k)) {
        body = `<rect class="bm-door" x="${bmF1(-w * 0.6)}" y="${bmF1(-h * 0.3)}" width="${bmF1(w * 1.2)}" height="${bmF1(h * 0.6)}"/>`
            + (o.k === 'iron' || o.k === 'seal' ? `<circle class="bm-lock" cx="0" cy="0" r="${bmF1(Math.min(w, h) * 0.18)}"/>` : '')
            + (o.k === 'barred' ? `<rect class="bm-lock" x="${bmF1(-w * 0.55)}" y="${bmF1(-h * 0.07)}" width="${bmF1(w * 1.1)}" height="${bmF1(h * 0.14)}"/>` : '');
    } else if (o.k === 'portcullis') {
        body = `<line class="bm-port" x1="${bmF1(-w * 0.7)}" y1="0" x2="${bmF1(w * 0.7)}" y2="0"/>`;
    } else if (o.k === 'stairs') {
        body = '';
        for (let k = 0; k < 5; k++) {
            const y = -h * 0.4 + k * h * 0.2;
            body += `<line class="bm-stair" x1="${bmF1(-w * 0.4)}" y1="${bmF1(y)}" x2="${bmF1(w * 0.4)}" y2="${bmF1(y)}"/>`;
        }
    } else if (o.k === 'spiral') {
        const r = Math.min(w, h) * 0.42;
        body = `<circle class="bm-stair" cx="0" cy="0" r="${bmF1(r)}"/>`;
        for (let k = 0; k < 6; k++) {
            const a = k * Math.PI / 3;
            body += `<line class="bm-stair" x1="0" y1="0" x2="${bmF1(Math.cos(a) * r)}" y2="${bmF1(Math.sin(a) * r)}"/>`;
        }
    } else {
        body = `<rect class="bm-trap" x="${bmF1(-w * 0.4)}" y="${bmF1(-h * 0.4)}" width="${bmF1(w * 0.8)}" height="${bmF1(h * 0.8)}"/>`
            + `<path class="bm-stair" d="M${bmF1(-w * 0.4)} ${bmF1(-h * 0.4)}L${bmF1(w * 0.4)} ${bmF1(h * 0.4)}M${bmF1(w * 0.4)} ${bmF1(-h * 0.4)}L${bmF1(-w * 0.4)} ${bmF1(h * 0.4)}"/>`;
    }
    return `<g class="${it.door ? 'bm-dobj' : 'bm-prop'}" transform="${at}${o.r ? ` rotate(${o.r})` : ''}">${body}</g>`;
}

function bmPropSvg(m, art) {
    return m.ob.filter(o => !BM_ITEMS[o.k].door).map(o => bmObjSvg(o, art)).join('');
}

function bmDoorSvg(m, art, secret = true) {
    return m.ob.filter(o => BM_ITEMS[o.k].door).map(o => bmObjSvg(o, art, secret)).join('');
}

function bmGridSvg(m, view = null) {
    const S = SITE_SQUARE, v = view || { x: 0, y: 0, w: m.w, h: m.h };
    let d = '';
    for (let x = v.x + 1; x < v.x + v.w; x++) d += `M${x * S} ${v.y * S}V${(v.y + v.h) * S}`;
    for (let y = v.y + 1; y < v.y + v.h; y++) d += `M${v.x * S} ${y * S}H${(v.x + v.w) * S}`;
    return d ? `<path class="bm-grid" d="${d}"/>` : '';
}

function bmLabelSvg(l) {
    const S = SITE_SQUARE, x = bmF1(l.x * S), y = bmF1(l.y * S);
    const n = [...l.t].length;
    const bg = n <= 2
        ? `<circle class="bm-lab-bg" cx="${x}" cy="${y}" r="5.5"/>`
        : `<rect class="bm-lab-bg" x="${bmF1(l.x * S - (n * 4.2 + 5) / 2)}" y="${bmF1(l.y * S - 5.5)}" width="${bmF1(n * 4.2 + 5)}" height="11" rx="5.5"/>`;
    return `<g class="bm-label">${bg}<text class="bm-lab" x="${x}" y="${y}">${siteAttr(l.t)}</text></g>`;
}

function bmLabelsSvg(m) {
    return m.lb.map(bmLabelSvg).join('');
}

// Table play (F76) draws these. Until then they are empty layers above the map.
function bmTokenSvg(m) {
    return '';
}

function bmFogSvg(m) {
    return '';
}

// The whole map. opts: style (the map's own unless given), grid, labels, secret (false leaves
// the secret doors out, for the players' copy), view ({ x, y, w, h } in squares: just that
// part, for printing a page at a time), uid (pattern ids: one per SVG on the page).
function bmSvg(m, opts = {}) {
    const { style = m.style, grid = true, labels = true, secret = true, view = null, uid = 'bm', title = m.name } = opts;
    const S = SITE_SQUARE, art = style === 'art', v = view || { x: 0, y: 0, w: m.w, h: m.h };
    return `<svg class="bm-map bm-${art ? 'art' : 'classic'}" viewBox="${v.x * S} ${v.y * S} ${v.w * S} ${v.h * S}" role="img" aria-label="${siteAttr(title)}" xmlns="http://www.w3.org/2000/svg">
        <defs>${art ? bmDefs(uid, bmFloorsUsed(m)) : ''}</defs>
        <rect class="bm-bg" x="${v.x * S}" y="${v.y * S}" width="${v.w * S}" height="${v.h * S}"/>
        ${bmFloorSvg(m, art, uid)}${bmPropSvg(m, art)}${bmWallSvg(m)}${bmDoorSvg(m, art, secret)}${grid ? bmGridSvg(m, v) : ''}${labels ? bmLabelsSvg(m) : ''}
        <g class="bm-tokens">${bmTokenSvg(m)}</g><g class="bm-fog">${bmFogSvg(m)}</g>
    </svg>`;
}

// ── From a rolled site (the Sites tab's ✏️ Edit in the Battlemap Builder) ──
// The site's battle map as siteMapSvg draws it with snap on, square by square: each room's
// floor, its corridors, its doors and furniture where they stand, and its room numbers.
function bmFromSite(s, style = 'art') {
    const S = SITE_SQUARE, KA = SITE_ART_KINDS[s.kind];
    const cells = s.map.cells.map(c => ({ ...c, w: siteSnapSize(c.w), h: siteSnapSize(c.h) }));
    const center = c => siteCenter(c, true);
    const cols = Math.max(...cells.map(c => c.x)) + 1, rows = Math.max(...cells.map(c => c.y)) + 1;
    const W = Math.ceil((cols * SITE_CELL.w + SITE_CELL.pad * 2) / S), H = Math.ceil((rows * SITE_CELL.h + SITE_CELL.pad * 2) / S);
    const fl = new Array(W * H).fill(0);
    const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) fl[y * W + x] = v; };
    const fn = name => BM_FLOORS.indexOf(name) + 1;
    const ob = [], lb = [];

    s.map.edges.forEach((e, k) => {
        const pa = center(cells[e.a]), pb = center(cells[e.b]);
        const x0 = Math.floor(Math.min(pa.x, pb.x) / S), x1 = Math.floor(Math.max(pa.x, pb.x) / S);
        const y0 = Math.floor(Math.min(pa.y, pb.y) / S), y1 = Math.floor(Math.max(pa.y, pb.y) / S);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, fn(KA.floor));
        // The door, halfway between the two walls (as siteMapSvg puts it), on the nearest grid line.
        const A = cells[e.a], B = cells[e.b], dx = Math.sign(B.x - A.x), dy = Math.sign(B.y - A.y);
        const ra = siteReach(A, siteRoomShape(s, e.a), dx), rb = siteReach(B, siteRoomShape(s, e.b), dx);
        const gap = (dx ? Math.abs(pb.x - pa.x) : Math.abs(pb.y - pa.y)) - ra - rb;
        const x = (pa.x + dx * (ra + gap / 2)) / S, y = (pa.y + dy * (ra + gap / 2)) / S;
        const kind = s.doors[k];
        const locked = KA.locked === 'barred-door' ? 'barred' : KA.locked === 'magic-seal' ? 'seal' : 'iron';
        const k2 = kind === 'locked' ? locked : kind === 'portcullis' ? 'portcullis' : kind === 'secret' ? 'secret'
            : kind === 'stairs' ? 'spiral' : (kind === 'door' || kind === 'stuck') ? (KA.door === 'iron-door' ? 'iron' : 'wood') : null;
        if (!k2) return;
        if (k2 === 'spiral') ob.push({ k: k2, x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, w: 1, h: 1, r: 0 });
        else if (dx) ob.push({ k: k2, x: Math.round(x), y, w: 1, h: 1, r: 90 });
        else ob.push({ k: k2, x, y: Math.round(y), w: 1, h: 1, r: 0 });
    });

    const ctx = document.createElement('canvas').getContext('2d');
    cells.forEach((c, i) => {
        const p = center(c), shape = siteRoomShape(s, i), v = fn(siteArtFloor(s, i));
        const r = Math.min(c.w, c.h) / 2;
        const cave = shape === 'cave' ? new Path2D(siteCavePath(s, i, p.x, p.y, c.w / 2, c.h / 2)) : null;
        const inside = (px, py) => shape === 'circle' ? Math.hypot(px - p.x, py - p.y) < r
            : cave ? ctx.isPointInPath(cave, px, py) : Math.abs(px - p.x) < c.w / 2 && Math.abs(py - p.y) < c.h / 2;
        for (let y = Math.floor((p.y - c.h / 2) / S); y <= Math.floor((p.y + c.h / 2) / S); y++) {
            for (let x = Math.floor((p.x - c.w / 2) / S); x <= Math.floor((p.x + c.w / 2) / S); x++) {
                if (inside(x * S + S / 2, y * S + S / 2)) put(x, y, v);
            }
        }
        const drawn = shape === 'circle' ? { ...c, w: r * 2, h: r * 2 } : c;
        siteArtProps(s, i, drawn, p, shape !== 'rect').forEach(q => {
            if (BM_ITEMS[q.file]) ob.push({ k: q.file, x: q.x / S, y: q.y / S, w: q.w / S, h: q.h / S, r: 0 });
        });
        lb.push({ x: p.x / S, y: p.y / S, t: String(i + 1) });
    });

    // Trim the bare rock to one square around the floor.
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (fl[y * W + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
    const w = Math.min(BM_LIMITS.side, Math.min(W, x1 + 2) - x0), h = Math.min(BM_LIMITS.side, Math.min(H, y1 + 2) - y0);
    const m = bmBlank(w, h, String(s.name).slice(0, BM_LIMITS.name), BM_STYLES[style] ? style : 'art');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m.fl[y * w + x] = fl[(y + y0) * W + x + x0];
    m.ob = ob.map(o => ({ ...o, x: o.x - x0, y: o.y - y0 })).filter(o => o.x >= 0 && o.y >= 0 && o.x <= w && o.y <= h);
    m.lb = lb.map(l => ({ ...l, x: l.x - x0, y: l.y - y0 })).filter(l => l.x >= 0 && l.y >= 0 && l.x <= w && l.y <= h);
    return m;
}
