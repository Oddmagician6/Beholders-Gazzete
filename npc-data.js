/* ============================================
   NPC DATA + ROLLER (no DOM). Shared by
   npc-generator.js, session-kit.js, and the
   Tavern, Quest, and Shop rollers.
   ============================================ */

// ==================== DATA ARRAYS ====================

// Name tables draw on the SRD 5.1 example names plus our own. No Tolkien or
// Forgotten Realms character names.
const npcData = {
    // FIRST NAMES, by race and gender
    names: {
        human: {
            male: ["Aldric", "Alaric", "Anselm", "Bartholomew", "Benedict", "Bram", "Cedric", "Corwin", "Dalton", "Desmond", "Edmund", "Emeric", "Fenwick", "Florian", "Gareth", "Godfrey", "Hal", "Hector", "Ingram", "Jasper", "Jory", "Kester", "Lambert", "Leoric", "Mathis", "Merrick", "Nolan", "Osric", "Piers", "Quentin", "Roderick", "Silas", "Tobias", "Ulric", "Wendel", "Wystan", "Yorick", "Marcus", "Roland", "Victor"],
            female: ["Adela", "Agnes", "Alys", "Beatrix", "Brynn", "Cecily", "Celia", "Constance", "Delia", "Edith", "Elspeth", "Elara", "Emmeline", "Fiona", "Gwendolyn", "Hilde", "Imogen", "Isolde", "Joan", "Juliana", "Katrin", "Lisbet", "Mabel", "Matilda", "Maude", "Nell", "Odette", "Petra", "Rosalind", "Sabine", "Sybil", "Tamsin", "Ursula", "Wynne", "Yvaine", "Mira", "Talia", "Rosa"],
            nonbinary: ["Ash", "Bryce", "Carey", "Dale", "Ellis", "Emery", "Finch", "Gray", "Hollis", "Jules", "Kit", "Lane", "Linden", "Marlow", "Morgan", "Noel", "Perry", "Quinn", "Reed", "Robin", "Rowan", "Sage", "Shay", "Sky", "Tam", "Wren", "River", "Harper"]
        },
        elf: {
            male: ["Adran", "Aelar", "Aramil", "Arannis", "Aust", "Beiro", "Berrian", "Carric", "Enialis", "Erdan", "Erevan", "Galinndan", "Hadarai", "Heian", "Himo", "Immeral", "Ivellios", "Laucian", "Mindartis", "Paelias", "Peren", "Quarion", "Riardon", "Rolen", "Soveliss", "Thamior", "Tharivol", "Theren", "Varis", "Caelum", "Daeron", "Elandor", "Faelar", "Kaelen", "Saelon", "Thalor", "Vaelen"],
            female: ["Adrie", "Althaea", "Anastrianna", "Andraste", "Antinua", "Bethrynna", "Birel", "Caelynn", "Drusilia", "Enna", "Felosial", "Ielenia", "Jelenneth", "Keyleth", "Leshanna", "Lia", "Meriele", "Mialee", "Naivara", "Quelenna", "Quillathe", "Sariel", "Shanairra", "Shava", "Silaqui", "Theirastra", "Thia", "Vadania", "Valanthe", "Xanaphia", "Elowen", "Lirien", "Sylvara", "Maelis"],
            nonbinary: ["Aerin", "Ailen", "Arlis", "Caelis", "Elian", "Faeril", "Ilyth", "Nym", "Riel", "Sael", "Sylvar", "Thiel", "Vael", "Yllan", "Ithe", "Lethis", "Mirel", "Sorel", "Tavi", "Aeris", "Eloen", "Nhyris", "Lark", "Wren"]
        },
        dwarf: {
            male: ["Adrik", "Alberich", "Baern", "Barendd", "Brottor", "Dain", "Darrak", "Delg", "Eberk", "Einkil", "Fargrim", "Gardain", "Harbek", "Kildrak", "Morgran", "Orsik", "Oskar", "Rangrim", "Rurik", "Taklinn", "Thoradin", "Tordek", "Traubon", "Travok", "Ulfgar", "Veit", "Vondal", "Brom", "Dolgrim", "Gorrim", "Harnak", "Kazrik", "Magni", "Nordak", "Bardin", "Korgan"],
            female: ["Amber", "Artin", "Audhild", "Bardryn", "Dagnal", "Diesa", "Eldeth", "Falkrunn", "Finellen", "Gunnloda", "Gurdis", "Helja", "Hlin", "Kathra", "Kristryd", "Ilde", "Liftrasa", "Mardred", "Riswynn", "Sannl", "Torbera", "Torgga", "Vistra", "Berna", "Dagna", "Edda", "Helga", "Kelda", "Runa", "Thora", "Valka", "Brynja"],
            nonbinary: ["Bael", "Brann", "Dorn", "Durk", "Esk", "Gund", "Hald", "Holt", "Jorn", "Kell", "Kor", "Marn", "Odd", "Rask", "Skaar", "Tarn", "Torv", "Ulm", "Vorn", "Brikka", "Flint", "Mica"]
        },
        halfling: {
            male: ["Alton", "Ander", "Cade", "Corrin", "Eldon", "Errich", "Finnan", "Garret", "Lindal", "Lyle", "Merric", "Milo", "Osborn", "Perrin", "Reed", "Roscoe", "Wellby", "Bilwin", "Dob", "Hobb", "Jem", "Ned", "Pod", "Tobin", "Wat", "Wilcome", "Rollo", "Hugo", "Andry"],
            female: ["Bree", "Callie", "Cora", "Euphemia", "Jillian", "Kithri", "Lavinia", "Lidda", "Merla", "Nedda", "Paela", "Portia", "Seraphina", "Shaena", "Trym", "Vani", "Verna", "Bluebell", "Clover", "Daisy", "Hazel", "Marigold", "Poppy", "Rosie", "Tansy", "Mila"],
            nonbinary: ["Bramble", "Button", "Dill", "Fennel", "Hob", "Juniper", "Kip", "Moss", "Nutmeg", "Pip", "Quince", "Rue", "Sorrel", "Thistle", "Wren", "Yarrow", "Bean", "Cobble", "Maple", "Sage"]
        },
        gnome: {
            male: ["Alston", "Alvyn", "Boddynock", "Brocc", "Burgell", "Dimble", "Eldon", "Erky", "Fonkin", "Frug", "Gerbo", "Gimble", "Glim", "Jebeddo", "Kellen", "Namfoodle", "Orryn", "Roondar", "Seebo", "Sindri", "Warryn", "Wrenn", "Zook", "Bimble", "Limwick", "Tock", "Wistle"],
            female: ["Bimpnottin", "Breena", "Caramip", "Carlin", "Donella", "Duvamil", "Ella", "Ellyjobell", "Ellywick", "Lilli", "Loopmottin", "Lorilla", "Mardnab", "Nissa", "Nyx", "Oda", "Orla", "Roywyn", "Shamil", "Tana", "Waywocket", "Zanna", "Folli", "Merry"],
            nonbinary: ["Bink", "Cog", "Dabble", "Fizzwick", "Gizzle", "Jinks", "Nim", "Pip", "Quibble", "Rivet", "Sprocket", "Tinker", "Widget", "Wobble", "Zib", "Fennick", "Bixby", "Spark"]
        },
        orc: {
            male: ["Dench", "Feng", "Gell", "Henk", "Holg", "Imsh", "Keth", "Krusk", "Mhurren", "Ront", "Shump", "Thokk", "Brugash", "Durgat", "Grosh", "Karg", "Mog", "Rokk", "Thrag", "Urzul", "Varg", "Yagul", "Zogar", "Hruk", "Narzug", "Gharol", "Krag", "Morg"],
            female: ["Baggi", "Emen", "Engong", "Kansif", "Myev", "Neega", "Ovak", "Ownka", "Shautha", "Sutha", "Vola", "Volen", "Yevelda", "Bagra", "Dura", "Gharza", "Ishna", "Krala", "Murzga", "Rasha", "Shagra", "Ugra", "Yazga", "Zuna", "Volka"],
            nonbinary: ["Ashka", "Brog", "Druz", "Ghor", "Kesh", "Mag", "Nurz", "Rukk", "Sharn", "Tuk", "Ush", "Vesh", "Zug", "Grit", "Hask", "Korv", "Thorn"]
        },
        tiefling: {
            male: ["Akmenos", "Amnon", "Barakas", "Damakos", "Ekemon", "Iados", "Kairon", "Leucis", "Melech", "Mordai", "Morthos", "Pelaios", "Skamos", "Therai", "Balam", "Caim", "Dantalis", "Malphas", "Valac", "Zagan", "Xaphan", "Orobas", "Mephis", "Lucius"],
            female: ["Akta", "Anakis", "Bryseis", "Criella", "Damaia", "Ea", "Kallista", "Lerissa", "Makaria", "Nemeia", "Orianna", "Phelaia", "Rieta", "Aziria", "Hesper", "Lethe", "Naamah", "Seraphine", "Vesper", "Lilith", "Nyx", "Ravenna"],
            nonbinary: ["Ashe", "Cinder", "Ixis", "Kaelix", "Moriel", "Nox", "Orrin", "Sable", "Thessaly", "Vex", "Zeph", "Onyx"]
        },
        dragonborn: {
            male: ["Arjhan", "Balasar", "Bharash", "Donaar", "Ghesh", "Heskan", "Kriv", "Medrash", "Mehen", "Nadarr", "Pandjed", "Patrin", "Rhogar", "Shamash", "Shedinn", "Tarhun", "Torinn", "Vhazir", "Draxan", "Gorrath", "Khelvar"],
            female: ["Akra", "Biri", "Daar", "Farideh", "Harann", "Havilar", "Jheri", "Kava", "Korinn", "Mishann", "Nala", "Perra", "Raiann", "Sora", "Surina", "Thava", "Uadjit", "Xyphara", "Zehira", "Vyrla"],
            nonbinary: ["Azzar", "Belkas", "Dhurin", "Esvarr", "Ghorra", "Ixen", "Kaszin", "Mhurra", "Nexis", "Qarrash", "Rhazin", "Sorrek", "Thurak", "Vayrin", "Zorrath", "Krysh"]
        }
    },

    // SURNAMES. Each race builds its full name its own way (see buildName).
    surnames: {
        human: ["Ashdown", "Blackwood", "Brightwater", "Carter", "Cobb", "Cooper", "Crane", "Dunmore", "Fairweather", "Fletcher", "Glover", "Greaves", "Hale", "Harrow", "Holloway", "Kettering", "Larkin", "Marsh", "Mercer", "Millward", "Northcott", "Oakes", "Penrose", "Quickley", "Redfern", "Rook", "Sallow", "Thatcher", "Thistlewood", "Vane", "Wainwright", "Whitlock", "Winterbourne", "Wolfe", "Yardley", "Ashford", "Barrow", "Coldwell", "Hartley", "Pike"],
        elf: ["Amakiir", "Amastacia", "Galanodel", "Holimion", "Ilphelkiir", "Liadon", "Meliamne", "Naïlo", "Siannodel", "Xiloscient", "Moonwhisper", "Starflower", "Silverfrond", "Nightbreeze", "Goldpetal", "Dawnthistle", "Fernsong", "Leafwhisper", "Mistbrook", "Oakenheel", "Rainpetal", "Starbower", "Duskmantle", "Willowmere"],
        dwarf: ["Balderk", "Brawnanvil", "Dankil", "Fireforge", "Frostbeard", "Gorunn", "Holderhek", "Ironfist", "Loderr", "Lutgehr", "Rumnaheim", "Strakeln", "Torunn", "Ungart", "Anvilborn", "Coalbrow", "Deepdelver", "Goldvein", "Hammerfall", "Ironmantle", "Stonehelm", "Copperkettle", "Granitejaw", "Ashbeard", "Ambersmelt", "Cragmorrow"],
        halfling: ["Brushgather", "Goodbarrel", "Greenbottle", "High-hill", "Hilltopple", "Leagallow", "Tealeaf", "Thorngage", "Tosscobble", "Underbough", "Applebrook", "Butterbuck", "Cobblecrust", "Honeypot", "Kettlewhistle", "Puddlefoot", "Sugarbean", "Warmhearth", "Mossbottom", "Quickstep"],
        gnome: ["Beren", "Daergel", "Folkor", "Garrick", "Nackle", "Murnig", "Ningel", "Raulnor", "Scheppen", "Timbers", "Turen", "Fizzlebang", "Cogsworth", "Gearloose", "Tinkertop", "Sprocketson", "Wobbleknob", "Brassbutton"],
        // Gnome nicknames go in quotes between the names.
        gnomeNicknames: ["Aleslosh", "Ashhearth", "Badger", "Cloak", "Doublelock", "Filchbatter", "Fnipper", "Ku", "Nim", "Oneshoe", "Pock", "Sparklegem", "Stumbleduck", "Boom", "Fiddlesticks", "Twiceburnt", "Gadget", "Spoons"],
        // Orcs carry an earned name: one word, or "the …".
        orc: ["Ironjaw", "Skullsplitter", "Bonecrusher", "Tuskbreaker", "Bloodfist", "Gutripper", "Stonehide", "Ashmaw", "Grimtooth", "Redhand", "Wolfrider", "Blackscar", "Threefingers", "Longstride", "Mudfoot", "the Unbroken", "the Patient", "the Twice-Exiled", "the Loud", "the Gentle", "the Oathkeeper", "the Last", "the Bargainer", "the Unbowed"],
        // Tieflings who take a human surname use the human list. Some take a virtue
        // name instead of a first name, and then use no surname.
        tieflingVirtues: ["Art", "Carrion", "Chant", "Creed", "Despair", "Excellence", "Fear", "Glory", "Hope", "Ideal", "Music", "Nowhere", "Open", "Poetry", "Quest", "Random", "Reverence", "Sorrow", "Temerity", "Torment", "Weary", "Mercy", "Ruin", "Patience", "Ember"],
        // Dragonborn clan names; the clan comes first in their naming.
        dragonborn: ["Clethtinthiallor", "Daardendrian", "Delmirev", "Drachedandion", "Fenkenkabradon", "Kepeshkmolik", "Kerrhylon", "Kimbatuul", "Linxakasendalor", "Myastan", "Nemmonis", "Norixius", "Ophinshtalajiir", "Prexijandilin", "Shestendeliath", "Turnuroth", "Verthisathurgiesh", "Yarjerit"],
        dragonbornChildhood: ["Climber", "Earbender", "Leaper", "Pious", "Shieldbiter", "Zealous", "Tailchaser", "Sparkspitter", "Egg-Breaker", "Loud"]
    },

    // Nicknames anyone can earn (shown in quotes)
    nicknames: ["Two-Pints", "Lucky", "Half-Ear", "Butterfingers", "Mad", "Copper", "Smiles", "Knuckles", "Patches", "Gravy", "Sixpence", "Quiet", "Red", "Whistler", "Mumbles", "Crowbar", "Sweet", "Dimples", "Splinter", "Tallow", "Lefty", "Biscuit", "Ledger", "No-Nose", "Pickles", "Thimble", "Moth", "Sunny", "Old Boots", "Hatchet"],

    // PROFESSIONS. A [male, female, other] entry is a title that changes with gender.
    professions: {
        commoner: ["Baker", "Barber", "Beekeeper", "Blacksmith", "Brewer", "Candlemaker", "Carpenter", "Chimney Sweep", "Cobbler", "Cook", "Cooper", "Dockhand", "Farmer", ["Ferryman", "Ferrywoman", "Ferry Pilot"], "Fisher", "Gravedigger", "Herder", "Hunter", "Lamplighter", "Laborer", "Mason", "Midwife", "Miller", "Miner", "Potter", "Ratcatcher", "Rope Maker", "Sailor", "Servant", "Shepherd", "Stablehand", "Tanner", "Thatcher", "Washer", "Weaver", "Woodcutter"],
        merchant: ["Apothecary", "Antiques Dealer", "Bookseller", "Butcher", "Caravan Master", "Cartographer", "Clothier", "Curio Peddler", "Fishmonger", "Gem Merchant", "General Store Owner", "Grocer", "Herbalist", "Innkeeper", "Jeweler", "Livestock Trader", "Moneylender", "Pawnbroker", "Perfumer", "Potion Seller", "Scroll Merchant", "Spice Trader", "Tailor", "Tavern Keeper", "Tea Merchant", "Toymaker", "Weaponsmith", "Wine Merchant"],
        guard: ["Bailiff", "Bounty Hunter", "City Guard", "Customs Officer", "Gate Keeper", "Guard Captain", "Harbormaster", "Herald", "Jailer", "Judge", "Lawyer", "Magistrate", "Marshal", "Militia Sergeant", "Night Watch", "Notary", "Prison Guard", "Road Warden", "Royal Guard", "Keeper of Records", "Sheriff", "Soldier", "Tax Collector", "Town Crier", "Watch Sergeant", "Warden", "Census Taker", "Royal Courier"],
        magic: ["Abjurer", "Alchemist", "Arcane Scholar", "Artificer", "Astrologer", "Diviner", "Enchanter", "Familiar Breeder", "Fortune Teller", "Hedge Wizard", "Illusionist", "Magical Tutor", "Necromancer", "Oracle", "Potion Brewer", "Rune Carver", "Sage", "Scrivener", "Sorcerer", "Spellbook Seller", "Stage Magician", "Summoner", "Transmuter", "Wand Maker", "Warlock", "Weather Witch", "Witch", "Golem Keeper"],
        criminal: ["Assassin", "Bandit", "Blackmailer", "Bootlegger", "Burglar", "Cat Burglar", "Cardsharp", "Con Artist", "Counterfeiter", "Cutpurse", "Fence", "Forger", "Gang Leader", "Grave Robber", ["Highwayman", "Highwaywoman", "Highway Robber"], "Informant", "Loan Shark", "Pickpocket", "Pirate", "Poacher", "Poisoner", "Racketeer", "Saboteur", "Smuggler", "Spy", "Thief", "Thug", "Bookmaker"],
        noble: [["Baron", "Baroness", "Landed Peer"], ["Count", "Countess", "Peer of the Realm"], ["Duke", "Duchess", "Ducal Heir"], ["Earl", "Countess", "Peer"], ["Lord", "Lady", "Liege"], ["Marquess", "Marchioness", "Peer of the March"], ["Prince", "Princess", "Royal Heir"], ["Viscount", "Viscountess", "Courtier"], "Heir", "Knight", "Mayor", "Magnate", "Courtier", "Envoy", "Castellan", "Chancellor", "Seneschal", "Steward", "Exiled Noble", "Minor Noble", "Patron of the Arts", "Disinherited Heir", "Ambassador", "Royal Cousin"],
        religious: ["Acolyte", "Almoner", "Cantor", "Chaplain", "Cleric", "Deacon", "Doomsayer", "Druid", "Exorcist", "Faith Healer", "Friar", "Hermit", ["High Priest", "High Priestess", "High Cleric"], "Inquisitor", "Missionary", ["Monk", "Nun", "Monastic"], ["Abbot", "Abbess", "Abbey Head"], "Paladin", "Pilgrim", ["Priest", "Priestess", "Officiant"], "Prophet", "Relic Keeper", "Shaman", "Shrine Keeper", "Templar", "Temple Guardian"],
        adventurer: ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard", "Artificer", "Sellsword", "Monster Hunter", "Treasure Hunter", "Dungeon Guide", "Retired Adventurer", "Wandering Duelist", "Explorer", "Relic Hunter", "Beast Tamer", "Scout", "Caravan Guard"]
    },

    // Key abilities by job. A profession name wins over its category.
    primaryAbilities: {
        commoner: ['str', 'con'], merchant: ['cha', 'int'], guard: ['str', 'con'], magic: ['int', 'wis'],
        criminal: ['dex', 'cha'], noble: ['cha', 'int'], religious: ['wis', 'cha'], adventurer: ['str', 'con'],
        Barbarian: ['str', 'con'], Bard: ['cha', 'dex'], Cleric: ['wis', 'con'], Druid: ['wis', 'con'], Fighter: ['str', 'con'],
        Monk: ['dex', 'wis'], Paladin: ['str', 'cha'], Ranger: ['dex', 'wis'], Rogue: ['dex', 'int'], Sorcerer: ['cha', 'con'],
        Warlock: ['cha', 'con'], Wizard: ['int', 'con'], Artificer: ['int', 'con'], 'Monster Hunter': ['dex', 'wis'],
        'Treasure Hunter': ['dex', 'int'], 'Dungeon Guide': ['wis', 'dex'], 'Wandering Duelist': ['dex', 'cha'],
        Explorer: ['con', 'wis'], 'Relic Hunter': ['int', 'dex'], 'Beast Tamer': ['wis', 'dex'], Scout: ['dex', 'wis'],
        Witch: ['wis', 'int'], 'Weather Witch': ['wis', 'int'], Oracle: ['wis', 'cha'], Diviner: ['wis', 'int'], Astrologer: ['wis', 'int'],
        'Fortune Teller': ['cha', 'wis'], 'Stage Magician': ['cha', 'dex'], Templar: ['str', 'wis'], 'Temple Guardian': ['str', 'wis'],
        Inquisitor: ['wis', 'int'], Assassin: ['dex', 'int'], Thug: ['str', 'con'], Bandit: ['str', 'dex'], Knight: ['str', 'cha'],
        Judge: ['wis', 'int'], Lawyer: ['int', 'cha'], Magistrate: ['wis', 'int'], Herald: ['cha', 'con'], 'Town Crier': ['cha', 'con'],
        Notary: ['int', 'wis'], 'Keeper of Records': ['int', 'wis'], 'Census Taker': ['int', 'wis'], 'Tax Collector': ['int', 'cha'],
        Midwife: ['wis', 'dex'], Hunter: ['dex', 'wis'], Fisher: ['dex', 'con'], Barber: ['dex', 'cha'], Cartographer: ['int', 'wis']
    },

    // Alignment weights by category, in the order of NPC_ALIGNMENTS.
    alignmentWeights: {
        //          LG  NG  CG  LN  N   CN  LE  NE  CE
        commoner:  [3,  5,  3,  3,  6,  2,  1,  1,  1],
        merchant:  [3,  3,  1,  5,  5,  2,  3,  2,  1],
        guard:     [6,  3,  1,  6,  2,  1,  3,  1,  0],
        magic:     [2,  3,  3,  3,  5,  4,  2,  2,  1],
        criminal:  [0,  1,  3,  1,  3,  5,  2,  4,  3],
        noble:     [4,  2,  1,  5,  2,  2,  4,  2,  1],
        religious: [6,  5,  2,  4,  2,  1,  2,  1,  1],
        adventurer:[3,  3,  5,  2,  3,  4,  1,  1,  1]
    },

    // PERSONALITY TRAITS
    traits: [
        "Always carries a lucky charm", "Believes everything they read", "Cannot tell a lie", "Constantly humming",
        "Counts everything", "Deeply suspicious of magic", "Eats like they're starving", "Fears the dark",
        "Gambles on anything", "Hoards shiny objects", "Imitates others' speech", "Incredibly optimistic",
        "Jokes at the worst moments", "Keeps a detailed journal", "Adores children", "Miserly with coin",
        "Never backs down", "Obsessed with cleanliness", "Trusts strangers too easily", "Paranoid about poison",
        "Quotes ancient texts", "Rarely smiles", "Superstitious about everything", "Talks to animals",
        "Can't keep a secret", "Values honor above all", "Wears mismatched clothes on purpose", "Distrusts outsiders",
        "Apologizes constantly", "Brags about deeds nobody witnessed", "Collects other people's stories", "Compliments everyone",
        "Corrects everyone's grammar", "Dramatic about small things", "Easily moved to tears", "Fiercely competitive",
        "Flirts with everyone, including furniture", "Gives terrible advice with total confidence", "Hates being touched", "Haggles over everything",
        "Insists on paying for everything", "Laughs too loudly", "Loves a good argument", "Never sits still",
        "Never finishes a sentence", "Nosy about other people's business", "Offers food to everyone", "Overly formal",
        "Pretends to be busier than they are", "Quick to forgive", "Remembers every name and face", "Romantic to a fault",
        "Sarcastic about everything", "Shy until talk turns to their hobby", "Sings when nervous", "Sleeps very little",
        "Speaks only in questions when anxious", "Takes every bet", "Tells long stories with no point", "Thinks they are a great cook",
        "Treats everyone like an old friend", "Uses big words wrongly", "Very blunt", "Volunteers for everything",
        "Whistles tunelessly", "Writes poetry nobody asked for", "Always running late", "Always early and annoyed about it",
        "Bluffs about knowing important people", "Fussy about tea", "Lives for gossip", "Unshakably calm",
        "Loves a terrible pun", "Delighted by bad weather", "Takes everything literally", "Always has a plan B, and a plan C",
        "Mothers everyone", "Hates waste of any kind", "Treats every meal as a celebration", "Fascinated by bugs",
        "Never forgets a debt, owed or owing", "Prefers animals to people", "Hopelessly nostalgic", "Trusts only written contracts",
        "Lies about small things for fun", "Lost in daydreams", "Fiercely protective of friends", "Gentle with the weak, hard on the strong",
        "Can't stand silence", "Patient as a stone", "Always hunting for a business opportunity", "Can't resist a dare",
        "Polite to the point of absurdity", "Badly wants to be a hero", "Curious about every stranger", "Cheerfully pessimistic",
        "Loyal to a fault", "Gives away everything they own", "Proud of their humble roots", "Talks with their mouth full",
        "Gets along with everyone except family", "Keeps every promise, however silly", "Does everything the old way", "Draws their own maps",
        "Never leaves a mess behind", "Collects words from other languages", "Laughs at danger, panics later", "Reads the ending of every book first",
        "Treats rules as suggestions", "Restless after a few days in one place"
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
        "Tradition: The old ways are best", "Wealth: Gold solves everything",
        "Family: Blood comes first", "Fairness: Everyone gets the same deal",
        "Independence: I answer to no one", "Loyalty: I never abandon a friend",
        "Comfort: A warm bed and a full belly", "Curiosity: Every locked door hides a story",
        "Craft: Do the work, and do it right", "Fun: Life's too short to be dull",
        "Respect: Respect is earned, and I've earned it", "Survival: Whatever it takes to see tomorrow",
        "Ambition: I will rise above my station", "Mercy: Even monsters deserve a chance",
        "Reputation: What people say about me matters", "Change: Nothing should stay the same forever",
        "Duty: I do what's asked of me", "Self-improvement: I'll be better tomorrow",
        "Hospitality: No guest leaves my door hungry", "Patience: Good things take time",
        "Truth: A comfortable lie is still a lie", "Legacy: I'm building something that outlasts me",
        "Adventure: Somewhere out there is a better story", "Kindness: Small mercies add up",
        "Pragmatism: Whatever works, works", "Thrift: Waste nothing, want nothing",
        "Excellence: Second best is first loser", "Peace: Every fight I avoid is a win",
        "Solitude: Most problems are other people", "Country: The realm comes before me",
        "Humility: Nobody is above scrubbing floors", "Courage: Fear is no reason to stop",
        "Vengeance: Wrongs get paid back in kind", "Opportunity: Every crisis is a market",
        "Hope: Tomorrow can be better than today", "Secrecy: What people don't know can't hurt me",
        "Beauty: The world needs more lovely things", "Industry: Idle hands are wasted hands",
        "Discipline: Routine is a kind of freedom", "Progress: The new ways will save us",
        "Generosity: What's mine is yours", "Ancestry: My forebears are watching",
        "Equality: No one is born better than anyone else", "Pleasure: Eat, drink, and worry tomorrow",
        "Cunning: Brains beat brawn every time", "Stability: Don't rock the boat",
        "Gratitude: I remember every kindness done to me", "Guild: The guild looks after its own",
        "Wonder: Magic is the best thing in the world", "Neighborliness: Help next door before you help the world",
        "Control: If I don't run it, it'll go wrong", "Atonement: I have a great deal to make up for",
        "Simplicity: Fewer things, fewer troubles", "Celebration: Any excuse for a party"
    ],

    // {tokens} fill from npcData.fill (see fillTemplate)
    bonds: [
        "I owe my life to {townsfolk}", "My family is everything", "I seek revenge on {townsfolk}",
        "I protect {place}", "My town needs me", "I have a debt to pay to {townsfolk}",
        "I guard a dangerous secret", "My god depends on me", "I seek a lost {thing}",
        "I must prove myself to my {kin}", "My mentor believes in me", "I fight for the oppressed",
        "I have a child to raise", "My business is my legacy", "I seek my true parentage",
        "I must break a curse on my {kin}", "My kingdom comes first", "I protect the innocent",
        "I seek immortality", "I must right an old wrong", "My {kin} is in prison, and I'll get them out",
        "I'm saving every coin to buy back {place}", "I promised my dying {kin} I'd find {thing}",
        "I would do anything for {townsfolk}", "I keep the grave of an old friend tidy",
        "My dog is my best friend and I trust its judgment", "I am the last of my order",
        "I carry my {kin}'s ashes and haven't found the right place for them", "A song my {kin} wrote keeps me going",
        "I am sworn to {townsfolk} and keep the oath even now", "I must win back my good name",
        "My old crew is scattered and I mean to find them", "I want to see the sea before I die",
        "{place} is where I was happiest, and I'll go back", "I need to finish my masterwork",
        "I took the blame for my {kin}'s crime", "I'm loyal to whoever pays, until someone pays more",
        "I owe the temple for raising me", "My {thing} is the only thing I have left of home",
        "I'm in love with {townsfolk} and too scared to say it",
        "I'm raising my {kin}'s children as my own", "I learned my trade from {townsfolk} and I'll never forget it",
        "I buried something under {place} and it needs to stay buried", "My {thing} was a gift from {townsfolk}, and I'd die before selling it",
        "I'm the only one who remembers what really happened at {place}", "I write to my {kin} every week, though they never write back",
        "I owe the city watch for not hanging me", "I swore I'd never leave this town, and I haven't",
        "I keep my late {kin}'s shop open exactly as they left it", "I'm searching for the bard who wrote a song about my {kin}",
        "My old adventuring party left me behind, and I want to know why", "I keep a family recipe that's three hundred years old",
        "I mean to marry {townsfolk}, whatever my {kin} says", "I lost {place} at cards, and I'll win it back",
        "The local children are my responsibility, whether they like it or not", "I owe a hag a favor and dread the day she calls it in",
        "My horse has carried me through everything, and I'd carry it if I had to", "I'm keeping a dying craft alive",
        "I swore to guard {place} until someone relieves me, and no one has", "My {kin} vanished into the forest, and I still leave a lantern lit",
        "Every spare coin I have goes to my {kin} in the city", "Someone in this town betrayed my {kin}, and I'll learn who",
        "I built my house with my own hands and nobody's taking it", "I hold a letter from {townsfolk} I was told to burn, and haven't",
        "I was the only survivor of a shipwreck, and I think that means something", "My order sent me here and I'm still waiting for new orders",
        "I'll restore the old shrine at {place} if it takes my whole life", "A stranger once paid my debts and vanished, and I want to thank them",
        "I'm teaching my {kin} everything I know before it's too late", "I keep the town's history, because nobody else will",
        "I'll keep my promise to {townsfolk}, even if it ruins me", "I want my {kin} to be proud of me, just once",
        "I belong to the sea, and I'm only ashore for now", "The gods spared me once, and I mean to deserve it",
        "I'm hunting the beast that took my {kin}", "I have to get my {thing} back from the pawnbroker before the ticket runs out",
        "Everyone at the tavern is family to me", "I promised my village I'd come home rich",
        "I have a rival, and I can't stand the thought of them winning", "I owe {townsfolk} an apology I've put off for ten years"
    ],

    flaws: [
        "Gambling problem", "Afraid of commitment", "Arrogant", "Cowardly", "Cruel when angry",
        "Easily distracted", "Envious of others", "Foolishly brave", "Greedy", "Holds grudges",
        "Impulsive", "Insecure", "Lazy", "Loud and obnoxious", "Manipulative", "Naive", "Obsessive",
        "Overconfident", "Prejudiced", "Procrastinates", "Reckless", "Rude", "Selfish", "Short-tempered",
        "Stubborn", "Untrustworthy", "Vain", "Weak-willed", "Zealous",
        "Can't resist a pretty trinket", "Drinks too much", "Lies when the truth would do", "Never admits a mistake",
        "Panics in a crisis", "Takes credit for others' work", "Trusts the wrong people", "Talks too much when nervous",
        "Spends money as fast as they earn it", "Breaks promises", "Can't say no", "Needs to be liked",
        "Sulks for days", "Assumes the worst of everyone", "Obeys authority without question", "Picks fights with bigger people",
        "Hides from responsibility", "Fixated on an old rival", "Loses temper over small slights", "Steals small things without thinking",
        "Believes any flattery",
        "Faints at the sight of blood", "Exaggerates everything", "Refuses help, even when drowning", "Talks down to anyone younger",
        "Hoards food and supplies", "Can't stand being wrong in public", "Gives up at the first setback", "Mean when drunk",
        "Snoops through other people's things", "Flees from any confrontation", "Holds everyone to impossible standards", "Forgets promises the moment they're made",
        "Thinks rules are for other people", "Makes enemies for fun", "Sees conspiracies everywhere", "Cheats at games, even friendly ones",
        "Too proud to apologize", "Worries constantly", "Easily bribed", "Won't share credit or blame",
        "Bored by anything without danger", "Covets a friend's spouse", "Will do anything to avoid being alone", "Gullible about anything magical",
        "Mocks what they don't understand", "Keeps secrets even when it hurts people", "Plays favorites", "Overpromises and underdelivers",
        "Treats servants like furniture", "Desperate for a parent's approval", "Talks behind people's backs", "Plans forever, never acts",
        "Terrified of magic", "Throws money at every problem", "Won't leave their comfort zone", "Quick to blame others",
        "Laughs at the worst moments", "Ignores every warning", "Flatters the powerful, kicks the weak", "Clings to the past",
        "Assumes they're the smartest one in the room"
    ],

    // QUIRKS
    quirks: [
        "Always touches doorframes before entering", "Blinks one eye at a time", "Calls everyone by the wrong name",
        "Collects teeth", "Constantly polishing something", "Counts steps while walking", "Eats with gloves on",
        "Falls asleep standing up", "Gestures wildly when talking", "Has a nervous tic", "Insists on sitting with back to the wall",
        "Talks to an invisible friend", "Laughs at own jokes", "Slips into other people's accents", "Never makes eye contact",
        "Offers unsolicited advice", "Peeks into every container", "Gets proverbs wrong", "Refuses to step on cracks",
        "Sniffs food before eating", "Speaks in the third person", "Taps fingers rhythmically", "Uses archaic words",
        "Throws their voice for fun", "Whispers to their weapon", "Stares without blinking", "Yawns at dramatic moments",
        "Zones out mid-conversation", "Cracks knuckles before every sentence", "Names every animal they meet",
        "Keeps a pet beetle in a matchbox", "Chews on a reed", "Bows too deeply", "Ends sentences with \"eh?\"",
        "Rhymes by accident and is proud of it", "Keeps score of every conversation", "Hums the same three notes",
        "Salts everything before tasting", "Carries their own cup everywhere", "Tugs an earlobe when lying",
        "Always knows the time to the minute", "Sketches people while they talk", "Sleeps with a knife under the pillow",
        "Refuses to say the word \"goodbye\"", "Wipes every coin before taking it", "Narrates their own actions",
        "Has a laugh like a startled goose", "Tells you the price of everything you wear", "Mispronounces \"wizard\"",
        "Walks backwards through doors", "Speaks to cats as equals", "Writes everything on their arm", "Pockets sugar cubes",
        "Snaps fingers to remember things", "Answers questions with older questions", "Always has a snack",
        "Recites the local laws when nervous", "Wears a hat indoors and outdoors", "Quotes their grandmother constantly",
        "Spits before shaking hands", "Can't pass a mirror without checking it", "Keeps every receipt",
        "Hums tavern songs at funerals", "Licks a finger to test the wind", "Tallies favors on their sleeve", "Won't eat anything green",
        "Bites every coin, even copper", "Sits on tables, never chairs", "Introduces themselves twice", "Wears a different hat every day",
        "Only drinks warm milk", "Always smells faintly of onions", "Knocks three times on everything", "Tells fortunes nobody asked for",
        "Sleeps with their boots on", "Sneezes when lying", "Announces which song is stuck in their head", "Gives everyone a nickname",
        "Sniffs people on meeting them", "Always sits facing the window", "Feeds stray dogs from their pockets", "Adds \"allegedly\" to everything",
        "Shakes hands with both hands", "Carries a spoon in their breast pocket", "Draws a little circle on every map they touch", "Ties their hair back with string",
        "Says \"bless you\" to every cough, sneeze, and sigh", "Smells every letter before opening it", "Wears one glove", "Taps their nose when they mean something",
        "Rubs a worry stone", "Picks their teeth with a dagger", "Pats their pockets every few minutes", "Doodles eyes on everything",
        "Makes a holy sign at every crow", "Counts their change three times", "Never uses anyone's name", "Talks to plants and says they answer",
        "Always takes the seat nearest the fire", "Stops mid-sentence to listen to distant sounds"
    ],

    // APPEARANCE
    heights: ["Tall", "Short", "Lanky", "Compact", "Towering", "Small", "Average-height", "Long-limbed"],
    frames: ["wiry", "slender", "stocky", "muscular", "burly", "portly", "frail", "broad-shouldered", "pot-bellied", "rangy", "soft", "athletic"],
    hair: ["Buzz-cut", "Short", "Shoulder-length", "Long", "Braided", "Curly", "Wavy", "Straight", "Dreadlocked", "Topknotted", "Shaggy", "Slicked-back", "Cropped", "Ponytailed", "Bowl-cut", "Thinning", "Wild", "Tightly coiled", "Mohawked", "Half-shaved", "Neatly parted", "Bun-wrapped", "Bald", "Shaved"],
    hairColors: ["Black", "Brown", "Blonde", "Red", "Grey", "White", "Auburn", "Chestnut", "Sandy", "Copper", "Salt-and-pepper", "Honey", "Jet-black", "Mousy", "Strawberry-blonde", "Dyed blue", "Dyed green", "Dyed purple"],
    // Race colors replace the shared list some of the time
    raceHairColors: {
        elf: ["Silver", "Moon-white", "Golden", "Copper", "Raven-black", "Pale green", "Deep blue"],
        tiefling: ["Raven-black", "Deep purple", "Blood-red", "Midnight blue", "Ash-grey", "Silver"],
        orc: ["Black", "Iron-grey", "Dark brown", "Rust-red"],
        gnome: ["Bright orange", "Snow-white", "Sky-blue", "Bottle-green", "Pink", "Chestnut"],
        dwarf: ["Coal-black", "Rust-red", "Iron-grey", "Copper", "Snow-white", "Brown"]
    },
    // Beards: chance by race and gender (male, female, nonbinary)
    beardChance: {
        human: [0.35, 0, 0.1], elf: [0, 0, 0], dwarf: [0.95, 0.35, 0.6], halfling: [0.15, 0, 0.05],
        gnome: [0.45, 0, 0.15], orc: [0.3, 0, 0.1], tiefling: [0.25, 0, 0.1], dragonborn: [0, 0, 0]
    },
    beards: ["a full beard", "a forked beard", "a braided beard", "a neat goatee", "mutton chops", "a handlebar mustache",
        "a long beard tucked into the belt", "a scruffy beard", "a beard with beads woven in", "a pencil mustache",
        "a short boxed beard", "a beard braided into three points", "a singed beard", "a beard with a pipe tucked in it",
        "a walrus mustache", "a stubbled jaw"],
    // Dragonborn have no hair: scale color plus head ornament instead
    scaleColors: ["Black", "Blue", "Brass", "Bronze", "Copper", "Gold", "Green", "Red", "Silver", "White", "Dusky grey", "Mottled green", "Pearl", "Sun-faded red"],
    dragonbornHead: ["swept-back horns", "curved horns", "a frilled crest", "short spiked frills", "a smooth scaled crown", "jaw barbels",
        "a ridge of bony plates", "one broken horn", "horns capped with brass", "a crest of quills", "a scarred snout", "frills pierced with rings"],
    eyes: ["Brown", "Blue", "Green", "Hazel", "Grey", "Amber", "Dark", "Pale blue", "Heterochromatic", "Bloodshot", "Steel-grey", "Honey-brown"],
    eyeLooks: ["Kind", "Shifty", "Tired", "Sharp", "Twinkling", "Heavy-lidded", "Wide", "Narrow", "Sad", "Piercing", "Squinting", "Warm", "Cold", "Darting"],
    raceEyes: {
        elf: ["Violet", "Silver", "Gold-flecked", "Leaf-green", "Starlit blue"],
        tiefling: ["Solid black", "Solid red", "Glowing gold", "Solid silver", "Ember-orange"],
        dragonborn: ["Slit gold", "Slit red", "Molten orange", "Slit green", "Pale yellow"],
        orc: ["Red", "Yellow", "Dark brown", "Amber"],
        gnome: ["Bright blue", "Sparkling green", "Gold", "Violet"]
    },
    features: [
        "Scar across the face", "Missing tooth", "Birthmark on the neck", "Faded tattoo", "Extra finger", "Glass eye",
        "Wooden leg", "Burn scars on the hands", "Freckles everywhere", "Gap-toothed grin", "Prominent nose", "Bushy eyebrows",
        "Cleft chin", "Deep dimples", "Crooked nose, broken more than once", "Missing an ear", "Eyepatch", "Gold tooth",
        "Ink-stained fingers", "Calloused hands", "Chewed fingernails", "A hook for a hand", "Pockmarked skin", "Sunburnt nose",
        "Rosy cheeks", "Huge ears", "Very long fingers", "A limp", "Hunched shoulders", "Perfect posture", "Notched ear",
        "Brand on the wrist", "Smells of pipe smoke", "Lazy eye", "Many earrings", "Split lip that never healed",
        "Faint glow under the skin", "A streak of white in their hair", "Cracked spectacles", "Snaggletooth",
        "Rope-burn scars on the wrists", "Nose ring", "Painted fingernails", "Gravelly cough", "A permanent squint"
    ],
    // Race features replace the shared ones about a third of the time
    raceFeatures: {
        human: ["Clan tattoos down one arm", "Weathered sailor's skin", "Old dueling scar on the cheek"],
        elf: ["Ears pierced with silver rings", "Unnaturally still when listening", "Faint leaf tattoos on the temples", "One ear notched in a duel", "Never seems to blink"],
        dwarf: ["Beard rings of gold and iron", "Forge-scarred forearms", "Nose broken flat", "Clan runes tattooed on the scalp", "Hands like shovels"],
        halfling: ["Hairy, bare feet", "Very curly sideburns", "A pipe always in hand", "Suspiciously sticky fingers", "Round, cheerful face"],
        gnome: ["Goggles pushed up on the forehead", "Burn marks from an experiment", "An enormous nose", "Eyebrows singed off", "Ears that twitch when excited"],
        orc: ["Tusks capped in silver", "One broken tusk", "Ritual scars on the arms", "Nose ring through the septum", "Tusks filed down"],
        tiefling: ["Horns curling back like a ram's", "Tall straight horns", "One horn broken off", "Tail that flicks when annoyed", "Horns hung with tiny bells", "Tail wrapped around one leg", "Faint smell of brimstone", "Smoke when they sigh"],
        dragonborn: ["Scales chipped along the jaw", "A missing claw", "Breath that smells of sulfur", "Tail stump from an old wound", "Scales polished to a shine"]
    },

    // ATTIRE: "{condition} {color} {garment}, {detail}". The garment follows the job.
    attire: {
        conditions: {
            poor: ["Patched", "Threadbare", "Mud-spattered", "Faded", "Fraying", "Hand-me-down", "Clean but worn", "Stained"],
            mid: ["Well-kept", "Neatly pressed", "Practical", "Slightly worn", "Freshly mended", "Sturdy", "Sensible", "Clean"],
            rich: ["Embroidered", "Silk-lined", "Velvet", "Jeweled", "Immaculate", "Fur-trimmed", "Gold-threaded", "Brand-new"]
        },
        colors: ["brown", "grey", "black", "green", "blue", "red", "ochre", "white", "purple", "russet", "mustard", "dove-grey", "forest-green", "navy", "cream", "plum"],
        garments: {
            commoner: ["wool tunic and breeches", "linen smock", "work apron over a shirt", "homespun dress", "oilskin coat", "farmer's smock", "leather jerkin", "rough cloak"],
            merchant: ["merchant's coat", "doublet and hose", "long vest with many pockets", "fitted dress with a coin belt", "travel coat", "shop apron over fine linen"],
            guard: ["town-watch tabard over chain", "padded gambeson", "uniform coat with brass buttons", "leather armor and a sash of office", "magistrate's robe", "breastplate and cloak"],
            magic: ["star-patterned robe", "scholar's gown", "hooded robe", "alchemist's apron", "long coat covered in pockets", "traveling robe"],
            criminal: ["hooded cloak", "dark leathers", "too-fine coat that doesn't fit", "sailor's slops", "nondescript tunic", "patchwork coat"],
            noble: ["brocade doublet", "court gown", "silk coat", "hunting jacket", "riding habit", "ermine-trimmed cloak"],
            religious: ["temple vestments", "plain habit", "pilgrim's robe", "holy surcoat", "rough hermit's robe", "ceremonial stole over a robe"],
            adventurer: ["scuffed traveling leathers", "chainmail under a cloak", "patched adventuring gear", "hide armor", "road-worn coat", "half-plate and a stained tabard"]
        },
        tier: { commoner: 'poor', criminal: 'poor', merchant: 'mid', guard: 'mid', magic: 'mid', religious: 'mid', adventurer: 'mid', noble: 'rich' },
        details: ["with a rope belt", "smelling faintly of woodsmoke", "dusted with flour", "jingling with charms", "with too many pouches",
            "with a holy symbol on a cord", "with a feather in the hat", "covered in soot", "dripping wet from the rain", "with mismatched boots",
            "with a bright scarf", "with a ring on every finger", "smelling of herbs", "with paint on the sleeves", "with a cloak pinned by a brooch",
            "with a sword-belt and no sword", "with fresh mud on the hem", "with a flower in the buttonhole", "with a wide-brimmed hat", "with a pipe in the pocket",
            "with ink stains on the cuffs", "with a tooth on a string", "with a dented helmet tied on", "with a fox-fur collar", "with a spotless white collar",
            "with a stained bib", "with a lucky sock pinned on", "with a guild badge", "with boots polished to a mirror", "barefoot"]
    },

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
            "If you're selling, I'm not buying. If you're buying, I'm not selling.",
            "Wipe your boots. No, the other boots.",
            "Ah, customers. Or thieves. Hard to tell with your sort.",
            "Morning! Or evening. I've lost track since the eclipse.",
            "Don't mind the smell. It's a local tradition.",
            "Come in, come in. Don't touch anything that hums.",
            "If the goose asks, you never saw me."
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
            "If you see my cousin, tell them they owe me money.",
            "Off you go. I'll pray for you. Briefly.",
            "If you die, can I have your boots?",
            "Watch out for the bridge. It's sensitive.",
            "Don't let the door hit you. It bites."
        ],
        gossip: [
            "Between you and me, the baker's bread is ten parts sawdust.",
            "The guard captain is secretly in love with the blacksmith.",
            "I heard the king is actually three goblins in a trench coat.",
            "The well's been tasting funny lately. Just saying.",
            "There's a tunnel under the temple. Nobody uses it. Wonder why.",
            "The local wizard's tower glows on Tuesdays. Tax day, probably.",
            "I saw a dragon land last night. Or it was a very large chicken.",
            "The tavern owner waters down the ale. I have proof.",
            "Someone's been stealing left shoes. Right shoes are safe.",
            "The statue in the square winks at midnight. I've seen it.",
            "The new priest doesn't cast a shadow. Nobody's mentioned it.",
            "The miller's been buying a lot of rope. A lot.",
            "That fancy carriage? Empty every time. Every time.",
            "The town council meets in the cellar now. With the lights off."
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
            "It's cursed. Obviously. That's why I'm hiring.",
            "Something's eating the sheep. Not wolves. Wolves leave bones.",
            "Find my ring and I'll find you a reward. Probably."
        ],
        combat: [
            "I fight dirty. Very dirty.",
            "My weapon has a name. Want to hear its story?",
            "I've been in worse bars than this.",
            "You're not the first to try. You won't be the last.",
            "I have a family. Please don't make me orphan them.",
            "This is why I have insurance.",
            "I was hoping we could talk about this over ale.",
            "My lawyer will be in touch.",
            "I'm too old for this. But here we are.",
            "At least I'll die doing what I love. Complaining.",
            "Not the face! I need the face for work.",
            "Fine. But we're splitting the bill for the window."
        ]
    },
    // Lines by job, mixed in with the general ones
    jobDialogue: {
        commoner: ["Harvest's late again. Blame the weather, blame the gods, blame the goats.", "I've been up since before the rooster, so make it quick.", "Honest work never made anyone rich. Ask me how I know.", "If you're here about the fence, it was like that when I got here.", "My back's been aching. That means rain, or a war."],
        merchant: ["Everything's for sale except my dignity. That's extra.", "Prices went up this morning. Don't ask why.", "That one? Excellent choice. Very rare. I have nine of them.", "Cash, coin, or a very convincing story.", "No refunds. No returns. No regrets."],
        guard: ["Papers. No papers? Then a very good reason.", "Keep your weapons sheathed and your business boring.", "I've seen your sort before. Usually on a poster.", "Curfew's at the third bell. I don't make the rules. I just enjoy them.", "Move along. Nothing to see. Especially not that."],
        magic: ["Don't touch the jar. Or the other jar. Just don't touch things.", "Magic is just science that hasn't paid its taxes.", "The stars said you'd come. They also said you'd be taller.", "I could explain it, but your ears would bleed.", "Yes, it's supposed to smoke like that."],
        criminal: ["I don't know you. You don't know me. Lovely arrangement.", "Talk quieter. The walls in this town are nosy.", "Everything I sell fell off a cart. Very gently.", "You didn't see me here. I wasn't here. Neither were you.", "For the right price, I can find anything. Even your purse."],
        noble: ["Do you know who I am? No? Splendid, let's keep it that way.", "One does not simply walk up to me. One is announced.", "My family has owned this land for nine generations. And the people on it.", "How quaint. You have dirt on you.", "Fetch me something. Anything. I'm bored."],
        religious: ["The gods are watching. Mostly with disappointment.", "Have you considered repenting? Just in case?", "Donations are voluntary. Strongly voluntary.", "Bless you. That'll be two coppers.", "I prayed for guidance and the gods sent you. I'm sure they had reasons."],
        adventurer: ["I once killed a troll with a spoon. Long story. Buy me a drink.", "Dungeons are mostly stairs and regret.", "Never split the party. Trust me.", "You want my advice? Always check the ceiling.", "I'm retired. I keep saying that. Nobody listens."]
    },

    // VOICES
    voices: [
        "Deep and booming", "High and squeaky", "Raspy and worn", "Smooth as silk", "Gravelly", "Musical",
        "Monotone", "Excitable", "Sleepy", "Angry", "Whispery", "Nasal", "Breathy", "Commanding", "Shy",
        "Sarcastic", "Enthusiastic", "Bored", "Dramatic", "Clockwork-precise", "Ethereal", "Guttural", "Melodic",
        "Crackling", "Echoey", "Muffled", "Clear as a bell", "Slurred", "Precise", "Unpredictable",
        "Sing-song", "Clipped and military", "Wheezy", "Honeyed", "Thick regional accent", "Rapid-fire", "Gentle",
        "Hoarse from shouting", "Posh and drawling", "Always slightly too loud", "Lisping", "Sniffly",
        "Warm and grandmotherly", "Flat and suspicious", "Stammering", "Like a tavern storyteller", "Quiet but carrying",
        "Breaks into song mid-sentence", "Lilting and slow", "Pinched and fussy", "Rumbling", "Chirpy",
        "Creaky like an old door", "Bubbly", "Mournful", "Velvety", "Shrill", "Measured and careful",
        "Hushed, as if someone's listening", "Reedy", "Brassy", "Gruff but kind", "Relentlessly cheerful", "Lazy drawl",
        "Cracks on the high notes", "Clears their throat constantly", "Fast and breathless", "Croaky", "Plummy", "Lecturing",
        "Silky and dangerous", "Childlike", "Soothing, like a lullaby", "Like gravel in a bucket", "Booming, with long pauses", "Sharp and cutting",
        "Tremulous", "Purring", "Barking", "Wavering with age", "Throaty", "Prim and proper",
        "Mumbles into their collar", "Every sentence sounds like a question", "Hisses every s", "Theatrical whisper", "Stern schoolteacher", "Jolly and wheezing",
        "Laughs between sentences", "Very, very slow"
    ],

    // SECRETS
    secrets: [
        "Is actually a retired adventurer", "Owes money to dangerous people", "Witnessed a crime and said nothing",
        "Has a wanted poster with their face", "Is secretly royalty", "Made a deal with a fiend", "Can't remember their past",
        "Is being blackmailed by {townsfolk}", "Has a cursed item they can't remove", "Is a spy for another kingdom",
        "Killed someone by accident", "Stole something valuable years ago", "Is addicted to a magical substance",
        "Has a child nobody knows about", "Faked their own death", "Is far older than they look", "Can speak with animals but hides it",
        "Is afraid of their own power", "Made a promise they can't keep", "Knows where a treasure is buried",
        "Is two halflings in a long coat", "Was once engaged to a dragon in disguise", "Runs an underground fighting ring",
        "Is the anonymous author of a scandalous ballad", "Has a twin nobody knows about", "Is slowly turning into a tree",
        "Burned down their old village by mistake", "Reads other people's letters", "Is a lycanthrope who has never hurt anyone (yet)",
        "Secretly writes for the Beholder's Gazette", "Is having an affair with {townsfolk}", "Poisoned a rival and got away with it",
        "Has been replaced by a doppelganger, and the real one is in the cellar", "Can't read, and hides it brilliantly",
        "Is a deserter from the army", "Keeps a hidden room full of stolen {thing}s", "Is the heir to {place}, and doesn't want it",
        "Hears a voice from their {thing}", "Sold their name to a hag and is using a fake one", "Is a member of a doomsday cult",
        "Was a famous pirate under another name", "Sabotaged a rival's business", "Is a coward who took credit for a hero's deed",
        "Knows the mayor's real identity", "Is hiding a fugitive in their home", "Swapped places with their noble lookalike",
        "Has a pet mimic they pass off as a chest", "Is one bad night away from losing everything", "Was raised by wolves (actual wolves)",
        "Rigged the town election", "Is the masked vigilante everyone talks about", "Is quietly dying and has told no one",
        "Is a priest who lost their faith years ago", "Has a second family in the next town", "Is apprenticed to a hag",
        "Accidentally let something loose at {place}", "Murdered their business partner and took the shop", "Started the fire everyone blamed on lightning",
        "Sells news of the town to a dragon", "Knows who poisoned the town well", "Isn't the race they claim to be; it's an illusion",
        "Is wanted for treason in their homeland", "Still collects a pension for a {kin} who died years ago", "Hid a body under {place}",
        "Was a famous hero's sidekick and got written out of the songs", "Has won the harvest contest six years running by cheating", "Has the real {thing} and sold everyone forgeries",
        "Gambled away their {kin}'s inheritance", "Serves a vampire by night and remembers nothing by day", "Works as a fence for the thieves' guild",
        "Is the missing heir to a cult's leadership", "Is cursed to tell only the truth under a full moon", "Talks to the dead, who talk back",
        "Was born on the other side of a fairy ring", "Swapped two babies at birth, years ago", "Has a stash of gold buried in the churchyard",
        "Stole the town's bell", "Has never been to any of the places in their stories", "Is in love with their best friend's spouse",
        "Took bribes as a guard, and still does", "Owes their life to a necromancer and still visits", "Keeps a ghost in a jar",
        "Hunts lycanthropes and suspects someone in town", "Was once married to {townsfolk}, and they both pretend otherwise", "Is a former cultist who escaped",
        "Knows a tunnel under town that no one else remembers", "Sells the town's secrets to bandits", "Has a ring that grants one wish and is too scared to use it",
        "Writes the mayor's speeches", "Can see the future, but only the bad news", "Is a polymorphed creature who forgot what they were",
        "Sleepwalks, and wakes with muddy boots and strange coins"
    ],

    // QUEST HOOKS
    questHooks: [
        "Needs escort to the next town (dangerous road)", "Lost a family heirloom in a dungeon", "Being followed by mysterious figures",
        "Received a threatening letter", "A {kin} has gone missing", "Business being sabotaged", "Cursed and needs it lifted",
        "Witnessed something they shouldn't have", "Needs protection for an important delivery", "Someone is impersonating them",
        "Has information that could start a war", "Owes a debt to a crime lord", "Found a map but can't read it",
        "Dreams are coming true (literally)", "Item they sold is now needed back", "Someone knows their secret",
        "Needs a bodyguard for a public event", "Child has been kidnapped", "Property is being taken by {townsfolk}",
        "Haunted by a specific ghost", "Wants a rival's prize pig stolen before the fair", "Needs a stand-in at their own wedding",
        "Their shop's sign keeps getting stolen", "Inherited a key to a door they can't find", "Hears knocking from inside the walls",
        "Lost a bet and owes a fey their firstborn", "Needs a rare ingredient from a dangerous place", "Wants proof their spouse is a doppelganger",
        "Their familiar ran away with valuable notes", "Needs someone to win a contest for them", "Wants {thing} recovered from {place}",
        "Needs a message carried to {place}, unread", "Wants {townsfolk} followed for a week", "Needs help moving a body. It's fine. It's a statue. Mostly.",
        "Their cellar has a new door that wasn't there yesterday", "Is being sued by a ghost", "Wants a dragon egg returned before anyone notices",
        "Needs their name cleared of a crime", "Wants a wedding ring retrieved from a troll", "Needs a rat problem solved; the rats are organized",
        "Wants to be taught to fight by Friday", "Needs a stolen painting stolen back", "Is offering a reward for a talking cat",
        "Their crops grow overnight and scream", "Needs a fake treasure map planted", "Wants a song written about them, and a bard to sing it",
        "Has a buyer for {thing} but needs it delivered quietly", "Needs a witness to a duel", "Wants to know who keeps leaving gifts on their doorstep",
        "Hired the wrong adventurers last time and needs the mess cleaned up",
        "Needs someone to taste-test a potion. Just a sip.", "Wants their {kin} talked out of joining the army", "Lost the deed to {place} in a card game",
        "Their well water has started to glow", "Needs a lost sheep found; it was last seen walking into a cave", "Wants a haunted mirror carried out of the house, facing away",
        "Needs a cart of eggs delivered without breaking one", "Is being followed by a very persistent goose", "Wants to know why the birds went quiet near {place}",
        "Needs someone to guard their {kin}'s grave for three nights", "Their scarecrow keeps moving between fields", "Needs a forged letter delivered before the real one arrives",
        "Wants a rival's recipe stolen before the harvest fair", "Paid a wizard for a spell that hasn't worn off", "Needs a key copied without its owner knowing",
        "Found a stranger asleep in their barn who won't wake up", "Wants an apology delivered to {townsfolk}, in person, with flowers", "Their {thing} was swapped for a fake, and they want to know when",
        "Needs bandits cleared off the mill road before market day", "Needs a rare book returned to a library that doesn't want it back", "Wants the party to pose as their rich relatives at dinner",
        "The bridge troll has raised the toll again", "Owes rent to a landlord who's been dead for a year", "Needs a runaway apprentice brought home, gently",
        "Wants their lost dog found. The dog is the size of a pony.", "Needs a sealed box buried at {place} at midnight", "Their reflection moves a moment late",
        "Needs an honest appraiser for an heirloom and trusts no one in town", "Is hosting a feast and the cook just quit", "Wants proof that {townsfolk} is a fraud",
        "Their bees have swarmed into the old crypt", "Needs a stubborn ghost talked into moving on", "Wants a map of the caves under town",
        "Needs to catch whoever's been milking their cows at night", "Has a letter for the party from someone they've never met", "Needs a sick {kin} carried to a healer two towns over",
        "Wants a debt collected from a very large person", "Their shop is cursed so every customer leaves angry", "Needs a chaperone for their {kin}'s first trip to the city",
        "Saw lights at {place} and wants someone braver to look"
    ],

    // RELATIONSHIPS
    relationships: [
        "Has a rival in town", "Best friends with the bartender", "Related to the mayor", "In debt to the merchant guild",
        "Secretly dating a guard", "Mentor to a young adventurer", "Feuding with {townsfolk}", "Owes a favor to the thieves' guild",
        "Member of a secret society", "Former adventuring party member", "Apprentice to the local wizard", "Sibling of a famous hero",
        "Enemy of a local noble", "Protected by a dragon", "Informant for the city watch", "Member of a religious cult",
        "Business partner with {townsfolk}", "Rival merchant", "Former prisoner", "Godchild of a deity",
        "Ex-spouse of the guard captain", "Owes the local temple a large tithe", "Pen pal of a foreign prince",
        "Childhood friend of a notorious pirate", "Landlord to half the street", "Banned from the local tavern",
        "Sponsor of a struggling bard", "Teaches the mayor's children", "Sworn enemy of a goose", "Engaged to someone they've never met",
        "Secretly in love with {townsfolk}", "Owes {townsfolk} a small fortune", "Was jilted at the altar by {townsfolk}",
        "Raised by {townsfolk} after their parents vanished", "Plays cards every week with {townsfolk}", "Lost a duel to {townsfolk} and wants a rematch",
        "Gossip partner of {townsfolk}", "Writes anonymous love letters to {townsfolk}", "Is blackmailing {townsfolk}",
        "Saved {townsfolk}'s life and never lets them forget it", "Estranged from their {kin}", "Lives with their {kin}, who disapproves of everything",
        "Has seven siblings and keeps track of none", "Keeps a ledger of every favor owed in town", "Was the old flame of {townsfolk}",
        "Shares a fence, and a bitter feud, with {townsfolk}", "Trains hounds for the local lord", "Is courting two people at once",
        "Is the only one in town the cat likes", "Owes their job to {townsfolk}",
        "Brews ale for all three of the town's rival taverns", "Is the town's most frequent juror", "Shares a pew, and a grudge, with {townsfolk}",
        "Godparent to half the children in town", "Was squire to a knight who died in disgrace", "Pays {townsfolk} to keep quiet about something",
        "Grew up next door to {townsfolk} and knows all their secrets", "Sworn rival of the baker across the street", "Has an arrangement with the local smugglers",
        "Keeps bees with {townsfolk} every spring", "Leads the town choir, badly", "Is the only person who visits the old hermit",
        "Carries letters for a merchant house in the city", "Is on a first-name basis with the local ghost", "Owes a life-debt to a goblin",
        "Childhood sweetheart of {townsfolk}", "Was cheated by {townsfolk} and hasn't forgotten", "Distantly related to a disgraced noble family",
        "Writes letters for people who can't", "Fosters orphans from the temple", "Is the town's unofficial matchmaker",
        "Former cellmate of a famous thief", "Hosts a weekly supper for the town's widows", "Go-between for two feuding families",
        "Has had a standing bet with {townsfolk} for twenty years", "Married into a family that never accepted them", "Takes orders from someone they've never seen",
        "Stands surety for {townsfolk}'s debts", "Used to serve the local lord and left on bad terms", "Is secretly teaching {townsfolk} to read",
        "Corresponds with a wizard in a distant tower", "Last surviving member of their guild chapter", "Rents a room to a suspicious lodger",
        "Blames {townsfolk} for the death of their {kin}", "Quietly pays for the local orphanage", "Sells information to anyone who pays",
        "Was nanny to the current mayor", "Fought beside {townsfolk} in a war nobody talks about", "Is the local lord's unacknowledged child",
        "Plays chess by post with a stranger"
    ],

    // WHEN YOU MEET THEM (what they're doing when the party walks up)
    doing: {
        any: [
            "Arguing with a merchant over a cabbage", "Asleep in a chair, snoring loudly", "Chasing a runaway chicken", "Counting coins and losing count",
            "Eating a meat pie with great focus", "Fixing a broken cart wheel", "Lost in a book, walking into things", "Mending a torn cloak",
            "Muttering at a letter they just received", "Nursing a split lip", "Pacing and checking the time", "Playing dice with themselves",
            "Reading a wanted poster very closely", "Scrubbing a stain that won't come out", "Sharpening a knife a little too slowly", "Singing badly to nobody",
            "Hiding behind a barrel", "Trying to coax a cat down from a roof", "Waiting for someone who's very late", "Feeding pigeons with suspicious intent",
            "Stuck halfway through a window", "Writing furiously in a notebook", "Crying quietly, then pretending not to be", "Haggling over a used boot",
            "Kicking a door that won't open", "Arm-wrestling a stranger", "Painting a sign with a spelling mistake", "Hiccupping and furious about it",
            "Searching the ground for a lost ring", "Practicing a speech under their breath"
        ],
        commoner: ["Hauling sacks of grain", "Shoeing a stubborn horse", "Herding goats through the square", "Sweeping a doorstep for the third time", "Mending a fishing net"],
        merchant: ["Rearranging stock that was fine", "Shouting prices at passersby", "Weighing coins on a tiny scale", "Polishing a dubious 'antique'", "Chasing a shoplifter"],
        guard: ["Questioning a nervous halfling", "Nailing up a new edict", "Pretending not to nap at their post", "Writing someone a fine", "Escorting a drunk home"],
        magic: ["Scribbling runes in chalk on the cobbles", "Trying to put out a small, magical fire", "Arguing with a talking skull", "Feeding a familiar something wriggly", "Reading tea leaves and frowning"],
        criminal: ["Lurking in a doorway", "Watching the party's purses", "Swapping a parcel in an alley", "Losing a tail through the market", "Picking a lock and whistling"],
        noble: ["Being carried in a litter", "Complaining to a servant", "Inspecting the street with a handkerchief to their nose", "Holding court with flatterers", "Tossing coins to the crowd"],
        religious: ["Preaching on a crate", "Blessing a cart of turnips", "Collecting alms with a rattling tin", "Lighting candles at a roadside shrine", "Exorcising a very confused goat"],
        adventurer: ["Telling a crowd a tall tale", "Polishing a dented shield", "Bandaging a wound", "Selling 'genuine dragon teeth'", "Studying a map upside down"]
    },

    // POCKETS
    trinkets: [
        "a lucky rabbit's foot", "a love letter (unsent)", "a chipped die that always rolls 4", "a tin whistle", "a pressed flower",
        "a map with one corner burned off", "a pouch of sunflower seeds", "a key to an unknown lock", "a small carved bear", "a deck of marked cards",
        "a bent spoon", "half a sandwich", "a lock of someone's hair", "a pawn ticket", "a tooth (not theirs)", "a stub of chalk",
        "a vial of red ink", "a dried frog", "a wanted poster, folded small", "a glass marble with a swirl", "a ring too small for any finger",
        "a broken compass", "a sealed letter addressed to the mayor", "a pinecone painted gold", "a lump of wax with a seal pressed in",
        "a list of names, half crossed out", "a sugar mouse", "a single fancy earring", "a coin from a kingdom that no longer exists", "a tiny portrait of a dog",
        "a sprig of garlic", "a crumpled IOU", "a candle stub", "a thimble", "a small bag of salt", "a toy soldier", "a hand-drawn treasure map (probably fake)",
        "a spool of thread", "a seashell", "a wooden holy symbol", "a bottle cork", "a magnifying lens", "a pipe and a pouch of leaf",
        "a tiny book of bad poems", "a whetstone", "a raven feather", "a set of lockpicks", "a carved bone flute", "a fist-sized geode",
        "a knot of string nobody can untie", "a recipe for stew", "an invitation to a party last week", "a ticket for the next ferry", "a crust of bread for ducks",
        "a scrap of a spell scroll", "a tooth-shaped pebble", "a monocle with no glass", "a thank-you note from a stranger", "a mouse (alive)", "a pair of dice, loaded",
        "a button from a noble's coat", "a tiny bell with no clapper", "a snail shell full of glitter", "a horseshoe nail for luck", "a dented tin cup",
        "a scrap of tapestry", "a love token carved from bone", "a padlock with no key", "a smooth river stone", "a child's drawing of a dragon",
        "a bundle of tally sticks", "a small jar of honey", "an empty bird's nest", "a twist of licorice", "a broken arrowhead",
        "a page torn from a ledger", "a wax-sealed vial of seawater", "a written list of grievances", "a wedding ring on a string", "a badge from a guild that kicked them out",
        "a stopped pocket watch", "a hair ribbon", "a dried mushroom of unknown kind", "a bag of odd buttons", "a two-headed coin",
        "a folded paper crane", "a pair of knucklebones", "a moth in a tiny jar", "a potion recipe that doesn't work", "a cracked hand mirror",
        "a torn theater ticket", "a ball of yarn", "a sprig of lavender", "a compass that always points to the tavern", "a note reading \"don't trust the miller\"",
        "a toy boat", "a string of prayer beads", "a badger's tooth", "a jar of pickled eggs", "a sketch of someone's face, unfinished"
    ],
    // Purse ranges in copper pieces, by category: [min, max]
    purses: {
        commoner: [0, 150], merchant: [100, 2500], guard: [20, 400], magic: [50, 1500],
        criminal: [0, 3000], noble: [1000, 15000], religious: [0, 200], adventurer: [100, 5000]
    },

    // Fillers for {tokens}
    fill: {
        townsfolk: ["the miller", "the blacksmith", "the mayor", "the guard captain", "the innkeeper", "a retired knight", "the town's best baker",
            "a wandering bard", "the local wizard", "the high priest", "a widowed noble", "the ferryman", "a halfling sheriff", "the gravedigger",
            "the harbormaster", "a traveling tinker", "the herbalist next door", "the tax collector", "a famous adventurer", "the old hermit"],
        kin: ["sister", "brother", "sibling", "mother", "father", "parent", "grandmother", "grandfather", "cousin", "aunt", "uncle", "spouse", "daughter", "son", "child", "twin"],
        place: ["the old mill", "the family farm", "the lighthouse", "the abandoned chapel", "the village green", "a crumbling tower", "the orphanage",
            "the riverside inn", "the old mine", "a hidden grove", "the town library", "their childhood home", "the stone circle on the hill", "the harbor"],
        thing: ["sword", "amulet", "music box", "journal", "crown", "ring", "painting", "spellbook", "locket", "map", "lute", "tome", "idol", "mirror", "pocket watch"]
    }
};

// ==================== UTILITY FUNCTIONS ====================

function randomArray(arr) {
    return arr[Math.floor(rand() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
}

function rollStat() {
    // Roll 4d6, drop lowest
    const rolls = [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)];
    rolls.sort((a, b) => a - b);
    return rolls.slice(1).reduce((a, b) => a + b, 0);
}

// Local name: shop-engine.js and toolbox-table.js each define their own abilityMod.
function npcMod(score) {
    return Math.floor((score - 10) / 2);
}

// Fill {townsfolk}, {kin}, {place}, {thing} from npcData.fill.
function fillTemplate(text) {
    return text.replace(/\{(\w+)\}/g, (m, key) => npcData.fill[key] ? randomArray(npcData.fill[key]) : m);
}

// A [male, female, other] title picks by gender; a plain string is the same for all.
function genderedTitle(entry, gender) {
    if (!Array.isArray(entry)) return entry;
    return entry[{ male: 0, female: 1 }[gender] ?? 2];
}

const NPC_ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral',
    'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];

// Age in years for each bucket, by race (lifespans after the SRD 5.1 race notes).
const NPC_AGE_RANGES = {
    human: { young: [16, 25], adult: [26, 40], middle: [41, 60], old: [61, 80], ancient: [81, 105] },
    elf: { young: [80, 120], adult: [121, 300], middle: [301, 500], old: [501, 650], ancient: [651, 800] },
    dwarf: { young: [30, 50], adult: [51, 150], middle: [151, 250], old: [251, 330], ancient: [331, 420] },
    halfling: { young: [18, 30], adult: [31, 60], middle: [61, 100], old: [101, 140], ancient: [141, 200] },
    gnome: { young: [30, 45], adult: [46, 150], middle: [151, 300], old: [301, 400], ancient: [401, 500] },
    orc: { young: [12, 18], adult: [19, 30], middle: [31, 45], old: [46, 60], ancient: [61, 80] },
    tiefling: { young: [16, 25], adult: [26, 40], middle: [41, 60], old: [61, 85], ancient: [86, 115] },
    dragonborn: { young: [12, 18], adult: [19, 35], middle: [36, 55], old: [56, 70], ancient: [71, 90] }
};
const NPC_AGE_BUCKETS = ['young', 'adult', 'middle', 'old', 'ancient'];

// Age shifts to ability scores
const NPC_AGE_STAT_SHIFT = {
    young: { con: 1, wis: -1 }, adult: {}, middle: { wis: 1, dex: -1 },
    old: { str: -1, dex: -1, wis: 1 }, ancient: { str: -2, dex: -2, con: -1, wis: 2, int: 1 }
};

// Hit dice by category: [min dice, max dice, die size]
const NPC_HIT_DICE = {
    commoner: [1, 3, 8], merchant: [1, 3, 8], guard: [2, 6, 10], magic: [2, 6, 6],
    criminal: [2, 5, 8], noble: [1, 4, 8], religious: [2, 5, 8], adventurer: [4, 9, 10]
};

// Copper pieces as "3 gp, 7 sp, 12 cp" (nonzero parts only).
function purseText(cp) {
    if (!cp) return 'Empty';
    const gp = Math.floor(cp / 100), sp = Math.floor((cp % 100) / 10), c = cp % 10;
    return [gp && `${gp} gp`, sp && `${sp} sp`, c && `${c} cp`].filter(Boolean).join(', ');
}

// Full name for a race and gender. Returns { first, surname, nickname, name }.
// Always makes the same draws, so the stream doesn't depend on which way it goes.
function buildName(race, gender) {
    const S = npcData.surnames;
    const first = randomArray(npcData.names[race][gender]);
    const nick = rand() < 0.1 ? randomArray(npcData.nicknames) : '';
    const roll = rand();
    const pick = { surname: rand(), extra: rand() };
    const at = (list, r) => list[Math.floor(r * list.length)];
    const quoted = n => n ? `"${n}" ` : '';
    switch (race) {
        case 'dragonborn': {
            // Clan first in their tongue; written here as "of Clan …". A few still use a childhood name.
            const clan = at(S.dragonborn, pick.surname);
            const nickname = roll < 0.15 ? at(S.dragonbornChildhood, pick.extra) : nick;
            return { first, surname: clan, nickname, name: `${first} ${quoted(nickname)}of Clan ${clan}` };
        }
        case 'tiefling': {
            if (roll < 0.3) {
                const virtue = at(S.tieflingVirtues, pick.extra);
                return { first: virtue, surname: '', nickname: '', name: virtue };
            }
            const surname = at(S.human, pick.surname);
            return { first, surname, nickname: nick, name: `${first} ${quoted(nick)}${surname}` };
        }
        case 'gnome': {
            const nickname = roll < 0.5 ? at(S.gnomeNicknames, pick.extra) : nick;
            const surname = at(S.gnome, pick.surname);
            return { first, surname, nickname, name: `${first} ${quoted(nickname)}${surname}` };
        }
        case 'orc': {
            // Some orcs go by one name; the rest carry an earned name.
            if (roll < 0.2) return { first, surname: '', nickname: nick, name: nick ? `${first} "${nick}"` : first };
            const surname = at(S.orc, pick.surname);
            return { first, surname, nickname: nick, name: `${first} ${quoted(nick)}${surname}` };
        }
        default: {
            const surname = at(S[race], pick.surname);
            return { first, surname, nickname: nick, name: `${first} ${quoted(nick)}${surname}` };
        }
    }
}

// ==================== NPC ROLL ====================

const NPC_RACES = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'tiefling', 'dragonborn'];
const NPC_GENDERS = ['male', 'female', 'nonbinary'];
const NPC_PORTRAITS = {
    human: '👤', elf: '🧝', dwarf: '🧔', halfling: '🧑',
    gnome: '🎩', orc: '👹', tiefling: '😈', dragonborn: '🐉'
};

// "Just a name" (F17): count names for a race and gender ('random' = any).
// Each is { name (full), first, race, gender }. No repeats unless the pool runs dry.
function rollNames(count = 10, opts = {}) {
    const races = NPC_RACES.includes(opts.race) ? [opts.race] : NPC_RACES;
    const genders = NPC_GENDERS.includes(opts.gender) ? [opts.gender] : NPC_GENDERS;
    const out = [];
    const seen = new Set();
    for (let tries = 0; out.length < count && tries < count * 25; tries++) {
        const race = randomArray(races);
        const gender = randomArray(genders);
        const n = buildName(race, gender);
        if (seen.has(n.name) || seen.has(n.first)) continue;
        seen.add(n.name);
        seen.add(n.first);
        out.push({ name: n.name, first: n.first, race, gender });
    }
    return out;
}

// The parts of an NPC that can be locked and rerolled on their own (F14).
// identity = name, race, gender (and so speed and portrait); job = profession;
// stats = abilities plus HP/AC (which follow the job and age).
const NPC_PARTS = ['identity', 'age', 'job', 'stats', 'alignment', 'trait', 'ideal', 'bond', 'flaw', 'quirks',
    'build', 'hair', 'eyes', 'feature', 'clothing', 'dialogue', 'voice', 'doing', 'pockets', 'secret', 'questHook', 'relationship'];

// Parts that follow the job category. A kept part keeps the category it was rolled
// with (opts.partCategory), so locking it holds when the job rerolls.
const NPC_JOB_PARTS = ['alignment', 'clothing', 'dialogue', 'doing', 'pockets'];

// opts: { race, professionType, age, gender }, each a value or 'random',
// plus partCategory: { part: category } for kept NPC_JOB_PARTS.
// seeds (optional): { part: seed }. Each part with a seed rolls from its own stream,
// so keeping a part's seed keeps that part when the rest rerolls. Without seeds,
// everything draws from rand() in order (callers wrap that in withSeed).
function rollNPC(opts = {}, seeds = null) {
    opts = { race: 'random', professionType: 'random', age: 'random', gender: 'random', ...opts };
    const part = (name, fn) => seeds && seeds[name] ? withSeed(seeds[name], fn) : fn();
    // Always draw, then use the fixed choice if there is one: a part's stream stays the
    // same whether its picker was "random" or the value it happened to roll.
    const pickOr = (choice, list) => {
        const r = randomArray(list);
        return choice === 'random' || !list.includes(choice) ? r : choice;
    };
    // A race list replaces the shared one when the race has one and the draw says so.
    const raceOr = (table, shared, chance) => {
        const s = randomArray(shared), r = rand(), use = rand() < chance;
        const list = table[race];
        return list && use ? list[Math.floor(r * list.length)] : s;
    };

    const { race, gender, name, firstName, surname, nickname } = part('identity', () => {
        const race = pickOr(opts.race, NPC_RACES);
        const gender = pickOr(opts.gender, NPC_GENDERS);
        const n = buildName(race, gender);
        return { race, gender, name: n.name, firstName: n.first, surname: n.surname, nickname: n.nickname };
    });

    // Every bucket draws a point in its range; the race scales it to years.
    const { ageBucket, age } = part('age', () => {
        const spots = NPC_AGE_BUCKETS.map(() => rand());
        const ageBucket = pickOr(opts.age, NPC_AGE_BUCKETS);
        const [lo, hi] = NPC_AGE_RANGES[race][ageBucket];
        return { ageBucket, age: `${lo + Math.floor(spots[NPC_AGE_BUCKETS.indexOf(ageBucket)] * (hi - lo + 1))} years` };
    });

    // Pick the category first so stats can follow the roll.
    const { professionCategory, profession } = part('job', () => {
        const professionCategory = pickOr(opts.professionType, Object.keys(npcData.professions));
        return { professionCategory, profession: genderedTitle(randomArray(npcData.professions[professionCategory]), gender) };
    });

    // The best rolls go to the job's key abilities, the rest fall in random order,
    // then age shifts them. HP is hit dice plus CON; AC follows the job and DEX.
    const partCategories = Object.fromEntries(NPC_JOB_PARTS.map(p => {
        const c = opts.partCategory && opts.partCategory[p];
        return [p, Object.hasOwn(npcData.professions, c) ? c : professionCategory];
    }));
    const isFighter = professionCategory === 'adventurer' || professionCategory === 'guard';
    const { stats, hp, ac } = part('stats', () => {
        const rolls = [rollStat(), rollStat(), rollStat(), rollStat(), rollStat(), rollStat()].sort((a, b) => b - a);
        const order = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => ({ k, r: rand() })).sort((a, b) => a.r - b.r).map(o => o.k);
        const primary = npcData.primaryAbilities[profession] || npcData.primaryAbilities[professionCategory];
        const keys = [...primary, ...order.filter(k => !primary.includes(k))];
        const stats = {};
        keys.forEach((k, i) => { stats[k] = rolls[i]; });
        Object.entries(NPC_AGE_STAT_SHIFT[ageBucket] || {}).forEach(([k, d]) => { stats[k] = Math.min(20, Math.max(3, stats[k] + d)); });
        const [minD, maxD, die] = NPC_HIT_DICE[professionCategory];
        const dice = randomInt(minD, maxD);
        let hp = 0;
        for (let i = 0; i < dice; i++) hp += Math.max(1, randomInt(1, die) + npcMod(stats.con));
        const armor = { fighter: randomInt(13, 18), common: randomInt(0, 2) };
        const ac = isFighter ? Math.max(armor.fighter, 10 + npcMod(stats.dex)) : 10 + Math.max(0, npcMod(stats.dex)) + armor.common;
        return { stats: { str: stats.str, dex: stats.dex, con: stats.con, int: stats.int, wis: stats.wis, cha: stats.cha }, hp, ac };
    });
    const speed = race === 'dwarf' || race === 'halfling' || race === 'gnome' ? '25ft' : '30ft';

    const alignment = part('alignment', () => {
        const w = npcData.alignmentWeights[partCategories.alignment];
        let r = rand() * w.reduce((a, b) => a + b, 0);
        return NPC_ALIGNMENTS[w.findIndex(x => (r -= x) < 0)] || 'True Neutral';
    });
    const trait = part('trait', () => randomArray(npcData.traits));
    const ideal = part('ideal', () => randomArray(npcData.ideals));
    const bond = part('bond', () => fillTemplate(randomArray(npcData.bonds)));
    const flaw = part('flaw', () => randomArray(npcData.flaws));
    const quirks = part('quirks', () =>
        [randomArray(npcData.quirks), randomArray(npcData.quirks)].filter((v, i, a) => a.indexOf(v) === i));

    // Hair draws every look and keeps the one that fits the race.
    const isDragonborn = race === 'dragonborn';
    const hairLabel = isDragonborn ? 'Scales' : 'Hair';
    const build = part('build', () => `${randomArray(npcData.heights)} and ${randomArray(npcData.frames)}`);
    const { hair, beard } = part('hair', () => {
        const scales = `${randomArray(npcData.scaleColors)} scales, ${randomArray(npcData.dragonbornHead)}`;
        const style = randomArray(npcData.hair);
        const color = raceOr(npcData.raceHairColors, npcData.hairColors, 0.6);
        const hairDo = style === 'Bald' || style === 'Shaved' ? style : `${color}, ${style.toLowerCase()}`;
        const beardStyle = randomArray(npcData.beards);
        const chance = npcData.beardChance[race][NPC_GENDERS.indexOf(gender)];
        const beard = rand() < chance ? beardStyle : '';
        return isDragonborn ? { hair: scales, beard: '' } : { hair: hairDo, beard };
    });
    const eyes = part('eyes', () => {
        const look = randomArray(npcData.eyeLooks), withLook = rand() < 0.5;
        const color = raceOr(npcData.raceEyes, npcData.eyes, 0.5);
        return withLook ? `${look}, ${color.toLowerCase()}` : color;
    });
    const feature = part('feature', () => raceOr(npcData.raceFeatures, npcData.features, 0.35));
    const clothing = part('clothing', () => {
        const a = npcData.attire;
        const cat = partCategories.clothing;
        return `${randomArray(a.conditions[a.tier[cat] || 'mid'])} ${randomArray(a.colors)} ${randomArray(a.garments[cat])}, ${randomArray(a.details)}`;
    });

    const dialogue = part('dialogue', () => {
        const general = randomArray(npcData.dialogue[randomArray(['greetings', 'farewells', 'gossip', 'quest', 'combat'])]);
        const job = randomArray(npcData.jobDialogue[partCategories.dialogue]);
        return rand() < 0.4 ? job : general;
    });
    const voice = part('voice', () => randomArray(npcData.voices));
    const doing = part('doing', () => {
        const any = randomArray(npcData.doing.any), job = randomArray(npcData.doing[partCategories.doing]);
        return rand() < 0.4 ? job : any;
    });
    const { pockets, purse } = part('pockets', () => {
        const picks = [randomArray(npcData.trinkets), randomArray(npcData.trinkets), randomArray(npcData.trinkets)];
        const pockets = picks.filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);
        const [lo, hi] = npcData.purses[partCategories.pockets];
        // Skewed low: most purses hold far less than the top of the range.
        const cp = lo + Math.floor(rand() * rand() * (hi - lo + 1));
        return { pockets, purse: purseText(cp) };
    });

    const secret = part('secret', () => fillTemplate(randomArray(npcData.secrets)));
    const questHook = part('questHook', () => fillTemplate(randomArray(npcData.questHooks)));
    const relationship = part('relationship', () => fillTemplate(randomArray(npcData.relationships)));

    const hairLook = isDragonborn ? hair
        : `${hair === 'Bald' || hair === 'Shaved' ? hair : `${hair} hair`}${beard ? `, ${beard}` : ''}`;

    return {
        name,
        firstName,
        surname,
        nickname,
        race,
        gender,
        age,
        ageBucket,
        profession,
        professionCategory,
        partCategories,
        stats,
        hp,
        ac,
        speed,
        alignment,
        trait,
        ideal,
        bond,
        flaw,
        quirks,
        build,
        hair,
        beard,
        hairLabel,
        hairLook,
        eyes,
        feature,
        clothing,
        dialogue,
        voice,
        doing,
        pockets,
        purse,
        secret,
        questHook,
        relationship,
        portraitIcon: NPC_PORTRAITS[race] || '👤',
        generatedAt: new Date().toISOString()
    };
}

// ── Town Square links: ?seed=&race=…&lock=<part>.<seed>[.<values>] ──
// The NPC page and the handout maker (F48) replay them with these two.
// lock= token -> [part, { seed, extra }], or null if it doesn't make sense. statsOk(extra)
// checks a kept stat block's [class, level]; the NPC page passes one that knows the classes.
function parseNpcLock(token, statsOk = ([c, l]) => /^[A-Za-z]{1,20}$/.test(c) && /^\d+$/.test(l) && +l >= 1 && +l <= 20) {
    const [part, seed, ...extra] = String(token).split('.');
    if (!NPC_PARTS.includes(part) || !parseSeed(seed)) return null;
    const valid = {
        identity: () => extra.length === 2 && NPC_RACES.includes(extra[0]) && NPC_GENDERS.includes(extra[1]),
        age: () => extra.length === 1 && NPC_AGE_BUCKETS.includes(extra[0]),
        job: () => extra.length === 1 && Object.hasOwn(npcData.professions, extra[0]),
        stats: () => extra.length === 0 || (extra.length === 2 && statsOk(extra))
    }[part] || (NPC_JOB_PARTS.includes(part)
        ? () => extra.length === 0 || (extra.length === 1 && Object.hasOwn(npcData.professions, extra[0]))
        : () => extra.length === 0);
    return valid() ? [part, { seed, extra }] : null;
}

// fields: the pickers { race, profession, age, gender } (a value or 'random').
// pinned: { part: { seed, extra } } for kept parts; the rest roll from the base seed.
// Returns the NPC (no stat block) with its seed and part seeds.
function rollNpcPinned(fields, seed, pinned = {}) {
    const rollOpts = { race: fields.race, professionType: fields.profession, age: fields.age, gender: fields.gender };
    if (pinned.identity) [rollOpts.race, rollOpts.gender] = pinned.identity.extra;
    if (pinned.age) [rollOpts.age] = pinned.age.extra;
    if (pinned.job) [rollOpts.professionType] = pinned.job.extra;
    rollOpts.partCategory = Object.fromEntries(NPC_JOB_PARTS.filter(p => pinned[p] && pinned[p].extra.length).map(p => [p, pinned[p].extra[0]]));
    const seeds = Object.fromEntries(NPC_PARTS.map(part => [part, pinned[part] ? pinned[part].seed : deriveSeed(seed, part)]));
    return { ...rollNPC(rollOpts, seeds), seed, seeds };
}
