// apps/web/js/features/taskfeature/storage.js
// LocalStorage helpers for panels and session mapping.

import { PANELS_STORAGE_KEY, TASK_PANEL_MAP_KEY, TASK_SESSIONS_MAP_KEY } from './constants.js';
import { showNotification } from '../../utils/notifications.js';

const QUOTA_MSG = 'Storage is full — some data may not be saved. Try clearing browser data.';
const isQuotaError = (e) => e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED';

export function readTaskPanelMap() {
    try {
        const raw = localStorage.getItem(TASK_PANEL_MAP_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

export function writeTaskPanelMap(map) {
    try {
        localStorage.setItem(TASK_PANEL_MAP_KEY, JSON.stringify(map));
    } catch (e) {
        if (isQuotaError(e)) showNotification(QUOTA_MSG, 'error');
    }
}

export function setTaskPanel(taskId, panelId) {
    if (!taskId || !panelId) return;
    const map = readTaskPanelMap();
    map[String(taskId)] = panelId;
    writeTaskPanelMap(map);
}

export function deleteTaskPanel(taskId) {
    const map = readTaskPanelMap();
    delete map[String(taskId)];
    writeTaskPanelMap(map);
}

export function readTaskSessionsMap() {
    try {
        const raw = localStorage.getItem(TASK_SESSIONS_MAP_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

export function writeTaskSessionsMap(map) {
    try {
        localStorage.setItem(TASK_SESSIONS_MAP_KEY, JSON.stringify(map));
    } catch (e) {
        if (isQuotaError(e)) showNotification(QUOTA_MSG, 'error');
    }
}

export function setTaskSessions(taskId, sessions) {
    if (!taskId || !sessions) return;
    const map = readTaskSessionsMap();
    map[String(taskId)] = { total: Number(sessions.total) || 0, done: Number(sessions.done) || 0 };
    writeTaskSessionsMap(map);
}

export function deleteTaskSessions(taskId) {
    const map = readTaskSessionsMap();
    delete map[String(taskId)];
    writeTaskSessionsMap(map);
}

export function savePanelsToStorage() {
    try {
        const panels = [];
        document.querySelectorAll('.tasks-panel').forEach((panel, index) => {
            const titleEl = panel.querySelector('.tasks-title');
            const list = panel.querySelector('.tasks-list');
            panels.push({
                panelId: list?.dataset.panelId || `tasksPanel-${index + 1}`,
                title: titleEl?.textContent || 'Goal',
            });
        });
        localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(panels));
        console.log('[Panels] Saved panel structure:', panels);
        console.log('[Panels] localStorage now contains:', localStorage.getItem(PANELS_STORAGE_KEY));
    } catch (error) {
        console.error('[Panels] Failed to save panel structure:', error);
        if (isQuotaError(error)) showNotification(QUOTA_MSG, 'error');
    }
}

export function loadPanelsFromStorage() {
    try {
        const stored = localStorage.getItem(PANELS_STORAGE_KEY);
        console.log('[Panels] Raw localStorage value:', stored);
        if (!stored) {
            console.log('[Panels] No panels in localStorage');
            return null;
        }
        const panels = JSON.parse(stored);
        console.log('[Panels] Loaded panel structure:', panels);
        return panels;
    } catch (error) {
        console.error('[Panels] Failed to load panel structure:', error);
        return null;
    }
}
