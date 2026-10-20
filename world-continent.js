/* ============================================
   WORLDBUILDER: CONTINENT TAB (F40)
   A map of a continent from continent-engine.js (rollContinent), drawn as SVG: terrain,
   rivers, climate bands, nations and their borders, towns, roads, and points of
   interest. Below it: a journey planner (two towns → miles and terrain, opened in the
   Toolbox's Travel tab), each nation in full, the places worth the trip (each opens on
   the Sites tab), and the roads. A town opens on the Town tab inside its realm.
   The map downloads as a PNG (map-export.js). The URL holds the map.
   Pins (F53, map-pins.js; the bar and list are world-pins.js's pinBoard): 📍 Drop Pins, then click the map to drop numbered pins, drag
   them about, name them, add a note, and link each to a notebook entry (a town, a site,
   a faction…), which a click on the pin then opens. Pins are kept on this map's notebook
   entry (found by its seed and options; the first pin saves the map there), so they come
   back whenever the same map is opened, and they print and download with it.
   Two looks (style): 🎨 Illustrated, the hand-drawn pictures in img/map, and ✒️ Classic ink,
   the plain symbols that print well in black and white. The look is not part of the map:
   pins and notebook entries are the same for both.
   URL: ?tab=continent&seed=&size=&land=&nations=&style= (style: only when classic)
   ============================================ */

const CONT_FIELDS = { size: 'cont-size', land: 'cont-land', nations: 'cont-nations' };

let contState = { seed: null, data: null, journey: null };
let contBoard = null;   // the pins (world-pins.js), made in setupPins

function contStyle() {
    return document.getElementById('cont-style').value;
}

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
    params.style = contStyle() === 'atlas' ? null : contStyle();
    return worldUrlFor('continent', params);
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollContinentFor(seed = newSeed(), push = true) {
    contState.seed = seed;
    contState.data = contCached(seed, contOpts());
    contState.journey = null;
    if (contBoard) contBoard.state.sel = '';
    renderContinent();
    contScaleLabels(contState.data);
    if (push !== null) setUrlParams(contParams(), push);
}

function applyContinentUrl(p) {
    Object.entries(CONT_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    document.getElementById('cont-style').value = CONT_STYLES[p.get('style')] ? p.get('style') : 'atlas';
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
    return 'worldbuilder?' + params.toString();
}

function contSiteLink(p) {
    return 'worldbuilder?' + new URLSearchParams({ tab: 'sites', kind: CONT_POIS[p.kind].site, seed: p.seed }).toString();
}

function contTravelLink(c, a, b, trip) {
    return 'toolbox?' + new URLSearchParams({ tab: 'travel', climate: trip.climate, terrain: trip.terrain, miles: trip.miles, seed: deriveSeed(c.seed, `trip.${a}.${b}`) }).toString();
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
        ${contArmsSvg(nat, `cn-arms-${nat.index}`, `class="cont-arms" role="img" aria-label="${esc(`The arms of ${nat.name}: ${nat.banner}`)}"`)}
        ${contDl(contNationLines(c, nat.index))}
        <ul class="wb-list cont-towns">${towns.map(t => contTownItem(c, t)).join('')}</ul>
        <p class="pan-links"><a class="btn" href="${esc(facNpcLink(nat.ruler))}">${facNpcIcon(nat.ruler)} ${esc(nat.ruler.title)} ${esc(nat.ruler.npc.firstName)}</a></p>
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

function contLegend() {
    const common = '─ ─ a road (dotted: an unkept track) · colored lands are nations, uncolored land is wild · dashed lines across the map mark the climate bands, named at the right edge';
    return contStyle() === 'atlas'
        ? `Tap a town or a numbered place to read about it. Each capital is drawn for its kind of rule (a castle for a kingdom, a cathedral for a theocracy, crystal towers for a magocracy…), and towns grow from a farmstead to a walled metropolis with their size; harbor towns sit on a pier · ${common} · mountains are snowcapped in the cold, and the odd one smokes · trees: forest (pines in the cold), palms: jungle, dunes: desert (a pool under palms: an oasis).`
        : `Tap a town or a numbered place to read about it. ■ a capital · ● a town · ◆ a place worth the trip · ${common} · ▲ mountains · ⌒ hills · trees: forest (pines in the cold) · ≈ dunes: desert · reeds: swamp.`;
}

// Redraw the map alone in the other look (the journey and pins stay).
function contRestyle() {
    const c = contState.data;
    if (!c) return;
    const wrap = document.querySelector('#cont-card .cont-map-wrap');
    wrap.innerHTML = contMapSvg(c, `Map of ${facCap(c.name)}`, 'cm', contStyle());
    document.getElementById('cm-journey').setAttribute('d', contJourneyPath(c, contState.journey));
    document.getElementById('cont-legend').innerHTML = contLegend();
    if (contBoard) contBoard.render();
    setUrlParams(contParams(), false);
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
            <div class="wb-pin-bar"></div>
            <div class="cont-map-wrap">${contMapSvg(c, `Map of ${facCap(c.name)}`, 'cm', contStyle())}</div>
            <p class="wb-legend" id="cont-legend">${contLegend()}</p>
            <div class="wb-pins"></div>
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
    if (contBoard) contBoard.render();
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

// ── Pins (F53, map-pins.js and world-pins.js) ─────────────
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
        const r = nbAdd({ kind: 'continent', ...WORLD_TABS.continent.entry(), href: 'worldbuilder?' + paramsQuery(contParams()) });
        if (!r || r.full) {
            flash('cont-status', r ? '⚠️ The notebook is full, and pins are kept there. Remove an entry first.' : "⚠️ This browser won't keep a notebook (storage is full or off), so it can't keep pins.");
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
    if (!nbStore(nb, quiet)) { flash('cont-status', "⚠️ This browser won't keep a notebook (storage is full or off), so it can't keep pins."); return false; }
    if (filed) flash('cont-status', '📓 This map is in the notebook now, so its pins come back whenever you open it.');
    return true;
}

function setupPins(card) {
    const size = () => ({ W: contState.data.map.cols * CONT_CELL, H: contState.data.map.rows * CONT_CELL });
    contBoard = pinBoard({
        card,
        rowId: 'cn-pin-',
        status: 'cont-status',
        ready: () => !!contState.data && !!card.querySelector('.cont-map'),
        entry: contEntry,
        edit: contEditPins,
        frame: () => card.querySelector('.cont-map'),
        size,
        drawMap: (pins, sel, placing) => {
            const svg = card.querySelector('.cont-map');
            const old = svg.querySelector('.cm-pins');
            if (old) old.remove();
            const { W, H } = size();
            svg.insertAdjacentHTML('beforeend', pinSvg(pins, W, H, { cls: 'cm', sel }));
            card.querySelector('.cont-map-wrap').classList.toggle('cont-pinning', placing);
        },
        foot: (nb, self) => `Pins are kept with this map in the <a href="worldbuilder?tab=notebook">📓 notebook</a>. They belong to the map as it is: another number of nations or mix of land and sea is another map, with pins of its own.${nb.entries.some(x => x !== self) ? '' : ' Save a town, a site, or a faction to the notebook, and a pin can open it.'}`
    });
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
    const svg = contMapSvg(c, `Map of ${name}`, 'cmx', contStyle())
        .replace('id="cmx-journey" d=""', `id="cmx-journey" d="${contJourneyPath(c, contState.journey)}"`)
        .replace(/<\/svg>\s*$/, `${pinSvg(pins, W, H, { cls: 'cm' })}</svg>`);
    const file = `${mapFileSlug(name)}-map.png`;
    btn.disabled = true;
    contStatus('🗺️ Drawing the map…');
    const ok = await mapExportPng(await mapInlineImages(svg), W * k, H * k, mapPageCss('.cm-'), file);
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
    const style = document.getElementById('cont-style');
    Object.entries(CONT_STYLES).forEach(([key, label]) => style.add(new Option(label, key)));
    style.addEventListener('change', contRestyle);
    document.getElementById('cont-roll').addEventListener('click', () => rollContinentFor());
    const card = document.getElementById('cont-card');
    card.addEventListener('click', e => {
        const k = e.target.closest('.cm-key');
        if (k && !contBoard.state.mode) contGo(k.dataset.go);
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
        const text = contText(contState.data) + (pins.length ? '\n\nPins:\n' + pins.map((p, n) => '  ' + wpLine(nb, p, n)).join('\n') : '');
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
