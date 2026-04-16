/* ============================================
   HOMEPAGE ARTICLE LOADER - FIXED
   ============================================ */

// Set year in footer
const yearEl = document.getElementById('year');
if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}

// Set date banner
const dateBanner = document.getElementById('date-banner');
if (dateBanner) {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateBanner.textContent = new Date().toLocaleDateString('en-US', dateOptions) + ' | Edition #' + Math.floor(Math.random() * 9000 + 1000);
}

// Load articles from JSON
async function loadArticles() {
    try {
        const response = await fetch('articles.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        console.log(`✅ Loaded ${data.articles.length} articles`);
        
        // Sort by date (newest first)
        const articles = data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Render featured article
        const featured = articles.find(a => a.featured) || articles[0];
        renderFeaturedArticle(featured);
        
        // Render article grid
        const gridArticles = articles.filter(a => a.id !== featured.id);
        renderArticleGrid(gridArticles);
        
    } catch (error) {
        console.error('❌ Error loading articles:', error);
        const grid = document.getElementById('article-grid');
        const featured = document.getElementById('featured-article');
        
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f44336;">
                    <h3>📜 Failed to Load News</h3>
                    <p>Check console for details</p>
                </div>
            `;
        }
    }
}

function renderFeaturedArticle(article) {
    const container = document.getElementById('featured-article');
    if (!container || !article) return;
    
    container.innerHTML = `
        <h1 class="featured-headline">${article.title}</h1>
        <div class="article-meta">
            <span>By <strong>${article.author}</strong></span>
            <span>${formatDate(article.date)}</span>
        </div>
        <div class="featured-content" style="margin-bottom: 20px;">
            ${article.excerpt || article.content.substring(0, 300) + '...'}
        </div>
        <a href="article.html?id=${article.id}" class="btn">📜 Read Full Scroll</a>
    `;
}

function renderArticleGrid(articles) {
    const container = document.getElementById('article-grid');
    if (!container) return;
    
    if (articles.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">No more news today.</p>';
        return;
    }
    
    container.innerHTML = articles.map(article => `
        <article class="card">
            <div class="card-tag">${article.category}</div>
            <h3><a href="article.html?id=${article.id}">${article.title}</a></h3>
            <p>${article.excerpt || article.content.substring(0, 100) + '...'}</p>
            <a href="article.html?id=${article.id}" class="btn" style="font-size:0.7rem; padding: 5px 10px; margin-top: 10px;">📜 Read Scroll</a>
        </article>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize
document.addEventListener('DOMContentLoaded', loadArticles);

// Console easter egg
console.log("%c 🛑 Stop! ", "color: red; font-size: 30px; font-weight: bold;");
console.log("This is a magical console. Don't paste things here!");
