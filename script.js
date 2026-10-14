/* ============================================================
   THE BEHOLDER'S GAZETTE — HOMEPAGE SCRIPT
   Loads articles.json, renders sections, featured + grid, sidebar economy
   ============================================================ */

console.log('%c👁️ The Beholder\'s Gazette', 'font-family:serif;font-size:18px;color:#d4a843;background:#0e0d0b;padding:8px 16px;');

let latest = [];          // every article, newest first
let allArticles = [];     // what the grid is showing: all but the featured story, or one section
let displayedCount = 6;
let desks = [];           // newsroom desks from glossary.json: { id, name, short, icon, color, categories }
let section = 'all';      // the section bar's pick: 'all' or a desk id

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
    const [data, glossary] = await Promise.all([
      fetch('articles.json?t=' + Date.now()).then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); }),
      // Desk names, icons and colors. Without them the page still works, with plain tags.
      fetch('glossary.json?t=' + Date.now()).then(r => r.json()).catch(() => ({ writers: [] })),
    ]);
    // Real-news desks (Across the Multiverse) live on multiverse.html, not the satire front page
    desks = (glossary.writers || []).filter(w => !w.desk_real).map(w => ({
      id: w.desk_id, name: w.desk, short: w.desk_short || w.desk, icon: w.desk_icon || w.avatar || '📰',
      color: /^#[0-9a-f]{3,8}$/i.test(w.desk_color || '') ? w.desk_color : '', categories: w.categories || [],
    }));

    // Newest first. Same-day articles keep file order, matching export-articles.ps1's pre-render.
    latest = (data.articles || []).filter(a => !a.real).map((a, i) => ({ a, i }))
      .sort((x, y) => new Date(y.a.date) - new Date(x.a.date) || x.i - y.i).map(x => x.a);
    if (!latest.length) throw new Error('No articles found');

    const wanted = new URLSearchParams(location.search).get('section');
    if (wanted && desks.some(d => d.id === wanted)) section = wanted;

    renderSections();
    showSection();
    renderTicker(latest.slice(0, 8));

  } catch (err) {
    console.error('Failed to load articles:', err);
    const grid = document.getElementById('article-grid');
    const feat = document.getElementById('featured-article');
    if (feat) feat.innerHTML = errorBox('Could not load the latest scroll. The messenger raven may have been eaten.<br><small>' + err.message + '</small>');
    if (grid) grid.innerHTML = '';
  }
}

/* ── SECTIONS ────────────────────────────────────────────── */
// Every article belongs to the desk whose categories include its category.
function deskOf(a) { return desks.find(d => d.categories.includes(a.category)); }

function deskStyle(d) { return d && d.color ? ` style="--desk:${d.color}"` : ''; }

// Category tag: colored by desk, with the desk's icon, linking to that desk's section.
// export-articles.ps1 writes the same markup into the pre-rendered cards.
function deskTag(a, cls = 'card-tag') {
  const d = deskOf(a);
  const label = esc(a.category || 'News');
  if (!d) return `<span class="${cls}">${label}</span>`;
  return `<a class="${cls}" href="archive.html?section=${encodeURIComponent(d.id)}" data-section="${esc(d.id)}"${deskStyle(d)} title="More from ${esc(d.name)}"><span class="desk-icon" aria-hidden="true">${d.icon}</span>${label}</a>`;
}

// Section bar. export-articles.ps1 pre-renders the same chips, linking to the archive for no-JS visitors.
function renderSections() {
  const el = document.getElementById('section-bar');
  if (!el || !desks.length) return;
  const counts = {};
  latest.forEach(a => { const d = deskOf(a); if (d) counts[d.id] = (counts[d.id] || 0) + 1; });
  const chip = (id, href, label, d) => {
    const on = id === section;
    return `<a class="section-chip${on ? ' active' : ''}" href="${href}" data-section="${esc(id)}"${on ? ' aria-current="true"' : ''}${deskStyle(d)}>${label}</a>`;
  };
  el.innerHTML = '<span class="section-bar-label">Sections</span>' +
    chip('all', 'index.html', '<span aria-hidden="true">📰</span> All news') +
    desks.map(d => chip(d.id, `archive.html?section=${encodeURIComponent(d.id)}`,
      `<span aria-hidden="true">${d.icon}</span> ${esc(d.short)}<span class="n">${counts[d.id] || 0}</span>`, d)).join('');
}

// 'all' shows the featured story with the rest below it. A desk hides the featured story and lists
// every article from that desk, so the page reads as that section's front.
function showSection() {
  const d = desks.find(x => x.id === section);
  const featured = document.getElementById('featured-article');
  const welcome = document.getElementById('welcome-section');
  const title = document.getElementById('grid-title');
  const archive = document.getElementById('archive-link');

  if (d) {
    allArticles = latest.filter(a => deskOf(a) === d);
    if (featured) featured.hidden = true;
    if (welcome) welcome.hidden = true;
    if (title) title.textContent = `${d.icon} ${d.name}`;
    if (archive) { archive.href = `archive.html?section=${encodeURIComponent(d.id)}`; archive.textContent = `📚 Every ${d.name} scroll in the archive →`; }
  } else {
    renderFeatured(latest[0]);
    allArticles = latest.slice(1);
    if (featured) featured.hidden = false;
    if (welcome) welcome.hidden = false;
    if (title) title.textContent = '📰 More News';
    if (archive) { archive.href = 'archive.html'; archive.textContent = '📚 Browse the full archive, by month and desk →'; }
  }
  displayedCount = 6;
  renderGrid();
}

function pickSection(id) {
  section = desks.some(d => d.id === id) ? id : 'all';
  renderSections();
  showSection();
  // Keep the pick in the URL so a section front can be shared or bookmarked
  history.replaceState(null, '', location.pathname + (section === 'all' ? '' : '?section=' + encodeURIComponent(section)));
  document.getElementById('section-bar')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// Section chips and category tags filter the page in place. Their hrefs are the no-JS fallback,
// and a modified click (new tab) still follows them.
document.addEventListener('click', e => {
  const link = e.target.closest('#section-bar [data-section], #article-grid [data-section], #featured-article [data-section]');
  if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
  e.preventDefault();
  pickSection(link.dataset.section);
});

function renderFeatured(article) {
  const el = document.getElementById('featured-article');
  if (!el || !article) return;

  el.innerHTML = `
    <div class="featured-article">
      <div>
        ${deskTag(article, 'category-badge')}
      </div>
      <h2 class="featured-headline">
        <a href="a/${article.id}.html" style="color:inherit;">${article.title}</a>
      </h2>
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
    const msg = section === 'all' ? 'No more scrolls in the archives.' : 'No scrolls from this desk yet. The quill is being sharpened.';
    el.innerHTML = `<p style="color:var(--text-dim);text-align:center;padding:40px;grid-column:1/-1;">${msg}</p>`;
    return;
  }

  el.innerHTML = visible.map((a, i) => {
    const d = deskOf(a);
    return `
    <article class="card" style="animation-delay:${i * 0.08}s;${d && d.color ? `--desk:${d.color}` : ''}">
      ${deskTag(a)}
      <h3><a href="a/${a.id}.html">${a.title}</a></h3>
      <p>${a.excerpt || stripTags(a.content).substring(0, 110) + '…'}</p>
      <div class="card-date">📅 ${formatDate(a.date)}</div>
      <a href="a/${a.id}.html" class="btn" style="font-size:0.68rem;padding:7px 14px;margin-top:14px;">📜 Read Scroll</a>
    </article>
  `;
  }).join('');

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

/* ── TICKER ──────────────────────────────────────────────── */
// Latest headlines, each linking to its article and marked with its desk's icon.
// Keeps the placeholder text if articles fail to load.
function renderTicker(articles) {
  const el = document.getElementById('news-ticker');
  if (!el || !articles.length) return;

  el.textContent = '';
  articles.forEach((a, i) => {
    if (i) el.append('  •  ');
    const link = document.createElement('a');
    link.href = `a/${a.id}.html`;
    link.textContent = `${deskOf(a)?.icon || '📰'} ${stripTags(a.title)}`;
    el.append(link);
  });

  // Same scroll speed however many characters the headlines add up to.
  const chars = el.textContent.length;
  el.style.animationDuration = Math.max(40, Math.round(chars * 0.2)) + 's';
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

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function errorBox(msg) {
  return `<div style="background:var(--bg-card);border:var(--border-gold);border-radius:var(--radius-md);padding:40px;text-align:center;color:var(--text-dim);">
    <p style="font-size:2rem;margin-bottom:16px;">📜</p>
    <p>${msg}</p>
  </div>`;
}
