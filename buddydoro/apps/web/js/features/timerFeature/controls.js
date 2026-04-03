// apps/web/js/features/timerFeature/controls.js
// Start/pause/stop and duration setters.

export const createTimerControls = ({ state, emit, updateUI, showTimer, ensureTick, stopTick, limits } = {}) => {
    const start = () => {
        if (state.isRunning) return;
        if (!state.mode) return;

        if (state.remaining === 0) state.remaining = state.duration;

        if (state.remaining === state.duration) {
            state.sessionOriginalSeconds = state.duration;
            state.sessionMode = state.mode;
        }

        state.isRunning = true;
        state.lastTs = performance.now();
        ensureTick();
        emit('onStart', { mode: state.mode });
        showTimer();
        updateUI();
    };

    const pause = () => {
        if (!state.isRunning) return;
        state.isRunning = false;
        state.lastTs = null;
        stopTick();
        emit('onPause', { mode: state.mode });
        updateUI();
    };

    const reset = () => {
        pause();
        state.remaining = state.duration;
        emit('onReset');
        updateUI();
    };

    const stop = () => {
        pause();
        state.mode = 'focus';
        state.duration = state.plannedFocusSeconds ?? state.focusDefault * 60;
        state.remaining = state.duration;
        state.labelOverride = null;
        emit('onStop');
        updateUI();
    };

    const setMode = (nextMode) => {
        pause();
        state.mode = nextMode;

        if (state.mode === 'break') {
            state.labelOverride = 'On a Break';
        } else if (state.mode === 'longBreak') {
            state.labelOverride = null;
        } else if (state.labelOverride === 'On a Break') {
            state.labelOverride = null;
        }

        if (state.mode === 'focus') {
            state.duration = state.plannedFocusSeconds ?? state.focusDefault * 60;
        } else if (state.mode === 'break') {
            state.duration = state.breakDefault * 60;
        } else if (state.mode === 'longBreak') {
            state.duration = (state.longBreakDefault ?? 15) * 60;
        } else {
            state.duration = state.focusDefault * 60;
        }

        state.remaining = state.duration;
        updateUI();
    };

    const setDuration = (seconds) => {
        pause();
        const minSeconds = limits.min * 60;
        const maxSeconds = limits.max * 60;
        const safe = Math.max(minSeconds, Math.min(Math.floor(seconds), maxSeconds));
        state.duration = safe;
        state.remaining = safe;
        updateUI();
    };

    const setPlannedFocusDuration = (seconds, { applyIfIdle = true } = {}) => {
        if (seconds == null) {
            state.plannedFocusSeconds = null;
            if (!state.isRunning && state.mode == null && applyIfIdle) {
                state.duration = state.focusDefault * 60;
                state.remaining = state.duration;
                updateUI();
            }
            return;
        }
        const minSeconds = limits.min * 60;
        const maxSeconds = limits.max * 60;
        state.plannedFocusSeconds = Math.max(minSeconds, Math.min(Math.floor(seconds), maxSeconds));
        if (!state.isRunning && state.mode == null && applyIfIdle) {
            state.duration = state.plannedFocusSeconds;
            state.remaining = state.plannedFocusSeconds;
            updateUI();
        }
    };

    const resetTimerToDefault = () => {
        pause();
        if (state.mode === 'break') {
            state.duration = state.breakDefault * 60;
        } else {
            state.duration = state.focusDefault * 60;
        }
        state.remaining = state.duration;
        updateUI();
    };

    const setRemaining = (seconds) => {
        const safe = Math.max(0, Math.min(Math.floor(seconds), state.duration));
        state.remaining = safe;
        updateUI();
    };

    return {
        start,
        pause,
        reset,
        stop,
        setMode,
        setDuration,
        setPlannedFocusDuration,
        resetTimerToDefault,
        setRemaining,
    };
};
