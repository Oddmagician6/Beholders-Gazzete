/* ============================================
   RUMOR DECK (F20)
   Deals rumors without repeats until a category's deck runs out, then reshuffles.
   One deck per category ('all' is its own deck), shared by the Tavern and the
   Session Kit, kept in localStorage 'gazette-rumor-deck' as rumors.json indexes:
     { n: <rumors.json count>, decks: { <category>: [indexes left to deal] } }
   If rumors.json changes size, every deck starts fresh. Shuffles use rand() (rng.js).
   ============================================ */

const RUMOR_DECK_KEY = 'gazette-rumor-deck';

function loadRumorDecks(baseCount) {
    try {
        const saved = JSON.parse(localStorage.getItem(RUMOR_DECK_KEY));
        if (saved && saved.n === baseCount && saved.decks) return saved;
    } catch (e) {}
    return { n: baseCount, decks: {} };
}

function saveRumorDecks(state) {
    try { localStorage.setItem(RUMOR_DECK_KEY, JSON.stringify(state)); } catch (e) {}
}

// Every index in the category, in rumors order.
function rumorCategoryPool(rumors, category) {
    return rumors.map((r, i) => i).filter(i => category === 'all' || rumors[i].category === category);
}

function shuffleRumorIndexes(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// The deck's remaining indexes, dropping any that no longer fit the category
// (reader-added rumors live only until a refresh).
function rumorDeckLeft(state, rumors, category) {
    const left = (state.decks[category] || []).filter(i => rumors[i] && (category === 'all' || rumors[i].category === category));
    state.decks[category] = left;
    return left;
}

// Deal the next rumor index in the category, or -1 if it has no rumors.
// avoidIdx: the rumor on screen, kept off the top of a fresh shuffle.
// Returns { idx, left, total, reshuffled } (reshuffled: a used-up deck was shuffled again).
function dealRumor(rumors, baseCount, category, avoidIdx = -1) {
    const state = loadRumorDecks(baseCount);
    const pool = rumorCategoryPool(rumors, category);
    if (!pool.length) return { idx: -1, left: 0, total: 0, reshuffled: false };
    const started = category in state.decks;
    let left = rumorDeckLeft(state, rumors, category);
    const reshuffled = started && !left.length;
    if (!left.length) {
        left = shuffleRumorIndexes(pool);
        if (left.length > 1 && left[left.length - 1] === avoidIdx) left.unshift(left.pop());
    }
    const idx = left.pop();
    state.decks[category] = left;
    saveRumorDecks(state);
    return { idx, left: left.length, total: pool.length, reshuffled };
}

// Put a reader-added rumor into the started decks it belongs to, somewhere random
// (a deck not started yet picks it up when it's built).
function addToRumorDecks(rumors, baseCount, idx) {
    const state = loadRumorDecks(baseCount);
    ['all', rumors[idx].category].forEach(cat => {
        const left = state.decks[cat];
        if (left) left.splice(Math.floor(rand() * (left.length + 1)), 0, idx);
    });
    saveRumorDecks(state);
}

// How many are left in a category's deck (a deck not started yet counts as full).
function rumorDeckCount(rumors, baseCount, category) {
    const state = loadRumorDecks(baseCount);
    const total = rumorCategoryPool(rumors, category).length;
    return { left: category in state.decks ? rumorDeckLeft(state, rumors, category).length : total, total };
}

function reshuffleRumorDeck(baseCount, category) {
    const state = loadRumorDecks(baseCount);
    delete state.decks[category];
    saveRumorDecks(state);
}
