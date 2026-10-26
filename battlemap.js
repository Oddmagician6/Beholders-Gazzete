/* ============================================
   BATTLEMAP BUILDER (F75): dnd-battlemap-builder.html
   Draw a battle map by hand on a 5-foot grid: paint floors (brush, rectangle, or fill),
   draw walls on the grid lines, place doors, stairs, and furniture (snapped to the grid,
   or anywhere and at any angle with Alt held), number the rooms, erase, undo and redo,
   and measure with a ruler. The map itself is battlemap-engine.js; its pictures are the
   Sites tab's (site-engine.js).
   Saves: every map in this browser under BM_KEY (battlemap-engine.js), up to 30, kept as
   you draw; another tab's changes show up here (the storage event).
   Links: #m=<share code> (older links: ?m=) opens a shared map (or a site sent by the Sites tab's ✏️ Edit
   in the Battlemap Builder) as a new saved map, then drops the code from the address.
   Out: a PNG at 70, 100, or 140 pixels a square (map-export.js), and print at
   1 inch = 5 feet, page by page, or scaled to one page.
   Needs rng.js, site-engine.js, map-export.js, and battlemap-engine.js.
   ============================================ */

const BB = {
    store: { cur: null, maps: [] },
    m: null,
    tool: 'floor',
    floor: 1, floorMode: 'brush', brush: 1,
    door: 'wood', item: 'chest', turn: 0,
    label: '1', count: true,
    erase: 'all', eraseSize: 1,
    rule: '5e',
    sel: null,          // { type: 'ob' | 'lb', i }
    zoom: 32,           // screen pixels per square
    undo: [], redo: [],
    drag: null, hover: null, ruler: null,
    space: false, saveTimer: 0, dirty: false
};
const BB_UNDO_MAX = 80;
const BB_ZOOM = { min: 6, max: 96 };
// The PNG and print looks, on top of the page's own .bm- rules (as the Sites tab's are). Each
// rule goes under .bm-map (bbScopeCss), so it beats the on-screen .bm-classic ones.
// art: the illustrated map, whatever the map's style.
const BB_LOOKS = {
    art: `.bm-grid { stroke: rgba(0,0,0,0.4); stroke-width: 0.6; }`,
    parchment: `.bm-bg { fill: #3a342b; }
        .bm-floor { fill: #eadfc3; }
        .bm-fl-water { fill: #bcd3d6; }
        .bm-wall { stroke: #15120d; }
        .bm-door { fill: #9a6a35; stroke: #15120d; }
        .bm-lock { fill: #f3e9cc; }
        .bm-s { fill: #8a1f1a; }
        .bm-port, .bm-stair { stroke: #15120d; }
        .bm-trap { fill: #c9b98f; stroke: #15120d; }
        .bm-lab-bg { fill: #fffaf0; stroke: #15120d; }
        .bm-lab { fill: #15120d; }
        .bm-grid { stroke: rgba(30,24,16,0.3); stroke-width: 0.6; }`,
    dark: `.bm-bg { fill: #1b1813; }
        .bm-grid { stroke: rgba(240,230,200,0.16); stroke-width: 0.6; }`,
    ink: `.bm-bg { fill: #fff; }
        .bm-floor, .bm-fl-water { fill: #fff; }
        .bm-wall { stroke: #000; }
        .bm-door, .bm-trap { fill: #fff; stroke: #000; }
        .bm-lock, .bm-s, .bm-lab { fill: #000; }
        .bm-port, .bm-stair { stroke: #000; }
        .bm-lab-bg { fill: #fff; stroke: #000; }
        .bm-prop image { filter: grayscale(1); }
        .bm-grid { stroke: rgba(0,0,0,0.25); stroke-width: 0.6; }`
};
// A printed page holds this many 1-inch squares (letter or A4, half-inch margins, room for the caption).
const BB_PAGE = { across: 7, down: 9 };
const BB_TOOLS = {
    floor: { key: 'b', label: '🖌️ Floor' }, wall: { key: 'w', label: '🧱 Walls' }, door: { key: 'd', label: '🚪 Doors' },
    prop: { key: 'p', label: '🪑 Furniture' }, label: { key: 'l', label: '🔢 Labels' }, select: { key: 'v', label: '👆 Select' },
    erase: { key: 'e', label: '🧽 Erase' }, ruler: { key: 'm', label: '📏 Ruler' }, pan: { key: 'h', label: '✋ Pan' }
};
const BB_RULES = { '5e': 'Every square 5 ft (the 5e rule)', '5105': 'Diagonals 5, 10, 5… (variant)', line: 'Straight line' };

const $ = id => document.getElementById(id);

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let bbFlashTimer = 0;
function bbFlash(msg, keep = false) {
    const el = $('bb-status');
    el.textContent = msg;
    clearTimeout(bbFlashTimer);
    if (!keep) bbFlashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

// ── Saving and undo ───────────────────────────────────────
// False (after a warning) when the browser wouldn't keep it.
function bbSaveNow() {
    clearTimeout(BB.saveTimer);
    BB.dirty = false;
    BB.store.cur = BB.m.id;
    if (bmSaveStore(BB.store)) return true;
    bbFlash('⚠️ This browser would not save the map (storage full or turned off). Copy a link to keep it.', true);
    return false;
}

function bbSave() {
    BB.m.t = Date.now();
    BB.dirty = true;
    clearTimeout(BB.saveTimer);
    BB.saveTimer = setTimeout(bbSaveNow, 400);
}

// Call before a change.
function bbMark() {
    BB.undo.push(bmCopy(BB.m));
    if (BB.undo.length > BB_UNDO_MAX) BB.undo.shift();
    BB.redo = [];
    bbUndoButtons();
}

function bbSwap(from, to) {
    if (!from.length) return;
    to.push(bmCopy(BB.m));
    const was = BB.m;
    BB.m = from.pop();
    BB.store.maps[BB.store.maps.indexOf(was)] = BB.m;
    BB.sel = null;
    bbSave();
    if (was.w !== BB.m.w || was.h !== BB.m.h || was.style !== BB.m.style) bbBuild(false);
    else bbDrawAll();
    bbFillMapFields();
    bbUndoButtons();
}

function bbUndoButtons() {
    $('bb-undo').disabled = !BB.undo.length;
    $('bb-redo').disabled = !BB.redo.length;
}

// ── The maps ──────────────────────────────────────────────
function bbOpen(id) {
    if (BB.dirty) bbSaveNow();
    BB.m = BB.store.maps.find(m => m.id === id) || BB.store.maps[0];
    BB.store.cur = BB.m.id;
    BB.undo = [];
    BB.redo = [];
    BB.sel = null;
    BB.ruler = null;
    bbUndoButtons();
    bbFillMapFields();
    bbBuild(true);
}

function bbMapOptions() {
    const sel = $('bb-maps');
    sel.innerHTML = BB.store.maps.map(m => `<option value="${esc(m.id)}">${esc(m.name)} (${m.w}×${m.h})</option>`).join('');
    sel.value = BB.m.id;
}

function bbFillMapFields() {
    bbMapOptions();
    $('bb-name').value = BB.m.name;
    $('bb-w').value = BB.m.w;
    $('bb-h').value = BB.m.h;
    $('bb-style').value = BB.m.style;
    $('bb-look').value = BB.m.style === 'art' ? 'art' : 'parchment';
    $('bb-size-note').textContent = `${BB.m.w * 5} × ${BB.m.h * 5} feet`;
}

function bbAdd(m) {
    if (BB.store.maps.length >= BM_LIMITS.maps) {
        bbFlash(`⚠️ You have ${BM_LIMITS.maps} saved maps, the most this page keeps. Delete one first.`, true);
        return false;
    }
    BB.store.maps.unshift(m);
    BB.m = m;
    const saved = bbSaveNow();
    bbOpen(m.id);
    return saved;
}

// ── The SVG ───────────────────────────────────────────────
const BB_LAYERS = ['floor', 'props', 'walls', 'doors', 'grid', 'labels', 'tokens', 'fog', 'ui'];

// A new SVG for the map (its size or style changed). fit: zoom to fit the stage.
function bbBuild(fit) {
    const m = BB.m, S = SITE_SQUARE, art = m.style === 'art';
    $('bb-canvas').innerHTML = `<svg id="bb-svg" class="bm-map bm-${art ? 'art' : 'classic'}" viewBox="0 0 ${m.w * S} ${m.h * S}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(m.name)}">
        <defs>${art ? bmDefs('bb') : ''}</defs>
        <rect class="bm-bg" x="0" y="0" width="${m.w * S}" height="${m.h * S}"/>
        ${BB_LAYERS.map(k => `<g id="bb-g-${k}"${k === 'tokens' ? ' class="bm-tokens"' : k === 'fog' ? ' class="bm-fog"' : ''}></g>`).join('')}
    </svg>`;
    if (fit) bbFit(); else bbZoomTo(BB.zoom);
    bbDrawAll();
}

function bbDrawFloor() {
    const art = BB.m.style === 'art';
    $('bb-g-floor').innerHTML = bmFloorSvg(BB.m, art, 'bb');
    $('bb-g-walls').innerHTML = bmWallSvg(BB.m);
}

function bbDrawObjs() {
    const art = BB.m.style === 'art';
    $('bb-g-props').innerHTML = bmPropSvg(BB.m, art);
    $('bb-g-doors').innerHTML = bmDoorSvg(BB.m, art);
}

function bbDrawAll() {
    bbDrawFloor();
    bbDrawObjs();
    $('bb-g-labels').innerHTML = bmLabelsSvg(BB.m);
    $('bb-g-grid').innerHTML = $('bb-grid-on').checked ? bmGridSvg(BB.m) : '';
    $('bb-g-tokens').innerHTML = bmTokenSvg(BB.m);
    $('bb-g-fog').innerHTML = bmFogSvg(BB.m);
    bbDrawUi();
    bbInspector();
}

// The selection, what the tool would place, the ruler, and the shapes being dragged out.
function bbDrawUi() {
    const S = SITE_SQUARE, m = BB.m, out = [];
    const sel = bbSelected();
    if (sel && BB.sel.type === 'ob') {
        const it = BM_ITEMS[sel.k], w = Math.max(sel.w * (it.pw || 1), 0.6) * S, h = Math.max(sel.h * (it.ph || 1), 0.6) * S;
        // k: one screen pixel, so the handles stay the same size at any zoom.
        const k = S / BB.zoom, x = -w / 2 - 1, y = -h / 2 - 1;
        out.push(`<g transform="translate(${sel.x * S} ${sel.y * S}) rotate(${sel.r})"><rect class="bb-sel" x="${x}" y="${y}" width="${w + 2}" height="${h + 2}"/>`
            + `<line class="bb-sel" x1="0" y1="${y}" x2="0" y2="${y - 20 * k}"/>`
            + `<circle class="bb-handle bb-rot" data-h="rot" cx="0" cy="${y - 20 * k}" r="${6 * k}"/>`
            + `<rect class="bb-handle bb-scale" data-h="scale" x="${-x - 5 * k}" y="${-y - 5 * k}" width="${10 * k}" height="${10 * k}"/></g>`);
    } else if (sel) {
        out.push(`<circle class="bb-sel" cx="${sel.x * S}" cy="${sel.y * S}" r="7.5"/>`);
    }
    const d = BB.drag;
    if (d && d.kind === 'rect') {
        const [x0, y0, x1, y1] = bbRectOf(d);
        out.push(`<rect class="bb-ghost-rect${d.v ? '' : ' bb-rub'}" x="${x0 * S}" y="${y0 * S}" width="${(x1 - x0 + 1) * S}" height="${(y1 - y0 + 1) * S}"/>`);
    }
    if (d && d.kind === 'wall') out.push(`<line class="bb-ghost-wall${d.rub ? ' bb-rub' : ''}" x1="${d.a.x * S}" y1="${d.a.y * S}" x2="${d.b.x * S}" y2="${d.b.y * S}"/>`);
    const h = BB.hover;
    if (h && !d) {
        if (h.obj) out.push(`<g class="bb-ghost">${bmObjSvg(h.obj, m.style === 'art')}</g>`);
        if (h.brush) out.push(`<rect class="bb-ghost-rect${h.rub ? ' bb-rub' : ''}" x="${h.brush[0] * S}" y="${h.brush[1] * S}" width="${h.brush[2] * S}" height="${h.brush[2] * S}"/>`);
        if (h.edge) out.push(`<line class="bb-ghost-wall" x1="${h.edge[0] * S}" y1="${h.edge[1] * S}" x2="${h.edge[2] * S}" y2="${h.edge[3] * S}"/>`);
        if (h.label) out.push(`<g class="bb-ghost">${bmLabelSvg(h.label)}</g>`);
    }
    const r = BB.ruler;
    if (r) {
        const fs = Math.max(4, 13 * 32 / BB.zoom * 0.35);
        out.push(`<line class="bb-ruler" x1="${r.a.x * S}" y1="${r.a.y * S}" x2="${r.b.x * S}" y2="${r.b.y * S}"/>`,
            `<circle class="bb-ruler-end" cx="${r.a.x * S}" cy="${r.a.y * S}" r="1.6"/><circle class="bb-ruler-end" cx="${r.b.x * S}" cy="${r.b.y * S}" r="1.6"/>`,
            `<text class="bb-ruler-text" x="${r.b.x * S}" y="${r.b.y * S - fs}" style="font-size:${fs.toFixed(1)}px">${esc(bbRulerText(r))}</text>`);
    }
    $('bb-g-ui').innerHTML = out.join('');
}

// ── Zoom and the stage ────────────────────────────────────
function bbZoomTo(z, about = null) {
    const stage = $('bb-stage'), svg = $('bb-svg');
    if (!svg) return;
    z = Math.max(BB_ZOOM.min, Math.min(BB_ZOOM.max, z));
    // Keep the square under `about` (client x, y) where it is.
    let keep = null;
    if (about) {
        const r = svg.getBoundingClientRect();
        keep = { fx: (about.x - r.left) / r.width, fy: (about.y - r.top) / r.height, cx: about.x, cy: about.y };
    }
    BB.zoom = z;
    svg.setAttribute('width', Math.round(BB.m.w * z));
    svg.setAttribute('height', Math.round(BB.m.h * z));
    if (keep) {
        const r = svg.getBoundingClientRect();
        stage.scrollLeft += r.left + keep.fx * r.width - keep.cx;
        stage.scrollTop += r.top + keep.fy * r.height - keep.cy;
    }
    $('bb-zoom-val').textContent = `${Math.round(z)} px a square`;
    bbDrawUi();
}

function bbFit() {
    const stage = $('bb-stage');
    bbZoomTo(Math.floor(Math.min((stage.clientWidth - 24) / BB.m.w, (stage.clientHeight - 24) / BB.m.h)));
}

// The pointer in squares (fractions and all).
function bbPoint(e) {
    const svg = $('bb-svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x / SITE_SQUARE, y: p.y / SITE_SQUARE };
}

// ── Tools ─────────────────────────────────────────────────
function bbSetTool(t) {
    if (!BB_TOOLS[t]) return;
    BB.tool = t;
    BB.hover = null;
    if (t !== 'ruler') BB.ruler = null;
    if (t !== 'select') BB.sel = null;
    document.querySelectorAll('#bb-tools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
    document.querySelectorAll('.bb-opt').forEach(p => { p.hidden = p.dataset.for !== t; });
    $('bb-stage').classList.toggle('bb-panning', t === 'pan');
    bbDrawUi();
    bbInspector();
}

// The squares a brush of n covers around x, y: [x0, y0, n].
function bbBrush(x, y, n) {
    return [Math.floor(x - (n - 1) / 2), Math.floor(y - (n - 1) / 2), n];
}

function bbPaint(x, y, v) {
    const m = BB.m, [x0, y0, n] = bbBrush(x, y, BB.brush);
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) {
        if (bmIn(m, x0 + dx, y0 + dy)) m.fl[(y0 + dy) * m.w + x0 + dx] = v;
    }
}

// The eraser on the squares around x, y: what it takes off depends on BB.erase.
function bbRub(x, y) {
    const m = BB.m, [x0, y0, n] = bbBrush(x, y, BB.eraseSize), what = BB.erase;
    const inside = (px, py) => px >= x0 && px < x0 + n && py >= y0 && py < y0 + n;
    let hit = false;
    for (let sy = y0; sy < y0 + n; sy++) for (let sx = x0; sx < x0 + n; sx++) {
        if (!bmIn(m, sx, sy)) continue;
        if (what === 'all' || what === 'floor') { if (m.fl[sy * m.w + sx]) hit = true; m.fl[sy * m.w + sx] = 0; }
        if (what === 'all' || what === 'walls') {
            [sy * m.w + sx, (sy + 1) * m.w + sx].forEach(i => { if (m.hw[i]) { hit = true; m.hw[i] = 0; } });
            [sy * (m.w + 1) + sx, sy * (m.w + 1) + sx + 1].forEach(i => { if (m.vw[i]) { hit = true; m.vw[i] = 0; } });
        }
    }
    if (what === 'all' || what === 'objects') {
        const ob = m.ob.filter(o => !inside(Math.floor(o.x), Math.floor(o.y)) && !bmHit(o, x, y));
        const lb = m.lb.filter(l => !inside(Math.floor(l.x), Math.floor(l.y)));
        if (ob.length !== m.ob.length || lb.length !== m.lb.length) hit = true;
        m.ob = ob;
        m.lb = lb;
    }
    return hit;
}

function bbRectOf(d) {
    return [Math.min(d.a.x, d.b.x), Math.min(d.a.y, d.b.y), Math.max(d.a.x, d.b.x), Math.max(d.a.y, d.b.y)];
}

// The grid line nearest x, y: [x0, y0, x1, y1] in squares, and where it is in hw or vw.
function bbEdge(x, y) {
    const m = BB.m, fx = x - Math.floor(x), fy = y - Math.floor(y);
    if (Math.min(fy, 1 - fy) < Math.min(fx, 1 - fx)) {
        const gx = Math.floor(x), gy = Math.round(y);
        if (gx < 0 || gx >= m.w || gy < 0 || gy > m.h) return null;
        return { line: [gx, gy, gx + 1, gy], list: 'hw', i: gy * m.w + gx };
    }
    const gx = Math.round(x), gy = Math.floor(y);
    if (gy < 0 || gy >= m.h || gx < 0 || gx > m.w) return null;
    return { line: [gx, gy, gx, gy + 1], list: 'vw', i: gy * (m.w + 1) + gx };
}

// Walls on (or, rub, off) every grid line from point a to point b (one straight line).
function bbWallLine(a, b, rub) {
    const m = BB.m, v = rub ? 0 : 1;
    if (a.y === b.y) {
        if (a.y < 0 || a.y > m.h) return;
        for (let x = Math.max(0, Math.min(a.x, b.x)); x < Math.min(m.w, Math.max(a.x, b.x)); x++) m.hw[a.y * m.w + x] = v;
    } else {
        if (a.x < 0 || a.x > m.w) return;
        for (let y = Math.max(0, Math.min(a.y, b.y)); y < Math.min(m.h, Math.max(a.y, b.y)); y++) m.vw[y * (m.w + 1) + a.x] = v;
    }
}

// The grid point nearest p, and from a, the one along a straight line toward it.
function bbGridPoint(p, a = null) {
    const m = BB.m, q = { x: Math.max(0, Math.min(m.w, Math.round(p.x))), y: Math.max(0, Math.min(m.h, Math.round(p.y))) };
    if (!a) return q;
    return Math.abs(q.x - a.x) >= Math.abs(q.y - a.y) ? { x: q.x, y: a.y } : { x: a.x, y: q.y };
}

// What the door or furniture tool would place at p.
function bbNewObj(p, free) {
    const k = BB.tool === 'door' ? BB.door : BB.item, it = BM_ITEMS[k];
    const o = { k, x: p.x, y: p.y, w: it.w || 1, h: it.h || 1, r: it.edge && !free ? 0 : BB.turn };
    if (!free) Object.assign(o, bmSnap(o, p.x, p.y));
    return o;
}

function bbNewLabel(p, free) {
    const sq = (v, n) => Math.min(n - 1, Math.floor(v)) + 0.5;
    return { x: free ? p.x : sq(p.x, BB.m.w), y: free ? p.y : sq(p.y, BB.m.h), t: BB.label || '?' };
}

function bbLabelNext() {
    if (!BB.count) return;
    const t = BB.label;
    const m = t.match(/^(.*?)(\d+)$/);
    if (m) BB.label = m[1] + (parseInt(m[2], 10) + 1);
    else if (/^[A-Y]$/i.test(t)) BB.label = String.fromCharCode(t.charCodeAt(0) + 1);
    $('bb-label-text').value = BB.label;
}

function bbRulerText(r) {
    const dx = Math.abs(r.b.x - r.a.x), dy = Math.abs(r.b.y - r.a.y);
    if (BB.rule === 'line') return `${Math.round(Math.hypot(dx, dy) * 5)} ft`;
    const sx = Math.round(dx), sy = Math.round(dy), diag = Math.min(sx, sy), straight = Math.max(sx, sy) - diag;
    const sq = Math.max(sx, sy);
    const ft = BB.rule === '5105' ? (straight + diag + Math.floor(diag / 2)) * 5 : sq * 5;
    return `${ft} ft (${sq} square${sq === 1 ? '' : 's'})`;
}

// The thing at p: a label, then doors, then furniture, the top one first.
function bbHitAt(p) {
    const m = BB.m;
    for (let i = m.lb.length - 1; i >= 0; i--) {
        if (Math.hypot(m.lb[i].x - p.x, m.lb[i].y - p.y) < 0.6) return { type: 'lb', i };
    }
    const order = m.ob.map((o, i) => i);
    const doors = order.filter(i => BM_ITEMS[m.ob[i].k].door), props = order.filter(i => !BM_ITEMS[m.ob[i].k].door);
    for (const i of doors.reverse().concat(props.reverse())) if (bmHit(m.ob[i], p.x, p.y)) return { type: 'ob', i };
    return null;
}

function bbSelected() {
    if (!BB.sel) return null;
    const list = BB.sel.type === 'ob' ? BB.m.ob : BB.m.lb;
    return list[BB.sel.i] || null;
}

// ── The pointer ───────────────────────────────────────────
function bbDown(e) {
    if (!$('bb-svg')) return;
    const m = BB.m, p = bbPoint(e), free = e.altKey;
    const pan = BB.tool === 'pan' || BB.space || e.button === 1;
    if (pan) {
        e.preventDefault();
        const stage = $('bb-stage');
        BB.drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
        $('bb-svg').setPointerCapture(e.pointerId);
        return;
    }
    if (e.button > 2) return;
    e.preventDefault();
    const rub = e.button === 2 || e.shiftKey;
    $('bb-svg').setPointerCapture(e.pointerId);
    BB.hover = null;
    const t = BB.tool;
    // The selected thing's handles: the square resizes it, the round one turns it.
    const handle = e.target.closest('[data-h]');
    if (handle && bbSelected()) {
        const s = bbSelected();
        BB.drag = { kind: handle.dataset.h, w: s.w, h: s.h, x: s.x, y: s.y, moved: false, free };
        return;
    }
    if (t === 'floor') {
        const sq = { x: Math.floor(p.x), y: Math.floor(p.y) };
        const v = rub ? 0 : BB.floor;
        if (BB.floorMode === 'fill') {
            if (!bmIn(m, sq.x, sq.y)) return;
            const copy = bmCopy(m);
            if (bmFill(m, sq.x, sq.y, v)) {
                BB.undo.push(copy);
                if (BB.undo.length > BB_UNDO_MAX) BB.undo.shift();
                BB.redo = [];
                bbUndoButtons();
                bbDrawFloor();
                bbSave();
            }
            return;
        }
        bbMark();
        if (BB.floorMode === 'rect') { BB.drag = { kind: 'rect', a: sq, b: sq, v }; bbDrawUi(); return; }
        BB.drag = { kind: 'paint', last: p, v };
        bbPaint(p.x, p.y, v);
        bbDrawFloor();
    } else if (t === 'erase') {
        bbMark();
        BB.drag = { kind: 'rub', last: p, hit: bbRub(p.x, p.y) };
        bbDrawAll();
    } else if (t === 'wall') {
        const a = bbGridPoint(p);
        BB.drag = { kind: 'wall', a, b: a, p, rub };
        bbDrawUi();
    } else if ((t === 'door' || t === 'prop' || t === 'label') && !bbOnMap(p)) {
        // The dark margin around the map: nothing to put there.
        return;
    } else if (t === 'door' || t === 'prop') {
        const o = bbNewObj(p, free);
        bbMark();
        // A door put where one already is takes its place.
        if (BM_ITEMS[o.k].door) m.ob = m.ob.filter(q => !(BM_ITEMS[q.k].door && Math.abs(q.x - o.x) < 0.05 && Math.abs(q.y - o.y) < 0.05));
        m.ob.push(o);
        bbDrawObjs();
        bbSave();
    } else if (t === 'label') {
        bbMark();
        m.lb.push(bbNewLabel(p, free));
        bbLabelNext();
        $('bb-g-labels').innerHTML = bmLabelsSvg(m);
        bbSave();
    } else if (t === 'select') {
        BB.sel = bbHitAt(p);
        const s = bbSelected();
        if (s) BB.drag = { kind: 'move', dx: s.x - p.x, dy: s.y - p.y, moved: false };
        bbDrawUi();
        bbInspector();
    } else if (t === 'ruler') {
        const a = free ? p : { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 };
        BB.ruler = { a, b: a };
        BB.drag = { kind: 'ruler' };
        bbDrawUi();
    }
}

function bbMove(e) {
    if (!$('bb-svg')) return;
    const d = BB.drag, p = bbPoint(e), free = e.altKey, m = BB.m;
    if (!d) { bbHoverAt(p, e); return; }
    if (d.kind === 'pan') {
        const stage = $('bb-stage');
        stage.scrollLeft = d.sl - (e.clientX - d.cx);
        stage.scrollTop = d.st - (e.clientY - d.cy);
    } else if (d.kind === 'paint' || d.kind === 'rub') {
        // Every step along the way, so a fast stroke leaves no gaps.
        const steps = Math.max(1, Math.ceil(Math.hypot(p.x - d.last.x, p.y - d.last.y) * 2));
        for (let k = 1; k <= steps; k++) {
            const x = d.last.x + (p.x - d.last.x) * k / steps, y = d.last.y + (p.y - d.last.y) * k / steps;
            if (d.kind === 'paint') bbPaint(x, y, d.v);
            else if (bbRub(x, y)) d.hit = true;
        }
        d.last = p;
        if (d.kind === 'paint') bbDrawFloor(); else bbDrawAll();
    } else if (d.kind === 'rect') {
        d.b = { x: Math.max(0, Math.min(m.w - 1, Math.floor(p.x))), y: Math.max(0, Math.min(m.h - 1, Math.floor(p.y))) };
        bbDrawUi();
    } else if (d.kind === 'wall') {
        d.b = bbGridPoint(p, d.a);
        d.p = p;
        bbDrawUi();
    } else if (d.kind === 'move') {
        const s = bbSelected();
        if (!s) return;
        if (!d.moved) { bbMark(); d.moved = true; }
        const x = p.x + d.dx, y = p.y + d.dy;
        if (BB.sel.type === 'lb') Object.assign(s, free ? { x, y } : { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 });
        else Object.assign(s, free ? { x, y } : bmSnap(s, x, y));
        s.x = Math.max(0, Math.min(m.w, s.x));
        s.y = Math.max(0, Math.min(m.h, s.y));
        if (BB.sel.type === 'lb') $('bb-g-labels').innerHTML = bmLabelsSvg(m); else bbDrawObjs();
        bbDrawUi();
    } else if (d.kind === 'ruler') {
        BB.ruler.b = free ? p : { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 };
        bbDrawUi();
    } else if (d.kind === 'scale' || d.kind === 'rot') {
        const s = bbSelected();
        if (!s) return;
        if (!d.moved) { bbMark(); d.moved = true; }
        d.free = free;
        const it = BM_ITEMS[s.k];
        if (d.kind === 'rot') {
            // Steps of 15° unless Alt is held.
            const a = Math.atan2(p.y - s.y, p.x - s.x) * 180 / Math.PI + 90;
            s.r = (((free ? Math.round(a) : Math.round(a / 15) * 15) % 360) + 360) % 360;
        } else {
            // The pointer in the thing's own turned frame, from its middle: half its new size.
            const a = -s.r * Math.PI / 180, dx = p.x - d.x, dy = p.y - d.y;
            let w = Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) * 2 / (it.pw || 1);
            let h = Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) * 2 / (it.ph || 1);
            // Shift keeps its shape.
            if (e.shiftKey) { const f = Math.max(w / d.w, h / d.h); w = d.w * f; h = d.h * f; }
            const step = free ? 0.05 : it.edge ? 0.25 : 1;
            const to = v => Math.max(0.25, Math.min(20, Math.round(Math.max(step, Math.round(v / step) * step) * 100) / 100));
            s.w = to(w);
            s.h = to(h);
            if (!free && !it.edge) Object.assign(s, bmSnap(s, d.x, d.y));
            else { s.x = d.x; s.y = d.y; }
        }
        bbDrawObjs();
        bbDrawUi();
    }
}

function bbUp(e) {
    const d = BB.drag;
    BB.drag = null;
    if (!d) return;
    const m = BB.m;
    if (d.kind === 'rect') {
        const [x0, y0, x1, y1] = bbRectOf(d);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (bmIn(m, x, y)) m.fl[y * m.w + x] = d.v;
        bbDrawFloor();
        bbSave();
    } else if (d.kind === 'paint') {
        bbSave();
    } else if (d.kind === 'rub') {
        if (d.hit) bbSave(); else { BB.undo.pop(); bbUndoButtons(); }
    } else if (d.kind === 'wall') {
        bbMark();
        if (d.a.x === d.b.x && d.a.y === d.b.y) {
            // A click: the grid line under the pointer, on or off.
            const edge = bbEdge(d.p.x, d.p.y);
            if (!edge) { BB.undo.pop(); bbUndoButtons(); bbDrawUi(); return; }
            m[edge.list][edge.i] = d.rub ? 0 : 1 - m[edge.list][edge.i];
        } else {
            bbWallLine(d.a, d.b, d.rub);
        }
        bbDrawFloor();
        bbSave();
    } else if (d.kind === 'move') {
        if (d.moved) bbSave();
        bbInspector();
    } else if (d.kind === 'scale' || d.kind === 'rot') {
        const s = bbSelected();
        // Turned square to the grid: back onto the squares.
        if (s && d.kind === 'rot' && !d.free && !BM_ITEMS[s.k].edge && s.r % 90 === 0) { Object.assign(s, bmSnap(s, s.x, s.y)); bbDrawObjs(); }
        if (d.moved) bbSave();
        bbInspector();
    }
    bbDrawUi();
}

function bbOnMap(p) {
    return p.x >= 0 && p.y >= 0 && p.x <= BB.m.w && p.y <= BB.m.h;
}

function bbHoverAt(p, e) {
    const t = BB.tool, free = e.altKey;
    let h = null;
    if (bbOnMap(p)) {
        if (t === 'door' || t === 'prop') h = { obj: bbNewObj(p, free) };
        else if (t === 'floor' && BB.floorMode === 'brush') h = { brush: bbBrush(p.x, p.y, BB.brush), rub: e.shiftKey };
        else if (t === 'erase') h = { brush: bbBrush(p.x, p.y, BB.eraseSize), rub: true };
        else if (t === 'wall') { const edge = bbEdge(p.x, p.y); if (edge) h = { edge: edge.line }; }
        else if (t === 'label') h = { label: bbNewLabel(p, free) };
    }
    BB.hover = h;
    bbDrawUi();
}

// ── The selected thing ────────────────────────────────────
function bbInspector() {
    const box = $('bb-inspect'), s = BB.tool === 'select' ? bbSelected() : null;
    if (!s) {
        box.innerHTML = BB.tool === 'select' ? '<p class="bb-hint">Click a door, a piece of furniture, or a label to pick it up. Drag to move it; it snaps to the grid unless you hold Alt. Drag the square handle to resize it and the round one to turn it.</p>' : '';
        return;
    }
    if (BB.sel.type === 'lb') {
        box.innerHTML = `<h3>🔢 Label</h3>
            <label class="bb-f">Text <input type="text" id="bb-i-text" maxlength="${BM_LIMITS.label}" value="${esc(s.t)}"></label>
            <div class="bb-row"><button type="button" class="btn" data-act="dup">⧉ Duplicate</button><button type="button" class="btn" data-act="del">🗑️ Delete</button></div>`;
        return;
    }
    const it = BM_ITEMS[s.k];
    box.innerHTML = `<h3>${it.door ? '🚪' : '🪑'} ${esc(it.label)}</h3>
        <div class="bb-row">
            <label class="bb-f">Wide <input type="number" id="bb-i-w" min="0.25" max="20" step="${it.edge ? 0.25 : 1}" value="${s.w}"></label>
            <label class="bb-f">Long <input type="number" id="bb-i-h" min="0.25" max="20" step="${it.edge ? 0.25 : 1}" value="${s.h}"></label>
            <label class="bb-f">Turned <input type="number" id="bb-i-r" min="-360" max="360" step="15" value="${s.r}"></label>
        </div>
        <p class="bb-hint">In squares (5 feet each) and degrees. Type any size or angle you like.</p>
        <div class="bb-row">
            <button type="button" class="btn" data-act="turn" title="Turn 90° (R)">⟳ Turn</button>
            <button type="button" class="btn" data-act="dup" title="Duplicate (Ctrl+D)">⧉ Duplicate</button>
            <button type="button" class="btn" data-act="back" title="Under everything else">⤓ To back</button>
            <button type="button" class="btn" data-act="front" title="On top of everything else">⤒ To front</button>
            <button type="button" class="btn" data-act="del" title="Delete">🗑️ Delete</button>
        </div>`;
}

function bbInspectInput(e) {
    const s = bbSelected();
    if (!s) return;
    const id = e.target.id;
    if (id === 'bb-i-text') {
        const t = e.target.value.replace(/[\u0000-\u001f]/g, ' ').slice(0, BM_LIMITS.label);
        if (!t.trim()) return;
        if (!BB.inspectMarked) { bbMark(); BB.inspectMarked = true; }
        s.t = t.trim();
        $('bb-g-labels').innerHTML = bmLabelsSvg(BB.m);
        bbSave();
        return;
    }
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    if (!BB.inspectMarked) { bbMark(); BB.inspectMarked = true; }
    if (id === 'bb-i-w') s.w = Math.max(0.25, Math.min(20, v));
    if (id === 'bb-i-h') s.h = Math.max(0.25, Math.min(20, v));
    if (id === 'bb-i-r') s.r = ((Math.round(v) % 360) + 360) % 360;
    bbDrawObjs();
    bbDrawUi();
    bbSave();
}

function bbAct(act) {
    const s = bbSelected(), m = BB.m;
    if (!s) return;
    const list = BB.sel.type === 'ob' ? m.ob : m.lb;
    bbMark();
    if (act === 'del') { list.splice(BB.sel.i, 1); BB.sel = null; }
    if (act === 'dup') {
        list.push({ ...s, x: Math.min(m.w, s.x + 1), y: Math.min(m.h, s.y + 1) });
        BB.sel = { type: BB.sel.type, i: list.length - 1 };
    }
    if (act === 'turn' || act === 'unturn' || act === 'nudge') {
        const step = act === 'turn' ? 90 : act === 'unturn' ? -90 : 15;
        s.r = (((s.r + step) % 360) + 360) % 360;
        if (act !== 'nudge' && BB.sel.type === 'ob' && !BM_ITEMS[s.k].edge) Object.assign(s, bmSnap(s, s.x, s.y));
    }
    if (act === 'back' || act === 'front') {
        list.splice(BB.sel.i, 1);
        if (act === 'back') list.unshift(s); else list.push(s);
        BB.sel.i = act === 'back' ? 0 : list.length - 1;
    }
    if (BB.sel && BB.sel.type === 'lb' || !BB.sel) $('bb-g-labels').innerHTML = bmLabelsSvg(m);
    bbDrawObjs();
    bbDrawUi();
    bbInspector();
    bbSave();
}

function bbNudge(dx, dy, free) {
    const s = bbSelected();
    if (!s) return;
    bbMark();
    const step = free ? 0.1 : 1;
    s.x = Math.max(0, Math.min(BB.m.w, s.x + dx * step));
    s.y = Math.max(0, Math.min(BB.m.h, s.y + dy * step));
    if (BB.sel.type === 'lb') $('bb-g-labels').innerHTML = bmLabelsSvg(BB.m); else bbDrawObjs();
    bbDrawUi();
    bbSave();
}

// ── Keys ──────────────────────────────────────────────────
function bbKey(e) {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === 'Alt') { e.preventDefault(); return; }   // so Alt alone doesn't take the focus to the browser's menu
    if (typing) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) bbSwap(BB.redo, BB.undo); else bbSwap(BB.undo, BB.redo); return; }
    if (ctrl && k === 'y') { e.preventDefault(); bbSwap(BB.redo, BB.undo); return; }
    if (ctrl && k === 'd') { e.preventDefault(); bbAct('dup'); return; }
    if (ctrl || e.metaKey) return;
    if (k === ' ') { e.preventDefault(); BB.space = true; $('bb-stage').classList.add('bb-panning'); return; }
    if (k === 'escape') { BB.sel = null; BB.ruler = null; bbDrawUi(); bbInspector(); return; }
    if ((k === 'delete' || k === 'backspace') && bbSelected()) { e.preventDefault(); bbAct('del'); return; }
    if (k === 'r') {
        e.preventDefault();
        if (bbSelected()) { bbAct(e.altKey ? 'nudge' : e.shiftKey ? 'unturn' : 'turn'); return; }
        BB.turn = (((BB.turn + (e.altKey ? 15 : e.shiftKey ? -90 : 90)) % 360) + 360) % 360;
        bbFlash(`⟳ Furniture goes down turned ${BB.turn}°.`);
        return;
    }
    const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
    if (arrows[k] && bbSelected()) { e.preventDefault(); bbNudge(...arrows[k], e.altKey); return; }
    if (k === '=' || k === '+') { bbZoomTo(BB.zoom * 1.25); return; }
    if (k === '-') { bbZoomTo(BB.zoom / 1.25); return; }
    if (k === '0') { bbFit(); return; }
    const tool = Object.keys(BB_TOOLS).find(t => BB_TOOLS[t].key === k);
    if (tool) bbSetTool(tool);
}

// ── Out: link, PNG, print ─────────────────────────────────
async function bbCopyLink() {
    const p = bmPack(BB.m);
    delete p.id;
    delete p.t;
    const code = await packShareCode(p);
    // After the #: the browser keeps it to itself, so a big map can't make the address too long for the server.
    const url = new URL('dnd-battlemap-builder', location.href);
    url.hash = 'm=' + code;
    try {
        await navigator.clipboard.writeText(url.href);
        bbFlash(`🔗 Link copied (${url.href.length.toLocaleString('en-US')} characters). It opens this map as it is now.`);
    } catch (e) {
        bbFlash('⚠️ Copy blocked by the browser.');
    }
}

function bbExportOpts() {
    const look = $('bb-look').value;
    return { look, style: look === 'art' ? 'art' : 'classic', grid: $('bb-x-grid').checked, labels: $('bb-x-labels').checked, secret: $('bb-x-secret').checked };
}

async function bbDownload() {
    const btn = $('bb-png');
    if (btn.disabled) return;
    const m = BB.m, o = bbExportOpts(), px = Number($('bb-px').value) || 100;
    const svg = bmSvg(m, { ...o, uid: 'bx' });
    const w = m.w * px, h = m.h * px;
    const name = `${mapFileSlug(m.name)}-${m.w}x${m.h}.png`;
    btn.disabled = true;
    bbFlash('🗺️ Drawing the map…', true);
    const ok = await mapExportPng(await mapInlineImages(svg), w, h, mapPageCss('.bm-') + '\n' + bbScopeCss(BB_LOOKS[o.look], '.bm-map'), name);
    btn.disabled = false;
    const n = v => v.toLocaleString('en-US');
    bbFlash(ok
        ? `⬇️ Saved ${name}: ${m.w} × ${m.h} squares (${m.w * 5} × ${m.h * 5} feet), ${n(w)} × ${n(h)} pixels.`
        : '⚠️ This browser could not draw a map that big. Try fewer pixels per square.', true);
}

// Every rule in css with scope in front of its selectors.
function bbScopeCss(css, scope) {
    return css.replace(/([^{}]+)\{/g, (m, sel) => sel.split(',').map(s => `${scope} ${s.trim()}`).join(', ') + ' {');
}

// The pages: the map cut into 1-inch squares a page at a time (portrait or landscape,
// whichever takes fewer pages), or the whole map scaled to one page.
function bbPages(m) {
    const cut = (a, d) => ({ a, d, n: Math.ceil(m.w / a) * Math.ceil(m.h / d) });
    const tall = cut(BB_PAGE.across, BB_PAGE.down), wide = cut(BB_PAGE.down, BB_PAGE.across);
    const best = wide.n < tall.n ? { ...wide, land: true } : { ...tall, land: false };
    const pages = [];
    for (let y = 0; y < m.h; y += best.d) for (let x = 0; x < m.w; x += best.a) pages.push({ x, y, w: Math.min(best.a, m.w - x), h: Math.min(best.d, m.h - y) });
    return { pages, land: best.land, cols: Math.ceil(m.w / best.a) };
}

async function bbPrint() {
    const m = BB.m, o = bbExportOpts(), fit = $('bb-print-fit').value === 'fit';
    const box = $('bb-print');
    const css = bbScopeCss(BB_LOOKS[o.look], '#bb-print .bm-map');
    let html, land = m.w > m.h;
    if (fit) {
        html = `<div class="bb-sheet bb-sheet-fit">${bmSvg(m, { ...o, uid: 'bp0' })}<p>${esc(m.name)} · ${m.w} × ${m.h} squares, scaled to fit</p></div>`;
    } else {
        const P = bbPages(m);
        land = P.land;
        html = P.pages.map((v, k) => `<div class="bb-sheet">${bmSvg(m, { ...o, view: v, uid: 'bp' + k }).replace('<svg ', `<svg style="width:${v.w}in;height:${v.h}in" `)}
            <p>${esc(m.name)} · page ${k + 1} of ${P.pages.length} (row ${Math.floor(k / P.cols) + 1}, column ${k % P.cols + 1}) · 1 inch = 5 feet</p></div>`).join('');
    }
    // Scaled to one page, turned sideways: A4's 7.27 inches, less the caption (the page's own 9.4 is for upright).
    const fitLand = fit && land ? '\n#bb-print .bb-sheet-fit svg { max-height: 6.9in; }' : '';
    box.innerHTML = `<style>@page { size: ${land ? 'landscape' : 'portrait'}; margin: 0.5in; }${fitLand}\n${css}</style>${html}`;
    // Let the pictures arrive before the print dialog takes its copy.
    const hrefs = [...new Set([...box.innerHTML.matchAll(/href="(img\/[^"]+)"/g)].map(x => x[1]))];
    bbFlash('🖨️ Getting the pages ready…', true);
    await Promise.all(hrefs.map(h => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = h; })));
    bbFlash('');
    document.body.classList.add('print-bb');
    window.print();
}

// ── Opening a link ────────────────────────────────────────
// The code is after the # (older links: in the query).
async function bbFromLink() {
    const p = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1));
    const code = h.get('m') || p.get('m');
    if (!code) return;
    let m = null;
    try {
        m = bmClean(await unpackShareCode(code, BM_LIMITS.code, BM_LIMITS.bytes));
    } catch (err) {
        bbFlash(err.browser ? '⚠️ This browser is too old to open that map link. Try a newer Chrome, Edge, Firefox, or Safari.' : '⚠️ That map link is broken (cut short when it was copied?).', true);
        return;
    }
    if (!m) { bbFlash('⚠️ That map link is broken.', true); return; }
    // Opened twice (a reload before the address changed)? Open the one already saved.
    const same = x => { const a = bmPack(x), b = bmPack(m); delete a.id; delete a.t; delete b.id; delete b.t; return JSON.stringify(a) === JSON.stringify(b); };
    const had = BB.store.maps.find(same);
    if (had) bbOpen(had.id);
    else if (!bbAdd({ ...m, id: bmId(), t: Date.now() })) return;
    else bbFlash(`📥 Opened “${m.name}” and saved it with your maps.`);
    p.delete('m');
    h.delete('m');
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + (h.toString() ? '#' + h : ''));
}

// ── Set up ────────────────────────────────────────────────
function bbPickers() {
    $('bb-tools').innerHTML = Object.entries(BB_TOOLS).map(([t, v]) =>
        `<button type="button" data-tool="${t}" aria-pressed="false" title="${esc(v.label.replace(/^\S+ /, ''))} (${v.key.toUpperCase()})">${v.label}</button>`).join('');
    $('bb-floors').innerHTML = BM_FLOORS.map((f, k) =>
        `<button type="button" class="bb-swatch" data-floor="${k + 1}" aria-pressed="${k + 1 === BB.floor}" title="${esc(BM_FLOOR_NAMES[f])}"><span style="background-image:url('${SITE_ART_DIR}floor/${f}.webp')"></span>${esc(BM_FLOOR_NAMES[f])}</button>`).join('');
    const item = (k, it, attr) => `<button type="button" class="bb-item" data-${attr}="${k}" aria-pressed="false" title="${esc(it.label)}">${it.file
        ? `<img src="${SITE_ART_DIR}${it.file}.webp" alt="" loading="lazy" width="40" height="40">` : '<b class="bb-item-s">S</b>'}<span>${esc(it.label)}</span></button>`;
    const doors = Object.entries(BM_ITEMS).filter(([, it]) => it.door);
    $('bb-doors').innerHTML = doors.map(([k, it]) => item(k, it, 'door')).join('');
    $('bb-props').innerHTML = BM_PROP_GROUPS.map(([group, items]) =>
        `<h4 class="bb-group">${esc(group)}</h4>` + items.map(([k]) => item(k, BM_ITEMS[k], 'item')).join('')).join('');
    $('bb-rule').innerHTML = Object.entries(BB_RULES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('bb-style').innerHTML = Object.entries(BM_STYLES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    bbPressed();
}

function bbPressed() {
    document.querySelectorAll('[data-floor]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === BB.floor)));
    document.querySelectorAll('[data-door]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.door === BB.door)));
    document.querySelectorAll('[data-item]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.item === BB.item)));
    document.querySelectorAll('[data-fmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmode === BB.floorMode)));
}

function bbSetup() {
    bbPickers();
    BB.store = bmLoadStore();
    if (!BB.store.maps.length) {
        BB.store.maps.push(bmBlank(30, 20, 'My battlemap'));
        BB.store.cur = BB.store.maps[0].id;
    }
    bbOpen(BB.store.cur);
    bbSetTool('floor');

    $('bb-tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) bbSetTool(b.dataset.tool); });
    $('bb-side').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.floor) BB.floor = +b.dataset.floor;
        if (b.dataset.fmode) BB.floorMode = b.dataset.fmode;
        if (b.dataset.door) BB.door = b.dataset.door;
        if (b.dataset.item) BB.item = b.dataset.item;
        if (b.dataset.act) bbAct(b.dataset.act);
        bbPressed();
    });
    $('bb-inspect').addEventListener('input', bbInspectInput);
    $('bb-inspect').addEventListener('focusin', () => { BB.inspectMarked = false; });
    $('bb-brush').addEventListener('change', e => { BB.brush = +e.target.value; });
    $('bb-erase-size').addEventListener('change', e => { BB.eraseSize = +e.target.value; });
    $('bb-erase-what').addEventListener('change', e => { BB.erase = e.target.value; });
    $('bb-label-text').addEventListener('input', e => { BB.label = e.target.value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, BM_LIMITS.label); });
    $('bb-label-count').addEventListener('change', e => { BB.count = e.target.checked; });
    $('bb-rule').addEventListener('change', e => { BB.rule = e.target.value; bbDrawUi(); });

    const svgHost = $('bb-canvas');
    svgHost.addEventListener('pointerdown', bbDown);
    svgHost.addEventListener('pointermove', bbMove);
    svgHost.addEventListener('pointerup', bbUp);
    svgHost.addEventListener('pointercancel', bbUp);
    svgHost.addEventListener('pointerleave', () => { if (!BB.drag) { BB.hover = null; bbDrawUi(); } });
    svgHost.addEventListener('contextmenu', e => e.preventDefault());
    $('bb-stage').addEventListener('wheel', e => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        bbZoomTo(BB.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX, y: e.clientY });
    }, { passive: false });
    document.addEventListener('keydown', bbKey);
    document.addEventListener('keyup', e => { if (e.key === ' ') { BB.space = false; $('bb-stage').classList.toggle('bb-panning', BB.tool === 'pan'); } });

    $('bb-zoom-in').addEventListener('click', () => bbZoomTo(BB.zoom * 1.25));
    $('bb-zoom-out').addEventListener('click', () => bbZoomTo(BB.zoom / 1.25));
    $('bb-zoom-fit').addEventListener('click', bbFit);
    $('bb-undo').addEventListener('click', () => bbSwap(BB.undo, BB.redo));
    $('bb-redo').addEventListener('click', () => bbSwap(BB.redo, BB.undo));
    $('bb-grid-on').addEventListener('change', () => { $('bb-g-grid').innerHTML = $('bb-grid-on').checked ? bmGridSvg(BB.m) : ''; });

    $('bb-maps').addEventListener('change', e => bbOpen(e.target.value));
    $('bb-name').addEventListener('input', e => {
        BB.m.name = e.target.value.replace(/[\u0000-\u001f]/g, ' ').slice(0, BM_LIMITS.name) || 'Untitled battlemap';
        bbMapOptions();
        bbSave();
    });
    $('bb-style').addEventListener('change', e => {
        bbMark();
        BB.m.style = e.target.value;
        $('bb-look').value = BB.m.style === 'art' ? 'art' : 'parchment';
        bbBuild(false);
        bbSave();
    });
    $('bb-resize').addEventListener('click', () => {
        const side = id => Math.max(1, Math.min(BM_LIMITS.side, parseInt($(id).value, 10) || 1));
        const w = side('bb-w'), h = side('bb-h');
        if (w === BB.m.w && h === BB.m.h) return;
        bbMark();
        const i = BB.store.maps.indexOf(BB.m);
        BB.m = BB.store.maps[i] = bmResize(BB.m, w, h);
        BB.sel = null;
        bbFillMapFields();
        bbBuild(true);
        bbSave();
        bbFlash(`📐 Now ${w} × ${h} squares (${w * 5} × ${h * 5} feet). Undo puts it back.`);
    });
    $('bb-new').addEventListener('click', () => {
        if (bbAdd(bmBlank(BB.m.w, BB.m.h, 'New battlemap', BB.m.style))) bbFlash('➕ A new, empty map, saved with your others.');
    });
    $('bb-dup').addEventListener('click', () => {
        const m = bmCopy(BB.m);
        if (bbAdd({ ...m, id: bmId(), name: (BB.m.name + ' (copy)').slice(0, BM_LIMITS.name), t: Date.now() })) bbFlash('⧉ Copied. You are now drawing on the copy.');
    });
    $('bb-clear').addEventListener('click', () => {
        bbMark();
        const i = BB.store.maps.indexOf(BB.m);
        BB.m = BB.store.maps[i] = { ...bmBlank(BB.m.w, BB.m.h, BB.m.name, BB.m.style), id: BB.m.id };
        BB.sel = null;
        bbDrawAll();
        bbSave();
        bbFlash('🧽 Cleared. Undo brings it all back.');
    });
    const del = $('bb-delete');
    del.addEventListener('click', () => {
        if (!del.dataset.sure) {
            del.dataset.sure = '1';
            del.textContent = '🗑️ Click again to delete';
            setTimeout(() => { delete del.dataset.sure; del.textContent = '🗑️ Delete'; }, 3500);
            return;
        }
        delete del.dataset.sure;
        del.textContent = '🗑️ Delete';
        const name = BB.m.name;
        BB.store.maps = BB.store.maps.filter(m => m !== BB.m);
        if (!BB.store.maps.length) BB.store.maps.push(bmBlank(30, 20, 'My battlemap'));
        BB.m = BB.store.maps[0];
        const saved = bbSaveNow();
        bbOpen(BB.m.id);
        if (saved) bbFlash(`🗑️ Deleted “${name}”.`);
    });

    $('bb-link').addEventListener('click', bbCopyLink);
    $('bb-png').addEventListener('click', bbDownload);
    $('bb-print-btn').addEventListener('click', bbPrint);
    window.addEventListener('afterprint', () => { document.body.classList.remove('print-bb'); $('bb-print').innerHTML = ''; });
    window.addEventListener('beforeunload', () => { if (BB.dirty) bbSaveNow(); });
    window.addEventListener('pagehide', () => { if (BB.dirty) bbSaveNow(); });
    // Another tab saved: take its maps. With changes of this tab's own on the way, take all but the
    // map being drawn on, so the save that follows doesn't put back the other tab's old copies.
    window.addEventListener('storage', e => {
        if (e.key !== BM_KEY && e.key !== null) return;
        const store = bmLoadStore(), id = BB.m.id;
        if (BB.dirty) {
            const i = store.maps.findIndex(m => m.id === id);
            if (i >= 0) store.maps[i] = BB.m;
            else store.maps.unshift(BB.m);
            BB.store = store;
            bbMapOptions();
            return;
        }
        const fresh = store.maps.find(m => m.id === id);
        const changed = !fresh || JSON.stringify(bmPack(fresh)) !== JSON.stringify(bmPack(BB.m));
        BB.store = store;
        if (!store.maps.length) store.maps.push(bmBlank(30, 20, 'My battlemap'));
        if (changed) { bbOpen(fresh ? id : store.maps[0].id); bbFlash('🔄 Updated from another tab.'); }
        else { BB.m = fresh; BB.store.cur = id; bbMapOptions(); }
    });
    // A narrower window (a phone turned) refits a map far wider than it. Only the width counts: a
    // phone's address bar or keyboard changes the height, and that mustn't throw away the zoom.
    let stageW = $('bb-stage').clientWidth;
    window.addEventListener('resize', () => {
        const sw = $('bb-stage').clientWidth;
        if (sw === stageW) return;
        stageW = sw;
        if (BB.zoom * BB.m.w > sw * 3) bbFit();
    });
    // A map link pasted over this page's address only changes the part after the #.
    window.addEventListener('hashchange', bbFromLink);
    bbFromLink();
}

bbSetup();

// Offline maps: once the page has loaded, the service worker (sw.js) saves the map art in the background.
window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.ready.then(reg => { if (reg.active) reg.active.postMessage('cache-map-art'); }).catch(() => {});
});
