# Approved NPC carousel publishing

The owner approved the first seven reviewed posts for Facebook and Instagram, one per day starting November 2, 2026. The prepared dates are November 2-8 at 09:00 America/Chicago. The connected Instagram account is `beholdersgazette`; staging corrects the approved captions' self-mention from `@thebeholdersgazette` and records that adjustment. Other copy is unchanged.

The publisher runs ordinary Python in GitHub Actions. It does not call an image model, text model, Codex, or Claude, and does not need the owner's PC online. The existing article and Reel publishers are separate.

## Files and storage

- `.github/workflows/publish-npc-carousels.yml`: manual verification/arming and daily scheduled checks at 09:00 and 09:30 America/Chicago.
- `.github/scripts/publish_npc_carousels.py`: publication, verification, and recovery.
- `.github/scripts/test_npc_carousels.py`: behavior tests using a fake Meta service.
- `.github/npc-carousel-queue.json`: the approved release tag and queue SHA-256.
- `stage-publishing.mjs`: local first-week exporter. It verifies the reviewed package checksums and creates 21 high-quality JPEGs, an approved dated queue, and initial release state under `.poi-output/publishing/poi-stage-week01-20261102/`. Rendering text and artwork are unchanged by JPEG conversion.

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

GitHub scheduled jobs can be delayed. The intended time is 09:00, with a 09:30 follow-up check; this is not a guarantee of publication at exactly 09:00:00. Late Instagram publication is limited to four hours after its approved time. The workflow disables itself after all 14 publications are confirmed, or on the first run after the final four-hour window. An expired queue is not silently backfilled.

## Recovery and future batches

The workflow uses a single concurrency group. It persists each photo/container ID, and persists a submission phase before a non-idempotent final post call. An interrupted final call is reconciled against Meta before retrying. If a matching post cannot be confirmed, that platform stops for manual inspection rather than risking a duplicate. A successful platform is not reposted because the other platform failed.

State is saved atomically through a Release-description update, with a revision check. If state cannot be persisted, publishing stops. The job report is also uploaded as a GitHub Actions artifact and written to the run summary. Never reset Release state as a retry strategy.

For an ordinary retry, dispatch `operation=run_due`. Respect any `needs_review` or ambiguous-submission error: inspect the destination account and existing IDs before deciding whether a new submission is safe. Do not blindly rerun a fresh queue or create another release for the same seven posts.

After automatic shutdown, a future approved queue requires a new staged release/config and `gh workflow enable publish-npc-carousels.yml`. Prepare its dates and captions explicitly, then verify and arm it. The first-week exporter currently has the approved November 2-8 dates; revise it deliberately for a new batch. Nothing in this workflow authorizes later NPCs, ads, Stories, or additional daily posts.

No site exporters are needed. The local review gallery is not a live schedule ledger; the GitHub run report and Release state are authoritative for publishing.

API references: [Meta Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/), [Meta Page photos](https://developers.facebook.com/docs/graph-api/reference/page/photos/), [Meta Page feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/), and [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Meta's reference pages returned rate limits during implementation; live preflight and schedule confirmation are required before claiming activation.
