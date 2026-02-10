// apps/web/js/features/timerFeature/ui.js
// Render and show/hide the timer UI.

export const createTimerUI = ({ dom, formatSeconds, state }) => {
    const updateUI = () => {
        if (dom.display) dom.display.textContent = formatSeconds(state.remaining);

        const atStart = state.remaining === state.duration;
        if (dom.startBtn) dom.startBtn.textContent = state.isRunning ? 'Pause' : (atStart ? 'Resume' : 'Resume');
        if (dom.startBtn) dom.startBtn.disabled = !state.mode;
        if (dom.endBtn) dom.endBtn.disabled = !state.mode;

        if (dom.modeLabel) {
            const fallback = state.mode ? (state.mode === 'focus' ? 'Focus' : 'Break') : 'Idle';
            dom.modeLabel.textContent = state.labelOverride || fallback;
        }
    };

    const hideTimer = () => {
        dom.rightUi?.classList.add('is-hidden');
    };

    const showTimer = () => {
        dom.rightUi?.classList.remove('is-hidden');
    };

    return { updateUI, hideTimer, showTimer };
};
