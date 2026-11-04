/* ============================================
   PATHFINDER CHARACTER CARDS (ROADMAP L3 P5.7): cut-out cards for a Pathfinder
   Character Builder character (pf2e-character.js): its Strikes, class features
   and class choice, feats, ancestry and heritage, background, and spells (the
   Spell Planner's picks), plus any Pathfinder item, on F61's card layout
   (cards.js, cards.css). Long text flows onto more cards (gcFlow).
   The address bar holds it all: ?char=<builder id>&items=<key,key>, so nothing
   new goes in localStorage. Rules text for feats, class features, and choices
   comes from pf2e-character-text.js, loaded once the page is up (pcLoadText).
   Needs rng.js, pf2e-character-data.js, pf2e-character.js, pf2e-items-data.js,
   pf2e-spells-data.js, and cards.js.
   ============================================ */

const PK_MAX_ITEMS = 40;
const PK_SETS = [['strike', '⚔️ Strikes'], ['class', '📘 Class features'], ['feat', '⭐ Feats'], ['ancestry', '🧬 Ancestry'],
    ['background', '🎒 Background'], ['spell', '🔮 Spells'], ['items', '✨ Items']];
const PK_RARITY = { '': 'common', u: 'uncommon', r: 'rare', q: 'unique' };
const PK_RARITY_COLORS = { common: '#7a7468', uncommon: '#b0602a', rare: '#2f5aa8', unique: '#7a3a9a' };
const PK_TRAD_COLORS = { arcane: '#3a6fc0', divine: '#b08a2a', occult: '#7a3a9a', primal: '#2f8a4a', focus: '#a03a6a' };
const PK_FEAT_COLORS = { ancestry: '#2f7a5a', class: '#8a6a2a', archetype: '#9a5a2a', skill: '#3a6a9a', general: '#7a4a9a' };
const PK_ACTS = { 1: '◆', 2: '◆◆', 3: '◆◆◆', r: '⤾', reaction: '⤾', f: '◇', free: '◇', '1 to 3': '◆ to ◆◆◆', '1 or 2': '◆ or ◆◆', '2 or 3': '◆◆ or ◆◆◆' };
const PK_DMG = { B: 'bludgeoning', P: 'piercing', S: 'slashing' };
const PK_VISION = {
    'low-light-vision': ['Low-Light Vision', 'You see in dim light as well as you do in bright light, so dim light doesn\'t make things concealed from you.'],
    darkvision: ['Darkvision', 'You see in darkness and dim light as well as you do in bright light, though in darkness you see only in black and white.']
};
// Features that only raise a proficiency rank or add damage: the sheet and the Strike cards already count them.
const PK_PLAIN_FEATURE = /(Expertise|Mastery|Legend)$|^(Expert|Master|Legendary) Spellcaster$|Weapon Specialization/;

// Weapon traits in a line each, in the Gazette's words (the numbers on the card already count them where they can).
const PK_TRAIT_NOTES = {
    agile: () => 'Agile: your multiple attack penalty with it is −4 and −8 (already on the card).',
    finesse: () => 'Finesse: you can attack with Dexterity in place of Strength (the better one is counted).',
    deadly: d => `Deadly ${d}: a critical hit adds one ${d} of damage (two with greater striking, three with major).`,
    fatal: d => `Fatal ${d}: on a critical hit, every damage die becomes a ${d}, and you add one more ${d}.`,
    forceful: () => 'Forceful: +1 damage per weapon die on your second attack of the turn, +2 per die on the third and later.',
    sweep: () => 'Sweep: +1 circumstance bonus to hit if you already attacked a different target this turn.',
    backstabber: () => 'Backstabber: +1 precision damage against an off-guard target (+2 with a +3 potency rune).',
    backswing: () => 'Backswing: after you miss with it, +1 circumstance bonus to hit with it for the rest of the turn.',
    propulsive: () => 'Propulsive: adds half your Strength modifier to damage if it\'s positive, all of it if negative (counted).',
    thrown: d => `Thrown ${d} ft.: throw it as a ranged Strike, adding Strength to the damage.`,
    volley: d => `Volley ${d} ft.: −2 to hit a target within ${d} feet.`,
    'two-hand': d => `Two-hand ${d}: held in two hands, its damage die becomes a ${d}.`,
    versatile: d => `Versatile ${d.toUpperCase()}: it can deal ${PK_DMG[d.toUpperCase()] || d} damage in place of its usual type.`,
    reach: d => `Reach: you can attack creatures up to ${d || 10} feet away.`,
    nonlethal: () => 'Nonlethal: it knocks a foe out in place of killing it.',
    parry: () => 'Parry: spend an action for a +1 circumstance bonus to AC until your next turn.',
    twin: () => 'Twin: +1 circumstance damage per weapon die if you already attacked with another weapon of the same kind this turn.',
    'free-hand': () => 'Free-hand: it leaves that hand free for other things.',
    splash: () => 'Splash: it splashes everything within 5 feet of the target, even on a miss.',
    trip: () => 'Trip: you can Trip with it, using the hand that holds it.',
    shove: () => 'Shove: you can Shove with it, using the hand that holds it.',
    disarm: () => 'Disarm: you can Disarm with it, using the hand that holds it.',
    grapple: () => 'Grapple: you can Grapple with it, using the hand that holds it.'
};

const PK_ITEMS = Object.keys(PF2E_ITEMS).filter(k => PF2E_ITEMS[k].x)
    .sort((a, b) => PF2E_ITEMS[a].n.localeCompare(PF2E_ITEMS[b].n));

const pk = { charId: '', c: null, items: [], off: new Set(), paper: 'letter', backs: false, q: '', rarity: '', text: false };
const pkCache = new Map(); // card HTML by what it was made from, so measured cards aren't measured again

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

const pkChars = () => pcLoadAll().filter(c => PF2E_CLASSES[c.cls]);
const pkRarity = x => PK_RARITY[x.ra || ''] || 'common';

function pkFromUrl() {
    const q = urlParams();
    const id = q.get('char') || '';
    pk.c = (id && pkChars().find(c => c.id === id)) || null;
    pk.charId = pk.c ? id : '';
    pk.items = [...new Set((q.get('items') || '').split(',').filter(k => Object.hasOwn(PF2E_ITEMS, k) && PF2E_ITEMS[k].x))].slice(0, PK_MAX_ITEMS);
}

function pkWriteUrl(push = false) {
    setUrlParams({ char: pk.charId, items: pk.items.join(',') }, push);
}

// ── What goes on the cards ───────────────────────────────

function pkTag(c) {
    return `${c.name || 'Unnamed'} · ${PF2E_CLASSES[c.cls].n} ${c.level}`;
}

// Prices are in copper: 1,500 → "15 gp".
function pkPrice(cp) {
    if (!cp) return '';
    const gp = Math.floor(cp / 100), sp = Math.floor(cp % 100 / 10), c = cp % 10;
    return [gp && `${gp.toLocaleString('en-US')} gp`, sp && `${sp} sp`, c && `${c} cp`].filter(Boolean).join(' ');
}

// Rules text → gcFlow blocks: "- " list items become bullets.
const pkBlocks = text => gcBlocks(String(text || '').replace(/^- /gm, '• '));

function pkStrikes(c) {
    return pcStrikes(c).map(s => {
        const m = /^(.*?)\s*([BPS])$/.exec(s.dmg);
        const notes = [];
        s.traits.forEach(t => {
            const [, name, val] = /^([a-z-]+?)(?:-(\d+|d\d+|[a-z]))?$/.exec(t) || [, t, ''];
            if (PK_TRAIT_NOTES[name]) notes.push(PK_TRAIT_NOTES[name](val || ''));
        });
        if (!s.rank) notes.unshift('**Untrained:** no proficiency bonus on the attack roll.');
        const more = [];
        if (s.ranged) more.push(['Range increment', `${s.range} ft.`]);
        const w = PF2E_ITEMS[s.key];
        if (w && w.rl !== undefined && w.rl !== '') more.push(['Reload', w.rl]);
        if (s.traits.length) more.push(['Traits', s.traits.join(', ')]);
        // A bomb's damage is in its text, not its dice.
        if (!s.dmg && w && w.x) notes.push(...w.x.split('\n').filter(l => !/^\*\*Activate/.test(l)));
        return {
            name: s.name, sub: `${PC_RANKS[s.rank]} · ${s.ranged ? 'ranged' : 'melee'} Strike ◆`,
            hitLabel: 'To hit (MAP)', hit: s.atk.map(pcSign).join(' / '),
            dmg: m ? m[1] : s.dmg || 'See below', dmgType: m ? PK_DMG[m[2]] : '', more, notes, link: `${GC_SITE}/pathfinder-character-builder`
        };
    });
}

// The feature sets, as { name, text, sub, kind, color, badge }.
function pkFeatures(c) {
    const p = pcParts(c);
    const out = { class: [], feat: [], ancestry: [], background: [] };
    if (p.cls) {
        pcFeatures(c).filter(f => !PK_PLAIN_FEATURE.test(f.name)).forEach(f => out.class.push({
            name: f.name, text: pcText('cf:' + f.key), sub: `${p.cls.n} · level ${f.level}`, color: PK_FEAT_COLORS.class
        }));
        [['ch', p.ch], ['ch2', p.ch2]].forEach(([f, x]) => {
            if (!x) return;
            const label = (p.cls[f] && p.cls[f][1]) || 'Class choice';
            out.class.push({ name: x.n, text: pcText('ch:' + c[f]), sub: `${p.cls.n} · ${label.toLowerCase()}`, color: '#a0782a' });
        });
    }
    const feat = (key, from) => {
        const f = PF2E_FEATS[key];
        if (!f) return;
        const kind = f.ar ? 'archetype' : f.c;
        const traits = (f.tr || []).filter(t => t !== kind).join(', ');
        out.feat.push({
            name: f.n, text: pcText('ft:' + key), sub: `${pcCap(kind)} feat ${f.l}${traits ? ' · ' + traits : ''}${from ? ' · from ' + from : ''}`,
            color: PK_FEAT_COLORS[kind] || PK_FEAT_COLORS.general, badge: f.a ? PK_ACTS[f.a] : ''
        });
    };
    const seen = new Set();
    pcFeatSlots(c).forEach(s => { const k = c.feats[s.slot]; if (k && !seen.has(k)) { seen.add(k); feat(k); } });
    pcGrantedFeats(c).forEach(g => { if (g.key && !seen.has(g.key)) { seen.add(g.key); feat(g.key, g.from); } });
    if (p.anc) {
        (p.anc.f || []).forEach(([name, text]) => out.ancestry.push({ name, text, sub: `${p.anc.n} ancestry`, color: PK_FEAT_COLORS.ancestry }));
        const vi = PK_VISION[p.anc.vi];
        if (vi) out.ancestry.push({ name: vi[0], text: vi[1], sub: `${p.anc.n} ancestry`, color: PK_FEAT_COLORS.ancestry });
    }
    if (p.her) out.ancestry.push({ name: p.her.n, text: p.her.x, sub: 'Heritage', color: PK_FEAT_COLORS.ancestry });
    if (p.bg) out.background.push({ name: p.bg.n, text: p.bg.x, sub: 'Background', color: '#3a6a9a' });
    return out;
}

// The character's spells: cantrips, repertoire or prepared spells (a spellbook if nothing is
// prepared), granted ones, focus spells, and a spellcasting archetype's, each once: [{ key, how }].
function pkSpells(c) {
    const arcs = pcArcCastings(c);
    if (!pcCasting(c) && !arcs.length) return [];
    const s = c.spells;
    const grants = pcSpellGrants(c);
    const out = new Map();
    const add = (k, how) => { if (Object.hasOwn(PF2E_SPELLS, k) && !out.has(k)) out.set(k, how); };
    s.ct.forEach(k => add(k, 'cantrip'));
    grants.list.filter(g => g.rank === 0).forEach(g => add(g.key, g.from));
    Object.keys(s.rep).sort((a, b) => a - b).forEach(r => s.rep[r].forEach(k => add(k, s.sig[r] === k ? 'signature' : 'repertoire')));
    grants.list.filter(g => g.rank > 0 && g.to === 'rep').forEach(g => add(g.key, g.from));
    const prepped = Object.keys(s.prep).sort((a, b) => a - b).flatMap(r => s.prep[r].filter(Boolean));
    prepped.forEach(k => add(k, 'prepared'));
    if (!prepped.length) s.book.forEach(k => add(k, 'spellbook'));
    pcFocus(c, grants).list.forEach(f => add(f.key, f.from || 'focus'));
    arcs.forEach(a => {
        const m = s.mc[a.arc];
        if (!m) return;
        const how = `${a.n.toLowerCase()} archetype`;
        m.ct.forEach(k => add(k, how));
        Object.values(m.rep).flat().forEach(k => add(k, how));
        const prep = Object.values(m.prep).flat().filter(Boolean);
        (prep.length ? prep : m.book).forEach(k => add(k, how));
    });
    return [...out].map(([key, how]) => ({ key, how }));
}

function pkSpellCards(host, key, tag) {
    const s = PF2E_SPELLS[key];
    const focus = s.k === 'f' || (s.k === 'c' && !(s.td || []).length);
    const kind = s.k === 'c' ? 'Cantrip' : s.k === 'f' ? 'Focus' : s.k === 'r' ? 'Ritual' : 'Spell';
    const stat = (k, v) => (v ? `<div><dt>${k}</dt><dd>${gcEsc(v)}</dd></div>` : '');
    const cast = PK_ACTS[s.t] || s.t;
    const stats = `<dl class="gc-stats">${stat('Cast', cast)}${stat('Range', s.rg)}${stat(s.ar ? 'Area' : 'Targets', s.ar || s.tg)}${stat('Defense', s.df)}${stat('Duration', s.du)}${stat('Cost', s.co)}</dl>`;
    const rarity = s.ra ? PK_RARITY[s.ra] + ' · ' : '';
    return gcFlow(host, pkBlocks(s.x), (body, part, total, tight) => gcTextCard({
        color: PK_TRAD_COLORS[focus ? 'focus' : (s.td || [])[0]] || '#8a6a2a', name: s.n,
        sub: `${kind} ${s.r} · ${rarity}${(s.tr || []).join(', ')}`, badge: `<span class="gc-lv" title="Rank ${s.r}">${s.r}</span>`,
        stats, body, part, total, tight, tag, link: `${GC_SITE}/pathfinder-spell-planner`
    }));
}

function pkItemCards(host, key, tag = 'Pathfinder item') {
    const x = PF2E_ITEMS[key];
    const r = pkRarity(x);
    const stat = (k, v) => (v ? `<div><dt>${k}</dt><dd>${gcEsc(v)}</dd></div>` : '');
    const stats = `<dl class="gc-stats">${stat('Price', pkPrice(x.p))}${stat('Bulk', x.bu)}${stat('Usage', x.u)}${stat('Damage', x.dm)}</dl>`;
    return gcFlow(host, pkBlocks(x.x), (body, part, total, tight) => gcTextCard({
        color: PK_RARITY_COLORS[r], name: x.n, sub: `Item ${x.l}${r === 'common' ? '' : ' · ' + r}${(x.tr || []).length ? ' · ' + x.tr.join(', ') : ''}`,
        badge: `<span class="gc-lv" title="Level ${x.l}">${x.l}</span>`, stats, body, part, total, tight, tag, link: `${GC_SITE}/pathfinder-character-cards`
    }));
}

function pkFeatureCards(host, f, tag) {
    const text = f.text || (pk.text ? '' : 'Loading the rules text…');
    return gcFlow(host, pkBlocks(text), (body, part, total, tight) => gcTextCard({
        color: f.color, name: f.name, sub: f.sub, badge: f.badge ? `<span class="gc-badge" title="Actions">${f.badge}</span>` : '',
        body, part, total, tight, tag, link: `${GC_SITE}/pathfinder-character-builder`, cls: 'gc-feature'
    }));
}

function pkCached(key, make) {
    if (!pkCache.has(key)) pkCache.set(key, make());
    return pkCache.get(key);
}

// Every card for the sets that are on, as { set, html } (one source can make several cards).
function pkCards() {
    const host = document.getElementById('cc-measure');
    const out = [];
    const on = id => !pk.off.has(id);
    if (pk.c) {
        const tag = pkTag(pk.c);
        if (on('strike')) pkStrikes(pk.c).forEach(a => out.push({ set: 'strike', html: attackCardHtml(a, tag) }));
        const f = pkFeatures(pk.c);
        ['class', 'feat', 'ancestry', 'background'].filter(on).forEach(set => f[set].forEach(x => {
            pkCached(JSON.stringify([x, tag]), () => pkFeatureCards(host, x, tag)).forEach(html => out.push({ set, html }));
        }));
        if (on('spell')) pkSpells(pk.c).forEach(({ key, how }) => {
            const t = `${tag} · ${how}`;
            pkCached('spell:' + key + t, () => pkSpellCards(host, key, t)).forEach(html => out.push({ set: 'spell', html }));
        });
    }
    if (on('items')) pk.items.forEach(k => {
        pkCached('item:' + k, () => pkItemCards(host, k)).forEach(html => out.push({ set: 'items', html }));
    });
    return out;
}

function pkCounts() {
    const counts = { items: pk.items.length };
    if (pk.c) {
        const f = pkFeatures(pk.c);
        counts.strike = pcStrikes(pk.c).length;
        ['class', 'feat', 'ancestry', 'background'].forEach(k => { counts[k] = f[k].length; });
        counts.spell = pkSpells(pk.c).length;
    }
    return counts;
}

// ── Rendering ─────────────────────────────────────────────

function renderChars() {
    const sel = document.getElementById('cc-char');
    const list = pkChars();
    sel.innerHTML = `<option value="">No character (items only)</option>`
        + list.map(c => `<option value="${esc(c.id)}"${c.id === pk.charId ? ' selected' : ''}>🧝 ${esc(c.name || 'Unnamed')} (${esc(PF2E_CLASSES[c.cls].n)} ${c.level})</option>`).join('');
    sel.title = list.length ? 'Pick a saved Character Builder character' : 'Characters you save in the Character Builder show up here';
}

function renderSets() {
    const counts = pkCounts();
    const sets = PK_SETS.filter(([id]) => id === 'items' || (pk.c && (id !== 'spell' || pcCasting(pk.c) || pcArcCastings(pk.c).length)));
    let h = `<div class="cc-sets">${sets.map(([id, label]) => `<label class="cc-check"><input type="checkbox" data-set="${id}"${pk.off.has(id) ? '' : ' checked'}> ${label} <span class="cc-n">${counts[id] || 0}</span></label>`).join('')}</div>`;
    if (!pk.c) {
        h += `<p class="cc-hint">${pkChars().length ? 'Pick a character for its Strike, feature, feat, and spell cards, or' : 'Save a character in the <a href="pathfinder-character-builder">Character Builder</a> for its Strike, feature, feat, and spell cards, or'} add items below.</p>`;
    } else {
        const id = encodeURIComponent(pk.charId);
        h += `<p class="cc-hint">${pcCasting(pk.c) ? `Pick the spells in the <a href="pathfinder-spell-planner?char=${id}">🃏 Spell Planner</a>; they show up here. ` : ''}<a href="pathfinder-character-builder?char=${id}">Open in the Character Builder</a> to change the character.</p>`;
    }
    document.getElementById('cc-sets').innerHTML = h;
}

function renderItems() {
    const q = pk.q.trim().toLowerCase();
    const hits = PK_ITEMS.filter(k => (!q || PF2E_ITEMS[k].n.toLowerCase().includes(q)) && (!pk.rarity || pkRarity(PF2E_ITEMS[k]) === pk.rarity));
    const full = pk.items.length >= PK_MAX_ITEMS;
    document.getElementById('cc-results').innerHTML = hits.slice(0, 60).map(k => {
        const x = PF2E_ITEMS[k];
        const has = pk.items.includes(k);
        const r = pkRarity(x);
        return `<li><button type="button" class="cc-item${has ? ' on' : ''}" data-item="${esc(k)}"${!has && full ? ' disabled' : ''} aria-pressed="${has}">
            <span class="cc-plus" aria-hidden="true">${has ? '✓' : '＋'}</span><span class="cc-item-name">${esc(x.n)}</span><span class="cc-rarity" style="--r:${PK_RARITY_COLORS[r]}">${r === 'common' ? '' : esc(r) + ' · '}level ${x.l}</span></button></li>`;
    }).join('') || '<li class="cc-hint">No item matches.</li>';
    document.getElementById('cc-more').textContent = hits.length > 60 ? `Showing 60 of ${hits.length.toLocaleString('en-US')}; type to narrow it down.` : `${hits.length} item${hits.length === 1 ? '' : 's'}`;
    document.getElementById('cc-chosen').innerHTML = pk.items.length
        ? pk.items.map(k => `<li><span>${esc(PF2E_ITEMS[k].n)}</span><button type="button" class="cc-x" data-drop="${esc(k)}" aria-label="Remove ${esc(PF2E_ITEMS[k].n)}">✕</button></li>`).join('')
        : '<li class="cc-hint">None yet: add items from the list.</li>';
    document.getElementById('cc-item-count').textContent = `${pk.items.length}/${PK_MAX_ITEMS}`;
    document.getElementById('cc-clear').disabled = !pk.items.length;
}

function renderDeck() {
    const cards = pkCards();
    document.getElementById('cc-deck').innerHTML = cards.length
        ? cards.map(x => x.html).join('')
        : '<p class="cc-hint">No cards yet. Pick a character or add items.</p>';
    const pages = Math.ceil(cards.length / 9);
    document.getElementById('cc-card-count').textContent = cards.length ? `${cards.length} card${cards.length > 1 ? 's' : ''}, ${pages} page${pages > 1 ? 's' : ''}` : '';
    document.getElementById('cc-print-btn').disabled = !cards.length;
    document.getElementById('cc-paper').value = pk.paper;
}

function render() {
    renderChars();
    renderSets();
    renderItems();
    renderDeck();
}

// ── Actions ───────────────────────────────────────────────

function pkToggleItem(key) {
    const i = pk.items.indexOf(key);
    if (i >= 0) pk.items.splice(i, 1);
    else if (pk.items.length < PK_MAX_ITEMS) pk.items.push(key);
    else { flash(`That's the most at once (${PK_MAX_ITEMS}).`, true); return; }
    pkWriteUrl();
    renderSets();
    renderItems();
    renderDeck();
    const btn = document.querySelector(`#cc-results [data-item="${CSS.escape(key)}"]`);
    if (btn) btn.focus();
}

// The printed back for each set of cards
const PK_BACKS = { strike: 'attack', class: 'feature', feat: 'feature', ancestry: 'feature', background: 'feature', spell: 'spell', items: 'magic-item' };

async function pkPrint() {
    const cards = pkCards();
    if (!cards.length) return;
    const backs = pk.backs ? cards.map(x => PK_BACKS[x.set]) : null;
    document.getElementById('cc-print').innerHTML = gcPages(cards.map(x => x.html), 9, backs);
    document.getElementById('cc-page-css').textContent = gcPageCss(pk.paper);
    await gcBacksReady(backs);
    window.print();
}

function pkCopyLink() {
    const done = () => flash(pk.charId ? 'Link copied. The character part only opens in this browser, where it is saved.' : 'Link copied.');
    navigator.clipboard.writeText(location.href).then(done, () => flash('Couldn\'t copy: copy the address bar instead.', true));
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    pkFromUrl();
    pkWriteUrl();
    // Cards are measured to split long text, so wait for the card fonts first; then again with the rules text.
    renderChars();
    renderSets();
    renderItems();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
        renderDeck();
        pcLoadText(ok => {
            pk.text = true;
            pkCache.clear();
            renderSets();
            renderDeck();
            if (!ok) flash('The rules text didn\'t load, so feature and feat cards are blank. Reload to try again.', true);
        });
    });

    const tool = document.getElementById('cc-tool');
    tool.addEventListener('click', e => {
        const item = e.target.closest('[data-item]');
        if (item) { pkToggleItem(item.dataset.item); return; }
        const drop = e.target.closest('[data-drop]');
        if (drop) { pkToggleItem(drop.dataset.drop); return; }
        if (e.target.closest('#cc-clear')) {
            pk.items = [];
            pkWriteUrl(true);
            render();
            flash('Items cleared. Back brings them back.');
        }
        if (e.target.closest('#cc-copy')) pkCopyLink();
    });
    tool.addEventListener('change', e => {
        const set = e.target.dataset.set;
        if (set) {
            if (e.target.checked) pk.off.delete(set); else pk.off.add(set);
            renderDeck();
        }
    });
    document.getElementById('cc-q').addEventListener('input', e => { pk.q = e.target.value; renderItems(); });
    document.getElementById('cc-rarity').addEventListener('change', e => { pk.rarity = Object.values(PK_RARITY).includes(e.target.value) ? e.target.value : ''; renderItems(); });
    document.getElementById('cc-char').addEventListener('change', e => {
        pk.charId = e.target.value;
        pkWriteUrl(true);
        pkFromUrl();
        render();
    });
    document.getElementById('cc-paper').addEventListener('change', e => { pk.paper = e.target.value === 'a4' ? 'a4' : 'letter'; });
    document.getElementById('cc-backs').addEventListener('change', e => { pk.backs = e.target.checked; });
    document.getElementById('cc-print-btn').addEventListener('click', pkPrint);
    window.addEventListener('popstate', () => { pkFromUrl(); render(); });
    window.addEventListener('storage', e => {
        if (e.key !== PC_KEY) return;
        pkCache.clear();
        pkFromUrl();
        render();
    });
});
