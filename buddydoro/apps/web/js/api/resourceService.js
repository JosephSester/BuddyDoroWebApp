import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';

// ─── Search ───────────────────────────────────────────────────────────────────

export function searchVideos(q, maxResults = 8) {
    return apiGet(`/resources/search/videos?q=${encodeURIComponent(q)}&maxResults=${maxResults}`);
}

export function searchBooks(q, limit = 8) {
    return apiGet(`/resources/search/books?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export function getWebSearchUrls(q) {
    return apiGet(`/resources/search/web?q=${encodeURIComponent(q)}`);
}

// ─── Saved Resources ──────────────────────────────────────────────────────────

export function fetchSavedResources() {
    return apiGet('/resources');
}

export function saveResource(data) {
    return apiPost('/resources', data);
}

export function updateResourceNote(id, note) {
    return apiPut(`/resources/${id}`, { note });
}

export function deleteResource(id) {
    return apiDelete(`/resources/${id}`);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function fetchNotes() {
    return apiGet('/resources/notes');
}

export function createNote(data) {
    return apiPost('/resources/notes', data);
}

export function updateNote(id, data) {
    return apiPut(`/resources/notes/${id}`, data);
}

export function deleteNote(id) {
    return apiDelete(`/resources/notes/${id}`);
}
