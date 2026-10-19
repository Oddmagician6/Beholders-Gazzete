/* ============================================================
   CHARACTER DATA (F58): the SRD 5.1 player options the Character Builder uses.
   Races and subraces, the 12 classes with their one SRD subclass each, the
   Acolyte background, the Grappler feat, weapons, armor, packs, and tools.
   Feature text is a short original summary written for this site, never the
   SRD's own wording; a summary that scales takes x = { L, prof, m, dc }
   (level, proficiency bonus, ability modifiers, DC for an ability).
   This work includes material taken from the System Reference Document 5.1
   ("SRD 5.1") by Wizards of the Coast LLC, available at
   https://dnd.wizards.com/resources/systems-reference-document, licensed under
   the Creative Commons Attribution 4.0 International License:
   https://creativecommons.org/licenses/by/4.0/
   ============================================================ */

const CB_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const CB_ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

const CB_SKILLS = {
    acrobatics: ['Acrobatics', 'dex'], 'animal-handling': ['Animal Handling', 'wis'], arcana: ['Arcana', 'int'],
    athletics: ['Athletics', 'str'], deception: ['Deception', 'cha'], history: ['History', 'int'],
    insight: ['Insight', 'wis'], intimidation: ['Intimidation', 'cha'], investigation: ['Investigation', 'int'],
    medicine: ['Medicine', 'wis'], nature: ['Nature', 'int'], perception: ['Perception', 'wis'],
    performance: ['Performance', 'cha'], persuasion: ['Persuasion', 'cha'], religion: ['Religion', 'int'],
    'sleight-of-hand': ['Sleight of Hand', 'dex'], stealth: ['Stealth', 'dex'], survival: ['Survival', 'wis']
};

const CB_LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
    'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];

const CB_ARTISAN_TOOLS = ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools",
    "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools",
    "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools",
    "Tinker's tools", "Weaver's tools", "Woodcarver's tools"];
const CB_INSTRUMENTS = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'];
const CB_GAMING_SETS = ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set'];
const CB_TOOLS = [...CB_ARTISAN_TOOLS, 'Disguise kit', 'Forgery kit', 'Herbalism kit', "Navigator's tools",
    "Poisoner's kit", "Thieves' tools", ...CB_GAMING_SETS, ...CB_INSTRUMENTS];

// Dragon kinds: Dragonborn ancestry and the Draconic Bloodline sorcerer.
const CB_DRAGONS = {
    black: { name: 'Black', dmg: 'acid', area: '5 by 30 ft. line', save: 'dex' },
    blue: { name: 'Blue', dmg: 'lightning', area: '5 by 30 ft. line', save: 'dex' },
    brass: { name: 'Brass', dmg: 'fire', area: '5 by 30 ft. line', save: 'dex' },
    bronze: { name: 'Bronze', dmg: 'lightning', area: '5 by 30 ft. line', save: 'dex' },
    copper: { name: 'Copper', dmg: 'acid', area: '5 by 30 ft. line', save: 'dex' },
    gold: { name: 'Gold', dmg: 'fire', area: '15 ft. cone', save: 'dex' },
    green: { name: 'Green', dmg: 'poison', area: '15 ft. cone', save: 'con' },
    red: { name: 'Red', dmg: 'fire', area: '15 ft. cone', save: 'dex' },
    silver: { name: 'Silver', dmg: 'cold', area: '15 ft. cone', save: 'con' },
    white: { name: 'White', dmg: 'cold', area: '15 ft. cone', save: 'con' }
};

const cbSign = n => (n >= 0 ? '+' : '') + n;

// ── Races ────────────────────────────────────────────────
// choose: what the player picks for this race:
//   lang: n extra languages · skill: n skills · abil: n different +1s (not `abilNot`)
//   tool: one of `tools` · cantrip: a wizard cantrip · ancestry: a dragon kind
const CB_RACES = [
    {
        id: 'dwarf', name: 'Dwarf', icon: '🧔', size: 'Medium', speed: 25, abil: { con: 2 }, dark: 60,
        langs: ['Common', 'Dwarvish'], weapons: ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'],
        choose: { tool: ["Smith's tools", "Brewer's supplies", "Mason's tools"] },
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim (no colors).'],
            ['Dwarven Resilience', 'Advantage on saves against poison; resistance to poison damage.'],
            ['Dwarven Combat Training', 'Proficient with the battleaxe, handaxe, light hammer, and warhammer.'],
            ['Stonecunning', 'Double proficiency on History checks about stonework.'],
            ['Sturdy Stride', 'Heavy armor never lowers your speed.']
        ],
        subraces: [{ id: 'hill-dwarf', name: 'Hill Dwarf', abil: { wis: 1 }, hpPerLevel: 1,
            traits: [['Dwarven Toughness', '+1 hit point maximum per level.']] }]
    },
    {
        id: 'elf', name: 'Elf', icon: '🧝', size: 'Medium', speed: 30, abil: { dex: 2 }, dark: 60,
        langs: ['Common', 'Elvish'], skills: ['perception'],
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim (no colors).'],
            ['Keen Senses', 'Proficient in Perception.'],
            ['Fey Ancestry', 'Advantage on saves against being charmed; magic can\'t put you to sleep.'],
            ['Trance', 'Four hours of meditation gives you a long rest\'s worth of sleep.']
        ],
        subraces: [{ id: 'high-elf', name: 'High Elf', abil: { int: 1 }, weapons: ['longsword', 'shortsword', 'shortbow', 'longbow'],
            choose: { cantrip: 1, lang: 1 },
            traits: [
                ['Elf Weapon Training', 'Proficient with the longsword, shortsword, shortbow, and longbow.'],
                ['Cantrip', 'One wizard cantrip of your choice, cast with Intelligence.'],
                ['Extra Language', 'One more language of your choice.']
            ] }]
    },
    {
        id: 'halfling', name: 'Halfling', icon: '🧑', size: 'Small', speed: 25, abil: { dex: 2 },
        langs: ['Common', 'Halfling'],
        traits: [
            ['Lucky', 'Reroll a natural 1 on an attack, check, or save, and use the new roll.'],
            ['Brave', 'Advantage on saves against being frightened.'],
            ['Halfling Nimbleness', 'Move through the space of any creature larger than you.']
        ],
        subraces: [{ id: 'lightfoot', name: 'Lightfoot', abil: { cha: 1 },
            traits: [['Naturally Stealthy', 'You can try to hide behind a creature at least one size larger than you.']] }]
    },
    {
        id: 'human', name: 'Human', icon: '👤', size: 'Medium', speed: 30,
        abil: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, langs: ['Common'], choose: { lang: 1 },
        traits: [['Versatile', '+1 to every ability score and one extra language.']]
    },
    {
        id: 'dragonborn', name: 'Dragonborn', icon: '🐉', size: 'Medium', speed: 30, abil: { str: 2, cha: 1 },
        langs: ['Common', 'Draconic'], choose: { ancestry: true },
        traits: [
            ['Draconic Ancestry', 'Your dragon kind sets your breath weapon and your resistance.'],
            ['Breath Weapon', x => `Action: ${x.breath.area} of ${x.breath.dmg}, ${x.breath.dice}; DC ${x.dc('con')} ${x.breath.save.toUpperCase()} save for half. Once per short or long rest.`],
            ['Damage Resistance', x => `Resistance to ${x.breath.dmg} damage.`]
        ]
    },
    {
        id: 'gnome', name: 'Gnome', icon: '🎩', size: 'Small', speed: 25, abil: { int: 2 }, dark: 60,
        langs: ['Common', 'Gnomish'],
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim (no colors).'],
            ['Gnome Cunning', 'Advantage on Intelligence, Wisdom, and Charisma saves against magic.']
        ],
        subraces: [{ id: 'rock-gnome', name: 'Rock Gnome', abil: { con: 1 }, tools: ["Tinker's tools"],
            traits: [
                ["Artificer's Lore", 'Double proficiency on History checks about magic items, alchemy, and devices.'],
                ['Tinker', 'Proficient with tinker\'s tools; build tiny clockwork toys, fire starters, and music boxes.']
            ] }]
    },
    {
        id: 'half-elf', name: 'Half-Elf', icon: '🧝', size: 'Medium', speed: 30, abil: { cha: 2 }, dark: 60,
        langs: ['Common', 'Elvish'], choose: { abil: 2, abilNot: 'cha', skill: 2, lang: 1 },
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim (no colors).'],
            ['Fey Ancestry', 'Advantage on saves against being charmed; magic can\'t put you to sleep.'],
            ['Skill Versatility', 'Proficient in two skills of your choice.']
        ]
    },
    {
        id: 'half-orc', name: 'Half-Orc', icon: '👹', size: 'Medium', speed: 30, abil: { str: 2, con: 1 }, dark: 60,
        langs: ['Common', 'Orc'], skills: ['intimidation'],
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim (no colors).'],
            ['Menacing', 'Proficient in Intimidation.'],
            ['Relentless Endurance', 'Once per long rest, drop to 1 hit point instead of 0.'],
            ['Savage Attacks', 'On a melee critical hit, roll one weapon damage die once more and add it.']
        ]
    },
    {
        id: 'tiefling', name: 'Tiefling', icon: '😈', size: 'Medium', speed: 30, abil: { int: 1, cha: 2 }, dark: 60,
        langs: ['Common', 'Infernal'],
        traits: [
            ['Darkvision', 'See in dim light within 60 ft. as if bright, and in darkness as if dim (no colors).'],
            ['Hellish Resistance', 'Resistance to fire damage.'],
            ['Infernal Legacy', x => `Thaumaturgy cantrip${x.L >= 3 ? '; hellish rebuke as a 2nd-level spell once per long rest' : ''}${x.L >= 5 ? '; darkness once per long rest' : ''}. Charisma is the casting ability.`]
        ]
    }
];

// ── Weapons, armor, gear ─────────────────────────────────
// props: f finesse, l light, h heavy, t thrown, 2 two-handed, r reach, v versatile, a ammunition, ld loading
const CB_WEAPONS = {
    club: ['Club', 'simple', 'melee', '1d4', 'bludgeoning', 'l', 0.1],
    dagger: ['Dagger', 'simple', 'melee', '1d4', 'piercing', 'f l t', 2, '20/60'],
    greatclub: ['Greatclub', 'simple', 'melee', '1d8', 'bludgeoning', '2', 0.2],
    handaxe: ['Handaxe', 'simple', 'melee', '1d6', 'slashing', 'l t', 5, '20/60'],
    javelin: ['Javelin', 'simple', 'melee', '1d6', 'piercing', 't', 0.5, '30/120'],
    'light-hammer': ['Light hammer', 'simple', 'melee', '1d4', 'bludgeoning', 'l t', 2, '20/60'],
    mace: ['Mace', 'simple', 'melee', '1d6', 'bludgeoning', '', 5],
    quarterstaff: ['Quarterstaff', 'simple', 'melee', '1d6', 'bludgeoning', 'v', 0.2, '', '1d8'],
    sickle: ['Sickle', 'simple', 'melee', '1d4', 'slashing', 'l', 1],
    spear: ['Spear', 'simple', 'melee', '1d6', 'piercing', 't v', 1, '20/60', '1d8'],
    'light-crossbow': ['Light crossbow', 'simple', 'ranged', '1d8', 'piercing', 'a ld 2', 25, '80/320'],
    dart: ['Dart', 'simple', 'ranged', '1d4', 'piercing', 'f t', 0.05, '20/60'],
    shortbow: ['Shortbow', 'simple', 'ranged', '1d6', 'piercing', 'a 2', 25, '80/320'],
    sling: ['Sling', 'simple', 'ranged', '1d4', 'bludgeoning', 'a', 0.1, '30/120'],
    battleaxe: ['Battleaxe', 'martial', 'melee', '1d8', 'slashing', 'v', 10, '', '1d10'],
    flail: ['Flail', 'martial', 'melee', '1d8', 'bludgeoning', '', 10],
    glaive: ['Glaive', 'martial', 'melee', '1d10', 'slashing', 'h r 2', 20],
    greataxe: ['Greataxe', 'martial', 'melee', '1d12', 'slashing', 'h 2', 30],
    greatsword: ['Greatsword', 'martial', 'melee', '2d6', 'slashing', 'h 2', 50],
    halberd: ['Halberd', 'martial', 'melee', '1d10', 'slashing', 'h r 2', 20],
    lance: ['Lance', 'martial', 'melee', '1d12', 'piercing', 'r', 10],
    longsword: ['Longsword', 'martial', 'melee', '1d8', 'slashing', 'v', 15, '', '1d10'],
    maul: ['Maul', 'martial', 'melee', '2d6', 'bludgeoning', 'h 2', 10],
    morningstar: ['Morningstar', 'martial', 'melee', '1d8', 'piercing', '', 15],
    pike: ['Pike', 'martial', 'melee', '1d10', 'piercing', 'h r 2', 5],
    rapier: ['Rapier', 'martial', 'melee', '1d8', 'piercing', 'f', 25],
    scimitar: ['Scimitar', 'martial', 'melee', '1d6', 'slashing', 'f l', 25],
    shortsword: ['Shortsword', 'martial', 'melee', '1d6', 'piercing', 'f l', 10],
    trident: ['Trident', 'martial', 'melee', '1d6', 'piercing', 't v', 5, '20/60', '1d8'],
    'war-pick': ['War pick', 'martial', 'melee', '1d8', 'piercing', '', 5],
    warhammer: ['Warhammer', 'martial', 'melee', '1d8', 'bludgeoning', 'v', 15, '', '1d10'],
    whip: ['Whip', 'martial', 'melee', '1d4', 'slashing', 'f r', 2],
    blowgun: ['Blowgun', 'martial', 'ranged', '1', 'piercing', 'a ld', 10, '25/100'],
    'hand-crossbow': ['Hand crossbow', 'martial', 'ranged', '1d6', 'piercing', 'a l ld', 75, '30/120'],
    'heavy-crossbow': ['Heavy crossbow', 'martial', 'ranged', '1d10', 'piercing', 'a h ld 2', 50, '100/400'],
    longbow: ['Longbow', 'martial', 'ranged', '1d8', 'piercing', 'a h 2', 50, '150/600']
};
const CB_PROP_NAMES = { f: 'finesse', l: 'light', h: 'heavy', t: 'thrown', 2: 'two-handed', r: 'reach', v: 'versatile', a: 'ammunition', ld: 'loading' };

function cbWeapon(id) {
    const w = CB_WEAPONS[id];
    if (!w) return null;
    return { id, name: w[0], cat: w[1], kind: w[2], dmg: w[3], type: w[4], props: w[5] ? w[5].split(' ') : [], cost: w[6], range: w[7] || '', vers: w[8] || '' };
}

// [name, type, base AC, dex cap (null = none), STR needed, stealth disadvantage, cost gp]
const CB_ARMOR = {
    padded: ['Padded armor', 'light', 11, null, 0, true, 5],
    leather: ['Leather armor', 'light', 11, null, 0, false, 10],
    'studded-leather': ['Studded leather', 'light', 12, null, 0, false, 45],
    hide: ['Hide armor', 'medium', 12, 2, 0, false, 10],
    'chain-shirt': ['Chain shirt', 'medium', 13, 2, 0, false, 50],
    'scale-mail': ['Scale mail', 'medium', 14, 2, 0, true, 50],
    breastplate: ['Breastplate', 'medium', 14, 2, 0, false, 400],
    'half-plate': ['Half plate', 'medium', 15, 2, 0, true, 750],
    'ring-mail': ['Ring mail', 'heavy', 14, 0, 0, true, 30],
    'chain-mail': ['Chain mail', 'heavy', 16, 0, 13, true, 75],
    splint: ['Splint armor', 'heavy', 17, 0, 15, true, 200],
    plate: ['Plate armor', 'heavy', 18, 0, 15, true, 1500]
};

function cbArmor(id) {
    const a = CB_ARMOR[id];
    return a ? { id, name: a[0], type: a[1], base: a[2], cap: a[3], str: a[4], stealth: a[5], cost: a[6] } : null;
}

const CB_PACKS = {
    "Burglar's pack": [16, 'backpack, bag of 1,000 ball bearings, 10 ft. of string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks of oil, 5 days of rations, tinderbox, waterskin, 50 ft. of hempen rope'],
    "Diplomat's pack": [39, 'chest, 2 map and scroll cases, fine clothes, ink, ink pen, lamp, 2 flasks of oil, 5 sheets of paper, perfume, sealing wax, soap'],
    "Dungeoneer's pack": [12, 'backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days of rations, waterskin, 50 ft. of hempen rope'],
    "Entertainer's pack": [40, 'backpack, bedroll, 2 costumes, 5 candles, 5 days of rations, waterskin, disguise kit'],
    "Explorer's pack": [10, 'backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days of rations, waterskin, 50 ft. of hempen rope'],
    "Priest's pack": [19, 'backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks of incense, censer, vestments, 2 days of rations, waterskin'],
    "Scholar's pack": [40, 'backpack, book of lore, ink, ink pen, 10 sheets of parchment, little bag of sand, small knife']
};

// Things to buy with starting gold, besides weapons, armor, and packs: [name, gp].
const CB_GOODS = [
    ['Arrows (20)', 1], ['Crossbow bolts (20)', 1], ['Sling bullets (20)', 0.04], ['Blowgun needles (50)', 1],
    ['Shield', 10], ['Holy symbol', 5], ['Arcane focus (crystal)', 10], ['Component pouch', 25], ['Druidic focus (sprig of mistletoe)', 1],
    ['Spellbook', 50], ["Thieves' tools", 25], ['Herbalism kit', 5], ['Disguise kit', 25], ['Forgery kit', 15], ["Healer's kit", 5],
    ['Potion of healing', 50], ['Lute', 35], ['Flute', 2], ['Drum', 6], ['Backpack', 2], ['Bedroll', 1], ['Blanket', 0.5],
    ['Rope, hempen (50 ft.)', 1], ['Crowbar', 2], ['Grappling hook', 2], ['Lantern, hooded', 5], ['Oil (flask)', 0.1],
    ['Torch', 0.01], ['Rations (1 day)', 0.5], ['Waterskin', 0.2], ['Tinderbox', 0.5], ['Caltrops (bag of 20)', 1],
    ['Ball bearings (bag of 1,000)', 1], ['Holy water (flask)', 25], ['Chain (10 ft.)', 5], ['Manacles', 2], ['Mirror, steel', 5],
    ['Clothes, common', 0.5], ["Clothes, traveler's", 2], ['Clothes, fine', 15], ['Net', 1]
];

// What each pack holds, for the Play Sheet's Unpack (F60): [name, qty]. A pack weighs its contents.
const CB_PACK_ITEMS = {
    "Burglar's pack": [['Backpack', 1], ['Ball bearings (bag of 1,000)', 1], ['String (10 ft.)', 1], ['Bell', 1], ['Candle', 5], ['Crowbar', 1], ['Hammer', 1], ['Piton', 10], ['Lantern, hooded', 1], ['Oil (flask)', 2], ['Rations (1 day)', 5], ['Tinderbox', 1], ['Waterskin', 1], ['Rope, hempen (50 ft.)', 1]],
    "Diplomat's pack": [['Chest', 1], ['Map or scroll case', 2], ['Clothes, fine', 1], ['Ink (1 ounce bottle)', 1], ['Ink pen', 1], ['Lamp', 1], ['Oil (flask)', 2], ['Paper (one sheet)', 5], ['Perfume (vial)', 1], ['Sealing wax', 1], ['Soap', 1]],
    "Dungeoneer's pack": [['Backpack', 1], ['Crowbar', 1], ['Hammer', 1], ['Piton', 10], ['Torch', 10], ['Tinderbox', 1], ['Rations (1 day)', 10], ['Waterskin', 1], ['Rope, hempen (50 ft.)', 1]],
    "Entertainer's pack": [['Backpack', 1], ['Bedroll', 1], ['Costume clothes', 2], ['Candle', 5], ['Rations (1 day)', 5], ['Waterskin', 1], ['Disguise kit', 1]],
    "Explorer's pack": [['Backpack', 1], ['Bedroll', 1], ['Mess kit', 1], ['Tinderbox', 1], ['Torch', 10], ['Rations (1 day)', 10], ['Waterskin', 1], ['Rope, hempen (50 ft.)', 1]],
    "Priest's pack": [['Backpack', 1], ['Blanket', 1], ['Candle', 10], ['Tinderbox', 1], ['Alms box', 1], ['Block of incense', 2], ['Censer', 1], ['Vestments', 1], ['Rations (1 day)', 2], ['Waterskin', 1]],
    "Scholar's pack": [['Backpack', 1], ['Book of lore', 1], ['Ink (1 ounce bottle)', 1], ['Ink pen', 1], ['Parchment (one sheet)', 10], ['Little bag of sand', 1], ['Small knife', 1]]
};

// Weight in pounds of one of each item, by gear name (SRD 5.1 equipment). Anything missing weighs
// nothing unless the player gives it a weight; packs weigh their contents (cbItemWeight).
const CB_WEIGHTS = {
    Club: 2, Dagger: 1, Greatclub: 10, Handaxe: 2, Javelin: 2, 'Light hammer': 2, Mace: 4, Quarterstaff: 4, Sickle: 2, Spear: 3,
    'Light crossbow': 5, Dart: 0.25, Shortbow: 2, Sling: 0, Battleaxe: 4, Flail: 2, Glaive: 6, Greataxe: 7, Greatsword: 6,
    Halberd: 6, Lance: 6, Longsword: 3, Maul: 10, Morningstar: 4, Pike: 18, Rapier: 2, Scimitar: 3, Shortsword: 2, Trident: 4,
    'War pick': 2, Warhammer: 2, Whip: 3, Blowgun: 1, 'Hand crossbow': 3, 'Heavy crossbow': 18, Longbow: 2, Net: 3,
    'Padded armor': 8, 'Leather armor': 10, 'Studded leather': 13, 'Hide armor': 12, 'Chain shirt': 20, 'Scale mail': 45,
    Breastplate: 20, 'Half plate': 40, 'Ring mail': 40, 'Chain mail': 55, 'Splint armor': 60, 'Plate armor': 65, Shield: 6,
    'Arrows (20)': 1, 'Crossbow bolts (20)': 1.5, 'Sling bullets (20)': 1.5, 'Blowgun needles (50)': 1,
    'Holy symbol': 1, 'Arcane focus (crystal)': 1, 'Component pouch': 2, 'Druidic focus (sprig of mistletoe)': 0, Spellbook: 3,
    "Healer's kit": 3, 'Potion of healing': 0.5, Backpack: 5, Bedroll: 7, Blanket: 3, 'Rope, hempen (50 ft.)': 10, Crowbar: 5,
    'Grappling hook': 4, 'Lantern, hooded': 2, 'Oil (flask)': 1, Torch: 1, 'Rations (1 day)': 2, Waterskin: 5, Tinderbox: 1,
    'Caltrops (bag of 20)': 2, 'Ball bearings (bag of 1,000)': 2, 'Holy water (flask)': 1, 'Chain (10 ft.)': 10, Manacles: 6,
    'Mirror, steel': 0.5, 'Clothes, common': 3, "Clothes, traveler's": 4, 'Clothes, fine': 6, 'Costume clothes': 4,
    Hammer: 3, Piton: 0.25, Chest: 25, 'Map or scroll case': 1, Lamp: 1, 'Mess kit': 1, 'Book of lore': 5, 'Prayer book': 5,
    "Alchemist's supplies": 8, "Brewer's supplies": 9, "Calligrapher's supplies": 5, "Carpenter's tools": 6, "Cartographer's tools": 6,
    "Cobbler's tools": 5, "Cook's utensils": 8, "Glassblower's tools": 5, "Jeweler's tools": 2, "Leatherworker's tools": 5,
    "Mason's tools": 8, "Painter's supplies": 5, "Potter's tools": 3, "Smith's tools": 8, "Tinker's tools": 10, "Weaver's tools": 5,
    "Woodcarver's tools": 5, 'Disguise kit': 3, 'Forgery kit': 5, 'Herbalism kit': 3, "Navigator's tools": 2, "Poisoner's kit": 2,
    "Thieves' tools": 1, 'Dragonchess set': 0.5, Bagpipes: 6, Drum: 3, Dulcimer: 10, Flute: 1, Lute: 2, Lyre: 2, Horn: 2,
    'Pan flute': 2, Shawm: 1, Viol: 1
};

// ── Spell slots ──────────────────────────────────────────
const CB_FULL_SLOTS = [
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
];
// Warlock Pact Magic: [slots, slot level] by warlock level.
const CB_PACT_SLOTS = [[1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
    [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];

// Per-level lists (index 0 = level 1).
const cbByLevel = (pairs) => Array.from({ length: 20 }, (_, i) => { let v = 0; pairs.forEach(([lv, n]) => { if (i + 1 >= lv) v = n; }); return v; });

// ── Classes ──────────────────────────────────────────────
// equip: groups of options; each option is a list of item tokens:
//   w:<weapon id>[*n] · a:<armor id> · g:<gear name>[*n] · pack:<pack name>
//   pick:<simple|martial|simple-melee|martial-melee|instrument> (the player picks one)
// features: [level, name, summary] (summary may be a function of x).
// choices: extra picks a class makes as it levels (see cbClassChoices in character-engine.js).
const CB_CLASSES = [
    {
        id: 'barbarian', name: 'Barbarian', icon: '🪓', hd: 12, primary: ['str', 'con'], saves: ['str', 'con'],
        armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 2, from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
        gold: [2, 10],
        equip: [[['w:greataxe'], ['pick:martial-melee']], [['w:handaxe*2'], ['pick:simple']], [["pack:Explorer's pack", 'w:javelin*4']]],
        sub: { id: 'berserker', name: 'Path of the Berserker', at: 3, kind: 'Primal Path' },
        features: [
            [1, 'Rage', x => `Bonus action, ${x.L >= 20 ? 'unlimited' : x.rages} per long rest, 1 minute: advantage on STR checks and saves, +${x.rageDmg} melee damage with STR, resistance to bludgeoning, piercing, and slashing. No spells or heavy armor.`],
            [1, 'Unarmored Defense', 'With no armor, your AC is 10 + DEX + CON (a shield still counts).'],
            [2, 'Reckless Attack', 'On your first attack of a turn, take advantage on STR melee attacks; attacks against you have advantage until your next turn.'],
            [2, 'Danger Sense', 'Advantage on DEX saves against effects you can see, unless blinded, deafened, or incapacitated.'],
            [3, 'Frenzy', 'Rage in a frenzy to make one melee attack as a bonus action each turn; you gain a level of exhaustion when it ends.'],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [5, 'Fast Movement', '+10 ft. speed while not wearing heavy armor.'],
            [6, 'Mindless Rage', 'You can\'t be charmed or frightened while raging; raging suspends those effects.'],
            [7, 'Feral Instinct', 'Advantage on initiative; rage first to act normally on a surprise round.'],
            [9, 'Brutal Critical', x => `Roll ${x.L >= 17 ? 3 : x.L >= 13 ? 2 : 1} extra weapon damage die${x.L >= 13 ? 's' : ''} on a melee critical hit.`],
            [10, 'Intimidating Presence', x => `Action: frighten one creature within 30 ft. (DC ${x.dc('cha')} WIS save); extend it each turn with your action.`],
            [11, 'Relentless Rage', 'While raging, a DC 10 CON save drops you to 1 hit point instead of 0 (DC rises by 5 each use until a rest).'],
            [14, 'Retaliation', 'Reaction: when a creature within 5 ft. damages you, make a melee attack against it.'],
            [15, 'Persistent Rage', 'Your rage only ends early if you fall unconscious or choose to end it.'],
            [18, 'Indomitable Might', 'A STR check that totals less than your Strength score uses your score instead.'],
            [20, 'Primal Champion', 'Strength and Constitution +4 each, to a maximum of 24.']
        ]
    },
    {
        id: 'bard', name: 'Bard', icon: '🪕', hd: 8, primary: ['cha', 'dex'], saves: ['dex', 'cha'],
        armor: ['light'], weapons: ['simple', 'hand-crossbow', 'longsword', 'rapier', 'shortsword'], toolPick: { n: 3, from: 'instrument' },
        skills: { n: 3, from: 'any' }, gold: [5, 10],
        equip: [[['w:rapier'], ['w:longsword'], ['pick:simple']], [["pack:Diplomat's pack"], ["pack:Entertainer's pack"]], [['g:Lute'], ['pick:instrument']], [['a:leather', 'w:dagger']]],
        sub: { id: 'lore', name: 'College of Lore', at: 3, kind: 'Bard College' },
        cast: { ability: 'cha', type: 'known', prog: 'full', cantrips: cbByLevel([[1, 2], [4, 3], [10, 4]]),
            known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22], focus: 'a musical instrument' },
        features: [
            [1, 'Spellcasting', 'Charisma spells from the bard list; you can cast bard rituals you know.'],
            [1, 'Bardic Inspiration', x => `Bonus action: give a creature within 60 ft. a d${x.L >= 15 ? 12 : x.L >= 10 ? 10 : x.L >= 5 ? 8 : 6} to add to one check, attack, or save. ${Math.max(1, x.m.cha)} uses per ${x.L >= 5 ? 'short' : 'long'} rest.`],
            [2, 'Jack of All Trades', x => `Add +${Math.floor(x.prof / 2)} to ability checks you aren't proficient in (initiative too).`],
            [2, 'Song of Rest', x => `Allies who spend hit dice during your short rest regain an extra d${x.L >= 17 ? 12 : x.L >= 13 ? 10 : x.L >= 9 ? 8 : 6} hit points.`],
            [3, 'Bonus Proficiencies', 'Three more skills of your choice.'],
            [3, 'Cutting Words', 'Reaction: spend an inspiration die to subtract it from a creature\'s attack, check, or damage roll.'],
            [3, 'Expertise', x => `Double proficiency bonus in ${x.L >= 10 ? 'four' : 'two'} chosen skills.`],
            [5, 'Font of Inspiration', 'Bardic Inspiration comes back on a short or long rest.'],
            [6, 'Countercharm', 'Action: allies within 30 ft. who hear you get advantage on saves against charm and fear until your next turn ends.'],
            [6, 'Additional Magical Secrets', 'Two spells from any class, on top of your spells known.'],
            [10, 'Magical Secrets', x => `${x.L >= 18 ? 6 : x.L >= 14 ? 4 : 2} of your spells known may come from any class's list.`],
            [14, 'Peerless Skill', 'Spend an inspiration die to add it to one of your own ability checks.'],
            [20, 'Superior Inspiration', 'Roll initiative with no Bardic Inspiration left and you regain one use.']
        ]
    },
    {
        id: 'cleric', name: 'Cleric', icon: '✨', hd: 8, primary: ['wis', 'con'], saves: ['wis', 'cha'],
        armor: ['light', 'medium', 'shield'], weapons: ['simple'],
        skills: { n: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] }, gold: [5, 10],
        equip: [[['w:mace'], ['w:warhammer']], [['a:scale-mail'], ['a:leather'], ['a:chain-mail']], [['w:light-crossbow', 'g:Crossbow bolts (20)'], ['pick:simple']], [["pack:Priest's pack"], ["pack:Explorer's pack"]], [['g:Shield', 'g:Holy symbol']]],
        sub: { id: 'life', name: 'Life Domain', at: 1, kind: 'Divine Domain', armor: ['heavy'],
            spells: { 1: ['Bless', 'Cure Wounds'], 3: ['Lesser Restoration', 'Spiritual Weapon'], 5: ['Beacon of Hope', 'Revivify'], 7: ['Death Ward', 'Guardian of Faith'], 9: ['Mass Cure Wounds', 'Raise Dead'] } },
        cast: { ability: 'wis', type: 'prepared', prog: 'full', cantrips: cbByLevel([[1, 3], [4, 4], [10, 5]]), focus: 'a holy symbol' },
        features: [
            [1, 'Spellcasting', x => `Prepare ${Math.max(1, x.m.wis + x.L)} cleric spells after each long rest; domain spells are always prepared on top. Cast cleric rituals you have prepared.`],
            [1, 'Bonus Proficiency', 'Proficient with heavy armor.'],
            [1, 'Disciple of Life', 'Healing spells of 1st level or higher restore an extra 2 + the spell\'s level in hit points.'],
            [2, 'Channel Divinity', x => `${x.L >= 18 ? 3 : x.L >= 6 ? 2 : 1} use${x.L >= 6 ? 's' : ''} per short or long rest.`],
            [2, 'Turn Undead', x => `Channel Divinity: undead within 30 ft. make a DC ${x.dc('wis')} WIS save or flee for 1 minute.`],
            [2, 'Preserve Life', x => `Channel Divinity: split ${5 * x.L} hit points of healing among creatures within 30 ft., up to half each one's maximum.`],
            [5, 'Destroy Undead', x => `Undead of CR ${x.L >= 17 ? 4 : x.L >= 14 ? 3 : x.L >= 11 ? 2 : x.L >= 8 ? 1 : '1/2'} or lower that fail the Turn Undead save are destroyed.`],
            [6, 'Blessed Healer', 'Healing someone else with a 1st-level or higher spell also heals you 2 + the spell\'s level.'],
            [8, 'Divine Strike', x => `Once per turn, a weapon hit deals an extra ${x.L >= 14 ? 2 : 1}d8 radiant damage.`],
            [10, 'Divine Intervention', x => x.L >= 20 ? 'Call on your god for help; at 20th level it always works. Once per 7 days.' : `Call on your god for help: it answers if d100 ≤ ${x.L}. Once per 7 days if it works, else after a long rest.`],
            [17, 'Supreme Healing', 'Your healing spells restore the most their dice can roll instead of rolling.']
        ]
    },
    {
        id: 'druid', name: 'Druid', icon: '🌿', hd: 8, primary: ['wis', 'con'], saves: ['int', 'wis'],
        armor: ['light', 'medium', 'shield'], armorNote: 'no metal armor or shields',
        weapons: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'], tools: ['Herbalism kit'],
        skills: { n: 2, from: ['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] }, gold: [2, 10],
        equip: [[['g:Shield'], ['pick:simple']], [['w:scimitar'], ['pick:simple-melee']], [['a:leather', "pack:Explorer's pack", 'g:Druidic focus (sprig of mistletoe)']]],
        sub: { id: 'land', name: 'Circle of the Land', at: 2, kind: 'Druid Circle' },
        cast: { ability: 'wis', type: 'prepared', prog: 'full', cantrips: cbByLevel([[1, 2], [4, 3], [10, 4]]), focus: 'a druidic focus' },
        features: [
            [1, 'Druidic', 'You know the secret druid language and can leave hidden messages in it.'],
            [1, 'Spellcasting', x => `Prepare ${Math.max(1, x.m.wis + x.L)} druid spells after each long rest. Cast druid rituals you have prepared.`],
            [2, 'Wild Shape', x => `Twice per short rest, turn into a beast of CR ${x.L >= 8 ? 1 : x.L >= 4 ? '1/2' : '1/4'} or lower${x.L >= 8 ? '' : x.L >= 4 ? ' (no flying speed)' : ' (no flying or swimming speed)'} for up to ${Math.floor(x.L / 2)} hours.`],
            [2, 'Bonus Cantrip', 'One extra druid cantrip.'],
            [2, 'Natural Recovery', x => `Once per long rest, during a short rest, recover spell slots totaling up to ${Math.ceil(x.L / 2)} levels (none 6th or higher).`],
            [3, 'Circle Spells', 'Your land\'s spells are always prepared and don\'t count against your prepared spells.'],
            [6, "Land's Stride", 'Nonmagical difficult terrain costs no extra movement; advantage on saves against magical plants.'],
            [10, "Nature's Ward", 'Elementals and fey can\'t charm or frighten you; immune to poison and disease.'],
            [14, "Nature's Sanctuary", x => `Beasts and plants must make a DC ${x.dc('wis')} WIS save to attack you.`],
            [18, 'Timeless Body', 'You age one year for every ten that pass.'],
            [18, 'Beast Spells', 'Cast many druid spells while in Wild Shape (no material components).'],
            [20, 'Archdruid', 'Unlimited Wild Shape; ignore spell components that have no cost.']
        ]
    },
    {
        id: 'fighter', name: 'Fighter', icon: '⚔️', hd: 10, primary: ['str', 'con'], saves: ['str', 'con'],
        armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 2, from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] }, gold: [5, 10],
        equip: [[['a:chain-mail'], ['a:leather', 'w:longbow', 'g:Arrows (20)']], [['pick:martial', 'g:Shield'], ['pick:martial', 'pick:martial']], [['w:light-crossbow', 'g:Crossbow bolts (20)'], ['w:handaxe*2']], [["pack:Dungeoneer's pack"], ["pack:Explorer's pack"]]],
        sub: { id: 'champion', name: 'Champion', at: 3, kind: 'Martial Archetype' },
        asi: [4, 6, 8, 12, 14, 16, 19],
        features: [
            [1, 'Fighting Style', x => `${x.L >= 10 ? 'Two styles' : 'One style'}: see Choices.`],
            [1, 'Second Wind', x => `Bonus action: regain 1d10 + ${x.L} hit points. Once per short rest.`],
            [2, 'Action Surge', x => `Take one more action on your turn. ${x.L >= 17 ? 'Twice' : 'Once'} per short rest${x.L >= 17 ? ' (once per turn)' : ''}.`],
            [3, 'Improved Critical', x => `Your weapon attacks score a critical hit on a ${x.L >= 15 ? '18' : '19'}–20.`],
            [5, 'Extra Attack', x => `Attack ${x.L >= 20 ? 'four times' : x.L >= 11 ? 'three times' : 'twice'} when you take the Attack action.`],
            [7, 'Remarkable Athlete', x => `Add +${Math.ceil(x.prof / 2)} to STR, DEX, and CON checks you aren't proficient in; long jumps grow by ${Math.max(0, x.m.str)} ft.`],
            [9, 'Indomitable', x => `Reroll a failed save. ${x.L >= 17 ? 3 : x.L >= 13 ? 2 : 1} per long rest.`],
            [10, 'Additional Fighting Style', 'A second fighting style.'],
            [18, 'Survivor', x => `At the start of each turn, below half hit points but above 0, regain ${5 + x.m.con} hit points.`]
        ]
    },
    {
        id: 'monk', name: 'Monk', icon: '👊', hd: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'],
        armor: [], weapons: ['simple', 'shortsword'], toolPick: { n: 1, from: 'artisan-or-instrument' },
        skills: { n: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] }, gold: [5, 1],
        equip: [[['w:shortsword'], ['pick:simple']], [["pack:Dungeoneer's pack"], ["pack:Explorer's pack"]], [['w:dart*10']]],
        sub: { id: 'open-hand', name: 'Way of the Open Hand', at: 3, kind: 'Monastic Tradition' },
        features: [
            [1, 'Unarmored Defense', 'With no armor and no shield, your AC is 10 + DEX + WIS.'],
            [1, 'Martial Arts', x => `Unarmed strikes and monk weapons use DEX or STR and deal d${x.martial}; after an Attack action, make one unarmed strike as a bonus action.`],
            [2, 'Ki', x => `${x.L} ki points per short rest; save DC ${x.dc('wis')}. Flurry of Blows (two bonus unarmed strikes), Patient Defense (Dodge), Step of the Wind (Dash or Disengage, double jump), 1 ki each.`],
            [2, 'Unarmored Movement', x => `+${x.L >= 18 ? 30 : x.L >= 14 ? 25 : x.L >= 10 ? 20 : x.L >= 6 ? 15 : 10} ft. speed without armor or shield${x.L >= 9 ? '; run up walls and across liquids on your turn' : ''}.`],
            [3, 'Open Hand Technique', x => `Flurry hits can knock prone (DEX save), push 15 ft. (STR save), or deny reactions; DC ${x.dc('wis')}.`],
            [3, 'Deflect Missiles', x => `Reaction: cut a ranged weapon hit's damage by 1d10 + ${x.m.dex + x.L}; at 0, spend 1 ki to throw it back.`],
            [4, 'Slow Fall', x => `Reaction: reduce falling damage by ${5 * x.L}.`],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [5, 'Stunning Strike', x => `Spend 1 ki on a melee hit: the target makes a DC ${x.dc('wis')} CON save or is stunned until your next turn ends.`],
            [6, 'Ki-Empowered Strikes', 'Your unarmed strikes count as magical.'],
            [6, 'Wholeness of Body', x => `Action: regain ${3 * x.L} hit points. Once per long rest.`],
            [7, 'Evasion', 'A DEX save for half damage deals none on a success and half on a failure.'],
            [7, 'Stillness of Mind', 'Action: end one charm or fear effect on yourself.'],
            [10, 'Purity of Body', 'Immune to disease and poison.'],
            [11, 'Tranquility', x => `After a long rest, you have sanctuary on you (DC ${x.dc('wis')}) until your next long rest.`],
            [13, 'Tongue of the Sun and Moon', 'You understand every spoken language, and any creature that knows a language understands you.'],
            [14, 'Diamond Soul', 'Proficient in all saving throws; spend 1 ki to reroll a failed save.'],
            [15, 'Timeless Body', 'No frailty of old age, and no need for food or water.'],
            [17, 'Quivering Palm', x => `3 ki on an unarmed hit sets up vibrations; later, use an action: CON save (DC ${x.dc('wis')}) or drop to 0 hit points, else take 10d10 necrotic.`],
            [18, 'Empty Body', '4 ki: invisible and resistant to all damage but force for 1 minute. 8 ki: cast astral projection.'],
            [20, 'Perfect Self', 'Roll initiative with no ki left and you regain 4 ki points.']
        ]
    },
    {
        id: 'paladin', name: 'Paladin', icon: '🛡️', hd: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'],
        armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] }, gold: [5, 10],
        equip: [[['pick:martial', 'g:Shield'], ['pick:martial', 'pick:martial']], [['w:javelin*5'], ['pick:simple-melee']], [["pack:Priest's pack"], ["pack:Explorer's pack"]], [['a:chain-mail', 'g:Holy symbol']]],
        sub: { id: 'devotion', name: 'Oath of Devotion', at: 3, kind: 'Sacred Oath',
            spells: { 3: ['Protection from Evil and Good', 'Sanctuary'], 5: ['Lesser Restoration', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] } },
        cast: { ability: 'cha', type: 'prepared', prog: 'half', focus: 'a holy symbol' },
        features: [
            [1, 'Divine Sense', x => `Action: sense celestials, fiends, and undead within 60 ft. until your next turn. ${1 + Math.max(0, x.m.cha)} uses per long rest.`],
            [1, 'Lay on Hands', x => `A pool of ${5 * x.L} hit points per long rest to heal by touch; 5 points cures a disease or poison.`],
            [2, 'Fighting Style', 'One style: see Choices.'],
            [2, 'Spellcasting', x => `Prepare ${Math.max(1, x.m.cha + Math.floor(x.L / 2))} paladin spells after each long rest; oath spells are always prepared on top.`],
            [2, 'Divine Smite', 'On a melee hit, spend a slot for +2d8 radiant (+1d8 per slot level above 1st, max 5d8; +1d8 more against undead or fiends).'],
            [3, 'Divine Health', 'Immune to disease.'],
            [3, 'Sacred Weapon', x => `Channel Divinity: for 1 minute your weapon adds +${Math.max(1, x.m.cha)} to attack rolls and sheds light.`],
            [3, 'Turn the Unholy', x => `Channel Divinity: fiends and undead within 30 ft. make a DC ${x.dc('cha')} WIS save or flee for 1 minute.`],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [6, 'Aura of Protection', x => `You and allies within ${x.L >= 18 ? 30 : 10} ft. add +${Math.max(1, x.m.cha)} to saving throws while you're conscious.`],
            [7, 'Aura of Devotion', x => `You and allies within ${x.L >= 18 ? 30 : 10} ft. can't be charmed while you're conscious.`],
            [10, 'Aura of Courage', x => `You and allies within ${x.L >= 18 ? 30 : 10} ft. can't be frightened while you're conscious.`],
            [11, 'Improved Divine Smite', 'Every melee weapon hit deals an extra 1d8 radiant.'],
            [14, 'Cleansing Touch', x => `Action: end one spell on yourself or a willing creature you touch. ${Math.max(1, x.m.cha)} uses per long rest.`],
            [15, 'Purity of Spirit', 'You are always under protection from evil and good.'],
            [20, 'Holy Nimbus', 'Action, once per long rest: bright light for 1 minute that burns enemies for 10 radiant a turn; advantage on saves against fiend and undead spells.']
        ]
    },
    {
        id: 'ranger', name: 'Ranger', icon: '🏹', hd: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'],
        armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'],
        skills: { n: 3, from: ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] }, gold: [5, 10],
        equip: [[['a:scale-mail'], ['a:leather']], [['w:shortsword*2'], ['pick:simple-melee', 'pick:simple-melee']], [["pack:Dungeoneer's pack"], ["pack:Explorer's pack"]], [['w:longbow', 'g:Arrows (20)']]],
        sub: { id: 'hunter', name: 'Hunter', at: 3, kind: 'Ranger Archetype' },
        cast: { ability: 'wis', type: 'known', prog: 'half', known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11] },
        features: [
            [1, 'Favored Enemy', 'Advantage on Survival to track your favored enemies and on INT checks to recall facts about them; you learn one of their languages.'],
            [1, 'Natural Explorer', 'In your favored terrain: double proficiency on INT and WIS checks about it, and your group can\'t get lost and travels well.'],
            [2, 'Fighting Style', 'One style: see Choices.'],
            [2, 'Spellcasting', 'Wisdom spells from the ranger list.'],
            [3, 'Primeval Awareness', 'Spend a slot to sense aberrations, celestials, dragons, elementals, fey, fiends, and undead nearby (1 mile, 6 in favored terrain) for 1 minute per slot level.'],
            [3, "Hunter's Prey", 'See Choices.'],
            [5, 'Extra Attack', 'Attack twice when you take the Attack action.'],
            [7, 'Defensive Tactics', 'See Choices.'],
            [8, "Land's Stride", 'Nonmagical difficult terrain costs no extra movement; advantage on saves against magical plants.'],
            [10, 'Hide in Plain Sight', 'Spend a minute camouflaging yourself for +10 to Stealth while you stay still.'],
            [11, 'Multiattack', 'See Choices.'],
            [14, 'Vanish', 'Hide as a bonus action, and you can\'t be tracked by nonmagical means unless you choose to be.'],
            [15, "Superior Hunter's Defense", 'See Choices.'],
            [18, 'Feral Senses', 'No disadvantage attacking creatures you can\'t see; you know where invisible creatures within 30 ft. are.'],
            [20, 'Foe Slayer', x => `Once per turn, add +${x.m.wis} to an attack or damage roll against a favored enemy.`]
        ]
    },
    {
        id: 'rogue', name: 'Rogue', icon: '🗡️', hd: 8, primary: ['dex', 'int'], saves: ['dex', 'int'],
        armor: ['light'], weapons: ['simple', 'hand-crossbow', 'longsword', 'rapier', 'shortsword'], tools: ["Thieves' tools"],
        skills: { n: 4, from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth'] }, gold: [4, 10],
        equip: [[['w:rapier'], ['w:shortsword']], [['w:shortbow', 'g:Arrows (20)'], ['w:shortsword']], [["pack:Burglar's pack"], ["pack:Dungeoneer's pack"], ["pack:Explorer's pack"]], [['a:leather', 'w:dagger*2', "g:Thieves' tools"]]],
        sub: { id: 'thief', name: 'Thief', at: 3, kind: 'Roguish Archetype' },
        asi: [4, 8, 10, 12, 16, 19],
        features: [
            [1, 'Expertise', x => `Double proficiency bonus in ${x.L >= 6 ? 'four' : 'two'} chosen skills (or thieves' tools).`],
            [1, 'Sneak Attack', x => `Once per turn, +${Math.ceil(x.L / 2)}d6 damage with a finesse or ranged weapon when you have advantage or an ally is next to the target.`],
            [1, "Thieves' Cant", 'A secret mix of jargon and signs that only other rogues understand.'],
            [2, 'Cunning Action', 'Dash, Disengage, or Hide as a bonus action.'],
            [3, 'Fast Hands', 'Use Cunning Action for Sleight of Hand, thieves\' tools, or the Use an Object action.'],
            [3, 'Second-Story Work', x => `Climbing costs no extra movement; running jumps go ${Math.max(0, x.m.dex)} ft. farther.`],
            [5, 'Uncanny Dodge', 'Reaction: halve the damage of an attack from a creature you can see.'],
            [7, 'Evasion', 'A DEX save for half damage deals none on a success and half on a failure.'],
            [9, 'Supreme Sneak', 'Advantage on Stealth if you move no more than half your speed.'],
            [11, 'Reliable Talent', 'Treat any d20 roll of 9 or lower as a 10 on checks you\'re proficient in.'],
            [13, 'Use Magic Device', 'Ignore class, race, and level requirements to use magic items.'],
            [14, 'Blindsense', 'You know where hidden or invisible creatures within 10 ft. are, if you can hear.'],
            [15, 'Slippery Mind', 'Proficient in Wisdom saving throws.'],
            [17, "Thief's Reflexes", 'Take two turns in the first round of combat (the second at your initiative − 10).'],
            [18, 'Elusive', 'No attack roll has advantage against you while you aren\'t incapacitated.'],
            [20, 'Stroke of Luck', 'Turn a miss into a hit, or a failed check into a 20. Once per short rest.']
        ]
    },
    {
        id: 'sorcerer', name: 'Sorcerer', icon: '🔥', hd: 6, primary: ['cha', 'con'], saves: ['con', 'cha'],
        armor: [], weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light-crossbow'],
        skills: { n: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] }, gold: [3, 10],
        equip: [[['w:light-crossbow', 'g:Crossbow bolts (20)'], ['pick:simple']], [['g:Component pouch'], ['g:Arcane focus (crystal)']], [["pack:Dungeoneer's pack"], ["pack:Explorer's pack"]], [['w:dagger*2']]],
        sub: { id: 'draconic', name: 'Draconic Bloodline', at: 1, kind: 'Sorcerous Origin' },
        cast: { ability: 'cha', type: 'known', prog: 'full', cantrips: cbByLevel([[1, 4], [4, 5], [10, 6]]),
            known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15], focus: 'an arcane focus' },
        features: [
            [1, 'Spellcasting', 'Charisma spells from the sorcerer list.'],
            [1, 'Dragon Ancestor', 'You speak Draconic, and double your proficiency on CHA checks with dragons.'],
            [1, 'Draconic Resilience', '+1 hit point maximum per level; with no armor, your AC is 13 + DEX.'],
            [2, 'Font of Magic', x => `${x.L} sorcery points per long rest. Turn points into spell slots or slots into points as a bonus action.`],
            [3, 'Metamagic', x => `${x.L >= 17 ? 4 : x.L >= 10 ? 3 : 2} ways to bend your spells with sorcery points: see Choices.`],
            [6, 'Elemental Affinity', x => `Spells that deal ${x.dragon ? x.dragon.dmg : 'your ancestor\'s'} damage add +${Math.max(0, x.m.cha)} to one damage roll; 1 sorcery point buys resistance to it for an hour.`],
            [14, 'Dragon Wings', 'Bonus action: sprout wings and gain a flying speed equal to your speed (not in armor made for you without them).'],
            [18, 'Draconic Presence', x => `5 sorcery points: a 60 ft. aura of awe or fear for 1 minute (concentration; DC ${x.dc('cha')} WIS save).`],
            [20, 'Sorcerous Restoration', 'Regain 4 sorcery points on a short rest.']
        ]
    },
    {
        id: 'warlock', name: 'Warlock', icon: '👁️', hd: 8, primary: ['cha', 'con'], saves: ['wis', 'cha'],
        armor: ['light'], weapons: ['simple'],
        skills: { n: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] }, gold: [4, 10],
        equip: [[['w:light-crossbow', 'g:Crossbow bolts (20)'], ['pick:simple']], [['g:Component pouch'], ['g:Arcane focus (crystal)']], [["pack:Scholar's pack"], ["pack:Dungeoneer's pack"]], [['a:leather', 'pick:simple', 'w:dagger*2']]],
        sub: { id: 'fiend', name: 'The Fiend', at: 1, kind: 'Otherworldly Patron',
            expanded: { 1: ['Burning Hands', 'Command'], 2: ['Blindness/Deafness', 'Scorching Ray'], 3: ['Fireball', 'Stinking Cloud'], 4: ['Fire Shield', 'Wall of Fire'], 5: ['Flame Strike', 'Hallow'] } },
        cast: { ability: 'cha', type: 'known', prog: 'pact', cantrips: cbByLevel([[1, 2], [4, 3], [10, 4]]),
            known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15], focus: 'an arcane focus' },
        features: [
            [1, 'Pact Magic', x => `${x.pact[0]} spell slot${x.pact[0] > 1 ? 's' : ''}, all ${x.ord(x.pact[1])} level, back on a short rest. The Fiend's spells join your list.`],
            [1, "Dark One's Blessing", x => `Drop a hostile creature to 0 hit points and gain ${Math.max(1, x.m.cha + x.L)} temporary hit points.`],
            [2, 'Eldritch Invocations', 'See Choices.'],
            [3, 'Pact Boon', 'See Choices.'],
            [6, "Dark One's Own Luck", 'Add a d10 to an ability check or save. Once per short rest.'],
            [10, 'Fiendish Resilience', 'After a rest, choose one damage type to resist (not from magic or silvered weapons) until you change it.'],
            [11, 'Mystic Arcanum', 'One spell each of 6th level and up, cast once per long rest without a slot: see Spells.'],
            [14, 'Hurl Through Hell', 'Once per long rest, send a creature you hit through the lower planes: 10d10 psychic unless it\'s a fiend.'],
            [20, 'Eldritch Master', 'Spend a minute to regain all your Pact Magic slots. Once per long rest.']
        ]
    },
    {
        id: 'wizard', name: 'Wizard', icon: '📜', hd: 6, primary: ['int', 'con'], saves: ['int', 'wis'],
        armor: [], weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light-crossbow'],
        skills: { n: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] }, gold: [4, 10],
        equip: [[['w:quarterstaff'], ['w:dagger']], [['g:Component pouch'], ['g:Arcane focus (crystal)']], [["pack:Scholar's pack"], ["pack:Explorer's pack"]], [['g:Spellbook']]],
        sub: { id: 'evocation', name: 'School of Evocation', at: 2, kind: 'Arcane Tradition' },
        cast: { ability: 'int', type: 'book', prog: 'full', cantrips: cbByLevel([[1, 3], [4, 4], [10, 5]]), focus: 'an arcane focus' },
        features: [
            [1, 'Spellcasting', x => `A spellbook of wizard spells; prepare ${Math.max(1, x.m.int + x.L)} of them after each long rest. Cast rituals from your book without preparing them.`],
            [1, 'Arcane Recovery', x => `Once a day, on a short rest, recover spell slots totaling up to ${Math.ceil(x.L / 2)} levels (none 6th or higher).`],
            [2, 'Evocation Savant', 'Copying evocation spells into your book takes half the gold and time.'],
            [2, 'Sculpt Spells', 'Pick up to 1 + the spell\'s level creatures to be untouched by your evocation spells\' saves.'],
            [6, 'Potent Cantrip', 'Creatures that save against your cantrips still take half damage.'],
            [10, 'Empowered Evocation', x => `Add +${Math.max(0, x.m.int)} to one damage roll of your wizard evocation spells.`],
            [14, 'Overchannel', 'Deal maximum damage with a spell of 5th level or lower; again before a long rest costs you necrotic damage.'],
            [18, 'Spell Mastery', 'Pick a 1st- and a 2nd-level spell to cast at their lowest level at will.'],
            [20, 'Signature Spells', 'Two 3rd-level spells are always prepared, each cast once per short rest without a slot.']
        ]
    }
];

const CB_ASI_LEVELS = [4, 8, 12, 16, 19];

// ── Class choice lists ───────────────────────────────────
const CB_FIGHTING_STYLES = {
    archery: ['Archery', '+2 to attack rolls with ranged weapons.'],
    defense: ['Defense', '+1 AC while you wear armor.'],
    dueling: ['Dueling', '+2 damage with a melee weapon held in one hand and no other weapon.'],
    'great-weapon': ['Great Weapon Fighting', 'Reroll 1s and 2s on damage dice with two-handed or versatile weapons held in both hands.'],
    protection: ['Protection', 'Reaction, with a shield: impose disadvantage on an attack against a creature next to you.'],
    'two-weapon': ['Two-Weapon Fighting', 'Add your ability modifier to the off-hand attack\'s damage.']
};
const CB_CLASS_STYLES = {
    fighter: ['archery', 'defense', 'dueling', 'great-weapon', 'protection', 'two-weapon'],
    paladin: ['defense', 'dueling', 'great-weapon', 'protection'],
    ranger: ['archery', 'defense', 'dueling', 'two-weapon']
};

const CB_ENEMIES = ['Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals', 'Fey', 'Fiends', 'Giants',
    'Monstrosities', 'Oozes', 'Plants', 'Undead', 'Two humanoid races'];
const CB_TERRAINS = ['Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp', 'Underdark'];

const CB_HUNTER = {
    3: { label: "Hunter's Prey", opts: { 'colossus-slayer': ['Colossus Slayer', 'Once per turn, +1d8 damage to a creature already below its maximum hit points.'], 'giant-killer': ['Giant Killer', 'Reaction: attack a Large or larger creature next to you that attacks you.'], 'horde-breaker': ['Horde Breaker', 'Once per turn, attack a second creature next to your target.'] } },
    7: { label: 'Defensive Tactics', opts: { 'escape-the-horde': ['Escape the Horde', 'Opportunity attacks against you have disadvantage.'], 'multiattack-defense': ['Multiattack Defense', 'After a creature hits you, +4 AC against its other attacks this turn.'], 'steel-will': ['Steel Will', 'Advantage on saves against being frightened.'] } },
    11: { label: 'Multiattack', opts: { volley: ['Volley', 'Action: a ranged attack against every creature within 10 ft. of a point you can see.'], whirlwind: ['Whirlwind Attack', 'Action: a melee attack against every creature within your reach.'] } },
    15: { label: "Superior Hunter's Defense", opts: { evasion: ['Evasion', 'A DEX save for half damage deals none on a success and half on a failure.'], 'stand-against-the-tide': ['Stand Against the Tide', 'Reaction: when a creature misses you in melee, it attacks another creature instead.'], 'uncanny-dodge': ['Uncanny Dodge', 'Reaction: halve the damage of an attack from a creature you can see.'] } }
};

const CB_METAMAGIC = {
    careful: ['Careful Spell', '1 point: chosen creatures automatically succeed on the spell\'s save.'],
    distant: ['Distant Spell', '1 point: double the range, or touch becomes 30 ft.'],
    empowered: ['Empowered Spell', '1 point: reroll some damage dice.'],
    extended: ['Extended Spell', '1 point: double a duration of 1 minute or more (max 24 hours).'],
    heightened: ['Heightened Spell', '3 points: one target has disadvantage on its first save.'],
    quickened: ['Quickened Spell', '2 points: cast a 1-action spell as a bonus action.'],
    subtle: ['Subtle Spell', '1 point: no verbal or somatic components.'],
    twinned: ['Twinned Spell', 'Points equal to the spell\'s level: a single-target spell hits a second creature.']
};

const CB_PACTS = {
    chain: ['Pact of the Chain', 'Find familiar, with imp, pseudodragon, quasit, or sprite forms; it can attack with its reaction.'],
    blade: ['Pact of the Blade', 'Summon a pact weapon in any melee form; you\'re proficient with it.'],
    tome: ['Pact of the Tome', 'A Book of Shadows with three cantrips from any class\'s list.']
};

// [name, summary, prereq { L, pact, spell }]
const CB_INVOCATIONS = {
    'agonizing-blast': ['Agonizing Blast', 'Add your CHA modifier to eldritch blast damage.', { spell: 'Eldritch Blast' }],
    'armor-of-shadows': ['Armor of Shadows', 'Cast mage armor on yourself at will.'],
    'ascendant-step': ['Ascendant Step', 'Cast levitate on yourself at will.', { L: 9 }],
    'beast-speech': ['Beast Speech', 'Cast speak with animals at will.'],
    'beguiling-influence': ['Beguiling Influence', 'Proficient in Deception and Persuasion.'],
    'bewitching-whispers': ['Bewitching Whispers', 'Cast compulsion once per long rest with a pact slot.', { L: 7 }],
    'book-of-ancient-secrets': ['Book of Ancient Secrets', 'Copy rituals of any class into your Book of Shadows and cast them as rituals.', { pact: 'tome' }],
    'chains-of-carceri': ['Chains of Carceri', 'Cast hold monster at will on a celestial, fiend, or elemental.', { L: 15, pact: 'chain' }],
    'devils-sight': ["Devil's Sight", 'See normally in darkness, magical or not, to 120 ft.'],
    'dreadful-word': ['Dreadful Word', 'Cast confusion once per long rest with a pact slot.', { L: 7 }],
    'eldritch-sight': ['Eldritch Sight', 'Cast detect magic at will.'],
    'eldritch-spear': ['Eldritch Spear', 'Eldritch blast reaches 300 ft.', { spell: 'Eldritch Blast' }],
    'eyes-of-the-rune-keeper': ['Eyes of the Rune Keeper', 'Read all writing.'],
    'fiendish-vigor': ['Fiendish Vigor', 'Cast false life on yourself at will as a 1st-level spell.'],
    'gaze-of-two-minds': ['Gaze of Two Minds', 'Touch a willing humanoid to see and hear through its senses.'],
    lifedrinker: ['Lifedrinker', 'Pact weapon hits deal extra necrotic damage equal to your CHA modifier.', { L: 12, pact: 'blade' }],
    'mask-of-many-faces': ['Mask of Many Faces', 'Cast disguise self at will.'],
    'master-of-myriad-forms': ['Master of Myriad Forms', 'Cast alter self at will.', { L: 15 }],
    'minions-of-chaos': ['Minions of Chaos', 'Cast conjure elemental once per long rest with a pact slot.', { L: 9 }],
    'mire-the-mind': ['Mire the Mind', 'Cast slow once per long rest with a pact slot.', { L: 5 }],
    'misty-visions': ['Misty Visions', 'Cast silent image at will.'],
    'one-with-shadows': ['One with Shadows', 'In dim light or darkness, become invisible until you move or act.', { L: 5 }],
    'otherworldly-leap': ['Otherworldly Leap', 'Cast jump on yourself at will.', { L: 9 }],
    'repelling-blast': ['Repelling Blast', 'Eldritch blast pushes a creature 10 ft. away.', { spell: 'Eldritch Blast' }],
    'sculptor-of-flesh': ['Sculptor of Flesh', 'Cast polymorph once per long rest with a pact slot.', { L: 7 }],
    'sign-of-ill-omen': ['Sign of Ill Omen', 'Cast bestow curse once per long rest with a pact slot.', { L: 5 }],
    'thief-of-five-fates': ['Thief of Five Fates', 'Cast bane once per long rest with a pact slot.'],
    'thirsting-blade': ['Thirsting Blade', 'Attack twice with your pact weapon when you take the Attack action.', { L: 5, pact: 'blade' }],
    'visions-of-distant-realms': ['Visions of Distant Realms', 'Cast arcane eye at will.', { L: 15 }],
    'voice-of-the-chain-master': ['Voice of the Chain Master', 'Talk through your familiar and perceive through its senses at any distance.', { pact: 'chain' }],
    'whispers-of-the-grave': ['Whispers of the Grave', 'Cast speak with dead at will.', { L: 9 }],
    'witch-sight': ['Witch Sight', 'See the true form of shapechangers and illusions within 30 ft.', { L: 15 }]
};
const CB_INVOCATIONS_KNOWN = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8];

// Circle of the Land spells by terrain (spell level 2–5, gained at druid level 3, 5, 7, 9).
const CB_LAND_SPELLS = {
    Arctic: { 3: ['Hold Person', 'Spike Growth'], 5: ['Sleet Storm', 'Slow'], 7: ['Freedom of Movement', 'Ice Storm'], 9: ['Commune With Nature', 'Cone of Cold'] },
    Coast: { 3: ['Mirror Image', 'Misty Step'], 5: ['Water Breathing', 'Water Walk'], 7: ['Control Water', 'Freedom of Movement'], 9: ['Conjure Elemental', 'Scrying'] },
    Desert: { 3: ['Blur', 'Silence'], 5: ['Create Food and Water', 'Protection From Energy'], 7: ['Blight', 'Hallucinatory Terrain'], 9: ['Insect Plague', 'Wall of Stone'] },
    Forest: { 3: ['Barkskin', 'Spider Climb'], 5: ['Call Lightning', 'Plant Growth'], 7: ['Divination', 'Freedom of Movement'], 9: ['Commune With Nature', 'Tree Stride'] },
    Grassland: { 3: ['Invisibility', 'Pass Without Trace'], 5: ['Daylight', 'Haste'], 7: ['Divination', 'Freedom of Movement'], 9: ['Dream', 'Insect Plague'] },
    Mountain: { 3: ['Spider Climb', 'Spike Growth'], 5: ['Lightning Bolt', 'Meld Into Stone'], 7: ['Stone Shape', 'Stoneskin'], 9: ['Passwall', 'Wall of Stone'] },
    Swamp: { 3: ['Acid Arrow', 'Darkness'], 5: ['Water Walk', 'Stinking Cloud'], 7: ['Freedom of Movement', 'Locate Creature'], 9: ['Insect Plague', 'Scrying'] },
    Underdark: { 3: ['Spider Climb', 'Web'], 5: ['Gaseous Form', 'Stinking Cloud'], 7: ['Greater Invisibility', 'Stone Shape'], 9: ['Cloudkill', 'Insect Plague'] }
};

// ── Background and feat ──────────────────────────────────
const CB_BACKGROUNDS = {
    acolyte: {
        name: 'Acolyte', skills: ['insight', 'religion'], langs: 2,
        gear: ['Holy symbol', 'Prayer book', 'Incense (5 sticks)', 'Vestments', 'Clothes, common'], gold: 15,
        feature: ['Shelter of the Faithful', 'Temples of your faith give you and your companions free healing and care, and support you at a modest lifestyle.']
    },
    // A background of the player's own: two skills, two tools or languages, a little gear.
    custom: { name: 'Custom background', gear: ['Clothes, common'], gold: 10 }
};

const CB_FEATS = {
    grappler: { name: 'Grappler', req: { str: 13 }, text: 'Advantage on attacks against a creature you are grappling; use an action to pin it (you and it are both restrained until the grapple ends).' }
};

const CB_ALIGNMENTS = ['Lawful good', 'Neutral good', 'Chaotic good', 'Lawful neutral', 'Neutral', 'Chaotic neutral', 'Lawful evil', 'Neutral evil', 'Chaotic evil'];

const CB_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const CB_POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const CB_POINT_BUDGET = 27;
