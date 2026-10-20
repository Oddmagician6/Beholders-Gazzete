/* ============================================
   BACK UP EVERYTHING (F44), on the Privacy page
   Every tool keeps its saves in this browser's localStorage. Export writes all of them
   to one JSON file: { gazetteBackup: 1, exported, data: { <key>: <value> } }.
   Import only parses JSON. Each key must match the shape its tool saves, and nothing is
   written until the reader ticks what to restore and presses Restore. Unknown keys are
   ignored. Rolled saves (NPCs, hoards, the kit, the shop) are drawn partly unescaped, so
   no text in them may hold < or >; saves of typed text (names, notes) are escaped by
   their tools and may.
   The notebook goes through notebook.js (nbClean, then nbMerge), so it merges into
   the one here, as the notebook's own import does. Everything else is replaced.
   Map pictures (F54) live in IndexedDB, not localStorage (map-store.js). Unless the reader
   unticks them, they go in the file too, as base64 under `maps`:
     maps: [{ id, name, type, w, h, data }]
   which makes the file big, so the page says how big first. On import each picture's first
   bytes must match its type and the browser must decode it before it is stored; it lands
   under the id its notebook entry got here (nbMerge's ids), and a picture with no entry
   here gets one, so it shows up on the Maps tab.
   Needs notebook.js, homebrew.js (hbClean, for homebrew monsters), and map-store.js on the page.
   ============================================ */

const BK_LIMITS = { file: 5000000, depth: 12, items: 5000, keys: 500, text: 20000 };
// A file with map pictures may be bigger by their base64 (4 bytes for every 3).
const BK_FILE_MAX = BK_LIMITS.file + Math.ceil(MAP_LIMITS.backup * 4 / 3);
// Over this, the page warns that the backup file will be big.
const BK_BIG = 20 * 1024 * 1024;

function bkObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function bkN(n, word, words = word + 's') {
    return `${n} ${n === 1 ? word : words}`;
}

// Plain data: JSON types only, no prototype keys, not too deep or big, and (strict) no markup.
function bkSafe(v, strict = true, depth = 0) {
    if (depth > BK_LIMITS.depth) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') return v.length <= BK_LIMITS.text && !(strict && /[<>]/.test(v));
    if (Array.isArray(v)) return v.length <= BK_LIMITS.items && v.every(x => bkSafe(x, strict, depth + 1));
    if (!bkObj(v)) return false;
    const keys = Object.keys(v);
    return keys.length <= BK_LIMITS.keys && keys.every(k => !/[<>]/.test(k) && !['__proto__', 'constructor', 'prototype'].includes(k) && bkSafe(v[k], strict, depth + 1));
}

// A list: keep the items that pass, up to max. Returns { value, dropped }.
function bkItems(v, test, max, strict = true) {
    if (!Array.isArray(v)) throw new Error("isn't a list");
    const value = v.filter(x => test(x) && bkSafe(x, strict)).slice(0, max);
    return { value, dropped: v.length - value.length };
}

// One saved object, all or nothing.
function bkWhole(v, test, strict = true) {
    if (!test(v)) throw new Error("isn't in the shape this tool saves");
    if (!bkSafe(v, strict)) throw new Error('holds text the tool could not show safely');
    return { value: v, dropped: 0 };
}

function bkFlag(v) {
    if (v !== 'on' && v !== 'off') throw new Error('is not on or off');
    return { value: v, dropped: 0 };
}

const bkArrOf = (v, test) => v === undefined || (Array.isArray(v) && v.every(test));

// A saved hoard: the vault draws the magic item's rarity into a class name.
function bkHoard(l) {
    return bkObj(l)
        && bkArrOf(l.magic, m => bkObj(m) && typeof m.name === 'string' && typeof m.rarity === 'string' && /^[a-z][a-z -]{0,19}$/.test(m.rarity))
        && ['gems', 'art', 'goods'].every(k => bkArrOf(l[k], bkObj));
}

// Every key a tool saves. raw: the tool stores a plain string, not JSON.
// count(value) says what's in it; clean(value) returns { value, dropped } or throws why not.
const BACKUP_KEYS = [
    {
        key: 'saved_npcs', tool: '🎭 Town Square', href: 'npc-generator', what: 'Saved NPCs',
        clean: v => bkItems(v, n => bkObj(n) && typeof n.name === 'string', 50),
        count: v => bkN(v.length, 'NPC')
    },
    {
        key: 'gazette_loot', tool: '💎 Vault of Wonders', href: 'loot-generator', what: 'Saved treasure',
        clean: v => bkItems(v, bkHoard, 50),
        count: v => bkN(v.length, 'hoard')
    },
    {
        key: 'gazette-spell-lists', tool: '📖 Spellbook', href: 'spellbook', what: 'Spell lists',
        clean: v => bkWhole(v, b => bkObj(b) && Array.isArray(b.lists) && b.lists.length <= 30
            && b.lists.every(l => bkObj(l) && typeof l.name === 'string' && bkArrOf(l.spells, s => typeof s === 'string')), false),
        count: v => `${bkN(v.lists.length, 'list')}, ${bkN(v.lists.reduce((n, l) => n + (l.spells || []).length, 0), 'spell')}`
    },
    {
        key: 'gazette-characters', tool: '🧝 Character Builder', href: 'character-builder', what: 'Characters',
        // Typed text, escaped by the page; cbClean() trims each character to its shape on load.
        clean: v => bkItems(v, c => bkObj(c) && typeof c.id === 'string' && (c.name === undefined || typeof c.name === 'string'), 30, false),
        count: v => bkN(v.length, 'character')
    },
    {
        key: 'gazette-journals', tool: '📓 Player Journal', href: 'dnd-player-journal', what: 'Journals',
        // Typed text, escaped by the page; jnClean() (player-journal.js) trims each journal to its shape on load.
        clean: v => bkItems(v, j => bkObj(j) && typeof j.id === 'string' && Array.isArray(j.entries) && j.entries.length <= 400
            && j.entries.every(bkObj) && (j.name === undefined || typeof j.name === 'string'), 30, false),
        count: v => `${bkN(v.length, 'journal')}, ${bkN(v.reduce((n, j) => n + j.entries.length, 0), 'entry', 'entries')}`
    },
    {
        key: 'gazette-bestiary-picks', tool: '🐉 Bestiary', href: 'bestiary', what: 'Encounter list',
        // Counts as bestiary.js keeps them: 12 kinds (PICKS_MAX), 1 to 40 of each (PICK_MAX_COUNT).
        clean: v => {
            const r = bkItems(v, p => bkObj(p) && typeof p.id === 'string' && /^[a-z0-9-]{1,60}$/.test(p.id), 12);
            r.value = r.value.map(p => ({ ...p, count: Math.min(40, Math.max(1, Math.round(Number(p.count)) || 1)) }));
            return r;
        },
        count: v => bkN(v.reduce((n, p) => n + p.count, 0), 'monster')
    },
    {
        key: 'gazette-initiative', tool: '🧰 DM Toolbox', href: 'toolbox?tab=init', what: 'Initiative tracker',
        clean: v => bkWhole(v, f => bkObj(f) && Array.isArray(f.list) && f.list.every(c => bkObj(c) && typeof c.name === 'string' && typeof c.id === 'number'), false),
        count: v => v.list.length ? `${bkN(v.list.length, 'combatant')}, round ${Math.max(1, Math.round(Number(v.round)) || 1)}` : 'No fight'
    },
    {
        key: 'gazette-init-follow', raw: true, tool: '🧰 DM Toolbox', href: 'toolbox?tab=init', what: 'Open stat blocks on their turn',
        clean: bkFlag,
        count: v => v === 'off' ? 'Off' : 'On'
    },
    {
        key: 'gazette-clocks', tool: '🧰 DM Toolbox', href: 'toolbox?tab=clocks', what: 'Progress clocks',
        clean: v => bkItems(v, c => bkObj(c) && typeof c.name === 'string', 30, false),
        count: v => bkN(v.length, 'clock')
    },
    {
        key: 'gazette-tables', tool: '🧰 DM Toolbox', href: 'toolbox?tab=tables', what: 'Random tables',
        // Typed text, escaped by the tab; tableClean() trims each table to its shape on load.
        clean: v => bkItems(v, t => bkObj(t) && typeof t.src === 'string' && (t.name === undefined || typeof t.name === 'string'), 50, false),
        count: v => bkN(v.length, 'table')
    },
    {
        key: 'gazette-party', tool: '🧰 DM Toolbox', href: 'toolbox?tab=party', what: 'The party',
        clean: v => bkItems(v, c => bkObj(c) && ['name', 'player', 'cls'].every(k => c[k] === undefined || typeof c[k] === 'string'), 8, false),
        count: v => bkN(v.length, 'character')
    },
    {
        key: 'gazette-downtime', tool: '🧰 DM Toolbox', href: 'toolbox?tab=down', what: 'Downtime party',
        clean: v => bkWhole(v, d => bkObj(d) && Array.isArray(d.chars) && d.chars.length >= 1 && d.chars.length <= 8 && d.chars.every(bkObj), false),
        count: v => bkN(v.chars.length, 'character')
    },
    {
        key: 'gazette-kept-names', tool: '🧰 DM Toolbox', href: 'toolbox', what: 'Kept names',
        clean: v => bkItems(v, k => bkObj(k) && typeof k.name === 'string', 100, false),
        count: v => bkN(v.length, 'name')
    },
    {
        key: 'gazette-dice-history', tool: '🧰 DM Toolbox', href: 'toolbox?tab=dice', what: 'Dice history',
        clean: v => bkItems(v, h => bkObj(h) && typeof h.f === 'string' && typeof h.total === 'number', 50),
        count: v => bkN(v.length, 'roll')
    },
    {
        key: 'gazette-dice-fab', raw: true, tool: '🎲 Dice button', href: 'toolbox?tab=dice', what: 'Floating 🎲 on the tool pages',
        clean: bkFlag,
        count: v => v === 'off' ? 'Hidden' : 'Shown'
    },
    {
        key: 'gazette-session-kit', tool: '🎲 Session Kit', href: 'session-kit', what: 'Current kit',
        clean: v => bkWhole(v, bkObj),
        count: () => '1 kit'
    },
    {
        key: 'gazette-handouts', tool: '📜 Handout Maker', href: 'handouts', what: 'Handouts',
        // Typed text, escaped by the page; handoutClean() trims each handout to its shape on load.
        clean: v => bkWhole(v, h => bkObj(h) && bkObj(h.forms) && Object.keys(h.forms).length <= 4
            && Object.values(h.forms).every(bkObj) && (h.t === undefined || typeof h.t === 'string'), false),
        count: v => bkN(Object.keys(v.forms).length, 'handout')
    },
    {
        key: 'gazette-dm-screen', tool: '🛡️ DM Screen', href: 'dm-screen', what: 'Screen layouts',
        // Typed notes and picks, escaped by the page; dsClean (dm-screen-data.js) trims each layout and card on load.
        clean: v => bkWhole(v, s => bkObj(s) && Array.isArray(s.layouts) && s.layouts.length >= 1 && s.layouts.length <= 12
            && s.layouts.every(l => bkObj(l) && Array.isArray(l.cards) && l.cards.length <= 24 && l.cards.every(c => bkObj(c) && typeof c.type === 'string')), false),
        count: v => `${bkN(v.layouts.length, 'layout')}, ${bkN(v.layouts.reduce((n, l) => n + l.cards.length, 0), 'card')}`
    },
    {
        key: 'gazette-monster-draft', tool: '🐲 Monster Maker', href: 'monster-maker', what: 'The monster being worked on',
        // Typed text, escaped by the page; hbClean (homebrew.js) trims it to a monster's shape.
        clean: v => bkWhole(v, d => bkObj(d) && !!hbClean(d.mon) && (d.prev === undefined || d.prev === null || (bkObj(d.prev) && !!hbClean(d.prev.mon))), false),
        count: v => hbClean(v.mon).name || 'An unnamed monster'
    },
    {
        key: 'gazette-shop', tool: "🏪 Merchant's Row", href: 'shop', what: 'Current shop',
        clean: v => bkWhole(v, s => bkObj(s) && (s.shop === undefined || s.shop === null || bkObj(s.shop))),
        count: v => v.shop && typeof v.shop.name === 'string' ? v.shop.name : 'No shop'
    },
    {
        key: 'gazette-rumor-deck', tool: '🍺 Tavern', href: 'rumors', what: 'Rumor decks (what is left to deal)',
        clean: v => bkWhole(v, s => bkObj(s) && Number.isInteger(s.n) && bkObj(s.decks)
            && Object.values(s.decks).every(d => Array.isArray(d) && d.every(Number.isInteger))),
        count: v => bkN(Object.keys(v.decks).length, 'deck') + ' started'
    },
    {
        key: 'tavern_recent_rumors', tool: '🍺 Tavern', href: 'rumors', what: 'Recently overheard',
        // Reader-added rumors are typed text; the truth goes on the page as it is.
        clean: v => bkItems(v, r => bkObj(r) && typeof r.text === 'string' && (r.truth === null || r.truth === undefined || typeof r.truth === 'number'), 10, false),
        count: v => bkN(v.length, 'rumor')
    },
    {
        key: NB_KEY, tool: '🗺️ Worldbuilder', href: 'worldbuilder?tab=notebook', what: 'Campaign notebook', merge: true,
        clean: v => {
            const r = nbClean(v);
            return { value: r.nb, dropped: r.dropped };
        },
        count: v => (v.name ? `${v.name}: ` : '') + bkN(v.entries.length, 'entry', 'entries')
    },
    {
        key: 'gazette-web', tool: '🗺️ Worldbuilder', href: 'worldbuilder?tab=web', what: 'Where the Web tab puts each entry',
        // Entry ids and numbers only; web-graph.js's webCleanStore trims it again on load.
        clean: v => bkWhole(v, w => bkObj(w) && bkObj(w.pos) && Object.keys(w.pos).length <= 500
            && Object.entries(w.pos).every(([id, p]) => /^[a-z0-9]{1,16}$/.test(id) && Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
            && bkArrOf(w.fixed, id => typeof id === 'string') && bkArrOf(w.loose, id => typeof id === 'string')),
        count: v => bkN(Object.keys(v.pos).length, 'entry', 'entries') + (v.fixed && v.fixed.length ? `, ${v.fixed.length} placed by hand` : '')
    }
];

// The map pictures row (not a localStorage key: they're in IndexedDB).
const BK_MAPS = {
    key: 'maps', maps: true, tool: '🗺️ Worldbuilder', href: 'worldbuilder?tab=maps', what: 'Map pictures',
    count: v => `${bkN(v.length, 'picture')}, ${mapMb(v.reduce((n, m) => n + (m.size || 0), 0))}`
};

// ── Reading this browser ──────────────────────────────────
// What's saved here for one key: { value } (cleaned), { bad: true } (unreadable), or null (nothing).
function bkLocal(k) {
    let text;
    try { text = localStorage.getItem(k.key); } catch (e) { return null; }
    if (text === null) return null;
    try { return { value: k.clean(k.raw ? text : JSON.parse(text)).value, text }; } catch (e) { return { bad: true, text }; }
}

// The map pictures here: [records] (map-store.js), or null until read (or when IndexedDB is off).
let bkMapsHere = null;

function bkLoadMaps() {
    return mapAll().then(recs => { bkMapsHere = recs; }, () => { bkMapsHere = null; });
}

// The pictures a backup takes: as many as fit MAP_LIMITS.backup, oldest first. Returns { take, left, total }.
function bkMapsToSave() {
    const take = [], left = [];
    let total = 0;
    (bkMapsHere || []).slice().sort((a, b) => a.added.localeCompare(b.added)).forEach(r => {
        if (total + r.size <= MAP_LIMITS.backup) { take.push(r); total += r.size; } else left.push(r);
    });
    return { take, left, total };
}

// The backup file as the parts of a Blob (a picture's base64 can run to tens of MB, so the text is
// never joined into one string). withMaps: put the map pictures in. Returns { count, parts, left }.
async function bkExportParts(withMaps) {
    const data = {};
    BACKUP_KEYS.forEach(k => {
        const here = bkLocal(k);
        if (here && !here.bad) data[k.key] = k.raw ? here.text : JSON.parse(here.text);
    });
    const head = JSON.stringify({ gazetteBackup: 1, exported: new Date().toISOString(), data }, null, 2);
    const { take, left } = withMaps ? bkMapsToSave() : { take: [], left: [] };
    if (!take.length) return { count: Object.keys(data).length, parts: [head], left };
    // Each map under the notebook's name for it, when it has one.
    const nb = nbLoad();
    const parts = [head.replace(/\n}$/, ',\n  "maps": [\n')];
    for (let i = 0; i < take.length; i++) {
        const r = take[i], e = nbFind(nb, r.id);
        const meta = JSON.stringify({ id: r.id, name: e && e.kind === 'map' ? e.title : r.name, type: r.type, w: r.w, h: r.h });
        parts.push(`    ${meta.slice(0, -1)}, "data": "`, await mapB64(r.blob), `"}${i < take.length - 1 ? ',' : ''}\n`);
    }
    parts.push('  ]\n}');
    return { count: Object.keys(data).length + 1, parts, left };
}

// ── Reading a file ────────────────────────────────────────
// Returns the plan: one row per known key in the file. Throws a readable Error.
// The map pictures in a file, checked as far as they can be without decoding them. Returns { value, dropped }.
function bkCleanMaps(raw) {
    if (!Array.isArray(raw)) throw new Error("isn't a list");
    const ids = new Set();
    const value = [];
    raw.forEach(m => {
        if (!bkObj(m) || typeof m.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(m.id) || ids.has(m.id)) return;
        if (!Object.hasOwn(MAP_TYPES, m.type) || typeof m.data !== 'string' || mapSniffB64(m.data) !== m.type) return;
        const size = mapB64Bytes(m.data);
        if (size > MAP_LIMITS.bytes || value.length >= MAP_LIMITS.maps) return;
        ids.add(m.id);
        value.push({ id: m.id, name: nbText(m.name, NB_LIMITS.title) || 'My map', type: m.type, size, data: m.data });
    });
    return { value, dropped: raw.length - value.length };
}

function bkParseFile(text) {
    if (typeof text !== 'string' || text.length > BK_FILE_MAX) throw new Error('That file is too big to be a Gazette backup.');
    let raw;
    try { raw = JSON.parse(text); } catch (e) { throw new Error("That file isn't JSON, so it can't be a Gazette backup."); }
    if (raw && Array.isArray(raw.entries)) throw new Error('That is a notebook file. Import it on the Worldbuilder\'s Notebook tab.');
    if (!bkObj(raw) || raw.gazetteBackup !== 1 || !bkObj(raw.data)) throw new Error("That file isn't a Gazette backup.");
    const rows = BACKUP_KEYS.filter(k => Object.hasOwn(raw.data, k.key)).map(k => {
        const here = bkLocal(k);
        try {
            const { value, dropped } = k.clean(raw.data[k.key]);
            const text = k.raw ? value : JSON.stringify(value);
            return { k, value, dropped, here, same: !!here && !here.bad && here.text === text };
        } catch (e) {
            return { k, error: e.message, here };
        }
    });
    if (raw.maps !== undefined) {
        const here = bkMapsHere && bkMapsHere.length ? { value: bkMapsHere } : null;
        try {
            const { value, dropped } = bkCleanMaps(raw.maps);
            if (!value.length && dropped) throw new Error('holds no picture this site can open');
            const same = !!here && value.every(m => bkMapsHere.some(r => r.id === m.id && r.size === m.size && r.type === m.type));
            if (value.length) rows.push({ k: BK_MAPS, value, dropped, here, same });
        } catch (e) {
            rows.push({ k: BK_MAPS, error: e.message, here });
        }
    }
    const ignored = Object.keys(raw.data).filter(key => !BACKUP_KEYS.some(k => k.key === key)).length;
    if (!rows.length) throw new Error('That backup is empty.');
    return { rows, ignored, exported: typeof raw.exported === 'string' ? new Date(raw.exported) : null };
}

// Store map pictures from a backup. ids: the notebook's ids here for the file's entries (nbMerge),
// when the notebook was restored too. Each picture is decoded first; one with no map entry here
// gets one. Returns { put, bad }.
async function bkRestoreMaps(list, ids) {
    let put = 0, bad = 0;
    for (const m of list) {
        try {
            const blob = mapUnB64(m.data, m.type);
            if (!blob) throw new Error('not base64');
            const pic = await mapCheck(blob);
            const nb = nbLoad();
            const id = mapFileEntry(nb, { id: ids[m.id] || m.id, name: m.name, w: pic.w, h: pic.h });
            if (!id || !nbStore(nb)) throw new Error('notebook');
            await mapPut({ id, name: m.name, ...pic });
            put++;
        } catch (e) {
            bad++;
        }
    }
    return { put, bad };
}

// Write the chosen rows, the notebook before the map pictures so they follow its ids.
// Resolves to { done, failed, pics }.
async function bkRestore(rows) {
    let done = 0, failed = 0, ids = {}, pics = null;
    for (const r of rows.slice().sort((a, b) => !!a.k.maps - !!b.k.maps)) {
        try {
            if (r.k.maps) {
                pics = await bkRestoreMaps(r.value, ids);
                if (!pics.put) throw new Error('none stored');
            } else if (r.k.merge) {
                const nb = nbLoad();
                ids = nbMerge(nb, r.value).ids;
                if (!nbStore(nb)) throw new Error('storage');
            } else {
                localStorage.setItem(r.k.key, r.k.raw ? r.value : JSON.stringify(r.value));
            }
            done++;
        } catch (e) {
            failed++;
        }
    }
    return { done, failed, pics };
}

// ── The page ──────────────────────────────────────────────
function bkEsc(text) {
    return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function bkLabel(k) {
    return `<a href="${bkEsc(k.href)}">${bkEsc(k.tool)}</a> <span class="bk-what">${bkEsc(k.what)}</span>`;
}

function bkStatus(text) {
    document.getElementById('bk-status').textContent = text;
}

let bkWithMaps = true;

// The tick box for map pictures, with how big they make the file.
function bkMapsOptHTML() {
    const { take, left, total } = bkMapsToSave();
    if (!take.length) return '';
    const big = total * 4 / 3 > BK_BIG ? `⚠️ They make the backup file about ${mapMb(Math.ceil(total * 4 / 3))}. ` : '';
    const over = left.length ? ` ${bkN(left.length, 'picture')} won't fit in one backup (${mapMb(MAP_LIMITS.backup)} of pictures at most): ${left.map(r => r.name).join(', ')}. Download ${left.length === 1 ? 'it' : 'them'} on the Maps tab to keep a copy.` : '';
    return `<label class="bk-opt"><input type="checkbox" id="bk-maps"${bkWithMaps ? ' checked' : ''}> 🖼️ Put the map pictures in the backup (${bkEsc(mapMb(total))})</label>
        <p class="bk-small">${bkEsc(big)}Untick it for a small file with everything else: each map's name, notes, and pins are in the notebook either way, and you can upload its picture again.${bkEsc(over)}</p>`;
}

function renderBackupSummary() {
    const rows = BACKUP_KEYS.map(k => ({ k, here: bkLocal(k) })).filter(r => r.here);
    if (bkMapsHere && bkMapsHere.length) rows.push({ k: BK_MAPS, here: { value: bkMapsHere } });
    const box = document.getElementById('bk-summary');
    if (!rows.length) {
        box.innerHTML = '<p class="bk-empty">Nothing is saved in this browser yet.</p>';
    } else {
        box.innerHTML = `<p class="bk-head">Saved in this browser now:</p><div class="bk-rows">${rows.map(r => `
            <div class="bk-row"><span>${bkLabel(r.k)}</span><span class="bk-count">${r.here.bad ? '⚠️ unreadable, left out' : bkEsc(r.k.count(r.here.value))}</span></div>`).join('')}</div>${bkMapsOptHTML()}`;
    }
    document.getElementById('bk-export').disabled = !rows.some(r => !r.here.bad);
}

let bkPlan = null;

function renderBackupPlan() {
    const box = document.getElementById('bk-plan');
    if (!bkPlan) { box.hidden = true; box.innerHTML = ''; return; }
    const when = bkPlan.exported && !isNaN(bkPlan.exported) ? ` from ${bkPlan.exported.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}` : '';
    const rows = bkPlan.rows.map((r, i) => {
        if (r.error) return `<div class="bk-row bk-skip"><span>${bkLabel(r.k)}</span><span class="bk-count">⚠️ Skipped: it ${bkEsc(r.error)}.</span></div>`;
        const now = r.here && !r.here.bad ? r.k.count(r.here.value) : '';
        const what = r.same ? 'Same as here'
            : r.k.maps ? `${r.k.count(r.value)}, added to yours${now ? ` (${now} here)` : ''}`
            : r.k.merge && now ? `${r.k.count(r.value)}, merged into yours (${now})`
            : now ? `${r.k.count(r.value)}, replaces ${now}`
            : `${r.k.count(r.value)}, new here`;
        const dropped = r.dropped ? ` (${r.dropped} unreadable left out)` : '';
        return `<label class="bk-row"><span><input type="checkbox" data-i="${i}"${r.same ? '' : ' checked'}> ${bkLabel(r.k)}</span><span class="bk-count">${bkEsc(what + dropped)}</span></label>`;
    }).join('');
    const ignored = bkPlan.ignored ? `<p class="bk-small">${bkN(bkPlan.ignored, 'entry', 'entries')} in the file this site doesn't use ${bkPlan.ignored === 1 ? 'was' : 'were'} ignored.</p>` : '';
    box.innerHTML = `<p class="bk-head">In this backup${bkEsc(when)}. Tick what to restore:</p><div class="bk-rows">${rows}</div>${ignored}
        <p class="bk-small">Restoring replaces what this browser has saved for each ticked tool. The notebook and the map pictures are the exceptions: the file's entries and pictures are added to yours (a picture for a map you already have replaces its picture).</p>
        <div class="bk-actions"><button type="button" class="btn btn-gold" id="bk-restore">✅ Restore</button><button type="button" class="btn" id="bk-cancel">✖ Cancel</button></div>`;
    box.hidden = false;
    updateRestoreButton();
}

function bkTicked() {
    return [...document.querySelectorAll('#bk-plan input[data-i]:checked')].map(b => bkPlan.rows[Number(b.dataset.i)]);
}

function updateRestoreButton() {
    const n = bkTicked().length;
    const btn = document.getElementById('bk-restore');
    btn.disabled = !n;
    btn.textContent = n ? `✅ Restore ${bkN(n, 'item')}` : '✅ Restore';
}

function bkImport(file) {
    if (!file) return;
    if (file.size > BK_FILE_MAX) { bkStatus('⚠️ That file is too big to be a Gazette backup.'); return; }
    if (file.size > BK_BIG) bkStatus('📂 Reading the backup…');
    file.text().then(text => {
        bkPlan = bkParseFile(text);
        bkStatus('');
        renderBackupPlan();
        document.getElementById('bk-plan').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }).catch(err => {
        bkPlan = null;
        renderBackupPlan();
        bkStatus('⚠️ ' + (err && err.message ? err.message : "That file couldn't be read."));
    });
}

function setupBackup() {
    const exp = document.getElementById('bk-export');
    exp.addEventListener('click', async () => {
        if (exp.disabled) return;
        const withMaps = bkWithMaps && !!(bkMapsHere && bkMapsHere.length);
        if (withMaps) { exp.disabled = true; bkStatus('💾 Packing the map pictures…'); }
        let out = null;
        try { out = await bkExportParts(withMaps); } catch (e) { /* a picture couldn't be read */ }
        exp.disabled = false;
        if (!out) { bkStatus("⚠️ A map picture couldn't be read, so nothing was exported. Try again, or untick the pictures."); return; }
        if (!out.count) return;
        const blob = new Blob(out.parts, { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gazette-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        const size = withMaps ? ` (${mapMb(blob.size)})` : '';
        const left = out.left.length ? ` ${bkN(out.left.length, 'map picture')} didn't fit and ${out.left.length === 1 ? 'was' : 'were'} left out.` : '';
        bkStatus(`💾 Exported ${bkN(out.count, 'item')}${size}. Keep the file somewhere safe, or import it in another browser.${left}`);
    });
    document.getElementById('bk-summary').addEventListener('change', e => { if (e.target.id === 'bk-maps') bkWithMaps = e.target.checked; });
    const file = document.getElementById('bk-file');
    document.getElementById('bk-import').addEventListener('click', () => file.click());
    file.addEventListener('change', () => { bkImport(file.files[0]); file.value = ''; });
    const plan = document.getElementById('bk-plan');
    plan.addEventListener('change', e => { if (e.target.matches('input[data-i]')) updateRestoreButton(); });
    plan.addEventListener('click', e => {
        if (e.target.id === 'bk-cancel') { bkPlan = null; renderBackupPlan(); bkStatus('Nothing was changed.'); }
        if (e.target.id !== 'bk-restore' || e.target.disabled) return;
        const rows = bkTicked();
        e.target.disabled = true;
        if (rows.some(r => r.k.maps)) bkStatus('🖼️ Checking and storing the map pictures…');
        bkRestore(rows).then(({ done, failed, pics }) => {
            bkPlan = null;
            renderBackupPlan();
            renderBackupSummary();
            const bad = pics && pics.bad ? ` ${bkN(pics.bad, 'map picture')} couldn't be opened or stored, so ${pics.bad === 1 ? 'it was' : 'they were'} left out.` : '';
            bkStatus((failed ? `⚠️ Restored ${done} of ${done + failed}. This browser wouldn't store the rest (storage may be off or full).`
                : `✅ Restored ${bkN(done, 'item')}. Open the tools to see them.`) + bad);
        });
    });
    // Another tab saved something.
    window.addEventListener('storage', () => renderBackupSummary());
    mapOnChange(() => bkLoadMaps().then(renderBackupSummary));
    renderBackupSummary();
    bkLoadMaps().then(renderBackupSummary);
}

setupBackup();
