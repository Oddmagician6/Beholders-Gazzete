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

Reel publishing is a separate, manual operation through `.github/workflows/publish-facebook-reel.yml`; it never runs on article pushes. GitHub Actions cannot read `.reel-output` directly. Do not publish without explicit user approval for the specific render and confirmation that it uses custom article-specific artwork. Never add the MP4 to the site's Git history. The repository is `Oddmagician6/Beholders-Gazzete`, and its Actions secrets are already configured.

### Publish one approved Reel

1. Check the selected draft's `metadata.json`, `script.json`, score report, and `render.mp4`. Confirm it is the intended article, is not marked real, and uses `.reel-output/artwork/<article-id>.png`; visually inspect the artwork/render. Pick up to four story hashtags drawn from the article itself (its creatures, places, or events, e.g. `#MooseRescue #SkatePark`), show them with the Reel, and save them in `metadata.json` `hashtags`. Get explicit user approval before publishing. Approval for another Reel does not carry over.
2. Confirm `main` has `.github/workflows/publish-facebook-reel.yml` and `.github/scripts/publish_facebook_reel.py`. If these files need to be added or changed, stage only them and relevant skill/docs files; leave unrelated working-tree edits out. Push the workflow to `main` before dispatching it.
3. Stage the approved `render.mp4` as a temporary public GitHub Release asset. Use a unique lowercase tag matching `reel-stage-[a-z0-9-]+`. The asset's actual filename must be `render.mp4`: `gh release create`'s `file#label` changes only the displayed label and does not rename the downloadable file. The Action downloads `render.mp4` from the Release URL. Example PowerShell commands from the repository root:

   ```powershell
   # Replace this with the ID of the Reel the user approved.
   $articleId = 'bull-moose-skate-park-five-hours-wardens-sleep'
   $hashtags = '#MooseRescue #SkatePark'
   $releaseTag = "reel-stage-$($articleId)-$(Get-Date -Format yyyyMMdd-HHmmss)"
   $video = ".reel-output\drafts\$articleId\render.mp4"
   gh release create $releaseTag $video --repo Oddmagician6/Beholders-Gazzete --title 'Temporary Reel staging' --notes 'Temporary approved Reel asset; the publish Action removes this Release after Facebook confirms publication.' --target main
   gh workflow run publish-facebook-reel.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f article_id=$articleId -f release_tag=$releaseTag -f custom_artwork_confirmed=true -f hashtags=$hashtags
   ```

4. Monitor the run with `gh run list --workflow publish-facebook-reel.yml --limit 1 --json databaseId,status,conclusion,url`, then `gh run watch <databaseId> --repo Oddmagician6/Beholders-Gazzete --exit-status --interval 15`. On success, inspect `gh run view <databaseId> --repo Oddmagician6/Beholders-Gazzete --log` for `Facebook confirmed publication` and the returned Reel video ID. The Action removes the temporary Release only after this confirmation.
5. After confirmed success, update the local ignored `.reel-output/drafts/<article-id>/metadata.json`: set `approved` and `published` to `true`, and record `publishedAt` in UTC and `facebookVideoId`. If the Action fails before its Facebook upload step begins, fix the cause and retry. If it fails or times out after Meta may have accepted the upload, check the log and Facebook Page before retrying; do not blindly retry, since that may create a duplicate.

The Action publishes a Facebook Page Reel with a description linking to `https://gazette.ashforgestudio.com/a/<article-id>` plus four standard tags (`#DnD #DungeonsAndDragons #TTRPG #FantasyHumor`) and the story hashtags passed in the `hashtags` input (letters, numbers, and underscores; eight tags in all at most). With no `hashtags` input, it posts only the standard four. It reads `FB_PAGE_ID` and `FB_PAGE_TOKEN` from Actions secrets and does not expose them. It rejects real-news articles, requires the custom-artwork confirmation input, polls Meta for publication status, and deletes the temporary Release only after confirmed success. Configured secrets alone do not guarantee valid Meta permissions. When changing the publisher or diagnosing API failures, check Meta's current official Page Reels API documentation because endpoints, permissions, and video requirements can change.

## Repository references

- `reel-factory/README.md` — requirements, commands, outputs, and scoring behavior.
- `reel-factory/reel.mjs` — local rendering and script reuse.
- `reel-factory/templates/gazette-report.mjs` — narration selection and rotating signoffs.
- `.github/workflows/facebook.yml` and `.github/scripts/facebook-post.py` — existing article-link publisher, not Reel publishing.
