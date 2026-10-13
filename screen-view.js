/* ============================================
   DM SCREEN: THE PLAYERS' WINDOW (F57): screen-view.html
   Shows the cards the DM marked 📺 on the DM screen's current layout, drawn by
   dsPlayerCardHtml() (dm-screen-data.js), which leaves out everything for the DM's eyes only.
   Every card's data lives in this browser's storage, so a 'storage' event from the DM screen,
   the Toolbox, or the Worldbuilder redraws the view. ?big=1 is the big-text mode for a TV.
   ============================================ */

let svQueued = false;

function renderScreenView() {
    svQueued = false;
    const L = dsCurrent(dsLoad());
    const ctx = dsContext();
    const html = L.cards.filter(c => c.show).map(c => dsPlayerCardHtml(c, ctx)).filter(Boolean);
    document.getElementById('sv-board').innerHTML = html.join('');
    document.getElementById('sv-empty').hidden = html.length > 0;
}

// Several keys can change at once (a backup restore): draw once.
function queueRender() {
    if (svQueued) return;
    svQueued = true;
    requestAnimationFrame(renderScreenView);
}

function setBig(on) {
    document.body.classList.toggle('sv-big', on);
    document.getElementById('sv-big').setAttribute('aria-pressed', on);
    const url = new URL(location.href);
    if (on) url.searchParams.set('big', '1'); else url.searchParams.delete('big');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Keeps a TV from going to sleep, where the browser allows it.
let svWakeLock = null;
async function keepAwake() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || svWakeLock) return;
    try {
        svWakeLock = await navigator.wakeLock.request('screen');
        svWakeLock.addEventListener('release', () => { svWakeLock = null; });
    } catch (e) {}
}

const SV_KEYS = [DS_KEY, CLOCKS_KEY, 'gazette-tables', PARTY_KEY, INIT_VIEW_KEY, NB_KEY];

document.addEventListener('DOMContentLoaded', () => {
    renderScreenView();
    setBig(new URLSearchParams(location.search).get('big') === '1');
    document.getElementById('sv-big').addEventListener('click', () => setBig(!document.body.classList.contains('sv-big')));

    const full = document.getElementById('sv-full');
    if (!document.documentElement.requestFullscreen) full.hidden = true;
    full.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
        full.textContent = document.fullscreenElement ? '⛶ Leave Full Screen' : '⛶ Full Screen';
    });

    window.addEventListener('storage', e => {
        if (e.key === null || SV_KEYS.includes(e.key)) queueRender();
    });
    keepAwake();
    document.addEventListener('visibilitychange', () => {
        keepAwake();
        // A hidden window may have missed nothing, but a redraw is cheap.
        if (document.visibilityState === 'visible') queueRender();
    });
});
