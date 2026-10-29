/* ============================================
   MERCHANT'S ROW, PATHFINDER: on a Pathfinder page, fits the shop engine to
   Pathfinder's items (market-pf2e.js). Load after shop-engine.js.
   Wealth sets the highest item level a shop stocks, the way a settlement's level
   does in GM Core; shops carry common items only. Each shop type keeps its 5e list
   (MARKET_ALIAS reads it as Pathfinder items) plus a rule for the Pathfinder items
   that fit it. Haggling is a Diplomacy check against the keeper's Will DC.
   ============================================ */

// Highest item level each wealth stocks (the Gazette's reading of GM Core's settlement levels).
const SHOP_PF2E_LEVEL = { poor: 2, modest: 6, wealthy: 12 };

const pfHas = (i, t) => i.traits && i.traits.includes(t);
const pfRanged = i => i.kind === 'w' && /^(bow|crossbow|sling|dart)$/.test(i.group);

// Per type: match, the Pathfinder items it also stocks; drop, the ones it leaves out.
const SHOP_PF2E_STOCK = {
    blacksmith: { drop: i => pfRanged(i) || i.kind === 'm' || i.type === 'unarmored' || /barding/.test(i.type) || ['staff', 'club', 'greatclub', 'padded-armor', 'leather-armor', 'studded-leather-armor', 'hide-armor', 'wooden-shield', 'bo-staff', 'nunchaku', 'sap', 'whip'].includes(i.id) },
    bowyer: { match: i => (pfRanged(i) && i.category === 'weapons') || (i.kind === 'm' && i.category === 'weapons') },
    alchemist: { match: i => i.category === 'consumables' && (pfHas(i, 'alchemical') || i.type === 'potion') && i.type !== 'snare' },
    arcane: { match: i => i.category === 'magic-items' || (i.category === 'consumables' && !pfHas(i, 'alchemical') && i.type !== 'snare') },
    temple: { match: i => /^religious-|^pilgrim-s-token$|^healing-potion-|^antidote-|^antiplague-|^elixir-of-life-/.test(i.id) || (pfHas(i, 'divine') && pfHas(i, 'consumable')) },
    tinker: { match: i => i.category === 'tools' || (i.category === 'magic-items' && pfHas(i, 'clockwork')) },
    curio: { match: i => i.type === 'art-object' && i.tier <= 1 },
    jeweler: { match: i => i.type === 'gem' || i.type === 'art-object' },
    moneychanger: { match: i => i.type === 'gem' },
    herbalist: { match: i => /^healing-potion-|^antidote-|^antiplague-|^elixir-of-life-|^healer-s-toolkit/.test(i.id) || (pfHas(i, 'plant') && i.category === 'consumables') },
    guild: { match: i => i.kind === 'w' && !pfHas(i, 'magical') && i.level === 0 && !pfHas(i, 'bomb') && i.group !== 'shield' },
    monster: { match: i => i.type === 'poison' || i.type === 'snare' }
};

(function () {
    if (ruleSystemId() !== 'pf2e') return;
    Object.entries(SHOP_PF2E_LEVEL).forEach(([w, lv]) => { SHOP_WEALTH[w].maxLevel = lv; });
    Object.entries(SHOP_PF2E_STOCK).forEach(([type, rule]) => {
        const def = SHOP_TYPES[type];
        if (rule.match) def.match = rule.match;
        if (rule.drop) def.exclude = def.exclude.concat(MARKET_ITEMS.filter(rule.drop).map(i => i.id));
    });
    // Rewards and fees in the shops' text are 5e gold: "will pay 100 gp" is 10 gp here.
    const coins = s => s.replace(/(\d[\d,]*) gp\b/g, (m, n) => formatCoins(ruleCoins(Number(n.replace(/,/g, '')))));
    Object.values(SHOP_DETAILS).forEach(d => {
        d.jobs = d.jobs.map(coins);
        d.services.forEach(s => { if (s[2] === 'spell level') s[2] = 'spell rank'; });
    });
    SHOP_GENERIC_JOBS.forEach((s, i) => { SHOP_GENERIC_JOBS[i] = coins(s); });
})();

// One haggle per shop: Diplomacy (d20 + bonus) against the keeper's Will DC, 13 + their Wisdom
// modifier (+2 if prosperous). Ten over is a critical success, ten under a critical failure, and a
// natural 20 or 1 moves the result one step (Player Core's degrees of success).
function rollHagglePf2e(shop, bonus = 0) {
    const d20 = randomInt(1, 20);
    const total = d20 + bonus;
    const dc = 13 + abilityMod(shop.keeper.stats.wis) + (shop.wealth === 'wealthy' ? 2 : 0);
    let degree = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
    if (d20 === 20) degree = Math.min(3, degree + 1);
    if (d20 === 1) degree = Math.max(0, degree - 1);
    const [priceMod, outcome] = [
        [1.1, 'Critical failure. Insulted: prices go up 10% "for the inconvenience."'],
        [1, 'Failure. The shopkeeper doesn\'t budge. Prices stay put.'],
        [0.9, 'Success: a fair deal, 10% off everything.'],
        [0.8, 'Critical success! 20% off everything, and the keeper mutters about their family.']
    ][degree];
    return { d20, bonus, total, dc, priceMod, outcome };
}
