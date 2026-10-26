/* ============================================
   WORLD MAP MAKER: fantasy-world-map-maker.html
   Draw a world map by hand: paint land and sea (the coast draws itself) and terrain
   colors, drag and drop icons (settlements, places, terrain symbols, sea creatures, a
   compass, coats of arms), draw borders, roads, rivers, and regions, and write labels in
   the site's fonts, straight or curved. Select anything to move, turn, resize, or restyle
   it. Undo and redo, a ruler in miles, and a frame, grid, scale bar, and colors for the
   whole map. The map itself is worldmap-engine.js.
   Saves: every map in this browser under WM_KEY, up to 30, kept as you draw; another
   tab's changes show up here (the storage event).
   Links: #m=<share code> opens a shared map as a new saved map, then drops the code.
   Out: a PNG at 1, 2, or 3 times the map's size (map-export.js, with the label fonts
   written into it), and print, scaled to one page.
   Needs rng.js, map-export.js, and worldmap-engine.js.
   ============================================ */

const WE = {
    store: { cur: null, maps: [] },
    m: null,
    tool: 'land',
    lmode: 'land', brush: 6, bio: 1, tbrush: 6,
    icon: 'city', scatter: false, iscale: 1,
    line: 'border', text: 'realm', erase: 3,
    sel: null,          // { type: 'ic' | 'tx' | 'ln', i }
    zoom: 0.5,          // screen pixels per map unit
    undo: [], redo: [],
    drag: null, hover: null, draft: null, ruler: null,
    space: false, saveTimer: 0, dirty: false, raf: 0, inspectMarked: false, lookMarked: false
};
const WE_UNDO_MAX = 60;
const WE_ZOOM = { min: 0.08, max: 6 };
const WE_TOOLS = {
    select: { key: 'v', label: '👆 Select' }, land: { key: 'b', label: '🏝️ Land' }, terrain: { key: 'g', label: '🌳 Terrain' },
    icon: { key: 'i', label: '🏰 Icons' }, line: { key: 'l', label: '✒️ Lines' }, text: { key: 't', label: '🔤 Text' },
    erase: { key: 'e', label: '🧽 Erase' }, ruler: { key: 'm', label: '📏 Ruler' }, pan: { key: 'h', label: '✋ Pan' }
};

const $ = id => document.getElementById(id);
const esc = wmEsc;

let weFlashTimer = 0;
function weFlash(msg, keep = false) {
    const el = $('we-status');
    el.textContent = msg;
    clearTimeout(weFlashTimer);
    if (!keep) weFlashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

// ── Saving and undo ───────────────────────────────────────
function weSaveNow() {
    clearTimeout(WE.saveTimer);
    WE.dirty = false;
    WE.store.cur = WE.m.id;
    if (wmSaveStore(WE.store)) return true;
    weFlash('⚠️ This browser would not save the map (storage full or turned off). Copy a link to keep it.', true);
    return false;
}

function weSave() {
    WE.m.t = Date.now();
    WE.dirty = true;
    clearTimeout(WE.saveTimer);
    WE.saveTimer = setTimeout(weSaveNow, 500);
}

// Call before a change.
function weMark() {
    WE.undo.push(wmCopy(WE.m));
    if (WE.undo.length > WE_UNDO_MAX) WE.undo.shift();
    WE.redo = [];
    weUndoButtons();
}

function weUnmark() {
    WE.undo.pop();
    weUndoButtons();
}

function weSwap(from, to) {
    if (!from.length) return;
    to.push(wmCopy(WE.m));
    const was = WE.m;
    WE.m = from.pop();
    WE.store.maps[WE.store.maps.indexOf(was)] = WE.m;
    WE.sel = null;
    WE.draft = null;
    weSave();
    if (was.w !== WE.m.w || was.h !== WE.m.h) weBuild(false);
    else weDrawAll();
    weFillMapFields();
    weUndoButtons();
}

function weUndoButtons() {
    $('we-undo').disabled = !WE.undo.length;
    $('we-redo').disabled = !WE.redo.length;
}

// ── The maps ──────────────────────────────────────────────
function weOpen(id) {
    if (WE.dirty) weSaveNow();
    WE.m = WE.store.maps.find(m => m.id === id) || WE.store.maps[0];
    WE.store.cur = WE.m.id;
    WE.undo = [];
    WE.redo = [];
    WE.sel = null;
    WE.draft = null;
    WE.ruler = null;
    weUndoButtons();
    weFillMapFields();
    weBuild(true);
}

function weMapOptions() {
    const sel = $('we-maps');
    sel.innerHTML = WE.store.maps.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
    sel.value = WE.m.id;
}

function weSizeKey(m) {
    return Object.keys(WM_SIZES).find(k => WM_SIZES[k][1] === m.w && WM_SIZES[k][2] === m.h) || '';
}

function weFillMapFields() {
    const m = WE.m, lk = m.lk, st = WM_COLORS[m.style];
    weMapOptions();
    $('we-name').value = m.name;
    const size = $('we-size'), key = weSizeKey(m);
    size.querySelector('[data-custom]')?.remove();
    if (!key) size.insertAdjacentHTML('beforeend', `<option value="" data-custom>${m.w * WM_CELL} × ${m.h * WM_CELL}</option>`);
    size.value = key;
    $('we-style').value = m.style;
    ['sea', 'land', 'coast'].forEach(k => { $('we-lk-' + k).value = lk[k] || st[k] || st.pick[k]; });
    $('we-lk-cw').value = lk.cw;
    $('we-lk-ro').value = lk.ro;
    $('we-lk-sh').checked = !!lk.sh;
    $('we-lk-fr').value = lk.fr;
    $('we-lk-gr').value = lk.gr;
    $('we-lk-gs').value = lk.gs;
    $('we-lk-go').value = lk.go;
    $('we-lk-mi').value = lk.mi || '';
    $('we-lk-sb').checked = !!lk.sb;
    weLookOutputs();
}

function weLookOutputs() {
    const lk = WE.m.lk;
    document.querySelectorAll('#we-look output[data-for]').forEach(o => {
        const k = o.dataset.for;
        o.textContent = k === 'go' ? Math.round(lk.go * 100) + '%' : String(lk[k]);
    });
}

function weAdd(m) {
    if (WE.store.maps.length >= WM_LIMITS.maps) {
        weFlash(`⚠️ You have ${WM_LIMITS.maps} saved maps, the most this page keeps. Delete one first.`, true);
        return false;
    }
    WE.store.maps.unshift(m);
    WE.m = m;
    const saved = weSaveNow();
    weOpen(m.id);
    return saved;
}

// ── The SVG ───────────────────────────────────────────────
function weBuild(fit) {
    const m = WE.m, W = m.w * WM_CELL, H = m.h * WM_CELL;
    $('we-canvas').innerHTML = `<svg id="we-svg" class="wm-map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(m.name)}">
        <defs>${wmDefs('we')}</defs>
        <g id="we-g-base"></g><g id="we-g-lines"></g><g id="we-g-icons"></g><g id="we-g-text"></g><g id="we-g-frame"></g><g id="we-g-ui"></g>
    </svg>`;
    if (fit) weFit(); else weZoomTo(WE.zoom);
    weDrawAll();
}

function weDrawBase(q = 2) { $('we-g-base').innerHTML = wmBaseSvg(WE.m, 'we', q); }
function weDrawLines() { $('we-g-lines').innerHTML = wmLinesSvg(WE.m, 'we', true); }
function weDrawIcons() { $('we-g-icons').innerHTML = wmIconsSvg(WE.m, 'we'); }
function weDrawTexts() { $('we-g-text').innerHTML = wmTextsSvg(WE.m, 'we'); }
function weDrawFrame() { $('we-g-frame').innerHTML = wmFrameSvg(WE.m, 'we'); }

function weDrawAll() {
    weDrawBase();
    weDrawLines();
    weDrawIcons();
    weDrawTexts();
    weDrawFrame();
    weDrawUi();
    weInspector();
}

function weDrawLayer(type) {
    if (type === 'ic') weDrawIcons();
    else if (type === 'tx') weDrawTexts();
    else weDrawLines();
}

function weItemHtml(type, i) {
    const m = WE.m;
    return type === 'ic' ? wmIconSvg(m.ic[i], i, 'we') : type === 'tx' ? wmTextSvg(m.tx[i], i, 'we') : wmLineSvg(m.ln[i], i, 'we', true, wmHasLand(m));
}

// Just the one thing redrawn (while it's dragged or restyled).
function weRedrawItem(type, i) {
    const el = document.querySelector(`#we-svg [data-wm="${type}:${i}"]`);
    if (el) el.outerHTML = weItemHtml(type, i);
    else weDrawLayer(type);
}

// The base again on the next frame (painting asks for it on every move).
function weQueueBase() {
    if (WE.raf) return;
    WE.raf = requestAnimationFrame(() => { WE.raf = 0; weDrawBase(1); });
}

// ── The selection, ghosts, the line being drawn, the ruler ──
function weSelected() {
    if (!WE.sel) return null;
    const list = WE.sel.type === 'ic' ? WE.m.ic : WE.sel.type === 'tx' ? WE.m.tx : WE.m.ln;
    return list[WE.sel.i] || null;
}

function weDrawUi() {
    const ui = $('we-g-ui');
    if (!ui) return;
    const k = 1 / WE.zoom, out = [], s = weSelected();
    if (s && WE.sel.type === 'ln') {
        out.push(`<path class="we-sel" d="${wmLinePath(s)}"/>`);
        const n = s.p.length;
        for (let j = 0; j < (s.cl ? n : n - 1); j++) {
            const a = s.p[j], b = s.p[(j + 1) % n];
            out.push(`<circle class="we-mid" data-h="m:${j}" cx="${wmF((a[0] + b[0]) / 2)}" cy="${wmF((a[1] + b[1]) / 2)}" r="${wmF(4 * k)}"/>`);
        }
        s.p.forEach((q, j) => out.push(`<circle class="we-vtx" data-h="v:${j}" cx="${wmF(q[0])}" cy="${wmF(q[1])}" r="${wmF(5.5 * k)}"/>`));
    } else if (s) {
        const el = document.querySelector(`#we-svg [data-wm="${WE.sel.type}:${WE.sel.i}"]`);
        let bb = null;
        try { bb = el ? el.getBBox() : null; } catch (e) {}
        if (bb) {
            const pad = 3 * k, x = bb.x - pad, y = bb.y - pad, w = bb.width + pad * 2, h = bb.height + pad * 2;
            const tr = WE.sel.type === 'ic' ? wmIconTransform(s) : `translate(${wmF(s.x)} ${wmF(s.y)})${s.r ? ` rotate(${s.r})` : ''}`;
            out.push(`<g transform="${tr}"><rect class="we-sel" x="${wmF(x)}" y="${wmF(y)}" width="${wmF(w)}" height="${wmF(h)}"/>`
                + `<line class="we-sel" x1="0" y1="${wmF(y)}" x2="0" y2="${wmF(y - 20 * k)}"/>`
                + `<circle class="we-handle we-rot" data-h="rot" cx="0" cy="${wmF(y - 20 * k)}" r="${wmF(6 * k)}"/>`
                + `<rect class="we-handle" data-h="scale" x="${wmF(x + w - 5 * k)}" y="${wmF(y + h - 5 * k)}" width="${wmF(10 * k)}" height="${wmF(10 * k)}"/></g>`);
        }
    }
    const d = WE.draft;
    if (d) {
        const pts = WE.hover && WE.hover.pt && !WE.drag ? d.pts.concat([WE.hover.pt]) : d.pts;
        if (pts.length > 1) out.push(`<g class="we-ghost">${wmLineSvg(wmNewLine(d.k, pts, false), -1, 'we-d', false, false)}</g>`);
        d.pts.forEach((q, j) => out.push(`<circle class="we-vtx${j === 0 && d.pts.length >= 3 ? ' we-first' : ''}" cx="${wmF(q[0])}" cy="${wmF(q[1])}" r="${wmF((j === 0 ? 5 : 3.5) * k)}"/>`));
    }
    const h = WE.hover;
    if (h && !WE.drag) {
        if (h.brush) out.push(`<circle class="we-brush${h.rub ? ' we-rub' : ''}" cx="${wmF(h.brush[0])}" cy="${wmF(h.brush[1])}" r="${wmF(h.brush[2])}"/>`);
        if (h.icon) out.push(`<g class="we-ghost">${wmIconSvg(h.icon, -1, 'we-h')}</g>`);
    }
    if (WE.drag && WE.drag.kind === 'scatter' && h && h.brush) out.push(`<circle class="we-brush" cx="${wmF(h.brush[0])}" cy="${wmF(h.brush[1])}" r="${wmF(h.brush[2])}"/>`);
    const r = WE.ruler;
    if (r) {
        const fs = 14 * k;
        out.push(`<line class="we-ruler" x1="${wmF(r.a.x)}" y1="${wmF(r.a.y)}" x2="${wmF(r.b.x)}" y2="${wmF(r.b.y)}" style="stroke-width:${wmF(2 * k)}"/>`,
            `<circle class="we-ruler-end" cx="${wmF(r.a.x)}" cy="${wmF(r.a.y)}" r="${wmF(3.5 * k)}"/><circle class="we-ruler-end" cx="${wmF(r.b.x)}" cy="${wmF(r.b.y)}" r="${wmF(3.5 * k)}"/>`,
            `<text class="we-ruler-text" x="${wmF(r.b.x)}" y="${wmF(r.b.y - fs)}" style="font-size:${wmF(fs)}px">${esc(weRulerText(r))}</text>`);
    }
    ui.innerHTML = out.join('');
}

// ── Zoom and the stage ────────────────────────────────────
function weZoomTo(z, about = null) {
    const stage = $('we-stage'), svg = $('we-svg');
    if (!svg) return;
    z = Math.max(WE_ZOOM.min, Math.min(WE_ZOOM.max, z));
    let keep = null;
    if (about) {
        const r = svg.getBoundingClientRect();
        keep = { fx: (about.x - r.left) / r.width, fy: (about.y - r.top) / r.height, cx: about.x, cy: about.y };
    }
    WE.zoom = z;
    svg.setAttribute('width', Math.round(WE.m.w * WM_CELL * z));
    svg.setAttribute('height', Math.round(WE.m.h * WM_CELL * z));
    if (keep) {
        const r = svg.getBoundingClientRect();
        stage.scrollLeft += r.left + keep.fx * r.width - keep.cx;
        stage.scrollTop += r.top + keep.fy * r.height - keep.cy;
    }
    $('we-zoom-val').textContent = `${Math.round(z * 100)}%`;
    weDrawUi();
}

function weFit() {
    const stage = $('we-stage'), m = WE.m;
    weZoomTo(Math.min((stage.clientWidth - 24) / (m.w * WM_CELL), (stage.clientHeight - 24) / (m.h * WM_CELL)));
}

// The pointer in map units.
function wePoint(e) {
    const svg = $('we-svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
}

function weOnMap(p) {
    return p.x >= 0 && p.y >= 0 && p.x <= WE.m.w * WM_CELL && p.y <= WE.m.h * WM_CELL;
}

// ── Tools ─────────────────────────────────────────────────
function weSetTool(t) {
    if (!WE_TOOLS[t]) return;
    if (WE.draft && t !== 'line') weFinishDraft();
    WE.tool = t;
    WE.hover = null;
    if (t !== 'ruler') WE.ruler = null;
    document.querySelectorAll('#we-tools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
    document.querySelectorAll('.we-opt').forEach(p => { p.hidden = p.dataset.for !== t; });
    $('we-stage').classList.toggle('we-panning', t === 'pan');
    weDrawUi();
}

function weStroke(d, p) {
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - d.last.x, p.y - d.last.y) / (WM_CELL * 0.5)));
    let hit = false;
    for (let k = 1; k <= steps; k++) {
        const x = d.last.x + (p.x - d.last.x) * k / steps, y = d.last.y + (p.y - d.last.y) * k / steps;
        if (wmPaint(WE.m, d.grid, x, y, d.r, d.v)) hit = true;
    }
    d.last = p;
    return hit;
}

function weRulerText(r) {
    const units = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y), mi = WE.m.lk.mi;
    if (!mi) return `${Math.round(units / WM_CELL)} cells (set the miles across the map)`;
    const miles = units / (WE.m.w * WM_CELL) * mi;
    const round = v => v >= 100 ? Math.round(v / 5) * 5 : Math.round(v);
    const days = miles / 24;
    return `${round(miles).toLocaleString('en-US')} miles · ${days < 1 ? 'under a day' : `${Math.round(days * 2) / 2} days`} on foot`;
}

// Erase what's under the pointer, and icons and labels inside the brush. True if anything went.
function weRubAt(p, target) {
    const m = WE.m, r = WE.erase * WM_CELL;
    let hit = false;
    const item = target && target.closest ? target.closest('[data-wm]') : null;
    if (item) {
        const [type, si] = item.dataset.wm.split(':'), i = +si;
        const list = type === 'ic' ? m.ic : type === 'tx' ? m.tx : m.ln;
        if (i >= 0 && list[i]) { list.splice(i, 1); hit = true; weDrawLayer(type); }
    }
    const ic = m.ic.filter(o => Math.hypot(o.x - p.x, o.y - p.y) > r);
    if (ic.length !== m.ic.length) { m.ic = ic; hit = true; weDrawIcons(); }
    const tx = m.tx.filter(o => Math.hypot(o.x - p.x, o.y - p.y) > r);
    if (tx.length !== m.tx.length) { m.tx = tx; hit = true; weDrawTexts(); }
    if (hit) WE.sel = null;
    return hit;
}

// ── Lines: the one being drawn ────────────────────────────
// Douglas-Peucker: the points that matter, within eps units.
function weSimplify(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        const [ax, ay] = pts[a], [bx, by] = pts[b], L = Math.hypot(bx - ax, by - ay) || 1;
        let far = -1, fd = eps;
        for (let i = a + 1; i < b; i++) {
            const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
            if (d > fd) { fd = d; far = i; }
        }
        if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
    }
    return pts.filter((q, i) => keep[i]);
}

function weFinishDraft(close = false) {
    const d = WE.draft;
    WE.draft = null;
    if (!d) return;
    const pts = d.pts.filter((q, j) => j === 0 || Math.hypot(q[0] - d.pts[j - 1][0], q[1] - d.pts[j - 1][1]) > 1);
    if (pts.length < 2) { weDrawUi(); return; }
    if (WE.m.ln.length >= WM_LIMITS.lines) { weFlash(`⚠️ A map holds up to ${WM_LIMITS.lines} lines.`); weDrawUi(); return; }
    weMark();
    const l = wmNewLine(d.k, pts.slice(0, WM_LIMITS.pts), close);
    if (d.free) l.sm = 1;
    WE.m.ln.push(l);
    WE.sel = { type: 'ln', i: WE.m.ln.length - 1 };
    weDrawLines();
    weDrawUi();
    weInspector();
    weSave();
}

// ── Putting things down ───────────────────────────────────
function wePlaceIcon(k, p) {
    if (WE.m.ic.length >= WM_LIMITS.icons) { weFlash(`⚠️ A map holds up to ${WM_LIMITS.icons} icons.`); return null; }
    WE.m.ic.push(wmNewIcon(k, p.x, p.y, WE.iscale));
    return WE.m.ic.length - 1;
}

function wePlaceText(k, p) {
    if (WE.m.tx.length >= WM_LIMITS.texts) { weFlash(`⚠️ A map holds up to ${WM_LIMITS.texts} labels.`); return null; }
    WE.m.tx.push(wmNewText(k, p.x, p.y));
    return WE.m.tx.length - 1;
}

// After a label goes down: its text ready to type over.
function weEditText() {
    setTimeout(() => { const t = $('we-i-t'); if (t) { t.focus(); t.select(); } }, 0);
}

// ── The pointer ───────────────────────────────────────────
function weStartPan(e) {
    const stage = $('we-stage');
    WE.drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
}

function weDown(e) {
    const svg = $('we-svg');
    if (!svg) return;
    const m = WE.m, p = wePoint(e), t = WE.tool;
    if (t === 'pan' || WE.space || e.button === 1) {
        e.preventDefault();
        weStartPan(e);
        svg.setPointerCapture(e.pointerId);
        return;
    }
    if (e.button > 2) return;
    e.preventDefault();
    const rub = e.button === 2 || e.shiftKey;
    const handle = e.target.closest('[data-h]'), item = e.target.closest('[data-wm]');
    svg.setPointerCapture(e.pointerId);
    WE.hover = null;
    // A selected thing's handles work with any tool.
    if (handle && weSelected()) {
        const s = weSelected(), h = handle.dataset.h;
        weMark();
        if (h === 'scale') {
            const d0 = Math.hypot(p.x - s.x, p.y - s.y) || 1;
            WE.drag = { kind: 'scale', d0, v0: WE.sel.type === 'ic' ? s.w : s.s };
        } else if (h === 'rot') {
            WE.drag = { kind: 'rot' };
        } else {
            const [kind, sj] = h.split(':'), j = +sj;
            if (kind === 'v' && e.button === 2) {
                // Right-click a point: take it out.
                if (s.p.length > 2) { s.p.splice(j, 1); if (s.p.length < 3) s.cl = 0; weRedrawItem('ln', WE.sel.i); weDrawUi(); weSave(); }
                else weUnmark();
                return;
            }
            let at = j;
            if (kind === 'm') {
                const a = s.p[j], b = s.p[(j + 1) % s.p.length];
                s.p.splice(j + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
                at = j + 1;
            }
            WE.drag = { kind: 'vertex', j: at };
        }
        return;
    }
    if (t === 'select') {
        if (item) {
            const [type, si] = item.dataset.wm.split(':');
            WE.sel = { type, i: +si };
            const s = weSelected();
            WE.drag = { kind: 'move', from: p, orig: type === 'ln' ? s.p.map(q => q.slice()) : [s.x, s.y], moved: false };
        } else {
            WE.sel = null;
            weStartPan(e);
        }
        weDrawUi();
        weInspector();
    } else if (t === 'land' || t === 'terrain') {
        if (!weOnMap(p)) return;
        weMark();
        const land = t === 'land';
        const v = land ? (rub || WE.lmode === 'sea' ? 0 : 1) : (rub ? 0 : WE.bio);
        WE.drag = { kind: 'paint', grid: land ? m.land : m.bio, v, r: land ? WE.brush : WE.tbrush, last: p, hit: false };
        WE.drag.hit = weStroke(WE.drag, p);
        weQueueBase();
    } else if (t === 'icon') {
        if (!weOnMap(p)) return;
        weMark();
        const i = wePlaceIcon(WE.icon, p);
        if (i === null) { weUnmark(); return; }
        if (WE.scatter && WM_ICONS[WE.icon].terrain) {
            WE.drag = { kind: 'scatter', last: p };
            WE.sel = null;
            weDrawIcons();
        } else {
            WE.sel = { type: 'ic', i };
            WE.drag = { kind: 'move', from: p, orig: [p.x, p.y], moved: true };
            weDrawIcons();
            weInspector();
        }
        weSave();
    } else if (t === 'text') {
        if (!weOnMap(p)) return;
        weMark();
        const i = wePlaceText(WE.text, p);
        if (i === null) { weUnmark(); return; }
        WE.sel = { type: 'tx', i };
        WE.drag = { kind: 'move', from: p, orig: [p.x, p.y], moved: true, edit: true };
        weDrawTexts();
        weInspector();
        weSave();
    } else if (t === 'line') {
        const d = WE.draft;
        if (d && d.pts.length >= 3) {
            const [fx, fy] = d.pts[0];
            if (Math.hypot(p.x - fx, p.y - fy) * WE.zoom < 10) { weFinishDraft(true); return; }
        }
        if (!d) WE.draft = { k: WE.line, pts: [[p.x, p.y]], free: false };
        else d.pts.push([p.x, p.y]);
        WE.drag = { kind: 'draw', cx: e.clientX, cy: e.clientY, fresh: !d };
        weDrawUi();
    } else if (t === 'erase') {
        weMark();
        WE.drag = { kind: 'rub', hit: weRubAt(p, e.target) };
        weDrawUi();
        weInspector();
    } else if (t === 'ruler') {
        WE.ruler = { a: p, b: p };
        WE.drag = { kind: 'ruler' };
        weDrawUi();
    }
}

function weMove(e) {
    if (!$('we-svg')) return;
    const d = WE.drag, p = wePoint(e), m = WE.m;
    if (!d) { weHoverAt(p, e); return; }
    if (d.kind === 'pan') {
        const stage = $('we-stage');
        stage.scrollLeft = d.sl - (e.clientX - d.cx);
        stage.scrollTop = d.st - (e.clientY - d.cy);
    } else if (d.kind === 'paint') {
        if (weStroke(d, p)) { d.hit = true; weQueueBase(); }
        WE.hover = { brush: [p.x, p.y, d.r * WM_CELL] };
        weDrawUi();
    } else if (d.kind === 'scatter') {
        const it = WM_ICONS[WE.icon], gap = it.w * WE.iscale * 0.8;
        if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= gap) {
            const jx = (Math.random() - 0.5) * gap * 0.5, jy = (Math.random() - 0.5) * gap * 0.5;
            const i = wePlaceIcon(WE.icon, { x: p.x + jx, y: p.y + jy });
            if (i !== null) $('we-g-icons').insertAdjacentHTML('beforeend', wmIconSvg(m.ic[i], i, 'we'));
            d.last = p;
        }
    } else if (d.kind === 'move') {
        const s = weSelected();
        if (!s) return;
        const dx = p.x - d.from.x, dy = p.y - d.from.y;
        if (!d.moved) {
            if (Math.hypot(dx, dy) * WE.zoom < 3) return;
            weMark();
            d.moved = true;
        }
        if (WE.sel.type === 'ln') s.p = d.orig.map(q => [q[0] + dx, q[1] + dy]);
        else { s.x = d.orig[0] + dx; s.y = d.orig[1] + dy; }
        weRedrawItem(WE.sel.type, WE.sel.i);
        weDrawUi();
    } else if (d.kind === 'scale') {
        const s = weSelected(), f = Math.hypot(p.x - s.x, p.y - s.y) / d.d0;
        if (WE.sel.type === 'ic') s.w = Math.max(4, Math.min(900, Math.round(d.v0 * f * 10) / 10));
        else s.s = Math.max(4, Math.min(300, Math.round(d.v0 * f)));
        weRedrawItem(WE.sel.type, WE.sel.i);
        weDrawUi();
    } else if (d.kind === 'rot') {
        const s = weSelected();
        let a = Math.atan2(p.y - s.y, p.x - s.x) * 180 / Math.PI + 90;
        if (e.shiftKey) a = Math.round(a / 15) * 15;
        s.r = wmAngle(a);
        weRedrawItem(WE.sel.type, WE.sel.i);
        weDrawUi();
    } else if (d.kind === 'vertex') {
        const s = weSelected();
        s.p[d.j] = [p.x, p.y];
        weRedrawItem('ln', WE.sel.i);
        weDrawUi();
    } else if (d.kind === 'draw') {
        const dr = WE.draft;
        if (!dr) return;
        // A drag (rather than a click) draws freehand.
        if (!d.free && d.fresh && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 6) { d.free = true; dr.free = true; }
        if (d.free) {
            const last = dr.pts[dr.pts.length - 1];
            if (Math.hypot(p.x - last[0], p.y - last[1]) * WE.zoom > 4) dr.pts.push([p.x, p.y]);
        } else {
            dr.pts[dr.pts.length - 1] = [p.x, p.y];
        }
        weDrawUi();
    } else if (d.kind === 'rub') {
        if (weRubAt(p, document.elementFromPoint(e.clientX, e.clientY))) d.hit = true;
        WE.hover = { brush: [p.x, p.y, WE.erase * WM_CELL], rub: true };
        weDrawUi();
    } else if (d.kind === 'ruler') {
        WE.ruler.b = p;
        weDrawUi();
    }
}

function weUp() {
    const d = WE.drag;
    WE.drag = null;
    if (!d) return;
    if (d.kind === 'paint') {
        if (WE.raf) { cancelAnimationFrame(WE.raf); WE.raf = 0; }
        if (d.hit) { weDrawBase(); weDrawLines(); weSave(); } else weUnmark();
    } else if (d.kind === 'scatter') {
        weDrawIcons();
        weSave();
    } else if (d.kind === 'move') {
        if (d.moved) { weDrawLayer(WE.sel.type); weSave(); }
        weInspector();
        if (d.edit) weEditText();
    } else if (d.kind === 'scale' || d.kind === 'rot' || d.kind === 'vertex') {
        weDrawLayer(WE.sel.type);
        weInspector();
        weSave();
    } else if (d.kind === 'draw') {
        if (d.free && WE.draft) {
            WE.draft.pts = weSimplify(WE.draft.pts, 2 / WE.zoom);
            weFinishDraft(WM_LINES[WE.draft.k].cl === 1);
            return;
        }
    } else if (d.kind === 'rub') {
        if (d.hit) weSave(); else weUnmark();
    }
    weDrawUi();
}

function weHoverAt(p, e) {
    const t = WE.tool;
    let h = null;
    if (weOnMap(p)) {
        if (t === 'land') h = { brush: [p.x, p.y, WE.brush * WM_CELL], rub: e.shiftKey || WE.lmode === 'sea' };
        else if (t === 'terrain') h = { brush: [p.x, p.y, WE.tbrush * WM_CELL], rub: e.shiftKey };
        else if (t === 'erase') h = { brush: [p.x, p.y, WE.erase * WM_CELL], rub: true };
        else if (t === 'icon') h = { icon: wmNewIcon(WE.icon, p.x, p.y, WE.iscale, () => 0) };
    }
    if (t === 'line' && WE.draft) h = { pt: [p.x, p.y] };
    WE.hover = h;
    weDrawUi();
}

// ── The inspector: whatever is selected ───────────────────
const WE_CLAMP = { ic: { w: [4, 900], r: [-180, 180] }, tx: { s: [4, 300], ls: [-10, 100], r: [-180, 180], cv: [-100, 100] }, ln: { w: [0.5, 40], fo: [0, 1] } };

function weRange(label, k, v, lo, hi, step, shown = v) {
    return `<label class="we-f">${label} <span class="we-range"><input type="range" data-k="${k}" min="${lo}" max="${hi}" step="${step}" value="${v}"><output>${shown}</output></span></label>`;
}

function weInspector() {
    const box = $('we-inspect'), s = weSelected();
    if (!s) {
        box.innerHTML = WE.tool === 'select' ? '<p class="we-hint">Click an icon, a label, or a line to pick it up. Drag it to move it; drag the square handle to resize it and the round one to turn it.</p>' : '';
        return;
    }
    const type = WE.sel.type;
    const btns = `<div class="we-row">
        <button type="button" class="btn" data-act="dup" title="Duplicate (Ctrl+D)">⧉ Duplicate</button>
        <button type="button" class="btn" data-act="back" title="Under the rest">⤓ To back</button>
        <button type="button" class="btn" data-act="front" title="Over the rest">⤒ To front</button>
        <button type="button" class="btn" data-act="del" title="Delete">🗑️ Delete</button></div>`;
    if (type === 'ic') {
        const it = WM_ICONS[s.k];
        let extra = '';
        if (it.n) extra = `<div class="we-f">Picture <span class="we-variants">${Array.from({ length: it.n }, (_, k) =>
            `<button type="button" data-act="var:${k + 1}" aria-pressed="${s.v === k + 1}"><img src="${WM_ART_DIR}${it.file}-${k + 1}.webp" alt="${k + 1}" width="34" height="30"></button>`).join('')}</span></div>`;
        if (it.arms) extra = `<div class="we-row"><label class="we-f">Field <input type="color" data-k="fc" value="${s.fc}"></label><label class="we-f">Charge <input type="color" data-k="tc" value="${s.tc}"></label></div>`;
        box.innerHTML = `<h3>${esc(it.label)}</h3>
            ${weRange('Size', 'w', s.w, 4, Math.max(400, Math.ceil(s.w)), 1)}
            ${weRange('Turned', 'r', s.r, -180, 180, 1, s.r + '°')}
            <label class="we-check"><input type="checkbox" data-k="fx"${s.fx ? ' checked' : ''}> Flipped</label>
            ${extra}${btns}`;
    } else if (type === 'tx') {
        box.innerHTML = `<h3>🔤 Label</h3>
            <label class="we-f">Text <textarea id="we-i-t" data-k="t" rows="2" maxlength="${WM_LIMITS.text}">${esc(s.t)}</textarea></label>
            <div class="we-row">
                <label class="we-f">Font <select data-k="f">${Object.entries(WM_FONTS).map(([k, f]) => `<option value="${k}"${k === s.f ? ' selected' : ''}>${esc(f[0])}</option>`).join('')}</select></label>
                <label class="we-f">Color <input type="color" data-k="c" value="${s.c}"></label>
            </div>
            ${weRange('Size', 's', s.s, 4, Math.max(120, s.s), 1)}
            <div class="we-row">
                <label class="we-check"><input type="checkbox" data-k="b"${s.b ? ' checked' : ''}> <b>Bold</b></label>
                <label class="we-check"><input type="checkbox" data-k="i"${s.i ? ' checked' : ''}> <i>Italic</i></label>
                <label class="we-check"><input type="checkbox" data-k="u"${s.u ? ' checked' : ''}> CAPITALS</label>
            </div>
            <div class="we-row">
                <label class="we-check"><input type="checkbox" data-k="hon"${s.h ? ' checked' : ''}> Halo</label>
                <input type="color" data-k="h" value="${s.h || '#f0e6c8'}" aria-label="Halo color"${s.h ? '' : ' disabled'}>
            </div>
            ${weRange('Letter spacing', 'ls', s.ls, -10, 100, 1)}
            ${weRange('Curve', 'cv', s.cv, -100, 100, 1)}
            ${weRange('Turned', 'r', s.r, -180, 180, 1, s.r + '°')}
            ${s.cv && s.t.includes('\n') ? '<p class="we-hint">A curve bends one line of text; this label has more.</p>' : ''}
            ${btns}`;
    } else {
        box.innerHTML = `<h3>✒️ Line</h3>
            <div class="we-row">
                <label class="we-f">Color <input type="color" data-k="c" value="${s.c}"></label>
                <label class="we-f">Style <select data-k="d">${Object.entries(WM_DASHES).map(([k, v]) => `<option value="${k}"${k === s.d ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
            </div>
            ${weRange('Width', 'w', s.w, 0.5, 40, 0.5)}
            <div class="we-row">
                <label class="we-check"><input type="checkbox" data-k="sm"${s.sm ? ' checked' : ''}> Smooth curve</label>
                <label class="we-check"><input type="checkbox" data-k="gl"${s.gl ? ' checked' : ''}> Soft band</label>
                <label class="we-check"><input type="checkbox" data-k="cl"${s.cl ? ' checked' : ''}${s.p.length < 3 ? ' disabled' : ''}> Closed shape</label>
            </div>
            ${s.cl ? `<div class="we-row">
                <label class="we-check"><input type="checkbox" data-k="flon"${s.fl ? ' checked' : ''}> Fill</label>
                <input type="color" data-k="fl" value="${s.fl || '#c0503a'}" aria-label="Fill color"${s.fl ? '' : ' disabled'}>
                <label class="we-check"><input type="checkbox" data-k="lc"${s.lc ? ' checked' : ''}> Only on land</label>
            </div>
            ${s.fl ? weRange('Fill strength', 'fo', s.fo, 0, 1, 0.01, Math.round(s.fo * 100) + '%') : ''}` : ''}
            <p class="we-hint">Drag a point to move it, click a small dot between two points to add one, and right-click a point to take it out.</p>
            ${btns}`;
    }
}

function weInspectInput(e) {
    const el = e.target, k = el.dataset.k, s = weSelected();
    if (!k || !s) return;
    const type = WE.sel.type;
    let v;
    if (k === 't') {
        v = wmText(el.value, WM_LIMITS.text);
        if (!v) return;
    } else if (el.type === 'checkbox') {
        v = el.checked ? 1 : 0;
    } else if (el.type === 'range' || el.type === 'number') {
        v = parseFloat(el.value);
        if (!Number.isFinite(v)) return;
        const c = (WE_CLAMP[type] || {})[k];
        if (c) v = Math.max(c[0], Math.min(c[1], v));
        const out = el.parentElement.querySelector('output');
        if (out) out.textContent = k === 'r' ? v + '°' : k === 'fo' ? Math.round(v * 100) + '%' : String(v);
    } else {
        v = el.value;
    }
    if (!WE.inspectMarked) { weMark(); WE.inspectMarked = true; }
    // The halo and fill switches turn their color on or off.
    if (k === 'hon') s.h = v ? (el.parentElement.parentElement.querySelector('[data-k="h"]').value || '#f0e6c8') : '';
    else if (k === 'flon') s.fl = v ? (el.parentElement.parentElement.querySelector('[data-k="fl"]').value || '#c0503a') : '';
    else if (k === 'cl' && v && s.p.length < 3) return;
    else s[k] = v;
    if (k === 'cl' && v && !s.fl) { s.fl = WM_LINES.region.fl; s.fo = WM_LINES.region.fo; }
    weRedrawItem(type, WE.sel.i);
    weDrawUi();
    weSave();
    // Switches that show or hide other fields.
    if (['hon', 'flon', 'cl', 'cv', 'fx'].includes(k) && e.type === 'change') weInspector();
}

function weAct(act) {
    const s = weSelected(), m = WE.m;
    if (!s) return;
    const type = WE.sel.type, list = type === 'ic' ? m.ic : type === 'tx' ? m.tx : m.ln;
    weMark();
    if (act === 'del') { list.splice(WE.sel.i, 1); WE.sel = null; }
    if (act === 'dup') {
        const off = 16;
        const c = type === 'ln' ? { ...s, p: s.p.map(q => [q[0] + off, q[1] + off]) } : { ...s, x: s.x + off, y: s.y + off };
        list.push(c);
        WE.sel = { type, i: list.length - 1 };
    }
    if (act === 'back' || act === 'front') {
        list.splice(WE.sel.i, 1);
        if (act === 'back') list.unshift(s); else list.push(s);
        WE.sel.i = act === 'back' ? 0 : list.length - 1;
    }
    if (act.startsWith('var:')) s.v = +act.slice(4);
    if (act === 'turn' || act === 'unturn') s.r = wmAngle((s.r || 0) + (act === 'turn' ? 15 : -15));
    if (type === 'ln' && (act === 'turn' || act === 'unturn')) { weUnmark(); return; }
    weDrawLayer(type);
    weDrawUi();
    weInspector();
    weSave();
}

function weNudge(dx, dy) {
    const s = weSelected();
    if (!s) return;
    weMark();
    if (WE.sel.type === 'ln') s.p = s.p.map(q => [q[0] + dx, q[1] + dy]);
    else { s.x += dx; s.y += dy; }
    weRedrawItem(WE.sel.type, WE.sel.i);
    weDrawUi();
    weSave();
}

// ── Keys ──────────────────────────────────────────────────
function weKey(e) {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (typing) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) weSwap(WE.redo, WE.undo); else weSwap(WE.undo, WE.redo); return; }
    if (ctrl && k === 'y') { e.preventDefault(); weSwap(WE.redo, WE.undo); return; }
    if (ctrl && k === 'd') { e.preventDefault(); weAct('dup'); return; }
    if (ctrl || e.altKey) return;
    if (WE.draft) {
        if (k === 'enter') { e.preventDefault(); weFinishDraft(); return; }
        if (k === 'escape') { WE.draft = null; weDrawUi(); return; }
        if (k === 'backspace') { e.preventDefault(); WE.draft.pts.pop(); if (!WE.draft.pts.length) WE.draft = null; weDrawUi(); return; }
    }
    if (k === ' ') { e.preventDefault(); WE.space = true; $('we-stage').classList.add('we-panning'); return; }
    if (k === 'escape') { WE.sel = null; WE.ruler = null; weDrawUi(); weInspector(); return; }
    if ((k === 'delete' || k === 'backspace') && weSelected()) { e.preventDefault(); weAct('del'); return; }
    if (k === 'r' && weSelected()) { e.preventDefault(); weAct(e.shiftKey ? 'unturn' : 'turn'); return; }
    const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
    if (arrows[k] && weSelected()) { e.preventDefault(); const n = e.shiftKey ? 10 : 1; weNudge(arrows[k][0] * n, arrows[k][1] * n); return; }
    if (k === '=' || k === '+') { weZoomTo(WE.zoom * 1.25); return; }
    if (k === '-') { weZoomTo(WE.zoom / 1.25); return; }
    if (k === '0') { weFit(); return; }
    const tool = Object.keys(WE_TOOLS).find(t => WE_TOOLS[t].key === k);
    if (tool) weSetTool(tool);
}

// ── Out: link, PNG, print ─────────────────────────────────
async function weCopyLink() {
    const p = wmPack(WE.m);
    delete p.id;
    delete p.t;
    const code = await packShareCode(p);
    const url = new URL('fantasy-world-map-maker', location.href);
    url.hash = 'm=' + code;
    try {
        await navigator.clipboard.writeText(url.href);
        weFlash(`🔗 Link copied (${url.href.length.toLocaleString('en-US')} characters). It opens this map as it is now.`);
    } catch (e) {
        weFlash('⚠️ Copy blocked by the browser.');
    }
}

function weDataUrl(blob) {
    return new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(''); r.readAsDataURL(blob); });
}

// The label fonts written into the PNG's SVG: a picture drawn from an SVG can't load them
// itself. Only the letters the labels use. Empty when offline (the labels fall back to Georgia).
async function weFontCss(m) {
    const fams = [...new Set(m.tx.map(o => o.f))].filter(f => WM_FONTS[f][2]);
    if (!fams.length) return '';
    const text = [...new Set([...m.tx.map(o => o.t + o.t.toUpperCase()).join('').replace(/\s/g, '')])].join('');
    const css = await Promise.all(fams.map(async f => {
        try {
            const url = `https://fonts.googleapis.com/css2?family=${WM_FONTS[f][0].replace(/ /g, '+')}:${WM_FONTS[f][2]}&text=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok) return '';
            let s = await res.text();
            const urls = [...new Set([...s.matchAll(/url\((https:[^)]+)\)/g)].map(x => x[1]))];
            for (const u of urls) {
                const r = await fetch(u);
                if (!r.ok) return '';
                s = s.split(u).join(await weDataUrl(await r.blob()));
            }
            return s;
        } catch (e) {
            return '';
        }
    }));
    return css.join('\n');
}

async function weDownload() {
    const btn = $('we-png');
    if (btn.disabled) return;
    const m = WE.m, k = Number($('we-px').value) || 1, W = m.w * WM_CELL, H = m.h * WM_CELL;
    const name = `${mapFileSlug(m.name)}.png`;
    btn.disabled = true;
    weFlash('🗺️ Drawing the map…', true);
    const [svg, fonts] = await Promise.all([mapInlineImages(wmSvg(m, { uid: 'wx' })), weFontCss(m)]);
    const ok = await mapExportPng(svg, Math.round(W * k), Math.round(H * k), fonts, name);
    btn.disabled = false;
    const n = v => v.toLocaleString('en-US');
    weFlash(ok ? `⬇️ Saved ${name}: ${n(Math.round(W * k))} × ${n(Math.round(H * k))} pixels.`
        : '⚠️ This browser could not draw a map that big. Try a smaller size.', true);
}

async function wePrint() {
    const m = WE.m, box = $('we-print'), land = m.w >= m.h;
    box.innerHTML = `<style>@page { size: ${land ? 'landscape' : 'portrait'}; margin: 0.4in; }</style><div class="we-sheet${land ? ' we-land' : ''}">${wmSvg(m, { uid: 'wp' })}<p>${esc(m.name)}</p></div>`;
    const hrefs = [...new Set([...box.innerHTML.matchAll(/href="(img\/[^"]+)"/g)].map(x => x[1]))];
    weFlash('🖨️ Getting the page ready…', true);
    await Promise.all(hrefs.map(h => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = h; })));
    await document.fonts.ready;
    weFlash('');
    document.body.classList.add('print-we');
    window.print();
}

// ── Opening a link ────────────────────────────────────────
async function weFromLink() {
    const h = new URLSearchParams(location.hash.slice(1));
    const code = h.get('m');
    if (!code) return;
    let m = null;
    try {
        m = wmClean(await unpackShareCode(code, WM_LIMITS.code, WM_LIMITS.bytes));
    } catch (err) {
        weFlash(err.browser ? '⚠️ This browser is too old to open that map link. Try a newer Chrome, Edge, Firefox, or Safari.' : '⚠️ That map link is broken (cut short when it was copied?).', true);
        return;
    }
    if (!m) { weFlash('⚠️ That map link is broken.', true); return; }
    const same = x => { const a = wmPack(x), b = wmPack(m); delete a.id; delete a.t; delete b.id; delete b.t; return JSON.stringify(a) === JSON.stringify(b); };
    const had = WE.store.maps.find(same);
    if (had) weOpen(had.id);
    else if (!weAdd({ ...m, id: wmId(), t: Date.now() })) return;
    else weFlash(`📥 Opened “${m.name}” and saved it with your maps.`);
    h.delete('m');
    history.replaceState(null, '', location.pathname + location.search + (h.toString() ? '#' + h : ''));
}

// ── Set up ────────────────────────────────────────────────
function wePickers() {
    $('we-tools').innerHTML = Object.entries(WE_TOOLS).map(([t, v]) =>
        `<button type="button" data-tool="${t}" aria-pressed="false" title="${esc(v.label.replace(/^\S+ /, ''))} (${v.key.toUpperCase()})">${v.label}</button>`).join('');
    $('we-bios').innerHTML = WM_BIOMES.map(([, label, color], k) =>
        `<button type="button" class="we-swatch" data-bio="${k + 1}" aria-pressed="false"><span style="background:${color}"></span>${esc(label)}</button>`).join('')
        + '<button type="button" class="we-swatch" data-bio="0" aria-pressed="false"><span class="we-none"></span>🧽 Plain land</button>';
    const iconBtn = k => {
        const it = WM_ICONS[k];
        const pic = it.arms
            ? `<svg viewBox="-50 -60 100 120" width="34" height="40" aria-hidden="true">${wmArmsSvg({ k, w: 100, fc: WM_ARMS[0], tc: WM_ARMS[1] }, 'pal-' + k)}</svg>`
            : `<img src="${WM_ART_DIR}${it.file}${it.n ? '-1' : ''}.webp" alt="" loading="lazy" width="40" height="40" draggable="false">`;
        return `<button type="button" class="we-item" data-icon="${k}" draggable="true" aria-pressed="false" title="${esc(it.label)}: click it, then the map, or drag it onto the map">${pic}<span>${esc(it.label)}</span></button>`;
    };
    $('we-icons').innerHTML = WM_ICON_GROUPS.map(([g, keys]) => `<h4 class="we-group">${esc(g)}</h4>` + keys.map(iconBtn).join('')).join('');
    $('we-lines').innerHTML = Object.entries(WM_LINES).map(([k, l]) =>
        `<button type="button" class="we-pre" data-line="${k}" aria-pressed="false"><svg viewBox="0 0 60 16" width="60" height="16" aria-hidden="true">${wmLineSvg({ ...wmNewLine(k, l.cl ? [[4, 3], [56, 3], [56, 13], [4, 13]] : [[3, 11], [20, 4], [40, 12], [57, 5]], false), w: Math.min(l.w, 3) }, -1, 'pal-' + k)}</svg>${esc(l.label)}</button>`).join('');
    $('we-texts').innerHTML = Object.entries(WM_TEXTS).map(([k, t]) =>
        `<button type="button" class="we-pre" data-text="${k}" draggable="true" aria-pressed="false"><b style="font-family:${t.f === 'deco' ? 'var(--font-display)' : WM_FONTS[t.f][1].replace(/"/g, '')};font-style:${t.i ? 'italic' : 'normal'}">${esc(t.label)}</b></button>`).join('');
    $('we-size').innerHTML = Object.entries(WM_SIZES).map(([k, v]) => `<option value="${k}">${esc(v[0])}</option>`).join('');
    $('we-style').innerHTML = Object.entries(WM_STYLES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('we-lk-fr').innerHTML = Object.entries(WM_FRAMES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('we-lk-gr').innerHTML = Object.entries(WM_GRIDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('we-rand-kind').innerHTML = Object.entries(WM_RANDOM).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    wePressed();
}

function wePressed() {
    document.querySelectorAll('[data-lmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lmode === WE.lmode)));
    document.querySelectorAll('[data-bio]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.bio === WE.bio)));
    document.querySelectorAll('[data-icon]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.icon === WE.icon)));
    document.querySelectorAll('[data-line]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.line === WE.line)));
    document.querySelectorAll('[data-text]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.text === WE.text)));
    $('we-scatter-row').hidden = !WM_ICONS[WE.icon].terrain;
}

// A map look setting changed (the panel over the map).
function weLookInput(e) {
    const el = e.target, k = el.id.replace('we-lk-', '');
    const lk = WE.m.lk;
    if (!(k in lk)) return;
    let v = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.type === 'range' || el.type === 'number' ? parseFloat(el.value) : el.value;
    if (typeof v === 'number' && !Number.isFinite(v)) v = k === 'mi' ? 0 : lk[k];
    if (k === 'mi') v = Math.max(0, Math.min(100000, Math.round(v)));
    if (!WE.lookMarked) { weMark(); WE.lookMarked = true; }
    lk[k] = v;
    weLookOutputs();
    if (['fr', 'sb', 'mi'].includes(k)) weDrawFrame(); else { weDrawBase(); weDrawFrame(); }
    if (k === 'mi') weDrawUi();
    weSave();
}

function weSetup() {
    wePickers();
    WE.store = wmLoadStore();
    if (!WE.store.maps.length) {
        const m = wmBlank(200, 130, 'My world');
        wmRandomLand(m, 'continent', Math.floor(Math.random() * 1e9), true);
        WE.store.maps.push(m);
        WE.store.cur = m.id;
    }
    weOpen(WE.store.cur);
    weSetTool('land');

    $('we-tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) weSetTool(b.dataset.tool); });
    $('we-side').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.lmode) WE.lmode = b.dataset.lmode;
        if (b.dataset.bio !== undefined) WE.bio = +b.dataset.bio;
        if (b.dataset.icon) { WE.icon = b.dataset.icon; if (WE.tool !== 'icon') weSetTool('icon'); }
        if (b.dataset.line) { WE.line = b.dataset.line; if (WE.draft) { WE.draft.k = WE.line; weDrawUi(); } }
        if (b.dataset.text) WE.text = b.dataset.text;
        if (b.dataset.act) weAct(b.dataset.act);
        wePressed();
    });
    // Drag an icon or a label style from the panel onto the map.
    $('we-side').addEventListener('dragstart', e => {
        const b = e.target.closest('[data-icon], [data-text]');
        if (!b) return;
        e.dataTransfer.setData('text/plain', b.dataset.icon ? 'icon:' + b.dataset.icon : 'text:' + b.dataset.text);
        e.dataTransfer.effectAllowed = 'copy';
        const img = b.querySelector('img');
        if (img) e.dataTransfer.setDragImage(img, 20, 20);
    });
    const stage = $('we-stage');
    stage.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    stage.addEventListener('drop', e => {
        e.preventDefault();
        const [kind, key] = (e.dataTransfer.getData('text/plain') || '').split(':');
        const p = wePoint(e);
        if (!weOnMap(p)) return;
        if (kind === 'icon' && wmHas(WM_ICONS, key)) {
            weMark();
            const i = wePlaceIcon(key, p);
            if (i === null) { weUnmark(); return; }
            WE.icon = key;
            weSetTool('select');
            WE.sel = { type: 'ic', i };
            weDrawIcons();
        } else if (kind === 'text' && wmHas(WM_TEXTS, key)) {
            weMark();
            const i = wePlaceText(key, p);
            if (i === null) { weUnmark(); return; }
            WE.text = key;
            weSetTool('select');
            WE.sel = { type: 'tx', i };
            weDrawTexts();
            weEditText();
        } else return;
        wePressed();
        weDrawUi();
        weInspector();
        weSave();
    });

    const insp = $('we-inspect');
    insp.addEventListener('input', weInspectInput);
    insp.addEventListener('change', weInspectInput);
    insp.addEventListener('focusin', () => { WE.inspectMarked = false; });
    insp.addEventListener('pointerdown', () => { WE.inspectMarked = false; });
    $('we-brush').addEventListener('input', e => { WE.brush = +e.target.value; $('we-brush-v').textContent = WE.brush; });
    $('we-tbrush').addEventListener('input', e => { WE.tbrush = +e.target.value; $('we-tbrush-v').textContent = WE.tbrush; });
    $('we-erase').addEventListener('input', e => { WE.erase = +e.target.value; $('we-erase-v').textContent = WE.erase; });
    $('we-iscale').addEventListener('input', e => { WE.iscale = +e.target.value / 100; $('we-iscale-v').textContent = e.target.value + '%'; });
    $('we-scatter').addEventListener('change', e => { WE.scatter = e.target.checked; });
    $('we-rand').addEventListener('click', () => {
        weMark();
        wmRandomLand(WE.m, $('we-rand-kind').value, Math.floor(Math.random() * 1e9), $('we-rand-terrain').checked);
        WE.sel = null;
        weDrawAll();
        weSave();
        weFlash('🎲 New land. Undo brings the old back.');
    });

    const svgHost = $('we-canvas');
    svgHost.addEventListener('pointerdown', weDown);
    svgHost.addEventListener('pointermove', weMove);
    svgHost.addEventListener('pointerup', weUp);
    svgHost.addEventListener('pointercancel', weUp);
    svgHost.addEventListener('pointerleave', () => { if (!WE.drag) { WE.hover = null; weDrawUi(); } });
    svgHost.addEventListener('contextmenu', e => e.preventDefault());
    svgHost.addEventListener('dblclick', e => {
        if (WE.tool === 'line' && WE.draft) { weFinishDraft(); return; }
        if (WE.sel && WE.sel.type === 'tx') weEditText();
    });
    stage.addEventListener('wheel', e => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        weZoomTo(WE.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX, y: e.clientY });
    }, { passive: false });
    document.addEventListener('keydown', weKey);
    document.addEventListener('keyup', e => { if (e.key === ' ') { WE.space = false; $('we-stage').classList.toggle('we-panning', WE.tool === 'pan'); } });

    $('we-zoom-in').addEventListener('click', () => weZoomTo(WE.zoom * 1.25));
    $('we-zoom-out').addEventListener('click', () => weZoomTo(WE.zoom / 1.25));
    $('we-zoom-fit').addEventListener('click', weFit);
    $('we-undo').addEventListener('click', () => weSwap(WE.undo, WE.redo));
    $('we-redo').addEventListener('click', () => weSwap(WE.redo, WE.undo));

    const look = $('we-look');
    look.addEventListener('input', weLookInput);
    look.addEventListener('change', weLookInput);
    look.addEventListener('focusin', () => { WE.lookMarked = false; });
    look.addEventListener('pointerdown', () => { WE.lookMarked = false; });
    look.addEventListener('click', e => {
        const b = e.target.closest('[data-reset]');
        if (!b) return;
        weMark();
        WE.m.lk[b.dataset.reset] = '';
        weFillMapFields();
        weDrawBase();
        weDrawFrame();
        weSave();
    });

    $('we-maps').addEventListener('change', e => weOpen(e.target.value));
    $('we-name').addEventListener('input', e => {
        WE.m.name = e.target.value.replace(/[\u0000-\u001f]/g, ' ').slice(0, WM_LIMITS.name) || 'Untitled world';
        weMapOptions();
        weSave();
    });
    $('we-style').addEventListener('change', e => {
        weMark();
        WE.m.style = e.target.value;
        weFillMapFields();
        weDrawBase();
        weDrawFrame();
        weSave();
    });
    $('we-size').addEventListener('change', e => {
        const v = WM_SIZES[e.target.value];
        if (!v || (v[1] === WE.m.w && v[2] === WE.m.h)) return;
        weMark();
        const i = WE.store.maps.indexOf(WE.m);
        WE.m = WE.store.maps[i] = wmResize(WE.m, v[1], v[2]);
        WE.sel = null;
        weFillMapFields();
        weBuild(true);
        weSave();
        weFlash(`📐 Now ${v[1] * WM_CELL} × ${v[2] * WM_CELL}, grown or trimmed evenly round the edges. Undo puts it back.`);
    });
    $('we-new').addEventListener('click', () => {
        const m = wmBlank(WE.m.w, WE.m.h, 'New world', WE.m.style);
        if (weAdd(m)) weFlash('➕ A new, empty sea. Paint some land, or roll some with 🎲 in the Land tool.');
    });
    $('we-dup').addEventListener('click', () => {
        const m = wmCopy(WE.m);
        if (weAdd({ ...m, id: wmId(), name: (WE.m.name + ' (copy)').slice(0, WM_LIMITS.name), t: Date.now() })) weFlash('⧉ Copied. You are now drawing on the copy.');
    });
    $('we-clear').addEventListener('click', () => {
        weMark();
        const i = WE.store.maps.indexOf(WE.m);
        WE.m = WE.store.maps[i] = { ...wmBlank(WE.m.w, WE.m.h, WE.m.name, WE.m.style), id: WE.m.id, lk: { ...WE.m.lk } };
        WE.sel = null;
        WE.draft = null;
        weDrawAll();
        weSave();
        weFlash('🧽 Cleared. Undo brings it all back.');
    });
    const del = $('we-delete');
    del.addEventListener('click', () => {
        if (!del.dataset.sure) {
            del.dataset.sure = '1';
            del.textContent = '🗑️ Click again to delete';
            setTimeout(() => { delete del.dataset.sure; del.textContent = '🗑️ Delete'; }, 3500);
            return;
        }
        delete del.dataset.sure;
        del.textContent = '🗑️ Delete';
        const name = WE.m.name;
        WE.store.maps = WE.store.maps.filter(m => m !== WE.m);
        if (!WE.store.maps.length) WE.store.maps.push(wmBlank(200, 130, 'My world'));
        WE.m = WE.store.maps[0];
        const saved = weSaveNow();
        weOpen(WE.m.id);
        if (saved) weFlash(`🗑️ Deleted “${name}”.`);
    });

    $('we-link').addEventListener('click', weCopyLink);
    $('we-png').addEventListener('click', weDownload);
    $('we-print-btn').addEventListener('click', wePrint);
    window.addEventListener('afterprint', () => { document.body.classList.remove('print-we'); $('we-print').innerHTML = ''; });
    window.addEventListener('beforeunload', () => { if (WE.dirty) weSaveNow(); });
    window.addEventListener('pagehide', () => { if (WE.dirty) weSaveNow(); });
    // Another tab saved: take its maps (all but the one being drawn on, while this tab has changes on the way).
    window.addEventListener('storage', e => {
        if (e.key !== WM_KEY && e.key !== null) return;
        const store = wmLoadStore(), id = WE.m.id;
        if (WE.dirty) {
            const i = store.maps.findIndex(m => m.id === id);
            if (i >= 0) store.maps[i] = WE.m;
            else store.maps.unshift(WE.m);
            WE.store = store;
            weMapOptions();
            return;
        }
        const fresh = store.maps.find(m => m.id === id);
        const changed = !fresh || JSON.stringify(wmPack(fresh)) !== JSON.stringify(wmPack(WE.m));
        WE.store = store;
        if (!store.maps.length) store.maps.push(wmBlank(200, 130, 'My world'));
        if (changed) { weOpen(fresh ? id : store.maps[0].id); weFlash('🔄 Updated from another tab.'); }
        else { WE.m = fresh; WE.store.cur = id; weMapOptions(); }
    });
    let stageW = stage.clientWidth;
    window.addEventListener('resize', () => {
        const sw = stage.clientWidth;
        if (sw === stageW) return;
        stageW = sw;
        if (WE.zoom * WE.m.w * WM_CELL > sw * 3) weFit();
    });
    window.addEventListener('hashchange', weFromLink);
    weFromLink();
}

weSetup();

// Offline maps: once the page has loaded, the service worker (sw.js) saves the map art in the background.
window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.ready.then(reg => { if (reg.active) reg.active.postMessage('cache-map-art'); }).catch(() => {});
});
