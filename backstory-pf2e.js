/* ============================================
   BACKSTORY GENERATOR, PATHFINDER LINES (ROADMAP L3 P5.7): the Pathfinder
   page's ancestries and classes, added to backstory.js's tables. Load it
   after backstory.js on a data-system="pf2e" page. Everything here is the
   Gazette's own flavor; no rules text. A class or ancestry D&D also has
   keeps the D&D lines (a champion takes the paladin's, a witch the
   warlock's), and the rest get lines of their own.
   ============================================ */

// Rough coming-of-age ages, for Turning points (flavor, not a rule).
Object.assign(BS_ADULT, {
    catfolk: 15, gnome: 30, goblin: 12, hobgoblin: 14, kholo: 14, kobold: 12, leshy: 8,
    lizardfolk: 15, orc: 14, ratfolk: 14, tengu: 15, tripkee: 12, elf: 60, dwarf: 40, human: 16
});

// The NPC name tables each ancestry borrows.
Object.assign(BS_NAME_RACES, {
    catfolk: ['elf', 'human'], goblin: ['gnome', 'halfling'], hobgoblin: ['orc'], kholo: ['orc'],
    kobold: ['dragonborn'], leshy: ['elf', 'gnome'], lizardfolk: ['dragonborn'], orc: ['orc'],
    ratfolk: ['halfling', 'gnome'], tengu: ['human'], tripkee: ['halfling']
});

Object.assign(BS_UPBRINGING_RACE, {
    catfolk: ["In a catfolk clan that told a new story every night and never the same one twice", "In a caravan city where catfolk traders sold news along with spices", "Among humans who thought my curiosity was rude and my naps were lazy"],
    goblin: ["In a goblin warren where the loudest song won every argument", "In a town's goblin quarter, behind a junk shop full of things that still almost worked", "With a goblin tribe that moved every time the fires got out of hand"],
    hobgoblin: ["In a hobgoblin barracks town where children drilled before breakfast", "In a city that hired hobgoblin guards and never invited them to dinner", "In a border legion's camp, raised by whichever soldier was off duty"],
    kholo: ["In a kholo clan that laughed loudest at funerals", "On the savanna, following the herds with my clan", "In a trading town that feared my clan and bought our hides all the same"],
    kobold: ["In a kobold warren dug beneath an old dragon's lair", "In tunnels full of traps my family built and I learned to walk around", "Among a kobold clan that swore our dragon would come back one day"],
    leshy: ["As a seed in a druid's garden, until the garden woke me", "In an old grove, where the trees are the only elders I know", "Grown for a purpose by someone who never told me what it was"],
    lizardfolk: ["In a marsh village built on stilts above the water", "In a hatchery tended by the whole clan at once", "In a city's canal district, where my people keep the waterways running"],
    orc: ["In an orc hold where every scar had a story and every story got told", "In a frontier town that hired orcs to keep it safe and blamed them when it wasn't", "With an orc band that took in anyone who could keep up"],
    ratfolk: ["In a ratfolk warren where twenty cousins shared one kitchen", "On a trading barge my family has worked for six generations", "Under a city's streets, in tunnels the surface folk forgot they built"],
    tengu: ["In a port city's tengu rookery, among sailors and storytellers", "With a tengu flock that picked up every language at every dock", "In a mountain shrine where my people kept the old swords"],
    tripkee: ["High in a rainforest canopy, in a village of woven branches", "In a tripkee village that sang to the rain every evening", "Among bigger folk, where I learned to climb anything to be seen"]
});

Object.assign(BS_UPBRINGING_RACE_MORE, {
    catfolk: ["In a library where I slept on the warm shelves and read whatever was under me", "With a clan of catfolk scouts who mapped every road they ever walked"],
    goblin: ["In a goblin camp that adopted a dog, then a horse, then me", "In a fire brigade, of all places, that was mostly goblins and very proud of it"],
    hobgoblin: ["In a family of hobgoblin engineers who could build a bridge by nightfall", "In a hobgoblin settlement that left the old empire and never looked back"],
    kholo: ["In a kholo band that guarded caravans across the dry country", "With a clan matriarch who taught me that every bone can be a tool"],
    kobold: ["In a kobold mining clan that sold gems to people who never asked where they came from", "In a sewer warren under a big city, where kobolds keep the pipes working"],
    leshy: ["In a farmer's field, as a guardian against crows that never came", "In a wizard's greenhouse, where I sprouted by accident"],
    lizardfolk: ["In a clan of lizardfolk historians who remember everything that ever drowned", "On a river delta that changed its shape every flood season"],
    orc: ["In an orc family of smiths whose blades hang in three kingdoms", "In a city orc district where the music never stopped"],
    ratfolk: ["In a ratfolk trading clan that kept a ledger of every favor ever owed", "In a scrapyard my grandmother ran like a small kingdom"],
    tengu: ["On a merchant ship whose captain swore a tengu aboard was good luck", "In a tengu family of swordsmiths who sharpened every blade by hand"],
    tripkee: ["In a tripkee village that moved to a new tree every rainy season", "With a tripkee healer who knew a cure in every leaf"]
});

const BS_DRUID_PF = BS_REASON_CLASS.druid.map(s => s.replace(/\bcircle\b/g, 'order'));
Object.assign(BS_REASON_CLASS, {
    druid: BS_DRUID_PF,
    champion: BS_REASON_CLASS.paladin,
    witch: BS_REASON_CLASS.warlock,
    alchemist: ["I need ingredients that only grow in places that try to kill you", "My workshop blew up, and the city asked me to leave", "I'm close to a formula that will change everything; I just need to test it", "Adventurers pay well for anything that bubbles"],
    investigator: ["A case went cold, and I'm the only one who didn't give up on it", "Someone framed my mentor, and I'm going to prove it", "Every ruin is a mystery, and I can't leave a mystery alone", "The city watch stopped listening to me, so I went where the clues are"],
    oracle: ["My curse shows me things, and I have to see where they lead", "A god I've never prayed to chose me, and I want to know why", "The visions get worse when I stay in one place", "I'm looking for anyone else who carries a mystery like mine"],
    swashbuckler: ["Nobody tells stories about people who stay home", "I want a duel worth remembering", "A rival insulted my style, and I'll prove them wrong in front of everyone", "Danger is the only audience that never gets bored"]
});
Object.assign(BS_REASON_CLASS_MORE, {
    druid: BS_REASON_CLASS_MORE.druid.map(s => s.replace(/\bcircle\b/g, 'order')),
    champion: BS_REASON_CLASS_MORE.paladin,
    witch: BS_REASON_CLASS_MORE.warlock,
    alchemist: ["I'm hunting the rival who stole my best formula", "One of my potions did something it shouldn't, and I need to find out why"],
    investigator: ["I found a name in a dead man's notebook, and it was mine", "My agency sends me where the trouble is"],
    oracle: ["The mystery inside me is growing, and someone out there knows how it ends", "A prophecy named me, and I'd like a word with whoever wrote it"],
    swashbuckler: ["I lost my sword in a bet and I mean to win it back", "My fencing school closed, and I'm its last student"]
});
Object.assign(BS_SECRET_CLASS, {
    champion: BS_SECRET_CLASS.paladin,
    witch: BS_SECRET_CLASS.warlock,
    alchemist: ["The fire that burned my old street started in my workshop", "I sold a formula to someone I knew would use it to hurt people"],
    investigator: ["I planted the evidence in my most famous case", "The criminal I'm chasing is family"],
    oracle: ["I've seen how I die, and I haven't told anyone", "My curse started the day I stole something from a temple"],
    swashbuckler: ["I've never won a fair duel", "My famous scar came from falling off a roof"]
});
Object.assign(BS_MENTOR_LESSONS_CLASS, {
    champion: BS_MENTOR_LESSONS_CLASS.paladin, witch: 'that a patron is always listening',
    alchemist: 'to label every bottle', investigator: 'to ask the second question',
    oracle: 'to live with what I see', swashbuckler: 'to bow before the fight, not after'
});
