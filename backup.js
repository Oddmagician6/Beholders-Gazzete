/* ============================================
   BACK UP EVERYTHING (F44), on the Privacy page
   Every tool keeps its saves in this browser's localStorage. Export writes all of them
   to one JSON file: { gazetteBackup: 1, exported, data: { <key>: <value> } }.
   Import only parses JSON. Each key must match the shape its tool saves, and nothing is
   written until the reader ticks what to restore and presses Restore. Unknown keys are
   ignored. Rolled saves (NPCs, hoards, the kit, the shop) are drawn partly unescaped, so
   no text in them may hold < or >; saves of typed text (names, notes) are escaped by
   their tools and may.
   The notebook goes through notebook.js (nbClean, then nbMerge), so it merges into
   the one here, as the notebook's own import does. Everything else is replaced.
   Needs notebook.js on the page.
   ============================================ */

const BK_LIMITS = { file: 5000000, depth: 12, items: 5000, keys: 500, text: 20000 };

function bkObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function bkN(n, word, words = word + 's') {
    return `${n} ${n === 1 ? word : words}`;
}

// Plain data: JSON types only, no prototype keys, not too deep or big, and (strict) no markup.
function bkSafe(v, strict = true, depth = 0) {
    if (depth > BK_LIMITS.depth) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') return v.length <= BK_LIMITS.text && !(strict && /[<>]/.test(v));
    if (Array.isArray(v)) return v.length <= BK_LIMITS.items && v.every(x => bkSafe(x, strict, depth + 1));
    if (!bkObj(v)) return false;
    const keys = Object.keys(v);
    return keys.length <= BK_LIMITS.keys && keys.every(k => !/[<>]/.test(k) && !['__proto__', 'constructor', 'prototype'].includes(k) && bkSafe(v[k], strict, depth + 1));
}

// A list: keep the items that pass, up to max. Returns { value, dropped }.
function bkItems(v, test, max, strict = true) {
    if (!Array.isArray(v)) throw new Error("isn't a list");
    const value = v.filter(x => test(x) && bkSafe(x, strict)).slice(0, max);
    return { value, dropped: v.length - value.length };
}

// One saved object, all or nothing.
function bkWhole(v, test, strict = true) {
    if (!test(v)) throw new Error("isn't in the shape this tool saves");
    if (!bkSafe(v, strict)) throw new Error('holds text the tool could not show safely');
    return { value: v, dropped: 0 };
}

function bkFlag(v) {
    if (v !== 'on' && v !== 'off') throw new Error('is not on or off');
    return { value: v, dropped: 0 };
}

const bkArrOf = (v, test) => v === undefined || (Array.isArray(v) && v.every(test));

// A saved hoard: the vault draws the magic item's rarity into a class name.
function bkHoard(l) {
    return bkObj(l)
        && bkArrOf(l.magic, m => bkObj(m) && typeof m.name === 'string' && typeof m.rarity === 'string' && /^[a-z][a-z -]{0,19}$/.test(m.rarity))
        && ['gems', 'art', 'goods'].every(k => bkArrOf(l[k], bkObj));
}

// Every key a tool saves. raw: the tool stores a plain string, not JSON.
// count(value) says what's in it; clean(value) returns { value, dropped } or throws why not.
const BACKUP_KEYS = [
    {
        key: 'saved_npcs', tool: '🎭 Town Square', href: 'npc-generator.html', what: 'Saved NPCs',
        clean: v => bkItems(v, n => bkObj(n) && typeof n.name === 'string', 50),
        count: v => bkN(v.length, 'NPC')
    },
    {
        key: 'gazette_loot', tool: '💎 Vault of Wonders', href: 'loot-generator.html', what: 'Saved treasure',
        clean: v => bkItems(v, bkHoard, 50),
        count: v => bkN(v.length, 'hoard')
    },
    {
        key: 'gazette-spell-lists', tool: '📖 Spellbook', href: 'spellbook.html', what: 'Spell lists',
        clean: v => bkWhole(v, b => bkObj(b) && Array.isArray(b.lists) && b.lists.length <= 30
            && b.lists.every(l => bkObj(l) && typeof l.name === 'string' && bkArrOf(l.spells, s => typeof s === 'string')), false),
        count: v => `${bkN(v.lists.length, 'list')}, ${bkN(v.lists.reduce((n, l) => n + (l.spells || []).length, 0), 'spell')}`
    },
    {
        key: 'gazette-bestiary-picks', tool: '🐉 Bestiary', href: 'bestiary.html', what: 'Encounter list',
        clean: v => bkItems(v, p => bkObj(p) && typeof p.id === 'string' && /^[a-z0-9-]{1,60}$/.test(p.id), 60),
        count: v => bkN(v.reduce((n, p) => n + Math.max(1, Math.round(Number(p.count)) || 1), 0), 'monster')
    },
    {
        key: 'gazette-initiative', tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=init', what: 'Initiative tracker',
        clean: v => bkWhole(v, f => bkObj(f) && Array.isArray(f.list) && f.list.every(c => bkObj(c) && typeof c.name === 'string' && typeof c.id === 'number'), false),
        count: v => v.list.length ? `${bkN(v.list.length, 'combatant')}, round ${Math.max(1, Math.round(Number(v.round)) || 1)}` : 'No fight'
    },
    {
        key: 'gazette-init-follow', raw: true, tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=init', what: 'Open stat blocks on their turn',
        clean: bkFlag,
        count: v => v === 'off' ? 'Off' : 'On'
    },
    {
        key: 'gazette-clocks', tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=clocks', what: 'Progress clocks',
        clean: v => bkItems(v, c => bkObj(c) && typeof c.name === 'string', 30, false),
        count: v => bkN(v.length, 'clock')
    },
    {
        key: 'gazette-tables', tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=tables', what: 'Random tables',
        // Typed text, escaped by the tab; tableClean() trims each table to its shape on load.
        clean: v => bkItems(v, t => bkObj(t) && typeof t.src === 'string' && (t.name === undefined || typeof t.name === 'string'), 50, false),
        count: v => bkN(v.length, 'table')
    },
    {
        key: 'gazette-party', tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=party', what: 'The party',
        clean: v => bkItems(v, c => bkObj(c) && ['name', 'player', 'cls'].every(k => c[k] === undefined || typeof c[k] === 'string'), 8, false),
        count: v => bkN(v.length, 'character')
    },
    {
        key: 'gazette-downtime', tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=down', what: 'Downtime party',
        clean: v => bkWhole(v, d => bkObj(d) && Array.isArray(d.chars) && d.chars.length >= 1 && d.chars.length <= 8 && d.chars.every(bkObj), false),
        count: v => bkN(v.chars.length, 'character')
    },
    {
        key: 'gazette-kept-names', tool: '🧰 DM Toolbox', href: 'toolbox.html', what: 'Kept names',
        clean: v => bkItems(v, k => bkObj(k) && typeof k.name === 'string', 100, false),
        count: v => bkN(v.length, 'name')
    },
    {
        key: 'gazette-dice-history', tool: '🧰 DM Toolbox', href: 'toolbox.html?tab=dice', what: 'Dice history',
        clean: v => bkItems(v, h => bkObj(h) && typeof h.f === 'string' && typeof h.total === 'number', 50),
        count: v => bkN(v.length, 'roll')
    },
    {
        key: 'gazette-dice-fab', raw: true, tool: '🎲 Dice button', href: 'toolbox.html?tab=dice', what: 'Floating 🎲 on the tool pages',
        clean: bkFlag,
        count: v => v === 'off' ? 'Hidden' : 'Shown'
    },
    {
        key: 'gazette-session-kit', tool: '🎲 Session Kit', href: 'session-kit.html', what: 'Current kit',
        clean: v => bkWhole(v, bkObj),
        count: () => '1 kit'
    },
    {
        key: 'gazette-handouts', tool: '📜 Handout Maker', href: 'handouts.html', what: 'Handouts',
        // Typed text, escaped by the page; handoutClean() trims each handout to its shape on load.
        clean: v => bkWhole(v, h => bkObj(h) && bkObj(h.forms) && Object.keys(h.forms).length <= 4
            && Object.values(h.forms).every(bkObj) && (h.t === undefined || typeof h.t === 'string'), false),
        count: v => bkN(Object.keys(v.forms).length, 'handout')
    },
    {
        key: 'gazette-shop', tool: "🏪 Merchant's Row", href: 'shop.html', what: 'Current shop',
        clean: v => bkWhole(v, s => bkObj(s) && (s.shop === undefined || s.shop === null || bkObj(s.shop))),
        count: v => v.shop && typeof v.shop.name === 'string' ? v.shop.name : 'No shop'
    },
    {
        key: 'gazette-rumor-deck', tool: '🍺 Tavern', href: 'rumors.html', what: 'Rumor decks (what is left to deal)',
        clean: v => bkWhole(v, s => bkObj(s) && Number.isInteger(s.n) && bkObj(s.decks)
            && Object.values(s.decks).every(d => Array.isArray(d) && d.every(Number.isInteger))),
        count: v => bkN(Object.keys(v.decks).length, 'deck') + ' started'
    },
    {
        key: 'tavern_recent_rumors', tool: '🍺 Tavern', href: 'rumors.html', what: 'Recently overheard',
        // Reader-added rumors are typed text; the truth goes on the page as it is.
        clean: v => bkItems(v, r => bkObj(r) && typeof r.text === 'string' && (r.truth === null || r.truth === undefined || typeof r.truth === 'number'), 10, false),
        count: v => bkN(v.length, 'rumor')
    },
    {
        key: NB_KEY, tool: '🗺️ Worldbuilder', href: 'worldbuilder.html?tab=notebook', what: 'Campaign notebook', merge: true,
        clean: v => {
            const r = nbClean(v);
            return { value: r.nb, dropped: r.dropped };
        },
        count: v => (v.name ? `${v.name}: ` : '') + bkN(v.entries.length, 'entry', 'entries')
    }
];

// ── Reading this browser ──────────────────────────────────
// What's saved here for one key: { value } (cleaned), { bad: true } (unreadable), or null (nothing).
function bkLocal(k) {
    let text;
    try { text = localStorage.getItem(k.key); } catch (e) { return null; }
    if (text === null) return null;
    try { return { value: k.clean(k.raw ? text : JSON.parse(text)).value, text }; } catch (e) { return { bad: true, text }; }
}

function bkExportText() {
    const data = {};
    BACKUP_KEYS.forEach(k => {
        const here = bkLocal(k);
        if (here && !here.bad) data[k.key] = k.raw ? here.text : JSON.parse(here.text);
    });
    return { count: Object.keys(data).length, text: JSON.stringify({ gazetteBackup: 1, exported: new Date().toISOString(), data }, null, 2) };
}

// ── Reading a file ────────────────────────────────────────
// Returns the plan: one row per known key in the file. Throws a readable Error.
function bkParseFile(text) {
    if (typeof text !== 'string' || text.length > BK_LIMITS.file) throw new Error('That file is too big to be a Gazette backup.');
    let raw;
    try { raw = JSON.parse(text); } catch (e) { throw new Error("That file isn't JSON, so it can't be a Gazette backup."); }
    if (raw && Array.isArray(raw.entries)) throw new Error('That is a notebook file. Import it on the Worldbuilder\'s Notebook tab.');
    if (!bkObj(raw) || raw.gazetteBackup !== 1 || !bkObj(raw.data)) throw new Error("That file isn't a Gazette backup.");
    const rows = BACKUP_KEYS.filter(k => Object.hasOwn(raw.data, k.key)).map(k => {
        const here = bkLocal(k);
        try {
            const { value, dropped } = k.clean(raw.data[k.key]);
            const text = k.raw ? value : JSON.stringify(value);
            return { k, value, dropped, here, same: !!here && !here.bad && here.text === text };
        } catch (e) {
            return { k, error: e.message, here };
        }
    });
    const ignored = Object.keys(raw.data).filter(key => !BACKUP_KEYS.some(k => k.key === key)).length;
    if (!rows.length) throw new Error('That backup is empty.');
    return { rows, ignored, exported: typeof raw.exported === 'string' ? new Date(raw.exported) : null };
}

// Write the chosen rows. Returns { done, failed }.
function bkRestore(rows) {
    let done = 0, failed = 0;
    rows.forEach(r => {
        try {
            if (r.k.merge) {
                const nb = nbLoad();
                nbMerge(nb, r.value);
                if (!nbStore(nb)) throw new Error('storage');
            } else {
                localStorage.setItem(r.k.key, r.k.raw ? r.value : JSON.stringify(r.value));
            }
            done++;
        } catch (e) {
            failed++;
        }
    });
    return { done, failed };
}

// ── The page ──────────────────────────────────────────────
function bkEsc(text) {
    return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function bkLabel(k) {
    return `<a href="${bkEsc(k.href)}">${bkEsc(k.tool)}</a> <span class="bk-what">${bkEsc(k.what)}</span>`;
}

function bkStatus(text) {
    document.getElementById('bk-status').textContent = text;
}

function renderBackupSummary() {
    const rows = BACKUP_KEYS.map(k => ({ k, here: bkLocal(k) })).filter(r => r.here);
    const box = document.getElementById('bk-summary');
    if (!rows.length) {
        box.innerHTML = '<p class="bk-empty">Nothing is saved in this browser yet.</p>';
    } else {
        box.innerHTML = `<p class="bk-head">Saved in this browser now:</p><div class="bk-rows">${rows.map(r => `
            <div class="bk-row"><span>${bkLabel(r.k)}</span><span class="bk-count">${r.here.bad ? '⚠️ unreadable, left out' : bkEsc(r.k.count(r.here.value))}</span></div>`).join('')}</div>`;
    }
    document.getElementById('bk-export').disabled = !rows.some(r => !r.here.bad);
}

let bkPlan = null;

function renderBackupPlan() {
    const box = document.getElementById('bk-plan');
    if (!bkPlan) { box.hidden = true; box.innerHTML = ''; return; }
    const when = bkPlan.exported && !isNaN(bkPlan.exported) ? ` from ${bkPlan.exported.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}` : '';
    const rows = bkPlan.rows.map((r, i) => {
        if (r.error) return `<div class="bk-row bk-skip"><span>${bkLabel(r.k)}</span><span class="bk-count">⚠️ Skipped: it ${bkEsc(r.error)}.</span></div>`;
        const now = r.here && !r.here.bad ? r.k.count(r.here.value) : '';
        const what = r.same ? 'Same as here'
            : r.k.merge && now ? `${r.k.count(r.value)}, merged into yours (${now})`
            : now ? `${r.k.count(r.value)}, replaces ${now}`
            : `${r.k.count(r.value)}, new here`;
        const dropped = r.dropped ? ` (${r.dropped} unreadable left out)` : '';
        return `<label class="bk-row"><span><input type="checkbox" data-i="${i}"${r.same ? '' : ' checked'}> ${bkLabel(r.k)}</span><span class="bk-count">${bkEsc(what + dropped)}</span></label>`;
    }).join('');
    const ignored = bkPlan.ignored ? `<p class="bk-small">${bkN(bkPlan.ignored, 'entry', 'entries')} in the file this site doesn't use ${bkPlan.ignored === 1 ? 'was' : 'were'} ignored.</p>` : '';
    box.innerHTML = `<p class="bk-head">In this backup${bkEsc(when)}. Tick what to restore:</p><div class="bk-rows">${rows}</div>${ignored}
        <p class="bk-small">Restoring replaces what this browser has saved for each ticked tool. The notebook is the exception: the file's entries are added to yours.</p>
        <div class="bk-actions"><button type="button" class="btn btn-gold" id="bk-restore">✅ Restore</button><button type="button" class="btn" id="bk-cancel">✖ Cancel</button></div>`;
    box.hidden = false;
    updateRestoreButton();
}

function bkTicked() {
    return [...document.querySelectorAll('#bk-plan input[data-i]:checked')].map(b => bkPlan.rows[Number(b.dataset.i)]);
}

function updateRestoreButton() {
    const n = bkTicked().length;
    const btn = document.getElementById('bk-restore');
    btn.disabled = !n;
    btn.textContent = n ? `✅ Restore ${bkN(n, 'item')}` : '✅ Restore';
}

function bkImport(file) {
    if (!file) return;
    if (file.size > BK_LIMITS.file) { bkStatus('⚠️ That file is too big to be a Gazette backup.'); return; }
    file.text().then(text => {
        bkPlan = bkParseFile(text);
        bkStatus('');
        renderBackupPlan();
        document.getElementById('bk-plan').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }).catch(err => {
        bkPlan = null;
        renderBackupPlan();
        bkStatus('⚠️ ' + (err && err.message ? err.message : "That file couldn't be read."));
    });
}

function setupBackup() {
    document.getElementById('bk-export').addEventListener('click', () => {
        const { count, text } = bkExportText();
        if (!count) return;
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `gazette-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        bkStatus(`💾 Exported ${bkN(count, 'item')}. Keep the file somewhere safe, or import it in another browser.`);
    });
    const file = document.getElementById('bk-file');
    document.getElementById('bk-import').addEventListener('click', () => file.click());
    file.addEventListener('change', () => { bkImport(file.files[0]); file.value = ''; });
    const plan = document.getElementById('bk-plan');
    plan.addEventListener('change', e => { if (e.target.matches('input[data-i]')) updateRestoreButton(); });
    plan.addEventListener('click', e => {
        if (e.target.id === 'bk-cancel') { bkPlan = null; renderBackupPlan(); bkStatus('Nothing was changed.'); }
        if (e.target.id !== 'bk-restore') return;
        const { done, failed } = bkRestore(bkTicked());
        bkPlan = null;
        renderBackupPlan();
        renderBackupSummary();
        bkStatus(failed ? `⚠️ Restored ${done} of ${done + failed}. This browser wouldn't store the rest (storage may be off or full).`
            : `✅ Restored ${bkN(done, 'item')}. Open the tools to see them.`);
    });
    // Another tab saved something.
    window.addEventListener('storage', () => renderBackupSummary());
    renderBackupSummary();
}

setupBackup();
