import contextlib
import io
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from run_instagram_reel_queue import already_posted, load_queue, run

UTC = timezone.utc
NOW = datetime(2026, 11, 3, 1, 30, tzinfo=UTC)
SITE = "https://gazette.ashforgestudio.com"


def reel(article_id, publish_at):
    return {"article_id": article_id, "release_tag": f"reel-stage-{article_id}", "hashtags": "#Owlbear", "publishAt": publish_at, "custom_artwork_confirmed": True}


class FakeReleases:
    def __init__(self, tags):
        self.tags = set(tags)
        self.deleted = []

    def has_video(self, tag):
        return tag in self.tags

    def delete(self, tag):
        self.tags.discard(tag)
        self.deleted.append(tag)


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.reels = [reel("late-one", "2026-11-02T20:00:00Z"), reel("early-one", "2026-11-02T16:00:00Z"), reel("future-one", "2026-11-03T09:00:00Z")]
        self.releases = FakeReleases(r["release_tag"] for r in self.reels)
        self.media = []
        self.published = []
        self.fetches = 0

    def fetch(self):
        self.fetches += 1
        return self.media

    def publish(self, article_id, video_url, hashtags, share_to_feed):
        self.published.append((article_id, video_url, share_to_feed))
        return "999"

    def go(self, now=NOW):
        with contextlib.redirect_stdout(io.StringIO()):
            return run(self.reels, now, self.releases, self.fetch, self.publish, "owner/repo")

    def test_publishes_only_the_oldest_due_reel_per_run(self):
        self.assertEqual(self.go(), "early-one")
        self.assertEqual(self.published, [("early-one", "https://github.com/owner/repo/releases/download/reel-stage-early-one/render.mp4", True)])
        self.assertEqual(self.releases.deleted, ["reel-stage-early-one"])

    def test_nothing_due_makes_no_meta_requests(self):
        self.assertIsNone(self.go(datetime(2026, 11, 2, 15, tzinfo=UTC)))
        self.assertEqual(self.fetches, 0)
        self.releases.tags.clear()
        self.assertIsNone(self.go())
        self.assertEqual((self.fetches, self.published), (0, []))

    def test_never_posts_a_reel_twice(self):
        self.media = [{"caption": f"{SITE}/a/early-one\n\n#DnD", "timestamp": NOW - timedelta(hours=5)}]
        self.assertEqual(self.go(), "late-one")
        self.assertEqual(self.releases.deleted, ["reel-stage-early-one", "reel-stage-late-one"])
        self.assertEqual([p[0] for p in self.published], ["late-one"])

    def test_article_link_match_is_exact(self):
        media = [{"caption": f"{SITE}/a/early-one-part-two", "timestamp": NOW}]
        self.assertFalse(already_posted("early-one", media))
        self.assertTrue(already_posted("early-one-part-two", media))

    def test_backlog_waits_for_spacing(self):
        self.media = [{"caption": "Persons of Interest", "timestamp": NOW - timedelta(minutes=20)}]
        self.assertIsNone(self.go())
        self.assertEqual(self.published, [])
        self.assertEqual(self.go(NOW + timedelta(minutes=45)), "early-one")

    def test_queue_file_is_valid(self):
        reels = load_queue(Path(__file__).resolve().parents[1] / "instagram-reels.json")
        self.assertEqual(len({r["article_id"] for r in reels}), len(reels))


if __name__ == "__main__":
    unittest.main()
