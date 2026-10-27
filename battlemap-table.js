/* ============================================
   BATTLEMAP BUILDER: PLAY MODE (F76)
   Table play on the map being built, for in-person games on one device: the 🎲 Play switch
   swaps the drawing tools for 👆 Tokens, ☁️ Fog, 📏 Ruler, and ✋ Pan.
   Tokens: the Initiative Tracker's combatants (the party, Encounter Builder and Bestiary
   monsters all go there first), placed from the list, plus your own tokens. A token from the
   fight shows its hit points, conditions, and turn as the tracker has them; ◀ ▶ here move the
   tracker's turn (it hears the change through the 'storage' event).
   Fog: the first time a map opens in Play mode it is all hidden. Reveal (or, right-click or
   Shift, hide) with a brush, a box, or a whole room at a click (bmRoom: out to its walls and doors).
   📺 Player View opens battlemap-view.html in a window for the TV: this page posts the players'
   copy of the table (battlemap-play.js bpPlayerState) on BP_CHANNEL after every change.
   Loads before battlemap.js, which calls btSetup() and these from its own handlers; nothing
   here runs until then.
   ============================================ */

const BT_TOOLS = {
    token: { key: 'v', label: '👆 Tokens' }, fog: { key: 'f', label: '☁️ Fog' },
    ruler: { key: 'm', label: '📏 Ruler' }, pan: { key: 'h', label: '✋ Pan' }
};

// ── Drawing ───────────────────────────────────────────────
function btDraw() {
    const play = BB.mode === 'play';
    $('bb-g-fog').innerHTML = play ? bmFogSvg(BB.m) : '';
    $('bb-g-tokens').innerHTML = play ? bmTokenSvg(BB.m.tk.map(t => bpDmToken(t, BB.fight, t.id === BB.tsel)), { uid: 'bb', names: BB.popts.names }) : '';
}

// Everything Play mode shows beside the map.
function btRefresh() {
    btDraw();
    btFightList();
    btTurnText();
    bbInspector();
    btPost();
}

// ── The Player View window ────────────────────────────────
function btChannel() {
    if (BB.chan === undefined) {
        try {
            BB.chan = new BroadcastChannel(BP_CHANNEL);
            BB.chan.addEventListener('message', e => { if (e.data && e.data.type === 'hello') btPost(); });
        } catch (e) { BB.chan = null; }
    }
    return BB.chan;
}

let btPostTimer = 0;
// Soon, once: a drag posts once a frame at most. A timer, not a frame: it still runs with this tab behind another.
function btPost() {
    if (btPostTimer || !btChannel()) return;
    btPostTimer = setTimeout(() => {
        btPostTimer = 0;
        const r = BB.mode === 'play' && BB.ruler ? { ...BB.ruler, text: bbRulerText(BB.ruler) } : null;
        try { BB.chan.postMessage({ type: 'state', state: bpPlayerState(BB.m, BB.fight, BB.popts, r) }); } catch (e) {}
    }, 16);
}

function btOpenView() {
    // Saved first: the window draws this map from the saves until this page answers it.
    bbSaveNow();
    const w = window.open('battlemap-view', 'gazette-battlemap-view', 'popup,width=1280,height=800');
    if (!w) { bbFlash('⚠️ The browser blocked the window. Allow pop-ups for this site, or open the Player View link below the map.', true); return; }
    bbFlash('📺 Drag the Player View window to the TV or second screen, then press its ⛶ Full Screen button.');
    btPost();
}

// ── Fog ───────────────────────────────────────────────────
// A map opens in Play mode hidden. Quiet: after an undo, with no message.
function btEnsureFog(quiet = false) {
    const m = BB.m;
    if (m.fog) return;
    m.fog = new Array(m.w * m.h).fill(0);
    // Undo and redo mustn't bring the map back without its fog.
    BB.undo.concat(BB.redo).forEach(s => { if (!s.fog && s.w === m.w && s.h === m.h) s.fog = m.fog.slice(); });
    bbSave();
    if (!quiet) bbFlash('☁️ The whole map starts hidden from the players. Reveal it with the ☁️ Fog tool.', true);
}

// Fog on or off the brush's squares around x, y. True when something changed.
function btFogBrush(x, y, v) {
    const m = BB.m, [x0, y0, n] = bbBrush(x, y, BB.fogSize);
    let hit = false;
    for (let sy = y0; sy < y0 + n; sy++) for (let sx = x0; sx < x0 + n; sx++) {
        if (!bmIn(m, sx, sy) || m.fog[sy * m.w + sx] === v) continue;
        m.fog[sy * m.w + sx] = v;
        hit = true;
    }
    return hit;
}

function btFogAll(v) {
    bbMark();
    BB.m.fog = new Array(BB.m.w * BB.m.h).fill(v);
    btDraw();
    bbSave();
    bbFlash(v ? '☀️ Everything revealed. Undo hides it again.' : '☁️ Everything hidden.');
}

// ── Tokens ────────────────────────────────────────────────
function btToken(id) {
    return BB.m.tk.find(t => t.id === id) || null;
}

function btPlaced(c) {
    return BB.m.tk.find(t => bpCombatant(t, BB.fight) === c) || null;
}

// Where a token of n squares goes with its middle at p: on the squares, or (free) right there.
function btSpot(p, n, free) {
    const m = BB.m, clamp = (v, max) => Math.max(0, Math.min(Math.max(0, max - n), v));
    return free ? { x: clamp(p.x - n / 2, m.w), y: clamp(p.y - n / 2, m.h) } : { x: clamp(Math.round(p.x - n / 2), m.w), y: clamp(Math.round(p.y - n / 2), m.h) };
}

// The token on top at p.
function btHitAt(p) {
    for (let i = BB.m.tk.length - 1; i >= 0; i--) {
        const t = BB.m.tk[i], n = BM_TOKEN_SIZES[t.s];
        const r = t.s === 'T' ? 0.35 : n * 0.48;
        if (Math.hypot(t.x + n / 2 - p.x, t.y + n / 2 - p.y) <= r) return t;
    }
    return null;
}

// A free place for a token of n squares near square cx, cy: on floor if the map has any, not on another token.
function btFreeSpot(n, cx, cy) {
    const m = BB.m, anyFloor = m.fl.some(Boolean);
    const taken = new Set();
    m.tk.forEach(t => { const [x0, y0, x1, y1] = bmTokenFoot(t); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) taken.add(y * m.w + x); });
    const fits = (x, y, floor) => {
        if (x < 0 || y < 0 || x + n > m.w || y + n > m.h) return false;
        for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) {
            const i = (y + dy) * m.w + x + dx;
            if (taken.has(i) || (floor && !m.fl[i])) return false;
        }
        return true;
    };
    for (const floor of anyFloor ? [true, false] : [false]) {
        for (let r = 0; r <= Math.max(m.w, m.h); r++) {
            for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
                if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) === r && fits(x, y, floor)) return { x, y };
            }
        }
    }
    return { x: Math.max(0, Math.min(m.w - n, cx)), y: Math.max(0, Math.min(m.h - n, cy)) };
}

// The square in the middle of what the stage shows.
function btViewMiddle() {
    const stage = $('bb-stage'), r = stage.getBoundingClientRect();
    const p = bbPoint({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    return { x: Math.max(0, Math.min(BB.m.w - 1, Math.floor(p.x))), y: Math.max(0, Math.min(BB.m.h - 1, Math.floor(p.y))) };
}

function btAddToken(tpl, at) {
    if (BB.m.tk.length >= BM_LIMITS.tokens) { bbFlash(`⚠️ A map holds ${BM_LIMITS.tokens} tokens.`, true); return null; }
    const t = { id: bmId(), x: at.x, y: at.y, ...tpl };
    while (BB.m.tk.some(o => o.id === t.id)) t.id = bmId();
    BB.m.tk.push(t);
    return t;
}

// Every combatant not yet on the map, around the middle of the view.
function btPlaceAll() {
    const todo = BB.fight.list.filter(c => !btPlaced(c));
    if (!todo.length) { bbFlash('Everyone in the fight is already on the map.'); return; }
    bbMark();
    const mid = btViewMiddle();
    let n = 0;
    for (const c of bpOrder(todo)) {
        const tpl = bpTokenFor(c), size = BM_TOKEN_SIZES[tpl.s];
        if (!btAddToken(tpl, btFreeSpot(size, mid.x - Math.floor(size / 2), mid.y - Math.floor(size / 2)))) break;
        n++;
    }
    BB.placing = null;
    btRefresh();
    bbSave();
    bbFlash(`📍 Put ${n} on the map around the middle of the view. Drag them where they stand.`);
}

// Centers the stage on a token and picks it up.
function btFind(t) {
    BB.tsel = t.id;
    const stage = $('bb-stage'), svg = $('bb-svg'), r = svg.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const n = BM_TOKEN_SIZES[t.s];
    stage.scrollLeft += r.left + (t.x + n / 2) * BB.zoom - (s.left + s.width / 2);
    stage.scrollTop += r.top + (t.y + n / 2) * BB.zoom - (s.top + s.height / 2);
    btDraw();
    bbInspector();
}

// ── The pointer (battlemap.js hands these over in Play mode) ──
function btDown(e, p, rub, free) {
    const m = BB.m, sq = { x: Math.floor(p.x), y: Math.floor(p.y) };
    if (BB.tool === 'fog') {
        if (BB.fogMode === 'room') {
            const room = bmIn(m, sq.x, sq.y) ? bmRoom(m, sq.x, sq.y) : [];
            if (!room.length) { bbFlash('That is bare rock. Click inside a room or corridor.'); return; }
            const v = rub ? 0 : 1;
            if (room.every(i => m.fog[i] === v)) return;
            bbMark();
            room.forEach(i => { m.fog[i] = v; });
            btDraw();
            bbSave();
            return;
        }
        bbMark();
        if (BB.fogMode === 'rect') { BB.drag = { kind: 'btbox', a: sq, b: sq, v: rub ? 0 : 1 }; bbDrawUi(); return; }
        BB.drag = { kind: 'btfog', last: p, v: rub ? 0 : 1, hit: btFogBrush(p.x, p.y, rub ? 0 : 1) };
        btDraw();
        return;
    }
    // Tokens.
    if (BB.placing) {
        if (!bbOnMap(p)) return;
        bbMark();
        const t = btAddToken(BB.placing, btSpot(p, BM_TOKEN_SIZES[BB.placing.s], free));
        if (!t) { BB.undo.pop(); bbUndoButtons(); return; }
        BB.placing = null;
        BB.tsel = t.id;
        BB.hover = null;
        btRefresh();
        bbSave();
        return;
    }
    const t = btHitAt(p);
    BB.tsel = t ? t.id : null;
    if (t) {
        const n = BM_TOKEN_SIZES[t.s];
        BB.drag = { kind: 'btmove', id: t.id, dx: t.x - p.x, dy: t.y - p.y, from: { x: t.x + n / 2, y: t.y + n / 2 }, moved: false };
    }
    btDraw();
    bbInspector();
}

function btMove(d, p, e) {
    const m = BB.m;
    if (d.kind === 'btfog') {
        const steps = Math.max(1, Math.ceil(Math.hypot(p.x - d.last.x, p.y - d.last.y) * 2));
        for (let k = 1; k <= steps; k++) {
            if (btFogBrush(d.last.x + (p.x - d.last.x) * k / steps, d.last.y + (p.y - d.last.y) * k / steps, d.v)) d.hit = true;
        }
        d.last = p;
        btDraw();
        btPost();
    } else if (d.kind === 'btbox') {
        d.b = { x: Math.max(0, Math.min(m.w - 1, Math.floor(p.x))), y: Math.max(0, Math.min(m.h - 1, Math.floor(p.y))) };
        bbDrawUi();
    } else if (d.kind === 'btmove') {
        const t = btToken(d.id);
        if (!t) return;
        const n = BM_TOKEN_SIZES[t.s];
        const at = btSpot({ x: p.x + d.dx + n / 2, y: p.y + d.dy + n / 2 }, n, e.altKey);
        if (at.x === t.x && at.y === t.y) return;
        if (!d.moved) { bbMark(); d.moved = true; }
        t.x = at.x;
        t.y = at.y;
        // How far it has gone, on the ruler, for the DM and the players.
        BB.ruler = { a: d.from, b: { x: t.x + n / 2, y: t.y + n / 2 } };
        btDraw();
        bbDrawUi();
        btPost();
    }
}

function btUp(d) {
    const m = BB.m;
    if (d.kind === 'btbox') {
        const [x0, y0, x1, y1] = bbRectOf(d);
        let hit = false;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            if (bmIn(m, x, y) && m.fog[y * m.w + x] !== d.v) { m.fog[y * m.w + x] = d.v; hit = true; }
        }
        if (hit) { btDraw(); bbSave(); } else { BB.undo.pop(); bbUndoButtons(); }
    } else if (d.kind === 'btfog') {
        if (d.hit) bbSave(); else { BB.undo.pop(); bbUndoButtons(); }
    } else if (d.kind === 'btmove') {
        if (d.moved) bbSave();
        if (BB.tool !== 'ruler') BB.ruler = null;
        bbInspector();
        btPost();
    }
}

// What the pointer would do: a token about to go down, or the fog brush.
function btHover(p, e) {
    let h = null;
    if (bbOnMap(p)) {
        if (BB.tool === 'token' && BB.placing) {
            const n = BM_TOKEN_SIZES[BB.placing.s];
            h = { tok: { ...BB.placing, ...btSpot(p, n, e.altKey) } };
        } else if (BB.tool === 'fog' && BB.fogMode === 'brush') {
            h = { brush: bbBrush(p.x, p.y, BB.fogSize), rub: e.shiftKey };
        }
    }
    BB.hover = h;
    bbDrawUi();
}

// ── Keys ──────────────────────────────────────────────────
// True when Play mode took the key.
function btKey(e, k) {
    if (k === 'n') { e.preventDefault(); btTurn(e.shiftKey ? -1 : 1); return true; }
    if (k === 'escape') { BB.placing = null; BB.tsel = null; BB.ruler = null; BB.hover = null; btDraw(); bbDrawUi(); bbInspector(); btPost(); return true; }
    const t = btToken(BB.tsel);
    if (!t) return false;
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); btTokenAct('del'); return true; }
    const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
    if (arrows[k]) {
        e.preventDefault();
        bbMark();
        const n = BM_TOKEN_SIZES[t.s], [dx, dy] = arrows[k];
        t.x = Math.max(0, Math.min(Math.max(0, BB.m.w - n), t.x + dx));
        t.y = Math.max(0, Math.min(Math.max(0, BB.m.h - n), t.y + dy));
        btDraw();
        bbSave();
        return true;
    }
    return false;
}

// ── The turn ──────────────────────────────────────────────
// Moves the tracker's turn on (step 1) or back (-1), as its own ▶ and ◀ do.
function btTurn(step) {
    const f = bpLoadFight();
    if (!f.raw || !f.list.length) { bbFlash('⚔️ The Initiative Tracker has no fight yet.'); return; }
    const order = bpOrder(f.list), i = order.findIndex(c => c.id === f.turn);
    let turn = f.turn, round = f.round;
    if (step > 0) {
        if (i < 0) turn = order[0].id;
        else if (i === order.length - 1) { turn = order[0].id; round++; }
        else turn = order[i + 1].id;
    } else {
        if (i < 0) return;
        if (i > 0) turn = order[i - 1].id;
        else if (round > 1) { round--; turn = order[order.length - 1].id; }
        else turn = null;
    }
    f.raw.turn = turn;
    f.raw.round = round;
    try {
        localStorage.setItem(BP_FIGHT_KEY, JSON.stringify(f.raw));
    } catch (e) {
        bbFlash("⚠️ This browser wouldn't save the turn (storage full or blocked).", true);
        return;
    }
    BB.fight = bpLoadFight();
    // The initiative Player View (player-view.html) hears it on its own channel too.
    try { const ch = new BroadcastChannel(INIT_VIEW_CHANNEL); ch.postMessage({ type: 'view', view: initPlayerView(BB.fight) }); ch.close(); } catch (e) {}
    btRefresh();
}

function btTurnText() {
    const f = BB.fight, el = $('bt-turn');
    if (!f.list.length) { el.textContent = '⚔️ No fight in the Initiative Tracker'; return; }
    const order = bpOrder(f.list), i = order.findIndex(c => c.id === f.turn);
    if (i < 0) { el.textContent = `⚔️ ${order.length} in the fight: ▶ starts round 1`; return; }
    const next = order[(i + 1) % order.length];
    el.innerHTML = `Round ${f.round} · Now: <strong>${esc(order[i].name)}</strong>${order.length > 1 ? ` · Next: ${esc(next.name)}` : ''}`;
}

// ── The side panel ────────────────────────────────────────
function btFightList() {
    const box = $('bt-fight'), f = BB.fight;
    if (!f.list.length) {
        box.innerHTML = '<p class="bb-hint">The <a href="dnd-initiative-tracker" target="_blank">Initiative Tracker</a> has no fight yet. Add the party, an encounter from the Encounter Builder, or monsters from the Bestiary there, and they show up here to put on the map.</p>';
        return;
    }
    const rows = bpOrder(f.list).map(c => {
        const on = btPlaced(c);
        const hp = c.max > 0 ? `${c.hp}/${c.max}` : '';
        return `<li class="bt-row${c.id === f.turn ? ' bt-now' : ''}${c.hp !== null && c.hp <= 0 ? ' bt-down' : ''}">
            <span class="bt-init" title="Initiative">${c.init}</span>
            <span class="bt-name">${c.pc ? '👤' : '👹'} ${esc(c.name)}</span>
            <span class="bt-hp">${hp}</span>
            ${on ? `<button type="button" class="btn" data-bt-find="${on.id}" title="Show it on the map">🎯</button>`
                : `<button type="button" class="btn" data-bt-place="${c.id}" title="Click the map to put it down">📍</button>`}
        </li>`;
    }).join('');
    const left = f.list.filter(c => !btPlaced(c)).length;
    box.innerHTML = `<ol class="bt-list">${rows}</ol>
        ${left ? `<button type="button" class="btn" data-bt="place-all">📍 Put the other ${left} on the map</button>` : ''}`;
}

const btArtOptions = sel => `<option value="">No picture (initials)</option>`
    + `<optgroup label="Creatures">${BM_CREATURE_ART.map(a => `<option value="creature/${a}"${sel === 'creature/' + a ? ' selected' : ''}>${a[0].toUpperCase() + a.slice(1)}</option>`).join('')}</optgroup>`
    + `<optgroup label="Classes">${BM_CLASS_ART.map(a => `<option value="class/${a}"${sel === 'class/' + a ? ' selected' : ''}>${a[0].toUpperCase() + a.slice(1)}</option>`).join('')}</optgroup>`;
const btPick = (list, sel) => Object.entries(list).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');

function btInspector() {
    const box = $('bt-inspect'), t = btToken(BB.tsel);
    if (BB.placing) {
        box.innerHTML = `<p class="bt-placing">📍 Click the map to put down <strong>${esc(BB.placing.n)}</strong>. <kbd>Alt</kbd> puts it off the grid; <kbd>Esc</kbd> cancels.</p>`;
        return;
    }
    if (!t) { box.innerHTML = '<p class="bb-hint">Click a token to pick it up, and drag it to move it. The ruler shows how far it went.</p>'; return; }
    const c = bpCombatant(t, BB.fight);
    const live = c ? `<p class="bt-live">${c.max > 0 ? `❤️ ${c.hp} / ${c.max} HP` : 'No HP tracked'}${c.conds.length ? ` · ${c.conds.map(esc).join(', ')}` : ''}</p>
        <p class="bb-hint">It stands for ${esc(c.name)} in the Initiative Tracker: change its hit points and conditions there.${!c.pc && !c.shown ? ' The players see it as an unknown creature until you reveal it there (👁️).' : ''}</p>` : '';
    box.innerHTML = `<h3>${esc(t.n)}</h3>${live}
        ${c ? '' : `<label class="bb-f">Name <input type="text" id="bt-i-name" maxlength="${BM_LIMITS.tname}" value="${esc(t.n)}" autocomplete="off"></label>`}
        <div class="bb-row">
            <label class="bb-f">Size <select id="bt-i-size">${btPick(BM_TOKEN_SIZE_NAMES, t.s)}</select></label>
            <label class="bb-f">Kind <select id="bt-i-kind">${btPick(BM_TOKEN_KINDS, t.c)}</select></label>
        </div>
        <label class="bb-f">Picture <select id="bt-i-art">${btArtOptions(t.a)}</select></label>
        <label class="bb-check"><input type="checkbox" id="bt-i-hid"${t.hid ? ' checked' : ''}> 🙈 Hidden from the players</label>
        <div class="bb-row"><button type="button" class="btn" data-bt="del">🗑️ Take it off the map</button></div>`;
}

function btInspectInput(e) {
    const t = btToken(BB.tsel);
    if (!t) return;
    const id = e.target.id;
    if (!BB.inspectMarked) { bbMark(); BB.inspectMarked = true; }
    if (id === 'bt-i-name') {
        const n = e.target.value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, BM_LIMITS.tname);
        if (!n) return;
        t.n = n;
    }
    if (id === 'bt-i-size' && bmHas(BM_TOKEN_SIZES, e.target.value)) {
        t.s = e.target.value;
        const n = BM_TOKEN_SIZES[t.s];
        t.x = Math.max(0, Math.min(Math.max(0, BB.m.w - n), t.x));
        t.y = Math.max(0, Math.min(Math.max(0, BB.m.h - n), t.y));
    }
    if (id === 'bt-i-kind' && bmHas(BM_TOKEN_KINDS, e.target.value)) t.c = e.target.value;
    if (id === 'bt-i-art') t.a = bmArtOk(e.target.value) ? e.target.value : '';
    if (id === 'bt-i-hid') t.hid = e.target.checked;
    btDraw();
    bbSave();
    if (id === 'bt-i-name') btFightList();
}

function btTokenAct(act) {
    const t = btToken(BB.tsel);
    if (!t) return;
    if (act === 'del') {
        bbMark();
        BB.m.tk = BB.m.tk.filter(o => o !== t);
        BB.tsel = null;
        btRefresh();
        bbSave();
    }
}

// ── Set up ────────────────────────────────────────────────
function btSetMode(mode) {
    BB.mode = mode === 'play' ? 'play' : 'build';
    const play = BB.mode === 'play';
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === BB.mode)));
    $('bb-playbar').hidden = !play;
    $('bb-buildbar').hidden = play;
    BB.sel = null;
    BB.tsel = null;
    BB.placing = null;
    BB.ruler = null;
    if (play) btEnsureFog();
    bbToolButtons();
    bbSetTool(play ? 'token' : 'floor');
    btRefresh();
    try { sessionStorage.setItem('gazette-battlemap-mode', BB.mode); } catch (e) {}
}

function btSetup() {
    BB.fight = bpLoadFight();
    BB.popts = bpLoadOpts();
    btChannel();
    $('bt-size').innerHTML = btPick(BM_TOKEN_SIZE_NAMES, 'M');
    $('bt-kind').innerHTML = btPick(BM_TOKEN_KINDS, 'npc');
    $('bt-art').innerHTML = btArtOptions('');
    $('bt-o-names').checked = BB.popts.names;
    $('bt-o-labels').checked = BB.popts.labels;
    $('bt-o-hp').value = BB.popts.hp;
    $('bt-o-show').value = BB.popts.show;
    const opt = () => {
        BB.popts = bpCleanOpts({ names: $('bt-o-names').checked, labels: $('bt-o-labels').checked, hp: $('bt-o-hp').value, show: $('bt-o-show').value });
        bpSaveOpts(BB.popts);
        btDraw();
        btPost();
    };
    ['bt-o-names', 'bt-o-labels', 'bt-o-hp', 'bt-o-show'].forEach(id => $(id).addEventListener('change', opt));
    $('bt-view').addEventListener('click', btOpenView);
    $('bt-next').addEventListener('click', () => btTurn(1));
    $('bt-prev').addEventListener('click', () => btTurn(-1));
    $('bt-inspect').addEventListener('input', btInspectInput);
    $('bt-inspect').addEventListener('focusin', () => { BB.inspectMarked = false; });
    $('bt-fog-size').addEventListener('change', e => { BB.fogSize = +e.target.value; });
    $('bt-add').addEventListener('click', () => {
        const n = $('bt-name').value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, BM_LIMITS.tname);
        if (!n) { $('bt-name').focus(); bbFlash('Give the token a name first.'); return; }
        const a = $('bt-art').value;
        BB.placing = { n, s: $('bt-size').value, c: $('bt-kind').value, a: bmArtOk(a) ? a : '', f: 0, hid: false };
        BB.tsel = null;
        bbSetTool('token');
    });
    // The side panel's Play buttons (battlemap.js passes on the clicks it doesn't know).
    $('bb-side').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.fogmode) {
            BB.fogMode = b.dataset.fogmode;
            document.querySelectorAll('[data-fogmode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.fogmode === BB.fogMode)));
        }
        if (b.dataset.bt === 'reveal-all') btFogAll(1);
        if (b.dataset.bt === 'hide-all') btFogAll(0);
        if (b.dataset.bt === 'place-all') btPlaceAll();
        if (b.dataset.bt === 'del') btTokenAct('del');
        if (b.dataset.btPlace) {
            const c = BB.fight.list.find(x => x.id === +b.dataset.btPlace);
            if (c) { BB.placing = bpTokenFor(c); BB.tsel = null; bbSetTool('token'); }
        }
        if (b.dataset.btFind) { const t = btToken(b.dataset.btFind); if (t) btFind(t); }
    });
    document.querySelectorAll('[data-fogmode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.fogmode === BB.fogMode)));
    // The tracker (another tab) changed the fight, or the Party tab a character.
    window.addEventListener('storage', e => {
        if (e.key !== BP_FIGHT_KEY && e.key !== BP_OPTS_KEY && e.key !== null) return;
        BB.fight = bpLoadFight();
        if (e.key === BP_OPTS_KEY) {
            BB.popts = bpLoadOpts();
            $('bt-o-names').checked = BB.popts.names;
            $('bt-o-labels').checked = BB.popts.labels;
            $('bt-o-hp').value = BB.popts.hp;
            $('bt-o-show').value = BB.popts.show;
        }
        if (BB.mode === 'play') btRefresh(); else btPost();
    });
}
