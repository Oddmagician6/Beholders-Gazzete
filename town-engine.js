/* ============================================
   TOWN ENGINE (F37, Worldbuilder)
   A seeded settlement, from a hamlet to a metropolis: its name, where it stands and
   what it's known for, who lives there, when and how it was founded, how it's run and
   by whom, the watch, the temple and its god, the factions in town, its districts,
   how many of each building there are, a few notable people with ties to each other,
   its taverns and shops (seeds for rollTavern and rollShop, so each one opens in the
   Toolbox or on the Shop page), local laws and customs, a current trouble and who is
   behind it, rumors (draws into rumors.json), market day, sights, a local legend and
   its truth, and a quest hook (a rollQuest seed). Lines added later (roles, the
   setting's own troubles) come from draws of their own, so old links keep most of
   what they had.
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
            'the river festival, when the whole town tries to cross on rafts', 'barges that carry grain downriver all summer', 'a ferryman who has never once lost a passenger, and says so', 'mills along the bank, one for grain and one for paper', 'a stone troll on the bridge that the children feed on holidays', 'boatmen who sing the hours instead of ringing a bell', 'a flood every spring, and a town that rebuilds cheerfully'],
        customs: ['Everyone throws a flower into the river on their birthday.', 'Nobody crosses the bridge without nodding to the water.', 'Fishers give the first catch of the year back to the river.', 'Weddings end with the couple rowing across the river while the guests try to tip them in.'],
        troubles: ['The river has dropped lower than anyone remembers, and something is showing through the mud.', 'The ferry keeps coming back across the river with nobody aboard.', 'Barges have stopped coming down from upriver, and nobody has sent word why.'],
        goods: ['smoked eels', 'river pearls of doubtful quality', 'reed mats', 'grain straight off the barges'],
        sights: ['a water wheel as tall as three houses', 'flood marks painted on the bridge, the highest well above anyone\'s head', 'a chapel built on the middle of the bridge']
    },
    coast: {
        label: 'Harbor', icon: '⚓', where: 'around a harbor in the lee of a rocky headland',
        tails: ['haven', 'mouth', 'port', 'sands', 'cove'], domains: ['tempest', 'trickery', 'life'], shops: ['docks', 'provisioner', 'curio'],
        races: ['human', 'dragonborn', 'tiefling'], building: ['Piers, wharves, and boathouses', 1.6],
        known: ['the fish market, loud from before dawn', 'shipwrights whose hulls are said to never leak', 'smugglers everyone knows about and nobody can catch',
            'a lighthouse older than the town', 'sailors\' tattoo parlors, three to a street', 'the widows\' walk where the whole town watches for the fleet', 'pearl divers who can hold their breath for an absurd time', 'a sea wall the town swears giants built', 'salt pans that glitter for a mile', 'storms that drive half the coast\'s ships into its harbor'],
        customs: ['Nobody whistles on a boat, or near one.', 'A candle burns in the window of every house with someone at sea.', 'Drowned sailors get an empty grave and a stone that faces the water.', 'Fishers never say "storm" aloud, only "weather".'],
        troubles: ['Three ships are overdue, and the lighthouse keeper swears the lamp went out by itself.', 'Something has been cutting the fishing nets from below.', 'A ship sailed into harbor with every hand asleep, and nobody can wake them.'],
        goods: ['fish still flapping', 'salt by the sack', 'coral trinkets', 'tarred rope and sailcloth'],
        sights: ['an arch of whale jawbone over the harbor gate', 'figureheads from wrecked ships nailed along the sea wall', 'tide pools where the children race crabs']
    },
    crossroads: {
        label: 'Crossroads', icon: '🛤️', where: 'where two old trade roads cross',
        tails: ['cross', 'stow', 'gate', 'by', 'ton'], domains: ['trickery', 'knowledge', 'light'], shops: ['general', 'stable', 'provisioner'],
        races: ['human', 'halfling', 'gnome'], building: ['Caravan yards and stables', 1.4],
        known: ['its great market, where caravans from four directions meet', 'inns, more of them than anyone needs', 'news: anything that happens anywhere passes through here first',
            'money changers who will take any coin ever struck', 'the hanging tree at the crossing, still in use', 'a hiring fair where sellswords stand in rows', 'the best stables between any two cities', 'a court where any traveler can bring a case', 'its four gates, each built in a different style'],
        customs: ['Strangers are asked where they came from, and the answer goes in the inn book.', 'Every traveler leaves a pebble at the crossing for a safe road.', 'Deals are sealed with a handshake over a coin, and the coin goes to the temple.', 'Nobody gives directions until they are asked twice.'],
        troubles: ['A caravan rolled in with every wagon and none of its drivers.', 'Two merchant houses have each hired swords, and both are camped in {district}.', 'Counterfeit coin is turning up all over the market, and it is very good.'],
        goods: ['spices from four directions', 'secondhand wagons', 'foreign cloth', 'maps of roads nobody has traveled'],
        sights: ['a milestone giving the distance to places that do not exist', 'a signpost with a hundred arms', 'the old hanging tree, scarred by every rope']
    },
    hills: {
        label: 'Mining hills', icon: '⛏️', where: 'on terraces cut into hills riddled with old mine workings',
        tails: ['hill', 'dale', 'delve', 'shaft', 'crag'], domains: ['knowledge', 'war', 'death'], shops: ['blacksmith', 'jeweler', 'provisioner'],
        races: ['dwarf', 'gnome', 'human'], building: ['Mine heads and smelters', 1.0],
        known: ['silver, and the arguments about who owns it', 'a mine that closed after "the incident" and will not be discussed', 'stonework so fine the walls need no mortar',
            'miners\' choirs, deep and very loud', 'a gem that turned up in a chicken\'s crop, now in the town hall', 'hot springs that smell of eggs and are said to cure everything', 'a forge that has not gone cold in a century', 'tunnels under the town that join every cellar', 'old miners who can tell ore by its smell'],
        customs: ['Miners touch the lintel of the mine for luck, and it is worn smooth.', 'Nobody whistles underground.', 'A lamp burns at the mine head for anyone still below.', 'Every baby gets a lump of silver ore at its naming.'],
        troubles: ['The miners broke into a sealed tunnel, and lamps go out whenever anyone goes near it.', 'The silver ran out, and someone is salting the mine to hide it.', 'The ground shakes every night at the same hour, and a little harder each time.'],
        goods: ['pick heads and lamp oil', 'raw silver by the ounce', 'cut stone', 'miners\' pasties'],
        sights: ['a stair of a thousand steps up to the oldest mine', 'a slag heap the children slide down on trays', 'a gem-studded door on the guildhall']
    },
    forest: {
        label: 'Forest edge', icon: '🌲', where: 'in a clearing at the edge of a deep and very old forest',
        tails: ['wood', 'hurst', 'hollow', 'shaw', 'den'], domains: ['nature', 'trickery', 'life'], shops: ['bowyer', 'leatherworker', 'provisioner'],
        races: ['elf', 'halfling', 'human'], building: ['Lumber yards and sawpits', 1.0],
        known: ['woodcarvings on every doorframe', 'honey and wax from the forest hives', 'the treeline nobody crosses after dark',
            'hunters who can track a sparrow across stone', 'a druid\'s grove the town leaves offerings at, just in case', 'charcoal burners whose smoke hangs over the town all year', 'a hunting lodge where a lord once vanished', 'yew bows that fetch high prices in the city', 'its truce with something that lives in the woods'],
        customs: ['Nobody cuts a tree without asking it first, out loud.', 'A bowl of milk is left at the treeline every new moon.', 'Children never answer if the woods call their name.', 'Every house keeps an iron nail above the door.'],
        troubles: ['Woodcutters keep coming back from the forest with no memory of the day.', 'The trees at the edge of town are closer than they were, a few feet a night.', 'Hunters found a ring of fresh stumps deep in the forest, cut by no axe.'],
        goods: ['honey and beeswax', 'furs and antlers', 'carved bowls', 'mushrooms best not asked about'],
        sights: ['a tree house big enough for a family', 'a ring of carved wooden faces at the treeline', 'the great stump where the founders held council']
    },
    farmland: {
        label: 'Farmland', icon: '🌾', where: 'among wide fields and orchards on the plain',
        tails: ['field', 'stead', 'thorpe', 'ton', 'ley'], domains: ['life', 'nature', 'light'], shops: ['provisioner', 'general', 'stable'],
        races: ['halfling', 'human', 'gnome'], building: ['Barns and granaries', 2.0],
        known: ['its harvest fair and the prize vegetables', 'cider strong enough to strip paint', 'a scarecrow in every field, each with a name',
            'the best cheese in three counties, by its own account', 'a feud between two farming families older than the town charter', 'plow horses, the biggest in the realm', 'a windmill that turns even on still days', 'beekeepers who talk to their hives', 'a market cross where every fair has been held since the founding'],
        customs: ['The last sheaf of the harvest is dressed up and given a seat at the feast.', 'Nobody counts the hens aloud.', 'Every spring the town walks its bounds and beats the boundary stones with sticks.', 'Neighbors bring in each other\'s harvest, and keeping score is very rude.'],
        troubles: ['Every scarecrow in the west fields turned to face the town overnight.', 'A blight is creeping through the orchards, one tree a day, in a straight line.', 'The harvest hands have walked off the fields, and nobody will say who paid them.'],
        goods: ['wheels of cheese', 'cider by the barrel', 'piglets', 'prize vegetables'],
        sights: ['a giant scarecrow at the crossroads, dressed in the lord\'s old clothes', 'a windmill with sails painted like a dragon\'s wings', 'a standing stone in the middle of a field, plowed around for centuries']
    },
    pass: {
        label: 'Mountain pass', icon: '🏔️', where: 'in a narrow pass between snowy peaks, the only way through for miles',
        tails: ['gate', 'hold', 'watch', 'wall', 'crag'], domains: ['war', 'tempest', 'light'], shops: ['blacksmith', 'provisioner', 'stable'],
        races: ['dwarf', 'human', 'orc'], building: ['Toll houses and watchtowers', 0.8],
        known: ['the toll gate, and the toll, which rises every winter', 'guides who will take anyone through for a price', 'avalanche bells that ring every few years, too late',
            'goat\'s cheese, goat\'s wool, and goat stew', 'an old fortress on the ridge that nobody garrisons any more', 'the inn at the top of the pass, built from a fallen fortress', 'monks who ring bells to guide travelers through the fog', 'great dogs that dig travelers out of the snow', 'its avalanche wall, three generations in the building'],
        customs: ['Nobody is turned away in winter, not even an enemy.', 'Every climber ties a ribbon at the shrine on the summit.', 'Nobody shouts in the pass in spring.', 'Guides swear an oath on the mountain, and breaking it means exile.'],
        troubles: ['The pass snowed in early, and the town is full of travelers who cannot leave.', 'Something big is taking goats from the high pastures and leaving the bones stacked neatly.', 'The toll keeper was found frozen at the gate on a warm night.'],
        goods: ['goat\'s wool', 'snowshoes and climbing spikes', 'hard cheese', 'dried meat for the climb'],
        sights: ['a fortress gate carved straight out of the mountain', 'a shrine of frozen offerings at the top of the pass', 'the bones of something huge, half buried in the scree']
    },
    marsh: {
        label: 'Marsh', icon: '🐸', where: 'on stilts and causeways above a wide, misty marsh',
        tails: ['mere', 'fen', 'moor', 'marsh', 'water'], domains: ['death', 'nature', 'trickery'], shops: ['alchemist', 'curio', 'provisioner'],
        races: ['human', 'halfling', 'tiefling'], building: ['Causeways and stilt-walks', 1.0],
        known: ['peat smoke you can smell a day away', 'reed baskets and eel traps sold in every town nearby', 'lights over the water at night that nobody follows twice',
            'herbs that only grow in the bog, worth their weight in silver', 'the drowned chapel, whose bell still rings at low tide', 'stilt-walkers who cross the bog without a causeway', 'black cranes nesting on every roof', 'a smuggling trade in bog iron', 'the marsh fever, which no local ever seems to catch'],
        customs: ['Nobody follows a light over the water, and children learn it before they can walk.', 'The dead are sunk in the marsh at low tide with a stone on the chest.', 'Every house keeps a boat, even the ones on dry ground.', 'Visitors are given a sprig of bog myrtle to keep the spirits off.'],
        troubles: ['The causeway to {district} sank overnight, and something is living under the planks.', 'The lights over the marsh have started coming into town.', 'The drowned chapel\'s bell rang at high tide, which it never does.'],
        goods: ['eel traps', 'bog herbs', 'peat by the cartload', 'frog legs on skewers'],
        sights: ['a sunken tower that shows only its top floor', 'stilt houses joined by swaying rope bridges', 'lanterns of eel skin along the causeways']
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
    'runaway apprentices from a city that still wants them back', 'shepherds who followed a white stag',
    'a priest who heard a voice in the spring', 'dwarves who lost a war and kept walking', 'a merchant who bought the land for a song and a bad debt',
    'prisoners sent to build a fort, who stayed when their sentences ended', 'a halfling clan whose old home flooded', 'a giant\'s servants, once the giant died',
    'the crew of a riverboat that ran aground', 'refugees from a city the earth swallowed', 'a hermit who got far more visitors than they wanted',
    'two rival wizards who each claimed the same hill', 'pilgrims who stopped to rest and never set off again', 'an outlaw band pardoned on condition they stay put'];
const TOWN_FOUNDED_SINCE = [
    'The founder\'s statue in the square has lost its nose to generations of luck-rubbing.', 'Burned down once and rebuilt in stone, mostly.',
    'Still pays a tithe to a lord nobody has seen in a lifetime.', 'The charter was lost in a flood; the council insists it said what they say it said.',
    'Survived a siege, a plague, and a very bad harvest in the same decade.', 'The oldest families still sit in the front pews and expect to.',
    'Grew fast when the road came through, and has never quite caught up with itself.', 'Has changed its name twice; old folk still use the first one.',
    'The town hall is the founder\'s house, still full of the founder\'s furniture.', 'Half the families trace themselves to the founders, and the other half are tired of hearing it.',
    'Stood empty for a generation after a sickness, then strangers settled it again.', 'Lost its charter in a card game and won it back the next night.',
    'Owes its walls to a war that never actually reached it.', 'Was raided by orcs within living memory; the axe marks are still on the gate.',
    'Holds a feast on founding day every year, and nobody agrees on the date.', 'Nearly became a city once, until the road moved.'];

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
    'Takes a small cut of everything, and everyone knows it.', 'Hides a sharp mind behind a show of being a fool.',
    'Means well, and agrees with whoever spoke to them last.', 'Rules by ledger, and knows the price of everything.', 'Pious to a fault, and suspects every stranger of heresy.',
    'Charming in public and vicious in private.', 'A war hero bored to tears by peace.', 'Spends more time hunting than governing.',
    'Fair, slow, and impossible to hurry.', 'Owes the job to a favor, and the favor is coming due.'];
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
    'In the pocket of {faction}.', 'Brave, few, and badly armed.',
    'Volunteers who take it far too seriously.', 'Sellswords hired by the year, loyal to the purse.', 'Sharp, well paid, and very nosy.',
    'Half of them are related to the captain.', 'Fond of fines, less fond of chasing anyone.', 'Reformed thieves, which helps more than you would think.',
    'Superstitious: no patrol goes out after a black cat crosses its path.', 'Proud, polished, and mostly for show.'];
const TOWN_WATCH_PARTY = [
    'They watch adventurers closely and expect trouble.', 'They are glad of any help and will say so, once.', 'They resent anyone who solves a crime before they do.',
    'They will look the other way for a reasonable bribe.', 'They ask every armed stranger to sign a book at the gate.',
    'They hire adventurers for jobs they would rather not do themselves.', 'They trade what they know for a drink and a good story.',
    'They keep a list of wanted monsters and pay bounties on them.', 'They do not care what anyone does outside the walls.',
    'They take a dim view of spellcasting and say so loudly.', 'They will ask the party to take a recruit along "for the experience".',
    'They let off anyone who makes the captain laugh.'];

// The temple: how it looks, and what it offers the party.
const TOWN_TEMPLE_LOOKS = [
    'A squat stone chapel with a leaning bell tower', 'A grand domed temple far too large for the place', 'A timber hall with carved doors and a turf roof',
    'An old temple half-ruined and half-repaired', 'A bright, new temple paid for by one rich family, and they want you to know it',
    'A cave shrine cut into the hillside, lit by a hundred candles', 'A temple built on the ruins of an older one, to a different god',
    'A small shrine under an ancient tree, tended every morning', 'A round temple open to the sky', 'A converted barn with the altar where the hayloft was',
    'A tall, narrow temple squeezed between two houses', 'A temple of white stone that the town scrubs every week', 'A temple whose crypt is bigger than the building above it'];
const TOWN_SHRINE_LOOKS = [
    'A wayside shrine with a little roof and a bench', 'A small shrine under an ancient tree, tended every morning', 'A one-room chapel that doubles as the meeting hall',
    'A standing stone with offerings heaped at its foot', 'A carved post hung with ribbons and charms', 'A spring in a stone basin with coins at the bottom',
    'A hut with a bell, an altar, and a sleeping cat'];
const TOWN_TEMPLE_OFFERS = [
    'healing for the faithful at a fair price, and for strangers at a less fair one', 'blessings before a journey, a few coppers a candle',
    'a library of old records the priests will open for a donation', 'sanctuary to anyone who reaches the altar, which the watch hates',
    'holy water by the flask, blessed fresh every dawn', 'a bed and a meal for any pilgrim, no questions asked',
    'burials and last rites, and an ear for confessions it will never repeat', 'curses lifted, for those who can pay and wait',
    'a bell rung for the dead, and a list of every name it has rung for', 'weddings blessed quickly and with no questions asked',
    'a priest who will sit with the dying, whoever they are', 'a rare scroll or two, sold only to the faithful'];

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
    ['Warehouses', 1.5, 'town'], ['Guildhalls', 0.3, 'town'], ['Bathhouses', 0.2, 'town'], ['Schools and libraries', 0.15, 'city'],
    ['Graveyards', 0.3, 'hamlet'], ['Smithies', 1.2, 'village'], ['Bakeries', 1.5, 'village'], ['Stables', 1, 'village'], ['Jails', 0.1, 'town'], ['Barracks', 0.05, 'city']];

// Notable people: [role, NPC category, age bucket or null].
const TOWN_ROLES = [
    ['The richest person in town', 'merchant'], ['The oldest resident', 'commoner', 'ancient'], ['The town gossip', 'commoner'],
    ['A retired adventurer', 'adventurer', 'old'], ['The healer', 'religious'], ['The local spellcaster', 'magic'],
    ['Someone everyone pretends not to know', 'criminal'], ['A disgraced noble', 'noble'], ['Everyone\'s favorite', 'commoner'],
    ['The one who wants the leader\'s job', 'merchant'], ['The newcomer', 'adventurer', 'young'], ['The one who knows where the bodies are buried', 'commoner', 'old'],
    ['The moneylender', 'merchant'], ['The troublemaker', 'commoner', 'young'], ['The tax collector', 'guard'], ['The undertaker', 'religious', 'middle']];
// Roles added later: each place may swap one in under its own seed (see rollTown), so old links keep most of their people.
const TOWN_ROLES_MORE = [
    ['The town drunk, who sees more than anyone thinks', 'commoner', 'old'], ['The watch\'s best informant', 'criminal'],
    ['A pilgrim who came for a week and stayed for years', 'religious'], ['The one who runs the dice games', 'criminal'],
    ['A retired soldier with one good arm', 'guard', 'old'], ['A hedge wizard nobody takes seriously', 'magic'],
    ['The heir who does not want to inherit', 'noble', 'young'], ['The fixer who can find anything, for a price', 'criminal'],
    ['The keeper of the old songs', 'commoner', 'ancient'], ['A merchant who arrived rich and will not say how', 'merchant'],
    ['The best fighter in town, who never fights', 'adventurer'], ['A priest who lost their faith and kept the robes', 'religious'],
    ['The bookkeeper who knows what everyone earns', 'merchant'], ['A sellsword between contracts', 'adventurer'],
    ['The guard who cannot be bribed', 'guard'], ['A young scholar asking odd questions', 'magic', 'young']];
const TOWN_WANTS = [
    'Wants to get out of this town before it swallows them whole.', 'Wants a proper wedding for their child, and cannot afford one.',
    'Wants revenge on whoever burned their barn, and has a guess.', 'Wants to be on the council, and is buying votes slowly.',
    'Wants an old map translated, and does not want to say why.', 'Wants someone to find a sibling who went off adventuring.',
    'Wants to be left alone, and is not getting their wish.', 'Wants a rare herb that grows only somewhere dangerous.',
    'Wants to buy the tavern, and the owner will not sell.', 'Wants to know who has been leaving flowers on their door.',
    'Wants a debt forgiven, or the lender gone.', 'Wants to prove a ghost lives in their cellar.',
    'Wants a cure for a sickness they have told nobody about.', 'Wants their stolen dog back, and has offered more than the dog is worth.',
    'Wants the town to honor its founders properly, meaning their own great-grandparent.', 'Wants to marry above their station, and has picked someone.',
    'Wants a bodyguard for a trip they will not explain.', 'Wants the watch captain sacked, and is collecting evidence.',
    'Wants to sell a family heirloom before the family finds out.', 'Wants someone to read a letter that came sealed in black wax.',
    'Wants to open a rival tavern, and needs investors.', 'Wants to find out who poisoned their well before they try again.',
    'Wants to learn to fight, and is too embarrassed to ask.', 'Wants an apprentice, and every one so far has run off.',
    'Wants proof that their neighbor is a werewolf.', 'Wants a confession back from the temple.',
    'Wants to bury a relative in the old graveyard, which is closed.', 'Wants their name cleared of a crime they did commit.',
    'Wants to see the sea once before they die.', 'Wants a monster\'s head to hang over the fireplace, and will pay for one.'];
// Ties between two people: {a} and {b} are first names.
const TOWN_TIES = [
    '{a} owes {b} a lot of money.', '{a} and {b} are courting in secret.', '{a} and {b} are siblings who have not spoken in years.',
    '{a} is blackmailing {b}.', '{a} once saved {b}\'s life, and never lets them forget it.', '{a} wants {b}\'s house, and {b} knows it.',
    '{a} and {b} used to be partners, until the money went missing.', '{a} thinks {b} is a spy.', '{a} is teaching {b} to read, quietly.',
    '{a} and {b} play cards every night and cheat each other cheerfully.', '{a} was jilted by {b} at the altar.', '{a} is the only one {b} trusts.',
    '{a} sold {b} a cursed ring and is waiting to see what happens.', '{a} and {b} plan to leave town together, and have told nobody.',
    '{a} took the blame for something {b} did, years ago.', '{a} is writing a ballad about {b}, and it is not flattering.',
    '{a} and {b} share a secret about the night of the big fire.', '{a} is in love with {b}, who has no idea.',
    '{a} is {b}\'s landlord, and a terrible one.', '{a} keeps {b}\'s savings under a loose floorboard.',
    '{a} testified against {b} once, and {b} has not forgotten.', '{a} and {b} both want the same seat on the council.',
    '{a} once caught {b} stealing, and said nothing.', '{a} and {b} are hunting the same buried treasure.'];

const TOWN_LAWS = [
    ['No blade drawn inside the walls.', 25], ['No spellcasting in the market without a license.', 10], ['Every stranger registers with the watch on arrival.', 2],
    ['No livestock on the main street after noon.', 1], ['Curfew at the last bell for anyone without a lantern.', 1], ['No gambling except on holy days.', 5],
    ['Duels only with the lord\'s permission, and only at dawn.', 50], ['Nobody may sell bread except the bakers\' guild.', 5],
    ['All weapons longer than a forearm are peace-bonded at the gate.', 10], ['Anyone who rings the alarm bell without cause pays for the trouble.', 15],
    ['No singing in the street after dark.', 0.5], ['Dead monsters must be reported and taxed.', 5], ['No one may climb the old tower.', 20],
    ['Coins from outside the realm must be changed at the counting house.', 2], ['Masks are forbidden in public, except at festivals.', 3],
    ['No burials inside the walls.', 5], ['Every hearth fire out by the last bell.', 1], ['Every household sends someone to the walls when the alarm rings.', 10],
    ['No horse may be sold after dark.', 5], ['Raising the dead is punished by exile, and so is trying.', 100], ['Beggars must carry a license from the temple.', 0.5],
    ['Harming a swan is a crime against the crown.', 50], ['Shops close for the noon prayers.', 2], ['Anyone selling a potion must drink some first if asked.', 5],
    ['No familiars in the town hall.', 3], ['Outsiders may not own land inside the walls.', 25], ['Adventurers pay a monster tax on every return to town.', 2],
    ['No digging deeper than a tall man\'s height without the council\'s leave.', 10], ['Half of any treasure found in town belongs to the treasury.', 20],
    ['No hoods up in the market after dark.', 1]];
const TOWN_CUSTOMS = [
    'Everyone leaves a crust of bread on the doorstep on the first night of the month.', 'Strangers are offered salt at the gate and should eat it.',
    'Nobody whistles after dark.', 'A newborn\'s name is kept secret until their first birthday.', 'The last drink of the night is poured on the floor for the dead.',
    'Every door is painted the same color as the house\'s first owner\'s eyes.', 'Weddings are held at midnight, by lantern light.',
    'Nobody speaks the founder\'s name aloud.', 'Every visitor is asked for news, and lying about it is very bad luck.',
    'Debts are settled on the steps of the temple so the gods can see.', 'The whole town turns out to throw mud at the tax collector once a year, and the tax collector expects it.',
    'Children carry a pebble from the river for luck and must never lose it.',
    'Every new house has a stone from the oldest house in town built into its wall.', 'The first fruit, fish, or loaf of the season goes to the oldest person in town.',
    'Nobody says goodbye at the town gate, only "until later".', 'Mirrors are covered when there is a death in the house.',
    'Every doorstep is swept toward the street at dawn, to sweep out the bad luck.', 'Visitors buy the first round, or tell a story instead.',
    'The bell rings once for every child born, and the whole town counts.', 'A guest who has broken bread under a roof may not be harmed there, and everyone keeps to it.',
    'Arguments are settled by a singing contest, judged by the oldest grandparent in earshot.', 'Nobody sleeps on the night of the first frost: there is a bonfire and too much cider.',
    'Shoes are left outside the door, and stealing them is worse than stealing gold.', 'The dead are buried with a coin for the ferryman and a second one in case of tolls.'];

const TOWN_TROUBLES = [
    'Livestock keep vanishing from the outlying farms, and the tracks lead toward {district}.', 'The well in {district} has started bringing up warm, red water.',
    'Someone is setting fires in {district}, one a night, always at the same hour.', '{faction} and the watch are one bad night from open fighting.',
    'A sickness is spreading in {district}, and the healers do not know what it is.', 'The {leader} has gone missing, and the people closest to them are covering it up.',
    'Bandits have closed the road, and food prices have doubled.', 'A debt collector from the capital has arrived to call in the town\'s loans.',
    'Graves in the old cemetery have been dug up, but nothing taken.', 'Strangers in grey have been buying up every house in {district}.',
    'The harvest failed, and someone is hoarding grain.', 'A child claims to have seen a dragon over the hills, and the sheep agree.',
    '{faction} {faction:is|are} buying up debts all over town, and nobody knows why.', 'Every dog in town has started howling at the same spot in {district}.',
    'A traveling preacher is stirring up the crowds against {faction}.', 'The bridge in {district} is cracking, and nobody will pay to fix it.',
    'Someone is leaving coins on doorsteps in {district}, and the houses that keep them fall sick.', 'The best healer in town has stopped seeing anyone, and the door is barred from inside.',
    'A wedding between the two richest families was called off, and both sides are hiring muscle.', 'The temple\'s relic was stolen, and the priests have not told anyone yet.',
    'Rats have driven every cat out of {district}.', 'The watch arrested the wrong person, and the right one is laughing about it in the taverns.',
    'An inspector from the capital came to look at the town\'s books, and is in no hurry to leave.', 'Every well in town has tasted of salt since the last new moon.',
    'Doors in {district} are being chalked at night, a different sign on each.', '{faction} {faction:has|have} put a price on the head of someone in town, and nobody knows whose.',
    'The town granary burned, and the fire started inside.', 'A sinkhole opened in {district} overnight, and there are steps going down.'];
// Who or what is really behind the trouble (for the DM). {person}: one of the notable people.
const TOWN_TROUBLE_BEHIND = [
    '{person}, who stands to gain if the town panics.', '{faction}, testing how far the watch will bend.',
    'An old curse waking on its anniversary, which only the temple\'s records mention.', '{person}, covering up a worse mistake of their own.',
    'A creature driven out of its lair by something bigger, which is still out there.', 'The {leader}\'s own household, for reasons of its own.',
    'A rival town down the road, paying locals to make trouble.', '{faction}, who plan to step in and fix it, for a price.',
    '{person}, who is being blackmailed into it.', 'A hag, bargaining with someone in town for the thing they want most.',
    'Two people working separately, each blaming the other.', 'A small cult that meets in the cellars, and is very patient.',
    'An honest accident that someone is now using as cover.', '{person}, who believes they are doing the right thing.',
    'A doppelganger wearing the face of someone everyone trusts.', 'A debt the town took on generations ago, coming due.',
    'A ghost with a grievance, buried along with the truth.', '{faction}, on orders from someone outside town.',
    'Nobody at all: the rumors are worse than the truth, and someone is feeding them.', 'A young wizard\'s experiment gone wrong, and the wizard is too scared to confess.'];

// Market day: when, a stall worth a look, and (for a hamlet) when the peddler comes instead.
const TOWN_MARKET_DAYS = ['every seventh day', 'twice a week', 'on the first day of every month', 'every day but the holy day',
    'at every new and full moon', 'every tenth day', 'every morning until noon', 'once a season, for three loud days'];
const TOWN_MARKET_GOODS = ['cheap pots and pans', 'secondhand boots', 'candles and tallow', 'bolts of plain wool', 'hot chestnuts',
    'live chickens', 'knives sharpened while you wait', 'charms against bad luck'];
const TOWN_MARKET_BITS = ['a puppet show that mocks the {leader}', 'a fortune teller who is right far too often', 'a pie-eating contest with a sheep for a prize',
    'a stall of "genuine" dragon scales', 'pickpockets working the crowd in pairs', 'a preacher shouting from an upturned barrel',
    'a tooth-puller with a long queue and a short temper', 'a wrestling ring where anyone can try the champion for a copper',
    'an auction of lost property from the watch house', 'a herald reading out new taxes to loud booing', 'a stall of maps, most of them wrong',
    'a cage whose occupant is not what the sign says'];
const TOWN_PEDDLERS = ['every few weeks', 'in spring and autumn', 'whenever the roads are dry', 'at the turn of every month'];

// A local legend, and the truth of it (for the DM).
const TOWN_LEGENDS = [
    'the founder buried a fortune somewhere in town and left the riddle to find it on the old bell', 'a knight sleeps under the hill with an army, waiting for the town to need them',
    'the well in the square goes down to another town, and on quiet nights you can hear its market', 'a dragon once took a tithe of sheep here, and the town still leaves one out every spring, just in case',
    'there is one more street in town than any map shows, and only the lost can find it', 'a witch cursed the first lord\'s family, and no heir has lived past forty since',
    'the statue in the square moves one step every hundred years, and it is nearly at the gate', 'a hero born here will come home in the town\'s worst hour',
    'the town stands on the grave of a giant, and the hills are its knees', 'the bells will ring by themselves the night before the town falls',
    'a ghostly coach drives the high road on the longest night and stops for anyone who waves', 'the first harvest was bought from the fey with a promise nobody remembers making',
    'a unicorn once drank from the town spring, and its water has healed small hurts ever since', 'a door in the old wall opens only for someone born here at midnight',
    'the town once hanged an innocent stranger, who swore it would pay in a hundred years', 'a famous thief hid a stolen crown here and died before collecting it',
    'the crows on the town hall are the old council, still arguing', 'a mage once tried to move the whole town a mile north and only got it halfway'];
const TOWN_LEGEND_TRUTHS = [
    'It is entirely true, and nobody alive knows it.', 'There is a grain of truth in it, under a century of embroidery.',
    'It is a lie the founders spread to keep people away from something real.', 'Someone in town is quietly trying to prove it, and getting close.',
    'It is false, but a cult has started acting as if it were true.', 'It was true once. It stopped being true last year, and nobody noticed.',
    'It is true, but the wrong way round.', 'The temple keeps the real story in a locked book, and it is worse.',
    'Nobody believes it any more except the children, and they are right.', 'It is false, and whoever made it up still lives in town.'];

// Sights worth seeing (each setting adds its own).
const TOWN_SIGHTS = [
    'a clock tower that strikes thirteen at noon', 'a tree hung with hundreds of tiny bells', 'a gallows nobody has used in fifty years, kept freshly painted',
    'a wall carved with the name of every child born here', 'a crooked house the owner refuses to straighten', 'a fountain with a statue of a very surprised goat',
    'the stump of a tree struck by lightning seven times', 'an old battle stone at the edge of town, always with fresh flowers', 'a sundial that is always an hour wrong',
    'a tavern sign shot full of arrows, and proud of it', 'a mosaic in the square that shows the town on fire', 'a stone bench that stays warm in winter',
    'a shuttered tower with smoke rising from it every evening', 'a giant\'s boot made of stone outside the cobbler\'s', 'a wishing well full of coins nobody dares take',
    'a hedge maze behind the town hall, open to anyone with a day to spare'];

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
    // A newer role takes a place's slot as often as the new roles' share of the whole list.
    const more = part('people.more', () => ({ roles: townShuffle(TOWN_ROLES_MORE), swaps: Array.from({ length: 8 }, () => rand()) }));
    const moreShare = TOWN_ROLES_MORE.length / (TOWN_ROLES.length + TOWN_ROLES_MORE.length);
    const roles = part('people', () => townShuffle(TOWN_ROLES)).slice(0, z.people).map((r, k) => more.swaps[k] < moreShare ? more.roles[k] : r);
    t.people = roles.map(([role, cat, age], k) => {
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
        const types = SHOP_TYPE_FIRST.filter(k => k !== 'docks' || ['river', 'coast', 'marsh'].includes(setting));
        const n = townRange(z.shops);
        // The setting's favorites first, then a shuffled deck of the rest; a hamlet has only a general store.
        const order = size === 'hamlet' ? ['general'] : townShuffle(s.shops.filter(k => types.includes(k))).slice(0, 2)
            .concat(townShuffle(types.filter(k => !s.shops.includes(k))));
        return order.slice(0, n).map((type, k) => ({ seed: sub('shop.' + k), type, wealth: townWeighted(wl.shop), district: Math.floor(rand() * nd) }));
    });
    // The newer shop types (E8; not the taproom, a town has its taverns): past the setting's favorites,
    // each shop may give way to one, by share, under its own seed.
    if (size !== 'hamlet') part('shops.more', () => {
        const more = SHOP_TYPE_MORE.filter(k => k !== 'tavern'), share = more.length / (SHOP_TYPE_FIRST.length + more.length);
        t.shops.forEach(sh => {
            const swap = rand() < share, pick = townShuffle(more.filter(m => !t.shops.some(o => o.type === m)))[0];
            if (swap && pick && !s.shops.includes(sh.type)) sh.type = pick;
        });
    });

    // Never fewer buildings than the ones described.
    t.buildings.forEach(b => {
        if (b[0] === 'Taverns and inns') b[1] = Math.max(b[1], t.taverns.length);
        if (b[0] === 'Shops and stalls') b[1] = Math.max(b[1], t.shops.length);
    });

    t.laws = part('laws', () => townShuffle(TOWN_LAWS).slice(0, 2).map(([text, fine]) => ({ text, fine: fine * (wealth === 'prosperous' ? 2 : 1) })));
    t.customs = part('customs.' + setting, () => townShuffle(TOWN_CUSTOMS.concat(s.customs)).slice(0, 2));
    t.trouble = part('trouble', () => ({ text: townPick(TOWN_TROUBLES), district: rand(), faction: rand() }));
    // Drawn after the rest: sometimes a trouble only this kind of place has, and who is behind it.
    const tm = part('trouble.more', () => ({ local: rand(), pick: rand(), behind: townPick(TOWN_TROUBLE_BEHIND), person: rand() }));
    if (tm.local < 0.3) t.trouble.text = s.troubles[Math.floor(tm.pick * s.troubles.length)];
    t.trouble.behind = tm.behind;
    t.trouble.person = tm.person;
    // Market day draws (the goods follow the setting), the legend, and the sights (the first ones stay when the size changes).
    t.market = part('market', () => ({ day: townPick(TOWN_MARKET_DAYS), good: rand(), other: townPick(TOWN_MARKET_GOODS), bit: townPick(TOWN_MARKET_BITS), peddler: townPick(TOWN_PEDDLERS) }));
    t.legend = part('legend', () => ({ tale: townPick(TOWN_LEGENDS), truth: townPick(TOWN_LEGEND_TRUTHS) }));
    t.sights = part('sights.' + setting, () => townShuffle(TOWN_SIGHTS.concat(s.sights)).slice(0, 3))
        .slice(0, size === 'hamlet' ? 1 : townSizeAtLeast(size, 'city') ? 3 : 2);
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
    const name = r => ruleWord('race', TOWN_RACE_PLURALS[r] || r);
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

// Who is behind the trouble (DM-only); {person} is one of the notable people, by name and role.
function townBehindText(t, ctx) {
    const p = t.people[Math.floor(t.trouble.person * t.people.length)];
    const who = `${p.npc.name} (${p.role.charAt(0).toLowerCase() + p.role.slice(1)})`;
    return facCap(townFill(t.trouble.behind.replace(/\{person\}/g, who), t, ctx, t.trouble.faction, t.trouble.district));
}

function townMarketText(t, ctx) {
    const m = t.market, s = TOWN_SETTINGS[t.setting];
    const good = s.goods[Math.floor(m.good * s.goods.length)];
    if (t.size === 'hamlet') return `No market here. A peddler's cart comes through ${m.peddler}, with ${good} and ${m.other}.`;
    const d = t.districts.find(x => x.key === 'market' || x.key === 'green');
    return `${facCap(m.day)}, in ${d ? d.name : 'the main square'}. Stalls sell ${good} and ${m.other}; look out for ${townFill(m.bit, t, ctx)}.`;
}

function townSightsText(t) {
    return facCap(townList(t.sights)) + '.';
}

// Market day, sights, and the local legend as [label, text] pairs; 'The truth' is for the DM.
function townMoreLines(t, ctx) {
    return [
        ['Market day', townMarketText(t, ctx)],
        [t.sights.length === 1 ? 'Worth seeing' : 'Sights', townSightsText(t)],
        ['Legend', `They say ${t.legend.tale}.`],
        ['The truth', t.legend.truth]
    ];
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
    out.push('', `Trouble: ${townTroubleText(t, ctx)}`, `Behind it: ${townBehindText(t, ctx)}`, '');
    townMoreLines(t, ctx).forEach(([k, v]) => out.push(`${k}: ${v}`));
    const idx = townRumorIndexes(t, rumors);
    if (idx.length) {
        out.push('Rumors:');
        idx.forEach(i => out.push(`  "${rumors[i].text}"`));
    }
    const q = townQuest(t);
    out.push('', `Quest: ${q.title}. ${q.task} (Ask ${q.giver.name}.)`);
    return out.join('\n');
}
