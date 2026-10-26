# Reel Factory (local prototype)

The Reel Factory is a downstream consumer of the published `articles.json` and `img/story/` library. It does not edit newsroom drafts, article data, article pages, or the Facebook article workflow.

## Requirements

- Node.js 20 or newer.
- Kokoro Python dependencies in `reel-factory/.venv-kokoro` and the eSpeak NG Windows installer. Kokoro narration runs locally; no account or paid TTS service is used.
- FFmpeg on `PATH`, with the `libx264` encoder and `libass` subtitle filter enabled.

If FFmpeg is installed outside `PATH`, copy `config.example.json` to `config.local.json` and set `ffmpegPath` to its executable. Set `pythonPath` to your Python launcher if `py` is unavailable. The default Kokoro voice is `am_fenrir`; change `kokoroVoice` to another available Kokoro voice if desired. Set `ttsProvider` to `sapi` to use the older built-in Windows voice. `config.local.json`, the local Python environment, and rendered drafts are ignored by Git.

Install the Kokoro dependencies in the project-local environment with PowerShell:

```powershell
C:\Users\<you>\AppData\Local\Programs\Python\Python312\python.exe -m venv reel-factory/.venv-kokoro
reel-factory/.venv-kokoro/Scripts/python.exe -m pip install --upgrade pip
reel-factory/.venv-kokoro/Scripts/python.exe -m pip install "kokoro>=0.9.4" soundfile
```

Set `pythonPath` in `config.local.json` to `C:/Users/<you>/.../reel-factory/.venv-kokoro/Scripts/python.exe` after installation.

## Create a draft

From the repository root:

```powershell
node reel-factory/reel.mjs <article-id>
```

## Score articles

Score one article without generating audio or video:

```powershell
node reel-factory/score.mjs <article-id>
```

Rank all eligible articles and save one JSON report per article:

```powershell
node reel-factory/score.mjs --all
```

The scorer uses the handoff's six weighted criteria: hook (20), visual potential (20), humor (20), cold comprehension (15), shareability (15), and short-form suitability (10). Bands are 85–100 Strong candidate, 70–84 Good candidate, 55–69 Maybe, and below 55 Skip. Reports go to `.reel-output/scores/`; when a rendered draft exists, its `score.json` and metadata are refreshed too. Scoring is local, deterministic, advisory, and does not synthesize, render, approve, or publish anything. Its humor and shareability signals are structural proxies, not audience predictions.

## Batch workflow

Preview the top three unrendered articles scoring 70 or higher:

```powershell
node reel-factory/batch.mjs
```

Render that selection sequentially after reviewing the preview:

```powershell
node reel-factory/batch.mjs --run
```

Adjust the candidate pool with `--min-score 85` or `--limit 5`. Articles marked `real` and any article with an existing rendered draft are skipped by default. Use `--include-real` only when deliberately including real-news articles; existing drafts are always skipped to avoid overwrites. Batch generation creates local, unapproved drafts only.

The command skips articles marked `real` unless `--include-real` is supplied. Artwork priority is a local per-article override at `.reel-output/artwork/<article-id>.png` (also accepts WebP/JPG/JPEG), an explicit local `article.image`, then category art at `img/story/<category-slug>-1x1.webp` with a `.webp` fallback. Keep generated Reel art in the ignored override directory; this does not change published article data. The current published articles have no explicit images, so they otherwise use shared category artwork.

The output is written to `.reel-output/drafts/<article-id>/`:

- `script.json` — editable, structured narration with a headline hook, article setup, source-selected punchline when available, voice-ready segments, word count, and duration estimate. Each spoken segment records its source field. Newly generated scripts cycle through four Gazette signoffs in render order. Existing edits are reused on later runs; pass `--refresh-script` to rebuild from the published article and assign the next signoff.
- `hook.wav`, `report.wav`, `brand.wav`, `narration.wav` — local narration and segment audio.
- `captions.srt` and `captions.ass` — timed subtitle files.
- `render.mp4` — 1080 × 1920 H.264 draft with a blurred artwork background, centered subtle zoom, a square framed illustration, a gold masthead, and burned-in captions placed higher in the frame for Reels controls.
- `metadata.json` — article, artwork, output, duration, and approval/publication state.
- `score.json` — weighted score breakdown, band, signals, and improvement suggestions.

The script composer is deterministic and does not invent article facts. It ranks the excerpt ending and closing article sentences using general sentence structure signals (contrast, quoted turns, and length), not phrases from the test articles. This is a heuristic and can still miss the funniest line; review the saved script before approval. `metadata.json` records the script schema, narration provider/voice, and human-review requirement. Scripts and renders remain drafts until a person approves them.

Generated drafts remain local until approved. Facebook Reel publishing is a separate, manual GitHub Actions workflow. It requires an explicitly approved Reel, custom article-specific artwork, and an MP4 staged temporarily as a public GitHub Release asset. The Action uses `FB_PAGE_ID` and `FB_PAGE_TOKEN`, publishes with a description linking to the article plus relevant D&D/TTRPG and story hashtags, checks Meta's processing/publishing status, then removes the temporary Release after confirmed success. The video is not added to the site's Git history.

To stage a video from PowerShell, create a `reel-stage-...` release with the approved file named `render.mp4`, then run **Publish approved Facebook Reel** from the Actions tab with the article ID, release tag, and custom-artwork confirmation. Do not retry a failed or timed-out publish until checking the Facebook Page; Meta may have accepted the publish request even if confirmation timed out.

This does not change the existing automatic article-link publishing workflow. Reel publication never runs on article pushes.
