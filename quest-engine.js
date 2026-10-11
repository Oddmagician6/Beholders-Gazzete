/* ============================================
   QUEST ENGINE (F32): a quick side quest for the DM Toolbox.
   A quest giver (rollNPC from npc-data.js), the job, where it happens, a twist,
   a deadline, and a reward in gp (show it with formatCoins() from coins.js).
   Sometimes a foe: an SRD 5.1 encounter rolled by rollEncounter() (encounter-engine.js)
   for the party, picked from the monster types that fit the place.
   All tables are the Gazette's own. The reward is a house rule (the SRD has no
   quest-reward table): QUEST_PAY per character by level, times the job's pay.
   Each part rolls from deriveSeed(seed, part), so a new level or party size changes
   only the reward and the foe, and a new job keeps the same giver.
   ============================================ */

// gp per character for a side quest, by party level (house rule; index = level).
const QUEST_PAY = [0, 10, 20, 35, 50, 100, 150, 200, 275, 350, 450,
    650, 850, 1100, 1400, 1800, 2300, 3000, 3800, 4800, 6000];

// Where it happens. foes: the monster types that might be there, best fit first.
const QUEST_PLACES = [
    { name: 'the flooded mill outside town', foes: ['beast', 'monstrosity', 'humanoid'] },
    { name: 'an abandoned watchtower on the old road', foes: ['humanoid', 'undead', 'monstrosity'] },
    { name: 'the sewers under the market', foes: ['ooze', 'beast', 'swarm', 'aberration'] },
    { name: 'a smugglers\' cove below the cliffs', foes: ['humanoid', 'beast', 'monstrosity'] },
    { name: 'the chapel nobody visits anymore', foes: ['undead', 'fiend'] },
    { name: 'the family crypt on the hill', foes: ['undead', 'construct'] },
    { name: 'a hunting lodge deep in the forest', foes: ['beast', 'fey', 'plant', 'monstrosity'] },
    { name: 'the old dwarven mine', foes: ['monstrosity', 'aberration', 'elemental', 'construct'] },
    { name: 'a bog where the fog never lifts', foes: ['plant', 'beast', 'undead', 'fey'] },
    { name: 'the night market by the docks', foes: ['humanoid', 'swarm', 'beast'] },
    { name: 'a wizard\'s tower, recently vacated', foes: ['construct', 'elemental', 'aberration', 'fiend'] },
    { name: 'the ruined keep at the edge of the map', foes: ['humanoid', 'giant', 'undead', 'monstrosity'] },
    { name: 'a mountain pass with a bad reputation', foes: ['giant', 'monstrosity', 'beast', 'dragon'] },
    { name: 'a locked garden in the noble quarter', foes: ['humanoid', 'fiend', 'construct'] },
    { name: 'a circus camped just outside the walls', foes: ['humanoid', 'monstrosity', 'fey'] },
    { name: 'the cave behind the waterfall', foes: ['beast', 'elemental', 'monstrosity'] },
    { name: 'a farmstead where the animals went quiet', foes: ['monstrosity', 'beast', 'fey'] },
    { name: 'the cellar of a tavern that burned down', foes: ['undead', 'swarm', 'ooze'] },
    { name: 'a frozen lake two days north', foes: ['elemental', 'beast', 'giant'] },
    { name: 'the third sub-basement of the city archives', foes: ['construct', 'swarm', 'aberration'] },
    { name: 'a shipwreck exposed at low tide', foes: ['beast', 'undead', 'monstrosity'] },
    { name: 'the standing stones on the moor', foes: ['fey', 'elemental', 'undead'] },
    { name: 'a toll bridge whose keeper hasn\'t been seen in days', foes: ['humanoid', 'monstrosity', 'giant'] },
    { name: 'the abandoned temple in the jungle valley', foes: ['beast', 'plant', 'undead', 'monstrosity'] },
    { name: 'a noble\'s hunting maze, overgrown', foes: ['plant', 'beast', 'fey'] },
    { name: 'the lighthouse on the rocks, dark for a week', foes: ['undead', 'beast', 'elemental'] },
    { name: 'a desert caravanserai, half buried in sand', foes: ['monstrosity', 'elemental', 'undead', 'humanoid'] },
    { name: 'the old battlefield where nothing grows', foes: ['undead', 'fiend', 'construct'] },
    { name: 'a quarry that dug too deep', foes: ['elemental', 'aberration', 'monstrosity'] },
    { name: 'a guildhall closed after a bad audit', foes: ['humanoid', 'construct', 'swarm'] }
];

// The jobs. foe: chance of a fight; diff: the encounter difficulty when there is one;
// pay: reward multiplier; tasks: what the giver wants ({place} is filled in).
const QUEST_JOBS = {
    fetch: {
        label: 'Fetch', icon: '📦', foe: 0.55, diff: 'low', pay: 0.8,
        tasks: [
            'Recover a stolen heirloom, a silver music box that still plays, from {place}.',
            'Bring back a ledger someone hid in {place}. Don\'t read it.',
            'Fetch a rare blue mushroom that only grows in {place}.',
            'Retrieve a wedding ring dropped somewhere in {place}.',
            'Collect a sealed crate left behind in {place}. It\'s heavier than it looks.',
            'Find the giver\'s late mentor\'s spellbook, last seen in {place}.',
            'Bring back a bell that was cut down from {place}. The town has been too quiet since.',
            'Recover a deed to half the valley, lost in {place} during a card game.',
            'Fetch a jar of water from the spring in {place}. It must not touch iron on the way.',
            'Retrieve a portrait from {place}. The giver says the eyes follow you, and that this is normal.'
        ],
        twists: ['The item is a fake. The real one was sold years ago.', 'Two other parties were hired to fetch the same thing.',
            'The item is cursed, and the giver wants it for exactly that reason.', 'Someone has guarded it for years, and wants to be paid too.']
    },
    escort: {
        label: 'Escort', icon: '🛡️', foe: 0.6, diff: 'low', pay: 1,
        tasks: [
            'See a nervous merchant and two wagons safely past {place}.',
            'Walk a retired judge to {place}, where they intend to settle an old score.',
            'Guard a pilgrim who insists on praying at {place}.',
            'Take a young noble on a "real adventure" to {place}, and bring them back alive.',
            'Get a cart of sealed barrels through {place} without opening any.',
            'Escort a prize bull to the fair by way of {place}. The bull has opinions.',
            'Take a fortune teller to {place}, where she says she will meet her death. She would like to be wrong.',
            'Bring a pair of eloping lovers through {place} before either family catches up.'
        ],
        twists: ['The person being escorted is the one being hunted, and they knew it.', 'The cargo is alive.',
            'Halfway there, the client offers to pay more to go somewhere else entirely.', 'The client is wanted, and the bounty is bigger than the fee.']
    },
    hunt: {
        label: 'Hunt', icon: '🏹', foe: 1, diff: 'moderate', pay: 1.2,
        tasks: [
            'Track down and kill whatever has been taking livestock near {place}.',
            'Hunt the creature that drove the woodcutters out of {place}.',
            'End the thing that has been leaving claw marks on doors around {place}.',
            'Bring back a trophy from whatever has been terrorizing {place}. Proof of death is all the giver asks.',
            'Kill the beast that took a hunter\'s arm in {place}. The hunter is coming along, arm or not.',
            'Find what is eating the fish in {place} before it moves on to the fishermen.'
        ],
        twists: ['The creature is protecting its young.', 'A noble wants it captured alive, and pays double for that.',
            'The creature was someone\'s pet, and they want it back unharmed.', 'There are two of them, and the giver only paid for one.']
    },
    rescue: {
        label: 'Rescue', icon: '🗝️', foe: 0.75, diff: 'moderate', pay: 1.3,
        tasks: [
            'Find the giver\'s missing apprentice, last seen heading into {place}.',
            'Free three villagers held for ransom in {place}.',
            'Bring home a prize hound that ran off into {place}.',
            'Rescue a cartographer stuck in {place} with a broken leg and a full map.',
            'Bring back the children who went into {place} on a dare yesterday.',
            'Free a caged songbird from {place}. The giver swears it is their brother.'
        ],
        twists: ['The captive doesn\'t want to be rescued.', 'The ransom note was written by the giver.',
            'There are more prisoners than anyone said, and all of them want out.', 'The captive has switched sides.']
    },
    deliver: {
        label: 'Deliver', icon: '✉️', foe: 0.35, diff: 'low', pay: 0.6,
        tasks: [
            'Deliver a sealed letter to someone waiting at {place}. Before sundown.',
            'Carry a locked box to {place} and come back with a receipt.',
            'Take a cake to the giver\'s cousin at {place}. Don\'t ask why it ticks.',
            'Hand a pardon to a prisoner held at {place}, before the sentence is carried out.',
            'Bring a crate of medicine to the healer at {place}. People are waiting.',
            'Carry a wedding ring to {place} and propose on the giver\'s behalf. Word for word.'
        ],
        twists: ['The recipient has been dead for a week.', 'Someone offers twice the reward to swap the package.',
            'The package starts talking on the second day.', 'The recipient wants a reply carried back, and the reply is going much farther.']
    },
    investigate: {
        label: 'Investigate', icon: '🔍', foe: 0.4, diff: 'low', pay: 1,
        tasks: [
            'Find out who has been leaving strange lights on at {place} every night.',
            'Learn why everyone who visits {place} comes back unable to remember it.',
            'Work out who poisoned the well, and why the trail leads to {place}.',
            'Discover what the town council is hiding at {place}.',
            'Find out why the dogs in town howl toward {place} every night at the same hour.',
            'Track a forger whose fake coins all seem to come from {place}.',
            'Learn who has been sending letters signed by the giver\'s dead father, all from {place}.'
        ],
        twists: ['The culprit is someone the party already likes.', 'The answer is worse than the rumor, and the giver knew.',
            'The trail leads straight back to the giver.', 'Someone powerful pays the party to stop asking.']
    },
    clear: {
        label: 'Clear out', icon: '🧹', foe: 1, diff: 'high', pay: 1.4,
        tasks: [
            'Clear whatever has nested in {place}, so work can start again.',
            'Drive out the squatters in {place}, by persuasion or otherwise.',
            'Make {place} safe enough to sell. The buyer arrives in three days.',
            'Empty {place} of everything that moves. The giver was very specific.',
            'Clear {place} before the pilgrims arrive for the feast day.',
            'Win back {place} for the old owner, who will be watching from a safe distance.'
        ],
        twists: ['Something worse lives under what you cleared out.', 'The "squatters" have a deed that looks real.',
            'The things living there were keeping something much worse in check.', 'A rival crew shows up halfway and claims the job.']
    },
    guard: {
        label: 'Guard', icon: '🏰', foe: 0.7, diff: 'moderate', pay: 1.1,
        tasks: [
            'Hold {place} for three nights until the real guards arrive.',
            'Keep watch over a wedding held at {place}. Two of the guests have sworn to kill each other.',
            'Guard a dig site at {place}. The scholars think they are close to something.',
            'Stand watch at {place} while the giver performs a long and very loud ritual.',
            'Protect the harvest stored at {place} until the tax collector comes.'
        ],
        twists: ['The attack comes from inside, from someone the party was told to trust.', 'The thing everyone is guarding against is already inside.']
    },
    collect: {
        label: 'Collect', icon: '💰', foe: 0.45, diff: 'low', pay: 0.9,
        tasks: [
            'Collect an overdue debt from a gambler hiding out at {place}.',
            'Recover the back rent owed by whoever is living in {place}.',
            'Get the giver\'s money back from a con artist last seen at {place}.',
            'Collect a promised dowry from a family holed up in {place}. They have changed their minds.'
        ],
        twists: ['The debtor can\'t pay, but offers something far more interesting instead.', 'The debt was paid already, and the debtor has the receipt.']
    }
};
const QUEST_JOB_KEYS = Object.keys(QUEST_JOBS);

// Why they need the party (original).
const QUEST_WHY = [
    'They tried it themselves once. They still limp.',
    'The town guard laughed at them.',
    'Their own hired help took the money and ran.',
    'They\'re being watched and can\'t be seen doing it.',
    'They are, by their own admission, a coward.',
    'The last adventurers they hired are part of the problem now.',
    'It\'s personal, and they don\'t trust themselves to stay calm.',
    'They\'d rather not say. They pay well for discretion.',
    'A fortune teller said the party would come, and described them unkindly.',
    'Everyone else in town owes them money, and none of them will do it.',
    'They lost a bet, and doing this was the forfeit. They\'re outsourcing it.',
    'The party looks desperate enough to say yes. They mean it kindly.',
    'Their spouse thinks they\'re already handling it.',
    'They\'re dying, and want it finished before they are.'
];

const QUEST_TWISTS = [
    'The quest giver isn\'t who they claim to be.',
    'A rival adventuring party is already on the way.',
    'The local lord forbids anyone from going there.',
    'Halfway through, the giver sends word: the price has changed.',
    'An old friend of one of the party is mixed up in it.',
    'The map they handed over is wrong, on purpose.',
    'Whatever is waiting there knows the party is coming.',
    'The reward is promised by someone who doesn\'t have it.',
    'It\'s the first of three jobs, and the giver didn\'t mention the other two.',
    'The weather turns on the way: a storm that lasts three days.',
    'Nothing goes wrong. That\'s what makes everyone nervous.',
    'There\'s a witness, and they want a cut.',
    'The place is not where the map says. It moved.',
    'A local guide offers to help for free, and keeps steering them wrong.',
    'The town watch arrests the party for the very thing they were hired to stop.',
    'The job turns out to be easy. The trip home does not.',
    'Someone in town is betting against the party, and has taken steps.',
    'The giver dies before the party returns, and their heir has never heard of the deal.',
    'There\'s a festival on, every road is jammed, and every bed is taken.',
    'A curse falls on whoever touches the prize first.'
];

const QUEST_DEADLINES = ['Tonight', 'By dawn', 'Within three days', 'Before the full moon', 'Within a tenday',
    'Before the festival', 'No rush, but the price drops every day', 'Yesterday, ideally',
    'Before the next market day', 'Before the snow closes the passes', 'Before the giver\'s sister finds out', 'Whenever, but sooner pays better'];

const QUEST_TERMS = ['Half up front, half on return', 'All on return, no exceptions', 'Paid in full up front (suspiciously)',
    'On return, with a meal and a bed thrown in', 'On return, in a mix of coins from three kingdoms',
    'A quarter now, the rest on proof', 'On return, through a banker who asks a lot of questions', 'Paid by a third party the giver won\'t name'];

const QUEST_BONUSES = ['a favor from the giver\'s guild', 'free rooms at the giver\'s inn for a month', 'a letter of introduction to someone important',
    'first pick of whatever else is found there', 'a horse (old, but honest)', 'the giver\'s eternal gratitude, and nothing else',
    'a map to somewhere better', 'a standing discount at the giver\'s shop', 'a healing potion apiece', 'a seat at the giver\'s table at the next feast',
    'a secret the giver swears is worth more than gold'];

// Round a reward the way a quest giver would say it.
function questRound(gp) {
    if (gp < 10) return Math.max(0.1, Math.round(gp * 10) / 10);
    if (gp < 100) return Math.round(gp);
    if (gp < 1000) return Math.round(gp / 5) * 5;
    return Math.round(gp / 50) * 50;
}

// opts: { level 1–20, size 1–8, job: key or 'random' }.
function rollQuest(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const level = Math.min(20, Math.max(1, Math.floor(opts.level) || 1));
    const size = Math.min(8, Math.max(1, Math.floor(opts.size) || 4));

    const giver = part('giver', () => ({ ...rollNPC(), why: randomArray(QUEST_WHY) }));
    // Always drawn, so a picked job doesn't shift any other part.
    const rolledJob = part('job', () => randomArray(QUEST_JOB_KEYS));
    const job = QUEST_JOBS[opts.job] ? opts.job : rolledJob;
    const j = QUEST_JOBS[job];
    const place = part('place', () => randomArray(QUEST_PLACES));
    const task = part('task', () => randomArray(j.tasks)).replace('{place}', place.name);
    const twist = part('twist', () => randomArray(rand() < 0.35 ? j.twists : QUEST_TWISTS));
    const deadline = part('deadline', () => randomArray(QUEST_DEADLINES));

    const reward = part('reward', () => ({
        gp: questRound(QUEST_PAY[level] * size * j.pay * (0.75 + rand() * 0.5)),
        terms: randomArray(QUEST_TERMS),
        bonus: rand() < 0.4 ? randomArray(QUEST_BONUSES) : null
    }));

    // A fight, if the job has one: the place's best-fitting monster type that has
    // something for this party, then any type at all.
    const foe = part('foe', () => {
        if (rand() >= j.foe) return null;
        const budget = partyBudget([{ count: size, level }]);
        for (const type of [...place.foes, '']) {
            const list = rollEncounter(budget, j.diff, type);
            if (list.length) return { list, diff: j.diff, xp: encounterXp(list), rating: rateEncounter(encounterXp(list), budget) };
        }
        return null;
    });

    return { seed, level, size, job, giver, place: place.name, task, twist, deadline, reward, foe };
}

// The DM Toolbox Encounter tab, opened with this party and these monsters.
function questEncounterLink(q) {
    const p = new URLSearchParams({ tab: 'enc', party: `${q.size}x${q.level}` });
    q.foe.list.forEach(e => p.append('m', `${e.m.id}.${e.count}`));
    if (q.foe.diff !== 'moderate') p.set('diff', q.foe.diff);
    return 'toolbox.html?' + p.toString();
}

function questFoeText(foe) {
    return foe.list.map(e => `${e.count} × ${e.m.name} (CR ${e.m.cr})`).join(', ');
}

// Plain text for Copy.
function questText(q) {
    const j = QUEST_JOBS[q.job], g = q.giver;
    const lines = [
        `SIDE QUEST: ${j.label} (party of ${q.size}, level ${q.level})`,
        q.task,
        '',
        `Quest giver: ${g.name} (${g.race.charAt(0).toUpperCase() + g.race.slice(1)}, ${g.age}, ${g.profession.toLowerCase()}). ${g.trait}. Voice: ${g.voice}.`,
        `"${g.dialogue}"`,
        `Why you: ${g.why}`,
        `Secret: ${g.secret}`,
        '',
        `Where: ${q.place.charAt(0).toUpperCase() + q.place.slice(1)}`,
        `Deadline: ${q.deadline}`,
        `Twist: ${q.twist}`,
        `Reward: ${formatCoins(q.reward.gp)} for the party. ${q.reward.terms}.${q.reward.bonus ? ` Plus ${q.reward.bonus}.` : ''}`
    ];
    if (q.foe) {
        lines.push(`Foe: ${questFoeText(q.foe)}, ${q.foe.xp.toLocaleString('en-US')} XP (${ENCOUNTER_LEVELS[q.foe.rating] ? ENCOUNTER_LEVELS[q.foe.rating].label : '?'})`);
        lines.push(`Encounter: ${new URL(questEncounterLink(q), location.href).href}`);
    }
    return lines.join('\n');
}
