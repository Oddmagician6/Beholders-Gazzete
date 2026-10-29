/* ============================================================
   PATHFINDER 2E TREASURE (no DOM). Loaded after loot-engine.js on the
   Pathfinder Loot Generator only, with pf2e-items-data.js (and
   pf2e-spells-data.js for the spells in scrolls and wands).
   Treasure follows GM Core's Party Treasure by Level: per party level,
   permanent items, consumables, and currency for four characters.
   The find (who carried it, the lock, the trap, the story) is the
   loot engine's own decorateTreasure, with level-based DCs.
   ============================================================ */

// GM Core, Party Treasure by Level (four characters): total value (gp), permanent items and
// consumables as [item level, count], party currency (gp), and currency per character past four.
const PF2E_TREASURE = [
  null,
  { total: 175, perm: [[2, 2], [1, 2]], cons: [[2, 2], [1, 3]], cur: 40, perPC: 10 },
  { total: 300, perm: [[3, 2], [2, 2]], cons: [[3, 2], [2, 2], [1, 2]], cur: 70, perPC: 18 },
  { total: 500, perm: [[4, 2], [3, 2]], cons: [[4, 2], [3, 2], [2, 2]], cur: 120, perPC: 30 },
  { total: 850, perm: [[5, 2], [4, 2]], cons: [[5, 2], [4, 2], [3, 2]], cur: 200, perPC: 50 },
  { total: 1350, perm: [[6, 2], [5, 2]], cons: [[6, 2], [5, 2], [4, 2]], cur: 320, perPC: 80 },
  { total: 2000, perm: [[7, 2], [6, 2]], cons: [[7, 2], [6, 2], [5, 2]], cur: 500, perPC: 125 },
  { total: 2900, perm: [[8, 2], [7, 2]], cons: [[8, 2], [7, 2], [6, 2]], cur: 720, perPC: 180 },
  { total: 4000, perm: [[9, 2], [8, 2]], cons: [[9, 2], [8, 2], [7, 2]], cur: 1000, perPC: 250 },
  { total: 5700, perm: [[10, 2], [9, 2]], cons: [[10, 2], [9, 2], [8, 2]], cur: 1400, perPC: 350 },
  { total: 8000, perm: [[11, 2], [10, 2]], cons: [[11, 2], [10, 2], [9, 2]], cur: 2000, perPC: 500 },
  { total: 11500, perm: [[12, 2], [11, 2]], cons: [[12, 2], [11, 2], [10, 2]], cur: 2800, perPC: 700 },
  { total: 16500, perm: [[13, 2], [12, 2]], cons: [[13, 2], [12, 2], [11, 2]], cur: 4000, perPC: 1000 },
  { total: 25000, perm: [[14, 2], [13, 2]], cons: [[14, 2], [13, 2], [12, 2]], cur: 6000, perPC: 1500 },
  { total: 36500, perm: [[15, 2], [14, 2]], cons: [[15, 2], [14, 2], [13, 2]], cur: 9000, perPC: 2250 },
  { total: 54500, perm: [[16, 2], [15, 2]], cons: [[16, 2], [15, 2], [14, 2]], cur: 13000, perPC: 3250 },
  { total: 82500, perm: [[17, 2], [16, 2]], cons: [[17, 2], [16, 2], [15, 2]], cur: 20000, perPC: 5000 },
  { total: 128000, perm: [[18, 2], [17, 2]], cons: [[18, 2], [17, 2], [16, 2]], cur: 30000, perPC: 7500 },
  { total: 208000, perm: [[19, 2], [18, 2]], cons: [[19, 2], [18, 2], [17, 2]], cur: 48000, perPC: 12000 },
  { total: 355000, perm: [[20, 2], [19, 2]], cons: [[20, 2], [19, 2], [18, 2]], cur: 80000, perPC: 20000 },
  { total: 490000, perm: [[20, 4]], cons: [[20, 4], [19, 2]], cur: 140000, perPC: 35000 }
];

// The hoard picker's shares of a level's treasure.
const PF2E_SHARES = { level: 1, half: 0.5, quarter: 0.25, small: 0.125 };

// Wands and staves are permanent items (Foundry files wands with the consumables).
const pf2eIsStaff = i => (i.tr || []).includes('staff');
const pf2eIsWand = i => i.ct === 'wand' || (i.tr || []).includes('wand');
const pf2eConsumable = i => (i.k === 'c' && i.ct !== 'wand') || i.k === 'm';

// Item kinds the Items tab filters by: a test on an item record (pf2e-items-data.js keys).
const PF2E_KINDS = {
  any: () => true,
  permanent: i => !pf2eConsumable(i),
  consumable: pf2eConsumable,
  weapon: i => i.k === 'w' && !pf2eIsStaff(i),
  armor: i => i.k === 'a',
  shield: i => i.k === 's',
  rune: i => i.k === 'r',
  worn: i => i.k === 'e' && /^worn/.test(i.u || ''),
  held: i => i.k === 'e' && !/^worn/.test(i.u || ''),
  potion: i => i.ct === 'potion',
  elixir: i => i.ct === 'elixir' || i.ct === 'mutagen',
  scroll: i => i.ct === 'scroll',
  wand: pf2eIsWand,
  staff: pf2eIsStaff,
  talisman: i => i.ct === 'talisman',
  bomb: i => (i.tr || []).includes('bomb'),
  poison: i => i.ct === 'poison',
  snare: i => i.ct === 'snare'
};

// Never rolled: no price, plain level-0 gear (a rope, a club), a curse, or one of a kind.
const pf2eRollable = i => i.p > 0 && i.k !== 't' && i.ra !== 'q'
  && (i.l > 0 || (i.tr || []).some(t => t === 'magical' || t === 'alchemical'))
  && !(i.tr || []).some(t => t === 'cursed' || t === 'artifact' || t === 'intelligent');

const PF2E_ITEM_LIST = Object.entries(PF2E_ITEMS).map(([key, i]) => ({ key, ...i }));
const PF2E_GEMS = PF2E_ITEM_LIST.filter(i => i.k === 't' && (i.ct === 'gem' || i.ct === 'art-object') && i.p > 0);

// Which picture an item gets on its card (img/item/<kind>.webp).
function pf2eItemImg(i) {
  if (pf2eIsStaff(i)) return 'staff';
  if (i.k === 'w' || i.k === 'm') return 'weapon';
  if (i.k === 'a' || i.k === 's') return 'armor';
  if (i.ct === 'scroll') return 'scroll';
  if (pf2eIsWand(i)) return 'wand';
  if (['potion', 'elixir', 'oil', 'mutagen', 'poison'].includes(i.ct)) return 'potion';
  if (/ring/i.test(i.u || '') || /\bRing\b/.test(i.n)) return 'ring';
  return 'wondrous-item';
}

// The kind line under an item's name: "Consumable · Potion", "Weapon · Martial", "Worn item".
function pf2eItemKind(i) {
  if (pf2eIsStaff(i)) return 'Staff';
  if (pf2eIsWand(i)) return 'Wand';
  const word = { w: 'Weapon', a: 'Armor', s: 'Shield', m: 'Ammunition', c: 'Consumable', r: 'Rune', t: 'Treasure' }[i.k]
    || (/^worn/.test(i.u || '') ? 'Worn item' : 'Held item');
  const cat = i.ct && i.ct !== 'other' ? lootCap(i.ct.replace(/-/g, ' ')) : '';
  return cat && i.k !== 'e' ? `${word} · ${cat}` : word;
}

const PF2E_RARITY = { u: 'uncommon', r: 'rare', q: 'unique' };
const pf2eOrdinal = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

// A scroll or wand of "Nth-rank Spell" gets a common spell of that rank.
function pf2eSpellFor(i) {
  const m = /(\d+)(?:st|nd|rd|th)-Rank Spell/i.exec(i.n);
  if (!m || typeof PF2E_SPELLS === 'undefined') return null;
  const rank = Number(m[1]);
  const pool = Object.keys(PF2E_SPELLS).filter(k => { const s = PF2E_SPELLS[k]; return s.k === 's' && s.r === rank && !s.ra; });
  return pool.length ? lootPick(pool) : null;
}

// Fundamental runes (weapon potency, striking, armor potency, resilient) come etched on a
// base weapon or suit of armor half the time: "+1 Longsword", "Striking Spear".
const PF2E_FUNDAMENTAL = /^(Weapon|Armor) Potency \(\+(\d)\)$|^(Greater |Major )?(Striking|Resilient)$/;

function pf2eEtch(i, entry) {
  const m = PF2E_FUNDAMENTAL.exec(i.n);
  if (!m || rand() < 0.5) return;
  const armor = m[1] === 'Armor' || m[4] === 'Resilient';
  const base = lootPick(PF2E_ITEM_LIST.filter(b => b.l === 0 && b.p > 0 && !b.ra && (armor ? b.k === 'a' && b.ct !== 'unarmored' : b.k === 'w' && b.ct !== 'unarmed')));
  entry.name = m[2] ? `+${m[2]} ${base.n}` : `${m[3] || ''}${m[4]} ${base.n}`;
  entry.on = base.key;
  entry.value += base.p / 100;
}

// One rolled item, as the loot page's magic list holds it.
function pf2eEntry(i) {
  const e = {
    name: i.n, pf: i.key, level: i.l, rarity: PF2E_RARITY[i.ra] || 'common', type: pf2eItemKind(i),
    img: pf2eItemImg(i), invested: (i.tr || []).includes('invested'), value: i.p / 100
  };
  if (i.pe > 1) { e.name = `${i.n} (${i.pe})`; }
  const spell = pf2eSpellFor(i);
  if (spell) {
    e.spell = spell;
    e.name = i.n.replace(/(\d+(?:st|nd|rd|th))-Rank Spell/i, (s, r) => `${PF2E_SPELLS[spell].n}, ${r.toLowerCase()} rank`);
  }
  if (i.k === 'r') pf2eEtch(i, e);
  return e;
}

// An item of a level (or the nearest level below that has one). kind: a PF2E_KINDS key;
// rarity: 'any', 'common', 'uncommon', 'rare' ('any' rolls common with a 1-in-10 uncommon).
function pf2eRollItem(level, kind = 'any', rarity = 'any') {
  const test = PF2E_KINDS[kind] || PF2E_KINDS.any;
  const want = rarity === 'any' ? (rand() < 0.1 ? 'uncommon' : 'common') : rarity;
  const ra = { common: undefined, uncommon: 'u', rare: 'r' };
  const levels = level === 'any' ? ['any'] : Array.from({ length: level + 1 }, (_, k) => level - k);
  for (const l of levels) {
    const fits = PF2E_ITEM_LIST.filter(i => pf2eRollable(i) && test(i) && (l === 'any' || i.l === l));
    if (!fits.length) continue;
    const pool = fits.filter(i => i.ra === ra[want]);
    if (pool.length) return pf2eEntry(lootPick(pool));
    if (rarity === 'any') { const common = fits.filter(i => !i.ra); return pf2eEntry(lootPick(common.length ? common : fits)); }
  }
  return null;
}

// Coins for a gp value: platinum past level 8, silver and copper at low levels.
function pf2eCoins(gp, level) {
  const cp = Math.max(0, Math.round(gp * 100));
  const pp = level >= 8 ? Math.floor(cp * (0.2 + rand() * 0.2) / 1000) : 0;
  let left = cp - pp * 1000;
  const sp = Math.floor(left * (level <= 4 ? 0.15 + rand() * 0.2 : rand() * 0.05) / 10);
  left -= sp * 10;
  const gpc = Math.floor(left / 100);
  return { cp: left - gpc * 100, sp, ep: 0, gp: gpc, pp };
}

// Gems and art objects (GM Core's) worth about gp in all; at most n of them.
function pf2eValuables(gp, n) {
  const gems = [], art = [];
  let left = gp * 100;
  for (let k = 0; k < n; k++) {
    const fits = PF2E_GEMS.filter(g => g.p <= left && g.p >= left / 6);
    if (!fits.length) break;
    const g = lootPick(fits);
    left -= g.p;
    (g.ct === 'gem' ? gems : art).push({ name: g.n, value: g.p / 100, type: g.ct === 'gem' ? 'gem' : 'art', pf: g.key });
  }
  return { gems, art, left: left / 100 };
}

// The loot engine's tier for a level, for the find's tables (goods, holders, trinkets).
const pf2eBand = level => level <= 4 ? '0-4' : level <= 10 ? '5-10' : level <= 16 ? '11-16' : '17+';

// GM Core's DCs by level, and its lock grades by tier.
const PF2E_LEVEL_DC = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40];
const PF2E_LOCK_DCS = { '0-4': [15, 20], '5-10': [20, 25], '11-16': [25, 30], '17+': [30, 40] };
const PF2E_TRAP_DMG = { necrotic: 'void', lightning: 'electricity', psychic: 'mental' };
const PF2E_TRAP_SAVE = { Constitution: 'Fortitude', Dexterity: 'Reflex', Wisdom: 'Will' };

// A trap on the container, at the treasure's level: DC by level (setback, +2 dangerous, +5 deadly).
function pf2eTrap(level) {
  const t = lootPick(LOOT_TRAPS);
  const [sev] = lootWeighted(TRAP_SEVERITY);
  const dc = PF2E_LEVEL_DC[Math.min(20, Math.max(0, level))] + { setback: 0, dangerous: 2, deadly: 5 }[sev];
  const dice = Math.max(1, Math.round((2 + 2 * Math.floor(Math.max(0, level - 1) / 3)) * { setback: 0.5, dangerous: 1, deadly: 1.5 }[sev]));
  const find = `DC ${dc} Perception to spot, DC ${dc} Thievery to disarm.`;
  const effect = t.dmg
    ? `DC ${dc} basic ${PF2E_TRAP_SAVE[t.save]} save against ${dice}d6 ${PF2E_TRAP_DMG[t.dmg] || t.dmg} damage${t.from ? ' ' + t.from : ''}${t.after ? '; on a failure, also sickened 1' : ''}.`
    : t.effect.replace('{dc}', dc);
  return { name: t.name, severity: sev, dc, text: `${t.name} ${t.where} (${sev}). ${find} ${effect}` };
}

// kind 'individual': what one creature of that level carries. kind 'hoard': a share of the party
// level's treasure (PF2E_SHARES), for `pcs` characters. Returns the loot engine's treasure shape.
function pf2eRollTreasure(kind, level, opts = {}) {
  const luck = opts.luckMult || 1;
  const row = PF2E_TREASURE[Math.min(20, Math.max(1, level))];
  let coins, gems = [], art = [], magic = [];
  if (kind === 'individual') {
    // The Gazette's call: about a twelfth of the level's coin, a consumable one time in four.
    const gp = row.cur / 12 * (0.4 + rand() * 1.2) * luck;
    let cash = gp;
    if (rand() < 0.15) { const v = pf2eValuables(gp * 0.5, 1); gems = v.gems; art = v.art; cash = gp * 0.5 + v.left; }
    coins = pf2eCoins(cash, level);
    if (opts.items !== false && rand() < 0.25 * luck) {
      const it = pf2eRollItem(Math.max(0, level - lootRoll(0, 1)), 'consumable');
      if (it) magic.push(it);
    }
  } else {
    const share = opts.share || 0.25, pcs = opts.pcs || 4;
    const gp = Math.max(0, (row.cur + row.perPC * (pcs - 4)) * share * luck);
    const v = pf2eValuables(gp * (0.2 + rand() * 0.3), share >= 0.5 ? 8 : 4);
    gems = v.gems; art = v.art;
    coins = pf2eCoins(gp - [...gems, ...art].reduce((t, g) => t + g.value, 0), level);
    if (opts.items !== false) {
      // Each item slot of the level comes with the share's chance (a whole level keeps them all).
      for (const [list, k] of [[row.perm, 'permanent'], [row.cons, 'consumable']]) {
        list.forEach(([l, n]) => {
          for (let x = 0; x < n; x++) {
            if (share < 1 && rand() >= share * luck) continue;
            const it = pf2eRollItem(l, k);
            if (it) magic.push(it);
          }
        });
      }
    }
  }
  const t = decorateTreasure({ coins, gems, art, magic }, kind, pf2eBand(level), {
    luckMult: luck, source: opts.source, goods: opts.goods,
    lockDcs: PF2E_LOCK_DCS[pf2eBand(level)], trap: () => pf2eTrap(level)
  });
  return t;
}

// An item's card text for the page: its kind line and details, then its own text.
function pf2eItemInfo(key) {
  const i = PF2E_ITEMS[key];
  if (!i) return null;
  const bits = [`Level ${i.l}`, pf2eItemKind(i)];
  if (i.ra) bits.push(lootCap(PF2E_RARITY[i.ra]));
  const lines = [];
  const tr = (i.tr || []).map(t => t.replace(/-/g, ' '));
  if (tr.length) lines.push(`**Traits** ${tr.join(', ')}`);
  const use = [i.p ? `**Price** ${formatCoins(i.p / 100)}${i.pe > 1 ? ` for ${i.pe}` : ''}` : '', i.u ? `**Usage** ${i.u}` : '', `**Bulk** ${i.bu}`].filter(Boolean);
  lines.push(use.join('; '));
  if (i.dm) lines.push(`**Damage** ${i.dm}${i.g ? `; **Group** ${i.g}` : ''}${i.rg ? `; **Range** ${i.rg} feet` : ''}${i.rl ? `; **Reload** ${i.rl}` : ''}`);
  if (i.k === 'a') lines.push(`**AC Bonus** +${i.ac}${i.dx !== undefined ? `; **Dex Cap** +${i.dx}` : ''}${i.st ? `; **Strength** +${i.st}` : ''}${i.cp ? `; **Check Penalty** ${i.cp}` : ''}${i.sp ? `; **Speed Penalty** ${i.sp} feet` : ''}`);
  if (i.k === 's') lines.push(`**AC Bonus** +${i.ac}; **Hardness** ${i.hd[0]}, **HP** ${i.hd[1]} (BT ${i.hd[2]})${i.sp ? `; **Speed Penalty** ${i.sp} feet` : ''}`);
  return { meta: bits.join(' · '), text: lines.join('\n') + (i.x ? '\n' + i.x : '') };
}

// Colors for GM Core's gems that the loot engine's list (GEM_COLORS) names differently or lacks.
Object.assign(GEM_COLORS, {
  'Agate': 'banded brown and cream', 'Alabaster': 'soft translucent white', 'Diamond, large': 'clear and brilliant',
  'Diamond, small': 'clear and brilliant', 'Emerald': 'deep green', 'Emerald, brilliant green': 'brilliant grass green',
  'Garnet': 'deep red', 'Ivory': 'creamy white', 'Lapis lazuli': 'deep blue flecked with gold', 'Opal': 'milky white alive with colored fire',
  'Pearl, black': 'lustrous black', 'Pearl, irregular freshwater': 'lumpy lustrous white', 'Pearl, saltwater': 'lustrous white',
  'Pyrite': 'brassy gold, like a fool\'s nugget', 'Quartz, milky, rose, or smoky': 'cloudy pink', 'Quartz, rock crystal': 'clear as water',
  'Ruby, large': 'deep crimson', 'Ruby, small': 'deep crimson', 'Sapphire': 'cornflower blue', 'Shell': 'pearly pink and white',
  'Spinel, deep blue': 'deep blue', 'Spinel, red or green': 'bright red', 'Star sapphire': 'blue with a white star',
  'Tiger\'s‑eye': 'brown with a band of golden light'
});
