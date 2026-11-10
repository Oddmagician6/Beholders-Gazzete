import contextlib
import copy
import io
import unittest
from datetime import datetime, timedelta, timezone

from publish_npc_carousels import iso, timestamp
from publish_tavern_reels import TavernPublisher, batch_files, validate_queue

UTC = timezone.utc
FIRST = datetime(2026, 11, 14, 18, tzinfo=UTC)


def queue_fixture(count=5):
    entries = []
    for index in range(count):
        identifier = f'tavern-{index+1}'
        entries.append({'id': identifier, 'day': index+1, 'title': f'Tavern {index+1}', 'approved': True,
            'publishAt': iso(FIRST+timedelta(days=7*index)),
            'captions': {'facebook': f'Facebook tavern {index+1}', 'instagram': f'Instagram tavern {index+1} #DnD'},
            'video': {'filename': identifier+'.mp4', 'sha256': 'a'*64, 'bytes': 1000, 'durationSeconds': 17.5}})
    return {'schemaVersion': 1, 'id': 'tavern-reviews-batch01', 'approved': True, 'timezone': 'America/Chicago',
            'expectedInstagramUsername': 'beholdersgazette', 'entries': entries}


class FakeMeta:
    def __init__(self):
        self.calls = []
        self.sequence = 0
        self.videos = {}
        self.media = {}
        self.containers = {}
        self.now = FIRST
        self.lose_finish = False
        self.fail_publish = None

    def identifier(self, prefix):
        self.sequence += 1
        return prefix + str(self.sequence)

    def get(self, path, params, token):
        self.calls.append(('GET', path, copy.deepcopy(params)))
        if path in self.videos:
            video = self.videos[path]
            if 'scheduled_publish_time' not in video:
                return {'id': path, 'published': False, 'status': {'video_status': 'processing'}}
            published = timestamp(video['scheduled_publish_time']) <= self.now
            return {'id': path, 'description': video['description'], 'published': published,
                    'scheduled_publish_time': video['scheduled_publish_time'], 'status': {'video_status': 'published' if published else 'scheduled'}}
        if path == 'ig/media':
            return {'data': list(self.media.values())}
        if path in self.media:
            return self.media[path]
        if path in self.containers:
            return {'status_code': 'FINISHED'}
        raise AssertionError('Unexpected GET: ' + path)

    def post(self, path, data, token):
        self.calls.append(('POST', path, copy.deepcopy(data)))
        if path == 'page/video_reels' and data['upload_phase'] == 'start':
            identifier = self.identifier('video')
            self.videos[identifier] = {}
            return {'video_id': identifier, 'upload_url': 'https://rupload.facebook.com/video-upload/' + identifier}
        if path == 'page/video_reels' and data['upload_phase'] == 'finish':
            if data['video_state'] != 'SCHEDULED':
                raise AssertionError('Reels must be scheduled, never published immediately.')
            self.videos[data['video_id']] = {'description': data['description'], 'scheduled_publish_time': data['scheduled_publish_time']}
            if self.lose_finish:
                raise RuntimeError('Facebook response lost')
            return {'success': True}
        if path == 'ig/media':
            if data.get('media_type') != 'REELS':
                raise AssertionError('Instagram posts must be Reels.')
            identifier = self.identifier('container')
            self.containers[identifier] = copy.deepcopy(data)
            return {'id': identifier}
        if path == 'ig/media_publish':
            identifier = self.identifier('igpost')
            container = self.containers[data['creation_id']]
            if self.fail_publish != 'before':
                self.media[identifier] = {'id': identifier, 'caption': container['caption'], 'timestamp': iso(self.now),
                    'media_type': 'VIDEO', 'media_product_type': 'REELS', 'permalink': 'https://example.invalid/'+identifier}
            if self.fail_publish:
                raise RuntimeError('Instagram response lost')
            return {'id': identifier}
        raise AssertionError('Unexpected POST: ' + path)

    def upload(self, url, data, token):
        self.calls.append(('UPLOAD', url, len(data)))
        return {'success': True}

    def count(self, method, path, **match):
        return sum(1 for call in self.calls if call[0] == method and call[1] == path and all(call[2].get(k) == v for k, v in match.items()))


class TavernPublisherTests(unittest.TestCase):
    def setUp(self):
        self.queue = queue_fixture()
        self.state = {'entries': {}, 'armed': False}
        self.api = FakeMeta()
        self.make(FIRST - timedelta(days=4))
        redirect = contextlib.redirect_stdout(io.StringIO())
        redirect.__enter__()
        self.addCleanup(redirect.__exit__, None, None, None)

    def make(self, now):
        self.api.now = now
        self.publisher = TavernPublisher(self.queue, self.state, lambda: None, lambda name: 'https://example.invalid/'+name,
            lambda entry: b'x' * entry['video']['bytes'], {'id': 'page', 'access_token': 'fixture'}, 'ig',
            get=self.api.get, post=self.api.post, upload=self.api.upload, now=now, sleep=lambda seconds: None)

    def phases(self, platform):
        return [self.state['entries'].get(e['id'], {}).get(platform, {}).get('phase') for e in self.queue['entries']]

    def test_batch_files(self):
        self.assertEqual(batch_files('batch01'), ('tavern-reel-queue-batch01.json', 'publish-tavern-reels-batch01.yml'))
        with self.assertRaises(RuntimeError):
            batch_files('month01')

    def test_validation_rejects_shared_captions_and_bad_spacing(self):
        same = queue_fixture()
        same['entries'][0]['captions']['instagram'] = same['entries'][0]['captions']['facebook']
        with self.assertRaises(RuntimeError):
            validate_queue(same)
        gap = queue_fixture()
        gap['entries'][1]['publishAt'] = iso(FIRST + timedelta(days=6))
        with self.assertRaises(RuntimeError):
            validate_queue(gap)

    def test_arm_schedules_within_29_days_and_tops_up_later(self):
        self.publisher.arm()
        # Nov 10 arm: the fifth Reel (Dec 12) is 32 days out and waits.
        self.assertEqual(self.phases('facebook'), ['scheduled'] * 4 + ['queued'])
        self.assertEqual(self.phases('instagram'), ['queued'] * 5)
        self.assertEqual(self.api.count('POST', 'page/video_reels', upload_phase='finish'), 4)
        self.make(FIRST + timedelta(minutes=30))
        self.publisher.run_due()
        self.assertEqual(self.phases('facebook'), ['published'] + ['scheduled'] * 4)
        self.assertEqual(self.phases('instagram'), ['published'] + ['queued'] * 4)
        self.assertEqual(self.api.count('POST', 'page/video_reels', upload_phase='finish'), 5)
        posted = [c for c in self.api.calls if c[0] == 'POST' and c[1] == 'ig/media'][0][2]
        self.assertEqual(posted['caption'], 'Instagram tavern 1 #DnD')
        self.assertEqual(posted['video_url'], 'https://example.invalid/tavern-1.mp4')

    def test_repeated_runs_never_post_twice(self):
        self.publisher.arm()
        for minutes in (30, 60, 90):
            self.make(FIRST + timedelta(minutes=minutes))
            self.publisher.run_due()
        self.assertEqual(self.api.count('POST', 'ig/media_publish'), 1)
        self.assertEqual(self.api.count('POST', 'page/video_reels', upload_phase='finish'), 5)

    def test_lost_facebook_finish_reconciles_without_resending(self):
        self.api.lose_finish = True
        with self.assertRaises(RuntimeError):
            self.publisher.arm()
        self.assertEqual(self.phases('facebook')[0], 'scheduling')
        self.api.lose_finish = False
        self.publisher.arm()
        self.assertEqual(self.phases('facebook'), ['scheduled'] * 4 + ['queued'])
        self.assertEqual(self.api.count('POST', 'page/video_reels', upload_phase='finish'), 4)  # 1 lost + 3 more; the lost one is not resent
        self.assertEqual(len(self.api.videos), 4)

    def test_lost_instagram_publish_is_recovered(self):
        self.publisher.arm()
        self.make(FIRST + timedelta(minutes=30))
        self.api.fail_publish = 'after'
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()
        self.api.fail_publish = None
        self.make(FIRST + timedelta(minutes=60))
        self.publisher.run_due()
        self.assertEqual(self.phases('instagram')[0], 'published')
        self.assertEqual(self.api.count('POST', 'ig/media_publish'), 1)

    def test_ambiguous_instagram_publish_stops(self):
        self.publisher.arm()
        self.make(FIRST + timedelta(minutes=30))
        self.api.fail_publish = 'before'
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()
        self.api.fail_publish = None
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()
        self.assertEqual(self.phases('instagram')[0], 'needs_review')
        self.assertEqual(self.api.count('POST', 'ig/media_publish'), 1)

    def test_run_due_requires_arming(self):
        self.make(FIRST + timedelta(minutes=30))
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()


if __name__ == '__main__':
    unittest.main()
