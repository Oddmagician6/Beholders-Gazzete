"""Publish due Instagram Reels from .github/instagram-reels.json.

Instagram's API has no scheduling, so a scheduled workflow runs this every half
hour. Each run publishes at most one due Reel, oldest first. A Reel counts as
done once its staging Release is gone or Instagram already shows a post whose
caption links its article, so late or repeated runs never post it twice.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from meta_page import get_page_context, graph_get
from publish_instagram_reel import SITE, instagram_tags, publish

UTC = timezone.utc
QUEUE = Path(__file__).resolve().parents[1] / "instagram-reels.json"
# Spaces out a backlog (e.g. after GitHub skips runs) instead of posting it all at once.
MIN_GAP = timedelta(minutes=60)


def timestamp(value):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value or ""):
        raise RuntimeError(f"publishAt must be UTC like 2026-11-03T16:00:00Z, got {value!r}.")
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)


def load_queue(path=QUEUE):
    reels = json.loads(path.read_text(encoding="utf-8")).get("reels", [])
    seen = set()
    for reel in reels:
        article_id = reel.get("article_id", "")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", article_id):
            raise RuntimeError(f"Invalid article ID: {article_id!r}")
        if article_id in seen:
            raise RuntimeError(f"Article queued twice: {article_id}")
        seen.add(article_id)
        if not re.fullmatch(r"reel-stage-[a-z0-9-]+", reel.get("release_tag", "")):
            raise RuntimeError(f"{article_id}: release_tag must start with reel-stage-.")
        if reel.get("custom_artwork_confirmed") is not True:
            raise RuntimeError(f"{article_id}: custom_artwork_confirmed must be true.")
        timestamp(reel.get("publishAt"))
        instagram_tags(reel.get("hashtags", ""))
    return reels


class Releases:
    """Staging Releases through the gh CLI (GH_TOKEN comes from the workflow)."""

    def __init__(self, repo):
        self.repo = repo

    def has_video(self, tag):
        result = subprocess.run(["gh", "release", "view", tag, "--repo", self.repo, "--json", "assets"], capture_output=True, text=True)
        if result.returncode != 0:
            if "not found" in result.stderr.lower():
                return False
            raise RuntimeError(f"Could not read Release {tag}: {result.stderr.strip()}")
        names = [asset.get("name") for asset in json.loads(result.stdout).get("assets", [])]
        if "render.mp4" not in names:
            raise RuntimeError(f"Release {tag} has no render.mp4 asset.")
        return True

    def delete(self, tag):
        subprocess.run(["gh", "release", "delete", tag, "--repo", self.repo, "--cleanup-tag", "--yes"], check=True)


def recent_media(page_id, user_token):
    page = get_page_context(page_id, user_token)
    ig_user_id = str((page.get("instagram_business_account") or {}).get("id", ""))
    if not ig_user_id:
        raise RuntimeError("The configured Facebook Page has no linked Instagram professional account.")
    payload = graph_get(f"{ig_user_id}/media", {"fields": "caption,timestamp", "limit": 50}, page["access_token"])
    media = []
    for item in payload.get("data", []):
        posted = datetime.strptime(item["timestamp"], "%Y-%m-%dT%H:%M:%S%z").astimezone(UTC)
        media.append({"caption": item.get("caption", ""), "timestamp": posted})
    return media


def already_posted(article_id, media):
    url = f"{SITE}/a/{article_id}"
    return any(re.search(re.escape(url) + r"(?![A-Za-z0-9_-])", item["caption"]) for item in media)


def run(reels, now, releases, fetch_media, publish_reel, repo):
    due = sorted((reel for reel in reels if timestamp(reel["publishAt"]) <= now), key=lambda reel: reel["publishAt"])
    pending = [reel for reel in due if releases.has_video(reel["release_tag"])]
    if not pending:
        print("No Instagram Reels due.")
        return None
    media = fetch_media()
    for reel in pending:
        if already_posted(reel["article_id"], media):
            print(f"{reel['article_id']}: already on Instagram; removing its staging Release.")
            releases.delete(reel["release_tag"])
            continue
        latest = max((item["timestamp"] for item in media), default=None)
        if latest is not None and now - latest < MIN_GAP:
            print(f"{reel['article_id']}: due, but Instagram posted at {latest:%H:%M} UTC; waiting for a later run to keep posts spaced.")
            return None
        video_url = f"https://github.com/{repo}/releases/download/{reel['release_tag']}/render.mp4"
        media_id = publish_reel(reel["article_id"], video_url, reel.get("hashtags", ""), reel.get("share_to_feed", True) is not False)
        releases.delete(reel["release_tag"])
        print(f"{reel['article_id']}: published (due {reel['publishAt']}). Instagram media ID: {media_id}")
        return reel["article_id"]
    return None


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--validate":
        reels = load_queue(Path(sys.argv[2]))
        print(f"Queue OK: {len(reels)} Reels.")
        return
    page_id = os.environ.get("FB_PAGE_ID", "").strip()
    user_token = os.environ.get("FB_PAGE_TOKEN", "").strip()
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not page_id or not user_token or not repo:
        raise RuntimeError("FB_PAGE_ID, FB_PAGE_TOKEN, and GITHUB_REPOSITORY are required.")
    run(load_queue(), datetime.now(UTC), Releases(repo), lambda: recent_media(page_id, user_token), publish, repo)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f"Instagram Reel queue: {error}", file=sys.stderr)
        sys.exit(1)
