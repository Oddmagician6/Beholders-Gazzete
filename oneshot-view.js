/* ============================================
   ONE-SHOT VIEW (F73, F74): a rolled one-shot (oneshot-engine.js) as the module's HTML.
   The One-Shot page (oneshot.js) and the Campaign Generator (campaign.js) both draw with it.
   oneShotBodyHtml(o, opt) is everything under the title: the DM's truth, the three acts, the
   wrap-up, and (unless opt.appendix is false) the stat blocks.
     opt.head(tag, title, part) → a section's header (a page adds its own keep/reroll buttons)
     opt.tools(part) → the hoard's keep/reroll buttons ('' for none)
   Needs the one-shot page's engines plus toolbox-statblock.js (monsterBlockHtml).
   ============================================ */

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function osDl(lines) {
    return `<dl class="wb-dl">${lines.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function osRead(text) {
    return `<blockquote class="os-read"><span class="os-read-tag">Read aloud</span>${esc(text)}</blockquote>`;
}

function osMonsterList(f) {
    return siteFightList(f).map(e => `${e.count} × <a href="#os-sb-${esc(e.m.id)}">${esc(e.m.name)}</a> (CR ${esc(e.m.cr)})`).join(', ');
}

function osFightHTML(o, f, label) {
    return `<div class="os-fight">
        <h4>⚔️ ${esc(label)}: ${esc(f.scene.title)}</h4>
        <p class="os-foes">${osMonsterList(f)} <span class="os-dim">(${esc(osFightRating(o, f))})</span></p>
        ${osDl(encSceneLines(f.scene).filter(([k]) => k !== 'Where'))}
        <p class="os-links"><a class="os-btn" href="${esc(osFightLink(o, f, f.scene.habitat))}">⚔️ Run this fight</a></p>
    </div>`;
}

function osHoardHTML(l) {
    const coins = Object.entries(l.coins).filter(([, v]) => v > 0).map(([t, v]) => `${v.toLocaleString('en-US')} ${t}`).join(' · ');
    const things = [...l.gems, ...l.art, ...(l.goods || [])].map(i => `<li><span>${esc(i.name)}</span><span class="os-dim">${formatCoins(i.value)}</span></li>`).join('');
    const magic = l.magic.map(m => `<li><span>${esc(m.name)}${m.attune ? ' <span class="os-dim">(attunement)</span>' : ''}</span><span class="os-dim">${esc(m.rarity.replace('-', ' '))}</span></li>`).join('');
    const find = lootFindLines(l).filter(([k]) => k !== 'Found in');
    return `<div class="os-hoard">
        <h4>💎 The hoard <span class="os-dim">(${formatCoins(l.totalValue)} in all)</span></h4>
        ${find.length ? osDl(find) : ''}
        <p><strong>Coins:</strong> ${coins || 'none'}</p>
        ${things ? `<ul class="os-loot">${things}</ul>` : ''}
        ${magic ? `<p><strong>Magic items:</strong></p><ul class="os-loot">${magic}</ul>` : ''}
    </div>`;
}

function osRoomHTML(o, i) {
    const s = o.site, r = s.rooms[i], last = i === s.rooms.length - 1;
    const tags = [r.fight ? '⚔️ fight' : '', r.trap ? '⚠️ trap' : '', last ? '💎 hoard' : ''].filter(Boolean);
    const lines = siteRoomLines(s, i).filter(([k]) => k !== 'Hoard').map(([k, v]) => k === 'Foes' ? null : [k, v]);
    return `<section class="site-room${last ? ' site-end' : ''}" id="site-r${r.n}" tabindex="-1">
        <h4><span class="site-n">${r.n}</span> ${esc(r.name)}${tags.map(t => `<span class="wb-tag">${t}</span>`).join('')}</h4>
        <p class="site-desc">${esc(r.text)}</p>
        ${last ? osRead(o.bossRead) : ''}
        ${r.fight ? `<p class="os-foes"><strong>Foes:</strong> ${osMonsterList(r.fight)} <span class="os-dim">(${esc(osFightRating(o, r.fight))})</span></p>` : ''}
        ${osDl(lines)}
        ${r.fight ? `<p class="os-links"><a class="os-btn" href="${esc(osFightLink(o, r.fight, SITE_KINDS[s.kind].habitat))}">⚔️ Run this fight</a></p>` : ''}
        ${last ? osHoardHTML(o.hoard) : ''}
    </section>`;
}

function osStatBlocks(o) {
    const list = osMonsters(o);
    return list.map(m => `<details class="os-sb" id="os-sb-${esc(m.id)}" open>
        <summary>${esc(m.name)} <span class="os-dim">CR ${esc(m.cr)} · ${m.xp.toLocaleString('en-US')} XP</span></summary>
        <div class="sb-box">${monsterBlockHtml(m)}</div>
    </details>`).join('');
}

// A section's header with no buttons.
function osPlainHead(tag, title) {
    return `<header class="os-act-head"><span class="os-act-tag">${tag}</span><h3>${esc(title)}</h3></header>`;
}

function oneShotBodyHtml(o, opt = {}) {
    const h = opt.head || osPlainHead, tools = opt.tools || (() => '');
    const s = o.site, p = o.patron;
    return `
        <section class="os-act os-truth">
            ${h('For the DM', "What's really going on", 'plot')}
            ${osDl([
                ['The villain', `${osCap(o.villain.name)}${o.villain.named && o.villain.role ? ` (${o.villain.role})` : ''}${o.villain.mark ? `, who ${o.villain.mark}` : ''}.`],
                ['The truth', o.truth],
                ['What everyone wants', osCap(o.item) + '.'],
                ['The twist', o.twist],
                ['The clock', `${osCap(o.deadline)}. If they're late: ${o.late}.`]
            ])}
        </section>

        <section class="os-act">
            ${h('Act 1', 'The hook', 'hook')}
            <p class="os-where">🏘️ ${esc(o.town)}, at <strong>${esc(o.tavern.name)}</strong> (${esc(o.tavern.kind.label)}, ${esc(o.tavern.kind.where)}).</p>
            ${o.placeText ? `<p>${esc(o.placeText)}</p>` : ''}
            ${osRead(o.opener)}
            <p class="os-scene">${esc(tavernSceneText(o.tavern.scene))}</p>
            ${osDl([
                ['Patron', `${p.name}, ${p.role} (${p.race ? osCap(p.race) : `${osCap(p.npc.race)}, ${p.npc.age}`}).`],
                p.npc ? ['Play them', `${p.npc.trait}. Voice: ${p.npc.voice}.`] : null,
                p.want ? ['What they want', p.want] : null,
                ['The job', o.job],
                ['Why the party', o.why],
                ['Pay', `${formatCoins(o.reward)} for the party, half up front if they haggle (DC ${OS_CLUE_DC[s.tier]} Charisma (Persuasion)).`],
                ['Their secret', p.secret]
            ])}
        </section>

        <section class="os-act">
            ${h('Act 2', 'The road', 'road')}
            <h4>🔎 The trail (three clues: any one is enough to find the way)</h4>
            <ul class="os-clues">${o.road.clues.map(c => `<li><span class="os-dc">DC ${c.dc} ${esc(c.skill)}</span> ${esc(c.text)}</li>`).join('')}</ul>
            <h4>🛤️ On the road (${o.road.days.length} day${o.road.days.length === 1 ? '' : 's'}, ${esc(TRAVEL_SEASONS[o.road.season].label.toLowerCase())}, ${esc(TRAVEL_TERRAIN[o.terrain].label.toLowerCase())})</h4>
            ${o.road.days.map((d, i) => `<div class="os-day">
                <p><strong>Day ${i + 1}:</strong> ${esc(d.weather)}. ${esc(d.scene)}</p>
                <p><strong>${esc(d.event.t)}.</strong> ${esc(d.event.d)}${d.event.hook ? ` ${esc(d.event.hook)}` : ''}</p>
            </div>`).join('')}
            <p><strong>Complication:</strong> ${esc(o.road.complication)}</p>
            ${o.road.fights.map((f, i) => osFightHTML(o, f, o.road.fights.length > 1 ? `Fight ${i + 1}, day ${f.day}` : `On the road, day ${f.day}`)).join('')}
        </section>

        <section class="os-act">
            ${h('Act 3', s.name, 'site')}
            ${osRead(o.arrive)}
            ${osDl(siteStoryLines(s, {}))}
            <div class="site-map-wrap">${siteMapSvg(s, `Map of ${s.name}`, { style: 'art' })}</div>
            <p class="os-legend">Tap a number to jump to that room. ⚔ a fight · ⚠ a trap · iron doors are locked · S a secret door · the arrow is the way in · the gold room holds the hoard.</p>
            ${tools('hoard') ? `<div class="os-hoard-tools">${tools('hoard')}<span class="os-dim">Hoard: keep or reroll the treasure alone.</span></div>` : ''}
            ${s.rooms.map((_, i) => osRoomHTML(o, i)).join('')}
            ${s.wander ? `<p><strong>🎲 Wandering monsters:</strong> ${esc(siteWanderText(s))}</p>` : ''}
        </section>

        <section class="os-act">
            ${h('Wrap-up', 'How it ends', '')}
            ${osDl([
                ['If they win', o.win],
                ['If they fail', o.fail],
                ...o.threads.map(t => ['Loose thread', t]),
                ['XP', `${o.xp.toLocaleString('en-US')} for every fight in the adventure (${Math.floor(o.xp / o.party).toLocaleString('en-US')} each), or level up at the end with milestones.`]
            ])}
        </section>
        ${opt.appendix === false ? '' : `
        <section class="os-act os-appendix">
            ${h('Appendix', 'Stat blocks', '')}
            ${osStatBlocks(o)}
        </section>`}`;
}
