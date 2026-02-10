// apps/web/js/features/timerFeature/taskPomodoroLogic.js
import { showNotification } from '../../utils/notifications.js';

const DEFAULTS = { sessionMinutes: 1, breakMinutes: 5 };
const LIMITS = { min: 1, max: 180 };

export function initTaskPomodoroLogic({ timer, onFocusStart, onFocusStop } = {}) {
    if (!timer) throw new Error('Timer is required for pomodoro logic.');

    const confirmBackdrop = document.getElementById('pomodoroConfirmBackdrop');
    const confirmDialog = document.getElementById('pomodoroConfirmDialog');
    const confirmText = document.getElementById('pomodoroConfirmText');
    const confirmOk = document.getElementById('pomodoroConfirmOk');
    const confirmCancel = document.getElementById('pomodoroConfirmCancel');
    const breakBackdrop = document.getElementById('breakConfirmBackdrop');
    const breakDialog = document.getElementById('breakConfirmDialog');
    const breakText = document.getElementById('breakConfirmText');
    const breakOk = document.getElementById('breakConfirmOk');
    const breakCancel = document.getElementById('breakConfirmCancel');

    let activeTaskId = null;
    let activeTask = null;
    let totalSeconds = null;
    let nextBreakAtSeconds = null;
    let lastRemainingSeconds = null;
    let focusRemainingSeconds = null;
    let isBreakRunning = false;
    let isPromptOpen = false;
    let currentTaskName = null;
    let isActive = false;

    const resetState = () => {
        if (activeTaskId && typeof onFocusStop === 'function') {
            try { onFocusStop({ taskId: activeTaskId, task: activeTask }); } catch { }
        }
        activeTaskId = null;
        activeTask = null;
        totalSeconds = null;
        nextBreakAtSeconds = null;
        lastRemainingSeconds = null;
        focusRemainingSeconds = null;
        isBreakRunning = false;
        isPromptOpen = false;
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

    const confirmSessions = (minutes) => new Promise((resolve) => {
        if (!confirmDialog || !confirmBackdrop || !confirmOk || !confirmCancel || !confirmText) {
            const sessions = Math.ceil(minutes / DEFAULTS.sessionMinutes);
            resolve(window.confirm(`${minutes} min = ${sessions} sessions of ${DEFAULTS.sessionMinutes} min each. OK?`));
            return;
        }

        const sessions = Math.ceil(minutes / DEFAULTS.sessionMinutes);
        confirmText.textContent = `${minutes} min = ${sessions} sessions of ${DEFAULTS.sessionMinutes} min each.`;

        const close = (result) => {
            const active = document.activeElement;
            if (confirmDialog && active && confirmDialog.contains(active)) {
                const fallback = document.getElementById('timerChip') || document.body;
                fallback?.focus?.();
            }
            confirmDialog.hidden = true;
            confirmDialog.classList.remove('is-open');
            confirmDialog.setAttribute('aria-hidden', 'true');
            confirmBackdrop.hidden = true;
            confirmOk.removeEventListener('click', onOk);
            confirmCancel.removeEventListener('click', onCancel);
            confirmBackdrop.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeydown);
            resolve(result);
        };

        const onOk = () => close(true);
        const onCancel = () => close(false);
        const onKeydown = (evt) => {
            if (evt.key === 'Escape') {
                evt.preventDefault();
                close(false);
            }
        };

        confirmDialog.hidden = false;
        confirmDialog.classList.add('is-open');
        confirmDialog.setAttribute('aria-hidden', 'false');
        confirmBackdrop.hidden = false;

        confirmOk.addEventListener('click', onOk);
        confirmCancel.addEventListener('click', onCancel);
        confirmBackdrop.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeydown);

        requestAnimationFrame(() => confirmOk.focus({ preventScroll: true }));
    });

    const confirmBreak = () => new Promise((resolve) => {
        if (!breakDialog || !breakBackdrop || !breakOk || !breakCancel || !breakText) {
            resolve(window.confirm(`Take a ${DEFAULTS.breakMinutes}-min break?`));
            return;
        }

        breakText.textContent = 'Do you want to take a break?';

        const close = (result) => {
            const active = document.activeElement;
            if (breakDialog && active && breakDialog.contains(active)) {
                const fallback = document.getElementById('timerChip') || document.body;
                fallback?.focus?.();
            }
            breakDialog.hidden = true;
            breakDialog.classList.remove('is-open');
            breakDialog.setAttribute('aria-hidden', 'true');
            breakBackdrop.hidden = true;
            breakOk.removeEventListener('click', onOk);
            breakCancel.removeEventListener('click', onCancel);
            breakBackdrop.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeydown);
            resolve(result);
        };

        const onOk = () => close(true);
        const onCancel = () => close(false);
        const onKeydown = (evt) => {
            if (evt.key === 'Escape') {
                evt.preventDefault();
                close(false);
            }
        };

        breakDialog.hidden = false;
        breakDialog.classList.add('is-open');
        breakDialog.setAttribute('aria-hidden', 'false');
        breakBackdrop.hidden = false;

        breakOk.addEventListener('click', onOk);
        breakCancel.addEventListener('click', onCancel);
        breakBackdrop.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeydown);

        requestAnimationFrame(() => breakOk.focus({ preventScroll: true }));
    });

    const startFocus = (minutes, taskName) => {
        totalSeconds = minutes * 60;
        nextBreakAtSeconds = DEFAULTS.sessionMinutes * 60;
        if (typeof timer.applyDefaults === 'function') {
            timer.applyDefaults({ breakMinutes: DEFAULTS.breakMinutes });
        }
        timer.setBreakSummaryEnabled(false);
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

    const startBreak = () => {
        if (!Number.isFinite(lastRemainingSeconds) || lastRemainingSeconds <= 0) {
            timer.start();
            return;
        }
        focusRemainingSeconds = lastRemainingSeconds;
        isBreakRunning = true;
        timer.setBreakSummaryEnabled(true);
        timer.setPlannedFocusDuration(focusRemainingSeconds);
        timer.setModeLabel('On a Break');
        timer.setMode('break');
        timer.setDuration(DEFAULTS.breakMinutes * 60);
        timer.start();
    };

    timer.onStart(({ mode }) => {
        if (!isActive) return;
        if (mode === 'focus' && currentTaskName) {
            timer.setModeLabel(`Focusing on ${currentTaskName}`);
        }
        if (mode === 'break') {
            timer.setModeLabel('On a Break');
        }
    });

    timer.onTick((payload) => {
        if (!isActive) return;
        if (!payload || payload.mode !== 'focus') return;
        if (!totalSeconds || isBreakRunning || isPromptOpen) return;

        lastRemainingSeconds = payload.remainingSeconds;
        if (payload.remainingSeconds <= 0) return;

        const elapsed = totalSeconds - payload.remainingSeconds;
        if (elapsed < nextBreakAtSeconds) return;

        isPromptOpen = true;
        timer.pause();
        confirmBreak().then((takeBreak) => {
            isPromptOpen = false;
            nextBreakAtSeconds += DEFAULTS.sessionMinutes * 60;
            if (takeBreak) startBreak();
            else timer.start();
        });
    });

    timer.onComplete(({ mode }) => {
        if (!isActive) return;
        if (mode === 'break' && isBreakRunning) {
            isBreakRunning = false;
            return;
        }

        if (mode === 'focus' && totalSeconds) {
            showNotification('Task complete!', 'success');
            resetState();
        }
    });

    return {
        handleActiveTaskChange: async (task) => {
            if (!task) {
                resetState();
                return;
            }
            const taskId = String(task.id);
            if (taskId === activeTaskId && totalSeconds) return;

            resetState();
            activeTaskId = taskId;
            activeTask = task;

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
