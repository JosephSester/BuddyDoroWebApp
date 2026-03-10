// apps/web/js/features/timerFeature/taskPomodoroLogic.js
import { showNotification } from '../../utils/notifications.js';
import { confirmSessions } from './dialogs.js';

const DEFAULTS = { breakMinutes: 5 };
const LIMITS = { min: 1, max: 180 };

export function initTaskPomodoroLogic({ timer, onFocusStart, onFocusStop } = {}) {
    if (!timer) throw new Error('Timer is required for pomodoro logic.');

    let activeTaskId = null;
    let activeTask = null;
    let totalSeconds = null;
    let currentTaskName = null;
    let isActive = false;

    const resetState = () => {
        if (activeTaskId && typeof onFocusStop === 'function') {
            try { onFocusStop({ taskId: activeTaskId, task: activeTask }); } catch { }
        }
        activeTaskId = null;
        activeTask = null;
        totalSeconds = null;
        currentTaskName = null;
        isActive = false;
        timer.setBreakSummaryEnabled(true);
        timer.setPlannedFocusDuration(null);
        timer.setModeLabel(null);
    };

    const readMinutes = async (title) => {
        const minutes = await timer.openDurationMenu({ title });
        if (!Number.isFinite(minutes) || minutes < LIMITS.min || minutes > LIMITS.max) {
            showNotification(`Enter a whole number between ${LIMITS.min} and ${LIMITS.max}.`, 'error');
            return null;
        }
        return minutes;
    };

    const startFocus = (minutes, taskName) => {
        totalSeconds = minutes * 60;
        if (typeof timer.applyDefaults === 'function') {
            timer.applyDefaults({ breakMinutes: DEFAULTS.breakMinutes });
        }
        timer.setPlannedFocusDuration(totalSeconds);
        if (typeof onFocusStart === 'function') {
            try { onFocusStart({ taskId: activeTaskId, task: activeTask }); } catch { }
        }
        if (taskName) {
            currentTaskName = taskName;
            timer.setModeLabel(`Focusing on ${taskName}`);
        }
        isActive = true;
        timer.setMode('focus');
        timer.setDuration(totalSeconds);
        timer.setRemaining(totalSeconds);
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
        if (mode === 'focus' && totalSeconds) {
            showNotification('Task complete!', 'success');
            resetState();
        }
    });

    return {
        handleActiveTaskChange: async (task) => {
            if (!task) { resetState(); return; }
            const taskId = String(task.id);
            if (taskId === activeTaskId && totalSeconds) return;
            resetState();
            activeTaskId = taskId;
            activeTask = { id: task.id, name: task.name, total: task.total, done: task.done, panelId: task.panelId };

            while (true) {
                const safeName = String(task.name || 'task').trim();
                const title = safeName ? `Set minutes for ${safeName}` : 'Set minutes';
                const minutes = await readMinutes(title);
                if (!minutes) return;
                const confirmed = await confirmSessions(minutes);
                if (confirmed) {
                    startFocus(minutes, safeName);
                    return;
                }
            }
        },
        stop: () => resetState(),
    };
}
