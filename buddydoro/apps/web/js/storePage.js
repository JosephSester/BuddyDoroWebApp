// Store — standalone page script
import { apiGet } from './api/apiClient.js';
import { fetchInventory, purchaseItem, inventoryToMap } from './api/inventoryService.js';
import { fetchCatalog } from './api/storeService.js';
import { showNotification } from './utils/notifications.js';
import {
  applyPreferencesToStorage,
  getStoredPreferences,
  saveUserPreferences,
} from './utils/preferences.js';

// ── Auth guard ────────────────────────────────────────────────
if (!localStorage.getItem('authToken')) {
  window.location.href = 'login.html';
}

// ── DOM refs ──────────────────────────────────────────────────
const tabs       = Array.from(document.querySelectorAll('.category-tabs .tab'));
const grid       = document.getElementById('catalogGrid');
const dorosEl    = document.getElementById('dorosAmount');
const diamondsEl = document.getElementById('diamondsAmount');

// ── State ─────────────────────────────────────────────────────
let currentCat      = 'food';
let selectedSku     = null;
let allItems        = [];
let itemsByCategory = {};
let doros           = 0;
let diamonds        = 0;
const inventory     = new Map();

// ── localStorage keys (must match dragon.js + main.js) ───────
// ── Load page data ────────────────────────────────────────────
async function init() {
  try {
    const [me, apiItems, apiInventory] = await Promise.all([
      apiGet('/auth/me'),
      fetchCatalog(),
      fetchInventory(),
    ]);

    doros    = me.doros    ?? 0;
    diamonds = me.diamonds ?? 0;
    dorosEl.textContent    = doros.toLocaleString();
    diamondsEl.textContent = diamonds.toLocaleString();

    allItems = apiItems;
    itemsByCategory = apiItems.reduce((acc, item) => {
      const cat = item.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    const loaded = inventoryToMap(apiInventory);
    for (const [sku, count] of loaded) inventory.set(sku, count);

  } catch (err) {
    console.error('Store page init error:', err);
    showNotification('Failed to load store', 'error');
  }

  // Wire tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      currentCat = tab.dataset.cat;
      selectedSku = null;
      renderCurrentTab();
    });
  });

  renderCurrentTab();
}

function renderCurrentTab() {
  if (currentCat === 'skins')            renderSkins();
  else if (currentCat === 'backgrounds') renderBackgrounds();
  else renderCatalog(itemsByCategory[currentCat] || []);
}

// ── Shared helpers ────────────────────────────────────────────
function priceTag(item) {
  if (item.currency === 'diamonds') {
    return `<span class="item-price item-price--diamond">💎 ${item.price}</span>`;
  }
  return `<span class="item-price">🪙 ${item.price.toLocaleString()}</span>`;
}

function updateBalances(response) {
  if (response.dorosBalance    != null) { doros    = response.dorosBalance;    dorosEl.textContent    = doros.toLocaleString(); }
  if (response.diamondsBalance != null) { diamonds = response.diamondsBalance; diamondsEl.textContent = diamonds.toLocaleString(); }
  if (response.inventory) {
    inventory.clear();
    for (const [sku, count] of inventoryToMap(response.inventory)) inventory.set(sku, count);
  }
}

function hasBalance(item) {
  return item.currency === 'diamonds' ? diamonds >= item.price : doros >= item.price;
}

// ── Render catalog (consumables: food/play/water/medicine) ────
function renderCatalog(items) {
  grid.innerHTML = '';

  if (!items.length) {
    grid.innerHTML = '<p class="sp-empty">No items in this category yet.</p>';
    return;
  }

  items.forEach(it => {
    const owned = (inventory.get(it.sku) || 0) > 0;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.sku = it.sku;
    card.innerHTML = `
      <div class="item-preview" aria-hidden="true">
        <span class="item-emoji">${it.emoji || '🎁'}</span>
      </div>
      <div class="item-name">${it.name || it.sku}</div>
      ${priceTag(it)}
      <div class="item-actions">
        <button class="buy-btn ${it.currency === 'diamonds' ? 'buy-btn--diamond' : ''}" type="button">Buy</button>
      </div>
    `;

    card.querySelector('.buy-btn').addEventListener('click', async () => {
      if (!hasBalance(it)) {
        showNotification(`Not enough ${it.currency === 'diamonds' ? 'diamonds' : 'Doros'}`, 'error');
        return;
      }
      try {
        const response = await purchaseItem(it.sku);
        updateBalances(response);
        showNotification(`Purchased ${it.name}!`, 'success');
        renderCatalog(itemsByCategory[currentCat] || []);
      } catch (err) {
        showNotification(`Failed to buy ${it.name}`, 'error');
      }
    });

    card.addEventListener('click', e => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      selectedSku = selectedSku === it.sku ? null : it.sku;
      highlightSelection();
    });

    grid.appendChild(card);
  });

  highlightSelection();
}

// ── Render skins ──────────────────────────────────────────────
function renderSkins() {
  const items = itemsByCategory['skins'] || [];
  grid.innerHTML = '';

  if (!items.length) {
    grid.innerHTML = '<p class="sp-empty">No skins available yet.</p>';
    return;
  }

  const equippedPath = getStoredPreferences().skinOpen;

  items.forEach(it => {
    const owned    = (inventory.get(it.sku) || 0) > 0;
    const equipped = it.imageUrl && equippedPath === it.imageUrl;

    const card = document.createElement('div');
    card.className = 'card skin-card';
    card.dataset.sku = it.sku;
    card.innerHTML = `
      <div class="skin-thumb">
        <img src="./assets/artwork/${it.imageUrl}" alt="${it.name}" loading="lazy" />
      </div>
      <div class="item-name">${it.name}</div>
      ${owned ? '' : priceTag(it)}
      <div class="item-actions">
        ${owned
          ? `<button class="use-btn equip-btn" type="button">${equipped ? 'Equipped' : 'Equip'}</button>`
          : `<button class="buy-btn ${it.currency === 'diamonds' ? 'buy-btn--diamond' : ''}" type="button">
               ${it.currency === 'diamonds' ? '💎' : '🪙'} Buy
             </button>`
        }
      </div>
    `;

    if (owned) {
      card.querySelector('.equip-btn').addEventListener('click', btn => {
        const preferences = applyPreferencesToStorage({
          skinOpen: it.imageUrl,
          skinClosed: it.imageUrl,
        }, { preserveExisting: true });
        saveUserPreferences(preferences).catch(error => {
          console.warn('Skin preference sync failed:', error);
        });
        grid.querySelectorAll('.equip-btn').forEach(b => b.textContent = 'Equip');
        btn.currentTarget.textContent = 'Equipped';
        showNotification(`${it.name} skin equipped! 🐉✨`, 'success');
      });
    } else {
      card.querySelector('.buy-btn').addEventListener('click', async () => {
        if (!hasBalance(it)) {
          showNotification(`Not enough ${it.currency === 'diamonds' ? 'diamonds' : 'Doros'}`, 'error');
          return;
        }
        try {
          const response = await purchaseItem(it.sku);
          updateBalances(response);
          showNotification(`${it.name} skin unlocked!`, 'success');
          renderSkins();
        } catch (err) {
          showNotification(`Failed to buy ${it.name}`, 'error');
        }
      });
    }

    card.addEventListener('click', e => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      selectedSku = selectedSku === it.sku ? null : it.sku;
      highlightSelection();
    });

    grid.appendChild(card);
  });

  if (equippedPath) {
    const match = items.find(i => i.imageUrl === equippedPath);
    if (match) selectedSku = match.sku;
  }
  highlightSelection();
}

// ── Render backgrounds ────────────────────────────────────────
function renderBackgrounds() {
  const items = itemsByCategory['backgrounds'] || [];
  grid.innerHTML = '';

  if (!items.length) {
    grid.innerHTML = '<p class="sp-empty">No backgrounds available yet.</p>';
    return;
  }

  const equippedPath = getStoredPreferences().background;

  items.forEach(it => {
    const owned    = (inventory.get(it.sku) || 0) > 0;
    const equipped = it.imageUrl && equippedPath === it.imageUrl;

    const card = document.createElement('div');
    card.className = 'card background-card';
    card.dataset.sku = it.sku;
    card.innerHTML = `
      <div class="skin-thumb">
        <img src="./assets/artwork/${it.imageUrl}" alt="${it.name} background" loading="lazy" />
      </div>
      <div class="item-name">${it.name}</div>
      ${owned ? '' : priceTag(it)}
      <div class="item-actions">
        ${owned
          ? `<button class="use-btn equip-btn" type="button">${equipped ? 'Equipped' : 'Equip'}</button>`
          : `<button class="buy-btn ${it.currency === 'diamonds' ? 'buy-btn--diamond' : ''}" type="button">
               ${it.currency === 'diamonds' ? '💎' : '🪙'} Buy
             </button>`
        }
      </div>
    `;

    if (owned) {
      card.querySelector('.equip-btn').addEventListener('click', btn => {
        const preferences = applyPreferencesToStorage({
          background: it.imageUrl,
        }, { preserveExisting: true });
        saveUserPreferences(preferences).catch(error => {
          console.warn('Background preference sync failed:', error);
        });
        grid.querySelectorAll('.equip-btn').forEach(b => b.textContent = 'Equip');
        btn.currentTarget.textContent = 'Equipped';
        showNotification(`${it.name} background equipped! 🌄✨`, 'success');
      });
    } else {
      card.querySelector('.buy-btn').addEventListener('click', async () => {
        if (!hasBalance(it)) {
          showNotification(`Not enough ${it.currency === 'diamonds' ? 'diamonds' : 'Doros'}`, 'error');
          return;
        }
        try {
          const response = await purchaseItem(it.sku);
          updateBalances(response);
          showNotification(`${it.name} background unlocked!`, 'success');
          renderBackgrounds();
        } catch (err) {
          showNotification(`Failed to buy ${it.name}`, 'error');
        }
      });
    }

    card.addEventListener('click', e => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      selectedSku = selectedSku === it.sku ? null : it.sku;
      highlightSelection();
    });

    grid.appendChild(card);
  });

  if (equippedPath) {
    const match = items.find(i => i.imageUrl === equippedPath);
    if (match) selectedSku = match.sku;
  }
  highlightSelection();
}

// ── Selection highlight ───────────────────────────────────────
function highlightSelection() {
  grid.querySelectorAll('.card').forEach(c => {
    const active = c.dataset.sku === selectedSku;
    c.style.outline       = active ? '3px solid #c0622a' : 'none';
    c.style.outlineOffset = active ? '2px' : '0';
  });
}

// ── Boot ──────────────────────────────────────────────────────
init();
