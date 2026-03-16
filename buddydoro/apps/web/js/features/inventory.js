import { fetchInventory, inventoryToMap, useItem } from '../api/inventoryService.js';
import { fetchCatalog } from '../api/storeService.js';
import { showNotification, setBusy } from '../utils/notifications.js';

// Normalizes category labels like "pet_skins" -> "Pet Skins"
function titleCase(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Inventory modal controller.
 * Responsibilities:
 * - open/close inventory dialog
 * - fetch fresh catalog + inventory data
 * - build dynamic category tabs
 * - render owned items in a categorized grid
 */
export function initInventory() {
  const inventoryChip = document.getElementById('inventoryChip');
  const inventoryBackdrop = document.getElementById('inventoryBackdrop');
  const inventoryDialog = document.getElementById('inventoryDialog');
  const inventoryClose = document.getElementById('inventoryClose');
  const inventoryCloseBottom = document.getElementById('inventoryCloseBottom');
  const tabsRoot = document.getElementById('inventoryCategoryTabs');
  const inventoryGrid = document.getElementById('inventoryGrid');

  if (!inventoryChip || !inventoryBackdrop || !inventoryDialog || !tabsRoot || !inventoryGrid) {
    return;
  }

  let allItems = [];
  let inventoryMap = new Map();
  let activeCategory = 'all';
  // Tracks the item currently being used so only that card shows loading state.
  let actionBusySku = null;

  // Join inventory counts with catalog metadata.
  // This keeps inventory endpoint small while still showing names/emojis/categories.
  function resolveInventoryRows() {
    const rows = [];
    for (const [sku, count] of inventoryMap.entries()) {
      const item = allItems.find((catalogItem) => catalogItem.sku === sku);
      rows.push({
        sku,
        count,
        category: item?.category || 'other',
        name: item?.name || sku,
        emoji: item?.emoji || '🎁',
      });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  function getCategories(rows) {
    const categories = new Set(['all']);
    rows.forEach((row) => categories.add(row.category || 'other'));
    return Array.from(categories);
  }

  function renderTabs(rows) {
    const categories = getCategories(rows);

    if (!categories.includes(activeCategory)) {
      activeCategory = 'all';
    }

    tabsRoot.innerHTML = '';
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tab${activeCategory === category ? ' is-active' : ''}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', activeCategory === category ? 'true' : 'false');
      button.dataset.cat = category;
      button.textContent = category === 'all' ? 'All' : titleCase(category);

      button.addEventListener('click', () => {
        // Re-render from existing rows so tab switches are instant.
        activeCategory = category;
        render(rows);
      });

      tabsRoot.appendChild(button);
    });
  }

  function renderItems(rows) {
    const visibleRows = activeCategory === 'all'
      ? rows
      : rows.filter((row) => row.category === activeCategory);

    inventoryGrid.innerHTML = '';

    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'inventory-empty';
      empty.textContent = 'No items yet - buy items in the store to fill your inventory.';
      inventoryGrid.appendChild(empty);
      return;
    }

    if (visibleRows.length === 0) {
      const emptyCategory = document.createElement('div');
      emptyCategory.className = 'inventory-empty';
      emptyCategory.textContent = 'No items in this category.';
      inventoryGrid.appendChild(emptyCategory);
      return;
    }

    visibleRows.forEach((row) => {
      const card = document.createElement('div');
      card.className = 'inventory-card';
      // Disable only the active item's Use button during async use request.
      const isBusy = actionBusySku === row.sku;
      card.innerHTML = `
        <div class="inventory-card-emoji" aria-hidden="true">${row.emoji}</div>
        <div class="inventory-card-main">
          <div class="inventory-card-name">${row.name}</div>
          <div class="inventory-card-meta">${titleCase(row.category)}</div>
        </div>
        <div class="inventory-card-actions">
          <div class="inventory-card-count">x${row.count}</div>
          <button class="inventory-use-btn" type="button" data-sku="${row.sku}" ${isBusy ? 'disabled' : ''}>
            ${isBusy ? 'Using...' : 'Use'}
          </button>
        </div>
      `;

      const useButton = card.querySelector('.inventory-use-btn');
      useButton?.addEventListener('click', () => handleUseItem(row));
      inventoryGrid.appendChild(card);
    });
  }

  function render(rows) {
    // Keep tabs and content in sync for each UI refresh.
    renderTabs(rows);
    renderItems(rows);
  }

  async function refreshInventoryData() {
    try {
      setBusy(true, 'Loading inventory...');
      // Load both in parallel to reduce modal open time.
      const [catalogResponse, inventoryResponse] = await Promise.all([
        fetchCatalog(),
        fetchInventory(),
      ]);
      allItems = Array.isArray(catalogResponse) ? catalogResponse : [];
      inventoryMap = inventoryToMap(inventoryResponse);
      const rows = resolveInventoryRows();
      render(rows);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      showNotification('Failed to load inventory', 'error');
      tabsRoot.innerHTML = '';
      inventoryGrid.innerHTML = '<div class="inventory-empty">Could not load inventory.</div>';
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') closeInventory();
  }

  function findItemBySku(sku) {
    return allItems.find((item) => item.sku === sku) || null;
  }

  function emitItemUsed(sku) {
    const meta = findItemBySku(sku);
    if (!meta) return;

    const detail = {
      sku,
      name: meta.name || sku,
      emoji: meta.emoji || '',
      category: meta.category || 'other',
    };
    // Reuse existing global event contract so companion/dragon effects stay centralized.
    window.dispatchEvent(new CustomEvent('store:itemUsed', { detail }));
  }

  async function handleUseItem(row) {
    if (!row?.sku) return;
    if ((inventoryMap.get(row.sku) || 0) <= 0) {
      showNotification('You do not own this item', 'error');
      return;
    }

    // Optimistically switch this card into a loading state.
    actionBusySku = row.sku;
    render(resolveInventoryRows());

    try {
      setBusy(true, `Using ${row.name}...`);
      // Backend response is the source of truth for updated item counts.
      const response = await useItem(row.sku);
      inventoryMap = inventoryToMap(response);
      showNotification(`${row.name} used!`, 'success');
      emitItemUsed(row.sku);
    } catch (error) {
      console.error('Failed to use item:', error);
      showNotification(`Failed to use ${row.name}`, 'error');
    } finally {
      // Always restore UI state and re-render current inventory snapshot.
      actionBusySku = null;
      setBusy(false);
      render(resolveInventoryRows());
    }
  }

  async function openInventory() {
    // Guard prevents duplicated listeners when users double-click the chip.
    if (!inventoryDialog.hidden) return;
    inventoryBackdrop.hidden = false;
    inventoryDialog.hidden = false;
    inventoryChip.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeyDown);
    await refreshInventoryData();
    // Focus first tab for keyboard accessibility.
    (inventoryDialog.querySelector('.tab') || inventoryClose || inventoryDialog).focus();
  }

  function closeInventory() {
    inventoryBackdrop.hidden = true;
    inventoryDialog.hidden = true;
    inventoryChip.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeyDown);
    // Return focus to trigger for expected dialog UX behavior.
    inventoryChip.focus();
  }

  inventoryChip.addEventListener('click', openInventory);
  inventoryBackdrop.addEventListener('click', closeInventory);
  inventoryClose?.addEventListener('click', closeInventory);
  inventoryCloseBottom?.addEventListener('click', closeInventory);

  return { openInventory, closeInventory, refreshInventoryData };
}
