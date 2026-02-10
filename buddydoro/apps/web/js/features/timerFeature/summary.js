// apps/web/js/features/timerFeature/summary.js
// Summary dialogs and doros calculation.
import { initTimerSummary, initBreakSummary } from '../../utils/timerSummary.js';

const computeDorosEarned = (elapsedSeconds) => {
    const BLOCK_SECONDS = 5 * 60;
    const DOROS_PER_BLOCK = 50;
    const blocks = Math.floor(elapsedSeconds / BLOCK_SECONDS);
    return blocks * DOROS_PER_BLOCK;
};

export const initTimerSummaries = ({
    onRestart,
    onBreak,
    onHome,
    onResume,
    onLater,
    getDefaultBreakMinutes,
    onSummary,
} = {}) => {
    const summary = initTimerSummary({
        onRestart,
        onBreak,
        onHome,
        getDefaultBreakMinutes,
    });

    const breakSummary = initBreakSummary({
        onResume,
        onLater,
    });

    const showSummary = (elapsedSeconds) => {
        const minutes = Math.max(0, Math.ceil(elapsedSeconds / 60));
        const doros = computeDorosEarned(elapsedSeconds);
        summary.open({ minutes, doros });
        onSummary?.({ minutes, doros });
    };

    return { summary, breakSummary, showSummary };
};
