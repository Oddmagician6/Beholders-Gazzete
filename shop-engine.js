/* ============================================
   SHOP ENGINE
   Rolls a shop: name (names-data.js), shopkeeper (rollNPC from npc-data.js),
   and stock drawn from the Realm Market Exchange item list (market-data.js).
   A rolled shop stores item ids and quantities only; prices are read live from
   marketPrice(), so they move with the Market Exchange every 15 minutes.
   Used by shop.html (shop.js) and the Session Kit.
   ============================================ */

const SHOP_TYPES = {
    general: {
        label: 'General Store', icon: '🏪',
        keepers: ['General Store Owner', 'Shopkeeper', 'Trader', 'Grocer'],
        categories: ['adventuring-gear'],
        ids: ['bread-loaf', 'cheese-wedge', 'salt-pound', 'ale-gallon', 'potion-of-healing', 'tinderbox', 'rations-1-day'],
        exclude: ['spyglass', 'magnifying-glass', 'spellbook', 'component-pouch', 'scale-merchant-s'],
        count: [10, 16],
        greetings: ["If we don't have it, you don't need it. If you need it, we're out.", "Rope's in the back. Everyone wants rope.", "Wipe your boots. Last party tracked in an ooze.", "We sell everything but regret. Regret is next door.", "Prices are fair. The scales are honest. The cat is a liar."]
    },
    blacksmith: {
        label: 'Blacksmith & Armorer', icon: '⚒️',
        keepers: ['Blacksmith', 'Armorer', 'Weaponsmith', 'Smith'],
        categories: ['weapons', 'armor'],
        ids: ['smith-s-tools', 'chain-10-feet', 'spikes-iron-10', 'piton', 'crowbar', 'hammer', 'hammer-sledge', 'manacles', 'lock', 'pot-iron', 'whetstone', 'iron-pound', 'steel-pound'],
        exclude: ['shortbow', 'longbow', 'crossbow-light', 'crossbow-hand', 'crossbow-heavy', 'sling', 'blowgun', 'net',
                  'arrows-20', 'blowgun-needles-50', 'crossbow-bolts-20', 'sling-bullets-20', 'quarterstaff', 'club', 'greatclub', 'padded-armor', 'leather-armor', 'studded-leather', 'hide-armor'],
        count: [10, 16],
        greetings: ["Mind the anvil. It's older than you and twice as stubborn.", "Pointy end goes in the other fellow. That's the only lesson that's free.", "Repairs are extra. Dragon damage is extra-extra.", "Bring it back if it bends. Bring me the thing that bent it, too.", "If you hear a scream, that's the bellows. Usually."]
    },
    bowyer: {
        label: 'Bowyer & Fletcher', icon: '🏹',
        keepers: ['Bowyer', 'Fletcher', 'Archer (Retired)'],
        categories: [],
        ids: ['shortbow', 'longbow', 'crossbow-light', 'crossbow-hand', 'crossbow-heavy', 'sling', 'blowgun', 'arrows-20', 'crossbow-bolts-20',
              'blowgun-needles-50', 'sling-bullets-20', 'quiver', 'case-crossbow-bolt', 'javelin', 'dart', 'net', 'hunting-trap', 'ammunition-box'],
        exclude: [],
        count: [7, 12],
        greetings: ["Don't test the draw weight in here. The ceiling has suffered enough.", "Arrows come back if you're good. Mostly they don't.", "Every bow in this shop has hit something. Not always the target.", "Elf-made? No. Elf-approved? Ask the elf.", "A good bow is like a good friend. It breaks your heart if you pull too hard."]
    },
    alchemist: {
        label: 'Alchemist & Apothecary', icon: '⚗️',
        keepers: ['Alchemist', 'Apothecary', 'Herbalist', 'Potion Seller'],
        categories: ['consumables'],
        ids: ['alchemist-s-supplies', 'herbalism-kit', 'poisoner-s-kit', 'medicine-kit', 'vial', 'bottle-glass', 'perfume-vial', 'oil-flask', 'soap', 'spices-pound'],
        exclude: ['spell-scroll-cantrip', 'spell-scroll-1st-level', 'spell-scroll-2nd-level', 'spell-scroll-3rd-level', 'spell-scroll-4th-level', 'spell-scroll-5th-level'],
        count: [8, 14],
        greetings: ["Don't touch the green one. Or the other green one.", "Side effects are part of the experience.", "Everything's labeled. Some labels are even accurate.", "Smell that? No? Good. Keep it that way.", "Explosions are a sign of progress."]
    },
    arcane: {
        label: 'Arcane Emporium', icon: '🔮',
        keepers: ['Scroll Merchant', 'Enchanter', 'Hedge Wizard', 'Arcanist'],
        categories: ['magic-items'],
        ids: ['spell-scroll-cantrip', 'spell-scroll-1st-level', 'spell-scroll-2nd-level', 'spell-scroll-3rd-level', 'spell-scroll-4th-level',
              'spell-scroll-5th-level', 'component-pouch', 'spellbook', 'ink-1-ounce-bottle', 'parchment-sheet', 'potion-of-invisibility'],
        exclude: [],
        count: [6, 10],
        greetings: ["Browse with your eyes. The last fellow who browsed with his hands is the umbrella stand now.", "All sales final. Some curses also final.", "Yes, the owl is for sale. No, the owl has not agreed to that.", "The shop finds the customer. You're welcome.", "Don't read anything out loud. Anything."]
    },
    stable: {
        label: 'Stable & Wainwright', icon: '🐴',
        keepers: ['Livestock Trader', 'Stablehand', 'Wainwright', 'Horse Trader'],
        categories: ['mounts'],
        ids: ['hay-bale', 'grain-bushel', 'rope-hempen-50-feet', 'blanket'],
        exclude: [],
        count: [6, 10],
        greetings: ["That one bites. That one also bites. Assume they all bite.", "Stabling's by the day. Griffons are by the hour, for your safety.", "No refunds on mules. The mule decides when the sale is final.", "Pick a horse. Any horse. Not that one.", "They're all gentle as lambs. The lambs here are terrible."]
    },
    provisioner: {
        label: 'Grocer & Provisioner', icon: '🧀',
        keepers: ['Grocer', 'Spice Trader', 'Butcher', 'Baker'],
        categories: [],
        ids: ['ale-gallon', 'bread-loaf', 'cheese-wedge', 'chicken', 'fish-fresh', 'meat-chunk', 'wine-bottle', 'wine-fine-bottle', 'salt-pound',
              'spices-pound', 'sugar-pound', 'flour-pound', 'grain-bushel', 'rations-1-day', 'waterskin', 'mess-kit', 'cook-s-utensils',
              'brewer-s-supplies', 'barrel', 'jug-or-pitcher', 'flask-or-tankard', 'pot-iron', 'basket', 'sack'],
        exclude: [],
        count: [10, 15],
        greetings: ["The cheese is aged. So is the fish, but less on purpose.", "Rations for the road? They'll outlive you. Good value.", "Fresh today. Or yesterday. It's fresh to someone.", "Try the sausage. Don't ask about the sausage.", "Taste before you buy. Pay before you taste."]
    },
    tinker: {
        label: "Tinker's Workshop", icon: '⚙️',
        keepers: ['Tinker', 'Clockmaker', 'Map Maker', 'Artificer'],
        categories: ['tools'],
        ids: ['hourglass', 'lock', 'magnifying-glass', 'spyglass', 'abacus', 'lantern-bullseye', 'lantern-hooded', 'lamp', 'mirror-steel',
              'block-and-tackle', 'scale-merchant-s', 'ball-bearings-bag-of-1000', 'signal-whistle'],
        exclude: ['disguise-kit', 'forgery-kit', 'thieves-tools', 'poisoner-s-kit', 'land-vehicle', 'herbalism-kit', 'medicine-kit'],
        count: [8, 14],
        greetings: ["Careful, that one's wound up. So am I.", "If it ticks, I made it. If it explodes, I made it earlier.", "Some assembly required. Some disassembly unavoidable.", "It's not broken, it's thinking.", "Every gear has a purpose. I'm still working out a few."]
    },
    curio: {
        label: 'Curio & Pawn', icon: '🗝️',
        keepers: ['Pawnbroker', 'Collector', 'Fence (Allegedly)', 'Antiquarian'],
        categories: [],
        ids: ['gemstones-100gp', 'gemstones-500gp', 'art-object-25gp', 'art-object-250gp', 'art-object-750gp', 'dragon-scale', 'phoenix-feather',
              'unicorn-horn', 'silver-pound', 'gold-pound', 'signet-ring', 'spyglass', 'perfume-vial', 'clothes-fine', 'silk-yard', 'velvet-yard',
              'fur-pelt', 'dice-set', 'playing-card-set', 'thieves-tools', 'disguise-kit', 'forgery-kit', 'hourglass', 'book'],
        exclude: [],
        wildcards: 2, // plus a couple of anything-goes items from the whole market
        count: [8, 12],
        greetings: ["No questions asked. Also no questions answered.", "That sword? Belonged to a hero. Briefly.", "Everything here has a story. Most of them end badly.", "Haunted? Only on weekends.", "I don't buy stolen goods. I buy goods that have had adventures."]
    },
    tailor: {
        label: 'Tailor & Clothier', icon: '🧵',
        keepers: ['Tailor', 'Seamstress', 'Clothier', 'Dressmaker'],
        categories: [],
        ids: ['clothes-common', 'clothes-costume', 'clothes-fine', 'clothes-traveler-s', 'robes', 'linen-yard', 'silk-yard', 'velvet-yard', 'wool-yard',
              'weaver-s-tools', 'blanket', 'pouch', 'bedroll', 'backpack', 'sack', 'perfume-vial'],
        exclude: [],
        count: [7, 12],
        greetings: ["Arms up. No, higher. You've been wearing that cloak inside out.", "I can let it out, but I can't let it out forever.", "Blood comes out with cold water and a stern word.", "Measurements first, then we talk about what you've done to that hem."]
    },
    leatherworker: {
        label: 'Leatherworker & Cobbler', icon: '👢',
        keepers: ['Leatherworker', 'Cobbler', 'Tanner', 'Saddler'],
        categories: [],
        ids: ['leather-armor', 'studded-leather', 'hide-armor', 'leatherworker-s-tools', 'cobbler-s-tools', 'leather-square-yard', 'fur-pelt', 'saddlebags',
              'saddle-riding', 'saddle-military', 'waterskin', 'backpack', 'pouch', 'quiver', 'case-map-or-scroll', 'case-crossbow-bolt', 'whip', 'sling'],
        exclude: [],
        count: [7, 12],
        greetings: ["Boots off at the door. Yes, I want to see them. I can tell a lot from a boot.", "The smell? That's the smell of quality.", "Every pair is broken in by hand. Mostly mine.", "Don't ask what the purple leather is from."]
    },
    jeweler: {
        label: 'Jeweler & Gemcutter', icon: '💍',
        keepers: ['Jeweler', 'Gemcutter', 'Goldsmith', 'Silversmith'],
        categories: [],
        ids: ['jeweler-s-tools', 'gemstones-100gp', 'gemstones-500gp', 'gemstones-1000gp', 'gold-pound', 'silver-pound', 'platinum-pound', 'copper-pound',
              'signet-ring', 'art-object-25gp', 'art-object-250gp', 'art-object-750gp', 'mirror-steel', 'perfume-vial', 'magnifying-glass', 'scale-merchant-s',
              'ring-of-warmth', 'ring-of-swimming', 'ring-of-jumping', 'ring-of-protection'],
        exclude: [],
        count: [6, 10],
        greetings: ["Look with your eyes. My guard looks with his crossbow.", "That? Paste. This? Also paste. That one, though? That one's real.", "Every stone has a flaw. Like every customer.", "Selling or buying? Your face says selling."]
    },
    scribe: {
        label: 'Scribe & Bookbinder', icon: '📜',
        keepers: ['Scribe', 'Bookbinder', 'Copyist', 'Notary'],
        categories: [],
        ids: ['book', 'ink-1-ounce-bottle', 'ink-pen', 'paper-sheet', 'parchment-sheet', 'sealing-wax', 'calligrapher-s-supplies', 'case-map-or-scroll',
              'cartographer-s-tools', 'painter-s-supplies', 'spellbook', 'spell-scroll-cantrip', 'spell-scroll-1st-level', 'chalk-1-piece', 'candle',
              'abacus', 'hourglass', 'forgery-kit'],
        exclude: [],
        count: [7, 12],
        greetings: ["Quiet, please. The ink is drying and so is my patience.", "Letters, contracts, love poems. Prices go up in that order.", "Don't lean on the books. They remember.", "If you can't spell it, I charge extra to guess."]
    },
    temple: {
        label: 'Temple Shop', icon: '⛪',
        keepers: ['Acolyte', 'Temple Quartermaster', 'Almoner', 'Lay Healer'],
        categories: [],
        ids: ['holy-water', 'healer-s-kit', 'antitoxin-vial', 'antidote', 'potion-of-healing', 'potion-of-greater-healing', 'candle', 'robes', 'bell',
              'medicine-kit', 'spell-scroll-1st-level', 'spell-scroll-2nd-level', 'blanket', 'rations-1-day', 'soap', 'bread-loaf', 'wine-bottle'],
        exclude: [],
        count: [6, 10],
        greetings: ["Blessings upon you. Donations upon the plate.", "The holy water is holy. The price is merely fair.", "Wounded? Cursed? Possessed? Take a number.", "The god sees all purchases. Especially the returns."]
    },
    docks: {
        label: 'Ship Chandler', icon: '⚓',
        keepers: ['Chandler', 'Harbor Trader', 'Old Salt', 'Sailmaker'],
        categories: [],
        ids: ['rope-hempen-50-feet', 'rope-silk-50-feet', 'navigation-tools', 'fishing-tackle', 'block-and-tackle', 'grappling-hook', 'barrel', 'spyglass',
              'signal-whistle', 'lantern-hooded', 'oil-flask', 'net', 'trident', 'potion-of-water-breathing', 'salt-pound', 'fish-fresh', 'waterskin',
              'rations-1-day', 'wood-cord', 'bucket', 'chest', 'pole-10-foot', 'ring-of-swimming'],
        exclude: [],
        count: [8, 13],
        greetings: ["Sailing or sinking? I stock for both.", "Rope's by the fathom. Advice is free and usually wrong.", "The tide waits for no one. Neither do I. Make it quick.", "If it floats, I sell it. If it doesn't, I sell it cheaper."]
    },
    // The newer types (E8). A random roll lands on one of them through shopMoreType, under its own seed.
    tavern: {
        label: 'Taproom & Cellar', icon: '🍺',
        keepers: ['Innkeeper', 'Tapster', 'Cellarman', 'Barkeep'],
        categories: [],
        ids: ['ale-gallon', 'wine-bottle', 'wine-fine-bottle', 'flask-or-tankard', 'jug-or-pitcher', 'bread-loaf', 'cheese-wedge', 'meat-chunk', 'rations-1-day',
              'candle', 'blanket', 'bedroll', 'dice-set', 'playing-card-set', 'barrel', 'waterskin', 'stabling-per-day', 'feed-per-day'],
        exclude: [],
        count: [7, 11],
        greetings: ["Drinking or sleeping? Both is fine. Both at once is extra.", "Barrels by the gallon, bottles by the bottle, regrets by the morning.", "We sell it to take away. Bring the jug back or I charge for the jug.", "The cellar's cool, the ale's cooler, and the cellarman is the coolest of all. He's a ghost.", "Room's upstairs. Lock's on the inside. Mostly.", "If it's wet and it's not water, I have it."]
    },
    bakery: {
        label: 'Bakery', icon: '🥖',
        keepers: ['Baker', 'Pastry Cook', "Baker's Widow", 'Miller'],
        categories: [],
        ids: ['bread-loaf', 'flour-pound', 'sugar-pound', 'salt-pound', 'spices-pound', 'cheese-wedge', 'rations-1-day', 'basket', 'sack',
              'cook-s-utensils', 'mess-kit', 'pot-iron', 'jug-or-pitcher', 'wood-cord'],
        exclude: [],
        count: [6, 10],
        greetings: ["Mind the oven door. It bites harder than I do.", "Yesterday's loaves at half price. Last week's are for throwing at goblins.", "Up before the sun every day of my life. Don't ask me anything complicated.", "Flour on your boots means you've been somewhere good.", "Pies are fresh. The pie with the cross on it is for the baron. Don't touch the baron's pie.", "Waybread? No. Way-better-bread, yes."]
    },
    butcher: {
        label: 'Butcher & Smokehouse', icon: '🥩',
        keepers: ['Butcher', 'Smokehouse Keeper', 'Slaughterman', 'Sausage Maker'],
        categories: [],
        ids: ['meat-chunk', 'chicken', 'fish-fresh', 'salt-pound', 'spices-pound', 'rations-1-day', 'fur-pelt', 'leather-square-yard', 'hunting-trap',
              'sack', 'barrel', 'dagger', 'handaxe', 'cook-s-utensils', 'pot-iron', 'soap', 'candle'],
        exclude: [],
        count: [7, 11],
        greetings: ["Everything's fresh except the jokes.", "Don't mind the cleaver. It's for the meat. Usually.", "Smoked, salted, or still kicking. Your choice.", "I'll take any beast you bring me, as long as it stays dead.", "Every sausage has a secret. Mine's mostly pig.", "Wipe your hands before you shake mine. Actually, don't shake mine."]
    },
    brewery: {
        label: 'Brewer & Vintner', icon: '🍷',
        keepers: ['Brewer', 'Vintner', 'Distiller', 'Meadmaker'],
        categories: [],
        ids: ['ale-gallon', 'wine-bottle', 'wine-fine-bottle', 'brewer-s-supplies', 'barrel', 'bottle-glass', 'jug-or-pitcher', 'flask-or-tankard',
              'grain-bushel', 'sugar-pound', 'spices-pound', 'vial', 'waterskin', 'glassblower-s-tools'],
        exclude: [],
        count: [6, 10],
        greetings: ["Tasting's free. Standing up afterward is your problem.", "This one's a good year. That one was a bad year, but it's a great wine.", "The vats are bubbling. That's normal. The singing isn't.", "We age it in oak. The oak was not consulted.", "Buy a barrel and I'll throw in the hangover.", "Keep it out of the sun and away from dwarves."]
    },
    carpenter: {
        label: 'Carpenter & Cooper', icon: '🪚',
        keepers: ['Carpenter', 'Cooper', 'Joiner', 'Cartwright'],
        categories: [],
        ids: ['carpenter-s-tools', 'woodcarver-s-tools', 'wood-cord', 'barrel', 'chest', 'ladder-10-foot', 'pole-10-foot', 'bucket', 'quarterstaff',
              'club', 'greatclub', 'shield', 'cart', 'sled', 'land-vehicle', 'ram-portable', 'hammer', 'basket'],
        exclude: [],
        count: [7, 11],
        greetings: ["Measure twice, cut once, charge three times.", "Mind the sawdust. It gets everywhere. I've found it in my soup.", "Every barrel's watertight. I sat in one in the river to prove it.", "Oak for strength, pine for price, ash for the fellow who can't decide.", "That's not a coffin. That's a long chest. Don't ask who ordered it.", "Splinters are free with every purchase."]
    },
    mason: {
        label: 'Stonemason & Builder', icon: '🧱',
        keepers: ['Stonemason', 'Master Builder', 'Quarryman', 'Bricklayer'],
        categories: [],
        ids: ['mason-s-tools', 'potter-s-tools', 'hammer', 'hammer-sledge', 'pick-miner-s', 'chalk-1-piece', 'shovel', 'block-and-tackle', 'crowbar',
              'ladder-10-foot', 'bucket', 'spikes-iron-10', 'rope-hempen-50-feet', 'piton', 'iron-pound'],
        exclude: [],
        count: [6, 10],
        greetings: ["Stone lasts forever. My invoices too.", "That wall's been standing three hundred years. I built the bit that's leaning.", "Mind the gargoyle. It's a commission, and it's being difficult.", "If you want it done fast, hire a carpenter.", "Dwarves say my work is acceptable. That's the highest praise there is.", "Every tower starts with one stone. Most of them end with a lawsuit."]
    },
    cartographer: {
        label: 'Cartographer & Guide', icon: '🗺️',
        keepers: ['Cartographer', 'Mapmaker', 'Guide', 'Surveyor'],
        categories: [],
        ids: ['cartographer-s-tools', 'navigation-tools', 'case-map-or-scroll', 'paper-sheet', 'parchment-sheet', 'ink-1-ounce-bottle', 'ink-pen', 'spyglass',
              'hourglass', 'magnifying-glass', 'signal-whistle', 'tent-two-person', 'bedroll', 'climber-s-kit', 'rations-1-day', 'waterskin', 'lantern-hooded', 'book'],
        exclude: [],
        count: [7, 11],
        greetings: ["Where are you going? No, really, where? Most people point vaguely.", "Every map is right. The land just keeps changing.", "The blank bits are the interesting bits. They cost extra.", "Here be dragons. I checked. Personally.", "North is up. That's the only promise I make.", "That road's on the map, but I'd go around it."]
    },
    moneychanger: {
        label: 'Moneylender & Bank', icon: '🏦',
        keepers: ['Moneychanger', 'Moneylender', 'Banker', 'Clerk of the Counting House'],
        categories: [],
        ids: ['gold-pound', 'silver-pound', 'platinum-pound', 'copper-pound', 'gemstones-100gp', 'gemstones-500gp', 'gemstones-1000gp', 'scale-merchant-s',
              'abacus', 'chest', 'lock', 'signet-ring', 'pouch', 'sealing-wax', 'art-object-25gp', 'art-object-250gp'],
        exclude: [],
        count: [5, 9],
        greetings: ["Every coin is weighed, bitten, and remembered.", "Borrowing? Splendid. Paying back? We'll see.", "Interest is a tenth a month. Disinterest is free.", "Your money is safe here. Safer than you, frankly.", "We change any coin of the realm, and a few from realms that no longer exist.", "Sign here, here, and in blood here. Just a joke. Ink will do."]
    },
    herbalist: {
        label: 'Herbalist & Healer', icon: '🌿',
        keepers: ['Herbalist', 'Hedge Healer', 'Wise Woman', 'Root Doctor'],
        categories: [],
        ids: ['herbalism-kit', 'healer-s-kit', 'medicine-kit', 'antitoxin-vial', 'antidote', 'potion-of-healing', 'potion-of-animal-friendship',
              'restorative-ointment', 'spices-pound', 'soap', 'vial', 'basket', 'perfume-vial', 'candle', 'blanket'],
        exclude: [],
        count: [6, 10],
        greetings: ["Sit. Stick out your tongue. Hm. I've seen worse. Not often.", "Willow bark for the head, mint for the stomach, nothing for bad decisions.", "Everything here grows wild. Some of it grows wilder than it should.", "Don't eat the purple ones raw. Don't eat the purple ones cooked either.", "I don't do curses. I do the rash a curse leaves behind.", "Drink it all, and don't make that face."]
    },
    barber: {
        label: 'Barber-Surgeon & Bathhouse', icon: '💈',
        keepers: ['Barber', 'Barber-Surgeon', 'Bathhouse Keeper', 'Tooth-Puller'],
        categories: [],
        ids: ['healer-s-kit', 'medicine-kit', 'soap', 'perfume-vial', 'mirror-steel', 'potion-of-healing', 'antitoxin-vial', 'whetstone', 'blanket',
              'robes', 'bucket', 'vial', 'dagger'],
        exclude: [],
        count: [5, 9],
        greetings: ["Shave, haircut, or a leg off? The chair's the same for all three.", "Hold still. The razor's sharp and so am I.", "The bath's hot, the towels are clean, and the leeches are hungry.", "Every tooth I pull, I keep. Don't ask to see the jar.", "You've got a twig in your beard and a story in your eyes. Sit down.", "I used to cut for an army. Customers here complain less."]
    },
    gambling: {
        label: 'Gambling Den', icon: '🎲',
        keepers: ['Dealer', 'House Boss', 'Croupier', 'Bookmaker'],
        categories: [],
        ids: ['dice-set', 'playing-card-set', 'ale-gallon', 'wine-bottle', 'wine-fine-bottle', 'flask-or-tankard', 'signet-ring', 'disguise-kit',
              'art-object-25gp', 'gemstones-100gp', 'stone-of-good-luck', 'clothes-fine', 'perfume-vial', 'candle'],
        exclude: [],
        count: [5, 9],
        greetings: ["The house always wins. The house is very proud of that.", "Cards or dice? Dice are honest. The cards are honest-ish.", "First drink's free. The second costs you the first.", "No spells at the tables. The last wizard who tried is still a frog.", "Feeling lucky? Good. We sell luck too, in a pouch, no refunds.", "Leave your weapons at the door. Leave your sense at the door as well."]
    },
    theater: {
        label: 'Playhouse & Theater', icon: '🎭',
        keepers: ['Impresario', 'Stage Manager', 'Playwright', 'Costumer'],
        categories: [],
        ids: ['clothes-costume', 'clothes-fine', 'disguise-kit', 'painter-s-supplies', 'perfume-vial', 'mirror-steel', 'candle', 'lamp', 'book',
              'paper-sheet', 'ink-1-ounce-bottle', 'ink-pen', 'bell', 'hat-of-disguise', 'wine-bottle'],
        exclude: [],
        count: [5, 9],
        greetings: ["Tickets? Costumes? Autographs? The lead is in, but she's in a mood.", "Tonight's play is a tragedy. So are our finances.", "Everything you see here has been worn by a king. Several kings, in several plays.", "Don't say the name of the play in the green room. You know which one.", "Every seat has a view. Some of them have a view of a pillar.", "The ghost in the rafters is part of the show. We think."]
    },
    tattoo: {
        label: 'Tattooist & Inkwright', icon: '🖋️',
        keepers: ['Tattooist', 'Inkwright', 'Needle Artist', 'Rune Carver'],
        categories: [],
        ids: ['ink-1-ounce-bottle', 'ink-pen', 'painter-s-supplies', 'calligrapher-s-supplies', 'healer-s-kit', 'soap', 'mirror-steel', 'candle',
              'vial', 'whetstone', 'perfume-vial', 'paper-sheet'],
        exclude: [],
        count: [5, 8],
        greetings: ["Pick a picture off the wall, or tell me your sins and I'll draw one.", "It only hurts while I'm working. And after. And when it rains.", "Spell your mother's name for me. Twice. Slowly.", "I don't do faces. I did one face once. Never again.", "Ink's from a giant squid. It won't fade, and neither will the smell.", "Every mark means something. That one means you lost a bet."]
    },
    guild: {
        label: 'Guildhall & Mercenaries', icon: '🛡️',
        keepers: ['Guildmaster', 'Quartermaster', 'Mercenary Captain', 'Guild Clerk'],
        categories: [],
        ids: ['rations-1-day', 'bedroll', 'tent-two-person', 'backpack', 'rope-hempen-50-feet', 'torch', 'healer-s-kit', 'shield', 'spear', 'crossbow-light',
              'crossbow-bolts-20', 'chain-shirt', 'manacles', 'signal-whistle', 'climber-s-kit', 'caltrops', 'potion-of-healing', 'whetstone'],
        exclude: [],
        count: [7, 11],
        greetings: ["Hiring or for hire? Sign the book either way.", "Every blade here has a contract. Read yours before it reads you.", "The board's full of jobs. The ones with blood on the corner pay best.", "Members get a discount. Nonmembers get a lecture.", "We don't ask who you're fighting. We ask how many.", "Dues are due. Dues are always due."]
    },
    monster: {
        label: 'Monster Parts Dealer', icon: '🦴',
        keepers: ['Monster Parts Dealer', 'Trophy Hunter', 'Taxidermist', 'Beast Butcher'],
        categories: [],
        ids: ['dragon-scale', 'phoenix-feather', 'unicorn-horn', 'fur-pelt', 'leather-square-yard', 'poison-basic-vial', 'antitoxin-vial', 'acid-flask',
              'hunting-trap', 'net', 'manacles', 'chain-10-feet', 'vial', 'bottle-glass', 'potion-of-climbing', 'potion-of-animal-friendship', 'alchemist-s-supplies'],
        exclude: [],
        count: [6, 10],
        greetings: ["Fresh off the beast, or as fresh as I could carry it.", "That jar is watching you. It does that. It's only an eye now.", "Owlbear feathers, troll teeth, mimic tongue. The tongue still twitches. Bonus.", "Everything's dead. I check twice. Trolls get checked three times.", "Bring me a head and I'll pay you. Bring me a whole one and I'll pay you more.", "Don't touch the stinger. That's not a warning, that's a price list."]
    }
};

// The types a random roll drew from before E8; shopMoreType may then swap in a newer one.
const SHOP_TYPE_FIRST = ['general', 'blacksmith', 'bowyer', 'alchemist', 'arcane', 'stable', 'provisioner', 'tinker', 'curio', 'tailor', 'leatherworker', 'jeweler', 'scribe', 'temple', 'docks'];
const SHOP_TYPE_MORE = Object.keys(SHOP_TYPES).filter(k => !SHOP_TYPE_FIRST.includes(k));

// A random type: drawn from SHOP_TYPE_FIRST the way it always was, then, under its own seed (so the
// keeper and stock draws don't move), it may give way to a newer type, each type as likely as any other.
function shopMoreType(seed, drawn) {
    const pick = () => rand() < SHOP_TYPE_MORE.length / (SHOP_TYPE_FIRST.length + SHOP_TYPE_MORE.length) ? randomArray(SHOP_TYPE_MORE) : drawn;
    return seed ? withSeed(deriveSeed(seed, 'type.more'), pick) : pick();
}

// Wealth: how much stock, how pricey it may be (by base price), and the markup on market price.
const SHOP_WEALTH = {
    poor:    { label: 'Humble',     stock: 0.7, maxBase: 100,      markup: 0.9 },
    modest:  { label: 'Modest',     stock: 1.0, maxBase: 1000,     markup: 1.0 },
    wealthy: { label: 'Prosperous', stock: 1.3, maxBase: Infinity, markup: 1.25 }
};

const SHOP_QUIRKS = [
    'A sign reads "You break it, you bought it. You look at it, you think about buying it."',
    'A cat sleeps on the most expensive item and will not be moved.',
    'The shopkeeper insists on a handshake that lasts slightly too long.',
    'Half the stock is labeled in a language nobody else can read.',
    'A bell over the door rings a moment before anyone opens it.',
    'The prices are written in chalk and smudge whenever someone haggles.',
    'A parrot behind the counter repeats every price, a little higher.',
    'There is a dusty "Employee of the Month" portrait. It is the shopkeeper, every month, for 40 years.',
    'The back room is off limits. Something in it occasionally knocks.',
    'Every purchase comes wrapped in yesterday\'s Beholder\'s Gazette.',
    'A rival shop across the street has the same name, spelled slightly wrong.',
    'The floorboards creak in a way that sounds a lot like a warning.',
    'The shopkeeper is clearly in the middle of a feud with the city watch.',
    'Loyalty punch cards: ten purchases earns a free torch.',
    'A sign reads "Adventurers welcome. Adventuring inside the shop is not."',
    'The shop smells strongly of something the shopkeeper calls "lavender."',
    'One shelf is roped off with a note: "Reserved for the Baron. Do not ask."',
    'The shopkeeper\'s child runs the till and drives a harder bargain.',
    'There is a "lost and found" bin full of single boots.',
    'The mirror by the door shows customers about a second late.',
    'Every item has a handwritten tag with its life story. Some tags are longer than the item.',
    'The shopkeeper hums constantly and stops only to state a price.',
    'A tiny brass bell on the counter summons an even tinier assistant.',
    'The display window has held the same dusty helmet for years. It is not for sale.',
    'A ledger by the door lists customers banned for life. The list is long and oddly specific.',
    'Free tea for anyone who listens to the shopkeeper\'s war story. It is a long war.',
    'The shop is far bigger on the inside than the outside, and the shopkeeper won\'t discuss it.',
    'Coins paid are tested with a bite, then a sniff, then a long stare.',
    'A notice reads "Closed for lunch" no matter the hour. The door is open anyway.',
    'The shopkeeper names every item they sell and says a quiet goodbye at the counter.'
];

// The shop-type <select> on the shop page and the Session Kit, grouped the way the Names tab groups them.
function fillShopTypePicker(sel) {
    NAME_TABLES.groups.forEach(group => {
        const og = document.createElement('optgroup');
        og.label = group;
        Object.entries(NAME_TABLES.types).forEach(([k, n]) => {
            if (n.group === group && SHOP_TYPES[k]) og.appendChild(new Option(`${SHOP_TYPES[k].icon} ${SHOP_TYPES[k].label}`, k));
        });
        if (og.children.length) sel.appendChild(og);
    });
}

// Quantity on hand: cheap things come in piles, expensive things one at a time.
// The bands are in 5e gold; another system's price is read back into it (ruleCoins).
function shopQty(item) {
    const gp = item.basePrice / ruleCoins(1);
    if (item.category === 'magic-items' || item.category === 'mounts' || gp >= 200) return 1;
    if (gp < 1) return randomInt(5, 30);
    if (gp < 10) return randomInt(2, 10);
    if (gp < 100) return randomInt(1, 5);
    return randomInt(1, 2);
}

// Whether a shop of this wealth stocks the item: by base price, or, where the wealth sets a level
// (Pathfinder, shop-pf2e.js), by the item's tier (market-pf2e.js), common items only.
function shopAffords(item, w) {
    return w.maxLevel != null ? (item.tier || 0) <= w.maxLevel && item.rarity !== 'uncommon' : item.basePrice <= w.maxBase;
}

function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// opts: { type, wealth }, each a key or 'random'; seed: the seed this roll runs under (for shopMoreType)
function rollShop(opts = {}) {
    const type = !opts.type || opts.type === 'random' ? shopMoreType(opts.seed, randomArray(SHOP_TYPE_FIRST)) : opts.type;
    const wealth = !opts.wealth || opts.wealth === 'random' ? randomArray(Object.keys(SHOP_WEALTH)) : opts.wealth;
    const def = SHOP_TYPES[type], w = SHOP_WEALTH[wealth];
    // The keeper, the sign, and the greeting. 5e draws them after the stock (older links replay that way);
    // another system draws them first, so a page without its item list (a Pathfinder town listing the
    // shop) names the same shop and keeper as the shop page.
    const front = () => {
        const keeper = rollNPC({ professionType: 'merchant' });
        keeper.profession = randomArray(def.keepers);
        return { name: rollShopName(type, keeper.firstName || keeper.name), keeper, greeting: randomArray(def.greetings), quirk: randomArray(SHOP_QUIRKS) };
    };
    const early = ruleSystemId() === '5e' ? null : front();

    const byId = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    // def.match (another system's extra stock rule) and MARKET_ALIAS are empty in 5e.
    const exclude = def.exclude.map(marketId);
    const pool = [...new Set([
        ...MARKET_ITEMS.filter(i => def.categories.includes(i.category) || (def.match && def.match(i))).map(i => i.id),
        ...def.ids.map(marketId)
    ])].filter(id => byId[id] && !exclude.includes(id));

    // Stock what the shop can afford; a humble shop with too little falls back to its cheapest goods.
    const want = Math.max(4, Math.round(randomInt(def.count[0], def.count[1]) * w.stock));
    let affordable = pool.filter(id => shopAffords(byId[id], w));
    if (affordable.length < Math.min(want, 4)) {
        affordable = pool.slice().sort((a, b) => byId[a].basePrice - byId[b].basePrice).slice(0, Math.min(want, pool.length));
    }
    let picks = shuffled(affordable).slice(0, want);
    if (def.wildcards) {
        const extras = shuffled(MARKET_ITEMS.filter(i => !picks.includes(i.id) && shopAffords(i, w))).slice(0, def.wildcards);
        picks = picks.concat(extras.map(i => i.id));
    }

    const stock = picks
        .map(id => ({ id, qty: shopQty(byId[id]) }))
        .sort((a, b) => MARKET_ITEMS.indexOf(byId[a.id]) - MARKET_ITEMS.indexOf(byId[b.id]));

    const { name, keeper, greeting, quirk } = early || front();

    // dressShop (below) draws last, so the keeper and stock above replay the same for older links.
    return dressShop({ type, wealth, name, keeper, greeting, quirk, stock, haggle: null }, pool.filter(id => shopAffords(byId[id], w)), byId);
}

// Live prices for a shop's stock at time t (default now), with wealth markup, today's sale, and any haggle result.
// listPrice is the price before the sale and haggle (the same as price when there's neither).
function shopPrices(shop, t = Date.now()) {
    const byId = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    const markup = SHOP_WEALTH[shop.wealth].markup;
    const mod = markup * (shop.haggle ? shop.haggle.priceMod : 1);
    const coins = gp => Math.max(0.01, Math.round(gp * 100) / 100);
    return shop.stock.filter(s => byId[s.id]).map(s => {
        const item = byId[s.id];
        const now = marketPrice(item, t), dayAgo = marketPrice(item, t - MARKET_DAY_MS);
        const sale = !!(shop.sale && shop.sale.id === s.id);
        return {
            ...s, name: item.name, category: item.category, sale,
            price: coins(now * mod * (sale ? 1 - SHOP_SALE_OFF : 1)), listPrice: coins(now * markup),
            change: Math.round((now - dayAgo) / dayAgo * 1000) / 10
        };
    });
}

const abilityMod = score => Math.floor((score - 10) / 2);

// One haggle per shop: d20 + bonus against 10 + the keeper's Wisdom modifier (+2 if prosperous).
// Pathfinder's is a Diplomacy check with degrees of success (shop-pf2e.js).
function rollHaggle(shop, bonus = 0) {
    if (typeof rollHagglePf2e === 'function' && ruleSystemId() === 'pf2e') return rollHagglePf2e(shop, bonus);
    const d20 = randomInt(1, 20);
    const total = d20 + bonus;
    const dc = 10 + abilityMod(shop.keeper.stats.wis) + (shop.wealth === 'wealthy' ? 2 : 0);
    let priceMod, outcome;
    if (d20 === 20)                        { priceMod = 0.75; outcome = 'Natural 20! The shopkeeper sells at cost and mutters about their family.'; }
    else if (d20 === 1 || total <= dc - 5) { priceMod = 1.1;  outcome = 'Insulted. Prices go up 10% "for the inconvenience."'; }
    else if (total >= dc + 5)              { priceMod = 0.8;  outcome = 'A great deal: 20% off everything.'; }
    else if (total >= dc)                  { priceMod = 0.9;  outcome = 'A fair deal: 10% off everything.'; }
    else                                   { priceMod = 1;    outcome = 'The shopkeeper doesn\'t budge. Prices stay put.'; }
    return { d20, bonus, total, dc, priceMod, outcome };
}

// Milliseconds until the market's next 15-minute price bell.
function msToNextPriceBell(t = Date.now()) {
    return marketSlotStart(t) + MARKET_SLOT_MS - t;
}

function haggleDiceText(h) {
    return `d20 ${h.d20} ${h.bonus < 0 ? '−' : '+'} ${Math.abs(h.bonus)} = ${h.total} vs DC ${h.dc}`;
}

// A haggle moved this price enough to show in coins (F30).
function wasPrice(p) {
    return formatCoins(p.listPrice) !== formatCoins(p.price);
}

// The keeper's hair as running text; keepers rolled before hairLook build it the old way.
function shopKeeperHair(k) {
    return k.hairLook || (k.hairLabel === 'Scales' || k.hair === 'Bald' ? k.hair : `${k.hair} hair`);
}

// Plain-text shop for Copy Shop / Copy Kit. limit caps the stock lines (the kit shows fewer).
function shopTextLines(shop, limit = Infinity) {
    const def = SHOP_TYPES[shop.type], k = shop.keeper;
    const prices = shopPrices(shop);
    const lines = [
        `${shop.name}`,
        `${def.label} · ${SHOP_WEALTH[shop.wealth].label}`,
        `Keeper: ${k.name}, ${cap1(ruleWord('race', k.race))} ${k.profession}, ${k.age}. ${k.trait}. Flaw: ${k.flaw}. WIS ${k.stats.wis}, CHA ${k.stats.cha}.`,
        `Looks: ${[k.build, shopKeeperHair(k), `${k.eyes} eyes`, k.feature].join(' · ')}`,
        `Voice: ${k.voice}`,
        `Secret: ${k.secret}`,
        `"${shop.greeting}"`,
        `Quirk: ${shop.quirk}`,
        ...shopDetailLines(shop).map(([label, text]) => `${label}: ${text}`)
    ];
    if (shop.haggle) lines.push(`Haggled: ${shop.haggle.outcome} (${haggleDiceText(shop.haggle)})`);
    lines.push('Stock:');
    prices.slice(0, limit).forEach(p => lines.push(`- ${p.name}${p.qty > 1 ? ` ×${p.qty}` : ''}: ${formatCoins(p.price)}${wasPrice(p) ? ` (was ${formatCoins(p.listPrice)})` : ''}${p.sale ? ' [sale]' : ''}`));
    if (prices.length > limit) lines.push(`- …and ${prices.length - limit} more`);
    return lines;
}

/* ============================================
   SHOP DETAILS: the place, its services, what the keeper buys,
   a job, today's sale, and what's sold out. Drawn after the stock
   (dressShop), so older links keep the same keeper and stock.
   ============================================ */

// Per type. inside: what you notice. services: [what, gp, per]. buying: [what, gp each, unit, most].
// jobs: something the keeper would pay to have done ({name} = a first name).
const SHOP_DETAILS = {
    general: {
        inside: ['Shelves run floor to ceiling, and a ladder on rails reaches the top ones.', 'Barrels of nails, beans, and lamp oil crowd the aisle.', 'A notice board by the door is three layers deep in posters.'],
        services: [['Hold a parcel for collection', 0.1, 'week'], ['Send a letter with the next carter', 0.2], ['Order something special from the city', 1, 'plus the price']],
        buying: [['honey', 0.5, 'jar', 6], ['tallow candles', 0.01, 'candle', 50], ['interesting rocks', 0.1, 'rock', 3]],
        jobs: ['A wagon of stock is two weeks late from the city. The keeper wants someone to ride out and find it.', 'Someone has been paying in coins that turn to leaves by morning.', 'The keeper wants a crate delivered to a farm past the old bridge. Nobody else will go.']
    },
    blacksmith: {
        inside: ['The forge roars at the back, and the whole shop is warm as summer.', 'Horseshoes hang from every rafter.', 'A half-finished sword cools in a trough of oily water.'],
        services: [['Sharpen a blade', 0.1], ['Hammer out a dented helm', 1], ['Shoe a horse', 0.5], ['Repair a broken weapon', 2], ['Engrave a name on a blade', 5], ['Fit armor to a new owner', 10]],
        buying: [['scrap iron', 0.05, 'lb', 100], ['old weapons, any condition', 0.5, 'weapon', 10], ['good charcoal', 0.5, 'bag', 10], ["a wyvern's tooth", 25, 'tooth', 1]],
        jobs: ['An ore shipment never arrived from the mines. The smith wants to know why.', 'Someone keeps stealing horseshoes from the back. Only the horseshoes.', 'The smith needs an ember from a fire elemental to finish a commission and will pay 100 gp for one.']
    },
    bowyer: {
        inside: ['Bundles of yew staves season along one wall.', 'A straw target at the back is full of arrows from customers "just testing."', 'Goose feathers drift across the floor like snow.'],
        services: [['Restring a bow', 0.2], ['Fletch arrows to order', 1, '20 arrows'], ['Tune a crossbow', 0.5], ['Use of the practice range', 0.05, 'hour']],
        buying: [['goose feathers', 0.01, 'feather', 200], ['yew wood', 1, 'stave', 10], ['griffon feathers', 5, 'feather', 12]],
        jobs: ["The keeper's best yew grove has been claimed by something with antlers and a temper.", 'A champion archer wants arrows fletched with a roc feather and will pay well.', 'Someone has been shooting arrows from this shop at the mayor.']
    },
    alchemist: {
        inside: ['Something bubbles in a copper still, and nobody seems to be watching it.', 'Jars of pickled things line the shelves, and a few of them blink.', 'The ceiling is stained in colors that do not belong on a ceiling.'],
        services: [['Identify a potion by taste', 1], ['Brew a potion to order', 10, 'plus ingredients'], ['Neutralize a poison', 5], ['Dispose of something alarming', 2]],
        buying: [['nightshade', 0.5, 'sprig', 10], ['troll blood', 10, 'vial', 3], ['giant spider venom', 15, 'gland', 2], ["will-o'-wisp essence", 50, 'jar', 1]],
        jobs: ['An apprentice drank an unlabeled potion and is now very small. The cure needs a pixie\'s wing.', 'The alchemist needs moonpetals picked by moonlight from a haunted garden.', 'A rival is selling fake potions under this shop\'s name.']
    },
    arcane: {
        inside: ['Candles burn without melting.', 'The books on the top shelf rearrange themselves when no one is looking.', 'A crystal ball in the window shows the weather three days from now.'],
        services: [['Identify a magic item', 20], ['Copy a spell into your spellbook', 10, 'spell level'], ['Remove a minor curse (no promises)', 50], ['Store a dangerous item in the warded vault', 1, 'day']],
        buying: [['spell scrolls of any kind', 10, 'scroll', 5], ['owlbear feathers', 2, 'feather', 10], ['a beholder eye (intact)', 500, 'eye', 1]],
        jobs: ['A tome escaped from the shop and is loose in the city, biting people.', 'The keeper needs a component from the top of the old wizard\'s tower.', 'A customer bought a "cursed" ring and wants a refund. The keeper wants proof it isn\'t cursed.']
    },
    stable: {
        inside: ['It smells exactly like a stable.', 'A goat wanders free and seems to be in charge.', 'Saddles hang on pegs, each with a name tag.'],
        services: [['Stabling and feed', 0.5, 'day'], ['Groom and reshoe a mount', 1], ['Rent a riding horse', 2, 'day'], ['Hire a cart and driver', 3, 'day']],
        buying: [['hay', 0.1, 'bale', 30], ['healthy foals', 15, 'foal', 2], ['a hippogriff egg', 200, 'egg', 1]],
        jobs: ['Horses have been going missing at night and coming back exhausted.', 'A mule called {name} escaped with a merchant\'s strongbox still strapped to it.', 'A noble wants a horse delivered to a castle three days away, unharmed and unspooked.']
    },
    provisioner: {
        inside: ['Sausages and onions hang in strings from the beams.', 'Sacks of grain are stacked shoulder high.', 'A cat patrols the flour bins with great seriousness.'],
        services: [['Pack rations for a journey', 0.1, 'day of food'], ['Deliver an order across town', 0.05], ['Salt and smoke your catch', 0.5]],
        buying: [['fresh game', 0.5, 'animal', 6], ['wild mushrooms (the safe kind)', 0.1, 'basket', 5], ['honeycomb', 0.5, 'comb', 4]],
        jobs: ['Something is getting into the storeroom at night and eating only the cheese.', 'The keeper needs a cartload of salt brought from the coast before the winter.', 'A farm that supplies the shop has stopped sending anything.']
    },
    tinker: {
        inside: ['Clocks tick on every wall, and none of them agree.', 'A tiny brass bird fetches tools for the keeper.', 'Half-built gadgets cover the workbench under a layer of oil.'],
        services: [['Fix a lock or a clock', 1], ['Make a key from a wax mold', 2], ['Build a gadget to order', 15, 'plus parts'], ['Open a lock you lost the key to', 1]],
        buying: [['clockwork parts', 1, 'handful', 10], ['broken gadgets', 0.5, 'gadget', 10], ['a modron gear', 30, 'gear', 1]],
        jobs: ['A clockwork servant walked out last week and has been seen in the sewers.', 'The keeper wants someone to test a new invention. It is probably safe.', 'A wealthy client never paid for a music box, and it is still playing in their house.']
    },
    curio: {
        inside: ['Stuffed animals stare from every shelf, one of them slightly too lifelike.', 'Everything has a price tag, and every price tag has been changed twice.', 'A locked glass case holds a single dusty skull with a ticket reading "Ask."'],
        services: [['Appraise an item', 0.5], ['Lend against a pawned item', 0, 'up to half its value'], ['Find a buyer for something unusual', 5, 'plus a cut']],
        buying: [['anything shiny', 0.5, 'item', 10], ['old maps', 2, 'map', 3], ['monster trophies', 5, 'trophy', 4], ['cursed objects (honestly labeled)', 25, 'object', 1]],
        jobs: ['Someone pawned an amulet here, and now its owner\'s ghost wants it back.', 'The keeper needs a delivery made with no questions asked.', 'A rival collector stole a piece from this shop, and the keeper wants it stolen back.']
    },
    tailor: {
        inside: ['Bolts of cloth lean against the walls in every color.', 'Headless dummies wear half-finished coats.', 'Pins stick out of everything, including the keeper.'],
        services: [['Mend a torn cloak', 0.1], ['Take in or let out a garment', 0.5], ['Make a fine outfit to measure', 15], ['Remove a bloodstain', 0.2], ['Sew a hidden pocket', 1]],
        buying: [['wool', 0.5, 'yard', 20], ['rare dyes', 5, 'jar', 4], ['phase spider silk', 50, 'spool', 2]],
        jobs: ['A noble ordered a wedding gown and then vanished before paying.', 'The keeper needs giant moth silk from a cave in the hills.', 'Someone is selling knock-offs of the keeper\'s designs with the labels sewn on wrong.']
    },
    leatherworker: {
        inside: ['Hides hang drying from hooks along the back wall.', 'A row of finished boots waits on a shelf with paper tags.', 'The smell of tanning is strong enough to make your eyes water.'],
        services: [['Resole a pair of boots', 0.5], ['Repair leather armor', 2], ['Make boots to measure', 3], ['Tool a design into a belt or saddle', 1]],
        buying: [['deer hides', 1, 'hide', 10], ['wolf pelts', 2, 'pelt', 6], ['bulette hide', 50, 'hide', 1]],
        jobs: ['The tannery out of town has stopped answering letters.', 'A customer wants boots from basilisk hide, and the keeper needs a basilisk.', 'Someone keeps leaving a single boot on the doorstep each morning.']
    },
    jeweler: {
        inside: ['Gems glitter under glass, each on its own little velvet cushion.', 'A loupe, tweezers, and a tiny hammer sit in perfect rows on the bench.', 'A heavy iron safe stands behind the counter with its door just ajar.'],
        services: [['Appraise a gem or jewel', 1], ['Resize a ring', 2], ['Set a stone in a ring or pendant', 5], ['Clean and polish a piece', 0.5], ['Engrave a ring', 3]],
        buying: [['uncut gems', 0, 'at half their value', 0], ['gold and silver scrap', 0, 'at its weight', 0], ['pearls', 50, 'pearl', 6]],
        jobs: ['A famous necklace was stolen from the shop and replaced with a perfect fake.', 'The jeweler wants someone to carry a ruby to a buyer in the next city.', 'A customer swears a ring from this shop whispers to them at night.']
    },
    scribe: {
        inside: ['Stacks of paper teeter on every surface.', 'Inkpots of every color line a long writing desk.', 'A ledger of every contract the scribe ever drew up fills a whole shelf.'],
        services: [['Write a letter for you', 0.1, 'page'], ['Copy a book', 1, '10 pages'], ['Draw up a contract', 2], ['Translate a document', 5, 'page'], ['Witness and seal a document', 1]],
        buying: [['old books', 1, 'book', 10], ['maps of far places', 5, 'map', 3], ['letters of famous people', 10, 'letter', 2]],
        jobs: ['A contract drawn up here has an extra clause nobody remembers writing.', 'The scribe needs a rare book retrieved from a flooded library.', 'Someone wants a letter delivered to a person who has been dead for ten years.']
    },
    temple: {
        inside: ['Incense smoke hangs in the air, sweet and heavy.', 'Candles flicker in front of a small shrine by the counter.', 'Votive offerings cover the wall: tiny tin hands, hearts, and feet.'],
        services: [['Bless a weapon (ceremonial)', 1], ['Tend wounds', 0.5], ['Hold a funeral rite', 5], ['Say prayers for the sick', 0.1, 'day'], ['Exorcise a house (results vary)', 25]],
        buying: [['clean linen for bandages', 1, 'yard', 20], ['healing herbs', 0.2, 'bundle', 10], ['relics of saints (real ones)', 100, 'relic', 1]],
        jobs: ['A pilgrim group never reached the shrine in the hills.', 'The temple\'s bells were stolen in the night, all seven of them.', 'Someone in town is selling holy water that is just water.']
    },
    docks: {
        inside: ['Coils of rope and tarred canvas fill the shop with the smell of the sea.', 'A ship\'s figurehead stands in the corner, staring at customers.', 'Nets hang from the ceiling, some with old floats still tangled in them.'],
        services: [['Patch a sail', 1], ['Book passage on the next ship', 0.1, 'mile'], ['Hire a rowboat', 0.5, 'day'], ['Read the tide tables for you', 0.05]],
        buying: [['fresh fish', 0.05, 'fish', 50], ['ambergris', 50, 'lump', 2], ['sea serpent scales', 20, 'scale', 5]],
        jobs: ['A ship called the {name}\'s Luck came into port with no crew.', 'Something under the pier keeps cutting the mooring lines.', 'The keeper needs a crate smuggled past the harbormaster.']
    },
    tavern: {
        inside: ['Barrels stand in a row behind the counter, each chalked with a name and a price.', 'Stairs lead down to a cellar that breathes cold air into the room.', 'A long bench by the fire holds three regulars who have not moved in hours.', 'Tankards hang from hooks over the bar, each with an owner\'s mark.'],
        services: [['A bed for the night', 0.5, 'night'], ['A hot meal', 0.3], ['A hot bath', 0.1], ['Stabling and feed', 0.5, 'night'], ['Fill a waterskin with something better', 0.2]],
        buying: [['honey for the mead', 0.5, 'jar', 6], ['good hops', 0.2, 'sack', 10], ['a barrel of dwarven stout', 25, 'barrel', 1]],
        jobs: ['Something in the cellar drinks a barrel a night and leaves the tap running.', 'A regular called {name} ran up a tab of 40 gp and left town. The keeper wants it collected.', 'The brewer who supplies the house has started watering the ale, and the keeper wants to know why.', 'A guest checked in a week ago, never came down, and still answers through the door.']
    },
    bakery: {
        inside: ['The ovens at the back glow red, and the whole shop smells of hot bread.', 'Loaves cool on racks that reach the ceiling.', 'A dusting of flour lies over everything, the keeper included.', 'A tray of honey cakes sits under a net to keep the flies and the children off.'],
        services: [['Bake your own dough in the oven', 0.01, 'loaf'], ['Bake a celebration cake', 2], ['Pack trail bread for a journey', 0.1, 'day of food'], ['Bake a pie with something hidden inside', 1]],
        buying: [['wheat flour', 0.01, 'lb', 100], ['eggs', 0.01, 'egg', 60], ['wild berries', 0.1, 'basket', 8], ['honey', 0.5, 'jar', 6]],
        jobs: ['The mill upstream has stopped turning, and the flour has stopped coming.', 'Someone left a baby griffon on the doorstep, and it eats a sack of bread a day.', 'The keeper\'s secret recipe was stolen, and a rival is already selling the loaf.', 'Rats have moved into the flour store, and they are very large rats.']
    },
    butcher: {
        inside: ['Sides of meat hang from hooks in the cold back room.', 'Smoke from the smokehouse drifts in through a hatch in the wall.', 'A chopping block in the middle of the shop is worn into a deep hollow.', 'Strings of sausages swing over the counter like bunting.'],
        services: [['Butcher a carcass you bring in', 0.5], ['Smoke and salt your catch for the road', 0.5, 'animal'], ['Skin and dress a hide', 1], ['Deliver an order across town', 0.05]],
        buying: [['fresh game', 0.5, 'animal', 6], ['wild boar', 3, 'boar', 2], ['giant crab', 5, 'crab', 2], ['owlbear meat', 10, 'owlbear', 1]],
        jobs: ['Wolves have been taking the keeper\'s cattle from the pasture outside town.', 'A customer swears the last sausage tasted like a person, and the watch has questions.', 'The keeper wants a hunting party to bring back a giant boar for a lord\'s feast.', 'The smokehouse fire went out on its own three nights running, and the dog will not go near it.']
    },
    brewery: {
        inside: ['Copper vats steam at the back, and the air is thick with the smell of mash.', 'Casks are racked three high, each chalked with a date.', 'A tasting table holds a row of little cups, all of them empty.', 'A cellar door stands open, and someone down there is singing.'],
        services: [['A tasting flight', 0.1], ['Brew a batch to order', 5, 'barrel'], ['Store your barrels in the cellar', 0.1, 'barrel a week'], ['Bottle a special vintage with your name on it', 2]],
        buying: [['barley', 0.5, 'bushel', 20], ['grapes', 0.1, 'basket', 20], ['wild honey', 0.5, 'jar', 10], ['fire beetle glands for the still', 2, 'gland', 6]],
        jobs: ['The best barrel in the cellar has been tapped and refilled with water, twice.', 'A pixie has moved into the vineyard and is drinking the grapes before they are picked.', 'A noble ordered a hundred bottles for a wedding and wants them delivered past bandit country.', 'Something in the old cellar has started brewing on its own.']
    },
    carpenter: {
        inside: ['Sawdust drifts in the sunlight, and the floor is soft with shavings.', 'Half-built barrels stand in a row, hoops waiting beside them.', 'A cart with three wheels waits by the door for its fourth.', 'Planks of oak and pine lean against every wall, sorted by some system only the keeper knows.'],
        services: [['Mend a cart wheel', 1], ['Build a chest or crate to order', 2], ['Make a coffin', 5], ['Repair a door or shutters', 0.5], ['Fit a hidden compartment', 3]],
        buying: [['seasoned oak', 1, 'plank', 20], ['old barrels', 0.5, 'barrel', 10], ['treant wood (offered freely)', 50, 'branch', 1]],
        jobs: ['The timber yard outside town has gone quiet, and the last cart came back empty.', 'A noble ordered a cabinet with a secret drawer, and now the noble is missing.', 'Someone bought six coffins this week and paid in very old coins.', 'The keeper needs wood from a grove the druids say not to cut.']
    },
    mason: {
        inside: ['Blocks of stone stand in the yard, each marked with chalk.', 'Grey dust covers everything, and the air tastes of it.', 'A half-carved gargoyle squats by the door, scowling.', 'Plans for a tower are pinned to the wall, with one floor crossed out in red.'],
        services: [['Repair a wall or chimney', 2], ['Carve a gravestone', 5], ['Build a cellar or vault', 50, 'plus stone'], ['Set a trapped flagstone (no questions)', 25], ['Inspect a building for cracks', 0.5]],
        buying: [['good stone', 0.1, 'block', 50], ['marble', 2, 'block', 10], ['earth elemental grit', 25, 'pouch', 2]],
        jobs: ['The quarry crew struck an old door in the rock and refuses to open it.', 'A wall the keeper built last spring keeps falling down at night, and only at night.', 'The keeper needs someone to guard a stone shipment through goblin country.', 'A statue in the square moved between Monday and Tuesday, and the keeper carved it.']
    },
    cartographer: {
        inside: ['Maps cover every wall, layered over one another like scales.', 'A great globe stands in the corner with a dent where somebody kicked it.', 'Rolled charts fill a rack of pigeonholes to the ceiling.', 'A table holds a half-finished map with one region left blank and a skull drawn in the middle.'],
        services: [['A map of the local roads', 2], ['Hire a guide', 2, 'day'], ['Copy a map', 1], ['Plan a route and mark the dangers', 5], ['Find your way back to somewhere you lost', 10]],
        buying: [['maps of far places', 5, 'map', 3], ['ship\'s logs', 2, 'log', 4], ['a map of the Underdark', 100, 'map', 1]],
        jobs: ['A surveyor sent to chart the hills came back with a map of a valley that is not there.', 'The keeper wants the coast road charted, and nobody who went has come back.', 'A treasure map sold here last month led a party to their deaths, and their kin want answers.', 'Someone breaks in every night and changes one road on the master map.']
    },
    moneychanger: {
        inside: ['Brass scales sit on the counter, with a row of weights beside them.', 'A clerk behind iron bars counts coins without looking at them.', 'Ledgers line a locked shelf, each with a name on the spine.', 'A heavy vault door at the back stands shut, with three different locks.'],
        services: [['Change coin of the realm', 0, 'a tenth of the sum'], ['Store valuables in the vault', 1, 'month'], ['Write a letter of credit', 1, 'plus a hundredth of the sum'], ['Lend at interest', 0, 'a tenth a month'], ['Weigh and test a coin', 0.01]],
        buying: [['foreign coins', 0, 'at their weight less a tenth', 0], ['gemstones', 0, 'at half their value', 0], ['ancient coins of a dead empire', 5, 'coin', 20]],
        jobs: ['A borrower skipped town with 300 gp, and the keeper wants it back, with interest.', 'Someone has been passing coins that weigh true and turn to lead by morning.', 'The keeper needs a strongbox carried to a branch in the next city, quietly.', 'A vault box rented forty years ago has started knocking from the inside.']
    },
    herbalist: {
        inside: ['Bundles of drying herbs hang from every beam.', 'A mortar and pestle sit on the counter, still green from the last batch.', 'Jars of roots and leaves line the shelves, each tagged in a tiny hand.', 'A cot by the stove holds a patient who waves weakly.'],
        services: [['Treat a wound', 0.5], ['Cure a fever', 1], ['Mix a sleeping draught', 0.5], ['Sit with the sick through the night', 0.5, 'night'], ['Ease a hangover (no promises)', 0.1]],
        buying: [['healing herbs', 0.2, 'bundle', 10], ['mandrake root', 5, 'root', 3], ['wolfsbane', 1, 'sprig', 6], ['dryad\'s moss', 20, 'pouch', 1]],
        jobs: ['A sickness is spreading through the lower town, and the cure grows only on a hill full of goblins.', 'Someone has been picking the keeper\'s herb garden bare at night and leaving gold behind.', 'The keeper needs moonflowers picked at midnight from the old graveyard.', 'A patient left a sealed letter and died. The keeper wants it delivered.']
    },
    barber: {
        inside: ['A striped pole turns slowly by the door.', 'Steam rolls out of the bathhouse at the back.', 'A jar of leeches on the counter is labeled "Fresh."', 'A row of chairs faces a long mirror, and every one of them is taken.'],
        services: [['A shave', 0.02], ['A haircut', 0.05], ['A hot bath', 0.1], ['Pull a tooth', 0.2], ['Set a broken bone', 1], ['Bleed a fever with leeches', 0.5]],
        buying: [['clean linen', 1, 'yard', 10], ['leeches', 0.01, 'leech', 50], ['good soap', 0.1, 'cake', 20]],
        jobs: ['A customer came in for a shave and left without a reflection.', 'Someone keeps stealing the pulled teeth from the jar, and only the teeth.', 'The bathhouse water has started coming up warm on its own and smells of sulfur.', 'The keeper patched up a wounded stranger last night who paid with a stolen signet ring.']
    },
    gambling: {
        inside: ['Smoke hangs over the tables, and every lamp is turned low.', 'A wheel of fortune stands by the far wall, its pointer chained in place.', 'A bouncer the size of a door watches every hand.', 'Dice rattle at a dozen tables, and somebody is always cheering.'],
        services: [['A seat at the high table', 5], ['A seat at the low table', 0.1], ['A private room for your own game', 2, 'night'], ['A loan at the table', 0, 'a fifth on top, by morning'], ['Check a set of dice for weights', 0.5]],
        buying: [['lucky charms', 1, 'charm', 10], ['IOUs from other dens', 0, 'at a third of their worth', 0], ['a marked deck that works', 20, 'deck', 1]],
        jobs: ['A player has won every night for a week, and the house wants to know how.', 'Someone lost a deed to a manor at the table, and the manor turns out to be haunted.', 'The house needs a big winner walked safely home through a bad part of town.', 'A rival den is stealing customers with a game nobody can lose. Somebody always does.']
    },
    theater: {
        inside: ['Painted scenery leans against the walls: a castle, a forest, a dragon\'s head.', 'Racks of costumes fill the back room in a riot of color.', 'Somebody on the stage is rehearsing the same line over and over.', 'A box office window has a sign that reads "Sold Out" no matter the night.'],
        services: [['A ticket in the pit', 0.05], ['A ticket in a box', 1], ['Hire a troupe for a private show', 25], ['A song written about your deeds', 5], ['Lessons in stage fighting', 0.5, 'lesson']],
        buying: [['fine old clothes', 1, 'outfit', 6], ['new plays', 10, 'play', 2], ['true tales of daring', 2, 'tale', 3]],
        jobs: ['The leading actor has been threatened by a letter written in a dead playwright\'s hand.', 'Someone keeps changing the ending of tonight\'s play, and the audience loves it.', 'A prop sword from the costume racks turned out to be a real magic blade, and its owner wants it back.', 'The troupe needs guards for a tour through three towns that hate theater.']
    },
    tattoo: {
        inside: ['Drawings of dragons, roses, and anchors paper every wall.', 'A single chair under a bright lamp waits at the back.', 'Needles soak in a jar of something that smells like strong spirits.', 'A book of designs lies open on the counter, some pages glued shut.'],
        services: [['A small tattoo', 1], ['A large tattoo', 5], ['Cover up an old one', 3], ['A mark that glows faintly in the dark', 25], ['Ink a map onto your back', 10]],
        buying: [['squid ink', 1, 'jar', 6], ['rare pigments', 5, 'pot', 4], ['a design from a far land', 2, 'drawing', 5]],
        jobs: ['Everyone who got the keeper\'s new wolf design has started howling at the moon.', 'A customer wants the map on a dead pirate\'s back copied before the body is buried.', 'Someone has been tattooing a strange rune on sleeping drunks all over town.', 'The keeper inked a cult\'s mark by mistake, and now the cult wants to recruit the customer.']
    },
    guild: {
        inside: ['A job board by the door is covered in notices, some with bounties pinned in coin.', 'Shields of old members hang along the walls, a few cracked down the middle.', 'A long table holds a ledger where every hire is signed for.', 'Mercenaries play cards in the corner and size up anyone who walks in.'],
        services: [['Hire a guard', 2, 'day'], ['Hire a sellsword for a job', 5, 'day'], ['Post a job on the board', 1], ['Guild membership', 10, 'year'], ['Train with the guild sergeant', 1, 'day']],
        buying: [['monster bounties (proof required)', 0, 'by the board\'s posted price', 0], ['captured weapons', 1, 'weapon', 10], ['a bandit chief\'s head', 50, 'head', 1]],
        jobs: ['A whole company of the guild\'s mercenaries switched sides in the middle of a contract.', 'The guildmaster needs someone to collect dues from a member who has gone bandit.', 'A contract on the board pays well, and nobody who took it has come back.', 'Someone is forging guild seals and hiring out fake mercenaries.']
    },
    monster: {
        inside: ['A stuffed owlbear stands rearing by the door, wearing a hat.', 'Jars of eyes, teeth, and stranger things fill the shelves, all labeled in red.', 'A wyvern\'s tail hangs over the counter with its stinger capped in a cork.', 'The back room smells like a dragon\'s lair, because some of it was one.'],
        services: [['Identify what a part came from', 1], ['Skin and preserve a trophy', 5], ['Mount a head for your wall', 10], ['Harvest a carcass you bring in', 2, 'plus a cut'], ['Tell you what a beast is weak to', 2]],
        buying: [['owlbear feathers', 2, 'feather', 10], ['troll teeth', 5, 'tooth', 6], ['basilisk eyes', 50, 'eye', 2], ['a mimic tongue', 25, 'tongue', 1], ['a dragon\'s heart', 500, 'heart', 1]],
        jobs: ['A buyer wants a live displacer beast kitten and will pay 500 gp.', 'The keeper sold a "dead" troll arm last week, and it has since walked off.', 'Someone is poaching the keeper\'s hunting grounds and selling cheaper.', 'A crate of basilisk eyes went missing, and three customers have since turned to stone.']
    }
};

const SHOP_GENERIC_JOBS = ['The keeper owes money to the wrong people and needs a bodyguard for a week.', 'A shipment is being held at the city gate over an unpaid tax.', 'The keeper\'s apprentice ran off to become an adventurer. Someone should bring them home.'];

// The building, by wealth.
const SHOP_BUILDINGS = {
    poor: ['a lean-to against the town wall', 'a cellar shop down five worn steps', 'a cart that has not moved in years', 'one room of a sagging house', 'a stall under a patched awning'],
    modest: ['a narrow timber shopfront', 'a stone ground floor under the family\'s rooms', 'a corner shop with a crooked sign', 'a shop on a busy market square', 'a whitewashed shop with flower boxes'],
    wealthy: ['a three-story shopfront with glass windows', 'a marble-fronted hall on the best street', 'a converted guildhall with carved doors', 'a shop with a doorman and a bell that plays a tune', 'a showroom lit by everburning lamps']
};
const SHOP_OPEN = ['dawn to dusk', 'from the first bell to the last', 'whenever the shutters are up', 'noon until late', 'mornings, then again after supper', 'day and night (someone is always asleep behind the counter)'];
const SHOP_CLOSED = ['closed on holy days', 'closed on market day', 'closed whenever it rains', 'never closed', 'closed when the keeper goes fishing', 'closed every seventh day'];
const SHOP_SECURITY = {
    poor: ['a big dog with a small bark', 'a bell on the door and a stout stick behind the counter', 'nothing, and everyone knows it', 'a neighbor who sees everything'],
    modest: ['a strong lock and a nosy neighbor', 'an old crossbow under the counter, loaded', 'a guard dog trained to sit on thieves', 'a watch post at the end of the street', 'a hidden alarm bell rope'],
    wealthy: ['two hired guards in the doorway', 'an alarm glyph on the door', 'iron shutters and a vault in the cellar', 'a retired adventurer who "helps out"', 'a homunculus that watches the till']
};
const SHOP_HELPERS = ['apprentice', 'nephew', 'niece', 'hired hand', 'grandparent who "helps"', 'sullen teenager', 'retired adventurer', 'business partner'];
const SHOP_HELPER_NOTES = ['knows more than the keeper does', 'is learning to haggle and enjoys it too much', 'is asleep in the corner', 'pockets small change, badly', 'wants to run off and adventure', 'gives advice nobody asked for', 'is the real brains of the place', 'is in love with a customer'];
const SHOP_SALE_WHY = ['overstocked', 'the last of an old batch', 'the keeper is sick of looking at it', 'slightly damaged', 'a customer never came back for it', 'a festival discount'];
const SHOP_SOLDOUT_WHY = ['an adventuring party bought every last one this morning', 'the shipment is late', 'the keeper refuses to stock it after "the incident"', 'the rats got to it', 'a noble bought the lot for a party', 'it is on order, back next week, probably'];
const SHOP_SALE_OFF = 0.2;

// ── Second pass (R4). Drawn after everything else in dressShop (shopSecondPass), by each
// list's share of the whole, so an older link keeps its keeper, stock, and extras but these.
const SHOP_BUILDINGS_MORE = {
    poor: ['a converted stable that still smells of horse', 'a shack on stilts above the mud', 'the back of a tannery, upwind on good days',
        'a tent pitched inside a burned-out house', 'a stump of an old tower with a door cut into it'],
    modest: ['a half-timbered shop with bull\'s-eye windows', 'a shop built into the old city gate', 'a brick shop with a bow window',
        'a former chapel with the pews sold off', 'a shop on the bridge itself, over the river'],
    wealthy: ['a domed arcade with a fountain inside', 'a townhouse with its ground floor turned into a showroom', 'a shop around a garden courtyard full of caged songbirds',
        'a hall of polished oak and brass rails', 'a shopfront whose stained-glass windows show the keeper\'s own face']
};
const SHOP_SECURITY_MORE = {
    poor: ['a goose that hates strangers', 'the keeper, who sleeps on the counter', 'a rusty bear trap by the back door', 'a sign reading "Nothing worth stealing"'],
    modest: ['a parrot that shouts "Thief!" at everyone', 'a cellar door that bolts from the inside', 'a cousin in the watch', 'bars on every window', 'a mastiff named Biscuit'],
    wealthy: ['an arcane lock on the strongroom', 'a guard who used to fight in the arena', 'a mirror by the door that shows anyone invisible',
        'an understanding with the thieves\' guild', 'a stone guardian by the door that the keeper calls "just a statue"']
};
const SHOP_HELPERS_MORE = ['foundling', 'cousin from the country', 'reformed thief', 'eldest child', 'lodger who pays in work', 'bookkeeper'];
const SHOP_HELPER_NOTES_MORE = ['keeps a second set of books', 'talks to the stock', 'sells the good stuff out the back door', 'remembers every customer\'s name and every debt',
    'is saving up to buy the shop', 'breaks something every day', 'is far too honest for this trade', 'is spying for a rival shop'];
const SHOP_SALE_WHY_MORE = ['the keeper bought too many at auction', 'it is the wrong color, apparently', 'a rival opened across the street',
    'the keeper owes money by the new moon', 'it was in a flood, but it dried out fine', 'the end of the season', 'the keeper lost a bet', 'it fell off a wagon, officially'];
const SHOP_SOLDOUT_WHY_MORE = ['the supplier was eaten by something on the road', 'the guild has banned it until further notice', 'the last one is holding up a table leg',
    'a wizard bought them all and won\'t say why', 'the keeper is keeping the last one for luck', 'the caravan was robbed, and the bandits are selling it cheaper',
    'the price is climbing so fast the keeper is waiting to see how high it goes', 'the cat sleeps on the last one and won\'t move'];

// One of the newer lines in place of cur, by its share of the whole list (always two draws).
function shopSwap(cur, old, more) {
    const newer = randomArray(more);
    return rand() < more.length / (old.length + more.length) ? newer : cur;
}

function shopSecondPass(shop) {
    const w = shop.wealth;
    shop.building = shopSwap(shop.building, SHOP_BUILDINGS[w], SHOP_BUILDINGS_MORE[w]);
    shop.security = shopSwap(shop.security, SHOP_SECURITY[w], SHOP_SECURITY_MORE[w]);
    const role = shopSwap(shop.helper && shop.helper.role, SHOP_HELPERS, SHOP_HELPERS_MORE);
    const note = shopSwap(shop.helper && shop.helper.note, SHOP_HELPER_NOTES, SHOP_HELPER_NOTES_MORE);
    if (shop.helper) Object.assign(shop.helper, { role, note });
    const sale = shopSwap(shop.sale && shop.sale.why, SHOP_SALE_WHY, SHOP_SALE_WHY_MORE);
    if (shop.sale) shop.sale.why = sale;
    const soldOut = shopSwap(shop.soldOut && shop.soldOut.why, SHOP_SOLDOUT_WHY, SHOP_SOLDOUT_WHY_MORE);
    if (shop.soldOut) shop.soldOut.why = soldOut;
}

// Adds the place, people, services, buying, job, sale, and sold-out item to a rolled shop.
function dressShop(shop, pool, byId) {
    const d = SHOP_DETAILS[shop.type], w = shop.wealth;
    shop.building = randomArray(SHOP_BUILDINGS[w]);
    shop.inside = randomArray(d.inside);
    shop.hours = `Open ${randomArray(SHOP_OPEN)}; ${randomArray(SHOP_CLOSED)}.`;
    shop.security = randomArray(SHOP_SECURITY[w]);
    if (rand() < 0.5) {
        const h = rollNPC({});
        shop.helper = { name: h.firstName || h.name, race: h.race, role: randomArray(SHOP_HELPERS), note: randomArray(SHOP_HELPER_NOTES) };
    }
    shop.services = shuffled(d.services).slice(0, randomInt(2, 3));
    shop.buying = randomArray(d.buying);
    shop.job = fillShop(rand() < 0.8 ? randomArray(d.jobs) : randomArray(SHOP_GENERIC_JOBS));
    // Sale on one stocked item worth enough for 20% to show; sold out of one the shop could carry but doesn't have.
    const onSale = shop.stock.filter(s => byId[s.id].basePrice >= ruleCoins(0.5));
    shop.sale = onSale.length && rand() < 0.6 ? { id: randomArray(onSale).id, why: randomArray(SHOP_SALE_WHY) } : null;
    const missing = pool.filter(id => !shop.stock.some(s => s.id === id));
    shop.soldOut = missing.length && rand() < 0.5 ? { id: randomArray(missing), why: randomArray(SHOP_SOLDOUT_WHY) } : null;
    shopSecondPass(shop);
    return shop;
}

function fillShop(s) {
    return s.replace(/\{name\}/g, () => rollNPC({}).firstName || 'Mira');
}

// Service and buying prices follow the shop's wealth (services) or are paid flat (buying).
// Both are written in 5e gold (ruleCoins turns them into another system's coin).
function shopServiceText([what, gp, per], wealth) {
    if (!gp) return `${what}: ${per}`;
    const raw = ruleCoins(gp) * SHOP_WEALTH[wealth].markup;
    // Rounded to the silver piece (copper for the cheapest), the way a keeper quotes a price.
    const price = formatCoins(raw >= 0.1 ? Math.round(raw * 10) / 10 : Math.max(0.01, Math.round(raw * 100) / 100));
    return `${what}: ${price}${per ? (/^plus/.test(per) ? `, ${per}` : ` per ${per}`) : ''}`;
}

function shopBuyingText([what, gp, unit, most]) {
    if (!gp) return `${cap1(what)}, ${unit}.`;
    return `${cap1(what)} at ${formatCoins(ruleCoins(gp))} per ${unit}${most > 1 ? `, up to ${most}` : ''}.`;
}

// The place and its extras as [label, text] pairs, for the page, Copy Shop, and the kit. Older saves have none.
function shopDetailLines(shop) {
    if (!shop.building) return [];
    const byId = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    const lines = [['The place', `${cap1(shop.building)}. ${shop.inside}`], ['Hours', shop.hours], ['Security', cap1(shop.security) + '.']];
    if (shop.helper) lines.push(['Helping out', `${shop.helper.name}, ${/^[aeiou]/i.test(ruleWord('race', shop.helper.race)) ? 'an' : 'a'} ${ruleWord('race', shop.helper.race)} ${shop.helper.role}, who ${shop.helper.note}.`]);
    if (shop.services && shop.services.length) lines.push(['Services', shop.services.map(s => shopServiceText(s, shop.wealth)).join(' · ')]);
    if (shop.buying) lines.push(['Buying', shopBuyingText(shop.buying)]);
    if (shop.sale && byId[shop.sale.id]) lines.push(['On sale', `${byId[shop.sale.id].name}, ${Math.round(SHOP_SALE_OFF * 100)}% off (${shop.sale.why}).`]);
    if (shop.soldOut && byId[shop.soldOut.id]) lines.push(['Sold out', `${byId[shop.soldOut.id].name}: ${shop.soldOut.why}.`]);
    if (shop.job) lines.push(['Ask about', shop.job]);
    return lines;
}

const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
