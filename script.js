/* ============================================================
   THE BEHOLDER'S GAZETTE — HOMEPAGE SCRIPT
   Loads articles.json, renders featured + grid, sidebar economy
   ============================================================ */

console.log('%c👁️ The Beholder\'s Gazette', 'font-family:serif;font-size:18px;color:#d4a843;background:#0e0d0b;padding:8px 16px;');

let allArticles = [];
let displayedCount = 6;

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setYear();
  setDateBanner();
  loadArticles();
  renderEconomySidebar();
  startEconomyUpdates();
});

function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

function setDateBanner() {
  const el = document.getElementById('date-banner');
  if (!el) return;
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const edition = Math.floor(Math.random() * 9000 + 1000);
  el.textContent = new Date().toLocaleDateString('en-US', opts) + ' · Edition #' + edition;
}

/* ── ARTICLE LOADING ─────────────────────────────────────── */
async function loadArticles() {
  try {
    const res = await fetch('articles.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    const articles = (data.articles || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!articles.length) throw new Error('No articles found');

    const featured = articles[0];
    allArticles = articles.slice(1);
    displayedCount = 6;

    renderFeatured(featured);
    renderGrid();

  } catch (err) {
    console.error('Failed to load articles:', err);
    const grid = document.getElementById('article-grid');
    const feat = document.getElementById('featured-article');
    if (feat) feat.innerHTML = errorBox('Could not load the latest scroll. The messenger raven may have been eaten.<br><small>' + err.message + '</small>');
    if (grid) grid.innerHTML = '';
  }
}

function renderFeatured(article) {
  const el = document.getElementById('featured-article');
  if (!el || !article) return;

  el.innerHTML = `
    <div class="featured-article">
      <div>
        <span class="category-badge">${article.category || 'News'}</span>
      </div>
      <h1 class="featured-headline">
        <a href="article.html?id=${article.id}" style="color:inherit;">${article.title}</a>
      </h1>
      <div class="article-meta">
        <span>✍️ <strong>${article.author || 'The Gazette Staff'}</strong></span>
        <span>📅 ${formatDate(article.date)}</span>
        <span>⏱️ ${readTime(article.content)} min read</span>
      </div>
      <div class="featured-content">
        ${article.excerpt || stripTags(article.content).substring(0, 280) + '…'}
      </div>
      <a href="article.html?id=${article.id}" class="btn">📜 Read Full Scroll</a>
    </div>
  `;
}

function renderGrid() {
  const el = document.getElementById('article-grid');
  if (!el) return;

  const visible = allArticles.slice(0, displayedCount);

  if (!visible.length) {
    el.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:40px;grid-column:1/-1;">No more scrolls in the archives.</p>';
    return;
  }

  el.innerHTML = visible.map((a, i) => `
    <article class="card" style="animation-delay:${i * 0.08}s">
      <div class="card-tag">${a.category || 'News'}</div>
      <h3><a href="article.html?id=${a.id}">${a.title}</a></h3>
      <p>${a.excerpt || stripTags(a.content).substring(0, 110) + '…'}</p>
      <div class="card-date">📅 ${formatDate(a.date)}</div>
      <a href="article.html?id=${a.id}" class="btn" style="font-size:0.68rem;padding:7px 14px;margin-top:14px;">📜 Read Scroll</a>
    </article>
  `).join('');

  // Load More button
  const existing = el.querySelector('.load-more-wrap');
  if (existing) existing.remove();

  if (displayedCount < allArticles.length) {
    const wrap = document.createElement('div');
    wrap.className = 'load-more-wrap';
    wrap.style.cssText = 'grid-column:1/-1;text-align:center;padding:36px 20px;';
    wrap.innerHTML = `
      <p style="color:var(--text-dim);font-style:italic;margin-bottom:16px;font-size:0.9rem;">
        ${allArticles.length - displayedCount} older scrolls in the archives
      </p>
      <button class="btn btn-gold" onclick="loadMore()" style="font-size:0.9rem;padding:12px 36px;">
        📜 Load More Articles
      </button>
    `;
    el.appendChild(wrap);
  }
}

function loadMore() {
  displayedCount += 6;
  renderGrid();
  document.querySelector('.load-more-wrap')?.scrollIntoView({ behavior:'smooth', block:'center' });
}

/* ── ECONOMY SIDEBAR ─────────────────────────────────────── */
const MARKET_ITEMS = [
  { name:'🍞 Bread (loaf)',       base:2,   unit:'cp' },
  { name:'🧪 Healing Potion',     base:50,  unit:'gp' },
  { name:'⚔️ Iron Sword',         base:15,  unit:'gp' },
  { name:'🐴 Riding Horse',       base:75,  unit:'gp' },
  { name:'🪄 Spell Components',   base:25,  unit:'gp' },
  { name:'🍺 Tavern Ale (pint)',   base:4,   unit:'cp' },
  { name:'🧲 Adventurers Rope',   base:1,   unit:'gp' },
  { name:'🏹 Quiver of Arrows',   base:5,   unit:'gp' },
];

let marketState = MARKET_ITEMS.map(i => ({ ...i, price: i.base, prev: i.base }));

function jiggleMarket() {
  marketState = marketState.map(item => {
    const prev = item.price;
    const change = (Math.random() - 0.46) * item.base * 0.12;
    const price = Math.max(1, +(item.price + change).toFixed(1));
    return { ...item, price, prev };
  });
}

function renderEconomySidebar() {
  const el = document.getElementById('economy-sidebar');
  if (!el) return;

  const rows = marketState.map(item => {
    const dir = item.price > item.prev ? 'up' : item.price < item.prev ? 'down' : 'stable';
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
    const diff = (item.price - item.base).toFixed(1);
    const pct = ((item.price / item.base - 1) * 100).toFixed(0);
    return `
      <div class="economy-item price-${dir !== 'stable' ? dir : ''}">
        <div class="item-name">${item.name}</div>
        <div class="item-price">
          ${item.price} ${item.unit}
          <span class="price-change ${dir}">${arrow} ${Math.abs(pct)}%</span>
        </div>
      </div>`;
  }).join('');

  const bullish = marketState.filter(i => i.price > i.prev).length;
  const trend = bullish >= 5 ? 'up' : bullish <= 2 ? 'down' : 'stable';
  const trendLabel = trend === 'up' ? 'Bullish Market' : trend === 'down' ? 'Bearish Market' : 'Stable Trading';

  el.innerHTML = `
    <div class="economy-header">
      <span class="economy-title">💰 Realm Market Watch</span>
      <button class="refresh-btn" onclick="refreshMarket()">⟳ Refresh</button>
    </div>
    <div class="economy-grid">${rows}</div>
    <div class="market-trend">
      <span class="trend-indicator trend-${trend}"></span>
      ${trendLabel} · Updated just now
    </div>
  `;
}

function refreshMarket() {
  jiggleMarket();
  renderEconomySidebar();
}

function startEconomyUpdates() {
  jiggleMarket();
  renderEconomySidebar();
  setInterval(() => {
    jiggleMarket();
    renderEconomySidebar();
  }, 30000);
}

/* ── HELPERS ─────────────────────────────────────────────── */
function formatDate(str) {
  if (!str) return 'Unknown Date';
  return new Date(str).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function stripTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function readTime(html) {
  const words = stripTags(html || '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function errorBox(msg) {
  return `<div style="background:var(--bg-card);border:var(--border-gold);border-radius:var(--radius-md);padding:40px;text-align:center;color:var(--text-dim);">
    <p style="font-size:2rem;margin-bottom:16px;">📜</p>
    <p>${msg}</p>
  </div>`;
}
