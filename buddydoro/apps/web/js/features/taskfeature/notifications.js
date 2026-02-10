// apps/web/js/features/taskfeature/notifications.js
// Task-specific wrappers for the global notification system.

import { showNotification, setBusy } from '../../utils/notifications.js';
import { state } from './state.js';

export function showTaskNotification(message, type = 'info') {
    showNotification(message, type);
}

export function setTasksBusy(isBusy, message = 'Working...') {
    setBusy(isBusy, message, state.els.tasksList);

    if (state.els.addTaskBtn) {
        state.els.addTaskBtn.disabled = !!isBusy;
        state.els.addTaskBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
}
