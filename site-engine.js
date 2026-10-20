/* ============================================
   SITE ENGINE (F39): a keyed adventure site
   rollSite(seed, { kind, size, level, party }) → a crypt, lost mine, wizard's tower,
   sunken temple, bandit fort, monster lair, or ruined keep: 5-12 rooms on a grid
   (siteLayout, drawn as SVG by siteMapSvg), a feature in every room, fights from the
   encounter engine (one group of foes holds the place; something else wanders), traps,
   a hoard in the last room (opened in the Loot generator), and the site's story.
   Every part draws from its own child seed (deriveSeed), so:
     - a new level or party size keeps the map, the rooms, and which rooms hold a fight
       or a trap, and changes only the monsters, the DCs, and the damage;
     - a new size keeps the name, the story, and the first rooms' contents;
     - a new kind is a new place.
   The story can come from a History tab roll (siteStoryLines with a history).
   Needs rng.js, monsters-data.js, encounter-engine.js, history-engine.js (hisRoot, hisWhen).
   Trap DCs and damage follow the trap tables of the System Reference Document 5.1
   (CC-BY 4.0), the same numbers loot-engine.js uses (that file can't load beside
   encounter-engine.js, so they are repeated here).
   ============================================ */

const SITE_SIZES = {
    small: { label: 'Small', icon: '▫️', min: 5, max: 6 },
    medium: { label: 'Medium', icon: '◻️', min: 7, max: 9 },
    large: { label: 'Large', icon: '⬜', min: 10, max: 12 }
};

// entry: where the way in is ('top' grows down, 'bottom' grows up). cols × rows: the
// biggest the map gets. shape: how rooms are drawn. stairs: rows are floors (a tower).
// bands: who can hold the place (ENC_BANDS keys). habitat: where wanderers come from.
// hoard: the Loot generator's hoard source. door: what an ordinary door is made of.
const SITE_KINDS = {
    crypt: {
        label: 'Crypt', icon: '🪦', entry: 'top', cols: 4, rows: 4, shape: 'rect', door: 'a stone door', habitat: 'dungeon', hoard: 'tomb',
        bands: ['undead', 'haunt', 'necromancer', 'vampire', 'cult', 'tomb', 'wererats', 'spiders', 'lurkers'],
        names: ['The Crypt of {Root}', "{Root}'s Barrow", 'The Tomb of the {Epithet}', 'The {Adj} Vault', 'The Catacombs under {Root}', 'The Ossuary of {Root}'],
        epithets: ['Weeping King', 'Last Abbot', 'Iron Widow', 'Nameless Knight', 'Seven Brothers', 'Pale Bishop', 'Drowned Queen', 'Hundred Dead'],
        adjs: ['Silent', 'Sealed', 'Hollow', 'Black', 'Forgotten', 'Sunken', 'Bone'],
        entrances: [
            { name: 'The stair down', text: 'Worn steps lead down from a toppled mausoleum. The air gets colder with every one.' },
            { name: 'The gatehouse of the dead', text: 'Two stone mourners flank a doorway carved with the names of the buried, most of them chiselled off.' },
            { name: 'The collapsed chapel', text: "Half the roof is on the floor. A hole behind the altar drops into the dark; someone has tied a rope to the altar rail." },
            { name: 'The bone-lined entry', text: 'Skulls set into the walls in neat rows watch the door. A few of the rows have gaps, as if some skulls left.' }
        ],
        rooms: [
            { name: 'The ossuary', text: 'Bones stacked to the ceiling by kind: skulls in one alcove, thighbones in the next, finger bones in jars.' },
            { name: 'The embalming room', text: 'Stone slabs with gutters, shelves of cracked jars, and hooks in the ceiling. It still smells of resin.' },
            { name: 'The family vault', text: 'Six coffins on shelves, each with a painted portrait on the lid. One lid is face-down on the floor.' },
            { name: 'The chapel of rest', text: 'Pews face a statue of a hooded figure holding a lamp. The lamp holds oil, and someone keeps it full.' },
            { name: 'The mourners\' hall', text: 'A long hall where the bereaved once waited. Wax from a thousand candles has built up into lumpy pillars.' },
            { name: 'The niche gallery', text: 'A corridor-room with burial niches floor to ceiling, each sealed with a plaque. A dozen are broken open.' },
            { name: 'The gravediggers\' store', text: 'Shovels, rope, lime sacks, and a battered handcart. A ledger lists burials up to a sudden last entry.' },
            { name: 'The flooded tombs', text: 'Black water stands knee-deep over sunken sarcophagi. Lids float here and there like rafts.' },
            { name: 'The hall of effigies', text: 'Stone knights lie on their tombs with swords on their chests. Every sword has been pried loose but one.' },
            { name: 'The charnel pit', text: 'A round room around a deep pit where the poor were thrown. A rusted winch hangs over it.' },
            { name: 'The priests\' cells', text: 'Four cramped cells with stone beds. Prayers are scratched into the walls, the last ones in a shaking hand.' },
            { name: 'The children\'s tombs', text: 'Small coffins and toys left as offerings. It is the only room the dust seems to have spared.' },
            { name: 'The relic room', text: 'Empty display niches, a smashed reliquary, and one bone in a glass case that nobody has taken.' },
            { name: 'The sealed gallery', text: 'A gallery bricked up long ago, then broken through from the inside.' }
        ],
        ends: [
            { name: 'The founder\'s tomb', text: 'A great sarcophagus on a dais, carved with the founder\'s face. Offerings heap around its base.' },
            { name: 'The inner sanctum', text: 'A domed chamber painted with the journey of the dead. The paint on the far wall is still wet.' },
            { name: 'The treasury of the dead', text: 'Grave goods meant to buy safe passage: coins, weapons, and jewels heaped where the dead could reach them.' },
            { name: 'The black altar', text: 'An altar of dark stone in a round room, ringed by nine empty coffins standing upright.' }
        ],
        features: ['A sarcophagus whose lid is carved with a warning in an old script.', 'Candle stubs still warm to the touch.', 'A mural of the dead walking in procession; one figure is new.', 'An iron grate over a shaft that breathes cold air.', 'Bones arranged on the floor in a spiral.', 'A bell rope that disappears into the ceiling.', 'Burial shrouds hung up to dry on a line.', 'A brass plaque listing names, the last one blank.', 'Grave dirt scattered across the floor in footprints that lead in and not out.', 'A carved stone hand rising from the floor, palm up, with coins in it.'],
        senses: ['Cold air seeps from somewhere below.', 'Dust sifts from the ceiling at every footstep.', 'It smells of old incense and older rot.', 'Something drips, slow and steady, in the dark.', 'A faint scraping sound, like a lid being moved, stops when you listen for it.', 'The torchlight seems weaker here.'],
        builders: ['the priests of a death god whose name no one prays to anymore', 'a family of minor nobles, now extinct', 'a town council during a plague year', 'an order of knights for its fallen', 'the old kings of this land', 'a necromancer who planned ahead'],
        purposes: ['as a resting place for its honored dead', 'to bury the dead of a great plague far from the living', 'as a family tomb, extended every generation', 'to hold a relic that kept the dead from rising', 'as a monastery for the priests who tended the graves'],
        fates: ['the last priest died and nobody came to replace them', 'grave robbers broke the seals, and what they woke drove them out', 'the town above burned, and the crypt was forgotten under the ashes', 'a flood filled the lower vaults and the doors were bricked up', 'the relic that kept the dead quiet was stolen'],
        containers: ['inside the great sarcophagus, under the body', 'in iron-banded grave chests at the foot of the dais', 'heaped around the bier as offerings', 'in a hidden compartment under the altar']
    },
    mine: {
        label: 'Lost mine', icon: '⛏️', entry: 'top', cols: 5, rows: 4, shape: 'cave', door: 'a timber door', habitat: 'underdark', hoard: 'den',
        bands: ['kobolds', 'duergar', 'grimlocks', 'goblins', 'vermin', 'lurkers', 'burrowers', 'elementals', 'spiders', 'orcs'],
        names: ["The {Root} Mine", "{Root}'s Folly", 'The {Adj} Seam', 'The Deepdelve of {Root}', 'The {Epithet} Workings', 'The Old {Root} Diggings'],
        epithets: ['Silver', 'Glimmer', 'Copper King', 'Moonstone', 'Iron Mother', 'Black Lode', 'Lucky Strike', 'Widowmaker'],
        adjs: ['Glimmering', 'Flooded', 'Collapsed', 'Singing', 'Bottomless', 'Cursed', 'Golden'],
        entrances: [
            { name: 'The mine mouth', text: 'A timbered adit in the hillside. The rails run inside, and a cart lies on its side across them.' },
            { name: 'The headframe', text: 'A rotting wooden headframe over a vertical shaft. The cage is down; the ladder beside it is half there.' },
            { name: 'The miners\' camp', text: 'A ring of collapsed huts around the entrance. Tools are still stacked by the doors, as if everyone meant to come back.' },
            { name: 'The cave-in breach', text: 'A landslide opened a hole into the old workings from above. Light falls in a long shaft onto rubble.' }
        ],
        rooms: [
            { name: 'The ore cart junction', text: 'Three tunnels meet at a turntable for the carts. One cart is loaded with good ore and nobody took it.' },
            { name: 'The flooded drift', text: 'Groundwater has filled the low end of the tunnel. Something moves in it, or it is the water settling.' },
            { name: 'The smelter cave', text: 'A crude furnace and slag heaps. The chimney cut through the rock still draws air, so there is a way up.' },
            { name: 'The foreman\'s office', text: 'A desk, a strongbox broken open, and a wall map of the workings with one tunnel marked in red: DO NOT OPEN.' },
            { name: 'The bunk cave', text: 'Rows of rotted cots and a cold cookfire. Someone has slept here recently.' },
            { name: 'The crystal grotto', text: 'The miners broke into a natural cave full of crystals as long as spears. They hum when struck.' },
            { name: 'The vertical shaft', text: 'A shaft drops through the middle of the cave. A ladder goes down 60 feet; a rope goes further.' },
            { name: 'The powder store', text: 'Kegs of blasting powder, most of them damp. Some of them are not.' },
            { name: 'The collapsed gallery', text: 'Half the cave is rubble. Under the rocks, a hand still holds a pick.' },
            { name: 'The underground stream', text: 'A cold, fast stream cuts across the cave. A plank bridge crosses it, and it creaks.' },
            { name: 'The fungus cave', text: 'Mushrooms as tall as a halfling, glowing faintly blue. The miners ate the small ones, judging by the notes.' },
            { name: 'The pump room', text: 'A great wooden pump wheel to keep the mine dry, broken now. That explains the water.' },
            { name: 'The shrine of the deep', text: 'Miners carved a little shrine here for luck. The offerings left at it are not miners\' offerings.' },
            { name: 'The tool store', text: 'Picks, hammers, lamps, and a cage that once held a canary.' }
        ],
        ends: [
            { name: 'The mother lode', text: 'The richest seam the miners found, a glittering vein across the whole wall. Their last tools lie where they dropped them.' },
            { name: 'The breakthrough', text: 'The tunnel ends where the miners broke into a vast, older cave that was never on any map.' },
            { name: 'The strongroom', text: 'A cave walled off with a vault door, where the mine kept its gold until the wagons came.' },
            { name: 'The deep forge', text: 'An ancient forge older than the mine, still warm, built by someone who was here first.' }
        ],
        features: ['A rusted minecart that rolls if anyone leans on it.', 'Old warning chalk marks on the wall: "BAD AIR".', 'A lantern hung on a hook, still lit.', 'Pick marks that change from human-sized to something much larger.', 'Timbers holding the ceiling, one of them cracked through.', 'A vein of quartz that glows faintly in the dark.', 'A tally of days scratched on the wall by someone trapped here.', 'A rope bridge over a narrow crevice.', 'A pile of ore sorted carefully into "good" and "cursed".', 'A dead canary in a cage.'],
        senses: ['The tunnels groan as the rock settles.', 'The air is thick, hot, and tastes of metal.', 'Water drips everywhere; the floor is slick.', 'A tapping sound comes from deeper in, like a pick, and stops when you stop.', 'Bats rustle on the ceiling.', 'A cold draft from somewhere below.'],
        builders: ['a dwarf clan that came for the silver', 'a human prospecting company with a royal charter', 'a gnome guild of engineers', 'a mad baron who swore there was gold under his land', 'slaves of a forgotten empire'],
        purposes: ['to dig out a silver seam', 'to mine iron for a war', 'to chase a vein of gems', 'to quarry a rare stone for a temple', 'to find the source of a strange crystal'],
        fates: ['the miners dug too deep and broke into something\'s home', 'a cave-in sealed the lower levels with the miners inside', 'the seam ran out and the company left overnight, owing everyone', 'the water came in and the pumps failed', 'the miners vanished one shift and the rest refused to go down'],
        containers: ['in the old company strongbox', 'in ore carts piled with more than ore', 'scattered through a nest of stolen things', 'in a sealed dwarven chest at the end of the seam']
    },
    tower: {
        label: "Wizard's tower", icon: '🗼', entry: 'bottom', cols: 2, rows: 7, shape: 'circle', stairs: true, door: 'an oak door', habitat: 'dungeon', hoard: 'wizard',
        bands: ['workshop', 'necromancer', 'cult', 'devils', 'haunt', 'shadows', 'lies', 'elementals', 'demons'],
        names: ['The Tower of {Root}', "{Root}'s Spire", 'The {Adj} Tower', 'The Tower of the {Epithet}', 'The Observatory of {Root}', 'The {Adj} Spire of {Root}'],
        epithets: ['Grey Magus', 'Star-Reader', 'Mad Alchemist', 'Glass Witch', 'Last Archmage', 'Hundred Doors', 'Sleeping Sage'],
        adjs: ['Leaning', 'Crooked', 'Shattered', 'Blue', 'Lightning-Struck', 'Floating', 'Silent'],
        entrances: [
            { name: 'The front door', text: 'A heavy door with a knocker shaped like a face. The face is asleep, and it wakes up.' },
            { name: 'The entrance hall', text: 'A round hall with a mosaic floor of the stars. The stair up begins behind a curtain.' },
            { name: 'The broken base', text: 'The bottom of the tower is cracked open. A gap in the stones is the only way in.' },
            { name: 'The porter\'s room', text: 'A cramped room with a desk and a bell. A sign says CALLERS BY APPOINTMENT ONLY.' }
        ],
        rooms: [
            { name: 'The library', text: 'Shelves curve with the wall, floor to ceiling. Some of the books are chained; some of the chains are broken.' },
            { name: 'The laboratory', text: 'Glassware, burners, and stains on every surface. Something in a jar turns to watch.' },
            { name: 'The summoning room', text: 'A circle of silver set into the floor, broken in one place.' },
            { name: 'The apprentices\' quarters', text: 'Four narrow beds and four trunks. One trunk is packed, as if someone left in a hurry.' },
            { name: 'The menagerie', text: 'Cages of every size, most empty, the bars of a few bent outward.' },
            { name: 'The dining room', text: 'A table set for a dinner that never happened, the food long since turned to dust under a stasis spell gone stale.' },
            { name: 'The scrying room', text: 'A black mirror and a bowl of still water. Both show the same room, from a different angle.' },
            { name: 'The gallery of portraits', text: 'Paintings of the wizard at every age. Their eyes follow you; one portrait is missing.' },
            { name: 'The storeroom of components', text: 'Drawers labeled in tiny handwriting: bat guano, powdered pearl, a sigh, fresh mud.' },
            { name: 'The golem workshop', text: 'A half-built clay figure on a workbench, and the tools to finish it.' },
            { name: 'The herb garden', text: 'A glass-roofed room overgrown with plants from far away, some of them hungry.' },
            { name: 'The guest room', text: 'A comfortable room with a four-poster bed. Whoever stayed last left their boots.' },
            { name: 'The map room', text: 'A table-sized map of the region, with little figures on it that move when no one is looking.' },
            { name: 'The bath', text: 'A copper tub that fills itself with hot water when anyone says the right word.' }
        ],
        ends: [
            { name: 'The observatory', text: 'The top of the tower: a domed roof that opens on the stars, and a brass telescope pointing at one of them.' },
            { name: 'The wizard\'s study', text: 'A cluttered room at the top, every surface covered in notes. The wizard\'s chair is still warm.' },
            { name: 'The vault of wonders', text: 'A locked room of shelves lined with things the wizard collected and should not have.' },
            { name: 'The lightning chamber', text: 'A copper rod runs down from the roof into a crackling coil. The air tastes of storms.' }
        ],
        features: ['A floating staircase that moves when no one is on it.', 'A talking portrait that gives bad advice.', 'Books that rearrange themselves on the shelves.', 'A window that shows a different season.', 'Chalk equations on the wall, ending mid-line.', 'A broom that keeps sweeping on its own.', 'An hourglass running upward.', 'A stuffed owl that blinks.', 'A cauldron, simmering, with no fire under it.', 'A rug that tries to trip strangers.'],
        senses: ['The tower sways a little in the wind.', 'Everything smells of ozone and old paper.', 'A clock ticks somewhere, though there are no clocks.', 'Whispers come from the walls, in a language you almost know.', 'Static makes your hair stand on end.', 'A faint music box tune plays, then stops.'],
        builders: ['an archmage who wanted to be left alone', 'a guild of wizards as a training school', 'a court mage who fell out of favor', 'a sorcerer who lifted every stone with a spell', 'two rival wizards who built it together and fought for the rest of their lives'],
        purposes: ['to study the stars', 'to keep a dangerous book safe', 'to train apprentices', 'to work on a spell that would change the world', 'to imprison something in the cellar'],
        fates: ['the wizard vanished in the middle of an experiment', 'the apprentices turned on their master', 'a spell went wrong and the top floors still hum with it', 'the wizard died, and the tower did not notice', 'the thing in the cellar got out'],
        containers: ['in a chest that opens only to a polite request', "on the wizard's workbench, among the notes", 'in a cabinet of drawers, each one locked', 'in a vault behind a bookcase']
    },
    temple: {
        label: 'Sunken temple', icon: '🛕', entry: 'top', cols: 4, rows: 4, shape: 'mixed', door: 'a bronze door', habitat: 'dungeon', hoard: 'temple',
        bands: ['cult', 'undead', 'demons', 'aberrant', 'haunt', 'lizardfolk', 'hags', 'oldworld', 'tomb', 'sahuagin'],
        names: ['The Sunken Temple of {Root}', 'The Drowned Shrine of the {Epithet}', 'The {Adj} Sanctum', 'The Temple under {Root}', 'The House of the {Epithet}', 'The {Adj} Fane of {Root}'],
        epithets: ['Coiled God', 'Green Mother', 'Moon Below', 'Forgotten Sun', 'Many-Eyed One', 'Drowned Saint', 'Hungry Tide'],
        adjs: ['Drowned', 'Mossy', 'Sunken', 'Shattered', 'Golden', 'Silent', 'Crooked'],
        entrances: [
            { name: 'The half-sunk portico', text: 'Columns lean out of the bog, holding up the edge of a roof. The doors between them are under a foot of water.' },
            { name: 'The bell tower', text: "Only the bell tower still shows above the ground. Its stair spirals down into the rest of the temple." },
            { name: 'The pilgrims\' stair', text: 'A grand stair leads down into the earth where the temple sank, its steps worn into bowls by long-ago pilgrims.' },
            { name: 'The broken dome', text: 'The dome cracked when the temple sank. Through the crack, a long drop into the dark nave below.' }
        ],
        rooms: [
            { name: 'The nave', text: 'Rows of benches sunk to their seats in silt face an altar under a fallen roof beam.' },
            { name: 'The cloister', text: 'A courtyard of arches around a garden gone to swamp. Frogs go quiet when anyone enters.' },
            { name: 'The baptistry', text: 'A round room around a deep stone pool. The water is perfectly clear, and very deep.' },
            { name: 'The scriptorium', text: 'Desks with ruined books. One book is dry, and open.' },
            { name: 'The refectory', text: 'Long tables for the faithful, and a pulpit for the reader. The plates are still set out.' },
            { name: 'The vestry', text: 'Rotting vestments on pegs and a chest of holy vessels, mostly broken.' },
            { name: 'The hall of statues', text: "Saints line the walls, their faces worn smooth. One of them still has a face, and it isn't a saint's." },
            { name: 'The penitents\' cells', text: 'Tiny cells with no beds, for those who came to suffer. Something still does.' },
            { name: 'The offering hall', text: 'Bowls carved into the floor for offerings, most of them full of black water.' },
            { name: 'The mosaic chamber', text: "A floor mosaic shows the god's story. Some of the tiles have been pried up to change the ending." },
            { name: 'The oracle\'s cave', text: 'A natural cave the temple was built around, with a crack in the floor that breathes warm vapors.' },
            { name: 'The bell chamber', text: 'A great bronze bell lies cracked on the floor. Struck, it would still be heard for miles.' },
            { name: 'The pilgrims\' hostel', text: 'Bunks and a hearth for travelers who walked here. Their walking sticks are still in a rack.' },
            { name: 'The high priest\'s rooms', text: 'A comfortable apartment, rotted now. A diary on the desk ends on the day the temple sank.' }
        ],
        ends: [
            { name: 'The holy of holies', text: 'The innermost shrine, sealed behind three doors. The idol of the god sits in the dark, dry, and waiting.' },
            { name: 'The sunken altar', text: 'The altar room sank furthest; the party wades in up to the chest. The altar stands on an island in the middle.' },
            { name: 'The god\'s mouth', text: 'A great carved face fills the far wall, its mouth a doorway into a small, very old room.' },
            { name: 'The treasury', text: "The temple's treasure room, where offerings were stored for centuries." }
        ],
        features: ['An idol with gems for eyes; one eye is missing.', 'Fresh offerings on a long-dead altar.', 'Water dripping through the ceiling onto a single spot, wearing a hole.', 'Roots breaking through the walls, thick as a man.', 'A prayer wheel that still turns.', 'Frescoes of a god with too many arms.', 'A font of holy water that has turned black.', 'Vines that close over the door behind the party.', 'Stone serpents coiled around every pillar.', 'A collection box, nailed down and full.'],
        senses: ['The air is humid and green-smelling.', 'Somewhere, water is moving where it should not.', 'A chant drifts up from far below, then stops.', 'Frogs and insects fall silent as the party passes.', 'The walls sweat.', 'Incense, faint but fresh.'],
        builders: ['the faithful of a god of the waters', 'a sun cult that ruled the land in its day', 'a monastic order of healers', 'a king who wanted to be remembered as a god', 'snake-worshippers from the south'],
        purposes: ['to honor a god nobody remembers now', 'as a place of pilgrimage for the sick', 'to keep an oracle', 'to bind a demon under its altar', 'as a fortress-monastery against the dark'],
        fates: ['the earth swallowed it in a single night, as punishment the priests said', 'the river changed course and the swamp took it', 'the faithful turned to a darker god and the land rejected them', 'a war burned the town around it, and the swamp crept in', 'the high priest made a bargain with something under the altar'],
        containers: ['in the lap of the idol', 'in the alms chests of a thousand years of pilgrims', 'in a sunken coffer under the altar water', 'in the treasury vault behind the god\'s mouth']
    },
    fort: {
        label: 'Bandit fort', icon: '🏰', entry: 'bottom', cols: 5, rows: 3, shape: 'rect', door: 'a plank door', habitat: 'hills', hoard: 'bandits', portcullis: true,
        bands: ['bandits', 'hobgoblins', 'orcs', 'goblins', 'gnolls', 'clans', 'pirates', 'brutes', 'giants-hill'],
        names: ['Fort {Root}', "{Root}'s Hold", 'The {Adj} Stockade', 'The {Epithet} Redoubt', 'Camp {Root}', 'The {Adj} Palisade'],
        epithets: ['Red Hand', 'Crow', 'Broken Oath', 'Wolf\'s Head', 'Black Feather', 'Highway', 'Hanged Man'],
        adjs: ['Old', 'Burned', 'Muddy', 'Bloody', 'Rotten', 'Hill', 'Robbers\''],
        entrances: [
            { name: 'The gate', text: 'A log gate in a palisade of sharpened stakes. Skulls on the posts say who is not welcome.' },
            { name: 'The watchtower', text: 'A rickety tower over the gate, with a bored lookout and a horn to blow.' },
            { name: 'The drawbridge', text: 'A ditch full of stakes and a drawbridge chained halfway up.' },
            { name: 'The sally port', text: 'A small back door in the wall, half hidden by brambles, that the guards use to slip out.' }
        ],
        rooms: [
            { name: 'The courtyard', text: 'A muddy yard with a well, a midden, and a hitching rail. Chickens scatter at every step.' },
            { name: 'The barracks', text: 'Bunks for twenty, dice on the blankets, and the smell of unwashed boots.' },
            { name: 'The mess hall', text: 'Trestle tables, a cauldron of stew, and a cook who would rather not be involved.' },
            { name: 'The stables', text: 'Stolen horses in stalls, each with a different owner\'s brand.' },
            { name: 'The armory', text: 'Racks of stolen weapons, a grindstone, and a pile of mismatched armor.' },
            { name: 'The stockade', text: 'A pen of logs where prisoners wait for ransom. Someone inside calls for help.' },
            { name: 'The storehouse', text: 'Sacks of grain, barrels of ale, and crates stamped with a merchant house\'s mark.' },
            { name: 'The training yard', text: 'Straw dummies stuck with arrows and a ring drawn in the dirt for sparring.' },
            { name: 'The kennels', text: 'Big dogs on short chains, who all start barking at once.' },
            { name: 'The smithy', text: 'A forge where stolen goods are melted and stolen horses reshod to hide the tracks.' },
            { name: 'The lookout platform', text: 'A platform on the wall with a view of the road and a pile of rocks to throw down.' },
            { name: 'The counting room', text: 'A table, scales, and a ledger of every robbery, neatly kept.' },
            { name: 'The infirmary', text: 'Three cots, bloody bandages, and a frightened healer pressed into service.' },
            { name: 'The shrine', text: 'A crude altar to a god of luck, covered with stolen holy symbols from every other god.' }
        ],
        ends: [
            { name: 'The boss\'s hall', text: 'A long hall with a big chair at the end of it, a fire, and the boss\'s trophies on the walls.' },
            { name: 'The keep', text: 'A stone tower at the back of the fort, older than the rest, where the leader sleeps behind a barred door.' },
            { name: 'The treasure cellar', text: 'A cellar under the hall, dug out to hide the loot from the boss\'s own crew.' },
            { name: 'The war room', text: 'A map of the roads, every caravan route marked, and the leader bent over it.' }
        ],
        features: ['A wanted poster for the leader, used as a dartboard.', 'A cage hung from a beam with someone in it.', 'Stolen church bells used as a dinner gong.', 'Barrels of lamp oil stacked against a wall.', 'A tame bear chained to a post.', 'A pile of stolen mail, some of it opened.', 'A pot of stew bubbling unattended.', 'Loot sorted into piles: sell, keep, burn.', 'A rope ladder to the walkway above.', 'A chalkboard with the watch rota, and a gap tonight.'],
        senses: ['Smoke from the cookfires hangs low.', 'Someone is singing badly.', 'Dogs bark somewhere in the fort.', 'It smells of horses, ale, and pine pitch.', 'The palisade creaks in the wind.', 'Distant laughter, and a slap of cards.'],
        builders: ['the old lord\'s soldiers, as a border post', 'loggers who needed a safe camp', 'a mercenary company between wars', 'the bandits themselves, from stolen timber', 'a frontier town that never grew'],
        purposes: ['to guard the road against raiders', 'as a toll post on the river crossing', 'to hold the border', 'as a hunting lodge for a lord', 'as a stockade during an old war'],
        fates: ['the garrison was recalled and nobody came to replace them', 'it was overrun in a raid and left to rot', 'the lord who paid for it went bankrupt', 'the road moved, and the fort was forgotten', 'its own soldiers turned bandit and kept it'],
        containers: ['in iron-bound chests under the boss\'s bed', 'in a cellar under a trapdoor', 'in sacks hanging from the rafters', "in a stolen strongbox, still with the merchant's seal"]
    },
    lair: {
        label: 'Monster lair', icon: '🐉', entry: 'top', cols: 5, rows: 4, shape: 'cave', door: 'a slab of rock', habitat: 'hills', hoard: 'den',
        bands: ['dragon', 'hunters', 'brutes', 'giants-hill', 'wolves', 'spiders', 'hags', 'weres', 'burrowers', 'sky'],
        names: ['The Lair of {Root}', "{Root}'s Den", 'The {Adj} Caves', 'The Cave of the {Epithet}', 'The {Adj} Hollow', 'The Den under {Root}'],
        epithets: ['Old Hunger', 'Bone Gnawer', 'Night Hunter', 'Sleeping Beast', 'Black Claw', 'Thousand Teeth', 'Red Jaw'],
        adjs: ['Bone', 'Black', 'Howling', 'Smoking', 'Gnawed', 'Deep', 'Stinking'],
        entrances: [
            { name: 'The cave mouth', text: 'A wide mouth in the hillside, littered with bones and scorched trees all around.' },
            { name: 'The narrow cleft', text: 'A crack in the rock just wide enough to squeeze through, smoothed by something big going in and out.' },
            { name: 'The waterfall cave', text: 'A cave behind a waterfall. Everyone gets soaked on the way in.' },
            { name: 'The sinkhole', text: 'A sinkhole in a field drops 20 feet into a cave. Claw marks run down its walls.' }
        ],
        rooms: [
            { name: 'The bone pile', text: 'A cave heaped with the bones of everything the beast has eaten. Some of them still wear boots.' },
            { name: 'The nest of young', text: 'A hollow lined with fur and feathers where something\'s young sleep, and wake.' },
            { name: 'The underground lake', text: 'A cold, black lake fills most of the cave. A narrow ledge runs around the edge.' },
            { name: 'The scorched cave', text: 'The walls are melted smooth and blackened by fire. It is still warm.' },
            { name: 'The larder', text: 'Carcasses hung on stalactites, saved for later. One of them moves; it is still alive.' },
            { name: 'The gallery of claw marks', text: 'Long, deep gouges cover the walls, made by something sharpening its claws for years.' },
            { name: 'The fungus forest', text: 'Giant mushrooms sprout from the dung of the beast. Their spores make the air glitter.' },
            { name: 'The chasm', text: 'A crack splits the cave floor, too wide to step over. Something has worn a jumping path across it.' },
            { name: 'The trophy cave', text: 'Broken weapons and dented shields from every hero who came before.' },
            { name: 'The wallow', text: 'A pool of warm mud where the beast rolls. It is not empty.' },
            { name: 'The stalactite hall', text: 'A huge cave of hanging stone. Some of the stalactites are loose.' },
            { name: 'The old camp', text: 'Bedrolls and a cold fire where adventurers camped. It went badly for them.' },
            { name: 'The crystal pool', text: 'A pool of water so clear it seems empty, with gems glittering on the bottom.' },
            { name: 'The windy tunnel', text: 'A tunnel where the wind howls from somewhere outside, covering any sound.' }
        ],
        ends: [
            { name: 'The beast\'s bed', text: 'The great cave at the heart of the lair, where the master of the place sleeps on what it has taken.' },
            { name: 'The throne of bones', text: 'A cave where a seat has been built out of the bones of a hundred meals.' },
            { name: 'The hoard cave', text: 'Treasure piled in drifts, glittering in whatever light the party brought.' },
            { name: 'The high roost', text: 'A cave open to the sky at the top of the hill, where the master sees everything that comes.' }
        ],
        features: ['Huge tracks in the mud, fresh.', 'Shed scales or fur in heaps.', 'A half-eaten cow.', "A dead adventurer's journal, the last page torn.", 'A crude warning sign in Common: GO BAK.', 'Smoke stains on the ceiling in a long streak.', 'A nest of eggs, some cracked.', 'Gold coins trodden into the floor.', 'Old spears snapped and thrown in a pile.', 'Claw marks around a crack too narrow for the beast, as if it tried very hard.'],
        senses: ['It reeks of musk and rotting meat.', 'Deep breathing echoes from further in.', 'The floor is warm.', 'Bones crunch under every step.', 'Water trickles down the walls.', 'A low rumble, like snoring, shakes dust from the ceiling.'],
        builders: ['nature, over ten thousand years', 'a river that dried up long ago', 'dwarves, who dug it as a mine and fled', 'giants who carved it as a home', 'the beast itself, digging for years'],
        purposes: ['as a home for whatever lives in it', 'as a shelter for the hill tribes in winter', 'as a smugglers\' cave', 'as a hermit\'s retreat', 'as a shrine to the spirits of the hill'],
        fates: ['the beast moved in and the others moved out or got eaten', 'it was abandoned when the beast first came', 'the last hero to go in never came out', 'the beast was driven off once, and came back', 'nothing happened to it; it has always been a lair'],
        containers: ['heaped under the beast where it sleeps', 'scattered among the bones', 'buried under the floor in a crude cache', "in a dead adventurer's pack, along with their stuff"]
    },
    keep: {
        label: 'Ruined keep', icon: '🏚️', entry: 'bottom', cols: 4, rows: 4, shape: 'rect', door: 'an iron-bound door', habitat: 'dungeon', hoard: 'manor', portcullis: true,
        bands: ['undead', 'haunt', 'goblins', 'bandits', 'vampire', 'brutes', 'cult', 'hobgoblins', 'wererats'],
        names: ['Castle {Root}', 'The Ruins of {Root}', '{Root} Keep', 'The {Adj} Keep', 'The Hall of the {Epithet}', 'The {Adj} Tower of {Root}'],
        epithets: ['Mad Baron', 'Black Knight', 'Lost Heir', 'Burned Queen', 'Broken Banner', 'Last Lord', 'Twin Brothers'],
        adjs: ['Shattered', 'Fallen', 'Burned', 'Grey', 'Crooked', 'Lonely', 'Haunted'],
        entrances: [
            { name: 'The gatehouse', text: 'A gatehouse with its portcullis rusted half open. Ivy covers the murder holes above.' },
            { name: 'The breach', text: 'A gap in the curtain wall where a siege engine broke through, long ago.' },
            { name: 'The postern', text: 'A little side gate, overgrown and half buried, still with its door.' },
            { name: 'The bailey', text: 'A grassy yard inside the broken walls, with a dead tree and the keep looming over it.' }
        ],
        rooms: [
            { name: 'The great hall', text: 'A long hall with a hammerbeam roof, half fallen. Banners hang in rags from the beams.' },
            { name: 'The kitchens', text: 'Huge hearths and copper pots, and a spit big enough for an ox.' },
            { name: 'The chapel', text: 'A small chapel with stained glass, mostly broken; the light falls in colored pieces on the floor.' },
            { name: 'The solar', text: "The lord's private sitting room, with a window seat and a view of the ruin." },
            { name: 'The dungeon cells', text: 'A row of cells with iron doors. Chains on the walls, and scratches counting days.' },
            { name: 'The armory', text: 'Empty racks, a few rusted blades, and a suit of armor that stands a little too straight.' },
            { name: 'The guardroom', text: 'Benches, a table, and a game of dice abandoned mid-throw a hundred years ago.' },
            { name: 'The wine cellar', text: 'Racks of dusty bottles, most broken. Some still hold something.' },
            { name: 'The well room', text: 'The castle well, deep and cold, with a bucket on a chain.' },
            { name: 'The lady\'s chamber', text: 'A bedroom with a canopy bed and a vanity. The mirror is covered with a sheet.' },
            { name: 'The barracks', text: 'Rows of rotted bunks for the garrison, and their kit hung on pegs.' },
            { name: 'The library', text: 'A small library of family histories and accounts, the latest pages torn out.' },
            { name: 'The portrait gallery', text: "The family's portraits in a row. Someone has cut out one face from every painting." },
            { name: 'The battlements', text: 'A walk along the top of the wall, broken in places, with a long fall to the moat.' }
        ],
        ends: [
            { name: 'The lord\'s bedchamber', text: 'At the top of the keep, the lord\'s chamber, its door barred from the inside.' },
            { name: 'The throne room', text: 'A dais and a high-backed throne. Something sits on it.' },
            { name: 'The strongroom', text: "A vault cut into the keep's foundations, where the family kept its fortune." },
            { name: 'The family crypt', text: "Under the chapel: the family's tombs, all of them open." }
        ],
        features: ['A suit of armor that turns its head.', 'A coat of arms smashed off the wall.', 'A table still set for a feast.', 'Ivy growing through the windows in great green ropes.', 'A spiral stair with missing steps.', 'A family tree painted on the wall, with one branch burned off.', 'A fireplace big enough to stand in, with a passage behind it.', 'A tapestry of a battle, moth-eaten into a different battle.', 'A tower clock stopped at the same hour as every other clock here.', 'Crows nesting in the rafters.'],
        senses: ['The wind moans through broken windows.', 'Floorboards creak as if someone else is walking.', 'It smells of damp stone and mildew.', 'A door slams somewhere in the keep.', 'Distant music, like a feast, from an empty room.', 'Rain drips through the broken roof.'],
        builders: ['a baron who held the valley for the crown', 'a knightly order on the frontier', 'a robber-lord who made himself respectable', 'an old royal house in its glory days', 'a warlord who took the land by force'],
        purposes: ['to hold the pass', 'as the seat of a noble house', 'to guard the river crossing', 'as a royal hunting lodge', 'as a prison for the realm\'s worst enemies'],
        fates: ['it fell in a siege and was never rebuilt', 'the family died out, one strange death at a time', 'a curse fell on the lord and spread to the house', 'the heir gambled it away, and the new owners never came', 'it burned on the night of a great feast'],
        containers: ['in the strongroom chests', 'in a hidden compartment behind a portrait', 'in an iron chest under the throne', 'in the family tombs, with the family']
    }
};
const SITE_KIND_KEYS = Object.keys(SITE_KINDS);

// One feature every room can have, besides its own kind's.
const SITE_FEATURES = ['A table covered in old maps, all of the same place.', 'A chest that is empty except for a note: "Too late."', 'A well-made trap, already sprung, with nothing in it.', 'Old graffiti: a crude map, a joke, and a warning.', 'A skeleton sitting against the wall, holding a lantern.', 'A pile of rubble hiding a crawlspace.', 'A cracked mirror that shows the room as it was long ago.', 'A fresh bootprint in the dust, too small for a human.', 'A rope hanging from a hole in the ceiling.', "A circle of salt on the floor, broken in one place.", 'A rack of torches, two of them lit.', 'A message in chalk: "Second door. Not the first."', 'A dead adventurer with an empty pack and a full waterskin.', 'A statue whose pointing hand has been moved.', 'A heap of old campaign gear: a bedroll, a dented pot, a lute with two strings.', 'A stone with a hollow under it, as if for hiding things.'];
const SITE_SENSES = ['Utter silence, as if the room is holding its breath.', 'A cold spot in the middle of the room.', 'A faint smell of smoke, from somewhere.', 'Your footsteps echo too long.', 'Something small scurries away out of the light.'];

// What the foes in a room are doing when the party arrives. by: who acts like this
// (folk: those who think and talk; beast: animals and monsters; mindless: undead,
// constructs, oozes, elementals). seen: who notices whom (SITE_AWARE).
const SITE_DOING = {
    folk: [['ready', 'waiting for the party: they heard them coming'], ['unaware', 'eating, and arguing over who gets the last of it'], ['unaware', 'asleep, apart from one on watch who is nodding off'], ['ambush', 'hiding behind the door, weapons ready'], ['unaware', 'counting loot and accusing each other of cheating'], ['unaware', 'patching up their wounds from some earlier fight'], ['ready', 'building a barricade across the far door'], ['unaware', 'gambling with knucklebones'], ['ready', 'on patrol, and walking straight into the party'], ['unaware', 'interrogating a prisoner'], ['ambush', 'perched up high, waiting to drop on whoever comes in']],
    beast: [['unaware', 'feeding on a kill'], ['unaware', 'asleep in a heap'], ['ambush', 'hiding in the shadows near the ceiling'], ['ready', 'pacing, hungry, and already sniffing the air'], ['unaware', 'guarding a nest'], ['ambush', 'lying perfectly still, half buried in the debris'], ['ready', 'circling, ears up: they heard the party']],
    mindless: [['ready', 'standing in rows, waiting for an order that never came'], ['ambush', 'lying still among the debris until someone comes close'], ['ready', 'shuffling in circles, and they turn as one when the party enters'], ['unaware', 'going through the motions of a task they were made for'], ['ambush', 'hidden in alcoves along the walls']]
};
const SITE_MINDS = { humanoid: 'folk', giant: 'folk', fiend: 'folk', dragon: 'folk', fey: 'folk', celestial: 'folk', undead: 'mindless', construct: 'mindless', ooze: 'mindless', elemental: 'mindless' };
const SITE_AWARE = {
    ready: "They're ready: no one is surprised.",
    unaware: "They haven't noticed the party. Sneak in with Stealth against their passive Perception, and anyone who isn't noticed gets the jump on them.",
    ambush: "They're hidden. Roll their Stealth against each character's passive Perception: anyone who doesn't notice them is surprised in the first round."
};

// Room traps. trigger: what sets it off. effect: {dc} {dmg} filled by the site's level.
// kinds: only in these kinds (absent = anywhere). disarm: how to stop it ({dc}).
const SITE_TRAPS = [
    { name: 'Hidden pit', trigger: 'A false floor in the middle of the room hides a 20-foot pit.', disarm: 'wedge the lid shut with iron spikes (no check)', effect: 'DC {dc} Dexterity saving throw or fall in and take {dmg} bludgeoning damage.' },
    { name: 'Poison darts', trigger: 'Pressure plates in the floor fire darts from holes in the walls.', disarm: "DC {dc} Dexterity check with thieves' tools, or stuff the holes with cloth", effect: 'DC {dc} Dexterity saving throw or take {dmg} poison damage; half damage on a success.' },
    { name: 'Scything blade', trigger: 'A tripwire across the doorway swings a blade out of the wall.', disarm: "DC {dc} Dexterity check with thieves' tools to cut the wire safely", effect: 'DC {dc} Dexterity saving throw or take {dmg} slashing damage; half damage on a success.' },
    { name: 'Collapsing ceiling', trigger: 'Rotten supports hold up the ceiling; a tripwire pulls them out.', disarm: "DC {dc} Dexterity check with thieves' tools on the wire", effect: 'Everyone in the room makes a DC {dc} Dexterity saving throw or takes {dmg} bludgeoning damage; half damage on a success. The rubble is difficult terrain afterwards.' },
    { name: 'Gas vent', trigger: 'A cracked seal on the floor releases a cloud of yellow gas when stepped on.', disarm: 'plug the vent with wax or mud (no check, once found)', effect: 'Everyone within 10 feet makes a DC {dc} Constitution saving throw or takes {dmg} poison damage and is poisoned for 1 minute; half damage and not poisoned on a success.' },
    { name: 'Spear floor', trigger: 'A loose flagstone drops an inch, and spears jab up through holes in the floor.', disarm: "DC {dc} Dexterity check with thieves' tools to jam the mechanism", effect: 'DC {dc} Dexterity saving throw or take {dmg} piercing damage; half damage on a success.' },
    { name: 'Falling net', trigger: 'A tripwire drops a weighted net from the ceiling.', disarm: "DC {dc} Dexterity check with thieves' tools to cut the wire", effect: 'Everyone in a 10-foot square makes a DC {dc} Dexterity saving throw or is restrained. A DC 10 Strength check (or cutting the net: AC 10, 20 hit points) frees a creature. Anything in the room hears it fall.' },
    { name: 'Alarm', trigger: 'A thin wire across the floor rings a bell somewhere deeper in.', disarm: "DC {dc} Dexterity check with thieves' tools, or step over it once it's found", effect: 'Every fight in the next two rooms is ready and waiting: no one there is surprised.' },
    { name: 'Rolling stone', trigger: 'A pressure plate releases a stone ball down a sloping passage into the room.', kinds: ['crypt', 'temple', 'mine', 'lair', 'keep'], disarm: 'wedge an iron spike under the plate (DC {dc} Dexterity check with thieves\' tools)', effect: 'Everyone in its path makes a DC {dc} Dexterity saving throw or takes {dmg} bludgeoning damage and is knocked prone.' },
    { name: 'Fire glyph', trigger: 'A glyph carved on the threshold bursts into flame when crossed.', kinds: ['crypt', 'tower', 'temple', 'keep'], disarm: 'DC {dc} Intelligence (Arcana) check to smudge it out safely, or dispel magic', effect: 'Everyone within 10 feet makes a DC {dc} Dexterity saving throw or takes {dmg} fire damage; half damage on a success.' },
    { name: 'Lightning rune', trigger: 'A rune on the door handle discharges into whoever grabs it.', kinds: ['tower', 'temple'], disarm: 'DC {dc} Intelligence (Arcana) check, or open it with something that does not conduct', effect: 'DC {dc} Dexterity saving throw or take {dmg} lightning damage; half damage on a success.' },
    { name: 'Whispering face', trigger: 'A carved face on the wall speaks a word that bites into the mind of whoever looks at it.', kinds: ['crypt', 'tower', 'temple'], disarm: 'cover the face with cloth (no check, once found)', effect: 'DC {dc} Wisdom saving throw or take {dmg} psychic damage and be frightened of the face until the end of the next turn.' },
    { name: 'Flooding room', trigger: 'The door slams shut behind the party and water pours in from vents.', kinds: ['crypt', 'temple', 'mine'], disarm: "DC {dc} Dexterity check with thieves' tools on the door mechanism", effect: 'The room fills in 4 rounds, and then everyone must hold their breath. Forcing the door takes a DC {dc} Strength (Athletics) check.' },
    { name: 'Rotten planks', trigger: 'Planks laid over an old shaft give way under the first one across.', kinds: ['mine', 'lair', 'keep', 'fort'], disarm: 'test the floor with a pole (no check, once found)', effect: 'DC {dc} Dexterity saving throw to grab the edge, or fall 30 feet and take {dmg} bludgeoning damage.' },
    { name: 'Dropping portcullis', trigger: 'A portcullis crashes down behind the first one through, splitting the party.', kinds: ['fort', 'keep'], disarm: "DC {dc} Dexterity check with thieves' tools to jam the winch", effect: 'DC {dc} Dexterity saving throw or take {dmg} piercing damage as it slams down. Lifting it again takes a DC 20 Strength check.' },
    { name: 'Boiling oil', trigger: 'Murder holes over the doorway pour hot oil on whoever is under them.', kinds: ['fort', 'keep'], disarm: 'stand clear of the doorway (no check, once found)', effect: 'DC {dc} Dexterity saving throw or take {dmg} fire damage; half damage on a success.' },
    { name: 'Bad air', trigger: 'A pocket of foul air sits low in the room. Lit flames gutter in it.', kinds: ['mine', 'lair'], disarm: 'fan it out, or hold your breath across (no check, once found)', effect: 'Everyone who breathes it makes a DC {dc} Constitution saving throw or gains a level of exhaustion.' }
];
const SITE_TRAP_SEVERITY = [['setback', 50, [10, 11]], ['dangerous', 40, [12, 15]], ['deadly', 10, [16, 20]]];
const SITE_TRAP_DAMAGE = {
    '0-4': { setback: '1d10', dangerous: '2d10', deadly: '4d10' },
    '5-10': { setback: '2d10', dangerous: '4d10', deadly: '10d10' },
    '11-16': { setback: '4d10', dangerous: '10d10', deadly: '18d10' },
    '17+': { setback: '10d10', dangerous: '18d10', deadly: '24d10' }
};
// Doors: [lock DC, find-a-secret-door DC] by tier.
const SITE_DOOR_DCS = { '0-4': [12, 13], '5-10': [15, 15], '11-16': [18, 17], '17+': [22, 20] };
// Who holds the place, mid-sentence ("held by ..."), for every group a kind can have.
const SITE_HOLDERS = {
    undead: 'the walking dead', haunt: 'restless spirits', necromancer: 'a necromancer and their servants', vampire: "a vampire's brood",
    cult: 'a cult', tomb: 'its old guardians', wererats: 'a wererat gang', spiders: 'giant spiders', lurkers: 'things that ooze and lurk',
    kobolds: 'kobolds', duergar: 'duergar prospectors', grimlocks: 'grimlocks and worse', goblins: 'goblins', vermin: 'giant vermin',
    burrowers: 'a burrowing terror', elementals: 'creatures from an elemental rift', orcs: 'an orc war band', workshop: "the wizard's guardians",
    devils: 'devils', shadows: 'spies and assassins', lies: "something that isn't what it seems", demons: 'demons', aberrant: 'things from beyond',
    lizardfolk: 'lizardfolk', hags: 'a hag and her servants', oldworld: 'ancient guardians', sahuagin: 'sahuagin raiders', bandits: 'a bandit gang',
    hobgoblins: 'a hobgoblin warband', gnolls: 'a gnoll pack', clans: 'clan warriors', pirates: 'a pirate crew', dragon: 'a dragon and its servants',
    hunters: 'a great predator', brutes: 'trolls and brutes', 'giants-hill': 'hill giants and ogres', wolves: 'a wolf pack', weres: 'the moon-cursed',
    sky: 'sky hunters', watch: 'soldiers who went bad', nobles: "a noble's retinue", pits: 'pit fighters', druids: 'a druid circle',
    drow: 'a drow patrol', deep: 'beasts of the deep', fey: 'fey wardens', 'giants-frost': 'frost giants', 'giants-fire': 'fire giants',
    'giants-high': 'giant lords', celestial: "heaven's wardens", dinos: 'beasts from a lost valley'
};
const SITE_AGO = [60, 120, 200, 300, 450, 600, 800, 1000, 1400];

// ── Helpers ───────────────────────────────────────────────
function sitePick(list) {
    return list[Math.floor(rand() * list.length)];
}

function siteWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function siteShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function siteCap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function siteTier(level) {
    return level <= 4 ? '0-4' : level <= 10 ? '5-10' : level <= 16 ? '11-16' : '17+';
}

function siteClamp(v, lo, hi, dflt) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

// ── The map ───────────────────────────────────────────────
// n rooms on a grid, each next to the room it grew from. Returns
// { cells: [{ x, y, w, h }], edges: [{ a, b, loop }] } with room 0 the way in and the
// deepest room last; the rest are numbered in the order you'd reach them.
function siteLayout(K, n) {
    const down = K.entry === 'top' ? 1 : -1;
    const placed = [{ x: 0, y: 0 }];
    const taken = new Set(['0,0']);
    const edges = [];
    const dirs = [[1, 0], [-1, 0], [0, down], [0, -down]];
    const fits = (x, y) => {
        if (y * down < 0) return false;
        const xs = placed.map(c => c.x).concat(x), ys = placed.map(c => c.y).concat(y);
        return Math.max(...xs) - Math.min(...xs) < K.cols && Math.max(...ys) - Math.min(...ys) < K.rows;
    };
    for (let i = 1; i < n; i++) {
        const opts = [];
        placed.forEach((c, p) => dirs.forEach(([dx, dy]) => {
            const x = c.x + dx, y = c.y + dy;
            if (taken.has(`${x},${y}`) || !fits(x, y)) return;
            const deg = edges.filter(e => e.a === p || e.b === p).length;
            // Grow away from the way in, and branch rather than run in one line.
            opts.push([[p, x, y], (dy === down ? 3 : 2) + (deg < 2 ? 2 : 0) + (K.stairs && dy ? 2 : 0)]);
        }));
        if (!opts.length) break;
        const [p, x, y] = siteWeighted(opts);
        placed.push({ x, y });
        taken.add(`${x},${y}`);
        edges.push({ a: p, b: placed.length - 1, loop: false });
    }
    // A loop or two in bigger places, so there's more than one way round.
    if (placed.length >= 7) {
        const pairs = [];
        placed.forEach((c, a) => placed.forEach((d, b) => {
            if (b <= a || Math.abs(c.x - d.x) + Math.abs(c.y - d.y) !== 1) return;
            if (!edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) pairs.push([a, b]);
        }));
        const loops = siteShuffle(pairs).slice(0, placed.length >= 10 ? 2 : 1);
        loops.forEach(([a, b]) => { if (rand() < 0.6) edges.push({ a, b, loop: true }); });
    }
    // Number the rooms: the way in first, the deepest room last, the rest as you'd reach them.
    const adj = placed.map((_, i) => edges.filter(e => e.a === i || e.b === i).map(e => (e.a === i ? e.b : e.a)).sort((a, b) => a - b));
    const depth = placed.map(() => -1);
    const order = [0];
    depth[0] = 0;
    for (let q = 0; q < order.length; q++) adj[order[q]].forEach(j => { if (depth[j] < 0) { depth[j] = depth[order[q]] + 1; order.push(j); } });
    const deepest = order.reduce((best, j) => (depth[j] >= depth[best] ? j : best), 0);
    const final = order.filter(j => j !== deepest).concat(deepest);
    const num = {};
    final.forEach((j, k) => { num[j] = k; });
    const cells = final.map(j => ({ x: placed[j].x, y: placed[j].y, w: 0, h: 0 }));
    cells.forEach(c => {
        c.w = 56 + Math.floor(rand() * 30);
        c.h = 46 + Math.floor(rand() * 22);
    });
    const minX = Math.min(...cells.map(c => c.x)), minY = Math.min(...cells.map(c => c.y));
    cells.forEach(c => { c.x -= minX; c.y -= minY; });
    return { cells, edges: edges.map(e => ({ a: num[e.a], b: num[e.b], loop: e.loop })), depth: final.map(j => depth[j]) };
}

// ── Contents ──────────────────────────────────────────────
function siteTrap(K, tier) {
    const pool = SITE_TRAPS.filter(t => !t.kinds || t.kinds.includes(K));
    const t = sitePick(pool);
    const [sev, , dcs] = siteWeighted(SITE_TRAP_SEVERITY.map(s => [s, s[1]]));
    const dc = dcs[0] + Math.floor(rand() * (dcs[1] - dcs[0] + 1));
    const fill = s => s.replace(/\{dc\}/g, dc).replace(/\{dmg\}/g, SITE_TRAP_DAMAGE[tier][sev]);
    return { name: t.name, severity: sev, dc, trigger: t.trigger, disarm: fill(t.disarm), effect: fill(t.effect) };
}

// Who holds the place at this level: a group of the kind's that can field a High fight
// for the boss (tried in a random order), else a group from the site's habitat that can,
// else whichever came closest. Null = no group (a mix of the habitat's monsters).
function siteChooseBand(K, budget) {
    const xpOf = opts => encounterXp(rollThemedEncounter(budget, 'high', opts).list);
    const tries = siteShuffle(K.bands).map(k => [k, xpOf({ band: k })]);
    const good = tries.find(([, xp]) => xp > budget.moderate);
    if (good) return good[0];
    for (let t = 0; t < 4; t++) {
        const r = rollThemedEncounter(budget, 'high', { habitat: K.habitat });
        if (r.band && encounterXp(r.list) > budget.moderate) return r.band;
    }
    const best = tries.reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0]);
    return best[0];
}

// A fight: { list: [{ id, count }], band, diff, doing, seen, seed }, or null.
function siteFight(K, band, budget, diff, seed) {
    let r = band ? rollThemedEncounter(budget, diff, { band }) : { list: [], band: null };
    // The boss gets a few tries at a fight that rates as High.
    for (let t = 0; diff === 'high' && band && t < 3 && encounterXp(r.list) <= budget.moderate; t++) {
        const again = rollThemedEncounter(budget, diff, { band });
        if (encounterXp(again.list) > encounterXp(r.list)) r = again;
    }
    if (!r.list.length) r = rollThemedEncounter(budget, diff, { habitat: K.habitat, band: 'none' });
    if (!r.list.length) return null;
    const lead = r.list.reduce((a, b) => (b.m.xp > a.m.xp ? b : a)).m;
    const mind = SITE_MINDS[lead.type] || 'beast';
    const [seen, doing] = sitePick(SITE_DOING[mind]);
    return { list: r.list.map(e => ({ id: e.m.id, count: e.count })), band: r.band, diff, doing, seen, seed };
}

// The fight as the encounter engine's [{ m, count }].
function siteFightList(f) {
    return f.list.map(e => ({ m: MONSTER_BY_ID[e.id], count: e.count })).filter(e => e.m);
}

// ── The roll ──────────────────────────────────────────────
// opts: { kind, size: 'random'|small|medium|large, level 1-20, party 1-8 }
// A site's name, from its seed and kind (the Continent tab names its places with this).
function siteNameFor(seed, kind) {
    const K = SITE_KINDS[kind];
    return withSeed(deriveSeed(seed, 'name.' + kind), () => {
        const root = hisRoot(new Set());
        return sitePick(K.names).replace('{Root}', root).replace('{Epithet}', sitePick(K.epithets)).replace('{Adj}', sitePick(K.adjs));
    });
}

function rollSite(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const drawn = part('options', () => ({ kind: sitePick(SITE_KIND_KEYS), size: siteWeighted([['medium', 5], ['small', 3], ['large', 3]]) }));
    const kind = SITE_KINDS[opts.kind] ? opts.kind : drawn.kind;
    const size = SITE_SIZES[opts.size] ? opts.size : drawn.size;
    const level = siteClamp(opts.level, 1, 20, 3);
    const party = siteClamp(opts.party, 1, 8, 4);
    const K = SITE_KINDS[kind], Z = SITE_SIZES[size];
    const tier = siteTier(level);
    const budget = partyBudget([{ count: party, level }]);

    const n = part('count.' + size, () => Z.min + Math.floor(rand() * (Z.max - Z.min + 1)));
    const name = siteNameFor(seed, kind);
    const map = part(`layout.${kind}.${n}`, () => siteLayout(K, n));
    const count = map.cells.length;

    // What each room is: the way in, the rooms between (no repeats), and the end.
    const types = part('rooms.' + kind, () => ({ entry: sitePick(K.entrances), middle: siteShuffle(K.rooms), end: sitePick(K.ends) }));
    const features = part('features.' + kind, () => {
        const own = siteShuffle(K.features), any = siteShuffle(SITE_FEATURES), out = [];
        for (let i = 0; i < 12; i++) out.push(own.length && (rand() < 0.6 || !any.length) ? own.shift() : any.shift());
        return out;
    });
    const senses = part('senses.' + kind, () => {
        const pool = siteShuffle(K.senses.concat(SITE_SENSES));
        return Array.from({ length: 12 }, () => (rand() < 0.45 ? pool.shift() : null));
    });

    // Who holds it (a group that fits the level), and what wanders in.
    const band = part(`band.${kind}.${level}.${party}`, () => siteChooseBand(K, budget));

    const rooms = [];
    for (let i = 0; i < count; i++) {
        const last = i === count - 1;
        const type = i === 0 ? types.entry : last ? types.end : types.middle[(i - 1) % types.middle.length];
        // Which rooms hold a fight or a trap doesn't change with the level.
        const plan = part(`plan.${i}.${kind}`, () => {
            const fight = last || rand() < (i === 0 ? 0.3 : 0.5);
            const diff = last ? 'high' : i === 0 ? 'low' : rand() < 0.3 ? 'moderate' : 'low';
            const trap = rand() < (i === 0 ? 0.15 : last ? 0.2 : fight ? 0.15 : 0.35);
            return { fight, diff, trap };
        });
        const fightSeed = deriveSeed(seed, `fight.${i}`);
        const fight = plan.fight ? part(`fight.${i}.${kind}.${level}.${party}`, () => siteFight(K, band, budget, plan.diff, fightSeed)) : null;
        const trap = plan.trap ? part(`trap.${i}.${kind}.${level}`, () => siteTrap(kind, tier)) : null;
        rooms.push({ n: i + 1, name: type.name, text: type.text, feature: features[i % features.length], sense: senses[i % senses.length], fight, trap });
    }

    // Doors between rooms.
    const doors = part(`doors.${kind}.${n}`, () => map.edges.map(e => {
        const A = map.cells[e.a], B = map.cells[e.b];
        if (K.stairs && A.y !== B.y) return 'stairs';
        const toEnd = e.b === count - 1 || e.a === count - 1;
        const pairs = e.loop ? [['secret', 4], ['door', 3], ['open', 2]]
            : toEnd ? [['locked', 4], ['door', 3], ['stuck', 1], ['secret', 1]].concat(K.portcullis ? [['portcullis', 2]] : [])
            : [['open', 4], ['door', 4], ['locked', 1], ['stuck', 1]].concat(K.portcullis ? [['portcullis', 1]] : []);
        return siteWeighted(pairs);
    }));

    // The hoard in the last room, and the boss of the place.
    const lastFight = rooms[count - 1].fight;
    const hoard = part('hoard.' + kind, () => ({ container: sitePick(K.containers) }));
    hoard.source = { dragon: 'dragon', bandits: 'bandits', pirates: 'smugglers', cult: 'cult', necromancer: 'wizard', workshop: 'wizard', tomb: 'tomb', 'giants-hill': 'giant', hags: 'den', shadows: 'guild', wererats: 'guild' }[band] || K.hoard;
    hoard.seed = deriveSeed(seed, 'hoard');
    hoard.tier = tier;
    const boss = lastFight ? rollEncounterScene(siteFightList(lastFight), lastFight.seed, { band: lastFight.band, habitat: K.habitat, level }) : null;

    const wander = part(`wander.${kind}.${level}.${party}`, () => {
        const r = rollThemedEncounter(budget, 'low', { habitat: K.habitat, band: 'none' });
        return r.list.length ? { list: r.list.map(e => ({ id: e.m.id, count: e.count })), band: null, diff: 'low', seed: deriveSeed(seed, 'wander') } : null;
    });

    const story = part('story.' + kind, () => ({
        builder: sitePick(K.builders), purpose: sitePick(K.purposes), fate: sitePick(K.fates),
        ago: sitePick(SITE_AGO) + Math.floor(rand() * 4) * 10, age: rand()
    }));

    return { seed, kind, size, level, party, tier, name, map, rooms, doors, band, hoard, boss, wander, story, budget };
}

// ── Text ──────────────────────────────────────────────────
function siteBandLabel(s) {
    const b = ENC_BAND_BY_KEY[s.band];
    return b ? `${b.icon} ${b.label}` : '🎲 Whatever moved in';
}

function siteHolder(s) {
    return SITE_HOLDERS[s.band] || 'whatever moved in';
}

function siteSummary(s) {
    const K = SITE_KINDS[s.kind];
    return `${siteCap(K.label.toLowerCase())} of ${s.rooms.length} rooms, held by ${siteHolder(s)}, for ${s.party} character${s.party === 1 ? '' : 's'} of level ${s.level}.`;
}

// The age a site was built in, on a linked history: the one asked for (hage), else one of
// the earlier ages, picked by the site's own seed so it stays put.
function siteHistoryAge(s, h, hage) {
    if (!h || !h.list.length) return null;
    const n = h.list.length;
    if (hage >= 0 && hage < n) return hage;
    return Math.floor(s.story.age * Math.max(1, n - 1));
}

// [label, text] pairs: who built it, what for, how it was lost, and who's there now.
// ctx: { history: rollHistory() or null, hage: age index or -1 }
function siteStoryLines(s, ctx = {}) {
    const st = s.story, h = ctx.history;
    const ai = siteHistoryAge(s, h, ctx.hage);
    const lines = [];
    if (ai !== null) {
        const age = h.list[ai], next = h.list[ai + 1];
        const by = age.realmAfter ? age.realmAfter : `the people of ${age.figure.name}, ${age.figure.role}`;
        lines.push(['Built', `By ${by}, in ${age.name} (${hisWhen(age)}), ${st.purpose}.`]);
        lines.push(['Lost', next ? `In ${next.name}: ${st.fate}.` : `Within living memory: ${st.fate}.`]);
    } else {
        lines.push(['Built', `By ${st.builder}, about ${st.ago.toLocaleString('en-US')} years ago, ${st.purpose}.`]);
        lines.push(['Lost', siteCap(st.fate) + '.']);
    }
    lines.push(['Now', `Held by ${siteHolder(s)}${s.boss && s.boss.leader && s.boss.leader.name ? `, led by ${s.boss.leader.name}` : ''}.`]);
    return lines;
}

function siteMonsterText(f) {
    return siteFightList(f).map(e => `${e.count} × ${e.m.name} (CR ${e.m.cr})`).join(', ');
}

function siteFightRating(s, f) {
    const xp = encounterXp(siteFightList(f));
    const r = rateEncounter(xp, s.budget);
    return `${xp.toLocaleString('en-US')} XP${r ? `, ${ENCOUNTER_LEVELS[r].label.toLowerCase()}` : ''}`;
}

const SITE_DIRS = { '1,0': 'east', '-1,0': 'west', '0,1': 'south', '0,-1': 'north' };

function siteDoorText(s, kind) {
    const K = SITE_KINDS[s.kind];
    const [lock, find] = SITE_DOOR_DCS[s.tier];
    return {
        open: 'an open archway',
        door: K.door,
        locked: `${K.door}, locked (DC ${lock} Dexterity check with thieves' tools, or DC ${lock + 5} Strength to force it)`,
        stuck: `${K.door}, swollen shut (DC ${lock - 2} Strength (Athletics) to shove it open)`,
        secret: `a secret door (DC ${find} Wisdom (Perception) to find it)`,
        portcullis: `a portcullis (the winch is on the far side; DC ${lock + 5} Strength to lift it)`,
        stairs: 'a stair'
    }[kind];
}

// The ways out of room i: "north to 3 through a stone door".
function siteExits(s, i) {
    const out = [];
    s.map.edges.forEach((e, k) => {
        if (e.a !== i && e.b !== i) return;
        const j = e.a === i ? e.b : e.a;
        const A = s.map.cells[i], B = s.map.cells[j];
        const kind = s.doors[k];
        let dir = SITE_DIRS[`${B.x - A.x},${B.y - A.y}`];
        if (kind === 'stairs') dir = B.y < A.y ? 'up' : 'down';
        out.push(`${dir} to ${j + 1}, ${kind === 'stairs' ? 'by a stair' : `through ${siteDoorText(s, kind)}`}`);
    });
    return out;
}

// One room as [label, text] pairs.
function siteRoomLines(s, i) {
    const r = s.rooms[i];
    const lines = [['Feature', r.feature]];
    if (r.sense) lines.push(['Senses', r.sense]);
    if (r.fight) {
        lines.push(['Foes', `${siteMonsterText(r.fight)} (${siteFightRating(s, r.fight)}).`]);
        lines.push(['Doing', `${siteCap(r.fight.doing)}. ${SITE_AWARE[r.fight.seen]}`]);
    }
    if (i === s.rooms.length - 1 && s.boss) {
        const L = s.boss.leader;
        if (L) lines.push(['Leader', L.name ? `${L.name} (${L.role}), who ${L.mark}.` : `The ${L.role.toLowerCase()} ${L.person ? 'who' : 'that'} ${L.mark}.`]);
        lines.push(['Tactics', s.boss.tactics]);
        lines.push(['Morale', s.boss.morale]);
        if (s.boss.parley) lines.push(['Parley', s.boss.parley]);
    }
    if (r.trap) {
        const t = r.trap;
        lines.push(['Trap', `${t.name} (${t.severity}). ${t.trigger} Spot it: DC ${t.dc} Wisdom (Perception). Disarm: ${siteCap(t.disarm)}. ${t.effect}`]);
    }
    if (i === s.rooms.length - 1) {
        lines.push(['Hoard', `${siteCap(s.hoard.container)}. Roll it in the Loot generator (a hoard for CR ${s.tier}).`]);
    }
    const exits = siteExits(s, i);
    if (i === 0) exits.unshift('out the way you came');
    lines.push(['Exits', siteCap(exits.join('; ')) + '.']);
    return lines;
}

function siteWanderText(s) {
    if (!s.wander) return '';
    return `Every 30 minutes the party spends here, roll a d6. On a 1, they meet ${siteMonsterText(s.wander)} (${siteFightRating(s, s.wander)}), wandering in from outside.`;
}

function siteText(s, ctx) {
    const K = SITE_KINDS[s.kind];
    const out = [`${K.icon} ${s.name}`, siteSummary(s), ''];
    siteStoryLines(s, ctx).forEach(([k, v]) => out.push(`${k}: ${v}`));
    out.push('');
    s.rooms.forEach((r, i) => {
        out.push(`${r.n}. ${r.name}`, `  ${r.text}`);
        siteRoomLines(s, i).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
        out.push('');
    });
    if (s.wander) out.push(`Wandering monsters: ${siteWanderText(s)}`);
    return out.join('\n').trim();
}

// ── The map as SVG ────────────────────────────────────────
const SITE_CELL = { w: 112, h: 92, pad: 30 };
// One 5-foot square on a battle map: a corridor's width.
const SITE_SQUARE = 10;

function siteAttr(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// snap: the middle of the nearest square, so a corridor runs down one row of squares.
function siteCenter(c, snap = false) {
    const x = SITE_CELL.pad + c.x * SITE_CELL.w + SITE_CELL.w / 2, y = SITE_CELL.pad + c.y * SITE_CELL.h + SITE_CELL.h / 2;
    if (!snap) return { x, y };
    const to = v => Math.round((v - SITE_SQUARE / 2) / SITE_SQUARE) * SITE_SQUARE + SITE_SQUARE / 2;
    return { x: to(x), y: to(y) };
}

// A room's width or height as an odd number of squares, so its walls fall on grid lines.
function siteSnapSize(v) {
    return Math.max(1, Math.round((v / SITE_SQUARE - 1) / 2)) * 2 * SITE_SQUARE + SITE_SQUARE;
}

// How far a room's wall is from its center, toward a neighbor (dx, dy one of them 0).
function siteReach(c, shape, dx) {
    if (shape === 'circle') return Math.min(c.w, c.h) / 2;
    return dx ? c.w / 2 : c.h / 2;
}

function siteRoomShape(s, i) {
    const K = SITE_KINDS[s.kind];
    if (K.shape !== 'mixed') return K.shape;
    return i === s.rooms.length - 1 || i % 4 === 2 ? 'circle' : 'rect';
}

// A cave outline: an ellipse with a seeded wobble.
function siteCavePath(s, i, cx, cy, rx, ry) {
    return withSeed(deriveSeed(s.seed, 'cave.' + i), () => {
        const pts = [];
        const k = 11;
        for (let j = 0; j < k; j++) {
            const a = (j / k) * Math.PI * 2;
            const f = 0.82 + rand() * 0.22;
            pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]);
        }
        const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        let d = `M${mid(pts[k - 1], pts[0]).map(v => v.toFixed(1)).join(' ')}`;
        pts.forEach((p, j) => { const m = mid(p, pts[(j + 1) % k]); d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; });
        return d + 'Z';
    });
}

// ── The illustrated map ───────────────────────────────────
// Floors, furniture, and doors from img/map (made by map-art.py). A floor tile covers
// 20 × 20 feet (4 squares).
const SITE_STYLES = { art: '🎨 Illustrated', classic: '✒️ Classic' };
const SITE_ART_DIR = 'img/map/';
const SITE_FLOOR_TILE = SITE_SQUARE * 4;
// Each kind's floor (and its corridors'), and its ordinary door's picture (null: drawn plain).
const SITE_ART_KINDS = {
    crypt: { floor: 'flagstones', door: 'iron-door', props: ['coffin', 'rubble', 'bone-pile', 'brazier', 'spider-web', 'statue', 'sarcophagus'] },
    mine: { floor: 'cave', door: 'wooden-door', props: ['crates', 'mine-cart', 'rubble', 'barrels', 'stalagmites', 'spider-web'] },
    tower: { floor: 'planks', door: 'wooden-door', props: ['bookshelf', 'table', 'chest', 'rug', 'brazier', 'desk'] },
    temple: { floor: 'temple-tiles', door: 'iron-door', props: ['pillar', 'statue', 'rubble', 'brazier', 'altar', 'spider-web'] },
    fort: { floor: 'dirt', door: 'wooden-door', props: ['barrels', 'crates', 'table', 'campfire', 'weapon-rack'] },
    lair: { floor: 'cave', door: null, props: ['bone-pile', 'stalagmites', 'rubble', 'spider-web'] },
    keep: { floor: 'flagstones', door: 'wooden-door', props: ['rubble', 'table', 'barrels', 'pillar', 'chest', 'weapon-rack', 'brazier'] }
};
// A room's own floor, by what its name and description say (first match). room: not in caves.
const SITE_FLOOR_RULES = [
    [/flood|water|lake|stream|wallow|baptistry|pool|wades|knee-deep|bog/, 'water'],
    [/ossuar|bone|charnel/, 'bone'],
    [/fungus|mushroom|herb garden|grotto/, 'mossy-cave'],
    [/library|quarters|guest|dining|study|bedchamber|solar|lady|porter|office|barracks|mess|counting|hostel|scriptorium|refectory|cellar|infirmary|watchtower|lookout/, 'planks', 'room'],
    [/sanctum|chapel|throne|great hall|mosaic|holy|vault of wonders|portrait|founder|entrance hall|observatory|god's mouth/, 'marble', 'room'],
    [/yard|stables|kennel|camp|bailey|stockade|gate\b|drawbridge|sally port|breach/, 'dirt']
];
// Furniture by what a room's name and description say. Each match adds its pieces.
const SITE_PROP_RULES = [
    [/treasur|hoard|mother lode|strongroom|grave goods|fortune|loot/, 'treasure-hoard'],
    [/bone|ossuar|charnel|skull|carcass/, 'bone-pile'],
    [/coffin/, 'coffin'],
    [/sarcophag|tomb|effig/, 'sarcophagus'],
    [/altar|shrine|sanctum|offering/, 'altar'],
    [/statue|saint|idol|mourners|effig|golem|armor that stands/, 'statue'],
    [/\bbeds?\b|bunks?\b|cots?\b|quarters|four-poster|canopy/, 'bed'],
    [/bedroll|camp\b|old camp/, 'bedrolls'],
    [/books?\b|library|shelves|scriptorium/, 'bookshelf'],
    [/desk|office|study|ledger|counting|diary|notes/, 'desk'],
    [/table|dining|mess hall|refectory|map room|war room|guardroom|dice/, 'table'],
    [/barrel|\bale\b|wine|kegs?\b|powder/, 'barrels'],
    [/crates|sacks|storehouse|store\b|storeroom|tool store/, 'crates'],
    [/cage|menagerie|kennel|stockade|canary|cells with iron/, 'cage'],
    [/cauldron|stew|laborator|glassware|components/, 'cauldron'],
    [/forge|smelter|smithy|furnace|hearth|candles|brazier|lamp/, 'brazier'],
    [/cookfire|cold fire|campfire/, 'campfire'],
    [/circle of silver|summoning|scrying/, 'magic-circle'],
    [/\bcarts?\b|rails|ore\b/, 'mine-cart'],
    [/pillar|column|portico|nave|hammerbeam|stalactite hall/, 'pillar'],
    [/rubble|collaps|cave-in|landslide|fallen roof|half fallen|cracked open/, 'rubble'],
    [/solar|lady's|lord's|guest room|apartment|rug/, 'rug'],
    [/spider|cobweb/, 'spider-web'],
    [/crystal|stalactite|sinkhole|cave mouth|narrow cleft/, 'stalagmites'],
    [/throne|big chair|high-backed/, 'throne'],
    [/weapons|armou?ry|training yard|swords|broken weapons/, 'weapon-rack'],
    [/\bwell\b/, 'well'],
    [/fountain|baptistry|\bbath\b/, 'fountain'],
    [/chest|strongbox|trunks?\b|vessels/, 'chest'],
    [/cellar|shaft|charnel pit|trapdoor/, 'trapdoor']
];
// Pieces drawn wide (their pictures are long and low), and pieces that lie flat under the room's number.
const SITE_PROP_WIDE = ['altar', 'bookshelf', 'table', 'desk', 'weapon-rack'];
const SITE_PROP_MIDDLE = ['rug', 'magic-circle'];

function siteArtFloor(s, i) {
    const K = SITE_KINDS[s.kind], r = s.rooms[i], text = `${r.name} ${r.text}`.toLowerCase();
    const hit = SITE_FLOOR_RULES.find(([re, , only]) => re.test(text) && !(only === 'room' && siteRoomShape(s, i) === 'cave'));
    return hit ? hit[1] : SITE_ART_KINDS[s.kind].floor;
}

// The furniture in room i: [{ file, x, y, w, h }], away from the walls its corridors come
// through and from the number in the middle. Its own seed, so it never moves anything else.
// c: the room's cell as drawn; round: a circle or cave (spots pulled in from the corners).
function siteArtProps(s, i, c, p, round) {
    const r = s.rooms[i], last = i === s.rooms.length - 1, text = `${r.name} ${r.text}`.toLowerCase();
    const A = SITE_ART_KINDS[s.kind];
    return withSeed(deriveSeed(s.seed, 'props.' + i), () => {
        const own = SITE_PROP_RULES.filter(([re]) => re.test(text)).map(([, prop]) => prop);
        const want = [...new Set((last ? ['treasure-hoard'] : []).concat(siteShuffle(own)))].slice(0, last ? 3 : 2);
        const total = i === 0 ? 2 : c.w * c.h > 4600 ? 4 : 3;
        siteShuffle(A.props).forEach(prop => { if (want.length < total && !want.includes(prop)) want.push(prop); });
        // Spots: the corners, then the middles of the walls no corridor comes through.
        const ways = new Set(s.map.edges.map(e => e.a === i ? [e.b, 1] : e.b === i ? [e.a, -1] : null).filter(Boolean)
            .map(([j]) => { const o = s.map.cells[j], m = s.map.cells[i]; return `${Math.sign(o.x - m.x)},${Math.sign(o.y - m.y)}`; }));
        const fx = round ? 0.24 : 0.3, fy = round ? 0.22 : 0.27, mx = round ? 0.3 : 0.34, my = round ? 0.27 : 0.3;
        const spots = siteShuffle([[-1, -1], [1, -1], [-1, 1], [1, 1]]).concat(siteShuffle([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !ways.has(`${dx},${dy}`))));
        const size = Math.max(13, Math.min(20, Math.min(c.w, c.h) * 0.3));
        const out = [];
        want.forEach(prop => {
            if (SITE_PROP_MIDDLE.includes(prop)) {
                const z = Math.min(c.w, c.h) * (prop === 'rug' ? 0.5 : 0.62);
                out.unshift({ file: prop, x: p.x, y: p.y, w: prop === 'rug' ? z * 0.75 : z, h: z });
                return;
            }
            const spot = spots.shift();
            if (!spot) return;
            const [dx, dy] = spot;
            const k = prop === 'treasure-hoard' ? 1.35 : 1;
            const w = size * k * (SITE_PROP_WIDE.includes(prop) ? 1.5 : 1), h = size * k;
            out.push({ file: prop, x: p.x + dx * c.w * (dy ? fx : mx), y: p.y + dy * c.h * (dx ? fy : my), w, h });
        });
        return out;
    });
}

function siteArtImg(file, x, y, w, h, extra = '') {
    return `<image href="${SITE_ART_DIR}${file}.webp" x="${(x - w / 2).toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="xMidYMid meet"${extra}/>`;
}

// opts (for the battle map export): snap squares the rooms up to the 5-foot grid, and grid
// also draws it; nums: false leaves out the room numbers and the fight and trap marks;
// secret: false leaves out the secret doors and the corridors behind them.
// style: 'art' (floors, furniture, and doors from img/map) or 'classic' (flat ink).
function siteMapSvg(s, title, opts = {}) {
    const { grid = false, snap = grid, nums = true, secret = true, style = 'classic' } = opts;
    const K = SITE_KINDS[s.kind];
    const art = style === 'art', KA = SITE_ART_KINDS[s.kind], id = `sm-${s.seed}`;
    const used = new Set();
    const floor = name => { used.add(name); return `url(#${id}-fl-${name})`; };
    let props = '';
    const cells = snap ? s.map.cells.map(c => ({ ...c, w: siteSnapSize(c.w), h: siteSnapSize(c.h) })) : s.map.cells;
    const center = c => siteCenter(c, snap);
    const cols = Math.max(...cells.map(c => c.x)) + 1, rows = Math.max(...cells.map(c => c.y)) + 1;
    let W = cols * SITE_CELL.w + SITE_CELL.pad * 2, H = rows * SITE_CELL.h + SITE_CELL.pad * 2;
    if (snap) { W = Math.ceil(W / SITE_SQUARE) * SITE_SQUARE; H = Math.ceil(H / SITE_SQUARE) * SITE_SQUARE; }
    const last = cells.length - 1;
    let corr = '', walls = '', fills = '', floors = '', doors = '', lines = '', labels = '';

    s.map.edges.forEach((e, k) => {
        const kind = s.doors[k];
        if (kind === 'secret' && !secret) return;
        const A = cells[e.a], B = cells[e.b];
        const pa = center(A), pb = center(B);
        corr += `<line class="sm-corr-wall${art ? ' sm-a-wall' : ''}" x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}"/>`;
        floors += `<line class="sm-corr${kind === 'secret' ? ' sm-secret-corr' : ''}"${art ? ` style="stroke:${floor(KA.floor)}"` : ''} x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}"/>`;
        // The door sits halfway between the two walls.
        const dx = Math.sign(B.x - A.x), dy = Math.sign(B.y - A.y);
        const ra = siteReach(A, siteRoomShape(s, e.a), dx), rb = siteReach(B, siteRoomShape(s, e.b), dx);
        const gap = (dx ? Math.abs(pb.x - pa.x) : Math.abs(pb.y - pa.y)) - ra - rb;
        const off = ra + gap / 2;
        const x = pa.x + dx * off, y = pa.y + dy * off;
        const horiz = !!dx;
        const rect = (cls, len, thick) => `<rect class="${cls}" x="${(x - (horiz ? thick : len) / 2).toFixed(1)}" y="${(y - (horiz ? len : thick) / 2).toFixed(1)}" width="${horiz ? thick : len}" height="${horiz ? len : thick}"/>`;
        const pic = (file, w, h) => siteArtImg(file, x, y, w, h, horiz ? ` transform="rotate(90 ${x.toFixed(1)} ${y.toFixed(1)})"` : '');
        if (art && (kind === 'door' || kind === 'stuck') && KA.door) doors += pic(`door/${KA.door}`, 12, 12);
        else if (art && kind === 'locked') doors += pic('door/iron-door', 12, 12);
        else if (art && kind === 'portcullis') doors += pic('door/portcullis', 14, 10);
        else if (art && kind === 'stairs') doors += siteArtImg('door/spiral-stairs', x, y, 16, 16);
        else if (kind === 'door' || kind === 'stuck') doors += rect('sm-door', 12, 6);
        else if (kind === 'locked') doors += rect('sm-door', 12, 6) + `<circle class="sm-lock" cx="${x}" cy="${y}" r="1.8"/>`;
        else if (kind === 'secret') doors += `<text class="sm-s" x="${x}" y="${y}">S</text>`;
        else if (kind === 'portcullis') doors += `<line class="sm-port" x1="${horiz ? x : x - 7}" y1="${horiz ? y - 7 : y}" x2="${horiz ? x : x + 7}" y2="${horiz ? y + 7 : y}"/>`;
        else if (kind === 'stairs') {
            for (let t = -6; t <= 6; t += 3) doors += `<line class="sm-stair" x1="${horiz ? x + t : x - 6}" y1="${horiz ? y - 6 : y + t}" x2="${horiz ? x + t : x + 6}" y2="${horiz ? y + 6 : y + t}"/>`;
        }
    });

    cells.forEach((c, i) => {
        const p = center(c);
        const shape = siteRoomShape(s, i);
        const cls = `sm-room${i === last ? ' sm-end' : ''}${art ? ' sm-a-room' : ''}`;
        const fill = art ? `fill:${floor(siteArtFloor(s, i))};` : '';
        const el = st => {
            const a = st ? ` style="${st}"` : '';
            if (shape === 'circle') return `<circle class="${cls}"${a} cx="${p.x}" cy="${p.y}" r="${Math.min(c.w, c.h) / 2}"/>`;
            if (shape === 'cave') return `<path class="${cls}"${a} d="${siteCavePath(s, i, p.x, p.y, c.w / 2, c.h / 2)}"/>`;
            return `<rect class="${cls}"${a} x="${p.x - c.w / 2}" y="${p.y - c.h / 2}" width="${c.w}" height="${c.h}"/>`;
        };
        walls += el(fill);
        // The room's floor again over the corridors' ends, so they stop at its wall.
        fills += el(fill + 'stroke:none');
        if (art) {
            const d = Math.min(c.w, c.h);
            const drawn = shape === 'circle' ? { ...c, w: d, h: d } : c;
            props += siteArtProps(s, i, drawn, p, shape !== 'rect').map(q => siteArtImg(q.file === 'trapdoor' ? 'door/trapdoor' : `prop/${q.file}`, q.x, q.y, q.w, q.h)).join('');
        }
        if (!nums) return;
        const r = s.rooms[i];
        const marks = (r.fight ? '⚔' : '') + (r.trap ? '⚠' : '');
        labels += `<g class="sm-key" data-room="${i + 1}" tabindex="0" role="button" aria-label="Room ${i + 1}: ${siteAttr(r.name)}">
            <circle class="sm-num-bg${i === last ? ' sm-num-end' : ''}" cx="${p.x}" cy="${p.y}" r="11"/>
            <text class="sm-num" x="${p.x}" y="${p.y}">${i + 1}</text>
            ${marks ? `<text class="sm-mark" x="${p.x + 19}" y="${p.y - 15}">${marks}</text>` : ''}</g>`;
    });

    // The way in: an arrow from outside the map edge to room 1.
    if (grid) {
        let d = '';
        for (let x = SITE_SQUARE; x < W; x += SITE_SQUARE) d += `M${x} 0V${H}`;
        for (let y = SITE_SQUARE; y < H; y += SITE_SQUARE) d += `M0 ${y}H${W}`;
        lines = `<path class="sm-grid" d="${d}"/>`;
    }

    const p0 = center(cells[0]);
    const r0 = siteReach(cells[0], siteRoomShape(s, 0), 0);
    const inward = K.entry === 'top' ? 1 : -1;
    const ey1 = p0.y - inward * (r0 + 22), ey2 = p0.y - inward * (r0 + 4);
    const entry = `<line class="sm-entry" x1="${p0.x}" y1="${ey1}" x2="${p0.x}" y2="${ey2}" marker-end="url(#sm-arrow-${s.seed})"/>`;

    const tiles = [...used].map(name => `<pattern id="${id}-fl-${name}" patternUnits="userSpaceOnUse" width="${SITE_FLOOR_TILE}" height="${SITE_FLOOR_TILE}"><image href="${SITE_ART_DIR}floor/${name}.webp" width="${SITE_FLOOR_TILE}" height="${SITE_FLOOR_TILE}"/></pattern>`).join('');
    return `<svg class="site-map${art ? ' sm-art' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${siteAttr(title)}" xmlns="http://www.w3.org/2000/svg">
        <defs>${tiles}<marker id="sm-arrow-${s.seed}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="sm-arrow" d="M0 0 L10 5 L0 10 z"/></marker></defs>
        <rect class="sm-bg${art ? ' sm-a-bg' : ''}" x="0" y="0" width="${W}" height="${H}"/>
        ${corr}${walls}${floors}${fills}${props}${doors}${lines}${entry}${labels}
    </svg>`;
}
