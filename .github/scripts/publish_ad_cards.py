"""Schedule approved weekly single-image cards on Facebook and publish them on Instagram when due.

Single-image sibling of publish_npc_carousels.py: it reuses that publisher's release state,
Facebook scheduling, and duplicate recovery, and swaps the carousel parts for one image.
Four series share it (CARD_SERIES): Ad of the Week (ad, the default), Map of the Week (map), Roll for It (roll),
and Loot Drop (loot).
"""
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from meta_page import get_page_context, graph_get, graph_post
from publish_npc_carousels import INSTAGRAM_WINDOW, PLATFORMS, UTC, Publisher, ReleaseStore, StateError, digest, iso, report, timestamp

MAX_POSTS = 5
# Each series: its queue ID prefix, staging Release tag prefix, queue config, and workflow file prefixes.
SERIES = {
    'ad': {'queue': 'ad-of-the-week', 'tag': 'ad-stage', 'config': 'ad-card-queue', 'workflow': 'publish-ad-cards'},
    'map': {'queue': 'map-of-the-week', 'tag': 'map-stage', 'config': 'map-card-queue', 'workflow': 'publish-map-cards'},
    'roll': {'queue': 'roll-for-it', 'tag': 'roll-stage', 'config': 'roll-card-queue', 'workflow': 'publish-roll-cards'},
    'loot': {'queue': 'loot-drop', 'tag': 'loot-stage', 'config': 'loot-card-queue', 'workflow': 'publish-loot-cards'},
}


def series_info(series):
    if series not in SERIES:
        raise RuntimeError('Unexpected card series.')
    return SERIES[series]


def batch_files(batch, series='ad'):
    info = series_info(series)
    if not re.fullmatch(r'month[0-9]{2}', batch or ''):
        raise RuntimeError('Unexpected card publishing batch.')
    return f"{info['config']}-{batch}.json", f"{info['workflow']}-{batch}.yml"


def validate_queue(queue):
    if queue.get('schemaVersion') != 1 or queue.get('approved') is not True:
        raise RuntimeError('The publishing queue must be explicitly approved.')
    if queue.get('timezone') != 'America/Chicago' or queue.get('expectedInstagramUsername') != 'beholdersgazette':
        raise RuntimeError('Unexpected queue time zone or Instagram destination.')
    if not re.fullmatch(r'(?:%s)-month[0-9]{2}' % '|'.join(info['queue'] for info in SERIES.values()), queue.get('id', '')):
        raise RuntimeError('Unexpected card queue ID.')
    entries = queue.get('entries', [])
    if not 1 <= len(entries) <= MAX_POSTS:
        raise RuntimeError(f'Expected one to {MAX_POSTS} approved ads.')
    ids, filenames = set(), set()
    previous = None
    for index, entry in enumerate(entries):
        identifier = entry.get('id', '')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', identifier) or identifier in ids:
            raise RuntimeError('Queue post IDs must be unique lowercase slugs.')
        ids.add(identifier)
        if entry.get('approved') is not True or entry.get('day') != index + 1:
            raise RuntimeError('Every queued ad must be approved and in order.')
        date = timestamp(entry['publishAt'])
        if previous is not None and date - previous != timedelta(days=7):
            raise RuntimeError('Ad dates must be exactly one week apart.')
        previous = date
        if len(entry.get('images', [])) != 1:
            raise RuntimeError('Each ad is exactly one card.')
        image = entry['images'][0]
        name = image.get('filename', '')
        if not re.fullmatch(r'[a-z0-9-]+\.jpg', name) or name != identifier + '.jpg' or name in filenames:
            raise RuntimeError('Ad image filenames must match their post IDs.')
        filenames.add(name)
        if not re.fullmatch(r'[a-f0-9]{64}', image.get('sha256', '')):
            raise RuntimeError('Every image requires its approved SHA-256.')
        if (image.get('width'), image.get('height')) != (1080, 1350) or not image.get('alt'):
            raise RuntimeError('Every card requires dimensions and alt text.')
        for platform in PLATFORMS:
            caption = entry.get('captions', {}).get(platform)
            if not isinstance(caption, str) or not caption.strip() or len(caption) > 2200:
                raise RuntimeError('Both approved platform captions are required.')
    return queue


class AdReleaseStore(ReleaseStore):
    def __init__(self, config, batch, series='ad'):
        self.batch = batch
        self.series = series
        info = series_info(series)
        self.repo = config.get('repository', '')
        self.tag = config.get('releaseTag', '')
        self.expected_hash = config.get('queueSha256', '')
        if self.repo != 'Oddmagician6/Beholders-Gazzete' or not re.fullmatch(re.escape(info['tag']) + r'-month[0-9]{2}-[0-9]{8}', self.tag):
            raise RuntimeError('Unexpected repository or staging release.')
        if not re.fullmatch(r'[a-f0-9]{64}', self.expected_hash):
            raise RuntimeError('The queue configuration needs its SHA-256.')
        if os.environ.get('GITHUB_REPOSITORY', self.repo) != self.repo:
            raise RuntimeError('This workflow is running in a different repository.')
        self.token = os.environ.get('GH_TOKEN', '')
        if not self.token:
            raise RuntimeError('GH_TOKEN is required to read and persist queue state.')
        self.release = self.github('GET', f'repos/{self.repo}/releases/tags/{self.tag}')
        if self.release.get('draft') or self.release.get('tag_name') != self.tag:
            raise RuntimeError('The staged release must be public and published.')
        self.assets = {asset['name']: asset for asset in self.release.get('assets', [])}
        queue_bytes = self.download('queue.json')
        if digest(queue_bytes) != self.expected_hash:
            raise RuntimeError('Staged queue does not match the approved configuration.')
        self.queue = validate_queue(json.loads(queue_bytes))
        if not self.queue['id'].startswith(info['queue'] + '-'):
            raise RuntimeError('The staged queue belongs to another card series.')
        self.state = json.loads(self.release.get('body') or '{}')
        if self.state.get('queueSha256') != self.expected_hash or not isinstance(self.state.get('entries'), dict):
            raise RuntimeError('Release state does not belong to this queue.')
        self.revision = self.state.get('revision', 0)

    def disable_workflow(self):
        _, workflow = batch_files(self.batch, self.series)
        self.github('PUT', f'repos/{self.repo}/actions/workflows/{workflow}/disable')


class AdPublisher(Publisher):
    # Facebook scheduling, recovery, arming, and run_due come from the carousel publisher;
    # its photo upload loop and attached_media list work unchanged for a single card.
    def __init__(self, queue, state, save, image_url, page, instagram_id, get=graph_get, post=graph_post, now=None, sleep=time.sleep):
        self.queue = validate_queue(queue)
        self.state = state
        self.save = save
        self.image_url = image_url
        self.page = page
        self.ig = instagram_id
        self.token = page['access_token']
        self.get = get
        self.post = post
        self.now = now or datetime.now(UTC)
        self.sleep = sleep

    def confirm_instagram(self, entry):
        slot = self.slot(entry, 'instagram')
        item = self.get(slot['mediaId'], {'fields':'id,caption,media_type,permalink'}, self.token)
        if item.get('caption', '').strip() != entry['captions']['instagram'].strip() or item.get('media_type') != 'IMAGE':
            raise RuntimeError('Instagram did not confirm the expected image and caption.')
        slot.update(phase='published', permalink=item.get('permalink'), confirmedAt=iso(self.now))
        self.save()

    def publish_instagram(self, entry):
        slot = self.slot(entry, 'instagram')
        if slot.get('mediaId'):
            self.confirm_instagram(entry)
            return
        existing = self.recover_instagram(entry)
        if existing:
            slot['mediaId'] = existing
            self.save()
            self.confirm_instagram(entry)
            return
        if slot['phase'] in ('publishing', 'needs_review'):
            slot['phase'] = 'needs_review'
            self.save()
            raise RuntimeError('Instagram publication is ambiguous. Inspect the account before any retry.')
        if not slot.get('containerId'):
            image = entry['images'][0]
            item = self.post(f'{self.ig}/media', {'image_url':self.image_url(image['filename']), 'caption':entry['captions']['instagram'], 'alt_text':image['alt']}, self.token)
            if not item.get('id'):
                raise RuntimeError('Instagram did not return an image container ID.')
            slot['containerId'] = str(item['id'])
            self.save()
        self.wait_for_container(slot['containerId'])
        slot['phase'] = 'publishing'
        self.save()  # Persist before the non-idempotent publish call.
        item = self.post(f'{self.ig}/media_publish', {'creation_id':slot['containerId']}, self.token)
        if not item.get('id'):
            raise RuntimeError('Instagram returned no media ID. Inspect the account before retrying.')
        slot['mediaId'] = str(item['id'])
        self.save()
        self.confirm_instagram(entry)
        print(f"Ad {entry['day']}: Instagram confirmed publication.")


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--validate-queue':
        queue = validate_queue(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')))
        print(f"Validated {len(queue['entries'])} approved ads without network or publishing.")
        return
    if len(sys.argv) > 1:
        raise RuntimeError('Usage: publish_ad_cards.py [--validate-queue queue.json]')
    batch = os.environ.get('AD_BATCH', '')
    series = os.environ.get('CARD_SERIES', 'ad')
    config_name, _ = batch_files(batch, series)
    config = json.loads((Path(__file__).resolve().parents[1] / config_name).read_text(encoding='utf-8'))
    if config.get('enabled') is not True:
        print('Ad publishing is disabled.')
        return
    store = AdReleaseStore(config, batch, series)
    operation = os.environ.get('OPERATION', 'verify')
    if operation not in ('verify', 'arm', 'run_due'):
        raise RuntimeError('Unknown publisher operation.')
    now = datetime.now(UTC)
    if operation == 'run_due' and now > timestamp(store.queue['entries'][-1]['publishAt']) + INSTAGRAM_WINDOW:
        report(store)
        store.disable_workflow()
        print('Approved publishing window ended; scheduled workflow disabled. Inspect the report for any unconfirmed posts.')
        return
    if operation == 'run_due' and not any(timestamp(e['publishAt']) <= now <= timestamp(e['publishAt']) + INSTAGRAM_WINDOW for e in store.queue['entries']):
        report(store)
        print('No ad is due in this window; no Meta requests needed.')
        return
    page_id = os.environ.get('FB_PAGE_ID', '').strip()
    user_token = os.environ.get('FB_PAGE_TOKEN', '').strip()
    if not re.fullmatch(r'[0-9]+', page_id) or not user_token:
        raise RuntimeError('The existing Facebook Page secrets must be configured.')
    page = get_page_context(page_id, user_token)
    ig_id = str((page.get('instagram_business_account') or {}).get('id', ''))
    if not ig_id:
        raise RuntimeError('The Facebook Page has no linked Instagram professional account.')
    profile = graph_get(ig_id, {'fields':'id,username'}, page['access_token'])
    if profile.get('username', '').lower() != store.queue['expectedInstagramUsername']:
        raise RuntimeError('The connected Instagram account differs from the approved destination.')
    publisher = AdPublisher(store.queue, store.state, store.save, store.url, page, ig_id, now=now)
    try:
        store.verify_images(store.queue['entries'] if operation in ('verify', 'arm') else publisher.due())
        if operation == 'verify':
            print(f"Verified the approved queue, all {len(store.queue['entries'])} public JPEGs, and the connected Instagram destination. No posts were created.")
        elif operation == 'arm':
            publisher.arm()
        else:
            publisher.run_due()
        report(store)
        completed = all(store.state.get('entries', {}).get(entry['id'], {}).get(platform, {}).get('phase') == 'published' for entry in store.queue['entries'] for platform in PLATFORMS)
        if completed and operation == 'run_due':
            store.disable_workflow()
            print(f"All {len(store.queue['entries']) * 2} publications confirmed; scheduled workflow disabled.")
    except Exception as error:
        detail = str(error).replace(user_token, '[redacted]').replace(page['access_token'], '[redacted]')
        report(store, detail)
        raise RuntimeError(detail) from None


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError, StateError) as error:
        detail = str(error)
        for key in ('FB_PAGE_TOKEN', 'GH_TOKEN'):
            if os.environ.get(key):
                detail = detail.replace(os.environ[key], '[redacted]')
        print('Ad card publisher: ' + detail, file=sys.stderr)
        sys.exit(1)
