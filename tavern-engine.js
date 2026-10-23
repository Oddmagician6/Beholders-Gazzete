/* ============================================
   TAVERN ENGINE (F26): a whole tavern or inn for the DM Toolbox.
   A quality tier (the SRD 5.1 lifestyle names) and a kind of place (coaching inn,
   dockside tavern, dwarven alehall…) with where it stands, an owner, staff, and a
   few regulars who know each other (rollNPC from npc-data.js), a sign
   (rollShopName('tavern') from names-data.js) and what it looks like, a history,
   a menu and rooms, a quirk, a house rule, a game, tonight, and trouble brewing.
   Prices: the SRD 5.1 Food, Drink, and Lodging table where it has the item
   (tagged src 'SRD'); house dishes and drinks are priced from the tier's SRD meal
   cost (tagged 'house'). Amounts are in gp; show them with formatCoins() (coins.js).
   The rumor is not rolled here: the Toolbox deals it from the rumor deck (rumor-deck.js).
   Each part rolls from deriveSeed(seed, part), so a new quality changes only the
   kind, menu, rooms, and stakes, never the owner, the sign, the staff, or the regulars.
   ============================================ */

// SRD 5.1: meals and an inn stay, per day, for each lifestyle.
const TAVERN_TIERS = {
    squalid:      { label: 'Squalid',      icon: '🪳', weight: 1,   meal: 0.03, stay: 0.07, ale: 0.02, room: 'A blanket on the common-room floor' },
    poor:         { label: 'Poor',         icon: '🕯️', weight: 3,   meal: 0.06, stay: 0.1,  ale: 0.03, room: 'A cot in the shared loft' },
    modest:       { label: 'Modest',       icon: '🍺', weight: 5,   meal: 0.3,  stay: 0.5,  ale: 0.04, room: 'A private room' },
    comfortable:  { label: 'Comfortable',  icon: '🔥', weight: 3,   meal: 0.5,  stay: 0.8,  ale: 0.06, room: 'A private room with its own hearth' },
    wealthy:      { label: 'Wealthy',      icon: '🍷', weight: 1.5, meal: 0.8,  stay: 2,    ale: 0.1,  room: 'A suite with a feather bed' },
    aristocratic: { label: 'Aristocratic', icon: '👑', weight: 0.5, meal: 2,    stay: 4,    ale: 0.2,  room: 'The finest suite, with a servant on call' }
};
const TAVERN_TIER_KEYS = Object.keys(TAVERN_TIERS);

// SRD 5.1 Food, Drink, and Lodging items (gp). from/to: the tiers that sell it.
const TAVERN_SRD_ITEMS = [
    { name: 'Ale, by the mug', gp: 0.04, kind: 'drink', from: 'squalid', to: 'comfortable' },
    { name: 'Ale, by the gallon', gp: 0.2, kind: 'drink', from: 'poor', to: 'comfortable' },
    { name: 'Wine, common (pitcher)', gp: 0.2, kind: 'drink', from: 'poor', to: 'wealthy' },
    { name: 'Wine, fine (bottle)', gp: 10, kind: 'drink', from: 'comfortable', to: 'aristocratic' },
    { name: 'Bread, a loaf', gp: 0.02, kind: 'food', from: 'squalid', to: 'modest' },
    { name: 'Cheese, a hunk', gp: 0.1, kind: 'food', from: 'poor', to: 'comfortable' },
    { name: 'Meat, a chunk', gp: 0.3, kind: 'food', from: 'poor', to: 'wealthy' },
    { name: 'Banquet (per person)', gp: 10, kind: 'food', from: 'wealthy', to: 'aristocratic' }
];
const TAVERN_STABLING = 0.5;   // SRD 5.1: stabling, per day

// What kind of place it is. tiers: [lowest, highest] tier index it can be.
// where: where it stands. dish/drink: what it's known for (a house item on the menu).
const TAVERN_KINDS = [
    { label: 'tavern & inn', weight: 6, tiers: [0, 5], where: ['on the main street, between the smithy and the temple', 'on the market square',
        'at the edge of town, where the road comes in', 'on a quiet lane off the square', 'by the old well in the middle of the village',
        'across the street from its bitter rival', 'at the foot of the castle hill', 'next to the town gallows (business is good on hanging days)'] },
    { label: 'roadside inn', weight: 3, tiers: [0, 3], where: ['on the king\'s road, a day from the nearest town', 'at a crossroads two days from anywhere',
        'where the road fords the river', 'at the top of a long, hard climb', 'beside a milestone nobody can read', 'on the edge of a dark wood'],
        dish: 'The traveler\'s plate (whatever is left)', drink: 'Road-dust ale' },
    { label: 'coaching inn', weight: 2, tiers: [2, 4], where: ['on the coach road, where the teams change horses', 'at the last stop before the mountain pass',
        'just outside the city\'s east gate', 'at the halfway house between two cities that hate each other'],
        dish: 'Coachman\'s pie (eaten standing up)', drink: 'Stirrup cup, for the road' },
    { label: 'dockside tavern', weight: 3, tiers: [0, 3], where: ['on the docks, close enough to hear the hulls creak', 'under the harbor wall',
        'at the end of a pier that sways in a high tide', 'in a warehouse on the fish market', 'by the lighthouse, where the pilots drink'],
        dish: 'Fisherman\'s chowder', drink: 'Bilge rum' },
    { label: 'alehouse', weight: 2, tiers: [0, 2], where: ['down an alley behind the tannery', 'in the cellar of a burned-out guildhall',
        'by the cattle market', 'under the arches of the old aqueduct', 'next to the barracks'] },
    { label: 'flophouse', weight: 2, tiers: [0, 1], where: ['in the worst street in the city', 'under the bridge, more or less',
        'behind the knacker\'s yard', 'in the rookeries, five floors up a ladder'], dish: 'Bowl of whatever (ladled, not served)' },
    { label: 'brewhouse', weight: 2, tiers: [2, 4], where: ['next to its own brewery, which you can smell from the road', 'beside a watermill on the river',
        'among the hop fields outside town'], drink: 'The house brew, straight from the vat' },
    { label: 'mountain lodge', weight: 1.5, tiers: [1, 4], where: ['high on the pass, snowed in half the year', 'in the pines above a mining camp',
        'by a frozen lake under the peaks'], dish: 'Goat stew with dumplings', drink: 'Hot spiced wine' },
    { label: 'gambling hall', weight: 1.5, tiers: [2, 5], where: ['in the merchants\' quarter', 'above a moneylender\'s shop',
        'on an old barge moored on the river', 'in a mansion that lost a bet'], drink: 'The lucky shot (free when you win)' },
    { label: 'festhall', weight: 1.5, tiers: [4, 5], where: ['in the noble quarter, behind a garden wall', 'on the grand square, facing the palace',
        'in a former opera house'], dish: 'Sugared everything, on silver' },
    { label: 'temple hostel', weight: 1, tiers: [1, 3], where: ['in the shadow of a temple, run by its lay brothers', 'beside a wayside shrine',
        'on the pilgrim road, a day short of the holy site'], drink: 'Monks\' ale (blessed, allegedly)' },
    { label: 'riverboat inn', weight: 1, tiers: [1, 4], where: ['on a barge tied up at the town quay, drifting a little', 'on a paddle boat that never leaves the jetty'],
        dish: 'River trout, caught off the back', drink: 'River-cooled cider' },
    { label: 'dwarven alehall', weight: 1.5, tiers: [1, 4], where: ['carved into the hillside', 'under the mountain, by the old mine gate',
        'in a stone hall at the end of Hammer Street'], dish: 'Stonebread and mushroom stew', drink: 'Dwarven stout, by the stein' },
    { label: 'halfling burrow-inn', weight: 1, tiers: [2, 4], where: ['dug into a green hill at the edge of the farmlands', 'under an orchard by the mill pond'],
        dish: 'Second breakfast (served all day)', drink: 'Burrow cider' },
    { label: 'woodland lodge', weight: 1, tiers: [1, 4], where: ['in a clearing deep in the forest, built around a living oak', 'by a ranger post on the old forest road'],
        dish: 'Venison and wild mushrooms', drink: 'Elderflower wine' },
    { label: 'cellar bar', weight: 1, tiers: [1, 4], where: ['under a respectable bookshop', 'below the city, down forty steps', 'beneath a tailor\'s shop (knock twice)'],
        drink: 'The cellar\'s own gin' }
];

// House dishes by tier (original). A plate costs about a third of the tier's daily meals.
const TAVERN_DISHES = {
    squalid: ['Gruel of the day (same as yesterday)', 'Rat on a stick (the cook insists it is squirrel)', 'Boiled turnip, whole',
        'Yesterday\'s crusts, soaked in drippings', 'Mystery stew (do not ask)', 'Pickled eggs of uncertain age', 'Fried fish heads',
        'Pottage that has been on the fire since spring', 'A heel of bread and a hard look', 'Pigeon pie, mostly crust', 'Cold tripe in vinegar'],
    poor: ['Pease porridge', 'Mutton stew with barley', 'Black bread and dripping', 'Fried river eel', 'Cabbage soup with a ham bone',
        'Oatcakes and onion', 'Blood sausage and mash', 'Leek and potato pottage', 'Bubble and squeak', 'Brawn on toast', 'Lentil and bacon broth',
        'Fried herring and onions'],
    modest: ['Shepherd\'s pie', 'Roast chicken with leeks', 'Venison stew', 'Cheese and onion pasty', 'Trout fried in butter',
        'Pork chop with stewed apples', 'Mushroom and barley soup', 'Rabbit pie', 'Sausages and mustard', 'Owlbear chili (mostly bear)',
        'Toad-in-the-hole (no toads, the cook swears)', 'Cottage loaf with ham and pickle', 'Lamb hotpot', 'Pea and ham soup'],
    comfortable: ['Honey-glazed ham', 'Spiced lamb skewers', 'Duck with cherries', 'Beef and ale pie', 'Smoked salmon on rye',
        'Wild boar ribs', 'Apple tart with fresh cream', 'Roast goose with chestnuts', 'Dwarven forge-baked flatbread',
        'Pheasant and bacon pie', 'Mussels in cider', 'Treacle sponge with custard'],
    wealthy: ['Roast pheasant in plum sauce', 'Saffron rice with river prawns', 'Venison loin with juniper', 'Wyvern-egg custard',
        'Truffle-stuffed quail', 'Elven honey cakes', 'Lobster in garlic butter', 'Candied pears in spiced wine',
        'Oysters on crushed ice', 'Sturgeon in cream and dill', 'Rose-petal jelly'],
    aristocratic: ['Roc-egg omelette for the table', 'Peacock served in its feathers', 'Moonfruit sorbet from the elven isles',
        'Griffon-shank braised for a day', 'Gold-leaf marzipan swans', 'Seven-course tasting of the realm', 'Dragon pepper beef (fireproof plates)',
        'Swan stuffed with goose stuffed with quail', 'Kraken carpaccio', 'Snow from the highest peak, flavored with honey']
};

// Composed house dishes: "{prep} {main} with {side}" or "{Main} {form}", by tier band.
const TAVERN_COOKING = {
    low: { preps: ['Boiled', 'Fried', 'Stewed', 'Salted', 'Smoked', 'Burnt', 'Pickled', 'Day-old'],
        mains: ['turnip', 'eel', 'mutton', 'pigeon', 'herring', 'goat', 'cabbage', 'pig\'s trotter', 'carp', 'swede'],
        forms: ['pottage', 'broth', 'pie', 'hash', 'stew', 'dumplings'],
        sides: ['black bread', 'onions', 'dripping', 'a heel of cheese', 'pease', 'nothing (ask for bread)', 'gravy of a sort', 'mustard'] },
    mid: { preps: ['Roast', 'Braised', 'Pan-fried', 'Spit-roasted', 'Hot-smoked', 'Herb-crusted', 'Ale-braised', 'Slow-cooked', 'Grilled'],
        mains: ['pork', 'chicken', 'trout', 'lamb', 'venison', 'rabbit', 'beef', 'duck', 'boar', 'pike', 'goose', 'ham'],
        forms: ['pie', 'stew', 'pasty', 'skewers', 'soup', 'hash', 'sausages', 'pudding', 'hotpot', 'cobbler'],
        sides: ['leeks', 'mash', 'roast roots', 'buttered greens', 'apple sauce', 'fresh bread', 'mushrooms', 'barley', 'pickled cabbage', 'onion gravy'] },
    high: { preps: ['Glazed', 'Saffron-poached', 'Truffled', 'Wine-braised', 'Honey-roasted', 'Spiced', 'Flamed', 'Butter-poached', 'Smoked'],
        mains: ['pheasant', 'quail', 'sturgeon', 'veal', 'swan', 'lobster', 'griffon shank', 'wyvern tail', 'venison', 'langoustine'],
        forms: ['terrine', 'pie', 'consommé', 'tartlets', 'roulade', 'fricassee'],
        sides: ['candied figs', 'pearl onions', 'wild rice', 'a cream sauce', 'black truffle', 'spiced pears', 'elven greens', 'gold leaf (decorative, edible, pointless)'] }
};
const TAVERN_BAND = { squalid: 'low', poor: 'low', modest: 'mid', comfortable: 'mid', wealthy: 'high', aristocratic: 'high' };

// House drinks by tier (original). Priced off the tier's mug of ale.
const TAVERN_DRINKS = {
    squalid: ['Bilgewater Brown', 'Gutrot (a clear liquid)', 'Tuesday\'s Ale', 'Puddle Porter', 'Barrel-bottom bitter', 'Swamp gin (it is green)',
        'Rain-barrel beer', 'Mule sweat (a cider)', 'Ditch rum'],
    poor: ['Turnip moonshine', 'Small beer', 'Sour cider', 'Mule-Kick Mead', 'Watered wine', 'Nettle beer', 'Dandelion wine', 'Perry from the hedge pears', 'Old Stinker (a brown ale)'],
    modest: ['Dwarven stout', 'Halfling harvest cider', 'Honey mead', 'Red ale on tap', 'Hot mulled cider', 'Blackberry wine', 'Orcish smoked porter',
        'Ginger beer with a kick', 'Heather ale', 'Buttered rum'],
    comfortable: ['Barrel-aged dark ale', 'Spiced winter wine', 'Elderflower mead', 'Gnomish fizzy lager', 'Plum brandy', 'Halfling pipeweed ale', 'Mountain cherry cordial',
        'Sloe gin', 'Hot chocolate with brandy', 'Damson wine'],
    wealthy: ['Elven summerwine', 'Dwarven fire whiskey', 'Chilled pear brandy', 'Imported sparkling wine', 'Honeyed tea with a shot of something', 'Desert date wine',
        'Peat-smoked island whisky', 'Iced mint julep (the ice is magic)', 'Black rum from the southern isles'],
    aristocratic: ['Hundred-year elven vintage', 'Liquid starlight (a cordial)', 'Celestial mead, by the thimble', 'Wine older than the city', 'Frost giant ice wine', 'Phoenix-ember brandy (served warm)',
        'Dragon\'s-hoard port (it has a gold coin in it)', 'Fey wine (do not accept a second glass)']
};

// The owner's own brew: "Brakka's Black Stout".
const TAVERN_BREW_ADJ = ['Black', 'Old', 'Strong', 'Golden', 'Dark', 'Smoky', 'Winter', 'Harvest', 'Mild', 'Red', 'Pale', 'Cellar',
    'Sleepy', 'Angry', 'Lucky', 'Famous', 'Infamous', 'Secret', 'Notorious', 'Special', 'Stubborn', 'Midnight', 'Honest', 'Wicked'];
const TAVERN_BREW_STYLES = {
    low: ['Ale', 'Bitter', 'Brown', 'Scrumpy', 'Rotgut', 'Small Beer', 'Gin'],
    mid: ['Stout', 'Porter', 'Red Ale', 'Mead', 'Cider', 'Lager', 'Bitter', 'Perry', 'Wheat Beer'],
    high: ['Brandy', 'Reserve', 'Vintage', 'Cordial', 'Single-Cask Whiskey', 'Ice Wine', 'Mead']
};

// A stay or a plate for "about" a price: ±25%, rounded to the copper.
function tavernPrice(gp) {
    return Math.max(0.01, Math.round(gp * (0.75 + rand() * 0.5) * 100) / 100);
}

function pickSome(list, count) {
    const pool = list.slice();
    const out = [];
    while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return out;
}

function tavernWeighted(list) {
    let r = rand() * list.reduce((s, x) => s + x.weight, 0);
    return list.find(x => (r -= x.weight) <= 0) || list[list.length - 1];
}

const tavernCap = s => s.charAt(0).toUpperCase() + s.slice(1);
const tavernPossessive = n => n + (/s$/i.test(n) ? '\'' : '\'s');

// A composed dish. Always draws the same amount, so the stream doesn't shift.
function tavernDish(band) {
    const c = TAVERN_COOKING[band];
    const prep = randomArray(c.preps), main = randomArray(c.mains), form = randomArray(c.forms), side = randomArray(c.sides);
    return rand() < 0.6 ? `${prep} ${main} with ${side}` : `${tavernCap(main)} ${form}`;
}

const TAVERN_QUIRKS = [
    'A stuffed owlbear stands by the door. Patrons tip it on the way out, for luck.',
    'Every mug is a different shape, and regulars have their own. Taking someone else\'s mug starts fights.',
    'The bard has played the same song for three years and refuses to learn another.',
    'The floor slopes so badly that dice always roll toward the bar.',
    'A ghost sits in the corner booth. It pays its tab in old coins.',
    'The house cat is a retired familiar and still understands Common. It reports to the owner.',
    'Swearing costs a copper, paid into a jar. The jar is nearly full.',
    'The cellar door is chained shut, and nobody who works here will say why.',
    'A wall of wanted posters, half of them for people drinking here tonight.',
    'Every table has a carved board for a dice game that only the locals understand.',
    'The fire never goes out. Nobody has fed it in years.',
    'A sign over the bar: "No spells. No exceptions. Yes, that one too."',
    'Drinks arrive on a dumbwaiter pulled by a very tired goblin.',
    'Adventurers who die owing a tab get their names on a plaque. It is a large plaque.',
    'The owner keeps a mimic as a coat rack and thinks it is funny.',
    'There is a bell at the bar. Ringing it buys the whole room a round.',
    'The windows show the weather from somewhere else.',
    'Patrons write their troubles on slips of paper and drop them in the hearth. Some come back answered.',
    'Arm-wrestling settles every argument here, including the bill.',
    'A parrot behind the bar repeats secrets it overheard, loudly, at random.',
    'The stew pot has not been emptied since the place opened. It is "seasoned."',
    'The stairs creak in a tune. Sneaking up them is a DC 15 Dexterity (Stealth) check.',
    'The tavern sits on a crossroads shrine, and travelers leave offerings on the bar.',
    'Every hour the barkeep shouts "Last orders!" and nothing happens.',
    'A notice board covered in job offers, most of them for rat catchers.',
    'Halfway through the night the whole room stops to sing the same sad song.',
    'Weapons are checked at the door and hung on pegs. One peg has held the same sword for twenty years.',
    'The tables are old ship hatches, and the place smells faintly of the sea though it is miles inland.',
    'The owner\'s grandmother sits by the fire and grades every story told in the room.',
    'There is a booth reserved for "the Duke." Nobody has ever seen the Duke.',
    'The bar is one long dragon rib. The owner says they found it. Nobody believes "found."',
    'A one-eyed dog sleeps under the stairs and growls at anyone who is lying.',
    'Payment is accepted in coin, trade, or a good song, at the barkeep\'s whim.',
    'A trapdoor behind the bar opens onto an old smugglers\' tunnel. The watch pretends not to know.',
    'The menu is written on the wall in chalk, and the prices change when the owner is in a mood.',
    'Gnomish clockwork taps pour the ale. One of them pours only on the third try.',
    'The previous owner is buried under the hearthstone, at their own request.',
    'Every drink comes with a free fortune, written by the cook. The fortunes are threats.',
    'A rowboat hangs from the ceiling, and someone sleeps in it most nights.',
    'Whoever starts a fight here cleans up after it, under supervision.',
    'There is no menu. The cook brings what the cook feels you need.',
    'A tame raven steals shiny things and keeps them in a nest above the bar. The nest is worth a fortune.',
    'Every chair is from a different place. One of them is clearly a throne, and nobody sits in it.',
    'A goat lives here. It has the run of the place and a better room than most guests.',
    'The walls are covered in the signatures of famous patrons. Several are obvious forgeries.',
    'A barrel by the door is labeled "DO NOT OPEN." It is warm to the touch.',
    'The roof leaks in one spot, always onto the same table, even when it isn\'t raining.',
    'There is a well in the middle of the floor. Coins tossed in never make a sound.',
    'The owner refuses to serve anyone wearing a hat, and will not say why.',
    'A suit of armor stands by the hearth. Every morning it has moved a little closer to the door.',
    'Every lost item left here goes into a big chest by the bar. Some of them are cursed.',
    'The kitchen is run by three sisters who communicate only by banging pots.',
    'Every table has a little bell. Ring it and someone comes, eventually, annoyed.',
    'A map of the region covers one wall, corrected in pencil by every traveler who disagreed with it.',
    'The privy is a portable hole someone nailed to a wall. Nobody asks where it goes.',
    'The tavern\'s clock runs backward, and the regulars set their days by it anyway.',
    'There is a free bowl of nuts on the bar. The nuts are older than the barkeep.',
    'The tavern is officially a temple, for tax reasons. The barkeep wears vestments.',
    'Ale is served in hollowed-out horns, and the horns can\'t be set down until they are empty.',
    'The innkeeper keeps a ledger of every guest who ever stayed, going back two hundred years.',
    'The hearth is guarded by a salamander in a cage. It is the only thing that can light the fire.',
    'A message board for lost pets, lost loves, and one lost army.',
    'Stools at the bar are bolted to the floor, after an incident.',
    'One room upstairs has no door, only a painted outline of one.',
    'A dragon\'s tooth hangs over the bar, and every so often it hums.'
];

const TAVERN_SCENES = {
    look: ['Low beams hung with dried herbs and old horseshoes', 'Smoke-black rafters and a fire big enough to roast an ox',
        'Long trestle tables scarred with carved initials', 'Rush-covered floors and cracked leaded windows',
        'Brass lamps, polished wood, and a mural of a famous battle', 'A cramped room with mismatched stools and one good chair',
        'A two-story hall with a gallery running round the top', 'Booths of dark oak, each with a curtain for privacy',
        'Whitewashed walls covered in charcoal drawings by patrons', 'A sunken room down three steps, warm and close',
        'Ship\'s timbers for beams and a figurehead over the bar', 'A round room around a central hearth, with a smoke hole in the roof',
        'Stone walls sweating in the damp and barrels for tables', 'Red velvet, gilt mirrors, and a carpet that has seen things',
        'A long narrow room, the bar running the whole length of it', 'Bare floorboards, a sawdust floor, and a dartboard full of knives',
        'Antlers on every wall and a bearskin rug with a surprised face', 'A courtyard with a covered gallery and tables under the vines',
        'Hanging copper pots, tile floors, and a kitchen open to the room', 'A low cave-like room with lanterns set in niches in the rock',
        'Painted shields of old regiments hanging from every beam', 'Tall windows, white linen, and waiters who look down on everyone',
        'A crooked room where nothing is square and the floor rises toward the back', 'A half-finished extension, still open to the sky on one side'],
    light: ['a fire that throws long shadows', 'a single smoky lantern', 'a wheel of candles hung from the ceiling', 'fat tallow candles stuck in bottles',
        'brass oil lamps polished to a shine', 'a crystal chandelier with half its candles out', 'glowing mushrooms in jars (the cook grows them)',
        'a continual flame in a cracked glass globe', 'the light from the street through dirty windows', 'rushlights that smoke more than they shine',
        'fairy lights strung across the beams', 'the red glow of the cooking fire', 'lanterns made from old helmets'],
    sound: ['a fiddle and a lot of stamping', 'a dice game getting loud in the corner', 'quiet talk and the crackle of the fire',
        'a drinking song with several competing versions of the words', 'the barkeep arguing with a delivery dwarf',
        'a lute badly in need of tuning', 'laughter from a card table every few minutes', 'rain on the roof and a snoring patron',
        'a hurdy-gurdy and a singer who is not quite on it', 'pots crashing in the kitchen and someone cursing in Dwarvish', 'a heated argument about politics',
        'a lone piper by the fire', 'knives thudding into a board', 'someone weeping into their ale and a friend telling them to stop',
        'a crowd counting along with a drinking contest', 'chickens, somewhere, indoors', 'the slow creak of a sign outside in the wind',
        'whispers that stop when you walk in', 'a choir of off-duty soldiers', 'the clatter of plates and a cook shouting orders'],
    smell: ['woodsmoke and roasting meat', 'spilled ale and wet dog', 'fresh bread and pipe smoke', 'cloves and mulled wine',
        'fried onions and something burning', 'pine resin and old leather', 'tallow candles and boiled cabbage', 'beeswax and a hint of the stables',
        'fish, tar, and salt', 'sour milk and sawdust', 'cinnamon and baking apples', 'damp stone and mushrooms', 'cheap perfume and expensive cigars',
        'hops from the brewery next door', 'garlic, a great deal of garlic', 'peat smoke and wet wool', 'lavender, laid on thick to hide something else',
        'roasting chestnuts and orange peel', 'horses, mostly'],
    crowd: ['Nearly empty tonight', 'A handful of drinkers tonight', 'About half full tonight', 'Busy tonight', 'Packed to the walls tonight',
        'Quiet, but every table is taken', 'Full of strangers tonight, which the regulars don\'t like']
};

// The sign out front: "{board} {state}".
const TAVERN_SIGN_BOARDS = ['A painted board', 'A carved wooden sign', 'A wrought-iron sign', 'A real barrel', 'A ship\'s figurehead',
    'A painted shield', 'A brass plaque', 'A wooden cutout of the name', 'A wagon wheel with the name burned into it', 'A giant wooden tankard',
    'An old door with the name carved in it', 'A stuffed fish with the name painted on its side'];
const TAVERN_SIGN_STATES = ['swinging on one chain', 'freshly repainted', 'so faded the name is a guess', 'with one letter fallen off',
    'shot through with crossbow bolts', 'that creaks in any wind', 'nailed over an older sign with a different name', 'gilded, recently, at great expense',
    'hanging upside down (nobody has fixed it)', 'with a misspelling the owner defends', 'with a smaller sign under it: "No Bards"',
    'lit by a lantern all night', 'scorched along one edge', 'with a crow that sits on it every evening'];

// History: "Built {when} as {former}. {event}"
const TAVERN_HISTORY_WHEN = ['a century ago', 'in the old king\'s day', 'forty years ago', 'before the city walls went up', 'three owners ago',
    'after the last war', 'by the founder of the town', 'two hundred years ago', 'in a single summer', 'on the ruins of something older'];
const TAVERN_HISTORY_FORMER = ['a toll house', 'a temple to a forgotten god', 'a watermill', 'a guard post', 'a smugglers\' warehouse',
    'a wizard\'s tower (the top floors are still locked)', 'a hunting lodge for a dead king', 'a courthouse', 'a stable', 'a ship, dragged ashore',
    'a dwarven waystation', 'a bathhouse', 'a school', 'a monastery', 'a jail (some rooms still lock from outside)', 'a gatehouse', 'a granary',
    'a duelling hall', 'a counting house', 'a tavern, the same as now'];
const TAVERN_HISTORY_EVENTS = [
    'It has burned down twice and been rebuilt crooked both times.', 'The current owner won it in a card game.',
    'A famous adventuring party was founded at the corner table. Most of them are dead now.',
    'A duel was fought on the bar. The loser\'s sword is still stuck in a beam.', 'It was closed for a year after the plague and still smells of vinegar.',
    'A king once slept here, and the room is kept exactly as he left it.', 'It changed hands six times in one year. Nobody will say why.',
    'The old owner vanished one night, and the new owner arrived the next morning with the deed.',
    'A flood once filled the cellar, and the barrels that floated away are still turning up.', 'It was a rebel meeting place in the last war, and the watch still remembers.',
    'A dragon landed on the roof once. The roof has a new shape now.', 'The first ale brewed here is said to be still in a sealed cask in the cellar.',
    'It has been in the same family for five generations, and they never let anyone forget it.', 'A treaty was signed at the long table, then torn up at the same table a year later.',
    'Nothing interesting has ever happened here, which the owner hopes to keep that way.'];

// Staff beyond the owner. A [male, female, other] role picks by gender.
const TAVERN_STAFF_ROLES = ['Cook', ['Barman', 'Barmaid', 'Barkeep'], 'Serving hand', 'Bouncer', 'Stable hand', ['Pot boy', 'Pot girl', 'Pot hand'],
    'Chambermaid', 'Night porter', 'Brewer', 'Dishwasher', 'Fiddler (paid in ale)', 'Bookkeeper', 'Errand runner', 'Cellarer'];
const TAVERN_STAFF_NOTES = ['is saving up to leave and tells everyone', 'is secretly {owner}\'s {kin}', 'skims a little from the till every night',
    'is sweet on {regular}, and everyone can tell', 'used to be an adventurer and won\'t talk about it', 'knows every secret in the building',
    'is the only one who can work the old oven', 'waters the ale when {owner} isn\'t looking', 'is new and terrified of {owner}',
    'sells information on the side, a silver a whisper', 'sings while working, beautifully, and hates being asked to', 'is wanted in another city under another name',
    'has been here longer than {owner} and acts like it', 'keeps a cudgel under the bar and a softer heart than it suggests', 'spits in the drinks of rude customers',
    'is writing a book about the regulars', 'feeds the stray dogs out back with the leftovers', 'has a bad feeling about {regular}',
    'is a terrible cook and the only one here', 'is trying to buy the place from {owner}'];

// Where each regular sits, and how they know each other ({other} is another regular, {owner} the owner).
const TAVERN_HABITS = [
    'always at the end of the bar', 'in the corner booth, back to the wall', 'by the fire, boots off',
    'at the dice table, losing', 'on the same stool every night since it opened', 'near the door, watching who comes in',
    'holding court at the long table', 'nursing one drink all night', 'helping behind the bar when it gets busy',
    'asleep by the hearth more often than not', 'at the window, waiting for someone', 'telling the same story to anyone new',
    'playing chess against anyone, and winning', 'sketching the other patrons', 'arguing politics with the cook',
    'feeding scraps to the house cat', 'writing letters they never send', 'buying drinks for strangers, for reasons',
    'at a table for two, with nobody in the other chair', 'under the stairs with a pipe', 'darning socks and listening to everything',
    'reading the same battered book', 'at the bar, explaining the news to whoever will listen', 'in the snug with the curtain drawn',
    'challenging newcomers to arm-wrestle', 'humming along with the music, a beat behind', 'counting coins into neat stacks',
    'out back with the horses half the night', 'at the dartboard, never missing', 'in the best chair, which nobody else may use'
];
const TAVERN_TIES = ['owes {owner} a year of drinks', 'is courting {other}, badly', 'won\'t sit anywhere near {other}',
    'is {other}\'s {kin}, though they pretend otherwise', 'lost a bet to {other} and is still paying it off', 'is the only one {owner} lets run a tab',
    'shares a secret with {other} that would end them both', 'thinks {other} is a spy (they might be right)', 'used to own this place, before {owner}',
    'plays cards with {other} every night and has never won', 'came in with {other} years ago, and they haven\'t spoken since',
    'is trying to set {owner} up with someone', 'saved {other}\'s life once and mentions it often', 'is quietly in love with {owner}',
    'was banned once and came back the next day as if nothing happened', 'sold {other} a horse that died the next day'];

const TAVERN_TONIGHT = [
    'A traveling bard is taking requests, and is bad at all of them.',
    'An arm-wrestling tournament. The champion is a halfling, somehow.',
    'A wedding party has taken over half the room and is buying rounds.',
    'Nothing special. Just the regulars, the fire, and the rain.',
    'A merchant caravan just arrived, and every room is nearly full.',
    'A storyteller is telling the tale of a local hero, who is sitting right there correcting her.',
    'The city watch is off duty and drinking, which makes the smugglers nervous.',
    'A darts match against the tavern across the street. Losers pay for the windows.',
    'A dwarf is challenging all comers to out-drink him. Three are already under the table.',
    'A mysterious stranger in the corner has been nursing one drink since noon.',
    'Pie night: every pie on the menu is half price, and every pie is the same pie.',
    'A cart broke down outside, and its stranded passengers are stuck here for the night.',
    'Card night. The stakes are high, and somebody is cheating.',
    'A local noble is slumming it and pretending nobody recognizes them.',
    'The owner is celebrating a birthday. The first drink is free, the singing is not optional.',
    'A troupe of actors is rehearsing a play about the party. It is not flattering.',
    'A tax collector is drinking alone, and everyone is being very polite to him.',
    'A storm has knocked out the road, and a lord, a bandit, and a priest are sharing a table.',
    'A cooking contest: three cooks, one judge, and a lot of nervous tasters.',
    'Someone has bet the whole room they can catch the cellar rat by midnight.',
    'Two old adventurers are arguing about who really killed the dragon, with diagrams.',
    'A funeral wake is turning into the best party the town has seen all year.',
    'A recruiting sergeant is buying drinks, and the drinks come with a coin at the bottom.',
    'Poetry night. The poems are long, and the doors have been locked.',
    'A fortune teller has set up by the fire and is being far too accurate.',
    'A band of pilgrims has taken a vow of silence and is communicating by mime.',
    'The local wizard\'s apprentice is doing "magic tricks," and some of them are real.',
    'A dog has wandered in with a letter in its mouth and won\'t give it to anyone but the party.',
    'An auction of unclaimed luggage left by guests who never came back.',
    'Harvest supper: long tables, free bread, and a pig roasting in the yard.',
    'A guild of bards is holding its annual meeting, and nobody can agree on anything.',
    'A retired champion is showing off old scars for a copper a look.',
    'A merchant is trying to sell "genuine dragon eggs" table to table.',
    'The ale ran out an hour ago, and the room is getting mean about it.',
    'The owner has hired a minstrel to cheer the place up. It is not working.',
    'A betrothal is being negotiated loudly between two farming families over one table.'
];

// One house rule, read off the board over the bar.
const TAVERN_RULES = ['Pay before you drink.', 'Peace-bond your blades at the door.', 'No dice on the bar.', 'No singing before sundown.',
    'If you break it, you bought it, at twice the price.', 'No familiars on the tables.', 'Last orders when the candle burns down.',
    'No fighting inside. Outside, the house takes bets.', 'Rooms are paid by the night, up front, no exceptions.', 'One drink per song, if you play.',
    'Tabs are settled on the new moon, or else.', 'No necromancy in the common room.', 'No talking to the cook.', 'Don\'t feed the goat.',
    'Strangers buy the first round.', 'Wipe your boots. Wipe your blade.', 'Shirts and shoes. Both.', 'The corner booth is not for you.',
    'No polymorphing the other guests.', 'No buying drinks for the bard.', 'Anything left behind for three days belongs to the house.',
    'Speak Common at the bar, so the barkeep can eavesdrop.'];

// A game in the corner: how it plays, and stakes off the tier's night in a room.
const TAVERN_GAMES = [
    { name: 'Dragonbones', how: 'Everyone rolls 3d6. Highest total takes the pot, any double beats a plain total, and triples take double from everyone.' },
    { name: 'Liar\'s dice', how: 'Five d6 each under a cup, bidding on how many of a face are on the table. A Wisdom (Insight) check opposed by Charisma (Deception) reads a bluff.' },
    { name: 'Knucklebones', how: 'Toss the bones and catch them on the back of the hand. Dexterity (Sleight of Hand), DC 10, then 13, then 16. Most catches wins.' },
    { name: 'Arm-wrestling', how: 'Opposed Strength (Athletics) checks, best two of three. The loser buys a round too.' },
    { name: 'A drinking contest', how: 'Each round, a Constitution saving throw: DC 10, rising by 2 each round. Fail twice and you pay the tab, and you are poisoned for an hour.' },
    { name: 'Find the pea', how: 'Three cups and a pea. A DC 15 Wisdom (Perception) check follows it. The dealer cheats on a 1 or 2 on a d6 (Sleight of Hand +5).' },
    { name: 'Kings and Beggars', how: 'A card game of bluff. Three hands of opposed Charisma (Deception) against Wisdom (Insight); win two to take the pot.' },
    { name: 'Knife toss', how: 'Three throws at a board across the room: Dexterity checks at DC 12, 15, and 18. Hit all three and the house pays double.' },
    { name: 'Beetle racing', how: 'Pick a beetle (there are six) and roll a d6 for it each round. The first to six steps wins. The house beetle never seems to lose.' },
    { name: 'Coin in the cup', how: 'Bounce a coin off the table into a mug. Dexterity, DC 13. Miss and the coin is the house\'s.' },
    { name: 'Riddle duel', how: 'Trade riddles until someone fails. Intelligence checks, DC 12, rising by 1 a riddle. The barkeep judges, badly.' },
    { name: 'Rat-catching', how: 'Turn over a cup on the floor and hope. Dexterity (Acrobatics), DC 14. There are a lot of rats and they are fast.' },
    { name: 'Stare-down', how: 'Two players stare until one looks away. Opposed Wisdom saving throws. Blinking counts.' },
    { name: 'High-low', how: 'The dealer rolls a d20; guess if the next roll is higher or lower. Five right in a row breaks the bank.' }
];

// Trouble brewing tonight (a hook, often with a check).
const TAVERN_TROUBLE = [
    'A pickpocket is working the room (Sleight of Hand +5). A passive Perception of 14 spots them.',
    'Two caravan guards are one insult away from a brawl. A DC 13 Charisma (Persuasion) check calms them; otherwise chairs fly within the hour.',
    'The ale is watered, and a regular is about to say so loudly.',
    'There is a body in the cellar, and the cook will find it within the hour.',
    'Someone has slipped something into one of the party\'s drinks. DC 12 Wisdom (Perception) to notice the taste; DC 12 Constitution save or sleep till dawn.',
    'A bounty hunter is checking faces against a stack of posters, and one of them looks like a party member.',
    'The owner owes money to the wrong people, and the wrong people just walked in.',
    'A fire starts in the kitchen. It is small now.',
    'A drunk is picking a fight with the biggest party member, on a bet.',
    'One of the guests upstairs isn\'t a guest. They came in through the window.',
    'The till is short, and the owner is looking hard at the newcomers.',
    'A courier collapses through the door with a sealed letter and a crossbow bolt in the back.',
    'Someone is cheating at the card table (DC 14 Wisdom (Insight) to spot it), and the loser is armed.',
    'The watch arrives with a warrant for someone in the room and won\'t say who.',
    'A rat king is nesting in the cellar, and the rats are getting bold.',
    'The bard has insulted a noble in song. The noble has guards.',
    'A guest has died in their room. It looks natural. It isn\'t.',
    'The stew has gone off, and half the room is about to find out (DC 10 Constitution save or poisoned until morning).',
    'A cult is meeting in the back room, under the name of a book club.',
    'A child has come in looking for their parent, who is one of the regulars and pretending not to be.'
];

// A room with a story, sometimes. mult: of the tier's SRD stay.
const TAVERN_SPECIAL_ROOMS = [
    { name: 'The haunted room (the ghost is friendly)', mult: 0.5 },
    { name: 'The bridal suite (one bed, a great many cushions)', mult: 1.5 },
    { name: 'The room over the kitchen (warm, smells of onions)', mult: 0.8 },
    { name: 'The tower room (a lot of stairs, a fine view)', mult: 1.2 },
    { name: 'The room where the king slept (untouched since)', mult: 3 },
    { name: 'The cupboard under the stairs (fits a halfling)', mult: 0.3 },
    { name: 'The room with the locked chest nobody can open', mult: 1 },
    { name: 'The room with a secret door (you didn\'t hear it from us)', mult: 1.5 },
    { name: 'The hayloft over the stable (horse company included)', mult: 0.3 },
    { name: 'The room with the painted ceiling (try not to look too long)', mult: 1.2 }
];

// ── Second pass (R2). A later draw (more) swaps these in by their share of the whole
// list, so an old link keeps its owner, staff, regulars, and prices.
const TAVERN_DISHES_MORE = {
    squalid: ['Fried bread and lard', 'Gristle pie', 'Soup of the week, by the week', 'Turnip tops in hot water',
        'Sheep\'s-head broth, head included', 'Cold porridge, cut in slices'],
    poor: ['Barley bannocks and buttermilk', 'Beans and bacon rind', 'Faggots in onion gravy', 'Jellied eels',
        'Kale and oat broth', 'Mashed neeps with a sausage'],
    modest: ['Chicken and leek pie', 'Smoked haddock with a poached egg', 'Beef stew with dumplings', 'Ploughman\'s board with three cheeses',
        'Mutton chops and minted peas', 'Giant-crab cakes (one crab, many cakes)'],
    comfortable: ['Roast pork with crackling', 'Salmon baked in a salt crust', 'Venison sausages on barley mash', 'Steak and kidney pudding',
        'Partridge with bread sauce', 'Baked pears with honey and walnuts'],
    wealthy: ['Turbot in saffron cream', 'Spiced crab served in its shell', 'Wild duck with blackcurrants', 'Rack of lamb in a herb crust',
        'Chilled melon in elven wine', 'Hippogriff-egg soufflé'],
    aristocratic: ['A whole roast boar with a gilded apple', 'Sea serpent steaks seared at the table', 'Oyster stew with the pearls left in',
        'Unicorn-shaped jelly (no unicorns harmed)', 'Twelve-bird roast, carved by the chef', 'Frost giant cheese, aged a century']
};
const TAVERN_DRINKS_MORE = {
    squalid: ['Wet Sock Stout', 'Last week\'s mead', 'Boot-strained beer', 'Cellar-damp cider', 'Rusty Nail (it has one in it)', 'Grain spirit of no fixed grain'],
    poor: ['Barley water with a splash', 'Crabapple cider', 'Gorse wine', 'Spruce beer', 'Thin mead', 'Farm-still rye'],
    modest: ['Oatmeal stout', 'Brown ale with honey', 'Pear cider', 'Gnomish ginger ale', 'Hot buttered ale', 'Rhubarb wine'],
    comfortable: ['Apple brandy', 'Rosehip mead', 'Smoked cherry porter', 'Honey whiskey', 'Mulled red with orange peel', 'Elven pale ale'],
    wealthy: ['Aged dwarven rye', 'Sparkling wine with blackcurrant cordial', 'Twenty-year tawny port', 'Elven moonpetal wine',
        'Glacier-cold rye spirit', 'Spiced coffee with cream and rum'],
    aristocratic: ['Wine pressed by dryads', 'Cloudberry brandy from the giant-lands', 'Sunfire whiskey (it glows faintly)',
        'Mead from the bees of a celestial garden', 'Ambrosia (one sip per guest)', 'Pearl wine from the merfolk courts']
};
// More of what each kind of place is known for (only kinds that already have one).
const TAVERN_KIND_MORE = {
    'roadside inn': { dish: ['Road stew (the pot is never empty, or washed)', 'Hard-boiled eggs for the road'], drink: ['Dust-cutter cider', 'Crossroads gin'] },
    'coaching inn': { dish: ['Drover\'s hotpot', 'Pork pie in a paper wrap'], drink: ['The coachman\'s hot toddy', 'Post-horse porter'] },
    'dockside tavern': { dish: ['Smoked eel and black bread', 'Crab boiled in seawater'], drink: ['Grog, three parts water', 'Harbor-master\'s rum'] },
    'flophouse': { dish: ['Bread and dripping from yesterday\'s pan', 'Broth of the day (any day)'] },
    'brewhouse': { drink: ['The brewer\'s seasonal (ask what it is this week)', 'Unfiltered wheat beer, cloudy as fog'] },
    'mountain lodge': { dish: ['Melted mountain cheese with bread', 'Barley soup with smoked mutton'], drink: ['Pine-needle schnapps', 'Hot butter mead'] },
    'gambling hall': { drink: ['The house edge (a sweet punch)', 'Double-or-nothing whiskey'] },
    'festhall': { dish: ['Little cakes iced with the guests\' faces', 'Towers of candied fruit'] },
    'temple hostel': { drink: ['Pilgrim\'s barley water, blessed', 'Abbey mead'] },
    'riverboat inn': { dish: ['Pike fried in butter', 'Crayfish by the bucket'], drink: ['Bargee\'s bitter', 'Lock-keeper\'s plum brandy'] },
    'dwarven alehall': { dish: ['Cave-mushroom pie', 'Smoked goat and black bread'], drink: ['Deepdelver dark ale', 'Firebeard whiskey'] },
    'halfling burrow-inn': { dish: ['Elevenses platter (all day)', 'Mushroom and bacon pasties'], drink: ['Pipeweed-smoked porter', 'Blackberry cordial, Gran\'s recipe'] },
    'woodland lodge': { dish: ['Rabbit roasted on the hearth', 'Nettle soup with forest bread'], drink: ['Birch-sap wine', 'Wild-bee mead'] },
    'cellar bar': { drink: ['The bootlegger\'s rye', 'Bitters as green as the bottle'] }
};
const TAVERN_CROWD_MORE = ['Full of farmers in for the market tonight', 'Mostly off-duty soldiers tonight', 'Half empty, and the half that is here is loud',
    'Standing room only near the fire', 'A few travelers and one very old regular', 'Full of sailors on shore leave tonight',
    'Quiet enough to hear the cat purr', 'Crowded with a wedding party and all its cousins'];
const TAVERN_TONIGHT_MORE = [
    'A troupe of acrobats is practicing in the rafters, mostly successfully.',
    'A traveling tinker is mending pots and handing out gossip for free.',
    'A lord\'s hunting party has come in muddy and loud, with a dead boar on a pole.',
    'A gnome is showing off a tap that pours by itself. It is pouring, and it won\'t stop.',
    'The regulars are holding a mock trial of the cat, for the theft of a sausage.',
    'An old soldier is teaching anyone who will listen how to hold a pike, using a broom.',
    'Twins are taking turns at the bar, and the barkeep thinks one man has had eleven drinks.',
    'A dance night. The fiddler is very fast and the floor is very small.',
    'Pilgrims are singing hymns in one corner and sailors are singing something else in the other.',
    'A dwarven caravan is celebrating a good deal and paying for everything in raw silver.',
    'Story night: the best ghost story wins a free room, and one teller swears theirs is true.',
    'An elf is waiting for a friend who said "meet me here" a hundred years ago.',
    'A painter is sketching the regulars for a mural and charging extra to make them handsome.',
    'The first barrel of the new brew is being tapped, and the whole street has turned up.'
];
const TAVERN_RULES_MORE = ['No spells above a whisper.', 'The cat outranks you.', 'No arm-wrestling on the good table.',
    'Dwarves pay for the stools they break. So does everyone else.', 'Pay in coin, not in "exciting opportunities."', 'No selling maps at the bar.',
    'Gnomish inventions stay outside.', 'Trophies stay outside, especially the heads.', 'If the barkeep says you\'ve had enough, you have.',
    'No invisible patrons. Everyone gets counted.', 'Leave the fire alone. It has been lit for forty years.', 'Wager disputes go to the cook, whose ruling is final.',
    'Talk business in the back room, not at the bar.', 'No drinking from your own flask.', 'Mounts stay in the stable, however small.',
    'Lie to the barkeep and you drink elsewhere.'];
const TAVERN_GAMES_MORE = [
    { name: 'Shove-copper', how: 'Slide a copper down the bar toward the edge. Dexterity checks: the highest total wins, but a 20 or more sails off the end and loses.' },
    { name: 'Toad racing', how: 'Pick a toad (there are five) and roll a d4 for it each round. The first to ten hops wins. One toad always just sits there.' },
    { name: 'Candle and coin', how: 'Snuff a candle across the table by flicking a coin at it. Dexterity, DC 15. The house relights it for a copper.' },
    { name: 'Tankard tower', how: 'Stack empty tankards in turns. Dexterity (Sleight of Hand), DC 8 plus the number already stacked. Whoever topples it buys the round.' },
    { name: 'Slaps', how: 'Hands stacked on the table. Opposed Dexterity checks; the winner slaps, and the loser pays a copper a slap. Three slaps ends it.' },
    { name: 'The dragon\'s hoard', how: 'Everyone puts a coin in and draws a token from a bag; whoever draws the dragon takes the hoard. A DC 16 Sleight of Hand check palms a second token.' },
    { name: 'Tall tales', how: 'Each player tells a story of their own deeds and the table votes. Charisma (Performance) checks; a DC 13 Wisdom (Insight) catches an outright lie, which forfeits.' },
    { name: 'Axe throwing', how: 'Three throws at a log in the yard: attack rolls against AC 12, 14, and 16. Hit all three to take the pot; miss all three and pay for the log.' },
    { name: 'Stones and pits', how: 'A board of pits and pebbles. Opposed Intelligence checks, best of three; a natural 20 clears the board.' },
    { name: 'Last one standing', how: 'Everyone rolls a d12; the lowest drops out each round until one is left. Pay double the stake once to reroll.' }
];
const TAVERN_TROUBLE_MORE = [
    'A noble\'s runaway child is hiding upstairs, and the noble\'s men are asking questions downstairs.',
    'The new barmaid is a doppelganger, and the real one is tied up in the pantry. DC 15 Wisdom (Insight) to notice she doesn\'t know the regulars.',
    'A smuggler has stashed a crate under the party\'s table and is coming back for it, with friends.',
    'A wizard\'s familiar has got loose and is stealing shiny things from the guests.',
    'Someone has been adding drinks to the party\'s tab all night. A DC 13 Intelligence (Investigation) check on the slate shows the handwriting changes.',
    'A gang is collecting protection money tonight, and the owner can\'t pay.',
    'Two guests were sold the same room, and both of them have swords.',
    'The common-room floor is sagging over the cellar. A DC 12 Wisdom (Perception) check hears it crack.',
    'A drunk has stolen a horse from the stable and is riding it round and round the yard.',
    'A rival tavern has paid someone to start a brawl tonight. A DC 14 Wisdom (Insight) check spots the plant.',
    'A guest\'s pet snake has got into the walls, and the guest won\'t say how big it is.',
    'The new strongbox behind the bar is a mimic, and the barkeep is about to open it.',
    'An old enemy of the owner has taken a room under a false name, and has brought a crossbow.',
    'A traveler upstairs is coughing badly, and the guests in the next rooms have started coughing too.'
];
const TAVERN_SPECIAL_ROOMS_MORE = [
    { name: 'The room with the round bed (a gnome designed it)', mult: 1.3 },
    { name: 'The attic with a view of the stars (and the drafts)', mult: 0.7 },
    { name: 'The room the last adventurers never came back for (their gear is still in it)', mult: 0.8 },
    { name: 'The room with a balcony over the square', mult: 1.5 },
    { name: 'The cellar room (cool, quiet, close to the barrels)', mult: 0.6 },
    { name: 'The room with the portrait whose eyes follow you', mult: 0.9 },
    { name: 'The room with its own copper bath', mult: 2 },
    { name: 'The room that stays cold even in summer', mult: 0.6 }
];

const TAVERN_OWNER_ROLES = ['Owner and barkeep', 'Innkeeper', 'Proprietor', 'Owner and cook', 'Landlord', 'Owner (inherited it, regrets it)',
    'Owner (won it in a card game)', 'Retired adventurer and owner', 'Co-owner (the other one is never in)', 'Owner and brewer',
    'Manager (the real owner is a dragon, they say)', 'Owner (bought it with a reward and a dream)', 'Host and owner', 'Widowed owner, keeping it going',
    'Owner, bouncer, and only staff on bad nights', 'Tavern-mistress', 'Owner (former noble, fallen far)'];

// {owner}, {other}, {regular}, plus npc-data's {kin} etc.
function tavernFill(text, ctx) {
    return fillTemplate(text.replace(/\{(owner|other|regular)\}/g, (m, k) => ctx[k] || 'the owner'));
}

// One of the newer lines in place of cur, by its share of the whole list (always two draws).
function tavernSwap(cur, old, more) {
    const newer = randomArray(more);
    return rand() < more.length / (old.length + more.length) ? newer : cur;
}

// The second pass (R2): drawn after everything else, so old links keep their tavern.
function tavernSecondPass(tv) {
    const { menu, kind } = tv, tier = tv.tier;
    const taken = new Set([...menu.food, ...menu.drink].map(i => i.name));
    const swapItem = (i, old, more) => {
        const next = tavernSwap(i.name, old, more);
        if (next !== i.name && !taken.has(next)) { taken.add(next); i.name = next; }
    };
    menu.food.forEach(i => { if (i.src === 'house' && !i.known) swapItem(i, TAVERN_DISHES[tier], TAVERN_DISHES_MORE[tier]); });
    // Not the owner's own brew.
    menu.drink.forEach(i => { if (TAVERN_DRINKS[tier].includes(i.name)) swapItem(i, TAVERN_DRINKS[tier], TAVERN_DRINKS_MORE[tier]); });
    const km = TAVERN_KIND_MORE[kind.label] || {};
    if (kind.dish && km.dish) {
        const known = menu.food.find(i => i.known);
        swapItem(known, [kind.dish], km.dish);
        kind.dish = known.name;
    }
    if (kind.drink && km.drink) {
        const known = menu.drink.find(i => i.known);
        swapItem(known, [kind.drink], km.drink);
        kind.drink = known.name;
    }
    const special = tv.rooms.list.find(r => TAVERN_SPECIAL_ROOMS.some(x => x.name === r.name));
    const room = randomArray(TAVERN_SPECIAL_ROOMS_MORE), price = tavernPrice(TAVERN_TIERS[tier].stay * room.mult);
    if (special && rand() < TAVERN_SPECIAL_ROOMS_MORE.length / (TAVERN_SPECIAL_ROOMS.length + TAVERN_SPECIAL_ROOMS_MORE.length)) {
        special.name = room.name;
        special.gp = price;
    }
    tv.scene.crowd = tavernSwap(tv.scene.crowd, TAVERN_SCENES.crowd, TAVERN_CROWD_MORE);
    tv.rule = tavernSwap(tv.rule, TAVERN_RULES, TAVERN_RULES_MORE);
    const g = randomArray(TAVERN_GAMES_MORE);
    if (rand() < TAVERN_GAMES_MORE.length / (TAVERN_GAMES.length + TAVERN_GAMES_MORE.length)) Object.assign(tv.game, { name: g.name, how: g.how });
    tv.tonight = tavernSwap(tv.tonight, TAVERN_TONIGHT, TAVERN_TONIGHT_MORE);
    const trouble = tavernSwap(tv.trouble, TAVERN_TROUBLE, TAVERN_TROUBLE_MORE);
    if (tv.trouble) tv.trouble = trouble;
}

// opts: { quality: tier key or 'random' }. Returns the tavern without a rumor.
function rollTavern(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);

    const owner = part('owner', () => ({ ...rollNPC(), role: randomArray(TAVERN_OWNER_ROLES) }));
    const ownerFirst = owner.firstName || owner.name.split(' ')[0];
    const name = part('name', () => rollShopName('tavern', ownerFirst));

    // Always drawn, so a picked quality doesn't shift any other part.
    const rolledTier = part('tier', () => {
        let r = rand() * TAVERN_TIER_KEYS.reduce((s, k) => s + TAVERN_TIERS[k].weight, 0);
        return TAVERN_TIER_KEYS.find(k => (r -= TAVERN_TIERS[k].weight) <= 0) || 'modest';
    });
    const tier = TAVERN_TIERS[opts.quality] ? opts.quality : rolledTier;
    const t = TAVERN_TIERS[tier];
    const ti = TAVERN_TIER_KEYS.indexOf(tier);
    const band = TAVERN_BAND[tier];

    // The kind follows the tier: a flophouse is never aristocratic.
    const kind = part('kind', () => {
        const k = tavernWeighted(TAVERN_KINDS.filter(x => x.tiers[0] <= ti && ti <= x.tiers[1]));
        return { label: k.label, where: randomArray(k.where), dish: k.dish || null, drink: k.drink || null };
    });

    const regulars = part('regulars', () => {
        const count = randomInt(2, 3);
        const habits = pickSome(TAVERN_HABITS, count);
        const list = habits.map(habit => ({ ...rollNPC(), habit }));
        const firsts = list.map(r => r.firstName || r.name.split(' ')[0]);
        const ties = pickSome(TAVERN_TIES, count);
        list.forEach((r, i) => {
            const others = firsts.filter((f, j) => j !== i && f !== firsts[i]);
            const other = others[Math.floor(rand() * others.length)];
            const keep = rand() < 0.7;
            // A tie names someone else: skip it when that would be the regular's own first name.
            const needs = ties[i].includes('{other}') ? other : firsts[i] !== ownerFirst;
            if (keep && needs) r.tie = tavernFill(ties[i], { owner: ownerFirst, other });
        });
        return list;
    });

    const staff = part('staff', () => {
        const count = randomInt(1, 2);
        return Array.from({ length: count }, () => {
            const n = rollNPC();
            const role = randomArray(TAVERN_STAFF_ROLES);
            const note = randomArray(TAVERN_STAFF_NOTES);
            const regular = regulars[Math.floor(rand() * regulars.length)];
            const first = n.firstName || n.name.split(' ')[0];
            const regFirst = regular.firstName || regular.name.split(' ')[0];
            // Never name the staffer themselves: fall back to "the owner" / "one of the regulars".
            return { ...n, role: genderedTitle(role, n.gender),
                note: tavernFill(note, { owner: ownerFirst !== first ? ownerFirst : 'the owner',
                    regular: regFirst !== first ? regFirst : 'one of the regulars' }) };
        }).filter((s, i, a) => a.findIndex(x => x.role === s.role) === i);
    });

    const menu = part('menu', () => {
        const sells = i => TAVERN_TIER_KEYS.indexOf(i.from) <= ti && ti <= TAVERN_TIER_KEYS.indexOf(i.to);
        const srd = TAVERN_SRD_ITEMS.filter(sells).map(i => ({ name: i.name, gp: i.gp, kind: i.kind, src: 'SRD' }));
        // Three plates, each fixed or composed; the first is the house special.
        const fixed = pickSome(TAVERN_DISHES[tier], 3);
        const dishes = fixed.map(d => { const c = tavernDish(band); return rand() < 0.45 ? c : d; })
            .filter((d, i, a) => a.indexOf(d) === i);
        const food = dishes.map((d, i) => ({ name: d, gp: tavernPrice(t.meal / (i === 0 ? 2 : 3)), kind: 'food', src: 'house', special: i === 0 }));
        if (kind.dish) food.push({ name: kind.dish, gp: tavernPrice(t.meal / 3), kind: 'food', src: 'house', known: true });

        // Two house drinks; one may be the owner's own brew.
        const drinks = pickSome(TAVERN_DRINKS[tier], 2);
        const adj = randomArray(TAVERN_BREW_ADJ), style = randomArray(TAVERN_BREW_STYLES[band]);
        const brew = `${tavernPossessive(ownerFirst)} ${adj} ${style}`;
        if (rand() < 0.5 && !style.split(' ').includes(adj) && !repeatsWord(`${adj} ${style}`)) drinks[0] = brew;
        const drink = drinks.map(d => ({ name: d, gp: tavernPrice(t.ale * 1.5), kind: 'drink', src: 'house' }));
        if (kind.drink) drink.push({ name: kind.drink, gp: tavernPrice(t.ale * 2), kind: 'drink', src: 'house', known: true });
        return {
            food: [...food, ...srd.filter(i => i.kind === 'food')],
            drink: [...drink, ...srd.filter(i => i.kind === 'drink')],
            meals: t.meal
        };
    });

    // The tier's own room at the SRD price, plus the tier below and above when there is one,
    // and sometimes a room with a story.
    const rooms = part('rooms', () => {
        const list = [ti - 1, ti, ti + 1].filter(i => i >= 0 && i < TAVERN_TIER_KEYS.length).map(i => {
            const r = TAVERN_TIERS[TAVERN_TIER_KEYS[i]];
            return { name: r.room, gp: r.stay, tier: TAVERN_TIER_KEYS[i], src: 'SRD' };
        });
        const vacant = randomInt(0, 6);
        const special = randomArray(TAVERN_SPECIAL_ROOMS), price = tavernPrice(t.stay * special.mult);
        if (rand() < 0.35 && ti >= 1) list.push({ name: special.name, gp: price, src: 'house' });
        list.push({ name: 'Stabling, per mount', gp: TAVERN_STABLING, src: 'SRD' });
        if (ti >= 2) list.push({ name: 'A hot bath', gp: tavernPrice(t.ale * 2), src: 'house' });
        return { list, vacant };
    });

    const quirk = part('quirk', () => randomArray(TAVERN_QUIRKS));
    const scene = part('scene', () => ({
        look: randomArray(TAVERN_SCENES.look),
        light: randomArray(TAVERN_SCENES.light),
        sound: randomArray(TAVERN_SCENES.sound),
        smell: randomArray(TAVERN_SCENES.smell),
        crowd: randomArray(TAVERN_SCENES.crowd)
    }));
    const sign = part('sign', () => `${randomArray(TAVERN_SIGN_BOARDS)} ${randomArray(TAVERN_SIGN_STATES)}`);
    const history = part('history', () =>
        `Built ${randomArray(TAVERN_HISTORY_WHEN)} as ${randomArray(TAVERN_HISTORY_FORMER)}. ${randomArray(TAVERN_HISTORY_EVENTS)}`);
    const rule = part('rule', () => randomArray(TAVERN_RULES));
    const game = part('game', () => {
        const g = randomArray(TAVERN_GAMES);
        return { name: g.name, how: g.how, stake: Math.max(0.01, Math.round(t.stay * randomInt(1, 5) / 2 * 100) / 100) };
    });
    const tonight = part('tonight', () => randomArray(TAVERN_TONIGHT));
    const trouble = part('trouble', () => { const x = randomArray(TAVERN_TROUBLE); return rand() < 0.65 ? x : null; });

    const tv = { seed, name, tier, kind, owner, staff, regulars, menu, rooms, quirk, scene, sign, history, rule, game, tonight, trouble };
    part('more', () => tavernSecondPass(tv));
    return tv;
}

function tavernNpcLine(n) {
    return `${n.name} (${n.race.charAt(0).toUpperCase() + n.race.slice(1)}, ${n.age})`;
}

// "Low beams …, lit by a single smoky lantern. You hear …, and it smells of …. Busy tonight."
function tavernSceneText(s) {
    return `${s.look}, lit by ${s.light}. You hear ${s.sound}, and it smells of ${s.smell}. ${s.crowd}.`;
}

// Plain text for Copy (rumor: a rumors.json entry or null).
function tavernText(tv, rumor) {
    const t = TAVERN_TIERS[tv.tier];
    const price = i => `${i.name}: ${formatCoins(i.gp)}${i.special ? ' (house special)' : ''}${i.known ? ' (what it\'s known for)' : ''}`;
    const lines = [
        `${tv.name} (${t.label.toLowerCase()} ${tv.kind.label}, ${tv.kind.where})`,
        tavernSceneText(tv.scene),
        `The sign: ${tv.sign}. ${tv.history}`,
        '',
        `${tv.owner.role}: ${tavernNpcLine(tv.owner)}. ${tv.owner.trait}. Voice: ${tv.owner.voice}. "${tv.owner.dialogue}" Secret: ${tv.owner.secret}`,
        'Staff:',
        ...tv.staff.map(s => `  ${s.role}: ${tavernNpcLine(s)}, ${s.note}.`),
        'Regulars:',
        ...tv.regulars.map((r, i) => `  ${tavernNpcLine(r)}, ${r.profession.toLowerCase()}, ${r.habit}. ${r.trait}.${r.tie ? ` ${tavernCap(r.tie)}.` : ''}${i === 0 && r.questHook ? ` Has work: ${r.questHook}${/[.!?]$/.test(r.questHook) ? '' : '.'}` : ''}`),
        '',
        'Food:', ...tv.menu.food.map(i => '  ' + price(i)),
        'Drink:', ...tv.menu.drink.map(i => '  ' + price(i)),
        `A day's meals here: ${formatCoins(tv.menu.meals)}`,
        `Rooms (per night, ${tv.rooms.vacant ? tv.rooms.vacant + ' free tonight' : 'full tonight'}):`, ...tv.rooms.list.map(i => '  ' + price(i)),
        '',
        `Quirk: ${tv.quirk}`,
        `House rule: ${tv.rule}`,
        `The game: ${tv.game.name}, ${formatCoins(tv.game.stake)} a hand. ${tv.game.how}`,
        `Tonight: ${tv.tonight}`
    ];
    if (tv.trouble) lines.push(`Trouble: ${tv.trouble}`);
    if (rumor) lines.push(`Overheard: "${rumor.text}"`);
    if (rumor && rumor.followup) lines.push(`What happened next: ${rumor.followup}`);
    return lines.join('\n');
}
