import { create } from 'zustand';
import { inventoryApi } from '../api/inventoryApi';
import { storeApi } from '../api/storeApi';
import type { StoreItem } from '../api/storeApi';

interface InventoryState {
  catalog: StoreItem[];
  inventory: Record<string, number>;
  isOpen: boolean;
  currentCategory: string;
  isLoading: boolean;
}

interface InventoryActions {
  openStore: () => Promise<void>;
  closeStore: () => void;
  loadInventory: () => Promise<void>;
  purchaseItem: (sku: string) => Promise<number>;
  useItem: (sku: string) => Promise<{ current: number; max: number }>;
  setCategory: (cat: string) => void;
}

export const useInventoryStore = create<InventoryState & InventoryActions>((set) => ({
  catalog: [],
  inventory: {},
  isOpen: false,
  currentCategory: 'all',
  isLoading: false,

  openStore: async () => {
    set({ isOpen: true, isLoading: true });
    try {
      const [catalogRes, inventoryRes] = await Promise.all([
        storeApi.getCatalog(),
        inventoryApi.get(),
      ]);
      const invMap: Record<string, number> = {};
      for (const item of inventoryRes.items) {
        invMap[item.sku] = item.count;
      }
      set({ catalog: catalogRes, inventory: invMap });
    } finally {
      set({ isLoading: false });
    }
  },

  closeStore: () => set({ isOpen: false }),

  loadInventory: async () => {
    const res = await inventoryApi.get();
    const invMap: Record<string, number> = {};
    for (const item of res.items) {
      invMap[item.sku] = item.count;
    }
    set({ inventory: invMap });
  },

  purchaseItem: async (sku) => {
    const res = await inventoryApi.purchase(sku);
    const invMap: Record<string, number> = {};
    for (const item of res.inventory.items) {
      invMap[item.sku] = item.count;
    }
    set({ inventory: invMap });
    return res.doros;
  },

  useItem: async (sku) => {
    const res = await inventoryApi.use(sku);
    const invMap: Record<string, number> = {};
    for (const item of res.inventory.items) {
      invMap[item.sku] = item.count;
    }
    set({ inventory: invMap });
    return res.life;
  },

  setCategory: (cat) => set({ currentCategory: cat }),
}));
