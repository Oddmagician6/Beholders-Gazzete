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
        <a href="a/${article.id}.html" style="color:inherit;">${article.title}</a>
      </h1>
      <div class="article-meta">
        <span>✍️ <strong>${article.author || 'The Gazette Staff'}</strong></span>
        <span>📅 ${formatDate(article.date)}</span>
        <span>⏱️ ${readTime(article.content)} min read</span>
      </div>
      <div class="featured-content">
        ${article.excerpt || stripTags(article.content).substring(0, 280) + '…'}
      </div>
      <a href="a/${article.id}.html" class="btn">📜 Read Full Scroll</a>
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
      <h3><a href="a/${a.id}.html">${a.title}</a></h3>
      <p>${a.excerpt || stripTags(a.content).substring(0, 110) + '…'}</p>
      <div class="card-date">📅 ${formatDate(a.date)}</div>
      <a href="a/${a.id}.html" class="btn" style="font-size:0.68rem;padding:7px 14px;margin-top:14px;">📜 Read Scroll</a>
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
// A few headline items from the Realm Market Exchange (market-data.js), same prices as economy.html.
const SIDEBAR_ITEMS = [
  ['bread-loaf',             '🍞'],
  ['potion-of-healing',      '🧪'],
  ['longsword',              '⚔️'],
  ['horse-riding',           '🐴'],
  ['component-pouch',        '🪄'],
  ['ale-gallon',             '🍺'],
  ['rope-hempen-50-feet',    '🪢'],
  ['arrows-20',              '🏹'],
];

let sidebarSlot = null;

function renderEconomySidebar() {
  const el = document.getElementById('economy-sidebar');
  if (!el || typeof marketSnapshot !== 'function') return;

  const now = Date.now();
  const byId = Object.fromEntries(marketSnapshot(now).map(i => [i.id, i]));
  const items = SIDEBAR_ITEMS.map(([id, icon]) => byId[id] && { ...byId[id], icon }).filter(Boolean);

  const rows = items.map(item => {
    const dir = item.changePercent > 0.5 ? 'up' : item.changePercent < -0.5 ? 'down' : 'stable';
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
    return `
      <div class="economy-item price-${dir !== 'stable' ? dir : ''}">
        <div class="item-name">${item.icon} ${item.name}</div>
        <div class="item-price">
          ${formatCoins(item.currentPrice)}
          <span class="price-change ${dir}" title="24h change">${arrow} ${Math.abs(item.changePercent).toFixed(1)}%</span>
        </div>
      </div>`;
  }).join('');

  const avg = items.reduce((sum, i) => sum + i.changePercent, 0) / (items.length || 1);
  const trend = avg > 1 ? 'up' : avg < -1 ? 'down' : 'stable';
  const trendLabel = trend === 'up' ? 'Bullish Market' : trend === 'down' ? 'Bearish Market' : 'Stable Trading';
  const posted = new Date(marketSlotStart(now)).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });

  el.innerHTML = `
    <div class="economy-header">
      <span class="economy-title">💰 Realm Market Watch</span>
      <a class="refresh-btn" href="economy.html">Full exchange →</a>
    </div>
    <div class="economy-grid">${rows}</div>
    <div class="market-trend">
      <span class="trend-indicator trend-${trend}"></span>
      ${trendLabel} · Posted ${posted} · 24h change
    </div>
  `;
}

// Re-render when a new 15-minute price slot starts.
function startEconomyUpdates() {
  const check = () => {
    const slot = typeof marketSlotStart === 'function' ? marketSlotStart(Date.now()) : null;
    if (slot !== sidebarSlot) { sidebarSlot = slot; renderEconomySidebar(); }
  };
  check();
  setInterval(check, 30000);
}

/* ── HELPERS ─────────────────────────────────────────────── */
function formatDate(str) {
  if (!str) return 'Unknown Date';
  // Date-only strings parse as UTC midnight, which shows the day before in the Americas
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(str) ? str + 'T12:00:00' : str).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
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
