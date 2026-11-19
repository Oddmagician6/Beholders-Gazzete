/* ============================================
   CHARACTER ENGINE (F58): page-free rules for the Character Builder.
   A character is plain data (see cbBlank); everything on the sheet comes from
   cbDerive(c), and cbTodo(c) lists what the player still has to pick.
   Saved characters live in localStorage CB_KEY (a list, newest edit first).
   Needs character-data.js and spells-data.js; quick build uses rand() (rng.js),
   rollDice() (dice-engine.js), and buildName() (npc-data.js) when the page has them.
   2024 rules (ROADMAP L1T T5): each character carries rules '2014' | '2024', stamped when it's
   made and fixed once it has a species or class. A 2024 character reads character-data-2024.js
   (CB24_*): species without ability increases, backgrounds that raise three scores and give an
   Origin feat, feats at every Ability Score Improvement (and an Epic Boon at 19), weapon mastery,
   prepared spells for every caster. cbRace/cbClass/cbSubrace take the character (or '2024') to
   know which list to read; the other tools that call them with an id alone get the 2014 lists.
   Pages show a character's spells from whatever SPELLS_DATA holds, so a page that opens one calls
   rulesUse(c.rules) (srd52.js) first; cbClean checks spell names only when the page's data is
   the character's own version, so a 2024 character saved on a 2014 page keeps its spells.
   ============================================ */

const CB_KEY = 'gazette-characters';
const CB_MAX = 30;
const CB_MAX_GEAR = 150;     // gear rows per character (an unpacked pack adds a dozen)
const CB_ATTUNE_MAX = 3;

const CB24_OK = () => typeof CB24_CLASSES !== 'undefined';
// Is this character (or rules string) on the 2024 rules?
const cbIs24 = c => CB24_OK() && (c === '2024' || (!!c && typeof c === 'object' && c.rules === '2024'));
const cbRaceList = c => (cbIs24(c) ? CB24_SPECIES : CB_RACES);
const cbClassList = c => (cbIs24(c) ? CB24_CLASSES : CB_CLASSES);
const cbBgList = c => (cbIs24(c) ? CB24_BACKGROUNDS : CB_BACKGROUNDS);
const cbFeatList = c => (cbIs24(c) ? CB24_FEATS : CB_FEATS);
const cbRace = (id, c) => cbRaceList(c).find(r => r.id === id) || null;
const cbClass = (id, c) => cbClassList(c).find(k => k.id === id) || null;
const cbBg = c => cbBgList(c)[c.bg] || null;
const cbFeat = (id, c) => cbFeatList(c)[id] || null;
const cbSubrace = c => { const r = cbRace(c.race, c); return r && r.subraces ? r.subraces.find(s => s.id === c.subrace) || r.subraces[0] : null; };
const cbProf = L => 2 + Math.floor((L - 1) / 4);
const cbMod = score => Math.floor((score - 10) / 2);
const cbOrd = n => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th');
const cbRand = () => (typeof rand === 'function' ? rand() : Math.random());
const cbPick = list => list[Math.floor(cbRand() * list.length)];
const cbShuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(cbRand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// The rules a new character takes: the site's saved setting (srd52.js), else 2014.
function cbDefaultRules() {
    return CB24_OK() && typeof rulesStored === 'function' && rulesStored() === '2024' ? '2024' : '2014';
}

// "Wood Elf", "Goliath (Hill's Tumble)", "Tiefling (Infernal)".
function cbRaceLabel(c) {
    const race = cbRace(c.race, c), sub = cbSubrace(c);
    if (!race) return '';
    if (!sub) return race.name;
    if (!cbIs24(c) || sub.name.includes(race.name)) return sub.name;
    return `${race.name} (${sub.name})`;
}

function cbNewId() {
    return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

const cbFeatOptBlank = () => ({ list: '', abil: '', cantrips: [], spell: '', picks: [] });

function cbBlank(rules) {
    return {
        id: cbNewId(), v: 1, rules: rules === '2024' && CB24_OK() ? '2024' : '2014',
        name: '', player: '', gender: '', alignment: '', age: '', notes: '',
        race: '', subrace: '', raceOpt: { langs: [], skills: [], abil: [], tool: '', cantrip: '', ancestry: '', castAbil: '', size: '', feat: '', featOpt: cbFeatOptBlank() },
        cls: '', level: 1,
        method: 'array', base: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, assigned: false,
        bg: '', bgOpt: { name: '', skills: [], extras: [], langs: [], boost: [], tool: '', feat: '', featOpt: cbFeatOptBlank() },
        skills: [], tools: [], expertise: [],
        opts: { styles: [], enemies: [], terrains: [], land: '', dragon: '', metamagic: [], invocations: [], pact: '', hunter: {}, loreSkills: [],
            mastery: [], order: '', strikes: '', affinity: '' },
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
    return { hp: null, temp: 0, ds: [0, 0], hd: 0, slots: [0, 0, 0, 0, 0, 0, 0, 0, 0], pact: 0, res: {}, cond: [], exh: 0, insp: false, conc: '', enc: false };
}

// ── Cleaning (load, import, backup) ──────────────────────
const cbStr = (v, max = 60) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '');
const cbIds = (v, ok, max = 40) => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && ok(x)))].slice(0, max) : []);

// The rules version the page's spell, monster, and item lists hold now (srd52.js swaps them).
function cbPageRules() {
    return typeof rulesShown !== 'undefined' && rulesShown === '2024' ? '2024' : '2014';
}

// A spell name this character may keep. Checked against SPELLS_DATA only when the page holds the
// character's own rules version; otherwise any plausible name is kept (it's checked when the
// character is opened on a page in its own version).
// In 2014 an SRD 5.2 addition stays while the additions are switched off (it comes back with them).
function cbSpellOkFor(c) {
    const own = (c && c.rules === '2024' ? '2024' : '2014') === cbPageRules();
    const added = n => cbPageRules() === '2014' && typeof SRD52_SPELLS !== 'undefined' && SRD52_SPELLS.some(s => s.name === n);
    return n => typeof n === 'string' && (own ? !!cbSpell(n) || added(n) : /^[^\u0000-\u001f<>]{2,60}$/.test(n));
}
const cbSpellOk = n => typeof n === 'string' && !!cbSpell(n);

const CB_ABIL_OK = a => CB_ABILITIES.includes(a);

function cbCleanFeatOpt(raw, spellOk) {
    const o = cbFeatOptBlank();
    if (!raw || typeof raw !== 'object') return o;
    o.list = CB24_OK() && CB24_MAGIC_LISTS[raw.list] ? raw.list : '';
    o.abil = ['int', 'wis', 'cha'].includes(raw.abil) ? raw.abil : '';
    o.cantrips = cbIds(raw.cantrips, spellOk, 2);
    o.spell = spellOk(raw.spell) ? raw.spell : '';
    o.picks = cbIds(raw.picks, x => !!CB_SKILLS[x] || CB_TOOLS.includes(x), 3);
    return o;
}

function cbClean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    // A 2024 character on a page without the 2024 data: keep it exactly as saved.
    if (raw.rules === '2024' && !CB24_OK()) {
        if (typeof raw.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(raw.id)) return null;
        try { return JSON.parse(JSON.stringify(raw)); } catch (e) { return null; }
    }
    const c = cbBlank(raw.rules);
    const v24 = cbIs24(c);
    const spellOk = cbSpellOkFor(c);
    if (typeof raw.id === 'string' && /^[a-z0-9]{1,16}$/.test(raw.id)) c.id = raw.id;
    ['name', 'player', 'gender', 'alignment', 'age'].forEach(k => { c[k] = cbStr(raw[k], k === 'age' ? 20 : 60); });
    c.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 4000) : '';
    c.race = cbRace(raw.race, c) ? raw.race : '';
    const race = cbRace(c.race, c);
    c.subrace = race && race.subraces && race.subraces.some(s => s.id === raw.subrace) ? raw.subrace : race && race.subraces ? race.subraces[0].id : '';
    const ro = raw.raceOpt || {};
    const langOk = l => CB_LANGUAGES.includes(l) || (v24 && CB24_LANGUAGES.includes(l));
    c.raceOpt = {
        langs: cbIds(ro.langs, langOk, 4), skills: cbIds(ro.skills, s => !!CB_SKILLS[s], 4),
        abil: cbIds(ro.abil, CB_ABIL_OK, 2), tool: CB_TOOLS.includes(ro.tool) ? ro.tool : '',
        cantrip: spellOk(ro.cantrip) ? ro.cantrip : '', ancestry: CB_DRAGONS[ro.ancestry] ? ro.ancestry : '',
        castAbil: ['int', 'wis', 'cha'].includes(ro.castAbil) ? ro.castAbil : '',
        size: ['Small', 'Medium'].includes(ro.size) ? ro.size : '',
        feat: v24 && CB24_FEATS[ro.feat] && CB24_FEATS[ro.feat].cat === 'origin' ? ro.feat : '',
        featOpt: cbCleanFeatOpt(ro.featOpt, spellOk)
    };
    c.cls = cbClass(raw.cls, c) ? raw.cls : '';
    c.level = Math.min(20, Math.max(1, Math.round(Number(raw.level)) || 1));
    c.method = ['array', 'point', 'roll', 'manual'].includes(raw.method) ? raw.method : 'array';
    CB_ABILITIES.forEach(a => { const n = Math.round(Number(raw.base && raw.base[a])); c.base[a] = Number.isFinite(n) ? Math.min(20, Math.max(3, n)) : 8; });
    c.assigned = !!raw.assigned;
    if (Array.isArray(raw.pool)) c.pool = raw.pool.map(Number).filter(n => n >= 3 && n <= 18).slice(0, 6);
    c.bg = cbBgList(c)[raw.bg] ? raw.bg : '';
    const bo = raw.bgOpt || {};
    c.bgOpt = { name: cbStr(bo.name, 40), skills: cbIds(bo.skills, s => !!CB_SKILLS[s], 2),
        extras: cbIds(bo.extras, x => CB_TOOLS.includes(x) || CB_LANGUAGES.includes(x), 2), langs: cbIds(bo.langs, langOk, v24 ? 5 : 2),
        boost: cbIds(bo.boost, CB_ABIL_OK, 3), tool: CB_TOOLS.includes(bo.tool) ? bo.tool : '',
        feat: v24 && CB24_FEATS[bo.feat] && CB24_FEATS[bo.feat].cat === 'origin' ? bo.feat : '',
        featOpt: cbCleanFeatOpt(bo.featOpt, spellOk) };
    c.skills = cbIds(raw.skills, s => !!CB_SKILLS[s], 18);
    c.tools = cbIds(raw.tools, t => CB_TOOLS.includes(t), 3);
    c.expertise = cbIds(raw.expertise, s => !!CB_SKILLS[s] || s === "Thieves' tools", 4);
    const o = raw.opts || {};
    if (v24) {
        const styleOk = s => (CB24_FEATS[s] && CB24_FEATS[s].cat === 'style') || s === 'blessed-warrior' || s === 'druidic-warrior';
        c.opts = {
            styles: cbIds(o.styles, styleOk, 2), enemies: [], terrains: [], land: CB24_LANDS[o.land] ? o.land : '', dragon: '',
            metamagic: cbIds(o.metamagic, m => !!CB24_METAMAGIC[m], 6), invocations: cbIds(o.invocations, i => !!CB24_INVOCATIONS[i], 10), pact: '',
            hunter: {}, loreSkills: cbIds(o.loreSkills, s => !!CB_SKILLS[s], 3), mastery: cbIds(o.mastery, w => !!CB_WEAPONS[w], 6),
            order: ['protector', 'thaumaturge', 'magician', 'warden'].includes(o.order) ? o.order : '',
            strikes: ['divine-strike', 'potent', 'primal-strike'].includes(o.strikes) ? o.strikes : '',
            affinity: CB24_AFFINITY.includes(o.affinity) ? o.affinity : ''
        };
        Object.keys(CB24_HUNTER).forEach(lv => { const v = o.hunter && o.hunter[lv]; if (CB24_HUNTER[lv].opts[v]) c.opts.hunter[lv] = v; });
    } else {
        c.opts = {
            styles: cbIds(o.styles, s => !!CB_FIGHTING_STYLES[s], 2), enemies: cbIds(o.enemies, e => CB_ENEMIES.includes(e), 3),
            terrains: cbIds(o.terrains, t => CB_TERRAINS.includes(t), 3), land: CB_TERRAINS.includes(o.land) ? o.land : '',
            dragon: CB_DRAGONS[o.dragon] ? o.dragon : '', metamagic: cbIds(o.metamagic, m => !!CB_METAMAGIC[m], 4),
            invocations: cbIds(o.invocations, i => !!CB_INVOCATIONS[i], 8), pact: CB_PACTS[o.pact] ? o.pact : '',
            hunter: {}, loreSkills: cbIds(o.loreSkills, s => !!CB_SKILLS[s], 3), mastery: [], order: '', strikes: '', affinity: ''
        };
        Object.keys(CB_HUNTER).forEach(lv => { const v = o.hunter && o.hunter[lv]; if (CB_HUNTER[lv].opts[v]) c.opts.hunter[lv] = v; });
    }
    if (raw.asi && typeof raw.asi === 'object') {
        Object.keys(raw.asi).forEach(lv => {
            const a = raw.asi[lv];
            if (!/^\d{1,2}$/.test(lv) || !a || typeof a !== 'object') return;
            if (v24) {
                if (!CB24_FEATS[a.feat]) return;
                const p = { feat: a.feat };
                if (CB_ABIL_OK(a.a)) p.a = a.a;
                if (a.feat === 'asi' && CB_ABIL_OK(a.b)) p.b = a.b;
                if (CB24_FEATS[a.feat].opt) p.opt = cbCleanFeatOpt(a.opt, spellOk);
                c.asi[lv] = p;
            } else if (CB_FEATS[a.feat]) c.asi[lv] = { feat: a.feat };
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
    // lb: the player's own weight for one (F60); mi: an SRD magic item; att: attuned to it.
    const itemsOwn = (c.rules === '2024' ? '2024' : '2014') === cbPageRules();
    c.gear = Array.isArray(raw.gear) ? raw.gear.slice(0, CB_MAX_GEAR).map(g => {
        if (!g || typeof g !== 'object') return null;
        const item = { name: cbStr(g.name, 80), qty: Math.min(9999, Math.max(1, Math.round(Number(g.qty)) || 1)) };
        if (CB_WEAPONS[g.w]) item.w = g.w;
        if (CB_ARMOR[g.a]) item.a = g.a;
        const lb = Math.round(Number(g.lb) * 100) / 100;
        if (g.lb !== undefined && g.lb !== null && g.lb !== '' && Number.isFinite(lb)) item.lb = Math.min(9999, Math.max(0, lb));
        if (g.mi && (typeof MAGIC_ITEM_TEXT === 'undefined' || !itemsOwn || MAGIC_ITEM_TEXT[item.name])) item.mi = true;
        if (item.mi && g.att) item.att = true;
        return item.name ? item : null;
    }).filter(Boolean) : [];
    let attuned = 0;
    const attuneMax = cbAttuneMax(c);
    c.gear.forEach(g => { if (g.att && ++attuned > attuneMax) delete g.att; });
    c.coins = Math.min(1e7, Math.max(0, Math.round(Number(raw.coins) * 100) / 100 || 0));
    c.gearSet = !!raw.gearSet;
    const w = raw.wear || {};
    c.wear = { armor: CB_ARMOR[w.armor] ? w.armor : '', shield: !!w.shield };
    const sp = raw.spells || {};
    c.spells = { cantrips: cbIds(sp.cantrips, spellOk, 12), list: cbIds(sp.list, spellOk, 80), prepared: cbIds(sp.prepared, spellOk, 40), arcanum: {}, fav: cbIds(sp.fav, spellOk, 80) };
    [6, 7, 8, 9].forEach(lv => { const n = sp.arcanum && sp.arcanum[lv]; if (spellOk(n)) c.spells.arcanum[lv] = n; });
    c.play = cbPlayClean(raw.play, c);
    c.updated = Number(raw.updated) || Date.now();
    return c;
}

// A 2024 Thief (level 13, Use Magic Device) attunes to four items.
function cbAttuneMax(c) {
    return cbIs24(c) && c.cls === 'rogue' && c.level >= 13 ? 4 : CB_ATTUNE_MAX;
}

// The shape only; cbPlayFit (character-play.js) trims it to what the level allows.
function cbPlayClean(raw, c) {
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
    p.conc = (c ? cbSpellOkFor(c) : cbSpellOk)(raw.conc) ? raw.conc : '';
    p.enc = !!raw.enc;
    return p;
}

// ── Storage ──────────────────────────────────────────────
function cbLoadAll() {
    try {
        const saved = JSON.parse(localStorage.getItem(CB_KEY));
        if (Array.isArray(saved)) return saved.map(x => { try { return cbClean(x); } catch (e) { return null; } }).filter(Boolean).slice(0, CB_MAX);
    } catch (e) {}
    return [];
}

// The other characters go back as they were saved, not as this page cleaned them: a clean depends
// on the page (its rules version, the additions switch, the homebrew here), and must not cost a
// character something it would keep elsewhere.
function cbRawAll() {
    try {
        const saved = JSON.parse(localStorage.getItem(CB_KEY));
        if (Array.isArray(saved)) return saved.filter(x => x && typeof x === 'object' && typeof x.id === 'string');
    } catch (e) {}
    return [];
}

// Saves one character (put it first) and returns the list.
function cbSave(c) {
    c.updated = Date.now();
    const raw = [c, ...cbRawAll().filter(x => x.id !== c.id)].slice(0, CB_MAX);
    try { localStorage.setItem(CB_KEY, JSON.stringify(raw)); } catch (e) { return null; }
    return [c, ...cbLoadAll().filter(x => x.id !== c.id)];
}

function cbDelete(id) {
    try { localStorage.setItem(CB_KEY, JSON.stringify(cbRawAll().filter(x => x.id !== id))); } catch (e) {}
    return cbLoadAll();
}

// ── Spells ───────────────────────────────────────────────
// Rebuilt whenever SPELLS_DATA changes (srd52.js swaps its rows when the rules version changes).
let CB_SPELL_INDEX = {};
function cbSpell(name) {
    if (typeof SPELLS_DATA === 'undefined' || typeof name !== 'string') return null;
    if (CB_SPELL_INDEX._len !== SPELLS_DATA.length || CB_SPELL_INDEX._first !== SPELLS_DATA[0] || CB_SPELL_INDEX._last !== SPELLS_DATA[SPELLS_DATA.length - 1]) {
        CB_SPELL_INDEX = {};
        SPELLS_DATA.forEach(s => { CB_SPELL_INDEX[s.name.toLowerCase()] = s; });
        CB_SPELL_INDEX._len = SPELLS_DATA.length;
        CB_SPELL_INDEX._first = SPELLS_DATA[0];
        CB_SPELL_INDEX._last = SPELLS_DATA[SPELLS_DATA.length - 1];
    }
    return CB_SPELL_INDEX[name.toLowerCase()] || null;
}

// Slots by spell level: [n1, n2, ...]; a warlock's are { count, level } as pact.
// 2024 half casters (paladin, ranger) have slots from 1st level.
function cbSlots(k, L, v24) {
    if (!k || !k.cast) return [];
    if (k.cast.prog === 'full') return CB_FULL_SLOTS[L - 1];
    if (k.cast.prog === 'half') return L >= 2 || v24 ? CB_FULL_SLOTS[Math.ceil(L / 2) - 1] : [];
    return [];
}

const cbHasInv = (c, id) => c.opts.invocations.includes(id);

// How many of each kind of spell this character picks, and from what.
// offList / offCantrips: how many may come from other lists (offFrom / cantripFrom: which, null = any).
function cbSpellRules(c) {
    const k = cbClass(c.cls, c);
    if (!k || !k.cast) return null;
    const v24 = cbIs24(c);
    const L = c.level, cast = k.cast, s = cbScores(c), mod = cbMod(s[cast.ability]);
    const pact = cast.prog === 'pact' ? CB_PACT_SLOTS[L - 1] : null;
    const slots = cbSlots(k, L, v24);
    const maxLevel = pact ? pact[1] : slots.length;
    const r = { cls: k, ability: cast.ability, type: cast.type, maxLevel, pact, slots,
        cantrips: cast.cantrips ? cast.cantrips[L - 1] : 0, list: 0, prepared: 0, offList: 0, offCantrips: 0, offFrom: null, cantripFrom: null, arcanum: [] };
    if (v24) {
        if ((c.cls === 'cleric' && c.opts.order === 'thaumaturge') || (c.cls === 'druid' && c.opts.order === 'magician')) r.cantrips += 1;
        const warrior = c.opts.styles.find(x => x === 'blessed-warrior' || x === 'druidic-warrior');
        if (warrior && ((c.cls === 'paladin' && warrior === 'blessed-warrior') || (c.cls === 'ranger' && warrior === 'druidic-warrior')) && L >= 2) {
            r.cantrips += 2; r.offCantrips += 2; r.cantripFrom = [warrior === 'blessed-warrior' ? 'Cleric' : 'Druid'];
        }
        if (c.cls === 'warlock' && cbHasInv(c, 'pact-of-the-tome')) { r.cantrips += 3; r.offCantrips += 3; r.cantripFrom = null; }
        if (cast.type === 'book') { r.list = 6 + 2 * (L - 1); r.prepared = cast.prepared[L - 1]; }
        else r.list = cast.prepared[L - 1];
        if (c.cls === 'bard' && L >= 6) {
            r.list += 2; r.offList = 2; r.offFrom = ['Cleric', 'Druid', 'Wizard'];
            if (L >= 10) r.offList = r.list;
        }
    } else {
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
    }
    if (c.cls === 'warlock') r.arcanum = [[11, 6], [13, 7], [15, 8], [17, 9]].filter(([lv]) => L >= lv).map(([, sl]) => sl);
    return r;
}

// Spells this class can learn or prepare, by spell level (0 = cantrips).
function cbClassSpells(c, level) {
    const k = cbClass(c.cls, c);
    if (!k || typeof SPELLS_DATA === 'undefined') return [];
    const extra = !cbIs24(c) && c.cls === 'warlock' && k.sub.expanded ? Object.values(k.sub.expanded).flat().map(n => n.toLowerCase()) : [];
    return SPELLS_DATA.filter(s => s.level === level && (s.classes.includes(k.name) || extra.includes(s.name.toLowerCase())));
}

// Spells that are always prepared (domain, oath, circle, and 2024 class features), each by the level it comes at.
function cbAlwaysSpells(c) {
    const k = cbClass(c.cls, c);
    if (!k) return [];
    const out = [];
    const fromTable = table => Object.keys(table).map(Number).filter(lv => c.level >= lv).forEach(lv => out.push(...table[lv]));
    if (cbIs24(c)) {
        if (k.sub.spells && c.level >= k.sub.at) fromTable(k.sub.spells);
        if (c.cls === 'druid' && c.opts.land && c.level >= 3) fromTable(CB24_LANDS[c.opts.land].spells);
        (CB24_FEATURE_SPELLS[c.cls] || []).forEach(([lv, n]) => { if (c.level >= lv) out.push(n); });
        return [...new Set(out)];
    }
    let table = null;
    if (k.sub.spells) table = k.sub.spells;
    if (c.cls === 'druid' && c.opts.land) table = CB_LAND_SPELLS[c.opts.land];
    if (!table) return [];
    fromTable(table);
    return out;
}

// Spells from the race (and, in 2024, from feats): [{ name, note }].
function cbRaceSpells(c) {
    const out = [];
    if (cbIs24(c)) {
        const race = cbRace(c.race, c), sub = cbSubrace(c);
        const ab = c.raceOpt.castAbil ? c.raceOpt.castAbil.toUpperCase() : 'INT, WIS, or CHA';
        ((sub && sub.spells) || []).forEach(([lv, n]) => {
            if (c.level < lv) return;
            const sp = cbSpell(n);
            out.push({ name: n, note: `${race.name}${sp && sp.level ? ', once per long rest without a slot' : ''} (${ab})` });
        });
        cbFeatSlots(c).forEach(slot => {
            if (slot.feat !== 'magic-initiate') return;
            const o = slot.opt, list = o.list ? CB24_MAGIC_LISTS[o.list] : '';
            const note = `Magic Initiate${list ? ' (' + list + ')' : ''}${o.abil ? ', ' + o.abil.toUpperCase() : ''}`;
            o.cantrips.forEach(n => out.push({ name: n, note }));
            if (o.spell) out.push({ name: o.spell, note: note + ', once per long rest without a slot' });
        });
        return out;
    }
    if (c.race === 'elf' && c.subrace === 'high-elf' && c.raceOpt.cantrip) out.push({ name: c.raceOpt.cantrip, note: 'High Elf cantrip (INT)' });
    if (c.race === 'tiefling') {
        out.push({ name: 'Thaumaturgy', note: 'Infernal Legacy (CHA)' });
        if (c.level >= 3) out.push({ name: 'Hellish Rebuke', note: '2nd level, once per long rest (CHA)' });
        if (c.level >= 5) out.push({ name: 'Darkness', note: 'Once per long rest (CHA)' });
    }
    return out;
}

// ── Feats (2024) ─────────────────────────────────────────
// Every place a 2024 character takes a feat: the background's Origin feat, the human's Versatile
// feat, and each Ability Score Improvement level (19 is the Epic Boon level).
// [{ key, label, step, feat, opt, plus, lv, fixed, list (Magic Initiate's fixed list), cats }]
function cbFeatSlots(c) {
    if (!cbIs24(c)) return [];
    const out = [];
    const bg = cbBg(c), race = cbRace(c.race, c);
    if (bg) out.push({ key: 'bg', label: `${bg.name} feat`, step: 'background', feat: bg.feat || c.bgOpt.feat, fixed: !!bg.feat, opt: c.bgOpt.featOpt, list: bg.featList || '', cats: ['origin'] });
    if (race && race.choose && race.choose.feat) out.push({ key: 'race', label: 'Versatile (Origin feat)', step: 'race', feat: c.raceOpt.feat, opt: c.raceOpt.featOpt, list: '', cats: ['origin'] });
    cbAsiLevels(c).forEach(lv => {
        const p = c.asi[lv] || {};
        out.push({ key: 'asi.' + lv, label: lv === 19 ? `Level ${lv}: Epic Boon` : `Level ${lv}: Ability Score Improvement`, step: 'abilities', lv,
            feat: p.feat || '', opt: p.opt || cbFeatOptBlank(), plus: p.a || '', plusB: p.b || '', list: '', cats: ['origin', 'general', 'style', 'boon'] });
    });
    return out;
}

// Can this character take feat id in this slot? Returns '' or why not.
function cbFeatWhyNot(c, id, slot) {
    const f = CB24_FEATS[id];
    if (!f) return 'Unknown feat.';
    if (!slot.cats.includes(f.cat)) return `${f.name} isn't an ${slot.cats.map(x => CB24_FEAT_CATS[x]).join(' or ')} feat.`;
    const lv = slot.lv || c.level;
    if (f.L && lv < f.L) return `${f.name} needs level ${f.L}.`;
    if (f.cat === 'style' && !cbHasStyleFeature(c, lv)) return `${f.name} needs the Fighting Style feature.`;
    if (f.caster && !(cbClass(c.cls, c) || {}).cast) return `${f.name} needs spellcasting.`;
    if (!f.repeat) {
        const taken = cbFeatSlots(c).some(s => s.key !== slot.key && s.feat === id) || (f.cat === 'style' && c.opts.styles.includes(id));
        if (taken) return `You already have ${f.name}.`;
    }
    return '';
}

function cbHasStyleFeature(c, lv = c.level) {
    return (c.cls === 'fighter' && lv >= 1) || ((c.cls === 'paladin' || c.cls === 'ranger') && lv >= 2);
}

// What's still missing for one feat slot: [text].
function cbFeatTodo(c, slot) {
    const out = [];
    if (!slot.feat) { out.push(`${slot.label}: choose a feat.`); return out; }
    const f = CB24_FEATS[slot.feat];
    const why = cbFeatWhyNot(c, slot.feat, slot);
    if (why) out.push(why);
    if (slot.feat === 'asi') {
        if (!slot.plus || !slot.plusB) out.push(`${slot.label}: pick the scores to raise.`);
    } else if (f.plus && !slot.plus) out.push(`${f.name}: pick the score it raises.`);
    else if (f.plus && f.plus !== 'any' && !f.plus.includes(slot.plus)) out.push(`${f.name} can't raise ${slot.plus.toUpperCase()}.`);
    if (f.req && f.req.any) {
        const s = cbScores(c);
        const ok = Object.entries(f.req.any).some(([a, n]) => s[a] >= n);
        if (!ok) out.push(`${f.name} needs ${Object.entries(f.req.any).map(([a, n]) => `${a.toUpperCase()} ${n}`).join(' or ')}.`);
    }
    if (f.opt === 'spells') {
        const o = slot.opt;
        if (!slot.list && !o.list) out.push('Magic Initiate: pick the cleric, druid, or wizard list.');
        else if (o.list && slot.list && o.list !== slot.list) out.push('Magic Initiate: this background\'s list is fixed.');
        if (!o.abil) out.push('Magic Initiate: pick its casting ability.');
        if (o.cantrips.length < 2) out.push(`Magic Initiate: pick ${2 - o.cantrips.length} more cantrip${o.cantrips.length === 1 ? '' : 's'}.`);
        if (!o.spell) out.push('Magic Initiate: pick a 1st-level spell.');
        const lists = cbFeatSlots(c).filter(s => s.feat === 'magic-initiate').map(s => s.list || s.opt.list).filter(Boolean);
        if (new Set(lists).size < lists.length) out.push('Magic Initiate twice needs a different list each time.');
    }
    if (f.opt === 'picks' && slot.opt.picks.length < 3) out.push(`Skilled: pick ${3 - slot.opt.picks.length} more skill${slot.opt.picks.length === 2 ? '' : 's'} or tool${slot.opt.picks.length === 2 ? '' : 's'}.`);
    return out;
}

// Magic Initiate's list for a slot ('' until picked).
const cbFeatSpellList = slot => slot.list || slot.opt.list;

// The feats a character has (each once), as [{ id, slot }].
function cbFeatsTaken(c) {
    return cbFeatSlots(c).filter(s => s.feat && CB24_FEATS[s.feat]).map(s => ({ id: s.feat, slot: s }));
}

// Set a slot's feat, clearing what the old one asked for.
function cbSetFeat(c, key, id) {
    if (key.startsWith('asi.')) {
        const lv = key.slice(4);
        if (!id) { delete c.asi[lv]; return; }
        const k = cbClass(c.cls, c);
        const old = c.asi[lv] || {};
        const p = { feat: id };
        const f = CB24_FEATS[id];
        if (id === 'asi') { p.a = old.a || (k ? k.primary[0] : 'str'); p.b = old.feat === 'asi' && old.b ? old.b : p.a; }
        else if (f.plus) { const ok = f.plus === 'any' ? CB_ABILITIES : f.plus; p.a = ok.includes(old.a) ? old.a : (k && ok.includes(k.primary[0]) ? k.primary[0] : ok[0]); }
        if (f.opt) p.opt = cbFeatOptBlank();
        c.asi[lv] = p;
        return;
    }
    const o = key === 'bg' ? c.bgOpt : c.raceOpt;
    o.feat = id;
    o.featOpt = cbFeatOptBlank();
}

// ── Ability scores ───────────────────────────────────────
// Race bonuses (2014), or the background's (2024): { str: n, ... }.
function cbRacialBonus(c) {
    const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    if (cbIs24(c)) {
        const bg = cbBg(c);
        if (!bg) return out;
        const allowed = bg.abil || CB_ABILITIES;
        const b = c.bgOpt.boost.filter(a => allowed.includes(a));
        if (b.length === 3) b.forEach(a => { out[a] += 1; });
        else if (b.length === 2) { out[b[0]] += 2; out[b[1]] += 1; }
        else if (b.length === 1) out[b[0]] += 2;
        return out;
    }
    const race = cbRace(c.race, c), sub = cbSubrace(c);
    [race && race.abil, sub && sub.abil].forEach(b => { if (b) Object.keys(b).forEach(a => { out[a] += b[a]; }); });
    if (race && race.choose && race.choose.abil) c.raceOpt.abil.forEach(a => { if (a !== race.choose.abilNot) out[a] += 1; });
    return out;
}

// The levels this class gets an Ability Score Improvement (or a feat), up to its level.
// 2024: every class also takes an Epic Boon (or another feat) at 19.
function cbAsiLevels(c) {
    const k = cbClass(c.cls, c);
    if (cbIs24(c)) return [...((k && k.asi) || [4, 8, 12, 16]), 19].filter(lv => lv <= c.level);
    return ((k && k.asi) || CB_ASI_LEVELS).filter(lv => lv <= c.level);
}

// Final scores: base + race (2014) or background (2024) + ASIs and feats (+ the 20th-level capstones).
// 2014 caps at 20 (24 for the champion's STR and CON); 2024 caps at 20, 30 for Epic Boons, 25 for capstones.
function cbScores(c) {
    const race = cbRacialBonus(c);
    const s = {};
    if (cbIs24(c)) {
        CB_ABILITIES.forEach(a => { s[a] = Math.min(20, c.base[a] + race[a]); });
        cbAsiLevels(c).forEach(lv => {
            const p = c.asi[lv];
            if (!p || !p.feat) return;
            const f = CB24_FEATS[p.feat];
            if (!f) return;
            if (p.feat === 'asi' && CB_ABIL_OK(p.a) && CB_ABIL_OK(p.b)) {
                s[p.a] = Math.min(20, s[p.a] + 1);
                s[p.b] = Math.min(20, s[p.b] + 1);
            } else if (f.plus && CB_ABIL_OK(p.a) && (f.plus === 'any' || f.plus.includes(p.a))) s[p.a] = Math.max(s[p.a], Math.min(f.max, s[p.a] + 1));
        });
        if (c.cls === 'barbarian' && c.level >= 20) { s.str = Math.max(s.str, Math.min(25, s.str + 4)); s.con = Math.max(s.con, Math.min(25, s.con + 4)); }
        if (c.cls === 'monk' && c.level >= 20) { s.dex = Math.max(s.dex, Math.min(25, s.dex + 4)); s.wis = Math.max(s.wis, Math.min(25, s.wis + 4)); }
        return s;
    }
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
    if (cbIs24(c)) return cbFeatsTaken(c).map(f => f.id);
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
    const race = cbRace(c.race, c);
    add(race && race.skills, race && race.name);
    add(c.raceOpt.skills, race && race.name);
    const bg = cbBg(c);
    if (cbIs24(c)) {
        add(bg && bg.skills ? bg.skills : c.bgOpt.skills, c.bg === 'custom' ? (c.bgOpt.name || 'Background') : bg && bg.name);
        add(c.skills, cbClass(c.cls, c) ? cbClass(c.cls, c).name : 'Class');
        if (c.cls === 'barbarian' && c.level >= 3) add(c.opts.loreSkills, 'Primal Knowledge');
        if (c.cls === 'bard' && c.level >= 3) add(c.opts.loreSkills, 'College of Lore');
        cbFeatSlots(c).forEach(s => { if (s.feat === 'skilled') add(s.opt.picks, 'Skilled'); });
        return src;
    }
    add(c.bg === 'acolyte' ? bg.skills : c.bgOpt.skills, c.bg === 'custom' ? (c.bgOpt.name || 'Background') : bg && bg.name);
    add(c.skills, cbClass(c.cls, c) ? cbClass(c.cls, c).name : 'Class');
    if (c.cls === 'bard' && c.level >= 3) add(c.opts.loreSkills, 'College of Lore');
    if (c.cls === 'warlock' && c.opts.invocations.includes('beguiling-influence')) add(['deception', 'persuasion'], 'Beguiling Influence');
    return src;
}

// Skills the class step may still offer: the class list minus what race and background give.
function cbClassSkillChoices(c) {
    const k = cbClass(c.cls, c);
    if (!k) return [];
    return k.skills.from === 'any' ? Object.keys(CB_SKILLS) : k.skills.from;
}

function cbExpertiseCount(c) {
    if (cbIs24(c)) {
        if (c.cls === 'rogue') return c.level >= 6 ? 4 : 2;
        if (c.cls === 'bard') return c.level >= 9 ? 4 : c.level >= 2 ? 2 : 0;
        if (c.cls === 'ranger') return c.level >= 9 ? 3 : c.level >= 2 ? 1 : 0;
        if (c.cls === 'wizard') return c.level >= 2 ? 1 : 0;
        return 0;
    }
    if (c.cls === 'rogue') return c.level >= 6 ? 4 : 2;
    if (c.cls === 'bard') return c.level >= 10 ? 4 : c.level >= 3 ? 2 : 0;
    return 0;
}

// The skills expertise may go to (the 2024 wizard's Scholar has its own short list).
const CB24_SCHOLAR = ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'];
function cbExpertiseChoices(c) {
    const prof = Object.keys(cbSkillSources(c));
    if (cbIs24(c)) return c.cls === 'wizard' ? prof.filter(s => CB24_SCHOLAR.includes(s)) : prof;
    return c.cls === 'rogue' ? [...prof, "Thieves' tools"] : prof;
}

function cbTools(c) {
    const k = cbClass(c.cls, c), race = cbRace(c.race, c), sub = cbSubrace(c);
    const out = [...((k && k.tools) || []), ...c.tools, ...((sub && sub.tools) || [])];
    if (cbIs24(c)) {
        const bg = cbBg(c);
        if (bg && bg.tool) out.push(bg.tool);
        else if (bg && c.bgOpt.tool) out.push(c.bgOpt.tool);
        cbFeatSlots(c).forEach(s => { if (s.feat === 'skilled') s.opt.picks.forEach(x => { if (CB_TOOLS.includes(x)) out.push(x); }); });
        return [...new Set(out)];
    }
    if (race && race.choose && race.choose.tool && c.raceOpt.tool) out.push(c.raceOpt.tool);
    if (c.bg === 'custom') c.bgOpt.extras.forEach(x => { if (CB_TOOLS.includes(x)) out.push(x); });
    return [...new Set(out)];
}

// The tools a 2024 background lets the player pick from ('' = none to pick).
function cbBgToolChoices(c) {
    const bg = cbBg(c);
    if (!cbIs24(c) || !bg || bg.tool) return [];
    if (bg.toolPick === 'gaming') return CB_GAMING_SETS;
    if (bg.toolPick === 'artisan') return CB_ARTISAN_TOOLS;
    return CB_TOOLS;
}

function cbLanguages(c) {
    if (cbIs24(c)) {
        const out = ['Common', ...c.bgOpt.langs];
        if (c.cls === 'rogue') out.push("Thieves' Cant");
        if (c.cls === 'druid') out.push('Druidic');
        return [...new Set(out)];
    }
    const race = cbRace(c.race, c);
    const out = [...((race && race.langs) || []), ...c.raceOpt.langs];
    if (c.bg === 'acolyte') out.push(...c.bgOpt.langs);
    if (c.bg === 'custom') c.bgOpt.extras.forEach(x => { if (CB_LANGUAGES.includes(x)) out.push(x); });
    if (c.cls === 'sorcerer') out.push('Draconic');
    return [...new Set(out)];
}

// How many extra languages the race and background ask for (2024: two at creation on the
// background step, one more for a rogue, two for a ranger from level 2).
function cbLanguageSlots(c) {
    if (cbIs24(c)) return { race: 0, bg: 2 + (c.cls === 'rogue' ? 1 : 0) + (c.cls === 'ranger' && c.level >= 2 ? 2 : 0) };
    const race = cbRace(c.race, c), sub = cbSubrace(c);
    const raceN = ((race && race.choose && race.choose.lang) || 0) + ((sub && sub.choose && sub.choose.lang) || 0);
    return { race: raceN, bg: c.bg === 'acolyte' ? 2 : 0 };
}

function cbArmorProfs(c) {
    const k = cbClass(c.cls, c);
    const out = [...((k && k.armor) || [])];
    if (cbIs24(c)) {
        if (c.cls === 'cleric' && c.opts.order === 'protector') out.push('heavy');
        if (c.cls === 'druid' && c.opts.order === 'warden') out.push('medium');
        return [...new Set(out)];
    }
    if (c.cls === 'cleric') out.push('heavy');
    return [...new Set(out)];
}

function cbWeaponList(c) {
    const k = cbClass(c.cls, c), race = cbRace(c.race, c), sub = cbSubrace(c);
    const list = [...((k && k.weapons) || []), ...((race && race.weapons) || []), ...((sub && sub.weapons) || [])];
    if (cbIs24(c) && ((c.cls === 'cleric' && c.opts.order === 'protector') || (c.cls === 'druid' && c.opts.order === 'warden'))) list.push('martial');
    return list;
}

function cbWeaponProf(c, id) {
    const w = cbWeapon(id, c);
    if (!w) return false;
    const list = cbWeaponList(c);
    if (list.includes(w.cat) || list.includes(id)) return true;
    if (w.cat === 'martial' && list.includes('martial-light') && w.props.includes('l')) return true;
    if (w.cat === 'martial' && list.includes('martial-finesse-light') && (w.props.includes('l') || w.props.includes('f'))) return true;
    return false;
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
// tool:class / tool:bg (2024 kits): the tool the class or background picked.
function cbTokensToGear(tokens, picksKey, picks, out, c) {
    tokens.forEach((t, i) => {
        const [kind, rest] = t.split(/:(.+)/);
        const [what, n] = rest.split('*');
        const qty = Number(n) || 1;
        if (kind === 'w') { const w = cbWeapon(what); cbAddGear(out, { name: w.name, qty, w: what }); }
        else if (kind === 'a') { const a = cbArmor(what); cbAddGear(out, { name: a.name, qty: 1, a: what }); }
        else if (kind === 'g' || kind === 'pack') cbAddGear(out, { name: what, qty });
        else if (kind === 'tool') {
            const tool = c && (what === 'class' ? c.tools[0] : c.bgOpt.tool);
            if (tool) cbAddGear(out, { name: tool, qty: 1 });
        } else if (kind === 'pick') {
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

// A 2024 class's kits: [{ label, gear, gold }].
function cbKits(k) {
    if (!k) return [];
    return k.kits || [{ label: 'Class gear', gear: k.kit, gold: k.kitGold }];
}

// The background's gear: 2024 takes its package (equip.choice[1] 0) or 50 gp (1).
function cbBackgroundGear(c) {
    const bg = cbBg(c);
    if (!bg) return { gear: [], gold: 0 };
    if (cbIs24(c)) {
        if (c.equip.choice[1] === 1 || !bg.kit.length) return { gear: [], gold: 50 };
        const out = [];
        cbTokensToGear(bg.kit, '1-0', c.equip.picks, out, c);
        return { gear: out, gold: bg.gold };
    }
    return { gear: bg.gear.map(name => ({ name, qty: 1 })), gold: bg.gold };
}

// The class's starting gear for the options picked, plus the background's.
function cbClassGear(c) {
    const k = cbClass(c.cls, c);
    const bg = cbBackgroundGear(c);
    const out = [];
    let coins = bg.gold;
    if (k && cbIs24(c)) {
        const kits = cbKits(k), ki = Math.min(kits.length - 1, c.equip.choice[0] || 0);
        cbTokensToGear(kits[ki].gear, `0-${ki}`, c.equip.picks, out, c);
        coins += kits[ki].gold;
    } else if (k) k.equip.forEach((group, gi) => {
        const oi = Math.min(group.length - 1, c.equip.choice[gi] || 0);
        cbTokensToGear(group[oi], `${gi}-${oi}`, c.equip.picks, out, c);
    });
    bg.gear.forEach(g => cbAddGear(out, g));
    return { gear: out, coins };
}

// The options' unfilled picks: ['0-1-0', ...] (2024 also 'tool:class' / 'tool:bg' while the tool isn't picked).
function cbMissingPicks(c) {
    const k = cbClass(c.cls, c);
    if (!k) return [];
    const out = [];
    const check = (tokens, key) => tokens.forEach((t, i) => {
        if (t.startsWith('pick:') && !c.equip.picks[`${key}-${i}`]) out.push(`${key}-${i}`);
        if (t === 'tool:class' && !c.tools[0]) out.push(t);
        if (t === 'tool:bg' && !c.bgOpt.tool) out.push(t);
    });
    if (cbIs24(c)) {
        const kits = cbKits(k), ki = Math.min(kits.length - 1, c.equip.choice[0] || 0);
        check(kits[ki].gear, `0-${ki}`);
        const bg = cbBg(c);
        if (bg && c.equip.choice[1] !== 1) check(bg.kit, '1-0');
        return out;
    }
    k.equip.forEach((group, gi) => {
        const oi = Math.min(group.length - 1, c.equip.choice[gi] || 0);
        check(group[oi], `${gi}-${oi}`);
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
    if (cbIs24(c)) return cbClassChoices24(c);
    const k = cbClass(c.cls, c), L = c.level, out = [];
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

// The weapons a 2024 class's Weapon Mastery can pick from (proficient ones; melee only for a barbarian).
function cbMasteryChoices(c) {
    const k = cbClass(c.cls, c);
    if (!k || !k.mastery) return [];
    return Object.keys(CB_WEAPONS).filter(id => cbWeaponProf(c, id) && (k.masteryKind !== 'melee' || CB_WEAPONS[id][2] === 'melee'));
}

function cbClassChoices24(c) {
    const k = cbClass(c.cls, c), L = c.level, out = [];
    if (!k) return out;
    const styleOpts = () => {
        const o = {};
        Object.entries(CB24_FEATS).forEach(([id, f]) => { if (f.cat === 'style') o[id] = [f.name, typeof f.text === 'function' ? '' : f.text]; });
        return Object.assign(o, CB24_STYLE_EXTRA[c.cls] || {});
    };
    if (k.mastery) {
        const n = k.mastery[L - 1];
        out.push({ key: 'mastery', label: 'Weapon Mastery', n, options: Object.fromEntries(cbMasteryChoices(c).map(id => [id, [CB_WEAPONS[id][0], CB24_MASTERY_TEXT[CB24_MASTERY[id]][0]]])), mastery: true });
    }
    if (c.cls === 'fighter') out.push({ key: 'styles', label: 'Fighting Style feat', n: L >= 7 ? 2 : 1, options: styleOpts() });
    if ((c.cls === 'paladin' || c.cls === 'ranger') && L >= 2) out.push({ key: 'styles', label: 'Fighting Style', n: 1, options: styleOpts() });
    if (CB24_ORDERS[c.cls]) out.push({ key: 'order', label: c.cls === 'cleric' ? 'Divine Order' : 'Primal Order', n: 1, single: true, options: CB24_ORDERS[c.cls] });
    if (CB24_STRIKES[c.cls] && L >= 7) out.push({ key: 'strikes', label: c.cls === 'cleric' ? 'Blessed Strikes' : 'Elemental Fury', n: 1, single: true, options: CB24_STRIKES[c.cls] });
    if (c.cls === 'druid' && L >= 3) out.push({ key: 'land', label: 'Circle land (change it after any long rest)', n: 1, single: true,
        options: Object.fromEntries(Object.entries(CB24_LANDS).map(([t, x]) => [t, [t, `${Object.values(x.spells).flat().join(', ')}; resist ${x.ward}.`]])) });
    if (c.cls === 'ranger') Object.keys(CB24_HUNTER).map(Number).filter(lv => L >= lv).forEach(lv => {
        out.push({ key: 'hunter.' + lv, label: CB24_HUNTER[lv].label, n: 1, single: true, options: CB24_HUNTER[lv].opts });
    });
    if (c.cls === 'sorcerer') {
        if (L >= 2) out.push({ key: 'metamagic', label: 'Metamagic', n: L >= 17 ? 6 : L >= 10 ? 4 : 2, options: CB24_METAMAGIC });
        if (L >= 6) out.push({ key: 'affinity', label: 'Elemental Affinity', n: 1, single: true, options: Object.fromEntries(CB24_AFFINITY.map(t => [t, [t[0].toUpperCase() + t.slice(1), '']])) });
    }
    if (c.cls === 'warlock') {
        const cantrips = c.spells.cantrips;
        const opts = {};
        Object.entries(CB24_INVOCATIONS).forEach(([id, v]) => {
            const req = v[2] || {};
            if (req.L && L < req.L) return;
            if (req.inv && !cbHasInv(c, req.inv)) return;
            if (req.cantrip === 'damage' && !CB24_WARLOCK_DAMAGE.some(n => cantrips.includes(n))) return;
            if (req.cantrip === 'attack' && !CB24_WARLOCK_ATTACK.some(n => cantrips.includes(n))) return;
            opts[id] = v;
        });
        out.push({ key: 'invocations', label: 'Eldritch Invocations', n: CB24_INVOCATIONS_KNOWN[L - 1], options: opts });
    }
    if (c.cls === 'barbarian' && L >= 3) out.push({ key: 'loreSkills', label: 'Primal Knowledge: one more skill', n: 1, options: Object.fromEntries(k.skills.from.map(id => [id, [CB_SKILLS[id][0], '']])), skills: true });
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
    const k = cbClass(c.cls, c);
    if (!k) return 0;
    const con = cbMod(cbScores(c).con);
    const avg = k.hd / 2 + 1;
    let hp = Math.max(1, k.hd + con);
    for (let lv = 2; lv <= c.level; lv++) {
        const roll = c.hpMode === 'roll' && c.hpRolls[lv - 2] ? Math.min(k.hd, c.hpRolls[lv - 2]) : avg;
        hp += Math.max(1, roll + con);
    }
    if (cbIs24(c)) {
        const race = cbRace(c.race, c);
        if (race && race.hpPerLevel) hp += race.hpPerLevel * c.level;
        if (c.cls === 'sorcerer' && c.level >= 3) hp += c.level;
        return hp;
    }
    const sub = cbSubrace(c);
    if (sub && sub.hpPerLevel) hp += sub.hpPerLevel * c.level;
    if (c.cls === 'sorcerer') hp += c.level;
    return hp;
}

// A weapon as the character's rules version has it (2024: a few changed, plus its mastery property).
// Overrides character-data.js's cbWeapon so callers can pass the character.
const cbWeapon51 = cbWeapon;
cbWeapon = function (id, c) {
    const w = cbWeapon51(id);
    if (!w || !cbIs24(c)) return w;
    const fix = CB24_WEAPON_FIX[id];
    if (fix) Object.assign(w, fix);
    w.mastery = CB24_MASTERY[id] || '';
    return w;
};

// ── The sheet ────────────────────────────────────────────
function cbDerive(c) {
    const v24 = cbIs24(c);
    const k = cbClass(c.cls, c), race = cbRace(c.race, c), sub = cbSubrace(c), L = c.level;
    const prof = cbProf(L);
    const s = cbScores(c);
    const m = {};
    CB_ABILITIES.forEach(a => { m[a] = cbMod(s[a]); });
    const dc = a => 8 + prof + m[a];
    const has = (cls, lv) => c.cls === cls && L >= lv;
    const featIds = v24 ? cbFeats(c) : [];
    const style = v24
        ? id => (cbHasStyleFeature(c) && c.opts.styles.includes(id)) || featIds.includes(id)
        : id => c.opts.styles.includes(id) && !!CB_CLASS_STYLES[c.cls];

    // Saves
    const saveProf = new Set((k && k.saves) || []);
    if (has('monk', 14)) CB_ABILITIES.forEach(a => saveProf.add(a));
    if (has('rogue', 15)) { saveProf.add('wis'); if (v24) saveProf.add('cha'); }
    const aura = has('paladin', 6) ? Math.max(1, m.cha) : 0;
    const saves = CB_ABILITIES.map(a => ({ a, prof: saveProf.has(a), total: m[a] + (saveProf.has(a) ? prof : 0) + aura }));

    // Skills
    const src = cbSkillSources(c);
    const expert = new Set(c.expertise);
    const jack = has('bard', 2) ? Math.floor(prof / 2) : 0;
    const athlete = !v24 && has('fighter', 7) ? Math.ceil(prof / 2) : 0;
    const lore = {};
    if (v24 && c.cls === 'cleric' && c.opts.order === 'thaumaturge') { lore.arcana = lore.religion = Math.max(1, m.wis); }
    if (v24 && c.cls === 'druid' && c.opts.order === 'magician') { lore.arcana = lore.nature = Math.max(1, m.wis); }
    const skills = Object.entries(CB_SKILLS).map(([id, [name, a]]) => {
        const p = !!src[id], e = p && expert.has(id);
        let total = m[a] + (e ? 2 * prof : p ? prof : 0);
        if (!p) total += Math.max(jack, ['str', 'dex', 'con'].includes(a) ? athlete : 0);
        total += lore[id] || 0;
        return { id, name, a, prof: p, expert: e, from: src[id] || '', total };
    });
    const perception = skills.find(x => x.id === 'perception').total;

    // Armor class
    const armor = cbArmor(c.wear.armor) && c.gear.some(g => g.a === c.wear.armor) ? cbArmor(c.wear.armor) : null;
    const shield = c.wear.shield && c.gear.some(g => g.name === 'Shield');
    const notes = [];
    let ac, acHow;
    const strExempt = !v24 && c.race === 'dwarf';
    if (armor) {
        const dex = armor.cap === null ? m.dex : armor.cap === 0 ? 0 : Math.min(m.dex, armor.cap);
        ac = armor.base + dex;
        acHow = armor.name;
        if (style('defense')) { ac += 1; acHow += ', Defense'; }
        if (!cbArmorProfs(c).includes(armor.type)) notes.push(`Not proficient with ${armor.type} armor: disadvantage on STR and DEX rolls, and no spellcasting.`);
        if (armor.str && s.str < armor.str && !strExempt) notes.push(`${armor.name} needs STR ${armor.str}: speed −10 ft.`);
        if (armor.stealth) notes.push(`${armor.name}: disadvantage on Stealth.`);
    } else {
        const opts = [[10 + m.dex, 'no armor']];
        if (c.cls === 'barbarian') opts.push([10 + m.dex + m.con, 'Unarmored Defense']);
        if (c.cls === 'monk' && !shield) opts.push([10 + m.dex + m.wis, 'Unarmored Defense']);
        if (c.cls === 'sorcerer' && !v24) opts.push([13 + m.dex, 'Draconic Resilience']);
        if (c.cls === 'sorcerer' && v24 && L >= 3) opts.push([10 + m.dex + m.cha, 'Draconic Resilience']);
        [ac, acHow] = opts.sort((x, y) => y[0] - x[0])[0];
    }
    if (shield) {
        const trained = cbArmorProfs(c).includes('shield');
        if (trained || !v24) { ac += 2; acHow += ', shield'; }
        if (!trained) notes.push(v24 ? 'No shield training: the shield gives no AC.' : 'Not proficient with shields.');
    }

    // Speed
    let speed = (sub && sub.speed) || (race ? race.speed : 30);
    const heavy = armor && armor.type === 'heavy';
    if (has('barbarian', 5) && !heavy) speed += 10;
    if (has('monk', 2) && !armor && !shield) speed += L >= 18 ? 30 : L >= 14 ? 25 : L >= 10 ? 20 : L >= 6 ? 15 : 10;
    if (v24 && has('ranger', 6) && !heavy) speed += 10;
    if (armor && armor.str && s.str < armor.str && !strExempt) speed -= 10;

    // Initiative
    const init = m.dex + (v24 ? (featIds.includes('alert') ? prof : 0) : Math.max(jack, athlete));

    // Attacks
    const martial = v24 ? (L >= 17 ? 12 : L >= 11 ? 10 : L >= 5 ? 8 : 6) : (L >= 17 ? 10 : L >= 11 ? 8 : L >= 5 ? 6 : 4);
    const attacks = [];
    const seen = new Set();
    c.gear.forEach(g => {
        if (!g.w || seen.has(g.w)) return;
        seen.add(g.w);
        const w = cbWeapon(g.w, c);
        const monkWeapon = c.cls === 'monk' && (v24
            ? w.kind === 'melee' && (w.cat === 'simple' || w.props.includes('l'))
            : g.w === 'shortsword' || (w.cat === 'simple' && w.kind === 'melee' && !w.props.includes('h') && !w.props.includes('2')));
        const a = w.kind === 'ranged' ? 'dex' : (w.props.includes('f') || monkWeapon) ? (m.dex > m.str ? 'dex' : 'str') : 'str';
        const p = cbWeaponProf(c, g.w);
        let hit = m[a] + (p ? prof : 0);
        if (w.kind === 'ranged' && style('archery')) hit += 2;
        let die = w.dmg;
        if (monkWeapon && /^1d\d+$/.test(die) && Number(die.slice(2)) < martial) die = '1d' + martial;
        let bonus = m[a];
        if (!v24 && w.kind === 'melee' && !w.props.includes('2') && style('dueling')) bonus += 2;
        const props = w.props.map(x => CB_PROP_NAMES[x]).filter(x => x !== 'versatile');
        if (w.vers) props.push(`versatile (${w.vers})`);
        if (w.range) props.push(`range ${w.range} ft.`);
        if (v24 && w.mastery && c.opts.mastery.includes(g.w) && k && k.mastery) props.push(`mastery: ${CB24_MASTERY_TEXT[w.mastery][0]}`);
        attacks.push({ name: w.name, hit, dmg: die === '1' ? `${1 + bonus}` : `${die}${bonus ? ' ' + cbSign(bonus).replace(/^([+-])/, '$1 ') : ''}`, type: w.type, props: props.join(', '), prof: p, w: g.w });
    });
    const unarmedDie = c.cls === 'monk' ? `1d${martial}` : '';
    const ua = c.cls === 'monk' ? Math.max(m.str, m.dex) : m.str;
    attacks.push({ name: 'Unarmed strike', hit: ua + prof, dmg: unarmedDie ? `${unarmedDie}${ua ? ' ' + cbSign(ua).replace(/^([+-])/, '$1 ') : ''}` : `${Math.max(1, 1 + ua)}`, type: has('monk', 6) && v24 ? 'bludgeoning or force' : 'bludgeoning', props: '', prof: true });

    // Dragonborn breath
    let breath = null;
    if (c.race === 'dragonborn') {
        const d = CB_DRAGONS[c.raceOpt.ancestry] || CB_DRAGONS.red;
        breath = v24
            ? { ...d, area: '15 ft. cone or 30 ft. line', save: 'dex', dice: `${L >= 17 ? 4 : L >= 11 ? 3 : L >= 5 ? 2 : 1}d10`, kind: CB_DRAGONS[c.raceOpt.ancestry] ? d.name : '' }
            : { ...d, dice: `${L >= 16 ? 5 : L >= 11 ? 4 : L >= 6 ? 3 : 2}d6`, kind: CB_DRAGONS[c.raceOpt.ancestry] ? d.name : '' };
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
        rages: v24 ? [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6][L - 1] : [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 99][L - 1],
        rageDmg: L >= 16 ? 4 : L >= 9 ? 3 : 2,
        martial, pact: CB_PACT_SLOTS[L - 1],
        prepared: rules ? (rules.type === 'book' ? rules.prepared : rules.list) : 0,
        mastery: k && k.mastery ? k.mastery[L - 1] : 0,
        invocations: v24 ? CB24_INVOCATIONS_KNOWN[L - 1] : 0,
        affinity: c.opts.affinity, dark: (sub && sub.dark) || (race && race.dark) || 0 };
    const say = t => (typeof t === 'function' ? t(x) : t);
    const raceTraits = [...((race && race.traits) || []), ...((sub && sub.traits) || [])].map(([n, t]) => ({ name: n, text: say(t) }));
    const classFeatures = k ? k.features.filter(f => f[0] <= L).map(([lv, n, t]) => ({ level: lv, name: n, text: say(t) })) : [];
    const picked = [];
    cbClassChoices(c).forEach(ch => {
        cbChoiceValue(c, ch.key).forEach(v => {
            const o = ch.options[v];
            if (!o || ch.skills) return;
            if (ch.mastery) picked.push({ name: `${ch.label}: ${o[0]} (${o[1]})`, text: CB24_MASTERY_TEXT[CB24_MASTERY[v]][1] });
            else picked.push({ name: `${ch.label}: ${o[0]}`, text: o[1] });
        });
    });
    let feats;
    if (v24) {
        feats = cbFeatsTaken(c).map(({ id, slot }) => {
            const f = CB24_FEATS[id];
            let name = f.name;
            if (id === 'magic-initiate' && cbFeatSpellList(slot)) name += ` (${CB24_MAGIC_LISTS[cbFeatSpellList(slot)]})`;
            if (id === 'asi' && slot.plus) name += ` (${slot.plus === slot.plusB ? '+2 ' + slot.plus.toUpperCase() : `+1 ${slot.plus.toUpperCase()}, +1 ${(slot.plusB || '').toUpperCase()}`})`;
            else if (f.plus && slot.plus) name += ` (+1 ${slot.plus.toUpperCase()})`;
            let text = say(f.text);
            if (id === 'skilled' && slot.opt.picks.length) text += ` Yours: ${slot.opt.picks.map(p => CB_SKILLS[p] ? CB_SKILLS[p][0] : p).join(', ')}.`;
            return { name, text, from: slot.key === 'bg' ? 'background' : slot.key === 'race' ? 'species' : slot.lv ? `level ${slot.lv}` : '' };
        });
    } else feats = cbFeats(c).map(f => ({ name: CB_FEATS[f].name, text: CB_FEATS[f].text }));
    const bg = cbBg(c);
    const bgFeature = !v24 && bg && bg.feature ? { name: bg.feature[0], text: bg.feature[1] } : null;

    // Resistances and senses
    const senses = [];
    if (x.dark) senses.push(`Darkvision ${x.dark} ft.`);
    if (v24) {
        if (has('ranger', 18)) senses.push('Blindsight 30 ft.');
        if (featIds.includes('boon-truesight')) senses.push('Truesight 60 ft.');
        else if (c.cls === 'warlock' && cbHasInv(c, 'witch-sight')) senses.push('Truesight 30 ft.');
    }
    senses.push(`Passive Perception ${10 + perception}`);

    const hp = cbHitPoints(c);
    return {
        k, race, sub, L, prof, s, m, saves, skills, ac, acHow, notes, speed, init, hp, hd: k ? `${L}d${k.hd}` : '',
        // A plain ability check: 2014 Jack of All Trades and Remarkable Athlete count (they're never proficient).
        checks: Object.fromEntries(CB_ABILITIES.map(a => [a, m[a] + (v24 ? 0 : Math.max(jack, ['str', 'dex', 'con'].includes(a) ? athlete : 0))])),
        passive: 10 + perception, attacks, breath, magic, raceTraits, classFeatures, picked, feats, bgFeature,
        senses, tools: cbTools(c), langs: cbLanguages(c), armorProfs: cbArmorProfs(c),
        weaponProfs: cbWeaponProfText(c), x, rules: v24 ? '2024' : '2014'
    };
}

function cbWeaponProfText(c) {
    const list = cbWeaponList(c);
    const out = [];
    if (list.includes('simple')) out.push('simple weapons');
    if (list.includes('martial')) out.push('martial weapons');
    else if (list.includes('martial-finesse-light')) out.push('martial weapons with finesse or light');
    else if (list.includes('martial-light')) out.push('martial weapons with light');
    list.filter(w => CB_WEAPONS[w] && !list.includes(CB_WEAPONS[w][1])).forEach(w => out.push(CB_WEAPONS[w][0].toLowerCase()));
    return [...new Set(out)];
}

// ── What's left to pick ──────────────────────────────────
// [{ step, text }]
function cbTodo(c) {
    const out = [];
    const add = (step, text) => out.push({ step, text });
    const v24 = cbIs24(c);
    const race = cbRace(c.race, c), sub = cbSubrace(c), k = cbClass(c.cls, c);
    if (!race) add('race', v24 ? 'Choose a species.' : 'Choose a race.');
    else {
        const ch = race.choose || {}, sch = (sub && sub.choose) || {};
        if (ch.abil && c.raceOpt.abil.filter(a => a !== ch.abilNot).length < ch.abil) add('race', `Pick ${ch.abil} abilities for +1.`);
        const skillHave = ch.skillFrom ? c.raceOpt.skills.filter(s => ch.skillFrom.includes(s)).length : c.raceOpt.skills.length;
        if (ch.skill && skillHave < ch.skill) add('race', `Pick ${ch.skill - skillHave} more skill${ch.skill - skillHave > 1 ? 's' : ''}.`);
        if (ch.tool && !c.raceOpt.tool) add('race', 'Pick a tool proficiency.');
        if (ch.ancestry && !c.raceOpt.ancestry) add('race', 'Pick a draconic ancestry.');
        if (sch.cantrip && !c.raceOpt.cantrip) add('race', 'Pick a wizard cantrip.');
        if (v24 && race.castAbil && !c.raceOpt.castAbil) add('race', `Pick the ability your ${race.name} spells use.`);
        const langN = (ch.lang || 0) + (sch.lang || 0);
        if (c.raceOpt.langs.length < langN) add('race', `Pick ${langN - c.raceOpt.langs.length} more language${langN - c.raceOpt.langs.length > 1 ? 's' : ''}.`);
    }
    if (v24) cbFeatSlots(c).filter(s => s.key === 'race').forEach(s => cbFeatTodo(c, s).forEach(t => add('race', t)));
    if (!k) add('class', 'Choose a class.');
    else {
        cbClassChoices(c).forEach(ch => {
            const have = cbChoiceValue(c, ch.key).filter(v => ch.options[v]).length;
            if (have < ch.n) add('class', `${ch.label}: pick ${ch.n - have} more.`);
            if (have > ch.n) add('class', `${ch.label}: ${have - ch.n} too many picked.`);
        });
        if (v24) cbFeatSlots(c).filter(s => s.lv).forEach(s => cbFeatTodo(c, s).forEach(t => add('abilities', t)));
        else cbAsiLevels(c).forEach(lv => {
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
    const bg = cbBg(c);
    if (!c.bg) add('background', 'Choose a background.');
    else if (v24) {
        const allowed = bg.abil || CB_ABILITIES;
        const b = c.bgOpt.boost.filter(a => allowed.includes(a));
        if (b.length < 2) add('background', bg.abil ? `Raise your background's scores: +2 and +1, or +1 to all three of ${bg.abil.map(a => a.toUpperCase()).join(', ')}.` : 'Pick the scores your background raises.');
        if (c.bg === 'custom') {
            if (!c.bgOpt.feat) add('background', 'Pick your background\'s Origin feat.');
            if (c.bgOpt.skills.length < 2) add('background', 'Pick two background skills.');
        }
        if (cbBgToolChoices(c).length && !c.bgOpt.tool) add('background', 'Pick your background\'s tool.');
        cbFeatSlots(c).filter(s => s.key === 'bg' && s.feat).forEach(s => cbFeatTodo(c, s).forEach(t => add('background', t)));
        const langN = cbLanguageSlots(c).bg;
        if (c.bgOpt.langs.length < langN) add('background', `Pick ${langN - c.bgOpt.langs.length} more language${langN - c.bgOpt.langs.length > 1 ? 's' : ''}.`);
        if (c.bgOpt.langs.length > langN) add('background', `${c.bgOpt.langs.length - langN} language${c.bgOpt.langs.length - langN > 1 ? 's' : ''} too many.`);
    } else if (c.bg === 'acolyte' && c.bgOpt.langs.length < 2) add('background', `Pick ${2 - c.bgOpt.langs.length} more language${c.bgOpt.langs.length === 1 ? '' : 's'}.`);
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
        if (v24) {
            const ok = cbExpertiseChoices(c);
            const bad = c.expertise.filter(e => !ok.includes(e));
            if (bad.length) add('skills', `Expertise needs a skill you're proficient in${c.cls === 'wizard' ? ' from the Scholar list' : ''}: ${bad.map(e => CB_SKILLS[e] ? CB_SKILLS[e][0] : e).join(', ')}.`);
        }
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
    const race = cbRace(c.race, c);
    const seen = {}, dup = new Set();
    const add = list => (list || []).forEach(s => { if (seen[s]) dup.add(s); seen[s] = true; });
    add(race && race.skills); add(c.raceOpt.skills);
    if (cbIs24(c)) {
        const bg = cbBg(c);
        add(bg && bg.skills ? bg.skills : c.bgOpt.skills);
        add(c.skills);
        if ((c.cls === 'bard' || c.cls === 'barbarian') && c.level >= 3) add(c.opts.loreSkills);
        cbFeatSlots(c).forEach(s => { if (s.feat === 'skilled') add(s.opt.picks.filter(p => CB_SKILLS[p])); });
        return [...dup];
    }
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
    const k = cbClass(c.cls, c);
    c.level += 1;
    if (c.hpMode === 'roll' && k) c.hpRolls[c.level - 2] = cbRollDie(k.hd);
    const features = k ? k.features.filter(f => f[0] === c.level).map(f => f[1]) : [];
    if (cbAsiLevels(c).includes(c.level) && !features.includes('Epic Boon')) features.push('Ability Score Improvement');
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
    if (cbIs24(c)) {
        if (!CB24_STRIKES[c.cls] || c.level < 7) c.opts.strikes = '';
        if (c.cls !== 'sorcerer' || c.level < 6) c.opts.affinity = '';
        if (c.cls !== 'druid' || c.level < 3) c.opts.land = '';
        if (!CB24_ORDERS[c.cls]) c.opts.order = '';
        if (!cbHasStyleFeature(c)) c.opts.styles = [];
    } else if (c.cls !== 'warlock' || c.level < 3) c.opts.pact = '';
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
    const race = cbRaceLabel(c);
    const lines = [
        `${c.name || 'Unnamed character'}: level ${c.level} ${race} ${d.k ? d.k.name : ''}${cbIs24(c) ? ' (2024 rules)' : ''}`.replace(/\s+/g, ' ').trim(),
        `AC ${d.ac} · HP ${d.hp} · Speed ${d.speed} ft. · Initiative ${cbSign(d.init)} · Proficiency ${cbSign(d.prof)} · Passive Perception ${d.passive}`,
        CB_ABILITIES.map(a => `${a.toUpperCase()} ${d.s[a]} (${cbSign(d.m[a])})`).join(' · '),
        'Saves: ' + d.saves.filter(x => x.prof).map(x => `${x.a.toUpperCase()} ${cbSign(x.total)}`).join(', '),
        'Skills: ' + d.skills.filter(x => x.prof).map(x => `${x.name} ${cbSign(x.total)}`).join(', '),
        'Attacks: ' + d.attacks.map(a => `${a.name} ${cbSign(a.hit)} (${a.dmg} ${a.type})`).join('; ')
    ];
    if (d.feats.length && cbIs24(c)) lines.push('Feats: ' + d.feats.map(f => f.name).join(', '));
    if (d.magic) lines.push(`Spell save DC ${d.magic.dc}, spell attack ${cbSign(d.magic.attack)}`);
    return lines.join('\n');
}

// ── Quick build ──────────────────────────────────────────
const CB_QUICK_BACKGROUNDS = ['Wanderer', 'Caravan guard', 'Dockhand', 'Village healer', 'Scribe', 'Hunter', 'Farmhand', 'Former cultist', 'Minstrel\'s apprentice', 'Smith\'s apprentice', 'Ferry pilot', 'Ratcatcher'];
const CB_NPC_RACE = { dwarf: 'dwarf', elf: 'elf', halfling: 'halfling', human: 'human', dragonborn: 'dragonborn', gnome: 'gnome', 'half-elf': 'elf', 'half-orc': 'orc', tiefling: 'tiefling', orc: 'orc', goliath: 'human' };

// opts: { level, cls, race, rules } ('' = random). Returns a complete character.
// A 2024 build needs the page's spell list to be the 2024 one (srd52.js rulesUse('2024')).
function cbQuickBuild(opts = {}) {
    if (opts.rules === '2024' && CB24_OK()) return cbQuickBuild24(opts);
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
    if (sch.cantrip) c.raceOpt.cantrip = cbPick(cbSpellsFor('Wizard', 0).filter(cbSeedSafe)).name;
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

    cbQuickChoices(c, taken);
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

    cbQuickSpells(c);
    cbQuickFinish(c, race);
    return c;
}

// Class picks, level by level (three passes: a pick can unlock another).
function cbQuickChoices(c, taken) {
    for (let pass = 0; pass < 3; pass++) {
        cbClassChoices(c).forEach(choice => {
            const have = cbChoiceValue(c, choice.key).filter(v => choice.options[v]);
            if (have.length >= choice.n) return;
            let pool = Object.keys(choice.options).filter(v => !have.includes(v));
            if (choice.skills) pool = pool.filter(s => !taken.has(s));
            if (choice.mastery) {
                const carried = c.gear.filter(g => g.w).map(g => g.w);
                pool = [...cbShuffle(pool.filter(w => carried.includes(w))), ...cbShuffle(pool.filter(w => !carried.includes(w)))];
            } else pool = cbShuffle(pool);
            const add = pool.slice(0, choice.n - have.length);
            cbSetChoice(c, choice.key, [...have, ...add]);
            if (choice.skills) add.forEach(s => taken.add(s));
        });
    }
}

// Spells for a quick build: cantrips, then learn level by level as a player would.
function cbQuickSpells(c) {
    const k = cbClass(c.cls, c);
    const r = cbSpellRules(c);
    if (!r) return;
    const safe = cbIs24(c) ? cbSeedSafe24 : cbSeedSafe;
    const cls = k.name;
    let cantripPool = cbSpellsFor(cls, 0).filter(safe);
    if (r.offCantrips && cbIs24(c) && typeof SPELLS_DATA !== 'undefined') {
        const extra = SPELLS_DATA.filter(s => s.level === 0 && safe(s) && (!r.cantripFrom || r.cantripFrom.some(n => s.classes.includes(n))) && !cantripPool.includes(s));
        cantripPool = [...cbShuffle(cantripPool), ...cbShuffle(extra)];
        const own = cantripPool.filter(s => s.classes.includes(cls)).slice(0, r.cantrips - r.offCantrips);
        const off = cbShuffle(extra).slice(0, r.cantrips - own.length);
        c.spells.cantrips = [...own, ...off].map(s => s.name);
    } else c.spells.cantrips = cbShuffle(cantripPool).slice(0, r.cantrips).map(s => s.name);
    if (c.cls === 'warlock' && c.spells.cantrips.length && !c.spells.cantrips.includes('Eldritch Blast')) c.spells.cantrips[0] = 'Eldritch Blast';
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
            for (let sl = want; sl >= 1 && !pool.length; sl--) pool = cbClassSpells(c, sl).filter(s => safe(s) && !list.includes(s.name) && !always.includes(s.name.toLowerCase()));
            if (!pool.length) break;
            list.push(cbPick(pool).name);
        }
    }
    c.level = top;
    c.spells.list = list.slice(0, r.list);
    if (r.type === 'book') c.spells.prepared = cbShuffle(c.spells.list).slice(0, r.prepared);
    r.arcanum.forEach(lv => { const p = cbClassSpells(c, lv).filter(safe); if (p.length) c.spells.arcanum[lv] = cbPick(p).name; });
    // Invocations that needed a cantrip can now be picked.
    cbClassChoices(c).forEach(choice => {
        const have = cbChoiceValue(c, choice.key).filter(v => choice.options[v]);
        if (have.length < choice.n) cbSetChoice(c, choice.key, [...have, ...cbShuffle(Object.keys(choice.options).filter(v => !have.includes(v))).slice(0, choice.n - have.length)]);
    });
}

function cbQuickFinish(c, race) {
    const k = cbClass(c.cls, c);
    const gender = cbPick(['male', 'female', 'nonbinary']);
    c.gender = gender === 'nonbinary' ? 'Nonbinary' : gender === 'male' ? 'Male' : 'Female';
    try {
        if (typeof buildName === 'function') c.name = buildName(CB_NPC_RACE[race.id] || 'human', gender).name.replace(/\s+/g, ' ').slice(0, 60);
    } catch (e) {}
    if (!c.name) c.name = `${race.name} ${k.name}`;
    c.alignment = cbPick(CB_ALIGNMENTS);
}

// A 2024 quick build: species, background (its scores, feat, and tool), feats at every ASI level.
function cbQuickBuild24(opts) {
    const c = cbBlank('2024');
    const race = cbRace(opts.race, c) || cbPick(CB24_SPECIES);
    const k = cbClass(opts.cls, c) || cbPick(CB24_CLASSES);
    c.race = race.id;
    c.subrace = race.subraces ? cbPick(race.subraces).id : '';
    c.cls = k.id;
    c.level = Math.min(20, Math.max(1, Math.round(Number(opts.level)) || 1));
    const prio = [...new Set([...k.primary, 'con', 'dex', 'wis', 'str', 'int', 'cha'])];
    const mental = prio.filter(a => ['int', 'wis', 'cha'].includes(a));
    if (race.sizes) c.raceOpt.size = cbPick(race.sizes);
    if (race.castAbil) c.raceOpt.castAbil = k.cast ? k.cast.ability : mental[0];
    const ch = race.choose || {};
    if (ch.ancestry) c.raceOpt.ancestry = cbPick(Object.keys(CB_DRAGONS));

    // Scores: the standard array, best first into the class's key abilities.
    c.method = 'array';
    prio.forEach((a, i) => { c.base[a] = CB_STANDARD_ARRAY[i]; });
    c.assigned = true;

    // Background: one of the four, its +2/+1 on the best fits (else +1 to all three).
    c.bg = cbPick(['acolyte', 'criminal', 'sage', 'soldier']);
    const bg = cbBg(c);
    const fits = prio.filter(a => bg.abil.includes(a));
    c.bgOpt.boost = fits[0] === prio[0] ? fits.slice(0, 2) : bg.abil.slice();
    if (bg.toolPick) c.bgOpt.tool = cbPick(cbBgToolChoices(c));

    // Skills: background, species, then class, without repeats.
    const taken = new Set(bg.skills);
    if (ch.skill) {
        const from = (ch.skillFrom || Object.keys(CB_SKILLS)).filter(s => !taken.has(s));
        c.raceOpt.skills = cbShuffle(from).slice(0, ch.skill);
        c.raceOpt.skills.forEach(s => taken.add(s));
    }
    c.skills = cbShuffle(cbClassSkillChoices(c).filter(s => !taken.has(s))).slice(0, k.skills.n);
    c.skills.forEach(s => taken.add(s));
    if (k.toolPick) {
        const from = k.toolPick.from === 'instrument' ? CB_INSTRUMENTS : [...CB_ARTISAN_TOOLS, ...CB_INSTRUMENTS];
        c.tools = cbShuffle(from).slice(0, k.toolPick.n);
    }

    // Origin feats: the background's, and a human's Skilled.
    const fillFeat = (slot) => {
        const o = slot.opt;
        if (slot.feat === 'magic-initiate') {
            o.list = slot.list || cbPick(Object.keys(CB24_MAGIC_LISTS));
            o.abil = mental[0];
            const L = CB24_MAGIC_LISTS[o.list];
            o.cantrips = cbShuffle(cbSpellsFor(L, 0).filter(cbSeedSafe24)).slice(0, 2).map(s => s.name);
            const one = cbSpellsFor(L, 1).filter(cbSeedSafe24);
            o.spell = one.length ? cbPick(one).name : '';
        }
        if (slot.feat === 'skilled') {
            o.picks = cbShuffle(Object.keys(CB_SKILLS).filter(s => !taken.has(s))).slice(0, 3);
            o.picks.forEach(s => taken.add(s));
        }
    };
    if (ch.feat) { c.raceOpt.feat = 'skilled'; }
    cbFeatSlots(c).filter(s => !s.lv).forEach(fillFeat);

    // Languages: Common plus two (plus the rogue's and ranger's extras).
    c.bgOpt.langs = cbShuffle(CB24_LANGUAGES.slice(1, 9)).slice(0, 2);
    const more = cbLanguageSlots(c).bg - 2;
    if (more > 0) c.bgOpt.langs.push(...cbShuffle(CB24_LANGUAGES.filter(l => !c.bgOpt.langs.includes(l))).slice(0, more));

    // Gear first (Weapon Mastery likes the weapons it carries).
    c.equipMode = 'class';
    c.equip.choice = [Math.floor(cbRand() * cbKits(k).length), 0];
    const kits = cbKits(k), ki = c.equip.choice[0];
    kits[ki].gear.forEach((t, i) => { if (t.startsWith('pick:')) c.equip.picks[`0-${ki}-${i}`] = cbPick(cbPickList(t.slice(5), c)); });
    const start = cbClassGear(c);
    c.gear = start.gear;
    c.coins = start.coins;
    c.gearSet = true;

    cbQuickChoices(c, taken);
    if (cbExpertiseCount(c)) {
        const prof = cbExpertiseChoices(c);
        const want = prof.filter(s => CB_SKILLS[s] && k.primary.includes(CB_SKILLS[s][1]));
        c.expertise = [...cbShuffle(want), ...cbShuffle(prof.filter(s => !want.includes(s)))].slice(0, cbExpertiseCount(c));
    }

    // Feats at each ASI level: Ability Score Improvement into the key ability (19: the class's Epic Boon).
    const top = c.level;
    cbAsiLevels(c).forEach(lv => {
        c.level = lv;
        const s = cbScores(c);
        if (lv === 19) {
            const id = CB24_BOON_FOR[c.cls];
            const f = CB24_FEATS[id];
            const ok = f.plus === 'any' ? prio : prio.filter(a => f.plus.includes(a));
            c.asi[lv] = { feat: id, a: ok[0] };
            return;
        }
        const a = prio.find(x => s[x] < 20);
        if (!a) { c.asi[lv] = { feat: 'skilled', opt: { ...cbFeatOptBlank(), picks: cbShuffle(Object.keys(CB_SKILLS).filter(x => !taken.has(x))).slice(0, 3) } }; c.asi[lv].opt.picks.forEach(x => taken.add(x)); return; }
        c.asi[lv] = s[a] <= 18 ? { feat: 'asi', a, b: a } : { feat: 'asi', a, b: prio.find(y => y !== a && s[y] < 20) || a };
    });
    c.level = top;
    cbAutoWear(c);
    cbQuickSpells(c);
    cbQuickFinish(c, race);
    return c;
}

// Quick build draws only SRD 5.1 spells, never homebrew or the SRD 5.2 additions (srd52.js), so it
// builds the same character on every device. A 2024 build draws only SRD 5.2 spells.
function cbSeedSafe(s) {
    return !s.hb && !s.v52;
}

function cbSeedSafe24(s) {
    return !s.hb && !!s.v52;
}

function cbSpellsFor(className, level) {
    return typeof SPELLS_DATA === 'undefined' ? [] : SPELLS_DATA.filter(s => s.level === level && s.classes.includes(className));
}
