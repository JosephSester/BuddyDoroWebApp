// apps/web/js/features/timerFeature/storage.js
// LocalStorage helpers with input validation.

const SESSION_KEY = 'buddydoro_timer_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // discard sessions older than 24 h
const SESSION_MIN_REMAINING = 60; // don't restore if < 1 minute left

export const saveTimerSession = (state) => {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            mode: state.mode,
            remaining: state.remaining,
            duration: state.duration,
            labelOverride: state.labelOverride ?? null,
            savedAt: Date.now(),
        }));
    } catch { }
};

export const loadTimerSession = () => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.mode || !Number.isFinite(data.remaining) || data.remaining < SESSION_MIN_REMAINING) return null;
        if (data.savedAt && (Date.now() - data.savedAt) > SESSION_MAX_AGE_MS) {
            clearTimerSession();
            return null;
        }
        return data;
    } catch { return null; }
};

export const clearTimerSession = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch { }
};

export const readStored = (key, fallback, limits) => {
    try {
        const raw = localStorage.getItem(key);
        const n = Number.parseInt(raw, 10);
        if (Number.isInteger(n) && n >= limits.min && n <= limits.max) return n;
    } catch { }
    return fallback;
};

export const writeStored = (key, val) => {
    try {
        localStorage.setItem(key, String(val));
    } catch (e) {
        if (e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('[Timer] localStorage quota exceeded — timer settings could not be saved.');
        }
    }
};
