# Reel Factory (local prototype)

The Reel Factory is a downstream consumer of the published `articles.json` and `img/story/` library. It does not edit newsroom drafts, article data, article pages, or the Facebook article workflow.

## Requirements

- Node.js 20 or newer.
- Kokoro Python dependencies in `reel-factory/.venv-kokoro` and the eSpeak NG Windows installer. Kokoro narration runs locally; no account or paid TTS service is used.
- FFmpeg on `PATH`, with the `libx264` encoder and `libass` subtitle filter enabled.

If FFmpeg is installed outside `PATH`, copy `config.example.json` to `config.local.json` and set `ffmpegPath` to its executable. Set `pythonPath` to your Python launcher if `py` is unavailable. The default Kokoro voice is Heart (`af_heart`); change `kokoroVoice` to another available Kokoro voice if desired. Set `ttsProvider` to `sapi` to use the older built-in Windows voice. `config.local.json`, the local Python environment, and rendered drafts are ignored by Git.

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
- Narration scripts and signoffs must not contain em dashes. The script composer replaces em dashes from article text with spoken-friendly punctuation, and cached scripts are normalized on rerender.
- `hook.wav`, `report.wav`, `brand.wav`, `narration.wav` — local narration and segment audio.
- `captions.srt` and `captions.ass` — timed subtitle files.
- `render.mp4` — 1080 × 1920 H.264/AAC draft at 30 fps, with 48 kHz audio, a blurred artwork background, centered subtle zoom, a square framed illustration, a gold masthead, and burned-in captions placed higher in the frame for Reels controls.
- `metadata.json` — article, artwork, output, duration, and approval/publication state.
- `score.json` — weighted score breakdown, band, signals, and improvement suggestions.

The script composer is deterministic and does not invent article facts. It ranks the excerpt ending and closing article sentences using general sentence structure signals (contrast, quoted turns, and length), not phrases from the test articles. This is a heuristic and can still miss the funniest line; review the saved script before approval. `metadata.json` records the script schema, narration provider/voice, and human-review requirement. Scripts and renders remain drafts until a person approves them.

Generated drafts remain local until approved. Facebook and Instagram Reel publishing are separate, manual GitHub Actions workflows. Each requires an explicitly approved Reel, custom article-specific artwork, and an MP4 staged temporarily as a public GitHub Release asset. Both use `FB_PAGE_ID` and `FB_PAGE_TOKEN` (a Meta User Access Token); the publisher resolves the Page token at run time. Captions link to the article and include the standard D&D/TTRPG hashtags plus up to four story hashtags you choose. The Instagram workflow requires a professional account linked to the Facebook Page, waits for Reel processing, and publishes immediately; Instagram scheduling is not supported by this workflow. Each Action removes the temporary Release only after confirmed success. The video is not added to the site's Git history.

To stage a video from PowerShell, create a `reel-stage-...` release with the approved file named `render.mp4`, then run **Publish approved Facebook Reel** or **Publish approved Instagram Reel** from the Actions tab with the article ID, release tag, custom-artwork confirmation, and story hashtags (for example `#MooseRescue #SkatePark`). Do not retry a failed or timed-out publish until checking the destination account; Meta may have accepted the publish request even if confirmation timed out.

This does not change the existing automatic article-link publishing workflow. Reel publication never runs on article pushes.

## Weekly tavern reviews

Tavern-review Reels are standalone (no article), so they skip the article Reel workflows and post through `.github/scripts/publish_tavern_reels.py`: one a week, Saturdays at 12:00 America/Chicago, with separate Facebook and Instagram captions kept in `reel-factory/tavern-reviews.json`. It follows the card series' rules (see `persons-of-interest/PUBLISHING.md`): the queue is staged in a public Release pinned by SHA-256 in `.github/tavern-reel-queue-batchNN.json`, state lives in the Release body, and the workflow runs `verify`, `arm`, then `run_due` on schedule. Facebook Page Reels are scheduled at most 29 days ahead, so `arm` schedules what fits and each Saturday run schedules the rest. Instagram publishes on the Saturday runs. The workflow disables itself once every post is confirmed.

```
py reel-factory/stage-tavern-reels.py --batch=01 --start=YYYY-MM-DD --ids=id1,id2,...
py .github/scripts/publish_tavern_reels.py --validate-queue .reel-output/publishing/<tag>/queue.json
gh release create <tag> --target main --latest=false --title <tag> --notes-file .reel-output/publishing/<tag>/release-notes.json <the MP4s and queue.json>
# commit and push the batch config and workflow (copy batch01's for a new batch: REEL_BATCH, name, report name), then:
gh workflow run publish-tavern-reels-batchNN.yml -f operation=verify   # then operation=arm
```

Arm within 29 days of the first Reel. Never recreate a Release's state after arming.
