/* ============================================
   TOWN CRIER
   Shouts a recent Gazette headline as in-world news.
   Used by session-kit.js and the Tavern page (rumors.html).
   Reads articles.json, so it picks up each new edition on its own.
   ============================================ */

const CRIER_WINDOW_DAYS = 14;   // "recent" = published in the last two weeks
const CRIER_FALLBACK = 8;       // too few recent ones? use the newest few instead

const CRIER_OPENERS = [
    'Hear ye, hear ye!',
    'Oyez, oyez, oyez!',
    'Gather round, good folk!',
    'Hark! News from the Gazette!',
    'Read all about it!',
    'By order of nobody in particular:',
    'Stop your haggling and listen!',
    'Fresh off the Gazette\'s presses!'
];

function crierStripTags(s) {
    return String(s).replace(/<[^>]*>/g, '');
}

// Date-only strings ("2026-10-10") parse as UTC midnight; read them as local dates.
function crierDate(s) {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

// Resolves to { pool, edition }: the headlines worth shouting and the newest edition date.
async function loadCrierPool() {
    const data = await (await fetch('articles.json')).json();
    const all = (data.articles || [])
        // Real-news stories (Across the Multiverse, "real": true) aren't in-world, so the crier skips them
        .filter(a => a.id && a.title && a.date && !a.real)
        .sort((a, b) => crierDate(b.date) - crierDate(a.date));
    if (!all.length) return { pool: [], edition: null };

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - CRIER_WINDOW_DAYS);
    let pool = all.filter(a => crierDate(a.date) >= cutoff);
    if (pool.length < 4) pool = all.slice(0, CRIER_FALLBACK);

    return {
        pool: pool.map(a => ({ id: a.id, title: crierStripTags(a.title), category: a.category || 'News', date: a.date })),
        edition: all[0].date
    };
}

// The opener follows the article id, so a shared link (?crier=<id>) shouts the same line.
function crierShout(a) {
    return { ...a, opener: CRIER_OPENERS[hashString(a.id) % CRIER_OPENERS.length] };
}

// Pick a headline (not exceptId when there's a choice). Uses rand() from rng.js.
function pickCrier(pool, exceptId) {
    if (!pool.length) return null;
    const others = pool.length > 1 && exceptId ? pool.filter(a => a.id !== exceptId) : pool;
    return crierShout(others[Math.floor(rand() * others.length)]);
}

// The headline with this id, if it's still in the pool.
function crierById(pool, id) {
    const a = pool.find(x => x.id === id);
    return a ? crierShout(a) : null;
}

function crierHref(id) {
    return `a/${encodeURIComponent(id)}.html`;
}
