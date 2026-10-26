#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scoreCommand = path.join(root, 'reel-factory', 'score.mjs');
const reelCommand = path.join(root, 'reel-factory', 'reel.mjs');
const scoreDirectory = path.join(root, '.reel-output', 'scores');

function usage() {
  console.log('Usage: node reel-factory/batch.mjs [--preview | --run] [--limit N] [--min-score N] [--include-real]');
  console.log('Default: preview up to 3 unrendered articles scoring 70 or higher.');
  console.log('Use --run to render selected articles sequentially; existing drafts are skipped.');
}

function parseArgs(args) {
  const options = { mode: 'preview', limit: 3, minScore: 70, includeReal: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--preview') options.mode = 'preview';
    else if (arg === '--run') options.mode = 'run';
    else if (arg === '--include-real') options.includeReal = true;
    else if (arg === '--limit' || arg === '--min-score') {
      const value = args[++i];
      if (!value || !/^\d+$/.test(value)) throw new Error(`${arg} requires a whole number.`);
      if (arg === '--limit') options.limit = Number(value);
      else options.minScore = Number(value);
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.limit < 1) throw new Error('--limit must be at least 1.');
  if (options.minScore < 0 || options.minScore > 100) throw new Error('--min-score must be between 0 and 100.');
  return options;
}

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function refreshScores(includeReal) {
  const args = [scoreCommand, '--all'];
  if (includeReal) args.push('--include-real');
  try {
    execFileSync(process.execPath, args, { cwd: root, stdio: 'pipe', windowsHide: true });
  } catch (error) {
    const detail = (error.stderr || error.message || '').toString().trim();
    throw new Error(`Could not refresh article scores. ${detail}`);
  }
}

async function selectCandidates(options) {
  const [articleData, configText] = await Promise.all([
    readFile(path.join(root, 'articles.json'), 'utf8'),
    readFile(path.join(root, 'reel-factory', 'config.local.json'), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return '{}';
      throw error;
    }),
  ]);
  const config = JSON.parse(configText);
  const outputRoot = path.resolve(root, process.env.REEL_OUTPUT_DIR || config.outputDirectory || '.reel-output/drafts');
  if (!outputRoot.startsWith(`${root}${path.sep}`)) throw new Error('Configured draft directory escapes the repository.');
  const articles = (JSON.parse(articleData).articles || []).filter(article => options.includeReal || !article.real);
  const candidates = [];
  const skippedExisting = [];
  for (const article of articles) {
    const scorePath = path.join(scoreDirectory, `${article.id}.json`);
    let score;
    try { score = JSON.parse(await readFile(scorePath, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw new Error(`Invalid score report for ${article.id}: ${error.message}`); }
    if (score.total < options.minScore) continue;
    const draftDirectory = path.join(outputRoot, article.id);
    if (await exists(path.join(draftDirectory, 'render.mp4')) || await exists(path.join(draftDirectory, 'metadata.json'))) {
      skippedExisting.push(article.id);
      continue;
    }
    candidates.push({ article, score });
  }
  candidates.sort((a, b) => b.score.total - a.score.total || String(b.article.date).localeCompare(String(a.article.date)) || a.article.id.localeCompare(b.article.id));
  return { candidates: candidates.slice(0, options.limit), available: candidates.length, skippedExisting, eligibleCount: articles.length };
}

function printPreview(selection, options) {
  console.log(`Batch preview: score ≥ ${options.minScore}, limit ${options.limit}; ${selection.eligibleCount} eligible articles checked.`);
  console.log(`${selection.skippedExisting.length} already-rendered drafts skipped; ${selection.available} unrendered candidates meet the threshold.\n`);
  if (!selection.candidates.length) {
    console.log('No candidates selected. Lower --min-score or check the saved score reports.');
    return;
  }
  for (const { article, score } of selection.candidates) {
    console.log(`${score.total}/100  ${score.band.padEnd(18)} ${article.id} — ${article.title}`);
    console.log(`         ${score.artworkKind} artwork · ${score.durationSeconds.toFixed(1)}s estimated`);
  }
  if (options.mode === 'preview') console.log('\nPreview only. Add --run to render these drafts.');
}

function renderArticle(articleId, includeReal) {
  return new Promise((resolve, reject) => {
    const args = [reelCommand, articleId];
    if (includeReal) args.push('--include-real');
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`Rendering ${articleId} failed with exit code ${code}.`)));
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { usage(); return; }
  await refreshScores(options.includeReal);
  const selection = await selectCandidates(options);
  printPreview(selection, options);
  if (options.mode !== 'run' || !selection.candidates.length) return;

  console.log('\nRendering selected articles one at a time. Drafts remain unapproved and unpublished.');
  for (const { article } of selection.candidates) await renderArticle(article.id, options.includeReal);
  console.log(`\nBatch complete: ${selection.candidates.length} local Reel drafts created.`);
}

main().catch(error => {
  console.error(`Reel batch: ${error.message}`);
  process.exitCode = 1;
});
