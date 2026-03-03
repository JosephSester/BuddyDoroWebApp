import { apiGet, apiPost, apiPut } from './client';

export interface InventoryItem {
  sku: string;
  count: number;
}

export interface InventoryResponse {
  userId: string;
  items: InventoryItem[];
}

export const inventoryApi = {
  get: () => apiGet<InventoryResponse>('/inventory'),
  purchase: (sku: string) => apiPost<{ inventory: InventoryResponse; doros: number }>('/inventory/purchase', { sku }),
  use: (sku: string) => apiPut<{ inventory: InventoryResponse; life: { current: number; max: number } }>('/inventory/use', { sku }),
};
