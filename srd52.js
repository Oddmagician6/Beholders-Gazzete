/* ============================================
   SRD 5.2 ADDITIONS (ROADMAP L4 D4): the opt-in switch
   srd52-data.js holds the 20 spells, 17 monsters, and 17 magic items that SRD 5.2 has and
   SRD 5.1 doesn't. They stay out until the reader turns on "SRD 5.2 additions": one setting
   for the whole site, kept in this browser (localStorage gazette_srd52), off by default.
   - srd52On(): whether it's on.
   - srd52Set(on): turns it on or off, adds or removes the rows, and runs the srd52OnChange
     listeners (also when another tab changes it).
   - srd52Register(): when on, puts the spells into SPELLS_DATA, the items into
     MAGIC_ITEM_TEXT, and the monsters into MONSTER_BY_ID, on pages that have those, so the
     Spellbook, Spell Planner, character builder and sheet, item cards, and stat blocks find
     them by name. Every row carries v52: true. Runs on load.
   - srd52Monsters(): the monster rows when on (the Bestiary and the Encounter picker list them).
   - srd52Toggle(): the switch's markup; any [data-srd52] checkbox on the page works it.
   - srd52Tag(): the "📗 SRD 5.2" tag for a row.
   Seeded rolls (NPC spells, encounters, loot, quick-built characters) never draw these rows,
   so a link rolls the same with the switch on or off. They have no static compendium pages.
   5e only: on another system's page (ruleSystemId) it does nothing.
   ============================================ */

const SRD52_KEY = 'gazette_srd52';
const SRD52_OK = typeof SRD52_SPELLS !== 'undefined' && (typeof ruleSystemId !== 'function' || ruleSystemId() === '5e');
const srd52Listeners = [];
let srd52Added = false;

function srd52On() {
    if (!SRD52_OK) return false;
    try { return localStorage.getItem(SRD52_KEY) === '1'; } catch (e) { return false; }
}

function srd52Monsters() {
    return srd52Added ? SRD52_MONSTERS : [];
}

// Safe to run again (say, after spells-data.js loads late): takes the rows out, then puts them back if on.
function srd52Register() {
    if (!SRD52_OK) return;
    srd52Added = srd52On();
    const spells = typeof SPELLS_DATA !== 'undefined' ? SPELLS_DATA : null;
    const items = typeof MAGIC_ITEM_TEXT !== 'undefined' ? MAGIC_ITEM_TEXT : null;
    const byId = typeof MONSTER_BY_ID !== 'undefined' ? MONSTER_BY_ID : null;
    if (spells) for (let i = spells.length - 1; i >= 0; i--) if (spells[i].v52) spells.splice(i, 1);
    if (items) Object.keys(SRD52_ITEMS).forEach(n => { if (items[n] === SRD52_ITEMS[n]) delete items[n]; });
    if (byId) SRD52_MONSTERS.forEach(m => { if (byId[m.id] === m) delete byId[m.id]; });
    if (!srd52Added) return;
    if (spells) {
        const have = new Set(spells.map(s => s.name.toLowerCase()));
        spells.push(...SRD52_SPELLS.filter(s => !have.has(s.name.toLowerCase())));
    }
    if (items) Object.entries(SRD52_ITEMS).forEach(([n, v]) => { if (!items[n]) items[n] = v; });
    if (byId) SRD52_MONSTERS.forEach(m => { if (!byId[m.id]) byId[m.id] = m; });
}

function srd52Set(on) {
    try { localStorage.setItem(SRD52_KEY, on ? '1' : '0'); } catch (e) {}
    srd52Changed();
}

function srd52Changed() {
    srd52Register();
    srd52Credit();
    document.querySelectorAll('[data-srd52]').forEach(b => { b.checked = srd52Added; });
    srd52Listeners.forEach(fn => fn(srd52Added));
}

// The CC-BY line for SRD 5.2.1 while the additions are on: after the page's own SRD 5.1 credit,
// else at the end of <main>, else above the footer.
function srd52Credit() {
    const old = document.querySelector('.v52-credit');
    if (old) old.remove();
    if (!srd52Added) return;
    const note = [...document.querySelectorAll('.srd-note, .tool-note')].filter(n => n.textContent.includes('System Reference Document 5.1')).pop();
    const main = document.querySelector('main'), footer = document.querySelector('footer');
    if (!note && !main && !footer) return;
    const p = document.createElement('p');
    p.className = 'srd-note tool-note v52-credit';
    p.innerHTML = '📗 The SRD 5.2 additions are from the System Reference Document 5.2.1 by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener">dndbeyond.com/srd</a>, licensed under the <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International License</a>.';
    if (note) note.after(p); else if (main) main.appendChild(p); else footer.before(p);
}

function srd52OnChange(fn) {
    srd52Listeners.push(fn);
}

function srd52IsSpell(name) {
    return srd52Added && SRD52_SPELLS.some(s => s.name === name);
}

function srd52IsItem(name) {
    return srd52Added && !!SRD52_ITEMS[name];
}

function srd52Tag() {
    return '<span class="hb-tag v52-tag" title="From SRD 5.2 (the 2024 rules), added by the SRD 5.2 additions switch">📗 SRD 5.2</span>';
}

function srd52Toggle() {
    if (!SRD52_OK) return '';
    return `<label class="v52-switch" title="20 spells, 17 monsters, and 17 magic items from the 2024 rules (SRD 5.2) that SRD 5.1 doesn't have. One setting for the whole site, saved in this browser."><input type="checkbox" data-srd52${srd52On() ? ' checked' : ''}> 📗 SRD 5.2 additions</label>`;
}

if (SRD52_OK) {
    srd52Register();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', srd52Credit); else srd52Credit();
    document.addEventListener('change', e => {
        if (e.target.matches && e.target.matches('[data-srd52]')) srd52Set(e.target.checked);
    });
    window.addEventListener('storage', e => { if (e.key === SRD52_KEY) srd52Changed(); });
}
