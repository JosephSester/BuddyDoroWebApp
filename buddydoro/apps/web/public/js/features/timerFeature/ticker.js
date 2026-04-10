// apps/web/js/features/timerFeature/ticker.js
// Interval tick handling and completion.

export const createTicker = ({ state, emit, updateUI }) => {
    let accumMs = 0;

    const tick = (now = performance.now()) => {
        if (!state.isRunning) return;

        if (state.lastTs == null) {
            state.lastTs = now;
            accumMs = 0;
            return;
        }

        accumMs += now - state.lastTs;
        state.lastTs = now;

        const delta = Math.floor(accumMs / 1000);
        if (delta <= 0) return;
        accumMs -= delta * 1000;

        state.remaining = Math.max(0, state.remaining - delta);

        emit('onTick', {
            remainingSeconds: state.remaining,
            elapsedSeconds: state.duration - state.remaining,
            mode: state.mode,
            isRunning: state.isRunning,
        });

        if (state.remaining === 0) {
            state.isRunning = false;
            state.lastTs = null;
            accumMs = 0;
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }
            // Reset before emitting so UI updates show full duration, not 00:00
            state.remaining = state.duration;
            emit('onComplete', { mode: state.mode, duration: state.duration });
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
