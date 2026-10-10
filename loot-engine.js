/* ============================================================
   LOOT ENGINE (no DOM). Rolls treasure from loot-data.js.
   Shared by loot-generator.js and session-kit.js.
   ============================================================ */

// ── UTILITIES ──────────────────────────────────────────────
const roll = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick  = arr => arr[Math.floor(rand() * arr.length)];
const d100  = ()   => roll(1, 100);

// Safely resolve a coin entry: [min,max] or 0
function resolveCoin(entry, multiplier = 1, luckMult = 1) {
  if (!entry || entry === 0) return 0;
  if (Array.isArray(entry)) return Math.floor(roll(entry[0], entry[1]) * multiplier * luckMult);
  return 0;
}

// ── COIN GENERATION ────────────────────────────────────────
function generateCoins(table, luckMult = 1) {
  const cpMult = table.cpMult || 1;
  const spMult = table.spMult || 1;
  const gpMult = table.gpMult || 1;
  const ppMult = table.ppMult || 1;
  return {
    cp: resolveCoin(table.cp, cpMult, luckMult),
    sp: resolveCoin(table.sp, spMult, luckMult),
    ep: resolveCoin(table.ep, 1,      luckMult),
    gp: resolveCoin(table.gp, gpMult, luckMult),
    pp: resolveCoin(table.pp, ppMult, luckMult)
  };
}

// ── GEM GENERATION ─────────────────────────────────────────
function generateGems(chance, tier, countRange, luckMult = 1) {
  if (d100() > chance) return [];
  const count = Math.max(1, Math.floor(roll(countRange[0], countRange[1]) * luckMult));
  const pool  = lootData.gems[tier] || lootData.gems['10'];
  const value = parseInt(tier);
  return Array.from({ length: count }, () => ({
    name: pick(pool), value, type: 'gem'
  }));
}

// ── ART GENERATION ─────────────────────────────────────────
function generateArt(chance, tier, countRange, luckMult = 1) {
  if (d100() > chance) return [];
  const count = Math.max(1, Math.floor(roll(countRange[0], countRange[1]) * luckMult));
  const pool  = lootData.art[tier] || lootData.art['25'];
  const value = parseInt(tier);
  return Array.from({ length: count }, () => ({
    name: pick(pool), value, type: 'art'
  }));
}

// ── MAGIC ITEM GENERATION ──────────────────────────────────
// d100 weights used when rarity is 'random'
const RARITY_WEIGHTS = { common:30, uncommon:25, rare:20, 'very-rare':15, legendary:8, artifact:2 };

function magicPool(rarity, type = 'any') {
  const pool = lootData.magicItems[rarity] || [];
  return type === 'any' ? pool : pool.filter(i => i.type === type);
}

// Returns null when no item of that type exists at that rarity.
function getMagicItem(rarity, type = 'any') {
  if (rarity === 'random') {
    // Only roll among rarities that actually have an item of this type.
    const options = Object.entries(RARITY_WEIGHTS).filter(([r]) => magicPool(r, type).length);
    if (!options.length) return null;
    let r = rand() * options.reduce((sum, [, w]) => sum + w, 0);
    rarity = options.find(([, w]) => (r -= w) < 0)?.[0] || options[options.length - 1][0];
  }
  const pool = magicPool(rarity, type);
  if (!pool.length) return null;
  const item = pick(pool);
  return {
    name:      item.name,
    rarity,
    type:      item.type,
    attune:    item.attune || false,
    value:     magicItemGP(rarity)
  };
}

function generateMagicItems(tableCode, count = 1) {
  const rarity = lootData.magicTables[tableCode] || 'uncommon';
  return Array.from({ length: count }, () => getMagicItem(rarity));
}

function magicItemGP(rarity) {
  return { common:100, uncommon:500, rare:5000, 'very-rare':50000, legendary:500000, artifact:0 }[rarity] || 0;
}

// ── TOTAL VALUE ────────────────────────────────────────────
function totalGP(coins, gems, art, magic) {
  let t = 0;
  t += (coins.cp || 0) * 0.01;
  t += (coins.sp || 0) * 0.1;
  t += (coins.ep || 0) * 0.5;
  t += (coins.gp || 0);
  t += (coins.pp || 0) * 10;
  gems.forEach(g  => t += g.value);
  art.forEach(a   => t += a.value);
  magic.forEach(m => t += m.value);
  return Math.floor(t);
}

// ── TABLE ROLLS ────────────────────────────────────────────
// kind: 'individual' | 'hoard'; cr: '0-4' | '5-10' | '11-16' | '17+'
function rollTreasure(kind, cr, luckMult = 1, includeMagic = true) {
  const t = lootData.treasureTables[kind][cr];
  const coins = generateCoins(t, luckMult);
  let gems, art, magic = [];
  if (kind === 'hoard') {
    gems = generateGems(t.gemChance, t.gemTier, [2, 8], luckMult);
    art  = generateArt (t.artChance, t.artTier, [1, 6], luckMult);
    if (includeMagic && d100() <= t.magicChance) {
      magic = generateMagicItems(t.magicTable, roll(t.magicCount[0], t.magicCount[1]));
    }
  } else {
    gems = d100() <= t.gemChance ? generateGems(100, t.gemTier, [2, 6], luckMult) : [];
    art  = d100() <= t.artChance ? generateArt (100, t.artTier, [1, 4], luckMult) : [];
    if (includeMagic && d100() <= t.magicChance) magic = generateMagicItems(t.magicTable, 1);
  }
  return { coins, gems, art, magic, totalValue: totalGP(coins, gems, art, magic) };
}
