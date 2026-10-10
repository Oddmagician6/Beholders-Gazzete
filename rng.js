/* ============================================
   SEEDED RNG + SHAREABLE LINKS
   Every tool roll calls rand(). Outside withSeed() it is Math.random;
   inside, it is a mulberry32 stream, so the same seed + options gives the same roll.
   Load this before npc-data.js, loot-engine.js, and town-crier.js.
   ============================================ */

let rngSource = Math.random;

function rand() {
    return rngSource();
}

function mulberry32(a) {
    return function () {
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Seeds are 32-bit numbers written in base 36 (up to 7 characters) for short URLs.
function newSeed() {
    return (Math.floor(Math.random() * 4294967296) >>> 0).toString(36);
}

// A valid seed string, or null.
function parseSeed(s) {
    if (typeof s !== 'string' || !/^[0-9a-z]{1,7}$/.test(s)) return null;
    return parseInt(s, 36) <= 0xFFFFFFFF ? s : null;
}

// Run fn with rand() drawing from seed; restores the previous source afterwards.
function withSeed(seed, fn) {
    const prev = rngSource;
    rngSource = mulberry32(parseInt(seed, 36));
    try { return fn(); } finally { rngSource = prev; }
}

// Small stable hash (FNV-1a) for picks that should follow an id, not a seed.
function hashString(s) {
    let h = 0x811C9DC5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return h >>> 0;
}

// A child seed for one part of a roll (e.g. an NPC's "trait"), so parts can be
// kept or rerolled on their own (F14 locks).
function deriveSeed(seed, label) {
    return hashString(seed + '/' + label).toString(36);
}

// ── URL state ─────────────────────────────────────────────
function urlParams() {
    return new URLSearchParams(location.search);
}

// Write params into the address bar. push = new history entry (so Back undoes a reroll).
// An array value repeats the param (?lock=a&lock=b).
function setUrlParams(params, push = true) {
    const pairs = Object.entries(params).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(x => [k, x]));
    const qs = new URLSearchParams(pairs.filter(([, v]) => v !== null && v !== undefined && v !== '')).toString();
    const url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    if (url === location.pathname + location.search + location.hash) return;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
}

// The value a <select> starts with, so defaults can stay out of the URL.
function defaultValue(el) {
    if (el.type === 'checkbox') return el.defaultChecked ? '1' : '0';
    if (el.tagName === 'SELECT') return ([...el.options].find(o => o.defaultSelected) || el.options[0] || {}).value;
    return el.defaultValue;
}

function fieldValue(el) {
    return el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
}

// Set a form field from a URL value; ignores values the field can't hold.
function setFieldValue(el, v) {
    if (v === null || v === undefined) return false;
    if (el.type === 'checkbox') { el.checked = v === '1'; return true; }
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) return false;
    el.value = v;
    return true;
}

function copyPageLink(onDone) {
    navigator.clipboard.writeText(location.href)
        .then(() => onDone(true))
        .catch(() => onDone(false));
}
