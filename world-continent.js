/* ============================================
   WORLDBUILDER: CONTINENT TAB (F40)
   A map of a continent from continent-engine.js (rollContinent), drawn as SVG: terrain,
   rivers, climate bands, nations and their borders, towns, roads, and points of
   interest. Below it: a journey planner (two towns → miles and terrain, opened in the
   Toolbox's Travel tab), each nation in full, the places worth the trip (each opens on
   the Sites tab), and the roads. A town opens on the Town tab inside its realm.
   Nothing is stored: the URL holds the map.
   URL: ?tab=continent&seed=&size=&land=&nations=
   ============================================ */

const CONT_FIELDS = { size: 'cont-size', land: 'cont-land', nations: 'cont-nations' };

let contState = { seed: null, data: null, journey: null };

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
    renderContinent();
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
            <div class="cont-map-wrap">${contMapSvg(c, `Map of ${facCap(c.name)}`)}</div>
            <p class="wb-legend">Tap a town or a numbered place to read about it. ■ a capital · ● a town · ◆ a place worth the trip · ─ ─ a road (dotted: an unkept track) · colored lands are nations, uncolored land is wild · dashed lines across the map mark the climate bands, named at the right edge · ▲ mountains · ⌒ hills · trees: forest (pines in the cold) · ≈ dunes: desert · reeds: swamp.</p>
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
        if (k) contGo(k.dataset.go);
    });
    card.addEventListener('keydown', e => {
        const k = e.target.closest('.cm-key');
        if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); contGo(k.dataset.go); }
    });
    card.addEventListener('change', e => {
        if (e.target.id === 'cont-from' || e.target.id === 'cont-to') contShowJourney();
    });
    document.getElementById('cont-copy').addEventListener('click', () => {
        if (contState.data) copyText(contText(contState.data), 'cont-status', 'the continent');
    });
    document.getElementById('cont-print').addEventListener('click', () => {
        if (!contState.data) return;
        document.body.classList.add('print-cont');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-cont'));
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
