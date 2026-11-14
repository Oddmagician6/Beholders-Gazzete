/* ============================================
   RULES VERSION (ROADMAP L1T): 2014 (SRD 5.1) or 2024 (SRD 5.2), plus the SRD 5.2 additions (L4 D4)
   One setting for the whole site, kept in this browser (localStorage gazette_rules_version,
   '2014' by default). 5e only: on another system's page (ruleSystemId) it does nothing.
   - 2014: the site's SRD 5.1 data. The old opt-in "📗 SRD 5.2 additions" (gazette_srd52) still
     works here: it adds srd52-data.js's 20 spells, 17 monsters, and 17 magic items.
   - 2024: srd52-full-data.js (all of SRD 5.2.1, ~1 MB) is loaded and swapped into SPELLS_DATA,
     MAGIC_ITEM_TEXT, MONSTERS, and MONSTER_BY_ID in place, so every page script keeps working.
     A 5.1 name that 5.2 renamed or grouped still finds its 5.2 entry (MONSTER_BY_ID.goblin is the
     Goblin Warrior, MAGIC_ITEM_TEXT['Belt of Hill Giant Strength'] the Belt of Giant Strength), and
     the few 5.1 entries 5.2 dropped (drow, Restorative Ointment) stay. Homebrew rows are kept.
     Loaded with the page (document.write, so page scripts see 2024 data from their first line)
     when the setting is already 2024; loaded on the fly when the reader switches.
   - A link can carry ?rules=2024 or ?rules=2014: it rules that page view without changing the
     saved setting (setUrlParams in rng.js adds it to every address the page writes while in 2024).
   - rulesVersion(): the version this page shows. rulesSet(v): save and switch. rulesUse(v): switch
     this page only (a saved character's own version). rulesRename(kind, name): a 5.1 name's 5.2 one.
   - srd52On(): 5.2 rows are in the lists (2024, or 2014 with the additions). srd52Set(on): the
     additions. srd52OnChange(fn): runs after any change (also from another tab), fn(srd52On()).
   - srd52Monsters(): the additions' monster rows in 2014 (in 2024 they're already in MONSTERS).
   - srd52Toggle(): the switch's markup ([data-rules] picker + [data-srd52] additions box).
   - srd52Tag(), srd52IsSpell(), srd52IsItem(): the "📗 SRD 5.2" marks, only for the additions in 2014.
   Seeded rolls draw from whatever MONSTERS holds, so a 2024 page's links carry rules=2024.
   - <script src="srd52.js" data-text-only>: a page with rules text but no spell, monster, or item
     lists (the Rules page). It needs no srd52-data.js, never loads the 2024 data file, and shows
     the picker without the additions box; rulesVersion() and the credit line work as usual.
   ============================================ */

const SRD52_KEY = 'gazette_srd52';
const RULES_KEY = 'gazette_rules_version';
const RULES_TEXT_ONLY = !!(document.currentScript && document.currentScript.hasAttribute('data-text-only'));
const SRD52_OK = (RULES_TEXT_ONLY || typeof SRD52_SPELLS !== 'undefined') && (typeof ruleSystemId !== 'function' || ruleSystemId() === '5e');
const RULES_FULL_SRC = (() => {
    const me = document.currentScript && document.currentScript.src;
    return me ? me.replace(/srd52\.js(\?.*)?$/, 'srd52-full-data.js') : 'srd52-full-data.js';
})();
const srd52Listeners = [];
let srd52Added = false;        // the additions' rows are in (2014 only)
let rulesShown = '2014';       // the data the page holds now
let rulesPage = null;          // a page-only version (a ?rules= link, or rulesUse)
let rulesLoading = null;
const RULES51 = {};            // the 5.1 data as the page loaded it

(function () {
    const v = new URLSearchParams(location.search).get('rules');
    if (v === '2014' || v === '2024') rulesPage = v;
})();

function rulesStored() {
    try { return localStorage.getItem(RULES_KEY) === '2024' ? '2024' : '2014'; } catch (e) { return '2014'; }
}

function rulesVersion() {
    return SRD52_OK ? (rulesPage || rulesStored()) : '2014';
}

function srd52AdditionsOn() {
    try { return localStorage.getItem(SRD52_KEY) === '1'; } catch (e) { return false; }
}

function srd52On() {
    return SRD52_OK && (rulesShown === '2024' || srd52Added);
}

function srd52Monsters() {
    return srd52Added && rulesShown === '2014' ? SRD52_MONSTERS : [];
}

function rulesRename(kind, name) {
    if (rulesShown !== '2024' || typeof SRD52_FULL === 'undefined') return null;
    const map = SRD52_FULL.renames[kind] || {};
    return map[name] || null;
}

// ---------- the data swap ----------
function rulesSnapshot() {
    if (RULES51.done) return;
    RULES51.done = true;
    if (typeof SPELLS_DATA !== 'undefined') RULES51.spells = SPELLS_DATA.filter(s => !s.hb && !s.v52);
    if (typeof MAGIC_ITEM_TEXT !== 'undefined') RULES51.items = Object.fromEntries(Object.entries(MAGIC_ITEM_TEXT).filter(([n, v]) => SRD52_ITEMS[n] !== v));
    if (typeof MONSTERS !== 'undefined') RULES51.monsters = MONSTERS.filter(m => !m.v52);
    if (typeof MONSTER_BY_ID !== 'undefined') RULES51.byId = Object.fromEntries(Object.entries(MONSTER_BY_ID).filter(([, m]) => !m.v52));
}

function rulesSwap(v) {
    if (RULES_TEXT_ONLY) {
        rulesShown = v === '2024' ? '2024' : '2014';
        return true;
    }
    rulesSnapshot();
    const full = v === '2024' && typeof SRD52_FULL !== 'undefined' ? SRD52_FULL : null;
    if (v === '2024' && !full) return false;
    const adds = !full && srd52AdditionsOn();
    if (typeof SPELLS_DATA !== 'undefined' && RULES51.spells) {
        const hb = SPELLS_DATA.filter(s => s.hb);
        let rows = full ? full.spells : RULES51.spells;
        if (adds) {
            const have = new Set(rows.map(s => s.name.toLowerCase()));
            rows = rows.concat(SRD52_SPELLS.filter(s => !have.has(s.name.toLowerCase())));
        }
        SPELLS_DATA.length = 0;
        SPELLS_DATA.push(...rows, ...hb);
    }
    if (typeof MAGIC_ITEM_TEXT !== 'undefined' && RULES51.items) {
        const it = MAGIC_ITEM_TEXT;
        const all = typeof SRD52_FULL !== 'undefined' ? SRD52_FULL.items : {};
        Object.keys(all).forEach(n => { if (it[n] === all[n]) delete it[n]; });
        Object.keys(SRD52_ITEMS).forEach(n => { if (it[n] === SRD52_ITEMS[n]) delete it[n]; });
        Object.entries(RULES51.items).forEach(([n, t]) => {
            it[n] = full ? (full.items[full.renames.items[n] || n] || t) : t;
        });
        if (full) Object.entries(full.items).forEach(([n, t]) => { it[n] = t; });
        if (adds) Object.entries(SRD52_ITEMS).forEach(([n, t]) => { if (!it[n]) it[n] = t; });
    }
    if (typeof MONSTERS !== 'undefined' && RULES51.monsters) {
        MONSTERS.length = 0;
        MONSTERS.push(...(full ? full.monsters : RULES51.monsters));
    }
    if (typeof MONSTER_BY_ID !== 'undefined' && RULES51.byId) {
        const by = MONSTER_BY_ID;
        Object.keys(by).forEach(id => { if (by[id] && by[id].v52) delete by[id]; });
        if (full) {
            const v52 = Object.fromEntries(full.monsters.map(m => [m.id, m]));
            Object.entries(RULES51.byId).forEach(([id, m]) => { by[id] = v52[full.renames.monsters[id] || id] || m; });
            Object.assign(by, v52);
        } else {
            Object.assign(by, RULES51.byId);
            if (adds) SRD52_MONSTERS.forEach(m => { if (!by[m.id]) by[m.id] = m; });
        }
    }
    rulesShown = full ? '2024' : '2014';
    srd52Added = adds;
    return true;
}

// Called at the end of srd52-full-data.js once it has run.
function rulesFullLoaded() {
    if (rulesVersion() === '2024') rulesSwap('2024');
}

function rulesLoadFull() {
    if (typeof SRD52_FULL !== 'undefined') return Promise.resolve();
    if (!rulesLoading) {
        rulesLoading = new Promise((ok, fail) => {
            const s = document.createElement('script');
            s.src = RULES_FULL_SRC;
            s.onload = ok;
            s.onerror = () => { rulesLoading = null; fail(new Error('could not load the 2024 rules')); };
            document.head.appendChild(s);
        });
    }
    return rulesLoading;
}

// Bring the page's data in line with rulesVersion(), then tell the page.
function rulesRefresh() {
    if (!SRD52_OK) return Promise.resolve();
    const want = rulesVersion();
    const go = () => { rulesSwap(want); srd52Changed(); };
    if (want === '2024' && !RULES_TEXT_ONLY && typeof SRD52_FULL === 'undefined') {
        document.documentElement.classList.add('rules-loading');
        return rulesLoadFull().then(go, () => { rulesPage = '2014'; go(); }).finally(() => document.documentElement.classList.remove('rules-loading'));
    }
    go();
    return Promise.resolve();
}

function rulesSet(v) {
    v = v === '2024' ? '2024' : '2014';
    try { localStorage.setItem(RULES_KEY, v); } catch (e) {}
    rulesPage = null;
    rulesDropUrlParam();
    return rulesRefresh();
}

function rulesUse(v) {
    rulesPage = v === '2024' ? '2024' : v === '2014' ? '2014' : null;
    return rulesRefresh();
}

// The address keeps a ?rules= only while it differs from... nothing: setUrlParams adds it in 2024.
function rulesDropUrlParam() {
    const p = new URLSearchParams(location.search);
    if (!p.has('rules')) return;
    p.delete('rules');
    if (rulesVersion() === '2024') p.set('rules', '2024');
    const qs = p.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}

// setUrlParams (rng.js) runs every address the page writes through this.
function rulesLinkParams(params) {
    if (!SRD52_OK || params.rules) return params;
    return rulesShown === '2024' ? { ...params, rules: '2024' } : params;
}

// Kept for older callers: re-applies the current version (say, after spells-data.js loads late).
function srd52Register() {
    if (SRD52_OK) rulesSwap(rulesShown === '2024' ? '2024' : rulesVersion() === '2024' && typeof SRD52_FULL !== 'undefined' ? '2024' : '2014');
}

function srd52Set(on) {
    try { localStorage.setItem(SRD52_KEY, on ? '1' : '0'); } catch (e) {}
    rulesRefresh();
}

function srd52Changed() {
    srd52Credit();
    rulesSyncControls();
    srd52Listeners.forEach(fn => fn(srd52On()));
}

function rulesSyncControls() {
    document.querySelectorAll('[data-rules]').forEach(s => { s.value = rulesShown; });
    document.querySelectorAll('[data-srd52]').forEach(b => {
        b.checked = srd52Added;
        const lab = b.closest('.v52-switch');
        if (lab) lab.hidden = rulesShown === '2024' || RULES_TEXT_ONLY;
    });
}

// The CC-BY line for SRD 5.2.1 while 5.2 text is showing: after the page's own SRD 5.1 credit,
// else at the end of <main>, else above the footer.
function srd52Credit() {
    const old = document.querySelector('.v52-credit');
    if (old) old.remove();
    if (!srd52On()) return;
    const note = [...document.querySelectorAll('.srd-note, .tool-note')].filter(n => n.textContent.includes('System Reference Document 5.1')).pop();
    const main = document.querySelector('main'), footer = document.querySelector('footer');
    if (!note && !main && !footer) return;
    const p = document.createElement('p');
    p.className = 'srd-note tool-note v52-credit';
    const what = rulesShown === '2024' ? '📗 The 2024 rules on this page are' : '📗 The SRD 5.2 additions are';
    p.innerHTML = what + ' from the System Reference Document 5.2.1 by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener">dndbeyond.com/srd</a>, licensed under the <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International License</a>.';
    if (note) note.after(p); else if (main) main.appendChild(p); else footer.before(p);
}

function srd52OnChange(fn) {
    srd52Listeners.push(fn);
}

function srd52IsSpell(name) {
    return srd52Added && rulesShown === '2014' && SRD52_SPELLS.some(s => s.name === name);
}

function srd52IsItem(name) {
    return srd52Added && rulesShown === '2014' && !!SRD52_ITEMS[name];
}

function srd52Tag() {
    if (rulesShown === '2024') return '';
    return '<span class="hb-tag v52-tag" title="From SRD 5.2 (the 2024 rules), added by the SRD 5.2 additions switch">📗 SRD 5.2</span>';
}

function srd52Toggle() {
    if (!SRD52_OK) return '';
    const v = rulesShown;
    return `<span class="rules-switch"><label class="rules-pick" title="Which D&amp;D 5e rules the site follows: its rules cards, spells, monsters, and magic items. One setting for the whole site, saved in this browser.">Rules <select data-rules aria-label="Rules version"><option value="2014"${v === '2014' ? ' selected' : ''}>2014 (SRD 5.1)</option><option value="2024"${v === '2024' ? ' selected' : ''}>2024 (SRD 5.2)</option></select></label>`
        + `<label class="v52-switch" title="20 spells, 17 monsters, and 17 magic items from the 2024 rules (SRD 5.2) that SRD 5.1 doesn't have, mixed into the 2014 lists."${v === '2024' || RULES_TEXT_ONLY ? ' hidden' : ''}><input type="checkbox" data-srd52${srd52Added ? ' checked' : ''}> 📗 SRD 5.2 additions</label></span>`;
}

if (SRD52_OK) {
    // Migrate: nothing to move (the additions keep their key); a reader who had them on stays in 2014.
    rulesSwap(RULES_TEXT_ONLY ? rulesVersion() : '2014');
    if (rulesVersion() === '2024' && !RULES_TEXT_ONLY) {
        if (document.readyState === 'loading') {
            // Parser-blocking, so the page's own scripts start with 2024 data (it calls rulesFullLoaded).
            document.write(`<script src="${RULES_FULL_SRC}"><\/script>`);
        } else {
            rulesRefresh();
        }
    }
    const ready = () => { srd52Credit(); rulesSyncControls(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
    document.addEventListener('change', e => {
        if (!e.target.matches) return;
        if (e.target.matches('[data-srd52]')) srd52Set(e.target.checked);
        if (e.target.matches('[data-rules]')) rulesSet(e.target.value);
    });
    window.addEventListener('storage', e => {
        if ((e.key === SRD52_KEY || e.key === RULES_KEY) && !rulesPage) rulesRefresh();
    });
}
