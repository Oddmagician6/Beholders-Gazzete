#!/usr/bin/env node
// Stages approved, rendered Loot Drop shops for the GitHub Actions publisher (publish_ad_cards.py, CARD_SERIES=loot):
// one JPEG per shop, a dated weekly queue at 12:00 America/Chicago, the initial release state, and
// .github/loot-card-queue-<batch>.json. The sibling of roll-for-it/stage-publishing.mjs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, caption, altText } from './loot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const WEEK = 7 * 86400000;

async function main(args) {
  const arg = name => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
  const month = arg('month'), start = arg('start'), ids = arg('shops')?.split(',');
  if (!/^\d{2}$/.test(month || '') || !/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !ids?.length || ids.length > 5 || args.length !== 3) {
    throw new Error('Usage: node loot-drop/stage-publishing.mjs --month=01 --start=YYYY-MM-DD --shops=id1,id2,...');
  }
  const batch = `month${month}`;
  const { shops } = await loadAll();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  // Noon Chicago is 18:00 UTC in standard time and 17:00 UTC in daylight time.
  const noon = date => [18, 17].map(h => new Date(`${date}T${String(h).padStart(2, '0')}:00:00Z`)).find(d => fmt.format(d).endsWith('12:00'));
  const first = noon(start);
  if (!first) throw new Error('Invalid start date.');
  const releaseTag = `loot-stage-${batch}-${start.replaceAll('-', '')}`;
  const output = path.join(root, '.loot-output', 'publishing', releaseTag);
  await mkdir(output, { recursive: true });
  const entries = [];
  for (const [index, id] of ids.entries()) {
    const shop = shops.find(s => s.id === id);
    if (!shop) throw new Error(`Unknown shop ID: ${id}`);
    if (shop.status !== 'approved') throw new Error(`${id} is not approved.`);
    const folder = path.join(root, '.loot-output', id);
    const rendered = JSON.parse(await readFile(path.join(folder, 'shop.json'), 'utf8'));
    for (const key of Object.keys(shop)) if (key !== 'status' && JSON.stringify(rendered[key]) !== JSON.stringify(shop[key])) throw new Error(`${id}: shops.json changed after rendering (${key}). Render it again and review.`);
    const date = noon(new Date(first.getTime() + index * WEEK).toISOString().slice(0, 10));
    const day = fmt.format(date).slice(0, 10);
    // The card's prices are the market's at noon on shop.date, so it must post that day.
    if (shop.date !== day) throw new Error(`${id}: priced for ${shop.date || 'render time'} but would post ${day}. Set its date and render it again.`);
    const filename = `${id}.jpg`;
    const destination = path.join(output, filename);
    await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(folder, 'card.png'), '-frames:v', '1', '-q:v', '2', '-pix_fmt', 'yuvj444p', destination], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const bytes = await readFile(destination);
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length > 8 * 1024 * 1024) throw new Error('Expected a JPEG smaller than 8 MB.');
    const d = rendered.facts;
    const publishAt = date.toISOString().replace('.000Z', 'Z');
    entries.push({ id, day: index + 1, title: d.name, seed: shop.seed, approved: true, publishAt, localTime: fmt.format(date), captions: { facebook: caption(shop, d).trim(), instagram: caption(shop, d, 'instagram').trim() }, images: [{ filename, sha256: sha(bytes), width: 1080, height: 1350, alt: altText(shop, d) }] });
  }
  const queue = { schemaVersion: 1, id: `loot-drop-${batch}`, timezone: 'America/Chicago', expectedInstagramUsername: 'beholdersgazette', approved: true, approval: `Owner approved the Loot Drop cards and asked for a month of ${entries.length} to be scheduled weekly on Facebook and Instagram starting ${start} at 12:00 America/Chicago.`, entries };
  const queueBytes = Buffer.from(json(queue));
  const queueSha256 = sha(queueBytes);
  await writeFile(path.join(output, 'queue.json'), queueBytes);
  await writeFile(path.join(output, 'release-notes.json'), json({ schemaVersion: 1, queueSha256, armed: false, entries: {} }));
  await writeFile(path.join(root, '.github', `loot-card-queue-${batch}.json`), json({ schemaVersion: 1, enabled: true, releaseTag, queueSha256, repository: 'Oddmagician6/Beholders-Gazzete' }));
  await writeFile(path.join(output, 'schedule.txt'), entries.map(e => `${e.localTime} America/Chicago | ${e.title} (seed ${e.seed}) | Facebook + Instagram`).join('\n') + '\n');
  console.log(`Staged ${entries.length} shops in ${path.relative(root, output)} (queue ${queueSha256}).`);
  console.log(entries.map(e => `${e.localTime} America/Chicago: ${e.title}`).join('\n'));
}

main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
