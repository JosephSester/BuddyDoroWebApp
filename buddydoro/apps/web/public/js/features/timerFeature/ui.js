// apps/web/js/features/timerFeature/ui.js
// Render and show/hide the timer UI.

const RING_CIRCUMFERENCE = 2 * Math.PI * 76; // matches r="76" in SVG

const MODE_COLORS = {
    focus:     '#6e8c70', // sage green
    break:     '#c0622a', // terracotta
    longBreak: '#c98a2e', // ochre
};

export const createTimerUI = ({ dom, formatSeconds, state }) => {
    const ringFill  = document.getElementById('timerRingFill');

    const updateUI = () => {
        if (dom.display) dom.display.textContent = formatSeconds(state.remaining);

        // Update countdown ring
        if (ringFill) {
            const progress = state.duration > 0 ? state.remaining / state.duration : 1;
            ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
            ringFill.style.stroke = MODE_COLORS[state.mode] ?? '#6e8c70';
        }

        const atStart = state.remaining === state.duration;
        if (dom.startBtn) {
            dom.startBtn.textContent = state.isRunning ? 'Pause' : (atStart ? 'Start' : 'Resume');
            dom.startBtn.disabled = false;
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
