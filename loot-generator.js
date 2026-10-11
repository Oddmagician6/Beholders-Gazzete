/* ============================================================
   D&D 5E LOOT GENERATOR — Fixed & Comprehensive
   ============================================================ */

let currentLoot = null;
let currentTab  = 'individual';

// Rolling logic lives in loot-engine.js (shared with the Session Kit).

// ── TAB SWITCHING ──────────────────────────────────────────
const LOOT_TABS = ['individual', 'hoard', 'magic', 'custom'];

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
  currentTab = tab;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── SHAREABLE LINK ─────────────────────────────────────────
// ?tab=hoard&hoard-cr=5-10&seed=… : the tab, its fields that differ from the
// defaults, and the seed (rng.js) rebuild the same treasure.
const tabFields = tab => [...document.querySelectorAll(`#tab-${tab} select, #tab-${tab} input`)];

function changedFields(tab) {
  return Object.fromEntries(tabFields(tab).filter(el => fieldValue(el) !== defaultValue(el)).map(el => [el.id, fieldValue(el)]));
}

function lootParams() {
  if (!currentLoot || !currentLoot.seed) return {};
  return { tab: currentLoot.tab === 'individual' ? null : currentLoot.tab, ...currentLoot.fields, seed: currentLoot.seed };
}

// Roll the treasure named in the address bar. Returns false when there's no seed in it.
function applyUrl(push) {
  const p = urlParams();
  const seed = parseSeed(p.get('seed'));
  if (!seed) return false;
  switchTab(LOOT_TABS.includes(p.get('tab')) ? p.get('tab') : 'individual');
  tabFields(currentTab).forEach(el => {
    if (!setFieldValue(el, p.get(el.id))) setFieldValue(el, defaultValue(el));
  });
  generateLoot(seed, push);
  return true;
}

function copyLink() {
  if (!currentLoot || !currentLoot.seed) { flashBtn('link-btn', '⚠️ Saved before links; reroll to share'); return; }
  copyPageLink(ok => flashBtn('link-btn', ok ? '✅ Link copied!' : '⚠️ Copy blocked'));
}

// ── MAIN GENERATE ──────────────────────────────────────────
// seed: replay a roll. push: true = new history entry, false = replace, null = leave the URL alone.
function generateLoot(seed = newSeed(), push = true) {
  let coins = { cp:0, sp:0, ep:0, gp:0, pp:0 };
  let gems  = [], art = [], magic = [];
  let magicNote = '';

  const luckSelect = { individual: 'ind-luck', hoard: 'hoard-luck' }[currentTab];
  const luck = (luckSelect && document.getElementById(luckSelect) || { value: 'normal' }).value;
  const luckMult = luck === 'generous' ? 1.5 : luck === 'stingy' ? 0.5 : 1;

  withSeed(seed, () => { switch (currentTab) {

    case 'individual': {
      const cr = document.getElementById('ind-cr').value;
      ({ coins, gems, art, magic } = rollTreasure('individual', cr, luckMult));
      break;
    }

    case 'hoard': {
      const cr  = document.getElementById('hoard-cr').value;
      const inc = document.getElementById('hoard-magic').value !== 'no';
      ({ coins, gems, art, magic } = rollTreasure('hoard', cr, luckMult, inc));
      break;
    }

    case 'magic': {
      const rarity = document.getElementById('magic-rarity').value;
      const mtype  = document.getElementById('magic-type').value;
      const cnt    = Math.min(20, Math.max(1, parseInt(document.getElementById('magic-count').value) || 1));
      // Pick from the pool already filtered by rarity and type, so you get exactly cnt items.
      magic = Array.from({ length: cnt }, () => getMagicItem(rarity, mtype)).filter(Boolean);
      if (!magic.length) {
        const sel = id => document.getElementById(id).selectedOptions[0].textContent;
        magicNote = `The vault holds no ${sel('magic-type').toLowerCase()} items of ${rarity === 'random' ? 'any' : sel('magic-rarity').toLowerCase()} rarity. Try another combination.`;
      }
      break;
    }

    case 'custom': {
      const cr = document.getElementById('custom-cr').value;
      const t  = lootData.treasureTables.individual[cr];
      if (document.getElementById('custom-coins').checked) coins = generateCoins(t, luckMult);
      if (document.getElementById('custom-gems').checked)  gems  = generateGems(100, t.gemTier, [1,6], luckMult);
      if (document.getElementById('custom-art').checked)   art   = generateArt (100, t.artTier, [1,4], luckMult);
      if (document.getElementById('custom-magic').checked) {
        const cnt = roll(1, 3);
        magic = generateMagicItems(t.magicTable, cnt);
      }
      break;
    }
  } });

  currentLoot = {
    coins, gems, art, magic, magicNote,
    totalValue: totalGP(coins, gems, art, magic),
    tab: currentTab,
    seed,
    fields: changedFields(currentTab),
    generatedAt: new Date().toISOString()
  };

  displayLoot();
  if (push !== null) setUrlParams(lootParams(), push);
}

// ── DISPLAY ────────────────────────────────────────────────
function displayLoot() {
  const loot = currentLoot;
  if (!loot) return;

  const el = document.getElementById('loot-display');
  el.style.display = 'block';

  // Summary
  const hasArtifact = loot.magic.some(m => m.rarity === 'artifact');
  document.getElementById('total-value').textContent  = hasArtifact && !loot.totalValue
    ? 'Priceless'
    : formatCoins(loot.totalValue) + (hasArtifact ? ' + priceless' : '');
  const coinSum = Object.values(loot.coins).reduce((a,b) => a+b, 0);
  document.getElementById('total-coins').textContent  = coinSum.toLocaleString();
  document.getElementById('total-gems').textContent   = (loot.gems.length + loot.art.length).toString();
  document.getElementById('total-magic').textContent  = loot.magic.length.toString();

  // Coins
  const hasCoins = coinSum > 0;
  document.getElementById('coins-section').style.display = hasCoins ? 'block' : 'none';
  if (hasCoins) {
    document.getElementById('coins-grid').innerHTML = Object.entries(loot.coins)
      .filter(([,v]) => v > 0)
      .map(([type, amount]) => {
        const info = lootData.coins[type];
        return `<div class="coin-box">
          <div class="coin-icon">${info.icon}</div>
          <div class="coin-amount">${amount.toLocaleString()}</div>
          <div class="coin-type">${info.name}</div>
          <div class="coin-value">= ${formatCoins(amount * info.value)}</div>
        </div>`;
      }).join('');
  }

  // Gems
  document.getElementById('gems-section').style.display = loot.gems.length ? 'block' : 'none';
  if (loot.gems.length) {
    document.getElementById('gems-grid').innerHTML = loot.gems.map(g =>
      `<div class="item-card">
        <div class="item-header">
          <span class="item-name">${g.name}</span>
          <span class="item-rarity rarity-common">Gem</span>
        </div>
        <div class="item-value">💰 ${g.value.toLocaleString()} gp</div>
      </div>`
    ).join('');
  }

  // Art
  document.getElementById('art-section').style.display = loot.art.length ? 'block' : 'none';
  if (loot.art.length) {
    document.getElementById('art-grid').innerHTML = loot.art.map(a =>
      `<div class="item-card">
        <div class="item-header">
          <span class="item-name">${a.name}</span>
          <span class="item-rarity rarity-uncommon">Art</span>
        </div>
        <div class="item-value">💰 ${a.value.toLocaleString()} gp</div>
      </div>`
    ).join('');
  }

  // Magic
  document.getElementById('magic-section').style.display = loot.magic.length || loot.magicNote ? 'block' : 'none';
  if (!loot.magic.length && loot.magicNote) {
    document.getElementById('magic-grid').innerHTML =
      `<p style="color:var(--text-dim);font-style:italic;grid-column:1/-1;">${loot.magicNote}</p>`;
  }
  if (loot.magic.length) {
    document.getElementById('magic-grid').innerHTML = loot.magic.map(item => {
      const rarityClass = item.rarity.replace(' ', '-');
      const info = magicItemInfo(item.name);
      return `<div class="magic-card">
        <div class="item-header">
          <span class="item-name">${item.name}</span>
          <span class="item-rarity rarity-${rarityClass}">${item.rarity}</span>
        </div>
        <div class="item-meta">
          <span class="item-type">${item.type}</span>
          ${item.attune ? '<span class="attune-badge">⚡ Attunement</span>' : ''}
        </div>
        <div class="item-value">${item.value > 0 ? '💰 ~' + item.value.toLocaleString() + ' gp' : '✨ Priceless'}</div>
        ${info ? `<button type="button" class="item-toggle" aria-expanded="false" onclick="toggleItem(this)">Read item ▼</button>
        <div class="item-desc"><p class="item-srd-type">${info.meta}</p>${formatSrdText(info.text)}</div>` : ''}
      </div>`;
    }).join('');
  }

  // Notes
  const noteEl = document.getElementById('loot-notes-content');
  if (noteEl) {
    noteEl.innerHTML = `
      <p><strong>Method:</strong> ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} Treasure</p>
      <p><strong>Coins:</strong> ${coinSum.toLocaleString()} total pieces</p>
      <p><strong>Valuables:</strong> ${loot.gems.length} gems, ${loot.art.length} art objects</p>
      <p><strong>Magic Items:</strong> ${loot.magic.length} items found</p>
      <p><strong>Total Value:</strong> ${formatCoins(loot.totalValue)}${hasArtifact ? ' (plus artifacts, which have no market price)' : ''}</p>
    `;
  }

  // Animate
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  requestAnimationFrame(() => {
    el.style.transition = 'all 0.45s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// SRD text on a magic card (magic-items-data.js); the card spans the grid row while open.
function toggleItem(btn) {
  const open = btn.closest('.magic-card').classList.toggle('expanded');
  btn.textContent = open ? 'Show less ▲' : 'Read item ▼';
  btn.setAttribute('aria-expanded', open);
}

// ── ACTIONS ────────────────────────────────────────────────
function regenerateLoot() { generateLoot(); }

function copyLoot() {
  if (!currentLoot) return;
  const { coins, gems, art, magic, totalValue } = currentLoot;
  let txt = '🏆 TREASURE LOOT 🏆\n\n';
  const priceless = magic.some(m => m.rarity === 'artifact') ? ' + priceless artifact' : '';
  txt += `Total Value: ~${formatCoins(totalValue)}${priceless}\n\n`;

  const coinLines = Object.entries(coins).filter(([,v]) => v > 0)
    .map(([t,v]) => `  ${v.toLocaleString()} ${lootData.coins[t].name}`).join('\n');
  if (coinLines) txt += `🪙 CURRENCY:\n${coinLines}\n\n`;

  if (gems.length) {
    txt += '💎 GEMS:\n' + gems.map(g => `  • ${g.name} (${g.value} gp)`).join('\n') + '\n\n';
  }
  if (art.length) {
    txt += '🎨 ART OBJECTS:\n' + art.map(a => `  • ${a.name} (${a.value} gp)`).join('\n') + '\n\n';
  }
  if (magic.length) {
    txt += '✨ MAGIC ITEMS:\n' + magic.map(m =>
      `  • ${m.name} [${m.rarity}]${m.attune ? ' (Attunement Required)' : ''}`
    ).join('\n') + '\n';
  }

  navigator.clipboard.writeText(txt)
    .then(() => flashBtn('copy-btn', '✅ Copied!'))
    .catch(() => alert('Copy failed — check browser permissions.'));
}

function saveLoot() {
  if (!currentLoot) return;
  try {
    const saved = JSON.parse(localStorage.getItem('gazette_loot') || '[]');
    saved.unshift(currentLoot);
    if (saved.length > 20) saved.pop();
    localStorage.setItem('gazette_loot', JSON.stringify(saved));
    renderSaved();
    flashBtn('save-btn', '✅ Saved!');
  } catch(e) { console.error(e); }
}

function exportLoot() {
  if (!currentLoot) return;
  const blob = new Blob([JSON.stringify(currentLoot, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `loot-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderSaved() {
  const container = document.getElementById('saved-list');
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gazette_loot') || '[]'); } catch(e) {}

  if (!saved.length) {
    container.innerHTML = '<p style="color:var(--text-dim);font-style:italic;text-align:center;padding:20px;">Your vault is empty, adventurer.</p>';
    return;
  }

  container.innerHTML = saved.map((loot, i) => `
    <div class="saved-item" onclick="loadSaved(${i})">
      <h4>Hoard #${i + 1} — ${formatCoins(loot.totalValue)}</h4>
      <p>${loot.magic.length} magic · ${loot.gems.length + loot.art.length} valuables · ${loot.tab}</p>
      <div class="saved-meta">${new Date(loot.generatedAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function loadSaved(i) {
  try {
    const saved = JSON.parse(localStorage.getItem('gazette_loot') || '[]');
    if (saved[i]) { currentLoot = saved[i]; displayLoot(); setUrlParams(lootParams(), true); }
  } catch(e) {}
}

function clearSaved() {
  if (confirm('Clear all saved treasure?')) {
    localStorage.removeItem('gazette_loot');
    renderSaved();
  }
}

function flashBtn(id, text) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => btn.textContent = orig, 2000);
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  renderSaved();
  applyUrl(false);
  // Back/Forward step through earlier rolls.
  window.addEventListener('popstate', () => applyUrl(null));
});
