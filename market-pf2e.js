/* ============================================
   REALM MARKET EXCHANGE, PATHFINDER: on a Pathfinder page (<html data-system="pf2e">),
   swaps the market's item list for Pathfinder's, in place, so the Exchange and the shops
   price it with the same model. Load after market-data.js and pf2e-items-data.js.
   Items: the common and uncommon ones from Player Core 1-2 and GM Core (ORC License),
   at their book prices, with an item level. The core books don't price food, livestock,
   wagons, or bulk trade goods, so those stay from the 5e list at a tenth of the price
   (ruleCoins), level 0.
   ============================================ */

// The 5e goods Pathfinder's core books have no entry for: food and drink, trade goods,
// mounts and vehicles, and plain household things.
const MARKET_PF2E_LOCAL = [
    'abacus', 'ball-bearings-bag-of-1000', 'barrel', 'basket', 'bell', 'blanket', 'block-and-tackle', 'book',
    'bottle-glass', 'bucket', 'case-map-or-scroll', 'clothes-costume', 'flask-or-tankard', 'ink-1-ounce-bottle',
    'ink-pen', 'jug-or-pitcher', 'lamp', 'magnifying-glass', 'mess-kit', 'oil-flask', 'paper-sheet',
    'parchment-sheet', 'perfume-vial', 'pick-miner-s', 'pot-iron', 'pouch', 'quiver', 'ram-portable', 'robes',
    'sealing-wax', 'shovel', 'signet-ring', 'spikes-iron-10', 'vial', 'whetstone', 'hunting-trap', 'case-crossbow-bolt',
    'dice-set', 'playing-card-set',
    'horse-draft', 'horse-riding', 'mule', 'pony', 'warhorse', 'camel', 'elephant', 'cart', 'chariot', 'carriage',
    'saddle-military', 'saddle-riding', 'sled', 'stabling-per-day', 'feed-per-day', 'land-vehicle',
    'ale-gallon', 'bread-loaf', 'cheese-wedge', 'chicken', 'fish-fresh', 'meat-chunk', 'wine-bottle', 'wine-fine-bottle',
    'salt-pound', 'spices-pound', 'sugar-pound', 'flour-pound', 'grain-bushel', 'hay-bale', 'wood-cord', 'coal-bag',
    'iron-pound', 'steel-pound', 'copper-pound', 'silver-pound', 'gold-pound', 'platinum-pound',
    'silk-yard', 'velvet-yard', 'linen-yard', 'wool-yard', 'leather-square-yard', 'fur-pelt',
    'dragon-scale', 'phoenix-feather', 'unicorn-horn'
];

// 5e ids → the Pathfinder item a shop's list means by them.
const MARKET_PF2E_ALIAS = {
    'rope-hempen-50-feet': 'rope', 'rope-silk-50-feet': 'rope', 'tinderbox': 'flint-and-steel', 'rations-1-day': 'rations',
    'chalk-1-piece': 'chalk', 'pole-10-foot': 'ten-foot-pole', 'tent-two-person': 'tent-pup', 'mirror-steel': 'mirror',
    'lantern-bullseye': 'lantern-bull-s-eye', 'scale-merchant-s': 'merchant-s-scale', 'climber-s-kit': 'climbing-kit',
    'clothes-common': 'clothing-ordinary', 'clothes-fine': 'clothing-fine', 'clothes-traveler-s': 'explorer-s-clothing',
    'lock': 'lock-poor', 'manacles': 'manacles-poor', 'spellbook': 'spellbook-blank', 'hammer-sledge': 'hammer',
    'healer-s-kit': 'healer-s-toolkit', 'medicine-kit': 'healer-s-toolkit', 'herbalism-kit': 'healer-s-toolkit',
    'thieves-tools': 'thieves-toolkit', 'alchemist-s-supplies': 'alchemist-s-toolkit', 'poisoner-s-kit': 'alchemist-s-toolkit',
    'forgery-kit': 'writing-set', 'calligrapher-s-supplies': 'writing-set', 'navigation-tools': 'compass',
    'cartographer-s-tools': 'compass', 'cook-s-utensils': 'cookware',
    'brewer-s-supplies': 'artisan-s-toolkit', 'carpenter-s-tools': 'artisan-s-toolkit', 'cobbler-s-tools': 'artisan-s-toolkit',
    'glassblower-s-tools': 'artisan-s-toolkit', 'jeweler-s-tools': 'artisan-s-toolkit', 'leatherworker-s-tools': 'artisan-s-toolkit',
    'mason-s-tools': 'artisan-s-toolkit', 'painter-s-supplies': 'artisan-s-toolkit', 'potter-s-tools': 'artisan-s-toolkit',
    'smith-s-tools': 'artisan-s-toolkit', 'tinker-s-tools': 'repair-toolkit', 'weaver-s-tools': 'artisan-s-toolkit',
    'woodcarver-s-tools': 'artisan-s-toolkit',
    'potion-of-healing': 'healing-potion-minor', 'potion-of-greater-healing': 'healing-potion-lesser',
    'potion-of-superior-healing': 'healing-potion-moderate', 'potion-of-supreme-healing': 'healing-potion-greater',
    'antitoxin-vial': 'antidote-lesser', 'antidote': 'antidote-lesser', 'alchemist-s-fire': 'alchemist-s-fire-lesser',
    'acid-flask': 'acid-flask-lesser', 'poison-basic-vial': 'arsenic', 'restorative-ointment': 'elixir-of-life-minor',
    'spell-scroll-cantrip': 'scroll-of-1st-rank-spell', 'spell-scroll-1st-level': 'scroll-of-1st-rank-spell',
    'spell-scroll-2nd-level': 'scroll-of-2nd-rank-spell', 'spell-scroll-3rd-level': 'scroll-of-3rd-rank-spell',
    'spell-scroll-4th-level': 'scroll-of-4th-rank-spell', 'spell-scroll-5th-level': 'scroll-of-5th-rank-spell',
    'crossbow-light': 'crossbow', 'crossbow-heavy': 'heavy-crossbow', 'crossbow-hand': 'hand-crossbow',
    'arrows-20': 'arrows', 'crossbow-bolts-20': 'bolts', 'sling-bullets-20': 'sling-bullets', 'blowgun-needles-50': 'blowgun-darts',
    'ammunition-box': 'quiver', 'battleaxe': 'battle-axe', 'quarterstaff': 'staff', 'handaxe': 'hatchet', 'war-pick': 'pick',
    'studded-leather': 'studded-leather-armor', 'ring-mail': 'chain-shirt', 'splint-armor': 'splint-mail',
    'plate-armor': 'full-plate', 'shield': 'wooden-shield'
};

const MARKET_PF2E_CATEGORIES = {
    'weapons': 'Weapons & Ammunition',
    'armor': 'Armor & Shields',
    'adventuring-gear': 'Adventuring Gear',
    'tools': 'Toolkits & Kits',
    'mounts': 'Mounts & Vehicles',
    'trade-goods': 'Trade Goods, Gems & Art',
    'consumables': 'Alchemy & Consumables',
    'magic-items': 'Magic Items & Runes',
};

const MARKET_PF2E_TOOL = /toolkit|^tool-|^alchemist-s-lab$|^climbing-kit$|^disguise-kit|^fishing-tackle$|^musical-instrument|^writing-set|^cookware$|^compass$|^spyglass$|^merchant-s-scale$/;

// A Pathfinder item's market category, or null when it doesn't trade (coins, unpriced).
function marketPf2eCategory(it, id) {
    const tr = it.tr || [];
    const magic = tr.includes('magical') || tr.includes('divine') || tr.includes('occult') || tr.includes('primal') || tr.includes('arcane');
    switch (it.k) {
        case 't': return it.ct === 'gem' || it.ct === 'art-object' ? 'trade-goods' : null;
        case 'w': return tr.includes('bomb') ? 'consumables' : magic ? 'magic-items' : 'weapons';
        case 'm': return magic || tr.includes('consumable') || tr.includes('alchemical') ? 'consumables' : 'weapons';
        case 'a': case 's': return magic ? 'magic-items' : 'armor';
        case 'r': return 'magic-items';
        case 'c':
            if (it.ct === 'wand') return 'magic-items';
            if (it.ct === 'toolkit') return 'tools';
            return !it.l && !tr.length ? 'adventuring-gear' : 'consumables';
        default:
            if (tr.includes('precious')) return 'trade-goods';
            if (MARKET_PF2E_TOOL.test(id)) return 'tools';
            return it.l > 0 || magic ? 'magic-items' : 'adventuring-gear';
    }
}

// The top of each item level's price band (gp), after GM Core's item prices by level: level 0 to 10 gp,
// level 1 to 20 gp, … level 20 to 70,000 gp.
const MARKET_PF2E_BANDS = [10, 20, 35, 60, 100, 160, 250, 360, 500, 700, 1000, 1400, 2000, 3000, 4500, 6500, 10000, 15000, 24000, 40000, 70000];

// The level a shop must reach to stock an item: its level, or the level its price belongs to when that's
// higher (gems, art, and precious materials are level 0 in the books whatever they cost).
function marketPf2eTier(level, gp) {
    const band = MARKET_PF2E_BANDS.findIndex(top => gp <= top);
    return Math.max(level, band < 0 ? 20 : band);
}

(function () {
    if (ruleSystemId() !== 'pf2e' || typeof PF2E_ITEMS === 'undefined') return;
    const order = Object.keys(MARKET_PF2E_CATEGORIES);
    const fiveE = Object.fromEntries(MARKET_ITEMS.map(i => [i.id, i]));
    const items = [];
    Object.entries(PF2E_ITEMS).forEach(([id, it]) => {
        if (!it.p || it.ra === 'r' || it.ra === 'q') return;
        const category = marketPf2eCategory(it, id);
        if (!category) return;
        // tier: the level a shop must reach to stock it; kind, type, group: PF2E_ITEMS k, ct, and g (weapon
        // group), for the shops' stock rules (shop-pf2e.js)
        const gp = it.p / 100;
        // A property rune's book name is only its effect ("Returning"); the market says what it is.
        const name = it.k === 'r' && !/\brune\b/i.test(it.n) ? `${it.n} Rune` : it.n;
        items.push({ id, name: it.pe > 1 ? `${name} (${it.pe})` : name, category, basePrice: gp, level: it.l || 0, tier: marketPf2eTier(it.l || 0, gp),
            rarity: it.ra === 'u' ? 'uncommon' : 'common', kind: it.k, type: it.ct || '', group: it.g || '', traits: it.tr || [] });
    });
    MARKET_PF2E_LOCAL.forEach(id => {
        const i = fiveE[id];
        if (!i || PF2E_ITEMS[id]) return;
        const gp = Math.max(0.01, Math.round(ruleCoins(i.basePrice) * 100) / 100);
        items.push({ ...i, basePrice: gp, level: 0, tier: marketPf2eTier(0, gp), rarity: 'common', kind: '', type: '', group: '', traits: [], local: true });
    });
    items.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.level - b.level || a.basePrice - b.basePrice || a.name.localeCompare(b.name));

    MARKET_ITEMS.length = 0;
    MARKET_ITEMS.push(...items);
    Object.keys(MARKET_CATEGORIES).forEach(k => { delete MARKET_CATEGORIES[k]; });
    Object.assign(MARKET_CATEGORIES, MARKET_PF2E_CATEGORIES);
    Object.assign(MARKET_ALIAS, MARKET_PF2E_ALIAS);
})();
