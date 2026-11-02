import copy
import contextlib
import io
import json
import unittest
from datetime import datetime, timedelta, timezone

from publish_npc_carousels import Publisher, StateError, iso, jpeg_size, timestamp, validate_queue

UTC = timezone.utc
FIRST = datetime(2026, 11, 2, 15, tzinfo=UTC)


def queue_fixture():
    entries = []
    for index in range(7):
        entries.append({'id':f'week01-day{index+1:02d}-npc', 'day':index+1, 'name':f'NPC {index+1}', 'approved':True,
            'publishAt':iso(FIRST+timedelta(days=index)), 'captions':{'facebook':f'Facebook character {index+1}', 'instagram':f'Instagram character {index+1} @beholdersgazette'},
            'images':[{'filename':f'{index+1:02d}-npc-{name}.jpg','sha256':'a'*64,'width':1080,'height':1350,'alt':f'Card {i}'} for i,name in enumerate(('01-meet','02-play','03-hook'),1)]})
    return {'schemaVersion':1,'id':'fixture','approved':True,'timezone':'America/Chicago','expectedInstagramUsername':'beholdersgazette','entries':entries}


class FakeMeta:
    def __init__(self):
        self.calls = []
        self.sequence = 0
        self.scheduled = {}
        self.media = {}
        self.parents = {}
        self.now = FIRST
        self.fail_feed = None
        self.fail_publish = None
        self.fail_facebook_reads = False
        self.publications = 0

    def identifier(self, prefix):
        self.sequence += 1
        return prefix + str(self.sequence)

    def get(self, path, params, token):
        self.calls.append(('GET',path,copy.deepcopy(params)))
        if path == 'page/scheduled_posts':
            return {'data':list(self.scheduled.values())}
        if path in self.scheduled:
            if self.fail_facebook_reads:
                raise RuntimeError('Facebook temporarily unavailable')
            item = copy.deepcopy(self.scheduled[path])
            item['is_published'] = timestamp(item['scheduled_publish_time']) <= self.now
            return item
        if path == 'ig/media':
            return {'data':list(self.media.values())}
        if path in self.media:
            return self.media[path]
        if path in self.parents:
            return {'status_code':'FINISHED'}
        raise AssertionError('Unexpected GET: '+path)

    def post(self, path, data, token):
        self.calls.append(('POST',path,copy.deepcopy(data)))
        if path == 'page/photos':
            return {'id':self.identifier('photo')}
        if path == 'page/feed':
            identifier = self.identifier('fbpost')
            if self.fail_feed != 'before':
                self.scheduled[identifier] = {'id':identifier, 'message':data['message'], 'scheduled_publish_time':data['scheduled_publish_time']}
            if self.fail_feed:
                raise RuntimeError('Facebook response lost')
            return {'id':identifier}
        if path == 'ig/media':
            identifier = self.identifier('container')
            if data.get('media_type') == 'CAROUSEL':
                self.parents[identifier] = copy.deepcopy(data)
            return {'id':identifier}
        if path == 'ig/media_publish':
            self.publications += 1
            identifier = self.identifier('igpost')
            parent = self.parents[data['creation_id']]
            if self.fail_publish != 'before':
                self.media[identifier] = {'id':identifier,'caption':parent['caption'],'timestamp':iso(self.now),'media_type':'CAROUSEL_ALBUM','permalink':'https://example.invalid/'+identifier}
            if self.fail_publish:
                raise RuntimeError('Instagram response lost')
            return {'id':identifier}
        raise AssertionError('Unexpected POST: '+path)


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.queue = queue_fixture()
        self.state = {'entries':{},'armed':False}
        self.snapshots = []
        self.api = FakeMeta()
        self.publisher = Publisher(self.queue,self.state,lambda:self.snapshots.append(copy.deepcopy(self.state)),lambda name:'https://example.invalid/'+name,
            {'id':'page','access_token':'fixture'},'ig',get=self.api.get,post=self.api.post,now=FIRST-timedelta(hours=12),sleep=lambda seconds:None)
        self.api.now = self.publisher.now
        redirect = contextlib.redirect_stdout(io.StringIO())
        redirect.__enter__()
        self.addCleanup(redirect.__exit__,None,None,None)

    def arm(self):
        self.publisher.arm()

    def set_now(self, now):
        self.publisher.now = self.api.now = now

    def test_queue_rejects_unapproved_duplicate_and_reordered_assets(self):
        self.assertEqual(len(validate_queue(self.queue)['entries']),7)
        bad = copy.deepcopy(self.queue); bad['entries'][0]['approved'] = False
        with self.assertRaises(RuntimeError): validate_queue(bad)
        bad = copy.deepcopy(self.queue); bad['entries'][1]['id'] = bad['entries'][0]['id']
        with self.assertRaises(RuntimeError): validate_queue(bad)
        bad = copy.deepcopy(self.queue); bad['entries'][0]['images'].reverse()
        with self.assertRaises(RuntimeError): validate_queue(bad)
        bad = copy.deepcopy(self.queue); bad['entries'][0]['images'][0]['filename'] = '../escape.jpg'
        with self.assertRaises(RuntimeError): validate_queue(bad)

    def test_dates_and_instagram_destination_are_validated(self):
        for field,value in [('timezone','Europe/London'),('expectedInstagramUsername','wrong-account')]:
            bad=copy.deepcopy(self.queue);bad[field]=value
            with self.assertRaises(RuntimeError):validate_queue(bad)
        bad=copy.deepcopy(self.queue);bad['entries'][1]['publishAt']=bad['entries'][0]['publishAt']
        with self.assertRaises(RuntimeError):validate_queue(bad)
        with self.assertRaises(RuntimeError):timestamp(None)
        with self.assertRaises(RuntimeError):timestamp('2026-11-02T09:00:00')

    def test_arm_schedules_seven_facebook_posts_without_publishing_instagram(self):
        self.arm()
        self.assertTrue(self.state['armed'])
        self.assertEqual(len(self.api.scheduled),7)
        self.assertEqual(len([c for c in self.api.calls if c[:2]==('POST','page/photos')]),21)
        self.assertFalse(any(c[0]=='POST' and c[1].startswith('ig/') for c in self.api.calls))
        for call in self.api.calls:
            if call[:2]==('POST','page/feed'):
                self.assertEqual(call[2]['published'],'false')
                self.assertEqual(len(json.loads(call[2]['attached_media'])),3)
        self.assertTrue(any(s['entries'][self.queue['entries'][0]['id']]['facebook']['phase']=='scheduling' for s in self.snapshots))

    def test_arm_rejects_past_dates_before_uploading_anything(self):
        self.set_now(FIRST)
        with self.assertRaises(RuntimeError):self.arm()
        self.assertFalse(any(c[0]=='POST' for c in self.api.calls))

    def test_rearming_does_not_create_duplicate_facebook_posts(self):
        self.arm();self.arm()
        self.assertEqual(len(self.api.scheduled),7)
        self.assertEqual(len([c for c in self.api.calls if c[:2]==('POST','page/feed')]),7)

    def test_facebook_lost_response_recovers_existing_schedule(self):
        entry=self.queue['entries'][0]
        self.api.fail_feed='after'
        with self.assertRaises(RuntimeError):self.publisher.schedule_facebook(entry)
        self.assertEqual(self.publisher.slot(entry,'facebook')['phase'],'scheduling')
        self.api.fail_feed=None
        self.publisher.schedule_facebook(entry)
        self.assertEqual(len(self.api.scheduled),1)
        self.assertEqual(len([c for c in self.api.calls if c[:2]==('POST','page/feed')]),1)

    def test_facebook_ambiguous_schedule_is_not_blindly_resubmitted(self):
        entry=self.queue['entries'][0]
        self.api.fail_feed='before'
        with self.assertRaises(RuntimeError):self.publisher.schedule_facebook(entry)
        self.api.fail_feed=None
        with self.assertRaisesRegex(RuntimeError,'ambiguous'):self.publisher.schedule_facebook(entry)
        self.assertEqual(len([c for c in self.api.calls if c[:2]==('POST','page/feed')]),1)

    def test_due_window_never_publishes_early_or_after_four_hours(self):
        with self.assertRaises(RuntimeError):self.publisher.due()
        self.arm()
        self.set_now(FIRST-timedelta(seconds=1));self.assertEqual(self.publisher.due(),[])
        self.set_now(FIRST);self.assertEqual([p['day'] for p in self.publisher.due()],[1])
        self.set_now(FIRST+timedelta(hours=4,seconds=1));self.assertEqual(self.publisher.due(),[])

    def test_instagram_carousel_order_caption_alt_and_repeat_run(self):
        self.arm();self.set_now(FIRST+timedelta(minutes=1))
        self.publisher.run_due();self.publisher.run_due()
        self.assertEqual(self.api.publications,1)
        children=[c for c in self.api.calls if c[:2]==('POST','ig/media') and c[2].get('is_carousel_item')=='true']
        self.assertEqual([c[2]['image_url'].split('/')[-1] for c in children],[i['filename'] for i in self.queue['entries'][0]['images']])
        self.assertTrue(all(c[2]['alt_text'] for c in children))
        self.assertEqual(next(iter(self.api.parents.values()))['caption'],self.queue['entries'][0]['captions']['instagram'])
        self.assertEqual(self.publisher.slot(self.queue['entries'][0],'instagram')['phase'],'published')

    def test_instagram_lost_response_recovers_without_duplicate(self):
        self.arm();self.set_now(FIRST)
        entry=self.queue['entries'][0]
        self.api.fail_publish='after'
        with self.assertRaises(RuntimeError):self.publisher.publish_instagram(entry)
        self.api.fail_publish=None
        self.publisher.publish_instagram(entry)
        self.assertEqual(self.api.publications,1)
        self.assertEqual(self.publisher.slot(entry,'instagram')['phase'],'published')

    def test_instagram_ambiguous_publish_stops_for_review(self):
        self.arm();self.set_now(FIRST)
        entry=self.queue['entries'][0]
        self.api.fail_publish='before'
        with self.assertRaises(RuntimeError):self.publisher.publish_instagram(entry)
        self.api.fail_publish=None
        with self.assertRaisesRegex(RuntimeError,'ambiguous'):self.publisher.publish_instagram(entry)
        self.assertEqual(self.api.publications,1)
        self.assertEqual(self.publisher.slot(entry,'instagram')['phase'],'needs_review')

    def test_platform_read_failure_does_not_prevent_other_platform(self):
        self.arm();self.set_now(FIRST)
        self.api.fail_facebook_reads=True
        with self.assertRaisesRegex(RuntimeError,'Facebook temporarily'):self.publisher.run_due()
        self.assertEqual(self.api.publications,1)

    def test_state_write_failure_prevents_external_mutation(self):
        def broken(): raise StateError('State persistence unavailable')
        self.publisher.save=broken
        with self.assertRaises(StateError):self.publisher.schedule_facebook(self.queue['entries'][0])
        self.assertFalse(any(c[0]=='POST' for c in self.api.calls))

    def test_jpeg_size_validation(self):
        # Minimal SOF segment sufficient to exercise the dimension parser.
        data=b'\xff\xd8\xff\xc0\x00\x0b\x08'+(1350).to_bytes(2,'big')+(1080).to_bytes(2,'big')+b'\x01\x01\x11\x00'
        self.assertEqual(jpeg_size(data),(1080,1350))
        with self.assertRaises(RuntimeError):jpeg_size(b'not a JPEG')


if __name__=='__main__':
    unittest.main()
