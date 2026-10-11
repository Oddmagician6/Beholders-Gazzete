/* ============================================
   NAME TABLES: shop and tavern names
   Used by shop-engine.js (shop signs) and the DM Toolbox name generator (F21).
   Patterns pick from the shared adjectives plus a type's own nouns, places, and
   puns. Add a type by adding a key to NAME_TABLES.types (label + icon show in the
   Toolbox picker). pairPrefix starts the "{noun} & {noun}" pattern ("The Hog & Hound").
   Rolls use randomArray()/randomInt() and rollNames() from npc-data.js.
   ============================================ */

const NAME_TABLES = {
    adjectives: [
        'Rusty', 'Gilded', 'Crooked', 'Singing', 'Drunken', 'Honest', 'Wandering', 'Silver',
        'Copper', 'Sleeping', 'Laughing', 'One-Eyed', 'Lucky', 'Bent', 'Golden', 'Iron',
        'Weeping', 'Prancing', 'Leaky', 'Grumpy', 'Polite', 'Dancing', 'Moonlit', 'Smoky',
        'Last', 'Second-Best', 'Bashful', 'Cursed', 'Thrifty', 'Wobbly', 'Velvet', 'Stubborn',
        'Merry', 'Hollow', 'Brass', 'Restless', 'Gentle', 'Howling', 'Frosty', 'Hidden',
        'Patched', 'Sunken', 'Scarlet', 'Tipsy', 'Jolly', 'Haunted', 'Humble', 'Feral'
    ],
    types: {
        tavern: {
            label: 'Tavern or Inn', icon: '🍺', pairPrefix: 'The ',
            nouns: ['Dragon', 'Pony', 'Boar', 'Stag', 'Griffon', 'Flagon', 'Tankard', 'Goblet', 'Hound', 'Mermaid',
                'Kraken', 'Rooster', 'Owlbear', 'Hog', 'Badger', 'Crown', 'Anchor', 'Kettle', 'Lute', 'Unicorn',
                'Goat', 'Wyvern', 'Troll', 'Mimic', 'Bard', 'Hearth', 'Ogre', 'Raven', 'Fiddle', 'Toad',
                'Swan', 'Bear', 'Lantern', 'Cask', 'Fox', 'Salmon', 'Basilisk', 'Harp', 'Wheel', 'Gargoyle'],
            places: ['Inn', 'Tavern', 'Taproom', 'Alehouse', 'Rest', 'Lodge', 'Public House', 'Brewhouse', 'Hearth', 'Mead Hall', 'Cellar', 'Snug'],
            puns: ['The Long Rest', 'The Short Rest (Two-Drink Minimum)', 'Inn Over Your Head', 'Ale & Farewell',
                'The Natural Twenty', 'The Rolled-a-One', 'Hops & Hit Points', 'Brews Your Own Adventure',
                'The Tavern on the Grim', 'The Last Resort', 'Mead Me Halfway', 'The Critical Sip',
                'Pint of No Return', 'The Saving Throw-Up', 'Bottoms Up & Dungeons Down',
                'Advantage on Ale', 'The Tipsy Tarrasque', 'Inn-itiative', 'Rest Assured', 'The Bard Did It']
        },
        general: {
            label: 'General Store', icon: '🏪',
            nouns: ['Barrel', 'Lantern', 'Satchel', 'Crate', 'Candle', 'Ladle', 'Bucket', 'Coil of Rope', 'Spade', 'Pack Mule', 'Tinderbox', 'Wheelbarrow'],
            places: ['Goods', 'Sundries', 'Supply', 'Provisions', 'Trading Post', 'Mercantile', 'Dry Goods', 'Outfitters'],
            puns: ['Everything But the Kitchen Sink (Sink Sold Separately)', 'Rope, Soap & Hope', 'Ten-Foot Pole Position', 'Bags of Not-Quite-Holding', 'Adventurer\'s Starter Pack (Some Assembly)', 'Ten Feet of Everything', 'Torch Song Supplies']
        },
        blacksmith: {
            label: 'Blacksmith & Armorer', icon: '⚒️',
            nouns: ['Anvil', 'Hammer', 'Forge', 'Tongs', 'Ember', 'Bellows', 'Horseshoe', 'Rivet', 'Chainmail', 'Slag', 'Iron Boot', 'Sword Blank'],
            places: ['Forge', 'Smithy', 'Ironworks', 'Anvil', 'Armory', 'Metalworks', 'Steelworks', 'Hammerhall'],
            puns: ['Forged About It', 'Hilt the Spot', 'Steel Yourself', 'Pointy End Out', 'Iron Out the Details', 'Mail Order', 'Strike While It\'s Hot', 'Shield Me Tender']
        },
        bowyer: {
            label: 'Bowyer & Fletcher', icon: '🏹',
            nouns: ['Arrow', 'Quiver', 'Fletching', 'Bowstring', 'Yew', 'Bullseye', 'Goose Feather', 'Target', 'Longbow', 'Crossbow', 'Stag', 'Ash Stave'],
            places: ['Bows', 'Fletchery', 'Archery', 'Quivers', 'Range', 'Bowyers', 'Shafts & Strings'],
            puns: ['Quiver With Excitement', 'Right on Target', 'String Theory', 'Point Taken', 'Bolt From the Blue', 'Arrow-gant Prices', 'Fletch Me If You Can', 'The Long Shot']
        },
        alchemist: {
            label: 'Alchemist & Apothecary', icon: '⚗️',
            nouns: ['Cauldron', 'Retort', 'Vial', 'Mortar', 'Toad', 'Mandrake', 'Flask', 'Bubbling Pot', 'Nightshade', 'Snail', 'Beaker', 'Moth'],
            places: ['Elixirs', 'Apothecary', 'Remedies', 'Tinctures', 'Brews', 'Alchemy', 'Draughts', 'Herbarium'],
            puns: ['Potions Pending', 'Brew-Ha-Ha', 'Side Effects May Vary', 'Mostly Not Poison', 'The Philter Bubble', 'Shake Well Before Dying', 'The Cure-ious Cauldron', 'Elixir Sure?']
        },
        arcane: {
            label: 'Arcane Emporium', icon: '🔮',
            nouns: ['Owl', 'Wand', 'Grimoire', 'Crystal', 'Star', 'Familiar', 'Rune', 'Hourglass', 'Moon', 'Comet', 'Scroll', 'Candle'],
            places: ['Arcana', 'Emporium', 'Curios', 'Scrolls', 'Enchantments', 'Wonders', 'Mysteries', 'Spellcraft'],
            puns: ['Wand-erlust', 'Hex & the City', 'Spell-Check', 'No Refunds on Fireballs', 'Abra-Kadeal', 'Mage Against the Machine', 'Scroll With It', 'Rune Your Day']
        },
        stable: {
            label: 'Stable & Wainwright', icon: '🐴',
            nouns: ['Horseshoe', 'Saddle', 'Mare', 'Stallion', 'Hayloft', 'Bridle', 'Mule', 'Wagon Wheel', 'Pony', 'Carriage', 'Ox', 'Hay Bale'],
            places: ['Stables', 'Livery', 'Paddock', 'Wainwrights', 'Carts & Carriages', 'Coaching House', 'Corral'],
            puns: ['Neigh-borhood Livery', 'Hold Your Horses', 'Stable Genius', 'Whoa There', 'Mane Street Stables', 'Unbridled Joy', 'Cart Before the Horse', 'Stirrup Trouble']
        },
        provisioner: {
            label: 'Grocer & Provisioner', icon: '🧀',
            nouns: ['Ham', 'Turnip', 'Cheese Wheel', 'Loaf', 'Pickle', 'Sausage', 'Cabbage', 'Herring', 'Onion', 'Apple', 'Ham Hock', 'Honeycomb'],
            places: ['Larder', 'Provisions', 'Pantry', 'Grocery', 'Market Stall', 'Victuals', 'Greengrocer', 'Storehouse'],
            puns: ['Lettuce Pray', 'The Grate Cheese Wheel', 'Rations & Rationalizations', 'Pickled Adventurer (Not Literally)', 'Hearth & Hardtack', 'Thyme & Again', 'Hardtack & Hard Bargains', 'Better Than Rations']
        },
        tinker: {
            label: "Tinker's Workshop", icon: '⚙️',
            nouns: ['Cog', 'Gear', 'Spring', 'Lens', 'Gadget', 'Widget', 'Clockwork Mouse', 'Wrench', 'Rivet', 'Sprocket', 'Pocket Watch', 'Tin Bird'],
            places: ['Workshop', 'Tinkery', 'Contraptions', 'Gadgets', 'Tools & Trinkets', 'Clockworks', 'Mechanics', 'Repairs'],
            puns: ['Cog-nitive Dissonance', 'Some Assembly Required', 'Nuts & Bolts & Nuts', 'Spring Loaded', 'Gear Pressure', 'Wind Me Up', 'Fixed (Mostly)', 'The Tick & the Tock']
        },
        curio: {
            label: 'Curio & Pawn', icon: '🗝️',
            nouns: ['Magpie', 'Raven', 'Trinket', 'Dusty Shelf', 'Locked Chest', 'Cracked Mirror', 'Monkey Paw', 'Odd Sock', 'Old Boot', 'Skull', 'Pocket Watch', 'Glass Eye'],
            places: ['Curiosities', 'Pawn', 'Oddities', 'Bric-a-Brac', 'Secondhand Goods', 'Finds', 'Treasures', 'Antiques'],
            puns: ['No Questions Asked', 'Previously Adventured', 'One Owner, Recently Deceased', 'Finders Keepers', 'Pawn Star', 'Haunted (Discounted)', 'Previously Cursed', 'Yesterday\'s Loot']
        }
    },
    // {adj} {noun} / {noun} & {noun} / {owner}'s {place} / {adj} {noun} {place} / pun
    patterns: [
        { weight: 4, make: (t, owner) => `The ${randomArray(NAME_TABLES.adjectives)} ${randomArray(t.nouns)}` },
        { weight: 2, make: (t, owner) => { const [a, b] = twoDifferent(t.nouns); return `${t.pairPrefix || ''}${a} & ${b}`; } },
        { weight: 3, make: (t, owner) => owner ? `${owner}'s ${randomArray(t.places)}` : `The ${randomArray(t.nouns)} ${randomArray(t.places)}` },
        { weight: 2, make: (t, owner) => `${randomArray(NAME_TABLES.adjectives)} ${randomArray(t.nouns)} ${randomArray(t.places)}` },
        { weight: 2, make: (t, owner) => randomArray(t.puns) }
    ]
};

function twoDifferent(list) {
    const a = randomArray(list);
    let b = randomArray(list);
    while (b === a && list.length > 1) b = randomArray(list);
    return [a, b];
}

// A shop name for a type ('blacksmith', 'alchemist', …). owner is optional (first name).
function rollShopName(type, owner) {
    const t = NAME_TABLES.types[type] || NAME_TABLES.types.general;
    const total = NAME_TABLES.patterns.reduce((s, p) => s + p.weight, 0);
    let r = randomInt(1, total);
    const pattern = NAME_TABLES.patterns.find(p => (r -= p.weight) <= 0);
    return pattern.make(t, owner);
}

// The Toolbox name generator (F21): count different names for a type, or for any
// type when type is 'random'. Each name gets an owner (a first name from rollNames)
// for the "{owner}'s {place}" pattern. Returns [{ name, type }].
function rollPlaceNames(type, count = 10) {
    const types = Object.keys(NAME_TABLES.types);
    const out = [];
    const seen = new Set();
    for (let tries = 0; out.length < count && tries < count * 25; tries++) {
        const t = types.includes(type) ? type : randomArray(types);
        const owner = rollNames(1)[0].name;
        const name = rollShopName(t, owner);
        if (seen.has(name)) continue;
        seen.add(name);
        out.push({ name, type: t });
    }
    return out;
}
