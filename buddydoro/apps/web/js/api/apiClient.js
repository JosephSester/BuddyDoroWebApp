// ============================================================
// FRONTEND API CLIENT
// Location: apps/web/js/api/apiClient.js
// Purpose: HTTP client that calls the backend API
// Used by: Frontend code to send requests to the backend API
// Note: This runs IN THE BROWSER, not on the server
// ============================================================

/**
 * Backend runs on port 3000. Use the same hostname as the current page for
 * localhost vs 127.0.0.1 so OAuth (/spotify/login) and API calls stay consistent
 * with SPOTIFY_REDIRECT_URI and FRONTEND_URL in .env.
 */
function resolveApiBase() {
  if (typeof window === 'undefined' || !window.location) {
    return 'http://localhost:3000/api';
  }
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
}

export const API_BASE = resolveApiBase();

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
 * PATCH request (partial update)
 */
export async function apiPatch(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PATCH',
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
        console.error(`PATCH ${endpoint} failed:`, error);
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
