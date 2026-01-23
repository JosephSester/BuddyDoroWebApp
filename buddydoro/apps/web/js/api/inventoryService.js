// ============================================================
// FRONTEND INVENTORY SERVICE
// Location: apps/web/js/api/inventoryService.js
// Purpose: High-level inventory operations using backend API
// Used by: Frontend code (store.js) to load/manage inventory
// ============================================================

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';


/**
 * Fetch user's inventory from API
 */
export async function fetchInventory() {
    return await apiGet('/inventory');
}

/**
 * Purchase an item (add to inventory)
 */
export async function purchaseItem(sku) {
    return await apiPost('/inventory/purchase', { sku });
}

/**
 * Use/consume an item (decrement count)
 */
export async function useItem(sku) {
    return await apiPut('/inventory/use', { sku });
}

/**
 * Remove an item entirely (for testing/admin)
 */
export async function deleteItem(sku) {
    return await apiDelete(`/inventory/${sku}`);
}

/**
 * Convert API inventory format to a Map for easy access
 * API: { id, items: [{ sku, count }, ...] }
 * Map: sku → count
 */
export function inventoryToMap(apiInventory) {
    const map = new Map();
    if (apiInventory?.items) {
        apiInventory.items.forEach(item => {
            map.set(item.sku, item.count);
        });
    }
    return map;
}

/**
 * Convert Map to API format
 */
export function mapToInventory(inventoryMap) {
    const items = [];
    for (const [sku, count] of inventoryMap.entries()) {
        items.push({ sku, count });
    }
    return { items };
}
