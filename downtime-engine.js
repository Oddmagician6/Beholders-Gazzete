/* ============================================
   DOWNTIME ENGINE (F28): what a stretch of downtime costs each character.
   Lifestyle costs per day and the downtime activities (crafting, practicing a
   profession, recuperating, researching) follow the SRD 5.1 (tagged 'SRD').
   Where the SRD is silent, the Gazette makes a ruling (tagged 'ruling').
   Carousing, training, and gambling are not in the SRD: they are Gazette house
   rules with original tables (tagged 'house').
   Amounts are in gp; show them with formatCoins() (coins.js). Every roll comes
   from deriveSeed(seed, ...) (rng.js), so a link replays it. The carousing
   outcomes keep their F28 seeds; lodging, the activity's setting, the weekly
   log, and gambling dice each draw from their own child seed.
   Uses buildName() from npc-data.js for names when it is loaded.
   ============================================ */

// SRD 5.1 Lifestyle Expenses, per day. Aristocratic is "10 gp minimum".
const DOWNTIME_LIFESTYLES = {
    wretched:     { label: 'Wretched',     icon: '🥀', gp: 0 },
    squalid:      { label: 'Squalid',      icon: '🪳', gp: 0.1 },
    poor:         { label: 'Poor',         icon: '🕯️', gp: 0.2 },
    modest:       { label: 'Modest',       icon: '🍺', gp: 1 },
    comfortable:  { label: 'Comfortable',  icon: '🔥', gp: 2 },
    wealthy:      { label: 'Wealthy',      icon: '🍷', gp: 4 },
    aristocratic: { label: 'Aristocratic', icon: '👑', gp: 10 }
};
const DOWNTIME_LIFE_KEYS = Object.keys(DOWNTIME_LIFESTYLES);

const DOWNTIME_ACTIVITIES = {
    none:     { label: 'Just living', icon: '🛏️' },
    craft:    { label: 'Crafting', icon: '🔨' },
    work:     { label: 'Working for pay', icon: '💼' },
    research: { label: 'Researching', icon: '📚' },
    recup:    { label: 'Recuperating', icon: '🩹' },
    carouse:  { label: 'Carousing (house rule)', icon: '🍻' },
    train:    { label: 'Training (house rule)', icon: '🎓' },
    gamble:   { label: 'Gambling (house rule)', icon: '🎲' }
};

// Gambling (house rule): each week, d20 + the character's check bonus against the game's DC.
const DOWNTIME_GAMES = {
    dice:   { label: 'Dice in the back room', check: 'Wisdom (dice set)', dc: 12 },
    cards:  { label: 'Cards at a tavern table', check: 'Charisma (playing card set)', dc: 14 },
    pits:   { label: 'Betting on the pits', check: 'Wisdom (Animal Handling)', dc: 15 },
    races:  { label: 'Betting on the races', check: 'Intelligence (Investigation)', dc: 15 },
    high:   { label: 'A private high-stakes game', check: 'Charisma (Deception) or a gaming set', dc: 18 }
};
const TRAIN_GP_PER_DAY = 1;      // house rule: a tutor's fee per day of lessons
const GAMBLE_MAX_BONUS = 20;

// Practicing a profession (SRD 5.1): the lifestyle the work pays for.
const DOWNTIME_WORK = {
    trade:   { label: 'A trade or odd jobs', covers: 'modest' },
    org:     { label: 'For an organization (temple, guild)', covers: 'comfortable' },
    perform: { label: 'Performing (proficient in Performance)', covers: 'wealthy' }
};

const CRAFT_GP_PER_DAY = 5;      // SRD 5.1: 5 gp of progress per crafter per day
const RESEARCH_GP_PER_DAY = 1;   // SRD 5.1: 1 gp of expenses per day of research
const DOWNTIME_MAX_DAYS = 365;
const CAROUSE_SHOWN = 8;         // outcomes listed (one per week)

// Carousing (house rule, original): one outcome per week, from the circle your lifestyle moves in.
const CAROUSE_CIRCLES = {
    low: { label: 'dockside dives and back-alley taverns', from: ['wretched', 'squalid', 'poor'] },
    middle: { label: 'respectable taverns and guild halls', from: ['modest', 'comfortable'] },
    high: { label: 'salons, galas, and private clubs', from: ['wealthy', 'aristocratic'] }
};
const CAROUSE_OUTCOMES = {
    low: [
        { k: 'good', t: 'You win an arm-wrestling match against a sailor named Brine, who now insists you are his best friend and will vouch for you at any dock in the city.' },
        { k: 'good', t: 'A one-eyed fence takes a liking to you and offers to buy "anything shiny, no questions" at a fair-ish price.' },
        { k: 'good', t: 'You hear a drunk mumble about a smuggler\'s cache under the old fish market. It might even be true.' },
        { k: 'good', t: 'You split a bottle with a retired adventurer who sketches you a map of a dungeon she never finished.' },
        { k: 'bad', t: 'You wake up in a cell at the watch house. The fine is 1 gp per level, or a night\'s work scrubbing the barracks.' },
        { k: 'bad', t: 'Someone lifted your coin purse. You lose whatever you were carrying, up to 2d10 gp.' },
        { k: 'bad', t: 'You insulted the wrong gang boss\'s cousin. Their crew now glares at you whenever you pass.' },
        { k: 'bad', t: 'You bet your boots on a rat race. You lost. You are now bootless and the rat is smug.' },
        { k: 'odd', t: 'You have a new tattoo. Nobody, including the tattoo artist, can say what it is supposed to be.' },
        { k: 'odd', t: 'You are now the owner of a goat. The goat has not been told it is owned.' },
        { k: 'odd', t: 'You agreed to be best man (or maid of honor) at a wedding next tenday. You do not know either party.' },
        { k: 'odd', t: 'A street preacher is convinced you are the prophesied one. He has started following you around.' },
        { k: 'good', t: 'A dockhand you bought a drink for turns out to run the night shift. Your cargo now goes through without anyone looking.' },
        { k: 'bad', t: 'You got into a knife-throwing contest and lost. The scar is small, but the story told about it is not.' },
        { k: 'odd', t: 'You woke up as the new captain of a small, leaky fishing boat. The crew of two is delighted.' }
    ],
    middle: [
        { k: 'good', t: 'You make friends with a guild journeyman who can get you trade goods at a tenth off for the next month.' },
        { k: 'good', t: 'You sing so well (or so badly) that the tavern offers you a standing free drink if you come back on market days.' },
        { k: 'good', t: 'A merchant in her cups mentions a caravan that needs guards and pays well. She gives you her card.' },
        { k: 'good', t: 'You win a game of dragonchess against a city clerk, who now owes you a favor with the paperwork.' },
        { k: 'bad', t: 'You ran up a tab you can\'t remember. The barkeep can: 3d6 gp, payable before you\'re welcome back.' },
        { k: 'bad', t: 'You started a brawl over a card game. The tavern bans you, and the other player swears revenge.' },
        { k: 'bad', t: 'You promised to sponsor a local festival. The organizers expect 10 gp and are already printing your name.' },
        { k: 'bad', t: 'You told a fellow drinker far too much about your party\'s plans. Someone who wasn\'t drinking was listening.' },
        { k: 'odd', t: 'You joined a secret society. The password is "turnip." You have no memory of what the society does.' },
        { k: 'odd', t: 'You are engaged. Your betrothed is lovely, very enthusiastic, and has already told their parents.' },
        { k: 'odd', t: 'A gnome inventor bought you drinks all night and now considers you a business partner in a flying bathtub.' },
        { k: 'good', t: 'You helped a lost courier find the right guildhall. The guild sends a thank-you, a discount, and a standing invitation.' },
        { k: 'bad', t: 'You loaned a new friend 2d6 gp for a sure thing. The sure thing was not sure, and the friend has left town.' },
        { k: 'odd', t: 'You won a raffle. The prize is a share in a racehorse that has never finished a race.' },
        { k: 'odd', t: 'You entered a pie-eating contest and won a trophy shaped like a pie. It is real silver and smells faintly of pie.' }
    ],
    high: [
        { k: 'good', t: 'A minor noble finds you charming and invites you to her hunting lodge next season, along with your friends.' },
        { k: 'good', t: 'You impress a wealthy patron of the arts, who offers to fund one expedition "for the stories."' },
        { k: 'good', t: 'Over brandy, a councilor lets slip which guild is about to lose its charter. Knowledge like that is worth money.' },
        { k: 'good', t: 'You win a fencing exhibition and a jeweled pin. Wearing it gets you through doors that were closed before.' },
        { k: 'bad', t: 'You lost heavily at the card tables: 4d10 gp, owed to a duke who smiles a little too much.' },
        { k: 'bad', t: 'You offended the hostess by mistaking her for a servant. You won\'t be invited anywhere decent for a month.' },
        { k: 'bad', t: 'A rival spread a rumor that you cheat at cards. Half the room believes it. The other half wants lessons.' },
        { k: 'bad', t: 'You challenged a lord to a duel at dawn. It is now nearly dawn, and he has brought his champion.' },
        { k: 'odd', t: 'You were briefly crowned King or Queen of the Masquerade. The crown is real and someone wants it back.' },
        { k: 'odd', t: 'A fortune teller at the gala read your palm, went pale, and refused your coin.' },
        { k: 'odd', t: 'You commissioned a portrait of yourself while tipsy. It is enormous. The painter delivers next week, with the bill.' },
        { k: 'odd', t: 'You agreed to adopt a noble family\'s prize-winning peacock. It is loud, vain, and now yours.' },
        { k: 'good', t: 'A retired general enjoyed your company and offers you the use of her library and her cellar, in that order.' },
        { k: 'bad', t: 'You mistook a famous poet\'s new work for a drinking song and sang along. The poet will not forget.' },
        { k: 'odd', t: 'You agreed to a masked dance with a stranger who left at midnight and one glass slipper. The slipper is your size.' }
    ]
};

// ── Where they live (one draw per character) ─────────────
const DOWNTIME_LODGING = {
    wretched: ["a doorway out of the wind", "the dry arch under the old bridge", "a heap of sacks behind the fish market",
        "an empty barrel on the wharf", "the steps of a temple until the acolytes chase you off"],
    squalid: ["a hammock in a flophouse loft", "a straw pallet in the back of a stable", "a cellar room that floods when it rains",
        "a shared room over a tannery", "a lean-to against the city wall"],
    poor: ["a cot in a boarding house with nine other cots", "a bunk in a sailors' doss-house", "an attic room you can stand up in if you stoop",
        "a back room at a cheap inn, next to the kitchen", "a narrow room over a cooper's shop"],
    modest: ["a rented room above a bakery", "a small room at a decent inn", "two rooms over a chandler's shop",
        "the spare room of a widowed weaver", "a room in a quiet lane off the market"],
    comfortable: ["a whole floor of a merchant's townhouse", "the best room at a good inn, with a window seat",
        "a rented cottage with a walled garden", "a suite of rooms near the guildhall", "a tidy house on the river walk"],
    wealthy: ["a townhouse with a cook and a footman", "a riverside villa rented by the month",
        "the guest wing of a merchant prince's house", "a suite at the finest inn in the city", "a house on the hill with a view of the harbor"],
    aristocratic: ["a mansion with its own gatehouse", "a manor just outside the walls, staff included",
        "the entire top floor of the grandest inn in the city", "a palace wing lent by an old family friend", "a walled estate with a deer park"]
};
const DOWNTIME_NEIGHBORS = {
    low: ["a rat-catcher", "a one-eyed doorman", "a dockhand on the night shift", "a fortune teller",
        "a former soldier", "a 'retired' pickpocket", "a cobbler with eleven cats", "a street preacher"],
    middle: ["a guild clerk", "a nervous apprentice wizard", "a widowed baker", "a watch sergeant", "a traveling cloth merchant",
        "a retired adventurer", "a playwright nobody has staged", "a halfling midwife"],
    high: ["a minor noble", "a famous painter", "a temple high priest", "a shipping magnate", "a retired general",
        "an ambassador's secretary", "a very old elf", "a gossip columnist for the court"]
};
const DOWNTIME_NEIGHBOR_QUIRKS = [
    "who sings through the wall every night", "who wants to know where you go and when you get back",
    "who leaves soup on your doorstep without a word", "who argues with someone nobody else can see",
    "who borrows things and returns them slightly better", "who keeps bees, badly", "who asks you to settle every dispute in the building",
    "who is very sure you are someone else", "who plays the same three notes on a flute at dawn", "who knows every rumor before it happens",
    "who wants you to look at a strange noise in the cellar", "who keeps trying to sell you a cart", "who is plainly in love with your landlord",
    "who never sleeps, as far as anyone can tell", "who hums when lying", "who is writing a book and needs to ask you a few questions"
];

// ── The activity's setting (one draw per character) ──────
const DOWNTIME_SETTINGS = {
    none: { label: 'Days', parts: [
        ["Long breakfasts", "Walks along the walls", "Mending gear", "Writing letters home", "Feeding the ducks", "Card games with the locals", "Sleeping late", "Watching the market"],
        ["and an early night or two.", "and a lot of staring out of windows.", "and catching up on sleep.", "and not thinking about dungeons for once.", "and some honest boredom.", "and getting to know the neighborhood."]] },
    craft: { label: 'Workshop', parts: {
        low: ["a borrowed corner of a smithy", "a table in your own room", "the back of a cart in a stable yard", "a cold shed by the river"],
        middle: ["a rented bench in a guild workshop", "a small shop between tenants", "a workroom behind a hardware store", "the back room of a friend's forge"],
        high: ["a private workroom with good north light", "a master's workshop rented by the week", "a workshop in a noble's carriage house", "a guild hall's best room, fully stocked"]
    }, quirks: ["with a bench that wobbles", "where the light is good until noon", "next door to a very loud cooper", "with a cat that sleeps on your work",
        "where the last tenant left half a project", "with a stove that smokes", "where the tools are older than the building", "with a window onto a busy street"] },
    work: { label: 'The job', parts: {
        trade: [["Hauling crates", "Minding the counter", "Mending nets", "Keeping the books", "Running messages", "Stirring the vats", "Carrying stone",
            "Watching the door at night", "Sorting a back room nobody has sorted in years", "Mucking out stables"],
            ["a dwarven brewer", "the dockmaster", "a widowed baker", "a stonemason's crew", "a halfling cheesemonger", "a tanner",
            "a candlemaker", "a moneylender", "a ferry captain", "the city's busiest stable"]],
        org: [["Copying ledgers", "Drilling recruits", "Tending the sick", "Checking weights at the market", "Cataloguing donations",
            "Escorting the tax collectors", "Teaching apprentices their letters", "Inspecting the city walls"],
            ["the temple of the harvest goddess", "the masons' guild", "the city archive", "the watch", "the alchemists' guild",
            "a merchant house", "the harbor office", "the lamplighters' guild"]],
        perform: [["Playing the lute", "Telling tall tales", "Juggling knives", "Singing ballads", "Reciting poetry", "Dancing",
            "Eating fire", "Doing card tricks"],
            ["a riverside tavern", "the market square", "a noble's garden parties", "a playhouse between acts", "a festhall's small stage",
            "a temple's feast days", "the queue outside the opera", "a traveling circus wintering in town"]]
    }, quirks: ["who pays every evening in a little cloth bag", "who pays on time and complains about it", "who pays an extra copper for every joke",
        "who swears the job used to pay better", "who pays partly in leftovers", "who keeps forgetting your name", "who treats you like family, whether you like it or not",
        "who runs the place like a military campaign", "who is plainly hiding something in the cellar", "who hums the same tune all day"] },
    research: { label: 'Sources', parts: [
        ["the temple archive", "a sage's cluttered study", "a private library behind a wine shop", "the university's restricted stacks",
        "an old cartographer's attic", "the city records office", "a junk shop full of a dead wizard's letters", "a monastery's scriptorium",
        "a bookshop of strange books", "a tavern whose regulars remember everything"],
        ["kept by a librarian who shushes even thoughts", "where nothing is where the catalogue says", "where candles are forbidden and the windows are small",
        "open only after dark", "guarded by a very old dog", "where every useful book is out on loan to the same person",
        "where the keeper wants a favor before a fee", "where the dust is thick enough to write in"]] },
    recup: { label: 'Care', parts: [
        ["a temple infirmary", "the innkeeper's mother", "a halfling herbwife", "a retired army surgeon", "a gnome apothecary with experimental tea",
        "a quiet convent outside the walls", "a druid with a garden of healing herbs", "a neighbor with a great deal of soup"],
        ["who prescribes rest, broth, and no visitors", "who insists on fresh air and long walks", "who reads aloud whether you want it or not",
        "who has a cure for everything and a story for every cure", "who keeps a very strict schedule", "who doesn't believe in pain, yours included",
        "who brews something green every morning", "who charges nothing and makes you feel guilty about it"]] },
    train: { label: 'Tutor', parts: [
        ["a retired sea captain", "an exiled scholar", "a guild master", "a bard between tours", "a dwarven smith", "an elven translator",
        "a temple scribe", "a former spy", "a gnome tinker", "a caravan master", "an ancient halfling teacher", "a stern young prodigy"],
        ["who teaches only at dawn", "who holds lessons in a moving cart", "who expects homework and checks it", "who teaches by telling stories",
        "who has never once said 'well done'", "who throws chalk", "who teaches over very long lunches", "who keeps changing the lesson plan",
        "who insists you learn the history first", "who learns as much from you as you do from them"]] },
    gamble: { label: 'The table', parts: {
        low: ["a dockside dive", "an old warehouse by the tannery", "the back of the fish market", "a cellar where nobody gives a real name"],
        middle: ["a gaming room above a tavern", "the guild members' lounge", "a merchant's back parlor", "a tent at the fairground outside the gates"],
        high: ["a duke's private salon", "a masked club behind a secret door", "a riverboat casino", "a lakeside pavilion with hired musicians"]
    }, quirks: ["where the house always seems to win", "run by a smiling halfling who remembers every debt", "where cheating is expected but getting caught is not",
        "with a bouncer named Pebble", "where the drinks are free and strong", "with a strict no-magic rule and a mage who checks",
        "where everyone tips the dealer", "where the regulars bet on the new players"] },
    carouse: { label: 'Haunts', parts: {
        low: ["dockside dives", "back-alley taverns", "a cellar bar with no name", "the dog fights", "a sailors' singing house"],
        middle: ["the respectable taverns", "guild halls on feast nights", "the theater district", "a wine garden by the river", "the market's late-night stalls"],
        high: ["salons and galas", "private clubs", "the opera's boxes", "garden parties on the hill", "masked balls"]
    }, quirks: ["where everyone knows your name by the second night", "where the music never stops", "where somebody always starts a song",
        "where the drinks get stranger after midnight", "where fortunes change hands", "where you'll meet everyone worth knowing, and some who aren't"] }
};

// ── Week by week: one entry per week, k = good / bad / odd / quiet ──
// {name} = a local's first name. Fixed entries plus composed ones (who × what).
const DOWNTIME_QUIET = [
    "A quiet week. Nothing to report but the weather.", "Rain all week. You get very familiar with your ceiling.",
    "Nothing much happens, which is its own kind of luck.", "A slow week of chores, letters, and early nights.",
    "The week passes in small errands.", "A calm week. You catch up on sleep you didn't know you'd missed.",
    "Market days come and go. Nobody tries to kill you.", "A week of fog. Everyone keeps to themselves."
];
const DOWNTIME_TOWN = {
    low: [
        { k: 'good', t: "You help pull a drunk out of the canal. He turns out to be a ferryman, and you ride free for a month." },
        { k: 'good', t: "A street kid named {name} decides to be your guide, and knows every shortcut and every fence in the district." },
        { k: 'bad', t: "Your room is burgled while you're out. They took 1d6 sp and, oddly, your left boot." },
        { k: 'bad', t: "A gang starts charging 'street tax' on your lane: 2 cp a day, or trouble." },
        { k: 'bad', t: "The watch is sweeping the district for a thief who looks a bit like you." },
        { k: 'odd', t: "A dog follows you home and will not leave. It is very good at finding coins in gutters." },
        { k: 'odd', t: "Someone has chalked a strange mark on your door. The neighbors have the same mark, upside down." },
        { k: 'odd', t: "A rag-and-bone man swaps you a cracked mirror for an old boot. The mirror shows the room as it was a day ago." },
        { k: 'good', t: "The local soup kitchen needs a hand. In return you hear every rumor in the district." },
        { k: 'bad', t: "Fever goes round the boarding houses. Make a DC 11 Constitution save or spend the week in bed." }
    ],
    middle: [
        { k: 'good', t: "A guild clerk named {name} owes you a small favor after you return a lost purse." },
        { k: 'good', t: "The market holds a festival day. You eat very well for very little." },
        { k: 'bad', t: "A pamphlet goes around town with an unflattering woodcut of your party." },
        { k: 'bad', t: "A pickpocket works the crowd on market day. Check your purse: 1d10 sp gone." },
        { k: 'bad', t: "Your landlord raises the rent. Just for you. Just this week. 'Repairs.'" },
        { k: 'odd', t: "A traveling theater troupe stages a play about adventurers. The villain looks like one of you." },
        { k: 'odd', t: "A stranger pays for your dinner and leaves before you can ask why." },
        { k: 'odd', t: "A cat brings you a tiny brass key, then sits and waits." },
        { k: 'good', t: "{name}, a baker on your street, starts saving you the best loaf of the morning." },
        { k: 'bad', t: "A town crier announces a reward for information about 'armed vagrants'. People look at you." }
    ],
    high: [
        { k: 'good', t: "Your name is on the guest list for the season's grand ball." },
        { k: 'good', t: "A noble's steward named {name} quietly offers you work 'of a discreet nature'." },
        { k: 'bad', t: "A society column mocks your fashion sense. Doors close a little more slowly." },
        { k: 'bad', t: "Your household staff are poached by a rival. Expect cold dinners for a week." },
        { k: 'bad', t: "A creditor's man calls at the front door, loudly, while you have guests." },
        { k: 'odd', t: "A painter asks to paint you as a saint for a temple fresco." },
        { k: 'odd', t: "A sealed letter arrives addressed to the previous occupant. It is marked urgent." },
        { k: 'odd', t: "Your neighbor's prize peacock escapes into your garden and refuses to leave." },
        { k: 'good', t: "A wealthy collector asks to hear your war stories over dinner, and pays for the privilege." },
        { k: 'bad', t: "Someone has been using your name to run up bills at the tailor's." }
    ]
};
const DOWNTIME_EVENTS = {
    craft: [
        { k: 'good', t: "A supplier has a surplus. Your materials cost a tenth less this week." },
        { k: 'good', t: "A customer sees your half-finished work and asks to buy the next one." },
        { k: 'good', t: "An old master named {name} looks over your shoulder and shows you a trick that saves a day." },
        { k: 'bad', t: "A tool breaks. Lose a day of progress, or pay 1 gp for a replacement." },
        { k: 'bad', t: "Damp gets into your materials. Lose a day of progress unless you pay 2 gp to replace them." },
        { k: 'bad', t: "The guild sends someone round to ask whether you have a license to sell that." },
        { k: 'bad', t: "Your work goes missing overnight, then turns up the next morning, slightly improved. Nobody admits a thing." },
        { k: 'odd', t: "A rival crafter starts making the exact same thing, one day behind you." },
        { k: 'odd', t: "A stranger offers to trade you rare materials for 'a small favor, later'." },
        { k: 'good', t: "Word gets around. Someone wants to commission a second piece when this one is done." },
        { k: 'odd', t: "You make a mistake that turns out better than the plan." },
        { k: 'good', t: "An apprentice named {name} offers to sweep up for free if you let them watch." }
    ],
    work: [
        { k: 'good', t: "A customer tips you 1d6 sp for going the extra mile." },
        { k: 'good', t: "Your boss is pleased and gives you Friday off, paid." },
        { k: 'good', t: "A coworker named {name} turns out to know someone who knows something useful." },
        { k: 'bad', t: "Your boss is short this week and pays you half, with apologies." },
        { k: 'bad', t: "A coworker takes credit for your work. They are very smug about it." },
        { k: 'bad', t: "You are blamed for a breakage. Pay 1d4 gp or lose the job." },
        { k: 'odd', t: "Someone you've never met asks for you by name at work." },
        { k: 'odd', t: "You find a hidden ledger at work. The numbers don't add up, on purpose." },
        { k: 'odd', t: "Your boss asks you to deliver a package at midnight and not to look inside." },
        { k: 'good', t: "A regular customer offers you a better-paying job. You can take it next week." },
        { k: 'bad', t: "The place is closed two days for an inspection. Nobody explains what was found." },
        { k: 'odd', t: "A coworker confides they are an heir to a minor noble house and are hiding from their family." }
    ],
    research: [
        { k: 'good', t: "You find a margin note in an old book that points straight to what you need." },
        { k: 'good', t: "A scholar named {name} is working on the same question and offers to share notes." },
        { k: 'good', t: "An index you thought was lost turns up. The next week of research goes faster." },
        { k: 'bad', t: "The key book is missing. The library's records say it was borrowed forty years ago." },
        { k: 'bad', t: "Your notes are smudged by rain. A day's work lost." },
        { k: 'bad', t: "The sage wants more money: 2d6 gp for 'the difficult questions'." },
        { k: 'odd', t: "Someone else is reading the same books, always just before you. They leave pressed flowers in them." },
        { k: 'odd', t: "A page you need has been cut out with a very sharp knife." },
        { k: 'odd', t: "You find your own name in an old prophecy. It's probably someone else with the same name." },
        { k: 'good', t: "A drunk at the tavern turns out to know more about your subject than any book." },
        { k: 'bad', t: "You read something that gives you nightmares for a week." },
        { k: 'odd', t: "A book falls off the shelf at your feet. It is exactly what you were looking for." }
    ],
    recup: [
        { k: 'good', t: "The rest does you good. Your next recovery save is made with advantage." },
        { k: 'good', t: "A visitor brings fruit, gossip, and a very good pie." },
        { k: 'good', t: "{name}, who sits with the sick, teaches you a card game. You will be excellent at it by the end." },
        { k: 'bad', t: "The healer's tea tastes of feet. You are not sure it is helping." },
        { k: 'bad', t: "You try to get up too soon. Your next recovery save is made with disadvantage." },
        { k: 'odd', t: "The patient in the next bed talks in their sleep, about you." },
        { k: 'odd', t: "A temple cat sleeps on your chest every night. You do feel better, oddly." },
        { k: 'odd', t: "You have vivid dreams about a door you've never seen." },
        { k: 'good', t: "Your party sends a get-well card. Everyone signed it, even the one who can't write." },
        { k: 'bad', t: "Someone steals your boots from under the bed. Rest is easier without them, at least." }
    ],
    train: [
        { k: 'good', t: "Something clicks. Your tutor nods, once. It feels like a medal." },
        { k: 'good', t: "Your tutor brings in a friend named {name} for a lesson, and you learn twice as much." },
        { k: 'bad', t: "Your tutor is sick for three days. You practice alone, badly." },
        { k: 'bad', t: "You forget everything from last week. Your tutor makes you start the chapter again." },
        { k: 'bad', t: "Your tutor raises the fee: an extra 2 gp this week, for 'materials'." },
        { k: 'odd', t: "Your tutor sends you on an errand that seems to have nothing to do with the lessons. It does, eventually." },
        { k: 'odd', t: "Another student starts sitting in on your lessons. Nobody introduces them." },
        { k: 'odd', t: "Your tutor tells you a story about their past that doesn't match what they said last week." },
        { k: 'good', t: "You practice on a local and they understand you. Mostly." },
        { k: 'bad', t: "You argue with your tutor and lose a day sulking." }
    ],
    gamble: [
        { k: 'good', t: "A rich loser at the table offers to pay part of his debt in information." },
        { k: 'good', t: "A dealer named {name} tips you off about who's cheating." },
        { k: 'bad', t: "Someone accuses you of cheating. Nobody can prove it, but people watch your hands." },
        { k: 'bad', t: "A sore loser waits for you outside. He has two friends with him." },
        { k: 'odd', t: "You win a deed to 'a property' in the next town. Nobody knows what's on it." },
        { k: 'odd', t: "An old woman sits at your elbow all night and never once places a bet." },
        { k: 'odd', t: "You win a sealed box that ticks quietly." },
        { k: 'good', t: "The house likes you. Your drinks are free for the rest of the week." },
        { k: 'bad', t: "The table is crooked and you only realize on the walk home." },
        { k: 'odd', t: "The house offers to wipe your losses if you'll deliver a message for them." }
    ]
};
// Composed weekly events: who × what, with the kind on the what.
const DOWNTIME_WHO = {
    low: ["A pickpocket named {name}", "A dockhand named {name}", "A one-legged sailor", "The rat-catcher", "A street urchin", "A tired watchman", "A hedge wizard"],
    middle: ["A guild clerk named {name}", "A traveling merchant", "A watch sergeant named {name}", "A young priest", "A halfling cook", "A gnome inventor", "An off-duty mercenary"],
    high: ["A minor noble named {name}", "A court poet", "A merchant prince's daughter", "A retired general", "The steward of a great house", "An ambassador's aide", "A famous duelist"]
};
const DOWNTIME_WHAT = [
    { k: 'good', t: "buys you a drink and tells you about a job going in the hills." },
    { k: 'good', t: "owes you a favor after you help with a stuck cart." },
    { k: 'good', t: "offers to introduce you to someone useful." },
    { k: 'good', t: "returns something you didn't know you'd lost." },
    { k: 'good', t: "warns you that someone has been asking about you." },
    { k: 'bad', t: "takes an instant dislike to you and tells everyone why." },
    { k: 'bad', t: "borrows 1d4 gp and is not seen again." },
    { k: 'bad', t: "picks a fight with you in front of a crowd." },
    { k: 'bad', t: "spreads a story about your last adventure that makes you look foolish." },
    { k: 'odd', t: "asks you to hold onto a locked box for a week. No questions." },
    { k: 'odd', t: "is convinced you met before, somewhere you've never been." },
    { k: 'odd', t: "wants to hire you to follow their own spouse." },
    { k: 'odd', t: "challenges you to a contest of riddles. The prize is a single silver key." },
    { k: 'odd', t: "is following you. When you turn around, they pretend to tie a shoe." }
];
// Gambling weeks: margin over the DC → share of the stake won (+) or lost (-).
const GAMBLE_TIERS = [
    { min: 5, mult: 1, t: 'won the stake' },
    { min: 0, mult: 0.5, t: 'won half the stake' },
    { min: -4, mult: -0.5, t: 'lost half the stake' },
    { min: -Infinity, mult: -1, t: 'lost the stake' }
];
const DOWNTIME_WEEKS_SHOWN = CAROUSE_SHOWN;
const DOWNTIME_NAMES = ['Brine', 'Tamsin', 'Odo', 'Mags', 'Corvin', 'Pell', 'Wren', 'Hask', 'Ysolde', 'Fenn', 'Dorra', 'Juno', 'Bram', 'Ilse', 'Quill', 'Rook'];

function dtCap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function dtPick(list) {
    return list[Math.floor(rand() * list.length)];
}

// A local's first name: npc-data's names when loaded, else a short list.
function dtLocalName() {
    if (typeof buildName === 'function' && typeof NPC_RACES !== 'undefined') {
        return buildName(dtPick(NPC_RACES), dtPick(['male', 'female', 'nonbinary'])).first;
    }
    return dtPick(DOWNTIME_NAMES);
}

function dtFill(text) {
    return text.replace(/\{name\}/g, () => dtLocalName());
}

// One draw per character: where they live and who lives next door.
function rollLodging(life, seed, i) {
    return withSeed(deriveSeed(seed || '0', `home.${i}.${life}`), () => {
        const place = dtPick(DOWNTIME_LODGING[life] || DOWNTIME_LODGING.modest);
        const who = dtPick(DOWNTIME_NEIGHBORS[carouseCircle(life)]);
        const quirk = dtPick(DOWNTIME_NEIGHBOR_QUIRKS);
        const name = dtLocalName();
        return { place, neighbor: `${name}, ${who} ${quirk}` };
    });
}

// One draw per character: where the activity happens. c.act and c.work pick the table.
function rollSetting(c, life, seed, i) {
    const S = DOWNTIME_SETTINGS[c.act];
    if (!S) return null;
    const circle = carouseCircle(life);
    return withSeed(deriveSeed(seed || '0', `setting.${i}.${c.act}`), () => {
        let text;
        if (c.act === 'none') text = `${dtPick(S.parts[0])} ${dtPick(S.parts[1])}`;
        else if (c.act === 'work') {
            const w = DOWNTIME_WORK[c.work] ? c.work : 'trade';
            const [tasks, bosses] = S.parts[w];
            text = `${dtPick(tasks)} ${w === 'perform' ? 'at' : 'for'} ${dtPick(bosses)}`;
            if (w !== 'perform') text += `, ${dtPick(S.quirks)}`;
            text += '.';
        } else if (c.act === 'gamble') {
            const g = DOWNTIME_GAMES[c.work] || DOWNTIME_GAMES.dice;
            text = `${g.label}. The bets are taken in ${dtPick(S.parts[circle])}, ${dtPick(S.quirks)}.`;
        } else if (Array.isArray(S.parts)) text = `${dtCap(dtPick(S.parts[0]))}, ${dtPick(S.parts[1])}.`;
        else text = `${dtCap(dtPick(S.parts[circle]))}, ${dtPick(S.quirks)}.`;
        return { label: S.label, text: dtFill(text) };
    });
}

// One week's event for any activity but carousing (which keeps its own table).
// Repeats within a character's log are drawn again from the same stream.
function rollDowntimeWeek(act, circle, seed, i, wk, seen) {
    return withSeed(deriveSeed(seed || '0', `week.${i}.${wk}.${act}`), () => {
        let ev = null;
        const own = DOWNTIME_EVENTS[act];
        for (let tries = 0; tries < 6; tries++) {
            const r = rand();
            if (r < 0.15) ev = { k: 'quiet', t: dtPick(DOWNTIME_QUIET) };
            else if (own && r < 0.6) ev = { ...dtPick(own) };
            else if (rand() < 0.55) ev = { ...dtPick(DOWNTIME_TOWN[circle]) };
            else {
                const w = dtPick(DOWNTIME_WHAT);
                ev = { k: w.k, t: `${dtPick(DOWNTIME_WHO[circle])} ${w.t}` };
            }
            if (!seen.has(ev.t)) break;
        }
        seen.add(ev.t);
        ev.t = dtFill(ev.t);
        return ev;
    });
}

// One week at the tables: a d20 from its own seed, so the log can't shift it.
function rollGambleWeek(stake, bonus, game, seed, i, wk) {
    const d20 = withSeed(deriveSeed(seed || '0', `gamble.${i}.${wk}`), () => 1 + Math.floor(rand() * 20));
    const total = d20 + bonus;
    let tier = GAMBLE_TIERS.find(t => total - game.dc >= t.min);
    if (d20 === 20) tier = { mult: 2, t: 'a natural 20: won double the stake' };
    else if (d20 === 1) tier = { mult: -1, t: 'a natural 1: lost the stake' };
    const net = Math.round(stake * tier.mult * 100) / 100;
    return { d20, total, dc: game.dc, net, tier: tier.t, k: net > 0 ? 'good' : 'bad' };
}

function lifeIndex(key) {
    return DOWNTIME_LIFE_KEYS.indexOf(key);
}

function carouseCircle(life) {
    return Object.keys(CAROUSE_CIRCLES).find(c => CAROUSE_CIRCLES[c].from.includes(life)) || 'middle';
}

// Total days of downtime from weeks plus days, clamped to 0..365.
function downtimeDays(weeks, days) {
    const d = Math.floor(Number(weeks) || 0) * 7 + Math.floor(Number(days) || 0);
    return Math.min(DOWNTIME_MAX_DAYS, Math.max(0, d));
}

// One character's downtime. c = { name, life, act, val, done, help, work }; i = row index (for the seeds).
// For training, val/done are days needed/done; for gambling, the weekly stake and the check bonus, and work is the game.
// opts.events = false leaves out lodging, setting, and the weekly log (carousing and gambling still roll).
// Returns { days, life, lifeGp, extraGp, winGp, totalGp (negative = ahead), lines: [{ text, src }],
//   craft?, train?, gamble?, carouse?, home?, setting?, weeks?: [{ k, t, roll? }], weeksTotal }.
function downtimeFor(c, days, seed, i = 0, opts = {}) {
    const L = DOWNTIME_LIFESTYLES[c.life] || DOWNTIME_LIFESTYLES.modest;
    const life = DOWNTIME_LIFESTYLES[c.life] ? c.life : 'modest';
    const lines = [];
    const out = { days, life, lifeGp: 0, extraGp: 0, winGp: 0, totalGp: 0, lines };
    const weeksTotal = days ? Math.max(1, Math.floor(days / 7)) : 0;
    const full = L.gp;
    let lifeGp = days * full;

    if (c.act === 'craft') {
        const value = Math.max(0, Number(c.val) || 0);
        const done = Math.min(value, Math.max(0, Number(c.done) || 0));
        const helpers = Math.max(0, Math.floor(Number(c.help) || 0));
        const perDay = CRAFT_GP_PER_DAY * (1 + helpers);
        const left = value - done;
        const craftDays = left > 0 ? Math.min(days, Math.ceil(left / perDay)) : 0;
        const made = Math.min(left, craftDays * perDay);
        const finished = value > 0 && done + made >= value;
        // SRD 5.1: while crafting, a modest lifestyle is free and a comfortable one costs half.
        const rate = lifeIndex(life) <= lifeIndex('modest') ? 0 : life === 'comfortable' ? full / 2 : full;
        lifeGp = craftDays * rate + (days - craftDays) * full;
        const materials = made / 2;
        out.extraGp += materials;
        out.craft = { value, done, made, perDay, craftDays, finished, materials,
            daysLeft: finished || !value ? 0 : Math.ceil((value - done - made) / perDay) };
        if (!value) lines.push({ text: 'Enter the item\'s market value to track crafting progress.', src: 'ruling' });
        else {
            lines.push({ text: `Crafting at ${formatCoins(perDay)} of progress a day${helpers ? ` (with ${helpers} helper${helpers === 1 ? '' : 's'})` : ''}: ${formatCoins(done + made)} of ${formatCoins(value)}${finished ? ', finished' : ''}.`, src: 'SRD' });
            if (finished) lines.push({ text: `Done after ${craftDays} day${craftDays === 1 ? '' : 's'} of work.`, src: 'SRD' });
            else lines.push({ text: `${formatCoins(value - done - made)} of work left: about ${out.craft.daysLeft} more day${out.craft.daysLeft === 1 ? '' : 's'}.`, src: 'SRD' });
            if (made) lines.push({ text: `Raw materials: ${formatCoins(materials)} (half the value of the progress made).`, src: 'SRD' });
        }
        if (craftDays && rate < full) lines.push({ text: life === 'comfortable' ? 'Comfortable lifestyle at half cost while crafting.' : 'Lifestyle paid for while crafting (modest or less is free).', src: 'SRD' });
        else if (craftDays && lifeIndex(life) > lifeIndex('comfortable')) lines.push({ text: 'Crafting doesn\'t cover a lifestyle this lavish, so it costs full price.', src: 'ruling' });
        if (helpers) lines.push({ text: 'Helpers need the right tool proficiency and must work in the same place.', src: 'SRD' });
    } else if (c.act === 'work') {
        const w = DOWNTIME_WORK[c.work] || DOWNTIME_WORK.trade;
        const cov = DOWNTIME_LIFESTYLES[w.covers];
        if (lifeIndex(life) <= lifeIndex(w.covers)) {
            lifeGp = 0;
            lines.push({ text: `The work pays for up to a ${cov.label.toLowerCase()} lifestyle, so living costs nothing.`, src: 'SRD' });
        } else {
            lifeGp = days * (full - cov.gp);
            lines.push({ text: `The work pays for a ${cov.label.toLowerCase()} lifestyle (${formatCoins(cov.gp)} a day).`, src: 'SRD' });
            lines.push({ text: 'Living above it, the character pays the difference.', src: 'ruling' });
        }
    } else if (c.act === 'research') {
        out.extraGp += days * RESEARCH_GP_PER_DAY;
        lines.push({ text: `Research expenses: ${formatCoins(RESEARCH_GP_PER_DAY)} a day. The DM decides what can be learned and how long it takes.`, src: 'SRD' });
    } else if (c.act === 'recup') {
        const tries = Math.floor(days / 3);
        lines.push({ text: tries
            ? `${tries} recovery attempt${tries === 1 ? '' : 's'} (one per 3 days): DC 15 Constitution save. On a success, end one effect that stops hit point recovery, or gain advantage on saves against one disease or poison for 24 hours.`
            : 'Recuperating takes 3 days of downtime before the DC 15 Constitution save.', src: 'SRD' });
    } else if (c.act === 'carouse') {
        // House rule: carousing costs the lifestyle's daily price again on top (at least 1 sp a day).
        out.extraGp += days * Math.max(0.1, full);
        const circle = carouseCircle(life);
        const weeks = days ? Math.max(1, Math.floor(days / 7)) : 0;
        const table = CAROUSE_OUTCOMES[circle];
        out.carouse = { circle, weeks, outcomes: [] };
        for (let wk = 0; wk < Math.min(weeks, CAROUSE_SHOWN); wk++) {
            out.carouse.outcomes.push(withSeed(deriveSeed(seed || '0', `carouse.${i}.${wk}`), () => table[Math.floor(rand() * table.length)]));
        }
        lines.push({ text: `Carousing in ${CAROUSE_CIRCLES[circle].label} costs the lifestyle's price again each day, and brings one outcome per week.`, src: 'house' });
    } else if (c.act === 'train') {
        const need = Math.floor(Math.max(0, Number(c.val) || 0));
        const had = Math.min(need, Math.floor(Math.max(0, Number(c.done) || 0)));
        const used = need ? Math.min(days, need - had) : days;
        out.extraGp += used * TRAIN_GP_PER_DAY;
        out.train = { need, had, used, finished: need > 0 && had + used >= need };
        lines.push({ text: `A tutor charges ${formatCoins(TRAIN_GP_PER_DAY)} a day of lessons. The DM sets how many days a language or tool proficiency takes.`, src: 'house' });
        if (need) {
            lines.push({ text: out.train.finished
                ? `Training done: ${need} of ${need} days${used < days ? `, finished on day ${used}` : ''}. The character gains the proficiency.`
                : `${had + used} of ${need} days of training: ${need - had - used} more to go.`, src: 'house' });
        } else lines.push({ text: 'Enter the days the training takes to track progress.', src: 'ruling' });
    } else if (c.act === 'gamble') {
        const stake = Math.max(0, Math.round((Number(c.val) || 0) * 100) / 100);
        const bonus = Math.min(GAMBLE_MAX_BONUS, Math.floor(Math.max(0, Number(c.done) || 0)));
        const game = DOWNTIME_GAMES[c.work] || DOWNTIME_GAMES.dice;
        out.gamble = { stake, bonus, game, rolls: [], net: 0 };
        lines.push({ text: `${game.label}: each week, a ${game.check} check (DC ${game.dc}). Beat the DC by 5 to win the stake, make it to win half; miss by up to 4 to lose half, or by more to lose it all. A natural 20 wins double; a natural 1 loses the stake.`, src: 'house' });
        if (!stake) lines.push({ text: 'Enter a weekly stake to roll the games.', src: 'ruling' });
        else {
            for (let wk = 0; wk < weeksTotal; wk++) {
                const g = rollGambleWeek(stake, bonus, game, seed, i, wk);
                out.gamble.net += g.net;
                if (wk < DOWNTIME_WEEKS_SHOWN) out.gamble.rolls.push(g);
            }
            out.gamble.net = Math.round(out.gamble.net * 100) / 100;
            if (out.gamble.net < 0) out.extraGp += -out.gamble.net;
            else out.winGp = out.gamble.net;
            if (weeksTotal) lines.push({ text: `${weeksTotal} week${weeksTotal === 1 ? '' : 's'} at the tables: ${out.gamble.net >= 0 ? 'ahead' : 'down'} ${formatCoins(Math.abs(out.gamble.net))} in all.`, src: 'house' });
        }
    }

    if (opts.events !== false && days) {
        out.home = rollLodging(life, seed, i);
        out.setting = rollSetting(c, life, seed, i);
        if (c.act !== 'carouse') {
            const seen = new Set();
            out.weeks = [];
            // Once the crafting or training is done, the rest of the weeks are ordinary ones.
            const busyDays = out.craft && out.craft.value ? out.craft.craftDays : out.train && out.train.need ? out.train.used : days;
            for (let wk = 0; wk < Math.min(weeksTotal, DOWNTIME_WEEKS_SHOWN); wk++) {
                const act = wk * 7 < busyDays ? c.act : 'none';
                const ev = rollDowntimeWeek(act, carouseCircle(life), seed, i, wk, seen);
                if (out.gamble && out.gamble.rolls[wk]) ev.roll = out.gamble.rolls[wk];
                out.weeks.push(ev);
            }
        }
    } else if (out.gamble && out.gamble.rolls.length) {
        out.weeks = out.gamble.rolls.map(roll => ({ k: roll.k, t: '', roll }));
    }
    if (out.carouse) out.weeks = out.carouse.outcomes.map(o => ({ ...o }));
    out.weeksTotal = weeksTotal;

    if (life === 'aristocratic') lines.push({ text: 'Aristocratic is 10 gp a day at the least; the grandest households spend far more.', src: 'SRD' });
    out.lifeGp = Math.round(lifeGp * 100) / 100;
    out.extraGp = Math.round(out.extraGp * 100) / 100;
    out.winGp = Math.round(out.winGp * 100) / 100;
    out.totalGp = Math.round((out.lifeGp + out.extraGp - out.winGp) * 100) / 100;
    return out;
}

// A cost, or money made when it's negative.
function downtimeMoney(gp) {
    return gp < 0 ? `${formatCoins(-gp)} ahead` : formatCoins(gp);
}

// One gambling week as text: "🎲 14 + 3 = 17 vs DC 14: won half the stake (+5 gp)".
function gambleRollText(g) {
    return `🎲 ${g.d20}${g.total !== g.d20 ? ` + ${g.total - g.d20} = ${g.total}` : ''} vs DC ${g.dc}: ${g.tier} (${g.net >= 0 ? '+' : '−'}${formatCoins(Math.abs(g.net))})`;
}

// [label, text] pairs for the page and the copied text; older results without the new fields give none.
function downtimeSceneLines(r) {
    const out = [];
    if (r.home) out.push(['Lodging', `${dtCap(r.home.place)}. Next door: ${r.home.neighbor}.`]);
    if (r.setting) out.push([r.setting.label, r.setting.text]);
    return out;
}

// One week's text for the copied log.
function downtimeWeekText(w) {
    return [w.roll ? gambleRollText(w.roll) + '.' : '', w.t].filter(Boolean).join(' ');
}

// Plain text for the clipboard.
function downtimeText(chars, results, days) {
    const lines = [`Downtime: ${days} day${days === 1 ? '' : 's'}`];
    let party = 0;
    chars.forEach((c, i) => {
        const r = results[i];
        party += r.totalGp;
        const L = DOWNTIME_LIFESTYLES[r.life];
        lines.push('', `${c.name || 'Character ' + (i + 1)}: ${L.label} lifestyle, ${DOWNTIME_ACTIVITIES[c.act] ? DOWNTIME_ACTIVITIES[c.act].label : 'Just living'}`);
        lines.push(`  Living: ${formatCoins(r.lifeGp)}${r.extraGp ? ` + extras ${formatCoins(r.extraGp)}` : ''}${r.winGp ? ` - winnings ${formatCoins(r.winGp)}` : ''} = ${downtimeMoney(r.totalGp)}`);
        downtimeSceneLines(r).forEach(([label, text]) => lines.push(`  ${label}: ${text}`));
        r.lines.forEach(l => lines.push(`  - ${l.text}`));
        (r.weeks || []).forEach((w, wk) => lines.push(`  Week ${wk + 1}: ${downtimeWeekText(w)}`));
        if (r.weeksTotal > (r.weeks || []).length && (r.weeks || []).length) lines.push(`  ...and ${r.weeksTotal - r.weeks.length} more weeks.`);
    });
    lines.push('', `Party total: ${downtimeMoney(Math.round(party * 100) / 100)}`);
    return lines.join('\n');
}
