/* ============================================
   DM TOOLBOX: TAVERN TAB (F26)
   A whole tavern or inn from tavern-engine.js (rollTavern), plus a rumor dealt from
   the shared rumor deck (rumor-deck.js, the same 'all' deck as the Tavern page).
   The URL holds the seed and the rumor's index in rumors.json, so a link shows the
   same tavern and the same rumor without dealing from anyone's deck.
   URL: ?tab=tavern&seed=&q=<quality>&rumor=<index>
   ============================================ */

const TAVERN_RUMOR_CATS = {
    local: '🏘️ Local Gossip', politics: '👑 Politics', economics: '💰 Economics',
    adventures: '⚔️ Adventures', monsters: '🐉 Monsters', magic: '✨ Magic & Weird'
};

let tavern = { seed: null, data: null, rumorIdx: null };
let tavernRumors = [];

const capWord = s => s.charAt(0).toUpperCase() + s.slice(1);

function tavernQuality() {
    return document.getElementById('tv-quality').value;
}

function tavernRumor() {
    return tavern.rumorIdx !== null ? tavernRumors[tavern.rumorIdx] || null : null;
}

// Deal the next rumor (no repeats until the deck runs out). Waits if rumors.json hasn't loaded.
function dealTavernRumor() {
    if (!tavernRumors.length) { tavern.rumorIdx = null; return; }
    const idx = dealRumor(tavernRumors, tavernRumors.length, 'all', tavern.rumorIdx ?? -1).idx;
    tavern.rumorIdx = idx >= 0 ? idx : null;
}

function tavParams() {
    const q = document.getElementById('tv-quality');
    return urlFor('tavern', {
        q: fieldValue(q) === defaultValue(q) ? null : q.value,
        seed: tavern.seed,
        rumor: tavern.rumorIdx !== null ? String(tavern.rumorIdx) : null
    });
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollTavernFor(seed = newSeed(), push = true) {
    tavern.seed = seed;
    tavern.data = rollTavern(seed, { quality: tavernQuality() });
    dealTavernRumor();
    renderTavern();
    if (push !== null) setUrlParams(tavParams(), push);
}

function applyTavUrl(p) {
    const q = document.getElementById('tv-quality');
    if (!setFieldValue(q, p.get('q'))) q.value = defaultValue(q);
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    tavern.seed = seed;
    tavern.data = rollTavern(seed, { quality: q.value });
    const idx = /^\d+$/.test(p.get('rumor') || '') ? Number(p.get('rumor')) : null;
    tavern.rumorIdx = idx;
    // A link with no rumor (or one rumors.json no longer has) gets a fresh deal.
    if (tavernRumors.length && !tavernRumors[idx]) { tavern.rumorIdx = null; dealTavernRumor(); setUrlParams(tavParams(), false); }
    renderTavern();
    return true;
}

// ── Render ────────────────────────────────────────────────
function priceRows(items) {
    return items.map(i => `
        <li><span class="tv-item">${esc(i.name)}${i.special ? ' <em class="tv-special">house special</em>' : ''}</span>
            <span class="tv-dots" aria-hidden="true"></span>
            <span class="tv-price">${esc(formatCoins(i.gp))}</span></li>`).join('');
}

function npcSub(n, extra) {
    return [extra, capWord(n.race), n.age].filter(Boolean).map(esc).join(' · ');
}

function rumorBlock() {
    const r = tavernRumor();
    if (!r) return `<p class="tv-muted">${tavernRumors.length ? 'The room has gone quiet.' : 'Listening for gossip…'}</p>`;
    return `<p class="tv-rumor">"${esc(r.text)}"</p>
        <div class="tv-tags">
            <span class="tv-tag">${TAVERN_RUMOR_CATS[r.category] || esc(r.category)}</span>
            <span class="tv-tag">${Number(r.truth) || 0}% true</span>
        </div>
        ${r.followup ? `<details class="tv-next"><summary>📜 What happened next…</summary><p>${esc(r.followup)}</p></details>` : ''}`;
}

function renderTavern() {
    const tv = tavern.data;
    if (!tv) return;
    const t = TAVERN_TIERS[tv.tier];
    const o = tv.owner;
    const vacant = tv.rooms.vacant;
    document.getElementById('tavern-card').innerHTML = `
        <header class="tv-head">
            <h3 class="tv-name">${esc(tv.name)}</h3>
            <div class="tv-tier">${t.icon} ${esc(t.label)} tavern &amp; inn</div>
            <p class="tv-scene">${esc(tv.scene.look)}. You hear ${esc(tv.scene.sound)}, and the place smells of ${esc(tv.scene.smell)}.</p>
        </header>
        <div class="tv-grid">
            <section class="tv-block">
                <h4>🧑‍🍳 Behind the bar</h4>
                <div class="tv-npc">
                    <span class="tv-icon" aria-hidden="true">${o.portraitIcon}</span>
                    <div>
                        <div class="tv-npc-name">${esc(o.name)}</div>
                        <div class="tv-npc-sub">${npcSub(o, o.role)}</div>
                    </div>
                </div>
                <p>${esc(o.trait)}. ${esc(o.voice)}.</p>
                <p class="tv-quote">"${esc(o.dialogue)}"</p>
                <p class="tv-secret"><b>Secret:</b> ${esc(o.secret)}</p>
            </section>
            <section class="tv-block">
                <h4>🪑 The regulars</h4>
                <ul class="tv-regulars">${tv.regulars.map((r, i) => `
                    <li>
                        <div class="tv-npc-name">${r.portraitIcon} ${esc(r.name)}</div>
                        <div class="tv-npc-sub">${npcSub(r, r.profession)}</div>
                        <p>Found ${esc(r.habit)}. ${esc(r.trait)}.</p>
                        ${i === 0 ? `<p class="tv-hook"><b>Has work:</b> ${esc(r.questHook)}</p>` : ''}
                    </li>`).join('')}
                </ul>
            </section>
            <section class="tv-block">
                <h4>🍲 Food</h4>
                <ul class="tv-prices">${priceRows(tv.menu.food)}</ul>
                <h4 class="tv-h-gap">🍺 Drink</h4>
                <ul class="tv-prices">${priceRows(tv.menu.drink)}</ul>
                <p class="tv-small">A day's meals here run about ${esc(formatCoins(tv.menu.meals))}.</p>
            </section>
            <section class="tv-block">
                <h4>🛏️ Rooms, per night</h4>
                <ul class="tv-prices">${priceRows(tv.rooms.list)}</ul>
                <p class="tv-small">${vacant ? `${vacant} room${vacant === 1 ? '' : 's'} free tonight.` : 'Full tonight, unless someone can be persuaded to share.'}</p>
            </section>
        </div>
        <section class="tv-block tv-wide">
            <h4>✨ The quirk</h4>
            <p>${esc(tv.quirk)}</p>
            <h4 class="tv-h-gap">🎻 Tonight</h4>
            <p>${esc(tv.tonight)}</p>
            <h4 class="tv-h-gap">👂 Overheard at the bar</h4>
            <div id="tavern-rumor">${rumorBlock()}</div>
        </section>`;
    document.getElementById('tv-rumor').disabled = !tavernRumors.length;
}

function printTavern() {
    if (!tavern.data) return;
    document.querySelectorAll('#tavern-card details').forEach(d => { d.open = true; });
    document.body.classList.add('print-tavern');
    window.print();
}

function setupTavern() {
    const sel = document.getElementById('tv-quality');
    Object.entries(TAVERN_TIERS).forEach(([key, t]) => sel.add(new Option(`${t.icon} ${t.label}`, key)));
    sel.addEventListener('change', () => {
        // Same tavern and rumor, new quality: only the menu and rooms change.
        if (!tavern.seed) return;
        tavern.data = rollTavern(tavern.seed, { quality: sel.value });
        renderTavern();
        setUrlParams(tavParams(), false);
    });
    document.getElementById('tv-roll').addEventListener('click', () => rollTavernFor());
    document.getElementById('tv-rumor').addEventListener('click', () => {
        dealTavernRumor();
        document.getElementById('tavern-rumor').innerHTML = rumorBlock();
        setUrlParams(tavParams(), true);
    });
    document.getElementById('tv-copy').addEventListener('click', () => {
        if (tavern.data) copyText(tavernText(tavern.data, tavernRumor()), 'tavern-status', `“${tavern.data.name}”`);
    });
    document.getElementById('tv-print').addEventListener('click', printTavern);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-tavern'));
    document.getElementById('tv-link').addEventListener('click', () =>
        copyPageLink(ok => flash('tavern-status', ok ? '🔗 Link copied. It opens this tavern with this rumor.' : '⚠️ Copy blocked by the browser.')));

    fetch('rumors.json').then(r => r.json()).then(data => {
        tavernRumors = (data && data.rumors) || [];
        if (!tavern.data) return;
        // The tavern rolled before the rumors arrived: deal now, or keep the linked one.
        if (!tavernRumors[tavern.rumorIdx]) {
            tavern.rumorIdx = null;
            dealTavernRumor();
            if (currentTab() === 'tavern') setUrlParams(tavParams(), false);
        }
        renderTavern();
    }).catch(() => {
        const box = document.getElementById('tavern-rumor');
        if (box) box.innerHTML = '<p class="tv-muted">The gossip didn\'t reach us. Try refreshing.</p>';
    });
}
