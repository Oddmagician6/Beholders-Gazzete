/* ============================================
   THE DAILY PACKAGE (F72): a homepage sidebar block that changes once a day
   and is the same for every reader. A rumor, an NPC, a monster sighting,
   a magic item, a side quest, and an ad, each rolled from a seed made from
   the date, and each linking to its tool on that seed (the tool opens the same roll).
   The engines load after the page has drawn, so the front page stays light.
   Needs rng.js, classifieds.js, and script.js (esc, adsToday, classifiedShopHref).
   ============================================ */

// Loaded in this order once the page is idle. Each is precached by sw.js.
const DAILY_SCRIPTS = ['npc-data.js', 'names-data.js', 'monsters-data.js', 'encounter-engine.js',
    'quest-engine.js', 'loot-data.js', 'loot-engine.js'];

// Where today's monster was seen (the Gazette's own list).
const DAILY_SIGHTINGS = [
    'on the old road at dusk', 'near the flooded mill', 'in the hills above town', 'by the ford at Cold Creek',
    'at the edge of the Bramblewood', 'in the sewers under the market', 'circling the abbey bell tower',
    'behind the Sleeping Ogre, in the bins', 'outside the walls after curfew', 'along the cliffs at low tide',
    'in a farmer\'s barley field', 'on the moor, in the fog', 'near the crypts on the hill', 'at the mouth of the old mine'
];

// 'YYYY-MM-DD' on the reader's calendar.
function dailyDate(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Today's seed for one part: the same date and part always give the same seed.
function dailySeed(date, part) {
    return hashString('daily/' + date + '/' + part).toString(36);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Could not load ' + src));
        document.body.appendChild(s);
    });
}

// The package for a date. rumors: the rumors.json list. Parts that fail are left out.
function rollDaily(date, rumors) {
    const parts = [];
    const tryPart = fn => { try { const p = fn(); if (p) parts.push(p); } catch (e) { console.warn('Daily package:', e); } };

    tryPart(() => {
        if (!rumors.length) return null;
        const idx = withSeed(dailySeed(date, 'rumor'), () => Math.floor(rand() * rumors.length));
        return { icon: '🍺', kind: 'Rumor of the day', title: `“${rumors[idx].text}”`, quote: true, href: `rumors?rumor=${idx}`, cta: 'Overheard at the Tavern' };
    });

    tryPart(() => {
        const seed = dailySeed(date, 'npc');
        const n = rollNpcPinned({ race: 'random', profession: 'random', age: 'random', gender: 'random' }, seed);
        const years = parseInt(n.age, 10);
        const who = `${years ? `${years}-year-old ` : ''}${n.race} ${n.profession}`.toLowerCase();
        const doing = String(n.doing || '').replace(/[.!?]?$/, '.');
        return { icon: n.portraitIcon || '🎭', kind: 'NPC of the day', title: n.name,
            text: `${/^([aeiou8]|1[18]-)/.test(who) ? 'An' : 'A'} ${who}. ${doing}`,
            href: `npc-generator?seed=${seed}`, cta: 'Meet them' };
    });

    tryPart(() => {
        const m = withSeed(dailySeed(date, 'monster'), () => MONSTERS[Math.floor(rand() * MONSTERS.length)]);
        const where = withSeed(dailySeed(date, 'sighting'), () => DAILY_SIGHTINGS[Math.floor(rand() * DAILY_SIGHTINGS.length)]);
        return { icon: '👹', kind: 'Monster sighting', title: m.name, text: `CR ${m.cr} ${m.type}, seen ${where}.`, href: `monster/${m.id}`, cta: 'Stat block' };
    });

    tryPart(() => {
        const seed = dailySeed(date, 'item');
        // The Loot page's Magic Items tab draws this same item first from this seed.
        const item = withSeed(seed, () => getMagicItem('random', 'any'));
        if (!item) return null;
        const rarity = item.rarity.replace('-', ' ');
        return { icon: '✨', kind: 'Magic item', title: item.name,
            text: `${rarity[0].toUpperCase() + rarity.slice(1)} ${item.type}${item.attune ? ', requires attunement' : ''}.`,
            href: `loot-generator?tab=magic&seed=${seed}`, cta: 'Open in Loot' };
    });

    tryPart(() => {
        const seed = dailySeed(date, 'quest');
        const q = rollQuest(seed);
        return { icon: '🗺️', kind: 'Side quest', title: q.title, text: q.task, href: `dnd-side-quest-generator?seed=${seed}`, cta: 'The full job' };
    });

    tryPart(() => {
        const ad = adsToday().display[0];
        if (!ad) return null;
        return { icon: '📯', kind: 'A word from our sponsors', title: ad.h, text: ad.t,
            href: classifiedShopHref(ad) || ad.href || '', cta: ad.shop ? 'Step inside' : 'Find out more' };
    });

    return parts;
}

function dailyHtml(parts) {
    return '<h4 class="widget-title">🗞️ Today in the Realm</h4>' + parts.map(p => `
        <div class="daily-item">
          <span class="daily-kind"><span aria-hidden="true">${p.icon}</span> ${esc(p.kind)}</span>
          <h5${p.quote ? ' class="daily-quote"' : ''}>${p.href ? `<a href="${esc(p.href)}">${esc(p.title)}</a>` : esc(p.title)}</h5>
          ${p.text ? `<p>${esc(p.text)}</p>` : ''}
          ${p.href ? `<a class="daily-more" href="${esc(p.href)}">${esc(p.cta)} →</a>` : ''}
        </div>`).join('') +
        '<p class="classified-note">The same for every reader. A new package every morning.</p>';
}

async function renderDaily() {
    const el = document.getElementById('daily-sidebar');
    if (!el) return;
    try {
        const [rumors] = await Promise.all([
            fetch('rumors.json').then(r => r.json()).then(d => d.rumors || []).catch(() => []),
            DAILY_SCRIPTS.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve())
        ]);
        const parts = rollDaily(dailyDate(), rumors);
        if (!parts.length) return;
        el.innerHTML = dailyHtml(parts);
        el.hidden = false;
    } catch (e) {
        console.warn('Daily package:', e);
    }
}

// After first paint: wait for load, then for an idle moment.
window.addEventListener('load', () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(renderDaily));
