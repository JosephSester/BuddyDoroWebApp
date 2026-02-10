// apps/web/js/features/timerFeature/manualPomodoroLogic.js
import { showNotification } from '../../utils/notifications.js';

const DEFAULTS = { sessionMinutes: 1 };
const LIMITS = { min: 1, max: 180 };

export function initManualPomodoroLogic({ timer, onManualRunningChange } = {}) {
    if (!timer) throw new Error('Timer is required for pomodoro logic.');

    const confirmBackdrop = document.getElementById('pomodoroConfirmBackdrop');
    const confirmDialog = document.getElementById('pomodoroConfirmDialog');
    const confirmText = document.getElementById('pomodoroConfirmText');
    const confirmOk = document.getElementById('pomodoroConfirmOk');
    const confirmCancel = document.getElementById('pomodoroConfirmCancel');
    let totalSeconds = null;
    let isActive = false;
    let manualRunning = false;

    const setManualRunning = (next) => {
        if (manualRunning === next) return;
        manualRunning = next;
        if (typeof onManualRunningChange === 'function') {
            try { onManualRunningChange(manualRunning); } catch { }
        }
    };

    const resetState = () => {
        setManualRunning(false);
        totalSeconds = null;
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

    const startFocus = (minutes) => {
        totalSeconds = minutes * 60;
        timer.setBreakSummaryEnabled(false);
        timer.setPlannedFocusDuration(totalSeconds);
        timer.setModeLabel(null);
        isActive = true;
        timer.setMode('focus');
        timer.setDuration(totalSeconds);
        timer.setRemaining(totalSeconds);
        timer.start();
    };

    timer.onStart(({ mode }) => {
        if (!isActive) return;
        setManualRunning(true);
    });

    timer.onPause?.(() => {
        if (isActive) {
            setManualRunning(false);
        }
    });

    timer.onReset?.(() => {
        if (isActive) {
            setManualRunning(false);
        }
    });

    timer.onComplete(({ mode }) => {
        if (!isActive) return;
        if (mode === 'focus' && totalSeconds) {
            showNotification('Task complete!', 'success');
            setManualRunning(false);
            resetState();
        }
    });

    return {
        startManualFocus: async () => {
            resetState();

            while (true) {
                const minutes = await readMinutes('Set minutes');
                if (!minutes) {
                    resetState();
                    return;
                }
                const confirmed = await confirmSessions(minutes);
                if (confirmed) {
                    startFocus(minutes);
                    return;
                }
            }
        },
        stop: () => resetState(),
    };
}
