// Set year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Set date banner
const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('date-banner').textContent = new Date().toLocaleDateString('en-US', dateOptions) + ' | Edition #' + Math.floor(Math.random() * 9000 + 1000);

// Load articles from JSON
async function loadArticles() {
    try {
        const response = await fetch('articles.json');
        const data = await response.json();
        
        // Sort by date (newest first)
        const articles = data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Render featured article (most recent with featured: true, or just most recent)
        const featured = articles.find(a => a.featured) || articles[0];
        renderFeaturedArticle(featured);
        
        // Render article grid (exclude featured)
        const gridArticles = articles.filter(a => a.id !== featured.id);
        renderArticleGrid(gridArticles);
        
        // Check if we're on article page
        loadArticlePage(articles);
        
    } catch (error) {
        console.error('Error loading articles:', error);
        document.getElementById('article-grid').innerHTML = '<p>Failed to load news from the realm.</p>';
    }
}

function renderFeaturedArticle(article) {
    const container = document.getElementById('featured-article');
    if (!container) return;
    
    container.innerHTML = `
        <h1 class="featured-headline">${article.title}</h1>
        <div class="article-meta">
            <span>By <strong>${article.author}</strong></span>
            <span>${formatDate(article.date)}</span>
        </div>
        <div class="featured-content">
            ${article.content}
        </div>
        <a href="article.html?id=${article.id}" class="btn">Read Full Scroll</a>
    `;
}

function renderArticleGrid(articles) {
    const container = document.getElementById('article-grid');
    if (!container) return;
    
    container.innerHTML = articles.map(article => `
        <article class="card">
            <div class="card-tag">${article.category}</div>
            <h3><a href="article.html?id=${article.id}">${article.title}</a></h3>
            <p>${article.excerpt}</p>
            <a href="article.html?id=${article.id}" class="btn" style="font-size:0.7rem; padding: 5px 10px;">Read Scroll</a>
        </article>
    `).join('');
}

function loadArticlePage(articles) {
    const container = document.getElementById('article-content');
    if (!container) return;
    
    // Get article ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
        container.innerHTML = '<p>Article not found in the scrolls.</p>';
        return;
    }
    
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
        container.innerHTML = '<p>This scroll has been lost to the void.</p>';
        return;
    }
    
    document.title = `${article.title} | The Beholder's Gazette`;
    
    container.innerHTML = `
        <div class="card-tag">${article.category}</div>
        <h1 class="featured-headline" style="margin-top: 20px;">${article.title}</h1>
        <div class="article-meta">
            <span>By <strong>${article.author}</strong></span>
            <span>${formatDate(article.date)}</span>
        </div>
        <div class="featured-content" style="color: #2b2b2b;">
            ${article.content}
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize
document.addEventListener('DOMContentLoaded', loadArticles);
