// apps/web/js/features/timerFeature/state.js
// Plain object state for timer runtime.

export const createTimerState = ({ focusDefault, breakDefault, longBreakDefault } = {}) => ({
    mode: 'focus',
    isRunning: false,
    duration: focusDefault * 60,
    remaining: focusDefault * 60,
    lastTs: null,
    intervalId: null,
    plannedFocusSeconds: null,
    labelOverride: null,
    focusDefault,
    breakDefault,
    longBreakDefault,
});
