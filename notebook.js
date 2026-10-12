/* ============================================
   CAMPAIGN NOTEBOOK (F38): the data side
   One browser-only notebook (localStorage) that holds saved rolls from the Worldbuilder
   tabs and the NPC page. An entry keeps the link that rebuilds its roll (every roll is
   a seed plus options in the URL), so the notebook stores links, names, and notes, never
   the rolls themselves:
     { id, kind, title, sub, href, notes, links: [ids], added }
   Saving links an entry to the ones it uses (a town on a saved pantheon's gods, a history
   dating saved factions) and to the ones that use it. Export writes the whole world as a
   JSON file; import only parses JSON and keeps what passes nbClean (known kinds, links to
   this site's tool pages, plain text), so nothing in a file ever runs.
   The page side lives in world-notebook.js. Needs rng.js (paramsQuery) on the page.
   ============================================ */

const NB_KEY = 'gazette_notebook';
const NB_KINDS = {
    calendar: { icon: '📅', label: 'Calendar' },
    pantheon: { icon: '⛪', label: 'Pantheon' },
    factions: { icon: '🏛️', label: 'Factions' },
    history: { icon: '📜', label: 'History' },
    town: { icon: '🏘️', label: 'Town' },
    npc: { icon: '🎭', label: 'NPC' }
};
// Saved links may only point at these pages, with a plain query string.
const NB_HREF = /^(worldbuilder|npc-generator)\.html(\?[A-Za-z0-9_.~%+=&*-]*)?$/;
const NB_LIMITS = { entries: 500, title: 120, sub: 400, notes: 4000, name: 80, href: 2000, links: 60, file: 2000000 };
// The options that make two rolls with one seed different, per kind (its own URL keys).
const NB_SIG_KEYS = { pantheon: ['size', 'shape', 'naming'], factions: ['count', 'focus', 'scale'] };
// URL keys that name another tab's roll: the seed key, and its option keys → that kind's keys.
const NB_USES = {
    gods: { kind: 'pantheon', keys: { gsize: 'size', gshape: 'shape', gnaming: 'naming' } },
    facs: { kind: 'factions', keys: { fcount: 'count', ffocus: 'focus', fscale: 'scale' } }
};

const nbListeners = [];

function nbEmpty() {
    return { name: '', entries: [] };
}

function nbText(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

// A clean notebook from untrusted data (storage or an imported file).
// Returns { nb, dropped }; throws when raw isn't a notebook at all.
function nbClean(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.entries)) throw new Error("This isn't a Gazette notebook file.");
    const nb = { name: nbText(raw.name, NB_LIMITS.name), entries: [] };
    const ids = new Set();
    let dropped = 0;
    raw.entries.forEach(e => {
        const ok = e && typeof e === 'object'
            && typeof e.id === 'string' && /^[a-z0-9]{1,16}$/.test(e.id) && !ids.has(e.id)
            && Object.hasOwn(NB_KINDS, e.kind)
            && typeof e.href === 'string' && e.href.length <= NB_LIMITS.href && NB_HREF.test(e.href)
            && nbText(e.title, NB_LIMITS.title)
            && nb.entries.length < NB_LIMITS.entries;
        if (!ok) { dropped++; return; }
        ids.add(e.id);
        const added = new Date(typeof e.added === 'string' ? e.added : NaN);
        nb.entries.push({
            id: e.id,
            kind: e.kind,
            title: nbText(e.title, NB_LIMITS.title),
            sub: nbText(e.sub, NB_LIMITS.sub),
            href: e.href,
            notes: nbText(e.notes, NB_LIMITS.notes),
            links: Array.isArray(e.links) ? e.links.filter(l => typeof l === 'string') : [],
            added: isNaN(added) ? new Date().toISOString() : added.toISOString()
        });
    });
    // Links only to entries that made it, never to itself, each once.
    nb.entries.forEach(e => { e.links = [...new Set(e.links)].filter(l => l !== e.id && ids.has(l)).slice(0, NB_LIMITS.links); });
    return { nb, dropped };
}

function nbLoad() {
    try {
        const raw = localStorage.getItem(NB_KEY);
        return raw ? nbClean(JSON.parse(raw)).nb : nbEmpty();
    } catch (e) {
        return nbEmpty();
    }
}

// Store the notebook. quiet: skip the listeners (a note being typed). Returns false if storage failed.
function nbStore(nb, quiet = false) {
    try {
        localStorage.setItem(NB_KEY, JSON.stringify(nb));
    } catch (e) {
        return false;
    }
    if (!quiet) nbListeners.forEach(fn => fn(nb));
    return true;
}

// fn(nb) runs after every change, here or in another browser tab.
function nbOnChange(fn) {
    nbListeners.push(fn);
}

window.addEventListener('storage', e => {
    if (e.key === NB_KEY || e.key === null) { const nb = nbLoad(); nbListeners.forEach(fn => fn(nb)); }
});

function nbNewId(nb) {
    let id;
    do { id = Date.now().toString(36) + Math.floor(Math.random() * 1679616).toString(36); } while (nb.entries.some(e => e.id === id));
    return id;
}

function nbFind(nb, id) {
    return nb.entries.find(e => e.id === id) || null;
}

// ── Links between entries ─────────────────────────────────
function nbQuery(href) {
    return new URLSearchParams(href.split('?')[1] || '');
}

// What a roll is: its kind, seed, and the options that change it.
function nbSig(kind, seed, get) {
    return [kind, seed, ...(NB_SIG_KEYS[kind] || []).map(get)].join('|');
}

function nbEntrySig(e) {
    const q = nbQuery(e.href);
    // The Calendar is the Worldbuilder's first tab, so its links carry no tab=.
    const seed = q.get('seed');
    return seed ? nbSig(e.kind, seed, k => q.get(k) || '') : null;
}

// The rolls an entry is built on (a town's linked pantheon, a history's factions).
function nbEntryUses(e) {
    const q = nbQuery(e.href);
    return Object.entries(NB_USES).filter(([key]) => q.get(key)).map(([key, u]) => {
        const back = Object.fromEntries(Object.entries(u.keys).map(([mine, theirs]) => [theirs, mine]));
        return nbSig(u.kind, q.get(key), k => q.get(back[k]) || '');
    });
}

function nbLink(nb, a, b) {
    const x = nbFind(nb, a), y = nbFind(nb, b);
    if (!x || !y || a === b) return false;
    if (!x.links.includes(b)) x.links.push(b);
    if (!y.links.includes(a)) y.links.push(a);
    return true;
}

function nbUnlink(nb, a, b) {
    const x = nbFind(nb, a), y = nbFind(nb, b);
    if (x) x.links = x.links.filter(l => l !== b);
    if (y) y.links = y.links.filter(l => l !== a);
}

function nbRemove(nb, id) {
    nb.entries = nb.entries.filter(e => e.id !== id);
    nb.entries.forEach(e => { e.links = e.links.filter(l => l !== id); });
}

// Save a roll: { kind, title, sub, href }. Returns { entry, existed, linked } or null when
// the browser won't store it. The same link twice keeps the first entry.
function nbAdd(item) {
    const nb = nbLoad();
    const href = String(item.href || '');
    const old = nb.entries.find(e => e.href === href);
    if (old) return { entry: old, existed: true, linked: 0 };
    if (!NB_HREF.test(href) || !Object.hasOwn(NB_KINDS, item.kind)) return null;
    if (nb.entries.length >= NB_LIMITS.entries) return { entry: null, full: true };
    const entry = {
        id: nbNewId(nb),
        kind: item.kind,
        title: nbText(item.title, NB_LIMITS.title) || NB_KINDS[item.kind].label,
        sub: nbText(item.sub, NB_LIMITS.sub),
        href,
        notes: '',
        links: [],
        added: new Date().toISOString()
    };
    nb.entries.push(entry);
    const sig = nbEntrySig(entry), uses = nbEntryUses(entry);
    let linked = 0;
    nb.entries.forEach(e => {
        if (e === entry) return;
        if (uses.includes(nbEntrySig(e)) || (sig && nbEntryUses(e).includes(sig))) linked += nbLink(nb, entry.id, e.id) ? 1 : 0;
    });
    return nbStore(nb) ? { entry, existed: false, linked } : null;
}

// ── Export and import ─────────────────────────────────────
function nbExportText(nb) {
    return JSON.stringify({ gazetteNotebook: 1, name: nb.name, exported: new Date().toISOString(), entries: nb.entries }, null, 2);
}

function nbFileName(nb) {
    const slug = nb.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    return `${slug || 'campaign-notebook'}-${new Date().toISOString().slice(0, 10)}.json`;
}

// Parse a notebook file (JSON only). Returns { nb, dropped }; throws a readable Error.
function nbParseFile(text) {
    if (typeof text !== 'string' || text.length > NB_LIMITS.file) throw new Error('That file is too big to be a notebook.');
    let raw;
    try { raw = JSON.parse(text); } catch (e) { throw new Error("That file isn't JSON, so it can't be a notebook."); }
    return nbClean(raw);
}

// Fold an imported notebook into this one. An entry whose link is already here keeps
// the one here (and gains the imported notes); the rest come in under fresh ids.
// Returns { added, merged, full }.
function nbMerge(nb, incoming) {
    const map = {};
    let added = 0, merged = 0, full = 0;
    incoming.entries.forEach(e => {
        const same = nb.entries.find(x => x.href === e.href);
        if (same) {
            map[e.id] = same.id;
            if (e.notes && !same.notes.includes(e.notes)) same.notes = nbText(same.notes ? `${same.notes}\n\n${e.notes}` : e.notes, NB_LIMITS.notes);
            merged++;
            return;
        }
        if (nb.entries.length >= NB_LIMITS.entries) { full++; return; }
        const id = nbFind(nb, e.id) ? nbNewId(nb) : e.id;
        map[e.id] = id;
        nb.entries.push({ ...e, id, links: [] });
        added++;
    });
    incoming.entries.forEach(e => e.links.forEach(l => { if (map[e.id] && map[l]) nbLink(nb, map[e.id], map[l]); }));
    if (!nb.name && incoming.name) nb.name = incoming.name;
    return { added, merged, full };
}
