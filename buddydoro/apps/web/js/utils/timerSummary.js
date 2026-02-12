// apps/web/js/utils/timerSummary.js

export function initTimerSummary({
    onRestart,
    onBreak,
    onHome,
    getDefaultBreakMinutes,
} = {}) {
    const timerSummaryBackdrop = document.getElementById('timerSummaryBackdrop');
    const timerSummaryDialog = document.getElementById('timerSummaryDialog');
    const timerSummaryMinutes = document.getElementById('timerSummaryMinutes');
    const timerSummaryDoros = document.getElementById('timerSummaryDoros');
    const timerSummaryRestart = document.getElementById('timerSummaryRestart');
    const timerSummaryBreak = document.getElementById('timerSummaryBreak');
    const timerSummaryHome = document.getElementById('timerSummaryHome');
    const timerBreakPrompt = document.getElementById('timerBreakPrompt');

    const canRender = timerSummaryDialog && timerSummaryBackdrop;

    const close = () => {
        if (!canRender) return;
        const active = document.activeElement;
        if (timerSummaryDialog && active && timerSummaryDialog.contains(active)) {
            const fallback = document.getElementById('timerChip') || document.body;
            fallback?.focus?.();
        }
        timerSummaryDialog.hidden = true;
        timerSummaryDialog.classList.remove('is-open');
        timerSummaryDialog.setAttribute('aria-hidden', 'true');
        timerSummaryBackdrop.hidden = true;
        if (timerBreakPrompt) timerBreakPrompt.hidden = true;
    };

    const open = ({ minutes, doros } = {}) => {
        if (!canRender) return;
        if (timerSummaryMinutes) timerSummaryMinutes.textContent = String(minutes ?? 0);
        if (timerSummaryDoros) timerSummaryDoros.textContent = String(doros ?? 0);
        if (timerBreakPrompt) timerBreakPrompt.hidden = true;

        timerSummaryDialog.hidden = false;
        timerSummaryDialog.classList.add('is-open');
        timerSummaryDialog.setAttribute('aria-hidden', 'false');
        timerSummaryBackdrop.hidden = false;
    };

    const showBreakPrompt = () => {
        if (!timerBreakPrompt) return;
        timerBreakPrompt.hidden = false;

        const fallback = typeof getDefaultBreakMinutes === 'function'
            ? getDefaultBreakMinutes()
            : undefined;

        if (Number.isFinite(fallback)) {
            close();
            onBreak?.(fallback);
        }
    };

    timerSummaryHome?.addEventListener('click', () => {
        close();
        onHome?.();
    });

    timerSummaryRestart?.addEventListener('click', () => {
        close();
        onRestart?.();
    });

    timerSummaryBreak?.addEventListener('click', () => {
        showBreakPrompt();
    });

    return { open, close };
}

export function initBreakSummary({
    onResume,
    onLater,
} = {}) {
    const breakBackdrop = document.getElementById('breakSummaryBackdrop');
    const breakDialog = document.getElementById('breakSummaryDialog');
    const breakMinutes = document.getElementById('breakSummaryMinutes');
    const breakResume = document.getElementById('breakSummaryResume');
    const breakLater = document.getElementById('breakSummaryLater');

    const canRender = breakDialog && breakBackdrop;

    const close = () => {
        if (!canRender) return;
        const active = document.activeElement;
        if (breakDialog && active && breakDialog.contains(active)) {
            const fallback = document.getElementById('timerChip') || document.body;
            fallback?.focus?.();
        }
        breakDialog.hidden = true;
        breakDialog.classList.remove('is-open');
        breakDialog.setAttribute('aria-hidden', 'true');
        breakBackdrop.hidden = true;
    };

    const open = ({ minutes } = {}) => {
        if (!canRender) return;
        if (breakMinutes) breakMinutes.textContent = String(minutes ?? 0);
        breakDialog.hidden = false;
        breakDialog.classList.add('is-open');
        breakDialog.setAttribute('aria-hidden', 'false');
        breakBackdrop.hidden = false;
    };

    breakResume?.addEventListener('click', () => {
        close();
        onResume?.();
    });

    breakLater?.addEventListener('click', () => {
        close();
        onLater?.();
    });

    return { open, close };
}
