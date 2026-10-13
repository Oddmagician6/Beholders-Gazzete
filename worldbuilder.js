/* ============================================
   WORLDBUILDER (Part 1e)
   Worldbuilding tools on one page, one tab each (?tab=). Each tab lives in its own
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

function loadWorldTab(tab) {
    return worldReady[tab] || (worldReady[tab] = Promise.all([
        ...(WORLD_NEEDS[tab] || []).map(loadWorldTab),
        ...WORLD_ENGINE_ORDER.filter(src => WORLD_ENGINES[tab].includes(src)).map(worldScript)
    ]).then(() => { if (WORLD_TABS[tab].setup) WORLD_TABS[tab].setup(); })
      .catch(err => { delete worldReady[tab]; throw err; }));
}

// Load a tab; false (and a note on the tab) when a script didn't arrive.
async function readyWorldTab(tab) {
    try {
        await loadWorldTab(tab);
        return true;
    } catch (err) {
        console.error(err);
        const status = document.querySelector(`#tab-${tab} .tool-status`);
        if (status) status.textContent = "⚠️ This tab didn't load. Check your connection and reload the page.";
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
    navigator.clipboard.writeText(text)
        .then(() => flash(statusId, `📋 Copied ${what}.`))
        .catch(() => flash(statusId, '⚠️ Copy blocked by the browser.'));
}

// ── Tabs ──────────────────────────────────────────────────
function currentWorldTab() {
    const t = urlParams().get('tab');
    return WORLD_TAB_ORDER.includes(t) ? t : WORLD_TAB_ORDER[0];
}

let worldShown = null;   // the tab on screen, which may still be loading

function showWorldTab(tab) {
    worldShown = tab;
    document.querySelectorAll('.tool-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.tool-panel').forEach(p => { p.hidden = p.id !== 'tab-' + tab; });
}

// The URL params of the tab on screen (the default tab stays out of the URL).
function worldUrlFor(tab, params) {
    return { ...(tab === WORLD_TAB_ORDER[0] ? {} : { tab }), ...params };
}

// Show another tab (rolling it on a first visit) and put its roll in the address bar.
// Resolves true once the tab is on screen and ready, false when another tab took its place while it loaded.
async function switchWorldTab(tab) {
    const was = worldShown;
    showWorldTab(tab);
    if (!await readyWorldTab(tab) || tab !== worldShown) return false;
    if (tab !== was) {
        if (!WORLD_TABS[tab].rolled()) WORLD_TABS[tab].fresh(null);
        setUrlParams(WORLD_TABS[tab].params(), true);
    }
    return true;
}

// File the roll on a tab in the Notebook (its link rebuilds it).
function saveWorldTab(tab, statusId) {
    const t = WORLD_TABS[tab];
    if (!t.rolled()) return;
    if (t.save) { t.save(statusId); return; }
    const r = nbAdd({ kind: tab, ...t.entry(), href: 'worldbuilder.html?' + paramsQuery(t.params()) });
    if (!r) flash(statusId, "⚠️ This browser won't keep a notebook (storage is off).");
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
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    // Each tab keeps its roll in memory; the first visit to a tab rolls one.
    document.querySelectorAll('.tool-tab').forEach(b => b.addEventListener('click', () => switchWorldTab(b.dataset.tab)));
    document.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () =>
        saveWorldTab(b.dataset.save, b.closest('.tool-card').querySelector('.tool-status').id)));

    applyWorldUrl();
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', applyWorldUrl);
});
