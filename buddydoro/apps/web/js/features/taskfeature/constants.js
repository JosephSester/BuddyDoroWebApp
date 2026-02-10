// apps/web/js/features/taskfeature/constants.js
// Task feature constants and validation rules.

export const SESSION_MAX = 999;
export const CREATE_NAME_MAX = 80;
export const CREATE_DEFAULT_ESTIMATE = 50;
export const MAX_PANELS = 5;

let TASK_NAME_PATTERN;
try {
    TASK_NAME_PATTERN = new RegExp("^[\\p{L}\\p{N}][\\p{L}\\p{N}\\s'-]{0,79}$", 'u');
} catch (_err) {
    TASK_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s'-]{0,79}$/;
}

export { TASK_NAME_PATTERN };

export const TASK_NAME_ALLOWED_MESSAGE =
    "Name can include letters, numbers, spaces, apostrophes, or hyphens.";

export const PANELS_STORAGE_KEY = 'buddydoro_panels';
export const TASK_PANEL_MAP_KEY = 'buddydoro_task_panel_map';
export const TASK_SESSIONS_MAP_KEY = 'buddydoro_task_sessions_map';

export const TODO_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
