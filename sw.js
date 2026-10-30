// Offline support for the Gazette (F15).
// - PRECACHE files are saved on install and served from the cache first, so the tools work offline.
// - Everything else on this site (news: index.html, articles.json, glossary.json, a/, desk/, archive,
//   images, ...) is network-first: always fresh online, and the last copy seen is kept for offline.
// - Google Fonts are kept too, so pages still look right offline.
// VERSION is stamped by export-pages.ps1 from a hash of the PRECACHE files. Any change to one of them
// (then running the export) installs a new cache; old caches are deleted on activate.
// Cache keys drop the query string (?seed=, ?t=, ?id= ...): pages rebuild their state from the URL.
// Links use clean addresses (about, a/<id>); keyFor maps each one to its file's key (about.html).

const VERSION = '4b4ab0170c43';
const STATIC = 'gazette-static-' + VERSION;
const PAGES = 'gazette-pages';
const FONTS = 'gazette-fonts';

const PRECACHE = [
  // Tool pages
  'npc-generator.html', 'loot-generator.html', 'rumors.html', 'spellbook.html',
  'economy.html', 'shop.html', 'session-kit.html', 'dnd-one-shot-generator.html', 'dnd-campaign-generator.html', 'toolbox.html', 'worldbuilder.html', 'rules.html', 'bestiary.html', 'monster-maker.html', 'handouts.html', 'privacy.html', 'player-view.html', 'battlemap-view.html', 'dm-screen.html', 'screen-view.html', 'character-builder.html', 'dnd-point-buy-calculator.html', 'dnd-backstory-generator.html', 'dnd-multiclass-calculator.html', 'dnd-spell-planner.html', 'dnd-character-cards.html', 'dnd-attack-calculator.html', 'dnd-player-journal.html', 'dnd-character-sheet.html', 'dnd-battlemap-builder.html', 'fantasy-world-map-maker.html', 'edition.html', 'pathfinder.html', 'pathfinder-license.html', 'pathfinder-tavern-name-generator.html', 'pathfinder-calendar-generator.html', 'pathfinder-npc-generator.html', 'pathfinder-player-view.html',
  // Styles and scripts
  'style.css', 'homepage.css', 'economy-page.css', 'handouts.css', 'cards.css', 'sw-register.js',
  'rules-system.js', 'rules-pf2e.js', 'pf2e-creatures-data.js', 'pf2e-hazards-data.js', 'rng.js', 'tab-pages.js', 'npc-data.js', 'npc-statblock.js', 'spell-detail.js', 'npc-generator.js', 'loot-data.js', 'loot-engine.js', 'loot-generator.js', 'magic-items-data.js',
  'coins.js', 'market-data.js', 'economy-full.js', 'names-data.js', 'shop-engine.js', 'shop.js', 'handout-engine.js', 'handouts.js',
  'town-crier.js', 'rumor-deck.js', 'rumors.js', 'session-kit.js', 'oneshot-engine.js', 'oneshot-view.js', 'oneshot.js', 'campaign-engine.js', 'campaign.js', 'travel-engine.js', 'dice-engine.js', 'dice-fab.js', 'toolbox.js', 'toolbox-table.js', 'monsters-data.js', 'monster-statblocks.js', 'toolbox-statblock.js', 'encounter-engine.js', 'toolbox-encounter.js', 'tavern-engine.js', 'toolbox-tavern.js', 'downtime-engine.js', 'toolbox-downtime.js', 'quest-engine.js', 'toolbox-quest.js', 'toolbox-clocks.js', 'party.js', 'toolbox-party.js', 'table-engine.js', 'toolbox-tables.js', 'init-view.js', 'player-view.js', 'dm-screen-data.js', 'dm-screen.js', 'screen-view.js', 'rules-data.js', 'rules.js', 'bestiary.js', 'homebrew.js', 'monster-maker.js', 'calendar-engine.js', 'pantheon-engine.js', 'worldbuilder.js', 'world-calendar.js', 'world-pantheon.js', 'faction-engine.js', 'world-factions.js', 'history-engine.js', 'world-history.js', 'town-engine.js', 'world-town.js', 'family-tree.js', 'family-engine.js', 'world-family.js', 'site-engine.js', 'world-sites.js', 'continent-engine.js', 'world-pins.js', 'world-continent.js', 'world-maps.js', 'map-export.js', 'map-pins.js', 'map-store.js', 'battlemap-engine.js', 'battlemap-play.js', 'battlemap-table.js', 'battlemap.js', 'battlemap-view.js', 'battlemap.css', 'worldmap-engine.js', 'worldmap.js', 'notebook.js', 'docx.js', 'notebook-sheets.js', 'world-notebook.js', 'web-graph.js', 'world-web.js', 'backup.js', 'spells-data.js', 'character-data.js', 'character-engine.js', 'point-buy.js', 'backstory.js', 'multiclass.js', 'spell-summaries.js', 'cards.js', 'spell-planner.js', 'character-cards.js', 'attack-math.js', 'player-journal.js', 'character-builder.js', 'character-play.js', 'character-sheet.js', 'classifieds.js', 'script.js', 'daily.js', 'edition.js', 'raven-form.js', 'nav.js',
  // Data
  'rumors.json',
  // Icons
  'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'site.webmanifest', 'img/icon-192.png',
  // The offline page's mascot
  'img/mascot/offline.webp'
];

// The Toolbox's and the Worldbuilder's tab pages (SEO11) are copies of their hub, so offline, one
// that was never opened falls back to the hub's saved copy (tab-pages.js opens the right tab).
// Written by export-tools.ps1.
const TAB_HUBS = {"tavern-name-generator.html":"toolbox.html","dnd-tavern-generator.html":"toolbox.html","dnd-side-quest-generator.html":"toolbox.html","dnd-travel-weather-generator.html":"toolbox.html","dnd-dice-roller.html":"toolbox.html","random-table-roller.html":"toolbox.html","dnd-party-tracker.html":"toolbox.html","dnd-encounter-builder.html":"toolbox.html","dnd-initiative-tracker.html":"toolbox.html","progress-clocks.html":"toolbox.html","dnd-loot-splitter.html":"toolbox.html","dnd-downtime-tracker.html":"toolbox.html","fantasy-calendar-generator.html":"worldbuilder.html","dnd-pantheon-generator.html":"worldbuilder.html","dnd-faction-generator.html":"worldbuilder.html","fantasy-history-generator.html":"worldbuilder.html","dnd-town-generator.html":"worldbuilder.html","fantasy-family-tree-generator.html":"worldbuilder.html","dnd-dungeon-generator.html":"worldbuilder.html","fantasy-map-generator.html":"worldbuilder.html","dnd-campaign-map.html":"worldbuilder.html","dnd-campaign-notebook.html":"worldbuilder.html","npc-relationship-web.html":"worldbuilder.html","pathfinder-tavern-name-generator.html":"pathfinder-tavern-name-generator.html","pathfinder-dice-roller.html":"pathfinder-tavern-name-generator.html","pathfinder-random-table-roller.html":"pathfinder-tavern-name-generator.html","pathfinder-progress-clocks.html":"pathfinder-tavern-name-generator.html","pathfinder-loot-splitter.html":"pathfinder-tavern-name-generator.html","pathfinder-encounter-builder.html":"pathfinder-tavern-name-generator.html","pathfinder-party-tracker.html":"pathfinder-tavern-name-generator.html","pathfinder-initiative-tracker.html":"pathfinder-tavern-name-generator.html","pathfinder-calendar-generator.html":"pathfinder-calendar-generator.html","pathfinder-deity-generator.html":"pathfinder-calendar-generator.html","pathfinder-faction-generator.html":"pathfinder-calendar-generator.html","pathfinder-world-history-generator.html":"pathfinder-calendar-generator.html","pathfinder-settlement-generator.html":"pathfinder-calendar-generator.html","pathfinder-family-tree-generator.html":"pathfinder-calendar-generator.html","pathfinder-dungeon-generator.html":"pathfinder-calendar-generator.html","pathfinder-map-generator.html":"pathfinder-calendar-generator.html","pathfinder-campaign-map.html":"pathfinder-calendar-generator.html","pathfinder-campaign-notebook.html":"pathfinder-calendar-generator.html","pathfinder-npc-relationship-web.html":"pathfinder-calendar-generator.html"};

// The Worldbuilder's map art (illustrated maps and coats of arms, img/map): too big to precache for
// every visitor, so a page that draws maps (the Worldbuilder, the Battlemap Builder, One-Shot,
// Campaign) asks for it ('cache-map-art') and it's saved in the background into ART. After that
// their maps draw offline too. Written by export-pages.ps1.
const MAP_ART = ['img/map/door/barred-door.webp', 'img/map/door/iron-door.webp', 'img/map/door/magic-seal.webp', 'img/map/door/portcullis.webp', 'img/map/door/secret-door.webp', 'img/map/door/spiral-stairs.webp', 'img/map/door/stairs.webp', 'img/map/door/trapdoor.webp', 'img/map/door/wooden-door.webp', 'img/map/floor/bone.webp', 'img/map/floor/carpet.webp', 'img/map/floor/cave.webp', 'img/map/floor/dirt.webp', 'img/map/floor/flagstones.webp', 'img/map/floor/grass.webp', 'img/map/floor/ice.webp', 'img/map/floor/lava.webp', 'img/map/floor/marble.webp', 'img/map/floor/mossy-cave.webp', 'img/map/floor/planks.webp', 'img/map/floor/sand.webp', 'img/map/floor/temple-tiles.webp', 'img/map/floor/water.webp', 'img/map/heraldry/bear.webp', 'img/map/heraldry/bell.webp', 'img/map/heraldry/crescent-moon.webp', 'img/map/heraldry/crowned-lion.webp', 'img/map/heraldry/eagle.webp', 'img/map/heraldry/gauntlet.webp', 'img/map/heraldry/hammer.webp', 'img/map/heraldry/horse.webp', 'img/map/heraldry/key.webp', 'img/map/heraldry/lantern.webp', 'img/map/heraldry/oak.webp', 'img/map/heraldry/rose.webp', 'img/map/heraldry/serpent.webp', 'img/map/heraldry/ship.webp', 'img/map/heraldry/stag.webp', 'img/map/heraldry/sun.webp', 'img/map/heraldry/sword.webp', 'img/map/heraldry/three-stars.webp', 'img/map/heraldry/tower.webp', 'img/map/heraldry/wolf-head.webp', 'img/map/ornament/banner.webp', 'img/map/ornament/border-corner.webp', 'img/map/ornament/border-edge.webp', 'img/map/ornament/compass.webp', 'img/map/ornament/dragon.webp', 'img/map/ornament/galley.webp', 'img/map/ornament/kraken.webp', 'img/map/ornament/sea-serpent.webp', 'img/map/ornament/ship.webp', 'img/map/ornament/whale.webp', 'img/map/ornament/wind-face.webp', 'img/map/parchment.webp', 'img/map/place/bandit-fort.webp', 'img/map/place/barrow.webp', 'img/map/place/battlefield.webp', 'img/map/place/capital-clans.webp', 'img/map/place/capital-empire.webp', 'img/map/place/capital-kingdom.webp', 'img/map/place/capital-league.webp', 'img/map/place/capital-magocracy.webp', 'img/map/place/capital-republic.webp', 'img/map/place/capital-theocracy.webp', 'img/map/place/city.webp', 'img/map/place/cursed-wood.webp', 'img/map/place/dragon-lair.webp', 'img/map/place/floating-isle.webp', 'img/map/place/giant-bones.webp', 'img/map/place/hamlet.webp', 'img/map/place/lighthouse.webp', 'img/map/place/lost-mine.webp', 'img/map/place/metropolis.webp', 'img/map/place/monastery.webp', 'img/map/place/oracle.webp', 'img/map/place/portal.webp', 'img/map/place/port-city.webp', 'img/map/place/port-town.webp', 'img/map/place/ruined-keep.webp', 'img/map/place/shipwreck.webp', 'img/map/place/standing-stones.webp', 'img/map/place/sunken-temple.webp', 'img/map/place/town.webp', 'img/map/place/village.webp', 'img/map/place/witch-hut.webp', 'img/map/place/wizard-tower.webp', 'img/map/prop/alchemy-table.webp', 'img/map/prop/altar.webp', 'img/map/prop/anchor.webp', 'img/map/prop/anvil.webp', 'img/map/prop/bar-counter.webp', 'img/map/prop/barrels.webp', 'img/map/prop/bathtub.webp', 'img/map/prop/bed.webp', 'img/map/prop/bedrolls.webp', 'img/map/prop/bench.webp', 'img/map/prop/blood-pool.webp', 'img/map/prop/bone-pile.webp', 'img/map/prop/bookshelf.webp', 'img/map/prop/boulder.webp', 'img/map/prop/brazier.webp', 'img/map/prop/broken-pillar.webp', 'img/map/prop/burial-niche.webp', 'img/map/prop/bush.webp', 'img/map/prop/cage.webp', 'img/map/prop/campfire.webp', 'img/map/prop/candelabra.webp', 'img/map/prop/candles.webp', 'img/map/prop/cannon.webp', 'img/map/prop/carcass.webp', 'img/map/prop/cauldron.webp', 'img/map/prop/chair.webp', 'img/map/prop/chest.webp', 'img/map/prop/coffin.webp', 'img/map/prop/coin-pile.webp', 'img/map/prop/crates.webp', 'img/map/prop/crystal.webp', 'img/map/prop/dead-adventurer.webp', 'img/map/prop/desk.webp', 'img/map/prop/egg-nest.webp', 'img/map/prop/fallen-log.webp', 'img/map/prop/fireplace.webp', 'img/map/prop/font.webp', 'img/map/prop/forge.webp', 'img/map/prop/fountain.webp', 'img/map/prop/gallows.webp', 'img/map/prop/globe.webp', 'img/map/prop/gong.webp', 'img/map/prop/hay.webp', 'img/map/prop/headstone.webp', 'img/map/prop/idol.webp', 'img/map/prop/kitchen-counter.webp', 'img/map/prop/ladder.webp', 'img/map/prop/lever.webp', 'img/map/prop/magic-circle.webp', 'img/map/prop/mast.webp', 'img/map/prop/mine-cart.webp', 'img/map/prop/mirror.webp', 'img/map/prop/mushrooms.webp', 'img/map/prop/nets.webp', 'img/map/prop/open-grave.webp', 'img/map/prop/pews.webp', 'img/map/prop/piano.webp', 'img/map/prop/pillar.webp', 'img/map/prop/pit-trap.webp', 'img/map/prop/prison-cell.webp', 'img/map/prop/round-table.webp', 'img/map/prop/rowboat.webp', 'img/map/prop/rubble.webp', 'img/map/prop/rug.webp', 'img/map/prop/sacks.webp', 'img/map/prop/sarcophagus.webp', 'img/map/prop/scroll-pile.webp', 'img/map/prop/shackles.webp', 'img/map/prop/ship-wheel.webp', 'img/map/prop/skeleton.webp', 'img/map/prop/slime.webp', 'img/map/prop/specimen-shelf.webp', 'img/map/prop/spider-web.webp', 'img/map/prop/spike-trap.webp', 'img/map/prop/stalagmites.webp', 'img/map/prop/statue.webp', 'img/map/prop/stocks.webp', 'img/map/prop/stool.webp', 'img/map/prop/stove.webp', 'img/map/prop/table.webp', 'img/map/prop/tapestry.webp', 'img/map/prop/telescope.webp', 'img/map/prop/tent.webp', 'img/map/prop/throne.webp', 'img/map/prop/torture-rack.webp', 'img/map/prop/treasure-hoard.webp', 'img/map/prop/tree.webp', 'img/map/prop/urns.webp', 'img/map/prop/wardrobe.webp', 'img/map/prop/weapon-rack.webp', 'img/map/prop/well.webp', 'img/map/sea.webp', 'img/map/shallows.webp', 'img/map/terrain/dunes-1.webp', 'img/map/terrain/dunes-2.webp', 'img/map/terrain/dunes-3.webp', 'img/map/terrain/dunes-4.webp', 'img/map/terrain/dunes-5.webp', 'img/map/terrain/dunes-6.webp', 'img/map/terrain/dunes-7.webp', 'img/map/terrain/dunes-8.webp', 'img/map/terrain/dunes-9.webp', 'img/map/terrain/grass-1.webp', 'img/map/terrain/grass-2.webp', 'img/map/terrain/grass-3.webp', 'img/map/terrain/grass-4.webp', 'img/map/terrain/grass-5.webp', 'img/map/terrain/grass-6.webp', 'img/map/terrain/grass-7.webp', 'img/map/terrain/grass-8.webp', 'img/map/terrain/grass-9.webp', 'img/map/terrain/hills-1.webp', 'img/map/terrain/hills-2.webp', 'img/map/terrain/hills-3.webp', 'img/map/terrain/hills-4.webp', 'img/map/terrain/hills-5.webp', 'img/map/terrain/hills-6.webp', 'img/map/terrain/hills-7.webp', 'img/map/terrain/hills-8.webp', 'img/map/terrain/hills-9.webp', 'img/map/terrain/jungle-1.webp', 'img/map/terrain/jungle-2.webp', 'img/map/terrain/jungle-3.webp', 'img/map/terrain/jungle-4.webp', 'img/map/terrain/jungle-5.webp', 'img/map/terrain/jungle-6.webp', 'img/map/terrain/jungle-7.webp', 'img/map/terrain/jungle-8.webp', 'img/map/terrain/jungle-9.webp', 'img/map/terrain/marsh-1.webp', 'img/map/terrain/marsh-2.webp', 'img/map/terrain/marsh-3.webp', 'img/map/terrain/marsh-4.webp', 'img/map/terrain/marsh-5.webp', 'img/map/terrain/marsh-6.webp', 'img/map/terrain/marsh-7.webp', 'img/map/terrain/marsh-8.webp', 'img/map/terrain/marsh-9.webp', 'img/map/terrain/mesas-1.webp', 'img/map/terrain/mesas-2.webp', 'img/map/terrain/mesas-3.webp', 'img/map/terrain/mesas-4.webp', 'img/map/terrain/mesas-5.webp', 'img/map/terrain/mesas-6.webp', 'img/map/terrain/mesas-7.webp', 'img/map/terrain/mesas-8.webp', 'img/map/terrain/mesas-9.webp', 'img/map/terrain/moor-1.webp', 'img/map/terrain/moor-2.webp', 'img/map/terrain/moor-3.webp', 'img/map/terrain/moor-4.webp', 'img/map/terrain/moor-5.webp', 'img/map/terrain/moor-6.webp', 'img/map/terrain/moor-7.webp', 'img/map/terrain/moor-8.webp', 'img/map/terrain/moor-9.webp', 'img/map/terrain/mountains-1.webp', 'img/map/terrain/mountains-2.webp', 'img/map/terrain/mountains-3.webp', 'img/map/terrain/mountains-4.webp', 'img/map/terrain/mountains-5.webp', 'img/map/terrain/mountains-6.webp', 'img/map/terrain/mountains-7.webp', 'img/map/terrain/mountains-8.webp', 'img/map/terrain/mountains-9.webp', 'img/map/terrain/oases-1.webp', 'img/map/terrain/oases-2.webp', 'img/map/terrain/oases-3.webp', 'img/map/terrain/oases-4.webp', 'img/map/terrain/oases-5.webp', 'img/map/terrain/oases-6.webp', 'img/map/terrain/pines-1.webp', 'img/map/terrain/pines-2.webp', 'img/map/terrain/pines-3.webp', 'img/map/terrain/pines-4.webp', 'img/map/terrain/pines-5.webp', 'img/map/terrain/pines-6.webp', 'img/map/terrain/pines-7.webp', 'img/map/terrain/pines-8.webp', 'img/map/terrain/pines-9.webp', 'img/map/terrain/snowy-mountains-1.webp', 'img/map/terrain/snowy-mountains-2.webp', 'img/map/terrain/snowy-mountains-3.webp', 'img/map/terrain/snowy-mountains-4.webp', 'img/map/terrain/snowy-mountains-5.webp', 'img/map/terrain/snowy-mountains-6.webp', 'img/map/terrain/snowy-mountains-7.webp', 'img/map/terrain/snowy-mountains-8.webp', 'img/map/terrain/snowy-mountains-9.webp', 'img/map/terrain/snowy-pines-1.webp', 'img/map/terrain/snowy-pines-2.webp', 'img/map/terrain/snowy-pines-3.webp', 'img/map/terrain/snowy-pines-4.webp', 'img/map/terrain/snowy-pines-5.webp', 'img/map/terrain/snowy-pines-6.webp', 'img/map/terrain/snowy-pines-7.webp', 'img/map/terrain/snowy-pines-8.webp', 'img/map/terrain/snowy-pines-9.webp', 'img/map/terrain/trees-1.webp', 'img/map/terrain/trees-2.webp', 'img/map/terrain/trees-3.webp', 'img/map/terrain/trees-4.webp', 'img/map/terrain/trees-5.webp', 'img/map/terrain/trees-6.webp', 'img/map/terrain/trees-7.webp', 'img/map/terrain/trees-8.webp', 'img/map/terrain/trees-9.webp', 'img/map/terrain/tundra-1.webp', 'img/map/terrain/tundra-2.webp', 'img/map/terrain/tundra-3.webp', 'img/map/terrain/tundra-4.webp', 'img/map/terrain/tundra-5.webp', 'img/map/terrain/tundra-6.webp', 'img/map/terrain/tundra-7.webp', 'img/map/terrain/tundra-8.webp', 'img/map/terrain/tundra-9.webp', 'img/map/terrain/volcanoes-1.webp', 'img/map/terrain/volcanoes-2.webp', 'img/map/terrain/volcanoes-3.webp', 'img/map/terrain/volcanoes-4.webp', 'img/map/terrain/volcanoes-5.webp', 'img/map/terrain/volcanoes-6.webp'];
const ART = 'gazette-map-art';

// Network-first, but seeded on install so the homepage and Town Crier work on a first offline visit
const SEED = ['index.html', 'articles.json', 'glossary.json'];

const BASE = new URL('./', self.location).href;
const STATIC_URLS = new Set(PRECACHE.map(p => BASE + p));
const ART_URLS = new Set(MAP_ART.map(p => BASE + p));

function keyFor(url) {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  if (u.href === BASE || u.href.endsWith('/')) u.pathname += 'index.html';
  // Clean addresses (/about, /a/<id>) share the cache entry of their file (about.html, a/<id>.html)
  else if (!/\.[a-z0-9]+$/i.test(u.pathname)) u.pathname += '.html';
  return u.href;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const statics = await caches.open(STATIC);
    await statics.addAll(PRECACHE.map(p => new Request(BASE + p, { cache: 'reload' })));
    const pages = await caches.open(PAGES);
    await Promise.all(SEED.map(p =>
      fetch(BASE + p, { cache: 'reload' }).then(r => r.ok && pages.put(BASE + p, r)).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [STATIC, PAGES, FONTS, ART];
    for (const name of await caches.keys()) {
      if (name.startsWith('gazette-') && !keep.includes(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req, FONTS));
    return;
  }
  if (!req.url.startsWith(BASE)) return;

  const key = keyFor(req.url);
  if (STATIC_URLS.has(key)) event.respondWith(cacheFirst(req, key));
  else event.respondWith(networkFirst(req, key));
});

async function cacheFirst(req, key) {
  const hit = await caches.match(key, { cacheName: STATIC });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(STATIC)).put(key, res.clone());
  return res;
}

async function networkFirst(req, key) {
  try {
    const res = await fetchWithTimeout(req, 6000);
    // Map art the Worldbuilder saved stays in ART, so that copy is the one kept fresh.
    if (res.ok) (await caches.open(ART_URLS.has(key) ? ART : PAGES)).put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(key);
    if (hit) return hit;
    const hub = TAB_HUBS[key.slice(BASE.length).replace(/\.html$/, '') + '.html'];
    const hubHit = hub && await caches.match(BASE + hub);
    if (hubHit) return hubHit;
    if (req.mode === 'navigate') return offlinePage();
    throw err;
  }
}

// A slow connection falls back to the saved copy instead of hanging (only when one exists)
async function fetchWithTimeout(req, ms) {
  const net = fetch(req);
  const saved = await caches.match(keyFor(req.url));
  if (!saved) return net;
  return Promise.race([
    net,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || net;
}

// A page that draws maps asked for the map art: fetch what ART doesn't have yet, and drop what the
// site no longer has. Stops quietly when the connection does.
self.addEventListener('message', event => {
  if (event.data === 'cache-map-art') event.waitUntil(cacheMapArt());
});

async function cacheMapArt() {
  const cache = await caches.open(ART);
  const have = new Set();
  for (const req of await cache.keys()) {
    if (ART_URLS.has(req.url)) have.add(req.url);
    else await cache.delete(req);
  }
  for (const url of ART_URLS) {
    if (have.has(url)) continue;
    try {
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res);
    } catch (e) {
      return;
    }
  }
}

function offlinePage() {
  const tools = [
    ['session-kit', 'DM Session Kit'], ['dnd-one-shot-generator', 'One-Shot Generator'], ['dnd-campaign-generator', 'Campaign Generator'], ['npc-generator', 'Town Square (NPCs)'],
    ['loot-generator', 'Vault of Wonders (loot)'], ['shop', "Merchant's Row (shops)"],
    ['rumors', 'The Tavern (rumors)'], ['toolbox', 'DM Toolbox (names)'], ['spellbook', 'Spellbook'], ['character-builder', 'Character Builder'], ['dnd-point-buy-calculator', 'Point Buy Calculator'], ['dnd-backstory-generator', 'Backstory Generator'], ['dnd-multiclass-calculator', 'Multiclass Calculator'], ['dnd-spell-planner', 'Spell Planner'], ['dnd-character-cards', 'Feature & Item Cards'], ['dnd-attack-calculator', 'Attack Calculator'], ['dnd-character-sheet', 'Play Sheet'], ['dnd-player-journal', 'Player Journal'], ['bestiary', 'Bestiary'], ['monster-maker', 'Monster Maker'], ['rules', 'Rules Quick Reference'], ['dm-screen', 'DM Screen'], ['dnd-battlemap-builder', 'Battlemap Builder'], ['fantasy-world-map-maker', 'World Map Maker'], ['handouts', 'Handout Maker'], ['economy', 'Market Exchange'], ['privacy#backup', 'Back up everything']
  ];
  const links = tools.map(([href, name]) => `<li><a href="${BASE}${href}">${name}</a></li>`).join('');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex">
<title>Offline | The Beholder's Gazette</title><link rel="stylesheet" href="${BASE}style.css">
<style>body{background:#0e0d0b;color:#e8dcc0;font-family:Lato,sans-serif}main{max-width:560px;margin:12vh auto;padding:0 16px}
h1{font-family:Cinzel,serif;color:#d4af37}a{color:#d4af37}li{margin:.4em 0}</style></head><body><main>
<img src="${BASE}img/mascot/offline.webp" alt="" width="160" height="160" style="display:block;margin:0 auto 8px">
<h1>📜 The ravens can't reach you</h1>
<p>You're offline, and this page wasn't saved on your device yet. The tools below work without a connection:</p>
<ul>${links}</ul>
<p><a href="${BASE}">Back to the front page</a> (the last edition you read)</p>
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
