/* ============================================
   BACKSTORY GENERATOR (F64): a player character's personality and past,
   one line at a time. Each line rolls from its own seed, so a 🔒 kept line
   stays put while the rest reroll. The address bar holds the seeds, so a
   reload or a shared link brings the same backstory back; nothing goes in
   localStorage except a character saved through cbSave (CB_KEY).
   Traits, ideals, bonds, flaws, and names come from npc-data.js.
   Needs rng.js, npc-data.js, character-data.js, and character-engine.js.
   ============================================ */

// Each line has its own seed (by id), so the order here is only the order shown.
const BS_LINES = [
    ['name', 'Name'], ['trait', 'Personality'], ['ideal', 'Ideal'], ['bond', 'Bond'], ['flaw', 'Flaw'],
    ['upbringing', 'Grew up'], ['family', 'Family'], ['mentor', 'Mentor'], ['rival', 'Rival'], ['events', 'Turning points'],
    ['reason', 'Why I adventure'], ['secret', 'Secret'], ['hook', 'Hook for the DM'], ['useit', 'For the DM']
];
const BS_IDS = BS_LINES.map(l => l[0]);
const BS_GENDERS = [['', 'Any names'], ['male', 'Masculine names'], ['female', 'Feminine names'], ['nonbinary', 'Neutral names']];
// Walks of life, not the builder's backgrounds: each one only flavors the lines.
const BS_BACKGROUNDS = [
    ['', 'Any background'], ['acolyte', '🙏 Acolyte'], ['artisan', '🔨 Artisan'], ['criminal', '🗝️ Criminal'],
    ['entertainer', '🎭 Entertainer'], ['farmer', '🌾 Farmhand'], ['hermit', '🕯️ Hermit'], ['noble', '👑 Noble'],
    ['outlander', '🏹 Outlander'], ['sage', '📚 Sage'], ['sailor', '⚓ Sailor'], ['soldier', '⚔️ Soldier'],
    ['swindler', '🃏 Swindler'], ['urchin', '🐀 Urchin']
];
// The age each builder race comes of age (SRD 5.1 race notes), for Turning points.
const BS_ADULT = { dwarf: 50, elf: 100, halfling: 20, human: 18, dragonborn: 15, gnome: 40, 'half-elf': 20, 'half-orc': 14, tiefling: 18 };

// The NPC name tables a builder race borrows; a half-elf or half-orc picks one of two.
const BS_NAME_RACES = {
    dwarf: ['dwarf'], elf: ['elf'], halfling: ['halfling'], human: ['human'], dragonborn: ['dragonborn'],
    gnome: ['gnome'], 'half-elf': ['human', 'elf'], 'half-orc': ['orc', 'human'], tiefling: ['tiefling']
};

const BS_UPBRINGING = [
    "In a fishing village where everyone could read the weather and nobody could read a book",
    "Above a busy tavern, falling asleep to other people's songs",
    "On a farm at the edge of the map, where the nearest neighbor was a day's walk",
    "In the back streets of a big city, running errands for coin",
    "At a temple, among priests who had more rules than smiles",
    "On the road with a traveling caravan, never in one place for a month",
    "In a noble house, as a servant's child who watched everything",
    "In a mining town where the bell meant someone wasn't coming up",
    "At a lonely crossroads inn that saw more strangers than locals",
    "In a border fort, with soldiers for babysitters",
    "In a river town that flooded every spring and rebuilt every summer",
    "At an orphanage that did its honest best",
    "In a mountain monastery, sweeping steps before dawn",
    "On a merchant ship, learning knots before letters",
    "In a market town, behind the counter of the family stall",
    "Deep in the woods with a hermit who never explained much",
    "In a scholar's household, surrounded by books I wasn't allowed to touch",
    "In a village that still talks about the year the dragon came",
    "In a quiet town where nothing happened, which was the whole problem",
    "In a refugee camp, after war took the home I barely remember",
    "In a shepherd's hut on the high moors",
    "In the shadow of a ruined castle that the local children dared each other into",
    "In a guild hall, as an apprentice from the age of seven",
    "In a city under siege for most of my childhood"
];
const BS_UPBRINGING_RACE = {
    dwarf: ["In a mountain hold where my clan's name is carved over the gate", "In a forge town where the hammers never stopped", "In a hold that fell when I was young; we live as guests in another"],
    elf: ["In a forest city where a century counts as a short memory", "Among humans, the one elf child in a market town", "In a quiet elven enclave that hasn't welcomed a stranger in two hundred years"],
    halfling: ["In a hillside village of round doors and long lunches", "With a wandering halfling family that sets up wherever the weather is good", "In a human city's halfling quarter, where everyone knows everyone's business"],
    human: ["In a crowded capital where three tongues are spoken in every street", "In a frontier town that was a camp when my grandparents came", "In a farming valley that has belonged to six different lords in my lifetime"],
    dragonborn: ["In a clan hall where my ancestors' deeds were recited every feast", "Far from any other dragonborn, in a town that stared", "In a clan that left its homeland before I was born"],
    gnome: ["In a burrow full of half-finished inventions", "In a gnome workshop town where something exploded most weeks", "Among the forest gnomes, learning the names of every beetle"],
    'half-elf': ["Between two homes, never quite at home in either", "With my elven parent's people, who were kind and patient and very slow", "With my human parent's people, who aged while I hardly changed"],
    'half-orc': ["In an orc camp until I was old enough to leave it", "In a human town that was quick to blame me for things", "With a mercenary company that didn't care who my parents were"],
    tiefling: ["In a city quarter where tieflings keep to themselves", "In a village that took me in after my family was run out of the last one", "With human parents who were as surprised by my horns as anyone"]
};

const BS_FAMILY = [
    "Both parents alive, and they write to me more than I write back",
    "Raised by my grandmother, who is tougher than any knight",
    "The youngest of nine; I learned to shout early",
    "An only child, and the whole of my parents' hopes",
    "My {kin} and I don't speak, and it's my fault",
    "My {kin} is famous, and I'm tired of hearing about it",
    "My parents died when I was young; {townsfolk} raised me",
    "I have a twin who took the other road",
    "A big, loud family that runs the family business without me",
    "I never knew my father; my mother never said a word about him",
    "Adopted, and I love them, and I still wonder",
    "My family is minor nobility with more pride than coin",
    "My {kin} is in debt to dangerous people, and so, by extension, am I",
    "My family disowned me, and I'm only a little sorry",
    "My {kin} disappeared on an adventure; I'm following the same road",
    "My parents are adventurers who retired to {place} and won't talk about why",
    "A blended family of four parents and more siblings than I can count",
    "My {kin} is a priest who prays for me loudly and often",
    "My family has served the same noble house for five generations",
    "No family to speak of; my friends from the street are my family",
    "My {kin} is the town's black sheep, and I'm the next in line",
    "My parents are dull, kind people, and I miss them more than I'll admit",
    "I have a child back home, safe with my {elder}",
    "My family thinks I'm a clerk in the city"
];

const BS_REASON = [
    "I need coin, and adventuring pays better than honest work",
    "I want to see what's past the edge of the map",
    "Someone has to stand between the monsters and the farms",
    "I'm running from something, and moving targets are hard to hit",
    "I want my name in a song, and a good song",
    "My home is gone; the road is all I have",
    "I made a promise to someone who died",
    "I'm looking for someone who left without a word",
    "I was bored, and that seemed like a terrible way to live",
    "A prophecy mentions me, and I'd like to know how it ends",
    "I owe a debt that only treasure will pay",
    "I want to prove my family wrong about me",
    "I lost a bet",
    "I'm hunting the one who wronged me",
    "I want to buy back the land my family lost",
    "A dream keeps showing me the same door, and I mean to find it",
    "My friends are going, and I'm not staying behind",
    "I want to do some good before my luck runs out",
    "I was hired as a guide and never stopped",
    "I'm looking for a cure for my {kin}"
];
const BS_REASON_CLASS = {
    barbarian: ["My tribe sent me to find out why the herds are dying", "The rage comes whether I want it or not; out here it's useful", "I was the strongest in my village and it wasn't enough", "The spirits of my ancestors want something, and they won't let me sleep"],
    bard: ["Every great song needs a great story, and I'm out of stories", "My college sent me to collect lore nobody's written down", "I owe a lot of people money in a lot of towns", "I want to write the ballad of a real hero, so I'm following some around"],
    cleric: ["My god sent me a vision, and I'm following it", "My temple wants a relic returned", "I lost my faith once and found it on the road", "Healing the sick at home wasn't enough; the sickness started somewhere"],
    druid: ["The land itself is ill, and I mean to find the cause", "My circle sent me to watch the civilized folk", "A grove I tended was burned, and I want to know by whom", "The seasons are turning wrong, and someone has to ask why"],
    fighter: ["I was a soldier, and peace didn't take", "I'm saving up for my own company of sellswords", "I'm the best with a blade in my town; I want to know if I'm the best anywhere", "My old captain died owing me pay, so I'm collecting it from the world"],
    monk: ["My monastery sent me out to learn what can't be taught inside its walls", "My master vanished, and the trail leads here", "I seek a perfect stillness, and I find it best in danger", "Someone stole our temple's scrolls"],
    paladin: ["I swore an oath, and oaths don't keep themselves", "Evil is real, and I've seen it up close", "My order was destroyed; I'm what's left of it", "I have something to atone for, and quiet prayer isn't enough"],
    ranger: ["Something is hunting in my forest, and I'm hunting it", "I know the wilds better than anyone, and people need guides", "A monster took my family; I've been tracking its kind ever since", "The roads are getting dangerous, and someone has to scout them"],
    rogue: ["The last job went wrong, and I need to be far away", "Dungeons are full of treasure nobody's using", "My guild wants something stolen, and I want out of the guild", "I'm good at getting into places, and adventurers pay well for that"],
    sorcerer: ["The magic in my blood is getting stronger, and I need answers", "I set something on fire by accident, and leaving seemed wise", "I want to find out where my power came from", "Something ancient is calling me, and the call gets louder"],
    warlock: ["My patron has given me a task, and I'd rather not find out what happens if I refuse", "I made a bargain to save someone, and now I pay it off", "I want to get out of my pact, and that takes knowledge or power", "My patron's enemies are my enemies now"],
    wizard: ["Books can only teach so much; the rest is out there", "I'm looking for a spellbook my master hid", "The academy expelled me, and I'll show them", "I need rare components that no shop sells"]
};

const BS_SECRET = [
    "I'm not who I say I am; I took a dead stranger's name",
    "I owe money to the thieves' guild, and they know where I sleep",
    "I ran from a battle, and my friend died because of it",
    "I'm the heir to a title I want nothing to do with",
    "I stole the thing that made my old party fall apart",
    "I can't read, and I've hidden it my whole life",
    "My {kin} was a criminal, and I helped",
    "I've been having dreams that come true",
    "I once made a deal with a fiend, and I don't know if it's over",
    "I'm wanted in another kingdom under another name",
    "I'm afraid of the dark, and I'm an adventurer",
    "I set the fire that burned down {place}",
    "I was once a member of a cult, and they want me back",
    "I'm slowly losing my memories, and I write everything down",
    "I'm in love with someone in this party",
    "I don't believe in the god I claim to serve",
    "My family's fortune was built on something terrible",
    "I took a bribe once that got someone hurt",
    "I carry a letter I was told to deliver years ago, and never did",
    "I have a child I've never met",
    "The {thing} I carry isn't mine; I took it from a body",
    "I'm far older than I look, and I don't know why",
    "I've seen the face of the villain everyone is hunting, and it was a friend",
    "I'm being paid to keep an eye on the rest of the party",
    "I was raised by something that wasn't human",
    "I faked a death once, and I may need to do it again",
    "I hear a voice that nobody else hears",
    "I'm the reason my village was attacked"
];

const BS_HOOK = [
    "An old friend turns up needing the favor this character promised long ago",
    "A debt collector from home arrives, with this character's name at the top of a list",
    "A wanted poster with this character's face appears in a town they've never visited",
    "Their {kin} sends a letter: come home, something is wrong",
    "Someone else is using this character's name, and committing crimes with it",
    "The {thing} from their past turns up for sale in a shop",
    "A stranger recognizes them and is terrified",
    "Their old mentor is now working for the villain",
    "A ghost from {place} starts following them",
    "A noble arrives claiming the character is their long-lost heir",
    "The person they've been looking for is found, and doesn't want to be",
    "A rival from childhood joins a competing adventuring party",
    "Their family's old enemy has just moved into the next town",
    "A dying stranger gives them a key and a single word",
    "The thing they ran away from has followed them",
    "Someone from their past needs them to testify at a trial",
    "A song about them is going around, and it isn't flattering",
    "Their secret is written on a note slipped under the door",
    "A priest says the character's soul has been promised to someone",
    "An old map they carried for years turns out to be real",
    "Their hometown sends for help, and they're the only one who answered",
    "Someone they thought was dead walks into the tavern",
    "A bounty hunter is following the party, and it's this character they want",
    "A monster from {place} has learned their name"
];

// ── Second pass (E4): newer lines join the old tables through bsMore, drawn after
// the old line is done, so a link from before keeps its line unless that draw swaps it.
const BS_UPBRINGING_MORE = [
    "In a lumber camp where the trees were older than the town",
    "In a canal city, where I could row before I could walk",
    "In a toll house on a bridge, collecting coppers from strangers",
    "In a vineyard village where every quarrel waited until after the harvest",
    "In a prison town, as the warden's child",
    "In a salt-marsh hamlet built on stilts",
    "In a desert oasis town that lived on passing caravans",
    "In a hunting lodge that a lord used twice a year and my family kept the rest of the time",
    "In a quarry town, where the dust got into everything, songs included",
    "Among traveling players, sleeping in the props wagon",
    "In a lakeside village that swears something lives under the water",
    "In a walled city's poorest ward, downwind of the tanneries",
    "In a castle kitchen, stealing honey cakes from the cook",
    "In a plague town that shut its gates for three years",
    "On an island where the ferry came once a month",
    "In a hospice run by healers, where I learned early how people die",
    "In a mill town that kept time by the turning of the wheel",
    "In a snowbound village that spends half the year indoors",
    "Under a famous bridge, with a crowd of other children nobody counted",
    "In a wizard's tower, as the cook's child, which is not the same as an apprentice"
];
const BS_UPBRINGING_RACE_MORE = {
    dwarf: ["In a trading post at the mouth of the mines, between the surface folk and my own", "In a brewing family whose ale is known three holds over"],
    elf: ["In a treetop village where the young were taught to wait", "With a wandering elven company that sings the old roads back into memory"],
    halfling: ["Above a halfling bakery, where the ovens woke before the roosters", "On a riverboat crewed by three generations of my family"],
    human: ["In a port city where every ship brought a new rumor", "In a pilgrim town that lives off a saint nobody can quite prove was real"],
    dragonborn: ["As a ward in a human lord's court, kept there to honor an old treaty", "Among dragonborn sellswords who raised their children together"],
    gnome: ["In an illusionists' quarter where nothing was quite where it looked", "In a gnome hamlet dug into the roots of one enormous oak"],
    'half-elf': ["In a port town where nobody asked about anyone's parents", "Passed between both families every other summer"],
    'half-orc': ["With an orc grandmother who taught me to hunt and a human grandfather who taught me to read", "On a frontier farm where my strength was the only thing that mattered"],
    tiefling: ["With a troupe of performers who said my horns were good for business", "In a temple orphanage where the priests prayed over me twice as long"]
};

const BS_FAMILY_MORE = [
    "My {elder} raised me alone and worked three jobs to do it",
    "My parents run an inn, and every guest was family for a night",
    "I'm the eldest, and I left the younger ones to fend for themselves",
    "My {elder} is the town's healer and still expects me home to take over",
    "My family are all soldiers; I was meant to be one too",
    "My {elder} remarried, and the new family never quite made room for me",
    "My {kin} went to prison for something I did",
    "My grandparents raised me while my parents chased a fortune overseas",
    "My family has a feud with the family next door that's older than anyone alive",
    "My {elder} is a wizard who barely noticed I existed",
    "Four older siblings, each better than me at something",
    "My parents live apart, and each one asks me about the other",
    "My {kin} died last winter, and I haven't cried yet",
    "My family keeps bees, goats, and grudges",
    "I was taken in by {townsfolk}, and I still send them half of what I earn",
    "My {kin} is missing, and the family has stopped looking",
    "My family are traveling merchants; I have cousins in every port",
    "My {kin} is ill, and the cure costs more than the farm is worth",
    "My family name means something in the old country, and nothing here",
    "My {kin} and I write to each other in a code we made up as children"
];

const BS_REASON_MORE = [
    "I found a map in my {elder}'s things, and I want to know where it goes",
    "The village chose me to go, and I couldn't say no to all of them",
    "I want to find out if the stories my {elder} told were true",
    "I want enough gold to never be hungry again",
    "Someone paid for my training, and I mean to earn it",
    "I heard the ruins up north are full of answers",
    "The temple took everything my family had; I mean to take some of it back",
    "I'm learning to be brave, one bad idea at a time",
    "I want to be the person {townsfolk} always said I could be",
    "I saw a dragon once, flying over the hills, and I've wanted more ever since",
    "Staying home meant marrying someone I'd never met",
    "My name was drawn to pay the village's debt, and I'm paying it my own way",
    "I was cursed, and the cure is somewhere out there",
    "A stranger saved my life and asked me to pass it on",
    "I'm collecting stories to bring home to my {kin}",
    "I'm searching for the {thing} that was stolen from my family"
];
const BS_REASON_CLASS_MORE = {
    barbarian: ["I was exiled for a death that wasn't my fault", "My people say a warrior must see the sea before they die, and I haven't"],
    bard: ["I heard a song in a tavern that nobody alive could have written, and I'm finding its author", "Applause is wonderful, and danger draws a crowd"],
    cleric: ["My god has gone quiet, and I want to know why", "I tend the dying, and there are more of them out here"],
    druid: ["A spirit of the wild asked me for help, and spirits rarely ask", "The old standing stones are waking, and my circle sent me to listen"],
    fighter: ["I lost a duel I should have won, and I need to know why", "My company was disbanded, and I don't know how to be anything else"],
    monk: ["My order teaches that the body learns what the mind forgets", "I broke a vow of silence to save a life, and I wander until I'm forgiven"],
    paladin: ["My oath demands that I right a wrong I haven't found yet", "A holy relic chose me, and I don't know why"],
    ranger: ["I'm the last of the wardens who watched the old border", "Beasts are fleeing the forest, and something is driving them"],
    rogue: ["I'm stealing back what a guildmaster stole from me", "I like locks, and the locks out here are more interesting"],
    sorcerer: ["My power woke during a storm, and storms seem to follow me", "A dragon in my bloodline is still alive, and I want to meet it"],
    warlock: ["My patron went silent, and the power didn't", "I'm searching for the last person who served my patron, to learn how they died"],
    wizard: ["I want to see the spells my books only describe", "My familiar keeps leading me somewhere, and I'm letting it"]
};

const BS_SECRET_MORE = [
    "I was the one who told the guards where my friends were hiding",
    "I can't swim, and I've lied about it on every boat",
    "I once let an innocent person hang for my crime",
    "My real name is on a list in a temple's archive, marked 'do not admit'",
    "I've already died once; something sent me back",
    "I'm married, and my spouse thinks I'm dead",
    "I sold my {elder}'s {thing} to pay a gambling debt",
    "I sleepwalk, and some mornings I wake up with mud on my boots",
    "I'm terrified of magic, even the healing kind",
    "I was paid to lose a fight once, and I did",
    "I have a sibling nobody knows about, raised by the other side",
    "I've been forging letters of introduction since I was twelve",
    "I'm the only survivor of a party that didn't come back, and I won't say what happened",
    "The scar I say came from a monster came from my own family",
    "I hid a chest of coins at {place}, and someone moved it",
    "I can understand a language I never learned",
    "My old teacher isn't dead; I only told everyone that",
    "I read a letter that wasn't meant for me, and I can't unread it",
    "I've never been in a real fight, whatever my stories say",
    "I keep a list of everyone who has wronged me, and I'm not done with it"
];
const BS_SECRET_CLASS = {
    barbarian: ["My rage once hurt someone I love, and I don't remember doing it", "I can read perfectly well, and I pretend I can't"],
    bard: ["My most famous song was stolen from a dying friend", "I'm a spy for a noble house, and my songs carry its messages"],
    cleric: ["My god spoke to me once, and what it said frightened me", "I healed someone who didn't deserve it, and they've done worse since"],
    druid: ["The fire that burned my grove was one I started", "I once wore a beast's shape so long I nearly forgot how to come back"],
    fighter: ["The medal I wear belongs to someone else", "I deserted my last army, and they still post my description"],
    monk: ["I left my monastery the night it burned, and I saw who set the fire", "I was never a real student; I learned by watching through a window"],
    paladin: ["I broke my oath once, and nobody knows", "My order's founder was a monster, and I've read the proof"],
    ranger: ["The beast I'm hunting was my pet once", "I led a group into the wilds and came back alone"],
    rogue: ["I still work for the guild; they let me think I left", "I robbed one of the people in this party before we met"],
    sorcerer: ["My power came from a deal my {elder} made", "When I lose control, I hear a second voice laughing"],
    warlock: ["My patron is someone the party would hunt if they knew", "I don't know who my patron really is"],
    wizard: ["My spellbook was taken from my dead master's hands", "I copied a spell I was forbidden to learn"]
};

const BS_HOOK_MORE = [
    "A letter arrives from {place} in this character's own handwriting, dated next year",
    "Their {kin} turns up at the party's camp, in trouble and not saying why",
    "A temple offers a reward for this character, alive, no questions asked",
    "An heirloom they sold years ago turns up on the villain's belt",
    "Someone from home has written a book about them, and it's selling well",
    "A child arrives claiming to be theirs",
    "The guild they once crossed opens a hall in the party's favorite town",
    "Their old home is up for auction, and someone is bidding against them",
    "A familiar face appears among the villain's guards",
    "A fortune teller refuses to read for them, and leaves town that night",
    "Their name is on a list of the dead, posted at a temple door",
    "A stranger pays the party's tab and leaves a note: for old times' sake",
    "An old promise comes due on the day of the party's biggest job",
    "The {thing} they lost years ago is found in a dungeon, with a fresh note tied to it",
    "A herald arrives with a summons from a court they've never heard of",
    "Someone they wronged long ago turns up and has forgiven them, which is worse",
    "A beast from their childhood stories is sighted near {place}",
    "Their {kin} has joined the side the party is fighting",
    "An inheritance waits for them, if they can reach it before their cousins do",
    "The thing they swore never to do again is the only way out of the next fix"
];

// Per background: where they grew up, why they left, and what they hide.
const BS_BG = {
    acolyte: {
        up: ["In a temple dormitory, waking to the dawn bell", "As a foundling left on the temple steps"],
        reason: ["My temple sent me to carry its faith where it's needed", "I'm searching for a lost shrine named in the oldest prayers"],
        secret: ["I've been stealing from the offering box for years", "I saw the high priest do something unforgivable"],
        mentor: ["the temple's oldest priest", "a pilgrim who never stayed anywhere long"]
    },
    artisan: {
        up: ["In a workshop, sweeping up shavings before I could hold a chisel", "In a guild town where your trade was your name"],
        reason: ["I need a rare material for the masterwork I've planned for years", "The guild threw me out, and I mean to come back too good to refuse"],
        secret: ["My best piece was made by my master, and I signed it", "I sold forgeries to a noble who still doesn't know"],
        mentor: ["my guild master", "a tinker who could fix anything but people"]
    },
    criminal: {
        up: ["In a smugglers' den, keeping watch for the customs men", "Running messages for a gang before I knew what they were"],
        reason: ["My old crew wants me dead, and the road is far from them", "I'm planning one last job, and I need a crew who can fight"],
        secret: ["I informed on my crew to save my own neck", "There's a price on my head, and it keeps going up"],
        mentor: ["a fence with a very tidy shop", "the gang's best lockpick"]
    },
    entertainer: {
        up: ["On a stage, with a different name in every town", "In a circus, raised by acrobats and a very patient bear"],
        reason: ["I'm out of new stories, and adventurers make the best ones", "My act needs a real monster, and I mean to find one"],
        secret: ["I faked my most famous trick, and someone has worked it out", "The patron who made me famous wants me back on a leash"],
        mentor: ["a fading star of the stage", "a juggler with a mean streak"]
    },
    farmer: {
        up: ["On a farm where every harvest decided whether we'd eat that winter", "In a farming hamlet where the lord's taxes took more than the frost"],
        reason: ["The farm can't feed all of us, so I left to send coin home", "Something killed our herd, and I mean to find out what"],
        secret: ["I sold the farm's deed to pay a debt, and my family doesn't know", "I buried something in the north field and told no one"],
        mentor: ["the old shepherd up the hill", "the miller's widow"]
    },
    hermit: {
        up: ["In a cave above the treeline, with a hermit who taught me silence", "Alone, mostly, after I walked out of the village at twelve"],
        reason: ["In my solitude I learned something the world needs to hear", "The quiet stopped working, and I wanted to know why"],
        secret: ["I went into exile to hide from what I'd done", "The truth I found alone would ruin a great house if spoken"],
        mentor: ["a hermit who talked to crows", "a silent monk on the mountain"]
    },
    noble: {
        up: ["In a cold manor full of portraits that frowned", "At court, where every smile was a move in a game"],
        reason: ["My family needs a hero in its name, and I'm the spare", "I want to earn something my title didn't buy me"],
        secret: ["My family's title was bought with a forged charter", "I'm not my parents' child, and the true heir is out there"],
        mentor: ["my family's master-at-arms", "a tutor who drank"]
    },
    outlander: {
        up: ["Following the herds across the plains with my clan", "In the wild hills, where the nearest town was a rumor"],
        reason: ["My people's lands are shrinking, and I want to know who's taking them", "The wilds are changing, and I'm the one who noticed"],
        secret: ["I left my clan without leave, and leaving is a crime there", "I've seen a city in the wilds that isn't on any map"],
        mentor: ["my clan's eldest tracker", "a trapper who wintered alone"]
    },
    sage: {
        up: ["In a library, cataloguing books I wasn't old enough to read", "As the child of two scholars who argued about everything"],
        reason: ["I'm one fact away from finishing my life's work", "A footnote in an old book points somewhere no scholar has gone"],
        secret: ["My famous thesis is wrong, and I know it", "I've read a book that's banned everywhere, and I remember every word"],
        mentor: ["a librarian who had read everything", "an astronomer who never slept"]
    },
    sailor: {
        up: ["On a fishing boat, gutting the catch before dawn", "In a harbor town where everyone waited on the tide"],
        reason: ["My ship went down, and I'm the only one who knows why", "I want a ship of my own, and that takes gold"],
        secret: ["I was part of a mutiny, and the captain lived", "I sailed with pirates for two seasons, and I liked it"],
        mentor: ["a bosun with a voice like thunder", "an old navigator"]
    },
    soldier: {
        up: ["In a garrison town, with drums for a lullaby", "In a war camp, as one of the children who followed the army"],
        reason: ["My unit was wiped out, and I want to know who sold us", "I'm good at fighting, and I'm tired of fighting for lords"],
        secret: ["I followed an order I knew was wrong", "My old commander thinks I'm dead, and I'd like to keep it that way"],
        mentor: ["my first sergeant", "a one-armed veteran"]
    },
    swindler: {
        up: ["Following a con artist from town to town, learning every trick", "In a gambling house, where I learned to count cards before coins"],
        reason: ["I've conned half the kingdom, and I'd like to see the other half", "The last mark was dangerous, and I need to vanish for a while"],
        secret: ["Half of what I've told this party is a lie, and I've lost track of which half", "I sold a fake relic to a temple, and they built a shrine around it"],
        mentor: ["a card sharp with a dozen names", "a fortune teller who made it all up"]
    },
    urchin: {
        up: ["On the rooftops of a city that never noticed me", "In the sewers, with a gang of other children nobody wanted"],
        reason: ["I promised the other street children I'd come back rich", "I want a door with a lock that's mine"],
        secret: ["I still steal, a little, just to know I can", "I know where the city's rich families hide their money"],
        mentor: ["a beggar who called himself a king", "a pickpocket twice my age"]
    }
};

// Mentor: "{name}, {role}, who taught me {lesson}. {now}"
const BS_MENTOR_ROLES = [
    "an old sellsword", "a hedge witch", "a retired thief", "the village priest", "a traveling scholar",
    "my {elder}'s best friend", "a one-eyed sailor", "a disgraced knight", "a gruff blacksmith", "a wandering monk",
    "a court musician", "a hunter in the hills", "a fortune teller", "a former adventurer", "a healer at the temple",
    "the magistrate's clerk", "a gambler with fast hands", "a sea captain", "a ranger of the borderlands", "an old librarian"
];
const BS_MENTOR_LESSONS = [
    "to read", "how to hold a blade", "never to trust a smiling noble", "how to lie with a straight face",
    "the names of the stars", "to keep my temper, mostly", "how to cook over a campfire", "every tavern song worth knowing",
    "how to tell when someone is lying", "to walk without a sound", "how to win at cards", "that kindness is a kind of strength",
    "how to read a map", "to pick a lock", "to keep my promises", "to look for the way out first"
];
const BS_MENTOR_LESSONS_CLASS = {
    barbarian: "to let the anger out, and then let it go", bard: "to play for a crowd that wants to leave",
    cleric: "the prayers for the dying", druid: "to listen to the trees", fighter: "to fight dirty when it counts",
    monk: "to breathe through pain", paladin: "what an oath is worth", ranger: "to read tracks in the dark",
    rogue: "to be gone before anyone looks", sorcerer: "to hold the magic in", warlock: "that every bargain has a hidden clause",
    wizard: "my first cantrip"
};
const BS_MENTOR_NOW = [
    "We haven't spoken in years.", "They died, and I carry their {thing}.", "They still write, and still correct my spelling.",
    "They're missing, and nobody else seems worried.", "They turned to crime, and I'm not sure they were wrong.",
    "I let them down, and they know it.", "They think I'm wasting what they taught me.",
    "They're old now, and asking for one last favor.", "They're in prison, and they won't tell me why.",
    "They vanished the same night as {townsfolk}.", "They took on a new student after me, and that student is trouble.",
    "They're the reason I'm still alive.", "They owe money to the wrong people.", "They sent me away for my own good, they said.",
    "I've never told them I became an adventurer.", "They're adventuring again, at their age."
];

// Rival: "{name}, {who}. {why}. {now}"
const BS_RIVAL_WHO = [
    "a childhood friend", "my oldest enemy", "a cousin who's better at everything", "a fellow apprentice",
    "the bully from my street", "a former partner", "the child of {townsfolk}", "an adventurer from a rival party",
    "my {elder}'s favorite", "a noble's heir I grew up beside", "a soldier from my old company", "a priest who calls me a disgrace",
    "a thief who stole my first score", "someone I loved once", "my mentor's other student", "a merchant who ruined my family"
];
const BS_RIVAL_WHY = [
    "We wanted the same apprenticeship, and they cheated to win it", "I broke their nose at a harvest fair, and they've never let it go",
    "They took the credit for my bravest moment", "We both loved the same person", "I won a duel I should have lost",
    "They think I left them to die", "Our families have hated each other for three generations", "They were always one step ahead of me",
    "I told a secret they trusted me with", "They stole the {thing} I was meant to inherit", "We split a treasure, and they say I cheated",
    "They became everything I was supposed to be", "I testified against them", "They burned down {place}, and I'm the only one who knows",
    "We made a bet years ago, and it's still not settled", "They laughed when I failed, and everyone heard",
    "I beat them at the one thing they were proud of", "They joined the people I ran from", "We were partners until a job went wrong",
    "They blame me for their {kin}'s death"
];
const BS_RIVAL_NOW = [
    "They're doing well, which makes it worse.", "They've sworn to beat me to the same prize.", "Last I heard, they were looking for me.",
    "They're adventuring too, and getting famous.", "They've joined a cult, or a guild; I can't tell which.",
    "We'd probably be friends, if either of us gave in.", "They've married into money.", "They're captain of the watch now.",
    "They're working for someone dangerous.", "They want to settle it with one more contest.", "They saved my life once, and I hate it.",
    "They don't know I'm still alive.", "They're in debt, and I could help, and I won't.", "They write me letters I never answer."
];

// Turning points: three ages, scaled to when the race comes of age.
const BS_EVENTS_CHILD = [
    "I got lost in the woods for three days and came back changed", "I saw my first monster, from under a cart",
    "I won a footrace against the whole village", "I broke something precious and blamed my {kin}",
    "I learned to read from a book of old ballads", "I fell through the ice, and someone pulled me out",
    "I made a friend nobody else could see", "I stole a pie and got caught by {townsfolk}",
    "I watched a great funeral pass through town", "I found a coin with a face I didn't recognize",
    "I nearly drowned and had a dream I still remember", "a traveling fortune teller wouldn't read my palm",
    "I hid in a cellar while raiders burned the barn", "I took in a stray dog that followed me everywhere",
    "I climbed the tallest tree in the valley and saw another town", "I was blamed for a fire I didn't start",
    "I sat with a dying soldier who told me a secret", "my {elder} took me to a city for the first time"
];
const BS_EVENTS_YOUTH = [
    "I had my heart broken at the spring dance", "I left home for the first time", "I got into my first real fight, and lost",
    "I was apprenticed, and hated it", "I pulled a child out from under a runaway cart", "I was caught somewhere I shouldn't have been",
    "I lost my best friend to a fever", "I ran away and came back a week later", "I joined the local militia",
    "I was arrested for the first time", "I fell in love with someone far above my station", "I found a hidden room in {place}",
    "I spent a winter snowed in with a stranger", "I won a prize I didn't deserve", "I learned a family secret by accident",
    "I talked my way out of a hanging", "I helped bury {townsfolk}", "I made an enemy for life"
];
const BS_EVENTS_RECENT = [
    "I left for good", "I signed on with a caravan headed somewhere I'd never been", "I spent my last coin on the gear I'm wearing",
    "I met the people I'd adventure with", "I walked away from a life that was finally comfortable", "I made the promise I'm still keeping",
    "I heard my name in a prophecy", "I survived something that killed better people", "I took my first paid job with a weapon",
    "I buried someone and took up their cause", "I lost everything in one night", "I answered a notice on a tavern board",
    "I burned a letter without reading it", "I said goodbye to my {elder} without saying why", "I woke up in a ditch with a map in my pocket",
    "I turned down an offer I may regret", "I was told never to come back", "I stopped waiting for my life to start"
];

// For the DM: ways to bring the mentor and rival (by name) into play.
const BS_USEIT = [
    "Bring {rival} in as the leader of a rival party, chasing the same prize",
    "Let {mentor} send for help, with a job that leads straight into the secret",
    "Make {mentor} the one person who knows the secret, and tired of keeping it",
    "Have {rival} offer a truce, on the condition that the party does one job for them",
    "Put {rival} in the cell next to the prisoner the party came to free",
    "Let {mentor}'s old enemies mistake this character for {mentor}'s heir",
    "Have {rival} learn the secret and send a single line: we should talk",
    "Reveal that {mentor} and {rival} know each other, and not as strangers",
    "Give a villain {mentor}'s old {thing}, and let the character recognize it",
    "Have {rival} save the party at the worst possible moment, and expect to be thanked",
    "Land the hook in a town where everyone knows {rival}, and likes them better",
    "Have {mentor} die offstage, leaving the character a will with conditions",
    "Ask the player what {mentor} would think of the party, then have {mentor} visit",
    "Let {rival} hire the party under a false name",
    "Bring {mentor} back as a rumor first: someone saw them, alive, in the wrong company",
    "Make the first big reward something {rival} wants too"
];

// Fillers the NPC tables lack: older relatives, for lines where a child or spouse won't fit.
const BS_FILL = { elder: ["mother", "father", "parent", "grandmother", "grandfather", "aunt", "uncle"] };

// A named person from the character's past. Rolls from the line's own seed, so the
// For the DM line names the same mentor and rival the other lines show.
function bsWho(id, g) {
    return withSeed(deriveSeed(bsLineSeed(id), 'who'), () => {
        const own = BS_NAME_RACES[g.race], r = rand(), near = rand() < 0.7, any = randomArray(NPC_RACES);
        const race = own && near ? own[Math.floor(r * own.length)] : any;
        return buildName(race, randomArray(NPC_GENDERS)).name;
    });
}

const BS_ROLL = {
    name: g => {
        const pool = BS_NAME_RACES[g.race] || NPC_RACES;
        const race = randomArray(pool);
        const gender = randomArray(NPC_GENDERS);
        return buildName(race, g.gender || gender).name;
    },
    trait: () => {
        const a = randomArray(npcData.traits);
        let b = randomArray(npcData.traits);
        for (let i = 0; b === a && i < 5; i++) b = randomArray(npcData.traits);
        return `${a}. ${b}.`;
    },
    ideal: () => randomArray(npcData.ideals),
    // Bonds are first person, and some open on a {place}.
    bond: () => bsFill(randomArray(npcData.bonds), true).replace(/^[a-z]/, c => c.toUpperCase()),
    flaw: () => randomArray(npcData.flaws),
    upbringing: g => {
        const t = bsMore(bsMix(BS_UPBRINGING, BS_UPBRINGING_RACE[g.race], 0.4),
            () => bsMix(BS_UPBRINGING_MORE, BS_UPBRINGING_RACE_MORE[g.race], 0.4), 20 / 44);
        return bsOwn(t, bsBg(g, 'up'), 0.35);
    },
    family: () => bsMore(bsFill(randomArray(BS_FAMILY), true), () => bsFill(randomArray(BS_FAMILY_MORE), true), 20 / 44),
    reason: g => {
        const t = bsMore(bsFill(bsMix(BS_REASON, BS_REASON_CLASS[g.cls], 0.5), true),
            () => bsFill(bsMix(BS_REASON_MORE, BS_REASON_CLASS_MORE[g.cls], 0.5), true), 16 / 36);
        return bsFill(bsOwn(t, bsBg(g, 'reason'), 0.35), true);
    },
    secret: g => {
        let t = bsMore(bsFill(randomArray(BS_SECRET), true), () => bsFill(randomArray(BS_SECRET_MORE), true), 20 / 48);
        t = bsOwn(t, BS_SECRET_CLASS[g.cls], 0.25);
        return bsFill(bsOwn(t, bsBg(g, 'secret'), 0.25), true);
    },
    hook: () => bsMore(bsFill(randomArray(BS_HOOK)), () => bsFill(randomArray(BS_HOOK_MORE)), 20 / 44),
    // The lines below came with E4, so they roll freely.
    mentor: g => {
        const role = bsOwn(randomArray(BS_MENTOR_ROLES), bsBg(g, 'mentor'), 0.35);
        const lesson = bsOwn(randomArray(BS_MENTOR_LESSONS), BS_MENTOR_LESSONS_CLASS[g.cls] && [BS_MENTOR_LESSONS_CLASS[g.cls]], 0.3);
        return bsFill(`${bsWho('mentor', g)}, ${role}, who taught me ${lesson}. ${randomArray(BS_MENTOR_NOW)}`, true);
    },
    rival: g => bsFill(`${bsWho('rival', g)}, ${randomArray(BS_RIVAL_WHO)}. ${randomArray(BS_RIVAL_WHY)}. ${randomArray(BS_RIVAL_NOW)}`, true),
    events: g => {
        const adult = BS_ADULT[g.race] || 18;
        const child = Math.max(5, Math.round(adult * (0.3 + rand() * 0.3)));
        const youth = Math.max(child + 2, Math.round(adult * (0.7 + rand() * 0.2)));
        const recent = Math.max(youth + 2, adult + Math.floor(rand() * Math.ceil(adult * 0.4)));
        const beat = (age, list) => `At ${age}, ${randomArray(list)}.`;
        return bsFill(`${beat(child, BS_EVENTS_CHILD)} ${beat(youth, BS_EVENTS_YOUTH)} ${beat(recent, BS_EVENTS_RECENT)}`, true);
    },
    useit: g => bsFill(randomArray(BS_USEIT).replace(/\{mentor\}/g, bsWho('mentor', g)).replace(/\{rival\}/g, bsWho('rival', g))) + '.'
};

// A race or class list replaces the shared one when there is one and the draw says so.
// Draws the same either way, so picking a race doesn't shift the rest of the line.
function bsMix(shared, own, chance) {
    const s = randomArray(shared), r = rand(), use = rand() < chance;
    return own && use ? own[Math.floor(r * own.length)] : s;
}

// The same, over a line already rolled: a background (or class) list may take over.
function bsOwn(text, own, chance) {
    const r = rand(), use = rand() < chance;
    return own && use ? own[Math.floor(r * own.length)] : text;
}

// Swaps in a newer line (more()) for share of the draws; the rest keep the old one.
function bsMore(text, more, share) {
    return rand() < share ? more() : text;
}

const bsBg = (g, part) => BS_BG[g.bg] && BS_BG[g.bg][part];

// fillTemplate, with older relatives, and "their" made "my" in first-person lines.
// Draws exactly what fillTemplate does, so old lines keep their picks.
function bsFill(text, mine = false) {
    return text.replace(/\{(\w+)\}/g, (m, key) => {
        const list = BS_FILL[key] || npcData.fill[key];
        if (!list) return m;
        const v = randomArray(list);
        return mine ? v.replace(/^their /, 'my ') : v;
    });
}

const bs = { seed: '', race: '', cls: '', bg: '', gender: '', set: {}, lock: [] };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('bs-status');
    el.textContent = msg;
    el.classList.toggle('bs-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

const bsLineSeed = id => bs.set[id] || deriveSeed(bs.seed, id);
const bsLine = id => withSeed(bsLineSeed(id), () => BS_ROLL[id](bs));
const bsAll = () => Object.fromEntries(BS_IDS.map(id => [id, bsLine(id)]));

// ── Address bar ──────────────────────────────────────────
function bsParams() {
    const p = { seed: bs.seed };
    if (bs.race) p.race = bs.race;
    if (bs.cls) p.cls = bs.cls;
    if (bs.bg) p.bg = bs.bg;
    if (bs.gender) p.g = bs.gender;
    const set = BS_IDS.filter(id => bs.set[id]).map(id => `${id}.${bs.set[id]}`);
    if (set.length) p.set = set.join(',');
    if (bs.lock.length) p.lock = bs.lock.join(',');
    return p;
}

function bsFromUrl() {
    const q = urlParams();
    bs.seed = parseSeed(q.get('seed')) || newSeed();
    bs.race = cbRace(q.get('race')) ? q.get('race') : '';
    bs.cls = cbClass(q.get('cls')) ? q.get('cls') : '';
    bs.bg = BS_BG[q.get('bg')] ? q.get('bg') : '';
    bs.gender = BS_GENDERS.some(g => g[0] && g[0] === q.get('g')) ? q.get('g') : '';
    bs.set = {};
    (q.get('set') || '').split(',').forEach(t => {
        const [id, seed] = t.split('.');
        if (BS_IDS.includes(id) && parseSeed(seed)) bs.set[id] = seed;
    });
    bs.lock = [...new Set((q.get('lock') || '').split(',').filter(id => BS_IDS.includes(id)))];
}

function bsChanged() {
    setUrlParams(bsParams(), false);
    render();
}

// ── Drawing ──────────────────────────────────────────────
function render() {
    document.getElementById('bs-race').value = bs.race;
    document.getElementById('bs-class').value = bs.cls;
    document.getElementById('bs-bg').value = bs.bg;
    document.getElementById('bs-gender').value = bs.gender;
    const lines = bsAll();
    document.getElementById('bs-lines').innerHTML = BS_LINES.map(([id, label]) => {
        const locked = bs.lock.includes(id);
        return `<div class="bs-line${locked ? ' bs-locked' : ''}">
            <span class="bs-label">${label}</span>
            <span class="bs-text">${esc(lines[id])}</span>
            <span class="bs-tools">
              <button type="button" class="bs-icon" data-lock="${id}" aria-pressed="${locked}" aria-label="${locked ? 'Unlock' : 'Keep'} ${label}" title="${locked ? 'Kept: 🎲 Roll New Backstory leaves it alone' : 'Keep this line'}">${locked ? '🔒' : '🔓'}</button>
              <button type="button" class="bs-icon" data-reroll="${id}" aria-label="Reroll ${label}" title="Reroll this line">🎲</button>
            </span>
        </div>`;
    }).join('');
}

function renderChars() {
    const sel = document.getElementById('bs-char');
    const was = sel.value;
    const list = cbLoadAll();
    sel.innerHTML = '<option value="">A new character</option>' + list.map(c => {
        const k = cbClass(c.cls), r = cbRace(c.race);
        const about = [r && r.name, k && `${k.name} ${c.level}`].filter(Boolean).join(' ');
        return `<option value="${c.id}">${esc(c.name || 'Unnamed character')}${about ? ` (${esc(about)})` : ''}</option>`;
    }).join('');
    if (list.some(c => c.id === was)) sel.value = was;
}

// ── Actions ──────────────────────────────────────────────
function bsText(withName = true) {
    const lines = bsAll();
    const bg = BS_BACKGROUNDS.find(b => b[0] && b[0] === bs.bg);
    const out = BS_LINES.filter(([id]) => withName || id !== 'name').map(([id, label]) => `${label}: ${lines[id]}`);
    if (bg) out.splice(withName ? 1 : 0, 0, `Background: ${bg[1].replace(/^\S+ /, '')}`);
    return out.join('\n');
}

let spellsLoading = null;
function loadSpells() {
    if (typeof SPELLS_DATA !== 'undefined') return Promise.resolve();
    if (!spellsLoading) spellsLoading = new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'spells-data.js';
        s.onload = ok;
        s.onerror = () => { spellsLoading = null; fail(); };
        document.head.appendChild(s);
    });
    return spellsLoading;
}

// Writes the backstory into a builder character's notes (after anything already
// there), and its name if the character has none. A new character also takes
// the race and class picked here. The builder opens the newest edit, so it lands on it.
async function useForCharacter() {
    const btn = document.getElementById('bs-use');
    btn.disabled = true;
    const fail = msg => { flash(msg, true); btn.disabled = false; };
    try {
        // Saving re-cleans every saved character, which drops spells it can't look up.
        await loadSpells();
    } catch (e) {
        return fail('Could not load the spell list; check your connection and try again.');
    }
    const id = document.getElementById('bs-char').value;
    const list = cbLoadAll();
    let c = id ? list.find(x => x.id === id) : null;
    if (id && !c) { renderChars(); return fail('That character is gone; pick another.'); }
    if (!c) {
        if (list.length >= CB_MAX) return fail(`You have ${CB_MAX} characters saved; delete one in the Character Builder first.`);
        c = cbBlank();
        const r = cbRace(bs.race);
        c.race = bs.race;
        c.subrace = r && r.subraces ? r.subraces[0].id : '';
        c.cls = bs.cls;
    }
    if (!c.name) c.name = bsLine('name').slice(0, 60);
    const block = 'Backstory\n' + bsText(false);
    const notes = c.notes.trim() ? `${c.notes.trimEnd()}\n\n${block}` : block;
    if (notes.length > 4000) return fail('That character\'s notes are nearly full (4,000 characters); trim them in the builder first.');
    c.notes = notes;
    if (!cbSave(c)) return fail('Could not save: this browser\'s storage is full or blocked.');
    location.href = 'character-builder';
}

function rollNew() {
    bs.seed = newSeed();
    BS_IDS.forEach(id => { if (!bs.lock.includes(id)) delete bs.set[id]; });
    bsChanged();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('bs-race').innerHTML = '<option value="">Any race</option>' + CB_RACES.map(r => `<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join('');
    document.getElementById('bs-class').innerHTML = '<option value="">Any class</option>' + CB_CLASSES.map(k => `<option value="${k.id}">${k.icon} ${esc(k.name)}</option>`).join('');
    document.getElementById('bs-bg').innerHTML = BS_BACKGROUNDS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
    document.getElementById('bs-gender').innerHTML = BS_GENDERS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');

    bsFromUrl();
    setUrlParams(bsParams(), false);
    render();
    renderChars();

    document.getElementById('bs-lines').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        const id = b.dataset.lock || b.dataset.reroll;
        if (b.dataset.lock) {
            if (bs.lock.includes(id)) bs.lock = bs.lock.filter(x => x !== id);
            else { bs.lock.push(id); bs.set[id] = bsLineSeed(id); }
        } else {
            bs.set[id] = newSeed();
        }
        bsChanged();
        const again = document.querySelector(`#bs-lines [data-${b.dataset.lock ? 'lock' : 'reroll'}="${id}"]`);
        if (again) again.focus();
    });
    document.getElementById('bs-roll').addEventListener('click', rollNew);
    // Name, the mentor and rival, grew-up, and turning points follow the race; why-I-adventure,
    // the secret, and the mentor's lesson the class; grew-up, why, the secret, and the mentor
    // the background. A kept line keeps its seed, so it can still change with them.
    ['race', 'class', 'bg', 'gender'].forEach(f => document.getElementById('bs-' + f).addEventListener('change', e => {
        bs[f === 'class' ? 'cls' : f] = e.target.value;
        bsChanged();
    }));
    document.getElementById('bs-copy').addEventListener('click', () => {
        const text = bsText();
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => flash('📋 Backstory copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    });
    document.getElementById('bs-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied.', ok === false)));
    document.getElementById('bs-print').addEventListener('click', () => window.print());
    document.getElementById('bs-use').addEventListener('click', useForCharacter);
    window.addEventListener('popstate', () => { bsFromUrl(); render(); });
    window.addEventListener('storage', e => { if (e.key === CB_KEY || e.key === null) renderChars(); });
});
