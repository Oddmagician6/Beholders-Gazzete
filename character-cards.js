/* ============================================
   FEATURE AND ITEM CARDS (F67): cut-out cards for a Character Builder
   character's attacks, class features, race traits, and background
   feature, and for any SRD magic items, on F61's card layout (cards.js,
   cards.css). Long item text flows onto more cards (gcFlow).
   The address bar holds it all: ?char=<builder id>&items=<slug,slug>,
   so a Loot hoard can link here with its items and nothing new goes in
   localStorage. Spell cards stay on the Spell Planner.
   Needs rng.js, character-data.js, spells-data.js, character-engine.js,
   magic-items-data.js, and cards.js.
   ============================================ */

const CC_MAX_ITEMS = 40;
const CC_SETS = [['attack', '⚔️ Attacks'], ['class', '📘 Class features'], ['race', '🧬 Race traits'], ['background', '🎒 Background'], ['items', '✨ Magic items']];
const CC_RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];

const CC_ITEM_SLUG = {};
const CC_ITEMS = Object.keys(MAGIC_ITEM_TEXT).sort((a, b) => a.localeCompare(b));
CC_ITEMS.forEach(n => { CC_ITEM_SLUG[magicItemSlug(n)] = n; });

const cc = { charId: '', c: null, items: [], off: new Set(), paper: 'letter', backs: false, q: '', rarity: '' };
const ccCache = new Map(); // card HTML by what it was made from, so measured cards aren't measured again

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('cc-status');
    el.textContent = msg;
    el.classList.toggle('cc-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

const ccChars = () => cbLoadAll().filter(c => cbClass(c.cls));

function ccFromUrl() {
    const q = urlParams();
    const id = q.get('char') || '';
    cc.c = (id && ccChars().find(c => c.id === id)) || null;
    cc.charId = cc.c ? id : '';
    cc.items = [...new Set((q.get('items') || '').split(',').map(s => CC_ITEM_SLUG[s]).filter(Boolean))].slice(0, CC_MAX_ITEMS);
}

function ccWriteUrl(push = false) {
    setUrlParams({ char: cc.charId, items: cc.items.map(magicItemSlug).join(',') }, push);
}

// ── What goes on the cards ───────────────────────────────

function ccTag(c) {
    const k = cbClass(c.cls);
    return `${c.name || 'Unnamed'} · ${k.name} ${c.level}`;
}

const CC_PROP_NOTES = {
    finesse: 'Finesse: uses Strength or Dexterity, whichever is better (already counted).',
    light: 'Light: when you attack with a light weapon, a bonus action attack with a light weapon in your other hand (no ability bonus to its damage).',
    heavy: 'Heavy: Small creatures attack with it at disadvantage.',
    thrown: 'Thrown: throw it for a ranged attack, using the same ability.',
    'two-handed': 'Two-handed: needs both hands to attack.',
    reach: 'Reach: you can hit 5 ft. farther than normal.',
    ammunition: 'Ammunition: uses a piece each attack; you can recover half after the fight.',
    loading: 'Loading: only one shot per action, bonus action, or reaction.'
};

function ccAttacks(c, d) {
    const out = d.attacks.map(a => {
        const w = Object.values(CB_WEAPONS).find(x => x[0] === a.name);
        const props = a.props ? a.props.split(', ') : [];
        const range = props.find(p => p.startsWith('range '));
        const vers = props.find(p => p.startsWith('versatile'));
        const plain = props.filter(p => p !== range && p !== vers);
        const notes = plain.map(p => CC_PROP_NOTES[p]).filter(Boolean);
        if (vers) notes.unshift(`Versatile: ${a.dmg.replace(/^\d+d\d+/, vers.match(/\((.+)\)/)[1])} ${a.type} with two hands.`);
        if (!a.prof) notes.unshift('**Not proficient:** no proficiency bonus on the attack roll.');
        const reach = w && w[2] === 'melee' ? (plain.includes('reach') ? '10 ft.' : '5 ft.') : '';
        const more = [['Reach' + (range ? ' / range' : ''), [reach, range && range.slice(6)].filter(Boolean).join(' / ') || '5 ft.']];
        if (plain.length) more.push(['Properties', plain.join(', ')]);
        return {
            name: a.name, sub: w ? `${w[1] === 'simple' ? 'Simple' : 'Martial'} ${w[2]} weapon` : 'Melee attack',
            hit: cbSign(a.hit), dmg: a.dmg, dmgType: a.type, more, notes
        };
    });
    if (d.breath) {
        out.push({
            name: 'Breath Weapon', sub: `Dragonborn${d.breath.kind ? ' (' + d.breath.kind + ')' : ''} · action`,
            hitLabel: 'Save', hit: `DC ${d.x.dc('con')} ${d.breath.save.toUpperCase()}`, dmg: d.breath.dice, dmgType: d.breath.dmg,
            more: [['Area', d.breath.area]], notes: ['Each creature in the area saves; half damage on a success. Once per short or long rest.']
        });
    }
    return out;
}

// { kind, list: [{ name, text, sub, kind }] } for each feature set.
function ccFeatures(c, d) {
    const k = d.k;
    const cls = [];
    const choices = cbClassChoices(c).filter(ch => !ch.skills);
    const picked = choices.some(ch => cbChoiceValue(c, ch.key).length);
    d.classFeatures.forEach(f => {
        if (picked && /see Choices/.test(f.text)) return;
        cls.push({ name: f.name, text: f.text, sub: `${k.name} · ${cbOrd(f.level)} level`, kind: 'class' });
    });
    choices.forEach(ch => {
        const vals = cbChoiceValue(c, ch.key).map(v => ch.options[v]).filter(Boolean);
        const bare = vals.filter(o => !o[1]);
        vals.filter(o => o[1]).forEach(o => cls.push({ name: o[0], text: o[1], sub: `${k.name} · ${ch.label}`, kind: 'option' }));
        if (bare.length) cls.push({ name: ch.label, text: bare.map(o => o[0]).join(', ') + '.', sub: `${k.name} · your choice`, kind: 'option' });
    });
    d.feats.forEach(f => cls.push({ name: f.name, text: f.text, sub: 'Feat', kind: 'feat' }));
    const raceName = d.sub ? d.sub.name : d.race ? d.race.name : '';
    const race = d.raceTraits.map(f => ({ name: f.name, text: f.text, sub: `${raceName} trait`, kind: 'race' }));
    const bgName = c.bg === 'custom' ? (c.bgOpt.name || 'Custom background') : c.bg ? CB_BACKGROUNDS[c.bg].name : '';
    const bg = d.bgFeature ? [{ name: d.bgFeature.name, text: d.bgFeature.text, sub: `${bgName} background feature`, kind: 'background' }] : [];
    return { class: cls, race, background: bg };
}

function ccCached(key, make) {
    if (!ccCache.has(key)) ccCache.set(key, make());
    return ccCache.get(key);
}

// Every card for the sets that are on, as { set, html } (one source can make several cards).
function ccCards() {
    const host = document.getElementById('cc-measure');
    const out = [];
    const on = id => !cc.off.has(id);
    if (cc.c) {
        const d = cbDerive(cc.c);
        const tag = ccTag(cc.c);
        if (on('attack')) ccAttacks(cc.c, d).forEach(a => out.push({ set: 'attack', html: attackCardHtml(a, tag) }));
        const f = ccFeatures(cc.c, d);
        ['class', 'race', 'background'].filter(on).forEach(set => f[set].forEach(x => {
            ccCached(JSON.stringify([x, tag]), () => featureCards(host, x, tag)).forEach(html => out.push({ set, html }));
        }));
    }
    if (on('items')) cc.items.forEach(n => {
        ccCached('item:' + n, () => itemCards(host, n, MAGIC_ITEM_TEXT[n], typeof hbmIsHomebrew === 'function' && hbmIsHomebrew(n) ? 'Homebrew item' : typeof srd52IsItem === 'function' && srd52IsItem(n) ? 'SRD 5.2 item' : 'Magic item')).forEach(html => out.push({ set: 'items', html }));
    });
    return out;
}

function ccCounts() {
    const counts = { items: cc.items.length };
    if (cc.c) {
        const d = cbDerive(cc.c);
        const f = ccFeatures(cc.c, d);
        counts.attack = ccAttacks(cc.c, d).length;
        counts.class = f.class.length;
        counts.race = f.race.length;
        counts.background = f.background.length;
    }
    return counts;
}

// ── Rendering ─────────────────────────────────────────────

function renderChars() {
    const sel = document.getElementById('cc-char');
    const list = ccChars();
    sel.innerHTML = `<option value="">No character (magic items only)</option>`
        + list.map(c => `<option value="${esc(c.id)}"${c.id === cc.charId ? ' selected' : ''}>🧝 ${esc(c.name || 'Unnamed')} (${esc(cbClass(c.cls).name)} ${c.level})</option>`).join('');
    sel.title = list.length ? 'Pick a saved Character Builder character' : 'Characters you save in the Character Builder show up here';
}

function renderSets() {
    const counts = ccCounts();
    const sets = CC_SETS.filter(([id]) => id === 'items' || cc.c);
    let h = `<div class="cc-sets">${sets.map(([id, label]) => `<label class="cc-check"><input type="checkbox" data-set="${id}"${cc.off.has(id) ? '' : ' checked'}> ${label} <span class="cc-n">${counts[id] || 0}</span></label>`).join('')}</div>`;
    if (!cc.c) {
        h += `<p class="cc-hint">${ccChars().length ? 'Pick a character for its attack, feature, and trait cards, or' : 'Save a character in the <a href="character-builder">Character Builder</a> for its attack, feature, and trait cards, or'} add magic items below.</p>`;
    } else {
        const k = cbClass(cc.c.cls);
        h += `<p class="cc-hint">${k.cast ? `Spell cards for ${esc(cc.c.name || 'this character')} are on the <a href="dnd-spell-planner?char=${encodeURIComponent(cc.charId)}">Spell Planner</a>. ` : ''}<a href="character-builder?char=${encodeURIComponent(cc.charId)}">Open in the Character Builder</a> to change the character.</p>`;
    }
    document.getElementById('cc-sets').innerHTML = h;
}

function renderItems() {
    const q = cc.q.trim().toLowerCase();
    const hits = CC_ITEMS.filter(n => (!q || n.toLowerCase().includes(q)) && (!cc.rarity || gcRarity(MAGIC_ITEM_TEXT[n][0]) === cc.rarity));
    const full = cc.items.length >= CC_MAX_ITEMS;
    document.getElementById('cc-results').innerHTML = hits.slice(0, 60).map(n => {
        const has = cc.items.includes(n);
        const r = gcRarity(MAGIC_ITEM_TEXT[n][0]);
        return `<li><button type="button" class="cc-item${has ? ' on' : ''}" data-item="${esc(n)}"${!has && full ? ' disabled' : ''} aria-pressed="${has}">
            <span class="cc-plus" aria-hidden="true">${has ? '✓' : '＋'}</span><span class="cc-item-name">${esc(n)}${typeof hbmIsHomebrew === 'function' && hbmIsHomebrew(n) ? ' <span class="hb-tag">🧪 Homebrew</span>' : typeof srd52IsItem === 'function' && srd52IsItem(n) ? ' ' + srd52Tag() : ''}</span><span class="cc-rarity" style="--r:${GC_RARITY_COLORS[r] || '#8a6a2a'}">${esc(r || 'varies')}</span></button></li>`;
    }).join('') || '<li class="cc-hint">No magic item matches.</li>';
    document.getElementById('cc-more').textContent = hits.length > 60 ? `Showing 60 of ${hits.length}; type to narrow it down.` : `${hits.length} item${hits.length === 1 ? '' : 's'}`;
    document.getElementById('cc-chosen').innerHTML = cc.items.length
        ? cc.items.map(n => `<li><span>${esc(n)}</span><button type="button" class="cc-x" data-drop="${esc(n)}" aria-label="Remove ${esc(n)}">✕</button></li>`).join('')
        : '<li class="cc-hint">None yet: add items from the list.</li>';
    document.getElementById('cc-item-count').textContent = `${cc.items.length}/${CC_MAX_ITEMS}`;
    document.getElementById('cc-clear').disabled = !cc.items.length;
}

function renderDeck() {
    const cards = ccCards();
    document.getElementById('cc-deck').innerHTML = cards.length
        ? cards.map(x => x.html).join('')
        : '<p class="cc-hint">No cards yet. Pick a character or add magic items.</p>';
    const pages = Math.ceil(cards.length / 9);
    document.getElementById('cc-card-count').textContent = cards.length ? `${cards.length} card${cards.length > 1 ? 's' : ''}, ${pages} page${pages > 1 ? 's' : ''}` : '';
    document.getElementById('cc-print-btn').disabled = !cards.length;
    document.getElementById('cc-paper').value = cc.paper;
}

function render() {
    renderChars();
    renderSets();
    renderItems();
    renderDeck();
}

// ── Actions ───────────────────────────────────────────────

function ccToggleItem(name) {
    const i = cc.items.indexOf(name);
    if (i >= 0) cc.items.splice(i, 1);
    else if (cc.items.length < CC_MAX_ITEMS) cc.items.push(name);
    else { flash(`That's the most at once (${CC_MAX_ITEMS}).`, true); return; }
    ccWriteUrl();
    renderSets();
    renderItems();
    renderDeck();
    const btn = document.querySelector(`#cc-results [data-item="${CSS.escape(name)}"]`);
    if (btn) btn.focus();
}

// The printed back for each set of cards
const CC_BACKS = { attack: 'attack', class: 'feature', race: 'feature', background: 'feature', items: 'magic-item' };

async function ccPrint() {
    const cards = ccCards();
    if (!cards.length) return;
    const backs = cc.backs ? cards.map(x => CC_BACKS[x.set]) : null;
    document.getElementById('cc-print').innerHTML = gcPages(cards.map(x => x.html), 9, backs);
    document.getElementById('cc-page-css').textContent = gcPageCss(cc.paper);
    await gcBacksReady(backs);
    window.print();
}

function ccCopyLink() {
    const done = () => flash(cc.charId ? 'Link copied. The character part only opens in this browser, where it is saved.' : 'Link copied.');
    navigator.clipboard.writeText(location.href).then(done, () => flash('Couldn\'t copy: copy the address bar instead.', true));
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    ccFromUrl();
    ccWriteUrl();
    // Cards are measured to split long text, so wait for the card fonts first.
    renderChars();
    renderSets();
    renderItems();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(renderDeck);

    const tool = document.getElementById('cc-tool');
    tool.addEventListener('click', e => {
        const item = e.target.closest('[data-item]');
        if (item) { ccToggleItem(item.dataset.item); return; }
        const drop = e.target.closest('[data-drop]');
        if (drop) { ccToggleItem(drop.dataset.drop); return; }
        if (e.target.closest('#cc-clear')) {
            cc.items = [];
            ccWriteUrl(true);
            render();
            flash('Items cleared. Back brings them back.');
        }
        if (e.target.closest('#cc-copy')) ccCopyLink();
    });
    tool.addEventListener('change', e => {
        const set = e.target.dataset.set;
        if (set) {
            if (e.target.checked) cc.off.delete(set); else cc.off.add(set);
            renderDeck();
        }
    });
    document.getElementById('cc-q').addEventListener('input', e => { cc.q = e.target.value; renderItems(); });
    document.getElementById('cc-rarity').addEventListener('change', e => { cc.rarity = CC_RARITIES.includes(e.target.value) ? e.target.value : ''; renderItems(); });
    document.getElementById('cc-char').addEventListener('change', e => {
        cc.charId = e.target.value;
        ccWriteUrl(true);
        ccFromUrl();
        render();
    });
    document.getElementById('cc-paper').addEventListener('change', e => { cc.paper = e.target.value === 'a4' ? 'a4' : 'letter'; });
    document.getElementById('cc-backs').addEventListener('change', e => { cc.backs = e.target.checked; });
    document.getElementById('cc-print-btn').addEventListener('click', ccPrint);
    window.addEventListener('popstate', () => { ccFromUrl(); render(); });
    window.addEventListener('storage', e => {
        if (e.key !== CB_KEY) return;
        ccCache.clear();
        ccFromUrl();
        render();
    });
});
