// apps/web/js/features/timerFeature/manualPomodoroLogic.js
import { showNotification } from '../../utils/notifications.js';
import { confirmSessions } from './dialogs.js';

const DEFAULTS = { sessionMinutes: 1 };
const LIMITS = { min: 1, max: 180 };

export function initManualPomodoroLogic({ timer, onManualRunningChange } = {}) {
    if (!timer) throw new Error('Timer is required for pomodoro logic.');

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
                if (!minutes) { resetState(); return; }
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
