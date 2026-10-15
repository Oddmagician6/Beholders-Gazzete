// Offline support for the Gazette (F15).
// - PRECACHE files are saved on install and served from the cache first, so the tools work offline.
// - Everything else on this site (news: index.html, articles.json, glossary.json, a/, desk/, archive,
//   images, ...) is network-first: always fresh online, and the last copy seen is kept for offline.
// - Google Fonts are kept too, so pages still look right offline.
// VERSION is stamped by export-pages.ps1 from a hash of the PRECACHE files. Any change to one of them
// (then running the export) installs a new cache; old caches are deleted on activate.
// Cache keys drop the query string (?seed=, ?t=, ?id= ...): pages rebuild their state from the URL.
// Links use clean addresses (about, a/<id>); keyFor maps each one to its file's key (about.html).

const VERSION = 'dab7957e78a0';
const STATIC = 'gazette-static-' + VERSION;
const PAGES = 'gazette-pages';
const FONTS = 'gazette-fonts';

const PRECACHE = [
  // Tool pages
  'npc-generator.html', 'loot-generator.html', 'rumors.html', 'spellbook.html',
  'economy.html', 'shop.html', 'session-kit.html', 'toolbox.html', 'worldbuilder.html', 'rules.html', 'bestiary.html', 'monster-maker.html', 'handouts.html', 'privacy.html', 'player-view.html', 'dm-screen.html', 'screen-view.html',
  // Styles and scripts
  'style.css', 'homepage.css', 'economy-page.css', 'handouts.css', 'sw-register.js',
  'rng.js', 'tab-pages.js', 'npc-data.js', 'npc-statblock.js', 'spell-detail.js', 'npc-generator.js', 'loot-data.js', 'loot-engine.js', 'loot-generator.js', 'magic-items-data.js',
  'coins.js', 'market-data.js', 'economy-full.js', 'names-data.js', 'shop-engine.js', 'shop.js', 'handout-engine.js', 'handouts.js',
  'town-crier.js', 'rumor-deck.js', 'rumors.js', 'session-kit.js', 'travel-engine.js', 'dice-engine.js', 'dice-fab.js', 'toolbox.js', 'toolbox-table.js', 'monsters-data.js', 'monster-statblocks.js', 'toolbox-statblock.js', 'encounter-engine.js', 'toolbox-encounter.js', 'tavern-engine.js', 'toolbox-tavern.js', 'downtime-engine.js', 'toolbox-downtime.js', 'quest-engine.js', 'toolbox-quest.js', 'toolbox-clocks.js', 'party.js', 'toolbox-party.js', 'table-engine.js', 'toolbox-tables.js', 'init-view.js', 'player-view.js', 'dm-screen-data.js', 'dm-screen.js', 'screen-view.js', 'rules-data.js', 'rules.js', 'bestiary.js', 'homebrew.js', 'monster-maker.js', 'calendar-engine.js', 'pantheon-engine.js', 'worldbuilder.js', 'world-calendar.js', 'world-pantheon.js', 'faction-engine.js', 'world-factions.js', 'history-engine.js', 'world-history.js', 'town-engine.js', 'world-town.js', 'family-tree.js', 'family-engine.js', 'world-family.js', 'site-engine.js', 'world-sites.js', 'continent-engine.js', 'world-pins.js', 'world-continent.js', 'world-maps.js', 'map-export.js', 'map-pins.js', 'map-store.js', 'notebook.js', 'docx.js', 'notebook-sheets.js', 'world-notebook.js', 'web-graph.js', 'world-web.js', 'backup.js', 'spells-data.js', 'script.js', 'raven-form.js', 'nav.js',
  // Data
  'rumors.json',
  // Icons
  'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'site.webmanifest', 'img/icon-192.png'
];

// The Toolbox's and the Worldbuilder's tab pages (SEO11) are copies of their hub, so offline, one
// that was never opened falls back to the hub's saved copy (tab-pages.js opens the right tab).
// Written by export-tools.ps1.
const TAB_HUBS = {"tavern-name-generator.html":"toolbox.html","dnd-tavern-generator.html":"toolbox.html","dnd-side-quest-generator.html":"toolbox.html","dnd-travel-weather-generator.html":"toolbox.html","dnd-dice-roller.html":"toolbox.html","random-table-roller.html":"toolbox.html","dnd-party-tracker.html":"toolbox.html","dnd-encounter-builder.html":"toolbox.html","dnd-initiative-tracker.html":"toolbox.html","progress-clocks.html":"toolbox.html","dnd-loot-splitter.html":"toolbox.html","dnd-downtime-tracker.html":"toolbox.html","fantasy-calendar-generator.html":"worldbuilder.html","dnd-pantheon-generator.html":"worldbuilder.html","dnd-faction-generator.html":"worldbuilder.html","fantasy-history-generator.html":"worldbuilder.html","dnd-town-generator.html":"worldbuilder.html","fantasy-family-tree-generator.html":"worldbuilder.html","dnd-dungeon-generator.html":"worldbuilder.html","fantasy-map-generator.html":"worldbuilder.html","dnd-campaign-map.html":"worldbuilder.html","dnd-campaign-notebook.html":"worldbuilder.html","npc-relationship-web.html":"worldbuilder.html"};

// Network-first, but seeded on install so the homepage and Town Crier work on a first offline visit
const SEED = ['index.html', 'articles.json', 'glossary.json'];

const BASE = new URL('./', self.location).href;
const STATIC_URLS = new Set(PRECACHE.map(p => BASE + p));

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
    const keep = [STATIC, PAGES, FONTS];
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
    if (res.ok) (await caches.open(PAGES)).put(key, res.clone());
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

function offlinePage() {
  const tools = [
    ['session-kit', 'DM Session Kit'], ['npc-generator', 'Town Square (NPCs)'],
    ['loot-generator', 'Vault of Wonders (loot)'], ['shop', "Merchant's Row (shops)"],
    ['rumors', 'The Tavern (rumors)'], ['toolbox', 'DM Toolbox (names)'], ['spellbook', 'Spellbook'], ['bestiary', 'Bestiary'], ['monster-maker', 'Monster Maker'], ['rules', 'Rules Quick Reference'], ['dm-screen', 'DM Screen'], ['handouts', 'Handout Maker'], ['economy', 'Market Exchange'], ['privacy#backup', 'Back up everything']
  ];
  const links = tools.map(([href, name]) => `<li><a href="${BASE}${href}">${name}</a></li>`).join('');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex">
<title>Offline | The Beholder's Gazette</title><link rel="stylesheet" href="${BASE}style.css">
<style>body{background:#0e0d0b;color:#e8dcc0;font-family:Lato,sans-serif}main{max-width:560px;margin:12vh auto;padding:0 16px}
h1{font-family:Cinzel,serif;color:#d4af37}a{color:#d4af37}li{margin:.4em 0}</style></head><body><main>
<h1>📜 The ravens can't reach you</h1>
<p>You're offline, and this page wasn't saved on your device yet. The tools below work without a connection:</p>
<ul>${links}</ul>
<p><a href="${BASE}">Back to the front page</a> (the last edition you read)</p>
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
