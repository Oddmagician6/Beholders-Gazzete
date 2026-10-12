/* ============================================
   TOWN ENGINE (F37, Worldbuilder)
   A seeded settlement, from a hamlet to a metropolis: its name, where it stands and
   what it's known for, who lives there, when and how it was founded, how it's run and
   by whom, the watch, the temple and its god, the factions in town, its districts,
   how many of each building there are, a few notable people with ties to each other,
   its taverns and shops (seeds for rollTavern and rollShop, so each one opens in the
   Toolbox or on the Shop page), local laws and customs, a current trouble, rumors
   (draws into rumors.json), and a quest hook (a rollQuest seed).
   People are rolled the NPC page's way (facNpc), so their 🎭 links reproduce them.
   The factions are a rollFactions() seed; the temple's god follows a linked pantheon
   the way the Factions tab does (facDeity).
   Every part rolls from deriveSeed(seed, part), so changing one option keeps the rest:
   a new size keeps the name, the temple, the laws, and the first people; a new
   setting keeps the size, the people, and the laws; a new wealth changes only the
   taverns' quality and the shops' stock.
   Needs rng.js, coins.js, npc-data.js, names-data.js, pantheon-engine.js,
   faction-engine.js, tavern-engine.js, market-data.js, shop-engine.js, quest-engine.js
   (with monsters-data.js and encounter-engine.js). The tables are the Gazette's own.
   ============================================ */

// pop: [low, high]; districts, taverns, shops: [low, high] of the ones described;
// people: notable people; factions: a FAC_COUNTS key (or null) and the faction scale.
const TOWN_SIZES = {
    hamlet:     { label: 'Hamlet', icon: '🛖', a: 'a hamlet', pop: [20, 90], districts: [1, 1], taverns: [1, 1], shops: [1, 1], people: 3, factions: null, founded: [40, 300] },
    village:    { label: 'Village', icon: '🏡', a: 'a village', pop: [100, 900], districts: [2, 2], taverns: [1, 2], shops: [2, 3], people: 4, factions: 'few', facScale: 'town', founded: [80, 500] },
    town:       { label: 'Town', icon: '🏘️', a: 'a town', pop: [1000, 6000], districts: [3, 4], taverns: [2, 3], shops: [3, 5], people: 5, factions: 'few', facScale: 'town', founded: [120, 700] },
    city:       { label: 'City', icon: '🏙️', a: 'a city', pop: [8000, 25000], districts: [5, 6], taverns: [3, 4], shops: [5, 6], people: 6, factions: 'full', facScale: 'city', founded: [200, 1200] },
    metropolis: { label: 'Metropolis', icon: '🏰', a: 'a metropolis', pop: [30000, 120000], districts: [7, 8], taverns: [4, 5], shops: [6, 8], people: 7, factions: 'many', facScale: 'city', founded: [400, 2000] }
};
const TOWN_SIZE_KEYS = Object.keys(TOWN_SIZES);

// tails: name endings that fit; domains: the gods a temple here leans to; shops: SHOP_TYPES
// keys this place favors; known: what it's known for; races: folk who settle here more.
const TOWN_SETTINGS = {
    river: {
        label: 'River ford', icon: '🌉', where: 'where the high road fords a wide, slow river',
        tails: ['ford', 'bridge', 'water', 'brook', 'mouth'], domains: ['life', 'nature', 'tempest'], shops: ['docks', 'provisioner'],
        races: ['halfling', 'human'], building: ['Piers and ferry landings', 1.2],
        known: ['its toll bridge, which charges more on the way out than on the way in', 'eels, smoked, pickled, and in a pie nobody outside town will eat',
            'the river festival, when the whole town tries to cross on rafts', 'barges that carry grain downriver all summer', 'a ferryman who has never once lost a passenger, and says so']
    },
    coast: {
        label: 'Harbor', icon: '⚓', where: 'around a harbor in the lee of a rocky headland',
        tails: ['haven', 'mouth', 'port', 'sands', 'cove'], domains: ['tempest', 'trickery', 'life'], shops: ['docks', 'provisioner', 'curio'],
        races: ['human', 'dragonborn', 'tiefling'], building: ['Piers, wharves, and boathouses', 1.6],
        known: ['the fish market, loud from before dawn', 'shipwrights whose hulls are said to never leak', 'smugglers everyone knows about and nobody can catch',
            'a lighthouse older than the town', 'sailors\' tattoo parlors, three to a street', 'the widows\' walk where the whole town watches for the fleet']
    },
    crossroads: {
        label: 'Crossroads', icon: '🛤️', where: 'where two old trade roads cross',
        tails: ['cross', 'stow', 'gate', 'by', 'ton'], domains: ['trickery', 'knowledge', 'light'], shops: ['general', 'stable', 'provisioner'],
        races: ['human', 'halfling', 'gnome'], building: ['Caravan yards and stables', 1.4],
        known: ['its great market, where caravans from four directions meet', 'inns, more of them than anyone needs', 'news: anything that happens anywhere passes through here first',
            'money changers who will take any coin ever struck', 'the hanging tree at the crossing, still in use']
    },
    hills: {
        label: 'Mining hills', icon: '⛏️', where: 'on terraces cut into hills riddled with old mine workings',
        tails: ['hill', 'dale', 'delve', 'shaft', 'crag'], domains: ['knowledge', 'war', 'death'], shops: ['blacksmith', 'jeweler', 'provisioner'],
        races: ['dwarf', 'gnome', 'human'], building: ['Mine heads and smelters', 1.0],
        known: ['silver, and the arguments about who owns it', 'a mine that closed after "the incident" and will not be discussed', 'stonework so fine the walls need no mortar',
            'miners\' choirs, deep and very loud', 'a gem that turned up in a chicken\'s crop, now in the town hall']
    },
    forest: {
        label: 'Forest edge', icon: '🌲', where: 'in a clearing at the edge of a deep and very old forest',
        tails: ['wood', 'hurst', 'hollow', 'shaw', 'den'], domains: ['nature', 'trickery', 'life'], shops: ['bowyer', 'leatherworker', 'provisioner'],
        races: ['elf', 'halfling', 'human'], building: ['Lumber yards and sawpits', 1.0],
        known: ['woodcarvings on every doorframe', 'honey and wax from the forest hives', 'the treeline nobody crosses after dark',
            'hunters who can track a sparrow across stone', 'a druid\'s grove the town leaves offerings at, just in case']
    },
    farmland: {
        label: 'Farmland', icon: '🌾', where: 'among wide fields and orchards on the plain',
        tails: ['field', 'stead', 'thorpe', 'ton', 'ley'], domains: ['life', 'nature', 'light'], shops: ['provisioner', 'general', 'stable'],
        races: ['halfling', 'human', 'gnome'], building: ['Barns and granaries', 2.0],
        known: ['its harvest fair and the prize vegetables', 'cider strong enough to strip paint', 'a scarecrow in every field, each with a name',
            'the best cheese in three counties, by its own account', 'a feud between two farming families older than the town charter']
    },
    pass: {
        label: 'Mountain pass', icon: '🏔️', where: 'in a narrow pass between snowy peaks, the only way through for miles',
        tails: ['gate', 'hold', 'watch', 'wall', 'crag'], domains: ['war', 'tempest', 'light'], shops: ['blacksmith', 'provisioner', 'stable'],
        races: ['dwarf', 'human', 'orc'], building: ['Toll houses and watchtowers', 0.8],
        known: ['the toll gate, and the toll, which rises every winter', 'guides who will take anyone through for a price', 'avalanche bells that ring every few years, too late',
            'goat\'s cheese, goat\'s wool, and goat stew', 'an old fortress on the ridge that nobody garrisons any more']
    },
    marsh: {
        label: 'Marsh', icon: '🐸', where: 'on stilts and causeways above a wide, misty marsh',
        tails: ['mere', 'fen', 'moor', 'marsh', 'water'], domains: ['death', 'nature', 'trickery'], shops: ['alchemist', 'curio', 'provisioner'],
        races: ['human', 'halfling', 'tiefling'], building: ['Causeways and stilt-walks', 1.0],
        known: ['peat smoke you can smell a day away', 'reed baskets and eel traps sold in every town nearby', 'lights over the water at night that nobody follows twice',
            'herbs that only grow in the bog, worth their weight in silver', 'the drowned chapel, whose bell still rings at low tide']
    }
};
const TOWN_SETTING_KEYS = Object.keys(TOWN_SETTINGS);

// tavern: weights over the tavern tiers (squalid → aristocratic); shop: SHOP_WEALTH key weights.
const TOWN_WEALTH = {
    poor:       { label: 'Poor', icon: '🪙', about: 'Hard times: patched roofs, empty stalls, and long memories of better years.', tavern: [3, 5, 3, 1, 0, 0], shop: [['poor', 6], ['modest', 2]] },
    modest:     { label: 'Getting by', icon: '⚖️', about: 'Getting by: nobody starves, nobody gets rich, and everyone complains.', tavern: [1, 3, 5, 3, 1, 0], shop: [['poor', 2], ['modest', 5], ['wealthy', 1]] },
    prosperous: { label: 'Prosperous', icon: '💰', about: 'Good times: fresh paint, full markets, and prices to match.', tavern: [0, 1, 3, 4, 2, 1], shop: [['modest', 3], ['wealthy', 4]] }
};

const TOWN_NAME_HEADS = ['Ash', 'Barrow', 'Black', 'Bram', 'Bright', 'Cinder', 'Cold', 'Copper', 'Crow', 'Dun', 'Elder', 'Fair', 'Fern', 'Fox',
    'Glen', 'Gold', 'Green', 'Grey', 'Hart', 'Hazel', 'High', 'Holly', 'Iron', 'Lark', 'Long', 'Mill', 'Moss', 'North', 'Oak',
    'Pine', 'Raven', 'Red', 'Rook', 'Rush', 'Salt', 'Silver', 'Stag', 'Stone', 'Swan', 'Thorn', 'Wether', 'White', 'Wild',
    'Willow', 'Wolf', 'Wren', 'Amber', 'Bell', 'Briar', 'Candle', 'Dove', 'Hollow', 'Lantern', 'Owl', 'Quill', 'Sorrow', 'Tallow'];
const TOWN_NAME_TAILS = ['bridge', 'brook', 'bury', 'by', 'cross', 'dale', 'den', 'field', 'ford', 'gate', 'haven', 'hill', 'hollow', 'holm',
    'hurst', 'ley', 'mere', 'mouth', 'moor', 'stead', 'stow', 'thorpe', 'ton', 'wall', 'water', 'well', 'wick', 'wood', 'worth'];
const TOWN_NAME_FRONTS = ['Upper', 'Lower', 'Old', 'East', 'West', 'Little', 'Great', 'Saint'];
// Real places that the tables could spell out.
const TOWN_BANNED = ['ashford', 'blackburn', 'blackwood', 'kingston', 'redhill', 'whitby', 'silverton', 'greenwich', 'oakham', 'stoneham',
    'brighton', 'longford', 'ironbridge', 'redbridge', 'stockton', 'whitehill', 'greenfield', 'fairfield', 'northwood', 'oakwood',
    'redwood', 'highgate', 'northgate', 'westgate', 'eastgate', 'saltburn', 'whitchurch', 'swansea', 'blackpool', 'millbrook', 'stonehaven', 'holloway', 'whitehaven', 'longton', 'hartford', 'salton', 'swanton', 'crowley', 'glenwood'];

const TOWN_FOUNDERS = [
    'a dwarf who struck silver and never told anyone where', 'monks fleeing a war that has since been forgotten', 'a band of retired adventurers who wanted somewhere quiet',
    'a ferryman who got tired of rowing back', 'the survivors of a shipwreck', 'a lord\'s third son with nothing to inherit but a charter',
    'a caravan that broke an axle and never left', 'two families who could not stand each other but could not afford to leave',
    'an order of knights, as a fort, long before anyone lived here', 'a hedge wizard who wanted to be left alone (it did not work)',
    'runaway apprentices from a city that still wants them back', 'shepherds who followed a white stag'];
const TOWN_FOUNDED_SINCE = [
    'The founder\'s statue in the square has lost its nose to generations of luck-rubbing.', 'Burned down once and rebuilt in stone, mostly.',
    'Still pays a tithe to a lord nobody has seen in a lifetime.', 'The charter was lost in a flood; the council insists it said what they say it said.',
    'Survived a siege, a plague, and a very bad harvest in the same decade.', 'The oldest families still sit in the front pews and expect to.',
    'Grew fast when the road came through, and has never quite caught up with itself.', 'Has changed its name twice; old folk still use the first one.'];

// Government: sizes it fits, the leader's NPC category, gendered title, and age.
const TOWN_GOVS = [
    { key: 'elder', label: 'A village elder', sizes: ['hamlet', 'village'], cat: 'commoner', title: ['Elder', 'Elder', 'Elder'], age: 'old',
        how: 'Decisions are made on the elder\'s porch, slowly, after everyone has had their say twice.' },
    { key: 'reeve', label: 'A reeve for an absent lord', sizes: ['hamlet', 'village', 'town'], cat: 'commoner', title: ['Reeve', 'Reeve', 'Reeve'],
        how: 'The reeve collects the lord\'s rents and settles disputes, and answers to a lord who never visits.' },
    { key: 'lord', label: 'A hereditary lord', sizes: ['village', 'town', 'city', 'metropolis'], cat: 'noble', title: ['Lord', 'Lady', 'Liege'],
        how: 'The lord\'s word is law, and the lord\'s family has been saying words for generations.' },
    { key: 'mayor', label: 'An elected mayor', sizes: ['village', 'town', 'city'], cat: 'merchant', title: ['Mayor', 'Mayor', 'Mayor'],
        how: 'Elected every few years by the townsfolk who own property, which is fewer of them than you would think.' },
    { key: 'council', label: 'A council of guildmasters', sizes: ['town', 'city', 'metropolis'], cat: 'merchant', title: ['First Guildmaster', 'First Guildmistress', 'First Guildmaster'],
        how: 'The guilds take turns holding the chair, and spend the rest of the time trying to unseat whoever has it.' },
    { key: 'temple', label: 'The temple', sizes: ['village', 'town', 'city'], cat: 'religious', title: ['High Priest', 'High Priestess', 'High Priest'],
        how: 'The temple rules in its god\'s name; the laws are scripture and the fines go in the collection plate.' },
    { key: 'governor', label: 'A military governor', sizes: ['town', 'city', 'metropolis'], cat: 'guard', title: ['Governor', 'Governor', 'Governor'],
        how: 'The crown sent a soldier to keep order after the last trouble, and the soldier never left.' },
    { key: 'prince', label: 'A merchant prince', sizes: ['city', 'metropolis'], cat: 'merchant', title: ['Merchant Prince', 'Merchant Princess', 'Merchant Prince'],
        how: 'The richest house in the city bought the office outright, and runs the place like a counting house.' },
    { key: 'wizard', label: 'A wizard who owns the land', sizes: ['hamlet', 'village', 'town'], cat: 'magic', title: ['Magister', 'Magister', 'Magister'],
        how: 'Everyone here rents from the wizard in the tower, and pays in coin, labor, or the odd unusual favor.' },
    { key: 'puppet', label: 'A mayor with someone behind them', sizes: ['town', 'city', 'metropolis'], cat: 'merchant', title: ['Mayor', 'Mayor', 'Mayor'], hidden: true,
        how: 'The mayor makes the speeches. Everyone with sense knows the orders come from somewhere else.' },
    { key: 'senate', label: 'A senate of old families', sizes: ['city', 'metropolis'], cat: 'noble', title: ['First Senator', 'First Senator', 'First Senator'],
        how: 'A hundred old families vote on everything, and the votes are decided at dinner parties the night before.' }
];

const TOWN_LEADER_STYLES = [
    'Well liked, mostly because they never do anything.', 'Hardworking, honest, and badly out of their depth.', 'Cunning and patient; nothing happens here they did not plan.',
    'Loud, generous, and in debt to everyone.', 'Feared, and fine with that.', 'New to the job and still believes they can fix everything.',
    'Old, tired, and quietly looking for someone to take over.', 'Popular with the poor, hated by the rich, and enjoying both.',
    'Takes a small cut of everything, and everyone knows it.', 'Hides a sharp mind behind a show of being a fool.'];
// For a 'puppet' government: who really pulls the strings ({faction} when the town has factions).
const TOWN_STRINGS = ['{faction}', 'the mayor\'s mother', 'a moneylender nobody has seen', '{faction}', 'a dragon, if the rumors are true'];

// The watch, by size: names, and how many folk per watchman.
const TOWN_WATCH = {
    hamlet: { names: ['Nobody, really: the miller\'s sons and a bell', 'A bell, a pitchfork, and whoever hears it first', 'The headman\'s nephews, when they are sober'], per: 0 },
    village: { names: ['the Village Watch', 'the Reeve\'s Men', 'the Night Bell', 'the Lantern Watch'], per: 120 },
    town: { names: ['the Town Watch', 'the Lantern Men', 'the Greycloaks', 'the Bell Watch', 'the Wardens'], per: 160 },
    city: { names: ['the City Watch', 'the Bluecoats', 'the Wardens of the Gate', 'the Iron Watch', 'the Lamplighters'], per: 200 },
    metropolis: { names: ['the City Guard', 'the Thousand', 'the Crimson Watch', 'the Wardens', 'the Vigil'], per: 250 }
};
const TOWN_WATCH_KINDS = [
    'Honest and underpaid.', 'Lazy but harmless.', 'Corrupt from the captain down.', 'Strict, fair, and humorless.', 'Mostly drunk after sundown.',
    'Old soldiers, well drilled and bored.', 'Young, eager, and quick to arrest the wrong person.', 'Stretched thin and admits it.',
    'In the pocket of {faction}.', 'Brave, few, and badly armed.'];
const TOWN_WATCH_PARTY = [
    'They watch adventurers closely and expect trouble.', 'They are glad of any help and will say so, once.', 'They resent anyone who solves a crime before they do.',
    'They will look the other way for a reasonable bribe.', 'They ask every armed stranger to sign a book at the gate.',
    'They hire adventurers for jobs they would rather not do themselves.'];

// The temple: how it looks, and what it offers the party.
const TOWN_TEMPLE_LOOKS = [
    'A squat stone chapel with a leaning bell tower', 'A grand domed temple far too large for the place', 'A timber hall with carved doors and a turf roof',
    'An old temple half-ruined and half-repaired', 'A bright, new temple paid for by one rich family, and they want you to know it',
    'A cave shrine cut into the hillside, lit by a hundred candles', 'A temple built on the ruins of an older one, to a different god',
    'A small shrine under an ancient tree, tended every morning'];
const TOWN_SHRINE_LOOKS = [
    'A wayside shrine with a little roof and a bench', 'A small shrine under an ancient tree, tended every morning', 'A one-room chapel that doubles as the meeting hall',
    'A standing stone with offerings heaped at its foot'];
const TOWN_TEMPLE_OFFERS = [
    'healing for the faithful at a fair price, and for strangers at a less fair one', 'blessings before a journey, a few coppers a candle',
    'a library of old records the priests will open for a donation', 'sanctuary to anyone who reaches the altar, which the watch hates',
    'holy water by the flask, blessed fresh every dawn', 'a bed and a meal for any pilgrim, no questions asked',
    'burials and last rites, and an ear for confessions it will never repeat'];

// Districts. sizes: the smallest size that has one; settings: where it can appear (any if missing).
const TOWN_DISTRICTS = [
    { key: 'market', min: 'village', names: ['the Market', 'Market Square', 'Coin Street', 'the Cornmarket', 'the Haymarket'],
        look: ['Stalls and awnings jammed shoulder to shoulder, and a crowd from dawn to dusk', 'A wide cobbled square with a market cross and a well', 'A covered market hall with pigeons in the rafters'],
        here: ['a fountain that has not run in years', 'the town crier\'s stone', 'the stocks, usually occupied', 'a notice board of jobs and lost pets'] },
    { key: 'temple', min: 'town', names: ['the Temple Quarter', 'Bell Hill', 'Saints\' Row', 'the Close', 'Candle Street'],
        look: ['Quiet lanes, chanting, and the smell of incense', 'Shrines on every corner and beggars at every shrine', 'Grey stone, tall windows, and pilgrims everywhere'],
        here: ['a graveyard older than the town', 'a hospice for the sick', 'a shrine to a god nobody remembers', 'candle-makers and relic sellers'] },
    { key: 'craft', min: 'village', names: ['Craftsmen\'s Row', 'the Tanneries', 'Anvil Lane', 'the Workshops', 'Hammer Street'],
        look: ['Hammering, sawing, and smoke from every chimney', 'Workshops open to the street, shavings in the gutters', 'A stink from the tanneries that you stop noticing after a day'],
        here: ['the guildhall', 'a forge that never goes out', 'a dye works that turns the gutter blue', 'apprentices racing handcarts'] },
    { key: 'docks', min: 'village', settings: ['river', 'coast', 'marsh'], names: ['the Docks', 'the Waterfront', 'Fishgate', 'the Wharves', 'Tidewater'],
        look: ['Gulls, tar, ropes, and shouting', 'Warehouses leaning over the water on old piles', 'Boats moored three deep and sailors everywhere'],
        here: ['a harbormaster\'s office', 'a fish market loud before dawn', 'a sailors\' chapel', 'the customs house'] },
    { key: 'noble', min: 'town', names: ['Noble Hill', 'the Heights', 'Gilded Row', 'the Crescent', 'Lordsward'],
        look: ['Walled gardens and big houses behind iron gates', 'Wide clean streets with private guards on the corners', 'Old manors with ivy and very tall windows'],
        here: ['the lord\'s keep', 'a private park with a locked gate', 'a fencing school', 'a gallery of portraits nobody likes'] },
    { key: 'slums', min: 'town', names: ['the Warrens', 'Mudside', 'the Rookery', 'Low Town', 'the Sinks'],
        look: ['Crooked houses leaning together over narrow alleys', 'Mud, rats, and children who know everything', 'Shacks built on top of older shacks'],
        here: ['a soup kitchen run by one stubborn priest', 'a fighting pit', 'a fence\'s shop that is open at odd hours', 'a well everyone says is poisoned'] },
    { key: 'old', min: 'town', names: ['Old Town', 'the Old Walls', 'the Stones', 'Founders\' Ward', 'the Keep Ward'],
        look: ['The oldest streets, too narrow for carts', 'Houses built into the old town wall', 'Worn steps, low doors, and very old families'],
        here: ['the founder\'s statue', 'the old town hall', 'a sealed gate in the old wall', 'cellars that connect to each other'] },
    { key: 'garrison', min: 'city', names: ['the Garrison', 'Barracks Yard', 'the Citadel', 'Spear Ward'],
        look: ['Drill yards, armories, and soldiers off duty', 'Grim stone barracks and a parade ground', 'A fortress quarter behind its own wall'],
        here: ['the jail', 'the armory', 'a soldiers\' tavern', 'a gallows'] },
    { key: 'gate', min: 'town', settings: ['crossroads', 'pass', 'farmland', 'forest'], names: ['Gate Ward', 'the Caravanserai', 'Wagon Row', 'Outer Ward'],
        look: ['Stables, wagons, and travelers in every tongue', 'Inns, cheap and loud, one after another', 'A tangle of carts waiting to pay the gate toll'],
        here: ['the toll gate', 'a caravan yard', 'a money changer', 'a mapmaker\'s stall'] },
    { key: 'arcane', min: 'city', names: ['the Spires', 'Inkwell Ward', 'the Academy', 'Starward'],
        look: ['Towers, libraries, and the occasional small explosion', 'Quiet streets of scholars who never look up', 'Strange lights in the windows at all hours'],
        here: ['a school of magic', 'a library with a chained section', 'an observatory', 'a shop that sells components by the ounce'] },
    { key: 'foreign', min: 'city', names: ['the Foreign Quarter', 'Strangers\' Ward', 'the Bazaar', 'Lantern Street'],
        look: ['Signs in a dozen scripts and food from a dozen lands', 'Colorful, crowded, and noisy all night', 'A walled ward where travelers from far away settled long ago'],
        here: ['a temple to a faraway god', 'a spice market', 'a hall where envoys meet', 'a tea house where deals are made'] },
    { key: 'mines', min: 'village', settings: ['hills'], names: ['the Pitheads', 'Slag Row', 'the Diggings', 'Lamp Street'],
        look: ['Spoil heaps, winding gear, and soot on everything', 'Miners\' cottages in neat rows down the slope', 'The smelters\' glow at night'],
        here: ['the assay office', 'the mine owner\'s office', 'a shrine where miners leave lamps', 'the old shaft, boarded up'] },
    { key: 'green', min: 'village', max: 'town', names: ['the Green', 'the Commons', 'Mill End', 'the Lane'],
        look: ['Cottages around a village green with a pond', 'Thatch, gardens, and chickens in the road', 'A mill, a bridge, and a duck pond'],
        here: ['the village well', 'a maypole', 'the mill', 'the old oak where meetings are held'] },
    { key: 'river', min: 'city', settings: ['river', 'marsh'], names: ['the Bridges', 'Islet Ward', 'the Canals'],
        look: ['Houses built on the bridges themselves', 'Canals instead of streets, and boats instead of carts', 'Islands linked by rope bridges and ferries'],
        here: ['a bridge chapel', 'a floating market', 'the boatmen\'s guild', 'a drowned street visible at low water'] }
];

// The whole hamlet as its one district.
const TOWN_HAMLET_DISTRICT = {
    key: 'hamlet', names: ['the hamlet'],
    look: ['A dozen houses around a well and a muddy lane', 'A cluster of cottages, a barn, and a shrine', 'Houses strung along the road, each with a dog that barks at strangers'],
    here: ['the well', 'a wayside shrine', 'a single shop that sells a bit of everything', 'a notice nailed to a tree']
};

// Buildings counted for the whole place: [label, per 1,000 folk, the smallest size that has one].
const TOWN_BUILDINGS = [
    ['Homes', 200, 'hamlet'], ['Taverns and inns', 3, 'hamlet'], ['Shops and stalls', 12, 'hamlet'], ['Workshops', 8, 'village'],
    ['Temples and shrines', 0.8, 'hamlet'], ['Wells and fountains', 4, 'hamlet'], ['Mills', 0.5, 'village'], ['Watch houses', 0.4, 'village'],
    ['Warehouses', 1.5, 'town'], ['Guildhalls', 0.3, 'town'], ['Bathhouses', 0.2, 'town'], ['Schools and libraries', 0.15, 'city']];

// Notable people: [role, NPC category, age bucket or null].
const TOWN_ROLES = [
    ['The richest person in town', 'merchant'], ['The oldest resident', 'commoner', 'ancient'], ['The town gossip', 'commoner'],
    ['A retired adventurer', 'adventurer', 'old'], ['The healer', 'religious'], ['The local spellcaster', 'magic'],
    ['Someone everyone pretends not to know', 'criminal'], ['A disgraced noble', 'noble'], ['Everyone\'s favorite', 'commoner'],
    ['The one who wants the leader\'s job', 'merchant'], ['The newcomer', 'adventurer', 'young'], ['The one who knows where the bodies are buried', 'commoner', 'old'],
    ['The moneylender', 'merchant'], ['The troublemaker', 'commoner', 'young'], ['The tax collector', 'guard'], ['The undertaker', 'religious', 'middle']];
const TOWN_WANTS = [
    'Wants to get out of this town before it swallows them whole.', 'Wants a proper wedding for their child, and cannot afford one.',
    'Wants revenge on whoever burned their barn, and has a guess.', 'Wants to be on the council, and is buying votes slowly.',
    'Wants an old map translated, and does not want to say why.', 'Wants someone to find a sibling who went off adventuring.',
    'Wants to be left alone, and is not getting their wish.', 'Wants a rare herb that grows only somewhere dangerous.',
    'Wants to buy the tavern, and the owner will not sell.', 'Wants to know who has been leaving flowers on their door.',
    'Wants a debt forgiven, or the lender gone.', 'Wants to prove a ghost lives in their cellar.'];
// Ties between two people: {a} and {b} are first names.
const TOWN_TIES = [
    '{a} owes {b} a lot of money.', '{a} and {b} are courting in secret.', '{a} and {b} are siblings who have not spoken in years.',
    '{a} is blackmailing {b}.', '{a} once saved {b}\'s life, and never lets them forget it.', '{a} wants {b}\'s house, and {b} knows it.',
    '{a} and {b} used to be partners, until the money went missing.', '{a} thinks {b} is a spy.', '{a} is teaching {b} to read, quietly.',
    '{a} and {b} play cards every night and cheat each other cheerfully.', '{a} was jilted by {b} at the altar.', '{a} is the only one {b} trusts.'];

const TOWN_LAWS = [
    ['No blade drawn inside the walls.', 25], ['No spellcasting in the market without a license.', 10], ['Every stranger registers with the watch on arrival.', 2],
    ['No livestock on the main street after noon.', 1], ['Curfew at the last bell for anyone without a lantern.', 1], ['No gambling except on holy days.', 5],
    ['Duels only with the lord\'s permission, and only at dawn.', 50], ['Nobody may sell bread except the bakers\' guild.', 5],
    ['All weapons longer than a forearm are peace-bonded at the gate.', 10], ['Anyone who rings the alarm bell without cause pays for the trouble.', 15],
    ['No singing in the street after dark.', 0.5], ['Dead monsters must be reported and taxed.', 5], ['No one may climb the old tower.', 20],
    ['Coins from outside the realm must be changed at the counting house.', 2], ['Masks are forbidden in public, except at festivals.', 3]];
const TOWN_CUSTOMS = [
    'Everyone leaves a crust of bread on the doorstep on the first night of the month.', 'Strangers are offered salt at the gate and should eat it.',
    'Nobody whistles after dark.', 'A newborn\'s name is kept secret until their first birthday.', 'The last drink of the night is poured on the floor for the dead.',
    'Every door is painted the same color as the house\'s first owner\'s eyes.', 'Weddings are held at midnight, by lantern light.',
    'Nobody speaks the founder\'s name aloud.', 'Every visitor is asked for news, and lying about it is very bad luck.',
    'Debts are settled on the steps of the temple so the gods can see.', 'The whole town turns out to throw mud at the tax collector once a year, and the tax collector expects it.',
    'Children carry a pebble from the river for luck and must never lose it.'];

const TOWN_TROUBLES = [
    'Livestock keep vanishing from the outlying farms, and the tracks lead toward {district}.', 'The well in {district} has started bringing up warm, red water.',
    'Someone is setting fires in {district}, one a night, always at the same hour.', '{faction} and the watch are one bad night from open fighting.',
    'A sickness is spreading in {district}, and the healers do not know what it is.', 'The {leader} has gone missing, and the people closest to them are covering it up.',
    'Bandits have closed the road, and food prices have doubled.', 'A debt collector from the capital has arrived to call in the town\'s loans.',
    'Graves in the old cemetery have been dug up, but nothing taken.', 'Strangers in grey have been buying up every house in {district}.',
    'The harvest failed, and someone is hoarding grain.', 'A child claims to have seen a dragon over the hills, and the sheep agree.',
    '{faction} {faction:is|are} buying up debts all over town, and nobody knows why.', 'Every dog in town has started howling at the same spot in {district}.',
    'A traveling preacher is stirring up the crowds against {faction}.', 'The bridge in {district} is cracking, and nobody will pay to fix it.'];

// ── Helpers ──────────────────────────────────────────────
function townPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function townWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function townShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function townRange([lo, hi]) {
    return lo + Math.floor(rand() * (hi - lo + 1));
}

function townSizeAtLeast(size, min) {
    return TOWN_SIZE_KEYS.indexOf(size) >= TOWN_SIZE_KEYS.indexOf(min);
}

const TOWN_RACE_PLURALS = { human: 'humans', elf: 'elves', dwarf: 'dwarves', halfling: 'halflings', gnome: 'gnomes', orc: 'orcs', tiefling: 'tieflings', dragonborn: 'dragonborn' };

// A compound name in the old style ("Fernbrook", "Lower Saltmere"); tails that fit the setting come up more.
function townName(setting) {
    const s = TOWN_SETTINGS[setting];
    for (let tries = 0; tries < 20; tries++) {
        const head = townPick(TOWN_NAME_HEADS);
        const tail = rand() < 0.55 ? townPick(s.tails) : townPick(TOWN_NAME_TAILS);
        const h = head.toLowerCase();
        // No repeats ("Hollowhollow") and no triple letters ("Bellley").
        if (h.endsWith(tail) || tail.startsWith(h) || (/(.)$/.test(h) && h.slice(-1) === tail[0])) continue;
        let name = head + tail;
        if (TOWN_BANNED.includes(name.toLowerCase())) continue;
        const front = rand();
        if (front < 0.12) name = `${townPick(TOWN_NAME_FRONTS)} ${name}`;
        return name;
    }
    return 'Fernbrook';
}

// The roll's people are rolled the NPC page's way (see facNpc in faction-engine.js).
function townNpc(seed, cat, age) {
    return facNpc(seed, cat, age);
}

// ── The roll ─────────────────────────────────────────────
// opts: { size, setting, wealth }, each a key or 'random'; govs: preferred TOWN_GOVS keys (optional).
function rollTown(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const sub = label => deriveSeed(seed, label);
    // Always drawn, so a picked option doesn't shift any other part.
    const rolled = part('options', () => ({
        size: townWeighted([['village', 4], ['town', 5], ['city', 3], ['hamlet', 2], ['metropolis', 1]]),
        setting: townPick(TOWN_SETTING_KEYS),
        wealth: townWeighted([['modest', 5], ['poor', 3], ['prosperous', 3]])
    }));
    const size = TOWN_SIZES[opts.size] ? opts.size : rolled.size;
    const setting = TOWN_SETTINGS[opts.setting] ? opts.setting : rolled.setting;
    const wealth = TOWN_WEALTH[opts.wealth] ? opts.wealth : rolled.wealth;
    const z = TOWN_SIZES[size], s = TOWN_SETTINGS[setting], wl = TOWN_WEALTH[wealth];
    const t = { seed, size, setting, wealth };

    t.name = part('name.' + setting, () => townName(setting));
    t.population = part('pop.' + size, () => {
        const [lo, hi] = z.pop;
        const p = lo + Math.pow(rand(), 1.6) * (hi - lo);
        return p >= 1000 ? Math.round(p / 100) * 100 : p >= 100 ? Math.round(p / 10) * 10 : Math.round(p);
    });
    t.known = part('known.' + setting, () => townPick(s.known));
    t.folk = part('folk.' + setting, () => {
        const main = rand() < 0.6 ? s.races[0] : townPick(s.races);
        const rest = townShuffle(NPC_RACES.filter(r => r !== main)).sort((a, b) => (s.races.includes(b) ? 1 : 0) - (s.races.includes(a) ? 1 : 0));
        const share = 50 + Math.floor(rand() * 36);
        const second = Math.round((100 - share) * (0.5 + rand() * 0.3));
        return [[main, share], [rest[0], second], [rest[1], 100 - share - second]].filter(f => f[1] > 0);
    });
    t.founded = part('founded.' + size, () => ({
        years: Math.round(townRange(z.founded) / 5) * 5,
        by: townPick(TOWN_FOUNDERS),
        since: townPick(TOWN_FOUNDED_SINCE)
    }));

    // Government and leader (the leader keeps their seed when the size changes, if the government fits).
    const govFits = TOWN_GOVS.filter(g => g.sizes.includes(size));
    t.gov = part('gov.' + size, () => townPick(govFits).key);
    // A realm on the Continent tab asks for its own kinds of rule (opts.govs), where they fit the size.
    const govWanted = Array.isArray(opts.govs) ? govFits.filter(g => opts.govs.includes(g.key)) : [];
    if (govWanted.length && !govWanted.some(g => g.key === t.gov)) t.gov = part('gov.realm.' + size, () => townPick(govWanted).key);
    const gov = TOWN_GOVS.find(g => g.key === t.gov);
    // Nobody runs a town at seventeen: a leader is at least an adult.
    const leaderAge = gov.age || part('leader.age', () => townPick(['adult', 'middle', 'middle', 'old']));
    t.leader = townNpc(sub('leader.' + gov.cat), gov.cat, leaderAge);
    t.leader.title = genderedTitle(gov.title, t.leader.npc.gender);
    t.leader.style = part('leader.style', () => townPick(TOWN_LEADER_STYLES));
    t.strings = part('strings', () => townPick(TOWN_STRINGS));

    t.watch = part('watch.' + size, () => {
        const w = TOWN_WATCH[size];
        const count = w.per ? Math.max(3, Math.round(t.population / w.per * (0.7 + rand() * 0.6))) : 0;
        return { name: townPick(w.names), count, kind: townPick(TOWN_WATCH_KINDS), party: townPick(TOWN_WATCH_PARTY),
            bribe: [1, 2, 5, 10, 25][Math.floor(rand() * 5)] * (wealth === 'prosperous' ? 2 : 1) };
    });
    t.captain = size === 'hamlet' ? null : townNpc(sub('captain'), 'guard', 'middle');

    // The temple: its god (facDeity's way), its look, its priest.
    t.temple = part('temple', () => ({
        deity: { domains: s.domains, pick: rand(), title: rand() },
        look: townPick(size === 'hamlet' ? TOWN_SHRINE_LOOKS : TOWN_TEMPLE_LOOKS),
        offers: townPick(TOWN_TEMPLE_OFFERS)
    }));
    t.priest = townNpc(sub('priest'), 'religious');

    // Districts: the hamlet is its own; otherwise a deck that fits the size and setting.
    t.districts = part(`districts.${size}.${setting}`, () => {
        const pick = d => ({ key: d.key, name: townPick(d.names), look: townPick(d.look), here: townPick(d.here) });
        if (size === 'hamlet') return [pick(TOWN_HAMLET_DISTRICT)];
        const fits = TOWN_DISTRICTS.filter(d => townSizeAtLeast(size, d.min) && (!d.max || townSizeAtLeast(d.max, size))
            && (!d.settings || d.settings.includes(setting)));
        // The market (or the green) and the setting's own district come first.
        const first = fits.filter(d => d.key === 'market' || (d.settings && d.settings.includes(setting) && d.key !== 'river'));
        const order = townShuffle(first).concat(townShuffle(fits.filter(d => !first.includes(d))));
        return order.slice(0, townRange(z.districts)).map(pick);
    });

    t.buildings = part('buildings.' + setting, () => {
        const list = TOWN_BUILDINGS.filter(b => townSizeAtLeast(size, b[2])).map(([label, per]) => [label, per, 0.8 + rand() * 0.4]);
        list.splice(2, 0, [s.building[0], s.building[1], 0.8 + rand() * 0.4]);
        return list.map(([label, per, j]) => {
            const n = t.population * per / 1000 * j;
            return [label, Math.max(1, n >= 100 ? Math.round(n / 10) * 10 : Math.round(n))];
        });
    });

    // Notable people: each keeps its seed by position; a tie points at someone else in the list.
    // Wants and ties come off shuffled decks, so no two people share one.
    const decks = part('people.decks', () => ({ wants: townShuffle(TOWN_WANTS), ties: townShuffle(TOWN_TIES) }));
    t.people = part('people', () => townShuffle(TOWN_ROLES)).slice(0, z.people).map(([role, cat, age], k) => {
        const p = townNpc(sub('person.' + k), cat, age);
        return { ...p, role, want: decks.wants[k], tie: decks.ties[k], ...part('person.' + k + '.more', () => ({ with: rand(), fac: rand(), facPick: rand() })) };
    });
    t.people.forEach((p, k) => {
        const others = t.people.map((q, j) => j).filter(j => j !== k && t.people[j].npc.firstName !== p.npc.firstName);
        p.tieTo = others.length ? others[Math.floor(p.with * others.length)] : null;
    });

    // Taverns and shops: seeds, plus the quality and type picked for each, placed in a district.
    const nd = t.districts.length;
    t.taverns = part(`taverns.${size}.${wealth}`, () => Array.from({ length: townRange(z.taverns) }, (x, k) => {
        const tier = townWeighted(TAVERN_TIER_KEYS.map((key, i) => [key, wl.tavern[i]]));
        return { seed: sub('tavern.' + k), quality: tier, district: Math.floor(rand() * nd) };
    }));
    t.shops = part(`shops.${size}.${setting}.${wealth}`, () => {
        const types = Object.keys(SHOP_TYPES).filter(k => k !== 'docks' || ['river', 'coast', 'marsh'].includes(setting));
        const n = townRange(z.shops);
        // The setting's favorites first, then a shuffled deck of the rest; a hamlet has only a general store.
        const order = size === 'hamlet' ? ['general'] : townShuffle(s.shops.filter(k => types.includes(k))).slice(0, 2)
            .concat(townShuffle(types.filter(k => !s.shops.includes(k))));
        return order.slice(0, n).map((type, k) => ({ seed: sub('shop.' + k), type, wealth: townWeighted(wl.shop), district: Math.floor(rand() * nd) }));
    });

    // Never fewer buildings than the ones described.
    t.buildings.forEach(b => {
        if (b[0] === 'Taverns and inns') b[1] = Math.max(b[1], t.taverns.length);
        if (b[0] === 'Shops and stalls') b[1] = Math.max(b[1], t.shops.length);
    });

    t.laws = part('laws', () => townShuffle(TOWN_LAWS).slice(0, 2).map(([text, fine]) => ({ text, fine: fine * (wealth === 'prosperous' ? 2 : 1) })));
    t.customs = part('customs', () => townShuffle(TOWN_CUSTOMS).slice(0, 2));
    t.trouble = part('trouble', () => ({ text: townPick(TOWN_TROUBLES), district: rand(), faction: rand() }));
    // Rumors are draws into rumors.json (picked when it loads; see townRumorIndexes).
    t.rumorDraws = part('rumors', () => [rand(), rand(), rand(), rand()]);
    t.rumorCount = part('rumors.count', () => 2 + (rand() < 0.5 ? 1 : 0));
    t.factionSeed = z.factions ? sub('factions') : null;
    t.questSeed = sub('quest');
    return t;
}

// ── Linked rolls ─────────────────────────────────────────
// The town's factions (a rollFactions() result) or null for a hamlet.
function townFactions(t) {
    const z = TOWN_SIZES[t.size];
    return t.factionSeed ? rollFactions(t.factionSeed, { count: z.factions, scale: z.facScale }) : null;
}

// The town's quest, at the Toolbox's defaults (the giver, job, place, and task don't depend on the party).
function townQuest(t) {
    return rollQuest(t.questSeed, { level: 1, size: 4 });
}

function townTavern(tv) {
    return rollTavern(tv.seed, { quality: tv.quality });
}

function townShop(sh) {
    return withSeed(sh.seed, () => rollShop({ type: sh.type, wealth: sh.wealth }));
}

// Indexes into rumors.json (count: its length): different rumors, the first a local one when it can be.
function townRumorIndexes(t, rumors) {
    if (!rumors || !rumors.length) return [];
    const local = rumors.map((r, i) => i).filter(i => rumors[i].category === 'local');
    const out = [];
    t.rumorDraws.slice(0, t.rumorCount).forEach((d, k) => {
        const pool = k === 0 && local.length ? local : rumors.map((r, i) => i);
        let idx = pool[Math.floor(d * pool.length)];
        while (out.includes(idx)) idx = (idx + 1) % rumors.length;
        out.push(idx);
    });
    return out;
}

// ── Text ─────────────────────────────────────────────────
// ctx: { factions: townFactions(t) or null, pantheon: a rollPantheon() result or null }.
function townDeity(t, ctx) {
    return facDeity({ deity: t.temple.deity }, ctx && ctx.pantheon);
}

function townFactionName(t, ctx, draw) {
    const w = ctx && ctx.factions;
    if (!w || !w.factions.length) return null;
    return facName(w, Math.floor(draw * w.factions.length), ctx);
}

// Fill {faction}, {district}, {leader} in a line. draw: a 0-1 number that picks the faction.
function townFill(text, t, ctx, draw = 0, districtDraw = 0) {
    const fac = townFactionName(t, ctx, draw) || 'a gang from out of town';
    return facAgree(text, 'faction', fac)
        .replace(/\{faction\}/g, fac)
        .replace(/\{district\}/g, t.districts[Math.floor(districtDraw * t.districts.length)].name)
        .replace(/\{leader\}/g, t.leader.title.toLowerCase());
}

function townList(items) {
    return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + (items.length > 2 ? ',' : '') + ' and ' + items[items.length - 1];
}

function townFolkText(t) {
    const [main, ...rest] = t.folk;
    const name = r => TOWN_RACE_PLURALS[r] || r;
    return `Mostly ${name(main[0])} (${main[1]}%)` + (rest.length ? `, with ${townList(rest.map(([r, p]) => `${name(r)} (${p}%)`))}` : '') + '.';
}

function townPersonLine(p) {
    return facPersonLine(p);
}

function townSummary(t) {
    const z = TOWN_SIZES[t.size], s = TOWN_SETTINGS[t.setting];
    return `${facCap(z.a)} of about ${t.population.toLocaleString('en-US')} folk ${s.where}. Known for ${t.known}.`;
}

function townGovText(t, ctx) {
    const gov = TOWN_GOVS.find(g => g.key === t.gov);
    let how = gov.how;
    if (gov.hidden) how += ` The real power: ${townFill(t.strings, t, ctx, t.trouble.faction)}.`;
    return `${gov.label}. ${how}`;
}

// The realm a town stands in on the Continent tab's map: { c, t, nat } (continent-engine.js).
function townRealmText(r) {
    const nat = r.nat, G = CONT_GOVS[nat.gov];
    const cap = r.t.capital ? `; this is its capital` : `; the capital is ${r.c.towns[nat.capital].name}`;
    return `${facCap(nat.name)}, ${G.a} under ${nat.ruler.title} ${nat.ruler.npc.name}${cap}. `
        + `${CONT_CLIMATES[r.c.map.climate[r.t.cell]].label} climate. The realm exports ${nat.exports.join(' and ')}.`;
}

// The town at a glance, as [label, text] pairs.
function townLines(t, ctx) {
    const god = townDeity(t, ctx);
    const w = t.watch;
    const lines = [
        ['Size', `${TOWN_SIZES[t.size].label}, about ${t.population.toLocaleString('en-US')} folk.`],
        ['Where', facCap(TOWN_SETTINGS[t.setting].where) + '.'],
        ['Known for', facCap(t.known) + '.'],
        ['Folk', townFolkText(t)],
        ['Times', TOWN_WEALTH[t.wealth].about],
        ...(ctx.realm ? [['Realm', townRealmText(ctx.realm)]] : []),
        ['Founded', `About ${t.founded.years} years ago, by ${t.founded.by}. ${t.founded.since}`],
        ['Rule', townGovText(t, ctx)],
        ['In charge', `${t.leader.title} ${townPersonLine(t.leader)}. ${t.leader.style}`],
        ['The watch', w.count
            ? `${facCap(w.name)}, about ${w.count} strong. ${townFill(w.kind, t, ctx, t.trouble.faction)} ${w.party} A bribe runs about ${formatCoins(w.bribe)}.`
            : `${w.name}.`]
    ];
    if (t.captain) lines.push(['Watch captain', townPersonLine(t.captain) + '.']);
    lines.push(
        ['Temple', `${t.temple.look}, ${t.size === 'hamlet' ? 'a shrine' : 'the temple'} of ${god.full}. It offers ${t.temple.offers}.`],
        ['Priest', townPersonLine(t.priest) + '.']
    );
    return lines;
}

function townDistrictLines(t) {
    return t.districts.map(d => [facCap(d.name), `${d.look}. Here: ${d.here}.`]);
}

function townBuildingsText(t) {
    return t.buildings.map(([label, n]) => `${label}: ${n.toLocaleString('en-US')}`).join(' · ');
}

function townPeopleLines(t, ctx) {
    return t.people.map(p => {
        const other = p.tieTo !== null ? t.people[p.tieTo] : null;
        const tie = other ? ' ' + p.tie.replace(/\{a\}/g, p.npc.firstName).replace(/\{b\}/g, other.npc.firstName) : '';
        const fac = p.fac < 0.35 ? townFactionName(t, ctx, p.facPick) : null;
        const works = fac ? ` Secretly works for ${fac}.` : '';
        return [p.role, `${townPersonLine(p)}. ${p.npc.trait}. ${p.want}${tie}${works}`];
    });
}

function townLawLines(t) {
    return t.laws.map(l => `${l.text} Fine: ${formatCoins(l.fine)}.`);
}

function townTroubleText(t, ctx) {
    return facCap(townFill(t.trouble.text, t, ctx, t.trouble.faction, t.trouble.district));
}

function townTavernLine(t, tv, data) {
    return `${data.name}: ${TAVERN_TIERS[data.tier].label.toLowerCase()} ${data.kind.label} in ${t.districts[tv.district].name}, kept by ${data.owner.name}.`;
}

function townShopLine(t, sh, data) {
    return `${data.name}: ${SHOP_TYPES[sh.type].label} (${SHOP_WEALTH[sh.wealth].label.toLowerCase()}) in ${t.districts[sh.district].name}, kept by ${data.keeper.name}.`;
}

function townText(t, ctx, rumors) {
    const out = [`${t.name}`, townSummary(t), ''];
    townLines(t, ctx).forEach(([k, v]) => out.push(`${k}: ${v}`));
    out.push('', 'Districts:');
    townDistrictLines(t).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
    out.push('', `Buildings: ${townBuildingsText(t)}`, '', 'Notable people:');
    townPeopleLines(t, ctx).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
    if (ctx.factions) {
        out.push('', 'Factions in town:');
        ctx.factions.factions.forEach((f, i) => out.push(`  ${FAC_TYPES[f.type].icon} ${facCap(facName(ctx.factions, i, ctx))} (${FAC_TYPES[f.type].label.toLowerCase()})`));
    }
    out.push('', 'Taverns:');
    t.taverns.forEach(tv => out.push('  ' + townTavernLine(t, tv, townTavern(tv))));
    out.push('Shops:');
    t.shops.forEach(sh => out.push('  ' + townShopLine(t, sh, townShop(sh))));
    out.push('', 'Laws:');
    townLawLines(t).forEach(l => out.push('  ' + l));
    out.push('Customs:');
    t.customs.forEach(c => out.push('  ' + c));
    out.push('', `Trouble: ${townTroubleText(t, ctx)}`);
    const idx = townRumorIndexes(t, rumors);
    if (idx.length) {
        out.push('Rumors:');
        idx.forEach(i => out.push(`  "${rumors[i].text}"`));
    }
    const q = townQuest(t);
    out.push('', `Quest: ${q.title}. ${q.task} (Ask ${q.giver.name}.)`);
    return out.join('\n');
}
