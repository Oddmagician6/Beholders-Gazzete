#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';

async function main(args) {
  if (args.some(arg => !/^--week=(?:[1-9]|10)$/.test(arg) && !/^--start=\d{4}-\d{2}-\d{2}$/.test(arg)) || args.filter(arg => arg.startsWith('--week=')).length > 1 || args.filter(arg => arg.startsWith('--start=')).length > 1) throw new Error('Usage: node persons-of-interest/stage-publishing.mjs [--week=1..10] [--start=YYYY-MM-DD]');
  const week = Number(args.find(arg => arg.startsWith('--week='))?.split('=')[1] || 1);
  const weekId = `week${String(week).padStart(2,'0')}`;
  const start = args.find(arg => arg.startsWith('--start='))?.split('=')[1] || (week === 1 ? '2026-11-02' : null);
  if (!start) throw new Error('An explicitly approved start date is required for a later batch.');
  const firstDate = new Date(start + 'T15:00:00Z');
  if (!Number.isFinite(firstDate.getTime()) || firstDate.toISOString().slice(0,10) !== start) throw new Error('Invalid start date.');
  const releaseTag = `poi-stage-${weekId}-${start.replaceAll('-','')}`;
  // Weeks 1-5 are batch 1 (days 1-30, one package per week); weeks 6-10 are batch 2 (days 31-60, one complete package).
  const secondBatch = week >= 6;
  const source = secondBatch
    ? path.join(root, '.poi-output', 'batches', 'month-02', 'complete-batch')
    : path.join(root, '.poi-output', 'batches', 'month-01', `week-${String(week).padStart(2,'0')}`);
  const output = path.join(root, '.poi-output', 'publishing', releaseTag);
  const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  const count = week === 5 || week === 10 ? 2 : 7;
  const firstDay = (week-1)*7 + 1 - (secondBatch ? 5 : 0);
  if (secondBatch) {
    if (manifest.id !== 'month-02-complete-batch' || manifest.entries.length !== 30 || manifest.cardCount !== 90) throw new Error('Expected the reviewed batch 2 package.');
    manifest.entries = manifest.entries.filter(entry => entry.day >= firstDay && entry.day < firstDay + count);
  } else if (manifest.cardCount !== count * 3 || manifest.id !== `month-01-week-${String(week).padStart(2,'0')}`) throw new Error('Expected the selected reviewed package.');
  if (manifest.entries.length !== count) throw new Error('Expected the selected reviewed package.');
  await mkdir(output, { recursive: true });
  const entries = [];
  for (const [index, entry] of manifest.entries.entries()) {
    const folder = path.join(source, entry.folder);
    if (entry.day !== firstDay + index || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.characterId) || entry.folder !== `${String(entry.day).padStart(2,'0')}-${entry.characterId}`) throw new Error('Unexpected character order or review folder.');
    const images = [];
    const alt = JSON.parse(await readFile(path.join(folder, 'alt-text.json'), 'utf8'));
    if (entry.cards.join(',') !== '01-meet.png,02-play.png,03-hook.png' || alt.length !== 3) throw new Error('Card order or alt text is incomplete.');
    for (const [name, checksum] of Object.entries(entry.checksums)) {
      if (path.basename(name) !== name || sha(await readFile(path.join(folder, name))) !== checksum) throw new Error(`Reviewed file changed: ${entry.characterId}/${name}`);
    }
    for (const [cardIndex, name] of entry.cards.entries()) {
      const filename = `${String(entry.day).padStart(2,'0')}-${entry.characterId}-${name.replace('.png','.jpg')}`;
      const destination = path.join(output, filename);
      await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner','-loglevel','error','-y','-i',path.join(folder,name),'-frames:v','1','-q:v','2','-pix_fmt','yuvj444p',destination], { windowsHide:true, maxBuffer:1024*1024 });
      const bytes = await readFile(destination);
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length > 8*1024*1024) throw new Error('Expected a JPEG smaller than 8 MB.');
      images.push({ filename, sha256:sha(bytes), width:1080, height:1350, alt:alt[cardIndex] });
    }
    const publishAt = new Date(firstDate.getTime() + index*86400000).toISOString().replace('.000Z','Z');
    const local = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(publishAt));
    if (!local.endsWith('09:00')) throw new Error('Publishing time does not resolve to 9 a.m. Chicago.');
    const facebook = (await readFile(path.join(folder,'caption-facebook.txt'),'utf8')).trim();
    const originalInstagram = (await readFile(path.join(folder,'caption-instagram.txt'),'utf8')).trim();
    const instagram = originalInstagram.replaceAll('@thebeholdersgazette','@beholdersgazette');
    entries.push({ id:`${weekId}-day${String(entry.day).padStart(2,'0')}-${entry.characterId}`, day:index+1, sourceDay:entry.day, characterId:entry.characterId, name:entry.name, approved:true, publishAt, localTime:local, captions:{facebook,instagram}, captionAdjustment:instagram===originalInstagram?null:'Correct Instagram self-mention to the connected account @beholdersgazette.', images });
  }
  const queue = {schemaVersion:1,id:`persons-of-interest-${weekId}`,timezone:'America/Chicago',expectedInstagramUsername:'beholdersgazette',approved:true,approval:`Owner approved the ${count} reviewed posts for ${weekId} and requested daily Facebook and Instagram publication starting ${start} at 09:00 America/Chicago.`,entries};
  const queueBytes = Buffer.from(json(queue));
  const queueSha256 = sha(queueBytes);
  await writeFile(path.join(output,'queue.json'),queueBytes);
  await writeFile(path.join(output,'release-notes.json'),json({schemaVersion:1,queueSha256,armed:false,entries:{}}));
  const config = {schemaVersion:1,enabled:true,releaseTag,queueSha256,repository:'Oddmagician6/Beholders-Gazzete'};
  const configFile = week === 1 ? 'npc-carousel-queue.json' : `npc-carousel-queue-${weekId}.json`;
  await writeFile(path.join(root,'.github',configFile),json(config));
  await writeFile(path.join(output,'schedule.txt'),entries.map(e=>`${e.localTime} America/Chicago | ${e.name} | Facebook + Instagram`).join('\n')+'\n');
  console.log(`Prepared ${count * 3} JPEGs and ${count} approved dates in ${path.relative(root,output)}.`);
  console.log(`Queue SHA-256: ${queueSha256}`);
  console.log(entries.map(e=>`${e.localTime} America/Chicago: ${e.name}`).join('\n'));
}
main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
