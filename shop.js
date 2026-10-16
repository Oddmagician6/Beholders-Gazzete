/* ============================================
   MERCHANT'S ROW: shop generator page
   Rolling and pricing live in shop-engine.js; this file only draws the page.
   The URL (?type=&wealth=&seed=) rebuilds the shop via rng.js; prices stay live.
   ============================================ */

const SHOP_KEY = 'gazette-shop';

let shop = null;
let priceTimer = null;
let haggleBonus = 0; // remembered between shops

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function setStatus(msg) {
    const el = document.getElementById('shop-status');
    el.textContent = msg;
    clearTimeout(setStatus.timer);
    if (msg) setStatus.timer = setTimeout(() => { el.textContent = ''; }, 2500);
}

// ── Storage (this browser only) ───────────────────────────
function saveShop() {
    const options = { type: document.getElementById('shop-type').value, wealth: document.getElementById('shop-wealth').value, bonus: haggleBonus };
    try { localStorage.setItem(SHOP_KEY, JSON.stringify({ shop, options })); } catch (e) {}
}

function loadShop() {
    try {
        const saved = JSON.parse(localStorage.getItem(SHOP_KEY));
        if (!saved) return;
        if (saved.shop && SHOP_TYPES[saved.shop.type] && SHOP_WEALTH[saved.shop.wealth]) shop = saved.shop;
        if (saved.options && Number.isInteger(saved.options.bonus)) haggleBonus = saved.options.bonus;
        ['type', 'wealth'].forEach(k => {
            const el = document.getElementById('shop-' + k);
            const v = saved.options && saved.options[k];
            if (v && [...el.options].some(o => o.value === v)) el.value = v;
        });
    } catch (e) {}
}

// ── Render ────────────────────────────────────────────────
function changeHTML(pct) {
    if (pct > 0) return `<span class="up">▲ ${pct}%</span>`;
    if (pct < 0) return `<span class="down">▼ ${Math.abs(pct)}%</span>`;
    return '<span class="flat">0%</span>';
}

function keeperHTML(k) {
    const hair = shopKeeperHair(k);
    return `<div class="keeper">
        <h2 class="shop-h">Shopkeeper</h2>
        <div class="keeper-title">
            <span class="keeper-icon" aria-hidden="true">${npcFaceHtml(k)}</span>
            <div>
                <div class="keeper-name">${esc(k.name)}</div>
                <div class="keeper-sub">${esc(cap(k.race))} · ${esc(k.age)} · ${esc(k.profession)}</div>
            </div>
        </div>
        <p class="keeper-greeting">"${esc(shop.greeting)}"</p>
        <span class="shop-label">Looks</span>
        <p>${[k.build, hair, `${k.eyes} eyes`, k.feature].map(esc).join(' · ')}</p>
        <span class="shop-label">Trait · Flaw</span>
        <p>${esc(k.trait)} · ${esc(k.flaw)}</p>
        <span class="shop-label">Voice</span>
        <p>${esc(k.voice)}</p>
        <span class="shop-label">Wisdom · Charisma</span>
        <p>WIS ${k.stats.wis} · CHA ${k.stats.cha}</p>
        <span class="shop-label">Secret</span>
        <p>${esc(k.secret)}</p>
    </div>`;
}

// The place, services, buying, sale, sold out, and a job (shop-engine.js). Older saved shops have none.
function aboutHTML() {
    const lines = shopDetailLines(shop);
    if (!lines.length) return '';
    return `<section class="shop-about">
        <h2 class="shop-h">About the Shop</h2>
        <dl>${lines.map(([label, text]) => `<div class="about-row${label === 'Ask about' ? ' about-job' : ''}"><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl>
    </section>`;
}

function haggleHTML() {
    const h = shop.haggle;
    const result = h ? `${esc(h.outcome)}<span class="dice">${esc(haggleDiceText(h))}</span>` : '';
    return `<div class="haggle">
        <h2 class="shop-h">🤝 Haggle</h2>
        <div class="haggle-row">
            <label for="haggle-bonus">Your Persuasion bonus</label>
            <input type="number" id="haggle-bonus" value="${h ? h.bonus : haggleBonus}" min="-5" max="20" step="1" ${h ? 'disabled' : ''}>
            <button type="button" class="btn" id="haggle-btn" ${h ? 'disabled' : ''}>🎲 Roll to Haggle</button>
        </div>
        <p class="haggle-result" id="haggle-result">${result}</p>
        ${h ? '<p class="stock-note">One haggle per shop. Roll a new shop to try your luck again.</p>' : '<p class="stock-note">d20 + your bonus against the shopkeeper\'s Wisdom. One try per shop.</p>'}
    </div>`;
}

function render() {
    const card = document.getElementById('shop-card');
    if (!shop) { card.innerHTML = '<p class="muted">The shutters creak open…</p>'; return; }
    const def = SHOP_TYPES[shop.type];
    const rows = shopPrices(shop).map(p => `<tr>
            <td class="item">${esc(p.name)}${p.sale ? ' <span class="sale-tag">Sale</span>' : ''}</td>
            <td class="num">${p.qty > 1 ? '×' + p.qty : '1'}</td>
            <td class="num price">${wasPrice(p) ? `<s class="was">${formatCoins(p.listPrice)}</s>` : ''}${formatCoins(p.price)}</td>
            <td class="num chg">${changeHTML(p.change)}</td>
        </tr>`).join('');
    const mins = Math.max(1, Math.round(msToNextPriceBell() / 60000));
    const art = `img/shop/${shop.type}`;
    card.innerHTML = `<div class="shop-art" aria-hidden="true"><img src="${art}.webp" srcset="${art}-sm.webp 480w, ${art}.webp 960w" sizes="(max-width: 1000px) 100vw, 960px" alt="" width="960" height="640" decoding="async"></div>
        <header class="shop-sign">
            <div class="shop-sign-icon" aria-hidden="true">${def.icon}</div>
            <h2 class="shop-name">${esc(shop.name)}</h2>
            <div class="shop-sub">${esc(def.label)} · ${esc(SHOP_WEALTH[shop.wealth].label)}</div>
            <p class="shop-quirk">${esc(shop.quirk)}</p>
        </header>
        <div class="shop-grid">
            ${keeperHTML(shop.keeper)}
            <div>
                <h2 class="shop-h">For Sale</h2>
                <table class="stock">
                    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num chg">24h</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <p class="stock-note">Live from the <a href="economy">Market Exchange</a>${shop.wealth === 'wealthy' ? ', plus a prosperous-shop markup' : shop.wealth === 'poor' ? ', minus a humble-shop discount' : ''}. Next price bell in ${mins} min.</p>
                ${haggleHTML()}
            </div>
        </div>
        ${aboutHTML()}`;
    const btn = document.getElementById('haggle-btn');
    if (btn) btn.addEventListener('click', haggle);
    schedulePriceBell();
}

// Re-price when the market's 15-minute bell rings.
function schedulePriceBell() {
    clearTimeout(priceTimer);
    priceTimer = setTimeout(() => { render(); setStatus('🔔 The market bell rang. Prices updated.'); }, msToNextPriceBell() + 500);
}

// ── Shareable URL ─────────────────────────────────────────
// The picker values (which may be "random") plus the seed rebuild the same shop.
function shopParams() {
    if (!shop || !shop.seed) return {};
    const p = { seed: shop.seed };
    ['type', 'wealth'].forEach(k => {
        const el = document.getElementById('shop-' + k);
        if (shop.rolledWith[k] !== defaultValue(el)) p[k] = shop.rolledWith[k];
    });
    return p;
}

// Rebuild the shop from the address bar. Returns false when there's no seed in it.
function applyUrl() {
    const p = urlParams();
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    ['type', 'wealth'].forEach(k => {
        const el = document.getElementById('shop-' + k);
        if (!setFieldValue(el, p.get(k))) el.value = defaultValue(el);
    });
    const opts = { type: document.getElementById('shop-type').value, wealth: document.getElementById('shop-wealth').value };
    // Same shop as the saved one? Keep it, haggle and all.
    if (!(shop && shop.seed === seed && shop.rolledWith && shop.rolledWith.type === opts.type && shop.rolledWith.wealth === opts.wealth)) {
        shop = { ...withSeed(seed, () => rollShop(opts)), seed, rolledWith: opts };
    }
    return true;
}

function copyLink() {
    if (!shop || !shop.seed) { setStatus('This shop was rolled before shareable links. Roll a new one to share it.'); return; }
    copyPageLink(ok => setStatus(ok ? '🔗 Link copied. It opens this shop and its stock, at the market\'s prices of the moment.' : 'Copy failed. Your browser blocked clipboard access.'));
}

// ── Actions ───────────────────────────────────────────────
// push: false on the first visit, so the page doesn't start with an empty history entry.
function roll(push = true) {
    const opts = { type: document.getElementById('shop-type').value, wealth: document.getElementById('shop-wealth').value };
    const seed = newSeed();
    shop = { ...withSeed(seed, () => rollShop(opts)), seed, rolledWith: opts };
    render();
    saveShop();
    setUrlParams(shopParams(), push);
    document.getElementById('shop-card').animate?.([{ opacity: 0.2 }, { opacity: 1 }], { duration: 300 });
}

function haggle() {
    if (!shop || shop.haggle) return;
    haggleBonus = Math.max(-5, Math.min(20, parseInt(document.getElementById('haggle-bonus').value, 10) || 0));
    shop.haggle = rollHaggle(shop, haggleBonus);
    render();
    saveShop();
}

function copyShop() {
    if (!shop) return;
    const text = ['SHOP · The Beholder\'s Gazette', '', ...shopTextLines(shop)].join('\n');
    navigator.clipboard.writeText(text)
        .then(() => setStatus('📋 Shop copied. Paste it into your session notes.'))
        .catch(() => setStatus('Copy failed. Your browser blocked clipboard access.'));
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    const typeSel = document.getElementById('shop-type');
    Object.entries(SHOP_TYPES).forEach(([k, t]) => typeSel.add(new Option(`${t.icon} ${t.label}`, k)));
    const wealthSel = document.getElementById('shop-wealth');
    Object.entries(SHOP_WEALTH).forEach(([k, w]) => wealthSel.add(new Option(w.label, k)));

    loadShop();
    document.getElementById('roll-shop').addEventListener('click', () => roll());
    document.getElementById('copy-shop').addEventListener('click', copyShop);
    document.getElementById('copy-link').addEventListener('click', copyLink);
    // The Handout Maker (F48) rebuilds this shop from its link as a price list.
    document.getElementById('shop-handout').addEventListener('click', () => {
        if (!shop || !shop.seed) { setStatus('This shop was rolled before shareable links. Roll a new one to make a handout.'); return; }
        location.href = 'handouts?' + paramsQuery({ t: 'prices', from: 'shop', ...shopParams() });
    });
    [typeSel, wealthSel].forEach(el => el.addEventListener('change', () => roll()));

    // A shared link wins over the saved shop.
    if (applyUrl() || shop) {
        render();
        saveShop();
        setUrlParams(shopParams(), false);
    } else {
        roll(false);
    }

    // Back/Forward step through earlier shops (haggles aren't replayed).
    window.addEventListener('popstate', () => {
        if (!applyUrl()) return;
        render();
        saveShop();
    });
});
