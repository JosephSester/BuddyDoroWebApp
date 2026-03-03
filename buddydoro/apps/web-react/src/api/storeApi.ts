import { apiGet } from './client';

export interface StoreItem {
  sku: string;
  name: string;
  category: 'food' | 'play' | 'water' | 'medicine' | 'accessory' | 'special';
  price: number;
  emoji: string;
  description?: string;
  isLimited?: boolean;
  stockLeft?: number;
}

export const storeApi = {
  getCatalog: () => apiGet<StoreItem[]>('/items'),
};
