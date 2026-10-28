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
   Sessions and quests (F50) are written by hand, so their href may be empty, and they
   carry fields of their own (NB_FIELDS): a session's number, play date, recap, NPCs met,
   loot, and open threads; a quest's status (open / done / failed), giver, and reward.
   Older entries have none of these and come through nbClean unchanged.
   Homebrew monsters (F52) are kind 'monster': written in the Monster Maker, so no link,
   with the whole monster in `mon` (cleaned by hbClean in homebrew.js, which every page
   that loads this file loads too). nbOpenHref(e) is where an entry opens.
   Secret notes (F51): any entry may carry `dm` (notes for the DM only; `notes` are the ones
   players may see) and `flip` (the keys of rolled lines whose DM-only default the DM switched,
   see notebook-sheets.js). Both are written only when set, so older notebooks stay as they were.
   Reworded lines: an entry may carry `edits` ({ line key: text }), the DM's own wording for rolled
   lines of its sheet (same keys as `flip`). Only the notebook's copy changes: the link still rolls
   the original, so the generators and shared links never see them. Written only when set.
   Map pins (F53): a continent entry may carry `pins` (map-pins.js: numbered spots, each
   named, with a note, and maybe opening another entry), written only when it has some.
   Without map-pins.js on the page they pass through untouched, like a monster without homebrew.js.
   Your own maps (F54) are kind 'map': uploaded on the Maps tab, so no link; the picture lives in
   IndexedDB under the entry's id (map-store.js), and the entry keeps the name, notes, and pins.
   Family trees (F55) are kind 'family', with the whole family in `fam` (family-tree.js, cleaned by
   famClean; a page without it, like an article or the DM Screen, passes `fam` through untouched). A rolled family keeps its roll's link
   as well, so the Families tab finds it again; a family started by hand has no link. Its people may
   point at NPC entries (`to`), kept to entries that exist like pins.
   An article's "Use This in My Campaign" box (F69) saves a quest whose link is the article (a/<id>),
   with the hook, NPC, place, and rumor in its notes and the NPC's secret in its DM notes.
   The page side lives in world-notebook.js. Needs rng.js (paramsQuery) on the page.
   ============================================ */

const NB_KEY = ruleKey('gazette_notebook');
const NB_KINDS = {
    calendar: { icon: '📅', label: 'Calendar' },
    pantheon: { icon: '⛪', label: 'Pantheon' },
    factions: { icon: '🏛️', label: 'Factions' },
    history: { icon: '📜', label: 'History' },
    town: { icon: '🏘️', label: 'Town' },
    sites: { icon: '🏚️', label: 'Site' },
    continent: { icon: '🗺️', label: 'Continent' },
    npc: { icon: '🎭', label: 'NPC' },
    // hand: written in the notebook, so the entry may have no link.
    session: { icon: '📖', label: 'Session', hand: true },
    quest: { icon: '❗', label: 'Quest', hand: true },
    monster: { icon: '🐲', label: 'Monster', hand: true },
    map: { icon: '🖼️', label: 'Map', hand: true },
    family: { icon: '🌳', label: 'Family', hand: true }
};
// Kinds whose entry can hold pins on its map (F53, F54).
const NB_PIN_KINDS = { continent: true, map: true };
const NB_QUEST_STATUS = {
    open: { icon: '🟡', label: 'Open' },
    done: { icon: '✅', label: 'Done' },
    failed: { icon: '❌', label: 'Failed' }
};
// Saved links may only point at these pages, with a plain query string (older saves end in .html),
// or at an article (F69).
const NB_HREF = /^(?:(worldbuilder|npc-generator|toolbox|dnd-one-shot-generator|dnd-campaign-generator)(?:\.html)?(\?[A-Za-z0-9_.~%+=&*-]*)?|a\/[a-z0-9][a-z0-9-]{0,99})$/;
const NB_LIMITS = { entries: 500, title: 120, sub: 400, notes: 4000, name: 80, href: 2000, links: 60, flips: 400, flip: 300, edits: 200, edit: 2000, file: 2000000 };
// The options that make two rolls with one seed different, per kind (its own URL keys).
const NB_SIG_KEYS = {
    pantheon: ['size', 'shape', 'naming'], factions: ['count', 'focus', 'scale'], continent: ['size', 'land', 'nations'],
    family: ['gens', 'size', 'race', 'root', 'rcat', 'rage', 'rtitle', 'house']
};
// URL keys that name another tab's roll: the seed key, and its option keys → that kind's keys.
const NB_USES = {
    gods: { kind: 'pantheon', keys: { gsize: 'size', gshape: 'shape', gnaming: 'naming' } },
    facs: { kind: 'factions', keys: { fcount: 'count', ffocus: 'focus', fscale: 'scale' } },
    his: { kind: 'history', keys: { hages: 'ages', hspan: 'span', hstart: 'start' } },
    cont: { kind: 'continent', keys: { csize: 'size', cland: 'land', cnat: 'nations' } }
};

// Each kind's own fields and how to clean them (always written in this order).
const NB_FIELDS = {
    session: {
        num: v => nbNum(v),
        date: v => nbDate(v),
        recap: v => nbText(v, NB_LIMITS.notes),
        npcs: v => nbText(v, 1000),
        loot: v => nbText(v, 1000),
        threads: v => nbText(v, 2000)
    },
    quest: {
        status: v => (typeof v === 'string' && Object.hasOwn(NB_QUEST_STATUS, v) ? v : 'open'),
        giver: v => nbText(v, 200),
        reward: v => nbText(v, 400)
    },
    // Without homebrew.js on the page the monster passes through untouched, so nothing is lost.
    monster: {
        mon: v => (typeof hbClean === 'function' ? hbClean(v) : v)
    },
    // The same for a family without family-tree.js.
    family: {
        fam: v => (typeof famClean === 'function' ? famClean(v) : v)
    }
};

const nbListeners = [];

function nbEmpty() {
    return { name: '', entries: [] };
}

function nbText(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

// A session number: 1 to 9999, or null.
function nbNum(v) {
    const n = typeof v === 'string' && /^\d{1,4}$/.test(v.trim()) ? Number(v) : v;
    return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : null;
}

// A play date as YYYY-MM-DD, or ''.
function nbDate(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00Z')) ? v : '';
}

// A kind's own fields from untrusted data ({} for kinds without any).
function nbFields(kind, raw) {
    const spec = NB_FIELDS[kind];
    if (!spec) return {};
    const src = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(Object.entries(spec).map(([k, fn]) => [k, fn(Object.hasOwn(src, k) ? src[k] : undefined)]));
}

// Switched line keys (F51): plain strings, each once.
function nbFlips(v) {
    if (!Array.isArray(v)) return [];
    return [...new Set(v.filter(k => typeof k === 'string' && k.length <= NB_LIMITS.flip && !/[\u0000-\u001F\u007F]/.test(k)))].slice(0, NB_LIMITS.flips);
}

// The DM-only notes and switched lines (F51), only when an entry has them.
function nbSecretFields(raw) {
    const dm = nbText(raw.dm, NB_LIMITS.notes), flip = nbFlips(raw.flip);
    return { ...(dm ? { dm } : {}), ...(flip.length ? { flip } : {}) };
}

// Reworded lines: { key: text }, keys like flip's, empty text dropped. {} when there are none.
function nbEdits(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const keys = nbFlips(Object.keys(v)).slice(0, NB_LIMITS.edits);
    return Object.fromEntries(keys.map(k => [k, nbText(v[k], NB_LIMITS.edit)]).filter(([, t]) => t));
}

// The reworded lines, only when an entry has some.
function nbEditField(raw) {
    const edits = nbEdits(raw.edits);
    return Object.keys(edits).length ? { edits } : {};
}

// A link to a tool page, or no link at all for a hand-written kind.
function nbHrefOk(kind, href) {
    return typeof href === 'string' && href.length <= NB_LIMITS.href && (NB_HREF.test(href) || (href === '' && !!NB_KINDS[kind].hand));
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
            && nbHrefOk(e.kind, e.href)
            && nbText(e.title, NB_LIMITS.title)
            && (e.kind !== 'monster' || (typeof hbClean === 'function' ? !!hbClean(e.mon) : !!e.mon))
            && (e.kind !== 'family' || (typeof famClean === 'function' ? !!famClean(e.fam) : !!e.fam))
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
            added: isNaN(added) ? new Date().toISOString() : added.toISOString(),
            ...nbFields(e.kind, e),
            ...nbSecretFields(e),
            ...nbEditField(e),
            ...(NB_PIN_KINDS[e.kind] && Array.isArray(e.pins) && e.pins.length ? { pins: e.pins } : {})
        });
    });
    // Links only to entries that made it, never to itself, each once. Pins and family members open only entries that made it too.
    nb.entries.forEach(e => {
        e.links = [...new Set(e.links)].filter(l => l !== e.id && ids.has(l)).slice(0, NB_LIMITS.links);
        if (e.pins) nbSetPins(e, e.pins, ids);
        if (e.fam && typeof famSetLinks === 'function') famSetLinks(e.fam, ids, e.id);
    });
    return { nb, dropped };
}

// key: another system's notebook (the backup page restores the Pathfinder one too).
function nbLoad(key = NB_KEY) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? nbClean(JSON.parse(raw)).nb : nbEmpty();
    } catch (e) {
        return nbEmpty();
    }
}

// Store the notebook. quiet: skip the listeners (a note being typed). key: as nbLoad.
// Returns false if storage failed.
function nbStore(nb, quiet = false, key = NB_KEY) {
    try {
        localStorage.setItem(key, JSON.stringify(nb));
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

// Where an entry opens: its link, the Monster Maker for a homebrew monster, the Maps tab for your own map,
// or the Families tab for a family started by hand.
function nbOpenHref(e) {
    return e.href || (e.kind === 'monster' ? `monster-maker?nb=${e.id}` : e.kind === 'map' ? `worldbuilder?tab=maps&map=${e.id}`
        : e.kind === 'family' ? `worldbuilder?tab=family&fam=${e.id}` : '');
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
    nb.entries.forEach(e => {
        e.links = e.links.filter(l => l !== id);
        (e.pins || []).forEach(p => { if (p.to === id) p.to = ''; });
        if (e.fam) e.fam.people.forEach(p => { if (p.to === id) p.to = ''; });
    });
}

// ── Map pins (F53) ────────────────────────────────────────
// Put cleaned pins on an entry (ids: the entry ids a pin may open), or take the key off when there are none.
function nbSetPins(e, pins, ids) {
    const clean = typeof pinClean === 'function' ? pinClean(pins, ids).map(p => (p.to === e.id ? { ...p, to: '' } : p)) : pins;
    if (Array.isArray(clean) && clean.length) e.pins = clean;
    else delete e.pins;
}

// The saved entry for a roll (its kind, seed, and the options that change it), or null.
function nbFindRoll(nb, kind, seed, get) {
    const sig = nbSig(kind, seed, get);
    return nb.entries.find(e => e.kind === kind && e.href && nbEntrySig(e) === sig) || null;
}

// Save a roll: { kind, title, sub, href, notes, dm, ...that kind's fields }. Returns { entry, existed, linked }
// or null when the browser won't store it. The same link twice keeps the first entry; a
// hand-written entry (no link) is always new.
function nbAdd(item) {
    const nb = nbLoad();
    const href = String(item.href || '');
    const old = href && nb.entries.find(e => e.href === href);
    if (old) return { entry: old, existed: true, linked: 0 };
    if (!Object.hasOwn(NB_KINDS, item.kind) || !nbHrefOk(item.kind, href)) return null;
    if (nb.entries.length >= NB_LIMITS.entries) return { entry: null, full: true };
    const entry = {
        id: nbNewId(nb),
        kind: item.kind,
        title: nbText(item.title, NB_LIMITS.title) || NB_KINDS[item.kind].label,
        sub: nbText(item.sub, NB_LIMITS.sub),
        href,
        notes: nbText(item.notes, NB_LIMITS.notes),
        links: [],
        added: new Date().toISOString(),
        ...nbFields(item.kind, item),
        ...nbSecretFields({ dm: item.dm })
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
// the one here (and gains the imported notes, DM notes, switched lines, and reworded lines); so does a hand-written entry with the same
// id and kind (the same notebook imported twice). The rest come in under fresh ids.
// Returns { added, merged, full, ids } (ids: each incoming id → its id here, so a map's picture can follow it).
function nbMerge(nb, incoming) {
    const map = {};
    let added = 0, merged = 0, full = 0;
    incoming.entries.forEach(e => {
        const same = nb.entries.find(x => (e.href ? x.href === e.href : !x.href && x.id === e.id && x.kind === e.kind));
        if (same) {
            map[e.id] = same.id;
            if (e.notes && !same.notes.includes(e.notes)) same.notes = nbText(same.notes ? `${same.notes}\n\n${e.notes}` : e.notes, NB_LIMITS.notes);
            if (e.dm && !(same.dm || '').includes(e.dm)) same.dm = nbText(same.dm ? `${same.dm}\n\n${e.dm}` : e.dm, NB_LIMITS.notes);
            if (e.flip) same.flip = nbFlips([...(same.flip || []), ...e.flip]);
            // Reworded lines come along where this copy still has the rolled wording.
            if (e.edits) {
                const edits = nbEdits({ ...e.edits, ...(same.edits || {}) });
                if (Object.keys(edits).length) same.edits = edits;
            }
            // A family keeps whichever copy was edited last.
            if (e.fam && same.fam && (e.fam.edited || '') > (same.fam.edited || '')) { same.fam = e.fam; same.sub = e.sub; }
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
    // Pins come along, opening the same entries under their ids here; a pin already on the entry stays as it is.
    incoming.entries.forEach(e => {
        const into = map[e.id] && nbFind(nb, map[e.id]);
        if (!into || !e.pins || !e.pins.length) return;
        const have = into.pins && into.pins !== e.pins ? into.pins : [];
        const fresh = e.pins.filter(p => !have.some(h => h.id === p.id)).map(p => ({ ...p, to: map[p.to] || '' }));
        nbSetPins(into, [...have, ...fresh], new Set(nb.entries.map(x => x.id)));
    });
    // Family members open the same NPC entries under their ids here.
    const here = new Set(nb.entries.map(x => x.id));
    incoming.entries.forEach(e => {
        const into = map[e.id] && nbFind(nb, map[e.id]);
        if (!into || !into.fam || into.fam !== e.fam) return;
        into.fam = { ...e.fam, people: e.fam.people.map(p => ({ ...p, to: (p.to && map[p.to]) || '' })) };
        if (typeof famSetLinks === 'function') famSetLinks(into.fam, here, into.id);
    });
    if (!nb.name && incoming.name) nb.name = incoming.name;
    return { added, merged, full, ids: map };
}

// ── Sessions and quests (F50) ─────────────────────────────
// Sessions, latest first: by number, then play date, then when they were added.
function nbSessions(nb) {
    return nb.entries.filter(e => e.kind === 'session')
        .sort((a, b) => (b.num || 0) - (a.num || 0) || b.date.localeCompare(a.date) || b.added.localeCompare(a.added));
}

// The session to recap: the latest one with a recap (tonight's blank log is skipped), or null.
function nbLastSession(nb) {
    return nbSessions(nb).find(e => e.recap) || null;
}

function nbNextSessionNum(nb) {
    return Math.min(9999, nb.entries.reduce((n, e) => (e.kind === 'session' && e.num > n ? e.num : n), 0) + 1);
}

// Today in this browser's time zone, as YYYY-MM-DD.
function nbToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Set one of an entry's own fields (cleaned). A session still titled "Session N" follows its new number.
function nbSetField(e, key, value) {
    const spec = NB_FIELDS[e.kind];
    if (!spec || !Object.hasOwn(spec, key)) return;
    const v = spec[key](value);
    if (key === 'num' && v && e.title === `Session ${e.num}`) e.title = `Session ${v}`;
    e[key] = v;
}
