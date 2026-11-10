"""Stage approved tavern-review Reels for .github/scripts/publish_tavern_reels.py.

Copies each render into .reel-output/publishing/<tag>/, writes a weekly queue at 12:00
America/Chicago with the Facebook and Instagram captions from reel-factory/tavern-reviews.json,
the initial Release state, and .github/tavern-reel-queue-<batch>.json.

    py reel-factory/stage-tavern-reels.py --batch=01 --start=2026-11-14 --ids=id1,id2,...
"""
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CHICAGO = ZoneInfo('America/Chicago')


def dump(value):
    return json.dumps(value, indent=2, ensure_ascii=False) + '\n'


def main(args):
    opts = dict(a[2:].split('=', 1) for a in args if a.startswith('--') and '=' in a)
    batch, start, ids = opts.get('batch', ''), opts.get('start', ''), [i for i in opts.get('ids', '').split(',') if i]
    if not (batch.isdigit() and len(batch) == 2 and start and 1 <= len(ids) <= 5):
        raise SystemExit(__doc__)
    batch = f'batch{batch}'
    reviews = {r['id']: r for r in json.loads((ROOT / 'reel-factory' / 'tavern-reviews.json').read_text(encoding='utf-8'))['reviews']}
    first = datetime.fromisoformat(start).replace(hour=12, tzinfo=CHICAGO)
    tag = f"tavern-stage-{batch}-{start.replace('-', '')}"
    out = ROOT / '.reel-output' / 'publishing' / tag
    out.mkdir(parents=True, exist_ok=True)
    entries = []
    for index, identifier in enumerate(ids):
        review = reviews.get(identifier)
        if not review:
            raise SystemExit(f'No captions for {identifier} in tavern-reviews.json.')
        draft = ROOT / '.reel-output' / 'drafts' / identifier
        meta = json.loads((draft / 'metadata.json').read_text(encoding='utf-8'))
        if meta.get('kind') != 'tavern-review' or meta.get('artworkKind') != 'generated':
            raise SystemExit(f'{identifier}: not a tavern review with generated artwork.')
        target = out / f'{identifier}.mp4'
        shutil.copyfile(draft / 'render.mp4', target)
        data = target.read_bytes()
        probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(target)], capture_output=True, text=True, check=True)
        local = (first + timedelta(days=7 * index)).replace(tzinfo=None).replace(tzinfo=CHICAGO)  # keeps noon across DST
        entries.append({
            'id': identifier, 'day': index + 1, 'title': review['title'], 'approved': True,
            'publishAt': local.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'localTime': local.strftime('%Y-%m-%d, %H:%M'),
            'captions': {p: review['captions'][p].strip() for p in ('facebook', 'instagram')},
            'video': {'filename': target.name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'durationSeconds': round(float(probe.stdout.strip()), 3)},
        })
    queue = {'schemaVersion': 1, 'id': f'tavern-reviews-{batch}', 'timezone': 'America/Chicago', 'expectedInstagramUsername': 'beholdersgazette',
             'approved': True, 'approval': f'Owner reviewed the {len(entries)} tavern-review Reels on 2026-11-10 and asked for them to post one a week on Facebook and Instagram with separate captions, starting {start} at 12:00 America/Chicago.',
             'entries': entries}
    queue_bytes = dump(queue).encode('utf-8')
    queue_sha = hashlib.sha256(queue_bytes).hexdigest()
    (out / 'queue.json').write_bytes(queue_bytes)
    (out / 'release-notes.json').write_text(dump({'schemaVersion': 1, 'queueSha256': queue_sha, 'armed': False, 'entries': {}}), encoding='utf-8')
    (ROOT / '.github' / f'tavern-reel-queue-{batch}.json').write_text(dump({'schemaVersion': 1, 'enabled': True, 'releaseTag': tag, 'queueSha256': queue_sha, 'repository': 'Oddmagician6/Beholders-Gazzete'}), encoding='utf-8')
    (out / 'schedule.txt').write_text(''.join(f"{e['localTime']} America/Chicago | {e['title']} | Facebook + Instagram\n" for e in entries), encoding='utf-8')
    print(f'Staged {len(entries)} Reels in {out.relative_to(ROOT)} (queue {queue_sha}).')
    for e in entries:
        print(f"{e['localTime']} America/Chicago: {e['title']} ({e['video']['durationSeconds']}s)")


if __name__ == '__main__':
    main(sys.argv[1:])
