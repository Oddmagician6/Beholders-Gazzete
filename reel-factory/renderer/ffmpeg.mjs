import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const FPS = 30;

function filterPath(value) {
  return value.replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'").replaceAll(',', '\\,');
}

function makeFilterGraph(assPath) {
  const subtitles = filterPath(assPath);
  return [
    '[0:v]split=2[bgsrc][fgsrc]',
    `[bgsrc]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=32:18,eq=brightness=-0.16:saturation=0.72,zoompan=z='min(1+0.00008*on,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS}[bg]`,
    `[fgsrc]scale=920:920:force_original_aspect_ratio=increase,crop=920:920,zoompan=z='min(1+0.000025*on,1.025)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=920x920:fps=${FPS}[fg]`,
    '[bg]drawbox=x=52:y=500:w=976:h=960:color=0xB38B43@0.98:t=4[matte]',
    `[matte][fg]overlay=80:520:shortest=1,subtitles=filename='${subtitles}'[v]`,
  ].join(';\n');
}

export async function renderVideo({ ffmpegPath, imagePath, audioPath, assPath, videoPath, durationSeconds }) {
  try { await execFileAsync(ffmpegPath, ['-version'], { windowsHide: true, maxBuffer: 1024 * 1024 }); }
  catch { throw new Error(`FFmpeg was not found at "${ffmpegPath}". Install FFmpeg and add it to PATH, or set ffmpegPath in reel-factory/config.local.json.`); }
  const filterPath = path.join(path.dirname(videoPath), 'render-filter.txt');
  await writeFile(filterPath, makeFilterGraph(assPath), 'utf8');
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-framerate', String(FPS), '-i', imagePath,
    '-i', audioPath, '-filter_complex_script', filterPath, '-map', '[v]', '-map', '1:a:0',
    '-t', durationSeconds.toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '112k', '-movflags', '+faststart', videoPath,
  ];
  try { await execFileAsync(ffmpegPath, args, { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }); }
  catch (error) {
    const detail = (error.stderr || error.message || '').trim();
    throw new Error(`FFmpeg could not render the Reel. Confirm this FFmpeg build includes libx264 and libass. ${detail}`);
  }
  const result = await stat(videoPath);
  if (result.size < 1024) throw new Error('FFmpeg created an unexpectedly small MP4.');
}
