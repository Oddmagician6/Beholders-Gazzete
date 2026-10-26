---
name: beholders-reel-factory
description: Create, score, tune, and prepare Beholder's Gazette article Reels in this repository. Use for the local Reel Factory workflow; publishing requires a separate explicit request.
---

# Beholder's Gazette Reel Factory

Work in this repository's `reel-factory/` tools. This is a local downstream workflow using published `articles.json`; it must not alter newsroom articles or drafts. Reel renders are unapproved local drafts unless the user explicitly approves one for publishing.

## Create and tune drafts

- Use `node reel-factory/score.mjs <article-id>` to score one eligible article, or `node reel-factory/batch.mjs` to preview the top candidates. Review the preview before running `node reel-factory/batch.mjs --run`.
- Render an individual article with `node reel-factory/reel.mjs <article-id>`. Real-news articles are excluded unless the user asks to include them with `--include-real`.
- Generated article-specific artwork belongs at `.reel-output/artwork/<article-id>.png` (WebP/JPG/JPEG also work). Keep it local; do not edit published article image fields for a Reel. When asked to generate artwork, depict the headline/body in the Gazette's established fantasy-news satire style and avoid adding factual details absent from the article.
- Shared category artwork is acceptable for exploratory drafts. Before a Reel is marked ready or sent to the publishing workflow, generate a custom Gazette-style image for that article, save it to `.reel-output/artwork/<article-id>.png`, rerender, and confirm `metadata.json` points to that generated image and the rendered video visibly uses it. Do not publish a Reel that still uses category art or lacks custom artwork.
- Draft output is `.reel-output/drafts/<article-id>/`. Review `score.json`, `script.json`, `metadata.json`, and `render.mp4`. Scripts are editable and reused on reruns. Respect edits; only replace them with `--refresh-script` when the user requests a rebuild or edits to the source require it.
- Newly composed scripts rotate through the four signoffs in `reel-factory/templates/gazette-report.mjs` according to the number of existing scripts. Existing scripts keep their chosen signoff until refreshed. Keep narration grounded in the article headline, excerpt, or body; the branded signoff is the only non-article copy.
- Scripts and videos are human-review drafts. Do not mark metadata approved, publish, or post to Facebook without the user's explicit approval for the relevant Reel.

## Facebook publishing context

The existing `.github/workflows/facebook.yml` posts article links from `articles.json`; it is separate from Reel publishing. The repository has GitHub Actions secrets named `FB_PAGE_ID` and `FB_PAGE_TOKEN`. Never print, retrieve, or copy secret values into files or logs.

Reel publishing is a separate, manual operation through `.github/workflows/publish-facebook-reel.yml`; it never runs on article pushes. GitHub Actions cannot read `.reel-output` directly. After explicit approval of a specific Reel and confirmation that it has custom artwork, stage its MP4 temporarily as a public GitHub Release asset; do not add the video to the site's Git history. The workflow publishes the Page Reel using `FB_PAGE_ID` and `FB_PAGE_TOKEN`, uses a short description linking to the Gazette article plus relevant D&D/TTRPG and story-specific hashtags, checks Meta's processing/publishing status, and removes the temporary Release only after success. If a run fails or times out after Meta accepts the upload, check the Page before retrying to avoid duplicates. When maintaining the publisher, check Meta's current official Page Reels API docs because endpoints, permissions, and video requirements can change. Do not assume the Page ID/token secrets alone guarantee the required permissions.

## Repository references

- `reel-factory/README.md` — requirements, commands, outputs, and scoring behavior.
- `reel-factory/reel.mjs` — local rendering and script reuse.
- `reel-factory/templates/gazette-report.mjs` — narration selection and rotating signoffs.
- `.github/workflows/facebook.yml` and `.github/scripts/facebook-post.py` — existing article-link publisher, not Reel publishing.
