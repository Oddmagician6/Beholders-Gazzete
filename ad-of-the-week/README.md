# Ad of the Week

In-world newspaper ads as 1080 x 1350 social cards. Local drafts only: rendering never publishes or schedules anything.

## Files

- `frames/`: the three blank frames (`outfitter` for gear and services, `royal` for posh or official notices, `tavern` for food and drink). Source images are 1092 x 1440; the card scales them to 1350 tall and fills the sides with the frame's `edge` color.
- `frames.json`: where each text slot sits on each frame, in the frame's own pixels. A new frame needs a PNG here and an entry there; check it with `--debug`.
- `ads.json`: the ad bank. Every business comes from `newsroom/lore.json` or is invented for the ad; nothing stands for anything real.
- `fonts/`: Cinzel and IM Fell English (OFL), the site's display and body faces, kept local so rendering works offline.

## An ad

`id`, `frame`, `business` (ribbon), `kicker` (one line under "Paid Advertisement"), `art` (a path under `img/`, usually `woodcut/*.webp`) and `artAlt`, `headline`, `pitch` (1 to 3 single lines), `tagline`, `finePrint`, `price` and optional `priceNote`, and `question` (the caption's comment prompt). An optional `social: { facebook, instagram }` replaces the generated captions. `ad.mjs` enforces the length limits.

## Commands

```
node ad-of-the-week/ad.mjs check
node ad-of-the-week/ad.mjs list
node ad-of-the-week/ad.mjs render <ad-id> | --all [--debug]
```

`render` writes `.ad-output/<id>/` (card.png, both captions, alt text) and `.ad-output/review.html`. It fails if any copy doesn't fit its box; shorten that part. `--debug` writes `card-debug.png` with the slots outlined.

## Publishing

Approved ads post weekly at 12:00 America/Chicago through `.github/scripts/publish_ad_cards.py`, the single-image sibling of the NPC carousel publisher (same Release-state, verify/arm/run_due, and duplicate-recovery rules; see `persons-of-interest/PUBLISHING.md`). Each month is its own batch: a `.github/ad-card-queue-monthNN.json` config, a `publish-ad-cards-monthNN.yml` workflow, and an `ad-stage-monthNN-<start>` Release with the JPEGs and `queue.json`. Facebook can only schedule 29 days ahead, so a batch holds at most four or five weeks.

```
node ad-of-the-week/stage-publishing.mjs --month=02 --start=YYYY-MM-DD --ads=id1,id2,id3,id4
py .github/scripts/publish_ad_cards.py --validate-queue .ad-output/publishing/<tag>/queue.json
gh release create <tag> --target main --latest=false --notes-file .ad-output/publishing/<tag>/release-notes.json <the JPEGs and queue.json>
# copy the month01 workflow as monthNN (AD_BATCH: monthNN), commit and push it with its config, then:
gh workflow run publish-ad-cards-monthNN.yml -f operation=verify   # then operation=arm
```

Month 1 (armed November 5, 2026): Pettibone & Vail Nov 11, Vaultmere Nov 18, Sleeping Mule Nov 25, Hootline Dec 2. Record: `.ad-output/publishing/activation-month01.json`. Lumenwick is approved and rendered, held for month 2. Never recreate a Release's state after arming.
