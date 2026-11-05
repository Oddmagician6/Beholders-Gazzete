#!/usr/bin/env node
// Map of the Week: renders one 1080 x 1350 PNG card per map in maps.json: a seeded continent from the
// site's own Continent Map Generator, in the GPT-painted explorer's frame. Local drafts only. No AI API
// and no publishing calls. Serves the repo itself on localhost, so serve.py need not be running.
import { access, readFile, writeFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const output = path.join(root, '.map-output');
export const SITE = 'https://gazette.ashforgestudio.com';
export const WIDTH = 1080;
export const HEIGHT = 1350;

const json = value => JSON.stringify(value, null, 2) + '\n';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const exists = async file => { try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const SEED = /^[0-9a-z]{1,7}$/;
const limits = { id: 70, question: 200, prompt: 40 };

export function toolUrl(seed) { return `${SITE}/fantasy-map-generator?seed=${seed}`; }

export function validateMap(map) {
  if (!map || typeof map !== 'object') throw new Error('Expected a map object.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(map.id || '')) throw new Error(`Map ID must be a lowercase slug: ${map.id}`);
  if (!SEED.test(map.seed || '') || parseInt(map.seed, 36) > 0xFFFFFFFF) throw new Error(`${map.id}: seed must be 1 to 7 lowercase letters or digits.`);
  if (!Number.isInteger(map.poi) || map.poi < 0) throw new Error(`${map.id}: poi must be a site number from 0.`);
  for (const [key, max] of Object.entries(limits)) {
    const optional = key === 'prompt';
    if (optional && map[key] === undefined) continue;
    if (typeof map[key] !== 'string' || !map[key].trim()) throw new Error(`${map.id}: missing ${key}.`);
    if (map[key].length > max) throw new Error(`${map.id}: ${key} is ${map[key].length} characters; the limit is ${max}.`);
  }
  // expect: the continent and site this seed made when the map was picked. A change to the generator
  // that moves them fails the render instead of quietly posting a different map.
  if (!map.expect || typeof map.expect.name !== 'string' || typeof map.expect.site !== 'string') throw new Error(`${map.id}: expect needs the continent's name and the site.`);
  return map;
}

export async function loadAll() {
  const { maps } = JSON.parse(await readFile(path.join(here, 'maps.json'), 'utf8'));
  const ids = new Set();
  for (const map of maps) {
    validateMap(map);
    if (ids.has(map.id)) throw new Error(`Duplicate map ID: ${map.id}`);
    ids.add(map.id);
  }
  return { maps };
}

// d: the facts card.html read off the generated continent (name, nations, site, hook...).
export function caption(map, d, platform = 'facebook') {
  if (map.social) return map.social[platform];
  const link = platform === 'instagram'
    ? `Roll this exact map yourself: ${toolUrl(map.seed).replace(/^https:\/\//, '')} (or roll a fresh one from the link in bio).`
    : `Roll this exact map yourself: ${toolUrl(map.seed)}`;
  return `Map of the Week: ${d.name}\n${d.nations.length} nations (${listOf(d.nations)}), ${d.towns} towns, and ${d.places} places worth the trip.\n\nThis week's site: ${d.site}. ${d.hook}\n\n${map.question}\n\n${link}\nEvery map is rolled by The Beholder's Gazette's free worldbuilding tools. Fictional realms, real tables.\n\n#DnD #TTRPG #Worldbuilding #FantasyMap #DungeonsAndDragons\n`;
}

const listOf = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

export function altText(map, d) {
  return `Map of the Week from The Beholder's Gazette: an illustrated fantasy map of the continent of ${d.name.replace(/^The /, 'the ')}, framed on an old explorer's chart table. It shows ${d.nations.length} nations (${listOf(d.nations)}), ${d.towns} towns joined by roads, rivers, forests, mountains, and the sea around them. Below the map, a question: what's in ${d.site.replace(/^The /, 'the ')}? ${d.hook} Footer: roll your own at gazette.ashforgestudio.com, seed ${map.seed}.`;
}

// A static server for the repo with the site's clean addresses (/about serves about.html).
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serve() {
  const server = createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
      let file = path.resolve(root, rel || 'index.html');
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      if (!path.extname(file) && await exists(file + '.html')) file += '.html';
      else if (await exists(file) && (await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise(resolve => server.listen(0, 'localhost', () => resolve(server)));
}

async function browserPath() {
  const candidates = [process.env.POI_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error('Chrome or Edge not found. Set POI_BROWSER to a Chromium browser executable.');
}

// Opens the card page; returns the body's state and the facts it wrote. png: also screenshot it.
async function chrome(browser, url, userData, png) {
  const args = ['--headless', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--force-device-scale-factor=1', `--user-data-dir=${userData}`, `--window-size=${WIDTH},${HEIGHT}`, '--virtual-time-budget=25000', ...(png ? [`--screenshot=${png}`] : ['--dump-dom']), url];
  let result;
  try { result = await exec(browser, args, { windowsHide: true, timeout: 120000, maxBuffer: 64 * 1024 * 1024 }); }
  catch (error) { throw new Error(`Chrome failed: ${(error.stderr || error.message).slice(-1800)}`); }
  if (png) return null;
  const state = result.stdout.match(/<body[^>]*data-state="([^"]*)"/)?.[1] || 'no state';
  const raw = result.stdout.match(/<script type="application\/json" id="out">([\s\S]*?)<\/script>/)?.[1];
  return { state, data: raw ? JSON.parse(raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')) : null };
}

async function withBrowser(fn) {
  const browser = await browserPath();
  await mkdir(output, { recursive: true });
  const work = await mkdtemp(path.join(output, '.render-'));
  const server = await serve();
  const base = `http://localhost:${server.address().port}/map-of-the-week/card.html`;
  try { return await fn({ browser, base, profile: n => path.join(work, `profile-${n}`) }); }
  finally {
    server.close();
    if (path.dirname(work) !== output) throw new Error('Unexpected render cleanup path.');
    await rm(work, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
}

function cardQuery(map, debug) {
  const q = new URLSearchParams({ seed: map.seed, poi: String(map.poi) });
  if (map.prompt) q.set('prompt', map.prompt);
  if (debug) q.set('debug', '1');
  return q.toString();
}

export async function render(selected, { debug = false } = {}) {
  return withBrowser(async ({ browser, base, profile }) => {
    let n = 0;
    for (const map of selected) {
      const url = `${base}?${cardQuery(map, debug)}`;
      // One pass reads the facts and checks the layout; a second takes the picture.
      const { state, data } = await chrome(browser, url, profile(n++));
      if (state !== 'ok' && !(debug && state.startsWith('overflow'))) throw new Error(`${map.id}: card failed (${state}).${state.startsWith('overflow') ? ' The site name or hook is too long for its box; pick another site.' : ''}`);
      if (data.name !== map.expect.name || data.site !== map.expect.site) {
        throw new Error(`${map.id}: seed ${map.seed} now makes ${data.name} / ${data.site}, not ${map.expect.name} / ${map.expect.site}. The generator changed; re-pick this map.`);
      }
      const directory = path.join(output, map.id);
      await mkdir(directory, { recursive: true });
      const png = path.join(directory, debug ? 'card-debug.png' : 'card.png');
      await rm(png, { force: true });
      await chrome(browser, url, profile(n++), png);
      const bytes = await readFile(png);
      if (bytes.readUInt32BE(16) !== WIDTH || bytes.readUInt32BE(20) !== HEIGHT) throw new Error(`${map.id}: expected a ${WIDTH} x ${HEIGHT} PNG.`);
      if (debug) { console.log(`Debug ${map.id}: ${path.relative(root, png)}`); continue; }
      await writeFile(path.join(directory, 'caption-facebook.txt'), caption(map, data));
      await writeFile(path.join(directory, 'caption-instagram.txt'), caption(map, data, 'instagram'));
      await writeFile(path.join(directory, 'alt-text.txt'), altText(map, data) + '\n');
      await writeFile(path.join(directory, 'map.json'), json({ ...map, facts: data, tool: toolUrl(map.seed), renderedAt: new Date().toISOString(), approved: false, published: false }));
      console.log(`Rendered ${map.id}: ${path.relative(root, png)}`);
    }
  });
}

// Rolls random continents and lists each one's sites, for picking the next maps.
async function rollSeeds(count) {
  return withBrowser(async ({ browser, base, profile }) => {
    const { state, data } = await chrome(browser, `${base}?roll=${count}`, profile(0));
    if (state !== 'ok') throw new Error(`Roll failed (${state}).`);
    for (const c of data) {
      console.log(`\n${c.seed}  ${c.name} (${c.size}): ${c.nations.length} nations, ${c.towns} towns`);
      c.sites.forEach((s, i) => console.log(`  poi ${i}: ${s}`));
    }
  });
}

function reviewHtml(rendered) {
  const cards = rendered.map(({ map, d }) => `<section><img src="${map.id}/card.png" alt="${esc(altText(map, d))}"><div><h2>Week ${esc(map.week ?? '?')}: ${esc(d.name)}</h2><p class="id">${esc(map.id)} · seed ${esc(map.seed)} · site ${map.poi} · ${esc(map.status || 'draft')} · <a href="${esc(toolUrl(map.seed))}">open in the tool</a></p><h3>Facebook</h3><pre>${esc(caption(map, d))}</pre><h3>Instagram</h3><pre>${esc(caption(map, d, 'instagram'))}</pre><h3>Alt text</h3><p>${esc(altText(map, d))}</p></div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Map of the Week drafts</title><style>body{margin:0;padding:28px;background:#171b18;color:#efe4ca;font:16px/1.5 Arial,sans-serif}main{max-width:1200px;margin:auto}h1{font:36px Georgia,serif}a{color:#e2bc73}.draft{color:#e2bc73}section{display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;border-top:1px solid #3a3f38}section img{width:min(100%,432px);height:auto}section div{flex:1 1 320px;min-width:0}h2{font:28px Georgia,serif;margin:0}h3{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e2bc73;margin:18px 0 4px}pre{white-space:pre-wrap;font:15px/1.45 Arial,sans-serif;margin:0}.id{color:#a99d80;margin:4px 0}</style></head><body><main><p class="draft">LOCAL DRAFTS · NOT APPROVED OR PUBLISHED</p><h1>Map of the Week</h1>${cards}</main></body></html>`;
}

async function main(args) {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === '-h') {
    console.log('Usage: node map-of-the-week/map.mjs list|check|roll [count]|render [map-id|--all] [--debug]');
    console.log('Renders local drafts to .map-output/ and writes .map-output/review.html. roll lists random seeds and their sites. No publishing.');
    return;
  }
  if (!['list', 'check', 'roll', 'render'].includes(command)) throw new Error(`Unknown command: ${command}`);
  if (command === 'roll') { await rollSeeds(Math.min(40, Number(rest[0]) || 8)); return; }
  const { maps } = await loadAll();
  if (command === 'check') { console.log(`${maps.length} valid maps.`); return; }
  if (command === 'list') { for (const m of maps) console.log(`${m.id} | week ${m.week ?? '-'} | ${m.status || 'draft'} | ${m.seed} | ${m.expect.name}: ${m.expect.site}`); return; }
  const flags = rest.filter(arg => arg.startsWith('--'));
  const ids = rest.filter(arg => !arg.startsWith('--'));
  if (flags.some(flag => !['--all', '--debug'].includes(flag))) throw new Error('Unknown option.');
  if (!ids.length && !flags.includes('--all')) throw new Error('Choose a map ID or --all.');
  const selected = flags.includes('--all') ? maps : maps.filter(m => ids.includes(m.id));
  const missing = ids.filter(id => !maps.some(m => m.id === id));
  if (missing.length) throw new Error(`Unknown map ID: ${missing.join(', ')}`);
  await render(selected, { debug: flags.includes('--debug') });
  if (!flags.includes('--debug')) {
    const rendered = [];
    for (const map of maps) {
      const saved = path.join(output, map.id, 'map.json');
      if (await exists(saved)) rendered.push({ map, d: JSON.parse(await readFile(saved, 'utf8')).facts });
    }
    rendered.sort((a, b) => (a.map.week ?? 99) - (b.map.week ?? 99));
    await writeFile(path.join(output, 'review.html'), reviewHtml(rendered));
    console.log('Review page: .map-output/review.html');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
