/* ============================================
   THE PARTY (F46)
   The player characters, entered once on the Toolbox's Party tab and kept in
   localStorage PARTY_KEY. Other tools read it for their defaults (Encounter's XP budget,
   Quest and Sites' level and size, Split's size, Downtime's characters, Initiative's
   "Add the Party") and keep their own fields as a manual override.
   A party chip (partyChip) shows "Party: 4 × level 5" beside a tool's own party fields,
   with a button that copies the party into them.
   Live from the Play Sheet (F68): a character added from the Character Builder keeps the
   character's id, and the Play Sheet pushes its hit points, temporary HP, conditions,
   exhaustion, concentration, and death saves onto it (live) and onto the Initiative
   combatant that came from it (party: id). The other tabs hear it through the 'storage'
   event, so it works on one browser only; a player's phone to the DM's laptop waits for L2.
   Needs no other script; the chip escapes its own text.
   ============================================ */

const PARTY_KEY = ruleKey('gazette-party');
const PARTY_MAX = 8;
const PARTY_FIGHT_KEY = ruleKey('gazette-initiative');   // the Initiative tab's fight (toolbox-table.js INIT_KEY)
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
        init: partyInt(c.init, -10, 20, 0),
        live: cleanPartyLive(c.live)
    };
}

// The Play Sheet's state on a party member; null when it has none. at: when it was pushed.
function cleanPartyLive(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const max = partyInt(v.max, 1, 9999, null);
    if (max === null) return null;
    const ds = Array.isArray(v.ds) ? v.ds : [];
    return {
        hp: partyInt(v.hp, 0, max, max), max, temp: partyInt(v.temp, 0, 9999, 0),
        conds: Array.isArray(v.conds) ? [...new Set(v.conds.filter(x => typeof x === 'string' && /^[A-Z][a-z]{2,15}$/.test(x)))].sort().slice(0, 15) : [],
        exh: partyInt(v.exh, 0, 6, 0), conc: partyText(v.conc), ds: [partyInt(ds[0], 0, 3, 0), partyInt(ds[1], 0, 3, 0)],
        at: partyInt(v.at, 0, 8.64e15, 0)
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

// Saves and tells the open page (other tabs hear the storage event). Returns false when
// the browser refused (storage full or blocked).
function saveParty(list) {
    try { localStorage.setItem(PARTY_KEY, JSON.stringify(list.slice(0, PARTY_MAX))); } catch (e) { return false; }
    window.dispatchEvent(new Event('gazette-party'));
    return true;
}

function partyMemberName(c, i) {
    return c.name || c.player || `Character ${i + 1}`;
}

// ── Live from the Play Sheet (F68) ─────────────────────────
// Copies a member's live state onto an Initiative combatant. Exhaustion joins the conditions
// (its level rides along as exh); the tracker's own conditions are replaced, since the sheet decides.
function partyLiveToCombatant(c, live) {
    c.hp = live.hp;
    c.max = live.max;
    c.temp = live.temp;
    c.conds = [...live.conds, ...(live.exh ? ['Exhaustion'] : [])].sort();
    c.exh = live.exh;
    c.conc = live.conc;
    c.ds = live.ds.slice();
}

// "23 / 31 HP, +5 temp · Poisoned · exhaustion 2 · concentrating on Bless"
function partyLiveText(live) {
    const bits = [`${live.hp} / ${live.max} HP${live.temp ? `, +${live.temp} temp` : ''}`];
    if (!live.hp) bits.push(live.ds[1] >= 3 ? 'dead' : live.ds[0] >= 3 ? 'stable' : `death saves ${live.ds[0]}✓ ${live.ds[1]}✗`);
    bits.push(...live.conds);
    if (live.exh) bits.push(`exhaustion ${live.exh}`);
    if (live.conc) bits.push(`concentrating on ${live.conc}`);
    return bits.join(' · ');
}

// The Play Sheet calls this on every change. Writes only what changed, so the other tabs
// redraw only when there is news. Returns true when the character is in the party, and
// null when it is but the browser wouldn't store the news (storage full or blocked).
function partyPushLive(id, raw) {
    const live = cleanPartyLive(raw);
    const list = loadParty();
    const at = list.findIndex(m => m.id === id);
    if (!live || at < 0) return false;
    const m = list[at];
    const same = (a, b) => !!a && !!b && JSON.stringify({ ...a, at: 0 }) === JSON.stringify({ ...b, at: 0 });
    if (!same(m.live, live)) { m.live = live; if (!saveParty(list)) return null; }
    try {
        const fight = JSON.parse(localStorage.getItem(PARTY_FIGHT_KEY));
        if (!fight || !Array.isArray(fight.list)) return true;
        // A combatant added before F68 has no party id: a player character with the member's name is it.
        // Only when it can't be anyone else: no row follows this character yet, one row has the name,
        // and no other member without a row of their own shares it (two Bobs stay apart).
        const name = partyMemberName(m, at).slice(0, 36).toLowerCase();
        const rows = fight.list.filter(c => c && typeof c === 'object');
        const linked = new Set(rows.map(c => c.party).filter(Boolean));
        const byName = rows.filter(c => c.pc === true && !c.party && typeof c.name === 'string' && c.name.toLowerCase() === name);
        const twin = list.some((o, i) => i !== at && !linked.has(o.id) && partyMemberName(o, i).slice(0, 36).toLowerCase() === name);
        const guess = !linked.has(id) && byName.length === 1 && !twin ? byName[0] : null;
        let changed = false;
        rows.forEach(c => {
            if (c.party !== id && c !== guess) return;
            const before = JSON.stringify(c);
            c.party = id;
            partyLiveToCombatant(c, live);
            if (JSON.stringify(c) !== before) changed = true;
        });
        if (changed) localStorage.setItem(PARTY_FIGHT_KEY, JSON.stringify(fight));
    } catch (e) {
        if (e && e.name === 'QuotaExceededError') return null;
    }
    return true;
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
