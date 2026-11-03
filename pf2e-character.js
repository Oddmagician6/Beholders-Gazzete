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
// Casters whose spells use another attribute than their key one.
const PC_SPELL_ATTR = { champion: 'cha' };
// The cleric's deity's favored weapon: rank by level for each doctrine.
const PC_FAVORED = { 'cloistered-cleric': { 1: 1, 11: 2 }, warpriest: { 1: 1, 7: 2, 19: 3 } };
const PC_DIVINE_FONTS = { heal: 'Healing font (heal)', harm: 'Harmful font (harm)' };
const PC_TRADITIONS = ['arcane', 'divine', 'occult', 'primal'];
// The level-19 features that give one 10th-rank slot.
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
        skills: { cls: [], ch: '', inc: {}, lore: [] }, paths: {}, feats: {}, langs: [],
        deity: { name: '', weapon: '', font: '', skill: '' },
        gear: { armor: '', arPot: 0, shield: '', weapons: [] }, notes: '', updated: Date.now()
    };
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
    c.sub = PC_TRADITIONS.includes(raw.sub) ? raw.sub : '';
    const b = raw.boosts && typeof raw.boosts === 'object' ? raw.boosts : {};
    c.boosts.anc = pcAbilList(b.anc, 4);
    c.boosts.ancFree = b.ancFree === true;
    c.boosts.bg = pcAbilList(b.bg, 3);   // Amnesiac has three
    c.boosts.key = PC_ABILS.includes(b.key) ? b.key : '';
    c.boosts.l1 = pcAbilList(b.l1, 4);
    PC_BOOST_LEVELS.forEach(l => { c.boosts[l] = pcAbilList(b[l], 4); });
    const s = raw.skills && typeof raw.skills === 'object' ? raw.skills : {};
    c.skills.cls = Array.isArray(s.cls) ? [...new Set(s.cls.filter(k => Object.hasOwn(PC_SKILLS, k)))].slice(0, 24) : [];
    c.skills.ch = Object.hasOwn(PC_SKILLS, s.ch) ? s.ch : '';
    if (s.inc && typeof s.inc === 'object') {
        for (const [lv, k] of Object.entries(s.inc)) if (/^\d{1,2}$/.test(lv) && (Object.hasOwn(PC_SKILLS, k) || /^lore:/.test(k))) c.skills.inc[lv] = pcStr(k, 50);
    }
    c.skills.lore = Array.isArray(s.lore) ? s.lore.map(x => pcStr(x, 40)).filter(Boolean).slice(0, 6) : [];
    if (raw.paths && typeof raw.paths === 'object') {
        for (const [lv, k] of Object.entries(raw.paths)) if (/^\d{1,2}$/.test(lv) && Object.hasOwn(PC_SAVES, k)) c.paths[lv] = k;
    }
    if (raw.feats && typeof raw.feats === 'object') {
        for (const [slot, f] of Object.entries(raw.feats)) if (/^[a-z]{2,4}\d{1,2}$/.test(slot) && Object.hasOwn(PF2E_FEATS, f)) c.feats[slot] = f;
    }
    c.langs = Array.isArray(raw.langs) ? raw.langs.map(x => pcStr(x, 30)).filter(Boolean).slice(0, 12) : [];
    const d = raw.deity && typeof raw.deity === 'object' ? raw.deity : {};
    c.deity = { name: pcStr(d.name, 60), weapon: pcId(d.weapon, PF2E_ITEMS), font: Object.hasOwn(PC_DIVINE_FONTS, d.font) ? d.font : '', skill: Object.hasOwn(PC_SKILLS, d.skill) ? d.skill : '' };
    const g = raw.gear && typeof raw.gear === 'object' ? raw.gear : {};
    const rune = v => Math.min(3, Math.max(0, Math.round(Number(v)) || 0));
    c.gear = {
        armor: pcId(g.armor, PF2E_ITEMS), arPot: rune(g.arPot), shield: pcId(g.shield, PF2E_ITEMS),
        weapons: Array.isArray(g.weapons) ? g.weapons.filter(w => w && Object.hasOwn(PF2E_ITEMS, w.id)).slice(0, 8)
            .map(w => ({ id: w.id, pot: rune(w.pot), str: rune(w.str) })) : []
    };
    c.notes = pcStr(raw.notes, 4000);
    c.updated = Number.isFinite(raw.updated) ? raw.updated : Date.now();
    return c;
}

function pcLoadAll() {
    try {
        const saved = JSON.parse(localStorage.getItem(PC_KEY));
        if (Array.isArray(saved)) return saved.map(pcClean).filter(Boolean).slice(0, PC_MAX);
    } catch (e) {}
    return [];
}

function pcSave(c) {
    c.updated = Date.now();
    const list = [c, ...pcLoadAll().filter(x => x.id !== c.id)].slice(0, PC_MAX);
    try { localStorage.setItem(PC_KEY, JSON.stringify(list)); } catch (e) { return null; }
    return list;
}

function pcDelete(id) {
    const list = pcLoadAll().filter(x => x.id !== id);
    try { localStorage.setItem(PC_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
}

// ── What the character is made of ────────────────────────
function pcParts(c) {
    const cls = PF2E_CLASSES[c.cls] || null;
    const ch = PF2E_CHOICES[c.ch] && cls && PF2E_CHOICES[c.ch].c === c.cls ? PF2E_CHOICES[c.ch] : null;
    const ch2 = PF2E_CHOICES[c.ch2] && cls && PF2E_CHOICES[c.ch2].c === c.cls ? PF2E_CHOICES[c.ch2] : null;
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
function pcAncSets(c) {
    const { anc } = pcParts(c);
    if (!anc) return [];
    if (c.boosts.ancFree) return [[PC_ABILS, c.boosts.anc[0] || ''], [PC_ABILS, c.boosts.anc[1] || '']];
    return anc.bo.map((set, i) => {
        const opts = set[0] === 'free' ? PC_ABILS : set;
        return [opts, opts.length === 1 ? opts[0] : (c.boosts.anc[i] || '')];
    });
}

function pcBgSets(c) {
    const { bg } = pcParts(c);
    if (!bg) return [];
    return bg.bo.map((set, i) => {
        const opts = set[0] === 'free' ? PC_ABILS : set;
        return [opts, opts.length === 1 ? opts[0] : (c.boosts.bg[i] || '')];
    });
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
    c.boosts.l1.forEach(add);
    PC_BOOST_LEVELS.filter(l => l <= level).forEach(l => (c.boosts[l] || []).forEach(add));
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
    r.spell = cls.cast ? 1 : 0;
    const up = steps => Object.entries(steps || {}).forEach(([lv, s]) => {
        if (Number(lv) > level) return;
        Object.entries(s).forEach(([k, v]) => { r[k] = Math.max(r[k] || 0, v); });
    });
    up(cls.st);
    if (ch) up(ch.st);
    // The monk's Paths to Perfection: a chosen save to master, then one to legendary.
    Object.entries(cls.pp || {}).forEach(([lv, rank]) => {
        const save = c.paths[lv];
        if (Number(lv) <= level && save) r[save] = Math.max(r[save], rank);
    });
    return r;
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
    return Math.max(0, cls.sk.extra + pcAttrs(c).mods.int + dupes);
}

// The class's free picks that count: ones another source now gives don't, nor any past the limit.
function pcPickedSkills(c) {
    const given = new Set(pcGivenSkills(c).map(([k]) => k));
    return c.skills.cls.filter(k => !given.has(k)).slice(0, pcSkillPicks(c));
}

// Each skill's rank (and the Lores), from training and the skill increases taken so far.
function pcSkillRanks(c, level = c.level) {
    const ranks = Object.fromEntries(Object.keys(PC_SKILLS).map(k => [k, 0]));
    pcGivenSkills(c).forEach(([k]) => { ranks[k] = 1; });
    pcPickedSkills(c).forEach(k => { ranks[k] = 1; });
    const lores = {};
    pcLores(c).forEach(l => { lores[l] = 1; });
    const { cls } = pcParts(c);
    (cls ? cls.lv.inc : []).filter(l => l <= level).forEach(l => {
        const k = c.skills.inc[l];
        if (!k) return;
        if (k.startsWith('lore:')) { const n = k.slice(5); if (Object.hasOwn(lores, n)) lores[n] = Math.min(pcRankCap(l), lores[n] + 1); }
        else if (ranks[k] < pcRankCap(l)) ranks[k] += 1;
    });
    return { ranks, lores };
}

// The highest rank a skill increase at this level can reach.
function pcRankCap(level) {
    return level >= 15 ? 4 : level >= 7 ? 3 : 2;
}

function pcLores(c) {
    const { bg } = pcParts(c);
    return [...new Set([...(bg ? bg.lo : []), ...c.skills.lore])];
}

// ── Feats ───────────────────────────────────────────────
const PC_SLOT_KINDS = {
    anc: ['Ancestry feat', 'anc'], cls: ['Class feat', 'cls'], gen: ['General feat', 'gen'], skf: ['Skill feat', 'skf']
};

// Every feat slot up to the character's level: { slot, kind, level, label }.
function pcFeatSlots(c, level = c.level) {
    const { cls } = pcParts(c);
    if (!cls) return [];
    const out = [];
    Object.entries(PC_SLOT_KINDS).forEach(([kind, [label, lvKey]]) => {
        cls.lv[lvKey].filter(l => l <= level).forEach(l => out.push({ slot: kind + l, kind, level: l, label }));
    });
    const order = { anc: 0, cls: 1, skf: 2, gen: 3 };
    return out.sort((a, b) => a.level - b.level || order[a.kind] - order[b.kind]);
}

// Feats the character has without a slot: background, class choice, warpriest's Shield Block.
function pcGrantedFeats(c) {
    const { bg, ch, ch2 } = pcParts(c);
    const out = [];
    const grant = (name, from) => out.push({ name, key: pcFeatKey(name), from });
    if (bg) (bg.ft || []).forEach(n => grant(n, bg.n));
    [ch, ch2].forEach(x => { if (x) (x.ft || []).forEach(n => grant(n, x.n)); });
    if (c.ch === 'warpriest') grant('Shield Block', 'Warpriest');
    return out;
}

function pcFeatKey(name) {
    const k = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return Object.hasOwn(PF2E_FEATS, k) ? k : '';
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
    const taken = new Set(Object.entries(c.feats).filter(([s]) => s !== slot).map(([, f]) => f));
    pcGrantedFeats(c).forEach(g => { if (g.key) taken.add(g.key); });
    const traits = pcAncestryTraits(c);
    const out = [];
    for (const [key, f] of Object.entries(PF2E_FEATS)) {
        if (f.l > level) continue;
        let fits = false;
        if (kind === 'anc') fits = f.c === 'ancestry' && f.tr.some(t => traits.includes(t));
        else if (kind === 'cls') fits = f.c === 'class' && (f.ar ? archetype : f.tr.includes(c.cls));
        else if (kind === 'skf') fits = f.c === 'skill';
        else if (kind === 'gen') fits = f.c === 'general' || f.c === 'skill';
        if (!fits) continue;
        if (kind === 'cls' && f.ar && f.c === 'class' && !archetype) continue;
        out.push({ key, feat: f, taken: taken.has(key) && !(f.mx > 1) });
    }
    return out.sort((a, b) => b.feat.l - a.feat.l || a.feat.n.localeCompare(b.feat.n));
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
    const item = (a ? a.ac || 0 : 0) + (c.gear.arPot || 0);
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
    return sp;
}

// Weapon specialization damage by rank (expert 2, master 3, legendary 4), doubled by the greater one.
function pcSpecDamage(c, rank) {
    if (rank < 2) return 0;
    const greater = pcFeatures(c).some(f => /^Greater Weapon Specialization/.test(f.name));
    const base = pcHasFeature(c, 'Weapon Specialization') ? rank : 0;
    return greater ? base * 2 : base;
}

function pcWeaponRank(c, w, prof) {
    const cat = w.ct === 'unarmed' ? 'unarmed' : w.ct;
    let rank = prof[cat] || 0;
    if (c.deity.weapon && c.deity.weapon === w.key) rank = Math.max(rank, pcFavoredRank(c));
    return rank;
}

// The character's Strikes: their weapons and a fist. Each: { name, atk: [3 MAP steps], dmg, traits, rank }.
function pcStrikes(c) {
    const { mods } = pcAttrs(c);
    const prof = pcProfs(c);
    const rows = c.gear.weapons.map(w => ({ ...PF2E_ITEMS[w.id], key: w.id, pot: w.pot, str: w.str }))
        .filter(w => w.k === 'w');
    rows.push({ n: 'Fist', key: '', ct: 'unarmed', dm: '1d4 B', tr: ['agile', 'finesse', 'nonlethal', 'unarmed'], pot: 0, str: 0 });
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
        if (!ranged) bonus = mods.str;
        else if (tr.some(t => /^thrown/.test(t))) bonus = mods.str;
        else if (tr.includes('propulsive')) bonus = mods.str > 0 ? Math.floor(mods.str / 2) : mods.str;
        bonus += pcSpecDamage(c, rank);
        const dmg = dice ? `${dice}${bonus ? (bonus > 0 ? ' + ' : ' − ') + Math.abs(bonus) : ''} ${m[3] || ''}`.trim() : '';
        return { name: w.n + (w.pot ? ` +${w.pot}` : '') + (w.str ? ` (${['', 'striking', 'greater striking', 'major striking'][w.str]})` : ''),
            atk, dmg, traits: tr, rank, ranged, range: w.rg || 0 };
    });
}

// ── Spells ──────────────────────────────────────────────
// The class's casting: { trad, kind, attr, cantrips, slots: [count per rank 1..10] } or null.
function pcCasting(c) {
    const { cls, ch } = pcParts(c);
    if (!cls || !cls.cast) return null;
    const [trad0, kind] = cls.cast;
    let trad = trad0;
    if (ch && ch.tr) trad = ch.tr === 'choice' ? c.sub : ch.tr;
    const attr = PC_SPELL_ATTR[c.cls] || pcKey(c);
    if (kind === 'focus') return { trad, kind, attr, cantrips: 0, slots: [] };
    const top = Math.min(9, Math.ceil(c.level / 2));
    const slots = [];
    for (let r = 1; r <= top; r++) {
        const fresh = c.level === 2 * r - 1; // the level a rank opens: 2 slots (3 for a sorcerer)
        let n = c.cls === 'sorcerer' ? (fresh ? 3 : 4) : (fresh ? 2 : 3);
        if (c.cls === 'wizard') n += 1; // the curriculum slot
        slots.push(n);
    }
    if (c.level >= 19 && pcFeatures(c).some(f => PC_TENTH.includes(f.name))) slots.push(...Array(10 - slots.length - 1).fill(0), 1);
    return { trad, kind, attr, cantrips: 5 + (c.cls === 'wizard' ? 1 : 0), slots };
}

// ── The whole sheet ─────────────────────────────────────
function pcStats(c) {
    const parts = pcParts(c);
    const { mods, partial } = pcAttrs(c);
    const prof = pcProfs(c);
    const L = c.level;
    const key = pcKey(c);
    const hp = (parts.anc ? parts.anc.hp : 0) + (parts.cls ? (parts.cls.hp + mods.con) * L : 0);
    const saves = Object.fromEntries(Object.entries(PC_SAVES).map(([k, [, a]]) => [k, mods[a] + pcBonus(prof[k], L)]));
    const cast = pcCasting(c);
    const spellAtk = cast ? mods[cast.attr || 'cha'] + pcBonus(prof.spell, L) : null;
    const { ranks, lores } = pcSkillRanks(c);
    const skills = Object.fromEntries(Object.entries(PC_SKILLS).map(([k, a]) => [k, mods[a] + pcBonus(ranks[k], L)]));
    const loreMods = Object.fromEntries(Object.entries(lores).map(([n, r]) => [n, mods.int + pcBonus(r, L)]));
    return {
        parts, mods, partial, prof, key, hp, saves, ranks, skills, lores, loreMods,
        per: mods.wis + pcBonus(prof.per, L),
        classdc: parts.cls ? 10 + (key ? mods[key] : 0) + pcBonus(prof.classdc, L) : null,
        spellAtk, spellDc: spellAtk === null ? null : 10 + spellAtk, cast,
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
    if (!p.cls) out.push(['class', 'Pick a class.']);
    else {
        if (p.cls.ch && !p.ch) out.push(['class', `Pick your ${p.cls.ch[1].toLowerCase()}.`]);
        if (p.cls.ch2 && !p.ch2) out.push(['class', `Pick your ${p.cls.ch2[1].toLowerCase()}.`]);
        if (p.ch && p.ch.skc && !p.ch.skc.includes(c.skills.ch)) out.push(['class', `Pick the skill from your ${p.ch.n}.`]);
        if (p.ch && p.ch.tr === 'choice' && !c.sub) out.push(['class', 'Pick your bloodline\'s tradition.']);
        if ((c.cls === 'cleric' || c.cls === 'champion') && !c.deity.skill) out.push(['class', 'Pick your deity\'s skill.']);
        if (c.cls === 'cleric' && !c.deity.font) out.push(['class', 'Pick your divine font.']);
    }
    const sets = [...pcAncSets(c), ...pcBgSets(c)];
    const boostsLeft = sets.filter(([, a]) => !a).length + (p.cls && !pcKey(c) ? 1 : 0) + (4 - c.boosts.l1.filter(Boolean).length)
        + PC_BOOST_LEVELS.filter(l => l <= c.level).reduce((n, l) => n + 4 - (c.boosts[l] || []).filter(Boolean).length, 0);
    if (p.anc || p.bg || p.cls) if (boostsLeft) out.push(['attributes', `${boostsLeft} attribute boost${boostsLeft === 1 ? '' : 's'} to place.`]);
    if (p.cls) {
        const picks = pcSkillPicks(c);
        const left = picks - pcPickedSkills(c).length;
        if (left) out.push(['skills', `${left} trained skill${left === 1 ? '' : 's'} to pick.`]);
        const inc = p.cls.lv.inc.filter(l => l <= c.level && !c.skills.inc[l]).length;
        if (inc) out.push(['skills', `${inc} skill increase${inc === 1 ? '' : 's'} to place.`]);
        const feats = pcFeatSlots(c).filter(s => !c.feats[s.slot]).length;
        if (feats) out.push(['feats', `${feats} feat${feats === 1 ? '' : 's'} to pick.`]);
        Object.keys(p.cls.pp || {}).filter(l => Number(l) <= c.level && !c.paths[l]).forEach(l => out.push(['class', `Pick the save for your level ${l} Path to Perfection.`]));
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
        ac: s.ac.ac, hp: s.hp || null, init: s.per };
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

function pcText(key) {
    return pcTextState === 2 && Object.hasOwn(PF2E_CHAR_TEXT, key) ? PF2E_CHAR_TEXT[key] : '';
}
