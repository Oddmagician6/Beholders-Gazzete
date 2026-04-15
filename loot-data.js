/* ============================================
   D&D 5E LOOT DATA TABLES
   Based on DMG p.133-137
   ============================================ */

const lootData = {
    // COINS
    coins: {
        cp: { name: 'Copper Pieces', icon: '🪙', value: 0.01 },
        sp: { name: 'Silver Pieces', icon: '🥈', value: 0.1 },
        ep: { name: 'Electrum Pieces', icon: '⚡', value: 0.5 },
        gp: { name: 'Gold Pieces', icon: '🥇', value: 1 },
        pp: { name: 'Platinum Pieces', icon: '💎', value: 10 }
    },

    // GEMS (by value tier)
    gems: {
        '10gp': [
            'Azurite', 'Banded Agate', 'Blue Quartz', 'Eye Agate', 
            'Hematite', 'Lapis Lazuli', 'Malachite', 'Obsidian', 
            'Rhodochrosite', 'Tiger Eye Agate', 'Turquoise'
        ],
        '50gp': [
            'Bloodstone', 'Carnelian', 'Chalcedony', 'Chrysoprase', 
            'Citrine', 'Jasper', 'Moonstone', 'Onyx', 
            'Peridot', 'Rock Crystal', 'Sard', 'Sardonyx', 
            'Smoky Quartz', 'Star Rose Quartz', 'Zircon'
        ],
        '100gp': [
            'Amber', 'Amethyst', 'Chrysoberyl', 'Coral', 'Garnet', 
            'Jade', 'Jet', 'Pearl', 'Spinel', 'Tourmaline'
        ],
        '500gp': [
            'Alexandrite', 'Aquamarine', 'Black Pearl', 'Blue Spinel', 
            'Emerald', 'Opal', 'Topaz'
        ],
        '1000gp': [
            'Black Sapphire', 'Diamond', 'Jacinth', 'Ruby', 'Star Ruby'
        ],
        '5000gp': [
            'Black Opal', 'Blue Diamond', 'Emerald (flawless)', 
            'Ruby (flawless)', 'Star Sapphire'
        ]
    },

    // ART OBJECTS
    art: {
        '25gp': [
            'Silver ewer', 'Carved bone statuette', 'Small gold bracelet', 
            'Cloth-of-gold vestments', 'Black velvet mask with cyprine eyes', 
            'Embroidered silk handkerchief', 'Gold locket with portrait', 
            'Silver dagger with jade pommel', 'Painted gold tooth', 
            'Silver thimble with gem setting'
        ],
        '250gp': [
            'Silver chalice with moonstones', 'Gold ring with ruby', 
            'Silk robe with gold embroidery', 'Crystal decanter with stopper', 
            'Silver mirror with ornate frame', 'Golden crown with pearls', 
            'Ivory comb with silver inlay', 'Bronze shield with gem boss', 
            'Marble sculpture of deity', 'Golden scepter with crystal'
        ],
        '750gp': [
            'Jeweled gold crown', 'Jeweled platinum comb', 'Mythral star', 
            'Adamantite dagger with emerald pommel', 'Golden dragon statuette', 
            'Platinum necklace with sapphire', 'Crystal orb with swirling mist', 
            'Obsidian statue with gold trim', 'Diamond-encrusted hourglass', 
            'Platinum war horn with gems'
        ],
        '2500gp': [
            'Jeweled alb', 'Golden throne with gems', 'Crystal sphere with stars', 
            'Platinum chariot model', 'Diamond necklace with emeralds', 
            'Golden griffon statue', 'Ruby-encrusted goblet', 
            'Sapphire-encrusted dagger', 'Emerald-encrusted ring', 
            'Platinum mask with diamond eyes'
        ],
        '25000gp': [
            'Jeweled gold skull', 'Ruby-encrusted crown', 'Diamond-encrusted throne', 
            'Golden dragon scale armor', 'Platinum statue of ancient hero', 
            'Crystal palace model', 'Emerald-encrusted scepter', 
            'Ruby-encrusted sword hilt', 'Diamond tiara of ancient queen', 
            'Golden chalice of the gods'
        ]
    },

    // MAGIC ITEMS BY RARITY
    magicItems: {
        common: [
            { name: 'Potion of Climbing', type: 'potion' },
            { name: 'Potion of Healing', type: 'potion' },
            { name: 'Spell Scroll (Cantrip)', type: 'scroll' },
            { name: 'Wand of Smiles', type: 'wand' },
            { name: 'Hat of Vermin', type: 'wondrous' },
            { name: 'Dust of Sneezing and Choking', type: 'wondrous' },
            { name: 'Ring of Jumping', type: 'ring' },
            { name: 'Cloak of Billowing', type: 'wondrous' }
        ],
        uncommon: [
            { name: '+1 Weapon', type: 'weapon', attunement: true },
            { name: '+1 Armor', type: 'armor', attunement: true },
            { name: 'Bag of Holding', type: 'wondrous' },
            { name: 'Cloak of Protection', type: 'wondrous', attunement: true },
            { name: 'Ring of Protection', type: 'ring', attunement: true },
            { name: 'Wand of Magic Missiles', type: 'wand' },
            { name: 'Potion of Greater Healing', type: 'potion' },
            { name: 'Spell Scroll (1st-2nd Level)', type: 'scroll' },
            { name: 'Amulet of Proof against Detection', type: 'wondrous', attunement: true },
            { name: 'Boots of Elvenkind', type: 'wondrous', attunement: true },
            { name: 'Gloves of Thievery', type: 'wondrous' },
            { name: 'Shield +1', type: 'armor', attunement: true }
        ],
        rare: [
            { name: '+2 Weapon', type: 'weapon', attunement: true },
            { name: '+2 Armor', type: 'armor', attunement: true },
            { name: 'Ring of Spell Storing', type: 'ring', attunement: true },
            { name: 'Cloak of Displacement', type: 'wondrous', attunement: true },
            { name: 'Flame Tongue', type: 'weapon', attunement: true },
            { name: 'Frost Brand', type: 'weapon', attunement: true },
            { name: 'Potion of Superior Healing', type: 'potion' },
            { name: 'Spell Scroll (3rd-4th Level)', type: 'scroll' },
            { name: 'Staff of Power', type: 'staff', attunement: true },
            { name: 'Amulet of Health', type: 'wondrous', attunement: true },
            { name: 'Boots of Speed', type: 'wondrous', attunement: true }
        ],
        'very-rare': [
            { name: '+3 Weapon', type: 'weapon', attunement: true },
            { name: '+3 Armor', type: 'armor', attunement: true },
            { name: 'Ring of Regeneration', type: 'ring', attunement: true },
            { name: 'Cloak of Invisibility', type: 'wondrous', attunement: true },
            { name: 'Potion of Supreme Healing', type: 'potion' },
            { name: 'Spell Scroll (5th-6th Level)', type: 'scroll' },
            { name: 'Holy Avenger', type: 'weapon', attunement: true },
            { name: 'Vorpal Sword', type: 'weapon', attunement: true },
            { name: 'Staff of the Magi', type: 'staff', attunement: true },
            { name: 'Ring of Three Wishes', type: 'ring', attunement: true }
        ],
        legendary: [
            { name: 'Armor of Invulnerability', type: 'armor', attunement: true },
            { name: 'Ring of Spell Turning', type: 'ring', attunement: true },
            { name: 'Potion of Ultimate Healing', type: 'potion' },
            { name: 'Spell Scroll (7th-9th Level)', type: 'scroll' },
            { name: 'Sword of Sharpness', type: 'weapon', attunement: true },
            { name: 'Luck Blade', type: 'weapon', attunement: true },
            { name: 'Crystal Ball', type: 'wondrous', attunement: true },
            { name: 'Sphere of Annihilation', type: 'wondrous' }
        ],
        artifact: [
            { name: 'Artifact (DM Choice)', type: 'artifact', attunement: true },
            { name: 'Deck of Many Things', type: 'wondrous' },
            { name: 'Hand of Vecna', type: 'wondrous', attunement: true },
            { name: 'Eye of Vecna', type: 'wondrous', attunement: true }
        ]
    },

    // MAGIC ITEM DESCRIPTIONS
    magicDescriptions: {
        'Potion of Healing': 'Red liquid that glimmers when agitated. Regain 2d4+2 HP.',
        'Potion of Greater Healing': 'Regain 4d4+4 HP.',
        'Potion of Superior Healing': 'Regain 8d4+8 HP.',
        'Potion of Supreme Healing': 'Regain 10d4+20 HP.',
        '+1 Weapon': 'You have a +1 bonus to attack and damage rolls.',
        '+2 Weapon': 'You have a +2 bonus to attack and damage rolls.',
        '+3 Weapon': 'You have a +3 bonus to attack and damage rolls.',
        '+1 Armor': 'You have a +1 bonus to AC.',
        '+2 Armor': 'You have a +2 bonus to AC.',
        '+3 Armor': 'You have a +3 bonus to AC.',
        'Bag of Holding': 'Holds up to 500 lbs, not exceeding 64 cubic feet.',
        'Cloak of Protection': 'You gain +1 to AC and saving throws.',
        'Ring of Protection': 'You gain +1 to AC and saving throws.',
        'Wand of Magic Missiles': '7 charges. Cast Magic Missile (1 charge per level).',
        'Flame Tongue': 'Bonus action to ignite. Extra 2d6 fire damage.',
        'Frost Brand': 'Extra 1d6 cold damage. Resistance to fire.',
        'Boots of Speed': 'Bonus action to double speed for 10 minutes.',
        'Amulet of Health': 'CON score becomes 19.',
        'Staff of Power': '+2 bonus. Can cast multiple spells. 20 charges.'
    },

    // DMG TREASURE TABLES (Simplified)
    treasureTables: {
        individual: {
            '0-4': {
                cp: [4, 14], sp: [0, 6], ep: [0, 0], gp: [0, 0], pp: [0, 0],
                gems: { chance: 30, count: [2, 4], value: '10gp' },
                art: { chance: 0, count: [0, 0], value: '25gp' },
                magic: { chance: 0 }
            },
            '5-10': {
                cp: [5, 20], sp: [4, 16], ep: [0, 0], gp: [0, 10], pp: [0, 0],
                gems: { chance: 40, count: [2, 6], value: '50gp' },
                art: { chance: 25, count: [1, 3], value: '250gp' },
                magic: { chance: 15, rarity: 'uncommon' }
            },
            '11-16': {
                cp: [10, 40], sp: [10, 40], ep: [2, 16], gp: [5, 30], pp: [0, 4],
                gems: { chance: 50, count: [3, 8], value: '100gp' },
                art: { chance: 40, count: [2, 4], value: '750gp' },
                magic: { chance: 30, rarity: 'rare' }
            },
            '17+': {
                cp: [20, 80], sp: [20, 80], ep: [10, 40], gp: [20, 80], pp: [5, 20],
                gems: { chance: 60, count: [4, 12], value: '500gp' },
                art: { chance: 50, count: [3, 6], value: '2500gp' },
                magic: { chance: 50, rarity: 'very-rare' }
            }
        },
        hoard: {
            '0-4': {
                cp: [100, 600], sp: [0, 0], ep: [0, 0], gp: [0, 0], pp: [0, 0],
                gems: { chance: 30, count: [6, 12], value: '10gp' },
                art: { chance: 0, count: [0, 0], value: '25gp' },
                magic: { chance: 0 }
            },
            '5-10': {
                cp: [200, 800], sp: [100, 500], ep: [0, 0], gp: [100, 500], pp: [0, 0],
                gems: { chance: 40, count: [8, 16], value: '50gp' },
                art: { chance: 30, count: [2, 8], value: '250gp' },
                magic: { chance: 20, rarity: 'uncommon' }
            },
            '11-16': {
                cp: [500, 2000], sp: [200, 1000], ep: [50, 300], gp: [200, 1000], pp: [10, 50],
                gems: { chance: 50, count: [10, 24], value: '100gp' },
                art: { chance: 45, count: [4, 12], value: '750gp' },
                magic: { chance: 35, rarity: 'rare' }
            },
            '17+': {
                cp: [1000, 4000], sp: [500, 2000], ep: [100, 500], gp: [500, 2000], pp: [50, 200],
                gems: { chance: 60, count: [16, 40], value: '500gp' },
                art: { chance: 55, count: [6, 18], value: '2500gp' },
                magic: { chance: 60, rarity: 'legendary' }
            }
        }
    }
};
