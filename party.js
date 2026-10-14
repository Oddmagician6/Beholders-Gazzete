/* ============================================
   THE PARTY (F46)
   The player characters, entered once on the Toolbox's Party tab and kept in
   localStorage PARTY_KEY. Other tools read it for their defaults (Encounter's XP budget,
   Quest and Sites' level and size, Split's size, Downtime's characters, Initiative's
   "Add the Party") and keep their own fields as a manual override.
   A party chip (partyChip) shows "Party: 4 × level 5" beside a tool's own party fields,
   with a button that copies the party into them.
   Needs no other script; the chip escapes its own text.
   ============================================ */

const PARTY_KEY = 'gazette-party';
const PARTY_MAX = 8;
const PARTY_CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

function partyInt(v, lo, hi, def) {
    if (v === '' || v === null || v === undefined) return def;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
}

function partyText(v) {
    return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
}

// A character as stored. Blank AC, HP, and passive Perception stay null.
function cleanPartyMember(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    return {
        id: typeof c.id === 'string' && /^[a-z0-9]{1,16}$/.test(c.id) ? c.id : newPartyId(),
        name: partyText(c.name),
        player: partyText(c.player),
        cls: partyText(c.cls),
        level: partyInt(c.level, 1, 20, 1),
        ac: partyInt(c.ac, 0, 40, null),
        hp: partyInt(c.hp, 1, 999, null),
        pp: partyInt(c.pp, 1, 40, null),
        init: partyInt(c.init, -10, 20, 0)
    };
}

function newPartyId() {
    return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function loadParty() {
    try {
        const saved = JSON.parse(localStorage.getItem(PARTY_KEY));
        if (Array.isArray(saved)) return saved.map(cleanPartyMember).filter(Boolean).slice(0, PARTY_MAX);
    } catch (e) {}
    return [];
}

// Saves and tells the open page (other tabs hear the storage event).
function saveParty(list) {
    try { localStorage.setItem(PARTY_KEY, JSON.stringify(list.slice(0, PARTY_MAX))); } catch (e) {}
    window.dispatchEvent(new Event('gazette-party'));
}

function partyMemberName(c, i) {
    return c.name || c.player || `Character ${i + 1}`;
}

// [{ count, level }], highest level first: the Encounter tab's party groups.
function partyGroups(list) {
    const by = {};
    list.forEach(c => { by[c.level] = (by[c.level] || 0) + 1; });
    return Object.keys(by).map(Number).sort((a, b) => b - a).map(level => ({ count: by[level], level }));
}

// The one level a tool with a single level field should use: the average, rounded.
function partyLevel(list) {
    return list.length ? Math.round(list.reduce((t, c) => t + c.level, 0) / list.length) : 0;
}

// "4 × level 5", "2 × level 5, 1 × level 4", or "6 characters, levels 2–7".
function partyLabel(list) {
    const groups = partyGroups(list);
    if (!groups.length) return '';
    if (groups.length <= 3) return groups.map(g => `${g.count} × level ${g.level}`).join(', ');
    return `${list.length} characters, levels ${groups[groups.length - 1].level}–${groups[0].level}`;
}

// Set a select or number field to v if it can hold it. Returns true when it did.
function partySetField(el, v) {
    if (!el || v === null || v === undefined) return false;
    const s = String(v);
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === s)) return false;
    el.value = s;
    return true;
}

// Level and size selects (Quest, Sites): the party's average level and its size, clamped
// to what the selects offer. Returns true when a party is saved.
function partyFillLevelSize(levelEl, sizeEl) {
    const list = loadParty();
    if (!list.length) return false;
    const max = Math.max(...[...sizeEl.options].map(o => Number(o.value)));
    partySetField(levelEl, partyLevel(list));
    partySetField(sizeEl, Math.min(max, list.length));
    return true;
}

// ── The chip ──────────────────────────────────────────────
// el: an empty element. use: { label, title, act(list) } for the button.
// It redraws itself when the party changes, here or in another tab.
function partyChip(el, use) {
    const e = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const draw = () => {
        const list = loadParty();
        el.classList.add('party-chip');
        el.innerHTML = list.length
            ? `<span class="party-chip-what">👥 Party: <b>${e(partyLabel(list))}</b></span>
               <button type="button" class="party-chip-use"${use.title ? ` title="${e(use.title)}"` : ''}>${e(use.label)}</button>
               <a class="party-chip-edit" href="toolbox?tab=party">Edit</a>`
            : `<span class="party-chip-what">👥 No party saved.</span> <a class="party-chip-edit" href="toolbox?tab=party">Enter your party once</a> <span class="party-chip-why">and the tools will use it.</span>`;
    };
    el.addEventListener('click', ev => {
        if (!ev.target.closest('.party-chip-use')) return;
        const list = loadParty();
        if (list.length) use.act(list);
    });
    window.addEventListener('gazette-party', draw);
    window.addEventListener('storage', ev => { if (ev.key === PARTY_KEY || ev.key === null) draw(); });
    draw();
}
