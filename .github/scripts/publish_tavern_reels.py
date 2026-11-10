"""Schedule approved weekly tavern-review Reels on Facebook and publish them on Instagram when due.

Video sibling of publish_ad_cards.py. It keeps the shared publisher's rules: an approved queue
staged in a public Release with its SHA-256 pinned in .github/tavern-reel-queue-<batch>.json,
state stored in the Release body, verify/arm/run_due, and duplicate recovery. Differences:

- Each entry is one MP4 Reel with its own Facebook and Instagram captions (no article link;
  tavern reviews are standalone, not Gazette articles).
- Facebook Page Reels schedule at most 29 days ahead, so `arm` schedules what fits and every
  later run schedules the rest as each comes within 29 days.
- Instagram can't schedule, so the Saturday runs publish each Reel once it is due.
"""
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

from meta_page import get_page_context, graph_get, graph_post, request_json
from publish_npc_carousels import INSTAGRAM_WINDOW, PLATFORMS, UTC, Publisher, ReleaseStore, StateError, digest, iso, timestamp

MAX_POSTS = 5
MAX_VIDEO_BYTES = 200 * 1024 * 1024
FACEBOOK_HORIZON = timedelta(days=29)
FACEBOOK_LEAD = timedelta(minutes=10)
REPO = 'Oddmagician6/Beholders-Gazzete'


def batch_files(batch):
    if not re.fullmatch(r'batch[0-9]{2}', batch or ''):
        raise RuntimeError('Unexpected tavern Reel batch.')
    return f'tavern-reel-queue-{batch}.json', f'publish-tavern-reels-{batch}.yml'


def validate_queue(queue):
    if queue.get('schemaVersion') != 1 or queue.get('approved') is not True:
        raise RuntimeError('The publishing queue must be explicitly approved.')
    if queue.get('timezone') != 'America/Chicago' or queue.get('expectedInstagramUsername') != 'beholdersgazette':
        raise RuntimeError('Unexpected queue time zone or Instagram destination.')
    if not re.fullmatch(r'tavern-reviews-batch[0-9]{2}', queue.get('id', '')):
        raise RuntimeError('Unexpected tavern Reel queue ID.')
    entries = queue.get('entries', [])
    if not 1 <= len(entries) <= MAX_POSTS:
        raise RuntimeError(f'Expected one to {MAX_POSTS} approved Reels.')
    ids = set()
    previous = None
    for index, entry in enumerate(entries):
        identifier = entry.get('id', '')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', identifier) or identifier in ids:
            raise RuntimeError('Queue post IDs must be unique lowercase slugs.')
        ids.add(identifier)
        if entry.get('approved') is not True or entry.get('day') != index + 1 or not entry.get('title'):
            raise RuntimeError('Every queued Reel must be approved, titled, and in order.')
        date = timestamp(entry['publishAt'])
        if previous is not None and date - previous != timedelta(days=7):
            raise RuntimeError('Reel dates must be exactly one week apart.')
        previous = date
        video = entry.get('video') or {}
        if video.get('filename') != identifier + '.mp4':
            raise RuntimeError('Reel filenames must match their post IDs.')
        if not re.fullmatch(r'[a-f0-9]{64}', video.get('sha256', '')):
            raise RuntimeError('Every Reel requires its approved SHA-256.')
        if not isinstance(video.get('bytes'), int) or not 0 < video['bytes'] <= MAX_VIDEO_BYTES:
            raise RuntimeError('Every Reel requires its byte size.')
        if not 3 <= float(video.get('durationSeconds', 0)) <= 90:
            raise RuntimeError('Reels must run 3 to 90 seconds.')
        for platform in PLATFORMS:
            caption = entry.get('captions', {}).get(platform)
            if not isinstance(caption, str) or not caption.strip() or len(caption) > 2200:
                raise RuntimeError('Both approved platform captions are required.')
        if len(re.findall(r'#\w+', entry['captions']['instagram'])) > 30:
            raise RuntimeError('Instagram allows at most 30 hashtags.')
        if entry['captions']['facebook'].strip() == entry['captions']['instagram'].strip():
            raise RuntimeError('Facebook and Instagram captions should differ.')
    return queue


class TavernReleaseStore(ReleaseStore):
    def __init__(self, config, batch):
        self.batch = batch
        self.repo = config.get('repository', '')
        self.tag = config.get('releaseTag', '')
        self.expected_hash = config.get('queueSha256', '')
        if self.repo != REPO or not re.fullmatch(r'tavern-stage-batch[0-9]{2}-[0-9]{8}', self.tag):
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
        self.videos = {}
        queue_bytes = self.download('queue.json')
        if digest(queue_bytes) != self.expected_hash:
            raise RuntimeError('Staged queue does not match the approved configuration.')
        self.queue = validate_queue(json.loads(queue_bytes))
        self.state = json.loads(self.release.get('body') or '{}')
        if self.state.get('queueSha256') != self.expected_hash or not isinstance(self.state.get('entries'), dict):
            raise RuntimeError('Release state does not belong to this queue.')
        self.revision = self.state.get('revision', 0)

    def download(self, filename, limit=8 * 1024 * 1024):
        try:
            with urllib.request.urlopen(self.url(filename), timeout=300) as response:
                data = response.read(limit + 1)
        except OSError:
            raise RuntimeError(f'Could not download staged asset {filename}.') from None
        if len(data) > limit:
            raise RuntimeError(f'Staged asset {filename} is larger than expected.')
        return data

    def video(self, entry):
        name = entry['video']['filename']
        if name not in self.videos:
            data = self.download(name, MAX_VIDEO_BYTES)
            if digest(data) != entry['video']['sha256'] or len(data) != entry['video']['bytes'] or data[4:8] != b'ftyp':
                raise RuntimeError(f'Staged Reel {name} does not match approval.')
            self.videos[name] = data
        return self.videos[name]

    def verify_videos(self, entries):
        for entry in entries:
            self.video(entry)

    def disable_workflow(self):
        _, workflow = batch_files(self.batch)
        self.github('PUT', f'repos/{self.repo}/actions/workflows/{workflow}/disable')


def upload_reel(upload_url, data, token):
    parsed = urlparse(upload_url)
    if parsed.scheme != 'https' or parsed.hostname != 'rupload.facebook.com':
        raise RuntimeError('Meta returned an invalid Reel upload session.')
    request = urllib.request.Request(upload_url, data=data, method='POST', headers={
        'Authorization': f'OAuth {token}', 'offset': '0', 'file_size': str(len(data)), 'Content-Type': 'application/octet-stream'})
    return request_json(request)


class TavernPublisher(Publisher):
    def __init__(self, queue, state, save, video_url, video_bytes, page, instagram_id, get=graph_get, post=graph_post, upload=upload_reel, now=None, sleep=time.sleep):
        self.queue = validate_queue(queue)
        self.state = state
        self.save = save
        self.video_url = video_url
        self.video_bytes = video_bytes
        self.page = page
        self.ig = instagram_id
        self.token = page['access_token']
        self.get = get
        self.post = post
        self.upload = upload
        self.now = now or datetime.now(UTC)
        self.sleep = sleep

    # Facebook: a scheduled Page Reel per entry.

    def confirm_facebook(self, entry):
        slot = self.slot(entry, 'facebook')
        item = self.get(slot['videoId'], {'fields': 'id,description,published,scheduled_publish_time,status'}, self.token)
        # Meta may omit a scheduled Reel's description; when it's there it must match.
        if item.get('description') is not None and item['description'].strip() != entry['captions']['facebook'].strip():
            raise RuntimeError('Facebook returned a Reel with different text.')
        state = str((item.get('status') or {}).get('video_status', '')).lower()
        if item.get('published') is True or state in ('published', 'live'):
            if self.now < timestamp(entry['publishAt']) - timedelta(minutes=1):
                raise RuntimeError('Facebook reports publication before the requested date; check the Page.')
            slot['phase'] = 'published'
        elif item.get('scheduled_publish_time') and abs((timestamp(item['scheduled_publish_time']) - timestamp(entry['publishAt'])).total_seconds()) <= 60:
            slot['phase'] = 'scheduled'
        elif state in ('error', 'failed'):
            raise RuntimeError('Facebook reports the Reel failed processing.')
        else:
            slot['phase'] = 'processing'
        self.save()
        return slot['phase']

    def wait_for_facebook(self, entry):
        for _ in range(60):
            if self.confirm_facebook(entry) in ('scheduled', 'published'):
                return
            self.sleep(15)
        raise RuntimeError('Facebook accepted the Reel but has not confirmed its schedule yet. A later run will check again.')

    def schedule_facebook(self, entry):
        slot = self.slot(entry, 'facebook')
        if slot['phase'] in ('scheduled', 'published'):
            return self.confirm_facebook(entry)
        if slot['phase'] in ('scheduling', 'processing'):
            # The finish call may have landed; never send a second one blindly.
            if not slot.get('videoId'):
                raise RuntimeError('Facebook schedule submission is ambiguous. Inspect the Page before any retry.')
            self.wait_for_facebook(entry)
            return slot['phase']
        if slot['phase'] not in ('queued', 'uploading'):
            raise RuntimeError('Facebook Reel requires manual reconciliation.')
        publish_at = timestamp(entry['publishAt'])
        if not self.now + FACEBOOK_LEAD <= publish_at <= self.now + FACEBOOK_HORIZON:
            raise RuntimeError('Facebook can only schedule a Reel 10 minutes to 29 days ahead.')
        # An unfinished upload session publishes nothing, so starting over is safe.
        session = self.post(f"{self.page['id']}/video_reels", {'upload_phase': 'start'}, self.token)
        if not session.get('video_id') or not session.get('upload_url'):
            raise RuntimeError('Meta returned an invalid Reel upload session.')
        slot.update(phase='uploading', videoId=str(session['video_id']))
        self.save()
        if self.upload(session['upload_url'], self.video_bytes(entry), self.token).get('success') is not True:
            raise RuntimeError('Meta did not confirm the Reel video upload.')
        slot['phase'] = 'scheduling'
        self.save()  # A retry must reconcile rather than issue a second finish.
        finish = self.post(f"{self.page['id']}/video_reels", {
            'video_id': slot['videoId'], 'upload_phase': 'finish', 'video_state': 'SCHEDULED',
            'title': entry['title'], 'description': entry['captions']['facebook'],
            'scheduled_publish_time': int(publish_at.timestamp())}, self.token)
        if finish.get('success') is not True:
            raise RuntimeError('Meta did not confirm the Reel schedule request; inspect the Page before retrying.')
        self.wait_for_facebook(entry)
        return slot['phase']

    def schedulable(self, entry):
        slot = self.slot(entry, 'facebook')
        date = timestamp(entry['publishAt'])
        return slot['phase'] not in ('scheduled', 'published') and self.now + FACEBOOK_LEAD <= date <= self.now + FACEBOOK_HORIZON

    def top_up_facebook(self):
        done = []
        for entry in self.queue['entries']:
            slot = self.slot(entry, 'facebook')
            if slot['phase'] in ('scheduling', 'processing') or self.schedulable(entry):
                self.schedule_facebook(entry)
                done.append(entry)
        return done

    def arm(self):
        entries = self.queue['entries']
        for entry in entries:
            slot = self.slot(entry, 'facebook')
            if slot['phase'] not in ('scheduled', 'published') and timestamp(entry['publishAt']) < self.now + FACEBOOK_LEAD:
                raise RuntimeError('Every Reel must be at least 10 minutes ahead before arming.')
        if timestamp(entries[0]['publishAt']) > self.now + FACEBOOK_HORIZON:
            raise RuntimeError('Arm within 29 days of the first Reel.')
        scheduled = {entry['id'] for entry in self.top_up_facebook()}
        for entry in entries:
            self.slot(entry, 'instagram')
            note = 'Facebook confirmed scheduling' if entry['id'] in scheduled or self.slot(entry, 'facebook')['phase'] == 'scheduled' else 'Facebook schedules on a later run (over 29 days out)'
            print(f"Reel {entry['day']} ({entry['publishAt']}): {note}; Instagram queued.")
        self.state['armed'] = True
        self.save()

    # Instagram: published when due.

    def confirm_instagram(self, entry):
        slot = self.slot(entry, 'instagram')
        item = self.get(slot['mediaId'], {'fields': 'id,caption,media_type,media_product_type,permalink'}, self.token)
        if item.get('caption', '').strip() != entry['captions']['instagram'].strip() or item.get('media_product_type') != 'REELS':
            raise RuntimeError('Instagram did not confirm the expected Reel and caption.')
        slot.update(phase='published', permalink=item.get('permalink'), confirmedAt=iso(self.now))
        self.save()

    def wait_for_container(self, identifier):
        for _ in range(90):
            status = self.get(identifier, {'fields': 'status_code'}, self.token).get('status_code')
            if status == 'FINISHED':
                return
            if status in ('ERROR', 'EXPIRED'):
                raise RuntimeError('Instagram Reel container is not publishable: ' + status)
            self.sleep(10)
        raise RuntimeError('Instagram Reel is still processing. A later run can resume without re-uploading.')

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
            item = self.post(f'{self.ig}/media', {'media_type': 'REELS', 'video_url': self.video_url(entry['video']['filename']),
                'caption': entry['captions']['instagram'], 'share_to_feed': 'true'}, self.token)
            if not item.get('id'):
                raise RuntimeError('Instagram did not return a Reel container ID.')
            slot.update(phase='uploading', containerId=str(item['id']))
            self.save()
        self.wait_for_container(slot['containerId'])
        slot['phase'] = 'publishing'
        self.save()  # Persist before the non-idempotent publish call.
        item = self.post(f'{self.ig}/media_publish', {'creation_id': slot['containerId']}, self.token)
        if not item.get('id'):
            raise RuntimeError('Instagram returned no media ID. Inspect the account before retrying.')
        slot['mediaId'] = str(item['id'])
        self.save()
        self.confirm_instagram(entry)
        print(f"Reel {entry['day']}: Instagram confirmed publication.")

    def run_due(self):
        if self.state.get('armed') is not True:
            raise RuntimeError('The queue is not armed. Verify and arm it before scheduled publishing.')
        failures = []
        try:
            self.top_up_facebook()
        except StateError:
            raise
        except RuntimeError as error:
            failures.append(f'Facebook scheduling: {error}')
        for entry in self.queue['entries']:
            if timestamp(entry['publishAt']) > self.now:
                continue
            slot = self.slot(entry, 'facebook')
            try:
                if not slot.get('videoId'):
                    raise RuntimeError('was never scheduled; post it by hand or restage.')
                self.confirm_facebook(entry)
            except StateError:
                raise
            except RuntimeError as error:
                failures.append(f"Reel {entry['day']} Facebook: {error}")
        for entry in self.due():
            try:
                self.publish_instagram(entry)
            except StateError:
                raise
            except RuntimeError as error:
                failures.append(f"Reel {entry['day']} Instagram: {error}")
        if failures:
            raise RuntimeError('; '.join(failures))


def report(store, error=None):
    payload = {'queueId': store.queue['id'], 'armed': store.state.get('armed', False), 'entries': store.state.get('entries', {})}
    if error:
        payload['error'] = error
    destination = Path(os.environ.get('RUNNER_TEMP', '.reel-output')) / 'tavern-reel-report.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        lines = ['## Tavern review Reels', '', '| # | Tavern | UTC time | Facebook | Instagram |', '| --- | --- | --- | --- | --- |']
        for entry in store.queue['entries']:
            state = store.state.get('entries', {}).get(entry['id'], {})
            lines.append(f"| {entry['day']} | {entry['title']} | {entry['publishAt']} | {state.get('facebook', {}).get('phase', 'not armed')} | {state.get('instagram', {}).get('phase', 'not armed')} |")
        if error:
            lines += ['', 'Run stopped: ' + error]
        with open(summary, 'a', encoding='utf-8') as output:
            output.write('\n'.join(lines) + '\n')


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--validate-queue':
        queue = validate_queue(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')))
        print(f"Validated {len(queue['entries'])} approved tavern Reels without network or publishing.")
        return
    if len(sys.argv) > 1:
        raise RuntimeError('Usage: publish_tavern_reels.py [--validate-queue queue.json]')
    batch = os.environ.get('REEL_BATCH', '')
    config_name, _ = batch_files(batch)
    config = json.loads((Path(__file__).resolve().parents[1] / config_name).read_text(encoding='utf-8'))
    if config.get('enabled') is not True:
        print('Tavern Reel publishing is disabled.')
        return
    store = TavernReleaseStore(config, batch)
    operation = os.environ.get('OPERATION', 'verify')
    if operation not in ('verify', 'arm', 'run_due'):
        raise RuntimeError('Unknown publisher operation.')
    now = datetime.now(UTC)
    entries = store.queue['entries']
    if operation == 'run_due' and now > timestamp(entries[-1]['publishAt']) + INSTAGRAM_WINDOW:
        report(store)
        store.disable_workflow()
        print('Approved publishing window ended; scheduled workflow disabled. Inspect the report for any unconfirmed posts.')
        return
    if operation == 'run_due' and store.state.get('armed') is not True:
        raise RuntimeError('The queue is not armed. Verify and arm it before scheduled publishing.')
    if operation == 'run_due':
        waiting = any(store.state.get('entries', {}).get(e['id'], {}).get('facebook', {}).get('phase', 'queued') not in ('scheduled', 'published')
                      and timestamp(e['publishAt']) <= now + FACEBOOK_HORIZON for e in entries)
        due = any(timestamp(e['publishAt']) <= now <= timestamp(e['publishAt']) + INSTAGRAM_WINDOW for e in entries)
        if not due and not waiting:
            report(store)
            print('No Reel is due in this window; no Meta requests needed.')
            return
    page_id = os.environ.get('FB_PAGE_ID', '').strip()
    user_token = os.environ.get('FB_PAGE_TOKEN', '').strip()
    if not re.fullmatch(r'[0-9]+', page_id) or not user_token:
        raise RuntimeError('The existing Facebook Page secrets must be configured.')
    page = get_page_context(page_id, user_token)
    ig_id = str((page.get('instagram_business_account') or {}).get('id', ''))
    if not ig_id:
        raise RuntimeError('The Facebook Page has no linked Instagram professional account.')
    profile = graph_get(ig_id, {'fields': 'id,username'}, page['access_token'])
    if profile.get('username', '').lower() != store.queue['expectedInstagramUsername']:
        raise RuntimeError('The connected Instagram account differs from the approved destination.')
    publisher = TavernPublisher(store.queue, store.state, store.save, store.url, store.video, page, ig_id, now=now)
    try:
        if operation == 'verify':
            store.verify_videos(entries)
            print(f"Verified the approved queue, all {len(entries)} public Reels, and the connected Instagram destination. No posts were created.")
        elif operation == 'arm':
            store.verify_videos(entries)
            publisher.arm()
        else:
            publisher.run_due()
        report(store)
        completed = all(store.state.get('entries', {}).get(e['id'], {}).get(p, {}).get('phase') == 'published' for e in entries for p in PLATFORMS)
        if completed and operation == 'run_due':
            store.disable_workflow()
            print(f"All {len(entries) * 2} publications confirmed; scheduled workflow disabled.")
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
        print('Tavern Reel publisher: ' + detail, file=sys.stderr)
        sys.exit(1)
