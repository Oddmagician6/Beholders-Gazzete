/* ============================================
   WORLDBUILDER: CONTINENT TAB (F40)
   A map of a continent from continent-engine.js (rollContinent), drawn as SVG: terrain,
   rivers, climate bands, nations and their borders, towns, roads, and points of
   interest. Below it: a journey planner (two towns → miles and terrain, opened in the
   Toolbox's Travel tab), each nation in full, the places worth the trip (each opens on
   the Sites tab), and the roads. A town opens on the Town tab inside its realm.
   The map downloads as a PNG (map-export.js). The URL holds the map.
   Pins (F53, map-pins.js): 📍 Drop Pins, then click the map to drop numbered pins, drag
   them about, name them, add a note, and link each to a notebook entry (a town, a site,
   a faction…), which a click on the pin then opens. Pins are kept on this map's notebook
   entry (found by its seed and options; the first pin saves the map there), so they come
   back whenever the same map is opened, and they print and download with it.
   URL: ?tab=continent&seed=&size=&land=&nations=
   ============================================ */

const CONT_FIELDS = { size: 'cont-size', land: 'cont-land', nations: 'cont-nations' };

let contState = { seed: null, data: null, journey: null, pinMode: false, pinSel: '', dragging: false, removing: null, clearing: false };
const contPinTimers = {};

function contOpts() {
    const v = id => document.getElementById(id).value;
    return { size: v('cont-size'), land: v('cont-land'), nations: v('cont-nations') };
}

function contParams() {
    const params = {};
    Object.entries(CONT_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = contState.seed;
    return worldUrlFor('continent', params);
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollContinentFor(seed = newSeed(), push = true) {
    contState.seed = seed;
    contState.data = contCached(seed, contOpts());
    contState.journey = null;
    contState.pinSel = '';
    renderContinent();
    contScaleLabels(contState.data);
    if (push !== null) setUrlParams(contParams(), push);
}

function applyContinentUrl(p) {
    Object.entries(CONT_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollContinentFor(seed, null);
    return true;
}

// ── Links out ─────────────────────────────────────────────
function contTownLink(c, t) {
    const params = new URLSearchParams({ tab: 'town', seed: t.seed, size: t.size, setting: t.setting, wealth: t.wealth, cont: c.seed });
    Object.entries(TOWN_CONT_KEYS).forEach(([key, opt]) => { if (c.opts[opt] !== 'random') params.set(key, c.opts[opt]); });
    params.set('ctown', t.id + 1);
    return 'worldbuilder.html?' + params.toString();
}

function contSiteLink(p) {
    return 'worldbuilder.html?' + new URLSearchParams({ tab: 'sites', kind: CONT_POIS[p.kind].site, seed: p.seed }).toString();
}

function contTravelLink(c, a, b, trip) {
    return 'toolbox.html?' + new URLSearchParams({ tab: 'travel', climate: trip.climate, terrain: trip.terrain, miles: trip.miles, seed: deriveSeed(c.seed, `trip.${a}.${b}`) }).toString();
}

// ── Render ────────────────────────────────────────────────
function contDl(lines) {
    return `<dl class="wb-dl">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function contTownItem(c, t) {
    const s = TOWN_SETTINGS[t.setting];
    return `<li id="cn-t${t.id}" tabindex="-1">${t.capital ? '👑' : TOWN_SIZES[t.size].icon} <b>${esc(t.name)}</b>,
        ${esc(TOWN_SIZES[t.size].a)}${t.capital ? ' and the capital' : ''} (${esc(s.label.toLowerCase())})
        <a class="town-go" href="${esc(contTownLink(c, t))}">Visit →</a></li>`;
}

function contNationHTML(c, nat) {
    const G = CONT_GOVS[nat.gov];
    const towns = c.towns.filter(t => t.nation === nat.index);
    return `<section class="wb-block wb-wide cont-nation" id="cn-n${nat.index}">
        <h4><span class="cont-swatch" style="background:${nat.color}"></span>${esc(facCap(nat.name))}<span class="wb-tag">${esc(G.label)}</span></h4>
        ${contDl(contNationLines(c, nat.index))}
        <ul class="wb-list cont-towns">${towns.map(t => contTownItem(c, t)).join('')}</ul>
        <p class="pan-links"><a class="btn" href="${esc(facNpcLink(nat.ruler))}">🎭 ${esc(nat.ruler.title)} ${esc(nat.ruler.npc.firstName)}</a></p>
    </section>`;
}

function contPoiHTML(c, p, n) {
    const P = CONT_POIS[p.kind];
    return `<li id="cn-p${p.id}" tabindex="-1"><span class="site-n">${n + 1}</span> <b>${esc(facCap(p.name))}</b> <span class="wb-tag">${esc(P.label)}</span>
        <p>${esc(contPoiWhere(c, p))} ${esc(contPoiHook(c, p))}</p>
        <a class="town-go" href="${esc(contSiteLink(p))}">🏚️ Explore ${esc(contMid(p.site))} →</a></li>`;
}

function contTownOptions(c) {
    return c.nations.map(nat => `<optgroup label="${esc(facCap(nat.name))}">${c.towns.filter(t => t.nation === nat.index)
        .map(t => `<option value="${t.id}">${esc(t.name)}${t.capital ? ' 👑' : ''}</option>`).join('')}</optgroup>`).join('');
}

function contJourneyText(c, j) {
    if (!j) return 'There is no way there by land. Find a ship.';
    const T = TRAVEL_TERRAIN[j.terrain];
    const share = Math.round(j.roadShare * 100);
    const how = j.terrain === 'road' ? `mostly by road (${share}% of the way)` : `mostly ${T.label.toLowerCase()}${share ? `, with ${share}% of it on roads` : ', no roads'}`;
    const days = Math.max(1, Math.round(j.miles / 24));
    return `About ${j.miles.toLocaleString('en-US')} miles, ${how}. At a normal pace (24 miles a day), about ${days} day${days === 1 ? '' : 's'}${T.difficult ? ', or longer: the going is hard' : ''}.`;
}

function renderContinent() {
    const c = contState.data;
    if (!c) return;
    const Z = CONT_SIZES[c.size], L = CONT_LANDS[c.land];
    const wild = c.map.landIdx.filter(i => c.map.owner[i] < 0).length;
    document.getElementById('cont-card').innerHTML = `
        <header class="wb-head">
            <p class="wb-kicker">${Z.icon} ${esc(Z.label)} map · 🌊 ${esc(L.label)} · 👑 ${c.nations.length} nations</p>
            <h3 class="wb-name">${esc(facCap(c.name))}</h3>
            <p class="wb-sub">${esc(contSummary(c))}</p>
        </header>
        <section class="wb-block wb-wide">
            <h4>🗺️ The map</h4>
            <div class="cont-pin-bar" id="cont-pin-bar"></div>
            <div class="cont-map-wrap">${contMapSvg(c, `Map of ${facCap(c.name)}`)}</div>
            <p class="wb-legend">Tap a town or a numbered place to read about it. ■ a capital · ● a town · ◆ a place worth the trip · ─ ─ a road (dotted: an unkept track) · colored lands are nations, uncolored land is wild · dashed lines across the map mark the climate bands, named at the right edge · ▲ mountains · ⌒ hills · trees: forest (pines in the cold) · ≈ dunes: desert · reeds: swamp.</p>
            <div class="cont-pins" id="cont-pins"></div>
        </section>
        <section class="wb-block wb-wide cont-journey">
            <h4>🧭 Plan a journey</h4>
            <div class="tool-form">
                <label>From <select id="cont-from"><option value="">Pick a town</option>${contTownOptions(c)}</select></label>
                <label>To <select id="cont-to"><option value="">Pick a town</option>${contTownOptions(c)}</select></label>
            </div>
            <p id="cont-trip" class="wb-small">Pick two towns to see the way between them on the map, how far it is, and the country it crosses.</p>
            <p class="pan-links" id="cont-trip-links"></p>
        </section>
        <h4 class="site-key-h">👑 The nations</h4>
        ${c.nations.map(nat => contNationHTML(c, nat)).join('')}
        <p class="wb-small cont-wilds">🌲 The wilds: about ${Math.round(wild / Math.max(1, c.map.landIdx.length) * 100)}% of the land belongs to no one.${c.seas.length ? ` The seas: ${esc(c.seas.map(s => s.name).join(' and '))}.` : ''}</p>
        <section class="wb-block wb-wide">
            <h4>🏚️ Places worth the trip</h4>
            <ul class="wb-list cont-pois">${c.pois.map((p, n) => contPoiHTML(c, p, n)).join('')}</ul>
        </section>
        <section class="wb-block wb-wide">
            <h4>🛤️ Roads</h4>
            <ul class="wb-list">${c.roads.map(r => `<li>${esc(contRoadLine(c, r))}
                <a class="town-go" href="${esc(contTravelLink(c, r.a, r.b, r))}">Travel it →</a></li>`).join('')}</ul>
        </section>`;
    renderPins();
}

function contShowJourney() {
    const c = contState.data;
    const a = document.getElementById('cont-from').value, b = document.getElementById('cont-to').value;
    const path = document.getElementById('cm-journey');
    const out = document.getElementById('cont-trip'), links = document.getElementById('cont-trip-links');
    if (a === '' || b === '' || a === b) {
        contState.journey = null;
        path.setAttribute('d', '');
        out.textContent = a !== '' && a === b ? 'You are already there.' : 'Pick two towns to see the way between them on the map, how far it is, and the country it crosses.';
        links.innerHTML = '';
        return;
    }
    const j = contJourney(c, +a, +b);
    contState.journey = j;
    path.setAttribute('d', contJourneyPath(c, j));
    out.textContent = contJourneyText(c, j);
    links.innerHTML = j ? `<a class="btn" href="${esc(contTravelLink(c, +a, +b, j))}">🧭 Travel it in the Toolbox</a>` : '';
}

// ── Pins (F53, map-pins.js) ───────────────────────────────
// This map's notebook entry (same seed and options), or null.
function contEntry(nb) {
    if (!contState.seed) return null;
    const p = contParams();
    return nbFindRoll(nb, 'continent', p.seed, k => p[k] || '');
}

function contPins(nb = nbLoad()) {
    const e = contEntry(nb);
    return (e && e.pins) || [];
}

// Change this map's pins: fn(pins) edits a copy (return false to skip). The first pin files the
// map in the notebook. quiet: store without redrawing (a name being typed). Returns true when kept.
function contEditPins(fn, quiet = false) {
    let nb = nbLoad(), e = contEntry(nb), filed = false;
    if (!e) {
        const r = nbAdd({ kind: 'continent', ...WORLD_TABS.continent.entry(), href: 'worldbuilder.html?' + paramsQuery(contParams()) });
        if (!r || r.full) {
            flash('cont-status', r ? '⚠️ The notebook is full, and pins are kept there. Remove an entry first.' : "⚠️ This browser won't keep a notebook (storage is off), so it can't keep pins.");
            return false;
        }
        nb = nbLoad();
        e = contEntry(nb);
        if (!e) return false;
        filed = true;
    }
    const pins = (e.pins || []).map(p => ({ ...p }));
    if (fn(pins) === false) return false;
    nbSetPins(e, pins, new Set(nb.entries.map(x => x.id)));
    if (!nbStore(nb, quiet)) { flash('cont-status', "⚠️ This browser won't keep a notebook (storage is off), so it can't keep pins."); return false; }
    if (filed) flash('cont-status', '📓 This map is in the notebook now, so its pins come back whenever you open it.');
    return true;
}

// The entries a pin can open: everything in the notebook but this map, by kind, then title.
function contPinTargetsHTML(nb, self, pin) {
    const groups = Object.keys(NB_KINDS)
        .map(kind => [kind, nb.entries.filter(x => x.kind === kind && x !== self).sort((a, b) => a.title.localeCompare(b.title))])
        .filter(([, list]) => list.length);
    return `<option value="">Opens nothing</option>${groups.map(([kind, list]) => `<optgroup label="${esc(NB_KINDS[kind].label)}">${list.map(x =>
        `<option value="${esc(x.id)}"${x.id === pin.to ? ' selected' : ''}>${NB_KINDS[kind].icon} ${esc(x.title)}</option>`).join('')}</optgroup>`).join('')}`;
}

function contPinRowHTML(nb, self, pin, n) {
    const to = pin.to && nbFind(nb, pin.to);
    const id = esc(pin.id);
    return `<li class="cont-pin${pin.id === contState.pinSel ? ' cont-pin-on' : ''}" id="cn-pin-${id}" tabindex="-1">
        <span class="site-n">${n + 1}</span>
        <div class="cont-pin-fields">
            <input type="text" class="cont-pin-name" data-pin="${id}" maxlength="${PIN_LIMITS.name}" value="${esc(pin.name)}" placeholder="Pin ${n + 1}" aria-label="Name of pin ${n + 1}">
            <select class="cont-pin-to" data-pin="${id}" aria-label="What pin ${n + 1} opens">${contPinTargetsHTML(nb, self, pin)}</select>
            <input type="text" class="cont-pin-note" data-pin="${id}" maxlength="${PIN_LIMITS.note}" value="${esc(pin.note)}" placeholder="A note: what's here, what happened" aria-label="Note on pin ${n + 1}">
        </div>
        <span class="cont-pin-acts">
            ${to ? `<button type="button" class="btn cont-pin-go" data-pin="${id}">${NB_KINDS[to.kind].icon} Open →</button>` : ''}
            <button type="button" class="btn cont-pin-del" data-pin="${id}" aria-label="Remove pin ${n + 1}">${contState.removing === pin.id ? '⚠️ Sure?' : '✕'}</button>
        </span>
    </li>`;
}

// One line per pin, for the printed key and the copied text.
function contPinLine(nb, pin, n) {
    const to = pin.to && nbFind(nb, pin.to);
    return `${n + 1}. ${pinLabel(pin, n)}${pin.note ? `: ${pin.note}` : ''}${to ? ` (see ${to.title})` : ''}`;
}

function contPinKeyHTML(nb, pins) {
    return pins.map((p, n) => `<li>${esc(contPinLine(nb, p, n))}</li>`).join('');
}

function contPinHint(pins) {
    if (contState.pinMode) return 'Click or tap the map to drop a pin. Drag a pin to move it, or focus it and use the arrow keys (Shift for bigger steps).';
    if (pins.length) return `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'} on this map. A linked pin opens its notebook entry; the others open their row below.`;
    return "Mark your own places: the party's camp, where the dragon was seen, the village that isn't on any map.";
}

// Draw the pins: on the map, the bar above it, and the list below. Keyboard focus stays where it was.
function renderPins(nb = nbLoad()) {
    const c = contState.data;
    const card = document.getElementById('cont-card');
    const svg = card.querySelector('.cont-map');
    if (!c || !svg) return;
    const self = contEntry(nb), pins = (self && self.pins) || [];
    if (contState.pinSel && !pins.some(p => p.id === contState.pinSel)) contState.pinSel = '';
    const active = document.activeElement;
    const refocus = active && card.contains(active)
        ? (active.dataset && active.dataset.pin ? `.${active.classList[0]}[data-pin="${active.dataset.pin}"]` : active.id ? '#' + active.id : null) : null;

    const old = svg.querySelector('.cm-pins');
    if (old) old.remove();
    svg.insertAdjacentHTML('beforeend', pinSvg(pins, c.map.cols * CONT_CELL, c.map.rows * CONT_CELL, { cls: 'cm', sel: contState.pinSel }));
    card.querySelector('.cont-map-wrap').classList.toggle('cont-pinning', contState.pinMode);

    document.getElementById('cont-pin-bar').innerHTML = `
        <button type="button" class="btn${contState.pinMode ? ' btn-gold' : ''}" id="cont-pin-mode" aria-pressed="${contState.pinMode}">📍 ${contState.pinMode ? 'Done Pinning' : 'Drop Pins'}</button>
        ${contState.pinMode ? '<button type="button" class="btn" id="cont-pin-add">➕ Add a Pin</button>' : ''}
        <span class="wb-small cont-pin-hint">${esc(contPinHint(pins))}</span>`;

    const others = nb.entries.some(x => x !== self);
    document.getElementById('cont-pins').innerHTML = pins.length ? `
        <h5 class="cont-pins-h">📍 Your pins</h5>
        <ol class="cont-pin-list">${pins.map((p, n) => contPinRowHTML(nb, self, p, n)).join('')}</ol>
        <ol class="cont-pin-key">${contPinKeyHTML(nb, pins)}</ol>
        <p class="wb-small cont-pin-foot">Pins are kept with this map in the <a href="worldbuilder.html?tab=notebook">📓 notebook</a>. They belong to the map as it is: another number of nations or mix of land and sea is another map, with pins of its own.${others ? '' : ' Save a town, a site, or a faction to the notebook, and a pin can open it.'}</p>
        <p class="pan-links"><button type="button" class="btn" id="cont-pin-clear">${contState.clearing ? '⚠️ Click again to remove every pin' : '🗑️ Remove All Pins'}</button></p>` : '';

    if (refocus) { const el = card.querySelector(refocus); if (el) el.focus({ preventScroll: true }); }
}

// Redraw only the pins on the map and the printed key (a name being typed).
function renderMapPins(nb = nbLoad()) {
    const c = contState.data;
    const old = document.querySelector('#cont-card .cm-pins');
    if (!c || !old) return;
    const pins = contPins(nb);
    old.outerHTML = pinSvg(pins, c.map.cols * CONT_CELL, c.map.rows * CONT_CELL, { cls: 'cm', sel: contState.pinSel });
    const key = document.querySelector('#cont-pins .cont-pin-key');
    if (key) key.innerHTML = contPinKeyHTML(nb, pins);
}

function contPlacePin(x, y) {
    let n = 0;
    const ok = contEditPins(pins => {
        if (pins.length >= PIN_LIMITS.pins) {
            flash('cont-status', `⚠️ A map holds ${PIN_LIMITS.pins} pins at most. Remove one first.`);
            return false;
        }
        const id = pinNewId(pins);
        pins.push({ id, x, y, name: '', note: '', to: '' });
        contState.pinSel = id;
        n = pins.length;
    });
    if (ok) flash('cont-status', `📍 Pin ${n} dropped. Name it and link it under the map.`);
}

// x and y null: a drag was called off, so put the pin back.
function contMovePin(id, x, y) {
    if (x === null || y === null) { renderPins(); return; }
    contState.pinSel = id;
    if (!contEditPins(pins => { const p = pins.find(q => q.id === id); if (!p) return false; p.x = x; p.y = y; })) renderPins();
}

// A click on a pin: its notebook entry, or (while pinning, or with no link) its row under the map.
function contOpenPin(id, placing) {
    const nb = nbLoad();
    const pin = contPins(nb).find(p => p.id === id);
    if (!pin) return;
    const to = pin.to && nbFind(nb, pin.to);
    if (to && !placing) { contOpenEntry(to.id); return; }
    contState.pinSel = id;
    renderPins(nb);
    if (!placing) contGo('pin-' + id);
}

function contOpenEntry(id) {
    switchWorldTab('notebook');
    nbJump(id);
}

function setupPins(card) {
    pinWire(card, {
        frame: () => card.querySelector('.cont-map'),
        size: () => ({ W: contState.data.map.cols * CONT_CELL, H: contState.data.map.rows * CONT_CELL }),
        placing: () => contState.pinMode && !!contState.data,
        place: contPlacePin,
        move: contMovePin,
        open: contOpenPin,
        dragging: on => { contState.dragging = on; }
    });
    card.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.id === 'cont-pin-mode') { contState.pinMode = !contState.pinMode; renderPins(); return; }
        if (t.id === 'cont-pin-add') { contPlacePin(0.5, 0.5); return; }
        if (t.classList.contains('cont-pin-go')) {
            const pin = contPins().find(p => p.id === t.dataset.pin);
            if (pin && pin.to) contOpenEntry(pin.to);
            return;
        }
        if (t.classList.contains('cont-pin-del')) {
            const id = t.dataset.pin;
            if (contState.removing !== id) {
                contState.removing = id;
                renderPins();
                setTimeout(() => { if (contState.removing === id) { contState.removing = null; renderPins(); } }, 4000);
                return;
            }
            contState.removing = null;
            contEditPins(pins => { const i = pins.findIndex(p => p.id === id); if (i < 0) return false; pins.splice(i, 1); });
            return;
        }
        if (t.id === 'cont-pin-clear') {
            if (!contState.clearing) {
                contState.clearing = true;
                renderPins();
                setTimeout(() => { if (contState.clearing) { contState.clearing = false; renderPins(); } }, 4000);
                return;
            }
            contState.clearing = false;
            if (contEditPins(pins => { pins.length = 0; })) flash('cont-status', '🗑️ Every pin is gone from this map.');
        }
    });
    card.addEventListener('change', e => {
        const sel = e.target.closest('.cont-pin-to');
        if (sel) contEditPins(pins => { const p = pins.find(q => q.id === sel.dataset.pin); if (!p) return false; p.to = sel.value; });
    });
    // Names and notes save as you type, without redrawing the box you're typing in.
    card.addEventListener('input', e => {
        const box = e.target.closest('.cont-pin-name, .cont-pin-note');
        if (!box) return;
        const id = box.dataset.pin, k = box.classList.contains('cont-pin-name') ? 'name' : 'note', key = id + '|' + k;
        clearTimeout(contPinTimers[key]);
        contPinTimers[key] = setTimeout(() => {
            delete contPinTimers[key];
            if (contEditPins(pins => { const p = pins.find(q => q.id === id); if (!p) return false; p[k] = box.value; }, true)) renderMapPins();
        }, 400);
    });
    nbOnChange(nb => { if (contState.data && !contState.dragging) renderPins(nb); });
}

// ── Map export (map-export.js) ────────────────────────────
// The size picker shows each size in pixels for this map.
function contScaleLabels(c) {
    const W = c.map.cols * CONT_CELL, H = c.map.rows * CONT_CELL;
    const names = { 2: 'Medium', 3: 'Large', 4: 'Huge' };
    [...document.getElementById('cont-scale').options].forEach(o => {
        const k = Number(o.value);
        o.textContent = `${names[k]}: ${(W * k).toLocaleString('en-US')} × ${(H * k).toLocaleString('en-US')} px`;
    });
}

function contStatus(text) {
    const el = document.getElementById('cont-status');
    clearTimeout(el._t);
    el.textContent = text;
}

async function contDownloadMap() {
    const c = contState.data;
    const btn = document.getElementById('cont-png');
    if (!c || btn.disabled) return;
    const k = Number(document.getElementById('cont-scale').value) || 3;
    const name = facCap(c.name);
    // The journey on screen is drawn after the map, so draw it into the copy too.
    const W = c.map.cols * CONT_CELL, H = c.map.rows * CONT_CELL;
    const pins = document.getElementById('cont-png-pins').checked ? contPins() : [];
    const svg = contMapSvg(c, `Map of ${name}`, 'cmx')
        .replace('id="cmx-journey" d=""', `id="cmx-journey" d="${contJourneyPath(c, contState.journey)}"`)
        .replace(/<\/svg>\s*$/, `${pinSvg(pins, W, H, { cls: 'cm' })}</svg>`);
    const file = `${mapFileSlug(name)}-map.png`;
    btn.disabled = true;
    contStatus('🗺️ Drawing the map…');
    const ok = await mapExportPng(svg, W * k, H * k, mapPageCss('.cm-'), file);
    btn.disabled = false;
    contStatus(ok
        ? `⬇️ Saved ${file}: ${(W * k).toLocaleString('en-US')} × ${(H * k).toLocaleString('en-US')} pixels.`
        : '⚠️ This browser could not draw a map that big. Try a smaller size.');
}

function contGo(key) {
    const el = document.getElementById('cn-' + key);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
    el.classList.remove('cont-flash');
    void el.offsetWidth;
    el.classList.add('cont-flash');
}

function setupContinent() {
    const size = document.getElementById('cont-size');
    Object.entries(CONT_SIZES).forEach(([key, z]) => size.add(new Option(`${z.label} (about ${Math.round(z.cols * z.miles / 100) * 100} miles across)`, key)));
    const land = document.getElementById('cont-land');
    Object.entries(CONT_LANDS).forEach(([key, l]) => land.add(new Option(l.label, key)));
    const nations = document.getElementById('cont-nations');
    for (let n = 3; n <= 8; n++) nations.add(new Option(`${n} nations`, String(n)));

    // Same seed: a new nation count keeps the land; a new land share raises or lowers the sea.
    Object.values(CONT_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (contState.seed) rollContinentFor(contState.seed, false);
    }));
    document.getElementById('cont-roll').addEventListener('click', () => rollContinentFor());
    const card = document.getElementById('cont-card');
    card.addEventListener('click', e => {
        const k = e.target.closest('.cm-key');
        if (k && !contState.pinMode) contGo(k.dataset.go);
    });
    card.addEventListener('keydown', e => {
        const k = e.target.closest('.cm-key');
        if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); contGo(k.dataset.go); }
    });
    card.addEventListener('change', e => {
        if (e.target.id === 'cont-from' || e.target.id === 'cont-to') contShowJourney();
    });
    setupPins(card);
    document.getElementById('cont-copy').addEventListener('click', () => {
        if (!contState.data) return;
        const nb = nbLoad(), pins = contPins(nb);
        const text = contText(contState.data) + (pins.length ? '\n\nPins:\n' + pins.map((p, n) => '  ' + contPinLine(nb, p, n)).join('\n') : '');
        copyText(text, 'cont-status', 'the continent');
    });
    document.getElementById('cont-print').addEventListener('click', () => {
        if (!contState.data) return;
        document.body.classList.add('print-cont');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-cont'));
    document.getElementById('cont-png').addEventListener('click', contDownloadMap);
    document.getElementById('cont-link').addEventListener('click', () =>
        copyPageLink(ok => flash('cont-status', ok ? '🔗 Link copied. It opens this same map.' : '⚠️ Copy blocked by the browser.')));
}

WORLD_TABS.continent = {
    setup: setupContinent,
    params: contParams,
    apply: applyContinentUrl,
    fresh: push => rollContinentFor(newSeed(), push),
    rolled: () => !!contState.seed,
    entry: () => ({ title: facCap(contState.data.name), sub: contSummary(contState.data) })
};
