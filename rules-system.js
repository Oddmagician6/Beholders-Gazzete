/* ============================================
   GAME SYSTEM LAYER
   One codebase serves more than one rules system. Engines write their checks as tokens
   and the page's system turns them into words: <html data-system="pf2e"> picks Pathfinder
   (rules-pf2e.js adds it); no attribute means D&D 5e, which renders the exact old text.
   Load this before rng.js and every engine. Tables wrap in ruleTable() where they're
   defined, so a table built from another one copies text that's already rendered.

   Tokens:
     {dc:12}                "DC 12" (another system may rescale the number)
     {skill:wis:perception} "Wisdom (Perception)"; a fourth part, {skill:int:investigation:society},
                            names the skill other systems use in its place
     {save:dex}             "Dexterity", the save's name (the text keeps "saving throw" or "save")
     {ability:str}          "Strength", for a plain ability check; {ability:dex:thievery} as above
     {alt:5e words|other}   wording that has no token of its own
   ============================================ */

const RULE_ABILITIES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

const RULE_SYSTEMS = {
    '5e': {
        name: 'D&D 5e',
        dc: n => `DC ${n}`,
        skill: (abil, skill) => `${RULE_ABILITIES[abil]} (${ruleTitle(skill)})`,
        save: abil => RULE_ABILITIES[abil],
        ability: abil => RULE_ABILITIES[abil],
        alt: (five) => five
    }
};

// "sleight-of-hand" → "Sleight of Hand"
function ruleTitle(key) {
    return key.split('-').map((w, i) => i && /^(of|and)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join(' ');
}

function ruleSystemId() {
    const id = typeof document !== 'undefined' && document.documentElement.dataset.system;
    return id && RULE_SYSTEMS[id] ? id : '5e';
}

function ruleSystem() {
    return RULE_SYSTEMS[ruleSystemId()];
}

const RULE_TOKEN = /\{(dc|skill|save|ability|alt):([^{}]*)\}/g;

// Render every token in one string. A system's phrases (5e terms it words differently) swap first.
function ruleText(s) {
    if (typeof s !== 'string') return s;
    const sys = ruleSystem();
    if (sys.phrases) sys.phrases.forEach(([from, to]) => { s = s.replace(from, to); });
    if (s.indexOf('{') < 0) return s;
    return s.replace(RULE_TOKEN, (m, kind, body) => {
        if (kind === 'alt') {
            const bar = body.indexOf('|');
            return sys.alt(body.slice(0, bar), body.slice(bar + 1));
        }
        const p = body.split(':');
        // Monster Maker text has its own {dc:wis}; only a number is ours.
        if (kind === 'dc') return /^\d+$/.test(p[0]) ? sys.dc(Number(p[0])) : m;
        if (kind === 'skill') return sys.skill(p[0], p[1], p[2]);
        return sys[kind](p[0], p[1]);
    });
}

// Render every string in a table, in place, and return it.
function ruleTable(t) {
    if (typeof t === 'string') return ruleText(t);
    if (Array.isArray(t)) {
        for (let i = 0; i < t.length; i++) t[i] = typeof t[i] === 'string' ? ruleText(t[i]) : ruleTable(t[i]);
    } else if (t && typeof t === 'object') {
        for (const k of Object.keys(t)) t[k] = typeof t[k] === 'string' ? ruleText(t[k]) : ruleTable(t[k]);
    }
    return t;
}

// A word another system names differently: ruleWord('race', 'tiefling') is "nephilim" in Pathfinder.
// Keeps a capital first letter.
function ruleWord(kind, word) {
    const map = (ruleSystem().words || {})[kind];
    const to = map && typeof word === 'string' && map[word.toLowerCase()];
    if (!to) return word;
    return word[0] !== word[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to;
}

// Whether the system gives gods and people an alignment (the Pathfinder Remaster doesn't).
function ruleHasAlignment() {
    return ruleSystem().alignment !== false;
}

// Whether the NPC page gives people a stat block in this system (Pathfinder's come with its NPC
// stat blocks, ROADMAP L3 P4; until then its NPC page rolls the person only).
function ruleHasStatBlocks() {
    return ruleSystem().statBlocks !== false;
}

// Whether a link to another tool belongs on this system's page. A Pathfinder page leaves out links to
// D&D tools that have no Pathfinder page yet; tab-pages.js's moves (TAB_PAGES) list the ones that do.
function ruleLinkOk(href) {
    if (ruleSystemId() === '5e') return true;
    const moves = (typeof TAB_PAGES !== 'undefined' && TAB_PAGES && TAB_PAGES.moves) || {};
    const url = new URL(href, location.href);
    const name = decodeURIComponent(url.pathname.split('/').pop()).replace(/\.html$/, '');
    if (name.startsWith('pathfinder')) return true;
    const tab = url.searchParams.get('tab');
    return !!(tab ? moves[`${name}?tab=${tab}`] : moves[name]);
}

// The localStorage key (or database name) for this system's saves, so a Pathfinder party or
// notebook never shows up in the D&D tools: 5e keeps the old key, others add "-<system>".
function ruleKey(key) {
    const id = ruleSystemId();
    return id === '5e' ? key : `${key}-${id}`;
}
