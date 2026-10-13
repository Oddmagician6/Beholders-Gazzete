/* ============================================
   PLAYER VIEW (F47): player-view.html
   Follows the Toolbox's initiative tracker in this browser. The tracker posts the
   player-safe view (init-view.js) on a BroadcastChannel; this page asks for it on open,
   and also reads the saved fight and listens for 'storage' events, so it still follows
   along where BroadcastChannel is missing. ?big=1 is the big-text mode for a TV.
   ============================================ */

let pvLastTurn = null;

function renderPlayerView(view) {
    const t = initViewTurnText(view);
    document.getElementById('pv-round').textContent = t.head;
    const turn = document.getElementById('pv-turn');
    if (t.now) {
        turn.innerHTML = `Now: <strong>${initViewEsc(t.now)}</strong>${t.next ? `<span class="pv-next">Next: ${initViewEsc(t.next)}</span>` : ''}`;
    } else turn.textContent = view.list.length ? t.sub : '';
    document.getElementById('pv-list').innerHTML = initViewListHtml(view);
    document.getElementById('pv-empty').hidden = view.list.length > 0;
    document.title = (t.now ? `${t.now}'s turn` : t.head) + ' | Player View';
    // Keep whoever's turn it is on screen in a long fight.
    const now = view.list.find(c => c.now);
    const key = now ? now.key : null;
    if (key !== pvLastTurn) {
        pvLastTurn = key;
        const row = document.querySelector('.pv-row.pv-now');
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function setBig(on) {
    document.body.classList.toggle('pv-big', on);
    document.getElementById('pv-big').setAttribute('aria-pressed', on);
    const url = new URL(location.href);
    if (on) url.searchParams.set('big', '1'); else url.searchParams.delete('big');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Keeps a TV from going to sleep mid-fight, where the browser allows it.
let pvWakeLock = null;
async function keepAwake() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || pvWakeLock) return;
    try {
        pvWakeLock = await navigator.wakeLock.request('screen');
        pvWakeLock.addEventListener('release', () => { pvWakeLock = null; });
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    renderPlayerView(initReadSavedView());
    setBig(new URLSearchParams(location.search).get('big') === '1');
    document.getElementById('pv-big').addEventListener('click', () => setBig(!document.body.classList.contains('pv-big')));

    const full = document.getElementById('pv-full');
    if (!document.documentElement.requestFullscreen) full.hidden = true;
    full.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
        full.textContent = document.fullscreenElement ? '⛶ Leave Full Screen' : '⛶ Full Screen';
    });

    const sync = document.getElementById('pv-sync');
    let channel = null;
    try { channel = new BroadcastChannel(INIT_VIEW_CHANNEL); } catch (e) {}
    if (channel) {
        channel.addEventListener('message', e => {
            if (!e.data || e.data.type !== 'view') return;
            const view = initCleanView(e.data.view);
            if (view) { renderPlayerView(view); sync.textContent = '🟢 Following the tracker'; }
        });
        channel.postMessage({ type: 'hello' });
    }
    // The fallback, and a second path: the tracker saves the fight in this browser too.
    window.addEventListener('storage', e => {
        if (e.key === INIT_VIEW_KEY || e.key === null) renderPlayerView(initReadSavedView());
    });

    keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
});
