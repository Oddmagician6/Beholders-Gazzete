/* ============================================
   WORLDBUILDER (Part 1e)
   Worldbuilding tools on one page, one tab each. Each tab also has a page of its own (tab-pages.js,
   SEO11): its roll's address is that page, and ?tab= on an old link moves there. Each tab lives in its own
   world-<tool>.js and registers itself in WORLD_TABS:
     WORLD_TABS[id] = { params() → URL params, apply(urlParams) → true if it held a roll,
                        fresh(push) → a first roll, rolled() → true once it has one,
                        entry() → { title, sub } for the Notebook, save(statusId)? its own 📓 Save }
   Calendar (F33): world-calendar.js, rolled by calendar-engine.js.
   Pantheon (F34): world-pantheon.js, rolled by pantheon-engine.js; its holy days can go on the calendar.
   Factions (F35): world-factions.js, rolled by faction-engine.js (leaders from npc-data.js); can follow the pantheon's gods.
   History (F36): world-history.js, rolled by history-engine.js; can name the pantheon's gods and date the factions.
   Town (F37): world-town.js, rolled by town-engine.js; links out to the NPC page, the Factions tab, the Toolbox
   (Tavern, Quest), and the Shop page, and its temple can follow the pantheon's gods.
   Families (F55): world-family.js, rolled by family-engine.js and drawn by family-tree.js; edits keep the
   whole family in the Notebook. The Factions and Town tabs link to a leader's family.
   Sites (F39): world-sites.js, rolled by site-engine.js (foes from encounter-engine.js); its fights open in
   the Toolbox, its hoard in the Loot generator, and its story can come from the history.
   Continent (F40): world-continent.js, rolled by continent-engine.js; its towns open on the Town tab inside their
   realm, its places on the Sites tab, and its roads and journeys in the Toolbox's Travel tab.
   Maps (F54): world-maps.js, your own map pictures (kept by map-store.js) with pins (world-pins.js, shared
   with the Continent tab).
   Notebook (F38): world-notebook.js, kept by notebook.js. Every tab's 📓 Save to Notebook
   button (data-save="<tab>") files the roll on screen through that tab's entry() → { title, sub }.
   Web (F56): world-web.js, the notebook drawn as entries and the lines between them (web-graph.js lays it out).
   Seeds and the shareable URL: rng.js.
   Engines load per tab (SEO10): the page holds only the tab modules; a tab's engines (WORLD_ENGINES) arrive when
   it first opens, and its setup() runs then. A tab that reads another tab's form or state lists it in WORLD_NEEDS.
   ============================================ */

const WORLD_TAB_ORDER = ['calendar', 'pantheon', 'factions', 'history', 'town', 'family', 'sites', 'continent', 'maps', 'notebook', 'web'];
const WORLD_TABS = {};

// ── Engines, loaded per tab ───────────────────────────────
// Every engine a tab's module calls, also through other engines. They run in this order, as the old script tags did.
const WORLD_ENGINE_ORDER = ['travel-engine.js', 'calendar-engine.js', 'pantheon-engine.js', 'npc-data.js', 'faction-engine.js',
    'history-engine.js', 'names-data.js', 'market-data.js', 'shop-engine.js', 'tavern-engine.js', 'monsters-data.js',
    'encounter-engine.js', 'quest-engine.js', 'town-engine.js', 'site-engine.js', 'continent-engine.js', 'family-engine.js'];
const WORLD_CAL_ENGINES = ['travel-engine.js', 'calendar-engine.js', 'pantheon-engine.js', 'npc-data.js', 'names-data.js', 'monsters-data.js', 'encounter-engine.js'];
const WORLD_FAC_ENGINES = [...WORLD_CAL_ENGINES, 'faction-engine.js', 'family-engine.js'];
const WORLD_ENGINES = {
    calendar: WORLD_CAL_ENGINES, pantheon: WORLD_CAL_ENGINES, factions: WORLD_FAC_ENGINES, family: WORLD_FAC_ENGINES,
    history: [...WORLD_FAC_ENGINES, 'history-engine.js'], sites: [...WORLD_FAC_ENGINES, 'history-engine.js', 'site-engine.js'],
    // A town rolls its shop, tavern, quest, and realm; a continent rolls towns and sites; the notebook rebuilds every kind.
    town: WORLD_ENGINE_ORDER, continent: WORLD_ENGINE_ORDER, notebook: WORLD_ENGINE_ORDER,
    maps: [], web: []
};
// Pathfinder pages: the creatures come in before the encounter engine, which then rolls them.
if (ruleSystemId() === 'pf2e') {
    new Set([WORLD_ENGINE_ORDER, ...Object.values(WORLD_ENGINES)]).forEach(list => {
        const i = list.indexOf('monsters-data.js');
        if (i >= 0) list.splice(i + 1, 0, 'pf2e-creatures-data.js');
    });
}
// D&D pages: the 2014/2024 rules (srd52.js) come in right after the monsters, so a 2024 reader's sites and encounters
// roll 5.2 foes, as on the one-shot that links here (B494). No picker here: the reader's setting or a rules= link.
else {
    new Set([WORLD_ENGINE_ORDER, ...Object.values(WORLD_ENGINES)]).forEach(list => {
        const i = list.indexOf('monsters-data.js');
        if (i >= 0) list.splice(i + 1, 0, 'srd52-data.js', 'srd52.js');
    });
}
// Tabs set up first: pantheon links the calendar, factions/town read the pantheon, history the factions, sites the history.
const WORLD_NEEDS = { pantheon: ['calendar'], factions: ['pantheon'], town: ['pantheon'], history: ['factions'], sites: ['history'] };
const worldScripts = {};   // src → Promise, settled once the script has run
const worldReady = {};     // tab → Promise, settled once its engines are in and its setup() has run

function worldScript(src) {
    return worldScripts[src] || (worldScripts[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;   // added scripts run in the order they were added
        s.onload = resolve;
        s.onerror = () => { delete worldScripts[src]; reject(new Error('Could not load ' + src)); };
        document.body.appendChild(s);
    }));
}

// Once srd52.js is in (D&D): wait for the 2024 data when that's the version, and from then on roll the open tab
// again when the version changes (Back/Forward to a rules= address, another tab's switch).
let worldRulesHooked = false;
function worldRules() {
    if (typeof SRD52_OK === 'undefined' || !SRD52_OK) return null;
    if (!worldRulesHooked) {
        worldRulesHooked = true;
        srd52OnChange(() => {
            const t = worldShown;
            if (!worldOpened.has(t) || !WORLD_ENGINES[t].includes('srd52.js')) return;
            if (WORLD_TABS[t].apply(urlParams())) setUrlParams(WORLD_TABS[t].params(), false);
        });
    }
    return rulesRefresh();
}

function loadWorldTab(tab) {
    return worldReady[tab] || (worldReady[tab] = Promise.all([
        ...(WORLD_NEEDS[tab] || []).map(loadWorldTab),
        ...WORLD_ENGINE_ORDER.filter(src => WORLD_ENGINES[tab].includes(src)).map(worldScript)
    ]).then(worldRules)
      .then(() => { if (WORLD_TABS[tab].setup) WORLD_TABS[tab].setup(); })
      .catch(err => { delete worldReady[tab]; throw err; }));
}

// Load a tab; false (and a note on the tab) when a script didn't arrive.
const WORLD_LOAD_FAILED = "⚠️ This tab didn't load. Check your connection and reload the page.";

async function readyWorldTab(tab) {
    // The panel's last status line is its main one (the Notebook's first sits in a box that can be hidden).
    const status = [...document.querySelectorAll(`#tab-${tab} .tool-status`)].pop();
    try {
        await loadWorldTab(tab);
        if (status && status.textContent === WORLD_LOAD_FAILED) status.textContent = '';
        return true;
    } catch (err) {
        console.error(err);
        if (status) status.textContent = WORLD_LOAD_FAILED;
        return false;
    }
}

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function flash(id, text) {
    const el = document.getElementById(id);
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 2500);
}

function copyText(text, statusId, what) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) { flash(statusId, '⚠️ Copy blocked by the browser.'); return; }
    navigator.clipboard.writeText(text)
        .then(() => flash(statusId, `📋 Copied ${what}.`))
        .catch(() => flash(statusId, '⚠️ Copy blocked by the browser.'));
}

// ── Tabs ──────────────────────────────────────────────────
function currentWorldTab() {
    // A ?tab= this page doesn't have falls back to the page's own tab, not the hub's first.
    const ok = t => WORLD_TAB_ORDER.includes(t) && tabOnPage(t);
    const asked = urlParams().get('tab'), own = tabOfPage();
    return ok(asked) ? asked : ok(own) ? own : WORLD_TAB_ORDER[0];
}

let worldShown = null;   // the tab on screen, which may still be loading
const worldOpened = new Set();   // tabs that got on screen ready (a failed load leaves its tab out, so a retry rolls it)

function showWorldTab(tab) {
    worldShown = tab;
    document.querySelectorAll('.tool-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.tool-panel').forEach(p => { p.hidden = p.id !== 'tab-' + tab; });
    showTabPage(tab);
}

// The URL params of the tab on screen (the default tab stays out of the URL; setUrlParams moves
// the address to the tab's own page, and a link built from these opens it there too).
function worldUrlFor(tab, params) {
    return { ...(tab === WORLD_TAB_ORDER[0] ? {} : { tab }), ...params };
}

// Show another tab (rolling it on a first visit) and put its roll in the address bar.
// Resolves true once the tab is on screen and ready, false when another tab took its place while it loaded.
async function switchWorldTab(tab) {
    const was = worldShown;
    showWorldTab(tab);
    if (!await readyWorldTab(tab) || tab !== worldShown) return false;
    if (tab !== was || !worldOpened.has(tab)) {
        if (!WORLD_TABS[tab].rolled()) WORLD_TABS[tab].fresh(null);
        setUrlParams(WORLD_TABS[tab].params(), true);
    }
    worldOpened.add(tab);
    return true;
}

// File the roll on a tab in the Notebook (its link rebuilds it).
function saveWorldTab(tab, statusId) {
    const t = WORLD_TABS[tab];
    if (!t.rolled()) return;
    if (t.save) { t.save(statusId); return; }
    // A tab that rolls 5e monsters or loot (Sites) keeps the rules version it was rolled under, as its address does.
    const params = WORLD_ENGINES[tab].includes('srd52.js') && typeof rulesLinkParams === 'function' ? rulesLinkParams(t.params()) : t.params();
    const r = nbAdd({ kind: tab, ...t.entry(), href: 'worldbuilder?' + paramsQuery(params) });
    if (!r) flash(statusId, "⚠️ This browser won't keep a notebook (storage is full or off).");
    else if (r.full) flash(statusId, '⚠️ The notebook is full. Remove an entry first.');
    else if (r.existed) flash(statusId, '📓 This one is already in the notebook.');
    else flash(statusId, `📓 Saved to the notebook${r.linked ? `, linked to ${r.linked} saved ${r.linked === 1 ? 'entry' : 'entries'}` : ''}.`);
}

// Rebuild the page from the address bar, or roll the tab when the address holds no roll.
async function applyWorldUrl() {
    const tab = currentWorldTab();
    showWorldTab(tab);
    if (!await readyWorldTab(tab) || tab !== worldShown) return;
    if (!WORLD_TABS[tab].apply(urlParams())) WORLD_TABS[tab].fresh(false);
    worldOpened.add(tab);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    // Each tab keeps its roll in memory; the first visit to a tab rolls one.
    onTabLinks(switchWorldTab);
    document.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () =>
        saveWorldTab(b.dataset.save, b.closest('.tool-card').querySelector('.tool-status').id)));

    applyWorldUrl();
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', applyWorldUrl);
});

// Offline maps: once the page has loaded, the service worker (sw.js) saves the map art in the background.
window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.ready.then(reg => { if (reg.active) reg.active.postMessage('cache-map-art'); }).catch(() => {});
});
