// apps/web/js/features/timerFeature/storage.js
// LocalStorage helpers with input validation.

export const readStored = (key, fallback, limits) => {
    try {
        const raw = localStorage.getItem(key);
        const n = Number.parseInt(raw, 10);
        if (Number.isInteger(n) && n >= limits.min && n <= limits.max) return n;
    } catch { }
    return fallback;
};

export const writeStored = (key, val) => {
    try { localStorage.setItem(key, String(val)); } catch { }
};
