/* ============================================
   DM SESSION KIT
   A crier headline, one rumor, one NPC, one loot roll, and a shop on a page.
   Rollers: npc-data.js (rollNPC), loot-engine.js (rollTreasure), rumors.json (dealt by rumor-deck.js),
   town-crier.js (articles.json), shop-engine.js (rollShop, live market prices).
   Seeds and the shareable URL: rng.js.
   ============================================ */

const KIT_KEY = 'gazette-session-kit';
const OPTION_IDS = ['rumor-category', 'npc-race', 'npc-profession', 'loot-kind', 'loot-cr', 'shop-type', 'shop-wealth'];
const KIT_SHOP_ROWS = 10; // the full list lives on Merchant's Row

const RUMOR_CATEGORIES = {
    local: '🏘️ Local Gossip',
    politics: '👑 Politics',
    economics: '💰 Economics',
    adventures: '⚔️ Adventures',
    monsters: '🐉 Monsters',
    magic: '✨ Magic & Weird'
};

let rumorPool = [];
let crier = { pool: [], edition: null };
let kit = { crier: null, rumor: null, rumorIdx: null, npc: null, loot: null, shop: null, seeds: {}, locks: [], options: {} };

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const opt = id => document.getElementById(id).value;

function setStatus(msg) {
    const el = document.getElementById('kit-status');
    el.textContent = msg;
    clearTimeout(setStatus.timer);
    if (msg) setStatus.timer = setTimeout(() => { el.textContent = ''; }, 2500);
}

// ── Storage (this browser only) ───────────────────────────
function saveKit() {
    kit.options = Object.fromEntries(OPTION_IDS.map(id => [id, opt(id)]));
    try { localStorage.setItem(KIT_KEY, JSON.stringify(kit)); } catch (e) {}
}

function loadKit() {
    try {
        const saved = JSON.parse(localStorage.getItem(KIT_KEY));
        if (saved && typeof saved === 'object') {
            kit = { ...kit, ...saved, seeds: { ...(saved.seeds || {}) } };
            kit.locks = Array.isArray(saved.locks) ? saved.locks.filter(p => p in ROLLERS) : [];
        }
    } catch (e) {}
    OPTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        const v = kit.options && kit.options[id];
        if (v && [...el.options].some(o => o.value === v)) el.value = v;
    });
}

// ── Rolls ─────────────────────────────────────────────────
// NPC, loot, and shop roll from a seed (rng.js), and the rumor and crier are kept by
// index/id, so the URL can rebuild the whole kit. Pass a seed/id to replay a roll.
const SEEDED = ['npc', 'loot', 'shop'];

function rollCrier(id) {
    const pick = (id && crierById(crier.pool, id)) || pickCrier(crier.pool, kit.crier && kit.crier.id);
    if (pick) kit.crier = { ...pick, edition: crier.edition };
}

function rollRumor(idx) {
    if (!rumorPool.length) return;
    if (!rumorPool[idx]) {
        // Deal from the same per-category deck as the Tavern (rumor-deck.js): no repeats until it runs out.
        idx = dealRumor(rumorPool, rumorPool.length, opt('rumor-category'), kit.rumorIdx ?? -1).idx;
        if (idx < 0) return;
    }
    kit.rumor = rumorPool[idx];
    kit.rumorIdx = idx;
}

function rollKitNPC(seed = newSeed()) {
    kit.seeds.npc = seed;
    kit.npc = withSeed(seed, () => rollNPC({ race: opt('npc-race'), professionType: opt('npc-profession') }));
}

function rollKitLoot(seed = newSeed()) {
    kit.seeds.loot = seed;
    kit.loot = { kind: opt('loot-kind'), cr: opt('loot-cr'), ...withSeed(seed, () => rollTreasure(opt('loot-kind'), opt('loot-cr'))) };
}

function rollKitShop(seed = newSeed()) {
    kit.seeds.shop = seed;
    kit.shop = withSeed(seed, () => rollShop({ type: opt('shop-type'), wealth: opt('shop-wealth') }));
}

const ROLLERS = { crier: rollCrier, rumor: rollRumor, npc: rollKitNPC, loot: rollKitLoot, shop: rollKitShop };

function reroll(part) {
    ROLLERS[part]();
    render(part);
    saveKit();
    syncUrl(true);
}

// Roll Everything skips locked panels.
function rollAll() {
    const parts = Object.keys(ROLLERS).filter(part => !kit.locks.includes(part));
    if (!parts.length) { setStatus('Every panel is locked. Unlock one to reroll it.'); return; }
    parts.forEach(part => ROLLERS[part]());
    parts.forEach(render);
    saveKit();
    syncUrl(true);
}

// ── Locks (kept in the saved kit, not the URL: the URL already pins every panel) ──
const PANEL_OPTIONS = { rumor: ['rumor-category'], npc: ['npc-race', 'npc-profession'], loot: ['loot-kind', 'loot-cr'], shop: ['shop-type', 'shop-wealth'] };

function renderLocks() {
    document.querySelectorAll('.kit-lock').forEach(btn => {
        const part = btn.dataset.lock, on = kit.locks.includes(part);
        btn.setAttribute('aria-pressed', on);
        btn.textContent = on ? '🔒' : '🔓';
        btn.title = on ? 'Unlock this panel' : 'Lock this panel: Roll Everything keeps it';
        document.querySelector(`.kit-reroll[data-roll="${part}"]`).disabled = on;
        (PANEL_OPTIONS[part] || []).forEach(id => { document.getElementById(id).disabled = on; });
    });
}

function toggleLock(part) {
    kit.locks = kit.locks.includes(part) ? kit.locks.filter(p => p !== part) : [...kit.locks, part];
    renderLocks();
    saveKit();
}

// ── Shareable URL ─────────────────────────────────────────
// ?crier=<article id>&rumor=<index>&npc=<seed>&loot=<seed>&shop=<seed>, plus any option
// that isn't at its default. Panels saved before seeds existed are left out.
function kitParams() {
    const p = {};
    OPTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (fieldValue(el) !== defaultValue(el)) p[id] = el.value;
    });
    if (kit.crier) p.crier = kit.crier.id;
    if (kit.rumor && rumorPool[kit.rumorIdx] && rumorPool[kit.rumorIdx].text === kit.rumor.text) p.rumor = kit.rumorIdx;
    SEEDED.forEach(k => { if (kit[k] && kit.seeds[k]) p[k] = kit.seeds[k]; });
    return p;
}

function syncUrl(push) {
    setUrlParams(kitParams(), push);
}

// Rebuild the kit from the address bar. Returns false when the URL holds no kit.
function applyUrl(p) {
    if (![...OPTION_IDS, 'crier', 'rumor', ...SEEDED].some(k => p.has(k))) return false;
    OPTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(id))) el.value = defaultValue(el);
    });
    kit.crier = null;
    kit.rumor = null;
    rollCrier(p.get('crier'));
    rollRumor(/^\d+$/.test(p.get('rumor') || '') ? Number(p.get('rumor')) : -1);
    SEEDED.forEach(k => ROLLERS[k](parseSeed(p.get(k)) || undefined));
    return true;
}

function copyLink() {
    const old = SEEDED.some(k => kit[k] && !kit.seeds[k]);
    copyPageLink(ok => setStatus(!ok ? 'Copy failed. Your browser blocked clipboard access.'
        : old ? '🔗 Link copied. Some panels were rolled before shareable links; reroll them to include them.'
        : '🔗 Link copied. Anyone who opens it gets this exact kit.'));
}

// ── Render ────────────────────────────────────────────────
function render(part) {
    const out = document.getElementById(part + '-out');
    const html = { crier: crierHTML, rumor: rumorHTML, npc: npcHTML, loot: lootHTML, shop: shopHTML }[part]();
    if (html) out.innerHTML = html;
    out.animate?.([{ opacity: 0.2 }, { opacity: 1 }], { duration: 300 });
}

function truthText(truth) {
    return truth === null || truth === undefined ? 'Truth: unknown (roll Investigation)' : `Truth: ${truth}%`;
}

function crierHTML() {
    const c = kit.crier;
    if (!c) return crier.pool.length ? '' : '<p class="muted">The crier has lost their voice. Headlines failed to load; try refreshing.</p>';
    return `<p class="crier-shout"><span class="crier-opener">${esc(c.opener)}</span>
        <a href="${crierHref(c.id)}">${esc(c.title)}</a></p>
        <div class="kit-tags"><span class="kit-tag">📰 ${esc(c.category)}</span></div>`;
}

function rumorHTML() {
    const r = kit.rumor;
    if (!r) return rumorPool.length ? '' : '<p class="muted">The tavern is quiet. Rumors failed to load; try refreshing.</p>';
    return `<p class="rumor-quote">"${esc(r.text)}"</p>
        <div class="kit-tags">
            <span class="kit-tag">${RUMOR_CATEGORIES[r.category] || esc(r.category)}</span>
            <span class="kit-tag">${truthText(r.truth)}</span>
        </div>
        ${r.followup ? `<details class="rumor-next"><summary>📜 What happened next…</summary><p>${esc(r.followup)}</p></details>` : ''}`;
}

function hairText(n) {
    return n.hairLabel === 'Scales' || n.hair === 'Bald' ? n.hair : `${n.hair} hair`;
}

function npcHTML() {
    const n = kit.npc;
    if (!n) return '';
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha']
        .map(k => `<div>${k.toUpperCase()}<b>${n.stats[k]}</b></div>`).join('');
    const hair = hairText(n);
    return `<div class="npc-title">
            <span class="npc-icon" aria-hidden="true">${n.portraitIcon}</span>
            <div>
                <div class="npc-name">${esc(n.name)}</div>
                <div class="npc-sub">${esc(cap(n.race))} · ${esc(n.age)} · ${esc(n.profession)}</div>
            </div>
        </div>
        <div class="npc-stats">${stats}</div>
        <div class="npc-combat">❤️ HP ${n.hp} · 🛡️ AC ${n.ac} · 👟 ${esc(n.speed)}</div>
        <span class="kit-label">Looks</span>
        <p>${[n.build, hair, `${n.eyes} eyes`, n.feature].map(esc).join(' · ')}</p>
        <span class="kit-label">Trait · Flaw</span>
        <p>${esc(n.trait)} · ${esc(n.flaw)}</p>
        <span class="kit-label">Voice</span>
        <p>${esc(n.voice)}. <em>"${esc(n.dialogue)}"</em></p>
        <span class="kit-label">Secret</span>
        <p>${esc(n.secret)}</p>
        <span class="kit-label">Hook</span>
        <p>${esc(n.questHook)}</p>`;
}

function lootValue(l) {
    const priceless = l.magic.some(m => m.rarity === 'artifact');
    if (priceless && !l.totalValue) return 'Priceless';
    return `${l.totalValue.toLocaleString()} gp${priceless ? ' + priceless' : ''}`;
}

function lootHTML() {
    const l = kit.loot;
    if (!l) return '';
    const coins = Object.entries(l.coins).filter(([, v]) => v > 0)
        .map(([t, v]) => `${lootData.coins[t].icon} ${v.toLocaleString()} ${t}`).join(' · ');
    const valuables = [...l.gems, ...l.art]
        .map(i => `<li><span>${esc(i.name)}</span><span class="val">${i.value.toLocaleString()} gp</span></li>`).join('');
    // SRD items (magic-items-data.js) open to their text; the rest are name-only.
    const magic = l.magic.map(m => {
        const row = `<span>${esc(m.name)}${m.attune ? ' <span class="val">(attunement)</span>' : ''}</span><span class="rarity rarity-${m.rarity}">${m.rarity.replace('-', ' ')}</span>`;
        const info = magicItemInfo(m.name);
        if (!info) return `<li>${row}</li>`;
        return `<li class="magic-li"><details><summary>${row}</summary>
            <div class="item-desc"><p class="item-srd-type">${esc(info.meta)}</p>${formatSrdText(info.text)}</div></details></li>`;
    }).join('');
    const kind = l.kind === 'hoard' ? 'Treasure hoard' : 'Pocket loot';
    return `<div class="loot-total">${lootValue(l)}</div>
        <div class="npc-sub">${kind}, CR ${esc(l.cr)}</div>
        <span class="kit-label">Coins</span>
        <p>${coins || '<span class="muted">Not a copper.</span>'}</p>
        ${valuables ? `<span class="kit-label">Gems &amp; art</span><ul class="loot-list">${valuables}</ul>` : ''}
        ${magic ? `<span class="kit-label">Magic items</span><ul class="loot-list">${magic}</ul>` : ''}`;
}

function shopHTML() {
    const s = kit.shop;
    if (!s) return '';
    const def = SHOP_TYPES[s.type], k = s.keeper;
    const prices = shopPrices(s);
    const rows = prices.slice(0, KIT_SHOP_ROWS).map(p =>
        `<li><span>${esc(p.name)}${p.qty > 1 ? ` <span class="val">×${p.qty}</span>` : ''}</span><span class="val">${formatCoins(p.price)}</span></li>`).join('');
    const more = prices.length > KIT_SHOP_ROWS ? `<p class="muted">…and ${prices.length - KIT_SHOP_ROWS} more on the shelves.</p>` : '';
    return `<div class="shop-head">
            <div>
                <div class="npc-name">${def.icon} ${esc(s.name)}</div>
                <div class="npc-sub">${esc(def.label)} · ${esc(SHOP_WEALTH[s.wealth].label)}</div>
                <span class="kit-label">Shopkeeper</span>
                <p>${k.portraitIcon} <b>${esc(k.name)}</b>, ${esc(cap(k.race))} ${esc(k.profession)}. ${esc(k.trait)}.</p>
                <p><em>"${esc(s.greeting)}"</em></p>
                <span class="kit-label">Quirk</span>
                <p>${esc(s.quirk)}</p>
            </div>
            <div>
                <span class="kit-label">For sale (live market prices)</span>
                <ul class="loot-list shop-list">${rows}</ul>
                ${more}
            </div>
        </div>`;
}

// ── Copy as text ──────────────────────────────────────────
function kitText() {
    const lines = ['DM SESSION KIT · The Beholder\'s Gazette', ''];
    const c = kit.crier, r = kit.rumor, n = kit.npc, l = kit.loot;
    if (c) {
        lines.push('TOWN CRIER', `${c.opener} ${c.title}`, `(${new URL(crierHref(c.id), location.href).href})`, '');
    }
    if (r) {
        lines.push('RUMOR', `"${r.text}"`, `${(RUMOR_CATEGORIES[r.category] || r.category).replace(/^\S+\s/, '')} · ${truthText(r.truth)}`);
        if (r.followup) lines.push(`What happened next: ${r.followup}`);
        lines.push('');
    }
    if (n) {
        const s = n.stats;
        lines.push(
            'NPC', `${n.name}: ${cap(n.race)}, ${n.age}, ${n.profession}`,
            `STR ${s.str} | DEX ${s.dex} | CON ${s.con} | INT ${s.int} | WIS ${s.wis} | CHA ${s.cha}`,
            `HP ${n.hp} | AC ${n.ac} | Speed ${n.speed}`,
            `Looks: ${n.build} · ${hairText(n)} · ${n.eyes} eyes · ${n.feature}`,
            `Trait: ${n.trait} · Flaw: ${n.flaw}`,
            `Voice: ${n.voice}. "${n.dialogue}"`,
            `Secret: ${n.secret}`,
            `Hook: ${n.questHook}`, ''
        );
    }
    if (l) {
        lines.push(`LOOT (${l.kind === 'hoard' ? 'hoard' : 'pocket'}, CR ${l.cr}): ${lootValue(l)}`);
        const coins = Object.entries(l.coins).filter(([, v]) => v > 0).map(([t, v]) => `${v.toLocaleString()} ${t}`).join(', ');
        if (coins) lines.push(`Coins: ${coins}`);
        [...l.gems, ...l.art].forEach(i => lines.push(`- ${i.name} (${i.value} gp)`));
        l.magic.forEach(m => lines.push(`- ${m.name} [${m.rarity}]${m.attune ? ' (attunement)' : ''}`));
        lines.push('');
    }
    if (kit.shop) lines.push('SHOP', ...shopTextLines(kit.shop, KIT_SHOP_ROWS));
    return lines.join('\n').trim();
}

function copyKit() {
    navigator.clipboard.writeText(kitText())
        .then(() => setStatus('📋 Kit copied. Paste it into your session notes.'))
        .catch(() => setStatus('Copy failed. Your browser blocked clipboard access.'));
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    loadKit();

    document.getElementById('roll-all').addEventListener('click', rollAll);
    document.getElementById('copy-kit').addEventListener('click', copyKit);
    document.getElementById('copy-link').addEventListener('click', copyLink);
    document.querySelectorAll('.kit-lock').forEach(btn =>
        btn.addEventListener('click', () => toggleLock(btn.dataset.lock)));
    renderLocks();
    document.querySelectorAll('.kit-reroll').forEach(btn =>
        btn.addEventListener('click', () => reroll(btn.dataset.roll)));
    // Changing a panel's options rerolls just that panel.
    const panelOf = { 'rumor-category': 'rumor', 'npc-race': 'npc', 'npc-profession': 'npc', 'loot-kind': 'loot', 'loot-cr': 'loot', 'shop-type': 'shop', 'shop-wealth': 'shop' };
    OPTION_IDS.forEach(id => document.getElementById(id).addEventListener('change', () => reroll(panelOf[id])));

    const [rumors, headlines] = await Promise.allSettled([
        fetch('rumors.json').then(r => r.json()),
        loadCrierPool()
    ]);
    if (rumors.status === 'fulfilled') rumorPool = rumors.value.rumors || [];
    else console.error('Error loading rumors:', rumors.reason);
    if (headlines.status === 'fulfilled') crier = headlines.value;
    else console.error('Error loading headlines:', headlines.reason);

    // Older saves kept the rumor without its index.
    if (kit.rumor && !(rumorPool[kit.rumorIdx] && rumorPool[kit.rumorIdx].text === kit.rumor.text)) {
        kit.rumorIdx = rumorPool.findIndex(r => r.text === kit.rumor.text);
    }
    // Saves from before rumor chains (F19) lack the follow-up; take the current entry.
    if (kit.rumor && rumorPool[kit.rumorIdx]) kit.rumor = rumorPool[kit.rumorIdx];

    // A shared link wins over the saved kit.
    if (!applyUrl(urlParams())) {
        // First visit (or nothing saved): roll a fresh kit.
        if (!kit.npc) rollKitNPC();
        if (!kit.loot) rollKitLoot();
        if (!kit.shop || !SHOP_TYPES[kit.shop.type]) rollKitShop();
        if (!kit.rumor) rollRumor();
        // A new edition (or a vanished article) brings a fresh headline.
        if (crier.pool.length && (!kit.crier || kit.crier.edition !== crier.edition || !crier.pool.some(a => a.id === kit.crier.id))) {
            kit.crier = null;
            rollCrier();
        }
    }
    Object.keys(ROLLERS).forEach(render);
    saveKit();
    syncUrl(false);

    // Back/Forward step through rerolls.
    window.addEventListener('popstate', () => {
        if (!applyUrl(urlParams())) return;
        Object.keys(ROLLERS).forEach(render);
        saveKit();
    });

    // Shop prices follow the market's 15-minute bell.
    (function bell() {
        setTimeout(() => { render('shop'); bell(); }, msToNextPriceBell() + 500);
    })();
});
