#!/usr/bin/env node
// Roll for It: renders one 1080 x 1350 PNG card per d6 or d20 table in tables.json.
// Prototype: local drafts only; no publishing.
import { access, readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const output = path.join(root, '.roll-output');
const fonts = path.join(root, 'ad-of-the-week', 'fonts');
export const SITE = 'https://gazette.ashforgestudio.com';
export const WIDTH = 1080;
export const HEIGHT = 1350;

const limits = { id: 70, title: 34, kicker: 60, question: 200 };
const rowMax = { 6: 70, 20: 52 };
const json = value => JSON.stringify(value, null, 2) + '\n';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const exists = async file => { try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

export function validateTable(table) {
  if (!table || typeof table !== 'object') throw new Error('Expected a table object.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(table.id || '')) throw new Error(`Table ID must be a lowercase slug: ${table.id}`);
  for (const [key, max] of Object.entries(limits)) {
    if (typeof table[key] !== 'string' || !table[key].trim()) throw new Error(`${table.id}: missing ${key}.`);
    if (table[key].length > max) throw new Error(`${table.id}: ${key} is ${table[key].length} characters; the limit is ${max}.`);
  }
  if (![6, 20].includes(table.die)) throw new Error(`${table.id}: die must be 6 or 20.`);
  if (!Array.isArray(table.rows) || table.rows.length !== table.die) throw new Error(`${table.id}: a d${table.die} table needs exactly ${table.die} rows.`);
  table.rows.forEach((row, i) => {
    if (typeof row !== 'string' || !row.trim()) throw new Error(`${table.id}: row ${i + 1} is empty.`);
    if (row.length > rowMax[table.die]) throw new Error(`${table.id}: row ${i + 1} is ${row.length} characters; the limit is ${rowMax[table.die]}.`);
  });
  return table;
}

export async function loadAll() {
  const { tables } = JSON.parse(await readFile(path.join(here, 'tables.json'), 'utf8'));
  const ids = new Set();
  for (const table of tables) {
    validateTable(table);
    if (ids.has(table.id)) throw new Error(`Duplicate table ID: ${table.id}`);
    ids.add(table.id);
  }
  return tables;
}

export function caption(table, platform = 'facebook') {
  const where = platform === 'instagram' ? 'More tables and tools at the link in our bio.' : `More tables and tools: ${SITE}/toolbox`;
  return `Roll for It: ${table.title}\n\n${table.question}\n\nNo dice handy? Roll one with our free dice roller: ${SITE}/dnd-dice-roller\n\n${where}\n\n#DnD #TTRPG #RollTable #DungeonsAndDragons #DMTips\n`;
}

export function altText(table) {
  return `Roll for It, a d${table.die} roll table from The Beholder's Gazette on an old parchment page. ${table.title} ${table.kicker}. ${table.rows.map((row, i) => `${i + 1}: ${row}.`).join(' ')}`;
}

// Slot boxes in the frame PNG's own pixels (1122 x 1402); the card scales the frame to 1350 tall.
const FRAME = { file: 'table.png', w: 1122, h: 1402, edge: '#000', head: { x: 160, y: 110, w: 798, h: 202 }, table: { x: 112, y: 386, w: 896, h: 770 }, foot: { x: 200, y: 1226, w: 722, h: 82 } };
const SCALE = HEIGHT / FRAME.h;
const box = s => `left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px`;

export function cardHtml(table, urls, debug = false) {
  const outline = debug ? 'outline:3px dashed #e0115f;' : '';
  const d20 = table.die === 20;
  const rows = table.rows.map((row, i) => `<li><b>${i + 1}</b><span>${esc(row)}</span></li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(table.title)}</title><style>
@font-face{font-family:Cinzel;font-weight:700;src:url(${urls.font('cinzel-latin-700-normal.woff2')})}
@font-face{font-family:Cinzel;font-weight:900;src:url(${urls.font('cinzel-latin-900-normal.woff2')})}
@font-face{font-family:Fell;font-style:normal;src:url(${urls.font('im-fell-english-latin-400-normal.woff2')})}
@font-face{font-family:Fell;font-style:italic;src:url(${urls.font('im-fell-english-latin-400-italic.woff2')})}
*{box-sizing:border-box}html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
body{background:${FRAME.edge};color:#2a1a0c;font-family:Fell,Georgia,serif}
.stage{position:absolute;left:${(WIDTH - FRAME.w * SCALE) / 2}px;top:0;width:${FRAME.w}px;height:${FRAME.h}px;transform:scale(${SCALE});transform-origin:0 0}
.stage>img.frame{position:absolute;inset:0;width:${FRAME.w}px;height:${FRAME.h}px}
.slot{position:absolute;--k:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;${outline}}
.head{gap:calc(var(--k)*8px)}
.series{font:700 calc(var(--k)*19px)/1 Cinzel,serif;letter-spacing:7px;color:#7b5a33;display:flex;gap:16px;align-items:center;width:100%}
.series:before,.series:after{content:'';flex:1;border-top:2px solid #7b5a3399;border-bottom:1px solid #7b5a3399;height:3px}
h1{margin:0;font:900 calc(var(--k)*56px)/1.05 Cinzel,serif;color:#2a1a0c;white-space:nowrap}
.kicker{margin:0;font-style:italic;font-size:calc(var(--k)*27px);line-height:1.2;color:#5a3a1c}
.die{font:700 calc(var(--k)*22px)/1 Cinzel,serif;letter-spacing:3px;color:#6e2a17}
.table{padding:${d20 ? '14px 18px' : '18px 26px'}}
ol{flex:1;min-height:0;margin:0;padding:0;list-style:none;width:100%;display:grid;${d20 ? 'grid-template-columns:1fr 1fr;grid-auto-flow:column;grid-template-rows:repeat(10,1fr);column-gap:28px' : 'grid-template-rows:repeat(6,1fr)'}}
li{display:flex;align-items:center;gap:${d20 ? 14 : 22}px;text-align:left;padding:${d20 ? '4px' : '6px 8px'};border-bottom:1px solid #7b5a3366}
li:nth-child(even){background:#8a5a2412}
${d20 ? 'li:nth-child(10),li:nth-child(20){border-bottom:0}' : 'li:last-child{border-bottom:0}'}
li b{flex:none;width:${d20 ? 42 : 62}px;height:${d20 ? 42 : 62}px;display:grid;place-items:center;border:2px solid #5a3a1c;border-radius:50%;font:900 calc(var(--k)*${d20 ? 21 : 30}px)/1 Cinzel,serif;color:#6e2a17;background:#f6e4b855}
li span{font-size:calc(var(--k)*${d20 ? 25 : 35}px);line-height:1.18}
.foot{gap:8px}
.ask{font-style:italic;font-size:28px;line-height:1;color:#3a2412}
.credit{font:700 15px/1 Cinzel,serif;letter-spacing:2.5px;color:#7b5a33;white-space:nowrap}
</style></head><body><div class="stage"><img class="frame" src="${urls.frame}" alt="">
<div class="slot head" data-min=".7" style="${box(FRAME.head)}"><div class="series">ROLL FOR IT</div><h1>${esc(table.title)}</h1><p class="kicker">${esc(table.kicker)}</p><div class="die">ROLL A D${table.die}</div></div>
<div class="slot table" data-min=".75" style="${box(FRAME.table)}"><ol>${rows}</ol></div>
<div class="slot foot" data-min="1" style="${box(FRAME.foot)}"><div class="ask">Comment your roll.</div><div class="credit">THE BEHOLDER'S GAZETTE · GAZETTE.ASHFORGESTUDIO.COM</div></div>
</div><script>
function fit(){var failures=[];document.querySelectorAll('.slot').forEach(function(el){var k=1,min=Number(el.dataset.min);function over(){if(el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)return true;return Array.prototype.some.call(el.querySelectorAll('*'),function(c){return c.scrollWidth>c.clientWidth+1})}while(over()&&k>min){k-=.01;el.style.setProperty('--k',k.toFixed(2))}if(over())failures.push(el.className.split(' ')[1])});
document.body.dataset.layout=failures.length?'overflow:'+failures.join(','):'ok';document.body.dataset.images=Array.from(document.images).every(function(img){return img.complete&&img.naturalWidth>0})?'ok':'missing'}
window.addEventListener('load',function(){document.fonts.ready.then(fit)});
</script></body></html>`;
}

async function browserPath() {
  const candidates = [process.env.POI_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error('Chrome or Edge not found. Set POI_BROWSER to a Chromium browser executable.');
}

// Two passes (DOM check, then screenshot): one call doing both was unreliable for map-of-the-week.
async function screenshot(browser, html, png, userData, debug) {
  const base = ['--headless', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--user-data-dir=${userData}`, `--window-size=${WIDTH},${HEIGHT}`, '--virtual-time-budget=3000'];
  const run = async extra => {
    try { return await exec(browser, [...base, ...extra, pathToFileURL(html).href], { windowsHide: true, timeout: 60000, maxBuffer: 16 * 1024 * 1024 }); }
    catch (error) { throw new Error(`Card rendering failed: ${(error.stderr || error.message).slice(-1800)}`); }
  };
  const body = (await run(['--dump-dom'])).stdout.match(/<body[^>]*>/)?.[0] || 'no rendered body';
  if (!body.includes('data-images="ok"')) throw new Error(`An image did not load (${body}).`);
  if (!body.includes('data-layout="ok"') && !debug) throw new Error(`Copy does not fit its box (${body}). Shorten the title, kicker, or rows.`);
  await run([`--screenshot=${png}`]);
  const bytes = await readFile(png);
  if (bytes.readUInt32BE(16) !== WIDTH || bytes.readUInt32BE(20) !== HEIGHT) throw new Error(`Expected a ${WIDTH} x ${HEIGHT} PNG.`);
}

function reviewHtml(tables) {
  const cards = tables.map(t => `<section><img src="${t.id}/card.png" alt="${esc(altText(t))}"><div><h2>${esc(t.title)}</h2><p class="id">${esc(t.id)} · d${t.die} · ${esc(t.status || 'draft')}</p><h3>Facebook</h3><pre>${esc(caption(t))}</pre><h3>Instagram</h3><pre>${esc(caption(t, 'instagram'))}</pre><h3>Alt text</h3><p>${esc(altText(t))}</p></div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roll for It drafts</title><style>body{margin:0;padding:28px;background:#171b18;color:#efe4ca;font:16px/1.5 Arial,sans-serif}main{max-width:1200px;margin:auto}h1{font:36px Georgia,serif}.draft{color:#e2bc73}section{display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;border-top:1px solid #3a3f38}section img{width:min(100%,432px);height:auto}section div{flex:1 1 320px;min-width:0}h2{font:28px Georgia,serif;margin:0}h3{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e2bc73;margin:18px 0 4px}pre{white-space:pre-wrap;font:15px/1.45 Arial,sans-serif;margin:0}.id{color:#a99d80;margin:4px 0}</style></head><body><main><p class="draft">LOCAL DRAFTS · NOT APPROVED OR PUBLISHED</p><h1>Roll for It</h1>${cards}</main></body></html>`;
}

export async function render(selected, { debug = false } = {}) {
  const browser = await browserPath();
  await mkdir(output, { recursive: true });
  const work = await mkdtemp(path.join(output, '.render-'));
  const url = file => pathToFileURL(file).href;
  try {
    for (const table of selected) {
      const directory = path.join(output, table.id);
      await mkdir(directory, { recursive: true });
      const html = path.join(work, table.id + '.html');
      await writeFile(html, cardHtml(table, { frame: url(path.join(here, 'frames', FRAME.file)), font: name => url(path.join(fonts, name)) }, debug));
      await screenshot(browser, html, path.join(directory, debug ? 'card-debug.png' : 'card.png'), path.join(work, 'browser-profile'), debug);
      if (debug) { console.log(`Debug ${table.id}: ${path.relative(root, directory)}/card-debug.png`); continue; }
      await writeFile(path.join(directory, 'caption-facebook.txt'), caption(table));
      await writeFile(path.join(directory, 'caption-instagram.txt'), caption(table, 'instagram'));
      await writeFile(path.join(directory, 'alt-text.txt'), altText(table) + '\n');
      await writeFile(path.join(directory, 'table.json'), json({ ...table, renderedAt: new Date().toISOString(), approved: false, published: false }));
      console.log(`Rendered ${table.id}: ${path.relative(root, directory)}/card.png`);
    }
  } finally {
    if (path.dirname(work) !== output) throw new Error('Unexpected render cleanup path.');
    await rm(work, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
}

async function main(args) {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === '-h') {
    console.log('Usage: node roll-for-it/roll.mjs list|check|render [table-id|--all] [--debug]');
    console.log('Renders local drafts to .roll-output/ and writes .roll-output/review.html. --debug outlines the slots. No publishing.');
    return;
  }
  if (!['list', 'check', 'render'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const tables = await loadAll();
  if (command === 'check') { console.log(`${tables.length} valid tables.`); return; }
  if (command === 'list') { for (const t of tables) console.log(`${t.id} | d${t.die} | ${t.status || 'draft'} | ${t.title}`); return; }
  const flags = rest.filter(arg => arg.startsWith('--'));
  const ids = rest.filter(arg => !arg.startsWith('--'));
  if (flags.some(flag => !['--all', '--debug'].includes(flag))) throw new Error('Unknown option.');
  if (!ids.length && !flags.includes('--all')) throw new Error('Choose a table ID or --all.');
  const selected = flags.includes('--all') ? tables : tables.filter(t => ids.includes(t.id));
  const missing = ids.filter(id => !tables.some(t => t.id === id));
  if (missing.length) throw new Error(`Unknown table ID: ${missing.join(', ')}`);
  await render(selected, { debug: flags.includes('--debug') });
  if (!flags.includes('--debug')) {
    const rendered = [];
    for (const t of tables) if (await exists(path.join(output, t.id, 'card.png'))) rendered.push(t);
    await writeFile(path.join(output, 'review.html'), reviewHtml(rendered));
    console.log('Review page: .roll-output/review.html');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
