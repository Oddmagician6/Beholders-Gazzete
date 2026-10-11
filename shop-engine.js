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
        greetings: ["If we don't have it, you don't need it. If you need it, we're out.", "Rope's in the back. Everyone wants rope.", "Wipe your boots. Last party tracked in an ooze."]
    },
    blacksmith: {
        label: 'Blacksmith & Armorer', icon: '⚒️',
        keepers: ['Blacksmith', 'Armorer', 'Weaponsmith', 'Smith'],
        categories: ['weapons', 'armor'],
        ids: ['smith-s-tools', 'chain-10-feet', 'spikes-iron-10', 'piton', 'crowbar', 'hammer', 'hammer-sledge', 'manacles', 'lock', 'pot-iron', 'whetstone', 'iron-pound', 'steel-pound'],
        exclude: ['shortbow', 'longbow', 'crossbow-light', 'crossbow-hand', 'crossbow-heavy', 'sling', 'blowgun', 'net',
                  'arrows-20', 'blowgun-needles-50', 'crossbow-bolts-20', 'sling-bullets-20', 'quarterstaff', 'club', 'greatclub', 'padded-armor', 'leather-armor', 'studded-leather', 'hide-armor'],
        count: [10, 16],
        greetings: ["Mind the anvil. It's older than you and twice as stubborn.", "Pointy end goes in the other fellow. That's the only lesson that's free.", "Repairs are extra. Dragon damage is extra-extra."]
    },
    bowyer: {
        label: 'Bowyer & Fletcher', icon: '🏹',
        keepers: ['Bowyer', 'Fletcher', 'Archer (Retired)'],
        categories: [],
        ids: ['shortbow', 'longbow', 'crossbow-light', 'crossbow-hand', 'crossbow-heavy', 'sling', 'blowgun', 'arrows-20', 'crossbow-bolts-20',
              'blowgun-needles-50', 'sling-bullets-20', 'quiver', 'case-crossbow-bolt', 'javelin', 'dart', 'net', 'hunting-trap', 'ammunition-box'],
        exclude: [],
        count: [7, 12],
        greetings: ["Don't test the draw weight in here. The ceiling has suffered enough.", "Arrows come back if you're good. Mostly they don't.", "Every bow in this shop has hit something. Not always the target."]
    },
    alchemist: {
        label: 'Alchemist & Apothecary', icon: '⚗️',
        keepers: ['Alchemist', 'Apothecary', 'Herbalist', 'Potion Seller'],
        categories: ['consumables'],
        ids: ['alchemist-s-supplies', 'herbalism-kit', 'poisoner-s-kit', 'medicine-kit', 'vial', 'bottle-glass', 'perfume-vial', 'oil-flask', 'soap', 'spices-pound'],
        exclude: ['scroll-of-protection', 'spell-scroll-cantrip', 'spell-scroll-1st-level', 'spell-scroll-2nd-level', 'spell-scroll-3rd-level', 'spell-scroll-4th-level', 'spell-scroll-5th-level'],
        count: [8, 14],
        greetings: ["Don't touch the green one. Or the other green one.", "Side effects are part of the experience.", "Everything's labeled. Some labels are even accurate."]
    },
    arcane: {
        label: 'Arcane Emporium', icon: '🔮',
        keepers: ['Scroll Merchant', 'Enchanter', 'Hedge Wizard', 'Arcanist'],
        categories: ['magic-items'],
        ids: ['spell-scroll-cantrip', 'spell-scroll-1st-level', 'spell-scroll-2nd-level', 'spell-scroll-3rd-level', 'spell-scroll-4th-level',
              'spell-scroll-5th-level', 'scroll-of-protection', 'component-pouch', 'spellbook', 'ink-1-ounce-bottle', 'parchment-sheet', 'potion-of-invisibility'],
        exclude: [],
        count: [6, 10],
        greetings: ["Browse with your eyes. The last fellow who browsed with his hands is the umbrella stand now.", "All sales final. Some curses also final.", "Yes, the owl is for sale. No, the owl has not agreed to that."]
    },
    stable: {
        label: 'Stable & Wainwright', icon: '🐴',
        keepers: ['Livestock Trader', 'Stablehand', 'Wainwright', 'Horse Trader'],
        categories: ['mounts'],
        ids: ['hay-bale', 'grain-bushel', 'rope-hempen-50-feet', 'blanket'],
        exclude: [],
        count: [6, 10],
        greetings: ["That one bites. That one also bites. Assume they all bite.", "Stabling's by the day. Griffons are by the hour, for your safety.", "No refunds on mules. The mule decides when the sale is final."]
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
        greetings: ["The cheese is aged. So is the fish, but less on purpose.", "Rations for the road? They'll outlive you. Good value.", "Fresh today. Or yesterday. It's fresh to someone."]
    },
    tinker: {
        label: "Tinker's Workshop", icon: '⚙️',
        keepers: ['Tinker', 'Clockmaker', 'Map Maker', 'Artificer'],
        categories: ['tools'],
        ids: ['hourglass', 'lock', 'magnifying-glass', 'spyglass', 'abacus', 'lantern-bullseye', 'lantern-hooded', 'lamp', 'mirror-steel',
              'block-and-tackle', 'scale-merchant-s', 'ball-bearings-bag-of-1000', 'signal-whistle'],
        exclude: ['disguise-kit', 'forgery-kit', 'thieves-tools', 'poisoner-s-kit', 'land-vehicle', 'herbalism-kit', 'medicine-kit'],
        count: [8, 14],
        greetings: ["Careful, that one's wound up. So am I.", "If it ticks, I made it. If it explodes, I made it earlier.", "Some assembly required. Some disassembly unavoidable."]
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
        greetings: ["No questions asked. Also no questions answered.", "That sword? Belonged to a hero. Briefly.", "Everything here has a story. Most of them end badly."]
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

    return {
        type, wealth,
        name: rollShopName(type, keeper.name),
        keeper,
        greeting: randomArray(def.greetings),
        quirk: randomArray(SHOP_QUIRKS),
        stock,
        haggle: null
    };
}

// Live prices for a shop's stock at time t (default now), with wealth markup and any haggle result.
// listPrice is the price before the haggle (the same as price when there's none).
function shopPrices(shop, t = Date.now()) {
    const byId = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    const markup = SHOP_WEALTH[shop.wealth].markup;
    const mod = markup * (shop.haggle ? shop.haggle.priceMod : 1);
    const coins = gp => Math.max(0.01, Math.round(gp * 100) / 100);
    return shop.stock.filter(s => byId[s.id]).map(s => {
        const item = byId[s.id];
        const now = marketPrice(item, t), dayAgo = marketPrice(item, t - MARKET_DAY_MS);
        return {
            ...s, name: item.name, category: item.category,
            price: coins(now * mod), listPrice: coins(now * markup),
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

// Plain-text shop for Copy Shop / Copy Kit. limit caps the stock lines (the kit shows fewer).
function shopTextLines(shop, limit = Infinity) {
    const def = SHOP_TYPES[shop.type], k = shop.keeper;
    const prices = shopPrices(shop);
    const lines = [
        `${shop.name}`,
        `${def.label} · ${SHOP_WEALTH[shop.wealth].label}`,
        `Keeper: ${k.name}, ${k.race.charAt(0).toUpperCase() + k.race.slice(1)} ${k.profession}. ${k.trait}. WIS ${k.stats.wis}, CHA ${k.stats.cha}.`,
        `"${shop.greeting}"`,
        `Quirk: ${shop.quirk}`
    ];
    if (shop.haggle) lines.push(`Haggled: ${shop.haggle.outcome} (${haggleDiceText(shop.haggle)})`);
    lines.push('Stock:');
    prices.slice(0, limit).forEach(p => lines.push(`- ${p.name}${p.qty > 1 ? ` ×${p.qty}` : ''}: ${formatCoins(p.price)}${wasPrice(p) ? ` (was ${formatCoins(p.listPrice)})` : ''}`));
    if (prices.length > limit) lines.push(`- …and ${prices.length - limit} more`);
    return lines;
}
