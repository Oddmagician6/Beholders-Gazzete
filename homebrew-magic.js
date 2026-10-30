/* ============================================
   HOMEBREW SPELLS AND MAGIC ITEMS (ROADMAP L4 D3): the data side and the form
   Like the homebrew monsters (homebrew.js), but for spells and items. The DM types one in,
   from their own book or their own invention; it is saved in the campaign notebook
   (notebook.js) as an entry of kind 'spell' (the spell in `spell`) or 'item' (the item in
   `item`), so the notebook's export, import, and the site backup carry it. The site ships
   none of this text: it lives only on the DM's device, and it never reaches the static
   compendium pages or the sitemap. Never add a shared library of these.
     spell: { name, level 0-9, school, cast, range, duration, components, concentration,
              ritual, classes: [class names], desc, higher, book (where it's from, free text) }
     item:  { name, kind (HBM_ITEM_KINDS key), detail ('longsword'), rarity (HBM_RARITIES key),
              attune, attuneBy ('a paladin'), price (gp, 0 = by rarity), desc, book }
   - hbmCleanSpell(raw) / hbmCleanItem(raw): a clean one from untrusted data, or null.
   - hbmRegister(nb): puts the notebook's spells into SPELLS_DATA (rows in its shape, with
     hb: true) and its items into MAGIC_ITEM_TEXT ([type line, text]), when those are on the
     page, so the Spellbook, Spell Planner, character builder and sheet, and item cards find
     them by name. A homebrew entry with an SRD name is skipped (the SRD one stays). Runs on
     load and after every notebook change; hbmOnChange(fn) runs fn after it.
     Items never go into the loot tables, so a seed rolls the same treasure on every device.
   - hbmIsHomebrew(name): whether that spell or item name is one of the DM's.
   - hbmLootSwap(magic, seed, type): the Loot Generator's opt-in (🧪): each rolled item may
     become a homebrew item of its rarity, drawn from its own stream (deriveSeed), so the
     rest of the roll is the same with it on or off.
   - hbmShelf(seed, count): homebrew items for an Arcane Emporium's shelf, the same way.
   - hbmOpenForm(kind, id, onSaved): the add/edit dialog ('spell' or 'item'; id = an entry).
   Needs notebook.js (and rng.js, rules-system.js under it). 5e only: on another system's
   page (ruleSystemId) it does nothing.
   ============================================ */

const HBM_ON = typeof ruleSystemId !== 'function' || ruleSystemId() === '5e';
const HBM_SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
const HBM_CLASSES = ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];
// key (the loot tables' type): [label, type-line word]
const HBM_ITEM_KINDS = {
    armor: ['Armor', 'Armor'], potion: ['Potion', 'Potion'], ring: ['Ring', 'Ring'], rod: ['Rod', 'Rod'], scroll: ['Scroll', 'Scroll'],
    staff: ['Staff', 'Staff'], wand: ['Wand', 'Wand'], weapon: ['Weapon', 'Weapon'], wondrous: ['Wondrous item', 'Wondrous item']
};
// key (the loot tables' rarity): [label, gp when the item has no price of its own]
const HBM_RARITIES = {
    common: ['common', 100], uncommon: ['uncommon', 500], rare: ['rare', 5000], 'very-rare': ['very rare', 50000],
    legendary: ['legendary', 500000], artifact: ['artifact', 0]
};
const HBM_LIMITS = { name: 60, line: 60, book: 80, desc: 6000, higher: 1500, price: 10000000 };
const HBM_KINDS = { spell: 'spell', item: 'item' };

function hbmText(v, max) {
    return typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '';
}

function hbmLine(v, max = HBM_LIMITS.line) {
    return hbmText(v, max).replace(/\s+/g, ' ');
}

function hbmEsc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hbmCleanSpell(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = hbmLine(raw.name, HBM_LIMITS.name);
    if (!name) return null;
    const level = Number.isInteger(raw.level) && raw.level >= 0 && raw.level <= 9 ? raw.level : 1;
    const concentration = raw.concentration === true;
    let duration = hbmLine(raw.duration) || 'Instantaneous';
    if (concentration && !/^concentration/i.test(duration)) duration = `Concentration, up to ${duration.charAt(0).toLowerCase()}${duration.slice(1)}`;
    return {
        name, level,
        school: HBM_SCHOOLS.includes(raw.school) ? raw.school : 'Evocation',
        cast: hbmLine(raw.cast) || '1 action',
        range: hbmLine(raw.range) || 'Self',
        duration,
        components: hbmLine(raw.components, 200) || 'V, S',
        concentration,
        ritual: raw.ritual === true,
        classes: HBM_CLASSES.filter(c => Array.isArray(raw.classes) && raw.classes.includes(c)),
        desc: hbmText(raw.desc, HBM_LIMITS.desc),
        higher: hbmText(raw.higher, HBM_LIMITS.higher),
        book: hbmLine(raw.book, HBM_LIMITS.book)
    };
}

function hbmCleanItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = hbmLine(raw.name, HBM_LIMITS.name);
    if (!name) return null;
    const price = Number.isFinite(raw.price) && raw.price > 0 ? Math.min(HBM_LIMITS.price, Math.round(raw.price * 100) / 100) : 0;
    return {
        name,
        kind: Object.hasOwn(HBM_ITEM_KINDS, raw.kind) ? raw.kind : 'wondrous',
        detail: hbmLine(raw.detail, 40),
        rarity: Object.hasOwn(HBM_RARITIES, raw.rarity) ? raw.rarity : 'uncommon',
        attune: raw.attune === true,
        attuneBy: raw.attune === true ? hbmLine(raw.attuneBy) : '',
        price,
        desc: hbmText(raw.desc, HBM_LIMITS.desc),
        book: hbmLine(raw.book, HBM_LIMITS.book)
    };
}

// "1st-level evocation", "Divination cantrip"
function hbmLevelLine(sp) {
    if (!sp.level) return `${sp.school} cantrip`;
    const sfx = sp.level === 1 ? 'st' : sp.level === 2 ? 'nd' : sp.level === 3 ? 'rd' : 'th';
    return `${sp.level}${sfx}-level ${sp.school.toLowerCase()}${sp.ritual ? ' (ritual)' : ''}`;
}

// "Weapon (longsword), rare (requires attunement by a paladin)": MAGIC_ITEM_TEXT's type line.
function hbmItemLine(it) {
    const kind = HBM_ITEM_KINDS[it.kind][1] + (it.detail ? ` (${it.detail})` : '');
    const att = it.attune ? ` (requires attunement${it.attuneBy ? ' by ' + it.attuneBy : ''})` : '';
    return `${kind}, ${HBM_RARITIES[it.rarity][0]}${att}`;
}

function hbmPrice(it) {
    return it.price || HBM_RARITIES[it.rarity][1];
}

// The notebook card's line.
function hbmSpellSub(sp) {
    return [hbmLevelLine(sp), sp.classes.join(', '), sp.book].filter(Boolean).join(' · ');
}

function hbmItemSub(it) {
    return [hbmItemLine(it), it.book].filter(Boolean).join(' · ');
}

// A spell as a SPELLS_DATA row.
function hbmSpellRow(sp, id) {
    const { book, ...row } = sp;
    return { ...row, hb: true, hbId: id, book };
}

// ── Register into the page's data ─────────────────────────
let hbmSpells = [];   // SPELLS_DATA rows
let hbmItems = [];    // { id, ...item }
const hbmNames = new Set();
const hbmListeners = [];
let hbmSrd = null;    // { spells: Set, items: Set } of lower-case SRD names

function hbmSaved(nb, kind) {
    return nb.entries.filter(e => e.kind === kind && e[kind]);
}

function hbmIsHomebrew(name) {
    return hbmNames.has(String(name).toLowerCase());
}

// Whether a name is already an SRD spell / item (then the homebrew one is skipped).
function hbmSrdHas(kind, name) {
    return !!hbmSrd && hbmSrd[kind === 'spell' ? 'spells' : 'items'].has(String(name).trim().toLowerCase());
}

function hbmRegister(nb) {
    if (!HBM_ON || typeof nbLoad !== 'function') return;
    nb = nb || nbLoad();
    if (!hbmSrd) {
        hbmSrd = {
            spells: new Set(typeof SPELLS_DATA !== 'undefined' ? SPELLS_DATA.map(s => s.name.toLowerCase()) : []),
            items: new Set(typeof MAGIC_ITEM_TEXT !== 'undefined' ? Object.keys(MAGIC_ITEM_TEXT).map(n => n.toLowerCase()) : [])
        };
    }
    // Take out the last ones, in place (other scripts hold these objects).
    if (typeof SPELLS_DATA !== 'undefined') for (let i = SPELLS_DATA.length - 1; i >= 0; i--) if (SPELLS_DATA[i].hb) SPELLS_DATA.splice(i, 1);
    if (typeof MAGIC_ITEM_TEXT !== 'undefined') hbmItems.forEach(it => { delete MAGIC_ITEM_TEXT[it.name]; });
    hbmNames.clear();
    const seen = new Set();
    const fresh = name => {
        const k = name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    };
    hbmSpells = hbmSaved(nb, 'spell').filter(e => !hbmSrd.spells.has(e.spell.name.toLowerCase()) && fresh(e.spell.name))
        .map(e => hbmSpellRow(e.spell, e.id)).sort((a, b) => a.name.localeCompare(b.name));
    hbmItems = hbmSaved(nb, 'item').filter(e => !hbmSrd.items.has(e.item.name.toLowerCase()) && fresh(e.item.name))
        .map(e => ({ id: e.id, ...e.item })).sort((a, b) => a.name.localeCompare(b.name));
    if (typeof SPELLS_DATA !== 'undefined') SPELLS_DATA.push(...hbmSpells);
    if (typeof MAGIC_ITEM_TEXT !== 'undefined') hbmItems.forEach(it => { MAGIC_ITEM_TEXT[it.name] = [hbmItemLine(it), hbmItemText(it)]; });
    seen.forEach(k => hbmNames.add(k));
    hbmListeners.forEach(fn => fn());
}

// The item's text, with where it's from at the end.
function hbmItemText(it) {
    return [it.desc || 'No description yet.', it.book ? `Homebrew · ${it.book}` : 'Homebrew'].join('\n');
}

function hbmOnChange(fn) {
    hbmListeners.push(fn);
}

// ── Loot and shops (opt-in, a stream of their own) ────────
// Each rolled item (loot-engine.js's shape) may become a homebrew item of its rarity (and type,
// when the Magic Items tab picked one), as often as the homebrew ones are among all the items
// there. Returns a new list; the roll itself is never touched.
function hbmLootSwap(magic, seed, type = 'any') {
    if (!HBM_ON || !hbmItems.length || !Array.isArray(magic) || !magic.length || !seed) return magic;
    return withSeed(deriveSeed(String(seed), 'homebrew-items'), () => magic.map(m => {
        const mine = hbmItems.filter(it => it.rarity === m.rarity && (type === 'any' || it.kind === type));
        const srd = typeof magicPool === 'function' ? magicPool(m.rarity, type).length : 0;
        if (!mine.length || rand() >= mine.length / (mine.length + srd)) return m;
        const it = mine[Math.floor(rand() * mine.length)];
        return { ...m, name: it.name, type: it.kind, attune: it.attune, value: hbmPrice(it), hb: true };
    }));
}

// Up to count homebrew items (priced) for a magic shop's shelf, the same ones for the same seed.
function hbmShelf(seed, count = 3, maxGp = Infinity) {
    if (!HBM_ON || !seed) return [];
    const fits = hbmItems.filter(it => it.rarity !== 'artifact' && hbmPrice(it) <= maxGp);
    if (!fits.length) return [];
    return withSeed(deriveSeed(String(seed), 'homebrew-shelf'), () => {
        const a = fits.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a.slice(0, count);
    });
}

// ── The form ──────────────────────────────────────────────
const HBM_NOTE = "Saved in this browser's campaign notebook only, never on the Gazette's site. Type it from your own book or make it up.";

function hbmFieldsHtml(kind, v) {
    const sel = (name, opts, cur) => `<select name="${name}">${opts.map(([k, l]) => `<option value="${hbmEsc(k)}"${k === cur ? ' selected' : ''}>${hbmEsc(l)}</option>`).join('')}</select>`;
    const txt = (name, label, val, max, ph = '') => `<label>${label} <input type="text" name="${name}" maxlength="${max}" value="${hbmEsc(val || '')}" placeholder="${hbmEsc(ph)}"></label>`;
    if (kind === 'spell') {
        const lv = [['0', 'Cantrip'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [String(n), `Level ${n}`])];
        return `<div class="hbm-grid">
                ${txt('name', 'Name', v.name, HBM_LIMITS.name)}
                <label>Level ${sel('level', lv, String(v.level ?? 1))}</label>
                <label>School ${sel('school', HBM_SCHOOLS.map(s => [s, s]), v.school || 'Evocation')}</label>
                ${txt('cast', 'Casting time', v.cast, HBM_LIMITS.line, '1 action')}
                ${txt('range', 'Range', v.range, HBM_LIMITS.line, '60 feet')}
                ${txt('components', 'Components', v.components, 200, 'V, S, M (a feather)')}
                ${txt('duration', 'Duration', v.concentration ? (v.duration || '').replace(/^concentration, up to /i, '') : v.duration, HBM_LIMITS.line, '1 minute')}
                <label class="hbm-check"><input type="checkbox" name="concentration"${v.concentration ? ' checked' : ''}> Concentration</label>
                <label class="hbm-check"><input type="checkbox" name="ritual"${v.ritual ? ' checked' : ''}> Ritual</label>
            </div>
            <fieldset class="hbm-classes"><legend>Classes</legend>${HBM_CLASSES.map(c => `<label class="hbm-check"><input type="checkbox" name="classes" value="${c}"${(v.classes || []).includes(c) ? ' checked' : ''}> ${c}</label>`).join('')}</fieldset>
            <label class="hbm-wide">What it does <textarea name="desc" rows="6" maxlength="${HBM_LIMITS.desc}">${hbmEsc(v.desc || '')}</textarea></label>
            <label class="hbm-wide">At higher levels <textarea name="higher" rows="2" maxlength="${HBM_LIMITS.higher}">${hbmEsc(v.higher || '')}</textarea></label>
            ${txt('book', 'Source', v.book, HBM_LIMITS.book, 'My own, or a book and page')}`;
    }
    return `<div class="hbm-grid">
            ${txt('name', 'Name', v.name, HBM_LIMITS.name)}
            <label>Type ${sel('kind', Object.entries(HBM_ITEM_KINDS).map(([k, [l]]) => [k, l]), v.kind || 'wondrous')}</label>
            ${txt('detail', 'Kind (optional)', v.detail, 40, 'longsword, any light armor')}
            <label>Rarity ${sel('rarity', Object.entries(HBM_RARITIES).map(([k, [l]]) => [k, l.charAt(0).toUpperCase() + l.slice(1)]), v.rarity || 'uncommon')}</label>
            <label class="hbm-check"><input type="checkbox" name="attune"${v.attune ? ' checked' : ''}> Requires attunement</label>
            ${txt('attuneBy', 'Attuned by (optional)', v.attuneBy, HBM_LIMITS.line, 'a spellcaster')}
            <label>Price in gp <input type="number" name="price" min="0" max="${HBM_LIMITS.price}" step="any" value="${v.price || ''}" placeholder="by rarity" inputmode="decimal"></label>
        </div>
        <label class="hbm-wide">What it does <textarea name="desc" rows="6" maxlength="${HBM_LIMITS.desc}">${hbmEsc(v.desc || '')}</textarea></label>
        ${txt('book', 'Source', v.book, HBM_LIMITS.book, 'My own, or a book and page')}`;
}

function hbmRead(kind, form) {
    const f = form.elements;
    if (kind === 'spell') {
        return hbmCleanSpell({
            name: f.name.value, level: Number(f.level.value), school: f.school.value, cast: f.cast.value, range: f.range.value,
            components: f.components.value, duration: f.duration.value, concentration: f.concentration.checked, ritual: f.ritual.checked,
            classes: [...form.querySelectorAll('input[name="classes"]:checked')].map(c => c.value), desc: f.desc.value, higher: f.higher.value, book: f.book.value
        });
    }
    return hbmCleanItem({
        name: f.name.value, kind: f.kind.value, detail: f.detail.value, rarity: f.rarity.value, attune: f.attune.checked,
        attuneBy: f.attuneBy.value, price: Number(f.price.value) || 0, desc: f.desc.value, book: f.book.value
    });
}

// Save a spell or item; id: the entry it replaces. Returns the entry, or throws an Error for the DM.
function hbmSave(kind, value, id) {
    if (!value) throw new Error('Give it a name first.');
    if (hbmSrdHas(kind, value.name)) throw new Error(`${value.name} is already in the SRD, so it's on the site as it is. Give yours another name.`);
    const nb = nbLoad();
    const twin = hbmSaved(nb, kind).find(e => e.id !== id && e[kind].name.toLowerCase() === value.name.toLowerCase());
    if (twin) throw new Error(`You already have a homebrew ${kind} named ${value.name}. Edit that one in the notebook, or pick another name.`);
    const sub = kind === 'spell' ? hbmSpellSub(value) : hbmItemSub(value);
    const e = id ? nbFind(nb, id) : null;
    if (e && e.kind === kind) {
        e[kind] = value;
        e.title = value.name;
        e.sub = sub;
        if (!nbStore(nb)) throw new Error("This browser wouldn't save it (storage full or blocked).");
        return e;
    }
    const res = nbAdd({ kind, title: value.name, sub, href: '', [kind]: value });
    if (!res) throw new Error("This browser wouldn't save it (storage full or blocked).");
    if (res.full) throw new Error(`The notebook is full (${NB_LIMITS.entries} entries). Remove some in the Worldbuilder first.`);
    return res.entry;
}

// The add/edit dialog. onSaved(entry) runs after a save.
function hbmOpenForm(kind, id = null, onSaved = null) {
    if (!HBM_ON || !HBM_KINDS[kind]) return;
    const nb = nbLoad();
    const e = id ? nbFind(nb, id) : null;
    const v = e && e.kind === kind ? e[kind] : {};
    const what = kind === 'spell' ? 'spell' : 'magic item';
    document.getElementById('hbm-dialog')?.remove();
    const dlg = document.createElement('dialog');
    dlg.id = 'hbm-dialog';
    dlg.className = 'hbm-dialog';
    dlg.setAttribute('aria-labelledby', 'hbm-title');
    dlg.innerHTML = `<form class="hbm-form" method="dialog" novalidate>
            <h2 id="hbm-title">${kind === 'spell' ? '✨' : '💍'} ${e ? 'Edit' : 'New'} homebrew ${what}</h2>
            ${hbmFieldsHtml(kind, v)}
            <p class="hbm-note">${hbmEsc(HBM_NOTE)} It shows up across the ${kind === 'spell' ? 'Spellbook, Spell Planner, and character tools' : 'character sheet, item cards, Loot Generator, and Arcane Emporium shops'}, tagged Homebrew.</p>
            <p class="hbm-error" role="alert"></p>
            <div class="hbm-buttons">
                <button type="submit" class="btn btn-gold">💾 Save</button>
                <button type="button" class="btn hbm-cancel">Cancel</button>
            </div>
        </form>`;
    document.body.appendChild(dlg);
    const form = dlg.querySelector('form');
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.querySelector('.hbm-cancel').addEventListener('click', close);
    dlg.addEventListener('cancel', () => setTimeout(() => dlg.remove(), 0));
    form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
            const entry = hbmSave(kind, hbmRead(kind, form), e ? e.id : null);
            close();
            if (onSaved) onSaved(entry);
        } catch (err) {
            dlg.querySelector('.hbm-error').textContent = '⚠️ ' + err.message;
        }
    });
    dlg.showModal();
    form.elements.name.focus();
}

if (HBM_ON && typeof nbOnChange === 'function') {
    hbmRegister();
    nbOnChange(hbmRegister);
}
