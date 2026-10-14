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
const BST_CRS = [...new Set(MONSTERS.map(m => m.cr))].sort((a, b) => crValue(a) - crValue(b));

let open = new Set();   // ids whose stat block is open
let picks = [];         // [{ id, count }]
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
function setupFilters() {
    const crOpts = BST_CRS.map(c => `<option value="${c}">CR ${c}</option>`).join('');
    document.getElementById('bst-cr-min').insertAdjacentHTML('beforeend', crOpts);
    document.getElementById('bst-cr-max').insertAdjacentHTML('beforeend', crOpts);
    const types = [...new Set(MONSTERS.map(m => m.type))].sort();
    document.getElementById('bst-type').insertAdjacentHTML('beforeend',
        types.map(t => `<option value="${t}">${cap(t)}</option>`).join(''));
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

function filtered(f) {
    const lo = f.min ? crValue(f.min) : -1, hi = f.max ? crValue(f.max) : 99;
    return MONSTERS.filter(m => (!f.q || m.name.toLowerCase().includes(f.q) || m.type.includes(f.q))
        && crValue(m.cr) >= Math.min(lo, hi) && crValue(m.cr) <= Math.max(lo, hi)
        && (!f.type || m.type === f.type) && (!f.size || m.size === f.size)
        && (!f.hab || habsOf(m).includes(f.hab)))
        .sort(BST_SORTS[f.sort] || BST_SORTS.name);
}

// ── The list ──────────────────────────────────────────────
function rowHtml(m) {
    const isOpen = open.has(m.id);
    const habs = habsOf(m).map(h => ENC_HABITATS[h]);
    return `
    <li class="bst-row${isOpen ? ' open' : ''}" data-id="${m.id}">
        <div class="bst-head">
            <button type="button" class="bst-name" aria-expanded="${isOpen}" aria-controls="sb-${m.id}">
                <span class="bst-cr">CR ${m.cr}</span> <span class="bst-title">${esc(m.name)}</span>
            </button>
            <span class="bst-meta">${BST_SIZES[m.size]} ${m.type} · AC ${m.ac} · HP ${m.hp} · ${m.xp.toLocaleString()} XP</span>
            <span class="bst-habs" title="${esc(habs.map(h => h.label).join(', ') || 'No usual habitat')}">${habs.map(h => h.icon).join('')}</span>
            <button type="button" class="bst-add" data-act="pick" aria-label="Add a ${esc(m.name)} to the encounter list" title="Add to the encounter list">＋</button>
        </div>
        ${isOpen ? blockHtml(m) : ''}
    </li>`;
}

function blockHtml(m) {
    const body = blocksFailed ? '<p class="sb-note">The stat blocks didn\'t load. Check your connection, then close and open this one again.</p>'
        : monsterBlockHtml(m);
    return `<div class="sb-box" id="sb-${m.id}">
        <h3 class="bst-sb-name">${esc(m.name)}</h3>
        ${body}
        <div class="bst-acts">
            <button type="button" class="btn btn-gold" data-act="pick">➕ Add to Encounter List</button>
            <a class="btn" href="toolbox?${paramsQuery({ tab: 'init', add: `${m.id}.1` })}">🎲 Add to Initiative</a>
            <a class="btn" href="monster-maker?${paramsQuery({ from: m.id })}">🐲 Tweak in the Monster Maker</a>
            <a class="btn" href="monster/${m.id}">📄 Its Own Page</a>
            <button type="button" class="btn" data-act="copy">📋 Copy Stat Block</button>
            <button type="button" class="btn" data-act="link">🔗 Copy Link</button>
        </div>
    </div>`;
}

function render() {
    const f = filters();
    const list = filtered(f);
    document.getElementById('bst-list').innerHTML = list.map(rowHtml).join('');
    document.getElementById('bst-empty').hidden = list.length > 0;
    document.getElementById('bst-count').textContent = list.length === MONSTERS.length
        ? `All ${MONSTERS.length} SRD monsters.` : `${list.length} of ${MONSTERS.length} monsters.`;
    if (!blocksReady() && !blocksFailed && list.some(m => open.has(m.id))) loadBlocks();
}

function loadBlocks() {
    loadMonsterBlocks().then(render).catch(() => { blocksFailed = true; render(); });
}

function bstParams() {
    const f = filters();
    const cr = f.min && f.max ? (f.min === f.max ? f.min : `${f.min}-${f.max}`) : f.min ? `${f.min}-` : f.max ? `-${f.max}` : null;
    return { q: f.q || null, cr, type: f.type || null, size: f.size || null, hab: f.hab || null,
        sort: f.sort === 'name' ? null : f.sort, m: [...open] };
}

function applyUrl() {
    const p = urlParams();
    document.getElementById('bst-q').value = (p.get('q') || '').slice(0, 40);
    const [min, max = min] = (p.get('cr') || '').split('-');
    const set = (id, v) => { const el = document.getElementById(id); if (!setFieldValue(el, v)) el.value = defaultValue(el); };
    set('bst-cr-min', min || null);
    set('bst-cr-max', max || null);
    ['type', 'size', 'hab', 'sort'].forEach(k => set('bst-' + k, p.get(k)));
    open = new Set(p.getAll('m').filter(id => Object.hasOwn(MONSTER_BY_ID, id)).slice(0, 12));
    render();
}

function toggleRow(id) {
    if (open.has(id)) open.delete(id);
    else open.add(id);
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
    else if (act.dataset.act === 'link') navigator.clipboard.writeText(`${location.origin}${location.pathname}?${paramsQuery({ m: m.id })}`)
        .then(() => bstFlash(`🔗 Copied a link to the ${m.name}.`))
        .catch(() => bstFlash('⚠️ Copy blocked by the browser.'));
}

// ── The encounter list ────────────────────────────────────
function loadPicks() {
    picks = [];
    try {
        const saved = JSON.parse(localStorage.getItem(PICKS_KEY));
        if (Array.isArray(saved)) saved.forEach(p => {
            if (p && typeof p.id === 'string' && Object.hasOwn(MONSTER_BY_ID, p.id) && picks.length < PICKS_MAX && !picks.some(x => x.id === p.id))
                picks.push({ id: p.id, count: Math.max(1, Math.min(PICK_MAX_COUNT, Math.round(Number(p.count)) || 1)) });
        });
    } catch (e) {}
}

function savePicks() {
    try { localStorage.setItem(PICKS_KEY, JSON.stringify(picks)); } catch (e) {}
}

function addPick(id) {
    const m = MONSTER_BY_ID[id];
    const p = picks.find(x => x.id === id);
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
    document.getElementById('bst-to-enc').href = `toolbox?${paramsQuery({ tab: 'enc', m: ms })}`;
    document.getElementById('bst-to-init').href = `toolbox?${paramsQuery({ tab: 'init', add: ms })}`;
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
        savePicks();
        renderPicks();
        bstFlash('🧹 The encounter list is empty.');
    });
    window.addEventListener('popstate', applyUrl);
    // Another tab of the Bestiary changed the encounter list.
    window.addEventListener('storage', e => {
        if (e.key === PICKS_KEY) { loadPicks(); renderPicks(); }
    });
});
