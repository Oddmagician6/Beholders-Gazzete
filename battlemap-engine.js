/* ============================================
   BATTLEMAP ENGINE (F75)
   A battle map drawn by hand on a 5-foot grid, for the Battlemap Builder
   (dnd-battlemap-builder.html, battlemap.js). Page-free: the map, its saved and shared
   form, and its picture as SVG. The pictures and the helpers that place them are the
   Sites tab's own (site-engine.js: SITE_SQUARE, SITE_ART_DIR, SITE_FLOOR_TILE,
   siteArtImg, siteAttr), and bmFromSite turns a rolled site into a map to edit.
   A map: { id, name, w, h (squares, 1-60), style ('art' | 'classic'), t (last saved),
     fl: w × h floor numbers, row by row (0 bare rock, else BM_FLOORS[n - 1]),
     hw: (h + 1) × w walls drawn on grid lines across (hw[y * w + x]: above square x, y),
     vw: h × (w + 1) walls drawn on grid lines down (vw[y * (w + 1) + x]: left of square x, y),
     ob: [{ k (a BM_ITEMS key), x, y (its middle, in squares), w, h (squares), r (degrees) }],
     lb: [{ x, y, t }] labels,
     tk: table play's tokens (F76): [{ id, n (name), x, y (its top-left square; fractions when put
       down with Alt), s (size: a BM_TOKEN_SIZES key), c (kind: a BM_TOKEN_KINDS key), a (picture:
       'creature/<type>', 'class/<class>', or ''), f (the Initiative Tracker combatant it stands for,
       or 0), hid (hidden from the players) }],
     fog: null until Play mode first opens the map, then w × h, row by row: 1 revealed, 0 hidden. }
   Walls are also drawn wherever floor meets bare rock.
   Saved under BM_KEY as { cur, maps: [bmPack(map)] } and shared as one share code
   (rng.js packShareCode) of bmPack(map). bmClean reads either back, trimming what's out
   of shape. bmClean needs nothing else; drawing needs site-engine.js, and bmFromSite
   needs a page with a canvas (cave rooms are found with isPointInPath).
   ============================================ */

const BM_KEY = 'gazette-battlemaps';
const BM_LIMITS = { side: 60, maps: 30, objs: 800, labels: 300, tokens: 120, name: 60, label: 24, tname: 40, code: 200000, bytes: 2000000 };
const BM_STYLES = { art: '🎨 Illustrated', classic: '✒️ Classic ink' };
// Floor numbers in fl are these plus one (img/map/floor).
// New floors go on the end: saved maps keep their numbers.
const BM_FLOORS = ['flagstones', 'planks', 'dirt', 'cave', 'mossy-cave', 'marble', 'temple-tiles', 'bone', 'water',
    'carpet', 'grass', 'sand', 'ice', 'lava',
    'ash', 'autumn-leaves', 'black-ice', 'blood-stained-flagstones', 'bone-floor', 'brick', 'checkered-marble', 'clay-roof',
    'cobblestones', 'copper-roof', 'crystal-cave', 'deep-sea', 'dock-planks', 'festive-carpet', 'fine-paving', 'forest-floor',
    'fresh-snowfall', 'ghostly-mist', 'graveyard-soil', 'gravel', 'meadow', 'mosaic', 'mud-road', 'packed-snow-path', 'parquet',
    'rotten-boards', 'rough-stone', 'sewer-water', 'shallow-water', 'shingle-roof', 'slate-roof', 'snow', 'snowy-cobbles',
    'snowy-roof', 'straw-floor', 'swamp', 'thatch-roof', 'tilled-soil'];
const BM_FLOOR_NAMES = {
    flagstones: 'Flagstones', planks: 'Planks', dirt: 'Dirt', cave: 'Cave rock', 'mossy-cave': 'Mossy cave',
    marble: 'Marble', 'temple-tiles': 'Temple tiles', bone: 'Bones', water: 'Water',
    carpet: 'Carpet', grass: 'Overgrown', sand: 'Sand', ice: 'Ice', lava: 'Lava',
    ash: 'Ash', 'autumn-leaves': 'Autumn leaves', 'black-ice': 'Black ice', 'blood-stained-flagstones': 'Bloodied flagstones',
    'bone-floor': 'Skulls and bones', brick: 'Brick', 'checkered-marble': 'Checkered marble', 'clay-roof': 'Clay roof',
    cobblestones: 'Cobblestones', 'copper-roof': 'Copper roof', 'crystal-cave': 'Crystal cave', 'deep-sea': 'Deep water',
    'dock-planks': 'Dock planks', 'festive-carpet': 'Festive carpet', 'fine-paving': 'Fine paving', 'forest-floor': 'Forest floor',
    'fresh-snowfall': 'Fresh snow', 'ghostly-mist': 'Ghostly mist', 'graveyard-soil': 'Graveyard soil', gravel: 'Gravel',
    meadow: 'Meadow', mosaic: 'Mosaic', 'mud-road': 'Mud road', 'packed-snow-path': 'Snowy path', parquet: 'Parquet',
    'rotten-boards': 'Rotten boards', 'rough-stone': 'Rough stone', 'sewer-water': 'Sewer water', 'shallow-water': 'Shallow water',
    'shingle-roof': 'Shingle roof', 'slate-roof': 'Slate roof', snow: 'Snow', 'snowy-cobbles': 'Snowy cobbles',
    'snowy-roof': 'Snowy roof', 'straw-floor': 'Straw', swamp: 'Swamp', 'thatch-roof': 'Thatch roof', 'tilled-soil': 'Tilled soil'
};
// How the Floor tool lays out the swatches (every floor in exactly one group).
const BM_FLOOR_GROUPS = [
    ['🏰 Indoors', ['flagstones', 'planks', 'marble', 'temple-tiles', 'carpet', 'checkered-marble', 'parquet', 'mosaic', 'brick',
        'fine-paving', 'festive-carpet', 'straw-floor', 'rotten-boards', 'dock-planks']],
    ['🕳️ Dungeon and cave', ['dirt', 'cave', 'mossy-cave', 'rough-stone', 'crystal-cave', 'bone', 'bone-floor', 'blood-stained-flagstones',
        'ghostly-mist', 'lava', 'ash']],
    ['🛤️ Streets and roofs', ['cobblestones', 'gravel', 'mud-road', 'snowy-cobbles', 'thatch-roof', 'shingle-roof', 'slate-roof',
        'clay-roof', 'copper-roof', 'snowy-roof']],
    ['🌿 Outdoors', ['grass', 'meadow', 'forest-floor', 'tilled-soil', 'sand', 'swamp', 'autumn-leaves', 'graveyard-soil']],
    ['🌊 Water', ['water', 'shallow-water', 'deep-sea', 'sewer-water']],
    ['❄️ Winter', ['ice', 'black-ice', 'snow', 'fresh-snowfall', 'packed-snow-path']]
];
// Everything that stands on the map. Doors and stairs (img/map/door): edge doors sit on a grid
// line between two squares, and their pictures run past the square (pw, ph) as the Sites
// tab draws them. Furniture (img/map/prop): w × h is its size in squares when placed.
// ink: which classic-ink door a newer door draws as (wood, iron, barred, portcullis, window, open,
// stairs, trap); the first ones draw as their own key.
const BM_ITEMS = {
    wood: { label: 'Wooden door', file: 'door/wooden-door', door: true, edge: true, pw: 1.2, ph: 1.2 },
    iron: { label: 'Iron door (locked)', file: 'door/iron-door', door: true, edge: true, pw: 1.2, ph: 1.2 },
    barred: { label: 'Barred door', file: 'door/barred-door', door: true, edge: true, pw: 1.2, ph: 1.2 },
    seal: { label: 'Magic seal', file: 'door/magic-seal', door: true, edge: true, pw: 1.2, ph: 1.2 },
    portcullis: { label: 'Portcullis', file: 'door/portcullis', door: true, edge: true, pw: 1.4, ph: 1 },
    secret: { label: 'Secret door', file: null, door: true, edge: true },
    stairs: { label: 'Stairs', file: 'door/stairs', door: true },
    spiral: { label: 'Spiral stairs', file: 'door/spiral-stairs', door: true },
    trapdoor: { label: 'Trapdoor', file: 'door/trapdoor', door: true }
};
// The newer doors are drawn side-on with a stub of wall at each end, so their pictures run about
// a square past the door: [key, label, ink, pw, ph]. Edge doors unless ink is stairs or trap.
[['double-door', 'Double door', 'wood', 2.2], ['shop-door', 'Shop door', 'wood'], ['boarded-door', 'Boarded-up door', 'barred'],
    ['broken-door', 'Broken door', 'open'], ['crypt-door', 'Crypt door', 'iron'], ['coffin-door', 'Coffin door', 'wood'],
    ['rusted-cell-door', 'Rusted cell door', 'barred'], ['wreath-door', 'Wreath door', 'wood'], ['town-gate', 'Town gate', 'wood', 3, 1.2],
    ['drawbridge', 'Drawbridge', 'wood', 2.4, 1.2], ['iron-gate', 'Iron gate', 'portcullis'], ['fence-gate', 'Fence gate', 'open'],
    ['ice-gate', 'Ice gate', 'portcullis'], ['open-doorway', 'Open doorway', 'open'], ['curtain-doorway', 'Curtain doorway', 'open'],
    ['bead-curtain', 'Bead curtain', 'open'], ['cobwebbed-doorway', 'Cobwebbed doorway', 'open'], ['garland-arch', 'Garland arch', 'open'],
    ['hole-in-the-wall', 'Hole in the wall', 'open'], ['window', 'Window', 'window'], ['shuttered-window', 'Shuttered window', 'window'],
    ['stained-glass-window', 'Stained glass window', 'window'], ['frosted-window', 'Frosted window', 'window'], ['arrow-slit', 'Arrow slit', 'window'],
    ['cellar-doors', 'Cellar doors', 'trap', 1.2, 1.2], ['ladder-up', 'Ladder up', 'stairs', 1.2, 1.2], ['rope-ladder', 'Rope ladder', 'trap', 1.2, 1.2]]
    .forEach(([k, label, ink, pw = 2, ph = 1]) => {
        const edge = ink !== 'stairs' && ink !== 'trap';
        BM_ITEMS[k] = Object.assign({ label, file: 'door/' + k, door: true, ink, pw, ph }, edge ? { edge } : {});
    });
// Furniture in the builder's groups: [key, label, w, h] (1 × 1 when left out).
const BM_PROP_GROUPS = [
    ['🍺 Tavern and home', [['chair', 'Chair'], ['stool', 'Stool'], ['bench', 'Bench', 2, 1], ['table', 'Table', 2, 1],
        ['round-table', 'Round table', 2, 2], ['bar-counter', 'Bar counter', 3, 1], ['fireplace', 'Fireplace', 2, 1], ['stove', 'Stove'],
        ['kitchen-counter', 'Kitchen counter', 2, 1], ['wardrobe', 'Wardrobe', 2, 1], ['bed', 'Bed', 1, 2], ['bathtub', 'Bathtub', 2, 1],
        ['candelabra', 'Candelabra'], ['piano', 'Harpsichord', 2, 2], ['rug', 'Rug', 2, 3], ['mirror', 'Mirror'], ['tapestry', 'Tapestry', 2, 1],
        ['chest', 'Chest'], ['throne', 'Throne']]],
    ['🍻 Inn and tavern', [['long-table', 'Long table', 3, 1], ['card-table', 'Card table', 2, 2], ['broken-table', 'Broken table'],
        ['ale-casks', 'Ale casks', 2, 1], ['keg-rack', 'Keg rack', 2, 2], ['mug-rack', 'Mug rack', 2, 1], ['spit-roast', 'Spit roast', 2, 1],
        ['dish-tub', 'Dish tub'], ['coat-rack', 'Coat rack'], ['dartboard-corner', 'Dartboard corner'], ['bard-s-corner', "Bard's corner"],
        ['stage', 'Stage', 3, 2], ['wanted-board', 'Wanted board', 2, 1], ['spilled-ale', 'Spilled ale']]],
    ['🏠 Homes', [['double-bed', 'Double bed', 2, 2], ['bunk-bed', 'Bunk bed', 1, 2], ['cradle', 'Cradle'], ['armchair', 'Armchair'],
        ['sofa', 'Sofa', 2, 1], ['dining-table', 'Dining table', 3, 2], ['dresser', 'Dresser', 2, 1], ['washstand', 'Washstand'],
        ['washtub', 'Washtub'], ['cooking-hearth', 'Cooking hearth', 2, 1], ['bread-oven', 'Bread oven', 2, 2], ['dough-table', 'Dough table', 2, 1],
        ['pantry-shelf', 'Pantry shelf', 2, 1], ['firewood-pile', 'Firewood pile', 2, 1], ['grandfather-clock', 'Grandfather clock'],
        ['hanging-plants', 'Hanging plants'], ['lantern', 'Lantern'], ['laundry-line', 'Laundry line', 3, 1], ['toy-box', 'Toy box'],
        ['cat-bed', 'Cat bed'], ['dog', 'Dog'], ['strongbox', 'Strongbox']]],
    ['🧵 Shops and crafts', [['shop-counter', 'Shop counter', 3, 1], ['display-shelves', 'Display shelves', 2, 1],
        ['apothecary-shelf', 'Apothecary shelf', 2, 1], ['herb-drying-rack', 'Herb drying rack', 2, 1], ['money-changer-s-table', "Money changer's table", 2, 1],
        ['jeweler-s-bench', "Jeweler's bench", 2, 1], ['cobbler-s-bench', "Cobbler's bench", 2, 1], ['tailor-s-table', "Tailor's table", 2, 1],
        ['mannequin', 'Mannequin'], ['loom', 'Loom', 2, 1], ['spinning-wheel', 'Spinning wheel'], ['potter-s-wheel', "Potter's wheel"],
        ['tanning-rack', 'Tanning rack', 1, 2], ['workbench', 'Workbench', 2, 1], ['armor-stand', 'Armor stand'],
        ['weapon-display', 'Weapon display', 2, 1]]],
    ['📦 Stores and smithy', [['barrels', 'Barrels'], ['crates', 'Crates'], ['sacks', 'Sacks'], ['hay', 'Hay'], ['forge', 'Forge', 2, 2],
        ['anvil', 'Anvil'], ['weapon-rack', 'Weapon rack', 2, 1], ['mine-cart', 'Mine cart', 1, 2]]],
    ['👑 Manor and castle', [['royal-throne', 'Royal throne', 2, 2], ['banquet-table', 'Banquet table', 3, 2], ['canopy-bed', 'Canopy bed', 2, 2],
        ['grand-fireplace', 'Grand fireplace', 2, 1], ['grand-rug', 'Grand rug', 3, 4], ['bear-rug', 'Bear rug', 2, 2], ['writing-desk', 'Writing desk', 2, 1],
        ['chessboard', 'Chessboard'], ['harp', 'Harp'], ['display-case', 'Display case', 2, 1], ['painting', 'Painting'],
        ['mounted-trophy', 'Mounted trophy'], ['weapon-trophy', 'Weapon trophy'], ['suit-of-armor', 'Suit of armor'], ['potted-tree', 'Potted tree'],
        ['topiary', 'Topiary'], ['garden-hedge', 'Garden hedge'], ['rose-bed', 'Rose bed', 2, 2], ['garden-statue', 'Garden statue'],
        ['gazebo', 'Gazebo', 3, 3]]],
    ['🏪 Market street', [['market-stall', 'Market stall', 2, 2], ['market-umbrella', 'Market umbrella', 2, 2], ['fruit-stall', 'Fruit stall', 2, 1],
        ['fish-stall', 'Fish stall', 2, 1], ['cloth-stall', 'Cloth stall', 2, 1], ['pottery-stall', 'Pottery stall', 2, 1], ['butcher-block', 'Butcher block', 2, 1],
        ['flower-cart', 'Flower cart', 2, 1], ['market-scales', 'Market scales'], ['chicken-coop', 'Chicken coop', 2, 1], ['barrel-stack', 'Barrel stack', 2, 2],
        ['crate-stack', 'Crate stack', 2, 2], ['handcart', 'Handcart', 1, 2], ['hay-wagon', 'Hay wagon', 2, 3], ['merchant-wagon', 'Merchant wagon', 2, 3],
        ['hitching-post', 'Hitching post', 2, 1], ['water-trough', 'Water trough', 2, 1], ['rain-barrel', 'Rain barrel'], ['public-well', 'Public well', 2, 2],
        ['town-fountain', 'Town fountain', 3, 3], ['street-lamp', 'Street lamp'], ['signpost', 'Signpost'], ['notice-board', 'Notice board', 2, 1],
        ['speaker-s-platform', "Speaker's platform", 3, 2], ['pillory', 'Pillory', 2, 1], ['gallows-tree', 'Gallows tree', 2, 2],
        ['beggar-s-mat', "Beggar's mat"], ['street-litter', 'Street litter'], ['puddle', 'Puddle', 2, 1], ['pigeons', 'Pigeons'], ['stray-cats', 'Stray cats']]],
    ['💀 Dungeon and lair', [['bone-pile', 'Bone pile'], ['skeleton', 'Skeleton'], ['dead-adventurer', 'Dead adventurer', 2, 1],
        ['carcass', 'Carcass', 2, 1], ['slime', 'Slime'], ['blood-pool', 'Blood pool'], ['cage', 'Cage'], ['shackles', 'Shackles'],
        ['prison-cell', 'Prison cell', 2, 2], ['torture-rack', 'Torture rack', 1, 2], ['stocks', 'Stocks'], ['gallows', 'Gallows', 2, 2],
        ['pit-trap', 'Pit trap'], ['spike-trap', 'Spike trap'], ['lever', 'Lever'], ['rubble', 'Rubble'], ['broken-pillar', 'Broken pillar', 2, 1],
        ['ladder', 'Ladder', 2, 1], ['spider-web', 'Spider web'], ['stalagmites', 'Stalagmites'], ['crystal', 'Crystals'],
        ['mushrooms', 'Mushrooms'], ['egg-nest', 'Egg nest', 2, 2], ['coin-pile', 'Coin pile'], ['treasure-hoard', 'Treasure hoard'],
        ['mimic-chest', 'Mimic chest'], ['gelatinous-cube', 'Gelatinous cube', 2, 2], ['chained-prisoner', 'Chained prisoner'],
        ['iron-maiden', 'Iron maiden'], ['bones-and-gear', 'Bones and gear', 2, 1], ['pressure-plate', 'Pressure plate'], ['dart-trap-wall', 'Dart trap wall'],
        ['rolling-boulder', 'Rolling boulder', 2, 2], ['collapsed-ceiling', 'Collapsed ceiling', 2, 2], ['chasm', 'Chasm', 2, 3],
        ['acid-pool', 'Acid pool', 2, 2], ['lava-crack', 'Lava crack', 2, 1], ['glowing-runes', 'Glowing runes'], ['ritual-altar', 'Ritual altar', 2, 2],
        ['obelisk', 'Obelisk']]],
    ['🐀 Thieves and sewers', [['fence-s-stash', "Fence's stash", 2, 1], ['sewer-grate', 'Sewer grate'], ['sewer-outflow', 'Sewer outflow', 2, 1],
        ['rat-swarm', 'Rat swarm']]],
    ['🛡️ Guards and war', [['guard-post', 'Guard post', 2, 2], ['cell-bars', 'Cell bars', 2, 2], ['bunk-room-beds', 'Bunk room', 4, 4],
        ['war-table', 'War table', 2, 2], ['army-tent', 'Army tent', 2, 2], ['spear-rack', 'Spear rack', 2, 1], ['arrow-barrel', 'Arrow barrel'],
        ['archery-target', 'Archery target'], ['training-dummy', 'Training dummy'], ['ballista', 'Ballista', 2, 2], ['catapult', 'Catapult', 2, 2],
        ['battering-ram', 'Battering ram', 1, 2], ['barricade', 'Barricade', 2, 1], ['sandbags', 'Sandbags', 2, 1], ['spiked-stakes', 'Spiked stakes', 2, 1],
        ['caltrops', 'Caltrops']]],
    ['🔮 Wizard', [['alchemy-table', 'Alchemy table', 2, 1], ['bookshelf', 'Bookshelf', 2, 1], ['desk', 'Desk', 2, 1], ['cauldron', 'Cauldron'],
        ['magic-circle', 'Magic circle', 3, 3], ['telescope', 'Telescope'], ['globe', 'Globe'], ['scroll-pile', 'Scroll pile'],
        ['specimen-shelf', 'Specimen shelf', 2, 1], ['summoning-circle', 'Summoning circle', 3, 3], ['teleport-pad', 'Teleport pad', 2, 2],
        ['arcane-orrery', 'Arcane orrery', 2, 2], ['crystal-ball', 'Crystal ball'], ['potion-shelf', 'Potion shelf', 2, 1], ['wand-display', 'Wand display'],
        ['familiar-perch', 'Familiar perch']]],
    ['🕯️ Temple', [['altar', 'Altar', 2, 1], ['idol', 'Idol'], ['statue', 'Statue'], ['pillar', 'Pillar'], ['brazier', 'Brazier'],
        ['fountain', 'Fountain', 2, 2], ['pews', 'Pew', 2, 1], ['font', 'Font'], ['candles', 'Candles'], ['gong', 'Gong'],
        ['shrine', 'Shrine'], ['lectern', 'Lectern'], ['offering-bowl', 'Offering bowl'], ['incense-burner', 'Incense burner'],
        ['prayer-mats', 'Prayer mats', 2, 1], ['church-bell', 'Church bell', 2, 1], ['stained-glass-light', 'Stained glass light', 2, 2],
        ['celtic-cross', 'Stone cross']]],
    ['⚰️ Crypt and barrow', [['coffin', 'Coffin', 1, 2], ['sarcophagus', 'Sarcophagus', 1, 2], ['urns', 'Urns'], ['headstone', 'Headstone'],
        ['open-grave', 'Open grave', 2, 1], ['burial-niche', 'Burial niche', 2, 1], ['grave-row', 'Row of graves', 3, 1], ['mausoleum', 'Mausoleum', 3, 2],
        ['iron-fence', 'Iron fence', 3, 1], ['dead-tree', 'Dead tree', 2, 2]]],
    ['⚓ Ship and water', [['ship-wheel', "Ship's wheel"], ['rowboat', 'Rowboat', 2, 1], ['cannon', 'Cannon', 2, 1], ['anchor', 'Anchor'],
        ['nets', 'Nets'], ['mast', 'Broken mast', 3, 1], ['sailing-ship-deck', 'Ship deck', 5, 10], ['fishing-boat', 'Fishing boat', 2, 4],
        ['dock-pilings', 'Dock pilings'], ['mooring-post', 'Mooring post'], ['cargo-crane', 'Cargo crane', 2, 2], ['rope-coils', 'Rope coils'],
        ['fish-barrels', 'Fish barrels'], ['lobster-pots', 'Lobster pots'], ['drying-fish-rack', 'Drying fish rack', 2, 1], ['buoy', 'Buoy'],
        ['seaweed', 'Seaweed', 2, 1], ['rock-outcrop', 'Rock outcrop', 2, 2]]],
    ['🐄 Farm and stable', [['horse-stall', 'Horse stall', 2, 2], ['horse', 'Horse', 1, 2], ['cow', 'Cow', 1, 2], ['pig', 'Pig'], ['sheep', 'Sheep'],
        ['goat', 'Goat'], ['pig-pen', 'Pig pen', 2, 2], ['feed-trough', 'Feed trough', 2, 1], ['hay-bales', 'Hay bales'], ['haystack', 'Haystack', 2, 2],
        ['grain-sacks', 'Grain sacks', 2, 1], ['butter-churn', 'Butter churn'], ['millstone', 'Millstone', 2, 2], ['plough', 'Plough'],
        ['ox-cart', 'Ox cart', 1, 3], ['beehives', 'Beehives', 2, 1], ['scarecrow', 'Scarecrow'], ['vegetable-patch', 'Vegetable patch', 2, 2],
        ['wheat-field', 'Wheat field', 3, 3], ['apple-tree', 'Apple tree', 2, 2], ['duck-pond', 'Duck pond', 3, 3], ['garden-bench', 'Garden bench', 2, 1]]],
    ['🌲 Outdoors and camp', [['tree', 'Tree', 2, 2], ['bush', 'Bush'], ['boulder', 'Boulder'], ['fallen-log', 'Fallen log', 2, 1],
        ['tent', 'Tent', 2, 2], ['campfire', 'Campfire'], ['bedrolls', 'Bedrolls'], ['well', 'Well'],
        ['oak-tree', 'Oak tree', 3, 3], ['willow-tree', 'Willow tree', 3, 3], ['pine-tree', 'Pine tree', 2, 2], ['birch-tree', 'Birch tree', 2, 2],
        ['autumn-tree', 'Autumn tree', 2, 2], ['palm-tree', 'Palm tree', 2, 2], ['tree-stump', 'Tree stump'], ['ferns', 'Ferns'], ['flowers', 'Flowers'],
        ['tall-grass', 'Tall grass'], ['reeds', 'Reeds'], ['lily-pads', 'Lily pads'], ['rock-cluster', 'Rock cluster', 2, 2],
        ['standing-stone', 'Standing stone'], ['fairy-ring', 'Fairy ring', 3, 3], ['cave-mouth', 'Cave mouth', 2, 2], ['animal-den', 'Animal den', 2, 2],
        ['cliff-edge', 'Cliff edge', 3, 1], ['snowdrift', 'Snowdrift', 2, 1], ['lean-to', 'Lean-to', 2, 2], ['hunter-s-blind', "Hunter's blind", 2, 2],
        ['cooking-spit', 'Cooking spit'], ['bandit-loot', 'Bandit loot', 2, 1]]],
    ['🧱 Walls, fences, and bridges', [['stone-wall', 'Stone wall', 3, 1], ['palisade', 'Palisade', 3, 1], ['picket-fence', 'Picket fence', 3, 1],
        ['split-rail-fence', 'Split-rail fence', 3, 1], ['hedgerow', 'Hedgerow', 3, 1], ['wooden-bridge', 'Wooden bridge', 2, 4],
        ['stone-bridge', 'Stone bridge', 2, 3], ['rope-bridge', 'Rope bridge', 2, 5], ['stepping-stones', 'Stepping stones', 1, 3]]],
    ['🎄 Winter festival', [['yule-tree', 'Yule tree', 2, 2], ['wrapped-gifts', 'Wrapped gifts'], ['gift-sack', 'Gift sack'],
        ['festive-hearth', 'Festive hearth', 2, 1], ['yule-log', 'Yule log'], ['feast-table', 'Feast table', 3, 1], ['cookie-tray', 'Cookie tray'],
        ['mulled-wine-pot', 'Mulled wine pot'], ['candy-cane-bundle', 'Candy canes'], ['gingerbread-house', 'Gingerbread house'],
        ['wreath', 'Wreath'], ['garland', 'Garland', 2, 1], ['mistletoe-bundle', 'Mistletoe'], ['holly-bush', 'Holly bush'],
        ['star-lanterns', 'Star lanterns'], ['carolers-lamppost', "Carolers' lamppost"], ['bell-tower-bells', 'Bells', 2, 1],
        ['toy-workbench', 'Toy workbench', 2, 1], ['toy-soldiers', 'Toy soldiers'], ['rocking-horse', 'Rocking horse'],
        ['market-chalet', 'Market chalet', 2, 2], ['sleigh', 'Sleigh', 1, 2], ['reindeer', 'Reindeer', 1, 2], ['snow-covered-cart', 'Snowy cart', 1, 2],
        ['snowman', 'Snowman'], ['snow-fort', 'Snow fort', 2, 1], ['snow-covered-pine', 'Snowy pine', 2, 2], ['frozen-pond', 'Frozen pond', 3, 3],
        ['ice-sculpture', 'Ice sculpture']]],
    ['🎃 Haunted', [['jack-o-lantern', "Jack-o'-lantern"], ['pumpkin-pile', 'Pumpkin pile', 2, 1], ['pumpkin-patch', 'Pumpkin patch', 2, 2],
        ['corn-stalk-bundle', 'Corn stalks'], ['hay-bale-spread', 'Hay bale display', 2, 1], ['ragged-scarecrow', 'Ragged scarecrow'],
        ['candy-bowl', 'Candy bowl'], ['witch-s-cauldron', "Witch's cauldron"], ['witch-s-hat', "Witch's hat"], ['broomstick', 'Broomstick'],
        ['black-cat', 'Black cat'], ['crow-murder', 'Crows'], ['bat-swarm', 'Bat swarm'], ['ghost', 'Ghost'], ['will-o-wisp', "Will-o'-wisp"],
        ['fog-bank', 'Fog bank', 2, 2], ['zombie-hands', 'Zombie hands'], ['severed-hand', 'Severed hand'], ['blood-trail', 'Blood trail', 2, 1],
        ['green-ooze-puddle', 'Ooze puddle', 2, 1], ['cobweb-corner', 'Cobweb corner'], ['giant-spider-web', 'Giant spider web', 2, 2],
        ['spider-egg-sacs', 'Spider egg sacs'], ['skull-candles', 'Skull candles'], ['skull-pyramid', 'Skull pile'],
        ['black-candle-circle', 'Black candle circle', 2, 2], ['bloody-altar', 'Bloody altar', 2, 1], ['ouija-table', 'Spirit board table'],
        ['haunted-mirror', 'Haunted mirror'], ['creepy-doll', 'Creepy doll'], ['rocking-chair', 'Rocking chair'],
        ['dusty-sheet-furniture', 'Sheeted furniture', 2, 1], ['hanging-cage', 'Hanging cage'], ['guillotine', 'Guillotine', 1, 2],
        ['executioner-s-block', "Executioner's block"], ['mad-doctor-s-table', "Mad doctor's table", 1, 2], ['specimen-jars', 'Specimen jars', 2, 1],
        ['tesla-coil', 'Lightning coil'], ['closed-coffin', 'Closed coffin', 1, 2], ['open-coffin', 'Open coffin', 1, 2],
        ['vampire-sarcophagus', 'Vampire sarcophagus', 1, 2], ['clawed-up-grave', 'Clawed-up grave', 1, 2], ['leaning-headstones', 'Leaning headstones', 2, 1],
        ['gravedigger-s-barrow', "Gravedigger's barrow", 1, 2], ['twisted-dead-oak', 'Twisted dead oak', 2, 2]]]
];
BM_PROP_GROUPS.forEach(([, items]) => items.forEach(([k, label, w = 1, h = 1]) => { BM_ITEMS[k] = { label, file: 'prop/' + k, w, h }; }));

// Table play (F76). A token's width in squares by creature size (a tiny one has a square to itself, drawn small).
const BM_TOKEN_SIZES = { T: 1, S: 1, M: 1, L: 2, H: 3, G: 4 };
const BM_TOKEN_SIZE_NAMES = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large (2 × 2)', H: 'Huge (3 × 3)', G: 'Gargantuan (4 × 4)' };
const BM_TOKEN_KINDS = { pc: '👤 Player character', foe: '👹 Monster', npc: '🧑 Ally or NPC', mark: '📍 Marker' };
// Token pictures: the Bestiary's creature types (img/creature) and the class portraits (img/class).
const BM_CREATURE_ART = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant',
    'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];
const BM_CLASS_ART = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
const bmHas = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

function bmArtOk(a) {
    const m = typeof a === 'string' && a.match(/^(creature|class)\/([a-z]+)$/);
    return !!m && (m[1] === 'creature' ? BM_CREATURE_ART : BM_CLASS_ART).includes(m[2]);
}

function bmId() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 16);
}

function bmBlank(w = 30, h = 20, name = 'New battlemap', style = 'art') {
    return {
        id: bmId(), name, w, h, style, t: Date.now(),
        fl: new Array(w * h).fill(0), hw: new Array((h + 1) * w).fill(0), vw: new Array(h * (w + 1)).fill(0),
        ob: [], lb: [], tk: [], fog: null
    };
}

function bmCopy(m) {
    return { ...m, fl: m.fl.slice(), hw: m.hw.slice(), vw: m.vw.slice(), ob: m.ob.map(o => ({ ...o })), lb: m.lb.map(l => ({ ...l })),
        tk: m.tk.map(t => ({ ...t })), fog: m.fog && m.fog.slice() };
}

// ── The saved and shared form ─────────────────────────────
// A run of numbers as letters with counts: [0, 0, 0, 2] → "a3c" (a = 0, b = 1, …, z = 25, then
// A = 26 … Z = 51, then _a = 52, _b = 53, …: the floors outgrew a–z, and old saves stay readable).
const bmRleCh = v => v < 26 ? String.fromCharCode(97 + v) : v < 52 ? String.fromCharCode(39 + v) : '_' + String.fromCharCode(45 + v);
const bmRleV = c => c[0] === '_' ? c.charCodeAt(1) - 45 : c >= 'a' ? c.charCodeAt(0) - 97 : c.charCodeAt(0) - 39;

function bmRle(arr) {
    let out = '';
    for (let i = 0; i < arr.length;) {
        let j = i;
        while (j < arr.length && arr[j] === arr[i]) j++;
        out += bmRleCh(arr[i]) + (j - i > 1 ? j - i : '');
        i = j;
    }
    return out;
}

// Back to n numbers from 0 to max, or null when it doesn't add up to n.
function bmUnRle(s, n, max) {
    if (typeof s !== 'string' || s.length > n * 8 + 8) return null;
    const out = [];
    const re = /(_[a-z]|[a-zA-Z])(\d*)/gy;
    let m;
    while ((m = re.exec(s))) {
        const v = bmRleV(m[1]), c = m[2] ? parseInt(m[2], 10) : 1;
        if (v > max || c < 1 || out.length + c > n) return null;
        for (let k = 0; k < c; k++) out.push(v);
        if (re.lastIndex === s.length) break;
    }
    return out.length === n ? out : null;
}

const bmR2 = v => Math.round(v * 100) / 100;

function bmPack(m) {
    const p = {
        v: 1, id: m.id, n: m.name, w: m.w, h: m.h, s: m.style, t: m.t,
        f: bmRle(m.fl), e: bmRle(m.hw.concat(m.vw)),
        o: m.ob.map(o => [o.k, bmR2(o.x), bmR2(o.y), bmR2(o.w), bmR2(o.h), Math.round(o.r) % 360]),
        l: m.lb.map(l => [bmR2(l.x), bmR2(l.y), l.t])
    };
    if (m.tk.length) p.k = m.tk.map(t => [t.id, t.n, bmR2(t.x), bmR2(t.y), t.s, t.c, t.a, t.f, t.hid ? 1 : 0]);
    if (m.fog) p.g = bmRle(m.fog);
    return p;
}

// A packed map back into a map, or null when it isn't one. Text is trimmed but kept as typed
// (the page escapes it).
function bmClean(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const side = v => Number.isInteger(v) && v >= 1 && v <= BM_LIMITS.side ? v : 0;
    const w = side(p.w), h = side(p.h);
    if (!w || !h) return null;
    const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
    const text = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
    const fl = bmUnRle(p.f, w * h, BM_FLOORS.length) || new Array(w * h).fill(0);
    const nh = (h + 1) * w, nv = h * (w + 1);
    const e = bmUnRle(p.e, nh + nv, 1) || new Array(nh + nv).fill(0);
    const ob = (Array.isArray(p.o) ? p.o : []).slice(0, BM_LIMITS.objs).map(o => {
        if (!Array.isArray(o) || typeof o[0] !== 'string' || !Object.prototype.hasOwnProperty.call(BM_ITEMS, o[0])) return null;
        const x = num(o[1], -2, w + 2), y = num(o[2], -2, h + 2), ow = num(o[3], 0.25, 20), oh = num(o[4], 0.25, 20), r = num(o[5], -360, 360);
        if ([x, y, ow, oh, r].includes(null)) return null;
        return { k: o[0], x, y, w: ow, h: oh, r: ((Math.round(r) % 360) + 360) % 360 };
    }).filter(Boolean);
    const lb = (Array.isArray(p.l) ? p.l : []).slice(0, BM_LIMITS.labels).map(l => {
        if (!Array.isArray(l)) return null;
        const x = num(l[0], 0, w), y = num(l[1], 0, h), t = text(l[2], BM_LIMITS.label);
        return x === null || y === null || !t ? null : { x, y, t };
    }).filter(Boolean);
    const ids = new Set();
    const tk = (Array.isArray(p.k) ? p.k : []).slice(0, BM_LIMITS.tokens).map(t => {
        if (!Array.isArray(t)) return null;
        const x = num(t[2], 0, w - 1), y = num(t[3], 0, h - 1), n = text(t[1], BM_LIMITS.tname);
        if (x === null || y === null || !n) return null;
        let id = typeof t[0] === 'string' && /^[a-z0-9]{1,16}$/.test(t[0]) ? t[0] : bmId();
        while (ids.has(id)) id = bmId();
        ids.add(id);
        return {
            id, n, x, y, s: bmHas(BM_TOKEN_SIZES, t[4]) ? t[4] : 'M', c: bmHas(BM_TOKEN_KINDS, t[5]) ? t[5] : 'mark',
            a: bmArtOk(t[6]) ? t[6] : '', f: Number.isInteger(t[7]) && t[7] > 0 && t[7] < 1e9 ? t[7] : 0, hid: t[8] === 1
        };
    }).filter(Boolean);
    return {
        id: typeof p.id === 'string' && /^[a-z0-9]{1,16}$/.test(p.id) ? p.id : bmId(),
        name: text(p.n, BM_LIMITS.name) || 'Untitled battlemap', w, h,
        style: BM_STYLES[p.s] ? p.s : 'art',
        t: num(p.t, 0, 1e15) || 0,
        fl, hw: e.slice(0, nh), vw: e.slice(nh), ob, lb, tk, fog: bmUnRle(p.g, w * h, 1)
    };
}

// ── Saving ────────────────────────────────────────────────
function bmLoadStore() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(BM_KEY) || 'null'); } catch (e) {}
    return bmCleanStore(raw);
}

// A saved store as the page keeps it (backup.js cleans an imported one with this too).
function bmCleanStore(raw) {
    const maps = raw && Array.isArray(raw.maps) ? raw.maps.slice(0, BM_LIMITS.maps).map(bmClean).filter(Boolean) : [];
    const seen = new Set();
    maps.forEach(m => { if (seen.has(m.id)) m.id = bmId(); seen.add(m.id); });
    const cur = raw && maps.some(m => m.id === raw.cur) ? raw.cur : (maps[0] ? maps[0].id : null);
    return { cur, maps };
}

// False when the browser wouldn't keep it (storage full or turned off).
function bmSaveStore(store) {
    try {
        localStorage.setItem(BM_KEY, JSON.stringify({ v: 1, cur: store.cur, maps: store.maps.map(bmPack) }));
        return true;
    } catch (e) {
        return false;
    }
}

// ── Editing ───────────────────────────────────────────────
function bmIn(m, x, y) {
    return x >= 0 && y >= 0 && x < m.w && y < m.h;
}

function bmFloorAt(m, x, y) {
    return bmIn(m, x, y) ? m.fl[y * m.w + x] : 0;
}

// The map at a new size, cut or grown at the right and bottom. Things left off it go.
function bmResize(m, w, h) {
    const n = { ...bmBlank(w, h, m.name, m.style), id: m.id, t: m.t };
    // New squares come in hidden.
    if (m.fog) {
        n.fog = new Array(w * h).fill(0);
        for (let y = 0; y < Math.min(h, m.h); y++) for (let x = 0; x < Math.min(w, m.w); x++) n.fog[y * w + x] = m.fog[y * m.w + x];
    }
    n.tk = m.tk.filter(t => t.x < w && t.y < h).map(t => ({ ...t }));
    for (let y = 0; y < Math.min(h, m.h); y++) {
        for (let x = 0; x < Math.min(w, m.w); x++) n.fl[y * w + x] = m.fl[y * m.w + x];
    }
    for (let y = 0; y <= Math.min(h, m.h); y++) {
        for (let x = 0; x < Math.min(w, m.w); x++) n.hw[y * w + x] = m.hw[y * m.w + x];
    }
    for (let y = 0; y < Math.min(h, m.h); y++) {
        for (let x = 0; x <= Math.min(w, m.w); x++) n.vw[y * (w + 1) + x] = m.vw[y * (m.w + 1) + x];
    }
    n.ob = m.ob.filter(o => o.x >= 0 && o.y >= 0 && o.x <= w && o.y <= h).map(o => ({ ...o }));
    n.lb = m.lb.filter(l => l.x <= w && l.y <= h).map(l => ({ ...l }));
    return n;
}

// Fill the squares joined to x, y that have its floor with floor v. Drawn walls stop it.
// Returns how many squares changed.
function bmFill(m, x, y, v) {
    if (!bmIn(m, x, y)) return 0;
    const from = m.fl[y * m.w + x];
    if (from === v) return 0;
    const stack = [[x, y]];
    let n = 0;
    while (stack.length) {
        const [cx, cy] = stack.pop();
        const i = cy * m.w + cx;
        if (m.fl[i] !== from) continue;
        m.fl[i] = v;
        n++;
        if (cx > 0 && !m.vw[cy * (m.w + 1) + cx]) stack.push([cx - 1, cy]);
        if (cx < m.w - 1 && !m.vw[cy * (m.w + 1) + cx + 1]) stack.push([cx + 1, cy]);
        if (cy > 0 && !m.hw[cy * m.w + cx]) stack.push([cx, cy - 1]);
        if (cy < m.h - 1 && !m.hw[(cy + 1) * m.w + cx]) stack.push([cx, cy + 1]);
    }
    return n;
}

// An object's size as it lies, turned (for snapping it to the grid).
function bmLaidSize(o) {
    const turned = Math.round(o.r / 90) % 2 === 1 && o.r % 90 === 0;
    return turned ? [o.h, o.w] : [o.w, o.h];
}

// Where an object goes when it snaps: an edge door's middle on the nearest grid line between
// two squares (turned to lie along it); anything else with its sides on grid lines.
function bmSnap(o, x, y) {
    const it = BM_ITEMS[o.k];
    if (it.edge) {
        const fx = x - Math.floor(x), fy = y - Math.floor(y);
        // The nearer of the square's sides: across (top or bottom) or down (left or right).
        const across = Math.min(fy, 1 - fy) < Math.min(fx, 1 - fx);
        return across ? { x: Math.floor(x) + 0.5, y: Math.round(y), r: 0 } : { x: Math.round(x), y: Math.floor(y) + 0.5, r: 90 };
    }
    const [w, h] = bmLaidSize(o);
    const to = (v, s) => Math.round(s) % 2 ? Math.floor(v) + 0.5 : Math.round(v);
    return { x: to(x, w), y: to(y, h), r: o.r };
}

// Is the point x, y (squares) on the object, turned as it is?
function bmHit(o, x, y) {
    const a = -o.r * Math.PI / 180, dx = x - o.x, dy = y - o.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    const it = BM_ITEMS[o.k];
    const hw = Math.max(o.w * (it.pw || 1), 0.5) / 2, hh = Math.max(o.h * (it.ph || 1), 0.5) / 2;
    return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

// ── Drawing ───────────────────────────────────────────────
const bmF1 = v => String(Math.round(v * 10) / 10);

// The floor pictures as patterns (one floor tile covers 4 × 4 squares, as on the Sites tab).
function bmDefs(uid, floors = BM_FLOORS) {
    const T = SITE_FLOOR_TILE;
    return floors.map(name => `<pattern id="${uid}-fl-${name}" patternUnits="userSpaceOnUse" width="${T}" height="${T}"><image href="${SITE_ART_DIR}floor/${name}.webp" width="${T}" height="${T}"/></pattern>`).join('');
}

function bmFloorsUsed(m) {
    const used = new Set(m.fl);
    return BM_FLOORS.filter((_, k) => used.has(k + 1));
}

// Each floor as one path of row runs.
function bmFloorSvg(m, art, uid) {
    const S = SITE_SQUARE, d = {};
    for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w;) {
            const v = m.fl[y * m.w + x];
            let e = x + 1;
            while (e < m.w && m.fl[y * m.w + e] === v) e++;
            if (v) d[v] = (d[v] || '') + `M${x * S} ${y * S}h${(e - x) * S}v${S}h${(x - e) * S}z`;
            x = e;
        }
    }
    return Object.entries(d).map(([v, path]) => {
        const name = BM_FLOORS[v - 1];
        return art ? `<path class="bm-afloor" style="fill:url(#${uid}-fl-${name})" d="${path}"/>` : `<path class="bm-floor bm-fl-${name}" d="${path}"/>`;
    }).join('');
}

// Every wall as one path: the drawn ones, and wherever floor meets bare rock.
function bmWallPath(m) {
    const S = SITE_SQUARE, on = (x, y) => bmFloorAt(m, x, y) > 0;
    let d = '';
    for (let y = 0; y <= m.h; y++) {
        let run = -1;
        for (let x = 0; x <= m.w; x++) {
            const wall = x < m.w && (m.hw[y * m.w + x] || on(x, y - 1) !== on(x, y));
            if (wall && run < 0) run = x;
            if (!wall && run >= 0) { d += `M${run * S} ${y * S}H${x * S}`; run = -1; }
        }
    }
    for (let x = 0; x <= m.w; x++) {
        let run = -1;
        for (let y = 0; y <= m.h; y++) {
            const wall = y < m.h && (m.vw[y * (m.w + 1) + x] || on(x - 1, y) !== on(x, y));
            if (wall && run < 0) run = y;
            if (!wall && run >= 0) { d += `M${x * S} ${run * S}V${y * S}`; run = -1; }
        }
    }
    return d;
}

function bmWallSvg(m) {
    const d = bmWallPath(m);
    return d ? `<path class="bm-wall" d="${d}"/>` : '';
}

// One object, drawn lying along x before it's turned. Classic ink draws the doors and stairs
// as the Sites tab's classic map does; furniture keeps its picture in both styles.
function bmObjSvg(o, art, secret = true) {
    const it = BM_ITEMS[o.k], S = SITE_SQUARE;
    const w = o.w * S, h = o.h * S;
    const at = `translate(${bmF1(o.x * S)} ${bmF1(o.y * S)})`;
    if (o.k === 'secret') return secret ? `<text class="bm-s" x="${bmF1(o.x * S)}" y="${bmF1(o.y * S)}" style="font-size:${bmF1(13 * Math.min(o.w, o.h))}px">S</text>` : '';
    let body;
    const look = it.ink || o.k;
    if (art || !it.door) {
        body = siteArtImg(it.file, 0, 0, w * (it.pw || 1), h * (it.ph || 1));
    } else if (['wood', 'iron', 'barred', 'seal'].includes(look)) {
        body = `<rect class="bm-door" x="${bmF1(-w * 0.6)}" y="${bmF1(-h * 0.3)}" width="${bmF1(w * 1.2)}" height="${bmF1(h * 0.6)}"/>`
            + (look === 'iron' || look === 'seal' ? `<circle class="bm-lock" cx="0" cy="0" r="${bmF1(Math.min(w, h) * 0.18)}"/>` : '')
            + (look === 'barred' ? `<rect class="bm-lock" x="${bmF1(-w * 0.55)}" y="${bmF1(-h * 0.07)}" width="${bmF1(w * 1.1)}" height="${bmF1(h * 0.14)}"/>` : '');
    } else if (look === 'window') {
        body = `<rect class="bm-door" x="${bmF1(-w * 0.5)}" y="${bmF1(-h * 0.12)}" width="${bmF1(w)}" height="${bmF1(h * 0.24)}"/>`;
    } else if (look === 'open') {
        // A gap in the wall: just its two jambs.
        body = [-0.5, 0.5].map(s => `<line class="bm-port" x1="${bmF1(s * w)}" y1="${bmF1(-h * 0.25)}" x2="${bmF1(s * w)}" y2="${bmF1(h * 0.25)}"/>`).join('');
    } else if (look === 'portcullis') {
        body = `<line class="bm-port" x1="${bmF1(-w * 0.7)}" y1="0" x2="${bmF1(w * 0.7)}" y2="0"/>`;
    } else if (look === 'stairs') {
        body = '';
        for (let k = 0; k < 5; k++) {
            const y = -h * 0.4 + k * h * 0.2;
            body += `<line class="bm-stair" x1="${bmF1(-w * 0.4)}" y1="${bmF1(y)}" x2="${bmF1(w * 0.4)}" y2="${bmF1(y)}"/>`;
        }
    } else if (o.k === 'spiral') {
        const r = Math.min(w, h) * 0.42;
        body = `<circle class="bm-stair" cx="0" cy="0" r="${bmF1(r)}"/>`;
        for (let k = 0; k < 6; k++) {
            const a = k * Math.PI / 3;
            body += `<line class="bm-stair" x1="0" y1="0" x2="${bmF1(Math.cos(a) * r)}" y2="${bmF1(Math.sin(a) * r)}"/>`;
        }
    } else {
        body = `<rect class="bm-trap" x="${bmF1(-w * 0.4)}" y="${bmF1(-h * 0.4)}" width="${bmF1(w * 0.8)}" height="${bmF1(h * 0.8)}"/>`
            + `<path class="bm-stair" d="M${bmF1(-w * 0.4)} ${bmF1(-h * 0.4)}L${bmF1(w * 0.4)} ${bmF1(h * 0.4)}M${bmF1(w * 0.4)} ${bmF1(-h * 0.4)}L${bmF1(-w * 0.4)} ${bmF1(h * 0.4)}"/>`;
    }
    return `<g class="${it.door ? 'bm-dobj' : 'bm-prop'}" transform="${at}${o.r ? ` rotate(${o.r})` : ''}">${body}</g>`;
}

function bmPropSvg(m, art) {
    return m.ob.filter(o => !BM_ITEMS[o.k].door).map(o => bmObjSvg(o, art)).join('');
}

function bmDoorSvg(m, art, secret = true) {
    return m.ob.filter(o => BM_ITEMS[o.k].door).map(o => bmObjSvg(o, art, secret)).join('');
}

function bmGridSvg(m, view = null) {
    const S = SITE_SQUARE, v = view || { x: 0, y: 0, w: m.w, h: m.h };
    let d = '';
    for (let x = v.x + 1; x < v.x + v.w; x++) d += `M${x * S} ${v.y * S}V${(v.y + v.h) * S}`;
    for (let y = v.y + 1; y < v.y + v.h; y++) d += `M${v.x * S} ${y * S}H${(v.x + v.w) * S}`;
    return d ? `<path class="bm-grid" d="${d}"/>` : '';
}

function bmLabelSvg(l) {
    const S = SITE_SQUARE, x = bmF1(l.x * S), y = bmF1(l.y * S);
    const n = [...l.t].length;
    const bg = n <= 2
        ? `<circle class="bm-lab-bg" cx="${x}" cy="${y}" r="5.5"/>`
        : `<rect class="bm-lab-bg" x="${bmF1(l.x * S - (n * 4.2 + 5) / 2)}" y="${bmF1(l.y * S - 5.5)}" width="${bmF1(n * 4.2 + 5)}" height="11" rx="5.5"/>`;
    return `<g class="bm-label">${bg}<text class="bm-lab" x="${x}" y="${y}">${siteAttr(l.t)}</text></g>`;
}

function bmLabelsSvg(m) {
    return m.lb.map(bmLabelSvg).join('');
}

// ── Table play (F76) ──────────────────────────────────────
// The squares a token stands on: [x0, y0, x1, y1], the last ones included.
function bmTokenFoot(t) {
    const n = BM_TOKEN_SIZES[t.s] || 1;
    return [Math.floor(t.x + 0.01), Math.floor(t.y + 0.01), Math.ceil(t.x + n - 0.01) - 1, Math.ceil(t.y + n - 0.01) - 1];
}

// Can the players see any of the squares under it?
function bmTokenSeen(m, t) {
    if (!m.fog) return true;
    const [x0, y0, x1, y1] = bmTokenFoot(t);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (bmIn(m, x, y) && m.fog[y * m.w + x]) return true;
    return false;
}

// The room (or run of corridor) at square x, y, for the fog: the floor joined to it, stopped by drawn
// walls and by doors, and the bare rock around it, so its walls show whole. [] on bare rock.
function bmRoom(m, x, y) {
    if (!bmFloorAt(m, x, y)) return [];
    const hw = m.hw.slice(), vw = m.vw.slice();
    m.ob.forEach(o => {
        if (!BM_ITEMS[o.k].edge) return;
        if (o.r % 180 === 0) {
            const gx = Math.floor(o.x), gy = Math.round(o.y);
            if (gx >= 0 && gx < m.w && gy >= 0 && gy <= m.h) hw[gy * m.w + gx] = 1;
        } else if (o.r % 180 === 90) {
            const gx = Math.round(o.x), gy = Math.floor(o.y);
            if (gy >= 0 && gy < m.h && gx >= 0 && gx <= m.w) vw[gy * (m.w + 1) + gx] = 1;
        }
    });
    const seen = new Uint8Array(m.w * m.h), out = [], stack = [[x, y]];
    seen[y * m.w + x] = 1;
    const go = (nx, ny, wall) => {
        if (wall || !bmFloorAt(m, nx, ny) || seen[ny * m.w + nx]) return;
        seen[ny * m.w + nx] = 1;
        stack.push([nx, ny]);
    };
    while (stack.length) {
        const [cx, cy] = stack.pop();
        out.push(cy * m.w + cx);
        go(cx - 1, cy, vw[cy * (m.w + 1) + cx]);
        go(cx + 1, cy, vw[cy * (m.w + 1) + cx + 1]);
        go(cx, cy - 1, hw[cy * m.w + cx]);
        go(cx, cy + 1, hw[(cy + 1) * m.w + cx]);
    }
    out.slice().forEach(i => {
        const cx = i % m.w, cy = (i - cx) / m.w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (bmIn(m, nx, ny) && !m.fl[ny * m.w + nx] && !seen[ny * m.w + nx]) { seen[ny * m.w + nx] = 1; out.push(ny * m.w + nx); }
        }
    });
    return out;
}

// The round frame the token pictures are cut to (one per SVG, in its defs).
function bmTokenDefs(uid) {
    return `<clipPath id="${uid}-tok" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5"/></clipPath>`;
}

function bmInitials(name) {
    const w = String(name).replace(/\s+\d+$/, '').split(/\s+/).filter(Boolean);
    const num = (String(name).match(/\s(\d+)$/) || [])[1];
    return ((w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)) + (num || '')).toUpperCase().slice(0, 3);
}

// The tokens as the page has worked them out: each { x, y, s, c, a, n (the name to show),
// now (its turn), bar (hit points, 0 to 1, or null), health ('bloodied' | 'down' | null),
// conds (names), hp (hit points as text, for the hover tip), hid (hidden from the players: drawn
// faint), sel (picked up) }.
// opts: uid (the SVG's), names (a name under each token).
function bmTokenSvg(list, opts = {}) {
    const { uid = 'bm', names = true } = opts, S = SITE_SQUARE;
    return list.map(t => {
        const n = BM_TOKEN_SIZES[t.s] || 1, r = (t.s === 'T' ? 0.3 : n * 0.44) * S;
        const cls = `bm-tok bm-tok-${t.c}${t.now ? ' bm-tok-now' : ''}${t.health ? ' bm-tok-' + t.health : ''}${t.hid ? ' bm-tok-hid' : ''}${t.sel ? ' bm-tok-sel' : ''}`;
        const R = bmF1(r), D = bmF1(r * 2);
        let body = t.now ? `<circle class="bm-tok-turn" r="${bmF1(r + 1.8)}"/>` : '';
        body += `<circle class="bm-tok-bg" r="${R}"/>`;
        body += t.a
            ? `<image href="img/${t.a}-sm.webp" x="-${R}" y="-${R}" width="${D}" height="${D}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid}-tok)"/>`
            : `<text class="bm-tok-ini" style="font-size:${bmF1(r * (bmInitials(t.n).length > 2 ? 0.62 : 0.8))}px">${siteAttr(bmInitials(t.n))}</text>`;
        body += `<circle class="bm-tok-ring" r="${R}"/>`;
        if (t.health === 'down') body += `<path class="bm-tok-x" d="M-${bmF1(r * 0.6)} -${bmF1(r * 0.6)}L${bmF1(r * 0.6)} ${bmF1(r * 0.6)}M${bmF1(r * 0.6)} -${bmF1(r * 0.6)}L-${bmF1(r * 0.6)} ${bmF1(r * 0.6)}"/>`;
        if (typeof t.bar === 'number') {
            const bw = Math.max(r * 1.6, 6), f = Math.max(0, Math.min(1, t.bar));
            body += `<rect class="bm-tok-hpbg" x="${bmF1(-bw / 2)}" y="${bmF1(r - 1.2)}" width="${bmF1(bw)}" height="1.6" rx="0.5"/>`
                + `<rect class="bm-tok-hp${f <= 0.5 ? ' bm-tok-hplow' : ''}" x="${bmF1(-bw / 2)}" y="${bmF1(r - 1.2)}" width="${bmF1(bw * f)}" height="1.6" rx="0.5"/>`;
        }
        if (t.conds && t.conds.length) {
            const bx = bmF1(r * 0.75), by = bmF1(-r * 0.75);
            body += `<circle class="bm-tok-cond" cx="${bx}" cy="${by}" r="2"/><text class="bm-tok-condn" x="${bx}" y="${by}">${t.conds.length}</text>`;
        }
        if (names) body += `<text class="bm-tok-name" y="${bmF1(r + 3.6)}">${siteAttr(t.n)}</text>`;
        const tip = [t.n, t.hp || '', t.conds && t.conds.length ? t.conds.join(', ') : ''].filter(Boolean).join(' · ');
        return `<g class="${cls}" transform="translate(${bmF1((t.x + n / 2) * S)} ${bmF1((t.y + n / 2) * S)})"><title>${siteAttr(tip)}</title>${body}</g>`;
    }).join('');
}

// The hidden squares. players: solid black; otherwise the DM's see-through shade.
function bmFogSvg(m, players = false) {
    if (!m.fog) return '';
    const S = SITE_SQUARE;
    let d = '';
    for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w;) {
            const v = m.fog[y * m.w + x];
            let e = x + 1;
            while (e < m.w && m.fog[y * m.w + e] === v) e++;
            if (!v) d += `M${x * S} ${y * S}h${(e - x) * S}v${S}h${(x - e) * S}z`;
            x = e;
        }
    }
    return d ? `<path class="${players ? 'bm-fog-pl' : 'bm-fog-dm'}" d="${d}"/>` : '';
}

// The whole map. opts: style (the map's own unless given), grid, labels, secret (false leaves
// the secret doors out, for the players' copy), view ({ x, y, w, h } in squares: just that
// part, for printing a page at a time), uid (pattern ids: one per SVG on the page).
// The token and fog layers are left empty: table play fills them (bmTokenSvg, bmFogSvg).
function bmSvg(m, opts = {}) {
    const { style = m.style, grid = true, labels = true, secret = true, view = null, uid = 'bm', title = m.name } = opts;
    const S = SITE_SQUARE, art = style === 'art', v = view || { x: 0, y: 0, w: m.w, h: m.h };
    return `<svg class="bm-map bm-${art ? 'art' : 'classic'}" viewBox="${v.x * S} ${v.y * S} ${v.w * S} ${v.h * S}" role="img" aria-label="${siteAttr(title)}" xmlns="http://www.w3.org/2000/svg">
        <defs>${art ? bmDefs(uid, bmFloorsUsed(m)) : ''}${bmTokenDefs(uid)}</defs>
        <rect class="bm-bg" x="${v.x * S}" y="${v.y * S}" width="${v.w * S}" height="${v.h * S}"/>
        ${bmFloorSvg(m, art, uid)}${bmPropSvg(m, art)}${bmWallSvg(m)}${bmDoorSvg(m, art, secret)}${grid ? bmGridSvg(m, v) : ''}${labels ? bmLabelsSvg(m) : ''}
        <g class="bm-tokens"></g><g class="bm-fog"></g>
    </svg>`;
}

// ── From a rolled site (the Sites tab's ✏️ Edit in the Battlemap Builder) ──
// The site's battle map as siteMapSvg draws it with snap on, square by square: each room's
// floor, its corridors, its doors and furniture where they stand, and its room numbers.
function bmFromSite(s, style = 'art') {
    const S = SITE_SQUARE, KA = SITE_ART_KINDS[s.kind];
    const cells = s.map.cells.map(c => ({ ...c, w: siteSnapSize(c.w), h: siteSnapSize(c.h) }));
    const center = c => siteCenter(c, true);
    const cols = Math.max(...cells.map(c => c.x)) + 1, rows = Math.max(...cells.map(c => c.y)) + 1;
    const W = Math.ceil((cols * SITE_CELL.w + SITE_CELL.pad * 2) / S), H = Math.ceil((rows * SITE_CELL.h + SITE_CELL.pad * 2) / S);
    const fl = new Array(W * H).fill(0);
    const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) fl[y * W + x] = v; };
    const fn = name => BM_FLOORS.indexOf(name) + 1;
    const ob = [], lb = [];

    s.map.edges.forEach((e, k) => {
        const pa = center(cells[e.a]), pb = center(cells[e.b]);
        const x0 = Math.floor(Math.min(pa.x, pb.x) / S), x1 = Math.floor(Math.max(pa.x, pb.x) / S);
        const y0 = Math.floor(Math.min(pa.y, pb.y) / S), y1 = Math.floor(Math.max(pa.y, pb.y) / S);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, fn(KA.floor));
        // The door, halfway between the two walls (as siteMapSvg puts it), on the nearest grid line.
        const A = cells[e.a], B = cells[e.b], dx = Math.sign(B.x - A.x), dy = Math.sign(B.y - A.y);
        const ra = siteReach(A, siteRoomShape(s, e.a), dx), rb = siteReach(B, siteRoomShape(s, e.b), dx);
        const gap = (dx ? Math.abs(pb.x - pa.x) : Math.abs(pb.y - pa.y)) - ra - rb;
        const x = (pa.x + dx * (ra + gap / 2)) / S, y = (pa.y + dy * (ra + gap / 2)) / S;
        const kind = s.doors[k];
        const locked = KA.locked === 'barred-door' ? 'barred' : KA.locked === 'magic-seal' ? 'seal' : 'iron';
        const k2 = kind === 'locked' ? locked : kind === 'portcullis' ? 'portcullis' : kind === 'secret' ? 'secret'
            : kind === 'stairs' ? 'spiral' : (kind === 'door' || kind === 'stuck') ? (KA.door === 'iron-door' ? 'iron' : 'wood') : null;
        if (!k2) return;
        if (k2 === 'spiral') ob.push({ k: k2, x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, w: 1, h: 1, r: 0 });
        else if (dx) ob.push({ k: k2, x: Math.round(x), y, w: 1, h: 1, r: 90 });
        else ob.push({ k: k2, x, y: Math.round(y), w: 1, h: 1, r: 0 });
    });

    const ctx = document.createElement('canvas').getContext('2d');
    cells.forEach((c, i) => {
        const p = center(c), shape = siteRoomShape(s, i), v = fn(siteArtFloor(s, i));
        const r = Math.min(c.w, c.h) / 2;
        const cave = shape === 'cave' ? new Path2D(siteCavePath(s, i, p.x, p.y, c.w / 2, c.h / 2)) : null;
        const inside = (px, py) => shape === 'circle' ? Math.hypot(px - p.x, py - p.y) < r
            : cave ? ctx.isPointInPath(cave, px, py) : Math.abs(px - p.x) < c.w / 2 && Math.abs(py - p.y) < c.h / 2;
        for (let y = Math.floor((p.y - c.h / 2) / S); y <= Math.floor((p.y + c.h / 2) / S); y++) {
            for (let x = Math.floor((p.x - c.w / 2) / S); x <= Math.floor((p.x + c.w / 2) / S); x++) {
                if (inside(x * S + S / 2, y * S + S / 2)) put(x, y, v);
            }
        }
        const drawn = shape === 'circle' ? { ...c, w: r * 2, h: r * 2 } : c;
        siteArtProps(s, i, drawn, p, shape !== 'rect').forEach(q => {
            if (BM_ITEMS[q.file]) ob.push({ k: q.file, x: q.x / S, y: q.y / S, w: q.w / S, h: q.h / S, r: 0 });
        });
        lb.push({ x: p.x / S, y: p.y / S, t: String(i + 1) });
    });

    // Trim the bare rock to one square around the floor.
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (fl[y * W + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
    const w = Math.min(BM_LIMITS.side, Math.min(W, x1 + 2) - x0), h = Math.min(BM_LIMITS.side, Math.min(H, y1 + 2) - y0);
    const m = bmBlank(w, h, String(s.name).slice(0, BM_LIMITS.name), BM_STYLES[style] ? style : 'art');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m.fl[y * w + x] = fl[(y + y0) * W + x + x0];
    m.ob = ob.map(o => ({ ...o, x: o.x - x0, y: o.y - y0 })).filter(o => o.x >= 0 && o.y >= 0 && o.x <= w && o.y <= h);
    m.lb = lb.map(l => ({ ...l, x: l.x - x0, y: l.y - y0 })).filter(l => l.x >= 0 && l.y >= 0 && l.x <= w && l.y <= h);
    return m;
}
