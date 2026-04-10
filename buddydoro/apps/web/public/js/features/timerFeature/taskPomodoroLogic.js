// apps/web/js/features/timerFeature/taskPomodoroLogic.js
// Starts a focus session immediately when a task is activated — no dialogs.
import { showNotification } from '../../utils/notifications.js';
import { DEFAULT_MINUTES } from './constants.js';

export function initTaskPomodoroLogic({ timer, onFocusStart, onFocusStop } = {}) {
    if (!timer) throw new Error('Timer is required for pomodoro logic.');

    let activeTaskId   = null;
    let activeTask     = null;
    let currentTaskName = null;
    let isActive       = false;

    const resetState = () => {
        if (activeTaskId && typeof onFocusStop === 'function') {
            try { onFocusStop({ taskId: activeTaskId, task: activeTask }); } catch { }
        }
        activeTaskId    = null;
        activeTask      = null;
        currentTaskName = null;
        isActive        = false;
        timer.setPlannedFocusDuration(null);
        timer.setModeLabel(null);
    };

    const startFocus = (seconds, taskName) => {
        timer.setPlannedFocusDuration(seconds);
        if (typeof onFocusStart === 'function') {
            try { onFocusStart({ taskId: activeTaskId, task: activeTask }); } catch { }
        }
        if (taskName) {
            currentTaskName = taskName;
            timer.setModeLabel(`Focusing on ${taskName}`);
        }
        isActive = true;
        timer.setMode('focus');
        timer.setDuration(seconds);
        timer.setRemaining(seconds);
        timer.start();
    };

    timer.onStart(({ mode }) => {
        if (!isActive) return;
        if (mode === 'focus' && currentTaskName) {
            timer.setModeLabel(`Focusing on ${currentTaskName}`);
        }
    });

    timer.onComplete(({ mode }) => {
        if (!isActive) return;
        if (mode === 'focus') {
            showNotification('Focus session complete!', 'success');
            resetState();
        }
    });

    return {
        handleActiveTaskChange: async (task) => {
            if (!task) { resetState(); return; }
            const taskId = String(task.id);
            if (taskId === activeTaskId) return;
            resetState();
            activeTaskId = taskId;
            activeTask   = { id: task.id, name: task.name, total: task.total, done: task.done, panelId: task.panelId };

            const safeName  = String(task.name || 'task').trim();
            const seconds   = DEFAULT_MINUTES.focus * 60;
            startFocus(seconds, safeName);
        },
        stop: () => resetState(),
    };
}
