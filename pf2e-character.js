/* ============================================
   PATHFINDER CHARACTER RULES (ROADMAP L3 P5.2)
   A Pathfinder 2e character from Player Core 1 and 2 (pf2e-character-data.js) and
   the numbers it adds up to: attribute modifiers from the four boost sets, proficiency
   ranks by level, Hit Points, AC, saves, Perception, skills, class DC, Strikes, spell
   slots, and the feat slots still to fill. Feats are picked, not applied: their effects
   stay text on the sheet. No page code here; pathfinder-builder.js draws it.
   Characters live in localStorage PC_KEY, newest edit first, in the shape pcClean keeps.
   race and cls hold the ancestry and class ids under the same names the 5e builder uses,
   so tools that list builder characters (the journal) read both.
   ============================================ */

const PC_KEY = 'gazette-characters-pf2e';
const PC_MAX = 30;
const PC_ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const PC_ABIL_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const PC_SKILLS = {
    acrobatics: 'dex', arcana: 'int', athletics: 'str', crafting: 'int', deception: 'cha', diplomacy: 'cha',
    intimidation: 'cha', medicine: 'wis', nature: 'wis', occultism: 'int', performance: 'cha', religion: 'wis',
    society: 'int', stealth: 'dex', survival: 'wis', thievery: 'dex'
};
const PC_RANKS = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'];
const PC_RANK_LETTER = ['U', 'T', 'E', 'M', 'L'];
const PC_BOOST_LEVELS = [5, 10, 15, 20];
const PC_SAVES = { fort: ['Fortitude', 'con'], ref: ['Reflex', 'dex'], will: ['Will', 'wis'] };
const PC_SIZES = { tiny: 'Tiny', sm: 'Small', med: 'Medium', lg: 'Large' };
// Versatile heritages that open a second ancestry's feats (Player Core: aiuvarin, dromaar).
const PC_EXTRA_FEATS = { aiuvarin: 'elf', dromaar: 'orc' };
// Heritages that change the sheet's numbers (Player Core 1 and 2): hp ancestry Hit Points instead of the
// ancestry's, sz size, sk trained skills (one already trained gives a free pick instead), ft feats granted.
const PC_HERITAGE = {
    'dragonscaled-kobold': { hp: 10 }, 'great-kholo': { hp: 10 }, 'root-leshy': { hp: 10 }, 'thickskin-tripkee': { hp: 8 },
    'unbreakable-goblin': { hp: 10 }, 'hold-scarred-orc': { hp: 12, ft: ['Diehard'] },
    'ant-kholo': { sz: 'sm', sk: ['deception'] }, 'sweetbreath-kholo': { sk: ['diplomacy'] },
    'battle-ready-orc': { sk: ['intimidation'], ft: ['Intimidating Glare'] }, 'winter-orc': { sk: ['survival'] },
    'nine-lives-catfolk': { ft: ['Diehard'] }, 'runtboss-hobgoblin': { ft: ['Group Coercion'] },
    'shortshanks-hobgoblin': { ft: ['Ride'] }, 'tunnel-rat': { ft: ['Quick Squeeze'] },
    'cliffscale-lizardfolk': { ft: ['Combat Climber'] }, 'deep-orc': { ft: ['Terrain Expertise', 'Combat Climber'] },
    'woodstalker-lizardfolk': { ft: ['Terrain Stalker'] }
};
// The character's heritage's changes ({} for none, or a heritage that doesn't fit the ancestry).
function pcHeritageFx(c) {
    const { her } = pcParts(c);
    return (her && PC_HERITAGE[c.her]) || {};
}
// Ancestry Hit Points and size, after the heritage.
function pcAncHp(c) {
    const { anc } = pcParts(c);
    return anc ? pcHeritageFx(c).hp || anc.hp : 0;
}
function pcSize(c) {
    const { anc } = pcParts(c);
    return anc ? pcHeritageFx(c).sz || anc.sz : '';
}
// Casters whose spells use another attribute than their key one.
const PC_SPELL_ATTR = { champion: 'cha' };
// The cleric's deity's favored weapon: rank by level for each doctrine.
const PC_FAVORED = { 'cloistered-cleric': { 1: 1, 11: 2 }, warpriest: { 1: 1, 7: 2, 19: 3 } };
// Fighter Weapon Mastery (5th) and Weapon Legend (13th): a weapon group of the player's choice each (c.wg),
// with [simple, martial and unarmed rank, advanced rank] in it. Weapon Legend's is the 5th-level group unless changed.
const PC_WEAPON_GROUPS = ['axe', 'bomb', 'bow', 'brawling', 'club', 'crossbow', 'dart', 'flail', 'hammer', 'knife', 'pick', 'polearm', 'shield', 'sling', 'spear', 'sword'];
const PC_FIGHTER_GROUP = { 5: [3, 2], 13: [4, 3] };
// Archetype dedications that raise a skill (Player Core 2): the skill and its rank from a level on (0 = the feat's own).
const PC_DED_SKILL = { 'acrobat-dedication': ['acrobatics', { 0: 2, 7: 3, 15: 4 }], 'medic-dedication': ['medicine', { 0: 2 }] };
// The swashbuckler's Stylish Tricks levels: a skill feat for Acrobatics or the style's skill, and one more skill
// increase for those (saved as c.skills.inc['3s']).
const PC_STYLISH = [3, 7, 15];
const PC_DIVINE_FONTS = { heal: 'Healing font (heal)', harm: 'Harmful font (harm)' };
// A deity adds spells to its clerics' list (Player Core lists three: a 1st-rank one and two higher).
// Only the cleric class gets them; the Cleric Dedication says it gains nothing else from the deity.
const PC_DEITY_SPELLS = 3;
const PC_TRADITIONS = ['arcane', 'divine', 'occult', 'primal'];
// The elemental bloodline's influences (c.sub holds the one picked, as a tradition for the others).
const PC_ELEMENTS = ['air', 'earth', 'fire', 'metal', 'water', 'wood'];
// A patron whose familiar learns one spell of a pair (c.sub holds the spell key picked).
const PC_FAM_CHOICE = { 'wilding-steward': ['summon-animal', 'summon-plant-or-fungus'] };
const PC_FAM_NAMES = { 'summon-animal': 'Summon Animal', 'summon-plant-or-fungus': 'Summon Plant or Fungus' };
function pcSubOk(v) { return PC_TRADITIONS.includes(v) || PC_ELEMENTS.includes(v) || Object.values(PC_FAM_CHOICE).some(l => l.includes(v)); }
// The level-19 features that give one 10th-rank slot.
// Level-20 class feats that add a second 10th-rank slot (Player Core / Player Core 2).
const PC_TENTH_MORE = ['archwizard-s-might', 'bloodline-perfection', 'hierophant-s-power', 'maker-of-miracles', 'oracular-providence', 'perfect-encore'];
const PC_TENTH = ['Archwizard\'s Spellcraft', 'Miraculous Spell', 'Primal Hierophant', 'Patron\'s Gift', 'Magnum Opus', 'Bloodline Paragon', 'Oracular Clarity'];

const pcCap = s => String(s).replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const pcSign = n => (n >= 0 ? '+' : '−') + Math.abs(n);

function pcNewId() {
    return (Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36)).slice(-16);
}

function pcBlank() {
    return {
        id: pcNewId(), name: '', player: '', level: 1, race: '', her: '', bg: '', cls: '', ch: '', ch2: '', sub: '',
        boosts: { anc: [], ancFree: false, bg: [], key: '', l1: [], 5: [], 10: [], 15: [], 20: [] },
        skills: { cls: [], ch: '', inc: {}, lore: [] }, bgc: { sk: '', lo: '' }, paths: {}, wg: {}, feats: {}, langs: [],
        deity: { name: '', weapon: '', font: '', skill: '' },
        fa: false, mc: {}, gear: { armor: '', arPot: 0, shield: '', weapons: [] }, notes: '', spells: pcBlankSpells(), play: pcBlankPlay(), updated: Date.now()
    };
}

// The Play Sheet's session state (pf2e-play.js): hp (null = full), temp, cond the conditions as the
// Initiative tracker writes them ("Frightened 2", "Prone"), hero points, focus points spent, slots
// spent by rank (spontaneous), cast prepared slots by rank (their indexes), font slots spent, and
// counters of the player's own (an alchemist's reagents and such) with what's used of each,
// persistent damage (pd), coins, the inventory beyond the builder's gear (inv), and a spellcasting
// archetype's slots spent and prepared slots cast, by class (mc: { wizard: { slots, cast } }),
// and who has used Treat Wounds on you in the last hour (tw: 'me', 'friend').
function pcBlankPlay() {
    return { hp: null, temp: 0, cond: [], hero: 1, focus: 0, slots: {}, cast: {}, font: 0, res: [], pd: [], coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, inv: [], mc: {}, tw: [] };
}

// The Spell Planner's picks (spell keys of pf2e-spells-data.js): ct cantrips, rep a repertoire by rank,
// book a wizard's spellbook or a witch's familiar, prep each rank's slots (a slot can be ''), sig a
// signature spell by rank, focus focus spells added by hand, fav favorites, mc a spellcasting
// archetype's own picks by class (ct, rep, book, prep), dy a cleric's deity's spells.
function pcBlankSpells() {
    return { ct: [], rep: {}, book: [], prep: {}, sig: {}, focus: [], fav: [], mc: {}, dy: [] };
}

// ── Cleaning (saves and imports keep only these fields, as plain values) ─
function pcStr(v, max = 60) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : ''; }
function pcId(v, table) { return typeof v === 'string' && Object.hasOwn(table, v) ? v : ''; }
function pcAbilList(v, n) { return Array.isArray(v) ? v.slice(0, n).map(a => (PC_ABILS.includes(a) ? a : '')) : []; }

function pcClean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const c = pcBlank();
    if (typeof raw.id === 'string' && /^[a-z0-9]{1,16}$/.test(raw.id)) c.id = raw.id;
    c.name = pcStr(raw.name, 80);
    c.player = pcStr(raw.player, 60);
    c.level = Math.min(20, Math.max(1, Math.round(Number(raw.level)) || 1));
    c.race = pcId(raw.race, PF2E_ANCESTRIES);
    c.her = pcId(raw.her, PF2E_HERITAGES);
    c.bg = pcId(raw.bg, PF2E_BACKGROUNDS);
    c.cls = pcId(raw.cls, PF2E_CLASSES);
    c.ch = pcId(raw.ch, PF2E_CHOICES);
    c.ch2 = pcId(raw.ch2, PF2E_CHOICES);
    c.sub = pcSubOk(raw.sub) ? raw.sub : '';
    const b = raw.boosts && typeof raw.boosts === 'object' ? raw.boosts : {};
    c.boosts.anc = pcAbilList(b.anc, 4);
    c.boosts.ancFree = b.ancFree === true;
    c.boosts.bg = pcAbilList(b.bg, 3);   // Amnesiac has three
    c.boosts.key = PC_ABILS.includes(b.key) ? b.key : '';
    c.boosts.l1 = pcAbilList(b.l1, 4);
    PC_BOOST_LEVELS.forEach(l => { c.boosts[l] = pcAbilList(b[l], 4); });
    const s = raw.skills && typeof raw.skills === 'object' ? raw.skills : {};
    c.skills.cls = Array.isArray(s.cls) ? [...new Set(s.cls.filter(k => pcId(k, PC_SKILLS)))].slice(0, 24) : [];
    c.skills.ch = pcId(s.ch, PC_SKILLS);
    if (s.inc && typeof s.inc === 'object') {
        for (const [lv, k] of Object.entries(s.inc)) if (/^\d{1,2}s?$/.test(lv) && (pcId(k, PC_SKILLS) || (typeof k === 'string' && /^lore:/.test(k)))) c.skills.inc[lv] = pcStr(k, 50);
    }
    c.skills.lore = Array.isArray(s.lore) ? s.lore.map(x => pcStr(x, 40)).filter(Boolean).slice(0, 6) : [];
    const bc = raw.bgc && typeof raw.bgc === 'object' ? raw.bgc : {};
    c.bgc = { sk: pcId(bc.sk, PC_SKILLS), lo: pcStr(bc.lo, 40) };
    if (raw.paths && typeof raw.paths === 'object') {
        for (const [lv, k] of Object.entries(raw.paths)) if (/^\d{1,2}$/.test(lv) && pcId(k, PC_SAVES)) c.paths[lv] = k;
    }
    if (raw.wg && typeof raw.wg === 'object') {
        for (const lv of Object.keys(PC_FIGHTER_GROUP)) if (PC_WEAPON_GROUPS.includes(raw.wg[lv])) c.wg[lv] = raw.wg[lv];
    }
    if (raw.feats && typeof raw.feats === 'object') {
        for (const [slot, f] of Object.entries(raw.feats)) if (/^[a-z]{2,4}\d{1,2}$/.test(slot) && pcId(f, PF2E_FEATS)) c.feats[slot] = f;
    }
    c.langs = Array.isArray(raw.langs) ? raw.langs.map(x => pcStr(x, 30)).filter(Boolean).slice(0, 12) : [];
    const d = raw.deity && typeof raw.deity === 'object' ? raw.deity : {};
    c.deity = { name: pcStr(d.name, 60), weapon: pcId(d.weapon, PF2E_ITEMS), font: pcId(d.font, PC_DIVINE_FONTS), skill: pcId(d.skill, PC_SKILLS) };
    const g = raw.gear && typeof raw.gear === 'object' ? raw.gear : {};
    const rune = v => Math.min(3, Math.max(0, Math.round(Number(v)) || 0));
    c.gear = {
        armor: pcId(g.armor, PF2E_ITEMS), arPot: rune(g.arPot), shield: pcId(g.shield, PF2E_ITEMS),
        weapons: Array.isArray(g.weapons) ? g.weapons.filter(w => w && pcId(w.id, PF2E_ITEMS)).slice(0, 8)
            .map(w => ({ id: w.id, pot: rune(w.pot), str: rune(w.str) })) : []
    };
    c.fa = raw.fa === true;
    // Multiclass dedication picks: the class choice, a tradition, skills ('' keeps a pick's place).
    if (raw.mc && typeof raw.mc === 'object' && !Array.isArray(raw.mc)) {
        Object.entries(raw.mc).forEach(([cls, x]) => {
            if (!Object.hasOwn(PC_MC, cls) || !x || typeof x !== 'object') return;
            c.mc[cls] = { ch: PF2E_CHOICES[x.ch] && PF2E_CHOICES[x.ch].c === cls ? x.ch : '', tr: PC_TRADITIONS.includes(x.tr) ? x.tr : '',
                sk: Array.isArray(x.sk) ? x.sk.slice(0, 4).map(k => pcId(k, PC_SKILLS)) : [] };
        });
    }
    c.notes = typeof raw.notes === 'string' ? raw.notes.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').slice(0, 4000) : '';   // line breaks stay
    c.spells = pcCleanSpells(raw.spells);
    c.play = pcCleanPlay(raw.play);
    c.updated = Number.isFinite(raw.updated) ? raw.updated : Date.now();
    return c;
}

// A spell key. Pages without pf2e-spells-data.js (the builder) keep any well-formed key.
function pcSpellOk(k) {
    return typeof k === 'string' && k.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(k)
        && (typeof PF2E_SPELLS === 'undefined' || Object.hasOwn(PF2E_SPELLS, k));
}

function pcCleanSpells(raw, arc = false) {
    const s = pcBlankSpells();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
    const keys = (v, n) => (Array.isArray(v) ? [...new Set(v.filter(pcSpellOk))].slice(0, n) : []);
    const ranks = (v, fn) => {
        const out = {};
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const [r, x] of Object.entries(v)) if (/^([1-9]|10)$/.test(r)) { const y = fn(x); if (y.length) out[r] = y; }
        }
        return out;
    };
    s.ct = keys(raw.ct, 12);
    s.rep = ranks(raw.rep, x => keys(x, 12));
    s.book = keys(raw.book, 160);
    s.prep = ranks(raw.prep, x => (Array.isArray(x) ? x.slice(0, 12).map(k => (pcSpellOk(k) ? k : '')) : []));
    if (raw.sig && typeof raw.sig === 'object') {
        for (const [r, k] of Object.entries(raw.sig)) if (/^[1-9]$/.test(r) && pcSpellOk(k)) s.sig[r] = k;
    }
    s.focus = keys(raw.focus, 12);
    s.fav = keys(raw.fav, 80);
    s.dy = keys(raw.dy, PC_DEITY_SPELLS);
    if (arc) { delete s.mc; return s; }
    if (raw.mc && typeof raw.mc === 'object' && !Array.isArray(raw.mc)) {
        Object.entries(raw.mc).forEach(([cls, x]) => {
            if (!Object.hasOwn(PC_MC, cls) || !PC_MC[cls].cast) return;
            const a = pcCleanSpells(x, true);
            s.mc[cls] = { ct: a.ct, rep: a.rep, book: a.book, prep: a.prep };
        });
    }
    return s;
}

// Conditions are checked against PF2E_CONDITIONS (rules-pf2e.js) and keep their values in range.
function pcCleanPlay(raw) {
    const p = pcBlankPlay();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p;
    // Numbers and number strings only: anything else (an object that won't become a number) is the default.
    const int = (v, lo, hi, def) => { const n = typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Math.round(Number(v)) : NaN; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
    p.hp = raw.hp === null ? null : int(raw.hp, 0, 9999, null);
    p.temp = int(raw.temp, 0, 9999, 0);
    if (Array.isArray(raw.cond)) {
        const seen = new Set();
        raw.cond.forEach(x => {
            const m = typeof x === 'string' && /^([A-Z][A-Za-z-]{2,15})(?: (\d))?$/.exec(x);
            if (!m || seen.has(m[1])) return;
            const def = typeof PF2E_CONDITIONS === 'undefined' ? { max: m[2] ? 9 : 0 } : PF2E_CONDITIONS[m[1]];
            if (!def) return;
            const v = def.max ? int(m[2], 1, def.max, 0) : 0;
            if (def.max && !v) return;
            seen.add(m[1]);
            p.cond.push(def.max ? `${m[1]} ${v}` : m[1]);
        });
        p.cond.sort();
    }
    p.hero = int(raw.hero, 0, 3, 1);
    p.focus = int(raw.focus, 0, 3, 0);
    const ranks = (v, fn) => {
        const out = {};
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const [r, x] of Object.entries(v)) if (/^([1-9]|10)$/.test(r)) { const y = fn(x); if (y !== null) out[r] = y; }
        }
        return out;
    };
    const slots = v => ranks(v, x => int(x, 1, 12, null));
    const cast = v => {
        const out = ranks(v, x => (Array.isArray(x) ? [...new Set(x.map(i => int(i, 0, 11, null)).filter(i => i !== null))].sort((a, b) => a - b) : null));
        Object.keys(out).forEach(r => { if (!out[r].length) delete out[r]; });
        return out;
    };
    p.slots = slots(raw.slots);
    p.cast = cast(raw.cast);
    if (raw.mc && typeof raw.mc === 'object' && !Array.isArray(raw.mc)) {
        Object.entries(raw.mc).forEach(([cls, x]) => {
            if (!Object.hasOwn(PC_MC, cls) || !PC_MC[cls].cast || !x || typeof x !== 'object') return;
            const m = { slots: slots(x.slots), cast: cast(x.cast) };
            if (Object.keys(m.slots).length || Object.keys(m.cast).length) p.mc[cls] = m;
        });
    }
    p.font = int(raw.font, 0, 6, 0);
    p.res = Array.isArray(raw.res) ? raw.res.filter(r => r && typeof r === 'object' && pcStr(r.n, 40).trim()).slice(0, 12).map(r => {
        const max = int(r.max, 1, 99, 1);
        return { n: pcStr(r.n, 40).trim(), max, used: int(r.used, 0, max, 0), day: r.day !== false };
    }) : [];
    // Persistent damage, coins, and items (the PP_ lists are pf2e-play.js's; pages without it keep what reads right).
    const pdTypes = typeof PP_PD_TYPES === 'undefined' ? null : PP_PD_TYPES;
    const seenPd = new Set();
    p.pd = Array.isArray(raw.pd) ? raw.pd.filter(x => x && typeof x.f === 'string' && /^([1-9]\d?d(?:[2-9]|[1-9]\d{1,2})|\d{1,3})([+-]\d{1,3})?$/.test(x.f)
        && typeof x.type === 'string' && /^[a-z]{3,12}$/.test(x.type) && (!pdTypes || pdTypes.includes(x.type)) && !seenPd.has(x.type) && seenPd.add(x.type))
        .slice(0, 6).map(x => ({ f: x.f, type: x.type })) : [];
    const coins = raw.coins && typeof raw.coins === 'object' ? raw.coins : {};
    ['pp', 'gp', 'sp', 'cp'].forEach(k => { p.coins[k] = int(coins[k], 0, 999999, 0); });
    p.inv = Array.isArray(raw.inv) ? raw.inv.filter(x => x && typeof x === 'object' && pcStr(x.n, 40).trim()).slice(0, 40).map(x => ({
        n: pcStr(x.n, 40).trim(), q: int(x.q, 1, 999, 1), bu: /^(—|L|\d{1,2})$/.test(x.bu) ? x.bu : '—',
        ...(int(x.pe, 1, 99, 1) > 1 ? { pe: int(x.pe, 1, 99, 1) } : {})   // Bulk per that many (arrows: L per 10). B928
    })) : [];
    p.tw = Array.isArray(raw.tw) ? ['friend', 'me'].filter(k => raw.tw.includes(k)) : [];
    // A Heroic Recovery still open from the last blow (pathfinder-sheet.js), so a reload keeps the choice.
    if (raw.heroic === true) p.heroic = true;
    return p;
}

function pcLoadAll() {
    try {
        const saved = JSON.parse(localStorage.getItem(PC_KEY));
        // One record that won't clean is dropped on its own, not the whole list (the next save would write that).
        if (Array.isArray(saved)) return saved.map(x => { try { return pcClean(x); } catch (e) { return null; } }).filter(Boolean).slice(0, PC_MAX);
    } catch (e) {}
    return [];
}

// The stored list as it is: a record this page can't clean (a damaged one) is kept, not written away.
function pcRawAll() {
    try { const saved = JSON.parse(localStorage.getItem(PC_KEY)); return Array.isArray(saved) ? saved : []; } catch (e) { return []; }
}

function pcSave(c) {
    c.updated = Date.now();
    const raw = [c, ...pcRawAll().filter(x => !x || typeof x !== 'object' || x.id !== c.id)].slice(0, PC_MAX);
    try { localStorage.setItem(PC_KEY, JSON.stringify(raw)); } catch (e) { return null; }
    return pcLoadAll();
}

function pcDelete(id) {
    const raw = pcRawAll().filter(x => !x || typeof x !== 'object' || x.id !== id);
    try { localStorage.setItem(PC_KEY, JSON.stringify(raw)); } catch (e) {}
    return pcLoadAll();
}

// ── What the character is made of ────────────────────────
function pcParts(c) {
    const cls = PF2E_CLASSES[c.cls] || null;
    const fits = (id, tag) => Object.hasOwn(PF2E_CHOICES, id || '') && cls && PF2E_CHOICES[id].c === c.cls && (!tag || PF2E_CHOICES[id].t === tag[0]);
    const ch = fits(c.ch, cls && cls.ch) ? PF2E_CHOICES[c.ch] : null;
    const ch2 = fits(c.ch2, cls && cls.ch2) ? PF2E_CHOICES[c.ch2] : null;
    const her = PF2E_HERITAGES[c.her] && (!PF2E_HERITAGES[c.her].a || PF2E_HERITAGES[c.her].a === c.race) ? PF2E_HERITAGES[c.her] : null;
    return { anc: PF2E_ANCESTRIES[c.race] || null, her, bg: PF2E_BACKGROUNDS[c.bg] || null, cls, ch, ch2 };
}

// The key attribute's options: the class's, or a racket's own on top.
function pcKeyOptions(c) {
    const { cls, ch } = pcParts(c);
    if (!cls) return [];
    return [...new Set([...cls.key, ...(ch && ch.key ? [ch.key] : [])])];
}

function pcKey(c) {
    const opts = pcKeyOptions(c);
    if (opts.length === 1) return opts[0];
    return opts.includes(c.boosts.key) ? c.boosts.key : '';
}

// Each boost set as [options, picked]: options are attribute ids (all six for a free boost).
// A pick counts only when it's one of its set's options and not an attribute the same source
// boosts already (a saved or imported file could repeat one).
function pcPickSets(sets, picks) {
    const out = sets.map(set => {
        const opts = set[0] === 'free' ? PC_ABILS : set;
        return [opts, opts.length === 1 ? opts[0] : ''];
    });
    const used = new Set(out.map(([, a]) => a).filter(Boolean));
    return out.map(([opts, a], i) => {
        if (a) return [opts, a];
        const p = picks[i] || '';
        if (!opts.includes(p) || used.has(p)) return [opts, ''];
        used.add(p);
        return [opts, p];
    });
}

// Distinct picks of a list of free boosts (four at 1st level, four at 5th...).
const pcUniqBoosts = list => list.filter((a, i) => a && list.indexOf(a) === i);

function pcAncSets(c) {
    const { anc } = pcParts(c);
    if (!anc) return [];
    return pcPickSets(c.boosts.ancFree ? [['free'], ['free']] : anc.bo, c.boosts.anc);
}

function pcBgSets(c) {
    const { bg } = pcParts(c);
    if (!bg) return [];
    return pcPickSets(bg.bo, c.boosts.bg);
}

// Attribute modifiers at the character's level. Past +4, a boost is partial: two make +1.
function pcAttrs(c, level = c.level) {
    const mods = Object.fromEntries(PC_ABILS.map(a => [a, 0]));
    const partial = Object.fromEntries(PC_ABILS.map(a => [a, false]));
    const { anc } = pcParts(c);
    const add = a => {
        if (!a) return;
        if (mods[a] >= 4) {
            if (partial[a]) { mods[a] += 1; partial[a] = false; } else partial[a] = true;
        } else mods[a] += 1;
    };
    pcAncSets(c).forEach(([, a]) => add(a));
    if (anc && !c.boosts.ancFree) (anc.fl || []).forEach(a => { mods[a] -= 1; });
    pcBgSets(c).forEach(([, a]) => add(a));
    add(pcKey(c));
    pcUniqBoosts(c.boosts.l1).forEach(add);
    PC_BOOST_LEVELS.filter(l => l <= level).forEach(l => pcUniqBoosts(c.boosts[l] || []).forEach(add));
    return { mods, partial };
}

// ── Proficiency ─────────────────────────────────────────
function pcProfs(c, level = c.level) {
    const { cls, ch } = pcParts(c);
    const r = { per: 0, fort: 0, ref: 0, will: 0, unarmed: 0, simple: 0, martial: 0, advanced: 0,
        unarmored: 0, light: 0, medium: 0, heavy: 0, classdc: 0, spell: 0 };
    if (!cls) return r;
    r.per = cls.per;
    Object.assign(r, cls.sv);
    Object.entries(cls.atk).forEach(([k, v]) => { r[k] = v; });
    Object.entries(cls.def).forEach(([k, v]) => { r[k] = v; });
    r.classdc = 1;
    r.spell = cls.cast || pcFocusOnly(c) ? 1 : 0;
    const up = steps => Object.entries(steps || {}).forEach(([lv, s]) => {
        if (Number(lv) > level) return;
        Object.entries(s).forEach(([k, v]) => { r[k] = Math.max(r[k] || 0, v); });
    });
    up(cls.st);
    if (ch) up(ch.st);
    // The monk's Paths to Perfection: a save to master, a different one to master, then one of those two to legendary.
    pcPathPicks(c).forEach(([lv, save]) => {
        if (Number(lv) <= level) r[save] = Math.max(r[save], cls.pp[lv]);
    });
    // Monk Expertise (9) and Graceful Legend (17) raise a monk's qi spells to expert, then master.
    if (c.cls === 'monk' && r.spell) r.spell = Math.max(r.spell, level >= 17 ? 3 : level >= 9 ? 2 : 1);
    // A ranger with warden spells: expert spell attacks and DCs at 9th, master at 17th.
    if (c.cls === 'ranger' && r.spell) { const fo = pcFocusOnly(c); if (fo && fo.from === 'ranger') r.spell = Math.max(r.spell, level >= 17 ? 3 : level >= 9 ? 2 : 1); }
    // Multiclass dedications: martial weapons, armor, and the spell attack and DC (one rank for all your spells).
    pcDedications(c, level).forEach(d => {
        const m = PC_MC[d.cls];
        if (m.wp) r[m.wp] = Math.max(r[m.wp], 1);
        if (m.ar === 'light') r.light = Math.max(r.light, 1);
        if (m.ar === 'champion') {
            // Champion Dedication: light and medium (heavy too if you had both), rising with your class's armor.
            const kinds = r.light && r.medium ? ['light', 'medium', 'heavy'] : ['light', 'medium'];
            const rank = Math.max(1, r.light, r.medium, r.heavy, level >= 13 && r.unarmored >= 2 ? 2 : 0);
            kinds.forEach(k => { r[k] = Math.max(r[k], rank); });
        }
        if (d.cast) r.spell = Math.max(r.spell, pcArcSpellRank(c, d.cls, level));
    });
    return r;
}

// The Paths to Perfection picks that follow the rules, as [level, save]: the second has to differ
// from the first, and the third has to be one of those two.
function pcPathPicks(c) {
    const { cls } = pcParts(c);
    const lvs = Object.keys((cls && cls.pp) || {}).sort((a, b) => a - b);
    const out = [];
    lvs.forEach((lv, i) => {
        const save = c.paths[lv];
        if (!save) return;
        const [a, b] = [c.paths[lvs[0]], c.paths[lvs[1]]];
        if (i === 1 && save === a) return;
        if (i === 2 && (!a || !b || a === b || ![a, b].includes(save))) return;
        out.push([lv, save]);
    });
    return out;
}

function pcBonus(rank, level) {
    return rank ? rank * 2 + level : 0;
}

// The rank with the deity's favored weapon (clerics), or 0.
function pcFavoredRank(c) {
    const steps = PC_FAVORED[c.ch];
    if (!steps || c.cls !== 'cleric') return 0;
    return Object.entries(steps).reduce((r, [lv, v]) => (Number(lv) <= c.level ? Math.max(r, v) : r), 0);
}

// ── Skills ──────────────────────────────────────────────
// Trained skills from everything but the class's free picks, with where each came from.
function pcGivenSkills(c) {
    const { bg, cls, ch } = pcParts(c);
    const given = [];
    const give = (k, from) => { if (Object.hasOwn(PC_SKILLS, k)) given.push([k, from]); };
    if (cls) cls.sk.fixed.forEach(k => give(k, cls.n));
    if (ch) {
        (ch.sk || []).forEach(k => give(k, ch.n));
        if (ch.skc && ch.skc.includes(c.skills.ch)) give(c.skills.ch, ch.n);
        if (ch.tr === 'choice' && c.sub) give({ arcane: 'arcana', divine: 'religion', occult: 'occultism', primal: 'nature' }[c.sub], ch.n);
    }
    if (bg) bg.sk.forEach(k => give(k, bg.n));
    if (pcBgSkill(c)) give(pcBgSkill(c), bg.n);
    (pcHeritageFx(c).sk || []).forEach(k => give(k, PF2E_HERITAGES[c.her].n));
    if ((c.cls === 'cleric' || c.cls === 'champion') && c.deity.skill) give(c.deity.skill, 'Deity');
    return given;
}

// How many skills the class lets the player pick: its number plus Int, plus one for each
// skill two sources both gave (you pick another in its place).
function pcSkillPicks(c) {
    const { cls } = pcParts(c);
    if (!cls) return 0;
    const given = pcGivenSkills(c).map(([k]) => k);
    const dupes = given.length - new Set(given).size;
    return Math.max(0, cls.sk.extra + (PC_SKILL_OR[c.cls] ? 1 : 0) + pcAttrs(c).mods.int + dupes);
}

// Classes trained in one skill of a pair, the player's call (Player Core: the fighter's Acrobatics or
// Athletics). It's one more free pick; pcTodo asks for it when neither one is trained.
const PC_SKILL_OR = { fighter: ['acrobatics', 'athletics'] };

// The class's free picks that count: ones another source now gives don't, nor any past the limit.
function pcPickedSkills(c) {
    const given = new Set(pcGivenSkills(c).map(([k]) => k));
    return c.skills.cls.filter(k => !given.has(k)).slice(0, pcSkillPicks(c));
}

// The trained skills a class choice gives (a methodology's or a style's, with its pick from a list).
function pcChoiceSkills(c) {
    const { ch } = pcParts(c);
    if (!ch) return [];
    return [...(ch.sk || []), ...(ch.skc && ch.skc.includes(c.skills.ch) ? [c.skills.ch] : [])];
}

// The skill increases up to a level: { key (its place in c.skills.inc), level, only (the skills it can raise, or null) }.
function pcIncSlots(c, level = c.level) {
    const { cls } = pcParts(c);
    const out = [];
    (cls ? cls.lv.inc : []).filter(l => l <= level).forEach(l => {
        out.push({ key: String(l), level: l, only: null });
        if (c.cls === 'swashbuckler' && PC_STYLISH.includes(l)) out.push({ key: l + 's', level: l, only: [...new Set(['acrobatics', ...pcChoiceSkills(c)])] });
    });
    return out;
}

// The ranks an archetype dedication gives (Acrobat, Medic), as [level, skill, rank].
function pcDedSkillGrants(c, level = c.level) {
    const out = [];
    pcFeatSlots(c, level).forEach(s => {
        const g = PC_DED_SKILL[c.feats[s.slot]];
        if (g) Object.entries(g[1]).forEach(([lv, r]) => { const at = Math.max(s.level, Number(lv)); if (at <= level) out.push([at, g[0], r]); });
    });
    return out;
}

// Each skill's rank (and the Lores), from training, dedications, and the skill increases taken so far.
// stop: an increase's key, to get the ranks just before it (a dedication's ranks at its level come first).
function pcSkillRanks(c, level = c.level, stop = '') {
    const ranks = Object.fromEntries(Object.keys(PC_SKILLS).map(k => [k, 0]));
    pcGivenSkills(c).forEach(([k]) => { ranks[k] = 1; });
    pcPickedSkills(c).forEach(k => { ranks[k] = 1; });
    pcDedications(c, level).forEach(d => d.skills.forEach(k => { ranks[k] = 1; }));
    const lores = {};
    pcLores(c).forEach(l => { lores[l] = 1; });
    const steps = [...pcDedSkillGrants(c, level).map(g => ({ level: g[0], grant: g })), ...pcIncSlots(c, level).map(s => ({ level: s.level, slot: s }))]
        .sort((a, b) => a.level - b.level || (a.grant ? 0 : 1) - (b.grant ? 0 : 1));
    for (const e of steps) {
        if (e.grant) { ranks[e.grant[1]] = Math.max(ranks[e.grant[1]], e.grant[2]); continue; }
        if (e.slot.key === stop) break;
        const k = c.skills.inc[e.slot.key], l = e.slot.level;
        if (!k || (e.slot.only && !e.slot.only.includes(k))) continue;
        if (k.startsWith('lore:')) { const n = k.slice(5); if (Object.hasOwn(lores, n)) lores[n] = Math.min(pcRankCap(l), lores[n] + 1); }
        else if (ranks[k] < pcRankCap(l)) ranks[k] += 1;
    }
    return { ranks, lores };
}

// The highest rank a skill increase at this level can reach.
function pcRankCap(level) {
    return level >= 15 ? 4 : level >= 7 ? 3 : 2;
}

function pcLores(c) {
    const { bg } = pcParts(c);
    return [...new Set([...(bg ? bg.lo : []), pcBgLore(c), ...c.skills.lore].filter(Boolean))];
}

// A background's own picks (Player Core): the skill of its skc list, and its Lore, one of loc or one
// the player names for lof ("Cave" or "Cave Lore" → "Cave Lore").
function pcBgSkill(c) {
    const { bg } = pcParts(c);
    return bg && bg.skc && bg.skc.includes(c.bgc.sk) ? c.bgc.sk : '';
}
function pcBgLore(c) {
    const { bg } = pcParts(c);
    if (!bg) return '';
    if (bg.loc) return bg.loc.includes(c.bgc.lo) ? c.bgc.lo : '';
    return bg.lof ? pcLoreName(c.bgc.lo) : '';
}
function pcLoreName(v) {
    v = String(v || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!v || /^lore$/i.test(v)) return '';
    v = v[0].toUpperCase() + v.slice(1);
    return /\blore$/i.test(v) ? v.replace(/lore$/i, 'Lore') : `${v.slice(0, 35).trim()} Lore`;
}

// ── Feats ───────────────────────────────────────────────
const PC_SLOT_KINDS = {
    anc: ['Ancestry feat', 'anc'], cls: ['Class feat', 'cls'], gen: ['General feat', 'gen'], skf: ['Skill feat', 'skf']
};

// Free Archetype (a GM Core variant, c.fa): one more class feat at every even level, for archetype feats only.
const PC_FREE_ARCH = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

// Every feat slot up to the character's level: { slot, kind, level, label }.
function pcFeatSlots(c, level = c.level) {
    const { cls } = pcParts(c);
    if (!cls) return [];
    const out = [];
    Object.entries(PC_SLOT_KINDS).forEach(([kind, [label, lvKey]]) => {
        cls.lv[lvKey].filter(l => l <= level).forEach(l => out.push({ slot: kind + l, kind, level: l, label }));
    });
    if (c.fa) PC_FREE_ARCH.filter(l => l <= level).forEach(l => out.push({ slot: 'arc' + l, kind: 'arc', level: l, label: 'Free archetype feat' }));
    // Rogue Dedication gives a skill feat of its own, at the dedication's level.
    const rogue = c.cls !== 'rogue' && out.find(s => c.feats[s.slot] === 'rogue-dedication');
    if (rogue) out.push({ slot: 'mcs' + rogue.level, kind: 'mcs', level: rogue.level, label: 'Skill feat (Rogue Dedication)' });
    // Basic and Advanced X (Basic Dogma, Advanced Kata...) give a class feat of their own: slot 'x' + theirs.
    out.filter(s => s.kind === 'cls' || s.kind === 'arc').forEach(s => {
        const sub = pcSubFeat(c.feats[s.slot], s.level);
        if (sub) out.push({ slot: 'x' + s.slot, kind: 'sub', level: s.level, label: `${PF2E_CLASSES[sub.cls].n} feat (${PF2E_FEATS[c.feats[s.slot]].n})`, parent: s.slot });
    });
    out.forEach(s => { const lim = s.kind === 'skf' && pcSkillFeatLimit(c, s.level); if (lim) s.label = `Skill feat (${lim.name})`; });
    const order = { anc: 0, cls: 1, arc: 2, sub: 2.5, skf: 3, mcs: 3, gen: 4 };
    return out.sort((a, b) => a.level - b.level || order[a.kind] - order[b.kind]);
}

// A bonus skill feat slot with a limit: the investigator's Skillful Lessons (odd levels from 3rd: an Intelligence,
// Wisdom, or Charisma skill, or the methodology's) and the swashbuckler's Stylish Tricks. { name, skills } or null.
function pcSkillFeatLimit(c, level) {
    if (c.cls === 'investigator' && level >= 3 && level % 2) return { name: 'Skillful Lessons', skills: [...Object.keys(PC_SKILLS).filter(k => ['int', 'wis', 'cha'].includes(PC_SKILLS[k])), 'lore', ...pcChoiceSkills(c)] };
    if (c.cls === 'swashbuckler' && PC_STYLISH.includes(level)) return { name: 'Stylish Tricks', skills: ['acrobatics', ...pcChoiceSkills(c)] };
    return null;
}

// The skills a skill feat is for, from its prerequisites ("trained in Athletics"); none named (Assurance) fits any.
function pcFeatSkills(f) {
    const out = [];
    (f.pr || []).forEach(p => {
        const m = /\b(?:trained|expert|master|legendary) in (.+)/i.exec(p);
        if (!m) return;
        Object.keys(PC_SKILLS).forEach(k => { if (new RegExp(`\\b${k}\\b`, 'i').test(m[1])) out.push(k); });
        if (/\bLore\b/.test(m[1])) out.push('lore');
    });
    return out;
}
function pcSkillFeatFits(f, skills) {
    const own = pcFeatSkills(f);
    return !own.length || own.some(k => skills.includes(k));
}

// The archetype feats that give a feat of the class (Player Core 1 and 2): Basic X a 1st- or
// 2nd-level one, Advanced X one up to half the character's level (it can be taken more than once).
const PC_SUB_FEAT = {
    wizard: 'arcana', sorcerer: 'blood-potency', alchemist: 'concoction', investigator: 'deduction', champion: 'devotion',
    cleric: 'dogma', swashbuckler: 'flair', barbarian: 'fury', ranger: 'hunter-s-trick', monk: 'kata', fighter: 'maneuver',
    bard: 'muse-s-whispers', oracle: 'mysteries', rogue: 'trickery', druid: 'wilding', witch: 'witchcraft'
};
// A Basic or Advanced X feat taken at a level → { cls, cap (highest feat level) }, or null.
function pcSubFeat(key, level) {
    const m = /^(basic|advanced)-(.+)$/.exec(key || '');
    if (!m) return null;
    const cls = Object.keys(PC_SUB_FEAT).find(k => PC_SUB_FEAT[k] === m[2]);
    if (!cls) return null;
    return { cls, cap: m[1] === 'advanced' ? Math.floor(level / 2) : 2 };
}

// Feats the character has without a slot: background, class choice, warpriest's Shield Block.
function pcGrantedFeats(c) {
    const { bg, ch, ch2 } = pcParts(c);
    const out = [];
    const grant = (name, from) => out.push({ name, key: pcFeatKey(name), from });
    if (bg) {
        // A background's Assurance names its skill (Farmhand: Athletics; Scholar: the skill picked).
        const asSkill = bg.as === 'skc' ? pcBgSkill(c) : bg.as || '';
        (bg.ft || []).forEach(n => grant(n, n === 'Assurance' && asSkill ? `${bg.n} (${pcCap(asSkill)})` : bg.n));
        const byPick = bg.fts && pcBgSkill(c) && bg.fts[pcBgSkill(c)];
        if (byPick) grant(byPick, bg.n);
    }
    [ch, ch2].forEach(x => { if (x) (x.ft || []).forEach(n => grant(n, x.n)); });
    (pcHeritageFx(c).ft || []).forEach(n => grant(n, PF2E_HERITAGES[c.her].n));
    if (c.ch === 'warpriest') grant('Shield Block', 'Warpriest');
    // The doctrines' other feats: a cloistered cleric's Domain Initiate, and a warpriest's Deadly Simplicity
    // when the deity's favored weapon is simple or unarmed.
    if (c.ch === 'cloistered-cleric') grant('Domain Initiate', 'Cloistered Cleric');
    const fav = c.deity && c.deity.weapon && PF2E_ITEMS[c.deity.weapon];
    if (c.ch === 'warpriest' && fav && ['simple', 'unarmed'].includes(fav.ct)) grant('Deadly Simplicity', 'Warpriest');
    // Class features that are feats by name (a fighter's Shield Block and Reactive Strike).
    const { cls } = pcParts(c);
    // An archetype feat that shares a feature's name is another thing (the rogue's Surprise Attack isn't the
    // level-4 archetype feat), so it isn't granted.
    if (cls) pcFeatures(c).forEach(f => { const k = pcFeatKey(f.name); if (k && !PF2E_FEATS[k].ar && !out.some(g => g.name === f.name)) grant(f.name, cls.n); });
    return out;
}

function pcFeatKey(name) {
    const k = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (Object.hasOwn(PF2E_FEATS, k)) return k;
    return Object.hasOwn(pcFeatAliases(), k) ? pcFeatAliases()[k] : '';
}

// A feat stored under a qualified name ("Startling Appearance (Vigilante)") found by its plain one,
// when only one feat carries that plain name.
let pcFeatAliasCache = null;
function pcFeatAliases() {
    if (pcFeatAliasCache) return pcFeatAliasCache;
    const found = {};
    Object.entries(PF2E_FEATS).forEach(([k, f]) => {
        const m = /^(.+?) \([^)]+\)$/.exec(f.n);
        if (!m) return;
        const base = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!Object.hasOwn(PF2E_FEATS, base)) (found[base] = found[base] || []).push(k);
    });
    pcFeatAliasCache = {};
    Object.entries(found).forEach(([base, keys]) => { if (keys.length === 1) pcFeatAliasCache[base] = keys[0]; });
    return pcFeatAliasCache;
}

// The ancestry traits whose feats this character can take.
function pcAncestryTraits(c) {
    const { anc, her } = pcParts(c);
    const t = [];
    if (anc) t.push(c.race);
    if (her && !her.a) {
        t.push(c.her);
        if (PC_EXTRA_FEATS[c.her]) t.push(PC_EXTRA_FEATS[c.her]);
    }
    return t;
}

// Feats that fit a slot, best first: { key, feat, taken }. archetype: include archetype feats (class slots).
function pcFeatsFor(c, slot, { archetype = false } = {}) {
    const kind = slot.replace(/\d+$/, '');
    const level = Number(slot.replace(/^\D+/, ''));
    // How many times each feat is taken elsewhere: a feat is used up at its limit (mx, 1 by default).
    const times = {};
    Object.entries(c.feats).forEach(([s, f]) => { if (s !== slot && f) times[f] = (times[f] || 0) + 1; });
    pcGrantedFeats(c).forEach(g => { if (g.key) times[g.key] = (times[g.key] || 0) + 1; });
    const used = (key, f) => (times[key] || 0) >= (f.mx || 1);
    const traits = pcAncestryTraits(c);
    const sub = kind.startsWith('x') ? pcSubFeat(c.feats[slot.slice(1)], level) : null;
    // Another class's feats an archetype taken lists as its own (Archer: Assisting Shot at 4), in its slots.
    const extra = (kind === 'cls' && archetype) || kind === 'arc' ? pcArchExtraFor(c) : {};
    const lim = kind === 'skf' ? pcSkillFeatLimit(c, level) : null;
    const out = [];
    for (const [key, f] of Object.entries(PF2E_FEATS)) {
        if (Object.hasOwn(extra, key) && extra[key] <= level && !f.tr.includes(c.cls)) {
            out.push({ key, feat: f, taken: used(key, f), arc: extra[key] });
            continue;
        }
        if (f.l > level) continue;
        let fits = false;
        if (sub) fits = f.c === 'class' && !f.ar && f.tr.includes(sub.cls) && f.l <= sub.cap;
        if (kind === 'anc') fits = f.c === 'ancestry' && f.tr.some(t => traits.includes(t));
        else if (kind === 'cls') fits = f.c === 'class' && (f.ar ? archetype : f.tr.includes(c.cls));
        else if (kind === 'arc') fits = f.ar === 1;
        else if (kind === 'skf' || kind === 'mcs') fits = f.c === 'skill' && (!lim || pcSkillFeatFits(f, lim.skills));
        else if (kind === 'gen') fits = f.c === 'general' || f.c === 'skill';
        if (!fits) continue;
        if (kind === 'cls' && f.ar && f.c === 'class' && !archetype) continue;
        out.push({ key, feat: f, taken: used(key, f) });
    }
    return out.sort((a, b) => (b.arc || b.feat.l) - (a.arc || a.feat.l) || a.feat.n.localeCompare(b.feat.n));
}

// The feats in slots the character has at their level (a level-down leaves later picks saved but asleep).
function pcActiveFeats(c) {
    return pcFeatSlots(c).map(s => c.feats[s.slot]).filter(Boolean);
}

// Whether the character has a feat: in a slot (up to their level, or before a slot) or granted.
function pcHasFeat(c, key, before = '') {
    const slots = pcFeatSlots(c);
    const end = before ? slots.findIndex(s => s.slot === before) : slots.length;
    return slots.slice(0, end < 0 ? slots.length : end).some(s => c.feats[s.slot] === key) || pcGrantedFeats(c).some(g => g.key === key);
}

// A quick check of the plain prerequisites: true met, false not, null can't tell.
// "Strength +2", "trained in Stealth", "trained in Nature or Society", "trained in Stealth and Survival",
// "expert in Arcana, Nature, Occultism, or Religion", "trained in Perception", or a feat's name.
function pcPrereqMet(c, text, stats = pcStats(c)) {
    const t = String(text).trim().replace(/\.$/, '');
    let m = /^(strength|dexterity|constitution|intelligence|wisdom|charisma) \+(\d)$/i.exec(t);
    if (m) return stats.mods[PC_ABILS.find(a => PC_ABIL_NAMES[a].toLowerCase() === m[1].toLowerCase())] >= Number(m[2]);
    m = /^(trained|expert|master|legendary) in (.+)$/i.exec(t);
    if (m) {
        const need = PC_RANKS.indexOf(pcCap(m[1].toLowerCase()));
        const any = /\bor\b/i.test(m[2]);
        const parts = m[2].split(/,\s*(?:and |or )?|\s+(?:and|or)\s+/i).map(x => x.trim().toLowerCase()).filter(Boolean);
        const save = k => Object.keys(PC_SAVES).find(x => PC_SAVES[x][0].toLowerCase() === k.replace(/ saves?$/, ''));
        const ok = parts.map(k => (Object.hasOwn(PC_SKILLS, k) ? stats.ranks[k] >= need : k === 'perception' ? stats.prof.per >= need
            : / saves?$/.test(k) && save(k) ? stats.prof[save(k)] >= need : null));
        if (ok.includes(null)) return null;
        return any ? ok.includes(true) : !ok.includes(false);
    }
    // A feat's name: any feat of that name counts, its class versions too ("Animal Companion" is met by the
    // ranger's "Animal Companion (Ranger)", "Incredible Companion" by either class's).
    const keys = pcFeatKeysNamed(t);
    if (!keys.length) return null;
    const have = new Set([...pcActiveFeats(c), ...pcGrantedFeats(c).map(g => g.key)]);
    return keys.some(k => have.has(k));
}

// The feats a prerequisite's name can mean: its own key, plus every "Name (Something)" version.
function pcFeatKeysNamed(name) {
    const own = pcFeatKey(name);
    const low = String(name).trim().toLowerCase();
    const out = own ? [own] : [];
    Object.entries(PF2E_FEATS).forEach(([k, f]) => {
        const m = /^(.+?) \([^)]+\)$/.exec(f.n);
        if (m && m[1].toLowerCase() === low && !out.includes(k)) out.push(k);
    });
    return out;
}

// ── Archetypes ──────────────────────────────────────────
// Every Player Core archetype, found through its dedication feat: { key: { n, ded, l, mc, feats } }.
// mc: the class of a multiclass archetype. feats: the archetype feats that name the dedication
// as a prerequisite, carry the archetype's trait, or name a feat that does (Advanced Arcana needs Basic Arcana).
let pcArchCache = null;
function pcArchetypes() {
    if (pcArchCache) return pcArchCache;
    const out = {};
    Object.entries(PF2E_FEATS).forEach(([k, f]) => {
        if (!f.ar || !f.tr.includes('dedication')) return;
        const key = k.replace(/-dedication$/, '');
        out[key] = { n: f.n.replace(/ Dedication$/, ''), ded: k, l: f.l, mc: f.tr.includes('multiclass') && Object.hasOwn(PF2E_CLASSES, key) ? key : '', feats: [] };
    });
    const owners = {};
    // Longest names first, each cut out of the text once found, so "archer dedication" doesn't match inside
    // "eldritch archer dedication".
    const names = Object.entries(out).map(([key, a]) => [key, `${a.n} Dedication`.toLowerCase()]).sort((x, y) => y[1].length - x[1].length);
    const rest = Object.entries(PF2E_FEATS).filter(([, f]) => f.ar && !f.tr.includes('dedication'));
    rest.forEach(([k, f]) => {
        let pr = (f.pr || []).join('; ').toLowerCase();
        let own = [];
        names.forEach(([key, n]) => { if (pr.includes(n)) { own.push(key); pr = pr.split(n).join('|'); } });
        if (!own.length) own = f.tr.filter(t => Object.hasOwn(out, t));   // Stunning Appearance: the vigilante trait
        if (own.length) owners[k] = own;
    });
    for (let changed = true; changed;) {
        changed = false;
        rest.forEach(([k, f]) => {
            if (owners[k]) return;
            const own = [...new Set((f.pr || []).flatMap(p => owners[pcFeatKey(p)] || []))];
            if (own.length) { owners[k] = own; changed = true; }
        });
    }
    Object.entries(owners).forEach(([k, own]) => own.forEach(a => out[a].feats.push(k)));
    Object.values(out).forEach(a => { a.extra = {}; });
    Object.entries(PC_ARCH_EXTRA).forEach(([a, list]) => {
        if (!out[a]) return;
        Object.entries(list).forEach(([k, l]) => { if (Object.hasOwn(PF2E_FEATS, k) && !PF2E_FEATS[k].ar) { out[a].extra[k] = l; out[a].feats.push(k); } });
    });
    Object.values(out).forEach(a => {
        const lv = k => a.extra[k] || PF2E_FEATS[k].l;
        a.feats.sort((x, y) => lv(x) - lv(y) || PF2E_FEATS[x].n.localeCompare(PF2E_FEATS[y].n));
    });
    pcArchCache = out;
    return out;
}

// An archetype's Additional Feats (Player Core 2): other classes' feats it offers, at the level they
// count as in it. Only those in the Gazette's data show.
const PC_ARCH_EXTRA = {
    archer: { 'assisting-shot': 4, 'crossbow-ace': 4, 'point-blank-stance': 4, 'double-shot': 6, 'parting-shot': 6,
        'running-reload': 6, 'triple-shot': 8, 'mobile-shot-stance': 10, 'multishot-stance': 18, 'impossible-volley': 20 }
};

// The Additional Feats of the dedications the character has taken: { feat key: level }.
function pcArchExtraFor(c) {
    const out = {};
    Object.values(pcArchetypes()).forEach(a => {
        if (Object.keys(a.extra).length && pcActiveFeats(c).includes(a.ded)) Object.entries(a.extra).forEach(([k, l]) => { out[k] = Math.min(out[k] || 99, l); });
    });
    return out;
}

// The archetypes a feat belongs to (its own one for a dedication).
function pcFeatArchetypes(key) {
    return Object.entries(pcArchetypes()).filter(([, a]) => a.ded === key || a.feats.includes(key)).map(([k]) => k);
}

// The character's archetypes in the order taken, and what breaks the rules:
// { list: [{ key, slot, level, feats: [{ slot, key }] }], current, need, issues: [{ slot, text }] }.
// need: feats still to take from the current archetype before another dedication (the two-feat rule).
function pcArchetypeCheck(c) {
    const arch = pcArchetypes();
    const list = [];
    const issues = [];
    let current = null;
    const statsAt = {};
    pcFeatSlots(c).forEach(s => {
        const key = c.feats[s.slot];
        const f = key && PF2E_FEATS[key];
        // An Additional Feat counts as the archetype's when the class can't take it as its own.
        const extraOf = f && !f.ar && !f.tr.includes(c.cls) ? Object.entries(arch).filter(([, a]) => Object.hasOwn(a.extra, key)).map(([k]) => k) : [];
        if (!f || (!f.ar && !extraOf.length)) return;
        const own = f.ar ? pcFeatArchetypes(key) : extraOf;
        // Prerequisites as the character stood when the slot was filled: its level's attributes and
        // skills, and only the feats in earlier slots. A feat that misses one doesn't count.
        const at = { ...c, level: s.level, feats: Object.fromEntries(pcFeatSlots(c).slice(0, pcFeatSlots(c).findIndex(x => x.slot === s.slot)).filter(x => c.feats[x.slot]).map(x => [x.slot, c.feats[x.slot]])) };
        const st = statsAt[s.slot] || (statsAt[s.slot] = pcStats(at));
        const unmet = (f.pr || []).filter(p => pcPrereqMet(at, p, st) === false);
        if (unmet.length) {
            issues.push({ slot: s.slot, text: `${f.n} (level ${s.level}): a prerequisite isn't met there: ${unmet.join('; ')}.` });
            return;
        }
        if (f.tr.includes('dedication')) {
            const a = arch[own[0]];
            if (!a) return;
            if (a.mc && a.mc === c.cls) {
                issues.push({ slot: s.slot, text: `You can't take the ${a.n} Dedication: you're already a ${a.n.toLowerCase()}.` });
                return;
            }
            if (current && current.feats.length < 2) issues.push({ slot: s.slot, text: `${a.n} Dedication comes too soon: take ${2 - current.feats.length} more ${arch[current.key].n} feat${current.feats.length === 1 ? '' : 's'} first (two after each dedication).` });
            current = { key: own[0], slot: s.slot, level: s.level, feats: [] };
            list.push(current);
            return;
        }
        const mine = list.filter(x => own.includes(x.key) && !(arch[x.key].extra[key] > s.level));
        if (!f.ar && !mine.length && list.some(x => own.includes(x.key))) {
            issues.push({ slot: s.slot, text: `${f.n} counts as a level ${Math.min(...own.map(k => arch[k].extra[key]))} ${own.map(k => arch[k].n).join(' or ')} feat: too soon at level ${s.level}.` });
            return;
        }
        if (!mine.length) {
            if (own.length) issues.push({ slot: s.slot, text: `${f.n} needs the ${own.map(k => arch[k].n).join(' or ')} Dedication first.` });
            return;
        }
        mine.forEach(x => x.feats.push({ slot: s.slot, key }));
    });
    return { list, current: current ? current.key : '', need: current ? Math.max(0, 2 - current.feats.length) : 0, issues };
}

// ── Multiclass dedications ──────────────────────────────
// What each multiclass dedication gives (Player Core 1 and 2): sk skills it trains, pk skills to
// pick (a list to pick from, or a hint for any skill), chs what the class choice it asks for adds
// ('sk' its skills, 'or' Acrobatics or the style's skill), dc its class DC, wp/ar weapon and armor
// training, cast [tradition ('' = the choice's), attribute, type, cantrips prepared], br its Breadth.
// An archetype that isn't a class carries its name in n: the eldritch archer casts on its own
// (Player Core 2) only for a character whose class doesn't cast from spell slots, with a tradition
// they pick and one cantrip that makes a spell attack roll (atk).
const PC_MC = {
    alchemist: { sk: ['crafting'], dc: 1 },
    barbarian: { sk: ['athletics'], dc: 1 },
    bard: { sk: ['occultism', 'performance'], cast: ['occult', 'cha', 'rep', 2], br: 'occult-breadth' },
    champion: { sk: ['religion'], pk: ['your deity\'s skill'], dc: 1, ar: 'champion' },
    cleric: { sk: ['religion'], pk: ['your deity\'s skill'], cast: ['divine', 'wis', 'list', 2], br: 'divine-breadth' },
    druid: { sk: ['nature'], chs: 'sk', cast: ['primal', 'wis', 'list', 2], br: 'primal-breadth' },
    fighter: { pk: [['acrobatics', 'athletics']], dc: 1, wp: 'martial' },
    investigator: { sk: ['society'], pk: ['a skill of your choice'], dc: 1 },
    monk: { pk: [['acrobatics', 'athletics']], dc: 1 },
    oracle: { sk: ['religion'], chs: 'sk', cast: ['divine', 'cha', 'rep', 2], br: 'mysterious-breadth' },
    ranger: { sk: ['survival'], dc: 1 },
    rogue: { pk: [['stealth', 'thievery'], 'a skill of your choice'], dc: 1, ar: 'light' },
    sorcerer: { chs: 'sk', cast: ['', 'cha', 'rep', 2], br: 'bloodline-breadth' },
    swashbuckler: { chs: 'or', dc: 1 },
    witch: { chs: 'sk', cast: ['', 'int', 'book', 1], br: 'patron-s-breadth' },
    wizard: { sk: ['arcana'], cast: ['arcane', 'int', 'book', 2], br: 'arcane-breadth' },
    'eldritch-archer': { n: 'Eldritch Archer', cast: ['', 'cha', 'rep', 1], atk: 1 }
};
const PC_TRAD_SKILL = { arcane: 'arcana', divine: 'religion', occult: 'occultism', primal: 'nature' };

// The picks for a dedication (c.mc): ch the class choice, tr a draconic bloodline's tradition, sk skill picks.
function pcMcPick(c, cls) {
    return (c.mc && c.mc[cls]) || { ch: '', tr: '', sk: [] };
}

// Whether a feat sits in a slot at or below a level.
function pcFeatAt(c, key, level = c.level) {
    return pcFeatSlots(c, level).some(s => c.feats[s.slot] === key);
}

// The multiclass dedications taken by a level, in slot order, and what each gives:
// [{ cls, key, slot, level, n, ch, tr, cast (it gives spells of its own), skills, picks: [{ opts, hint, v }], todo }].
// A skill the character is already trained in becomes a pick of any skill, as the feats say.
function pcDedications(c, level = c.level) {
    const out = [];
    const trained = new Set([...pcGivenSkills(c).map(([k]) => k), ...pcPickedSkills(c)]);
    pcFeatSlots(c, level).forEach(s => {
        const key = c.feats[s.slot] || '';
        const cls = key.replace(/-dedication$/, '');
        if (key === cls || !Object.hasOwn(PC_MC, cls) || cls === c.cls || out.some(d => d.cls === cls)) return;
        const m = PC_MC[cls], mine = pcMcPick(c, cls), name = m.n || PF2E_CLASSES[cls].n;
        const tag = m.n ? null : PF2E_CLASSES[cls].ch;
        const ch = PF2E_CHOICES[mine.ch] && PF2E_CHOICES[mine.ch].c === cls ? PF2E_CHOICES[mine.ch] : null;
        const todo = [];
        let tr = '';
        const own = PF2E_CLASSES[c.cls] && PF2E_CLASSES[c.cls].cast;
        const cast = !!m.cast && !(m.n && own && own[1] !== 'focus');
        if (cast) {
            tr = m.cast[0] || (ch && ch.tr && ch.tr !== 'choice' ? ch.tr : (ch || m.n) && PC_TRADITIONS.includes(mine.tr) ? mine.tr : '');
            if (!tr && (ch || m.n)) todo.push(`pick your ${name.toLowerCase()} spells' tradition`);
        }
        if ((m.chs || (m.cast && !m.cast[0])) && !ch && tag) todo.push(`pick your ${tag[1].toLowerCase()}`);
        const fixed = [...(m.sk || [])];
        const lists = (m.pk || []).map(p => (Array.isArray(p) ? { opts: p, hint: p.map(pcCap).join(' or ') } : { opts: null, hint: p }));
        if (ch && m.chs === 'sk') fixed.push(...(ch.sk || []));
        if (cls === 'sorcerer' && ch && ch.tr === 'choice' && tr) fixed.push(PC_TRAD_SKILL[tr]);
        if (m.chs === 'or') lists.push(ch ? { opts: ['acrobatics', ...(ch.sk || [])], hint: `Acrobatics or ${pcCap((ch.sk || [''])[0])}` } : { opts: null, hint: 'Acrobatics or your style\'s skill' });
        const skills = [];
        fixed.forEach(k => {
            if (trained.has(k) || skills.includes(k)) lists.push({ opts: null, hint: `in place of ${pcCap(k)}` });
            else skills.push(k);
        });
        skills.forEach(k => trained.add(k));
        const picks = lists.map((p, i) => {
            const open = p.opts ? p.opts.filter(k => !trained.has(k)) : null;
            const opts = open && open.length ? open : null;
            const want = mine.sk[i] || '';
            const v = Object.hasOwn(PC_SKILLS, want) && !trained.has(want) && (!opts || opts.includes(want)) ? want : '';
            if (v) { trained.add(v); skills.push(v); }
            return { opts, hint: opts ? p.hint : p.opts ? `${p.hint} (both trained already: any skill)` : p.hint, v };
        });
        const left = picks.filter(p => !p.v).length;
        if (left) todo.push(`pick ${left} trained skill${left === 1 ? '' : 's'}`);
        out.push({ cls, key, slot: s.slot, level: s.level, n: name, ch, tr, cast, skills, picks, todo });
    });
    return out;
}

// Spell attack and DC rank from archetype spellcasting: trained, expert, master.
function pcArcSpellRank(c, cls, level = c.level) {
    if (pcFeatAt(c, `master-${cls}-spellcasting`, level)) return 3;
    if (pcFeatAt(c, `expert-${cls}-spellcasting`, level)) return 2;
    return 1;
}

// A spellcasting archetype's spells, shaped like pcSpellRules: the Basic, Expert, and Master
// Spellcasting feats give one slot a rank (1st-3rd from level 4, 6, 8; 4th-6th from 12, 14, 16;
// 7th and 8th from 18 and 20), its Breadth feat one more of each rank but the two highest. A
// repertoire grows with the slots; a wizard's book starts with 4 cantrips and gains 2 spells a
// rank, a witch's familiar 2 cantrips and 2 spells a rank. No signature spells, curriculum, or font.
function pcArcRules(c, cls) {
    const m = PC_MC[cls];
    const d = m && m.cast ? pcDedications(c).find(x => x.cls === cls && x.cast) : null;
    if (!d) return null;
    const L = c.level, has = k => pcFeatAt(c, `${k}-${cls}-spellcasting`);
    const slots = [];
    for (let r = 1; r <= 8; r++) {
        if (!(r <= 3 ? has('basic') && L >= 2 * r + 2 : r <= 6 ? has('expert') && L >= 2 * r + 4 : has('master') && L >= 2 * r + 4)) break;
        slots.push(1);
    }
    if (m.br && pcFeatAt(c, m.br)) slots.forEach((n, i) => { if (i < slots.length - 2) slots[i] += 1; });
    const [, attr, type, cantrips] = m.cast;
    const top = slots.length;
    return { trad: d.tr, kind: type === 'rep' ? 'spontaneous' : 'prepared', attr, cantrips, slots, curr: false, font: null,
        type, top, ctLimit: cantrips, rep: type === 'rep' ? slots.slice() : [], sig: [],
        book: type === 'book' ? { cantrips: cls === 'wizard' ? 4 : 2, spells: 2 * top } : null,
        prof: pcArcSpellRank(c, cls), arc: cls, n: d.n, br: !!m.br, ctAtk: !!m.atk };
}

// The spellcasting archetypes a character has: [pcArcRules, ...].
function pcArcCastings(c) {
    return pcDedications(c).filter(d => d.cast).map(d => pcArcRules(c, d.cls));
}

// ── Class features ──────────────────────────────────────
function pcFeatures(c, level = c.level) {
    const { cls } = pcParts(c);
    if (!cls) return [];
    return cls.f.filter(([l]) => l <= level).map(([l, n, key]) => ({ level: l, name: n, key }));
}

function pcHasFeature(c, name) {
    return pcFeatures(c).some(f => f.name === name);
}

// ── Gear, AC, Strikes ───────────────────────────────────
function pcArmor(c) {
    const a = PF2E_ITEMS[c.gear.armor];
    return a && a.k === 'a' && ['light', 'medium', 'heavy'].includes(a.ct) ? a : null;
}

function pcAC(c) {
    const { mods } = pcAttrs(c);
    const prof = pcProfs(c);
    const a = pcArmor(c);
    const cat = a ? a.ct : 'unarmored';
    const dex = a && Number.isFinite(a.dx) ? Math.min(mods.dex, a.dx) : mods.dex;
    // A specific magic armor's own potency ("This +1 silver chain shirt") counts unless the pick is higher. B924
    const item = (a ? a.ac || 0 : 0) + Math.max(c.gear.arPot || 0, a ? pcBuiltInRunes(c.gear.armor).pot : 0);
    return { ac: 10 + dex + pcBonus(prof[cat], c.level) + item, cat, dex, item, rank: prof[cat], armor: a };
}

function pcSpeed(c) {
    const { anc } = pcParts(c);
    let sp = anc ? anc.sp : 25;
    const a = pcArmor(c);
    if (a && a.sp) {
        const strong = Number.isFinite(a.st) && pcAttrs(c).mods.str >= a.st;
        sp += strong ? Math.min(0, a.sp + 5) : a.sp;
    }
    // A shield's Speed penalty (a tower shield's −5 feet) applies while it's equipped; Strength doesn't lift it.
    const sh = c.gear.shield && PF2E_ITEMS[c.gear.shield];
    if (sh && sh.sp) sp += sh.sp;
    // A monk's Incredible Movement, unarmored: +10 feet at 3rd level, 5 more every 4 levels after.
    if (c.cls === 'monk' && !a && c.level >= 3) sp += 10 + 5 * Math.floor((c.level - 3) / 4);
    return sp;
}

// Weapon specialization damage by rank (expert 2, master 3, legendary 4), doubled by the greater one.
function pcSpecDamage(c, rank) {
    if (rank < 2) return 0;
    const greater = pcFeatures(c).some(f => /^Greater Weapon Specialization/.test(f.name));
    const base = pcHasFeature(c, 'Weapon Specialization') ? rank : 0;
    return greater ? base * 2 : base;
}

// The fighter's weapon group for Fighter Weapon Mastery (5) or Weapon Legend (13, the 5th-level one if unset).
function pcFighterGroup(c, lv) {
    const wg = c.wg || {};
    return wg[lv] || (String(lv) === '13' ? wg[5] || '' : '');
}

// A specific magic weapon's own runes, from its text ("This +2 striking longbow..."), or an alchemical bomb's
// item bonus to attack rolls: { pot, str }. Saved rune picks only count above these.
const PC_BUILT_IN = {};
function pcBuiltInRunes(key) {
    if (Object.hasOwn(PC_BUILT_IN, key)) return PC_BUILT_IN[key];
    const it = PF2E_ITEMS[key] || {}, x = it.x || '';
    let r = { pot: 0, str: 0 };
    const m = /(?<!example, )\+([1-3]) (?!(?:item|circumstance|status) )(?:(greater|major) )?(striking )?/.exec(x);
    if ((it.tr || []).includes('bomb')) { const b = /\+([1-3]) item bonus to attack rolls/.exec(x); if (b) r = { pot: Number(b[1]), str: 0 }; }
    else if (m && it.l) r = { pot: Number(m[1]), str: m[3] ? ['', 'greater', 'major'].indexOf(m[2] || '') + 1 : 0 };
    return (PC_BUILT_IN[key] = r);
}

function pcWeaponRank(c, w, prof) {
    const cat = w.ct === 'unarmed' ? 'unarmed' : w.ct;
    let rank = prof[cat] || 0;
    if (c.deity.weapon && c.deity.weapon === w.key) rank = Math.max(rank, pcFavoredRank(c));
    // An alchemist is trained in alchemical bombs, expert at 7th, master at 15th: the same steps as simple weapons.
    const { cls } = pcParts(c);
    if (cls && cls.atko && /bomb/i.test(cls.atko[0]) && w.g === 'bomb' && (w.tr || []).includes('alchemical')) rank = Math.max(rank, prof.simple || 0);
    // A fighter's weapon group: master (expert for advanced weapons) at 5th, legendary (master) at 13th.
    if (c.cls === 'fighter' && w.g) Object.entries(PC_FIGHTER_GROUP).forEach(([lv, [base, adv]]) => {
        if (c.level >= Number(lv) && pcFighterGroup(c, lv) === w.g) rank = Math.max(rank, cat === 'advanced' ? adv : base);
    });
    return rank;
}

// The character's Strikes: their weapons and a fist. Each: { key (the item's, '' for the fist), name, atk: [3 MAP steps], dmg, traits, rank }.
function pcStrikes(c) {
    const { mods } = pcAttrs(c);
    const prof = pcProfs(c);
    const rows = c.gear.weapons.map(w => {
        const b = pcBuiltInRunes(w.id);
        return { ...PF2E_ITEMS[w.id], key: w.id, pot: Math.max(w.pot || 0, b.pot), str: Math.max(w.str || 0, b.str), own: (w.pot || 0) > b.pot || (w.str || 0) > b.str };
    }).filter(w => w.k === 'w');
    // A monk's Powerful Fist makes it a d6.
    rows.push({ n: 'Fist', key: '', ct: 'unarmed', g: 'brawling', dm: c.cls === 'monk' ? '1d6 B' : '1d4 B', tr: ['agile', 'finesse', 'nonlethal', 'unarmed'], pot: 0, str: 0 });
    return rows.map(w => {
        const tr = w.tr || [];
        const ranged = !!w.rg;
        const finesse = tr.includes('finesse');
        const abil = ranged ? mods.dex : finesse ? Math.max(mods.str, mods.dex) : mods.str;
        const rank = pcWeaponRank(c, w, prof);
        const hit = abil + pcBonus(rank, c.level) + (w.pot || 0);
        const agile = tr.includes('agile');
        const atk = [hit, hit - (agile ? 4 : 5), hit - (agile ? 8 : 10)];
        const m = /^(\d+)d(\d+)\s*(\w*)/.exec(w.dm || '');
        const dice = m ? `${(w.str || 0) + Number(m[1])}d${m[2]}` : '';
        let bonus = 0;
        // The thief racket can use Dexterity for a finesse melee Strike's damage.
        if (!ranged) bonus = finesse && c.cls === 'rogue' && c.ch === 'thief' ? Math.max(mods.str, mods.dex) : mods.str;
        else if (tr.some(t => /^thrown/.test(t)) && !tr.includes('splash')) bonus = mods.str;   // a splash weapon adds none
        else if (tr.includes('propulsive')) bonus = mods.str > 0 ? Math.floor(mods.str / 2) : mods.str;
        bonus += pcSpecDamage(c, rank);
        // Flat damage with no dice (a blowgun's 1 P, an acid flask's 1 acid): the bonus adds to it, at least 1.
        const flat = !m && /^(\d+)\s+(\w+)/.exec(w.dm || '');
        const dmg = dice ? `${dice}${bonus ? (bonus > 0 ? ' + ' : ' − ') + Math.abs(bonus) : ''} ${m[3] || ''}`.trim()
            : flat ? `${Math.max(1, Number(flat[1]) + bonus)} ${flat[2]}` : '';
        return { key: w.key, name: w.n + (w.own && w.pot ? ` +${w.pot}` : '') + (w.own && w.str ? ` (${['', 'striking', 'greater striking', 'major striking'][w.str]})` : ''),
            atk, dmg, traits: tr, rank, ranged, range: w.rg || 0 };
    });
}

// ── Spells ──────────────────────────────────────────────
// Sorcerers and (Player Core 2) oracles cast 3 spells of a new rank and 4 after; the rest 2, then 3.
const PC_BIG_SLOTS = ['sorcerer', 'oracle'];

// The class's casting: { trad, kind, attr, cantrips, slots: [count per rank 1..10], curr, font } or null.
// curr: a wizard's last slot of each rank 1-9 (and one cantrip) is for curriculum spells (not the
// school of unified magical theory). font: a cleric's heal or harm slots at the highest rank.
function pcCasting(c) {
    if (c.arcOf) return pcArcRules(c.arcBase, c.arcOf);   // the Spell Planner's view of an archetype's spells
    const { cls, ch } = pcParts(c);
    if (!cls) return null;
    if (!cls.cast) {
        const fo = pcFocusOnly(c);
        return fo ? { trad: fo.trad, kind: 'focus', attr: fo.attr, cantrips: 0, slots: [], curr: false, font: null, from: fo.from } : null;
    }
    const [trad0, kind] = cls.cast;
    let trad = trad0;
    if (ch && ch.tr) trad = ch.tr === 'choice' ? (PC_TRADITIONS.includes(c.sub) ? c.sub : '') : ch.tr;
    const attr = PC_SPELL_ATTR[c.cls] || pcKey(c);
    if (kind === 'focus') return { trad, kind, attr, cantrips: 0, slots: [], curr: false, font: null };
    const curr = c.cls === 'wizard' && !!ch && c.ch !== 'school-of-unified-magical-theory';
    const top = Math.min(9, Math.ceil(c.level / 2));
    const slots = [];
    for (let r = 1; r <= top; r++) {
        const fresh = c.level === 2 * r - 1; // the level a rank opens
        let n = PC_BIG_SLOTS.includes(c.cls) ? (fresh ? 3 : 4) : (fresh ? 2 : 3);
        if (curr) n += 1;
        slots.push(n);
    }
    if (c.level >= 19 && pcFeatures(c).some(f => PC_TENTH.includes(f.name))) {
        slots.push(...Array(10 - slots.length - 1).fill(0), 1);
        if (c.level >= 20 && PC_TENTH_MORE.some(k => pcHasFeat(c, k))) slots[9] = 2;
    }
    const font = c.cls === 'cleric' ? { n: c.level >= 15 ? 6 : c.level >= 5 ? 5 : 4, rank: slots[9] ? 10 : top, spell: c.deity.font } : null;
    return { trad, kind, attr, cantrips: 5 + (curr ? 1 : 0), slots, curr, font };
}

// Focus spells with no spell slots behind them: a ranger's warden spells and a monk's qi spells
// (from class feats), and the champion, ranger, and monk dedications' and the blessed one's and
// beastmaster's focus spells. Their tradition ('' = the player's call) and attribute, by class or
// archetype; the trait their spells carry is the same word.
const PC_FOCUS_ONLY = { ranger: ['primal', 'wis'], monk: ['', 'wis'], champion: ['divine', 'cha'], 'blessed-one': ['divine', 'cha'], beastmaster: ['primal', 'cha'] };

// The classes and archetypes whose focus spells a character can take: their own class, each
// multiclass dedication's, and the archetypes above.
function pcFocusSources(c) {
    const out = [c.cls, ...pcDedications(c).map(d => d.cls)];
    ['blessed-one', 'beastmaster'].forEach(a => { if (pcFeatAt(c, `${a}-dedication`)) out.push(a); });
    return [...new Set(out.filter(Boolean))];
}

// A character with no class spellcasting who casts focus spells → { trad, attr, from } or null.
// Trained in spell attack and DC once a spell is theirs (blessed one: from the start): one added in
// the Spell Planner, or one a feat names (that needs the spell data and the feat text).
function pcFocusOnly(c) {
    const src = pcFocusSources(c).find(k => Object.hasOwn(PC_FOCUS_ONLY, k));
    if (!src) return null;
    const has = src === 'blessed-one' || c.spells.focus.length > 0 || (typeof PF2E_SPELLS !== 'undefined'
        && pcActiveFeats(c).some(f => pcFocusInText(pcText('ft:' + f)).length));
    if (!has) return null;
    const [trad, attr] = PC_FOCUS_ONLY[src];
    return { trad, attr, from: src };
}

// ── Spell picks (the Spell Planner) ─────────────────────
// These need pf2e-spells-data.js; pcSpellGrants also needs the text file (pcLoadText).
const PC_RANK_WORDS = { cantrip: 0, cantrips: 0, '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7, '8th': 8, '9th': 9 };
// rep: a repertoire (spontaneous), list: the whole tradition (prepared), book: a spellbook or familiar.
const PC_SPELL_TYPES = { bard: 'rep', oracle: 'rep', sorcerer: 'rep', cleric: 'list', druid: 'list', wizard: 'book', witch: 'book' };
// Feats that add a choice's advanced or greater focus spell (bloodline, revelation, school).
const PC_FOCUS_TIERS = { advanced: ['advanced-bloodline', 'advanced-revelation', 'advanced-school-spell'], greater: ['greater-bloodline', 'greater-revelation'] };
const PC_FOCUS_HEADS = ['Bloodline Spells', 'Revelation Spells', 'School Spells', 'Order Spell'];
// The dedication feats that give the class choice's initial focus spell, and the choice text's heading for it.
const PC_MC_FOCUS = { wizard: ['arcane-school-spell', 'School Spells'], sorcerer: ['basic-bloodline-spell', 'Bloodline Spells'], oracle: ['first-revelation', 'Revelation Spells'], druid: ['order-spell', 'Order Spell'] };

function pcSpellKey(name) {
    const k = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return typeof PF2E_SPELLS !== 'undefined' && Object.hasOwn(PF2E_SPELLS, k) ? k : '';
}

// A focus spell, or a focus cantrip (a composition or hex cantrip: a cantrip on no tradition's list).
function pcIsFocus(k) {
    const s = PF2E_SPELLS[k];
    return !!s && (s.k === 'f' || (s.k === 'c' && !(s.td || []).length));
}

// What the class's spellcasting allows: pcCasting plus { type, top, ctLimit, rep [picks per rank],
// sig [ranks with a signature spell], book { cantrips, spells } (what a new book holds) }.
function pcSpellRules(c) {
    if (c.arcOf) return pcArcRules(c.arcBase, c.arcOf);
    const cast = pcCasting(c);
    if (!cast) return null;
    const type = cast.kind === 'focus' ? 'focus' : PC_SPELL_TYPES[c.cls] || 'list';
    const top = cast.slots.length;
    const out = { ...cast, type, top, ctLimit: cast.cantrips, rep: [], sig: [], book: null };
    if (type === 'rep') {
        out.rep = cast.slots.slice();
        // 10th rank (Magnum Opus, Bloodline Paragon, Oracular Clarity): two 10th-rank spells for its one slot.
        if (out.rep[9]) out.rep[9] = 2;
        if (c.level >= 3) out.sig = cast.slots.map((n, i) => i + 1).filter(r => r <= 9);
    }
    if (type === 'book') {
        const own = c.cls === 'witch' ? 6 : cast.curr ? 7 + Math.min(9, top) - 1 : 6; // 5 + lesson, curriculum, or unified's one
        out.book = { cantrips: 10, spells: own + 2 * (c.level - 1) };
    }
    return out;
}

// A class choice's text as [header, label, value]: "**Head** 1st: A; 2nd: B", "**Head**" then
// "- **1st:** A" lines, or "**Head** Value". sub picks a draconic exemplar's own gifts.
// "cantrip: Shield; 1st: Fear" or (Player Core 2) "cantrip Light, 1st: Heal" → [['cantrip', 'Shield'], ['1st', 'Fear']], or null.
const PC_LABEL_RE = /(?:^|[;,])\s*(cantrips?|initial|advanced|greater|\d(?:st|nd|rd|th))\b\s*:?\s*/gi;
function pcLabelSplit(rest) {
    const at = [...rest.matchAll(PC_LABEL_RE)];
    if (!at.length || at[0].index !== 0) return null;
    return at.map((m, i) => [m[1].toLowerCase(), rest.slice(m.index + m[0].length, i + 1 < at.length ? at[i + 1].index : rest.length).trim()]);
}

function pcTextPairs(text, sub = '') {
    const out = [];
    let head = '';
    String(text || '').split('\n').forEach(line => {
        // A draconic exemplar's or an elemental influence's gifts, kept only for the one picked (c.sub).
        let m = /^- \*\*(\w+)—(?:Tradition\*\*.*?\*\*)?Sorcerous Gifts\*\*\s*(.+?)(?:;\s*\*\*.*)?$/.exec(line);
        if (m) {
            if (m[1].toLowerCase() === sub) (pcLabelSplit(m[2]) || []).forEach(([l, v]) => out.push(['Sorcerous Gifts', l, v]));
            return;
        }
        m = /^- \*\*(.+?):\*\*\s*(.+)$/.exec(line);
        if (m && head) { out.push([head, m[1].trim().toLowerCase(), m[2]]); return; }
        m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(line);
        if (!m) { head = ''; return; }
        head = m[1].trim();
        const rest = m[2].trim();
        if (!rest) return;
        const parts = pcLabelSplit(rest);
        if (parts) parts.forEach(([l, v]) => out.push([head, l, v]));
        else out.push([head, '', rest]);
    });
    return out;
}

let pcFocusNames = null;
// Focus spells a text says you learn or gain, by name (sentences that offer a choice don't count).
function pcFocusInText(text) {
    if (!pcFocusNames) {
        pcFocusNames = Object.keys(PF2E_SPELLS).filter(pcIsFocus).map(k => [PF2E_SPELLS[k].n, k]).sort((a, b) => b[0].length - a[0].length);
    }
    const out = [];
    String(text || '').split(/(?<=[.!?])\s+|\n/).forEach(sen => {
        if (!/\b(learn|gain)s?\b/.test(sen) || /\b(or|either|choice|choose)\b/i.test(sen)) return;
        let rest = sen.replace(/\([^)]*\)/g, '');   // "(such as Fire Ray)" is an example, not a grant. B922
        pcFocusNames.forEach(([n, k]) => {
            const i = rest.indexOf(n);
            if (i < 0 || /\w/.test(rest[i - 1] || '') || /\w/.test(rest[i + n.length] || '')) return;
            out.push(k);
            rest = rest.slice(0, i) + rest.slice(i + n.length);
        });
    });
    return out;
}

// The spells the character gets without picking them: { list: [{ key, rank, from, counts, to }],
// curr: { rank: [keys] } (a wizard's curriculum), focus: [{ key, from }] }. counts: the spell takes
// one of the rank's repertoire picks (a sorcerous gift); to: 'rep' or 'book'.
function pcSpellGrants(c) {
    const out = { list: [], curr: {}, focus: [] };
    const r = pcSpellRules(c) || { top: 0 };
    const parts = pcParts(c);
    const feats = new Set([...pcActiveFeats(c), ...pcGrantedFeats(c).map(g => g.key).filter(Boolean)]);
    const names = v => v.replace(/\([^)]*\)/g, '').split(/,|\band\b/).map(pcSpellKey).filter(Boolean);
    const addFocus = (key, from) => { if (key && pcIsFocus(key) && !out.focus.some(f => f.key === key)) out.focus.push({ key, from }); };
    [[parts.ch, c.ch], [parts.ch2, c.ch2]].forEach(([x, id]) => {
        if (!x) return;
        const text = pcText('ch:' + id);
        pcTextPairs(text, c.sub).forEach(([head, label, value]) => {
            const rank = Object.hasOwn(PC_RANK_WORDS, label) ? PC_RANK_WORDS[label] : -1;
            if (head === 'Sorcerous Gifts' || head === 'Granted Spells' || head === 'Muse Spell') {
                const at = head === 'Muse Spell' ? 1 : rank;
                if (at < 0 || at > r.top) return;
                names(value).forEach(key => out.list.push({ key, rank: at, from: x.n, counts: head === 'Sorcerous Gifts' || (head === 'Granted Spells' && x.c === 'sorcerer'), to: 'rep' }));   // B923: Angelic's heading
            }
            if (head === 'Curriculum' && rank >= 0 && rank <= r.top) out.curr[rank] = names(value);
            if (PC_FOCUS_HEADS.includes(head)) {
                const ok = !label || label === 'initial' || (PC_FOCUS_TIERS[label] || []).some(f => feats.has(f));
                if (ok) names(value).forEach(k => addFocus(k, x.n));
            }
        });
        const hex = /You (?:gain|learn) the (.+?) hex\b/.exec(text);
        if (hex) addFocus(pcSpellKey(hex[1]), x.n);
        const fam = /familiar learns (.+?)\./.exec(text);
        // "your choice of Summon Animal or Summon Plant or Fungus": the one picked (c.sub), none until then.
        const famKeys = PC_FAM_CHOICE[id] ? (PC_FAM_CHOICE[id].includes(c.sub) ? [c.sub] : []) : fam ? names(fam[1]) : [];
        famKeys.forEach(key => out.list.push({ key, rank: PF2E_SPELLS[key].r, from: x.n, counts: false, to: 'book' }));
    });
    // Basic Bloodline Spell and the like: the dedication's class choice gives its initial focus spell.
    pcDedications(c).forEach(d => {
        const mf = PC_MC_FOCUS[d.cls];
        if (!mf || !d.ch || !feats.has(mf[0])) return;
        pcTextPairs(pcText('ch:' + pcMcPick(c, d.cls).ch)).forEach(([head, label, value]) => {
            if (head === mf[1] && (!label || label === 'initial')) names(value).forEach(k => addFocus(k, PF2E_FEATS[mf[0]].n));
        });
    });
    pcFeatures(c).forEach(f => pcFocusInText(pcText('cf:' + f.key)).forEach(k => addFocus(k, f.name)));
    feats.forEach(f => pcFocusInText(pcText('ft:' + f)).forEach(k => addFocus(k, PF2E_FEATS[f].n)));
    pcDeitySpells(c).forEach(key => out.list.push({ key, rank: PF2E_SPELLS[key].r, from: c.deity.name || 'Your deity', counts: false, to: 'list' }));
    return out;
}

// A cleric's deity's spells (c.spells.dy): on their list at their own rank, of any tradition or rarity.
function pcDeitySpells(c) {
    if (c.cls !== 'cleric' || c.arcOf) return [];
    return c.spells.dy.filter(k => PF2E_SPELLS[k] && PF2E_SPELLS[k].k === 's');
}

// Cantrips to pick: a sorcerer's gift cantrip is one of the five.
function pcCantripLimit(r, grants) {
    return r.ctLimit - grants.list.filter(g => g.to === 'rep' && g.rank === 0 && g.counts).length;
}

// A repertoire rank's picks: its slots, less the sorcerous gift at that rank.
function pcRepLimit(r, grants, n) {
    return (r.rep[n - 1] || 0) - grants.list.filter(g => g.to === 'rep' && g.rank === n && g.counts).length;
}

// Spells of the character's tradition up to a rank (0: cantrips), common ones unless rare is set,
// and a cleric's deity's spells.
function pcSpellPool(c, rank, rare = false) {
    const cast = pcCasting(c);
    if (!cast || !cast.trad) return [];
    const out = Object.keys(PF2E_SPELLS).filter(k => {
        const s = PF2E_SPELLS[k];
        return (rank === 0 ? s.k === 'c' && (!cast.ctAtk || pcAttackSpell(k)) : s.k === 's' && s.r <= rank) && (s.td || []).includes(cast.trad) && (rare || !s.ra);
    });
    if (rank > 0) pcDeitySpells(c).forEach(k => { if (PF2E_SPELLS[k].r <= rank && !out.includes(k)) out.push(k); });
    return out;
}

// A spell that makes a spell attack roll (the eldritch archer's cantrip has to).
function pcAttackSpell(k) {
    return /spell attack/i.test(PF2E_SPELLS[k].x || '');
}

// The focus spells (by trait) of the class, its dedications, and its focus archetypes that a
// character of this level can have.
function pcFocusPool(c) {
    const top = Math.ceil(c.level / 2), src = pcFocusSources(c);
    return Object.keys(PF2E_SPELLS).filter(k => pcIsFocus(k) && PF2E_SPELLS[k].r <= top && PF2E_SPELLS[k].tr.some(t => src.includes(t)));
}

// Every focus spell the character has, and the pool: one Focus Point per focus spell, up to 3
// (focus cantrips cost none and add none).
function pcFocus(c, grants = pcSpellGrants(c)) {
    const list = [...grants.focus];
    c.spells.focus.forEach(k => { if (pcIsFocus(k) && !list.some(f => f.key === k)) list.push({ key: k, from: '' }); });
    return { list, points: Math.min(3, list.filter(f => PF2E_SPELLS[f.key].k === 'f').length) };
}

// The picks as the Spell Planner keeps them (what no longer fits the class and level left out), for the
// Play Sheet and Cards to show; the save keeps the original until the player edits the spells. B748.
function pcFittedSpells(c, grants = pcSpellGrants(c)) {
    const copy = { ...c, spells: JSON.parse(JSON.stringify(c.spells)) };
    pcFitSpells(copy, grants);
    return copy.spells;
}

// Drop picks that no longer fit the class, level, and tradition (rare: uncommon spells allowed).
function pcFitSpells(c, grants = pcSpellGrants(c), rare = true) {
    const r = pcSpellRules(c);
    const s = c.spells;
    const S = k => PF2E_SPELLS[k];
    const fpool = new Set(pcFocusPool(c));
    s.focus = s.focus.filter(k => pcIsFocus(k) && (fpool.has(k) || grants.focus.some(f => f.key === k)));
    if (!r || r.type === 'focus') { Object.assign(s, { ct: [], rep: {}, book: [], prep: {}, sig: {}, dy: [] }); return; }
    s.dy = pcDeitySpells(c);
    const onList = k => S(k) && (S(k).td || []).includes(r.trad) && (rare || !S(k).ra);
    const given = new Set(grants.list.map(g => g.key));
    const ok = k => onList(k) || given.has(k);
    s.book = r.type === 'book' ? s.book.filter(k => ok(k) && (S(k).k === 'c' || (S(k).k === 's' && S(k).r <= r.top))) : [];
    const bookHas = k => s.book.includes(k) || grants.list.some(g => g.key === k && g.to === 'book');
    const ctGiven = grants.list.filter(g => g.to === 'rep' && g.rank === 0).map(g => g.key);
    s.ct = s.ct.filter(k => S(k).k === 'c' && !ctGiven.includes(k) && (!r.ctAtk || pcAttackSpell(k)) && (r.type === 'book' ? bookHas(k) : ok(k))).slice(0, pcCantripLimit(r, grants));
    const currSet = r.curr && grants.curr ? new Set(Object.values(grants.curr).flat()) : null;
    if (currSet && currSet.size) { let free = 0; const cap = pcCantripLimit(r, grants) - 1; s.ct = s.ct.filter(k => currSet.has(k) || ++free <= cap); }
    const rep = {};
    if (r.type === 'rep') {
        for (let n = 1; n <= r.top; n++) {
            const mine = grants.list.filter(g => g.to === 'rep' && g.rank === n);
            const keep = (s.rep[n] || []).filter(k => S(k).k === 's' && (n < 10 ? S(k).r <= n : S(k).r === 10) && ok(k) && !mine.some(g => g.key === k));
            if (keep.length) rep[n] = keep.slice(0, Math.max(0, pcRepLimit(r, grants, n)));
        }
    }
    s.rep = rep;
    const prep = {};
    if (r.type !== 'rep') {
        for (let n = 1; n <= r.top; n++) {
            const slots = r.slots[n - 1];
            if (!slots) continue;
            const row = (s.prep[n] || []).slice(0, slots).map((k, i) => {
                if (!k || S(k).k !== 's' || S(k).r > n) return '';
                if (r.curr && n <= 9 && i === slots - 1) return Object.values(grants.curr).flat().includes(k) && bookHas(k) ? k : '';
                return (r.type === 'book' ? bookHas(k) : ok(k)) ? k : '';
            });
            if (row.some(Boolean)) prep[n] = row;
        }
    }
    s.prep = prep;
    const sig = {};
    r.sig.forEach(n => {
        const k = s.sig[n];
        if (k && ((s.rep[n] || []).includes(k) || grants.list.some(g => g.to === 'rep' && g.rank === n && g.key === k))) sig[n] = k;
    });
    s.sig = sig;
}

// ── The whole sheet ─────────────────────────────────────
function pcStats(c) {
    const parts = pcParts(c);
    const { mods, partial } = pcAttrs(c);
    const prof = pcProfs(c);
    const L = c.level;
    const key = pcKey(c);
    const hp = pcAncHp(c) +(parts.cls ? (parts.cls.hp + mods.con) * L : 0) + (pcHasFeat(c, 'toughness') ? L : 0);
    const saves = Object.fromEntries(Object.entries(PC_SAVES).map(([k, [, a]]) => [k, mods[a] + pcBonus(prof[k], L)]));
    const cast = pcCasting(c);
    const spellAtk = cast ? mods[cast.attr || 'cha'] + pcBonus(prof.spell, L) : null;
    const { ranks, lores } = pcSkillRanks(c);
    // Each multiclass dedication's class DC (trained, its class's key attribute: the better one if it has two)
    // and each spellcasting archetype's spell attack and DC.
    const mcDc = pcDedications(c).filter(d => PC_MC[d.cls].dc).map(d => ({ cls: d.cls, n: d.n,
        dc: 10 + Math.max(...PF2E_CLASSES[d.cls].key.map(a => mods[a])) + pcBonus(1, L) }));
    const arcs = pcArcCastings(c).map(r => { const atk = mods[r.attr] + pcBonus(prof.spell, L); return { ...r, atk, dc: 10 + atk }; });
    // Armor's check penalty on Strength and Dexterity skills, unless you meet its Strength.
    const arm = pcArmor(c);
    const acp = arm && arm.cp < 0 && !(Number.isFinite(arm.st) && mods.str >= arm.st) ? arm.cp : 0;
    const skills = Object.fromEntries(Object.entries(PC_SKILLS).map(([k, a]) => [k, mods[a] + pcBonus(ranks[k], L) + (a === 'str' || a === 'dex' ? acp : 0)]));
    const loreMods = Object.fromEntries(Object.entries(lores).map(([n, r]) => [n, mods.int + pcBonus(r, L)]));
    return {
        parts, mods, partial, prof, key, hp, saves, ranks, skills, lores, loreMods, acp,
        per: mods.wis + pcBonus(prof.per, L),
        classdc: parts.cls ? 10 + (key ? mods[key] : 0) + pcBonus(prof.classdc, L) : null,
        spellAtk, spellDc: spellAtk === null ? null : 10 + spellAtk, cast, mcDc, arcs,
        ac: pcAC(c), speed: pcSpeed(c), strikes: pcStrikes(c)
    };
}

// What's still to choose, by step: [[step, text], ...].
function pcTodo(c) {
    const out = [];
    const p = pcParts(c);
    if (!p.anc) out.push(['ancestry', 'Pick an ancestry.']);
    else if (!p.her) out.push(['ancestry', 'Pick a heritage.']);
    if (!p.bg) out.push(['background', 'Pick a background.']);
    else {
        if (p.bg.skc && !pcBgSkill(c)) out.push(['background', `Pick the trained skill from your ${p.bg.n} background.`]);
        if (p.bg.loc && !pcBgLore(c)) out.push(['background', `Pick the Lore from your ${p.bg.n} background.`]);
        if (p.bg.lof && !p.bg.loc && !pcBgLore(c)) out.push(['background', `Name the Lore from your ${p.bg.n} background.`]);
    }
    if (!p.cls) out.push(['class', 'Pick a class.']);
    else {
        if (p.cls.ch && !p.ch) out.push(['class', `Pick your ${p.cls.ch[1].toLowerCase()}.`]);
        if (p.cls.ch2 && !p.ch2) out.push(['class', `Pick your ${p.cls.ch2[1].toLowerCase()}.`]);
        if (p.ch && p.ch.skc && !p.ch.skc.includes(c.skills.ch)) out.push(['class', `Pick the skill from your ${p.ch.n}.`]);
        if (p.ch && p.ch.tr === 'choice' && !PC_TRADITIONS.includes(c.sub)) out.push(['class', 'Pick your bloodline\'s tradition.']);
        if (c.ch === 'bloodline-elemental' && !PC_ELEMENTS.includes(c.sub)) out.push(['class', 'Pick your elemental influence.']);
        if (PC_FAM_CHOICE[c.ch] && !PC_FAM_CHOICE[c.ch].includes(c.sub)) out.push(['class', 'Pick the spell your familiar learns.']);
        if ((c.cls === 'cleric' || c.cls === 'champion') && !c.deity.skill) out.push(['class', 'Pick your deity\'s skill.']);
        if (c.cls === 'cleric' && !c.deity.font) out.push(['class', 'Pick your divine font.']);
    }
    const sets = [...pcAncSets(c), ...pcBgSets(c)];
    const boostsLeft = sets.filter(([, a]) => !a).length + (p.cls && !pcKey(c) ? 1 : 0) + (4 - pcUniqBoosts(c.boosts.l1).length)
        + PC_BOOST_LEVELS.filter(l => l <= c.level).reduce((n, l) => n + 4 - (c.boosts[l] || []).filter(Boolean).length, 0);
    if (p.anc || p.bg || p.cls) if (boostsLeft) out.push(['attributes', `${boostsLeft} attribute boost${boostsLeft === 1 ? '' : 's'} to place.`]);
    if (p.cls) {
        const picks = pcSkillPicks(c);
        const left = picks - pcPickedSkills(c).length;
        if (left) out.push(['skills', `${left} trained skill${left === 1 ? '' : 's'} to pick.`]);
        const or = PC_SKILL_OR[c.cls];
        if (or && !left && !or.some(k => pcSkillRanks(c, 1).ranks[k])) out.push(['skills', `A ${p.cls.n.toLowerCase()} is trained in ${or.map(pcCap).join(' or ')}: make one of your picks one of those.`]);
        const incs = pcIncSlots(c);
        const inc = incs.filter(s => !c.skills.inc[s.key]).length;
        incs.filter(s => s.only && c.skills.inc[s.key] && !s.only.includes(c.skills.inc[s.key])).forEach(s => out.push(['skills', `Your level ${s.level} Stylish Tricks increase has to go to ${s.only.map(pcCap).join(' or ')}: pick again.`]));
        pcFeatSlots(c).forEach(s => {
            const lim = s.kind === 'skf' && c.feats[s.slot] && pcSkillFeatLimit(c, s.level);
            if (lim && !pcSkillFeatFits(PF2E_FEATS[c.feats[s.slot]], lim.skills)) out.push(['feats', `${PF2E_FEATS[c.feats[s.slot]].n} doesn't fit your level ${s.level} ${lim.name} slot: pick again.`]);
        });
        if (c.cls === 'fighter' && c.level >= 5 && !pcFighterGroup(c, 5)) out.push(['class', 'Pick the weapon group for Fighter Weapon Mastery.']);
        if (inc) out.push(['skills', `${inc} skill increase${inc === 1 ? '' : 's'} to place.`]);
        const feats = pcFeatSlots(c).filter(s => !c.feats[s.slot]).length;
        if (feats) out.push(['feats', `${feats} feat${feats === 1 ? '' : 's'} to pick.`]);
        const paths = pcPathPicks(c).map(([l]) => l);
        Object.keys(p.cls.pp || {}).filter(l => Number(l) <= c.level && !paths.includes(l)).forEach(l => out.push(['class', `Pick the save for your level ${l} Path to Perfection.`]));
        pcDedications(c).forEach(d => { if (d.todo.length) out.push(['feats', `${d.n} Dedication: ${d.todo.join(', ')}.`]); });
    }
    return out;
}

// One line: "Level 3 Dwarf Fighter".
function pcLine(c) {
    const p = pcParts(c);
    return [`Level ${c.level}`, p.her && !p.her.a ? p.her.n : '', p.anc ? p.anc.n : '', p.cls ? p.cls.n : ''].filter(Boolean).join(' ');
}

// A row for the Party tab (party.js cleanPartyMember): Perception is the initiative.
function pcPartyRow(c) {
    const s = pcStats(c);
    return { id: c.id, name: c.name || 'Unnamed hero', player: c.player, cls: s.parts.cls ? s.parts.cls.n : '', level: c.level,
        ac: s.ac.ac, hp: s.hp || null, init: s.per + pcInitBonus(c) };
}

// A circumstance bonus to Perception for initiative: the fighter's Battlefield Surveyor (level 7).
function pcInitBonus(c) {
    return c.cls === 'fighter' && pcFeatures(c).some(f => f.key === 'battlefield-surveyor') ? 2 : 0;
}

// The rules text for a feat (ft:), class feature (cf:), or class choice (ch:), once
// pf2e-character-text.js has loaded. pcLoadText(done) loads it the first time.
let pcTextState = 0; // 0 not asked, 1 loading, 2 loaded, 3 failed
const pcTextWaiting = [];
function pcLoadText(done) {
    if (pcTextState === 2 || pcTextState === 3) { done(pcTextState === 2); return; }
    pcTextWaiting.push(done);
    if (pcTextState === 1) return;
    pcTextState = 1;
    const s = document.createElement('script');
    s.src = 'pf2e-character-text.js';
    s.onload = () => { pcTextState = typeof PF2E_CHAR_TEXT === 'undefined' ? 3 : 2; pcTextWaiting.splice(0).forEach(f => f(pcTextState === 2)); };
    s.onerror = () => { pcTextState = 3; pcTextWaiting.splice(0).forEach(f => f(false)); };
    document.head.appendChild(s);
}

// key may end in "|<class id>": a class feature text written for several classes ("**Bard** ...",
// "**Oracle** ...") then shows only that class's part.
function pcText(key) {
    let cls = '';
    if (typeof key === 'string' && key.includes('|')) [key, cls] = key.split('|');
    if (pcTextState !== 2 || !Object.hasOwn(PF2E_CHAR_TEXT, key)) return '';
    const t = PF2E_CHAR_TEXT[key];
    if (cls && Object.hasOwn(PF2E_CLASSES, cls)) {
        const head = /^\*\*([A-Z][a-z]+)\*\* /, lines = t.split('\n'), name = PF2E_CLASSES[cls].n;
        if (head.test(lines[0]) && lines.some(l => (l.match(head) || [])[1] === name)) {
            const out = [];
            let on = false;
            lines.forEach(l => { const m = l.match(head); if (m) on = m[1] === name; if (on) out.push(m ? l.replace(head, '') : l); });
            return out.join('\n');
        }
    }
    // A dedication's text ends with its archetype's name on a line (a link to the archetype's page in the source).
    const m = /^ft:(.+)-dedication$/.exec(key);
    if (m) { const lines = t.split('\n'); if (lines[lines.length - 1].toLowerCase().replace(/[^a-z]+/g, '-') === m[1]) return lines.slice(0, -1).join('\n'); }
    return t;
}
