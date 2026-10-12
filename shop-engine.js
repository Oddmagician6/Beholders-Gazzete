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
    }
};

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

// Quantity on hand: cheap things come in piles, expensive things one at a time.
function shopQty(item) {
    if (item.category === 'magic-items' || item.category === 'mounts' || item.basePrice >= 200) return 1;
    if (item.basePrice < 1) return randomInt(5, 30);
    if (item.basePrice < 10) return randomInt(2, 10);
    if (item.basePrice < 100) return randomInt(1, 5);
    return randomInt(1, 2);
}

function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// opts: { type, wealth }, each a key or 'random'
function rollShop(opts = {}) {
    const type = !opts.type || opts.type === 'random' ? randomArray(Object.keys(SHOP_TYPES)) : opts.type;
    const wealth = !opts.wealth || opts.wealth === 'random' ? randomArray(Object.keys(SHOP_WEALTH)) : opts.wealth;
    const def = SHOP_TYPES[type], w = SHOP_WEALTH[wealth];

    const byId = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    const pool = [...new Set([
        ...MARKET_ITEMS.filter(i => def.categories.includes(i.category)).map(i => i.id),
        ...def.ids
    ])].filter(id => byId[id] && !def.exclude.includes(id));

    // Stock what the shop can afford; a humble shop with too little falls back to its cheapest goods.
    const want = Math.max(4, Math.round(randomInt(def.count[0], def.count[1]) * w.stock));
    let affordable = pool.filter(id => byId[id].basePrice <= w.maxBase);
    if (affordable.length < Math.min(want, 4)) {
        affordable = pool.slice().sort((a, b) => byId[a].basePrice - byId[b].basePrice).slice(0, Math.min(want, pool.length));
    }
    let picks = shuffled(affordable).slice(0, want);
    if (def.wildcards) {
        const extras = shuffled(MARKET_ITEMS.filter(i => !picks.includes(i.id) && i.basePrice <= w.maxBase)).slice(0, def.wildcards);
        picks = picks.concat(extras.map(i => i.id));
    }

    const stock = picks
        .map(id => ({ id, qty: shopQty(byId[id]) }))
        .sort((a, b) => MARKET_ITEMS.indexOf(byId[a.id]) - MARKET_ITEMS.indexOf(byId[b.id]));

    const keeper = rollNPC({ professionType: 'merchant' });
    keeper.profession = randomArray(def.keepers);

    // dressShop (below) draws last, so the keeper and stock above replay the same for older links.
    return dressShop({
        type, wealth,
        name: rollShopName(type, keeper.firstName || keeper.name),
        keeper,
        greeting: randomArray(def.greetings),
        quirk: randomArray(SHOP_QUIRKS),
        stock,
        haggle: null
    }, pool.filter(id => byId[id].basePrice <= w.maxBase), byId);
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
function rollHaggle(shop, bonus = 0) {
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
        `Keeper: ${k.name}, ${k.race.charAt(0).toUpperCase() + k.race.slice(1)} ${k.profession}, ${k.age}. ${k.trait}. Flaw: ${k.flaw}. WIS ${k.stats.wis}, CHA ${k.stats.cha}.`,
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
    const onSale = shop.stock.filter(s => byId[s.id].basePrice >= 0.5);
    shop.sale = onSale.length && rand() < 0.6 ? { id: randomArray(onSale).id, why: randomArray(SHOP_SALE_WHY) } : null;
    const missing = pool.filter(id => !shop.stock.some(s => s.id === id));
    shop.soldOut = missing.length && rand() < 0.5 ? { id: randomArray(missing), why: randomArray(SHOP_SOLDOUT_WHY) } : null;
    return shop;
}

function fillShop(s) {
    return s.replace(/\{name\}/g, () => rollNPC({}).firstName || 'Mira');
}

// Service and buying prices follow the shop's wealth (services) or are paid flat (buying).
function shopServiceText([what, gp, per], wealth) {
    if (!gp) return `${what}: ${per}`;
    const raw = gp * SHOP_WEALTH[wealth].markup;
    // Rounded to the silver piece (copper for the cheapest), the way a keeper quotes a price.
    const price = formatCoins(raw >= 0.1 ? Math.round(raw * 10) / 10 : Math.max(0.01, Math.round(raw * 100) / 100));
    return `${what}: ${price}${per ? (/^plus/.test(per) ? `, ${per}` : ` per ${per}`) : ''}`;
}

function shopBuyingText([what, gp, unit, most]) {
    if (!gp) return `${cap1(what)}, ${unit}.`;
    return `${cap1(what)} at ${formatCoins(gp)} per ${unit}${most > 1 ? `, up to ${most}` : ''}.`;
}

// The place and its extras as [label, text] pairs, for the page, Copy Shop, and the kit. Older saves have none.
function shopDetailLines(shop) {
    if (!shop.building) return [];
    const byId = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    const lines = [['The place', `${cap1(shop.building)}. ${shop.inside}`], ['Hours', shop.hours], ['Security', cap1(shop.security) + '.']];
    if (shop.helper) lines.push(['Helping out', `${shop.helper.name}, ${/^[aeiou]/i.test(shop.helper.race) ? 'an' : 'a'} ${shop.helper.race} ${shop.helper.role}, who ${shop.helper.note}.`]);
    if (shop.services && shop.services.length) lines.push(['Services', shop.services.map(s => shopServiceText(s, shop.wealth)).join(' · ')]);
    if (shop.buying) lines.push(['Buying', shopBuyingText(shop.buying)]);
    if (shop.sale && byId[shop.sale.id]) lines.push(['On sale', `${byId[shop.sale.id].name}, ${Math.round(SHOP_SALE_OFF * 100)}% off (${shop.sale.why}).`]);
    if (shop.soldOut && byId[shop.soldOut.id]) lines.push(['Sold out', `${byId[shop.soldOut.id].name}: ${shop.soldOut.why}.`]);
    if (shop.job) lines.push(['Ask about', shop.job]);
    return lines;
}

const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
