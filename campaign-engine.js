/* ============================================
   CAMPAIGN ENGINE (F74): a whole campaign as a chain of one-shots, page-free.
   rollCampaign(seed, opts, set) builds it in three layers:
     world → the pantheon, the factions, and the history (pantheon-engine, faction-engine,
             history-engine): read from the Worldbuilder links in opts.world, else rolled small
     arc   → the big villain (the leader of the faction most likely to be one), the patron
             faction (a rival of theirs), a third faction playing both sides, what the villain
             is after (a relic named for the history's realm), the old wound behind it (a
             loose thread of the history), and the front: one clock segment per chapter
     ch<i> → chapter i, one rollOneShot (oneshot-engine.js) at that chapter's level, with the
             campaign's people pinned in: the patron faction's people hire the party, the
             villain's lieutenants run the middle chapters' sites when the boss is a person,
             and the last chapter is the villain's own, with the relic in the last room
   Each part rolls from set[part] or deriveSeed(seed, part), so a kept part holds still. A chapter
   reads the arc's names, so a new arc renames the people in every chapter, but each chapter keeps
   its own site, road, and hoard.
   opts: { level 1-20 (the first chapter's), party 1-8, length (CP_LENGTHS key), tone (OS_TONES key or
           'random'), world: { gods, facs, his } }
   world.gods { seed, size, shape, naming }, world.facs { seed, count, focus, scale }, world.his { seed, ages,
   span, start }: the same seeds and options as the Worldbuilder's links (notebook.js NB_USES), so a
   campaign on a saved world rolls the very factions the Worldbuilder shows. A missing one rolls from
   the world part's seed.
   Needs everything oneshot-engine.js needs, plus pantheon-engine.js and oneshot-engine.js itself.
   ============================================ */

const CP_MAX = 10;
const CP_CHAPTERS = Array.from({ length: CP_MAX }, (_, i) => 'ch' + i);
const CP_PARTS = ['world', 'arc', ...CP_CHAPTERS];

const CP_LENGTHS = {
    short: { label: 'Short (3 chapters)', chapters: [3, 3], span: 4 },
    standard: { label: 'Standard (5-6 chapters)', chapters: [5, 6], span: 9 },
    epic: { label: 'Epic (8-10 chapters)', chapters: [8, 10], span: 19 }
};

// A rolled world (no Worldbuilder links): small enough to keep in your head.
const CP_WORLD = { gods: { size: 'small' }, facs: { count: 'few', scale: 'kingdom' }, his: { ages: 'few' } };

// Which factions make a good villain, and which a good patron.
const CP_VILLAIN_WEIGHT = { cult: 6, thieves: 5, house: 3, company: 3, circle: 3, guild: 2, order: 1, temple: 1 };
const CP_PATRON_WEIGHT = { order: 4, temple: 4, house: 3, guild: 2, company: 2, circle: 2, thieves: 1, cult: 0 };

// What the villain is after, by faction type: [the scheme, the doom when the clock fills].
// {villain}, {faction}, {relic}, {realm}, {god}, {vthem}, {vtheir}.
const CP_SCHEMES = {
    cult: [
        ["means to wake {god} with {relic}, and the waking needs a great many frightened people", "{god} wakes, and {realm} learns what its prayers were for"],
        ["is teaching {realm}'s children a new prayer, and {relic} is what the prayer is for", "a whole generation of {realm} kneels to {god} on the same night"],
        ["is opening a door under {realm} that its founders sealed, and {relic} is the key", "the door opens, and what comes through answers only to {villain}"],
        ["wants to trade {realm}'s dead for a god's favor, and has found a way to make more dead", "the bargain is struck, and the graveyards of {realm} empty in a single night"]
    ],
    thieves: [
        ["is buying, bribing, and blackmailing the council of {realm} one seat at a time, and {relic} will buy the last", "{faction} {faction:owns|own} {realm} outright, and every new law is written in {vtheir} hand"],
        ["plans the theft of the century: {relic}, out of the deepest vault in {realm}", "{relic} is gone, and with it the one thing holding {realm} together"],
        ["has forged {realm}'s coin so well that nobody can tell the true from the false, and {relic} will make the forgery law", "{realm}'s treasury is worthless overnight, and only {faction}'s coin still buys bread"]
    ],
    house: [
        ["means to take the throne of {realm}, and {relic} proves the claim", "{villain} is crowned, and the first decree names the party traitors"],
        ["is starving the other great houses of {realm} into ruin, and {relic} is the seal that makes it lawful", "the old houses fall one by one, and {villain} buys their lands for copper"],
        ["means to marry into the royal line of {realm} and outlive everyone ahead in it, and {relic} seals the match", "the last heir dies of a fever nobody can name, and {villain} is next in line"]
    ],
    guild: [
        ["is cornering every trade in {realm} by making the roads too deadly for anyone else, and {relic} guarantees the monopoly", "nothing moves in {realm} without {faction}'s seal, and the price of bread triples by winter"],
        ["has sold {realm}'s mines to a foreign power in secret, and {relic} is the deed", "the foreign buyers arrive to collect, with an army as their bailiff"],
        ["holds the debts of half the lords in {realm}, and {relic} is the surety for the other half", "{faction} {faction:calls|call} in every debt at once, and {realm}'s lords sell their people to pay"]
    ],
    company: [
        ["has taken a foreign crown's gold to break {realm} from the inside, and {relic} is the payment", "the company opens the border forts, and a foreign army marches through"],
        ["means to make {faction} the only army {realm} has left, then name the price", "{realm} pays {villain} whatever {vthey} asks, forever"],
        ["is starting a war between {realm} and its neighbor so both will hire {faction}, and {relic} is the insult that starts it", "the war comes, and {faction} {faction:fights|fight} for whichever side pays more that week"]
    ],
    order: [
        ["leads a fallen order that has decided {realm} must be purged, and {relic} will show them who is guilty", "the purge begins, and {relic} finds nearly everyone guilty"],
        ["believes {realm} is already lost, and means to rule it under martial law with {relic} as the warrant", "the order seizes every town in {realm}, and calls it protection"],
        ["has sworn an oath to a dead king of {realm}, and means to bring the king back with {relic}", "the dead king returns to the throne of {realm}, and remembers every traitor by name"]
    ],
    temple: [
        ["runs a temple that has quietly stopped believing, and plans to sell {relic} and the flock along with it", "{relic} goes to the highest bidder, and the bidder is worse than {villain}"],
        ["believes the end of days is coming and means to hurry it, with {relic} as the signal", "{relic} sounds, and half of {realm} believes {villain}"],
        ["has been selling miracles to the faithful of {realm}, and needs {relic} to keep the miracles coming", "the miracles stop, the faithful riot, and {villain} blames the party"]
    ],
    circle: [
        ["means to give {realm} back to the wild, cities first, and {relic} wakes the old forest", "the forest rises, and {realm}'s roads vanish under it in a single season"],
        ["is binding the storms over {realm} to {relic}, to rule the weather and everyone who needs rain", "the rains stop everywhere {villain} doesn't like, and the famine begins"],
        ["is calling the beasts of {realm} down from the hills to drive the farmers off the old sacred ground, and {relic} is the call", "the beasts come down from every hill at once, and the farms of {realm} burn"]
    ]
};

// The relic: [what it is, a short name for titles, what it does]. {root}: the history's realm.
const CP_RELICS = [
    ['the iron crown of {root}', 'Iron Crown', 'Said to burn anyone with no right to wear it.'],
    ['the Heartstone of {root}', 'Heartstone', 'A ruby the size of a fist that beats, slowly, like a heart.'],
    ['the Black Bell of {root}', 'Black Bell', 'Rung once when the realm was founded and once when it nearly fell. Nobody living has heard it.'],
    ['the First Oath of {root}', 'First Oath', 'The codex every ruler of the realm swore on. Its last pages are blank, waiting.'],
    ['the Lantern of {root}', 'Lantern', 'Its light shows the dead the way home, or the way back.'],
    ["the broken sword of {root}'s first king", 'Broken Sword', 'Whoever mends it commands the oaths sworn on it.'],
    ['the Sealbreaker of {root}', 'Sealbreaker', 'A key no lock in the realm can refuse, down to the oldest vault.'],
    ['the star map of {root}', 'Star Map', "Shows every vault the realm's builders dug, and what they buried there."],
    ['the Weeping Chalice of {root}', 'Weeping Chalice', 'It fills by itself on holy days. Nobody has dared ask with what.'],
    ['the mask of the last queen of {root}', "Queen's Mask", 'Whoever wears it is obeyed as she was.'],
    ['the Silver Throne of {root}', 'Silver Throne', 'Only a true ruler can sit on it without bleeding.'],
    ['the drowned charter of {root}', 'Drowned Charter', 'The founding law of the realm, lost in a flood and never written down again.'],
    ["the Hound's Collar of {root}", "Hound's Collar", 'Whoever holds the leash commands the beasts of the realm.'],
    ['the Ninth Seal of {root}', 'Ninth Seal', 'Eight seals keep something shut beneath the realm. This is the one that opens them.'],
    ['the Ember Crown of {root}', 'Ember Crown', 'It has burned without fuel for three hundred years, and will go out when the realm dies.'],
    ['the Book of Names of {root}', 'Book of Names', 'Every family of the realm is written in it at birth. Strike a name out, and that family is forgotten.'],
    ['the Moon Mirror of {root}', 'Moon Mirror', 'It shows whoever looks into it what they fear most, and the fear comes true.'],
    ['the war horn of {root}', 'War Horn', 'Blown once, it calls every oath-sworn soldier of the realm to whoever blew it.'],
    ['the Salt Ring of {root}', 'Salt Ring', 'It wards off every spirit, curse, and plague, as long as nobody takes it off.'],
    ['the stone heart of {root}', 'Stone Heart', "Buried under the realm's first city. As long as it's whole, so are the walls."],
    ["the Weaver's Spindle of {root}", 'Spindle', 'Whatever it spins becomes true, a little, for as long as the thread holds.'],
    ['the bone flute of {root}', 'Bone Flute', 'Carved from a dragon that died for the realm. Its tune wakes things that should stay asleep.'],
    ['the Gilded Ledger of {root}', 'Gilded Ledger', 'Every debt ever owed to the crown. Whoever holds it is owed the realm.'],
    ['the star-iron blade of {root}', 'Star-Iron Blade', 'Forged from a fallen star. It cut the realm free once, and could cut it apart.']
];

// The front: one segment ticks after each chapter. Early, middle, and late portents.
// {Villain}, {faction}, {patronFaction}, {wild}, {realm}, {relic}, {alias}.
const CP_PORTENTS = {
    early: [
        'Travelers stop arriving on the roads into {realm}, and nobody official says why.',
        '{Faction} {faction:buys|buy} rope, lamp oil, and silence in every market town.',
        "A shrine-keeper wakes to find {realm}'s oldest ward-stone cracked through.",
        "Someone from {wild} is seen leaving {villain}'s door after midnight.",
        'Prices rise at every market. {PatronFaction} {patronFaction:blames|blame} {faction}, and nobody listens.',
        'A dying stranger stumbles into town with one name on their lips: "{alias}."',
        "Three villages in {realm} report the same dream on the same night, and the priests won't say what it means.",
        "A body pulled from the river wears {faction}'s colors, and nobody claims it.",
        '{PatronFaction} {patronFaction:sends|send} a rider to the capital with a warning, and the rider never arrives.',
        'A street preacher in the capital starts calling {villain} the hope of {realm}.',
        'Someone is buying up old maps of {realm} at any price, and paying in fresh-minted coin.'
    ],
    mid: [
        '{PatronFaction} {patronFaction:loses|lose} a safe house to fire, and two of {patronFaction:its|their} people with it.',
        '{Faction} {faction:takes|take} another piece of what {villain} needs, and this time there are witnesses.',
        'Someone the party helped in an earlier chapter is taken in the night.',
        'The roads of {realm} are no longer safe after dark, anywhere.',
        '{Wild} openly {wild:takes|take} the side of {faction}, and {wild:its|their} coin goes with it.',
        'A broadsheet names the party as the cause of all the trouble.',
        "A town the party passed through closes its gates and won't say who it's afraid of.",
        '{Faction} {faction:buys|buy} up the debts of a whole town in {realm}, and calls them all in on the same day.',
        'Bounty posters with the party\'s faces go up on every road, signed "{alias}."',
        'The temples of {realm} quarrel in public about {villain}, and the faithful take sides.',
        "A fire guts {realm}'s great archive, and every record of {relic} burns with it.",
        'The crops fail in one valley of {realm}, and {faction} {faction:is|are} the only ones selling grain.'
    ],
    late: [
        '{Villain} moves {relic} to the place it was always meant to be used.',
        "{PatronFaction}'s leader is arrested on the word of {faction}.",
        'Half the towns of {realm} pay {faction} for protection now.',
        "{Villain}'s people walk openly in the capital, wearing {faction}'s colors.",
        "The last of {villain}'s rivals is found dead, and the party gets the blame.",
        "The ruler of {realm} names {villain} to the high council.",
        "{Wild} {wild:stops|stop} pretending, and {wild:marches|march} under {faction}'s banner.",
        "The capital's gates are shut, and only {faction}'s people hold the keys.",
        'Every bell in {realm} rings at midnight, and nobody is pulling the ropes.',
        "{PatronFaction}'s last safe house is the one the party is sleeping in."
    ]
};

// Who the chapter's boss really works for, by the boss's mind. {boss}, {Boss}, {faction}, {town}.
const CP_SERVES = {
    folk: ["{Boss} takes {faction}'s coin and asks no questions.", '{Boss} owes {faction} a debt, and this job pays it.',
        '{Boss} thinks they work for themselves. {Faction} {faction:lets|let} them think so.',
        "{Boss} was one of {patronFaction}'s own, until {faction} made a better offer.",
        '{Boss} is kin to someone high in {faction}, and was given this job to stay out of trouble.',
        '{Faction} {faction:keeps|keep} something {boss} loves locked away, and {faction:gives|give} a little of it back after every job.'],
    beast: ['{Faction} drove {boss} toward {town} on purpose, to keep eyes away from something else.',
        "{Faction} {faction:has|have} been feeding {boss}, and pointing it where {faction:it needs|they need} people scared.",
        "{Boss} was bred in {faction}'s pens and turned loose here on purpose.",
        "{Faction} {faction:pays|pay} a hunter to keep {boss} alive: a monster on the road keeps the road empty."],
    mindless: ['{Faction} broke the old seals that held {boss}, for what lay beneath it.',
        "{Boss} guards a door that {faction} {faction:needs|need} kept shut until {faction:it's|they're} ready.",
        "{Faction}'s priests raised {boss} here, and the ritual is written on the walls for anyone who can read it.",
        "{Faction} set {boss} here to destroy anything that came looking for {relic}."]
};

// How each chapter points to the next. {boss}, {Boss}, {nextSite}, {nextTown}, {faction}, {Patron}.
const CP_LEADS = ruleTable([
    "A letter in the last room, sealed with {faction}'s mark, orders supplies sent to {nextSite}.",
    '{Boss} carries a map with {nextTown} circled, and a date written beside it.',
    'A prisoner freed in the last room overheard where the next shipment goes: {nextSite}.',
    'The hoard holds a ledger, and one name in it keeps getting paid in {nextTown}.',
    'A coded note ({dc:13} {skill:int:investigation} to read it) names {nextSite} and a day.',
    "{Patron} sends word: {faction}'s people have been seen near {nextTown}.",
    'A survivor swears the rest went to {nextSite}, and took the cart with them.',
    "{Boss}'s orders, half burned in a brazier, name {nextTown} and a buyer there.",
    'A manifest in the hoard lists crates bound for {nextSite}, marked as grain. They are not grain.',
    'A wounded messenger, caught on the way out, was carrying word to {nextTown}.',
    '{Patron} recognizes a seal in the last room: it belongs to someone in {nextTown}.',
    'Every coin in the hoard is newly struck, from the mint at {nextTown}.',
    'A map scratched on the wall of the last room shows the way to {nextSite}, and a warning.',
    "The last room's prisoner bargains for freedom with one thing: where {faction} meets next, at {nextSite}.",
    "{Boss}'s diary ends mid-sentence: \"Tomorrow, {nextTown}, and then it can't be stopped.\"",
    'A chandler in {nextTown} has been selling the same black candles the party found here.',
    'Tracks from a back way out lead toward {nextSite}, and they are only a day old.',
    "{Faction}'s courier is caught on the road with a letter for {nextTown}, and talks for a pardon."
]);

// What the villain's own people call them before the party learns the name.
const CP_ALIASES = ['the Lantern', 'the Grey Hand', 'the Quiet One', 'the Patron', 'the Black Candle', 'the Hollow Crown',
    'the Ferryman', 'the Gardener', 'the Bookkeeper', 'the Pale Hand', 'the Shepherd', 'the Widow', 'the Locksmith', 'the Choirmaster',
    'the Red Key', 'the Weaver', 'the Old Friend', 'the Ash King', 'the Mourner', 'the Physician', 'the Second Son', 'the Cartographer',
    'the Silent Bell', 'the Glass Saint'];

// Titles. {Short} (the relic), {Root} (the realm), {Who} (the villain's first name), {Fac}, {Noun} (the tone's).
const CP_TITLES = ['The {Short} of {Root}', 'Shadow over {Root}', "{Who}'s Rise", 'The {Root} Conspiracy', 'Against {Fac}',
    'The Fall of {Root}', 'The Long {Noun}', 'Heirs of {Root}', 'The Hunt for the {Short}', 'The Last Days of {Root}',
    'The {Short} War', 'The {Root} Reckoning', "{Who}'s War", 'The Ashes of {Root}', 'Whoever Holds the {Short}',
    'Blood on the {Short}', 'The Price of {Root}', 'Beneath {Root}'];

// How each chapter's pitch opens, by where it sits in the arc (the one-shot's pitch follows it).
const CP_CHAPTER_OPENS = {
    first: ['It starts small.', 'It begins with one job.', 'Nobody knows yet what this is part of.', 'A simple job, or it looks like one.'],
    early: ['The trail goes on.', 'Another piece of the pattern.', 'The next thread pulls tight.', 'Someone wants this kept quiet.',
        'The same mark turns up again.', "It's bigger than it looked."],
    reveal: ['The mask slips.', 'Here the party learns the name.', 'Everything changes here.'],
    late: ["Now it's open war.", "The villain knows the party's names now.", 'No more hiding.', 'The front is moving faster.',
        'Every ally counts now.', 'The other side strikes first.'],
    near: ['The last door before the end.', 'One step from the villain.', 'The way to the end runs through here.'],
    last: ['The end of it.', 'The final chapter.', 'Where it all ends.', 'Everything comes due.']
};

// The people a faction sends to hold its sites (encounter-engine ENC_BANDS), tried first.
const CP_BANDS = {
    cult: ['cult', 'necromancer', 'shadows'], thieves: ['shadows', 'bandits', 'pirates'], house: ['nobles', 'shadows', 'watch'],
    guild: ['shadows', 'bandits', 'pits'], company: ['watch', 'bandits', 'pits', 'clans'], order: ['watch', 'nobles', 'cult'],
    temple: ['cult', 'watch', 'necromancer'], circle: ['druids', 'clans', 'necromancer']
};

// When the last site's boss isn't a person: a thinking boss of one of these types is the villain's true form.
// {Villain}, {villain}, {vthey}, {race}, {monster}.
const CP_FORMS = {
    undead: '{Villain} died for the scheme, and did not stay dead: by now {vthey} {vthey:is|are} {monster}.',
    fiend: '{Villain} was never {race} at all. Under the borrowed face is {monster}, and it has played this game for centuries.',
    dragon: '{Villain} was never {race}: {vthey} {vthey:is|are} {monster} wearing a borrowed shape, and the hoard is {vtheir} own.',
    aberration: '{Villain} let something into {vtheir} mind years ago. What is left of {vthem} is {monster}.',
    fey: '{Villain} struck a bargain under the hill, and paid with {vtheir} own nature: {vthey} {vthey:is|are} {monster} now.'
};
// Else the villain stands beside the boss, as the strongest of these (SRD people) that fits the level.
const CP_STAND = {
    cult: ['archmage', 'mage', 'priest', 'cult-fanatic'], thieves: ['assassin', 'spy', 'bandit-captain'], house: ['mage', 'knight', 'noble'],
    guild: ['assassin', 'spy', 'noble'], company: ['gladiator', 'knight', 'veteran', 'bandit-captain'], order: ['knight', 'veteran', 'priest'],
    temple: ['priest', 'cult-fanatic', 'acolyte'], circle: ['druid', 'scout']
};

// The last chapter happens somewhere a villain lives. MORE: added later (siteMoreKind).
const CP_FINAL_KINDS = ['keep', 'fort', 'tower', 'temple'];
const CP_FINAL_MORE = ['manor', 'lighthouse'];

// ── Helpers ──────────────────────────────────────────────
function cpWeighted(pairs) {
    const total = pairs.reduce((t, p) => t + p[1], 0);
    let r = rand() * total;
    for (const [v, w] of pairs) { r -= w; if (r < 0) return v; }
    return pairs[pairs.length - 1][0];
}

// osFill, after picking {faction:one|many} (and patronFaction, wild) by whether that faction's name is plural.
function cpFill(text, ctx) {
    // {faction}'s → "the Lucky Boots'" for a plural name.
    let t = String(text).replace(/\{(faction|Faction|patronFaction|PatronFaction|wild|Wild)\}'s/g, (m, k) => {
        const v = ctx[k.charAt(0).toLowerCase() + k.slice(1)];
        return v && cpPoss(v) !== `${v}'s` ? `{${k}}'` : m;
    });
    ['faction', 'patronFaction', 'wild'].forEach(k => { if (ctx[k]) t = facAgree(t, k, ctx[k]); });
    return osFill(t, ctx);
}

// A lieutenant's motive (faction-engine FAC_MOTIVES: "Is new, eager…") mid-sentence: "is new, eager…".
function cpLow(s) {
    return String(s).charAt(0).toLowerCase() + String(s).slice(1);
}

// A faction's possessive: "the Lucky Boots'", "the Company of Weavers'", but "the Tallymen's" and "House Selanys's".
function cpPoss(name) {
    return /[^siuy]s$/.test(name) ? `${name}'` : `${name}'s`;
}

// A faction name in the middle of a sentence ("the Tallymen") and at a title's start ("Tallymen").
function cpBare(name) {
    return osCap(String(name).replace(/^the\s+/i, ''));
}

// The level of chapter i of n, climbing from start to end.
function cpLevel(i, n, start, end) {
    return n < 2 ? start : Math.round(start + (end - start) * i / (n - 1));
}

// A faction person ({ npc, title?, role? }) as the one-shot's patron.
function cpPerson(p, factionName) {
    const n = p.npc;
    const role = p.role ? `${p.role.toLowerCase()} of ${factionName}` : `${(p.title || 'leader').toLowerCase()} of ${factionName}`;
    return { name: n.name, role, race: n.race, gender: n.gender };
}

// The world: each of the three read from its link or rolled from the world part's seed.
function cpWorld(seed, world = {}) {
    const link = (key, defs) => {
        const given = world[key] && parseSeed(world[key].seed) ? world[key] : null;
        const kind = CP_USES[key].kind;
        return given ? { ...given, kind, read: true } : { seed: deriveSeed(seed, key), ...defs, kind, read: false };
    };
    const gods = link('gods', CP_WORLD.gods), facs = link('facs', CP_WORLD.facs), his = link('his', CP_WORLD.his);
    const pantheon = rollPantheon(gods.seed, gods);
    const factions = rollFactions(facs.seed, facs);
    const history = rollHistory(his.seed, his);
    return { gods, facs, his, pantheon, factions, history, ctx: { pantheon } };
}

// ── The roll ─────────────────────────────────────────────
function rollCampaign(seed, opts = {}, set = {}) {
    const ps = id => (set && set[id]) || deriveSeed(seed, id);
    const seeds = Object.fromEntries(CP_PARTS.map(id => [id, ps(id)]));
    const start = osClamp(opts.level, 1, 20, 1);
    const party = osClamp(opts.party, 1, 8, 4);
    const length = Object.hasOwn(CP_LENGTHS, opts.length) ? opts.length : 'standard';
    const Lc = CP_LENGTHS[length];
    const end = Math.min(20, start + Lc.span);

    const W = cpWorld(seeds.world, opts.world || {});
    const w = W.factions, ctx = W.ctx, h = W.history;
    const fname = i => facName(w, i, ctx);

    // ── The arc ──
    const drawnTone = withSeed(deriveSeed(seeds.arc, 'tone'), () => osPick(OS_TONE_KEYS));
    const tone = Object.hasOwn(OS_TONES, opts.tone) ? opts.tone : drawnTone;
    const arc = withSeed(seeds.arc, () => {
        const n = osInt(Lc.chapters[0], Lc.chapters[1]);
        const vi = cpWeighted(w.factions.map(f => [f.i, CP_VILLAIN_WEIGHT[f.type] || 1]));
        const rivals = facRivalsOf(w, vi);
        const others = w.factions.filter(f => f.i !== vi);
        const pi = rivals.length ? rivals[0] : cpWeighted(others.map(f => [f.i, CP_PATRON_WEIGHT[f.type] || 0.5]));
        const allies = facAlliesOf(w, vi).filter(k => k !== pi);
        const rest = others.filter(f => f.i !== pi);
        const wi = allies.length ? allies[0] : rest.length ? osPick(rest).i : null;
        const scheme = osPick(CP_SCHEMES[w.factions[vi].type]);
        const relic = osPick(CP_RELICS);
        const threads = hisThreads(h, { pantheon: W.pantheon });
        const wound = threads.length ? osPick(threads) : null;
        const alias = osPick(CP_ALIASES);
        const title = osPick(CP_TITLES);
        const noun = osPick(OS_TONES[tone].nouns);
        // The front: n segments, the last one the doom.
        const used = new Set();
        const front = [];
        for (let k = 1; k < n; k++) {
            const phase = k / n < 0.34 ? 'early' : k / n < 0.67 ? 'mid' : 'late';
            const pool = CP_PORTENTS[phase].filter(t => !used.has(t));
            const t = osPick(pool.length ? pool : CP_PORTENTS[phase]);
            used.add(t);
            front.push(t);
        }
        // No lead twice while the list lasts (one draw each, as before).
        const leads = [];
        for (let k = 0; k < n - 1; k++) {
            const pool = CP_LEADS.filter(t => !leads.includes(t));
            leads.push(osPick(pool.length ? pool : CP_LEADS));
        }
        const evil = W.pantheon.gods.filter(g => panEvil(g.alignment));
        const fallbackGod = evil.length ? osPick(evil) : null;
        const rootDraw = hisRoot(new Set());
        return { n, vi, pi, wi, scheme, relic, wound, alias, title, noun, front, leads, fallbackGod, rootDraw };
    });
    const n = arc.n;
    const vf = w.factions[arc.vi], pf = w.factions[arc.pi], wf = arc.wi === null ? null : w.factions[arc.wi];
    const realmObj = h.realm || h.old;
    const root = realmObj ? realmObj.root : arc.rootDraw;
    const realm = realmObj ? realmObj.name : `the realm of ${root}`;
    const deity = facDeity(vf, W.pantheon);
    const god = deity ? deity.name : arc.fallbackGod ? arc.fallbackGod.name : 'a god with no name';
    const vn = vf.leader.npc;
    const pro = osPronouns(vn.gender);
    const villain = {
        name: vn.name, first: vn.firstName || vn.name.split(' ')[0], title: vf.leader.title, race: vn.race, age: vn.age,
        gender: vn.gender, style: vf.leader.style, faction: fname(vf.i), alias: osCap(arc.alias), alias0: arc.alias,
        trait: vn.trait, voice: vn.voice, secret: facFill(vf.secret, w, vf.i, ctx)
    };
    const relicText = arc.relic[0].replace('{root}', root);
    const c = {
        villain: villain.name, faction: villain.faction, patronFaction: fname(pf.i), wild: wf ? fname(wf.i) : 'a rival power',
        realm, relic: relicText, god, alias: arc.alias, vthey: pro.they, vtheir: pro.their, vthem: pro.they === 'they' ? 'them' : pro.they === 'he' ? 'him' : 'her'
    };
    const fill = t => cpFill(t, c);
    villain.scheme = fill(arc.scheme[0]);
    const doom = osCap(fill(arc.scheme[1])) + '.';

    // ── The cast: who hires the party, and who runs the villain's sites ──
    const contacts = [...pf.lieutenants.map(l => cpPerson(l, c.patronFaction)), cpPerson(pf.leader, c.patronFaction)];
    const lts = vf.lieutenants.map(l => ({ name: l.npc.name, role: l.role, race: l.npc.race, npc: l.npc, motive: facFill(l.motive, w, vf.i, ctx), chapter: null }));
    // Spread the lieutenants over the chapters before the last.
    const ltAt = {};
    lts.forEach((l, k) => {
        const at = Math.floor((k + 1) * (n - 1) / (lts.length + 1));
        if (n > 1 && ltAt[at] === undefined) ltAt[at] = k;
    });
    const reveal = Math.max(0, Math.floor((n - 1) / 2));

    // ── The chapters ──
    const slotKey = deriveSeed(seeds.arc, 'slots');
    const chapters = [];
    let prevKind = null;
    for (let i = 0; i < n; i++) {
        const cs = seeds['ch' + i];
        const last = i === n - 1;
        const level = cpLevel(i, n, start, end);
        const first = (last ? CP_FINAL_KINDS : SITE_KIND_FIRST).filter(k => k !== prevKind);
        const more = (last ? CP_FINAL_MORE : SITE_KIND_KEYS.filter(k => !SITE_KIND_FIRST.includes(k))).filter(k => k !== prevKind);
        const kind = siteMoreKind(cs, withSeed(deriveSeed(cs, 'kind'), () => osPick(first)), first, more);
        prevKind = kind;
        const lt = !last && ltAt[i] !== undefined ? lts[ltAt[i]] : null;
        const contact = last ? contacts[contacts.length - 1] : contacts[i % contacts.length];
        const given = { npc: contact, slot: { key: slotKey, i, n } };
        const bands = CP_BANDS[vf.type];
        if (last) Object.assign(given, { villain: { name: villain.name, tries: 8, bands, forms: Object.keys(CP_FORMS), stand: CP_STAND[vf.type] }, item: [relicText, arc.relic[1]], goal: villain.scheme });
        else if (lt) given.villain = { name: lt.name, tries: 4, bands };
        const o = rollOneShot(cs, { level, party, length: last ? 'long' : 'standard', tone, kind, given }, {});
        if (lt && o.named) lt.chapter = i;
        chapters.push({ i, level, last, kind, o, lt: lt && o.named ? lt : null, ltMissed: lt && !o.named ? lt : null, contact });
    }

    // ── What ties each chapter to the arc ──
    const usedServes = new Set();
    chapters.forEach((ch, i) => {
        const o = ch.o, next = chapters[i + 1];
        const cc = { ...c, boss: o.villain.name, town: o.town, patron: o.patron.name };
        const f = t => cpFill(t, cc);
        let serves;
        if (ch.last) {
            const mon = o.villain.monster && MONSTER_BY_ID[o.villain.monster];
            serves = `${villain.name}, ${villain.title.toLowerCase()} of ${c.faction}, in person.`;
            if (o.form) serves += ' ' + cpFill(CP_FORMS[o.form].replace(/\{vthey:([^|}]*)\|([^}]*)\}/g, (m, one, many) => (pro.they === 'they' ? many : one)),
                { ...cc, race: osA(villain.race).toLowerCase(), monster: osA(mon ? mon.name.toLowerCase() : 'monster').toLowerCase() });
            else if (o.guard) serves += ` ${osCap(o.guard)} guards the last room, with ${villain.first} at ${o.guard.startsWith('the ') ? 'its' : 'their'} side.`;
        }
        else if (ch.lt) serves = `${ch.lt.name} is ${cpPoss(c.faction)} ${ch.lt.role.toLowerCase()}, and ${cpLow(ch.lt.motive)}`;
        else {
            // No line twice in one campaign while the pool lasts.
            const pool = CP_SERVES[o.villain.mind], fresh = pool.filter(t => !usedServes.has(t));
            const line = withSeed(deriveSeed(o.seed, 'serves'), () => osPick(fresh.length ? fresh : pool));
            usedServes.add(line);
            serves = f(line);
        }
        if (ch.ltMissed) serves += ` ${ch.ltMissed.name}, ${cpPoss(c.faction)} ${ch.ltMissed.role.toLowerCase()}, set this up and left before the party arrived.`;
        ch.serves = serves;
        ch.lead = next ? cpFill(arc.leads[i], { ...cc, nextSite: next.o.site.name, nextTown: next.o.town }) : '';
        ch.stage = i < n - 1 ? fill(arc.front[i]) : '';
        // The pitch opens with where the chapter sits in the arc, in place of the one-shot's tone line.
        const at = ch.last ? 'last' : i === 0 ? 'first' : i === reveal ? 'reveal' : i < reveal ? 'early' : i === n - 2 ? 'near' : 'late';
        const opens = withSeed(deriveSeed(seeds['ch' + i], 'open'), () => osSlotPick(CP_CHAPTER_OPENS[at], 'open.' + at, { key: slotKey, i, n }));
        o.pitch = `${opens} ${o.pitchBody}`;
        ch.reveal = i === reveal && !ch.last
            ? `The party learns who is behind it all: ${villain.name}, ${villain.title.toLowerCase()} of ${c.faction}, the one ${cpPoss(c.faction)} people call ${arc.alias}.` : '';
    });

    const T = OS_TONES[tone];
    const title = arc.title.replace('{Short}', arc.relic[1]).replace('{Root}', root).replace('{Who}', villain.first)
        .replace('{Fac}', c.faction).replace('{Noun}', arc.noun).replace(/\b(\w+) \1\b/g, '$1');
    const levels = chapters.map(ch => ch.level);
    const span = levels[0] === levels[levels.length - 1] ? `at level ${levels[0]}` : `from level ${levels[0]} to ${levels[levels.length - 1]}`;
    return {
        seed, seeds, start, end: levels[levels.length - 1], party, length, tone, n, title: osCap(title),
        pitch: `${osA(T.adj)} campaign in ${n} chapters, ${span}. ${villain.name}, ${villain.title.toLowerCase()} of ${c.faction}, ${villain.scheme}. Standing in the way: ${c.patronFaction}, and the party.`,
        world: W, realm, root, god, deity,
        villain, doom,
        relic: { text: relicText, short: arc.relic[1], about: arc.relic[2] },
        wound: arc.wound, reveal, alias: arc.alias,
        factions: { villain: vf.i, patron: pf.i, wild: wf ? wf.i : null },
        wildText: wf ? cpWildText(w, vf.i, wf.i, ctx) : '',
        contacts, lts, front: [...chapters.slice(0, -1).map(ch => ch.stage), doom], chapters
    };
}

// How the third faction plays both sides: their alliance with the villain's faction, else a rumor of one.
function cpWildText(w, vi, wi, ctx) {
    const tie = w.allies.find(t => (t.a === vi && t.b === wi) || (t.a === wi && t.b === vi));
    const name = facName(w, wi, ctx), many = facIsPlural(name);
    return tie ? `${facTieText(w, tie, ctx, 'ally')} In public, ${name} ${many ? 'keep their' : 'keeps its'} distance.`
        : `${osCap(name)} ${many ? 'have' : 'has'} no love for ${facName(w, vi, ctx)}, but will sell to whoever is winning.`;
}

// ── Helpers for pages ────────────────────────────────────
// The Worldbuilder link for each part of the world (what Save to Notebook files).
// The world's link keys, as the Worldbuilder writes them (notebook.js NB_USES matches entries by them).
const CP_USES = {
    gods: { kind: 'pantheon', keys: { gods: 'seed', gsize: 'size', gshape: 'shape', gnaming: 'naming' } },
    facs: { kind: 'factions', keys: { facs: 'seed', fcount: 'count', ffocus: 'focus', fscale: 'scale' } },
    his: { kind: 'history', keys: { his: 'seed', hages: 'ages', hspan: 'span', hstart: 'start' } }
};

// cpLinkParams: one part of the world as another page's link keys (NB_USES: gods, gsize, ...), or as its own (seed, size, ...).
function cpLinkParams(o, key) {
    const out = {};
    const keys = key ? CP_USES[key].keys : Object.fromEntries(['seed', ...CP_LINK_OPTS[o.kind]].map(k => [k, k]));
    Object.entries(keys).forEach(([mine, theirs]) => { if (o[theirs] && o[theirs] !== 'random') out[mine] = o[theirs]; });
    return out;
}
const CP_LINK_OPTS = { pantheon: ['size', 'shape', 'naming'], factions: ['count', 'focus', 'scale'], history: ['ages', 'span', 'start'] };

function cpWorldHref(W, tab) {
    const extra = tab === 'factions' ? cpLinkParams(W.gods, 'gods') : tab === 'history' ? { ...cpLinkParams(W.gods, 'gods'), ...cpLinkParams(W.facs, 'facs') } : {};
    const own = cpLinkParams({ pantheon: W.gods, factions: W.facs, history: W.his }[tab]);
    return 'worldbuilder?' + paramsQuery({ tab, ...own, ...extra });
}

// "levels 3 to 10", or "level 20" when it starts at the top.
function cpLevels(cp) {
    return cp.start === cp.end ? `level ${cp.start}` : `levels ${cp.start} to ${cp.end}`;
}

// Plain text for Copy: the campaign's outline, then every chapter in short.
function campaignText(cp) {
    const T = OS_TONES[cp.tone], v = cp.villain;
    const out = [
        cp.title.toUpperCase(),
        `${T.icon} ${T.label} · ${cp.n} chapters · party of ${cp.party}, ${cpLevels(cp)}`,
        cp.pitch, '',
        'THE VILLAIN',
        `${v.name}, ${v.title.toLowerCase()} of ${v.faction} (${v.race}, ${parseInt(v.age, 10)}). ${v.style}`,
        `The scheme: ${osCap(v.name)} ${v.scheme}.`,
        `What everyone wants: ${cp.relic.text}. ${cp.relic.about}`,
        cp.wound ? `The old wound (${cp.wound.from}): ${cp.wound.text}` : '',
        `Their people call them ${cp.alias}, until the party learns the name in chapter ${cp.reveal + 1}.`,
        `Secret: ${v.secret}`, '',
        'THE FRONT (tick one segment after every chapter, two if the party failed it)',
        ...cp.front.map((t, i) => `${i + 1}. ${i === cp.front.length - 1 ? 'Doom: ' : ''}${t}`), ''
    ];
    cp.chapters.forEach(ch => {
        const o = ch.o;
        out.push(`CHAPTER ${ch.i + 1}: ${o.title.toUpperCase()} (level ${ch.level})`,
            `${o.pitch}`, `Behind it: ${ch.serves}`);
        if (ch.reveal) out.push(`Reveal: ${ch.reveal}`);
        if (ch.lead) out.push(`The way on: ${ch.lead}`);
        if (ch.stage) out.push(`Then the front moves: ${ch.stage}`);
        out.push('');
    });
    return out.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}
