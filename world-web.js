/* ============================================
   WORLDBUILDER: WEB TAB (F56)
   The campaign notebook drawn as a web: each entry a ring with its kind's icon, and a line
   for every tie between two entries (web-graph.js): a notebook link (solid), a map pin that
   opens the other entry (dashed), a family member who is a saved NPC (dotted).
   Drag the background to move around, scroll or pinch to zoom (+ − 0 and the arrow keys with
   the web focused). Hover an entry (or click it) to light up what it's tied to; a click opens
   a panel listing every tie, with 📓 Open in Notebook (a double-click goes straight there).
   Drag an entry to put it where you want it: it stays there. Filter by kind and by kind of line,
   hide entries with no lines, and Find lights up the entries whose name or notes match.
   🧲 Tidy Up lets the web settle from where it is; 🔀 Start Over lays it out afresh.
   ⬇️ Download Picture saves what's showing as a PNG (map-export.js).
   The layout is kept in localStorage (WEB_KEY in web-graph.js), so the web looks the same next time.
   URL: ?tab=web
   ============================================ */

const webState = {
    drawn: false, graph: null, entries: new Map(), pos: {}, fixed: new Set(), loose: [], adj: new Map(),
    hidden: new Set(), lines: { link: true, pin: true, family: true }, loose: true, q: '',
    sel: null, hover: null, restarting: false,
    nodeEls: new Map(), edgeEls: new Map(), on: [], bounds: null,
    view: { x: 0, y: 0, k: 1, vw: 0, vh: 0, fit: true }
};

function webEls() {
    return { view: document.getElementById('web-view'), svg: document.getElementById('web-svg'), stage: document.getElementById('web-stage') };
}

function webNodeR(nd) {
    return 15 + Math.min(9, Math.sqrt(nd.deg) * 3);
}

function webShort(text, max = 22) {
    return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

// ── The graph ─────────────────────────────────────────────
// Read the notebook and work out where everything goes. mode: 'keep' (place only new entries),
// 'tidy' (let it all settle a little), 'restart' (a fresh layout, dragged entries freed too).
function webBuild(nb, mode = 'keep') {
    const g = webGraph(nb);
    const store = webLoadStore();
    const restart = mode === 'restart';
    let pos = restart ? {} : store.pos;
    const fixed = new Set(restart ? [] : store.fixed);
    const tied = new Set(g.edges.flatMap(ed => [ed.a, ed.b]));
    // An entry placed while it had no lines that has since been tied to something comes in beside
    // it (unless you put it there yourself).
    const back = restart ? [] : store.loose.filter(id => tied.has(id) && !fixed.has(id) && Object.hasOwn(pos, id));
    if (back.length) { pos = { ...pos }; back.forEach(id => delete pos[id]); }
    const missing = g.nodes.some(nd => !Object.hasOwn(pos, nd.id));
    if (missing || mode !== 'keep') {
        pos = webLayout(g.nodes, g.edges, {
            pos, fixed, gentle: mode === 'tidy',
            ...(restart ? { seed: (Math.random() * 4294967296) >>> 0 } : {})
        });
    }
    const ids = new Set(g.nodes.map(nd => nd.id));
    const loose = g.nodes.filter(nd => !tied.has(nd.id)).map(nd => nd.id);
    // Only write when something moved or an entry went away (keeps a plain look from writing).
    if (missing || mode !== 'keep' || Object.keys(store.pos).some(id => !ids.has(id)) || loose.join() !== store.loose.join()) webSaveStore(pos, fixed, ids, loose);
    webState.graph = g;
    webState.pos = pos;
    webState.fixed = fixed;
    webState.loose = loose;
    webState.entries = new Map(nb.entries.map(e => [e.id, e]));
    webState.adj = new Map(g.nodes.map(nd => [nd.id, []]));
    g.edges.forEach(ed => {
        webState.adj.get(ed.a).push({ id: ed.b, ed });
        webState.adj.get(ed.b).push({ id: ed.a, ed });
    });
    if (webState.sel && !ids.has(webState.sel)) webState.sel = null;
    if (webState.hover && !ids.has(webState.hover)) webState.hover = null;
}

// What the filters leave showing.
function webVisible() {
    const g = webState.graph;
    if (!g) return { nodes: [], edges: [] };
    let nodes = g.nodes.filter(nd => !webState.hidden.has(nd.kind));
    const on = new Set(nodes.map(nd => nd.id));
    const edges = g.edges.filter(ed => on.has(ed.a) && on.has(ed.b) && webEdgeType(ed, webState.lines));
    if (!webState.loose) {
        const tied = new Set(edges.flatMap(ed => [ed.a, ed.b]));
        nodes = nodes.filter(nd => tied.has(nd.id));
    }
    return { nodes, edges };
}

function webBounds(nodes, pad = 30) {
    if (!nodes.length) return { x: -100, y: -100, w: 200, h: 200 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodes.forEach(nd => {
        const [x, y] = webState.pos[nd.id], r = webNodeR(nd);
        x0 = Math.min(x0, x - Math.max(r, 70)); x1 = Math.max(x1, x + Math.max(r, 70));
        y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r + 20);
    });
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

function webEdgeHTML(ed) {
    const [x1, y1] = webState.pos[ed.a], [x2, y2] = webState.pos[ed.b];
    return `<line class="wg-edge wg-e-${webEdgeType(ed, webState.lines)}" data-a="${ed.a}" data-b="${ed.b}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
}

function webNodeHTML(nd) {
    const [x, y] = webState.pos[nd.id], r = webNodeR(nd);
    const k = nbKindOpt(nd.kind);
    return `<g class="wg-node" data-id="${nd.id}" transform="translate(${x} ${y})">`
        + `<title>${esc(k.label)}: ${esc(nd.title)}</title>`
        + `<circle class="wg-ring" r="${(r + 5).toFixed(1)}"/>`
        + `<circle class="wg-dot" r="${r.toFixed(1)}" stroke="${WEB_KIND_COLORS[nd.kind] || '#c9a040'}"/>`
        + `<text class="wg-icon" font-size="${Math.round(r)}">${k.icon}</text>`
        + `<text class="wg-label" y="${(r + 14).toFixed(1)}">${esc(webShort(nd.title))}</text></g>`;
}

function webInnerHTML(nodes, edges) {
    return `<g class="wg-edges">${edges.map(webEdgeHTML).join('')}</g><g class="wg-nodes">${nodes.map(webNodeHTML).join('')}</g>`;
}

// ── Drawing ───────────────────────────────────────────────
function webKindsHTML() {
    const counts = {};
    webState.graph.nodes.forEach(nd => { counts[nd.kind] = (counts[nd.kind] || 0) + 1; });
    return Object.keys(NB_KINDS).filter(kind => counts[kind]).map(kind => {
        const k = nbKindOpt(kind), on = !webState.hidden.has(kind);
        return `<button type="button" class="wg-kind" data-kind="${kind}" aria-pressed="${on}" style="--wg-c:${WEB_KIND_COLORS[kind] || '#c9a040'}">${k.icon} ${esc(k.label)} <small>${counts[kind]}</small></button>`;
    }).join('');
}

function renderWeb(nb = nbLoad(), mode = 'keep') {
    webBuild(nb, mode);
    webState.drawn = true;
    const { view, stage } = webEls();
    const empty = document.getElementById('web-empty');
    const g = webState.graph;
    const has = g.nodes.length > 0;
    view.hidden = !has;
    empty.hidden = has;
    document.getElementById('web-filters').hidden = !has;
    ['web-tidy', 'web-restart', 'web-png'].forEach(id => { document.getElementById(id).disabled = !has; });
    document.getElementById('web-kinds').innerHTML = has ? webKindsHTML() : '';
    const { nodes, edges } = webVisible();
    stage.innerHTML = webInnerHTML(nodes, edges);
    webState.nodeEls = new Map([...stage.querySelectorAll('.wg-node')].map(el => [el.dataset.id, el]));
    webState.edgeEls = new Map(nodes.map(nd => [nd.id, []]));
    stage.querySelectorAll('.wg-edge').forEach(el => {
        webState.edgeEls.get(el.dataset.a).push({ el, other: el.dataset.b, end: 1 });
        webState.edgeEls.get(el.dataset.b).push({ el, other: el.dataset.a, end: 2 });
    });
    webState.fixed.forEach(id => { const el = webState.nodeEls.get(id); if (el) el.classList.add('wg-fixed'); });
    webState.bounds = webBounds(nodes);
    webState.on = [];
    const lines = g.edges.length;
    document.getElementById('web-count').textContent = has
        ? `${g.nodes.length} ${g.nodes.length === 1 ? 'entry' : 'entries'} · ${lines} ${lines === 1 ? 'line' : 'lines'}`
            + (nodes.length < g.nodes.length || edges.length < lines ? ` · showing ${nodes.length} ${nodes.length === 1 ? 'entry' : 'entries'} and ${edges.length} ${edges.length === 1 ? 'line' : 'lines'}` : '')
        : '';
    document.getElementById('web-hint').textContent = !has ? ''
        : !lines ? 'Nothing is tied together yet. Link entries under 📝 Notes and links on the Notebook tab, point a map pin at an entry, or link a family member to a saved NPC, and the lines show up here.'
            : 'Drag the background to move around; scroll, pinch, or use ➕ ➖ to zoom (with the web focused: + − to zoom, 0 to fit, arrow keys to move). Hover or click an entry to light up its ties; drag one to put it where you want it; double-click to open it in the notebook.';
    document.getElementById('web-restart').textContent = webState.restarting ? '⚠️ Click again: your placed entries move too' : '🔀 Start Over';
    webSize(true);
    webFocus();
    webPanel();
}

// ── View: pan and zoom ────────────────────────────────────
function webFitK() {
    const b = webState.bounds, v = webState.view;
    return b && v.vw && v.vh ? Math.min(v.vw / b.w, v.vh / b.h, 1.5) : 1;
}

function webLimits() {
    const fit = webFitK();
    return { min: Math.min(fit, 1) * 0.6, max: Math.max(fit, 1) * 4 };
}

function webApply() {
    const { stage, svg, view } = webEls();
    const v = webState.view, b = webState.bounds;
    if (!b) return;
    const lim = webLimits();
    if (v.fit) {
        v.k = webFitK();
        v.x = v.vw / 2 - (b.x + b.w / 2) * v.k;
        v.y = v.vh / 2 - (b.y + b.h / 2) * v.k;
    }
    v.k = Math.min(lim.max, Math.max(lim.min, v.k));
    // The middle of the view stays over the web, so it can't be lost off the edge.
    const cx = Math.min(b.x + b.w, Math.max(b.x, (v.vw / 2 - v.x) / v.k));
    const cy = Math.min(b.y + b.h, Math.max(b.y, (v.vh / 2 - v.y) / v.k));
    v.x = v.vw / 2 - cx * v.k;
    v.y = v.vh / 2 - cy * v.k;
    stage.setAttribute('transform', `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) scale(${v.k.toFixed(5)})`);
    svg.classList.toggle('wg-far', v.k < 0.45);
    const level = view.querySelector('.um-level');
    level.textContent = `${Math.round(v.k * 100)}%`;
    const z = q => view.querySelector(`[data-zoom="${q}"]`);
    z('in').disabled = v.k >= lim.max - 1e-9;
    z('out').disabled = v.k <= lim.min + 1e-9;
    z('fit').disabled = v.fit;
}

function webZoomAt(factor, cx, cy) {
    const v = webState.view, lim = webLimits();
    const k = Math.min(lim.max, Math.max(lim.min, v.k * factor));
    if (k === v.k) return;
    v.x = cx - (cx - v.x) * (k / v.k);
    v.y = cy - (cy - v.y) * (k / v.k);
    v.k = k;
    v.fit = false;
    webApply();
}

function webZoomCenter(factor) {
    webZoomAt(factor, webState.view.vw / 2, webState.view.vh / 2);
}

function webFit() {
    webState.view.fit = true;
    webApply();
}

function webPanBy(dx, dy) {
    const v = webState.view;
    v.x += dx;
    v.y += dy;
    v.fit = false;
    webApply();
}

// Put an entry in the middle of the view (keeping the zoom).
function webCenterOn(id) {
    const p = webState.pos[id], v = webState.view;
    if (!p) return;
    v.x = v.vw / 2 - p[0] * v.k;
    v.y = v.vh / 2 - p[1] * v.k;
    v.fit = false;
    webApply();
}

// The view's size (first shown, window resized). force: apply even when it didn't change.
function webSize(force = false) {
    const { view } = webEls();
    const v = webState.view;
    const vw = view.clientWidth, vh = view.clientHeight;
    if (!vw || !vh) return;
    if (!force && vw === v.vw && vh === v.vh) return;
    v.vw = vw;
    v.vh = vh;
    webApply();
}

// ── Lighting up ───────────────────────────────────────────
function webMatches() {
    const q = webState.q.trim().toLowerCase();
    if (!q) return null;
    return [...webState.nodeEls.keys()].filter(id => nbMatches(webState.entries.get(id), 'all', 'all', q));
}

// Light up the entry under the pointer (or the one picked) and what it's tied to, or what Find matches.
function webFocus() {
    const { svg } = webEls();
    webState.on.forEach(el => el.classList.remove('wg-on'));
    webState.on = [];
    svg.querySelectorAll('.wg-sel, .wg-match').forEach(el => el.classList.remove('wg-sel', 'wg-match'));
    const id = webState.hover || webState.sel;
    const add = el => { el.classList.add('wg-on'); webState.on.push(el); };
    let lit = false;
    if (id && webState.nodeEls.has(id)) {
        add(webState.nodeEls.get(id));
        webState.edgeEls.get(id).forEach(({ el, other }) => { add(el); add(webState.nodeEls.get(other)); });
        lit = true;
    }
    const matches = webMatches();
    if (matches) {
        matches.forEach(m => { const el = webState.nodeEls.get(m); el.classList.add('wg-match'); if (!lit) add(el); });
        lit = true;
    }
    if (webState.sel && webState.nodeEls.has(webState.sel)) webState.nodeEls.get(webState.sel).classList.add('wg-sel');
    svg.classList.toggle('wg-hl', lit);
    const found = document.getElementById('web-found');
    found.textContent = matches ? (matches.length ? `${matches.length} found` : 'None found') : '';
}

// ── The panel for the picked entry ────────────────────────
function webWhy(ed, here) {
    const out = [];
    if (ed.types.link) out.push('🔗 linked');
    ed.why.forEach(w => {
        if (w.type === 'pin') out.push(`📍 ${w.from === here ? 'your pin' : 'its pin'} “${esc(w.name)}”`);
        else out.push(`🌳 ${w.from === here ? '' : 'in the family '}as ${esc(w.name)}`);
    });
    return out.join(' · ');
}

function webPanel() {
    const panel = document.getElementById('web-panel');
    const e = webState.sel && webState.entries.get(webState.sel);
    if (!e) {
        panel.hidden = true;
        panel.innerHTML = '';
        return;
    }
    const k = nbKindOpt(e.kind);
    const ties = webState.adj.get(e.id) || [];
    const shown = new Set(webState.nodeEls.keys());
    const tiesHTML = ties.map(({ id, ed }) => {
        const o = webState.entries.get(id), ok = nbKindOpt(o.kind);
        const vis = shown.has(id) && webEdgeType(ed, webState.lines);
        const name = `${ok.icon} ${esc(o.title)}`;
        return `<li>${vis ? `<button type="button" class="wg-go" data-id="${id}">${name}</button>` : `<span class="wg-off">${name} <span class="wb-tag">hidden by a filter</span></span>`}`
            + ` <span class="wb-small">${webWhy(ed, e.id)}</span></li>`;
    }).join('');
    const href = nbOpenHref(e);
    panel.hidden = false;
    panel.innerHTML = `<h3 class="wg-p-h">${k.icon} ${esc(e.title)} <span class="wb-tag">${esc(k.label)}</span></h3>
        ${e.sub ? `<p class="wg-p-sub">${esc(nbShort(e.sub))}</p>` : ''}
        <p class="wb-small">${ties.length ? `Tied to ${ties.length} ${ties.length === 1 ? 'entry' : 'entries'}:` : 'Not tied to anything yet. Link it under 📝 Notes and links on the Notebook tab.'}</p>
        ${ties.length ? `<ul class="wb-list wg-p-ties">${tiesHTML}</ul>` : ''}
        <div class="tool-toolbar wg-p-actions">
            <button type="button" class="btn btn-gold" data-web="nb">📓 Open in Notebook</button>
            ${href ? `<a class="btn" href="${esc(href)}">↗ Open It</a>` : ''}
            ${webState.fixed.has(e.id) ? '<button type="button" class="btn" data-web="free">📌 Let It Move</button>' : ''}
            <button type="button" class="btn" data-web="close">✕ Close</button>
        </div>`;
}

function webSelect(id, center = false) {
    webState.sel = id && webState.entries.has(id) ? id : null;
    webFocus();
    webPanel();
    if (center && webState.sel) webCenterOn(webState.sel);
}

function webOpenInNotebook(id) {
    if (!webState.entries.has(id)) return;
    switchWorldTab('notebook').then(ok => ok && nbJump(id));
}

// ── Dragging an entry ─────────────────────────────────────
function webMoveNode(id, x, y) {
    webState.pos[id] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    webState.nodeEls.get(id).setAttribute('transform', `translate(${webState.pos[id][0]} ${webState.pos[id][1]})`);
    webState.edgeEls.get(id).forEach(({ el, end }) => {
        el.setAttribute(`x${end}`, webState.pos[id][0]);
        el.setAttribute(`y${end}`, webState.pos[id][1]);
    });
}

function webKeepPlaced(id) {
    webState.fixed.add(id);
    webState.nodeEls.get(id).classList.add('wg-fixed');
    if (!webSaveStore(webState.pos, webState.fixed, new Set(webState.entries.keys()), webState.loose)) flash('web-status', "⚠️ This browser won't keep the layout (storage is off).");
}

function setupWebView(view) {
    const ptrs = new Map();
    let pan = null, pinch = null, drag = null;
    const local = ev => { const r = view.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    const world = p => { const v = webState.view; return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k }; };
    const nodeOf = ev => { const g = ev.target.closest && ev.target.closest('.wg-node'); return g && view.contains(g) ? g.dataset.id : null; };

    view.addEventListener('pointerdown', ev => {
        if (ev.target.closest('.um-zoom') || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        ptrs.set(ev.pointerId, local(ev));
        if (ptrs.size === 1) {
            const id = nodeOf(ev);
            const v = webState.view;
            if (id) {
                const w = world(local(ev)), p = webState.pos[id];
                drag = { id, x0: ev.clientX, y0: ev.clientY, dx: p[0] - w.x, dy: p[1] - w.y, moved: false, pid: ev.pointerId };
            } else {
                pan = { x0: ev.clientX, y0: ev.clientY, vx: v.x, vy: v.y, moved: false };
            }
        } else if (ptrs.size === 2) {
            const [a, b] = [...ptrs.values()], v = webState.view;
            pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, k: v.k, vx: v.x, vy: v.y };
            if (drag && drag.moved) webKeepPlaced(drag.id);
            drag = null;
            if (pan) pan.moved = true;
        }
    });
    view.addEventListener('pointermove', ev => {
        if (!ptrs.has(ev.pointerId)) return;
        ptrs.set(ev.pointerId, local(ev));
        const v = webState.view;
        if (pinch && ptrs.size >= 2) {
            const [a, b] = [...ptrs.values()], lim = webLimits();
            const k = Math.min(lim.max, Math.max(lim.min, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
            const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            v.x = m.x - (pinch.m.x - pinch.vx) * (k / pinch.k);
            v.y = m.y - (pinch.m.y - pinch.vy) * (k / pinch.k);
            v.k = k;
            v.fit = false;
            webApply();
            return;
        }
        const it = drag || pan;
        if (!it) return;
        const dx = ev.clientX - it.x0, dy = ev.clientY - it.y0;
        // A short wobble is still a click.
        if (!it.moved && Math.hypot(dx, dy) < 5) return;
        if (!it.moved) {
            it.moved = true;
            view.classList.add(drag ? 'wg-dragging' : 'um-panning');
            try { view.setPointerCapture(ev.pointerId); } catch (e) { /* the drag still follows the pointer over the web */ }
        }
        if (drag) {
            const w = world(local(ev));
            webMoveNode(drag.id, w.x + drag.dx, w.y + drag.dy);
        } else {
            v.x = pan.vx + dx;
            v.y = pan.vy + dy;
            v.fit = false;
            webApply();
        }
    });
    const up = ev => {
        if (!ptrs.has(ev.pointerId)) return;
        ptrs.delete(ev.pointerId);
        const cancel = ev.type === 'pointercancel';
        if (drag && ev.pointerId === drag.pid) {
            if (drag.moved) webKeepPlaced(drag.id);
            else if (!cancel) webSelect(drag.id);
            drag = null;
        } else if (pan && !pan.moved && !cancel && !ptrs.size) {
            webSelect(null);
        }
        if (ptrs.size === 1 && pinch) {
            // One finger left after a pinch: it pans from here.
            const [p] = [...ptrs.values()], r = view.getBoundingClientRect(), v = webState.view;
            pan = { x0: p.x + r.left, y0: p.y + r.top, vx: v.x, vy: v.y, moved: true };
            pinch = null;
        } else if (!ptrs.size) {
            pan = null;
            pinch = null;
            view.classList.remove('um-panning', 'wg-dragging');
        }
    };
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);

    // Hover lights up an entry's ties (a mouse only: a tap picks the entry instead).
    view.addEventListener('pointerover', ev => {
        if (ev.pointerType !== 'mouse' || drag || (pan && pan.moved)) return;
        const id = nodeOf(ev);
        if (id && id !== webState.hover) { webState.hover = id; webFocus(); }
    });
    view.addEventListener('pointerout', ev => {
        if (ev.pointerType !== 'mouse' || !webState.hover || (drag && drag.moved)) return;
        const to = ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest('.wg-node');
        if (to && to.dataset.id === webState.hover) return;
        webState.hover = null;
        webFocus();
    });

    view.addEventListener('wheel', ev => {
        const d = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1);
        const v = webState.view, lim = webLimits();
        // Nothing left to zoom that way: let the page scroll.
        if (!d || (d > 0 && v.k <= lim.min + 1e-9) || (d < 0 && v.k >= lim.max - 1e-9)) return;
        ev.preventDefault();
        const p = local(ev);
        webZoomAt(Math.exp(-d * 0.0015), p.x, p.y);
    }, { passive: false });
    view.addEventListener('dblclick', ev => {
        if (ev.target.closest('.um-zoom')) return;
        const id = nodeOf(ev);
        if (id) { webOpenInNotebook(id); return; }
        const p = local(ev);
        webZoomAt(2, p.x, p.y);
    });
    view.addEventListener('keydown', ev => {
        if (ev.target !== view || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const step = 80;
        const act = {
            '+': () => webZoomCenter(1.5), '=': () => webZoomCenter(1.5), '-': () => webZoomCenter(1 / 1.5), '_': () => webZoomCenter(1 / 1.5), '0': webFit,
            ArrowLeft: () => webPanBy(step, 0), ArrowRight: () => webPanBy(-step, 0), ArrowUp: () => webPanBy(0, step), ArrowDown: () => webPanBy(0, -step),
            Escape: () => webSelect(null)
        }[ev.key];
        if (!act) return;
        ev.preventDefault();
        act();
    });
    view.addEventListener('click', ev => {
        const z = ev.target.closest('[data-zoom]');
        if (!z) return;
        if (z.dataset.zoom === 'fit') webFit();
        else webZoomCenter(z.dataset.zoom === 'in' ? 1.5 : 1 / 1.5);
    });
    new ResizeObserver(() => webSize()).observe(view);
}

// ── Picture ───────────────────────────────────────────────
async function webDownload() {
    const { nodes, edges } = webVisible();
    if (!nodes.length) return;
    const nb = nbLoad();
    const b = webBounds(nodes, 40);
    const title = nb.name ? 46 : 0;
    const vb = { x: b.x, y: b.y - title, w: b.w, h: b.h + title };
    const scale = Math.min(2, 8000 / vb.w, 8000 / vb.h);
    const w = Math.round(vb.w * scale), h = Math.round(vb.h * scale);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}">`
        + `<rect class="wg-bg" x="${vb.x.toFixed(1)}" y="${vb.y.toFixed(1)}" width="${vb.w.toFixed(1)}" height="${vb.h.toFixed(1)}"/>`
        + (title ? `<text class="wg-title" x="${(vb.x + 24).toFixed(1)}" y="${(vb.y + 34).toFixed(1)}">${esc(nb.name)}</text>` : '')
        + webInnerHTML(nodes, edges) + '</svg>';
    flash('web-status', '⏳ Drawing the picture…');
    const ok = await mapExportPng(svg, w, h, mapPageCss('.wg-'), `${mapFileSlug(nb.name || 'campaign')}-web.png`);
    flash('web-status', ok ? `⬇️ Saved a ${w} × ${h} picture of ${nodes.length} ${nodes.length === 1 ? 'entry' : 'entries'}.`
        : "⚠️ This browser couldn't draw a picture that big. Hide some kinds and try again.");
}

// ── Setup ─────────────────────────────────────────────────
function webShownTab() {
    return !document.getElementById('tab-web').hidden;
}

function setupWeb() {
    const view = document.getElementById('web-view');
    setupWebView(view);
    document.getElementById('web-kinds').addEventListener('click', ev => {
        const b = ev.target.closest('.wg-kind');
        if (!b) return;
        if (webState.hidden.has(b.dataset.kind)) webState.hidden.delete(b.dataset.kind);
        else webState.hidden.add(b.dataset.kind);
        webState.view.fit = true;
        renderWeb();
    });
    Object.keys(WEB_EDGE_TYPES).forEach(t => document.getElementById('web-l-' + t).addEventListener('change', ev => {
        webState.lines[t] = ev.target.checked;
        renderWeb();
    }));
    document.getElementById('web-loose').addEventListener('change', ev => {
        webState.loose = ev.target.checked;
        webState.view.fit = true;
        renderWeb();
    });
    const q = document.getElementById('web-q');
    q.addEventListener('input', () => { webState.q = q.value; webFocus(); });
    q.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        const m = webMatches();
        if (!m || !m.length) return;
        // Enter again steps to the next match.
        const i = m.indexOf(webState.sel);
        webSelect(m[(i + 1) % m.length], true);
    });
    document.getElementById('web-panel').addEventListener('click', ev => {
        const go = ev.target.closest('.wg-go');
        if (go) { webSelect(go.dataset.id, true); return; }
        const b = ev.target.closest('[data-web]');
        if (!b) return;
        const id = webState.sel;
        if (b.dataset.web === 'nb') webOpenInNotebook(id);
        else if (b.dataset.web === 'close') { webSelect(null); view.focus({ preventScroll: true }); }
        else if (b.dataset.web === 'free') {
            webState.fixed.delete(id);
            const el = webState.nodeEls.get(id);
            if (el) el.classList.remove('wg-fixed');
            webSaveStore(webState.pos, webState.fixed, new Set(webState.entries.keys()), webState.loose);
            webPanel();
            flash('web-status', '📌 It moves again the next time you tidy up.');
        }
    });
    document.getElementById('web-tidy').addEventListener('click', () => {
        webState.restarting = false;
        renderWeb(nbLoad(), 'tidy');
        flash('web-status', `🧲 Tidied up${webState.fixed.size ? '; the entries you placed stayed put' : ''}.`);
    });
    document.getElementById('web-restart').addEventListener('click', () => {
        if (webState.fixed.size && !webState.restarting) {
            webState.restarting = true;
            document.getElementById('web-restart').textContent = '⚠️ Click again: your placed entries move too';
            return;
        }
        webState.restarting = false;
        webState.view.fit = true;
        renderWeb(nbLoad(), 'restart');
        flash('web-status', '🔀 Laid out afresh.');
    });
    document.getElementById('web-png').addEventListener('click', () => webDownload());
    document.getElementById('web-nb').addEventListener('click', () => switchWorldTab('notebook'));
    // A change to the notebook (here or in another tab) redraws the web, or waits until it's shown.
    nbOnChange(nb => {
        if (webShownTab()) renderWeb(nb);
        else webState.drawn = false;
    });
}

WORLD_TABS.web = {
    setup: setupWeb,
    params: () => worldUrlFor('web', {}),
    apply: () => { renderWeb(); return true; },
    fresh: () => renderWeb(),
    rolled: () => webState.drawn
};
