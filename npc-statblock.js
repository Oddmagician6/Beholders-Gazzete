/* ============================================
   NPC STAT BLOCK (no DOM). Turns a rolled NPC
   (rollNPC in npc-data.js) into a full 5e stat
   block: class and level, armor, weapons,
   features, and spells.
   Classes, subclasses, weapons, armor, and spells
   follow the System Reference Document 5.1 (CC BY 4.0).
   Needs rng.js, npc-data.js, spells-data.js.
   ============================================ */

// ==================== CLASSES ====================

// hd: hit die. saves: proficient saves. armor: heaviest armor worn ('heavy',
// 'medium', 'light', 'none'). shield: can use one. martial: martial weapons.
// key: spellcasting or main ability. skills: [list, how many]. sub: [name, level].
const SB_CLASSES = {
    Barbarian: { hd: 12, saves: ['str', 'con'], armor: 'medium', shield: true, martial: true, key: 'str',
        skills: [['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'], 2], sub: ['Path of the Berserker', 3] },
    Bard: { hd: 8, saves: ['dex', 'cha'], armor: 'light', shield: false, martial: false, key: 'cha', cast: 'full', known: true,
        skills: [['Acrobatics', 'Deception', 'History', 'Insight', 'Intimidation', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'], 3], sub: ['College of Lore', 3] },
    Cleric: { hd: 8, saves: ['wis', 'cha'], armor: 'heavy', shield: true, martial: false, key: 'wis', cast: 'full',
        skills: [['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'], 2], sub: ['Life Domain', 1] },
    Druid: { hd: 8, saves: ['int', 'wis'], armor: 'druid', shield: true, martial: false, key: 'wis', cast: 'full',
        skills: [['Animal Handling', 'Arcana', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], 2], sub: ['Circle of the Land', 2] },
    Fighter: { hd: 10, saves: ['str', 'con'], armor: 'heavy', shield: true, martial: true, key: 'str',
        skills: [['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'], 2], sub: ['Champion', 3] },
    Monk: { hd: 8, saves: ['str', 'dex'], armor: 'none', shield: false, martial: false, key: 'dex',
        skills: [['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'], 2], sub: ['Way of the Open Hand', 3] },
    Paladin: { hd: 10, saves: ['wis', 'cha'], armor: 'heavy', shield: true, martial: true, key: 'cha', cast: 'half',
        skills: [['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'], 2], sub: ['Oath of Devotion', 3] },
    Ranger: { hd: 10, saves: ['str', 'dex'], armor: 'medium', shield: true, martial: true, key: 'wis', cast: 'half', known: true,
        skills: [['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'], 3], sub: ['Hunter', 3] },
    Rogue: { hd: 8, saves: ['dex', 'int'], armor: 'light', shield: false, martial: false, key: 'dex',
        skills: [['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'], 4], sub: ['Thief', 3] },
    Sorcerer: { hd: 6, saves: ['con', 'cha'], armor: 'none', shield: false, martial: false, key: 'cha', cast: 'full', known: true,
        skills: [['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'], 2], sub: ['Draconic Bloodline', 1] },
    Warlock: { hd: 8, saves: ['wis', 'cha'], armor: 'light', shield: false, martial: false, key: 'cha', cast: 'pact', known: true,
        skills: [['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'], 2], sub: ['The Fiend', 1] },
    Wizard: { hd: 6, saves: ['int', 'wis'], armor: 'none', shield: false, martial: false, key: 'int', cast: 'full',
        skills: [['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'], 2], sub: ['School of Evocation', 2] }
};
const SB_CLASS_NAMES = Object.keys(SB_CLASSES);

// Which class a job leans to: [class, weight]. A profession wins over its category.
const SB_CLASS_ODDS = {
    commoner: [['Fighter', 4], ['Barbarian', 2], ['Rogue', 2], ['Ranger', 2], ['Cleric', 1], ['Druid', 1], ['Monk', 1]],
    merchant: [['Rogue', 4], ['Bard', 3], ['Fighter', 2], ['Wizard', 1], ['Cleric', 1]],
    guard: [['Fighter', 6], ['Paladin', 2], ['Ranger', 1], ['Rogue', 1], ['Cleric', 1]],
    magic: [['Wizard', 6], ['Sorcerer', 3], ['Warlock', 3], ['Druid', 1], ['Bard', 1]],
    criminal: [['Rogue', 7], ['Fighter', 2], ['Bard', 1], ['Warlock', 1], ['Ranger', 1], ['Barbarian', 1]],
    noble: [['Fighter', 3], ['Bard', 3], ['Paladin', 2], ['Rogue', 2], ['Wizard', 1], ['Sorcerer', 1], ['Warlock', 1]],
    religious: [['Cleric', 7], ['Paladin', 2], ['Druid', 2], ['Monk', 2]],
    adventurer: SB_CLASS_NAMES.map(c => [c, 1]),
    // Professions
    Barbarian: [['Barbarian', 1]], Bard: [['Bard', 1]], Cleric: [['Cleric', 1]], Druid: [['Druid', 1]], Fighter: [['Fighter', 1]],
    Monk: [['Monk', 1]], Nun: [['Monk', 1]], Monastic: [['Monk', 1]], Paladin: [['Paladin', 1]], Ranger: [['Ranger', 1]],
    Rogue: [['Rogue', 1]], Sorcerer: [['Sorcerer', 1]], Warlock: [['Warlock', 1]], Wizard: [['Wizard', 1]],
    Abjurer: [['Wizard', 1]], Diviner: [['Wizard', 1]], Enchanter: [['Wizard', 1]], Illusionist: [['Wizard', 1]],
    Necromancer: [['Wizard', 1]], Transmuter: [['Wizard', 1]], 'Hedge Wizard': [['Wizard', 1]], 'Arcane Scholar': [['Wizard', 1]],
    Artificer: [['Wizard', 1]], Alchemist: [['Wizard', 1]], 'Potion Brewer': [['Wizard', 2], ['Druid', 1]], 'Wand Maker': [['Wizard', 1]],
    'Rune Carver': [['Wizard', 2], ['Cleric', 1]], 'Golem Keeper': [['Wizard', 1]], Summoner: [['Wizard', 2], ['Warlock', 1]],
    Witch: [['Warlock', 1], ['Druid', 1]], 'Weather Witch': [['Druid', 3], ['Sorcerer', 1]], Oracle: [['Cleric', 2], ['Warlock', 1], ['Sorcerer', 1]],
    'Fortune Teller': [['Bard', 2], ['Warlock', 1]], 'Stage Magician': [['Bard', 2], ['Sorcerer', 1]], Astrologer: [['Wizard', 2], ['Cleric', 1]],
    Shaman: [['Druid', 1]], Hermit: [['Druid', 1], ['Cleric', 1], ['Monk', 1]], Templar: [['Paladin', 2], ['Fighter', 1]],
    'Temple Guardian': [['Paladin', 1], ['Fighter', 1], ['Monk', 1]], Inquisitor: [['Paladin', 1], ['Cleric', 1]], Exorcist: [['Cleric', 1]],
    Assassin: [['Rogue', 1]], Spy: [['Rogue', 3], ['Bard', 1]], Thug: [['Fighter', 2], ['Barbarian', 1]], Pirate: [['Fighter', 1], ['Rogue', 1]],
    Poacher: [['Ranger', 2], ['Rogue', 1]], Hunter: [['Ranger', 3], ['Fighter', 1]], Knight: [['Fighter', 2], ['Paladin', 1]],
    Sellsword: [['Fighter', 3], ['Barbarian', 1]], 'Caravan Guard': [['Fighter', 2], ['Ranger', 1]], Scout: [['Ranger', 2], ['Rogue', 1]],
    'Monster Hunter': [['Ranger', 2], ['Fighter', 1], ['Paladin', 1]], 'Beast Tamer': [['Ranger', 2], ['Druid', 1]],
    'Wandering Duelist': [['Fighter', 2], ['Rogue', 1], ['Bard', 1]], Explorer: [['Ranger', 2], ['Fighter', 1]],
    'Treasure Hunter': [['Rogue', 2], ['Ranger', 1]], 'Relic Hunter': [['Rogue', 2], ['Wizard', 1]], 'Dungeon Guide': [['Ranger', 1], ['Rogue', 1]]
};

// Class levels by job category: [min, max]. Age shifts the top.
const SB_LEVELS = {
    commoner: [1, 3], merchant: [1, 4], guard: [1, 6], magic: [1, 9],
    criminal: [1, 7], noble: [1, 6], religious: [1, 8], adventurer: [2, 11]
};

// ==================== RACES ====================

const SB_RACES = {
    human: { size: 'Medium', type: 'humanoid (human)', langs: ['Common'], extraLang: true },
    elf: { size: 'Medium', type: 'humanoid (elf)', langs: ['Common', 'Elvish'], dark: 60, skills: ['Perception'],
        traits: [['Fey Ancestry', 'Advantage on saving throws against being charmed, and magic can\'t put them to sleep.']] },
    dwarf: { size: 'Medium', type: 'humanoid (dwarf)', langs: ['Common', 'Dwarvish'], dark: 60, resist: ['poison'],
        traits: [['Dwarven Resilience', 'Advantage on saving throws against poison. Heavy armor doesn\'t slow them.']] },
    halfling: { size: 'Small', type: 'humanoid (halfling)', langs: ['Common', 'Halfling'],
        traits: [['Lucky', 'When they roll a 1 on an attack roll, ability check, or saving throw, they reroll the die and use the new roll.'],
            ['Brave', 'Advantage on saving throws against being frightened.']] },
    gnome: { size: 'Small', type: 'humanoid (gnome)', langs: ['Common', 'Gnomish'], dark: 60,
        traits: [['Gnome Cunning', 'Advantage on Intelligence, Wisdom, and Charisma saving throws against magic.']] },
    orc: { size: 'Medium', type: 'humanoid (orc)', langs: ['Common', 'Orc'], dark: 60, skills: ['Intimidation'],
        traits: [['Relentless Endurance', 'When reduced to 0 hit points but not killed outright, they drop to 1 hit point instead. Once per long rest.'],
            ['Savage Attacks', 'On a critical hit with a melee weapon, they roll one of the weapon\'s damage dice one more time and add it to the extra damage.']] },
    tiefling: { size: 'Medium', type: 'humanoid (tiefling)', langs: ['Common', 'Infernal'], dark: 60, resist: ['fire'],
        traits: [['Hellish Resistance', 'Resistance to fire damage.']] },
    dragonborn: { size: 'Medium', type: 'humanoid (dragonborn)', langs: ['Common', 'Draconic'] }
};
const SB_EXTRA_LANGS = ['Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Draconic', 'Sylvan', 'Celestial', 'Infernal'];

// Dragon colors (dragonborn ancestry, draconic sorcerers): damage type and breath shape.
const SB_DRAGONS = {
    Black: ['acid', 'line'], Blue: ['lightning', 'line'], Brass: ['fire', 'line'], Bronze: ['lightning', 'line'], Copper: ['acid', 'line'],
    Gold: ['fire', 'cone'], Green: ['poison', 'cone'], Red: ['fire', 'cone'], Silver: ['cold', 'cone'], White: ['cold', 'cone']
};

// ==================== GEAR ====================

// Armor: base AC, max DEX bonus (null = no cap), kind, STR needed, stealth disadvantage.
const SB_ARMOR = {
    'padded armor': [11, null, 'light', 0, true], 'leather armor': [11, null, 'light', 0, false], 'studded leather': [12, null, 'light', 0, false],
    'hide armor': [12, 2, 'medium', 0, false], 'chain shirt': [13, 2, 'medium', 0, false], 'scale mail': [14, 2, 'medium', 0, true],
    breastplate: [14, 2, 'medium', 0, false], 'half plate': [15, 2, 'medium', 0, true],
    'ring mail': [14, 0, 'heavy', 0, true], 'chain mail': [16, 0, 'heavy', 13, true], 'splint armor': [17, 0, 'heavy', 15, true], 'plate armor': [18, 0, 'heavy', 15, true]
};
// What each wealth tier (0 poor, 1 fair, 2 rich) can get, best first within a kind.
const SB_ARMOR_TIERS = {
    light: [['leather armor', 'padded armor'], ['studded leather', 'leather armor'], ['studded leather']],
    medium: [['hide armor'], ['scale mail', 'chain shirt', 'hide armor'], ['half plate', 'breastplate', 'scale mail']],
    druid: [['hide armor', 'leather armor'], ['hide armor', 'studded leather'], ['hide armor', 'studded leather']],
    heavy: [['chain mail', 'ring mail'], ['chain mail', 'ring mail'], ['plate armor', 'splint armor', 'chain mail']]
};
const SB_WEALTH = { commoner: 0, criminal: 0, religious: 0, merchant: 1, guard: 1, magic: 1, adventurer: 1, noble: 2 };

// Weapons: [dice, damage type, props]. Props: f finesse, l light, h heavy, 2 two-handed,
// v<dice> versatile, r reach, t<range> thrown, a<range> ranged (ammunition), m martial.
const SB_WEAPONS = {
    club: ['1d4', 'bludgeoning', 'l'], dagger: ['1d4', 'piercing', 'f l t20/60'], greatclub: ['1d8', 'bludgeoning', '2'],
    handaxe: ['1d6', 'slashing', 'l t20/60'], javelin: ['1d6', 'piercing', 't30/120'], 'light hammer': ['1d4', 'bludgeoning', 'l t20/60'],
    mace: ['1d6', 'bludgeoning', ''], quarterstaff: ['1d6', 'bludgeoning', 'v1d8'], sickle: ['1d4', 'slashing', 'l'],
    spear: ['1d6', 'piercing', 't20/60 v1d8'], 'light crossbow': ['1d8', 'piercing', 'a80/320 2'], dart: ['1d4', 'piercing', 'f t20/60'],
    shortbow: ['1d6', 'piercing', 'a80/320 2'], sling: ['1d4', 'bludgeoning', 'a30/120'],
    battleaxe: ['1d8', 'slashing', 'm v1d10'], flail: ['1d8', 'bludgeoning', 'm'], glaive: ['1d10', 'slashing', 'm h r 2'],
    greataxe: ['1d12', 'slashing', 'm h 2'], greatsword: ['2d6', 'slashing', 'm h 2'], halberd: ['1d10', 'slashing', 'm h r 2'],
    longsword: ['1d8', 'slashing', 'm v1d10'], maul: ['2d6', 'bludgeoning', 'm h 2'], morningstar: ['1d8', 'piercing', 'm'],
    pike: ['1d10', 'piercing', 'm h r 2'], rapier: ['1d8', 'piercing', 'm f'], scimitar: ['1d6', 'slashing', 'm f l'],
    shortsword: ['1d6', 'piercing', 'm f l'], trident: ['1d6', 'piercing', 'm t20/60 v1d8'], 'war pick': ['1d8', 'piercing', 'm'],
    warhammer: ['1d8', 'bludgeoning', 'm v1d10'], whip: ['1d4', 'slashing', 'm f r'],
    'hand crossbow': ['1d6', 'piercing', 'm a30/120 l'], 'heavy crossbow': ['1d10', 'piercing', 'm a100/400 h 2'], longbow: ['1d8', 'piercing', 'm a150/600 h 2']
};
// Simple-weapon users who also train with these.
const SB_EXTRA_WEAPONS = { Bard: ['hand crossbow', 'longsword', 'rapier', 'shortsword'], Rogue: ['hand crossbow', 'longsword', 'rapier', 'shortsword'], Monk: ['shortsword'] };

// Fighting kits: [main hand(s), off hand ('shield' or ''), backup ranged]. Picked by class and build.
const SB_KITS = {
    strTwoHand: [['greatsword', 'greataxe', 'maul', 'glaive', 'halberd'], '', ['javelin', 'handaxe', 'heavy crossbow']],
    strShield: [['longsword', 'battleaxe', 'warhammer', 'morningstar', 'flail', 'war pick', 'spear'], 'shield', ['javelin', 'handaxe', 'light crossbow']],
    dexMartial: [['rapier', 'scimitar', 'shortsword'], '', ['longbow', 'shortbow', 'hand crossbow']],
    barbarian: [['greataxe', 'greatsword', 'maul', 'battleaxe'], '', ['javelin', 'handaxe']],
    rogue: [['rapier', 'shortsword', 'dagger'], '', ['shortbow', 'hand crossbow', 'light crossbow']],
    bard: [['rapier', 'longsword', 'shortsword', 'dagger'], '', ['hand crossbow', 'light crossbow']],
    monk: [['quarterstaff', 'shortsword', 'spear'], '', ['dart']],
    cleric: [['mace', 'warhammer', 'spear', 'light hammer'], 'shield', ['light crossbow', 'sling']],
    druid: [['quarterstaff', 'scimitar', 'club', 'spear', 'sickle'], 'shield', ['sling', 'javelin']],
    caster: [['quarterstaff', 'dagger'], '', ['light crossbow', 'dart', 'sling']],
    warlock: [['dagger', 'quarterstaff', 'mace', 'spear'], '', ['light crossbow']]
};

// ==================== SPELLS ====================

// Cantrips that hit: [kind, range, die, damage type, rider]. kind: 'ranged'/'melee'
// spell attack, or the ability a target saves with.
const SB_ATTACK_CANTRIPS = {
    'Fire Bolt': ['ranged', '120 ft.', '1d10', 'fire', ''],
    'Ray of Frost': ['ranged', '60 ft.', '1d8', 'cold', 'The target\'s speed drops by 10 feet until the start of the caster\'s next turn.'],
    'Chill Touch': ['ranged', '120 ft.', '1d8', 'necrotic', 'The target can\'t regain hit points until the start of the caster\'s next turn.'],
    'Shocking Grasp': ['melee', '5 ft.', '1d8', 'lightning', 'Advantage if the target wears metal armor. The target can\'t take reactions until its next turn.'],
    'Produce Flame': ['ranged', '30 ft.', '1d8', 'fire', ''],
    'Eldritch Blast': ['ranged', '120 ft.', '1d10', 'force', ''],
    'Sacred Flame': ['dex', '60 ft.', '1d8', 'radiant', 'The target gains no benefit from cover.'],
    'Acid Splash': ['dex', '60 ft.', '1d6', 'acid', 'Can hit two creatures within 5 feet of each other.'],
    'Poison Spray': ['con', '10 ft.', '1d12', 'poison', ''],
    'Vicious Mockery': ['wis', '60 ft.', '1d4', 'psychic', 'The target has disadvantage on its next attack roll before the end of its next turn.']
};

// Spells NPCs like to have ready, by class and spell level. Anything else on the
// class's SRD list can still turn up, less often.
const SB_SPELL_PICKS = {
    Wizard: {
        0: ['Fire Bolt', 'Ray of Frost', 'Shocking Grasp', 'Mage Hand', 'Light', 'Prestidigitation', 'Minor Illusion', 'Chill Touch', 'Message'],
        1: ['Magic Missile', 'Shield', 'Mage Armor', 'Burning Hands', 'Thunderwave', 'Sleep', 'Detect Magic', 'Charm Person', 'Fog Cloud', 'Grease', 'Find Familiar', 'Color Spray'],
        2: ['Misty Step', 'Scorching Ray', 'Hold Person', 'Invisibility', 'Mirror Image', 'Web', 'Shatter', 'Suggestion', 'Blur', 'Acid Arrow', 'Darkness'],
        3: ['Fireball', 'Counterspell', 'Lightning Bolt', 'Fly', 'Dispel Magic', 'Haste', 'Slow', 'Hypnotic Pattern', 'Stinking Cloud', 'Vampiric Touch'],
        4: ['Greater Invisibility', 'Ice Storm', 'Polymorph', 'Banishment', 'Dimension Door', 'Wall of Fire', 'Black Tentacles', 'Stoneskin', 'Blight'],
        5: ['Cone of Cold', 'Wall of Force', 'Hold Monster', 'Cloudkill', 'Dominate Person', 'Telekinesis', 'Animate Objects'],
        6: ['Chain Lightning', 'Disintegrate', 'Globe of Invulnerability', 'Mass Suggestion', 'True Seeing', 'Circle of Death'],
        7: ['Finger of Death', 'Teleport', 'Delayed Blast Fireball', 'Prismatic Spray', 'Plane Shift']
    },
    Sorcerer: {
        0: ['Fire Bolt', 'Ray of Frost', 'Shocking Grasp', 'Chill Touch', 'Acid Splash', 'Mage Hand', 'Light', 'Prestidigitation', 'Minor Illusion', 'Message'],
        1: ['Magic Missile', 'Shield', 'Burning Hands', 'Mage Armor', 'Sleep', 'Thunderwave', 'Charm Person', 'Color Spray'],
        2: ['Scorching Ray', 'Misty Step', 'Hold Person', 'Mirror Image', 'Invisibility', 'Shatter', 'Web', 'Suggestion', 'Blur'],
        3: ['Fireball', 'Lightning Bolt', 'Counterspell', 'Haste', 'Fly', 'Hypnotic Pattern', 'Slow'],
        4: ['Greater Invisibility', 'Ice Storm', 'Polymorph', 'Wall of Fire', 'Banishment', 'Dimension Door'],
        5: ['Cone of Cold', 'Hold Monster', 'Dominate Person', 'Cloudkill', 'Telekinesis'],
        6: ['Chain Lightning', 'Disintegrate', 'Globe of Invulnerability', 'Mass Suggestion'],
        7: ['Finger of Death', 'Fire Storm', 'Delayed Blast Fireball', 'Teleport']
    },
    Warlock: {
        0: ['Chill Touch', 'Minor Illusion', 'Mage Hand', 'Prestidigitation', 'Poison Spray'],
        1: ['Hellish Rebuke', 'Charm Person', 'Burning Hands', 'Command', 'Expeditious Retreat', 'Protection from Evil and Good'],
        2: ['Hold Person', 'Invisibility', 'Misty Step', 'Darkness', 'Mirror Image', 'Suggestion', 'Scorching Ray', 'Ray of Enfeeblement'],
        3: ['Fireball', 'Counterspell', 'Dispel Magic', 'Fly', 'Hypnotic Pattern', 'Vampiric Touch', 'Fear', 'Stinking Cloud'],
        4: ['Banishment', 'Dimension Door', 'Blight', 'Fire Shield', 'Wall of Fire'],
        5: ['Hold Monster', 'Flame Strike', 'Scrying', 'Dream'],
        6: ['Circle of Death', 'Mass Suggestion', 'Eyebite', 'True Seeing'],
        7: ['Finger of Death', 'Plane Shift', 'Etherealness']
    },
    Bard: {
        0: ['Vicious Mockery', 'Minor Illusion', 'Mage Hand', 'Light', 'Prestidigitation', 'Message', 'Dancing Lights'],
        1: ['Healing Word', 'Hideous Laughter', 'Charm Person', 'Thunderwave', 'Sleep', 'Faerie Fire', 'Heroism', 'Bane', 'Disguise Self', 'Cure Wounds'],
        2: ['Hold Person', 'Invisibility', 'Suggestion', 'Shatter', 'Heat Metal', 'Silence', 'Enthrall', 'Calm Emotions'],
        3: ['Hypnotic Pattern', 'Dispel Magic', 'Fear', 'Major Image', 'Stinking Cloud', 'Tongues', 'Bestow Curse'],
        4: ['Greater Invisibility', 'Dimension Door', 'Polymorph', 'Confusion', 'Compulsion'],
        5: ['Hold Monster', 'Dominate Person', 'Mass Cure Wounds', 'Animate Objects', 'Geas'],
        6: ['Mass Suggestion', 'Irresistible Dance', 'Eyebite', 'True Seeing'],
        7: ['Teleport', 'Etherealness', 'Forcecage', 'Regenerate']
    },
    Cleric: {
        0: ['Sacred Flame', 'Guidance', 'Light', 'Spare the Dying', 'Thaumaturgy', 'Resistance', 'Mending'],
        1: ['Guiding Bolt', 'Healing Word', 'Shield of Faith', 'Command', 'Inflict Wounds', 'Sanctuary', 'Detect Evil and Good', 'Protection from Evil and Good'],
        2: ['Hold Person', 'Aid', 'Silence', 'Prayer of Healing', 'Blindness/Deafness', 'Augury', 'Zone of Truth'],
        3: ['Spirit Guardians', 'Dispel Magic', 'Mass Healing Word', 'Bestow Curse', 'Remove Curse', 'Daylight', 'Speak with Dead'],
        4: ['Banishment', 'Freedom of Movement', 'Stone Shape', 'Divination', 'Locate Creature'],
        5: ['Flame Strike', 'Greater Restoration', 'Insect Plague', 'Geas', 'Commune'],
        6: ['Heal', 'Harm', 'Blade Barrier', 'True Seeing', 'Word of Recall'],
        7: ['Fire Storm', 'Divine Word', 'Regenerate', 'Resurrection', 'Plane Shift']
    },
    Druid: {
        0: ['Produce Flame', 'Shillelagh', 'Guidance', 'Druidcraft', 'Poison Spray', 'Resistance'],
        1: ['Entangle', 'Cure Wounds', 'Thunderwave', 'Faerie Fire', 'Healing Word', 'Goodberry', 'Fog Cloud', 'Speak with Animals', 'Longstrider'],
        2: ['Moonbeam', 'Flaming Sphere', 'Barkskin', 'Hold Person', 'Pass Without Trace', 'Spike Growth', 'Heat Metal', 'Lesser Restoration', 'Gust of Wind'],
        3: ['Call Lightning', 'Conjure Animals', 'Dispel Magic', 'Plant Growth', 'Sleet Storm', 'Wind Wall', 'Protection From Energy'],
        4: ['Ice Storm', 'Polymorph', 'Blight', 'Freedom of Movement', 'Stoneskin', 'Giant Insect', 'Wall of Fire'],
        5: ['Insect Plague', 'Mass Cure Wounds', 'Wall of Stone', 'Tree Stride', 'Greater Restoration', 'Antilife Shell'],
        6: ['Sunbeam', 'Heal', 'Wall of Thorns', 'Transport via Plants'],
        7: ['Fire Storm', 'Regenerate', 'Plane Shift']
    },
    Paladin: {
        1: ['Bless', 'Cure Wounds', 'Shield of Faith', 'Command', 'Divine Favor', 'Heroism', 'Detect Evil and Good'],
        2: ['Aid', 'Lesser Restoration', 'Magic Weapon', 'Find Steed', 'Protection from Poison'],
        3: ['Revivify', 'Remove Curse', 'Daylight', 'Create Food and Water', 'Magic Circle'],
        4: ['Banishment', 'Death Ward', 'Locate Creature']
    },
    Ranger: {
        1: ['Hunter\'s Mark', 'Cure Wounds', 'Goodberry', 'Fog Cloud', 'Longstrider', 'Speak with Animals', 'Alarm'],
        2: ['Pass Without Trace', 'Spike Growth', 'Barkskin', 'Lesser Restoration', 'Silence', 'Darkvision', 'Find Traps'],
        3: ['Conjure Animals', 'Plant Growth', 'Protection From Energy', 'Wind Wall', 'Nondetection', 'Daylight'],
        4: ['Freedom of Movement', 'Stoneskin', 'Locate Creature']
    }
};

// Wizard jobs that favor a school.
const SB_SCHOOLS = {
    Abjurer: 'Abjuration', Diviner: 'Divination', Enchanter: 'Enchantment', Illusionist: 'Illusion', Necromancer: 'Necromancy',
    Transmuter: 'Transmutation', Summoner: 'Conjuration', Alchemist: 'Transmutation', Astrologer: 'Divination', 'Stage Magician': 'Illusion'
};

// Subclass spells: always prepared, by the class level they arrive.
const SB_BONUS_SPELLS = {
    Cleric: { 1: ['Bless', 'Cure Wounds'], 3: ['Lesser Restoration', 'Spiritual Weapon'], 5: ['Beacon of Hope', 'Revivify'],
        7: ['Death Ward', 'Guardian of Faith'], 9: ['Mass Cure Wounds', 'Raise Dead'] },
    Paladin: { 3: ['Protection from Evil and Good', 'Sanctuary'], 5: ['Lesser Restoration', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'],
        13: ['Freedom of Movement', 'Guardian of Faith'] }
};
// Circle of the Land: the druid's land and its circle spells (from druid level 3).
const SB_LANDS = {
    Arctic: { 3: ['Hold Person', 'Spike Growth'], 5: ['Sleet Storm', 'Slow'], 7: ['Freedom of Movement', 'Ice Storm'], 9: ['Commune With Nature', 'Cone of Cold'] },
    Coast: { 3: ['Mirror Image', 'Misty Step'], 5: ['Water Breathing', 'Water Walk'], 7: ['Control Water', 'Freedom of Movement'], 9: ['Conjure Elemental', 'Scrying'] },
    Desert: { 3: ['Blur', 'Silence'], 5: ['Create Food and Water', 'Protection From Energy'], 7: ['Blight', 'Hallucinatory Terrain'], 9: ['Insect Plague', 'Wall of Stone'] },
    Forest: { 3: ['Barkskin', 'Spider Climb'], 5: ['Call Lightning', 'Plant Growth'], 7: ['Divination', 'Freedom of Movement'], 9: ['Commune With Nature', 'Tree Stride'] },
    Grassland: { 3: ['Invisibility', 'Pass Without Trace'], 5: ['Daylight', 'Haste'], 7: ['Divination', 'Freedom of Movement'], 9: ['Dream', 'Insect Plague'] },
    Mountain: { 3: ['Spider Climb', 'Spike Growth'], 5: ['Lightning Bolt', 'Meld Into Stone'], 7: ['Stone Shape', 'Stoneskin'], 9: ['Passwall', 'Wall of Stone'] },
    Swamp: { 3: ['Acid Arrow', 'Darkness'], 5: ['Water Walk', 'Stinking Cloud'], 7: ['Freedom of Movement', 'Locate Creature'], 9: ['Insect Plague', 'Scrying'] },
    Underdark: { 3: ['Spider Climb', 'Web'], 5: ['Gaseous Form', 'Stinking Cloud'], 7: ['Greater Invisibility', 'Stone Shape'], 9: ['Cloudkill', 'Insect Plague'] }
};
// The Fiend's expanded spells.
const SB_FIEND_SPELLS = { 1: ['Burning Hands', 'Command'], 2: ['Blindness/Deafness', 'Scorching Ray'], 3: ['Fireball', 'Stinking Cloud'],
    4: ['Fire Shield', 'Wall of Fire'], 5: ['Flame Strike', 'Hallow'] };

// The Fiend's expanded list joins the warlock's picks.
Object.entries(SB_FIEND_SPELLS).forEach(([l, names]) => {
    SB_SPELL_PICKS.Warlock[l] = [...new Set([...(SB_SPELL_PICKS.Warlock[l] || []), ...names])];
});

// Slots by caster level (index 0 = 1st-level slots).
const SB_FULL_SLOTS = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const SB_HALF_SLOTS = [[], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
    [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
// Spells known by level (index = class level).
const SB_KNOWN = {
    Bard: [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    Sorcerer: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    Warlock: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    Ranger: [0, 0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
};
// Cantrips known at levels 1 / 4 / 10.
const SB_CANTRIPS = { Bard: [2, 3, 4], Cleric: [3, 4, 5], Druid: [2, 3, 4], Sorcerer: [4, 5, 6], Warlock: [2, 3, 4], Wizard: [3, 4, 5] };

const SB_INVOCATIONS = [
    ['Agonizing Blast', 'Adds their Charisma modifier to eldritch blast damage.'],
    ['Armor of Shadows', 'Can cast mage armor on themselves at will.'],
    ['Devil\'s Sight', 'Sees normally in darkness, magical or not, out to 120 feet.'],
    ['Repelling Blast', 'An eldritch blast beam that hits pushes the target 10 feet away.'],
    ['Mask of Many Faces', 'Can cast disguise self at will.'],
    ['Fiendish Vigor', 'Can cast false life on themselves at will as a 1st-level spell.'],
    ['Eldritch Spear', 'Eldritch blast has a range of 300 feet.'],
    ['Misty Visions', 'Can cast silent image at will.'],
    ['Beguiling Influence', 'Proficient in Deception and Persuasion.']
];
const SB_METAMAGIC = ['Quickened Spell', 'Twinned Spell', 'Careful Spell', 'Subtle Spell', 'Empowered Spell', 'Heightened Spell', 'Distant Spell', 'Extended Spell'];
const SB_FAVORED = ['undead', 'fiends', 'beasts', 'monstrosities', 'giants', 'aberrations', 'goblinoids and orcs', 'fey'];
const SB_TERRAIN = ['forest', 'mountain', 'swamp', 'grassland', 'coast', 'arctic', 'desert', 'Underdark'];

// Magic items an NPC might carry (all SRD 5.1). 'weapon+N' and the protective items change the numbers.
const SB_ITEMS = {
    uncommon: ['weapon+1', 'Cloak of Protection', 'Bag of Holding', 'Boots of Elvenkind', 'Cloak of Elvenkind', 'Goggles of Night',
        'Hat of Disguise', 'Eyes of the Eagle', 'Gloves of Swimming and Climbing', 'Helm of Comprehending Languages',
        'Periapt of Wound Closure', 'Decanter of Endless Water', 'Rope of Climbing'],
    uncommonCaster: ['Wand of Magic Missiles', 'Wand of Web', 'Pearl of Power'],
    rare: ['weapon+2', 'Ring of Protection', 'Cloak of Displacement', 'Ring of Evasion', 'Boots of Speed', 'Necklace of Adaptation', 'Cape of the Mountebank'],
    rareCaster: ['Wand of Fireballs', 'Wand of Lightning Bolts', 'Staff of Charming']
};

const SB_CR = [[1, '1/4', 50], [2, '1/2', 100], [3, '1', 200], [5, '2', 450], [7, '3', 700], [9, '4', 1100], [11, '5', 1800], [13, '6', 2300], [14, '7', 2900], [16, '8', 3900], [18, '9', 5000], [20, '10', 5900]];
const SB_SKILL_ABILITY = {
    Acrobatics: 'dex', 'Animal Handling': 'wis', Arcana: 'int', Athletics: 'str', Deception: 'cha', History: 'int', Insight: 'wis',
    Intimidation: 'cha', Investigation: 'int', Medicine: 'wis', Nature: 'int', Perception: 'wis', Performance: 'cha', Persuasion: 'cha',
    Religion: 'int', 'Sleight of Hand': 'dex', Stealth: 'dex', Survival: 'wis'
};
// Skills a job brings, on top of the class's.
const SB_JOB_SKILLS = {
    commoner: ['Athletics', 'Animal Handling', 'Survival', 'Nature'], merchant: ['Persuasion', 'Insight', 'Deception'],
    guard: ['Perception', 'Athletics', 'Intimidation', 'Insight'], magic: ['Arcana', 'History', 'Investigation'],
    criminal: ['Stealth', 'Deception', 'Sleight of Hand'], noble: ['History', 'Persuasion', 'Insight'],
    religious: ['Religion', 'Insight', 'Medicine'], adventurer: ['Perception', 'Survival', 'Athletics']
};
const SB_ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const SB_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// ==================== HELPERS ====================

function sbSigned(n) { return n >= 0 ? `+${n}` : `−${Math.abs(n)}`; }
function sbOrdinal(n) { return n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); }

function sbWeighted(pairs) {
    let r = rand() * pairs.reduce((a, p) => a + p[1], 0);
    for (const p of pairs) if ((r -= p[1]) < 0) return p[0];
    return pairs[pairs.length - 1][0];
}

// "2d6 + 3" → average and text, e.g. sbDamage('1d8', 3) = { avg: 7, text: '7 (1d8 + 3)' }.
function sbDamage(dice, mod, extraDice = '') {
    const parts = [dice, extraDice].filter(Boolean);
    let avg = mod;
    parts.forEach(d => { const [n, s] = d.split('d').map(Number); avg += n * (s + 1) / 2; });
    avg = Math.max(1, Math.floor(avg));
    const modText = mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : '';
    return `${avg} (${parts.join(' + ')}${modText})`;
}

// Does a weapon have this property? (sbProp('greataxe', 'h') → true)
function sbProp(weapon, flag) {
    return SB_WEAPONS[weapon][2].split(' ').includes(flag);
}

function sbPronouns(gender) {
    return { male: ['he', 'his', 'him'], female: ['she', 'her', 'her'] }[gender] || ['they', 'their', 'them'];
}

function sbSpell(name) {
    return typeof SPELLS_DATA !== 'undefined' ? SPELLS_DATA.find(s => s.name === name) : null;
}

// ==================== ROLL ====================

// npc: from rollNPC. force (optional): { cls, level }, either one, from the pickers
// or a lock. Call inside withSeed so the same seed gives the same block.
function rollStatBlock(npc, force = null) {
    const cat = npc.professionCategory;
    const mods = s => Object.fromEntries(SB_ABILITIES.map(k => [k, npcMod(s[k])]));

    // Class and level always draw, so a forced block rolls the rest the same way.
    const base = { ...npc.stats };
    const baseMods = mods(base);
    const odds = SB_CLASS_ODDS[npc.profession] || SB_CLASS_ODDS[cat] || SB_CLASS_ODDS.adventurer;
    // Classes that suit the NPC's best scores come up more.
    const rolledCls = sbWeighted(odds.map(([c, w]) => [c, w * Math.pow(2, baseMods[SB_CLASSES[c].key])]));
    const [lo, hiBase] = SB_LEVELS[cat] || [1, 4];
    const hi = hiBase + { young: -Math.ceil(hiBase / 3), adult: 0, middle: 1, old: 1, ancient: 2 }[npc.ageBucket || 'adult'];
    const rolledLevel = Math.min(20, Math.max(1, lo + Math.floor(Math.pow(rand(), 1.5) * (Math.max(lo, hi) - lo + 1))));
    const cls = force && SB_CLASSES[force.cls] ? force.cls : rolledCls;
    const level = force && force.level >= 1 && force.level <= 20 ? Math.floor(force.level) : rolledLevel;
    const C = SB_CLASSES[cls];
    const R = SB_RACES[npc.race] || SB_RACES.human;
    const [he, his, him] = sbPronouns(npc.gender);
    const has = he === 'they' ? 'have' : 'has';
    const who = npc.firstName || 'The NPC';
    const prof = 2 + Math.floor((level - 1) / 4);

    // Ability Score Improvements: +2 to the key score (then the next best) at 4, 8, 12,
    // plus the fighter's 6 and 14 and the rogue's 10.
    const stats = { ...base };
    const asiLevels = [4, 8, 12, 16, 19, ...(cls === 'Fighter' ? [6, 14] : []), ...(cls === 'Rogue' ? [10] : [])].filter(l => l <= level);
    const asiKeys = {
        Barbarian: ['str', 'con'], Bard: ['cha', 'dex'], Cleric: ['wis', 'con'], Druid: ['wis', 'con'],
        Fighter: base.dex > base.str ? ['dex', 'con'] : ['str', 'con'], Monk: ['dex', 'wis'], Paladin: ['str', 'cha'],
        Ranger: ['dex', 'wis'], Rogue: ['dex', 'con'], Sorcerer: ['cha', 'con'], Warlock: ['cha', 'con'], Wizard: ['int', 'con']
    }[cls];
    asiLevels.forEach(() => {
        let pts = 2;
        asiKeys.forEach(k => { const add = Math.min(pts, 20 - stats[k]); stats[k] += Math.max(0, add); pts -= Math.max(0, add); });
    });
    const m = mods(stats);

    const next = rand;
    const pick = list => list[Math.floor(next() * list.length)];
    // n different entries from list, in a random order.
    const pickSome = (list, n) => list.map(x => [x, next()]).sort((a, b) => a[1] - b[1]).slice(0, n).map(p => p[0]);

    // ---------- Weapons ----------
    const dexBuild = m.dex > m.str;
    let kitName = {
        Barbarian: 'barbarian', Rogue: 'rogue', Bard: 'bard', Monk: 'monk', Cleric: 'cleric', Druid: 'druid',
        Wizard: 'caster', Sorcerer: 'caster', Warlock: 'warlock'
    }[cls];
    const kitRoll = next();
    if (!kitName) kitName = dexBuild || cls === 'Ranger' ? 'dexMartial' : (kitRoll < 0.5 ? 'strTwoHand' : 'strShield');
    if (cls === 'Paladin' && kitName === 'dexMartial') kitName = 'strShield';
    // Small folk skip heavy weapons (they'd attack with disadvantage).
    const small = R.size === 'Small';
    if (small && kitName === 'strTwoHand') kitName = 'strShield';
    const kit = SB_KITS[kitName];
    const light = list => small ? list.filter(w => !sbProp(w, 'h')) : list;
    const mainName = pick(light(kit[0]).length ? light(kit[0]) : ['battleaxe', 'warhammer']);
    const rangedName = pick(light(kit[2]).length ? light(kit[2]) : ['handaxe']);
    const useShield = kit[1] === 'shield' && C.shield && !sbProp(mainName, '2');

    // ---------- Fighting style ----------
    let style = '';
    if (cls === 'Fighter' || (cls === 'Paladin' && level >= 2) || (cls === 'Ranger' && level >= 2)) {
        if (kitName === 'strTwoHand' && cls !== 'Ranger') style = 'Great Weapon Fighting';
        else if (kitName === 'dexMartial' && cls !== 'Paladin') style = 'Archery';
        else style = next() < 0.5 ? 'Dueling' : 'Defense';
    }

    // ---------- Dragon color (dragonborn, draconic sorcerer) ----------
    const scaleColor = (npc.hair || '').split(' ')[0];
    const dragonColor = SB_DRAGONS[scaleColor] ? scaleColor : pick(Object.keys(SB_DRAGONS));

    // ---------- Magic item and potions ----------
    const wealth = Math.min(2, (SB_WEALTH[cat] ?? 1) + (level >= 5 ? 1 : 0));
    const isCaster = !!C.cast && cls !== 'Paladin' && cls !== 'Ranger';
    const itemChance = level < 4 ? 0 : 0.15 + (level - 4) * 0.06 + (cat === 'noble' ? 0.15 : 0);
    const itemRoll = next(), rareRoll = next(), itemPick = next();
    let item = '';
    if (itemRoll < itemChance) {
        const rare = level >= 9 && rareRoll < 0.4;
        const pool = rare ? [...SB_ITEMS.rare, ...(isCaster ? SB_ITEMS.rareCaster : [])] : [...SB_ITEMS.uncommon, ...(isCaster ? SB_ITEMS.uncommonCaster : [])];
        item = pool[Math.floor(itemPick * pool.length)];
    }
    const potions = Math.floor(next() * (wealth + 1 + (cat === 'adventurer' ? 1 : 0)));
    const extraLang = pick(SB_EXTRA_LANGS.filter(l => !R.langs.includes(l)));
    const land = pick(Object.keys(SB_LANDS));
    const favored = pick(SB_FAVORED), terrain = pick(SB_TERRAIN);
    const pactRoll = next();

    // ---------- Armor Class ----------
    const armorKinds = { heavy: ['heavy', 'medium', 'light'], medium: ['medium', 'light'], druid: ['druid'], light: ['light'], none: [] }[C.armor];
    // Life clerics wear heavy armor; others of the class would stop at medium.
    const options = [];
    armorKinds.forEach(kind => SB_ARMOR_TIERS[kind][wealth].forEach(a => {
        const [acBase, cap, armorKind, strReq] = SB_ARMOR[a];
        if (stats.str < strReq) return;
        const dexPart = armorKind === 'heavy' ? 0 : cap === null ? m.dex : Math.min(cap, m.dex);
        options.push([a, acBase + dexPart]);
    }));
    let armor = '', ac = 10 + m.dex, acNote = '';
    if (options.length) {
        options.sort((a, b) => b[1] - a[1]);
        [armor, ac] = options[0];
    }
    if (cls === 'Barbarian' && 10 + m.dex + m.con >= ac) { armor = ''; ac = 10 + m.dex + m.con; acNote = 'Unarmored Defense'; }
    if (cls === 'Monk') { ac = 10 + m.dex + m.wis; acNote = 'Unarmored Defense'; }
    if (cls === 'Sorcerer') { ac = 13 + m.dex; acNote = 'Draconic Resilience'; }
    if (useShield) ac += 2;
    if (style === 'Defense' && armor) ac += 1;
    if (item === 'Cloak of Protection' || item === 'Ring of Protection') ac += 1;
    const acParts = [armor, useShield && 'shield', acNote, (item === 'Cloak of Protection' || item === 'Ring of Protection') && item.toLowerCase()].filter(Boolean);

    // ---------- Hit points ----------
    const hpPer = cls === 'Sorcerer' ? 1 : 0;
    const hp = Math.max(level, C.hd + (level - 1) * (C.hd / 2 + 1) + level * (m.con + hpPer));

    // ---------- Speed ----------
    let speed = parseInt(npc.speed, 10) || 30;
    if (cls === 'Barbarian' && level >= 5 && SB_ARMOR[armor]?.[2] !== 'heavy') speed += 10;
    if (cls === 'Monk' && level >= 2) speed += level >= 10 ? 20 : level >= 6 ? 15 : 10;

    // ---------- Saves and skills ----------
    const saveBonus = (item === 'Cloak of Protection' || item === 'Ring of Protection') ? 1 : 0;
    const saves = C.saves.map(k => `${k.charAt(0).toUpperCase() + k.slice(1, 3)} ${sbSigned(m[k] + prof + saveBonus)}`);
    const skillSet = new Set(R.skills || []);
    const jobSkill = (SB_JOB_SKILLS[cat] || []).map(s => [s, m[SB_SKILL_ABILITY[s]] + next()]).sort((a, b) => b[1] - a[1]).map(p => p[0])[0];
    if (jobSkill) skillSet.add(jobSkill);
    const classPool = C.skills[0].filter(s => !skillSet.has(s))
        .map(s => [s, m[SB_SKILL_ABILITY[s]] + next() * 2]).sort((a, b) => b[1] - a[1]);
    classPool.slice(0, C.skills[1]).forEach(([s]) => skillSet.add(s));
    const expertise = new Set();
    const expertCount = cls === 'Rogue' ? (level >= 6 ? 4 : 2) : cls === 'Bard' ? (level >= 10 ? 4 : level >= 3 ? 2 : 0) : 0;
    [...skillSet].sort((a, b) => m[SB_SKILL_ABILITY[b]] - m[SB_SKILL_ABILITY[a]]).slice(0, expertCount).forEach(s => expertise.add(s));
    const skillBonus = s => m[SB_SKILL_ABILITY[s]] + prof * (expertise.has(s) ? 2 : 1);

    // ---------- Spells ----------
    const maDie = level >= 17 ? '1d10' : level >= 11 ? '1d8' : level >= 5 ? '1d6' : '1d4';
    const rageDmg = level >= 16 ? 4 : level >= 9 ? 3 : 2;
    const spellMod = m[C.key];
    const spellDC = 8 + prof + spellMod;
    const spellAtk = prof + spellMod;
    let spellcasting = null;
    const usedSpells = new Set();
    const spellPool = (klass, lvl) => {
        const curated = (SB_SPELL_PICKS[klass] && SB_SPELL_PICKS[klass][lvl]) || [];
        const all = typeof SPELLS_DATA !== 'undefined' ? SPELLS_DATA.filter(s => s.level === lvl && s.classes.includes(klass)).map(s => s.name) : [];
        const names = [...new Set([...curated, ...all])].filter(n => !usedSpells.has(n));
        const school = klass === 'Wizard' && SB_SCHOOLS[npc.profession];
        return names.map(n => {
            let w = curated.includes(n) ? 4 : 1;
            if (school && (sbSpell(n) || {}).school === school) w *= 4;
            return [n, w];
        });
    };
    const drawSpells = (klass, lvl, count) => {
        const out = [];
        for (let i = 0; i < count; i++) {
            const pool = spellPool(klass, lvl);
            const r = rand(); // always draw
            if (!pool.length) continue;
            let x = r * pool.reduce((a, p) => a + p[1], 0);
            const choice = (pool.find(p => (x -= p[1]) < 0) || pool[pool.length - 1])[0];
            usedSpells.add(choice);
            out.push(choice);
        }
        return out;
    };
    // Share out a total across spell levels, fewer at the top.
    const spread = (maxLevel, total) => {
        const want = Array.from({ length: maxLevel }, (_, i) => (i + 1 === maxLevel && maxLevel > 1 ? 2 : 3));
        while (want.reduce((a, b) => a + b, 0) > total && want.some(w => w > 1)) {
            const top = Math.max(...want);
            want[want.indexOf(top)]--;
        }
        return want;
    };

    if (C.cast && (C.cast !== 'half' || level >= 2)) {
        const cantripCount = SB_CANTRIPS[cls] ? SB_CANTRIPS[cls][level >= 10 ? 2 : level >= 4 ? 1 : 0] : 0;
        const cantrips = [];
        if (cls === 'Warlock') { cantrips.push('Eldritch Blast'); usedSpells.add('Eldritch Blast'); }
        if (cls === 'Cleric' && !usedSpells.has('Sacred Flame')) { cantrips.push('Sacred Flame'); usedSpells.add('Sacred Flame'); }
        cantrips.push(...drawSpells(cls, 0, Math.max(0, cantripCount - cantrips.length)));
        // Casters want at least one cantrip that hits.
        if (cantripCount && !cantrips.some(c => SB_ATTACK_CANTRIPS[c])) {
            const hit = (SB_SPELL_PICKS[cls][0] || []).find(c => SB_ATTACK_CANTRIPS[c]);
            if (hit) cantrips[cantrips.length - 1] = hit;
        }
        const bonus = {}; // spell level -> [names], always prepared
        const addBonus = (name, why) => {
            const s = sbSpell(name);
            const lvl = s ? s.level : 1;
            (bonus[lvl] = bonus[lvl] || []).push({ name, why });
            usedSpells.add(name);
        };
        if (SB_BONUS_SPELLS[cls]) Object.entries(SB_BONUS_SPELLS[cls]).forEach(([l, names]) => {
            if (level >= +l) names.forEach(n => addBonus(n, C.sub[0]));
        });
        if (cls === 'Druid' && level >= 3) Object.entries(SB_LANDS[land]).forEach(([l, names]) => {
            if (level >= +l) names.forEach(n => addBonus(n, `Circle of the Land (${land})`));
        });

        let lines = [], slotsText = '';
        if (cls === 'Warlock') {
            const slotLevel = Math.min(5, Math.ceil(level / 2));
            const slots = level >= 11 ? 3 : level >= 2 ? 2 : 1;
            const known = SB_KNOWN.Warlock[level];
            const per = spread(slotLevel, known);
            const names = [];
            per.forEach((n, i) => names.push(...drawSpells('Warlock', i + 1, n)));
            lines.push({ label: 'Cantrips (at will)', spells: cantrips });
            lines.push({ label: `1st–${sbOrdinal(slotLevel)} level (${slots} ${sbOrdinal(slotLevel)}-level slot${slots > 1 ? 's' : ''})`, spells: names });
            if (level >= 11) lines.push({ label: '6th level (1/day, Mystic Arcanum)', spells: drawSpells('Warlock', 6, 1) });
            if (level >= 13) lines.push({ label: '7th level (1/day, Mystic Arcanum)', spells: drawSpells('Warlock', 7, 1) });
            if (level >= 15) lines.push({ label: '8th level (1/day, Mystic Arcanum)', spells: drawSpells('Warlock', 8, 1) });
            if (level >= 17) lines.push({ label: '9th level (1/day, Mystic Arcanum)', spells: drawSpells('Warlock', 9, 1) });
            slotsText = 'regains its spell slots on a short or long rest';
        } else {
            const slots = (C.cast === 'half' ? SB_HALF_SLOTS : SB_FULL_SLOTS)[level];
            const total = C.known ? SB_KNOWN[cls][level]
                : Math.max(1, spellMod + (C.cast === 'half' ? Math.floor(level / 2) : level));
            const per = spread(slots.length, total);
            if (cantrips.length) lines.push({ label: 'Cantrips (at will)', spells: cantrips });
            slots.forEach((n, i) => {
                const lvl = i + 1;
                const picks = drawSpells(cls, lvl, per[i]);
                const always = (bonus[lvl] || []).map(b => b.name);
                lines.push({ label: `${sbOrdinal(lvl)} level (${n} slot${n > 1 ? 's' : ''})`, spells: [...always, ...picks], marked: always });
            });
            // Lore bards learn two spells from any list at 6th level.
            if (cls === 'Bard' && level >= 6) {
                const top = Math.min(3, slots.length);
                const secrets = [...drawSpells('Wizard', top, 1), ...drawSpells('Cleric', Math.min(top, 3), 1)];
                secrets.forEach(n => {
                    const s = sbSpell(n);
                    const line = lines.find(l => l.label.startsWith(sbOrdinal(s ? s.level : top) + ' '));
                    if (line) { line.spells.push(n); (line.marked = line.marked || []).push(n); }
                });
            }
        }
        const markWhy = cls === 'Bard' ? 'Magical Secrets (from another class\'s list)'
            : cls === 'Druid' ? `Circle of the Land (${land}) spell, always prepared` : `${C.sub[0]} spell, always prepared`;
        spellcasting = {
            ability: SB_ABILITY_NAMES[C.key], dc: spellDC, attack: spellAtk, lines, markWhy,
            prepared: !C.known, focus: { Wizard: 'spellbook and arcane focus', Sorcerer: 'arcane focus', Warlock: 'arcane focus',
                Cleric: 'holy symbol', Paladin: 'holy symbol', Druid: 'druidic focus', Bard: 'musical instrument', Ranger: '' }[cls],
            note: slotsText
        };
    }

    // Unarmored casters with mage armor on hand.
    if (!armor && !acNote && spellcasting && spellcasting.lines.some(l => l.spells.includes('Mage Armor')))
        acParts.push(`${13 + m.dex} with mage armor`);

    // ---------- Attacks ----------
    const magicPlus = item === 'weapon+1' ? 1 : item === 'weapon+2' ? 2 : 0;
    const weaponLine = (name, plus) => {
        const [dice, type, props] = SB_WEAPONS[name];
        const thrown = (props.match(/t(\d+\/\d+)/) || [])[1];
        const range = (props.match(/a(\d+\/\d+)/) || [])[1];
        const isRanged = range !== undefined;
        const finesse = sbProp(name, 'f');
        let abil = isRanged ? 'dex' : finesse && m.dex > m.str ? 'dex' : 'str';
        if (cls === 'Monk' && (name === 'shortsword' || name === 'quarterstaff' || name === 'spear' || name === 'dart') && m.dex > m.str) abil = 'dex';
        let hit = m[abil] + prof + plus;
        let dmgMod = m[abil] + plus;
        if (isRanged && style === 'Archery') hit += 2;
        const oneHand = !sbProp(name, '2') && !isRanged;
        if (style === 'Dueling' && oneHand) dmgMod += 2;
        // Monk weapons use the martial arts die when it's bigger.
        let die = dice;
        if (cls === 'Monk' && !isRanged) {
            if (+maDie.slice(2) > +dice.slice(2) && dice.startsWith('1d')) die = maDie;
        }
        const reach = sbProp(name, 'r') ? 10 : 5;
        const throwOnly = name === 'dart';
        const kind = isRanged || throwOnly ? 'Ranged Weapon Attack' : thrown ? 'Melee or Ranged Weapon Attack' : 'Melee Weapon Attack';
        const where = isRanged ? `range ${range} ft.` : throwOnly ? `range ${thrown} ft.` : thrown ? `reach ${reach} ft. or range ${thrown} ft.` : `reach ${reach} ft.`;
        const label = (plus ? `+${plus} ` : '') + name.charAt(0).toUpperCase() + name.slice(1);
        let text = `${kind}: ${sbSigned(hit)} to hit, ${where}, one target. Hit: ${sbDamage(die, dmgMod)} ${type} damage`;
        const vers = (props.match(/v(\d+d\d+)/) || [])[1];
        if (vers && !useShield) text += `, or ${sbDamage(vers, style === 'Dueling' ? dmgMod - 2 : dmgMod)} ${type} damage if used with two hands`;
        if (cls === 'Druid' && (name === 'quarterstaff' || name === 'club') && spellcasting && spellcasting.lines.some(l => l.spells.includes('Shillelagh')))
            text += `, or ${sbDamage('1d8', m.wis + plus)} bludgeoning damage (+${m.wis + prof + plus} to hit) with shillelagh`;
        if (cls === 'Barbarian' && !isRanged) text += `, plus ${rageDmg} while raging`;
        return { name: label, text: text + '.' };
    };
    const actions = [];
    const extraAttacks = (cls === 'Fighter' && level >= 20) ? 4 : (cls === 'Fighter' && level >= 11) ? 3 : (['Fighter', 'Paladin', 'Ranger', 'Barbarian', 'Monk'].includes(cls) && level >= 5) ? 2 : 1;
    const mainLabel = (magicPlus ? `+${magicPlus} ` : '') + mainName;
    if (extraAttacks > 1) actions.push({ name: 'Multiattack', text: `${who} makes ${['', '', 'two', 'three', 'four'][extraAttacks]} attacks with ${his} ${mainLabel}${kitName === 'dexMartial' ? ` or ${rangedName}` : ''}.` });
    if (cls === 'Monk') {
        const abil = m.dex >= m.str ? 'dex' : 'str';
        actions.push({ name: 'Unarmed Strike', text: `Melee Weapon Attack: ${sbSigned(m[abil] + prof)} to hit, reach 5 ft., one target. Hit: ${sbDamage(maDie, m[abil])} bludgeoning damage.` });
    }
    actions.push(weaponLine(mainName, magicPlus));
    if (rangedName !== mainName) actions.push(weaponLine(rangedName, 0));
    // Damage cantrips as actions.
    if (spellcasting) {
        const tier = level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
        const cantrips = (spellcasting.lines[0] && spellcasting.lines[0].label.startsWith('Cantrips') ? spellcasting.lines[0].spells : []);
        cantrips.filter(c => SB_ATTACK_CANTRIPS[c]).slice(0, 2).forEach(c => {
            const [kind, range, die, type, rider] = SB_ATTACK_CANTRIPS[c];
            const invs = level >= 2 && cls === 'Warlock';
            if (c === 'Eldritch Blast') {
                const agon = invs ? m.cha : 0;
                actions.push({ name: 'Eldritch Blast (Cantrip)', text: `Ranged Spell Attack: ${sbSigned(spellAtk)} to hit, range 120 ft., one creature. ${tier > 1 ? `${tier} beams, each a separate attack roll. ` : ''}Hit: ${sbDamage(die, agon)} force damage${tier > 1 ? ' per beam' : ''}.` });
                return;
            }
            const dice = `${tier}d${die.split('d')[1]}`;
            const text = kind === 'ranged' || kind === 'melee'
                ? `${kind === 'ranged' ? 'Ranged' : 'Melee'} Spell Attack: ${sbSigned(spellAtk)} to hit, ${kind === 'ranged' ? 'range' : 'reach'} ${range}, one creature. Hit: ${sbDamage(dice, 0)} ${type} damage.`
                : `One creature within ${range} must succeed on a DC ${spellDC} ${SB_ABILITY_NAMES[kind]} saving throw or take ${sbDamage(dice, 0)} ${type} damage.`;
            actions.push({ name: `${c} (Cantrip)`, text: rider ? `${text} ${rider}` : text });
        });
    }

    // ---------- Features ----------
    const traits = [], bonusActions = [], reactions = [];
    const add = (list, name, text) => list.push({ name, text });
    (R.traits || []).forEach(([n, t]) => add(traits, n, t));
    if (npc.race === 'tiefling') add(traits, 'Infernal Legacy', `Knows thaumaturgy${level >= 3 ? `; can cast hellish rebuke as a 2nd-level spell${level >= 5 ? ' and darkness' : ''} once per long rest each (spell save DC ${8 + prof + m.cha})` : ''}.`);
    if (npc.race === 'dragonborn') {
        const [type, shape] = SB_DRAGONS[dragonColor];
        const breathDice = level >= 16 ? '5d6' : level >= 11 ? '4d6' : level >= 6 ? '3d6' : '2d6';
        add(actions, 'Breath Weapon (Recharges after a Short or Long Rest)', `${shape === 'cone' ? 'A 15-foot cone' : 'A 5-by-30-foot line'} of ${type}. Each creature in it makes a DC ${8 + m.con + prof} ${type === 'poison' || type === 'cold' ? 'Constitution' : 'Dexterity'} saving throw, taking ${sbDamage(breathDice, 0)} ${type} damage on a failed save, or half as much on a success.`);
        add(traits, 'Draconic Ancestry', `${dragonColor} dragon. Resistance to ${type} damage.`);
    }

    const feats = {
        Barbarian: () => {
            const rages = level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
            add(bonusActions, `Rage (${rages}/Day)`, `For 1 minute: advantage on Strength checks and saves, +${rageDmg} to melee weapon damage, and resistance to bludgeoning, piercing, and slashing damage.`);
            if (level >= 2) add(traits, 'Reckless Attack', `Can attack with advantage on Strength melee attacks this turn; attacks against ${him} have advantage until ${his} next turn.`);
            if (level >= 2) add(traits, 'Danger Sense', 'Advantage on Dexterity saves against effects they can see.');
            if (level >= 3) add(bonusActions, 'Frenzy', `While raging in a frenzy, makes one melee weapon attack as a bonus action each turn (gains a level of exhaustion when the rage ends).`);
            if (level >= 7) add(traits, 'Feral Instinct', 'Advantage on initiative rolls.');
            if (level >= 9) add(traits, 'Brutal Critical', `Rolls ${level >= 13 ? 'two' : 'one'} extra weapon damage die on a critical hit.`);
            if (level >= 11) add(traits, 'Relentless Rage', 'When dropped to 0 hit points while raging, a DC 10 Constitution save (+5 per later use) leaves them at 1 instead.');
        },
        Bard: () => {
            const die = level >= 15 ? 'd12' : level >= 10 ? 'd10' : level >= 5 ? 'd8' : 'd6';
            add(bonusActions, `Bardic Inspiration (${Math.max(1, m.cha)}/${level >= 5 ? 'Short Rest' : 'Day'})`, `A creature within 60 feet that can hear ${npc.firstName || 'them'} gains a ${die} to add to one ability check, attack roll, or saving throw.`);
            if (level >= 2) add(traits, 'Jack of All Trades', `Adds +${Math.floor(prof / 2)} to ability checks they aren't proficient in.`);
            if (level >= 3) add(reactions, 'Cutting Words', `When a creature within 60 feet makes an attack roll, ability check, or damage roll, spends a Bardic Inspiration to subtract a ${die} from it.`);
            if (level >= 6) add(traits, 'Countercharm', 'Can perform to give nearby allies advantage on saves against being frightened or charmed.');
        },
        Cleric: () => {
            add(traits, 'Disciple of Life', 'Healing spells of 1st level or higher restore an extra 2 + the spell\'s level hit points.');
            if (level >= 2) {
                const uses = level >= 18 ? 3 : level >= 6 ? 2 : 1;
                add(actions, `Channel Divinity (${uses}/Short Rest)`, `Turn Undead: each undead within 30 feet makes a DC ${spellDC} Wisdom save or is turned for 1 minute${level >= 5 ? ` (destroyed if CR ${level >= 14 ? 3 : level >= 11 ? 2 : level >= 8 ? 1 : '1/2'} or lower)` : ''}. Or Preserve Life: share out ${5 * level} hit points among creatures within 30 feet.`);
            }
            if (level >= 6) add(traits, 'Blessed Healer', 'Healing someone else with a spell also heals them 2 + the spell\'s level.');
            if (level >= 8) add(traits, 'Divine Strike', `Once per turn, a weapon hit deals an extra ${level >= 14 ? '2d8' : '1d8'} radiant damage.`);
            if (level >= 10) add(actions, 'Divine Intervention', `Calls on ${his} god; succeeds on a d100 roll of ${level} or lower.`);
        },
        Druid: () => {
            if (level >= 2) {
                const cr = level >= 8 ? '1' : level >= 4 ? '1/2' : '1/4';
                add(actions, 'Wild Shape (2/Short Rest)', `Turns into a beast of CR ${cr} or lower${level >= 8 ? '' : level >= 4 ? ' without a flying speed' : ' without a flying or swimming speed'} for up to ${Math.floor(level / 2)} hours.`);
                add(traits, 'Natural Recovery', `Once a day on a short rest, recovers spell slots totaling ${Math.ceil(level / 2)} levels (none 6th or higher).`);
            }
            if (level >= 6) add(traits, 'Land\'s Stride', 'Nonmagical difficult terrain costs no extra movement; advantage on saves against magical plants.');
            if (level >= 10) add(traits, 'Nature\'s Ward', 'Can\'t be charmed or frightened by elementals or fey; immune to poison and disease.');
        },
        Fighter: () => {
            if (style) add(traits, `Fighting Style (${style})`, {
                'Great Weapon Fighting': 'Rerolls 1s and 2s on damage dice for two-handed melee weapons.',
                Archery: '+2 to ranged weapon attack rolls (included).', Dueling: '+2 damage with a one-handed melee weapon (included).',
                Defense: '+1 AC while wearing armor (included).'
            }[style]);
            add(bonusActions, 'Second Wind (1/Short Rest)', `Regains ${sbDamage('1d10', level)} hit points.`);
            if (level >= 2) add(traits, `Action Surge (${level >= 17 ? 2 : 1}/Short Rest)`, 'Takes one additional action on their turn.');
            if (level >= 3) add(traits, 'Improved Critical', `Weapon attacks score a critical hit on a roll of ${level >= 15 ? '18–20' : '19 or 20'}.`);
            if (level >= 9) add(traits, `Indomitable (${level >= 13 ? 2 : 1}/Day)`, 'Can reroll a failed saving throw.');
        },
        Monk: () => {
            add(bonusActions, 'Martial Arts', 'After attacking with an unarmed strike or monk weapon, makes one unarmed strike.');
            if (level >= 2) add(bonusActions, `Ki (${level} Points/Short Rest)`, `Flurry of Blows (1 ki): two unarmed strikes. Patient Defense (1 ki): Dodge. Step of the Wind (1 ki): Disengage or Dash, jump distance doubled.`);
            if (level >= 3) add(reactions, 'Deflect Missiles', `Reduces damage from a ranged weapon attack by ${sbDamage('1d10', m.dex + level)}; can throw it back for 1 ki if it drops to 0.`);
            if (level >= 3) add(traits, 'Open Hand Technique', `A Flurry of Blows hit can knock the target prone (Dex save), push it 15 feet (Str save), or stop its reactions (DC ${8 + prof + m.wis}).`);
            if (level >= 5) add(traits, 'Stunning Strike', `After a melee weapon hit, spends 1 ki: the target makes a DC ${8 + prof + m.wis} Constitution save or is stunned until the end of its next turn.`);
            if (level >= 6) add(traits, 'Wholeness of Body', `Once a day, regains ${level * 3} hit points as an action.`);
            if (level >= 7) add(traits, 'Evasion', 'Takes no damage on a successful Dexterity save for half damage, and half on a failure.');
        },
        Paladin: () => {
            add(actions, `Lay on Hands (${5 * level} HP Pool/Day)`, 'Touches a creature to restore hit points from the pool, or spends 5 to cure a disease or neutralize a poison.');
            add(traits, 'Divine Sense', 'Knows the location of celestials, fiends, and undead within 60 feet.');
            if (style) add(traits, `Fighting Style (${style})`, {
                'Great Weapon Fighting': 'Rerolls 1s and 2s on damage dice for two-handed melee weapons.',
                Dueling: '+2 damage with a one-handed melee weapon (included).', Defense: '+1 AC while wearing armor (included).'
            }[style]);
            if (level >= 2) add(traits, 'Divine Smite', 'On a melee weapon hit, spends a spell slot for an extra 2d8 radiant damage, +1d8 per slot level above 1st (+1d8 against undead and fiends).');
            if (level >= 3) add(actions, 'Channel Divinity (1/Short Rest)', `Sacred Weapon: adds ${sbSigned(Math.max(1, m.cha))} to attack rolls with one weapon for 1 minute. Or Turn the Unholy: fiends and undead within 30 feet make a DC ${spellDC} Wisdom save or are turned.`);
            if (level >= 6) add(traits, 'Aura of Protection', `${npc.firstName || 'They'} and allies within 10 feet add ${sbSigned(Math.max(1, m.cha))} to saving throws.`);
            if (level >= 7) add(traits, 'Aura of Devotion', 'They and allies within 10 feet can\'t be charmed.');
            if (level >= 11) add(traits, 'Improved Divine Smite', 'Every melee weapon hit deals an extra 1d8 radiant damage.');
        },
        Ranger: () => {
            add(traits, 'Favored Enemy', `Advantage on Survival checks to track ${favored}, and on Intelligence checks to recall facts about them.`);
            add(traits, 'Natural Explorer', `Expert guide in ${terrain} terrain: can't get lost there by mundane means and moves stealthily at a normal pace.`);
            if (style) add(traits, `Fighting Style (${style})`, {
                Archery: '+2 to ranged weapon attack rolls (included).', Dueling: '+2 damage with a one-handed melee weapon (included).',
                Defense: '+1 AC while wearing armor (included).'
            }[style]);
            if (level >= 3) add(traits, 'Colossus Slayer', 'Once per turn, a weapon hit on a creature below its hit point maximum deals an extra 1d8 damage.');
            if (level >= 7) add(traits, 'Multiattack Defense', 'After a creature hits them, they get +4 AC against that creature\'s other attacks that turn.');
            if (level >= 8) add(traits, 'Land\'s Stride', 'Nonmagical difficult terrain costs no extra movement.');
            if (level >= 11) add(actions, 'Volley', `Makes a ranged attack against any number of creatures within 10 feet of a point in ${his} weapon's range.`);
        },
        Rogue: () => {
            add(traits, 'Sneak Attack (1/Turn)', `Deals an extra ${sbDamage(`${Math.ceil(level / 2)}d6`, 0)} damage with a finesse or ranged weapon hit when ${he} ${has} advantage, or when an ally is within 5 feet of the target.`);
            if (level >= 2) add(bonusActions, 'Cunning Action', 'Dash, Disengage, or Hide.');
            if (level >= 3) add(bonusActions, 'Fast Hands', 'Sleight of Hand, use thieves\' tools, or use an object.');
            if (level >= 5) add(reactions, 'Uncanny Dodge', 'Halves the damage of an attack from an attacker they can see.');
            if (level >= 7) add(traits, 'Evasion', 'Takes no damage on a successful Dexterity save for half damage, and half on a failure.');
            if (level >= 9) add(traits, 'Supreme Sneak', 'Advantage on Stealth checks when moving no more than half speed.');
            if (level >= 11) add(traits, 'Reliable Talent', 'Treats any d20 roll of 9 or lower on a proficient ability check as a 10.');
        },
        Sorcerer: () => {
            const [type] = SB_DRAGONS[dragonColor];
            add(traits, 'Draconic Resilience', `${dragonColor} dragon ancestry. +1 hit point per level, and AC 13 + Dexterity without armor (included).`);
            if (level >= 2) add(traits, `Font of Magic (${level} Sorcery Points)`, 'Can turn sorcery points into spell slots and spell slots into points (bonus action).');
            if (level >= 3) {
                add(traits, 'Metamagic', `${pickSome(SB_METAMAGIC, level >= 10 ? 3 : 2).join(', ')}.`);
            }
            if (level >= 14) add(bonusActions, 'Dragon Wings', `Sprouts dragon wings, gaining a flying speed of ${speed} feet.`);
            if (level >= 6) add(traits, 'Elemental Affinity', `Adds ${sbSigned(m.cha)} to one damage roll of a spell that deals ${type} damage, and can spend 1 sorcery point for ${type} resistance for an hour.`);
        },
        Warlock: () => {
            add(traits, 'Dark One\'s Blessing', `Reducing a hostile creature to 0 hit points grants ${Math.max(1, m.cha + level)} temporary hit points.`);
            if (level >= 2) {
                const count = level >= 12 ? 6 : level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : 2;
                const inv = [SB_INVOCATIONS[0], ...pickSome(SB_INVOCATIONS.slice(1), count - 1)];
                add(traits, 'Eldritch Invocations', inv.map(([n, t]) => `${n}: ${t}`).join(' '));
                if (inv.some(i => i[0] === 'Beguiling Influence')) { skillSet.add('Deception'); skillSet.add('Persuasion'); }
            }
            if (level >= 3) {
                const pact = pactRoll < 0.34 ? ['Pact of the Chain', 'Has an imp or quasit familiar (find familiar).']
                    : pactRoll < 0.67 ? ['Pact of the Blade', 'Can summon a pact weapon in hand as an action.']
                        : ['Pact of the Tome', 'Has a Book of Shadows with three extra cantrips from any class.'];
                add(traits, pact[0], pact[1]);
            }
            if (level >= 6) add(traits, 'Dark One\'s Own Luck (1/Short Rest)', 'Adds a d10 to an ability check or saving throw.');
            if (level >= 10) add(traits, 'Fiendish Resilience', 'Chooses one damage type after a rest and has resistance to it.');
        },
        Wizard: () => {
            add(traits, 'Arcane Recovery (1/Day)', `On a short rest, recovers spell slots totaling ${Math.ceil(level / 2)} levels (none 6th or higher).`);
            if (level >= 2) add(traits, 'Sculpt Spells', 'When casting an evocation spell, chooses up to 1 + the spell\'s level creatures to automatically succeed on their saves and take no damage.');
            if (level >= 6) add(traits, 'Potent Cantrip', 'Creatures that succeed on a save against their cantrips still take half damage.');
            if (level >= 10) add(traits, 'Empowered Evocation', `Adds ${sbSigned(m.int)} to one damage roll of a wizard evocation spell.`);
        }
    };
    feats[cls]();
    if (cls === 'Rogue') add(traits, 'Thieves\' Cant', 'Knows the secret mix of slang, jargon, and code of thieves.');
    if (item === 'Cloak of Protection' || item === 'Ring of Protection') add(traits, item, '+1 to AC and saving throws (included).');

    // ---------- Senses, languages, resistances ----------
    const perception = 10 + (skillSet.has('Perception') ? skillBonus('Perception') : m.wis);
    const senses = [R.dark ? `darkvision ${R.dark} ft.` : '', item === 'Goggles of Night' && !R.dark ? 'darkvision 60 ft.' : '', `passive Perception ${perception}`].filter(Boolean);
    const langs = [...R.langs, ...(R.extraLang || cat === 'noble' ? [extraLang] : []), ...(cls === 'Rogue' ? ['Thieves\' Cant'] : []), ...(cls === 'Druid' ? ['Druidic'] : [])];
    const resist = [...(R.resist || [])];
    if (npc.race === 'dragonborn') resist.push(SB_DRAGONS[dragonColor][0]);

    // ---------- Equipment ----------
    const ammo = { longbow: '20 arrows', shortbow: '20 arrows', 'light crossbow': '20 bolts', 'heavy crossbow': '20 bolts', 'hand crossbow': '20 bolts', sling: '20 sling bullets', dart: '10 darts', javelin: '4 javelins', handaxe: '2 handaxes' }[rangedName];
    const itemName = item === 'weapon+1' ? `+1 ${mainName}` : item === 'weapon+2' ? `+2 ${mainName}` : item;
    const thrownAmmo = ['dart', 'javelin', 'handaxe'].includes(rangedName);
    const gear = [
        armor, useShield && 'shield',
        !magicPlus && mainName, rangedName !== mainName && !thrownAmmo && rangedName, ammo,
        spellcasting && spellcasting.focus,
        cls === 'Rogue' && 'thieves\' tools',
        potions ? `${potions === 1 ? 'a potion' : `${potions} potions`} of healing` : ''
    ].filter(Boolean);
    const cr = SB_CR.find(([max]) => level <= max);

    const skills = [...skillSet].sort().map(s => `${s} ${sbSigned(skillBonus(s))}`);

    return {
        v: 1,
        cls, level, sub: level >= C.sub[1] ? C.sub[0] : '',
        title: `Level ${level} ${cls}${level >= C.sub[1] ? ` (${C.sub[0]})` : ''}`,
        typeLine: `${R.size} ${R.type}, ${(npc.alignment || 'any alignment').toLowerCase()}`,
        stats, baseStats: base, ac, acText: acParts.join(', '), hp, hitDice: `${level}d${C.hd}`, speed: `${speed} ft.`,
        saves, skills, resist, senses, langs, prof,
        cr: cr[1], xp: cr[2],
        traits, actions, bonusActions, reactions, spellcasting,
        magicItem: itemName || '', gear
    };
}

// Plain text for clipboard copies.
function statBlockText(b) {
    if (!b) return '';
    const L = [];
    L.push(`${b.title}. ${b.typeLine}`);
    L.push(`AC ${b.ac}${b.acText ? ` (${b.acText})` : ''} | HP ${b.hp} (${b.hitDice}) | Speed ${b.speed}`);
    L.push(SB_ABILITIES.map(k => `${k.toUpperCase()} ${b.stats[k]} (${sbSigned(npcMod(b.stats[k]))})`).join(' | '));
    if (b.saves.length) L.push(`Saving Throws: ${b.saves.join(', ')}`);
    if (b.skills.length) L.push(`Skills: ${b.skills.join(', ')}`);
    if (b.resist.length) L.push(`Damage Resistances: ${b.resist.join(', ')}`);
    L.push(`Senses: ${b.senses.join(', ')}`);
    L.push(`Languages: ${b.langs.join(', ')}`);
    L.push(`Challenge ≈ ${b.cr} (${b.xp} XP) | Proficiency Bonus +${b.prof}`);
    const section = (title, list) => { if (list.length) { L.push('', title); list.forEach(f => L.push(`${f.name}. ${f.text}`)); } };
    section('TRAITS', b.traits);
    if (b.spellcasting) {
        const s = b.spellcasting;
        L.push('', `SPELLCASTING (${s.ability}; save DC ${s.dc}, ${sbSigned(s.attack)} to hit)`);
        s.lines.forEach(l => L.push(`${l.label}: ${l.spells.map(n => (l.marked || []).includes(n) ? `${n}*` : n).join(', ')}`));
        if (s.lines.some(l => (l.marked || []).length)) L.push(`* ${s.markWhy}`);
    }
    section('ACTIONS', b.actions);
    section('BONUS ACTIONS', b.bonusActions);
    section('REACTIONS', b.reactions);
    L.push('', `Gear: ${b.gear.join(', ')}${b.magicItem ? `. Magic item: ${b.magicItem}` : ''}`);
    return L.join('\n');
}
