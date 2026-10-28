/* ============================================
   DM TOOLBOX
   Small table tools on one page, one tab each. Each tab also has a page of its own (tab-pages.js,
   SEO11): its roll's address is that page, and ?tab= on an old link moves there.
   Names (F21): tavern and shop names, rolled by names-data.js (rollPlaceNames).
   Travel (F22): weather, a road event, and the day's miles, rolled by
   travel-engine.js (rollJourney). Nothing is stored; the URL holds the trip.
   Dice and Initiative (F23): toolbox-table.js (no URL state beyond ?tab=).
   Split (F24): the party coin splitter; the math is in coins.js (splitCoins),
   and the URL holds the coins, the party, and the seed that picks who gets the leftover copper.
   Encounter (F25): toolbox-encounter.js; the URL holds the party and the monsters.
   Tavern (F26): toolbox-tavern.js; the URL holds the seed, the quality, and the rumor.
   Downtime (F28): toolbox-downtime.js; the URL holds the party, the length, and the carousing seed.
   Quest (F32): toolbox-quest.js; the URL holds the seed, the party level and size, and the job.
   Clocks (F41): toolbox-clocks.js (no URL state beyond ?tab=; the clocks are in localStorage).
   Party (F46): toolbox-party.js (no URL state beyond ?tab=; the party is in localStorage, kept by party.js).
   Tables (F49): toolbox-tables.js; the tables are in localStorage, and ?t= holds a shared one.
   Split's party size starts from it: the URL always holds n (unless names set it), so a link
   without n (from the Loot page or the Session Kit) splits for the party here.
   Seeds and the shareable URL: rng.js.
   ============================================ */

const TOOLBOX_TABS = ['names', 'tavern', 'quest', 'travel', 'dice', 'init', 'split', 'enc', 'down', 'clocks', 'party', 'tables'];
// Tabs whose state is all in localStorage (nothing in the URL beyond ?tab=, except a shared table's ?t=).
const TOOLBOX_STORED_TABS = ['dice', 'init', 'clocks', 'party', 'tables'];
const KEPT_KEY = ruleKey('gazette-kept-names');
const KEPT_MAX = 100;

let names = { seed: null, list: [] };
let kept = [];

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function flash(id, text) {
    const el = document.getElementById(id);
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 2500);
}

function copyText(text, statusId, what) {
    navigator.clipboard.writeText(text)
        .then(() => flash(statusId, `📋 Copied ${what}.`))
        .catch(() => flash(statusId, '⚠️ Copy blocked by the browser.'));
}

// ── Tabs ──────────────────────────────────────────────────
function currentTab() {
    const t = urlParams().get('tab') || tabOfPage();
    return TOOLBOX_TABS.includes(t) && tabOnPage(t) ? t : TOOLBOX_TABS[0];
}

function showTab(tab) {
    document.querySelectorAll('.tool-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.tool-panel').forEach(p => { p.hidden = p.id !== 'tab-' + tab; });
    showTabPage(tab);
}

// The URL params of the tab on screen (the default tab stays out of the URL; setUrlParams moves
// the address to the tab's own page, and a link built from these opens it there too).
function urlFor(tab, params) {
    return { ...(tab === TOOLBOX_TABS[0] ? {} : { tab }), ...params };
}

// ── Names (F21) ───────────────────────────────────────────
function typeLabel(type) {
    const t = NAME_TABLES.types[type];
    return t ? `${t.icon} ${t.label}` : '';
}

function setupNamePicker() {
    const sel = document.getElementById('name-for');
    NAME_TABLES.groups.forEach(group => {
        const og = document.createElement('optgroup');
        og.label = group;
        Object.entries(NAME_TABLES.types).forEach(([key, t]) => {
            if (key === 'tavern' || t.group !== group) return;   // tavern is already the first option
            og.appendChild(new Option(`${t.icon} ${t.label}`, key));
        });
        if (og.children.length) sel.appendChild(og);
    });
}

function nameParams() {
    const sel = document.getElementById('name-for');
    return urlFor('names', { for: fieldValue(sel) === defaultValue(sel) ? null : sel.value, seed: names.seed });
}

function rollNamesFor(seed = newSeed(), push = true) {
    const type = document.getElementById('name-for').value;
    names = { seed, list: withSeed(seed, () => rollPlaceNames(type, 10)) };
    renderNames();
    if (push !== null) setUrlParams(nameParams(), push);
}

function isKept(name) {
    return kept.some(k => k.name === name);
}

function renderNames() {
    const any = document.getElementById('name-for').value === 'random';
    document.getElementById('name-list').innerHTML = names.list.map((n, i) => `
        <li>
            <button type="button" class="name-pick" data-i="${i}" title="Copy this name">${esc(n.name)}</button>
            ${any ? `<span class="name-type">${esc(typeLabel(n.type))}</span>` : ''}
            <button type="button" class="name-keep${isKept(n.name) ? ' on' : ''}" data-i="${i}"
                aria-pressed="${isKept(n.name)}" aria-label="Keep ${esc(n.name)}" title="Keep this name">${isKept(n.name) ? '★' : '☆'}</button>
        </li>`).join('');
}

function onNameListClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const n = names.list[Number(btn.dataset.i)];
    if (!n) return;
    if (btn.classList.contains('name-pick')) copyText(n.name, 'names-status', `“${n.name}”`);
    else toggleKeep(n);
}

// ── Kept names (localStorage) ─────────────────────────────
function loadKept() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEPT_KEY));
        if (Array.isArray(saved)) kept = saved.filter(k => k && typeof k.name === 'string');
    } catch (e) {}
}

function saveKept() {
    try { localStorage.setItem(KEPT_KEY, JSON.stringify(kept)); } catch (e) {}
}

function toggleKeep(n) {
    if (isKept(n.name)) kept = kept.filter(k => k.name !== n.name);
    else {
        if (kept.length >= KEPT_MAX) { flash('names-status', `⚠️ The ledger holds ${KEPT_MAX} names. Remove some first.`); return; }
        kept.push({ name: n.name, type: n.type });
    }
    saveKept();
    renderNames();
    renderKept();
}

function renderKept() {
    const box = document.getElementById('kept');
    box.hidden = !kept.length;
    document.getElementById('kept-count').textContent = kept.length;
    document.getElementById('kept-list').innerHTML = kept.map((k, i) => `
        <li>
            <span class="kept-name">${esc(k.name)}</span>
            <span class="name-type">${esc(typeLabel(k.type))}</span>
            <button type="button" class="kept-remove" data-i="${i}" aria-label="Remove ${esc(k.name)}" title="Remove">✕</button>
        </li>`).join('');
}

function onKeptClick(e) {
    const btn = e.target.closest('.kept-remove');
    if (!btn) return;
    kept.splice(Number(btn.dataset.i), 1);
    saveKept();
    renderKept();
    renderNames();
}

// Two clicks: the first arms the button for a few seconds.
function clearKept() {
    const btn = document.getElementById('kept-clear');
    if (!kept.length) return;
    if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = '⚠️ Click again to clear';
        btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = '🧹 Clear'; }, 3000);
        return;
    }
    clearTimeout(btn._t);
    delete btn.dataset.armed;
    btn.textContent = '🧹 Clear';
    const count = kept.length;
    kept = [];
    saveKept();
    renderKept();
    renderNames();
    flash('names-status', `🧹 Cleared ${count} kept name${count === 1 ? '' : 's'}.`);
}

// ── Travel (F22) ──────────────────────────────────────────
const TRAVEL_MAX_DAYS = 60;
// URL param → field id. Season is always written (its default follows today's date).
const TRAVEL_FIELDS = { climate: 'tr-climate', season: 'tr-season', terrain: 'tr-terrain', pace: 'tr-pace', hours: 'tr-hours', ride: 'tr-ride', miles: 'tr-miles' };

let travel = { seed: null, day: 1, days: [] };

function seasonNow() {
    const m = new Date().getMonth();
    return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
}

function setupTravelForm() {
    const fill = (id, table, def) => {
        const sel = document.getElementById(id);
        Object.entries(table).forEach(([key, t]) => sel.add(new Option(`${t.icon ? t.icon + ' ' : ''}${t.label}`, key, key === def, key === def)));
    };
    fill('tr-climate', TRAVEL_CLIMATES, 'temperate');
    fill('tr-season', TRAVEL_SEASONS, seasonNow());
    fill('tr-terrain', TRAVEL_TERRAIN, 'road');
    const paces = {};
    Object.entries(TRAVEL_PACES).forEach(([k, p]) => { paces[k] = { label: `${p.label} (${p.mph} mph, ${p.day} miles a day)` }; });
    fill('tr-pace', paces, 'normal');
    const hours = {};
    for (let h = 1; h <= 12; h++) hours[h] = { label: h === 8 ? '8 hours (a full day)' : h > 8 ? `${h} hours (forced march)` : `${h} hour${h === 1 ? '' : 's'}` };
    fill('tr-hours', hours, '8');
}

function travelOpts() {
    const v = id => document.getElementById(id).value;
    return {
        climate: v('tr-climate'), season: v('tr-season'), terrain: v('tr-terrain'), pace: v('tr-pace'),
        hours: Number(v('tr-hours')), gallop: v('tr-ride') === '1',
        miles: Math.min(5000, Math.max(0, Math.round(Number(v('tr-miles')) || 0)))
    };
}

function travelParams() {
    const params = { seed: travel.seed, day: travel.day > 1 ? travel.day : null };
    Object.entries(TRAVEL_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = key === 'season' || fieldValue(el) !== defaultValue(el) ? el.value : null;
    });
    if (params.miles === '0' || params.miles === '') params.miles = null;
    return urlFor('travel', params);
}

// Rebuild days 1..day from the seed and the form. push: true = new history entry,
// false = replace, null = leave the URL alone (it already says this).
function showJourney(push) {
    const opts = travelOpts();
    document.getElementById('tr-miles').value = opts.miles;
    travel.days = rollJourney(travel.seed, opts, Math.min(TRAVEL_MAX_DAYS, Math.max(1, travel.day)));
    travel.day = travel.days.length;   // stops at the day the party arrived
    renderTravel(opts);
    if (push !== null) setUrlParams(travelParams(), push);
}

function newJourney(push = true) {
    travel = { seed: newSeed(), day: 1, days: [] };
    showJourney(push);
}

function nextDay() {
    const last = travel.days[travel.days.length - 1];
    if (!last || last.arrived || travel.day >= TRAVEL_MAX_DAYS) return;
    travel.day++;
    showJourney(true);
}

function renderTravel(opts) {
    const d = travel.days[travel.days.length - 1];
    const w = d.weather;
    const ev = ROAD_EVENT_KINDS[d.event.k];
    const moon = MOON_PHASES[d.sky.phase];
    const goal = opts.miles;
    const progress = goal ? Math.min(100, Math.round(d.covered / goal * 100)) : 0;
    const left = goal ? Math.round((goal - d.covered) * 10) / 10 : 0;
    const perDay = travelDistance(opts, null).miles;   // a day without bad weather
    const daysLeft = left > 0 && perDay > 0 ? Math.ceil(left / perDay) : 0;

    document.getElementById('travel-day').innerHTML = `
        <div class="day-head">
            <h3>Day ${d.day}</h3>
            <span class="day-where">${TRAVEL_TERRAIN[opts.terrain].icon} ${esc(TRAVEL_TERRAIN[opts.terrain].label)} · ${esc(TRAVEL_CLIMATES[opts.climate].label)} · ${esc(TRAVEL_SEASONS[opts.season].label)}</span>
        </div>
        ${goal ? `<div class="day-progress" role="progressbar" aria-label="Journey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>` : ''}
        <p class="day-scene">${esc(d.scene)}</p>
        <div class="day-grid${d.camp ? ' with-camp' : ''}">
            <section class="day-block day-weather">
                <h4>Weather</h4>
                <div class="wx-head">
                    ${weatherArtHtml(w.kind)}
                    <div>
                        <div class="wx-title">${esc(weatherHeadline(w))}</div>
                        <p class="wx-detail">${esc(weatherDetail(w))}</p>
                    </div>
                </div>
                <p class="day-flavor">${esc(w.flavor)}</p>
                ${w.effects.length ? `<ul class="day-fx">${w.effects.map(f => `<li>${esc(f.text)}<span class="fx-src${f.src === 'SRD' ? ' srd' : ''}">${f.src === 'SRD' ? 'SRD' : 'ruling'}</span></li>`).join('')}</ul>` : ''}
                <p class="day-sky">${moonArtHtml(d.sky.phase)} ${esc(moon.label)} · about ${d.sky.daylight} hours of daylight</p>
                ${d.sign ? `<p class="day-sign"><strong>🌅 Signs for tomorrow:</strong> ${esc(d.sign)}</p>` : ''}
            </section>
            <section class="day-block">
                <h4>${ev.icon} ${esc(ev.label)}</h4>
                ${d.event.k === 'quiet' ? '' : `<p class="ev-title">${esc(d.event.t)}</p>`}
                <p class="ev-text">${esc(d.event.d)}</p>
                ${d.event.hook ? `<p class="ev-hook"><strong>Hook:</strong> ${esc(d.event.hook)}</p>` : ''}
                ${d.find ? `<p class="ev-find"><strong>🪶 By the way:</strong> ${esc(d.find)}</p>` : ''}
            </section>
            ${d.camp ? `<section class="day-block">
                <h4>🏕️ Tonight</h4>
                <p class="ev-text">The party camps ${esc(d.camp.site)}.</p>
                ${d.camp.note ? `<p class="camp-note ${d.camp.note.good ? 'good' : 'bad'}">${d.camp.note.good ? '👍' : '👎'} ${esc(d.camp.note.t)}</p>` : ''}
                ${d.camp.watch ? `<p class="ev-hook"><strong>${esc(d.camp.watch.when)}:</strong> ${esc(d.camp.watch.t)}</p>` : ''}
            </section>` : ''}
            <section class="day-block">
                <h4>🥾 Distance</h4>
                <div class="dist-miles">${d.today}<small>miles today</small></div>
                <p class="dist-sum">${esc(TRAVEL_PACES[d.dist.pace].label)} pace, ${d.dist.hours} hour${d.dist.hours === 1 ? '' : 's'} on the road.
                    ${goal ? `${d.covered} of ${goal} miles${d.arrived ? '' : `; about ${daysLeft} more day${daysLeft === 1 ? '' : 's'} at this pace`}.` : `${d.covered} miles since setting out.`}</p>
                ${d.dist.notes.length || d.dist.forced.length || d.sky.effect ? `<ul class="dist-notes">
                    ${d.dist.notes.map(n => `<li>${esc(n)}</li>`).join('')}
                    ${d.dist.forced.map(f => ruleText(`<li>Forced march, hour ${f.hour}: each traveler makes a DC ${f.dc} {save:con} save or gains one level of exhaustion.</li>`)).join('')}
                    ${d.sky.effect ? `<li>${esc(d.sky.effect)}</li>` : ''}
                </ul>` : ''}
                ${d.arrived ? `<p class="day-arrived">🏁 The party arrives on day ${d.day}.</p>` : ''}
            </section>

        </div>`;

    const earlier = travel.days.slice(0, -1);
    document.getElementById('travel-log').hidden = !earlier.length;
    document.getElementById('travel-log-list').innerHTML = earlier.slice().reverse().map(e => `
        <li><button type="button" class="log-day" data-day="${e.day}" title="Go back to day ${e.day}">
            <b>Day ${e.day}</b>
            <span>${WEATHER_KINDS[e.weather.kind].icon} ${esc(weatherHeadline(e.weather))} · ${e.today} mi · ${ROAD_EVENT_KINDS[e.event.k].icon} ${esc(e.event.k === 'quiet' ? 'Quiet day' : e.event.t)}</span>
        </button></li>`).join('');

    const next = document.getElementById('tr-next');
    next.disabled = d.arrived || d.day >= TRAVEL_MAX_DAYS;
    next.textContent = d.arrived ? '🏁 Arrived' : '▶ Next Day';
}

// ── Split (F24) ───────────────────────────────────────────
// URL param → field id.
const SPLIT_FIELDS = { cp: 'sp-cp', sp: 'sp-sp', ep: 'sp-ep', gp: 'sp-gp', pp: 'sp-pp', other: 'sp-other', n: 'sp-n', names: 'sp-names' };
const SPLIT_MAX = 20;
const SPLIT_COIN_MAX = 99999999;

let split = { seed: null, result: null };

function splitNames() {
    return document.getElementById('sp-names').value.split(',')
        .map(n => n.trim().slice(0, 40)).filter(Boolean).slice(0, SPLIT_MAX);
}

// Names, when given, set the party size.
function splitOpts() {
    const num = id => Math.min(SPLIT_COIN_MAX, Math.max(0, Number(document.getElementById(id).value) || 0));
    const coins = {};
    Object.keys(COIN_CP).forEach(k => { coins[k] = Math.floor(num('sp-' + k)); });
    const names = splitNames();
    const sizeEl = document.getElementById('sp-n');
    const n = names.length || Math.min(SPLIT_MAX, Math.max(1, Math.floor(Number(sizeEl.value)) || 1));
    return { coins, other: Math.round(num('sp-other') * 100) / 100, names, n };
}

// The party size a split starts from: the Party tab's (party.js), or the field's default.
function splitPartySize() {
    const n = loadParty().length;
    return n ? String(n) : defaultValue(document.getElementById('sp-n'));
}

// The Party tab's characters: their number, and their names when any has one.
function splitUseParty(list) {
    document.getElementById('sp-n').value = list.length;
    document.getElementById('sp-names').value = list.some(c => c.name || c.player) ? list.map((c, i) => partyMemberName(c, i).replace(/,/g, '')).join(', ') : '';
    showSplit(false);
    flash('split-status', `👥 Split ${list.length} way${list.length === 1 ? '' : 's'}, for the party.`);
}

function splitParams() {
    const params = {};
    Object.entries(SPLIT_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = el.value.trim() !== '' && (key === 'n' || fieldValue(el) !== defaultValue(el)) ? el.value.trim() : null;
    });
    if (splitNames().length) params.n = null;
    params.seed = split.result && split.result.left ? split.seed : null;
    return urlFor('split', params);
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function showSplit(push) {
    const o = splitOpts();
    const sizeEl = document.getElementById('sp-n');
    sizeEl.disabled = o.names.length > 0;
    if (o.names.length) sizeEl.value = o.names.length;
    const total = coinsToCp(o.coins, o.other);
    const r = splitCoins(total, o.n);
    const lucky = r.left ? withSeed(split.seed, () => Math.floor(rand() * o.n)) : -1;
    const who = i => o.names[i] || `Party member ${i + 1}`;
    split.result = { ...r, total, lucky, who, names: o.names };
    renderSplit();
    if (push !== null) setUrlParams(splitParams(), push);
}

function renderSplit() {
    const { total, ways, each, left, lucky, who, names } = split.result;
    const box = document.getElementById('split-result');
    document.getElementById('sp-reroll').disabled = !left;
    if (!total) {
        box.innerHTML = '<p class="split-empty">Nothing to split yet. Count the coins above.</p>';
        return;
    }
    const cp = n => formatCoins(n / 100, true);
    box.innerHTML = `
        <div class="split-total">${cp(total)} in all, split ${ways} way${ways === 1 ? '' : 's'}</div>
        <div class="split-each">${cp(each)}</div>
        <div class="split-each-label">each</div>
        ${left ? `<p class="split-left">🪙 ${left} cp left over: ${esc(who(lucky))} gets ${left === 1 ? 'it' : 'them'}.</p>` : ''}
        ${names.length ? `<ul class="split-list">${names.map((n, i) => `
            <li${i === lucky ? ' class="lucky"' : ''}><b>${esc(n)}</b><span>${cp(each + (i === lucky ? left : 0))}</span></li>`).join('')}</ul>` : ''}`;
}

function splitText() {
    const { total, ways, each, left, lucky, who, names } = split.result;
    const cp = n => formatCoins(n / 100, true);
    const lines = [`Party split: ${cp(total)}, ${ways} way${ways === 1 ? '' : 's'}`, `Each: ${cp(each)}`];
    if (left) lines.push(`Leftover: ${left} cp to ${who(lucky)}`);
    names.forEach((n, i) => lines.push(`  ${n}: ${cp(each + (i === lucky ? left : 0))}`));
    return lines.join('\n');
}

function clearSplit() {
    Object.values(SPLIT_FIELDS).forEach(id => { const el = document.getElementById(id); el.value = defaultValue(el); });
    document.getElementById('sp-n').value = splitPartySize();
    showSplit(true);
}

// ── URL ───────────────────────────────────────────────────
// Names: ?for=<type>&seed=. Travel: ?tab=travel&climate=&season=&terrain=&pace=&hours=&ride=&miles=&day=&seed=
function tabParams(tab) {
    if (TOOLBOX_STORED_TABS.includes(tab)) return urlFor(tab, {});
    if (tab === 'split') return splitParams();
    if (tab === 'enc') return encParams();
    if (tab === 'tavern') return tavParams();
    if (tab === 'down') return downParams();
    if (tab === 'quest') return questParams();
    return tab === 'travel' ? travelParams() : nameParams();
}

// Rebuild the page from the address bar. Returns true when it held a roll.
function applyUrl() {
    const tab = currentTab();
    showTab(tab);
    const p = urlParams();
    const seed = parseSeed(p.get('seed'));
    if (tab === 'tables') applyTablesUrl(p);   // a shared table, if the link holds one
    if (TOOLBOX_STORED_TABS.includes(tab)) return true;   // nothing to roll; their state is in localStorage
    if (tab === 'enc') { applyEncUrl(p); return true; }
    if (tab === 'tavern') return applyTavUrl(p);
    if (tab === 'down') return applyDownUrl(p);
    if (tab === 'quest') return applyQuestUrl(p);
    if (tab === 'split') {
        Object.entries(SPLIT_FIELDS).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (!setFieldValue(el, p.get(key))) el.value = key === 'n' ? splitPartySize() : defaultValue(el);
        });
        split.seed = seed || newSeed();
        showSplit(seed ? null : false);   // a link without a seed gets one, so it can be shared
        return true;
    }
    if (tab === 'travel') {
        Object.entries(TRAVEL_FIELDS).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
        });
        if (!seed) return false;
        travel = { seed, day: Math.max(1, parseInt(p.get('day'), 10) || 1), days: [] };
        showJourney(null);
        return true;
    }
    const sel = document.getElementById('name-for');
    if (!setFieldValue(sel, p.get('for'))) sel.value = defaultValue(sel);
    if (seed) { rollNamesFor(seed, null); return true; }
    return false;
}

// A first roll for the tab on screen, replacing the URL (no new history entry).
function rollFresh() {
    if (currentTab() === 'travel') newJourney(false);
    else if (currentTab() === 'tavern') rollTavernFor(newSeed(), false);
    else if (currentTab() === 'quest') rollQuestFor(newSeed(), false);
    else rollNamesFor(newSeed(), false);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    setupNamePicker();
    setupTravelForm();
    setupEncounter();
    setupTavern();
    setupDowntime();
    setupQuest();
    setupTables();
    loadKept();
    renderKept();
    document.getElementById('sp-n').value = splitPartySize();
    partyChip(document.getElementById('sp-party-chip'), { label: 'Use the Party', title: "Split for the Party tab's characters, by name", act: splitUseParty });
    // The party chips' Edit links switch tabs here instead of reloading the page.
    document.addEventListener('click', e => {
        if (!e.target.closest('a.party-chip-edit') || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        document.querySelector('.tool-tab[data-tab="party"]').click();
        document.querySelector('.tool-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Each tab keeps its roll in memory; the first visit to a tab rolls one.
    onTabLinks(tab => {
        if (tab === currentTab()) return;
        showTab(tab);
        if (tab === 'travel' && !travel.seed) { travel = { seed: newSeed(), day: 1, days: [] }; showJourney(null); }
        if (tab === 'names' && !names.seed) rollNamesFor(newSeed(), null);
        if (tab === 'tavern' && !tavern.seed) rollTavernFor(newSeed(), null);
        // A first visit starts from the party as it is now (it may have been entered since the page loaded).
        if (tab === 'enc') encFirstVisit();
        if (tab === 'quest' && !quest.seed) { questUseParty(); rollQuestFor(newSeed(), null); }
        if (tab === 'split' && !split.seed) { document.getElementById('sp-n').value = splitPartySize(); split.seed = newSeed(); showSplit(null); }
        if (tab === 'down' && !dt.seed) initDowntime(null);
        setUrlParams(tabParams(tab), true);
    });
    document.getElementById('roll-names').addEventListener('click', () => rollNamesFor());
    document.getElementById('name-for').addEventListener('change', () => rollNamesFor());
    document.getElementById('name-list').addEventListener('click', onNameListClick);
    document.getElementById('kept-list').addEventListener('click', onKeptClick);
    document.getElementById('kept-copy').addEventListener('click', () =>
        copyText(kept.map(k => k.name).join('\n'), 'names-status', `${kept.length} kept name${kept.length === 1 ? '' : 's'}`));
    document.getElementById('kept-clear').addEventListener('click', clearKept);
    document.getElementById('names-link').addEventListener('click', () =>
        copyPageLink(ok => flash('names-status', ok ? '🔗 Link copied. It rolls these same ten names.' : '⚠️ Copy blocked by the browser.')));

    document.getElementById('tr-new').addEventListener('click', () => newJourney());
    document.getElementById('tr-next').addEventListener('click', nextDay);
    // A new climate, terrain, or pace replays the same trip (same seed and day).
    Object.values(TRAVEL_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => showJourney(false)));
    document.getElementById('travel-log-list').addEventListener('click', e => {
        const btn = e.target.closest('.log-day');
        if (!btn) return;
        travel.day = Number(btn.dataset.day);
        showJourney(true);
    });
    document.getElementById('tr-copy').addEventListener('click', () => {
        const d = travel.days[travel.days.length - 1];
        if (d) copyText(travelDayText(d, travelOpts()), 'travel-status', `day ${d.day}`);
    });
    document.getElementById('tr-link').addEventListener('click', () =>
        copyPageLink(ok => flash('travel-status', ok ? '🔗 Link copied. It replays this journey up to today.' : '⚠️ Copy blocked by the browser.')));

    Object.values(SPLIT_FIELDS).forEach(id => document.getElementById(id).addEventListener('input', () => showSplit(false)));
    document.getElementById('sp-reroll').addEventListener('click', () => { split.seed = newSeed(); showSplit(true); });
    document.getElementById('sp-clear').addEventListener('click', clearSplit);
    document.getElementById('sp-copy').addEventListener('click', () => {
        if (split.result && split.result.total) copyText(splitText(), 'split-status', 'the split');
        else flash('split-status', 'Nothing to split yet.');
    });
    document.getElementById('sp-link').addEventListener('click', () =>
        copyPageLink(ok => flash('split-status', ok ? '🔗 Link copied. It opens this same split.' : '⚠️ Copy blocked by the browser.')));

    if (!applyUrl()) rollFresh();
    // Back/Forward step through earlier rolls and days.
    window.addEventListener('popstate', () => { if (!applyUrl()) rollFresh(); });
});
