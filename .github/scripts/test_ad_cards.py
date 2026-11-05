import contextlib
import copy
import io
import unittest
from datetime import datetime, timedelta, timezone

from publish_ad_cards import AdPublisher, batch_files, validate_queue
from publish_npc_carousels import iso, timestamp

UTC = timezone.utc
FIRST = datetime(2026, 11, 11, 18, tzinfo=UTC)


def queue_fixture(count=4):
    entries = []
    for index in range(count):
        identifier = f'ad-{index+1}'
        entries.append({'id':identifier, 'day':index+1, 'approved':True, 'publishAt':iso(FIRST+timedelta(days=7*index)),
            'captions':{'facebook':f'Facebook ad {index+1}', 'instagram':f'Instagram ad {index+1}'},
            'images':[{'filename':identifier+'.jpg', 'sha256':'a'*64, 'width':1080, 'height':1350, 'alt':f'Ad {index+1}'}]})
    return {'schemaVersion':1, 'id':'ad-of-the-week-month01', 'approved':True, 'timezone':'America/Chicago', 'expectedInstagramUsername':'beholdersgazette', 'entries':entries}


class FakeMeta:
    def __init__(self):
        self.calls = []
        self.sequence = 0
        self.scheduled = {}
        self.media = {}
        self.containers = {}
        self.now = FIRST
        self.fail_publish = None
        self.publications = 0

    def identifier(self, prefix):
        self.sequence += 1
        return prefix + str(self.sequence)

    def get(self, path, params, token):
        self.calls.append(('GET', path, copy.deepcopy(params)))
        if path == 'page/scheduled_posts':
            return {'data':list(self.scheduled.values())}
        if path in self.scheduled:
            item = copy.deepcopy(self.scheduled[path])
            item['is_published'] = timestamp(item['scheduled_publish_time']) <= self.now
            return item
        if path == 'ig/media':
            return {'data':list(self.media.values())}
        if path in self.media:
            return self.media[path]
        if path in self.containers:
            return {'status_code':'FINISHED'}
        raise AssertionError('Unexpected GET: ' + path)

    def post(self, path, data, token):
        self.calls.append(('POST', path, copy.deepcopy(data)))
        if path == 'page/photos':
            return {'id':self.identifier('photo')}
        if path == 'page/feed':
            identifier = self.identifier('fbpost')
            self.scheduled[identifier] = {'id':identifier, 'message':data['message'], 'scheduled_publish_time':data['scheduled_publish_time']}
            return {'id':identifier}
        if path == 'ig/media':
            if 'is_carousel_item' in data or 'children' in data:
                raise AssertionError('Ads must post as a single image.')
            identifier = self.identifier('container')
            self.containers[identifier] = copy.deepcopy(data)
            return {'id':identifier}
        if path == 'ig/media_publish':
            self.publications += 1
            identifier = self.identifier('igpost')
            container = self.containers[data['creation_id']]
            if self.fail_publish != 'before':
                self.media[identifier] = {'id':identifier, 'caption':container['caption'], 'timestamp':iso(self.now), 'media_type':'IMAGE', 'permalink':'https://example.invalid/'+identifier}
            if self.fail_publish:
                raise RuntimeError('Instagram response lost')
            return {'id':identifier}
        raise AssertionError('Unexpected POST: ' + path)


class AdPublisherTests(unittest.TestCase):
    def setUp(self):
        self.queue = queue_fixture()
        self.state = {'entries':{}, 'armed':False}
        self.api = FakeMeta()
        self.publisher = AdPublisher(self.queue, self.state, lambda: None, lambda name: 'https://example.invalid/'+name,
            {'id':'page', 'access_token':'fixture'}, 'ig', get=self.api.get, post=self.api.post, now=FIRST-timedelta(days=6), sleep=lambda seconds: None)
        self.api.now = self.publisher.now
        redirect = contextlib.redirect_stdout(io.StringIO())
        redirect.__enter__()
        self.addCleanup(redirect.__exit__, None, None, None)

    def set_now(self, now):
        self.publisher.now = self.api.now = now

    def test_queue_validation(self):
        self.assertEqual(len(validate_queue(self.queue)['entries']), 4)
        for change in (lambda q: q['entries'][0].update(approved=False),
                       lambda q: q['entries'][1].update(publishAt=iso(FIRST+timedelta(days=1))),
                       lambda q: q['entries'][0]['images'].append(dict(q['entries'][0]['images'][0])),
                       lambda q: q['entries'][0]['images'][0].update(filename='other.jpg'),
                       lambda q: q.update(id='persons-of-interest-week01'),
                       lambda q: q.update(expectedInstagramUsername='someone-else')):
            bad = copy.deepcopy(self.queue)
            change(bad)
            with self.assertRaises(RuntimeError):
                validate_queue(bad)
        with self.assertRaises(RuntimeError):
            validate_queue(queue_fixture(6))
        with self.assertRaises(RuntimeError):
            batch_files('week02')
        self.assertEqual(batch_files('month01'), ('ad-card-queue-month01.json', 'publish-ad-cards-month01.yml'))
        self.assertEqual(batch_files('month01', 'map'), ('map-card-queue-month01.json', 'publish-map-cards-month01.yml'))
        with self.assertRaises(RuntimeError):
            batch_files('month01', 'poster')
        maps = queue_fixture()
        maps['id'] = 'map-of-the-week-month01'
        self.assertEqual(len(validate_queue(maps)['entries']), 4)
        maps['id'] = 'poster-of-the-week-month01'
        with self.assertRaises(RuntimeError):
            validate_queue(maps)

    def test_arm_schedules_one_photo_per_facebook_post(self):
        self.publisher.arm()
        self.assertTrue(self.state['armed'])
        photos = [call for call in self.api.calls if call[1] == 'page/photos']
        feeds = [call for call in self.api.calls if call[1] == 'page/feed']
        self.assertEqual((len(photos), len(feeds)), (4, 4))
        self.assertEqual(feeds[2][2]['scheduled_publish_time'], int((FIRST+timedelta(days=14)).timestamp()))
        self.assertTrue(all(self.state['entries'][f'ad-{i}']['facebook']['phase'] == 'scheduled' for i in range(1, 5)))
        self.publisher.arm()  # Re-arming confirms instead of posting again.
        self.assertEqual(len([call for call in self.api.calls if call[1] == 'page/feed']), 4)

    def test_run_due_publishes_only_the_due_ad_once(self):
        self.publisher.arm()
        self.set_now(FIRST + timedelta(days=7, minutes=10))
        self.publisher.run_due()
        self.assertEqual(self.api.publications, 1)
        self.assertEqual(self.state['entries']['ad-2']['instagram']['phase'], 'published')
        self.assertEqual(self.state['entries']['ad-1']['instagram']['phase'], 'queued')
        self.publisher.run_due()
        self.assertEqual(self.api.publications, 1)

    def test_lost_publish_response_recovers_without_duplicate(self):
        self.publisher.arm()
        self.set_now(FIRST + timedelta(minutes=10))
        self.api.fail_publish = 'after'
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()
        self.api.fail_publish = None
        self.publisher.run_due()
        self.assertEqual(self.api.publications, 1)
        self.assertEqual(self.state['entries']['ad-1']['instagram']['phase'], 'published')

    def test_unconfirmed_publish_stops_for_review(self):
        self.publisher.arm()
        self.set_now(FIRST + timedelta(minutes=10))
        self.api.fail_publish = 'before'
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()
        self.api.fail_publish = None
        with self.assertRaises(RuntimeError):
            self.publisher.run_due()
        self.assertEqual(self.state['entries']['ad-1']['instagram']['phase'], 'needs_review')
        self.assertEqual(self.api.publications, 1)


if __name__ == '__main__':
    unittest.main()
