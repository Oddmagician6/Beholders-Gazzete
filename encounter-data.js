/* ============================================
   D&D 5E MONSTER DATABASE - FIXED
   ============================================ */

const monsterDatabase = [
    // CR 0-1/4
    { name: 'Goblin', cr: 0.25, xp: 50, hp: 7, ac: 15, type: 'humanoid', tags: ['pack-tactics'], source: 'MM' },
    { name: 'Goblin Boss', cr: 1, xp: 200, hp: 21, ac: 17, type: 'humanoid', tags: ['pack-tactics', 'leader'], source: 'MM' },
    { name: 'Kobold', cr: 0.125, xp: 25, hp: 5, ac: 12, type: 'humanoid', tags: ['pack-tactics'], source: 'MM' },
    { name: 'Skeleton', cr: 0.25, xp: 50, hp: 13, ac: 13, type: 'undead', tags: [], source: 'MM' },
    { name: 'Zombie', cr: 0.25, xp: 50, hp: 22, ac: 8, type: 'undead', tags: [], source: 'MM' },
    { name: 'Rat', cr: 0, xp: 10, hp: 1, ac: 10, type: 'beast', tags: [], source: 'MM' },
    { name: 'Wolf', cr: 0.25, xp: 50, hp: 11, ac: 13, type: 'beast', tags: ['pack-tactics'], source: 'MM' },
    { name: 'Guard', cr: 0.125, xp: 25, hp: 11, ac: 16, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Thug', cr: 0.5, xp: 100, hp: 32, ac: 12, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Cultist', cr: 0.125, xp: 25, hp: 9, ac: 12, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Bandit', cr: 0.125, xp: 25, hp: 11, ac: 12, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Scout', cr: 0.5, xp: 100, hp: 16, ac: 13, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Acolyte', cr: 0.25, xp: 50, hp: 9, ac: 10, type: 'humanoid', tags: ['spellcaster'], source: 'MM' },
    
    // CR 1-2
    { name: 'Orc', cr: 0.5, xp: 100, hp: 15, ac: 13, type: 'humanoid', tags: ['aggressive'], source: 'MM' },
    { name: 'Ogre', cr: 2, xp: 450, hp: 59, ac: 11, type: 'giant', tags: [], source: 'MM' },
    { name: 'Bugbear', cr: 1, xp: 200, hp: 27, ac: 16, type: 'humanoid', tags: ['surprise-attack'], source: 'MM' },
    { name: 'Gnoll', cr: 0.5, xp: 100, hp: 22, ac: 15, type: 'humanoid', tags: ['rampage'], source: 'MM' },
    { name: 'Priest', cr: 2, xp: 450, hp: 27, ac: 13, type: 'humanoid', tags: ['spellcaster'], source: 'MM' },
    { name: 'Bandit Captain', cr: 2, xp: 450, hp: 65, ac: 15, type: 'humanoid', tags: ['leader'], source: 'MM' },
    { name: 'Veteran', cr: 3, xp: 700, hp: 58, ac: 17, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Knight', cr: 3, xp: 700, hp: 52, ac: 18, type: 'humanoid', tags: [], source: 'MM' },
    { name: 'Dire Wolf', cr: 1, xp: 200, hp: 37, ac: 14, type: 'beast', tags: ['pack-tactics'], source: 'MM' },
    { name: 'Ghoul', cr: 1, xp: 200, hp: 22, ac: 12, type: 'undead', tags: ['paralyze'], source: 'MM' },
    
    // CR 3-5
    { name: 'Owlbear', cr: 3, xp: 700, hp: 59, ac: 13, type: 'monstrosity', tags: [], source: 'MM' },
    { name: 'Troll', cr: 5, xp: 1800, hp: 84, ac: 15, type: 'giant', tags: ['regeneration'], source: 'MM' },
    { name: 'Giant Spider', cr: 1, xp: 200, hp: 26, ac: 14, type: 'beast', tags: ['web'], source: 'MM' },
    { name: 'Wyvern', cr: 6, xp: 2300, hp: 110, ac: 13, type: 'dragon', tags: ['flying', 'poison'], source: 'MM' },
    { name: 'Young Red Dragon', cr: 10, xp: 5900, hp: 178, ac: 18, type: 'dragon', tags: ['breath-weapon', 'flying'], source: 'MM' },
    { name: 'Fire Elemental', cr: 5, xp: 1800, hp: 102, ac: 13, type: 'elemental', tags: ['fire-form', 'illumination'], source: 'MM' },
    { name: 'Vampire Spawn', cr: 5, xp: 1800, hp: 82, ac: 15, type: 'undead', tags: ['regeneration', 'charm'], source: 'MM' },
    { name: 'Wraith', cr: 5, xp: 1800, hp: 67, ac: 13, type: 'undead', tags: ['incorporeal', 'life-drain'], source: 'MM' },
    { name: 'Hill Giant', cr: 5, xp: 1800, hp: 105, ac: 13, type: 'giant', tags: [], source: 'MM' },
    { name: 'Flesh Golem', cr: 5, xp: 1800, hp: 93, ac: 14, type: 'construct', tags: ['damage-resistance'], source: 'MM' },
    
    // CR 6-10
    { name: 'Clay Golem', cr: 9, xp: 5000, hp: 133, ac: 14, type: 'construct', tags: ['damage-immunity'], source: 'MM' },
    { name: 'Frost Giant', cr: 8, xp: 3900, hp: 138, ac: 15, type: 'giant', tags: [], source: 'MM' },
    { name: 'Stone Giant', cr: 7, xp: 2900, hp: 126, ac: 17, type: 'giant', tags: [], source: 'MM' },
    { name: 'Mage', cr: 6, xp: 2300, hp: 40, ac: 12, type: 'humanoid', tags: ['spellcaster'], source: 'MM' },
    { name: 'Adult Red Dragon', cr: 17, xp: 18000, hp: 256, ac: 19, type: 'dragon', tags: ['breath-weapon', 'flying', 'legendary'], source: 'MM' },
    
    // CR 11+
    { name: 'Beholder', cr: 13, xp: 10000, hp: 180, ac: 18, type: 'aberration', tags: ['antimagic', 'eye-rays'], source: 'MM' },
    { name: 'Lich', cr: 21, xp: 33000, hp: 135, ac: 17, type: 'undead', tags: ['spellcaster', 'legendary', 'rejuvenation'], source: 'MM' },
    { name: 'Ancient Red Dragon', cr: 24, xp: 62000, hp: 546, ac: 22, type: 'dragon', tags: ['breath-weapon', 'flying', 'legendary'], source: 'MM' },
    { name: 'Tarrasque', cr: 30, xp: 155000, hp: 676, ac: 25, type: 'monstrosity', tags: ['legendary', 'reflective-carapace'], source: 'MM' }
];

// Synergy suggestions - FIXED with exact name matching
const synergyTable = {
    'Goblin': ['Goblin Boss', 'Goblin', 'Worg'],
    'Goblin Boss': ['Goblin', 'Goblin', 'Bugbear'],
    'Kobold': ['Kobold', 'Young Red Dragon', 'Giant Spider'],
    'Orc': ['Orc', 'Ogre', 'Gnoll'],
    'Ogre': ['Orc', 'Goblin', 'Troll'],
    'Bugbear': ['Goblin', 'Goblin Boss', 'Dire Wolf'],
    'Gnoll': ['Gnoll', 'Hyena', 'Gnoll'],
    'Skeleton': ['Zombie', 'Skeleton', 'Wight'],
    'Zombie': ['Skeleton', 'Zombie', 'Ghoul'],
    'Mage': ['Guard', 'Mage', 'Acolyte'],
    'Priest': ['Acolyte', 'Guard', 'Priest'],
    'Bandit Captain': ['Bandit', 'Thug', 'Scout'],
    'Young Red Dragon': ['Kobold', 'Cultist', 'Giant Spider'],
    'Adult Red Dragon': ['Kobold', 'Cultist', 'Young Red Dragon'],
    'Lich': ['Skeleton', 'Zombie', 'Wraith', 'Vampire Spawn']
};

// Terrain & Hazards
const terrainTable = [
    {
        name: 'Chandelier',
        description: 'A large chandelier hangs above the center of the room.',
        rules: 'DC 15 Acrobatics to swing. Can be dropped (DC 12 Strength) for 3d6 damage in 10ft radius.'
    },
    {
        name: 'Acid Pools',
        description: 'Corrosive liquid pools dot the northern wall.',
        rules: '5ft diameter. DC 13 Dexterity save or take 2d6 acid damage. Difficult terrain.'
    },
    {
        name: 'Narrow Bridge',
        description: 'A stone bridge spans a chasm.',
        rules: '5ft wide. DC 12 Dexterity save or fall when pushed. Ranged attacks at disadvantage.'
    },
    {
        name: 'Pit Trap',
        description: 'A hidden pit in the center of the room.',
        rules: 'DC 15 Perception to spot. 10ft deep, 2d6 fall damage. DC 15 Athletics to climb out.'
    },
    {
        name: 'Ballista',
        description: 'A mounted ballista points at the entrance.',
        rules: 'Action to fire. +6 to hit, 3d8 piercing damage. Takes 1 action to reload.'
    },
    {
        name: 'Magical Runes',
        description: 'Glowing runes cover the walls.',
        rules: 'DC 15 Arcana to understand. Can be activated (action) for random magical effect.'
    },
    {
        name: 'Collapsing Ceiling',
        description: 'The ceiling shows signs of instability.',
        rules: 'On round 5, DC 14 Dexterity save or take 4d6 bludgeoning damage.'
    },
    {
        name: 'Fog Cloud',
        description: 'Thick fog obscures the room.',
        rules: 'Heavily obscured. 10ft visibility. Wisdom (Perception) checks at disadvantage.'
    },
    {
        name: 'Flammable Curtains',
        description: 'Heavy curtains line the walls.',
        rules: 'Fire damage ignites them. Spreads 5ft per round. 1d6 fire damage per round in flames.'
    },
    {
        name: 'Elevated Platform',
        description: 'A raised platform in the center.',
        rules: '5ft high. Melee attacks from below at disadvantage. Ranged attacks from above at advantage.'
    }
];

// Flavor text templates
const flavorTextTemplates = {
    hit: [
        "You cleave through {target}'s guard, leaving a deep gash.",
        "Your weapon strikes true, {target} staggers from the blow.",
        "A precise hit lands on {target}, drawing blood.",
        "You connect solidly with {target}, who grimaces in pain.",
        "Your attack finds its mark on {target}."
    ],
    crit: [
        "CRITICAL! Your blow lands with devastating force on {target}!",
        "A perfect strike! {target} reels from the critical hit!",
        "CRITICAL! You hit {target} in a vulnerable spot!",
        "The gods smile upon you! Critical hit on {target}!",
        "CRITICAL! {target} won't forget this blow!"
    ],
    miss: [
        "Your attack glances off {target}'s armor.",
        "{target} dodges your attack with ease.",
        "You swing wide, missing {target}.",
        "{target} parries your attack skillfully.",
        "Your attack fails to connect with {target}."
    ],
    save: [
        "{target} resists the effect with sheer will.",
        "{target} shrugs off the magical energy.",
        "The spell has no effect on {target}.",
        "{target} succeeds on the saving throw.",
        "{target} withstands the assault."
    ]
};

// Encounter difficulty thresholds (DMG p.82) - FIXED
const difficultyThresholds = {
    1: { easy: 100, medium: 200, hard: 300, deadly: 400 },
    2: { easy: 150, medium: 300, hard: 450, deadly: 600 },
    3: { easy: 225, medium: 450, hard: 675, deadly: 900 },
    4: { easy: 250, medium: 500, hard: 750, deadly: 1000 },
    5: { easy: 500, medium: 1000, hard: 1500, deadly: 2000 },
    6: { easy: 600, medium: 1200, hard: 1800, deadly: 2400 },
    7: { easy: 700, medium: 1400, hard: 2100, deadly: 2800 },
    8: { easy: 800, medium: 1600, hard: 2400, deadly: 3200 },
    9: { easy: 900, medium: 1800, hard: 2700, deadly: 3600 },
    10: { easy: 1000, medium: 2000, hard: 3000, deadly: 4000 },
    11: { easy: 1100, medium: 2200, hard: 3300, deadly: 4400 },
    12: { easy: 1200, medium: 2400, hard: 3600, deadly: 4800 },
    13: { easy: 1300, medium: 2600, hard: 3900, deadly: 5200 },
    14: { easy: 1400, medium: 2800, hard: 4200, deadly: 5600 },
    15: { easy: 1500, medium: 3000, hard: 4500, deadly: 6000 },
    16: { easy: 1600, medium: 3200, hard: 4800, deadly: 6400 },
    17: { easy: 1700, medium: 3400, hard: 5100, deadly: 6800 },
    18: { easy: 1800, medium: 3600, hard: 5400, deadly: 7200 },
    19: { easy: 1900, medium: 3800, hard: 5700, deadly: 7600 },
    20: { easy: 2000, medium: 4000, hard: 6000, deadly: 8000 }
};

// Multipliers for encounter building (DMG p.82) - FIXED
const encounterMultipliers = {
    1: { 1: 1, 2: 1.5, '3-4': 2, '5-6': 2.5, '7-10': 3, '11-14': 4, '15+': 5 },
    2: { 1: 1, 2: 1.5, '3-4': 2, '5-6': 2.5, '7-10': 3, '11-14': 4, '15+': 5 },
    3: { 1: 1, 2: 1.5, '3-4': 2, '5-6': 2.5, '7-10': 3, '11-14': 4, '15+': 5 },
    4: { 1: 1, 2: 1.5, '3-4': 2, '5-6': 2.5, '7-10': 3, '11-14': 4, '15+': 5 },
    5: { 1: 1, 2: 1.5, '3-4': 2, '5-6': 2.5, '7-10': 3, '11-14': 4, '15+': 5 }
};

// Helper function to get monster by name
function getMonsterByName(name) {
    return monsterDatabase.find(m => m.name.toLowerCase() === name.toLowerCase());
}

// Helper function to validate monster data
function validateMonster(monster) {
    if (!monster) return false;
    if (!monster.name) return false;
    if (typeof monster.cr !== 'number') return false;
    if (typeof monster.xp !== 'number') return false;
    if (typeof monster.hp !== 'number') return false;
    if (typeof monster.ac !== 'number') return false;
    return true;
}
