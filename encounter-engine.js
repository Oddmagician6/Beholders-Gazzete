/* ============================================
   ENCOUNTER ENGINE (F25): party XP budgets, difficulty, and a seeded encounter roll.
   Budgets: the XP Budget per Character table of the System Reference Document 5.2
   (CC-BY 4.0): add up each character's number for the difficulty, then spend it on monsters.
   Monster XP and CR: monsters-data.js (SRD 5.1). Rolls use rand() from rng.js.
   Habitats, foe groups, and scenes (rollThemedEncounter, rollEncounterScene) are the Gazette's own.
   ============================================ */

// Level → [Low, Moderate, High] XP per character.
const ENCOUNTER_BUDGET = [null,
    [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100],
    [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100],
    [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800],
    [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]];

const ENCOUNTER_LEVELS = {
    low: { label: 'Low', icon: '🟢', text: 'A scary moment or two, but the party should win without losing anyone. Some may need healing afterwards.' },
    moderate: { label: 'Moderate', icon: '🟡', text: 'Could go badly without healing and other resources. Weaker characters may drop, and someone could die.' },
    high: { label: 'High', icon: '🔴', text: 'Could be lethal for one or more characters. The party needs smart tactics, quick thinking, and some luck.' },
    over: { label: 'Beyond High', icon: '💀', text: 'More XP than the High budget. Expect deaths, or give the party a way to run, parley, or even the odds.' }
};

const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map(m => [m.id, m]));

function crValue(cr) {
    const [a, b] = String(cr).split('/').map(Number);
    return b ? a / b : a;
}

// groups: [{ count, level }] → each difficulty's budget for the whole party.
function partyBudget(groups) {
    const b = { low: 0, moderate: 0, high: 0, chars: 0, levels: 0 };
    groups.forEach(({ count, level }) => {
        const row = ENCOUNTER_BUDGET[level];
        if (!row || count < 1) return;
        b.low += row[0] * count; b.moderate += row[1] * count; b.high += row[2] * count;
        b.chars += count; b.levels += level * count;
    });
    b.avgLevel = b.chars ? b.levels / b.chars : 0;
    return b;
}

// list: [{ m, count }]
function encounterXp(list) {
    return list.reduce((t, e) => t + e.m.xp * e.count, 0);
}

function rateEncounter(xp, budget) {
    if (!xp || !budget.chars) return null;
    return xp <= budget.low ? 'low' : xp <= budget.moderate ? 'moderate' : xp <= budget.high ? 'high' : 'over';
}

// Warnings in the spirit of the SRD 5.2 troubleshooting advice (the wording is the Gazette's).
function encounterNotes(list, budget) {
    const notes = [];
    const creatures = list.reduce((t, e) => t + e.count, 0);
    if (!creatures || !budget.chars) return notes;
    if (creatures > budget.chars * 2) notes.push(`${creatures} creatures against ${budget.chars} character${budget.chars === 1 ? '' : 's'}: more than two each makes the fight swingy. Mix in weaker foes the party can drop quickly.`);
    const big = list.filter(e => crValue(e.m.cr) > budget.avgLevel);
    if (big.length) notes.push(`${big.map(e => e.m.name).join(', ')} ${big.length === 1 ? 'has' : 'have'} a CR above the party's level, so one hit could drop a character outright.`);
    const zero = list.filter(e => crValue(e.m.cr) === 0).reduce((t, e) => t + e.count, 0);
    if (zero > budget.chars) notes.push('A crowd of CR 0 creatures mostly slows the table down. A swarm does the same job with one stat block.');
    if (list.length > 3) notes.push(`${list.length} different stat blocks to run. Two or three is easier to manage at the table.`);
    return notes;
}

function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
}

// A random encounter that spends most of the budget and rates at the difficulty asked for:
// a lead monster (now and then a lone boss) plus up to two kinds of weaker support,
// no CR above the party's level, at most two creatures per character.
function rollEncounter(budget, diff, type = '') {
    const target = budget[diff];
    const maxCr = Math.max(0.125, Math.floor(budget.avgLevel));
    const pool = MONSTERS.filter(m => m.xp > 0 && m.xp <= target && crValue(m.cr) <= maxCr && (!type || m.type === type));
    if (!pool.length) return [];
    return fillEncounter(pool, budget, diff);
}

// Spend the budget from pool. leadPool (optional) narrows who can lead; without it the
// draws are exactly the old rollEncounter's, so quest links keep their monsters.
function fillEncounter(pool, budget, diff, leadPool = null) {
    const target = budget[diff];
    const cap = Math.max(2, budget.chars * 2);
    const floor = diff === 'high' ? budget.moderate : diff === 'moderate' ? budget.low : 0;
    let best = [], bestXp = 0;
    for (let t = 0; t < 120 && !(bestXp > floor && bestXp >= target * 0.8); t++) {
        const rolledKinds = 1 + (rand() < 0.45 ? 1 : 0) + (rand() < 0.25 ? 1 : 0);
        const top = budget.chars <= 2 || rand() < 0.2 ? 1 : 0.7;
        const themed = !!(leadPool && leadPool.length);
        const base = themed ? leadPool : pool;
        const leads = base.filter(m => m.xp >= target * 0.15 && m.xp <= target * top);
        const lead = pick(leads.length ? leads : base);
        // A group's leader brings followers rather than copies of itself, when it has any.
        const kinds = themed && rolledKinds === 1 && pool.some(m => m.xp < lead.xp) ? 2 : rolledKinds;
        const list = [{ m: lead, count: 1 }];
        let spent = lead.xp, count = 1;
        const room = () => Math.min(cap - count, Math.floor((target - spent) / lead.xp));
        // A lone kind fills the budget with more of the same; a lead may bring a twin.
        const more = kinds === 1 ? room() : rand() < 0.3 ? Math.min(1, room()) : 0;
        if (more > 0) { list[0].count += more; spent += lead.xp * more; count += more; }
        for (let k = 1; k < kinds && count < cap; k++) {
            const left = target - spent;
            const support = pool.filter(m => m.xp < lead.xp && m.xp <= left && !list.some(e => e.m === m));
            if (!support.length) break;
            const m = pick(support);
            const most = Math.min(cap - count, Math.floor(left / m.xp));
            const n = Math.max(1, Math.ceil(most * (0.5 + rand() * 0.5)));
            list.push({ m, count: n });
            spent += m.xp * n; count += n;
        }
        // A group short of its budget sends more of its last followers.
        const last = list[list.length - 1];
        const extra = themed && spent < target * 0.8 ? Math.min(cap - count, Math.floor((target - spent) / last.m.xp)) : 0;
        if (extra > 0) { last.count += extra; spent += last.m.xp * extra; count += extra; }
        if (spent > bestXp) { best = list; bestXp = spent; }
    }
    return best;
}

/* ── Habitats, foe groups, and the scene (deep-expansion pass, 2026-10-11) ──────────
   A rolled fight can keep to one habitat and one group of foes that belong together
   (goblins ride wolves; cultists bring imps). Every fight, rolled or built by hand, also
   gets a scene from its own seed: where it happens, what the foes are doing, who notices
   whom, distance, light, the ground, a leader, tactics, morale, a price to parley, and a twist.
   rollEncounter() above is unchanged, so quest links replay the same monsters. */

// monsters: who lives there (space-separated ids). places finish "The Ambush …".
// ground: features with their rules. hazards: {dc} {dmg} are filled by party level.
// dist: [dice, sides, × feet] for how far apart the two sides start. sky: false underground.
const ENC_HABITATS = {
    forest: { label: "Forest", icon: "🌲", dist: [2, 6, 10], sky: true,
        monsters: "awakened-shrub awakened-tree baboon badger bat black-bear blink-dog boar brown-bear bugbear cat centaur constrictor-snake deer dire-wolf druid dryad elk ettercap flying-snake giant-badger giant-boar giant-centipede giant-elk giant-frog giant-owl giant-poisonous-snake giant-spider giant-toad giant-wasp giant-wolf-spider gnoll goblin green-dragon-wyrmling young-green-dragon adult-green-dragon ancient-green-dragon green-hag hawk hobgoblin owl owlbear panther phase-spider poisonous-snake pseudodragon raven satyr scout shambling-mound sprite swarm-of-insects swarm-of-ravens swarm-of-spiders swarm-of-wasps swarm-of-centipedes tiger treant giant-ape unicorn werewolf-human werewolf-hybrid werewolf-wolf wereboar-human wereboar-hybrid wereboar-boar werebear-human werebear-hybrid werebear-bear weretiger-human weretiger-hybrid weretiger-tiger wolf worg orc ogre troll bandit bandit-captain will-o-wisp ape",
        places: ["at Hanged Man's Oak", "in the Mossy Glade", "in Crowfoot Hollow", "on the Charcoal Burners' Track", "at the Witch's Well", "in the Blackthorn Thicket", "under the Old Grey Beeches", "at Fallow Dell", "by the Woodcutters' Ruin", "on the Deer Path", "in Greenmantle Wood", "at the Split Stump"],
        ground: ["Trunks thick enough to hide behind give half cover.", "A bramble thicket in the middle is difficult terrain.", "A fallen oak lies across the clearing: three-quarters cover for anyone crouched behind it.", "Low branches: a creature can climb 10 feet up for a better shot (climbing costs double movement).", "Thick undergrowth makes the edges lightly obscured.", "A shallow stream cuts across the ground; wading it is difficult terrain.", "Leaf litter hides gnarled roots: the clearing's edge is difficult terrain.", "A charcoal burner's mound smolders at one side, giving off smoke that lightly obscures the area within 10 feet."],
        hazards: ["A hornets' nest hangs low. Any area attack that hits it wakes them: everyone within 10 feet makes a DC {dc} Constitution save or takes {dmg} poison damage.", "A dead tree leans over the clearing. A heavy blow against it brings it down: DC {dc} Dexterity save for anyone in a 30-foot line, {dmg} bludgeoning damage on a failure.", "An old hunter's pit, covered with rotten boards, sits between the two sides: DC {dc} Wisdom (Perception) to spot it, or fall 10 feet onto stakes ({dmg} piercing damage)."],
        twists: ["A wood elf hunter watches from the trees and will help whichever side seems to respect the forest.", "The fight scares up a herd of deer that stampedes through on round 2: everyone in its path makes a DC {dc} Dexterity save or is knocked prone."] },
    grassland: { label: "Grassland", icon: "🌾", dist: [6, 6, 10], sky: true,
        monsters: "axe-beak ankheg bandit bandit-captain berserker blink-dog boar bulette centaur cockatrice couatl deer draft-horse eagle elephant elk giant-boar giant-eagle giant-elk giant-hyena giant-vulture giant-wasp gnoll goblin gold-dragon-wyrmling young-gold-dragon adult-gold-dragon ancient-gold-dragon gorgon griffon hawk hippogriff hobgoblin hyena jackal lion mule ogre orc pegasus poisonous-snake rhinoceros riding-horse scout swarm-of-insects tribal-warrior triceratops tyrannosaurus-rex vulture warhorse wereboar-human wereboar-hybrid wereboar-boar weretiger-human weretiger-hybrid weretiger-tiger werewolf-human werewolf-hybrid werewolf-wolf hill-giant chimera guard knight veteran",
        places: ["at the Lone Barrow", "on the Drovers' Road", "at Sixstones Crossing", "in the Long Grass", "at the Burned Farmstead", "on Gallows Rise", "at the Dry Well", "by the Standing Stone", "in the Windmill's Shadow", "on the King's Meadow", "at Tollgate Field", "by the Shepherd's Hut"],
        ground: ["Tall grass makes anyone crouching in it lightly obscured.", "A low stone wall crosses the field: half cover for anyone behind it.", "A haystack or two gives three-quarters cover until it catches fire.", "A muddy cart track runs through: difficult terrain after rain.", "Open ground in every direction: no cover beyond what you bring.", "A rise in the middle gives whoever holds it a clear view over the grass.", "An abandoned wagon lies on its side: three-quarters cover behind it.", "Rabbit warrens riddle one patch: it counts as difficult terrain."],
        hazards: ["The dry grass catches at the first spark of fire. The blaze spreads 10 feet a round downwind; anyone who starts a turn in it makes a DC {dc} Dexterity save or takes {dmg} fire damage.", "A disturbed bull from the nearby herd charges the nearest creature on round 3: DC {dc} Dexterity save or take {dmg} bludgeoning damage and fall prone.", "A sinkhole hides under the grass: the first creature to cross it makes a DC {dc} Dexterity save or drops 10 feet ({dmg} bludgeoning damage)."],
        twists: ["Riders on the horizon: a patrol from the nearest town will arrive in 1d4 + 2 rounds, and it isn't clear whose side they'll take.", "A sudden squall flattens the grass: from round 3 the whole field is lightly obscured by rain."] },
    hills: { label: "Hills", icon: "⛰️", dist: [4, 6, 10], sky: true,
        monsters: "bandit bandit-captain berserker blood-hawk brown-bear bugbear bulette chimera copper-dragon-wyrmling young-copper-dragon adult-copper-dragon ancient-copper-dragon red-dragon-wyrmling dire-wolf eagle elk ettin giant-boar giant-eagle giant-elk giant-goat gnoll goat goblin green-hag griffon harpy hill-giant hippogriff hobgoblin hyena lion manticore mastiff mule ogre orc pegasus scout stone-giant tribal-warrior troll wereboar-human wereboar-hybrid wereboar-boar werewolf-human werewolf-hybrid werewolf-wolf wolf worg wyvern giant-wolf-spider kobold",
        places: ["on Gibbet Hill", "at the Shepherd's Cairn", "in Fox Gully", "on the Drover's Pass", "at the Old Watchtower", "below the Broken Tor", "in the Sheep Wash", "on Barrow Ridge", "at Kestrel Scar", "in the Quarry Cut", "by the Hermit's Cave", "on the Saddleback"],
        ground: ["The slope runs up toward one side: moving uphill is difficult terrain.", "Boulders the size of a cart give three-quarters cover.", "A dry-stone sheepfold gives half cover to anyone inside its walls.", "Loose scree on the steep side is difficult terrain.", "A ridge line: anyone standing on top is easy to see from a mile off.", "Gorse bushes give half cover and snag clothing.", "A narrow gully: only two creatures can stand side by side in it.", "A ruined watchtower: its stair climbs 20 feet to a broken top with half cover."],
        hazards: ["The scree is ready to go. A creature knocked prone on the slope slides 20 feet and makes a DC {dc} Dexterity save or takes {dmg} bludgeoning damage.", "A loose boulder sits above the gully. A creature can use its action to push it: DC {dc} Dexterity save for anyone in a 20-foot line below, {dmg} bludgeoning damage on a failure.", "An old mine shaft, half hidden by gorse, drops away: DC {dc} Wisdom (Perception) to spot it before stepping in ({dmg} bludgeoning damage)."],
        twists: ["A shepherd and her dogs come over the ridge on round 2 and bolt for the nearest side that looks friendly.", "Mist rolls up the valley: from round 4 everything beyond 30 feet is heavily obscured."] },
    mountain: { label: "Mountains", icon: "🏔️", dist: [4, 6, 10], sky: true,
        monsters: "air-elemental basilisk blood-hawk chimera cloud-giant red-dragon-wyrmling young-red-dragon adult-red-dragon ancient-red-dragon silver-dragon-wyrmling young-silver-dragon adult-silver-dragon ancient-silver-dragon eagle ettin fire-giant frost-giant gargoyle giant-eagle giant-elk giant-goat goat griffon harpy hill-giant hippogriff manticore ogre orc roc saber-toothed-tiger stone-giant troll wyvern duergar hell-hound dust-mephit kobold azer magma-mephit",
        places: ["on the Goat Stair", "at the Frozen Shrine", "on Widow's Ledge", "in the High Pass", "at the Rope Bridge", "below the Eyrie", "at the Abandoned Mine", "on the Glacier's Lip", "at the Bone Saddle", "in the Thunder Notch", "by the Giant's Steps", "on the Old Dwarf Road"],
        ground: ["The ledge is only 10 feet wide, with a sheer drop on one side.", "Snow on the ground is difficult terrain.", "A rockfall left boulders that give three-quarters cover.", "The air is thin: a creature that Dashes two turns in a row makes a DC 10 Constitution save or can't Dash again until it rests for a minute (the Gazette's rule; skip it if you like).", "An overhang shelters one side: no one can fly over it or drop on it from above.", "Ice on the path: a creature that Dashes across makes a DC 10 Dexterity (Acrobatics) check or falls prone.", "A cave mouth opens behind one side, 15 feet wide and dark inside.", "A rope bridge spans a chasm; it holds four Medium creatures before the ropes start to creak."],
        hazards: ["The snowpack above is waiting for a loud noise. Thunder damage or a shout from a giant starts an avalanche: everyone makes a DC {dc} Strength save or takes {dmg} bludgeoning damage and is buried (restrained until dug out).", "A creature pushed off the ledge falls 30 feet onto rocks below ({dmg} bludgeoning damage) unless it makes a DC {dc} Dexterity save to grab the edge.", "Gusts tear across the pass. At the start of each round roll a d6: on a 1, every flying creature makes a DC {dc} Strength save or is pushed 15 feet toward the drop."],
        twists: ["A great eagle circles overhead. It hates whatever is attacking its mountain more than it hates strangers.", "The weather turns: sleet from round 3 makes ranged attacks beyond 30 feet roll with disadvantage."] },
    swamp: { label: "Swamp", icon: "🐸", dist: [2, 8, 10], sky: true,
        monsters: "black-dragon-wyrmling young-black-dragon adult-black-dragon ancient-black-dragon constrictor-snake crocodile frog ghast ghoul giant-centipede giant-constrictor-snake giant-crocodile giant-frog giant-lizard giant-poisonous-snake giant-rat giant-spider giant-toad green-hag hydra lizardfolk night-hag ochre-jelly ogre poisonous-snake rat shambling-mound stirge swarm-of-insects swarm-of-poisonous-snakes swarm-of-rats troll will-o-wisp wight zombie vulture otyugh gibbering-mouther cultist cult-fanatic",
        places: ["at Drowned Chapel", "in the Leech Pools", "at Ferryman's Landing", "in Hagsmoor", "on the Corduroy Road", "at the Sunken Village", "in the Reed Maze", "by the Gibbet Tree", "on Mudlark Island", "at the Eel Weir", "in the Stinking Fen", "by the Old Stilt House"],
        ground: ["Knee-deep water everywhere: the whole area is difficult terrain except the hummocks.", "Reeds taller than a man make anyone in them lightly obscured.", "A rotting boardwalk crosses the bog: firm footing, 5 feet wide.", "Mangrove roots give half cover and are difficult terrain.", "A stilt hut stands 10 feet above the water; a ladder goes up.", "Patches of sucking mud: a creature that ends its turn in one makes a DC 12 Strength check or is restrained until it pulls free.", "Fog hangs low over the water: everything beyond 30 feet is lightly obscured.", "A half-sunk barge lies on its side, three-quarters cover behind its hull."],
        hazards: ["A swamp gas bubble lies under the mud. Fire touching it explodes in a 10-foot radius: DC {dc} Dexterity save, {dmg} fire damage on a failure.", "Leeches in the water. A creature that ends its turn in the water makes a DC {dc} Constitution save or loses {dmg} hit points to them (the leeches drop off afterwards).", "The boardwalk is rotten in the middle: the first Medium or larger creature to cross it makes a DC {dc} Dexterity save or falls through into deep, cold water."],
        twists: ["A will-o'-wisp's light bobs nearby, trying to lure the wounded off into the deep water.", "The water is rising: by round 5 everything but the hummocks and the boardwalk is deep enough to swim."] },
    coast: { label: "Coast", icon: "🏖️", dist: [6, 6, 10], sky: true,
        monsters: "bandit bandit-captain bronze-dragon-wyrmling young-bronze-dragon adult-bronze-dragon ancient-bronze-dragon crab eagle giant-crab giant-eagle giant-lizard griffon harpy manticore merfolk merrow ogre reef-shark roc sahuagin scout sea-hag steam-mephit storm-giant thug veteran water-elemental plesiosaurus giant-toad blood-hawk lizardfolk",
        places: ["at Wreckers' Cove", "on the Salt Flats", "at the Lighthouse", "in the Smugglers' Caves", "at Gull Rock", "on the Shingle Beach", "at the Drowned Pier", "on the Sea Wall", "by the Tide Mill", "at Ship's Graveyard", "on Bonefish Point", "in Kelp Bay"],
        ground: ["Soft sand is difficult terrain for anyone heavier than a halfling.", "Rock pools are slippery: difficult terrain, and a creature that Dashes through them makes a DC 10 Dexterity save or falls prone.", "A beached hull gives three-quarters cover.", "Driftwood piles give half cover.", "The cliff path is 5 feet wide, with the sea 40 feet below.", "Fishing nets hang drying on poles; a creature can cut one free to throw it.", "Sea caves: dark inside, and they flood at high tide.", "The surf breaks over the rocks: anything in the shallows is lightly obscured by spray."],
        hazards: ["The tide comes in fast. From round 3 the low ground floods; a creature in it at the end of its turn makes a DC {dc} Strength save or is dragged 10 feet seaward.", "A wave breaks over the rocks on round 4: everyone on them makes a DC {dc} Strength save or takes {dmg} bludgeoning damage and is knocked prone.", "The cliff edge crumbles under heavy feet. A creature shoved toward it makes a DC {dc} Dexterity save or falls 40 feet ({dmg} bludgeoning damage) into the surf."],
        twists: ["A ship rounds the headland. Her captain will send a boat to whoever pays, or whoever wins.", "Something big moves under the water just offshore. It surfaces on round 4 and takes the nearest creature in the shallows."] },
    sea: { label: "At sea", icon: "🌊", dist: [4, 6, 10], sky: true,
        monsters: "aboleth chuul dragon-turtle giant-crab giant-octopus giant-sea-horse giant-shark hunter-shark killer-whale kraken merfolk merrow octopus plesiosaurus quipper reef-shark sahuagin sea-hag sea-horse swarm-of-quippers water-elemental storm-giant young-bronze-dragon adult-bronze-dragon bandit bandit-captain thug veteran scout",
        places: ["on the Open Water", "over the Sunken Temple", "in the Kelp Forest", "at the Reef's Edge", "off Devil's Teeth", "in the Fog Bank", "over the Drowned City", "at the Whirlpool", "on the Becalmed Sea", "in the Shark Run", "by the Wreck of the Gilded Gull", "at the Pearl Beds"],
        ground: ["Underwater: a weapon attack without a dagger, javelin, shortsword, spear, trident, or crossbow has disadvantage unless the creature has a swimming speed.", "Underwater: fire damage is halved for anyone fully under the surface.", "The ship's deck rolls: a creature that Dashes makes a DC 10 Dexterity (Acrobatics) check or falls prone.", "Rigging and masts can be climbed for height; the crow's nest gives half cover.", "Kelp fronds make anything more than 10 feet away underwater lightly obscured.", "Coral spurs give half cover and scrape: falling prone on them deals 1d4 slashing damage.", "Cargo crates on deck give three-quarters cover until they go over the side.", "The ship's boat hangs on davits: two creatures can cut it loose and row away."],
        hazards: ["A swell sweeps the deck on round 3: everyone on it makes a DC {dc} Strength save or slides 15 feet toward the rail, going over the side on a failure by 5 or more.", "A creature dragged under that can't breathe water must hold its breath; at the start of each of its turns underwater past the first, it makes a DC {dc} Constitution save or takes {dmg} bludgeoning damage from the pressure.", "Blood in the water. Each round a creature bleeds in the sea, roll a d6: on a 1, a hunter shark arrives."],
        twists: ["Another ship's sails on the horizon. She's coming fast, and she's flying no flag.", "A whale surfaces next to the fight on round 3, rocking every boat and swimmer: DC {dc} Dexterity save or fall prone (or go under)."] },
    arctic: { label: "Arctic", icon: "❄️", dist: [6, 6, 10], sky: true,
        monsters: "berserker dire-wolf elk frost-giant giant-elk giant-owl ice-mephit killer-whale mammoth owl polar-bear remorhaz saber-toothed-tiger scout tribal-warrior white-dragon-wyrmling young-white-dragon adult-white-dragon ancient-white-dragon winter-wolf wolf werebear-human werebear-hybrid werebear-bear ogre troll ice-devil air-elemental",
        places: ["on the Frozen Lake", "at the Ice Shrine", "in the Whiteout", "at the Mammoth Graveyard", "on the Glacier", "by the Seal Holes", "at the Snowed-In Lodge", "in the Blue Crevasse", "at the Frost Cairn", "on the Long Dark Trail", "by the Steaming Springs", "at the Whalebone Hall"],
        ground: ["Deep snow is difficult terrain.", "Ice underfoot: a creature that Dashes makes a DC 10 Dexterity (Acrobatics) check or falls prone.", "Snowdrifts give half cover and make anyone lying in them lightly obscured.", "An ice ridge gives three-quarters cover.", "Blowing snow makes everything beyond 60 feet lightly obscured.", "A snow cave can hold three Medium creatures; it's dark inside.", "Frozen boulders poke out of the snow: half cover.", "The wind is at one side's back: their ranged attacks reach 10 feet farther (the Gazette's rule)."],
        hazards: ["The lake ice is thin in the middle. Each time a Medium or larger creature ends its turn there, roll a d6: on a 1 the ice breaks, and the creature makes a DC {dc} Dexterity save or falls into freezing water ({dmg} cold damage at the start of each turn it stays in).", "A hidden crevasse under the snow: DC {dc} Wisdom (Perception) to spot it, or fall 20 feet ({dmg} bludgeoning damage).", "The cold bites. Anyone without cold-weather gear makes a DC {dc} Constitution save at the end of the fight or gains a level of exhaustion."],
        twists: ["A blizzard closes in on round 4: everything beyond 15 feet becomes heavily obscured.", "The noise wakes something under the snow. On round 3 the ground heaves as a remorhaz's back breaks the surface nearby (or something smaller, if the party isn't ready for one)."] },
    desert: { label: "Desert", icon: "🏜️", dist: [6, 6, 10], sky: true,
        monsters: "androsphinx gynosphinx blue-dragon-wyrmling young-blue-dragon adult-blue-dragon ancient-blue-dragon brass-dragon-wyrmling young-brass-dragon adult-brass-dragon ancient-brass-dragon camel djinni efreeti dust-mephit giant-hyena giant-lizard giant-scorpion giant-vulture giant-poisonous-snake gnoll hyena jackal lamia mummy mummy-lord purple-worm roc scorpion vulture bandit bandit-captain tribal-warrior thug scout cult-fanatic cultist poisonous-snake flying-snake swarm-of-insects swarm-of-beetles mule lion medusa ghoul wight earth-elemental fire-elemental salamander death-dog",
        places: ["at the Bleached Oasis", "in the Dune Sea", "at the Buried Gate", "on the Salt Road", "at the Vulture Rocks", "by the Dry Fountain", "in the Glass Flats", "at the Caravanserai Ruin", "in the Red Canyon", "at the Sphinx's Paw", "on the Bone Track", "by the Last Well"],
        ground: ["Loose sand on the dunes is difficult terrain.", "Rock pillars give three-quarters cover.", "A ruined wall half-buried in sand gives half cover.", "Heat shimmer: everything beyond 60 feet is lightly obscured at midday.", "A dune crest: anyone on top can see a long way, and be seen.", "Cracked salt flats: firm, flat, and nowhere to hide.", "A dry wash runs through, 5 feet deep: half cover for anyone crouched in it.", "A palm grove around a pool gives half cover."],
        hazards: ["Quicksand in the low ground: a creature that enters it sinks 1d4 + 1 feet and is restrained; it takes a DC {dc} Strength check to pull free.", "The sun is merciless. Anyone in heavy armor makes a DC {dc} Constitution save after the fight or gains a level of exhaustion.", "A sandstorm rolls in on round 4: everyone in the open makes a DC {dc} Constitution save each round or takes {dmg} slashing damage, and everything beyond 10 feet is heavily obscured."],
        twists: ["A caravan appears on the dune line. Its guards will join whichever side offers them water.", "The fight uncovers a buried stair under the sand. It leads down, and something down there heard."] },
    underdark: { label: "Underdark", icon: "🕳️", dist: [2, 6, 10], sky: false,
        monsters: "black-pudding chuul cloaker darkmantle deep-gnome-svirfneblin drider drow duergar earth-elemental gelatinous-cube gibbering-mouther giant-bat giant-centipede giant-fire-beetle giant-lizard giant-spider gray-ooze grick grimlock hobgoblin kobold magmin mage minotaur ochre-jelly otyugh phase-spider purple-worm roper rust-monster shrieker spirit-naga swarm-of-bats swarm-of-spiders violet-fungus xorn aboleth behir bugbear goblin ghoul ettin fire-giant salamander",
        places: ["in the Glowing Grotto", "at the Black Lake", "on the Fungus Terraces", "at the Bridge of Sighs", "in the Echoing Vault", "by the Dead Drow Outpost", "in the Crystal Gallery", "at the Lava Seam", "in the Dripping Halls", "at the Sunless Market", "in the Wormways", "at the Bottomless Stair"],
        ground: ["Stalagmites give half cover; the biggest give three-quarters.", "Giant mushrooms 10 feet tall give three-quarters cover until someone cuts them down.", "The ceiling is low here (10 feet): Large creatures squeeze, and nothing flies over anything.", "A ledge 15 feet up runs along one wall; climbing to it is a DC 12 Strength (Athletics) check.", "Phosphorescent lichen sheds dim light in a 10-foot radius around the walls.", "Slick flowstone underfoot is difficult terrain.", "A narrow tunnel mouth: only one Medium creature fits through at a time.", "An underground stream, waist-deep and fast, cuts through the cavern."],
        hazards: ["The chasm's edge is close. A creature shoved off it falls 60 feet ({dmg} bludgeoning damage) unless it makes a DC {dc} Dexterity save to catch a ledge 15 feet down.", "Spores puff from the mushrooms when struck: everyone within 10 feet makes a DC {dc} Constitution save or is poisoned until the end of its next turn.", "Bad air in the low part of the cave. A creature that starts its turn there makes a DC {dc} Constitution save or takes {dmg} poison damage."],
        twists: ["The fight's noise wakes the shriekers in the next cave, and whatever hunts by them comes in 1d4 rounds.", "A lone svirfneblin scout has been watching from a crack in the wall. They know a way out and will trade it for a favor."] },
    town: { label: "Town", icon: "🏘️", dist: [2, 6, 10], sky: true,
        monsters: "acolyte archmage assassin bandit bandit-captain cat commoner crocodile cult-fanatic cultist doppelganger ghost gladiator gray-ooze guard imp knight mage mastiff noble otyugh priest quasit rakshasa rat giant-rat swarm-of-rats raven spy succubus-incubus thug veteran vampire-vampire vampire-spawn wererat-human wererat-hybrid wererat-rat oni draft-horse riding-horse mule pony berserker scout swarm-of-ravens",
        places: ["in the Shambles", "at the Drowned Rat", "on Tanners' Row", "in the Old Sewers", "at the Hanging Square", "by the Fishmarket", "on the Temple Steps", "in Lamplighter's Alley", "at the Bell Foundry", "under the Bridge", "in the Graveyard on the Hill", "at the Burned Warehouse"],
        ground: ["Market stalls give half cover and can be knocked over (an action) to make difficult terrain.", "A narrow alley: two Medium creatures abreast at most.", "Rooftops 15 feet up, reached by a drainpipe (DC 10 Strength (Athletics)) or a stair; jumping the gap between roofs is a long jump.", "Crowds of bystanders count as difficult terrain and give half cover, until they scatter on round 2.", "A wagon full of barrels gives three-quarters cover.", "A canal runs alongside: 10 feet deep, cold and filthy.", "Laundry lines strung across the street make the space above lightly obscured.", "A well in the square: 30 feet down to the water."],
        hazards: ["Lamp oil spills across the cobbles in the first round. Fire lights it: a 10-foot square burns for 1 minute, and a creature that enters it or starts its turn there makes a DC {dc} Dexterity save or takes {dmg} fire damage.", "A rotten balcony gives way under the first creature to stand on it: DC {dc} Dexterity save or fall 15 feet ({dmg} bludgeoning damage).", "The watch arrives in 1d4 + 3 rounds. Anyone still holding a weapon is arrested first and asked questions later."],
        twists: ["A child grabs the nearest coin purse in the confusion and runs for the alleys.", "The town watch arrives on round 4 and, misreading the scene, tries to arrest the party."] },
    dungeon: { label: "Dungeon or ruin", icon: "🏚️", dist: [2, 6, 5], sky: false,
        monsters: "animated-armor archmage basilisk black-pudding bugbear chuul clay-golem cloaker cult-fanatic cultist darkmantle dretch ettercap flesh-golem flying-sword gargoyle gelatinous-cube ghast ghost ghoul giant-centipede giant-fire-beetle giant-rat giant-spider gibbering-mouther goblin gray-ooze grick guardian-naga hobgoblin homunculus imp iron-golem kobold lemure lich mage medusa mimic minotaur minotaur-skeleton mummy mummy-lord ochre-jelly ogre ogre-zombie orc otyugh quasit rat roper rug-of-smothering rust-monster shadow shield-guardian skeleton specter spirit-naga stirge stone-golem swarm-of-bats swarm-of-rats troll vampire-vampire vampire-spawn warhorse-skeleton wererat-human wererat-hybrid wight wraith zombie bandit bandit-captain",
        places: ["in the Hall of Pillars", "in the Flooded Crypt", "at the Collapsed Chapel", "in the Kennels", "at the Well Room", "in the Ossuary", "on the Spiral Stair", "in the Old Armory", "at the Iron Door", "in the Throne Room", "in the Guardroom", "by the Sealed Vault"],
        ground: ["Pillars give half cover; the thickest give three-quarters.", "Rubble from a fallen ceiling is difficult terrain.", "A long table and benches can be flipped (an action) for half cover.", "The room is 30 feet across with one other door, standing ajar.", "A raised dais at one end, 5 feet up, reached by steps.", "Ankle-deep water covers the floor: difficult terrain, and it hides the floor.", "Stone sarcophagi give three-quarters cover.", "A portcullis between two halves of the room, raised; the winch is on one side."],
        hazards: ["A pressure plate in the middle of the floor: DC {dc} Wisdom (Perception) to spot it, or darts fire for {dmg} piercing damage.", "The ceiling is cracked. The first thunder damage or heavy blow against a wall brings part of it down: DC {dc} Dexterity save for anyone in a 10-foot square, {dmg} bludgeoning damage on a failure.", "Green slime drips from the ceiling near the far door: a creature passing under it makes a DC {dc} Dexterity save or takes {dmg} acid damage."],
        twists: ["The door slams and locks on round 2: the lever is on the far side of the room.", "A wandering patrol of the dungeon's other residents hears the fight and turns up on round 5, as eager to fight the winners as either side."] }
};
const ENC_HABITAT_KEYS = Object.keys(ENC_HABITATS);
const ENC_MONSTER_HABITATS = {};
ENC_HABITAT_KEYS.forEach(h => ENC_HABITATS[h].monsters.split(" ").forEach(id => (ENC_MONSTER_HABITATS[id] = ENC_MONSTER_HABITATS[id] || []).push(h)));

// Groups of foes that belong together. lead: who can be in charge; support: who comes along.
// names: how the leader is named (encLeaderName); races: for 'folk' names. loot: a source in
// loot-engine.js's LOOT_SOURCES ('hoard:<key>' opens the Hoard tab). doing: [tag, text]
// (tags: ambush camp travel guard hunt work parley). parley: null = no talking them down.
const ENC_BANDS = [
    { key: "goblins", label: "Goblin raiders", icon: "👺", hab: "forest hills mountain underdark dungeon grassland", lead: "bugbear hobgoblin goblin", support: "goblin wolf worg giant-rat", names: "goblin", loot: "raider",
        doing: [["ambush", "crouched behind a tripwire strung across the path, giggling"], ["camp", "squabbling over a stolen ham around a smoky fire"], ["travel", "hauling a cart of stolen pots back to their warren"], ["guard", "guarding a cave mouth, badly: two of them are playing knucklebones"], ["work", "trying to teach a wolf to fetch, with poor results"], ["hunt", "following the party's tracks, arguing about whose turn it is to lead"]],
        tactics: ["They shoot from cover, then fall back and do it again; goblins Disengage or Hide as a bonus action every turn.", "The boss stays at the back and shoves the smallest goblins forward. Wolves go for anyone who falls prone.", "They'd rather steal a pack and run than win the fight."],
        morale: ["When the boss drops or half of them fall, the rest scatter, shrieking, and argue about it later.", "They flee the moment a fight looks fair."],
        parley: ["They'll let the party pass for {gp} in coin, or one of their shiny things.", "Their boss wants to be called 'Your Majesty'. Do it and they'll talk."] },
    { key: "hobgoblins", label: "Hobgoblin warband", icon: "⚔️", hab: "forest hills grassland mountain dungeon", lead: "hobgoblin bugbear", support: "hobgoblin goblin worg wolf", names: "goblin", loot: "soldier",
        doing: [["travel", "marching in step down the road, banners furled"], ["guard", "manning a palisade across the pass with drilled precision"], ["camp", "sharpening blades in a neat, ditched camp"], ["ambush", "lying in a disciplined line behind the ridge, waiting for a signal horn"], ["work", "putting goblin prisoners to work digging a ditch"], ["parley", "escorting a tax collector who demands a toll in the name of their warlord"]],
        tactics: ["They hold a shield line and fight in pairs so every hobgoblin gets its Martial Advantage.", "Archers in the back, spears in front; the captain calls targets.", "If the party has a spellcaster, the whole band goes for them first."],
        morale: ["They retreat in good order when their leader falls, carrying their wounded.", "Hobgoblins never surrender to people they think are weaker. Prove otherwise and they'll negotiate."],
        parley: ["They'll accept a formal surrender, and a toll of {gp}.", "Their captain respects a duel: win one and the band lets you pass."] },
    { key: "orcs", label: "Orc war band", icon: "🪓", hab: "forest hills mountain grassland arctic underdark", lead: "ogre orc", support: "orc worg", names: "orc", loot: "raider",
        doing: [["travel", "on the march, drums thumping, toward the next village"], ["camp", "roasting a stolen ox and boasting of the day's raid"], ["ambush", "waiting in the trees beside the road with axes ready"], ["hunt", "tracking a wounded elk, and now the party"], ["work", "burning a farmstead they've already looted"], ["guard", "guarding a shrine of skulls to their god of slaughter"]],
        tactics: ["They charge straight in: Aggressive lets every orc close the distance as a bonus action.", "The biggest orc picks a duel with the party's strongest fighter; the rest swarm whoever is alone.", "Worg riders circle around to hit the back line."],
        morale: ["They fight until the war chief falls, then the survivors run for the hills to tell the tale.", "An orc that surrenders loses face forever. They'd rather die, unless the chief tells them to stop."],
        parley: ["They'd take weapons or meat as tribute, about {gp} worth.", "Their chief wants a worthy foe killed and would let the party live to do it."] },
    { key: "gnolls", label: "Gnoll pack", icon: "🐾", hab: "grassland hills desert forest", lead: "gnoll giant-hyena", support: "gnoll hyena giant-hyena death-dog", names: "gnoll", loot: "raider",
        doing: [["hunt", "loping after the party's scent, laughing to each other"], ["camp", "cracking bones for the marrow in a ring of skulls"], ["ambush", "lying in the tall grass, downwind"], ["work", "dragging off the last of a caravan's mules"], ["travel", "crossing the plain in a loose, fast line"]],
        tactics: ["They split the party and gang up on whoever is left alone; Rampage lets a gnoll that drops someone move and bite again.", "Hyenas harry the edges. Gnolls throw spears first, then close.", "They go for the wounded first, every time."],
        morale: ["They break and run when the pack leader falls.", "Hunger keeps them fighting past sense; they flee only when more than half are dead."],
        parley: null },
    { key: "kobolds", label: "Kobold warren", icon: "🦎", hab: "underdark dungeon hills mountain", lead: "kobold", support: "kobold giant-centipede giant-fire-beetle stirge giant-weasel", names: "kobold", loot: "raider",
        doing: [["ambush", "waiting behind murder holes in a trapped corridor"], ["work", "setting a new trap and arguing about the springs"], ["guard", "guarding the tunnel to their dragon's lair, very nervously"], ["camp", "polishing a pile of 'treasure' that's mostly copper and buttons"]],
        tactics: ["They swarm in packs for Pack Tactics and never fight fair.", "They fight from behind traps and lure the party into them.", "They throw jars of centipedes, then rocks, then themselves."],
        morale: ["They run when the fight turns, and come back later through a side tunnel.", "They'll surrender instantly and offer to show the party 'the good treasure'. It's a trap."],
        parley: ["They'd sell out their own dragon for {gp} and a promise.", "Bring them something shiny and they'll talk all day."] },
    { key: "bandits", label: "Bandit gang", icon: "🗡️", hab: "forest grassland hills mountain desert town coast dungeon", lead: "bandit-captain veteran thug spy berserker", support: "bandit thug scout mastiff", names: "folk", races: "human human human halfling dwarf elf orc tiefling", loot: "bandit",
        doing: [["ambush", "lying in wait behind a fallen tree they dragged across the road"], ["parley", "running a 'toll bridge' that wasn't there last week"], ["camp", "counting the take around a fire in a hidden camp"], ["travel", "riding hard, with a posse somewhere behind them"], ["work", "robbing a merchant's wagon when the party arrives"], ["guard", "guarding a cave where they keep a ransomed hostage"]],
        tactics: ["Archers in the rocks, swords in front; the captain stays out of reach until someone's down.", "They grab the weakest-looking traveler as a hostage first.", "Mastiffs go in first to knock people down."],
        morale: ["They're in it for the money. Once three of them fall, the rest drop their weapons or run.", "They run when the captain falls, each in a different direction."],
        parley: ["The 'toll' is {gp}, and they'll haggle.", "Their captain will let the party go if they forget they ever saw this camp.", "One of them owes another gang money and would sell the captain out for {gp}."] },
    { key: "pirates", label: "Pirate crew", icon: "🏴‍☠️", hab: "coast sea town", lead: "bandit-captain veteran thug", support: "bandit thug scout", names: "folk", races: "human human human halfling elf orc tiefling dwarf", loot: "pirate",
        doing: [["work", "rowing crates ashore by lantern light"], ["camp", "drinking on the beach around a bonfire of a ship's timbers"], ["guard", "standing watch over a buried chest, arguing about shares"], ["parley", "offering a ride out of town at a suspiciously good price"], ["ambush", "waiting in the sea caves for the next ship's boat"], ["travel", "rowing hard for their ship with a stolen figurehead"]],
        tactics: ["They swing from the rigging, cut lines, and push people overboard.", "The captain uses the crew as a shield and shoots from behind them.", "Two of them sneak around to set fire to the party's boat or cart."],
        morale: ["Once the captain falls, the crew elects a new one on the spot and asks for terms.", "They fight to the death for their ship, but not for anything else."],
        parley: ["Every pirate has a price: {gp} buys a truce and a drink.", "The quartermaster would happily mutiny if someone else does the dangerous part."] },
    { key: "cult", label: "Cult cell", icon: "🕯️", hab: "town dungeon swamp desert underdark forest", lead: "cult-fanatic priest mage", support: "cultist acolyte imp quasit dretch lemure", names: "folk", races: "human human human elf halfling tiefling gnome dwarf", loot: "cultist",
        doing: [["work", "chanting around a circle of candles, halfway through a ritual"], ["guard", "guarding a sealed door with an unconvincing story about a funeral"], ["camp", "sleeping in shifts beside an idol wrapped in sackcloth"], ["parley", "handing out pamphlets and smiles a little too eagerly"], ["ambush", "hiding robes under cloaks in the crowd, daggers drawn"], ["travel", "carrying a bound and gagged prisoner toward the old shrine"]],
        tactics: ["The cultists form a wall while the leader keeps casting from behind them.", "They fight to finish the ritual: one of them keeps chanting even while hit.", "If it goes badly, they kill the prisoner rather than give them up."],
        morale: ["Fanatics fight to the death. Ordinary cultists break once the leader falls.", "A cultist who's been made to doubt (a DC 15 Charisma (Persuasion) check) drops the dagger and weeps."],
        parley: ["The leader offers the party a share of their god's favor. It's a lie, but an interesting one.", "A frightened acolyte would talk for {gp} and safe passage out of town."] },
    { key: "watch", label: "Town watch or soldiers", icon: "🛡️", hab: "town grassland hills forest coast", lead: "knight veteran priest", support: "guard veteran mastiff scout", names: "folk", races: "human human human dwarf elf halfling", loot: "soldier",
        doing: [["guard", "manning a checkpoint and demanding papers"], ["hunt", "searching for someone who looks a lot like one of the party"], ["parley", "politely asking the party to come along to the magistrate"], ["travel", "on patrol, bored, and looking for something to do"], ["work", "escorting a prisoner to the gallows"]],
        tactics: ["They try to arrest, not kill: they grapple and shove prone, and use the flat of the blade until someone draws blood.", "One of them runs for help as soon as the fight starts.", "The sergeant sets dogs on anyone who runs."],
        morale: ["They back off if outmatched and come back with a lot more soldiers.", "They surrender to anyone who promises a fair trial."],
        parley: ["A bribe of {gp} makes the problem go away, this time.", "Show a writ, a seal, or a good enough lie (DC 15 Charisma (Deception)) and they wave the party through."] },
    { key: "nobles", label: "Noble's retinue", icon: "👑", hab: "town grassland forest", lead: "noble knight mage", support: "guard knight veteran mastiff spy", names: "folk", races: "human human elf halfling dwarf tiefling", loot: "noble",
        doing: [["travel", "riding past in a coach that doesn't slow down for anyone on the road"], ["hunt", "hunting on land the party didn't know was private"], ["parley", "demanding the party hand over something the noble 'owns'"], ["guard", "guarding a masked noble at a secret meeting"]],
        tactics: ["The knights protect the noble above all; the noble stays out of reach.", "The house mage stays back and picks off the loudest member of the party.", "The spy slips away during the fight to report everything."],
        morale: ["The retinue retreats the moment the noble is threatened.", "The guards are paid, not loyal: half of them stop fighting when the noble is down."],
        parley: ["The noble would pay {gp} to have this never have happened.", "An apology on bended knee works wonders (DC 13 Charisma (Persuasion))."] },
    { key: "shadows", label: "Spies and assassins", icon: "🗝️", hab: "town dungeon", lead: "assassin spy doppelganger rakshasa", support: "thug spy bandit mastiff", names: "folk", races: "human human elf halfling tiefling gnome", loot: "bandit",
        doing: [["ambush", "waiting on the rooftops with crossbows"], ["parley", "posing as the party's contact, a little too eager to see the goods"], ["hunt", "following the party through the crowd, three streets back"], ["guard", "keeping watch on a safe house's back door"]],
        tactics: ["They strike from hiding on the first round and then try to vanish again.", "They target one person, the one they were paid to kill, and ignore the rest.", "Poison on every blade, smoke on the way out."],
        morale: ["Professionals: they withdraw once the target is dead or the job is clearly blown.", "Captured, they say nothing until someone offers more than their employer pays."],
        parley: ["They'll name their employer for twice what they were paid: {gp}.", "Professional courtesy: buy out the contract and they walk away."] },
    { key: "lies", label: "Not what they seem", icon: "🎭", hab: "town dungeon forest", lead: "doppelganger rakshasa oni succubus-incubus", support: "spy thug cultist noble guard", names: "folk", races: "human human elf halfling tiefling", loot: "otherworld",
        doing: [["parley", "posing as a grieving widow who asks the party for help"], ["work", "running a respectable inn where guests keep checking out early"], ["guard", "pretending to be the town magistrate, and doing a better job of it"], ["ambush", "wearing the face of someone the party trusts"]],
        tactics: ["They try to split the party with lies before anyone draws a weapon.", "Mid-fight they take the face of a party member and shout for help.", "They've had days to prepare: the ground is chosen, the exits watched."],
        morale: ["They flee the moment the disguise is truly blown, and come back wearing a new face.", "They fight to the end only when cornered in their lair."],
        parley: ["They'll trade a secret about one of the party for being left alone.", "Offer them a juicier target and they'll consider it."] },
    { key: "pits", label: "Pit fighters", icon: "🏟️", hab: "town", lead: "gladiator berserker veteran", support: "thug berserker lion ape brown-bear mastiff", names: "folk", races: "human human orc dwarf dragonborn tiefling", loot: "soldier",
        doing: [["parley", "challenging the party to a bout, with the crowd already betting"], ["work", "training in the yard behind the arena"], ["guard", "guarding the arena master's strongbox"], ["camp", "celebrating a win in the tavern, loudly"]],
        tactics: ["They fight for the crowd: showy moves, taunts, and finishing blows held back for applause.", "The beasts are let loose first; the gladiators wait for an opening.", "They shove people into the ring's walls and grapple whoever's tired."],
        morale: ["A gladiator who's beaten yields and expects mercy; the crowd demands it.", "They stop when the arena master rings the bell, not before."],
        parley: ["Bet {gp} on the house and they'll take a dive.", "A champion will fight one of the party fairly, one on one, for glory."] },
    { key: "clans", label: "Clan warriors", icon: "🪶", hab: "grassland hills arctic forest desert mountain", lead: "berserker druid tribal-warrior scout centaur", support: "tribal-warrior berserker scout wolf mastiff riding-horse", names: "folk", races: "human human orc elf dwarf dragonborn", loot: "raider",
        doing: [["guard", "guarding the borders of their hunting grounds"], ["hunt", "on a hunt, and the party just crossed their quarry's trail"], ["parley", "demanding to know why strangers are on sacred land"], ["camp", "breaking camp after a funeral rite"], ["travel", "moving their herds to the winter pastures"]],
        tactics: ["They test the party first: one warrior steps up to fight the strongest stranger.", "Scouts shoot from range while the berserkers charge.", "They know the land: every retreat leads the party into worse ground."],
        morale: ["They withdraw when their elder or champion falls, to come back with the whole clan.", "They'll stop if the party shows respect to their dead."],
        parley: ["A gift worth {gp} and a shared meal, and the party are guests, not trespassers.", "Help them with the thing that's been killing their herds and they'll guide the party anywhere."] },
    { key: "druids", label: "Druid circle", icon: "🌿", hab: "forest swamp hills arctic grassland", lead: "druid awakened-tree", support: "awakened-shrub wolf black-bear giant-badger swarm-of-insects giant-owl elk boar shambling-mound", names: "folk", races: "human elf elf halfling gnome dwarf", loot: "otherworld",
        doing: [["guard", "guarding a sacred grove the party just wandered into"], ["hunt", "tracking the party, who are carrying something taken from the forest"], ["parley", "asking the party, firmly, to leave the forest the way they came"], ["work", "healing a wounded stag at a standing stone"]],
        tactics: ["Animals in front, the druid behind them casting Entangle and Thunderwave.", "The trees themselves move to block the way out.", "They'd rather drive the party off than kill: they wound and scare."],
        morale: ["The beasts flee when the druid falls; the druid flees when half the beasts are down.", "They stop the moment the party drops whatever they took from the forest."],
        parley: ["Plant something, return something, or swear an oath, and the forest lets them go.", "They'd forgive the trespass if the party deals with the loggers upriver."] },
    { key: "undead", label: "Walking dead", icon: "💀", hab: "dungeon swamp grassland desert hills arctic town", lead: "wight ghast ogre-zombie minotaur-skeleton warhorse-skeleton", support: "skeleton zombie ghoul", names: "undead", loot: "undead",
        doing: [["hunt", "shambling toward the scent of the living"], ["guard", "standing in ranks around an old tomb, unmoving until someone crosses the line"], ["work", "digging, endlessly, at a sealed door"], ["travel", "marching toward the nearest village, as they were commanded a century ago"], ["ambush", "lying still among the bones, waiting for someone to walk past"]],
        tactics: ["Mindless dead walk straight at the nearest living thing.", "Ghouls go for anyone paralyzed; skeletons hold the line.", "The wight directs the rest and drinks from whoever falls."],
        morale: ["Mindless undead fight until destroyed.", "When their master is destroyed, the lesser dead collapse or wander off."],
        parley: null },
    { key: "haunt", label: "Restless spirits", icon: "👻", hab: "dungeon swamp town grassland desert", lead: "wraith ghost specter wight will-o-wisp", support: "shadow specter will-o-wisp", names: "undead", loot: "undead",
        doing: [["guard", "drifting through the walls of the room they died in"], ["work", "reenacting their last moments, over and over"], ["ambush", "waiting in the dark for a light to come close"], ["parley", "asking, in a whisper, who has disturbed their rest"]],
        tactics: ["They come through walls and floors, strike, and drift out again.", "Shadows go for the strongest; their Strength drain makes fighters fold.", "They herd the party toward the deepest dark."],
        morale: ["They fight until destroyed, or until whatever binds them is set right.", "Bright light and holy symbols hold them back but don't drive them off."],
        parley: ["The ghost will rest if the party finishes what it left undone.", "Speak the name of the one who wronged them and they turn their rage elsewhere."] },
    { key: "vampire", label: "Vampire's brood", icon: "🧛", hab: "town dungeon forest", lead: "vampire-vampire vampire-spawn", support: "vampire-spawn swarm-of-bats swarm-of-rats wolf dire-wolf giant-bat", names: "folk", races: "human human elf halfling tiefling", loot: "noble",
        doing: [["parley", "holding a candlelit dinner and inviting the party in"], ["hunt", "prowling the alleys for someone no one will miss"], ["guard", "guarding a coffin in the cellar with swarms of rats"], ["ambush", "waiting on the rafters of the abandoned church"]],
        tactics: ["Swarms and wolves go first to soak up the party's attacks; the vampire picks off whoever is isolated.", "Spawn grapple and bite; the master charms the strongest fighter.", "They fight near running water's opposite: indoors, at night, near their coffins."],
        morale: ["Spawn fight to the death for their master; the master flees as mist once badly hurt.", "The beasts scatter at dawn."],
        parley: ["The vampire offers a bargain: one name, one night, and the party walks free.", "The spawn want to be free of their master and would help destroy them."] },
    { key: "tomb", label: "Tomb guardians", icon: "⚱️", hab: "desert dungeon", lead: "mummy-lord mummy guardian-naga gynosphinx androsphinx", support: "mummy skeleton swarm-of-insects swarm-of-beetles giant-scorpion gargoyle", names: "undead", loot: "hoard:tomb",
        doing: [["guard", "sealed in a sarcophagus that has just begun to open"], ["work", "tending the tomb's offerings with withered hands"], ["parley", "asking the riddle that has guarded this door for a thousand years"], ["ambush", "waiting behind a false wall for anyone who touches the gold"]],
        tactics: ["The guardians block the only exit and let the traps do the work.", "Mummies spread rot with every blow; scarab swarms pour from the walls.", "They're bound to the tomb and won't chase beyond it."],
        morale: ["They fight until destroyed, but never leave the tomb.", "Put back what was taken and they return to their rest."],
        parley: ["Answer the riddle and the guardian lets the party pass.", "Swear an oath to the old king and they bow you through."] },
    { key: "necromancer", label: "Necromancer and servants", icon: "☠️", hab: "dungeon town swamp", lead: "lich archmage mage", support: "skeleton zombie ghoul ghast wight flesh-golem shield-guardian ogre-zombie", names: "folk", races: "human human elf tiefling gnome", loot: "mage",
        doing: [["work", "stitching something together on a slab, humming"], ["guard", "standing behind a wall of servants in a library of forbidden books"], ["parley", "offering the party a demonstration"], ["travel", "moving the lab to a new hideout, under cover of night"]],
        tactics: ["The servants hold the line while the caster blasts from behind them.", "The caster turns any party member who falls into a new servant (the Gazette's flourish; let them get up on your say).", "The guardian absorbs damage meant for its master."],
        morale: ["The dead fight on until destroyed; the caster teleports away when hurt.", "The caster surrenders if their notes are threatened."],
        parley: ["They'd trade a secret of death for {gp} in rare ink and bone.", "They want a body, any body, and would pay well for one."] },
    { key: "weres", label: "Moon-cursed", icon: "🌕", hab: "forest hills grassland arctic", lead: "werewolf-hybrid werebear-hybrid weretiger-hybrid wereboar-hybrid", support: "wolf dire-wolf boar tiger brown-bear werewolf-wolf", names: "folk", races: "human human human elf halfling", loot: "beast",
        doing: [["hunt", "howling at the full moon and closing on the party's camp"], ["camp", "sitting by a fire in human shape, looking nervously at the sky"], ["parley", "running a hunting lodge where the hosts never eat with the guests"], ["ambush", "waiting in the trees, half-changed"]],
        tactics: ["They lead the pack into the party, then fall on whoever is bitten.", "Weapons that aren't silvered barely scratch them; they go for whoever's carrying silver first.", "One of them tries to bite a party member and run, to make another of their kind."],
        morale: ["They flee at dawn, or when silver draws real blood.", "In human form they beg for help with the curse."],
        parley: ["They'll let the party go if no one tells the village.", "A cure for the curse is the one price they'd pay anything for."] },
    { key: "wererats", label: "Wererat gang", icon: "🐀", hab: "town dungeon", lead: "wererat-hybrid wererat-human", support: "wererat-rat giant-rat swarm-of-rats rat thug", names: "folk", races: "human human halfling", loot: "bandit",
        doing: [["work", "smuggling crates through the sewers"], ["ambush", "lurking in a flooded tunnel where the party has to wade"], ["guard", "guarding a thieves' guild drop under the tannery"], ["parley", "offering a shortcut through the sewers, for a fee"]],
        tactics: ["Rat swarms pour out first; the wererats fight from the water.", "They bite to spread the curse, then retreat into pipes too small to follow.", "They know every tunnel and use them to flank."],
        morale: ["They scatter into the drains when the leader falls.", "They'll sell each other out without blinking."],
        parley: ["{gp} buys safe passage through their tunnels.", "Hand over a rival and they'll owe the party a favor."] },
    { key: "wolves", label: "Wolf pack", icon: "🐺", hab: "forest hills grassland arctic mountain", lead: "winter-wolf dire-wolf wolf", support: "wolf dire-wolf", names: "beast", loot: "beast",
        doing: [["hunt", "trailing the party, keeping just out of bowshot"], ["camp", "resting in a den under the roots, cubs nearby"], ["work", "feeding on a fresh kill in the middle of the path"], ["ambush", "fanned out in a half circle in the brush"]],
        tactics: ["They circle, then close on one target from several sides for Pack Tactics.", "Every bite tries to knock someone prone; the rest pile on.", "They test the line and go for the horses or the slowest."],
        morale: ["They break off once the leader is hurt or half the pack is down.", "Fire and loud noise make them hesitate (the leader holds them together)."],
        parley: null },
    { key: "hunters", label: "Apex predator", icon: "🐅", hab: "forest grassland hills arctic mountain swamp", lead: "owlbear brown-bear polar-bear tiger lion saber-toothed-tiger panther giant-boar black-bear giant-constrictor-snake crocodile giant-crocodile", support: "lion panther black-bear boar giant-ape constrictor-snake", names: "beast", loot: "beast",
        doing: [["hunt", "stalking the party, upwind and silent"], ["camp", "asleep in its den, surrounded by bones"], ["work", "feeding on a deer carcass across the path"], ["guard", "defending its young"]],
        tactics: ["It picks the smallest or the slowest and drags them off.", "A beast defending young fights to the death; a hungry one doesn't.", "It strikes from cover, then circles back."],
        morale: ["It flees when bloodied, unless cornered or guarding young.", "A good meal tossed its way (DC 13 Wisdom (Animal Handling)) ends the fight."],
        parley: null },
    { key: "spiders", label: "Spider nest", icon: "🕷️", hab: "forest underdark dungeon swamp", lead: "drider phase-spider ettercap giant-spider", support: "giant-spider giant-wolf-spider swarm-of-spiders spider", names: "beast", loot: "beast",
        doing: [["ambush", "waiting above the webbed path, perfectly still"], ["work", "wrapping something that is still moving"], ["guard", "guarding a clutch of eggs as big as melons"], ["hunt", "following the vibrations of the party's footsteps through the web"]],
        tactics: ["They web the strongest fighter first, then bite whoever tries to cut them free.", "They fight from the trees and ceiling and drop on the back line.", "The web is difficult terrain, and a creature caught in it is restrained (DC 12 Strength to break free)."],
        morale: ["They retreat up into the dark when hurt, waiting for the party to come under them again.", "Burn the egg sac and the nest fights to the end."],
        parley: null },
    { key: "vermin", label: "Swarming vermin", icon: "🪲", hab: "dungeon underdark desert grassland swamp forest", lead: "ankheg giant-scorpion giant-wasp rust-monster giant-centipede", support: "giant-centipede giant-fire-beetle swarm-of-beetles swarm-of-centipedes swarm-of-insects swarm-of-wasps swarm-of-poisonous-snakes stirge", names: "beast", loot: "beast",
        doing: [["hunt", "boiling up out of the ground at the party's footsteps"], ["camp", "nesting in a collapsed cellar"], ["work", "stripping a carcass to the bone"], ["ambush", "burrowed just under the surface"]],
        tactics: ["The swarms bury the front line while the big ones go for the back.", "They go for anything that moves, and anything that's metal, if it's a rust monster."],
        morale: ["Fire and smoke drive them off.", "They fight until the nest is safe or they're all dead."],
        parley: null },
    { key: "lurkers", label: "Dungeon lurkers", icon: "🫧", hab: "dungeon underdark town", lead: "black-pudding gelatinous-cube roper cloaker otyugh mimic ochre-jelly gibbering-mouther", support: "gray-ooze darkmantle grick ochre-jelly rug-of-smothering violet-fungus shrieker", names: "beast", loot: "beast",
        doing: [["ambush", "pretending to be part of the room"], ["work", "slowly cleaning the corridor of everything organic"], ["hunt", "sliding down the corridor after the party's lantern light"], ["guard", "sitting on the only way across the room"]],
        tactics: ["They wait for someone to walk into them and then hold on.", "Acid and slime ruin weapons: anyone hitting them with metal should worry.", "Darkmantles drop from the ceiling and snuff the light."],
        morale: ["Mindless: they fight until destroyed or until their prey gets out of reach.", "Most are slow: walking away works."],
        parley: null },
    { key: "workshop", label: "Wizard's guardians", icon: "🔮", hab: "dungeon town mountain", lead: "iron-golem stone-golem clay-golem flesh-golem shield-guardian mage gargoyle", support: "animated-armor flying-sword rug-of-smothering homunculus gargoyle", names: null, loot: "mage",
        doing: [["guard", "standing perfectly still in alcoves until the wrong word is spoken"], ["work", "still dusting the wizard's library, decades after the wizard died"], ["ambush", "posing as furniture, decoration, and a very ordinary rug"], ["parley", "a homunculus asks for the password, politely"]],
        tactics: ["Constructs follow their last orders exactly, and only those.", "The flying swords harry spellcasters; the armor blocks doorways.", "Golems go for whoever damaged them last."],
        morale: ["Constructs never flee. They stop if given the right password or if their maker commands it.", "They don't follow past the edge of the place they guard."],
        parley: ["The password is somewhere in the wizard's notes, if anyone can find it.", "The homunculus would trade its master's secrets for its freedom."] },
    { key: "drow", label: "Drow patrol", icon: "🕸️", hab: "underdark", lead: "drider mage drow", support: "drow giant-spider giant-lizard", names: "drow", loot: "soldier",
        doing: [["travel", "returning from a raid with surface-dweller captives"], ["guard", "guarding a bridge over a chasm"], ["ambush", "waiting in magical darkness in the side passage"], ["parley", "offering a trade, with knives behind their backs"]],
        tactics: ["They open with Darkness and Faerie Fire, then shoot poisoned bolts at anyone outlined.", "Sleeping-poison bolts first; the unconscious are taken alive for the slave pens.", "The mage stays behind the spiders."],
        morale: ["They fall back to report the moment the fight turns, abandoning anyone too slow.", "A captured drow lies about everything, beautifully."],
        parley: ["They'd sell a rival house's secrets for {gp} in surface gold.", "They'd let the party pass if they kill a target in a rival house."] },
    { key: "duergar", label: "Duergar prospectors", icon: "⛏️", hab: "underdark mountain", lead: "duergar", support: "duergar giant-lizard rust-monster", names: "folk", races: "dwarf", loot: "miner",
        doing: [["work", "mining a seam of something that glows faintly"], ["travel", "driving slaves in chains toward their city"], ["guard", "guarding a forge-gate with unblinking stares"], ["parley", "offering to sell the party a map, at a terrible price"]],
        tactics: ["They grow to giant size on the first round and fight shoulder to shoulder.", "They go invisible to slip away or flank."],
        morale: ["They fight with grim persistence and retreat only on their leader's order.", "They'll surrender if it's profitable."],
        parley: ["They'd take {gp} or a good weapon to look the other way.", "Duergar honor written contracts, to the letter and not one word beyond."] },
    { key: "grimlocks", label: "Deep dwellers", icon: "🦇", hab: "underdark dungeon", lead: "grimlock grick", support: "grimlock darkmantle swarm-of-bats giant-bat grick", names: null, loot: "beast",
        doing: [["hunt", "sniffing the air and moving toward the party's scent"], ["ambush", "waiting in silence along the walls"], ["camp", "gnawing bones in a cave full of bats"]],
        tactics: ["They don't need to see: they fight in total darkness and like it that way.", "Bats and darkmantles go for the light sources first."],
        morale: ["They flee from bright light and loud noise.", "They fight to the end in their own lair."],
        parley: null },
    { key: "lizardfolk", label: "Lizardfolk hunters", icon: "🐊", hab: "swamp coast forest", lead: "lizardfolk", support: "lizardfolk crocodile giant-lizard giant-frog", names: "lizard", loot: "raider",
        doing: [["hunt", "hunting in the reeds, and the party looks like food"], ["guard", "guarding the egg-mounds of their village"], ["parley", "watching the party with cold interest from the water's edge"], ["camp", "eating something raw in silence"]],
        tactics: ["They drag people into the water and hold them under.", "Crocodiles go in first; the hunters attack anyone the crocs have grappled."],
        morale: ["They stop the moment the fight stops being worth the meat.", "Purely practical: they retreat if losing and come back later."],
        parley: ["They'd trade a safe route through the swamp for meat or iron worth {gp}.", "They see no shame in switching sides."] },
    { key: "sahuagin", label: "Sahuagin raid", icon: "🦈", hab: "sea coast", lead: "sahuagin merrow", support: "sahuagin reef-shark hunter-shark", names: null, loot: "raider",
        doing: [["hunt", "circling beneath the boat"], ["work", "raiding a fishing village under a moonless sky"], ["guard", "guarding a sunken shrine to their shark god"], ["ambush", "waiting in the kelp for anything that falls in the water"]],
        tactics: ["They drive their sharks into a frenzy and drag swimmers under.", "They attack from below, where the party can't see them."],
        morale: ["They retreat into the deep if the priestess or baron falls.", "Blood in the water makes them reckless: they fight until half are gone."],
        parley: null },
    { key: "deep", label: "Beasts of the deep", icon: "🐙", hab: "sea coast", lead: "kraken dragon-turtle giant-shark killer-whale plesiosaurus giant-octopus hunter-shark giant-crab", support: "reef-shark quipper swarm-of-quippers giant-crab octopus giant-sea-horse", names: "beast", loot: "beast",
        doing: [["hunt", "rising beneath the party's boat"], ["guard", "guarding its territory in the reef"], ["work", "feeding on a wreck"]],
        tactics: ["It goes for the boat, not the people. Without a boat, people are easy.", "It grapples and drags under."],
        morale: ["It dives and swims away when bloodied.", "Throw it something tastier and it goes after that."],
        parley: null },
    { key: "hags", label: "Hag and servants", icon: "🧙", hab: "swamp forest coast hills", lead: "green-hag sea-hag night-hag", support: "will-o-wisp ogre giant-toad swarm-of-ravens wolf giant-frog troll", names: "hag", loot: "otherworld",
        doing: [["parley", "a kindly old woman offers the party soup at her cottage door"], ["work", "stirring a cauldron, and the smell is almost pleasant"], ["guard", "guarding a stolen child, who is asleep on a pile of furs"], ["ambush", "an illusion of a lost child crying for help in the mist"]],
        tactics: ["She hides behind illusions until the last moment, then lets her servants do the work.", "She curses the bravest one first."],
        morale: ["She flees the moment she's hurt badly, through a hidden door or into the water.", "Her servants keep fighting until she's gone."],
        parley: ["She'll trade anything. Her price is never coin: a voice, a year, a name.", "She'd give up the child for a better bargain."] },
    { key: "fey", label: "Grove wardens", icon: "🧚", hab: "forest", lead: "treant dryad unicorn blink-dog satyr", support: "sprite satyr blink-dog awakened-shrub awakened-tree", names: "fey", loot: "otherworld",
        doing: [["parley", "a satyr with a pipe challenges the party to a riddle contest"], ["guard", "guarding a ring of mushrooms that glows at dusk"], ["work", "holding a revel that's been going for three days"], ["ambush", "watching invisibly as the party camps in the wrong place"]],
        tactics: ["Sprites put people to sleep with arrows; the dryad charms the strongest.", "They play tricks, not murder: they want the party humiliated and gone."],
        morale: ["They melt into the trees when the fight turns.", "An apology with a gift ends the fight at once."],
        parley: ["Win a contest, or give a promise they'll hold you to forever.", "They'd let the party pass for a song, a secret, or a lock of hair."] },
    { key: "giants-hill", label: "Hill giants and ogres", icon: "🗿", hab: "hills grassland forest mountain", lead: "hill-giant ettin ogre", support: "ogre dire-wolf giant-boar goblin", names: "giant", loot: "raider",
        doing: [["work", "stealing cattle from a farm, one under each arm"], ["camp", "eating a whole sheep, raw"], ["hunt", "following the smell of the party's dinner"], ["guard", "sitting on a bridge they've decided is theirs"]],
        tactics: ["They hit whatever's closest, as hard as they can.", "They throw rocks first, then wade in.", "They pick people up and throw them."],
        morale: ["They wander off when bored or badly hurt.", "Food stops them faster than steel."],
        parley: ["They'd take a cow, or {gp} in food, to let the party go.", "Trick them: they're not clever (DC 12 Charisma (Deception))."] },
    { key: "giants-frost", label: "Frost giants", icon: "🧊", hab: "arctic mountain", lead: "frost-giant", support: "winter-wolf polar-bear ogre ice-mephit", names: "giant", loot: "raider",
        doing: [["travel", "marching through the snow toward a lowland village"], ["hunt", "hunting mammoth, and now the party"], ["camp", "feasting in a hall of ice"], ["parley", "challenging the party to a contest of strength"]],
        tactics: ["Winter wolves breathe cold to soften the party; the giants finish.", "They throw boulders of ice from range."],
        morale: ["They respect strength: beat one in single combat and the rest hold back.", "They retreat when the leader falls, to return with more."],
        parley: ["Win a contest of strength or drinking and they treat you as guests.", "They'd trade passage for news of their enemies."] },
    { key: "giants-fire", label: "Fire giants' forge", icon: "🔥", hab: "mountain underdark", lead: "fire-giant salamander", support: "hell-hound azer magmin salamander fire-elemental", names: "giant", loot: "miner",
        doing: [["work", "working a great forge, sparks flying"], ["guard", "guarding a lava bridge"], ["travel", "driving prisoners toward the forge mines"], ["parley", "demanding the party kneel"]],
        tactics: ["Hell hounds breathe fire in a cone; the giants fight from behind the flames.", "They shove people toward the lava."],
        morale: ["Proud: they fight to the death in front of their kin.", "They'll retreat to fetch reinforcements if outnumbered."],
        parley: ["They'd accept rare metal worth {gp} as tribute.", "Fire giants keep bargains, to the letter."] },
    { key: "giants-high", label: "Giant lords", icon: "☁️", hab: "mountain coast hills", lead: "storm-giant cloud-giant stone-giant", support: "griffon giant-eagle air-elemental earth-elemental stone-giant", names: "giant", loot: "raider",
        doing: [["parley", "watching the party with vast, patient interest"], ["guard", "guarding the pass from the mountain's heart"], ["travel", "striding across the landscape on business of their own"], ["work", "carving runes into the mountainside"]],
        tactics: ["They fight from where they can't be reached: cliffs, clouds, high ground.", "They throw boulders and move away."],
        morale: ["They withdraw from a fight beneath their dignity.", "They fight seriously only if their home is threatened."],
        parley: ["They'd speak with the party if the party shows proper respect.", "They want a favor done in the small world below."] },
    { key: "brutes", label: "Trolls and brutes", icon: "👹", hab: "swamp forest hills mountain arctic underdark", lead: "troll oni ettin ogre minotaur", support: "ogre goblin orc worg", names: "brute", loot: "raider",
        doing: [["guard", "living under a bridge and charging a toll"], ["hunt", "following the party through the swamp, sniffing"], ["camp", "asleep in a cave that smells awful"], ["work", "fishing in the river with its bare hands"]],
        tactics: ["It goes for the nearest and the loudest.", "Trolls regenerate unless hit with fire or acid: they fight like they know it."],
        morale: ["It flees only from fire.", "Food or treasure distracts it."],
        parley: ["The toll is {gp}, or a goat.", "Ask it a riddle; it can't resist and isn't good at them."] },
    { key: "elementals", label: "Elemental rift", icon: "🌋", hab: "mountain desert underdark dungeon coast arctic", lead: "djinni efreeti invisible-stalker xorn fire-elemental earth-elemental air-elemental water-elemental salamander azer", support: "dust-mephit ice-mephit magma-mephit steam-mephit magmin azer", names: null, loot: "otherworld",
        doing: [["work", "tearing at the edges of a rift that's opening wider"], ["guard", "bound to guard a summoner's circle, long after the summoner left"], ["hunt", "drifting through the area, burning or freezing everything it touches"]],
        tactics: ["The mephits explode when they die: keep them away from the front line.", "Bound elementals fight only within the circle."],
        morale: ["They fight until banished or destroyed.", "Close the rift and they return home."],
        parley: ["A genie wants freedom, and would grant much for it.", "Bound spirits would bargain to be released."] },
    { key: "devils", label: "Devils and their bargains", icon: "😈", hab: "dungeon town underdark", lead: "pit-fiend ice-devil horned-devil erinyes bone-devil chain-devil barbed-devil bearded-devil", support: "imp lemure hell-hound nightmare bearded-devil barbed-devil", names: "fiend", loot: "otherworld",
        doing: [["parley", "offering a contract with the party's names already written in"], ["guard", "guarding a summoning circle"], ["hunt", "collecting on a debt one of the party doesn't know they owe"], ["work", "torturing a prisoner who owes them a soul"]],
        tactics: ["They fight in formation, devils behind lemures.", "They target the one with a debt or a bargain first."],
        morale: ["Devils retreat when it stops being profitable.", "Lemures fight until destroyed."],
        parley: ["A devil will always make a deal.", "They'd trade the prisoner's soul for a better one."] },
    { key: "demons", label: "Demonic incursion", icon: "👿", hab: "dungeon underdark swamp", lead: "balor marilith nalfeshnee glabrezu hezrou vrock", support: "dretch quasit vrock hezrou", names: "fiend", loot: "otherworld",
        doing: [["hunt", "spilling out of a rift and slaughtering anything nearby"], ["work", "tearing a temple apart, stone by stone"], ["guard", "infesting an old shrine"], ["parley", "a glabrezu offers to grant a wish"]],
        tactics: ["Demons fight with no plan: they attack whatever's nearest.", "The stench of the hezrou poisons the front line."],
        morale: ["They never flee unless banished.", "They turn on each other if the leader falls."],
        parley: ["A glabrezu or succubus will deal; the price is always a betrayal."] },
    { key: "dragon", label: "Dragon and its servants", icon: "🐉", hab: "forest grassland hills mountain swamp coast sea arctic desert", lead: "ancient-red-dragon ancient-blue-dragon ancient-green-dragon ancient-black-dragon ancient-white-dragon ancient-gold-dragon ancient-silver-dragon ancient-bronze-dragon ancient-copper-dragon ancient-brass-dragon adult-red-dragon adult-blue-dragon adult-green-dragon adult-black-dragon adult-white-dragon adult-gold-dragon adult-silver-dragon adult-bronze-dragon adult-copper-dragon adult-brass-dragon young-red-dragon young-blue-dragon young-green-dragon young-black-dragon young-white-dragon young-gold-dragon young-silver-dragon young-bronze-dragon young-copper-dragon young-brass-dragon red-dragon-wyrmling blue-dragon-wyrmling green-dragon-wyrmling black-dragon-wyrmling white-dragon-wyrmling gold-dragon-wyrmling silver-dragon-wyrmling bronze-dragon-wyrmling copper-dragon-wyrmling brass-dragon-wyrmling", support: "kobold lizardfolk half-red-dragon-veteran pseudodragon", names: "dragon", loot: "hoard:dragon",
        doing: [["guard", "sleeping on its hoard, one eye half open"], ["hunt", "flying low over the land, looking for something to eat"], ["parley", "watching the party with curiosity, and asking them a question"], ["work", "taking tribute from a terrified village"]],
        tactics: ["It opens with its breath weapon, then flies out of reach until it recharges.", "It fights from the air and never lands within reach of the strongest fighter.", "Its servants hold the party where the breath can catch them all."],
        morale: ["Proud and wise: it flees when badly hurt, and remembers the party forever.", "It fights to the death only on its hoard."],
        parley: ["Flattery works wonders. So does treasure worth {gp}.", "It wants a rival dragon dead and would pay handsomely for the deed."] },
    { key: "sky", label: "Sky hunters", icon: "🦅", hab: "mountain hills coast desert grassland", lead: "roc wyvern manticore chimera griffon hippogriff giant-eagle harpy", support: "blood-hawk giant-vulture harpy hippogriff giant-eagle", names: "beast", loot: "beast",
        doing: [["hunt", "circling overhead, high enough to look small"], ["guard", "guarding a nest on the cliff"], ["ambush", "diving out of the sun"], ["parley", "a harpy sings to lure travelers to the cliff's edge"]],
        tactics: ["They dive, strike, and climb again so melee can't reach them.", "They grab small creatures and drop them from a height."],
        morale: ["They flee when hurt, and come back when the party is weakened.", "They fight to the death for their nest."],
        parley: null },
    { key: "burrowers", label: "Burrowing terror", icon: "🪱", hab: "underdark desert grassland arctic hills", lead: "tarrasque purple-worm remorhaz bulette behir ankheg", support: "ankheg giant-centipede", names: "beast", loot: "beast",
        doing: [["hunt", "tunneling toward the vibrations of the party's footsteps"], ["ambush", "erupting from beneath the ground"], ["camp", "resting deep underground, while the earth trembles above"]],
        tactics: ["It bursts out of the ground under the biggest group and swallows whoever it can.", "It retreats underground between attacks."],
        morale: ["It burrows away when hurt.", "Stillness makes it lose track of the party."],
        parley: null },
    { key: "oldworld", label: "Ancient guardians", icon: "🏛️", hab: "desert dungeon mountain", lead: "androsphinx gynosphinx guardian-naga spirit-naga medusa lamia basilisk gorgon", support: "gargoyle basilisk cockatrice giant-scorpion mummy", names: null, loot: "hoard:tomb",
        doing: [["parley", "asking a riddle at the entrance to the ruin"], ["guard", "guarding a sealed vault, as it has for centuries"], ["ambush", "waiting among the statues, some of which used to be adventurers"]],
        tactics: ["Gaze attacks first: anyone who doesn't avert their eyes is in trouble.", "The guardian fights only those who break the rules of the place."],
        morale: ["It never leaves the place it guards.", "Obey the old rules and it lets the party pass."],
        parley: ["Answer the riddle or prove your worth.", "The guardian would trade knowledge for news of the outside world."] },
    { key: "celestial", label: "Heaven's wardens", icon: "😇", hab: "mountain grassland forest", lead: "solar planetar deva couatl unicorn pegasus", support: "pegasus giant-eagle unicorn", names: "celestial", loot: "otherworld",
        doing: [["parley", "barring the way and asking the party to justify themselves"], ["guard", "guarding a holy place from the unworthy"], ["hunt", "pursuing someone the party is protecting"]],
        tactics: ["They fight only to stop evil, and use the least force necessary.", "They heal their own and smite the guilty."],
        morale: ["They stop the moment the party shows true repentance.", "They retreat if convinced they're mistaken."],
        parley: ["Truth and goodness are the only payment they accept.", "A good deed, done in their sight, changes their mind."] },
    { key: "aberrant", label: "From beyond", icon: "👁️", hab: "underdark sea swamp dungeon", lead: "aboleth chuul gibbering-mouther cloaker", support: "chuul gibbering-mouther grick darkmantle", names: null, loot: "otherworld",
        doing: [["guard", "lurking in the flooded temple of a forgotten god"], ["hunt", "drawn to the party's thoughts"], ["parley", "speaking directly into the party's minds"]],
        tactics: ["It enslaves minds and turns the party against each other.", "Its servants fight while it watches from the water."],
        morale: ["It retreats into the deep when hurt, and plots revenge.", "Its enslaved servants fight until freed."],
        parley: ["It wants knowledge, and would trade secrets for secrets.", "It offers power in exchange for service."] },
    { key: "dinos", label: "Lost-valley beasts", icon: "🦖", hab: "grassland forest swamp coast", lead: "tyrannosaurus-rex triceratops plesiosaurus elephant mammoth rhinoceros", support: "giant-lizard axe-beak giant-frog", names: "beast", loot: "beast",
        doing: [["hunt", "pushing through the ferns, nostrils flaring"], ["guard", "guarding a nest of huge eggs"], ["work", "grazing, and the party walked right into the herd"]],
        tactics: ["It charges, tramples, and keeps going.", "It goes for the biggest moving thing it can see."],
        morale: ["It flees when hurt, unless defending a nest.", "Loud noises and fire can drive it off."],
        parley: null }
];
const ENC_BAND_BY_KEY = Object.fromEntries(ENC_BANDS.map(b => [b.key, b]));
ENC_BANDS.forEach(b => {
    b.habs = b.hab.split(" ");
    b.leads = b.lead.split(" ");
    b.members = [...new Set([...b.leads, ...b.support.split(" ")])];
});

// Generic scene lines for fights with no group (hand-built, or mixed): by creature type.
const ENC_TYPE_SCENE = {
    aberration: { doing: [["hunt", "drawn to the party's thoughts"], ["guard", "lurking where it shouldn't be"]], tactics: "It uses its strangest power first and studies the party.", morale: "It retreats when hurt and plots revenge." },
    beast: { doing: [["hunt", "hungry and on the party's trail"], ["work", "feeding on a kill"], ["guard", "defending its den"], ["camp", "resting, and startled by the party"]], tactics: "It goes for the closest or the weakest.", morale: "It flees once it's bloodied, unless cornered." },
    celestial: { doing: [["parley", "barring the way"], ["guard", "guarding something holy"]], tactics: "It uses the least force needed.", morale: "It stops when convinced the party isn't evil." },
    construct: { doing: [["guard", "standing guard where it was put"], ["work", "doing the last thing it was ordered to do"]], tactics: "It follows its orders exactly.", morale: "It never flees." },
    dragon: { doing: [["guard", "lounging on its hoard"], ["hunt", "on the wing, hungry"], ["parley", "curious and talkative"]], tactics: "Breath first, then the air.", morale: "It flees when badly hurt, and remembers." },
    elemental: { doing: [["hunt", "loose and destructive"], ["guard", "bound to guard this place"]], tactics: "It attacks whatever's nearest.", morale: "It fights until destroyed or banished." },
    fey: { doing: [["parley", "curious and mischievous"], ["guard", "guarding a fey place"]], tactics: "Tricks and charms before blades.", morale: "It vanishes when the fun stops." },
    fiend: { doing: [["parley", "offering a deal"], ["hunt", "hunting souls"], ["guard", "guarding a portal"]], tactics: "It goes for the weakest will first.", morale: "It retreats when it stops being worth it." },
    giant: { doing: [["work", "going about its business"], ["guard", "guarding its home"], ["hunt", "hungry"]], tactics: "Rocks first, then it wades in.", morale: "It leaves when bored or badly hurt." },
    humanoid: { doing: [["travel", "on the road"], ["camp", "in camp"], ["parley", "suspicious of strangers"], ["ambush", "waiting in ambush"], ["guard", "on guard"]], tactics: "They fight smart: cover, flanking, and focus on whoever's hurt.", morale: "They surrender or run once things go badly." },
    monstrosity: { doing: [["hunt", "stalking prey"], ["guard", "in its lair"], ["ambush", "lying in wait"]], tactics: "It uses its strangest ability first.", morale: "It flees when bloodied." },
    ooze: { doing: [["hunt", "creeping along the floor"], ["ambush", "lying in wait"]], tactics: "It engulfs or dissolves anything it touches.", morale: "It never flees." },
    plant: { doing: [["ambush", "lying still among other plants"], ["guard", "rooted in place"]], tactics: "It holds whatever comes close.", morale: "It never flees." },
    swarm: { doing: [["hunt", "boiling out of the dark"], ["camp", "nesting"]], tactics: "It overwhelms whoever's closest.", morale: "Fire or smoke disperses it." },
    undead: { doing: [["hunt", "drawn to the living"], ["guard", "guarding its tomb"], ["ambush", "lying still among the dead"]], tactics: "It attacks the living without pause.", morale: "It fights until destroyed." }
};

// Who notices whom, by what the foes are doing (SRD 5.1 surprise: Stealth vs passive Perception).
const ENC_AWARENESS = {
    ambush: "They're hidden and waiting. Roll their Stealth against each character's passive Perception: anyone who doesn't notice them is surprised in the first round.",
    camp: "They haven't seen the party. A group Stealth check against their passive Perception lets the party choose the moment, and any foe who doesn't notice the party is surprised.",
    work: "They're busy and haven't looked up. The party can watch, sneak closer, or strike first: any foe who doesn't notice the party is surprised.",
    guard: "They're watching the approach. No one is surprised, but the party can see the setup before deciding.",
    travel: "Both sides spot each other at the same moment. No one is surprised.",
    hunt: "They've already picked up the party's trail. Roll their Stealth against the party's passive Perception to see if they get the first strike.",
    parley: "They've seen the party and call out before anyone draws steel. Talking comes first, if the party wants it."
};
const ENC_TITLE_EVENTS = {
    ambush: ["Ambush", "Trap", "Bushwhacking", "Snare"], camp: ["Raid", "Night Raid", "Surprise", "Fire"],
    work: ["Interruption", "Business", "Trouble", "Discovery"], guard: ["Standoff", "Crossing", "Checkpoint", "Gate"],
    travel: ["Meeting", "Collision", "Clash", "Run-In"], hunt: ["Hunt", "Chase", "Stalking", "Pursuit"],
    parley: ["Bargain", "Parley", "Offer", "Proposal"]
};
const ENC_GENERIC_EVENTS = ["Fight", "Skirmish", "Battle", "Bloodshed", "Reckoning", "Last Stand", "Brawl"];

// Leader names. 'folk' uses npc-data's buildName when it's loaded.
const ENC_NAMES = {
    goblin: { first: ["Snikkit", "Grubbo", "Nagrat", "Skarza", "Yipwort", "Drubnik", "Gnashgob", "Krikket", "Splug", "Zitty", "Brakkle", "Lurkwick", "Fitchet", "Mogwart", "Rikrak", "Bonk", "Squee", "Nibbit"],
        epithets: ["the Ear-Biter", "Two-Knives", "the Lucky", "Half-Nose", "the Sneak", "Rat-Catcher", "Big Hat", "the Clever", "Stab-First", "the Self-Crowned"] },
    orc: { first: ["Grutsh", "Ushkar", "Murzog", "Bolgra", "Thrakka", "Gorrum", "Yazgash", "Krugg", "Shagra", "Durbag", "Vrok", "Lugdusha", "Narzug", "Oggrim"],
        epithets: ["Skull-Splitter", "the Unbowed", "Ironhide", "Wolf-Rider", "Many-Scars", "the Red", "Elf-Bane", "Bone-Breaker", "One-Eye", "Ash-Born"] },
    gnoll: { first: ["Yeenok", "Gharr", "Kruk-Kruk", "Shennek", "Hrrak", "Ghuul", "Tarrak", "Vhenna", "Yikrit", "Rakkash"],
        epithets: ["Who Laughs Last", "Marrow-Sucker", "the Gaunt", "Always-Hungry", "Red Muzzle", "Bone-Chewer"] },
    kobold: { first: ["Snig", "Tikka", "Kib", "Drix", "Yarp", "Vexi", "Pokket", "Skib", "Tazz", "Irk", "Zzap", "Mipsy"],
        epithets: ["Trap-Maker", "the Dragon-Sworn", "Shiny-Finder", "Tunnel-Boss", "the Loud", "Three-Tails"] },
    giant: { first: ["Brundar", "Hrolga", "Thokk", "Grumbald", "Skarri", "Ulfa", "Torvald", "Magga", "Jorund", "Hulda", "Bergthor", "Sigrunna"],
        epithets: ["Stone-Fist", "the Tall", "Cave-Thane", "Cattle-Thief", "the Patient", "Mountain-Born", "Hall-Breaker"] },
    brute: { first: ["Grumble", "Gnawbone", "Mudge", "Thrumm", "Bogsnout", "Lumpkin", "Old Gristle", "Mossback"],
        epithets: ["Under-the-Bridge", "the Ever-Hungry", "Toll-Taker", "the Smelly", "Who Counts on Fingers"] },
    drow: { first: ["Vrinael", "Ilztra", "Zeldryn", "Myrrhael", "Sszyrin", "Quavira", "Nhaundra", "Tallith", "Velkyn", "Jhaerith"],
        houses: ["Vexarr", "Dhaunril", "Zaurith", "Mylaen", "Orrexis", "Xarundra"] },
    lizard: { first: ["Sees-Too-Much", "Old Scale", "Bites-the-Moon", "Thinks-Twice", "Long-Tail", "Cold-Belly", "Swims-Alone", "Grey-Teeth"] },
    hag: { titles: ["Granny", "Auntie", "Mother", "Old Nan", "Grandmother"], names: ["Nettle", "Bramble", "Mirewort", "Hemlock", "Thistle", "Pickle", "Blackbile", "Mossbottom", "Cobweb", "Gristle"] },
    fey: { first: ["Thistledown", "Fennick", "Morrowglade", "Bramblewick", "Dewdrop", "Ashlock", "Willowmere", "Puckle"] },
    dragon: { a: ["Vyr", "Ash", "Thal", "Mor", "Zar", "Kel", "Syr", "Ur", "Ix", "Dra", "Vel", "Ghor"], b: ["axa", "idrax", "oneth", "thyss", "avex", "ulon", "ithra", "ystrix", "orrak", "enith"],
        epithets: ["the Hoard-Counter", "Sky-Scourge", "the Patient", "the Vain", "Who Remembers", "the Glutton", "the Old"] },
    fiend: { a: ["Az", "Bel", "Mal", "Xer", "Gor", "Shax", "Vor", "Zeph", "Nib", "Ur"], b: ["akoth", "ezal", "ghast", "imon", "orath", "uul", "ithel", "azzar"] },
    celestial: { first: ["Aurienne", "Solace", "Halcyon", "Vigil", "Seraphine", "Lumen", "Mercy", "Valor"] }
};
const ENC_LEADER_MARKS = ["wears a stolen magistrate's chain of office", "has a fresh scar across one cheek", "carries a battered old shield painted with a crude eye", "is missing two fingers on the sword hand", "speaks in a calm, quiet voice that carries", "wears too many rings", "has a pet raven on one shoulder", "laughs at everything, especially pain", "is younger than the rest and trying hard to prove it", "has a voice like gravel in a bucket", "carries a lucky charm and touches it constantly", "wears a dead knight's helmet, two sizes too big", "has filed teeth", "limps from an old wound", "is unusually polite", "keeps a tally of kills in notches on a belt"];
// Which creature types each name style fits (others fall back to their type's style, or no name).
const ENC_NAME_TYPES = {
    folk: ["humanoid", "undead"], goblin: ["humanoid", "giant"], orc: ["humanoid", "giant"], gnoll: ["humanoid", "giant"],
    kobold: ["humanoid"], lizard: ["humanoid"], drow: ["humanoid", "monstrosity"], giant: ["giant"], brute: ["giant", "monstrosity"],
    hag: ["fey"], fey: ["fey", "plant", "celestial"], dragon: ["dragon"], fiend: ["fiend"], celestial: ["celestial"], undead: ["undead"]
};
// Humanoids whose names aren't 'folk' names (null: no name).
const ENC_ID_STYLE = { goblin: "goblin", hobgoblin: "goblin", bugbear: "goblin", orc: "orc", gnoll: "gnoll", kobold: "kobold", lizardfolk: "lizard",
    drow: "drow", sahuagin: null, grimlock: null, merfolk: null, "deep-gnome-svirfneblin": null };
const ENC_MONSTER_MARKS = ["is bigger than the rest of them", "bears old scars from a fight it won", "has one clouded eye", "is older than anything else here, and moves like it", "has a strange sigil glowing on its brow", "is already wounded, and twice as dangerous for it", "has a trophy from its last victim hanging on it", "never takes its eyes off the party's spellcaster", "hums or clicks to itself, constantly", "is missing a piece of itself and doesn't seem to care"];
const ENC_BEAST_MARKS = ["has a torn ear and a white muzzle", "is the biggest of them, by a good margin", "has an old arrow wound that still weeps", "has one clouded eye", "is scarred all down one side", "moves with a limp, and is twice as angry for it", "has an odd coloring: pale, almost silver", "wears a broken collar, so someone once owned it"];
const ENC_UNDEAD_MARKS = ["still wears the rusted crown it was buried in", "drags a broken chain", "has a mouth that never stops moving", "whispers a name over and over", "has a dagger still buried in its chest", "glows faintly with grave light"];

const ENC_TWISTS = [
    "On round {n}, {a monster} drawn by the noise arrives, and it goes for whoever is bloodied.",
    "They have a prisoner: {captive}, gagged and tied up. If the fight turns, they'll use them as a shield.",
    "One of them is already hurt (half hit points) and wants out of this life.",
    "The leader is the only one who wants this fight; the rest stop if the leader falls.",
    "They mistake the party for {mistaken}, and say so loudly.",
    "They're running from something worse: {a monster} is an hour behind them.",
    "One more joins them on round 3, unless someone stops the runner who went for help.",
    "One of them has something the party wants: {thing}.",
    "A witness hides nearby: {witness}, who'll tell the story however it benefits them.",
    "Halfway through, one of them recognizes a party member from somewhere, and stops to stare."
];
const ENC_CAPTIVES = ["a merchant's son", "a priest of the local temple", "a halfling peddler", "a terrified tax collector", "a dwarf miner", "a young noble in muddy silks", "a goatherd", "a messenger with a sealed letter", "a captured scout of a rival band", "a dog that won't stop barking"];
const ENC_MISTAKEN = ["the people who robbed them last week", "tax collectors", "agents of the local lord", "the bounty hunters they've been warned about", "a rival band", "the ones their master told them to expect"];
const ENC_THINGS = ["a map with a mark on it", "a stolen holy symbol", "a letter addressed to a party member", "the key to a nearby vault", "a sword the party has seen before", "a ledger listing bribes", "a strange glowing stone", "a lockbox that rattles"];
const ENC_WITNESSES = ["a farmer behind a hedge", "a child up a tree", "a bard taking notes", "a nervous merchant under a cart", "a priest on the road", "a wandering tinker"];

// SRD 5.1 Damage Severity by Level (setback) and an easy-to-medium DC by party level.
function encHazardNumbers(level) {
    return level <= 4 ? { dc: 11, dmg: "1d10" } : level <= 10 ? { dc: 13, dmg: "2d10" } : level <= 16 ? { dc: 15, dmg: "4d10" } : { dc: 17, dmg: "10d10" };
}

function encAn(word) {
    return (/^[aeiou]/i.test(word) ? "an " : "a ") + word;
}

// The group a list of monsters belongs to: the band holding the most of them (lead first),
// ties to the earlier band. Null when no band holds the strongest monster.
function encInferBand(list) {
    if (!list.length) return null;
    const lead = list.reduce((a, b) => (b.m.xp > a.m.xp ? b : a)).m;
    let best = null, bestN = 0;
    ENC_BANDS.forEach(b => {
        if (!b.members.includes(lead.id)) return;
        const n = list.filter(e => b.members.includes(e.m.id)).length;
        if (n > bestN) { best = b; bestN = n; }
    });
    return best;
}

function encBandFits(band, list) {
    return !!band && list.every(e => band.members.includes(e.m.id));
}

// A rolled fight from one group of foes (and/or one habitat). opts: { type, habitat, band }
// band: '' = any group, 'none' = no group (any monster, like before), or a band key.
// Returns { list, band } (band = the key, or null).
function rollThemedEncounter(budget, diff, opts = {}) {
    const { type = "", habitat = "", band = "" } = opts;
    const target = budget[diff];
    const maxCr = Math.max(0.125, Math.floor(budget.avgLevel));
    const fits = m => m && m.xp > 0 && m.xp <= target && crValue(m.cr) <= maxCr && (!type || m.type === type);
    const floor = diff === "high" ? budget.moderate : diff === "moderate" ? budget.low : 0;
    const inHab = m => !habitat || (ENC_MONSTER_HABITATS[m.id] || []).includes(habitat);
    // The whole group keeps to one habitat (the one picked, or one of theirs) when it can,
    // so swamp crocodiles don't turn up with mountain bears. Untagged members go anywhere.
    // strict: give up (rather than leave the habitat) when no leader lives there.
    const tryBand = (b, strict, randomBand = false) => {
        const all = b.members.map(id => MONSTER_BY_ID[id]).filter(fits);
        if (!all.length) return [];
        const h = habitat || pick(b.habs);
        const local = all.filter(m => !ENC_MONSTER_HABITATS[m.id] || ENC_MONSTER_HABITATS[m.id].includes(h));
        const home = local.some(m => b.leads.includes(m.id));
        if (!home && strict) return [];
        const pool = home ? local : all;
        // A random group needs one of its leaders in the fight (no necromancer-less zombies).
        if (randomBand && !pool.some(m => b.leads.includes(m.id) && m.xp >= budget[diff] * 0.15)) return [];
        return fillEncounter(pool, budget, diff, pool.filter(m => b.leads.includes(m.id)));
    };
    if (band && band !== "none") {
        const b = ENC_BAND_BY_KEY[band];
        return { list: b ? tryBand(b) : [], band: b ? b.key : null };
    }
    if (band !== "none" && rand() < 0.85) {
        const canLead = m => fits(m) && m.xp >= target * 0.15 && inHab(m);
        const bands = ENC_BANDS.filter(b => (!habitat || b.habs.includes(habitat)) && b.leads.some(id => canLead(MONSTER_BY_ID[id])));
        let best = null, bestXp = 0;
        for (let t = 0; t < 8 && bands.length; t++) {
            const b = bands.splice(Math.floor(rand() * bands.length), 1)[0];
            const list = tryBand(b, !!habitat, true);
            const xp = encounterXp(list);
            if (xp > bestXp) { best = { list, band: b.key }; bestXp = xp; }
            if (xp > floor) break;
        }
        if (best) return best;
    }
    const pool = MONSTERS.filter(m => fits(m) && inHab(m));
    return { list: pool.length ? fillEncounter(pool, budget, diff) : [], band: null };
}

// The scene for a fight. Each part draws from its own child seed, so adding a monster
// by hand changes only the parts that depend on who's there.
// opts: { habitat ('' = pick one that suits them), band (a band key, or null to infer), level }
function rollEncounterScene(list, seed, opts = {}) {
    if (!list.length) return null;
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const band = ENC_BAND_BY_KEY[opts.band] && encBandFits(ENC_BAND_BY_KEY[opts.band], list) ? ENC_BAND_BY_KEY[opts.band] : encInferBand(list);
    const leadEntry = list.reduce((a, b) => (b.m.xp > a.m.xp ? b : a));
    const lead = leadEntry.m;
    const level = Math.min(20, Math.max(1, Math.round(opts.level || 1)));
    const typeScene = ENC_TYPE_SCENE[lead.type] || ENC_TYPE_SCENE.humanoid;
    const num = encHazardNumbers(level);
    const fill = s => s.replace(/\{dc\}/g, num.dc).replace(/\{dmg\}/g, num.dmg);

    const habitat = part("habitat", () => {
        if (ENC_HABITATS[opts.habitat]) return opts.habitat;
        // Somewhere every monster here lives (the lead's homes if there's no such place).
        const own = ENC_MONSTER_HABITATS[lead.id] || [];
        const shared = own.filter(h => list.every(e => !ENC_MONSTER_HABITATS[e.m.id] || ENC_MONSTER_HABITATS[e.m.id].includes(h)));
        const homes = shared.length ? shared : own;
        const both = band ? homes.filter(h => band.habs.includes(h)) : homes;
        const choices = both.length ? both : own.length ? own : band ? band.habs : ["dungeon"];
        return pick(choices);
    });
    const H = ENC_HABITATS[habitat];
    const doing = part("doing", () => pick(band ? band.doing : typeScene.doing));
    const tag = doing[0];

    const distance = part("distance", () => {
        const [n, sides, mult] = H.dist;
        let feet = 0;
        for (let i = 0; i < n; i++) feet += 1 + Math.floor(rand() * sides);
        feet *= mult;
        if (tag === "ambush" || tag === "parley") feet = Math.max(10, Math.round(feet / 2 / 5) * 5);
        return feet;
    });

    const light = part("light", () => {
        if (!H.sky) return pick([
            "Darkness, unless someone brought a light: heavily obscured beyond it.",
            "A few guttering torches on the walls: dim light, and darkness in the corners.",
            "Darkness. Their eyes are used to it; check who in the party has darkvision."]);
        const t = rand();
        return t < 0.15 ? "Dawn: dim light until the sun is up (lightly obscured; disadvantage on Perception checks that rely on sight)."
            : t < 0.6 ? "Daylight: bright light. Nowhere to hide but cover."
            : t < 0.8 ? "Dusk: dim light, and getting darker each round."
            : rand() < 0.4 ? "Night under a bright moon: dim light in the open, darkness under cover."
            : "Night: darkness beyond any torches or lanterns (heavily obscured).";
    });

    const ground = part("ground", () => {
        const g = [...H.ground];
        const out = [g.splice(Math.floor(rand() * g.length), 1)[0], g.splice(Math.floor(rand() * g.length), 1)[0]];
        const hazard = rand() < 0.5 ? fill(pick(H.hazards)) : null;
        return { features: out, hazard };
    });

    // The leader: the strongest of the group's leader roles that's here (a vampire, not its bats).
    const leader = part("leader", () => {
        const heads = band ? list.filter(e => band.leads.includes(e.m.id)) : [];
        const boss = (heads.length ? heads : list).reduce((a, b) => (b.m.xp > a.m.xp ? b : a));
        const lead = boss.m;
        const fallback = { humanoid: "folk", dragon: "dragon", fiend: "fiend", celestial: "celestial", beast: "beast", swarm: "beast" }[lead.type] || null;
        const own = ENC_ID_STYLE[lead.id];
        const want = own !== undefined ? own : band ? band.names : fallback;
        const style = ["beast", "swarm"].includes(lead.type) ? "beast"
            : want && (ENC_NAME_TYPES[want] || [lead.type]).includes(lead.type) ? want : fallback;
        const r = { a: rand(), b: rand(), c: rand(), d: rand() };
        const at = (arr, x) => arr[Math.floor(x * arr.length)];
        const N = ENC_NAMES[style];
        const markList = lead.type === "humanoid" ? ENC_LEADER_MARKS : style === "beast" ? ENC_BEAST_MARKS : lead.type === "undead" ? ENC_UNDEAD_MARKS : ENC_MONSTER_MARKS;
        const mark = at(markList, r.d);
        if (style === "beast") return { name: null, role: lead.name, person: lead.type === "humanoid", mark, beast: list.length > 1 || boss.count > 1 };
        let name = null;
        if (style === "folk" && typeof buildName === "function") {
            const races = (band && band.races ? band.races : "human").split(" ");
            const race = at(races, r.a);
            name = buildName(race, r.b < 0.5 ? "male" : "female").name;
        } else if (style === "drow") name = `${at(N.first, r.a)} of House ${at(N.houses, r.b)}`;
        else if (style === "hag") name = `${at(N.titles, r.a)} ${at(N.names, r.b)}`;
        else if (style === "dragon") name = `${at(N.a, r.a)}${at(N.b, r.b)}${r.c < 0.5 ? " " + at(N.epithets, r.c * 2) : ""}`;
        else if (style === "fiend") name = `${at(N.a, r.a)}${at(N.b, r.b)}`;
        else if (style === "undead") { if (!/wight|ghost|wraith|mummy|lich|vampire|specter/.test(lead.id)) return { name: null, role: lead.name, person: lead.type === "humanoid", mark }; name = `${typeof buildName === "function" ? buildName(r.b < 0.5 ? "human" : "elf", r.c < 0.5 ? "male" : "female").first : at(ENC_NAMES.giant.first, r.a)} the Unburied`; }
        else if (N && N.first) name = `${at(N.first, r.a)}${N.epithets && r.c < 0.6 ? " " + at(N.epithets, r.b) : ""}`;
        else return { name: null, role: lead.name, person: lead.type === "humanoid", mark };
        return { name, role: lead.name, person: lead.type === "humanoid", mark };
    });

    const tactics = part("tactics", () => band ? pick(band.tactics) : typeScene.tactics);
    const morale = part("morale", () => band ? pick(band.morale) : typeScene.morale);
    const parley = part("parley", () => {
        const talk = band ? band.parley : (["humanoid", "giant", "fiend", "dragon", "fey", "celestial"].includes(lead.type) ? ["They'd talk, for {gp} or a good reason."] : null);
        if (!talk) return null;
        const xp = encounterXp(list);
        const gp = Math.max(5, xp >= 2000 ? Math.round(xp / 5 / 100) * 100 : Math.round(xp / 5 / 5) * 5);
        return pick(talk).replace("{gp}", `${gp.toLocaleString("en-US")} gp`);
    });

    const twist = part("twist", () => {
        if (rand() >= 0.4) return null;
        const pool = [...ENC_TWISTS, ...H.twists];
        const t = pick(pool);
        const maxCr = Math.max(0.125, level);
        const extra = H.monsters.split(" ").map(id => MONSTER_BY_ID[id]).filter(m => m && m.xp > 0 && crValue(m.cr) <= maxCr && !list.some(e => e.m === m));
        const m = pick(extra.length ? extra : [lead]);
        return fill(t.replace("{a monster}", encAn(m.name.toLowerCase())).replace("{n}", 2 + Math.floor(rand() * 3))
            .replace("{captive}", pick(ENC_CAPTIVES)).replace("{mistaken}", pick(ENC_MISTAKEN))
            .replace("{thing}", pick(ENC_THINGS)).replace("{witness}", pick(ENC_WITNESSES)));
    });

    const title = part("title", () => {
        const events = ENC_TITLE_EVENTS[tag] || ENC_GENERIC_EVENTS;
        const ev = rand() < 0.75 ? pick(events) : pick(ENC_GENERIC_EVENTS);
        const place = pick(H.places);
        const who = leader.name && !leader.name.includes(" of ") ? leader.name.split(" ")[0] : null;
        return who && rand() < 0.2 ? `${who}'s ${ev}` : `The ${ev} ${place}`;
    });

    return { seed, band: band ? band.key : null, habitat, title, doing: doing[1], tag, awareness: ENC_AWARENESS[tag], distance, light, ground, leader, tactics, morale, parley, twist,
        loot: band ? band.loot : { beast: "beast", undead: "undead", fiend: "otherworld", fey: "otherworld", celestial: "otherworld", elemental: "otherworld", dragon: "hoard:dragon", humanoid: "bandit" }[lead.type] || "beast",
        lootCr: crValue(lead.cr) };
}

// [label, text] pairs for the page and Copy.
function encSceneLines(s) {
    if (!s) return [];
    const H = ENC_HABITATS[s.habitat], B = ENC_BAND_BY_KEY[s.band];
    const lines = [["Where", `${H.icon} ${H.label}${B ? ` · ${B.icon} ${B.label}` : ""}`]];
    lines.push(["What they're doing", s.doing.charAt(0).toUpperCase() + s.doing.slice(1) + "."]);
    lines.push(["Who notices", s.awareness]);
    lines.push(["Distance", `${s.distance} feet apart when it starts.`]);
    lines.push(["Light", s.light]);
    lines.push(["The ground", s.ground.features.join(" ")]);
    if (s.ground.hazard) lines.push(["Hazard", s.ground.hazard]);
    const L = s.leader;
    if (L) lines.push([L.beast ? "Pack leader" : "Leader", L.name ? `${L.name} (${L.role}), who ${L.mark}.` : `The ${L.role.toLowerCase()} ${L.person ? "who" : "that"} ${L.mark}.`]);
    lines.push(["Tactics", s.tactics]);
    lines.push(["Morale", s.morale]);
    if (s.parley) lines.push(["Parley", s.parley]);
    if (s.twist) lines.push(["Twist", s.twist]);
    return lines;
}

// The loot generator, opened on what these foes would carry (or their hoard).
function encLootLink(s) {
    const cr = s.lootCr;
    const tier = cr <= 4 ? "0-4" : cr <= 10 ? "5-10" : cr <= 16 ? "11-16" : "17+";
    const p = new URLSearchParams();
    if (s.loot.startsWith("hoard:")) { p.set("tab", "hoard"); p.set("hoard-cr", tier); p.set("hoard-source", s.loot.slice(6)); }
    else { p.set("ind-cr", tier); p.set("ind-source", s.loot); }
    p.set("seed", deriveSeed(s.seed, "loot"));
    return "loot-generator.html?" + p.toString();
}
