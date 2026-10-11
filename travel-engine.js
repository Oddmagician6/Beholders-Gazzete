/* ============================================
   WEATHER + TRAVEL DAY ENGINE (F22)
   Used by the DM Toolbox "Travel" tab.
   - rollWeather(climate, season, prev): one day's weather. prev (yesterday's
     weather) makes the temperature and rain tend to carry over.
   - rollRoadEvent(terrain, weather, used): one event (or a quiet day) for the
     day, skipping titles in `used` while others are left.
   - travelDistance(opts, weather): the day's miles from the SRD 5.1 travel pace
     rules (pace, hours, difficult terrain, forced march, a gallop).
   - rollJourney(seed, opts, days): days 1..n. Day k's weather and event each
     come from their own child seed, so changing the pace or hours never changes
     the weather, and a link with a seed and a day rebuilds the whole trip.
   Rules text is SRD 5.1 (travel pace, difficult terrain, food and water,
   vision and light). Anything else is marked as a table ruling.
   Every roll calls rand() from rng.js.
   ============================================ */

const TRAVEL_CLIMATES = {
    temperate: { label: 'Temperate', icon: '🌳' },
    cold:      { label: 'Cold (northern)', icon: '🏔️' },
    arid:      { label: 'Arid (desert)', icon: '🏜️' },
    tropical:  { label: 'Tropical', icon: '🌴' }
};

const TRAVEL_SEASONS = {
    spring: { label: 'Spring', icon: '🌱' },
    summer: { label: 'Summer', icon: '☀️' },
    autumn: { label: 'Autumn', icon: '🍂' },
    winter: { label: 'Winter', icon: '❄️' }
};

// difficult: the SRD's examples (dense forest, deep swamp, steep mountains) halve the day.
const TRAVEL_TERRAIN = {
    road:      { label: 'Road or trail', icon: '🛤️' },
    plains:    { label: 'Open country', icon: '🌾' },
    forest:    { label: 'Light forest', icon: '🌲' },
    hills:     { label: 'Hills', icon: '⛰️' },
    mountains: { label: 'Mountains', icon: '🏔️', difficult: true },
    swamp:     { label: 'Swamp', icon: '🐸', difficult: true },
    jungle:    { label: 'Jungle or dense forest', icon: '🌿', difficult: true },
    desert:    { label: 'Desert', icon: '🏜️' },
    tundra:    { label: 'Tundra or snowfield', icon: '🧊' }
};

// SRD 5.1 Travel Pace table: miles per hour and per (8-hour) day.
const TRAVEL_PACES = {
    slow:   { label: 'Slow', mph: 2, day: 18, note: 'Slow pace: the party can move stealthily.' },
    normal: { label: 'Normal', mph: 3, day: 24, note: '' },
    fast:   { label: 'Fast', mph: 4, day: 30, note: 'Fast pace: −5 to passive Wisdom (Perception) scores.' }
};

// ── Weather tables ───────────────────────────────────────
// Temperature bands: index 0..7, each with the range the day's high is drawn from (°F).
const TEMP_BANDS = [
    { label: 'Bitter cold', lo: -25, hi: -1 },
    { label: 'Freezing', lo: 0, hi: 32 },
    { label: 'Cold', lo: 33, hi: 45 },
    { label: 'Cool', lo: 46, hi: 60 },
    { label: 'Mild', lo: 61, hi: 75 },
    { label: 'Warm', lo: 76, hi: 90 },
    { label: 'Hot', lo: 91, hi: 105 },
    { label: 'Scorching', lo: 106, hi: 122 }
];

// Per climate and season: temp = weights over TEMP_BANDS,
// precip = weights over [none, light, heavy, storm], wind = [calm, breeze, strong, gale].
const WEATHER_ODDS = {
    temperate: {
        spring: { temp: [0, 1, 3, 5, 3, 1, 0, 0], precip: [5, 4, 2, 1] },
        summer: { temp: [0, 0, 0, 1, 4, 5, 2, 0], precip: [7, 2, 1, 1] },
        autumn: { temp: [0, 1, 4, 5, 2, 1, 0, 0], precip: [5, 4, 2, 1] },
        winter: { temp: [1, 5, 4, 2, 0, 0, 0, 0], precip: [5, 3, 2, 1] },
        wind: [3, 5, 2, 0.5], fog: 0.3, swing: [10, 22]
    },
    cold: {
        spring: { temp: [3, 5, 3, 1, 0, 0, 0, 0], precip: [6, 3, 1, 1] },
        summer: { temp: [0, 1, 3, 5, 3, 1, 0, 0], precip: [6, 3, 1, 0.5] },
        autumn: { temp: [2, 5, 4, 1, 0, 0, 0, 0], precip: [5, 3, 2, 1] },
        winter: { temp: [6, 4, 1, 0, 0, 0, 0, 0], precip: [5, 3, 2, 2] },
        wind: [2, 4, 3, 1], fog: 0.25, swing: [10, 20]
    },
    arid: {
        spring: { temp: [0, 0, 1, 2, 4, 4, 2, 0], precip: [16, 2, 0.5, 0.5] },
        summer: { temp: [0, 0, 0, 0, 1, 3, 5, 3], precip: [18, 1, 0.5, 1] },
        autumn: { temp: [0, 0, 1, 3, 4, 3, 1, 0], precip: [16, 2, 0.5, 0.5] },
        winter: { temp: [0, 1, 2, 4, 3, 1, 0, 0], precip: [12, 3, 1, 0.5] },
        wind: [3, 4, 3, 1], fog: 0, swing: [25, 40]
    },
    tropical: {
        spring: { temp: [0, 0, 0, 0, 2, 6, 3, 0], precip: [4, 4, 2, 1] },
        summer: { temp: [0, 0, 0, 0, 1, 5, 4, 1], precip: [2, 4, 4, 2] },
        autumn: { temp: [0, 0, 0, 0, 2, 6, 2, 0], precip: [4, 4, 2, 1] },
        winter: { temp: [0, 0, 0, 1, 4, 5, 1, 0], precip: [8, 2, 1, 0.5] },
        wind: [4, 5, 2, 0.5], fog: 0.35, swing: [8, 15]
    }
};

const WEATHER_KINDS = {
    clear:    { icon: '☀️', label: 'Clear skies' },
    partly:   { icon: '🌤️', label: 'Scattered clouds' },
    overcast: { icon: '☁️', label: 'Overcast' },
    fog:      { icon: '🌫️', label: 'Thick fog' },
    gale:     { icon: '💨', label: 'Howling gale' },
    dust:     { icon: '🌪️', label: 'Dust storm' },
    drizzle:  { icon: '🌦️', label: 'Light rain' },
    rain:     { icon: '🌧️', label: 'Heavy rain' },
    thunder:  { icon: '⛈️', label: 'Thunderstorm' },
    flurries: { icon: '🌨️', label: 'Snow flurries' },
    snow:     { icon: '🌨️', label: 'Heavy snow' },
    blizzard: { icon: '❄️', label: 'Blizzard' },
    sleet:    { icon: '🌧️', label: 'Sleet' },
    icestorm: { icon: '🧊', label: 'Ice storm' }
};

const WEATHER_FLAVOR = {
    clear: ['Blue sky from edge to edge. The bard calls it an omen. The bard calls everything an omen.',
        'A fine day for walking, which the party will do a great deal of.',
        'Not a cloud in sight. Somewhere, a wizard takes credit.'],
    partly: ['Clouds drift past in shapes the ranger insists are animals.',
        'Sun and shade by turns, like a lord deciding whether to pay you.',
        'A pleasant, undecided sort of sky.'],
    overcast: ['A low grey lid over the world. Nobody casts a shadow, which unsettles the warlock.',
        'Grey, flat, and still. The kind of sky that keeps its opinions to itself.',
        'Overcast all day. The light never quite commits.'],
    fog: ['Fog thick enough to lose a horse in. Someone does, briefly.',
        'The road vanishes ten paces ahead and reappears only when you reach it.',
        'Sound carries strangely. Footsteps that aren\'t yours keep pace for a while.'],
    gale: ['The wind takes a hat, a map, and most of the conversation.',
        'Trees bend, cloaks fly, and the halfling is tied to the cart for safety.',
        'A wind with somewhere to be, and it wants the party out of the way.'],
    dust: ['A brown wall rolls in from the horizon and swallows the sun.',
        'Sand in the boots, the rations, the teeth, and the spellbook.',
        'The dust storm hisses like a crowd of snakes with opinions.'],
    drizzle: ['The kind of drizzle that gets into boots and opinions.',
        'A soft, endless rain. Not heavy enough to stop for, never light enough to ignore.',
        'Light rain on and off. Mostly on.'],
    rain: ['Rain comes down in ropes. The road turns into a long, brown stew.',
        'A proper downpour. The cleric declares it a bath and is not thanked.',
        'Water everywhere: overhead, underfoot, and in every pack that was "waterproof".'],
    thunder: ['Thunder rolls over the hills, and the wizard\'s hair stands up a little.',
        'Lightning forks across the sky. Everyone with a metal helmet walks a little apart from everyone else.',
        'A summer storm breaks hard and fast, then sulks off by evening.'],
    flurries: ['Light snow drifts down, pretty for the first hour.',
        'Flakes on the wind, never settling, always in the eyes.',
        'A dusting of snow that shows every track, including some that aren\'t the party\'s.'],
    snow: ['Snow falls thick and quiet. By noon the road is a rumor.',
        'Knee-deep by midday. The dwarf is fine. The dwarf is always fine.',
        'Heavy snow muffles everything, including the complaining.'],
    blizzard: ['White in every direction. The rope between travelers is the only map that matters.',
        'The blizzard screams all day. Nobody can hear the bard, the one mercy.',
        'Snow sideways, wind like knives, and somewhere out there, the road.'],
    sleet: ['Half rain, half ice, all misery.',
        'Sleet ticks on armor like a thousand tiny, impatient fingers.',
        'Grey slush underfoot and grey slush on the way down.'],
    icestorm: ['Freezing rain glazes every branch, stone, and traveler.',
        'Trees crack under the ice like snapping bows. The road is a skating rink.',
        'Everything shines and everything is slippery. Even the mules look worried.']
};

const WIND_LABELS = ['still air', 'a light breeze', 'a strong wind', 'a howling gale'];
const WIND_FROM = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

// Kinds that turn the route into difficult terrain for the day (a table ruling).
const SLOW_KINDS = ['snow', 'blizzard', 'icestorm', 'dust'];
const HEAVY_KINDS = { rain: 'rain', thunder: 'rain', snow: 'snow', blizzard: 'snow', icestorm: 'sleet', dust: 'dust' };

// ── Road events ──────────────────────────────────────────
// kind: travelers, obstacle, discovery, omen, camp. terr = only on these terrains;
// w = only when the weather has one of these tags (wet, snow, cold, hot, clear, storm).
const ROAD_EVENT_KINDS = {
    travelers: { icon: '🧳', label: 'Travelers' },
    obstacle:  { icon: '🚧', label: 'Obstacle' },
    discovery: { icon: '🔎', label: 'Discovery' },
    omen:      { icon: '🌒', label: 'Omen' },
    camp:      { icon: '🔥', label: 'At camp' },
    quiet:     { icon: '🍃', label: 'A quiet day' }
};

const ROAD_EVENTS = [
    // Travelers
    { k: 'travelers', t: 'Pilgrims, lost', d: 'A dozen pilgrims are walking to a shrine in the wrong direction, and they are very sure about it.', hook: 'Their relic is a fake, and someone has been following them to learn where the real one is kept.' },
    { k: 'travelers', t: 'A peddler with a cart', d: 'A peddler offers trinkets, gossip, and a Gazette only three days out of date. One item in the cart is genuinely useful and priced at double.' },
    { k: 'travelers', t: 'The toll that isn\'t', terr: ['road'], d: 'Three men in a lord\'s colors collect a road toll of 2 sp a head. Their writ is real. The lord on it died last winter.' },
    { k: 'travelers', t: 'A wedding procession', terr: ['road', 'plains', 'hills'], d: 'A wedding party fills the road and insists the travelers join the feast. Refusing is rude; accepting costs half a day.' },
    { k: 'travelers', t: 'Courier with a thrown shoe', terr: ['road', 'plains', 'forest', 'hills'], d: 'A courier\'s horse has thrown a shoe. She begs the party to carry a sealed letter to the next town and offers 10 gp.', hook: 'The seal belongs to someone everyone believes is dead.' },
    { k: 'travelers', t: 'Refugees on the road', d: 'A family pulling a handcart is fleeing a village two days ahead. They say the mayor was replaced by someone wearing his face.' },
    { k: 'travelers', t: 'A merchant caravan', terr: ['road', 'plains', 'desert'], d: 'The caravan master is short on guards and offers 5 gp a day each to see the wagons to the next town.' },
    { k: 'travelers', t: 'A noble\'s hunt', terr: ['forest', 'plains', 'hills'], d: 'Horns, hounds, and a hunting party that mistakes the travelers for the quarry for a few tense seconds. The noble apologizes with wine.' },
    { k: 'travelers', t: 'Rival adventurers', d: 'A party with better clothes and worse manners is headed to the same place. They have a map. It is wrong, but they don\'t know that.' },
    { k: 'travelers', t: 'Dwarven road crew', terr: ['road', 'mountains', 'hills'], d: 'A dwarven crew is repaving the road and arguing about the guild contract. Passing through costs a strong opinion on the matter.' },
    { k: 'travelers', t: 'A child selling directions', d: 'A child sells directions for a copper. The directions are excellent. The price, it turns out, is also a story.' },
    { k: 'travelers', t: 'The polite bridge troll', terr: ['road', 'forest', 'hills'], d: 'A troll in a waistcoat collects the bridge toll from a ledger. Haggling is allowed and, frankly, encouraged.' },
    { k: 'travelers', t: 'Militia checkpoint', terr: ['road', 'plains'], d: 'Local militia stop the party and compare faces against a wanted poster. The likeness to one of them is uncomfortable.' },
    { k: 'travelers', t: 'A herd on the move', terr: ['plains', 'tundra', 'hills'], d: 'A herd of elk takes an hour to cross the trail, and the bull has taken a dislike to the cart.' },

    // Obstacles
    { k: 'obstacle', t: 'Washed-out bridge', w: ['wet', 'storm'], terr: ['road', 'forest', 'hills', 'plains'], d: 'The bridge is gone. The nearest ford is a mile upstream, and the river is running high.' },
    { k: 'obstacle', t: 'Fallen tree', terr: ['forest', 'jungle', 'road'], d: 'A great tree lies across the trail. Clearing it takes an hour or one very good Strength check.' },
    { k: 'obstacle', t: 'Fresh rockslide', terr: ['hills', 'mountains'], d: 'Rubble blocks the path, and some of it looks like it was dug out from below.' },
    { k: 'obstacle', t: 'Mud to the axles', w: ['wet'], terr: ['road', 'plains', 'swamp', 'forest'], d: 'The road is a bog. A cart or mount gets stuck; a DC 12 Strength (Athletics) check frees it, or the party loses an hour.' },
    { k: 'obstacle', t: 'Snowbound pass', w: ['snow', 'cold'], terr: ['mountains', 'tundra', 'hills'], d: 'Drifts have closed the pass. Digging through takes two hours; the long way around takes the rest of the day.' },
    { k: 'obstacle', t: 'The well is dry', w: ['hot', 'clear'], terr: ['desert', 'plains', 'road'], d: 'The well on the map is dry. A note at the bottom reads: "Sorry. —Management."' },
    { k: 'obstacle', t: 'Flooded road', w: ['wet', 'storm'], terr: ['road', 'plains', 'swamp'], d: 'Brown water covers the road for half a mile. Wade it and hope, or take a detour that costs half the day.' },
    { k: 'obstacle', t: 'Firm-looking ground', terr: ['swamp', 'desert'], d: 'The ground that looked firm isn\'t. Whoever leads sinks to the knees and needs pulling out.' },
    { k: 'obstacle', t: 'Thin ice', w: ['cold', 'snow'], terr: ['tundra', 'swamp', 'plains'], d: 'A frozen lake would save four miles. The ice creaks with every step, and something dark moves underneath.' },
    { k: 'obstacle', t: 'Leech pools', terr: ['swamp', 'jungle'], d: 'Every wade ends with leeches. Nobody is hurt, but everyone loses a little blood and a lot of dignity.' },
    { k: 'obstacle', t: 'The turned signpost', terr: ['road'], d: 'Someone has turned the signpost. The party would have gone the wrong way. The culprit\'s footprints are very small.' },

    // Discoveries
    { k: 'discovery', t: 'Abandoned camp', d: 'The fire is still warm. Bedrolls lie where they were left, along with one boot. The tracks leading away are walking, not running.' },
    { k: 'discovery', t: 'Roadside shrine', d: 'A mossy shrine to a minor god of travelers. Leaving a coin feels like the right thing to do. Taking one feels like the wrong one.' },
    { k: 'discovery', t: 'Old battlefield', terr: ['plains', 'hills'], d: 'Rusted blades in the long grass and a banner bearing the arms of a house that no longer exists.', hook: 'Someone has been digging here recently, and carefully.' },
    { k: 'discovery', t: 'A strange milestone', terr: ['road', 'plains'], d: 'An overgrown milestone gives the distance to a city that is on no map.' },
    { k: 'discovery', t: 'Hermit\'s hut', terr: ['forest', 'swamp', 'mountains', 'jungle'], d: 'A hermit trades directions for news, and is very interested in anything the party knows about the capital.' },
    { k: 'discovery', t: 'Ruined watchtower', terr: ['hills', 'plains', 'road'], d: 'A broken watchtower makes a fine camp, as long as the party ignores the faint singing from the cellar.' },
    { k: 'discovery', t: 'A treasure map nailed to a tree', terr: ['forest', 'jungle', 'road'], d: 'A dozen copies of the same treasure map are nailed to trees along the trail. The sixth one is different.' },
    { k: 'discovery', t: 'An oasis', terr: ['desert'], d: 'An oasis sits where no oasis should be. It is real. Mostly.' },
    { k: 'discovery', t: 'The traveler in the ice', w: ['cold', 'snow'], terr: ['tundra', 'mountains'], d: 'A traveler frozen in clear ice, smiling, with an iron key in one hand.' },
    { k: 'discovery', t: 'Sunken statue', terr: ['swamp', 'jungle'], d: 'A half-sunk statue of a forgotten king. Its face looks a great deal like one of the party.' },
    { k: 'discovery', t: 'Giant footprints', terr: ['hills', 'mountains', 'tundra', 'plains'], d: 'Footprints four feet long cross the trail, heading toward the next town.' },
    { k: 'discovery', t: 'Half-buried wagon', terr: ['desert'], d: 'A caravan wagon half-buried in a dune, its cargo crates still sealed with a merchant house\'s wax.' },
    { k: 'discovery', t: 'Jungle step-pyramid', terr: ['jungle'], d: 'A vine-swallowed step-pyramid, and on its top step, a fresh offering of fruit.' },
    { k: 'discovery', t: 'Abandoned cart', terr: ['road', 'plains'], d: 'A cart with a broken wheel, a mule grazing nearby, and two hundred cabbages. A note on the seat: "Back soon."' },

    // Omens
    { k: 'omen', t: 'Crows on a fence', d: 'A line of crows on a fence rail, every one of them facing the party, none of them making a sound.' },
    { k: 'omen', t: 'A red sunset', w: ['clear'], d: 'The sun sets blood red. Locals say it means a lord will die. Locals say a lot of things.' },
    { k: 'omen', t: 'Two moons in a puddle', w: ['wet'], d: 'A rain puddle reflects two moons. There is only one in the sky.' },
    { k: 'omen', t: 'Lightning-struck oak', w: ['storm'], d: 'An oak split by lightning is still smoking. The scorch mark on the trunk forms a perfect rune of warding.' },
    { k: 'omen', t: 'The silence', terr: ['forest', 'jungle', 'swamp'], d: 'Every bird and insect goes quiet for a full minute. Then, slowly, they start again. Something large has passed nearby.' },
    { k: 'omen', t: 'Footprints in the snow', w: ['snow'], d: 'A single line of bare footprints crosses the fresh snow, starting and ending in the middle of a field.' },

    // At camp
    { k: 'camp', t: 'A perfect campsite', d: 'A sheltered hollow with fresh water and dry wood. Everyone sleeps well for once.' },
    { k: 'camp', t: 'Company at the fire', d: 'A bard, a tinker, and a nervous merchant ask to share the fire. One of them is lying about where they come from.' },
    { k: 'camp', t: 'Night visitor', d: 'Something circles the camp after dark. In the morning there are small bare footprints around the bedrolls, one ration missing, and a strange one left in its place, wrapped in a leaf.' },
    { k: 'camp', t: 'The leaky tent', w: ['wet'], d: 'The tent leaks. Everyone wakes damp and cranky, and the bard wakes with a new song about it.' },
    { k: 'camp', t: 'Stargazing', w: ['clear'], d: 'A clear night and a sky full of stars. The wizard points out a constellation that wasn\'t there last year.' },
    { k: 'camp', t: 'Snowed in', w: ['snow'], d: 'The camp wakes to a foot of fresh snow and has to dig out before breakfast. Somebody builds a snow-golem. It is a little too lifelike.' },
    // More (added 2026-10-11)
    { k: 'travelers', t: 'A lost circus wagon', terr: ['road', 'plains', 'forest'], d: 'A painted circus wagon has lost the rest of its troupe. The driver is a bear in a hat, and the bear is clearly in charge.' },
    { k: 'travelers', t: 'Tax collector, alone', terr: ['road', 'plains', 'hills'], d: 'A tax collector with a heavy strongbox and no guards asks to travel with the party. Several people along the road would like a word with him.' },
    { k: 'travelers', t: 'A gnome on a giant tortoise', d: 'A gnome riding a giant tortoise is heading the same way, very slowly. She has been on the road for six years and has excellent gossip.' },
    { k: 'obstacle', t: 'A toll goat', terr: ['hills', 'mountains', 'road'], d: 'A huge goat stands in the narrowest part of the path and will not move. It eats one item from each traveler that passes, by its own rules.' },
    { k: 'obstacle', t: 'Wasps in the pass', w: ['hot', 'clear'], terr: ['hills', 'forest', 'plains'], d: 'A wasp nest the size of a barrel hangs over the trail. Passing quietly is a DC 12 Dexterity (Stealth) check for the whole party.' },
    { k: 'obstacle', t: 'Sandstorm wall', terr: ['desert'], d: 'A brown wall of sand rolls across the horizon. Shelter now, or lose the trail and half a day.' },
    { k: 'discovery', t: 'A message in a bottle', terr: ['swamp', 'road', 'plains', 'forest'], d: 'A bottle in a stream holds a plea for help, dated next week.' },
    { k: 'discovery', t: 'The overgrown orchard', terr: ['forest', 'hills', 'plains'], d: 'An orchard gone wild, heavy with fruit no one has picked in decades. The scarecrow has been recently repainted.' },
    { k: 'discovery', t: 'Dragon-scorched village', terr: ['hills', 'plains', 'mountains'], d: 'The houses are glass-black and long cold. The well still works, and someone has been drawing from it.' },
    { k: 'omen', t: 'Owl at noon', d: 'A white owl watches the party from a branch at midday, then flies off in the direction they are headed.' },
    { k: 'omen', t: 'The weeping stone', w: ['wet'], d: 'A boulder by the path drips water from two hollows like eyes. The water is warm, and salty.' },
    { k: 'camp', t: 'Too many fireflies', w: ['clear'], terr: ['forest', 'swamp', 'jungle', 'plains'], d: 'Thousands of fireflies gather around the camp and blink in a pattern. The wizard swears it is spelling something.' },
    { k: 'camp', t: 'The midnight trader', d: 'A cloaked figure arrives at the fire after midnight with a pack of goods and no light. Prices are fair, and payment is a memory.' }
];

const QUIET_DAYS = [
    'Nothing happens all day, which is its own kind of suspicious.',
    'A quiet stretch of road. Someone counts the clouds; someone else counts their coin twice.',
    'Plenty of road and very few people.',
    'Uneventful. The bard runs out of songs around noon and starts again from the top.',
    'The most exciting event of the day is lunch.',
    'A peaceful day. The kind they\'ll miss later.',
    'Good weather, good road, good company. Nobody trusts it.',
    'The party passes a farmer who waves. That is the whole day.',
    'Long hours of walking. Someone starts a game of I Spy and regrets it.',
    'A quiet day, spent arguing about where to camp.',
    'The road is empty. The miles go by. Boots wear a little thinner.',
    'Nothing at all, unless you count the very judgmental cow.'
];

// ── Helpers (all through rand()) ─────────────────────────
function travelPick(arr) {
    return arr[Math.floor(rand() * arr.length)];
}

function travelInt(min, max) {
    return min + Math.floor(rand() * (max - min + 1));
}

// Index into weights, picked in proportion to them.
function travelWeighted(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
    }
    return weights.length - 1;
}

function toCelsius(f) {
    return Math.round((f - 32) * 5 / 9);
}

// ── Weather ──────────────────────────────────────────────
function rollWeather(climate, season, prev) {
    const c = WEATHER_ODDS[climate] || WEATHER_ODDS.temperate;
    const odds = c[season] || c.spring;

    // Temperature: often stays within a band of yesterday's.
    let band;
    if (prev && rand() < 0.55) {
        const near = odds.temp.map((w, i) => (Math.abs(i - prev.band) <= 1 ? w || 0.2 : 0));
        band = travelWeighted(near);
    } else band = travelWeighted(odds.temp);
    const tb = TEMP_BANDS[band];
    const high = travelInt(tb.lo, tb.hi);
    const low = high - travelInt(c.swing[0], c.swing[1]);

    // Rain or snow: a third of the time it carries over (a storm eases to heavy).
    let level;
    if (prev && rand() < 0.35) level = Math.min(prev.level, 2);
    else level = travelWeighted(odds.precip);

    let wind = travelWeighted(c.wind);
    if (level === 3) wind = Math.max(wind, 2);
    const windFrom = travelPick(WIND_FROM);

    let kind;
    let morningFog = false;
    if (level === 0) {
        if (climate === 'arid' && wind >= 2 && rand() < 0.5) kind = 'dust';
        else if (wind === 3) kind = 'gale';
        else {
            kind = ['clear', 'partly', 'overcast'][travelWeighted([4, 3, 2])];
            if (wind === 0 && band >= 2 && band <= 4 && rand() < c.fog) {
                if (rand() < 0.3) kind = 'fog';
                else morningFog = true;
            }
        }
    } else {
        const snowy = band <= 1;
        const sleety = !snowy && band === 2 && rand() < 0.5;
        if (snowy) kind = ['flurries', 'snow', 'blizzard'][level - 1];
        else if (sleety) kind = level === 3 ? 'icestorm' : 'sleet';
        else kind = ['drizzle', 'rain', 'thunder'][level - 1];
    }

    const w = { climate, season, band, high, low, level, wind, windFrom, kind, morningFog };
    w.flavor = travelPick(WEATHER_FLAVOR[kind]);
    w.tags = weatherTags(w);
    w.slows = SLOW_KINDS.includes(kind);
    w.effects = weatherEffects(w);
    return w;
}

function weatherTags(w) {
    const tags = [];
    if (['drizzle', 'rain', 'thunder', 'sleet', 'icestorm'].includes(w.kind)) tags.push('wet');
    if (['flurries', 'snow', 'blizzard'].includes(w.kind)) tags.push('snow');
    if (w.band <= 2) tags.push('cold');
    if (w.band >= 6) tags.push('hot');
    if (w.kind === 'clear' || w.kind === 'partly') tags.push('clear');
    if (w.level === 3 || w.kind === 'gale' || w.kind === 'dust') tags.push('storm');
    return tags;
}

// What the weather means at the table. src: 'SRD' (SRD 5.1 rules) or 'ruling' (a suggestion).
function weatherEffects(w) {
    const fx = [];
    const heavy = HEAVY_KINDS[w.kind];
    if (heavy) fx.push({ src: 'ruling', text: `Heavy ${heavy}: the area is lightly obscured, so Wisdom (Perception) checks that rely on sight have disadvantage.` });
    if (w.kind === 'fog') fx.push({ src: 'ruling', text: 'Thick fog: everything beyond 30 feet is heavily obscured, and a creature trying to see something there is effectively blinded.' });
    if (w.morningFog) fx.push({ src: 'ruling', text: 'Morning fog: the area is lightly obscured until about midday.' });
    if (w.slows) fx.push({ src: 'ruling', text: 'Hard going: the route counts as difficult terrain today, so the party covers half the distance.' });
    if (w.wind === 3) fx.push({ src: 'ruling', text: 'Gale-force wind: ranged weapon attacks have disadvantage, open flames blow out, and flying is a struggle.' });
    else if (w.wind === 2) fx.push({ src: 'ruling', text: 'Strong wind: unshielded flames gutter out, and arrows drift.' });
    if (w.band >= 6) fx.push({ src: 'SRD', text: 'Hot weather: each character needs two gallons of water today instead of one.' });
    if (w.band === 7) fx.push({ src: 'ruling', text: 'Scorching heat: anyone in medium or heavy armor, or short of water, makes a Constitution save each hour or gains a level of exhaustion (DC at your call).' });
    if (w.band === 0) fx.push({ src: 'ruling', text: 'Bitter cold: anyone without cold-weather gear makes a Constitution save each hour outdoors or gains a level of exhaustion (DC at your call).' });
    return fx;
}

function weatherHeadline(w) {
    return `${TEMP_BANDS[w.band].label}, ${WEATHER_KINDS[w.kind].label.toLowerCase()}`;
}

function weatherDetail(w) {
    const wind = w.wind === 0 ? 'still air' : `${WIND_LABELS[w.wind]} from the ${w.windFrom}`;
    return `High ${w.high}°F (${toCelsius(w.high)}°C), low ${w.low}°F (${toCelsius(w.low)}°C), ${wind}${w.morningFog ? ', morning fog' : ''}.`;
}

// ── Road events ──────────────────────────────────────────
function rollRoadEvent(terrain, weather, used = []) {
    if (rand() < 0.25) return { k: 'quiet', t: 'A quiet day', d: travelPick(QUIET_DAYS) };
    const fits = ROAD_EVENTS.filter(e =>
        (!e.terr || e.terr.includes(terrain)) &&
        (!e.w || e.w.some(tag => weather.tags.includes(tag))));
    const fresh = fits.filter(e => !used.includes(e.t));
    return travelPick(fresh.length ? fresh : fits);
}

// ── Distance (SRD 5.1 travel pace) ───────────────────────
// opts: { pace, hours (1-12), gallop (bool), terrain }
function travelDistance(opts, weather) {
    const pace = TRAVEL_PACES[opts.pace] || TRAVEL_PACES.normal;
    const hours = Math.min(12, Math.max(1, Number(opts.hours) || 8));
    const terrainDifficult = !!(TRAVEL_TERRAIN[opts.terrain] || {}).difficult;
    const difficult = terrainDifficult || !!(weather && weather.slows);
    let miles = pace.mph * hours;
    if (opts.gallop) miles += 8 - pace.mph;   // one of the hours at a gallop: twice the fast pace
    if (difficult) miles /= 2;

    const notes = [];
    if (pace.note) notes.push(pace.note);
    if (opts.gallop) notes.push('One hour at a gallop covers 8 miles (twice the fast pace). Fresh mounts every 8 to 10 miles would let the party keep it up.');
    if (difficult) notes.push(`Difficult terrain (${terrainDifficult ? TRAVEL_TERRAIN[opts.terrain].label.toLowerCase() : 'the weather'}): half the usual distance.`);
    const forced = [];
    for (let h = 9; h <= hours; h++) forced.push({ hour: h, dc: 10 + (h - 8) });
    return { pace: opts.pace, mph: pace.mph, hours, gallop: !!opts.gallop, difficult, miles: Math.round(miles * 10) / 10, notes, forced };
}

// ── A whole journey ──────────────────────────────────────
// opts: { climate, season, terrain, pace, hours, gallop, miles (total, 0 = open road) }
// Returns days 1..n, stopping early on the day the party arrives.
function rollJourney(seed, opts, days) {
    const out = [];
    let prev = null;
    let covered = 0;
    const used = [];
    for (let k = 1; k <= days; k++) {
        const weather = withSeed(deriveSeed(seed, 'w' + k), () => rollWeather(opts.climate, opts.season, prev));
        const event = withSeed(deriveSeed(seed, 'e' + k), () => rollRoadEvent(opts.terrain, weather, used));
        const dist = travelDistance(opts, weather);
        let today = dist.miles;
        const goal = Number(opts.miles) || 0;
        if (goal && covered + today >= goal) today = Math.round((goal - covered) * 10) / 10;
        covered = Math.round((covered + today) * 10) / 10;
        const arrived = !!goal && covered >= goal;
        out.push({ day: k, weather, event, dist, today, covered, arrived });
        used.push(event.t);
        prev = weather;
        if (arrived) break;
    }
    return out;
}

// Plain-text lines for one day (Copy Day).
function travelDayText(d, opts) {
    const w = d.weather;
    const ev = ROAD_EVENT_KINDS[d.event.k];
    const goal = Number(opts.miles) || 0;
    const lines = [
        `Day ${d.day}: ${TRAVEL_TERRAIN[opts.terrain].label}, ${TRAVEL_CLIMATES[opts.climate].label.toLowerCase()} ${opts.season}`,
        `Weather: ${WEATHER_KINDS[w.kind].icon} ${weatherHeadline(w)}. ${weatherDetail(w)}`,
        `  ${w.flavor}`,
        ...w.effects.map(f => `  - ${f.text}${f.src === 'ruling' ? ' (ruling)' : ''}`),
        `${ev.icon} ${d.event.k === 'quiet' ? ev.label : `${ev.label}: ${d.event.t}`}. ${d.event.d}${d.event.hook ? ` Hook: ${d.event.hook}` : ''}`,
        `Travel: ${d.today} miles (${TRAVEL_PACES[d.dist.pace].label.toLowerCase()} pace, ${d.dist.hours} hours)` +
            (goal ? `. ${d.covered} of ${goal} miles${d.arrived ? ', arrived!' : ''}` : `. ${d.covered} miles so far`),
        ...d.dist.notes.map(n => `  - ${n}`),
        ...d.dist.forced.map(f => `  - Hour ${f.hour}: Constitution save DC ${f.dc}, or one level of exhaustion.`)
    ];
    return lines.join('\n');
}
