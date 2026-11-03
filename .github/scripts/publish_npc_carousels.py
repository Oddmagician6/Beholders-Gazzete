"""Schedule approved Facebook carousels and publish due Instagram carousels."""
import copy
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from meta_page import get_page_context, graph_get, graph_post

UTC = timezone.utc
PLATFORMS = ('facebook', 'instagram')
# GitHub often starts scheduled runs hours late; a wide window lets a late run still post.
INSTAGRAM_WINDOW = timedelta(hours=12)


class StateError(RuntimeError):
    pass


def batch_files(batch=''):
    if batch and not re.fullmatch(r'week0[2-5]', batch):
        raise RuntimeError('Unexpected NPC publishing batch.')
    suffix = '-' + batch if batch else ''
    return 'npc-carousel-queue' + suffix + '.json', 'publish-npc-carousels' + suffix + '.yml'


def timestamp(value):
    if value is None or isinstance(value, bool):
        raise RuntimeError('A publishing timestamp is missing or invalid.')
    if isinstance(value, (int, float)) or str(value).isdigit():
        return datetime.fromtimestamp(int(value), UTC)
    parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise RuntimeError('Publishing dates must include a time zone.')
    return parsed.astimezone(UTC)


def iso(value):
    return value.astimezone(UTC).isoformat().replace('+00:00', 'Z')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate_queue(queue):
    if queue.get('schemaVersion') != 1 or queue.get('approved') is not True:
        raise RuntimeError('The publishing queue must be explicitly approved.')
    if queue.get('timezone') != 'America/Chicago' or queue.get('expectedInstagramUsername') != 'beholdersgazette':
        raise RuntimeError('Unexpected queue time zone or Instagram destination.')
    entries = queue.get('entries', [])
    final_batch = queue.get('id') == 'persons-of-interest-week05'
    if len(entries) != (2 if final_batch else 7):
        raise RuntimeError('Expected seven approved posts, or the final two-post batch.')
    if final_batch and [entry.get('sourceDay') for entry in entries] != [29, 30]:
        raise RuntimeError('The final batch must contain reviewed days 29 and 30.')
    ids, dates, filenames = set(), set(), set()
    previous = None
    for index, entry in enumerate(entries):
        identifier = entry.get('id', '')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', identifier) or identifier in ids:
            raise RuntimeError('Queue post IDs must be unique lowercase slugs.')
        ids.add(identifier)
        if entry.get('approved') is not True or entry.get('day') != index + 1:
            raise RuntimeError('Every queued post must be approved and ordered by day.')
        date = timestamp(entry['publishAt'])
        if date in dates or previous is not None and date - previous != timedelta(days=1):
            raise RuntimeError('Queue dates must be consecutive and unique.')
        dates.add(date)
        previous = date
        if len(entry.get('images', [])) != 3:
            raise RuntimeError('Each carousel requires its three reviewed cards.')
        for number, image in enumerate(entry['images'], 1):
            name = image.get('filename', '')
            ending = ('01-meet.jpg', '02-play.jpg', '03-hook.jpg')[number-1]
            if not re.fullmatch(r'[a-z0-9-]+\.jpg', name) or not name.endswith(ending) or name in filenames:
                raise RuntimeError('Image filenames or card order are invalid.')
            filenames.add(name)
            if not re.fullmatch(r'[a-f0-9]{64}', image.get('sha256', '')):
                raise RuntimeError('Every image requires its approved SHA-256.')
            if (image.get('width'), image.get('height')) != (1080, 1350) or not image.get('alt'):
                raise RuntimeError('Every card requires dimensions and alt text.')
        for platform in PLATFORMS:
            caption = entry.get('captions', {}).get(platform)
            if not isinstance(caption, str) or not caption.strip() or len(caption) > 2200:
                raise RuntimeError('Both approved platform descriptions are required.')
        if '@thebeholdersgazette' in entry['captions']['instagram']:
            raise RuntimeError('Instagram self-mention must use the connected account.')
    return queue


def jpeg_size(data):
    if data[:2] != b'\xff\xd8' or len(data) > 8 * 1024 * 1024:
        raise RuntimeError('Instagram cards must be JPEG files smaller than 8 MB.')
    offset = 2
    while offset + 4 <= len(data):
        if data[offset] != 255:
            raise RuntimeError('Malformed JPEG marker.')
        while offset < len(data) and data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in (1, 216, 217) or 208 <= marker <= 215:
            continue
        length = int.from_bytes(data[offset:offset+2], 'big')
        if length < 2 or offset + length > len(data):
            raise RuntimeError('Malformed JPEG segment.')
        if marker in (192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207):
            return int.from_bytes(data[offset+5:offset+7], 'big'), int.from_bytes(data[offset+3:offset+5], 'big')
        offset += length
    raise RuntimeError('JPEG dimensions were not found.')


class ReleaseStore:
    def __init__(self, config):
        self.repo = config.get('repository', '')
        self.tag = config.get('releaseTag', '')
        self.expected_hash = config.get('queueSha256', '')
        if self.repo != 'Oddmagician6/Beholders-Gazzete' or not re.fullmatch(r'poi-stage-[a-z0-9-]+', self.tag):
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
        self.state = json.loads(self.release.get('body') or '{}')
        if self.state.get('queueSha256') != self.expected_hash or not isinstance(self.state.get('entries'), dict):
            raise RuntimeError('Release state does not belong to this queue.')
        self.revision = self.state.get('revision', 0)

    def github(self, method, endpoint, body=None):
        payload = None if body is None else json.dumps(body).encode('utf-8')
        request = urllib.request.Request('https://api.github.com/' + endpoint, data=payload,
            headers={'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28'}, method=method)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read()
                return json.loads(data) if data else {}
        except urllib.error.HTTPError as error:
            raise StateError(f'GitHub state request failed with HTTP {error.code}; no further publishing was attempted.') from None
        except urllib.error.URLError:
            raise StateError('GitHub state request failed; no further publishing was attempted.') from None

    def url(self, filename):
        if filename not in self.assets or not re.fullmatch(r'[a-z0-9.-]+', filename):
            raise RuntimeError('A required public release asset is missing.')
        return f'https://github.com/{self.repo}/releases/download/{self.tag}/{filename}'

    def download(self, filename):
        try:
            with urllib.request.urlopen(self.url(filename), timeout=90) as response:
                data = response.read(8*1024*1024 + 1)
        except (urllib.error.HTTPError, urllib.error.URLError):
            raise RuntimeError(f'Could not download staged asset {filename}.') from None
        return data

    def verify_images(self, entries):
        for entry in entries:
            for image in entry['images']:
                data = self.download(image['filename'])
                if digest(data) != image['sha256'] or jpeg_size(data) != (1080,1350):
                    raise RuntimeError('Staged image bytes or dimensions do not match approval.')

    def save(self):
        current = self.github('GET', f"repos/{self.repo}/releases/{self.release['id']}")
        remote = json.loads(current.get('body') or '{}')
        if remote.get('queueSha256') != self.expected_hash or remote.get('revision', 0) != self.revision:
            raise StateError('Publishing state changed concurrently; stopping rather than overwriting it.')
        new_revision = self.revision + 1
        self.state['revision'] = new_revision
        self.state['updatedAt'] = iso(datetime.now(UTC))
        self.github('PATCH', f"repos/{self.repo}/releases/{self.release['id']}", {'body': json.dumps(self.state, indent=2)})
        self.revision = new_revision

    def disable_workflow(self):
        _, workflow = batch_files(os.environ.get('NPC_BATCH', ''))
        self.github('PUT', f'repos/{self.repo}/actions/workflows/{workflow}/disable')


class Publisher:
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

    def slot(self, entry, platform):
        return self.state.setdefault('entries', {}).setdefault(entry['id'], {}).setdefault(platform, {'phase': 'queued'})

    def recent(self, edge, fields):
        after = None
        for _ in range(10):
            params = {'fields': fields, 'limit': 100}
            if after:
                params['after'] = after
            payload = self.get(edge, params, self.token)
            yield from payload.get('data', [])
            paging = payload.get('paging') or {}
            after = (paging.get('cursors') or {}).get('after') if paging.get('next') else None
            if not after:
                return
        raise RuntimeError('Too many recent posts to prove that no duplicate exists.')

    def recover_facebook(self, entry):
        expected = timestamp(entry['publishAt'])
        for item in self.recent(f"{self.page['id']}/scheduled_posts", 'id,message,scheduled_publish_time'):
            if item.get('message', '').strip() == entry['captions']['facebook'].strip() and abs((timestamp(item.get('scheduled_publish_time')) - expected).total_seconds()) <= 60:
                return str(item['id'])
        return None

    def confirm_facebook(self, entry):
        slot = self.slot(entry, 'facebook')
        item = self.get(slot['postId'], {'fields':'id,is_published,scheduled_publish_time,message'}, self.token)
        if item.get('message', '').strip() != entry['captions']['facebook'].strip():
            raise RuntimeError('Facebook returned a post with different text.')
        if item.get('is_published') is True:
            if self.now < timestamp(entry['publishAt']) - timedelta(minutes=1):
                raise RuntimeError('Facebook reports publication before the requested date; check the Page.')
            slot['phase'] = 'published'
        elif abs((timestamp(item.get('scheduled_publish_time')) - timestamp(entry['publishAt'])).total_seconds()) <= 60:
            slot['phase'] = 'scheduled'
        else:
            raise RuntimeError('Facebook did not confirm the requested schedule.')
        self.save()
        return slot['phase']

    def schedule_facebook(self, entry):
        slot = self.slot(entry, 'facebook')
        if slot['phase'] in ('scheduled', 'published'):
            return self.confirm_facebook(entry)
        if slot['phase'] == 'scheduling':
            identifier = self.recover_facebook(entry)
            if not identifier:
                raise RuntimeError('Facebook schedule submission is ambiguous. Inspect the Page before any retry.')
            slot['postId'] = identifier
            self.save()
            return self.confirm_facebook(entry)
        if slot['phase'] not in ('queued', 'uploading'):
            raise RuntimeError('Facebook post requires manual reconciliation.')
        photos = slot.setdefault('photoIds', [])
        slot['phase'] = 'uploading'
        self.save()
        for image in entry['images'][len(photos):]:
            response = self.post(f"{self.page['id']}/photos", {'url': self.image_url(image['filename']), 'published':'false', 'alt_text_custom':image['alt']}, self.token)
            if not response.get('id'):
                raise RuntimeError('Facebook did not return an unpublished photo ID.')
            photos.append(str(response['id']))
            self.save()
        slot['phase'] = 'scheduling'
        self.save()  # A retry must reconcile rather than issue a second feed post.
        response = self.post(f"{self.page['id']}/feed", {'message':entry['captions']['facebook'], 'attached_media':json.dumps([{'media_fbid':identifier} for identifier in photos]), 'published':'false', 'scheduled_publish_time':int(timestamp(entry['publishAt']).timestamp())}, self.token)
        if not response.get('id'):
            raise RuntimeError('Facebook returned no scheduled post ID; inspect the Page before retrying.')
        slot['postId'] = str(response['id'])
        self.save()
        return self.confirm_facebook(entry)

    def arm(self):
        for entry in self.queue['entries']:
            date = timestamp(entry['publishAt'])
            slot = self.slot(entry, 'facebook')
            if slot['phase'] not in ('scheduled', 'published') and not self.now + timedelta(minutes=10) <= date <= self.now + timedelta(days=29):
                raise RuntimeError('All posts must be between 10 minutes and 29 days ahead before arming.')
        for entry in self.queue['entries']:
            self.schedule_facebook(entry)
            self.slot(entry, 'instagram')
            self.save()
            print(f"Day {entry['day']}: Facebook confirmed scheduling; Instagram queued for {entry['publishAt']}.")
        self.state['armed'] = True
        self.save()

    def recover_instagram(self, entry):
        earliest = timestamp(entry['publishAt']) - timedelta(hours=12)
        for item in self.recent(f'{self.ig}/media', 'id,caption,timestamp,media_type,permalink'):
            if item.get('caption', '').strip() == entry['captions']['instagram'].strip() and timestamp(item['timestamp']) >= earliest:
                return str(item['id'])
        return None

    def confirm_instagram(self, entry):
        slot = self.slot(entry, 'instagram')
        item = self.get(slot['mediaId'], {'fields':'id,caption,media_type,permalink'}, self.token)
        if item.get('caption', '').strip() != entry['captions']['instagram'].strip() or item.get('media_type') != 'CAROUSEL_ALBUM':
            raise RuntimeError('Instagram did not confirm the expected carousel and caption.')
        slot.update(phase='published', permalink=item.get('permalink'), confirmedAt=iso(self.now))
        self.save()

    def wait_for_container(self, identifier):
        for _ in range(60):
            item = self.get(identifier, {'fields':'status_code'}, self.token)
            status = item.get('status_code')
            if status == 'FINISHED':
                return
            if status in ('ERROR', 'EXPIRED'):
                raise RuntimeError('Instagram carousel container is not publishable: ' + status)
            self.sleep(5)
        raise RuntimeError('Instagram container is still processing. A later run can resume without re-uploading.')

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
        children = slot.setdefault('childIds', [])
        slot['phase'] = 'uploading'
        self.save()
        for image in entry['images'][len(children):]:
            item = self.post(f'{self.ig}/media', {'image_url':self.image_url(image['filename']), 'is_carousel_item':'true', 'alt_text':image['alt']}, self.token)
            if not item.get('id'):
                raise RuntimeError('Instagram did not return an image container ID.')
            children.append(str(item['id']))
            self.save()
        if not slot.get('containerId'):
            item = self.post(f'{self.ig}/media', {'media_type':'CAROUSEL', 'children':','.join(children), 'caption':entry['captions']['instagram']}, self.token)
            if not item.get('id'):
                raise RuntimeError('Instagram did not return a carousel container ID.')
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
        print(f"Day {entry['day']}: Instagram confirmed carousel publication.")

    def due(self):
        if self.state.get('armed') is not True:
            raise RuntimeError('The queue is not armed. Verify and arm it before scheduled publishing.')
        return [entry for entry in self.queue['entries'] if timestamp(entry['publishAt']) <= self.now <= timestamp(entry['publishAt']) + INSTAGRAM_WINDOW]

    def run_due(self):
        due = self.due()
        failures = []
        for entry in self.queue['entries']:
            if timestamp(entry['publishAt']) > self.now:
                continue
            try:
                self.confirm_facebook(entry)
            except StateError:
                raise
            except RuntimeError as error:
                failures.append(f"Day {entry['day']} Facebook: {error}")
        for entry in due:
            try:
                self.publish_instagram(entry)
            except StateError:
                raise
            except RuntimeError as error:
                failures.append(f"Day {entry['day']} Instagram: {error}")
        if failures:
            raise RuntimeError('; '.join(failures))


def report(store, error=None):
    payload = {'queueId':store.queue['id'], 'armed':store.state.get('armed', False), 'entries':copy.deepcopy(store.state.get('entries', {}))}
    if error:
        payload['error'] = error
    destination = Path(os.environ.get('RUNNER_TEMP', '.poi-output')) / 'npc-carousel-report.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        lines = ['## Persons of Interest publishing', '', '| Day | UTC time | Facebook | Instagram |', '| --- | --- | --- | --- |']
        for entry in store.queue['entries']:
            state = store.state.get('entries', {}).get(entry['id'], {})
            lines.append(f"| {entry.get('sourceDay', entry['day'])} | {entry['publishAt']} | {state.get('facebook', {}).get('phase', 'not armed')} | {state.get('instagram', {}).get('phase', 'not armed')} |")
        if error:
            lines += ['', 'Run stopped: ' + error]
        with open(summary, 'a', encoding='utf-8') as output:
            output.write('\n'.join(lines) + '\n')


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--validate-queue':
        queue = validate_queue(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')))
        print(f"Validated {len(queue['entries'])} approved posts and {len(queue['entries']) * 3} image references without network or publishing.")
        return
    if len(sys.argv) > 1:
        raise RuntimeError('Usage: publish_npc_carousels.py [--validate-queue queue.json]')
    config_name, _ = batch_files(os.environ.get('NPC_BATCH', ''))
    config = json.loads((Path(__file__).resolve().parents[1] / config_name).read_text(encoding='utf-8'))
    if config.get('enabled') is not True:
        print('NPC carousel publishing is disabled.')
        return
    store = ReleaseStore(config)
    operation = os.environ.get('OPERATION', 'verify')
    if operation not in ('verify', 'arm', 'run_due'):
        raise RuntimeError('Unknown publisher operation.')
    now = datetime.now(UTC)
    expired = now > timestamp(store.queue['entries'][-1]['publishAt']) + INSTAGRAM_WINDOW
    if operation == 'run_due' and expired:
        report(store)
        store.disable_workflow()
        print('Approved publishing window ended; scheduled workflow disabled. Inspect the report for any unconfirmed posts.')
        return
    if operation == 'run_due' and now < timestamp(store.queue['entries'][0]['publishAt']):
        report(store)
        print('This batch starts in the future; no Meta requests needed today.')
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
    publisher = Publisher(store.queue, store.state, store.save, store.url, page, ig_id, now=now)
    try:
        if operation in ('verify', 'arm'):
            store.verify_images(store.queue['entries'])
        else:
            store.verify_images(publisher.due())
        if operation == 'verify':
            print(f"Verified approved queue, all {len(store.queue['entries']) * 3} public JPEGs, and connected Instagram destination. No posts were created.")
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
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        detail = str(error)
        for key in ('FB_PAGE_TOKEN', 'GH_TOKEN'):
            if os.environ.get(key):
                detail = detail.replace(os.environ[key], '[redacted]')
        print('NPC carousel publisher: ' + detail, file=sys.stderr)
        sys.exit(1)
