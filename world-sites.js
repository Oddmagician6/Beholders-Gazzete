/* ============================================
   WORLDBUILDER: SITES TAB (F39)
   A keyed adventure site from site-engine.js (rollSite): its story, a map (SVG), and a
   key to every room (feature, foes, trap, exits), with the hoard in the last room. Each
   fight opens in the Toolbox's Encounter tab, and the hoard in the Loot generator.
   The map downloads as a PNG battle map on a 5-foot grid (map-export.js).
   "Use the History tab's history" dates the site to one of its ages (the History tab's
   own "Explore a ruin from this age" picks the age). Nothing is stored: the URL holds it.
   Two map styles: 🎨 Illustrated (floors, furniture, and doors from img/map) and ✒️ Classic.
   URL: ?tab=sites&seed=&kind=&size=&level=&party=&style= (style: only when classic)
   A new site (no seed in the URL) starts at the Toolbox Party tab's level and size (party.js);
   a shared one keeps its own (a missing level or party means level 3, 4 characters).
        &his=&hages=&hspan=&hstart=&hage=<age number>  (a linked history)
   ============================================ */

const SITE_FIELDS = { kind: 'site-kind', size: 'site-size', level: 'site-level', party: 'site-party' };
// The linked history's URL keys → its option names (the same keys the History tab uses).
const SITE_HIS_KEYS = { hages: 'ages', hspan: 'span', hstart: 'start' };

let siteState = { seed: null, data: null, his: null, history: null, hage: -1 };

function siteOpts() {
    const v = id => document.getElementById(id).value;
    return { kind: v('site-kind'), size: v('site-size'), level: v('site-level'), party: v('site-party') };
}

function siteStyle() {
    return document.getElementById('site-style').value;
}

function siteCtx() {
    return { history: siteState.history, hage: siteState.hage };
}

function siteParams() {
    const params = {};
    Object.entries(SITE_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = siteState.seed;
    params.style = siteStyle() === 'art' ? null : siteStyle();
    const h = siteState.his;
    params.his = h ? h.seed : null;
    Object.entries(SITE_HIS_KEYS).forEach(([key, opt]) => { params[key] = h && h[opt] !== 'random' ? h[opt] : null; });
    params.hage = h && siteState.hage >= 0 ? siteState.hage + 1 : null;
    return worldUrlFor('sites', params);
}

function siteSetHistory(h, hage = -1) {
    siteState.his = h;
    siteState.history = h ? rollHistory(h.seed, h) : null;
    siteState.hage = siteState.history && hage >= 0 && hage < siteState.history.list.length ? hage : -1;
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollSiteFor(seed = newSeed(), push = true) {
    siteState.seed = seed;
    siteState.data = rollSite(seed, siteOpts());
    renderSite();
    if (push !== null) setUrlParams(siteParams(), push);
}

function applySiteUrl(p) {
    Object.entries(SITE_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    document.getElementById('site-style').value = SITE_STYLES[p.get('style')] ? p.get('style') : 'art';
    const his = parseSeed(p.get('his'));
    const h = his ? { seed: his } : null;
    if (h) Object.entries(SITE_HIS_KEYS).forEach(([key, opt]) => { h[opt] = p.get(key) || 'random'; });
    siteSetHistory(h, (parseInt(p.get('hage'), 10) || 0) - 1);
    const seed = parseSeed(p.get('seed'));
    if (!seed && !p.has('level') && !p.has('party')) siteUseParty();
    if (!seed) return false;
    rollSiteFor(seed, null);
    return true;
}

// The Toolbox Party tab's level and size, when a party is saved.
function siteUseParty() {
    return partyFillLevelSize(document.getElementById('site-level'), document.getElementById('site-party'));
}

// Link the History tab's history (rolling one there first if it has none), or unlink.
function siteLinkHistory(on) {
    if (on) {
        if (!WORLD_TABS.history.rolled()) WORLD_TABS.history.fresh(null);
        siteSetHistory({ seed: hisState.seed, ...hisOpts() });
    } else {
        siteSetHistory(null);
    }
    renderSite();
    setUrlParams(siteParams(), false);
}

// ── Links out ─────────────────────────────────────────────
function siteFightLink(s, f) {
    const params = new URLSearchParams({ tab: 'enc', party: `${s.party}x${s.level}` });
    f.list.forEach(e => params.append('m', `${e.id}.${e.count}`));
    params.set('env', SITE_KINDS[s.kind].habitat);
    if (f.band) params.set('pack', f.band);
    params.set('seed', f.seed);
    return 'toolbox?' + params.toString();
}

function siteHoardLink(s) {
    return 'loot-generator?' + new URLSearchParams({ tab: 'hoard', 'hoard-cr': s.hoard.tier, 'hoard-source': s.hoard.source, seed: s.hoard.seed }).toString();
}

function siteHistoryLink(ai) {
    const h = siteState.his;
    const params = new URLSearchParams({ tab: 'history', seed: h.seed });
    Object.entries(SITE_HIS_KEYS).forEach(([key, opt]) => { if (h[opt] !== 'random') params.set(opt, h[opt]); });
    params.set('age', ai + 1);
    return 'worldbuilder?' + params.toString();
}

// ── Render ────────────────────────────────────────────────
function siteDl(lines) {
    return `<dl class="wb-dl">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function siteHistoryHTML(s) {
    const h = siteState.history;
    if (h) {
        const ai = siteHistoryAge(s, h, siteState.hage);
        return `<div class="wb-today">
            <p>📜 Its story comes from the History tab: it was built in ${esc(h.list[ai].name)}.</p>
            <p class="wb-small">A new roll keeps the history; the site picks its own age unless you came from one.</p>
            <button type="button" class="btn" id="site-unlink">✕ Give it its own story</button>
            <a class="btn" href="${esc(siteHistoryLink(ai))}">📜 Read about that age</a>
        </div>`;
    }
    return `<div class="wb-today">
        <p>📜 This place has a story of its own for now.</p>
        <p class="wb-small">Use the History tab's history, and the site is dated to one of its ages, built by the realm of the day.</p>
        <button type="button" class="btn" id="site-link-his">📜 Use the History tab's history</button>
    </div>`;
}

function siteRoomHTML(s, i) {
    const r = s.rooms[i];
    const last = i === s.rooms.length - 1;
    const tags = [r.fight ? '⚔️ fight' : '', r.trap ? '⚠️ trap' : '', last ? '💎 hoard' : ''].filter(Boolean);
    const links = [
        r.fight ? `<a class="btn" href="${esc(siteFightLink(s, r.fight))}">⚔️ Run this fight</a>` : '',
        last ? `<a class="btn" href="${esc(siteHoardLink(s))}">💎 Open the hoard</a>` : ''
    ].filter(Boolean);
    return `<section class="wb-block site-room${last ? ' site-end' : ''}" id="site-r${r.n}" tabindex="-1">
        <h4><span class="site-n">${r.n}</span> ${esc(r.name)}${tags.map(t => `<span class="wb-tag">${t}</span>`).join('')}</h4>
        <p class="site-desc">${esc(r.text)}</p>
        ${siteDl(siteRoomLines(s, i))}
        ${links.length ? `<p class="pan-links">${links.join(' ')}</p>` : ''}
    </section>`;
}

function renderSite() {
    const s = siteState.data;
    if (!s) return;
    const K = SITE_KINDS[s.kind], Z = SITE_SIZES[s.size];
    const ctx = siteCtx();
    const art = `img/site/${s.kind}`;
    document.getElementById('site-card').innerHTML = `
        <div class="wb-art" aria-hidden="true"><img src="${art}.webp" srcset="${art}-sm.webp 480w, ${art}.webp 960w" sizes="(max-width: 1000px) 100vw, 960px" alt="" width="960" height="640" decoding="async"></div>
        <header class="wb-head">
            <p class="wb-kicker">${K.icon} ${esc(K.label)} · ${Z.icon} ${esc(Z.label)} · ${esc(siteBandLabel(s))} · level ${s.level}, party of ${s.party}</p>
            <h3 class="wb-name">${esc(s.name)}</h3>
            <p class="wb-sub">${esc(siteSummary(s))}</p>
        </header>
        ${siteHistoryHTML(s)}
        <section class="wb-block wb-wide">
            <h4>🕯️ The story</h4>
            ${siteDl(siteStoryLines(s, ctx))}
        </section>
        <section class="wb-block wb-wide">
            <h4>🗺️ The map</h4>
            <div class="site-map-wrap">${siteMapSvg(s, `Map of ${s.name}`, { style: siteStyle() })}</div>
            <p class="wb-legend" id="site-legend">${siteLegend(s)}</p>
        </section>
        <h4 class="site-key-h">🔑 The key</h4>
        ${s.rooms.map((_, i) => siteRoomHTML(s, i)).join('')}
        ${s.wander ? `<section class="wb-block wb-wide">
            <h4>🎲 Wandering monsters</h4>
            <p>${esc(siteWanderText(s))}</p>
            <p class="pan-links"><a class="btn" href="${esc(siteFightLink(s, s.wander))}">⚔️ Run this fight</a></p>
        </section>` : ''}`;
}

function siteLegend(s) {
    const K = SITE_KINDS[s.kind];
    const tail = ' · S a secret door · the arrow is the way in · the gold room holds the hoard.';
    return siteStyle() === 'art'
        ? `Tap a number to jump to that room. ⚔ a fight · ⚠ a trap · each room is furnished from what's in it · the doors are drawn as they are (iron: locked)${K.portcullis ? ', with portcullises' : ''}${K.stairs ? ' · spiral stairs lead between floors' : ''}${tail}`
        : `Tap a number to jump to that room. ⚔ a fight · ⚠ a trap · ▮ a door (● locked) · ┄ a portcullis${K.stairs ? ' · ≡ a stair' : ''}${tail}`;
}

// Redraw the map alone in the other style.
function siteRestyle() {
    const s = siteState.data;
    if (s) {
        document.querySelector('#site-card .site-map-wrap').innerHTML = siteMapSvg(s, `Map of ${s.name}`, { style: siteStyle() });
        document.getElementById('site-legend').textContent = siteLegend(s);
    }
    if (siteState.seed) setUrlParams(siteParams(), false);
}

// ── Battle map export ─────────────────────────────────────
// Each look goes on top of the page's own .sm- rules (the dark one, as on screen). art: the
// illustrated map, whatever the style on screen.
const SITE_MAP_LOOKS = {
    art: `.sm-grid { fill: none; stroke: rgba(0,0,0,0.4); stroke-width: 0.6; }`,
    parchment: `.sm-bg { fill: #3a342b; }
        .sm-corr-wall { stroke: #15120d; }
        .sm-corr { stroke: #eadfc3; }
        .sm-room { fill: #eadfc3; stroke: #15120d; }
        .sm-end { fill: #e8cf8a; stroke: #15120d; }
        .sm-door { fill: #9a6a35; stroke: #15120d; }
        .sm-lock { fill: #f3e9cc; }
        .sm-s, .sm-mark { fill: #8a1f1a; }
        .sm-port, .sm-stair { stroke: #15120d; }
        .sm-entry { stroke: #e0b448; }
        .sm-arrow { fill: #e0b448; }
        .sm-num-bg { fill: #fffaf0; stroke: #15120d; }
        .sm-num { fill: #15120d; }
        .sm-num-end { fill: #15120d; }
        .sm-num-end + .sm-num { fill: #fffaf0; }
        .sm-grid { fill: none; stroke: rgba(30,24,16,0.3); stroke-width: 0.6; }`,
    dark: `.sm-bg { fill: #1b1813; }
        .sm-grid { fill: none; stroke: rgba(240,230,200,0.16); stroke-width: 0.6; }`,
    ink: `.sm-bg { fill: #fff; }
        .sm-corr-wall { stroke: #000; }
        .sm-corr { stroke: #fff; }
        .sm-room { fill: #fff; stroke: #000; }
        .sm-end { fill: #ddd; stroke: #000; }
        .sm-door { fill: #fff; stroke: #000; }
        .sm-lock, .sm-s, .sm-mark, .sm-arrow, .sm-num { fill: #000; }
        .sm-port, .sm-stair, .sm-entry { stroke: #000; }
        .sm-num-bg { fill: #fff; stroke: #000; }
        .sm-num-end { fill: #000; }
        .sm-num-end + .sm-num { fill: #fff; }
        .sm-grid { fill: none; stroke: rgba(0,0,0,0.25); stroke-width: 0.6; }`
};

function siteStatus(text) {
    const el = document.getElementById('site-status');
    clearTimeout(el._t);
    el.textContent = text;
}

async function siteDownloadMap() {
    const s = siteState.data;
    const btn = document.getElementById('site-png');
    if (!s || btn.disabled) return;
    const on = id => document.getElementById(id).checked;
    const pick = document.getElementById('site-look').value;
    const art = pick === 'art';
    const svg = siteMapSvg(s, `Map of ${s.name}`, { snap: true, grid: on('site-grid-on'), nums: on('site-nums-on'), secret: on('site-secret-on'), style: art ? 'art' : 'classic' });
    const [W, H] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
    const px = Number(document.getElementById('site-px').value) || 100;
    const cols = W / SITE_SQUARE, rows = H / SITE_SQUARE;
    const w = cols * px, h = rows * px;
    const look = SITE_MAP_LOOKS[pick] || SITE_MAP_LOOKS.parchment;
    const name = `${mapFileSlug(s.name)}-${cols}x${rows}.png`;
    btn.disabled = true;
    siteStatus('🗺️ Drawing the map…');
    const ok = await mapExportPng(art ? await mapInlineImages(svg) : svg, w, h, mapPageCss('.sm-') + '\n' + look, name);
    btn.disabled = false;
    const n = v => v.toLocaleString('en-US');
    siteStatus(ok
        ? `⬇️ Saved ${name}: ${cols} × ${rows} squares (${cols * 5} × ${rows * 5} feet), ${n(w)} × ${n(h)} pixels.`
        : '⚠️ This browser could not draw a map that big. Try fewer pixels per square.');
}

function siteGoRoom(n) {
    const el = document.getElementById('site-r' + n);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
}

function setupSites() {
    const kind = document.getElementById('site-kind');
    Object.entries(SITE_KINDS).forEach(([key, k]) => kind.add(new Option(`${k.icon} ${k.label}`, key)));
    const size = document.getElementById('site-size');
    Object.entries(SITE_SIZES).forEach(([key, z]) => size.add(new Option(`${z.label} (${z.min}-${z.max} rooms)`, key)));
    const level = document.getElementById('site-level');
    for (let l = 1; l <= 20; l++) level.add(new Option(`Level ${l}`, String(l), l === 3, l === 3));
    const party = document.getElementById('site-party');
    for (let n = 1; n <= 8; n++) party.add(new Option(`${n} character${n === 1 ? '' : 's'}`, String(n), n === 4, n === 4));
    const style = document.getElementById('site-style');
    Object.entries(SITE_STYLES).forEach(([key, label]) => style.add(new Option(label, key)));
    style.addEventListener('change', siteRestyle);
    siteUseParty();
    partyChip(document.getElementById('site-party-chip'), {
        label: 'Use the Party', title: "Set the party level and size to the Toolbox Party tab's",
        act: () => { if (siteUseParty() && siteState.seed) rollSiteFor(siteState.seed, false); }
    });

    // Same seed: a new option keeps everything it doesn't touch.
    Object.values(SITE_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (siteState.seed) rollSiteFor(siteState.seed, false);
    }));
    document.getElementById('site-roll').addEventListener('click', () => rollSiteFor());
    const card = document.getElementById('site-card');
    card.addEventListener('click', e => {
        if (e.target.closest('#site-link-his')) { siteLinkHistory(true); return; }
        if (e.target.closest('#site-unlink')) { siteLinkHistory(false); return; }
        const k = e.target.closest('.sm-key');
        if (k) siteGoRoom(k.dataset.room);
    });
    card.addEventListener('keydown', e => {
        const k = e.target.closest('.sm-key');
        if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); siteGoRoom(k.dataset.room); }
    });
    document.getElementById('site-copy').addEventListener('click', () => {
        if (siteState.data) copyText(siteText(siteState.data, siteCtx()), 'site-status', 'the site');
    });
    document.getElementById('site-print').addEventListener('click', () => {
        if (!siteState.data) return;
        document.body.classList.add('print-site');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-site'));
    document.getElementById('site-png').addEventListener('click', siteDownloadMap);
    document.getElementById('site-link').addEventListener('click', () =>
        copyPageLink(ok => flash('site-status', ok ? '🔗 Link copied. It opens this same site.' : '⚠️ Copy blocked by the browser.')));
}

WORLD_TABS.sites = {
    setup: setupSites,
    params: siteParams,
    apply: applySiteUrl,
    fresh: push => rollSiteFor(newSeed(), push),
    rolled: () => !!siteState.seed,
    entry: () => ({ title: siteState.data.name, sub: siteSummary(siteState.data) })
};
