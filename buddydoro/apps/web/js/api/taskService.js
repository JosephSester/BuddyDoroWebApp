// ============================================================
// FRONTEND TASK SERVICE
// Location: apps/web/js/api/taskService.js
// Purpose: High-level task operations using the backend API
// Used by: Frontend code (taskfeature) to save/load tasks
// ============================================================

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';

/**
 * Fetch all tasks from API
 */
export async function fetchTasks() {
    return await apiGet('/tasks');
}

/**
 * Create a task via API
 */
export async function createTask(text, panelId = 'tasksPanel-1') {
    return await apiPost('/tasks', { text, panelId });
}

/**
 * Update a task via API
 */
export async function updateTask(id, updates) {
    return await apiPut(`/tasks/${id}`, updates);
}

/**
 * Delete a task via API
 */
export async function deleteTask(id) {
    return await apiDelete(`/tasks/${id}`);
}

/**
 * Convert API task format to frontend format
 * API: { id, text, completed, panelId, createdAt }
 * Frontend: { id, name, total, done, panelId }
 */
export function apiToFrontend(apiTask) {
    return {
        id: apiTask.id,
        name: apiTask.text,
        total: 1,  // Default to 1 session
        done: apiTask.completed ? 1 : 0,
        panelId: apiTask.panelId || 'tasksPanel-1',
        apiId: apiTask.id // Keep track of API ID
    };
}

/**
 * Convert frontend task format to API format
 */
export function frontendToApi(frontendTask) {
    return {
        text: frontendTask.name,
        completed: frontendTask.done > 0
    };
}
