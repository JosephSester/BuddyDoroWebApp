// apps/web/js/features/timerFeature/dialogs.js
// Shared pomodoro confirmation dialog used by both manual and task pomodoro flows.

const IDS = {
    backdrop: 'pomodoroConfirmBackdrop',
    dialog: 'pomodoroConfirmDialog',
    text: 'pomodoroConfirmText',
    ok: 'pomodoroConfirmOk',
    cancel: 'pomodoroConfirmCancel',
};

/**
 * Opens the shared session-confirm dialog.
 * Returns a Promise<boolean>: true = confirmed, false = cancelled.
 * Resolves false immediately if the dialog is already visible (prevents listener stacking).
 */
export const confirmSessions = (minutes, { sessionMinutes = 1 } = {}) => new Promise((resolve) => {
    const backdrop = document.getElementById(IDS.backdrop);
    const dialog   = document.getElementById(IDS.dialog);
    const text     = document.getElementById(IDS.text);
    const ok       = document.getElementById(IDS.ok);
    const cancel   = document.getElementById(IDS.cancel);

    if (!dialog || !backdrop || !ok || !cancel || !text) {
        const sessions = Math.ceil(minutes / sessionMinutes);
        resolve(window.confirm(`${minutes} min = ${sessions} sessions of ${sessionMinutes} min each. OK?`));
        return;
    }

    // Guard: don't stack listeners if dialog is already open
    if (!dialog.hidden) {
        resolve(false);
        return;
    }

    const sessions = Math.ceil(minutes / sessionMinutes);
    text.textContent = `${minutes} min = ${sessions} sessions of ${sessionMinutes} min each.`;

    const close = (result) => {
        const active = document.activeElement;
        if (dialog.contains(active)) {
            (document.getElementById('timerChip') || document.body).focus?.();
        }
        dialog.hidden = true;
        dialog.classList.remove('is-open');
        dialog.setAttribute('aria-hidden', 'true');
        backdrop.hidden = true;
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKeydown);
        resolve(result);
    };

    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onKeydown = (evt) => {
        if (evt.key === 'Escape') { evt.preventDefault(); close(false); }
    };

    dialog.hidden = false;
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;

    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    backdrop.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeydown);

    requestAnimationFrame(() => ok.focus({ preventScroll: true }));
});
