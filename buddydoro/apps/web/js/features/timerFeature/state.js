// apps/web/js/features/timerFeature/state.js
// Plain object state for timer runtime.

export const createTimerState = ({ focusDefault, breakDefault } = {}) => ({
    mode: null,
    isRunning: false,
    duration: focusDefault * 60,
    remaining: focusDefault * 60,
    lastTs: null,
    intervalId: null,
    plannedFocusSeconds: null,
    breakEnabled: true,
    showBreakSummary: true,
    sessionOriginalSeconds: null,
    sessionMode: null,
    labelOverride: null,
    focusDefault,
    breakDefault,
});
