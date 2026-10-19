/* ============================================
   CHARACTER ENGINE (F58): page-free rules for the Character Builder.
   A character is plain data (see cbBlank); everything on the sheet comes from
   cbDerive(c), and cbTodo(c) lists what the player still has to pick.
   Saved characters live in localStorage CB_KEY (a list, newest edit first).
   Needs character-data.js and spells-data.js; quick build uses rand() (rng.js),
   rollDice() (dice-engine.js), and buildName() (npc-data.js) when the page has them.
   ============================================ */

const CB_KEY = 'gazette-characters';
const CB_MAX = 30;

const cbRace = id => CB_RACES.find(r => r.id === id) || null;
const cbClass = id => CB_CLASSES.find(k => k.id === id) || null;
const cbSubrace = c => { const r = cbRace(c.race); return r && r.subraces ? r.subraces.find(s => s.id === c.subrace) || r.subraces[0] : null; };
const cbProf = L => 2 + Math.floor((L - 1) / 4);
const cbMod = score => Math.floor((score - 10) / 2);
const cbOrd = n => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th');
const cbRand = () => (typeof rand === 'function' ? rand() : Math.random());
const cbPick = list => list[Math.floor(cbRand() * list.length)];
const cbShuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(cbRand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function cbNewId() {
    return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function cbBlank() {
    return {
        id: cbNewId(), v: 1, name: '', player: '', gender: '', alignment: '', age: '', notes: '',
        race: '', subrace: '', raceOpt: { langs: [], skills: [], abil: [], tool: '', cantrip: '', ancestry: '' },
        cls: '', level: 1,
        method: 'array', base: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, assigned: false,
        bg: '', bgOpt: { name: '', skills: [], extras: [], langs: [] },
        skills: [], tools: [], expertise: [],
        opts: { styles: [], enemies: [], terrains: [], land: '', dragon: '', metamagic: [], invocations: [], pact: '', hunter: {}, loreSkills: [] },
        asi: {}, hpMode: 'avg', hpRolls: [],
        equipMode: 'class', equip: { choice: [], picks: {} }, gear: [], coins: 0, gearSet: false,
        wear: { armor: '', shield: false },
        spells: { cantrips: [], list: [], prepared: [], arcanum: {}, fav: [] },
        play: cbPlayBlank(),
        updated: Date.now()
    };
}

// Session state for the Play Sheet (F59; rules in character-play.js). hp null = at full.
// ds: [successes, failures]; hd and slots/pact/res count what's been used.
function cbPlayBlank() {
    return { hp: null, temp: 0, ds: [0, 0], hd: 0, slots: [0, 0, 0, 0, 0, 0, 0, 0, 0], pact: 0, res: {}, cond: [], exh: 0, insp: false, conc: '' };
}

// ── Cleaning (load, import, backup) ──────────────────────
const cbStr = (v, max = 60) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '');
const cbIds = (v, ok, max = 40) => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && ok(x)))].slice(0, max) : []);
const cbSpellOk = n => typeof n === 'string' && !!cbSpell(n);

function cbClean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const c = cbBlank();
    if (typeof raw.id === 'string' && /^[a-z0-9]{1,16}$/.test(raw.id)) c.id = raw.id;
    ['name', 'player', 'gender', 'alignment', 'age'].forEach(k => { c[k] = cbStr(raw[k], k === 'age' ? 20 : 60); });
    c.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 4000) : '';
    c.race = cbRace(raw.race) ? raw.race : '';
    const race = cbRace(c.race);
    c.subrace = race && race.subraces && race.subraces.some(s => s.id === raw.subrace) ? raw.subrace : race && race.subraces ? race.subraces[0].id : '';
    const ro = raw.raceOpt || {};
    c.raceOpt = {
        langs: cbIds(ro.langs, l => CB_LANGUAGES.includes(l), 4), skills: cbIds(ro.skills, s => !!CB_SKILLS[s], 4),
        abil: cbIds(ro.abil, a => CB_ABILITIES.includes(a), 2), tool: CB_TOOLS.includes(ro.tool) ? ro.tool : '',
        cantrip: cbSpellOk(ro.cantrip) ? ro.cantrip : '', ancestry: CB_DRAGONS[ro.ancestry] ? ro.ancestry : ''
    };
    c.cls = cbClass(raw.cls) ? raw.cls : '';
    c.level = Math.min(20, Math.max(1, Math.round(Number(raw.level)) || 1));
    c.method = ['array', 'point', 'roll', 'manual'].includes(raw.method) ? raw.method : 'array';
    CB_ABILITIES.forEach(a => { const n = Math.round(Number(raw.base && raw.base[a])); c.base[a] = Number.isFinite(n) ? Math.min(20, Math.max(3, n)) : 8; });
    c.assigned = !!raw.assigned;
    if (Array.isArray(raw.pool)) c.pool = raw.pool.map(Number).filter(n => n >= 3 && n <= 18).slice(0, 6);
    c.bg = CB_BACKGROUNDS[raw.bg] ? raw.bg : '';
    const bo = raw.bgOpt || {};
    c.bgOpt = { name: cbStr(bo.name, 40), skills: cbIds(bo.skills, s => !!CB_SKILLS[s], 2),
        extras: cbIds(bo.extras, x => CB_TOOLS.includes(x) || CB_LANGUAGES.includes(x), 2), langs: cbIds(bo.langs, l => CB_LANGUAGES.includes(l), 2) };
    c.skills = cbIds(raw.skills, s => !!CB_SKILLS[s], 18);
    c.tools = cbIds(raw.tools, t => CB_TOOLS.includes(t), 3);
    c.expertise = cbIds(raw.expertise, s => !!CB_SKILLS[s] || s === "Thieves' tools", 4);
    const o = raw.opts || {};
    c.opts = {
        styles: cbIds(o.styles, s => !!CB_FIGHTING_STYLES[s], 2), enemies: cbIds(o.enemies, e => CB_ENEMIES.includes(e), 3),
        terrains: cbIds(o.terrains, t => CB_TERRAINS.includes(t), 3), land: CB_TERRAINS.includes(o.land) ? o.land : '',
        dragon: CB_DRAGONS[o.dragon] ? o.dragon : '', metamagic: cbIds(o.metamagic, m => !!CB_METAMAGIC[m], 4),
        invocations: cbIds(o.invocations, i => !!CB_INVOCATIONS[i], 8), pact: CB_PACTS[o.pact] ? o.pact : '',
        hunter: {}, loreSkills: cbIds(o.loreSkills, s => !!CB_SKILLS[s], 3)
    };
    Object.keys(CB_HUNTER).forEach(lv => { const v = o.hunter && o.hunter[lv]; if (CB_HUNTER[lv].opts[v]) c.opts.hunter[lv] = v; });
    if (raw.asi && typeof raw.asi === 'object') {
        Object.keys(raw.asi).forEach(lv => {
            const a = raw.asi[lv];
            if (!/^\d{1,2}$/.test(lv) || !a || typeof a !== 'object') return;
            if (CB_FEATS[a.feat]) c.asi[lv] = { feat: a.feat };
            else if (CB_ABILITIES.includes(a.a) && CB_ABILITIES.includes(a.b)) c.asi[lv] = { a: a.a, b: a.b };
        });
    }
    c.hpMode = raw.hpMode === 'roll' ? 'roll' : 'avg';
    c.hpRolls = Array.isArray(raw.hpRolls) ? raw.hpRolls.slice(0, 19).map(n => (Number.isInteger(n) && n >= 1 && n <= 12 ? n : null)) : [];
    c.equipMode = raw.equipMode === 'gold' ? 'gold' : 'class';
    const eq = raw.equip || {};
    c.equip = { choice: Array.isArray(eq.choice) ? eq.choice.slice(0, 6).map(n => (Number.isInteger(n) && n >= 0 && n < 4 ? n : 0)) : [], picks: {} };
    if (eq.picks && typeof eq.picks === 'object') Object.keys(eq.picks).forEach(k => {
        if (/^\d-\d-\d$/.test(k) && (CB_WEAPONS[eq.picks[k]] || CB_INSTRUMENTS.includes(eq.picks[k]))) c.equip.picks[k] = eq.picks[k];
    });
    c.gear = Array.isArray(raw.gear) ? raw.gear.slice(0, 80).map(g => {
        if (!g || typeof g !== 'object') return null;
        const item = { name: cbStr(g.name, 80), qty: Math.min(9999, Math.max(1, Math.round(Number(g.qty)) || 1)) };
        if (CB_WEAPONS[g.w]) item.w = g.w;
        if (CB_ARMOR[g.a]) item.a = g.a;
        return item.name ? item : null;
    }).filter(Boolean) : [];
    c.coins = Math.min(1e7, Math.max(0, Math.round(Number(raw.coins) * 100) / 100 || 0));
    c.gearSet = !!raw.gearSet;
    const w = raw.wear || {};
    c.wear = { armor: CB_ARMOR[w.armor] ? w.armor : '', shield: !!w.shield };
    const sp = raw.spells || {};
    c.spells = { cantrips: cbIds(sp.cantrips, cbSpellOk, 12), list: cbIds(sp.list, cbSpellOk, 80), prepared: cbIds(sp.prepared, cbSpellOk, 40), arcanum: {}, fav: cbIds(sp.fav, cbSpellOk, 80) };
    [6, 7, 8, 9].forEach(lv => { const n = sp.arcanum && sp.arcanum[lv]; if (cbSpellOk(n)) c.spells.arcanum[lv] = n; });
    c.play = cbPlayClean(raw.play);
    c.updated = Number(raw.updated) || Date.now();
    return c;
}

// The shape only; cbPlayFit (character-play.js) trims it to what the level allows.
function cbPlayClean(raw) {
    const p = cbPlayBlank();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p;
    const int = (v, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; };
    p.hp = raw.hp === null || raw.hp === undefined ? null : int(raw.hp, 9999);
    p.temp = int(raw.temp, 9999);
    if (Array.isArray(raw.ds)) p.ds = [int(raw.ds[0], 3), int(raw.ds[1], 3)];
    p.hd = int(raw.hd, 20);
    if (Array.isArray(raw.slots)) p.slots = p.slots.map((_, i) => int(raw.slots[i], 4));
    p.pact = int(raw.pact, 4);
    if (raw.res && typeof raw.res === 'object') Object.keys(raw.res).slice(0, 40).forEach(k => { if (/^[a-z0-9-]{1,24}$/.test(k)) p.res[k] = int(raw.res[k], 999); });
    p.cond = cbIds(raw.cond, n => typeof SRD_CONDITION_TEXT === 'undefined' ? /^[A-Z][a-z]{2,15}$/.test(n) : !!SRD_CONDITION_TEXT[n] && n !== 'Exhaustion', 15);
    p.exh = int(raw.exh, 6);
    p.insp = !!raw.insp;
    p.conc = cbSpellOk(raw.conc) ? raw.conc : '';
    return p;
}

// ── Storage ──────────────────────────────────────────────
function cbLoadAll() {
    try {
        const saved = JSON.parse(localStorage.getItem(CB_KEY));
        if (Array.isArray(saved)) return saved.map(cbClean).filter(Boolean).slice(0, CB_MAX);
    } catch (e) {}
    return [];
}

// Saves one character (put it first) and returns the list.
function cbSave(c) {
    c.updated = Date.now();
    const list = [c, ...cbLoadAll().filter(x => x.id !== c.id)].slice(0, CB_MAX);
    try { localStorage.setItem(CB_KEY, JSON.stringify(list)); } catch (e) { return null; }
    return list;
}

function cbDelete(id) {
    const list = cbLoadAll().filter(x => x.id !== id);
    try { localStorage.setItem(CB_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
}

// ── Spells ───────────────────────────────────────────────
const CB_SPELL_INDEX = {};
function cbSpell(name) {
    if (typeof SPELLS_DATA === 'undefined' || typeof name !== 'string') return null;
    if (!CB_SPELL_INDEX._built) { SPELLS_DATA.forEach(s => { CB_SPELL_INDEX[s.name.toLowerCase()] = s; }); CB_SPELL_INDEX._built = true; }
    return CB_SPELL_INDEX[name.toLowerCase()] || null;
}

// Slots by spell level: [n1, n2, ...]; a warlock's are { count, level } as pact.
function cbSlots(k, L) {
    if (!k || !k.cast) return [];
    if (k.cast.prog === 'full') return CB_FULL_SLOTS[L - 1];
    if (k.cast.prog === 'half') return L >= 2 ? CB_FULL_SLOTS[Math.ceil(L / 2) - 1] : [];
    return [];
}

// How many of each kind of spell this character picks, and from what.
function cbSpellRules(c) {
    const k = cbClass(c.cls);
    if (!k || !k.cast) return null;
    const L = c.level, cast = k.cast, s = cbScores(c), mod = cbMod(s[cast.ability]);
    const pact = cast.prog === 'pact' ? CB_PACT_SLOTS[L - 1] : null;
    const slots = cbSlots(k, L);
    const maxLevel = pact ? pact[1] : slots.length;
    const r = { cls: k, ability: cast.ability, type: cast.type, maxLevel, pact, slots,
        cantrips: cast.cantrips ? cast.cantrips[L - 1] : 0, list: 0, prepared: 0, offList: 0, offCantrips: 0, arcanum: [] };
    if (c.cls === 'druid' && L >= 2) r.cantrips += 1;
    if (c.cls === 'warlock' && c.opts.pact === 'tome' && L >= 3) { r.cantrips += 3; r.offCantrips = 3; }
    if (cast.type === 'known') {
        r.list = cast.known[L - 1];
        if (c.cls === 'bard') {
            if (L >= 6) { r.list += 2; r.offList += 2; }
            r.offList += (L >= 10 ? 2 : 0) + (L >= 14 ? 2 : 0) + (L >= 18 ? 2 : 0);
        }
    } else if (cast.type === 'prepared') {
        r.list = c.cls === 'paladin' ? (L >= 2 ? Math.max(1, mod + Math.floor(L / 2)) : 0) : Math.max(1, mod + L);
    } else if (cast.type === 'book') {
        r.list = 6 + 2 * (L - 1);
        r.prepared = Math.max(1, mod + L);
    }
    if (c.cls === 'warlock') r.arcanum = [[11, 6], [13, 7], [15, 8], [17, 9]].filter(([lv]) => L >= lv).map(([, sl]) => sl);
    return r;
}

// Spells this class can learn or prepare, by spell level (0 = cantrips).
function cbClassSpells(c, level) {
    const k = cbClass(c.cls);
    if (!k || typeof SPELLS_DATA === 'undefined') return [];
    const extra = c.cls === 'warlock' && k.sub.expanded ? Object.values(k.sub.expanded).flat().map(n => n.toLowerCase()) : [];
    return SPELLS_DATA.filter(s => s.level === level && (s.classes.includes(k.name) || extra.includes(s.name.toLowerCase())));
}

// Spells that are always prepared (domain, oath, circle), each with the level it comes at.
function cbAlwaysSpells(c) {
    const k = cbClass(c.cls);
    if (!k) return [];
    let table = null;
    if (k.sub.spells) table = k.sub.spells;
    if (c.cls === 'druid' && c.opts.land) table = CB_LAND_SPELLS[c.opts.land];
    if (!table) return [];
    return Object.keys(table).map(Number).filter(lv => c.level >= lv).flatMap(lv => table[lv]);
}

// Spells from the race: [{ name, note }].
function cbRaceSpells(c) {
    const out = [];
    if (c.race === 'elf' && c.subrace === 'high-elf' && c.raceOpt.cantrip) out.push({ name: c.raceOpt.cantrip, note: 'High Elf cantrip (INT)' });
    if (c.race === 'tiefling') {
        out.push({ name: 'Thaumaturgy', note: 'Infernal Legacy (CHA)' });
        if (c.level >= 3) out.push({ name: 'Hellish Rebuke', note: '2nd level, once per long rest (CHA)' });
        if (c.level >= 5) out.push({ name: 'Darkness', note: 'Once per long rest (CHA)' });
    }
    return out;
}

// ── Ability scores ───────────────────────────────────────
function cbRacialBonus(c) {
    const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const race = cbRace(c.race), sub = cbSubrace(c);
    [race && race.abil, sub && sub.abil].forEach(b => { if (b) Object.keys(b).forEach(a => { out[a] += b[a]; }); });
    if (race && race.choose && race.choose.abil) c.raceOpt.abil.forEach(a => { if (a !== race.choose.abilNot) out[a] += 1; });
    return out;
}

// The levels this class gets an Ability Score Improvement (or a feat), up to its level.
function cbAsiLevels(c) {
    const k = cbClass(c.cls);
    return ((k && k.asi) || CB_ASI_LEVELS).filter(lv => lv <= c.level);
}

// Final scores: base + race + ASIs (+ Primal Champion), capped at 20 (24 for the champion's STR and CON).
function cbScores(c) {
    const race = cbRacialBonus(c);
    const s = {};
    CB_ABILITIES.forEach(a => { s[a] = c.base[a] + race[a]; });
    cbAsiLevels(c).forEach(lv => {
        const pick = c.asi[lv];
        if (!pick || pick.feat) return;
        s[pick.a] = Math.min(20, s[pick.a] + 1);
        s[pick.b] = Math.min(20, s[pick.b] + 1);
    });
    if (c.cls === 'barbarian' && c.level >= 20) { s.str = Math.min(24, s.str + 4); s.con = Math.min(24, s.con + 4); }
    return s;
}

function cbFeats(c) {
    return cbAsiLevels(c).map(lv => c.asi[lv]).filter(p => p && p.feat).map(p => p.feat);
}

function cbPointSpent(base) {
    return CB_ABILITIES.reduce((t, a) => t + (CB_POINT_COST[base[a]] === undefined ? 99 : CB_POINT_COST[base[a]]), 0);
}

// Roll 4d6, drop the lowest, six times → [{ total, dice }].
function cbRollScores() {
    return Array.from({ length: 6 }, () => {
        if (typeof rollDice === 'function') {
            const r = rollDice('4d6dl1');
            return { total: r.total, dice: r.parts[0].rolls.map(x => x.v) };
        }
        const dice = Array.from({ length: 4 }, () => 1 + Math.floor(cbRand() * 6));
        return { total: dice.reduce((a, b) => a + b, 0) - Math.min(...dice), dice };
    });
}

// ── Proficiencies ────────────────────────────────────────
function cbSkillSources(c) {
    const src = {};
    const add = (list, from) => (list || []).forEach(s => { if (CB_SKILLS[s] && !src[s]) src[s] = from; });
    const race = cbRace(c.race);
    add(race && race.skills, race && race.name);
    add(c.raceOpt.skills, race && race.name);
    const bg = CB_BACKGROUNDS[c.bg];
    add(c.bg === 'acolyte' ? bg.skills : c.bgOpt.skills, c.bg === 'custom' ? (c.bgOpt.name || 'Background') : bg && bg.name);
    add(c.skills, cbClass(c.cls) ? cbClass(c.cls).name : 'Class');
    if (c.cls === 'bard' && c.level >= 3) add(c.opts.loreSkills, 'College of Lore');
    if (c.cls === 'warlock' && c.opts.invocations.includes('beguiling-influence')) add(['deception', 'persuasion'], 'Beguiling Influence');
    return src;
}

// Skills the class step may still offer: the class list minus what race and background give.
function cbClassSkillChoices(c) {
    const k = cbClass(c.cls);
    if (!k) return [];
    return k.skills.from === 'any' ? Object.keys(CB_SKILLS) : k.skills.from;
}

function cbExpertiseCount(c) {
    if (c.cls === 'rogue') return c.level >= 6 ? 4 : 2;
    if (c.cls === 'bard') return c.level >= 10 ? 4 : c.level >= 3 ? 2 : 0;
    return 0;
}

function cbTools(c) {
    const k = cbClass(c.cls), race = cbRace(c.race), sub = cbSubrace(c);
    const out = [...((k && k.tools) || []), ...c.tools, ...((sub && sub.tools) || [])];
    if (race && race.choose && race.choose.tool && c.raceOpt.tool) out.push(c.raceOpt.tool);
    if (c.bg === 'custom') c.bgOpt.extras.forEach(x => { if (CB_TOOLS.includes(x)) out.push(x); });
    return [...new Set(out)];
}

function cbLanguages(c) {
    const race = cbRace(c.race);
    const out = [...((race && race.langs) || []), ...c.raceOpt.langs];
    if (c.bg === 'acolyte') out.push(...c.bgOpt.langs);
    if (c.bg === 'custom') c.bgOpt.extras.forEach(x => { if (CB_LANGUAGES.includes(x)) out.push(x); });
    if (c.cls === 'sorcerer') out.push('Draconic');
    return [...new Set(out)];
}

// How many extra languages the race and background ask for.
function cbLanguageSlots(c) {
    const race = cbRace(c.race), sub = cbSubrace(c);
    const raceN = ((race && race.choose && race.choose.lang) || 0) + ((sub && sub.choose && sub.choose.lang) || 0);
    return { race: raceN, bg: c.bg === 'acolyte' ? 2 : 0 };
}

function cbArmorProfs(c) {
    const k = cbClass(c.cls);
    const out = [...((k && k.armor) || [])];
    if (c.cls === 'cleric') out.push('heavy');
    return [...new Set(out)];
}

function cbWeaponProf(c, id) {
    const k = cbClass(c.cls), w = cbWeapon(id), race = cbRace(c.race), sub = cbSubrace(c);
    if (!w) return false;
    const list = [...((k && k.weapons) || []), ...((race && race.weapons) || []), ...((sub && sub.weapons) || [])];
    return list.includes(w.cat) || list.includes(id);
}

// ── Equipment ────────────────────────────────────────────
function cbPickList(kind, c) {
    const ids = Object.keys(CB_WEAPONS);
    const by = (cat, melee) => ids.filter(id => CB_WEAPONS[id][1] === cat && (melee === undefined || (CB_WEAPONS[id][2] === 'melee') === melee));
    if (kind === 'simple') return by('simple');
    if (kind === 'martial') return by('martial');
    if (kind === 'simple-melee') return by('simple', true);
    if (kind === 'martial-melee') return by('martial', true);
    if (kind === 'instrument') return CB_INSTRUMENTS;
    return [];
}

// Item tokens → gear rows. picks: { 'group-option-index': weapon id or instrument }.
function cbTokensToGear(tokens, picksKey, picks, out) {
    tokens.forEach((t, i) => {
        const [kind, rest] = t.split(/:(.+)/);
        const [what, n] = rest.split('*');
        const qty = Number(n) || 1;
        if (kind === 'w') { const w = cbWeapon(what); cbAddGear(out, { name: w.name, qty, w: what }); }
        else if (kind === 'a') { const a = cbArmor(what); cbAddGear(out, { name: a.name, qty: 1, a: what }); }
        else if (kind === 'g' || kind === 'pack') cbAddGear(out, { name: what, qty });
        else if (kind === 'pick') {
            const v = picks[`${picksKey}-${i}`];
            if (CB_WEAPONS[v]) cbAddGear(out, { name: CB_WEAPONS[v][0], qty: 1, w: v });
            else if (v) cbAddGear(out, { name: v, qty: 1 });
        }
    });
}

function cbAddGear(list, item) {
    const same = list.find(g => g.name === item.name);
    if (same) same.qty = Math.min(9999, same.qty + item.qty);
    else list.push({ ...item });
    return list;
}

function cbBackgroundGear(c) {
    const bg = CB_BACKGROUNDS[c.bg];
    return bg ? { gear: bg.gear.map(name => ({ name, qty: 1 })), gold: bg.gold } : { gear: [], gold: 0 };
}

// The class's starting gear for the options picked, plus the background's.
function cbClassGear(c) {
    const k = cbClass(c.cls);
    const bg = cbBackgroundGear(c);
    const out = [];
    if (k) k.equip.forEach((group, gi) => {
        const oi = Math.min(group.length - 1, c.equip.choice[gi] || 0);
        cbTokensToGear(group[oi], `${gi}-${oi}`, c.equip.picks, out);
    });
    bg.gear.forEach(g => cbAddGear(out, g));
    return { gear: out, coins: bg.gold };
}

// The options' unfilled picks: ['0-1-0', ...].
function cbMissingPicks(c) {
    const k = cbClass(c.cls);
    if (!k) return [];
    const out = [];
    k.equip.forEach((group, gi) => {
        const oi = Math.min(group.length - 1, c.equip.choice[gi] || 0);
        group[oi].forEach((t, i) => { if (t.startsWith('pick:') && !c.equip.picks[`${gi}-${oi}-${i}`]) out.push(`${gi}-${oi}-${i}`); });
    });
    return out;
}

// Wear whichever usable armor (or none) gives the best AC, and a shield if the class can use one.
function cbAutoWear(c) {
    const profs = cbArmorProfs(c);
    c.wear.shield = profs.includes('shield') && c.gear.some(g => g.name === 'Shield');
    let best = { ac: -1, id: '' };
    ['', ...c.gear.filter(g => g.a && profs.includes(cbArmor(g.a).type)).map(g => g.a)].forEach(id => {
        c.wear.armor = id;
        const ac = cbDerive(c).ac;
        if (ac > best.ac) best = { ac, id };
    });
    c.wear.armor = best.id;
}

// ── Class choices (styles, invocations, ...) ─────────────
// [{ key, label, n, options: { id: [name, summary] }, multi }], what this class picks at its level.
function cbClassChoices(c) {
    const k = cbClass(c.cls), L = c.level, out = [];
    if (!k) return out;
    const styles = CB_CLASS_STYLES[c.cls];
    if (styles) {
        const n = c.cls === 'fighter' ? (L >= 10 ? 2 : 1) : L >= 2 ? 1 : 0;
        if (n) out.push({ key: 'styles', label: 'Fighting Style', n, options: Object.fromEntries(styles.map(s => [s, CB_FIGHTING_STYLES[s]])) });
    }
    if (c.cls === 'ranger') {
        out.push({ key: 'enemies', label: 'Favored Enemy', n: L >= 14 ? 3 : L >= 6 ? 2 : 1, options: Object.fromEntries(CB_ENEMIES.map(e => [e, [e, '']])) });
        out.push({ key: 'terrains', label: 'Favored Terrain', n: L >= 10 ? 3 : L >= 6 ? 2 : 1, options: Object.fromEntries(CB_TERRAINS.map(t => [t, [t, '']])) });
        Object.keys(CB_HUNTER).map(Number).filter(lv => L >= lv).forEach(lv => {
            out.push({ key: 'hunter.' + lv, label: CB_HUNTER[lv].label, n: 1, single: true, options: CB_HUNTER[lv].opts });
        });
    }
    if (c.cls === 'druid' && L >= 2) out.push({ key: 'land', label: 'Circle land', n: 1, single: true, options: Object.fromEntries(CB_TERRAINS.map(t => [t, [t, `Circle spells: ${Object.values(CB_LAND_SPELLS[t]).flat().join(', ')}.`]])) });
    if (c.cls === 'sorcerer') {
        out.push({ key: 'dragon', label: 'Dragon Ancestor', n: 1, single: true, options: Object.fromEntries(Object.entries(CB_DRAGONS).map(([id, d]) => [id, [d.name, `${d.dmg[0].toUpperCase() + d.dmg.slice(1)} damage`]])) });
        if (L >= 3) out.push({ key: 'metamagic', label: 'Metamagic', n: L >= 17 ? 4 : L >= 10 ? 3 : 2, options: CB_METAMAGIC });
    }
    if (c.cls === 'warlock') {
        if (L >= 3) out.push({ key: 'pact', label: 'Pact Boon', n: 1, single: true, options: CB_PACTS });
        if (L >= 2) {
            const known = cbSpellsKnownAll(c);
            const opts = {};
            Object.entries(CB_INVOCATIONS).forEach(([id, v]) => {
                const req = v[2] || {};
                if (req.L && L < req.L) return;
                if (req.pact && c.opts.pact !== req.pact) return;
                if (req.spell && !known.includes(req.spell)) return;
                opts[id] = v;
            });
            out.push({ key: 'invocations', label: 'Eldritch Invocations', n: CB_INVOCATIONS_KNOWN[L - 1], options: opts });
        }
    }
    if (c.cls === 'bard' && L >= 3) out.push({ key: 'loreSkills', label: 'Lore: Bonus Proficiencies', n: 3, options: Object.fromEntries(Object.entries(CB_SKILLS).map(([id, s]) => [id, [s[0], '']])), skills: true });
    return out;
}

function cbChoiceValue(c, key) {
    if (key.startsWith('hunter.')) { const v = c.opts.hunter[key.slice(7)]; return v ? [v] : []; }
    const v = c.opts[key];
    return Array.isArray(v) ? v : v ? [v] : [];
}

function cbSetChoice(c, key, values) {
    if (key.startsWith('hunter.')) { c.opts.hunter[key.slice(7)] = values[0] || ''; return; }
    if (Array.isArray(c.opts[key])) c.opts[key] = values;
    else c.opts[key] = values[0] || '';
}

function cbSpellsKnownAll(c) {
    return [...c.spells.cantrips, ...c.spells.list];
}

// ── Hit points ───────────────────────────────────────────
function cbHitPoints(c) {
    const k = cbClass(c.cls);
    if (!k) return 0;
    const con = cbMod(cbScores(c).con);
    const avg = k.hd / 2 + 1;
    let hp = Math.max(1, k.hd + con);
    for (let lv = 2; lv <= c.level; lv++) {
        const roll = c.hpMode === 'roll' && c.hpRolls[lv - 2] ? Math.min(k.hd, c.hpRolls[lv - 2]) : avg;
        hp += Math.max(1, roll + con);
    }
    const sub = cbSubrace(c);
    if (sub && sub.hpPerLevel) hp += sub.hpPerLevel * c.level;
    if (c.cls === 'sorcerer') hp += c.level;
    return hp;
}

// ── The sheet ────────────────────────────────────────────
function cbDerive(c) {
    const k = cbClass(c.cls), race = cbRace(c.race), sub = cbSubrace(c), L = c.level;
    const prof = cbProf(L);
    const s = cbScores(c);
    const m = {};
    CB_ABILITIES.forEach(a => { m[a] = cbMod(s[a]); });
    const dc = a => 8 + prof + m[a];
    const has = (cls, lv) => c.cls === cls && L >= lv;
    const style = id => c.opts.styles.includes(id) && !!CB_CLASS_STYLES[c.cls];

    // Saves
    const saveProf = new Set((k && k.saves) || []);
    if (has('monk', 14)) CB_ABILITIES.forEach(a => saveProf.add(a));
    if (has('rogue', 15)) saveProf.add('wis');
    const aura = has('paladin', 6) ? Math.max(1, m.cha) : 0;
    const saves = CB_ABILITIES.map(a => ({ a, prof: saveProf.has(a), total: m[a] + (saveProf.has(a) ? prof : 0) + aura }));

    // Skills
    const src = cbSkillSources(c);
    const expert = new Set(c.expertise);
    const jack = has('bard', 2) ? Math.floor(prof / 2) : 0;
    const athlete = has('fighter', 7) ? Math.ceil(prof / 2) : 0;
    const skills = Object.entries(CB_SKILLS).map(([id, [name, a]]) => {
        const p = !!src[id], e = p && expert.has(id);
        let total = m[a] + (e ? 2 * prof : p ? prof : 0);
        if (!p) total += Math.max(jack, ['str', 'dex', 'con'].includes(a) ? athlete : 0);
        return { id, name, a, prof: p, expert: e, from: src[id] || '', total };
    });
    const perception = skills.find(x => x.id === 'perception').total;

    // Armor class
    const armor = cbArmor(c.wear.armor) && c.gear.some(g => g.a === c.wear.armor) ? cbArmor(c.wear.armor) : null;
    const shield = c.wear.shield && c.gear.some(g => g.name === 'Shield');
    const notes = [];
    let ac, acHow;
    if (armor) {
        const dex = armor.cap === null ? m.dex : Math.min(m.dex, armor.cap);
        ac = armor.base + dex;
        acHow = armor.name;
        if (style('defense')) { ac += 1; acHow += ', Defense'; }
        if (!cbArmorProfs(c).includes(armor.type)) notes.push(`Not proficient with ${armor.type} armor: disadvantage on STR and DEX rolls, and no spellcasting.`);
        if (armor.str && s.str < armor.str && c.race !== 'dwarf') notes.push(`${armor.name} needs STR ${armor.str}: speed −10 ft.`);
        if (armor.stealth) notes.push(`${armor.name}: disadvantage on Stealth.`);
    } else {
        const opts = [[10 + m.dex, 'no armor']];
        if (c.cls === 'barbarian') opts.push([10 + m.dex + m.con, 'Unarmored Defense']);
        if (c.cls === 'monk' && !shield) opts.push([10 + m.dex + m.wis, 'Unarmored Defense']);
        if (c.cls === 'sorcerer') opts.push([13 + m.dex, 'Draconic Resilience']);
        [ac, acHow] = opts.sort((x, y) => y[0] - x[0])[0];
    }
    if (shield) {
        ac += 2; acHow += ', shield';
        if (!cbArmorProfs(c).includes('shield')) notes.push('Not proficient with shields.');
    }

    // Speed
    let speed = race ? race.speed : 30;
    const heavy = armor && armor.type === 'heavy';
    if (has('barbarian', 5) && !heavy) speed += 10;
    if (has('monk', 2) && !armor && !shield) speed += L >= 18 ? 30 : L >= 14 ? 25 : L >= 10 ? 20 : L >= 6 ? 15 : 10;
    if (armor && armor.str && s.str < armor.str && c.race !== 'dwarf') speed -= 10;

    // Initiative
    const init = m.dex + Math.max(jack, athlete);

    // Attacks
    const martial = L >= 17 ? 10 : L >= 11 ? 8 : L >= 5 ? 6 : 4;
    const attacks = [];
    const seen = new Set();
    c.gear.forEach(g => {
        if (!g.w || seen.has(g.w)) return;
        seen.add(g.w);
        const w = cbWeapon(g.w);
        const monkWeapon = c.cls === 'monk' && (g.w === 'shortsword' || (w.cat === 'simple' && w.kind === 'melee' && !w.props.includes('h') && !w.props.includes('2')));
        const a = w.kind === 'ranged' ? 'dex' : (w.props.includes('f') || monkWeapon) ? (m.dex > m.str ? 'dex' : 'str') : 'str';
        const p = cbWeaponProf(c, g.w);
        let hit = m[a] + (p ? prof : 0);
        if (w.kind === 'ranged' && style('archery')) hit += 2;
        let die = w.dmg;
        if (monkWeapon && /^1d\d+$/.test(die) && Number(die.slice(2)) < martial) die = '1d' + martial;
        let bonus = m[a];
        if (w.kind === 'melee' && !w.props.includes('2') && style('dueling')) bonus += 2;
        const props = w.props.map(x => CB_PROP_NAMES[x]).filter(x => x !== 'versatile');
        if (w.vers) props.push(`versatile (${w.vers})`);
        if (w.range) props.push(`range ${w.range} ft.`);
        attacks.push({ name: w.name, hit, dmg: die === '1' ? `${1 + bonus}` : `${die}${bonus ? ' ' + cbSign(bonus).replace(/^([+-])/, '$1 ') : ''}`, type: w.type, props: props.join(', '), prof: p });
    });
    const unarmedDie = c.cls === 'monk' ? `1d${martial}` : '';
    const ua = c.cls === 'monk' ? Math.max(m.str, m.dex) : m.str;
    attacks.push({ name: 'Unarmed strike', hit: ua + prof, dmg: unarmedDie ? `${unarmedDie}${ua ? ' ' + cbSign(ua).replace(/^([+-])/, '$1 ') : ''}` : `${Math.max(1, 1 + ua)}`, type: 'bludgeoning', props: '', prof: true });

    // Dragonborn breath
    let breath = null;
    if (c.race === 'dragonborn') {
        const d = CB_DRAGONS[c.raceOpt.ancestry] || CB_DRAGONS.red;
        breath = { ...d, dice: `${L >= 16 ? 5 : L >= 11 ? 4 : L >= 6 ? 3 : 2}d6`, kind: CB_DRAGONS[c.raceOpt.ancestry] ? d.name : '' };
    }

    // Spellcasting
    let magic = null;
    const rules = cbSpellRules(c);
    if (rules) {
        const a = rules.ability;
        magic = { ability: a, dc: dc(a), attack: prof + m[a], slots: rules.slots, pact: rules.pact, rules,
            always: cbAlwaysSpells(c) };
    }

    // Features
    const x = { L, prof, m, dc, ord: cbOrd, breath: breath || {}, dragon: CB_DRAGONS[c.opts.dragon] || null,
        rages: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 99][L - 1], rageDmg: L >= 16 ? 4 : L >= 9 ? 3 : 2,
        martial, pact: CB_PACT_SLOTS[L - 1] };
    const say = t => (typeof t === 'function' ? t(x) : t);
    const raceTraits = [...((race && race.traits) || []), ...((sub && sub.traits) || [])].map(([n, t]) => ({ name: n, text: say(t) }));
    const classFeatures = k ? k.features.filter(f => f[0] <= L).map(([lv, n, t]) => ({ level: lv, name: n, text: say(t) })) : [];
    const picked = [];
    cbClassChoices(c).forEach(ch => {
        cbChoiceValue(c, ch.key).forEach(v => {
            const o = ch.options[v];
            if (o && !ch.skills) picked.push({ name: `${ch.label}: ${o[0]}`, text: o[1] });
        });
    });
    const feats = cbFeats(c).map(f => ({ name: CB_FEATS[f].name, text: CB_FEATS[f].text }));
    const bg = CB_BACKGROUNDS[c.bg];
    const bgFeature = bg && bg.feature ? { name: bg.feature[0], text: bg.feature[1] } : null;

    // Resistances and senses
    const senses = [];
    if (race && race.dark) senses.push(`Darkvision ${race.dark} ft.`);
    senses.push(`Passive Perception ${10 + perception}`);

    const hp = cbHitPoints(c);
    return {
        k, race, sub, L, prof, s, m, saves, skills, ac, acHow, notes, speed, init, hp, hd: k ? `${L}d${k.hd}` : '',
        passive: 10 + perception, attacks, breath, magic, raceTraits, classFeatures, picked, feats, bgFeature,
        senses, tools: cbTools(c), langs: cbLanguages(c), armorProfs: cbArmorProfs(c),
        weaponProfs: cbWeaponProfText(c), x
    };
}

function cbWeaponProfText(c) {
    const k = cbClass(c.cls), race = cbRace(c.race), sub = cbSubrace(c);
    const list = [...((k && k.weapons) || []), ...((race && race.weapons) || []), ...((sub && sub.weapons) || [])];
    const out = [];
    if (list.includes('simple')) out.push('simple weapons');
    if (list.includes('martial')) out.push('martial weapons');
    list.filter(w => CB_WEAPONS[w] && !list.includes(CB_WEAPONS[w][1])).forEach(w => out.push(CB_WEAPONS[w][0].toLowerCase()));
    return [...new Set(out)];
}

// ── What's left to pick ──────────────────────────────────
// [{ step, text }]
function cbTodo(c) {
    const out = [];
    const add = (step, text) => out.push({ step, text });
    const race = cbRace(c.race), sub = cbSubrace(c), k = cbClass(c.cls);
    if (!race) add('race', 'Choose a race.');
    else {
        const ch = race.choose || {}, sch = (sub && sub.choose) || {};
        if (ch.abil && c.raceOpt.abil.filter(a => a !== ch.abilNot).length < ch.abil) add('race', `Pick ${ch.abil} abilities for +1.`);
        if (ch.skill && c.raceOpt.skills.length < ch.skill) add('race', `Pick ${ch.skill - c.raceOpt.skills.length} more skill${ch.skill - c.raceOpt.skills.length > 1 ? 's' : ''}.`);
        if (ch.tool && !c.raceOpt.tool) add('race', 'Pick a tool proficiency.');
        if (ch.ancestry && !c.raceOpt.ancestry) add('race', 'Pick a draconic ancestry.');
        if (sch.cantrip && !c.raceOpt.cantrip) add('race', 'Pick a wizard cantrip.');
        const langN = (ch.lang || 0) + (sch.lang || 0);
        if (c.raceOpt.langs.length < langN) add('race', `Pick ${langN - c.raceOpt.langs.length} more language${langN - c.raceOpt.langs.length > 1 ? 's' : ''}.`);
    }
    if (!k) add('class', 'Choose a class.');
    else {
        cbClassChoices(c).forEach(ch => {
            const have = cbChoiceValue(c, ch.key).filter(v => ch.options[v]).length;
            if (have < ch.n) add('class', `${ch.label}: pick ${ch.n - have} more.`);
            if (have > ch.n) add('class', `${ch.label}: ${have - ch.n} too many picked.`);
        });
        cbAsiLevels(c).forEach(lv => {
            const p = c.asi[lv];
            if (!p) add('abilities', `Level ${lv}: choose an Ability Score Improvement or a feat.`);
            else if (p.feat && CB_FEATS[p.feat].req) {
                const s = cbScores(c);
                Object.entries(CB_FEATS[p.feat].req).forEach(([a, n]) => { if (s[a] < n) add('abilities', `${CB_FEATS[p.feat].name} needs ${a.toUpperCase()} ${n}.`); });
            }
        });
        if (c.hpMode === 'roll') for (let lv = 2; lv <= c.level; lv++) if (!c.hpRolls[lv - 2]) { add('class', `Roll hit points for level ${lv}.`); break; }
    }
    if (!c.assigned) add('abilities', 'Set your ability scores.');
    else if (c.method === 'point' && cbPointSpent(c.base) > CB_POINT_BUDGET) add('abilities', 'Point buy is over budget.');
    if (!c.bg) add('background', 'Choose a background.');
    else if (c.bg === 'acolyte' && c.bgOpt.langs.length < 2) add('background', `Pick ${2 - c.bgOpt.langs.length} more language${c.bgOpt.langs.length === 1 ? '' : 's'}.`);
    else if (c.bg === 'custom') {
        if (c.bgOpt.skills.length < 2) add('background', 'Pick two background skills.');
        if (c.bgOpt.extras.length < 2) add('background', 'Pick two tools or languages.');
    }
    if (k) {
        const n = k.skills.n - c.skills.length;
        if (n > 0) add('skills', `Pick ${n} more class skill${n > 1 ? 's' : ''}.`);
        if (n < 0) add('skills', `${-n} class skill${n < -1 ? 's' : ''} too many.`);
        if (k.toolPick && c.tools.length < k.toolPick.n) add('skills', `Pick ${k.toolPick.n - c.tools.length} more tool${k.toolPick.n - c.tools.length > 1 ? 's' : ''}.`);
        const ex = cbExpertiseCount(c) - c.expertise.length;
        if (ex > 0) add('skills', `Pick ${ex} more expertise.`);
        const dup = cbDuplicateSkills(c);
        if (dup.length) add('skills', `Proficient twice in ${dup.map(s => CB_SKILLS[s][0]).join(', ')}: pick another.`);
    }
    if (!c.gearSet) add('equipment', 'Choose your starting equipment.');
    const r = cbSpellRules(c);
    if (r) {
        const cantrips = c.spells.cantrips.length;
        if (cantrips < r.cantrips) add('spells', `Pick ${r.cantrips - cantrips} more cantrip${r.cantrips - cantrips > 1 ? 's' : ''}.`);
        if (cantrips > r.cantrips) add('spells', `${cantrips - r.cantrips} cantrip${cantrips - r.cantrips > 1 ? 's' : ''} too many.`);
        const word = r.type === 'prepared' ? 'prepared spell' : r.type === 'book' ? 'spellbook spell' : 'spell';
        if (c.spells.list.length < r.list) add('spells', `Pick ${r.list - c.spells.list.length} more ${word}${r.list - c.spells.list.length > 1 ? 's' : ''}.`);
        if (c.spells.list.length > r.list) add('spells', `${c.spells.list.length - r.list} ${word}${c.spells.list.length - r.list > 1 ? 's' : ''} too many.`);
        if (r.type === 'book' && c.spells.prepared.length < r.prepared && c.spells.prepared.length < c.spells.list.length) add('spells', `Prepare ${Math.min(r.prepared, c.spells.list.length) - c.spells.prepared.length} more spell${Math.min(r.prepared, c.spells.list.length) - c.spells.prepared.length > 1 ? 's' : ''} from your book.`);
        if (r.type === 'book' && c.spells.prepared.length > r.prepared) add('spells', `${c.spells.prepared.length - r.prepared} prepared too many.`);
        const tooHigh = c.spells.list.filter(n => (cbSpell(n) || {}).level > r.maxLevel);
        if (tooHigh.length) add('spells', `Too high a level for you now: ${tooHigh.join(', ')}.`);
        r.arcanum.forEach(lv => { if (!c.spells.arcanum[lv]) add('spells', `Mystic Arcanum: pick a ${cbOrd(lv)}-level spell.`); });
    }
    return out;
}

// Skills the character got from two places (they should pick another in the later step).
function cbDuplicateSkills(c) {
    const race = cbRace(c.race);
    const seen = {}, dup = new Set();
    const add = list => (list || []).forEach(s => { if (seen[s]) dup.add(s); seen[s] = true; });
    add(race && race.skills); add(c.raceOpt.skills);
    add(c.bg === 'acolyte' ? CB_BACKGROUNDS.acolyte.skills : c.bgOpt.skills);
    add(c.skills);
    if (c.cls === 'bard' && c.level >= 3) add(c.opts.loreSkills);
    return [...dup];
}

// ── Level up ─────────────────────────────────────────────
// Raises the level by one; a rolled-HP character rolls the new hit die.
// Returns what the new level brings: { features, todo }.
function cbLevelUp(c) {
    if (c.level >= 20) return null;
    const k = cbClass(c.cls);
    c.level += 1;
    if (c.hpMode === 'roll' && k) c.hpRolls[c.level - 2] = cbRollDie(k.hd);
    const features = k ? k.features.filter(f => f[0] === c.level).map(f => f[1]) : [];
    if (cbAsiLevels(c).includes(c.level)) features.push('Ability Score Improvement');
    return { features, todo: cbTodo(c) };
}

function cbRollDie(sides) {
    if (typeof rollDice === 'function') return rollDice('1d' + sides).total;
    return 1 + Math.floor(cbRand() * sides);
}

// Trim picks a lower level no longer allows (level down, or a class change).
function cbFitToLevel(c) {
    c.hpRolls = c.hpRolls.slice(0, Math.max(0, c.level - 1));
    Object.keys(c.asi).forEach(lv => { if (!cbAsiLevels(c).includes(Number(lv))) delete c.asi[lv]; });
    cbClassChoices(c).forEach(ch => {
        const v = cbChoiceValue(c, ch.key).filter(x => ch.options[x]);
        if (!ch.single && v.length > ch.n) cbSetChoice(c, ch.key, v.slice(0, ch.n));
    });
    Object.keys(c.opts.hunter).forEach(lv => { if (c.level < Number(lv)) delete c.opts.hunter[lv]; });
    if (c.cls !== 'warlock' || c.level < 3) c.opts.pact = '';
    if (c.expertise.length > cbExpertiseCount(c)) c.expertise = c.expertise.slice(0, cbExpertiseCount(c));
    const r = cbSpellRules(c);
    if (!r) c.spells = { cantrips: [], list: [], prepared: [], arcanum: {}, fav: [] };
    else {
        [6, 7, 8, 9].forEach(lv => { if (!r.arcanum.includes(lv)) delete c.spells.arcanum[lv]; });
        if (r.type !== 'book') c.spells.prepared = [];
    }
}

// ── Party (F46) ──────────────────────────────────────────
// The character as a Party tab row; same id, so adding again updates the row.
function cbPartyRow(c) {
    const d = cbDerive(c);
    return { id: c.id, name: c.name, player: c.player, cls: d.k ? d.k.name : '', level: c.level, ac: d.ac, hp: d.hp, pp: d.passive, init: d.init };
}

// ── Text copy ────────────────────────────────────────────
function cbSummary(c) {
    const d = cbDerive(c);
    const race = d.sub ? d.sub.name : d.race ? d.race.name : '';
    const lines = [
        `${c.name || 'Unnamed character'}: level ${c.level} ${race} ${d.k ? d.k.name : ''}`.trim(),
        `AC ${d.ac} · HP ${d.hp} · Speed ${d.speed} ft. · Initiative ${cbSign(d.init)} · Proficiency ${cbSign(d.prof)} · Passive Perception ${d.passive}`,
        CB_ABILITIES.map(a => `${a.toUpperCase()} ${d.s[a]} (${cbSign(d.m[a])})`).join(' · '),
        'Saves: ' + d.saves.filter(x => x.prof).map(x => `${x.a.toUpperCase()} ${cbSign(x.total)}`).join(', '),
        'Skills: ' + d.skills.filter(x => x.prof).map(x => `${x.name} ${cbSign(x.total)}`).join(', '),
        'Attacks: ' + d.attacks.map(a => `${a.name} ${cbSign(a.hit)} (${a.dmg} ${a.type})`).join('; ')
    ];
    if (d.magic) lines.push(`Spell save DC ${d.magic.dc}, spell attack ${cbSign(d.magic.attack)}`);
    return lines.join('\n');
}

// ── Quick build ──────────────────────────────────────────
const CB_QUICK_BACKGROUNDS = ['Wanderer', 'Caravan guard', 'Dockhand', 'Village healer', 'Scribe', 'Hunter', 'Farmhand', 'Former cultist', 'Minstrel\'s apprentice', 'Smith\'s apprentice', 'Ferry pilot', 'Ratcatcher'];
const CB_NPC_RACE = { dwarf: 'dwarf', elf: 'elf', halfling: 'halfling', human: 'human', dragonborn: 'dragonborn', gnome: 'gnome', 'half-elf': 'elf', 'half-orc': 'orc', tiefling: 'tiefling' };

// opts: { level, cls, race } ('' = random). Returns a complete character.
function cbQuickBuild(opts = {}) {
    const c = cbBlank();
    const race = cbRace(opts.race) || cbPick(CB_RACES);
    const k = cbClass(opts.cls) || cbPick(CB_CLASSES);
    c.race = race.id;
    c.subrace = race.subraces ? race.subraces[0].id : '';
    c.cls = k.id;
    c.level = Math.min(20, Math.max(1, Math.round(Number(opts.level)) || 1));
    const prio = [...new Set([...k.primary, 'con', 'dex', 'wis', 'str', 'int', 'cha'])];

    // Race picks
    const ch = race.choose || {}, sub = cbSubrace(c), sch = (sub && sub.choose) || {};
    if (ch.abil) c.raceOpt.abil = prio.filter(a => a !== ch.abilNot).slice(0, ch.abil);
    if (ch.tool) c.raceOpt.tool = cbPick(ch.tool);
    if (ch.ancestry) c.raceOpt.ancestry = cbPick(Object.keys(CB_DRAGONS));
    if (sch.cantrip) c.raceOpt.cantrip = cbPick(cbSpellsFor('Wizard', 0)).name;
    const langN = (ch.lang || 0) + (sch.lang || 0);
    c.raceOpt.langs = cbShuffle(CB_LANGUAGES.filter(l => !(race.langs || []).includes(l))).slice(0, langN);

    // Scores: the standard array, best first into the class's key abilities.
    c.method = 'array';
    prio.forEach((a, i) => { c.base[a] = CB_STANDARD_ARRAY[i]; });
    c.assigned = true;

    // Background
    if (cbRand() < 0.4) {
        c.bg = 'acolyte';
        c.bgOpt.langs = cbShuffle(CB_LANGUAGES.filter(l => !cbLanguages(c).includes(l))).slice(0, 2);
    } else {
        c.bg = 'custom';
        c.bgOpt.name = cbPick(CB_QUICK_BACKGROUNDS);
    }

    // Skills: race first, then class, then background and half-elf picks from what's left.
    const taken = new Set([...(race.skills || [])]);
    if (c.bg === 'acolyte') CB_BACKGROUNDS.acolyte.skills.forEach(s => taken.add(s));
    c.skills = cbShuffle(cbClassSkillChoices(c).filter(s => !taken.has(s))).slice(0, k.skills.n);
    c.skills.forEach(s => taken.add(s));
    if (c.bg === 'custom') {
        c.bgOpt.skills = cbShuffle(Object.keys(CB_SKILLS).filter(s => !taken.has(s))).slice(0, 2);
        c.bgOpt.skills.forEach(s => taken.add(s));
        const extras = cbShuffle([...CB_TOOLS.slice(0, 17), 'Herbalism kit', "Navigator's tools", ...CB_GAMING_SETS]).filter(t => !cbTools(c).includes(t));
        c.bgOpt.extras = [extras[0], cbPick(CB_LANGUAGES.filter(l => !cbLanguages(c).includes(l)))];
    }
    if (ch.skill) { c.raceOpt.skills = cbShuffle(Object.keys(CB_SKILLS).filter(s => !taken.has(s))).slice(0, ch.skill); c.raceOpt.skills.forEach(s => taken.add(s)); }
    if (k.toolPick) {
        const from = k.toolPick.from === 'instrument' ? CB_INSTRUMENTS : [...CB_ARTISAN_TOOLS, ...CB_INSTRUMENTS];
        c.tools = cbShuffle(from).slice(0, k.toolPick.n);
    }

    // Class picks, level by level
    for (let pass = 0; pass < 3; pass++) {
        cbClassChoices(c).forEach(choice => {
            const have = cbChoiceValue(c, choice.key).filter(v => choice.options[v]);
            if (have.length >= choice.n) return;
            let pool = Object.keys(choice.options).filter(v => !have.includes(v));
            if (choice.skills) pool = pool.filter(s => !taken.has(s));
            const add = cbShuffle(pool).slice(0, choice.n - have.length);
            cbSetChoice(c, choice.key, [...have, ...add]);
            if (choice.skills) add.forEach(s => taken.add(s));
        });
    }
    if (cbExpertiseCount(c)) {
        const prof = Object.keys(cbSkillSources(c));
        const want = prof.filter(s => k.primary.includes(CB_SKILLS[s][1]));
        c.expertise = [...cbShuffle(want), ...cbShuffle(prof.filter(s => !want.includes(s)))].slice(0, cbExpertiseCount(c));
    }

    // ASIs: +2 to the key ability until 20, then the next.
    // Scores as of each level, so Primal Champion's +4 at 20 doesn't count early.
    const top = c.level;
    cbAsiLevels(c).forEach(lv => {
        c.level = Math.min(lv, 19);
        const s = cbScores(c);
        const a = prio.find(x => s[x] < 20) || prio[0];
        c.asi[lv] = s[a] <= 18 ? { a, b: a } : { a, b: prio.find(y => y !== a && s[y] < 20) || a };
    });
    c.level = top;

    // Gear: random options, random picks among weapons the character can use.
    c.equipMode = 'class';
    c.equip.choice = k.equip.map(g => Math.floor(cbRand() * g.length));
    k.equip.forEach((g, gi) => {
        const oi = c.equip.choice[gi];
        g[oi].forEach((t, i) => {
            if (!t.startsWith('pick:')) return;
            const list = cbPickList(t.slice(5), c);
            const usable = list.filter(w => !CB_WEAPONS[w] || cbWeaponProf(c, w));
            c.equip.picks[`${gi}-${oi}-${i}`] = cbPick(usable.length ? usable : list);
        });
    });
    const start = cbClassGear(c);
    c.gear = start.gear;
    c.coins = start.coins;
    c.gearSet = true;
    cbAutoWear(c);

    // Spells
    const r = cbSpellRules(c);
    if (r) {
        const cls = k.name;
        c.spells.cantrips = cbShuffle(cbSpellsFor(cls, 0)).slice(0, r.cantrips).map(s => s.name);
        if (c.cls === 'warlock' && !c.spells.cantrips.includes('Eldritch Blast')) c.spells.cantrips[0] = 'Eldritch Blast';
        // Learn spells level by level, as a player would: each new pick is of the best
        // spell level the character could cast then, or one below.
        const always = cbAlwaysSpells(c).map(n => n.toLowerCase());
        const top = c.level, list = [];
        for (let lv = 1; lv <= top; lv++) {
            c.level = lv;
            const now = cbSpellRules(c);
            while (list.length < now.list) {
                const want = Math.max(1, now.maxLevel - (cbRand() < 0.35 ? 1 : 0));
                let pool = [];
                for (let sl = want; sl >= 1 && !pool.length; sl--) pool = cbClassSpells(c, sl).filter(s => !list.includes(s.name) && !always.includes(s.name.toLowerCase()));
                if (!pool.length) break;
                list.push(cbPick(pool).name);
            }
        }
        c.level = top;
        c.spells.list = list.slice(0, r.list);
        if (r.type === 'book') c.spells.prepared = cbShuffle(c.spells.list).slice(0, r.prepared);
        r.arcanum.forEach(lv => { const p = cbClassSpells(c, lv); if (p.length) c.spells.arcanum[lv] = cbPick(p).name; });
        // Invocations that needed eldritch blast can now be picked.
        cbClassChoices(c).forEach(choice => {
            const have = cbChoiceValue(c, choice.key).filter(v => choice.options[v]);
            if (have.length < choice.n) cbSetChoice(c, choice.key, [...have, ...cbShuffle(Object.keys(choice.options).filter(v => !have.includes(v))).slice(0, choice.n - have.length)]);
        });
    }

    // Name and the rest
    const gender = cbPick(['male', 'female', 'nonbinary']);
    c.gender = gender === 'nonbinary' ? 'Nonbinary' : gender === 'male' ? 'Male' : 'Female';
    try {
        if (typeof buildName === 'function') c.name = buildName(CB_NPC_RACE[race.id], gender).name.replace(/\s+/g, ' ').slice(0, 60);
    } catch (e) {}
    if (!c.name) c.name = `${race.name} ${k.name}`;
    c.alignment = cbPick(CB_ALIGNMENTS);
    return c;
}

function cbSpellsFor(className, level) {
    return typeof SPELLS_DATA === 'undefined' ? [] : SPELLS_DATA.filter(s => s.level === level && s.classes.includes(className));
}
