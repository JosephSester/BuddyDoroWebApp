// apps/web/js/features/timerFeature/events.js
// Lightweight event bus for timer hooks.

export const createEventBus = (hooks = {}) => {
    const handlers = {
        onTick: [],
        onStart: [],
        onPause: [],
        onStop: [],
        onReset: [],
        onComplete: [],
        onSummary: [],
        onSummaryRestart: [],
        onSummaryBreak: [],
        onSummaryHome: [],
        onBreakResume: [],
        onBreakLater: [],
    };

    Object.keys(hooks).forEach((key) => {
        if (handlers[key] && typeof hooks[key] === 'function') handlers[key].push(hooks[key]);
    });

    const emit = (type, payload) => {
        handlers[type]?.forEach((fn) => {
            try { fn(payload); } catch (e) { console.error(e); }
        });
    };

    const on = (type, fn) => {
        handlers[type]?.push(fn);
    };

    return { handlers, emit, on };
};
