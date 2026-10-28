/* ============================================
   INITIATIVE: THE PLAYERS' VIEW (F47)
   What the players may see of the Initiative tab's fight (localStorage 'gazette-initiative'):
   the order, whose turn it is, the round, conditions, and health as a word (Healthy /
   Bloodied / Down), never HP, AC, or bonuses. A creature that isn't a player character
   shows as "Unknown creature A" until the DM reveals it (shown: true on the combatant).
   The Toolbox posts each change on the INIT_VIEW_CHANNEL BroadcastChannel; the player
   view (player-view.js) also reads the saved fight and listens for 'storage' events,
   so it still works where BroadcastChannel is missing. Same browser only: no server.
   Needs no other script, so the DM screen (F57) can load it too.
   ============================================ */

const INIT_VIEW_KEY = ruleKey('gazette-initiative');
const INIT_VIEW_CHANNEL = ruleKey('gazette-initiative');   // a Pathfinder fight never reaches the D&D player view
const INIT_VIEW_PF2E = ruleSystemId() === 'pf2e';

function initViewEsc(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// A creature's health as a word; null when its HP isn't tracked.
function initHealth(c) {
    if (typeof c.hp !== 'number' || typeof c.max !== 'number' || c.max <= 0) return null;
    if (c.hp <= 0) return 'down';
    return c.hp <= c.max / 2 ? 'bloodied' : 'healthy';
}

// A, B … Z, AA, AB …
function initLetter(i) {
    let s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
}

// The player-safe copy of a fight. Letters follow the order creatures joined (their id),
// so revealing or reordering one doesn't change the others' letters.
function initPlayerView(fight) {
    const list = fight && Array.isArray(fight.list) ? fight.list.filter(c => c && typeof c.id === 'number' && typeof c.name === 'string') : [];
    const letters = new Map(list.filter(c => !c.pc).sort((a, b) => a.id - b.id).map((c, i) => [c.id, initLetter(i)]));
    const turn = list.some(c => c.id === fight.turn) ? fight.turn : null;
    return {
        round: Math.max(1, Math.round(Number(fight && fight.round)) || 1),
        started: turn !== null,
        list: list.map(c => ({
            key: c.id,
            name: c.pc || c.shown === true ? c.name.slice(0, 40) : `Unknown creature ${letters.get(c.id)}`,
            hidden: !c.pc && c.shown !== true,
            pc: c.pc === true,
            health: initHealth(c),
            conds: Array.isArray(c.conds) ? c.conds.filter(x => typeof x === 'string').map(x => x.slice(0, 20)).slice(0, 15) : [],
            now: c.id === turn
        }))
    };
}

// Reads the saved fight straight from this browser (the fallback when no message has come).
function initReadSavedView() {
    try { return initPlayerView(JSON.parse(localStorage.getItem(INIT_VIEW_KEY)) || {}); } catch (e) { return initPlayerView({}); }
}

// Checks a view that came over the channel: only the fields drawn below, as plain values.
function initCleanView(v) {
    if (!v || typeof v !== 'object' || !Array.isArray(v.list)) return null;
    return {
        round: Math.max(1, Math.round(Number(v.round)) || 1),
        started: v.started === true,
        list: v.list.slice(0, 40).filter(c => c && typeof c.name === 'string').map(c => ({
            key: Number(c.key) || 0, name: c.name.slice(0, 40), hidden: c.hidden === true, pc: c.pc === true,
            health: ['healthy', 'bloodied', 'down'].includes(c.health) ? c.health : null,
            conds: Array.isArray(c.conds) ? c.conds.filter(x => typeof x === 'string').map(x => x.slice(0, 20)).slice(0, 15) : [],
            now: c.now === true
        }))
    };
}

const INIT_HEALTH_WORDS = { healthy: '💚 Healthy', bloodied: INIT_VIEW_PF2E ? '🩸 Badly hurt' : '🩸 Bloodied', down: '💀 Down' };

// The turn order as a list for the player view (and the DM screen's mini initiative card).
function initViewListHtml(view) {
    return view.list.map(c => {
        const word = c.health === 'down' && c.pc ? (INIT_VIEW_PF2E ? '🩸 Down: dying' : '🩸 Down: death saves') : INIT_HEALTH_WORDS[c.health];
        return `<li class="pv-row${c.now ? ' pv-now' : ''}${c.health === 'down' ? ' pv-down' : ''}${c.pc ? ' pv-pc' : ''}${c.hidden ? ' pv-hidden' : ''}"${c.now ? ' aria-current="true"' : ''}>
            <span class="pv-mark" aria-hidden="true">${c.now ? '▶' : ''}</span>
            <span class="pv-who">${c.pc ? '<span class="pv-icon" aria-hidden="true">👤</span>' : c.hidden ? '<span class="pv-icon" aria-hidden="true">❓</span>' : '<span class="pv-icon" aria-hidden="true">👹</span>'}<span class="pv-name">${initViewEsc(c.name)}</span></span>
            ${word ? `<span class="pv-health pv-${c.health}">${word}</span>` : '<span class="pv-health"></span>'}
            ${c.conds.length ? `<span class="pv-conds">${c.conds.map(k => `<span class="pv-cond">${initViewEsc(k)}</span>`).join('')}</span>` : ''}
        </li>`;
    }).join('');
}

// "Now: X · Next: Y", or what to say before the fight starts.
function initViewTurnText(view) {
    if (!view.list.length) return { head: 'No fight yet', sub: 'The DM\'s initiative tracker is empty.' };
    if (!view.started) return { head: 'Roll for initiative!', sub: 'The fight is about to begin.' };
    const i = view.list.findIndex(c => c.now);
    const now = view.list[i];
    // The next one up who isn't down (a downed character still takes a turn for death saves).
    let next = null;
    for (let k = 1; k < view.list.length && !next; k++) {
        const c = view.list[(i + k) % view.list.length];
        if (c.health !== 'down' || c.pc) next = c;
    }
    return { head: `Round ${view.round}`, now: now.name, next: next && next.key !== now.key ? next.name : null };
}
