"""Schedule new Gazette articles as posts on the Facebook Page.

Run by .github/workflows/facebook.yml after a push to main. Finds the articles
added since the previous commit (or the ids given with --ids), drops the
Across the Multiverse ones ("real": true), and schedules each as a link post,
spaced a few hours apart during the day so an edition doesn't land at once.

Env: FB_PAGE_ID, FB_PAGE_TOKEN (a Page access token with pages_manage_posts).
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


def slots(n, now):
    """n post times: the first soon, the rest spread to fill the day."""
    start = day_open(now + FIRST_DELAY)
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

    # Time the posts once the first article is live: Facebook refuses a time under 10 minutes away,
    # and a slow deploy would eat the first post's lead.
    if not args.dry_run:
        first = f"{SITE}/a/{articles[0]['id']}"
        if not wait_live(first):
            raise SystemExit(f"{first} never came up; is GitHub Pages deploying?")
        now = dt.datetime.now(TZ)

    for a, when in zip(articles, slots(len(articles), now)):
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
