// apps/web/js/features/timerFeature/ticker.js
// Interval tick handling and completion.

export const createTicker = ({ state, emit, showSummary, breakSummary, updateUI }) => {
    const tick = (now = Date.now()) => {
        if (!state.isRunning) return;

        if (state.lastTs == null) {
            state.lastTs = now;
            return;
        }

        const delta = Math.floor((now - state.lastTs) / 1000);
        if (delta <= 0) return;

        state.remaining = Math.max(0, state.remaining - delta);
        state.lastTs = now;

        emit('onTick', {
            remainingSeconds: state.remaining,
            elapsedSeconds: state.duration - state.remaining,
            mode: state.mode,
            isRunning: state.isRunning,
        });

        if (state.remaining === 0) {
            state.isRunning = false;
            state.lastTs = null;
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }
            emit('onComplete', { mode: state.mode, duration: state.duration });
            if (state.mode === 'focus') {
                const elapsedSeconds = state.duration;
                showSummary(elapsedSeconds);
            } else if (state.mode === 'break') {
                const elapsedSeconds = state.duration;
                const minutes = Math.max(0, Math.ceil(elapsedSeconds / 60));
                if (state.showBreakSummary) breakSummary.open({ minutes });
            }
        }

        updateUI();
    };

    const ensureTick = () => {
        if (!state.intervalId) state.intervalId = setInterval(tick, 1000);
    };

    const stopTick = () => {
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
    };

    return { tick, ensureTick, stopTick };
};
