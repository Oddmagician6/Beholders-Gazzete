/* ============================================
   PANTHEON ENGINE (F34, Worldbuilder)
   A seeded set of gods: each with a name and epithet, a cleric domain and what
   they rule over, an alignment, a holy symbol, how they're shown, a holy day,
   what the faithful must and mustn't do, the temple and its priests, what they
   want from adventurers, and omens. The pantheon has a shape (a family, a court,
   two camps, or many peoples' gods), a creation story, an afterlife, and feuds.
   Every part rolls from deriveSeed(seed, part), so changing one option keeps the rest:
   more gods keeps the gods already there; a new shape keeps the gods but redraws
   who rules and who feuds; a new naming style renames the gods and nothing else.
   Holy days are written for any calendar ("the first full moon of autumn") and
   land on a date with panHolyDate(god, cal) once a calendar-engine.js calendar is given.
   Needs rng.js. Domains are the cleric domain names; the tables are the Gazette's own.
   ============================================ */

const PAN_SEASONS = ['spring', 'summer', 'autumn', 'winter'];

const PAN_SIZES = {
    small:    { label: 'A few gods (4-6)', min: 4, max: 6 },
    standard: { label: 'A full pantheon (7-9)', min: 7, max: 9 },
    large:    { label: 'A crowded heaven (10-13)', min: 10, max: 13 }
};

const PAN_SHAPES = {
    family: { label: 'A divine family', icon: '👪', about: 'The gods are one family: a ruling pair, their children, and the relatives nobody talks about.' },
    court:  { label: 'A heavenly court', icon: '👑', about: 'The gods keep a court like a mortal kingdom\'s, with a throne, offices, and an exile.' },
    camps:  { label: 'Two camps', icon: '⚖️', about: 'The gods are split into two sides that have been at odds since the beginning.' },
    many:   { label: "Many peoples' gods", icon: '🧭', about: 'No single heaven: each god belongs to a people or a trade, and they only met later.' }
};

// ── Domains ──────────────────────────────────────────────
// align: weighted alignments. holy: preferred seasons and kinds of holy day.
const PAN_DOMAINS = {
    knowledge: {
        label: 'Knowledge', icon: '📚',
        portfolio: ['secrets', 'libraries', 'memory', 'prophecy', 'mathematics', 'languages', 'riddles', 'maps', 'invention', 'true names'],
        align: [['LN', 3], ['N', 3], ['LG', 2], ['NG', 1], ['LE', 1]],
        symbols: ['an open book', 'a lidless eye', 'a quill', 'a key', 'a scroll', 'an hourglass', 'an owl', 'a lamp'],
        forms: [
            'a {person} with ink-stained fingers and a hundred keys on a belt',
            'an owl the size of a house, perched on a tower of books',
            'a blindfolded {person} who reads by touch',
            'an old {person} whose shadow is always writing',
            'a {person} with a third eye shut tight in the middle of the forehead'
        ],
        must: ['Write down one new thing each day.', 'Answer any honest question a child asks.', 'Copy one page of an old book every year and give it away.', 'Teach a trade to anyone who asks and can pay in kind.', 'Keep a record of every promise made to them.', 'Name a thing correctly when it has been named wrong.'],
        mustnt: ['Burn a book, for any reason.', 'Tell a lie in writing.', 'Hide knowledge that could save a life.', 'Interrupt a scholar at work.', 'Forget a debt.', 'Read another person\'s letters.'],
        temple: [
            'a library with a dome of green glass, where the priests whisper and the readers are fined for coughing',
            'a tall narrow tower; every floor holds one subject, and the top floor is locked',
            'a stone hall lined with numbered drawers, each holding one secret confessed by the faithful',
            'an observatory with a brass roof that opens on clear nights',
            'a maze of shelves where the oldest priests have lived so long they no longer remember the way out'
        ],
        priests: ['Keepers', 'Lectors', 'Archivists', 'the Inkhands', 'Readers'],
        vestments: ['grey robes with ink-black cuffs', 'blue gowns and spectacles they don\'t need', 'brown habits with a key on a cord'],
        offering: ['a page of something they wrote', 'a secret, whispered into a jar', 'candles to read by', 'an old map'],
        followers: ['scholars, scribes, and wizards', 'clerks, lawyers, and the nosy', 'astrologers and sailors who navigate by the stars', 'inventors and their long-suffering neighbors'],
        holy: { s: ['winter', 'autumn'], kinds: [['day', 3], ['turn', 2], ['moon', 1]] },
        holyNames: ['the Night of Open Books', 'the Feast of Lamps', 'Riddlemas', 'the Long Reading', 'the Day of Questions', 'the Counting'],
        rites: [
            'The temple library opens to anyone for one night, and the faithful read aloud until dawn.',
            'Children ask the priests riddles; any priest who can\'t answer owes the child a sweet.',
            'Every debt in town is read out in the square, paid or forgiven by sunset.',
            'The faithful write a question on a slip of paper and burn it; the answer comes in a dream within the year.'
        ],
        wants: [
            'A heretic has stolen the only copy of a book the god forbade anyone to read. Get it back, unread.',
            'A wizard\'s tower has gone silent. The temple wants the library inside before the tax collectors take it.',
            'Map the ruin nobody has mapped. The temple pays by the page.',
            'Find out who has been selling the temple\'s confessed secrets.'
        ],
        omens: ['Ink that won\'t dry means the god is reading over your shoulder.', 'An owl in daylight carries a warning.', 'Pages that turn on their own mark a passage worth reading.']
    },
    life: {
        label: 'Life', icon: '🌱',
        portfolio: ['healing', 'birth', 'mercy', 'families', 'the harvest', 'the hearth', 'midwives', 'rest', 'good health', 'second chances'],
        align: [['NG', 4], ['LG', 3], ['CG', 2], ['N', 1]],
        symbols: ['an open hand', 'a sheaf of wheat', 'a full cup', 'a blooming flower', 'a cradle', 'a beating heart', 'a hearth fire', 'a loaf of bread'],
        forms: [
            'a broad, laughing {person} with flour on both hands',
            'a {person} with a newborn in one arm and a lantern in the other',
            'a white cow with gold horns',
            'a tired {person} in an apron, who has seen everything and forgiven most of it',
            'a gardener whose footprints sprout'
        ],
        must: ['Feed any stranger who comes to the door at mealtime.', 'Tend the sick, even an enemy.', 'Plant something every spring.', 'Bless every newborn they meet.', 'Share the first loaf of every baking.', 'Visit the sick on the day of rest.'],
        mustnt: ['Refuse shelter to a pregnant woman or a sick child.', 'Poison a well, a field, or a person.', 'Waste food.', 'Strike someone who has surrendered.', 'Raise the dead without their family\'s leave.', 'Turn away a patient who can\'t pay.'],
        temple: [
            'a long low hospice with a herb garden on every side and a bell the sick can ring',
            'a round hall built around a hearth that hasn\'t gone out in four hundred years',
            'a whitewashed house of healing with beds in rows and a waiting list',
            'a barn that the faithful have turned into a temple, with an altar of hay bales',
            'a domed bathhouse fed by a warm spring the sick travel weeks to sit in'
        ],
        priests: ['Menders', 'Hearthkeepers', 'Sisters and Brothers of Mercy', 'Midwives', 'Tenders'],
        vestments: ['white aprons over green robes', 'undyed wool and a sprig of rosemary', 'yellow robes stained with honest work'],
        offering: ['bread', 'a bowl of milk', 'a sick person\'s bandages, washed', 'seeds'],
        followers: ['midwives, healers, and parents', 'farmers and bakers', 'the sick and the people who love them', 'innkeepers and anyone who feeds people for a living'],
        holy: { s: ['spring', 'summer'], kinds: [['turn', 3], ['day', 2], ['moon', 1]] },
        holyNames: ['the Feast of First Bread', 'Cradlemas', 'the Day of Open Doors', 'the Greening', 'the Mending', 'Hearthday'],
        rites: [
            'Every hearth in town is relit from the temple fire, and the first meal cooked on it is given away.',
            'Children born this year are carried around the fields, and the farmers swear it helps.',
            'The temple heals anyone who comes for free, and the queue starts the night before.',
            'Feuding families must share a table and a loaf; most manage it without bloodshed.'
        ],
        wants: [
            'A plague village has been sealed off. The temple needs medicine carried in and news carried out.',
            'Someone is selling fake holy water that has started killing people.',
            'Escort a midwife through bandit country to a lord\'s wife in hard labor.',
            'A necromancer has dug up the temple\'s graveyard. Put the dead back to rest.'
        ],
        omens: ['A swallow nesting over the door means a birth within the year.', 'Bread that won\'t rise means someone in the house is lying.', 'A healing that works too well is a debt the god will collect.']
    },
    light: {
        label: 'Light', icon: '☀️',
        portfolio: ['the sun', 'truth', 'dawn', 'fire', 'beauty', 'courage', 'vision', 'hope', 'summer', 'the stars'],
        align: [['LG', 3], ['NG', 3], ['CG', 2], ['LN', 1]],
        symbols: ['a golden sun', 'a rising sun', 'a candle flame', 'a mirror', 'a sunburst', 'a star', 'a lighthouse', 'a gold ring'],
        forms: [
            'a {person} in golden armor whose face is too bright to look at',
            'a stag with a crown of fire between its antlers',
            'a smiling {person} carrying the sun on a shoulder like a basket',
            'a child holding a candle that never burns down',
            'a {person} made of stained glass, lit from inside'
        ],
        must: ['Greet the dawn with a word of thanks.', 'Speak the truth, even when it costs.', 'Keep a light in the window for travelers.', 'Expose a hidden wrong when they find one.', 'Pray facing the sun, wherever it is.', 'Carry a candle into any dark place before they enter it.'],
        mustnt: ['Do evil work at night.', 'Wear a mask or a disguise.', 'Let an undead thing walk unchallenged.', 'Put out a flame someone else lit.', 'Swear an oath in the dark.', 'Hide their face from a judge.'],
        temple: [
            'a white dome with a hole at the top, so a column of sunlight walks across the floor all day',
            'a hilltop temple of gold-leafed columns, open on every side and cold all winter',
            'a hall of mirrors that throws the morning sun into every corner of the city',
            'a lighthouse that is also a church; the sailors pray there and the priests keep the lamp',
            'a cathedral with windows of colored glass, each showing a sunrise in a different land'
        ],
        priests: ['Dawnbringers', 'Lightkeepers', 'the Radiant', 'Candlewardens', 'Heralds of the Morning'],
        vestments: ['white and gold robes that are a nightmare to keep clean', 'orange vestments and a sunburst pendant', 'polished breastplates over yellow tunics'],
        offering: ['candles', 'gold leaf', 'a song at dawn', 'a polished mirror'],
        followers: ['paladins, judges, and honest merchants', 'farmers who need sun and sailors who need lighthouses', 'anyone afraid of the dark', 'artists and glassmakers'],
        holy: { s: ['summer', 'spring'], kinds: [['turn', 4], ['day', 1]] },
        holyNames: ['the Feast of the First Dawn', 'Highsun', 'the Day Without Shadows', 'Lightsmas', 'the Kindling', 'Sunreturn'],
        rites: [
            'The faithful climb the highest hill to watch the sunrise and sing until it clears the horizon.',
            'Every lamp in the city is lit at noon, and anyone caught in the shade is teased for it.',
            'Judges hold court in the open square from dawn to dusk, and anyone may bring a grievance.',
            'The priests pass a single flame from candle to candle until the whole town is lit.'
        ],
        wants: [
            'A vampire has moved into the old manor. The temple will pay well and ask few questions.',
            'The lighthouse on the point has gone dark, and three ships have wrecked since.',
            'Expose a magistrate who takes bribes; the temple has proof but no one brave enough to carry it.',
            'Recover a sunstone stolen from the altar before the solstice.'
        ],
        omens: ['A sunbeam that falls on someone during prayer marks them for a task.', 'A candle that gutters with no wind means a lie was just told.', 'A cloudless holy day means a good year.']
    },
    nature: {
        label: 'Nature', icon: '🌳',
        portfolio: ['forests', 'beasts', 'rivers', 'the hunt', 'growth', 'mountains', 'the wild places', 'seasons', 'rain', 'bees'],
        align: [['N', 5], ['NG', 2], ['CN', 2], ['CG', 1]],
        symbols: ['an oak leaf', 'a stag\'s antlers', 'a coiled serpent', 'a bear\'s paw', 'an acorn', 'a wolf\'s head', 'a bee', 'a green branch'],
        forms: [
            'a great elk with moss for fur',
            'a {person} with bark for skin and birds nesting in the hair',
            'a wolf that walks on two legs when nobody\'s looking',
            'an old {person} with a crooked staff and a fox at heel',
            'a swarm of bees in roughly the shape of a {person}'
        ],
        must: ['Thank any animal they kill, and use all of it.', 'Leave the first fruit of every tree for the birds.', 'Plant a tree for every one they cut.', 'Sleep under the open sky one night a month.', 'Keep a wild place wild.', 'Help an animal in a trap, even a wolf.'],
        mustnt: ['Kill a creature for sport.', 'Fell a tree older than their grandmother.', 'Foul a river or a spring.', 'Cage a wild bird.', 'Build where the forest has not given leave.', 'Eat meat during the god\'s holy days.'],
        temple: [
            'a ring of standing stones in a clearing, with an altar that is just a very old stump',
            'a grove where the trees have been coaxed to grow into the shape of a hall',
            'no building at all: a cave behind a waterfall, where the priests leave offerings on a wet stone',
            'a wooden lodge hung with antlers, smelling of smoke and pine',
            'a hollow inside a living oak big enough to hold thirty people and a goat'
        ],
        priests: ['Wardens', 'Greenmantles', 'the Rooted', 'Speakers for the Wood', 'Keepers of the Grove'],
        vestments: ['green and brown cloaks pinned with a thorn', 'deerskin and a crown of leaves that changes with the season', 'wool robes dyed with moss'],
        offering: ['the first fruit of the season', 'a feather', 'honey', 'a drink of river water poured onto roots'],
        followers: ['druids, rangers, and hunters', 'woodcutters, who pray hard and often', 'shepherds and beekeepers', 'elves and gnomes of the deep woods'],
        holy: { s: ['spring', 'autumn', 'summer'], kinds: [['moon', 3], ['turn', 2], ['day', 2]] },
        holyNames: ['the Greening', 'the Night of Antlers', 'the Wild Hunt', 'the Blossoming', 'the Feast of Bees', 'Leaffall'],
        rites: [
            'The faithful walk barefoot into the woods at dusk and come back at dawn with something green.',
            'Hunters release the first beast they catch, and the whole village goes hungry until the second.',
            'Masked dancers in antlers chase the young folk through the trees; being caught is good luck.',
            'Seeds blessed at the grove are sown by hand across every field in the district.'
        ],
        wants: [
            'Loggers are cutting the sacred grove, and they have a lord\'s writ to do it.',
            'A beast that should not exist is killing deer in the old forest. Find where it came from.',
            'Poachers are taking white stags. The grove wants them stopped, not necessarily alive.',
            'The spring at the head of the river has turned bitter. Find out what\'s at the bottom.'
        ],
        omens: ['A white animal on the road means the god is watching.', 'A tree that blooms out of season marks a birth or a death.', 'Crows that follow a traveler carry a message for them.']
    },
    tempest: {
        label: 'Tempest', icon: '⛈️',
        portfolio: ['storms', 'the sea', 'thunder', 'wind', 'sailors', 'earthquakes', 'floods', 'lightning', 'weather', 'drowning'],
        align: [['CN', 4], ['N', 2], ['CE', 2], ['CG', 1], ['LN', 1]],
        symbols: ['a lightning bolt', 'a trident', 'a breaking wave', 'a storm cloud', 'a ship\'s wheel', 'a hammer', 'a whirlwind', 'a conch shell'],
        forms: [
            'a giant {person} with storm clouds for hair and a voice that rattles windows',
            'a sea serpent as long as a coastline',
            'a one-eyed {person} with a drowned sailor\'s complexion',
            'a black horse that runs on top of the waves',
            'a {person} carrying a hammer that throws sparks'
        ],
        must: ['Pour out a drink for the god before every voyage.', 'Rescue anyone in the water, whatever the risk.', 'Shout back at the thunder.', 'Pay the boatman\'s tithe at every harbor.', 'Give a share of every catch to the sea.', 'Bury the drowned with their faces to the water.'],
        mustnt: ['Whistle on a ship (it calls the wind).', 'Swear a false oath in a storm.', 'Turn back a ship once it has sailed for the god.', 'Build a house where lightning has struck.', 'Curse the weather.', 'Sail on the god\'s holy day.'],
        temple: [
            'a squat stone temple on the cliffs, its roof weighed down with anchors and its bell rung by the wind',
            'a temple built on stilts over the harbor; at high tide the faithful pray with wet feet',
            'a blackened tower on a hilltop, struck by lightning so often the priests count it as a blessing',
            'an old warship hauled up the beach and roofed over, with the altar where the mast was',
            'a cave in the sea cliffs, reachable only at low tide'
        ],
        priests: ['Stormcallers', 'Wavewardens', 'the Drowned', 'Thunderers', 'Windspeakers'],
        vestments: ['sea-blue robes that are always damp', 'oilskins and a copper bracelet', 'grey robes with silver lightning embroidered at the hem'],
        offering: ['rum poured into the sea', 'a fish from every catch', 'iron nails', 'a sailor\'s braid'],
        followers: ['sailors, fishers, and their worried families', 'farmers who need rain and fear hail', 'smiths and anyone who works with fire and iron', 'pirates, quietly'],
        holy: { s: ['autumn', 'spring', 'winter'], kinds: [['day', 3], ['moon', 2], ['turn', 1]] },
        holyNames: ['the Storm Vigil', 'Drowning Night', 'the Thunder Feast', 'the Casting of the Nets', 'the Calming', 'Galeday'],
        rites: [
            'The fleet stays in harbor and the priests row out alone to bless the waters, and not all of them come back.',
            'The faithful bang drums and pots all night to answer the thunder.',
            'A straw ship loaded with the town\'s bad luck is set alight and pushed out to sea.',
            'Names of the drowned are read from the cliffs while the faithful throw flowers into the surf.'
        ],
        wants: [
            'A ship carrying the temple\'s tithe went down in clear weather. Find out why, and fetch the tithe.',
            'Someone is selling bottled storms to pirates. The temple wants the bottler.',
            'A sea serpent has blocked the trade lanes. The temple says it\'s the god\'s anger, and will pay to have the cause found.',
            'Ring the bell on the drowned island before the equinox gales, or the town floods.'
        ],
        omens: ['St. Elmo\'s fire on the mast means the god is aboard.', 'Gulls flying inland mean a storm in three days.', 'Thunder on a clear day is the god laughing at someone.']
    },
    trickery: {
        label: 'Trickery', icon: '🎭',
        portfolio: ['luck', 'thieves', 'lies', 'games of chance', 'travelers', 'mischief', 'shadows', 'merchants', 'disguises', 'freedom'],
        align: [['CN', 4], ['CG', 2], ['CE', 2], ['N', 1]],
        symbols: ['a pair of dice', 'a mask', 'a coin spinning on its edge', 'a fox', 'a crooked key', 'a smiling crescent', 'a jester\'s cap', 'a magpie'],
        forms: [
            'a grinning fox in a stolen coat',
            'a {person} whose face is different every time someone looks',
            'a beggar with very fine shoes',
            'a magpie that talks in other people\'s voices',
            'a {person} with two faces, one laughing and one asleep'
        ],
        must: ['Tip a coin to the god before any wager.', 'Tell a good lie once a year, and confess it on the holy day.', 'Help a prisoner escape, if the cause is fair.', 'Laugh at their own misfortune.', 'Share their winnings with the next beggar they see.', 'Leave a door unlocked for the god once a month.'],
        mustnt: ['Cheat a friend.', 'Keep a promise made under duress, unless it amuses them.', 'Refuse a fair bet.', 'Inform on a fellow thief.', 'Lock up a songbird.', 'Take the same road home twice in a row.'],
        temple: [
            'a temple hidden behind a tavern; the password changes every night and the priests sell the old ones',
            'a crooked house of a dozen doors, only one of which leads in',
            'a gambling hall with an altar at the back where the house\'s cut goes to the god',
            'a roadside shrine of piled coins and odd shoes that no thief will touch',
            'a theater whose stage is the altar; the priests are all actors and the sermons are comedies'
        ],
        priests: ['Jesters', 'Lucklings', 'the Masked', 'Cutpurses of the Faith', 'Gamblers'],
        vestments: ['motley in clashing colors', 'whatever they stole that morning', 'black cloaks and a half mask'],
        offering: ['a stolen coin', 'a good joke', 'a die that rolled a six', 'a lock with no key'],
        followers: ['thieves, gamblers, and actors', 'merchants and travelers', 'escaped prisoners and runaway apprentices', 'anyone about to roll the dice'],
        holy: { s: ['spring', 'summer', 'autumn', 'winter'], kinds: [['moon', 3], ['day', 2], ['turn', 1]] },
        holyNames: ['the Feast of Fools', 'the Night of Masks', 'the Lucky Day', 'Topsy-Turvy Day', 'the Great Swindle', 'Dicemas'],
        rites: [
            'Servants and masters swap clothes for a day, and the servants make the most of it.',
            'Everyone wears a mask until midnight, and no oath sworn under one counts.',
            'The temple runs a lottery whose prize is always odder than the ticket buyers expect.',
            'The faithful play pranks on the temple\'s enemies, and the guard pretends not to notice.'
        ],
        wants: [
            'Steal back a relic that a rival temple stole first. Getting caught is the only sin.',
            'Win a rigged card game against a crime lord, without cheating more than the house does.',
            'Free a falsely imprisoned priest before the hanging on the holy day.',
            'Someone is forging the god\'s lucky coins. Find the forger and offer them a job.'
        ],
        omens: ['A coin found on its edge is a gift and a warning.', 'A magpie that steals from you means your luck has turned.', 'Losing your hat in the wind means someone is about to lie to you.']
    },
    war: {
        label: 'War', icon: '⚔️',
        portfolio: ['battle', 'valor', 'strategy', 'soldiers', 'victory', 'honor', 'the sword', 'conquest', 'revenge', 'walls'],
        align: [['LN', 2], ['LG', 2], ['LE', 2], ['CE', 2], ['CN', 1], ['N', 1]],
        symbols: ['a sword', 'a shield', 'a red banner', 'a gauntleted fist', 'a broken spear', 'a helmet', 'a war horn', 'a burning tower'],
        forms: [
            'a scarred {person} in battered armor, always just back from somewhere',
            'a red bull with iron horns',
            'a giant on a black horse, carrying a banner nobody recognizes',
            'a {person} with a sword for a right hand',
            'a vulture that circles every battlefield'
        ],
        must: ['Keep their weapon clean and their oath cleaner.', 'Bury the enemy dead as well as their own.', 'Train with arms every day.', 'Answer every challenge to single combat.', 'Pay the soldiers first and themselves last.', 'Pray before battle, briefly.'],
        mustnt: ['Flee a battle they swore to fight.', 'Strike a herald or a flag of truce.', 'Leave a comrade on the field.', 'Poison a weapon.', 'Surrender their sword.', 'Fight on the god\'s holy day, unless attacked.'],
        temple: [
            'a fortress-church with arrow slits for windows; in a siege it becomes the last redoubt',
            'a long hall hung with the banners of every army that ever lost to the faithful',
            'a training yard with an altar at one end, where the priests drill the town militia',
            'a tomb-temple over the bones of a hero, guarded by veterans who fought beside them',
            'a tower built from the stones of a conquered city\'s walls'
        ],
        priests: ['Swordbrothers and Swordsisters', 'Marshals', 'the Bloodsworn', 'Wardens of the Wall', 'Champions'],
        vestments: ['red tabards over mail', 'black armor polished like mirrors', 'grey cloaks and a scar each, real or painted'],
        offering: ['a weapon taken in battle', 'a lock of hair before a fight', 'red wine', 'a captured banner'],
        followers: ['soldiers, guards, and mercenaries', 'smiths and fletchers', 'nobles who want an excuse', 'widows who want revenge'],
        holy: { s: ['spring', 'summer'], kinds: [['day', 3], ['turn', 2]] },
        holyNames: ['the Muster', 'the Day of Banners', 'Shieldmas', 'the Remembering of the Fallen', 'the Sharpening', 'Victory Day'],
        rites: [
            'The militia parades in full kit and the faithful judge whose armor is shiniest.',
            'Champions fight duels in the temple yard; first blood wins and the loser buys the drinks.',
            'The names of the fallen are carved on the temple wall, and veterans tell how each one died.',
            'Every weapon in town is brought to the altar to be blessed, and some are confiscated.'
        ],
        wants: [
            'A border fort hasn\'t sent a rider in a month. The temple wants to know why before the lord does.',
            'Retrieve the war banner of a fallen hero from the warlord who took it.',
            'Train the village militia before the raiders come back in spring.',
            'A champion of the faith died in a duel that was rigged. Prove it.'
        ],
        omens: ['A blade that rusts overnight means a coward in the ranks.', 'Ravens on the left before a battle mean victory.', 'Dreaming of an empty helmet means a death in the family.']
    },
    death: {
        label: 'Death', icon: '💀',
        portfolio: ['the dead', 'graves', 'endings', 'the afterlife', 'winter', 'fate', 'mourning', 'judgment', 'the night', 'ancestors'],
        align: [['N', 3], ['NE', 3], ['LE', 2], ['LN', 2], ['CE', 1]],
        symbols: ['a skull', 'a black rose', 'a scythe', 'a ferryman\'s oar', 'a closed door', 'a raven', 'a snuffed candle', 'a set of scales'],
        forms: [
            'a hooded ferryman with coins for eyes',
            'a pale {person} who smells of fresh earth',
            'a raven bigger than a man',
            'a kind old {person} with a lantern, who waits at the end of every road',
            'a {person} in a black veil whose face is the face of whoever looks'
        ],
        must: ['Bury the dead with a coin for the ferry.', 'Speak the names of their ancestors once a year.', 'Sit with the dying, so nobody dies alone.', 'Put the undead back in the ground.', 'Wear black for a month after a death in the family.', 'Pay their debts before they die.'],
        mustnt: ['Raise the dead, for any reason.', 'Rob a grave.', 'Cheat death, which includes most healing potions, depending on the priest.', 'Speak ill of the newly dead.', 'Step over a grave.', 'Fear death in public.'],
        temple: [
            'a black-stone temple in the middle of the graveyard, cool even in summer',
            'an ossuary chapel whose walls are built from the bones of the faithful, arranged with care',
            'a quiet house by the river where the bodies are washed and the boats leave at dusk',
            'catacombs under the city where the priests know every tunnel and every tenant',
            'a hall of mirrors draped in black cloth; the cloths come off only at funerals'
        ],
        priests: ['Gravekeepers', 'the Pale Sisters', 'Ferrymen', 'Mourners', 'the Silent'],
        vestments: ['black robes and white face paint', 'grey veils and a coin on a string', 'undyed shrouds with the hood always up'],
        offering: ['coins for the ferry', 'black candles', 'grave dirt from an ancestor', 'bread left out overnight'],
        followers: ['undertakers, gravediggers, and executioners', 'the old and the grieving', 'necromancers, to the god\'s annoyance', 'anyone with a dead grandmother who still visits'],
        holy: { s: ['autumn', 'winter'], kinds: [['moon', 3], ['turn', 2], ['day', 1]] },
        holyNames: ['the Long Night', 'the Feast of the Dead', 'the Night of Names', 'Lanternfall', 'the Silent Day', 'the Judgment'],
        rites: [
            'Lanterns are set on every grave and the families eat supper among them.',
            'Nobody speaks from dusk to dawn; the priests claim the dead are listening.',
            'Every grave in the yard is swept and every name read aloud by the priests.',
            'The faithful leave their doors open so the dead can come home for a meal.'
        ],
        wants: [
            'A lich in the old crypts is keeping souls from passing on. The temple wants them freed.',
            'Grave robbers have taken a saint\'s bones. Return them before the holy day.',
            'Escort a coffin across the country to a family tomb; it is heavier than it should be.',
            'A man who should have died a year ago is still walking around. Find out what he paid.'
        ],
        omens: ['A raven on the roof means a death in the house within the month.', 'A candle that burns blue means the dead are near.', 'Hearing your name called from an empty room means you have a year left. Probably.']
    }
};

const PAN_DOMAIN_KEYS = Object.keys(PAN_DOMAINS);

// Domains that tend to quarrel (feuds favor these pairs).
const PAN_OPPOSED = [['life', 'death'], ['light', 'trickery'], ['light', 'death'], ['nature', 'war'], ['tempest', 'knowledge'], ['knowledge', 'trickery'], ['nature', 'knowledge'], ['life', 'war'], ['tempest', 'nature']];

const PAN_ALIGN_LABELS = {
    LG: 'Lawful good', NG: 'Neutral good', CG: 'Chaotic good',
    LN: 'Lawful neutral', N: 'Neutral', CN: 'Chaotic neutral',
    LE: 'Lawful evil', NE: 'Neutral evil', CE: 'Chaotic evil'
};

// ── Names ────────────────────────────────────────────────
const PAN_NAMING = {
    lyrical: {
        label: 'Lyrical', icon: '🎼',
        onset: ['Ae', 'Sel', 'Ith', 'Mae', 'Ly', 'Ys', 'Ora', 'Thal', 'Vey', 'Cal', 'Nim', 'Eli', 'Sora', 'Lua', 'Fae', 'Ilu', 'Rhia', 'Va'],
        mid: ['', '', 'an', 'ar', 'el', 'is', 'or', 'ri', 'la', 'ne', 'va'],
        end: ['a', 'ion', 'iel', 'ara', 'ys', 'eth', 'ine', 'os', 'is', 'wen', 'ael', 'anthe', 'ora']
    },
    stern: {
        label: 'Stern', icon: '🪨',
        onset: ['Kor', 'Brak', 'Dur', 'Grim', 'Thar', 'Vol', 'Mor', 'Hask', 'Ulg', 'Kast', 'Rhun', 'Tor', 'Gorm', 'Skal', 'Drak', 'Hrod', 'Varn', 'Bel'],
        mid: ['', '', '', 'a', 'o', 'e', 'u'],
        end: ['ak', 'un', 'oth', 'gar', 'ek', 'im', 'ul', 'as', 'ok', 'rad', 'mund', 'ric', 'dra', 'ga']
    },
    ancient: {
        label: 'Ancient', icon: '🏺',
        onset: ['Ash', 'Ama', 'Nek', 'Ish', 'Sab', 'Uru', 'Tem', 'Zer', 'Mesh', 'Ebb', 'Nin', 'Ush', 'Tal', 'Kher', 'Ap', 'Seb', 'Ord', 'Ila'],
        mid: ['', 'a', 'e', 'u', 'i', 'ar', 'en'],
        end: ['tet', 'rak', 'hu', 'shar', 'mun', 'zet', 'tum', 'ra', 'nis', 'kesh', 'ut', 'apis', 'el', 'osh']
    },
    titles: {
        label: 'Titles only', icon: '🕯️',
        about: 'The gods\' true names are secret; mortals use titles.'
    }
};

// Real-world and well-known fantasy god names a syllable roll must never produce.
const PAN_BANNED = new Set(['thor', 'ra', 'isis', 'anu', 'ishtar', 'set', 'odin', 'loki', 'hel', 'tyr', 'mars', 'pan', 'nut', 'ptah', 'amun', 'enki', 'baal', 'mot', 'kali', 'lir', 'freya', 'hera', 'ares', 'apis', 'aten', 'seth', 'nike', 'eris', 'thoth', 'osiris', 'inanna', 'ea', 'el', 'dagon', 'mystra', 'lathander', 'bane', 'selune', 'tymora', 'torm', 'helm', 'oghma', 'kelemvor', 'moradin', 'corellon', 'gruumsh', 'pelor', 'vecna', 'lolth', 'tiamat', 'bahamut', 'shar', 'sune', 'talos', 'umberlee', 'mask', 'cyric', 'ilmater', 'chauntea', 'silvanus', 'mielikki', 'auril', 'malar', 'gond', 'lliira', 'waukeen', 'azuth', 'savras', 'deneir', 'milil', 'eldath', 'garl', 'yondalla', 'sehanine', 'erevan', 'labelas', 'tharizdun', 'nerull', 'hextor', 'heironeous', 'kord', 'obad', 'wee', 'boccob', 'olidammara', 'zehir', 'erathis', 'ioun', 'melora', 'sehanine', 'torog', 'avandra', 'bel', 'kas', 'ishtar', 'nergal', 'marduk', 'tammuz', 'anubis', 'sekhmet', 'hathor', 'horus', 'kor']);

// Title-style names: [title, epithet]. Used by the 'titles' naming and now and then by the others.
const PAN_TITLES = {
    knowledge: ['the Librarian', 'the Lamplighter', 'the Keeper of Keys', 'the Owl', 'the Counter', 'the Scribe'],
    life:      ['the Mother of Bread', 'the Mender', 'the Midwife', 'the Hearthkeeper', 'the Gardener', 'the Good Shepherd'],
    light:     ['the Morning', 'the Lantern', 'the Bright One', 'the Golden Judge', 'the Herald', 'the Sunrider'],
    nature:    ['the Green Stag', 'the Old One of the Wood', 'the Beekeeper', 'the Huntsman', 'the Thorn', 'the River'],
    tempest:   ['the Thunderer', 'the Drowner', 'the Stormfather', 'the Wavecrest', 'the Gale', 'the Hammer'],
    trickery:  ['the Fox', 'the Jester', 'the Lucky One', 'the Stranger', 'the Magpie', 'the Smiling Mask'],
    war:       ['the Red Marshal', 'the Shield', 'the Bull', 'the Warden of the Wall', 'the Spear', 'the Victor'],
    death:     ['the Ferryman', 'the Pale Lady', 'the Gatekeeper', 'the Gravedigger', 'the Last Guest', 'the Raven']
};

// Epithets: "the X of Y". {p} = one portfolio word.
const PAN_EPITHET_HEADS = {
    goddess: ['Lady', 'Mother', 'Queen', 'Sister', 'Maiden', 'Mistress'],
    god:     ['Lord', 'Father', 'King', 'Brother', 'Old Man', 'Master'],
    deity:   ['Keeper', 'Voice', 'Hand', 'Eye', 'Warden', 'Heart']
};
const PAN_EPITHET_PLAIN = ['the Unsleeping', 'the Patient', 'the Wanderer', 'the Many-Handed', 'the Grey', 'the Unforgiving', 'the Laughing', 'the Twice-Born', 'the Quiet', 'the Burning', 'the Faithful', 'the Hungry'];

// ── The pantheon as a whole ──────────────────────────────
const PAN_NUMBER_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen'];
const PAN_NAMES = ['the {N}', 'the High Hall', 'the Old Gods', 'the Bright Company', 'the Court Above', 'the Firmament', 'the Hearth of Heaven', 'the {N} Thrones', 'the Elder Circle', 'the Watchers'];
const PAN_HOMES = [
    'a city on the far side of the sky, reached by a bridge that only the dead may cross',
    'a mountain so tall its top is in another world',
    'a great hall under the sea, with windows of ice',
    'the moon, which they share badly',
    'a garden at the center of the world that mortals have found three times and lost three times',
    'nowhere: the gods live in their temples and are only as strong as their congregations',
    'a fortress on the edge of the stars, built to keep something out',
    'an endless library where each god has a wing'
];
const PAN_CREATIONS = {
    family: [
        'In the beginning there were only the two eldest, and they quarreled; every one of their children was born from an argument.',
        'The eldest found the world as an egg and sat on it for a thousand years; their children hatched with it.',
        'The first parents made the world as a home for their children, and the children have been rearranging the furniture ever since.'
    ],
    court: [
        'The first of the gods won the throne of heaven in a war, then gave each ally an office so none of them would want it.',
        'The world was built by the gods as a kingdom, with a charter that the oldest priests still argue about.',
        'Heaven was empty until the throne appeared; whoever sat on it first became the ruler, and the rest came to petition.'
    ],
    camps: [
        'The world was made in a war between the two sides, and the mountains are where the blows fell.',
        'Light and dark were one god once; the split made the world, and both halves want it back.',
        'The two sides made the world together under a truce, and each one wrote half of the rules.'
    ],
    many: [
        'Each people had its own story of the beginning, and when they met, the gods argued for a century over whose was true.',
        'The world was here first; the gods arrived later, one at a time, each following the people who believed in them.',
        'Nobody made the world. The gods grew out of it, like mushrooms after rain, wherever enough people prayed.'
    ]
};
const PAN_AFTERLIVES = [
    'The dead cross a river; those who die with a coin for the ferry cross dry.',
    'Each soul goes to the god it served best, whether it meant to or not.',
    'The dead are weighed against a feather and sent up, down, or back.',
    'The good dead feast in the halls of the gods; the rest wander the grey lands until someone remembers them.',
    'Souls return to the world in new bodies, and the priests claim to know who was who.',
    'Nobody knows. The gods don\'t say, and the priests who claim to know don\'t agree.'
];
const PAN_WALKS = [
    'The gods walk the world in disguise once a year, so it pays to be kind to strangers.',
    'The gods never come down; they send avatars, omens, and very occasionally a plague.',
    'The gods speak only through their high priests, who all claim to hear them clearly.',
    'A god walked the world openly once, a century ago, and nobody agrees on what it said.',
    'The gods answer prayers, but slowly, and always with a price written in small print.'
];

// ── Relationships ────────────────────────────────────────
const PAN_KIN = {
    parent:  { goddess: 'mother', god: 'father', deity: 'parent' },
    child:   { goddess: 'daughter', god: 'son', deity: 'child' },
    sibling: { goddess: 'sister', god: 'brother', deity: 'sibling' },
    spouse:  { goddess: 'wife', god: 'husband', deity: 'spouse' },
    elder:   { goddess: 'All-Mother', god: 'All-Father', deity: 'Eldest' }
};
const PAN_COURT_OFFICES = ['the Herald', 'the Judge', 'the Champion', 'the Steward', 'the Keeper of the Gate', 'the Chancellor', 'the Master of the Hunt', 'the Royal Physician', 'the Spymaster', 'the Treasurer', 'the Chronicler', 'the Gardener of Heaven'];
const PAN_PEOPLES = ['the hill clans', 'the river towns', 'the dwarves of the deep halls', 'the elves of the old forest', 'the sea peoples', 'the halfling shires', 'the horse nomads', 'the old empire', 'the mountain monasteries', 'the desert caravans', 'the northern raiders', 'the city guilds', 'the gnomes of the warrens'];
const PAN_CAMP_NAMES = {
    good:  [['the Bright Court', 'the Hollow Court'], ['the Dawn', 'the Dusk'], ['the Shepherds', 'the Wolves']],
    law:   [['the Order', 'the Wild'], ['the Builders', 'the Breakers'], ['the Wall', 'the Storm']],
    age:   [['the Old Gods', 'the Young Gods'], ['the First', 'the Usurpers'], ['the Sleepers', 'the Waking']]
};

// Feuds: {a} and {b} are god names.
const PAN_FEUD_WHY = [
    '{a} stole {b}\'s {thing} at the beginning of the world and has never given it back.',
    '{b} cheated {a} at dice for {prize}, and {a} can prove it.',
    'Both claim to have made the first {made}.',
    '{a} once loved {b}, and {b} laughed.',
    '{a} killed {b}\'s favorite mortal, a hero whose tomb is still a shrine.',
    '{b} sided with {a}\'s enemies in the war in heaven.',
    '{a}\'s priests burned {b}\'s great temple three hundred years ago, and nobody has apologized.',
    'They disagree about what happens to the dead, loudly.',
    '{a} says {b} was a mortal who climbed into heaven and never belonged there.',
    'A prophecy says one of them will end the other, and neither knows which.',
    '{b} turned {a}\'s first worshippers into {beasts}.',
    '{a} swore an oath on {b}\'s name and broke it.',
    'Both want the same mountain, and the mountain has a city on it.',
    '{b} took a seat in heaven that {a} was promised.'
];
const PAN_FEUD_THING = ['voice', 'shadow', 'left eye', 'crown', 'first sunrise', 'true name', 'laugh', 'hammer', 'reflection', 'favorite hound'];
const PAN_FEUD_PRIZE = ['the moon', 'the color blue', 'the right to name the stars', 'the last day of the year', 'the souls of cats', 'the first rain'];
const PAN_FEUD_MADE = ['dwarf', 'horse', 'song', 'wine', 'sword', 'bread', 'city', 'law'];
const PAN_FEUD_BEASTS = ['toads', 'crows', 'goats', 'eels', 'moths', 'pigs'];
const PAN_FEUD_EFFECTS = [
    'Their priests won\'t eat at the same table.',
    'Marriages between their faithful are bad luck, and frequent.',
    'A shrine to one never stands within sight of a shrine to the other.',
    'When it storms on {b}\'s holy day, people say {a} is winning.',
    'Their temples bid against each other for every relic adventurers bring to town.',
    'Each quietly pays adventurers to embarrass the other\'s clergy.',
    'Towns pick a side; the ones that pick wrong blame every bad harvest on it.',
    'Their holy symbols, worn together, itch.',
    'Their priests hold a debate every year, and it ends in a brawl every year.',
    'A cleric of one can\'t heal a follower of the other without a coin of apology on the altar.'
];
const PAN_BOND_WHY = [
    '{a} and {b} are lovers, which neither church will admit.',
    '{a} owes {b} a favor the size of a mountain.',
    '{a} and {b} are twins, and finish each other\'s sentences, and each other\'s wars.',
    '{a} raised {b} after {b}\'s own parent fell silent.',
    '{a} and {b} swore an oath of friendship on the first night of the world.',
    '{b} once saved {a}\'s life, at a cost {b} still pays.'
];
const PAN_BOND_EFFECTS = [
    'Their temples share a wall and a wine cellar.',
    'A wedding with both their blessings is the luckiest kind.',
    'Their priests cover for each other, and nobody else gets a word in.',
    'Prayers to one are said to reach the other.',
    'Their holy days fall close together, and the town celebrates for a week.'
];

// ── Helpers ──────────────────────────────────────────────
function panPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function panWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function panShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function panCap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function panA(word) {
    return (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
}

function panList(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + (items.length > 2 ? ',' : '') + ' and ' + items[items.length - 1];
}

// "the sun" → "the Sun", "hearth and home" → "Hearth and Home".
function panTitleCase(s) {
    return s.split(' ').map((w, k) => (k > 0 && /^(and|of|the)$/.test(w)) ? w : panCap(w)).join(' ').replace(/^The /, 'the ');
}

function panPerson(form) {
    return { goddess: 'woman', god: 'man', deity: 'figure' }[form];
}

// ── One god ──────────────────────────────────────────────
function panSyllableName(style, used) {
    const st = PAN_NAMING[style];
    for (let tries = 0; tries < 40; tries++) {
        const name = panPick(st.onset) + panPick(st.mid) + panPick(st.end);
        const low = name.toLowerCase();
        if (low.length < 3 || low.length > 10 || PAN_BANNED.has(low) || used.has(low)) continue;
        if (/([a-z])\1\1/.test(low) || /[aeiouy]{3}/.test(low) || /[^aeiouy]{4}/.test(low)) continue;
        // No two gods share their first three letters.
        if ([...used].some(u => u.slice(0, 3) === low.slice(0, 3))) continue;
        return name;
    }
    return panPick(st.onset) + panPick(st.end);
}

function panEpithet(god) {
    // A god known by a title gets a plain epithet, so it doesn't read "the Mender, the Mother of Healing".
    const kind = god.titled ? 'plain' : panWeighted([['head', 5], ['plain', 2]]);
    if (kind === 'plain') return panPick(PAN_EPITHET_PLAIN);
    return `the ${panPick(PAN_EPITHET_HEADS[god.form])} of ${panTitleCase(god.portfolio[0])}`;
}

// A holy day written for any calendar. kind: 'turn' (first/mid/last day of a season),
// 'moon' (first full or dark moon of a season), 'day' (a point through the season, pos 0-1).
function panHolySpec(domain, takenSeasons) {
    const d = PAN_DOMAINS[domain];
    // Prefer the domain's seasons, and the least crowded of them.
    const seasons = d.holy.s.map(s => [s, 4 - Math.min(3, takenSeasons[s] || 0) + (s === d.holy.s[0] ? 1 : 0)]);
    const season = panWeighted(seasons);
    const kind = panWeighted(d.holy.kinds);
    if (kind === 'turn') return { kind, season, at: panWeighted([['first', 2], ['mid', 3], ['last', 1]]) };
    if (kind === 'moon') return { kind, season, phase: domain === 'death' || domain === 'trickery' ? panWeighted([['dark', 2], ['full', 1]]) : 'full' };
    return { kind, season, pos: Math.round((0.1 + rand() * 0.8) * 100) / 100 };
}

function panRollGod(i, prev) {
    const usedDomains = {};
    prev.forEach(g => { usedDomains[g.domain] = (usedDomains[g.domain] || 0) + 1; });
    // Every domain once before any repeats, then no domain a third time.
    const minUse = Math.min(...PAN_DOMAIN_KEYS.map(k => usedDomains[k] || 0));
    const pool = PAN_DOMAIN_KEYS.filter(k => (usedDomains[k] || 0) === minUse);
    const domain = panPick(pool);
    const d = PAN_DOMAINS[domain];
    const form = panWeighted([['goddess', 4], ['god', 4], ['deity', 2]]);
    const takenP = new Set(prev.flatMap(g => g.portfolio));
    const portfolio = panShuffle(d.portfolio.filter(p => !takenP.has(p))).slice(0, 2 + (rand() < 0.35 ? 1 : 0));
    const takenSeasons = {};
    prev.forEach(g => { takenSeasons[g.holy.season] = (takenSeasons[g.holy.season] || 0) + 1; });
    const takenSym = new Set(prev.map(g => g.symbolObj));
    const symbolObj = panPick(d.symbols.filter(s => !takenSym.has(s)).concat(takenSym.size >= d.symbols.length ? d.symbols : []));
    const mustPool = panShuffle(d.must), mustntPool = panShuffle(d.mustnt);
    const god = {
        i, domain, form, portfolio,
        // A second, lesser domain for one god in three.
        domain2: rand() < 0.33 ? panPick(PAN_DOMAIN_KEYS.filter(k => k !== domain)) : null,
        alignment: panWeighted(d.align),
        symbolObj,
        symbolMod: panWeighted([['', 3], ['in a circle', 1], ['on a black field', 1], ['held in an open hand', 1], ['wreathed in flame', 1], ['beneath a crescent moon', 1], ['ringed by seven stars', 1], ['broken in two', 1], ['inside a triangle', 1], ['on a field of blue', 1], ['between two pillars', 1]]),
        symbolColor: panWeighted([['', 4], ['gold', 2], ['silver', 2], ['black', 1], ['white', 1], ['red', 1], ['green', 1], ['blue', 1], ['bronze', 1]]),
        depiction: panPick(d.forms),
        holy: panHolySpec(domain, takenSeasons),
        holyName: panPick(d.holyNames),
        rite: panPick(d.rites),
        must: mustPool.slice(0, 2),
        mustnt: mustntPool.slice(0, 2),
        temple: panPick(d.temple),
        priests: panPick(d.priests),
        vestments: panPick(d.vestments),
        offering: panPick(d.offering),
        followers: panPick(d.followers),
        wants: panPick(d.wants),
        omen: panPick(d.omens),
        reward: panWeighted([[25, 3], [50, 4], [100, 3], [250, 2], [500, 1]])
    };
    // The holy day's name can't repeat an earlier god's.
    const takenHoly = new Set(prev.map(g => g.holyName));
    for (let t = 0; t < 8 && takenHoly.has(god.holyName); t++) god.holyName = panPick(d.holyNames);
    if (takenHoly.has(god.holyName)) god.holyName = null;   // falls back to "<name>'s Day"
    return god;
}

// Names are rolled apart from the gods, so a new naming style renames them and nothing else.
function panNameGods(gods, style) {
    const used = new Set();
    const usedTitles = new Set();
    gods.forEach(g => {
        const useTitle = style === 'titles' || rand() < 0.08;
        if (useTitle) {
            const titles = PAN_TITLES[g.domain].filter(t => !usedTitles.has(t));
            const t = panPick(titles.length ? titles : PAN_TITLES[g.domain]);
            usedTitles.add(t);
            g.name = t;
            g.titled = true;
        } else {
            g.name = panSyllableName(style, used);
            used.add(g.name.toLowerCase());
            g.titled = false;
        }
        g.epithet = panEpithet(g);
    });
}

// ── Shape: who rules, who is whose ───────────────────────
function panGood(a) { return /G$/.test(a); }
function panEvil(a) { return /E$/.test(a); }
function panLawful(a) { return /^L/.test(a); }
function panChaotic(a) { return /^C/.test(a); }

function panShape(shape, gods) {
    const n = gods.length;
    const order = panShuffle(gods.map(g => g.i));
    const roles = gods.map(() => ({ role: '', rel: '' }));
    const st = { shape, leader: order[0], camps: null };
    const name = i => gods[i].name;
    if (shape === 'family') {
        const [a, b] = order;
        roles[a] = { role: PAN_KIN.elder[gods[a].form], rel: `${panCap(PAN_KIN.spouse[gods[a].form])} of ${name(b)}`, rank: 'ruler' };
        roles[b] = { role: `Consort of ${name(a)}`, rel: '', rank: 'ruler' };
        const rest = order.slice(2);
        // Most are their children; one may be a sibling of the elder, one a grandchild, one disowned.
        let born = 0;
        rest.forEach((c, k) => {
            const kin = gods[c].form;
            if (k === rest.length - 1 && rest.length >= 3 && rand() < 0.6) {
                roles[c] = { role: 'The disowned', rel: `Cast out by ${name(a)}; still ${panA(PAN_KIN.child[kin])} of the house, whatever the priests say`, rank: 'outcast' };
            } else if (k === 0 && rand() < 0.35) {
                roles[c] = { role: `${panCap(PAN_KIN.sibling[kin])} of ${name(a)}`, rel: `Older than the world and twice as stubborn`, rank: 'elder' };
            } else if (k >= 3 && rand() < 0.4) {
                const parent = rest[Math.floor(rand() * Math.min(k, 3))];
                roles[c] = { role: `Grandchild of ${name(a)}`, rel: `${panCap(PAN_KIN.child[kin])} of ${name(parent)}`, rank: 'young' };
            } else {
                const nth = ['Eldest', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh'][born++];
                roles[c] = { role: `${nth} ${PAN_KIN.child[kin]} of ${name(a)} and ${name(b)}`, rel: '', rank: 'child' };
            }
        });
    } else if (shape === 'court') {
        const [k, ...rest] = order;
        const monarch = { goddess: 'Queen of Heaven', god: 'King of Heaven', deity: 'Sovereign of Heaven' }[gods[k].form];
        roles[k] = { role: monarch, rel: 'Sits on the throne, and intends to keep sitting', rank: 'ruler' };
        const offices = panShuffle(PAN_COURT_OFFICES);
        rest.forEach((c, j) => {
            if (j === rest.length - 1 && rest.length >= 3) roles[c] = { role: 'The Exile', rel: `Banished from the court by ${name(k)}, and still plotting a return`, rank: 'outcast' };
            else roles[c] = { role: panCap(offices[j]), rel: `Serves ${name(k)}`, rank: 'officer' };
        });
        // One officer has an eye on the throne.
        const officers = rest.filter(c => roles[c].rank === 'officer');
        if (officers.length) {
            const c = panPick(officers);
            roles[c].rel = `Serves ${name(k)}, and has an eye on the throne`;
        }
    } else if (shape === 'camps') {
        // Good against evil; failing that law against chaos; failing that old against young.
        let side = gods.map(g => panGood(g.alignment) ? 0 : panEvil(g.alignment) ? 1 : -1);
        let names;
        if (side.includes(0) && side.includes(1)) names = panPick(PAN_CAMP_NAMES.good);
        else {
            side = gods.map(g => panLawful(g.alignment) ? 0 : panChaotic(g.alignment) ? 1 : -1);
            if (side.includes(0) && side.includes(1)) names = panPick(PAN_CAMP_NAMES.law);
            else {
                side = order.map((_, k) => k % 2);
                side = gods.map(g => side[order.indexOf(g.i)]);
                names = panPick(PAN_CAMP_NAMES.age);
            }
        }
        // The undecided join whichever side is smaller, except one who stays between.
        const between = side.indexOf(-1) >= 0 && rand() < 0.7 ? side.indexOf(-1) : -1;
        order.forEach(i => {
            if (side[i] !== -1 || i === between) return;
            const a = side.filter(s => s === 0).length, b = side.filter(s => s === 1).length;
            side[i] = a <= b ? 0 : 1;
        });
        st.camps = names;
        const leaders = [0, 1].map(s => order.find(i => side[i] === s));
        st.leader = leaders[0];
        gods.forEach(g => {
            const s = side[g.i];
            if (s === -1) roles[g.i] = { role: 'Between the sides', rel: `Neither ${names[0]} nor ${names[1]}; both court them`, rank: 'between', side: -1 };
            else if (g.i === leaders[s]) roles[g.i] = { role: `Leader of ${names[s]}`, rel: `Sworn enemy of ${name(leaders[1 - s])}`, rank: 'ruler', side: s };
            else roles[g.i] = { role: `One of ${names[s]}`, rel: `Follows ${name(leaders[s])}`, rank: 'member', side: s };
        });
    } else {
        const peoples = panShuffle(PAN_PEOPLES);
        order.forEach((i, k) => {
            roles[i] = { role: `${{ goddess: 'Goddess', god: 'God', deity: 'Deity' }[gods[i].form]} of ${peoples[k % peoples.length]}`, rel: k === 0 ? 'The oldest of the gods, or so the priests say' : '', rank: k === 0 ? 'elder' : 'local', people: peoples[k % peoples.length] };
        });
    }
    return { ...st, roles };
}

function panFill(text, a, b) {
    return text.replace(/\{a\}/g, a).replace(/\{b\}/g, b)
        .replace(/\{thing\}/g, () => panPick(PAN_FEUD_THING)).replace(/\{prize\}/g, () => panPick(PAN_FEUD_PRIZE))
        .replace(/\{made\}/g, () => panPick(PAN_FEUD_MADE)).replace(/\{beasts\}/g, () => panPick(PAN_FEUD_BEASTS));
}

// Feuds favor opposed domains, opposed alignments, and (in two camps) opposite sides.
function panFeuds(gods, shape) {
    const pairs = [];
    for (let x = 0; x < gods.length; x++) for (let y = x + 1; y < gods.length; y++) {
        const a = gods[x], b = gods[y];
        let w = 1;
        if (PAN_OPPOSED.some(([p, q]) => (p === a.domain && q === b.domain) || (p === b.domain && q === a.domain))) w += 4;
        if ((panGood(a.alignment) && panEvil(b.alignment)) || (panEvil(a.alignment) && panGood(b.alignment))) w += 3;
        if ((panLawful(a.alignment) && panChaotic(b.alignment)) || (panChaotic(a.alignment) && panLawful(b.alignment))) w += 1;
        if (shape.camps && shape.roles[x].side >= 0 && shape.roles[y].side >= 0) w += shape.roles[x].side !== shape.roles[y].side ? 3 : -0.5;
        if (shape.roles[x].rank === 'outcast' || shape.roles[y].rank === 'outcast') w += 2;
        pairs.push([[x, y], w]);
    }
    const count = Math.max(2, Math.round(gods.length / 3));
    const feuds = [], seenWhy = new Set(), busy = {};
    for (let t = 0; t < 60 && feuds.length < count; t++) {
        let [x, y] = panWeighted(pairs);
        if ((busy[x] || 0) >= 2 || (busy[y] || 0) >= 2 || feuds.some(f => f.a === x && f.b === y || f.a === y && f.b === x)) continue;
        if (rand() < 0.5) [x, y] = [y, x];
        let why = panPick(PAN_FEUD_WHY);
        for (let k = 0; k < 6 && seenWhy.has(why); k++) why = panPick(PAN_FEUD_WHY);
        seenWhy.add(why);
        feuds.push({ a: x, b: y, why: panCap(panFill(why, gods[x].name, gods[y].name)), effect: panCap(panFill(panPick(PAN_FEUD_EFFECTS), gods[x].name, gods[y].name)) });
        busy[x] = (busy[x] || 0) + 1;
        busy[y] = (busy[y] || 0) + 1;
    }
    // One or two friendships, between gods who aren't feuding.
    const bonds = [];
    const friendly = pairs.filter(([[x, y]]) => !feuds.some(f => (f.a === x && f.b === y) || (f.a === y && f.b === x)))
        .map(([[x, y], w]) => [[x, y], Math.max(0.2, 6 - w) + (gods[x].alignment === gods[y].alignment ? 2 : 0)]);
    const bondCount = gods.length >= 7 ? 2 : 1;
    const seenBond = new Set();
    for (let t = 0; t < 30 && bonds.length < bondCount && friendly.length; t++) {
        const [x, y] = panWeighted(friendly);
        if (bonds.some(b => b.a === x || b.b === x || b.a === y || b.b === y)) continue;
        let why = panPick(PAN_BOND_WHY);
        for (let k = 0; k < 6 && seenBond.has(why); k++) why = panPick(PAN_BOND_WHY);
        seenBond.add(why);
        bonds.push({ a: x, b: y, why: panCap(panFill(why, gods[x].name, gods[y].name)), effect: panCap(panFill(panPick(PAN_BOND_EFFECTS), gods[x].name, gods[y].name)) });
    }
    return { feuds, bonds };
}

// ── The roll ─────────────────────────────────────────────
// opts: { size: 'random'|small|standard|large, shape: 'random'|key, naming: 'random'|key }
function rollPantheon(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const size = PAN_SIZES[opts.size] ? opts.size : part('size', () => panWeighted([['standard', 5], ['small', 3], ['large', 2]]));
    const shape = PAN_SHAPES[opts.shape] ? opts.shape : part('shape', () => panWeighted([['family', 3], ['court', 3], ['camps', 2], ['many', 2]]));
    const naming = PAN_NAMING[opts.naming] ? opts.naming : part('naming', () => panWeighted([['lyrical', 4], ['stern', 3], ['ancient', 3], ['titles', 1]]));
    const sz = PAN_SIZES[size];
    const count = part('count.' + size, () => sz.min + Math.floor(rand() * (sz.max - sz.min + 1)));

    const gods = [];
    for (let i = 0; i < count; i++) gods.push(part('god.' + i, () => panRollGod(i, gods)));
    part('names.' + naming + '.' + count, () => panNameGods(gods, naming));
    gods.forEach(g => { if (!g.holyName) g.holyName = `${g.name}'s Day`; });

    const p = { seed, size, shape, naming, gods };
    const st = part(`shape.${shape}.${count}`, () => panShape(shape, gods));
    p.leader = st.leader;
    p.camps = st.camps;
    gods.forEach((g, i) => Object.assign(g, { role: st.roles[i].role, rel: st.roles[i].rel, rank: st.roles[i].rank, side: st.roles[i].side, people: st.roles[i].people }));
    Object.assign(p, part(`feuds.${shape}.${count}`, () => panFeuds(gods, st)));
    part('world.' + shape, () => {
        const nw = PAN_NUMBER_WORDS[count];
        p.name = panPick(PAN_NAMES).replace('{N}', nw);
        p.home = panPick(PAN_HOMES);
        p.creation = panPick(PAN_CREATIONS[shape]);
        p.afterlife = panPick(PAN_AFTERLIVES);
        p.walks = panPick(PAN_WALKS);
    });
    // In many peoples' gods there is no shared heaven.
    if (shape === 'many') p.home = 'each god\'s own country: a mountain, a river, a hall under a hill, wherever their people first prayed';
    return p;
}

// ── Holy days on a calendar ──────────────────────────────
const PAN_SEASON_LABEL = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };

function panHolyWhen(spec) {
    const s = PAN_SEASON_LABEL[spec.season];
    if (spec.kind === 'turn') {
        if (spec.at === 'first') return `the first day of ${s}`;
        if (spec.at === 'last') return `the last day of ${s}`;
        return { spring: 'the spring equinox, when day and night are equal', summer: 'Midsummer, the longest day', autumn: 'the autumn equinox, when day and night are equal', winter: 'Midwinter, the longest night' }[spec.season];
    }
    if (spec.kind === 'moon') return `the first ${spec.phase === 'dark' ? 'dark' : 'full'} moon of ${s}`;
    const third = spec.pos < 0.34 ? 'early' : spec.pos < 0.67 ? 'the middle of' : 'late';
    return `a day in ${third} ${s}`;
}

// The days of a season on a calendar, in year order: [[month, day], ...] (a season that
// wraps the new year starts in the last months).
function panSeasonDays(cal, season) {
    const months = cal.months.map((m, i) => i).filter(i => cal.months[i].season === season);
    if (!months.length) return [];
    // A season split by the new year begins with its late months.
    let startAt = 0;
    for (let k = 0; k < months.length; k++) {
        const prev = (months[k] - 1 + cal.months.length) % cal.months.length;
        if (!months.includes(prev)) { startAt = k; break; }
    }
    const ordered = months.slice(startAt).concat(months.slice(0, startAt));
    return ordered.flatMap(i => Array.from({ length: cal.months[i].days }, (_, d) => [i, d + 1]));
}

// { month, day } this calendar year, or null if the calendar has no such season.
function panHolyDate(god, cal) {
    const days = panSeasonDays(cal, god.holy.season);
    if (!days.length) return null;
    const spec = god.holy;
    const at = idx => ({ month: days[idx][0], day: days[idx][1] });
    if (spec.kind === 'turn') {
        if (spec.at === 'first') return at(0);
        if (spec.at === 'last') return at(days.length - 1);
        return at(Math.floor(days.length / 2));
    }
    if (spec.kind === 'moon' && cal.moons && cal.moons.length && typeof calMoonPhase === 'function') {
        const want = spec.phase === 'dark' ? 0 : 4;
        for (let k = 0; k < days.length; k++) {
            const [m, d] = days[k];
            const abs = calAbsDay(cal, cal.year, m, d);
            if (calMoonPhase(cal.moons[0], abs) === want && calMoonPhase(cal.moons[0], abs - 1) !== want) return at(k);
        }
        return at(Math.floor(days.length / 3));
    }
    return at(Math.min(days.length - 1, Math.floor((spec.pos || 0.5) * days.length)));
}

// ── Text ─────────────────────────────────────────────────
function panSymbolText(g) {
    const obj = g.symbolObj.replace(/^(an?|the) /, '');
    // Objects that already have a color ("a golden sun", "a black rose") keep it.
    const color = g.symbolColor && !/^(gold|golden|silver|black|white|red|green|blue)\b/.test(obj) && !g.symbolMod.includes(g.symbolColor) ? g.symbolColor + ' ' : '';
    return `${panA(color + obj)}${g.symbolMod ? ' ' + g.symbolMod : ''}`;
}

function panDomainText(g) {
    const d = PAN_DOMAINS[g.domain];
    return g.domain2 ? `${d.label} (and some ${PAN_DOMAINS[g.domain2].label})` : d.label;
}

function panDepiction(g) {
    return g.depiction.replace(/\{person\}/g, panPerson(g.form));
}

function panTitleLine(g) {
    return `${g.name}, ${g.epithet}`;
}

// The god's facts as [label, text] pairs (the page, Copy, and print all use these).
// cal: an optional calendar to give the holy day a date.
function panGodLines(p, i, cal) {
    const g = p.gods[i];
    const formWord = { goddess: 'Goddess', god: 'God', deity: 'Deity' }[g.form];
    const date = cal ? panHolyDate(g, cal) : null;
    const when = panHolyWhen(g.holy) + (date ? ` (this year: the ${calOrdinal(date.day)} of ${cal.months[date.month].name})` : '');
    const feuds = p.feuds.filter(f => f.a === i || f.b === i).map(f => p.gods[f.a === i ? f.b : f.a].name);
    const friends = p.bonds.filter(b => b.a === i || b.b === i).map(b => p.gods[b.a === i ? b.b : b.a].name);
    const lines = [
        ['Rules over', `${formWord} of ${panList(g.portfolio)}`],
        ['Domain', panDomainText(g)],
        ['Alignment', PAN_ALIGN_LABELS[g.alignment]],
        ['Place', g.role + (g.rel ? `. ${g.rel}` : '') + '.'],
        ['Holy symbol', panCap(panSymbolText(g))],
        ['Shown as', panCap(panDepiction(g))],
        ['Holy day', `${panCap(g.holyName)}, ${when}. ${g.rite}`],
        ['The faithful must', g.must.join(' ')],
        ['The faithful must not', g.mustnt.join(' ')],
        ['Temple', panCap(g.temple) + '.'],
        ['Priests', `Called ${g.priests}; they wear ${g.vestments}. Offerings: ${g.offering}.`],
        ['Worshipped by', panCap(g.followers) + '.'],
        ['Omen', g.omen],
        ['For the party', `${g.wants} Reward: ${formatCoins(g.reward)}.`]
    ];
    if (feuds.length || friends.length) {
        lines.splice(4, 0, ['Friends and foes', [friends.length ? `Close to ${panList(friends)}` : '', feuds.length ? `at odds with ${panList(feuds)}` : ''].filter(Boolean).join('; ').replace(/^at/, 'At') + '.']);
    }
    return lines;
}

function panSummary(p) {
    const sh = PAN_SHAPES[p.shape];
    const lead = p.gods[p.leader];
    const camps = p.camps ? ` ${panCap(p.camps[0])} against ${p.camps[1]}.` : '';
    return `${p.gods.length} gods, ${sh.label.toLowerCase()}. ${p.shape === 'many' ? `The oldest is ${lead.name}.` : `At their head: ${lead.name}, ${lead.epithet}.`}${camps}`;
}

function pantheonText(p, cal) {
    const out = [];
    out.push(panCap(p.name));
    out.push(panSummary(p));
    out.push(PAN_SHAPES[p.shape].about);
    out.push(`Home: ${panCap(p.home)}.`);
    out.push(`In the beginning: ${p.creation}`);
    out.push(`After death: ${p.afterlife}`);
    out.push(`Do they walk the world? ${p.walks}`);
    out.push('');
    p.gods.forEach((g, i) => {
        out.push(`${PAN_DOMAINS[g.domain].icon} ${panCap(panTitleLine(g))}`);
        panGodLines(p, i, cal).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
        out.push('');
    });
    if (p.feuds.length) {
        out.push('Feuds:');
        p.feuds.forEach(f => out.push(`- ${panCap(p.gods[f.a].name)} and ${p.gods[f.b].name}: ${f.why} ${f.effect}`));
    }
    if (p.bonds.length) {
        out.push('Friendships:');
        p.bonds.forEach(b => out.push(`- ${panCap(p.gods[b.a].name)} and ${p.gods[b.b].name}: ${b.why} ${b.effect}`));
    }
    return out.join('\n').trim();
}
