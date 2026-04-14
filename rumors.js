/* ============================================
   TAVERN RUMOR GENERATOR
   ============================================ */

let allRumors = [];
let currentCategory = 'all';
let recentRumors = [];

// Load rumors from JSON
async function loadRumors() {
    try {
        const response = await fetch('rumors.json');
        allRumors = await response.json();
        console.log(`Loaded ${allRumors.rumors.length} rumors`);
    } catch (error) {
        console.error('Error loading rumors:', error);
        document.getElementById('rumor-display').innerHTML = 
            '<p style="color: #f44336;">Failed to load rumors. Check console.</p>';
    }
}

// Generate a random rumor
function generateRumor() {
    if (allRumors.length === 0) {
        document.getElementById('rumor-display').innerHTML = 
            '<p style="color: #f44336;">Rumors not loaded yet. Please wait...</p>';
        return;
    }

    // Filter by category
    let filteredRumors = allRumors.rumors;
    if (currentCategory !== 'all') {
        filteredRumors = allRumors.rumors.filter(r => r.category === currentCategory);
    }

    // Pick random rumor
    const rumor = filteredRumors[Math.floor(Math.random() * filteredRumors.length)];

    // Display rumor
    displayRumor(rumor);

    // Add to recent
    addToRecent(rumor);

    // Animate
    animateDisplay();
}

// Display rumor in the box
function displayRumor(rumor) {
    const categoryNames = {
        'local': '🏘️ Local Gossip',
        'politics': '👑 Politics',
        'economics': '💰 Economics',
        'adventures': '⚔️ Adventures',
        'monsters': '🐉 Monsters',
        'magic': '✨ Magic & Weird'
    };

    document.getElementById('rumor-display').innerHTML = `
        <div class="rumor-text">"${rumor.text}"</div>
        <div class="rumor-meta">
            <span class="category-tag">${categoryNames[rumor.category]}</span>
        </div>
    `;

    // Update truth meter
    updateTruthMeter(rumor.truth);
}

// Update truth meter
function updateTruthMeter(truth) {
    const truthValue = document.getElementById('truth-value');
    const truthFill = document.getElementById('truth-fill');

    if (truth === 0) {
        truthValue.textContent = '??? (Roll Investigation)';
        truthFill.style.width = '50%';
    } else {
        truthValue.textContent = `${truth}% True`;
        truthFill.style.width = `${truth}%`;

        // Color based on truth level
        if (truth < 30) {
            truthValue.style.color = '#f44336';
        } else if (truth < 70) {
            truthValue.style.color = '#ffeb3b';
        } else {
            truthValue.style.color = '#4caf50';
        }
    }
}

// Animate the display
function animateDisplay() {
    const display = document.getElementById('rumor-display');
    display.style.opacity = '0';
    display.style.transform = 'scale(0.95)';

    setTimeout(() => {
        display.style.transition = 'all 0.3s ease';
        display.style.opacity = '1';
        display.style.transform = 'scale(1)';
    }, 50);
}

// Add to recent list
function addToRecent(rumor) {
    recentRumors.unshift(rumor);
    if (recentRumors.length > 10) {
        recentRumors.pop();
    }
    renderRecent();
    saveRecent();
}

// Render recent list
function renderRecent() {
    const container = document.getElementById('recent-list');

    if (recentRumors.length === 0) {
        container.innerHTML = '<p style="color: #888; font-style: italic;">No rumors generated yet...</p>';
        return;
    }

    const categoryNames = {
        'local': '🏘️',
        'politics': '👑',
        'economics': '💰',
        'adventures': '⚔️',
        'monsters': '🐉',
        'magic': '✨'
    };

    container.innerHTML = recentRumors.map((rumor, index) => `
        <div class="recent-item">
            <p>"${rumor.text}"</p>
            <div class="meta">
                ${categoryNames[rumor.category]} ${rumor.category} • 
                ${rumor.truth > 0 ? `${rumor.truth}% True` : 'Unknown'}
            </div>
        </div>
    `).join('');
}

// Clear recent history
function clearRecent() {
    recentRumors = [];
    renderRecent();
    localStorage.removeItem('tavern_recent_rumors');
}

// Save to localStorage
function saveRecent() {
    localStorage.setItem('tavern_recent_rumors', JSON.stringify(recentRumors));
}

// Load from localStorage
function loadRecent() {
    const saved = localStorage.getItem('tavern_recent_rumors');
    if (saved) {
        recentRumors = JSON.parse(saved);
        renderRecent();
    }
}

// Add custom rumor
function addRumor() {
    const text = document.getElementById('new-rumor-text').value.trim();
    const category = document.getElementById('new-rumor-category').value;

    if (!text) {
        alert('Please enter a rumor!');
        return;
    }

    const newRumor = {
        text: text,
        category: category,
        truth: 0 // Unknown truth value
    };

    // Add to local array (not saved to JSON)
    allRumors.rumors.push(newRumor);

    // Clear input
    document.getElementById('new-rumor-text').value = '';

    alert('Rumor added to the mill! (Session only - will reset on refresh)');

    // Display it
    displayRumor(newRumor);
    addToRecent(newRumor);
}

// Category selection
function setupCategoryButtons() {
    const buttons = document.querySelectorAll('.category-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            buttons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Set current category
            currentCategory = btn.dataset.category;
        });
    });
}

// Spacebar to generate
function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            generateRumor();
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    await loadRumors();
    loadRecent();
    setupCategoryButtons();
    setupKeyboardShortcut();
});
