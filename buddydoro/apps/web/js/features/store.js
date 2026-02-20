// Store dialog. Requires callbacks to read/update Doros.
import { fetchInventory, purchaseItem, useItem, inventoryToMap} from '../api/inventoryService.js';
import { showNotification, setBusy } from '../utils/notifications.js';
import { fetchCatalog } from '../api/storeService.js';
import { setDragonSkin } from './dragon.js';


console.log('[Store Init] storeChip:', !!document.getElementById('storeChip'));
console.log('[Store Init] storeDialog:', !!document.getElementById('storeDialog'));
// ... same for others


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
  let allItems = [];           // ← Loaded from API
  let itemsByCategory = {};    // ← Grouped for tabs
  const inventory = new Map();

  const SKINS = [
  'Alien.png',
  'Axolotyl.png',
  'Bigfoot.png',
  'Butterfly.png',
  'Capybara.png',
  'DragonSkin.png',
  'Frog.png',
  'PrayingMantis.png',
  'Robot.png',
  'RockCreature.png',
  'Vampire.png',
  'Werewolf.png'
];

function niceNameFromFile(filename) {
  return filename
    .replace('.png', '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

  if (!storeChip) {
    console.error('[Store] storeChip not found');
    return;
  }
  

  async function openStore() {
    storeBackdrop.hidden = false;
    storeDialog.hidden = false;
    storeChip.setAttribute('aria-expanded', 'true');
    (storeDialog.querySelector('.tab') || storeClose).focus();

    try {
      setBusy(true, 'Loading store...');

      // Load catalog from backend
      const apiItems = await fetchCatalog();
      allItems = apiItems; // keep flat list for lookups

      // Group by category for tabs
      itemsByCategory = apiItems.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});

      // Load inventory
      const apiInventory = await fetchInventory();
      inventory.clear();
      const loaded = inventoryToMap(apiInventory);
      for (const [sku, count] of loaded.entries()) {
        inventory.set(sku, count);
      }

      setBusy(false);
    } catch (error) {
      console.error('Failed to load store data:', error);
      showNotification('Failed to load store', 'error');
      setBusy(false);
      allItems = [];
      itemsByCategory = {};
      inventory.clear();
    }

    // Activate default tab or first available
    const defaultTab = tabs.find(t => t.dataset.cat === currentCat) || tabs[0];
    if (defaultTab) {
      defaultTab.click();
    } else {
      renderCatalog([]);
    }

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

  function onStoreKey(e) {
    if (e.key === 'Escape') closeStore();
  }


  storeChip?.addEventListener('click', openStore);
  storeBackdrop?.addEventListener('click', closeStore);
  storeClose?.addEventListener('click', closeStore);
  storeCloseBottom?.addEventListener('click', closeStore);

  tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });

    const cat = tab.dataset.cat;

    // NEW: Skins tab renders the skins catalog inside the store window.
    if (cat === 'skins') {
      currentCat = 'skins';
      selectedSku = null;
      renderSkinsCatalog();   // <-- you will add this function in store.js
      return;
    }

    // Normal store category behavior
    currentCat = cat;
    selectedSku = null;
    renderCatalog(itemsByCategory[currentCat] || []);
  });
});

    function renderSkinsCatalog() {
    grid.innerHTML = '';

    // If you later want “selected skin” highlighting, use selectedSku
    SKINS.forEach(file => {
      const name = niceNameFromFile(file);
      const card = document.createElement('div');
      card.className = 'card skin-card';
      card.dataset.sku = file;

      card.innerHTML = `
        <div class="skin-thumb">
          <img src="./assets/artwork/Skins/${file}" alt="${name}" />

        </div>
        <div class="item-name">${name}</div>
        <div class="item-price">Skin</div>
        <div class="item-actions">
          <button class="use-btn" type="button">Equip</button>
        </div>
      `;

      // Equip button
      card.querySelector('.use-btn').addEventListener('click', () => {
        // For now: open = closed = same image until you add closed-eye versions
        setDragonSkin({ open: `Skins/${file}`, closed: `Skins/${file}` });
        showNotification(`${name} equipped! 🐉✨`, 'success');
      });

      // Optional: click card (select highlight)
      card.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        selectedSku = (selectedSku === file) ? null : file;
        highlightSelection();
      });

      grid.appendChild(card);
    });

    highlightSelection();
  }


  function renderCatalog(categoryItems = []) {
    grid.innerHTML = '';
    
    if (categoryItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-message';
      empty.textContent = 'No items in this category yet.';
      grid.appendChild(empty);
      return;
    }

    categoryItems.forEach(it => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.sku = it.sku;
      card.innerHTML = `
        <div class="item-emoji" aria-hidden="true">${it.emoji || '🎁'}</div>
        <div class="item-name">${it.name || it.sku}</div>
        <div class="item-price">${(it.price || 0).toLocaleString()} Doros</div>
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

        try {
          setBusy(true, `Buying ${it.name}...`);
          spendDoros(it.price);
          const response = await purchaseItem(it.sku);

          inventory.clear();
          const updated = inventoryToMap(response);
          for (const [sku, count] of updated.entries()) {
            inventory.set(sku, count);
          }

          setBusy(false);
          showNotification(`Purchased ${it.name}!`, 'success');
          renderInventory();

          const el = document.getElementById('dorosAmount');
          if (el) {
            // Re-query current balance from earnDoros (safest)
            const currentBalance = window.earnDoros?.getBalance?.() ?? 0;
            el.textContent = currentBalance.toLocaleString('en-US');
            console.log('Forced Doros pill update to:', currentBalance);
          }

        } catch (error) {
          setBusy(false);
          showNotification(`Failed to buy ${it.name}`, 'error');
          console.error('Purchase error:', error);
          spendDoros(-it.price); // refund
        }
      });

      card.querySelector('.use-btn').addEventListener('click', async () => {
        if ((inventory.get(it.sku) || 0) <= 0) {
          showNotification('You do not own this item', 'error');
          return;
        }

        try {
          setBusy(true, `Using ${it.name}...`);
          const response = await useItem(it.sku);

          inventory.clear();
          const updated = inventoryToMap(response);
          for (const [sku, count] of updated.entries()) {
            inventory.set(sku, count);
          }

          setBusy(false);
          showNotification(`${it.name} used! 🐉✨`, 'success');
          renderInventory();
          emitItemUsed(it.sku);
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
    return allItems.find(i => i.sku === sku) || null;
  }

  function emitItemUsed(sku) {
    const meta = findItemBySku(sku);
    if (!meta) return;

    const detail = {
      sku,
      name: meta.name || sku,
      emoji: meta.emoji || '',
      category: meta.category || 'other'
    };

    const evt = new CustomEvent('store:itemUsed', { detail });
    window.dispatchEvent(evt);
  }

  function emitOpenSkins() {
    const evt = new CustomEvent('store:openSkins');
    window.dispatchEvent(evt);
  }


  // Optional: keep this for manual use button if you want to keep it
  useBtn?.addEventListener('click', () => {
    if (!selectedSku) {
      showNotification('Select an item card first', 'error');
      return;
    }
    if ((inventory.get(selectedSku) || 0) <= 0) {
      showNotification('You do not own that item', 'error');
      return;
    }

    // You could call useItem() here instead of local decrement
    // For consistency with buy, better to use API
    const meta = findItemBySku(selectedSku);
    useItem(selectedSku)
      .then(response => {
        inventory.clear();
        const updated = inventoryToMap(response);
        for (const [s, c] of updated.entries()) inventory.set(s, c);
        renderInventory();
        showNotification(`${meta?.name || selectedSku} used! 🐉✨`, 'success');
        emitItemUsed(selectedSku);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to use item', 'error');
      });
  });

  return { openStore };
}
