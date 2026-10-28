"""Publish one approved local Reel to the Page-linked Instagram account."""
import json
import os
import re
import sys
import time
from pathlib import Path

from meta_page import get_page_context, graph_get, graph_post

SITE = "https://gazette.ashforgestudio.com"
MAX_WAIT_SECONDS = 15 * 60
POLL_SECONDS = 15
BASE_TAGS = ["#DnD", "#DungeonsAndDragons", "#TTRPG", "#FantasyHumor"]
MAX_TAGS = 8


def instagram_tags(extra):
    tags = list(BASE_TAGS)
    for raw in re.split(r"[\s,]+", extra or ""):
        name = raw.lstrip("#")
        if not name:
            continue
        if not re.fullmatch(r"[A-Za-z0-9_]{1,50}", name):
            raise RuntimeError(f"Invalid hashtag: {raw}")
        tag = f"#{name}"
        if tag.lower() not in {existing.lower() for existing in tags}:
            tags.append(tag)
    if len(tags) > MAX_TAGS:
        raise RuntimeError(f"Too many hashtags: {len(tags)} (limit {MAX_TAGS}, including the {len(BASE_TAGS)} standard tags).")
    return tags


def wait_for_container(container_id, page_token):
    deadline = time.monotonic() + MAX_WAIT_SECONDS
    while time.monotonic() < deadline:
        payload = graph_get(container_id, {"fields": "status_code,status"}, page_token)
        state = str(payload.get("status_code", "")).upper()
        if state == "FINISHED":
            return
        if state in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram reported Reel container state {state}: {payload.get('status', '')}")
        print(f"Instagram Reel container {container_id}: {state or 'processing'}")
        time.sleep(POLL_SECONDS)
    raise RuntimeError(f"Instagram accepted container {container_id}, but processing was not confirmed within 15 minutes. Check Instagram before retrying.")


def publish(article_id, video_url, extra_tags, share_to_feed):
    page_id = os.environ.get("FB_PAGE_ID", "").strip()
    user_token = os.environ.get("FB_PAGE_TOKEN", "").strip()
    if not page_id or not user_token:
        raise RuntimeError("FB_PAGE_ID and FB_PAGE_TOKEN must be configured as repository secrets.")
    if not re.fullmatch(r"[0-9]+", page_id):
        raise RuntimeError("FB_PAGE_ID must be a numeric Facebook Page ID.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", article_id):
        raise RuntimeError("Invalid article ID.")
    if not re.fullmatch(r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/download/reel-stage-[a-z0-9-]+/render\.mp4", video_url):
        raise RuntimeError("VIDEO_URL must be the public render.mp4 asset from a reel-stage-* GitHub Release.")

    repo_root = Path(__file__).resolve().parents[2]
    articles = json.loads((repo_root / "articles.json").read_text(encoding="utf-8"))["articles"]
    article = next((item for item in articles if item.get("id") == article_id), None)
    if article is None:
        raise RuntimeError(f"Article not found: {article_id}")
    if article.get("real"):
        raise RuntimeError("Real-news articles are excluded from Reel publishing.")

    page = get_page_context(page_id, user_token)
    instagram = page.get("instagram_business_account") or {}
    ig_user_id = str(instagram.get("id", ""))
    if not ig_user_id:
        raise RuntimeError("The configured Facebook Page has no linked Instagram professional account. Link a Business or Creator account to the Page first.")
    page_token = page["access_token"]
    profile = graph_get(ig_user_id, {"fields": "id,username"}, page_token)
    if str(profile.get("id", "")) != ig_user_id:
        raise RuntimeError("Meta returned an Instagram account ID that does not match the Page link.")

    tags = instagram_tags(extra_tags)
    caption = f"{SITE}/a/{article_id}\n\n{' '.join(tags)}"
    print(f"Publishing Instagram Reel for {profile.get('username') or ig_user_id}: {article['title']}")
    print(f"Caption: {caption}")

    container = graph_post(
        f"{ig_user_id}/media",
        {
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "share_to_feed": "true" if share_to_feed else "false",
        },
        page_token,
    )
    container_id = str(container.get("id", ""))
    if not container_id:
        raise RuntimeError("Meta did not return an Instagram Reel container ID.")
    wait_for_container(container_id, page_token)

    published = graph_post(f"{ig_user_id}/media_publish", {"creation_id": container_id}, page_token)
    media_id = str(published.get("id", ""))
    if not media_id:
        raise RuntimeError(f"Instagram returned no media ID after publishing container {container_id}. Check Instagram before retrying.")
    print(f"Instagram confirmed Reel publication. Instagram media ID: {media_id}")


def main():
    article_id = os.environ.get("ARTICLE_ID", "").strip()
    video_url = os.environ.get("VIDEO_URL", "").strip()
    share_to_feed = os.environ.get("SHARE_TO_FEED", "true").strip().lower() == "true"
    if not article_id or not video_url:
        raise RuntimeError("ARTICLE_ID and VIDEO_URL are required.")
    publish(article_id, video_url, os.environ.get("HASHTAGS", ""), share_to_feed)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        print(f"Instagram Reel publisher: {error}", file=sys.stderr)
        sys.exit(1)
