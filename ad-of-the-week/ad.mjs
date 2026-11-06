#!/usr/bin/env node
// Ad of the Week: renders one 1080 x 1350 PNG card per ad in ads.json onto a frame from frames/.
// Local drafts only. No AI API and no publishing calls.
import { access, readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const output = path.join(root, '.ad-output');
export const SITE = 'https://gazette.ashforgestudio.com';
export const WIDTH = 1080;
export const HEIGHT = 1350;
const SOURCE_H = 1440;
const SCALE = HEIGHT / SOURCE_H;

const limits = { id: 70, business: 34, kicker: 48, headline: 40, tagline: 80, finePrint: 200, price: 8, priceNote: 14, question: 200, artAlt: 120 };
const json = value => JSON.stringify(value, null, 2) + '\n';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const exists = async file => { try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

export function validateAd(ad, frames) {
  if (!ad || typeof ad !== 'object') throw new Error('Expected an ad object.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ad.id || '')) throw new Error(`Ad ID must be a lowercase slug: ${ad.id}`);
  for (const [key, max] of Object.entries(limits)) {
    const optional = key === 'priceNote';
    if (typeof ad[key] !== 'string' || (!optional && !ad[key].trim())) throw new Error(`${ad.id}: missing ${key}.`);
    if (ad[key].length > max) throw new Error(`${ad.id}: ${key} is ${ad[key].length} characters; the limit is ${max}.`);
  }
  if (!frames[ad.frame]) throw new Error(`${ad.id}: unknown frame "${ad.frame}" (${Object.keys(frames).filter(k => !k.startsWith('_')).join(', ')}).`);
  if (!Array.isArray(ad.pitch) || ad.pitch.length < 1 || ad.pitch.length > 3 || ad.pitch.some(line => typeof line !== 'string' || !line.trim() || line.length > 48)) {
    throw new Error(`${ad.id}: pitch needs 1 to 3 lines of at most 48 characters.`);
  }
  if (typeof ad.art !== 'string' || !/^[a-z0-9/_-]+\.(webp|png|jpg)$/.test(ad.art)) throw new Error(`${ad.id}: art must be a path under img/, such as woodcut/rumor.webp.`);
  if (ad.social !== undefined) for (const platform of ['facebook', 'instagram']) {
    if (typeof ad.social[platform] !== 'string' || !ad.social[platform].trim() || ad.social[platform].length > 2200) throw new Error(`${ad.id}: invalid ${platform} caption.`);
  }
  return ad;
}

export async function loadAll() {
  const frames = JSON.parse(await readFile(path.join(here, 'frames.json'), 'utf8'));
  const { ads } = JSON.parse(await readFile(path.join(here, 'ads.json'), 'utf8'));
  const ids = new Set();
  for (const ad of ads) {
    validateAd(ad, frames);
    if (ids.has(ad.id)) throw new Error(`Duplicate ad ID: ${ad.id}`);
    ids.add(ad.id);
    if (!await exists(path.join(root, 'img', ad.art))) throw new Error(`${ad.id}: img/${ad.art} not found.`);
  }
  return { frames, ads };
}

export function caption(ad, platform = 'facebook') {
  if (ad.social) return ad.social[platform];
  const where = platform === 'instagram' ? 'More from the realm at the link in our bio.' : `More from the realm: ${SITE}`;
  return `Ad of the Week: ${ad.business}\n${ad.headline}. ${ad.price}${ad.priceNote ? ` (${ad.priceNote})` : ''}.\n\n${ad.question}\n\nA paid advertisement from the pages of The Beholder's Gazette. Every business is fictional; the fine print is binding.\n${where}\n\n#DnD #TTRPG #Fantasy #DungeonsAndDragons\n`;
}

export function altText(ad) {
  return `Ad of the Week from The Beholder's Gazette, styled as an old fantasy newspaper advertisement. Banner: ${ad.business}. ${ad.kicker}. Illustration: ${ad.artAlt}. ${ad.headline}: ${ad.pitch.join(' ')} ${ad.tagline} Price: ${ad.price}${ad.priceNote ? `, ${ad.priceNote}` : ''}. Fine print: ${ad.finePrint}`;
}

const box = s => `left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px`;

export function cardHtml(ad, frame, urls, debug = false) {
  const outline = debug ? 'outline:3px dashed #e0115f;' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(ad.business)}</title><style>
@font-face{font-family:Cinzel;font-weight:700;src:url(${urls.font('cinzel-latin-700-normal.woff2')})}
@font-face{font-family:Cinzel;font-weight:900;src:url(${urls.font('cinzel-latin-900-normal.woff2')})}
@font-face{font-family:Fell;font-style:normal;src:url(${urls.font('im-fell-english-latin-400-normal.woff2')})}
@font-face{font-family:Fell;font-style:italic;src:url(${urls.font('im-fell-english-latin-400-italic.woff2')})}
*{box-sizing:border-box}html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
body{background:${frame.edge};color:#2a1a0c;font-family:Fell,Georgia,serif}
.stage{position:absolute;left:${(WIDTH - 1092 * SCALE) / 2}px;top:0;width:1092px;height:${SOURCE_H}px;transform:scale(${SCALE});transform-origin:0 0}
.stage>img.frame{position:absolute;inset:0;width:1092px;height:${SOURCE_H}px}
.slot{position:absolute;--k:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;${outline}}
.ribbon h1{margin:0;font:900 calc(var(--k)*62px)/1 Cinzel,serif;letter-spacing:1px;white-space:nowrap;color:#3a200e;text-shadow:0 1px 0 #f7e7bf88}
.body{justify-content:space-between;padding:6px 18px}
.kicker{font:700 calc(var(--k)*21px)/1.25 Cinzel,serif;letter-spacing:2px;white-space:nowrap;max-width:100%;text-transform:uppercase;color:#6e2a17}
.paid{font:700 calc(var(--k)*17px)/1 Cinzel,serif;letter-spacing:5px;color:#7b5a33;display:flex;gap:14px;align-items:center;width:100%}
.paid:before,.paid:after{content:'';flex:1;border-top:2px solid #7b5a3399;border-bottom:1px solid #7b5a3399;height:3px}
.art{height:calc(var(--k)*170px);max-width:70%;object-fit:contain;mix-blend-mode:multiply;opacity:.9}
.headline{margin:0;font:900 calc(var(--k)*58px)/1.05 Cinzel,serif;color:#2a1a0c}
.pitch{margin:0;padding:0;list-style:none;font-size:calc(var(--k)*37px);line-height:1.22}
.pitch li{white-space:nowrap}.pitch li+li{margin-top:4px}
.tagline{margin:0;font-style:italic;font-size:calc(var(--k)*28px);line-height:1.2;color:#5a3a1c}
.credit{font:700 calc(var(--k)*15px)/1 Cinzel,serif;letter-spacing:2.5px;color:#7b5a33}
.fine{padding:4px 10px}
.fine h2{margin:0 0 8px;font:700 calc(var(--k)*17px)/1 Cinzel,serif;letter-spacing:4px;color:#6e2a17}
.fine p{margin:0;font-style:italic;font-size:calc(var(--k)*27px);line-height:1.22;color:#3a2412}
.price{color:${frame.price.color}}
.price strong{font:900 calc(var(--k)*${Math.round(Math.min(frame.price.h * 0.36, frame.price.w * 0.3))}px)/1 Cinzel,serif;white-space:nowrap}
.price small{font-style:italic;font-size:calc(var(--k)*${Math.max(17, Math.round(frame.price.h * 0.16))}px);line-height:1.1;margin-top:4px}
</style></head><body><div class="stage"><img class="frame" src="${urls.frame}" alt="">
<div class="slot ribbon" data-min=".55" style="${box(frame.ribbon)}"><h1>${esc(ad.business)}</h1></div>
<div class="slot body" data-min=".72" style="${box(frame.body)}">
<div class="paid">PAID ADVERTISEMENT</div>
<div class="kicker">${esc(ad.kicker)}</div>
<img class="art" src="${urls.art}" alt="">
<h2 class="headline">${esc(ad.headline)}</h2>
<ul class="pitch">${ad.pitch.map(line => `<li>${esc(line)}</li>`).join('')}</ul>
<p class="tagline">${esc(ad.tagline)}</p>
<div class="credit">THE BEHOLDER'S GAZETTE · GAZETTE.ASHFORGESTUDIO.COM</div>
</div>
<div class="slot fine" data-min=".75" style="${box(frame.fine)}"><h2>THE FINE PRINT</h2><p>${esc(ad.finePrint)}</p></div>
<div class="slot price" data-min=".6" style="${box(frame.price)}"><strong>${esc(ad.price)}</strong>${ad.priceNote ? `<small>${esc(ad.priceNote)}</small>` : ''}</div>
</div><script>
function fit(){var failures=[];document.querySelectorAll('.kicker').forEach(function(el){var size=parseFloat(getComputedStyle(el).fontSize);while(el.scrollWidth>el.clientWidth+1&&size>14){size-=.5;el.style.fontSize=size+'px'}});document.querySelectorAll('.slot').forEach(function(el){var k=1,min=Number(el.dataset.min);function over(){if(el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)return true;return Array.prototype.some.call(el.querySelectorAll('*'),function(c){return c.scrollWidth>c.clientWidth+1})}while(over()&&k>min){k-=.01;el.style.setProperty('--k',k.toFixed(2))}if(over())failures.push(el.className.split(' ')[1])});
document.body.dataset.layout=failures.length?'overflow:'+failures.join(','):'ok';document.body.dataset.images=Array.from(document.images).every(function(img){return img.complete&&img.naturalWidth>0})?'ok':'missing'}
window.addEventListener('load',function(){document.fonts.ready.then(fit)});
</script></body></html>`;
}

async function browserPath() {
  const candidates = [process.env.POI_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error('Chrome or Edge not found. Set POI_BROWSER to a Chromium browser executable.');
}

async function screenshot(browser, html, png, userData, debug) {
  const args = ['--headless', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--user-data-dir=${userData}`, `--window-size=${WIDTH},${HEIGHT}`, '--virtual-time-budget=3000', `--screenshot=${png}`, '--dump-dom', pathToFileURL(html).href];
  let result;
  try { result = await exec(browser, args, { windowsHide: true, timeout: 60000, maxBuffer: 16 * 1024 * 1024 }); }
  catch (error) { throw new Error(`Card rendering failed: ${(error.stderr || error.message).slice(-1800)}`); }
  const body = result.stdout.match(/<body[^>]*>/)?.[0] || 'no rendered body';
  if (!body.includes('data-images="ok"')) throw new Error(`An image did not load (${body}).`);
  if (!body.includes('data-layout="ok"') && !debug) throw new Error(`Copy does not fit its box (${body}). Shorten that part of the ad.`);
  const bytes = await readFile(png);
  if (bytes.readUInt32BE(16) !== WIDTH || bytes.readUInt32BE(20) !== HEIGHT) throw new Error(`Expected a ${WIDTH} x ${HEIGHT} PNG.`);
}

function reviewHtml(ads) {
  const cards = ads.map(ad => `<section><img src="${ad.id}/card.png" alt="${esc(altText(ad))}"><div><h2>${esc(ad.business)}</h2><p class="id">${esc(ad.id)} · ${esc(ad.frame)} · ${esc(ad.status || 'draft')}</p><h3>Facebook</h3><pre>${esc(caption(ad))}</pre><h3>Instagram</h3><pre>${esc(caption(ad, 'instagram'))}</pre><h3>Alt text</h3><p>${esc(altText(ad))}</p></div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ad of the Week drafts</title><style>body{margin:0;padding:28px;background:#171b18;color:#efe4ca;font:16px/1.5 Arial,sans-serif}main{max-width:1200px;margin:auto}h1{font:36px Georgia,serif}.draft{color:#e2bc73}section{display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;border-top:1px solid #3a3f38}section img{width:min(100%,432px);height:auto}section div{flex:1 1 320px;min-width:0}h2{font:28px Georgia,serif;margin:0}h3{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e2bc73;margin:18px 0 4px}pre{white-space:pre-wrap;font:15px/1.45 Arial,sans-serif;margin:0}.id{color:#a99d80;margin:4px 0}</style></head><body><main><p class="draft">LOCAL DRAFTS · NOT APPROVED OR PUBLISHED</p><h1>Ad of the Week</h1>${cards}</main></body></html>`;
}

export async function render(selected, frames, { debug = false } = {}) {
  const browser = await browserPath();
  await mkdir(output, { recursive: true });
  const work = await mkdtemp(path.join(output, '.render-'));
  const url = file => pathToFileURL(file).href;
  try {
    for (const ad of selected) {
      const frame = frames[ad.frame];
      const directory = path.join(output, ad.id);
      await mkdir(directory, { recursive: true });
      const html = path.join(work, ad.id + '.html');
      await writeFile(html, cardHtml(ad, frame, { frame: url(path.join(here, 'frames', frame.file)), art: url(path.join(root, 'img', ad.art)), font: name => url(path.join(here, 'fonts', name)) }, debug));
      await screenshot(browser, html, path.join(directory, debug ? 'card-debug.png' : 'card.png'), path.join(work, 'browser-profile'), debug);
      if (debug) { console.log(`Debug ${ad.id}: ${path.relative(root, directory)}/card-debug.png`); continue; }
      await writeFile(path.join(directory, 'caption-facebook.txt'), caption(ad));
      await writeFile(path.join(directory, 'caption-instagram.txt'), caption(ad, 'instagram'));
      await writeFile(path.join(directory, 'alt-text.txt'), altText(ad) + '\n');
      await writeFile(path.join(directory, 'ad.json'), json({ ...ad, renderedAt: new Date().toISOString(), approved: false, published: false }));
      console.log(`Rendered ${ad.id}: ${path.relative(root, directory)}/card.png`);
    }
  } finally {
    if (path.dirname(work) !== output) throw new Error('Unexpected render cleanup path.');
    await rm(work, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
}

async function main(args) {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === '-h') {
    console.log('Usage: node ad-of-the-week/ad.mjs list|check|render [ad-id|--all] [--debug]');
    console.log('Renders local drafts to .ad-output/ and writes .ad-output/review.html. --debug outlines the frame slots. No publishing.');
    return;
  }
  if (!['list', 'check', 'render'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const { frames, ads } = await loadAll();
  if (command === 'check') { console.log(`${ads.length} valid ads.`); return; }
  if (command === 'list') { for (const ad of ads) console.log(`${ad.id} | ${ad.frame} | ${ad.status || 'draft'} | ${ad.business}`); return; }
  const flags = rest.filter(arg => arg.startsWith('--'));
  const ids = rest.filter(arg => !arg.startsWith('--'));
  if (flags.some(flag => !['--all', '--debug'].includes(flag))) throw new Error('Unknown option.');
  if (!ids.length && !flags.includes('--all')) throw new Error('Choose an ad ID or --all.');
  const selected = flags.includes('--all') ? ads : ads.filter(ad => ids.includes(ad.id));
  const missing = ids.filter(id => !ads.some(ad => ad.id === id));
  if (missing.length) throw new Error(`Unknown ad ID: ${missing.join(', ')}`);
  await render(selected, frames, { debug: flags.includes('--debug') });
  if (!flags.includes('--debug')) {
    const rendered = [];
    for (const ad of ads) if (await exists(path.join(output, ad.id, 'card.png'))) rendered.push(ad);
    await writeFile(path.join(output, 'review.html'), reviewHtml(rendered));
    console.log('Review page: .ad-output/review.html');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
