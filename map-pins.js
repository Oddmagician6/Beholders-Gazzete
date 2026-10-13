/* ============================================
   MAP PINS (F53): numbered pins on an SVG map
   The page-free part, shared by the Continent tab (F53) and your own maps (F54).
   A pin is { id, x, y, name, note, to }: x and y are fractions of the map's width and
   height (0 to 1), so a pin stays put whatever size the map is drawn at, and `to` is
   the id of the notebook entry it opens ('' for none).
     pinClean(raw, ids)  untrusted pins → clean ones (ids: the entry ids `to` may name)
     pinSvg(pins, W, H)  the pins as an SVG <g> for a W × H map
     pinWire(host, o)    placing, dragging, opening, and arrow-key nudging, delegated
                         from `host`, so the map inside it can be redrawn freely
   ============================================ */

const PIN_LIMITS = { pins: 60, name: 80, note: 400 };

function pinText(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function pinEsc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A spot on the map as a fraction, 4 decimals, kept on the map; null if it isn't a number.
function pinCoord(v) {
    const n = typeof v === 'number' ? v : NaN;
    return Number.isFinite(n) ? Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000 : null;
}

// Clean pins from untrusted data (storage or an imported file). ids: a Set of the entry ids
// a pin may open (others become ''), or null to keep any well-formed id.
function pinClean(raw, ids = null) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set(), out = [];
    raw.forEach(p => {
        if (out.length >= PIN_LIMITS.pins || !p || typeof p !== 'object') return;
        if (typeof p.id !== 'string' || !/^[a-z0-9]{1,12}$/.test(p.id) || seen.has(p.id)) return;
        const x = pinCoord(p.x), y = pinCoord(p.y);
        if (x === null || y === null) return;
        seen.add(p.id);
        const to = typeof p.to === 'string' && /^[a-z0-9]{1,16}$/.test(p.to) && (!ids || ids.has(p.to)) ? p.to : '';
        out.push({ id: p.id, x, y, name: pinText(p.name, PIN_LIMITS.name), note: pinText(p.note, PIN_LIMITS.note), to });
    });
    return out;
}

function pinNewId(pins) {
    let id;
    do { id = Math.floor(Math.random() * 2176782336).toString(36); } while (pins.some(p => p.id === id));
    return id;
}

// A pin's name, or its number when it has none.
function pinLabel(pin, n) {
    return pin.name || `Pin ${n + 1}`;
}

// The pins as SVG on a W × H map. cls prefixes the classes (<cls>-pins, -pin, -pin-on, -pin-head,
// -pin-n), so a map's own stylesheet (and map-export.js) picks them up; r is the head's radius in
// map units; sel is the id of the pin to show as picked. The tip of each pin sits on its spot.
function pinSvg(pins, W, H, { cls = 'mp', r = 6.5, sel = '' } = {}) {
    const f = v => (Math.round(v * 10) / 10).toString();
    const cy = -r * 2.3;
    const head = `M0 0C${f(-r * 0.35)} ${f(-r * 1.1)} ${f(-r)} ${f(-r * 1.6)} ${f(-r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 1 ${f(r)} ${f(cy)}C${f(r)} ${f(-r * 1.6)} ${f(r * 0.35)} ${f(-r * 1.1)} 0 0Z`;
    return `<g class="${cls}-pins">${pins.map((p, n) => {
        const label = `Pin ${n + 1}: ${pinLabel(p, n)}`;
        return `<g class="${cls}-pin${p.id === sel ? ` ${cls}-pin-on` : ''}" data-pin="${pinEsc(p.id)}" tabindex="0" role="button" aria-label="${pinEsc(label)}" transform="translate(${f(p.x * W)} ${f(p.y * H)})"><title>${pinEsc(label)}</title><path class="${cls}-pin-head" d="${head}"/><text class="${cls}-pin-n" y="${f(cy + 0.4)}" style="font-size:${f(r * (n < 9 ? 1.45 : 1.2))}px">${n + 1}</text></g>`;
    }).join('')}</g>`;
}

// Where a pointer event falls on a map, as fractions of W × H. frame: the element whose
// own units are the map's (an <svg> with a viewBox, or a transformed <g> inside one).
function pinPoint(frame, ev, W, H) {
    const m = frame.getScreenCTM();
    if (!m) return null;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: pinCoord(pt.x / W), y: pinCoord(pt.y / H) };
}

// Make pins work inside host. o = {
//   frame() → the map's frame element (see pinPoint) or null, size() → { W, H },
//   placing() → true while the map is in pin mode (click to drop, drag to move, arrows to nudge),
//   place(x, y), move(id, x, y), open(id, placing), dragging(on) (optional) }.
// Outside pin mode a click or Enter on a pin opens it, and the rest of the map is left alone.
// Only the pins on the map (<g data-pin>) count, so a page's own controls may carry data-pin too.
function pinWire(host, o) {
    let drag = null;
    const end = () => { if (drag && o.dragging) o.dragging(false); drag = null; };
    host.addEventListener('pointerdown', ev => {
        if (ev.button !== 0 || !o.placing()) return;
        const frame = o.frame();
        if (!frame || !frame.contains(ev.target)) return;
        const el = ev.target.closest('g[data-pin]');
        drag = { el, id: el ? el.dataset.pin : null, x0: ev.clientX, y0: ev.clientY, moved: false, pt: null };
        if (el) {
            ev.preventDefault();
            try { host.setPointerCapture(ev.pointerId); } catch (e) { /* the drag still follows the pointer while it's over the map */ }
            if (o.dragging) o.dragging(true);
        }
    });
    host.addEventListener('pointermove', ev => {
        if (!drag) return;
        if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 5) return;
        drag.moved = true;
        if (!drag.el) return;
        const frame = o.frame(), { W, H } = o.size();
        const pt = frame && pinPoint(frame, ev, W, H);
        if (!pt) return;
        drag.pt = pt;
        drag.el.setAttribute('transform', `translate(${(pt.x * W).toFixed(1)} ${(pt.y * H).toFixed(1)})`);
    });
    host.addEventListener('pointerup', ev => {
        if (!drag) return;
        const d = drag;
        end();
        if (d.el) {
            if (d.moved && d.pt) o.move(d.id, d.pt.x, d.pt.y);
            else if (!d.moved) o.open(d.id, true);
            return;
        }
        if (d.moved) return;
        const frame = o.frame(), { W, H } = o.size();
        const pt = frame && pinPoint(frame, ev, W, H);
        if (pt) o.place(pt.x, pt.y);
    });
    host.addEventListener('pointercancel', () => {
        const d = drag;
        end();
        // Put a half-dragged pin back where it was.
        if (d && d.el && d.moved) o.move(d.id, null, null);
    });
    host.addEventListener('click', ev => {
        const el = ev.target.closest('g[data-pin]');
        if (el && !o.placing()) { ev.preventDefault(); o.open(el.dataset.pin, false); }
    });
    host.addEventListener('keydown', ev => {
        const el = ev.target.closest('g[data-pin]');
        if (!el) return;
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.open(el.dataset.pin, o.placing()); return; }
        const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
        if (!step || !o.placing()) return;
        ev.preventDefault();
        const { W, H } = o.size();
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute('transform') || '');
        if (!m) return;
        const by = ev.shiftKey ? 0.05 : 0.01;
        o.move(el.dataset.pin, pinCoord(Number(m[1]) / W + step[0] * by), pinCoord(Number(m[2]) / H + step[1] * by));
    });
}
