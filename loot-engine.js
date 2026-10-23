/* ============================================================
   LOOT ENGINE (no DOM). Rolls treasure from loot-data.js.
   Shared by loot-generator.js and session-kit.js.
   ============================================================ */

// ── UTILITIES ──────────────────────────────────────────────
const lootRoll = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const lootPick = arr => arr[Math.floor(rand() * arr.length)];
const lootD100 = () => lootRoll(1, 100);

// Safely resolve a coin entry: [min,max] or 0
function resolveCoin(entry, multiplier = 1, luckMult = 1) {
  if (!entry || entry === 0) return 0;
  if (Array.isArray(entry)) return Math.floor(lootRoll(entry[0], entry[1]) * multiplier * luckMult);
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
  if (lootD100() > chance) return [];
  const count = Math.max(1, Math.floor(lootRoll(countRange[0], countRange[1]) * luckMult));
  const pool  = lootData.gems[tier] || lootData.gems['10'];
  const value = parseInt(tier);
  return Array.from({ length: count }, () => ({
    name: lootPick(pool), value, type: 'gem'
  }));
}

// ── ART GENERATION ─────────────────────────────────────────
function generateArt(chance, tier, countRange, luckMult = 1) {
  if (lootD100() > chance) return [];
  const count = Math.max(1, Math.floor(lootRoll(countRange[0], countRange[1]) * luckMult));
  const pool  = lootData.art[tier] || lootData.art['25'];
  const value = parseInt(tier);
  return Array.from({ length: count }, () => ({
    name: lootPick(pool), value, type: 'art'
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
  const item = lootPick(pool);
  return {
    // A generic item ("Potion of Resistance") comes out as one of its SRD kinds.
    name:      item.variants ? lootPick(item.variants) : item.name,
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
function totalGP(coins, gems, art, magic, goods = []) {
  let t = 0;
  t += (coins.cp || 0) * 0.01;
  t += (coins.sp || 0) * 0.1;
  t += (coins.ep || 0) * 0.5;
  t += (coins.gp || 0);
  t += (coins.pp || 0) * 10;
  gems.forEach(g  => t += g.value);
  art.forEach(a   => t += a.value);
  goods.forEach(g => t += g.value);
  magic.forEach(m => t += m.value);
  return Math.round(t * 100) / 100;
}

// What the party sells and splits with the coins: gems, art, and trade goods (not magic items).
function lootSellValue(l) {
  return [...l.gems, ...l.art, ...(l.goods || [])].reduce((t, i) => t + i.value, 0);
}

// ── TABLE ROLLS ────────────────────────────────────────────
// kind: 'individual' | 'hoard'; cr: '0-4' | '5-10' | '11-16' | '17+'
// source: a LOOT_SOURCES id or 'random'. The extras (decorateTreasure) draw after
// the coins, gems, art, and magic, so older links keep the same core treasure.
function rollTreasure(kind, cr, luckMult = 1, includeMagic = true, source = 'random') {
  const t = lootData.treasureTables[kind][cr];
  const coins = generateCoins(t, luckMult);
  let gems, art, magic = [];
  if (kind === 'hoard') {
    gems = generateGems(t.gemChance, t.gemTier, [2, 8], luckMult);
    art  = generateArt (t.artChance, t.artTier, [1, 6], luckMult);
    if (includeMagic && lootD100() <= t.magicChance) {
      magic = generateMagicItems(t.magicTable, lootRoll(t.magicCount[0], t.magicCount[1]));
    }
  } else {
    gems = lootD100() <= t.gemChance ? generateGems(100, t.gemTier, [2, 6], luckMult) : [];
    art  = lootD100() <= t.artChance ? generateArt (100, t.artTier, [1, 4], luckMult) : [];
    if (includeMagic && lootD100() <= t.magicChance) magic = generateMagicItems(t.magicTable, 1);
  }
  return decorateTreasure({ coins, gems, art, magic }, kind, cr, { luckMult, source });
}

/* ============================================================
   THE FIND: where the treasure was, how it was kept, and what
   else lay with it. Everything here is drawn after the core
   roll (decorateTreasure), from the same seed.
   ============================================================ */

const LOOT_NAMES = ['Alder','Brannoc','Corra','Dessa','Edric','Fenna','Garrow','Hesk','Ilsa','Jory','Kael','Lirien','Maddoc','Nell','Orrin','Pell','Quill','Rhosyn','Sabel','Tamsin','Ulric','Vey','Wren','Yorick','Zelda','Bartho','Mirela','Osk','Tibba','Vashti'];

// kind: who carried it (individual) or where it lay (hoard). holders: how it was kept.
// trinkets: odds and ends found with it. goods: trade goods it tends to have (LOOT_GOODS ids;
// livestock only turns up where it's listed). owners + hooks: a hoard's story.
const LOOT_SOURCES = {
  // ── Carried by ──
  bandit: { kind: 'individual', label: 'Bandit or cutpurse', icon: '🗡️',
    holders: ['in a greasy belt pouch', 'in a boot, wrapped in a rag', 'sewn into the lining of a stolen coat', "in a purse cut from someone else's belt", 'in a tin box tucked under the shirt'],
    trinkets: ['a set of lockpicks with one pick snapped', 'a wanted poster with their own face on it, the reward circled', 'a tally of debts scratched on a slate', 'three loaded dice', 'a blackjack wrapped in red leather', 'a list of houses with crosses beside two of them'],
    goods: ['pepper', 'silk', 'ginger'] },
  cultist: { kind: 'individual', label: 'Cultist or zealot', icon: '🕯️',
    holders: ["in a pouch stitched with the cult's sigil", 'inside a hollowed-out prayer book', 'in a reliquary on a cord around the neck', 'in an offering bowl hung from the belt'],
    trinkets: ['a black candle burned down to a stub', 'a list of names in a cipher', 'a bone knife too blunt to cut anything', 'a mask of beaten tin', 'a pamphlet promising the world ends next Tuesday', 'a vial of something that was blood once'],
    goods: ['salt', 'linen', 'cloves'] },
  soldier: { kind: 'individual', label: 'Soldier, guard, or sellsword', icon: '🛡️',
    holders: ['in a regimental purse with a broken seal', 'in a mess tin under the rations', 'in a pouch on the sword belt', 'rolled up in the spare shirt in the pack', 'in a strongbox the size of a brick'],
    trinkets: ['a pay chit for wages never collected', "a letter from home asking when they're coming back", 'a whetstone worn to a sliver', 'a carved wooden soldier missing its head', 'orders signed by a captain called {name}', 'a lucky arrowhead pulled out of their own shoulder'],
    goods: ['iron', 'canvas', 'salt'] },
  noble: { kind: 'individual', label: 'Noble or courtier', icon: '👑',
    holders: ['in an embroidered silk purse', 'in a gold-chased card case', 'in a perfumed glove', 'in a jewel case the size of a fist', 'in a velvet pouch with a family crest'],
    trinkets: ['a love letter signed only "{name}"', 'a dance card with every slot filled', 'an invitation to a masked ball', 'a pomander that still smells of oranges', 'a miniature portrait of a hound', 'a debt marker to a gambling house, unpaid'],
    goods: ['silk', 'saffron', 'linen'] },
  merchant: { kind: 'individual', label: 'Merchant or traveler', icon: '🧳',
    holders: ['in a money belt under the shirt', 'in a ledger box with a false bottom', 'in a purse stuffed with receipts', 'in a strongbox chained to the saddle'],
    trinkets: ['a ledger with two sets of figures', 'a bill of sale for a mule called {name}', 'a brass scale with one weight that is a little light', 'samples of cloth pinned to a card', 'a letter of credit from a guild in a far city', 'a price list for a market three towns away'],
    goods: ['pepper', 'cinnamon', 'cotton', 'linen', 'ginger', 'cloves'] },
  mage: { kind: 'individual', label: 'Mage or scholar', icon: '📚',
    holders: ['in a scroll case with no scroll in it', 'tucked between the pages of a notebook', 'in a component pouch, under the bat guano', 'in a jar labeled "DO NOT OPEN"'],
    trinkets: ["a page of notes on a spell that doesn't work yet", 'a quill that never quite dries', 'a vial of quicksilver', "a lecture timetable from a wizards' college", 'a pressed flower inside a book on poisons', 'a letter of rejection from a famous archmage'],
    goods: ['silver', 'copper', 'saffron'] },
  pirate: { kind: 'individual', label: 'Pirate or sailor', icon: '🏴‍☠️',
    holders: ['in an oilskin pouch', 'in a tarred bottle on a lanyard', 'knotted into a bandanna', 'in a small sea chest with a stove-in lid'],
    trinkets: ['a sea chart with one reef marked "no"', 'a parrot feather', 'a whistle carved from whalebone', 'a letter of marque from a crown that no longer exists', 'a tooth (not theirs) on a string', "a ship's biscuit with weevils in it"],
    goods: ['pepper', 'cinnamon', 'salt', 'canvas', 'cloves'] },
  raider: { kind: 'individual', label: 'Goblin, orc, or raider', icon: '🪓',
    holders: ['in a filthy sack', 'strung on a necklace of mismatched trophies', 'in a pouch made from a whole rat', 'in a skull used as a bowl'],
    trinkets: ['a collection of shiny buttons', 'a tin spoon bent into a ring', 'a doll with its head on backwards', 'a crude map scratched on bark', 'a pot of war paint, nearly empty', "someone's left boot"],
    goods: ['iron', 'copper', 'wheat'] },
  beast: { kind: 'individual', label: 'Monster or beast', icon: '🐺',
    holders: ['in its gut', 'scattered among the bones in its nest', 'caught in the matted fur of its hide', 'in the rotting pack of its last meal'],
    trinkets: ['a half-digested boot', 'a dented helmet with tooth marks', 'a ring still on a finger bone', "a child's wooden horse, chewed", "a torn page from someone's diary", 'a shield strap, but no shield'],
    goods: ['iron', 'copper'] },
  undead: { kind: 'individual', label: 'Undead or grave', icon: '💀',
    holders: ['in a burial pouch gone to dust', 'under the tongue of the skull', 'in a small funerary urn', 'sewn into a shroud', 'in a coffin box no longer than a forearm'],
    trinkets: ['two grave coins that sat over the eyes', 'a rusted holy symbol of a forgotten god', 'a lock of hair in a locket', 'a burial token with a name on it: {name}', 'a ring that no longer fits any finger', 'a tarnished whistle that makes no sound'],
    goods: ['linen', 'salt'] },
  miner: { kind: 'individual', label: 'Dwarf, miner, or smith', icon: '⛏️',
    holders: ['in a leather apron pocket', 'in a tinderbox', 'in a pouch tied inside the helm', 'in a small iron box with a dwarvish lock'],
    trinkets: ['a candle stub for the deep tunnels', 'a canary feather', 'a chit for the company store', 'a hammer with a name on the handle: {name}', 'a lump of ore labeled "assay this"', 'a tally stick of shifts worked'],
    goods: ['iron', 'copper', 'silver', 'gold'] },
  otherworld: { kind: 'individual', label: 'Fiend, fey, or stranger', icon: '🧚',
    holders: ['in a purse that is bigger inside than out', 'in an acorn cup', 'in a leather pouch that is warm to the touch', 'in a knot of grass that keeps untying itself'],
    trinkets: ['a contract with a blank where the name goes', 'a bell that rings with no clapper', 'a feather that falls upward', 'a mirror shard that shows yesterday', 'a sugared violet that never goes stale', "a cup of dew that won't spill"],
    goods: ['saffron', 'silk', 'cinnamon'] },

  // ── Found in ──
  dragon: { kind: 'hoard', label: 'Dragon lair', icon: '🐉',
    holders: ['heaped beneath the sleeping place, pressed flat by scales', 'sorted by color on ledges around the cavern', 'half-melted into the cave floor', 'piled in an iron-bound chest the dragon was too proud to open', 'strewn around a cracked, empty egg'],
    owners: ['A dragon has slept on this for {years} years.', 'A young dragon built this from a summer of raided caravans.', "This is what is left of a dragon's hoard after a war between two of them."],
    hooks: ['The dragon knows every coin and will come looking for what is missing.', 'One chest bears the crest of a noble house that would pay to have it back.', 'Scratched into the cave wall: a tally of every knight who tried this.', "A second, smaller hoard is hidden in the dragon's old lair."],
    trinkets: ["a dented knight's helm polished to a mirror shine", 'a tapestry used as bedding', 'a scorched ledger from a toll bridge', 'a single shed scale the size of a shield'],
    goods: ['gold', 'silver', 'platinum', 'silk'] },
  bandits: { kind: 'hoard', label: 'Bandit stash', icon: '🏕️',
    holders: ['in a chest buried under the old campfire', 'in saddlebags hung inside a hollow tree', 'in sacks under the floorboards of a ruined mill', 'behind a false wall at the back of a cave'],
    owners: ['A bandit gang buried this before a raid that went wrong.', 'Highwaymen meant to split this three ways and never came back for it.', 'A gang leader hid this from their own gang.'],
    hooks: ['A map in the chest marks two more stashes.', 'One of the gang survived and is on the way back for it.', 'The coach it came from still has a guard looking for it.', 'A ransom note in with it was never delivered; the hostage may still be alive.'],
    trinkets: ['a ransom note never sent', "a sheriff's badge with a hole through it", 'a roster of the gang with names crossed out', 'a bundle of stolen love letters'],
    goods: ['pepper', 'silk', 'cotton', 'linen', 'goat'] },
  cult: { kind: 'hoard', label: 'Cult treasury', icon: '🕯️',
    holders: ['in an offering chest before the altar', 'in reliquaries along a crypt wall', 'at the bottom of a font of black water', "in a box under the high priest's chair"],
    owners: ['These are tithes squeezed out of a whole town over a decade.', 'These are offerings to a god that never once answered.', 'A cult saved this to buy something terrible.'],
    hooks: ["The cult's ledger lists its donors, a magistrate among them.", 'A loyal acolyte escaped with the other half.', 'The coins were blessed in a dark rite, and the cult swears its god will know who spends them.', 'A letter seals a purchase from someone called {name}; the delivery is due soon.'],
    trinkets: ['a ritual knife with a notched blade', 'a robe that fits nobody', 'a hymnal with pages cut out', 'a cracked idol whose gem eyes were pried out'],
    goods: ['salt', 'linen', 'cloves', 'saffron'] },
  tomb: { kind: 'hoard', label: 'Ancient tomb', icon: '⚱️',
    holders: ['in a sarcophagus, beneath the dead king', 'in niches carved for grave goods', 'in sealed clay jars along the walls', 'in the stone hands of a statue', 'in a stone chest carved with mourners'],
    owners: ['These are the grave goods of a ruler whose name was chiseled off every wall.', 'A whole dynasty was buried with this to pay their way into the next world.', 'A priest-king was laid here {years} years ago with the temple treasury.'],
    hooks: ['The coins are from a kingdom no one remembers; scholars would pay to see them.', 'An inscription promises a curse on thieves. It may even be true.', 'The body is missing.', 'A second sealed door has fresh scratches on the inside.'],
    trinkets: ['a funerary mask of painted plaster', 'four canopic jars, still sealed', 'a list of the servants buried with their master', 'a model boat for the journey after death'],
    goods: ['linen', 'gold', 'cinnamon', 'salt'] },
  wizard: { kind: 'hoard', label: "Wizard's tower", icon: '🔮',
    holders: ['in a locked desk drawer among unpaid bills', 'in a glass case labeled in a dead language', 'in a chest that walks away if you stare at it', 'in a strongbox inside a summoning circle'],
    owners: ['A wizard spent {years} years collecting this and then simply left.', 'An archmage kept this as a research fund.', 'A wizard took this as payment for spells and never spent it.'],
    hooks: ["The wizard isn't dead, just very late.", 'A familiar is still guarding the place and will remember your faces.', 'A research note says one of these items is mislabeled.', 'An apprentice was promised this in a will and has the paperwork.'],
    trinkets: ['a jar of eyes (glass, probably)', 'an unfinished clockwork hand', 'a letter from an apprentice who quit', 'a star chart with notes in the margins'],
    goods: ['silver', 'copper', 'saffron', 'gold'] },
  smugglers: { kind: 'hoard', label: "Smugglers' cache", icon: '⚓',
    holders: ['in barrels marked "salt fish"', "in a hidden compartment under a boat's deck", 'behind stacked crates in a sea cave', 'inside hollowed-out wheels of cheese', 'in a strongbox sunk on a rope off the jetty'],
    owners: ['Smugglers kept this to pay off customs men up and down the coast.', 'This is a season of untaxed spice money.', 'A smuggling crew stashed this the night the navy caught them.'],
    hooks: ['The harbormaster is in on it and wants a cut.', "Tomorrow's boat is coming to collect it.", 'One crate has a stowaway.', 'A ledger lists every bribe, and the names are worth more than the coins.'],
    trinkets: ['a signal lantern with red glass', 'a ledger of bribes', 'a stack of forged customs seals', 'a tide table with one night circled'],
    goods: ['pepper', 'cinnamon', 'cloves', 'silk', 'saffron'] },
  manor: { kind: 'hoard', label: "Noble's strongroom", icon: '🏰',
    holders: ['in a strongroom behind a portrait', 'in a vault under the wine cellar', 'in jewel cases in a locked wardrobe', 'in a chest at the foot of the bed'],
    owners: ['A noble family has been building this for {years} years.', 'A baron hid this from the tax collectors.', "This is a widow's inheritance, which three heirs are fighting over."],
    hooks: ['The family will hire someone to find out who took it.', 'A deed in the vault proves the family stole their title.', 'One heir has already been quietly emptying it.', 'A letter in the vault names a spy in the household.'],
    trinkets: ['a family tree with one branch inked out', 'a betrothal contract', 'a portrait of an ancestor who looks a lot like {name}', 'a bundle of letters from a secret lover'],
    goods: ['silk', 'linen', 'saffron', 'silver', 'gold'] },
  temple: { kind: 'hoard', label: 'Temple offerings', icon: '⛪',
    holders: ['in an alms box as tall as a dwarf', 'beneath the altar stone', "in the cupped hands of the god's statue", "in a reliquary beside a saint's finger bone"],
    owners: ['These are a decade of offerings from pilgrims.', 'The faithful gave this to rebuild a fallen shrine.', 'A temple hid this when raiders came, then forgot where.'],
    hooks: ['The priests count it every dawn.', 'Taking it is a crime and a sin; returning it earns a favor.', 'Half of it was pledged to a hospital that was never built.', 'A pilgrim swears the statue wept when the last thief came.'],
    trinkets: ['a string of prayer beads', 'a box of votive candles', 'a written prayer for a sick child named {name}', "a pilgrim's badge from a far shrine"],
    goods: ['linen', 'salt', 'cloves', 'silver'] },
  wreck: { kind: 'hoard', label: 'Sunken wreck', icon: '🚢',
    holders: ['in a sea chest crusted with barnacles', "in the captain's cabin under a fallen beam", 'spilled across the hold among drowned cargo', 'in a strongbox wrapped in kelp'],
    owners: ['A merchant ship went down here {years} years ago with a payroll aboard.', 'A treasure ship sank in a storm with all hands.', 'Pirates scuttled this ship after taking most, but not all, of its cargo.'],
    hooks: ["The ship's owners still have a legal claim.", 'Something lives in the hold now.', "The captain's log says the ship was carrying something else too.", 'The figurehead is missing, and a fishing village has it.'],
    trinkets: ["a ship's bell", "a captain's log, water-stained but legible", 'a brass sextant', "a sailor's letter home in a sealed bottle"],
    goods: ['pepper', 'cinnamon', 'silk', 'salt', 'copper'] },
  giant: { kind: 'hoard', label: "Giant's sack", icon: '🗿',
    holders: ["in a giant's sack, along with half a cow", 'in a hollowed boulder used as a strongbox', 'in a cauldron big enough to bathe in', 'tied up in a tablecloth that was once a sail'],
    owners: ['A giant took this as a toll on a mountain pass.', 'A giant gathered this from three villages in one bad week.', 'A giant has been saving this up to pay off a jarl.'],
    hooks: ['The giant was taking this to pay tribute; the jarl will want to know why it never came.', 'The giant counts badly but will notice the empty sack.', "A whole village's harvest tithe is in here.", "The giant's spouse knows exactly what was in the sack."],
    trinkets: ['a toothpick that used to be a fence post', 'a thimble the size of a bucket', 'a doll made from a scarecrow', 'a cart wheel worn as a bracelet'],
    goods: ['wheat', 'flour', 'sheep', 'goat', 'cow', 'pig', 'ox', 'iron'] },
  den: { kind: 'hoard', label: 'Monster den', icon: '🦴',
    holders: ['scattered among the bones', 'woven into the bedding of a nest', 'half-buried in the dirt floor', 'in the packs of dead adventurers'],
    owners: ['This is everything the last {count} meals were carrying.', 'Adventurers came here before you. This is what they brought.', 'The beast drags anything shiny back to its den.'],
    hooks: ["The adventurers' names are written in their packs; their families would want word.", 'There are tracks here of something bigger than what you killed.', 'One pack holds a half-finished map of the deeper caves.', 'One body has a guild badge, and the guild pays for returned badges.'],
    trinkets: ["a cracked adventurer's lantern", 'a journal that stops mid-sentence', 'a broken holy symbol', 'a wooden shield with a name painted on it: {name}'],
    goods: ['iron', 'copper', 'linen'] },
  guild: { kind: 'hoard', label: "Thieves' guild drop", icon: '🃏',
    holders: ["in a locked cabinet in a fence's back room", 'in a dead drop under a bridge', 'in a chimney behind a loose brick', 'in a coffin in a closed-down funeral parlor'],
    owners: ["This is a month of the guild's takings, waiting to be laundered.", 'A fence was holding this for three different crews.', 'A guild master kept this for the day they had to run.'],
    hooks: ['The guild will want it back, and they know faces.', 'Half of it is already promised to a buyer.', "A list of next week's jobs is in with it; one target is someone you know.", 'A note says the city watch captain gets a tenth of everything.'],
    trinkets: ['a roll of fine lockpicks', "a note in thieves' cant", 'a stack of calling cards with a black rose', 'a guard rota for a counting house'],
    goods: ['silk', 'pepper', 'silver', 'saffron'] }
};

// The sources of one kind, in table order (the picker lists these after "Random").
function lootSourcesFor(kind) {
  return Object.entries(LOOT_SOURCES).filter(([, s]) => s.kind === kind);
}

// Generic finds that fill in around the source's own.
const LOOT_HOLDERS = {
  individual: ['in a belt pouch', 'in a coin purse tied with a thong', 'in a small locked box', 'in a sock', 'wrapped in a handkerchief'],
  hoard: ['in an iron-bound chest', 'in a rotting wooden trunk', 'in a heap on the floor', 'in a row of locked strongboxes', 'in sacks and bags of every kind']
};

const LOOT_TRINKETS = [
  'a love letter, never sent', 'a key with no lock to go with it', 'a wooden token from a gambling den',
  "a lucky rabbit's foot (not lucky enough, it turned out)", 'a pressed flower', 'a tin whistle',
  'a deck of cards with one queen missing', 'a candle stub and a flint', 'a crude map with an X on it',
  'a small knife with the initials {initials} carved in the handle', 'a prayer to a minor saint, folded small',
  "a child's drawing of a dragon", 'a ring of keys', 'a bone flute', 'a pipe and a pouch of cheap tobacco',
  'a letter to someone called {name}, asking for money', 'a scrap of a song, written down', 'a dried sausage',
  'a very large tooth', 'a handkerchief embroidered "{name}"', 'a glass eye', 'a stone with a hole through it',
  'a shopping list', 'an IOU for 3 gp signed by {name}', 'a wax seal with no letter', 'a theater ticket',
  'a carved die with a six on every face', 'a vial of perfume, almost empty', 'a lock of hair tied with ribbon',
  'a pebble painted to look like a beetle', 'half a map, torn down the middle', 'a recipe for a very strong stew'
];

const LOOT_COIN_AGES = [
  'Mostly worn old coins, the faces rubbed smooth', 'Fresh from a city mint and still bright',
  'A mix from a dozen kingdoms', 'Old imperial coins stamped with a crowned skull',
  'Square-holed coins strung on cord', 'Stamped with the face of a king nobody remembers',
  'Coins from a city that sank a century ago', 'Dwarven coins, heavy and thick-rimmed',
  'Elven coins, thin as leaves and stamped with stars', 'Local coins, nothing special'
];
const LOOT_COIN_DETAILS = [
  'some have been bitten to test them', 'they are tied in rolls of twenty', "one is a gambler's two-headed coin",
  'a few are clipped at the edges', 'they are a little sticky', 'they are mixed with buttons and bent nails',
  'one has a hole punched through it for a necklace', 'someone sorted them carefully by date',
  'one bears a scratched message: "{name} was here"', 'they smell of smoke'
];

// SRD 5.1 locks and traps: save DCs by severity, damage by tier (Traps, "Damage Severity by Level").
const LOOT_LOCK_DC = { '0-4': [10, 15], '5-10': [15, 15], '11-16': [15, 20], '17+': [20, 25] };
const LOOT_LOCK_KEYS = [
  'The key is lost.', 'The key hangs on a nail nearby, a little too obviously.', 'The key was on whoever owned it.',
  'There is no keyhole; a spoken password opens it.', 'A spare key is hidden under a loose stone nearby.'
];
// Third pass (R6): swapped in by share at the very end of decorateTreasure, so nothing else moves.
const LOOT_LOCK_KEYS_MORE = [
  'The key snapped off in the lock, and the stub has to be picked out first.', 'The keyhole is a fake; the real one hides under the lip of the lid.',
  'Three keys hang on a ring nearby, and only one of them fits.', 'The key is hidden inside a hollow candle nearby.',
  'The lock is rusted, so picking it makes a lot of noise.', 'The lock is a ring of turning letters that must spell a word.',
  'The key was swallowed by something that lives nearby.', 'There are two keyholes, and both keys must turn at once.',
  'The key is tied to the leg of a dead rat in the corner.', 'The lock is new, and much better made than what it is fixed to.',
  'Fresh scratches round the keyhole show someone tried and gave up.', 'A note nearby says where the key is buried, in a riddle.'
];
const TRAP_SEVERITY = [['setback', 50, [10, 11]], ['dangerous', 40, [12, 15]], ['deadly', 10, [16, 20]]];
const TRAP_DAMAGE = {
  '0-4':   { setback: '1d10', dangerous: '2d10',  deadly: '4d10' },
  '5-10':  { setback: '2d10', dangerous: '4d10',  deadly: '10d10' },
  '11-16': { setback: '4d10', dangerous: '10d10', deadly: '18d10' },
  '17+':   { setback: '10d10', dangerous: '18d10', deadly: '24d10' }
};
// save: the saving throw; dmg: damage type. Traps without dmg do what effect says.
const LOOT_TRAPS = [
  { name: 'Poison needle', where: 'in the lock', save: 'Constitution', dmg: 'poison', after: 'and be poisoned for 1 hour' },
  { name: 'Gas vent', where: 'under the lid', save: 'Constitution', dmg: 'poison', from: 'from a cloud of green gas (10-foot radius)' },
  { name: 'Fire glyph', where: 'carved on the lid', save: 'Dexterity', dmg: 'fire' },
  { name: 'Spring blade', where: 'in the hinge', save: 'Dexterity', dmg: 'slashing' },
  { name: 'Acid spray', where: 'behind the latch', save: 'Dexterity', dmg: 'acid' },
  { name: 'Lightning rune', where: 'on the clasp', save: 'Dexterity', dmg: 'lightning' },
  { name: 'Frost sigil', where: 'under the lid', save: 'Constitution', dmg: 'cold' },
  { name: 'Hidden darts', where: 'in the walls around it', save: 'Dexterity', dmg: 'piercing' },
  { name: 'Grave sigil', where: 'painted inside the lid', save: 'Constitution', dmg: 'necrotic' },
  { name: 'Shrieking rune', where: 'on the keyhole', save: 'Wisdom', dmg: 'psychic' },
  { name: 'Falling weight', where: 'above it', save: 'Dexterity', dmg: 'bludgeoning' },
  { name: 'Alarm', where: 'on the lid', effect: 'A magical shriek sounds for 1 minute, loud enough to hear 300 feet away. Anything nearby comes to look.' },
  { name: 'Dye bladder', where: 'inside the lock', effect: 'Indelible blue dye sprays out: DC {dc} Dexterity saving throw or be stained bright blue for a week.' }
];

// SRD 5.1 trade goods: price in gp per unit, quantity range (a hoard's cargo at most), how it's packed.
// Livestock (name = [one, many]) only turns up where a source lists it.
const LOOT_GOODS = {
  wheat:    { name: 'Wheat',        gp: 0.01, unit: 'lb',    qty: [20, 800], packs: ['in sacks', 'in a grain bin'] },
  flour:    { name: 'Flour',        gp: 0.02, unit: 'lb',    qty: [10, 400], packs: ['in sacks', 'in a flour barrel'] },
  chicken:  { name: ['chicken', 'chickens'], gp: 0.02, qty: [2, 20] },
  salt:     { name: 'Salt',         gp: 0.05, unit: 'lb',    qty: [5, 200],  packs: ['in a cask', 'in a leather bag', 'in rough blocks'] },
  iron:     { name: 'Iron',         gp: 0.1,  unit: 'lb',    qty: [10, 500], packs: ['in bars', 'in lumps of pig iron'] },
  canvas:   { name: 'Canvas',       gp: 0.1,  unit: 'sq yd', qty: [10, 200], packs: ['in rolls'] },
  copper:   { name: 'Copper',       gp: 0.5,  unit: 'lb',    qty: [5, 200],  packs: ['in ingots', 'as scrap'] },
  cotton:   { name: 'Cotton cloth', gp: 0.5,  unit: 'sq yd', qty: [5, 100],  packs: ['in bolts'] },
  ginger:   { name: 'Ginger',       gp: 1,    unit: 'lb',    qty: [2, 60],   packs: ['in a sack', 'in a spice box'] },
  goat:     { name: ['goat', 'goats'], gp: 1, qty: [1, 12] },
  cinnamon: { name: 'Cinnamon',     gp: 2,    unit: 'lb',    qty: [1, 1500], packs: ['in bark rolls', 'in cedar boxes'] },
  pepper:   { name: 'Pepper',       gp: 2,    unit: 'lb',    qty: [1, 1500], packs: ['in waxed sacks', 'in sealed jars'] },
  sheep:    { name: ['sheep', 'sheep'], gp: 2, qty: [1, 20] },
  cloves:   { name: 'Cloves',       gp: 3,    unit: 'lb',    qty: [1, 1000], packs: ['in cedar boxes', 'in pouches'] },
  pig:      { name: ['pig', 'pigs'], gp: 3,   qty: [1, 10] },
  silver:   { name: 'Silver',       gp: 5,    unit: 'lb',    qty: [1, 3000], packs: ['in bars', 'as bent plate', 'in ingots'] },
  linen:    { name: 'Linen',        gp: 5,    unit: 'sq yd', qty: [1, 2000], packs: ['in bolts', 'folded in a chest'] },
  silk:     { name: 'Silk',         gp: 10,   unit: 'sq yd', qty: [1, 2000], packs: ['in bolts', 'wrapped in oilcloth'] },
  cow:      { name: ['cow', 'cows'], gp: 10,  qty: [1, 8] },
  saffron:  { name: 'Saffron',      gp: 15,   unit: 'lb',    qty: [1, 1000], packs: ['in sealed tins', 'in a twist of oilcloth'] },
  ox:       { name: ['ox', 'oxen'], gp: 15,   qty: [1, 4] },
  gold:     { name: 'Gold',         gp: 50,   unit: 'lb',    qty: [1, 600],  packs: ['in bars', 'in ingots', 'as melted-down jewelry'] },
  platinum: { name: 'Platinum',     gp: 500,  unit: 'lb',    qty: [1, 60],   packs: ['in bars', 'in ingots'] }
};
const LIVESTOCK_WHERE = ['tethered nearby', 'in a makeshift pen', 'tied together with rope', 'wandering loose and complaining'];
// A goods lot aims at a value (gp) by kind and tier; luck scales it.
const LOOT_GOODS_TARGET = {
  individual: { '0-4': [0.5, 8], '5-10': [5, 40], '11-16': [20, 150], '17+': [60, 500] },
  hoard:      { '0-4': [10, 150], '5-10': [60, 800], '11-16': [400, 5000], '17+': [2000, 30000] }
};

// Gem looks: color (own words), then cut and size by value.
const GEM_COLORS = {
  'Azurite': 'opaque deep blue', 'Banded Agate': 'striped brown, blue, and white', 'Blue Quartz': 'pale clear blue',
  'Eye Agate': 'gray ringed with white and blue', 'Hematite': 'metallic gray-black', 'Lapis Lazuli': 'deep blue flecked with gold',
  'Malachite': 'banded light and dark green', 'Obsidian': 'glassy black', 'Rhodochrosite': 'opaque pink',
  'Tiger Eye Agate': 'brown with a band of golden light', 'Turquoise': 'sky blue-green', 'Moss Agate': 'clear with green threads like moss',
  'Snowflake Obsidian': 'black with white flecks', 'Raw Amber (chip)': 'honey gold', 'Polished Granite Sphere': 'speckled gray',
  'Bloodstone': 'dark green spotted with red', 'Carnelian': 'red-orange', 'Chalcedony': 'milky white', 'Chrysoprase': 'apple green',
  'Citrine': 'pale yellow', 'Jasper': 'opaque brick red', 'Moonstone': 'white with a blue sheen', 'Onyx': 'black and white bands',
  'Peridot': 'olive green', 'Rock Crystal': 'clear as water', 'Sard': 'deep brownish red', 'Sardonyx': 'red and white bands',
  'Smoky Quartz': 'smoky brown', 'Star Rose Quartz': 'pale pink with a white star', 'Zircon': 'clear blue-green',
  'Aventurine': 'green with glittering flecks', 'Iolite': 'violet-blue that shifts as it turns', 'Labradorite': 'gray flashing blue and green',
  'Prehnite': 'cloudy pale green', 'Sunstone': 'orange with coppery glitter', 'Unakite': 'mottled pink and green',
  'Amber': 'golden, with something tiny trapped inside', 'Amethyst': 'deep purple', 'Chrysoberyl': 'yellow-green',
  'Coral': 'crimson', 'Red Garnet': 'deep red', 'Jade': 'translucent green', 'Jet': 'deep black', 'Freshwater Pearl': 'lustrous white',
  'Red Spinel': 'bright red', 'Tourmaline': 'pale green', 'Fire Opal (small)': 'orange with flickers of red', 'Heliodor': 'golden yellow',
  'Kunzite': 'pale lilac', 'Morganite': 'peach pink', 'Pink Tourmaline': 'rose pink', 'Tsavorite Garnet': 'vivid green',
  'Alexandrite': 'green that turns red by candlelight', 'Aquamarine': 'pale blue-green', 'Black Pearl': 'lustrous black',
  'Blue Spinel': 'deep blue', 'Fire Opal': 'fiery red-orange', 'Topaz': 'golden yellow', 'Pink Pearl': 'lustrous pink',
  'Golden Beryl': 'clear gold', 'Indicolite Tourmaline': 'blue', 'Malaia Garnet': 'orange-pink', 'Copper Sunstone': 'red with copper glitter',
  'Padparadscha Sapphire': 'sunset pink-orange', 'Black Sapphire': 'black with a hint of blue', 'Diamond': 'clear and brilliant',
  'Jacinth': 'fiery orange', 'Ruby': 'deep crimson', 'Star Ruby': 'red with a white star', 'Star Sapphire (blue)': 'blue with a white star',
  'Fine Alexandrite': 'green that turns red in firelight', 'Large Tsavorite': 'vivid green', 'Demantoid Garnet': 'green with more fire than a diamond',
  'Red Beryl': 'raspberry red', 'Black Opal': 'black, alive with green and blue fire', 'Blue Diamond': 'clear blue',
  'Flawless Emerald': 'deep bright green', 'Flawless Ruby': 'pigeon-blood red', 'Black Star Sapphire': 'black with a white star',
  'Flawless Diamond': 'perfectly clear', 'Imperial Jadeite': 'glowing emerald green', 'Paraiba Tourmaline': 'electric blue-green',
  'Red Diamond': 'clear red', 'Fancy Vivid Yellow Diamond': 'canary yellow'
};
const GEM_CUTS = {
  low:  ['rough and uncut', 'tumbled smooth', 'polished into a cabochon', 'roughly polished', 'still half in its rock'],
  mid:  ['polished into a cabochon', 'table-cut', 'carved into a bead', 'drilled for a necklace', 'tumbled smooth', 'cut into a little heart'],
  high: ['brilliant-cut', 'step-cut', 'rose-cut', 'teardrop-cut', 'oval-cut', 'carved with a tiny face', 'cut into a square'],
  pearl: ['perfectly round', 'baroque and lumpy', 'button-shaped', 'teardrop-shaped']
};
const GEM_SIZES = {
  low:  ['pea-sized', 'small as a fingernail', 'the size of a thumbnail'],
  mid:  ['the size of a thumbnail', 'big as a grape', 'the size of a hazelnut'],
  high: ['the size of a hazelnut', 'big as a walnut', "the size of a quail's egg"],
  top:  ['big as a walnut', "the size of a quail's egg", "big as a hen's egg"]
};
const GEM_EXTRAS = ['with a hairline flaw', 'still in a broken ring setting', 'with a hole drilled through it', 'wrapped in paper with a price written on it',
  'scratched with the initials {initials}', 'dusty, as if no one has looked at it in years', 'in a little velvet bag', 'with a bubble trapped inside'];

// Art: half of the pieces are composed (material + object + decoration, or a picture) instead of the fixed list.
const ART_TIER_BAND = { '25': 0, '250': 1, '750': 2, '2500': 3, '7500': 4, '25000': 4 };
const ART_MATERIALS = [
  ['Copper', 'Brass', 'Pewter', 'Carved bone', 'Silver-plated', 'Painted wooden'],
  ['Silver', 'Bronze', 'Carved ivory', 'Jade', 'Gilded', 'Ebony', 'Enameled copper'],
  ['Gold', 'Silver-gilt', 'Carved jade', 'Ivory and silver', 'Electrum', 'Ebony and gold'],
  ['Gold', 'Platinum', 'Gold and enamel', 'Crystal and gold'],
  ['Platinum', 'Mithral', 'Solid gold', 'Adamantine-banded']
];
// [object, lowest band it appears at]
const ART_OBJECTS = [
  ['hand mirror', 0], ['chalice', 0], ['comb', 0], ['brooch', 0], ['statuette', 0], ['ewer', 0], ['snuffbox', 0],
  ['bracelet', 0], ['hairpin', 0], ['candlestick', 0], ['belt buckle', 0], ['flagon', 0], ['cloak clasp', 0], ['pendant', 0],
  ['ring', 0], ['goblet', 0], ['perfume bottle', 1], ['music box', 1], ['reliquary', 1], ['circlet', 1], ['censer', 1],
  ['scroll case', 1], ['chess set', 1], ['drinking horn', 1], ['hourglass', 1], ['jewelry box', 1], ['mask', 1],
  ['astrolabe', 2], ['orrery', 3], ['scepter', 3], ['crown', 3], ['miniature throne', 4]
];
const ART_SUBJECTS = [
  'a stag hunt', 'dancing satyrs', 'a coiled dragon', 'a queen on a throne of thorns', 'two moons over the sea', 'a sea battle',
  'a wedding feast', 'a phoenix in flames', 'a knight facing a wyvern', 'vines and songbirds', 'a ring of dancing skeletons',
  'the twelve houses of the stars', 'a griffon in flight', 'a giant fishing with a net', 'a weeping saint', 'a city under siege',
  'a map of a forgotten city', 'wolves under a full moon', 'a mermaid holding a lantern', 'a lion fighting a serpent',
  'masked dancers', 'a lighthouse in a storm', 'a tree with golden roots', 'a sleeping cat', 'a fox stealing grapes',
  'the founding of a city', 'a unicorn at a pool', 'a battle between gods', 'a merchant fleet', 'an owl with a key in its beak'
];
const ART_DECOR = [
  ['engraved with {subject}', 'painted with {subject}', 'etched with {subject}', 'stamped with {subject}'],
  ['engraved with {subject}', 'inlaid with {subject}', 'set with {gem}', 'carved with {subject}'],
  ['set with {gems}', 'chased with {subject}', 'set with {gem} and engraved with {subject}', 'enameled with {subject}'],
  ['set with {gems}', 'set with {gem} and chased with {subject}', 'enameled with {subject} and set with {gems}'],
  ['set with {gems}', 'set with {gem} and wrought with {subject}', 'crusted with {gems}']
];
// Set gems come from cheaper tiers than the art itself.
const ART_GEM_TIERS = [[], ['10', '50'], ['50', '100'], ['100', '500'], ['500', '1000', '5000']];
const ART_PICTURES = [
  ['Charcoal sketch', 'Woodcut print', 'Painted wooden panel'],
  ['Oil painting', 'Watercolor in a carved frame', 'Small tapestry'],
  ['Large oil painting', 'Tapestry', 'Silk embroidery'],
  ['Masterwork oil painting', 'Great woven tapestry', 'Painted triptych'],
  ['Masterwork oil painting', 'Great woven tapestry', 'Painted triptych']
];
const ART_ARTISTS = [', signed by a famous court painter', ', by an unknown master', ', unfinished', ', with a hidden figure in the background', ', painted over an older picture', ''];
const ART_NOTES = [
  'A chip in one corner, but still worth the price.', 'Stolen. A collector in the capital has been asking after it.',
  'One of a set of three.', 'Wrapped in a page torn from an auction catalog.', 'Heavier than it looks; it might be hollow.',
  "The maker's mark is from a guild that closed a century ago.", 'A temple would call this sacred and want it back.',
  'Someone has scratched "{name}" on the underside.', 'There is a tiny compartment in it, empty.', 'It has been repaired once, very well.'
];

// Magic item flavor (looks only; it changes no rules).
const POTION_COLORS = ['ruby red', 'cloudy amber', 'pale blue', 'inky black', 'bright green', 'silver', 'rose pink', 'golden', 'violet', 'milky white', 'clear', 'muddy brown', 'deep purple', 'sea-green'];
const POTION_TEXTURES = ['thin', 'thick', 'fizzing', 'oily', 'glittering', 'smoky', 'syrupy', 'layered', 'faintly glowing', 'cold'];
const POTION_NOTES = ['it swirls on its own', 'it smells of pine', 'it smells of cloves', 'it tastes of honey and copper', 'tiny bubbles rise and never stop',
  'it smells of rain', 'it is warm to the touch', 'something small floats in it', 'it hums if shaken', 'it smells of burnt sugar', 'it tastes of nothing at all'];
const POTION_BOTTLES = ['in a stoppered glass vial', 'in a clay flask sealed with wax', 'in a tiny crystal bottle shaped like a teardrop', 'in a leather flask', 'in a corked bone tube', 'in a dusty green bottle'];
const SCROLL_INKS = ['gold ink', 'squid ink', 'blood-red ink', 'faintly glowing silver ink', 'plain soot ink', 'violet ink that smells of lavender'];
const SCROLL_PAPERS = ['vellum', 'birch bark', 'papyrus', 'a thin sheet of copper', 'silk', 'the back of an old map'];
const SCROLL_TIES = ['tied with a black ribbon', 'sealed with wax stamped with an eye', 'rolled around an ivory rod', 'kept in a bone tube', 'folded small', ''];
const MAGIC_MAKERS = ['a dwarven runesmith', 'elven artisans of a lost court', 'a hedge witch', 'a guild of artificers', 'a paladin order now disbanded',
  'a giant who thought it was a toy', 'a vain archmage who signed it', 'a cult that worshipped it', 'an apprentice who got lucky',
  'unknown hands (it bears no mark)', 'a smith working by the light of a falling star', 'a sea witch, for a pirate queen'];
const MAGIC_QUIRKS = ['It is always cool to the touch.', 'It smells faintly of rain.', 'It hums a few notes when no one is holding it.',
  'It has a name engraved on it: {name}.', 'It glows faintly by moonlight.', 'Small animals stop and stare at it.',
  'It leaves a smell of cinnamon on the hands.', 'Now and then it whispers the name {name}.', 'Its shadow is slightly the wrong shape.',
  'It rattles when shaken, though nothing inside is loose.', 'It is a little heavier on cloudy days.', 'Frost forms on it in the morning.',
  'It is scarred from an old battle.', 'A tiny bell chimes inside it when it is drawn or put on.', 'It is never dusty.',
  'It shows the faint marks of teeth.', "It feels warm in a friend's hand and cold in a stranger's.", 'A tiny map on its surface changes now and then.'];

const lootCap = s => s.charAt(0).toUpperCase() + s.slice(1);
const aOrAn = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const pluralWord = w => /(s|x|z|ch|sh)$/.test(w) ? w + 'es' : w + 's';
function lootFill(s) {
  return s.replace(/\{name\}/g, () => lootPick(LOOT_NAMES))
    .replace(/\{initials\}/g, () => String.fromCharCode(65 + lootRoll(0, 25)) + '. ' + String.fromCharCode(65 + lootRoll(0, 25)) + '.')
    .replace(/\{years\}/g, () => lootRoll(2, 40) * 10)
    .replace(/\{count\}/g, () => lootRoll(3, 9));
}
const lootWeighted = list => { let r = rand() * list.reduce((t, x) => t + x[1], 0); return list.find(x => (r -= x[1]) < 0) || list[list.length - 1]; };
// Pick from the source's own list (with that chance) or the generic one.
const fromSource = (own, generic, chance) => own && own.length && rand() < chance ? lootPick(own) : lootPick(generic);

function gemLook(g) {
  const v = g.value;
  const band = v <= 10 ? 'low' : v <= 100 ? 'mid' : v <= 1000 ? 'high' : 'top';
  const cut = lootPick(/Pearl/.test(g.name) ? GEM_CUTS.pearl : GEM_CUTS[band === 'top' ? 'high' : band]);
  const parts = [GEM_COLORS[g.name] || 'an unusual color', cut, lootPick(GEM_SIZES[band])];
  if (rand() < 0.3) parts.push(lootFill(lootPick(GEM_EXTRAS)));
  return lootCap(parts.join(', '));
}

// A gem name for setting into art: lowercased, without notes like "(small)".
function artGem(band, plural) {
  const tier = lootPick(ART_GEM_TIERS[band]);
  const name = lootPick(lootData.gems[tier].filter(n => !n.includes('('))).toLowerCase();
  return plural ? pluralWord(name) : aOrAn(name);
}

function composeArt(value) {
  const band = ART_TIER_BAND[value] ?? 0;
  if (rand() < 0.25) return lootPick(ART_PICTURES[band]) + ' of ' + lootPick(ART_SUBJECTS) + lootPick(ART_ARTISTS);
  const objects = ART_OBJECTS.filter(([, b]) => b <= band).map(([o]) => o);
  const decor = lootPick(ART_DECOR[band])
    .replace('{subject}', () => lootPick(ART_SUBJECTS))
    .replace('{subject}', () => lootPick(ART_SUBJECTS))
    .replace('{gems}', () => artGem(band, true))
    .replace('{gem}', () => artGem(band, false));
  const material = lootPick(ART_MATERIALS[band]), object = lootPick(objects);
  // Not "chess set set with a topaz".
  return `${material} ${object} ${/ set$/.test(object) ? decor.replace(/^set with/, 'inlaid with') : decor}`;
}

// Looks for a magic item: potions and scrolls always, most other items, never artifacts.
function magicFlavor(m) {
  if (m.rarity === 'artifact') return '';
  if (m.type === 'potion') {
    return lootCap(`${lootPick(POTION_TEXTURES)} ${lootPick(POTION_COLORS)} liquid ${lootPick(POTION_BOTTLES)}; ${lootPick(POTION_NOTES)}.`);
  }
  if (m.type === 'scroll') {
    const tie = lootPick(SCROLL_TIES);
    return `Written in ${lootPick(SCROLL_INKS)} on ${lootPick(SCROLL_PAPERS)}${tie ? ', ' + tie : ''}.`;
  }
  if (rand() < 0.3) return '';
  return `Made by ${lootPick(MAGIC_MAKERS)}. ${lootFill(lootPick(MAGIC_QUIRKS))}`;
}

function lootGoodsLot(kind, cr, source, luckMult) {
  const [lo, hi] = LOOT_GOODS_TARGET[kind][cr];
  const target = (lo + rand() * (hi - lo)) * luckMult;
  const prefs = source.goods || [];
  // One person carries at most 30 of anything; a hoard can hold a whole cargo.
  const most = g => kind === 'individual' ? Math.min(g.qty[1], 30) : g.qty[1];
  const fits = Object.entries(LOOT_GOODS).filter(([id, g]) =>
    (g.unit || prefs.includes(id)) && g.gp * g.qty[0] <= target && target <= g.gp * most(g));
  if (!fits.length) return null;
  const own = fits.filter(([id]) => prefs.includes(id));
  const [id, g] = own.length && rand() < 0.7 ? lootPick(own) : lootPick(fits);
  const qty = Math.min(most(g), Math.max(g.qty[0], Math.round(target / g.gp)));
  const value = Math.round(qty * g.gp * 100) / 100;
  const name = g.unit
    ? `${g.name} ${lootPick(g.packs)}, ${qty.toLocaleString()} ${g.unit}`
    : `${qty} ${qty === 1 ? g.name[0] : g.name[1]}, ${lootPick(LIVESTOCK_WHERE)}`;
  return { name, id, qty, value, type: 'goods' };
}

function lootTrap(cr) {
  const t = lootPick(LOOT_TRAPS);
  const [sev, , dcs] = lootWeighted(TRAP_SEVERITY);
  const dc = lootRoll(dcs[0], dcs[1]);
  const find = `DC ${dc} Wisdom (Perception) to spot, DC ${dc} Dexterity check with thieves' tools to disarm.`;
  const effect = t.dmg
    ? `DC ${dc} ${t.save} saving throw or take ${TRAP_DAMAGE[cr][sev]} ${t.dmg} damage${t.from ? ' ' + t.from : ''}${t.after ? ' ' + t.after : ''}; half damage on a success${t.after ? ' and no other effect' : ''}.`
    : t.effect.replace('{dc}', dc);
  return { name: t.name, severity: sev, dc, text: `${t.name} ${t.where} (${sev}). ${find} ${effect}` };
}

const LOCKABLE = /chest|box|case|cabinet|drawer|coffin|sarcophag|vault|strongroom|wardrobe|trunk|compartment|alms/;

// Adds the find to a rolled treasure { coins, gems, art, magic } and totals it.
// opts: source (id or 'random'), luckMult, goods (false = no trade goods).
function decorateTreasure(t, kind, cr, opts = {}) {
  const luckMult = opts.luckMult || 1;
  const ids = lootSourcesFor(kind).map(([id]) => id);
  const sourceId = ids.includes(opts.source) ? opts.source : lootPick(ids);
  const src = LOOT_SOURCES[sourceId];
  const hoard = kind === 'hoard';

  t.gems.forEach(g => { g.look = gemLook(g); });
  t.art.forEach(a => {
    if (rand() < 0.5) a.name = composeArt(String(a.value));
    if (rand() < 0.35) a.note = lootFill(lootPick(ART_NOTES));
  });
  t.magic.forEach(m => { const f = magicFlavor(m); if (f) m.flavor = f; });

  t.goods = [];
  if (opts.goods !== false) {
    const lots = hoard ? (rand() < 0.6 ? lootRoll(1, cr === '17+' ? 3 : 2) : 0) : (rand() < 0.25 ? 1 : 0);
    for (let i = 0; i < lots; i++) {
      const lot = lootGoodsLot(kind, cr, src, luckMult);
      if (lot && !t.goods.some(g => g.id === lot.id)) t.goods.push(lot);
    }
  }

  const trinkets = [];
  const nTrinkets = hoard ? lootRoll(1, 3) : lootWeighted([[0, 20], [1, 55], [2, 25]])[0];
  for (let tries = 0; trinkets.length < nTrinkets && tries < 10; tries++) {
    const s = lootFill(fromSource(src.trinkets, LOOT_TRINKETS, 0.6));
    if (!trinkets.includes(s)) trinkets.push(s);
  }
  t.trinkets = trinkets;

  t.source = sourceId;
  t.holder = fromSource(src.holders, LOOT_HOLDERS[kind], 0.75);
  t.lock = null;
  t.trap = null;
  if (LOCKABLE.test(t.holder)) {
    if (rand() < (hoard ? 0.7 : 0.25)) {
      const [lo, hi] = LOOT_LOCK_DC[cr];
      const dc = rand() < 0.5 ? lo : hi;
      t.lock = { dc, text: `DC ${dc} Dexterity check with thieves' tools to pick, or DC ${Math.min(30, dc + 5)} Strength to force. ${lootPick(LOOT_LOCK_KEYS)}` };
    }
    if (rand() < (hoard ? 0.35 : 0.08)) t.trap = lootTrap(cr);
  }

  const hasCoins = Object.values(t.coins).some(v => v > 0);
  t.coinNote = hasCoins && (hoard || rand() < 0.4) ? `${lootPick(LOOT_COIN_AGES)}; ${lootFill(lootPick(LOOT_COIN_DETAILS))}.` : '';
  t.story = hoard ? `${lootFill(lootPick(src.owners))} ${lootFill(lootPick(src.hooks))}` : '';

  t.totalValue = totalGP(t.coins, t.gems, t.art, t.magic, t.goods);
  // The third pass (R6), drawn last (always two draws): a newer line about the key.
  const newerKey = lootPick(LOOT_LOCK_KEYS_MORE);
  if (rand() < LOOT_LOCK_KEYS_MORE.length / (LOOT_LOCK_KEYS.length + LOOT_LOCK_KEYS_MORE.length) && t.lock) {
    t.lock.text = t.lock.text.slice(0, t.lock.text.indexOf('force. ') + 7) + newerKey;
  }
  return t;
}

// The find as [label, text] pairs, for the page, the kit, and copied text. Older saves have none.
function lootFindLines(l) {
  const src = LOOT_SOURCES[l.source];
  if (!src) return [];
  const lines = [[src.kind === 'hoard' ? 'Found in' : 'Carried by', `${src.icon} ${src.label}`]];
  if (l.holder) lines.push(['Kept', lootCap(l.holder) + '.']);
  if (l.lock) lines.push(['Locked', l.lock.text]);
  if (l.trap) lines.push(['Trapped', l.trap.text]);
  if (l.coinNote) lines.push(['Coins', l.coinNote]);
  if (l.story) lines.push(['Story', l.story]);
  return lines;
}
