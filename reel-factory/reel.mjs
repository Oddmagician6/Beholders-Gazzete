#!/usr/bin/env node
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_LINES, createGazetteReportScript, normalizeNarrationText } from './templates/gazette-report.mjs';
import { scoreReel } from './scoring.mjs';
import { generateNarration as generateSapiNarration, AUDIO_PAUSE_SECONDS } from './providers/sapi.mjs';
import { generateNarration as generateKokoroNarration } from './providers/kokoro.mjs';
import { renderVideo } from './renderer/ffmpeg.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const DEFAULT_CONFIG = {
  ffmpegPath: 'ffmpeg',
  powershellPath: 'powershell.exe',
  ttsProvider: 'kokoro',
  pythonPath: 'py',
  kokoroVoice: 'am_fenrir',
  outputDirectory: '.reel-output/drafts',
  maxDurationSeconds: 35,
  speechRate: 0,
  speechVolume: 100,
  captionWordsPerLine: 6,
};

function usage() {
  console.log('Usage: node reel-factory/reel.mjs <article-id> [--refresh-script] [--include-real]');
  console.log('Reads articles.json and writes a local Reel draft under .reel-output/drafts/.');
}

function parseArgs(args) {
  const options = { refreshScript: false, includeReal: false };
  for (const arg of args) {
    if (arg === '--refresh-script') options.refreshScript = true;
    else if (arg === '--include-real') options.includeReal = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (!options.articleId) options.articleId = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return options;
}

async function loadConfig() {
  let local = {};
  try {
    local = JSON.parse(await readFile(path.join(here, 'config.local.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Could not read reel-factory/config.local.json: ${error.message}`);
  }
  return { ...DEFAULT_CONFIG, ...local,
    ffmpegPath: process.env.FFMPEG_PATH || local.ffmpegPath || DEFAULT_CONFIG.ffmpegPath,
    outputDirectory: process.env.REEL_OUTPUT_DIR || local.outputDirectory || DEFAULT_CONFIG.outputDirectory,
  };
}

async function loadArticle(articleId, includeReal) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(articleId)) throw new Error('Article ID must contain only letters, numbers, hyphens, or underscores.');
  const data = JSON.parse(await readFile(path.join(root, 'articles.json'), 'utf8'));
  const article = (data.articles || []).find(item => item.id === articleId);
  if (!article) throw new Error(`No article with ID "${articleId}" exists in articles.json.`);
  if (article.real && !includeReal) throw new Error(`Article "${articleId}" is marked real. Use --include-real to create a draft from it.`);
  for (const key of ['title', 'category', 'date']) {
    if (typeof article[key] !== 'string' || !article[key].trim()) throw new Error(`Article "${articleId}" is missing ${key}.`);
  }
  return article;
}

function words(text) { return text.trim().split(/\s+/).filter(Boolean); }

async function getScript(scriptPath, article, refresh, maxDurationSeconds) {
  let previousBrand;
  if (!refresh) {
    try {
      const current = JSON.parse(await readFile(scriptPath, 'utf8'));
      if (current.articleId === article.id && Array.isArray(current.segments) && current.segments.length) {
        let changed = false;
        for (const segment of current.segments) {
          if (typeof segment.text !== 'string') continue;
          const normalized = normalizeNarrationText(segment.text);
          if (normalized !== segment.text) { segment.text = normalized; changed = true; }
        }
        if (changed) await writeFile(scriptPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
        return current;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Existing script.json is invalid: ${error.message}. Use --refresh-script to replace it.`);
    }
  } else {
    try { previousBrand = JSON.parse(await readFile(scriptPath, 'utf8')).segments?.find(segment => segment.role === 'branding')?.text; }
    catch { /* no usable script to refresh: rotate by draft count */ }
  }
  const script = createGazetteReportScript(article, maxDurationSeconds, await nextBrandLine(path.dirname(path.dirname(scriptPath)), path.dirname(scriptPath), previousBrand));
  await writeFile(scriptPath, `${JSON.stringify(script, null, 2)}\n`, 'utf8');
  return script;
}

async function nextBrandLine(outputRoot, currentArticleDirectory, previousBrand) {
  // A refreshed script takes the sign-off after its old one; a new script continues the rotation across drafts.
  const previous = BRAND_LINES.indexOf(previousBrand);
  if (previous >= 0) return BRAND_LINES[(previous + 1) % BRAND_LINES.length];
  const entries = await readdir(outputRoot, { withFileTypes: true });
  let existingScripts = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(outputRoot, entry.name);
    if (directory === currentArticleDirectory) continue;
    try { await access(path.join(directory, 'script.json')); existingScripts++; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return BRAND_LINES[existingScripts % BRAND_LINES.length];
}

async function findArtwork(article) {
  const generatedDirectory = path.join(root, '.reel-output', 'artwork');
  for (const extension of ['png', 'webp', 'jpg', 'jpeg']) {
    const generated = path.join(generatedDirectory, `${article.id}.${extension}`);
    try { await access(generated); return generated; } catch { /* use the next source */ }
  }
  if (article.image) {
    if (/^https?:\/\//i.test(article.image)) {
      throw new Error(`Article has a remote image (${article.image}). The Reel Factory does not download remote artwork.`);
    }
    const explicit = path.resolve(root, String(article.image).replace(/^[/\\]+/, ''));
    if (explicit !== root && !explicit.startsWith(`${root}${path.sep}`)) throw new Error('Article image path escapes the repository.');
    try { await access(explicit); return explicit; } catch { throw new Error(`Article image was not found: ${article.image}`); }
  }
  const slug = article.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const name of [`${slug}-1x1.webp`, `${slug}.webp`]) {
    const candidate = path.join(root, 'img', 'story', name);
    try { await access(candidate); return candidate; } catch { /* try the next deterministic category asset */ }
  }
  throw new Error(`No story artwork found for category "${article.category}" (expected img/story/${slug}.webp).`);
}

function splitCaption(text, maxWords) {
  const result = [];
  let line = [];
  for (const word of words(text)) {
    if (line.length && (line.length >= maxWords || `${line.join(' ')} ${word}`.length > 34)) {
      result.push(line.join(' '));
      line = [];
    }
    line.push(word);
  }
  if (line.length) result.push(line.join(' '));
  // Don't end on a lone word that flashes by: hand it a word from the line before.
  if (result.length > 1 && words(result.at(-1)).length === 1) {
    const before = words(result.at(-2));
    if (before.length >= 3) {
      result[result.length - 2] = before.slice(0, -1).join(' ');
      result[result.length - 1] = `${before.at(-1)} ${result.at(-1)}`;
    }
  }
  return result;
}

function srtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000) % 60;
  const secs = Math.floor(ms / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

function assTime(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(cs / 360000);
  const minutes = Math.floor(cs / 6000) % 60;
  const secs = Math.floor(cs / 100) % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

function assEscape(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('\n', '\\N');
}

async function buildCaptionFiles(script, durations, directory, wordsPerLine) {
  const captions = [];
  let cursor = 0;
  for (let i = 0; i < script.segments.length; i++) {
    const segment = script.segments[i];
    const duration = durations[i];
    const chunks = splitCaption(segment.text, wordsPerLine);
    const totalWords = chunks.reduce((sum, text) => sum + words(text).length, 0);
    let position = cursor;
    for (let j = 0; j < chunks.length; j++) {
      const portion = words(chunks[j]).length / totalWords;
      const end = j === chunks.length - 1 ? cursor + duration : position + duration * portion;
      captions.push({ start: position, end, text: chunks[j], role: segment.role });
      position = end;
    }
    cursor += duration + AUDIO_PAUSE_SECONDS;
  }
  const srt = captions.map((caption, i) => `${i + 1}\n${srtTime(caption.start)} --> ${srtTime(caption.end)}\n${caption.text}\n`).join('\n');
  const ass = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1080', 'PlayResY: 1920', 'WrapStyle: 2', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]', 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Georgia,48,&H00B5D8EA,&H000000FF,&H00090D10,&HCC090D10,0,0,0,0,100,100,0,0,3,2,0,2,90,90,500,1',
    'Style: Masthead,Georgia,36,&H0062ADD5,&H000000FF,&H00090D10,&HCC090D10,1,0,0,0,100,100,0,0,3,2,0,8,90,90,80,1',
    'Style: Hook,Georgia,56,&H00B0DEF1,&H000000FF,&H00090D10,&HCC090D10,1,0,0,0,100,100,0,0,3,3,0,8,90,90,150,1',
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const totalDuration = cursor - AUDIO_PAUSE_SECONDS;
  const mastheadEnd = Math.min(totalDuration, 5);
  const hookIndex = script.segments.findIndex(segment => segment.role === 'hook');
  const hookEnd = Math.min(totalDuration, Math.max(6.5, hookIndex === 0 ? durations[0] : 0));
  const hookText = script.segments[hookIndex]?.text || script.source.title;
  ass.push(`Dialogue: 1,${assTime(0)},${assTime(mastheadEnd)},Masthead,,0,0,0,,THE BEHOLDER'S GAZETTE`);
  ass.push(`Dialogue: 1,${assTime(0)},${assTime(hookEnd)},Hook,,0,0,0,,${assEscape(wrap(hookText, 25))}`);
  for (const caption of captions) {
    if (caption.role === 'hook') continue;
    ass.push(`Dialogue: 2,${assTime(caption.start)},${assTime(caption.end)},Default,,0,0,0,,${assEscape(caption.text)}`);
  }
  await writeFile(path.join(directory, 'captions.srt'), `${srt}\n`, 'utf8');
  await writeFile(path.join(directory, 'captions.ass'), `${ass.join('\n')}\n`, 'utf8');
  return { captions, durationSeconds: totalDuration };
}

function wrap(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of words(text)) {
    if (line && `${line} ${word}`.length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4).join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { usage(); return; }
  if (!options.articleId) { usage(); process.exitCode = 2; return; }
  const config = await loadConfig();
  const article = await loadArticle(options.articleId, options.includeReal);
  const articleDirectory = path.resolve(root, config.outputDirectory, article.id);
  if (!articleDirectory.startsWith(`${path.resolve(root, config.outputDirectory)}${path.sep}`)) throw new Error('Output directory escapes its configured root.');
  await mkdir(articleDirectory, { recursive: true });
  try {
    const previous = JSON.parse(await readFile(path.join(articleDirectory, 'metadata.json'), 'utf8'));
    if (previous.published) throw new Error(`Reel "${article.id}" is already published to Facebook (video ${previous.facebookVideoId || 'unknown'}). Rendering again would overwrite its publication record.`);
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }

  const scriptPath = path.join(articleDirectory, 'script.json');
  const script = await getScript(scriptPath, article, options.refreshScript, Number(config.maxDurationSeconds));
  if (script.segments.some(segment => typeof segment.text !== 'string' || !segment.text.trim())) throw new Error('script.json contains an empty narration segment.');
  // Each segment's audio is saved as <id>.wav, so a missing or repeated id would overwrite another segment's speech.
  const segmentIds = script.segments.map(segment => segment.id);
  if (segmentIds.some(id => typeof id !== 'string' || !id)) throw new Error('script.json has a segment without an id.');
  const repeated = segmentIds.find((id, i) => segmentIds.indexOf(id) !== i);
  if (repeated) throw new Error(`script.json uses the segment id "${repeated}" twice. Give each segment its own id.`);
  const imagePath = await findArtwork(article);
  const narrationPath = path.join(articleDirectory, 'narration.wav');
  const narrate = config.ttsProvider === 'sapi' ? generateSapiNarration
    : config.ttsProvider === 'kokoro' ? generateKokoroNarration
      : null;
  if (!narrate) throw new Error(`Unknown TTS provider "${config.ttsProvider}". Choose "kokoro" or "sapi".`);
  const { segmentDurations } = await narrate(script.segments, articleDirectory, config);
  const { durationSeconds } = await buildCaptionFiles(script, segmentDurations, articleDirectory, Number(config.captionWordsPerLine));
  const videoPath = path.join(articleDirectory, 'render.mp4');
  await renderVideo({
    ffmpegPath: config.ffmpegPath, imagePath, audioPath: narrationPath,
    assPath: path.join(articleDirectory, 'captions.ass'), videoPath, durationSeconds,
  });

  const generatedDirectory = path.join(root, '.reel-output', 'artwork');
  const artworkKind = imagePath.startsWith(`${generatedDirectory}${path.sep}`) ? 'generated'
    : article.image ? 'explicit' : 'category';
  const score = scoreReel(article, script, { artworkKind, durationSeconds });
  await writeFile(path.join(articleDirectory, 'score.json'), `${JSON.stringify(score, null, 2)}\n`, 'utf8');

  const metadata = {
    articleId: article.id, title: article.title, category: article.category, author: article.author || '',
    template: script.template, durationSeconds: Number(durationSeconds.toFixed(2)),
    scriptSchemaVersion: script.schemaVersion || 1,
    scriptWordCount: script.segments.reduce((sum, segment) => sum + words(segment.text).length, 0),
    scriptNeedsHumanReview: script.editorial?.humanReviewRequired ?? true,
    narrationProvider: config.ttsProvider,
    narrationVoice: config.ttsProvider === 'kokoro' ? config.kokoroVoice : 'Windows system voice',
    score: score.total, scoreBand: score.band,
    artwork: path.relative(root, imagePath).replaceAll(path.sep, '/'),
    video: path.relative(root, videoPath).replaceAll(path.sep, '/'),
    caption: script.segments.filter(segment => segment.role !== 'branding').map(segment => segment.text).join(' '),
    hashtags: [], createdAt: new Date().toISOString(), approved: false, published: false,
  };
  await writeFile(path.join(articleDirectory, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`Reel draft saved: ${path.relative(root, videoPath)}`);
  console.log(`Reel score: ${score.total}/100 — ${score.band}`);
  console.log(`Review script: ${path.relative(root, scriptPath)}${options.refreshScript ? '' : ' (reused if already present)'}`);
  console.log(`Captions: ${path.relative(root, path.join(articleDirectory, 'captions.srt'))}`);
}

main().catch(error => {
  console.error(`Reel Factory: ${error.message}`);
  process.exitCode = 1;
});
