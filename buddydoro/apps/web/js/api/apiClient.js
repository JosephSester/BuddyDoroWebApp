// ============================================================
// FRONTEND API CLIENT
// Location: apps/web/js/api/apiClient.js
// Purpose: HTTP client that calls the backend API
// Used by: Frontend code to send requests to the backend API
// Note: This runs IN THE BROWSER, not on the server
// ============================================================

export const API_BASE = 'http://localhost:3000/api';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function handleUnauthorized() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('hasSeenOnboarding');
    window.location.href = 'login.html';
}

/**
 * GET request
 */
export async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`GET ${endpoint} failed:`, error);
        throw error;
    }
}

/**
 * POST request (create)
 */
export async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`POST ${endpoint} failed:`, error);
        throw error;
    }
}

/**
 * PUT request (update)
 */
export async function apiPut(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`PUT ${endpoint} failed:`, error);
        throw error;
    }
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`DELETE ${endpoint} failed:`, error);
        throw error;
    }
}
