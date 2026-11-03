/* ============================================
   PATHFINDER BOOST CALCULATOR (ROADMAP L3 P5.3): the point-buy page's Pathfinder
   copy. Attribute modifiers from the four boost sets (ancestry, background, class
   key attribute, four free boosts at 1st level and every fifth level), with flaws,
   the alternate ancestry boosts, and partial boosts past +4. The address bar holds
   the picks, so a reload or a shared link brings them back; nothing goes in
   localStorage except a character sent to the Character Builder (PC_KEY, through pcSave).
   Rules come from pf2e-character.js; needs pf2e-character-data.js before it.
   ============================================ */

const BC_ORDER = ['con', 'dex', 'wis', 'str', 'int', 'cha'];   // after the key attribute, like the 5e page
const BC_LEVELS = ['l1', ...PC_BOOST_LEVELS.map(String)];
const BC_SHOW = [1, 5, 10, 15, 20];

// The page's character: a blank builder character with only the boost fields filled.
let bc = pcBlank();

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('pb-status');
    el.textContent = msg;
    el.classList.toggle('pb-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

const abilShort = a => a.toUpperCase();
const setText = sets => sets.map(s => (s[0] === 'free' ? 'free' : s.map(abilShort).join(' or '))).join(', ');

// Key attribute options: the class's, plus a rogue racket's (picking one sets the racket).
function bcKeyOptions() {
    const cls = PF2E_CLASSES[bc.cls];
    if (!cls) return [];
    const extra = Object.values(PF2E_CHOICES).filter(ch => ch.c === bc.cls && ch.key).map(ch => ch.key);
    return [...new Set([...cls.key, ...extra])];
}

function bcSetKey(a) {
    const cls = PF2E_CLASSES[bc.cls];
    bc.boosts.key = a;
    bc.ch = '';
    if (cls && !cls.key.includes(a)) bc.ch = Object.keys(PF2E_CHOICES).find(id => PF2E_CHOICES[id].c === bc.cls && PF2E_CHOICES[id].key === a) || '';
}

function bcKey() {
    const opts = bcKeyOptions();
    return opts.length === 1 ? opts[0] : (opts.includes(bc.boosts.key) ? bc.boosts.key : '');
}

const bcFree = n => Array.from({ length: 4 }, (_, i) => [PC_ABILS, (bc.boosts[n] || [])[i] || '']);

// Every boost set the level allows, as { field, label, note, sets }.
function bcRows() {
    const rows = [];
    const anc = PF2E_ANCESTRIES[bc.race], bg = PF2E_BACKGROUNDS[bc.bg], cls = PF2E_CLASSES[bc.cls];
    if (anc) rows.push({ field: 'anc', label: `Ancestry: ${anc.n}`, note: bc.boosts.ancFree ? 'two free boosts, no flaw' : anc.fl ? `flaw: ${anc.fl.map(abilShort).join(', ')}` : '', sets: pcAncSets(bc) });
    if (bg) rows.push({ field: 'bg', label: `Background: ${bg.n}`, note: '', sets: pcBgSets(bc) });
    if (cls) {
        const opts = bcKeyOptions(), racket = PF2E_CHOICES[bc.ch];
        rows.push({ field: 'key', label: `Class: ${cls.n}`, note: racket ? `key attribute (${racket.n} racket)` : 'key attribute', sets: [[opts, bcKey()]] });
    }
    BC_LEVELS.forEach(f => {
        const l = f === 'l1' ? 1 : Number(f);
        if (l <= bc.level) rows.push({ field: f, label: `Level ${l}`, note: 'four free boosts', sets: bcFree(f) });
    });
    return rows;
}

const bcLeft = () => bcRows().reduce((n, r) => n + r.sets.filter(([, a]) => !a).length, 0);

// Where each attribute's modifier came from, as short notes.
function bcSources() {
    const out = Object.fromEntries(PC_ABILS.map(a => [a, []]));
    const anc = PF2E_ANCESTRIES[bc.race];
    bcRows().forEach(r => {
        const tag = r.field === 'anc' ? 'ancestry' : r.field === 'bg' ? 'background' : r.field === 'key' ? 'key' : r.label.replace('Level ', 'L');
        r.sets.forEach(([, a]) => { if (a) out[a].push(tag); });
    });
    if (anc && !bc.boosts.ancFree) (anc.fl || []).forEach(a => out[a].push('flaw'));
    return out;
}

// ── Suggest: fill every empty boost, key attribute first, then Con, Dex, Wis. ─
function bcPrio() {
    const k = bcKey() || (bcKeyOptions()[0] || '');
    return [...new Set([...(k ? [k] : []), ...BC_ORDER])];
}

function bcSuggest() {
    // A class with two key attributes takes the one the ancestry and background already favor.
    if (!bcKey() && bcKeyOptions().length) {
        const { mods } = pcAttrs(bc, 1);
        bcSetKey(bcKeyOptions().reduce((best, a) => (mods[a] > mods[best] ? a : best)));
    }
    const prio = bcPrio();
    const fill = (field, sets) => {
        const arr = (bc.boosts[field] || []).slice();
        sets.forEach(([opts, picked], i) => {
            if (picked || opts.length === 1) return;
            const taken = sets.map((s, j) => (j === i ? '' : (arr[j] || s[1])));
            arr[i] = prio.find(a => opts.includes(a) && !taken.includes(a)) || '';
        });
        bc.boosts[field] = Array.from(arr, a => a || '');
    };
    fill('anc', pcAncSets(bc));
    fill('bg', pcBgSets(bc));
    BC_LEVELS.forEach(f => {
        const l = f === 'l1' ? 1 : Number(f);
        if (l > bc.level) return;
        // A level-up boost past +4 is only half a point, so the key attribute keeps rising
        // and the rest go to whatever is still under +4.
        const { mods } = pcAttrs(bc, l - 1);
        const k = prio[0];
        const order = [...prio.filter(a => a === k || mods[a] < 4), ...prio.filter(a => a !== k && mods[a] >= 4)];
        const arr = (bc.boosts[f] || []).slice(0, 4);
        for (let i = 0; i < 4; i++) {
            if (arr[i]) continue;
            arr[i] = order.find(a => !arr.includes(a)) || '';
        }
        bc.boosts[f] = arr;
    });
}

// ── Address bar ──────────────────────────────────────────
const bcList = arr => (arr || []).map(a => a || '').join('.').replace(/\.+$/, '');

function bcParams() {
    const p = {};
    if (bc.race) p.anc = bc.race;
    if (bc.boosts.ancFree) p.alt = '1';
    if (bc.bg) p.bg = bc.bg;
    if (bc.cls) p.cls = bc.cls;
    if (bc.cls && bc.boosts.key && bcKeyOptions().length > 1) p.key = bc.boosts.key;
    if (bc.level !== 1) p.lv = bc.level;
    if (bcList(bc.boosts.anc)) p.ba = bcList(bc.boosts.anc);
    if (bcList(bc.boosts.bg)) p.bb = bcList(bc.boosts.bg);
    BC_LEVELS.forEach(f => { if (bcList(bc.boosts[f])) p['b' + f.replace('l', '')] = bcList(bc.boosts[f]); });
    return p;
}

function bcFromUrl() {
    const q = urlParams();
    const list = (v, n) => pcAbilList((q.get(v) || '').split('.'), n);
    bc = pcBlank();
    bc.race = Object.hasOwn(PF2E_ANCESTRIES, q.get('anc')) ? q.get('anc') : '';
    bc.bg = Object.hasOwn(PF2E_BACKGROUNDS, q.get('bg')) ? q.get('bg') : '';
    bc.cls = Object.hasOwn(PF2E_CLASSES, q.get('cls')) ? q.get('cls') : '';
    bc.level = Math.min(20, Math.max(1, Math.round(Number(q.get('lv'))) || 1));
    bc.boosts.ancFree = q.get('alt') === '1';
    if (bc.cls && bcKeyOptions().includes(q.get('key'))) bcSetKey(q.get('key'));
    bc.boosts.anc = list('ba', 4);
    bc.boosts.bg = list('bb', 3);
    BC_LEVELS.forEach(f => { bc.boosts[f] = list('b' + f.replace('l', ''), 4); });
    bcTidy();
}

// Drop picks the current sets don't allow: a fixed boost, a repeat within one source, or an attribute not on offer.
function bcTidy() {
    const tidy = (field, sets) => {
        const arr = (bc.boosts[field] || []).slice(0, sets.length);
        bc.boosts[field] = sets.map(([opts], i) => {
            const a = arr[i];
            if (!a || opts.length === 1 || !opts.includes(a)) return '';
            const fixed = sets.filter(s => s[0].length === 1).map(s => s[0][0]);
            return fixed.includes(a) || arr.slice(0, i).includes(a) ? '' : a;
        });
    };
    tidy('anc', pcAncSets({ ...bc, boosts: { ...bc.boosts, anc: [] } }));
    tidy('bg', pcBgSets({ ...bc, boosts: { ...bc.boosts, bg: [] } }));
    BC_LEVELS.forEach(f => {
        const arr = (bc.boosts[f] || []).slice(0, 4);
        bc.boosts[f] = arr.map((a, i) => (a && !arr.slice(0, i).includes(a) ? a : ''));
    });
}

function bcChanged() {
    setUrlParams(bcParams(), false);
    render();
}

// ── Drawing ──────────────────────────────────────────────
function renderBar() {
    document.getElementById('pb-anc').value = bc.race;
    document.getElementById('pb-bg').value = bc.bg;
    document.getElementById('pb-class').value = bc.cls;
    document.getElementById('pb-level').value = String(bc.level);
    const alt = document.getElementById('pb-alt');
    alt.checked = bc.boosts.ancFree;
    alt.disabled = !bc.race;
}

function renderBoosts() {
    const rows = bcRows();
    let h = rows.map(r => `<div class="pb-boost-row"><div class="pb-boost-label">${esc(r.label)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</div>${r.sets.map(([opts, picked], i) => {
        if (opts.length === 1) return `<div class="pb-chips"><span class="pb-chip pb-locked" aria-pressed="true">${abilShort(opts[0])}</span></div>`;
        const taken = r.sets.filter((s, j) => j !== i).map(s => s[1]);
        return `<div class="pb-chips" role="group" aria-label="${esc(r.label)} boost ${i + 1}">${opts.map(a => `<button type="button" class="pb-chip" data-boost="${r.field}" data-i="${i}" data-val="${a}" aria-pressed="${picked === a}"${taken.includes(a) ? ' disabled' : ''}>${abilShort(a)}</button>`).join('')}</div>`;
    }).join('')}</div>`).join('');
    const missing = [!bc.race && 'an ancestry', !bc.bg && 'a background', !bc.cls && 'a class'].filter(Boolean);
    if (missing.length) h += `<p class="pb-faint">Pick ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')} for ${missing.length === 1 ? 'its' : 'their'} boosts.</p>`;
    if (bc.level < 20) h += `<p class="pb-faint">More boosts come at levels ${PC_BOOST_LEVELS.filter(l => l > bc.level).join(', ')}.</p>`;
    document.getElementById('pb-boosts').innerHTML = h;
}

function renderGrid() {
    const { mods, partial } = pcAttrs(bc);
    const src = bcSources();
    const key = bcKey();
    document.getElementById('pb-grid').innerHTML = PC_ABILS.map(a => `<div class="pb-abil${a === key ? ' pb-key' : ''}">
        <b>${abilShort(a)}${a === key ? ' <span title="Key attribute">★</span>' : ''}</b>
        <span class="pb-name">${PC_ABIL_NAMES[a]}</span>
        <span class="pb-total">${pcSign(mods[a])}</span>
        <span class="pb-mod">${partial[a] ? '<span title="A partial boost: one more boost adds 1">+ ½</span>' : '&nbsp;'}</span>
        <span class="pb-from">${src[a].length ? esc(src[a].join(', ')) : 'no boosts'}</span>
    </div>`).join('');
}

function renderTrack() {
    const cols = BC_SHOW.map(l => ({ l, at: pcAttrs(bc, l) }));
    document.getElementById('pb-track').innerHTML = `<thead><tr><th scope="col">Attribute</th>${cols.map(({ l }) => `<th scope="col"${l === bc.level ? ' class="pb-now"' : ''}>Level ${l}</th>`).join('')}</tr></thead>
        <tbody>${PC_ABILS.map(a => `<tr><th scope="row">${PC_ABIL_NAMES[a]}</th>${cols.map(({ l, at }) => `<td${l === bc.level ? ' class="pb-now"' : ''}>${l > bc.level ? '<span class="pb-faint">' : ''}${pcSign(at.mods[a])}${at.partial[a] ? '½' : ''}${l > bc.level ? '</span>' : ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function renderSummary() {
    const el = document.getElementById('pb-summary');
    const { mods, partial } = pcAttrs(bc);
    const left = bcLeft();
    const total = PC_ABILS.reduce((t, a) => t + mods[a], 0);
    let h = `<p>Modifiers add up to <b>${pcSign(total)}</b>${left ? ` · <span class="pb-warn-in">${left} boost${left === 1 ? '' : 's'} still to place</span>` : bcRows().length ? ' · <span class="pb-full">every boost placed ✓</span>' : ''}.</p>`;
    const part = PC_ABILS.filter(a => partial[a]);
    if (part.length) h += `<p class="pb-warn">${part.map(a => PC_ABIL_NAMES[a]).join(', ')} ${part.length === 1 ? 'has' : 'have'} a partial boost: the next boost to ${part.length === 1 ? 'it' : 'each'} adds 1.</p>`;
    const l1 = pcAttrs(bc, 1).mods;
    const low = PC_ABILS.filter(a => l1[a] < 0);
    if (low.length && bc.level === 1) h += `<p class="pb-note">${low.map(a => PC_ABIL_NAMES[a]).join(', ')} starts below +0 from the flaw. That's allowed; a free boost there brings it back to +0.</p>`;
    el.innerHTML = h;
}

function render() {
    renderBar();
    renderBoosts();
    renderGrid();
    renderTrack();
    renderSummary();
    document.getElementById('pb-send').disabled = !bc.race && !bc.bg && !bc.cls;
}

// ── Actions ──────────────────────────────────────────────
function bcText() {
    const { mods, partial } = pcAttrs(bc);
    const parts = [PF2E_ANCESTRIES[bc.race], PF2E_BACKGROUNDS[bc.bg], PF2E_CLASSES[bc.cls]].filter(Boolean).map(x => x.n);
    const head = `${parts.length ? parts.join(' ') + ' · ' : ''}level ${bc.level}${bc.boosts.ancFree ? ' · alternate ancestry boosts' : ''}`;
    const line = PC_ABILS.map(a => `${abilShort(a)} ${pcSign(mods[a])}${partial[a] ? ' (+½)' : ''}`).join(', ');
    return `${head}\n${line}`;
}

let itemsLoading = null;
function loadItems() {
    if (typeof PF2E_ITEMS !== 'undefined') return Promise.resolve();
    if (!itemsLoading) itemsLoading = new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'pf2e-items-data.js';
        s.onload = ok;
        s.onerror = () => { itemsLoading = null; fail(); };
        document.head.appendChild(s);
    });
    return itemsLoading;
}

// A new builder character with these picks. The builder opens the newest character, so it lands on this one.
async function sendToBuilder() {
    const btn = document.getElementById('pb-send');
    btn.disabled = true;
    try {
        // Saving re-cleans every saved character, which needs the gear list to check weapons and armor.
        await loadItems();
    } catch (e) {
        flash('Could not load the gear list; check your connection and try again.', true);
        btn.disabled = false;
        return;
    }
    if (pcLoadAll().length >= PC_MAX) {
        flash(`You have ${PC_MAX} Pathfinder characters saved; delete one in the Character Builder first.`, true);
        btn.disabled = false;
        return;
    }
    const c = pcClean(JSON.parse(JSON.stringify({ ...bc, id: pcNewId() })));
    if (!c || !pcSave(c)) {
        flash('Could not save: this browser\'s storage is full or blocked.', true);
        btn.disabled = false;
        return;
    }
    location.href = 'pathfinder-character-builder';
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.boost) {
        if (d.boost === 'key') bcSetKey(d.val);
        else {
            const arr = (bc.boosts[d.boost] || []).slice();
            arr[Number(d.i)] = arr[Number(d.i)] === d.val ? '' : d.val;
            for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';
            bc.boosts[d.boost] = arr;
        }
        return bcChanged();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const byName = t => Object.entries(t).sort((x, y) => x[1].n.localeCompare(y[1].n));
    document.getElementById('pb-anc').innerHTML = '<option value="">No ancestry yet</option>' + byName(PF2E_ANCESTRIES)
        .map(([id, a]) => `<option value="${id}">${esc(a.n)} (${setText(a.bo)}${a.fl ? `; flaw ${a.fl.map(abilShort).join(', ')}` : ''})</option>`).join('');
    document.getElementById('pb-bg').innerHTML = '<option value="">No background yet</option>' + byName(PF2E_BACKGROUNDS)
        .map(([id, b]) => `<option value="${id}">${esc(b.n)} (${setText(b.bo)})</option>`).join('');
    document.getElementById('pb-class').innerHTML = '<option value="">No class yet</option>' + byName(PF2E_CLASSES)
        .map(([id, k]) => {
            const extra = Object.values(PF2E_CHOICES).filter(ch => ch.c === id && ch.key).map(ch => ch.key);
            return `<option value="${id}">${esc(k.n)} (${[...new Set([...k.key, ...extra])].map(abilShort).join(' or ')})</option>`;
        }).join('');
    document.getElementById('pb-level').innerHTML = Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');

    bcFromUrl();
    setUrlParams(bcParams(), false);
    render();

    document.getElementById('pb-tool').addEventListener('click', onClick);
    document.getElementById('pb-anc').addEventListener('change', e => { bc.race = e.target.value; bc.boosts.anc = []; if (!bc.race) bc.boosts.ancFree = false; bcChanged(); });
    document.getElementById('pb-bg').addEventListener('change', e => { bc.bg = e.target.value; bc.boosts.bg = []; bcChanged(); });
    document.getElementById('pb-class').addEventListener('change', e => { bc.cls = e.target.value; bc.boosts.key = ''; bc.ch = ''; bcChanged(); });
    document.getElementById('pb-level').addEventListener('change', e => { bc.level = Number(e.target.value) || 1; bcChanged(); });
    document.getElementById('pb-alt').addEventListener('change', e => { bc.boosts.ancFree = e.target.checked; bc.boosts.anc = []; bcChanged(); });
    document.getElementById('pb-suggest').addEventListener('click', () => {
        if (!bcRows().length) { flash('Pick an ancestry, background, or class first.', true); return; }
        const left = bcLeft();
        bcSuggest();
        bcChanged();
        const k = bcKey(), next = bcPrio().filter(a => a !== k).slice(0, 3).map(a => PC_ABIL_NAMES[a]);
        flash(left ? `⚖️ Placed ${left - bcLeft()} boost${left - bcLeft() === 1 ? '' : 's'}: ${k ? `${PC_ABIL_NAMES[k]} first, then ` : ''}${next[0]}, ${next[1]}, and ${next[2]}.` : 'Every boost is already placed. Clear them to start over.');
    });
    document.getElementById('pb-clear').addEventListener('click', () => {
        bc.boosts = { ...pcBlank().boosts, ancFree: bc.boosts.ancFree };
        bc.ch = '';
        bcChanged();
        flash('↺ Boosts cleared.');
    });
    document.getElementById('pb-copy').addEventListener('click', () => {
        const text = bcText();
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => flash('📋 Modifiers copied.'), () => flash('Could not copy; select the modifiers and copy them by hand.', true));
    });
    document.getElementById('pb-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied.', ok === false)));
    document.getElementById('pb-send').addEventListener('click', sendToBuilder);
    window.addEventListener('popstate', () => { bcFromUrl(); render(); });
});
