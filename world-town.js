/* ============================================
   WORLDBUILDER: TOWN TAB (F37)
   A settlement from town-engine.js (rollTown): the place at a glance, its districts and
   buildings, notable people (each opens on the NPC page), the factions in town (they
   open on the Factions tab), its taverns (Toolbox Tavern) and shops (Shop page), laws
   and customs, trouble, rumors, and a quest hook (Toolbox Quest). "Use the Pantheon
   tab's gods" links a pantheon, and then the temple and the factions follow its gods.
   Nothing is stored: the URL holds the town.
   URL: ?tab=town&seed=&size=&setting=&wealth=&gods=&gsize=&gshape=&gnaming=
   ============================================ */

const TOWN_FIELDS = { size: 'town-size', setting: 'town-setting', wealth: 'town-wealth' };
// The linked pantheon's URL keys → its option names (the same keys the Calendar uses).
const TOWN_GOD_KEYS = { gsize: 'size', gshape: 'shape', gnaming: 'naming' };

let townState = { seed: null, data: null, factions: null, gods: null, pantheon: null };
let townRumorList = [];

function townOpts() {
    const v = id => document.getElementById(id).value;
    return { size: v('town-size'), setting: v('town-setting'), wealth: v('town-wealth') };
}

function townCtx() {
    return { factions: townState.factions, pantheon: townState.pantheon };
}

function townParams() {
    const params = {};
    Object.entries(TOWN_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = townState.seed;
    const g = townState.gods;
    params.gods = g ? g.seed : null;
    Object.entries(TOWN_GOD_KEYS).forEach(([key, opt]) => { params[key] = g && g[opt] !== 'random' ? g[opt] : null; });
    return worldUrlFor('town', params);
}

function townSetPantheon(g) {
    townState.gods = g;
    townState.pantheon = g ? rollPantheon(g.seed, g) : null;
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollTownFor(seed = newSeed(), push = true) {
    townState.seed = seed;
    townState.data = rollTown(seed, townOpts());
    townState.factions = townFactions(townState.data);
    renderTown();
    if (push !== null) setUrlParams(townParams(), push);
}

function applyTownUrl(p) {
    Object.entries(TOWN_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    const gods = parseSeed(p.get('gods'));
    const g = gods ? { seed: gods } : null;
    if (g) Object.entries(TOWN_GOD_KEYS).forEach(([key, opt]) => { g[opt] = p.get(key) || 'random'; });
    townSetPantheon(g);
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollTownFor(seed, null);
    return true;
}

// Link the Pantheon tab's gods (rolling a pantheon there first if it has none), or unlink.
function townLinkPantheon(on) {
    if (on) {
        if (!WORLD_TABS.pantheon.rolled()) WORLD_TABS.pantheon.fresh(null);
        townSetPantheon({ seed: panState.seed, ...panOpts() });
    } else {
        townSetPantheon(null);
    }
    renderTown();
    setUrlParams(townParams(), false);
}

// ── Links out ─────────────────────────────────────────────
function townGodParams(params) {
    const g = townState.gods;
    if (!g) return params;
    params.set('gods', g.seed);
    Object.entries(TOWN_GOD_KEYS).forEach(([key, opt]) => { if (g[opt] !== 'random') params.set(key, g[opt]); });
    return params;
}

function townFactionLink(t, i) {
    const z = TOWN_SIZES[t.size];
    const params = new URLSearchParams({ tab: 'factions', seed: t.factionSeed, count: z.factions, scale: z.facScale });
    if (i) params.set('faction', i + 1);
    return 'worldbuilder.html?' + townGodParams(params).toString();
}

function townPantheonLink(god) {
    const g = townState.gods;
    const params = new URLSearchParams({ tab: 'pantheon', seed: g.seed });
    ['size', 'shape', 'naming'].forEach(k => { if (g[k] !== 'random') params.set(k, g[k]); });
    if (god && god.index) params.set('god', god.index + 1);
    return 'worldbuilder.html?' + params.toString();
}

function townTavernLink(tv, k, rumorIdx) {
    const params = new URLSearchParams({ tab: 'tavern', q: tv.quality, seed: tv.seed });
    // Each tavern overhears one of the town's rumors.
    if (rumorIdx.length) params.set('rumor', rumorIdx[k % rumorIdx.length]);
    return 'toolbox.html?' + params.toString();
}

function townShopLink(sh) {
    return 'shop.html?' + new URLSearchParams({ seed: sh.seed, type: sh.type, wealth: sh.wealth }).toString();
}

function townQuestLink(t) {
    return 'toolbox.html?' + new URLSearchParams({ tab: 'quest', seed: t.questSeed }).toString();
}

// ── Render ────────────────────────────────────────────────
function townDl(lines) {
    return `<dl class="wb-dl">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function townNpcBtn(p, label) {
    return `<a class="btn" href="${esc(facNpcLink(p))}">🎭 ${esc(label || p.npc.firstName)}</a>`;
}

function townGodsHTML(t, ctx) {
    const facs = ctx.factions;
    const followers = facs ? facs.factions.filter(f => f.deity && !f.deity.outer).length : 0;
    if (townState.pantheon) {
        const god = townDeity(t, ctx);
        return `<div class="wb-today">
            <p>⛪ The temple here keeps the gods of ${esc(townState.pantheon.name)}.</p>
            <p class="wb-small">The ${t.size === 'hamlet' ? 'shrine' : 'temple'} belongs to ${esc(god.name)}${followers ? `, and ${followers} of the factions in town follow one of its gods` : ''}.</p>
            <button type="button" class="btn" id="town-unlink">✕ Use made-up gods instead</button>
            ${god.linked ? `<a class="btn" href="${esc(townPantheonLink(god))}">⛪ Read about ${esc(god.name)}</a>` : ''}
        </div>`;
    }
    return `<div class="wb-today">
        <p>⛪ The temple here names its god by title for now.</p>
        <p class="wb-small">Use the Pantheon tab's gods, and the temple${facs ? ' and every god-fearing faction in town' : ''} follows one of them.</p>
        <button type="button" class="btn" id="town-link-gods">⛪ Use the Pantheon tab's gods</button>
    </div>`;
}

function townFactionsHTML(t, ctx) {
    const w = ctx.factions;
    if (!w) return `<p class="wb-small">A hamlet has no factions to speak of. Everyone is related, and that's politics enough.</p>`;
    return `<ul class="wb-list">${w.factions.map((f, i) => {
        const ft = FAC_TYPES[f.type];
        return `<li>${ft.icon} <a href="${esc(townFactionLink(t, i))}"><b>${esc(facCap(facName(w, i, ctx)))}</b></a>
            <span class="wb-tag">${esc(ft.label)}</span> <span class="wb-small">${'●'.repeat(f.influence + 1)}${'○'.repeat(4 - f.influence)}</span></li>`;
    }).join('')}</ul>
    <p class="pan-links"><a class="btn" href="${esc(townFactionLink(t, 0))}">🏛️ Open the factions</a></p>`;
}

function townPlacesHTML(t, rumorIdx) {
    const taverns = t.taverns.map((tv, k) => `<li>🍺 ${esc(townTavernLine(t, tv, townTavern(tv)))}
        <a class="town-go" href="${esc(townTavernLink(tv, k, rumorIdx))}">Step inside →</a></li>`).join('');
    const shops = t.shops.map(sh => `<li>${SHOP_TYPES[sh.type].icon} ${esc(townShopLine(t, sh, townShop(sh)))}
        <a class="town-go" href="${esc(townShopLink(sh))}">Browse the stock →</a></li>`).join('');
    return `<div class="wb-grid">
        <section class="wb-block"><h4>🍺 Taverns and inns</h4><ul class="wb-list">${taverns}</ul></section>
        <section class="wb-block"><h4>🏪 Shops</h4><ul class="wb-list">${shops}</ul></section>
    </div>`;
}

function renderTown() {
    const t = townState.data;
    if (!t) return;
    const ctx = townCtx();
    const z = TOWN_SIZES[t.size], s = TOWN_SETTINGS[t.setting], wl = TOWN_WEALTH[t.wealth];
    const rumorIdx = townRumorIndexes(t, townRumorList);
    const q = townQuest(t);
    const people = [t.leader, t.captain, t.priest].filter(Boolean);
    document.getElementById('town-card').innerHTML = `
        <header class="wb-head">
            <p class="wb-kicker">${z.icon} ${esc(z.label)} · ${s.icon} ${esc(s.label)} · ${wl.icon} ${esc(wl.label)}</p>
            <h3 class="wb-name">${esc(t.name)}</h3>
            <p class="wb-sub">${esc(townSummary(t))}</p>
        </header>
        ${townGodsHTML(t, ctx)}
        <section class="wb-block wb-wide">
            <h4>🏘️ At a glance</h4>
            ${townDl(townLines(t, ctx))}
            <p class="pan-links">${people.map(p => townNpcBtn(p)).join(' ')}</p>
        </section>
        <section class="wb-block wb-wide">
            <h4>🗺️ ${t.districts.length === 1 ? 'The place' : `${t.districts.length} districts`}</h4>
            ${townDl(townDistrictLines(t))}
            <p class="wb-small town-buildings">🏠 ${esc(townBuildingsText(t))}</p>
        </section>
        <section class="wb-block wb-wide">
            <h4>👥 Notable people</h4>
            ${townDl(townPeopleLines(t, ctx))}
            <p class="pan-links">${t.people.map(p => townNpcBtn(p)).join(' ')}</p>
        </section>
        <section class="wb-block wb-wide">
            <h4>🏛️ Factions in town</h4>
            ${townFactionsHTML(t, ctx)}
        </section>
        ${townPlacesHTML(t, rumorIdx)}
        <div class="wb-grid">
            <section class="wb-block">
                <h4>⚖️ Laws</h4>
                <ul class="wb-list">${townLawLines(t).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
                <h4 class="town-h-gap">🕯️ Customs</h4>
                <ul class="wb-list">${t.customs.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
            </section>
            <section class="wb-block">
                <h4>⚠️ Trouble</h4>
                <p>${esc(townTroubleText(t, ctx))}</p>
                <h4 class="town-h-gap">👂 Rumors</h4>
                ${rumorIdx.length
                    ? `<ul class="wb-list">${rumorIdx.map(i => `<li>"${esc(townRumorList[i].text)}"</li>`).join('')}</ul>`
                    : '<p class="wb-small">The gossip is still on its way.</p>'}
            </section>
        </div>
        <section class="wb-block wb-wide">
            <h4>🗡️ A job in town: ${esc(q.title)}</h4>
            <p>${esc(q.task)} Ask ${esc(q.giver.name)}.</p>
            <p class="pan-links"><a class="btn" href="${esc(townQuestLink(t))}">📜 Open the quest in the Toolbox</a></p>
            <p class="wb-small town-quest-note">Set the party's level and size there to see the pay and any fight.</p>
        </section>`;
}

function printTown() {
    if (!townState.data) return;
    document.body.classList.add('print-town');
    window.print();
}

function setupTown() {
    const size = document.getElementById('town-size');
    Object.entries(TOWN_SIZES).forEach(([key, z]) => size.add(new Option(`${z.icon} ${z.label}`, key)));
    const setting = document.getElementById('town-setting');
    Object.entries(TOWN_SETTINGS).forEach(([key, s]) => setting.add(new Option(`${s.icon} ${s.label}`, key)));
    const wealth = document.getElementById('town-wealth');
    Object.entries(TOWN_WEALTH).forEach(([key, w]) => wealth.add(new Option(`${w.icon} ${w.label}`, key)));

    // Same seed: a new option keeps everything it doesn't touch.
    Object.values(TOWN_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (townState.seed) rollTownFor(townState.seed, false);
    }));
    document.getElementById('town-roll').addEventListener('click', () => rollTownFor());
    document.getElementById('town-card').addEventListener('click', e => {
        if (e.target.closest('#town-link-gods')) { townLinkPantheon(true); return; }
        if (e.target.closest('#town-unlink')) townLinkPantheon(false);
    });
    document.getElementById('town-copy').addEventListener('click', () => {
        if (townState.data) copyText(townText(townState.data, townCtx(), townRumorList), 'town-status', 'the town');
    });
    document.getElementById('town-print').addEventListener('click', printTown);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-town'));
    document.getElementById('town-link').addEventListener('click', () =>
        copyPageLink(ok => flash('town-status', ok ? '🔗 Link copied. It opens this same town.' : '⚠️ Copy blocked by the browser.')));

    // Rumors are picked from rumors.json once it arrives (the same file the Tavern deals from).
    fetch('rumors.json').then(r => r.json()).then(data => {
        townRumorList = (data && data.rumors) || [];
        renderTown();
    }).catch(() => {});
}

WORLD_TABS.town = {
    setup: setupTown,
    params: townParams,
    apply: applyTownUrl,
    fresh: push => rollTownFor(newSeed(), push),
    rolled: () => !!townState.seed
};
