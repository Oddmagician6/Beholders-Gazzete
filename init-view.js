/* ============================================
   INITIATIVE: THE PLAYERS' VIEW (F47)
   What the players may see of the Initiative tab's fight (localStorage 'gazette-initiative'):
   the order, whose turn it is, the round, conditions (and Pathfinder's persistent damage), and health as a word (Healthy /
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

// A creature's health as a word; null when its HP isn't tracked. One entered at 0 HP (max 0 too) is down.
function initHealth(c) {
    if (typeof c.hp !== 'number' || typeof c.max !== 'number') return null;
    if (c.hp <= 0) return 'down';
    if (c.max <= 0) return null;
    return c.hp <= c.max / 2 ? 'bloodied' : 'healthy';
}

// A number from saved data, or null (an object whose toString was overwritten would make Number() throw).
function initNum(v) {
    return typeof v === 'number' || typeof v === 'string' ? Number(v) : null;
}

// A condition's value from the saved list ("Dying 2" → 2, "Doomed" → 1); 0 when it isn't there.
function initCondValue(c, name) {
    const s = Array.isArray(c.conds) ? c.conds.find(x => typeof x === 'string' && new RegExp(`^${name}\\b`).test(x)) : null;
    if (!s) return 0;
    const m = /(\d+)/.exec(s);
    return m ? Number(m[1]) : 1;
}

// A character the tracker counts as dead (toolbox-table.js): 5e three failed death saves, Pathfinder
// dying at 4 less the doomed value.
function initDead(c) {
    if (c.pc !== true || initHealth(c) !== 'down') return false;
    if (INIT_VIEW_PF2E) { const d = initCondValue(c, 'Dying'); return d > 0 && d >= Math.max(1, 4 - initCondValue(c, 'Doomed')); }
    return Array.isArray(c.ds) && initNum(c.ds[1]) >= 3;
}

// A character at 0 HP who isn't dying any more: 5e three death-save successes, Pathfinder no dying value.
function initStable(c) {
    if (c.pc !== true || initHealth(c) !== 'down' || initDead(c)) return false;
    if (INIT_VIEW_PF2E) return !initCondValue(c, 'Dying');
    return Array.isArray(c.ds) && initNum(c.ds[0]) >= 3;
}

// A, B … Z, AA, AB …
function initLetter(i) {
    let s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
}

// The player-safe copy of a fight. Each creature's letter is the tag the tracker gave it when it
// joined (toolbox-table.js addToFight), so revealing, reordering, or removing one doesn't change
// the others' letters. Rows saved before tags get the letters after the last tag, in the order they joined.
function initPlayerView(fight) {
    const seen = new Set();
    const list = fight && Array.isArray(fight.list) ? fight.list.filter(c => c && typeof c.id === 'number' && typeof c.name === 'string' && !seen.has(c.id) && seen.add(c.id)) : [];
    const foes = list.filter(c => c.pc !== true).sort((a, b) => a.id - b.id);
    const tags = new Set();
    const tagOf = c => Number.isInteger(c.tag) && c.tag > 0 && c.tag < 10000 && !tags.has(c.tag) && tags.add(c.tag) ? c.tag : null;
    const letters = new Map(foes.map(c => [c.id, tagOf(c)]));
    let n = Math.max(0, ...tags);
    foes.forEach(c => { if (letters.get(c.id) === null) letters.set(c.id, ++n); });
    const turn = list.some(c => c.id === fight.turn) ? fight.turn : null;
    return {
        round: Math.max(1, Math.round(initNum(fight && fight.round)) || 1),
        started: turn !== null,
        list: list.map(c => ({
            key: c.id,
            name: c.pc === true || c.shown === true ? c.name.slice(0, 40) : `Unknown creature ${initLetter(letters.get(c.id) - 1)}`,
            hidden: c.pc !== true && c.shown !== true,
            pc: c.pc === true,
            health: initHealth(c),
            stable: initStable(c),
            dead: initDead(c),
            conds: [...(Array.isArray(c.conds) ? c.conds.filter(x => typeof x === 'string') : []),
                ...(Array.isArray(c.pd) ? c.pd.filter(p => p && typeof p.type === 'string').map(p => `Persistent ${p.type}`) : [])].map(x => x.slice(0, 24)).slice(0, 15),
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
        round: Math.max(1, Math.round(initNum(v.round)) || 1),
        started: v.started === true,
        list: v.list.slice(0, 60).filter(c => c && typeof c.name === 'string').map(c => ({
            key: initNum(c.key) || 0, name: c.name.slice(0, 40), hidden: c.hidden === true, pc: c.pc === true,
            health: ['healthy', 'bloodied', 'down'].includes(c.health) ? c.health : null,
            stable: c.stable === true,
            dead: c.dead === true,
            conds: Array.isArray(c.conds) ? c.conds.filter(x => typeof x === 'string').map(x => x.slice(0, 24)).slice(0, 15) : [],
            now: c.now === true
        }))
    };
}

const INIT_HEALTH_WORDS = { healthy: '💚 Healthy', bloodied: INIT_VIEW_PF2E ? '🩸 Badly hurt' : '🩸 Bloodied', down: '💀 Down' };

// The turn order as a list for the player view (and the DM screen's mini initiative card).
function initViewListHtml(view) {
    return view.list.map(c => {
        const word = c.health === 'down' && c.pc ? (c.dead ? '💀 Dead' : c.stable ? '🩹 Down: stable' : INIT_VIEW_PF2E ? '🩸 Down: dying' : '🩸 Down: death saves') : INIT_HEALTH_WORDS[c.health];
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
    const i = view.list.findIndex(c => c.now);
    if (!view.started || i < 0) return { head: 'Roll for initiative!', sub: 'The fight is about to begin.' };
    const now = view.list[i];
    // The row the tracker's Next Turn lands on (it doesn't skip the downed).
    const next = view.list.length > 1 ? view.list[(i + 1) % view.list.length] : null;
    return { head: `Round ${view.round}`, now: now.name, next: next ? next.name : null };
}
