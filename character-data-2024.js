/* ============================================================
   CHARACTER DATA, 2024 RULES (ROADMAP L1T T5): the SRD 5.2.1 player options for the
   Character Builder, beside character-data.js's SRD 5.1 set. A character carries
   rules: '2014' | '2024' (stamped when it's made); character-engine.js reads this file's
   lists for a 2024 character and character-data.js's for the rest.
   Same shapes as character-data.js where the rules line up: species are races (lineages and
   ancestries are subraces), classes keep features [level, name, summary]. New here:
   backgrounds give three ability scores, a feat, two skills, and a tool; every class has a
   prepared-spells table (cast.prepared) and a weapon mastery count (mastery); starting gear
   is a kit (or kits) plus gold, or gold alone.
   Feature text is a short original summary written for this site, never the SRD's own wording;
   a summary that scales takes x = { L, prof, m, dc, ... } (see cbDerive).
   This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1")
   by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1
   is licensed under the Creative Commons Attribution 4.0 International License,
   available at https://creativecommons.org/licenses/by/4.0/legalcode.
   ============================================================ */

// Common plus two of these at 1st level (any language here for the rogue's and ranger's extras).
const CB24_LANGUAGES = ['Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
    'Abyssal', 'Celestial', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];

// ── Species ──────────────────────────────────────────────
// No ability score increases (backgrounds give them now). subraces: lineages, legacies, and giant
// ancestries; spells: [character level, spell] they bring (castAbil: the player picks INT, WIS, or CHA).
// choose: skill: n skills (skillFrom limits them) · feat: an Origin feat · ancestry: a dragon kind · size
const CB24_SPECIES = [
    {
        id: 'dragonborn', name: 'Dragonborn', icon: '🐉', size: 'Medium', speed: 30, dark: 60, choose: { ancestry: true },
        traits: [
            ['Draconic Ancestry', x => `${x.breath.kind || 'Your dragon kind'} sets your breath and resistance (${x.breath.dmg}).`],
            ['Breath Weapon', x => `Replace one attack: a 15 ft. cone or 30 ft. line of ${x.breath.dice} ${x.breath.dmg}, DC ${x.dc('con')} DEX save for half. ${x.prof} uses per long rest.`],
            ['Damage Resistance', x => `Resistance to ${x.breath.dmg} damage.`],
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim.'],
            ['Draconic Flight', x => x.L >= 5 ? 'Bonus action, once per long rest: spectral wings give you a flying speed equal to your speed for 10 minutes.' : 'At level 5: spectral wings for a 10-minute flying speed, once per long rest.']
        ]
    },
    {
        id: 'dwarf', name: 'Dwarf', icon: '🧔', size: 'Medium', speed: 30, dark: 120, hpPerLevel: 1,
        traits: [
            ['Darkvision', 'See in dim light within 120 ft. as if bright, and in darkness as if dim.'],
            ['Dwarven Resilience', 'Resistance to poison damage; advantage on saves to avoid or end poisoned.'],
            ['Dwarven Toughness', '+1 hit point maximum per level.'],
            ['Stonecunning', x => `Bonus action: tremorsense 60 ft. for 10 minutes while on or touching stone. ${x.prof} uses per long rest.`]
        ]
    },
    {
        id: 'elf', name: 'Elf', icon: '🧝', size: 'Medium', speed: 30, dark: 60, castAbil: true,
        choose: { skill: 1, skillFrom: ['insight', 'perception', 'survival'] },
        traits: [
            ['Darkvision', x => `See in dim light within ${x.dark} ft. as if bright, and in darkness as if dim.`],
            ['Fey Ancestry', 'Advantage on saves to avoid or end charmed.'],
            ['Keen Senses', 'Proficient in Insight, Perception, or Survival (your pick).'],
            ['Trance', 'You don\'t need sleep, magic can\'t make you sleep, and 4 hours of trance is a long rest.']
        ],
        subraces: [
            { id: 'drow', name: 'Drow', dark: 120, spells: [[1, 'Dancing Lights'], [3, 'Faerie Fire'], [5, 'Darkness']],
                traits: [['Drow Lineage', 'Darkvision 120 ft. and the dancing lights cantrip; faerie fire at level 3 and darkness at 5, each once per long rest without a slot.']] },
            { id: 'high-elf', name: 'High Elf', spells: [[1, 'Prestidigitation'], [3, 'Detect Magic'], [5, 'Misty Step']],
                traits: [['High Elf Lineage', 'The prestidigitation cantrip (swap it for another wizard cantrip after a long rest); detect magic at level 3 and misty step at 5, each once per long rest without a slot.']] },
            { id: 'wood-elf', name: 'Wood Elf', speed: 35, spells: [[1, 'Druidcraft'], [3, 'Longstrider'], [5, 'Pass without Trace']],
                traits: [['Wood Elf Lineage', 'Speed 35 ft. and the druidcraft cantrip; longstrider at level 3 and pass without trace at 5, each once per long rest without a slot.']] }
        ]
    },
    {
        id: 'gnome', name: 'Gnome', icon: '🎩', size: 'Small', speed: 30, dark: 60, castAbil: true,
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim.'],
            ['Gnomish Cunning', 'Advantage on Intelligence, Wisdom, and Charisma saves.']
        ],
        subraces: [
            { id: 'forest-gnome', name: 'Forest Gnome', spells: [[1, 'Minor Illusion'], [1, 'Speak with Animals']],
                traits: [['Forest Gnome Lineage', x => `The minor illusion cantrip; speak with animals is always prepared and cast ${x.prof} times per long rest without a slot.`]] },
            { id: 'rock-gnome', name: 'Rock Gnome', spells: [[1, 'Mending'], [1, 'Prestidigitation']],
                traits: [['Rock Gnome Lineage', 'The mending and prestidigitation cantrips; spend 10 minutes to build up to three tiny clockwork devices that each repeat one prestidigitation effect (8 hours each).']] }
        ]
    },
    {
        id: 'goliath', name: 'Goliath', icon: '🏔️', size: 'Medium', speed: 35, carryAs: 'Large',
        traits: [
            ['Large Form', x => x.L >= 5 ? 'Bonus action, once per long rest: become Large for 10 minutes, with advantage on STR checks and +10 ft. speed.' : 'At level 5: become Large for 10 minutes (advantage on STR checks, +10 ft. speed), once per long rest.'],
            ['Powerful Build', 'Advantage on checks to end grappled, and you carry as if one size larger.']
        ],
        subraces: [
            { id: 'cloud-giant', name: "Cloud's Jaunt", traits: [["Cloud's Jaunt", x => `Bonus action: teleport up to 30 ft. to a space you can see. ${x.prof} uses per long rest.`]] },
            { id: 'fire-giant', name: "Fire's Burn", traits: [["Fire's Burn", x => `When you hit with an attack roll, deal an extra 1d10 fire. ${x.prof} uses per long rest.`]] },
            { id: 'frost-giant', name: "Frost's Chill", traits: [["Frost's Chill", x => `When you hit with an attack roll, deal an extra 1d6 cold and cut its speed by 10 ft. until your next turn. ${x.prof} uses per long rest.`]] },
            { id: 'hill-giant', name: "Hill's Tumble", traits: [["Hill's Tumble", x => `When you hit a Large or smaller creature with an attack roll, knock it prone. ${x.prof} uses per long rest.`]] },
            { id: 'stone-giant', name: "Stone's Endurance", traits: [["Stone's Endurance", x => `Reaction when you take damage: reduce it by 1d12 ${cbPlus(x.m.con)}. ${x.prof} uses per long rest.`]] },
            { id: 'storm-giant', name: "Storm's Thunder", traits: [["Storm's Thunder", x => `Reaction when a creature within 60 ft. damages you: deal it 1d8 thunder. ${x.prof} uses per long rest.`]] }
        ]
    },
    {
        id: 'halfling', name: 'Halfling', icon: '🧑', size: 'Small', speed: 30,
        traits: [
            ['Brave', 'Advantage on saves to avoid or end frightened.'],
            ['Halfling Nimbleness', 'Move through the space of any creature a size larger than you (but don\'t stop there).'],
            ['Luck', 'Roll a 1 on a D20 Test and you can reroll it (you must use the new roll).'],
            ['Naturally Stealthy', 'You can Hide behind a creature at least one size larger than you.']
        ]
    },
    {
        id: 'human', name: 'Human', icon: '👤', size: 'Medium', sizes: ['Medium', 'Small'], speed: 30,
        choose: { skill: 1, feat: true },
        traits: [
            ['Resourceful', 'You gain Heroic Inspiration whenever you finish a long rest.'],
            ['Skillful', 'Proficient in one skill of your choice.'],
            ['Versatile', 'An Origin feat of your choice (Skilled suggested).']
        ]
    },
    {
        id: 'orc', name: 'Orc', icon: '👹', size: 'Medium', speed: 30, dark: 120,
        traits: [
            ['Adrenaline Rush', x => `Dash as a bonus action and gain ${x.prof} temporary hit points. ${x.prof} uses per short or long rest.`],
            ['Darkvision', 'See in dim light within 120 ft. as if bright, and in darkness as if dim.'],
            ['Relentless Endurance', 'Once per long rest, drop to 1 hit point instead of 0 (unless killed outright).']
        ]
    },
    {
        id: 'tiefling', name: 'Tiefling', icon: '😈', size: 'Medium', sizes: ['Medium', 'Small'], speed: 30, dark: 60, castAbil: true,
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim.'],
            ['Otherworldly Presence', 'The thaumaturgy cantrip, cast with your legacy\'s ability.']
        ],
        subraces: [
            { id: 'abyssal', name: 'Abyssal', resist: 'poison', spells: [[1, 'Thaumaturgy'], [1, 'Poison Spray'], [3, 'Ray of Sickness'], [5, 'Hold Person']],
                traits: [['Abyssal Legacy', 'Resistance to poison and the poison spray cantrip; ray of sickness at level 3 and hold person at 5, each once per long rest without a slot.']] },
            { id: 'chthonic', name: 'Chthonic', resist: 'necrotic', spells: [[1, 'Thaumaturgy'], [1, 'Chill Touch'], [3, 'False Life'], [5, 'Ray of Enfeeblement']],
                traits: [['Chthonic Legacy', 'Resistance to necrotic and the chill touch cantrip; false life at level 3 and ray of enfeeblement at 5, each once per long rest without a slot.']] },
            { id: 'infernal', name: 'Infernal', resist: 'fire', spells: [[1, 'Thaumaturgy'], [1, 'Fire Bolt'], [3, 'Hellish Rebuke'], [5, 'Darkness']],
                traits: [['Infernal Legacy', 'Resistance to fire and the fire bolt cantrip; hellish rebuke at level 3 and darkness at 5, each once per long rest without a slot.']] }
        ]
    }
];

// ── Backgrounds ──────────────────────────────────────────
// abil: the three scores it can raise (+2/+1 or +1/+1/+1). feat: its Origin feat (list: Magic
// Initiate's spell list). tool: a tool, or toolPick: 'gaming' | 'artisan'. kit: the A package (B is 50 gp).
const CB24_BACKGROUNDS = {
    acolyte: { name: 'Acolyte', icon: '🕯️', abil: ['int', 'wis', 'cha'], feat: 'magic-initiate', featList: 'cleric', skills: ['insight', 'religion'],
        tool: "Calligrapher's supplies", kit: ["g:Calligrapher's supplies", 'g:Book (prayers)', 'g:Holy symbol', 'g:Parchment (10 sheets)', 'g:Robe'], gold: 8 },
    criminal: { name: 'Criminal', icon: '🗝️', abil: ['dex', 'con', 'int'], feat: 'alert', skills: ['sleight-of-hand', 'stealth'],
        tool: "Thieves' tools", kit: ['w:dagger*2', "g:Thieves' tools", 'g:Crowbar', 'g:Pouch*2', "g:Traveler's clothes"], gold: 16 },
    sage: { name: 'Sage', icon: '📚', abil: ['con', 'int', 'wis'], feat: 'magic-initiate', featList: 'wizard', skills: ['arcana', 'history'],
        tool: "Calligrapher's supplies", kit: ['w:quarterstaff', "g:Calligrapher's supplies", 'g:Book (history)', 'g:Parchment (8 sheets)', 'g:Robe'], gold: 8 },
    soldier: { name: 'Soldier', icon: '🎖️', abil: ['str', 'dex', 'con'], feat: 'savage-attacker', skills: ['athletics', 'intimidation'],
        toolPick: 'gaming', kit: ['w:spear', 'w:shortbow', 'g:Arrows (20)', 'tool:bg', "g:Healer's kit", 'g:Quiver', "g:Traveler's clothes"], gold: 14 },
    // The player's own, as the 2024 rules allow: any three scores, any Origin feat, two skills, one tool, 50 gp.
    custom: { name: 'Custom background', icon: '✍️', abil: null, feat: null, skills: null, toolPick: 'any', kit: [], gold: 50 }
};

// ── Feats ────────────────────────────────────────────────
// cat: origin | general | style | boon. L: level needed. plus: abilities its +1 can go to
// ('any' = all six); max: the cap for that +1. repeat: can be taken more than once.
// opt: what else the feat asks for (see cbFeatTodo): spells (Magic Initiate), picks (Skilled).
const CB24_FEATS = {
    alert: { name: 'Alert', cat: 'origin', text: x => `Add your proficiency bonus (+${x.prof}) to initiative, and after rolling you can swap initiative with a willing ally.` },
    'magic-initiate': { name: 'Magic Initiate', cat: 'origin', repeat: true, opt: 'spells', text: 'Two cantrips and a 1st-level spell from the cleric, druid, or wizard list; the spell is always prepared and cast once per long rest without a slot.' },
    'savage-attacker': { name: 'Savage Attacker', cat: 'origin', text: 'Once a turn when you hit with a weapon, roll its damage dice twice and use either roll.' },
    skilled: { name: 'Skilled', cat: 'origin', repeat: true, opt: 'picks', text: 'Proficiency in any three skills or tools.' },
    asi: { name: 'Ability Score Improvement', cat: 'general', L: 4, repeat: true, text: '+2 to one score or +1 to two (20 at most).' },
    grappler: { name: 'Grappler', cat: 'general', L: 4, req: { any: { str: 13, dex: 13 } }, plus: ['str', 'dex'], max: 20, text: 'An unarmed strike in the Attack action can both damage and grapple (once a turn); advantage on attacks against creatures you grapple; moving them costs no extra.' },
    archery: { name: 'Archery', cat: 'style', text: '+2 to attack rolls with ranged weapons.' },
    defense: { name: 'Defense', cat: 'style', text: '+1 AC while wearing light, medium, or heavy armor.' },
    'great-weapon': { name: 'Great Weapon Fighting', cat: 'style', text: 'With a two-handed or versatile melee weapon held in two hands, treat 1s and 2s on damage dice as 3s.' },
    'two-weapon': { name: 'Two-Weapon Fighting', cat: 'style', text: 'Add your ability modifier to the damage of the extra attack from a light weapon.' },
    'boon-combat-prowess': { name: 'Boon of Combat Prowess', cat: 'boon', L: 19, plus: 'any', max: 30, text: 'When you miss with an attack roll, hit instead (once per turn).' },
    'boon-dimensional-travel': { name: 'Boon of Dimensional Travel', cat: 'boon', L: 19, plus: 'any', max: 30, text: 'Right after the Attack or Magic action, teleport up to 30 ft.' },
    'boon-fate': { name: 'Boon of Fate', cat: 'boon', L: 19, plus: 'any', max: 30, text: 'When a creature within 60 ft. passes or fails a D20 Test, add or subtract 2d4 (again after initiative or a rest).' },
    'boon-irresistible-offense': { name: 'Boon of Irresistible Offense', cat: 'boon', L: 19, plus: ['str', 'dex'], max: 30, text: 'Your bludgeoning, piercing, and slashing ignore resistance; a natural 20 adds damage equal to the score this feat raised.' },
    'boon-spell-recall': { name: 'Boon of Spell Recall', cat: 'boon', L: 19, caster: true, plus: ['int', 'wis', 'cha'], max: 30, text: 'Cast with a 1st- to 4th-level slot and roll 1d4: on the slot\'s level, the slot isn\'t spent.' },
    'boon-night-spirit': { name: 'Boon of the Night Spirit', cat: 'boon', L: 19, plus: 'any', max: 30, text: 'In dim light or darkness: turn invisible as a bonus action (until you act), and resist all damage but psychic and radiant.' },
    'boon-truesight': { name: 'Boon of Truesight', cat: 'boon', L: 19, plus: 'any', max: 30, text: 'Truesight 60 ft.' }
};
const CB24_FEAT_CATS = { origin: 'Origin', general: 'General', style: 'Fighting Style', boon: 'Epic Boon' };
// The Epic Boon each class's 19th-level feature suggests (quick build takes it).
const CB24_BOON_FOR = { barbarian: 'boon-irresistible-offense', bard: 'boon-spell-recall', cleric: 'boon-fate', druid: 'boon-dimensional-travel',
    fighter: 'boon-combat-prowess', monk: 'boon-irresistible-offense', paladin: 'boon-truesight', ranger: 'boon-dimensional-travel',
    rogue: 'boon-night-spirit', sorcerer: 'boon-dimensional-travel', warlock: 'boon-fate', wizard: 'boon-spell-recall' };
const CB24_MAGIC_LISTS = { cleric: 'Cleric', druid: 'Druid', wizard: 'Wizard' };

// ── Weapons (2024 changes) and weapon mastery ────────────
// The SRD 5.2 weapon table matches 5.1's but for these, and every weapon has a mastery property.
const CB24_WEAPON_FIX = {
    lance: { dmg: '1d10', props: ['h', 'r', '2'] },
    trident: { dmg: '1d8', vers: '1d10' },
    'war-pick': { vers: '1d10', props: ['v'] }
};
const CB24_MASTERY = {
    club: 'slow', dagger: 'nick', greatclub: 'push', handaxe: 'vex', javelin: 'slow', 'light-hammer': 'nick', mace: 'sap',
    quarterstaff: 'topple', sickle: 'nick', spear: 'sap', 'light-crossbow': 'slow', dart: 'vex', shortbow: 'vex', sling: 'slow',
    battleaxe: 'topple', flail: 'sap', glaive: 'graze', greataxe: 'cleave', greatsword: 'graze', halberd: 'cleave', lance: 'topple',
    longsword: 'sap', maul: 'topple', morningstar: 'sap', pike: 'push', rapier: 'vex', scimitar: 'nick', shortsword: 'vex',
    trident: 'topple', 'war-pick': 'sap', warhammer: 'push', whip: 'slow', blowgun: 'vex', 'hand-crossbow': 'vex',
    'heavy-crossbow': 'push', longbow: 'slow'
};
const CB24_MASTERY_TEXT = {
    cleave: ['Cleave', 'Hit with a melee attack: once a turn, attack a second creature within 5 ft. of it (no ability modifier to damage).'],
    graze: ['Graze', 'Miss: deal damage equal to the attack\'s ability modifier anyway.'],
    nick: ['Nick', 'Make the light weapon\'s extra attack as part of the Attack action (once a turn).'],
    push: ['Push', 'Hit: push a Large or smaller creature 10 ft. away.'],
    sap: ['Sap', 'Hit: the target has disadvantage on its next attack roll before your next turn.'],
    slow: ['Slow', 'Hit and deal damage: its speed drops 10 ft. until your next turn.'],
    topple: ['Topple', 'Hit: the target makes a CON save (DC 8 + your attack modifier\'s ability + proficiency) or falls prone.'],
    vex: ['Vex', 'Hit and deal damage: advantage on your next attack against it before your next turn ends.']
};

// ── Class choice lists ───────────────────────────────────
const CB24_ORDERS = {
    cleric: { protector: ['Protector', 'Martial weapons and heavy armor.'], thaumaturge: ['Thaumaturge', 'One more cleric cantrip, and add your WIS modifier (at least +1) to Arcana and Religion checks.'] },
    druid: { magician: ['Magician', 'One more druid cantrip, and add your WIS modifier (at least +1) to Arcana and Nature checks.'], warden: ['Warden', 'Martial weapons and medium armor.'] }
};
const CB24_STRIKES = {
    cleric: { 'divine-strike': ['Divine Strike', 'Once a turn, a weapon hit deals an extra 1d8 necrotic or radiant (2d8 at level 14).'],
        potent: ['Potent Spellcasting', 'Add your WIS modifier to cleric cantrip damage; at level 14, a damaging cantrip also gives someone within 60 ft. temporary hit points (twice your WIS modifier).'] },
    druid: { potent: ['Potent Spellcasting', 'Add your WIS modifier to druid cantrip damage; at level 15, cantrips with a 10 ft.+ range reach 300 ft. farther.'],
        'primal-strike': ['Primal Strike', 'Once a turn, a weapon or Wild Shape hit deals an extra 1d8 cold, fire, lightning, or thunder (2d8 at level 15).'] }
};
const CB24_STYLE_EXTRA = {
    paladin: { 'blessed-warrior': ['Blessed Warrior', 'Two cleric cantrips, cast with CHA (pick them on the Spells step).'] },
    ranger: { 'druidic-warrior': ['Druidic Warrior', 'Two druid cantrips, cast with WIS (pick them on the Spells step).'] }
};
const CB24_HUNTER = {
    3: { label: "Hunter's Prey", opts: { 'colossus-slayer': ['Colossus Slayer', 'Once a turn, a weapon hit deals an extra 1d8 to a creature missing any hit points.'], 'horde-breaker': ['Horde Breaker', 'Once a turn, attack another creature within 5 ft. of your target with the same weapon.'] } },
    7: { label: 'Defensive Tactics', opts: { 'escape-the-horde': ['Escape the Horde', 'Opportunity attacks against you have disadvantage.'], 'multiattack-defense': ['Multiattack Defense', 'A creature that hits you has disadvantage on its other attacks against you this turn.'] } }
};
const CB24_AFFINITY = ['acid', 'cold', 'fire', 'lightning', 'poison'];
const CB24_METAMAGIC = {
    careful: ['Careful Spell', `1 point: up to your CHA modifier creatures pass the spell's save and take no damage on a success.`],
    distant: ['Distant Spell', '1 point: double the range, or touch becomes 30 ft.'],
    empowered: ['Empowered Spell', '1 point: reroll up to your CHA modifier damage dice (works with another option).'],
    extended: ['Extended Spell', '1 point: double a duration of 1 minute or more (max 24 hours); advantage on its concentration saves.'],
    heightened: ['Heightened Spell', '2 points: one target has disadvantage on saves against the spell.'],
    quickened: ['Quickened Spell', '2 points: an action spell becomes a bonus action (no other 1st-level+ spell that turn).'],
    seeking: ['Seeking Spell', '1 point: reroll a missed spell attack (works with another option).'],
    subtle: ['Subtle Spell', '1 point: no verbal, somatic, or ordinary material components.'],
    transmuted: ['Transmuted Spell', '1 point: swap acid, cold, fire, lightning, poison, or thunder damage for another of them.'],
    twinned: ['Twinned Spell', '1 point: a spell that can target one more creature with a higher slot counts as one level higher.']
};

// [name, summary, prereq { L, inv (another invocation), cantrip ('damage' | 'attack') }]
const CB24_INVOCATIONS = {
    'pact-of-the-blade': ['Pact of the Blade', 'Bonus action: conjure or bond a melee weapon; you are proficient with it, it is a focus, and you can attack with CHA and deal necrotic, psychic, or radiant.'],
    'pact-of-the-chain': ['Pact of the Chain', 'Find familiar as a Magic action with no slot (imp, pseudodragon, quasit, skeleton, sphinx of wonder, sprite, or venomous snake forms); give up an attack to let it attack.'],
    'pact-of-the-tome': ['Pact of the Tome', 'A Book of Shadows after each rest: three cantrips and two 1st-level rituals from any class, prepared while you carry it.'],
    'agonizing-blast': ['Agonizing Blast', 'Add your CHA modifier to a damaging warlock cantrip\'s damage.', { L: 2, cantrip: 'damage' }],
    'armor-of-shadows': ['Armor of Shadows', 'Cast mage armor on yourself without a slot.'],
    'ascendant-step': ['Ascendant Step', 'Cast levitate on yourself without a slot.', { L: 5 }],
    'devils-sight': ["Devil's Sight", 'See normally in dim light and darkness, magical or not, to 120 ft.', { L: 2 }],
    'devouring-blade': ['Devouring Blade', 'Thirsting Blade gives two extra attacks instead of one.', { L: 12, inv: 'thirsting-blade' }],
    'eldritch-mind': ['Eldritch Mind', 'Advantage on CON saves to keep concentration.'],
    'eldritch-smite': ['Eldritch Smite', 'Once a turn on a pact weapon hit, spend a pact slot: +1d8 force plus 1d8 per slot level, and knock a Huge or smaller target prone.', { L: 5, inv: 'pact-of-the-blade' }],
    'eldritch-spear': ['Eldritch Spear', 'A damaging warlock cantrip with a 10 ft.+ range reaches 30 ft. farther per warlock level.', { L: 2, cantrip: 'damage' }],
    'fiendish-vigor': ['Fiendish Vigor', 'Cast false life on yourself without a slot, taking the highest roll.', { L: 2 }],
    'gaze-of-two-minds': ['Gaze of Two Minds', 'Bonus action: perceive through a willing creature\'s senses (and cast from its space within 60 ft.).', { L: 5 }],
    'gift-of-the-depths': ['Gift of the Depths', 'Breathe underwater and swim at your speed; water breathing once per long rest without a slot.', { L: 5 }],
    'gift-of-the-protectors': ['Gift of the Protectors', 'Names written in your Book of Shadows (up to your CHA modifier) drop to 1 hit point instead of 0, once per long rest.', { L: 9, inv: 'pact-of-the-tome' }],
    'investment-of-the-chain-master': ['Investment of the Chain Master', 'Your familiar gets a 40 ft. fly or swim speed, attacks as your bonus action, can deal necrotic or radiant, uses your save DC, and you can give it resistance.', { L: 5, inv: 'pact-of-the-chain' }],
    'lessons-of-the-first-ones': ['Lessons of the First Ones', 'An Origin feat of your choice (note it in your sheet\'s notes).', { L: 2 }],
    lifedrinker: ['Lifedrinker', 'Once a turn on a pact weapon hit, +1d6 necrotic, psychic, or radiant, and you can spend a hit die to heal.', { L: 9, inv: 'pact-of-the-blade' }],
    'mask-of-many-faces': ['Mask of Many Faces', 'Cast disguise self without a slot.', { L: 2 }],
    'master-of-myriad-forms': ['Master of Myriad Forms', 'Cast alter self without a slot.', { L: 5 }],
    'misty-visions': ['Misty Visions', 'Cast silent image without a slot.', { L: 2 }],
    'one-with-shadows': ['One with Shadows', 'In dim light or darkness, cast invisibility on yourself without a slot.', { L: 5 }],
    'otherworldly-leap': ['Otherworldly Leap', 'Cast jump on yourself without a slot.', { L: 2 }],
    'repelling-blast': ['Repelling Blast', 'A warlock attack cantrip pushes a Large or smaller creature 10 ft. away on a hit.', { L: 2, cantrip: 'attack' }],
    'thirsting-blade': ['Thirsting Blade', 'Attack twice with your pact weapon when you take the Attack action.', { L: 5, inv: 'pact-of-the-blade' }],
    'visions-of-distant-realms': ['Visions of Distant Realms', 'Cast arcane eye without a slot.', { L: 9 }],
    'whispers-of-the-grave': ['Whispers of the Grave', 'Cast speak with dead without a slot.', { L: 7 }],
    'witch-sight': ['Witch Sight', 'Truesight 30 ft.', { L: 15 }]
};
const CB24_INVOCATIONS_KNOWN = [1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10];
// Warlock cantrips that deal damage, and those that make an attack roll (invocation prerequisites).
const CB24_WARLOCK_DAMAGE = ['Chill Touch', 'Eldritch Blast', 'Poison Spray'];
const CB24_WARLOCK_ATTACK = ['Chill Touch', 'Eldritch Blast'];

// Circle of the Land, 2024: the land picked after each long rest (cantrips included), and Nature's Ward.
const CB24_LANDS = {
    Arid: { ward: 'fire', spells: { 3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone'] } },
    Polar: { ward: 'cold', spells: { 3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold'] } },
    Temperate: { ward: 'lightning', spells: { 3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride'] } },
    Tropical: { ward: 'poison', spells: { 3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague'] } }
};

// Spells a class feature always has prepared: [class level, spell].
const CB24_FEATURE_SPELLS = {
    druid: [[1, 'Speak with Animals']], paladin: [[2, 'Divine Smite'], [5, 'Find Steed']], ranger: [[1, "Hunter's Mark"]],
    warlock: [[9, 'Contact Other Plane']], bard: [[20, 'Power Word Heal'], [20, 'Power Word Kill']]
};

// Weights for gear the 2024 kits add (pounds; character-data.js's CB_WEIGHTS has the rest).
Object.assign(CB_WEIGHTS, { Quiver: 1, Robe: 4, 'Book (prayers)': 5, 'Book (history)': 5, 'Book (occult lore)': 5, 'Arcane focus (orb)': 3,
    'Parchment (10 sheets)': 0, 'Parchment (8 sheets)': 0, Pouch: 1, "Traveler's clothes": 4 });

// ── Classes ──────────────────────────────────────────────
// kit: the A gear (kitGold coins with it), or kits: [{ label, gear, gold }] when there are two; gold:
// the all-gold option. Kit tokens are character-data.js's, plus tool:class (the class's chosen tool)
// and tool:bg (the background's). cast.prepared: spells prepared by level (a wizard's from the book).
// mastery: weapons with usable mastery, by level. Every class takes its subclass at level 3.
const CB24_CLASSES = [
    {
        id: 'barbarian', name: 'Barbarian', icon: '🪓', hd: 12, primary: ['str', 'con'], saves: ['str', 'con'],
        armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 2, from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
        kit: ['w:greataxe', 'w:handaxe*4', "pack:Explorer's pack"], kitGold: 15, gold: 75,
        mastery: cbByLevel([[1, 2], [4, 3], [10, 4]]), masteryKind: 'melee',
        sub: { id: 'berserker', name: 'Path of the Berserker', at: 3, kind: 'Barbarian Subclass' },
        features: [
            [1, 'Rage', x => `Bonus action, not in heavy armor: ${x.rages} per long rest (one back on a short rest). Resistance to bludgeoning, piercing, and slashing; +${x.rageDmg} damage on STR attacks; advantage on STR checks and saves; no spells or concentration. Lasts to the end of your next turn${x.L >= 15 ? ', and now a full 10 minutes without extending it' : ', extended by attacking, forcing a save, or a bonus action (up to 10 minutes)'}.`],
            [1, 'Unarmored Defense', 'With no armor, your AC is 10 + DEX + CON (a shield still counts).'],
            [1, 'Weapon Mastery', x => `Use the mastery properties of ${x.mastery} kinds of melee weapons; swap one after a long rest.`],
            [2, 'Danger Sense', 'Advantage on DEX saves unless you are incapacitated.'],
            [2, 'Reckless Attack', 'On your first attack of a turn, take advantage on STR attacks until your next turn; attacks against you have advantage too.'],
            [3, 'Primal Knowledge', 'One more barbarian skill. While raging, Acrobatics, Intimidation, Perception, Stealth, and Survival checks can use STR.'],
            [3, 'Frenzy', x => `Reckless while raging: the first target you hit with a STR attack each turn takes an extra ${x.rageDmg}d6.`],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [5, 'Fast Movement', '+10 ft. speed while not wearing heavy armor.'],
            [6, 'Mindless Rage', 'Immune to charmed and frightened while raging; entering a rage ends them.'],
            [7, 'Feral Instinct', 'Advantage on initiative rolls.'],
            [7, 'Instinctive Pounce', 'Move up to half your speed as part of the bonus action that starts your rage.'],
            [9, 'Brutal Strike', x => `Reckless: give up advantage on one STR attack; on a hit it deals +${x.L >= 17 ? 2 : 1}d10 and ${x.L >= 17 ? 'two effects' : 'one effect'}: Forceful Blow (push 15 ft., follow half your speed) or Hamstring Blow (−15 ft. speed)${x.L >= 13 ? ', Staggering Blow (disadvantage on its next save, no opportunity attacks), or Sundering Blow (+5 to the next attack against it)' : ''}.`],
            [10, 'Retaliation', 'Reaction: when a creature within 5 ft. damages you, make a melee attack against it.'],
            [11, 'Relentless Rage', x => `Drop to 0 while raging: a DC 10 CON save sets your hit points to ${2 * x.L} instead (DC +5 each use, back to 10 after a rest).`],
            [14, 'Intimidating Presence', x => `Bonus action: creatures of your choice within 30 ft. make a DC ${x.dc('str')} WIS save or are frightened for 1 minute (save each turn). Once per long rest, or spend a rage to use it again.`],
            [15, 'Persistent Rage', 'Once per long rest, regain all rages when you roll initiative; your rage lasts 10 minutes and only ends if you fall unconscious or don heavy armor.'],
            [18, 'Indomitable Might', 'A STR check or save that totals less than your Strength score uses your score instead.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Irresistible Offense suggested): see Abilities.'],
            [20, 'Primal Champion', 'Strength and Constitution +4 each, to a maximum of 25.']
        ]
    },
    {
        id: 'bard', name: 'Bard', icon: '🪕', hd: 8, primary: ['cha', 'dex'], saves: ['dex', 'cha'],
        armor: ['light'], weapons: ['simple'], toolPick: { n: 3, from: 'instrument' },
        skills: { n: 3, from: 'any' },
        kit: ['a:leather', 'w:dagger*2', 'pick:instrument', "pack:Entertainer's pack"], kitGold: 19, gold: 90,
        sub: { id: 'lore', name: 'College of Lore', at: 3, kind: 'Bard Subclass' },
        cast: { ability: 'cha', type: 'prepared', prog: 'full', cantrips: cbByLevel([[1, 2], [4, 3], [10, 4]]),
            prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22], focus: 'a musical instrument' },
        features: [
            [1, 'Bardic Inspiration', x => `Bonus action: give a creature within 60 ft. a d${x.L >= 15 ? 12 : x.L >= 10 ? 10 : x.L >= 5 ? 8 : 6} to add to one failed D20 Test within the hour. ${Math.max(1, x.m.cha)} uses per ${x.L >= 5 ? 'short or long' : 'long'} rest.`],
            [1, 'Spellcasting', x => `Charisma spells from the bard list; ${x.prepared} prepared, and you can swap one each time you gain a level.`],
            [2, 'Expertise', x => `Expertise in ${x.L >= 9 ? 'four' : 'two'} of your skills.`],
            [2, 'Jack of All Trades', x => `Add +${Math.floor(x.prof / 2)} to skill checks you aren't proficient in.`],
            [3, 'Bonus Proficiencies', 'Three more skills of your choice.'],
            [3, 'Cutting Words', 'Reaction: spend an inspiration die and subtract it from a creature\'s damage roll, or from a check or attack that would succeed.'],
            [5, 'Font of Inspiration', 'Bardic Inspiration comes back on a short or long rest, and you can spend a spell slot to regain a use.'],
            [6, 'Magical Discoveries', 'Two spells (or cantrips) from the cleric, druid, or wizard lists, always prepared.'],
            [7, 'Countercharm', 'Reaction: when you or a creature within 30 ft. fails a save against charmed or frightened, reroll it with advantage.'],
            [10, 'Magical Secrets', 'New prepared spells may come from the bard, cleric, druid, or wizard lists.'],
            [14, 'Peerless Skill', 'Fail a check or attack: spend an inspiration die and add it; the die isn\'t used up if you still fail.'],
            [18, 'Superior Inspiration', 'When you roll initiative, regain Bardic Inspiration until you have two.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Spell Recall suggested): see Abilities.'],
            [20, 'Words of Creation', 'Power word heal and power word kill are always prepared, and each can hit a second creature within 10 ft. of the first.']
        ]
    },
    {
        id: 'cleric', name: 'Cleric', icon: '✨', hd: 8, primary: ['wis', 'con'], saves: ['wis', 'cha'],
        armor: ['light', 'medium', 'shield'], weapons: ['simple'],
        skills: { n: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
        kit: ['a:chain-shirt', 'g:Shield', 'w:mace', 'g:Holy symbol', "pack:Priest's pack"], kitGold: 7, gold: 110,
        sub: { id: 'life', name: 'Life Domain', at: 3, kind: 'Cleric Subclass',
            spells: { 3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds'] } },
        cast: { ability: 'wis', type: 'prepared', prog: 'full', cantrips: cbByLevel([[1, 3], [4, 4], [10, 5]]),
            prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22], focus: 'a holy symbol' },
        features: [
            [1, 'Spellcasting', x => `Wisdom spells from the cleric list; ${x.prepared} prepared, changed after any long rest.`],
            [1, 'Divine Order', 'Protector or Thaumaturge: see Choices.'],
            [2, 'Channel Divinity', x => `${x.L >= 18 ? 4 : x.L >= 6 ? 3 : 2} uses (one back on a short rest, all on a long rest); DC ${x.dc('wis')}.`],
            [2, 'Divine Spark', x => `Channel Divinity: ${x.L >= 18 ? 4 : x.L >= 13 ? 3 : x.L >= 7 ? 2 : 1}d8 ${cbPlus(x.m.wis)} healing, or that much necrotic or radiant damage (CON save for half), to a creature within 30 ft.`],
            [2, 'Turn Undead', x => `Channel Divinity: undead of your choice within 30 ft. make a DC ${x.dc('wis')} WIS save or are frightened and incapacitated for 1 minute, until damaged.`],
            [3, 'Disciple of Life', 'Spells cast with a slot that heal restore an extra 2 + the slot\'s level.'],
            [3, 'Preserve Life', x => `Channel Divinity: split ${5 * x.L} hit points among bloodied creatures within 30 ft., up to half each one's maximum.`],
            [5, 'Sear Undead', x => `Turn Undead also deals ${Math.max(1, x.m.wis)}d8 radiant to each undead that fails.`],
            [6, 'Blessed Healer', 'Heal others with a slot and regain 2 + the slot\'s level yourself.'],
            [7, 'Blessed Strikes', 'Divine Strike or Potent Spellcasting: see Choices.'],
            [10, 'Divine Intervention', x => `Once per long rest, cast any cleric spell of 5th level or lower with no slot or material components${x.L >= 20 ? '; Greater Divine Intervention lets you pick wish (then not again for 2d4 long rests)' : ''}.`],
            [17, 'Supreme Healing', 'Healing dice from your spells and Channel Divinity always roll their highest.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Fate suggested): see Abilities.']
        ]
    },
    {
        id: 'druid', name: 'Druid', icon: '🌿', hd: 8, primary: ['wis', 'con'], saves: ['int', 'wis'],
        armor: ['light', 'shield'], weapons: ['simple'], tools: ['Herbalism kit'],
        skills: { n: 2, from: ['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
        kit: ['a:leather', 'g:Shield', 'w:sickle', 'w:quarterstaff', "pack:Explorer's pack", 'g:Herbalism kit'], kitGold: 9, gold: 50,
        sub: { id: 'land', name: 'Circle of the Land', at: 3, kind: 'Druid Subclass' },
        cast: { ability: 'wis', type: 'prepared', prog: 'full', cantrips: cbByLevel([[1, 2], [4, 3], [10, 4]]),
            prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22], focus: 'a druidic focus (your quarterstaff)' },
        features: [
            [1, 'Spellcasting', x => `Wisdom spells from the druid list; ${x.prepared} prepared, changed after any long rest.`],
            [1, 'Druidic', 'You know the secret druid language, and speak with animals is always prepared.'],
            [1, 'Primal Order', 'Magician or Warden: see Choices.'],
            [2, 'Wild Shape', x => `Bonus action: become a beast you know (${x.L >= 8 ? '8 forms, CR 1, flying allowed' : x.L >= 4 ? '6 forms, CR 1/2, no flying' : '4 forms, CR 1/4, no flying'}) for ${Math.floor(x.L / 2)} hours, gaining ${x.L} temporary hit points. ${x.L >= 17 ? 4 : x.L >= 6 ? 3 : 2} uses (one back on a short rest).`],
            [2, 'Wild Companion', 'Spend a slot or a Wild Shape use to cast find familiar (a fey spirit) with no components.'],
            [3, 'Circle Spells', 'After each long rest pick arid, polar, temperate, or tropical land; its spells for your level are prepared.'],
            [3, "Land's Aid", x => `Spend a Wild Shape use: a 10 ft. sphere within 60 ft. deals ${x.L >= 14 ? 4 : x.L >= 10 ? 3 : 2}d6 necrotic (DC ${x.dc('wis')} CON save for half) and heals one creature in it ${x.L >= 14 ? 4 : x.L >= 10 ? 3 : 2}d6.`],
            [5, 'Wild Resurgence', 'Out of Wild Shape uses, spend a slot for one (once a turn); once per long rest, turn a use into a 1st-level slot.'],
            [6, 'Natural Recovery', x => `Once per long rest, cast a circle spell with no slot; and once per long rest, on a short rest, recover slots totaling ${Math.ceil(x.L / 2)} levels (none 6th or higher).`],
            [7, 'Elemental Fury', 'Potent Spellcasting or Primal Strike: see Choices.'],
            [10, "Nature's Ward", 'Immune to poisoned; resistance tied to your land: arid fire, polar cold, temperate lightning, tropical poison.'],
            [14, "Nature's Sanctuary", 'Spend a Wild Shape use: a 15 ft. cube of spectral trees within 120 ft. for 1 minute gives you and allies half cover and your Nature\'s Ward resistance; move it 60 ft. as a bonus action.'],
            [18, 'Beast Spells', 'Cast spells in Wild Shape (not ones with costly or consumed materials).'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Dimensional Travel suggested): see Abilities.'],
            [20, 'Archdruid', 'Regain a Wild Shape use when you roll initiative with none; once per long rest turn uses into one slot (2 levels each); you age one year per ten.']
        ]
    },
    {
        id: 'fighter', name: 'Fighter', icon: '⚔️', hd: 10, primary: ['str', 'con'], saves: ['str', 'con'],
        armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 2, from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'] },
        kits: [
            { label: 'Chain mail and greatsword', gear: ['a:chain-mail', 'w:greatsword', 'w:flail', 'w:javelin*8', "pack:Dungeoneer's pack"], gold: 4 },
            { label: 'Studded leather and longbow', gear: ['a:studded-leather', 'w:scimitar', 'w:shortsword', 'w:longbow', 'g:Arrows (20)', 'g:Quiver', "pack:Dungeoneer's pack"], gold: 11 }
        ], gold: 155,
        mastery: cbByLevel([[1, 3], [4, 4], [10, 5], [16, 6]]),
        sub: { id: 'champion', name: 'Champion', at: 3, kind: 'Fighter Subclass' },
        asi: [4, 6, 8, 12, 14, 16],
        features: [
            [1, 'Fighting Style', x => `${x.L >= 7 ? 'Two Fighting Style feats' : 'A Fighting Style feat'}: see Choices.`],
            [1, 'Second Wind', x => `Bonus action: regain 1d10 + ${x.L} hit points. ${x.L >= 10 ? 4 : x.L >= 4 ? 3 : 2} uses (one back on a short rest).`],
            [1, 'Weapon Mastery', x => `Use the mastery properties of ${x.mastery} kinds of weapons; swap one after a long rest.`],
            [2, 'Action Surge', x => `Take one more action (not Magic). ${x.L >= 17 ? 'Twice per short rest, once a turn' : 'Once per short rest'}.`],
            [2, 'Tactical Mind', 'Fail an ability check: spend a Second Wind use to add 1d10 (not spent if you still fail).'],
            [3, 'Improved Critical', x => `Weapon attacks and unarmed strikes score a critical hit on ${x.L >= 15 ? '18' : '19'}–20.`],
            [3, 'Remarkable Athlete', 'Advantage on initiative and Athletics checks; after a critical hit, move half your speed without opportunity attacks.'],
            [5, 'Extra Attack', x => `Attack ${x.L >= 20 ? 'four times' : x.L >= 11 ? 'three times' : 'twice'} when you take the Attack action.`],
            [5, 'Tactical Shift', 'When you Second Wind as a bonus action, move half your speed without opportunity attacks.'],
            [7, 'Additional Fighting Style', 'A second Fighting Style feat.'],
            [9, 'Indomitable', x => `Reroll a failed save with +${x.L}. ${x.L >= 17 ? 3 : x.L >= 13 ? 2 : 1} per long rest.`],
            [9, 'Tactical Master', 'When you attack with a weapon you have mastery of, you can use Push, Sap, or Slow instead of its own property.'],
            [10, 'Heroic Warrior', 'In combat, give yourself Heroic Inspiration whenever you start a turn without it.'],
            [13, 'Studied Attacks', 'Miss a creature and you have advantage on your next attack against it before your next turn ends.'],
            [18, 'Survivor', x => `Advantage on death saves, and 18–20 counts as a 20. Bloodied but up: regain ${5 + x.m.con} hit points at the start of each turn.`],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Combat Prowess suggested): see Abilities.']
        ]
    },
    {
        id: 'monk', name: 'Monk', icon: '👊', hd: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'],
        armor: [], weapons: ['simple', 'martial-light'], toolPick: { n: 1, from: 'artisan-or-instrument' },
        skills: { n: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
        kit: ['w:spear', 'w:dagger*5', 'tool:class', "pack:Explorer's pack"], kitGold: 11, gold: 50,
        sub: { id: 'open-hand', name: 'Warrior of the Open Hand', at: 3, kind: 'Monk Subclass' },
        features: [
            [1, 'Martial Arts', x => `Unarmed, or with only simple melee and light martial melee weapons, no armor or shield: unarmed strike as a bonus action, d${x.martial} damage, and DEX for attack and damage.`],
            [1, 'Unarmored Defense', 'With no armor and no shield, your AC is 10 + DEX + WIS.'],
            [2, "Monk's Focus", x => `${x.L} focus points per short rest; DC ${x.dc('wis')}. Flurry of Blows (${x.L >= 10 ? 'three' : 'two'} bonus unarmed strikes), Patient Defense (Disengage free, or Disengage and Dodge for 1 point${x.L >= 10 ? ', plus temporary hit points' : ''}), Step of the Wind (Dash free, or Disengage and Dash and double jump for 1 point).`],
            [2, 'Unarmored Movement', x => `+${x.L >= 18 ? 30 : x.L >= 14 ? 25 : x.L >= 10 ? 20 : x.L >= 6 ? 15 : 10} ft. speed without armor or shield.`],
            [2, 'Uncanny Metabolism', x => `Once per long rest, when you roll initiative, regain all focus points and 1d${x.martial} + ${x.L} hit points.`],
            [3, 'Deflect Attacks', x => `Reaction: cut a ${x.L >= 13 ? '' : 'bludgeoning, piercing, or slashing '}hit's damage by 1d10 ${cbPlus(x.m.dex + x.L)}; at 0, spend 1 focus to redirect it (DEX save or 2d${x.martial} ${cbPlus(x.m.dex)}).`],
            [3, 'Open Hand Technique', x => `Flurry hits can deny reactions (Addle), push 15 ft. (STR save), or knock prone (DEX save); DC ${x.dc('wis')}.`],
            [4, 'Slow Fall', x => `Reaction: reduce falling damage by ${5 * x.L}.`],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [5, 'Stunning Strike', x => `Once a turn, spend 1 focus on a hit: DC ${x.dc('wis')} CON save or stunned until your next turn; on a success its speed is halved and the next attack on it has advantage.`],
            [6, 'Empowered Strikes', 'Your unarmed strikes can deal force damage.'],
            [6, 'Wholeness of Body', x => `Bonus action: regain 1d${x.martial} + ${Math.max(1, x.m.wis)} hit points. ${Math.max(1, x.m.wis)} uses per long rest.`],
            [7, 'Evasion', 'A DEX save for half damage deals none on a success and half on a failure.'],
            [9, 'Acrobatic Movement', 'Without armor or shield, run up walls and across liquids on your turn.'],
            [10, 'Self-Restoration', 'End charmed, frightened, or poisoned on yourself at the end of each turn; no exhaustion from going without food and water.'],
            [11, 'Fleet Step', 'After any other bonus action, you can also use Step of the Wind.'],
            [14, 'Disciplined Survivor', 'Proficient in all saving throws; spend 1 focus to reroll a failed save.'],
            [15, 'Perfect Focus', 'Roll initiative without Uncanny Metabolism and regain focus up to 4.'],
            [17, 'Quivering Palm', x => `4 focus on an unarmed hit sets up vibrations for ${x.L} days; end them (an action, or one attack) for 10d12 force, CON save (DC ${x.dc('wis')}) for half.`],
            [18, 'Superior Defense', '3 focus at the start of your turn: resistance to all damage but force for 1 minute.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Irresistible Offense suggested): see Abilities.'],
            [20, 'Body and Mind', 'Dexterity and Wisdom +4 each, to a maximum of 25.']
        ]
    },
    {
        id: 'paladin', name: 'Paladin', icon: '🛡️', hd: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'],
        armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
        kit: ['a:chain-mail', 'g:Shield', 'w:longsword', 'w:javelin*6', 'g:Holy symbol', "pack:Priest's pack"], kitGold: 9, gold: 150,
        mastery: cbByLevel([[1, 2]]),
        sub: { id: 'devotion', name: 'Oath of Devotion', at: 3, kind: 'Paladin Subclass',
            spells: { 3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] } },
        cast: { ability: 'cha', type: 'prepared', prog: 'half', prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15], focus: 'a holy symbol' },
        features: [
            [1, 'Lay On Hands', x => `Bonus action: heal by touch from a pool of ${5 * x.L} hit points per long rest; 5 points ends poisoned${x.L >= 14 ? ', and 5 points each ends blinded, charmed, deafened, frightened, paralyzed, or stunned (Restoring Touch)' : ''}.`],
            [1, 'Spellcasting', x => `Charisma spells from the paladin list; ${x.prepared} prepared, one swapped after a long rest.`],
            [1, 'Weapon Mastery', 'Use the mastery properties of two kinds of weapons; change them after a long rest.'],
            [2, 'Fighting Style', 'A Fighting Style feat, or Blessed Warrior (two cleric cantrips): see Choices.'],
            [2, "Paladin's Smite", 'Divine smite is always prepared, and you can cast it once per long rest without a slot.'],
            [3, 'Channel Divinity', x => `${x.L >= 11 ? 3 : 2} uses (one back on a short rest); DC ${x.dc('cha')}. Divine Sense: bonus action, for 10 minutes you know where celestials, fiends, and undead within 60 ft. are.`],
            [3, 'Sacred Weapon', x => `Channel Divinity, as you Attack: for 10 minutes a melee weapon adds +${Math.max(1, x.m.cha)} to attacks, can deal radiant, and sheds light.`],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [5, 'Faithful Steed', 'Find steed is always prepared, and you can cast it once per long rest without a slot.'],
            [6, 'Aura of Protection', x => `You and allies within ${x.L >= 18 ? 30 : 10} ft. add +${Math.max(1, x.m.cha)} to saving throws while you aren't incapacitated.`],
            [7, 'Aura of Devotion', 'You and allies in your aura are immune to charmed.'],
            [9, 'Abjure Foes', x => `Channel Divinity: up to ${Math.max(1, x.m.cha)} creatures within 60 ft. make a DC ${x.dc('cha')} WIS save or are frightened for 1 minute (until damaged), and can only move, act, or take a bonus action each turn.`],
            [10, 'Aura of Courage', 'You and allies in your aura are immune to frightened.'],
            [11, 'Radiant Strikes', 'Melee weapon hits and unarmed strikes deal an extra 1d8 radiant.'],
            [15, 'Smite of Protection', 'When you cast divine smite, you and allies in your aura have half cover until your next turn.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Truesight suggested): see Abilities.'],
            [20, 'Holy Nimbus', x => `Bonus action, once per long rest (or spend a 5th-level slot): for 10 minutes your aura is sunlight, enemies starting a turn in it take ${Math.max(0, x.m.cha) + x.prof} radiant, and you have advantage on saves forced by fiends and undead.`]
        ]
    },
    {
        id: 'ranger', name: 'Ranger', icon: '🏹', hd: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'],
        armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 3, from: ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
        kit: ['a:studded-leather', 'w:scimitar', 'w:shortsword', 'w:longbow', 'g:Arrows (20)', 'g:Quiver', 'g:Druidic focus (sprig of mistletoe)', "pack:Explorer's pack"], kitGold: 7, gold: 150,
        mastery: cbByLevel([[1, 2]]),
        sub: { id: 'hunter', name: 'Hunter', at: 3, kind: 'Ranger Subclass' },
        cast: { ability: 'wis', type: 'prepared', prog: 'half', prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15], focus: 'a druidic focus' },
        features: [
            [1, 'Spellcasting', x => `Wisdom spells from the ranger list; ${x.prepared} prepared, one swapped after a long rest.`],
            [1, 'Favored Enemy', x => `Hunter's mark is always prepared; cast it ${x.L >= 17 ? 6 : x.L >= 13 ? 5 : x.L >= 9 ? 4 : x.L >= 5 ? 3 : 2} times per long rest without a slot${x.L >= 13 ? ', and damage can\'t break your concentration on it' : ''}${x.L >= 20 ? '; its die is a d10' : ''}.`],
            [1, 'Weapon Mastery', 'Use the mastery properties of two kinds of weapons; change them after a long rest.'],
            [2, 'Deft Explorer', 'Expertise in one skill and two more languages: see Skills and Background.'],
            [2, 'Fighting Style', 'A Fighting Style feat, or Druidic Warrior (two druid cantrips): see Choices.'],
            [3, "Hunter's Lore", 'You know the immunities, resistances, and vulnerabilities of a creature under your hunter\'s mark.'],
            [3, "Hunter's Prey", 'Colossus Slayer or Horde Breaker, swapped on a rest: see Choices.'],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [6, 'Roving', '+10 ft. speed when not in heavy armor, and climb and swim speeds equal to your speed.'],
            [7, 'Defensive Tactics', 'Escape the Horde or Multiattack Defense, swapped on a rest: see Choices.'],
            [9, 'Expertise', 'Expertise in two more of your skills.'],
            [10, 'Tireless', x => `Magic action: gain 1d8 + ${Math.max(1, x.m.wis)} temporary hit points, ${Math.max(1, x.m.wis)} times per long rest; each short rest removes a level of exhaustion.`],
            [11, "Superior Hunter's Prey", 'Once a turn, hunter\'s mark damage also hits another creature within 30 ft. of the first.'],
            [14, "Nature's Veil", x => `Bonus action: invisible until the end of your next turn, ${Math.max(1, x.m.wis)} times per long rest.`],
            [15, "Superior Hunter's Defense", 'Reaction: resistance to the damage you just took, and that type, until the end of the turn.'],
            [17, 'Precise Hunter', 'Advantage on attacks against the creature under your hunter\'s mark.'],
            [18, 'Feral Senses', 'Blindsight 30 ft.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Dimensional Travel suggested): see Abilities.']
        ]
    },
    {
        id: 'rogue', name: 'Rogue', icon: '🗡️', hd: 8, primary: ['dex', 'int'], saves: ['dex', 'int'],
        armor: ['light'], weapons: ['simple', 'martial-finesse-light'], tools: ["Thieves' tools"],
        skills: { n: 4, from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight-of-hand', 'stealth'] },
        kit: ['a:leather', 'w:dagger*2', 'w:shortsword', 'w:shortbow', 'g:Arrows (20)', 'g:Quiver', "g:Thieves' tools", "pack:Burglar's pack"], kitGold: 8, gold: 100,
        mastery: cbByLevel([[1, 2]]),
        sub: { id: 'thief', name: 'Thief', at: 3, kind: 'Rogue Subclass' },
        asi: [4, 8, 10, 12, 16],
        features: [
            [1, 'Expertise', x => `Expertise in ${x.L >= 6 ? 'four' : 'two'} of your skills.`],
            [1, 'Sneak Attack', x => `Once a turn, +${Math.ceil(x.L / 2)}d6 with a finesse or ranged weapon when you have advantage, or an ally is next to the target and you don't have disadvantage.`],
            [1, "Thieves' Cant", 'You know Thieves\' Cant and one more language: see Background.'],
            [1, 'Weapon Mastery', 'Use the mastery properties of two kinds of weapons; change them after a long rest.'],
            [2, 'Cunning Action', 'Dash, Disengage, or Hide as a bonus action.'],
            [3, 'Steady Aim', 'Bonus action, if you haven\'t moved: advantage on your next attack this turn; your speed drops to 0.'],
            [3, 'Fast Hands', 'Bonus action: Sleight of Hand (pick a lock, disarm a trap, pick a pocket), the Utilize action, or a magic item\'s Magic action.'],
            [3, 'Second-Story Work', 'A climb speed equal to your speed, and you jump with DEX instead of STR.'],
            [5, 'Cunning Strike', x => `Give up sneak attack dice for an effect (DC ${x.dc('dex')}): Poison (1d6, CON save, needs a poisoner's kit), Trip (1d6, DEX save or prone), Withdraw (1d6, move half speed freely)${x.L >= 9 ? ', Stealth Attack (1d6, stay hidden behind cover)' : ''}${x.L >= 14 ? ', Daze (2d6), Obscure (3d6, blinded), Knock Out (6d6, unconscious)' : ''}. ${x.L >= 11 ? 'Two effects per hit.' : ''}`],
            [5, 'Uncanny Dodge', 'Reaction: halve the damage of an attack from an attacker you can see.'],
            [7, 'Evasion', 'A DEX save for half damage deals none on a success and half on a failure.'],
            [7, 'Reliable Talent', 'Treat any d20 roll of 9 or lower as a 10 on checks with your skill or tool proficiencies.'],
            [13, 'Use Magic Device', 'Attune to four items; a 6 on a d6 saves a charge; cast any spell scroll with INT (an Arcana check above 1st level).'],
            [15, 'Slippery Mind', 'Proficient in Wisdom and Charisma saving throws.'],
            [17, "Thief's Reflexes", 'Take two turns in the first round of combat (the second at your initiative − 10).'],
            [18, 'Elusive', 'No attack roll has advantage against you unless you are incapacitated.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of the Night Spirit suggested): see Abilities.'],
            [20, 'Stroke of Luck', 'Turn a failed D20 Test into a 20. Once per short rest.']
        ]
    },
    {
        id: 'sorcerer', name: 'Sorcerer', icon: '🔥', hd: 6, primary: ['cha', 'con'], saves: ['con', 'cha'],
        armor: [], weapons: ['simple'],
        skills: { n: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
        kit: ['w:spear', 'w:dagger*2', 'g:Arcane focus (crystal)', "pack:Dungeoneer's pack"], kitGold: 28, gold: 50,
        sub: { id: 'draconic', name: 'Draconic Sorcery', at: 3, kind: 'Sorcerer Subclass',
            spells: { 3: ['Alter Self', 'Chromatic Orb', 'Command', "Dragon's Breath"], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon'] } },
        cast: { ability: 'cha', type: 'prepared', prog: 'full', cantrips: cbByLevel([[1, 4], [4, 5], [10, 6]]),
            prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22], focus: 'an arcane focus' },
        features: [
            [1, 'Spellcasting', x => `Charisma spells from the sorcerer list; ${x.prepared} prepared, one swapped each level.`],
            [1, 'Innate Sorcery', x => `Bonus action, twice per long rest${x.L >= 7 ? ' (or 2 sorcery points)' : ''}: for 1 minute your sorcerer spell DC is ${x.dc('cha') + 1} and your sorcerer spell attacks have advantage${x.L >= 7 ? '; you can use two Metamagic options per spell' : ''}${x.L >= 20 ? '; one Metamagic a turn costs no points' : ''}.`],
            [2, 'Font of Magic', x => `${x.L} sorcery points per long rest. Turn a slot into points (its level), or points into a slot as a bonus action (1st 2, 2nd 3, 3rd 5, 4th 6, 5th 7).`],
            [2, 'Metamagic', x => `${x.L >= 17 ? 6 : x.L >= 10 ? 4 : 2} ways to bend your spells with sorcery points: see Choices.`],
            [3, 'Draconic Resilience', '+1 hit point maximum per sorcerer level (from 3rd); with no armor, your AC is 10 + DEX + CHA.'],
            [3, 'Draconic Spells', 'Your draconic spells are always prepared: see Spells.'],
            [5, 'Sorcerous Restoration', x => `Once per long rest, on a short rest, regain up to ${Math.floor(x.L / 2)} sorcery points.`],
            [6, 'Elemental Affinity', x => `Resistance to ${x.affinity || 'one of acid, cold, fire, lightning, or poison'}; spells of that type add +${Math.max(0, x.m.cha)} to one damage roll. See Choices.`],
            [14, 'Dragon Wings', 'Bonus action: a 60 ft. flying speed for 1 hour. Once per long rest, or spend 3 sorcery points.'],
            [18, 'Dragon Companion', 'Cast summon dragon with no material component, once per long rest with no slot, and optionally without concentration (then 1 minute).'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Dimensional Travel suggested): see Abilities.']
        ]
    },
    {
        id: 'warlock', name: 'Warlock', icon: '👁️', hd: 8, primary: ['cha', 'con'], saves: ['wis', 'cha'],
        armor: ['light'], weapons: ['simple'],
        skills: { n: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
        kit: ['a:leather', 'w:sickle', 'w:dagger*2', 'g:Arcane focus (orb)', 'g:Book (occult lore)', "pack:Scholar's pack"], kitGold: 15, gold: 100,
        sub: { id: 'fiend', name: 'Fiend Patron', at: 3, kind: 'Warlock Subclass',
            spells: { 3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague'] } },
        cast: { ability: 'cha', type: 'prepared', prog: 'pact', cantrips: cbByLevel([[1, 2], [4, 3], [10, 4]]),
            prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15], focus: 'an arcane focus' },
        features: [
            [1, 'Eldritch Invocations', x => `${x.invocations} invocations (the pacts are invocations now): see Choices.`],
            [1, 'Pact Magic', x => `${x.pact[0]} spell slot${x.pact[0] > 1 ? 's' : ''}, all ${x.ord(x.pact[1])} level, back on a short rest; ${x.prepared} spells prepared, one swapped each level.`],
            [2, 'Magical Cunning', x => `Once per long rest, a 1-minute rite restores ${x.L >= 20 ? 'all your' : 'up to half your (rounded up)'} Pact Magic slots.`],
            [3, "Dark One's Blessing", x => `When you (or anyone, within 10 ft. of you) drop an enemy to 0 hit points, gain ${Math.max(1, x.m.cha + x.L)} temporary hit points.`],
            [3, 'Fiend Spells', 'Your patron\'s spells are always prepared: see Spells.'],
            [6, "Dark One's Own Luck", x => `Add 1d10 to an ability check or save after seeing the roll. ${Math.max(1, x.m.cha)} uses per long rest.`],
            [9, 'Contact Patron', 'Contact other plane is always prepared; once per long rest, cast it with no slot to reach your patron, and you pass its save.'],
            [10, 'Fiendish Resilience', 'After each rest, pick a damage type other than force to resist.'],
            [11, 'Mystic Arcanum', 'One spell each of 6th level and up, cast once per long rest without a slot: see Spells.'],
            [14, 'Hurl Through Hell', x => `Once a turn on a hit: DC ${x.dc('cha')} CHA save or the target vanishes through the Lower Planes, taking 8d10 psychic (unless a fiend) and incapacitated until your next turn. Once per long rest, or spend a pact slot.`],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Fate suggested): see Abilities.']
        ]
    },
    {
        id: 'wizard', name: 'Wizard', icon: '📜', hd: 6, primary: ['int', 'con'], saves: ['int', 'wis'],
        armor: [], weapons: ['simple'],
        skills: { n: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'] },
        kit: ['w:dagger*2', 'w:quarterstaff', 'g:Robe', 'g:Spellbook', "pack:Scholar's pack"], kitGold: 5, gold: 55,
        sub: { id: 'evoker', name: 'Evoker', at: 3, kind: 'Wizard Subclass' },
        cast: { ability: 'int', type: 'book', prog: 'full', cantrips: cbByLevel([[1, 3], [4, 4], [10, 5]]),
            prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25], focus: 'an arcane focus (your quarterstaff) or your spellbook' },
        features: [
            [1, 'Spellcasting', x => `A spellbook of wizard spells (six to start, two more each level); prepare ${x.prepared} of them, changed after any long rest.`],
            [1, 'Ritual Adept', 'Cast any ritual in your spellbook as a ritual without preparing it.'],
            [1, 'Arcane Recovery', x => `Once per long rest, on a short rest, recover slots totaling up to ${Math.ceil(x.L / 2)} levels (none 6th or higher).`],
            [2, 'Scholar', 'Expertise in one of Arcana, History, Investigation, Medicine, Nature, or Religion: see Skills.'],
            [3, 'Evocation Savant', 'Two evocation spells of 2nd level or lower go in your book free, plus one more each time you gain a new spell level.'],
            [3, 'Potent Cantrip', 'A cantrip that misses, or that the target saves against, still deals half damage (no other effect).'],
            [5, 'Memorize Spell', 'On a short rest, swap one prepared spell for another from your book.'],
            [6, 'Sculpt Spells', 'Pick up to 1 + the spell\'s level creatures to pass their saves against your evocations, taking no damage.'],
            [10, 'Empowered Evocation', x => `Add +${Math.max(0, x.m.int)} to one damage roll of your wizard evocation spells.`],
            [14, 'Overchannel', 'Deal maximum damage with a damaging spell of 5th level or lower; again before a long rest deals you 2d12 necrotic per slot level (rising each time).'],
            [18, 'Spell Mastery', 'A 1st- and a 2nd-level spell (one action to cast) are always prepared and cast at their lowest level at will.'],
            [19, 'Epic Boon', 'An Epic Boon feat (Boon of Spell Recall suggested): see Abilities.'],
            [20, 'Signature Spells', 'Two 3rd-level spells are always prepared, each cast once per short rest at 3rd level without a slot.']
        ]
    }
];
