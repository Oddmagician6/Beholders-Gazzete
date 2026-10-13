/* ============================================
   MAP IMAGES (F54): your own maps, kept in this browser
   The page-free part of the Worldbuilder's Maps tab. A map is a notebook entry of kind
   'map' (its name, notes, and pins live there, like a continent's) plus its picture,
   which is far too big for localStorage, so it goes in IndexedDB under the entry's id:
     database 'gazette-maps', store 'images': { id, name, type, w, h, size, blob, added }
   A file only gets in as a PNG, JPEG, or WebP: its first bytes must say so (the name and
   the browser's guess don't count), the browser must decode it, and its size and sides
   must fit MAP_LIMITS. The picture is stored as a Blob of the type its bytes showed and
   only ever drawn as an <image> (never read as text, never put in the page as markup).
     mapCheck(blob)           → Promise<{ blob, type, w, h, size }>, or rejects with a readable Error
     mapAll(), mapGet(id), mapPut(rec), mapDelete(id)   the store (each rejects when IndexedDB is off)
     mapOnChange(fn)          fn() after a change here or in another tab
     mapB64(blob), mapUnB64(text, type)   backups (backup.js)
     mapFileEntry(nb, rec)    a notebook entry for an image that has none (needs notebook.js)
   ============================================ */

const MAP_DB = 'gazette-maps';
const MAP_STORE = 'images';
// bytes: one file; side, pixels: one picture; maps: in the notebook; backup: the pictures one backup file holds.
const MAP_LIMITS = { bytes: 25 * 1024 * 1024, side: 16384, pixels: 100000000, maps: 30, backup: 140 * 1024 * 1024 };
const MAP_TYPES = {
    'image/png': { ext: 'png', label: 'PNG', is: b => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A].every((x, i) => b[i] === x) },
    'image/jpeg': { ext: 'jpg', label: 'JPEG', is: b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
    'image/webp': { ext: 'webp', label: 'WebP', is: b => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP' }
};

// The type the first bytes show, or ''.
function mapSniff(bytes) {
    return Object.keys(MAP_TYPES).find(t => bytes.length >= 12 && MAP_TYPES[t].is(bytes)) || '';
}

// A size for people: "640 KB", "3.2 MB", "25 MB".
function mapMb(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    const mb = bytes / (1024 * 1024);
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// The picture's width and height, or null when the browser can't draw it.
async function mapDecodeSize(blob) {
    if (typeof createImageBitmap === 'function') {
        try {
            const bmp = await createImageBitmap(blob);
            const size = { w: bmp.width, h: bmp.height };
            bmp.close();
            return size;
        } catch (e) { /* try an <img>: some browsers can't make a bitmap from every file they can show */ }
    }
    const url = URL.createObjectURL(blob);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return { w: img.naturalWidth, h: img.naturalHeight };
    } catch (e) {
        return null;
    } finally {
        URL.revokeObjectURL(url);
    }
}

// Check a picture's bytes: { blob, type, w, h, size }, or a readable Error.
async function mapCheck(blob) {
    if (!(blob instanceof Blob) || !blob.size) throw new Error("That file is empty.");
    if (blob.size > MAP_LIMITS.bytes) throw new Error(`That picture is ${mapMb(blob.size)}. A map can be ${mapMb(MAP_LIMITS.bytes)} at most: export it smaller, or as a JPEG or WebP.`);
    const type = mapSniff(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
    if (!type) throw new Error("That isn't a PNG, JPEG, or WebP picture, so it can't be a map here.");
    const clean = new Blob([blob], { type });
    const size = await mapDecodeSize(clean);
    if (!size || !size.w || !size.h) throw new Error("This browser couldn't open that picture. It may be damaged.");
    if (size.w > MAP_LIMITS.side || size.h > MAP_LIMITS.side || size.w * size.h > MAP_LIMITS.pixels) {
        throw new Error(`That picture is ${size.w.toLocaleString('en-US')} × ${size.h.toLocaleString('en-US')} pixels, too big to pan and zoom smoothly. Export it at up to ${MAP_LIMITS.side.toLocaleString('en-US')} pixels a side and 100 million pixels in all.`);
    }
    return { blob: clean, type, w: size.w, h: size.h, size: clean.size };
}

// A map's name from its file name: "dragon_coast-v3.png" → "Dragon coast v3".
function mapNameFromFile(name) {
    const base = String(name || '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_-]+/g, ' ');
    const text = nbText(base, NB_LIMITS.title).replace(/\s+/g, ' ');
    return text ? text[0].toUpperCase() + text.slice(1) : 'My map';
}

// ── The store ─────────────────────────────────────────────
let mapDbOpen = null;

function mapDb() {
    if (!mapDbOpen) {
        mapDbOpen = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB')); return; }
            let req;
            try { req = indexedDB.open(MAP_DB, 1); } catch (e) { reject(e); return; }
            req.onupgradeneeded = () => { req.result.createObjectStore(MAP_STORE, { keyPath: 'id' }); };
            req.onsuccess = () => {
                const db = req.result;
                // Another tab upgrading the database: step aside.
                db.onversionchange = () => { db.close(); mapDbOpen = null; };
                resolve(db);
            };
            req.onerror = () => reject(req.error || new Error('IndexedDB is off'));
            req.onblocked = () => reject(new Error('IndexedDB is busy'));
        });
        mapDbOpen.catch(() => { mapDbOpen = null; });
    }
    return mapDbOpen;
}

// Run one request on the store and resolve to its result once the transaction is done.
async function mapTx(mode, fn) {
    const db = await mapDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(MAP_STORE, mode);
        const req = fn(tx.objectStore(MAP_STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error || new Error('IndexedDB failed'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB stopped'));
    });
}

// A stored record as this page expects it, or null.
function mapRecClean(r) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(r.id)) return null;
    if (!Object.hasOwn(MAP_TYPES, r.type) || !(r.blob instanceof Blob)) return null;
    const side = v => (Number.isInteger(v) && v > 0 && v <= MAP_LIMITS.side ? v : 0);
    const w = side(r.w), h = side(r.h);
    if (!w || !h) return null;
    return { id: r.id, name: nbText(r.name, NB_LIMITS.title) || 'My map', type: r.type, w, h, size: r.blob.size, blob: r.blob, added: typeof r.added === 'string' ? r.added : '' };
}

async function mapAll() {
    return ((await mapTx('readonly', s => s.getAll())) || []).map(mapRecClean).filter(Boolean);
}

async function mapGet(id) {
    return mapRecClean(await mapTx('readonly', s => s.get(id)));
}

async function mapPut(rec) {
    await mapTx('readwrite', s => s.put({ id: rec.id, name: rec.name, type: rec.type, w: rec.w, h: rec.h, size: rec.blob.size, blob: rec.blob, added: rec.added || new Date().toISOString() }));
    mapNotify();
}

async function mapDelete(id) {
    await mapTx('readwrite', s => s.delete(id));
    mapNotify();
}

// ── Changes, here and in other tabs ───────────────────────
const mapListeners = [];
let mapChannel = null;
try { mapChannel = new BroadcastChannel(MAP_DB); } catch (e) { /* no other tabs to tell */ }
if (mapChannel) mapChannel.onmessage = () => mapListeners.forEach(fn => fn());

function mapNotify() {
    mapListeners.forEach(fn => fn());
    if (mapChannel) mapChannel.postMessage('changed');
}

function mapOnChange(fn) {
    mapListeners.push(fn);
}

// ── Backups ───────────────────────────────────────────────
// A picture as base64 (no data: prefix).
function mapB64(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
    });
}

// base64 → a Blob of the type, or null when the text isn't base64.
function mapUnB64(text, type) {
    if (typeof text !== 'string' || text.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
    let bin;
    try { bin = atob(text); } catch (e) { return null; }
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
}

// The type the start of a base64 picture shows ('' if none), without decoding the rest.
function mapSniffB64(text) {
    try {
        const bin = atob(String(text).slice(0, 24));
        return mapSniff(Uint8Array.from(bin, c => c.charCodeAt(0)));
    } catch (e) {
        return '';
    }
}

// The decoded size of base64 text, in bytes.
function mapB64Bytes(text) {
    return Math.floor(text.length * 3 / 4) - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0);
}

// ── The notebook side (needs notebook.js) ─────────────────
function mapSub(w, h) {
    return `Your own map, ${w.toLocaleString('en-US')} × ${h.toLocaleString('en-US')} pixels.`;
}

// File a notebook entry for a stored picture that has none, under the picture's id when it's free.
// Returns the entry's id (a new one if the picture's id was taken), or '' when the notebook is full.
function mapFileEntry(nb, rec) {
    const have = nbFind(nb, rec.id);
    if (have && have.kind === 'map') return have.id;
    if (nb.entries.length >= NB_LIMITS.entries) return '';
    const id = have ? nbNewId(nb) : rec.id;
    nb.entries.push({ id, kind: 'map', title: nbText(rec.name, NB_LIMITS.title) || 'My map', sub: mapSub(rec.w, rec.h), href: '', notes: '', links: [], added: new Date().toISOString() });
    return id;
}
