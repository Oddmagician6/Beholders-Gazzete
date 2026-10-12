/* ============================================
   WORLDBUILDER (Part 1e)
   Worldbuilding tools on one page, one tab each (?tab=). Each tab lives in its own
   world-<tool>.js and registers itself in WORLD_TABS:
     WORLD_TABS[id] = { params() → URL params, apply(urlParams) → true if it held a roll,
                        fresh(push) → a first roll, rolled() → true once it has one,
                        entry() → { title, sub } for the Notebook }
   Calendar (F33): world-calendar.js, rolled by calendar-engine.js.
   Pantheon (F34): world-pantheon.js, rolled by pantheon-engine.js; its holy days can go on the calendar.
   Factions (F35): world-factions.js, rolled by faction-engine.js (leaders from npc-data.js); can follow the pantheon's gods.
   History (F36): world-history.js, rolled by history-engine.js; can name the pantheon's gods and date the factions.
   Town (F37): world-town.js, rolled by town-engine.js; links out to the NPC page, the Factions tab, the Toolbox
   (Tavern, Quest), and the Shop page, and its temple can follow the pantheon's gods.
   Sites (F39): world-sites.js, rolled by site-engine.js (foes from encounter-engine.js); its fights open in
   the Toolbox, its hoard in the Loot generator, and its story can come from the history.
   Continent (F40): world-continent.js, rolled by continent-engine.js; its towns open on the Town tab inside their
   realm, its places on the Sites tab, and its roads and journeys in the Toolbox's Travel tab.
   Notebook (F38): world-notebook.js, kept by notebook.js. Every tab's 📓 Save to Notebook
   button (data-save="<tab>") files the roll on screen through that tab's entry() → { title, sub }.
   Seeds and the shareable URL: rng.js.
   ============================================ */

const WORLD_TAB_ORDER = ['calendar', 'pantheon', 'factions', 'history', 'town', 'sites', 'continent', 'notebook'];
const WORLD_TABS = {};

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

function showWorldTab(tab) {
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
function switchWorldTab(tab) {
    if (tab === currentWorldTab()) return;
    showWorldTab(tab);
    if (!WORLD_TABS[tab].rolled()) WORLD_TABS[tab].fresh(null);
    setUrlParams(WORLD_TABS[tab].params(), true);
}

// File the roll on a tab in the Notebook (its link rebuilds it).
function saveWorldTab(tab, statusId) {
    const t = WORLD_TABS[tab];
    if (!t.rolled()) return;
    const r = nbAdd({ kind: tab, ...t.entry(), href: 'worldbuilder.html?' + paramsQuery(t.params()) });
    if (!r) flash(statusId, "⚠️ This browser won't keep a notebook (storage is off).");
    else if (r.full) flash(statusId, '⚠️ The notebook is full. Remove an entry first.');
    else if (r.existed) flash(statusId, '📓 This one is already in the notebook.');
    else flash(statusId, `📓 Saved to the notebook${r.linked ? `, linked to ${r.linked} saved ${r.linked === 1 ? 'entry' : 'entries'}` : ''}.`);
}

// Rebuild the page from the address bar. Returns true when it held a roll.
function applyWorldUrl() {
    const tab = currentWorldTab();
    showWorldTab(tab);
    return WORLD_TABS[tab].apply(urlParams());
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    Object.values(WORLD_TABS).forEach(t => t.setup && t.setup());

    // Each tab keeps its roll in memory; the first visit to a tab rolls one.
    document.querySelectorAll('.tool-tab').forEach(b => b.addEventListener('click', () => switchWorldTab(b.dataset.tab)));
    document.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () =>
        saveWorldTab(b.dataset.save, b.closest('.tool-card').querySelector('.tool-status').id)));

    if (!applyWorldUrl()) WORLD_TABS[currentWorldTab()].fresh(false);
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', () => { if (!applyWorldUrl()) WORLD_TABS[currentWorldTab()].fresh(false); });
});
