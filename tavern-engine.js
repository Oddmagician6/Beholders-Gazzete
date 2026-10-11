/* ============================================
   TAVERN ENGINE (F26): a whole tavern or inn for the DM Toolbox.
   A quality tier (the SRD 5.1 lifestyle names), an owner and a few regulars
   (rollNPC from npc-data.js), a sign (rollShopName('tavern') from names-data.js),
   a menu and rooms, a quirk, and what's going on tonight.
   Prices: the SRD 5.1 Food, Drink, and Lodging table where it has the item
   (tagged src 'SRD'); house dishes and drinks are priced from the tier's SRD meal
   cost (tagged 'house'). Amounts are in gp; show them with formatCoins() (coins.js).
   The rumor is not rolled here: the Toolbox deals it from the rumor deck (rumor-deck.js).
   Each part rolls from deriveSeed(seed, part), so a new quality changes only the
   menu and rooms, never the owner, the sign, or the regulars.
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

// House dishes by tier (original). A plate costs about a third of the tier's daily meals.
const TAVERN_DISHES = {
    squalid: ['Gruel of the day (same as yesterday)', 'Rat on a stick (the cook insists it is squirrel)', 'Boiled turnip, whole',
        'Yesterday\'s crusts, soaked in drippings', 'Mystery stew (do not ask)', 'Pickled eggs of uncertain age', 'Fried fish heads'],
    poor: ['Pease porridge', 'Mutton stew with barley', 'Black bread and dripping', 'Fried river eel', 'Cabbage soup with a ham bone',
        'Oatcakes and onion', 'Blood sausage and mash', 'Leek and potato pottage'],
    modest: ['Shepherd\'s pie', 'Roast chicken with leeks', 'Venison stew', 'Cheese and onion pasty', 'Trout fried in butter',
        'Pork chop with stewed apples', 'Mushroom and barley soup', 'Rabbit pie', 'Sausages and mustard', 'Owlbear chili (mostly bear)'],
    comfortable: ['Honey-glazed ham', 'Spiced lamb skewers', 'Duck with cherries', 'Beef and ale pie', 'Smoked salmon on rye',
        'Wild boar ribs', 'Apple tart with fresh cream', 'Roast goose with chestnuts', 'Dwarven forge-baked flatbread'],
    wealthy: ['Roast pheasant in plum sauce', 'Saffron rice with river prawns', 'Venison loin with juniper', 'Wyvern-egg custard',
        'Truffle-stuffed quail', 'Elven honey cakes', 'Lobster in garlic butter', 'Candied pears in spiced wine'],
    aristocratic: ['Roc-egg omelette for the table', 'Peacock served in its feathers', 'Moonfruit sorbet from the elven isles',
        'Griffon-shank braised for a day', 'Gold-leaf marzipan swans', 'Seven-course tasting of the realm', 'Dragon pepper beef (fireproof plates)']
};

// House drinks by tier (original). Priced off the tier's mug of ale.
const TAVERN_DRINKS = {
    squalid: ['Bilgewater Brown', 'Gutrot (a clear liquid)', 'Tuesday\'s Ale', 'Puddle Porter'],
    poor: ['Turnip moonshine', 'Small beer', 'Sour cider', 'Mule-Kick Mead'],
    modest: ['Dwarven stout', 'Halfling harvest cider', 'Honey mead', 'Red ale on tap', 'Hot mulled cider'],
    comfortable: ['Barrel-aged dark ale', 'Spiced winter wine', 'Elderflower mead', 'Gnomish fizzy lager', 'Plum brandy'],
    wealthy: ['Elven summerwine', 'Dwarven fire whiskey', 'Chilled pear brandy', 'Imported sparkling wine'],
    aristocratic: ['Hundred-year elven vintage', 'Liquid starlight (a cordial)', 'Celestial mead, by the thimble', 'Wine older than the city']
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
    'Gnomish clockwork taps pour the ale. One of them pours only on the third try.'
];

const TAVERN_SCENES = {
    look: ['Low beams hung with dried herbs and old horseshoes', 'Smoke-black rafters and a fire big enough to roast an ox',
        'Long trestle tables scarred with carved initials', 'Rush-covered floors and cracked leaded windows',
        'Brass lamps, polished wood, and a mural of a famous battle', 'A cramped room with mismatched stools and one good chair',
        'A two-story hall with a gallery running round the top', 'Booths of dark oak, each with a curtain for privacy',
        'Whitewashed walls covered in charcoal drawings by patrons', 'A sunken room down three steps, warm and close'],
    sound: ['a fiddle and a lot of stamping', 'a dice game getting loud in the corner', 'quiet talk and the crackle of the fire',
        'a drinking song with several competing versions of the words', 'the barkeep arguing with a delivery dwarf',
        'a lute badly in need of tuning', 'laughter from a card table every few minutes', 'rain on the roof and a snoring patron'],
    smell: ['woodsmoke and roasting meat', 'spilled ale and wet dog', 'fresh bread and pipe smoke', 'cloves and mulled wine',
        'fried onions and something burning', 'pine resin and old leather', 'tallow candles and boiled cabbage', 'beeswax and a hint of the stables']
};

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
    'A troupe of actors is rehearsing a play about the party. It is not flattering.'
];

const TAVERN_HABITS = [
    'always at the end of the bar', 'in the corner booth, back to the wall', 'by the fire, boots off',
    'at the dice table, losing', 'on the same stool every night since it opened', 'near the door, watching who comes in',
    'holding court at the long table', 'nursing one drink all night', 'helping behind the bar when it gets busy',
    'asleep by the hearth more often than not', 'at the window, waiting for someone', 'telling the same story to anyone new'
];

const TAVERN_OWNER_ROLES = ['Owner and barkeep', 'Innkeeper', 'Proprietor', 'Owner and cook', 'Landlord', 'Owner (inherited it, regrets it)'];

// opts: { quality: tier key or 'random' }. Returns the tavern without a rumor.
function rollTavern(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);

    const owner = part('owner', () => ({ ...rollNPC(), role: randomArray(TAVERN_OWNER_ROLES) }));
    const name = part('name', () => rollShopName('tavern', owner.name));

    // Always drawn, so a picked quality doesn't shift any other part.
    const rolledTier = part('tier', () => {
        let r = rand() * TAVERN_TIER_KEYS.reduce((s, k) => s + TAVERN_TIERS[k].weight, 0);
        return TAVERN_TIER_KEYS.find(k => (r -= TAVERN_TIERS[k].weight) <= 0) || 'modest';
    });
    const tier = TAVERN_TIERS[opts.quality] ? opts.quality : rolledTier;
    const t = TAVERN_TIERS[tier];
    const ti = TAVERN_TIER_KEYS.indexOf(tier);

    const regulars = part('regulars', () => {
        const count = randomInt(2, 3);
        const habits = pickSome(TAVERN_HABITS, count);
        return habits.map(habit => ({ ...rollNPC(), habit }));
    });

    const menu = part('menu', () => {
        const sells = i => TAVERN_TIER_KEYS.indexOf(i.from) <= ti && ti <= TAVERN_TIER_KEYS.indexOf(i.to);
        const srd = TAVERN_SRD_ITEMS.filter(sells).map(i => ({ name: i.name, gp: i.gp, kind: i.kind, src: 'SRD' }));
        const food = pickSome(TAVERN_DISHES[tier], 3).map((d, i) => ({ name: d, gp: tavernPrice(t.meal / (i === 0 ? 2 : 3)), kind: 'food', src: 'house', special: i === 0 }));
        const drink = pickSome(TAVERN_DRINKS[tier], 2).map(d => ({ name: d, gp: tavernPrice(t.ale * 1.5), kind: 'drink', src: 'house' }));
        return {
            food: [...food, ...srd.filter(i => i.kind === 'food')],
            drink: [...drink, ...srd.filter(i => i.kind === 'drink')],
            meals: t.meal
        };
    });

    // The tier's own room at the SRD price, plus the tier below and above when there is one.
    const rooms = part('rooms', () => {
        const list = [ti - 1, ti, ti + 1].filter(i => i >= 0 && i < TAVERN_TIER_KEYS.length).map(i => {
            const r = TAVERN_TIERS[TAVERN_TIER_KEYS[i]];
            return { name: r.room, gp: r.stay, tier: TAVERN_TIER_KEYS[i], src: 'SRD' };
        });
        const vacant = randomInt(0, 6);
        list.push({ name: 'Stabling, per mount', gp: TAVERN_STABLING, src: 'SRD' });
        if (ti >= 2) list.push({ name: 'A hot bath', gp: tavernPrice(t.ale * 2), src: 'house' });
        return { list, vacant };
    });

    const quirk = part('quirk', () => randomArray(TAVERN_QUIRKS));
    const scene = part('scene', () => ({
        look: randomArray(TAVERN_SCENES.look),
        sound: randomArray(TAVERN_SCENES.sound),
        smell: randomArray(TAVERN_SCENES.smell)
    }));
    const tonight = part('tonight', () => randomArray(TAVERN_TONIGHT));

    return { seed, name, tier, owner, regulars, menu, rooms, quirk, scene, tonight };
}

function tavernNpcLine(n) {
    return `${n.name} (${n.race.charAt(0).toUpperCase() + n.race.slice(1)}, ${n.age})`;
}

// Plain text for Copy (rumor: a rumors.json entry or null).
function tavernText(tv, rumor) {
    const t = TAVERN_TIERS[tv.tier];
    const price = i => `${i.name}: ${formatCoins(i.gp)}`;
    const lines = [
        `${tv.name} (${t.label.toLowerCase()} tavern and inn)`,
        `${tv.scene.look}. You hear ${tv.scene.sound}, and it smells of ${tv.scene.smell}.`,
        '',
        `${tv.owner.role}: ${tavernNpcLine(tv.owner)}. ${tv.owner.trait}. Voice: ${tv.owner.voice}. Secret: ${tv.owner.secret}`,
        'Regulars:',
        ...tv.regulars.map(r => `  ${tavernNpcLine(r)}, ${r.profession.toLowerCase()}, ${r.habit}. ${r.trait}.`),
        '',
        'Food:', ...tv.menu.food.map(i => '  ' + price(i) + (i.special ? ' (house special)' : '')),
        'Drink:', ...tv.menu.drink.map(i => '  ' + price(i)),
        `A day's meals here: ${formatCoins(tv.menu.meals)}`,
        `Rooms (per night, ${tv.rooms.vacant ? tv.rooms.vacant + ' free tonight' : 'full tonight'}):`, ...tv.rooms.list.map(i => '  ' + price(i)),
        '',
        `Quirk: ${tv.quirk}`,
        `Tonight: ${tv.tonight}`
    ];
    if (rumor) lines.push(`Overheard: "${rumor.text}"`);
    return lines.join('\n');
}
