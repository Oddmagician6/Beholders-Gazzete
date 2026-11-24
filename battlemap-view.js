/* ============================================
   BATTLEMAP PLAYER VIEW (F76): battlemap-view.html
   The players' side of the Battlemap Builder's Play mode, for a TV or second screen: the map
   with the fog black, the tokens they can see, the turn, and the DM's ruler. The Builder posts
   the players' copy (battlemap-play.js bpPlayerState) on BP_CHANNEL; this window asks for it
   when it opens. Until a message comes, or after one stops coming (the Builder closed), it
   builds the same copy from this browser's saves and follows their 'storage' events.
   It frames what the players have seen (or the whole map, as the DM picks) and fits the window.
   ============================================ */

// mapId: the map the Builder this window follows last sent (its fallback reads that map, not another tab's).
const BV = { key: '', state: null, heard: 0, from: '', mapId: '', lastFrom: '' };
const $ = id => document.getElementById(id);

// The squares to frame: the revealed ones and one around them, or all of it.
function bvFrame(st) {
    const m = st.m;
    if (st.show === 'all') return { x: 0, y: 0, w: m.w, h: m.h };
    let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (m.fog[y * m.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
    return { x: x0, y: y0, w: Math.min(m.w, x1 + 2) - x0, h: Math.min(m.h, y1 + 2) - y0 };
}

function bvRender(st) {
    if (!st) return;
    BV.state = st;
    const stage = $('bv-stage');
    // A new map (or a changed one): draw it again. Tokens, fog, and ruler change on their own.
    if (st.key !== BV.key || !stage.querySelector('svg')) {
        BV.key = st.key;
        stage.innerHTML = bmSvg(st.m, { secret: false, uid: 'pv', title: st.m.name });
        const svg = stage.querySelector('svg');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.insertAdjacentHTML('beforeend', '<g class="bv-ruler"></g>');
    }
    const svg = stage.querySelector('svg');
    svg.querySelector('.bm-tokens').innerHTML = bmTokenSvg(st.tokens, { uid: 'pv', names: st.names, tipNames: st.names });
    svg.querySelector('.bm-fog').innerHTML = bmFogSvg(st.m, true);
    const f = bvFrame(st), S = SITE_SQUARE;
    svg.querySelector('.bv-ruler').innerHTML = bpRulerSvg(st.ruler, Math.max(4.5, (f ? Math.max(f.w, f.h) : 20) * 0.22));
    const v = f || { x: 0, y: 0, w: st.m.w, h: st.m.h };
    svg.setAttribute('viewBox', `${v.x * S} ${v.y * S} ${v.w * S} ${v.h * S}`);
    $('bv-dark').hidden = !!f;
    if (!f) $('bv-dark').textContent = '☁️ All dark so far. The DM reveals the map as you explore.';

    const t = initViewTurnText(st.view);
    $('bv-turn').innerHTML = t.now
        ? `${initViewEsc(t.head)} · Now: <strong>${initViewEsc(t.now)}</strong>${t.next ? `<span class="bv-next"> · Next: ${initViewEsc(t.next)}</span>` : ''}`
        : st.view.list.length ? initViewEsc(t.head) : '';
    document.title = (t.now ? `${t.now}'s turn` : st.m.name) + ' | Player View';
}

// The same copy, from this browser's saves: the map the Builder has open, the fight, the options.
function bvFromSaves() {
    // Opened from a Builder: the map it last sent, even when another tab has saved a different one since.
    const store = bmLoadStore(), want = BV.from && BV.mapId ? BV.mapId : store.cur, m = store.maps.find(x => x.id === want);
    if (!m) {
        // Nothing saved (or the saves cleared since): none of the last map stays up.
        BV.key = '';
        BV.state = null;
        $('bv-stage').innerHTML = '';
        $('bv-turn').innerHTML = '';
        document.title = 'Player View';
        $('bv-dark').hidden = false;
        $('bv-dark').textContent = 'No battlemap saved in this browser yet. Draw one in the Battlemap Builder.';
        return;
    }
    bvRender(bpCleanState(bpPlayerState(m, bpLoadFight(), bpLoadOpts())));
}

function bvSetup() {
    const sync = $('bv-sync');
    let channel = null;
    try { channel = new BroadcastChannel(BP_CHANNEL); } catch (e) {}
    // Opened from a Builder (its 📺 button): follow that tab only, not another tab's map.
    const hash = new URLSearchParams(location.hash.slice(1));
    const from = BV.from = hash.get('from') || '';
    // The map that Builder had open (B1010): read from the saves until it speaks.
    BV.mapId = from ? (hash.get('map') || '').slice(0, 40) : '';
    // That Builder answers the hello below at once; until it does (or if it's gone, after a moment) the
    // saved map that another tab may have opened since isn't put up.
    if (from && channel) {
        $('bv-dark').hidden = false;
        $('bv-dark').textContent = 'Waiting for the Battlemap Builder…';
        setTimeout(() => { if (!BV.heard) bvFromSaves(); }, 2000);
    } else bvFromSaves();
    if (channel) {
        channel.addEventListener('message', e => {
            if (!e.data) return;
            if (from && e.data.from !== from) return;
            // The Builder closing (B1011): its ruler and the green light go, and the saves take over.
            if (e.data.type === 'bye') {
                if (!from && e.data.from !== BV.lastFrom) return;
                BV.heard = 0;
                sync.textContent = '';
                bvFromSaves();
                return;
            }
            if (e.data.type !== 'state') return;
            BV.lastFrom = e.data.from;
            const st = bpCleanState(e.data.state);
            if (!st) return;
            BV.heard = Date.now();
            BV.mapId = st.m.id;
            bvRender(st);
            sync.textContent = '🟢 Following the DM';
        });
        channel.postMessage({ type: 'hello' });
    }
    // The fallback: a save changed while the Builder is quiet (closed, or no channel), so read it here.
    // The Builder saves a moment after it posts, so a save just after a message is that message's.
    window.addEventListener('storage', e => {
        if (e.key !== BM_KEY && e.key !== BP_FIGHT_KEY && e.key !== BP_OPTS_KEY && e.key !== null) return;
        // Still hearing from the Builder: look again once it has been quiet for two seconds, so a map
        // deleted just after its last message doesn't stay up.
        const check = () => {
            if (BV.heard < Date.now() - 2000) { bvFromSaves(); sync.textContent = ''; }
            else setTimeout(check, BV.heard + 2100 - Date.now());
        };
        setTimeout(check, 400);
    });

    const full = $('bv-full');
    if (!document.documentElement.requestFullscreen) full.hidden = true;
    const toggle = () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
    };
    full.addEventListener('click', toggle);
    document.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) toggle(); });
    document.addEventListener('fullscreenchange', () => {
        full.textContent = document.fullscreenElement ? '⛶ Leave Full Screen' : '⛶ Full Screen';
    });

    // Keeps a TV from going to sleep mid-fight, where the browser allows it.
    let lock = null;
    const awake = async () => {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || lock) return;
        try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch (e) {}
    };
    awake();
    document.addEventListener('visibilitychange', awake);
}

bvSetup();
