/* ============================================
   QUEST ENGINE (F32): a quick side quest for the DM Toolbox.
   A quest giver (rollNPC from npc-data.js), the job and its title, where it happens
   and what's there, where to start, what's in the way, a twist, what happens if the
   party fails, a deadline, and a reward in gp (show it with formatCoins() from coins.js).
   Sometimes a foe: an SRD 5.1 encounter rolled by rollEncounter() (encounter-engine.js)
   for the party, picked from the monster types that fit the place.
   All tables are the Gazette's own. The reward is a house rule (the SRD has no
   quest-reward table): QUEST_PAY per character by level, times the job's pay.
   Each part rolls from deriveSeed(seed, part), so a new level or party size changes
   only the reward and the foe, and a new job keeps the same giver.
   Task tokens: {place}, {item}, {person}, {mark}, {first} (the giver's first name),
   plus npc-data's {kin}, {townsfolk}, {thing} through fillTemplate().
   ============================================ */

// gp per character for a side quest, by party level (house rule; index = level).
const QUEST_PAY = [0, 10, 20, 35, 50, 100, 150, 200, 275, 350, 450,
    650, 850, 1100, 1400, 1800, 2300, 3000, 3800, 4800, 6000];

// Where it happens: [name, short name for titles, monster types that might be there, best fit first].
const QUEST_PLACES = [
    ["the flooded mill outside town", "Mill", ["beast", "monstrosity", "humanoid"]],
    ["an abandoned watchtower on the old road", "Watchtower", ["humanoid", "undead", "monstrosity"]],
    ["the sewers under the market", "Sewers", ["ooze", "beast", "swarm", "aberration"]],
    ["a smugglers' cove below the cliffs", "Cove", ["humanoid", "beast", "monstrosity"]],
    ["the chapel nobody visits anymore", "Chapel", ["undead", "fiend"]],
    ["the family crypt on the hill", "Crypt", ["undead", "construct"]],
    ["a hunting lodge deep in the forest", "Lodge", ["beast", "fey", "plant", "monstrosity"]],
    ["the old dwarven mine", "Mine", ["monstrosity", "aberration", "elemental", "construct"]],
    ["a bog where the fog never lifts", "Bog", ["plant", "beast", "undead", "fey"]],
    ["the night market by the docks", "Night Market", ["humanoid", "swarm", "beast"]],
    ["a wizard's recently vacated tower", "Tower", ["construct", "elemental", "aberration", "fiend"]],
    ["the ruined keep at the edge of the map", "Keep", ["humanoid", "giant", "undead", "monstrosity"]],
    ["a mountain pass with a bad reputation", "Pass", ["giant", "monstrosity", "beast", "dragon"]],
    ["a locked garden in the noble quarter", "Garden", ["humanoid", "fiend", "construct", "plant"]],
    ["a circus camped just outside the walls", "Circus", ["humanoid", "monstrosity", "fey"]],
    ["the cave behind the waterfall", "Falls", ["beast", "elemental", "monstrosity"]],
    ["a farmstead where the animals went quiet", "Farm", ["monstrosity", "beast", "fey"]],
    ["the cellar of a tavern that burned down", "Cellar", ["undead", "swarm", "ooze"]],
    ["a frozen lake two days north", "Lake", ["elemental", "beast", "giant"]],
    ["the third sub-basement of the city archives", "Archives", ["construct", "swarm", "aberration"]],
    ["a shipwreck exposed at low tide", "Wreck", ["beast", "undead", "monstrosity"]],
    ["the standing stones on the moor", "Stones", ["fey", "elemental", "undead"]],
    ["a toll bridge whose keeper hasn't been seen in days", "Bridge", ["humanoid", "monstrosity", "giant"]],
    ["the abandoned temple in the jungle valley", "Temple", ["beast", "plant", "undead", "monstrosity"]],
    ["an overgrown hunting maze on a noble's estate", "Maze", ["plant", "beast", "fey"]],
    ["the lighthouse on the rocks that has been dark for a week", "Lighthouse", ["undead", "beast", "elemental"]],
    ["a desert caravanserai half buried in sand", "Caravanserai", ["monstrosity", "elemental", "undead", "humanoid"]],
    ["the old battlefield where nothing grows", "Battlefield", ["undead", "fiend", "construct"]],
    ["a quarry that dug too deep", "Quarry", ["elemental", "aberration", "monstrosity"]],
    ["a guildhall closed after a bad audit", "Guildhall", ["humanoid", "construct", "swarm"]],
    ["the bell tower of the drowned village", "Bell Tower", ["undead", "elemental", "beast"]],
    ["an orchard where the fruit ripens overnight", "Orchard", ["fey", "plant", "beast"]],
    ["the city's oldest bathhouse", "Bathhouse", ["ooze", "humanoid", "aberration"]],
    ["a monastery that stopped answering letters", "Monastery", ["humanoid", "undead", "fiend", "celestial"]],
    ["the bandit camp in the birch woods", "Camp", ["humanoid", "beast"]],
    ["the ice caves under the glacier", "Ice Caves", ["elemental", "beast", "monstrosity"]],
    ["a salt marsh full of half-sunk statues", "Salt Marsh", ["monstrosity", "beast", "undead"]],
    ["the opera house that closed for repairs", "Opera House", ["undead", "humanoid", "construct"]],
    ["a giant's abandoned kitchen", "Kitchen", ["giant", "beast", "swarm"]],
    ["the riverboat moored at the dead dock", "Riverboat", ["humanoid", "undead", "beast"]],
    ["the old prison on the island", "Prison", ["humanoid", "undead", "construct"]],
    ["a volcanic vent the locals worship", "Vent", ["elemental", "dragon", "monstrosity"]],
    ["gallows hill at the crossroads", "Gallows", ["undead", "fiend", "humanoid"]],
    ["a halfling burrow-village gone suspiciously quiet", "Burrows", ["monstrosity", "beast", "fey"]],
    ["the royal menagerie after closing", "Menagerie", ["beast", "monstrosity"]],
    ["a sunken library at the bottom of the lake", "Library", ["aberration", "construct", "undead"]],
    ["the treetop village in the old forest", "Treetops", ["beast", "fey", "humanoid"]],
    ["a goblin market that moves every new moon", "Goblin Market", ["humanoid", "fey"]],
    ["a dragon's old lair (empty, supposedly)", "Lair", ["dragon", "monstrosity", "beast"]],
    ["the abandoned mint", "Mint", ["construct", "humanoid", "swarm"]],
    ["a shrine on the mountain where the pilgrims stopped going", "Shrine", ["celestial", "undead", "giant"]],
    ["the hospital wing of the old fortress", "Fortress", ["undead", "ooze", "humanoid"]]
];

// Composed places: "the {condition} {site} {where}". built: takes the built conditions;
// at: the QUEST_WHERE groups the site can sit in.
const QUEST_SITES = [
    { n: "mill", s: "Mill", built: true, at: ["near"], foes: ["beast", "monstrosity", "humanoid"] },
    { n: "watchtower", s: "Watchtower", built: true, at: ["near"], foes: ["humanoid", "undead", "monstrosity"] },
    { n: "chapel", s: "Chapel", built: true, at: ["near", "town"], foes: ["undead", "fiend", "celestial"] },
    { n: "manor house", s: "Manor", built: true, at: ["near", "town"], foes: ["undead", "humanoid", "construct"] },
    { n: "granary", s: "Granary", built: true, at: ["near", "town"], foes: ["swarm", "beast", "monstrosity"] },
    { n: "warehouse", s: "Warehouse", built: true, at: ["town", "coast"], foes: ["humanoid", "swarm", "construct"] },
    { n: "tannery", s: "Tannery", built: true, at: ["town"], foes: ["ooze", "swarm", "humanoid"] },
    { n: "bell tower", s: "Bell Tower", built: true, at: ["town", "near"], foes: ["undead", "construct", "beast"] },
    { n: "shrine", s: "Shrine", built: true, at: ["near"], foes: ["fey", "undead", "celestial"] },
    { n: "smithy", s: "Smithy", built: true, at: ["town", "near"], foes: ["construct", "elemental", "humanoid"] },
    { n: "fishing village", s: "Village", built: true, at: ["coast"], foes: ["beast", "undead", "humanoid"] },
    { n: "orphanage", s: "Orphanage", built: true, at: ["town"], foes: ["undead", "fey", "humanoid"] },
    { n: "cistern", s: "Cistern", built: true, at: ["town"], foes: ["ooze", "beast", "aberration"] },
    { n: "gatehouse", s: "Gatehouse", built: true, at: ["near", "town"], foes: ["humanoid", "construct", "undead"] },
    { n: "ferry landing", s: "Landing", built: true, at: ["near"], foes: ["humanoid", "beast", "undead"] },
    { n: "hermitage", s: "Hermitage", built: true, at: ["near"], foes: ["fey", "undead", "fiend"] },
    { n: "boathouse", s: "Boathouse", built: true, at: ["coast", "near"], foes: ["beast", "humanoid", "undead"] },
    { n: "barrow mound", s: "Barrow", built: false, at: ["near"], foes: ["undead", "construct"] },
    { n: "cave", s: "Cave", built: false, at: ["near", "coast"], foes: ["beast", "monstrosity", "elemental"] },
    { n: "grove", s: "Grove", built: false, at: ["near"], foes: ["fey", "plant", "beast"] },
    { n: "sinkhole", s: "Sinkhole", built: false, at: ["near", "town"], foes: ["aberration", "ooze", "monstrosity"] },
    { n: "ravine", s: "Ravine", built: false, at: ["near"], foes: ["beast", "monstrosity", "giant"] },
    { n: "hot spring", s: "Spring", built: false, at: ["near"], foes: ["elemental", "beast", "fey"] },
    { n: "tide pools", s: "Tide Pools", built: false, at: ["coast"], foes: ["beast", "monstrosity", "elemental"] }
];
const QUEST_CONDITIONS = {
    built: ["burned-out", "half-collapsed", "boarded-up", "abandoned", "overgrown", "flooded", "sealed", "silent",
        "storm-wrecked", "newly rebuilt", "haunted", "rat-infested", "fog-bound", "quarantined", "freshly painted", "lopsided"],
    wild: ["fog-bound", "overgrown", "flooded", "silent", "snowbound", "sunless", "sealed", "ash-covered", "cursed", "moonlit", "steaming"]
};
const QUEST_WHERE = {
    near: ["just outside town", "beyond the east gate", "past the last farm on the north road", "half a day down the river",
        "in the hills above town", "two days up the old road", "on the far side of the marsh", "at the edge of the old forest",
        "where the river forks", "a day's ride into the moors", "behind the miller's land", "three valleys over"],
    town: ["in the old quarter", "behind the cathedral", "under the market square", "in the noble quarter", "by the tannery yards",
        "on the wrong side of the river", "two streets from the guard post", "at the end of a lane with no name"],
    coast: ["below the cliffs", "on the point past the harbor", "two coves down the shore", "on the spit that floods at high tide",
        "past the wreckers' beacon"]
};

// Things to fetch, steal, deliver, or guard: [full, short for titles].
const QUEST_ITEMS = [
    ["a silver music box that still plays", "Music Box"], ["a ledger bound in eel skin", "Ledger"],
    ["a wedding ring with someone else's name inside", "Wedding Ring"], ["a dented brass bell from a drowned church", "Brass Bell"],
    ["a deed to half the valley", "Deed"], ["the only key to the town treasury", "Treasury Key"],
    ["a portrait whose eyes follow you", "Portrait"], ["a sword that hums when someone lies", "Humming Sword"],
    ["a crown made for a very small king", "Small Crown"], ["a lute with one string that never breaks", "Lute"],
    ["a spellbook with the last page torn out", "Torn Page"], ["a locket holding two locks of hair", "Locket"],
    ["a map drawn on the inside of a coat", "Coat Map"], ["a pocket watch that runs backward", "Backward Watch"],
    ["a clay idol that is warm to the touch", "Warm Idol"], ["a hand mirror that shows yesterday", "Mirror"],
    ["the seal of the old guild", "Guild Seal"], ["a cask of brandy laid down for a royal wedding", "Royal Brandy"],
    ["a stuffed owlbear head (the giver's grandfather's pride)", "Owlbear Head"], ["a pearl the size of a hen's egg", "Pearl"],
    ["a bundle of letters tied with black ribbon", "Black Ribbon"], ["a saint's finger bone in a glass case", "Finger Bone"],
    ["a chess set with one piece missing", "Missing Piece"], ["the last sack of moon wheat seed", "Moon Wheat"],
    ["a recipe book the whole town wants", "Recipe Book"], ["an egg nobody can identify", "Egg"],
    ["a banner from a war nobody won", "Banner"], ["a glass eye that keeps looking around on its own", "Glass Eye"],
    ["a tax ledger the duke would love to lose", "Tax Ledger"], ["a violin carved from a gallows tree", "Gallows Violin"],
    ["a jar of bees that hum a hymn", "Hymn Bees"], ["a dragon's tooth wrapped in old silk", "Dragon's Tooth"]
];

// People to find, walk, or bring home. {kin} fills from npc-data.
const QUEST_PEOPLE = [
    "the giver's {kin}", "the village midwife", "a junior priest", "the mayor's nephew", "a traveling tinker",
    "a famous (and very drunk) bard", "the town's only doctor", "an apprentice cartographer", "a retired adventurer",
    "a goatherd and most of the goats", "the miller's twins", "a noble's runaway heir", "a dwarven surveyor",
    "a court poet", "a lost tax collector (the town is in no hurry)", "the baker's whole family", "a novice wizard",
    "the giver's oldest friend", "a pair of honeymooners", "the lamplighter"
];

// People wanted by somebody.
const QUEST_MARKS = [
    "a deserter with a stolen payroll", "a forger who signs the mayor's name better than the mayor", "a poisoner who works in pastries",
    "a bandit captain called the Red Hen", "a disgraced wizard", "a horse thief with far too many horses", "a cult recruiter",
    "a jailbreaker who escaped the same cell three times", "a bard wanted for a song about the duke", "a smuggler who knows too much",
    "a con artist posing as a saint", "the gravedigger who sold the graves twice", "a duelist who won one duel too many",
    "a runaway alchemist and the formula she took", "a highwayman who robs only tax carts"
];

// The jobs. foe: chance of a fight; diff: the encounter difficulty when there is one;
// pay: reward multiplier; tasks: what the giver wants; twists: this job's own twists;
// stakes: what happens if the party fails; nouns and topics: words for the title.
const QUEST_JOBS = {
    fetch: {
        label: "Fetch", icon: "📦", foe: 0.55, diff: "low", pay: 0.8,
        tasks: [
            "Recover {item} from {place}.",
            "Bring back {item}, hidden somewhere in {place}. Don't look at it too long.",
            "Fetch a rare blue mushroom that only grows in {place}.",
            "Retrieve {item}, lost in {place} during a card game.",
            "Collect a sealed crate left behind in {place}. It's heavier than it looks.",
            "Find {first}'s late mentor's {thing}, last seen in {place}.",
            "Bring back {item}. It was taken to {place}, and the town has been uneasy since.",
            "Fetch a jar of water from {place}. It must not touch iron on the way.",
            "Recover {item} from {place} before the auction on market day.",
            "Bring {first} a cutting from the white rose that grows only at {place}.",
            "Go to {place} and come back with {item}. {first} will explain the rest when you get back."
        ],
        twists: ["The item is a fake. The real one was sold years ago.", "Two other parties were hired to fetch the same thing.",
            "The item is cursed, and the giver wants it for exactly that reason.", "Someone has guarded it for years, and wants to be paid too.",
            "The item is already back in town, in {townsfolk}'s parlor.", "The item doesn't want to leave, and it can make that known."],
        stakes: ["The heirs fight over the estate, and someone ends up in a ditch.", "{first} loses the one thing their family still owned.",
            "Someone else gets there first, and they won't be giving it back."],
        nouns: ["Errand", "Recovery", "Retrieval"], topics: ["Lost Property", "Provenance", "Finders and Keepers"]
    },
    escort: {
        label: "Escort", icon: "🛡️", foe: 0.6, diff: "low", pay: 1,
        tasks: [
            "See a nervous merchant and two wagons safely past {place}.",
            "Walk a retired judge to {place}, where they intend to settle an old score.",
            "Guard a pilgrim who insists on praying at {place}.",
            "Take a young noble on a \"real adventure\" to {place}, and bring them back alive.",
            "Get a cart of sealed barrels through {place} without opening any.",
            "Escort a prize bull to the fair by way of {place}. The bull has opinions.",
            "Take a fortune teller to {place}, where she says she will meet her death. She would like to be wrong.",
            "Bring a pair of eloping lovers through {place} before either family catches up.",
            "Walk {person} home by way of {place}. They refuse to take any other road.",
            "Carry {item} to {place} along with its owner, who won't let it out of their sight.",
            "Take a choir of eleven orphans to sing at {place}. They have been practicing. A lot."
        ],
        twists: ["The person being escorted is the one being hunted, and they knew it.", "The cargo is alive.",
            "Halfway there, the client offers to pay more to go somewhere else entirely.", "The client is wanted, and the bounty is bigger than the fee.",
            "The client is far tougher than they let on, and keeps \"helping.\"", "The client sleepwalks, always toward {place}."],
        stakes: ["The client never arrives, and their family names the party in the letters home.", "The caravan is lost, and with it half the town's winter stores.",
            "The road gets a reputation, and the party gets one too."],
        nouns: ["Escort", "Long Walk", "Safe Passage"], topics: ["Safe Conduct", "Good Company"]
    },
    hunt: {
        label: "Hunt", icon: "🏹", foe: 1, diff: "moderate", pay: 1.2,
        tasks: [
            "Track down and kill whatever has been taking livestock near {place}.",
            "Hunt the creature that drove the woodcutters out of {place}.",
            "End the thing that has been leaving claw marks on doors around {place}.",
            "Bring back a trophy from whatever has been terrorizing {place}. Proof of death is all {first} asks.",
            "Kill the beast that took a hunter's arm at {place}. The hunter is coming along, arm or not.",
            "Find what is eating the fish at {place} before it moves on to the fishermen.",
            "Hunt down whatever howls at {place} every night. {townsfolk} hasn't slept in a week.",
            "Find the nest at {place} before the eggs hatch.",
            "Bring back the hide of whatever ate {first}'s prize goose at {place}. They want a coat out of it."
        ],
        twists: ["The creature is protecting its young.", "A noble wants it captured alive, and pays double for that.",
            "The creature was someone's pet, and they want it back unharmed.", "There are two of them, and the giver only paid for one.",
            "The creature is smarter than the hunters, and it has been leaving them gifts.", "The tracks lead in a circle, back to town."],
        stakes: ["It takes a child next.", "The farms near {place} empty out by winter.",
            "The creature grows bolder and starts coming into town at night."],
        nouns: ["Hunt", "Beast", "Tracks"], topics: ["Teeth", "Claws"]
    },
    rescue: {
        label: "Rescue", icon: "🗝️", foe: 0.75, diff: "moderate", pay: 1.3,
        tasks: [
            "Find {first}'s missing apprentice, last seen heading into {place}.",
            "Free three villagers held for ransom at {place}.",
            "Bring home a prize hound that ran off into {place}.",
            "Rescue a cartographer stuck in {place} with a broken leg and a full map.",
            "Bring back the children who went into {place} on a dare yesterday.",
            "Free a caged songbird from {place}. {first} swears it is their brother.",
            "Find {person}, who went into {place} three days ago. Nobody has seen them since.",
            "Get {person} out of {place} before the ransom deadline.",
            "Rescue {person} from {place}. They were last heard shouting for help and also for lunch."
        ],
        twists: ["The captive doesn't want to be rescued.", "The ransom note was written by the giver.",
            "There are more prisoners than anyone said, and all of them want out.", "The captive has switched sides.",
            "The captive was never taken. They're hiding, and they have a good reason.", "Someone else is rescuing them too, and wants the credit."],
        stakes: ["The captive is sold on to someone much harder to find.", "{first} pays the ransom with money that wasn't theirs.",
            "The search party that goes in after the party doesn't come back either."],
        nouns: ["Rescue", "Lost Lamb", "Homecoming"], topics: ["Ransom", "Missing Persons"]
    },
    deliver: {
        label: "Deliver", icon: "✉️", foe: 0.35, diff: "low", pay: 0.6,
        tasks: [
            "Deliver a sealed letter to someone waiting at {place}. Before sundown.",
            "Carry a locked box to {place} and come back with a receipt.",
            "Take a cake to {first}'s cousin at {place}. Don't ask why it ticks.",
            "Hand a pardon to a prisoner held at {place}, before the sentence is carried out.",
            "Bring a crate of medicine to the healer at {place}. People are waiting.",
            "Carry a wedding ring to {place} and propose on {first}'s behalf. Word for word.",
            "Take {item} to a buyer at {place}. The buyer will know the password; the party won't.",
            "Deliver a goat to {place}. It must arrive in a good mood.",
            "Carry {first}'s will to {place} and read it aloud to whoever answers the door."
        ],
        twists: ["The recipient has been dead for a week.", "Someone offers twice the reward to swap the package.",
            "The package starts talking on the second day.", "The recipient wants a reply carried back, and the reply is going much farther.",
            "There are two recipients, and they each say the other is an impostor.", "The package was the bait. The party is the delivery."],
        stakes: ["A deal falls through, and {first} has to sell the shop.", "Someone at {place} is hanged who didn't need to be.",
            "Word gets out that the party can't be trusted with a parcel."],
        nouns: ["Delivery", "Parcel", "Errand"], topics: ["Postage", "Signatures"]
    },
    investigate: {
        label: "Investigate", icon: "🔍", foe: 0.4, diff: "low", pay: 1,
        tasks: [
            "Find out who has been leaving strange lights on at {place} every night.",
            "Learn why everyone who visits {place} comes back unable to remember it.",
            "Work out who poisoned the well, and why the trail leads to {place}.",
            "Discover what the town council is hiding at {place}.",
            "Find out why the dogs in town howl toward {place} every night at the same hour.",
            "Track a forger whose fake coins all seem to come from {place}.",
            "Learn who has been sending letters signed by {first}'s dead father, all from {place}.",
            "Find out who stole {item}. The thief was seen running toward {place}.",
            "Learn why {person} came back from {place} speaking only in rhyme."
        ],
        twists: ["The culprit is someone the party already likes.", "The answer is worse than the rumor, and the giver knew.",
            "The trail leads straight back to the giver.", "Someone powerful pays the party to stop asking.",
            "There are two culprits, and neither knows about the other.", "The mystery solves itself the moment the party arrives, which is worse."],
        stakes: ["Whoever is behind it does it again, and bigger.", "The wrong person is arrested and tried by the end of the tenday.",
            "{first} stops asking questions, and so does everyone else."],
        nouns: ["Inquiry", "Mystery", "Riddle"], topics: ["Discretion", "Loose Threads"]
    },
    clear: {
        label: "Clear out", icon: "🧹", foe: 1, diff: "high", pay: 1.4,
        tasks: [
            "Clear whatever has nested in {place}, so work can start again.",
            "Drive out the squatters in {place}, by persuasion or otherwise.",
            "Make {place} safe enough to sell. The buyer arrives in three days.",
            "Empty {place} of everything that moves. {first} was very specific.",
            "Clear {place} before the pilgrims arrive for the feast day.",
            "Win back {place} for the old owner, who will be watching from a safe distance.",
            "Clear {place} so {townsfolk} can hold a wedding there. It is non-negotiable.",
            "Go through {place} room by room and make sure nothing is still living there. Or unliving."
        ],
        twists: ["Something worse lives under what you cleared out.", "The \"squatters\" have a deed that looks real.",
            "The things living there were keeping something much worse in check.", "A rival crew shows up halfway and claims the job.",
            "The place is worth ten times what {first} paid for it, and they know why.", "Clearing it out breaks a very old agreement."],
        stakes: ["Whatever is in there spreads to the next village over.", "{first} loses the property to the bank.",
            "The town abandons that part of the map for good."],
        nouns: ["Clearance", "Eviction", "Spring Cleaning"], topics: ["Vermin", "Squatters' Rights"]
    },
    guard: {
        label: "Guard", icon: "🏰", foe: 0.7, diff: "moderate", pay: 1.1,
        tasks: [
            "Hold {place} for three nights until the real guards arrive.",
            "Keep watch over a wedding held at {place}. Two of the guests have sworn to kill each other.",
            "Guard a dig site at {place}. The scholars think they are close to something.",
            "Stand watch at {place} while {first} performs a long and very loud ritual.",
            "Protect the harvest stored at {place} until the tax collector comes.",
            "Guard {item} at {place} through the night of the eclipse.",
            "Keep {person} safe at {place} until the trial. Somebody wants them silent.",
            "Watch {place} for one night and write down everything that happens. Everything."
        ],
        twists: ["The attack comes from inside, from someone the party was told to trust.", "The thing everyone is guarding against is already inside.",
            "Nothing attacks. Instead, something keeps knocking, politely.", "The guards who were meant to relieve the party are the attackers."],
        stakes: ["Everything is lost in one night, and the party's names are on the duty roster.", "{first} is ruined, and blames the party loudly.",
            "What was being guarded gets out."],
        nouns: ["Watch", "Long Night", "Vigil"], topics: ["Trust", "Locked Doors"]
    },
    collect: {
        label: "Collect", icon: "💰", foe: 0.45, diff: "low", pay: 0.9,
        tasks: [
            "Collect an overdue debt from a gambler hiding out at {place}.",
            "Recover the back rent owed by whoever is living in {place}.",
            "Get {first}'s money back from a con artist last seen at {place}.",
            "Collect a promised dowry from a family holed up in {place}. They have changed their minds.",
            "Collect a tithe owed by {place}. Nobody has paid it in forty years.",
            "Get {item} back from the pawnbroker at {place}, who says the ticket expired yesterday.",
            "Collect a bet from {townsfolk}, who lost it fairly and then went to {place} to sulk."
        ],
        twists: ["The debtor can't pay, but offers something far more interesting instead.", "The debt was paid already, and the debtor has the receipt.",
            "The debtor owes money to someone much scarier, who also wants paying.", "The debtor is {first}'s {kin}."],
        stakes: ["{first} can't make their own payments, and the debt rolls downhill.", "The debtor skips town with everyone's money.",
            "Everyone in town learns {first} can be stiffed."],
        nouns: ["Debt", "Collection", "Reckoning"], topics: ["Interest", "Unpaid Accounts"]
    },
    heist: {
        label: "Steal", icon: "💎", foe: 0.5, diff: "low", pay: 1.3,
        tasks: [
            "Lift {item} from {place} without anyone knowing it was taken.",
            "Swap {item} at {place} for the copy {first} had made.",
            "Steal back {item}, which {first} swears was theirs first, from {place}.",
            "Get into {place} during the masquerade, take {item}, and get out before the unmasking.",
            "Break into {place} and copy one page of a ledger. Leave everything else exactly as it was.",
            "Take {item} from {place}. {first} has a buyer, a plan, and a floor plan that is mostly right."
        ],
        twists: ["Someone else is robbing the same place, the same night.", "The owner hired the party, through {first}, to test the locks.",
            "The thing they stole is a fake, planted to catch thieves.", "The plan was sold to the watch an hour after the party agreed to it."],
        stakes: ["The owner learns who planned it, and comes for {first}.", "The party's faces end up on posters.",
            "The item goes to the buyer {first} was trying to beat."],
        nouns: ["Heist", "Lift", "Vanishing"], topics: ["Light Fingers", "Ownership"]
    },
    parley: {
        label: "Negotiate", icon: "🤝", foe: 0.25, diff: "low", pay: 0.9,
        tasks: [
            "Talk whoever holds {place} into letting the caravans through again.",
            "Go to {place} and buy back {first}'s good name, at whatever price is asked.",
            "Broker a truce between two families who both claim {place}.",
            "Convince the creature at {place} to move along. It has been reasonable so far.",
            "Get a signature from the hermit at {place}, who hates the town, the crown, and ink.",
            "Settle {first}'s quarrel with {townsfolk} at {place}, on neutral ground, with nobody stabbed."
        ],
        twists: ["The other side wants the party, not money.", "Both sides hired the party.",
            "The deal is easy. Getting {first} to accept it isn't.", "The other side is right, and can prove it."],
        stakes: ["The quarrel turns into a feud, and the feud turns into a funeral.", "Trade dries up and prices in town double.",
            "{first} goes to make the deal personally, which is a terrible idea."],
        nouns: ["Parley", "Truce", "Handshake"], topics: ["Manners", "Terms"]
    },
    scout: {
        label: "Scout", icon: "🧭", foe: 0.5, diff: "low", pay: 0.8,
        tasks: [
            "Map {place} and come back with a drawing of every way in.",
            "Find out how many are holed up at {place}, and how well armed. Don't be seen.",
            "Mark a safe road to {place} for the caravan that leaves next tenday.",
            "Count the doors at {place}. {first} insists there is one more than there should be.",
            "Find out if {place} is still standing after the earthquake, and if anyone is in it.",
            "Find a way to {place} that doesn't go past {townsfolk}'s land."
        ],
        twists: ["The map the party draws changes overnight.", "The party isn't the first scouts sent. The others are still there.",
            "What they find makes the map worth killing for.", "The place is much bigger on the inside than any map allows."],
        stakes: ["The caravan goes in blind.", "Somebody else claims {place} first, and builds a wall.",
            "{first} sends their own children to look instead."],
        nouns: ["Survey", "Map", "Long Look"], topics: ["Cartography", "Blank Spaces"]
    },
    bounty: {
        label: "Bounty", icon: "⛓️", foe: 0.85, diff: "moderate", pay: 1.25,
        tasks: [
            "Bring in {mark}, hiding out at {place}. Alive is worth twice as much.",
            "Find {mark}, who was last seen near {place}, and bring them to the magistrate.",
            "Catch {mark} before they leave {place} on the next tide.",
            "Track {mark} to {place}. {first} wants a word with them before the hanging.",
            "Arrest {mark} at {place}. The warrant is real. The signature is mostly real."
        ],
        twists: ["The mark is innocent, and can almost prove it.", "The mark has hired their own adventurers.",
            "The bounty is paid by someone who wants the mark dead before they talk.", "The mark turns themself in the moment they see the party. That's the plan."],
        stakes: ["The mark strikes again, and this time someone dies.", "The bounty goes to a rival crew, and so does the reputation.",
            "The mark crosses the border and is gone for good."],
        nouns: ["Bounty", "Warrant", "Manhunt"], topics: ["Wanted Posters", "Alive or Otherwise"]
    },
    cleanse: {
        label: "Lift a curse", icon: "🕯️", foe: 0.65, diff: "moderate", pay: 1.2,
        tasks: [
            "Find out what cursed {place} and end it.",
            "Lay to rest whatever walks {place} after midnight.",
            "Take {item} back to {place}, where it was stolen from, and say sorry to whatever lives there.",
            "Lift the curse on {first}'s family. It started at {place}, three generations ago.",
            "Find the hex bag hidden somewhere at {place} and burn it. Every cow in the valley is giving sour milk.",
            "Break the spell that keeps everyone at {place} dancing."
        ],
        twists: ["The curse is the only thing keeping something worse asleep.", "The one who laid the curse is still alive, and still angry.",
            "The curse is working exactly as it was meant to, and {first} earned it.", "Lifting it means taking it on. Someone has to carry it."],
        stakes: ["The curse spreads to the next family, then the next.", "{first} doesn't see the next full moon.",
            "The town packs up and moves, and blames the party for the cost."],
        nouns: ["Curse", "Blessing", "Cleansing"], topics: ["Bad Luck", "Old Grudges"]
    },
    sabotage: {
        label: "Sabotage", icon: "🧨", foe: 0.5, diff: "low", pay: 1,
        tasks: [
            "Spoil the rival brewer's batch stored at {place}. Make it look like bad luck.",
            "Wreck the siege engine being built at {place}, quietly.",
            "Make sure the shipment at {place} never reaches the market.",
            "Stop the baron's diggers at {place} before they divert the river away from the lower village.",
            "Ruin the opening night at {place}. {first} won't say why, only that it matters.",
            "Swap the ledgers at {place} so the rival guild's books stop adding up."
        ],
        twists: ["The rival knows, and has set a trap.", "The sabotage would hurt innocent people too.",
            "{first} is the one who built the thing the party is wrecking.", "Someone has already sabotaged it. Badly. The party gets the blame."],
        stakes: ["The rival wins the contract, and {first} closes up shop.", "Whatever was being built gets finished, and gets used.",
            "Nobody gets hurt, but everybody gets suspicious."],
        nouns: ["Sabotage", "Spanner", "Accident"], topics: ["Accidents", "Unfortunate Timing"]
    }
};
const QUEST_JOB_KEYS = Object.keys(QUEST_JOBS);

// Why they need the party (original).
const QUEST_WHY = [
    "They tried it themselves once. They still limp.",
    "The town guard laughed at them.",
    "Their own hired help took the money and ran.",
    "They're being watched and can't be seen doing it.",
    "They are, by their own admission, a coward.",
    "The last adventurers they hired are part of the problem now.",
    "It's personal, and they don't trust themselves to stay calm.",
    "They'd rather not say. They pay well for discretion.",
    "A fortune teller said the party would come, and described them unkindly.",
    "Everyone else in town owes them money, and none of them will do it.",
    "They lost a bet, and doing this was the forfeit. They're outsourcing it.",
    "The party looks desperate enough to say yes. They mean it kindly.",
    "Their spouse thinks they're already handling it.",
    "They're dying, and want it finished before they are.",
    "They're allergic to almost everything that lives out there.",
    "The guild rules forbid them from doing it, but say nothing about hiring someone.",
    "They saw the party win a bar fight and were impressed.",
    "They asked {townsfolk} first, and got laughed out of the room.",
    "They have a bad knee, a worse back, and a busy week.",
    "The party is the only crew in town that isn't banned from the guildhall.",
    "Their {kin} recommended the party, and is going to hear about it if this goes badly.",
    "They need outsiders. Anyone local would talk.",
    "They tried writing to the crown. The crown wrote back \"no.\"",
    "It has to be done by strangers. That's part of the old agreement.",
    "They're too famous to be seen anywhere near it.",
    "The party once returned a lost purse to them, full. They haven't forgotten.",
    "Their luck has been terrible lately, and the party looks lucky.",
    "They promised someone on their deathbed, and they don't break promises."
];

const QUEST_TWISTS = [
    "The quest giver isn't who they claim to be.",
    "A rival adventuring party is already on the way.",
    "The local lord forbids anyone from going there.",
    "Halfway through, the giver sends word: the price has changed.",
    "An old friend of one of the party is mixed up in it.",
    "The map they handed over is wrong, on purpose.",
    "Whatever is waiting there knows the party is coming.",
    "The reward is promised by someone who doesn't have it.",
    "It's the first of three jobs, and the giver didn't mention the other two.",
    "Nothing goes wrong. That's what makes everyone nervous.",
    "There's a witness, and they want a cut.",
    "The place is not where the map says. It moved.",
    "A local guide offers to help for free, and keeps steering them wrong.",
    "The town watch arrests the party for the very thing they were hired to stop.",
    "The job turns out to be easy. The trip home does not.",
    "Someone in town is betting against the party, and has taken steps.",
    "The giver dies before the party returns, and their heir has never heard of the deal.",
    "A curse falls on whoever touches the prize first.",
    "The giver hired a second crew to watch the first.",
    "The job was already done, badly, by someone who still wants the fee.",
    "It's a test. Someone important is watching how the party handles it.",
    "The giver's rival offers the party the same pay to fail.",
    "A child follows the party out of town and refuses to go home.",
    "Every inn on the way has heard of the party, and none of it is good.",
    "There's a second, secret reward for doing it a very particular way.",
    "Someone in the party has been here before, and doesn't remember it.",
    "The place is on holy ground, and a priest wants it left alone.",
    "A tax collector shows up and wants a share of the reward.",
    "The giver is in the middle of a messy divorce, and the job is part of it.",
    "Something at the site recognizes one of the party by name."
];

// Where to start: the first lead. {first} is the giver's first name.
const QUEST_LEADS = [
    "{townsfolk} saw it happen and will talk for the price of a drink.",
    "The last person who went there left a journal with a pawnbroker.",
    "{first} has a key, a sketch, and no idea which door the key opens.",
    "A child in the market sells directions for a copper. They're mostly right.",
    "The temple keeps records of everyone who went there and didn't come back.",
    "There's a song about it. The third verse is the useful one.",
    "{townsfolk} knows the way, but only goes by night.",
    "A torn map hangs in the tavern, framed. The landlord won't sell it, but might lend it.",
    "A one-armed trapper camps by the road there and charges for advice.",
    "The town archive has a plan of the place, filed under the wrong name.",
    "{first}'s {kin} went once and drew a picture. It's very detailed and very upsetting.",
    "A hedge witch reads the party's tea leaves. The leaves draw a decent map.",
    "Fresh cart tracks lead there every third night.",
    "The bell ringer can see the place from the tower and has been keeping notes.",
    "A dog keeps running off in that direction and coming back muddy.",
    "{townsfolk} sells a \"guide\" for 5 sp. Half of it is true.",
    "A carter who hauled supplies there last month remembers too much and wants it off his chest.",
    "The answer is written in the margins of a hymn book at the temple.",
    "Smoke rises from there at dawn. Just follow it.",
    "{first} gives them a password and refuses to say who taught it to them.",
    "The local guide is twelve years old and the best tracker in the valley.",
    "A barmaid there grew up next door to it and knows the back way in.",
    "{first} gives them a letter of introduction to someone who has been dead for a year."
];

// What's there: something the party will find at the place.
const QUEST_FEATURES = [
    "A rotten floor over a deep, dark drop.",
    "A locked gate with the key hanging on the wrong side.",
    "Fresh footprints that stop in the middle of nowhere.",
    "A table set for dinner, with the food still warm.",
    "Warning signs in three languages. The fourth sign was torn down.",
    "Every door is barred from the inside.",
    "A trapped chest that is, honestly, more trap than chest.",
    "Graffiti from the last adventurers: a tally of days, then nothing.",
    "A shrine to a god nobody in the party recognizes.",
    "A pit full of things that rattle when you breathe on them.",
    "Wind chimes that ring when nothing moves.",
    "A ledger listing every visitor, in a hand that isn't human.",
    "Water knee-deep and very cold, hiding the floor.",
    "A collapsed passage with voices on the other side.",
    "A friendly cat that clearly lives there and clearly shouldn't.",
    "Bones arranged neatly by size.",
    "A mural showing the party arriving.",
    "Lanterns that light themselves as the party passes.",
    "An old campsite with a pot of stew still on the fire.",
    "A rope bridge that sways even when nobody is on it.",
    "A mirror that is a door, or a door that is a mirror.",
    "Signs of a fight, and the losers' gear left neatly folded.",
    "A sleeping guard who has been sleeping for a very long time.",
    "A secret door everyone can see, which is suspicious in itself.",
    "A strong smell of cinnamon with no source.",
    "A well that answers questions, badly."
];

// In the way: something between the party and the job.
const QUEST_OBSTACLES = [
    "The bridge on the direct road washed out. The long way adds a day.",
    "A new toll on the road that wasn't there last week, and the collectors are well armed.",
    "A wedding procession blocks the road for half a day and invites the party along.",
    "Fog so thick the party loses the road for hours.",
    "A rockslide closes the pass. Climbing over takes rope, nerve, and an hour.",
    "A rival crew is camped at the only spring on the way.",
    "A quarantine at the next village. Nobody gets through without a doctor's note.",
    "The horses refuse to go any closer.",
    "A storm that lasts three days.",
    "A ferry operator who wants payment in secrets, not coin.",
    "A knight errant who insists on a duel before letting anyone pass.",
    "A flock of sheep, a shepherd who won't hurry, and a very narrow road.",
    "A swarm of biting flies that follows the party for a day.",
    "A sinkhole has swallowed half the road, and it is still growing.",
    "A festival is on, every road is jammed, and every bed is taken.",
    "A pair of lost children who need taking home first, which is the other way.",
    "The guide quits halfway, with the map.",
    "A troupe of actors who insist the party is in their play.",
    "A checkpoint where the guards are searching for someone matching one of the party's descriptions.",
    "The river is in flood, and the ford is gone.",
    "A merchant whose wagon is stuck in the mud and who offers to pay to be pulled out.",
    "Wolves trail the party at a distance and never quite attack."
];

// If it fails: per-job stakes take turns with these.
const QUEST_STAKES = [
    "The town council blames the party, publicly.",
    "{first} hires someone much worse to finish it.",
    "It's harder in a tenday, and it costs twice as much.",
    "Nothing happens at first. Then everything happens at once.",
    "{townsfolk} pays the price for it.",
    "The problem moves on to the next town, with a grudge.",
    "{first} tries it alone.",
    "The party's reputation in town sinks to \"those people.\""
];

const QUEST_DEADLINES = ["Tonight", "By dawn", "Within three days", "Before the full moon", "Within a tenday",
    "Before the festival", "No rush, but the price drops every day", "Yesterday, ideally",
    "Before the next market day", "Before the snow closes the passes", "Before {first}'s {kin} finds out", "Whenever, but sooner pays better",
    "Within {n} days", "Before the bell strikes {n} tomorrow", "Before the tax collector comes", "Before the wedding",
    "Before the river freezes", "By the end of the tenday, or the deal is off", "Before the duke's visit", "As soon as the rain stops"];

const QUEST_TERMS = ["Half up front, half on return", "All on return, no exceptions", "Paid in full up front (suspiciously)",
    "On return, with a meal and a bed thrown in", "On return, in a mix of coins from three kingdoms",
    "A quarter now, the rest on proof", "On return, through a banker who asks a lot of questions", "Paid by a third party the giver won't name",
    "On return, counted out slowly in front of witnesses", "Half now, half when the gossip dies down",
    "On return, in a sack that is mostly copper", "A tenth now as a show of good faith, the rest on return",
    "On return, minus a fee for \"wear on the map\"", "Held by the temple until the job is done"];

const QUEST_BONUSES = ["a favor from the giver's guild", "free rooms at the giver's inn for a month", "a letter of introduction to someone important",
    "first pick of whatever else is found there", "a horse (old, but honest)", "the giver's eternal gratitude, and nothing else",
    "a map to somewhere better", "a standing discount at the giver's shop", "a healing potion apiece", "a seat at the giver's table at the next feast",
    "a secret the giver swears is worth more than gold", "a song written about the party (not a good one)", "the giver's spare {thing}",
    "a small plot of land with a large problem on it", "a name day invitation from someone powerful", "a dog, whether they want it or not",
    "a free pardon for one minor crime, past or future", "an apprentice who follows the party around", "a crate of the giver's best wine",
    "the deed to a boat that may or may not float", "lifetime free shaves at the giver's cousin's barbershop"];

// Part of the reward paid in kind.
const QUEST_GOODS = ["rough gems", "bolts of dyed silk", "casks of good brandy", "trade bars of silver", "salted fish (a lot of salted fish)",
    "the deed to a small orchard", "IOUs from respectable people", "old coins from a fallen kingdom", "spices worth their weight in silver",
    "a cart of fine timber", "ivory chess pieces", "two goats and a promise", "jars of honey", "bundles of fur pelts"];

// Title patterns: w = weight. Tokens: {Short} place, {Noun}/{Topic} job words, {First}, {Item}, {Adj}.
const QUEST_TITLES = [
    { t: "The {Short} Job", w: 3 }, { t: "Trouble at the {Short}", w: 2 }, { t: "The {Noun} at the {Short}", w: 2 },
    { t: "{First}'s {Noun}", w: 2 }, { t: "A Matter of {Topic}", w: 2 }, { t: "The {Item}", w: 4, item: true },
    { t: "The {Adj} {Noun}", w: 2 }, { t: "The {Short} Affair", w: 1 }, { t: "{First} and the {Item}", w: 2, item: true },
    { t: "The {Item} Business", w: 1, item: true }, { t: "The {Noun} for {First}", w: 1 }
];
const QUEST_TITLE_ADJ = ["Quiet", "Crooked", "Long", "Last", "Unlucky", "Midnight", "Muddy", "Polite", "Costly", "Thirteenth",
    "Second", "Rainy", "Bloody", "Awkward", "Small", "Forgotten"];

// Round a reward the way a quest giver would say it.
function questRound(gp) {
    if (gp < 10) return Math.max(0.1, Math.round(gp * 10) / 10);
    if (gp < 100) return Math.round(gp);
    if (gp < 1000) return Math.round(gp / 5) * 5;
    return Math.round(gp / 50) * 50;
}

// Word stems (5 letters) longer than 3 letters, to keep a phrase from saying the same word twice.
function questStems(text) {
    return text.toLowerCase().match(/[a-z]{4,}/g)?.map(w => w.slice(0, 5)) || [];
}
function questRepeats(text) {
    const seen = new Set();
    return questStems(text).some(s => seen.has(s) || !seen.add(s));
}

// A place from the list, or a composed one ("the burned-out mill past the last farm").
// Draws every piece first, so the stream is the same whichever way it goes.
function questPlace() {
    const fixed = randomArray(QUEST_PLACES);
    const site = randomArray(QUEST_SITES);
    const where = randomArray(QUEST_WHERE[randomArray(site.at)]);
    const conds = [0, 1, 2].map(() => randomArray(QUEST_CONDITIONS[site.built ? "built" : "wild"]));
    const composed = rand() < 0.45;
    if (!composed) return { name: fixed[0], short: fixed[1], foes: fixed[2] };
    const cond = conds.find(c => !questRepeats(`${c} ${site.n} ${where}`));
    const name = cond ? `the ${cond} ${site.n} ${where}` : `the ${site.n} ${where}`;
    return { name, short: site.s, foes: site.foes };
}

// Fill a quest line's tokens. ctx: { place, item, person, mark, first }.
function questFill(text, ctx) {
    const own = { place: ctx.place, item: ctx.item, person: ctx.person, mark: ctx.mark, first: ctx.first, n: String(randomInt(2, 9)) };
    return fillTemplate(text.replace(/\{(place|item|person|mark|first|n)\}/g, (m, k) => own[k]))
        .replace(/([.!?]"?\s+)([a-z])/g, (m, end, c) => end + c.toUpperCase());
}

function questCap(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// A title for the quest. Draws a shuffled order of patterns and keeps the first that reads well.
function questTitle(j, ctx) {
    const pool = QUEST_TITLES.flatMap(p => Array(p.w).fill(p)).map(p => ({ p, r: rand() })).sort((a, b) => a.r - b.r).map(o => o.p);
    const words = { Short: ctx.short, Noun: randomArray(j.nouns), Topic: randomArray(j.topics), First: ctx.first,
        Item: ctx.itemShort, Adj: randomArray(QUEST_TITLE_ADJ) };
    for (const p of pool) {
        if (p.item && !ctx.usedItem) continue;
        const title = p.t.replace(/\{(\w+)\}/g, (m, k) => words[k]);
        if (!questRepeats(title)) return title;
    }
    return `The ${ctx.short} Job`;
}

// opts: { level 1–20, size 1–8, job: key or 'random' }.
function rollQuest(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const level = Math.min(20, Math.max(1, Math.floor(opts.level) || 1));
    const size = Math.min(8, Math.max(1, Math.floor(opts.size) || 4));

    const giver = part("giver", () => ({ ...rollNPC(), why: randomArray(QUEST_WHY) }));
    const first = giver.firstName || giver.name.split(" ")[0];
    giver.why = part("why", () => questFill(giver.why, { first }));
    // Always drawn, so a picked job doesn't shift any other part.
    const rolledJob = part("job", () => randomArray(QUEST_JOB_KEYS));
    const job = QUEST_JOBS[opts.job] ? opts.job : rolledJob;
    const j = QUEST_JOBS[job];
    const place = part("place", questPlace);
    const [item, itemShort] = part("item", () => randomArray(QUEST_ITEMS));
    const { person, mark } = part("who", () => ({ person: fillTemplate(randomArray(QUEST_PEOPLE)), mark: randomArray(QUEST_MARKS) }));
    const ctx = { place: place.name, item, person, mark, first };

    const taskLine = part("task", () => randomArray(j.tasks));
    const task = part("task-fill", () => questCap(questFill(taskLine, ctx)));
    const title = part("title", () => questTitle(j, { short: place.short, first, itemShort, usedItem: taskLine.includes("{item}") }));
    const twist = part("twist", () => questFill(randomArray(rand() < 0.35 ? j.twists : QUEST_TWISTS), ctx));
    const lead = part("lead", () => questCap(questFill(randomArray(QUEST_LEADS), ctx)));
    const feature = part("feature", () => randomArray(QUEST_FEATURES));
    const obstacle = part("obstacle", () => rand() < 0.7 ? randomArray(QUEST_OBSTACLES) : null);
    const stakes = part("stakes", () => questCap(questFill(randomArray(rand() < 0.6 ? j.stakes : QUEST_STAKES), ctx)));
    const deadline = part("deadline", () => questFill(randomArray(QUEST_DEADLINES), ctx));

    const reward = part("reward", () => ({
        gp: questRound(QUEST_PAY[level] * size * j.pay * (0.75 + rand() * 0.5)),
        terms: randomArray(QUEST_TERMS),
        bonus: rand() < 0.4 ? fillTemplate(randomArray(QUEST_BONUSES)) : null,
        inKind: rand() < 0.2 ? randomArray(QUEST_GOODS) : null
    }));

    // A fight, if the job has one: the place's best-fitting monster type that has
    // something for this party, then any type at all.
    const foe = part("foe", () => {
        if (rand() >= j.foe) return null;
        const budget = partyBudget([{ count: size, level }]);
        for (const type of [...place.foes, ""]) {
            const list = rollEncounter(budget, j.diff, type);
            if (list.length) return { list, diff: j.diff, xp: encounterXp(list), rating: rateEncounter(encounterXp(list), budget) };
        }
        return null;
    });

    return { seed, level, size, job, title, giver, place: place.name, task, lead, feature, obstacle, twist, stakes, deadline, reward, foe };
}

// The reward's fine print in one line: terms, then goods, then the bonus.
function questRewardText(r) {
    return `${r.terms}.${r.inKind ? ` About a third of it comes as ${r.inKind}.` : ""}${r.bonus ? ` Plus ${r.bonus}.` : ""}`;
}

// The DM Toolbox Encounter tab, opened with this party and these monsters.
function questEncounterLink(q) {
    const p = new URLSearchParams({ tab: "enc", party: `${q.size}x${q.level}` });
    q.foe.list.forEach(e => p.append("m", `${e.m.id}.${e.count}`));
    if (q.foe.diff !== "moderate") p.set("diff", q.foe.diff);
    return "toolbox?" + p.toString();
}

function questFoeText(foe) {
    return foe.list.map(e => `${e.count} × ${e.m.name} (CR ${e.m.cr})`).join(", ");
}

// Plain text for Copy.
function questText(q) {
    const j = QUEST_JOBS[q.job], g = q.giver;
    const lines = [
        `SIDE QUEST: ${q.title.toUpperCase()}`,
        `${j.label} · party of ${q.size}, level ${q.level}`,
        q.task,
        "",
        `Quest giver: ${g.name} (${questCap(g.race)}, ${g.age}, ${g.profession.toLowerCase()}). ${g.trait}. Voice: ${g.voice}.`,
        `"${g.dialogue}"`,
        `Why you: ${g.why}`,
        `Secret: ${g.secret}`,
        "",
        `Where: ${questCap(q.place)}`,
        `What's there: ${q.feature}`,
        `Where to start: ${q.lead}`,
        q.obstacle ? `In the way: ${q.obstacle}` : null,
        `Deadline: ${q.deadline}`,
        `Twist: ${q.twist}`,
        `If it fails: ${q.stakes}`,
        `Reward: ${formatCoins(q.reward.gp)} for the party. ${questRewardText(q.reward)}`
    ].filter(l => l !== null);
    if (q.foe) {
        lines.push(`Foe: ${questFoeText(q.foe)}, ${q.foe.xp.toLocaleString("en-US")} XP (${ENCOUNTER_LEVELS[q.foe.rating] ? ENCOUNTER_LEVELS[q.foe.rating].label : "?"})`);
        lines.push(`Encounter: ${new URL(questEncounterLink(q), location.href).href}`);
    }
    return lines.join("\n");
}
