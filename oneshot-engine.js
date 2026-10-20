/* ============================================
   ONE-SHOT ENGINE (F73): a whole adventure in three acts, page-free.
   rollOneShot(seed, opts, set) composes the other engines into one story:
     site  → a keyed site (site-engine.js rollSite); its boss is the villain
     plot  → the villain's goal, the thing everyone wants, the twist, the clock, the ending
     hook  → Act 1: the town, the tavern (tavern-engine.js), the patron, the job, the pay
     road  → Act 2: the trail (clues), the days on the road (travel-engine.js), the fights
     hoard → the treasure in the last room (loot-engine.js)
   Each part rolls from set[part] or deriveSeed(seed, part), so a kept part holds still while
   the rest reroll. The parts read each other's names (the plot names the site's boss), so a
   new site renames the villain everywhere, but the plot keeps its own picks.
   opts: { level 1-20, party 1-8, length (OS_LENGTHS key), tone (OS_TONES key or 'random'),
           kind (SITE_KINDS key or 'random'), given (an article's campaign block, see below) }
   given: { title, hook, npc: { name, role, want, secret, gender }, place, placeText, tavern, rumor }: the
   article's names stand in for rolled ones (the patron, the town or tavern, the job's opening); the rest rolls.
   The campaign generator (F74) calls this once per chapter.
   Needs rng.js, coins.js, npc-data.js, names-data.js, monsters-data.js, encounter-engine.js,
   history-engine.js, faction-engine.js, travel-engine.js, tavern-engine.js, quest-engine.js,
   town-engine.js, site-engine.js, loot-data.js, and loot-engine.js.
   ============================================ */

const OS_PARTS = ['site', 'plot', 'hook', 'road', 'hoard'];

const OS_LENGTHS = {
    short: { label: 'Short (2-3 hours)', size: 'small', days: [1, 1], fights: 1, pay: 1 },
    standard: { label: 'Standard (3-4 hours)', size: 'medium', days: [1, 2], fights: 1, pay: 1.5 },
    long: { label: 'Two sessions', size: 'large', days: [2, 3], fights: 2, pay: 2.5 }
};

const OS_TONES = {
    heroic: { label: 'Heroic', icon: '⚔️', adj: 'heroic', nouns: ['Oath', 'Last Stand', 'Rescue', 'Banner', 'Siege', 'Vigil'] },
    horror: { label: 'Horror', icon: '🕯️', adj: 'creeping horror', nouns: ['Hunger', 'Whispers', 'Long Night', 'Rot', 'Silence', 'Harrowing'] },
    intrigue: { label: 'Intrigue', icon: '🗝️', adj: 'intrigue', nouns: ['Ledger', 'Masks', 'Bargain', 'Debt', 'Cipher', 'Second Seal'] },
    comedic: { label: 'Comedic', icon: '🎭', adj: 'comedic', nouns: ['Fiasco', 'Kerfuffle', 'Misunderstanding', 'Bad Idea', 'Wild Goose', 'Mix-Up'] }
};
const OS_TONE_KEYS = Object.keys(OS_TONES);

// Where the road runs on the way to each kind of site, and the town it leaves from.
const OS_TERRAIN = {
    crypt: ['road', 'forest', 'moor'], mine: ['hills', 'mountains'], tower: ['forest', 'moor', 'hills'],
    temple: ['swamp', 'jungle', 'coast'], fort: ['hills', 'forest', 'road'], lair: ['hills', 'mountains', 'forest', 'swamp'],
    keep: ['moor', 'hills', 'plains']
};
const OS_TOWN_SETTING = {
    road: 'crossroads', plains: 'farmland', forest: 'forest', hills: 'hills', moor: 'hills', coast: 'coast',
    mountains: 'pass', swamp: 'marsh', jungle: 'river', desert: 'crossroads', badlands: 'pass'
};
const OS_SEASONS = ['spring', 'summer', 'autumn', 'winter'];

// The villain's goal, by what the boss is: a person (folk), an animal (beast), or a thing
// that doesn't bargain (mindless). {villain}, {site}, {item}, {town}.
const OS_GOALS = {
    folk: [
        "wants {item}, because it opens the sealed vault at the bottom of {site}",
        "is gathering blades and coin in {site} to take {town} before the season turns",
        "means to finish a ritual that {site}'s builders abandoned halfway",
        "was cheated by {town}'s council years ago and wants it paid back with interest",
        "is holding {item} for ransom, and the price goes up every day",
        "believes {item} will keep death away from them for good",
        "is digging under {site} for something that was buried on purpose",
        "has been paid by a rival town to ruin {town} before the fair",
        "wants {town} afraid enough to hand over its lord's seal",
        "stole {item} to prove they're the rightful heir to {site}"
    ],
    beast: [
        "was driven from its old hunting ground and has made {site} its den, too close to {town}",
        "is guarding a clutch of young in {site}, and anything that comes near is food",
        "dragged a traveler's pack into {site}, and {item} was in it",
        "has a taste for {town}'s livestock, and lately for more than livestock",
        "was wounded by hunters from {town} and has been taking it out on the road ever since",
        "has grown far bigger than its kind should, and something in {site} is the reason"
    ],
    mindless: [
        "woke when grave robbers broke the seals of {site}",
        "still keeps its last order: let no one take {item} from {site}",
        "spills out of {site} on nights when the old wards fail, and the wards are failing",
        "rises because someone in {town} has been leaving the wrong kind of offerings at {site}",
        "was bound to {item}; when the thieves carried it into {site}, it followed",
        "answers a call from deep inside {site} that only it can hear"
    ]
};

// The twist, by tone. [text, folk only]. {Patron}, {villain}, {item}, {town}, {site}.
const OS_TWISTS = {
    heroic: [
        ["{Patron} is {villain}'s sibling, and hopes the party can bring them home alive.", true],
        ["{Item} is a fake. The real one has been in {town}'s temple all along, and the priest knows it.", false],
        ["Half of {villain}'s followers are pressed farmers from {town}. Free them and they'll turn.", true],
        ["A rival adventuring party reached {site} first. Three of them are still alive in there.", false],
        ["{Villain} is protecting something worse in the depths of {site}, and killing it sets that loose.", false],
        ["{Patron} once served alongside {villain}, and left them behind to die.", true]
    ],
    horror: [
        ["{Patron} has already been replaced by something wearing their face.", false],
        ["Everyone who has held {item} hears it whisper. After this job, that includes the party.", false],
        ["The people of {town} knew all along. They made a bargain to keep {site} fed, and the party is this year's offering.", false],
        ["{Villain} isn't the first victim, just the latest. Whatever did this to them is still in {site}.", false],
        ["The missing are still alive in {site}, and they don't want to be rescued.", false],
        ["Someone in the party's camp has been sleepwalking toward {site} every night.", false]
    ],
    intrigue: [
        ["{Patron} hired {villain} in the first place, and wants the party to clean up the evidence.", true],
        ["{Town}'s reeve sells {villain} supplies every week, and keeps the receipts.", true],
        ["{Item} is a forged deed. Whoever holds it at the end owns half of {town}.", false],
        ["{Villain} is an informant for the crown, and someone powerful wants them kept alive.", true],
        ["Two of {town}'s leading families are paying {villain} to hurt the other one.", true],
        ["The attacks on {town} were staged to drive down the price of its land. Someone is buying it.", false]
    ],
    comedic: [
        ["{Villain} thinks they're the hero of this story, and has a much better song about it.", true],
        ["Three different buyers want {item}, and all three arrive at {site} at the same time.", false],
        ["{Patron} posted the same job with four other parties, and they're all on the road too.", false],
        ["The fearsome lair at {site} is mostly a failing cheese business.", true],
        ["{Item} is cursed to make whoever carries it unbearably honest.", false],
        ["{Villain} owes {Patron} money, and both of them would rather the party didn't find out.", true]
    ]
};

const OS_PATRONS = [
    'the village reeve', 'a worried innkeeper', 'a young temple acolyte', 'a merchant with a missing caravan',
    'a grieving parent', 'a retired adventurer with a bad knee', "the local lord's steward", 'a guild factor',
    'the town healer', 'a nervous mapmaker', 'a widowed farmer', 'a traveling scholar', 'the captain of the watch',
    'a priest of the harvest', "a noble's disgraced cousin", 'the miller, who hears everything'
];
// Why the patron can't do it: {villain}, {site}, {item}.
const OS_WHY = [
    "The watch won't go near {site}, and the lord won't answer letters.",
    "They tried once already. They came back alone.",
    "{Item} was theirs, and nobody else will believe them about it.",
    "It's personal, and they'd rather strangers handled it.",
    "They can pay, and the party looks like the only ones in town who can fight.",
    "Somebody has to, and everyone else has a reason to be busy.",
    "They owe a dangerous person {item}, and the deadline is real.",
    "Their {kin} went to {site} and hasn't come back."
];

// The clock. {n} days; then the line after "or".
const OS_CLOCKS = [
    ["before the new moon, {n} days from now", "the moon goes dark and {villain} finishes what {vthey} started"],
    ["before the harvest fair opens in {n} days", "the fair brings the whole valley to {town}, and {villain} with it"],
    ["within {n} days", "{villain} moves deeper into {site} and the way is sealed behind {vthem}"],
    ["before the lord's tax collector arrives in {n} days", "{town} can't pay, and the lord's soldiers take payment their own way"],
    ["in {n} days, before the river rises", "the floods cut the road to {site} until spring"],
    ["by the next market day, {n} days off", "the buyer for {item} arrives and it's gone for good"]
];

// The trail in Act 2: [skill, what it finds]. {site}, {villain}, {holder}, {item}, {town}, {Patron}.
const OS_CLUES = [
    ['Investigation', "Fresh tracks and a dropped {thing} lead off the road toward {site}."],
    ['Persuasion', "A frightened {townsfolk} admits seeing lights at {site} three nights running."],
    ['History', "The oldest person in {town} remembers what {site} was built for, and why the doors were sealed."],
    ['Perception', "A mark scratched on a milestone matches the one carved over the way into {site}."],
    ['Insight', "{Patron} flinches whenever {villain} is named. They know more than they're saying."],
    ['Survival', "Birds have stopped nesting in a ring around {site}. The ring is easy to follow."],
    ['Arcana', "The empty case {item} was kept in still hums faintly, and the hum is stronger toward {site}."],
    ['Medicine', "The last victim's wounds weren't made by wolves. They were made by {holder}."],
    ['Religion', "A shrine on the road has been defaced with a sign the priests only use for {site}."],
    ['Intimidation', "A drunk who's been bragging in {town} turns out to have sold {villain} rope, lamps, and a map."],
    ['Nature', "The stream that runs out of the hills toward {town} has turned cold and sour, and it rises at {site}."],
    ['Investigation', "A ledger at the trading post shows someone buying a month of food for twenty, to be left at {site}."]
];

// One more thing to make Act 2 harder, by tone.
const OS_COMPLICATIONS = {
    heroic: ["A family on the road begs the party to escort them to safety, the opposite way.",
        "A bridge is out, and the long way round costs a day.",
        "A wounded soldier staggers out of the trees with a warning about {site}.",
        "Refugees from the hills say {villain} has more followers than anyone thought."],
    horror: ["The party passes the same dead tree three times before they notice.",
        "Every farm on the road is empty, with supper still on the table.",
        "A child walks beside the party for a mile, then asks which one of them is staying.",
        "Their own footprints are waiting for them on the trail ahead."],
    intrigue: ["A courier is carrying a sealed letter to {villain}; the seal is {town}'s.",
        "A second party is tailing them, and claims to work for {Patron}.",
        "The innkeeper on the road offers them twice the pay to turn back.",
        "A noble's coach is stopped on the road, and the noble very much wants not to be seen."],
    comedic: ["A goat has decided it belongs to the party, and will not be talked out of it.",
        "A toll-keeper on the road insists on a riddle, and doesn't know the answer either.",
        "A rival party is going the same way, and keeps narrating its own heroics.",
        "A bard is following the party to write the ballad, and keeps asking them to redo things."]
};

// Read-aloud text. Act 1 opens in the tavern: {tavern}, {town}, {Patron}, {patronRole}.
const OS_OPENERS = {
    heroic: "Rain drums on the roof of {tavern}. The common room of {town} is full, but nobody is singing tonight. When the door bangs open, every head turns: {Patron}, {patronRole}, soaked to the skin, looks straight past the locals and at you. \"You carry blades,\" {Patron} says. \"Good. We need them.\"",
    horror: "The fire in {tavern} burns low, and nobody feeds it. {Town} has gone quiet in a way you can feel in your teeth. In the corner, {Patron}, {patronRole}, hasn't touched {their} drink in an hour. When you sit, {Patron} leans close and whispers, \"You're not from here. Good. Then it hasn't noticed you yet.\"",
    intrigue: "{Tavern} is busy enough that nobody hears anything twice. A folded note arrives with your ale: a time, a table, and no name. At the back, {Patron}, {patronRole}, waits with two cups already poured. \"Before I say anything,\" {Patron} says, \"I need to know who else you work for.\"",
    comedic: "Something in {tavern} is on fire, and the regulars are betting on how long before anyone puts it out. {Patron}, {patronRole}, puts it out with {their} hat, sits down at your table uninvited, and says, \"Right. You look like trouble, and I need some trouble going in the other direction.\""
};
// Arriving at the site, by kind; then a line by tone.
const OS_ARRIVE = {
    crypt: "The path ends at a low hill crowned with leaning stones. Steps cut into its side lead down to a door carved with names nobody has read in a long time.",
    mine: "The old mine cuts into the hillside like a wound. Rusted rails run into the dark, and the air that comes out of it is warm and smells of wet stone.",
    tower: "The tower stands alone, taller than it should be, its top lost in low cloud. There are no windows below the third floor, and the door has no handle on the outside.",
    temple: "Half the temple has sunk into the mire. Its steps run down into black water, and its bronze doors stand open a hand's width, as if something pushed them from inside.",
    fort: "The fort is timber and earth, patched with stolen planks. Smoke rises from inside the wall, and somebody has hung a warning on the gate that you can read from here.",
    lair: "The cave mouth is ringed with bones, picked clean and stacked with care. Something big has worn the rock smooth going in and out.",
    keep: "The keep's outer wall has fallen, but the tower still stands. Crows sit along the broken battlements, and not one of them makes a sound."
};
const OS_ARRIVE_TONE = {
    heroic: "Whatever is inside knows you're coming. Let it.",
    horror: "The wind stops when you reach it, as if the whole hill is holding its breath.",
    intrigue: "Someone has been here recently: the ground is trampled, and there are cart tracks that weren't in any of the stories.",
    comedic: "A hand-painted sign by the entrance reads KEEP OUT, and underneath, smaller, THIS MEANS YOU, and underneath that, smaller still, PLEASE."
};
// Facing the boss: {Villain}, {item}.
const OS_BOSS_READ = {
    heroic: "{Villain} waits at the far end of the chamber, {item} within reach. \"You came all this way,\" they say. \"Then let's not waste it.\"",
    horror: "At first you think the chamber is empty. Then {villain} moves, and you understand you've been looking at it the whole time.",
    intrigue: "{Villain} doesn't reach for a weapon. They pour two cups and slide one toward you. \"Before this gets ugly, let me tell you who really sent you.\"",
    comedic: "{Villain} turns, gasps, and drops a plate of something. \"You're early! Nobody is ever early. Give me one moment, I had a whole speech.\""
};
const OS_BOSS_READ_BEAST = "Something huge shifts in the dark ahead. Then {villain} rises, and the chamber is suddenly much smaller than it looked.";

// How it ends: {Villain}, {item}, {town}, {Patron}.
const OS_WIN = {
    heroic: "{Town} rings its bell for the first time in weeks. {Patron} pays in full, and the party drinks free for a month.",
    horror: "The party gets out, and the dawn is real. Whatever was in {site} is quiet now. Nobody in {town} asks how.",
    intrigue: "{Patron} pays, and asks the party to forget names. Somebody in {town} is going to lose a great deal of money over this.",
    comedic: "{Town} throws a party, mostly for itself. {Patron} pays in full, and in a slightly larger amount of cheese than coin."
};
const OS_FAIL = {
    heroic: "{Villain} gets what {vthey} came for. {Town} survives, but now it has to pay, and the party knows where to find {vthem} next time.",
    horror: "The party gets away, but not all of them come back the same. {Site} is quiet for a while. Then it isn't.",
    intrigue: "{Villain} walks free, and someone powerful is grateful. The party now knows too much, and somebody knows that.",
    comedic: "{Villain} wins, and is unbearable about it. A song about the party's failure is in every tavern by the week's end."
};
// Threads for later: {Villain}, {site}, {item}, {town}, {Patron}.
const OS_THREADS = [
    "A map in the last room shows a second site like this one, three days east.",
    "{Item} has a twin, and someone in the capital has been collecting the set.",
    "{Patron} wasn't telling the whole truth, and the rest of it comes out next month.",
    "One of {villain}'s lieutenants got away, and now carries a grudge with a name on it.",
    "The builders of {site} left a mark on the wall that matches a ring the party has seen before.",
    "{Town} wants the party to stay on as its protectors, for a wage it can't really afford.",
    "A letter in the hoard is addressed to someone in {town}, in {villain}'s hand.",
    "The party has been noticed by a power that would like to hire them, or else.",
    "A survivor from {site} has nowhere to go and has decided the party is their family now.",
    "The deed, ledger, or seal in the hoard proves {town}'s lord has been lying for years."
];

// Titles. {Noun} (the tone's), {Site}, {Town}, {Short} (the thing), {Who} (the villain's first name).
const OS_TITLES = [
    'The {Noun} of {Site}', "{Town}'s {Noun}", 'The {Short} of {Town}', 'The {Noun} at {Site}',
    'The {Noun} Beneath {Town}', "{Who}'s {Noun}", 'The {Short} Affair', 'Beyond {Town}: the {Noun}'
];

// A clue's DC by site tier.
const OS_CLUE_DC = { '0-4': 12, '5-10': 14, '11-16': 16, '17+': 18 };

function osPick(arr) {
    return arr[Math.floor(rand() * arr.length)];
}

function osCap(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function osInt(lo, hi) {
    return lo + Math.floor(rand() * (hi - lo + 1));
}

function osClamp(v, lo, hi, d) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}

// The site without "The " at the front, for titles ("The Crypt of Vaelor" → "Crypt of Vaelor").
function osBare(name) {
    return String(name).replace(/^the\s+/i, '');
}

// {key} and {Key} from ctx (capital = first letter up), then npc-data's {kin} etc.
function osFill(text, ctx) {
    const out = String(text).replace(/\{([A-Za-z]+)\}/g, (m, k) => {
        const low = k.charAt(0).toLowerCase() + k.slice(1);
        if (!Object.hasOwn(ctx, low)) return m;
        const v = String(ctx[low]);
        return k === low ? v : osCap(v);
    });
    return typeof fillTemplate === 'function' ? fillTemplate(out) : out;
}

// The boss's lead monster, and what kind of mind it has.
function osVillain(site) {
    const last = site.rooms[site.rooms.length - 1];
    const f = last && last.fight;
    const list = f ? siteFightList(f) : [];
    const lead = list.length ? list.reduce((a, b) => (b.m.xp > a.m.xp ? b : a)).m : null;
    const L = site.boss && site.boss.leader;
    const mind = lead ? (['beast', 'swarm', 'monstrosity', 'plant'].includes(lead.type) ? 'beast' : SITE_MINDS[lead.type] === 'mindless' ? 'mindless' : 'folk') : 'folk';
    const name = L && L.name ? L.name : lead ? `the ${lead.name.toLowerCase()}` : siteHolder(site);
    return {
        name, mind, named: !!(L && L.name), role: L ? L.role : lead ? lead.name : '', mark: L ? L.mark : '',
        monster: lead ? lead.id : null, first: L && L.name && !L.name.includes(' of ') ? L.name.split(' ')[0] : null
    };
}

function osPronouns(gender) {
    return gender === 'male' ? { they: 'he', their: 'his' } : gender === 'female' ? { they: 'she', their: 'her' } : { they: 'they', their: 'their' };
}

// ── The roll ─────────────────────────────────────────────
function rollOneShot(seed, opts = {}, set = {}) {
    const ps = id => (set && set[id]) || deriveSeed(seed, id);
    const level = osClamp(opts.level, 1, 20, 3);
    const party = osClamp(opts.party, 1, 8, 4);
    const length = OS_LENGTHS[opts.length] ? opts.length : 'standard';
    const Lg = OS_LENGTHS[length];
    const given = opts.given || null;
    const budget = partyBudget([{ count: party, level }]);
    const seeds = Object.fromEntries(OS_PARTS.map(id => [id, ps(id)]));
    // A random kind belongs to the site and a random tone to the plot, so a kept part keeps them.
    // Always drawn, so picking one doesn't shift anything else.
    const drawnKind = withSeed(deriveSeed(seeds.site, 'kind'), () => osPick(SITE_KIND_KEYS));
    const drawnTone = withSeed(deriveSeed(seeds.plot, 'tone'), () => osPick(OS_TONE_KEYS));
    const tone = OS_TONES[opts.tone] ? opts.tone : drawnTone;
    const kind = SITE_KINDS[opts.kind] ? opts.kind : drawnKind;

    // ── The site, and its boss as the villain ──
    const site = rollSite(seeds.site, { kind, size: Lg.size, level, party });
    const villain = osVillain(site);

    // ── Act 1: the town, the tavern, the patron ──
    const hook = withSeed(seeds.hook, () => {
        const terrain = osPick(OS_TERRAIN[kind]);
        const rolledTown = townName(OS_TOWN_SETTING[terrain] || 'crossroads');
        const town = given && given.place && !given.tavern ? given.place : rolledTown;
        const npc = rollNPC();
        const role = osPick(OS_PATRONS);
        const why = osPick(OS_WHY);
        const pay = rand();
        return { terrain, town, npc, role, why, pay };
    });
    const tavern = rollTavern(deriveSeed(seeds.hook, 'tavern'));
    if (given && given.place && given.tavern) tavern.name = given.place;
    const patron = {
        name: given && given.npc && given.npc.name ? given.npc.name : hook.npc.name,
        // An article's role is written as a label ("Village midwife"); here it sits mid-sentence.
        role: given && given.npc && given.npc.role ? given.npc.role.replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()) : hook.role,
        race: given && given.npc && given.npc.race ? given.npc.race : '',
        npc: hook.npc,
        want: given && given.npc ? given.npc.want || '' : '',
        secret: given && given.npc && given.npc.secret ? given.npc.secret : hook.npc.secret
    };
    const pro = osPronouns(given && given.npc && given.npc.gender ? given.npc.gender : hook.npc.gender);

    // ── The plot: goal, the thing, twist, clock, ending ──
    const plot = withSeed(seeds.plot, () => {
        const [item, short] = osPick(QUEST_ITEMS);
        const goal = osPick(OS_GOALS[villain.mind]);
        const twistAll = osPick(OS_TWISTS[tone]);
        const twistAny = osPick(OS_TWISTS[tone].filter(t => !t[1]));
        const clock = osPick(OS_CLOCKS);
        const days = osInt(3, 7);
        const noun = osPick(OS_TONES[tone].nouns);
        const title = osPick(OS_TITLES);
        const threads = siteShuffle(OS_THREADS).slice(0, 2);
        return { item, short, goal, twist: villain.mind === 'folk' ? twistAll[0] : twistAny[0], clock, days, noun, title, threads };
    });

    const ctx = {
        villain: villain.name, site: site.name, item: plot.item, town: hook.town, tavern: tavern.name,
        patron: patron.name, patronRole: patron.role, holder: siteHolder(site), they: pro.they, their: pro.their,
        vthey: villain.mind === 'folk' ? 'they' : 'it', vthem: villain.mind === 'folk' ? 'them' : 'it'
    };
    const fill = t => osFill(t, ctx);
    const title = given && given.title ? given.title : fill(plot.title.replace('{Noun}', plot.noun).replace('{Site}', osBare(site.name))
        .replace('{Short}', plot.short).replace('{Who}', villain.first || hook.town).replace('{Town}', hook.town));
    const deadline = fill(plot.clock[0].replace('{n}', plot.days));
    const late = fill(plot.clock[1]);
    const goal = fill(plot.goal);
    const twist = fill(plot.twist);
    const reward = questRound(QUEST_PAY[level] * party * Lg.pay * (0.75 + hook.pay * 0.5));
    const job = given && given.hook ? `${given.hook} ${fill('Every lead points to {site}, and to {villain}.')}`
        : fill(`{Patron} wants {villain} dealt with and {item} brought back from {site}, ${deadline}.`);

    // ── Act 2: the trail, the road, the fights ──
    const road = withSeed(seeds.road, () => {
        const dc = OS_CLUE_DC[site.tier];
        const clues = [];
        const used = new Set();
        siteShuffle(OS_CLUES).forEach(c => {
            if (clues.length < 3 && !used.has(c[0])) { used.add(c[0]); clues.push({ skill: c[0], dc, text: fill(c[1]) }); }
        });
        if (given && given.rumor) clues[2] = { skill: 'Persuasion', dc, text: `${given.rumor} (a rumor in ${hook.town})` };
        const season = osPick(OS_SEASONS);
        const n = osInt(Lg.days[0], Lg.days[1]);
        const days = [];
        let prev = null;
        const usedEv = [];
        for (let d = 0; d < n; d++) {
            const w = rollWeather('temperate', season, prev);
            prev = w;
            const ev = rollRoadEvent(hook.terrain, w, usedEv);
            usedEv.push(ev.t);
            days.push({ weather: weatherHeadline(w), event: ev, scene: rollScene(hook.terrain, season) });
        }
        const complication = fill(osPick(OS_COMPLICATIONS[tone]));
        const fights = [];
        for (let i = 0; i < Lg.fights; i++) {
            const diff = i === 0 ? 'moderate' : 'low';
            const fseed = deriveSeed(seeds.road, 'fight.' + i);
            let r = site.band ? rollThemedEncounter(budget, diff, { band: site.band }) : { list: [], band: null };
            if (!r.list.length) r = rollThemedEncounter(budget, diff, { habitat: SITE_KINDS[kind].habitat });
            if (!r.list.length) continue;
            const scene = rollEncounterScene(r.list, fseed, { band: r.band, level });
            fights.push({ list: r.list.map(e => ({ id: e.m.id, count: e.count })), band: r.band, diff, seed: fseed, scene, day: Math.min(n, i + 1) });
        }
        return { season, days, clues, complication, fights };
    });

    // ── Act 3: the hoard in the last room ──
    const hoard = withSeed(seeds.hoard, () => rollTreasure('hoard', site.tier, 1, true, site.hoard.source));

    // ── The whole thing ──
    const T = OS_TONES[tone];
    const xp = road.fights.reduce((t, f) => t + encounterXp(siteFightList(f)), 0)
        + site.rooms.reduce((t, r) => t + (r.fight ? encounterXp(siteFightList(r.fight)) : 0), 0);
    const bossRead = villain.mind === 'beast' ? OS_BOSS_READ_BEAST : OS_BOSS_READ[tone];
    return {
        seed, seeds, level, party, length, tone, kind, given: !!given, budget,
        title, pitch: fill(`A ${T.adj} one-shot. {Patron}, ${patron.role}, needs {villain} stopped at {site} ${deadline}.`),
        villain: { ...villain, goal },
        truth: fill(`{Villain} ${plot.goal}. ${osCap(late)} if nobody stops {vthem} in time.`),
        item: plot.item, itemShort: plot.short, twist, deadline, late,
        town: hook.town, terrain: hook.terrain, tavern, patron, why: fill(hook.why), job, reward,
        placeText: given && given.placeText ? given.placeText : '',
        opener: fill(OS_OPENERS[tone]), arrive: `${OS_ARRIVE[kind]} ${fill(OS_ARRIVE_TONE[tone])}`, bossRead: fill(bossRead),
        road, site, hoard, xp,
        win: fill(OS_WIN[tone]), fail: fill(OS_FAIL[tone]), threads: plot.threads.map(fill)
    };
}

// ── Helpers for pages ────────────────────────────────────
// Every monster in the adventure once, strongest first (for the stat block appendix).
function osMonsters(o) {
    const ids = new Set();
    o.road.fights.forEach(f => f.list.forEach(e => ids.add(e.id)));
    o.site.rooms.forEach(r => { if (r.fight) r.fight.list.forEach(e => ids.add(e.id)); });
    if (o.site.wander) o.site.wander.list.forEach(e => ids.add(e.id));
    return [...ids].map(id => MONSTER_BY_ID[id]).filter(Boolean).sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
}

function osFightText(f) {
    return siteFightList(f).map(e => `${e.count} × ${e.m.name} (CR ${e.m.cr})`).join(', ');
}

function osFightRating(o, f) {
    const xp = encounterXp(siteFightList(f));
    const r = rateEncounter(xp, o.budget);
    return `${xp.toLocaleString('en-US')} XP${r ? `, ${ENCOUNTER_LEVELS[r].label.toLowerCase()}` : ''}`;
}

// The Toolbox Encounter tab with this fight loaded (it adds to the Initiative tracker from there).
function osFightLink(o, f, habitat) {
    const p = new URLSearchParams({ tab: 'enc', party: `${o.party}x${o.level}` });
    f.list.forEach(e => p.append('m', `${e.id}.${e.count}`));
    if (habitat) p.set('env', habitat);
    if (f.band) p.set('pack', f.band);
    p.set('seed', f.seed);
    return 'toolbox?' + p.toString();
}

// The Worldbuilder's Sites tab, rolling this same site.
function osSiteLink(o) {
    const s = o.site;
    return 'worldbuilder?' + new URLSearchParams({ tab: 'sites', seed: s.seed, kind: s.kind, size: s.size, level: s.level, party: s.party }).toString();
}

// Plain text for Copy (and the notebook's notes, cut to fit there).
function oneShotText(o) {
    const T = OS_TONES[o.tone], s = o.site;
    const out = [
        o.title.toUpperCase(),
        `${T.icon} ${T.label} · ${OS_LENGTHS[o.length].label} · party of ${o.party}, level ${o.level}`,
        o.pitch, '',
        "WHAT'S REALLY GOING ON",
        o.truth,
        `Twist: ${o.twist}`,
        `Deadline: ${osCap(o.deadline)}. If they're late: ${o.late}.`, '',
        'ACT 1: THE HOOK',
        `${o.town}, at ${o.tavern.name} (${o.tavern.kind.label}).`,
        `Read aloud: ${o.opener}`,
        `Patron: ${o.patron.name}, ${o.patron.role}. ${o.patron.npc.trait}. Voice: ${o.patron.npc.voice}.`,
        `The job: ${o.job}`,
        `Why the party: ${o.why}`,
        `Pay: ${formatCoins(o.reward)} for the party.`,
        `Patron's secret: ${o.patron.secret}`, '',
        'ACT 2: THE ROAD',
        ...o.road.clues.map(c => `Clue (DC ${c.dc} ${c.skill}): ${c.text}`),
        ...o.road.days.map((d, i) => `Day ${i + 1} (${d.weather}): ${d.event.t}. ${d.event.d}`),
        `Complication: ${o.road.complication}`,
        ...o.road.fights.map(f => `Fight, day ${f.day}: ${osFightText(f)} (${osFightRating(o, f)}). ${osCap(f.scene.doing)}.`), '',
        `ACT 3: ${s.name.toUpperCase()}`,
        `Read aloud: ${o.arrive}`,
        siteText(s, {}), '',
        `The boss. Read aloud: ${o.bossRead}`,
        `Hoard: ${lootHoardText(o.hoard)}`, '',
        'WRAP-UP',
        `If they win: ${o.win}`,
        `If they fail: ${o.fail}`,
        ...o.threads.map(t => `Loose thread: ${t}`),
        `XP for every fight: ${o.xp.toLocaleString('en-US')} (${Math.floor(o.xp / o.party).toLocaleString('en-US')} each).`
    ];
    return out.join('\n');
}

// The hoard in one line.
function lootHoardText(l) {
    const coins = Object.entries(l.coins).filter(([, v]) => v > 0).map(([t, v]) => `${v.toLocaleString('en-US')} ${t}`).join(', ');
    const things = [...l.gems, ...l.art, ...(l.goods || [])].map(i => i.name);
    const magic = l.magic.map(m => m.name);
    return [coins, things.join(', '), magic.length ? `magic: ${magic.join(', ')}` : ''].filter(Boolean).join('; ') + `. Worth ${formatCoins(l.totalValue)} in all.`;
}
