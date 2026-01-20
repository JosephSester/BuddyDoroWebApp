// Store dialog. Requires callbacks to read/update Doros.
import { fetchInventory, purchaseItem, useItem, inventoryToMap } from '../api/inventoryService.js';
import { showNotification, setBusy } from '../utils/notifications.js';

export function initStore({ getDoros, spendDoros }) {
  const storeChip = document.getElementById('storeChip');
  const storeDialog = document.getElementById('storeDialog');
  const storeBackdrop = document.getElementById('storeBackdrop');
  const storeClose = document.getElementById('storeClose');
  const storeCloseBottom = document.getElementById('storeCloseBottom');

  const tabs = Array.from(document.querySelectorAll('.category-tabs .tab'));
  const grid = document.getElementById('catalogGrid');
  const invUl = document.getElementById('inventoryList');
  const useBtn = document.getElementById('useSelectedBtn');

  let currentCat = 'food';
  let selectedSku = null;

  const catalog = {
    food: [
      { sku: 'food-apple', name: 'Apple', price: 20, emoji: '🍎' },
      { sku: 'food-fish', name: 'Grilled Fish', price: 35, emoji: '🐟' },
      { sku: 'food-cake', name: 'Berry Cake', price: 60, emoji: '🍰' }
    ],
    play: [
      { sku: 'play-ball', name: 'Bouncy Ball', price: 25, emoji: '🟣' },
      { sku: 'play-rope', name: 'Rope Toy', price: 30, emoji: '🪢' },
      { sku: 'play-kite', name: 'Kite', price: 45, emoji: '🪁' }
    ],
    water: [
      { sku: 'water-bottle', name: 'Spring Water', price: 15, emoji: '💧' },
      { sku: 'water-juice', name: 'Fruit Juice', price: 28, emoji: '🧃' }
    ],
    medicine: [
      { sku: 'med-bandage', name: 'Bandage', price: 40, emoji: '🩹' },
      { sku: 'med-potion', name: 'Potion', price: 85, emoji: '🧪' }
    ]
  };

  const inventory = new Map();

  async function openStore() {
    storeBackdrop.hidden = false;
    storeDialog.hidden = false;
    storeChip.setAttribute('aria-expanded', 'true');
    (storeDialog.querySelector('.tab') || storeClose).focus();

    // INTEGRATION: Load inventory from API
    try {
      setBusy(true, 'Loading inventory...');
      const apiInventory = await fetchInventory();
      inventory.clear();
      const loaded = inventoryToMap(apiInventory);
      for (const [sku, count] of loaded.entries()) {
        inventory.set(sku, count);
      }
      setBusy(false);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      showNotification('Failed to load inventory', 'error');
      setBusy(false);
      inventory.clear();
    }

    renderCatalog();
    renderInventory();
    document.addEventListener('keydown', onStoreKey);
  }
  function closeStore() {
    storeBackdrop.hidden = true;
    storeDialog.hidden = true;
    storeChip.setAttribute('aria-expanded', 'false');
    selectedSku = null;
    document.removeEventListener('keydown', onStoreKey);
    storeChip.focus();
  }
  function onStoreKey(e) { if (e.key === 'Escape') closeStore(); }

  storeChip?.addEventListener('click', openStore);
  storeBackdrop?.addEventListener('click', closeStore);
  storeClose?.addEventListener('click', closeStore);
  storeCloseBottom?.addEventListener('click', closeStore);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
      currentCat = tab.dataset.cat; selectedSku = null; renderCatalog();
    });
  });

  function renderCatalog() {
    grid.innerHTML = '';
    const items = catalog[currentCat] || [];
    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="item-emoji" aria-hidden="true">${it.emoji}</div>
        <div class="item-name">${it.name}</div>
        <div class="item-price">${it.price.toLocaleString()} Doros</div>
        <div class="item-actions">
          <button class="buy-btn" type="button">Buy</button>
          <button class="use-btn" type="button">Use</button>
        </div>
      `;
      card.querySelector('.buy-btn').addEventListener('click', async () => {
        if (getDoros() < it.price) {
          showNotification('Not enough Doros', 'error');
          return;
        }

        // INTEGRATION: Call API to purchase item
        try {
          setBusy(true, `Buying ${it.name}...`);
          spendDoros(it.price);
          const response = await purchaseItem(it.sku);

          // Update local inventory from API response
          inventory.clear();
          const updated = inventoryToMap(response);
          for (const [sku, count] of updated.entries()) {
            inventory.set(sku, count);
          }

          setBusy(false);
          showNotification(`Purchased ${it.name}!`, 'success');
          renderInventory();
        } catch (error) {
          setBusy(false);
          showNotification(`Failed to buy ${it.name}`, 'error');
          console.error('Purchase error:', error);
          // Refund Doros if purchase failed
          spendDoros(-it.price);
        }
      });

      card.querySelector('.use-btn').addEventListener('click', async () => {
        if ((inventory.get(it.sku) || 0) <= 0) {
          showNotification('You do not own this item yet', 'error');
          return;
        }

        // INTEGRATION: Call API to use item
        try {
          setBusy(true, `Using ${it.name}...`);
          const response = await useItem(it.sku);

          // Update local inventory from API response
          inventory.clear();
          const updated = inventoryToMap(response);
          for (const [sku, count] of updated.entries()) {
            inventory.set(sku, count);
          }

          setBusy(false);
          showNotification(`${it.name} used! 🐉✨`, 'success');
          renderInventory();
          emitItemUsed(it.sku); // Tell the rest of the app an item was used
        } catch (error) {
          setBusy(false);
          showNotification(`Failed to use ${it.name}`, 'error');
          console.error('Use item error:', error);
        }
      });


      card.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        selectedSku = (selectedSku === it.sku) ? null : it.sku;
        highlightSelection();
      });

      card.dataset.sku = it.sku;
      grid.appendChild(card);
    });
    highlightSelection();
  }

  function renderInventory() {
    invUl.innerHTML = '';
    if (inventory.size === 0) {
      const li = document.createElement('li');
      li.className = 'inventory-item';
      li.textContent = 'No items yet — earn Doros and buy something!';
      invUl.appendChild(li);
      return;
    }
    for (const [sku, count] of inventory.entries()) {
      const meta = findItemBySku(sku);
      const li = document.createElement('li');
      li.className = 'inventory-item';
      li.innerHTML = `<span>${meta?.emoji || '🎁'} ${meta?.name || sku}</span><span>x${count}</span>`;
      invUl.appendChild(li);
    }
  }

  function highlightSelection() {
    const cards = Array.from(grid.querySelectorAll('.card'));
    cards.forEach(c => {
      const active = c.dataset.sku === selectedSku;
      c.style.outline = active ? '3px solid #2b2213' : 'none';
      c.style.outlineOffset = active ? '2px' : '0';
    });
  }
  function findItemBySku(sku) {
    for (const cat of Object.values(catalog)) {
      const found = cat.find(i => i.sku === sku);
      if (found) return found;
    }
    return null;
  }

  // --- Broadcast "item used" so other features (like LifeCircle) can react ---
  function emitItemUsed(sku) {
    const meta = findItemBySku(sku);
    const detail = {
      sku,
      name: meta?.name || sku,
      emoji: meta?.emoji || '',
      // Simple category guess from sku prefix
      category: sku.startsWith('food-') ? 'food'
        : sku.startsWith('water-') ? 'water'
          : sku.startsWith('play-') ? 'play'
            : sku.startsWith('med-') ? 'medicine'
              : 'other'
    };

    const evt = new CustomEvent('store:itemUsed', { detail });
    window.dispatchEvent(evt);
  }

  useBtn?.addEventListener('click', () => {
    if (!selectedSku) { alert('Select an item card first.'); return; }
    if ((inventory.get(selectedSku) || 0) <= 0) { alert('You do not own that item.'); return; }
    inventory.set(selectedSku, inventory.get(selectedSku) - 1);
    renderInventory();
    const meta = findItemBySku(selectedSku);
    alert(`${meta?.name || selectedSku} used! 🐉✨`);
    emitItemUsed(selectedSku); // NEW: tell the rest of the app an item was used
  });


  return { openStore };
}
