"""Schedule new Gazette articles as posts on the Facebook Page.

Run by .github/workflows/facebook.yml after a push to main. Finds the articles
added since the previous commit (or the ids given with --ids), drops the
Across the Multiverse ones ("real": true), and schedules each as a link post,
spaced a few hours apart during the day so an edition doesn't land at once.
Posts already scheduled on the Page count: the new ones go after the last of
them, and an article already scheduled (a re-run) is skipped.

Env: FB_PAGE_ID and FB_PAGE_TOKEN (a Meta User Access Token with pages_show_list,
pages_manage_posts, and pages_read_engagement; resolved to a Page token at runtime).
"""
import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

from meta_page import get_page_context

GRAPH = "https://graph.facebook.com/v26.0"
SITE = "https://gazette.ashforgestudio.com"
TZ = ZoneInfo("America/Chicago")
FIRST_DELAY = dt.timedelta(minutes=20)   # Facebook needs at least 10
MIN_GAP = dt.timedelta(hours=1, minutes=30)
MAX_GAP = dt.timedelta(hours=3)
DAY_START, DAY_END = 7, 22               # local hours posts may go out
MAX_AGE_DAYS = 3                         # older articles are re-adds, not news


def load(text):
    return json.loads(text)["articles"]


def new_articles(before):
    now = load(open("articles.json", encoding="utf-8").read())
    if not before or set(before) == {"0"}:
        return []
    try:
        old_text = subprocess.run(["git", "show", f"{before}:articles.json"],
                                  capture_output=True, text=True, encoding="utf-8", check=True).stdout
    except subprocess.CalledProcessError:
        return []   # articles.json didn't exist before
    old = {a["id"] for a in load(old_text)}
    return [a for a in now if a["id"] not in old]


def pick(articles, today):
    keep = []
    for a in articles:
        if a.get("real"):
            continue
        try:
            age = (today - dt.date.fromisoformat(a["date"])).days if today else 0
        except (KeyError, ValueError):
            age = 0
        if age > MAX_AGE_DAYS:
            print(f"skip {a['id']}: dated {a['date']}")
            continue
        keep.append(a)
    # The featured story leads; the rest keep their order in articles.json.
    return sorted(keep, key=lambda a: not a.get("featured"))


def day_open(t):
    """t, or the next moment posting is allowed if t falls overnight."""
    if t.hour < DAY_START:
        return t.replace(hour=DAY_START, minute=0, second=0, microsecond=0)
    if t.hour >= DAY_END:
        return (t + dt.timedelta(days=1)).replace(hour=DAY_START, minute=0, second=0, microsecond=0)
    return t


def slots(n, now, after=None):
    """n post times: the first soon (and a gap past `after`, the last post already
    scheduled), the rest spread to fill the day."""
    start = now + FIRST_DELAY
    if after and after + MIN_GAP > start:
        start = after + MIN_GAP
    start = day_open(start)
    if n == 1:
        return [start]
    end = start.replace(hour=DAY_END, minute=0, second=0, microsecond=0) - dt.timedelta(minutes=30)
    gap = min(MAX_GAP, max(MIN_GAP, (end - start) / (n - 1)))
    times, t = [], start
    for _ in range(n):
        t = day_open(t)
        times.append(t)
        t += gap
    return times


def graph(path, data):
    req = urllib.request.Request(f"{GRAPH}/{path}", data=urllib.parse.urlencode(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Graph API {path}: {e.code} {e.read().decode(errors='replace')}")


def scheduled(page, token):
    """The Page's scheduled posts as (time, message) pairs, or None when it can't read them
    (the token needs pages_read_engagement for this)."""
    out, url = [], f"{GRAPH}/{page}/scheduled_posts?" + urllib.parse.urlencode(
        {"fields": "scheduled_publish_time,message", "limit": 100, "access_token": token})
    try:
        for _ in range(10):
            with urllib.request.urlopen(url, timeout=60) as r:
                body = json.load(r)
            for post in body.get("data", []):
                t = post.get("scheduled_publish_time")
                if t:
                    when = dt.datetime.fromtimestamp(int(t), TZ) if str(t).isdigit() else dt.datetime.fromisoformat(str(t).replace("+0000", "+00:00")).astimezone(TZ)
                    out.append((when, post.get("message", "")))
            url = body.get("paging", {}).get("next")
            if not url:
                break
    except (urllib.error.URLError, ValueError, KeyError) as e:
        detail = e.read().decode(errors="replace")[:200] if isinstance(e, urllib.error.HTTPError) else e
        print(f"warning: couldn't read the Page's scheduled posts ({detail}); spacing from now only")
        return None
    return out


def wait_live(url, minutes=15):
    """GitHub Pages deploys after the push; Facebook reads the preview when the post is made."""
    deadline = time.time() + minutes * 60
    while True:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=30) as r:
                if r.status == 200:
                    return True
        except urllib.error.URLError:
            pass
        if time.time() > deadline:
            return False
        time.sleep(30)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--before", help="commit to diff articles.json against")
    p.add_argument("--ids", help="comma-separated article ids to post instead")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    now = dt.datetime.now(TZ)
    if args.ids:
        wanted = [i.strip() for i in args.ids.split(",") if i.strip()]
        by_id = {a["id"]: a for a in load(open("articles.json", encoding="utf-8").read())}
        missing = [i for i in wanted if i not in by_id]
        if missing:
            raise SystemExit(f"not in articles.json: {', '.join(missing)}")
        articles = pick([by_id[i] for i in wanted], None)
    else:
        articles = pick(new_articles(args.before), now.date())

    if not articles:
        print("No new articles to post.")
        return

    page, token = (os.environ.get(k, "").strip() for k in ("FB_PAGE_ID", "FB_PAGE_TOKEN"))
    if not args.dry_run and not (page and token):
        raise SystemExit("FB_PAGE_ID and FB_PAGE_TOKEN must be set.")
    if not args.dry_run:
        # The repository secret contains a User Access Token; resolve the
        # Page token needed for Page feed and scheduled-post operations.
        token = get_page_context(page, token)["access_token"]

    # Time the posts once the first article is live: Facebook refuses a time under 10 minutes away,
    # and a slow deploy would eat the first post's lead.
    if not args.dry_run:
        first = f"{SITE}/a/{articles[0]['id']}"
        if not wait_live(first):
            raise SystemExit(f"{first} never came up; is GitHub Pages deploying?")
        now = dt.datetime.now(TZ)

    # Go after what's already scheduled (an earlier push today), and skip what a run that stopped
    # partway already scheduled (the post's message is the excerpt).
    after = None
    if not args.dry_run:
        queued = scheduled(page, token)
        if queued:
            after = max(t for t, _ in queued)
            have = {m.strip() for _, m in queued}
            for a in [a for a in articles if a["excerpt"].strip() in have]:
                print(f"skip {a['id']}: already scheduled")
            articles = [a for a in articles if a["excerpt"].strip() not in have]
            if not articles:
                print("Every article is already scheduled.")
                return
            print(f"after the {len(queued)} post(s) already scheduled, the last at {after:%a %I:%M %p %Z}")

    for a, when in zip(articles, slots(len(articles), now, after)):
        url = f"{SITE}/a/{a['id']}"
        print(f"{when:%a %b %d %I:%M %p %Z}  {url}")
        if args.dry_run:
            continue
        if not wait_live(url):
            raise SystemExit(f"{url} never came up; is GitHub Pages deploying?")
        graph("", {"id": url, "scrape": "true", "access_token": token})
        r = graph(f"{page}/feed", {
            "message": a["excerpt"],
            "link": url,
            "published": "false",
            "scheduled_publish_time": int(when.timestamp()),
            "access_token": token,
        })
        print(f"  scheduled as {r.get('id')}")


if __name__ == "__main__":
    sys.exit(main())
