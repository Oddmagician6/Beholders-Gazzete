# Approved NPC carousel publishing

The owner approved the first seven reviewed posts for Facebook and Instagram, one per day starting November 2, 2026. The prepared dates are November 2-8 at 09:00 America/Chicago. The connected Instagram account is `beholdersgazette`; staging corrects the approved captions' self-mention from `@thebeholdersgazette` and records that adjustment. Other copy is unchanged.

The publisher runs ordinary Python in GitHub Actions. It does not call an image model, text model, Codex, or Claude, and does not need the owner's PC online. The existing article and Reel publishers are separate.

## Second approved batch

The owner approved the reviewed days 8-14 and chose November 9-15, 2026 at 09:00 America/Chicago, keeping one NPC per day after Noll on November 8. The order is Sella, Clack, Iria, Auntie Hush, Dorrin, Tuppence, and Ottoline. The approval was given on November 2. Confirm activation separately before describing this batch as scheduled.

Week 2 uses `.github/workflows/publish-npc-carousels-week02.yml`, `.github/npc-carousel-queue-week02.json`, and the `poi-stage-week02-20261109` Release. The workflow sets `NPC_BATCH=week02` and reuses the tested Python publisher. Its state and automatic shutdown are independent of week 1. Both workflows share the concurrency group, so they cannot submit simultaneously. Before a batch's first date, scheduled checks read its durable state and make no Meta requests.

```powershell
node persons-of-interest/stage-publishing.mjs --week=2 --start=2026-11-09
py .github/scripts/publish_npc_carousels.py --validate-queue .poi-output/publishing/poi-stage-week02-20261109/queue.json
gh workflow run publish-npc-carousels-week02.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=verify
# After successful verification:
gh workflow run publish-npc-carousels-week02.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=arm
```

Use the existing Release when retrying; never recreate its initial state. Do not run the staging exporter over an activated batch. The reviewed gallery remains the historical draft snapshot; save approval and activation evidence under `.poi-output/publishing/`.

## Third approved batch

The owner approved the finished days 15-21 and requested the same daily schedule after week 2: November 16-22, 2026 at 09:00 America/Chicago. The order is Osric Pennywake, Lenna Fairweather, Siv Mossfoot, Sir Patch, Edra Sootfall, Fenrick Vale, and Mina Turnwheel. Confirm activation before describing the batch as scheduled.

Week 3 uses `.github/workflows/publish-npc-carousels-week03.yml`, `.github/npc-carousel-queue-week03.json`, and the `poi-stage-week03-20261116` Release. `NPC_BATCH=week03` selects its independent state and shutdown while retaining the shared publication concurrency group and the same November UTC retry times.

```powershell
node persons-of-interest/stage-publishing.mjs --week=3 --start=2026-11-16
py .github/scripts/publish_npc_carousels.py --validate-queue .poi-output/publishing/poi-stage-week03-20261116/queue.json
gh workflow run publish-npc-carousels-week03.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=verify
# After successful verification:
gh workflow run publish-npc-carousels-week03.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=arm
```

Keep the initial Release state intact after activation. `.poi-output/publishing/activation-week03.json` records confirmed activation; rendering or staging alone is not activation.

## Final nine approved posts

The owner approved the finished days 22-30 and requested the continuing daily Facebook/Instagram schedule at 09:00 America/Chicago. Week 4 runs November 23-29, 2026: Old Oat, Gilly Brinewool, Pell Underbough, Rusk, Ione Glassfin, Sister Beryl, and Garran Softstep. Week 5 contains Wren Knott on November 30 and Sable Quill on December 1.

The batches use their own `publish-npc-carousels-week04.yml` / `week05.yml` workflows, matching queue configs, and `poi-stage-week04-20261123` / `poi-stage-week05-20261130` Releases. They share the existing publication concurrency group. Only queue ID `persons-of-interest-week05` may contain two posts, and those must be source days 29 and 30. All other queues still require seven posts. Each workflow shuts down independently after completion or expiry.

```powershell
node persons-of-interest/stage-publishing.mjs --week=4 --start=2026-11-23
node persons-of-interest/stage-publishing.mjs --week=5 --start=2026-11-30
```

Verify and arm each batch separately using its workflow. Save confirmed activation as `.poi-output/publishing/activation-week04.json` and `activation-week05.json`. Never recreate Release state after activation.

## Files and storage

- `.github/workflows/publish-npc-carousels.yml` and batch workflows: manual verification/arming and scheduled UTC checks every half hour from 09:07 through 20:37 America/Chicago during these CST dates.
- `.github/scripts/publish_npc_carousels.py`: publication, verification, and recovery.
- `.github/scripts/test_npc_carousels.py`: behavior tests using a fake Meta service.
- `.github/npc-carousel-queue.json`: the approved release tag and queue SHA-256.
- `stage-publishing.mjs`: local exporter accepting an explicit week and start date. It verifies the reviewed package checksums and creates three high-quality JPEGs per post, an approved dated queue, and initial release state under `.poi-output/publishing/<release-tag>/`. Weeks 1-4 have seven posts; week 5 has two. Rendering text and artwork are unchanged by JPEG conversion. Its default remains the original first-week package; later weeks write separate queue configs.

Staged JPEGs and `queue.json` are public GitHub Release assets, rather than files in site Git history. The Release description contains a JSON state record. Keep the Release and its description intact until every post is verified: future Instagram publications still need the public images, and retries depend on this state. No secret values belong in either the assets or state.

GitHub Actions reads only the already configured `FB_PAGE_ID` and `FB_PAGE_TOKEN` secrets. The shared `meta_page.py` resolves the Page token internally, as it does for Reels. `GH_TOKEN` is the short-lived Actions token, used to persist Release state and disable this scheduled workflow when its finite queue is complete or expired. `contents: write` is required for state; `actions: write` is used only for that automatic shutdown.

## Activation

Repository policy requires owner authorization before committing or pushing. Leave unrelated working-tree changes out of the publisher commit.

1. Run the local exporter and tests:

   ```powershell
   node persons-of-interest/stage-publishing.mjs
   py -m unittest discover -s .github/scripts -p test_npc_carousels.py -v
   py .github/scripts/publish_npc_carousels.py --validate-queue .poi-output/publishing/poi-stage-week01-20261102/queue.json
   ```

2. Create the public `poi-stage-week01-20261102` Release with exactly the 21 JPEGs and `queue.json`. Use `release-notes.json` as its initial description. Check for an existing tag first; never replace an existing state record with a fresh one. Do not upload the PNG originals, local profiles, or unrelated files.
3. After owner authorization, commit/push only the carousel workflow, publisher, tests, queue config, and relevant preparation/docs files to `main`. The schedule cannot run from an unpushed working tree.
4. Dispatch a read-only preflight:

   ```powershell
   gh workflow run publish-npc-carousels.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=verify
   ```

   Confirm success. It checks the approved queue hash, all 21 public JPEG hashes/dimensions, and the connected Instagram username. It creates no Meta media containers or posts. A successful preflight confirms access and assets, not future publication.

5. Dispatch `operation=arm`. This uploads unpublished Facebook photos, schedules the seven Facebook feed posts, verifies each returned schedule, and arms the dated Instagram queue. Instagram containers are created on the due date, avoiding advance-container expiry.
6. Confirm the run succeeded and inspect its publishing report. Facebook should show seven confirmed native schedules. Instagram is queued in Actions, not natively scheduled through its API. Mark local records queued only after this confirmation; do not mark them published before Meta confirms publication.

GitHub scheduled jobs can be delayed or dropped. The intended time is 09:00, with checks from 09:07 through 20:37; this is not a guarantee of publication at exactly 09:00:00. The existing publisher allows late Instagram publication up to twelve hours after its approved time. The workflow disables itself after all publications are confirmed, or on the first run after the final twelve-hour window. An expired queue is not silently backfilled. The current explicit UTC cron hours apply to these November/December CST dates; recalculate them for a future queue in daylight saving time.

On November 2, Facebook published Mabel natively, but GitHub had recorded no scheduled NPC run and Instagram remained queued. A manual `run_due` recovered the approved carousel successfully in run `41474328950`, confirming both platforms and recording Instagram media `18173978695477961`. The missing scheduled event's cause was not established. Both batch schedules were changed from the timezone-based trigger to explicit UTC triggers with additional retries; duplicate protection remains in the existing publisher. A successful manual run proves publishing works, not that a future GitHub cron event will fire. Check the next scheduled run to confirm that separately.

## Recovery and future batches

The workflow uses a single concurrency group. It persists each photo/container ID, and persists a submission phase before a non-idempotent final post call. An interrupted final call is reconciled against Meta before retrying. If a matching post cannot be confirmed, that platform stops for manual inspection rather than risking a duplicate. A successful platform is not reposted because the other platform failed.

State is saved atomically through a Release-description update, with a revision check. If state cannot be persisted, publishing stops. The job report is also uploaded as a GitHub Actions artifact and written to the run summary. Never reset Release state as a retry strategy.

For an ordinary retry, dispatch `operation=run_due`. Respect any `needs_review` or ambiguous-submission error: inspect the destination account and existing IDs before deciding whether a new submission is safe. Do not blindly rerun a fresh queue or create another release for the same seven posts.

After automatic shutdown, a future approved queue requires its own staged release/config and enabled batch workflow. Prepare its dates and captions explicitly, then verify and arm it. Never replace the first-week config while that batch is active. `NPC_BATCH` accepts only `week02` through `week05`; an empty value retains the original workflow/config. Each workflow disables only itself. Nothing in this workflow authorizes later NPCs, ads, Stories, or additional daily posts.

No site exporters are needed. The local review gallery is not a live schedule ledger; the GitHub run report and Release state are authoritative for publishing.

API references: [Meta Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/), [Meta Page photos](https://developers.facebook.com/docs/graph-api/reference/page/photos/), [Meta Page feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/), and [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Meta's reference pages returned rate limits during implementation; live preflight and schedule confirmation are required before claiming activation.

## Batch 2: days 31-60 (December 2026)

On November 13, 2026 the owner asked to stage batch 2 (`.poi-output/batches/month-02/complete-batch`) on the same daily 09:00 America/Chicago schedule, continuing after Sable Quill on December 1. It runs as five more weekly batches, `week06`-`week10`, each with its own workflow, queue config, and Release:

| Batch | Dates | Days | Release | Arm window (29-day limit, before first post) |
|---|---|---|---|---|
| week06 | Dec 2-8 | 31-37 | `poi-stage-week06-20261202` | now - Dec 2 08:50 |
| week07 | Dec 9-15 | 38-44 | `poi-stage-week07-20261209` | Nov 16 - Dec 9 08:50 |
| week08 | Dec 16-22 | 45-51 | `poi-stage-week08-20261216` | Nov 23 - Dec 16 08:50 |
| week09 | Dec 23-29 | 52-58 | `poi-stage-week09-20261223` | Nov 30 - Dec 23 08:50 |
| week10 | Dec 30-31 | 59-60 | `poi-stage-week10-20261230` | Dec 2 09:00 - Dec 30 08:50 |

`week10` is batch 2's two-post final week; the publisher accepts a two-post queue only as `week05` (days 29-30) or `week10` (days 59-60). `stage-publishing.mjs --week=6..10` reads the complete batch-2 package and checks its reviewed checksums.

```powershell
node persons-of-interest/stage-publishing.mjs --week=6 --start=2026-12-02   # and 7/12-09, 8/12-16, 9/12-23, 10/12-30
gh release create poi-stage-week06-20261202 --target main --prerelease --notes-file .poi-output/publishing/poi-stage-week06-20261202/release-notes.json <21 jpgs> queue.json
gh workflow run publish-npc-carousels-week06.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=verify
gh workflow run publish-npc-carousels-week06.yml --repo Oddmagician6/Beholders-Gazzete --ref main -f operation=arm
```

Save confirmed activation as `.poi-output/publishing/activation-week06.json` through `activation-week10.json`.
