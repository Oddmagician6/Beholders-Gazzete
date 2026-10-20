/* ============================================
   WORLDBUILDER: MAPS TAB (F54)
   Your own maps: upload a PNG, JPEG, or WebP (from Inkarnate, Dungeondraft, Wonderdraft, or
   a scan), then pan, zoom, and pin it the way the Continent tab pins its map (world-pins.js).
   Each map is a notebook entry of kind 'map' (name, notes, pins); its picture is kept in
   IndexedDB under the entry's id (map-store.js), so the notebook stays small. Removing the
   entry on the Notebook tab deletes the picture too.
   The view: an <img> and an SVG of pins (both the picture's own size) on a stage moved by a
   CSS transform: drag to pan, wheel or pinch to zoom, + − 0 and the arrow keys when the map
   has focus. Pins are redrawn at each zoom so their heads stay the same size on screen.
   Print and ⬇️ Download put the pins on the whole picture.
   URL: ?tab=maps&map=<entry id>
   ============================================ */

const MAPS_PIN_R = 10;   // a pin head's radius on screen, in pixels

const mapsState = {
    db: null,          // true once IndexedDB answered, false when it won't
    recs: new Map(),   // stored pictures by id
    id: '',            // the map on screen
    url: '',           // its picture as an object URL
    urlKey: '',
    cardKey: '',       // what the card was last built for (the map, its picture), so pin edits don't rebuild it
    want: '',          // a map asked for (URL) before the pictures loaded
    deleting: false,
    pins: [], sel: '', // the pins last drawn, for redrawing at a new zoom
    view: { k: 1, x: 0, y: 0, fit: true, vw: 0, vh: 0 }
};
let mapsBoard = null;
let mapsDrawQueued = false;

function mapsEntries(nb = nbLoad()) {
    return nb.entries.filter(e => e.kind === 'map').sort((a, b) => a.added.localeCompare(b.added));
}

function mapsEntry(nb = nbLoad()) {
    const e = mapsState.id && nbFind(nb, mapsState.id);
    return e && e.kind === 'map' ? e : null;
}

function mapsRec() {
    return mapsState.recs.get(mapsState.id) || null;
}

function mapsParams() {
    return worldUrlFor('maps', { map: mapsState.id || null });
}

// ── Loading ───────────────────────────────────────────────
async function mapsLoad() {
    try {
        const recs = await mapAll();
        mapsState.recs = new Map(recs.map(r => [r.id, r]));
        mapsState.db = true;
    } catch (e) {
        mapsState.recs = new Map();
        mapsState.db = false;
    }
}

// Show a map (or the first one when id isn't a map). push: true = new history entry, false = replace, null = leave the URL.
function mapsShow(id, push = null) {
    const list = mapsEntries();
    const next = list.some(e => e.id === id) ? id : (list.some(e => e.id === mapsState.id) ? mapsState.id : (list[0] ? list[0].id : ''));
    if (next !== mapsState.id) {
        mapsState.id = next;
        mapsState.deleting = false;
        mapsState.view.fit = true;
        if (mapsBoard) { mapsBoard.state.sel = ''; mapsBoard.state.mode = false; }
    }
    renderMaps();
    if (push !== null && currentWorldTab() === 'maps') setUrlParams(mapsParams(), push);
}

// ── Draw ──────────────────────────────────────────────────
function mapsPickerHTML(list) {
    if (!list.length) return '<option value="">No maps yet</option>';
    return list.map(e => `<option value="${esc(e.id)}"${e.id === mapsState.id ? ' selected' : ''}>${esc(e.title)}${mapsState.recs.has(e.id) ? '' : ' (no picture here)'}</option>`).join('');
}

function mapsOrphans(nb) {
    return [...mapsState.recs.values()].filter(r => { const e = nbFind(nb, r.id); return !e || e.kind !== 'map'; });
}

function mapsKicker(rec) {
    return `🖼️ ${MAP_TYPES[rec.type].label} · ${rec.w.toLocaleString('en-US')} × ${rec.h.toLocaleString('en-US')} pixels · ${mapMb(rec.size)}`;
}

function renderMaps(nb = nbLoad()) {
    const list = mapsEntries(nb);
    if (mapsState.id && !list.some(e => e.id === mapsState.id)) mapsState.id = list[0] ? list[0].id : '';
    const e = mapsEntry(nb), rec = mapsRec();

    const pick = document.getElementById('maps-pick');
    pick.innerHTML = mapsPickerHTML(list);
    pick.disabled = !list.length;
    const name = document.getElementById('maps-name');
    if (document.activeElement !== name) name.value = e ? e.title : '';
    name.disabled = !e;
    ['maps-copy', 'maps-print', 'maps-png'].forEach(id => { document.getElementById(id).disabled = !rec || !e; });
    document.getElementById('maps-notes').disabled = !e;
    document.getElementById('maps-replace').disabled = !e;
    const del = document.getElementById('maps-delete');
    del.disabled = !e;
    del.textContent = mapsState.deleting ? '⚠️ Click again to delete this map' : '🗑️ Delete Map';
    document.getElementById('maps-upload').disabled = mapsState.db === false;

    const orphans = mapsOrphans(nb);
    document.getElementById('maps-orphans').innerHTML = orphans.length ? `
        🖼️ ${orphans.length === 1 ? 'A picture here isn\'t' : `${orphans.length} pictures here aren't`} in the notebook:
        ${orphans.map(r => `<b>${esc(r.name)}</b>`).join(', ')}.
        <button type="button" class="btn" id="maps-orphans-back">📓 Put ${orphans.length === 1 ? 'It' : 'Them'} Back</button>
        <button type="button" class="btn" id="maps-orphans-del">🗑️ Delete ${orphans.length === 1 ? 'It' : 'Them'}</button>` : '';

    const card = document.getElementById('maps-card');
    // Same map, same picture: only the title can have changed (the pins redraw themselves).
    const key = [mapsState.db, e ? e.id : '', rec ? `${rec.size}|${rec.added}|${rec.w}x${rec.h}` : ''].join('|');
    if (key === mapsState.cardKey) {
        const h = card.querySelector('.wb-name');
        if (e && h && h.textContent !== e.title) h.textContent = e.title;
        return;
    }
    mapsState.cardKey = key;
    if (mapsState.db === null) { card.innerHTML = '<p class="um-empty">🖼️ Opening your maps…</p>'; return; }
    if (mapsState.db === false) {
        card.innerHTML = `<div class="um-empty"><p>⚠️ This browser won't keep map pictures here (its storage for them is off, as in some private windows).</p>
            <p class="wb-small">The other tabs still work. Open this page in a normal window to upload maps.</p></div>`;
        return;
    }
    if (!e) {
        card.innerHTML = `<div class="um-empty um-dropzone">
            <p>🗺️ No maps yet. Upload one, or drop a picture here.</p>
            <p class="wb-small">A PNG, JPEG, or WebP up to ${mapMb(MAP_LIMITS.bytes)}: a world map from Inkarnate or Wonderdraft, a battle map from Dungeondraft, a photo or scan of one you drew. It stays in this browser; nothing is uploaded anywhere.</p>
        </div>`;
        return;
    }
    const pinsText = n => `${n} ${n === 1 ? 'pin' : 'pins'}`;
    const head = `<header class="wb-head">
            <p class="wb-kicker">${rec ? esc(mapsKicker(rec)) : '🖼️ Your map'}</p>
            <h3 class="wb-name">${esc(e.title)}</h3>
        </header>`;
    if (!rec) {
        const n = (e.pins || []).length;
        card.innerHTML = `${head}<div class="um-empty um-dropzone">
            <p>🖼️ This map's picture isn't in this browser.</p>
            <p class="wb-small">The notebook carries a map's name, notes, and pins, but not its picture: that comes along only in a full <a href="privacy#backup">backup</a>. Press 🔁 Replace Picture, or drop the picture here, to put it back${n ? `, and its ${pinsText(n)} land where they were` : ''}.</p>
        </div>`;
        return;
    }
    const { w, h } = rec;
    card.innerHTML = `${head}
        <section class="wb-block wb-wide">
            <div class="wb-pin-bar"></div>
            <div class="um-wrap">
                <div class="um-view" tabindex="0" role="group" aria-label="Your map: drag to move around, + and − to zoom, 0 to fit" style="aspect-ratio: ${w} / ${h}">
                    <div class="um-stage" style="width:${w}px;height:${h}px">
                        <img class="um-img" src="${esc(mapsUrl(rec))}" width="${w}" height="${h}" alt="" draggable="false">
                        <svg class="um-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g class="um-pins"></g></svg>
                    </div>
                </div>
                <div class="um-zoom" role="group" aria-label="Zoom">
                    <button type="button" class="btn" data-zoom="in" aria-label="Zoom in">➕</button>
                    <button type="button" class="btn" data-zoom="out" aria-label="Zoom out">➖</button>
                    <button type="button" class="btn" data-zoom="fit" aria-label="Fit the whole map">⤢</button>
                    <span class="um-level" aria-live="polite"></span>
                </div>
            </div>
            <p class="wb-legend">Drag to move around; scroll, pinch, or use ➕ ➖ to zoom (with the map focused: + − to zoom, 0 to fit, arrow keys to move). 📍 Drop Pins to mark it.</p>
            <div class="um-print" aria-hidden="true"></div>
            <div class="wb-pins"></div>
        </section>`;
    // A stored picture the browser can't draw (a damaged store): say so instead of showing an empty frame.
    card.querySelector('.um-img').addEventListener('error', () => {
        const note = document.createElement('div');
        note.className = 'um-empty';
        note.innerHTML = '<p>🖼️ This map\'s picture can\'t be opened in this browser.</p><p class="wb-small">Press 🔁 Replace Picture to upload it again. Its pins stay where they are.</p>';
        card.querySelector('.um-wrap').before(note);
    }, { once: true });
    mapsState.view.vw = 0;
    mapsSize();
    mapsBoard.render(nb);
}

// The picture on screen as an object URL (one at a time, made again for a new picture).
function mapsUrl(rec) {
    const key = `${rec.id}|${rec.size}|${rec.added}`;
    if (mapsState.urlKey !== key || !mapsState.url) {
        if (mapsState.url) URL.revokeObjectURL(mapsState.url);
        mapsState.url = URL.createObjectURL(rec.blob);
        mapsState.urlKey = key;
    }
    return mapsState.url;
}

// ── Pan and zoom ──────────────────────────────────────────
function mapsEls() {
    const card = document.getElementById('maps-card');
    return { card, view: card.querySelector('.um-view'), stage: card.querySelector('.um-stage'), svg: card.querySelector('.um-svg') };
}

function mapsFitK() {
    const rec = mapsRec(), v = mapsState.view;
    return rec && v.vw && v.vh ? Math.min(v.vw / rec.w, v.vh / rec.h) : 1;
}

function mapsLimits() {
    const fit = mapsFitK();
    return { min: fit, max: Math.max(fit * 8, 2) };
}

// Keep the picture on screen: centered on an axis where it's smaller than the view, edge to edge where it's bigger.
function mapsClamp() {
    const rec = mapsRec(), v = mapsState.view;
    const lim = mapsLimits();
    v.k = Math.min(lim.max, Math.max(lim.min, v.k));
    const sw = rec.w * v.k, sh = rec.h * v.k;
    v.x = sw <= v.vw ? (v.vw - sw) / 2 : Math.min(0, Math.max(v.vw - sw, v.x));
    v.y = sh <= v.vh ? (v.vh - sh) / 2 : Math.min(0, Math.max(v.vh - sh, v.y));
}

function mapsApply() {
    const { stage, card } = mapsEls();
    if (!stage || !mapsRec()) return;
    const v = mapsState.view;
    if (v.fit) v.k = mapsFitK();
    mapsClamp();
    stage.style.transform = `translate(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px) scale(${v.k.toFixed(6)})`;
    const lim = mapsLimits();
    const level = card.querySelector('.um-level');
    if (level) level.textContent = `${Math.round(v.k / lim.min * 100)}%`;
    const z = q => card.querySelector(`[data-zoom="${q}"]`);
    if (z('in')) {
        z('in').disabled = v.k >= lim.max - 1e-9;
        z('out').disabled = v.k <= lim.min + 1e-9;
        z('fit').disabled = v.fit;
    }
    mapsQueuePins();
}

// Zoom by factor around a point of the view (in the view's pixels).
function mapsZoomAt(factor, cx, cy) {
    const v = mapsState.view, lim = mapsLimits();
    const k = Math.min(lim.max, Math.max(lim.min, v.k * factor));
    if (k === v.k) return;
    v.x = cx - (cx - v.x) * (k / v.k);
    v.y = cy - (cy - v.y) * (k / v.k);
    v.k = k;
    v.fit = Math.abs(k - lim.min) < 1e-9;
    mapsApply();
}

function mapsZoomCenter(factor) {
    const v = mapsState.view;
    mapsZoomAt(factor, v.vw / 2, v.vh / 2);
}

function mapsFit() {
    mapsState.view.fit = true;
    mapsApply();
}

function mapsPanBy(dx, dy) {
    const v = mapsState.view;
    v.x += dx;
    v.y += dy;
    v.fit = false;
    mapsApply();
}

// The view's size changed (first shown, window resized): fit again if it was fitted.
function mapsSize() {
    const { view } = mapsEls();
    if (!view) return;
    const v = mapsState.view;
    const vw = view.clientWidth, vh = view.clientHeight;
    if (!vw || !vh || (vw === v.vw && vh === v.vh)) return;
    v.vw = vw;
    v.vh = vh;
    mapsApply();
}

// Pins keep their size on screen, so they're redrawn (once a frame at most) after a zoom.
function mapsQueuePins() {
    if (mapsDrawQueued) return;
    mapsDrawQueued = true;
    requestAnimationFrame(() => {
        mapsDrawQueued = false;
        if (!mapsBoard || mapsBoard.state.dragging) return;
        mapsDrawPins(mapsState.pins, mapsState.sel);
    });
}

function mapsDrawPins(pins, sel) {
    const { svg } = mapsEls(), rec = mapsRec();
    if (!svg || !rec) return;
    mapsState.pins = pins;
    mapsState.sel = sel;
    const active = document.activeElement;
    const focusPin = active && svg.contains(active) && active.dataset.pin;
    svg.querySelector('.um-pins').outerHTML = pinSvg(pins, rec.w, rec.h, { cls: 'um', r: MAPS_PIN_R / mapsState.view.k, sel });
    if (focusPin) { const el = svg.querySelector(`g[data-pin="${focusPin}"]`); if (el) el.focus({ preventScroll: true }); }
}

function setupMapsView(card) {
    const ptrs = new Map();
    let pan = null, pinch = null, swallow = false;
    const local = ev => { const r = mapsEls().view.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    const inView = ev => { const { view } = mapsEls(); return view && view.contains(ev.target) ? view : null; };
    const startPinch = () => {
        const [a, b] = [...ptrs.values()];
        const v = mapsState.view;
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, k: v.k, vx: v.x, vy: v.y };
    };

    card.addEventListener('pointerdown', ev => {
        const view = inView(ev);
        if (!view || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        // While pinning, a pin under the pointer is dragged by pinWire, not the map.
        if (mapsBoard.state.mode && ev.target.closest('g[data-pin]')) return;
        ptrs.set(ev.pointerId, local(ev));
        if (ptrs.size === 1) {
            const v = mapsState.view;
            pan = { x0: ev.clientX, y0: ev.clientY, vx: v.x, vy: v.y, moved: false };
        } else if (ptrs.size === 2) {
            startPinch();
            if (pan) pan.moved = true;
        }
    });
    card.addEventListener('pointermove', ev => {
        if (!ptrs.has(ev.pointerId)) return;
        ptrs.set(ev.pointerId, local(ev));
        const v = mapsState.view, lim = mapsLimits();
        if (pinch && ptrs.size >= 2) {
            const [a, b] = [...ptrs.values()];
            const k = Math.min(lim.max, Math.max(lim.min, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
            const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            v.x = m.x - (pinch.m.x - pinch.vx) * (k / pinch.k);
            v.y = m.y - (pinch.m.y - pinch.vy) * (k / pinch.k);
            v.k = k;
            v.fit = Math.abs(k - lim.min) < 1e-9;
            mapsApply();
            return;
        }
        if (!pan) return;
        const dx = ev.clientX - pan.x0, dy = ev.clientY - pan.y0;
        // The same 5 pixels pinWire waits for, so a short click still drops a pin.
        if (!pan.moved && Math.hypot(dx, dy) < 5) return;
        if (!pan.moved) {
            pan.moved = true;
            mapsEls().view.classList.add('um-panning');
            try { mapsEls().view.setPointerCapture(ev.pointerId); } catch (e) { /* the pan still follows the pointer over the map */ }
        }
        v.x = pan.vx + dx;
        v.y = pan.vy + dy;
        v.fit = false;
        mapsApply();
    });
    const up = ev => {
        if (!ptrs.has(ev.pointerId)) return;
        ptrs.delete(ev.pointerId);
        if (pan && pan.moved) swallow = true;
        if (ptrs.size === 1) {
            // One finger left after a pinch: it pans from here.
            const [p] = [...ptrs.values()];
            const r = mapsEls().view.getBoundingClientRect(), v = mapsState.view;
            pan = { x0: p.x + r.left, y0: p.y + r.top, vx: v.x, vy: v.y, moved: true };
            pinch = null;
        } else if (!ptrs.size) {
            pan = null;
            pinch = null;
            const { view } = mapsEls();
            if (view) view.classList.remove('um-panning');
            setTimeout(() => { swallow = false; }, 0);
        }
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
    // A drag that moved the map isn't a click on whatever it ended over.
    card.addEventListener('click', ev => {
        if (swallow && inView(ev)) { ev.stopPropagation(); ev.preventDefault(); swallow = false; }
    }, true);

    card.addEventListener('wheel', ev => {
        if (!inView(ev) || !mapsRec()) return;
        const d = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1);
        const v = mapsState.view, lim = mapsLimits();
        // Nothing left to zoom that way: let the page scroll.
        if (!d || (d > 0 && v.k <= lim.min + 1e-9) || (d < 0 && v.k >= lim.max - 1e-9)) return;
        ev.preventDefault();
        const p = local(ev);
        mapsZoomAt(Math.exp(-d * 0.0015), p.x, p.y);
    }, { passive: false });
    card.addEventListener('dblclick', ev => {
        if (!inView(ev) || mapsBoard.state.mode || ev.target.closest('g[data-pin]')) return;
        const p = local(ev);
        mapsZoomAt(2, p.x, p.y);
    });
    card.addEventListener('keydown', ev => {
        if (!ev.target.classList || !ev.target.classList.contains('um-view') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const step = 80;
        const act = {
            '+': () => mapsZoomCenter(1.5), '=': () => mapsZoomCenter(1.5), '-': () => mapsZoomCenter(1 / 1.5), '_': () => mapsZoomCenter(1 / 1.5), '0': mapsFit,
            ArrowLeft: () => mapsPanBy(step, 0), ArrowRight: () => mapsPanBy(-step, 0), ArrowUp: () => mapsPanBy(0, step), ArrowDown: () => mapsPanBy(0, -step)
        }[ev.key];
        if (!act) return;
        ev.preventDefault();
        act();
    });
    card.addEventListener('click', ev => {
        const z = ev.target.closest('[data-zoom]');
        if (!z) return;
        if (z.dataset.zoom === 'fit') mapsFit();
        else mapsZoomCenter(z.dataset.zoom === 'in' ? 1.5 : 1 / 1.5);
    });
    new ResizeObserver(() => mapsSize()).observe(card);
}

// ── Pins (world-pins.js) ──────────────────────────────────
// Change this map's pins: fn(pins) edits a copy (return false to skip). quiet: store without redrawing.
function mapsEditPins(fn, quiet = false) {
    const nb = nbLoad(), e = mapsEntry(nb);
    if (!e) return false;
    const pins = (e.pins || []).map(p => ({ ...p }));
    if (fn(pins) === false) return false;
    nbSetPins(e, pins, new Set(nb.entries.map(x => x.id)));
    if (!nbStore(nb, quiet)) { flash('maps-status', "⚠️ This browser won't keep a notebook (storage is full or off), so it can't keep pins."); return false; }
    return true;
}

function setupMapsPins(card) {
    mapsBoard = pinBoard({
        card,
        rowId: 'mp-pin-',
        status: 'maps-status',
        ready: () => !!mapsRec() && !!mapsEntry() && !!card.querySelector('.um-svg'),
        entry: mapsEntry,
        edit: mapsEditPins,
        frame: () => card.querySelector('.um-svg'),
        size: () => { const rec = mapsRec(); return { W: rec.w, H: rec.h }; },
        drawMap: (pins, sel, placing) => {
            mapsDrawPins(pins, sel);
            card.querySelector('.um-wrap').classList.toggle('um-pinning', placing);
        },
        foot: (nb, self) => `Pins are kept with this map in the <a href="worldbuilder?tab=notebook">📓 notebook</a>, as spots on the picture, so a new picture of the same map (🔁 Replace Picture) keeps them where they were.${nb.entries.some(x => x !== self) ? '' : ' Save a town, a site, or a faction to the notebook, and a pin can open it.'}`
    });
}

// ── Upload, replace, delete ───────────────────────────────
async function mapsUpload(file, replace = false) {
    if (!file) return;
    if (!mapsState.db) { flash('maps-status', "⚠️ This browser won't keep map pictures here."); return; }
    const nb = nbLoad(), e = replace ? mapsEntry(nb) : null;
    if (replace && !e) return;
    if (!replace && mapsEntries(nb).length >= MAP_LIMITS.maps) { flash('maps-status', `⚠️ The notebook holds ${MAP_LIMITS.maps} maps at most. Delete one first.`); return; }
    if (!replace && nb.entries.length >= NB_LIMITS.entries) { flash('maps-status', '⚠️ The notebook is full. Remove an entry first.'); return; }
    flash('maps-status', '🖼️ Checking the picture…');
    let pic;
    try {
        pic = await mapCheck(file);
    } catch (err) {
        flash('maps-status', '⚠️ ' + (err && err.message ? err.message : "That picture couldn't be read."));
        return;
    }
    if (replace) {
        try {
            await mapPut({ id: e.id, name: e.title, ...pic });
        } catch (err) {
            flash('maps-status', "⚠️ This browser wouldn't store the picture (its storage may be full).");
            return;
        }
        const now = nbLoad(), here = nbFind(now, e.id);
        if (here) { here.sub = mapSub(pic.w, pic.h); nbStore(now, true); }
        mapsState.view.fit = true;
        await mapsReload();
        flash('maps-status', `🔁 New picture in.${(e.pins || []).length ? ' The pins stayed where they were on the map.' : ''}`);
        return;
    }
    // The picture goes in first, under the id its notebook entry will have.
    const rec = { id: nbNewId(nb), name: mapNameFromFile(file.name), ...pic, added: new Date().toISOString() };
    try {
        await mapPut(rec);
    } catch (err) {
        flash('maps-status', "⚠️ This browser wouldn't store the picture (its storage may be full).");
        return;
    }
    mapsState.recs.set(rec.id, rec);
    const now = nbLoad();
    const id = mapFileEntry(now, rec);
    if (!id || !nbStore(now)) {
        mapsState.recs.delete(rec.id);
        mapDelete(rec.id).catch(() => {});
        flash('maps-status', id ? "⚠️ This browser won't keep a notebook (storage is full or off)." : '⚠️ The notebook is full. Remove an entry first.');
        return;
    }
    mapsShow(id, true);
    flash('maps-status', `🖼️ ${rec.name} is in. Press 📍 Drop Pins to mark it.`);
}

async function mapsReload() {
    await mapsLoad();
    renderMaps();
}

function mapsDeleteMap() {
    const e = mapsEntry();
    if (!e) return;
    if (!mapsState.deleting) {
        mapsState.deleting = true;
        renderMaps();
        setTimeout(() => { if (mapsState.deleting) { mapsState.deleting = false; renderMaps(); } }, 4000);
        return;
    }
    mapsState.deleting = false;
    const nb = nbLoad();
    nbRemove(nb, e.id);
    // Out of the list first, so the redraw doesn't show it as a picture without a map.
    mapsState.recs.delete(e.id);
    if (!nbStore(nb)) { flash('maps-status', "⚠️ This browser won't keep a notebook (storage is full or off)."); mapsReload(); return; }
    mapDelete(e.id).catch(() => {});
    mapsShow('', false);
    flash('maps-status', `🗑️ ${e.title} is deleted: its picture, pins, and notes.`);
}

// Pictures with no notebook entry: file them again, or delete them.
function mapsOrphansBack() {
    const nb = nbLoad();
    let id = '';
    for (const r of mapsOrphans(nb)) {
        const got = mapFileEntry(nb, r);
        if (!got) break;
        if (got !== r.id) mapPut({ ...r, id: got }).then(() => mapDelete(r.id)).catch(() => {});
        id = id || got;
    }
    if (!nbStore(nb)) { flash('maps-status', "⚠️ This browser won't keep a notebook (storage is full or off)."); return; }
    mapsReload().then(() => { if (id) mapsShow(id, true); });
    flash('maps-status', id ? '📓 Back in the notebook.' : '⚠️ The notebook is full. Remove an entry first.');
}

function mapsOrphansDelete() {
    const orphans = mapsOrphans(nbLoad());
    Promise.all(orphans.map(r => mapDelete(r.id).catch(() => {}))).then(mapsReload);
    flash('maps-status', `🗑️ Deleted ${orphans.length === 1 ? 'the picture' : `${orphans.length} pictures`}.`);
}

// ── Copy, print, download ─────────────────────────────────
function mapsText() {
    const nb = nbLoad(), e = mapsEntry(nb), rec = mapsRec();
    const pins = (e.pins || []);
    return [e.title, mapsKicker(rec).replace(/^🖼️ /, ''), e.notes ? 'Notes: ' + e.notes : '',
        pins.length ? 'Pins:\n' + pins.map((p, n) => '  ' + wpLine(nb, p, n)).join('\n') : ''].filter(Boolean).join('\n\n');
}

// The pins sized for the whole picture (print and download), outlines in proportion.
function mapsPinsForPicture(pins, w, h) {
    const r = Math.max(w, h) / 70;
    return pinSvg(pins, w, h, { cls: 'um', r }).replace(/class="um-pin-head"/g, `class="um-pin-head" style="stroke-width:${(r * 0.16).toFixed(1)}"`);
}

// The whole picture with its pins, for paper: an <img> and an SVG over it, the pins sized to the picture.
// The box is as wide as the page, or narrower for a tall map, so it fits on one sheet (22 cm high at most).
async function mapsPrint() {
    const e = mapsEntry(), rec = mapsRec();
    const box = document.querySelector('#maps-card .um-print');
    if (!e || !rec || !box) return;
    const { w, h } = rec;
    box.innerHTML = `<h3 class="um-print-h">${esc(e.title)}</h3><div class="um-print-map" style="width: min(100%, ${(22 * w / h).toFixed(2)}cm)">
        <img src="${esc(mapsUrl(rec))}" alt="">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${mapsPinsForPicture(e.pins || [], w, h)}</svg></div>`;
    try { await box.querySelector('img').decode(); } catch (err) { /* print it anyway */ }
    document.body.classList.add('print-maps');
    window.print();
}

async function mapsDownload() {
    const e = mapsEntry(), rec = mapsRec(), btn = document.getElementById('maps-png');
    if (!e || !rec || btn.disabled) return;
    const pins = document.getElementById('maps-png-pins').checked ? (e.pins || []) : [];
    const slug = mapFileSlug(e.title);
    if (!pins.length) {
        mapDownload(rec.blob, `${slug}.${MAP_TYPES[rec.type].ext}`);
        flash('maps-status', `⬇️ Saved ${slug}.${MAP_TYPES[rec.type].ext}, the picture as you uploaded it.`);
        return;
    }
    const { w, h } = rec;
    const type = rec.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    const file = `${slug}-pins.${MAP_TYPES[type].ext}`;
    btn.disabled = true;
    flash('maps-status', '🗺️ Drawing the map…');
    let under = null, ok = false;
    try {
        under = await createImageBitmap(rec.blob);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${mapsPinsForPicture(pins, w, h)}</svg>`;
        ok = await mapExportPng(svg, w, h, mapPageCss('.um-'), file, { under, type });
    } catch (err) {
        ok = false;
    } finally {
        if (under) under.close();
    }
    btn.disabled = false;
    flash('maps-status', ok ? `⬇️ Saved ${file}: ${w.toLocaleString('en-US')} × ${h.toLocaleString('en-US')} pixels, with ${pins.length} ${pins.length === 1 ? 'pin' : 'pins'}.`
        : '⚠️ This browser could not draw a map that big. Untick the pins to save the picture as it is.');
}

// ── Setup ─────────────────────────────────────────────────
function setupMaps() {
    const card = document.getElementById('maps-card');
    setupMapsPins(card);
    setupMapsView(card);

    const file = document.getElementById('maps-file');
    let replacing = false;
    document.getElementById('maps-upload').addEventListener('click', () => { replacing = false; file.click(); });
    document.getElementById('maps-replace').addEventListener('click', () => { replacing = true; file.click(); });
    file.addEventListener('change', () => { mapsUpload(file.files[0], replacing); file.value = ''; });
    // Drop a picture on the card: a new map, or this map's missing picture.
    card.addEventListener('dragover', ev => {
        if (!ev.dataTransfer || ![...ev.dataTransfer.types].includes('Files') || !mapsState.db) return;
        ev.preventDefault();
        card.classList.add('um-drop');
    });
    card.addEventListener('dragleave', ev => { if (!card.contains(ev.relatedTarget)) card.classList.remove('um-drop'); });
    card.addEventListener('drop', ev => {
        card.classList.remove('um-drop');
        const f = ev.dataTransfer && ev.dataTransfer.files[0];
        if (!f || !mapsState.db) return;
        ev.preventDefault();
        mapsUpload(f, !!mapsEntry() && !mapsRec());
    });

    document.getElementById('maps-pick').addEventListener('change', ev => mapsShow(ev.target.value, true));
    const name = document.getElementById('maps-name');
    let nameTimer = null;
    name.addEventListener('input', () => {
        clearTimeout(nameTimer);
        nameTimer = setTimeout(() => {
            const nb = nbLoad(), e = mapsEntry(nb);
            if (!e) return;
            e.title = nbText(name.value, NB_LIMITS.title) || 'My map';
            if (!nbStore(nb, true)) { flash('maps-status', "⚠️ This browser won't keep a notebook (storage is full or off)."); return; }
            const opt = document.querySelector(`#maps-pick option[value="${e.id}"]`);
            if (opt) opt.textContent = e.title + (mapsState.recs.has(e.id) ? '' : ' (no picture here)');
            const h = card.querySelector('.wb-name');
            if (h) h.textContent = e.title;
        }, 400);
    });
    // Leaving the box tells the other tabs (and redraws the pin pickers with the new name).
    name.addEventListener('change', () => { clearTimeout(nameTimer); const nb = nbLoad(), e = mapsEntry(nb); if (!e) return; e.title = nbText(name.value, NB_LIMITS.title) || 'My map'; nbStore(nb); });

    document.getElementById('maps-delete').addEventListener('click', mapsDeleteMap);
    document.getElementById('maps-notes').addEventListener('click', () => { if (mapsEntry()) wpOpenEntry(mapsState.id); });
    document.getElementById('maps-orphans').addEventListener('click', ev => {
        if (ev.target.id === 'maps-orphans-back') mapsOrphansBack();
        if (ev.target.id === 'maps-orphans-del') mapsOrphansDelete();
    });
    document.getElementById('maps-copy').addEventListener('click', () => { if (mapsRec() && mapsEntry()) copyText(mapsText(), 'maps-status', 'the map and its pins'); });
    document.getElementById('maps-print').addEventListener('click', mapsPrint);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-maps'));
    document.getElementById('maps-png').addEventListener('click', mapsDownload);

    nbOnChange(nb => {
        if (mapsState.db === null) return;
        if (mapsState.id && !mapsEntry(nb)) mapsShow('', false);
        else renderMaps(nb);
    });
    mapOnChange(() => mapsReload());

    mapsLoad().then(() => {
        const want = mapsState.want;
        mapsState.want = '';
        mapsShow(want, null);
    });
}

WORLD_TABS.maps = {
    setup: setupMaps,
    params: mapsParams,
    apply: p => {
        const id = p.get('map') || '';
        if (mapsState.db === null) mapsState.want = id;
        else mapsShow(id, null);
        return true;
    },
    fresh: () => mapsShow(mapsState.id, null),
    rolled: () => true
};
