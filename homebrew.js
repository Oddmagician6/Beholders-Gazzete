/* ============================================
   HOMEBREW MONSTERS (F52): the data side, no page needed
   A homebrew monster is plain data (the model below). Saved ones live in the campaign
   notebook (notebook.js) as entries of kind 'monster' whose `mon` field holds the monster,
   so the notebook's export, import, and the site backup carry them.
     { name, size: T|S|M|L|H|G, type, tags, align, ac, acNote,
       hd (hit dice), hdie (0 = the size's die), hpFlat (0 = roll from the dice),
       speed: { walk, burrow, climb, fly, swim, hover }, ab: [Str..Cha],
       saves: [6 booleans], skills: { perception: 1 (proficient) | 2 (expertise) },
       vuln, resist, immune, condImm, senses: { blind, blindBeyond, dark, tremor, truesight },
       langs, tele, cr: 'auto' | an SRD CR, dpr/atk/dc: numbers that replace the estimate's
       own reading of the actions (null = read them),
       tr, ac2, ba, re, le: features, legN (legendary actions a round) }
   A feature is { name, text } or an attack { name, text, atk: { kind, abil, reach, range,
   target, dice, type, dice2, type2 } } whose line is written from the current scores.
   Feature text may hold tokens: {name} / {Name} ("the ogre" / "The ogre"), {atk:str} (+5),
   {dc:wis} (13), and {dmg:2d6+str} ("12 (2d6 + 5)").
   - hbClean(raw): a clean monster from untrusted data, or null.
   - hbBlock(mon): the stat block in monster-statblocks.js's shape, so toolbox-statblock.js
     draws it (m.block).
   - hbEstimateCr(mon): the CR-by-numbers estimate. Defensive CR from effective hit points and
     Armor Class, offensive CR from damage per round and attack bonus or save DC, averaged;
     `steps` writes out each step.
   - hbFromSrd(id): an SRD monster as a homebrew starting point (MONSTER_BLOCKS loaded).
   - hbRow(mon, id): a monsters-data.js row with the block attached, for Encounter and
     Initiative. hbRegister() puts the notebook's monsters into MONSTER_BY_ID as
     'hb-<entry id>' (not into MONSTERS, so rolled encounters stay SRD only).
   - hbShareCode(mon) / hbFromShareCode(code): one monster as a URL-safe code (rng.js).
   Needs rng.js; hbRegister and hbSaved need notebook.js, and hbRow/hbRegister need
   monsters-data.js + encounter-engine.js (MONSTER_BY_ID) on the page.
   ============================================ */

const HB_PREFIX = 'hb-';
const HB_LIMITS = { name: 60, word: 40, note: 60, line: 300, featName: 80, text: 3000, feats: 20, share: 8000 };
const HB_SIZES = { T: ['Tiny', 4], S: ['Small', 6], M: ['Medium', 8], L: ['Large', 10], H: ['Huge', 12], G: ['Gargantuan', 20] };
const HB_TYPES = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];
const HB_ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const HB_ABIL_NAMES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
const HB_SKILLS = {
    acrobatics: ['Acrobatics', 1], 'animal handling': ['Animal Handling', 4], arcana: ['Arcana', 3], athletics: ['Athletics', 0],
    deception: ['Deception', 5], history: ['History', 3], insight: ['Insight', 4], intimidation: ['Intimidation', 5],
    investigation: ['Investigation', 3], medicine: ['Medicine', 4], nature: ['Nature', 3], perception: ['Perception', 4],
    performance: ['Performance', 5], persuasion: ['Persuasion', 5], religion: ['Religion', 3], 'sleight of hand': ['Sleight of Hand', 1],
    stealth: ['Stealth', 1], survival: ['Survival', 4]
};
const HB_SPEEDS = ['walk', 'burrow', 'climb', 'fly', 'swim'];
const HB_SENSES = [['blind', 'blindsight'], ['dark', 'darkvision'], ['tremor', 'tremorsense'], ['truesight', 'truesight']];
const HB_SECTIONS = [['tr', 'Traits'], ['ac2', 'Actions'], ['ba', 'Bonus Actions'], ['re', 'Reactions'], ['le', 'Legendary Actions']];
const HB_DAMAGE = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
// kind: [label in the line, melee?, ranged?, spell?]
const HB_ATTACKS = {
    mw: ['Melee Weapon Attack', true, false, false],
    rw: ['Ranged Weapon Attack', false, true, false],
    mrw: ['Melee or Ranged Weapon Attack', true, true, false],
    ms: ['Melee Spell Attack', true, false, true],
    rs: ['Ranged Spell Attack', false, true, true]
};

// The monster statistics by challenge rating that the estimate reads:
// [CR, proficiency, AC, lowest HP, highest HP, attack bonus, lowest damage/round, highest, save DC]
const HB_CR_TABLE = [
    ['0', 2, 13, 1, 6, 3, 0, 1, 13], ['1/8', 2, 13, 7, 35, 3, 2, 3, 13], ['1/4', 2, 13, 36, 49, 3, 4, 5, 13],
    ['1/2', 2, 13, 50, 70, 3, 6, 8, 13], ['1', 2, 13, 71, 85, 3, 9, 14, 13], ['2', 2, 13, 86, 100, 3, 15, 20, 13],
    ['3', 2, 13, 101, 115, 4, 21, 26, 13], ['4', 2, 14, 116, 130, 5, 27, 32, 14], ['5', 3, 15, 131, 145, 6, 33, 38, 15],
    ['6', 3, 15, 146, 160, 6, 39, 44, 15], ['7', 3, 15, 161, 175, 6, 45, 50, 15], ['8', 3, 16, 176, 190, 7, 51, 56, 16],
    ['9', 4, 16, 191, 205, 7, 57, 62, 16], ['10', 4, 17, 206, 220, 7, 63, 68, 16], ['11', 4, 17, 221, 235, 8, 69, 74, 17],
    ['12', 4, 17, 236, 250, 8, 75, 80, 17], ['13', 5, 18, 251, 265, 8, 81, 86, 18], ['14', 5, 18, 266, 280, 8, 87, 92, 18],
    ['15', 5, 18, 281, 295, 8, 93, 98, 18], ['16', 5, 18, 296, 310, 9, 99, 104, 18], ['17', 6, 19, 311, 325, 10, 105, 110, 19],
    ['18', 6, 19, 326, 340, 10, 111, 116, 19], ['19', 6, 19, 341, 355, 10, 117, 122, 19], ['20', 6, 19, 356, 400, 10, 123, 140, 19],
    ['21', 7, 19, 401, 445, 11, 141, 158, 20], ['22', 7, 19, 446, 490, 11, 159, 176, 20], ['23', 7, 19, 491, 535, 11, 177, 194, 20],
    ['24', 7, 19, 536, 580, 12, 195, 212, 21], ['25', 8, 19, 581, 625, 12, 213, 230, 21], ['26', 8, 19, 626, 670, 12, 231, 248, 21],
    ['27', 8, 19, 671, 715, 13, 249, 266, 22], ['28', 8, 19, 716, 760, 13, 267, 284, 22], ['29', 9, 19, 761, 805, 13, 285, 302, 22],
    ['30', 9, 19, 806, 850, 14, 303, 320, 23]
];
const HB_CRS = HB_CR_TABLE.map(r => r[0]);
const HB_XP = [10, 25, 50, 100, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000,
    18000, 20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000];

// ── Small helpers ─────────────────────────────────────────
function hbMod(score) {
    return Math.floor((score - 10) / 2);
}

function hbSigned(n) {
    return n >= 0 ? `+${n}` : `−${-n}`;
}

function hbCrValue(cr) {
    return cr.includes('/') ? 1 / Number(cr.split('/')[1]) : Number(cr);
}

function hbPb(cr) {
    return HB_CR_TABLE[Math.max(0, HB_CRS.indexOf(cr))][1];
}

function hbXp(cr) {
    return HB_XP[Math.max(0, HB_CRS.indexOf(cr))];
}

function hbText(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[^\S\n]+/g, ' ').trim().slice(0, max) : '';
}

function hbLine(v, max) {
    return hbText(v, max).replace(/\s+/g, ' ');
}

function hbInt(v, lo, hi, def) {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : def;
}

// An optional number: null when left empty.
function hbOpt(v, lo, hi) {
    return v === null || v === undefined || v === '' ? null : hbInt(v, lo, hi, null);
}

function hbDie(mon) {
    return mon.hdie || HB_SIZES[mon.size][1];
}

// "2d6", "2d6+1", "1d4 - 1", or a flat "1" → { n, d, k }, or null.
function hbDice(s) {
    const m = String(s || '').replace(/\s+/g, '').replace(/−/g, '-').match(/^(?:(\d{1,2})d(\d{1,3})(?:([+-])(\d{1,3}))?|(\d{1,3}))$/i);
    if (!m) return null;
    if (m[5] !== undefined) return { n: 0, d: 0, k: Number(m[5]) };
    const n = Number(m[1]), d = Number(m[2]);
    if (!n || !d) return null;
    return { n, d, k: m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0 };
}

// "12 (2d6 + 5)" for dice plus a modifier; a flat number stays a number.
function hbDamage(dice, mod) {
    if (!dice.n) return { avg: dice.k, text: String(dice.k) };
    const k = dice.k + mod;
    const avg = Math.max(1, Math.floor(dice.n * (dice.d + 1) / 2 + k));
    return { avg, text: `${avg} (${dice.n}d${dice.d}${k ? ` ${k > 0 ? '+' : '-'} ${Math.abs(k)}` : ''})` };
}

function hbHp(mon) {
    if (mon.hpFlat) return { avg: mon.hpFlat, text: String(mon.hpFlat) };
    const con = hbMod(mon.ab[2]) * mon.hd;
    const avg = Math.max(1, Math.floor(mon.hd * (hbDie(mon) + 1) / 2) + con);
    return { avg, text: `${avg} (${mon.hd}d${hbDie(mon)}${con ? ` ${con > 0 ? '+' : '-'} ${Math.abs(con)}` : ''})` };
}

// "the ogre" for the feature text; a name that's already "The …" keeps its own.
function hbShortName(mon) {
    const n = mon.name || 'creature';
    return /^the /i.test(n) ? n.toLowerCase() : `the ${n.toLowerCase()}`;
}

// ── Clean ─────────────────────────────────────────────────
const HB_EMPTY = {
    name: '', size: 'M', type: 'monstrosity', tags: '', align: 'unaligned', ac: 12, acNote: '',
    hd: 4, hdie: 0, hpFlat: 0, speed: { walk: 30, burrow: 0, climb: 0, fly: 0, swim: 0, hover: false },
    ab: [10, 10, 10, 10, 10, 10], saves: [false, false, false, false, false, false], skills: {},
    vuln: '', resist: '', immune: '', condImm: '', senses: { blind: 0, blindBeyond: false, dark: 0, tremor: 0, truesight: 0 },
    langs: '', tele: 0, cr: 'auto', dpr: null, atk: null, dc: null,
    tr: [], ac2: [], ba: [], re: [], le: [], legN: 3
};

function hbBlank() {
    return hbClean({});
}

function hbCleanAtk(a) {
    const o = a && typeof a === 'object' ? a : {};
    return {
        kind: Object.hasOwn(HB_ATTACKS, o.kind) ? o.kind : 'mw',
        abil: hbInt(o.abil, -1, 5, 0),
        reach: hbInt(o.reach, 0, 300, 5),
        range: hbLine(o.range, 20),
        target: hbLine(o.target, 60) || 'one target',
        dice: hbDice(o.dice) ? hbLine(o.dice, 20) : '1d6',
        type: hbLine(o.type, 30) || 'bludgeoning',
        dice2: hbDice(o.dice2) ? hbLine(o.dice2, 20) : '',
        type2: hbLine(o.type2, 30)
    };
}

function hbCleanFeats(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(f => f && typeof f === 'object').slice(0, HB_LIMITS.feats).map(f => {
        const out = { name: hbLine(f.name, HB_LIMITS.featName), text: hbText(f.text, HB_LIMITS.text) };
        if (f.atk) out.atk = hbCleanAtk(f.atk);
        return out;
    });
}

// A clean monster from untrusted data (storage, an imported notebook, a share link), or null.
function hbClean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const e = HB_EMPTY;
    const sp = raw.speed && typeof raw.speed === 'object' ? raw.speed : {};
    const se = raw.senses && typeof raw.senses === 'object' ? raw.senses : {};
    const ab = Array.isArray(raw.ab) ? raw.ab : [];
    const saves = Array.isArray(raw.saves) ? raw.saves : [];
    const skills = raw.skills && typeof raw.skills === 'object' ? raw.skills : {};
    const size = typeof raw.size === 'string' && Object.hasOwn(HB_SIZES, raw.size) ? raw.size : e.size;
    const hdie = hbInt(raw.hdie, 0, 20, 0);
    return {
        name: hbLine(raw.name, HB_LIMITS.name),
        size,
        type: raw.type === undefined ? e.type : hbLine(raw.type, HB_LIMITS.word),
        tags: hbLine(raw.tags, HB_LIMITS.word),
        align: raw.align === undefined ? e.align : hbLine(raw.align, HB_LIMITS.note),
        ac: hbInt(raw.ac, 0, 30, e.ac),
        acNote: hbLine(raw.acNote, HB_LIMITS.note),
        hd: hbInt(raw.hd, 1, 99, e.hd),
        hdie: [4, 6, 8, 10, 12, 20].includes(hdie) ? hdie : 0,
        hpFlat: hbInt(raw.hpFlat, 0, 9999, 0),
        speed: Object.assign(Object.fromEntries(HB_SPEEDS.map(k => [k, hbInt(sp[k], 0, 999, k === 'walk' && sp[k] === undefined ? 30 : 0)])), { hover: sp.hover === true }),
        ab: HB_ABILS.map((_, i) => hbInt(ab[i], 1, 30, 10)),
        saves: HB_ABILS.map((_, i) => saves[i] === true),
        skills: Object.fromEntries(Object.keys(HB_SKILLS).filter(k => skills[k] === 1 || skills[k] === 2).map(k => [k, skills[k]])),
        vuln: hbLine(raw.vuln, HB_LIMITS.line),
        resist: hbLine(raw.resist, HB_LIMITS.line),
        immune: hbLine(raw.immune, HB_LIMITS.line),
        condImm: hbLine(raw.condImm, HB_LIMITS.line),
        senses: Object.assign(Object.fromEntries(HB_SENSES.map(([k]) => [k, hbInt(se[k], 0, 999, 0)])), { blindBeyond: se.blindBeyond === true }),
        langs: hbLine(raw.langs, HB_LIMITS.line),
        tele: hbInt(raw.tele, 0, 999, 0),
        cr: typeof raw.cr === 'string' && HB_CRS.includes(raw.cr) ? raw.cr : 'auto',
        dpr: hbOpt(raw.dpr, 0, 999),
        atk: hbOpt(raw.atk, -5, 30),
        dc: hbOpt(raw.dc, 0, 40),
        ...Object.fromEntries(HB_SECTIONS.map(([k]) => [k, hbCleanFeats(raw[k])])),
        legN: hbInt(raw.legN, 1, 5, 3)
    };
}

// ── Lines of the stat block ───────────────────────────────
function hbSaveBonus(mon, i, pb) {
    return hbMod(mon.ab[i]) + (mon.saves[i] ? pb : 0);
}

function hbSkillBonus(mon, key, pb) {
    return hbMod(mon.ab[HB_SKILLS[key][1]]) + (mon.skills[key] || 0) * pb;
}

function hbPassive(mon, pb) {
    return 10 + hbSkillBonus(mon, 'perception', pb);
}

// The ability an attack uses: -1 is the better of Str and Dex (finesse).
function hbAtkAbil(mon, a) {
    return a.abil === -1 ? (mon.ab[1] > mon.ab[0] ? 1 : 0) : a.abil;
}

// An attack's line, written from the monster's current scores.
function hbAttackText(mon, f, pb) {
    const a = f.atk;
    const [label, melee, ranged, spell] = HB_ATTACKS[a.kind];
    const mod = hbMod(mon.ab[hbAtkAbil(mon, a)]);
    const reach = [melee && `reach ${a.reach} ft.`, ranged && `range ${a.range || '30'} ft.`].filter(Boolean).join(' or ');
    const d1 = hbDamage(hbDice(a.dice) || { n: 1, d: 6, k: 0 }, spell ? 0 : mod);
    const d2 = a.dice2 && hbDice(a.dice2) ? hbDamage(hbDice(a.dice2), 0) : null;
    const extra = f.text ? ` ${hbTokens(mon, f.text, pb)}` : '';
    return `${label}: ${hbSigned(mod + pb).replace('−', '-')} to hit, ${reach}, ${a.target}. Hit: ${d1.text} ${a.type} damage${d2 ? ` plus ${d2.text}${a.type2 ? ` ${a.type2}` : ''} damage` : ''}.${extra}`;
}

// {name} {Name} {atk:str} {dc:wis} {dmg:2d6+str}
function hbTokens(mon, text, pb) {
    const ab = k => HB_ABILS.indexOf(k.toLowerCase());
    return text
        .replace(/\{name\}/g, hbShortName(mon))
        .replace(/\{Name\}/g, () => { const s = hbShortName(mon); return s.charAt(0).toUpperCase() + s.slice(1); })
        .replace(/\{atk:(str|dex|con|int|wis|cha)\}/gi, (_, k) => hbSigned(hbMod(mon.ab[ab(k)]) + pb).replace('−', '-'))
        .replace(/\{dc:(str|dex|con|int|wis|cha)\}/gi, (_, k) => String(8 + pb + hbMod(mon.ab[ab(k)])))
        .replace(/\{dmg:([^}]+?)(?:\+(str|dex|con|int|wis|cha))?\}/gi, (all, d, k) => {
            const dice = hbDice(d);
            return dice ? hbDamage(dice, k ? hbMod(mon.ab[ab(k)]) : 0).text : all;
        });
}

function hbFeatText(mon, f, pb) {
    return f.atk ? hbAttackText(mon, f, pb) : hbTokens(mon, f.text, pb);
}

function hbFeatures(mon, key, pb) {
    return mon[key].filter(f => f.name || f.text || f.atk).map(f => [f.name || 'Unnamed', hbFeatText(mon, f, pb)]);
}

function hbTypeLine(mon) {
    const type = mon.type || 'monstrosity';
    return `${HB_SIZES[mon.size][0]} ${type}${mon.tags ? ` (${mon.tags})` : ''}, ${mon.align || 'unaligned'}`;
}

function hbSpeedLine(mon) {
    const s = mon.speed;
    return [`${s.walk} ft.`, ...HB_SPEEDS.slice(1).filter(k => s[k]).map(k => `${k} ${s[k]} ft.${k === 'fly' && s.hover ? ' (hover)' : ''}`)].join(', ');
}

function hbProps(mon, pb) {
    const saves = HB_ABILS.map((_, i) => i).filter(i => mon.saves[i]).map(i => `${HB_ABIL_NAMES[i]} ${hbSigned(hbSaveBonus(mon, i, pb)).replace('−', '-')}`);
    const skills = Object.keys(HB_SKILLS).filter(k => mon.skills[k]).map(k => `${HB_SKILLS[k][0]} ${hbSigned(hbSkillBonus(mon, k, pb)).replace('−', '-')}`);
    const senses = HB_SENSES.filter(([k]) => mon.senses[k]).map(([k, label]) => `${label} ${mon.senses[k]} ft.${k === 'blind' && mon.senses.blindBeyond ? ' (blind beyond this radius)' : ''}`);
    senses.push(`passive Perception ${hbPassive(mon, pb)}`);
    const langs = [mon.langs, mon.tele && `telepathy ${mon.tele} ft.`].filter(Boolean).join(', ') || '—';
    return [
        saves.length && ['Saving Throws', saves.join(', ')],
        skills.length && ['Skills', skills.join(', ')],
        mon.vuln && ['Damage Vulnerabilities', mon.vuln],
        mon.resist && ['Damage Resistances', mon.resist],
        mon.immune && ['Damage Immunities', mon.immune],
        mon.condImm && ['Condition Immunities', mon.condImm],
        ['Senses', senses.join(', ')],
        ['Languages', langs]
    ].filter(Boolean);
}

// The CR it shows: the one picked, or the estimate's.
function hbCr(mon) {
    return mon.cr === 'auto' ? hbEstimateCr(mon).cr : mon.cr;
}

// The stat block in monster-statblocks.js's shape (keys t, ac, hp, sp, ab, pr, cr, pb, tr, ac2, ba, re, le, li).
function hbBlock(mon, cr = hbCr(mon)) {
    const pb = hbPb(cr);
    const b = {
        t: hbTypeLine(mon),
        ac: `${mon.ac}${mon.acNote ? ` (${mon.acNote})` : ''}`,
        hp: hbHp(mon).text,
        sp: hbSpeedLine(mon),
        ab: mon.ab.slice(),
        pr: hbProps(mon, pb),
        cr: `${cr} (${hbXp(cr).toLocaleString('en-US')} XP)`,
        pb
    };
    HB_SECTIONS.forEach(([k]) => { const list = hbFeatures(mon, k, pb); if (list.length) b[k] = list; });
    if (b.le) {
        const n = hbShortName(mon);
        b.li = `${n.charAt(0).toUpperCase() + n.slice(1)} can take ${mon.legN} legendary action${mon.legN === 1 ? '' : 's'}, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. ${n.charAt(0).toUpperCase() + n.slice(1)} regains spent legendary actions at the start of its turn.`;
    }
    return b;
}

// ── CR estimate ───────────────────────────────────────────
const HB_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twice: 2 };

function hbCount(w) {
    return HB_WORDS[w.toLowerCase()] || Number(w) || 0;
}

// What one feature does in a turn: damage (an attack's hit, or a save effect's biggest
// number), its to-hit, its DC, and whether it's limited (recharge or per day).
function hbFeatHit(mon, f, pb) {
    const text = hbFeatText(mon, f, pb);
    const hit = text.match(/to hit/i);
    const toHit = text.match(/([+\-−]\d+) to hit/);
    const dc = text.match(/DC (\d+)/);
    const dmgs = s => [...s.matchAll(/(\d+) \(\d+d\d+(?: [+−-] \d+)?\) [a-z]+ damage|Hit: (\d+) [a-z]+ damage/g)].map(m => Number(m[1] || m[2]));
    let dmg;
    if (hit) {
        const sentence = (text.split(/Hit:/)[1] || '').split(/\.(?:\s|$)/)[0];
        dmg = dmgs('Hit:' + sentence).reduce((a, b) => a + b, 0);
    } else dmg = Math.max(0, ...dmgs(text));
    return {
        name: f.name, dmg,
        toHit: toHit ? Number(toHit[1].replace('−', '-')) : null,
        dc: dc ? Number(dc[1]) : null,
        limited: /recharge|\/day|\/ day|per day/i.test(f.name),
        multi: /^multiattack/i.test(f.name), text
    };
}

// The damage a monster deals in a round, read from its actions: Multiattack's attacks
// (by name when it names them, else its best attack that many times), or its best action;
// a recharge or per-day action counts in one of the first three rounds; plus its best bonus
// action and its best legendary action.
function hbReadOffense(mon, pb) {
    const acts = mon.ac2.filter(f => f.name || f.text || f.atk).map(f => hbFeatHit(mon, f, pb));
    const steps = [];
    const plain = acts.filter(a => !a.multi && !a.limited && a.dmg > 0);
    const best = plain.reduce((b, a) => (!b || a.dmg > b.dmg ? a : b), null);
    let regular = best ? best.dmg : 0, how = best ? `${best.name} ${best.dmg}` : '';
    const multi = acts.find(a => a.multi);
    if (multi) {
        const named = [...multi.text.matchAll(/\b(one|two|three|four|five|six|\d+|twice)\b (?:with its |with |of its |using its )?([A-Za-z][A-Za-z' -]*?)(?=,| and |\.| or |$)/gi)]
            .map(m => {
                const count = hbCount(m[1]);
                const word = m[2].toLowerCase().replace(/ attacks?$/, '').replace(/s$/, '').trim();
                const act = plain.find(a => word && a.name.toLowerCase().replace(/s$/, '').startsWith(word));
                return act && count ? { act, count } : null;
            }).filter(Boolean);
        const total = named.reduce((t, x) => t + x.act.dmg * x.count, 0);
        const n = (multi.text.match(/makes (\w+) (?:\w+ )?attacks/i) || [])[1];
        if (total > regular) { regular = total; how = `Multiattack: ${named.map(x => `${x.count > 1 ? x.count + ' × ' : ''}${x.act.name} ${x.act.dmg}`).join(' + ')}`; }
        else if (n && best && hbCount(n) * best.dmg > regular) { regular = hbCount(n) * best.dmg; how = `Multiattack: ${hbCount(n)} × ${best.name} ${best.dmg}`; }
    }
    if (how) steps.push(`Each round: ${how} = ${regular}.`);
    const lim = acts.filter(a => a.limited && a.dmg > 0).reduce((b, a) => (!b || a.dmg > b.dmg ? a : b), null);
    let dpr = regular;
    if (lim && lim.dmg > regular) {
        dpr = Math.round((lim.dmg + 2 * regular) / 3);
        steps.push(`${lim.name} (${lim.dmg}) once in the first three rounds: (${lim.dmg} + 2 × ${regular}) ÷ 3 = ${dpr}.`);
    }
    const bonus = mon.ba.filter(f => f.name || f.text || f.atk).map(f => hbFeatHit(mon, f, pb)).filter(a => a.dmg > 0 && !a.limited)
        .reduce((b, a) => (!b || a.dmg > b.dmg ? a : b), null);
    if (bonus) { dpr += bonus.dmg; steps.push(`Bonus action ${bonus.name}: +${bonus.dmg}.`); }
    // Legendary actions: the option that deals the most in a round (as often as the actions
    // allow, by its cost), whether its own damage or one of the monster's attacks.
    const leg = mon.le.filter(f => f.name || f.text || f.atk).map(f => {
        const hit = hbFeatHit(mon, f, pb);
        const named = (hit.text.match(/makes (?:a|one) ([A-Za-z' -]+?) attack/i) || [])[1];
        const act = named && plain.find(a => a.name.toLowerCase().replace(/s$/, '').startsWith(named.toLowerCase().replace(/s$/, '')));
        const cost = Number((f.name.match(/costs (\d) actions/i) || [])[1]) || 1;
        const uses = Math.floor(mon.legN / cost);
        const dmg = Math.max(hit.dmg, act ? act.dmg : 0);
        return { name: f.name.replace(/\s*\(costs \d actions\)/i, ''), dmg, uses, total: dmg * uses };
    }).filter(x => x.total > 0).reduce((b, x) => (!b || x.total > b.total ? x : b), null);
    if (leg) { dpr += leg.total; steps.push(`Legendary ${leg.name} ${leg.uses > 1 ? `${leg.uses} × ${leg.dmg}` : leg.dmg}: +${leg.total}.`); }
    const hits = acts.map(a => a.toHit).filter(x => x !== null);
    const dcs = acts.map(a => a.dc).filter(x => x !== null);
    return { dpr, steps, atk: hits.length ? Math.max(...hits) : null, dc: dcs.length ? Math.max(...dcs) : null, limited: lim };
}

// The first CR whose range (column hi) reaches value.
function hbRowFor(value, hi) {
    const i = HB_CR_TABLE.findIndex(r => value <= r[hi]);
    return i === -1 ? HB_CR_TABLE.length - 1 : i;
}

function hbClampIdx(i) {
    return Math.max(0, Math.min(HB_CR_TABLE.length - 1, i));
}

// Damage types named in a resistance or immunity line, and whether it covers ordinary weapons.
function hbDefenseKinds(text) {
    const t = text.toLowerCase();
    return { types: HB_DAMAGE.filter(d => t.includes(d)).length, weapons: /nonmagical|non-magical|that aren't silvered|aren't adamantine/.test(t) && /bludgeoning|piercing|slashing/.test(t) };
}

// One estimate with a given proficiency bonus.
function hbEstimateWith(mon, pb) {
    const def = [], off = [];
    // Defensive: effective hit points…
    const hp = hbHp(mon).avg;
    const rawIdx = hbRowFor(hp, 4);
    const expected = hbCrValue(HB_CRS[rawIdx]);
    let eff = hp;
    def.push(`Hit points ${hp}.`);
    const res = hbDefenseKinds(mon.resist), imm = hbDefenseKinds(mon.immune);
    const strong = imm.weapons || imm.types >= 3, some = strong || res.weapons || res.types >= 3;
    if (some) {
        const tier = expected <= 4 ? [2, 2] : expected <= 10 ? [1.5, 2] : expected <= 16 ? [1.25, 1.5] : [1, 1.25];
        const mult = strong ? tier[1] : tier[0];
        if (mult !== 1) {
            eff = Math.round(eff * mult);
            def.push(`${strong ? 'Immune' : 'Resistant'} to ${(strong ? imm : res).weapons ? 'ordinary weapons' : 'three or more damage types'} at about CR ${HB_CRS[rawIdx]}: × ${mult} = ${eff}.`);
        }
    }
    const allFeats = [...mon.tr, ...mon.ac2, ...mon.ba, ...mon.re];
    const featText = allFeats.map(f => `${f.name}. ${f.text}`).join('\n');
    const legRes = (featText.match(/Legendary Resistance \((\d+)\/Day\)/i) || [])[1];
    if (legRes) {
        const per = expected <= 4 ? 10 : expected <= 10 ? 20 : 30;
        eff += Number(legRes) * per;
        def.push(`Legendary Resistance ${legRes}/day: + ${Number(legRes) * per} = ${eff}.`);
    }
    const regen = allFeats.find(f => /^regeneration/i.test(f.name));
    const regenHp = regen && Number((regen.text.match(/regains (\d+) hit points/i) || [])[1]);
    if (regenHp) {
        eff += regenHp * 3;
        def.push(`Regeneration ${regenHp} a round, for three rounds: + ${regenHp * 3} = ${eff}.`);
    }
    let dIdx = hbRowFor(eff, 4);
    def.push(`${eff} effective hit points is CR ${HB_CRS[dIdx]}, where the usual AC is ${HB_CR_TABLE[dIdx][2]}.`);
    // …against Armor Class.
    let ac = mon.ac;
    const acBits = [];
    if (/magic resistance/i.test(featText)) { ac += 2; acBits.push('+ 2 for Magic Resistance'); }
    const saves = mon.saves.filter(Boolean).length;
    if (saves >= 3) { ac += saves >= 5 ? 4 : 2; acBits.push(`+ ${saves >= 5 ? 4 : 2} for ${saves} saving throws`); }
    const rangedAct = mon.ac2.some(f => (f.atk && HB_ATTACKS[f.atk.kind][2]) || /ranged|range \d/i.test(f.text));
    if (mon.speed.fly && rangedAct && hbCrValue(HB_CRS[dIdx]) <= 10) { ac += 2; acBits.push('+ 2 for flying with a ranged attack'); }
    const acStep = Math.trunc((ac - HB_CR_TABLE[dIdx][2]) / 2);
    def.push(`AC ${mon.ac}${acBits.length ? ` ${acBits.join(' ')} = ${ac}` : ''}: ${acStep ? `${acStep > 0 ? '+' : '−'}${Math.abs(acStep)} step${Math.abs(acStep) === 1 ? '' : 's'}` : 'no change'}.`);
    dIdx = hbClampIdx(dIdx + acStep);
    def.push(`Defensive CR ${HB_CRS[dIdx]}.`);

    // Offensive: damage per round…
    const read = hbReadOffense(mon, pb);
    const dpr = mon.dpr !== null ? mon.dpr : read.dpr;
    if (mon.dpr !== null) off.push(`Damage per round ${dpr} (yours).`);
    else if (read.steps.length) off.push(...read.steps);
    else off.push('No damage found in the actions: 0 a round.');
    let oIdx = hbRowFor(dpr, 7);
    // …against attack bonus or save DC.
    // Your attack bonus, else your DC, else the best to-hit in the actions, else their best DC.
    const useDc = mon.atk === null && (mon.dc !== null || read.atk === null);
    const val = useDc ? (mon.dc !== null ? mon.dc : read.dc) : (mon.atk !== null ? mon.atk : read.atk);
    const want = HB_CR_TABLE[oIdx][useDc ? 8 : 5];
    off.push(`${dpr} damage a round is CR ${HB_CRS[oIdx]}, where the usual ${useDc ? 'save DC' : 'attack bonus'} is ${useDc ? want : '+' + want}.`);
    if (val === null) off.push('No attack bonus or save DC found: no change.');
    else {
        const step = Math.trunc((val - want) / 2);
        off.push(`${useDc ? `Save DC ${val}` : `Attack bonus ${hbSigned(val)}`}${(useDc ? mon.dc : mon.atk) !== null ? ' (yours)' : ''}: ${step ? `${step > 0 ? '+' : '−'}${Math.abs(step)} step${Math.abs(step) === 1 ? '' : 's'}` : 'no change'}.`);
        oIdx = hbClampIdx(oIdx + step);
    }
    off.push(`Offensive CR ${HB_CRS[oIdx]}.`);

    // The average, to the nearest CR (a tie goes up).
    const avg = (hbCrValue(HB_CRS[dIdx]) + hbCrValue(HB_CRS[oIdx])) / 2;
    let idx = 0;
    HB_CRS.forEach((c, i) => { if (Math.abs(hbCrValue(c) - avg) <= Math.abs(hbCrValue(HB_CRS[idx]) - avg) + 1e-9) idx = i; });
    return { cr: HB_CRS[idx], defensive: HB_CRS[dIdx], offensive: HB_CRS[oIdx], def, off, dpr, pb };
}

// The estimate, with the proficiency bonus of the CR it lands on (attack lines use it, so
// it runs until the two agree).
function hbEstimateCr(mon) {
    let pb = mon.cr === 'auto' ? 2 : hbPb(mon.cr), est = null;
    for (let i = 0; i < 5; i++) {
        est = hbEstimateWith(mon, pb);
        if (mon.cr !== 'auto' || hbPb(est.cr) === pb) break;
        pb = hbPb(est.cr);
    }
    return est;
}

// ── From an SRD monster ───────────────────────────────────
// The SRD stat block of monsters-data.js id `id` as a homebrew monster (needs MONSTER_BLOCKS).
function hbFromSrd(id) {
    const b = MONSTER_BLOCKS[id], row = MONSTER_BY_ID[id];
    if (!b || !row) return null;
    const mon = hbBlank();
    mon.name = row.name;
    mon.size = row.size;
    const t = b.t.match(/^\w+ (.+?)(?: \(([^)]*)\))?, (.*)$/);
    if (t) { mon.type = t[1]; mon.tags = t[2] || ''; mon.align = t[3]; }
    const ac = b.ac.match(/^(\d+)(?: \((.*)\))?/);
    if (ac) { mon.ac = Number(ac[1]); mon.acNote = ac[2] || ''; }
    mon.ab = b.ab.slice();
    const hp = b.hp.match(/^(\d+)(?: \((\d+)d(\d+)(?: ([+-]) (\d+))?\))?/);
    if (hp) {
        if (hp[2]) {
            mon.hd = Number(hp[2]);
            mon.hdie = Number(hp[3]) === HB_SIZES[mon.size][1] ? 0 : Number(hp[3]);
        }
        if (hbHp(mon).avg !== Number(hp[1])) mon.hpFlat = Number(hp[1]);
    }
    mon.speed = { walk: 0, burrow: 0, climb: 0, fly: 0, swim: 0, hover: /\(hover\)/.test(b.sp) };
    b.sp.split(',').forEach((part, i) => {
        const m = part.trim().match(/^(?:(burrow|climb|fly|swim) )?(\d+) ft\./);
        if (m) mon.speed[m[1] || (i === 0 ? 'walk' : '')] = Number(m[2]);
    });
    delete mon.speed[''];
    const crName = b.cr.split(' ')[0];
    mon.cr = HB_CRS.includes(crName) ? crName : 'auto';
    const pb = b.pb || hbPb(mon.cr === 'auto' ? '1' : mon.cr);
    b.pr.forEach(([k, v]) => {
        if (k === 'Saving Throws') v.split(',').forEach(s => { const i = HB_ABIL_NAMES.indexOf(s.trim().slice(0, 3)); if (i >= 0) mon.saves[i] = true; });
        else if (k === 'Skills') v.split(',').forEach(s => {
            const m = s.trim().match(/^(.+?) ([+-]\d+)$/);
            const key = m && m[1].toLowerCase();
            if (!key || !HB_SKILLS[key]) return;
            mon.skills[key] = Number(m[2]) - hbMod(mon.ab[HB_SKILLS[key][1]]) >= pb * 2 ? 2 : 1;
        });
        else if (k === 'Damage Vulnerabilities') mon.vuln = v;
        else if (k === 'Damage Resistances') mon.resist = v;
        else if (k === 'Damage Immunities') mon.immune = v;
        else if (k === 'Condition Immunities') mon.condImm = v;
        else if (k === 'Senses') HB_SENSES.forEach(([key, label]) => {
            const m = v.match(new RegExp(`${label} (\\d+) ft\\.( \\(blind beyond)?`));
            if (m) { mon.senses[key] = Number(m[1]); if (key === 'blind' && m[2]) mon.senses.blindBeyond = true; }
        });
        else if (k === 'Languages') {
            const tele = v.match(/,? ?telepathy (\d+) ft\./);
            if (tele) mon.tele = Number(tele[1]);
            mon.langs = v.replace(/,? ?telepathy \d+ ft\./, '').trim().replace(/^—$/, '');
        }
    });
    HB_SECTIONS.forEach(([k]) => { mon[k] = (b[k] || []).slice(0, HB_LIMITS.feats).map(([name, text]) => ({ name, text })); });
    const legN = b.li && b.li.match(/can take (\d+) legendary/);
    if (legN) mon.legN = Math.min(5, Number(legN[1]));
    return hbClean(mon);
}

// ── For Encounter and Initiative ──────────────────────────
// A monsters-data.js row (plus hb and the block) for homebrew `mon` under id `id`.
function hbRow(mon, id) {
    const cr = hbCr(mon);
    return {
        id, name: mon.name || 'Homebrew monster', cr, xp: hbXp(cr), ac: mon.ac, hp: hbHp(mon).avg,
        dex: hbMod(mon.ab[1]), size: mon.size, type: (mon.type || 'monstrosity').toLowerCase(), hb: true, block: hbBlock(mon, cr)
    };
}

// "Large dragon · CR 5 · AC 17 · HP 120", for the notebook card.
function hbSummary(mon) {
    return `${HB_SIZES[mon.size][0]} ${mon.type || 'monstrosity'} · CR ${hbCr(mon)} · AC ${mon.ac} · HP ${hbHp(mon).avg}`;
}

// The notebook's monster entries (needs notebook.js).
function hbSaved(nb = nbLoad()) {
    return nb.entries.filter(e => e.kind === 'monster' && e.mon);
}

let hbRows = [];

// The notebook's monsters as rows, also put into MONSTER_BY_ID under 'hb-<entry id>'.
// Runs on load and after every notebook change, here or in another tab.
function hbRegister(nb) {
    if (typeof nbLoad !== 'function' || typeof MONSTER_BY_ID === 'undefined') return [];
    hbRows.forEach(r => { delete MONSTER_BY_ID[r.id]; });
    hbRows = hbSaved(nb).map(e => hbRow(e.mon, HB_PREFIX + e.id)).sort((a, b) => a.name.localeCompare(b.name));
    hbRows.forEach(r => { MONSTER_BY_ID[r.id] = r; });
    return hbRows;
}

if (typeof nbOnChange === 'function') {
    hbRegister();
    nbOnChange(hbRegister);
}

// ── Share codes ───────────────────────────────────────────
async function hbShareCode(mon) {
    const code = await packShareCode({ v: 1, m: mon });
    if (code.length > HB_LIMITS.share) throw new Error(`That monster is too long for a link (${code.length.toLocaleString()} characters; ${HB_LIMITS.share.toLocaleString()} at most). Shorten its text, or save it to the notebook and export that instead.`);
    return code;
}

async function hbFromShareCode(code) {
    const broken = new Error('That monster link is broken or cut short. Ask for it again, and copy the whole link.');
    let data;
    try {
        data = await unpackShareCode(code, HB_LIMITS.share + 10, 200000);
    } catch (e) {
        throw e.browser ? new Error("This browser can't open compressed monster links. Try a newer browser.") : broken;
    }
    const mon = data && data.v === 1 ? hbClean(data.m) : null;
    if (!mon) throw broken;
    return mon;
}
