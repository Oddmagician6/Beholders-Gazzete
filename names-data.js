/* ============================================
   NAME TABLES: tavern, shop, and other establishment names
   Used by shop-engine.js (shop signs), tavern-engine.js, and the DM Toolbox name
   generator (F21). Patterns mix the shared tables (adjectives, owner titles, kin,
   places in town, "in the …" spots, belongings, numbers, idiom pairs) with a type's
   own nouns, places, and puns. Add a type by adding a key to NAME_TABLES.types
   (label + icon + group show in the Toolbox picker). pairPrefix starts the
   "{noun} & {noun}" pattern ("The Hog & Hound").
   Rolls use randomArray()/randomInt() and rollNames() from npc-data.js.
   ============================================ */

const NAME_TABLES = {
    adjectives: [
        'Rusty', 'Gilded', 'Crooked', 'Singing', 'Drunken', 'Honest', 'Wandering', 'Silver',
        'Copper', 'Sleeping', 'Laughing', 'One-Eyed', 'Lucky', 'Bent', 'Golden', 'Iron',
        'Weeping', 'Prancing', 'Leaky', 'Grumpy', 'Polite', 'Dancing', 'Moonlit', 'Smoky',
        'Last', 'Second-Best', 'Bashful', 'Cursed', 'Thrifty', 'Wobbly', 'Velvet', 'Stubborn',
        'Merry', 'Hollow', 'Brass', 'Restless', 'Gentle', 'Howling', 'Frosty', 'Hidden',
        'Patched', 'Sunken', 'Scarlet', 'Tipsy', 'Jolly', 'Haunted', 'Humble', 'Feral',
        'Black', 'White', 'Red', 'Green', 'Blue', 'Grey', 'Amber', 'Emerald',
        'Crimson', 'Ivory', 'Ashen', 'Pale', 'Burnt', 'Broken', 'Three-Legged', 'Headless',
        'Toothless', 'Bearded', 'Bald', 'Spotted', 'Speckled', 'Striped', 'Shaggy', 'Fat',
        'Thin', 'Tiny', 'Mighty', 'Noble', 'Royal', 'Proud', 'Sly', 'Clever',
        'Foolish', 'Brave', 'Cowardly', 'Sober', 'Thirsty', 'Hungry', 'Sleepy', 'Winking',
        'Whistling', 'Grinning', 'Snoring', 'Blushing', 'Flying', 'Falling', 'Running', 'Swimming',
        'Lonely', 'Lost', 'Found', 'Wicked', 'Holy', 'Fickle', 'Ancient', 'Upside-Down',
        'Salty', 'Muddy', 'Thorny', 'Wet', 'Hairy', 'Painted', 'Chained', 'Crowned',
        'Mended', 'Borrowed', 'Stolen', 'Forgotten', 'Wild', 'Quiet', 'Rowdy', 'Gallant'
    ],
    // "{title} {owner}'s {place}" (Old Brakka's Forge)
    titles: ['Old', 'Widow', 'Honest', 'Mad', 'Mother', 'Father', 'Uncle', 'Auntie', 'Granny', 'Gramps',
        'Captain', 'Brother', 'Sister', 'Lucky', 'Big', 'Little', 'One-Eyed', 'Young', 'Doc', 'Lady',
        'Master', 'Squire', 'Cousin', 'Dame', 'Sergeant', 'Saint', 'Red', 'Long', 'Fat', 'Gentle'],
    // "{owner} & {kin}" (Mira & Daughters)
    kin: ['Sons', 'Daughters', 'Kin', 'Company', 'Nephews', 'Nieces', 'Cousins', 'Partners', 'Family',
        'Brothers', 'Sisters', 'Heirs', 'Apprentices', 'Associates', 'Grandchildren', 'Friends', 'Other Sons'],
    // "{spot} {place}" (Riverside Provisions)
    spots: ['Riverside', 'Northgate', 'Southgate', 'Eastgate', 'Westwall', 'Crossroads', 'Market Square', 'Hilltop',
        'Bridge Street', 'Harborside', 'Old Mill', 'Lantern Lane', 'Cobble Row', 'Saltmarsh', 'Ferry Landing',
        'Chapel Hill', 'Wall Street', 'Copper Lane', 'Gallows Hill', 'Tanners Row', 'Fishgate', 'Kingsway',
        'Mudwater', 'Thornfield', 'Oakhollow', 'Low Town', 'High Street', 'Dockside', 'Ravensgate',
        'Wellspring', 'Greywater', 'Stonebridge', 'Briar Lane', 'Candle Row', 'Ashford', 'Hollow Lane'],
    // "The {noun} {prep} the {setting}" (The Fox in the Well)
    preps: ['in the', 'under the', 'on the', 'behind the', 'beneath the', 'over the', 'by the', 'up the', 'in a', 'at the bottom of the'],
    settings: ['Well', 'Barrel', 'Moon', 'Stairs', 'Cellar', 'Hat', 'Boot', 'Rain', 'Hedge', 'Mist', 'Tree', 'Belfry',
        'Mill', 'Bog', 'Bucket', 'Chimney', 'Wardrobe', 'Haystack', 'Pond', 'Attic', 'Fog', 'Bridge', 'Rafters',
        'Teapot', 'Woodpile', 'Graveyard', 'Garden', 'Snow', 'Ditch', 'Crow\'s Nest', 'Lighthouse', 'Pie'],
    // "The {noun}'s {belonging}" (The Hog's Head)
    belongings: ['Head', 'Tail', 'Rest', 'Nest', 'Den', 'Hoard', 'Lair', 'Tooth', 'Horn', 'Claw', 'Arms', 'Respite',
        'Folly', 'Crown', 'Hollow', 'Revenge', 'Secret', 'Dream', 'Luck', 'Last Stand', 'Retreat', 'Return',
        'Wager', 'Promise', 'Grin', 'Hideaway', 'Delight', 'Lament', 'Bargain', 'Whisker', 'Shadow', 'Song'],
    // "The {number} {nouns}" (The Three Broken Barrels)
    numbers: ['Two', 'Three', 'Three', 'Four', 'Five', 'Seven', 'Seven', 'Nine', 'Twelve', 'Thirteen', 'Forty', 'Hundred', 'Thousand'],
    // "{pair} {place}" (Rough & Ready Forge)
    pairs: ['Hale & Hearty', 'Rough & Ready', 'Odds & Ends', 'Bits & Bobs', 'Hearth & Home', 'Spit & Polish',
        'Rhyme & Reason', 'Fire & Fury', 'Salt & Iron', 'Smoke & Mirrors', 'Sticks & Stones', 'Moon & Sixpence',
        'Fair & Square', 'High & Dry', 'Safe & Sound', 'Sword & Sorcery', 'Coin & Candle', 'Thick & Thin',
        'Sooner & Later', 'Wax & Wane', 'Bread & Butter', 'Quick & Dirty', 'Pins & Needles', 'Rack & Ruin',
        'Kith & Kin', 'Lock & Key', 'Spick & Span', 'Hook & Line', 'Trial & Error', 'Brass & Bone'],
    // Nouns that read wrong with a number in front.
    uncountable: ['Slag', 'Chainmail', 'Yew', 'Fletching', 'Nightshade', 'Silk', 'Velvet', 'Ink', 'Wax', 'Lye',
        'Marble', 'Mortar', 'Sawdust', 'Tar', 'Saffron', 'Steam', 'Gold Leaf', 'Rigging', 'Tallow', 'Incense',
        'Lavender', 'Mint', 'Sage', 'Thyme', 'Honey', 'Mead', 'Rye', 'Barley', 'Hops', 'Cider', 'Brimstone'],
    groups: ['Food & Drink', 'Crafts & Trades', 'Magic & Faith', 'Services & Vice', 'Goods & Trade'],
    types: {
        tavern: {
            label: 'Tavern or Inn', icon: '🍺', group: 'Food & Drink', pairPrefix: 'The ',
            nouns: ['Dragon', 'Pony', 'Boar', 'Stag', 'Griffon', 'Flagon', 'Tankard', 'Goblet', 'Hound', 'Mermaid',
                'Kraken', 'Rooster', 'Owlbear', 'Hog', 'Badger', 'Crown', 'Anchor', 'Kettle', 'Lute', 'Unicorn',
                'Goat', 'Wyvern', 'Troll', 'Mimic', 'Bard', 'Hearth', 'Ogre', 'Raven', 'Fiddle', 'Toad',
                'Swan', 'Bear', 'Lantern', 'Cask', 'Fox', 'Salmon', 'Basilisk', 'Harp', 'Wheel', 'Gargoyle',
                'Bugbear', 'Cockatrice', 'Hippogriff', 'Manticore', 'Pegasus', 'Phoenix', 'Gelatinous Cube', 'Beholder',
                'Kobold', 'Halfling', 'Knight', 'Wizard', 'Jester', 'Friar', 'Pilgrim', 'Sailor', 'Bishop', 'Queen',
                'King', 'Pig', 'Cat', 'Magpie', 'Heron', 'Eel', 'Cockerel', 'Ram', 'Bull', 'Wolf', 'Mule', 'Ferret',
                'Barrel', 'Horn', 'Drum', 'Bell', 'Plough', 'Sickle', 'Saddle', 'Candle', 'Pipe', 'Moon', 'Star', 'Sun'],
            places: ['Inn', 'Tavern', 'Taproom', 'Alehouse', 'Rest', 'Lodge', 'Public House', 'Brewhouse', 'Hearth',
                'Mead Hall', 'Cellar', 'Snug', 'Arms', 'Tap', 'Saloon', 'Roadhouse', 'Hostel', 'Waystation',
                'Coaching Inn', 'Lounge', 'Drinkery', 'Pothouse', 'Grogshop', 'Hall', 'Retreat', 'Common Room'],
            puns: ['The Long Rest', 'The Short Rest (Two-Drink Minimum)', 'Inn Over Your Head', 'Ale & Farewell',
                'The Natural Twenty', 'The Rolled-a-One', 'Hops & Hit Points', 'Brews Your Own Adventure',
                'The Tavern on the Grim', 'The Last Resort', 'Mead Me Halfway', 'The Critical Sip',
                'Pint of No Return', 'The Saving Throw-Up', 'Bottoms Up & Dungeons Down',
                'Advantage on Ale', 'The Tipsy Tarrasque', 'Inn-itiative', 'Rest Assured', 'The Bard Did It',
                'The Hoppy Mimic', 'Tavern Wrong Turn', 'The Quest Giver (No Quests Today)', 'Ale-ment of Surprise',
                'The Inn-evitable', 'Grog & Groan', 'Spill the Beans & the Beer', 'The Wizard\'s Sleeve',
                'Stout Hearts', 'The Ale-ing Patient', 'Cask & You Shall Receive', 'The Bar-barian',
                'The Pint-Sized Giant', 'Drinks on the Rogue', 'Tap & Tarrasque', 'The Lager-ly Harmless']
        },
        bakery: {
            label: 'Bakery', icon: '🥖', group: 'Food & Drink',
            nouns: ['Loaf', 'Bun', 'Pie', 'Tart', 'Pretzel', 'Rolling Pin', 'Oven', 'Muffin', 'Biscuit', 'Crumpet',
                'Honey Cake', 'Wheat Sheaf', 'Flour Sack', 'Baker\'s Peel', 'Scone', 'Cinnamon Knot', 'Sweet Roll', 'Millstone'],
            places: ['Bakery', 'Bakehouse', 'Ovens', 'Pastries', 'Breads', 'Confectionery', 'Bread Stall', 'Patisserie', 'Crusts'],
            puns: ['Knead to Know Basis', 'Rise & Shine', 'The Upper Crust', 'Loaf at First Sight', 'Bread Pact',
                'Batter Luck Next Time', 'Rolling Initiative', 'Doughn\'t Ask', 'Bun Intended', 'Yeast of Burden',
                'The Flour Power', 'Pie Hard', 'Tart of the Matter', 'Scone but Not Forgotten']
        },
        butcher: {
            label: 'Butcher & Smokehouse', icon: '🥩', group: 'Food & Drink',
            nouns: ['Cleaver', 'Ham Hock', 'Sausage', 'Pig', 'Cow', 'Chop', 'Brisket', 'Meat Hook', 'Lamb', 'Goose',
                'Haunch', 'Smoked Eel', 'Rack of Ribs', 'Boar', 'Bacon Rasher', 'Marrow Bone'],
            places: ['Butchery', 'Meats', 'Smokehouse', 'Larder', 'Chops', 'Cuts', 'Shambles', 'Curing House', 'Salt House'],
            puns: ['Meat Your Maker', 'Chop Chop', 'Cleaver Than Most', 'Prime Cuts & Prime Suspects', 'The Wurst Shop',
                'Steaks Are High', 'Rare Finds', 'Bacon Brave', 'Hock & Awe', 'Mystery Meats (Don\'t Ask)',
                'Ribs & Rumors', 'Pork Chop Shop', 'Grill Me Again']
        },
        brewery: {
            label: 'Brewer & Vintner', icon: '🍷', group: 'Food & Drink',
            nouns: ['Barrel', 'Grape', 'Vine', 'Hop', 'Cask', 'Keg', 'Still', 'Bottle', 'Wine Press', 'Mash Tun', 'Cork',
                'Decanter', 'Goblet', 'Barleycorn', 'Copper Pot', 'Wineskin', 'Bung'],
            places: ['Brewery', 'Winery', 'Vineyard', 'Distillery', 'Cellars', 'Cidery', 'Meadery', 'Vintners', 'Brewworks', 'Wine Vaults'],
            puns: ['Hop to It', 'Grape Expectations', 'Ale Be Back', 'Distilled Life', 'Barrel of Laughs', 'Wine Not?',
                'Cask Me Anything', 'Hopportunity Knocks', 'The Brew-tal Truth', 'Proof of Concept', 'Vine & Dandy',
                'Mead Your Doom', 'Spirits Lifted (Haunting Extra)']
        },
        blacksmith: {
            label: 'Blacksmith & Armorer', icon: '⚒️', group: 'Crafts & Trades',
            nouns: ['Anvil', 'Hammer', 'Forge', 'Tongs', 'Ember', 'Bellows', 'Horseshoe', 'Rivet', 'Chainmail', 'Slag', 'Iron Boot', 'Sword Blank',
                'Gauntlet', 'Helm', 'Breastplate', 'Halberd', 'Quench Tub', 'Whetstone', 'Billet', 'Shield Boss', 'Spark', 'Coal Scuttle'],
            places: ['Forge', 'Smithy', 'Ironworks', 'Anvil', 'Armory', 'Metalworks', 'Steelworks', 'Hammerhall', 'Foundry',
                'Arms & Armor', 'Blades', 'Plate & Mail', 'Weaponry', 'Hearth'],
            puns: ['Forged About It', 'Hilt the Spot', 'Steel Yourself', 'Pointy End Out', 'Iron Out the Details', 'Mail Order',
                'Strike While It\'s Hot', 'Shield Me Tender', 'Anvil-ievable Prices', 'Blade Runner', 'Sword of Mouth',
                'Heavy Metal', 'Forge Ahead', 'Smithereens', 'Axe Me Anything', 'Steel Deal', 'The Daggers Drawn']
        },
        bowyer: {
            label: 'Bowyer & Fletcher', icon: '🏹', group: 'Crafts & Trades',
            nouns: ['Arrow', 'Quiver', 'Fletching', 'Bowstring', 'Yew', 'Bullseye', 'Goose Feather', 'Target', 'Longbow', 'Crossbow', 'Stag', 'Ash Stave',
                'Broadhead', 'Hawk', 'Falcon', 'Nock', 'Archer', 'Hart', 'Bracer', 'Bolt'],
            places: ['Bows', 'Fletchery', 'Archery', 'Quivers', 'Range', 'Bowyers', 'Shafts & Strings', 'Butts', 'Bowcraft', 'Arrowworks'],
            puns: ['Quiver With Excitement', 'Right on Target', 'String Theory', 'Point Taken', 'Bolt From the Blue', 'Arrow-gant Prices',
                'Fletch Me If You Can', 'The Long Shot', 'Bow Down', 'Aim Low, Hit Knees', 'Taking a Bow', 'Straight & Arrow',
                'Draw, Partner']
        },
        tailor: {
            label: 'Tailor & Clothier', icon: '🧵', group: 'Crafts & Trades',
            nouns: ['Needle', 'Thimble', 'Spool', 'Button', 'Bolt of Cloth', 'Silk', 'Velvet', 'Peacock', 'Pin Cushion', 'Scissors',
                'Feathered Hat', 'Cloak', 'Doublet', 'Ribbon', 'Lace', 'Moth', 'Loom', 'Stocking'],
            places: ['Tailors', 'Clothiers', 'Haberdashery', 'Garments', 'Threads', 'Fineries', 'Seamstress', 'Dressmakers', 'Mercers', 'Hattery', 'Weavers'],
            puns: ['Sew What?', 'Hem & Haw', 'Suit Yourself', 'Reap What You Sew', 'Cloak & Swagger', 'Fit for a Lich',
                'The Seams Legit', 'Darn Good Work', 'Material Girls & Boys', 'Pinned Down', 'Tailor Swift Service',
                'Knot Your Average Tailor', 'Cut Above']
        },
        leatherworker: {
            label: 'Leatherworker & Tanner', icon: '🥾', group: 'Crafts & Trades',
            nouns: ['Hide', 'Boot', 'Belt', 'Saddlebag', 'Awl', 'Buckle', 'Strap', 'Stag Hide', 'Glove', 'Bullhide', 'Tanning Vat',
                'Satchel', 'Bandolier', 'Wineskin', 'Cobbler', 'Shoelast'],
            places: ['Tannery', 'Leathers', 'Leatherworks', 'Cobblers', 'Bootmakers', 'Saddlers', 'Hides', 'Leathercraft', 'Boots & Belts'],
            puns: ['Hide & Seek', 'Tough as Leather', 'The Last Last', 'Boot Camp', 'Tan Lines', 'Belt It Out',
                'Sole Proprietor', 'Hide Your Valuables (In Our Bags)', 'Heel Thyself', 'Leather Weather Friends',
                'Well Heeled', 'Strapped for Cash']
        },
        carpenter: {
            label: 'Carpenter & Cooper', icon: '🪚', group: 'Crafts & Trades',
            nouns: ['Saw', 'Plane', 'Chisel', 'Oak', 'Mallet', 'Barrel Stave', 'Dovetail', 'Sawhorse', 'Beam', 'Lathe',
                'Hoop', 'Pine Knot', 'Workbench', 'Plumb Bob', 'Ladder', 'Woodpecker'],
            places: ['Carpentry', 'Joinery', 'Woodworks', 'Cooperage', 'Lumberyard', 'Sawmill', 'Woodshop', 'Turners', 'Cabinetry'],
            puns: ['Board Meeting', 'Wood You Believe It', 'Nailed It', 'Saw It Coming', 'Plane & Simple', 'Knot Bad',
                'Chip Off the Old Block', 'Lumber Party', 'Measure Twice, Charge Thrice', 'Grain of Truth', 'Barrel Roll',
                'Timber!']
        },
        mason: {
            label: 'Stonemason & Builder', icon: '🧱', group: 'Crafts & Trades',
            nouns: ['Chisel', 'Keystone', 'Cornerstone', 'Trowel', 'Brick', 'Gargoyle', 'Marble', 'Mortar', 'Pillar', 'Archway',
                'Cobble', 'Plumb Line', 'Quarry Block', 'Statue', 'Flagstone', 'Scaffold'],
            places: ['Masonry', 'Stoneworks', 'Builders', 'Quarry', 'Brickyard', 'Stonecutters', 'Sculptors', 'Masons', 'Monuments'],
            puns: ['Rock Solid', 'Set in Stone', 'Leave No Stone Unturned', 'Mortar Combat', 'Brick by Brick', 'Stone Cold',
                'Wall to Wall', 'Rubble Rousers', 'The Gargoyle Is Watching', 'Tomb With a View', 'Rock Bottom Prices',
                'Hard Feelings']
        },
        tinker: {
            label: "Tinker's Workshop", icon: '⚙️', group: 'Crafts & Trades',
            nouns: ['Cog', 'Gear', 'Spring', 'Lens', 'Gadget', 'Widget', 'Clockwork Mouse', 'Wrench', 'Rivet', 'Sprocket', 'Pocket Watch', 'Tin Bird',
                'Gnome', 'Pendulum', 'Boiler', 'Brass Owl', 'Music Box', 'Lockpick', 'Steam', 'Automaton', 'Kettle', 'Bolt'],
            places: ['Workshop', 'Tinkery', 'Contraptions', 'Gadgets', 'Tools & Trinkets', 'Clockworks', 'Mechanics', 'Repairs',
                'Inventions', 'Gizmos', 'Fixery', 'Engines'],
            puns: ['Cog-nitive Dissonance', 'Some Assembly Required', 'Nuts & Bolts & Nuts', 'Spring Loaded', 'Gear Pressure', 'Wind Me Up',
                'Fixed (Mostly)', 'The Tick & the Tock', 'Explosion-Free Since Tuesday', 'Gnome Improvement', 'Clock Blocked',
                'Screw Loose', 'Gear Up', 'Duct & Cover']
        },
        jeweler: {
            label: 'Jeweler & Gem Cutter', icon: '💍', group: 'Goods & Trade',
            nouns: ['Ruby', 'Sapphire', 'Emerald', 'Diamond', 'Pearl', 'Opal', 'Ring', 'Brooch', 'Locket', 'Tiara', 'Loupe',
                'Amethyst', 'Gold Chain', 'Cameo', 'Signet', 'Jewel Box', 'Oyster'],
            places: ['Jewelers', 'Gems', 'Gemcutters', 'Goldsmiths', 'Treasury', 'Baubles', 'Settings', 'Facets', 'Lapidary', 'Silversmiths'],
            puns: ['Carat & Stick', 'Ring of Truth', 'Cut Above the Rest', 'Gem Dandy', 'Opal-ent Living', 'Gilt Trip',
                'Pearls Before Swine', 'The Rocks You Want', 'Bling of the Hill', 'Shiny Things', 'Facet of Life',
                'Rare Earth (Not for Eating)']
        },
        scribe: {
            label: 'Scribe & Bookseller', icon: '📜', group: 'Goods & Trade',
            nouns: ['Quill', 'Inkwell', 'Scroll', 'Tome', 'Book', 'Bookworm', 'Parchment', 'Seal', 'Owl', 'Candle', 'Lectern',
                'Page', 'Bookend', 'Ink', 'Wax', 'Index', 'Codex', 'Bookmark'],
            places: ['Books', 'Bookshop', 'Scriptorium', 'Scribes', 'Library', 'Stationers', 'Copyists', 'Bindery', 'Printworks',
                'Letters', 'Manuscripts', 'Readers'],
            puns: ['Read Between the Lines', 'Novel Ideas', 'Tome Sweet Tome', 'Spellcheck & Balances', 'Quill You Marry Me',
                'Booked Solid', 'Ink Different', 'The Plot Thickens', 'Page Turners', 'Don\'t Judge a Cover',
                'Bound to Please', 'Write of Passage', 'The Write Stuff', 'Overdue (Since the Third Age)']
        },
        cartographer: {
            label: 'Cartographer & Guide', icon: '🗺️', group: 'Goods & Trade',
            nouns: ['Compass', 'Map', 'Sextant', 'Spyglass', 'Globe', 'Star Chart', 'Waymark', 'Lodestone', 'Signpost',
                'Milestone', 'Pathfinder', 'Wind Rose', 'Scroll Tube', 'North Star'],
            places: ['Maps', 'Charts', 'Cartography', 'Atlas', 'Guides', 'Wayfinders', 'Surveyors', 'Expeditions', 'Charts & Routes'],
            puns: ['Lost & Found', 'You Are Here (Probably)', 'Here Be Dragons', 'Off the Map', 'Charted Territory',
                'The Scenic Route', 'Lost Cause Maps', 'Compass-ionate Service', 'Map Quest', 'Going Places',
                'Not All Who Wander', 'Legend Has It']
        },
        stable: {
            label: 'Stable & Wainwright', icon: '🐴', group: 'Goods & Trade',
            nouns: ['Horseshoe', 'Saddle', 'Mare', 'Stallion', 'Hayloft', 'Bridle', 'Mule', 'Wagon Wheel', 'Pony', 'Carriage', 'Ox', 'Hay Bale',
                'Foal', 'Draft Horse', 'Warhorse', 'Donkey', 'Coach', 'Whip', 'Stirrup', 'Feed Bag'],
            places: ['Stables', 'Livery', 'Paddock', 'Wainwrights', 'Carts & Carriages', 'Coaching House', 'Corral', 'Mews',
                'Ranch', 'Coachworks', 'Horse Fair'],
            puns: ['Neigh-borhood Livery', 'Hold Your Horses', 'Stable Genius', 'Whoa There', 'Mane Street Stables', 'Unbridled Joy',
                'Cart Before the Horse', 'Stirrup Trouble', 'Horsing Around', 'Mare Necessities', 'Gift Horse (Do Check the Mouth)',
                'Hay There', 'Trot Deal']
        },
        provisioner: {
            label: 'Grocer & Provisioner', icon: '🧀', group: 'Food & Drink',
            nouns: ['Ham', 'Turnip', 'Cheese Wheel', 'Loaf', 'Pickle', 'Sausage', 'Cabbage', 'Herring', 'Onion', 'Apple', 'Ham Hock', 'Honeycomb',
                'Potato', 'Pumpkin', 'Leek', 'Egg Basket', 'Salt Cod', 'Jar of Jam', 'Melon', 'Garlic Braid'],
            places: ['Larder', 'Provisions', 'Pantry', 'Grocery', 'Market Stall', 'Victuals', 'Greengrocer', 'Storehouse', 'Rations', 'Granary'],
            puns: ['Lettuce Pray', 'The Grate Cheese Wheel', 'Rations & Rationalizations', 'Pickled Adventurer (Not Literally)', 'Hearth & Hardtack',
                'Thyme & Again', 'Hardtack & Hard Bargains', 'Better Than Rations', 'Turnip the Heat', 'Peas of Mind', 'Kale to Arms',
                'Leek of Faith', 'Gourd Almighty']
        },
        general: {
            label: 'General Store', icon: '🏪', group: 'Goods & Trade',
            nouns: ['Barrel', 'Lantern', 'Satchel', 'Crate', 'Candle', 'Ladle', 'Bucket', 'Coil of Rope', 'Spade', 'Pack Mule', 'Tinderbox', 'Wheelbarrow',
                'Grappling Hook', 'Bedroll', 'Waterskin', 'Iron Pot', 'Ten-Foot Pole', 'Crowbar', 'Mess Kit', 'Bell'],
            places: ['Goods', 'Sundries', 'Supply', 'Provisions', 'Trading Post', 'Mercantile', 'Dry Goods', 'Outfitters', 'Emporium',
                'Supply Co.', 'Notions', 'Wares'],
            puns: ['Everything But the Kitchen Sink (Sink Sold Separately)', 'Rope, Soap & Hope', 'Ten-Foot Pole Position', 'Bags of Not-Quite-Holding',
                'Adventurer\'s Starter Pack (Some Assembly)', 'Ten Feet of Everything', 'Torch Song Supplies', 'One-Stop Dungeon Shop',
                'Got Rope?', 'Prepared for Anything (Except That)', 'Rations of the Lost Ark', 'Pack Rat\'s Paradise']
        },
        curio: {
            label: 'Curio & Pawn', icon: '🗝️', group: 'Goods & Trade',
            nouns: ['Magpie', 'Raven', 'Trinket', 'Dusty Shelf', 'Locked Chest', 'Cracked Mirror', 'Monkey Paw', 'Odd Sock', 'Old Boot', 'Skull', 'Pocket Watch', 'Glass Eye',
                'Music Box', 'Jackdaw', 'Stuffed Owlbear', 'Ship in a Bottle', 'Snow Globe', 'Doll', 'Hourglass'],
            places: ['Curiosities', 'Pawn', 'Oddities', 'Bric-a-Brac', 'Secondhand Goods', 'Finds', 'Treasures', 'Antiques', 'Relics',
                'Salvage', 'Knick-Knacks'],
            puns: ['No Questions Asked', 'Previously Adventured', 'One Owner, Recently Deceased', 'Finders Keepers', 'Pawn Star', 'Haunted (Discounted)',
                'Previously Cursed', 'Yesterday\'s Loot', 'Dead Men\'s Shoes', 'Some Other Hero\'s Treasure', 'All Sales Fated',
                'Mostly Not Mimics']
        },
        moneychanger: {
            label: 'Moneylender & Bank', icon: '🏦', group: 'Goods & Trade',
            nouns: ['Coin', 'Scale', 'Strongbox', 'Ledger', 'Vault', 'Purse', 'Abacus', 'Gold Crown', 'Copper Piece', 'Key',
                'Seal', 'Dragon Hoard', 'Counting Table', 'Moneybag', 'Lockbox'],
            places: ['Exchange', 'Counting House', 'Bank', 'Vaults', 'Coffers', 'Lending House', 'Trust', 'Treasury', 'Moneychangers', 'Loans'],
            puns: ['Interest Rates Are Fiendish', 'Coin Flip Finance', 'The Hoard Is Yours', 'In Gold We Trust', 'Loan Wolf',
                'Debt & Breakfast', 'Change of Heart', 'The Copper Bottom', 'Bank of the Seven Hells', 'Vault Lines',
                'Capital Punishment', 'Pay It Forward (With Interest)']
        },
        alchemist: {
            label: 'Alchemist & Apothecary', icon: '⚗️', group: 'Magic & Faith',
            nouns: ['Cauldron', 'Retort', 'Vial', 'Mortar', 'Toad', 'Mandrake', 'Flask', 'Bubbling Pot', 'Nightshade', 'Snail', 'Beaker', 'Moth',
                'Alembic', 'Phial', 'Leech', 'Salamander', 'Crucible', 'Pestle', 'Brimstone', 'Green Flame'],
            places: ['Elixirs', 'Apothecary', 'Remedies', 'Tinctures', 'Brews', 'Alchemy', 'Draughts', 'Herbarium', 'Philters',
                'Salves', 'Laboratory', 'Potions'],
            puns: ['Potions Pending', 'Brew-Ha-Ha', 'Side Effects May Vary', 'Mostly Not Poison', 'The Philter Bubble', 'Shake Well Before Dying',
                'The Cure-ious Cauldron', 'Elixir Sure?', 'Better Living Through Alchemy', 'No Refunds on Polymorph',
                'The Potion Commotion', 'Test Subjects Wanted', 'Vial Things', 'Flask & Furious']
        },
        herbalist: {
            label: 'Herbalist & Healer', icon: '🌿', group: 'Magic & Faith',
            nouns: ['Sage', 'Thyme', 'Mint', 'Lavender', 'Willow', 'Mushroom', 'Root', 'Bramble', 'Fern', 'Clover', 'Nettle', 'Hedgehog',
                'Bee', 'Poultice', 'Seed Pouch', 'Foxglove', 'Mistletoe', 'Birch'],
            places: ['Herbs', 'Remedies', 'Healing House', 'Garden', 'Simples', 'Greenhouse', 'Physick', 'Herbery', 'Infirmary', 'Cures'],
            puns: ['Herb Your Enthusiasm', 'Sage Advice', 'Root of the Problem', 'Thyme Heals', 'Weeds & Needs', 'Nettle Down',
                'Fern Gully Remedies', 'Mint Condition', 'Better Leaf It', 'Shroom With a View', 'Grow a Pair (of Herbs)',
                'Plant-Based Miracles']
        },
        arcane: {
            label: 'Arcane Emporium', icon: '🔮', group: 'Magic & Faith',
            nouns: ['Owl', 'Wand', 'Grimoire', 'Crystal', 'Star', 'Familiar', 'Rune', 'Hourglass', 'Moon', 'Comet', 'Scroll', 'Candle',
                'Pentacle', 'Orb', 'Staff', 'Black Cat', 'Toad', 'Spellbook', 'Astrolabe', 'Imp', 'Sigil', 'Eclipse', 'Mirror'],
            places: ['Arcana', 'Emporium', 'Curios', 'Scrolls', 'Enchantments', 'Wonders', 'Mysteries', 'Spellcraft', 'Sorceries',
                'Conjurations', 'Magicks', 'Esoterica', 'Sanctum'],
            puns: ['Wand-erlust', 'Hex & the City', 'Spell-Check', 'No Refunds on Fireballs', 'Abra-Kadeal', 'Mage Against the Machine',
                'Scroll With It', 'Rune Your Day', 'Magic Missile & Mortar', 'Hocus Bogus', 'Spells R Us', 'Witch Way',
                'Arcane & Able', 'Conjure Up a Bargain', 'Prestidigitation Station']
        },
        temple: {
            label: 'Temple & Shrine', icon: '⛪', group: 'Magic & Faith',
            nouns: ['Dawn', 'Sun', 'Moon', 'Star', 'Chalice', 'Candle', 'Bell', 'Dove', 'Lantern', 'Censer', 'Altar', 'Holy Symbol',
                'Golden Hand', 'Silver Tear', 'Open Door', 'Burning Heart', 'Martyr', 'Pilgrim', 'Shepherd', 'Relic'],
            places: ['Temple', 'Shrine', 'Chapel', 'Sanctuary', 'Abbey', 'Cathedral', 'Priory', 'Sanctum', 'Oratory', 'Hospice',
                'House of Mercy', 'Hall of Prayers', 'Monastery'],
            puns: ['Holy Water (Tap)', 'Pray as You Go', 'The Divine Intervention Desk', 'Resurrections by Appointment',
                'Saint Elsewhere', 'Pew Pew', 'Sanctuary Much', 'Faith Healing (Faith Not Included)', 'Raise Dead, Lower Prices',
                'Blessed Be the Bargains', 'The Second Coming (Back Soon)', 'Higher Powers & Lower Rates']
        },
        barber: {
            label: 'Barber-Surgeon & Bathhouse', icon: '💈', group: 'Services & Vice',
            nouns: ['Razor', 'Comb', 'Leech', 'Bone Saw', 'Bath', 'Towel', 'Bucket', 'Soap', 'Lather', 'Beard', 'Mustache',
                'Striped Pole', 'Scalpel', 'Steam', 'Sponge', 'Hot Stone', 'Bandage'],
            places: ['Barbers', 'Bathhouse', 'Baths', 'Surgery', 'Shaves', 'Clippers', 'Steamroom', 'Bloodletters', 'Grooming Hall', 'Springs'],
            puns: ['Shear Madness', 'Hair Today, Gone Tomorrow', 'Bloodletting & Beard Trims', 'A Close Shave', 'Curl Up & Dye',
                'Bathe & Behave', 'The Mane Event', 'Soap Opera', 'Two Shaves & a Leeching', 'Clean Getaway',
                'Steamed & Esteemed', 'Bit Off the Top (Ear Optional)']
        },
        gambling: {
            label: 'Gambling Den', icon: '🎲', group: 'Services & Vice',
            nouns: ['Die', 'Card', 'Wheel', 'Ace', 'Joker', 'Coin', 'Jackpot', 'Knucklebone', 'Dragon Chess Board', 'Rat',
                'Fighting Cock', 'Dealer', 'Snake Eyes', 'Gold Crown', 'Wager', 'Fortune'],
            places: ['Gaming House', 'Den', 'Casino', 'Card Room', 'Dice Hall', 'Pit', 'Parlor', 'Racehouse', 'Games', 'Club'],
            puns: ['House Always Wins', 'Roll With It', 'Snake Eyes & Broken Dreams', 'Lady Luck\'s Lament', 'The Loaded Die',
                'Ace in the Hold', 'Bet the Farm', 'All In or All Out', 'Cut Your Losses (Or Fingers)', 'Odds Are Good',
                'The Natural One', 'Deal With the Devil', 'Stakes & Steaks']
        },
        theater: {
            label: 'Playhouse & Theater', icon: '🎭', group: 'Services & Vice',
            nouns: ['Mask', 'Curtain', 'Jester', 'Lute', 'Stage', 'Spotlight', 'Swan', 'Chorus', 'Harlequin', 'Puppet', 'Rose',
                'Crown', 'Dagger', 'Skull', 'Lyre', 'Nightingale', 'Fool'],
            places: ['Playhouse', 'Theater', 'Stage', 'Opera House', 'Amphitheater', 'Players', 'Music Hall', 'Revue', 'Odeon', 'Showhouse', 'Troupe'],
            puns: ['Break a Leg (Not Literally)', 'Curtain Call', 'All the World\'s a Stage Fright', 'The Plot Thickens', 'Drama Llamas',
                'Exit, Pursued by Owlbear', 'Encore Encore', 'Act Natural', 'Bard Times', 'To Be Seated or Not to Be',
                'Much Ado About Mutton', 'Stage Fright Night']
        },
        tattoo: {
            label: 'Tattooist & Inkwright', icon: '🖋️', group: 'Services & Vice',
            nouns: ['Needle', 'Ink', 'Snake', 'Anchor', 'Rose', 'Dragon', 'Skull', 'Heart', 'Dagger', 'Swallow', 'Rune',
                'Kraken', 'Serpent', 'Phoenix', 'Mermaid', 'Scorpion'],
            places: ['Ink', 'Tattoos', 'Inkworks', 'Studio', 'Parlor', 'Markings', 'Needlework', 'Ink House', 'Skin Art'],
            puns: ['Ink Inc.', 'Needle in a Haystack', 'Skin Deep', 'Mom (Spelled Correctly)', 'Permanent Marker',
                'Ink Positive', 'No Regrets (Some Regrets)', 'Inked & Enchanted', 'Rune-ed for Life', 'Tat\'s All Folks',
                'Pain Is Temporary', 'Sailor\'s Delight']
        },
        guild: {
            label: 'Guildhall & Mercenaries', icon: '🛡️', group: 'Services & Vice',
            nouns: ['Shield', 'Banner', 'Sword', 'Gauntlet', 'Wolf', 'Lion', 'Griffon', 'Crossed Axes', 'Helm', 'Torch',
                'Sentinel', 'Hammer', 'Oath', 'Iron Fist', 'Raven', 'Dragon', 'Spear', 'Bounty'],
            places: ['Guildhall', 'Company', 'Brotherhood', 'Sisterhood', 'Lodge', 'Band', 'Free Company', 'Hall', 'Legion',
                'Fellowship', 'Watch', 'Contract Office', 'Order'],
            puns: ['Swords for Hire, Sorry for Nothing', 'Adventurers Anonymous', 'Rent-a-Hero', 'Quest Board & Breakfast',
                'The Hired Help', 'Heroes Wanted (Reasonable Rates)', 'Mercs & Murk', 'Bounty Full', 'The Usual Suspects',
                'Dungeon Delvers Local 404', 'Dibs on the Loot', 'Grudges Settled Daily']
        },
        docks: {
            label: 'Chandler & Shipwright', icon: '⚓', group: 'Goods & Trade',
            nouns: ['Anchor', 'Mast', 'Sail', 'Rigging', 'Tar', 'Rope', 'Gull', 'Barnacle', 'Oar', 'Lighthouse', 'Compass',
                'Ship\'s Bell', 'Harpoon', 'Crab', 'Mermaid', 'Kraken', 'Cutlass', 'Figurehead'],
            places: ['Chandlery', 'Shipyard', 'Wharf', 'Dry Dock', 'Marine Supply', 'Boatworks', 'Ropewalk', 'Sailmakers', 'Quay', 'Pier', 'Harbor Stores'],
            puns: ['Knot on My Watch', 'Ship Happens', 'Sail Away Sale', 'Pier Pressure', 'Anchors Aweigh', 'Seas the Day',
                'Hull of a Deal', 'The Salty Dog', 'Plank You Very Much', 'Wave Goodbye', 'Keel Over Prices', 'Oar Else']
        },
        monster: {
            label: 'Monster Parts Dealer', icon: '🦴', group: 'Goods & Trade',
            nouns: ['Owlbear Feather', 'Troll Tooth', 'Basilisk Eye', 'Dragon Scale', 'Beholder Stalk', 'Mimic Tongue', 'Wyvern Stinger',
                'Hydra Head', 'Manticore Spike', 'Gorgon Horn', 'Harpy Talon', 'Ooze Jar', 'Bone', 'Skull', 'Pelt', 'Fang'],
            places: ['Trophies', 'Bestiary', 'Parts & Pieces', 'Reagents', 'Rendery', 'Taxidermy', 'Hides & Horns', 'Remains', 'Spoils', 'Salvage'],
            puns: ['Fresh Kills Daily', 'No Refunds, No Returns, No Revivals', 'Parts Unknown', 'Hunter\'s Bounty', 'Some Assembly Required',
                'Bits of Beasts', 'The Butchered Beholder', 'Eye of Newt (Real Newt)', 'Dead on Arrival', 'Gross Margins',
                'Claws for Celebration', 'Fang-tastic Finds']
        }
    },
    // {adj} {noun} / {noun} & {noun} / {owner}'s {place} / {adj} {noun} {place} / pun, plus the shared
    // tables. Every pattern returns '' when it can't make a name for a type, and rollShopName rerolls.
    patterns: [
        { weight: 9, make: (t) => `The ${randomArray(NAME_TABLES.adjectives)} ${randomArray(t.nouns)}` },
        { weight: 2, make: (t) => alliterative(t) },
        { weight: 4, make: (t) => { const [a, b] = twoDifferent(t.nouns); return `${t.pairPrefix || ''}${a} & ${b}`; } },
        { weight: 5, make: (t, owner) => owner ? `${owner}'s ${randomArray(t.places)}` : `The ${randomArray(t.nouns)} ${randomArray(t.places)}` },
        { weight: 2, make: (t, owner) => owner ? `${randomArray(NAME_TABLES.titles)} ${owner}'s ${randomArray(t.places)}` : '' },
        { weight: 2, make: (t, owner) => owner ? `${owner} & ${randomArray(NAME_TABLES.kin)}` : '' },
        { weight: 2, make: (t, owner) => owner ? `${owner}'s ${randomArray(NAME_TABLES.adjectives)} ${randomArray(t.nouns)}` : '' },
        { weight: 4, make: (t) => `${randomArray(NAME_TABLES.adjectives)} ${randomArray(t.nouns)} ${randomArray(t.places)}` },
        { weight: 3, make: (t) => `The ${randomArray(t.nouns)} ${randomArray(t.places)}` },
        { weight: 3, make: (t) => `${randomArray(NAME_TABLES.spots)} ${randomArray(t.places)}` },
        { weight: 3, make: (t) => possessive(t) },
        { weight: 3, make: (t) => `The ${randomArray(t.nouns)} ${randomArray(NAME_TABLES.preps)} ${randomArray(NAME_TABLES.settings)}` },
        { weight: 3, make: (t) => counted(t) },
        { weight: 2, make: (t) => `${randomArray(NAME_TABLES.pairs)} ${randomArray(t.places)}` },
        { weight: 1, make: (t) => `Ye Olde ${randomArray(t.nouns)} ${randomArray(t.places)}` },
        { weight: 5, pun: true, make: (t) => randomArray(t.puns) }
    ]
};

const PLURAL_IRREGULAR = {
    Ox: 'Oxen', Mouse: 'Mice', Goose: 'Geese', Foot: 'Feet', Tooth: 'Teeth', Man: 'Men', Woman: 'Women',
    Wolf: 'Wolves', Loaf: 'Loaves', Shelf: 'Shelves', Elf: 'Elves', Dwarf: 'Dwarves', Leaf: 'Leaves', Knife: 'Knives',
    Calf: 'Calves', Half: 'Halves', Thief: 'Thieves', Staff: 'Staves', Hoof: 'Hooves', Scarf: 'Scarves', Wife: 'Wives',
    Sheep: 'Sheep', Deer: 'Deer', Fish: 'Fish', Salmon: 'Salmon', Swine: 'Swine', Moose: 'Moose', Die: 'Dice',
    Gnome: 'Gnomes', Cube: 'Cubes', Hart: 'Harts', Scissors: 'Scissors', Halfling: 'Halflings', Kobold: 'Kobolds',
    Mongoose: 'Mongooses', Bass: 'Bass', Cod: 'Cod', Eel: 'Eels', Herring: 'Herring'
};

// Where a noun phrase's head ends: "Coil| of Rope", "Ship| in a Bottle".
function headEnd(phrase) {
    const m = phrase.match(/ (of|in) /);
    return m ? m.index : -1;
}

// "Coil of Rope" → "Coils of Rope", "Clockwork Mouse" → "Clockwork Mice".
function pluralize(phrase) {
    const of = headEnd(phrase);
    if (of > 0) return pluralize(phrase.slice(0, of)) + phrase.slice(of);
    const words = phrase.split(' ');
    const w = words.pop();
    let p;
    if (PLURAL_IRREGULAR[w]) p = PLURAL_IRREGULAR[w];
    else if (/[^aeiou]y$/.test(w)) p = w.slice(0, -1) + 'ies';
    else if (/(s|x|z|ch|sh)$/.test(w)) p = w + 'es';
    else if (/[^aeiou]o$/.test(w) && !/(piano|banjo|cello|halo)$/i.test(w)) p = w + 'es';
    else p = w + 's';
    return [...words, p].join(' ');
}

// "The Hog's Head". "Jar of Jam" uses its head noun ("The Jar's Rest"); nouns that
// already hold an apostrophe ("Ship's Bell") can't take another, so the pattern passes.
function possessive(t) {
    let noun = randomArray(t.nouns);
    if (noun.includes("'")) return '';
    const of = headEnd(noun);
    if (of > 0) noun = noun.slice(0, of);
    return `The ${noun}'s ${randomArray(NAME_TABLES.belongings)}`;
}

// "The Three Drunken Hogs" or "The Seven Barrels" (skips nouns that can't be counted,
// already plural like "Snake Eyes", or holding an apostrophe).
function counted(t) {
    const pool = t.nouns.filter(n => !NAME_TABLES.uncountable.includes(n) && !n.includes("'") && !/[^s]s$/.test(n.split(/ (?:of|in) /)[0]));
    if (!pool.length) return '';
    const adj = rand() < 0.5 ? randomArray(NAME_TABLES.adjectives) + ' ' : '';
    return `The ${randomArray(NAME_TABLES.numbers)} ${adj}${pluralize(randomArray(pool))}`;
}

// "The Bashful Badger": an adjective that starts with the same letter as the noun.
function alliterative(t) {
    const noun = randomArray(t.nouns);
    const pool = NAME_TABLES.adjectives.filter(a => a[0] === noun[0]);
    return pool.length ? `The ${randomArray(pool)} ${noun}` : '';
}

function twoDifferent(list) {
    const a = randomArray(list);
    let b = randomArray(list);
    while (b === a && list.length > 1) b = randomArray(list);
    return [a, b];
}

// A name reads wrong when a word repeats ("The Anvil Anvil", "Golden Gold Crown", "Bookworm Books").
function repeatsWord(name) {
    const words = name.toLowerCase().replace(/[^a-z' -]/g, '').split(/[\s-]+/)
        .filter(w => w.length > 3 && !['the', 'and'].includes(w))
        .map(w => w.replace(/'s$/, '').replace(/(ies|es|s)$/, ''));
    return words.some((w, i) => words.some((v, j) => i !== j && v.length >= 4 && w.startsWith(v)));
}

// A shop name for a type ('blacksmith', 'alchemist', …). owner is optional (first name).
function rollShopName(type, owner) {
    const t = NAME_TABLES.types[type] || NAME_TABLES.types.general;
    const total = NAME_TABLES.patterns.reduce((s, p) => s + p.weight, 0);
    let name = '';
    for (let tries = 0; tries < 12; tries++) {
        let r = randomInt(1, total);
        const pattern = NAME_TABLES.patterns.find(p => (r -= p.weight) <= 0);
        name = pattern.make(t, owner);
        if (name && (pattern.pun || !repeatsWord(name))) return name;
    }
    return name || randomArray(t.puns);
}

// The Toolbox name generator (F21): count different names for a type, or for any
// type when type is 'random'. Each name gets an owner (a first name from rollNames)
// for the owner patterns. Returns [{ name, type }].
function rollPlaceNames(type, count = 10) {
    const types = Object.keys(NAME_TABLES.types);
    const out = [];
    const seen = new Set();
    for (let tries = 0; out.length < count && tries < count * 25; tries++) {
        const t = types.includes(type) ? type : randomArray(types);
        const owner = rollNames(1)[0].first;
        const name = rollShopName(t, owner);
        if (seen.has(name)) continue;
        seen.add(name);
        out.push({ name, type: t });
    }
    return out;
}
