/* ============================================
   HOMEPAGE ARTICLE LOADER - WITH LOAD MORE
   ============================================ */

console.log('📜 Script loading...');

// ============================================
// GLOBAL VARIABLES FOR LOAD MORE FUNCTIONALITY
// ============================================
let allArticles = [];
let displayedArticles = 6; // Show 6 articles at a time

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
        // Add cache-busting parameter to force fresh load
        const response = await fetch('articles.json?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded ${data.articles.length} articles`);
        
        if (!data.articles || data.articles.length === 0) {
            throw new Error('No articles found in JSON');
        }
        
        // Log all article dates for debugging
        console.log('📅 Article dates:', data.articles.map(a => ({ id: a.id, date: a.date })));
        
        // Sort by date (NEWEST FIRST)
        const articles = data.articles.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const sorted = dateB - dateA; // Newest first
            console.log(`Comparing ${a.date} vs ${b.date} = ${sorted}`);
            return sorted;
        });
        
        console.log('📋 Sorted order:', articles.map(a => `${a.id} (${a.date})`));
        
        // Featured article = MOST RECENT (ignore featured flag for now)
        const featured = articles[0];
        console.log('⭐ Featured (most recent):', featured.id, featured.date);
        
        renderFeaturedArticle(featured);
        
        // Grid = ALL other articles (already sorted) - stored globally for Load More
        allArticles = articles.slice(1);
        displayedArticles = 6; // Reset to 6 when page loads
        console.log('📰 Grid articles:', allArticles.map(a => a.id));
        renderArticleGrid(allArticles);
        
    } catch (error) {
        console.error('❌ Error loading articles:', error);
        
        const grid = document.getElementById('article-grid');
        const featured = document.getElementById('featured-article');
        
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f44336;">
                    <h3>📜 Failed to Load News</h3>
                    <p>${error.message}</p>
                </div>
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
        <div style="margin-bottom: 15px;">
            <span style="background: var(--accent-gold); color: #000; padding: 5px 12px; border-radius: 3px; font-size: 0.75rem; font-family: 'Cinzel', serif; text-transform: uppercase;">
                ${article.category}
            </span>
        </div>
        <h1 class="featured-headline">${article.title}</h1>
        <div class="article-meta">
            <span>By <strong>${article.author}</strong></span>
            <span>📅 ${formatDate(article.date)}</span>
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
    
    console.log('📰 Rendering grid with', articles.length, 'total articles, showing', displayedArticles);
    
    if (!articles || articles.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">No more news from the realm today.</p>';
        return;
    }
    
    // Show only the first X articles
    const visibleArticles = articles.slice(0, displayedArticles);
    
    const html = visibleArticles.map((article, index) => {
        if (!article.id || !article.title) {
            console.error('❌ Invalid article at index', index, article);
            return '';
        }
        
        console.log(`  📄 Grid ${index + 1}:`, article.id, article.date);
        
        return `
            <article class="card">
                <div class="card-tag">${article.category || 'News'}</div>
                <h3><a href="article.html?id=${article.id}">${article.title}</a></h3>
                <p>${article.excerpt || (article.content ? article.content.substring(0, 100) + '...' : 'No excerpt')}</p>
                <div style="font-size: 0.75rem; color: #888; margin-top: 5px;">📅 ${formatDate(article.date)}</div>
                <a href="article.html?id=${article.id}" class="btn" style="font-size:0.7rem; padding: 5px 10px; margin-top: 10px;">📜 Read Scroll</a>
            </article>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // Add Load More button if there are more articles
    if (displayedArticles < articles.length) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.style.gridColumn = '1 / -1';
        loadMoreDiv.style.textAlign = 'center';
        loadMoreDiv.style.padding = '40px';
        loadMoreDiv.style.background = 'rgba(197, 160, 89, 0.05)';
        loadMoreDiv.style.borderRadius = '6px';
        loadMoreDiv.style.marginTop = '20px';
        loadMoreDiv.innerHTML = `
            <p style="color: #888; margin-bottom: 20px; font-size: 0.95rem;">
                📜 ${articles.length - displayedArticles} older articles in the archives
            </p>
            <button class="btn" onclick="loadMoreArticles()" style="font-size: 1rem; padding: 15px 40px;">
                📜 Load More Articles
            </button>
        `;
        container.appendChild(loadMoreDiv);
    }
    
    console.log('✅ Grid rendered successfully');
}

// ============================================
// LOAD MORE FUNCTIONALITY
// ============================================
function loadMoreArticles() {
    displayedArticles += 6; // Load 6 more articles
    console.log('📜 Loading more articles, now showing:', displayedArticles);
    renderArticleGrid(allArticles);
    
    // Scroll smoothly to the new content
    const loadMoreBtn = document.querySelector('button[onclick="loadMoreArticles()"]');
    if (loadMoreBtn) {
        loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM Ready, loading articles...');
    loadArticles();
});

// Console easter egg
console.log("%c 🛑 Stop! ", "color: red; font-size: 30px; font-weight: bold; background: #000; padding: 10px;");
console.log("%c This is a magical console. Don't paste things here!", "color: #888; font-size: 12px;");

