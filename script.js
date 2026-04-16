/* ============================================
   HOMEPAGE ARTICLE LOADER - FIXED
   ============================================ */

console.log('📜 Script loading...');

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
    console.log('🔍 Loading articles...');
    
    try {
        const response = await fetch('articles.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded ${data.articles.length} articles`);
        
        if (!data.articles || data.articles.length === 0) {
            throw new Error('No articles found in JSON');
        }
        
        // Sort by date (newest first)
        const articles = data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('📋 Articles sorted:', articles.map(a => a.id));
        
        // Render featured article (first one or marked as featured)
        const featured = articles.find(a => a.featured) || articles[0];
        console.log('⭐ Featured article:', featured.id);
        renderFeaturedArticle(featured);
        
        // Render article grid (ALL other articles)
        const gridArticles = articles.filter(a => a.id !== featured.id);
        console.log('📰 Grid articles:', gridArticles.map(a => a.id));
        renderArticleGrid(gridArticles);
        
    } catch (error) {
        console.error('❌ Error loading articles:', error);
        
        const grid = document.getElementById('article-grid');
        const featured = document.getElementById('featured-article');
        
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f44336;">
                    <h3>📜 Failed to Load News</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 0.85rem; color: #888;">Check console for details</p>
                </div>
            `;
        }
        
        if (featured) {
            featured.innerHTML = `
                <h1 class="featured-headline">The Scribes Are on Strike</h1>
                <p>Failed to load articles. Check your articles.json file.</p>
            `;
        }
    }
}

function renderFeaturedArticle(article) {
    const container = document.getElementById('featured-article');
    
    if (!container) {
        console.error('❌ Featured article container not found!');
        return;
    }
    
    if (!article) {
        console.error('❌ No article to render!');
        return;
    }
    
    console.log('📝 Rendering featured:', article.id);
    
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
    
    if (!container) {
        console.error('❌ Article grid container not found!');
        return;
    }
    
    console.log('📰 Rendering grid with', articles.length, 'articles');
    
    if (!articles || articles.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">No more news from the realm today.</p>';
        return;
    }
    
    const html = articles.map((article, index) => {
        // Validate article has required fields
        if (!article.id || !article.title) {
            console.error('❌ Invalid article at index', index, article);
            return '';
        }
        
        console.log(`  📄 Grid article ${index + 1}:`, article.id);
        
        return `
            <article class="card">
                <div class="card-tag">${article.category || 'News'}</div>
                <h3><a href="article.html?id=${article.id}">${article.title}</a></h3>
                <p>${article.excerpt || (article.content ? article.content.substring(0, 100) + '...' : 'No excerpt available')}</p>
                <a href="article.html?id=${article.id}" class="btn" style="font-size:0.7rem; padding: 5px 10px; margin-top: 10px;">📜 Read Scroll</a>
            </article>
        `;
    }).join('');
    
    container.innerHTML = html;
    console.log('✅ Grid rendered successfully');
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM Ready, loading articles...');
    loadArticles();
});

// Console easter egg
console.log("%c 🛑 Stop! ", "color: red; font-size: 30px; font-weight: bold; background: #000; padding: 10px;");
console.log("%c This is a magical console. If someone told you to paste something here, they are likely a Warlock trying to steal your soul.", "color: #888; font-size: 12px;");
