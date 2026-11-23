/* ============================================
   BESTIARY PAGE (F43)
   Every SRD 5.1 monster in monsters-data.js, filtered by name, CR range, type, size,
   and habitat (encounter-engine.js's ENC_HABITATS). A row opens the full stat block
   (toolbox-statblock.js, which loads monster-statblocks.js the first time).
   The URL holds the filters and the open stat blocks: ?q=&cr=<min>[-<max>]&type=&size=&hab=&sort=&m=<id>.
   The encounter list (localStorage PICKS_KEY) collects monsters and sends them to the
   Toolbox: ?tab=enc&m=<id>.<n> (replaces the Encounter tab's list) or
   ?tab=init&add=<id>.<n> (joins the saved fight; see applyInitAdds in toolbox-table.js).
   Each stat block also opens in the Monster Maker (monster-maker.html?from=<id>) to tweak.
   With the SRD 5.2 additions on (srd52.js), their 17 monsters join the list, tagged 📗, with no
   page of their own. In 2024 rules mode (srd52.js) MONSTERS holds the 330 SRD 5.2 monsters, drawn
   in the 2024 layout; a monster's own page is its SRD 5.1 twin's (rulesOldId), labelled 2014.
   ============================================ */

const PICKS_KEY = 'gazette-bestiary-picks';
const PICKS_MAX = 12;   // the Encounter tab's ENC_MAX_KINDS
const PICK_MAX_COUNT = 40;   // its ENC_MAX_COUNT and the tracker's INIT_MAX
const BST_SIZES = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
const BST_SORTS = {
    name: (a, b) => a.name.localeCompare(b.name),
    cr: (a, b) => crValue(a.cr) - crValue(b.cr) || a.name.localeCompare(b.name),
    crdown: (a, b) => crValue(b.cr) - crValue(a.cr) || a.name.localeCompare(b.name),
    hp: (a, b) => b.hp - a.hp || a.name.localeCompare(b.name),
    ac: (a, b) => b.ac - a.ac || a.name.localeCompare(b.name)
};

let open = new Set();   // row ids whose stat block is open
let openIds = [];       // the ids asked for (the address's m=), kept while this edition lacks them
let picks = [];         // [{ id, count }]
let parked = [];        // saved picks this edition has no row for (a 2024 monster under 2014): kept, not shown
const PICKS_SAVED_MAX = PICKS_MAX * 2;
let blocksFailed = false;

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function bstFlash(text) {
    const el = document.getElementById('bst-status');
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 2500);
}

function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function habsOf(m) {
    return ENC_MONSTER_HABITATS[m.id] || [];
}

// ── Filters ───────────────────────────────────────────────
// The CR and type options come from the list shown (2014 and 2024 differ a little), keeping
// the first "any" option and whatever was picked.
function fillListFilters() {
    const crs = [...new Set(allMonsters().map(m => m.cr))].sort((a, b) => crValue(a) - crValue(b));
    const fill = (id, values, label) => {
        const el = document.getElementById(id), keep = el.value;
        [...el.options].slice(1).forEach(o => o.remove());
        el.insertAdjacentHTML('beforeend', values.map(v => `<option value="${v}">${label(v)}</option>`).join(''));
        if ([...el.options].some(o => o.value === keep)) el.value = keep;
    };
    fill('bst-cr-min', crs, c => `CR ${c}`);
    fill('bst-cr-max', crs, c => `CR ${c}`);
    fill('bst-type', [...new Set(allMonsters().map(m => m.type))].sort(), cap);
}

function setupFilters() {
    fillListFilters();
    document.getElementById('bst-size').insertAdjacentHTML('beforeend',
        Object.entries(BST_SIZES).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));
    document.getElementById('bst-hab').insertAdjacentHTML('beforeend',
        ENC_HABITAT_KEYS.map(k => `<option value="${k}">${ENC_HABITATS[k].icon} ${esc(ENC_HABITATS[k].label)}</option>`).join(''));
}

function filters() {
    const v = id => document.getElementById(id).value;
    return { q: v('bst-q').trim().toLowerCase(), min: v('bst-cr-min'), max: v('bst-cr-max'),
        type: v('bst-type'), size: v('bst-size'), hab: v('bst-hab'), sort: v('bst-sort') };
}

// The SRD 5.1 monsters, plus the SRD 5.2 additions when they're on.
function allMonsters() {
    return typeof srd52Monsters === 'function' ? [...MONSTERS, ...srd52Monsters()] : MONSTERS;
}

function filtered(f) {
    const lo = f.min ? crValue(f.min) : -1, hi = f.max ? crValue(f.max) : 99;
    return allMonsters().filter(m => (!f.q || m.name.toLowerCase().includes(f.q) || m.type.includes(f.q))
        && crValue(m.cr) >= Math.min(lo, hi) && crValue(m.cr) <= Math.max(lo, hi)
        && (!f.type || m.type === f.type) && (!f.size || m.size === f.size)
        && (!f.hab || habsOf(m).includes(f.hab)))
        .sort(BST_SORTS[f.sort] || BST_SORTS.name);
}

// ── The list ──────────────────────────────────────────────
// Creature-type picture (swarms use the beast one); compendium-export.js uses the same files for monster pages
function typeArt(m, small) { return `img/creature/${m.type === 'swarm' ? 'beast' : m.type}${small ? '-sm' : ''}.webp`; }

function rowHtml(m) {
    const isOpen = open.has(m.id);
    const habs = habsOf(m).map(h => ENC_HABITATS[h]);
    return `
    <li class="bst-row${isOpen ? ' open' : ''}" data-id="${m.id}">
        <div class="bst-head">
            <img class="bst-thumb" src="${typeArt(m, true)}" alt="" width="54" height="36" loading="lazy" decoding="async">
            <button type="button" class="bst-name" aria-expanded="${isOpen}" aria-controls="sb-${m.id}">
                <span class="bst-cr">CR ${m.cr}</span> <span class="bst-title">${esc(m.name)}</span>${m.v52 ? ' ' + srd52Tag() : ''}
            </button>
            <span class="bst-meta">${BST_SIZES[m.size]} ${m.type} · AC ${m.ac} · HP ${m.hp} · ${m.xp.toLocaleString()} XP</span>
            <span class="bst-habs" title="${esc(habs.map(h => h.label).join(', ') || 'No usual habitat')}">${habs.map(h => h.icon).join('')}</span>
            <button type="button" class="bst-add" data-act="pick" aria-label="Add a ${esc(m.name)} to the encounter list" title="Add to the encounter list">＋</button>
        </div>
        ${isOpen ? blockHtml(m) : ''}
    </li>`;
}

function blockHtml(m) {
    const body = blocksFailed && !m.block ? '<p class="sb-note">The stat blocks didn\'t load. Check your connection, then close and open this one again.</p>'
        : monsterBlockHtml(m);
    return `<div class="sb-box" id="sb-${m.id}">
        <div class="bst-art" aria-hidden="true"><img src="${typeArt(m, false)}" alt="" width="960" height="640" decoding="async"></div>
        <h3 class="bst-sb-name">${esc(m.name)}</h3>
        ${body}
        <div class="bst-acts">
            <button type="button" class="btn btn-gold" data-act="pick">➕ Add to Encounter List</button>
            <a class="btn" href="toolbox?${paramsQuery(bstLinkParams({ tab: 'init', add: `${m.id}.1` }))}">🎲 Add to Initiative</a>
            <a class="btn" href="monster-maker?${paramsQuery(bstLinkParams({ from: m.id }))}">🐲 Tweak in the Monster Maker</a>
            ${ownPageLink(m)}
            <button type="button" class="btn" data-act="copy">📋 Copy Stat Block</button>
            <button type="button" class="btn" data-act="link">🔗 Copy Link</button>
        </div>
    </div>`;
}

// Its page in the compendium: always the SRD 5.1 text (L1T T0b), so a 2024 monster links its 5.1 twin.
function ownPageLink(m) {
    if (!m.v52) return `<a class="btn" href="monster/${m.id}">📄 Its Own Page</a>`;
    const old = typeof rulesOldId === 'function' && rulesVersion() === '2024' ? rulesOldId(m.id) : null;
    return old ? `<a class="btn" href="monster/${old}" title="The SRD 5.1 (2014) stat block">📄 2014 Page</a>` : '';
}

function bstLinkParams(params) {
    return typeof rulesLinkParams === 'function' ? rulesLinkParams(params) : params;
}

// A shared link to one monster. An SRD 5.2 addition shown among the 2014 monsters (the additions switch
// is the reader's own) opens with the 2024 rules, where everyone has it (B980).
function bstShareParams(m) {
    const added = m.v52 && typeof rulesVersion === 'function' && rulesVersion() === '2014';
    return added ? { m: m.id, rules: '2024' } : { m: m.id };
}

function render() {
    const f = filters();
    const list = filtered(f);
    document.getElementById('bst-list').innerHTML = list.map(rowHtml).join('');
    document.getElementById('bst-empty').hidden = list.length > 0;
    const all = allMonsters().length;
    document.getElementById('bst-count').textContent = list.length === all
        ? `All ${all} SRD monsters.` : `${list.length} of ${all} monsters.`;
    if (!blocksReady() && !blocksFailed && list.some(m => open.has(m.id))) loadBlocks();
}

function loadBlocks() {
    loadMonsterBlocks().then(render).catch(() => { blocksFailed = true; render(); });
}

function bstParams() {
    const f = filters();
    const cr = f.min && f.max ? (f.min === f.max ? f.min : `${f.min}-${f.max}`) : f.min ? `${f.min}-` : f.max ? `-${f.max}` : null;
    return { q: f.q || null, cr, type: f.type || null, size: f.size || null, hab: f.hab || null,
        sort: f.sort === 'name' ? null : f.sort, m: openIds };
}

function applyUrl() {
    const p = urlParams();
    document.getElementById('bst-q').value = (p.get('q') || '').slice(0, 40);
    const [min, max = min] = (p.get('cr') || '').split('-');
    const set = (id, v) => { const el = document.getElementById(id); if (!setFieldValue(el, v)) el.value = defaultValue(el); };
    set('bst-cr-min', min || null);
    set('bst-cr-max', max || null);
    ['type', 'size', 'hab', 'sort'].forEach(k => set('bst-' + k, p.get(k)));
    openIds = [...new Set(p.getAll('m').filter(id => /^[a-z0-9-]{1,60}$/.test(id)))].slice(0, PICKS_MAX);
    resolveOpen();
    render();
}

// The rows the asked-for ids open, by the row's own id: in 2024 ?m=goblin opens the Goblin Warrior's row.
// An id this edition lacks stays in openIds (and the address), so it opens again on the way back.
function resolveOpen() {
    open = new Set(openIds.filter(id => Object.hasOwn(MONSTER_BY_ID, id)).map(id => MONSTER_BY_ID[id].id));
}

function toggleRow(id) {
    if (open.has(id)) {
        open.delete(id);
        openIds = openIds.filter(x => !Object.hasOwn(MONSTER_BY_ID, x) || MONSTER_BY_ID[x].id !== id);
    } else {
        // The address holds 12 at most: a 13th wouldn't come back on a reload. An asked-for id this
        // edition has no row for (another edition's monster, or a made-up one) gives up its place first (B981).
        if (openIds.length >= PICKS_MAX) {
            const idle = openIds.findIndex(x => !Object.hasOwn(MONSTER_BY_ID, x));
            if (idle < 0) { bstFlash(`⚠️ ${PICKS_MAX} stat blocks open at most. Close one first.`); return; }
            openIds.splice(idle, 1);
        }
        open.add(id);
        openIds.push(id);
    }
    if (open.has(id) && blocksFailed) blocksFailed = false;   // try the load again
    setUrlParams(bstParams(), false);
    render();
}

function onListClick(e) {
    const row = e.target.closest('.bst-row');
    if (!row) return;
    const m = MONSTER_BY_ID[row.dataset.id];
    const spell = e.target.closest('.sb-spell');
    if (spell) { sbSpellClick(spell, row); return; }
    if (e.target.closest('.bst-name')) { toggleRow(m.id); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'pick') addPick(m.id);
    else if (act.dataset.act === 'copy') navigator.clipboard.writeText(monsterBlockText(m))
        .then(() => bstFlash(`📋 Copied the ${m.name} stat block.`))
        .catch(() => bstFlash('⚠️ Copy blocked by the browser.'));
    else if (act.dataset.act === 'link') navigator.clipboard.writeText(`${location.origin}${location.pathname}?${paramsQuery(bstLinkParams(bstShareParams(m)))}`)
        .then(() => bstFlash(`🔗 Copied a link to the ${m.name}.`))
        .catch(() => bstFlash('⚠️ Copy blocked by the browser.'));
}

// ── The encounter list ────────────────────────────────────
// The row a pick shows as (in 2024 a saved 'goblin' is the Goblin Warrior's row).
const pickRow = id => MONSTER_BY_ID[id].id;

function loadPicks() {
    picks = [];
    parked = [];
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PICKS_KEY)); } catch (e) {}
    if (!Array.isArray(saved)) return;
    saved.forEach(p => {
        if (!p || typeof p.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(p.id)) return;
        // One damaged count (an object with no toString) costs that pick its count, not the rest of the list.
        const n = typeof p.count === 'number' || typeof p.count === 'string' ? Number(p.count) : 1;
        const count = Math.max(1, Math.min(PICK_MAX_COUNT, Math.round(n) || 1));
        if (!Object.hasOwn(MONSTER_BY_ID, p.id)) {
            if (!parked.some(x => x.id === p.id)) parked.push({ id: p.id, count });
            return;
        }
        const same = picks.find(x => pickRow(x.id) === pickRow(p.id));
        // Two saved picks on one row (2014's Orc and Thug are both 2024's Tough) show as one; parts keeps
        // each one's own id and count, so a switch back finds both again (B982).
        if (same) {
            same.parts = (same.parts || [{ id: same.id, count: same.count }]).concat({ id: p.id, count });
            same.count = Math.min(PICK_MAX_COUNT, same.count + count);
        }
        else if (picks.length < PICKS_MAX) picks.push({ id: p.id, count });
        // Past the list's room (a rules switch let more back in): kept with the parked ones, not dropped at the next save.
        else if (!parked.some(x => x.id === p.id)) parked.push({ id: p.id, count });
    });
}

// A merged pick saves as its parts while its count is still theirs; once changed here it saves as one.
function savedPicks() {
    return picks.flatMap(p => p.parts && p.count === p.parts.reduce((t, x) => t + x.count, 0)
        ? p.parts.map(x => ({ id: x.id, count: x.count })) : [{ id: p.id, count: p.count }]);
}

function savePicks() {
    try { localStorage.setItem(PICKS_KEY, JSON.stringify([...savedPicks(), ...parked].slice(0, PICKS_SAVED_MAX))); } catch (e) {
        // After the caller's own message ("➕ Orc ×1"), so this one stays on screen.
        queueMicrotask(() => bstFlash("⚠️ This browser wouldn't save the encounter list (storage full or blocked)."));
    }
}

function addPick(id) {
    const m = MONSTER_BY_ID[id];
    const p = picks.find(x => pickRow(x.id) === pickRow(id));
    if (p) {
        if (p.count >= PICK_MAX_COUNT) { bstFlash(`⚠️ ${PICK_MAX_COUNT} is the most of one monster.`); return; }
        p.count++;
    } else {
        if (picks.length >= PICKS_MAX) { bstFlash(`⚠️ The encounter list holds ${PICKS_MAX} kinds of monster.`); return; }
        picks.push({ id, count: 1 });
    }
    savePicks();
    renderPicks();
    bstFlash(`➕ ${m.name} ×${(p || picks[picks.length - 1]).count} on the encounter list.`);
}

function renderPicks() {
    const tray = document.getElementById('bst-tray');
    tray.hidden = !picks.length;
    if (!picks.length) return;
    const xp = picks.reduce((t, p) => t + MONSTER_BY_ID[p.id].xp * p.count, 0);
    const n = picks.reduce((t, p) => t + p.count, 0);
    document.getElementById('bst-tray-sum').textContent = `${n} monster${n === 1 ? '' : 's'} · ${xp.toLocaleString()} XP`;
    document.getElementById('bst-picks').innerHTML = picks.map((p, i) => `
        <li data-i="${i}">
            <span>${esc(MONSTER_BY_ID[p.id].name)}</span>
            <button type="button" data-act="less" aria-label="One fewer ${esc(MONSTER_BY_ID[p.id].name)}">−</button>
            <b>${p.count}</b>
            <button type="button" data-act="more" aria-label="One more ${esc(MONSTER_BY_ID[p.id].name)}">+</button>
            <button type="button" data-act="drop" aria-label="Remove ${esc(MONSTER_BY_ID[p.id].name)}">✕</button>
        </li>`).join('');
    const ms = picks.map(p => `${p.id}.${p.count}`);
    document.getElementById('bst-to-enc').href = `toolbox?${paramsQuery(bstLinkParams({ tab: 'enc', m: ms }))}`;
    document.getElementById('bst-to-init').href = `toolbox?${paramsQuery(bstLinkParams({ tab: 'init', add: ms }))}`;
}

function onPicksClick(e) {
    const btn = e.target.closest('button[data-act]');
    const li = e.target.closest('li');
    if (!btn || !li) return;
    const i = Number(li.dataset.i);
    const p = picks[i];
    if (btn.dataset.act === 'more') p.count = Math.min(PICK_MAX_COUNT, p.count + 1);
    else if (btn.dataset.act === 'less' && p.count > 1) p.count--;
    else picks.splice(i, 1);
    savePicks();
    renderPicks();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    setupFilters();
    loadPicks();
    renderPicks();
    applyUrl();

    const onFilter = () => { setUrlParams(bstParams(), false); render(); };
    document.getElementById('bst-q').addEventListener('input', onFilter);
    document.querySelectorAll('.bst-controls select').forEach(el => el.addEventListener('change', onFilter));
    document.getElementById('bst-reset').addEventListener('click', () => {
        document.getElementById('bst-q').value = '';
        document.querySelectorAll('.bst-controls select').forEach(el => { el.value = defaultValue(el); });
        onFilter();
    });
    document.getElementById('bst-list').addEventListener('click', onListClick);
    document.getElementById('bst-picks').addEventListener('click', onPicksClick);
    document.getElementById('bst-clear').addEventListener('click', () => {
        picks = [];
        parked = [];
        savePicks();
        renderPicks();
        bstFlash('🧹 The encounter list is empty.');
    });
    window.addEventListener('popstate', applyUrl);
    // SRD 5.2 additions (srd52.js): the switch sits under the filters.
    if (typeof srd52Toggle === 'function') {
        document.getElementById('bst-v52').innerHTML = srd52Toggle();
        srd52OnChange(() => {
            resolveOpen();
            fillListFilters();
            loadPicks();
            renderPicks();
            render();
        });
    }
    // Another tab of the Bestiary changed the encounter list.
    window.addEventListener('storage', e => {
        if (e.key === PICKS_KEY) { loadPicks(); renderPicks(); }
    });
});
