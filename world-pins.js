/* ============================================
   WORLDBUILDER: PIN BOARDS (F53, F54)
   The page side of map pins, shared by the Continent tab and the Maps tab: the bar over
   the map (📍 Drop Pins / Done Pinning, ➕ Add a Pin, a hint), the list of pins under it
   (name, what it opens, note, ↗ Open, two-click ✕), the printed key, two-click 🗑️ Remove
   All Pins, and the handlers for all of it. Drawing and dragging the pins themselves is
   map-pins.js (pinSvg, pinWire). One board per tab:
     pinBoard({
       card,              the element holding the map, the bar (.wb-pin-bar), and the list (.wb-pins)
       rowId,             prefix of each pin row's id ('cn-pin-' → #cn-pin-<pin id>)
       status,            id of the tab's status line
       ready(),           true while there is a map to pin
       entry(nb),         the notebook entry the pins are kept on, or null
       edit(fn, quiet),   change the pins: fn(pins) edits a copy (return false to skip); true when kept
       frame(), size(),   for pinWire (see map-pins.js)
       drawMap(pins, sel, placing), the pins on the map (and the map's pin-mode look)
       foot(nb, self)     the line under the list
     }) → { state, render(nb), renderMap(nb), place(x, y), line(nb, pin, n) }
   A pin click opens its linked entry on the Notebook tab, or (while pinning, or with no
   link) its row under the map.
   ============================================ */

// The entries a pin can open: everything in the notebook but the map itself, by kind, then title.
function wpTargetsHTML(nb, self, pin) {
    const groups = Object.keys(NB_KINDS)
        .map(kind => [kind, nb.entries.filter(x => x.kind === kind && x !== self).sort((a, b) => a.title.localeCompare(b.title))])
        .filter(([, list]) => list.length);
    return `<option value="">Opens nothing</option>${groups.map(([kind, list]) => `<optgroup label="${esc(NB_KINDS[kind].label)}">${list.map(x =>
        `<option value="${esc(x.id)}"${x.id === pin.to ? ' selected' : ''}>${NB_KINDS[kind].icon} ${esc(x.title)}</option>`).join('')}</optgroup>`).join('')}`;
}

// One line per pin, for the printed key and the copied text.
function wpLine(nb, pin, n) {
    const to = pin.to && nbFind(nb, pin.to);
    return `${n + 1}. ${pinLabel(pin, n)}${pin.note ? `: ${pin.note}` : ''}${to ? ` (see ${to.title})` : ''}`;
}

function wpKeyHTML(nb, pins) {
    return pins.map((p, n) => `<li>${esc(wpLine(nb, p, n))}</li>`).join('');
}

function wpOpenEntry(id) {
    switchWorldTab('notebook');
    nbJump(id);
}

function pinBoard(o) {
    const state = { mode: false, sel: '', dragging: false, removing: null, clearing: false };
    const timers = {};
    const pinsOf = nb => { const e = o.entry(nb); return (e && e.pins) || []; };

    function rowHTML(nb, self, pin, n) {
        const to = pin.to && nbFind(nb, pin.to);
        const id = esc(pin.id);
        return `<li class="wb-pin${pin.id === state.sel ? ' wb-pin-on' : ''}" id="${o.rowId}${id}" tabindex="-1">
            <span class="site-n">${n + 1}</span>
            <div class="wb-pin-fields">
                <input type="text" class="wb-pin-name" data-pin="${id}" maxlength="${PIN_LIMITS.name}" value="${esc(pin.name)}" placeholder="Pin ${n + 1}" aria-label="Name of pin ${n + 1}">
                <select class="wb-pin-to" data-pin="${id}" aria-label="What pin ${n + 1} opens">${wpTargetsHTML(nb, self, pin)}</select>
                <input type="text" class="wb-pin-note" data-pin="${id}" maxlength="${PIN_LIMITS.note}" value="${esc(pin.note)}" placeholder="A note: what's here, what happened" aria-label="Note on pin ${n + 1}">
            </div>
            <span class="wb-pin-acts">
                ${to ? `<button type="button" class="btn wb-pin-go" data-pin="${id}">${NB_KINDS[to.kind].icon} Open →</button>` : ''}
                <button type="button" class="btn wb-pin-del" data-pin="${id}" aria-label="Remove pin ${n + 1}">${state.removing === pin.id ? '⚠️ Sure?' : '✕'}</button>
            </span>
        </li>`;
    }

    function hint(pins) {
        if (state.mode) return 'Click or tap the map to drop a pin. Drag a pin to move it, or focus it and use the arrow keys (Shift for bigger steps).';
        if (pins.length) return `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'} on this map. A linked pin opens its notebook entry; the others open their row below.`;
        return "Mark your own places: the party's camp, where the dragon was seen, the village that isn't on any map.";
    }

    // Draw the pins: on the map, the bar above it, and the list below. Keyboard focus stays where it was.
    function render(nb = nbLoad()) {
        const bar = o.card.querySelector('.wb-pin-bar'), list = o.card.querySelector('.wb-pins');
        if (!o.ready() || !bar || !list) return;
        const self = o.entry(nb), pins = (self && self.pins) || [];
        if (state.sel && !pins.some(p => p.id === state.sel)) state.sel = '';
        const active = document.activeElement;
        const refocus = active && o.card.contains(active)
            ? (active.dataset && active.dataset.pin ? `.${active.classList[0]}[data-pin="${active.dataset.pin}"]` : active.id ? '#' + active.id : null) : null;

        o.drawMap(pins, state.sel, state.mode);
        bar.innerHTML = `
            <button type="button" class="btn${state.mode ? ' btn-gold' : ''} wb-pin-mode" aria-pressed="${state.mode}">📍 ${state.mode ? 'Done Pinning' : 'Drop Pins'}</button>
            ${state.mode ? '<button type="button" class="btn wb-pin-add">➕ Add a Pin</button>' : ''}
            <span class="wb-small wb-pin-hint">${esc(hint(pins))}</span>`;
        list.innerHTML = pins.length ? `
            <h5 class="wb-pins-h">📍 Your pins</h5>
            <ol class="wb-pin-list">${pins.map((p, n) => rowHTML(nb, self, p, n)).join('')}</ol>
            <ol class="wb-pin-key">${wpKeyHTML(nb, pins)}</ol>
            <p class="wb-small wb-pin-foot">${o.foot(nb, self)}</p>
            <p class="pan-links"><button type="button" class="btn wb-pin-clear">${state.clearing ? '⚠️ Click again to remove every pin' : '🗑️ Remove All Pins'}</button></p>` : '';

        if (refocus) { const el = o.card.querySelector(refocus); if (el) el.focus({ preventScroll: true }); }
    }

    // Redraw only the pins on the map and the printed key (a name being typed).
    function renderMap(nb = nbLoad()) {
        if (!o.ready()) return;
        const pins = pinsOf(nb);
        o.drawMap(pins, state.sel, state.mode);
        const key = o.card.querySelector('.wb-pin-key');
        if (key) key.innerHTML = wpKeyHTML(nb, pins);
    }

    function go(id) {
        const el = document.getElementById(o.rowId + id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
        el.classList.remove('wb-flash');
        void el.offsetWidth;
        el.classList.add('wb-flash');
    }

    function place(x, y) {
        let n = 0;
        const ok = o.edit(pins => {
            if (pins.length >= PIN_LIMITS.pins) {
                flash(o.status, `⚠️ A map holds ${PIN_LIMITS.pins} pins at most. Remove one first.`);
                return false;
            }
            const id = pinNewId(pins);
            pins.push({ id, x, y, name: '', note: '', to: '' });
            state.sel = id;
            n = pins.length;
        });
        if (ok) flash(o.status, `📍 Pin ${n} dropped. Name it and link it under the map.`);
    }

    // x and y null: a drag was called off, so put the pin back.
    function move(id, x, y) {
        if (x === null || y === null) { render(); return; }
        state.sel = id;
        if (!o.edit(pins => { const p = pins.find(q => q.id === id); if (!p) return false; p.x = x; p.y = y; })) render();
    }

    // A click on a pin: its notebook entry, or (while pinning, or with no link) its row under the map.
    function open(id, placing) {
        const nb = nbLoad();
        const pin = pinsOf(nb).find(p => p.id === id);
        if (!pin) return;
        const to = pin.to && nbFind(nb, pin.to);
        if (to && !placing) { wpOpenEntry(to.id); return; }
        state.sel = id;
        render(nb);
        if (!placing) go(id);
    }

    pinWire(o.card, {
        frame: o.frame,
        size: o.size,
        placing: () => state.mode && o.ready(),
        place,
        move,
        open,
        dragging: on => { state.dragging = on; }
    });
    o.card.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('wb-pin-mode')) { state.mode = !state.mode; render(); return; }
        if (t.classList.contains('wb-pin-add')) { place(0.5, 0.5); return; }
        if (t.classList.contains('wb-pin-go')) {
            const pin = pinsOf(nbLoad()).find(p => p.id === t.dataset.pin);
            if (pin && pin.to) wpOpenEntry(pin.to);
            return;
        }
        if (t.classList.contains('wb-pin-del')) {
            const id = t.dataset.pin;
            if (state.removing !== id) {
                state.removing = id;
                render();
                setTimeout(() => { if (state.removing === id) { state.removing = null; render(); } }, 4000);
                return;
            }
            state.removing = null;
            o.edit(pins => { const i = pins.findIndex(p => p.id === id); if (i < 0) return false; pins.splice(i, 1); });
            return;
        }
        if (t.classList.contains('wb-pin-clear')) {
            if (!state.clearing) {
                state.clearing = true;
                render();
                setTimeout(() => { if (state.clearing) { state.clearing = false; render(); } }, 4000);
                return;
            }
            state.clearing = false;
            if (o.edit(pins => { pins.length = 0; })) flash(o.status, '🗑️ Every pin is gone from this map.');
        }
    });
    o.card.addEventListener('change', e => {
        const sel = e.target.closest('.wb-pin-to');
        if (sel) o.edit(pins => { const p = pins.find(q => q.id === sel.dataset.pin); if (!p) return false; p.to = sel.value; });
    });
    // Names and notes save as you type, without redrawing the box you're typing in.
    o.card.addEventListener('input', e => {
        const box = e.target.closest('.wb-pin-name, .wb-pin-note');
        if (!box) return;
        const id = box.dataset.pin, k = box.classList.contains('wb-pin-name') ? 'name' : 'note', key = id + '|' + k;
        clearTimeout(timers[key]);
        timers[key] = setTimeout(() => {
            delete timers[key];
            if (o.edit(pins => { const p = pins.find(q => q.id === id); if (!p) return false; p[k] = box.value; }, true)) renderMap();
        }, 400);
    });
    nbOnChange(nb => { if (o.ready() && !state.dragging) render(nb); });

    return { state, render, renderMap, place, line: wpLine };
}
