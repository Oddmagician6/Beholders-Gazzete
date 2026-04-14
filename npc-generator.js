/* ============================================
   COMPREHENSIVE NPC GENERATOR
   ============================================ */

// ==================== DATA ARRAYS ====================

const npcData = {
    // NAMES
    names: {
        human: {
            male: ["Aldric", "Beron", "Cedric", "Darius", "Edric", "Falcon", "Gareth", "Hector", "Ivan", "Jorah", "Kael", "Lance", "Marcus", "Nolan", "Oscar", "Percy", "Quinn", "Roland", "Stefan", "Thorin", "Ulric", "Victor", "Walter", "Xander", "York", "Zane"],
            female: ["Adara", "Brynn", "Celia", "Diana", "Elara", "Fiona", "Giselle", "Hanna", "Isla", "Jenna", "Kara", "Luna", "Mira", "Nadia", "Ophelia", "Piper", "Quinn", "Rosa", "Sera", "Talia", "Una", "Vera", "Willa", "Xena", "Yara", "Zara"],
            nonbinary: ["Alex", "Blake", "Casey", "Drew", "Ember", "Finley", "Grey", "Harper", "Indigo", "Jordan", "Kai", "Logan", "Morgan", "Noel", "Ocean", "Phoenix", "Quinn", "River", "Sage", "Taylor", "Uri", "Val", "Winter", "Xander", "Yuki", "Zephyr"]
        },
        elf: {
            male: ["Aelindra", "Baelon", "Caelum", "Daeron", "Elandor", "Faelar", "Galion", "Haladir", "Ithil", "Jael", "Kaelen", "Liriel", "Maeron", "Nimrod", "Oropher", "Paelor", "Quillan", "Randir", "Saelon", "Thalor", "Ulvar", "Vaelen", "Wynor", "Xylar", "Yandir", "Zephyr"],
            female: ["Aeliana", "Brielle", "Celeste", "Delphine", "Elowen", "Fae", "Galadriel", "Haelia", "Ilana", "Jaelle", "Kaelia", "Lirien", "Maelis", "Nimue", "Oriana", "Paela", "Quiana", "Rhiannon", "Sylvara", "Thalia", "Undine", "Vaela", "Wynne", "Xylia", "Yara", "Zinnia"],
            nonbinary: ["Arya", "Bryn", "Cael", "Dawn", "Echo", "Fay", "Glen", "Haze", "Ivy", "Jade", "Kai", "Lark", "Mist", "Nym", "Opal", "Pearl", "Quill", "Rain", "Storm", "Teal", "Umber", "Vale", "Wren", "Xan", "Yew", "Zest"]
        },
        dwarf: {
            male: ["Bardin", "Brom", "Dain", "Durin", "Einar", "Fargrim", "Gimli", "Horgar", "Ironfist", "Jorunn", "Korgan", "Lodvar", "Magni", "Nordin", "Orin", "Petrok", "Quarrel", "Rurik", "Sten", "Thrain", "Ulfgar", "Vondal", "Wulfgar", "Xol", "Yorg", "Zorn"],
            female: ["Berna", "Dagna", "Edda", "Frigga", "Gerta", "Helga", "Inga", "Jora", "Kelda", "Lofa", "Magna", "Nanna", "Orla", "Petra", "Runa", "Sif", "Thora", "Ursa", "Valka", "Wenda", "Xandra", "Ylva", "Zora", "Astrid", "Brynja", "Disa"],
            nonbinary: ["Ax", "Beck", "Coal", "Drax", "Ember", "Flint", "Granite", "Hearth", "Iron", "Jade", "Kiln", "Lode", "Mica", "Nickel", "Ore", "Pick", "Quartz", "Rock", "Steel", "Torch", "Umber", "Vein", "Weld", "Xis", "Yarn", "Zinc"]
        },
        halfling: {
            male: ["Andry", "Bilo", "Chetto", "Dago", "Eldo", "Fredo", "Gordo", "Hugo", "Ildeo", "Jago", "Kerto", "Lobo", "Milo", "Nodo", "Ondo", "Pipo", "Quinto", "Rollo", "Sando", "Togo", "Ugo", "Vico", "Wilo", "Xando", "Yolo", "Zeno"],
            female: ["Andrya", "Bila", "Chetta", "Daga", "Elda", "Freda", "Gorda", "Huga", "Ildea", "Jaga", "Kerta", "Loba", "Mila", "Noda", "Onda", "Pipa", "Quinta", "Rolla", "Sanda", "Toga", "Uga", "Vica", "Wila", "Xanda", "Yola", "Zena"],
            nonbinary: ["Apple", "Berry", "Cherry", "Daisy", "Eden", "Fern", "Gold", "Hazel", "Ivy", "Juniper", "Kettle", "Lily", "Maple", "Nutmeg", "Olive", "Pip", "Quince", "Rose", "Sage", "Thyme", "Umber", "Vine", "Willow", "Xena", "Yarrow", "Zest"]
        },
        gnome: {
            male: ["Alston", "Bimble", "Candle", "Dabbledob", "Eberk", "Fonkin", "Gerbo", "Hilltop", "Ikky", "Jimmim", "Kellen", "Limwick", "Moxie", "Nackle", "Ollie", "Pock", "Quillen", "Rumble", "Sorn", "Tock", "Umlit", "Vimble", "Wistle", "Xylo", "Yip", "Zook"],
            female: ["Althea", "Bimpnottin", "Caramip", "Duvamil", "Ellywick", "Folli", "Gimle", "Hilli", "Irlana", "Jillan", "Kerri", "Lilli", "Merry", "Nissa", "Odil", "Pily", "Quilla", "Rilli", "Silli", "Tilli", "Ulma", "Villy", "Willa", "Xylla", "Yolla", "Zanna"],
            nonbinary: ["Blink", "Cog", "Dial", "Echo", "Fizz", "Gizmo", "Hatch", "Ink", "Jinx", "Knob", "Lever", "Mech", "Nook", "Orbit", "Piston", "Quirk", "Rivet", "Spark", "Tick", "Unit", "Volt", "Watt", "Xis", "Yarn", "Zip", "Zoom"]
        },
        orc: {
            male: ["Adrak", "Bagrot", "Crag", "Drog", "Egrak", "Farg", "Gorak", "Hrog", "Irok", "Jarg", "Krag", "Lug", "Morg", "Narg", "Ograk", "Parg", "Qrog", "Rag", "Srog", "Trog", "Urag", "Varg", "Wrog", "Xarg", "Yrog", "Zrag"],
            female: ["Adra", "Bagga", "Craga", "Droga", "Egra", "Farga", "Gora", "Hroga", "Iroga", "Jarga", "Kraga", "Luga", "Morga", "Narga", "Ogra", "Parga", "Qroga", "Raga", "Sroga", "Troga", "Uraga", "Varga", "Wroga", "Xarga", "Yroga", "Zraga"],
            nonbinary: ["Axe", "Bone", "Crush", "Dent", "Edge", "Fang", "Gore", "Hack", "Iron", "Jaw", "Kill", "Lash", "Mace", "Notch", "Ogre", "Pike", "Quell", "Rend", "Slash", "Thorn", "Urchin", "Vice", "War", "Xen", "Yell", "Zap"]
        },
        tiefling: {
            male: ["Akmenos", "Barbas", "Cain", "Damien", "Erebus", "Fenris", "Gideon", "Hades", "Icarus", "Jezek", "Kallista", "Lucius", "Mephisto", "Neron", "Orion", "Pazuzu", "Quintus", "Raphael", "Samael", "Tartarus", "Uriel", "Valthune", "Wraith", "Xerxes", "Yasmin", "Zariel"],
            female: ["Akta", "Brielle", "Crimson", "Desdemona", "Erebus", "Fia", "Gorgo", "Hecate", "Ione", "Jezabel", "Kallista", "Lilith", "Morgana", "Nyx", "Ophelia", "Pandora", "Quintessa", "Ravenna", "Serafina", "Tiamat", "Undine", "Vesper", "Wicked", "Xaria", "Yasmin", "Zara"],
            nonbinary: ["Ash", "Blaze", "Cinder", "Dusk", "Ember", "Flame", "Glow", "Haze", "Inferno", "Jet", "Karma", "Lava", "Mist", "Night", "Onyx", "Pyre", "Quake", "Raven", "Smoke", "Twilight", "Umber", "Void", "Wisp", "Xis", "Yonder", "Zenith"]
        },
        dragonborn: {
            male: ["Arjhan", "Balasar", "Bharash", "Donaar", "Ghesh", "Heskan", "Kriv", "Medrash", "Mehen", "Nadarr", "Pandjed", "Patrin", "Rhogar", "Shamash", "Tarhun", "Torinn", "Uadjit", "Vhazir", "Wikk", "Xorlarrin", "Yurrel", "Zehirin"],
            female: ["Akra", "Biri", "Daar", "Farideh", "Harann", "Havilar", "Jheri", "Kava", "Korinn", "Mishann", "Nala", "Perra", "Raiann", "Sora", "Surina", "Thava", "Uadjit", "Vhazir", "Wikk", "Xyphara", "Yasmin", "Zehirin"],
            nonbinary: ["Ash", "Blaze", "Claw", "Drake", "Ember", "Fang", "Glow", "Hide", "Ignite", "Jaws", "Klaw", "Lava", "Molt", "Nova", "Onyx", "Pyre", "Quake", "Roar", "Scale", "Talon", "Umber", "Vapor", "Wing", "Xis", "Yarn", "Zenith"]
        }
    },

    // PROFESSIONS
    professions: {
        commoner: ["Baker", "Barber", "Blacksmith", "Carpenter", "Cook", "Farmer", "Fisher", "Gardener", "Herder", "Hunter", "Laborer", "Mason", "Miller", "Miner", "Potter", "Rancher", "Sailor", "Servant", "Stablehand", "Weaver"],
        merchant: ["Apothecary", "Bookseller", "Clothier", "Gem Merchant", "General Store Owner", "Grocer", "Herb Seller", "Jeweler", "Livestock Trader", "Map Maker", "Potion Seller", "Scroll Merchant", "Spice Trader", "Tailor", "Weapon Smith", "Wine Merchant"],
        guard: ["City Guard", "Gate Keeper", "Harbormaster", "Herald", "Judge", "Lawyer", "Magistrate", "Marshal", "Night Watch", "Prison Guard", "Royal Guard", "Sheriff", "Soldier", "Tax Collector", "Town Crier", "Warden"],
        magic: ["Alchemist", "Arcane Scholar", "Artificer", "Diviner", "Enchanter", "Hedge Wizard", "Illusionist", "Magical Tutor", "Necromancer", "Oracle", "Sage", "Scrivener", "Sorcerer", "Spellbook Seller", "Transmuter", "Witch"],
        criminal: ["Assassin", "Burglar", "Con Artist", "Counterfeiter", "Fence", "Gang Leader", "Hacker", "Informant", "Pickpocket", "Pirate", "Poacher", "Racketeer", "Saboteur", "Smuggler", "Spy", "Thief"],
        noble: ["Baron", "Baroness", "Count", "Countess", "Duke", "Duchess", "Earl", "Heir", "Knight", "Lady", "Lord", "Mayor", "Prince", "Princess", "Viscount", "Viscountess"],
        religious: ["Acolyte", "Chaplain", "Cleric", "Deacon", "Druid", "Exorcist", "Friar", "High Priest", "Inquisitor", "Missionary", "Monk", "Nun", "Paladin", "Priest", "Prophet", "Shaman"],
        adventurer: ["Barbarian", "Bard", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard", "Artificer", "Druid", "Cleric"]
    },

    // PERSONALITY TRAITS
    traits: [
        "Always carries a lucky charm", "Believes everything they read", "Cannot tell a lie", 
        "Constantly humming", "Counts everything", "Deeply suspicious of magic", 
        "Eats like they're starving", "Fallen from grace", "Fears the dark", 
        "Gambles recklessly", "Has a secret tattoo", "Hoards shiny objects", 
        "Imitates others' speech", "Incredibly optimistic", "Jokes at inappropriate times", 
        "Keeps a journal", "Loves children", "Miserly with coin", 
        "Never backs down", "Obsessed with cleanliness", "Overly trusting", 
        "Paranoid about poison", "Quotes ancient texts", "Rarely smiles", 
        "Superstitious", "Talks to animals", "Unable to keep secrets", 
        "Values honor above all", "Wears mismatched clothes", "Xenophobic"
    ],

    ideals: [
        "Balance: Everything must be in perfect balance", "Charity: I help those in need", 
        "Community: We must protect our home", "Creativity: Art and beauty matter", 
        "Destiny: My path is preordained", "Education: Knowledge is power", 
        "Faith: My god guides me", "Freedom: Chains are meant to be broken", 
        "Glory: I will be remembered", "Honor: My word is my bond", 
        "Justice: The law must be upheld", "Knowledge: I seek truth", 
        "Life: All life is sacred", "Might: Power is everything", 
        "Nature: The wild must be preserved", "Order: Rules create society", 
        "Passion: I feel everything deeply", "Redemption: Everyone deserves a second chance", 
        "Tradition: The old ways are best", "Wealth: Gold solves everything"
    ],

    bonds: [
        "I owe my life to someone", "My family is everything", "I seek revenge", 
        "I protect a sacred place", "My town needs me", "I have a debt to pay", 
        "I guard a dangerous secret", "My god depends on me", "I seek a lost artifact", 
        "I must prove myself", "My mentor believes in me", "I fight for the oppressed", 
        "I have a child to raise", "My business is my legacy", "I seek my true parentage", 
        "I must break a curse", "My kingdom comes first", "I protect the innocent", 
        "I seek immortality", "I must right a wrong"
    ],

    flaws: [
        "Addicted to gambling", "Afraid of commitment", "Arrogant", "Cowardly", 
        "Cruel when angry", "Easily distracted", "Envious of others", 
        "Foolishly brave", "Greedy", "Holds grudges", "Impulsive", 
        "Insecure", "Lazy", "Loud and obnoxious", "Manipulative", 
        "Naive", "Obsessive", "Overconfident", "Prejudiced", 
        "Procrastinates", "Reckless", "Rude", "Selfish", 
        "Short-tempered", "Stubborn", "Superstitious", "Untrustworthy", 
        "Vain", "Weak-willed", "Zealous"
    ],

    // QUIRKS
    quirks: [
        "Always touches doorframes before entering", "Blinks one eye at a time", 
        "Calls everyone by the wrong name", "Collects teeth", 
        "Constantly polishing something", "Counts steps while walking", 
        "Eats with gloves on", "Falls asleep standing up", 
        "Gestures wildly when talking", "Has a nervous tic", 
        "Insists on sitting with back to wall", "Keeps talking to invisible friend", 
        "Laughs at own jokes", "Mimics accents randomly", 
        "Never makes eye contact", "Offers unsolicited advice", 
        "Peeks into every container", "Quotes proverbs incorrectly", 
        "Refuses to step on cracks", "Sniffs food before eating", 
        "Speaks in third person", "Taps fingers rhythmically", 
        "Uses archaic language", "Ventriloquizes occasionally", 
        "Whispers to weapons", "X-rays people with stare", 
        "Yawns at dramatic moments", "Zones out mid-conversation"
    ],

    // APPEARANCE
    builds: ["Thin", "Slender", "Average", "Stocky", "Muscular", "Burly", "Portly", "Frail", "Tall", "Short"],
    hair: ["Bald", "Buzz cut", "Short", "Shoulder-length", "Long", "Braided", "Curly", "Wavy", "Straight", "Dreadlocks"],
    hairColors: ["Black", "Brown", "Blonde", "Red", "Grey", "White", "Silver", "Auburn", "Blue", "Green", "Purple", "Pink"],
    eyes: ["Brown", "Blue", "Green", "Hazel", "Grey", "Amber", "Violet", "Red", "Gold", "Heterochromatic"],
    features: [
        "Scar across face", "Missing tooth", "Birthmark", "Tattoo", 
        "Unusual height", "Extra finger", "Glass eye", "Wooden limb", 
        "Burn marks", "Freckles", "Warts", "Gap in teeth", 
        "Prominent nose", "Bushy eyebrows", "Cleft chin", "Dimples", 
        "Pointed ears", "Horns", "Tail visible", "Wings (small)"
    ],
    clothing: [
        "Worn but clean", "Expensive but stained", "Mismatched", 
        "All one color", "Heavily patched", "Military-style", 
        "Religious symbols", "Too many layers", "Nearly naked", 
        "Ceremonial dress", "Travel-worn", "Fashionably late", 
        "Practical pockets everywhere", "Jingling accessories", 
        "Smells of herbs", "Covered in soot", "Dripping wet", 
        "Frozen solid", "Glowing faintly", "Invisible (magic)"
    ],

    // DIALOGUE
    dialogue: {
        greetings: [
            "Welcome, traveler! What brings you to our humble town?",
            "Oh, you're new here. Mind the cobblestones, they're cursed.",
            "Another adventurer? We get so many. Most don't come back.",
            "You look like someone who asks too many questions.",
            "The inn's that way. The jail's the other way. Choose wisely.",
            "I haven't seen your face before. That's either good or very bad.",
            "Looking for work? Everyone's looking for work.",
            "The mayor's in a mood today. Best avoid the castle.",
            "You're blocking my view of the dragon. It's nap time.",
            "If you're selling, I'm not buying. If you're buying, I'm not selling."
        ],
        farewells: [
            "Safe travels. Or at least, interesting ones.",
            "Don't forget to tip your bard.",
            "May your dice roll high and your enemies roll low.",
            "Come back when you're famous. Or rich. Either works.",
            "Try not to die. It's bad for business.",
            "The road's that way. The monsters are that way too.",
            "I'll tell the town crier you stopped by.",
            "Next time, bring souvenirs. Or gold.",
            "Remember: the innkeeper knows everything.",
            "If you see my cousin, tell him he owes me money."
        ],
        gossip: [
            "Between you and me, the baker's bread is 10% sawdust.",
            "The guard captain is secretly in love with the blacksmith.",
            "I heard the king is actually three goblins in a trench coat.",
            "The well's been tasting funny lately. Just saying.",
            "There's a tunnel under the temple. Nobody uses it. Wonder why.",
            "The local wizard's tower glows on Tuesdays. Tax day, probably.",
            "I saw a dragon land last night. Or it was a very large chicken.",
            "The tavern owner waters down the ale. I have proof.",
            "Someone's been stealing left shoes. Right shoes are safe.",
            "The statue in the square winks at midnight. I've seen it."
        ],
        quest: [
            "You look capable. Have you considered dungeon delving?",
            "My aunt went missing near the old ruins. She owed me money.",
            "There's a bounty on goblin ears. Fresh ones only.",
            "The mine's been closed since the singing started.",
            "I'd go myself, but I have a bad knee. And cowardice.",
            "The reward is good. The survival rate is... moderate.",
            "It's a simple job. Fetch, return, don't ask questions.",
            "The pay is in exposure. And possibly death.",
            "I need someone discreet. You don't look discreet, but...",
            "It's cursed. Obviously. That's why I'm hiring."
        ],
        combat: [
            "I fight dirty. Very dirty.",
            "My weapon is named. Want to hear its story?",
            "I've been in worse bars than this.",
            "You're not the first to try. You won't be the last.",
            "I have a family. Please don't make me orphan them.",
            "This is why I have insurance.",
            "I was hoping we could talk about this over ale.",
            "My lawyer will be in touch.",
            "I'm too old for this. But here we are.",
            "At least I'll die doing what I love. Complaining."
        ]
    },

    // VOICES
    voices: [
        "Deep and booming", "High and squeaky", "Raspy and worn", 
        "Smooth as silk", "Gravelly", "Musical", 
        "Monotone", "Excitable", "Sleepy", 
        "Angry", "Whispery", "Nasal", 
        "Breathy", "Commanding", "Shy", 
        "Sarcastic", "Enthusiastic", "Bored", 
        "Dramatic", "Robotic", "Ethereal", 
        "Guttural", "Melodic", "Crackling", 
        "Echoey", "Muffled", "Clear as bell", 
        "Slurred", "Precise", "Unpredictable"
    ],

    // SECRETS
    secrets: [
        "Is actually a retired adventurer", "Owes money to dangerous people", 
        "Witnessed a crime and said nothing", "Has a wanted poster with their face", 
        "Is secretly royalty", "Made a deal with a fiend", 
        "Can't remember their past", "Is being blackmailed", 
        "Has a cursed item they can't remove", "Is a spy for another kingdom", 
        "Killed someone by accident", "Stole something valuable years ago", 
        "Is addicted to a magical substance", "Has an illegitimate child", 
        "Faked their own death", "Is immortal and watches friends die", 
        "Can speak with animals but hides it", "Is afraid of their own power", 
        "Made a promise they can't keep", "Knows where a treasure is buried"
    ],

    // QUEST HOOKS
    questHooks: [
        "Needs escort to the next town (dangerous road)", "Lost item in a dungeon (sentimental value)", 
        "Being followed by mysterious figures", "Received a threatening letter", 
        "Family member missing", "Business being sabotaged", 
        "Cursed and needs removal", "Witnessed something they shouldn't have", 
        "Needs protection for an important delivery", "Someone is impersonating them", 
        "Has information that could start a war", "Owes a debt to a crime lord", 
        "Found a map but can't read it", "Dreams are coming true (literally)", 
        "Item they sold is now needed back", "Someone knows their secret", 
        "Needs a bodyguard for a public event", "Child has been kidnapped", 
        "Property is being foreclosed", "Haunted by a specific ghost"
    ],

    // RELATIONSHIPS
    relationships: [
        "Has a rival in town", "Best friends with the bartender", 
        "Related to the mayor", "In debt to the merchant guild", 
        "Secretly dating a guard", "Mentor to a young adventurer", 
        "Feuding with another NPC", "Owes a favor to the thieves' guild", 
        "Member of a secret society", "Former adventuring party member", 
        "Apprentice to the local wizard", "Sibling of a famous hero", 
        "Enemy of a local noble", "Protected by a dragon", 
        "Informant for the city watch", "Member of a religious cult", 
        "Business partner with a dwarf", "Rival merchant", 
        "Former prisoner", "Godchild of a deity"
    ]
};

// ==================== UTILITY FUNCTIONS ====================

function randomArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollStat() {
    // Roll 4d6, drop lowest
    const rolls = [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)];
    rolls.sort((a, b) => a - b);
    return rolls.slice(1).reduce((a, b) => a + b, 0);
}

// ==================== NPC GENERATION ====================

let currentNPC = null;

function generateNPC() {
    const race = document.getElementById('npc-race').value;
    const professionType = document.getElementById('npc-profession').value;
    const age = document.getElementById('npc-age').value;
    const gender = document.getElementById('npc-gender').value;
    const includeStats = document.getElementById('include-stats').checked;
    const includeSecrets = document.getElementById('include-secrets').checked;
    const includeQuest = document.getElementById('include-quest').checked;

    // Generate race
    const npcRace = race === 'random' ? randomArray(['human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'tiefling', 'dragonborn']) : race;

    // Generate gender
    const npcGender = gender === 'random' ? randomArray(['male', 'female', 'nonbinary']) : gender;

    // Generate name
    const name = randomArray(npcData.names[npcRace][npcGender]);

    // Generate profession
    let profession;
    if (professionType === 'random') {
        const allProfessions = Object.values(npcData.professions).flat();
        profession = randomArray(allProfessions);
    } else {
        profession = randomArray(npcData.professions[professionType]);
    }

    // Generate age
    const ageRanges = {
        young: `${randomInt(16, 25)} years`,
        adult: `${randomInt(26, 40)} years`,
        middle: `${randomInt(41, 60)} years`,
        old: `${randomInt(61, 90)} years`,
        ancient: `${randomInt(91, 150)} years`
    };
    const npcAge = age === 'random' ? randomArray(Object.values(ageRanges)) : ageRanges[age];

    // Generate stats
    const stats = {
        str: rollStat(),
        dex: rollStat(),
        con: rollStat(),
        int: rollStat(),
        wis: rollStat(),
        cha: rollStat()
    };

    // Generate HP and AC based on profession
    const hp = professionType === 'adventurer' || professionType === 'guard' ? randomInt(30, 80) : randomInt(5, 25);
    const ac = professionType === 'adventurer' || professionType === 'guard' ? randomInt(12, 18) : randomInt(10, 13);
    const speed = npcRace === 'dwarf' ? '25ft' : npcRace === 'halfling' ? '25ft' : '30ft';

    // Generate personality
    const trait = randomArray(npcData.traits);
    const ideal = randomArray(npcData.ideals);
    const bond = randomArray(npcData.bonds);
    const flaw = randomArray(npcData.flaws);
    const quirks = [randomArray(npcData.quirks), randomArray(npcData.quirks)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);

    // Generate appearance
    const build = randomArray(npcData.builds);
    const hair = `${randomArray(npcData.hairColors)} ${randomArray(npcData.hair)}`;
    const eyes = randomArray(npcData.eyes);
    const feature = randomArray(npcData.features);
    const clothing = randomArray(npcData.clothing);

    // Generate dialogue
    const dialogueType = randomArray(['greetings', 'farewells', 'gossip', 'quest', 'combat']);
    const dialogue = randomArray(npcData.dialogue[dialogueType]);
    const voice = randomArray(npcData.voices);

    // Generate secrets and quests
    const secret = randomArray(npcData.secrets);
    const questHook = randomArray(npcData.questHooks);
    const relationship = randomArray(npcData.relationships);

    // Generate portrait icon
    const portraitIcons = {
        human: '👤', elf: '🧝', dwarf: '🧔', halfling: '🧑', 
        gnome: '🎩', orc: '👹', tiefling: '😈', dragonborn: '🐉'
    };
    const portraitIcon = portraitIcons[npcRace] || '👤';

    // Build NPC object
    currentNPC = {
        name,
        race: npcRace,
        gender: npcGender,
        age: npcAge,
        profession,
        stats,
        hp,
        ac,
        speed,
        trait,
        ideal,
        bond,
        flaw,
        quirks,
        build,
        hair,
        eyes,
        feature,
        clothing,
        dialogue,
        voice,
        secret,
        questHook,
        relationship,
        portraitIcon,
        generatedAt: new Date().toISOString()
    };

    // Display NPC
    displayNPC(includeStats, includeSecrets, includeQuest);

    // Animate
    animateCard();
}

function displayNPC(includeStats, includeSecrets, includeQuest) {
    if (!currentNPC) return;

    // Show card
    document.getElementById('npc-card').style.display = 'block';

    // Header
    document.getElementById('portrait-icon').textContent = currentNPC.portraitIcon;
    document.getElementById('npc-name').textContent = currentNPC.name;
    document.getElementById('npc-race-display').textContent = currentNPC.race.charAt(0).toUpperCase() + currentNPC.race.slice(1);
    document.getElementById('npc-age-display').textContent = currentNPC.age;
    document.getElementById('npc-gender-display').textContent = currentNPC.gender.charAt(0).toUpperCase() + currentNPC.gender.slice(1);
    document.getElementById('npc-profession-display').textContent = currentNPC.profession;

    // Stats
    document.getElementById('stats-section').style.display = includeStats ? 'block' : 'none';
    if (includeStats) {
        document.getElementById('stat-str').textContent = currentNPC.stats.str;
        document.getElementById('stat-dex').textContent = currentNPC.stats.dex;
        document.getElementById('stat-con').textContent = currentNPC.stats.con;
        document.getElementById('stat-int').textContent = currentNPC.stats.int;
        document.getElementById('stat-wis').textContent = currentNPC.stats.wis;
        document.getElementById('stat-cha').textContent = currentNPC.stats.cha;
        document.getElementById('npc-hp').textContent = currentNPC.hp;
        document.getElementById('npc-ac').textContent = currentNPC.ac;
        document.getElementById('npc-speed').textContent = currentNPC.speed;
    }

    // Personality
    document.getElementById('npc-trait').textContent = currentNPC.trait;
    document.getElementById('npc-ideal').textContent = currentNPC.ideal;
    document.getElementById('npc-bond').textContent = currentNPC.bond;
    document.getElementById('npc-flaw').textContent = currentNPC.flaw;
    document.getElementById('npc-quirks-list').innerHTML = currentNPC.quirks.map(q => `<li>${q}</li>`).join('');

    // Appearance
    document.getElementById('npc-build').textContent = currentNPC.build;
    document.getElementById('npc-hair').textContent = currentNPC.hair;
    document.getElementById('npc-eyes').textContent = currentNPC.eyes;
    document.getElementById('npc-feature').textContent = currentNPC.feature;
    document.getElementById('npc-clothing').textContent = currentNPC.clothing;

    // Dialogue
    document.getElementById('npc-dialogue').textContent = `"${currentNPC.dialogue}"`;
    document.getElementById('npc-voice').textContent = currentNPC.voice;

    // Secrets & Quests
    document.getElementById('secrets-section').style.display = includeSecrets ? 'block' : 'none';
    if (includeSecrets) {
        document.getElementById('npc-secret-text').textContent = currentNPC.secret;
        document.getElementById('npc-quest-section').style.display = includeQuest ? 'block' : 'none';
        if (includeQuest) {
            document.getElementById('npc-quest-text').textContent = currentNPC.questHook;
        }
    }

    // Relationships
    document.getElementById('npc-relationship-text').textContent = currentNPC.relationship;
}

function animateCard() {
    const card = document.getElementById('npc-card');
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';

    setTimeout(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    }, 50);
}

function regenerateNPC() {
    generateNPC();
}

// ==================== CLIPBOARD & SAVE ====================

function copyNPC() {
    if (!currentNPC) return;

    const text = `
${currentNPC.name} (${currentNPC.race}, ${currentNPC.profession})
Age: ${currentNPC.age} | Gender: ${currentNPC.gender}

STATS: STR ${currentNPC.stats.str} | DEX ${currentNPC.stats.dex} | CON ${currentNPC.stats.con} | INT ${currentNPC.stats.int} | WIS ${currentNPC.stats.wis} | CHA ${currentNPC.stats.cha}
HP: ${currentNPC.hp} | AC: ${currentNPC.ac} | Speed: ${currentNPC.speed}

PERSONALITY:
Trait: ${currentNPC.trait}
Ideal: ${currentNPC.ideal}
Bond: ${currentNPC.bond}
Flaw: ${currentNPC.flaw}
Quirks: ${currentNPC.quirks.join(', ')}

APPEARANCE: ${currentNPC.build}, ${currentNPC.hair} hair, ${currentNPC.eyes} eyes
Feature: ${currentNPC.feature}
Clothing: ${currentNPC.clothing}

VOICE: ${currentNPC.voice}
DIALOGUE: "${currentNPC.dialogue}"

SECRET: ${currentNPC.secret}
QUEST: ${currentNPC.questHook}
RELATIONSHIP: ${currentNPC.relationship}
`.trim();

    navigator.clipboard.writeText(text).then(() => {
        alert('NPC copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Check console.');
    });
}

function saveNPC() {
    if (!currentNPC) return;

    let saved = localStorage.getItem('saved_npcs');
    saved = saved ? JSON.parse(saved) : [];

    saved.unshift(currentNPC);
    if (saved.length > 20) saved.pop();

    localStorage.setItem('saved_npcs', JSON.stringify(saved));
    renderSavedNPCs();
    alert('NPC saved to favorites!');
}

function renderSavedNPCs() {
    const container = document.getElementById('saved-list');
    let saved = localStorage.getItem('saved_npcs');
    saved = saved ? JSON.parse(saved) : [];

    if (saved.length === 0) {
        container.innerHTML = '<p style="color: #888; font-style: italic;">No NPCs saved yet...</p>';
        return;
    }

    container.innerHTML = saved.map((npc, index) => `
        <div class="saved-item" onclick="loadSavedNPC(${index})">
            <h4>${npc.name}</h4>
            <p>${npc.race} ${npc.profession}</p>
            <div class="saved-meta">${new Date(npc.generatedAt).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function loadSavedNPC(index) {
    let saved = localStorage.getItem('saved_npcs');
    saved = saved ? JSON.parse(saved) : [];

    if (saved[index]) {
        currentNPC = saved[index];
        displayNPC(true, true, true);
        document.getElementById('npc-card').scrollIntoView({ behavior: 'smooth' });
    }
}

function clearSaved() {
    if (confirm('Clear all saved NPCs?')) {
        localStorage.removeItem('saved_npcs');
        renderSavedNPCs();
    }
}

// ==================== KEYBOARD SHORTCUT ====================

function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            generateNPC();
        }
    });
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    renderSavedNPCs();
    setupKeyboardShortcut();
});
