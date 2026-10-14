/* ============================================
   TAB PAGES (SEO11)
   Every tab of the Toolbox and the Worldbuilder has a page of its own (dnd-initiative-tracker.html,
   fantasy-calendar-generator.html, ...), so each tool has its own address, title, and description for
   search. The pages are copies of toolbox.html and worldbuilder.html written by export-tools.ps1 from
   tool-pages.json, and the #tab-pages JSON it writes into each one holds every page's title and hero.
   This file keeps the address bar, the title, and the hero in step as the reader switches tabs in place:
   - the address of a tab on screen is that tab's page, without ?tab= (setUrlParams in rng.js asks
     tabPageAddress), and an old ?tab= link moves to the tab's page on load;
   - the hub (toolbox.html, worldbuilder.html) shows the first tab under its own title.
   Loaded after rng.js and before toolbox.js / worldbuilder.js.
   ============================================ */

const TAB_PAGES = (() => {
    const el = document.getElementById('tab-pages');
    if (!el || location.protocol === 'file:') return null;   // file:// can't move the address to another page
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
})();

// "dnd-dice-roller" for /dnd-dice-roller.html and for /dnd-dice-roller (GitHub Pages serves both).
function tabPageName(path) {
    return decodeURIComponent(path.split('/').pop()).replace(/\.html$/, '');
}

function tabPagePath(tab) {
    return location.pathname.replace(/[^/]*$/, '') + tabPageName(TAB_PAGES.tabs[tab].page);
}

// The tab whose page this is, or null on the hub.
function tabOfPage() {
    if (!TAB_PAGES) return null;
    const here = tabPageName(location.pathname);
    return Object.keys(TAB_PAGES.tabs).find(t => tabPageName(TAB_PAGES.tabs[t].page) === here) || null;
}

// [path, params] for the address bar. params come from urlFor/worldUrlFor, which leave out the
// first tab, so no tab means the first one. Another tab's roll moves the address to that tab's page.
function tabPageAddress(params) {
    const { tab = TAB_PAGES.first, ...rest } = params;
    if (!TAB_PAGES.tabs[tab]) return [location.pathname, params];
    if (tab === (tabOfPage() || TAB_PAGES.first)) return [location.pathname, rest];
    return [tabPagePath(tab), rest];
}

// The title, the hero kicker and text, and the how-it-works guide for the tab on screen.
function showTabPage(tab) {
    if (!TAB_PAGES) return;
    const page = tab === TAB_PAGES.first && !tabOfPage() ? TAB_PAGES.hub : TAB_PAGES.tabs[tab];
    if (!page) return;
    document.title = page.title;
    const kicker = document.querySelector('.page-hero .hero-kicker');
    if (kicker) kicker.textContent = page.kicker || '';
    const hero = document.querySelector('.page-hero-description');
    if (hero) hero.textContent = page.hero;
    // A tab page carries only its own guide; it hides while another tab is on screen.
    document.querySelectorAll('.tool-guide[data-tab]').forEach(g => { g.hidden = g.dataset.tab !== tab; });
}

// Tab links switch in place (go(tab)); a ctrl, shift, or middle click opens the tab's page as a link.
function onTabLinks(go) {
    document.querySelectorAll('.tool-tab').forEach(a => a.addEventListener('click', e => {
        if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(a.dataset.tab);
    }));
}

// An old link (toolbox.html?tab=init&add=goblin) moves to the tab's own page before anything reads it.
(function moveToTabPage() {
    if (!TAB_PAGES) return;
    const p = new URLSearchParams(location.search);
    const tab = p.get('tab');
    if (!TAB_PAGES.tabs[tab]) return;
    p.delete('tab');
    const qs = p.toString();
    history.replaceState(history.state, '', tabPagePath(tab) + (qs ? '?' + qs : '') + location.hash);
})();
