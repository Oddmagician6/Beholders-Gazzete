#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGazetteReportScript } from './templates/gazette-report.mjs';
import { scoreReel } from './scoring.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, '.reel-output', 'scores');

function usage() {
  console.log('Usage: node reel-factory/score.mjs <article-id> [--include-real]');
  console.log('       node reel-factory/score.mjs --all [--include-real]');
  console.log('Scores scripts locally; does not synthesize audio or render a video.');
}

function parseArgs(args) {
  const options = { includeReal: false };
  for (const arg of args) {
    if (arg === '--all') options.all = true;
    else if (arg === '--include-real') options.includeReal = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (!options.articleId) options.articleId = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (options.all && options.articleId) throw new Error('Choose one article ID or --all, not both.');
  return options;
}

async function readConfig() {
  try { return JSON.parse(await readFile(path.join(root, 'reel-factory', 'config.local.json'), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Could not read reel-factory/config.local.json: ${error.message}`);
  }
}

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function artworkKind(article) {
  const generatedDirectory = path.join(root, '.reel-output', 'artwork');
  for (const extension of ['png', 'webp', 'jpg', 'jpeg']) {
    if (await exists(path.join(generatedDirectory, `${article.id}.${extension}`))) return 'generated';
  }
  if (article.image) {
    if (/^https?:\/\//i.test(article.image)) return 'missing';
    const candidate = path.resolve(root, String(article.image).replace(/^[/\\]+/, ''));
    if ((candidate === root || candidate.startsWith(`${root}${path.sep}`)) && await exists(candidate)) return 'explicit';
  }
  const slug = String(article.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const name of [`${slug}-1x1.webp`, `${slug}.webp`]) {
    if (await exists(path.join(root, 'img', 'story', name))) return 'category';
  }
  return 'missing';
}

async function scriptFor(article, outputRoot, maxDurationSeconds) {
  const existingPath = path.join(outputRoot, article.id, 'script.json');
  try {
    const current = JSON.parse(await readFile(existingPath, 'utf8'));
    if (current.articleId === article.id && Array.isArray(current.segments) && current.segments.length) return current;
    throw new Error('script.json does not match this article or has no segments.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Cannot score the existing script for ${article.id}: ${error.message}`);
  }
  return createGazetteReportScript(article, maxDurationSeconds);
}

async function scoreOne(article, config, { save = true } = {}) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(article.id || '')) throw new Error(`Article has an invalid ID: ${article.id}`);
  const outputRoot = path.resolve(root, process.env.REEL_OUTPUT_DIR || config.outputDirectory || '.reel-output/drafts');
  if (!outputRoot.startsWith(`${root}${path.sep}`)) throw new Error('Configured draft directory escapes the repository.');
  const script = await scriptFor(article, outputRoot, Number(config.maxDurationSeconds) || 35);
  const metadataPath = path.join(outputRoot, article.id, 'metadata.json');
  let metadata = {};
  try { metadata = JSON.parse(await readFile(metadataPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error(`Could not read ${article.id} metadata: ${error.message}`); }
  const score = scoreReel(article, script, {
    artworkKind: await artworkKind(article),
    durationSeconds: metadata.durationSeconds,
  });
  if (save) {
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, `${article.id}.json`), `${JSON.stringify(score, null, 2)}\n`, 'utf8');
    if (metadata.articleId === article.id) {
      metadata.score = score.total;
      metadata.scoreBand = score.band;
      await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
      await writeFile(path.join(outputRoot, article.id, 'score.json'), `${JSON.stringify(score, null, 2)}\n`, 'utf8');
    }
  }
  return score;
}

function printReport(report) {
  console.log(`${report.title}\n${report.total}/100 — ${report.band}\n`);
  for (const criterion of report.criteria) {
    console.log(`${criterion.name}: ${criterion.score}/${criterion.max} — ${criterion.rationale}`);
    for (const signal of criterion.signals) console.log(`  + ${signal}`);
    if (criterion.pointsUnawarded) console.log(`  − ${criterion.pointsUnawarded} ${criterion.pointsUnawarded === 1 ? 'point' : 'points'} not awarded.`);
    for (const suggestion of criterion.suggestions) console.log(`  → ${suggestion}`);
  }
  console.log('\nThis is advisory. Human review is still required.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { usage(); return; }
  if (!options.all && !options.articleId) { usage(); process.exitCode = 2; return; }
  const config = await readConfig();
  const data = JSON.parse(await readFile(path.join(root, 'articles.json'), 'utf8'));
  const articles = (data.articles || []).filter(article => options.includeReal || !article.real);

  if (!options.all) {
    const article = articles.find(item => item.id === options.articleId);
    if (!article) throw new Error(`No eligible article with ID "${options.articleId}" exists in articles.json.`);
    printReport(await scoreOne(article, config));
    return;
  }

  const reports = [];
  const errors = [];
  for (const article of articles) {
    try { reports.push(await scoreOne(article, config)); }
    catch (error) { errors.push({ id: article.id, message: error.message }); }
  }
  reports.sort((a, b) => b.total - a.total || a.articleId.localeCompare(b.articleId));
  console.log(`Scored ${reports.length} articles; excluded ${data.articles.length - articles.length} real articles. Reports: ${path.relative(root, outputDirectory)}`);
  console.log('\nTop candidates:');
  for (const report of reports.slice(0, 25)) console.log(`${String(report.total).padStart(3)}/100  ${report.band.padEnd(18)} ${report.articleId} — ${report.title}`);
  const counts = reports.reduce((result, report) => { result[report.band] = (result[report.band] || 0) + 1; return result; }, {});
  console.log(`\nBands: ${Object.entries(counts).map(([band, count]) => `${band}: ${count}`).join(' | ') || 'none'}`);
  if (errors.length) console.log(`Skipped ${errors.length} articles that could not be scored: ${errors.map(item => item.id).join(', ')}`);
  console.log('Scores are advisory; nothing was rendered or published.');
}

main().catch(error => {
  console.error(`Reel scoring: ${error.message}`);
  process.exitCode = 1;
});
