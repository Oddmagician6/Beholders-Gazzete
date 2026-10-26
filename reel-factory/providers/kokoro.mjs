import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_PAUSE_SECONDS } from './sapi.mjs';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

async function readWave(file) {
  const buffer = await readFile(file);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Kokoro returned an invalid WAV file: ${path.basename(file)}`);
  let offset = 12, formatChunk, audioData;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8, end = start + size;
    if (end > buffer.length) throw new Error(`Truncated WAV chunk in ${path.basename(file)}.`);
    if (id === 'fmt ') formatChunk = buffer.subarray(offset, end + (size & 1));
    if (id === 'data') audioData = buffer.subarray(start, end);
    offset = end + (size & 1);
  }
  if (!formatChunk || !audioData) throw new Error(`WAV file is missing PCM format or audio data: ${path.basename(file)}`);
  const byteRate = formatChunk.readUInt32LE(16);
  if (!byteRate) throw new Error(`WAV file has an invalid sample rate: ${path.basename(file)}`);
  return { formatChunk, audioData, duration: audioData.length / byteRate, byteRate };
}

async function joinWaves(files, outputPath) {
  const waves = [];
  for (const file of files) waves.push(await readWave(file));
  const reference = waves[0];
  for (const wave of waves.slice(1)) {
    if (!wave.formatChunk.equals(reference.formatChunk)) throw new Error('Kokoro changed WAV format between segments.');
  }
  const blockAlign = reference.formatChunk.readUInt16LE(20) || 1;
  const silence = Buffer.alloc(Math.round(reference.byteRate * AUDIO_PAUSE_SECONDS / blockAlign) * blockAlign);
  const data = Buffer.concat(waves.flatMap((wave, i) => i === waves.length - 1 ? [wave.audioData] : [wave.audioData, silence]));
  const dataHeader = Buffer.alloc(8);
  dataHeader.write('data', 0, 4, 'ascii');
  dataHeader.writeUInt32LE(data.length, 4);
  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'ascii');
  riffHeader.writeUInt32LE(4 + reference.formatChunk.length + dataHeader.length + data.length, 4);
  riffHeader.write('WAVE', 8, 4, 'ascii');
  await writeFile(outputPath, Buffer.concat([riffHeader, reference.formatChunk, dataHeader, data]));
  return waves.map(wave => wave.duration);
}

export async function generateNarration(segments, directory, config) {
  if (process.platform !== 'win32') throw new Error('The configured Kokoro environment currently expects Windows Python.');
  for (const segment of segments) {
    if (!/^[a-z0-9_-]+$/i.test(segment.id) || segment.id === 'narration') throw new Error(`Invalid audio segment ID: ${segment.id}`);
  }
  const payload = Buffer.from(JSON.stringify(segments), 'utf8').toString('base64');
  const scriptPath = path.join(here, 'kokoro_synthesize.py');
  const pythonPath = config.pythonPath || 'py';
  const launcherArgs = /(^|[\\/])py(?:\.exe)?$/i.test(pythonPath) ? ['-3'] : [];
  const env = {
    ...process.env,
    PATH: [process.env.PATH, 'C:\\Program Files\\eSpeak NG'].filter(Boolean).join(path.delimiter),
  };
  await execFileAsync(pythonPath, [...launcherArgs, scriptPath, payload, directory, config.kokoroVoice || 'am_fenrir'], {
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
    env,
  });
  const files = segments.map(segment => path.join(directory, `${segment.id}.wav`));
  const audioPath = path.join(directory, 'narration.wav');
  const segmentDurations = await joinWaves(files, audioPath);
  return { audioPath, segmentDurations };
}
