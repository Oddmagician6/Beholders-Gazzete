# Map of the Week

A seeded continent from the site's own Continent Map Generator (`fantasy-map-generator`), framed as a 1080 x 1350 social card with one of its sites as a question. Local drafts only: rendering never publishes or schedules anything.

## Files

- `frames/map.png`: the explorer's-table frame (GPT-painted, 1086 x 1448). The card scales it to 1350 tall and fills the sides with dark brown. Slot boxes are in `card.html`, in the frame's own pixels; check them with `--debug`.
- `card.html`: the card. It loads the real generator page in a hidden frame with the map's seed, so the map, names, and hook are exactly what a reader gets from the same link. It draws the 🎨 Illustrated style, cropped to fill the window.
- `maps.json`: the map bank. Fonts come from `ad-of-the-week/fonts/`.

## A map

`id`, `seed` (the generator's seed, default options), `poi` (which of its sites the card features, from 0), `expect` (`name` and `site`: what the seed made when picked; the render fails if a generator change has moved them, so re-pick), `question` (the caption's comment prompt), optional `prompt` (the small line under the hook; default "Where would your party start?"), optional `social: { facebook, instagram }` to replace the generated captions, `status`, and `week`.

## Commands

```
node map-of-the-week/map.mjs roll [count]     # random seeds with every site and hook, for picking
node map-of-the-week/map.mjs check
node map-of-the-week/map.mjs list
node map-of-the-week/map.mjs render <map-id> | --all [--debug]
```

`map.mjs` serves the repo on a random localhost port itself (serve.py need not run) and drives headless Chrome. `render` writes `.map-output/<id>/` (card.png, both captions, alt text, map.json with the facts) and `.map-output/review.html`. It fails if any text overflows its box; pick a site with a shorter name or hook. Large continents (36 towns) have small labels on a phone; medium and small read best.

## Publishing

Approved maps post Fridays at 12:00 America/Chicago through `.github/scripts/publish_ad_cards.py` with `CARD_SERIES: map` (Ad of the Week's publisher; same Release-state, verify/arm/run_due, and duplicate-recovery rules, see `persons-of-interest/PUBLISHING.md`). Each month is its own batch: `.github/map-card-queue-monthNN.json`, a `publish-map-cards-monthNN.yml` workflow, and a `map-stage-monthNN-<start>` Release with the JPEGs and `queue.json`. Facebook schedules at most 29 days ahead, so arm a batch within 29 days of its last post.

```
node map-of-the-week/stage-publishing.mjs --month=02 --start=YYYY-MM-DD --maps=id1,id2,id3,id4   # FFMPEG_PATH if ffmpeg isn't on PATH
py .github/scripts/publish_ad_cards.py --validate-queue .map-output/publishing/<tag>/queue.json
gh release create <tag> --target main --latest=false --notes-file .map-output/publishing/<tag>/release-notes.json <the JPEGs and queue.json>
# copy the month01 workflow as monthNN (AD_BATCH: monthNN), commit and push it with its config, then:
gh workflow run publish-map-cards-monthNN.yml -f operation=verify   # then operation=arm
```

Month 1 (approved and armed November 5, 2026): The Valreth Reach / The Black Peak Nov 13, Arorund / The Arania Mine Nov 20, The Sarorford Reach / Belois's Dance Nov 27, The Roseford Expanse / The Smoking Brazier Dec 4. Record: `.map-output/publishing/activation-month01.json`. Never recreate a Release's state after arming.
