/* ============================================
   NPC GENERATOR: PATHFINDER STAT BLOCKS
   Loaded on the Pathfinder NPC page in place of npc-statblock.js. A Pathfinder NPC gets an
   NPC Core stat block (pf2e-creatures-data.js numbers, pf2e-creature-blocks.js text, drawn by
   toolbox-statblock.js) picked for the person's job, fitted to a level with GM Core's elite and
   weak adjustments, and moved to the person's ancestry (the Gazette's swap: traits, size, Speed,
   senses, and a language). The block keeps only its picks (id, level, adjustment, ancestry);
   the numbers are worked out when it's drawn. Same entry points as npc-statblock.js:
   rollStatBlock, statBlockText, sbLockOk.
   ============================================ */

// NPC Core people by job. A profession wins over its category. Ids whose creature has an
// ancestry of its own (dwarf-smith) only come up for a person of that ancestry.
const SB_PF2E_POOLS = {
    commoner: ['commoner', 'farmer', 'fisher', 'miner', 'dockhand', 'drover', 'servant', 'forager', 'gravedigger', 'construction-worker',
        'driver', 'rigger', 'vermin-catcher', 'torchbearer', 'beggar', 'drunkard', 'smith', 'orc-agriculturist', 'goblin-chef', 'halfling-head-chef'],
    merchant: ['merchant', 'apothecary', 'innkeeper', 'arms-dealer', 'tonic-merchant', 'toymaker', 'loan-shark', 'fence', 'smith', 'gunsmith',
        'local-herbalist', 'driver', 'guildmaster', 'dwarf-smith'],
    guard: ['guard', 'watch-officer', 'jailer', 'palace-guard', 'captain-of-the-guard', 'inspector', 'bodyguard', 'infantry-soldier', 'archer-sentry',
        'equestrian-constable', 'tax-collector', 'judge', 'barrister', 'warden', 'unsanctioned-sheriff', 'gendarme', 'standard-bearer', 'musketeer', 'messenger'],
    magic: ['adept', 'apprentice', 'mage-for-hire', 'watchmage', 'necromancer', 'astronomer', 'sage', 'sibyl', 'fiend-caller', 'coven-aspirant',
        'natural-scientist', 'reckless-scientist', 'gadgeteer', 'exuberant-apprentice', 'demonologist', 'mirror-seer', 'gnome-philomath', 'razzle-dazzler'],
    criminal: ['bandit', 'ruffian', 'burglar', 'charlatan', 'assassin', 'pirate', 'poacher', 'grave-robber', 'saboteur', 'spy', 'fence', 'loan-shark',
        'gang-leader', 'legbreaker', 'master-of-disguise', 'urchin', 'tomb-raider', 'halfling-smuggler', 'goblin-scavenger'],
    noble: ['noble', 'envoy', 'mayor', 'advisor', 'political-upstart', 'veteran-noble', 'runaway-blueblood', 'court-historian', 'courtesan', 'toady',
        'knight', 'prime-minister', 'despot', 'high-roller'],
    religious: ['acolyte-of-valor', 'abbot-of-the-coin', 'pilgrim-of-perfection', 'penitent-of-vengeance', 'cultist', 'prophet', 'false-priest',
        'druid-initiate', 'priest-of-the-dawn', 'dedicated-druid', 'humanitarian-hermit', 'traveling-priest-of-the-stars', 'therapeutic-healer',
        'spirit-priest', 'dromaar-lorekeeper'],
    adventurer: ['tracker', 'guide', 'bounty-hunter', 'monster-hunter', 'mountaineer', 'expedition-leader', 'tomb-raider', 'martial-student',
        'mage-for-hire', 'sniper', 'hunter', 'beast-tamer', 'tournament-combatant', 'troubadour', 'mixed-martial-artist', 'mage-killer',
        'demonbane-warrior', 'gnome-daredevil', 'orc-veteran-master'],
    // Professions
    Baker: ['commoner', 'servant', 'goblin-chef', 'halfling-head-chef'], Cook: ['servant', 'commoner', 'goblin-chef', 'halfling-head-chef'],
    Blacksmith: ['smith', 'dwarf-smith'], Weaponsmith: ['smith', 'dwarf-smith', 'arms-dealer', 'gunsmith'],
    Dockhand: ['dockhand', 'rigger'], Farmer: ['farmer', 'orc-agriculturist'], Fisher: ['fisher'], Gravedigger: ['gravedigger'], Miner: ['miner'],
    Herder: ['drover'], Shepherd: ['drover'], Stablehand: ['drover'], Hunter: ['forager', 'tracker', 'poacher', 'hunter', 'orc-gamekeeper'],
    Laborer: ['construction-worker', 'commoner'], Mason: ['construction-worker'], Carpenter: ['construction-worker', 'toymaker'],
    Ratcatcher: ['vermin-catcher'], Sailor: ['rigger', 'navigator', 'bosun', 'diver'], Servant: ['servant'], Midwife: ['physician', 'local-herbalist'],
    Lamplighter: ['torchbearer', 'commoner'], Ferryman: ['fisher', 'navigator'], Ferrywoman: ['fisher', 'navigator'], 'Ferry Pilot': ['fisher', 'navigator'],
    Woodcutter: ['forager', 'construction-worker'], Washer: ['servant', 'commoner'],
    Apothecary: ['apothecary'], Herbalist: ['local-herbalist'], Innkeeper: ['innkeeper'], 'Tavern Keeper': ['innkeeper'], Toymaker: ['toymaker'],
    Moneylender: ['loan-shark', 'merchant'], Pawnbroker: ['fence', 'merchant'], 'Potion Seller': ['tonic-merchant', 'apothecary'],
    Cartographer: ['navigator', 'astronomer'], 'Caravan Master': ['driver', 'guide', 'merchant'], Bookseller: ['merchant', 'librarian'],
    'Scroll Merchant': ['merchant', 'librarian', 'adept'], 'Livestock Trader': ['drover', 'merchant'],
    'Bounty Hunter': ['bounty-hunter'], 'City Guard': ['guard'], 'Night Watch': ['guard', 'watch-officer'], 'Gate Keeper': ['guard'],
    'Royal Guard': ['palace-guard'], 'Prison Guard': ['jailer', 'guard'], Jailer: ['jailer'], 'Guard Captain': ['captain-of-the-guard', 'watch-officer'],
    Harbormaster: ['harbormaster'], Judge: ['judge'], Magistrate: ['judge'], Lawyer: ['barrister'], Notary: ['barrister', 'librarian'],
    'Tax Collector': ['tax-collector'], 'Census Taker': ['tax-collector'], 'Customs Officer': ['inspector', 'tax-collector'],
    Sheriff: ['unsanctioned-sheriff', 'watch-officer'], Marshal: ['equestrian-constable', 'watch-officer'], Bailiff: ['guard', 'jailer'],
    Soldier: ['infantry-soldier', 'archer-sentry', 'musketeer'], 'Militia Sergeant': ['infantry-soldier', 'watch-officer', 'standard-bearer'],
    'Watch Sergeant': ['watch-officer'], Warden: ['warden'], 'Road Warden': ['archer-sentry', 'tracker', 'equestrian-constable'],
    Herald: ['messenger', 'envoy'], 'Town Crier': ['messenger'], 'Royal Courier': ['messenger'], 'Keeper of Records': ['librarian', 'court-historian'],
    Alchemist: ['apothecary', 'natural-scientist', 'reckless-scientist'], 'Arcane Scholar': ['sage', 'adept', 'avuncular-professor', 'departmental-chair'],
    Astrologer: ['astronomer'], Diviner: ['sibyl', 'mirror-seer'], 'Fortune Teller': ['sibyl', 'charlatan'], Oracle: ['sibyl', 'prophet', 'mirror-seer'],
    Necromancer: ['necromancer'], Sage: ['sage'], Scrivener: ['librarian', 'apprentice'], Summoner: ['fiend-caller', 'demonologist', 'spirit-binder'],
    Witch: ['coven-aspirant'], 'Weather Witch': ['coven-aspirant', 'druid-initiate'], 'Golem Keeper': ['mechanic', 'gadgeteer', 'puppeteer'],
    Artificer: ['mechanic', 'gadgeteer', 'combat-engineer'], 'Stage Magician': ['charlatan', 'juggler', 'traveling-actor', 'razzle-dazzler'],
    'Magical Tutor': ['teacher', 'adept'], 'Hedge Wizard': ['adept', 'mage-for-hire'], 'Wand Maker': ['adept', 'mage-for-hire'],
    'Rune Carver': ['adept', 'smith'], 'Spellbook Seller': ['merchant', 'adept'], Sorcerer: ['mage-for-hire', 'watchmage'],
    Warlock: ['fiend-caller', 'mage-for-hire'], 'Potion Brewer': ['apothecary', 'tonic-merchant'],
    Assassin: ['assassin'], Bandit: ['bandit', 'ruffian'], Highwayman: ['bandit'], Highwaywoman: ['bandit'], 'Highway Robber': ['bandit'],
    Thug: ['ruffian', 'legbreaker'], Burglar: ['burglar'], 'Cat Burglar': ['burglar'], Thief: ['burglar', 'urchin'], Cutpurse: ['urchin', 'burglar'],
    Pickpocket: ['urchin', 'burglar'], Cardsharp: ['charlatan', 'high-roller'], 'Con Artist': ['charlatan'], Bookmaker: ['charlatan', 'loan-shark'],
    Fence: ['fence'], 'Gang Leader': ['gang-leader'], Racketeer: ['gang-leader', 'legbreaker'], 'Grave Robber': ['grave-robber'],
    'Loan Shark': ['loan-shark'], Pirate: ['pirate'], Poacher: ['poacher'], Saboteur: ['saboteur', 'demolitionist'],
    Smuggler: ['halfling-smuggler', 'pirate', 'fence'], Spy: ['spy', 'master-of-disguise'], Informant: ['spy', 'urchin'],
    Poisoner: ['assassin', 'apothecary'], Forger: ['charlatan', 'master-of-disguise'], Counterfeiter: ['charlatan'], Blackmailer: ['spy', 'conspiracist'],
    Bootlegger: ['fence', 'ruffian'],
    Knight: ['knight'], Mayor: ['mayor'], Envoy: ['envoy'], Ambassador: ['envoy'], Courtier: ['toady', 'courtesan', 'political-upstart'],
    Chancellor: ['advisor', 'prime-minister'], Seneschal: ['advisor'], Steward: ['advisor', 'servant'], Castellan: ['captain-of-the-guard', 'veteran-noble'],
    'Exiled Noble': ['runaway-blueblood', 'exiled-revolutionary'], 'Disinherited Heir': ['runaway-blueblood'], Magnate: ['guildmaster', 'high-roller'],
    'Patron of the Arts': ['noble', 'veteran-noble'],
    Acolyte: ['acolyte-of-valor', 'abbot-of-the-coin'], Abbot: ['abbot-of-the-coin'], Abbess: ['abbot-of-the-coin'], 'Abbey Head': ['abbot-of-the-coin'],
    Druid: ['druid-initiate', 'dedicated-druid'], Shaman: ['druid-initiate', 'spirit-priest'], Doomsayer: ['prophet', 'conspiracist'], Prophet: ['prophet'],
    Exorcist: ['priest-of-the-dawn', 'penitent-of-vengeance'], Inquisitor: ['penitent-of-vengeance', 'inspector'],
    'Faith Healer': ['therapeutic-healer', 'physician'], Hermit: ['humanitarian-hermit'],
    'High Priest': ['high-priest-of-the-grave', 'priest-of-the-dawn'], 'High Priestess': ['high-priest-of-the-grave', 'priest-of-the-dawn'],
    'High Cleric': ['high-priest-of-the-grave', 'priest-of-the-dawn'], Monk: ['martial-student', 'pilgrim-of-perfection'], Nun: ['pilgrim-of-perfection'],
    Monastic: ['pilgrim-of-perfection', 'martial-student'], Paladin: ['acolyte-of-valor', 'champion-of-beauty'], Templar: ['acolyte-of-valor', 'champion-of-beauty'],
    'Temple Guardian': ['palace-guard', 'acolyte-of-valor'], Pilgrim: ['pilgrim-of-perfection'], 'Relic Keeper': ['abbot-of-the-coin', 'librarian'],
    'Shrine Keeper': ['acolyte-of-valor', 'abbot-of-the-coin'],
    Barbarian: ['ruffian', 'tournament-combatant'], Bard: ['troubadour', 'street-musician'], Fighter: ['bodyguard', 'infantry-soldier', 'tournament-combatant'],
    Sellsword: ['bodyguard', 'infantry-soldier', 'bandit'], 'Caravan Guard': ['bodyguard', 'archer-sentry'], Ranger: ['tracker', 'archer-sentry', 'sniper'],
    Scout: ['tracker', 'archer-sentry'], Explorer: ['guide', 'mountaineer', 'expedition-leader'], Rogue: ['burglar', 'tomb-raider', 'spy'],
    Wizard: ['mage-for-hire', 'watchmage', 'necromancer'], 'Monster Hunter': ['monster-hunter'], 'Treasure Hunter': ['tomb-raider'],
    'Relic Hunter': ['tomb-raider'], 'Dungeon Guide': ['guide', 'torchbearer'], 'Wandering Duelist': ['tournament-combatant', 'peerless-duelist'],
    'Beast Tamer': ['beast-tamer'], 'Retired Adventurer': ['veteran-noble', 'hunter', 'knight']
};

// The NPC page's races as Pathfinder ancestries: traits that replace "human" on NPC Core's human
// blocks, plus size, Speed (in place of the human 25 feet), a sense, and a language.
const SB_PF2E_ANCESTRY = {
    human: { traits: ['human'] },
    elf: { traits: ['elf'], speed: 30, sense: 'low-light vision', lang: 'Elven' },
    dwarf: { traits: ['dwarf'], speed: 20, sense: 'darkvision', lang: 'Dwarven' },
    halfling: { traits: ['halfling'], size: 'S', lang: 'Halfling' },
    gnome: { traits: ['gnome'], size: 'S', sense: 'low-light vision', lang: 'Gnomish' },
    orc: { traits: ['orc'], sense: 'darkvision', lang: 'Orcish' },
    tiefling: { traits: ['human', 'nephilim'], sense: 'low-light vision' },
    dragonborn: { traits: ['human', 'dragonblood'], lang: 'Draconic' },
    'half-elf': { traits: ['aiuvarin', 'elf', 'human'], sense: 'low-light vision' },
    'half-orc': { traits: ['dromaar', 'human', 'orc'], sense: 'low-light vision' }
};
const SB_PF2E_ANCESTRY_TRAITS = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'goblin', 'aiuvarin', 'dromaar', 'nephilim', 'dragonblood',
    'kholo', 'tripkee', 'ratfolk', 'kobold', 'tengu', 'catfolk', 'lizardfolk', 'hobgoblin', 'leshy'];

// NPC Core's people (pf2e-creatures-data.js), by id: no troops, animals, or Large folk.
const SB_PF2E_NPCS = Object.fromEntries((typeof PF2E_CREATURES !== 'undefined' ? PF2E_CREATURES : [])
    .filter(c => c.book === 'NC' && c.traits.includes('humanoid') && !c.traits.includes('troop') && 'SM'.includes(c.size) && c.id !== 'harrow-reader')
    .map(c => [c.id, c]));

// Can someone of this ancestry use this block? Human blocks fit anyone; one with an ancestry of its
// own needs a person who has all its ancestry traits.
function sbPf2eFits(c, race) {
    const own = c.traits.filter(t => SB_PF2E_ANCESTRY_TRAITS.includes(t));
    if (own.length === 1 && own[0] === 'human') return true;
    const anc = (SB_PF2E_ANCESTRY[race] || SB_PF2E_ANCESTRY.human).traits;
    return own.every(t => anc.includes(t));
}

// GM Core's elite (+1) and weak (−1) adjustments: the new level, and the HP change by starting level.
function sbPf2eAdjLevel(level, adj) {
    if (adj > 0) return level + (level <= 0 ? 2 : 1);
    if (adj < 0) return level >= 1 ? level - (level === 1 ? 2 : 1) : null;
    return level;
}
function sbPf2eAdjHp(level, adj) {
    if (adj > 0) return level <= 1 ? 10 : level <= 4 ? 15 : level <= 19 ? 20 : 30;
    if (adj < 0) return -(level <= 2 ? 10 : level <= 5 ? 15 : level <= 20 ? 20 : 30);
    return 0;
}

// The adjustment that brings a block to a level (0, 1, −1), or null when one step can't.
function sbPf2eReach(c, level) {
    return [0, 1, -1].find(a => sbPf2eAdjLevel(c.level, a) === level) ?? null;
}

const sbPf2ePick = list => list[Math.floor(rand() * list.length)];

// npc: from rollNPC. force (optional): { cls: an NPC Core id, level }, either one. Call inside
// withSeed so the same seed gives the same block. The pick and the adjustment always draw.
function rollStatBlock(npc, force = null) {
    const race = SB_PF2E_ANCESTRY[npc.race] ? npc.race : 'human';
    const fits = ids => (ids || []).filter(id => SB_PF2E_NPCS[id] && sbPf2eFits(SB_PF2E_NPCS[id], race));
    const pool = fits(SB_PF2E_POOLS[npc.profession]).length ? fits(SB_PF2E_POOLS[npc.profession])
        : fits(SB_PF2E_POOLS[npc.professionCategory]).length ? fits(SB_PF2E_POOLS[npc.professionCategory]) : fits(SB_PF2E_POOLS.adventurer);
    const rolled = sbPf2ePick(pool);
    const r = rand();
    const ageAdj = { young: -1, old: 1, ancient: 1 }[npc.ageBucket] || 0;
    let adj = r < 0.15 ? -1 : r > 0.85 ? 1 : r < 0.3 && ageAdj ? ageAdj : 0;
    const level = force && Number.isInteger(force.level) && force.level >= -1 && force.level <= 25 ? force.level : null;
    let id = force && SB_PF2E_NPCS[force.cls] ? force.cls : rolled;
    if (level !== null && !(force && SB_PF2E_NPCS[force.cls])) {
        // The job's people who reach the level (as they are first), then the category's, then anyone's.
        const all = Object.keys(SB_PF2E_NPCS);
        const reach = ids => ids.filter(i => sbPf2eReach(SB_PF2E_NPCS[i], level) !== null);
        const exact = ids => ids.filter(i => SB_PF2E_NPCS[i].level === level);
        const tries = [pool, fits(SB_PF2E_POOLS[npc.professionCategory]), fits(all)];
        const found = tries.map(t => exact(t).length ? exact(t) : reach(t)).find(t => t.length);
        if (found) id = found.includes(rolled) ? rolled : sbPf2ePick(found);
        else id = all.reduce((best, i) => Math.abs(SB_PF2E_NPCS[i].level - level) < Math.abs(SB_PF2E_NPCS[best].level - level) ? i : best, rolled);
    }
    const c = SB_PF2E_NPCS[id];
    if (level !== null) {
        const a = sbPf2eReach(c, level);
        adj = a !== null ? a : level > c.level ? 1 : sbPf2eAdjLevel(c.level, -1) !== null ? -1 : 0;
    } else if (id !== rolled || (adj < 0 && sbPf2eAdjLevel(c.level, -1) === null)) adj = 0;
    return { pf2e: true, cls: id, id, level: sbPf2eAdjLevel(c.level, adj), adj, race,
        title: `${adj > 0 ? 'Elite ' : adj < 0 ? 'Weak ' : ''}${c.name}` };
}

// A lock's [id, level] from a link.
function sbLockOk([id, level]) {
    return Object.hasOwn(SB_PF2E_NPCS, id) && /^-?\d+$/.test(level) && +level >= -1 && +level <= 25;
}

// ==================== NUMBERS ====================

// Every signed number in a line ("Athletics +7, Stealth +5 (+7 in forests)") moved by d.
function sbPf2eShift(text, d) {
    return text ? text.replace(/([+−-])(\d+)/g, (_, s, n) => sbSigned((s === '+' ? 1 : -1) * +n + d)) : text;
}

// "1d6+3 bludgeoning" with d more damage.
function sbPf2eDamage(dmg, d) {
    const m = dmg.match(/^(\d+d\d+)(?:([+−-])(\d+))?(.*)$/);
    if (!m) return dmg;
    const mod = (m[3] ? (m[2] === '+' ? 1 : -1) * +m[3] : 0) + d;
    return `${m[1]}${mod ? (mod > 0 ? '+' : '−') + Math.abs(mod) : ''}${m[4]}`;
}

// The creature row and block text for an NPC's block, adjusted and moved to its ancestry.
// Needs pf2e-creature-blocks.js (loadMonsterBlocks); without it the block text is null.
function sbPf2eNpcParts(block) {
    const c = SB_PF2E_NPCS[block.id];
    if (!c) return null;
    const d = 2 * block.adj;
    const base = typeof PF2E_BLOCKS !== 'undefined' ? PF2E_BLOCKS[block.id] : null;
    const anc = SB_PF2E_ANCESTRY[block.race] || SB_PF2E_ANCESTRY.human;
    const own = c.traits.filter(t => SB_PF2E_ANCESTRY_TRAITS.includes(t));
    const swap = own.length === 1 && own[0] === 'human' && block.race !== 'human' && SB_PF2E_ANCESTRY[block.race];
    const m = { ...c, level: block.level, ac: c.ac + d, fort: c.fort + d, ref: c.ref + d, will: c.will + d, per: c.per + d,
        hp: c.hp + sbPf2eAdjHp(c.level, block.adj) };
    if (swap) {
        const i = m.traits.indexOf('human');
        m.traits = [...m.traits.slice(0, i), ...anc.traits, ...m.traits.slice(i + 1)];
        if (anc.size && m.size === 'M') m.size = anc.size;
    }
    if (!base) return { m, b: null, swap };
    const dc = list => (list || []).map(([name, cost, traits, text]) => [name, cost, traits, d ? text.replace(/DC (\d+)/g, (_, n) => `DC ${+n + d}`) : text]);
    const b = { ...base, pd: sbPf2eShift(base.pd, d), sk: sbPf2eShift(base.sk, d), ia: dc(base.ia), da: dc(base.da), oa: dc(base.oa),
        st: (base.st || []).map(([ranged, name, bonus, traits, dmg]) => [ranged, name, bonus + d, traits, sbPf2eDamage(dmg, d)]),
        sc: (base.sc || []).map(([name, sdc, atk, note, ranks]) => [name, sdc + d, atk ? atk + d : atk, note, ranks]) };
    if (swap) {
        if (anc.speed && /^25 feet/.test(b.sp || '')) b.sp = b.sp.replace(/^25 feet/, `${anc.speed} feet`);
        if (anc.sense && !/darkvision/.test(b.sn || '') && !(b.sn || '').includes(anc.sense)) {
            b.sn = anc.sense === 'darkvision' && /low-light vision/.test(b.sn || '') ? b.sn.replace('low-light vision', 'darkvision')
                : [b.sn, anc.sense].filter(Boolean).join(', ');
        }
        if (anc.lang && !(b.la || '').includes(anc.lang)) b.la = [b.la, anc.lang].filter(Boolean).join(', ');
    }
    return { m, b, swap };
}

// What changed from NPC Core's block, in a line or two.
function sbPf2eNpcNote(block, swap) {
    const c = SB_PF2E_NPCS[block.id];
    const out = [];
    if (block.adj) out.push(`${block.adj > 0 ? 'Elite' : 'Weak'} (GM Core): NPC Core's level ${c.level} ${c.name.toLowerCase()} with ${block.adj > 0 ? '+2' : '−2'} to AC, attacks, DCs, saves, Perception, skills, and Strike damage, and ${block.adj > 0 ? 'more' : 'fewer'} HP, all worked in. Damage from its other abilities and spells takes ${block.adj > 0 ? '+2' : '−2'} more (${block.adj > 0 ? '+4' : '−4'} for one it can't use at will).`);
    if (swap) out.push(`Ancestry: NPC Core's block is human; the Gazette moved it to ${ruleWord('race', block.race)} (traits, size, Speed, senses, and a language).`);
    return out;
}

// ==================== PAGE ====================

// Plain text for clipboard copies.
function statBlockText(block) {
    const p = block && block.pf2e && sbPf2eNpcParts(block);
    if (!p || !p.b) return '';
    return [sbPf2eText({ ...p.m, name: block.title }, p.b), ...sbPf2eNpcNote(block, p.swap)].join('\n');
}

// The stat block card on the NPC page; draws again once the block text has loaded.
function renderPf2eStatBlock(npc) {
    const box = document.getElementById('stats-section');
    box.querySelector('.stats-grid').hidden = true;
    document.getElementById('npc-combat-legacy').hidden = true;
    document.getElementById('sb-core').innerHTML = '';
    // Saved on this page before its blocks were Pathfinder's: roll one from the same seed.
    if (!(npc.block && npc.block.pf2e) && npc.seeds && npc.seeds.stats) {
        npc.block = withSeed(deriveSeed(npc.seeds.stats, 'block'), () => rollStatBlock(npc));
    }
    const block = npc.block;
    const p = block && block.pf2e && sbPf2eNpcParts(block);
    document.getElementById('sb-head').hidden = !p;
    const body = document.getElementById('sb-body');
    if (!p) { body.innerHTML = '<p class="sb-note">Reroll for a Pathfinder stat block.</p>'; return; }
    document.getElementById('sb-title').textContent = block.title;
    document.getElementById('sb-type').textContent = `From NPC Core${block.adj ? `, ${block.adj > 0 ? 'elite' : 'weak'}` : ''}`;
    if (!p.b) {
        body.innerHTML = '<p class="sb-note">Loading the stat block…</p>';
        loadMonsterBlocks().then(() => { if (currentNPC === npc) renderPf2eStatBlock(npc); })
            .catch(() => { body.innerHTML = '<p class="sb-note">The stat block didn’t load. Check your connection and reroll.</p>'; });
        return;
    }
    body.innerHTML = `<div class="sb-pf2e">${sbPf2eHtml(p.m, p.b)}</div>
        ${sbPf2eNpcNote(block, p.swap).map(t => `<p class="sb-note">${esc(t)}</p>`).join('')}`;
}

// The cast sheet's short block: defenses, Strikes, and spells.
function sheetPf2eStatBlock(block) {
    const p = block && block.pf2e && sbPf2eNpcParts(block);
    if (!p) return '';
    const { m, b } = p;
    const line = (label, value) => value ? `<p><strong>${label}:</strong> ${esc(value)}</p>` : '';
    return `<div class="sheet-sb">
            <p><strong>${esc(block.title)}</strong> (Creature ${String(m.level).replace('-', '−')})</p>
            <div class="sheet-stats">
                <span><strong>AC</strong> ${m.ac}</span><span><strong>HP</strong> ${m.hp}</span><span><strong>Fort</strong> ${sbSigned(m.fort)}</span>
                <span><strong>Ref</strong> ${sbSigned(m.ref)}</span><span><strong>Will</strong> ${sbSigned(m.will)}</span><span><strong>Perc</strong> ${sbSigned(m.per)}</span>
            </div>
            ${b ? line('Speed', b.sp) + line('Skills', b.sk) : ''}
            ${b ? (b.st || []).map(sbPf2eStrike).map(s => `<p><strong>${s.kind}</strong> ${esc(s.text)}, ${esc(s.dmg)}</p>`).join('') : ''}
            ${b ? (b.sc || []).map(sbPf2eSpells).map(s => line(s.name, `${s.head}; ${s.ranks.map(([r, l]) => `${r} ${l}`).join('; ')}`)).join('') : ''}
        </div>`;
}

// The pickers: NPC Core's people for the class picker, and levels −1 and 0.
document.addEventListener('DOMContentLoaded', () => {
    const cls = document.getElementById('npc-class');
    cls.previousElementSibling.textContent = '📊 Stat Block';
    cls.innerHTML = '<option value="random">🎲 Random (fits the job)</option>' + Object.values(SB_PF2E_NPCS)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `<option value="${c.id}">${esc(c.name)} (${String(c.level).replace('-', '−')})</option>`).join('');
    const lvl = document.getElementById('npc-level');
    lvl.options[0].insertAdjacentHTML('afterend', '<option value="-1">Level −1</option><option value="0">Level 0</option>');
});
