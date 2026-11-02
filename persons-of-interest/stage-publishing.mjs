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

async function main() {
  const releaseTag = 'poi-stage-week01-20261102';
  const source = path.join(root, '.poi-output', 'batches', 'month-01', 'week-01');
  const output = path.join(root, '.poi-output', 'publishing', releaseTag);
  const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  if (manifest.entries.length !== 7 || manifest.cardCount !== 21) throw new Error('Expected the reviewed first-week package.');
  await mkdir(output, { recursive: true });
  const entries = [];
  for (const [index, entry] of manifest.entries.entries()) {
    const folder = path.join(source, entry.folder);
    const images = [];
    const alt = JSON.parse(await readFile(path.join(folder, 'alt-text.json'), 'utf8'));
    if (entry.cards.join(',') !== '01-meet.png,02-play.png,03-hook.png' || alt.length !== 3) throw new Error('Card order or alt text is incomplete.');
    for (const [name, checksum] of Object.entries(entry.checksums)) {
      if (path.basename(name) !== name || sha(await readFile(path.join(folder, name))) !== checksum) throw new Error(`Reviewed file changed: ${entry.characterId}/${name}`);
    }
    for (const [cardIndex, name] of entry.cards.entries()) {
      const filename = `${String(index+1).padStart(2,'0')}-${entry.characterId}-${name.replace('.png','.jpg')}`;
      const destination = path.join(output, filename);
      await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner','-loglevel','error','-y','-i',path.join(folder,name),'-frames:v','1','-q:v','2','-pix_fmt','yuvj444p',destination], { windowsHide:true, maxBuffer:1024*1024 });
      const bytes = await readFile(destination);
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length > 8*1024*1024) throw new Error('Expected a JPEG smaller than 8 MB.');
      images.push({ filename, sha256:sha(bytes), width:1080, height:1350, alt:alt[cardIndex] });
    }
    const publishAt = new Date(Date.UTC(2026,10,index+2,15)).toISOString().replace('.000Z','Z');
    const local = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(publishAt));
    if (!local.endsWith('09:00')) throw new Error('Publishing time does not resolve to 9 a.m. Chicago.');
    const facebook = (await readFile(path.join(folder,'caption-facebook.txt'),'utf8')).trim();
    const originalInstagram = (await readFile(path.join(folder,'caption-instagram.txt'),'utf8')).trim();
    const instagram = originalInstagram.replaceAll('@thebeholdersgazette','@beholdersgazette');
    entries.push({ id:`week01-day${String(index+1).padStart(2,'0')}-${entry.characterId}`, day:index+1, characterId:entry.characterId, name:entry.name, approved:true, publishAt, localTime:local, captions:{facebook,instagram}, captionAdjustment:instagram===originalInstagram?null:'Correct Instagram self-mention to the connected account @beholdersgazette.', images });
  }
  const queue = {schemaVersion:1,id:'persons-of-interest-week01',timezone:'America/Chicago',expectedInstagramUsername:'beholdersgazette',approved:true,approval:'Owner approved the seven reviewed posts and requested daily publication starting tomorrow morning, November 2, 2026.',entries};
  const queueBytes = Buffer.from(json(queue));
  const queueSha256 = sha(queueBytes);
  await writeFile(path.join(output,'queue.json'),queueBytes);
  await writeFile(path.join(output,'release-notes.json'),json({schemaVersion:1,queueSha256,armed:false,entries:{}}));
  const config = {schemaVersion:1,enabled:true,releaseTag,queueSha256,repository:'Oddmagician6/Beholders-Gazzete'};
  await writeFile(path.join(root,'.github','npc-carousel-queue.json'),json(config));
  await writeFile(path.join(output,'schedule.txt'),entries.map(e=>`${e.localTime} America/Chicago | ${e.name} | Facebook + Instagram`).join('\n')+'\n');
  console.log(`Prepared 21 JPEGs and seven approved dates in ${path.relative(root,output)}.`);
  console.log(`Queue SHA-256: ${queueSha256}`);
  console.log(entries.map(e=>`${e.localTime} America/Chicago: ${e.name}`).join('\n'));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
