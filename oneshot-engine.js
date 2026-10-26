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
   The campaign generator (F74, campaign-engine.js) calls this once per chapter, and adds two of its own:
     villain: { name, tries, bands, forms, stand } names the boss, when the boss is a person from a band
       with a people of its own (bandits, a cult, nobles: osNameable). The site tries `bands` first
       (siteChooseBand), and rerolls up to `tries` times to find one. Failing that, `forms` (monster
       types) lets a thinking boss of one of those types take the name (the result's `form`: the villain
       was a fiend all along), and `stand` (monster ids, best first) puts the strongest one that fits the
       level into the last fight as the named villain, beside the boss (`guard`: what the boss was).
     item: [text, short] is the thing everyone wants, in place of a rolled one.
     goal: what the villain is really doing (after their name), in place of a rolled goal.
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
    heroic: { label: 'Heroic', icon: '⚔️', adj: 'heroic', nouns: ['Oath', 'Last Stand', 'Rescue', 'Banner', 'Siege', 'Vigil',
        'Reckoning', 'Crossing', 'Watch', 'Charge', 'Ransom', 'Bell'] },
    horror: { label: 'Horror', icon: '🕯️', adj: 'creeping horror', nouns: ['Hunger', 'Whispers', 'Long Night', 'Rot', 'Silence', 'Harrowing',
        'Drowning', 'Pale Guest', 'Hollowing', 'Wake', 'Lantern', 'Burrowing'] },
    intrigue: { label: 'Intrigue', icon: '🗝️', adj: 'intrigue', nouns: ['Ledger', 'Masks', 'Bargain', 'Debt', 'Cipher', 'Second Seal',
        'Poisoned Cup', 'Ransom Note', 'Inheritance', 'Wager', 'Forgery', 'Masquerade'] },
    comedic: { label: 'Comedic', icon: '🎭', adj: 'comedic', nouns: ['Fiasco', 'Kerfuffle', 'Misunderstanding', 'Bad Idea', 'Wild Goose', 'Mix-Up',
        'Hullabaloo', 'Debacle', 'Pickle', 'Caper', 'Farce', 'Rumpus'] }
};
const OS_TONE_KEYS = Object.keys(OS_TONES);

// Where the road runs on the way to each kind of site, and the town it leaves from.
const OS_TERRAIN = {
    crypt: ['road', 'forest', 'moor'], mine: ['hills', 'mountains'], tower: ['forest', 'moor', 'hills'],
    temple: ['swamp', 'jungle', 'coast'], fort: ['hills', 'forest', 'road'], lair: ['hills', 'mountains', 'forest', 'swamp'],
    keep: ['moor', 'hills', 'plains'], sewer: ['road', 'plains'], seacave: ['coast'], shipwreck: ['coast'], lighthouse: ['coast'],
    manor: ['forest', 'moor', 'plains', 'hills'], barrow: ['moor', 'hills', 'plains']
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
        "stole {item} to prove they're the rightful heir to {site}",
        "wants to bury the truth about what {town} did at {site}, and everyone who still remembers it",
        "means to sell {item} to a buyer from across the border, and {site} is where the trade happens",
        "has turned {site} into a smugglers' hold, and {town} is the next market",
        "took {item} as payment for a debt nobody in {town} will admit to owing",
        "is keeping the people {town} stopped looking for locked up in {site}",
        "needs {item} to prove to a dangerous backer that the plan in {site} can still work"
    ],
    beast: [
        "was driven from its old hunting ground and has made {site} its den, too close to {town}",
        "is guarding a clutch of young in {site}, and anything that comes near is food",
        "dragged a traveler's pack into {site}, and {item} was in it",
        "has a taste for {town}'s livestock, and lately for more than livestock",
        "was wounded by hunters from {town} and has been taking it out on the road ever since",
        "has grown far bigger than its kind should, and something in {site} is the reason",
        "follows the scent of {item}, which smells to it like its own lost young",
        "was somebody's pet once, kept in {site} by an owner long gone, and it is very hungry now",
        "has been driven half mad by something leaking out of the deep places of {site}",
        "has claimed {site} as its winter den, and the whole road to {town} as its larder"
    ],
    mindless: [
        "woke when grave robbers broke the seals of {site}",
        "still keeps its last order: let no one take {item} from {site}",
        "spills out of {site} on nights when the old wards fail, and the wards are failing",
        "rises because someone in {town} has been leaving the wrong kind of offerings at {site}",
        "was bound to {item}; when the thieves carried it into {site}, it followed",
        "answers a call from deep inside {site} that only it can hear",
        "was raised to guard {site}, and nobody living remembers the word that stops it",
        "walks out of {site} every night toward {town}, as if it still lives there",
        "is what's left of the last party that went looking for {item}",
        "keeps building something in the depths of {site}, out of whatever it catches"
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
        ["{Patron} once served alongside {villain}, and left them behind to die.", true],
        ["The reward is gone. {Patron} spent it on the last party, and that party never came back.", false],
        ["{Villain} is being forced: someone in {town} is holding a hostage of their own.", true],
        ["{Item} chooses who carries it, and it has already chosen one of the party.", false],
        ["The soldiers {town} sent last month didn't die at {site}. They joined {villain}.", true]
    ],
    horror: [
        ["{Patron} has already been replaced by something wearing their face.", false],
        ["Everyone who has held {item} hears it whisper. After this job, that includes the party.", false],
        ["The people of {town} knew all along. They made a bargain to keep {site} fed, and the party is this year's offering.", false],
        ["{Villain} isn't the first victim, just the latest. Whatever did this to them is still in {site}.", false],
        ["The missing are still alive in {site}, and they don't want to be rescued.", false],
        ["Someone in the party's camp has been sleepwalking toward {site} every night.", false],
        ["Nobody in {town} remembers {Patron}. The grave with that name on it is nine years old.", false],
        ["{Site} is not where the bodies go. It's where they come back from.", false],
        ["The party has been to {site} before. None of them remember it, but {site} remembers them.", false],
        ["{Item} isn't a thing at all. It's the last piece of someone still trying to come back together.", false]
    ],
    intrigue: [
        ["{Patron} hired {villain} in the first place, and wants the party to clean up the evidence.", true],
        ["{Town}'s reeve sells {villain} supplies every week, and keeps the receipts.", true],
        ["{Item} is a forged deed. Whoever holds it at the end owns half of {town}.", false],
        ["{Villain} is an informant for the crown, and someone powerful wants them kept alive.", true],
        ["Two of {town}'s leading families are paying {villain} to hurt the other one.", true],
        ["The attacks on {town} were staged to drive down the price of its land. Someone is buying it.", false],
        ["{Patron} is the true heir to {item}, and is using the party to steal it back lawfully.", false],
        ["{Villain} holds a signed confession from {Patron}, and means to read it aloud if cornered.", true],
        ["The whole job is a test. A spymaster is watching how the party handles it, and taking notes.", false],
        ["Half the clues on the road were planted, and whoever planted them wants to be caught.", false]
    ],
    comedic: [
        ["{Villain} thinks they're the hero of this story, and has a much better song about it.", true],
        ["Three different buyers want {item}, and all three arrive at {site} at the same time.", false],
        ["{Patron} posted the same job with four other parties, and they're all on the road too.", false],
        ["The fearsome lair at {site} is mostly a failing cheese business.", true],
        ["{Item} is cursed to make whoever carries it unbearably honest.", false],
        ["{Villain} owes {Patron} money, and both of them would rather the party didn't find out.", true],
        ["{Villain} retired years ago. Somebody else has been using the name, badly.", true],
        ["{Item} is a cheese. A very old, very valuable, very angry cheese.", false],
        ["{Site} is technically a protected monument, and an inspector from the capital is on the way.", false],
        ["{Patron} is wildly overpaying, having misread the decimal, and will notice at the worst moment.", false]
    ]
};

const OS_PATRONS = [
    'the village reeve', 'a worried innkeeper', 'a young temple acolyte', 'a merchant with a missing caravan',
    'a grieving parent', 'a retired adventurer with a bad knee', "the local lord's steward", 'a guild factor',
    'the town healer', 'a nervous mapmaker', 'a widowed farmer', 'a traveling scholar', 'the captain of the watch',
    'a priest of the harvest', "a noble's disgraced cousin", 'the miller, who hears everything',
    'a caravan master', 'the ferry-keeper', 'a half-blind archivist', 'a smuggler trying to go straight', 'a nervous young noble',
    'the prioress of a hill shrine', 'a bounty clerk from the capital', 'the gravedigger', 'the owner of a traveling circus',
    "the family's formidable matriarch", 'an off-duty soldier', 'the brewer with the best ale in town', 'a fortune-teller who saw this coming',
    'a beekeeper with a grudge', 'a shepherd who lost half the flock', "a wizard's put-upon apprentice"
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
    "Their {kin} went to {site} and hasn't come back.",
    "{Town}'s fighters are all away at the border, and won't be back in time.",
    "The last person who went asking questions about {site} was found in the well.",
    "The temple forbids anyone born in {town} to set foot in {site}, and they were born here.",
    "They heard the party was cheap. They heard wrong, but they're desperate.",
    "If the lord's soldiers find {item} first, nobody in {town} will ever see it again.",
    "They can't be seen to be involved. If anyone asks, the party found this job on their own.",
    "They're too old, too slow, and too honest to pretend otherwise.",
    "Their {kin} is one of the people {villain} took.",
    "A fortune-teller described the party, down to their boots, a week before they arrived.",
    "Everyone else in {town} knows something about {site} that makes them say no."
];

// The clock. {n} days; then the line after "or"; 'folk' when only a person would keep that deadline.
const OS_CLOCKS = [
    ["before the new moon, {n} days from now", "the moon goes dark and {villain} finishes what {vthey} started"],
    ["before the harvest fair opens in {n} days", "the fair brings the whole valley to {town}, and {villain} with it"],
    ["within {n} days", "{villain} moves deeper into {site} and the way is sealed behind {vthem}"],
    ["before the lord's tax collector arrives in {n} days", "{town} can't pay, and the lord's soldiers take payment their own way"],
    ["in {n} days, before the river rises", "the floods cut the road to {site} until spring"],
    ["by the next market day, {n} days off", "the buyer for {item} arrives and it's gone for good"],
    ["before the wedding in {town}, {n} days from now", "{villain} turns the wedding into a funeral"],
    ["before the pilgrims reach {site} in {n} days", "the pilgrims walk straight into {villain}'s hands"],
    ["in {n} days, when the lord's hunt rides past {site}", "the hunt rides in, and the lord doesn't ride out"],
    ["before {Patron}'s money runs out in {n} days", "nobody is left to pay for anything, and {town} is on its own"],
    ["before the eclipse, {n} days from now", "the sun goes dark over {site}, and {villain} gets the one hour {vthey} needed"],
    ["within {n} days, while the trail is still warm", "the trail goes cold, and {item} with it"],
    ["before the caravan leaves {town} in {n} days", "the caravan leaves with {item} hidden in it, and nobody knows which wagon"],
    ["in {n} days, when the old wards on {site} give out", "the wards fail, and whatever {villain} has been holding back walks out"],
    ["before the hostage exchange in {n} days", "the exchange goes ahead on {villain}'s terms", 'folk'],
    ["before the healer's stores run out in {n} days", "the sickness spreading from {site} reaches every house in {town}"],
    ["before the next full moon, {n} days off", "the moon rises full over {site}, and {villain} is ready"],
    ["before the coronation in the capital, {n} days away", "{item} is presented at court, and {villain} with it", 'folk']
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
    ['Investigation', "A ledger at the trading post shows someone buying a month of food for twenty, to be left at {site}."],
    ['Investigation', "A burned letter in the grate of an empty house still shows half a word: the name of {site}."],
    ['Persuasion', "The ferryman took three strangers toward {site} last week, and they paid in very old coin."],
    ['Insight', "The innkeeper's story about the missing changes every time it's told. Only the first version mentions {site}."],
    ['Perception', "Someone has been leaving food at a crossroads shrine, and the footprints go off toward {site}."],
    ['Survival', "Wagon ruts, too deep for an empty cart, leave the road toward {site} and vanish at a stream."],
    ['History', "An old song from {town} names {site}, and a verse nobody sings anymore says what lives there."],
    ['Arcana', "A dead hedge-witch's notes describe a working that could only be done at {site}."],
    ['Medicine', "The sick in {town} all drank from one well, and that well is fed from the direction of {site}."],
    ['Religion', "The temple's book of the dead lists three burials this month. All three graves are empty."],
    ['Animal Handling', "A dog that came back alone from {site} will lead the way, if someone earns its trust."],
    ['Deception', "Posing as buyers gets a fence in {town} talking: someone at {site} is selling, and wants {item} gone soon."],
    ['Investigation', "A tally kept by {townsfolk} counts every stranger who passed through, and the last of them all asked the way to {site}."]
];

// One more thing to make Act 2 harder, by tone.
const OS_COMPLICATIONS = {
    heroic: ["A family on the road begs the party to escort them to safety, the opposite way.",
        "A bridge is out, and the long way round costs a day.",
        "A wounded soldier staggers out of the trees with a warning about {site}.",
        "Refugees from the hills say {villain} has more followers than anyone thought.",
        "A storm hits on the road, and the only shelter is a shepherd's hut that something else got to first.",
        "A patrol out of {town} mistakes the party for the raiders who've been burning farms, and won't listen.",
        "A merchant's wagon has overturned in the ford, and the merchant's children are still inside.",
        "A messenger finds the party with a second plea for help, from the other direction."],
    horror: ["The party passes the same dead tree three times before they notice.",
        "Every farm on the road is empty, with supper still on the table.",
        "A child walks beside the party for a mile, then asks which one of them is staying.",
        "Their own footprints are waiting for them on the trail ahead.",
        "Every signpost on the road points to {site}, even the ones pointing back the way they came.",
        "A traveler shares the party's fire, and knows all of their names without being told.",
        "At dusk, {Patron}'s voice calls to the party from the trees. {Patron} is miles away.",
        "A well by the road is full to the brim with warm water, and something down in it is breathing."],
    intrigue: ["A courier is carrying a sealed letter to {villain}; the seal is {town}'s.",
        "A second party is tailing them, and claims to work for {Patron}.",
        "The innkeeper on the road offers them twice the pay to turn back.",
        "A noble's coach is stopped on the road, and the noble very much wants not to be seen.",
        "A tax collector stops the party and wants to know exactly what they're carrying, and for whom.",
        "Someone has paid every inn on the road to turn the party away.",
        "A rival of {Patron}'s catches up on the road with a better offer, and proof that {Patron} lied.",
        "A warrant with the party's names on it has reached the next town ahead of them."],
    comedic: ["A goat has decided it belongs to the party, and will not be talked out of it.",
        "A toll-keeper on the road insists on a riddle, and doesn't know the answer either.",
        "A rival party is going the same way, and keeps narrating its own heroics.",
        "A bard is following the party to write the ballad, and keeps asking them to redo things.",
        "A wandering preacher has decided the party is a sign of the end times, and follows them shouting about it.",
        "The party's map was drawn by someone with strong opinions and no sense of direction.",
        "A wedding procession blocks the road, and won't let anyone pass who doesn't dance.",
        "A very small dog has stolen something important, and it is very, very fast."]
};

// Read-aloud text. Act 1 opens in the tavern: {tavern}, {town}, {Patron}, {patronRole}, {their} (the patron's).
const OS_OPENERS = {
    heroic: [
        "Rain drums on the roof of {tavern}. The common room of {town} is full, but nobody is singing tonight. When the door bangs open, every head turns: {Patron}, {patronRole}, soaked to the skin, looks straight past the locals and at you. \"You carry blades,\" {Patron} says. \"Good. We need them.\"",
        "Smoke from the south has hung over {town} for three days, and {tavern} is full of people who came north to get away from it. {Patron}, {patronRole}, pushes through the crowd with a map already unrolled. \"Everyone here has a reason they can't go,\" {Patron} says. \"I'm hoping you don't.\"",
        "The bard in {tavern} stops mid-song when the shutters rattle. Outside, the bell of {town} rings three times and then stops. {Patron}, {patronRole}, sets a heavy purse on your table before you can ask. \"That's for listening,\" {Patron} says. \"The rest is for going.\"",
        "It's market day in {town}, and {tavern} should be loud. Instead the locals talk in low voices and keep glancing at the door. {Patron}, {patronRole}, catches your eye from the bar and raises a cup. \"You look like people who finish things,\" {Patron} says. \"I have something that needs finishing.\"",
        "A wounded rider was carried into {tavern} an hour ago, and the room still smells of blood and rain. {Patron}, {patronRole}, wipes {their} hands and sits down across from you. \"That rider was the third,\" {Patron} says. \"I'd like you to be the last.\""
    ],
    horror: [
        "The fire in {tavern} burns low, and nobody feeds it. {Town} has gone quiet in a way you can feel in your teeth. In the corner, {Patron}, {patronRole}, hasn't touched {their} drink in an hour. When you sit, {Patron} leans close and whispers, \"You're not from here. Good. Then it hasn't noticed you yet.\"",
        "Every window in {tavern} has a candle in it, though nobody will say why. The talk stops whenever the wind changes. {Patron}, {patronRole}, sits with {their} back to the wall and a knife on the table. \"Don't look at the window,\" {Patron} says quietly. \"Look at me. I'll explain.\"",
        "The keeper of {tavern} sets an extra place at every table, and nobody sits in it. Above the bar, someone has scratched out the faces in an old painting of {town}. {Patron}, {patronRole}, pulls up the empty chair. \"It's all right,\" {Patron} says. \"It isn't coming tonight. It came last night.\"",
        "Half the regulars of {tavern} are missing, and the other half are pretending not to notice. A dog howls somewhere in {town} and nobody looks up. {Patron}, {patronRole}, slides you a list of names. \"These are the ones who went,\" {Patron} says. \"Count them. Then count again.\"",
        "Rain, a dead fire, and a room full of people who won't go home. In {tavern}, the only sound is the clock. {Patron}, {patronRole}, flinches when it strikes, then leans in. \"It's worse after dark,\" {Patron} says. \"So we haven't got long.\""
    ],
    intrigue: [
        "{Tavern} is busy enough that nobody hears anything twice. A folded note arrives with your ale: a time, a table, and no name. At the back, {Patron}, {patronRole}, waits with two cups already poured. \"Before I say anything,\" {Patron} says, \"I need to know who else you work for.\"",
        "A servant in plain livery finds you in {tavern} and won't leave until you follow. Upstairs, in a room that costs more than the whole common room, {Patron}, {patronRole}, waits behind a screen. \"You were never here,\" {Patron} says. \"Now. About the job.\"",
        "The card game at the back of {tavern} has one empty seat, and the dealer has been saving it for you. {Patron}, {patronRole}, deals you in without asking. \"Play badly,\" {Patron} murmurs. \"Two of the people at this table are listening.\"",
        "All of {town} is talking about the same scandal tonight, and every version is different. In a booth at {tavern}, {Patron}, {patronRole}, waits with a sealed letter. \"Everything you've heard is wrong,\" {Patron} says, \"and I can prove it, if you'll help me.\"",
        "Someone paid for your rooms at {tavern} before you arrived, and the keeper won't say who. Then {Patron}, {patronRole}, takes the next stool and orders for you. \"Consider it a deposit,\" {Patron} says. \"I'd like to discuss the balance.\""
    ],
    comedic: [
        "Something in {tavern} is on fire, and the regulars are betting on how long before anyone puts it out. {Patron}, {patronRole}, puts it out with {their} hat, sits down at your table uninvited, and says, \"Right. You look like trouble, and I need some trouble going in the other direction.\"",
        "{Tavern} is hosting a pie-eating contest, and it has gone badly wrong. In the middle of the wreckage, {Patron}, {patronRole}, spots you and climbs over a table. \"Thank the gods, actual adventurers,\" {Patron} says. \"Please tell me one of you can count.\"",
        "A goat is standing behind the bar of {tavern}, and nobody in {town} seems to find this unusual. {Patron}, {patronRole}, waves you over with a dripping mug. \"Ignore the goat,\" {Patron} says. \"The goat is not the problem. Well. The goat is a small part of the problem.\"",
        "Every regular in {tavern} is wearing a false moustache tonight, and nobody will explain why. {Patron}, {patronRole}, peels one off and sits down. \"Don't ask about the moustaches,\" {Patron} says. \"Ask about the job. The job is much worse.\"",
        "The keeper of {tavern} is chasing a chicken around the common room, and losing. {Patron}, {patronRole}, catches it, hands it over, and drops into the seat beside you. \"That,\" {Patron} says, \"is the second-strangest thing to happen in {town} this week.\""
    ]
};
// Arriving at the site, by kind; then a line by tone.
const OS_ARRIVE = {
    crypt: ["The path ends at a low hill crowned with leaning stones. Steps cut into its side lead down to a door carved with names nobody has read in a long time.",
        "A gate of black iron stands in a wall that guards nothing but long grass. Beyond it, a single tomb leans over a stair going down, and the stair has been swept clean.",
        "The burial mound is bigger up close, ringed by a ditch of still water. A stone door is set into its side, and someone has tied fresh flowers to the handle."],
    mine: ["The old mine cuts into the hillside like a wound. Rusted rails run into the dark, and the air that comes out of it is warm and smells of wet stone.",
        "Spoil heaps the size of houses lead up to the mine's mouth. A bell hangs over the entrance on a rotten frame, and its rope has been cut.",
        "Black timbers frame the mine's entrance, scratched with tally marks. A loaded cart sits at the top of the rails, waiting, as if the crew just stepped away."],
    tower: ["The tower stands alone, taller than it should be, its top lost in low cloud. There are no windows below the third floor, and the door has no handle on the outside.",
        "Ivy wraps the tower so thickly it hides the stone. Halfway up, a single window glows, though nobody has lived here in a lifetime.",
        "Broken glass crunches underfoot all around the tower's base. Long ago something blew out every window at once, and the scorch marks still point outward."],
    temple: ["Half the temple has sunk into the mire. Its steps run down into black water, and its bronze doors stand open a hand's width, as if something pushed them from inside.",
        "Vines have dragged the temple's pillars half out of the ground, and the carved faces on them have been chiseled away. Incense drifts out of the open doorway, fresh.",
        "The temple sits on an island of rock, reached by a causeway of old flagstones that sink a little under every step."],
    fort: ["The fort is timber and earth, patched with stolen planks. Smoke rises from inside the wall, and somebody has hung a warning on the gate that you can read from here.",
        "Sharpened stakes line the fort's ditch, and the bridge over it has been drawn up. A banner nobody recognizes hangs from the gatehouse.",
        "Half of the old fort's wall has been rebuilt with fresh timber, and the other half left falling down. Voices drift over it, arguing about whose turn it is."],
    lair: ["The cave mouth is ringed with bones, picked clean and stacked with care. Something big has worn the rock smooth going in and out.",
        "The ground around the cave is torn up in long furrows, and every tree nearby has been stripped of bark at shoulder height. Not your shoulder. Something's much higher one.",
        "A warm wind breathes out of the cave mouth, then in, then out, slow and steady. It smells of old meat and something sharper."],
    keep: ["The keep's outer wall has fallen, but the tower still stands. Crows sit along the broken battlements, and not one of them makes a sound.",
        "The keep sits on a rise above a dead village, its drawbridge down and its gate wide open, as if it's expecting someone.",
        "Moss climbs the keep's walls as high as the arrow slits. Above them the stone is clean, as if something keeps it scrubbed."],
    sewer: ["The grate lifts out more easily than it should, as if someone oils it. The smell that comes up out of the dark makes everyone take a step back.",
        "Under the bridge, the river runs past a brick tunnel mouth. Its bars have been cut through and bent neatly back, and a lantern hangs just inside.",
        "Behind the tannery, a cellar wall has been knocked through into the old drains. Someone has chalked an arrow on the bricks, pointing down."],
    seacave: ["At low tide the cave mouth shows in the cliff, black and dripping. A boat is drawn up on the shingle inside, and its oars are still wet.",
        "Steps cut into the cliff lead down from a ruined chapel, half hidden by brambles. The sea booms somewhere below, inside the rock.",
        "Gulls wheel over the cliff, but none of them land near the cave. Barrel staves and rope ends wash about in the surf by its mouth."],
    shipwreck: ["The wreck lies on its side on the rocks, masts trailing in the surf. Green weed hangs from every rail, and the hatch to below stands open.",
        "At low tide you can walk out to the wreck across the wet sand. Its figurehead, a woman with her hands over her eyes, watches you come.",
        "The ship sits upright in the bay, run aground long ago and never floated off. A thin trail of smoke rises from its stern cabin."],
    lighthouse: ["The causeway to the lighthouse is only just above the water, and the tide is turning. The great lamp at the top is dark.",
        "The lighthouse stands on its rock against a grey sky, its keeper's cottage huddled at its foot. Every window is shuttered but one.",
        "A boat that isn't the keeper's is tied up at the lighthouse jetty. Up at the top, the lamp is lit, though it is broad day."],
    manor: ["The drive is lined with dead elms, and the house at the end of it has every curtain drawn. The front door stands open, just a little.",
        "The manor's gardens have run wild, but someone has cut a path through the weeds to the front step. A light moves behind an upstairs window.",
        "Ivy has swallowed the east wing of the house. The rest is untouched, as if the family stepped out this morning. A clock inside is striking."],
    barrow: ["The mound rises out of the heather, bigger than a barn and green on top. Standing stones flank a dark passage into its side.",
        "Someone has dug a hole in the top of the barrow, and turf lies in heaps around it. The rope they left is still tied to a stake.",
        "Crows sit on the standing stones around the barrow, and not one of them takes off as you come near. The stone door is rolled aside."]
};
// For a site kind with no lines of its own.
const OS_ARRIVE_ANY = ["The way in is just where the stories said it would be, and it looks as if nobody has used it in years. Nobody but someone, very recently."];
const OS_ARRIVE_TONE = {
    heroic: ["Whatever is inside knows you're coming. Let it.",
        "Somewhere inside, someone is still alive. You can hear them.",
        "Over the entrance, the old builders carved a warning. Under it, someone braver carved a reply.",
        "{Town} is behind you. Whatever is in here doesn't get to go there.",
        "The light is going. If you're doing this, it has to be now.",
        "Someone has left a sword driven into the ground by the way in, as a marker. Whoever left it never came back for it.",
        "The tracks of the last people who came here go in, and stop. Yours will not.",
        "A crow lands on the stone above the way in, looks at you, and leaves. It seems to have decided something."],
    horror: ["The wind stops when you reach it, as if the whole hill is holding its breath.",
        "Every bird in the trees nearby is facing the entrance, and none of them move.",
        "Your breath fogs, though the day is warm.",
        "Scratched into the stone at a child's height: GO HOME.",
        "Something inside laughs once, softly, and then is quiet.",
        "The door is open. You are fairly sure it was shut a moment ago.",
        "Bones are piled neatly by the entrance, sorted by size. The smallest pile is the tallest.",
        "You catch yourself whispering, and you can't say why. Nobody else here is."],
    intrigue: ["Someone has been here recently: the ground is trampled, and there are cart tracks that weren't in any of the stories.",
        "A broken wax seal lies in the dirt by the entrance, still soft. Someone wanted the crest on it found.",
        "Someone has left a lantern burning just inside, as if they mean to come back for it.",
        "A neat camp nearby is deserted, with a ledger left open on a crate and half its pages torn out.",
        "Two sets of tracks lead in. Only one leads out, and it was in a hurry.",
        "A fine horse is tethered nearby, saddled and well fed. Its rider is nowhere in sight, and its brand belongs to {town}.",
        "Fresh chalk marks by the entrance count something in fives. The count is high, and it isn't finished.",
        "The lock on the way in has been opened with a key, not forced. Whoever came before you was expected."],
    comedic: ["A hand-painted sign by the entrance reads KEEP OUT, and underneath, smaller, THIS MEANS YOU, and underneath that, smaller still, PLEASE.",
        "Someone has nailed a price list by the entrance. Admission is two silver. Leaving is extra.",
        "Painted over the entrance in big red letters: NO ADVENTURERS. It has been painted over once, and repainted, bigger.",
        "There's a doormat at the entrance. It says WELCOME, and under that, in smaller letters, NOT YOU.",
        "A sign at the entrance says BACK IN TEN MINUTES. It is very, very old.",
        "Somebody has left a basket of muffins on the doorstep, with a note: FOR THE HEROES (POISONED). The word POISONED has been crossed out.",
        "A bored guard is asleep on a stool by the entrance, holding a sign that says WIDE AWAKE.",
        "A bell-pull hangs by the way in, labeled RING FOR SERVICE. Somewhere deep inside, very faintly, something rings."]
};
// Facing the boss: {Villain}, {item}, {Patron}, {town}. A person (by tone), a beast, or a thing that doesn't talk.
const OS_BOSS_READ = {
    heroic: ["{Villain} waits at the far end of the chamber, {item} within reach. \"You came all this way,\" they say. \"Then let's not waste it.\"",
        "{Villain} doesn't run. {Item} gleams in the dark behind them as they step forward. \"I hoped it would be someone worth it,\" they say.",
        "Torchlight finds {villain} on a dais of broken stone, with everyone still loyal at their back. \"Turn around now,\" they say, \"and I'll let {town} keep its walls.\"",
        "{Villain} is already wounded, and already smiling. \"You're too late to stop it,\" they say. \"But you're just in time to watch.\"",
        "{Villain} sets down {item} and draws steel. \"No speeches,\" they say. \"You've earned better than that.\"",
        "{Villain} is waiting with every door barred behind them, and nowhere left to run. \"Good,\" they say. \"Neither do you.\""],
    horror: ["At first you think the chamber is empty. Then {villain} moves, and you understand you've been looking at it the whole time.",
        "{Villain} kneels with their back to you, talking to someone you can't see. They stop mid-word, and whatever they were talking to turns around first.",
        "The chamber is full of candles, every one of them lit. {Villain} sits among them and says your names, one by one, in the right order.",
        "You find {villain} by the singing. It's a lullaby, and the voice is wrong, and it comes closer whenever you stop moving.",
        "{Villain} is smiling at you from the far side of the chamber. Then {villain} is smiling at you from much closer, and you never saw them move.",
        "The chamber is full of people standing very still, all of them facing the wall. When you come in, {villain} turns around. Then all of them do."],
    intrigue: ["{Villain} doesn't reach for a weapon. They pour two cups and slide one toward you. \"Before this gets ugly, let me tell you who really sent you.\"",
        "{Villain} waits with a ledger open on the table. \"Every person who sent you is in here,\" they say. \"Shall we read it together?\"",
        "{Villain} applauds as you come in. \"Well done. Truly. Now, my offer is double whatever {Patron} is paying.\"",
        "{Villain} holds {item} in one hand and a candle under it in the other. \"Let's talk about what you're willing to lose,\" they say.",
        "{Villain} is reading a letter, and finishes it before looking up. \"From {Patron},\" they say. \"It mentions you. Would you like to hear what it says?\"",
        "{Villain} is not alone. Two well-dressed guests stand at their side, and both of them flinch when they see you. \"Ah,\" {villain} says. \"Witnesses.\""],
    comedic: ["{Villain} turns, gasps, and drops a plate of something. \"You're early! Nobody is ever early. Give me one moment, I had a whole speech.\"",
        "{Villain} is halfway into a very impressive cape, and gets stuck. \"Don't look! Turn around! This is not how this was supposed to go!\"",
        "{Villain} unrolls a scroll. \"Before we fight, there are a few terms and conditions,\" they say, and the scroll keeps unrolling.",
        "{Villain} has clearly rehearsed this moment in a mirror, and forgets every word. \"Ah. Yes. You. Tremble!\" A pause. \"Was that convincing?\"",
        "{Villain} is in the middle of a bath. Everyone looks at everyone. \"This,\" {villain} says with great dignity, \"changes nothing.\"",
        "{Villain} pulls a lever with a flourish. Nothing happens. They pull it again. \"It worked yesterday,\" they say, a little hurt."]
};
const OS_BOSS_READ_BEAST = ["Something huge shifts in the dark ahead. Then {villain} rises, and the chamber is suddenly much smaller than it looked.",
    "The bones underfoot get bigger the deeper you go. Then the pile at the back of the chamber breathes, and {villain} lifts its head.",
    "{Villain} is feeding when you come in. It stops, and looks up, and you understand you are the next course.",
    "A sound fills the chamber, too low to hear, felt in your chest. Then {villain} steps out of the dark, and the sound was its growl.",
    "Eyes catch your light from the far end of the chamber, more of them than one animal should have. Then {villain} comes forward, and you count them properly.",
    "{Villain} is asleep, curled around {item} as if it were an egg. It wakes the moment you breathe."];
const OS_BOSS_READ_MINDLESS = ["The chamber is cold and perfectly still. Then {villain} turns toward you all at once, without a sound, and comes.",
    "{Villain} stands where it has always stood, facing the door. It has waited a very long time for someone to open it.",
    "Dust sifts from the ceiling as {villain} moves. Whatever drives it doesn't hesitate, doesn't speak, and doesn't stop.",
    "Something in the dark is making the same small motion, over and over. When the light reaches {villain}, it stops, and turns.",
    "{Villain} stands among the remains of everyone who came before you, and turns to add you to them.",
    "The air goes thin and cold. {Villain} comes out of the wall as if the wall were water, and does not slow down."];

// How it ends: {Villain}, {item}, {town}, {Patron}, {site}.
const OS_WIN = {
    heroic: ["{Town} rings its bell for the first time in weeks. {Patron} pays in full, and the party drinks free for a month.",
        "{Patron} weeps openly, then pays twice over. A child from {town} insists on carrying the party's packs to the edge of town.",
        "The people of {town} who went missing come home, and the party's names go into the temple's book of thanks.",
        "{Town}'s lord sends thanks, a purse, and an invitation the party should think about before accepting.",
        "The road to {site} is safe again. By next season travelers tell the story wrong, and the party sounds even braver in it.",
        "{Patron} pays, and the captain of {town}'s guard offers the party a place at the head of the next muster, should they want it.",
        "{Item} goes on display in {town}'s temple, with a small plaque naming the party. Someone has already spelled one name wrong.",
        "The party rides out of {town} to cheering. Halfway down the road they realize half the town has followed them to see them off properly."],
    horror: ["The party gets out, and the dawn is real. Whatever was in {site} is quiet now. Nobody in {town} asks how.",
        "The party burns what's left at {site}, and the smoke goes straight up. {Town} sleeps through the night for the first time in a month.",
        "{Patron} pays, but won't meet anyone's eyes. The candles stay in the windows of {town} anyway, just in case.",
        "It's over, and the party knows it's over. But one of them still dreams of {site}, and in the dream the door is open.",
        "The dead are buried properly at last. The priest of {town} asks the party not to say what they saw, and they agree.",
        "{Patron} pays twice what was promised, and leaves {town} the next morning, for good, without saying goodbye.",
        "{Site} is sealed with iron and salt. The party is paid in full, and asked, politely, never to come back.",
        "The children of {town} play outside again. One of them hums a tune the party last heard in {site}, and stops when they ask about it."],
    intrigue: ["{Patron} pays, and asks the party to forget names. Somebody in {town} is going to lose a great deal of money over this.",
        "{Patron} pays, then slips the party a second, smaller purse for forgetting who else was involved.",
        "The truth comes out in {town}, or the right parts of it. Two families stop speaking, and one stops trading.",
        "{Item} goes back where it belongs, officially. Unofficially, three people now owe the party a favor, and know it.",
        "The papers found at {site} end up in the party's hands. What they do with them is the next adventure.",
        "{Patron} pays, and the party's names are quietly struck from a list they never knew they were on.",
        "By the end of the week {town} has a new reeve, a new tax, and a new rumor about the party, all of them connected.",
        "The party is paid in full, in coin from three different purses. Nobody explains why, and the party is smart enough not to ask."],
    comedic: ["{Town} throws a party, mostly for itself. {Patron} pays in full, and in a slightly larger amount of cheese than coin.",
        "{Town} names a pie after the party. It's not a very good pie, but it's the thought that counts.",
        "{Patron} pays in full, in coins mostly, with a few buttons mixed in. Nobody mentions the buttons.",
        "A statue of the party goes up in {town}'s square. It looks like none of them, and it's slightly too short.",
        "{Patron} throws a feast, makes a long speech, and gets every one of the party's names wrong.",
        "{Patron} pays, then remembers the bonus, then remembers the bonus was a goat.",
        "{Town} holds a parade. The party is in it, at the back, behind the goat.",
        "{Item} is returned to its rightful owner, who it turns out did not want it back."]
};
const OS_FAIL = {
    heroic: ["{Villain} gets what {vthey} came for. {Town} survives, but now it has to pay, and the party knows where to find {vthem} next time.",
        "{Town} pulls back behind its walls. The party is still welcome there, but nobody buys them a drink anymore.",
        "{Patron} hires someone else, someone worse, and the party hears what that cost {town}.",
        "{Item} is lost. Without it, {town} has to find another way, and the party is the only help on offer.",
        "The party limps home. {Villain} lets them go, which is somehow worse.",
        "{Site} stays as it is. The party will have to live with that, and so will {town}, for as long as it can.",
        "The bell of {town} rings the alarm at dawn. By noon, half the town is packing.",
        "{Patron} doesn't blame the party. {Patron} doesn't need to: the whole of {town} does it instead."],
    horror: ["The party gets away, but not all of them come back the same. {Site} is quiet for a while. Then it isn't.",
        "The party gets out, but the way into {site} is open now, and something follows them home at a distance.",
        "A month later {town} is empty. Every house is locked from the inside.",
        "{Patron} stops answering letters. Then letters start coming back in {Patron}'s hand, all of them saying the same thing: come back.",
        "One of the party wakes every night at the same hour, facing toward {site}.",
        "Nobody in {town} speaks of {site} again. Nobody in {town} speaks of the party again, either, as if they had never come.",
        "The party's reflections lag a moment behind them now. Just a moment. Just enough to notice.",
        "{Patron} is found the next morning sitting very upright in {tavern}, smiling, and does not blink at all."],
    intrigue: ["{Villain} walks free, and someone powerful is grateful. The party now knows too much, and somebody knows that.",
        "{Patron} swears never to have hired the party, and the watch would like a word.",
        "{Item} changes hands three times by morning, and the party's name is on the bill of sale.",
        "The scandal breaks, and the party is in the middle of the story, on the wrong side of it.",
        "Someone powerful sends the party a polite note of thanks for failing, and a purse they didn't earn.",
        "{Town}'s council meets behind closed doors, and comes out having decided the whole thing never happened.",
        "The party's descriptions go into a ledger in a locked room somewhere. Next time, someone will be expecting them.",
        "{Patron} is ruined, and goes to work for the very people the party failed to stop."],
    comedic: ["{Villain} wins, and is unbearable about it. A song about the party's failure is in every tavern by the week's end.",
        "{Villain} opens a gift shop at {site}. Business is excellent.",
        "{Patron} demands a refund of the pay the party never got in the first place.",
        "The party is banned from {town} by name, on a sign. The sign has drawings.",
        "The bard who followed them writes the ballad anyway. It's a comedy. It's very popular.",
        "{Town} sends the party a bill for damages. It is itemized. It is very long.",
        "{Patron} hires a rival party, who solve it in an afternoon and are insufferable about it.",
        "The party is mentioned in a guidebook to the region, under ATTRACTIONS TO AVOID."]
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
    "The deed, ledger, or seal in the hoard proves {town}'s lord has been lying for years.",
    "The hoard holds a key that fits no lock anywhere in {site}.",
    "A week later {Patron} is gone, leaving a note: you did well, don't look for me.",
    "Someone in {town} has started chalking the sign the party found at {site} on doors, and the doors are being chosen.",
    "A child from {town} found something at {site} after the party left, and won't give it up.",
    "A merchant offers ten times what {item} is worth, and won't say why.",
    "A priest says what happened at {site} was foretold, and that the prophecy has two more verses.",
    "The party's faces are on a wanted poster in the next town, and nobody will say who put it up.",
    "The keeper of {tavern} quietly asks the party to look into a second, smaller problem.",
    "One of the dead at {site} carried papers from a guild in the capital.",
    "Deep in {site}, a passage the party never took keeps going down.",
    "A noble from far away has heard about {site}, and sends an invitation with a job attached.",
    "{Item} wasn't the only thing taken from {town}, and someone has noticed what else is missing."
];

// Titles. {Noun} (the tone's), {Site} (no "The"), {TheSite} (the whole name), {Town}, {Short} (the thing), {Who} (the villain's first name).
const OS_TITLES = [
    'The {Noun} of {Site}', "{Town}'s {Noun}", 'The {Short} of {Town}', 'The {Noun} at {Site}',
    'The {Noun} Beneath {Town}', "{Who}'s {Noun}", 'The {Short} Affair', 'Beyond {Town}: the {Noun}',
    'The Road to {TheSite}', 'What Waits in {TheSite}', 'The {Town} {Noun}', '{Who} and the {Short}', 'The {Noun} of {Who}',
    'Down into {TheSite}', 'The {Short} and the {Noun}', 'The {Noun} on the {Town} Road', 'Night of the {Noun}', 'Trouble at {TheSite}'
];

// The pitch after "A heroic one-shot.": {Patron}, {patronRole}, {villain}, {site}, {item}, {town}, {deadline}.
const OS_PITCHES = [
    '{Patron}, {patronRole}, needs {villain} stopped at {site} {deadline}.',
    '{Villain} is holed up at {site}, and {Patron}, {patronRole}, will pay to have it ended {deadline}.',
    '{Item} is somewhere in {site}, and {Patron}, {patronRole}, needs it back {deadline}.',
    '{Town} has a problem at {site}, and {Patron}, {patronRole}, is the only one willing to pay to fix it {deadline}.',
    'Something at {site} has to be stopped {deadline}, and {Patron}, {patronRole}, has picked the party to do it.'
];

// A clue's DC by site tier.
const OS_CLUE_DC = { '0-4': 12, '5-10': 14, '11-16': 16, '17+': 18 };

function osPick(arr) {
    return arr[Math.floor(rand() * arr.length)];
}

// One entry of arr (only those ok() allows), from rand() like osPick: one draw, so nothing after it shifts.
// A campaign passes slot { key, i, n }: each list is dealt out over its n chapters (shuffled by key and the
// list's name), and chapter i picks among its own share, so chapters don't repeat a line while the list lasts.
function osSlotPick(arr, name, slot, ok) {
    const idx = arr.map((_, k) => k).filter(k => !ok || ok(arr[k]));
    let pool = idx;
    if (slot) {
        const mine = osSlotShare(arr.length, name, slot);
        const both = idx.filter(k => mine.has(k));
        if (both.length) pool = both;
    }
    return arr[pool[Math.floor(rand() * pool.length)]];
}

// Chapter i's share of a list of len entries (by index).
function osSlotShare(len, name, slot) {
    const perm = withSeed(deriveSeed(slot.key, name), () => siteShuffle(Array.from({ length: len }, (_, k) => k)));
    const n = Math.max(1, slot.n), i = slot.i % n;
    return new Set(len >= n ? perm.filter((_, k) => k % n === i) : [perm[slot.i % len]]);
}

// An already shuffled list with chapter i's share first (no extra draws): for clues and threads.
function osSlotFirst(shuffled, arr, name, slot) {
    if (!slot) return shuffled;
    const mine = osSlotShare(arr.length, name, slot);
    const of = x => (mine.has(arr.indexOf(x)) ? 0 : 1);
    return shuffled.map((x, k) => [x, k]).sort((a, b) => of(a[0]) - of(b[0]) || a[1] - b[1]).map(p => p[0]);
}

function osCap(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function osInt(lo, hi) {
    return lo + Math.floor(rand() * (hi - lo + 1));
}

// "A heroic", "An intrigue".
function osA(word) {
    return (/^[aeiou]/i.test(word) ? 'An ' : 'A ') + word;
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
    }).replace(/ Again again\b/g, ' Again');
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

// Whether a site's boss is a person a campaign can name: a band of people (with races to name them by).
function osNameable(site) {
    const L = site.boss && site.boss.leader, b = site.band && ENC_BAND_BY_KEY[site.band];
    return !!(L && L.person && b && b.races);
}

// ── The roll ─────────────────────────────────────────────
function rollOneShot(seed, opts = {}, set = {}) {
    const ps = id => (set && set[id]) || deriveSeed(seed, id);
    const level = osClamp(opts.level, 1, 20, 3);
    const party = osClamp(opts.party, 1, 8, 4);
    const length = Object.hasOwn(OS_LENGTHS, opts.length) ? opts.length : 'standard';
    const Lg = OS_LENGTHS[length];
    const given = opts.given || null;
    const slot = given && given.slot ? given.slot : null;
    const pick = (arr, name, ok) => osSlotPick(arr, name, slot, ok);
    const budget = partyBudget([{ count: party, level }]);
    const seeds = Object.fromEntries(OS_PARTS.map(id => [id, ps(id)]));
    // A random kind belongs to the site and a random tone to the plot, so a kept part keeps them.
    // Always drawn, so picking one doesn't shift anything else.
    const drawnKind = siteMoreKind(seeds.site, withSeed(deriveSeed(seeds.site, 'kind'), () => osPick(SITE_KIND_FIRST)));
    const drawnTone = withSeed(deriveSeed(seeds.plot, 'tone'), () => osPick(OS_TONE_KEYS));
    const tone = Object.hasOwn(OS_TONES, opts.tone) ? opts.tone : drawnTone;
    const kind = Object.hasOwn(SITE_KINDS, opts.kind) ? opts.kind : drawnKind;

    // ── The site, and its boss as the villain ──
    const gv = given && given.villain && given.villain.name ? given.villain : null;
    const siteOpts = { kind, size: Lg.size, level, party, bands: gv ? gv.bands : null };
    let site = rollSite(seeds.site, siteOpts);
    for (let t = 1; gv && !osNameable(site) && t < (gv.tries || 1); t++) {
        const again = rollSite(deriveSeed(seeds.site, 'again.' + t), siteOpts);
        if (osNameable(again)) site = again;
    }
    let named = !!(gv && osNameable(site)), form = '', guard = '', stood = null;
    if (named) site.boss.leader.name = gv.name;
    const L0 = site.boss && site.boss.leader, v0 = osVillain(site), m0 = v0.monster && MONSTER_BY_ID[v0.monster];
    if (gv && !named && gv.forms && L0 && m0 && v0.mind === 'folk' && gv.forms.includes(m0.type)) {
        L0.name = gv.name;
        named = true;
        form = m0.type;
    }
    const lastFight = site.rooms[site.rooms.length - 1].fight;
    if (gv && !named && gv.stand && lastFight) {
        stood = gv.stand.map(id => MONSTER_BY_ID[id]).filter(m => m && crValue(m.cr) <= level).sort((a, b) => b.xp - a.xp)[0] || null;
        if (stood) {
            guard = v0.name;
            lastFight.list.push({ id: stood.id, count: 1 });
            site.boss.leader = encLeadAs(L0, gv.name, stood);
            named = true;
        }
    }
    const villain = osVillain(site);
    if (stood) Object.assign(villain, { mind: 'folk', monster: stood.id, role: stood.name, first: gv.name.split(' ')[0] });

    // ── Act 1: the town, the tavern, the patron ──
    const hook = withSeed(seeds.hook, () => {
        const terrain = osPick(OS_TERRAIN[kind]);
        const rolledTown = townName(OS_TOWN_SETTING[terrain] || 'crossroads');
        const town = given && given.place && !given.tavern ? given.place : rolledTown;
        const npc = rollNPC();
        const role = pick(OS_PATRONS, 'patron');
        const why = pick(OS_WHY, 'why');
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
        const drawn = osPick(QUEST_ITEMS);
        const [item, short] = given && given.item ? given.item : drawn;
        const goal = pick(OS_GOALS[villain.mind], 'goal.' + villain.mind);
        const twistAll = pick(OS_TWISTS[tone], 'twist.' + tone);
        const twistAny = pick(OS_TWISTS[tone], 'twist.' + tone, t => !t[1]);
        const clock = pick(OS_CLOCKS, 'clock', c => !c[2] || villain.mind === 'folk');
        const days = osInt(3, 7);
        const noun = pick(OS_TONES[tone].nouns, 'noun.' + tone);
        const title = pick(OS_TITLES, 'title');
        const threads = osSlotFirst(siteShuffle(OS_THREADS), OS_THREADS, 'thread', slot).slice(0, 2);
        return { item, short, goal, twist: villain.mind === 'folk' ? twistAll[0] : twistAny[0], clock, days, noun, title, threads };
    });

    const ctx = {
        villain: villain.name, site: site.name, item: plot.item, town: hook.town, tavern: tavern.name,
        patron: patron.name, patronRole: patron.role, holder: siteHolder(site), they: pro.they, their: pro.their,
        vthey: villain.mind === 'folk' ? 'they' : 'it', vthem: villain.mind === 'folk' ? 'them' : 'it'
    };
    const fill = t => osFill(t, ctx);
    const title = given && given.title ? given.title : fill(plot.title.replace('{Noun}', plot.noun).replace('{Site}', osBare(site.name))
        .replace('{TheSite}', String(site.name).replace(/^The /, 'the '))
        .replace('{Short}', plot.short).replace('{Who}', villain.first || hook.town).replace('{Town}', hook.town));
    const deadline = fill(plot.clock[0].replace('{n}', plot.days));
    const late = fill(plot.clock[1]);
    const goalRaw = given && given.goal ? given.goal : plot.goal;
    const goal = fill(goalRaw);
    const twist = fill(plot.twist);
    const reward = questRound(QUEST_PAY[level] * party * Lg.pay * (0.75 + hook.pay * 0.5));
    const job = given && given.hook ? `${given.hook} ${fill('Every lead points to {site}, and to {villain}.')}`
        : fill(`{Patron} wants {villain} dealt with and {item} brought back from {site}, ${deadline}.`);

    // ── Act 2: the trail, the road, the fights ──
    const road = withSeed(seeds.road, () => {
        const dc = OS_CLUE_DC[site.tier];
        const clues = [];
        const used = new Set();
        osSlotFirst(siteShuffle(OS_CLUES), OS_CLUES, 'clue', slot).forEach(c => {
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
            const ev = travelMoreHook(rollRoadEvent(hook.terrain, w, usedEv), deriveSeed(seeds.road, 'event.more.' + d));
            usedEv.push(ev.t);
            days.push({ weather: weatherHeadline(w), event: ev, scene: rollScene(hook.terrain, season) });
        }
        const complication = fill(pick(OS_COMPLICATIONS[tone], 'complication.' + tone));
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
    // The read-aloud lines and the pitch: each from its own child seed, drawn after everything else.
    const bossKey = villain.mind === 'folk' ? tone : villain.mind;
    const bossList = villain.mind === 'beast' ? OS_BOSS_READ_BEAST : villain.mind === 'mindless' ? OS_BOSS_READ_MINDLESS : OS_BOSS_READ[tone];
    const said = (part, label, arr, name) => withSeed(deriveSeed(seeds[part], label), () => fill(pick(arr, name)));
    const opener = said('hook', 'opener', OS_OPENERS[tone], 'opener.' + tone);
    const arrive = `${said('site', 'arrive', OS_ARRIVE[kind] || OS_ARRIVE_ANY, 'arrive.' + kind)} ${said('site', 'arrive.tone', OS_ARRIVE_TONE[tone], 'arrive.' + tone)}`;
    const bossRead = said('site', 'boss', bossList, 'boss.' + bossKey);
    const win = said('plot', 'win', OS_WIN[tone], 'win.' + tone), fail = said('plot', 'fail', OS_FAIL[tone], 'fail.' + tone);
    const pitchBody = withSeed(deriveSeed(seeds.plot, 'pitch'), () => osCap(fill(pick(OS_PITCHES, 'pitch').replace('{deadline}', deadline))));
    return {
        seed, seeds, level, party, length, tone, kind, given: !!given, named, form, guard, budget,
        title, pitch: `${osA(T.adj)} one-shot. ${pitchBody}`, pitchBody,
        villain: { ...villain, goal },
        truth: fill(`{Villain} ${goalRaw}. ${osCap(late)} if nobody stops {vthem} in time.`),
        item: plot.item, itemShort: plot.short, twist, deadline, late,
        town: hook.town, terrain: hook.terrain, tavern, patron, why: withSeed(deriveSeed(seeds.hook, 'why'), () => fill(hook.why)), job, reward,
        placeText: given && given.placeText ? given.placeText : '',
        opener, arrive, bossRead,
        road, site, hoard, xp,
        win, fail, threads: plot.threads.map(fill)
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
    // A campaign chapter's named boss keeps their name (and the monster they came as) there.
    const rooms = o.site.rooms, L = o.site.boss && o.site.boss.leader;
    if (o.named && L && L.name && f === rooms[rooms.length - 1].fight) {
        p.set('lead', L.name);
        if (o.guard) p.set('stand', o.villain.monster);
    }
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
