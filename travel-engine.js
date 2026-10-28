/* ============================================
   WEATHER + TRAVEL DAY ENGINE (F22)
   Used by the DM Toolbox "Travel" tab.
   - rollWeather(climate, season, prev): one day's weather. prev (yesterday's
     weather) makes the temperature and rain tend to carry over.
   - rollRoadEvent(terrain, weather, used): one event (or a quiet day) for the
     day, skipping titles in `used` while others are left.
   - travelDistance(opts, weather): the day's miles from the SRD 5.1 travel pace
     rules (pace, hours, difficult terrain, forced march, a gallop).
   - rollJourney(seed, opts, days): days 1..n. Day k's weather, event, scenery
     (v), roadside find (f), camp (c), and dusk sign (s) each come from their own
     child seed, so changing the pace or hours never changes the weather, and a
     link with a seed and a day rebuilds the whole trip. The moon starts from a
     'moon' seed and moves one day per day. The dusk sign reads tomorrow's
     actual weather, so the forecast comes true.
   - Events: 20% quiet, 15% a composed traveler (who × heading × news × ask),
     15% a composed discovery (what × detail, half with a hook), the rest from
     ROAD_EVENTS (fixed, filtered by terrain and weather tags).
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
    moor:      { label: 'Moor or heath', icon: '🐑' },
    coast:     { label: 'Coast or shore', icon: '🌊' },
    mountains: { label: 'Mountains', icon: '🏔️', difficult: true },
    swamp:     { label: 'Swamp', icon: '🐸', difficult: true },
    jungle:    { label: 'Jungle or dense forest', icon: '🌿', difficult: true },
    desert:    { label: 'Desert', icon: '🏜️' },
    badlands:  { label: 'Badlands or canyons', icon: '🪨' },
    tundra:    { label: 'Tundra or snowfield', icon: '🧊' }
};

// SRD 5.1 Travel Pace table: miles per hour and per (8-hour) day.
const TRAVEL_PACES = ruleTable({
    slow:   { label: 'Slow', mph: 2, day: 18, note: 'Slow pace: the party can move stealthily.' },
    normal: { label: 'Normal', mph: 3, day: 24, note: '' },
    fast:   { label: 'Fast', mph: 4, day: 30, note: 'Fast pace: −5 to passive {skill:wis:perception} scores.' }
});

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
        'Not a cloud in sight. Somewhere, a wizard takes credit.',
        'The light is so clean that every distant hill looks close enough to touch. None of them are.',
        'A bright, honest day. The sort that makes people volunteer for things.',
        'The sun is out and the sky is huge, and the ranger keeps looking up as if it might fall.'],
    partly: ['Clouds drift past in shapes the ranger insists are animals.',
        'Sun and shade by turns, like a lord deciding whether to pay you.',
        'A pleasant, undecided sort of sky.',
        'Cloud shadows race across the land faster than any horse.',
        'One cloud in particular follows the party all morning. It is probably nothing.',
        'Patches of sunlight wander over the country like slow lanterns.'],
    overcast: ['A low grey lid over the world. Nobody casts a shadow, which unsettles the warlock.',
        'Grey, flat, and still. The kind of sky that keeps its opinions to itself.',
        'Overcast all day. The light never quite commits.',
        'The clouds hang so low they snag on the hilltops.',
        'A dull, pewter day. Even the birds sound bored.',
        'It looks like rain all day and never quite manages it.'],
    fog: ['Fog thick enough to lose a horse in. Someone does, briefly.',
        'The road vanishes ten paces ahead and reappears only when you reach it.',
        'Sound carries strangely. Footsteps that aren\'t yours keep pace for a while.',
        'Shapes loom out of the white and turn into trees, mostly.',
        'Beads of fog gather on every cloak and beard. The dwarf is delighted to look silver.',
        'The fog swallows the far end of the rope line, and the last traveler calls out every few minutes to prove they still exist.'],
    gale: ['The wind takes a hat, a map, and most of the conversation.',
        'Trees bend, cloaks fly, and the halfling is tied to the cart for safety.',
        'A wind with somewhere to be, and it wants the party out of the way.',
        'Every step forward is a small argument with the sky.',
        'The gale shoves at packs like a rude crowd. Speech is reduced to shouting and pointing.',
        'Loose things leave. A sock is last seen heading east at speed.'],
    dust: ['A brown wall rolls in from the horizon and swallows the sun.',
        'Sand in the boots, the rations, the teeth, and the spellbook.',
        'The dust storm hisses like a crowd of snakes with opinions.',
        'Scarves over faces, eyes slitted, everyone walking by memory.',
        'The sun turns into a dim copper coin, and the day goes the color of old tea.',
        'Grit in every buckle and hinge. The rogue\'s lockpicks will need a good cleaning.'],
    drizzle: ['The kind of drizzle that gets into boots and opinions.',
        'A soft, endless rain. Not heavy enough to stop for, never light enough to ignore.',
        'Light rain on and off. Mostly on.',
        'A fine mist of rain that beads on wool and makes everything smell like wet dog, including the elf.',
        'Drizzle all morning, then a weak sun that apologizes for it.',
        'Raindrops tap on hoods all day like someone wanting to be let in.'],
    rain: ['Rain comes down in ropes. The road turns into a long, brown stew.',
        'A proper downpour. The cleric declares it a bath and is not thanked.',
        'Water everywhere: overhead, underfoot, and in every pack that was "waterproof".',
        'Every gully becomes a stream and every stream becomes an opinion about crossing it.',
        'The rain is loud enough on the hoods that nobody hears anybody all day.',
        'Gray curtains of rain march across the land, one after another, like an army that never runs out.'],
    thunder: ['Thunder rolls over the hills, and the wizard\'s hair stands up a little.',
        'Lightning forks across the sky. Everyone with a metal helmet walks a little apart from everyone else.',
        'A summer storm breaks hard and fast, then sulks off by evening.',
        'The thunder is close enough to feel in the teeth. The mules refuse to discuss it.',
        'Between flashes the world is pitch dark; in each flash it is bright as noon and nobody is where they were.',
        'The storm circles for hours as if looking for someone in particular.'],
    flurries: ['Light snow drifts down, pretty for the first hour.',
        'Flakes on the wind, never settling, always in the eyes.',
        'A dusting of snow that shows every track, including some that aren\'t the party\'s.',
        'Snow comes and goes in little flurries, like the sky is shaking out a rug.',
        'Fat, slow flakes. The druid catches one on her tongue and pretends she didn\'t.',
        'The flurries never amount to much, but the cold in them means business.'],
    snow: ['Snow falls thick and quiet. By noon the road is a rumor.',
        'Knee-deep by midday. The dwarf is fine. The dwarf is always fine.',
        'Heavy snow muffles everything, including the complaining.',
        'Each step sinks deep and comes out slow. The party breaks trail in turns.',
        'The world shrinks to falling white and the shoulders of the person ahead.',
        'Snow piles on hats and packs until everyone looks like a walking cake.'],
    blizzard: ['White in every direction. The rope between travelers is the only map that matters.',
        'The blizzard screams all day. Nobody can hear the bard, the one mercy.',
        'Snow sideways, wind like knives, and somewhere out there, the road.',
        'Eyelashes freeze together. Beards freeze solid. The wizard\'s ink freezes in the bottle.',
        'There is no up, no down, no horizon. Only the howl and the next step.',
        'The blizzard erases the party\'s tracks as fast as they make them, as if nobody ever passed.'],
    sleet: ['Half rain, half ice, all misery.',
        'Sleet ticks on armor like a thousand tiny, impatient fingers.',
        'Grey slush underfoot and grey slush on the way down.',
        'Cold rain with ice in its teeth. Cloaks freeze stiff at the hems.',
        'The sleet can\'t decide what it is, and neither can anyone\'s mood.',
        'Every surface is wet, and every wet surface is thinking about becoming ice.'],
    icestorm: ['Freezing rain glazes every branch, stone, and traveler.',
        'Trees crack under the ice like snapping bows. The road is a skating rink.',
        'Everything shines and everything is slippery. Even the mules look worried.',
        'Branches chime against each other in the wind like glass bells.',
        'The ice storm turns the land into a jeweler\'s window, and every step is a gamble.',
        'Ridges of frost run along every twig. The fighter falls over twice and blames her boots.']
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
    wildlife:  { icon: '🦌', label: 'Wildlife' },
    quiet:     { icon: '🍃', label: 'A quiet day' }
};

const ROAD_EVENTS = ruleTable([
    // Travelers
    { k: 'travelers', t: 'Pilgrims, lost', d: 'A dozen pilgrims are walking to a shrine in the wrong direction, and they are very sure about it.', hook: 'Their relic is a fake, and someone has been following them to learn where the real one is kept.' },
    { k: 'travelers', t: 'A peddler with a cart', d: 'A peddler offers trinkets, gossip, and a Gazette only three days out of date. One item in the cart is genuinely useful and priced at double.' },
    { k: 'travelers', t: 'The toll that isn\'t', terr: ['road'], d: 'Three men in a lord\'s colors collect a road toll of 2 sp a head. Their writ is real. The lord on it died last winter.' },
    { k: 'travelers', t: 'A wedding procession', terr: ['road', 'plains', 'hills', 'moor', 'coast'], d: 'A wedding party fills the road and insists the travelers join the feast. Refusing is rude; accepting costs half a day.' },
    { k: 'travelers', t: 'Courier with a thrown shoe', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'coast'], d: 'A courier\'s horse has thrown a shoe. She begs the party to carry a sealed letter to the next town and offers 10 gp.', hook: 'The seal belongs to someone everyone believes is dead.' },
    { k: 'travelers', t: 'Refugees on the road', d: 'A family pulling a handcart is fleeing a village two days ahead. They say the mayor was replaced by someone wearing his face.' },
    { k: 'travelers', t: 'A merchant caravan', terr: ['road', 'plains', 'desert', 'badlands', 'coast'], d: 'The caravan master is short on guards and offers 5 gp a day each to see the wagons to the next town.' },
    { k: 'travelers', t: 'A noble\'s hunt', terr: ['forest', 'plains', 'hills', 'moor'], d: 'Horns, hounds, and a hunting party that mistakes the travelers for the quarry for a few tense seconds. The noble apologizes with wine.' },
    { k: 'travelers', t: 'Rival adventurers', d: 'A party with better clothes and worse manners is headed to the same place. They have a map. It is wrong, but they don\'t know that.' },
    { k: 'travelers', t: 'Dwarven road crew', terr: ['road', 'mountains', 'hills', 'badlands'], d: 'A dwarven crew is repaving the road and arguing about the guild contract. Passing through costs a strong opinion on the matter.' },
    { k: 'travelers', t: 'A child selling directions', d: 'A child sells directions for a copper. The directions are excellent. The price, it turns out, is also a story.' },
    { k: 'travelers', t: 'The polite bridge troll', terr: ['road', 'forest', 'hills'], d: 'A troll in a waistcoat collects the bridge toll from a ledger. Haggling is allowed and, frankly, encouraged.' },
    { k: 'travelers', t: 'Militia checkpoint', terr: ['road', 'plains'], d: 'Local militia stop the party and compare faces against a wanted poster. The likeness to one of them is uncomfortable.' },
    { k: 'travelers', t: 'A herd on the move', terr: ['plains', 'tundra', 'hills', 'moor'], d: 'A herd of elk takes an hour to cross the trail, and the bull has taken a dislike to the cart.' },

    // Obstacles
    { k: 'obstacle', t: 'Washed-out bridge', w: ['wet', 'storm'], terr: ['road', 'forest', 'hills', 'plains', 'moor'], d: 'The bridge is gone. The nearest ford is a mile upstream, and the river is running high.' },
    { k: 'obstacle', t: 'Fallen tree', terr: ['forest', 'jungle', 'road'], d: 'A great tree lies across the trail. Clearing it takes an hour or one very good {ability:str} check.' },
    { k: 'obstacle', t: 'Fresh rockslide', terr: ['hills', 'mountains', 'badlands'], d: 'Rubble blocks the path, and some of it looks like it was dug out from below.' },
    { k: 'obstacle', t: 'Mud to the axles', w: ['wet'], terr: ['road', 'plains', 'swamp', 'forest', 'moor'], d: 'The road is a bog. A cart or mount gets stuck; a {dc:12} {skill:str:athletics} check frees it, or the party loses an hour.' },
    { k: 'obstacle', t: 'Snowbound pass', w: ['snow', 'cold'], terr: ['mountains', 'tundra', 'hills'], d: 'Drifts have closed the pass. Digging through takes two hours; the long way around takes the rest of the day.' },
    { k: 'obstacle', t: 'The well is dry', w: ['hot', 'clear'], terr: ['desert', 'plains', 'road', 'badlands'], d: 'The well on the map is dry. A note at the bottom reads: "Sorry. —Management."' },
    { k: 'obstacle', t: 'Flooded road', w: ['wet', 'storm'], terr: ['road', 'plains', 'swamp'], d: 'Brown water covers the road for half a mile. Wade it and hope, or take a detour that costs half the day.' },
    { k: 'obstacle', t: 'Firm-looking ground', terr: ['swamp', 'desert', 'moor'], d: 'The ground that looked firm isn\'t. Whoever leads sinks to the knees and needs pulling out.' },
    { k: 'obstacle', t: 'Thin ice', w: ['cold', 'snow'], terr: ['tundra', 'swamp', 'plains'], d: 'A frozen lake would save four miles. The ice creaks with every step, and something dark moves underneath.' },
    { k: 'obstacle', t: 'Leech pools', terr: ['swamp', 'jungle'], d: 'Every wade ends with leeches. Nobody is hurt, but everyone loses a little blood and a lot of dignity.' },
    { k: 'obstacle', t: 'The turned signpost', terr: ['road'], d: 'Someone has turned the signpost. The party would have gone the wrong way. The culprit\'s footprints are very small.' },

    // Discoveries
    { k: 'discovery', t: 'Abandoned camp', d: 'The fire is still warm. Bedrolls lie where they were left, along with one boot. The tracks leading away are walking, not running.' },
    { k: 'discovery', t: 'Roadside shrine', d: 'A mossy shrine to a minor god of travelers. Leaving a coin feels like the right thing to do. Taking one feels like the wrong one.' },
    { k: 'discovery', t: 'Old battlefield', terr: ['plains', 'hills', 'moor'], d: 'Rusted blades in the long grass and a banner bearing the arms of a house that no longer exists.', hook: 'Someone has been digging here recently, and carefully.' },
    { k: 'discovery', t: 'A strange milestone', terr: ['road', 'plains', 'moor'], d: 'An overgrown milestone gives the distance to a city that is on no map.' },
    { k: 'discovery', t: 'Hermit\'s hut', terr: ['forest', 'swamp', 'mountains', 'jungle'], d: 'A hermit trades directions for news, and is very interested in anything the party knows about the capital.' },
    { k: 'discovery', t: 'Ruined watchtower', terr: ['hills', 'plains', 'road', 'moor', 'coast'], d: 'A broken watchtower makes a fine camp, as long as the party ignores the faint singing from the cellar.' },
    { k: 'discovery', t: 'A treasure map nailed to a tree', terr: ['forest', 'jungle', 'road'], d: 'A dozen copies of the same treasure map are nailed to trees along the trail. The sixth one is different.' },
    { k: 'discovery', t: 'An oasis', terr: ['desert'], d: 'An oasis sits where no oasis should be. It is real. Mostly.' },
    { k: 'discovery', t: 'The traveler in the ice', w: ['cold', 'snow'], terr: ['tundra', 'mountains'], d: 'A traveler frozen in clear ice, smiling, with an iron key in one hand.' },
    { k: 'discovery', t: 'Sunken statue', terr: ['swamp', 'jungle'], d: 'A half-sunk statue of a forgotten king. Its face looks a great deal like one of the party.' },
    { k: 'discovery', t: 'Giant footprints', terr: ['hills', 'mountains', 'tundra', 'plains', 'moor', 'badlands'], d: 'Footprints four feet long cross the trail, heading toward the next town.' },
    { k: 'discovery', t: 'Half-buried wagon', terr: ['desert', 'badlands'], d: 'A caravan wagon half-buried in a dune, its cargo crates still sealed with a merchant house\'s wax.' },
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
    { k: 'obstacle', t: 'A toll goat', terr: ['hills', 'mountains', 'road', 'badlands'], d: 'A huge goat stands in the narrowest part of the path and will not move. It eats one item from each traveler that passes, by its own rules.' },
    { k: 'obstacle', t: 'Wasps in the pass', w: ['hot', 'clear'], terr: ['hills', 'forest', 'plains'], d: 'A wasp nest the size of a barrel hangs over the trail. Passing quietly is a {dc:12} {skill:dex:stealth} check for the whole party.' },
    { k: 'obstacle', t: 'Sandstorm wall', terr: ['desert', 'badlands'], d: 'A brown wall of sand rolls across the horizon. Shelter now, or lose the trail and half a day.' },
    { k: 'discovery', t: 'A message in a bottle', terr: ['swamp', 'road', 'plains', 'forest', 'coast'], d: 'A bottle in a stream holds a plea for help, dated next week.' },
    { k: 'discovery', t: 'The overgrown orchard', terr: ['forest', 'hills', 'plains', 'coast'], d: 'An orchard gone wild, heavy with fruit no one has picked in decades. The scarecrow has been recently repainted.' },
    { k: 'discovery', t: 'Dragon-scorched village', terr: ['hills', 'plains', 'mountains', 'moor', 'coast'], d: 'The houses are glass-black and long cold. The well still works, and someone has been drawing from it.' },
    { k: 'omen', t: 'Owl at noon', d: 'A white owl watches the party from a branch at midday, then flies off in the direction they are headed.' },
    { k: 'omen', t: 'The weeping stone', w: ['wet'], d: 'A boulder by the path drips water from two hollows like eyes. The water is warm, and salty.' },
    { k: 'camp', t: 'Too many fireflies', w: ['clear'], terr: ['forest', 'swamp', 'jungle', 'plains', 'moor'], d: 'Thousands of fireflies gather around the camp and blink in a pattern. The wizard swears it is spelling something.' },
    { k: 'camp', t: 'The midnight trader', d: 'A cloaked figure arrives at the fire after midnight with a pack of goods and no light. Prices are fair, and payment is a memory.' },

    // New lands (deep-expansion pass, 2026-10-11)
    { k: 'travelers', t: 'Wreckers on the cliff', terr: ['coast'], d: 'Two locals are carrying a lantern up to the cliff top on a night with ships in the bay. They say it is for "fishing".', hook: 'A merchant ship is due tonight, and its cargo is already promised to someone in town.' },
    { k: 'travelers', t: 'The shell-gatherers', terr: ['coast'], d: 'Children with baskets comb the tide line and offer to trade a perfect spiral shell for news of the capital. One of the shells hums.' },
    { k: 'travelers', t: 'A shepherd and her dogs', terr: ['moor', 'hills'], d: 'A shepherd with two very clever dogs points the way and warns the party off the green ground: "Green is bog, brown is road, and grey is grave."' },
    { k: 'travelers', t: 'Peat cutters', terr: ['moor', 'swamp'], d: 'Peat cutters stop work to stare. They have dug up something with fingers, and they would like someone else to decide what to do about it.' },
    { k: 'travelers', t: 'A prospector and his mule', terr: ['badlands', 'mountains', 'desert'], d: 'A sun-cooked prospector shows off a nugget the size of a thumb and asks the party to witness his claim. Three other men claim the same gully.' },
    { k: 'travelers', t: 'Canyon echo-speakers', terr: ['badlands', 'mountains'], d: 'A trio of monks stand at the canyon rim and shout questions into it. The echoes come back with different answers.' },
    { k: 'obstacle', t: 'The tide comes in', terr: ['coast'], d: 'The beach path is a race against the tide. A {dc:12} {skill:wis:survival} check reads the water right; a miss means wading waist-deep or waiting six hours.' },
    { k: 'obstacle', t: 'Crumbling cliff path', terr: ['coast', 'mountains', 'badlands'], d: 'The cliff path has lost a ten-foot stretch to the sea. A {dc:13} {skill:str:athletics} check climbs around it; the inland detour costs two hours.' },
    { k: 'obstacle', t: 'The green ground', terr: ['moor'], d: 'A bright green patch of moor turns out to be a sucking bog. The lead traveler sinks to the waist and needs a rope and a {dc:12} {skill:str:athletics} check to get out.' },
    { k: 'obstacle', t: 'Flash flood', w: ['wet', 'storm'], terr: ['badlands', 'desert'], d: 'A dry wash fills with roaring brown water in minutes. Get to high ground with a {dc:12} {skill:dex:acrobatics} check, or lose something heavy to the flood.' },
    { k: 'obstacle', t: 'Dead-end canyon', terr: ['badlands'], d: 'The canyon the map says goes through doesn\'t. Backtracking costs half the day, unless someone fancies a 60-foot climb.' },
    { k: 'discovery', t: 'A beached sea monster', terr: ['coast'], d: 'A whale-sized carcass with too many fins lies on the sand. Gulls avoid it. So does the smell, somehow.', hook: 'A harpoon in its side bears a guild mark, and the guild says it has never hunted at sea.' },
    { k: 'discovery', t: 'A drowned village', terr: ['coast', 'swamp'], d: 'At low tide the roofs of a sunken village show above the water, and a bell rings somewhere beneath it.' },
    { k: 'discovery', t: 'Standing stones on the moor', terr: ['moor', 'hills', 'plains'], d: 'A ring of nine standing stones. Counting them gives ten. Counting again gives eight.' },
    { k: 'discovery', t: 'A painted canyon wall', terr: ['badlands', 'desert'], d: 'A canyon wall covered in old paintings of hunts, stars, and one very clear drawing of the party\'s own wagon.' },
    { k: 'discovery', t: 'Petrified forest', terr: ['badlands', 'desert'], d: 'A forest of stone trees, every one frozen mid-sway, and a stone woodcutter with his axe raised.' },
    { k: 'omen', t: 'The gull that speaks', terr: ['coast'], d: 'A gull lands on the nearest pack and says one word in a clear, human voice. Nobody agrees on what the word was.' },
    { k: 'omen', t: 'Will-o\'-wisps', terr: ['moor', 'swamp'], d: 'Pale lights bob out on the moor at dusk, keeping exactly the party\'s pace and exactly the same distance away.' },
    { k: 'omen', t: 'A rain of fish', w: ['wet', 'storm'], d: 'For a few minutes it rains small silver fish. They are alive, and they are all facing the same way.' },
    { k: 'omen', t: 'The long shadow', w: ['clear'], d: 'At sunset one traveler\'s shadow stretches the wrong way, toward the sun, for the space of a breath.' },
    { k: 'camp', t: 'Shipwreck firewood', terr: ['coast'], d: 'The camp burns driftwood from an old wreck. The flames come up green and blue, and the smoke smells of spice and far-off places.' },
    { k: 'camp', t: 'The singing canyon', terr: ['badlands', 'mountains'], d: 'At night the wind plays the canyon like a flute. It is beautiful until it starts playing a tune one of the party\'s grandmothers used to hum.' },
    { k: 'camp', t: 'A borrowed barn', terr: ['road', 'plains', 'hills', 'moor'], d: 'A farmer lets the party sleep in the barn for a hand with the evening milking. The cows are friendly. The goat is not.' },

    // Wildlife: nothing hostile unless the party makes it so.
    { k: 'wildlife', t: 'A heron', terr: ['swamp', 'coast', 'moor', 'plains'], d: 'A grey heron fishes the shallows and ignores the party with total dignity.' },
    { k: 'wildlife', t: 'Wild horses', terr: ['plains', 'moor', 'badlands'], d: 'A herd of wild horses runs alongside the trail for a mile, just for the joy of it. One mare keeps looking back at the party\'s mounts.' },
    { k: 'wildlife', t: 'A bear and cubs', terr: ['forest', 'mountains', 'hills', 'tundra'], d: 'A brown bear and two cubs are fishing in a stream beside the trail. Giving them a wide berth costs an hour; not giving one costs more.' },
    { k: 'wildlife', t: 'A stag', terr: ['forest', 'hills', 'moor'], d: 'A white stag stands in the trail and watches the party pass. It does not run. Hunters would pay a fortune to know where it was.' },
    { k: 'wildlife', t: 'A tortoise on the road', terr: ['road', 'desert', 'plains', 'badlands'], d: 'A tortoise the size of a shield is crossing the road. Its shell is painted with a tiny, careful map.' },
    { k: 'wildlife', t: 'Seals on the rocks', terr: ['coast'], d: 'A colony of seals bark at the party from the rocks. One of them has very human eyes and follows along in the water for a while.' },
    { k: 'wildlife', t: 'Crocodile slide', terr: ['swamp', 'jungle'], d: 'Logs along the bank turn out to be crocodiles, sunning. A {dc:11} {skill:dex:stealth} check gets everyone past without waking them.' },
    { k: 'wildlife', t: 'Monkeys with taste', terr: ['jungle'], d: 'A troop of monkeys raids the packs and makes off with one shiny object. They give it back later in exchange for a better one.' },
    { k: 'wildlife', t: 'Vultures overhead', terr: ['desert', 'badlands', 'plains'], d: 'Vultures circle high over the party for most of the day, with what feels like optimism.' },
    { k: 'wildlife', t: 'A snow fox', terr: ['tundra', 'mountains'], w: ['cold', 'snow'], d: 'A white fox trots along behind the party, waiting for scraps. If fed, it stays with them until the next town and leaves before anyone wakes.' },
    { k: 'wildlife', t: 'Mountain goats', terr: ['mountains', 'hills', 'badlands'], d: 'Goats graze on a cliff face that looks impossible to stand on. The party\'s climber takes it personally.' },
    { k: 'wildlife', t: 'A hawk\'s kill', terr: ['plains', 'moor', 'hills', 'desert'], d: 'A hawk drops out of the sky onto a hare twenty feet away. The ranger nods approvingly. The bard is upset.' },
    { k: 'wildlife', t: 'Frog chorus', terr: ['swamp', 'jungle', 'forest'], w: ['wet'], d: 'Thousands of frogs sing after the rain, so loud that the party has to shout. They all stop at once whenever someone steps off the path.' },
    { k: 'wildlife', t: 'Wolves on the ridge', terr: ['forest', 'hills', 'tundra', 'mountains', 'moor'], d: 'A wolf pack watches from a ridge all afternoon and never comes closer. At dusk they howl once, together, and are gone.' },
    { k: 'wildlife', t: 'Giant moths', terr: ['forest', 'jungle', 'swamp'], d: 'Moths with wings as wide as a hand gather at the lanterns, their wings marked with patterns like staring eyes.' },
    { k: 'wildlife', t: 'Sea turtles nesting', terr: ['coast'], w: ['clear'], d: 'Sea turtles are hauling themselves up the beach to lay eggs. Someone has staked out a nest with a little sign: "PROPERTY OF THE DUKE".' },
    { k: 'wildlife', t: 'Rattlesnake in the shade', terr: ['desert', 'badlands', 'plains'], w: ['hot', 'clear'], d: 'A rattlesnake has claimed the only shade for a mile. Moving it is a {dc:12} {skill:wis:animal-handling} check; failing earns a bite (1 piercing damage plus a {dc:10} {save:con} save against 2d4 poison damage).' },
    { k: 'wildlife', t: 'A herd of bison', terr: ['plains'], d: 'A sea of bison blocks the horizon. Crossing through takes patience, quiet, and nerves.' },
    { k: 'wildlife', t: 'Owls at dusk', terr: ['forest', 'moor', 'road', 'plains', 'hills'], d: 'Owls call to each other across the trail at dusk, three on the left, three on the right, as if counting the party.' },
    { k: 'wildlife', t: 'Puffins', terr: ['coast'], w: ['cold', 'clear'], d: 'A cliff full of puffins. The party loses a quarter-hour to watching them, and nobody regrets it.' },
    { k: 'wildlife', t: 'Fish in the shallows', terr: ['road', 'forest', 'plains', 'hills', 'moor'], d: 'The ford is full of fat trout. A {dc:12} {skill:wis:survival} check means fresh fish for supper.' }
]);

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

// ── Scenery: what the land looks and sounds like (deep-expansion pass) ──
const TRAVEL_SCENERY = {
    road: {
        sights: ['The road runs between low stone walls patched a hundred times by a hundred farmers.',
            'Ruts worn ankle-deep by generations of carts lead on toward the horizon.',
            'Milestones lean at odd angles, their numbers rubbed away by thumbs and weather.',
            'Hedgerows crowd the road on both sides, full of sparrows and blackberries.',
            'The road crests a rise and the whole valley opens out below, patchwork and smoke.',
            'An old paved stretch surfaces for a mile, then sinks back into dirt.',
            'Wayside shrines stand every few miles, each one hung with travelers\' ribbons.',
            'Poplars line the road in a long straight row, planted by someone with a plan.'],
        sounds: ['Cartwheels creak somewhere ahead.', 'A dog barks from a farm out of sight.', 'Church bells drift across the fields on the hour.', 'Hooves clop on the hard-packed road.', 'Larks sing high over the fields.']
    },
    plains: {
        sights: ['Grass to the knees runs to the edge of the world, rippling like water.',
            'The sky is enormous here, and the land is a thin line under it.',
            'A single tree stands on a rise miles away and takes all day to reach.',
            'Wildflowers spread in great drifts of yellow and blue.',
            'Old cart tracks cross the grassland, going nowhere in particular.',
            'Low burial mounds dot the plain, too regular to be natural.',
            'The grass has been grazed short in great circles, as if by something very big.',
            'Far off, a farmstead\'s smoke rises straight as a pin.'],
        sounds: ['Wind hisses through the grass.', 'Grasshoppers click and whir underfoot.', 'A hawk screams high overhead.', 'Somewhere, cattle low.', 'The only sound is boots and breathing.']
    },
    forest: {
        sights: ['Sunlight falls in coins through the leaves onto a soft brown floor.',
            'Old trees stand wide apart like pillars in a hall, mossed to the shoulder.',
            'The trail winds between ferns as tall as a dwarf.',
            'Birches crowd together, white trunks marked with dark eyes.',
            'A fallen giant of a tree lies moss-covered, a whole garden growing on its back.',
            'Toadstools in red and white ring the stumps.',
            'The canopy closes overhead and the light goes green and dim.',
            'Woodcutters\' marks score the trees, then stop, as if the woodcutters did too.'],
        sounds: ['A woodpecker hammers somewhere deep in the trees.', 'Leaves whisper overhead.', 'A stream chatters out of sight.', 'Twigs snap in the undergrowth, always just out of view.', 'Doves call back and forth across the wood.']
    },
    hills: {
        sights: ['The trail climbs and dips over hill after rolling hill.',
            'Sheep dot the green slopes like scattered dice.',
            'Dry-stone walls climb the hillsides at angles that seem to defy sense.',
            'A ruined fort crowns the highest hill, a few teeth of stone left.',
            'Each crest shows another crest beyond it, a little bluer.',
            'A chalk figure of a horse is cut into a distant hillside.',
            'Gorse flowers in yellow blazes along the slopes.',
            'Streams cut deep little valleys between the hills, full of alders.'],
        sounds: ['A shepherd whistles to a dog across the valley.', 'Wind roars over the crests and goes still in the dips.', 'Sheep bells clank on the slopes.', 'A curlew calls, long and lonely.', 'A waterfall murmurs somewhere below.']
    },
    moor: {
        sights: ['Brown heather and grey stone run on under a low sky.',
            'Granite tors rise from the moor like the knuckles of buried giants.',
            'Black pools lie still in the peat, reflecting nothing.',
            'A lone, wind-bent hawthorn is the only tree for miles.',
            'Old stone crosses mark the safe path across the bog.',
            'Mist lies in the hollows long after dawn.',
            'Purple heather blazes across the slopes.',
            'A long-abandoned farmhouse sits roofless in a fold of the moor.'],
        sounds: ['A grouse bursts up crying "go-back, go-back".', 'Wind moans over the open moor.', 'Water trickles under the heather everywhere.', 'A raven croaks from a tor.', 'Pony hooves drum somewhere unseen.']
    },
    coast: {
        sights: ['Cliffs drop to a grey-green sea that heaves and booms below.',
            'A long beach of pale sand curves away toward a far headland.',
            'Fishing boats lie hauled up on the shingle, nets drying on poles.',
            'Rock pools glitter at low tide, crowded with anemones.',
            'A lighthouse stands on the far headland.',
            'Sea stacks rise out of the surf, white with birds.',
            'The path runs along the cliff top, a long fall on the seaward side.',
            'Driftwood and kelp lie in a long line where the last high tide reached.'],
        sounds: ['Waves crash and drag at the shingle.', 'Gulls wheel and scream overhead.', 'A buoy bell clangs somewhere offshore.', 'The wind smells of salt and tar.', 'Seals bark from the rocks.']
    },
    mountains: {
        sights: ['Peaks stand white against the sky, close enough to touch and a week away.',
            'The trail switchbacks up a scree slope that slides with every step.',
            'A glacier sprawls between two peaks, blue in its cracks.',
            'Far below, a valley lies like a green map with a silver thread of river.',
            'Prayer flags snap on a cairn at the top of the pass.',
            'Pines thin out and give way to bare rock and lichen.',
            'An old dwarven road, wide and paved, appears for a mile and then is gone.',
            'A waterfall drops a thousand feet and turns to mist before it lands.'],
        sounds: ['Rocks clatter down a slope somewhere.', 'The wind whistles over the ridges.', 'An eagle calls far overhead.', 'Meltwater roars in a gorge below.', 'The silence is so deep it hums.']
    },
    swamp: {
        sights: ['Black water spreads between hummocks of reed and rotting wood.',
            'Cypress trees stand knee-deep in the water, hung with grey moss.',
            'A rotting boardwalk crosses part of the marsh, then gives up.',
            'Gas bubbles rise in slow, fat blooms from the mud.',
            'Lilies with flowers like pale hands crowd the still pools.',
            'Dead trees stand white and bare above the reeds.',
            'Mist hangs over the water, never quite lifting.',
            'Stilt huts stand empty at the water\'s edge, doors open.'],
        sounds: ['Frogs croak in a thousand voices.', 'Something plops into the water nearby.', 'Insects whine around every ear.', 'Mud sucks at every boot.', 'A bittern booms, deep and strange.']
    },
    jungle: {
        sights: ['Green on green on green: leaves as big as shields, vines as thick as arms.',
            'Roots like walls rise from the ground and swallow the trail.',
            'Flowers the size of dinner plates glow red in the gloom.',
            'Sunlight never reaches the floor; the light is green and steaming.',
            'A river the color of tea winds slow and wide between the trees.',
            'Old carved stones lie tumbled under the roots, faces worn smooth.',
            'Spider webs span the trail, beaded with water and as wide as doors.',
            'Bright frogs cling to the leaves, too bright to touch.'],
        sounds: ['Howler monkeys roar somewhere in the canopy.', 'Water drips from every leaf.', 'Birds shriek like rusty hinges.', 'Insects drone without pause.', 'Something big pushes through the leaves, then stops.']
    },
    desert: {
        sights: ['Dunes roll away in great waves the color of honey.',
            'The heat shimmers, and the horizon floats on silver water that isn\'t there.',
            'Wind has carved the dunes into sharp ridges like blades.',
            'A line of camel bones marks an old caravan route.',
            'Bleached rocks stand out of the sand like islands.',
            'Far off, the white walls of a town float above the mirage.',
            'Sand runs off the dune tops in long, smoking plumes.',
            'A dry riverbed, cracked into tiles, winds through the dunes.'],
        sounds: ['Sand hisses as it slides down the dune faces.', 'The wind sighs and moans.', 'The silence is enormous.', 'A dune booms, low and deep, like a far drum.', 'Beetles scratch across the sand.']
    },
    badlands: {
        sights: ['Red and orange cliffs stand in bands like a cake cut open.',
            'Hoodoos of stone rise like a crowd of frozen giants.',
            'Canyons cut deep into the earth, their floors in shadow at noon.',
            'Natural stone arches span the gullies.',
            'Dry washes branch and branch again like a map of veins.',
            'Sagebrush and twisted juniper cling to the slopes.',
            'Mesas stand flat-topped against the sky, miles apart.',
            'Layers of rock show shells and bones of things long gone.'],
        sounds: ['Pebbles click down a canyon wall.', 'The wind sings in the hoodoos.', 'A hawk\'s cry echoes from wall to wall.', 'Lizards rustle in the dry brush.', 'Every footstep echoes back twice.']
    },
    tundra: {
        sights: ['Flat white land runs to the horizon under a pale sun.',
            'Low moss and lichen in rust and gold carpet the frozen ground.',
            'Rocks heaved up by frost stand in strange rings.',
            'Old snow lies in long drifts, sculpted by the wind.',
            'A frozen lake stretches away, blue-black and glassy.',
            'Stone markers, man-shaped, stand on the ridges to show the way.',
            'The sky is huge and pale, and the land is huger.',
            'Antlers shed by the herds lie scattered across the ground.'],
        sounds: ['The wind never stops.', 'Snow squeaks under every boot.', 'Ice groans on a frozen lake.', 'A raven croaks overhead.', 'Breath crackles in beards.']
    }
};

// A touch of the season. terr = only on these terrains.
const TRAVEL_SEASON_TOUCH = {
    spring: [{ t: 'Everything is the bright green of a new coin.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'coast', 'mountains', 'swamp'] },
        { t: 'Lambs call to their mothers from the next field over.', terr: ['road', 'plains', 'hills', 'moor'] },
        { t: 'Meltwater runs in every ditch and gully.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'mountains', 'tundra', 'badlands'] },
        { t: 'Blossom drifts across the way like slow snow.', terr: ['road', 'plains', 'forest', 'hills'] },
        { t: 'Birds are building nests and shouting about it.' },
        { t: 'Cactus flowers bloom red and yellow after the spring rains.', terr: ['desert', 'badlands'] }],
    summer: [{ t: 'The air is thick and lazy with heat and bees.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'swamp', 'jungle'] },
        { t: 'Hay stands in stooks in every field.', terr: ['road', 'plains', 'hills'] },
        { t: 'The days are long and the shadows are short.' },
        { t: 'Butterflies drift over everything, in no hurry at all.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'coast', 'mountains', 'jungle'] },
        { t: 'The midnight sun barely dips below the horizon.', terr: ['tundra'] },
        { t: 'Dragonflies hover over every pool.', terr: ['swamp', 'forest', 'moor', 'jungle'] }],
    autumn: [{ t: 'Leaves of red and gold drift down and crunch underfoot.', terr: ['road', 'forest', 'hills', 'plains'] },
        { t: 'Geese go over in long arrows, heading south.' },
        { t: 'Woodsmoke and apples are on the air.', terr: ['road', 'plains', 'forest', 'hills', 'moor'] },
        { t: 'Bracken has turned to rust on every slope.', terr: ['moor', 'hills', 'forest', 'mountains'] },
        { t: 'The light is low and golden all day.' },
        { t: 'Spider silk glints on every bush in the morning.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'coast'] }],
    winter: [{ t: 'Bare branches stand black against the sky.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'swamp'] },
        { t: 'Breath hangs in clouds, and every puddle wears a skin of ice.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'coast', 'mountains', 'swamp', 'tundra', 'badlands'] },
        { t: 'The sun sits low and pale and gives no warmth.' },
        { t: 'Holly berries are the only color for miles.', terr: ['road', 'forest', 'hills'] },
        { t: 'The nights are long, and the day feels like a short visit.' },
        { t: 'Even here, the nights turn cold enough to frost the sand.', terr: ['desert'] }]
};

// ── Composed travelers (who × where they're headed × news × an ask) ──
const TRAVELER_WHO = [
    ['A tinker', 'a tinker with a cart of rattling pots'],
    ['A pair of nuns', 'two nuns on one very patient donkey'],
    ['A retired adventurer', 'a retired adventurer with one leg, two swords, and a great many stories'],
    ['A goatherd', 'a goatherd and forty goats'],
    ['A traveling scribe', 'a traveling scribe who writes letters for a copper a page'],
    ['A runaway apprentice', 'a runaway wizard\'s apprentice still wearing the robes'],
    ['A dwarf with a gravestone', 'a dwarf carrying her grandmother\'s gravestone on her back'],
    ['A bard on a mule', 'a bard on a mule, composing out loud'],
    ['A halfling family', 'a halfling family with a handcart full of pies'],
    ['A knight errant', 'a knight errant in very shiny, very new armor'],
    ['Two "wool merchants"', 'two "wool merchants" who know nothing about wool'],
    ['A lost student', 'a student from the Arcane College, lost and too proud to say so'],
    ['A widow with a sword', 'a widow in black, carrying her husband\'s sword to his brother'],
    ['A gnome and her barrow', 'a gnome pushing a clockwork wheelbarrow that pushes back'],
    ['A wandering priest', 'a wandering priest who will bless anything for a copper, including the cart'],
    ['An exiled noble', 'an exiled noble trying very hard to look like a commoner'],
    ['A rat-catcher', 'a rat-catcher with a terrier and a sack that moves'],
    ['Two elf hunters', 'two elf hunters who have been tracking the same deer for a week'],
    ['A cheese merchant', 'a cheese merchant whose wagon announces itself from half a mile off'],
    ['A half-orc smith', 'a half-orc smith hauling her anvil to a new forge on a sledge'],
    ['A troupe of actors', 'a troupe of actors rehearsing a tragedy as they go'],
    ['A hermit', 'a hermit who has come down from the hills for the first time in nine years'],
    ['A royal messenger', 'a royal messenger on a lathered horse'],
    ['A beekeeper', 'a beekeeper carrying a hive in a basket, very carefully'],
    ['A fortune-teller', 'a fortune-teller whose cards keep turning up the same card'],
    ['A deserter', 'a soldier with the badges torn off his coat'],
    ['A tiefling mapmaker', 'a tiefling mapmaker measuring the way with a knotted rope'],
    ['A grandmother', 'a tiny old woman walking alone, unarmed, and entirely unworried'],
    ['Two newlyweds', 'two newlyweds running away from both families'],
    ['A silent pilgrim', 'a dragonborn pilgrim under a vow of silence who keeps nearly breaking it'],
    ['A bone collector', 'a scholar collecting old bones in a wheelbarrow "for science"'],
    ['A traveling barber', 'a traveling barber who offers a shave and a tooth-pulling, both at a discount']
];

const TRAVELER_HEADING = ['heading the same way', 'coming the other way', 'resting beside the path', 'stopped to mend a strap',
    'waving the party down', 'camped by the way with a small, smoky fire', 'catching up from behind, at a run'];

// "They say ___."
const TRAVELER_NEWS = [
    'the ferry ahead has stopped running and the ferryman has gone missing',
    'a dragon was seen over the hills last week, or possibly a very large goose',
    'the next town has banned magic until the festival is over',
    'the bandits on this stretch only rob people who look rich',
    'the inn ahead waters its ale but not its stew',
    'a merchant prince is paying good coin for griffon eggs',
    'the baron has doubled the bridge toll to pay for his daughter\'s wedding',
    'someone has been stealing church bells all along the valley',
    'there is a plague of frogs in the next village, and the frogs are organized',
    'a wizard\'s tower appeared on a ridge overnight',
    'the mines up north are hiring anyone who can hold a pick',
    'the old king\'s tomb has been opened, and nobody admits doing it',
    'a famous duelist waits at the next crossroads for anyone who will fight',
    'the Gazette got the harvest festival date wrong again',
    'the elves in the forest are charging a toll in songs',
    'a whole caravan went missing on this road a month ago',
    'the miller\'s daughter can talk to crows, and the crows are worried',
    'grain prices doubled overnight and nobody knows why',
    'the next village is holding a fair with a pie contest and a greased pig',
    'a giant has been seen sitting on a hill, crying',
    'the lord of the next town hires adventurers and then forgets to pay them',
    'the temple bells rang by themselves three nights running'
];

const TRAVELER_ASK = [
    'They ask for an escort to the next town and offer 5 gp for it.',
    'They want to trade a pouch of good pipeweed for a whetstone.',
    'They ask whether anyone can read, and hand over a letter they have carried for weeks.',
    'They offer to share a meal if the party shares a story.',
    'They sell a rough map of the way ahead for 1 gp. It is better than it looks.',
    'They ask the party to look out for a missing brown dog with one white ear.',
    'They want nothing at all, which is the most suspicious thing about them.',
    'They try to sell a "magic" ring for 50 gp. It is copper and hope.',
    'They ask for a bandage or a healing word for a nasty cut.',
    'They warn the party not to camp near the lone oak, and won\'t say why.',
    'They are lost and would like to follow the party for a day.',
    'They offer a bottle of strong spirits in exchange for news.',
    'They ask the party to deliver a small, heavy box, and won\'t say what is in it.',
    'They challenge the strongest-looking traveler to arm-wrestle for a silver piece.',
    'They know a shortcut that would save a few miles, if anyone trusts them.',
    'They are looking for someone who matches one of the party\'s descriptions a little too well.',
    'They ask for water and are very grateful for it.',
    'They want to know if the party has seen anyone pass by in a hurry.'
];

// ── Composed discoveries (what × a detail × sometimes a hook) ──
const DISCOVERY_WHAT = [
    ['A cairn', 'a tall cairn of stones with a rusted helmet balanced on top'],
    ['An empty gibbet', 'an empty gibbet creaking at a crossroads', ['road', 'plains', 'moor', 'hills']],
    ['A boarded-up mine', 'the boarded-up mouth of an old mine', ['hills', 'mountains', 'badlands']],
    ['A broken carriage', 'a fine carriage lying on its side, its horses long gone', ['road', 'plains', 'forest', 'hills']],
    ['A fairy ring', 'a ring of mushrooms wide enough to stand in', ['forest', 'jungle', 'swamp', 'plains', 'moor', 'hills']],
    ['A sealed door', 'a stone door set into a hillside, with no handle', ['hills', 'mountains', 'badlands', 'moor', 'forest']],
    ['A ring of bones', 'the ashes of a big campfire, ringed with bones'],
    ['A skull shrine', 'a little shrine of animal skulls tied with red thread'],
    ['A dry fountain', 'a dry stone fountain far from any town'],
    ['A shipwreck', 'the ribs of a wrecked ship', ['coast', 'desert']],
    ['Giant\'s bones', 'the bones of a giant half-sunk in the earth'],
    ['A charm tree', 'a tree hung with hundreds of little charms and ribbons', ['forest', 'plains', 'hills', 'moor', 'road', 'jungle', 'swamp']],
    ['A lone grave', 'a lone grave with a fresh wreath and no name'],
    ['A burned wagon', 'a burned-out wagon, still smoking', ['road', 'plains', 'forest', 'hills', 'desert', 'badlands', 'moor']],
    ['A pointing statue', 'a weathered statue of an armored woman pointing the way'],
    ['A tower stump', 'the stump of a wizard\'s tower, sheared off clean as if by a sword'],
    ['A bell in a tree', 'a bronze bell grown right into the trunk of an old tree', ['forest', 'jungle', 'swamp', 'hills']],
    ['An abandoned mill', 'an abandoned watermill with its wheel still turning', ['forest', 'plains', 'hills', 'road', 'moor']],
    ['A stepped sinkhole', 'a perfectly round sinkhole with steps cut down one side'],
    ['A buried arch', 'the top of a carved stone archway poking out of the ground'],
    ['A roofless chapel', 'a roofless chapel with the altar still standing', ['road', 'plains', 'forest', 'hills', 'moor', 'coast', 'mountains']],
    ['A signal beacon', 'an old signal beacon on a high point, stacked and ready to light', ['hills', 'mountains', 'coast', 'moor']],
    ['A dragon\'s tooth', 'a single tooth as tall as a man, stuck point-down in the ground'],
    ['A dark lighthouse', 'a lighthouse with no light and its door hanging open', ['coast']],
    ['A new rope bridge', 'a rope bridge across a gorge, much newer than it should be', ['badlands', 'mountains']],
    ['An ice cave', 'a blue ice cave with something dark frozen deep in the wall', ['tundra', 'mountains']],
    ['A sunken boat', 'a rowing boat sunk in the reeds with its oars still shipped', ['swamp']],
    ['A jade-eyed idol', 'a stone idol with jade eyes, choked in vines', ['jungle']],
    ['A buried tower', 'the top of a tower sticking out of a dune', ['desert']],
    ['A stone circle', 'a circle of squat stones half-hidden in the grass', ['plains', 'moor', 'hills', 'tundra']]
];

const DISCOVERY_DETAIL = [
    'Someone has left fresh flowers here.',
    'Tracks lead in. None lead out.',
    'A crow keeps watch from the highest point and will not leave.',
    'Scratched into the stone: a tally of forty-one marks and the word "SORRY".',
    'It is warm to the touch, even in the shade.',
    'Coins have been left here as offerings, and every one is from a different, far-off land.',
    'A child\'s chalk drawing nearby shows the same place, with a door that isn\'t there.',
    'The grass all around is flattened in a perfect circle.',
    'There is a faint smell of lamp oil and cinnamon.',
    'Someone has nailed up a warning in three languages, and the third is written backwards.',
    'A rusted key hangs from a nail beside it.',
    'Nothing living has touched it in years. Not moss, not birds, not insects.',
    'The horses refuse to go within twenty feet.',
    'Somebody has camped here recently, and tidily.',
    'Fresh hoofprints circle it three times, then stop.',
    'It is on the party\'s map, labeled in a hand none of them recognize.',
    'A small offering bowl holds a single copper.',
    'A detect magic spell would show a faint glow, if anyone thinks to cast one.',
    'An old notice is pinned up here: "REWARD", over a face too faded to make out.',
    'Bees have built a hive inside it, and the honey is a strange blue.',
    'The wind goes still around it.',
    'Initials are carved into it, and one set matches a traveler in the party.'
];

const DISCOVERY_HOOK = [
    'Whoever built it is still looking for it.',
    'The local lord would pay well to know it has been found, and pay more to keep it quiet.',
    'A map in the next town marks a treasure at exactly this spot.',
    'It is the twin of something the party has seen before.',
    'A cult has been using it, and they will be back tonight.',
    'It hides the way down to something much older.',
    'A Gazette story last month described this exact place and called it a hoax.',
    'Every night it moves a little closer to the next town.',
    'Whoever lies buried near here owed a great many people money.',
    'Its last visitor hid a journal nearby, and the final page is torn out.',
    'A sage would pay 50 gp for a careful drawing of it.',
    'It is one of seven, and someone is collecting them.'
];

// ── Roadside finds (a thing × where it lies) ──────────────
const FIND_THINGS = [
    'a dented brass compass that points steadily southwest',
    'a child\'s wooden sword with the name "Pim" burned into the hilt',
    'a single fine leather glove, left hand',
    'a pouch holding 3 cp and a lucky rabbit\'s foot',
    'an unsigned love letter, the ink run by rain',
    'a horseshoe with one nail hole too many',
    'a wanted poster for a halfling called Nimble Tess, reward 25 gp',
    'a clay pipe, still warm',
    'a broken wand that gives off one spark when shaken',
    'an iron key on a loop of red string',
    'a page torn from a spellbook, with half a cantrip on it',
    'a bundle of arrows fletched with blue feathers',
    'a carved bone die that rolls nothing but fours',
    'a tin of boot grease, nearly full',
    'a hand-drawn map of somebody\'s cellar',
    'a silver button stamped with three owls',
    'a small idol of a frog god, mid-sneeze',
    'a soldier\'s tin cup with a tooth mark in the rim',
    'a sealed jar of honey',
    'a song sheet for a ballad about a dragon and a baker',
    'a wooden leg, well made and well worn',
    'a copy of the Gazette, folded open to the obituaries',
    'a bag of marbles, one with a tiny eye inside',
    'a knitted scarf, very long and very striped',
    'a clay figure of a knight with a coin pressed into its belly',
    'a ring of brass keys that fit nothing nearby',
    'a bird-shaped whistle that makes no sound anyone can hear',
    'a coil of good silk rope, cut clean at one end',
    'a bent copper crown, child-sized',
    'a perfect arrowhead of black glass',
    'a cracked hand mirror that shows the sky a slightly wrong color',
    'a tooth the size of a thumb, drilled for a necklace',
    'a sack of seed potatoes',
    'an empty wax-sealed scroll case',
    'a single gold earring shaped like a fish',
    'a knitting needle, a ball of grey wool, and half a sock',
    'a deck of cards with one queen missing',
    'a bottle of ink in a color with no name',
    'a merchant\'s ledger whose last line reads "paid in full, in a manner of speaking"',
    'a tiny bronze bell from a cat\'s collar'
];

// terr = only on these terrains; w = only with one of these weather tags.
const FIND_SPOTS = [
    { t: 'lying in the middle of the way' },
    { t: 'half-buried at the side of the path' },
    { t: 'tucked under a little cairn of stones' },
    { t: 'beside a long-cold fire pit' },
    { t: 'hanging from a branch at head height', terr: ['forest', 'jungle', 'swamp', 'road', 'plains', 'hills', 'moor'] },
    { t: 'caught in a thornbush', terr: ['road', 'plains', 'hills', 'moor', 'forest'] },
    { t: 'jammed into a crack in a boulder', terr: ['hills', 'mountains', 'badlands', 'moor', 'desert', 'tundra', 'coast'] },
    { t: 'sitting neatly on top of a milestone', terr: ['road'] },
    { t: 'washed up on the tide line', terr: ['coast'] },
    { t: 'floating in a still pool', terr: ['swamp', 'jungle', 'forest', 'moor'] },
    { t: 'stuck in the mud', w: ['wet'] },
    { t: 'poking out of the sand', terr: ['desert', 'coast', 'badlands'] },
    { t: 'in the hollow of a dead tree', terr: ['forest', 'swamp', 'jungle', 'moor', 'hills'] },
    { t: 'wedged between two roots', terr: ['forest', 'jungle', 'swamp'] },
    { t: 'frozen into a puddle', w: ['cold'] },
    { t: 'under a fresh snowdrift', w: ['snow'] }
];

// ── Tonight's camp ───────────────────────────────────────
const CAMP_SITES = [
    { t: 'in the lee of a big boulder', terr: ['hills', 'mountains', 'moor', 'badlands', 'tundra', 'plains'] },
    { t: 'in an old drovers\' sheepfold', terr: ['moor', 'hills', 'plains', 'road'] },
    { t: 'in a dry cave mouth', terr: ['hills', 'mountains', 'badlands', 'coast', 'forest'] },
    { t: 'in the ruins of a toll house', terr: ['road'] },
    { t: 'in the yard of a roadside inn with no rooms left', terr: ['road'] },
    { t: 'on a sandy bend of a stream', terr: ['forest', 'plains', 'hills', 'moor', 'road'] },
    { t: 'inside a ring of old oaks', terr: ['forest', 'hills', 'plains'] },
    { t: 'in a hollow between two dunes', terr: ['desert', 'coast'] },
    { t: 'on a hummock above the waterline', terr: ['swamp'] },
    { t: 'on a hunters\' platform built on stilts', terr: ['swamp', 'jungle'] },
    { t: 'in a sea cave above the tide line', terr: ['coast'] },
    { t: 'in a snow hollow dug out of a drift', terr: ['tundra', 'mountains'], w: ['snow', 'cold'] },
    { t: 'under an overhang of red rock', terr: ['badlands', 'desert', 'mountains'] },
    { t: 'beside a lone standing stone', terr: ['moor', 'plains', 'hills', 'tundra'] },
    { t: 'under a huge, hollow fig tree', terr: ['jungle'] },
    { t: 'in a shepherd\'s summer hut', terr: ['hills', 'mountains', 'moor'] },
    { t: 'behind a tumbled wall' },
    { t: 'in a fold of ground out of the wind' },
    { t: 'at the edge of a burned-out farm', terr: ['road', 'plains', 'hills', 'forest'] },
    { t: 'by a spring with a carved stone lip' },
    { t: 'among the ribs of a beached ship', terr: ['coast'] },
    { t: 'on a ledge halfway up a canyon wall', terr: ['badlands', 'mountains'] },
    { t: 'under an upturned boat', terr: ['coast', 'swamp'] },
    { t: 'in a stand of pines', terr: ['forest', 'mountains', 'hills', 'tundra'] },
    { t: 'at an old campsite with a stone fire ring' },
    { t: 'in an abandoned watch post', terr: ['road', 'hills', 'mountains', 'coast'] },
    { t: 'on a temple porch, by leave of a sleepy priest', terr: ['road'] },
    { t: 'on a gravel bar in a dry riverbed', terr: ['desert', 'badlands', 'plains'] },
    { t: 'under the roots of a toppled tree', terr: ['forest', 'jungle', 'swamp'] }
];

const CAMP_GOOD = ruleTable([
    { t: 'Fresh water close by.' },
    { t: 'Plenty of dry firewood.', terr: ['road', 'plains', 'forest', 'hills', 'moor', 'coast', 'mountains', 'jungle', 'badlands'] },
    { t: 'Out of the wind entirely, so everyone sleeps warm.' },
    { t: 'A long view of the way ahead: the watch will see anything coming.', terr: ['plains', 'hills', 'moor', 'coast', 'mountains', 'desert', 'badlands', 'tundra'] },
    { t: 'Berries and mushrooms nearby: a {dc:10} {skill:wis:survival} check stretches supper.', terr: ['forest', 'hills', 'moor', 'jungle', 'swamp', 'road', 'plains'] },
    { t: 'Soft ground and sweet grass to sleep on.', terr: ['plains', 'moor', 'hills', 'forest', 'road'] },
    { t: 'A stack of firewood left by the last campers, with a note: "Pay it forward."' },
    { t: 'Fish in the stream, if anyone has a line.', terr: ['forest', 'plains', 'hills', 'moor', 'road', 'swamp', 'mountains'] },
    { t: 'Dry under a rock roof, whatever the sky does.', w: ['wet', 'snow'] },
    { t: 'A hot spring nearby. Everyone smells better by morning.', terr: ['mountains', 'hills', 'tundra', 'badlands'] },
    { t: 'Quiet. Truly quiet. Even the bard falls asleep early.' },
    { t: 'A clear sky and good stars to steer by tomorrow.', w: ['clear'] },
    { t: 'Shade all afternoon and a cool breeze after dark.', w: ['hot'] },
    { t: 'Mussels on the rocks at low tide: supper for free.', terr: ['coast'] }
]);

const CAMP_BAD = [
    { t: 'The ground is all roots and stones. Nobody sleeps well.' },
    { t: 'Ants. Many ants. Ants with plans.', terr: ['road', 'plains', 'forest', 'hills', 'jungle', 'desert', 'badlands', 'swamp'] },
    { t: 'No dry wood anywhere: a cold supper and a colder night.', w: ['wet', 'snow'] },
    { t: 'The only water is brackish and needs boiling.', terr: ['swamp', 'coast', 'desert', 'badlands', 'moor'] },
    { t: 'Mosquitoes in clouds.', terr: ['swamp', 'jungle', 'forest', 'moor', 'coast'] },
    { t: 'The wind finds every gap in every blanket.' },
    { t: 'Another camp is within earshot, and they sing badly until midnight.', terr: ['road', 'plains', 'forest', 'hills', 'coast'] },
    { t: 'The site floods a little after midnight.', w: ['wet'] },
    { t: 'Biting cold after sunset; without warm bedding, nobody gets a full night.', w: ['cold'] },
    { t: 'Sand gets into everything, including dinner.', terr: ['desert', 'coast', 'badlands'] },
    { t: 'The smoke won\'t rise and hangs over the camp all night.' },
    { t: 'A smell from the undergrowth that nobody wants to look into.', terr: ['forest', 'jungle', 'swamp', 'moor', 'road', 'hills', 'plains'] },
    { t: 'The ground slopes, and everyone wakes a few feet downhill.' },
    { t: 'Too hot to sleep until well after midnight.', w: ['hot'] }
];

const NIGHT_WATCHES = ['First watch', 'Middle watch', 'Last watch'];

const NIGHT_EVENTS = ruleTable([
    { t: 'A fox steals a boot and is chased, in vain, by the paladin.' },
    { t: 'Something large splashes in the water nearby. Then all is quiet.', terr: ['swamp', 'coast', 'forest', 'jungle'] },
    { t: 'A shooting star falls very close. In the morning there is a scorched hole a few hundred yards off.', w: ['clear'] },
    { t: 'Music drifts across the dark: pipes and drums, far away, until dawn.' },
    { t: 'A lone traveler without a light walks past the camp, nods to the watch, and is gone when anyone looks again.' },
    { t: 'The horses stamp and snort at nothing for an hour.' },
    { t: 'Someone talks in their sleep and names a place nobody has heard of.' },
    { t: 'An owl lands on the nearest pack and watches the watch.' },
    { t: 'A small fire flickers on a far hill for most of the night, then goes out all at once.' },
    { t: 'Wolves howl far off, then much closer, then far off again.', terr: ['forest', 'hills', 'mountains', 'tundra', 'moor', 'plains'] },
    { t: 'A cold draft blows through the camp, and the fire leans east.' },
    { t: 'Footsteps circle just outside the firelight. A {dc:13} {skill:wis:perception} check spots a curious young goblin, who flees.' },
    { t: 'Rain starts in the night and finds every hole in every tent.', w: ['wet'] },
    { t: 'Snow falls softly overnight, and morning shows four-toed tracks right up to the fire.', w: ['snow'] },
    { t: 'Lights move on the water, slow and steady, then sink.', terr: ['coast', 'swamp'] },
    { t: 'A merchant\'s guard from another camp wanders over to ask for a light and stays to talk till dawn.', terr: ['road', 'plains'] },
    { t: 'One of the stars overhead blinks twice, then moves.', w: ['clear'] },
    { t: 'A raccoon gets into the rations. One character\'s food for the day is gone.', terr: ['road', 'forest', 'plains', 'hills', 'swamp'] },
    { t: 'A low rumble shakes the ground for a few seconds, then stops.', terr: ['mountains', 'hills', 'badlands'] },
    { t: 'The tide comes up farther than anyone expected and soaks the bedrolls.', terr: ['coast'] },
    { t: 'Bats pour out of somewhere close by at dusk, thousands of them.', terr: ['badlands', 'mountains', 'jungle', 'desert', 'hills'] },
    { t: 'Out in the dark a woman calls a name, over and over, never getting closer.' },
    { t: 'A thief tries to slip a purse from a sleeper. A {dc:12} {skill:wis:perception} check from the watch catches them.' },
    { t: 'Nothing happens, but the watch can\'t shake the feeling of being watched.' },
    { t: 'A figure stands perfectly still on a distant ridge all night. At dawn it is a dead tree. Probably.' }
]);

// ── More lines (R8). Swapped in by their share of the whole list through later draws:
// discovery hooks under their own seed (travelMoreHook), camp notes and night-watch lines
// at the end of rollCamp, so an old link keeps its days.
const DISCOVERY_HOOK_MORE = [
    'A traveling scholar left a note here: "Do not tell the abbot."',
    'The nearest village pretends it does not exist.',
    'Someone has left fresh flowers here every day for years.',
    'It matches a carving over the door of the town hall back the way the party came.',
    'A thieves\' mark scratched nearby says "safe to sleep, not safe to dig."',
    'A bounty hunter is watching it, waiting for someone in particular to show up.',
    'It is older than the road, and the road bends politely around it.',
    'The local priest says it is cursed; the local innkeeper says it is good for business.',
    'A rival party passed by yesterday and left their mark on it.',
    'Children in the next town sing a rhyme that describes it exactly.',
    'Under it, wrapped in oilcloth, is a letter addressed to one of the party.',
    'Every full moon, something comes to it out of the dark to grieve.'
];
const CAMP_GOOD_MORE = ruleTable([
    { t: 'A shepherd\'s dog adopts the camp and keeps watch all night.', terr: ['hills', 'moor', 'plains', 'mountains', 'road'] },
    { t: 'Flat stones ring the fire and stay warm long after it dies.' },
    { t: 'A hollow tree keeps the packs dry.', terr: ['forest', 'jungle', 'swamp', 'hills'] },
    { t: 'Wild herbs grow nearby, and supper tastes like an inn\'s for once.', terr: ['forest', 'hills', 'moor', 'plains', 'road', 'mountains'] },
    { t: 'Someone left a dry bundle of kindling and a tinderbox under a rock.' },
    { t: 'A brook loud enough to cover the snoring.', terr: ['forest', 'hills', 'mountains', 'moor', 'plains', 'road'] },
    { t: 'A rabbit warren close by: a {dc:12} {skill:wis:survival} check means stew.', terr: ['plains', 'hills', 'moor', 'forest', 'road'] },
    { t: 'The wind drops at sunset, and the night is perfectly still.' },
    { t: 'Rock walls on three sides: only one way in to watch.' },
    { t: 'A pool of clean, cold water in a cave that never freezes.', terr: ['mountains', 'hills', 'tundra', 'badlands'] },
    { t: 'A sea breeze keeps the bugs away all night.', terr: ['coast'] },
    { t: 'A big flat rock holds the day\'s heat well into the night.', terr: ['desert', 'badlands', 'mountains'] }
]);
const CAMP_BAD_MORE = [
    { t: 'An old grave lies right where the tent should go, and nobody will sleep beside it.' },
    { t: 'Something has marked this spot as its territory, and the smell says so.' },
    { t: 'The rock overhead drips all night, one drop at a time, on the same sleeper.' },
    { t: 'Frogs. Loud frogs. All night.', terr: ['swamp', 'jungle', 'forest', 'moor'] },
    { t: 'The only firewood is green and smokes more than it burns.', terr: ['forest', 'jungle', 'swamp', 'hills', 'road', 'plains'] },
    { t: 'Another group of travelers got here first and took the best spot.', terr: ['road', 'plains', 'coast', 'hills'] },
    { t: 'Ticks in the long grass. Everyone spends the morning checking.', terr: ['plains', 'moor', 'forest', 'hills', 'road'] },
    { t: 'The tide comes in at midnight, and the only dry ground is a narrow ledge.', terr: ['coast'] },
    { t: 'Scorpions under every stone.', terr: ['desert', 'badlands'] },
    { t: 'Ice in the waterskins by morning, and the first hour on the road is miserable.', w: ['cold', 'snow'] },
    { t: 'The wind turns at midnight and blows the smoke straight into the tents.' },
    { t: 'Somebody forgot the salt, and supper is a quiet, sad affair.' },
    { t: 'Loose rock above the camp: every gust sends pebbles rattling down.', terr: ['mountains', 'badlands', 'hills'] }
];
const NIGHT_EVENTS_MORE = ruleTable([
    { t: 'A hedgehog wanders into camp and falls asleep in someone\'s boot.', terr: ['forest', 'plains', 'hills', 'road', 'moor'] },
    { t: 'A pack is found open in the morning with nothing missing. Something has been added: a smooth white pebble.' },
    { t: 'A bell rings three times somewhere in the dark. There is no village for miles.' },
    { t: 'The fire burns blue for a few minutes, then goes back to normal.' },
    { t: 'A moth the size of a hand lands on the watch\'s sleeve and stays until dawn.' },
    { t: 'Thunder rolls far off for an hour, though the sky stays clear.', w: ['clear'] },
    { t: 'Riders pass in the dark. They stop, look at the camp, and ride on without a word.', terr: ['road', 'plains', 'hills', 'moor'] },
    { t: 'Something big sniffs round the edge of the camp. At dawn, a {dc:12} {skill:wis:survival} check reads the tracks: a bear, and a curious one.', terr: ['forest', 'hills', 'mountains', 'tundra'] },
    { t: 'A child laughs, once, somewhere in the trees. Nothing else.', terr: ['forest', 'jungle', 'swamp'] },
    { t: 'Seals bark on the rocks all night.', terr: ['coast'] },
    { t: 'The sand hums in the wind, a low note that sets everyone\'s teeth on edge.', terr: ['desert', 'badlands'] },
    { t: 'The watch dozes off and wakes to find the fire built back up by someone else.' },
    { t: 'A wounded crow hops up to the fire and lets the watch bind its wing.' },
    { t: 'Two voices argue in whispers just past the firelight, and fall silent when the watch stands up.' },
    { t: 'Green and silver lights ripple across the northern sky for an hour.', terr: ['tundra', 'mountains'], w: ['clear', 'cold'] },
    { t: 'An old wolf, white at the muzzle, lies down just outside the firelight and is gone before dawn.', terr: ['forest', 'hills', 'tundra', 'mountains', 'moor'] },
    { t: 'Something tugs gently at a bedroll. In the morning, every boot is tied to its neighbor.' }
]);

// ── The sky: the moon and the daylight ───────────────────
// art: the painted moon, img/calendar/moon-<art>.webp (moonArtHtml)
const MOON_PHASES = [
    { icon: '🌑', label: 'New moon', art: 'new' }, { icon: '🌒', label: 'Waxing crescent', art: 'waxing-crescent' },
    { icon: '🌓', label: 'First quarter', art: 'first-quarter' }, { icon: '🌔', label: 'Waxing gibbous', art: 'waxing-gibbous' },
    { icon: '🌕', label: 'Full moon', art: 'full' }, { icon: '🌖', label: 'Waning gibbous', art: 'waning-gibbous' },
    { icon: '🌗', label: 'Last quarter', art: 'last-quarter' }, { icon: '🌘', label: 'Waning crescent', art: 'waning-crescent' }
];
const MOON_MONTH = 29.5;

// The painted pictures for a weather kind and a moon phase, as <img> tags (the icons stay for plain text).
function weatherArtHtml(kind, cls = 'wx-art') {
    return `<img class="${cls}" src="img/weather/${kind === 'icestorm' ? 'ice-storm' : kind}.webp" alt="" width="64" height="64" decoding="async">`;
}
function moonArtHtml(phase, cls = 'moon-art') {
    return `<img class="${cls}" src="img/calendar/moon-${MOON_PHASES[phase].art}.webp" alt="" width="20" height="20" decoding="async">`;
}

// Rough hours from sunrise to sunset (a table ruling, not a rule).
const TRAVEL_DAYLIGHT = {
    temperate: { spring: 12, summer: 15, autumn: 11, winter: 9 },
    cold:      { spring: 14, summer: 19, autumn: 10, winter: 5 },
    arid:      { spring: 12, summer: 14, autumn: 11, winter: 10 },
    tropical:  { spring: 12, summer: 13, autumn: 12, winter: 11 }
};

// Weather lore at dusk that points at tomorrow's real weather.
const TOMORROW_SIGNS = {
    storm: ['The air goes heavy and the birds fall silent by evening. Something big is coming.',
        'A ring around the moon, and every old knee in the party aches. A storm by tomorrow.',
        'Clouds pile up in towers on the horizon, black at the bottom.',
        'The animals are jumpy, and the air tastes of metal.'],
    wind: ['Clouds race across the sky at dusk. Tomorrow will be blowy.',
        'Crows and gulls hurry inland. A strong wind is coming.',
        'The fire roars and gutters in sudden gusts all evening.'],
    wet: ['The leaves turn their pale sides up. Rain tomorrow.',
        'The smell of rain is on the wind, though none falls yet.',
        'Spiders take in their webs. Rain is on the way.',
        'Mares\' tails stretch high across the sky. Wet weather tomorrow.',
        'Swallows fly low over the ground. Rain soon.'],
    snow: ['The sky goes the flat yellow-grey that means snow.',
        'It smells of snow: clean and metal-cold.',
        'The clouds hang low, heavy, and soft-edged. Snow by morning.'],
    fog: ['A still, damp evening without a breath of wind. Expect fog.',
        'Mist creeps out of the low ground at dusk.'],
    hot: ['The night stays warm, and the stars blur in the haze. A scorcher tomorrow.',
        'Not a breath of wind after dark. Tomorrow will be hot.'],
    cold: ['The wind swings north, and the stars look sharp as nails. A cold snap is coming.',
        'Frost on the bedrolls before midnight. Tomorrow will be colder.'],
    fair: ['Red sky at night: fair weather tomorrow, says everyone.',
        'A clear evening and a heavy dew. Tomorrow looks fine.',
        'Smoke from the fire rises straight up. Settled weather ahead.',
        'The swallows fly high. A fair day tomorrow.'],
    same: ['The sky gives nothing away. Tomorrow will likely be much like today.',
        'No change on the wind. More of the same tomorrow.']
};

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
    if (heavy) fx.push({ src: 'ruling', text: ruleText(`Heavy ${heavy}: the area is lightly obscured, so {skill:wis:perception} checks that rely on sight have disadvantage.`) });
    if (w.kind === 'fog') fx.push({ src: 'ruling', text: 'Thick fog: everything beyond 30 feet is heavily obscured, and a creature trying to see something there is effectively blinded.' });
    if (w.morningFog) fx.push({ src: 'ruling', text: 'Morning fog: the area is lightly obscured until about midday.' });
    if (w.slows) fx.push({ src: 'ruling', text: 'Hard going: the route counts as difficult terrain today, so the party covers half the distance.' });
    if (w.wind === 3) fx.push({ src: 'ruling', text: 'Gale-force wind: ranged weapon attacks have disadvantage, open flames blow out, and flying is a struggle.' });
    else if (w.wind === 2) fx.push({ src: 'ruling', text: 'Strong wind: unshielded flames gutter out, and arrows drift.' });
    if (w.band >= 6) fx.push({ src: 'SRD', text: 'Hot weather: each character needs two gallons of water today instead of one.' });
    if (w.band === 7) fx.push({ src: 'ruling', text: ruleText('Scorching heat: anyone in medium or heavy armor, or short of water, makes a {save:con} save each hour or gains a level of exhaustion (DC at your call).') });
    if (w.band === 0) fx.push({ src: 'ruling', text: ruleText('Bitter cold: anyone without cold-weather gear makes a {save:con} save each hour outdoors or gains a level of exhaustion (DC at your call).') });
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
// Does a table entry suit the land and the weather? (terr = only on these terrains, w = needs one of these tags)
function travelFits(e, terrain, weather) {
    return (!e.terr || e.terr.includes(terrain)) && (!e.w || e.w.some(tag => weather.tags.includes(tag)));
}

function travelCap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Pick from entries that fit and haven't been used; fall back to any that fit.
function travelFresh(list, used, title) {
    const fresh = list.filter(e => !used.includes(title(e)));
    return travelPick(fresh.length ? fresh : list);
}

function composeTraveler(used) {
    const [t, who] = travelFresh(TRAVELER_WHO, used, w => w[0]);
    const d = `${travelCap(who)}, ${travelPick(TRAVELER_HEADING)}. They say ${travelPick(TRAVELER_NEWS)}. ${travelPick(TRAVELER_ASK)}`;
    return { k: 'travelers', t, d };
}

function composeDiscovery(terrain, used) {
    const fits = DISCOVERY_WHAT.filter(w => !w[2] || w[2].includes(terrain));
    const [t, what] = travelFresh(fits, used, w => w[0]);
    const ev = { k: 'discovery', t, d: `The party comes upon ${what}. ${travelPick(DISCOVERY_DETAIL)}` };
    if (rand() < 0.5) ev.hook = travelPick(DISCOVERY_HOOK);
    return ev;
}

// One of the newer lines in place of cur, by its share of the whole list (always two draws).
function travelSwap(cur, old, more) {
    const newer = travelPick(more);
    return rand() < more.length / (old.length + more.length) ? newer : cur;
}

// A composed discovery's hook may give way to a newer one (R8), under a seed of its own, so
// the caller's own stream doesn't move. Fixed events keep their hooks. Returns a copy.
function travelMoreHook(ev, seed) {
    const hook = withSeed(seed, () => travelSwap(ev.hook, DISCOVERY_HOOK, DISCOVERY_HOOK_MORE));
    return ev.hook && DISCOVERY_HOOK.includes(ev.hook) ? { ...ev, hook } : ev;
}

function rollRoadEvent(terrain, weather, used = []) {
    const r = rand();
    if (r < 0.2) return { k: 'quiet', t: 'A quiet day', d: travelPick(QUIET_DAYS) };
    if (r < 0.35) return composeTraveler(used);
    if (r < 0.5) return composeDiscovery(terrain, used);
    const fits = ROAD_EVENTS.filter(e => travelFits(e, terrain, weather));
    return travelFresh(fits, used, e => e.t);
}

// ── Scenery, finds, camp, sky, signs ─────────────────────
function rollScene(terrain, season) {
    const land = TRAVEL_SCENERY[terrain] || TRAVEL_SCENERY.road;
    const parts = [travelPick(land.sights)];
    const touches = (TRAVEL_SEASON_TOUCH[season] || []).filter(s => !s.terr || s.terr.includes(terrain));
    if (touches.length && rand() < 0.6) parts.push(travelPick(touches).t);
    parts.push(travelPick(land.sounds));
    return parts.join(' ');
}

// About a third of days turn something up by the way.
function rollFind(terrain, weather) {
    if (rand() >= 0.35) return null;
    const spot = travelPick(FIND_SPOTS.filter(s => travelFits(s, terrain, weather)));
    return `${travelCap(travelPick(FIND_THINGS))}, ${spot.t}.`;
}

// Where the party sleeps, one good or bad thing about it, and maybe something in the night.
// quietNight: today's event already happened at camp, so the watch passes without incident.
function rollCamp(terrain, weather, quietNight) {
    const site = travelPick(CAMP_SITES.filter(s => travelFits(s, terrain, weather))).t;
    const r = rand();
    const good = CAMP_GOOD.filter(s => travelFits(s, terrain, weather));
    const bad = CAMP_BAD.filter(s => travelFits(s, terrain, weather));
    const note = r < 0.5 ? { good: true, t: travelPick(good).t } : r < 0.85 ? { good: false, t: travelPick(bad).t } : null;
    let watch = null;
    if (rand() < 0.45 && !quietNight) {
        watch = { when: travelPick(NIGHT_WATCHES), t: travelPick(NIGHT_EVENTS.filter(s => travelFits(s, terrain, weather))).t };
    }
    // More notes and night-watch lines (R8), drawn last (always four draws).
    const fits = list => list.filter(s => travelFits(s, terrain, weather)).map(s => s.t);
    const goodNote = travelSwap(note && note.t, good, fits(CAMP_GOOD_MORE));
    const badNote = travelSwap(note && note.t, bad, fits(CAMP_BAD_MORE));
    const night = travelSwap(watch && watch.t, NIGHT_EVENTS.filter(s => travelFits(s, terrain, weather)), fits(NIGHT_EVENTS_MORE));
    if (note) note.t = note.good ? goodNote : badNote;
    if (watch) watch.t = night;
    return { site, note, watch };
}

function moonPhase(age) {
    return Math.floor(((age % MOON_MONTH) / MOON_MONTH) * 8 + 0.5) % 8;
}

// The sky for one day: moon phase, daylight hours, and the hours on the road after sunset.
function travelSky(opts, moonAge, weather, hours) {
    const phase = moonPhase(moonAge);
    const daylight = (TRAVEL_DAYLIGHT[opts.climate] || TRAVEL_DAYLIGHT.temperate)[opts.season] || 12;
    const dark = Math.max(0, hours - daylight);
    const moonlit = phase === 4 && (weather.kind === 'clear' || weather.kind === 'partly');
    let effect = null;
    if (dark) {
        const when = `The last ${dark === 1 ? 'hour' : `${dark} hours`} on the road ${dark === 1 ? 'is' : 'are'} after sunset.`;
        effect = moonlit
            ? ruleText(`${when} The full moon gives dim light: the area is lightly obscured, so {skill:wis:perception} checks that rely on sight have disadvantage.`)
            : `${when} Without a light source or darkvision, it is darkness: the area is heavily obscured.`;
    }
    return { phase, daylight, dark, moonlit, effect };
}

// A dusk sign that points at tomorrow's weather (tm), compared with today's (w).
function tomorrowSign(w, tm) {
    let kind;
    if (tm.level === 3) kind = 'storm';
    else if (tm.kind === 'gale' || tm.kind === 'dust') kind = 'wind';
    else if (tm.tags.includes('snow')) kind = 'snow';
    else if (tm.tags.includes('wet')) kind = 'wet';
    else if (tm.kind === 'fog' || tm.morningFog) kind = 'fog';
    else if (tm.band >= 6 && w.band < 6) kind = 'hot';
    else if (tm.band <= w.band - 2) kind = 'cold';
    else if (tm.wind >= 2) kind = 'wind';
    else kind = tm.kind === w.kind ? 'same' : 'fair';
    return travelPick(TOMORROW_SIGNS[kind]);
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

// Whole hours on the road to cover some miles at a day's pace (the gallop hour comes first).
function travelHoursFor(miles, dist) {
    const slow = dist.difficult ? 2 : 1;
    const rate = dist.mph / slow;
    const first = dist.gallop ? 8 / slow : rate;
    if (miles <= first) return 1;
    return Math.min(dist.hours, 1 + Math.ceil((miles - first) / rate - 1e-9));
}

// ── A whole journey ──────────────────────────────────────
// opts: { climate, season, terrain, pace, hours, gallop, miles (total, 0 = open road) }
// Returns days 1..n, stopping early on the day the party arrives.
function rollJourney(seed, opts, days) {
    const out = [];
    let covered = 0;
    const used = [];
    // Weather for day k, from its own seed; tomorrow's is needed for today's dusk sign.
    const skies = [];
    const weatherOn = k => {
        if (!skies[k]) skies[k] = withSeed(deriveSeed(seed, 'w' + k), () => rollWeather(opts.climate, opts.season, k > 1 ? weatherOn(k - 1) : null));
        return skies[k];
    };
    const moonStart = withSeed(deriveSeed(seed, 'moon'), () => rand() * MOON_MONTH);
    for (let k = 1; k <= days; k++) {
        const weather = weatherOn(k);
        const event = travelMoreHook(withSeed(deriveSeed(seed, 'e' + k), () => rollRoadEvent(opts.terrain, weather, used)), deriveSeed(seed, 'e' + k + '.more'));
        const scene = withSeed(deriveSeed(seed, 'v' + k), () => rollScene(opts.terrain, opts.season));
        const find = withSeed(deriveSeed(seed, 'f' + k), () => rollFind(opts.terrain, weather));
        let dist = travelDistance(opts, weather);
        let today = dist.miles;
        const goal = Number(opts.miles) || 0;
        if (goal && covered + today >= goal) today = Math.round((goal - covered) * 10) / 10;
        covered = Math.round((covered + today) * 10) / 10;
        const arrived = !!goal && covered >= goal;
        // The last day is shorter: count only the hours it takes to arrive (for forced-march saves and the dark).
        if (arrived && today < dist.miles) dist = travelDistance({ ...opts, hours: travelHoursFor(today, dist) }, weather);
        const sky = travelSky(opts, moonStart + k - 1, weather, dist.hours);
        // Arriving means a bed in town: no camp and no forecast.
        const camp = arrived ? null : withSeed(deriveSeed(seed, 'c' + k), () => rollCamp(opts.terrain, weather, event.k === 'camp'));
        const tomorrow = arrived ? null : weatherOn(k + 1);
        const sign = arrived ? null : withSeed(deriveSeed(seed, 's' + k), () => tomorrowSign(weather, tomorrow));
        out.push({ day: k, weather, event, scene, find, sky, camp, sign, dist, today, covered, arrived });
        used.push(event.t);
        if (arrived) break;
    }
    return out;
}

// Plain-text lines for one day (Copy Day).
function travelDayText(d, opts) {
    const w = d.weather;
    const ev = ROAD_EVENT_KINDS[d.event.k];
    const goal = Number(opts.miles) || 0;
    const moon = MOON_PHASES[d.sky.phase];
    const lines = [
        `Day ${d.day}: ${TRAVEL_TERRAIN[opts.terrain].label}, ${TRAVEL_CLIMATES[opts.climate].label.toLowerCase()} ${opts.season}`,
        `  ${d.scene}`,
        `Weather: ${WEATHER_KINDS[w.kind].icon} ${weatherHeadline(w)}. ${weatherDetail(w)}`,
        `  ${w.flavor}`,
        ...w.effects.map(f => `  - ${f.text}${f.src === 'ruling' ? ' (ruling)' : ''}`),
        `Sky: ${moon.icon} ${moon.label}, about ${d.sky.daylight} hours of daylight.`,
        `${ev.icon} ${d.event.k === 'quiet' ? ev.label : `${ev.label}: ${d.event.t}`}. ${d.event.d}${d.event.hook ? ` Hook: ${d.event.hook}` : ''}`,
        ...(d.find ? [`🪶 By the way: ${d.find}`] : []),
        `Travel: ${d.today} miles (${TRAVEL_PACES[d.dist.pace].label.toLowerCase()} pace, ${d.dist.hours} hours)` +
            (goal ? `. ${d.covered} of ${goal} miles${d.arrived ? ', arrived!' : ''}` : `. ${d.covered} miles so far`),
        ...d.dist.notes.map(n => `  - ${n}`),
        ...d.dist.forced.map(f => ruleText(`  - Hour ${f.hour}: {save:con} save DC ${f.dc}, or one level of exhaustion.`)),
        ...(d.sky.effect ? [`  - ${d.sky.effect}`] : [])
    ];
    if (d.camp) {
        lines.push(`🏕️ Tonight: the party camps ${d.camp.site}.${d.camp.note ? ` ${d.camp.note.t}` : ''}`);
        if (d.camp.watch) lines.push(`  - ${d.camp.watch.when}: ${d.camp.watch.t}`);
    }
    if (d.sign) lines.push(`🌅 Signs for tomorrow: ${d.sign}`);
    return lines.join('\n');
}
