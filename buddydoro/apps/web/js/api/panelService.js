// apps/web/js/api/panelService.js
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';

export async function fetchPanels() {
    return await apiGet('/panels');
}

export async function createPanel(title) {
    return await apiPost('/panels', { title });
}

export async function updatePanel(id, updates) {
    return await apiPut(`/panels/${id}`, updates);
}

export async function deletePanel(id, { moveTo } = {}) {
    const qs = moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : '';
    return await apiDelete(`/panels/${id}${qs}`);
}

export async function reorderPanels(items) {
    // items: [{id, order}]
    return await apiPost('/panels/reorder', items);
}
