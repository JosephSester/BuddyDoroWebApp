// apps/web/js/features/timerFeature/manualPomodoroLogic.js
// Stub — manual focus is now handled directly via the mode chips in the timer UI.

export function initManualPomodoroLogic({ timer } = {}) {
    return {
        startManualFocus: () => {
            // No-op: users now use the Focus chip + Start button directly.
        },
        stop: () => {
            timer?.setModeLabel?.(null);
        },
    };
}
