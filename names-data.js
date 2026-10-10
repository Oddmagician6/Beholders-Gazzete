/* ============================================
   NAME TABLES: shop (and later tavern) names
   Used by shop-engine.js. Patterns pick from the shared adjectives plus a
   type's own nouns, places, and puns. Add a type by adding a key to
   NAME_TABLES.types. Rolls use randomArray() from npc-data.js.
   ============================================ */

const NAME_TABLES = {
    adjectives: [
        'Rusty', 'Gilded', 'Crooked', 'Singing', 'Drunken', 'Honest', 'Wandering', 'Silver',
        'Copper', 'Sleeping', 'Laughing', 'One-Eyed', 'Lucky', 'Bent', 'Golden', 'Iron',
        'Weeping', 'Prancing', 'Leaky', 'Grumpy', 'Polite', 'Dancing', 'Moonlit', 'Smoky',
        'Last', 'Second-Best', 'Bashful', 'Cursed', 'Thrifty', 'Wobbly', 'Velvet', 'Stubborn'
    ],
    types: {
        general: {
            nouns: ['Barrel', 'Lantern', 'Satchel', 'Crate', 'Candle', 'Ladle', 'Bucket', 'Coil of Rope'],
            places: ['Goods', 'Sundries', 'Supply', 'Provisions', 'Trading Post', 'Mercantile'],
            puns: ['Everything But the Kitchen Sink (Sink Sold Separately)', 'Rope, Soap & Hope', 'Ten-Foot Pole Position', 'Bags of Not-Quite-Holding']
        },
        blacksmith: {
            nouns: ['Anvil', 'Hammer', 'Forge', 'Tongs', 'Ember', 'Bellows', 'Horseshoe', 'Rivet'],
            places: ['Forge', 'Smithy', 'Ironworks', 'Anvil', 'Armory', 'Metalworks'],
            puns: ['Forged About It', 'Hilt the Spot', 'Steel Yourself', 'Pointy End Out', 'Iron Out the Details']
        },
        bowyer: {
            nouns: ['Arrow', 'Quiver', 'Fletching', 'Bowstring', 'Yew', 'Bullseye', 'Goose Feather', 'Target'],
            places: ['Bows', 'Fletchery', 'Archery', 'Quivers', 'Range'],
            puns: ['Quiver With Excitement', 'Right on Target', 'String Theory', 'Point Taken', 'Bolt From the Blue']
        },
        alchemist: {
            nouns: ['Cauldron', 'Retort', 'Vial', 'Mortar', 'Toad', 'Mandrake', 'Flask', 'Bubbling Pot'],
            places: ['Elixirs', 'Apothecary', 'Remedies', 'Tinctures', 'Brews', 'Alchemy'],
            puns: ['Potions Pending', 'Brew-Ha-Ha', 'Side Effects May Vary', 'Mostly Not Poison', 'The Philter Bubble']
        },
        arcane: {
            nouns: ['Owl', 'Wand', 'Grimoire', 'Crystal', 'Star', 'Familiar', 'Rune', 'Hourglass'],
            places: ['Arcana', 'Emporium', 'Curios', 'Scrolls', 'Enchantments', 'Wonders'],
            puns: ['Wand-erlust', 'Hex & the City', 'Spell-Check', 'No Refunds on Fireballs', 'Abra-Kadeal']
        },
        stable: {
            nouns: ['Horseshoe', 'Saddle', 'Mare', 'Stallion', 'Hayloft', 'Bridle', 'Mule', 'Wagon Wheel'],
            places: ['Stables', 'Livery', 'Paddock', 'Wainwrights', 'Carts & Carriages'],
            puns: ['Neigh-borhood Livery', 'Hold Your Horses', 'Stable Genius', 'Whoa There', 'Mane Street Stables']
        },
        provisioner: {
            nouns: ['Ham', 'Turnip', 'Cheese Wheel', 'Loaf', 'Pickle', 'Sausage', 'Cabbage', 'Herring'],
            places: ['Larder', 'Provisions', 'Pantry', 'Grocery', 'Market Stall', 'Victuals'],
            puns: ['Lettuce Pray', 'The Grate Cheese Wheel', 'Rations & Rationalizations', 'Pickled Adventurer (Not Literally)', 'Hearth & Hardtack']
        },
        tinker: {
            nouns: ['Cog', 'Gear', 'Spring', 'Lens', 'Gadget', 'Widget', 'Clockwork Mouse', 'Wrench'],
            places: ['Workshop', 'Tinkery', 'Contraptions', 'Gadgets', 'Tools & Trinkets', 'Clockworks'],
            puns: ['Cog-nitive Dissonance', 'Some Assembly Required', 'Nuts & Bolts & Nuts', 'Spring Loaded', 'Gear Pressure']
        },
        curio: {
            nouns: ['Magpie', 'Raven', 'Trinket', 'Dusty Shelf', 'Locked Chest', 'Cracked Mirror', 'Monkey Paw', 'Odd Sock'],
            places: ['Curiosities', 'Pawn', 'Oddities', 'Bric-a-Brac', 'Secondhand Goods', 'Finds'],
            puns: ['No Questions Asked', 'Previously Adventured', 'One Owner, Recently Deceased', 'Finders Keepers', 'Pawn Star']
        }
    },
    // {adj} {noun} / {noun} & {noun} / {owner}'s {place} / {adj} {noun} {place} / pun
    patterns: [
        { weight: 4, make: (t, owner) => `The ${randomArray(NAME_TABLES.adjectives)} ${randomArray(t.nouns)}` },
        { weight: 2, make: (t, owner) => { const [a, b] = twoDifferent(t.nouns); return `${a} & ${b}`; } },
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
