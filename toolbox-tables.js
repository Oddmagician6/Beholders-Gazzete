/* ============================================
   DM TOOLBOX: CUSTOM RANDOM TABLES (F49)
   The reader's own roll tables, kept in localStorage TABLES_KEY as [{ id, name, src, die }].
   Parsing, rolling, and share codes are in table-engine.js. A share link is
   ?tab=tables&t=<code>: the table and the tables it rolls, shown in a box to roll or save
   (nothing is saved until the reader asks). Rolls stay in memory.
   Loads after toolbox.js and toolbox-table.js (uses esc(), flash(), copyText(), armedClick()).
   ============================================ */

const TABLES_KEY = 'gazette-tables';
const TABLES_MAX = 50;
const TABLE_RESULTS_MAX = 20;

let tables = [];
let tblCur = null;          // id of the table in the editor
let tblResults = [];        // newest first: { name, text, steps, warnings }
let tblShared = null;       // { list, result } from a share link
let tblShareSeq = 0;        // drops a link that finished decoding after a newer one

const TABLE_EXAMPLES = [
    {
        name: 'Tavern Patron', die: 'auto', src: [
            '| d12 | Who walks in |',
            '|---|---|',
            '| 1-2 | A tired farmer, [[Patron Mood]] |',
            '| 3-4 | A caravan guard with {2d6} sp to spend, [[Patron Mood]] |',
            '| 5-6 | {1d4+1} guards off duty, [[Patron Mood]] |',
            '| 7-8 | A traveling priest, [[Patron Mood]] |',
            '| 9-10 | A bard tuning a battered lute, [[Patron Mood]] |',
            '| 11 | A cloaked stranger who pays in very old coins |',
            '| 12 | A soaked courier who rode in through [[Road Weather]] |'
        ].join('\n')
    },
    {
        name: 'Patron Mood', die: 'auto', src: [
            'looking for a fight',
            'buying a round for everyone',
            'quietly weeping into a mug',
            'loudly sure the dragon is coming back',
            'trying to sell a map nobody wants',
            'asleep at the bar'
        ].join('\n')
    },
    {
        name: 'Road Weather', die: 'auto', src: [
            'fog thick enough to lose a horse in',
            'cold rain for {1d4} hours',
            'a hailstorm that passes in minutes',
            'wind that strips the leaves off the trees',
            'a dry, dusty heat',
            'snow, out of season'
        ].join('\n')
    }
];

// ── Data ──────────────────────────────────────────────────
// Several tables can be added in the same millisecond (the examples, a shared link's set), so an id is checked against the list.
function newTableId() {
    let id;
    do id = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); while (tables.some(t => t.id === id));
    return id;
}

function cleanStoredTable(t) {
    const c = tableClean(t);
    if (!c) return null;
    c.id = typeof t.id === 'string' && /^[a-z0-9]{1,16}$/.test(t.id) ? t.id : newTableId();
    return c;
}

function loadTables() {
    tables = [];
    try {
        const saved = JSON.parse(localStorage.getItem(TABLES_KEY));
        if (Array.isArray(saved)) tables = saved.map(cleanStoredTable).filter(Boolean).slice(0, TABLES_MAX);
    } catch (e) {}
    const ids = new Set();
    tables.forEach(t => { while (ids.has(t.id)) t.id = newTableId(); ids.add(t.id); });
}

function saveTables() {
    try { localStorage.setItem(TABLES_KEY, JSON.stringify(tables)); } catch (e) {
        flash('tables-status', "⚠️ This browser wouldn't save the tables (storage full or blocked).");
    }
}

function curTable() {
    return tables.find(t => t.id === tblCur) || null;
}

function tableLabel(t) {
    return t.name || 'Untitled table';
}

// A name nobody's using yet: "Table 2", "Patron Mood (2)".
function freeTableName(base, list = tables) {
    if (!tableFind(list, base)) return base;
    for (let i = 2; ; i++) if (!tableFind(list, `${base} (${i})`)) return `${base} (${i})`;
}

// ── Drawing ───────────────────────────────────────────────
function tableRangeText(e) {
    return e.lo === e.hi ? String(e.lo) : `${e.lo}–${e.hi}`;
}

// Entry text with [[refs]] and {dice} picked out. text is plain; this escapes it.
function tableEntryHtml(text) {
    return esc(text).replace(TABLE_REF, m => `<span class="tbl-ref">${m}</span>`);
}

function tablePreviewHtml(parsed, hit = -1) {
    return `<table class="tbl-prev"><thead><tr><th scope="col">d${parsed.die}</th><th scope="col">Entry</th></tr></thead><tbody>${parsed.entries.map((e, i) =>
        `<tr${i === hit ? ' class="hit"' : ''}><td class="tbl-r">${tableRangeText(e)}</td><td>${tableEntryHtml(e.text)}</td></tr>`).join('')}</tbody></table>`;
}

function tableResultHtml(r) {
    return `<li class="tbl-res">
        <div class="tbl-res-text">${esc(r.text)}</div>
        <div class="tbl-res-how">${esc(tableStepsText(r.steps))}</div>
        ${r.warnings.map(w => `<div class="tbl-warn">⚠️ ${esc(w)}</div>`).join('')}
    </li>`;
}

function renderTableList() {
    document.getElementById('tbl-count').textContent = tables.length;
    document.getElementById('tbl-empty').hidden = tables.length > 0;
    document.getElementById('tbl-list').innerHTML = tables.map((t, i) => {
        let die = '⚠️';
        try { die = 'd' + parseTable(t.src, t.die).die; } catch (e) {}
        const on = t.id === tblCur;
        return `<li><button type="button" class="tbl-pick${on ? ' active' : ''}" data-id="${esc(t.id)}"${on ? ' aria-current="true"' : ''}>
            <span class="tbl-pick-name">${esc(tableLabel(t))}</span><span class="tbl-pick-die">${die}</span></button>
            <span class="tbl-move"><button type="button" class="clk-mini" data-move="-1" data-i="${i}" aria-label="Move ${esc(tableLabel(t))} up"${i ? '' : ' disabled'}>▲</button><button type="button" class="clk-mini" data-move="1" data-i="${i}" aria-label="Move ${esc(tableLabel(t))} down"${i < tables.length - 1 ? '' : ' disabled'}>▼</button></span></li>`;
    }).join('');
}

// Fill the editor from the table on screen (only when the table changes, so typing keeps its place).
function renderTableEditor() {
    const t = curTable();
    document.getElementById('tbl-main').hidden = !t;
    document.getElementById('tbl-none').hidden = !!t || !tables.length;
    if (!t) return;
    document.getElementById('tbl-name').value = t.name;
    document.getElementById('tbl-die').value = String(t.die);
    document.getElementById('tbl-src').value = t.src;
    renderTableCheck();
}

// The parse status, the die picker, and the preview, from the table on screen.
function renderTableCheck(hit = -1) {
    const t = curTable();
    if (!t) return;
    const status = document.getElementById('tbl-parse');
    const prev = document.getElementById('tbl-preview');
    const dieSel = document.getElementById('tbl-die');
    let parsed = null;
    try { parsed = parseTable(t.src, t.die); } catch (e) {
        status.className = 'tbl-parse bad';
        status.textContent = '⚠️ ' + e.message;
    }
    dieSel.disabled = !!(parsed && parsed.ranged);
    dieSel.title = dieSel.disabled ? 'The die ranges set the die' : '';
    document.getElementById('tbl-roll').disabled = !parsed;
    if (!parsed) { prev.innerHTML = ''; document.getElementById('tbl-prev-n').textContent = ''; return; }
    const notes = [];
    const twin = tables.find(o => o !== t && tableKey(o.name) === tableKey(t.name) && tableKey(t.name));
    if (twin) notes.push(`Another table is also called "${t.name}"; [[${t.name}]] rolls the first one in the list.`);
    const all = tblShared ? tblShared.list.concat(tables) : tables;
    const missing = tableRefs(t.src).filter(r => !tableFind(all, r));
    if (missing.length) notes.push(`No table called ${missing.map(r => `"${r}"`).join(', ')} yet.`);
    const n = parsed.entries.length;
    status.className = 'tbl-parse' + (notes.length ? ' warn' : ' ok');
    status.textContent = `✔️ ${n} entr${n === 1 ? 'y' : 'ies'}, rolled on a d${parsed.die}${parsed.ranged ? ' (set by the ranges)' : ''}.` + (notes.length ? ' ⚠️ ' + notes.join(' ') : '');
    document.getElementById('tbl-prev-n').textContent = ` (${n})`;
    prev.innerHTML = tablePreviewHtml(parsed, hit);
}

function renderTableResults() {
    document.getElementById('tbl-results').innerHTML = tblResults.map(tableResultHtml).join('');
    document.getElementById('tbl-res-head').hidden = !tblResults.length;
}

function renderTables() {
    renderTableList();
    renderTableEditor();
    renderTableResults();
}

// ── Actions ───────────────────────────────────────────────
function selectTable(id) {
    tblCur = id;
    renderTableList();
    renderTableEditor();
}

function addTable(t) {
    if (tables.length >= TABLES_MAX) { flash('tables-status', `⚠️ ${TABLES_MAX} tables at most. Delete some first.`); return null; }
    const table = cleanStoredTable({ ...t, id: newTableId() });
    tables.push(table);
    saveTables();
    return table;
}

function newTable() {
    const t = addTable({ name: freeTableName(`Table ${tables.length + 1}`), src: '', die: 'auto' });
    if (!t) return;
    selectTable(t.id);
    document.getElementById('tbl-src').focus();
}

function addExamples() {
    const fresh = TABLE_EXAMPLES.filter(x => !tableFind(tables, x.name));
    if (!fresh.length) { flash('tables-status', 'The examples are already in your tables.'); return; }
    if (tables.length + fresh.length > TABLES_MAX) { flash('tables-status', `⚠️ ${TABLES_MAX} tables at most. Delete some first.`); return; }
    const added = fresh.map(addTable);
    selectTable(added[0].id);
    flash('tables-status', `📚 Added ${fresh.length} example table${fresh.length === 1 ? '' : 's'}. Roll ${tableLabel(added[0])} to see them nest.`);
}

function rollTables(list, t, times) {
    const out = [];
    for (let i = 0; i < times; i++) out.push(rollTable(list, t));
    return out;
}

function rollCurrent() {
    const t = curTable();
    if (!t) return;
    const times = Number(document.getElementById('tbl-times').value) || 1;
    let rolls;
    try { rolls = rollTables(tables.concat(tblShared ? tblShared.list : []), t, times); } catch (e) { flash('tables-status', '⚠️ ' + e.message); return; }
    tblResults = rolls.reverse().concat(tblResults).slice(0, TABLE_RESULTS_MAX);
    renderTableResults();
    renderTableCheck(rolls[0].index);
}

function tableResultsText(list) {
    return list.map(r => r.text).join('\n');
}

async function shareTable(t, list, statusId) {
    try {
        const code = await tablesShareCode(tablesWithRefs(list, t));
        const url = new URL(location.pathname, location.href);
        url.search = paramsQuery({ tab: 'tables', t: code });
        const n = tablesWithRefs(list, t).length - 1;
        copyText(url.href, statusId, `a link to ${tableLabel(t)}${n ? ` and the ${n} table${n === 1 ? '' : 's'} it rolls` : ''}`);
    } catch (e) {
        flash(statusId, '⚠️ ' + e.message);
    }
}

function deleteTable() {
    const t = curTable();
    if (!t) return;
    const i = tables.indexOf(t);
    tables.splice(i, 1);
    saveTables();
    tblCur = tables.length ? tables[Math.min(i, tables.length - 1)].id : null;
    renderTableList();
    renderTableEditor();
    flash('tables-status', `🗑️ Deleted ${tableLabel(t)}.`);
}

// ── Shared links ──────────────────────────────────────────
// Called from applyUrl() (toolbox.js) whenever the Tables tab is on screen.
async function applyTablesUrl(p) {
    const code = p.get('t');
    const seq = ++tblShareSeq;
    if (!code) { tblShared = null; renderSharedTable(); return; }
    try {
        const list = await tablesFromShareCode(code);
        if (seq !== tblShareSeq) return;
        tblShared = { list, result: null, error: '' };
    } catch (e) {
        if (seq !== tblShareSeq) return;
        tblShared = { list: [], result: null, error: e.message };
    }
    renderSharedTable();
    renderTableCheck();
}

function renderSharedTable() {
    const box = document.getElementById('tbl-shared');
    box.hidden = !tblShared;
    if (!tblShared) { box.innerHTML = ''; return; }
    if (tblShared.error) {
        box.innerHTML = `<p class="tbl-warn">⚠️ ${esc(tblShared.error)}</p><div class="tool-toolbar"><button type="button" class="btn" data-shared="close">✕ Close</button></div>`;
        return;
    }
    const [t, ...subs] = tblShared.list;
    let parsed = null, err = '';
    try { parsed = parseTable(t.src, t.die); } catch (e) { err = e.message; }
    const r = tblShared.result;
    box.innerHTML = `
        <h3 class="tbl-shared-h">📨 A shared table: ${esc(tableLabel(t))}</h3>
        <p class="tbl-shared-sub">${parsed ? `${parsed.entries.length} entries on a d${parsed.die}` : `⚠️ ${esc(err)}`}${subs.length ? `, and it rolls ${subs.map(s => esc(tableLabel(s))).join(', ')}` : ''}. Roll it here, or save ${subs.length ? 'them' : 'it'} to your tables.</p>
        <div class="tool-toolbar">
            <button type="button" class="btn btn-gold" data-shared="roll"${parsed ? '' : ' disabled'}>🎲 Roll It</button>
            <button type="button" class="btn" data-shared="save">💾 Save to My Tables</button>
            <button type="button" class="btn" data-shared="close">✕ Close</button>
        </div>
        ${r ? `<ol class="tbl-results">${tableResultHtml(r)}</ol>` : ''}
        ${parsed ? `<details class="tbl-details"><summary>The table (${parsed.entries.length})</summary>${tablePreviewHtml(parsed, r ? r.index : -1)}</details>` : ''}`;
}

function closeShared() {
    tblShared = null;
    renderSharedTable();
    renderTableCheck();
    setUrlParams({ tab: 'tables' }, false);
}

function saveShared(btn) {
    const list = tblShared.list;
    const clash = list.filter(s => { const mine = tableFind(tables, s.name); return mine && (mine.src !== s.src || mine.die !== s.die); });
    const add = list.filter(s => !tableFind(tables, s.name));
    if (tables.length + add.length > TABLES_MAX) { flash('tables-status', `⚠️ ${TABLES_MAX} tables at most. Delete some first.`); return; }
    const save = () => {
        clash.forEach(s => Object.assign(tableFind(tables, s.name), { src: s.src, die: s.die }));
        add.forEach(addTable);
        saveTables();
        const main = tableFind(tables, list[0].name);
        closeShared();
        selectTable(main.id);
        const kept = list.length - clash.length - add.length;
        flash('tables-status', `💾 Saved ${add.length} new table${add.length === 1 ? '' : 's'}${clash.length ? `, replaced ${clash.length}` : ''}${kept ? `, ${kept} you already had` : ''}.`);
    };
    if (!clash.length) { save(); return; }
    if (!btn.dataset.armed) flash('tables-status', `⚠️ This replaces your ${clash.map(s => `"${tableLabel(s)}"`).join(', ')} with the shared version.`);
    armedClick(btn, '💾 Save to My Tables', save);
}

function onSharedClick(e) {
    const btn = e.target.closest('button[data-shared]');
    if (!btn) return;
    const act = btn.dataset.shared;
    if (act === 'close') closeShared();
    else if (act === 'save') saveShared(btn);
    else if (act === 'roll') {
        try { tblShared.result = rollTable(tblShared.list.concat(tables), tblShared.list[0]); } catch (e2) { flash('tables-status', '⚠️ ' + e2.message); return; }
        renderSharedTable();
    }
}

// ── Setup (called from toolbox.js before it reads the URL) ─
function setupTables() {
    loadTables();
    tblCur = tables.length ? tables[0].id : null;
    renderTables();

    document.getElementById('tbl-new').addEventListener('click', newTable);
    document.getElementById('tbl-examples').addEventListener('click', addExamples);
    document.getElementById('tbl-list').addEventListener('click', e => {
        const pick = e.target.closest('.tbl-pick');
        if (pick) { selectTable(pick.dataset.id); return; }
        const mv = e.target.closest('button[data-move]');
        if (!mv) return;
        const i = Number(mv.dataset.i), j = i + Number(mv.dataset.move);
        if (j < 0 || j >= tables.length) return;
        [tables[i], tables[j]] = [tables[j], tables[i]];
        saveTables();
        renderTableList();
        const again = document.querySelector(`#tbl-list button[data-i="${j}"][data-move="${mv.dataset.move}"]`);
        const next = again && !again.disabled ? again : document.querySelector(`#tbl-list button[data-i="${j}"]:not(:disabled)`);
        if (next) next.focus();
    });
    document.getElementById('tbl-name').addEventListener('input', e => {
        const t = curTable();
        t.name = e.target.value.replace(/\s+/g, ' ').slice(0, TABLE_LIMITS.name);
        saveTables();
        renderTableList();
        renderTableCheck();
    });
    // Tidy the name once the reader leaves the field.
    document.getElementById('tbl-name').addEventListener('change', e => {
        const t = curTable();
        t.name = t.name.trim();
        e.target.value = t.name;
        saveTables();
        renderTableList();
    });
    document.getElementById('tbl-die').addEventListener('change', e => {
        const t = curTable();
        t.die = e.target.value === 'auto' ? 'auto' : Number(e.target.value);
        saveTables();
        renderTableList();
        renderTableCheck();
    });
    document.getElementById('tbl-src').addEventListener('input', e => {
        const t = curTable();
        if (e.target.value.length > TABLE_LIMITS.src) {
            e.target.value = e.target.value.slice(0, TABLE_LIMITS.src);
            flash('tables-status', `⚠️ ${TABLE_LIMITS.src.toLocaleString()} characters at most.`);
        }
        t.src = e.target.value;
        saveTables();
        renderTableList();
        renderTableCheck();
    });
    document.getElementById('tbl-roll').addEventListener('click', rollCurrent);
    document.getElementById('tbl-copy').addEventListener('click', () => {
        if (tblResults.length) copyText(tableResultsText(tblResults), 'tables-status', `${tblResults.length} result${tblResults.length === 1 ? '' : 's'}`);
        else flash('tables-status', 'Nothing rolled yet.');
    });
    document.getElementById('tbl-res-clear').addEventListener('click', () => { tblResults = []; renderTableResults(); renderTableCheck(); });
    document.getElementById('tbl-link').addEventListener('click', () => { const t = curTable(); if (t) shareTable(t, tables, 'tables-status'); });
    const del = document.getElementById('tbl-delete');
    del.addEventListener('click', () => armedClick(del, '🗑️ Delete', deleteTable));
    document.getElementById('tbl-shared').addEventListener('click', onSharedClick);

    // Another tab on the same browser changed the tables.
    window.addEventListener('storage', e => {
        if (e.key !== TABLES_KEY) return;
        loadTables();
        if (!curTable()) tblCur = tables.length ? tables[0].id : null;
        renderTableList();
        const typing = document.activeElement && document.activeElement.closest && document.activeElement.closest('#tbl-main');
        if (!typing) renderTableEditor();
    });
}
