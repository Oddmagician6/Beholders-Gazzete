# Loot Drop

A seeded shop from the site's own Merchant's Row (`shop`) with three items off its shelves, as a 1080 x 1350 social card: "Which one does your rogue steal?" Local drafts only: rendering never publishes or schedules anything. Planned slot: Thursdays.

## Files

- `card.html`: the card. It loads the real shop page in a hidden frame with the shop's seed, so the name, keeper, greeting, stock, and sale are what a reader gets from the same link. The picture is the shop type's own art (`img/shop/<type>.webp`). Plain CSS for now (no painted frame).
- `shops.json`: the shop bank. Fonts come from `ad-of-the-week/fonts/`.

## A shop

`id`, `seed` (Merchant's Row seed, random type and wealth), `items` (three item IDs from its stock), `expect` (`name`: the shop's name when picked; the render fails if a generator change has moved it, so re-pick), `question` (the card's big line and the caption's comment prompt, up to 60 characters), `date` (posting day: prices are the Market Exchange's at noon Chicago that day; without it, the moment of rendering), optional `prompt` (the small line under the question), optional `social: { facebook, instagram }` to replace the generated captions, `status`, and `week`.

## Commands

```
node loot-drop/loot.mjs roll [count]     # random shops with their whole stock, for picking
node loot-drop/loot.mjs check
node loot-drop/loot.mjs list
node loot-drop/loot.mjs render <shop-id> | --all [--debug]
```

`loot.mjs` serves the repo on a random localhost port itself and drives headless Chrome. `render` writes `.loot-output/<id>/` (card.png, both captions, alt text, shop.json with the facts) and `.loot-output/review.html`. It fails if an item isn't in the shop's stock (and lists what is) or if text overflows its box.

## Publishing

Approved shops post Thursdays at 12:00 America/Chicago through `.github/scripts/publish_ad_cards.py` with `CARD_SERIES: loot` (the Ad of the Week publisher; same Release-state, verify/arm/run_due, and duplicate-recovery rules, see `persons-of-interest/PUBLISHING.md`). Each month is its own batch: `.github/loot-card-queue-monthNN.json`, a `publish-loot-cards-monthNN.yml` workflow, and a `loot-stage-monthNN-<start>` Release with the JPEGs and `queue.json`. A shop's `date` must be the Thursday it posts (staging checks), since its prices are that day's. Facebook schedules at most 29 days ahead, so arm a batch within 29 days of its last post.

```
node loot-drop/stage-publishing.mjs --month=02 --start=YYYY-MM-DD --shops=id1,id2,id3,id4   # FFMPEG_PATH if ffmpeg isn't on PATH
py .github/scripts/publish_ad_cards.py --validate-queue .loot-output/publishing/<tag>/queue.json
gh release create <tag> --target main --latest=false --notes-file .loot-output/publishing/<tag>/release-notes.json <the JPEGs and queue.json>
# copy the month01 workflow as monthNN (AD_BATCH: monthNN), commit and push it with its config, then:
gh workflow run publish-loot-cards-monthNN.yml -f operation=verify   # then operation=arm
```

Month 1 (approved November 5, 2026): The Sunken Crucible Nov 12, Coin & Candle Emporium Nov 19, Stirrup & Warhorse Nov 26, Donella's Treasures Dec 3. Spare for month 2: `gross-margins` (re-date and re-render it first). Never recreate a Release's state after arming.
