/* ============================================
   DM TOOLBOX: ENCOUNTER TAB (F25)
   Build a fight from the SRD 5.1 monsters (monsters-data.js), rate it against the
   party's SRD 5.2 XP budget (encounter-engine.js), and send it to the Initiative tab
   (addToFight in toolbox-table.js). Nothing is stored: the URL holds the party and the monsters.
   URL: ?tab=enc&party=4x3&party=1x5&m=goblin.4&m=bugbear.1&diff=moderate&type=&env=&band=&pack=&seed=
   (env/band: the roll pickers; pack: the group a roll landed on; seed: the scene).
   ============================================ */

const ENC_MAX_GROUPS = 6;
const ENC_MAX_KINDS = 12;
const ENC_MAX_COUNT = 40;
const ENC_PICKER_ROWS = 40;
const ENC_DEFAULT_PARTY = [{ count: 4, level: 3 }];

let enc = { party: ENC_DEFAULT_PARTY.map(g => ({ ...g })), list: [], seed: null, band: null };

function clampInt(v, lo, hi, def) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
}

function encBudget() {
    return partyBudget(enc.party);
}

function typeName(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

// ── Setup ─────────────────────────────────────────────────
function setupEncounterForm() {
    const types = [...new Set(MONSTERS.map(m => m.type))].sort();
    ['en-type', 'en-roll-type'].forEach(id => {
        const sel = document.getElementById(id);
        types.forEach(t => sel.add(new Option(typeName(t), t)));
    });
    const env = document.getElementById('en-env');
    ENC_HABITAT_KEYS.forEach(k => env.add(new Option(`${ENC_HABITATS[k].icon} ${ENC_HABITATS[k].label}`, k)));
    const band = document.getElementById('en-band');
    [...ENC_BANDS].sort((a, b) => a.label.localeCompare(b.label)).forEach(b => band.add(new Option(`${b.icon} ${b.label}`, b.key)));
    const crSel = document.getElementById('en-cr');
    [...new Set(MONSTERS.map(m => m.cr))].forEach(cr => crSel.add(new Option(`CR ${cr}`, cr)));
}

// ── Party ─────────────────────────────────────────────────
function renderParty() {
    const levels = l => Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}"${i + 1 === l ? ' selected' : ''}>level ${i + 1}</option>`).join('');
    document.getElementById('en-party').innerHTML = enc.party.map((g, i) => `
        <li data-i="${i}">
            <label><span class="sr-only">How many characters</span><input type="number" class="en-pc" min="1" max="10" step="1" value="${g.count}" inputmode="numeric"></label>
            <span>character${g.count === 1 ? '' : 's'} at</span>
            <label><span class="sr-only">Level</span><select class="en-pl">${levels(g.level)}</select></label>
            ${enc.party.length > 1 ? `<button type="button" class="en-x" aria-label="Remove this group" title="Remove">✕</button>` : ''}
        </li>`).join('');
    document.getElementById('en-add-group').disabled = enc.party.length >= ENC_MAX_GROUPS;
}

function onPartyInput(e) {
    const li = e.target.closest('li');
    if (!li) return;
    const g = enc.party[Number(li.dataset.i)];
    if (e.target.classList.contains('en-pc')) {
        g.count = clampInt(e.target.value, 1, 10, 1);
        li.querySelector('span:not(.sr-only)').textContent = `character${g.count === 1 ? '' : 's'} at`;
    }
    if (e.target.classList.contains('en-pl')) g.level = clampInt(e.target.value, 1, 20, 1);
    encChanged(false);
}

// ── Monster picker ────────────────────────────────────────
function pickerMatches() {
    const q = document.getElementById('en-search').value.trim().toLowerCase();
    const cr = document.getElementById('en-cr').value;
    const type = document.getElementById('en-type').value;
    const maxCr = Math.max(0.125, Math.floor(encBudget().avgLevel));
    return MONSTERS.filter(m => (!q || m.name.toLowerCase().includes(q))
        && (!type || m.type === type)
        && (!cr || (cr === 'party' ? crValue(m.cr) <= maxCr : m.cr === cr)));
}

function renderPicker() {
    const all = pickerMatches();
    const shown = all.slice(0, ENC_PICKER_ROWS);
    document.getElementById('en-results').innerHTML = shown.map(m => `
        <li><button type="button" class="en-pick" data-id="${m.id}" title="Add a ${esc(m.name)}">
            <span class="en-name">${esc(m.name)}</span>
            <span class="en-meta">CR ${m.cr} · ${m.xp.toLocaleString('en-US')} XP · AC ${m.ac} · HP ${m.hp} · ${esc(typeName(m.type))}</span>
            <span class="en-plus" aria-hidden="true">➕</span>
        </button></li>`).join('');
    document.getElementById('en-results-note').textContent = !all.length ? 'No monsters match. Try a shorter name or another filter.'
        : all.length > shown.length ? `Showing ${shown.length} of ${all.length}. Search or filter to narrow it down.` : `${all.length} monster${all.length === 1 ? '' : 's'}.`;
}

function addMonster(m, count = 1) {
    const e = enc.list.find(x => x.m === m);
    if (e) e.count = Math.min(ENC_MAX_COUNT, e.count + count);
    else {
        if (enc.list.length >= ENC_MAX_KINDS) { flash('enc-status', `⚠️ An encounter holds ${ENC_MAX_KINDS} kinds of monster.`); return; }
        enc.list.push({ m, count });
    }
    encChanged(false);
}

// ── Encounter ─────────────────────────────────────────────
function renderEncounter() {
    const budget = encBudget();
    const xp = encounterXp(enc.list);
    const rating = rateEncounter(xp, budget);
    const fmt = n => n.toLocaleString('en-US');

    document.getElementById('en-budget').innerHTML = `Budget for ${budget.chars} character${budget.chars === 1 ? '' : 's'}:
        ${['low', 'moderate', 'high'].map(k => `<span>${ENCOUNTER_LEVELS[k].icon} ${ENCOUNTER_LEVELS[k].label} <b>${fmt(budget[k])}</b></span>`).join(' ')} XP`;

    const box = document.getElementById('en-list');
    document.getElementById('en-empty').hidden = enc.list.length > 0;
    box.innerHTML = enc.list.map((e, i) => `
        <li data-i="${i}">
            <div class="en-row-main">
                <span class="en-name">${esc(e.m.name)}</span>
                <span class="en-meta">CR ${e.m.cr} · ${fmt(e.m.xp)} XP each · AC ${e.m.ac} · HP ${e.m.hp} · Init ${e.m.dex >= 0 ? '+' : ''}${e.m.dex}</span>
            </div>
            <div class="en-count">
                <button type="button" class="en-minus" aria-label="One fewer ${esc(e.m.name)}">−</button>
                <b>${e.count}</b>
                <button type="button" class="en-more" aria-label="One more ${esc(e.m.name)}">+</button>
            </div>
            <span class="en-sub">${fmt(e.m.xp * e.count)} XP</span>
            <button type="button" class="en-x" aria-label="Remove ${esc(e.m.name)}" title="Remove">✕</button>
        </li>`).join('');

    // The meter runs a quarter past the High budget, or further when the fight is bigger.
    const scale = Math.max(budget.high * 1.25, xp) || 1;
    const pct = n => Math.min(100, n / scale * 100).toFixed(1);
    const level = rating ? ENCOUNTER_LEVELS[rating] : null;
    document.getElementById('en-meter').innerHTML = `
        <div class="en-rating"><b>${level ? `${level.icon} ${level.label}` : 'No monsters yet'}</b><span>${fmt(xp)} XP</span></div>
        <div class="en-bar" role="img" aria-label="${fmt(xp)} XP against budgets of ${fmt(budget.low)}, ${fmt(budget.moderate)}, and ${fmt(budget.high)}">
            <span class="en-fill en-fill-${rating || 'none'}" style="width:${pct(xp)}%"></span>
            ${['low', 'moderate', 'high'].map(k => `<i style="left:${pct(budget[k])}%" title="${ENCOUNTER_LEVELS[k].label}: ${fmt(budget[k])} XP"></i>`).join('')}
        </div>
        ${level ? `<p class="en-desc">${esc(level.text)}</p>` : ''}
        ${encounterNotes(enc.list, budget).map(n => `<p class="en-note">⚠️ ${esc(n)}</p>`).join('')}`;
    ['en-send', 'en-copy'].forEach(id => { document.getElementById(id).disabled = !enc.list.length; });
    renderScene();
}

// ── Scene ─────────────────────────────────────────────────
function encScene() {
    if (!enc.list.length || !enc.seed) return null;
    return rollEncounterScene(enc.list, enc.seed, { habitat: document.getElementById('en-env').value, band: enc.band, level: encBudget().avgLevel });
}

function renderScene() {
    const box = document.getElementById('en-scene');
    const s = encScene();
    box.hidden = !s;
    if (!s) { box.innerHTML = ''; return; }
    const loot = s.loot.startsWith('hoard:') ? '🏆 Roll Their Hoard' : '💰 Roll What They Carry';
    box.innerHTML = `
        <div class="en-scene-head"><h4 class="en-scene-title">${esc(s.title)}</h4></div>
        <dl class="dt-scene">${encSceneLines(s).map(([label, text]) => `<div><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl>
        <div class="tool-toolbar en-scene-bar">
            <button type="button" class="btn" id="en-rescene">🎲 New Scene</button>
            <a class="btn" href="${esc(encLootLink(s))}">${loot}</a>
        </div>`;
}

function onEncListClick(e) {
    const btn = e.target.closest('button');
    const li = e.target.closest('li');
    if (!btn || !li) return;
    const i = Number(li.dataset.i);
    const entry = enc.list[i];
    if (btn.classList.contains('en-more')) entry.count = Math.min(ENC_MAX_COUNT, entry.count + 1);
    else if (btn.classList.contains('en-minus')) { if (--entry.count < 1) enc.list.splice(i, 1); }
    else if (btn.classList.contains('en-x')) enc.list.splice(i, 1);
    else return;
    encChanged(false);
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function encChanged(push) {
    if (enc.band && !encBandFits(ENC_BAND_BY_KEY[enc.band], enc.list)) enc.band = null;
    if (enc.list.length && !enc.seed) enc.seed = newSeed();
    if (!enc.list.length) { enc.seed = null; enc.band = null; }
    renderEncounter();
    if (document.getElementById('en-cr').value === 'party') renderPicker();
    if (push !== null) setUrlParams(encParams(), push);
}

function rollEncounterFor() {
    const diff = document.getElementById('en-diff').value;
    const opts = {
        type: document.getElementById('en-roll-type').value,
        habitat: document.getElementById('en-env').value,
        band: document.getElementById('en-band').value
    };
    const seed = newSeed();
    const res = withSeed(seed, () => rollThemedEncounter(encBudget(), diff, opts));
    if (!res.list.length) { flash('enc-status', '⚠️ No monsters fit those choices and this budget. Try another type, group, or habitat, or a higher difficulty.'); return; }
    enc.list = res.list;
    enc.band = res.band;
    enc.seed = seed;
    encChanged(true);
}

function encounterText() {
    const budget = encBudget();
    const xp = encounterXp(enc.list);
    const rating = rateEncounter(xp, budget);
    const lines = [
        `Encounter: ${rating ? ENCOUNTER_LEVELS[rating].label : 'empty'}, ${xp.toLocaleString('en-US')} XP`,
        `Party: ${enc.party.map(g => `${g.count} × level ${g.level}`).join(', ')} (Low ${budget.low.toLocaleString('en-US')} / Moderate ${budget.moderate.toLocaleString('en-US')} / High ${budget.high.toLocaleString('en-US')} XP)`
    ];
    enc.list.forEach(e => lines.push(`  ${e.count} × ${e.m.name} (CR ${e.m.cr}, ${e.m.xp.toLocaleString('en-US')} XP each; AC ${e.m.ac}, HP ${e.m.hp})`));
    const s = encScene();
    if (s) {
        lines.push('', s.title.toUpperCase());
        encSceneLines(s).forEach(([label, text]) => lines.push(`${label}: ${text}`));
    }
    return lines.join('\n');
}

// Each monster joins the tracker with its Dex modifier as the initiative bonus.
function sendToInitiative() {
    if (!enc.list.length) return;
    const want = enc.list.reduce((t, e) => t + e.count, 0);
    const added = enc.list.flatMap(e => addToFight({ name: e.m.name, mod: e.m.dex, hp: e.m.hp, ac: e.m.ac, count: e.count }));
    document.querySelector('.tool-tab[data-tab="init"]').click();
    if (!added.length) { flash('init-status', `⚠️ The tracker holds ${INIT_MAX} combatants. Clear some first.`); return; }
    sortFight();
    saveFight();
    renderFight();
    flash('init-status', added.length < want
        ? `⚔️ Added ${added.length} of ${want} monsters; the tracker holds ${INIT_MAX}.`
        : `⚔️ Added ${added.length} monster${added.length === 1 ? '' : 's'} from the encounter. Add the party, then Start Combat.`);
}

function clearEncounter() {
    enc = { party: ENC_DEFAULT_PARTY.map(g => ({ ...g })), list: [], seed: null, band: null };
    renderParty();
    encChanged(true);
}

// ── URL ───────────────────────────────────────────────────
function encParams() {
    const diff = document.getElementById('en-diff');
    const type = document.getElementById('en-roll-type');
    return urlFor('enc', {
        party: enc.party.map(g => `${g.count}x${g.level}`),
        m: enc.list.map(e => `${e.m.id}.${e.count}`),
        diff: fieldValue(diff) === defaultValue(diff) ? null : diff.value,
        type: type.value || null,
        env: document.getElementById('en-env').value || null,
        band: document.getElementById('en-band').value || null,
        pack: enc.band,
        seed: enc.list.length ? enc.seed : null
    });
}

function applyEncUrl(p) {
    const party = p.getAll('party').map(s => s.split('x'))
        .map(([c, l]) => ({ count: clampInt(c, 1, 10, 0), level: clampInt(l, 1, 20, 0) }))
        .filter(g => g.count && g.level).slice(0, ENC_MAX_GROUPS);
    enc.party = party.length ? party : ENC_DEFAULT_PARTY.map(g => ({ ...g }));
    enc.list = [];
    p.getAll('m').forEach(s => {
        const [id, n] = s.split('.');
        const m = MONSTER_BY_ID[id];
        if (m && enc.list.length < ENC_MAX_KINDS && !enc.list.some(e => e.m === m)) enc.list.push({ m, count: clampInt(n, 1, ENC_MAX_COUNT, 1) });
    });
    const FIELDS = { diff: 'en-diff', type: 'en-roll-type', env: 'en-env', band: 'en-band' };
    Object.entries(FIELDS).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(k))) el.value = defaultValue(el);
    });
    enc.band = ENC_BAND_BY_KEY[p.get('pack')] ? p.get('pack') : null;
    enc.seed = parseSeed(p.get('seed'));
    renderParty();
    renderPicker();
    // A link without a scene seed (older links, quest links) gets one, so it can be shared.
    if (enc.list.length && !enc.seed) encChanged(false);
    else encChanged(null);
}

function setupEncounter() {
    setupEncounterForm();
    renderParty();
    renderPicker();
    renderEncounter();
    const party = document.getElementById('en-party');
    party.addEventListener('input', onPartyInput);
    party.addEventListener('change', onPartyInput);
    party.addEventListener('click', e => {
        const li = e.target.closest('li');
        if (!e.target.closest('.en-x') || !li) return;
        enc.party.splice(Number(li.dataset.i), 1);
        renderParty();
        encChanged(false);
    });
    document.getElementById('en-add-group').addEventListener('click', () => {
        if (enc.party.length >= ENC_MAX_GROUPS) return;
        const last = enc.party[enc.party.length - 1];
        enc.party.push({ count: 1, level: last ? last.level : 1 });
        renderParty();
        encChanged(false);
    });
    ['en-search', 'en-cr', 'en-type'].forEach(id => document.getElementById(id).addEventListener('input', renderPicker));
    document.getElementById('en-results').addEventListener('click', e => {
        const btn = e.target.closest('.en-pick');
        if (btn) addMonster(MONSTER_BY_ID[btn.dataset.id]);
    });
    document.getElementById('en-list').addEventListener('click', onEncListClick);
    ['en-diff', 'en-roll-type', 'en-band'].forEach(id => document.getElementById(id).addEventListener('change', () => setUrlParams(encParams(), false)));
    // The habitat also sets where the current fight happens.
    document.getElementById('en-env').addEventListener('change', () => { renderScene(); setUrlParams(encParams(), false); });
    document.getElementById('en-scene').addEventListener('click', e => {
        if (!e.target.closest('#en-rescene')) return;
        enc.seed = newSeed();
        encChanged(true);
    });
    document.getElementById('en-roll').addEventListener('click', rollEncounterFor);
    document.getElementById('en-send').addEventListener('click', sendToInitiative);
    document.getElementById('en-copy').addEventListener('click', () => copyText(encounterText(), 'enc-status', 'the encounter'));
    document.getElementById('en-link').addEventListener('click', () =>
        copyPageLink(ok => flash('enc-status', ok ? '🔗 Link copied. It opens this party and these monsters.' : '⚠️ Copy blocked by the browser.')));
    document.getElementById('en-clear').addEventListener('click', clearEncounter);
}
