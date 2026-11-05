#!/usr/bin/env node
// Stages approved, rendered maps for the GitHub Actions publisher (publish_ad_cards.py, CARD_SERIES=map):
// one JPEG per map, a dated weekly queue at 12:00 America/Chicago, the initial release state, and
// .github/map-card-queue-<batch>.json. The sibling of ad-of-the-week/stage-publishing.mjs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, caption, altText } from './map.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const WEEK = 7 * 86400000;

async function main(args) {
  const arg = name => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
  const month = arg('month'), start = arg('start'), ids = arg('maps')?.split(',');
  if (!/^\d{2}$/.test(month || '') || !/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !ids?.length || ids.length > 5 || args.length !== 3) {
    throw new Error('Usage: node map-of-the-week/stage-publishing.mjs --month=01 --start=YYYY-MM-DD --maps=id1,id2,...');
  }
  const batch = `month${month}`;
  const { maps } = await loadAll();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  // Noon Chicago is 18:00 UTC in standard time and 17:00 UTC in daylight time.
  const noon = date => [18, 17].map(h => new Date(`${date}T${String(h).padStart(2, '0')}:00:00Z`)).find(d => fmt.format(d).endsWith('12:00'));
  const first = noon(start);
  if (!first) throw new Error('Invalid start date.');
  const releaseTag = `map-stage-${batch}-${start.replaceAll('-', '')}`;
  const output = path.join(root, '.map-output', 'publishing', releaseTag);
  await mkdir(output, { recursive: true });
  const entries = [];
  for (const [index, id] of ids.entries()) {
    const map = maps.find(m => m.id === id);
    if (!map) throw new Error(`Unknown map ID: ${id}`);
    if (map.status !== 'approved') throw new Error(`${id} is not approved.`);
    const folder = path.join(root, '.map-output', id);
    const rendered = JSON.parse(await readFile(path.join(folder, 'map.json'), 'utf8'));
    for (const key of Object.keys(map)) if (key !== 'status' && JSON.stringify(rendered[key]) !== JSON.stringify(map[key])) throw new Error(`${id}: maps.json changed after rendering (${key}). Render it again and review.`);
    const d = rendered.facts;
    const filename = `${id}.jpg`;
    const destination = path.join(output, filename);
    await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(folder, 'card.png'), '-frames:v', '1', '-q:v', '2', '-pix_fmt', 'yuvj444p', destination], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const bytes = await readFile(destination);
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length > 8 * 1024 * 1024) throw new Error('Expected a JPEG smaller than 8 MB.');
    const date = noon(new Date(first.getTime() + index * WEEK).toISOString().slice(0, 10));
    const publishAt = date.toISOString().replace('.000Z', 'Z');
    entries.push({ id, day: index + 1, continent: d.name, site: d.site, seed: map.seed, approved: true, publishAt, localTime: fmt.format(date), captions: { facebook: caption(map, d).trim(), instagram: caption(map, d, 'instagram').trim() }, images: [{ filename, sha256: sha(bytes), width: 1080, height: 1350, alt: altText(map, d) }] });
  }
  const queue = { schemaVersion: 1, id: `map-of-the-week-${batch}`, timezone: 'America/Chicago', expectedInstagramUsername: 'beholdersgazette', approved: true, approval: `Owner approved these ${entries.length} Map of the Week cards and asked for them to be scheduled weekly on Facebook and Instagram starting ${start} at 12:00 America/Chicago.`, entries };
  const queueBytes = Buffer.from(json(queue));
  const queueSha256 = sha(queueBytes);
  await writeFile(path.join(output, 'queue.json'), queueBytes);
  await writeFile(path.join(output, 'release-notes.json'), json({ schemaVersion: 1, queueSha256, armed: false, entries: {} }));
  await writeFile(path.join(root, '.github', `map-card-queue-${batch}.json`), json({ schemaVersion: 1, enabled: true, releaseTag, queueSha256, repository: 'Oddmagician6/Beholders-Gazzete' }));
  await writeFile(path.join(output, 'schedule.txt'), entries.map(e => `${e.localTime} America/Chicago | ${e.continent}: ${e.site} | Facebook + Instagram`).join('\n') + '\n');
  console.log(`Staged ${entries.length} maps in ${path.relative(root, output)} (queue ${queueSha256}).`);
  console.log(entries.map(e => `${e.localTime} America/Chicago: ${e.continent} / ${e.site}`).join('\n'));
}

main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
