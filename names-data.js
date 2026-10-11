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
        'Last', 'Second-Best', 'Bashful', 'Cursed', 'Thrifty', 'Wobbly', 'Velvet', 'Stubborn'
    ],
    types: {
        tavern: {
            label: 'Tavern or Inn', icon: '🍺', pairPrefix: 'The ',
            nouns: ['Dragon', 'Pony', 'Boar', 'Stag', 'Griffon', 'Flagon', 'Tankard', 'Goblet', 'Hound', 'Mermaid',
                'Kraken', 'Rooster', 'Owlbear', 'Hog', 'Badger', 'Crown', 'Anchor', 'Kettle', 'Lute', 'Unicorn',
                'Goat', 'Wyvern', 'Troll', 'Mimic', 'Bard', 'Hearth', 'Ogre', 'Raven', 'Fiddle', 'Toad'],
            places: ['Inn', 'Tavern', 'Taproom', 'Alehouse', 'Rest', 'Lodge', 'Public House', 'Brewhouse', 'Hearth', 'Mead Hall'],
            puns: ['The Long Rest', 'The Short Rest (Two-Drink Minimum)', 'Inn Over Your Head', 'Ale & Farewell',
                'The Natural Twenty', 'The Rolled-a-One', 'Hops & Hit Points', 'Brews Your Own Adventure',
                'The Tavern on the Grim', 'The Last Resort', 'Mead Me Halfway', 'The Critical Sip',
                'Pint of No Return', 'The Saving Throw-Up', 'Bottoms Up & Dungeons Down']
        },
        general: {
            label: 'General Store', icon: '🏪',
            nouns: ['Barrel', 'Lantern', 'Satchel', 'Crate', 'Candle', 'Ladle', 'Bucket', 'Coil of Rope'],
            places: ['Goods', 'Sundries', 'Supply', 'Provisions', 'Trading Post', 'Mercantile'],
            puns: ['Everything But the Kitchen Sink (Sink Sold Separately)', 'Rope, Soap & Hope', 'Ten-Foot Pole Position', 'Bags of Not-Quite-Holding']
        },
        blacksmith: {
            label: 'Blacksmith & Armorer', icon: '⚒️',
            nouns: ['Anvil', 'Hammer', 'Forge', 'Tongs', 'Ember', 'Bellows', 'Horseshoe', 'Rivet'],
            places: ['Forge', 'Smithy', 'Ironworks', 'Anvil', 'Armory', 'Metalworks'],
            puns: ['Forged About It', 'Hilt the Spot', 'Steel Yourself', 'Pointy End Out', 'Iron Out the Details']
        },
        bowyer: {
            label: 'Bowyer & Fletcher', icon: '🏹',
            nouns: ['Arrow', 'Quiver', 'Fletching', 'Bowstring', 'Yew', 'Bullseye', 'Goose Feather', 'Target'],
            places: ['Bows', 'Fletchery', 'Archery', 'Quivers', 'Range'],
            puns: ['Quiver With Excitement', 'Right on Target', 'String Theory', 'Point Taken', 'Bolt From the Blue']
        },
        alchemist: {
            label: 'Alchemist & Apothecary', icon: '⚗️',
            nouns: ['Cauldron', 'Retort', 'Vial', 'Mortar', 'Toad', 'Mandrake', 'Flask', 'Bubbling Pot'],
            places: ['Elixirs', 'Apothecary', 'Remedies', 'Tinctures', 'Brews', 'Alchemy'],
            puns: ['Potions Pending', 'Brew-Ha-Ha', 'Side Effects May Vary', 'Mostly Not Poison', 'The Philter Bubble']
        },
        arcane: {
            label: 'Arcane Emporium', icon: '🔮',
            nouns: ['Owl', 'Wand', 'Grimoire', 'Crystal', 'Star', 'Familiar', 'Rune', 'Hourglass'],
            places: ['Arcana', 'Emporium', 'Curios', 'Scrolls', 'Enchantments', 'Wonders'],
            puns: ['Wand-erlust', 'Hex & the City', 'Spell-Check', 'No Refunds on Fireballs', 'Abra-Kadeal']
        },
        stable: {
            label: 'Stable & Wainwright', icon: '🐴',
            nouns: ['Horseshoe', 'Saddle', 'Mare', 'Stallion', 'Hayloft', 'Bridle', 'Mule', 'Wagon Wheel'],
            places: ['Stables', 'Livery', 'Paddock', 'Wainwrights', 'Carts & Carriages'],
            puns: ['Neigh-borhood Livery', 'Hold Your Horses', 'Stable Genius', 'Whoa There', 'Mane Street Stables']
        },
        provisioner: {
            label: 'Grocer & Provisioner', icon: '🧀',
            nouns: ['Ham', 'Turnip', 'Cheese Wheel', 'Loaf', 'Pickle', 'Sausage', 'Cabbage', 'Herring'],
            places: ['Larder', 'Provisions', 'Pantry', 'Grocery', 'Market Stall', 'Victuals'],
            puns: ['Lettuce Pray', 'The Grate Cheese Wheel', 'Rations & Rationalizations', 'Pickled Adventurer (Not Literally)', 'Hearth & Hardtack']
        },
        tinker: {
            label: "Tinker's Workshop", icon: '⚙️',
            nouns: ['Cog', 'Gear', 'Spring', 'Lens', 'Gadget', 'Widget', 'Clockwork Mouse', 'Wrench'],
            places: ['Workshop', 'Tinkery', 'Contraptions', 'Gadgets', 'Tools & Trinkets', 'Clockworks'],
            puns: ['Cog-nitive Dissonance', 'Some Assembly Required', 'Nuts & Bolts & Nuts', 'Spring Loaded', 'Gear Pressure']
        },
        curio: {
            label: 'Curio & Pawn', icon: '🗝️',
            nouns: ['Magpie', 'Raven', 'Trinket', 'Dusty Shelf', 'Locked Chest', 'Cracked Mirror', 'Monkey Paw', 'Odd Sock'],
            places: ['Curiosities', 'Pawn', 'Oddities', 'Bric-a-Brac', 'Secondhand Goods', 'Finds'],
            puns: ['No Questions Asked', 'Previously Adventured', 'One Owner, Recently Deceased', 'Finders Keepers', 'Pawn Star']
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
