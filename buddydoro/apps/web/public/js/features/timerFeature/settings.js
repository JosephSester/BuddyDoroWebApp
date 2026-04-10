// apps/web/js/features/timerFeature/settings.js
// Defaults and toggle settings for timer.

export const createTimerSettings = ({ state, limits, updateUI, writeStored, storageKeys, setBreakEnabledUI } = {}) => {
    const applyDefaults = ({ focusMinutes, breakMinutes } = {}) => {
        const prevFocus = state.focusDefault;
        const prevBreak = state.breakDefault;

        state.focusDefault = focusMinutes ?? state.focusDefault;
        state.breakDefault = breakMinutes ?? state.breakDefault;

        writeStored(storageKeys.focus, state.focusDefault);
        writeStored(storageKeys.break, state.breakDefault);

        const prevFocusSec = prevFocus * 60;
        const prevBreakSec = prevBreak * 60;
        const nextFocusSec = state.focusDefault * 60;
        const nextBreakSec = state.breakDefault * 60;

        if (state.mode === 'focus' || state.mode == null) {
            if (state.duration === prevFocusSec) state.duration = nextFocusSec;
            if (state.remaining === prevFocusSec) state.remaining = nextFocusSec;
        }

        if (state.mode === 'break') {
            if (state.duration === prevBreakSec) state.duration = nextBreakSec;
            if (state.remaining === prevBreakSec) state.remaining = nextBreakSec;
        }

        updateUI();
    };

    const setBreakEnabled = (enabled) => {
        state.breakEnabled = !!enabled;
        setBreakEnabledUI(state.breakEnabled);
    };

    const setBreakSummaryEnabled = (enabled) => {
        state.showBreakSummary = !!enabled;
    };

    const getFocusDefaultMinutes = () => state.focusDefault;
    const getBreakDefaultMinutes = () => state.breakDefault;

    return {
        applyDefaults,
        setBreakEnabled,
        setBreakSummaryEnabled,
        getFocusDefaultMinutes,
        getBreakDefaultMinutes,
    };
};
