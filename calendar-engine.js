/* ============================================
   CALENDAR ENGINE (F33, Worldbuilder)
   A seeded world calendar: the reckoning and the year, month and weekday names
   in one of seven naming styles, seasons by climate, 1-3 moons (phases use the
   Travel tool's MOON_PHASES), days that belong to no month, and a festival for
   every month with what happens, what the party can do there, and what can go wrong.
   Every part rolls from deriveSeed(seed, part), so changing one option keeps the rest:
   a new style renames the months but keeps the festivals; a new week length keeps the
   months; adding a moon keeps the moons already there.
   Needs rng.js, coins.js, and travel-engine.js (MOON_PHASES, TRAVEL_SEASONS, TRAVEL_CLIMATES).
   All tables are the Gazette's own.
   ============================================ */

const MOON_MONTH_LUNAR = 29.5;
const CAL_SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

// Where the year begins: an offset into CAL_SEASON_ORDER (in seasons).
const CAL_STARTS = {
    spring:    { off: 0,   text: 'The year begins with the first thaw.' },
    midwinter: { off: 3.5, text: 'The year begins in the dead of winter, when the days start to lengthen.' },
    autumn:    { off: 2,   text: 'The year begins when the harvest is in.' },
    midsummer: { off: 1.5, text: 'The year begins on the longest day.' }
};

// What each season is like, by climate (Travel's climate keys).
const CAL_SEASON_NOTES = {
    temperate: {
        spring: ['Mud season: roads turn to soup and lambs arrive.', 'Rain most days, blossom by the end of it, and everyone owes the seed merchant.'],
        summer: ['Long warm days, hay in the fields, and armies on the march.', 'Dust on the roads, fairs in every town, and short nights.'],
        autumn: ['Harvest, then gales; the pigs are fattened and the roads close one by one.', 'Fog in the mornings, apples by the cartload, and the first frosts.'],
        winter: ['Snow in the hills, sleet in the valleys, and every inn full.', 'Short grey days; travel is slow and wolves come down from the high woods.']
    },
    cold: {
        spring: ['The ice breaks up on the rivers with a sound like cannon.', 'Snowmelt floods the low roads; the sun barely sets by the end of it.'],
        summer: ['A short, frantic summer of midnight sun and biting flies.', 'Everything that must be built, sold, or harvested is done now.'],
        autumn: ['A few weeks of gold, then the first blizzard.', 'Herds come down from the high pastures; the last ships race the ice home.'],
        winter: ['The long dark: the sun hardly rises and the sea freezes.', 'Sledges replace wagons, and nobody travels without a reason.']
    },
    arid: {
        spring: ['The desert blooms for a fortnight after the brief rains.', 'Wind season: sandstorms close the caravan roads for days at a time.'],
        summer: ['Killing heat: caravans travel by night and rest through the day.', 'Wells run low and water costs more than wine.'],
        autumn: ['The heat breaks and the great caravans set out.', 'Dates are harvested and the markets overflow.'],
        winter: ['Cold clear nights, warm days, and the best travel of the year.', 'Frost on the dunes at dawn; the oasis towns fill with traders.']
    },
    tropical: {
        spring: ['The early rains: warm downpours every afternoon.', 'Planting season; the rivers begin to rise.'],
        summer: ['The wet season: rivers flood, roads vanish, and boats go where carts can\'t.', 'Storms roll in off the sea; fevers spread in the low towns.'],
        autumn: ['The late rains thin out and the floodwater leaves rich silt behind.', 'Fruit everywhere; the jungle is loud with birds.'],
        winter: ['The dry season: cooler, clear, and the time for long journeys.', 'Rivers fall, fields burn for planting, and smoke hangs over the hills.']
    }
};

// What the season is called locally, by climate (the Travel season key stays the same).
const CAL_SEASON_NAMES = {
    temperate: {},
    cold: { winter: 'the Long Dark', summer: 'the Bright Weeks' },
    arid: { summer: 'the Burning', winter: 'the Cool Months' },
    tropical: { spring: 'the Early Rains', summer: 'the Wet', autumn: 'the Late Rains', winter: 'the Dry' }
};

// ── Naming styles ────────────────────────────────────────
// months: per season pools (names), or { pre, suf } per season for compounds, or 'royal'/'elven' builders.
// week: weekday names; rest: the name of the day of rest (kept last), if the style has one.
const CAL_STYLES = {
    almanac: {
        label: "Farmer's almanac", icon: '🌾',
        about: 'Months named for the work of the farm, the way country folk have always counted them.',
        months: {
            spring: ['Mudmonth', 'Lambing', 'Seedtime', 'Plowmonth', 'Thawmonth', 'Greening', 'Rainmonth'],
            summer: ['Haymonth', 'Highsun', 'Shearing', 'Dustmonth', 'Weeding', 'Longday', 'Swarming'],
            autumn: ['Reaping', 'Harvest', 'Applefall', 'Slaughtermonth', 'Leaffall', 'Mistmonth', 'Gleaning'],
            winter: ['Hearthmonth', 'Wolfmonth', 'Snowfall', 'Longnight', 'Coldbite', 'Fastmonth', 'Frostmonth']
        },
        week: ['Plowday', 'Millday', 'Marketday', 'Washday', 'Bakeday', 'Mendday', 'Brewday', 'Hearthday', 'Woodday', 'Wellday', 'Sowday'],
        rest: 'Restday'
    },
    common: {
        label: 'Old Common', icon: '📜',
        about: 'Old compound names, worn smooth by centuries of use. Scholars argue about what half of them mean.',
        months: {
            spring: { pre: ['Thaw', 'Bud', 'Rain', 'Green', 'Wake', 'Bloom', 'Lark', 'Seed'] },
            summer: { pre: ['Sun', 'Gold', 'High', 'Flame', 'Bright', 'Hay', 'Dawn'] },
            autumn: { pre: ['Leaf', 'Ash', 'Russet', 'Mist', 'Amber', 'Gale', 'Wane'] },
            winter: { pre: ['Frost', 'Rime', 'Snow', 'Hollow', 'Iron', 'Wolf', 'Dark', 'Ember'] },
            suf: ['march', 'tide', 'turn', 'crest', 'moot', 'fell', 'reach', 'song', 'mark', 'fast', 'hold', 'wend', 'mere', 'ward', 'fall', 'brook']
        },
        week: ['Sunsday', 'Moonsday', 'Starsday', 'Skyday', 'Stoneday', 'Fireday', 'Windsday', 'Rainsday', 'Ironday', 'Ashday', 'Seaday', 'Treesday'],
        rest: null
    },
    royal: {
        label: 'Royal reckoning', icon: '👑',
        about: 'Every month is named for a ruler or a saint of the old kingdom, and every schoolchild has to learn which.',
        months: 'royal',
        week: ['Firstday', 'Secondday', 'Thirdday', 'Fourthday', 'Fifthday', 'Sixthday', 'Seventhday', 'Eighthday', 'Ninthday'],
        rest: 'Crownday',
        ordered: true
    },
    dwarven: {
        label: 'Dwarven deep-count', icon: '⚒️',
        about: 'Counted in the deep halls, where nobody sees the sun. The months follow the forge, and surface folk borrowed them for trade.',
        months: ['Anvilturn', 'Coalmonth', 'Deepdelve', 'Firstore', 'Hammerfall', 'Kegmonth', 'Lodestone', 'Orefast', 'Quenchmonth', 'Silverseam', 'Stonewake', 'Tunnelmonth', 'Bellows', 'Gemcount', 'Forgefire', 'Granitehold', 'Ironvein', 'Lanternmonth', 'Slagmonth'],
        week: ['Hammerday', 'Tongsday', 'Bellowsday', 'Quenchday', 'Chiselday', 'Pickday', 'Kegday', 'Lampday', 'Stoneday', 'Goldday', 'Forgeday'],
        rest: 'Hearthday'
    },
    elven: {
        label: 'Elven', icon: '🍃',
        about: 'Old elven names, each with a meaning the elves will gladly explain at length.',
        months: 'elven',
        week: 'elven',
        rest: null
    },
    sailor: {
        label: "Sailor's reckoning", icon: '⚓',
        about: 'The port towns count the year by the sea: when it\'s safe to sail, when it isn\'t, and when the fish run.',
        months: {
            spring: ['Tideturn', 'Netmend', 'Fairwind', 'Keelmonth', 'Launching', 'Gullcry'],
            summer: ['Calmwater', 'Brightwater', 'Longhaul', 'Saltmonth', 'Shoaling', 'Bluewater'],
            autumn: ['Squall', 'Homeward', 'Fogmonth', 'Riptide', 'Lanternwatch', 'Herringrun'],
            winter: ['Galemonth', 'Stormwatch', 'Harborfast', 'Wreckmonth', 'Blackwater', 'Icemoor']
        },
        week: ['Tideday', 'Keelday', 'Netday', 'Sailday', 'Anchorday', 'Gullday', 'Shellday', 'Saltday', 'Hullday', 'Mastday', 'Ropeday'],
        rest: 'Harborday'
    },
    temple: {
        label: 'Temple calendar', icon: '🕯️',
        about: 'The priests named every month for a virtue, so that each one reminds the faithful of something they are doing wrong.',
        months: {
            spring: ['Mercy', 'Renewal', 'Hope', 'Blessing', 'Kindness', 'Patience'],
            summer: ['Plenty', 'Glory', 'Valor', 'Zeal', 'Radiance', 'Joy'],
            autumn: ['Gratitude', 'Reckoning', 'Humility', 'Mourning', 'Charity', 'Thrift'],
            winter: ['Vigil', 'Penance', 'Remembrance', 'Silence', 'Faith', 'Endurance']
        },
        week: ['Prayday', 'Almsday', 'Hymnday', 'Fastday', 'Candleday', 'Bellday', 'Graceday', 'Lightday', 'Shriveday', 'Oathday', 'Bookday'],
        rest: 'Holyday'
    }
};

const CAL_ROYAL = {
    first: ['Al', 'Ber', 'Cor', 'Dun', 'Ed', 'Fen', 'Gar', 'Hal', 'Is', 'Mer', 'Os', 'Ros', 'Tam', 'Wil', 'Bran', 'Cael', 'Hild', 'Mar', 'Od', 'Ael', 'Gwen', 'Leof', 'Sig', 'Thed'],
    end: ['ric', 'wen', 'mund', 'eth', 'ard', 'ina', 'old', 'wyn', 'gar', 'elle', 'ora', 'win', 'rada', 'bert', 'helm', 'issa'],
    title: ['King', 'Queen', 'Saint', 'Good', 'Old', 'Prince', 'Lady'],
    // How the month is named after them.
    patterns: [['{n}', 4], ["{n}'s Month", 2], ['{t} {n}', 3]]
};

const CAL_ELVEN = {
    onset: ['A', 'Ae', 'Ce', 'El', 'Fae', 'I', 'Il', 'Lae', 'Li', 'Mi', 'Na', 'Ny', 'Sae', 'Sy', 'Tha', 'Va', 'Yl', 'Ara', 'Eri', 'Ithe', 'Olo', 'Rho'],
    mid: ['', '', 'la', 'li', 'ra', 're', 'va', 'tha', 'se', 'me', 'na'],
    end: ['rin', 'ndel', 'wen', 'thas', 'lith', 'riel', 'nor', 'vae', 'sar', 'lan', 'dra', 'mir', 'sil', 'thae', 'ren', 'quen'],
    // Meanings, by season.
    gloss: {
        spring: ['the First Thaw', 'Green Shoots', 'the Waking', 'Songbird', 'Rain on Leaves', 'the Opening Bud'],
        summer: ['Long Light', 'the High Sun', 'Gold on the Water', 'the Still Noon', 'Ripening', 'Starflower'],
        autumn: ['Falling Leaves', 'the Red Wood', 'the Gathering', 'Mist on the River', 'the Last Fruit', 'Geese Departing'],
        winter: ['the Long Sleep', 'Silver Hush', 'Starfrost', 'the Bare Branch', 'Deep Snow', 'the Quiet Stars']
    },
    weekOnset: ['Ar', 'El', 'Il', 'Lo', 'Mi', 'Ny', 'Sa', 'Tha', 'Va', 'Ys', 'Ce', 'Fa', 'Qua', 'Ri'],
    weekEnd: ['nis', 'del', 'wen', 'ra', 'thil', 'mar', 'sel', 'lin', 'vas', 'ne', 'ri', 'dor']
};

// Folk nicknames for months, by season.
const CAL_NICKNAMES = {
    spring: ['the Hungry Month', 'the Month of Mud', 'Lambing Time', 'the Month of Debts', 'Cuckoo Month', 'the Wet Month', 'the Month of Weddings', 'Sowing Time'],
    summer: ['the Month of Flies', 'the Month of Fairs', 'Haying Time', 'the Fighting Month', 'the Thirsty Month', 'the Month of Short Nights', 'Swarm Month', 'the Lazy Month'],
    autumn: ['the Fat Month', 'the Month of Plenty', 'Blood Month', 'the Brewing Month', 'the Month of Gales', 'Rent Month', 'the Month of Mists', 'Nutting Time'],
    winter: ['the Hard Month', 'the Month of Wolves', 'the Long Month', 'the Fireside Month', 'the Month of Coughs', 'the Dark Month', 'the Lean Month', 'the Month of Tales']
};

// ── The reckoning ─────────────────────────────────────────
const CAL_ERA_EVENTS = [
    { e: 'the Sundering', a: 'AS' }, { e: 'the Founding', a: 'AF' }, { e: 'the Crowning', a: 'AC' },
    { e: 'the Long Night', a: 'LN' }, { e: 'the Great Flood', a: 'GF' }, { e: 'the Treaty', a: 'AT' },
    { e: 'the First Dawn', a: 'FD' }, { e: 'the Fall of the Tower', a: 'FT' }, { e: 'the Last Dragon', a: 'LD' },
    { e: 'the Landing', a: 'AL' }, { e: 'the Burning of the Archive', a: 'BA' }, { e: 'the Plague Years', a: 'PY' },
    { e: 'the Breaking of the Chains', a: 'BC' }, { e: 'the Star\'s Fall', a: 'SF' }, { e: 'the Union', a: 'AU' },
    { e: 'the Return of the Sun', a: 'RS' }, { e: 'the Drowning of the Old City', a: 'DC' }, { e: 'the Silence', a: 'S' }
];
const CAL_ERA_FORMS = [['Years after {e}', 4], ['the Reckoning of {e}', 2], ['Years since {e}', 2], ['the Count from {e}', 1]];
const CAL_ERA_NOTES = [
    'Nobody alive remembers it, and the histories disagree about what actually happened.',
    'The temples and the crown count from it; the elves think the whole idea is adorable.',
    'Scholars agree the date is wrong by at least six years. Nobody wants to be the one to fix it.',
    'Before it, every town kept its own count, and contracts were a nightmare.',
    'The dwarves keep an older count and add it in brackets, pointedly.',
    'Every hundredth year is a holy year, with a festival nobody can afford.',
    'A rival count from another event is still used across the border, which makes treaties fun.',
    'The day it began is a public holiday, but nobody agrees which day that was.'
];
const CAL_YEAR_ADJ = ['Unwilling', 'Hungry', 'Patient', 'Drowned', 'Laughing', 'Silver', 'Broken', 'Sleeping', 'Crooked', 'Burning', 'Lost', 'Second', 'Golden', 'Restless', 'Hollow', 'Wandering', 'Last', 'Weeping', 'Iron', 'Honest'];
const CAL_YEAR_NOUN = ['Goat', 'Crown', 'Lantern', 'Bell', 'Kettle', 'Sparrow', 'Harp', 'Shield', 'Wheel', 'Toad', 'Candle', 'Tower', 'Oak', 'Hound', 'Sword', 'Owl', 'Plow', 'Key', 'Mirror', 'Mule'];

// ── Days outside the months ───────────────────────────────
const CAL_GAP_NAMES = ['the Hollow Days', "the Year's Turn", 'the Uncounted Days', 'the Gap', 'the Between', "the Lost Days", 'the Nameless Days', 'the Threshold'];
const CAL_GAP_NAME_ONE = ['Midwinter Night', "the Year's Turn", 'the Uncounted Day', 'the Hinge', 'Nobody\'s Day', 'the Threshold'];
const CAL_GAP_CUSTOMS = [
    'Debts can\'t be collected and oaths sworn on it don\'t bind, so the shrewd sign nothing.',
    'Doors stay shut and lamps stay lit; whatever walks on a day with no name is best not met.',
    'Nobody works, the courts are closed, and a crime committed on it is argued about for years.',
    'Servants and masters trade places, and nobody may be dismissed for what they said.',
    'Babies born on it are said to belong to no month, and are lucky, or cursed, depending who you ask.',
    'Every hearth is put out and lit again from one fire kept by the eldest in town.'
];

// ── Moons ────────────────────────────────────────────────
const CAL_MOON_NAMES = ['Varra', 'Ossil', 'Lanthe', 'Merrow', 'Tolle', 'Ishen', 'Quell', 'Brannoch', 'Aster', 'Olle', 'Sennet', 'Corvane', 'Ithry', 'Mab', 'Halcyne', 'Pellow'];
const CAL_MOON_EPITHETS = ['the Pale Lady', 'the Ember', 'the Coin', "the Widow's Lamp", "the Shepherd's Eye", "the Thief's Lantern", 'Old Grin', 'the Wanderer', 'the Little Sister', 'the Watcher', 'the Bone', "the Drowned Man's Moon", 'the Lantern', 'the Hare', 'the Late Moon', 'the Seed'];
const CAL_MOON_COLORS = ['silver-white', 'bone pale', 'faintly blue', 'rust red', 'amber', 'greenish', 'violet', 'pale gold', 'pearl grey', 'copper'];
const CAL_MOON_SIZES = [
    ['huge, filling a hand at arm\'s length', 'large and bright'],
    ['small and quick', 'about the size of a coin at arm\'s length', 'half the size of the first'],
    ['a bright speck, easy to miss', 'tiny and very bright', 'small and dim']
];
const CAL_MOON_LORE = [
    'Shepherds count their lambing by it.',
    'Sailors won\'t leave port when it\'s new.',
    'Wedding dates are set by it, and so are the arguments about wedding dates.',
    'The old stories say it\'s a lantern carried by someone looking for something.',
    'Thieves call it the enemy and plan their work around it.',
    'Farmers plant root crops when it wanes and everything else when it waxes.',
    'Children are told it watches them; adults are not entirely sure it doesn\'t.',
    'Astrologers make a good living explaining what it means this month.',
    'It has a face, people say, and the face has been getting sadder.',
    'Hunters swear game is easier to find under it.',
    'The tides follow it, and so, say the fishwives, do tempers.',
    'Some temples keep a vigil every time it is new, in case it doesn\'t come back.'
];
const CAL_MOON_FULL = [
    'Dogs howl, milk sours, and the town watch doubles its patrols.',
    'Lovers meet, deals are struck, and nobody sleeps.',
    'Werewolf stories get told in every tavern, and a few too many get believed.',
    'Herbalists gather their plants by its light; they say the cuttings work better.',
    'It\'s bad luck to start a journey, and good luck to finish one.',
    'Fishing fleets stay out all night, and the markets are full of fish next day.',
    'The old folk leave a bowl of milk on the step. Something drinks it.',
    'Crimes are punished more harshly, by long custom.',
    'Children born under it are said to have the sight.',
    'Duels and challenges are fought by its light, by tradition.'
];
// Second pass (E6): later draws (moon.<i>.more, era.more) swap these in.
const CAL_MOON_LORE_MORE = [
    'Debts fall due when it\'s full, and the moneylenders call it the Collector.',
    'Bakers say bread rises higher under it, and charge accordingly.',
    'Elves name their children for whatever it was doing on the night they were born.',
    'When it rises red, the old folk stay indoors and the young folk find out why.',
    'It is said to be the eye of a sleeping giant, and its waning is the giant blinking.',
    'Pilgrims walk to the coast to watch it rise out of the sea.',
    'Ships\' captains keep tables of it, and guard them like treasure.',
    'A cult in the hills believes it is coming closer, and has the measurements to prove it.',
    'Midwives swear more babies come when it\'s full; the midwives are tired.',
    'Wolves stop howling when it\'s new, and the silence keeps whole villages awake.',
    'Scribes date their letters by it rather than by the months, which confuses everyone else.',
    'Gravediggers won\'t dig when it\'s new; the ground is said to be listening.'
];
const CAL_MOON_FULL_MORE = [
    'The taverns stay open all night, by an old law nobody has bothered to repeal.',
    'Wizards renew their wards, and the whole town smells of burnt sage.',
    'Couples who marry by its light are said never to quarrel, which their neighbors dispute.',
    'Ghost stories are told on the green, and a child always claims to have seen one.',
    'Night markets spring up in the square, selling things nobody would buy by daylight.',
    'Shepherds pen their flocks early; something comes down from the hills.',
    'Prisoners are let out into the yard so they can see it.',
    'Lovers carve their names in the old oak, which is running out of room.',
    'The temple bells ring once at moonrise, and every dog in town answers.',
    'Nobody cuts their hair or nails, for fear of what might grow back.'
];
const CAL_ERA_NOTES_MORE = [
    'A few old families still count from an older event, and sign their letters that way to show it.',
    'A sect insists the count is off by exactly one year, and keeps New Year a day early.',
    'Some counted the first year as year one and others as year nought, and the lawyers love it.',
    'Coins are stamped with the year, so a forger\'s first mistake is usually the date.',
    'The court historian is paid to keep it accurate, and is three years behind.',
    'Some villages never took it up and still count by their lord\'s age.',
    'The event is played out every year at the fair, and the play gets the story wrong in a new way each time.',
    'Prophets announce the end of the count every few decades; the count keeps going.',
    'The gnomes keep it to the minute and are scandalized that nobody else does.',
    'Its name is cut on every gravestone, so even the dead keep the count.'
];

// ── Festivals ────────────────────────────────────────────
// Third pass (R9): later draws (era.r9, gap.more.*, fest.more.*) swap these in by their share.
const CAL_ERA_EVENTS_MORE = [
    { e: 'the Great Thaw', a: 'GT' }, { e: 'the Opening of the Gate', a: 'OG' }, { e: 'the Coming of the Ships', a: 'CS' },
    { e: 'the Binding of the Demon', a: 'BD' }, { e: 'the Red Comet', a: 'RC' }, { e: 'the First Harvest', a: 'FH' },
    { e: 'the Raising of the Walls', a: 'RW' }, { e: 'the Exile', a: 'AE' }, { e: 'the Godswar', a: 'GW' },
    { e: 'the Hallowing', a: 'AH' }, { e: 'the Year Without Summer', a: 'YS' }, { e: 'the Great Census', a: 'GC' }
];
const CAL_GAP_CUSTOMS_MORE = [
    'Anyone may sleep in any house, and turning a stranger away brings a year of bad luck.',
    'Every quarrel must be settled before sunset, or the law says it carries into the new year.',
    'People wear their clothes inside out, so whatever walks on these days won\'t know them.',
    'Children run the town council for the day, and some of their laws are still on the books.',
    'Every bell is silenced, and whichever rings first afterward is said to choose the year\'s luck.',
    'Nobody may buy or sell; whatever is needed must be given or lent.',
    'The dead are said to visit, and every table sets a place for them.',
    'A wedding made on it lasts forever, which is why so few dare.'
];
const CAL_FEST_NAMES_MORE = {
    harvest: ['The Feast of the Last Load', 'Sheaf Night', 'The Gleaning', 'Barn Dance Night'],
    fire: ['The Night of Sparks', 'The Great Blaze', 'Torch Night', 'The Feast of Flames'],
    dead: ['The Feast of Names', 'Ghost Supper', 'The Night the Dead Walk Home', 'The Quiet Feast'],
    sowing: ['The Blessing of the Seed', 'Furrow Day', 'The Plowmen\'s Feast', 'Mudfoot Day'],
    blossom: ['The Petal Fair', 'Blossom Night', 'The Ribbon Dance', 'Greenmantle Day'],
    midsummer: ['Sunstanding', 'The Golden Eve', 'The Shortest Night', 'The Feast of the Sun'],
    water: ['Riverfeast', 'The Casting of Garlands', 'Fountain Day', 'The Drowning of the Straw Man'],
    misrule: ['The Upside-Down Feast', 'The Beggar King\'s Day', 'Mummers\' Night', 'The Pig King\'s Feast'],
    fair: ['The Wool Fair', 'The Spice Fair', 'The Pie Fair', 'The Cattle Fair'],
    games: ['The Iron Games', 'The Bridge Race', 'The Feast of Champions', 'Stone-Throw Day'],
    vigil: ['The Night Without Fire', 'The Silent Watch', 'The Fast of Bread and Water', 'Ash Night'],
    masque: ['The Night of Feathers', 'Mummery', 'The Feast of Masks', 'The Strangers\' Ball'],
    founding: ['The Walls Feast', 'Gate Day', 'The Founding Feast', 'Banner Day'],
    moon: ['The Silver Feast', 'Moonrise Night', 'The Night of Long Shadows', 'The Lantern Moon'],
    hunt: ['The Wild Hunt Feast', 'Antler Day', 'The Hounds\' Feast', 'The Last Chase'],
    gifts: ['The Night of Small Gifts', 'The Yule Table', 'Winternight', 'The Feast of Kindness'],
    beasts: ['The Pig Parade', 'The Duck Race', 'Shearing Day', 'The Feast of Good Dogs'],
    ice: ['Frostfair Night', 'The Snow Feast', 'The Night of Ice Lanterns'],
    rain: ['The Thunder Dance', 'The Feast of the Cloud Mother', 'Wet Earth Day']
};

// s: seasons it fits. climates: only these climates (else any). Each party activity has a check
// and an optional prize (gp, shown through formatCoins()).
const CAL_FESTIVALS = {
    harvest: {
        icon: '🌾', s: ['autumn'],
        names: ['Harvest Home', 'The Last Sheaf', 'The Reaping Feast', 'The Feast of the Full Barn', 'Gathering Day'],
        happens: [
            'Every farm brings its last sheaf to the square, where it\'s woven into a straw figure and paraded to the longest table in town.',
            'The landlords feed their tenants for one night, and everyone keeps score of who served the thinnest soup.',
            'Wagons decked in ribbons race the last of the grain to the mill, and the miller pretends not to take bets.'
        ],
        party: [
            { t: 'Join the scything race: three rounds of DC 12 Strength (Athletics) checks, most successes wins.', prize: 'a barrel of cider', gp: 2 },
            { t: 'Guess the weight of the prize pumpkin with a DC 14 Wisdom (Survival) check.', prize: 'the pumpkin and a silver spoon', gp: 1 },
            { t: 'Help bring in a late field before the rain: a DC 13 Constitution check, or gain a level of exhaustion.', prize: 'a farmer\'s gratitude and a week of free meals', gp: 0 }
        ],
        food: ['Harvest loaf baked in the shape of a sheaf', 'Roast goose with apples', 'New cider and old cheese'],
        custom: ['The last sheaf is kept over the hearth until next year, for luck.', 'Whoever finds the bean in the harvest loaf rules the feast.', 'Nobody may refuse a dance tonight.'],
        trouble: ['The straw figure catches fire early, and so does the granary.', 'A tax collector arrives with the wagons, a day early and very unwelcome.', 'Someone\'s been stealing grain all year, and the scales prove it tonight.']
    },
    fire: {
        icon: '🔥', s: ['winter', 'autumn', 'summer'],
        names: ['The Burning of the Old Year', 'Bonfire Night', 'The Night of the Wicker King', 'Ember Eve', 'The Kindling'],
        happens: [
            'A great wicker figure stuffed with the year\'s grudges, written on scraps of paper, is burned on the hill above town.',
            'Every hearth is put out at dusk and relit from a single bonfire, carried home in lanterns.',
            'Young people leap the bonfires in pairs; a clean jump means a good year.'
        ],
        party: [
            { t: 'Leap the big bonfire with a DC 13 Dexterity (Acrobatics) check; a failure deals 1d6 fire damage and a lot of laughter.', prize: 'a lucky ember charm', gp: 1 },
            { t: 'Write a grudge on a scrap and burn it. A DC 12 Wisdom (Insight) check reads the scraps blowing loose: someone in town plans a murder.', prize: null, gp: 0 },
            { t: 'Carry the town flame home without letting it go out through the wind: a DC 14 Dexterity check.', prize: 'free lodging from the grateful innkeeper', gp: 5 }
        ],
        food: ['Chestnuts roasted in the coals', 'Spiced wine kept hot on the fire', 'Burnt-sugar toffee'],
        custom: ['Whatever is burned tonight is forgiven, in theory.', 'Nobody may lend fire to a neighbor tonight, or the luck goes with it.', 'Ashes from the bonfire are scattered on the fields at dawn.'],
        trouble: ['One of the grudges in the wicker king names the mayor, and someone reads it aloud.', 'A cult sees the bonfire as a calling, and something answers.', 'The wind changes.']
    },
    dead: {
        icon: '🏮', s: ['autumn', 'winter'],
        names: ['Lantern Night', 'The Night of Open Doors', "The Ancestors' Supper", 'Hallowtide', 'The Long Remembering'],
        happens: [
            'Families set a place at the table for each of their dead and tell their best stories about them.',
            'Lanterns line every road to the graveyard so the dead can find their way home, and back again by dawn.',
            'The town\'s doors are left unlatched all night, and nobody asks who came in.'
        ],
        party: [
            { t: 'Keep the graveyard vigil until dawn: a DC 13 Wisdom saving throw against the cold and the whispers, or be frightened until sunrise.', prize: 'the temple\'s blessing and a silver coin from each family', gp: 3 },
            { t: 'Listen for the truth in a ghost story told by an old woman: a DC 14 Intelligence (History) check finds where the treasure in it was really buried.', prize: null, gp: 0 },
            { t: 'Find a lost child among the lanterns before midnight: a DC 12 Wisdom (Perception) check.', prize: 'a family\'s gratitude', gp: 0 }
        ],
        food: ['Soul cakes marked with a cross', 'The dead one\'s favorite dish, served cold', 'Black bread and honey'],
        custom: ['Speaking ill of the dead tonight brings them to your door to argue.', 'Mirrors are covered so the dead don\'t get lost in them.', 'An empty chair is left at every inn table.'],
        trouble: ['One of the dead does come home, and wants their house back.', 'A grave robber works the quiet graveyard while everyone feasts.', 'Someone sets a place for a person who isn\'t dead yet.']
    },
    sowing: {
        icon: '🌱', s: ['spring'],
        names: ['The Plow Blessing', 'Seed Day', 'The First Furrow', 'The Waking of the Fields', 'Greenwake'],
        happens: [
            'The priest walks the boundary of every field with a bowl of water, and the children follow, beating the boundary stones with sticks.',
            'The first furrow is cut by the oldest plow in town, pulled by the newest married couple.',
            'Seed is blessed in the temple and handed out to every farm, an exact sackful each.'
        ],
        party: [
            { t: 'Help the newlyweds steer the old plow straight: a DC 13 Strength (Athletics) check.', prize: 'a sack of blessed seed', gp: 1 },
            { t: 'Beat the bounds and spot the boundary stone someone moved in the night: a DC 14 Wisdom (Perception) check.', prize: 'a farmer\'s reward', gp: 5 },
            { t: 'Calm the plow ox, which has opinions: a DC 12 Wisdom (Animal Handling) check.', prize: null, gp: 0 }
        ],
        food: ['Seed cake with caraway', 'The first greens of the year, boiled hard', 'Barley ale from the last of the old grain'],
        custom: ['Nobody lends anything today, or the harvest goes with it.', 'A coin is buried in the first furrow for the earth.', 'Girls wash their faces in dew for beauty, and boys for luck.'],
        trouble: ['The blessed seed was swapped for cheap seed, and the priest is in on it.', 'The boundary walk ends in a fight over a moved stone.', 'Something under the first furrow hits the plow and doesn\'t move.']
    },
    blossom: {
        icon: '🌸', s: ['spring', 'summer'],
        names: ['Garland Day', 'Bloomfair', 'The Crowning of the Spring Queen', 'Maying', 'The Feast of Flowers'],
        happens: [
            'The town crowns a Spring Queen, who rules the day in a crown of flowers and judges every dispute brought to her.',
            'A painted pole goes up on the green, and everyone dances ribbons around it until it\'s wrapped tight.',
            'Doors and carts are hung with garlands, and the best-dressed house wins a cask of mead.'
        ],
        party: [
            { t: 'Dance the ribbon pole without tangling: a DC 12 Dexterity (Performance) check.', prize: 'a flower crown and a kiss from the Queen', gp: 0 },
            { t: 'Bring a dispute before the Spring Queen and argue it: a DC 14 Charisma (Persuasion) check wins.', prize: 'whatever was in dispute', gp: 10 },
            { t: 'Climb the pole for the prize at the top: a DC 15 Strength (Athletics) check.', prize: 'a purse at the top', gp: 5 }
        ],
        food: ['Elderflower cordial', 'Honey cakes with candied petals', 'Spring lamb'],
        custom: ['Whatever the Spring Queen rules today is law until sunset.', 'Flowers given today are an offer of marriage, so give them carefully.', 'Nobody may sleep indoors tonight.'],
        trouble: ['Two girls both claim the crown, and their families are armed.', 'The flowers on the pole are a rare poison bloom.', 'The Spring Queen rules that the lord\'s fence comes down.']
    },
    midsummer: {
        icon: '☀️', s: ['summer'],
        names: ['Midsummer Revel', 'Sunfire Eve', 'The Longest Day', 'High Sun', 'The Feast of Long Light'],
        happens: [
            'The whole town stays awake through the short night and greets the sunrise from the hill, singing.',
            'A wheel of straw is set alight and rolled down the hill; if it reaches the river burning, the harvest will be good.',
            'Folk wander the woods all night looking for the fern that flowers only tonight.'
        ],
        party: [
            { t: 'Find the midsummer fern-flower in the woods: a DC 15 Intelligence (Nature) check, and something guards it.', prize: 'a flower that grants a wish, or so they say', gp: 0 },
            { t: 'Steer the burning wheel to the river: a DC 13 Strength check to keep it upright.', prize: 'free ale until sunrise', gp: 2 },
            { t: 'Stay awake and sober until dawn: a DC 12 Constitution saving throw at midnight and at the last hour.', prize: 'a lucky sun charm', gp: 1 }
        ],
        food: ['Strawberries and cream', 'Whole roast pig', 'Sun-wine, gold and sweet'],
        custom: ['Whatever you dream tonight will come true within the year.', 'It\'s the one night the fey may walk in town, and they are welcome.', 'Promises made at sunrise can\'t be broken.'],
        trouble: ['Someone found the fern-flower, and wished.', 'The fey guests take a child back with them.', 'The burning wheel goes into the barley instead of the river.']
    },
    water: {
        icon: '🌊', s: ['spring', 'summer'],
        names: ['The Blessing of the Boats', 'River Day', 'Well Dressing', 'The Feast of Waters', 'Floodmark'],
        happens: [
            'Every boat in harbor is hung with ribbons, and the priest throws a gold ring into the water to wed the town to the sea.',
            'The wells are decorated with pictures made of petals pressed into clay, and the best one is blessed first.',
            'A race is swum across the river, and the winner\'s family draws water first all year.'
        ],
        party: [
            { t: 'Dive for the gold ring the priest throws: a DC 14 Strength (Athletics) check, holding your breath.', prize: 'the ring itself, if you dare keep it', gp: 25 },
            { t: 'Swim the river race: a DC 13 Strength (Athletics) check against the current.', prize: 'a laurel and a cask of wine', gp: 3 },
            { t: 'Judge the well dressings, and survive the families\' opinions: a DC 13 Charisma (Persuasion) check.', prize: 'a feast in your honor', gp: 0 }
        ],
        food: ['Fried river fish', 'Watercress soup', 'Small beer, cold from the well'],
        custom: ['Nobody may draw water before the priest does.', 'A wish whispered into the well today is heard.', 'Fishermen don\'t fish today; the water gets a rest.'],
        trouble: ['The gold ring is fished back up by something that isn\'t a person.', 'One of the wells has been poisoned.', 'The river is high, and the race should have been called off.']
    },
    misrule: {
        icon: '🃏', s: ['winter', 'spring'],
        names: ['The Fool\'s Crown', 'The Day of Misrule', 'Topsy Night', 'The Feast of Fools', 'Lord of Misrule'],
        happens: [
            'A Lord of Misrule is chosen by lot, and for a day the town obeys their every ridiculous order.',
            'Servants sit at the table and their masters wait on them, badly.',
            'Everyone wears their clothes backwards and says the opposite of what they mean, and the watch arrests nobody.'
        ],
        party: [
            { t: 'Get chosen Lord of Misrule (you find the dried pea in your cake on a DC 15 Wisdom (Perception) check), then rule the town until dawn.', prize: 'one ridiculous order that must be obeyed', gp: 0 },
            { t: 'Out-fool the town fool in a contest of wit: a DC 14 Charisma (Performance) check.', prize: 'the fool\'s bells and a purse', gp: 4 },
            { t: 'Spot the pickpocket working the confused crowd: a DC 13 Wisdom (Perception) check.', prize: 'the reward from the merchants', gp: 10 }
        ],
        food: ['Twelfth cake with a pea and a bean inside', 'Pottage served on the wrong side of the plate', 'Hot spiced ale'],
        custom: ['No insult spoken today may be answered with a blade.', 'The mayor must do one thing the Lord of Misrule orders.', 'A secret said today must be kept forever.'],
        trouble: ['The Lord of Misrule orders the jail opened, and the guards obey.', 'A real coup hides behind the pretend one.', 'A noble who was served badly does not find it funny.']
    },
    fair: {
        icon: '🎪', s: ['spring', 'summer', 'autumn', 'winter'],
        names: ['The Great Fair', 'The Horse Fair', 'The Hiring Fair', 'The Cheese Fair', 'The Goose Fair', '{month} Market'],
        happens: [
            'Traders come from three counties, and the town fills with stalls, jugglers, cutpurses, and the smell of frying.',
            'Farmhands and servants stand in the square holding the tool of their trade, waiting to be hired for the year.',
            'Horse dealers trot their animals up and down the high street, and every one of them swears theirs is the fastest.'
        ],
        party: [
            { t: 'Haggle for a horse: a DC 14 Wisdom (Animal Handling) check spots the one that\'s been doped.', prize: 'a fair price on a riding horse', gp: 0 },
            { t: 'Try the strongman\'s challenge: a DC 15 Strength (Athletics) check to ring the bell.', prize: 'a purse', gp: 5 },
            { t: 'Hire on for a day\'s work and spot what the employer is hiding: a DC 13 Wisdom (Insight) check.', prize: 'a day\'s wages and a job lead', gp: 1 }
        ],
        food: ['Fried dough with honey', 'Meat pies of doubtful origin', 'Roast chestnuts and hot cider'],
        custom: ['Any deal sealed with a handshake at the fair can\'t be undone until next year\'s fair.', 'The fair has its own court, and its judge can hang a cheat by sundown.', 'Tolls are suspended for the fair\'s length.'],
        trouble: ['A merchant\'s strongbox goes missing and the party are the newest faces in town.', 'A sickness is moving through the cattle pens.', 'Two rival trading houses set up stalls side by side.']
    },
    games: {
        icon: '🏆', s: ['summer', 'spring'],
        names: ["Champions' Day", 'The Summer Games', 'The Tug of Bridges', 'The Great Contest', 'The Laurel Games'],
        happens: [
            'Villages send their strongest to throw stones, wrestle, and race, and the winning village drinks free for a year.',
            'Two halves of the town pull a rope across the river, and the losers end up in it.',
            'Archers shoot at a target that moves back ten paces each round until only one can hit it.'
        ],
        party: [
            { t: 'Enter the wrestling: three bouts, each a contested Strength (Athletics) check against a +5 local.', prize: 'a silver belt', gp: 15 },
            { t: 'Shoot in the archery: hit AC 13, then AC 15, then AC 17 with ranged attacks.', prize: 'a golden arrow', gp: 25 },
            { t: 'Run the hill race: a DC 13 Constitution check, then a DC 14 Dexterity (Acrobatics) check on the way down.', prize: 'a laurel and a ham', gp: 2 }
        ],
        food: ['Grilled sausages', 'Barley water and strong ale', 'Victor\'s cake, shared by the winning village'],
        custom: ['Outsiders may compete, but must declare a village to compete for.', 'The losing team buys the first round.', 'A champion may not be arrested on the day of the games.'],
        trouble: ['A champion has been paid to lose, and doesn\'t.', 'The rival village brought ringers, and one of them is an ogre in a hat.', 'The rope snaps.']
    },
    vigil: {
        icon: '🕯️', s: ['winter', 'spring', 'autumn'],
        names: ['The Long Vigil', 'The Fast of Ashes', 'Quiet Day', 'The Night of Candles', 'Penitence'],
        happens: [
            'The temple bells go silent, nobody eats from dawn to dusk, and the streets are empty and still.',
            'Everyone carries a lit candle through the night; letting it go out means a hard year.',
            'Folk put ash on their foreheads and say aloud one wrong they did this year.'
        ],
        party: [
            { t: 'Keep the fast and the silence until dusk: a DC 12 Constitution saving throw.', prize: 'the temple\'s blessing', gp: 0 },
            { t: 'Hear a confession that wasn\'t meant for you: a DC 14 Wisdom (Insight) check tells whether it was true.', prize: null, gp: 0 },
            { t: 'Keep your candle lit from dusk to dawn through the wind and the sleepiness: a DC 13 Wisdom saving throw.', prize: 'a blessed candle', gp: 1 }
        ],
        food: ['Nothing until dusk, then plain bread', 'Lentil broth', 'Water from the temple well'],
        custom: ['No trade is allowed, and the shops are shuttered.', 'Weapons are left at the door of every home.', 'Anyone may ask forgiveness today, and it\'s a sin to refuse.'],
        trouble: ['A thief takes advantage of the shuttered town.', 'A confession today names a murderer, and the murderer heard it.', 'One family\'s candles keep going out, and they can\'t tell why.']
    },
    masque: {
        icon: '🎭', s: ['autumn', 'winter'],
        names: ['The Masque of Faces', 'Veil Night', 'The Night of Borrowed Faces', 'The Grand Masquerade', 'Falseface'],
        happens: [
            'Everyone wears a mask, and by custom nobody may ask who is behind one until the midnight bell.',
            'The lord throws open the great hall for a masked ball, and half the town sneaks in.',
            'Folk go door to door masked, and must be given something sweet or play a trick.'
        ],
        party: [
            { t: 'Find someone in the crowd by their walk alone: a DC 15 Wisdom (Perception) check.', prize: null, gp: 0 },
            { t: 'Pass as a noble at the masked ball: a DC 14 Charisma (Deception) check, rolled again whenever someone asks you to dance.', prize: 'a night among the powerful', gp: 0 },
            { t: 'Win the prize for the best mask: a DC 13 Charisma (Performance) check, or a Dexterity check with artisan\'s tools.', prize: 'a silver mask', gp: 10 }
        ],
        food: ['Sugared almonds', 'Masked pies with a surprise inside', 'Black wine'],
        custom: ['Anything said behind a mask before midnight can\'t be held against the speaker.', 'Removing someone\'s mask by force is a crime.', 'Unmasking at midnight is done all at once, with a shout.'],
        trouble: ['Two guests wear the same mask, and only one was invited.', 'At midnight, one mask won\'t come off.', 'An assassin knows nobody will look under masks until the bell.']
    },
    founding: {
        icon: '🏰', s: ['spring', 'summer', 'autumn', 'winter'],
        names: ["Founders' Day", 'Charter Day', 'The Day of the Gates', "The Mayor's Oath", 'The First Stone'],
        happens: [
            'The town\'s charter is read aloud in the square, all four hours of it, and the mayor swears to uphold it.',
            'The town gates are shut and opened again with a ceremony, and the first one through gets a year\'s freedom from tolls.',
            'A procession re-enacts the founding, with the founder played by whoever paid the most.'
        ],
        party: [
            { t: 'Be the first through the gates: a DC 13 Dexterity (Acrobatics) check through the crush.', prize: 'a year without tolls', gp: 5 },
            { t: 'Spot the mistake in the charter as it\'s read: a DC 15 Intelligence (Investigation) check, and the mistake is worth a fortune to someone.', prize: null, gp: 0 },
            { t: 'Play a part in the founding pageant: a DC 12 Charisma (Performance) check.', prize: 'a place at the mayor\'s table', gp: 0 }
        ],
        food: ["Founder's pie, made to the old recipe", 'Bread and salt, given to every guest', 'The good wine from the town cellar'],
        custom: ['Every citizen may bring one complaint to the mayor today.', 'Debts under a gold piece are forgiven.', 'The founder\'s statue is washed by the youngest citizens.'],
        trouble: ['The founder\'s descendants want the town back, and they have papers.', 'The charter is missing from its case.', 'The founder, it turns out, was a monster, and someone has proof.']
    },
    moon: {
        icon: '🌕', s: ['spring', 'summer', 'autumn', 'winter'], moon: true,
        names: ['The Night of {moon}', "{moon}'s Watch", 'The Moon Feast', 'Silvernight', 'The Moonwatch'],
        happens: [
            'The town goes up on the roofs to watch {moon} rise full, and every wish made at the moment it clears the hills is said to come true.',
            'Lanterns are put out across town, and people walk by moonlight alone to the old stone circle.',
            'Lovers exchange silver rings under {moon}, and the old folk read fortunes in its face.'
        ],
        party: [
            { t: 'Read the omens in {moon}\'s face with a DC 14 Intelligence (Arcana) check. A success tells you something true about the next week.', prize: null, gp: 0 },
            { t: 'Walk to the stone circle with no lantern: a DC 13 Wisdom (Survival) check, and something walks with you.', prize: 'a moonstone left on the altar', gp: 15 },
            { t: 'Win the moonlit boat race on the lake: a DC 13 Strength (Athletics) check.', prize: 'a silver ring', gp: 5 }
        ],
        food: ['Pale cakes dusted with sugar', 'White wine chilled in the stream', 'Moon-bread, round and flat'],
        custom: ['Nobody may light a fire until {moon} sets.', 'Children born tonight are named for the moon.', 'It\'s bad luck to look at {moon} through glass.'],
        trouble: ['{moon} rises the wrong color.', 'Someone in town changes when the moon comes up.', 'The stone circle had a visitor before the town got there.']
    },
    hunt: {
        icon: '🦌', s: ['autumn', 'winter'],
        names: ['The Great Hunt', 'Stag Night', 'The Boar Feast', "The Hunter's Moon", 'Horns and Hounds'],
        happens: [
            'The lord rides out with every hound in the county, and the town follows on foot to the feast in the woods.',
            'A white stag is said to appear in the woods tonight, and whoever sees it will have a year of luck.',
            'The boar is carried in on a pole, roasted whole in the square, and the hunter who killed it gets the head.'
        ],
        party: [
            { t: 'Join the hunt and track the quarry: a DC 14 Wisdom (Survival) check, and a ranged attack against AC 13 to bring it down.', prize: 'the head of the boar, a hero\'s seat at the feast', gp: 10 },
            { t: 'Find the white stag with a DC 16 Wisdom (Perception) check. Shooting it is a terrible idea.', prize: 'a year of luck, or a curse', gp: 0 },
            { t: 'Keep the lord\'s hounds in hand: a DC 13 Wisdom (Animal Handling) check.', prize: 'the huntsman\'s favor', gp: 2 }
        ],
        food: ['Roast boar with apple in its mouth', 'Venison stew', 'Hot mulled ale from the hunters\' flasks'],
        custom: ['Poaching on this day is pardoned, but only this day.', 'The first blood of the hunt is daubed on the youngest hunter.', 'Nobody may eat until the lord carves.'],
        trouble: ['The quarry is something else wearing a boar.', 'A hunter is killed, and it wasn\'t an accident.', 'The white stag is real, and someone shot it.']
    },
    gifts: {
        icon: '🎁', s: ['winter'],
        names: ['Gift Night', 'The Long Table', 'Hearthfast', 'The Giving', 'Candlemass Eve'],
        happens: [
            'Everyone gives a small gift to every neighbor, and the poorest families are given the most.',
            'The whole town sits at one long table in the hall, and nobody goes hungry on this night.',
            'Children leave their shoes by the hearth and find them filled with nuts and copper by morning.'
        ],
        party: [
            { t: 'Find a gift for a stranger that actually suits them: a DC 13 Wisdom (Insight) check.', prize: 'a gift in return', gp: 1 },
            { t: 'Tell the best story at the long table: a DC 14 Charisma (Performance) check.', prize: 'the goose', gp: 2 },
            { t: 'Make sure the poorest family on the street gets a feast: buy it (5 gp) or win it at dice (DC 13 Charisma check with a gaming set).', prize: 'a blessing that may matter later', gp: 0 }
        ],
        food: ['Plum pudding set alight', 'Roast goose', 'Spiced gingerbread and hot milk'],
        custom: ['A stranger at the door must be let in and fed.', 'Gifts are given unwrapped, so nobody can hide a cheap one.', 'Old quarrels are set aside for one night.'],
        trouble: ['A stranger at the door, let in by custom, is something hungry.', 'The town\'s collection for the poor goes missing.', 'Every child in town gets the same strange wooden toy, and nobody gave it.']
    },
    beasts: {
        icon: '🐐', s: ['spring', 'summer'],
        names: ['The Goat Race', 'The Blessing of the Beasts', 'The Cat Parade', 'The Ox Roast', 'Drovers\' Day'],
        happens: [
            'Every animal in town is brought to the temple steps to be blessed: cows, cats, and one man\'s pet rat.',
            'The great goat race is run through the narrow streets, and the goats know the course better than the riders.',
            'Drovers bring the herds in from the hills, and the town counts every head by torchlight.'
        ],
        party: [
            { t: 'Ride in the goat race: a DC 14 Wisdom (Animal Handling) check to stay on, and another to steer.', prize: 'the golden horns', gp: 10 },
            { t: 'Win best in show with an animal companion or mount: a DC 13 Charisma (Performance) check.', prize: 'a ribbon and a sack of oats', gp: 1 },
            { t: 'Help count the herd and notice the brand that\'s been altered: a DC 14 Intelligence (Investigation) check.', prize: 'the drovers\' reward', gp: 8 }
        ],
        food: ['Goat\'s cheese pie', 'Ox roasted on a spit', 'Milk punch'],
        custom: ['Animals may not be worked today.', 'Whoever comes last in the goat race must carry the goat home.', 'A hair from each animal is burned in the temple for luck.'],
        trouble: ['One of the animals brought for blessing isn\'t an animal.', 'The goats get loose in the market.', 'A rustler is counting the herd too, for different reasons.']
    },
    ice: {
        icon: '⛸️', s: ['winter'], climates: ['temperate', 'cold'],
        names: ['The Frost Fair', 'The Ice Market', 'Skating Day', 'The Frozen Mile'],
        happens: [
            'The river freezes solid, and a whole fair is set up on the ice: stalls, a printing press, and an ox roasting on a fire.',
            'Everyone skates to the next village and back, and the winner of the race is carried home on shoulders.',
            'An ice palace is carved on the lake and lit from inside with lanterns.'
        ],
        party: [
            { t: 'Win the skating race: a DC 13 Dexterity (Acrobatics) check each leg, three legs.', prize: 'a pair of silver skates', gp: 10 },
            { t: 'Hear the ice crack under a stall before it goes: a DC 14 Wisdom (Perception) check.', prize: 'the stall owner\'s life, and gratitude', gp: 0 },
            { t: 'Carve something worthy in the ice: a DC 13 Dexterity check with mason\'s or woodcarver\'s tools.', prize: 'a place in the ice palace', gp: 2 }
        ],
        food: ['Hot gingerbread from the ice-stalls', 'Ox roasted on the ice', 'Brandy-warmed milk'],
        custom: ['Whatever is bought on the ice is tax-free.', 'Names printed on the ice press are good luck all year.', 'The first to fall through the ice is said to marry within the year.'],
        trouble: ['The ice is thinner than the stallholders think.', 'Something under the ice follows the skaters.', 'The thaw comes overnight, with the fair still on the river.']
    },
    rain: {
        icon: '🌧️', s: ['summer', 'spring', 'winter'], climates: ['arid', 'tropical'],
        names: ['The Calling of the Rains', 'Firstrain', 'The Feast of Clouds', 'The Wet Dance'],
        happens: [
            'The whole town dances in the square at noon, drumming to call the rain, and stops only when it comes.',
            'Every jar in town is set out in the street to catch the first rain, which is blessed and kept for a year.',
            'Children throw water on every adult they meet, and the adults pretend to be outraged.'
        ],
        party: [
            { t: 'Drum or dance until the rain comes: a DC 13 Constitution check each hour, and it takes 1d6 hours.', prize: 'a jar of first rain', gp: 1 },
            { t: 'Read the sky and say when the rain will arrive: a DC 14 Wisdom (Survival) check.', prize: 'a rainmaker\'s fee', gp: 10 },
            { t: 'Keep a jar of first rain safe from thieves through the night: a DC 13 Wisdom (Perception) check.', prize: 'the elders\' thanks', gp: 0 }
        ],
        food: ['Flatbread with dates', 'Cold mint tea', 'Spiced lamb eaten in the rain'],
        custom: ['Nobody may carry an umbrella or seek cover today.', 'Water may not be sold, only given.', 'The first rain is touched to every newborn\'s forehead.'],
        trouble: ['The rain doesn\'t come.', 'The rain that comes is red.', 'A water seller has been hoarding, and the dancers find out.']
    }
};

// Who keeps the festival.
const CAL_KEEPERS = ['the whole town', 'the farmers', 'the temple', 'the guilds', 'the children', 'the old families', 'the young folk', 'the market traders', 'the lord\'s household', 'the poor quarter'];

// ── Helpers ──────────────────────────────────────────────
function calPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function calWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function calShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function calOrdinal(n) {
    const t = n % 100;
    if (t >= 11 && t <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

function calCap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// One of the newer lines in place of cur, by its share of the whole list (always two draws).
function calSwap(cur, old, more) {
    const newer = calPick(more);
    return rand() < more.length / (old.length + more.length) ? newer : cur;
}

function calFill(text, cal) {
    const moon = cal.moons[0] ? cal.moons[0].name : 'the moon';
    return text.replace(/\{moon\}/g, moon);
}

// ── Building blocks ──────────────────────────────────────
function calSeasons(months, start) {
    const off = CAL_STARTS[start].off;
    const out = [];
    for (let i = 0; i < months; i++) {
        const p = (((i + 0.5) / months) * 4 + off) % 4;
        out.push(CAL_SEASON_ORDER[Math.floor(p)]);
    }
    return out;
}

function calRoyalName() {
    const n = calPick(CAL_ROYAL.first) + calPick(CAL_ROYAL.end);
    return calWeighted(CAL_ROYAL.patterns).replace('{n}', n).replace('{t}', calPick(CAL_ROYAL.title));
}

function calElvenName(short) {
    if (short) return calPick(CAL_ELVEN.weekOnset) + calPick(CAL_ELVEN.weekEnd);
    return calPick(CAL_ELVEN.onset) + calPick(CAL_ELVEN.mid) + calPick(CAL_ELVEN.end);
}

// No repeated stems, no awkward letter runs.
function calNameOk(name, used) {
    if (used.has(name.toLowerCase())) return false;
    if (/([a-z])\1\1/i.test(name) || /[aeiou]{3}/i.test(name)) return false;
    return name.length <= 14;
}

function calMonthNames(style, seasons) {
    const st = CAL_STYLES[style];
    const used = new Set(), usedPre = new Set(), usedSuf = new Set(), usedGloss = new Set();
    return seasons.map(season => {
        let name = '', gloss = null;
        for (let tries = 0; tries < 60; tries++) {
            if (st.months === 'royal') name = calRoyalName();
            else if (st.months === 'elven') name = calElvenName(false);
            else if (Array.isArray(st.months)) name = calPick(st.months);
            else if (st.months.suf) {
                const pre = calPick(st.months[season].pre), suf = calPick(st.months.suf);
                if (tries < 40 && (usedPre.has(pre) || usedSuf.has(suf))) continue;
                name = pre + suf;
                if (calNameOk(name, used)) { usedPre.add(pre); usedSuf.add(suf); }
            } else name = calPick(st.months[season]);
            // Royal names: the bare name must not repeat either ("King Alric" and "Alric").
            const stem = name.replace(/^(King|Queen|Saint|Good|Old|Prince|Lady) /, '').replace(/'s Month$/, '');
            if (calNameOk(name, used) && !used.has(stem.toLowerCase())) { used.add(stem.toLowerCase()); break; }
        }
        used.add(name.toLowerCase());
        if (st.months === 'elven') {
            const pool = CAL_ELVEN.gloss[season].filter(g => !usedGloss.has(g));
            gloss = calPick(pool.length ? pool : CAL_ELVEN.gloss[season]);
            usedGloss.add(gloss);
        }
        return { name, gloss };
    });
}

function calWeekdays(style, count) {
    const st = CAL_STYLES[style];
    let names;
    if (st.week === 'elven') {
        const used = new Set();
        names = [];
        for (let i = 0; i < count; i++) {
            let n = '';
            for (let tries = 0; tries < 40; tries++) {
                n = calElvenName(true);
                if (calNameOk(n, used)) break;
            }
            used.add(n.toLowerCase());
            names.push(n);
        }
    } else if (st.ordered) {
        names = st.week.slice(0, count - (st.rest ? 1 : 0));
        if (st.rest) names.push(st.rest);
    } else {
        names = calShuffle(st.week).slice(0, count - (st.rest ? 1 : 0));
        if (st.rest) names.push(st.rest);
    }
    // The day of rest and the market day.
    const rest = st.rest ? count - 1 : Math.floor(rand() * count);
    let market = Math.floor(rand() * count);
    if (market === rest) market = (market + Math.ceil(count / 2)) % count;
    return { names, rest, market };
}

function calMonthLengths(months) {
    const mode = calWeighted([['even', 5], ['varied', 4], ['lunar', 2]]);
    let lengths;
    if (mode === 'even') {
        const base = { 10: 36, 11: 33, 12: 30, 13: 28 }[months] || 30;
        lengths = Array(months).fill(base);
    } else if (mode === 'lunar') {
        lengths = Array.from({ length: months }, (_, i) => (i % 2 ? 29 : 30));
    } else {
        const base = { 10: 36, 11: 33, 12: 30, 13: 28 }[months] || 30;
        lengths = Array.from({ length: months }, () => base + calPick([-2, -1, 0, 0, 1, 1, 2]));
    }
    return { mode, lengths };
}

function calGap(months, seasons) {
    const n = calWeighted([[0, 5], [1, 3], [2, 1], [3, 1]]);
    if (!n) return null;
    // At the year's end, or between the two midsummer months.
    let after = months - 1;
    if (rand() < 0.3) {
        const mid = seasons.findIndex((s, i) => s === 'summer' && seasons[i + 1] && seasons[i + 1] !== 'summer');
        if (mid >= 0) after = mid;
    }
    return {
        days: n,
        after,
        name: calCap(calPick(n === 1 ? CAL_GAP_NAME_ONE : CAL_GAP_NAMES)),
        custom: calPick(CAL_GAP_CUSTOMS)
    };
}

function calMoon(i, takenNames) {
    let name;
    for (let tries = 0; tries < 30; tries++) {
        name = calPick(CAL_MOON_NAMES);
        if (!takenNames.includes(name)) break;
    }
    let epithet;
    for (let tries = 0; tries < 30; tries++) {
        epithet = calPick(CAL_MOON_EPITHETS);
        if (!takenNames.includes(epithet)) break;
    }
    const cycle = i === 0 ? 27 + Math.floor(rand() * 5)
        : i === 1 ? (rand() < 0.5 ? 8 + Math.floor(rand() * 13) : 40 + Math.floor(rand() * 51))
        : 100 + Math.floor(rand() * 260);
    return {
        name, epithet,
        color: calPick(CAL_MOON_COLORS),
        size: calPick(CAL_MOON_SIZES[Math.min(i, 2)]),
        cycle,
        offset: Math.floor(rand() * cycle),
        lore: calPick(CAL_MOON_LORE),
        full: calPick(CAL_MOON_FULL)
    };
}

// Phase index into MOON_PHASES (same rounding as the Travel tool's moonPhase()).
function calMoonPhase(moon, absDay) {
    const age = ((absDay + moon.offset) % moon.cycle + moon.cycle) % moon.cycle;
    return Math.floor((age / moon.cycle) * 8 + 0.5) % 8;
}

function calFestivals(cal) {
    const usedKinds = new Set(), usedNames = new Set();
    return cal.months.map((m, i) => {
        const fits = Object.entries(CAL_FESTIVALS).filter(([k, f]) =>
            f.s.includes(m.season) && !usedKinds.has(k) && (!f.climates || f.climates.includes(cal.climate)));
        // Seasonal kinds first; the any-season ones are a fallback.
        const weighted = fits.map(([k, f]) => [k, f.s.length >= 4 ? 1 : 3]);
        const kind = weighted.length ? calWeighted(weighted) : 'fair';
        usedKinds.add(kind);
        const f = CAL_FESTIVALS[kind];
        let name = calPick(f.names);
        for (let tries = 0; tries < 10 && usedNames.has(name); tries++) name = calPick(f.names);
        usedNames.add(name);
        const len = calWeighted([[1, 7], [2, 2], [3, 2], [7, kind === 'fair' ? 2 : 0]]);
        let day = 1 + Math.floor(rand() * Math.max(1, m.days - len + 1));
        return {
            kind, name, day, length: len,
            keeper: calPick(CAL_KEEPERS),
            happens: calPick(f.happens),
            party: calPick(f.party),
            food: calPick(f.food),
            custom: calPick(f.custom),
            trouble: calPick(f.trouble)
        };
    });
}

// A moon festival lands on a night when the first moon is full, if the month has one.
function calAlignMoonFestivals(cal) {
    cal.months.forEach((m, i) => {
        const fest = m.festival;
        if (!CAL_FESTIVALS[fest.kind].moon || !cal.moons.length) return;
        for (let d = 1; d <= m.days; d++) {
            if (calMoonPhase(cal.moons[0], calAbsDay(cal, cal.year, i, d)) === 4) { fest.day = d; fest.length = 1; return; }
        }
    });
}

// ── Dates ────────────────────────────────────────────────
function calYearDays(cal) {
    return cal.months.reduce((s, m) => s + m.days, 0) + (cal.gap ? cal.gap.days : 0);
}

// Days since the start of year 1 (every day, including the days outside the months).
function calAbsDay(cal, year, month, day) {
    let n = (year - 1) * calYearDays(cal);
    for (let i = 0; i < month; i++) {
        n += cal.months[i].days;
        if (cal.gap && cal.gap.after === i) n += cal.gap.days;
    }
    return n + day - 1;
}

// Days outside the months have no weekday, so the week only counts month days.
function calWeekday(cal, year, month, day) {
    const monthDays = cal.months.reduce((s, m) => s + m.days, 0);
    let n = (year - 1) * monthDays + day - 1;
    for (let i = 0; i < month; i++) n += cal.months[i].days;
    return ((n + cal.week.start) % cal.week.names.length + cal.week.names.length) % cal.week.names.length;
}

function calDateText(cal, year, month, day, withWeekday = true) {
    const wd = withWeekday ? cal.week.names[calWeekday(cal, year, month, day)] + ', ' : '';
    return `${wd}the ${calOrdinal(day)} of ${cal.months[month].name}, ${year.toLocaleString('en-US')} ${cal.era.abbr}`;
}

// Days from today until the next festival starts (today counts as 0).
function calNextFestival(cal) {
    const t = cal.today, yd = calYearDays(cal);
    const now = calAbsDay(cal, t.year, t.month, t.day);
    let best = null;
    cal.months.forEach((m, i) => {
        const f = m.festival;
        let at = calAbsDay(cal, t.year, i, f.day);
        if (at + f.length - 1 < now) at += yd;
        const wait = Math.max(0, at - now);
        if (!best || wait < best.wait) best = { month: i, wait, on: at <= now };
    });
    return best;
}

// Nights in the current year when two or more moons are full at once.
function calConjunctions(cal, max = 3) {
    if (cal.moons.length < 2) return [];
    const out = [];
    let prev = false;
    cal.months.forEach((m, i) => {
        for (let d = 1; d <= m.days; d++) {
            const abs = calAbsDay(cal, cal.year, i, d);
            const full = cal.moons.filter(mo => calMoonPhase(mo, abs) === 4);
            const on = full.length >= 2;
            if (on && !prev && out.length < max) out.push({ month: i, day: d, moons: full.map(mo => mo.name) });
            prev = on;
        }
    });
    return out;
}

// ── The roll ─────────────────────────────────────────────
// opts: { months: 'random'|10-13, week: 'random'|5-10, moons: 'random'|1-3, style: 'random'|key, climate }
function rollCalendar(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const climate = TRAVEL_CLIMATES[opts.climate] ? opts.climate : 'temperate';
    const style = CAL_STYLES[opts.style] ? opts.style : part('style', () => calPick(Object.keys(CAL_STYLES)));
    const monthCount = [10, 11, 12, 13].includes(Number(opts.months)) ? Number(opts.months)
        : part('months', () => calWeighted([[12, 9], [10, 3], [13, 4], [11, 2]]));
    const weekLen = Number(opts.week) >= 5 && Number(opts.week) <= 10 ? Number(opts.week)
        : part('week', () => calWeighted([[7, 7], [5, 2], [6, 3], [8, 2], [9, 1], [10, 3]]));
    const moonCount = [1, 2, 3].includes(Number(opts.moons)) ? Number(opts.moons)
        : part('moons', () => calWeighted([[1, 10], [2, 7], [3, 3]]));

    const start = part('start', () => calWeighted([['midwinter', 5], ['spring', 4], ['autumn', 2], ['midsummer', 1]]));
    const seasons = calSeasons(monthCount, start);
    const shape = part('length.' + monthCount, () => calMonthLengths(monthCount));
    const names = part(`names.${style}.${monthCount}.${start}`, () => calMonthNames(style, seasons));
    const nicks = part(`nick.${monthCount}.${start}`, () => {
        const used = new Set();
        return seasons.map(s => {
            const pool = CAL_NICKNAMES[s].filter(n => !used.has(n));
            const n = calPick(pool.length ? pool : CAL_NICKNAMES[s]);
            used.add(n);
            return n;
        });
    });

    const cal = {
        seed, style, climate, start,
        lengthMode: shape.mode,
        months: seasons.map((season, i) => ({
            name: names[i].name, gloss: names[i].gloss, nickname: nicks[i], season, days: shape.lengths[i]
        })),
        week: part(`weekdays.${style}.${weekLen}`, () => calWeekdays(style, weekLen)),
        // Lunar months keep step with the moon, so a lunar year has no days outside the months.
        gap: shape.mode === 'lunar' ? null : part(`gap.${monthCount}.${start}`, () => calGap(monthCount, seasons)),
        moons: [],
        era: part('era', () => {
            const ev = calPick(CAL_ERA_EVENTS);
            return {
                name: calWeighted(CAL_ERA_FORMS).replace('{e}', ev.e),
                event: ev.e, abbr: ev.a,
                note: calPick(CAL_ERA_NOTES)
            };
        })
    };
    cal.week.start = part('weekstart', () => Math.floor(rand() * 10));
    for (let i = 0; i < moonCount; i++) {
        const taken = cal.moons.flatMap(m => [m.name, m.epithet]);
        cal.moons.push(part('moon.' + i, () => calMoon(i, taken)));
    }
    // The second pass (E6): newer lines swap in by their share, and no two moons share one.
    cal.moons.forEach((mo, i) => part(`moon.${i}.more`, () => {
        const prev = cal.moons.slice(0, i);
        [['lore', CAL_MOON_LORE, CAL_MOON_LORE_MORE], ['full', CAL_MOON_FULL, CAL_MOON_FULL_MORE]].forEach(([k, old, more]) => {
            mo[k] = calSwap(mo[k], old, more);
            const free = old.concat(more).filter(l => !prev.some(p => p[k] === l));
            if (prev.some(p => p[k] === mo[k])) mo[k] = calPick(free);
        });
    }));
    part('era.more', () => { cal.era.note = calSwap(cal.era.note, CAL_ERA_NOTES, CAL_ERA_NOTES_MORE); });
    part('year', () => {
        cal.year = 300 + Math.floor(rand() * 2100);
        cal.yearName = `the Year of the ${calPick(CAL_YEAR_ADJ)} ${calPick(CAL_YEAR_NOUN)}`;
    });
    cal.today = part(`today.${monthCount}`, () => {
        const month = Math.floor(rand() * monthCount);
        return { year: cal.year, month, day: 1 + Math.floor(rand() * cal.months[month].days) };
    });
    const fests = part(`fest.${monthCount}.${start}.${climate}`, () => calFestivals(cal));
    cal.months.forEach((m, i) => {
        m.festival = fests[i];
        m.festival.day = Math.min(m.festival.day, Math.max(1, m.days - m.festival.length + 1));
    });
    // Lunar months (29 and 30 days) follow the first moon: each starts near its new moon this year.
    if (cal.lengthMode === 'lunar' && cal.moons.length) {
        const mo = cal.moons[0];
        mo.cycle = 29.5;
        mo.offset = (MOON_MONTH_LUNAR - (calAbsDay(cal, cal.year, 0, 1) % 29.5)) % 29.5;
    }
    // The third pass (R9): a newer era event, gap custom, and festival names, each under its own seed.
    part('era.r9', () => {
        const ev = calPick(CAL_ERA_EVENTS_MORE);
        if (rand() < CAL_ERA_EVENTS_MORE.length / (CAL_ERA_EVENTS.length + CAL_ERA_EVENTS_MORE.length)) {
            cal.era.name = cal.era.name.replace(cal.era.event, ev.e);
            cal.era.event = ev.e;
            cal.era.abbr = ev.a;
        }
    });
    if (cal.gap) part(`gap.more.${monthCount}.${start}`, () => { cal.gap.custom = calSwap(cal.gap.custom, CAL_GAP_CUSTOMS, CAL_GAP_CUSTOMS_MORE); });
    part(`fest.more.${monthCount}.${start}.${climate}`, () => {
        // No two festivals in a year share a name.
        const names = new Set(cal.months.map(m => m.festival.name));
        cal.months.forEach(m => {
            const f = m.festival;
            const name = calSwap(f.name, CAL_FESTIVALS[f.kind].names, CAL_FEST_NAMES_MORE[f.kind] || []);
            if (name !== f.name && !names.has(name)) { names.delete(f.name); names.add(name); f.name = name; }
        });
    });
    calAlignMoonFestivals(cal);
    return cal;
}

// ── Text ─────────────────────────────────────────────────
function calSeasonLabel(cal, season) {
    const local = CAL_SEASON_NAMES[cal.climate][season];
    return TRAVEL_SEASONS[season].label + (local ? ` (${local})` : '');
}

// The seasons in year order: [{ season, from, to, note }] (from/to are month indexes).
function calSeasonSpans(cal) {
    const spans = [];
    cal.months.forEach((m, i) => {
        const last = spans[spans.length - 1];
        if (last && last.season === m.season) last.to = i;
        else spans.push({ season: m.season, from: i, to: i });
    });
    // A season split by the new year (winter at both ends) is shown once, wrapping round.
    if (spans.length > 1 && spans[0].season === spans[spans.length - 1].season) {
        const tail = spans.pop();
        spans[0].from = tail.from;
    }
    return spans.map(s => ({
        ...s,
        note: withSeed(deriveSeed(cal.seed, 'snote.' + s.season + '.' + cal.climate), () => calPick(CAL_SEASON_NOTES[cal.climate][s.season]))
    }));
}

function calMonthLabel(m) {
    return m.gloss ? `${m.name} (${m.gloss})` : m.name;
}

function calFestivalWhen(cal, i) {
    const m = cal.months[i], f = m.festival;
    const first = `the ${calOrdinal(f.day)} of ${m.name}`;
    return f.length > 1 ? `${first}, for ${f.length} days` : first;
}

function calPrizeText(p) {
    if (!p.prize) return '';
    return p.gp ? `${p.prize} (${formatCoins(p.gp)})` : p.prize;
}

function calMoonLine(cal, moon) {
    const every = moon.cycle === 29.5 ? 'full every 29 or 30 days; each month begins at its new moon' : `full every ${moon.cycle} days`;
    return `${moon.name}, ${moon.epithet}: ${moon.color}, ${moon.size}; ${every}.`;
}

function calFestivalLines(cal, i) {
    const m = cal.months[i], f = m.festival, k = CAL_FESTIVALS[f.kind];
    const fill = s => calFill(s, cal).replace(/\{month\}/g, m.name);
    const lines = [
        ['When', `${calCap(calFestivalWhen(cal, i))}, kept by ${f.keeper}`],
        ['What happens', fill(f.happens)],
        ['For the party', fill(f.party.t) + (f.party.prize ? ` Prize: ${calPrizeText(f.party)}.` : '')],
        ['On the table', f.food],
        ['Custom', fill(f.custom)],
        ['What could go wrong', fill(f.trouble)]
    ];
    return { icon: k.icon, name: fill(f.name), lines };
}

function calTodayLines(cal) {
    const t = cal.today, m = cal.months[t.month];
    const abs = calAbsDay(cal, t.year, t.month, t.day);
    const out = [`Today: ${calDateText(cal, t.year, t.month, t.day)}, ${calSeasonLabel(cal, m.season).toLowerCase()}.`];
    const moons = cal.moons.map(mo => {
        const ph = MOON_PHASES[calMoonPhase(mo, abs)];
        return `${mo.name} ${ph.icon} ${ph.label.toLowerCase()}`;
    });
    if (moons.length) out.push(`Tonight: ${moons.join(', ')}.`);
    const next = calNextFestival(cal);
    if (next) {
        const f = calFestivalLines(cal, next.month);
        out.push(next.on ? `${f.name} is on today.` : `Next festival: ${f.name}, in ${next.wait} day${next.wait === 1 ? '' : 's'}.`);
    }
    return out;
}

function calendarText(cal) {
    const st = CAL_STYLES[cal.style];
    const out = [];
    out.push(`${calCap(cal.era.name)} (${cal.era.abbr})`);
    out.push(`Year ${cal.year.toLocaleString('en-US')} ${cal.era.abbr}, ${cal.yearName}. ${cal.era.note}`);
    out.push(...calTodayLines(cal));
    out.push('');
    out.push(`A year of ${calYearDays(cal)} days: ${cal.months.length} months, a ${cal.week.names.length}-day week, ${cal.moons.length} moon${cal.moons.length === 1 ? '' : 's'}. ${CAL_STARTS[cal.start].text} Naming: ${st.label}. ${st.about}`);
    out.push(`The week: ${cal.week.names.join(', ')}. ${cal.week.names[cal.week.rest]} is the day of rest; ${cal.week.names[cal.week.market]} is market day.`);
    if (cal.gap) out.push(`${calCap(cal.gap.name)}: ${cal.gap.days} day${cal.gap.days === 1 ? '' : 's'} after ${cal.months[cal.gap.after].name} that belong${cal.gap.days === 1 ? 's' : ''} to no month and no week. ${cal.gap.custom}`);
    out.push('');
    out.push('Seasons:');
    calSeasonSpans(cal).forEach(s => {
        const range = s.from === s.to ? cal.months[s.from].name : `${cal.months[s.from].name} to ${cal.months[s.to].name}`;
        out.push(`- ${calSeasonLabel(cal, s.season)}: ${range}. ${s.note}`);
    });
    out.push('');
    out.push(cal.moons.length === 1 ? 'The moon:' : 'Moons:');
    cal.moons.forEach(mo => out.push(`- ${calMoonLine(cal, mo)} ${mo.lore} When it's full: ${mo.full}`));
    const conj = calConjunctions(cal);
    if (conj.length) out.push(`- Full together this year: ${conj.map(c => `the ${calOrdinal(c.day)} of ${cal.months[c.month].name} (${c.moons.join(' and ')})`).join('; ')}.`);
    out.push('');
    out.push('Months:');
    cal.months.forEach((m, i) => {
        const f = calFestivalLines(cal, i);
        out.push(`${i + 1}. ${calMonthLabel(m)}, "${m.nickname}": ${m.days} days, ${TRAVEL_SEASONS[m.season].label.toLowerCase()}. ${f.name} on the ${calOrdinal(m.festival.day)}.`);
    });
    out.push('');
    out.push('Festivals:');
    cal.months.forEach((m, i) => {
        const f = calFestivalLines(cal, i);
        out.push(`${f.icon} ${f.name}`);
        f.lines.forEach(([k, v]) => out.push(`  ${k}: ${v}`));
    });
    return out.join('\n');
}
