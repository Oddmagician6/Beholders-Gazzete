/* ============================================
   HISTORY ENGINE (F36, Worldbuilder)
   A seeded history of the world as a chain of ages: each age is drawn from what the
   last one left (a war ends in a fall, a treaty, or a plague; a fall leads to a dark
   age, an invasion, or a new founding), and realms rise, grow into empires, and fall
   along the way. Every age has a name, its years, what happened and how it began,
   the person who mattered, the faith of the day, and what it left behind: ruins,
   grudges, relics, and customs, each with a hook for today.
   Every age rolls from deriveSeed(seed, 'age.' + i) in order, so more ages keeps the
   ones already there; a new span changes only the years. Gods are drawn as numbers
   and named at render time: with a linked pantheon (pantheon-engine.js) they are its
   gods; without one, gods known by a title. Factions from a linked faction roll
   (faction-engine.js) are given the age they were founded in.
   Needs rng.js, npc-data.js (rollNames), pantheon-engine.js. The tables are the Gazette's own.
   ============================================ */

const HIS_AGES = {
    few:      { label: 'A few ages (4-5)', min: 4, max: 5 },
    standard: { label: 'A full history (6-8)', min: 6, max: 8 },
    long:     { label: 'A long history (9-12)', min: 9, max: 12 }
};

const HIS_SPANS = {
    short: { label: 'Centuries (about 1,000 years)', min: 700, max: 1600 },
    long:  { label: 'Millennia (thousands of years)', min: 3000, max: 9000 },
    deep:  { label: 'Deep time (tens of thousands)', min: 15000, max: 40000 }
};

const HIS_STARTS = {
    gods:      { label: 'The gods made it', icon: '✨' },
    empire:    { label: 'An old empire', icon: '🏛️' },
    dark:      { label: 'Out of the dark', icon: '🌑' },
    migration: { label: 'The first people came', icon: '🧭' }
};

// ── Realms ───────────────────────────────────────────────
const HIS_ONSETS = ['Ar', 'Bel', 'Cor', 'Dun', 'Esk', 'Fal', 'Gal', 'Hal', 'Ist', 'Kar', 'Lor', 'Mar', 'Nor', 'Os', 'Pell', 'Quar', 'Ros', 'Sar', 'Tal', 'Ul', 'Val', 'Wes', 'Yr', 'Zan', 'Ash', 'Bran', 'Ced', 'Thal', 'Vor', 'Ely'];
const HIS_MIDS = ['', '', '', 'a', 'e', 'i', 'o', 'an', 'en', 'or', 'il'];
const HIS_ENDS = ['dor', 'mar', 'heim', 'ia', 'oth', 'gard', 'wick', 'mere', 'dal', 'ost', 'ara', 'und', 'esh', 'avon', 'reth', 'is', 'on', 'ane', 'ford', 'rin'];
const HIS_FORMS = {
    kingdom:  ['the Kingdom of {r}', 'the Crown of {r}', 'the Realm of {r}'],
    empire:   ['the Empire of {r}', 'the {r} Empire', 'the Throne of {r}'],
    republic: ['the Free Cities of {r}', 'the Republic of {r}', 'the League of {r}'],
    holy:     ['the Holy Realm of {r}', 'the Sacred Kingdom of {r}'],
    clans:    ['the Clans of {r}', 'the Tribes of {r}', 'the Thanes of {r}']
};
// [as told in a sentence, as named in an age's title]
const HIS_FOES = [
    ['the orc hordes of the {dir}', 'the Orc Hordes'], ['the giants of the {dir} mountains', 'the Giants'], ['the dragon {beast}', '{beast}'],
    ['raiders from across the {dir} sea', 'the Sea Raiders'], ['the dead, risen under a lich-king', 'the Lich-King'], ['the fey of the deep wood', 'the Fey'],
    ['a demon horde out of a torn sky', 'the Demon Horde'], ['the sahuagin of the drowned coast', 'the Sahuagin'],
    ['the hobgoblin legions of {beast}', 'the Hobgoblin Legions'], ['a horse-lord\'s nation from the {dir} steppe', 'the Horse Lords']
];
const HIS_DIRS = ['north', 'south', 'east', 'west', 'far north', 'far south'];
const HIS_BEASTS = ['Vyrmaxis', 'Old Smolder', 'Karrakoth', 'Ashqueen', 'Ulgreth', 'Sorrowmaw', 'Tazrakh', 'Skarn the Red', 'Morvath', 'Greymaw'];
const HIS_SITE_HEADS = ['Vale', 'Tor', 'Fen', 'Ford', 'Hold', 'Spire', 'Cairn', 'Mere', 'Gate', 'Barrow', 'Crag', 'Reach'];

const HIS_PEOPLES = ['the dwarves of the deep halls', 'the elves of the old forest', 'the halfling shires', 'the hill clans', 'the river towns', 'the sea peoples', 'the gnomes of the warrens', 'the horse nomads', 'the mountain monasteries', 'the desert caravans'];

// ── The kinds of age ─────────────────────────────────────
// need: 'realm' = only while a realm stands; 'none' = only when none does; absent = either.
// realm: what happens to the ruling realm ('new' founds one, 'grow' turns it into an empire,
// 'fall' ends it, 'rival' founds a breakaway that replaces it).
// text: with a realm in power ({realm}); textNo: without one. {new} = a realm founded this age.
// roles: the first one must fit every text that names {figure}.
// legacies: [kind, text, hook]. next: [[kind, weight]].
const HIS_KINDS = {
    making: {
        label: 'The making', icon: '✨', len: 1.4, need: 'none',
        names: ['the Dawn Age', 'the Age of Making', 'the First Days', 'the Time Before Time'],
        textNo: [
            '{god} raised the land out of the sea, and {god2} filled it with things that breathe.',
            'The gods fought over the world while it was still soft, and the mountains are the scars.',
            '{god} sang the world awake; the first peoples woke up in the middle of the song and have been confused ever since.',
            'The world was made by {god} as a gift for {god2}, who did not want it.'
        ],
        roles: ['the first mortal', 'the first priest', 'the first to speak'],
        faith: ['The gods walked openly, and nobody needed temples.', 'Every people knew {god} by sight.'],
        legacies: [
            ['relic', 'The first tool ever made, a stone knife held by {god}.', 'Three temples claim to have it; at most one is telling the truth.'],
            ['ruin', 'The giant steps at {site}, cut for feet a hundred feet tall.', 'Something still climbs them on moonless nights.'],
            ['custom', 'Every child is told the creation story on their seventh birthday, and every people tells it differently.', 'Telling it "wrong" in the wrong tavern starts fights.'],
            ['grudge', '{god} and {god2} have never forgiven each other for the making.', 'Their priests cannot share a road without trouble.']
        ],
        next: [['migration', 3], ['dragon', 2], ['founding', 2], ['dark', 1]]
    },
    migration: {
        label: 'A migration', icon: '🧭', len: 0.8, need: 'none', realm: 'new', form: 'clans',
        names: ['the Wandering', 'the Coming of the Peoples', 'the Long Walk', 'the Age of Boats'],
        textNo: [
            '{people} came over the mountains, and settled the valleys as {new}.',
            'Ships came out of the fog carrying {people}, who burned the boats on the beach so nobody could go back. They called their new home {new}.',
            '{figure} led the survivors of a lost homeland into the empty lands and founded {new}.',
            'Hunger drove {people} out of the {dir} into the green country, where they became {new}.'
        ],
        roles: ['the pathfinder', 'the first chieftain', 'the speaker of the peoples'],
        faith: ['They brought their gods with them, chief among them {god}.', 'They found an altar already standing to {god} and took it as a sign.'],
        legacies: [
            ['ruin', 'The burned ships, still lying in the sand at {site}.', 'One of the wrecks was not burned, and something is still aboard.'],
            ['custom', 'Every year the old families walk the first road, barefoot, singing the names of the dead.', 'This year someone has been killed on the walk.'],
            ['grudge', 'The peoples who were here first remember being pushed into the hills.', 'They want the land back, and they have a document.'],
            ['relic', 'The Pathfinder\'s Staff, which points the way home, wherever home is.', 'It has started pointing somewhere new.']
        ],
        next: [['founding', 4], ['war', 2], ['dragon', 1], ['plague', 1]]
    },
    founding: {
        label: 'A founding', icon: '🏰', len: 1, realm: 'new', form: 'kingdom',
        names: ['the Age of Crowns', 'the Founding', 'the First Kingdoms', 'the Years of the Banner', 'the Raising'],
        text: [
            'Out of {realm} grew {new}, with a crown, a capital at {site}, and a law written down for the first time.',
            '{figure} united the warring towns of {realm} and was crowned at {site}; the new kingdom was called {new}.'
        ],
        textNo: [
            '{figure} gathered the scattered villages behind a wall at {site} and called it {new}.',
            'In the ashes of {old}, {figure} built {new}, and swore it would never fall the same way.',
            'Farmers, priests, and a few retired adventurers founded {new} at {site}, mostly to stop the raids.'
        ],
        roles: ['the founder', 'the first ruler', 'the lawgiver'],
        faith: ['The founder swore by {god}, and so did everyone who wanted land.', 'The first temple in the capital was raised to {god}.'],
        legacies: [
            ['ruin', 'The first wall at {site}, now a ruin in the middle of a field.', 'Smugglers use the old gatehouse, and something uses the cellar under it.'],
            ['relic', 'The founding crown of {newRoot}, plain iron, said to burn anyone with no right to wear it.', 'It has gone missing from the treasury.'],
            ['custom', 'The founder\'s law, read aloud in every market square once a year.', 'Someone has found a clause nobody has read in centuries, and it is very useful to them.'],
            ['grudge', 'The families who lost the vote for the first crown never forgot it.', 'Their heirs still think the throne is theirs.']
        ],
        next: [['empire', 3], ['golden', 3], ['war', 3], ['plague', 1], ['schism', 1]]
    },
    empire: {
        label: 'An empire', icon: '🏛️', len: 1.3, realm: 'grow',
        names: ['the Imperial Age', 'the Age of the Eagle', 'the Long Peace', 'the Age of Roads'],
        text: [
            '{realm} conquered its neighbors one by one and became {new}, with roads, aqueducts, and governors everywhere.',
            '{figure} took the crown of {realm}, then everyone else\'s; the conquests made {new}.'
        ],
        textNo: [
            'A warlord, {figure}, conquered every town for a hundred miles and declared {new}.',
            'Out of the dark came {new}, built by legions and roads and an iron will.'
        ],
        roles: ['the first emperor', 'the conqueror', 'the great general'],
        faith: ['The empire worshipped {god} and tolerated everyone else, as long as they paid.', '{figure} claimed to be the chosen of {god}; the temples did not argue.'],
        legacies: [
            ['ruin', 'The imperial road, still the best road in the land, though its waystations are ruins.', 'A waystation at {site} has its lamps lit again, and no one knows who lit them.'],
            ['ruin', 'An imperial fortress at {site}, built to hold a frontier that no longer exists.', 'Its vaults were sealed when the legion left, and the seal is breaking.'],
            ['relic', 'The Eagle Standard of {newRoot}, said to make any army that carries it fearless.', 'Three different lords claim to own it.'],
            ['custom', 'Imperial coins are still good money in any market, and better than the new ones.', 'A hoard of them has turned up, and so have people who want it.'],
            ['grudge', 'The conquered peoples still remember the legions.', '{people} still spit at the sight of an eagle.']
        ],
        next: [['golden', 3], ['rebellion', 3], ['war', 2], ['plague', 2], ['fall', 2], ['cataclysm', 1]]
    },
    golden: {
        label: 'A golden age', icon: '🌟', len: 1, need: 'realm',
        names: ['the Golden Age', 'the Age of Wonders', 'the Bright Years', 'the Age of Towers', 'the Long Summer'],
        text: [
            '{realm} grew rich: its wizards raised towers, its poets wrote the songs still sung today, and nobody went hungry for a hundred years.',
            'Under {figure}, {realm} built libraries, academies, and a palace at {site} so beautiful that visitors wept.',
            'Peace settled over {realm}; trade ran from sea to sea, and the old gods were honored with gold.'
        ],
        roles: ['the great builder', 'the archmage of the age', 'the beloved ruler'],
        faith: ['Golden temples to {god} rose in every city.', 'It was the high age of the faith of {god}.'],
        legacies: [
            ['ruin', 'The library at {site}, sealed when the age ended, with its books still inside.', 'A scholar wants the party to bring back one book, and only one.'],
            ['relic', 'The harp of {god}, whose music made enemies lay down their swords.', 'A bard has it, and does not know what it is.'],
            ['ruin', 'A wizard\'s tower at {site} that still floats a few feet off the ground.', 'Its door opened last month for the first time in centuries.'],
            ['custom', 'The great songs of the age, which every bard must know.', 'One of the songs is a map, and somebody has worked it out.']
        ],
        next: [['plague', 3], ['schism', 2], ['war', 2], ['cataclysm', 2], ['fall', 2], ['rebellion', 1]]
    },
    war: {
        label: 'A war', icon: '⚔️', len: 0.6,
        names: ['the War of {foeShort}', 'the Red Years', 'the Hundred-Year War', 'the Age of Swords', 'the Long War'],
        text: [
            '{realm} went to war with {foe}. It lasted three generations, and both sides won some of it.',
            '{foe} came against {realm}. {figure} held the line at {site} while the rest of the realm burned.',
            'A quarrel over a marriage set {realm} against {rival}, and it took a century to end.'
        ],
        textNo: [
            'With no crown to stop them, the warlords fought each other and {foe} for every field and ford.',
            '{foe} swept over the land, and the scattered peoples fought back under {figure}.'
        ],
        roles: ['the hero of the war', 'the general who would not retreat', 'the warlord'],
        faith: ['Both sides prayed to {god}, who has never said which side was right.', 'Soldiers carved the sign of {god} on their shields.'],
        legacies: [
            ['ruin', 'The battlefield at {site}, where nothing grows and the dead don\'t stay down.', 'The dead have started marching, in step, toward the nearest town.'],
            ['grudge', 'The descendants of the two sides still won\'t marry, trade, or drink together.', 'A wedding between the two sides is planned, and someone wants it stopped.'],
            ['relic', 'The sword of {figure}, lost on the field at {site}.', 'A farmer has plowed up a hilt with the right crest on it.'],
            ['custom', 'A day of silence each year for the war dead.', 'Someone broke the silence this year, and the town wants blood.'],
            ['ruin', 'A siege fortress at {site}, with the bones of its last defenders still on the walls.', 'The fortress is about to change hands again.']
        ],
        next: [['fall', 3], ['plague', 2], ['treaty', 3], ['dark', 1], ['rebellion', 1]]
    },
    plague: {
        label: 'A plague', icon: '☠️', len: 0.4,
        names: ['the Grey Death', 'the Years of the Cough', 'the Weeping Plague', 'the Silent Years', 'the Rot'],
        text: [
            'A plague came out of {site} and killed one in three across {realm}. Whole villages were burned to stop it.',
            'The sickness emptied the cities of {realm}; {figure} found a cure, too late for most.'
        ],
        textNo: [
            'A sickness swept the land, and the survivors fled to the hills and forgot how to read.',
            'The plague came on the wind from the {dir}, and nobody was left to bury the dead.'
        ],
        roles: ['the healer who found the cure', 'the plague doctor', 'the one blamed for it all'],
        faith: ['The desperate prayed to {god}; the angry blamed {god2}.', 'The priests of {god} stayed and nursed the sick, and are still loved for it.'],
        legacies: [
            ['ruin', 'The plague village at {site}, walled up with the dead inside.', 'The wall has a fresh hole in it.'],
            ['custom', 'Nobody shakes hands; people bow instead, and it\'s rude to forget.', 'A stranger in town shook hands with everyone, and now three people are sick.'],
            ['grudge', '{people} were blamed for the plague and driven out.', 'Their descendants want an apology, or something more.'],
            ['relic', 'The plague doctor\'s notebook, with the cure written in a cipher.', 'A new sickness is going around, and the cipher has not been broken.']
        ],
        next: [['dark', 2], ['rebellion', 2], ['schism', 2], ['founding', 1], ['fall', 1]]
    },
    cataclysm: {
        label: 'A cataclysm', icon: '🌋', len: 0.3,
        names: ['the Sundering', 'the Night of Falling Stars', 'the Drowning', 'the Spellplague', 'the Breaking'],
        text: [
            'The wizards of {realm} reached too far. In one night, {site} vanished, and the sky stayed red for a year.',
            'A star fell on {realm}. The capital was gone by morning, and the sea came in where it had been.'
        ],
        textNo: [
            'The ground opened, the mountains moved, and the rivers ran backward for a season.',
            '{god} and {god2} came to blows, and the world was caught between them.'
        ],
        roles: ['the wizard who caused it', 'the last survivor of the capital', 'the prophet who warned them'],
        faith: ['Some called it the wrath of {god}; some still do.', 'The temples of {god2} were the only buildings left standing, which made people suspicious.'],
        legacies: [
            ['ruin', 'The crater at {site}, a mile wide, where magic works strangely.', 'Spells cast inside it sometimes come out as something else.'],
            ['relic', 'A shard of the fallen star, cold to the touch and humming.', 'Shards are turning up in markets, and anyone who carries one dreams the same dream.'],
            ['ruin', 'The drowned city of {site}, whose towers stick out of the sea at low tide.', 'The bells in the drowned towers rang last week.'],
            ['custom', 'Magic is licensed, taxed, and feared.', 'An unlicensed wizard is hiding in town.']
        ],
        next: [['dark', 4], ['migration', 1], ['invasion', 2], ['founding', 1]]
    },
    fall: {
        label: 'A fall', icon: '🏚️', len: 0.5, need: 'realm', realm: 'fall',
        names: ['the Fall of {realmRoot}', 'the Unmaking', 'the Last Days', 'the Years of Ash', 'the Breaking of the Crown'],
        text: [
            '{realm} rotted from the inside: three rulers in a year, then none. Its provinces went their own way.',
            '{foe} broke the walls of {realm}\'s capital at {site}, and the realm fell with it.',
            'The last ruler of {realm}, {figure}, burned the palace rather than surrender it, and {realm} was gone.'
        ],
        roles: ['the last ruler', 'the traitor', 'the one who held the gate'],
        faith: ['The faithful said {god} had turned away from {realm}.', 'The high temple of {god} hid what it could and sealed its doors.'],
        legacies: [
            ['ruin', 'The ruined capital at {site}, overgrown and avoided.', 'Its throne room is said to be untouched, and the crown is said to still be on the throne.'],
            ['relic', 'The treasury of {realm}, hidden before the end and never found.', 'A map turned up in a dead man\'s boot.'],
            ['grudge', 'The heirs of {realm} still claim the throne, from exile.', 'A pretender has come home with an army of sellswords.'],
            ['custom', 'Old folk still swear "by the crown of {realmRoot}" when they are angry.', 'Someone wearing that crown has been seen.']
        ],
        next: [['dark', 4], ['invasion', 2], ['founding', 2], ['migration', 1]]
    },
    dark: {
        label: 'A dark age', icon: '🌑', len: 1, need: 'none',
        names: ['the Dark Age', 'the Long Night', 'the Forgotten Years', 'the Age of Wolves', 'the Grey Centuries'],
        textNo: [
            'With {old} gone, the roads fell apart, the towns shrank behind their walls, and wolves came back to the fields.',
            'Nobody ruled anything bigger than a valley. Monsters moved into the old ruins, and nobody went to get them out.',
            'The old learning was lost; only the monasteries kept a few books, and they kept them locked.'
        ],
        roles: ['the hermit-saint', 'the bandit king', 'the last scholar'],
        faith: ['Hedge priests kept the faith of {god} alive in the villages.', 'People forgot the old gods\' names and prayed to {god}, the only one who still answered.'],
        legacies: [
            ['ruin', 'A monastery at {site} that kept the old books through the dark.', 'The monks have stopped answering the door.'],
            ['custom', 'Doors are painted red to keep out what walks at night.', 'Doors have been scratched at, all down one street.'],
            ['grudge', 'Villages that took in refugees and villages that turned them away.', 'One village has called in a very old debt.'],
            ['relic', 'The Last Lamp of {old}, kept burning by monks for centuries.', 'The lamp has gone out.']
        ],
        next: [['founding', 4], ['invasion', 2], ['migration', 1], ['dragon', 1]]
    },
    invasion: {
        label: 'An invasion', icon: '🔥', len: 0.5,
        names: ['the Coming of {foeShort}', 'the Burning', 'the Years of Smoke', 'the Harrowing'],
        text: [
            '{foe} invaded {realm}. They took the {dir} half and held it for a lifetime.',
            '{foe} landed at {site}. {realm} paid tribute for fifty years before {figure} drove them out.'
        ],
        textNo: [
            '{foe} poured into the empty lands, and the villages had no one to call on.',
            'With no crown to stop them, {foe} took whatever they wanted until {figure} rallied the villages.'
        ],
        roles: ['the liberator', 'the invader\'s warlord', 'the hero who died at the ford'],
        faith: ['The invaders tore down the temples of {god}; the people hid the statues.', 'The faithful of {god} led the resistance.'],
        legacies: [
            ['ruin', 'The invaders\' great camp at {site}, a ring of earthworks and bones.', 'Something has moved into the old camp, and it remembers the invaders.'],
            ['grudge', 'The descendants of the invaders still live here, and are still not trusted.', 'A murder has set the two communities against each other.'],
            ['relic', 'The war-horn of the invaders\' warlord, which calls them back.', 'Someone has been blowing it on the hills at night.'],
            ['custom', 'The beacon towers along the coast, still kept lit.', 'One beacon has gone dark, and its keeper is missing.']
        ],
        next: [['founding', 3], ['war', 2], ['dark', 2], ['rebellion', 1]]
    },
    dragon: {
        label: 'A dragon\'s reign', icon: '🐉', len: 0.6,
        names: ['the Reign of {beast}', 'the Age of the Wyrm', 'the Burning Years', 'the Tribute Years'],
        text: [
            'The dragon {beast} came down on {realm} and made it pay: a tithe of gold and a tithe of cattle, every spring.',
            '{beast} burned {site} and claimed {realm} as its hoard. {figure} finally killed it, and did not survive the day.'
        ],
        textNo: [
            'The dragon {beast} ruled the land from {site}, and the peoples lived as its herds.',
            '{beast} slept on a mountain of stolen gold, and everyone for a hundred miles worked for it.'
        ],
        roles: ['the dragonslayer', 'the dragon\'s voice', 'the one who stole from the hoard'],
        faith: ['Some worshipped {beast} as a god; the temples of {god} have not forgiven them.', 'The faithful of {god} prayed for a dragonslayer, and got one.'],
        legacies: [
            ['ruin', 'The dragon\'s lair at {site}, still full of bones and melted gold.', 'An egg was left behind, and it is warm.'],
            ['relic', 'The dragonslayer\'s spear, notched and black.', 'The spear is in a museum, and someone wants to steal it.'],
            ['custom', 'Spring tribute day, now a feast, when cattle are driven up the hill and brought back down.', 'This year, the cattle did not come back down.'],
            ['grudge', 'The families who served {beast} and the families who did not.', 'One of the old servant families has started hoarding gold again.']
        ],
        next: [['founding', 2], ['war', 2], ['dark', 2], ['golden', 1]]
    },
    rebellion: {
        label: 'A rebellion', icon: '✊', len: 0.4, need: 'realm', realm: 'rival', form: 'republic',
        names: ['the Uprising', 'the Peasants\' War', 'the Year of Three Crowns', 'the Revolt'],
        text: [
            'The provinces of {realm} rose up under {figure} and made {new}.',
            'Taxes, famine, and one hanging too many: the towns of {realm} rebelled, and {new} was the result.'
        ],
        roles: ['the rebel leader', 'the hanged martyr', 'the turncoat'],
        faith: ['The rebels marched under the sign of {god}.', 'The temple of {god} backed the crown, and lost half its congregation for it.'],
        legacies: [
            ['grudge', 'The old nobility, stripped of their lands, never forgave {new}.', 'The old nobles are buying swords.'],
            ['relic', 'The rebel banner, kept in the town hall and taken out on feast days.', 'The banner has been stolen.'],
            ['custom', 'Every town elects its own mayor and argues about it for a month.', 'An election is coming, and one candidate keeps winning by too much.'],
            ['ruin', 'The tax office at {site}, burned on the first night and never rebuilt.', 'The tax records were not burned; someone has them.']
        ],
        next: [['golden', 2], ['war', 2], ['founding', 1], ['schism', 1]]
    },
    schism: {
        label: 'A schism', icon: '⛪', len: 0.5,
        names: ['the Schism', 'the Wars of Faith', 'the Burning of the Books', 'the Heresy'],
        text: [
            'The faithful of {realm} split over whether {god} or {god2} was the greater. Families burned each other\'s temples.',
            'A prophet, {figure}, said {god} had spoken to them alone. {realm} split in two over whether to believe it.'
        ],
        textNo: [
            'The faith of {god} split in two, and the two halves have hated each other ever since.',
            'Followers of {god2} declared the old priests liars, and the land burned for it.'
        ],
        roles: ['the prophet', 'the inquisitor', 'the heretic saint'],
        faith: ['Everything was about faith in this age: {god} against {god2}.', 'The temples of {god} were never as strong again.'],
        legacies: [
            ['grudge', 'Two sects of {god} still use different prayers and won\'t share a temple.', 'A sacred day falls on the same date for both this year.'],
            ['ruin', 'A burned temple at {site} that neither side will rebuild.', 'Someone has rebuilt the altar, and it\'s not for either side.'],
            ['relic', 'The prophet\'s book, banned by one sect and worshipped by the other.', 'A copy has turned up with pages nobody has seen before.'],
            ['custom', 'It is bad manners to ask anyone which way they pray.', 'Someone is keeping a list of who prays which way.']
        ],
        next: [['war', 3], ['rebellion', 2], ['golden', 1], ['dark', 1]]
    },
    treaty: {
        label: 'A treaty', icon: '🤝', len: 0.8,
        names: ['the Peace of {site}', 'the Concord', 'the Age of Treaties', 'the Long Truce'],
        text: [
            '{realm} and its enemies signed the Peace of {site}. It held, mostly, for generations.',
            '{figure} brokered a peace between {realm} and {foe}, and married into the other side to seal it.'
        ],
        textNo: [
            'The warlords met at {site} and divided the land between them, on paper at least.',
            'Exhausted by war, the peoples swore an oath at {site} and kept it longer than anyone expected.'
        ],
        roles: ['the peacemaker', 'the diplomat', 'the hostage prince'],
        faith: ['The treaty was sworn before {god}, and breaking it is still a sin.', 'Priests of {god} and {god2} blessed the peace together, just this once.'],
        legacies: [
            ['relic', 'The treaty stone at {site}, carved with every name that swore.', 'A name has been chipped off the stone.'],
            ['custom', 'Any traveler who asks for "the peace of the road" must be given bread.', 'A stranger keeps asking, and people who give it to him get sick.'],
            ['grudge', 'The side that gave up the most land still feels cheated.', 'They have found a loophole in the treaty.'],
            ['ruin', 'The tent-city at {site} where the peace was signed, now a market that never closes.', 'The market\'s oldest stall sells something it should not.']
        ],
        next: [['golden', 3], ['founding', 2], ['war', 1], ['empire', 1]]
    }
};

// How each age began: the line follows the age before it.
const HIS_BEGAN = {
    start:     'It began at the beginning of things, or as near as anyone remembers.',
    making:    'It began when the gods stepped back from the world they had made.',
    migration: 'It began once the newcomers had settled and run out of places to wander.',
    founding:  'It began once the new crown was secure and looking for more.',
    empire:    'It began at the height of the empire.',
    golden:    'It began at the end of the good years, though nobody knew it yet.',
    war:       'It began when the war was over, more or less.',
    plague:    'It began when the plague burned itself out.',
    cataclysm: 'It began in the ruins the cataclysm left.',
    fall:      'It began among the ruins of the fallen realm.',
    dark:      'It began as the long dark lifted.',
    invasion:  'It began after the invasion, among the burned villages.',
    dragon:    'It began when the dragon was gone.',
    rebellion: 'It began when the rebellion was won.',
    schism:    'It began when the faithful were done killing each other.',
    treaty:    'It began when the treaty was signed and everyone went home.'
};

// Second pass (E6): later draws (age.<i>.<start>.more) swap these in, so an old link keeps its ages.
const HIS_BEGAN_MORE = {
    start:     ['It began so long ago that the oldest songs only hum it.', 'It began before anyone thought to count the years.'],
    making:    ['It began when the world was finished, or the gods stopped working on it.', 'It began on the first morning the sun rose without a god pushing it.'],
    migration: ['It began once the wandering was over and the arguing about borders started.', 'It began when the last of the newcomers stopped calling the old country home.'],
    founding:  ['It began when the founders were dead and their heirs wanted more.', 'It began once the new realm had walls, laws, and enemies.'],
    empire:    ['It began with the empire at its proudest, which is never a good sign.', 'It began when the empire ran out of neighbors to conquer.'],
    golden:    ['It began when the good years ended, as good years do.', 'It began with the last of the great feasts, though the guests didn\'t know it.'],
    war:       ['It began with the soldiers coming home, the ones who could.', 'It began when the last banner was taken down from the field.'],
    plague:    ['It began when the sickness passed and the survivors counted the empty houses.', 'It began with the last plague pit filled in.'],
    cataclysm: ['It began when the dust settled and the survivors climbed out.', 'It began in a changed world, with new coasts and old maps that no longer worked.'],
    fall:      ['It began after the fall, when nobody was in charge of anything.', 'It began with the old crown lost and the old roads going to weed.'],
    dark:      ['It began when the first lamps were lit again.', 'It began as people came out of hiding and found the world still there.'],
    invasion:  ['It began when the invaders had gone, or settled in and stopped being called invaders.', 'It began as the refugees came home to whatever was left.'],
    dragon:    ['It began with the dragon dead and its hoard up for grabs.', 'It began when the sky was empty of wings for the first time in living memory.'],
    rebellion: ['It began when the rebels had to start governing.', 'It began on the day the old rulers were marched out of the gates.'],
    schism:    ['It began when the faith had split for good, and both halves claimed to be whole.', 'It began after the burnings stopped.'],
    treaty:    ['It began with the ink still wet on the treaty.', 'It began when the peace was signed, and the hard part started.']
};
// More roles for an age's figure (used when the story doesn't name them).
const HIS_ROLES_MORE = {
    making:    ['the first smith', 'the one who named the animals', 'the first to die'],
    migration: ['the navigator', 'the one who stayed behind', 'the keeper of the old songs'],
    founding:  ['the kingmaker', 'the first judge', 'the rival claimant'],
    empire:    ['the imperial treasurer', 'the governor of the far provinces', 'the court poet'],
    golden:    ['the master architect', 'the great physician', 'the merchant prince'],
    war:       ['the spymaster', 'the deserter who became a legend', 'the quartermaster who kept the army fed'],
    plague:    ['the gravedigger', 'the quarantine warden', 'the priest who stayed'],
    cataclysm: ['the one who led the survivors out', 'the scholar who wrote it all down', 'the mapmaker of the new coasts'],
    fall:      ['the regent who failed', 'the looter', 'the keeper of the last library'],
    dark:      ['the lamplighter', 'the warlord of the ruins', 'the wandering teacher'],
    invasion:  ['the collaborator', 'the resistance leader', 'the child who carried the messages'],
    dragon:    ['the dragon\'s keeper', 'the smith who forged the spear', 'the one who bargained with it'],
    rebellion: ['the pamphleteer', 'the general who switched sides', 'the old ruler\'s heir'],
    schism:    ['the reformer', 'the high priest who refused to choose', 'the scribe who forged the scripture'],
    treaty:    ['the translator', 'the witness who signed for the absent', 'the spy at the table']
};

const HIS_START_KIND ={ gods: 'making', empire: 'empire', dark: 'dark', migration: 'migration' };

// ── Helpers ──────────────────────────────────────────────
function hisPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function hisWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function hisCap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function hisRoot(used) {
    for (let t = 0; t < 30; t++) {
        const r = hisPick(HIS_ONSETS) + hisPick(HIS_MIDS) + hisPick(HIS_ENDS);
        const low = r.toLowerCase();
        if (low.length < 4 || low.length > 10 || used.has(low) || /([a-z])\1\1/.test(low) || /[aeiou]{3}/.test(low)) continue;
        used.add(low);
        return r;
    }
    return hisPick(HIS_ONSETS) + hisPick(HIS_ENDS);
}

function hisRealm(form, root) {
    return { root, form, name: hisPick(HIS_FORMS[form]).replace('{r}', root) };
}

function hisSite(used) {
    const root = hisRoot(used);
    return hisWeighted([[root, 3], [`${root} ${hisPick(HIS_SITE_HEADS)}`, 2], [`the ${hisPick(HIS_SITE_HEADS)} of ${root}`, 2]]);
}

// { foe, foeShort }: the foe in a sentence and in an age's name.
function hisFoe() {
    const [full, short] = hisPick(HIS_FOES);
    const dir = hisPick(HIS_DIRS), beast = hisPick(HIS_BEASTS);
    const f = s => s.replace('{dir}', dir).replace('{beast}', beast);
    return { foe: f(full), foeShort: f(short) };
}

// ── The roll ─────────────────────────────────────────────
// opts: { ages: 'random'|few|standard|long, span: 'random'|short|long|deep, start: 'random'|gods|empire|dark|migration }
function rollHistory(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const ages = HIS_AGES[opts.ages] ? opts.ages : part('ages', () => hisWeighted([['standard', 5], ['few', 3], ['long', 2]]));
    const span = HIS_SPANS[opts.span] ? opts.span : part('span', () => hisWeighted([['long', 5], ['short', 3], ['deep', 2]]));
    const start = HIS_STARTS[opts.start] ? opts.start : part('start', () => hisWeighted([['gods', 3], ['empire', 2], ['dark', 2], ['migration', 3]]));
    const a = HIS_AGES[ages];
    const n = part('n.' + ages, () => a.min + Math.floor(rand() * (a.max - a.min + 1)));

    const used = new Set();
    const st = { realm: null, old: null, prevKind: 'start', usedNames: new Set() };
    // An old empire is already standing when history starts.
    if (start === 'empire') part('first-realm', () => { st.realm = hisRealm('empire', hisRoot(used)); });
    const list = [];
    for (let i = 0; i < n; i++) {
        list.push(part(`age.${i}.${start}`, () => hisRollAge(i, i === 0 ? HIS_START_KIND[start] : null, st, used)));
    }
    // Years: each age's weight shares out the whole span, counted back from today.
    const total = part('years.' + span, () => {
        const s = HIS_SPANS[span];
        return Math.round((s.min + rand() * (s.max - s.min)) / 10) * 10;
    });
    const weightSum = list.reduce((s, x) => s + x.weight, 0);
    let ago = total;
    list.forEach((x, i) => {
        x.startAgo = ago;
        const len = Math.max(10, Math.round(total * x.weight / weightSum / 10) * 10);
        ago = i === list.length - 1 ? 0 : Math.max(0, ago - len);
        x.endAgo = ago;
    });
    list[list.length - 1].ongoing = true;
    // The second pass (E6): newer openings and roles swap in by their share, after everything else.
    list.forEach((x, i) => part(`age.${i}.${start}.more`, () => {
        const prev = i === 0 ? 'start' : list[i - 1].kind;
        const began = HIS_BEGAN_MORE[prev] || HIS_BEGAN_MORE.start;
        const newer = hisPick(began);
        if (rand() < began.length / (began.length + 1)) x.began = newer;
        const K = HIS_KINDS[x.kind], roles = HIS_ROLES_MORE[x.kind] || [];
        const role = roles.length ? hisPick(roles) : null;
        if (rand() < roles.length / (K.roles.length + roles.length) && !x.figure.fixed) x.figure.role = role;
    }));
    return { seed, ages, span, start, total, list, realm: st.realm, old: st.old };
}

function hisRollAge(i, forced, st, used) {
    const prev = st.prevKind;
    // What can follow: the last age's next list, minus anything that needs a realm (or none) we don't have.
    const fits = k => {
        const need = HIS_KINDS[k].need;
        return !(need === 'realm' && !st.realm) && !(need === 'none' && st.realm);
    };
    let kind = forced;
    if (!kind) {
        const nexts = (HIS_KINDS[prev] ? HIS_KINDS[prev].next : [['founding', 1]]).filter(([k]) => fits(k));
        kind = nexts.length ? hisWeighted(nexts) : (st.realm ? 'war' : 'founding');
    }
    const K = HIS_KINDS[kind];
    const figure = rollNames(1)[0];
    const vars = {
        realm: st.realm ? st.realm.name : 'the old lands',
        realmRoot: st.realm ? st.realm.root : 'the Old Kings',
        old: st.old ? st.old.name : 'the old world',
        ...hisFoe(),
        site: hisSite(used),
        dir: hisPick(HIS_DIRS),
        beast: hisPick(HIS_BEASTS),
        people: hisPick(HIS_PEOPLES),
        figure: figure.name,
        rival: hisRealm('kingdom', hisRoot(used)).name
    };
    // The text is picked before the realm changes, so {realm} is the realm the age began with.
    const hadRealm = !!st.realm;
    const texts = hadRealm && K.text ? K.text : (K.textNo || K.text);
    const text = hisPick(texts);
    // A story that names the figure gets the role that fits it (each kind's first role).
    const rolled = hisPick(K.roles);
    const role = /\{figure\}/.test(text) ? K.roles[0] : rolled;
    const faith = hisPick(K.faith);
    // Two or three legacies, no repeats.
    const pool = K.legacies.slice();
    const legacies = [];
    const want = 2 + (rand() < 0.4 ? 1 : 0);
    while (legacies.length < want && pool.length) legacies.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    const godDraws = [rand(), rand(), rand()];
    const weight = K.len * (0.6 + rand() * 0.8);

    // What happens to the realm.
    const newRoot = hisRoot(used);
    if (K.realm === 'new') {
        if (st.realm && kind === 'founding') st.old = st.realm;
        st.realm = hisRealm(K.form, newRoot);
    } else if (K.realm === 'grow') {
        st.realm = st.realm ? hisRealm('empire', st.realm.root) : hisRealm('empire', newRoot);
    } else if (K.realm === 'fall') {
        st.old = st.realm;
        st.realm = null;
    } else if (K.realm === 'rival') {
        st.old = st.realm;
        st.realm = hisRealm(hisPick(['republic', 'kingdom']), newRoot);
    } else if (kind === 'cataclysm' && st.realm && rand() < 0.6) {
        st.old = st.realm;
        st.realm = null;
    } else if (kind === 'invasion' && st.realm && rand() < 0.3) {
        st.old = st.realm;
        st.realm = null;
    } else if (kind === 'schism' && st.realm && rand() < 0.3) {
        st.realm = hisRealm('holy', st.realm.root);
    }
    vars.new = st.realm ? st.realm.name : vars.realm;
    vars.after = st.realm ? st.realm.name : null;
    vars.newRoot = st.realm ? st.realm.root : vars.realmRoot;

    let name = hisPick(K.names);
    for (let t = 0; t < 6 && st.usedNames.has(name); t++) name = hisPick(K.names);
    const fill = s => s.replace(/\{(realm|realmRoot|old|foe|foeShort|site|dir|beast|people|figure|rival|newRoot|new)\}/g, (m, k) => vars[k]);
    name = fill(name);
    st.usedNames.add(name);
    st.prevKind = kind;
    return {
        i, kind, name, weight,
        began: HIS_BEGAN[prev] || HIS_BEGAN.start,
        text: fill(text),
        figure: { name: figure.name, race: figure.race, role, fixed: /\{figure\}/.test(text) },
        faith: fill(faith),
        legacies: legacies.map(([lk, t, hook]) => ({ kind: lk, text: fill(t), hook: fill(hook) })),
        godDraws,
        realmAfter: vars.after
    };
}

// ── Gods and factions ────────────────────────────────────
// The gods this age names: [god, god2] as display names. pantheon: rollPantheon() or null.
function hisGods(age, pantheon) {
    if (pantheon && pantheon.gods.length) {
        const gs = pantheon.gods;
        const a = Math.floor(age.godDraws[0] * gs.length);
        let b = Math.floor(age.godDraws[1] * gs.length);
        if (b === a) b = (a + 1) % gs.length;
        return [gs[a].name, gs[b].name];
    }
    const keys = PAN_DOMAIN_KEYS;
    const da = keys[Math.floor(age.godDraws[0] * keys.length)];
    let db = keys[Math.floor(age.godDraws[1] * keys.length)];
    if (db === da) db = keys[(keys.indexOf(da) + 1) % keys.length];
    const t = list => list[Math.floor(age.godDraws[2] * list.length)];
    return [t(PAN_TITLES[da]), t(PAN_TITLES[db])];
}

function hisFillGods(text, age, pantheon) {
    const [g1, g2] = hisGods(age, pantheon);
    return hisCap(text.replace(/\{god\}/g, g1).replace(/\{god2\}/g, g2));
}

// Which age each faction of a linked faction roll was founded in: { ageIndex: [faction index] }.
// Most were founded late; a few are very old. Follows the faction's own seed, so it's stable.
function hisFactionAges(h, facs) {
    const out = {};
    if (!facs) return out;
    const n = h.list.length;
    facs.factions.forEach((f, k) => {
        const r = (hashString(facs.seed + '/' + k + '/' + h.seed) % 1000) / 1000;
        // Skewed toward the last ages: r² from the end.
        const idx = Math.max(0, n - 1 - Math.floor(r * r * n));
        (out[idx] = out[idx] || []).push(k);
    });
    return out;
}

// ── Text ─────────────────────────────────────────────────
const HIS_LEGACY_ICONS = { ruin: '🏚️', relic: '💎', grudge: '⚔️', custom: '📜' };
const HIS_LEGACY_LABELS = { ruin: 'Ruin', relic: 'Relic', grudge: 'Grudge', custom: 'Custom' };

function hisYears(n) {
    return n.toLocaleString('en-US');
}

function hisWhen(age) {
    if (age.ongoing) return `${hisYears(age.startAgo)} years ago to today`;
    return `${hisYears(age.startAgo)} to ${hisYears(age.endAgo)} years ago`;
}

// ctx: { pantheon, factions, facCtx } — linked rolls (or null).
function hisAgeLines(h, i, ctx) {
    const age = h.list[i];
    const g = s => hisFillGods(s, age, ctx && ctx.pantheon);
    const lines = [
        ['When', hisCap(hisWhen(age)) + (age.ongoing ? ' (this age is still going on)' : '') + '.'],
        ['What happened', `${age.began} ${g(age.text)}`],
        ['Who mattered', `${age.figure.name}, ${age.figure.race}, ${age.figure.role}.`],
        ['Faith', g(age.faith)]
    ];
    if (age.realmAfter) lines.push(['Who ruled after', hisCap(age.realmAfter) + '.']);
    const facAges = ctx && ctx.factions ? hisFactionAges(h, ctx.factions) : {};
    if (facAges[i]) {
        const names = facAges[i].map(k => hisCap(facName(ctx.factions, k, ctx.facCtx)));
        lines.push(['Founded in this age', names.join('; ') + '.']);
    }
    age.legacies.forEach(l => lines.push([`${HIS_LEGACY_LABELS[l.kind]} left behind`, `${g(l.text)} Today: ${g(l.hook)}`]));
    return lines;
}

// Loose threads for play: the legacies of the last few ages, newest first.
function hisThreads(h, ctx) {
    const out = [];
    for (let i = h.list.length - 1; i >= 0 && out.length < 4; i--) {
        const age = h.list[i];
        const l = age.legacies.find(x => x.kind !== 'custom') || age.legacies[0];
        const g = t => hisFillGods(t, age, ctx && ctx.pantheon);
        out.push({ i, kind: l.kind, text: `${g(l.text)} ${g(l.hook)}`, from: age.name });
    }
    return out;
}

function hisSummary(h) {
    const first = h.list[0], last = h.list[h.list.length - 1];
    const now = h.realm ? `Today, ${h.realm.name} rules.` : 'Today, no single crown rules.';
    return `${h.list.length} ages over ${hisYears(h.total)} years, from ${first.name} to ${last.name}. ${now}`;
}

function historyText(h, ctx) {
    const out = ['A history of the world', hisSummary(h), ''];
    h.list.forEach((age, i) => {
        out.push(`${HIS_KINDS[age.kind].icon} Age ${i + 1}: ${hisCap(age.name)}`);
        hisAgeLines(h, i, ctx).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
        out.push('');
    });
    out.push('Loose threads:');
    hisThreads(h, ctx).forEach(t => out.push(`- ${t.text} (from ${t.from})`));
    return out.join('\n').trim();
}
