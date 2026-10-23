/* ============================================
   CONTINENT ENGINE (F40, Worldbuilder)
   A seeded map of a continent and the nations on it, drawn as inline SVG.
   The land: a height field from seeded value noise (warped, with one to three
   landmasses and ridged mountain chains), the sea level set so the land covers the
   chosen share of the map, lakes, rivers that run downhill to the sea (a priority
   flood, so every river reaches the coast), and climate bands by latitude. Each land
   cell gets one of the Travel tool's terrains (TRAVEL_TERRAIN keys).
   On the land: 3-8 nations grown out from their capitals (borders follow mountains
   and rivers; land nobody reaches stays wild), each with a government, a ruler (the
   NPC page's way, facNpc), a temperament, its exports, a banner, and a feud; towns
   (rollTown seeds, so a marker opens the same town on the Town tab, with the realm's
   kinds of rule), roads between them, and points of interest (rollSite seeds and
   kinds, so each opens on the Sites tab) with a hook each.
   Parts draw from their own child seeds (deriveSeed): a new nation count keeps the
   land; a new land share raises or lowers the sea on the same noise; a new size is a
   new map.
   Needs rng.js, travel-engine.js (TRAVEL_TERRAIN, TRAVEL_CLIMATES), npc-data.js,
   faction-engine.js (facNpc, facCap), history-engine.js (hisRoot), town-engine.js
   (townName, TOWN_SIZES), site-engine.js (siteNameFor, SITE_KINDS). The tables are the
   Gazette's own.
   ============================================ */

// cols × rows: grid cells; miles: miles per cell; freq: how big the noise features are.
const CONT_SIZES = {
    small:  { label: 'Small', icon: '🗺️', cols: 64, rows: 44, miles: 12, freq: 2.6, nations: [3, 4], towns: [2, 3], pois: 5, span: 24 },
    medium: { label: 'Medium', icon: '🗺️', cols: 84, rows: 58, miles: 16, freq: 3.1, nations: [4, 6], towns: [2, 3], pois: 7, span: 32 },
    large:  { label: 'Large', icon: '🗺️', cols: 104, rows: 72, miles: 20, freq: 3.6, nations: [5, 8], towns: [3, 4], pois: 9, span: 42 }
};
const CONT_LANDS = {
    less: { label: 'More sea', frac: 0.3 },
    even: { label: 'Balanced', frac: 0.42 },
    more: { label: 'More land', frac: 0.55 }
};
const CONT_CELL = 10;   // SVG units per cell
const CONT_D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Climate bands: where warmth (1 at the equator, 0 at 72°) crosses each cutoff.
const CONT_CLIMATES = [
    { key: 'polar', label: 'Polar', travel: 'cold', below: 0.2 },
    { key: 'cold', label: 'Cold', travel: 'cold', below: 0.4 },
    { key: 'temperate', label: 'Temperate', travel: 'temperate', below: 0.62 },
    { key: 'warm', label: 'Warm', travel: 'temperate', below: 0.8 },
    { key: 'tropical', label: 'Tropical', travel: 'tropical', below: 9 }
];

// Land cells: the Travel tool's terrains. color: the map tint; mark: the symbol drawn.
const CONT_BIOMES = {
    plains:    { label: 'grassland', color: '#c9b98a', mark: 'grass', road: 1, march: 1 },
    forest:    { label: 'forest', color: '#9aa56d', mark: 'tree', road: 2, march: 1.5 },
    jungle:    { label: 'jungle', color: '#7f9a5c', mark: 'jungle', road: 4, march: 3 },
    hills:     { label: 'hills', color: '#bba57a', mark: 'hill', road: 2.5, march: 2 },
    mountains: { label: 'mountains', color: '#a8957a', mark: 'peak', road: 9, march: 6 },
    moor:      { label: 'moorland', color: '#b8ae86', mark: 'heath', road: 1.4, march: 1.3 },
    desert:    { label: 'desert', color: '#e0cc96', mark: 'dune', road: 2.5, march: 2 },
    badlands:  { label: 'badlands', color: '#cfa87c', mark: 'canyon', road: 2.5, march: 2 },
    swamp:     { label: 'swamp', color: '#9a9f78', mark: 'reed', road: 5, march: 3 },
    tundra:    { label: 'tundra', color: '#dcdccd', mark: 'snow', road: 2.5, march: 2 }
};

const CONT_GOVS = {
    kingdom: { label: 'Kingdom', a: 'a kingdom', forms: ['the Kingdom of {r}', 'the Crown of {r}', 'the Realm of {r}'], cat: 'noble', title: ['King', 'Queen', 'Monarch'],
        towns: ['lord', 'reeve', 'mayor'], how: 'A crowned monarch rules from {capital}; the great houses quarrel over everything else.' },
    empire: { label: 'Empire', a: 'an empire', forms: ['the {r} Empire', 'the Empire of {r}', 'the Throne of {r}'], cat: 'noble', title: ['Emperor', 'Empress', 'Sovereign'],
        towns: ['governor', 'lord', 'senate'], how: 'An emperor in {capital} claims every land in sight, and sends governors to the ones that disagree.' },
    theocracy: { label: 'Theocracy', a: 'a theocracy', forms: ['the Holy Realm of {r}', 'the Sacred See of {r}', 'the Hallowed Land of {r}'], cat: 'religious', title: ['Hierarch', 'Hierarch', 'Hierarch'],
        towns: ['temple', 'elder', 'reeve'], how: 'The high temple in {capital} rules in its god\'s name, and collects the tithe with great piety and greater thoroughness.' },
    republic: { label: 'Republic', a: 'a republic', forms: ['the Republic of {r}', 'the Free Cities of {r}', 'the Commonwealth of {r}'], cat: 'merchant', title: ['First Consul', 'First Consul', 'First Consul'],
        towns: ['mayor', 'council', 'senate'], how: 'Elected consuls sit in {capital}. Elections are frequent, loud, and now and then honest.' },
    league: { label: 'Merchant league', a: 'a merchant league', forms: ['the {r} League', 'the Merchant League of {r}', 'the Compact of {r}'], cat: 'merchant', title: ['Doge', 'Dogaressa', 'Doge'],
        towns: ['council', 'prince', 'puppet', 'mayor'], how: 'The trading houses of {capital} run the country like a ledger: everything has a price, the law included.' },
    magocracy: { label: 'Magocracy', a: 'a magocracy', forms: ['the Arcane Dominion of {r}', 'the Spires of {r}', 'the Conclave of {r}'], cat: 'magic', title: ['Archmage', 'Archmage', 'Archmage'],
        towns: ['wizard', 'governor', 'council'], how: 'Wizards rule from the towers of {capital}. Common folk may govern themselves in anything too dull for a wizard to notice.' },
    clans: { label: 'Clan holds', a: 'a land of clan holds', forms: ['the Clans of {r}', 'the Thanes of {r}', 'the Holds of {r}'], cat: 'guard', title: ['High Thane', 'High Thane', 'High Thane'],
        towns: ['elder', 'lord', 'reeve'], how: 'The clan chiefs meet at {capital} each winter to choose a high thane, and spend the rest of the year regretting it.' }
};
const CONT_GOV_KEYS = Object.keys(CONT_GOVS);

const CONT_TEMPERS = [
    'Proud, touchy, and quick to take offense at a foreign accent.', 'Shrewd traders who will sell you anything, including your own horse back to you.',
    'Pious and solemn; the bells ring for prayers seven times a day.', 'Warlike: every child learns the spear before letters.',
    'Closed and wary. Strangers need a writ to stay past sundown.', 'Rich, idle, and bored, which makes them dangerous.',
    'Famous for hospitality: a guest is fed first and asked questions later.', 'Superstitious to the bone; no one builds, marries, or sails without an omen.',
    'Bookish and argumentative; their scholars are better known than their soldiers.', 'Hungry for land, and not shy about the neighbors\'.',
    'Tired after a long war, and touchy about who won it.', 'Loud, cheerful, and always in the middle of some festival.',
    'Stubborn traditionalists who distrust anything newer than their grandmothers.', 'Restless explorers; half their sons and daughters are somewhere else.'
];
const CONT_PROSPERITY = [['modest', 5], ['poor', 3], ['prosperous', 3]];
const CONT_PROSPERITY_TEXT = { poor: 'Poor, and getting poorer.', modest: 'Getting by.', prosperous: 'Prosperous, and wants everyone to know it.' };

// What a land sells, by its terrain (coast: the coastal cells).
const CONT_EXPORTS = {
    plains: ['grain', 'wool', 'horses', 'cheese', 'beer', 'cattle'], forest: ['timber', 'furs', 'honey', 'charcoal', 'longbows'],
    jungle: ['spices', 'dyes', 'rare woods', 'cocoa', 'medicinal bark'], hills: ['iron', 'copper', 'slate', 'wool', 'tin'],
    mountains: ['silver', 'gems', 'marble', 'iron', 'mithral, in rumor at least'], moor: ['wool', 'peat', 'ponies', 'heather honey'],
    desert: ['glass', 'spices', 'salt', 'dates', 'incense'], badlands: ['copper', 'sulfur', 'obsidian', 'fire opals'],
    swamp: ['peat', 'herbs', 'eels', 'reeds', 'leeches for physicians'], tundra: ['furs', 'ivory', 'whale oil', 'amber'],
    coast: ['salt fish', 'salt', 'pearls', 'ships', 'whale oil']
};

const CONT_FEUDS = [
    'a border river both claim, and both tax', 'a royal wedding that ended at the altar', 'tolls on the road to {other}', 'a stolen holy relic that each says is its own',
    'an old war neither has forgotten, or agrees on the end of', 'a pretender to the throne that {other} keeps fed and comfortable', 'grazing rights in the hills between them',
    'a debt from a war loan, never repaid', 'raids across the border that each blames on the other', 'a disputed silver seam right under the border stones',
    'an ambassador from {other} who insulted the ruler\'s mother', 'fishing waters, and the sinking of three boats'
];

// ── Second pass (E5). Each nation's newer parts roll from nation.<k>.more, after the
// old ones, so an old link keeps its tempers, feuds, and exports unless a swap draw says so.
const CONT_TEMPERS_MORE = [
    'Gloomy, dry-witted, and convinced the weather is personal.', 'Gamblers to a soul; even the courts settle ties with dice.',
    'Gentle and slow to anger, and terrible once they get there.', 'Gossips: news crosses the realm faster than the post riders.',
    'Hard-working and humorless; idleness is a fineable offense.', 'Horse-mad. A family\'s worth is counted in mounts.',
    'Suspicious of magic, and of anyone who reads too much.', 'Sentimental about their dead; every house keeps a shrine to its grandparents.',
    'Proud of their cooking, and offended by anyone else\'s.', 'Litigious: they sue their neighbors, their lords, and now and then the weather.',
    'Seafarers at heart, even the ones who live a hundred miles inland.', 'Haunted by an old defeat, and building statues to the generals who lost it.',
    'Thrifty to a fault; they mend a boot four times before they buy one.', 'Fond of duels, and of the laws that pretend to forbid them.',
    'Welcoming to strangers, and very curious about their purses.', 'Song-proud: every village keeps a choir, and the choirs keep feuds.'
];

// Customs: one shared, or (now and then) one that fits the rule.
const CONT_CUSTOMS = [
    'Every guest is given salt and bread at the door, and refusing them is an insult.', 'Debts are forgiven at midwinter, which makes autumn a busy season for lenders.',
    'The dead are buried with a coin for the ferryman and a second one, in case he raises his prices.', 'Nobody whistles after dark; it calls the wrong kind of listener.',
    'A promise made over a shared cup of ale is binding in law.', 'Every child plants a tree on their naming day, and the trees are counted in the census.',
    'A stranger who arrives during a storm must be sheltered, whoever they are.', 'Weddings last three days, and the third is spent apologizing.',
    'Swords are peace-bound with red cord inside town walls; cutting the cord is a crime.', 'Bells ring once for every death in the realm, so the big cities ring all day.',
    'Spring begins when the oldest woman in each village says it does.', 'A fallen enemy\'s boots are returned to their family. Everything else is fair plunder.',
    'Every road shrine must be kept with fresh flowers; travelers who pass one bare stop to fill it.', 'The first fish of the season is thrown back, with an apology.',
    'Lying on a feast day is bad luck, so feast days are very quiet.', 'Names are not spoken over a new grave for a year and a day.',
    'Any quarrel can be settled by a race, if both sides agree to the course.', 'Mirrors are covered at night, and nobody will say why anymore.',
    'Bread is never cut with a knife, only torn.', 'Heralds may cross any border unharmed, so a great many spies carry herald\'s staves.',
    'A dragon\'s name is never spoken aloud, even in jest.', 'The harvest festival crowns a fool king who rules, in law, for a day.',
    'Every town keeps a copy of the realm\'s founding charter, and reads it aloud each spring, typos included.', 'A traveler who shares a road meal is safe from the host for a night and a day.'
];
const CONT_CUSTOMS_GOV = {
    kingdom: ['Commoners bow to the royal portrait in every inn, and the inns charge extra for the privilege.', 'Every noble house keeps one empty chair at table for the monarch, who has never once come.', 'Royal birthdays are holidays, so the crown has a great many birthdays.'],
    empire: ['Every province sends a hostage child to the capital, to be raised at court and remember who is in charge.', 'Imperial milestones mark every road, counting the miles to the capital.', 'Conquered peoples keep their gods, as long as they add the emperor to the list.'],
    theocracy: ['No work is done on holy days, and the calendar has a great many holy days.', 'Every child spends a year serving in the temple before they choose a trade.', 'Oaths are sworn on relics, and lying on one is said to rot the tongue.'],
    republic: ['Every citizen may speak once a year in the assembly, and some save it up for decades.', 'Officials wear plain grey so nobody can say they dress above the people.', 'Votes are cast with black and white beans, and bean merchants grow rich in election years.'],
    league: ['Contracts are signed in public in the market square, before witnesses who are paid by the word.', 'Guild seals count as law: a broken seal is a crime, whatever was inside.', 'Even weddings come with a written contract and a dowry ledger.'],
    magocracy: ['Common folk need a license to cast any spell, even a cantrip to light a pipe.', 'Every child is tested for the gift at seven, and the gifted are taken to the towers.', 'Wizards are greeted with a bow; anyone else wearing a pointed hat is fined.'],
    clans: ['Every clan keeps a tally-stick of debts owed by the others, and the sticks are very long.', 'Disputes are settled at the great moot, by argument first and by wrestling after.', 'A child is fostered for seven years with another clan, to keep the peace.']
};

// What keeps the ruler up at night. {other}: a rival realm's root; {capital}.
const CONT_WORRIES = [
    'An heir who would rather write poetry than rule.', 'A cousin with a better claim to the throne and a growing following.',
    'A treasury emptier than anyone has been told.', 'A plague in the river towns that the healers cannot name.',
    'Spies from {other}, and a growing suspicion that one sits on the council.', 'A prophecy about the end of the dynasty, now quoted in every tavern.',
    'A general more popular than the ruler.', 'Three bad harvests in a row, and bread riots in {capital}.',
    'A secret marriage that would ruin an alliance if it came out.', 'An assassin who has failed twice, and keeps trying.',
    'The temples, which own a third of the land and would like the rest.', 'An old treaty with {other} that runs out at the end of the year.',
    'A dragon that wants tribute doubled.', 'The ruler\'s own failing health, hidden behind a curtain and a body double.',
    'Bandits on the trade roads, and merchants threatening to take their goods elsewhere.', 'A missing royal seal, and forged decrees turning up in the provinces.',
    'A guild strike that has shut the docks and the mines.', 'Ghosts in the palace, which the court wizard insists are drafts.',
    'Refugees from {other}, crossing the border by the thousand.', 'A rebel lord in the hills who is winning the songs, if not the battles.'
];

const CONT_FEUDS_MORE = [
    'a princess who eloped across the border, and the dowry that went with her', 'a mountain pass both say their ancestors carved',
    'the drowning of a trade fleet, blamed on {other}\'s pilots', 'a holy site on the border that both faiths claim',
    'a wizard who fled with the other side\'s secrets', 'a famine year when {other} sold grain at triple price',
    'a coronation insult no one will repeat in polite company', 'the river {other} dammed for its mills',
    'a border town that switches sides whenever the taxes change', 'a hero each side claims as their own',
    'a treaty signed in two languages that don\'t say the same thing', 'a murdered heir, and a confession nobody believes',
    'smugglers that {other} pretends not to see', 'a forest both sides log and neither will replant',
    'a map, drawn a century ago, that put the border in the wrong valley', 'a war of tariffs that has outlasted the people who started it'
];
// How a feud stands now (said once per pair).
const CONT_FEUD_NOW = [
    'For now, an uneasy truce.', 'Skirmishes along the border every summer.', 'Both sides are hiring mercenaries.',
    'Talks are under way, and going badly.', 'Cold: no trade, no envoys, no letters.', 'Open war is a matter of when, not if.',
    'A marriage is being arranged to end it, and neither bride nor groom has been asked.', 'The common folk trade across the border anyway.',
    'Each side holds hostages of the other.', 'A neutral power has offered to judge it, for a fee.', 'Quiet, since the last war, but nobody has forgotten.',
    'Raids and counter-raids, and a list of grievances that grows every season.'
];

// More goods per terrain: a nation's export may swap to one of these.
const CONT_EXPORTS_MORE = {
    plains: ['linen', 'oats', 'leather', 'mead'], forest: ['resin', 'mushrooms', 'carved wood', 'venison'],
    jungle: ['parrots', 'rubber', 'tea', 'snake venom for alchemists'], hills: ['lead', 'whetstones', 'cider', 'goat cheese'],
    mountains: ['crystal', 'mountain goats', 'granite', 'healing springs water'], moor: ['woolen cloth', 'grouse', 'standing stones, in pieces'],
    desert: ['camels', 'carpets', 'silver jewelry', 'saltpeter'], badlands: ['giant bones', 'iron', 'jasper', 'saltpeter'],
    swamp: ['rice', 'frog leather', 'poisons, quietly', 'cranberries'], tundra: ['reindeer', 'walrus ivory', 'smoked fish', 'snow-fox pelts'],
    coast: ['sailcloth', 'dried kelp', 'shellfish', 'rope']
};

// Trade with a neighbor that isn't its feud: {good} {them} {road}.
const CONT_TRADE = [
    'Sells {good} to {them}, {road}.', 'Sends {good} to {them}, {road}, and buys their {back} in return.',
    'Has a standing contract to supply {them} with {good}, {road}.', 'Its traders carry {good} to {them}, {road}, and bring back {back}.',
    'Trades {good} for {them}\'s {back}, {road}, and both sides think they got the better deal.', 'Gets a high price for {good} in {them}, {road}.'
];
// What a border is made of, and how it is kept.
const CONT_BORDER = {
    mountains: ['passes watched by forts', 'one pass, snowed shut half the year', 'old watchtowers on every peak'],
    river: ['two bridges, both taxed', 'ferries on both banks and toll collectors on each', 'a river nobody can agree the middle of'],
    forest: ['a forest neither side patrols', 'woodland where the border stones have walked', 'a forest road with a toll house at either end'],
    open: ['a line of boundary stones, moved now and then', 'open fields and a busy customs house', 'a dyke and ditch from an older war']
};
// Third pass (R9): swapped in by their share (part 'borders.more'), the same on both sides.
const CONT_BORDER_MORE = {
    mountains: ['a pass held by a monastery that answers to neither side', 'goat tracks only the smugglers know', 'a tunnel the dwarves charge both sides to use'],
    river: ['fords marked with painted posts that move after every flood', 'a river island both sides keep a garrison on', 'a chain across the water at the old crossing'],
    forest: ['blazes on the trees, renewed each spring by both sides', 'a wood where the rangers of both sides drink together', 'a forest the druids say belongs to neither'],
    open: ['a road lined with gibbets, as a warning', 'a strip of land nobody dares to farm', 'watchtowers a mile apart, each in sight of the other']
};
const CONT_BORDER_WHAT = { mountains: 'the mountains', river: 'a river', forest: 'deep forest', open: 'open country' };

// Capitals: what each is known for.
const CONT_CAPITAL_FAME = [
    'a bridge lined with a hundred shops', 'a cathedral that has been under construction for two centuries', 'the best library in the land',
    'walls that have never been breached', 'a great market that never closes', 'a palace built over an older palace, built over an older one',
    'a lighthouse older than the kingdom', 'the arena, where the realm settles its duels in public', 'gardens that bloom in winter',
    'a clock tower whose clock runs one hour fast, on purpose', 'its catacombs, which are larger than the city above', 'a statue of the founder, with a nose that was replaced three times',
    'a tavern that claims to have served every ruler since the founding', 'its mint, guarded by golems', 'a bell that rings by itself before disasters',
    'the riots, which happen on schedule every spring', 'a university that awards degrees in fencing', 'its smell, mostly from the tanneries'
];

// Sea lore, for the named seas.
const CONT_SEA_LORE = [
    'sailors say a drowned city rings its bells below on calm nights', 'a kraken sleeps in its deepest trench, and is not to be woken',
    'the fog comes in fast and leaves ships far from where they were', 'its islands move, a little, from one chart to the next',
    'pirates keep a free port on an island no navy has found', 'whales gather there each autumn, and so do the whalers',
    'the water glows green at night, and the fish taste of copper', 'a ghost ship sails it, always heading for home',
    'merfolk trade pearls for iron knives at the reef markets', 'its storms come only from the west, and only on the new moon',
    'a sea serpent is sighted every few years, a little bigger each time', 'a sunken treasure fleet lies somewhere under it, and every captain has a map',
    'its tides run higher than they should, and the old charts blame the moon\'s mood', 'a lighthouse stands alone in the middle of it, still lit, with no keeper'
];

// Third pass (R9): swapped in by their share (part 'seas.lore.more').
const CONT_SEA_LORE_MORE = [
    'the drowned dead walk out of it on one night a year, and go home', 'a sea witch sells fair winds there, for a price paid later',
    'its waters turn red each spring, and nobody fishes then', 'an island in it shows only at low tide, with a temple on it',
    'giant turtles cross it every summer, and a few carry villages on their backs', 'a whirlpool opens in its middle once in a generation',
    'sailors throw a coin overboard at its midpoint, and those who forget don\'t come back', 'its fishermen speak a trade tongue nobody else understands',
    'a bell rings out in it where no buoy was ever set', 'a great chain lies across its narrows, laid by a forgotten empire',
    'the gulls there talk, a little, and mostly complain', 'its pirates fly a flag of truce on holy days, and keep to it'
];

const CONT_TINCTURES = ['gold', 'silver', 'red', 'blue', 'green', 'black', 'purple'];
const CONT_CHARGES = ['a stag', 'a tower', 'a crowned lion', 'three stars', 'a ship', 'a wolf\'s head', 'an oak', 'a key', 'a sun', 'a crescent moon',
    'a hammer', 'a rose', 'a serpent', 'an eagle', 'a bell', 'a sword', 'a bear', 'a lantern', 'a horse', 'a gauntlet'];
// The tinctures as drawn on a coat of arms (contArmsSvg).
const CONT_TINCTURE_COLORS = { gold: '#d6a62a', silver: '#ece8dc', red: '#b3261e', blue: '#1f4f9e', green: '#2e7a3a', black: '#1d1b19', purple: '#6b2f8f' };
// Map tints for the nations (one each; muted, so terrain still shows).
const CONT_COLORS = ['#b8432f', '#2f6db8', '#4f9a3a', '#8a3fb0', '#c08a1e', '#1f8a8a', '#b03f78', '#5a5a5a'];

const CONT_NAMES = ['{r}', 'the {r} Reach', 'the Lands of {r}', '{r}', 'the {r} Expanse'];
const CONT_SEA_ADJ = ['Grey', 'Sunless', 'Amber', 'Shattered', 'Whispering', 'Cold', 'Jade', 'Storm', 'Silver', 'Drowned', 'Glass', 'Long'];
const CONT_SEAS = ['the Sea of {r}', 'the {Adj} Sea', 'the {Adj} Deep', 'the {r} Gulf', 'the {Adj} Waters'];

// Points of interest. site: the SITE_KINDS key it opens. biomes: where it likes to be.
// names: its own map name (else the site's name). Hooks: {site} {near} {nation}.
// more: hooks from the second pass (E5), swapped in by a later draw.
const CONT_POIS = {
    ruin: { label: 'Ruined keep', site: 'keep', biomes: { plains: 3, hills: 3, moor: 3, forest: 1, badlands: 2 }, hooks: [
        'Lights burn in {site} again, and {near} wants to know who lit them.',
        'The last lord of {site} buried the family silver before the end. The oldest drunk in {near} claims to know where.',
        '{nation} wants the old keep garrisoned before its rivals take it. Nobody has told the current tenants.',
        'A survey party from {near} went up to {site} a month ago. One came back, and won\'t talk.',
        'Every child in {near} dares the others to touch the gate of {site}. This year one did, and is still missing.'],
        more: [
        'A banner nobody recognizes flies over {site}. {near} sent two riders to ask whose it is; neither came back.',
        'The heir to {site} has turned up in {near} with a deed, a sword, and no money, and wants an escort home.',
        'Masons from {near} have taken stone from {site} for years. This spring the walls started taking masons.'] },
    barrow: { label: 'Old barrow', site: 'barrow', biomes: { moor: 4, plains: 2, hills: 3, tundra: 2 }, hooks: [
        'The barrow-mound outside {near} split open in the spring rains. Something walked out of {site} before anyone walked in.',
        'A grave-robber from {near} sold a crown at market last week. The crown came from {site}, and the robber hasn\'t been seen since.',
        'Shepherds won\'t graze near {site}: the sheep go in and don\'t come out.',
        'The priests of {nation} want {site} sealed for good. A scholar in {near} will pay double to see it first.',
        'On the longest night, the dead of {site} are said to answer one question each.'],
        more: [
        'A farmer outside {near} ploughed up a gold torc by {site}. Since then, the mound has been humming.',
        '{nation} wants the old chief in {site} named as its founder, and needs proof. The proof is still in the grave.',
        'Mist rolls out of {site} every dawn and stops at the edge of {near}. Each day, a little closer.'] },
    dragon: { label: 'Dragon\'s lair', site: 'lair', biomes: { mountains: 6, hills: 1 },
        names: ['Mount {r}', 'the {Adj} Peak', '{r}\'s Teeth', 'the Smoking Crag', 'the Burnt Horn', 'the {Adj} Spire'], adj: ['Black', 'Red', 'Ashen', 'Broken', 'Howling', 'Cinder'], hooks: [
        'Herds vanish from the valleys below {place}, and {near} pays tribute it can\'t afford. The herders say dragon. The cave is {site}.',
        'Smoke rises from {place} for the first time in a lifetime. {nation} has offered a knighthood to whoever finds out why, inside {site}.',
        'A dragon\'s hoard is said to lie in {site}, under {place}. Every fool in {near} has a map to it. One of the maps might be real.',
        'Something huge flies over {near} at dusk, always back toward {place}. The lair, {site}, has not been seen by anyone who came home.'],
        more: [
        'A young dragon has claimed {place} and sent {near} a list of demands in very good handwriting. The lair is {site}.',
        'Scales the size of shields wash down the river from {place}. Something up in {site} is molting, or dying.',
        '{nation} signed a treaty with the dragon of {site} a century ago. The dragon has come down to {near} to renew it, on new terms.'] },
    wood: { label: 'Cursed wood', site: 'lair', biomes: { forest: 5, jungle: 4, swamp: 2 },
        names: ['the {Adj} Wood', '{r} Forest', 'the Weeping Wood', 'the {Adj} Thicket', 'the Hollow Trees', 'the {Adj} Wilds'], adj: ['Whispering', 'Thorn', 'Gloaming', 'Witch', 'Hungry', 'Silent'], hooks: [
        'The woodcutters of {near} won\'t go into {place} anymore. The trees there have started following them home. Something lairs at its heart: {site}.',
        'Paths in {place} lead back to where they started. A girl from {near} walked in and came out forty years older. She says the answer is {site}.',
        '{nation} lost a whole patrol in {place}. Their horses came back, saddled and calm. The tracks end at {site}.',
        'Strange fruit grows in {place}, and the alchemists of {near} pay a fortune for it, if anyone comes back from {site} with some.'],
        more: [
        'Every seven years {place} lets one traveler through to {site}. This is the seventh year, and {near} is drawing lots.',
        'A druid came out of {place} to warn {near} that something is waking at {site}, and fell asleep mid-sentence. She hasn\'t woken.',
        'The foresters of {nation} marked {place} for felling. The marks have moved to their own front doors, and the trail leads to {site}.'] },
    tower: { label: 'Wizard\'s tower', site: 'tower', biomes: { hills: 2, moor: 3, plains: 1, forest: 2, tundra: 2, badlands: 2, desert: 1 }, hooks: [
        'The wizard of {site} hasn\'t been seen in years, but the lights still change color every night, and {near} is tired of it.',
        '{site} appeared overnight on a hill outside {near}. Nobody built it. The door is open.',
        'The apprentices of {site} came down to {near} for supplies and paid in coins from a kingdom that fell centuries ago.',
        '{nation} wants the wizard of {site} to answer for a plague of frogs. Someone has to deliver the summons.',
        'A storm sits over {site} and hasn\'t moved in a month. The farmers of {near} would like their sun back.'],
        more: [
        'A letter from {site} invites the bravest soul in {near} to tea. The last three who accepted are still there.',
        '{site} has started to lean toward {near}, a little more each week.',
        'The wizard of {site} has died, and the will leaves everything to whoever reaches the top floor first. Half of {near} is packing.'] },
    mine: { label: 'Lost mine', site: 'mine', biomes: { hills: 5, mountains: 3, badlands: 2 }, hooks: [
        'The miners dug too deep in {site} and fled. {near} still has the deed, and a reward for whoever clears it.',
        'Ore carts roll out of {site} by themselves at night, full, and nobody in {near} is loading them.',
        'A dwarf in {near} has the only map of {site}, and wants a bodyguard, a share, and a promise not to ask about her brother.',
        '{nation} needs the silver in {site} to pay its army, and the army is getting restless.',
        'The canaries come back from {site} singing a song nobody taught them.'],
        more: [
        'Miners from {near} broke into a vault under {site} full of someone else\'s tools, far older than theirs.',
        'Fresh gold from {site} is turning up in {near}, though the mine has been sealed for twenty years.',
        '{nation} sent convicts to work {site}. The convicts sent back a letter declaring themselves a kingdom.'] },
    temple: { label: 'Sunken temple', site: 'temple', biomes: { swamp: 6, jungle: 3, coast: 3 }, hooks: [
        'The waters around {site} dropped in the drought, and the temple roof is showing. Half of {near} wants to loot it; the other half wants it drowned again.',
        'Fishermen out of {near} pull up idols from the shallows by {site}. Everyone who keeps one dreams of the same door.',
        'A bell rings under the water at {site} when a storm is coming. Lately it rings every night.',
        'The priests of {nation} say {site} holds a relic stolen centuries ago, and want it back before anyone else does.',
        'Pilgrims still come to {site} by boat, and fewer of them leave than arrive.'],
        more: [
        'The god of {site} is forgotten everywhere but {near}, where folk still leave offerings. Lately the offerings are taken.',
        'A diver from {near} came up from {site} with a golden mask, and now speaks only in a tongue nobody knows.',
        '{nation} is draining the marsh around {site} for farmland. The water keeps coming back, and so do the priests.'] },
    fort: { label: 'Bandit fort', site: 'fort', biomes: { forest: 3, hills: 3, badlands: 3, plains: 1, moor: 1 }, hooks: [
        'Raiders from {site} took the tax wagon bound for {near}, and {nation} wants the tax back more than the raiders dead.',
        'The bandits of {site} are holding a merchant\'s heir for ransom. The merchant in {near} would rather pay you than them.',
        'Nobody pays the toll at the bridge near {near} anymore; they pay the folk at {site} instead.',
        '{site} was a border fort of {nation}. The soldiers never left when the pay stopped; they just changed jobs.',
        'Somebody in {near} is selling the caravan schedules to {site}. Find them, or end the fort.'],
        more: [
        'The bandit chief of {site} has written to {near} proposing marriage to the mayor. The mayor is considering it.',
        '{site} has fallen to something worse than bandits, and the bandits came to {near} begging for help.',
        'Soldiers of {nation} besieged {site} all summer and gave up. They left a siege engine behind, and someone has been using it.'] },
    // The newer kinds (with their own map art): a place's kind may swap to one of them, under its own
    // seed (CONT_POI_MORE in rollContinent), so the older draw holds.
    lighthouse: { label: 'Dark lighthouse', site: 'lighthouse', biomes: { coast: 6 }, hooks: [
        'The lamp of {site} went out a month ago, and two ships have broken on the rocks since. {near} wants to know why the keeper stopped answering.',
        'Someone relit {site} last night, though the keeper has been dead ten years. The lamp burns green now.',
        'Smugglers out of {near} pay the keeper of {site} to look the other way. {nation} would pay more to learn which way.',
        'A ship that sank fifty years ago signaled {site} last night, asking for a berth.',
        'The keeper of {site} has sent to {near} for help: something keeps climbing the tower from the sea side.'],
        more: [
        '{nation} wants {site} rebuilt before the winter storms. The masons from {near} came back from the first survey white-haired.',
        'The light of {site} has started pointing inland, at {near}, every night at the same hour.',
        'A child from {near} swears she saw the keeper of {site} walk into the sea and keep walking.'] },
    monastery: { label: 'Cliffside monastery', site: 'temple', biomes: { mountains: 4, hills: 3, tundra: 1 },
        names: ['the Monastery of {r}', 'the {Adj} Cloister', 'the House of {r}', '{r} Abbey'], adj: ['Silent', 'High', 'Ashen', 'Weeping', 'Cloud', 'Iron'], hooks: [
        'The monks of {place} took a vow of silence a century ago. Last week one ran into {near} screaming, and hasn\'t stopped. The trouble is below, in {site}.',
        'Pilgrims climb the steps to {place} every spring. This year the steps went on further than they used to, down into {site}.',
        'The abbot of {place} has asked {nation} for soldiers, and won\'t say against what. The monks have bricked up the way to {site}.',
        'A novice from {near} ran away from {place} with a book the abbot wants back unread.',
        'The bell of {place} rang thirteen times at midnight. In {near} they say that means {site} is open again.'],
        more: [
        'The monks of {place} brew a famous cordial, and the last barrel that came down to {near} had a hand in it.',
        '{place} has stopped sending for supplies. Smoke still rises, and {near} counts one goat fewer every night.',
        'An old monk from {place} is dying in {near}, and will only confess to someone who has been inside {site}.'] },
    stones: { label: 'Standing stones', site: 'barrow', biomes: { moor: 5, plains: 3, hills: 2, tundra: 2 },
        names: ['the {Adj} Stones', 'the Ring of {r}', '{r}\'s Dance', 'the Nine Maidens', 'the {Adj} Circle'], adj: ['Old', 'Whispering', 'Grey', 'Crooked', 'Singing', 'Hollow'], hooks: [
        'The stones of {place} have moved again. The farmers of {near} counted, and there is one more than at harvest. The barrow under them, {site}, is open.',
        'Druids from all over {nation} are gathering at {place} for a rite nobody in {near} has been told about.',
        'Sleep inside {place} on a clear night and you dream of {site}. Three sleepers from {near} haven\'t woken.',
        'A surveyor from {nation} marked {place} for a road. His instruments were found on the altar stone, pointing at {site}.',
        'Every midsummer a door appears in the tallest stone of {place}. This year someone from {near} went through it.'],
        more: [
        'Lightning split the altar stone of {place} in two. Inside it: a stair down to {site}.',
        'The shepherds of {near} pay a coin to {place} every spring. This year they didn\'t, and the flock walked into {site}.',
        'A scholar in {near} has worked out that {place} is a clock, and that it is about to strike.'] },
    battlefield: { label: 'Old battlefield', site: 'barrow', biomes: { plains: 5, moor: 3, hills: 2, badlands: 2 },
        names: ['the Field of {r}', '{r} Field', 'the {Adj} Field', 'the Plain of Swords', 'the {Adj} Rout'], adj: ['Red', 'Broken', 'Last', 'Crow', 'Weeping', 'Lost'], hooks: [
        'Every year on the day of the battle, the dead of {place} form up again. This year they marched toward {near}. The fallen king lies in {site}.',
        'Farmers from {near} still plough up swords on {place}. This spring one ploughed up a banner, and it hasn\'t stopped bleeding.',
        '{nation} lost {place} and never forgave it. The old general\'s tomb, {site}, holds the orders that lost it.',
        'A scavenger in {near} sells relics from {place}. The latest, a helm, whispers its owner\'s name.',
        'Crows gather over {place} in their thousands, and the folk of {near} say they are waiting for something to come out of {site}.'],
        more: [
        'Two families in {near} still feud over who ran first at {place}. Both want proof from {site}, and neither wants the other to find it.',
        'A ghostly herald rode out of {place} into {near} with a challenge. Nobody knows who it is for.',
        'The great grave at {place} has sunk, and where it was, a stair leads down to {site}.'] },
    portal: { label: 'Stone portal', site: 'tower', biomes: { hills: 3, mountains: 2, moor: 2, desert: 2, plains: 1, tundra: 1 },
        names: ['the {Adj} Gate', 'the Arch of {r}', '{r}\'s Door', 'the {Adj} Arch'], adj: ['Violet', 'Empty', 'Star', 'Whispering', 'Broken', 'Hollow'], hooks: [
        'The arch of {place} lit up violet last night, for the first time in living memory. The wizard who watched it from {site} hasn\'t come down since.',
        'Things come through {place}: last month a goat with too many eyes, last week a letter addressed to {near}.',
        '{nation} has posted guards at {place}. They are paid in gold they can\'t spend, minted on the other side.',
        'A merchant in {near} swears he walked through {place} to a city of brass and back in an afternoon, and lost a year.',
        'The key to {place} is said to lie in {site}. Three crews from {near} have gone after it this season.'],
        more: [
        '{place} has started to hum, and every dog in {near} howls along. The old keeper\'s notes are in {site}.',
        'Someone came through {place} from the other side and asked the way to {near}. Politely. With a sword.',
        'The arch of {place} has cracked, and the light inside is leaking across the grass toward {site}.'] },
    bones: { label: 'Giant\'s bones', site: 'lair', biomes: { badlands: 4, desert: 4, tundra: 3, hills: 2, plains: 1 },
        names: ['the {r} Bones', 'the Ribs of {r}', 'the {Adj} Skull', 'the Giant\'s Rest', '{r}\'s Ribcage'], adj: ['White', 'Sunken', 'Great', 'Grinning', 'Broken', 'Old'], hooks: [
        'Something has made its lair in the skull at {place}. The herds around {near} are thinning, and the tracks lead into {site}.',
        'Scholars from {nation} want the bones of {place} measured. Nobody has measured them twice and got the same answer.',
        'Bone carvers from {near} take what they need from {place}. Lately the bones have been taking it back.',
        'The giant of {place} died holding something. Its fist is in {site}, and it hasn\'t opened.',
        'On windy nights {place} howls like a flute, and the children of {near} sleepwalk toward it.'],
        more: [
        'A rival town claims {place} as its founder\'s grave, and wants {near}\'s share of the pilgrims.',
        'A tooth from {place} sold in {near} for a fortune. The buyer has since grown a foot.',
        'The ground around {place} is rising. The giant, it seems, is sitting up, and something nests in {site}.'] },
    wreck: { label: 'Shipwreck', site: 'shipwreck', biomes: { coast: 6 }, hooks: [
        'The tide went out further than anyone has seen and left {site} high on the rocks near {near}, its hold still sealed.',
        '{site} went down with {nation}\'s pay chest aboard. Divers from {near} are going after it, and so is everyone else.',
        'Lanterns move inside {site} at low tide, though the crew drowned years ago.',
        'The only survivor of {site} is in {near}, and will only say that they didn\'t hit a rock. The rock hit them.',
        'Wreckers lured {site} onto the reef. {near} would like them found before they do it again.'],
        more: [
        'The figurehead of {site} washed up in {near}, and keeps turning to face the wreck.',
        'A map in the captain\'s cabin of {site} is worth more than the ship. Two crews from {near} are racing for it.',
        'Crabs the size of carts have taken {site} as a shell, and the fishing out of {near} has stopped.'] },
    oracle: { label: 'Oracle\'s shrine', site: 'temple', biomes: { hills: 3, mountains: 2, forest: 2, plains: 2, desert: 2 },
        names: ['the Oracle of {r}', 'the {Adj} Shrine', 'the Seat of {r}', 'the {Adj} Brazier'], adj: ['Veiled', 'Smoking', 'Silent', 'Blind', 'Golden', 'Last'], hooks: [
        'The oracle of {place} answers one question a year. This year she answered before anyone asked, with the name of a family in {near}. The way down to {site} opened that night.',
        '{nation} won\'t go to war without the oracle\'s blessing, and the oracle of {place} has stopped talking.',
        'Pilgrims to {place} breathe the smoke and see their own deaths. Someone from {near} saw the party\'s instead.',
        'The priestesses of {place} are hiring guards. They say they have foreseen why, and won\'t say what.',
        'The brazier of {place} has gone out. The last time that happened, {near} burned.'],
        more: [
        'A false oracle has set up in {near} and is drawing the pilgrims away from {place}. The real one wants it stopped, and knows how.',
        'The oracle of {place} has foretold her own murder, and asked {near} for guards.',
        'Everyone who visits {place} this month gets the same answer: go to {site}.'] },
    witch: { label: 'Witch\'s hut', site: 'lair', biomes: { swamp: 5, forest: 4, jungle: 2, moor: 2 },
        names: ['{r}\'s Hut', 'the Hut on Hen\'s Legs', 'the {Adj} Cottage', 'Old Mother {r}\'s', 'the {Adj} Hovel'], adj: ['Crooked', 'Walking', 'Smoking', 'Gingerbread', 'Hungry', 'Mossy'], hooks: [
        'The hut of {place} walked out of the woods and sat down outside {near}. Nobody has knocked yet. Behind it lies the way to {site}.',
        'The witch of {place} cures any sickness for a price. This year the price is a child from {near}, and the parents are looking for another way.',
        'A prince of {nation} went to {place} for a love charm and came back a frog. His mother would like that undone.',
        'The witch of {place} has died, and everything she ever cursed is waking at once, starting with {site}.',
        'Trade with {place} is brisk: {near} sells her bread, and she sells back weather. This month the weather is wrong.'],
        more: [
        'The witch of {place} has sent to {near} for a husband. Volunteers are few, and she has stopped asking nicely.',
        'Somebody stole the cauldron from {place}, and now the witch can\'t undo what she brewed for {near}.',
        '{place} has been seen in two places at once, and only one of them is in {nation}.'] },
    isle: { label: 'Floating isle', site: 'keep', biomes: { mountains: 3, hills: 2, plains: 2, moor: 1, tundra: 1, desert: 1 },
        names: ['the Isle of {r}', '{r}\'s Rock', 'the {Adj} Isle', 'the Drifting Hold', 'the {Adj} Island'], adj: ['Hanging', 'Drifting', 'Sky', 'Cloud', 'Lost', 'High'], hooks: [
        '{place} drifts over {near} once a generation. This time it stopped, and a rope ladder came down. At the top: {site}.',
        'The waterfall off {place} has turned red, and so has the river through {near}.',
        '{nation} claims {place} whenever it floats over the border. The folk who live on it have opinions.',
        'A wizard in {near} has worked out how to reach {place} by kite. He needs someone light and brave to test it.',
        'Stones are falling from {place}, and one took the roof off the temple in {near}. The isle is sinking, and {site} with it.'],
        more: [
        'A rope dropped from {place} into the square at {near}, with a note tied to it: "Help. Sinking."',
        '{place} has drifted into a storm and stuck there. The lightning lights up {site} every night.',
        'Seeds from the tree on {place} fall on {near} and grow overnight into something that walks.'] }
};
// The first eight kinds, which every continent draws from; then the newer ones.
const CONT_POI_KEYS = ['ruin', 'barrow', 'dragon', 'wood', 'tower', 'mine', 'temple', 'fort'];
const CONT_POI_MORE = Object.keys(CONT_POIS).filter(k => !CONT_POI_KEYS.includes(k));
// A hook put together for any place: {who} in {near} {wants} {site}. {twist}
const CONT_POI_WHO = ['A widow', 'The town priest', 'A retired adventurer', 'A merchant\'s clerk', 'A young noble', 'The local healer',
    'A traveling scholar', 'A fisherman', 'The captain of the watch', 'A pair of orphans', 'A bard', 'A fence'];
const CONT_POI_WANTS = ['will pay well for anything brought out of', 'wants a body brought home from', 'needs a map of', 'wants a lost ring found in',
    'swears a missing sister is held in', 'will pay to have a sealed letter left in', 'wants proof that nothing lives in', 'needs a stone from the oldest wall of'];
const CONT_POI_TWISTS = ['They are lying about why.', 'Someone else has been hired for the same job.', 'Whatever is in there knows they are coming.',
    'The reward is real; the employer may not be.', 'They went themselves, once, and won\'t say what happened.', 'The job is a test for something bigger.',
    '{nation} has forbidden anyone to go.', 'They will be dead before the party returns, unless someone keeps watch over them.',
    'Half of {near} thinks it\'s a terrible idea, loudly.', 'It has to be done before the next full moon.'];

// ── The illustrated style (pictures in img/map, made by map-art.py) ──
// How many symbols each terrain sheet holds (img/map/terrain/<sheet>-<n>.webp). A terrain
// whose sheet has none yet keeps its ink marks.
const CONT_ART_DIR = 'img/map/';
const CONT_ART = { grass: 9, hills: 9, jungle: 9, marsh: 9, mesas: 9, moor: 9, mountains: 9, oases: 6, pines: 9,
    'snowy-mountains': 9, trees: 9, tundra: 9, volcanoes: 6, dunes: 9, 'snowy-pines': 9 };
// Per terrain: its main sheet, the symbol's size (SVG units), the room kept around each
// (cells), and the share of cells that get one.
const CONT_ART_BIOMES = {
    mountains: { sheet: 'mountains', size: 24, gap: 1.5, keep: 0.9 }, hills: { sheet: 'hills', size: 17, gap: 1.5, keep: 0.75 },
    forest: { sheet: 'trees', size: 14, gap: 1.05, keep: 0.95 }, jungle: { sheet: 'jungle', size: 15, gap: 1.1, keep: 0.95 },
    desert: { sheet: 'dunes', size: 21, gap: 1.6, keep: 0.75 }, swamp: { sheet: 'marsh', size: 15, gap: 1.6, keep: 0.7 },
    badlands: { sheet: 'mesas', size: 16, gap: 1.8, keep: 0.6 }, moor: { sheet: 'moor', size: 14, gap: 1.8, keep: 0.5 },
    plains: { sheet: 'grass', size: 11, gap: 2.4, keep: 0.25 }, tundra: { sheet: 'tundra', size: 15, gap: 2, keep: 0.45 }
};
const CONT_ART_POIS = { ruin: 'ruined-keep', barrow: 'barrow', dragon: 'dragon-lair', wood: 'cursed-wood', tower: 'wizard-tower',
    mine: 'lost-mine', temple: 'sunken-temple', fort: 'bandit-fort', lighthouse: 'lighthouse', monastery: 'monastery',
    stones: 'standing-stones', battlefield: 'battlefield', portal: 'portal', bones: 'giant-bones', wreck: 'shipwreck',
    oracle: 'oracle', witch: 'witch-hut', isle: 'floating-isle' };
const CONT_ART_TOWNS = { hamlet: 19, village: 22, town: 25, city: 29, metropolis: 32 };   // icon sizes; a capital is 35
// Ornaments: [file, width ÷ height].
const CONT_ART_SEA = [['ship', 1.53], ['kraken', 1.65], ['whale', 1.61], ['sea-serpent', 1.79], ['galley', 1.59]];
const CONT_ART_DRAGON = 2.12;
const CONT_ART_BANNER = 3.96, CONT_ART_EDGE = 16.5, CONT_ART_FRAME = 9;
const CONT_STYLES = { atlas: '🎨 Illustrated', classic: '✒️ Classic ink' };

// ── Small helpers ────────────────────────────────────────
function contPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function contWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function contShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function contSeedInt(seed, label) {
    return parseInt(deriveSeed(seed, label), 36) | 0;
}

// A hash of a lattice point to [0, 1).
function contHash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

// Smooth value noise and its fractal sum, both in [0, 1].
function contNoise(x, y, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = contHash(x0, y0, s), b = contHash(x0 + 1, y0, s), c = contHash(x0, y0 + 1, s), d = contHash(x0 + 1, y0 + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function contFbm(x, y, s, oct) {
    let sum = 0, amp = 1, norm = 0, f = 1;
    for (let o = 0; o < oct; o++) {
        sum += amp * contNoise(x * f, y * f, s + o * 1013);
        norm += amp;
        amp *= 0.5;
        f *= 2.03;
    }
    return sum / norm;
}

// A binary min-heap of (key, value) pairs.
function contHeap() {
    const keys = [], vals = [];
    return {
        get size() { return keys.length; },
        push(k, v) {
            let i = keys.length;
            keys.push(k); vals.push(v);
            while (i > 0) {
                const p = (i - 1) >> 1;
                if (keys[p] <= k) break;
                keys[i] = keys[p]; vals[i] = vals[p];
                i = p;
            }
            keys[i] = k; vals[i] = v;
        },
        pop() {
            const top = vals[0];
            const k = keys.pop(), v = vals.pop();
            const n = keys.length;
            if (n) {
                let i = 0;
                for (;;) {
                    let c = 2 * i + 1;
                    if (c >= n) break;
                    if (c + 1 < n && keys[c + 1] < keys[c]) c++;
                    if (keys[c] >= k) break;
                    keys[i] = keys[c]; vals[i] = vals[c];
                    i = c;
                }
                keys[i] = k; vals[i] = v;
            }
            return top;
        }
    };
}

function contQuantile(values, q) {
    const a = Float64Array.from(values).sort();
    return a.length ? a[Math.min(a.length - 1, Math.max(0, Math.floor(q * a.length)))] : 0;
}

// Each cell's neighbors (8 ways), as cell indexes.
function contEach8(m, i, fn) {
    const x = i % m.cols, y = (i - x) / m.cols;
    for (const [dx, dy] of CONT_D8) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < m.cols && ny < m.rows) fn(ny * m.cols + nx, dx && dy ? 1.4142 : 1);
    }
}

function contEach4(m, i, fn) {
    const x = i % m.cols, y = (i - x) / m.cols;
    if (x > 0) fn(i - 1); if (x < m.cols - 1) fn(i + 1);
    if (y > 0) fn(i - m.cols); if (y < m.rows - 1) fn(i + m.cols);
}

// Connected groups of cells where test(i) holds (8 ways). Returns { id: Int32Array, sizes }.
function contGroups(m, test) {
    const id = new Int32Array(m.n).fill(-1), sizes = [];
    for (let i = 0; i < m.n; i++) {
        if (id[i] >= 0 || !test(i)) continue;
        const g = sizes.length, stack = [i];
        id[i] = g;
        let size = 0;
        while (stack.length) {
            const c = stack.pop();
            size++;
            contEach8(m, c, nb => { if (id[nb] < 0 && test(nb)) { id[nb] = g; stack.push(nb); } });
        }
        sizes.push(size);
    }
    return { id, sizes };
}

// Steps from the nearest cell where src(i) holds, moving through cells where pass(i) holds.
function contDistance(m, src, pass) {
    const d = new Float32Array(m.n).fill(Infinity), q = [];
    for (let i = 0; i < m.n; i++) if (src(i)) { d[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
        const c = q[h];
        contEach8(m, c, nb => { if (d[nb] === Infinity && pass(nb)) { d[nb] = d[c] + 1; q.push(nb); } });
    }
    return d;
}

// A cell's map point (jittered a little, so nothing sits on a grid).
function contPt(m, i) {
    const x = i % m.cols, y = (i - x) / m.cols;
    return { x: (x + 0.5 + (contHash(x, y, m.jit) - 0.5) * 0.5) * CONT_CELL, y: (y + 0.5 + (contHash(y, x, m.jit) - 0.5) * 0.5) * CONT_CELL };
}

function contCellDist(m, a, b) {
    const ax = a % m.cols, bx = b % m.cols;
    return Math.hypot(ax - bx, (a - ax) / m.cols - (b - bx) / m.cols);
}

const CONT_DIRS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
function contDir(m, from, to) {
    const fx = from % m.cols, tx = to % m.cols;
    const ang = Math.atan2((to - tx) / m.cols - (from - fx) / m.cols, tx - fx);
    return CONT_DIRS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
}

// ── The land ─────────────────────────────────────────────
function contTerrain(seed, Z, frac) {
    const { cols, rows } = Z;
    const n = cols * rows;
    const m = { cols, rows, n, jit: contSeedInt(seed, 'jitter') };
    const sH = contSeedInt(seed, 'height'), sW = contSeedInt(seed, 'warp'), sR = contSeedInt(seed, 'ridge'), sM = contSeedInt(seed, 'moist'), sT = contSeedInt(seed, 'temp');
    const shape = withSeed(deriveSeed(seed, 'shape'), () => {
        const count = contWeighted([[1, 4], [2, 3], [3, 2]]);
        const blobs = Array.from({ length: count }, () => ({
            x: 0.25 + rand() * 0.5, y: 0.25 + rand() * 0.5,
            rx: (count === 1 ? 0.5 : 0.36) + rand() * 0.15, ry: (count === 1 ? 0.5 : 0.36) + rand() * 0.15
        }));
        return { blobs, latTop: 46 + rand() * 26 };
    });

    const h = new Float32Array(n), ridgeAt = new Float32Array(n);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            const u = x / rows * Z.freq, v = y / rows * Z.freq;
            const wu = u + (contFbm(u * 0.8 + 3.1, v * 0.8 + 7.7, sW, 3) - 0.5) * 1.6;
            const wv = v + (contFbm(u * 0.8 - 4.3, v * 0.8 + 1.9, sW + 7, 3) - 0.5) * 1.6;
            const base = contFbm(wu, wv, sH, 5);
            const px = x / (cols - 1), py = y / (rows - 1);
            let mask = 0;
            shape.blobs.forEach(b => {
                const dx = (px - b.x) / b.rx, dy = (py - b.y) / b.ry;
                mask = Math.max(mask, 1 - Math.sqrt(dx * dx + dy * dy));
            });
            const ridge = 1 - Math.abs(contFbm(wu * 1.3 + 11, wv * 1.3 + 5, sR, 4) * 2 - 1);
            // The sea closes in near the map's edge, smoothly, so coasts never run along it.
            const e = Math.min(1, Math.min(x, y, cols - 1 - x, rows - 1 - y) / (rows * 0.18));
            const fade = e * e * (3 - 2 * e);
            ridgeAt[i] = Math.max(0, ridge - 0.7) * Math.min(1, Math.max(0, mask * 2.5));
            h[i] = (base * 0.7 + mask * 0.95 + ridgeAt[i] * 1.5) * fade - (1 - fade) * 0.4;
        }
    }
    let sea = contQuantile(h, 1 - frac);
    const water = i => h[i] < sea;

    // Specks of land go under; the sea is the water joined to the map's edge; small lakes fill in.
    const isles = contGroups(m, i => !water(i));
    for (let i = 0; i < n; i++) if (isles.id[i] >= 0 && isles.sizes[isles.id[i]] < 3) h[i] = sea - 0.001;
    const ocean = new Uint8Array(n), stack = [];
    for (let i = 0; i < n; i++) {
        const x = i % cols, y = (i - x) / cols;
        if ((x === 0 || y === 0 || x === cols - 1 || y === rows - 1) && water(i)) { ocean[i] = 1; stack.push(i); }
    }
    while (stack.length) {
        const c = stack.pop();
        contEach4(m, c, nb => { if (!ocean[nb] && water(nb)) { ocean[nb] = 1; stack.push(nb); } });
    }
    const lakes = contGroups(m, i => water(i) && !ocean[i]);
    const lake = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        if (lakes.id[i] < 0) continue;
        if (lakes.sizes[lakes.id[i]] < 4) h[i] = sea + 0.001;
        else lake[i] = 1;
    }
    const land = new Uint8Array(n);
    for (let i = 0; i < n; i++) land[i] = !ocean[i] && !lake[i] ? 1 : 0;
    Object.assign(m, { h, sea, ocean, lake, land });

    // Height above the sea (0..1), mountains and hills from the top of it.
    const landIdx = [];
    for (let i = 0; i < n; i++) if (land[i]) landIdx.push(i);
    let top = sea;
    landIdx.forEach(i => { top = Math.max(top, h[i]); });
    const elev = new Float32Array(n);
    landIdx.forEach(i => { elev[i] = (h[i] - sea) / Math.max(1e-6, top - sea); });
    const eLand = landIdx.map(i => elev[i]);
    const qMount = contQuantile(eLand, 0.91), qHill = contQuantile(eLand, 0.77);

    m.coastDist = contDistance(m, i => !!ocean[i], i => !ocean[i]);
    m.seaDist = contDistance(m, i => !ocean[i], i => !!ocean[i]);
    m.coastal = new Uint8Array(n);
    landIdx.forEach(i => { m.coastal[i] = m.coastDist[i] === 1 ? 1 : 0; });

    // Moisture: noise plus nearness to the sea, ranked so the thresholds always mean the same share.
    const raw = landIdx.map(i => {
        const x = i % cols, y = (i - x) / cols;
        return contFbm(x / rows * Z.freq * 1.2 + 40, y / rows * Z.freq * 1.2 - 20, sM, 4) * 0.6 + 0.4 * Math.exp(-m.coastDist[i] / (rows * 0.15));
    });
    const order = raw.map((v, k) => k).sort((a, b) => raw[a] - raw[b]);
    const moist = new Float32Array(n);
    order.forEach((k, r) => { moist[landIdx[k]] = order.length > 1 ? r / (order.length - 1) : 0.5; });

    // Latitude: north at the top. Warmth falls with latitude and height.
    m.latTop = shape.latTop;
    m.span = Z.span;
    m.latAt = y => m.latTop - m.span * y / (rows - 1);
    const climate = new Uint8Array(n), biome = new Array(n).fill(null);
    landIdx.forEach(i => {
        const x = i % cols, y = (i - x) / cols;
        const warmth = 1 - Math.abs(m.latAt(y)) / 72 - elev[i] * 0.35 + (contFbm(x / rows * 4, y / rows * 4, sT, 2) - 0.5) * 0.1;
        const c = CONT_CLIMATES.findIndex(b => warmth < b.below);
        climate[i] = c;
        const k = CONT_CLIMATES[c].key, w = moist[i], low = elev[i] < 0.18;
        let b;
        if (elev[i] >= qMount) b = 'mountains';
        else if (elev[i] >= qHill) b = k === 'polar' ? 'tundra' : 'hills';
        else if (k === 'polar') b = 'tundra';
        else if (k === 'cold') b = w > 0.55 ? 'forest' : w < 0.3 ? 'moor' : 'plains';
        else if (k === 'temperate') b = w > 0.86 && low ? 'swamp' : w > 0.52 ? 'forest' : w < 0.22 ? 'moor' : 'plains';
        else if (k === 'warm') b = w < 0.3 ? 'desert' : w < 0.42 ? (elev[i] > 0.25 ? 'badlands' : 'plains') : w > 0.66 ? 'forest' : 'plains';
        else b = w < 0.25 ? 'desert' : w > 0.88 && low ? 'swamp' : w > 0.5 ? 'jungle' : 'plains';
        biome[i] = b;
    });
    Object.assign(m, { elev, moist, climate, biome, landIdx });

    contRivers(m);
    return m;
}

// Rivers: a priority flood from the sea gives every land cell a way downhill to the coast
// (through lakes); water gathers along those ways, and the big flows are rivers.
function contRivers(m) {
    const { n, h, ocean, lake, land, moist } = m;
    const parent = new Int32Array(n).fill(-1), seen = new Uint8Array(n), filled = new Float32Array(n);
    const heap = contHeap(), order = [];
    for (let i = 0; i < n; i++) if (ocean[i]) { seen[i] = 1; filled[i] = h[i]; heap.push(h[i], i); }
    while (heap.size) {
        const c = heap.pop();
        if (!ocean[c]) order.push(c);
        contEach8(m, c, nb => {
            if (seen[nb]) return;
            seen[nb] = 1;
            filled[nb] = Math.max(h[nb], filled[c] + 1e-6);
            parent[nb] = c;
            heap.push(filled[nb], nb);
        });
    }
    const acc = new Float32Array(n);
    order.forEach(i => { acc[i] = land[i] ? 0.4 + moist[i] : 0.6; });
    for (let k = order.length - 1; k >= 0; k--) {
        const c = order[k], p = parent[c];
        if (p >= 0 && !ocean[p]) acc[p] += acc[c];
    }
    const flows = m.landIdx.map(i => acc[i]);
    const T = Math.max(6, contQuantile(flows, 0.94));
    const river = new Uint8Array(n);
    m.landIdx.forEach(i => { if (acc[i] >= T) river[i] = 1; });
    Object.assign(m, { parent, acc, river, riverT: T });
}

// ── Nations ──────────────────────────────────────────────
// How good a cell is to live on.
function contLiveScore(m, i) {
    const b = { plains: 3, forest: 2, hills: 2, moor: 1.2, desert: 0.5, badlands: 0.6, tundra: 0.3, mountains: 0, swamp: 0.6, jungle: 0.8 }[m.biome[i]] || 0;
    const cl = CONT_CLIMATES[m.climate[i]].key;
    let s = b * (cl === 'temperate' ? 1.3 : cl === 'polar' ? 0.5 : 1);
    if (m.coastal[i]) s += 1.8;
    if (m.river[i]) s += 2.2;
    let lakeSide = false;
    contEach4(m, i, nb => { if (m.lake[nb]) lakeSide = true; });
    if (lakeSide) s += 1.2;
    return s;
}

// Pick up to count cells, spaced at least minD apart (and from avoid), best scores first.
function contSpaced(m, cands, count, minD, avoid = []) {
    const out = [];
    for (const c of cands) {
        if (out.length >= count) break;
        if (out.concat(avoid).every(o => contCellDist(m, o, c) >= minD)) out.push(c);
    }
    return out;
}

function contNations(seed, m, Z, want) {
    const land = m.landIdx;
    const masses = contGroups(m, i => !!m.land[i]);
    const big = Math.max(...masses.sizes);
    // Capitals: good land, on a landmass big enough for a nation, spread out.
    const cands = withSeed(deriveSeed(seed, 'capitals'), () => land
        .filter(i => masses.sizes[masses.id[i]] >= Math.max(40, big * 0.12) && m.biome[i] !== 'mountains')
        .map(i => [i, contLiveScore(m, i) * (0.6 + rand() * 0.8)])
        .sort((a, b) => b[1] - a[1]).map(p => p[0]));
    let minD = Math.sqrt(land.length / want) * 0.8, caps = [];
    for (let t = 0; t < 8 && caps.length < want; t++, minD *= 0.85) caps = contSpaced(m, cands, want, minD);
    const count = caps.length;

    // Grow each nation from its capital; hard country costs more, rivers and peaks make borders.
    const strength = withSeed(deriveSeed(seed, 'reach'), () => caps.map(() => 0.8 + rand() * 0.45));
    const owner = new Int16Array(m.n).fill(-1), cost = new Float32Array(m.n).fill(Infinity);
    const heap = contHeap();
    caps.forEach((c, k) => { cost[c] = 0; owner[c] = k; heap.push(0, c); });
    while (heap.size) {
        const c = heap.pop();
        contEach8(m, c, (nb, step) => {
            if (!m.land[nb]) return;
            const enter = CONT_BIOMES[m.biome[nb]].march + (m.river[nb] !== m.river[c] ? 2 : 0);
            const nc = cost[c] + enter * step / strength[owner[c]];
            if (nc < cost[nb]) { cost[nb] = nc; owner[nb] = owner[c]; heap.push(nc, nb); }
        });
    }
    // The far edges stay wild.
    const reached = land.filter(i => owner[i] >= 0).map(i => cost[i]);
    const limit = contQuantile(reached, 0.84);
    land.forEach(i => { if (owner[i] >= 0 && cost[i] > limit) owner[i] = -1; });
    m.owner = owner;
    return { caps, count, minD };
}

// ── Roads and journeys ──────────────────────────────────
// A* over land; cost(i) is the price of entering cell i. Returns the cells from a to b, or null.
function contRoute(m, a, b, cost) {
    const g = new Float32Array(m.n).fill(Infinity), from = new Int32Array(m.n).fill(-1), done = new Uint8Array(m.n);
    const bx = b % m.cols, by = (b - bx) / m.cols;
    const heur = i => {
        const x = i % m.cols, y = (i - x) / m.cols, dx = Math.abs(x - bx), dy = Math.abs(y - by);
        return (Math.max(dx, dy) + 0.4142 * Math.min(dx, dy)) * 0.5;
    };
    const heap = contHeap();
    g[a] = 0;
    heap.push(heur(a), a);
    while (heap.size) {
        const c = heap.pop();
        if (c === b) break;
        if (done[c]) continue;
        done[c] = 1;
        contEach8(m, c, (nb, step) => {
            if (!m.land[nb] || done[nb]) return;
            const ng = g[c] + cost(nb, c) * step;
            if (ng < g[nb]) { g[nb] = ng; from[nb] = c; heap.push(ng + heur(nb), nb); }
        });
    }
    if (g[b] === Infinity) return null;
    const path = [b];
    while (path[path.length - 1] !== a) path.push(from[path[path.length - 1]]);
    return path.reverse();
}

function contPathMiles(m, Z, path) {
    let steps = 0;
    for (let k = 1; k < path.length; k++) steps += contCellDist(m, path[k - 1], path[k]);
    return Math.max(1, Math.round(steps * Z.miles));
}

// The terrain a stretch of country mostly is (a Travel tool terrain key).
function contMainTerrain(m, cells) {
    const tally = {};
    cells.forEach(i => {
        let t = m.biome[i];
        if (m.coastal[i] && t === 'plains') t = 'coast';
        tally[t] = (tally[t] || 0) + 1;
    });
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : 'plains';
}

function contRoadCost(m, roads) {
    return (i, from) => {
        if (roads[i]) return 0.5;
        return CONT_BIOMES[m.biome[i]].road + (m.river[i] && !m.river[from] ? 3 : 0);
    };
}

// A journey between two towns: by road where there is one, cross-country otherwise.
function contJourney(c, a, b) {
    const m = c.map, Z = CONT_SIZES[c.size];
    const A = c.towns[a], B = c.towns[b];
    const path = contRoute(m, A.cell, B.cell, (i, from) => (c.roadCells[i] ? 0.6 : CONT_BIOMES[m.biome[i]].march * 1.6 + (m.river[i] && !m.river[from] ? 1.5 : 0)));
    if (!path) return null;
    const off = path.filter(i => !c.roadCells[i]);
    const roadShare = 1 - off.length / path.length;
    const terrain = roadShare >= 0.6 ? 'road' : contMainTerrain(m, off);
    const mid = path[Math.floor(path.length / 2)];
    return { path, miles: contPathMiles(m, Z, path), terrain, roadShare, climate: CONT_CLIMATES[m.climate[mid]].travel };
}

// ── The roll ─────────────────────────────────────────────
// opts: { size, land, nations } (keys, a count 3-8, or 'random').
function rollContinent(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const drawn = part('options', () => ({
        size: contWeighted([['medium', 5], ['small', 3], ['large', 3]]),
        land: contWeighted([['even', 5], ['less', 3], ['more', 3]]),
        nations: rand()
    }));
    const size = CONT_SIZES[opts.size] ? opts.size : drawn.size;
    const landKey = CONT_LANDS[opts.land] ? opts.land : drawn.land;
    const Z = CONT_SIZES[size];
    const asked = parseInt(opts.nations, 10);
    const want = asked >= 3 && asked <= 8 ? asked : Z.nations[0] + Math.floor(drawn.nations * (Z.nations[1] - Z.nations[0] + 1));
    const m = contTerrain(deriveSeed(seed, 'land.' + size), Z, CONT_LANDS[landKey].frac);
    // opts as asked ('random' where nothing was picked), so a link can ask for this same map.
    const c = { seed, size, land: landKey, map: m, opts: {
        size: CONT_SIZES[opts.size] ? opts.size : 'random', land: CONT_LANDS[opts.land] ? opts.land : 'random',
        nations: asked >= 3 && asked <= 8 ? String(asked) : 'random' } };

    const used = new Set();
    c.name = part('name', () => contPick(CONT_NAMES).replace('{r}', hisRoot(used)));
    const grow = contNations(seed, m, Z, want);

    // The nations, each from its own seed (so a new count keeps the first ones' names and rulers).
    const townNames = new Set();
    c.nations = grow.caps.map((cap, k) => {
        const sub = label => deriveSeed(seed, `nation.${k}.${label}`);
        const nat = withSeed(sub('core'), () => {
            const gov = contPick(CONT_GOV_KEYS);
            const root = hisRoot(used);
            const G = CONT_GOVS[gov];
            const banner = contShuffle(CONT_TINCTURES).slice(0, 2);
            return { gov, root, name: contPick(G.forms).replace('{r}', root), temper: contPick(CONT_TEMPERS),
                wealth: contWeighted(CONT_PROSPERITY), banner: `${contPick(CONT_CHARGES)} in ${banner[0]} on ${banner[1]}`,
                age: contPick(['adult', 'middle', 'middle', 'old']), feudPick: rand(), feudWhy: contPick(CONT_FEUDS), exportPick: [rand(), rand()] };
        });
        const G = CONT_GOVS[nat.gov];
        nat.ruler = facNpc(sub('ruler'), G.cat, nat.age);
        nat.ruler.title = genderedTitle(G.title, nat.ruler.npc.gender);
        nat.index = k;
        nat.cap = cap;
        nat.color = CONT_COLORS[k % CONT_COLORS.length];
        // E5: a fixed number of draws, so nothing here shifts with the rule or the map.
        withSeed(sub('more'), () => {
            const temper = contPick(CONT_TEMPERS_MORE), tSwap = rand() < CONT_TEMPERS_MORE.length / (CONT_TEMPERS.length + CONT_TEMPERS_MORE.length);
            if (tSwap) nat.temper = temper;
            const feud = contPick(CONT_FEUDS_MORE), fSwap = rand() < CONT_FEUDS_MORE.length / (CONT_FEUDS.length + CONT_FEUDS_MORE.length);
            if (fSwap) nat.feudWhy = feud;
            nat.feudNow = contPick(CONT_FEUD_NOW);
            const own = CONT_CUSTOMS_GOV[nat.gov], custom = contPick(CONT_CUSTOMS), r = rand(), use = rand() < 0.35;
            nat.custom = use ? own[Math.floor(r * own.length)] : custom;
            nat.worry = contPick(CONT_WORRIES);
            nat.fame = contPick(CONT_CAPITAL_FAME);
            nat.exportMore = [[rand(), rand()], [rand(), rand()]];
            nat.tradePick = [rand(), rand(), rand()];
            nat.borderPick = rand();
        });
        return nat;
    });

    // Land, climate, and exports from the cells each nation holds.
    c.nations.forEach(nat => {
        const cells = m.landIdx.filter(i => m.owner[i] === nat.index);
        nat.cells = cells.length;
        const tally = {}, clim = {};
        cells.forEach(i => {
            tally[m.biome[i]] = (tally[m.biome[i]] || 0) + 1;
            if (m.coastal[i]) tally.coast = (tally.coast || 0) + 0.6;
            clim[m.climate[i]] = (clim[m.climate[i]] || 0) + 1;
        });
        const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        nat.terrain = ranked.filter(t => t !== 'coast').slice(0, 3);
        nat.coastal = !!tally.coast;
        const goods = ranked.slice(0, 3);
        const first = goods[0], second = goods.find(t => t !== first && CONT_EXPORTS[t]);
        // Each good may swap to one of the newer ones for its terrain (E5).
        const good = (t, n) => {
            const old = CONT_EXPORTS[t], more = CONT_EXPORTS_MORE[t] || [];
            const [u, r] = nat.exportMore[n];
            return u < more.length / (old.length + more.length) ? more[Math.floor(r * more.length)] : old[Math.floor(nat.exportPick[n] * old.length)];
        };
        nat.exports = [good(first, 0)];
        if (second) {
            const g2 = good(second, 1);
            if (g2 !== nat.exports[0]) nat.exports.push(g2);
        }
        nat.climate = +Object.entries(clim).sort((a, b) => b[1] - a[1])[0][0];
    });

    // Neighbors share a border; each nation feuds with one (or across the sea if it has none).
    const shared = c.nations.map(() => c.nations.map(() => 0));
    m.landIdx.forEach(i => contEach4(m, i, nb => {
        const a = m.owner[i], b = m.owner[nb];
        if (a >= 0 && b >= 0 && a !== b) shared[a][b]++;
    }));
    c.nations.forEach((nat, k) => { nat.neighbors = c.nations.map((o, j) => j).filter(j => shared[k][j] > 0); });
    c.nations.forEach((nat, k) => {
        if (nat.feud) return;
        let pool = nat.neighbors.filter(j => !c.nations[j].feud);
        if (!pool.length) pool = nat.neighbors.slice();
        if (!pool.length) pool = c.nations.map((o, j) => j).filter(j => j !== k)
            .sort((a, b) => contCellDist(m, nat.cap, c.nations[a].cap) - contCellDist(m, nat.cap, c.nations[b].cap)).slice(0, 2);
        if (!pool.length) return;
        const j = pool[Math.floor(nat.feudPick * pool.length)];
        nat.feud = { with: j, why: nat.feudWhy, now: nat.feudNow, sea: !nat.neighbors.includes(j) };
        const o = c.nations[j];
        if (!o.feud) o.feud = { with: k, why: nat.feudWhy, now: nat.feudNow, sea: nat.feud.sea };
    });

    // Borders (E5): what each shared border is mostly made of, from the cells along it.
    const borderKinds = c.nations.map(() => c.nations.map(() => ({ mountains: 0, river: 0, forest: 0, open: 0 })));
    m.landIdx.forEach(i => contEach4(m, i, nb => {
        const a = m.owner[i], b = m.owner[nb];
        if (a < 0 || b < 0 || a === b) return;
        const bi = m.biome[i], bn = m.biome[nb];
        const kind = bi === 'mountains' || bn === 'mountains' ? 'mountains' : m.river[i] || m.river[nb] ? 'river'
            : ['forest', 'jungle'].includes(bi) || ['forest', 'jungle'].includes(bn) ? 'forest' : 'open';
        borderKinds[a][b][kind]++;
    }));
    c.nations.forEach((nat, k) => {
        nat.borders = nat.neighbors.slice().sort((a, b) => shared[k][b] - shared[k][a]).slice(0, 3).map(j => {
            const t = borderKinds[k][j], tot = t.mountains + t.river + t.forest + t.open;
            // A river or mountains count as the border when they run along a good stretch of it.
            const kind = t.mountains >= tot * 0.3 ? 'mountains' : t.river >= tot * 0.25 ? 'river' : t.forest >= tot * 0.5 ? 'forest' : 'open';
            const lo = c.nations[Math.min(k, j)];
            const list = CONT_BORDER[kind];
            return { with: j, kind, how: list[Math.floor(((lo.borderPick + Math.max(k, j) * 0.37) % 1) * list.length)] };
        });
    });

    // Towns: the capital first, then good spots spread through the nation.
    c.towns = [];
    const settingOf = i => contTownSetting(m, i);
    c.nations.forEach(nat => {
        const k = nat.index;
        const extra = part(`nation.${k}.towns`, () => Z.towns[0] + Math.floor(rand() * (Z.towns[1] - Z.towns[0] + 1)));
        const spots = part(`nation.${k}.spots`, () => m.landIdx
            .filter(i => m.owner[i] === k && i !== nat.cap && m.biome[i] !== 'mountains')
            .map(i => [i, contLiveScore(m, i) * (0.5 + rand())])
            .sort((a, b) => b[1] - a[1]).map(p => p[0]));
        const placed = contSpaced(m, spots, extra, Math.max(3, grow.minD * 0.38), c.towns.map(t => t.cell).concat(nat.cap));
        [nat.cap].concat(placed).forEach((cell, j) => {
            const setting = settingOf(cell);
            const capital = j === 0;
            const t = part(`town.${k}.${j}`, () => ({
                size: capital ? (rand() < 0.35 ? 'metropolis' : 'city') : contWeighted([['town', 4], ['village', 4], ['city', 1], ['hamlet', 1]]),
                wealth: rand() < 0.7 ? nat.wealth : contWeighted(CONT_PROSPERITY)
            }));
            // The town's seed names it the Town tab's way; a name already on the map tries the next seed.
            let tseed, name;
            for (let v = 0; v < 12; v++) {
                tseed = deriveSeed(seed, `town.${k}.${j}.${v}`);
                name = withSeed(deriveSeed(tseed, 'name.' + setting), () => townName(setting));
                if (!townNames.has(name)) break;
            }
            townNames.add(name);
            c.towns.push({ id: c.towns.length, nation: k, cell, capital, seed: tseed, name, setting, size: t.size, wealth: t.wealth, govs: CONT_GOVS[nat.gov].towns });
        });
        nat.capital = c.towns.find(t => t.nation === k && t.capital).id;
    });

    // Roads: each nation's towns joined to the capital's network; neighbors joined at the
    // closest pair of towns (a feud leaves that one an unkept track).
    const roads = new Uint8Array(m.n);
    c.roads = [];
    const cost = contRoadCost(m, roads);
    const addRoad = (a, b, kept) => {
        const path = contRoute(m, c.towns[a].cell, c.towns[b].cell, cost);
        if (!path) return;
        if (kept) path.forEach(i => { roads[i] = 1; });
        const mid = path[Math.floor(path.length / 2)];
        c.roads.push({ a, b, kept, path, miles: contPathMiles(m, Z, path), terrain: kept ? 'road' : contMainTerrain(m, path), climate: CONT_CLIMATES[m.climate[mid]].travel });
    };
    c.nations.forEach(nat => {
        const mine = c.towns.filter(t => t.nation === nat.index);
        const joined = [mine[0]];
        let rest = mine.slice(1);
        while (rest.length) {
            let best = null;
            rest.forEach(t => joined.forEach(j => {
                const d = contCellDist(m, t.cell, j.cell);
                if (!best || d < best[2]) best = [t, j, d];
            }));
            addRoad(best[1].id, best[0].id, true);
            joined.push(best[0]);
            rest = rest.filter(t => t !== best[0]);
        }
    });
    c.nations.forEach(nat => nat.neighbors.filter(j => j > nat.index).forEach(j => {
        let best = null;
        c.towns.filter(t => t.nation === nat.index).forEach(a => c.towns.filter(t => t.nation === j).forEach(b => {
            const d = contCellDist(m, a.cell, b.cell);
            if (!best || d < best[2]) best = [a, b, d];
        }));
        const feud = (nat.feud && nat.feud.with === j) || (c.nations[j].feud && c.nations[j].feud.with === nat.index);
        if (best) addRoad(best[0].id, best[1].id, !feud);
    }));
    c.roadCells = roads;

    // Trade (E5): each nation sells to one realm it isn't feuding with, by the road between
    // them, or by sea when both have a coast and no border.
    c.nations.forEach((nat, k) => {
        const foe = nat.feud ? nat.feud.with : -1;
        let pool = nat.neighbors.filter(j => j !== foe);
        if (!pool.length && nat.coastal) pool = c.nations.filter(o => o.index !== k && o.index !== foe && o.coastal).map(o => o.index);
        if (!pool.length) return;
        const j = pool[Math.floor(nat.tradePick[0] * pool.length)];
        const road = c.roads.find(r => [c.towns[r.a].nation, c.towns[r.b].nation].sort().join() === [k, j].sort().join());
        const from = road && (c.towns[road.a].nation === k ? road.a : road.b), to = road && (from === road.a ? road.b : road.a);
        nat.trade = { with: j, good: nat.exports[Math.floor(nat.tradePick[1] * nat.exports.length)], line: nat.tradePick[2],
            road: road ? `${road.kept ? 'by the road' : 'along an unkept track'} from ${c.towns[from].name} to ${c.towns[to].name}` : 'by sea' };
    });

    // Points of interest: wild country first, away from towns and each other.
    const poiKinds = part('pois', () => {
        const count = Z.pois, out = [], tally = {};
        while (out.length < count) {
            const k = contPick(CONT_POI_KEYS);
            if ((tally[k] || 0) >= 2) continue;
            tally[k] = (tally[k] || 0) + 1;
            out.push(k);
        }
        return out;
    });
    // A newer kind may take each place's turn (two draws each, under their own seed, so the rest holds).
    withSeed(deriveSeed(seed, 'pois.more'), () => poiKinds.forEach((k, p) => {
        const newer = contPick(CONT_POI_MORE);
        if (rand() < 0.45 && !poiKinds.includes(newer)) poiKinds[p] = newer;
    }));
    c.pois = [];
    poiKinds.forEach((kind, p) => {
        const P = CONT_POIS[kind];
        const pseed = deriveSeed(seed, 'poi.' + p);
        const cell = withSeed(deriveSeed(pseed, 'where'), () => {
            const score = i => {
                let s = P.biomes[m.biome[i]] || 0;
                if (P.biomes.coast && m.coastal[i]) s += P.biomes.coast;
                if (!s) return 0;
                if (m.owner[i] < 0) s *= 2.2;
                return s * (0.4 + rand());
            };
            const ok = i => c.towns.every(t => contCellDist(m, t.cell, i) >= 3) && c.pois.every(q => contCellDist(m, q.cell, i) >= grow.minD * 0.45);
            const ranked = m.landIdx.map(i => [i, score(i)]).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
            const hit = ranked.find(e => ok(e[0]));
            return hit ? hit[0] : null;
        });
        if (cell === null) return;
        const near = c.towns.slice().sort((a, b) => contCellDist(m, a.cell, cell) - contCellDist(m, b.cell, cell))[0];
        const site = siteNameFor(pseed, P.site);
        const more = withSeed(deriveSeed(pseed, 'more'), () => ({
            place: P.names ? contPick(P.names).replace('{r}', hisRoot(used)).replace('{Adj}', contPick(P.adj)) : null,
            hook: contPick(P.hooks)
        }));
        // E5: a newer hook for the kind, or one put together, may take over (a fixed number of draws).
        withSeed(deriveSeed(pseed, 'more2'), () => {
            const newer = contPick(P.more), swap = rand() < P.more.length / (P.hooks.length + P.more.length);
            const made = `${contPick(CONT_POI_WHO)} in {near} ${contPick(CONT_POI_WANTS)} {site}. ${contPick(CONT_POI_TWISTS)}`, build = rand() < 0.25;
            if (build) more.hook = made;
            else if (swap) more.hook = newer;
        });
        c.pois.push({ id: c.pois.length, kind, cell, seed: pseed, site, place: more.place, name: more.place || site, hook: more.hook,
            near: near.id, owner: m.owner[cell], miles: Math.round(contCellDist(m, near.cell, cell) * Z.miles / 5) * 5 || 5, dir: contDir(m, near.cell, cell) });
    });

    // Seas: named at the open water farthest from land.
    c.seas = part('seas', () => {
        const out = [];
        for (let s = 0; s < 2; s++) {
            let best = -1, bd = 0;
            for (let i = 0; i < m.n; i++) {
                const x = i % m.cols, y = (i - x) / m.cols;
                // Not in a corner, where the name would run off the map.
                if (!m.ocean[i] || x < 9 || x > m.cols - 10 || y < 3 || y > m.rows - 4) continue;
                const d = Math.min(m.seaDist[i], ...out.map(o => contCellDist(m, o.cell, i) / 2));
                if (d > bd) { bd = d; best = i; }
            }
            if (best < 0 || bd < 3) break;
            out.push({ cell: best, name: contPick(CONT_SEAS).replace('{r}', hisRoot(used)).replace('{Adj}', contPick(CONT_SEA_ADJ)) });
        }
        return out;
    });
    part('seas.lore', () => {
        const lore = contShuffle(CONT_SEA_LORE);
        c.seas.forEach((s, i) => { s.lore = lore[i]; });
    });
    // The third pass (R9): newer sea lore and border lines, by their share, after everything else.
    part('seas.lore.more', () => {
        const more = contShuffle(CONT_SEA_LORE_MORE);
        c.seas.forEach((s, i) => { if (rand() < more.length / (CONT_SEA_LORE.length + more.length) && more[i]) s.lore = more[i]; });
    });
    part('borders.more', () => {
        const done = new Map();
        c.nations.forEach((nat, k) => nat.borders.forEach(b => {
            const key = `${Math.min(k, b.with)}-${Math.max(k, b.with)}-${b.kind}`;
            if (!done.has(key)) {
                const more = CONT_BORDER_MORE[b.kind], newer = contPick(more);
                done.set(key, rand() < more.length / (CONT_BORDER[b.kind].length + more.length) ? newer : b.how);
            }
            b.how = done.get(key);
        }));
    });
    return c;
}

// The last few maps rolled (the Continent and Town tabs share them: a map takes a moment).
const contCache = new Map();
function contCached(seed, opts = {}) {
    const key = [seed, opts.size || 'random', opts.land || 'random', opts.nations || 'random'].join('|');
    if (!contCache.has(key)) {
        contCache.set(key, rollContinent(seed, opts));
        if (contCache.size > 4) contCache.delete(contCache.keys().next().value);
    }
    return contCache.get(key);
}

// The Town tab setting (TOWN_SETTINGS key) that fits a map cell.
function contTownSetting(m, i) {
    if (m.coastal[i]) return 'coast';
    let river = !!m.river[i], peaks = false, lakeSide = false;
    contEach8(m, i, nb => {
        if (m.river[nb]) river = true;
        if (m.biome[nb] === 'mountains') peaks = true;
        if (m.lake[nb]) lakeSide = true;
    });
    if (river || lakeSide) return 'river';
    if (peaks) return 'pass';
    const b = m.biome[i];
    if (b === 'hills' || b === 'badlands') return 'hills';
    if (b === 'forest' || b === 'jungle') return 'forest';
    if (b === 'swamp') return 'marsh';
    if (b === 'plains' || b === 'moor') return contHash(i, 7, m.jit) < 0.5 ? 'farmland' : 'crossroads';
    return 'crossroads';
}

// ── Text ─────────────────────────────────────────────────
function contMilesAcross(c) {
    const Z = CONT_SIZES[c.size];
    return { w: Math.round(Z.cols * Z.miles / 10) * 10, h: Math.round(Z.rows * Z.miles / 10) * 10 };
}

function contNationName(c, k) {
    return k >= 0 ? facCap(c.nations[k].name) : 'the wilds';
}

function contClimateSpan(c) {
    const m = c.map;
    const bands = CONT_CLIMATES.map(b => b.key);
    const at = y => { const w = 1 - Math.abs(m.latAt(y)) / 72; return CONT_CLIMATES.find(b => w < b.below); };
    const top = at(0), bottom = at(m.rows - 1);
    if (top === bottom) return `${top.label} from end to end.`;
    return `${top.label} in the north, ${bottom.label.toLowerCase()} in the south.${bands.indexOf(bottom.key) < bands.indexOf(top.key) ? ' (The map sits south of the equator.)' : ''}`;
}

function contSummary(c) {
    const a = contMilesAcross(c);
    return `About ${a.w.toLocaleString('en-US')} by ${a.h.toLocaleString('en-US')} miles, with ${c.nations.length} nations, ${c.towns.length} towns, and ${c.pois.length} places worth the trip. ${contClimateSpan(c)}`;
}

function contTerrainText(nat) {
    const names = nat.terrain.map(t => CONT_BIOMES[t].label);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || 'mixed country';
    return `${facCap(list)}${nat.coastal ? ', with a coast' : ', landlocked'}.`;
}

function contFeudText(c, nat) {
    if (!nat.feud) return 'None worth a war, yet.';
    const o = c.nations[nat.feud.with];
    const why = nat.feud.why.replace('{other}', o.root);
    return `With ${o.name}${nat.feud.sea ? ', across the water,' : ''} over ${why}.${nat.feud.now ? ' ' + nat.feud.now : ''}`;
}

function contTradeText(c, nat) {
    if (!nat.trade) return 'Little beyond its own borders.';
    const o = c.nations[nat.trade.with];
    const back = o.exports.find(g => g !== nat.trade.good);
    const lines = back ? CONT_TRADE : CONT_TRADE.filter(t => !t.includes('{back}'));
    const t = lines[Math.floor(nat.trade.line * lines.length)];
    return facCap(t.replace('{good}', nat.trade.good).replace(/\{them\}/g, o.name).replace('{road}', nat.trade.road).replace('{back}', back || ''));
}

function contBorderText(c, nat) {
    if (!nat.borders || !nat.borders.length) return 'The sea and the wilds; no neighbors to quarrel with.';
    return nat.borders.map((b, i) => `${i ? CONT_BORDER_WHAT[b.kind] : facCap(CONT_BORDER_WHAT[b.kind])} with ${c.nations[b.with].name} (${b.how})`).join('; ') + '.';
}

function contWorryText(c, nat) {
    const others = c.nations.filter(o => o !== nat);
    const other = nat.feud ? c.nations[nat.feud.with] : others[0];
    return nat.worry.replace('{other}', other ? other.name : 'the wilds').replace('{capital}', c.towns[nat.capital].name);
}

// The named seas with their lore: "The Grey Deep: sailors say …."
function contSeaLines(c) {
    return c.seas.map(s => `${facCap(s.name)}${s.lore ? `: ${s.lore}` : ''}.`);
}

function contTownLabel(t) {
    return `${t.name} (${TOWN_SIZES[t.size].label.toLowerCase()}${t.capital ? ', the capital' : ''})`;
}

// A nation's facts as [label, text] pairs.
function contNationLines(c, k) {
    const nat = c.nations[k], G = CONT_GOVS[nat.gov];
    const cap = c.towns[nat.capital];
    const towns = c.towns.filter(t => t.nation === k && !t.capital);
    return [
        ['Rule', `${G.label}. ${G.how.replace('{capital}', cap.name)}`],
        ['Ruler', `${nat.ruler.title} ${facPersonLine(nat.ruler)}.`],
        ['The ruler\'s worry', contWorryText(c, nat)],
        ['Capital', `${cap.name}, ${TOWN_SIZES[cap.size].a}, known for ${nat.fame}.`],
        ['Towns', towns.length ? towns.map(contTownLabel).join(', ') + '.' : 'None besides the capital.'],
        ['The land', `${contTerrainText(nat)} ${CONT_CLIMATES[nat.climate].label} climate.`],
        ['Folk', nat.temper],
        ['Custom', nat.custom],
        ['Times', CONT_PROSPERITY_TEXT[nat.wealth]],
        ['Exports', facCap(nat.exports.join(' and ')) + '.'],
        ['Trade', contTradeText(c, nat)],
        ['Borders', contBorderText(c, nat)],
        ['Feud', contFeudText(c, nat)],
        ['Banner', facCap(nat.banner) + '.']
    ];
}

// A nation's banner ("a wolf's head in gold on red") as its parts: the charge's picture
// (img/map/heraldry/<charge>.webp), the charge's color, and the field's.
function contArms(nat) {
    const [, charge, tint, field] = nat.banner.match(/^(.*) in (\w+) on (\w+)$/);
    return { charge: charge.replace(/^an? /, '').replace(/'s\b/g, '').replace(/[^a-z]+/g, '-'),
        tint: CONT_TINCTURE_COLORS[tint], field: CONT_TINCTURE_COLORS[field] };
}

// The coat of arms as an <svg> (100 × 120 units): the field on a shield, the charge colored
// through a mask of its picture. id: unique on the page (the mask's id). attrs: on the <svg>.
// A color on a color (or a metal on a metal) gets a thin edge of the other kind, so it shows.
function contArmsSvg(nat, id, attrs = '') {
    const a = contArms(nat);
    const metal = c => c === CONT_TINCTURE_COLORS.gold || c === CONT_TINCTURE_COLORS.silver;
    const edge = metal(a.tint) === metal(a.field) ? (metal(a.tint) ? '#3a2414' : CONT_TINCTURE_COLORS.silver) : '';
    const shield = 'M5 5H95V52C95 85 73 104 50 115C27 104 5 85 5 52Z';
    return `<svg viewBox="0 0 100 120" ${attrs}><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="120">`
        + `<image href="${CONT_ART_DIR}heraldry/${a.charge}.webp" x="21" y="18" width="58" height="68" preserveAspectRatio="xMidYMid meet"/></mask>`
        + (edge ? `<filter id="${id}-e" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/>`
            + `<feFlood flood-color="${edge}" result="c"/><feComposite in="c" in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '')
        + `</defs><path d="${shield}" fill="${a.field}"/>`
        + `<g${edge ? ` filter="url(#${id}-e)"` : ''}><rect x="0" y="0" width="100" height="120" fill="${a.tint}" mask="url(#${id})"/></g>`
        + `<path d="${shield}" fill="none" stroke="#3a2414" stroke-width="4"/></svg>`;
}

function contPoiWhere(c, p) {
    const near = c.towns[p.near];
    return `About ${p.miles} miles ${p.dir} of ${near.name}, ${p.owner >= 0 ? 'in ' + c.nations[p.owner].name : 'in the wilds'}.`;
}

// A name mid-sentence: "The Crypt of X" → "the Crypt of X".
function contMid(name) {
    return name.replace(/^The /, 'the ');
}

function contPoiHook(c, p) {
    const near = c.towns[p.near];
    return p.hook.replace(/\{site\}/g, contMid(p.site)).replace(/\{place\}/g, contMid(p.place || p.site)).replace(/\{near\}/g, near.name)
        .replace(/\{nation\}/g, c.nations[p.owner >= 0 ? p.owner : c.towns[p.near].nation].name)
        .replace(/(^|\. )([a-z])/g, (x, a, b) => a + b.toUpperCase());
}

function contRoadLine(c, r) {
    const A = c.towns[r.a], B = c.towns[r.b];
    const how = r.kept ? 'by road' : `an unkept track through ${CONT_BIOMES[r.terrain] ? CONT_BIOMES[r.terrain].label : 'coastland'}`;
    return `${A.name} to ${B.name}: about ${r.miles.toLocaleString('en-US')} miles, ${how}.`;
}

function contText(c) {
    const out = [c.name, contSummary(c), ''];
    c.nations.forEach((nat, k) => {
        out.push(`${facCap(nat.name)}`);
        contNationLines(c, k).forEach(([a, b]) => out.push(`  ${a}: ${b}`));
        out.push('');
    });
    const wild = c.map.landIdx.filter(i => c.map.owner[i] < 0).length;
    out.push(`The wilds: about ${Math.round(wild / Math.max(1, c.map.landIdx.length) * 100)}% of the land belongs to no one.`, '', 'Places worth the trip:');
    c.pois.forEach((p, i) => out.push(`  ${i + 1}. ${facCap(p.name)} (${CONT_POIS[p.kind].label.toLowerCase()}). ${contPoiWhere(c, p)} ${contPoiHook(c, p)}`));
    out.push('', 'Roads:');
    c.roads.forEach(r => out.push('  ' + contRoadLine(c, r)));
    if (c.seas.length) out.push('', 'Seas:', ...contSeaLines(c).map(l => '  ' + l));
    return out.join('\n');
}

// ── The map (SVG) ───────────────────────────────────────
// Marching squares over cell centers: the filled shape where val >= th (full squares merged into rows).
function contFillPath(m, val, th) {
    const S = CONT_CELL, cols = m.cols;
    const P = (x, y) => `${((x + 0.5) * S).toFixed(1)} ${((y + 0.5) * S).toFixed(1)}`;
    const parts = [];
    for (let y = 0; y < m.rows - 1; y++) {
        let run = -1;
        const flush = x => { if (run >= 0) { parts.push(`M${P(run, y)}L${P(x, y)}L${P(x, y + 1)}L${P(run, y + 1)}Z`); run = -1; } };
        for (let x = 0; x < cols - 1; x++) {
            const a = val[y * cols + x], b = val[y * cols + x + 1], c = val[(y + 1) * cols + x + 1], e = val[(y + 1) * cols + x];
            const ia = a >= th, ib = b >= th, ic = c >= th, ie = e >= th;
            if (ia && ib && ic && ie) { if (run < 0) run = x; continue; }
            flush(x);
            if (!(ia || ib || ic || ie)) continue;
            const t = (v1, v2) => (th - v1) / (v2 - v1);
            const pts = [];
            if (ia) pts.push(P(x, y));
            if (ia !== ib) pts.push(P(x + t(a, b), y));
            if (ib) pts.push(P(x + 1, y));
            if (ib !== ic) pts.push(P(x + 1, y + t(b, c)));
            if (ic) pts.push(P(x + 1, y + 1));
            if (ic !== ie) pts.push(P(x + 1 - t(c, e), y + 1));
            if (ie) pts.push(P(x, y + 1));
            if (ie !== ia) pts.push(P(x, y + 1 - t(e, a)));
            parts.push('M' + pts.join('L') + 'Z');
        }
        flush(cols - 1);
    }
    return parts.join('');
}

// The edge of that shape as line segments; skip(x, y) drops a square.
function contEdgePath(m, val, th, skip) {
    const S = CONT_CELL, cols = m.cols;
    const P = (x, y) => `${((x + 0.5) * S).toFixed(1)} ${((y + 0.5) * S).toFixed(1)}`;
    const parts = [];
    for (let y = 0; y < m.rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
            const a = val[y * cols + x], b = val[y * cols + x + 1], c = val[(y + 1) * cols + x + 1], e = val[(y + 1) * cols + x];
            const ia = a >= th, ib = b >= th, ic = c >= th, ie = e >= th;
            if ((ia && ib && ic && ie) || !(ia || ib || ic || ie) || (skip && skip(x, y))) continue;
            const t = (v1, v2) => (th - v1) / (v2 - v1);
            // Corners and edge crossings in order round the square; a run of two crossings is an edge.
            const pts = [];
            pts.push(ia ? 'c' : null);
            if (ia !== ib) pts.push(P(x + t(a, b), y));
            pts.push(ib ? 'c' : null);
            if (ib !== ic) pts.push(P(x + 1, y + t(b, c)));
            pts.push(ic ? 'c' : null);
            if (ic !== ie) pts.push(P(x + 1 - t(c, e), y + 1));
            pts.push(ie ? 'c' : null);
            if (ie !== ia) pts.push(P(x, y + 1 - t(e, a)));
            const ring = pts.filter(p => p !== null);
            for (let k = 0; k < ring.length; k++) {
                const p = ring[k], q = ring[(k + 1) % ring.length];
                if (p !== 'c' && q !== 'c') parts.push(`M${p}L${q}`);
            }
        }
    }
    return parts.join('');
}

// An indicator over land, softened (averaged over land neighbors) and spread a cell out to sea,
// so tints meet the coast instead of stopping short of it.
function contSoftMask(m, test) {
    const v = new Float32Array(m.n);
    for (let i = 0; i < m.n; i++) {
        let sum = 0, cnt = 0;
        const own = m.land[i];
        if (own) { sum += test(i) ? 1 : 0; cnt++; }
        contEach8(m, i, nb => { if (m.land[nb]) { sum += test(nb) ? 1 : 0; cnt++; } });
        v[i] = cnt ? sum / cnt : 0;
    }
    return v;
}

// A 3×3 average of a field (for softer shapes).
function contBlur(m, v) {
    const out = new Float32Array(m.n);
    for (let i = 0; i < m.n; i++) {
        let sum = v[i], cnt = 1;
        contEach8(m, i, nb => { sum += v[nb]; cnt++; });
        out[i] = sum / cnt;
    }
    return out;
}

function contSmooth(m, pts) {
    if (pts.length < 3) return 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L');
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let k = 1; k < pts.length - 1; k++) {
        const mx = (pts[k].x + pts[k + 1].x) / 2, my = (pts[k].y + pts[k + 1].y) / 2;
        d += `Q${pts[k].x.toFixed(1)} ${pts[k].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const l = pts[pts.length - 1];
    return d + `L${l.x.toFixed(1)} ${l.y.toFixed(1)}`;
}

// Rivers as smooth strokes that widen downstream (a new path at each change of width).
function contRiverPaths(m) {
    const { river, parent, acc, riverT, ocean, lake } = m;
    const maxAcc = Math.max(riverT + 1, ...m.landIdx.map(i => acc[i]));
    const width = i => Math.round((0.8 + 2.4 * Math.sqrt((acc[i] - riverT) / (maxAcc - riverT))) * 2) / 2;
    const hasUp = new Uint8Array(m.n), drawn = new Uint8Array(m.n);
    m.landIdx.forEach(i => { if (river[i] && parent[i] >= 0) hasUp[parent[i]] = 1; });
    const out = [];
    // Sources first, biggest flows last (so the trunk draws over its branches).
    const sources = m.landIdx.filter(i => river[i] && !hasUp[i]).sort((a, b) => acc[a] - acc[b]);
    sources.forEach(src => {
        let cur = src, pts = [contPt(m, cur)], w = width(cur);
        while (cur >= 0) {
            drawn[cur] = 1;
            const p = parent[cur];
            if (p < 0) break;
            if (ocean[p] || lake[p]) {
                const a = contPt(m, cur), b = contPt(m, p);
                pts.push({ x: a.x + (b.x - a.x) * 0.7, y: a.y + (b.y - a.y) * 0.7 });
                break;
            }
            pts.push(contPt(m, p));
            if (drawn[p]) break;
            const nw = width(p);
            if (nw !== w) { out.push({ d: contSmooth(m, pts), w }); pts = [contPt(m, p)]; w = nw; }
            cur = p;
        }
        if (pts.length > 1) out.push({ d: contSmooth(m, pts), w });
    });
    return out;
}

// Map symbols for each terrain, as path data (one path per kind).
// only: the terrains to mark (all when left out).
function contMarks(m, only = null) {
    const d = { peak: '', peakShade: '', hill: '', tree: '', pine: '', jungle: '', dune: '', reed: '', canyon: '', heath: '', grass: '', snow: '' };
    const f = v => v.toFixed(1);
    const cells = m.landIdx.slice().sort((a, b) => a - b);
    cells.forEach(i => {
        if (only && !only.has(m.biome[i])) return;
        const x = i % m.cols, y = (i - x) / m.cols;
        const r = contHash(x * 3 + 1, y * 7 + 2, m.jit);
        const { x: px, y: py } = contPt(m, i);
        const b = m.biome[i];
        if (m.river[i] && b !== 'mountains' && r < 0.6) return;
        if (b === 'mountains') {
            if (r > 0.8) return;
            const s = 4 + m.elev[i] * 3;
            d.peak += `M${f(px - s)} ${f(py + s * 0.6)}L${f(px)} ${f(py - s)}L${f(px + s)} ${f(py + s * 0.6)}`;
            d.peakShade += `M${f(px)} ${f(py - s)}L${f(px + s * 0.25)} ${f(py + s * 0.6)}`;
        } else if (b === 'hills') {
            if (r > 0.55) return;
            d.hill += `M${f(px - 4)} ${f(py + 2)}Q${f(px)} ${f(py - 4)} ${f(px + 4)} ${f(py + 2)}`;
        } else if (b === 'forest') {
            if ((x + y) % 2 && r > 0.3) return;
            if (CONT_CLIMATES[m.climate[i]].key === 'cold') d.pine += `M${f(px)} ${f(py - 4)}L${f(px + 2.6)} ${f(py + 2.5)}L${f(px - 2.6)} ${f(py + 2.5)}Z`;
            else d.tree += `M${f(px - 2.4)} ${f(py)}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0`;
        } else if (b === 'jungle') {
            if (r > 0.75) return;
            d.jungle += `M${f(px - 2.6)} ${f(py)}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0`;
        } else if (b === 'desert') {
            if (r > 0.35) return;
            d.dune += `M${f(px - 4)} ${f(py + 1)}q2 -2.5 4 0q2 -2.5 4 0`;
        } else if (b === 'swamp') {
            if (r > 0.6) return;
            d.reed += `M${f(px - 3)} ${f(py + 2)}h6M${f(px - 1.5)} ${f(py + 2)}v-2.5M${f(px)} ${f(py + 2)}v-3.5M${f(px + 1.5)} ${f(py + 2)}v-2.5`;
        } else if (b === 'badlands') {
            if (r > 0.4) return;
            d.canyon += `M${f(px - 3.5)} ${f(py + 2)}l1.5 -3.5h4l1.5 3.5`;
        } else if (b === 'moor') {
            if (r > 0.3) return;
            d.heath += `M${f(px - 2)} ${f(py - 1)}l1 2l1 -2l1 2l1 -2`;
        } else if (b === 'plains') {
            if (r > 0.12) return;
            d.grass += `M${f(px - 2)} ${f(py + 1)}l1 -2.5M${f(px)} ${f(py + 1)}v-3M${f(px + 2)} ${f(py + 1)}l-1 -2.5`;
        } else if (b === 'tundra') {
            if (r > 0.2) return;
            d.snow += `M${f(px - 2.5)} ${f(py)}h5M${f(px)} ${f(py - 2.5)}v5`;
        }
    });
    return d;
}

// ── The illustrated style ────────────────────────────────
// The sheet a land cell's symbol comes from (null: none, or its terrain keeps ink marks).
function contArtSheet(m, i, v) {
    const b = m.biome[i], zone = CONT_CLIMATES[m.climate[i]].key, chill = zone === 'polar' || zone === 'cold';
    const pick = (...names) => names.find(n => CONT_ART[n]) || null;
    if (b === 'mountains') {
        // Peaks count as cold for their height alone, so snowcaps go by the latitude band, plus the highest peaks anywhere.
        const y = Math.floor(i / m.cols), w = 1 - Math.abs(m.latAt(y)) / 72;
        const band = CONT_CLIMATES.find(z => w < z.below).key, north = band === 'polar' || band === 'cold';
        return v < 0.05 && !north ? pick('volcanoes', 'mountains') : north || m.elev[i] > 0.88 ? pick('snowy-mountains', 'mountains') : pick('mountains');
    }
    if (b === 'forest') return chill ? pick('snowy-pines', 'pines') : zone === 'temperate' && v < 0.3 ? pick('pines', 'trees') : pick('trees');
    if (b === 'desert') return v < 0.07 ? pick('oases') : pick('dunes');
    return pick(CONT_ART_BIOMES[b].sheet);
}

// The terrain symbols, kept apart and drawn back to front. avoid: cells left clear (under a
// town or a place). Returns { uses, sheets } (sheets: each symbol file used, for the defs).
function contArtTerrain(m, id, avoid) {
    const f = v => v.toFixed(1);
    const cand = [];
    m.landIdx.forEach(i => {
        const B = CONT_ART_BIOMES[m.biome[i]];
        const x = i % m.cols, y = (i - x) / m.cols;
        const r = contHash(x * 3 + 1, y * 7 + 2, m.jit);
        if (r > B.keep || avoid[i] || (m.river[i] && m.biome[i] !== 'mountains' && r < 0.5)) return;
        cand.push({ i, r, B });
    });
    cand.sort((a, b) => a.r - b.r);
    const near = new Map(), put = [], sheets = new Set();
    cand.forEach(({ i, B }) => {
        const p = contPt(m, i), cx = p.x / CONT_CELL, cy = p.y / CONT_CELL;
        const x = i % m.cols, y = (i - x) / m.cols;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const o = near.get((y + dy) * m.cols + x + dx);
            if (o && Math.hypot(o.cx - cx, o.cy - cy) < Math.max(o.gap, B.gap)) return;
        }
        const v = contHash(x * 5 + 3, y * 11 + 1, m.jit);
        const sheet = contArtSheet(m, i, v);
        if (!sheet) return;
        const key = `${sheet}-${1 + Math.floor(contHash(y * 13 + 5, x * 3 + 7, m.jit) * CONT_ART[sheet])}`;
        near.set(i, { cx, cy, gap: B.gap });
        sheets.add(key);
        put.push({ key, x: p.x, y: p.y, s: B.size * (0.9 + v * 0.2) });
    });
    put.sort((a, b) => a.y - b.y || a.x - b.x);
    const uses = put.map(q => `<use href="#${id}-t-${q.key}" x="${f(q.x - q.s / 2)}" y="${f(q.y - q.s * 0.8)}" width="${f(q.s)}" height="${f(q.s)}"/>`).join('');
    return { uses, sheets };
}

// A picture from img/map, centered on (x, y), s units across at most.
function contArtImg(file, x, y, w, h, cls = '', extra = '') {
    const f = v => v.toFixed(1);
    return `<image${cls ? ` class="${cls}"` : ''} href="${CONT_ART_DIR}${file}.webp" x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="xMidYMid meet"${extra}/>`;
}

// A town's icon file and size.
function contArtTown(c, t) {
    if (t.capital) return { file: `place/capital-${c.nations[t.nation].gov}`, s: 35 };
    const big = t.size === 'city' || t.size === 'metropolis';
    if (t.setting === 'coast') return { file: big ? 'place/port-city' : 'place/port-town', s: CONT_ART_TOWNS[t.size] };
    return { file: `place/${t.size}`, s: CONT_ART_TOWNS[t.size] };
}

// The frame, the compass, the title scroll, the sea creatures, and a dragon. boxes: taken spots, which
// these join (labels keep off them). Returns { under, frame }: under goes below the labels,
// the frame on top of everything (its patterns use ID for the map's id prefix).
function contArtOrnaments(c, W, H, boxes, title) {
    const m = c.map, S = CONT_CELL, T = CONT_ART_FRAME, f = v => v.toFixed(1), esc = contEscape;
    const landIn = b => {
        let n = 0;
        for (let y = Math.max(0, Math.floor(b.y / S)); y < Math.min(m.rows, Math.ceil((b.y + b.h) / S)); y++)
            for (let x = Math.max(0, Math.floor(b.x / S)); x < Math.min(m.cols, Math.ceil((b.x + b.w) / S)); x++) n += m.land[y * m.cols + x];
        return n;
    };
    let under = '';

    // The compass, top right.
    const cs = 72, compass = { x: W - T - cs - 8, y: T + 6, w: cs, h: cs };
    boxes.push(compass);
    under += contArtImg('ornament/compass', compass.x + cs / 2, compass.y + cs / 2, cs, cs);

    // The title scroll, wherever it covers the least land.
    const bw = Math.min(W * 0.4, 300), bh = bw / CONT_ART_BANNER;
    const spots = [{ x: T + 8, y: T + 8 }, { x: (W - bw) / 2, y: T + 6 }, { x: W - T - 8 - bw, y: H - T - 8 - bh }, { x: (W - bw) / 2, y: H - T - 6 - bh }]
        .map(p => ({ ...p, w: bw, h: bh }));
    const banner = spots.reduce((a, b) => landIn(b) < landIn(a) ? b : a);
    boxes.push(banner);
    const fs = Math.min(bh * 0.34, bw * 0.62 / Math.max(6, title.length * 0.68));
    under += contArtImg('ornament/banner', banner.x + bw / 2, banner.y + bh / 2, bw, bh)
        + `<text class="cm-a-title" style="font-size:${f(fs)}px" x="${f(banner.x + bw / 2)}" y="${f(banner.y + bh * 0.47 + fs * 0.36)}">${esc(title)}</text>`;

    // Sea creatures and ships out in the open water, clear of the sea names and each other.
    const want = { small: 2, medium: 3, large: 4 }[c.size];
    const seaCells = c.seas.map(s => s.cell);
    const open = [];
    for (let i = 0; i < m.n; i++) {
        const x = i % m.cols, y = (i - x) / m.cols;
        if (!m.ocean[i] || m.seaDist[i] < 4 || x < 4 || y < 4 || x > m.cols - 5 || y > m.rows - 5) continue;
        if (seaCells.some(s => contCellDist(m, s, i) < 7)) continue;
        open.push({ i, r: contHash(x * 7 + 2, y * 3 + 9, m.jit) });
    }
    open.sort((a, b) => a.r - b.r);
    const hits = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const placed = [];
    const first = Math.floor(contHash(3, 5, m.jit) * CONT_ART_SEA.length);
    for (const { i } of open) {
        if (placed.length >= want) break;
        if (placed.some(j => contCellDist(m, j, i) < 16)) continue;
        const [file, ratio] = CONT_ART_SEA[(first + placed.length) % CONT_ART_SEA.length];
        const w = 46, h = w / ratio, p = contPt(m, i);
        const box = { x: p.x - w / 2, y: p.y - h / 2, w, h };
        if (hits(box)) continue;
        boxes.push(box);
        placed.push(i);
        const flip = contHash(i, 17, m.jit) < 0.5 ? ` transform="translate(${f(p.x * 2)} 0) scale(-1 1)"` : '';
        under += contArtImg(`ornament/${file}`, p.x, p.y, w, h, 'cm-a-orn', flip);
    }

    // A dragon on the wing over the mountains or open plains, clear of the towns and places.
    const sky = m.landIdx.filter(i => {
        const x = i % m.cols, y = (i - x) / m.cols;
        return (m.biome[i] === 'mountains' || m.biome[i] === 'plains') && x >= 6 && y >= 6 && x <= m.cols - 7 && y <= m.rows - 7;
    }).map(i => ({ i, r: contHash(i % m.cols * 5 + 1, Math.floor(i / m.cols) * 11 + 4, m.jit) })).sort((a, b) => a.r - b.r);
    for (const { i } of sky) {
        const w = 54, h = w / CONT_ART_DRAGON, p = contPt(m, i);
        const box = { x: p.x - w / 2, y: p.y - h / 2, w, h };
        if (hits(box)) continue;
        boxes.push(box);
        const flip = contHash(i, 23, m.jit) < 0.5 ? ` transform="translate(${f(p.x * 2)} 0) scale(-1 1)"` : '';
        under += contArtImg('ornament/dragon', p.x, p.y, w, h, 'cm-a-orn', flip);
        break;
    }

    // A wind head at the west or east edge, blowing in toward the land.
    for (const { i } of open) {
        const x = i % m.cols;
        if (x > 6 && x < m.cols - 7) continue;
        const w = 40, h = w / 1.77, p = contPt(m, i);
        const box = { x: p.x - w / 2, y: p.y - h / 2, w, h };
        if (hits(box) || placed.some(j => contCellDist(m, j, i) < 10)) continue;
        boxes.push(box);
        const flip = x > m.cols / 2 ? ` transform="translate(${f(p.x * 2)} 0) scale(-1 1)"` : '';
        under += contArtImg('ornament/wind-face', p.x, p.y, w, h, 'cm-a-orn', flip);
        break;
    }

    // The frame: a parchment band with the vine strip on it, and a flourish at each corner.
    const edge = `<rect width="${W}" height="${T}" fill="url(#ID-paper)"/><rect width="${W}" height="${T}" fill="url(#ID-edge)"/>`;
    const side = `<rect width="${H}" height="${T}" fill="url(#ID-paper)"/><rect width="${H}" height="${T}" fill="url(#ID-edge)"/>`;
    const k = T * 3.4;
    const corner = tr => `<image href="${CONT_ART_DIR}ornament/border-corner.webp" width="${f(k)}" height="${f(k)}" preserveAspectRatio="xMidYMid meet" transform="${tr}"/>`;
    const frame = `<g class="cm-a-frame">${edge}<g transform="translate(0 ${H - T})">${edge}</g>
        <g transform="translate(${T} 0) rotate(90)">${side}</g><g transform="translate(${W} 0) rotate(90)">${side}</g>
        ${corner('translate(0 0)')}${corner(`translate(${W} 0) scale(-1 1)`)}${corner(`translate(0 ${H}) scale(1 -1)`)}${corner(`translate(${W} ${H}) scale(-1 -1)`)}</g>`;
    return { under, frame };
}

// Labels that try not to sit on each other: boxes already taken. pad: room kept at the edges.
function contPlace(boxes, cands, W, H, pad = 2) {
    const hits = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)
        || b.x < pad || b.y < pad || b.x + b.w > W - pad || b.y + b.h > H - pad;
    const pick = cands.find(b => !hits(b)) || cands[0];
    boxes.push(pick);
    return pick;
}

function contEscape(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// The whole map as an SVG string. id: a prefix for the ids inside it. style: 'classic' (ink
// symbols, the print-friendly look) or 'atlas' (the illustrated pictures in img/map).
function contMapSvg(c, title, id = 'cm', style = 'classic') {
    const m = c.map, Z = CONT_SIZES[c.size], S = CONT_CELL;
    const W = m.cols * S, H = m.rows * S;
    const f = v => v.toFixed(1);
    const esc = contEscape;
    const atlas = style === 'atlas', T = atlas ? CONT_ART_FRAME : 0, pad = T + 2;

    // Land, shallows, tints.
    const hv = m.h;
    const landPath = contFillPath(m, hv, m.sea);
    const shallowVal = new Float32Array(m.n);
    for (let i = 0; i < m.n; i++) shallowVal[i] = m.ocean[i] ? -Math.min(6, m.seaDist[i]) : 1;
    const shallow = contFillPath(m, contBlur(m, contBlur(m, shallowVal)), -2.2);
    const tints = Object.keys(CONT_BIOMES).filter(b => b !== 'plains' && m.landIdx.some(i => m.biome[i] === b))
        .map(b => `<path class="${atlas ? 'cm-a-tint' : 'cm-tint'}" fill="${CONT_BIOMES[b].color}" d="${contFillPath(m, contSoftMask(m, i => m.biome[i] === b), 0.45)}"/>`).join('');
    const nationMasks = c.nations.map(nat => contSoftMask(m, i => m.owner[i] === nat.index));
    const realms = c.nations.map((nat, k) => `<path class="${atlas ? 'cm-a-realm' : 'cm-realm'}" fill="${nat.color}" d="${contFillPath(m, nationMasks[k], 0.5)}"/>`).join('');
    const nearWater = (x, y) => [[0, 0], [1, 0], [0, 1], [1, 1]].some(([dx, dy]) => !m.land[(y + dy) * m.cols + x + dx]);
    const borders = nationMasks.map(v => contEdgePath(m, v, 0.5, nearWater)).join('');

    // Climate bands by latitude: a dashed line where each band starts, its name at the edge.
    let bands = '';
    const yOfLat = lat => ((m.latTop - lat) / m.span * (m.rows - 1) + 0.5) * S;
    const cuts = [];
    CONT_CLIMATES.slice(0, -1).forEach(b => { const lat = (1 - b.below) * 72; cuts.push(lat, -lat); });
    cuts.filter(lat => yOfLat(lat) > S * 2 && yOfLat(lat) < H - S * 2).forEach(lat => {
        const y = yOfLat(lat);
        bands += `<line class="cm-band" x1="${T}" y1="${f(y)}" x2="${W - T}" y2="${f(y)}"/>`;
    });
    const zone = y => { const w = 1 - Math.abs(m.latAt(y / S - 0.5)) / 72; return CONT_CLIMATES.find(b => w < b.below); };
    // A band that only clips the top edge loses its name to the next one, and names at the
    // top stand clear of the north arrow (the compass, when illustrated).
    const bandAt = [];
    let lastZone = null;
    for (let y = S; y < H - S; y += S) {
        const z = zone(y);
        if (z === lastZone) continue;
        if (bandAt.length && y - bandAt[bandAt.length - 1].y < S * 2) bandAt.pop();
        bandAt.push({ y, z });
        lastZone = z;
    }
    const clear = atlas ? T + 84 : 56;
    const bandLabels = bandAt.map(({ y, z }) => `<text class="cm-band-label" x="${y < clear ? W - T - (atlas ? 88 : 44) : W - T - 6}" y="${f(y + 12)}">${esc(z.label)}</text>`).join('');

    // Rivers, coast, borders, roads.
    const rivers = contRiverPaths(m).map(r => `<path class="cm-river" stroke-width="${r.w}" d="${r.d}"/>`).join('');
    const coast = contEdgePath(m, hv, m.sea);
    const roads = c.roads.map(r => `<path class="cm-road${r.kept ? '' : ' cm-track'}" d="${contSmooth(m, r.path.map(i => contPt(m, i)))}"/>`).join('');

    // Terrain: ink marks, or the pictures (with ink for a terrain whose pictures are still to come).
    const avoid = new Uint8Array(m.n);
    if (atlas) c.towns.concat(c.pois).forEach(t => { avoid[t.cell] = 1; contEach8(m, t.cell, nb => { avoid[nb] = 1; }); });
    const art = atlas ? contArtTerrain(m, id, avoid) : null;
    const ink = atlas ? new Set(Object.keys(CONT_ART_BIOMES).filter(b => !CONT_ART[CONT_ART_BIOMES[b].sheet])) : null;
    const mk = contMarks(m, ink);
    const marks = `<path class="cm-peak" d="${mk.peak}"/><path class="cm-peak-shade" d="${mk.peakShade}"/><path class="cm-hill" d="${mk.hill}"/>
        <path class="cm-tree" d="${mk.tree}"/><path class="cm-pine" d="${mk.pine}"/><path class="cm-jungle" d="${mk.jungle}"/>
        <path class="cm-dune" d="${mk.dune}"/><path class="cm-reed" d="${mk.reed}"/><path class="cm-canyon" d="${mk.canyon}"/>
        <path class="cm-heath" d="${mk.heath}"/><path class="cm-grass" d="${mk.grass}"/><path class="cm-snow" d="${mk.snow}"/>${art ? art.uses : ''}`;

    // Labels: nations first, then towns, places, and seas around them.
    const boxes = [];
    let labels = '', keys = '';
    const townR = t => atlas ? contArtTown(c, t).s * 0.4 : 5, poiR = atlas ? 11 : 7;
    c.towns.forEach(t => { const p = contPt(m, t.cell), r = townR(t); boxes.push({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 }); });
    c.pois.forEach(p => { const q = contPt(m, p.cell); boxes.push({ x: q.x - poiR, y: q.y - poiR, w: poiR * 2, h: poiR * 2 }); });
    const orn = atlas ? contArtOrnaments(c, W, H, boxes, facCap(c.name)) : null;
    c.nations.forEach((nat, k) => {
        const own = m.landIdx.filter(i => m.owner[i] === k);
        if (!own.length) return;
        // The spot deepest inside the nation.
        const depth = contDistance(m, i => m.owner[i] !== k, i => m.owner[i] === k);
        let best = own[0];
        own.forEach(i => { if (depth[i] > depth[best]) best = i; });
        const p = contPt(m, best);
        const text = nat.root.toUpperCase();
        const fs = Math.max(10, Math.min(16, 8 + Math.sqrt(own.length) / 3));
        const w = text.length * fs * 0.78 + 4;
        // Illustrated: the nation's arms over its name.
        const sh = atlas ? fs * 1.7 : 0, top = atlas ? sh + 2 : 0, h = fs + top;
        const box = contPlace(boxes, [{ x: p.x - w / 2, y: p.y - fs * 0.8 - top, w, h }, { x: p.x - w / 2, y: p.y + 6, w, h }, { x: p.x - w / 2, y: p.y - fs * 2 - top, w, h }], W, H, pad);
        const cx = box.x + box.w / 2;
        if (atlas) labels += contArmsSvg(nat, `${id}-arms-${k}`, `class="cm-a-arms" x="${f(cx - sh / 2.4)}" y="${f(box.y)}" width="${f(sh / 1.2)}" height="${f(sh)}"`);
        labels += `<text class="cm-nation" style="font-size:${f(fs)}px" x="${f(cx)}" y="${f(box.y + top + fs * 0.82)}">${esc(text)}</text>`;
    });
    c.towns.forEach(t => {
        const p = contPt(m, t.cell), r = townR(t) + 1;
        const fs = t.capital ? 10 : 8.5;
        const w = t.name.length * fs * 0.52 + 2, h = fs + 1;
        const box = contPlace(boxes, [
            { x: p.x + r, y: p.y - h / 2, w, h }, { x: p.x - r - w, y: p.y - h / 2, w, h },
            { x: p.x - w / 2, y: p.y - r - h, w, h }, { x: p.x - w / 2, y: p.y + r, w, h }], W, H, pad);
        labels += `<text class="cm-town-label${t.capital ? ' cm-cap-label' : ''}" style="font-size:${fs}px" x="${f(box.x)}" y="${f(box.y + h * 0.78)}">${esc(t.name)}</text>`;
        let shape;
        if (atlas) {
            const { file, s } = contArtTown(c, t);
            shape = `<circle class="cm-a-hit" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(s * 0.45)}"/>${contArtImg(file, p.x, p.y, s, s, 'cm-a-icon')}`;
        } else {
            shape = t.capital
                ? `<rect class="cm-capital" x="${f(p.x - 4.5)}" y="${f(p.y - 4.5)}" width="9" height="9"/><circle class="cm-capital-dot" cx="${f(p.x)}" cy="${f(p.y)}" r="1.8"/>`
                : `<circle class="cm-town" cx="${f(p.x)}" cy="${f(p.y)}" r="${t.size === 'city' || t.size === 'metropolis' ? 3.8 : 3}"/>`;
        }
        keys += `<g class="cm-key" tabindex="0" role="button" data-go="t${t.id}" aria-label="${esc(contTownLabel(t))}">${shape}</g>`;
    });
    c.pois.forEach((q, n) => {
        const p = contPt(m, q.cell);
        const label = facCap(q.name);
        const fs = 8, r = poiR + 1;
        const w = label.length * fs * 0.5 + 2, h = fs + 1;
        const box = contPlace(boxes, [
            { x: p.x + r, y: p.y - h / 2, w, h }, { x: p.x - r - w, y: p.y - h / 2, w, h },
            { x: p.x - w / 2, y: p.y + r, w, h }, { x: p.x - w / 2, y: p.y - r - h, w, h }], W, H, pad);
        labels += `<text class="cm-poi-label" style="font-size:${fs}px" x="${f(box.x)}" y="${f(box.y + h * 0.78)}">${esc(label)}</text>`;
        const shape = atlas
            ? `<circle class="cm-a-hit" cx="${f(p.x)}" cy="${f(p.y)}" r="10"/>${contArtImg(`place/${CONT_ART_POIS[q.kind]}`, p.x, p.y, 25, 25, 'cm-a-icon')}
            <circle class="cm-a-badge" cx="${f(p.x + 9)}" cy="${f(p.y - 9)}" r="4.6"/><text class="cm-poi-n cm-a-n" x="${f(p.x + 9)}" y="${f(p.y - 8.7)}">${n + 1}</text>`
            : `<path class="cm-poi" d="M${f(p.x)} ${f(p.y - 7)}L${f(p.x + 7)} ${f(p.y)}L${f(p.x)} ${f(p.y + 7)}L${f(p.x - 7)} ${f(p.y)}Z"/>
            <text class="cm-poi-n" x="${f(p.x)}" y="${f(p.y + 0.5)}">${n + 1}</text>`;
        keys += `<g class="cm-key" tabindex="0" role="button" data-go="p${q.id}" aria-label="${esc(`${n + 1}: ${label}`)}">${shape}</g>`;
    });
    c.seas.forEach(s => {
        const p = contPt(m, s.cell);
        const text = facCap(s.name);
        const w = text.length * 5.6;
        const box = contPlace(boxes, [{ x: p.x - w / 2, y: p.y - 6, w, h: 11 }, { x: p.x - w / 2, y: p.y + 10, w, h: 11 }, { x: p.x - w / 2, y: p.y - 22, w, h: 11 },
            { x: p.x - w * 1.1, y: p.y - 6, w, h: 11 }, { x: p.x + w * 0.1, y: p.y - 6, w, h: 11 }, { x: p.x - w / 2, y: p.y + 26, w, h: 11 }], W, H, pad);
        labels += `<text class="cm-sea" x="${f(box.x + w / 2)}" y="${f(box.y + 9)}">${esc(text)}</text>`;
    });

    // A scale bar and a north arrow (the compass, when illustrated).
    const pxPerMile = S / Z.miles;
    const barMiles = [50, 100, 150, 200, 250, 300, 400, 500].find(v => v * pxPerMile >= 70) || 500;
    const bw = barMiles * pxPerMile;
    const scale = `<g class="cm-scale" transform="translate(${14 + T} ${H - 18 - T})">
        <rect class="cm-scale-a" x="0" y="0" width="${f(bw / 2)}" height="4"/><rect class="cm-scale-b" x="${f(bw / 2)}" y="0" width="${f(bw / 2)}" height="4"/>
        <text class="cm-scale-t" x="0" y="-4">0</text><text class="cm-scale-t" x="${f(bw)}" y="-4">${barMiles} miles</text></g>`;
    const north = atlas ? '' : `<g class="cm-north" transform="translate(${W - 24} 30)">
        <path class="cm-north-a" d="M0 -14L5 4L0 0L-5 4Z"/><text class="cm-north-t" x="0" y="15">N</text></g>`;

    // The illustrated map's paper, water, and symbols, defined once and used by reference.
    let defs = `<clipPath id="${id}-land"><path d="${landPath}"/></clipPath>`;
    if (atlas) {
        const tex = (name, file, size) => `<pattern id="${id}-${name}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><image href="${CONT_ART_DIR}${file}.webp" width="${size}" height="${size}"/></pattern>`;
        defs += tex('paper', 'parchment', 180) + tex('sea', 'sea', 200) + tex('shallows', 'shallows', 160)
            + `<pattern id="${id}-edge" patternUnits="userSpaceOnUse" width="${f(T * CONT_ART_EDGE)}" height="${T}"><image href="${CONT_ART_DIR}ornament/border-edge.webp" width="${f(T * CONT_ART_EDGE)}" height="${T}" preserveAspectRatio="none"/></pattern>`
            + [...art.sheets].map(k => `<symbol id="${id}-t-${k}" viewBox="0 0 1 1" preserveAspectRatio="xMidYMax meet"><image href="${CONT_ART_DIR}terrain/${k}.webp" width="1" height="1" preserveAspectRatio="xMidYMax meet"/></symbol>`).join('');
    }
    const fill = name => atlas ? ` style="fill:url(#${id}-${name});stroke:none"` : '';   // over the classic colors

    return `<svg class="cont-map${atlas ? ' cm-atlas' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">
        <title>${esc(title)}</title>
        <defs>${defs}</defs>
        <rect class="cm-sea-bg" x="0" y="0" width="${W}" height="${H}"${fill('sea')}/>
        <path class="cm-shallow" d="${shallow}"${fill('shallows')}/>
        ${atlas ? `<path class="cm-a-ripple" d="${coast}"/>` : ''}
        <path class="cm-land" d="${landPath}"${fill('paper')}/>
        <g clip-path="url(#${id}-land)">${tints}<g class="cm-realms">${realms}</g></g>
        ${bands}
        ${rivers}
        <path class="cm-coast" d="${coast}"/>
        <path class="cm-border" d="${borders}"/>
        ${marks}
        ${roads}
        ${orn ? orn.under : ''}
        <path class="cm-journey" id="${id}-journey" d=""/>
        ${keys}
        ${labels}
        ${bandLabels}
        ${scale}
        ${north}
        ${orn ? orn.frame.replace(/#ID-/g, `#${id}-`) : ''}
    </svg>`;
}

// The path of a journey on the map (for the highlight).
function contJourneyPath(c, j) {
    return j ? contSmooth(c.map, j.path.map(i => contPt(c.map, i))) : '';
}
