import { apiGet } from './apiClient.js';

export async function fetchCatalog() {
  return await apiGet('/items');
}
