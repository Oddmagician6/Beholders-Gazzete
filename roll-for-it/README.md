# Roll for It

A d6 or d20 roll table as a 1080 x 1350 social card; readers comment their roll. Rendering never publishes anything; approved tables post through the shared card publisher (below).

## Files

- `tables.json`: the table bank. Original Gazette text only (never paste SRD text). `die` is 6 or 20 and `rows` must have exactly that many entries.
- `frames/table.png`: the blank painted frame (1122 x 1402; no words anywhere). Its three panel boxes are `FRAME` in `roll.mjs`; check them with `--debug`.
- `stage-publishing.mjs`: stages approved, rendered tables for the publisher.
- `roll.mjs`: validates the bank and renders cards with headless Chrome. Fonts come from `ad-of-the-week/fonts/`.

## A table

`id`, `status`, `die`, `title` (one line, up to 34 characters), `kicker`, `rows` (up to 70 characters each for a d6, 52 for a d20), and `question` (the caption's comment prompt).

## Commands

```
node roll-for-it/roll.mjs check
node roll-for-it/roll.mjs list
node roll-for-it/roll.mjs render <table-id> | --all [--debug]
```

`render` writes `.roll-output/<id>/` (card.png, both captions, alt text) and `.roll-output/review.html`. It fails if any copy doesn't fit; shorten that part.

## Publishing

Approved tables post Mondays at 12:00 America/Chicago through `.github/scripts/publish_ad_cards.py` with `CARD_SERIES: roll` (the Ad of the Week publisher; same Release-state, verify/arm/run_due, and duplicate-recovery rules, see `persons-of-interest/PUBLISHING.md`). Each month is its own batch: `.github/roll-card-queue-monthNN.json`, a `publish-roll-cards-monthNN.yml` workflow, and a `roll-stage-monthNN-<start>` Release with the JPEGs and `queue.json`. Facebook schedules at most 29 days ahead, so arm a batch within 29 days of its last post.

```
node roll-for-it/stage-publishing.mjs --month=02 --start=YYYY-MM-DD --tables=id1,id2,id3,id4   # FFMPEG_PATH if ffmpeg isn't on PATH
py .github/scripts/publish_ad_cards.py --validate-queue .roll-output/publishing/<tag>/queue.json
gh release create <tag> --target main --latest=false --notes-file .roll-output/publishing/<tag>/release-notes.json <the JPEGs and queue.json>
# copy the month01 workflow as monthNN (AD_BATCH: monthNN), commit and push it with its config, then:
gh workflow run publish-roll-cards-monthNN.yml -f operation=verify   # then operation=arm
```

Month 1 (armed November 5, 2026): Goblin's Pocket Nov 9, Notice Board Nov 16, Locked Door Nov 23, Corner Booth Nov 30. Record: `.roll-output/publishing/activation-month01.json`. Never recreate a Release's state after arming.
