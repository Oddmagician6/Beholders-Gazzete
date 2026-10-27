"""Publish one approved local Reel staged as a temporary GitHub Release asset."""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

GRAPH = "https://graph.facebook.com/v26.0"
SITE = "https://gazette.ashforgestudio.com"
MAX_WAIT_SECONDS = 15 * 60
POLL_SECONDS = 15


def fail_http(error):
    try:
        payload = json.loads(error.read().decode("utf-8", errors="replace"))
        detail = payload.get("error", {}).get("message", "")
        code = payload.get("error", {}).get("code")
    except (ValueError, AttributeError):
        detail, code = "", None
    suffix = f" (Meta error {code})" if code is not None else ""
    # Never include request URLs or authorization data in logs.
    raise RuntimeError(f"Meta Graph API returned HTTP {error.code}{suffix}: {detail or 'request failed'}")


def request_json(request):
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        fail_http(error)
    except urllib.error.URLError as error:
        raise RuntimeError(f"Could not reach Meta: {error.reason}") from None


def graph_post(path, data, token):
    body = {**data, "access_token": token}
    request = urllib.request.Request(
        f"{GRAPH}/{path.lstrip('/')}",
        data=urllib.parse.urlencode(body).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    return request_json(request)


def graph_get(path, params, token):
    query = urllib.parse.urlencode({**params, "access_token": token})
    request = urllib.request.Request(f"{GRAPH}/{path.lstrip('/')}?{query}")
    return request_json(request)


BASE_TAGS = ["#DnD", "#DungeonsAndDragons", "#TTRPG", "#FantasyHumor"]
MAX_TAGS = 8


def facebook_tags(extra):
    """Standard D&D tags plus the story tags chosen for this Reel."""
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


def wait_until_ready(video_id, token, scheduled, scheduled_publish_time=None):
    deadline = time.monotonic() + MAX_WAIT_SECONDS
    while time.monotonic() < deadline:
        payload = graph_get(video_id, {"fields": "status,scheduled_publish_time,published"}, token)
        status = payload.get("status") or {}
        video_state = str(status.get("video_status", "")).lower()
        phase_states = [
            str((status.get(name) or {}).get("status", "")).lower()
            for name in ("uploading_phase", "processing_phase", "publishing_phase")
        ]
        if video_state in {"error", "failed"} or "error" in phase_states or "failed" in phase_states:
            raise RuntimeError(f"Meta reported a failed Reel state: {video_state or phase_states}")
        publishing_state = phase_states[-1]
        meta_schedule = payload.get("scheduled_publish_time")
        schedule_matches = False
        if scheduled and meta_schedule:
            try:
                if isinstance(meta_schedule, (int, float)):
                    meta_epoch = int(meta_schedule)
                else:
                    meta_epoch = int(datetime.fromisoformat(str(meta_schedule).replace("Z", "+00:00")).timestamp())
                schedule_matches = abs(meta_epoch - int(scheduled_publish_time)) <= 60
            except (TypeError, ValueError, OverflowError):
                pass
        if scheduled and (video_state == "scheduled" or publishing_state == "scheduled" or (schedule_matches and payload.get("published") is False)):
            print(f"Facebook confirmed Reel scheduling. Reel video ID: {video_id}")
            return
        if not scheduled and (video_state in {"published", "live"} or (publishing_state == "complete" and phase_states[1] == "complete")):
            print(f"Facebook confirmed publication. Reel video ID: {video_id}")
            return
        print(f"Reel {video_id}: status={video_state or 'processing'}, phases={phase_states}")
        time.sleep(POLL_SECONDS)
    outcome = "schedule" if scheduled else "publication"
    raise RuntimeError(f"Meta accepted Reel {video_id}, but {outcome} was not confirmed within 15 minutes. Check the Page before retrying.")


def confirm_existing_schedule(video_id, scheduled_publish_time, token):
    if not re.fullmatch(r"[0-9]+", video_id):
        raise RuntimeError("VIDEO_ID must be a numeric Facebook video ID.")
    try:
        expected = int(scheduled_publish_time)
    except (TypeError, ValueError):
        raise RuntimeError("SCHEDULED_PUBLISH_TIME must be a Unix timestamp in seconds.") from None
    payload = graph_get(video_id, {"fields": "status,scheduled_publish_time,published"}, token)
    status = payload.get("status") or {}
    if payload.get("published") is True or str(status.get("video_status", "")).lower() in {"published", "live"}:
        print(f"Facebook confirms Reel is published. Reel video ID: {video_id}")
        return "published"
    actual = payload.get("scheduled_publish_time")
    try:
        if isinstance(actual, (int, float)):
            actual_epoch = int(actual)
        else:
            actual_epoch = int(datetime.fromisoformat(str(actual).replace("Z", "+00:00")).timestamp())
    except (TypeError, ValueError, OverflowError):
        actual_epoch = None
    if actual_epoch is not None and abs(actual_epoch - expected) <= 60 and payload.get("published") is False:
        print(f"Facebook confirms Reel is scheduled for {actual}. Reel video ID: {video_id}")
        return "scheduled"
    raise RuntimeError(f"Meta did not report the expected schedule for Reel {video_id}; status={status}, scheduled_publish_time={actual!r}, published={payload.get('published')!r}.")


def publish(article_id, video_path, extra_tags="", scheduled_publish_time=""):
    page_id = os.environ.get("FB_PAGE_ID", "").strip()
    token = os.environ.get("FB_PAGE_TOKEN", "").strip()
    if not page_id or not token:
        raise RuntimeError("FB_PAGE_ID and FB_PAGE_TOKEN must be configured as repository secrets.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", article_id):
        raise RuntimeError("Invalid article ID.")

    repo_root = Path(__file__).resolve().parents[2]
    articles = json.loads((repo_root / "articles.json").read_text(encoding="utf-8"))["articles"]
    article = next((item for item in articles if item.get("id") == article_id), None)
    if article is None:
        raise RuntimeError(f"Article not found: {article_id}")
    if article.get("real"):
        raise RuntimeError("Real-news articles are excluded from Reel publishing.")
    video = Path(video_path)
    if not video.is_file() or video.stat().st_size == 0:
        raise RuntimeError("The staged Reel MP4 is missing or empty.")

    article_url = f"{SITE}/a/{article_id}"
    tags = facebook_tags(extra_tags)
    description = f"{article_url}\n\n{' '.join(tags)}"
    scheduled = bool(scheduled_publish_time)
    if scheduled:
        try:
            publish_at = int(scheduled_publish_time)
        except ValueError:
            raise RuntimeError("SCHEDULED_PUBLISH_TIME must be a Unix timestamp in seconds.") from None
        if publish_at < int(time.time()) + 600:
            raise RuntimeError("Scheduled publish time must be at least 10 minutes in the future.")
        if publish_at > int(time.time()) + 29 * 24 * 60 * 60:
            raise RuntimeError("Facebook Page Reels can only be scheduled up to 29 days ahead.")
    print(f"Scheduling Facebook Page Reel: {article['title']}" if scheduled else f"Publishing Facebook Page Reel: {article['title']}")
    print(f"Description: {article_url} {' '.join(tags)}")

    session = graph_post(f"{page_id}/video_reels", {"upload_phase": "start"}, token)
    video_id = str(session.get("video_id", ""))
    upload_url = str(session.get("upload_url", ""))
    parsed_upload_url = urlparse(upload_url)
    if not video_id or parsed_upload_url.scheme != "https" or parsed_upload_url.hostname != "rupload.facebook.com":
        raise RuntimeError("Meta returned an invalid Reel upload session.")

    video_bytes = video.read_bytes()
    upload = urllib.request.Request(
        upload_url,
        data=video_bytes,
        headers={
            "Authorization": f"OAuth {token}",
            "offset": "0",
            "file_size": str(len(video_bytes)),
            "Content-Type": "application/octet-stream",
        },
        method="POST",
    )
    response = request_json(upload)
    if response.get("success") is not True:
        raise RuntimeError("Meta did not confirm the Reel video upload.")

    finish = graph_post(
        f"{page_id}/video_reels",
        {
            "video_id": video_id,
            "upload_phase": "finish",
            "video_state": "SCHEDULED" if scheduled else "PUBLISHED",
            "title": article["title"],
            "description": description,
            **({"scheduled_publish_time": publish_at} if scheduled else {}),
        },
        token,
    )
    if finish.get("success") is not True:
        raise RuntimeError("Meta did not confirm the Reel publish request.")
    wait_until_ready(video_id, token, scheduled, publish_at if scheduled else None)


def main():
    operation = os.environ.get("OPERATION", "publish").strip()
    if operation == "confirm_schedule":
        page_id = os.environ.get("FB_PAGE_ID", "").strip()
        token = os.environ.get("FB_PAGE_TOKEN", "").strip()
        video_id = os.environ.get("VIDEO_ID", "").strip()
        scheduled_publish_time = os.environ.get("SCHEDULED_PUBLISH_TIME", "").strip()
        if not page_id or not token:
            raise RuntimeError("FB_PAGE_ID and FB_PAGE_TOKEN must be configured as repository secrets.")
        confirm_existing_schedule(video_id, scheduled_publish_time, token)
        return
    if operation != "publish":
        raise RuntimeError("OPERATION must be publish or confirm_schedule.")
    article_id = os.environ.get("ARTICLE_ID", "").strip()
    video_path = os.environ.get("VIDEO_PATH", "").strip()
    if not article_id or not video_path:
        raise RuntimeError("ARTICLE_ID and VIDEO_PATH are required.")
    publish(article_id, video_path, os.environ.get("HASHTAGS", ""), os.environ.get("SCHEDULED_PUBLISH_TIME", "").strip())


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        print(f"Facebook Reel publisher: {error}", file=sys.stderr)
        sys.exit(1)
