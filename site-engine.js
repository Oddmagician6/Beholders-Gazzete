/* ============================================
   SITE ENGINE (F39): a keyed adventure site
   rollSite(seed, { kind, size, level, party }) → a crypt, lost mine, wizard's tower,
   sunken temple, bandit fort, monster lair, ruined keep, sewer, smugglers' cave, shipwreck,
   lighthouse, haunted manor, or barrow mound: 5-12 rooms on a grid (siteLayout, drawn as
   SVG by siteMapSvg), a feature in every room, fights from the encounter engine (one group
   of foes holds the place; something else wanders), traps, someone else in a room or two
   (a prisoner, a rival party, ...), a hoard in the last room (opened in the Loot
   generator) on the kind's own ground, and the site's story.
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
const SITE_KINDS = ruleTable({
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
        builders: ['the priests of a death god whose name no one prays to anymore', 'a family of minor nobles, now extinct', 'a town council during a plague year', 'an order of knights for its fallen', 'the old kings of this land', 'a necromancer who planned ahead', 'a guild of embalmers who buried their own here', 'a mourning queen, for one husband and then the next three', 'a monastery that sold burial plots to the rich'],
        purposes: ['as a resting place for its honored dead', 'to bury the dead of a great plague far from the living', 'as a family tomb, extended every generation', 'to hold a relic that kept the dead from rising', 'as a monastery for the priests who tended the graves', 'to bury the losers of a war where the winners could not see them', 'as a place to hide the bodies of heretics, unblessed', 'to keep a saint\'s bones where pilgrims could pay to see them'],
        fates: ['the last priest died and nobody came to replace them', 'grave robbers broke the seals, and what they woke drove them out', 'the town above burned, and the crypt was forgotten under the ashes', 'a flood filled the lower vaults and the doors were bricked up', 'the relic that kept the dead quiet was stolen', 'the family that paid for it ran out of money, and then out of heirs', 'a new faith came, and the old dead were left to the old gods', 'the dead began to be found in the wrong coffins, and the priests stopped coming down'],
        containers: ['inside the great sarcophagus, under the body', 'in iron-banded grave chests at the foot of the dais', 'heaped around the bier as offerings', 'in a hidden compartment under the altar', 'in a row of funeral urns, ashes on top and coin underneath', 'sewn into the burial shrouds of the oldest dead', 'in a reliquary chest whose lock is shaped like a skull'],
        doing: { folk: [['unaware', 'prying the lid off a sarcophagus, one of them holding the lantern'], ['unaware', 'praying in front of the hooded statue, in a language nobody should still speak'], ['ambush', 'lying in the open coffins, as still as the dead']], beast: [['unaware', 'nosing through a broken coffin'], ['ambush', 'waiting in the burial niches, too high to see into']] },
        ground: ['Stone coffins in rows give half cover to anyone crouched behind one.', 'The floor is uneven with grave slabs; a few have sunk, and count as difficult terrain.', 'A raised dais at the far end puts anyone on it 5 feet above the rest of the room.', 'Burial niches in the walls are big enough for a Small creature to climb into and fight from (three-quarters cover).', 'Pillars carved like mourners hold up the roof; each one blocks line of sight.', 'Candle stands are everywhere; knocking one over leaves a 5-foot patch of burning wax.'],
        hazards: ['The floor of the far half is thin over a lower vault. The first time a Large creature or three Medium ones stand on it, it gives way: DC {dc} {save:dex} saving throw or fall 10 feet and take {dmg} bludgeoning damage.', 'Grave gas pools in the low corners. Anyone who starts a turn in one makes a DC {dc} {save:con} saving throw or is poisoned until the end of their next turn.']
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
        builders: ['a dwarf clan that came for the silver', 'a human prospecting company with a royal charter', 'a gnome guild of engineers', 'a mad baron who swore there was gold under his land', 'slaves of a forgotten empire', 'two brothers with one pick, and later two hundred men', 'a temple that needed stone, and convicts to cut it', 'a halfling family who found gold under their turnips'],
        purposes: ['to dig out a silver seam', 'to mine iron for a war', 'to chase a vein of gems', 'to quarry a rare stone for a temple', 'to find the source of a strange crystal', 'to mine salt for half the kingdom', 'to dig coal for a city that burned through it faster every winter', 'to follow a map that promised a dwarven city below'],
        fates: ['the miners dug too deep and broke into something\'s home', 'a cave-in sealed the lower levels with the miners inside', 'the seam ran out and the company left overnight, owing everyone', 'the water came in and the pumps failed', 'the miners vanished one shift and the rest refused to go down', 'the miners struck, the owners hired thugs, and nobody won', 'the crystal they dug up made the miners sick, then strange', 'a fire in the lower galleries burned for a year, and nobody went back'],
        containers: ['in the old company strongbox', 'in ore carts piled with more than ore', 'scattered through a nest of stolen things', 'in a sealed dwarven chest at the end of the seam', 'in the pay chest, never handed out on the last day', 'in leather sacks hidden under the floor of the foreman\'s cave', 'in a lead-lined box of uncut stones'],
        doing: { folk: [['unaware', 'loading a cart with ore, and arguing about whose turn it is to push'], ['unaware', 'picking at the seam by lamplight, backs to the door'], ['ready', 'standing round a lit fuse, and one of them is about to throw it']], beast: [['unaware', 'chewing on a leather boot with a foot still in it'], ['ambush', 'clinging to the timbers overhead']] },
        ground: ['Mine rails run across the room; a cart on them can be shoved 20 feet as an action, and hits like a battering ram.', 'Timber props hold up the ceiling. Knocking one out (AC 15, 20 hit points) brings down rubble on a 10-foot square.', 'Spoil heaps 5 feet high give half cover, and are difficult terrain to climb.', 'A shaft in the floor, 5 feet across, drops 30 feet to the level below.', 'Puddles of water and loose gravel make the low end of the room difficult terrain.', 'Lamps hang on hooks along the walls; knock them down and the room goes dark.'],
        hazards: ['Blasting powder is stacked by the wall. Fire or lightning that touches it sets it off: everyone within 10 feet makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.', 'The roof is bad. The first time something thunderous happens here, rubble falls: everyone in a random 10-foot square makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage.']
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
        builders: ['an archmage who wanted to be left alone', 'a guild of wizards as a training school', 'a court mage who fell out of favor', 'a sorcerer who lifted every stone with a spell', 'two rival wizards who built it together and fought for the rest of their lives', 'a king, for a wizard he wanted close and watched', 'an alchemist who paid the masons in gold that turned to lead the next week', 'a wizard who grew it from a single enchanted stone'],
        purposes: ['to study the stars', 'to keep a dangerous book safe', 'to train apprentices', 'to work on a spell that would change the world', 'to imprison something in the cellar', 'to watch the border for a king who paid in favors', 'to brew a cure for a plague, which it did, too late', 'to talk with something on another plane'],
        fates: ['the wizard vanished in the middle of an experiment', 'the apprentices turned on their master', 'a spell went wrong and the top floors still hum with it', 'the wizard died, and the tower did not notice', 'the thing in the cellar got out', 'the wizard\'s guild declared it forbidden, and nobody dared buy it', 'lightning struck it on the night of the great experiment, and the wizard went with the flash', 'the wizard sold their tower to pay a debt, and the buyer never moved in'],
        containers: ['in a chest that opens only to a polite request', "on the wizard's workbench, among the notes", 'in a cabinet of drawers, each one locked', 'in a vault behind a bookcase', 'inside a stuffed crocodile hanging from the ceiling', 'in a box of jars, each one labeled wrongly on purpose', 'in a trunk that is bigger inside than out'],
        doing: { folk: [['unaware', 'reading the wizard\'s notes aloud, and getting the words wrong'], ['ready', 'mid-spell over a glowing circle, and they look up as the door opens'], ['unaware', 'trying on the wizard\'s robes and hats']], beast: [['unaware', 'knocking glassware off the shelves one piece at a time'], ['ambush', 'hiding among the stuffed and mounted creatures on the walls']] },
        ground: ['Bookshelves and tables give half cover; a shelf can be pushed over ({dc:13} {ability:str}) to make a 10-foot line of difficult terrain.', 'A spiral stair climbs the wall to a gallery 10 feet up.', 'Glassware covers every table; a creature knocked into one takes 1d4 slashing damage.', 'The floor is painted with a magic circle. Anyone standing in it has advantage on saving throws against spells.', 'A tall window looks out on a drop of 60 feet or more.', 'A great pendulum swings slowly through the middle of the room; it blocks line of sight every other round.'],
        hazards: ['A shelf of unstable potions. Any area spell here smashes them: everyone within 10 feet makes a DC {dc} {save:con} saving throw or takes {dmg} acid damage; half damage on a success.', 'Wild magic hangs in the air. Whenever a spell of 1st level or higher is cast here, roll a d6: on a 1, the caster takes {dmg} force damage (DC {dc} {save:con} saving throw for half).']
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
        builders: ['the faithful of a god of the waters', 'a sun cult that ruled the land in its day', 'a monastic order of healers', 'a king who wanted to be remembered as a god', 'snake-worshippers from the south', 'a frog-folk people who were here before anyone', 'a merchant prince who wanted to buy his way into heaven', 'a prophet who said the ground was holy and was believed'],
        purposes: ['to honor a god nobody remembers now', 'as a place of pilgrimage for the sick', 'to keep an oracle', 'to bind a demon under its altar', 'as a fortress-monastery against the dark', 'to keep a sacred spring flowing', 'to crown the kings of a land that is now swamp', 'to hold the bones of a god, or something that claimed to be one'],
        fates: ['the earth swallowed it in a single night, as punishment the priests said', 'the river changed course and the swamp took it', 'the faithful turned to a darker god and the land rejected them', 'a war burned the town around it, and the swamp crept in', 'the high priest made a bargain with something under the altar', 'the oracle foretold its fall, and everyone left early, which caused it', 'a plague killed the monks, and the frogs moved in', 'its god stopped answering, and its priests went looking for one who would'],
        containers: ['in the lap of the idol', 'in the alms chests of a thousand years of pilgrims', 'in a sunken coffer under the altar water', 'in the treasury vault behind the god\'s mouth', 'inside the idol, through a door in its back', 'in offering bowls at the bottom of the sacred pool', 'in the high priest\'s coffin, which holds no high priest'],
        doing: { folk: [['unaware', 'chanting on their knees in the silt, facing the altar'], ['unaware', 'hauling an idol out of the water on ropes'], ['ready', 'in a ring with linked arms, singing louder as the party comes in']], beast: [['unaware', 'basking on the warm stones of the altar'], ['ambush', 'lying just under the water, eyes and nostrils showing']] },
        ground: ['Knee-deep water covers half the room: difficult terrain, and anything prone in it is underwater.', 'Fallen columns lie across the floor; each gives half cover and is difficult terrain to cross.', 'Broad steps rise to the altar, 10 feet above the floor.', 'Roots as thick as a man break through the walls and floor. Climbing them needs no check.', 'Silt has buried the benches to the seat; the room is difficult terrain except down the aisle.', 'A sacred pool in the middle is 15 feet deep, and the water is perfectly clear.'],
        hazards: ['The roof is held up by roots and habit. Anything that deals thunder damage here brings part of it down: everyone in a 10-foot square makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage.', 'Leeches the size of a hand live in the water. Anyone who ends a turn in it makes a DC {dc} {save:con} saving throw or takes {dmg} piercing damage as they latch on; half damage on a success.']
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
        builders: ['the old lord\'s soldiers, as a border post', 'loggers who needed a safe camp', 'a mercenary company between wars', 'the bandits themselves, from stolen timber', 'a frontier town that never grew', 'a trading company that wanted its own private army', 'settlers who were promised the land was empty', 'a prince in exile, waiting for the call that never came'],
        purposes: ['to guard the road against raiders', 'as a toll post on the river crossing', 'to hold the border', 'as a hunting lodge for a lord', 'as a stockade during an old war', 'as a fur-trading post', 'to keep a prisoner nobody was supposed to know about', 'as a waystation for the king\'s messengers'],
        fates: ['the garrison was recalled and nobody came to replace them', 'it was overrun in a raid and left to rot', 'the lord who paid for it went bankrupt', 'the road moved, and the fort was forgotten', 'its own soldiers turned bandit and kept it', 'the war it was built for ended, and nobody told the fort for a year', 'a fever went through the garrison one winter, and the survivors walked home', 'the captain sold it to the bandits for a barrel of brandy and a horse'],
        containers: ['in iron-bound chests under the boss\'s bed', 'in a cellar under a trapdoor', 'in sacks hanging from the rafters', "in a stolen strongbox, still with the merchant's seal", 'in barrels marked SALT FISH that hold no fish', 'buried under the floor of the boss\'s hall, marked with a horseshoe', 'in a coach taken whole off the road, with the coat of arms scraped off'],
        doing: { folk: [['unaware', 'dividing the week\'s take into piles, with a lot of shouting'], ['unaware', 'practicing knife throws at a wanted poster'], ['ready', 'saddling horses for a raid, and the party is in the way']], beast: [['unaware', 'gnawing on scraps thrown down from the mess hall'], ['ready', 'straining at their chains, barking']] },
        ground: ['A walkway runs along the palisade 10 feet up, reached by a ladder at each end.', 'Barrels and crates are stacked everywhere: half cover, and each can be shoved over as an action.', 'Mud from the yard makes half the floor difficult terrain.', 'A cookfire burns in the middle; anyone shoved into it takes 1d6 fire damage.', 'Horses tied at a rail panic once the fighting starts and kick anyone who walks behind them (+5 to hit, 1d8 bludgeoning).', 'A table long enough to stand on runs down the middle of the room.'],
        hazards: ['Lamp oil soaks the straw on the floor. If fire touches it, the room burns: anyone who starts a turn here makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage.', 'The boss keeps a rack of loaded crossbows by the chair. Anyone can fire one as an action (+4 to hit, 1d10 piercing), until they run out.']
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
        builders: ['nature, over ten thousand years', 'a river that dried up long ago', 'dwarves, who dug it as a mine and fled', 'giants who carved it as a home', 'the beast itself, digging for years', 'a lava flow, cooling into tubes a long time ago', 'an earthquake that split the hill open', 'hermits, one cell at a time, until the hill was hollow'],
        purposes: ['as a home for whatever lives in it', 'as a shelter for the hill tribes in winter', 'as a smugglers\' cave', 'as a hermit\'s retreat', 'as a shrine to the spirits of the hill', 'as a place to keep cheese cold for a village that is gone now', 'as a hiding place in a war that everyone has forgotten', 'as the den of an older beast, which this one ate'],
        fates: ['the beast moved in and the others moved out or got eaten', 'it was abandoned when the beast first came', 'the last hero to go in never came out', 'the beast was driven off once, and came back', 'nothing happened to it; it has always been a lair', 'the village that used it paid the beast in sheep until they ran out of sheep', 'a lord sealed the entrance with the beast inside, and his heirs unsealed it to see what was left', 'its young grew up, and the den grew with them'],
        containers: ['heaped under the beast where it sleeps', 'scattered among the bones', 'buried under the floor in a crude cache', "in a dead adventurer's pack, along with their stuff", 'in a nest of shiny things the beast could not stop collecting', 'in the stomach of something it ate, now just bones around a purse', 'wedged into cracks in the wall, as if hidden by a clever claw'],
        doing: { folk: [['unaware', 'feeding the beast through bars, and very careful about it'], ['ready', 'painting their faces with ash before they go out to hunt']], beast: [['unaware', 'licking their wounds from a fight with something bigger'], ['unaware', 'teaching the young to hunt with a live goat'], ['ambush', 'waiting in the dark of a side cave, only their eyes showing']] },
        ground: ['Stalagmites stand in clusters; each gives half cover.', 'A ledge 15 feet up runs round the cave. Climbing to it takes a {dc:12} {skill:str:athletics} check.', 'Bones a foot deep cover the floor: difficult terrain, and loud to move through.', 'A crack in the floor, 10 feet wide, splits the cave in two.', 'The roof opens to the sky in one place, and a shaft of light falls through it.', 'A stream runs through the cave, 3 feet deep and fast.'],
        hazards: ['Loose stalactites hang overhead. A loud noise or a thrown boulder brings one down on a random creature: DC {dc} {save:dex} saving throw or take {dmg} piercing damage.', 'The cave floor slopes to a sinkhole at its low end. A creature knocked prone near it slides in unless it succeeds on a DC {dc} {save:str} saving throw, falling 20 feet and taking {dmg} bludgeoning damage.']
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
        builders: ['a baron who held the valley for the crown', 'a knightly order on the frontier', 'a robber-lord who made himself respectable', 'an old royal house in its glory days', 'a warlord who took the land by force', 'a dwarf mason who built it for a lord and then sued him for it', 'twin sisters who ruled it together and never once agreed', 'a crusading order on its way home from a war it lost'],
        purposes: ['to hold the pass', 'as the seat of a noble house', 'to guard the river crossing', 'as a royal hunting lodge', 'as a prison for the realm\'s worst enemies', 'to keep a dangerous heir far from the capital', 'as the stronghold of a border lord who answered to nobody', 'to watch over a mine, a ford, and a grudge'],
        fates: ['it fell in a siege and was never rebuilt', 'the family died out, one strange death at a time', 'a curse fell on the lord and spread to the house', 'the heir gambled it away, and the new owners never came', 'it burned on the night of a great feast', 'the crown seized it for treason, then forgot to give it to anyone', 'the lord went to war, the lady went mad, and the servants went home', 'the well went bad, and then the people who drank from it'],
        containers: ['in the strongroom chests', 'in a hidden compartment behind a portrait', 'in an iron chest under the throne', 'in the family tombs, with the family', 'in the lord\'s war chest, packed for a flight that never came', 'up the chimney, on a ledge only a child could reach', 'in a suit of armor stuffed with coin instead of a knight'],
        doing: { folk: [['unaware', 'holding court on the broken dais, with one of them as the lord'], ['unaware', 'pulling the lead off the roof and arguing about the price'], ['ready', 'on the walls, and one of them points straight at the party']], beast: [['unaware', 'nesting in the rotten tapestries'], ['ambush', 'perched in the rafters among the crows']] },
        ground: ['A long table runs down the room; standing on it puts you 3 feet up and in everyone\'s view.', 'A gallery runs round the room 15 feet up, reached by a stair in one corner.', 'Half the roof has fallen; rubble makes a third of the room difficult terrain.', 'A fireplace big enough to stand in is lit; anyone shoved into it takes 2d6 fire damage.', 'Suits of armor line the walls, and give half cover to anyone behind one.', 'Tall windows open on a long fall to the moat.'],
        hazards: ['A great iron chandelier hangs by a frayed rope. Cutting it (AC 11, 5 hit points) drops it on a 10-foot square: DC {dc} {save:dex} saving throw or take {dmg} bludgeoning damage.', 'The floor is rotten over the cellar. The first creature to stand in the middle makes a DC {dc} {save:dex} saving throw or falls through, taking {dmg} bludgeoning damage.']
    },
    sewer: {
        label: 'Sewers', icon: '🕳️', entry: 'top', cols: 5, rows: 3, shape: 'rect', door: 'a rusted grate', habitat: 'town', hoard: 'guild',
        bands: ['wererats', 'vermin', 'lurkers', 'cult', 'shadows', 'lies', 'grimlocks', 'aberrant', 'undead'],
        names: ['The {Root} Drains', 'The Undercity of {Root}', 'The {Adj} Sluices', 'The Old {Root} Cisterns', 'The {Epithet} Tunnels', 'The {Adj} Outfall'],
        epithets: ['Rat King\'s', 'Drowned Man\'s', 'Lamplighter\'s', 'Seven Gates', 'Night-Soil', 'Smugglers\''],
        adjs: ['Old', 'Flooded', 'Forgotten', 'Lower', 'Stinking', 'Sunken', 'Dripping'],
        entrances: [
            { name: 'The manhole', text: 'A grate in a back alley lifts out with a crowbar. Iron rungs lead down into the smell.' },
            { name: 'The outfall', text: 'A brick tunnel mouth spills into the river. The bars across it have been cut and bent back.' },
            { name: 'The cellar breach', text: 'A tavern cellar wall has been knocked through into the sewer behind it. The tavern keeper would like that bricked up again.' },
            { name: 'The flushing chamber', text: 'A round chamber where the main drains meet. Ladders lead up to four different streets.' }
        ],
        rooms: [
            { name: 'The main channel', text: 'A wide tunnel with a walkway on each side and a slow brown river between them.' },
            { name: 'The old cistern', text: 'A vaulted cistern, half full of still water, its roof held up by rows of brick pillars.' },
            { name: 'The sluice room', text: 'Rusted wheels and chains work the gates that send the water one way or the other. One wheel still turns.' },
            { name: 'The rat warren', text: 'A side tunnel packed with nests of rags and straw. Thousands of small eyes in the lantern light.' },
            { name: 'The smugglers\' landing', text: 'A dry ledge where a boat can tie up, with crates stacked under tarpaulins and a ledger hidden badly.' },
            { name: 'The collapsed vault', text: 'A cellar of some long-gone house that fell into the sewer. Its wine racks are still standing in the muck.' },
            { name: 'The lamplighters\' store', text: 'Lanterns, oil, long poles, and a duty roster that ends a year ago.' },
            { name: 'The shrine of lost things', text: 'Things that fell down the drains, arranged on a brick shelf like offerings: rings, coins, a doll, a false eye.' },
            { name: 'The old street', text: 'A whole street of the old city, buried when the new one was built on top. Shop signs still hang over empty doors.' },
            { name: 'The fungus grotto', text: 'Pale mushrooms carpet a damp chamber. They glow green, and some of them are bigger than a dog.' },
            { name: 'The overflow', text: 'A steep brick slope where floodwater pours down into the dark when it rains up above.' },
            { name: 'The thieves\' hideout', text: 'A dry chamber with bunks, a card table, and a map of the city with certain houses circled.' },
            { name: 'The bone pipes', text: 'A tangle of old pipes where something has packed the bones of whatever it caught.' },
            { name: 'The dead-end tunnel', text: 'A short tunnel bricked up at the end, recently. The mortar is still soft.' }
        ],
        ends: [
            { name: 'The great cistern', text: 'A cathedral of brick under the city, its roof lost in darkness. An island of rubble stands in the black water.' },
            { name: 'The rat king\'s court', text: 'A chamber heaped with stolen goods around a throne built from a barrel, a cartwheel, and a mayor\'s chair.' },
            { name: 'The forgotten temple', text: 'A small temple from before the city was built over it, still dry, still lit.' },
            { name: 'The treasure drain', text: 'Where every drain in the rich quarter ends. Generations of dropped coins and rings glitter in the silt.' }
        ],
        features: ['A grate overhead lets in daylight and the sound of a market.', 'Chalk marks at each junction: a code, and someone has changed the last one.', 'A dead body caught on a grate, wearing good boots.', 'A rowing boat tied to a ring in the wall.', 'Pipes overhead drip something warm.', 'A stuck sluice gate holding back a lot of water.', 'A lantern on a hook, recently lit.', 'Bricks carved with the names of the workers who laid them.', 'A rope bridge across a fast channel.', 'Thousands of rats, all running the same way.'],
        senses: ['The smell is like a wall.', 'Water rushes somewhere close, then stops.', 'Footsteps on the street above, muffled.', 'Every sound echoes three times.', 'Something splashes in the dark, then nothing.', 'The air is warm and wet and tastes of copper.'],
        builders: ['the city fathers, when the old river stank too much', 'dwarven engineers paid by the yard', 'prisoners working off their sentences', 'a guild of masons who built it far bigger than anyone asked', 'the old city, before the new one was built on top'],
        purposes: ['to carry the city\'s filth to the river', 'to drain the marsh the city was built on', 'to store water for a siege', 'as a way for the old kings to move unseen', 'to hide a smuggling trade under the customs house', 'to keep the plague away, which it did not', 'to bury the old city out of sight'],
        fates: ['the city grew, and nobody remembered where the old tunnels went', 'a flood filled the lower tunnels, and the city stopped sending workers down', 'the thieves\' guild took it over, and the watch learned not to follow', 'the cistern cracked and the tunnels around it were sealed', 'the workers kept finding things down there that they would not talk about', 'the council stopped paying the lamplighters'],
        containers: ['in a smugglers\' chest on a dry ledge', 'in the silt, where the rich quarter\'s drains end', 'in a sack hanging from a hook over the water', 'in a strongbox stolen from the customs house', 'inside a drainpipe, packed with rags to keep it dry', 'on the throne of the master of the place, as a cushion'],
        doing: { folk: [['unaware', 'unloading a boat of crates onto a ledge'], ['ambush', 'waist-deep in the channel, blades under the water'], ['unaware', 'counting stolen purses on a dry step']], beast: [['unaware', 'swarming over a dead dog in the water'], ['ambush', 'under the surface of the channel']] },
        ground: ['A narrow walkway runs along each side of a channel of filthy water 4 feet deep.', 'Brick pillars hold up the roof; each blocks line of sight.', 'An iron grate across the channel can be lowered from a wheel on the wall (an action).', 'The floor is slick: anyone who Dashes makes a {dc:10} {save:dex} saving throw or falls prone.', 'A pipe 3 feet wide leads off the room; Small creatures can crawl through it.', 'A ladder leads up to a street grate, 20 feet above.'],
        hazards: ['The sluice upstream can be opened from the room. A wall of water sweeps down the channel: everyone in or beside it makes a DC {dc} {save:str} saving throw or takes {dmg} bludgeoning damage and is carried 20 feet downstream.', 'The water is foul. Anyone who goes under, or ends a turn in it with an open wound, makes a DC {dc} {save:con} saving throw or catches sewer plague.']
    },
    seacave: {
        label: 'Smugglers\' cave', icon: '🌊', entry: 'bottom', cols: 5, rows: 3, shape: 'cave', door: 'a driftwood door', habitat: 'coast', hoard: 'smugglers',
        bands: ['pirates', 'bandits', 'sahuagin', 'deep', 'hags', 'lizardfolk', 'aberrant', 'undead', 'shadows'],
        names: ['{Root}\'s Cove', 'The {Adj} Grotto', 'The Caves of {Root}', 'The {Epithet} Hole', 'The {Adj} Caverns', 'The Sea Caves under {Root}'],
        epithets: ['Wrecker\'s', 'Mermaid\'s', 'Drowned Bell', 'Gull', 'Black Sail', 'Kraken\'s', 'Lantern'],
        adjs: ['Echoing', 'Booming', 'Tidal', 'Salt', 'Green', 'Hidden', 'Weeping'],
        entrances: [
            { name: 'The sea mouth', text: 'A cave mouth in the cliff that only shows at low tide. A rowing boat is pulled up on the shingle inside.' },
            { name: 'The cliff stair', text: 'Steps cut into the cliff lead down from a clifftop chapel, hidden behind a bramble bush.' },
            { name: 'The blowhole', text: 'A hole in the clifftop that roars when the waves come in. A rope ladder hangs down it, between roars.' },
            { name: 'The fisherman\'s hut', text: 'A tumbledown hut on the beach. Under its floor, a trapdoor and a ladder into the rock.' }
        ],
        rooms: [
            { name: 'The landing', text: 'A beach of black shingle inside the cliff, where boats unload. Lanterns on poles mark the safe way in.' },
            { name: 'The tide pool cave', text: 'Pools of seawater full of crabs and anemones. One pool is much deeper than the others.' },
            { name: 'The storeroom', text: 'Crates, barrels, and bales stacked on a dry shelf of rock, every one marked with a different merchant\'s stamp.' },
            { name: 'The drowned passage', text: 'A tunnel that floods at high tide. A rope runs along the wall for those who have to swim it.' },
            { name: 'The lookout', text: 'A crack in the cliff gives a view of the whole bay. A spyglass sits on a ledge.' },
            { name: 'The crew cave', text: 'Hammocks strung between stalactites, a cold stove, and a game of cards left face up.' },
            { name: 'The wreck cave', text: 'The bow of a ship is wedged into the cave, driven in by a storm long ago. Its figurehead stares at the door.' },
            { name: 'The singing cave', text: 'Wind through the rock makes a long, low note that never quite stops.' },
            { name: 'The barnacle hall', text: 'A cave the sea fills twice a day. Every surface is crusted with barnacles sharp enough to cut.' },
            { name: 'The rum cellar', text: 'Kegs of rum stacked to the ceiling, and a tap in one of them that has been used a lot.' },
            { name: 'The prison cave', text: 'A cave closed off with a grate, where the tide comes up to the knees of whoever is inside.' },
            { name: 'The shell shrine', text: 'A shrine to a sea god built from shells and driftwood. Someone leaves fish here every day.' },
            { name: 'The kelp cave', text: 'Kelp hangs from the roof like curtains, and the floor is slick with it.' },
            { name: 'The signal room', text: 'A lantern with colored glass shutters, pointing out to sea through a hole in the rock.' }
        ],
        ends: [
            { name: 'The captain\'s grotto', text: 'A dry cave furnished with things taken from fine ships: a carpet, a desk, a bed with curtains, and a chair with a view.' },
            { name: 'The sea altar', text: 'A cave open to the sea at one end, where an altar of coral stands at the waterline.' },
            { name: 'The hoard pool', text: 'A pool of still seawater at the heart of the cliff, its bottom paved with coins.' },
            { name: 'The ship\'s graveyard', text: 'A huge cave where the bones of three ships lie heaped together, and something lives in them.' }
        ],
        features: ['A message in a bottle, unopened.', 'Tide marks on the wall, well above head height.', 'A wrecker\'s lantern with a red glass.', 'A crab the size of a shield, dead and hollow.', 'A chart of the coast with the reefs marked in blood.', 'Barrels with false bottoms, one of them open.', 'A ship\'s bell hung from the roof.', 'A pile of nets with something tangled in them.', 'Footprints in the sand, all going in.', 'A carving of a mermaid with a key in her hand.'],
        senses: ['The boom of the waves shakes the rock.', 'Salt spray on every surface.', 'The tide is coming in: you can hear it.', 'It smells of seaweed, tar, and rum.', 'Gulls cry somewhere overhead.', 'Water drips from the roof, salty on the tongue.'],
        builders: ['the sea, over a thousand years', 'smugglers, who widened it a little more every year', 'a coastal tribe who buried their chiefs here', 'wreckers who lured ships onto the rocks', 'a hermit who found it and never told anyone'],
        purposes: ['as a hiding place for smuggled goods', 'as a refuge from the press gangs', 'as a shrine to the sea', 'as a pirate captain\'s secret harbor', 'to hide a ship\'s cargo that was never supposed to be found', 'as a lookout for raiders from the sea', 'as a place to wait out the storms'],
        fates: ['the revenue men found it, and nobody came back for the goods', 'a storm brought down the roof on the old landing', 'the smugglers fell out over shares, and the sea took the losers', 'something came up out of the deep water and claimed it', 'the captain who knew the way in was hanged, and took the secret with them', 'the village above turned honest, mostly'],
        containers: ['in a sea chest chained to the rock', 'in barrels marked SALT that are not salt', 'at the bottom of the hoard pool', 'in the captain\'s cabin of a wrecked ship', 'in oilskin bundles wedged into a crack above the tide line', 'inside the figurehead of a wreck, through a hidden panel'],
        doing: { folk: [['unaware', 'rolling barrels up the beach and singing to keep time'], ['ready', 'with lanterns out over the water, signaling a ship that is not coming'], ['unaware', 'mending nets and talking about the last wreck']], beast: [['unaware', 'feeding in the tide pools'], ['ambush', 'under the water at the edge of the landing']] },
        ground: ['Wet rock everywhere: anyone who Dashes makes a {dc:10} {save:dex} saving throw or falls prone.', 'Seawater 5 feet deep fills half the cave.', 'Barnacles crust the walls; anyone shoved into them takes 1d4 slashing damage.', 'A rowing boat on the shingle can be pushed off into the water as an action.', 'A ledge 10 feet up runs along one side, reached by a rope.', 'Crates and barrels give half cover.'],
        hazards: ['The tide is coming in. Each round, roll a d6: on a 1, a wave surges through, and everyone near the water makes a DC {dc} {save:str} saving throw or takes {dmg} bludgeoning damage and is pulled 10 feet toward the sea.', 'Kegs of rum stand by the wall. Fire that touches them sets them off: everyone within 10 feet makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.']
    },
    shipwreck: {
        label: 'Shipwreck', icon: '⚓', entry: 'top', cols: 4, rows: 3, shape: 'rect', stairs: true, door: 'a plank door', habitat: 'coast', hoard: 'smugglers',
        bands: ['pirates', 'sahuagin', 'deep', 'undead', 'haunt', 'lizardfolk', 'aberrant', 'hags', 'bandits'],
        names: ['The Wreck of the {Epithet}', 'The {Adj} Hulk', 'The {Root} Wreck', 'The Hull of the {Epithet}', 'The Wreck at {Root}', 'The Last Voyage of the {Epithet}'],
        epithets: ['Merry Widow', 'Golden Gull', 'Saint Agnes', 'Sea Wolf', 'Lucky Star', 'Crown of the South', 'Never Again'],
        adjs: ['Broken', 'Drowned', 'Stranded', 'Black', 'Barnacled', 'Burned', 'Listing'],
        entrances: [
            { name: 'The main deck', text: 'The deck lies tilted at a steep angle, slick with weed. The hatch to below hangs open.' },
            { name: 'The hole in the hull', text: 'The rocks tore a hole in the side big enough to walk through at low tide.' },
            { name: 'The broken stern', text: 'The stern snapped off in the wreck. You can climb straight into the decks through the break.' },
            { name: 'The rigging', text: 'The masts lean against the cliff. Climbing down them lands you on the forecastle.' }
        ],
        rooms: [
            { name: 'The gun deck', text: 'A long low deck with cannons that broke loose and slid to one side. Daylight shows through the gunports.' },
            { name: 'The galley', text: 'A cramped kitchen with a stove, pots on hooks, and a barrel of salt pork still sealed.' },
            { name: 'The crew\'s quarters', text: 'Hammocks hang in rows, swaying though there is no wind. Sea chests sit under each.' },
            { name: 'The cargo hold', text: 'Crates and barrels shifted when the ship struck, and lie in a heap against the low side.' },
            { name: 'The flooded hold', text: 'The lowest deck is full of seawater to the knees. Things float in it.' },
            { name: 'The surgeon\'s cabin', text: 'A table with straps, saws on a rack, and jars of things best not looked at.' },
            { name: 'The officers\' mess', text: 'A table bolted to the floor, set for dinner, with the plates slid to one end.' },
            { name: 'The sail locker', text: 'Folded sails, coils of rope, and a nest made out of both.' },
            { name: 'The brig', text: 'Two cells with iron bars. One is open. One is not, and has a skeleton in it.' },
            { name: 'The powder room', text: 'A lead-lined room of powder kegs, mostly soaked. Some of them are dry.' },
            { name: 'The carpenter\'s store', text: 'Tools, nails, and planks for patching the hull, never used in time.' },
            { name: 'The chapel cabin', text: 'A tiny cabin with an altar to a sea god and a hundred knotted prayer cords.' },
            { name: 'The bilge', text: 'The bottom of the ship, a black slot of stinking water and old rats.' },
            { name: 'The navigator\'s cabin', text: 'Charts pinned to every wall, and a compass that still points somewhere, but not north.' }
        ],
        ends: [
            { name: 'The captain\'s cabin', text: 'A fine cabin at the stern, with tall windows, a desk, and a log book open to its last page.' },
            { name: 'The strongroom', text: 'An iron-lined room under the captain\'s cabin, where the ship carried its pay and its secrets.' },
            { name: 'The forbidden hold', text: 'A hold at the bow sealed with chains and warnings in three languages. The chains are broken.' },
            { name: 'The figurehead\'s chamber', text: 'A cabin inside the bow, behind the figurehead. Someone has been living in it.' }
        ],
        features: ['A ship\'s cat\'s skeleton curled in a hammock.', 'A logbook page stuck to the wall with tar.', 'A cannon ball wedged in a beam.', 'Seaweed hanging from the ceiling like a curtain.', 'A sea chest with its owner\'s name carved on it.', 'Crabs everywhere, scuttling away from the light.', 'A ship in a bottle, perfect, of this ship.', 'A barrel that knocks back when you knock on it.', 'Words scratched into a beam: WE SHOULD NOT HAVE TAKEN IT.', 'A porthole full of green light.'],
        senses: ['The hull groans with every wave.', 'The whole wreck tilts underfoot.', 'Water sloshes somewhere below.', 'It smells of rot, tar, and salt.', 'A bell rings somewhere on the ship, once.', 'Something scrapes along the outside of the hull.'],
        builders: ['a shipyard famous for its warships', 'a merchant house that wanted the fastest ship on the sea', 'a navy that sold it on when the war ended', 'pirates who stole it and built it up', 'a shipwright who carved a face like his wife\'s on the bow'],
        purposes: ['to carry gold for a king', 'to carry pilgrims to a holy island', 'to hunt pirates', 'to carry something the crew were told never to look at', 'to trade spices from the far south', 'to carry a royal bride to her wedding', 'to chart a coast that nobody had charted'],
        fates: ['a storm drove it onto the rocks', 'wreckers lured it in with false lights', 'the crew mutinied, and nobody could sail it after', 'something came up out of the sea and held it fast', 'it caught fire with all hands asleep', 'the captain ran it aground on purpose, for reasons in the log'],
        containers: ['in the captain\'s sea chest, under the bunk', 'in the strongroom, in iron-banded boxes', 'in a barrel in the hold marked DRINKING WATER', 'in a waterproof box in the bilge', 'in a hidden compartment behind the captain\'s portrait', 'scattered across the flooded hold floor'],
        doing: { folk: [['unaware', 'prying open crates in the hold with crowbars'], ['ready', 'bailing water and jumping up at the first footstep'], ['unaware', 'reading the captain\'s log out loud, and laughing']], beast: [['unaware', 'nesting in the coiled ropes'], ['ambush', 'clinging to the underside of the deck above']] },
        ground: ['The deck is tilted steeply: anyone moving uphill treats it as difficult terrain.', 'A hatch in the floor drops to the deck below.', 'Loose cannons sit on rails; shoving one ({dc:13} {ability:str}) sends it rolling 20 feet downhill, and it hits for 2d10 bludgeoning.', 'Ropes and nets hang everywhere; anyone can climb them without a check.', 'The far end is flooded to the waist.', 'Barrels and crates give half cover, and roll if pushed.'],
        hazards: ['Powder kegs, some still dry. Fire or lightning sets them off: everyone within 15 feet makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.', 'The wreck shifts. On a round of your choosing, the whole deck lurches: everyone makes a DC {dc} {save:dex} saving throw or slides 10 feet downhill and falls prone, taking {dmg} bludgeoning damage if they hit the wall.']
    },
    lighthouse: {
        label: 'Lighthouse', icon: '🕯️', entry: 'bottom', cols: 2, rows: 6, shape: 'circle', stairs: true, door: 'a salt-stiff door', habitat: 'coast', hoard: 'smugglers',
        bands: ['pirates', 'cult', 'haunt', 'sahuagin', 'bandits', 'aberrant', 'hags', 'shadows', 'elementals'],
        names: ['The {Root} Light', 'The Lighthouse at {Root}', 'The {Adj} Tower', 'The {Epithet} Light', 'The {Adj} Beacon', '{Root} Point'],
        epithets: ['Keeper\'s', 'Widow\'s', 'False', 'Last', 'Drowned Man\'s', 'Seven Wrecks', 'Gull Rock'],
        adjs: ['Dark', 'Lonely', 'Salt', 'Crooked', 'Storm', 'Grey', 'Silent'],
        entrances: [
            { name: 'The causeway door', text: 'A stone causeway leads out to the rock, under water at high tide. The door at the end is bolted from inside.' },
            { name: 'The keeper\'s cottage', text: 'A cottage at the foot of the tower, joined to it by a covered walk. The kettle is on the stove, cold.' },
            { name: 'The boat dock', text: 'A jetty at the foot of the rock, with a boat tied up that is not the keeper\'s.' },
            { name: 'The storm door', text: 'A low iron door on the sea side of the tower, for bringing up supplies by rope from boats.' }
        ],
        rooms: [
            { name: 'The oil store', text: 'Barrels of lamp oil stacked round the wall, and a pump to carry it up the tower.' },
            { name: 'The keeper\'s room', text: 'A bed, a table, a stove, and a log of every ship that passed. The last entries are in another hand.' },
            { name: 'The watch room', text: 'A room with windows on every side and a chair facing the sea. A telescope lies on the floor.' },
            { name: 'The stair landing', text: 'The stair spirals round the wall with nothing in the middle but a long drop.' },
            { name: 'The supply room', text: 'Salt fish, ship\'s biscuit, rope, and wicks enough for a year.' },
            { name: 'The clockwork room', text: 'Brass gears that turn the great lamp, ticking slowly, though the light is out.' },
            { name: 'The storeroom', text: 'Crates stacked to the ceiling, stamped with the marks of ships that never reached port.' },
            { name: 'The library', text: 'A shelf of books on the sea, the stars, and the weather, and a diary that is not the keeper\'s.' },
            { name: 'The wreck room', text: 'Things saved from wrecks: a figurehead, a ship\'s wheel, a chest of tangled jewelry.' },
            { name: 'The water cistern', text: 'A round cistern catching rainwater from the roof. The water is very still.' },
            { name: 'The signal room', text: 'Flags, horns, and a big brass bell for when the fog is too thick for the light.' },
            { name: 'The gallery', text: 'A balcony ringing the tower outside, high over the rocks, with an iron rail half rusted away.' },
            { name: 'The cellar', text: 'Cut into the rock under the tower. The sea can be heard on the other side of the wall.' },
            { name: 'The guest room', text: 'A room for shipwrecked sailors. The bed has been slept in, recently.' }
        ],
        ends: [
            { name: 'The lantern room', text: 'The top of the tower: the great lamp and its lens, glass on every side, and the sea far below.' },
            { name: 'The false light', text: 'The top of the tower, where the lens has been turned to point ships onto the rocks.' },
            { name: 'The storm room', text: 'A room at the top where the wind never stops, and something calls the storms.' },
            { name: 'The keeper\'s hoard', text: 'The room under the lamp, piled with everything the wrecks gave up.' }
        ],
        features: ['A log book with the same ship listed every night for a month.', 'Oil lamps on every wall, all lit.', 'Gull feathers everywhere.', 'A window cracked in a star, from the outside.', 'A coat on a peg, still wet.', 'A portrait of a keeper long dead, looking out to sea.', 'Salt crusted on the walls in strange patterns.', 'A rope tied to the rail and running down out of a window.', 'Bird bones under a gap in the roof.', 'A brass horn with something stuffed down it.'],
        senses: ['The wind howls round the tower.', 'The tower sways a little in the gusts.', 'Waves crash on the rocks below.', 'It smells of whale oil and salt.', 'Gulls scream, then suddenly stop.', 'The great lamp\'s clockwork ticks above you.'],
        builders: ['the harbor guild, after a bad winter of wrecks', 'a queen whose son drowned on this rock', 'dwarves, who built it to last forever', 'a lord who charged every ship a toll for the light', 'the navy, to watch for raiders'],
        purposes: ['to warn ships off the rocks', 'to watch for raiders from the sea', 'to guide ships into a harbor that is gone now', 'to signal to a smuggling fleet', 'as a prison for a keeper nobody wanted on land', 'to hold a light that never goes out', 'to mark a holy island for pilgrim ships'],
        fates: ['the last keeper went mad, and the light went out', 'wreckers took it and turned the light to lure ships in', 'a storm swept the keeper off the gallery', 'the harbor silted up and nobody paid for the oil', 'something came up the rocks one night and took the keeper\'s family', 'the keeper kept lighting it, long after dying'],
        containers: ['in sea chests salvaged from wrecks', 'in the oil barrels, sealed in wax', 'under the floor of the lantern room', 'in the keeper\'s strongbox, under the bed', 'in a crate stamped with a royal seal', 'in a ship\'s figurehead, hollowed out'],
        doing: { folk: [['unaware', 'turning the great lens to face the rocks'], ['ready', 'watching the stair from above, crossbows ready'], ['unaware', 'going through a wrecked ship\'s mail']], beast: [['unaware', 'nesting in the eaves among the gulls'], ['ambush', 'clinging to the wall above the stair']] },
        ground: ['A spiral stair runs round the wall; anyone pushed off it falls to the floor below.', 'The great lens fills the middle of the room. It blocks line of sight, and dazzles anyone who looks into it.', 'Windows on every side, and a drop of 60 feet or more to the rocks.', 'Oil barrels give half cover.', 'A trapdoor in the floor drops to the room below.', 'The wind through the broken windows imposes disadvantage on ranged attacks.'],
        hazards: ['The great lamp is lit. Turning the lens (an action) focuses the light on a 5-foot square: anyone there makes a DC {dc} {save:con} saving throw or is blinded until the end of their next turn.', 'Oil is spilled across the floor. Fire sets it alight: everyone in the room makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.']
    },
    manor: {
        label: 'Haunted manor', icon: '🕰️', entry: 'bottom', cols: 4, rows: 4, shape: 'rect', door: 'a panelled door', habitat: 'dungeon', hoard: 'manor',
        bands: ['haunt', 'vampire', 'undead', 'lies', 'cult', 'necromancer', 'devils', 'shadows', 'wererats'],
        names: ['{Root} Hall', '{Root} Manor', 'The {Adj} House', 'The House of the {Epithet}', '{Root} Grange', 'The {Adj} Manse'],
        epithets: ['Weeping Bride', 'Seven Clocks', 'Last Guest', 'Mad Uncle', 'Twin Sisters', 'Locked Room', 'Hollow Heir'],
        adjs: ['Shuttered', 'Silent', 'Crooked', 'Empty', 'Grey', 'Rotting', 'Whispering'],
        entrances: [
            { name: 'The front door', text: 'A grand door under a portico. It opens before anyone knocks.' },
            { name: 'The kitchen door', text: 'The servants\' way in, round the back, past a kitchen garden gone to thistles.' },
            { name: 'The conservatory', text: 'A glass room full of dead plants. One pane is broken out, just big enough to climb through.' },
            { name: 'The cellar hatch', text: 'A slanting wooden hatch beside the house, chained shut. The chain has been cut.' }
        ],
        rooms: [
            { name: 'The entrance hall', text: 'A grand staircase, a chandelier under a dust sheet, and a grandfather clock that has stopped.' },
            { name: 'The ballroom', text: 'A long room with a sprung floor and mirrors on every wall. The mirrors show dancers.' },
            { name: 'The dining room', text: 'A table laid for twelve, with name cards. One card has the name of someone in the party.' },
            { name: 'The library', text: 'Two floors of books, a rolling ladder, and a reading chair still dented from its last reader.' },
            { name: 'The nursery', text: 'A rocking horse, a doll\'s house of this very house, and a cot that rocks by itself.' },
            { name: 'The music room', text: 'A harpsichord with its lid open. Someone has been practicing the same three notes.' },
            { name: 'The servants\' hall', text: 'A long table for the staff, and a board of bells, one for each room. A bell rings.' },
            { name: 'The kitchen', text: 'A huge range, copper pans, and a pie on the table that is still warm.' },
            { name: 'The master bedroom', text: 'A four-poster bed hung with black curtains, and a dressing table covered in letters.' },
            { name: 'The portrait gallery', text: 'Generations of the family, each portrait with the eyes cut out.' },
            { name: 'The conservatory', text: 'Glass on every side, and plants grown over everything. Some of the plants have grown over people.' },
            { name: 'The study', text: 'A desk with a half-written letter, and a safe in the wall behind a painting.' },
            { name: 'The wine cellar', text: 'Racks of dusty bottles, and a wall that sounds hollow when knocked.' },
            { name: 'The attic', text: 'Trunks, broken furniture, dress dummies, and a little window that looks out on the wrong season.' }
        ],
        ends: [
            { name: 'The locked room', text: 'A bedroom nobody has opened in forty years, kept exactly as it was the night it happened.' },
            { name: 'The family chapel', text: 'A small chapel at the back of the house, with the family vault beneath it, and the vault door open.' },
            { name: 'The secret study', text: 'A hidden room behind the library, full of the master of the house\'s real work.' },
            { name: 'The ballroom\'s heart', text: 'A second ballroom, behind the first, where the last party never ended.' }
        ],
        features: ['A grandfather clock that strikes thirteen.', 'Dust sheets over every piece of furniture, and one of them moves.', 'Wet footprints that cross the room and stop at a wall.', 'A painting whose subject is not where it was.', 'A music box that starts playing as the party enters.', 'Letters on a desk, all addressed to someone in the party.', 'A doll sitting in a chair, facing the door.', 'Candles in every window, unlit, but warm.', 'A bell pull that rings in a room nobody is in.', 'A child\'s height marks on a doorframe, stopping suddenly.'],
        senses: ['Floorboards creak somewhere above.', 'The house smells of lilies and damp.', 'A door closes softly somewhere in the house.', 'It\'s colder inside than out.', 'Faint music, and laughter, from far away.', 'A clock ticks, though none here are wound.'],
        builders: ['a merchant family who made their money in something they never talked about', 'a lord who built it for a bride who never came', 'a retired general who never stopped fighting', 'a famous actress at the height of her fame', 'a family of witches, posing as gentry'],
        purposes: ['as a country seat for a rich family', 'as a summer house, far from the city\'s fevers', 'to hide a mad relative from the world', 'as a place for parties the whole county talked about', 'to keep a family secret safe', 'as a gift to a bride', 'as a hospital for soldiers back from a war'],
        fates: ['the family died one by one, in the same room', 'the last party ended in a murder that was never solved', 'the heir vanished, and the will was never read', 'the servants left in a single night, and would never say why', 'a fire gutted the east wing, and the family moved out of the rest', 'the master of the house made a bargain, and the bill came due'],
        containers: ['in the wall safe behind the painting', 'under the floorboards of the locked room', 'in the family vault under the chapel', 'in a trunk in the attic, under the wedding dress', 'in the dining table\'s hidden drawer', 'in the grandfather clock\'s case'],
        doing: { folk: [['unaware', 'setting the dining table for guests who are never coming'], ['ready', 'standing on the stair, as if they were expecting the party for dinner'], ['unaware', 'searching the walls for a hidden door, knocking on every panel']], beast: [['unaware', 'nesting in the rotten furniture'], ['ambush', 'under the dust sheets, perfectly still']] },
        ground: ['A grand stair climbs to a gallery 15 feet up.', 'Dust sheets hide the furniture; anything could be under any of them.', 'A chandelier hangs over the middle of the room.', 'Tall mirrors on every wall: invisible things show in them.', 'The floor is polished smooth: anyone who Dashes makes a {dc:10} {save:dex} saving throw or falls prone.', 'Heavy curtains can be pulled to let in daylight or shut it out (an action).'],
        hazards: ['The house fights back. Once a round, a piece of furniture flies at a random creature: +5 to hit, {dmg} bludgeoning damage.', 'The mirrors shatter when anything breaks one: everyone within 10 feet of the walls makes a DC {dc} {save:dex} saving throw or takes {dmg} slashing damage.']
    },
    barrow: {
        label: 'Barrow mound', icon: '⛰️', entry: 'top', cols: 4, rows: 3, shape: 'mixed', door: 'a stone slab', habitat: 'hills', hoard: 'tomb',
        bands: ['undead', 'haunt', 'tomb', 'clans', 'weres', 'wolves', 'hags', 'burrowers', 'spiders', 'necromancer'],
        names: ['{Root}\'s Howe', 'The Barrow of the {Epithet}', 'The {Adj} Mound', '{Root} Barrow', 'The Howe of the {Epithet}', 'The {Adj} Barrows'],
        epithets: ['Ring-Giver', 'Wolf King', 'Sleeping Chief', 'Nine Shields', 'Ship-Burned', 'Oath-Breaker', 'Grey Spear'],
        adjs: ['Grass', 'Long', 'Green', 'Grey', 'Wind', 'Old', 'Hollow'],
        entrances: [
            { name: 'The forecourt', text: 'Standing stones flank a passage into the side of the mound. The capstone over the door is carved with a warning in old runes.' },
            { name: 'The robbers\' hole', text: 'Someone dug down through the top of the mound. The hole goes straight into a chamber, and someone has tied a rope there.' },
            { name: 'The sunken door', text: 'A slab of stone at the end of a sunken path, rolled aside. Turf has been carefully laid back over the path.' },
            { name: 'The blocked passage', text: 'The passage in was blocked with stones, long ago. Something has pulled the stones out, from inside.' }
        ],
        rooms: [
            { name: 'The long passage', text: 'A low passage lined with standing slabs, carved with spirals and long-legged beasts.' },
            { name: 'The side chamber', text: 'A small round chamber with three stone ledges, each holding a body in a cloak of furs.' },
            { name: 'The horse burial', text: 'The bones of horses, still in their harness, laid out as if they were pulling something.' },
            { name: 'The warriors\' chamber', text: 'Warriors buried sitting up, with spears across their knees. Some are sitting up a little too straight.' },
            { name: 'The grave goods', text: 'Pots, beads, combs, and a little wooden boat, left for the dead to take with them.' },
            { name: 'The root cave', text: 'The roots of an old tree break through the roof, wrapping round the bones below.' },
            { name: 'The fire pit', text: 'A ring of blackened stones where the funeral feast was cooked, and the bones of the feast.' },
            { name: 'The ship burial', text: 'The ribs of a buried ship, its planks long rotted, with the shape of a body at the stern.' },
            { name: 'The dog graves', text: 'Small barrows within the barrow, for the chief\'s hounds. One of them is empty.' },
            { name: 'The carved chamber', text: 'Every stone is carved with the story of the chief\'s life, and the last stone with how it ended.' },
            { name: 'The collapsed chamber', text: 'Half of this chamber has fallen in. Under the rubble, a gauntleted hand.' },
            { name: 'The well of bones', text: 'A shaft in the floor, packed with the bones of animals sacrificed at the funeral.' },
            { name: 'The guardian\'s niche', text: 'A deep niche facing the passage, where a single warrior was buried standing up, to watch.' },
            { name: 'The earth chamber', text: 'A chamber dug from the earth itself, with no stones at all. It is warm, and smells of turned soil.' }
        ],
        ends: [
            { name: 'The chief\'s chamber', text: 'A great round chamber where the chief lies on a stone bed under a heap of furs, crowned and armed.' },
            { name: 'The ring hall', text: 'A round hall where the chief sits on a stone chair, ringed by the dead of the chief\'s household.' },
            { name: 'The ship of the dead', text: 'A ship buried whole under the mound, its deck heaped with grave goods, its captain at the helm.' },
            { name: 'The oath stone', text: 'A chamber around a standing stone, where the chief\'s warriors swore to guard the barrow forever, and meant it.' }
        ],
        features: ['A carved stone of a wolf eating the sun.', 'Grave goods knocked over, as if by someone in a hurry.', 'Fresh flowers on a stone shelf.', 'Old turf stacked against a wall, as if someone is rebuilding.', 'A rusted sword driven into the floor.', 'Animal skulls set in a row along a ledge.', 'A circle of white pebbles on the floor.', 'Roots that twitch when touched.', 'An ancient comb carved with a woman\'s face.', 'A horn hung on a hook, as if for calling someone back.'],
        senses: ['It smells of earth and old smoke.', 'The air is very still.', 'Somewhere, soil trickles down from the roof.', 'A low hum, like many voices far away.', 'Your breath fogs, though it is summer outside.', 'The wind moans over the mound above.'],
        builders: ['the people of the hills, for their greatest chief', 'a clan that came by sea and stayed', 'a warband, for the leader they swore to follow into death', 'the first farmers of these lands', 'a queen, for the husband she buried alive'],
        purposes: ['to bury a chief with their warriors and their wealth', 'to hold the dead of a great battle', 'as a gate between the living and the dead', 'to mark the land as theirs forever', 'to keep a dead king from walking', 'as a place to ask the ancestors for advice', 'to bury a hero with the weapon that slew a dragon'],
        fates: ['the clan that tended it died out, and the grass grew over it', 'robbers dug in and woke the dead', 'the farmers ploughed round it for a thousand years, and then someone ploughed into it', 'the dead chief\'s oath outlived the living', 'a hill giant used it as a pillow', 'the barrow was sealed, and then something dug its way in'],
        containers: ['on the chief\'s stone bed, around the body', 'heaped in the ship of the dead', 'in clay pots buried in the floor', 'in a chest of rotted oak bound with bronze', 'on the bodies of the household dead', 'under the oath stone'],
        doing: { folk: [['unaware', 'digging into a side chamber with shovels'], ['ready', 'standing guard in a ring around the chief\'s bed'], ['unaware', 'burning offerings and chanting old words']], beast: [['unaware', 'sleeping in a heap of furs and bones'], ['ambush', 'buried in the loose earth at the edges of the chamber']] },
        ground: ['The ceiling is low: Large creatures squeeze, and have disadvantage on attack rolls.', 'Stone shelves along the walls hold bodies, and give half cover to anyone who climbs onto one.', 'A ring of standing stones fills the middle of the chamber; each blocks line of sight.', 'Earth falls from the roof in places, making difficult terrain.', 'The floor is heaped with grave goods: difficult terrain, and loud to move through.', 'A stone bed stands in the middle, 3 feet high.'],
        hazards: ['The roof is old turf on rotten timbers. Anything that deals thunder damage here brings part of it down: everyone in a 10-foot square makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage.', 'The dead\'s oath fills the air. Anyone who takes something from the barrow makes a DC {dc} {save:wis} saving throw or takes {dmg} necrotic damage; half damage on a success.']
    }
});
// The kinds a random roll picks from first: the seven there were before the rest were
// added (2026-10-20), so a link that rolled a random kind still rolls the same one most of
// the time. siteMoreKind may then swap it for one of the newer kinds, under its own seed.
const SITE_KIND_FIRST = ['crypt', 'mine', 'tower', 'temple', 'fort', 'lair', 'keep'];
const SITE_KIND_KEYS = Object.keys(SITE_KINDS);

// One feature every room can have, besides its own kind's.
const SITE_FEATURES = ['A table covered in old maps, all of the same place.', 'A chest that is empty except for a note: "Too late."', 'A well-made trap, already sprung, with nothing in it.', 'Old graffiti: a crude map, a joke, and a warning.', 'A skeleton sitting against the wall, holding a lantern.', 'A pile of rubble hiding a crawlspace.', 'A cracked mirror that shows the room as it was long ago.', 'A fresh bootprint in the dust, too small for a human.', 'A rope hanging from a hole in the ceiling.', "A circle of salt on the floor, broken in one place.", 'A rack of torches, two of them lit.', 'A message in chalk: "Second door. Not the first."', 'A dead adventurer with an empty pack and a full waterskin.', 'A statue whose pointing hand has been moved.', 'A heap of old campaign gear: a bedroll, a dented pot, a lute with two strings.', 'A stone with a hollow under it, as if for hiding things.', 'A wanted poster for someone in the party, nailed up recently.', 'A child\'s drawing of this very room, with a monster in it.', 'Three coins balanced on top of each other on the floor.', 'A scorch mark on the wall in the shape of a person.', 'A bucket of clean water, still cold.', 'A rusted helmet with a bird\'s nest in it.', 'Torn pages from a prayer book scattered across the floor.', 'A tripwire, cut, with the bell still attached.', 'A crude arrow scratched on the floor, pointing back the way you came.', 'A pair of boots by the wall, neatly placed, with nobody in them.'];
const SITE_SENSES = ['Utter silence, as if the room is holding its breath.', 'A cold spot in the middle of the room.', 'A faint smell of smoke, from somewhere.', 'Your footsteps echo too long.', 'Something small scurries away out of the light.'];
// E2's newer senses swap in by their share after the draw (rollSite), so old seeds keep which rooms have one.
const SITE_SENSES_MORE = ['A draft carries a smell of cooking from somewhere further in.', 'Your torch flame leans toward one wall.', 'A distant knocking, three times, then nothing.', 'The dust here has been disturbed, recently.', 'Faint voices, too far off to make out the words.', 'The air tastes stale, as if nobody has breathed it in years.', 'A slow drip, and an echo that does not match it.'];

// What the foes in a room are doing when the party arrives. by: who acts like this
// (folk: those who think and talk; beast: animals and monsters; mindless: undead,
// constructs, oozes, elementals). seen: who notices whom (SITE_AWARE).
const SITE_DOING = {
    folk: [['ready', 'waiting for the party: they heard them coming'], ['unaware', 'eating, and arguing over who gets the last of it'], ['unaware', 'asleep, apart from one on watch who is nodding off'], ['ambush', 'hiding behind the door, weapons ready'], ['unaware', 'counting loot and accusing each other of cheating'], ['unaware', 'patching up their wounds from some earlier fight'], ['ready', 'building a barricade across the far door'], ['unaware', 'gambling with knucklebones'], ['ready', 'on patrol, and walking straight into the party'], ['unaware', 'interrogating a prisoner'], ['ambush', 'perched up high, waiting to drop on whoever comes in'], ['unaware', 'sharpening blades and complaining about the pay'], ['ready', 'shouting at each other about a noise they heard, weapons already out'], ['unaware', 'dragging a heavy chest across the floor, and making a lot of noise about it'], ['unaware', 'holding a mock trial for one of their own, who is losing'], ['ambush', 'pressed flat against the walls on either side of the door'], ['unaware', 'drunk, and singing a song about their leader that their leader would not like'], ['unaware', 'cooking something that smells far better than it should'], ['ambush', 'pretending to be prisoners, chained loosely to the wall'], ['unaware', 'trying on a dead adventurer\'s clothes'], ['ready', 'drawing lots for who goes to see what the noise was, when the noise walks in']],
    beast: [['unaware', 'feeding on a kill'], ['unaware', 'asleep in a heap'], ['ambush', 'hiding in the shadows near the ceiling'], ['ready', 'pacing, hungry, and already sniffing the air'], ['unaware', 'guarding a nest'], ['ambush', 'lying perfectly still, half buried in the debris'], ['ready', 'circling, ears up: they heard the party'], ['unaware', 'grooming one another'], ['ambush', 'clinging to the walls high above the door'], ['ready', 'fighting each other over a bone, until they smell the party'], ['unaware', 'dozing in a patch of warmth'], ['unaware', 'dragging something heavy toward the back of the room'], ['ambush', 'waiting just around the corner, crouched low'], ['ready', 'standing over a fresh kill, hackles up']],
    mindless: [['ready', 'standing in rows, waiting for an order that never came'], ['ambush', 'lying still among the debris until someone comes close'], ['ready', 'shuffling in circles, and they turn as one when the party enters'], ['unaware', 'going through the motions of a task they were made for'], ['ambush', 'hidden in alcoves along the walls'], ['unaware', 'scraping at a wall as if trying to get through it'], ['ready', 'facing the door, perfectly still, as if they knew'], ['unaware', 'carrying stones from one side of the room to the other, and back'], ['ambush', 'slumped in the darkest corner, not moving until something warm comes close'], ['unaware', 'standing round a cold table or altar, heads bowed']]
};
const SITE_MINDS = { humanoid: 'folk', giant: 'folk', fiend: 'folk', dragon: 'folk', fey: 'folk', celestial: 'folk', undead: 'mindless', construct: 'mindless', ooze: 'mindless', elemental: 'mindless' };
const SITE_AWARE = {
    ready: "They're ready: no one is surprised.",
    unaware: "They haven't noticed the party. Sneak in with Stealth against their passive Perception, and anyone who isn't noticed gets the jump on them.",
    ambush: "They're hidden. Roll their Stealth against each character's passive Perception: anyone who doesn't notice them is surprised in the first round."
};

// Room traps. trigger: what sets it off. effect: {dc} {dmg} filled by the site's level.
// kinds: only in these kinds (absent = anywhere). disarm: how to stop it ({dc}).
const SITE_TRAPS = ruleTable([
    { name: 'Hidden pit', trigger: 'A false floor in the middle of the room hides a 20-foot pit.', disarm: 'wedge the lid shut with iron spikes (no check)', effect: 'DC {dc} {save:dex} saving throw or fall in and take {dmg} bludgeoning damage.' },
    { name: 'Poison darts', trigger: 'Pressure plates in the floor fire darts from holes in the walls.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|}, or stuff the holes with cloth", effect: 'DC {dc} {save:dex} saving throw or take {dmg} poison damage; half damage on a success.' },
    { name: 'Scything blade', trigger: 'A tripwire across the doorway swings a blade out of the wall.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to cut the wire safely", effect: 'DC {dc} {save:dex} saving throw or take {dmg} slashing damage; half damage on a success.' },
    { name: 'Collapsing ceiling', trigger: 'Rotten supports hold up the ceiling; a tripwire pulls them out.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} on the wire", effect: 'Everyone in the room makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage; half damage on a success. The rubble is difficult terrain afterwards.' },
    { name: 'Gas vent', trigger: 'A cracked seal on the floor releases a cloud of yellow gas when stepped on.', disarm: 'plug the vent with wax or mud (no check, once found)', effect: 'Everyone within 10 feet makes a DC {dc} {save:con} saving throw or takes {dmg} poison damage and is poisoned for 1 minute; half damage and not poisoned on a success.' },
    { name: 'Spear floor', trigger: 'A loose flagstone drops an inch, and spears jab up through holes in the floor.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to jam the mechanism", effect: 'DC {dc} {save:dex} saving throw or take {dmg} piercing damage; half damage on a success.' },
    { name: 'Falling net', trigger: 'A tripwire drops a weighted net from the ceiling.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to cut the wire", effect: 'Everyone in a 10-foot square makes a DC {dc} {save:dex} saving throw or is restrained. A {dc:10} {ability:str} check (or cutting the net: AC 10, 20 hit points) frees a creature. Anything in the room hears it fall.' },
    { name: 'Alarm', trigger: 'A thin wire across the floor rings a bell somewhere deeper in.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|}, or step over it once it's found", effect: 'Every fight in the next two rooms is ready and waiting: no one there is surprised.' },
    { name: 'Rolling stone', trigger: 'A pressure plate releases a stone ball down a sloping passage into the room.', kinds: ['crypt', 'temple', 'mine', 'lair', 'keep', 'barrow'], disarm: 'wedge an iron spike under the plate (DC {dc} {ability:dex:thievery} check{alt: with thieves\' tools|})', effect: 'Everyone in its path makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is knocked prone.' },
    { name: 'Fire glyph', trigger: 'A glyph carved on the threshold bursts into flame when crossed.', kinds: ['crypt', 'tower', 'temple', 'keep', 'manor', 'barrow'], disarm: 'DC {dc} {skill:int:arcana} check to smudge it out safely, or dispel magic', effect: 'Everyone within 10 feet makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.' },
    { name: 'Lightning rune', trigger: 'A rune on the door handle discharges into whoever grabs it.', kinds: ['tower', 'temple', 'lighthouse', 'manor'], disarm: 'DC {dc} {skill:int:arcana} check, or open it with something that does not conduct', effect: 'DC {dc} {save:dex} saving throw or take {dmg} lightning damage; half damage on a success.' },
    { name: 'Whispering face', trigger: 'A carved face on the wall speaks a word that bites into the mind of whoever looks at it.', kinds: ['crypt', 'tower', 'temple', 'manor', 'barrow'], disarm: 'cover the face with cloth (no check, once found)', effect: 'DC {dc} {save:wis} saving throw or take {dmg} psychic damage and be frightened of the face until the end of the next turn.' },
    { name: 'Flooding room', trigger: 'The door slams shut behind the party and water pours in from vents.', kinds: ['crypt', 'temple', 'mine', 'sewer', 'seacave', 'shipwreck'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} on the door mechanism", effect: 'The room fills in 4 rounds, and then everyone must hold their breath. Forcing the door takes a DC {dc} {skill:str:athletics} check.' },
    { name: 'Rotten planks', trigger: 'Planks laid over an old shaft give way under the first one across.', kinds: ['mine', 'lair', 'keep', 'fort', 'lighthouse', 'manor'], disarm: 'test the floor with a pole (no check, once found)', effect: 'DC {dc} {save:dex} saving throw to grab the edge, or fall 30 feet and take {dmg} bludgeoning damage.' },
    { name: 'Dropping portcullis', trigger: 'A portcullis crashes down behind the first one through, splitting the party.', kinds: ['fort', 'keep'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to jam the winch", effect: 'DC {dc} {save:dex} saving throw or take {dmg} piercing damage as it slams down. Lifting it again takes a {dc:20} {ability:str} check.' },
    { name: 'Boiling oil', trigger: 'Murder holes over the doorway pour hot oil on whoever is under them.', kinds: ['fort', 'keep', 'lighthouse'], disarm: 'stand clear of the doorway (no check, once found)', effect: 'DC {dc} {save:dex} saving throw or take {dmg} fire damage; half damage on a success.' },
    { name: 'Bad air', trigger: 'A pocket of foul air sits low in the room. Lit flames gutter in it.', kinds: ['mine', 'lair', 'sewer', 'barrow', 'seacave'], disarm: 'fan it out, or hold your breath across (no check, once found)', effect: 'Everyone who breathes it makes a DC {dc} {save:con} saving throw or gains a level of exhaustion.' },
    { name: 'Poison needle', trigger: 'A needle springs out of the lock of a chest or a door handle.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|}", effect: 'The one who touched it takes 1 piercing damage and {dmg} poison damage, and makes a DC {dc} {save:con} saving throw or is poisoned for 1 hour.' },
    { name: 'Sleep gas', trigger: 'A flagstone sinks when stepped on, and a sweet-smelling mist hisses from the walls.', disarm: 'plug the jets with wax or cloth (no check, once found)', effect: 'Everyone in the room makes a DC {dc} {save:con} saving throw or falls unconscious for 10 minutes, waking if they take damage or someone shakes them.' },
    { name: 'Hidden crossbows', trigger: 'A tripwire fires a row of crossbows hidden behind a hanging or a stack of crates.', kinds: ['fort', 'keep', 'manor', 'seacave', 'sewer', 'lighthouse'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to cut the wire safely", effect: 'Everyone in a 30-foot line makes a DC {dc} {save:dex} saving throw or takes {dmg} piercing damage; half damage on a success.' },
    { name: 'Crushing walls', trigger: 'The doors slam and lock, and the side walls start to grind inward.', kinds: ['crypt', 'temple', 'tower', 'barrow'], disarm: 'DC {dc} {skill:int:investigation} check to find the lever that stops them', effect: 'The walls meet in 4 rounds. After that, anyone still inside takes {dmg} bludgeoning damage each round. Holding them back takes a DC {dc} {skill:str:athletics} check each round.' },
    { name: 'Pendulum blades', trigger: 'Three great blades swing across the room on a steady beat.', kinds: ['crypt', 'temple', 'keep', 'manor'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} on the drum behind the wall, or time the run with a DC {dc} {skill:dex:acrobatics} check", effect: 'Anyone who crosses without timing it makes a DC {dc} {save:dex} saving throw or takes {dmg} slashing damage.' },
    { name: 'Collapsing stair', trigger: 'The steps fold flat into a slope when a hidden catch is stepped on.', kinds: ['tower', 'keep', 'manor', 'lighthouse', 'shipwreck'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to pin the catch", effect: 'Everyone on the stair makes a DC {dc} {save:dex} saving throw or slides to the bottom, taking {dmg} bludgeoning damage and landing prone.' },
    { name: 'Falling chandelier', trigger: 'A tripwire lets a great iron chandelier drop into the middle of the room.', kinds: ['keep', 'manor'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|}, or tie off the rope (no check, once found)", effect: 'Everyone under it makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage; half damage on a success.' },
    { name: 'Mirror of dread', trigger: 'A tall mirror shows each viewer their own death.', kinds: ['manor', 'tower'], disarm: 'cover or turn the mirror (no check, once found)', effect: 'Everyone who looks into it makes a DC {dc} {save:wis} saving throw or is frightened for 1 minute, repeating the save at the end of each of their turns.' },
    { name: 'Grave curse', trigger: 'A curse-stone set into the floor sours the luck of whoever steps on it.', kinds: ['barrow', 'crypt'], disarm: 'DC {dc} {skill:int:religion} check to quiet it with the right prayers', effect: 'DC {dc} {save:wis} saving throw or have disadvantage on attack rolls and saving throws until a long rest, or until remove curse ends it.' },
    { name: 'Sluice surge', trigger: 'A chain across the floor opens a sluice gate upstream when pulled or tripped over.', kinds: ['sewer'], disarm: 'tie the chain off (no check, once found)', effect: 'A wall of filthy water crashes through: DC {dc} {save:str} saving throw or take {dmg} bludgeoning damage and be swept 30 feet down the channel, prone.' },
    { name: 'Sewer gas', trigger: 'Foul gas collects under the roof, waiting for a spark.', kinds: ['sewer', 'seacave', 'mine'], disarm: 'put out every flame before going in (no check, once found)', effect: 'If a flame comes in, everyone in the room makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.' },
    { name: 'Tide grate', trigger: 'A loose grate in the floor lets the sea in, fast, the moment its pin is knocked out.', kinds: ['seacave', 'shipwreck', 'lighthouse'], disarm: 'wedge the pin back in (DC {dc} {ability:str} check)', effect: 'The room fills over 5 rounds. Swimming out against the rush takes a DC {dc} {skill:str:athletics} check; anyone who fails is swept back in and starts to drown.' },
    { name: 'Rotten deck', trigger: 'The boards in the middle of the room are soft as bread.', kinds: ['shipwreck'], disarm: 'walk along the beams at the edge (no check, once found)', effect: 'The first creature over them makes a DC {dc} {save:dex} saving throw or falls through to the deck below, taking {dmg} bludgeoning damage.' },
    { name: 'Burning lens', trigger: 'A lever swings a great lens round to focus the light on the doorway.', kinds: ['lighthouse'], disarm: 'DC {dc} {ability:str} check to jam the lens, or cover it (no check, once found)', effect: 'Everyone in a 5-foot-wide line across the room makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.' }
]);
// ── Third pass (R6). More traps and boss-room hazards. Each swaps in under a seed of its own
// (trap.<room>.more, ground.more), by its share of the whole list, so an old link keeps its rooms.
const SITE_TRAPS_MORE = ruleTable([
    { name: 'Acid jar', trigger: 'A jar of acid balanced over the door tips onto whoever opens it.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to lift the jar down, or push the door open with a pole (no check, once found)", effect: 'DC {dc} {save:dex} saving throw or take {dmg} acid damage; half damage on a success.' },
    { name: 'Tilting floor', trigger: 'A slab of floor tips on a pivot when weight reaches its middle, sliding whoever is on it toward a spiked trench.', disarm: 'wedge the pivot with iron spikes (no check, once found)', effect: 'Everyone on the slab makes a DC {dc} {save:dex} saving throw or slides into the trench and takes {dmg} piercing damage.' },
    { name: 'Locking door', trigger: 'The door swings shut and bolts itself once the last creature is through.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to jam the bolt open", effect: "It hurts nobody, but it shuts the party in. Picking the lock takes a DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|}; breaking the door takes a DC {dc} {skill:str:athletics} check, and everything nearby hears it." },
    { name: 'Spiked ceiling', trigger: 'A false ceiling studded with spikes drops 5 feet when a plate in the floor is stepped on.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to jam the plate", effect: 'Everyone in a 10-foot square makes a DC {dc} {save:dex} saving throw or takes {dmg} piercing damage; half damage on a success.' },
    { name: 'Blinding powder', trigger: 'Bellows hidden in the wall blow out a cloud of pepper and chalk when a loose stone is stepped on.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to cut the bellows hose", effect: 'Everyone within 10 feet makes a DC {dc} {save:con} saving throw or is blinded for 1 minute, repeating the save at the end of each of their turns.' },
    { name: 'Snare', trigger: 'A noose hidden in the dust yanks whoever steps in it up toward the ceiling.', disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|}, or set it off with a pole (no check, once found)", effect: 'DC {dc} {save:dex} saving throw or be hauled up by one ankle and restrained, hanging 10 feet up. A DC {dc} {ability:str} check, or cutting the rope, frees them, and they fall.' },
    { name: 'Thunder stone', trigger: 'A stone in the floor booms like a great drum when stepped on.', disarm: 'DC {dc} {skill:int:arcana} check to quiet it, or step round it (no check, once found)', effect: 'Everyone within 10 feet makes a DC {dc} {save:con} saving throw or takes {dmg} thunder damage and is deafened for 1 minute; half damage and not deafened on a success. Everything nearby hears it.' },
    { name: 'Grasping hands', trigger: 'Bony arms burst out of the floor when someone walks the middle of the room.', kinds: ['crypt', 'barrow', 'temple'], disarm: 'DC {dc} {skill:int:religion} check to speak the rite that keeps them still', effect: 'DC {dc} {save:str} saving throw or be grappled and restrained until the creature escapes (DC {dc} {skill:str:athletics}) or the arms are broken (AC 12, 10 hit points).' },
    { name: 'Grave dust', trigger: 'Lifting the lid of a sarcophagus breaks a seal, and a cloud of black dust pours out.', kinds: ['crypt', 'barrow', 'temple'], disarm: 'open it from a distance with a rope (no check, once found)', effect: 'Everyone within 10 feet makes a DC {dc} {save:con} saving throw or takes {dmg} necrotic damage; half damage on a success.' },
    { name: 'Cave-in', trigger: 'A rope across the tunnel at ankle height is tied to the one prop holding up the roof.', kinds: ['mine', 'lair', 'barrow'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to untie it without pulling", effect: 'Everyone in a 10-foot square makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is buried (restrained) until dug out; half damage and not buried on a success.' },
    { name: 'Teleport circle', trigger: 'A faint circle on the floor sends whoever steps into it somewhere else in the place.', kinds: ['tower', 'temple', 'manor'], disarm: 'DC {dc} {skill:int:arcana} check to break the circle, or dispel magic', effect: "DC {dc} {save:wis} saving throw or be teleported, alone, to another room of the DM's choosing." },
    { name: 'Frost sigil', trigger: 'A rime-white sigil painted on a step freezes the air around whoever treads on it.', kinds: ['tower', 'temple', 'keep'], disarm: 'DC {dc} {skill:int:arcana} check to scrape it out safely, or dispel magic', effect: 'Everyone within 10 feet makes a DC {dc} {save:con} saving throw or takes {dmg} cold damage and has their speed halved until the end of their next turn; half damage and no slowing on a success.' },
    { name: 'Offering bowl', trigger: "A bronze bowl stands before the altar. Taking anything from the room without leaving a coin in it calls down the god's anger.", kinds: ['temple', 'crypt'], disarm: 'leave a coin in the bowl (no check, once understood)', effect: 'The thief makes a DC {dc} {save:wis} saving throw or takes {dmg} radiant damage; half damage on a success.' },
    { name: 'Caltrop floor', trigger: 'The straw on the floor hides a scatter of caltrops.', kinds: ['fort', 'keep', 'lair'], disarm: 'sweep a path clear (no check, once found)', effect: 'Anyone who moves through at more than half speed makes a DC {dc} {save:dex} saving throw or takes {dmg} piercing damage and has their speed reduced by 10 feet until they regain a hit point.' },
    { name: 'Trapdoor floor', trigger: 'The middle of the passage is one big trapdoor, held by a bolt that gives under the weight of two people.', kinds: ['fort', 'keep', 'manor'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to pin the hinges", effect: 'Everyone on it makes a DC {dc} {save:dex} saving throw or falls 20 feet into a locked cell below, taking {dmg} bludgeoning damage.' },
    { name: 'Bone rattle', trigger: 'Strings of old bones hang across the way and rattle at the lightest touch.', kinds: ['lair', 'barrow', 'seacave'], disarm: 'DC {dc} {skill:dex:stealth} check to hold them still and slip through', effect: 'Whatever lives here knows the party is coming: the fight in the last room is ready and waiting, and no one there is surprised.' },
    { name: 'Deadfall', trigger: 'A heavy log hangs over the way in, held up by a cord across the floor.', kinds: ['lair', 'mine', 'fort'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to tie off the cord", effect: 'DC {dc} {save:dex} saving throw or take {dmg} bludgeoning damage and be knocked prone; half damage and not prone on a success.' },
    { name: 'Slick ledge', trigger: 'The ledge beside the channel is coated in slime, and narrows at a bend.', kinds: ['sewer', 'seacave'], disarm: 'rope everyone together (no check, once found)', effect: 'Each creature that crosses makes a DC {dc} {save:dex} saving throw or slips into the water, takes {dmg} bludgeoning damage on the rocks, and is carried 20 feet along.' },
    { name: 'Kelp snare', trigger: 'Kelp grows thick in a flooded stretch of floor and wraps the legs of anyone who wades in.', kinds: ['seacave', 'shipwreck'], disarm: 'cut a path through with blades (no check, once found)', effect: 'DC {dc} {save:str} saving throw or be restrained and pulled under, and start to drown. A DC {dc} {skill:str:athletics} check, or cutting the kelp (AC 10, 10 hit points), frees a creature.' },
    { name: 'Shifting cargo', trigger: 'Crates stacked to the beams are held up by a single rotten strap.', kinds: ['shipwreck', 'seacave', 'fort'], disarm: 'lash the stack with fresh rope (no check, once found)', effect: 'Everyone within 10 feet of the stack makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is pinned (restrained) under the crates; half damage and not pinned on a success.' },
    { name: 'Gale shutter', trigger: 'Opening the door throws open a shutter on the far wall, and the wind tears through.', kinds: ['lighthouse', 'tower'], disarm: "DC {dc} {ability:dex:thievery} check{alt: with thieves' tools|} to unhook the shutter's cord", effect: 'Everyone in the room makes a DC {dc} {save:str} saving throw or is pushed 15 feet toward the door and knocked prone. Every flame in the room goes out.' },
    { name: 'Poisoned wine', trigger: 'A table is laid for a feast, with a decanter of good wine already poured.', kinds: ['manor', 'keep'], disarm: 'leave the wine alone (no check)', effect: 'Anyone who drinks makes a DC {dc} {save:con} saving throw or takes {dmg} poison damage and is poisoned for 1 hour; half damage and not poisoned on a success.' },
    { name: 'Turning bookcase', trigger: 'Pulling the wrong book swings a bookcase round, sweeping whoever is in front of it into a cell behind the wall.', kinds: ['manor', 'tower'], disarm: 'DC {dc} {skill:int:investigation} check to find the right book, or wedge the bookcase still (no check, once found)', effect: 'DC {dc} {save:dex} saving throw or be shut in the cell behind, alone, until someone finds the right book. The air in there lasts an hour.' }
]);
// Boss-room hazards by kind, besides each kind's own two; and a few that suit any kind.
const SITE_HAZARDS_MORE = ruleTable({
    crypt: ['Coffins lie on rotten shelves along the walls. A heavy blow to a wall brings a shelf down: everyone within 5 feet of it makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is knocked prone.', 'Candles burn in niches all round the room. Whenever a creature drops to 0 hit points here, every one of them gutters out, and anyone in the room makes a DC {dc} {save:wis} saving throw or is frightened until the end of their next turn.'],
    mine: ['An ore cart stands at the top of a rail slope. Kicking out its chock (an action) sends it down a 30-foot line: everyone in it makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is knocked prone.', 'One side of the floor drops into a flooded shaft. Anyone who goes in makes a DC {dc} {save:con} saving throw at the start of each of their turns in the black water or takes {dmg} cold damage.'],
    tower: ['A great brass orrery hangs from the ceiling. Hitting it hard (AC 15) sets its arms spinning for a round: everyone within 10 feet of the middle makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage.', 'The windows are open to a long drop. A creature shoved within 5 feet of one makes a DC {dc} {save:dex} saving throw or goes over the sill, catching the ledge outside, and needs an action to climb back in.'],
    temple: ['The floor slopes into a pool of black water. Anyone who starts a turn in it makes a DC {dc} {save:str} saving throw or is dragged under toward a drain grate, taking {dmg} bludgeoning damage.', "The god's eye is set in the ceiling, a lens of colored glass. Anyone who strikes the altar beneath it makes a DC {dc} {save:con} saving throw or takes {dmg} radiant damage; half damage on a success."],
    fort: ['A ladder runs up to a platform with a bell. Anyone who rings it (an action) brings whoever else is in the fort running, in 3 rounds.', 'Firewood is stacked against a timber wall. Fire that touches it lights the wall: from the next round on, anyone who starts a turn within 10 feet of it makes a DC {dc} {save:con} saving throw or takes {dmg} fire damage.'],
    lair: ['Old bones cover the floor and roll underfoot: difficult terrain, and anyone who dashes across makes a DC {dc} {save:dex} saving throw or falls prone.', "A stinking pool in one corner is where the beast drops what it doesn't eat. Anyone who falls in makes a DC {dc} {save:con} saving throw or takes {dmg} poison damage and is poisoned until the end of their next turn."],
    keep: ['A wall stands half fallen and leaning. A hit that deals 20 damage or more to it brings it down: everyone in a 10-foot strip beside it makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage.', 'Ivy and rotten tapestries cover the walls. Fire that touches them runs round the room in a round: everyone within 5 feet of a wall makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage; half damage on a success.'],
    sewer: ['A grate in the floor opens onto a cistern far below. Prying it loose ({dc:15} {ability:str}) drops it: anyone on it makes a DC {dc} {save:dex} saving throw or falls 20 feet into the water, taking {dmg} bludgeoning damage.', 'Rats pour out of the walls at the smell of blood. At the start of each round, anyone below half their hit points makes a DC {dc} {save:dex} saving throw or takes {dmg} piercing damage.'],
    seacave: ['Smuggled lamp oil is stacked in barrels by the landing. A barrel that breaks spreads a slick 10 feet across: difficult terrain, and if fire touches it, everyone on it makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage.', 'A blowhole in the floor spouts with the swell. Each round, roll a d6: on a 1, it throws anyone standing over it 15 feet up (DC {dc} {save:dex} saving throw or take {dmg} bludgeoning damage on landing).'],
    shipwreck: ['The broken mast lies across the hold on a heap of loose cargo. Knocking the cargo out from under it ({dc:15} {ability:str}) rolls it across the deck: everyone in a 10-foot-wide line makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is knocked prone.', 'Ankle-deep water sloshes through the hold and hides holes in the planking. Anyone who moves more than half their speed makes a DC {dc} {save:dex} saving throw or puts a foot through and takes {dmg} piercing damage.'],
    lighthouse: ['The stair spirals round an open drop in the middle of the tower. A creature knocked prone on it makes a DC {dc} {save:dex} saving throw or slides off and falls 20 feet, taking {dmg} bludgeoning damage.', 'A storm howls outside. Each round, roll a d6: on a 1, a gust tears through the gallery door, and everyone near it makes a DC {dc} {save:str} saving throw or is pushed 10 feet and knocked prone.'],
    manor: ['A harpsichord in the corner plays by itself. Anyone who starts a turn within 10 feet of it while it plays makes a DC {dc} {save:wis} saving throw or takes {dmg} psychic damage; half damage on a success.', 'The portraits watch. Once a round, a painted hand reaches out of a frame at a random creature beside a wall: DC {dc} {save:dex} saving throw or take {dmg} necrotic damage.'],
    barrow: ['A dozen old spears stand point-up in the earth among the grave goods. A creature shoved into them makes a DC {dc} {save:dex} saving throw or takes {dmg} piercing damage.', "A cold mist rises from the chief's bed whenever blood is spilled on it. Anyone who starts a turn within 10 feet of the bed while the mist is up makes a DC {dc} {save:con} saving throw or takes {dmg} cold damage; half damage on a success."]
});
const SITE_HAZARDS_ANY = ruleTable([
    'Braziers of hot coals stand at the corners. Knocking one over (an action, or a shove into it) spills them: everyone in a 10-foot square makes a DC {dc} {save:dex} saving throw or takes {dmg} fire damage.',
    'A heavy chain with a hook on its end hangs from the ceiling. Swinging it (an action) sweeps a 10-foot-wide arc: everyone in it makes a DC {dc} {save:dex} saving throw or takes {dmg} bludgeoning damage and is knocked prone.',
    'Smoke from a smoldering fire fills the top half of the room. Anyone flying, climbing, or standing on something high is heavily obscured, and makes a DC {dc} {save:con} saving throw at the start of each of their turns there or loses their reaction until their next turn.'
]);
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

// Someone else in a room (siteEvent): a prisoner, a rival party, or one of the others.
// {name}: a person's name (left out when npc-data.js isn't loaded). {gp}: a ransom or price by tier.
const SITE_EVENT_KINDS = [['prisoner', 3], ['rivals', 3], ['other', 4]];
const SITE_EVENT_ROLES = ['a merchant\'s clerk', 'a tax collector', 'a young priest', 'a scout from the nearest town', 'a tinker', 'an herbalist', 'a minor noble\'s youngest', 'a retired soldier', 'a bard who came for a song', 'a mapmaker', 'a farmer\'s eldest', 'a runaway apprentice', 'a pilgrim', 'a watch sergeant'];
const SITE_PRISON_HELD = ['is chained to the wall by one ankle', 'sits in a cage hung from the ceiling', 'is tied to a chair and gagged', 'is locked in a cupboard, knocking softly', 'lies bound in a corner, pretending to be asleep', 'is shackled to a heavy chest', 'is tied to a post with their hands over their head', 'sits in a pit with a grate over it'];
const SITE_PRISON_KNOWS = ['Freed, they know a way out that the place\'s masters don\'t watch.', 'They were taken for ransom, and their family will pay {gp} for them alive.', 'They saw what waits in the last room, and won\'t stop talking about it.', 'They are not what they seem: they are one of their captors, left here to tell a good story and lead the party into a trap.', 'Give them a weapon and they\'ll fight beside the party until they can run.', 'They know the name of whoever leads this place, and one thing it fears.', 'They came here on purpose, looking for someone, and they still mean to find them.', 'They\'re too weak to walk, and someone will have to carry them out.', 'They\'d rather stay: they owe money in town, and here at least they\'re fed.', 'They\'ve counted the guards for days and know when the watch changes.', 'They hid something valuable in this room before they were caught, and they\'ll share it.', 'They insist they can\'t leave until something of theirs is found, deeper in.'];
const SITE_RIVAL_LEAD = ['a loud fighter in polished armor', 'a nervous wizard', 'a cleric of a war god', 'a halfling with far too many knives', 'a ranger who doesn\'t talk', 'a bard who is writing all this down', 'a paladin who is very sure of everything', 'a sorcerer barely out of childhood'];
const SITE_RIVAL_DOING = ['are resting here, licking their wounds', 'are arguing over a map', 'are trying to open a door that won\'t open', 'are burying one of their own', 'are pinned down here, low on spells and food', 'are going through a dead foe\'s pockets', 'are lost, and too proud to say so', 'are already packing up a share of the loot'];
const SITE_RIVAL_MOOD = ruleTable(['They want the hoard and will race the party to it.', 'They\'d split the hoard evenly if the party helps them.', 'They\'ll sell the party their map of the rest of the place for {gp}.', 'They\'ll turn on the party at the worst moment.', 'They\'ve had enough: they\'d hand over everything they\'ve learned for an escort out.', 'They take the party for enemies and attack first, unless someone talks fast ({dc:13} {skill:cha:persuasion}).', 'They were hired by someone the party knows, and that someone said nothing about the party.', 'They\'ll join the party for the rest of the way, and want a fair share.']);
const SITE_EVENT_OTHER = [
    'A badly wounded survivor of an earlier party, {name}, lies here. They have a map of the next two rooms, and an hour to live without healing.',
    'A hermit, {name}, has made a home here, and knows every room. They will trade what they know for food.',
    'A deserter from the place\'s masters, {name}, is hiding here, and begs the party not to make a sound. They know where the guards sleep.',
    'A ghost of one of the builders stands in a corner. It asks the party to take its bones out of this place, and will answer one question in return.',
    'A mule, still in its harness, is tangled in the wreckage here. It is well fed. Someone has been looking after it.',
    'A note is pinned to the wall: "To whoever comes next: don\'t trust the one who calls for help." It is signed by {name}.',
    'A trader, {name}, has set up a stall here, and sells rope, oil, rations, and healing potions at four times the price. Nobody knows how they got in.',
    'A lost child has wandered in from outside and is hiding behind the door, too scared to come out.',
    'A dead adventurer, {name}, sits against the wall. Their journal tells how the rest of their party died, one room at a time.',
    'A talking raven perches here and offers to guide the party, for a shiny thing. It is honest about the way, and lies about everything else.',
    'A spy, {name}, is copying the place\'s maps, and would pay {gp} for the party to keep quiet.',
    'A messenger, {name}, is trying to deliver a letter to the place\'s master, and wants an escort the rest of the way.'
];
const SITE_EVENT_GP = { '0-4': 50, '5-10': 250, '11-16': 1500, '17+': 7500 };

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

// The third pass (R6): one of the newer traps in place of trap, by its share of the kind's
// whole list, at the same severity and DC (always two draws).
function siteTrapMore(trap, K, tier) {
    const old = SITE_TRAPS.filter(t => !t.kinds || t.kinds.includes(K));
    const more = SITE_TRAPS_MORE.filter(t => !t.kinds || t.kinds.includes(K));
    const t = sitePick(more);
    if (rand() >= more.length / (old.length + more.length)) return trap;
    const fill = s => s.replace(/\{dc\}/g, trap.dc).replace(/\{dmg\}/g, SITE_TRAP_DAMAGE[tier][trap.severity]);
    return { name: t.name, severity: trap.severity, dc: trap.dc, trigger: t.trigger, disarm: fill(t.disarm), effect: fill(t.effect) };
}

// One of the newer lines in place of cur, by its share of the whole list (always two draws).
function siteSwap(cur, old, more) {
    const newer = sitePick(more);
    return rand() < more.length / (old.length + more.length) ? newer : cur;
}

// Who holds the place at this level: a group of the kind's that can field a High fight
// for the boss (tried in a random order), else a group from the site's habitat that can,
// else whichever came closest. Null = no group (a mix of the habitat's monsters).
// prefer: groups to try before the kind's own (the campaign generator's villains), any kind.
function siteChooseBand(K, budget, prefer) {
    const xpOf = opts => encounterXp(rollThemedEncounter(budget, 'high', opts).list);
    if (prefer && prefer.length) {
        const own = siteShuffle(prefer.filter(k => ENC_BAND_BY_KEY[k])).find(k => xpOf({ band: k }) > budget.moderate);
        if (own) return own;
    }
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
    const [seen, doing] = sitePick(siteDoingPool(K, r.list));
    return { list: r.list.map(e => ({ id: e.m.id, count: e.count })), band: r.band, diff, doing, seen, seed };
}

// What foes like these might be doing: by the mind of the strongest of them ([{ m, count }]).
function siteDoingPool(K, list) {
    const lead = list.reduce((a, b) => (b.m.xp > a.m.xp ? b : a)).m;
    const mind = SITE_MINDS[lead.type] || 'beast';
    return SITE_DOING[mind].concat((K.doing && K.doing[mind]) || []);
}

// The fight as the encounter engine's [{ m, count }].
function siteFightList(f) {
    return f.list.map(e => ({ m: MONSTER_BY_ID[e.id], count: e.count })).filter(e => e.m);
}

// A random kind. drawn: picked from `first` the way it always was; then, under its own seed
// (so nothing else moves), it may give way to one of `more`, each kind as likely as any other.
function siteMoreKind(seed, drawn, first = SITE_KIND_FIRST, more = SITE_KIND_KEYS.filter(k => !SITE_KIND_FIRST.includes(k))) {
    return withSeed(deriveSeed(seed, 'kind.more'), () => (more.length && rand() < more.length / (first.length + more.length) ? sitePick(more) : drawn));
}

// A person's name for a room event, or '' when npc-data.js (buildName) isn't loaded.
function siteName() {
    if (typeof buildName !== 'function') return '';
    const race = sitePick(['human', 'human', 'human', 'dwarf', 'elf', 'halfling', 'gnome', 'tiefling']);
    return buildName(race, rand() < 0.5 ? 'male' : 'female').name;
}

// Someone else in a room: { kind, text }. A room with a fight only ever holds a prisoner.
function siteEvent(fight, tier) {
    const kind = siteWeighted(SITE_EVENT_KINDS.filter(([k]) => !fight || k === 'prisoner'));
    const gp = `${SITE_EVENT_GP[tier].toLocaleString('en-US')} gp`;
    let text;
    if (kind === 'prisoner') {
        const role = sitePick(SITE_EVENT_ROLES), held = sitePick(SITE_PRISON_HELD), knows = sitePick(SITE_PRISON_KNOWS), name = siteName();
        text = `${name ? `${name}, ${role},` : siteCap(role)} ${held}. ${knows}`;
    } else if (kind === 'rivals') {
        const n = sitePick(['Two', 'Three', 'Three', 'Four', 'Five']), doing = sitePick(SITE_RIVAL_DOING), mood = sitePick(SITE_RIVAL_MOOD);
        text = `${n} rival adventurers, led by ${sitePick(SITE_RIVAL_LEAD)}, ${doing}. ${mood}`;
    } else {
        const line = sitePick(SITE_EVENT_OTHER);
        const name = line.includes('{name}') ? siteName() : '';
        // Without a name: "A hermit, {name}, has" → "A hermit has"; "It is signed by {name}." goes.
        text = name ? line.replace(/\{name\}/g, name) : line.replace(/, \{name\},/g, '').replace(/ [^.]*\{name\}[^.]*\./g, '');
    }
    return { kind, text: text.replace(/\{gp\}/g, gp) };
}

// ── The roll ──────────────────────────────────────────────
// opts: { kind, size: 'random'|small|medium|large, level 1-20, party 1-8, bands? (groups to try first) }
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
    const drawn = part('options', () => ({ kind: sitePick(SITE_KIND_FIRST), size: siteWeighted([['medium', 5], ['small', 3], ['large', 3]]) }));
    const kind = SITE_KINDS[opts.kind] ? opts.kind : siteMoreKind(seed, drawn.kind);
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
    part('senses.more.' + kind, () => {
        const more = siteShuffle(SITE_SENSES_MORE), share = more.length / (K.senses.length + SITE_SENSES.length + more.length);
        senses.forEach((t, i) => { if (rand() < share && t && more.length) senses[i] = more.shift(); });
    });

    // Who holds it (a group that fits the level), and what wanders in.
    const band = part(`band.${kind}.${level}.${party}`, () => siteChooseBand(K, budget, opts.bands));

    const rooms = [], plans = [], doingUsed = new Set();
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
        plans.push(plan);
        const fightSeed = deriveSeed(seed, `fight.${i}`);
        const fight = plan.fight ? part(`fight.${i}.${kind}.${level}.${party}`, () => siteFight(K, band, budget, plan.diff, fightSeed)) : null;
        // Each room draws on its own, so two could be doing the same thing: the later one draws
        // again from what's left, under its own seed (a room that didn't clash keeps its line).
        if (fight && doingUsed.has(fight.doing)) {
            const left = siteDoingPool(K, siteFightList(fight)).filter(([, t]) => !doingUsed.has(t));
            if (left.length) [fight.seen, fight.doing] = part(`doing.${i}.again`, () => sitePick(left));
        }
        if (fight) doingUsed.add(fight.doing);
        const drawnTrap = plan.trap ? part(`trap.${i}.${kind}.${level}`, () => siteTrap(kind, tier)) : null;
        // The third pass (R6) may swap the trap for a newer one, under its own seed.
        const trap = drawnTrap && part(`trap.${i}.more.${kind}`, () => siteTrapMore(drawnTrap, kind, tier));
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

    // Drawn after everything else, each under its own seed, so they move nothing above.
    // The boss room's ground: two features of the kind's, and sometimes a hazard (setback or
    // dangerous; only its damage follows the level).
    const drawnGround = part('ground.' + kind, () => {
        const features = siteShuffle(K.ground || []).slice(0, 2);
        if (!K.hazards || rand() >= 0.5) return { features, hazard: null };
        const [sev, , dcs] = siteWeighted(SITE_TRAP_SEVERITY.slice(0, 2).map(t => [t, t[1]]));
        const dc = dcs[0] + Math.floor(rand() * (dcs[1] - dcs[0] + 1));
        return { features, hazard: sitePick(K.hazards), dc, dmg: SITE_TRAP_DAMAGE[tier][sev] };
    });
    // The third pass (R6) may swap the hazard for a newer one, under its own seed.
    const hazard = drawnGround.hazard && part('ground.more.' + kind, () => siteSwap(drawnGround.hazard, K.hazards, (SITE_HAZARDS_MORE[kind] || []).concat(SITE_HAZARDS_ANY)));
    const ground = { features: drawnGround.features, hazard: hazard ? hazard.replace(/\{dc\}/g, drawnGround.dc).replace(/\{dmg\}/g, drawnGround.dmg) : null };
    // Someone else in a room or two between the way in and the end.
    const events = part(`events.${kind}.${n}`, () => {
        const out = {};
        let left = count >= 9 ? 2 : 1;
        siteShuffle(rooms.map((_, i) => i).slice(1, -1)).forEach(i => {
            if (left && rand() < (plans[i].fight ? 0.12 : 0.35)) { out[i] = siteEvent(plans[i].fight, tier); left--; }
        });
        return out;
    });
    rooms.forEach((r, i) => { r.event = events[i] || null; });

    return { seed, kind, size, level, party, tier, name, map, rooms, doors, band, hoard, boss, wander, story, budget, ground };
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
    return ruleText({
        open: 'an open archway',
        door: K.door,
        locked: `${K.door}, locked (DC ${lock} {ability:dex:thievery} check{alt: with thieves' tools|}, or DC ${lock + 5} {ability:str} to force it)`,
        stuck: `${K.door}, swollen shut (DC ${lock - 2} {skill:str:athletics} to shove it open)`,
        secret: `a secret door (DC ${find} {skill:wis:perception} to find it)`,
        portcullis: `a portcullis (the winch is on the far side; DC ${lock + 5} {ability:str} to lift it)`,
        stairs: 'a stair'
    }[kind]);
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
    if (r.event) lines.push(['Also here', r.event.text]);
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
        if (s.ground && s.ground.features.length) lines.push(['Ground', s.ground.features.join(' ')]);
        if (s.ground && s.ground.hazard) lines.push(['Hazard', s.ground.hazard]);
    }
    if (r.trap) {
        const t = r.trap;
        lines.push(['Trap', ruleText(`${t.name} (${t.severity}). ${t.trigger} Spot it: DC ${t.dc} {skill:wis:perception}. Disarm: ${siteCap(t.disarm)}. ${t.effect}`)]);
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
// Each kind's floor (and its corridors'), its ordinary door's picture (null: drawn plain), and its
// locked door's (else iron-door).
const SITE_ART_KINDS = {
    crypt: { floor: 'flagstones', door: 'iron-door', props: ['coffin', 'rubble', 'bone-pile', 'brazier', 'spider-web', 'statue', 'sarcophagus', 'urns', 'candles', 'skeleton', 'burial-niche'] },
    mine: { floor: 'cave', door: 'wooden-door', props: ['crates', 'mine-cart', 'rubble', 'barrels', 'stalagmites', 'spider-web', 'crystal', 'sacks', 'ladder', 'mushrooms', 'dead-adventurer'] },
    tower: { floor: 'planks', door: 'wooden-door', locked: 'magic-seal', props: ['bookshelf', 'table', 'chest', 'rug', 'brazier', 'desk', 'alchemy-table', 'mirror', 'telescope', 'globe', 'scroll-pile', 'specimen-shelf', 'candelabra', 'chair'] },
    temple: { floor: 'temple-tiles', door: 'iron-door', locked: 'magic-seal', props: ['pillar', 'statue', 'rubble', 'brazier', 'altar', 'spider-web', 'idol', 'pews', 'font', 'candles', 'gong'] },
    fort: { floor: 'dirt', door: 'wooden-door', locked: 'barred-door', props: ['barrels', 'crates', 'table', 'campfire', 'weapon-rack', 'sacks', 'hay', 'bench', 'stool', 'shackles', 'fireplace'] },
    lair: { floor: 'cave', door: null, props: ['bone-pile', 'stalagmites', 'rubble', 'spider-web', 'skeleton', 'dead-adventurer', 'carcass', 'blood-pool', 'slime', 'mushrooms', 'coin-pile', 'boulder'] },
    keep: { floor: 'flagstones', door: 'wooden-door', locked: 'barred-door', props: ['rubble', 'table', 'barrels', 'pillar', 'chest', 'weapon-rack', 'brazier', 'tapestry', 'fireplace', 'bench', 'candelabra', 'shackles'] },
    sewer: { floor: 'flagstones', door: 'iron-door', props: ['barrels', 'crates', 'rubble', 'spider-web', 'bone-pile', 'slime', 'ladder', 'skeleton', 'carcass', 'mushrooms', 'blood-pool'] },
    seacave: { floor: 'cave', door: null, props: ['barrels', 'crates', 'rubble', 'stalagmites', 'chest', 'rowboat', 'nets', 'anchor', 'coin-pile', 'boulder', 'skeleton'] },
    shipwreck: { floor: 'planks', door: 'wooden-door', locked: 'barred-door', props: ['barrels', 'crates', 'chest', 'rubble', 'spider-web', 'sacks', 'cannon', 'anchor', 'mast', 'nets', 'skeleton', 'coin-pile'] },
    lighthouse: { floor: 'flagstones', door: 'wooden-door', locked: 'barred-door', props: ['barrels', 'crates', 'chest', 'table', 'brazier', 'stove', 'chair', 'nets', 'anchor', 'ladder', 'telescope'] },
    manor: { floor: 'planks', door: 'wooden-door', locked: 'barred-door', props: ['table', 'rug', 'bookshelf', 'chest', 'statue', 'spider-web', 'tapestry', 'mirror', 'chair', 'wardrobe', 'fireplace', 'candelabra', 'piano', 'bathtub'] },
    barrow: { floor: 'dirt', door: null, props: ['bone-pile', 'rubble', 'sarcophagus', 'spider-web', 'brazier', 'urns', 'burial-niche', 'skeleton', 'coin-pile'] }
};
// A room's own floor, by what its name and description say (first match). room: not in caves.
const SITE_FLOOR_RULES = [
    [/lava|magma|molten|brimstone|fire pit/, 'lava'],
    [/\bice\b|icy|frozen|frost|glacier/, 'ice'],
    [/flood|water|lake|stream|wallow|baptistry|pool|wades|knee-deep|bog|channel|cistern|bilge/, 'water'],
    [/\bsand|dune|desert/, 'sand'],
    [/garden|courtyard|cloister|overgrown|meadow/, 'grass'],
    [/parlou?r|ballroom|drawing room|salon|carpet/, 'carpet', 'room'],
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
    [/idol/, 'idol'],
    [/statue|saint|mourners|effig|golem|armor that stands/, 'statue'],
    [/\bbeds?\b|bunks?\b|cots?\b|quarters|four-poster|canopy/, 'bed'],
    [/bedroll|camp\b|old camp|hammocks?\b/, 'bedrolls'],
    [/books?\b|library|shelves|scriptorium/, 'bookshelf'],
    [/desk|office|study|ledger|counting|diary|notes/, 'desk'],
    [/table|dining|mess hall|refectory|map room|war room|guardroom|dice/, 'table'],
    [/barrel|\bale\b|wine|kegs?\b|powder/, 'barrels'],
    [/crates|storehouse|store\b|storeroom|tool store/, 'crates'],
    [/sacks|grain|flour|granary|larder|pantry/, 'sacks'],
    [/\bhay\b|straw|stables|loft/, 'hay'],
    [/cage|menagerie|kennel|stockade|canary|cells with iron/, 'cage'],
    [/cauldron|stew|components/, 'cauldron'],
    [/alchem|laborator|glassware|potion|distill/, 'alchemy-table'],
    [/forge|smelter|smithy|furnace/, 'forge'],
    [/anvil|smithy|armou?rer/, 'anvil'],
    [/brazier|lamp|torches/, 'brazier'],
    [/cells?\b|prison|gaol|jail|oubliette|captives?|prisoners?/, 'prison-cell'],
    [/stocks|pillory/, 'stocks'],
    [/tortur|interrogat|the rack\b/, 'torture-rack'],
    [/gallows|noose|hang(ed|ing|man)|execution/, 'gallows'],
    [/\bpit\b|pitfall/, 'pit-trap'],
    [/spike|traps?\b|trapped|pressure plate|tripwire/, 'spike-trap'],
    [/lever|winch|mechanism|crank/, 'lever'],
    [/mirror|looking glass/, 'mirror'],
    [/tapestr|banners?\b|hangings/, 'tapestry'],
    [/\bnests?\b|eggs?\b|clutch|roost|hatcher/, 'egg-nest'],
    [/ship's wheel|\bhelm\b|wheelhouse|quarterdeck/, 'ship-wheel'],
    [/cookfire|cold fire|campfire/, 'campfire'],
    [/circle of silver|summoning|scrying/, 'magic-circle'],
    [/\bcarts?\b|rails|\bore\b/, 'mine-cart'],
    [/pillar|column|portico|nave|hammerbeam|stalactite hall/, 'pillar'],
    [/rubble|collaps|cave-in|landslide|fallen roof|half fallen|cracked open/, 'rubble'],
    [/solar|lady's|lord's|guest room|apartment|rug/, 'rug'],
    [/spider|cobweb/, 'spider-web'],
    [/crystal|geode/, 'crystal'],
    [/stalactite|sinkhole|cave mouth|narrow cleft/, 'stalagmites'],
    [/throne|big chair|high-backed/, 'throne'],
    [/weapons|armou?ry|training yard|swords|broken weapons/, 'weapon-rack'],
    [/\bwell\b/, 'well'],
    [/fountain|baptistry/, 'fountain'],
    [/chest|strongbox|trunks?\b|vessels/, 'chest'],
    [/cellar|shaft|charnel pit|trapdoor/, 'trapdoor'],
    [/tavern|taproom|\binn\b|common room|alehouse/, 'bar-counter'],
    [/tavern|taproom|common room|card game|gambl/, 'round-table'],
    [/chairs?\b|seats?\b|seated/, 'chair'],
    [/bench/, 'bench'],
    [/stools?\b/, 'stool'],
    [/kitchen|\bcooks?\b|scullery|galley/, 'stove'],
    [/kitchen|butcher|scullery/, 'kitchen-counter'],
    [/hearth|fireplace|chimney|mantel/, 'fireplace'],
    [/wardrobe|closet|dressing|gowns|clothes/, 'wardrobe'],
    [/\bbath|\btub\b|washroom/, 'bathtub'],
    [/candelabr|chandelier/, 'candelabra'],
    [/harpsichord|piano|music room|ballroom/, 'piano'],
    [/skeleton|corpse|remains|\bbod(y|ies)\b/, 'skeleton'],
    [/fallen adventurer|dead adventurer|previous party|rival party|last expedition/, 'dead-adventurer'],
    [/shackle|manacle|chained|chains?\b/, 'shackles'],
    [/carcass|half-eaten|gnawed|feeding|\bkill\b/, 'carcass'],
    [/slime|ooze|jelly|pudding|sludge/, 'slime'],
    [/blood|slaughter/, 'blood-pool'],
    [/mushroom|fung|toadstool|spore/, 'mushrooms'],
    [/broken pillar|toppled|fallen column/, 'broken-pillar'],
    [/ladder|hatch|climb/, 'ladder'],
    [/coins?\b|purse|tribute|\btolls?\b|gold pieces|silver pieces/, 'coin-pile'],
    [/telescope|observator|astrolog|stargaz/, 'telescope'],
    [/globe|map room|cartograph|orrery/, 'globe'],
    [/scrolls?\b|papers|archive|letters|scriptorium/, 'scroll-pile'],
    [/specimen|\bjars\b|pickled|preserved|curiosit/, 'specimen-shelf'],
    [/pews?\b|nave|chapel|congregation|sermon/, 'pews'],
    [/\bfont\b|holy water|baptis/, 'font'],
    [/candles|vigil|votive/, 'candles'],
    [/gong|\bbells?\b|belfry/, 'gong'],
    [/\burns?\b|ashes|cremat|columbarium/, 'urns'],
    [/graveyard|cemetery|headstone|gravestone|churchyard/, 'headstone'],
    [/\bgraves?\b|exhum|gravedigg|freshly dug/, 'open-grave'],
    [/niche|catacomb|loculi|wrapped bod/, 'burial-niche'],
    [/rowboat|skiff|dinghy|\bboats?\b|jetty|\bdocks?\b|landing|\bpier\b/, 'rowboat'],
    [/cannon|gun deck|gunport|powder magazine/, 'cannon'],
    [/anchor|chain locker|capstan|windlass/, 'anchor'],
    [/\bnets?\b|\bfish|\bcrabs?\b|lobster/, 'nets'],
    [/\bmasts?\b|rigging|\bsails?\b|\bspars?\b/, 'mast'],
    [/\btrees?\b|grove|orchard|courtyard|garden/, 'tree'],
    [/\bbush|shrub|hedge|thicket|bramble|overgrown|garden/, 'bush'],
    [/boulder|rockfall|great stone/, 'boulder'],
    [/fallen log|\blogs?\b|deadfall|fallen tree|stump/, 'fallen-log'],
    [/\btents?\b|\bcamp\b|encampment|pavilion/, 'tent']
];
// Pieces drawn wide (their pictures are long and low), pieces drawn big (two squares a side), and
// pieces that lie flat under the room's number.
const SITE_PROP_WIDE = ['altar', 'bookshelf', 'table', 'desk', 'weapon-rack', 'stocks', 'tapestry', 'alchemy-table', 'bench', 'bar-counter',
    'fireplace', 'kitchen-counter', 'wardrobe', 'bathtub', 'dead-adventurer', 'carcass', 'broken-pillar', 'ladder', 'specimen-shelf', 'pews',
    'open-grave', 'burial-niche', 'rowboat', 'cannon', 'fallen-log', 'mast'];
const SITE_PROP_BIG = ['treasure-hoard', 'forge', 'prison-cell', 'egg-nest', 'gallows', 'round-table', 'piano', 'tree', 'tent'];
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
            const k = SITE_PROP_BIG.includes(prop) ? 1.35 : 1;
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
        else if (art && kind === 'locked') doors += pic(`door/${KA.locked || 'iron-door'}`, 12, 12);
        else if (art && kind === 'secret') doors += pic('door/secret-door', 12, 12) + `<text class="sm-s" x="${x}" y="${y}">S</text>`;
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
