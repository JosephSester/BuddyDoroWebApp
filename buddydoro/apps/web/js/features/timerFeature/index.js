// apps/web/js/features/timerFeature/index.js
// Timer composition root.
import { DEFAULT_MINUTES, LIMITS, STORAGE_KEYS } from './constants.js';
import { readStored, writeStored } from './storage.js';
import { formatSeconds } from './format.js';
import { initTimerSummaries } from './summary.js';
import { initTimerMenus } from './menu.js';
import { createEventBus } from './events.js';
import { getTimerDom } from './dom.js';
import { createTimerState } from './state.js';
import { createTimerUI } from './ui.js';
import { createTicker } from './ticker.js';
import { createTimerControls } from './controls.js';
import { createTimerSettings } from './settings.js';

export function initTimer(hooks = {}) {
    const focusDefault = readStored(STORAGE_KEYS.focus, DEFAULT_MINUTES.focus, LIMITS);
    const breakDefault = readStored(STORAGE_KEYS.break, DEFAULT_MINUTES.break, LIMITS);

    const bus = createEventBus(hooks);
    const dom = getTimerDom();
    const state = createTimerState({ focusDefault, breakDefault });
    const ui = createTimerUI({ dom, formatSeconds, state });

    const { breakSummary, showSummary } = initTimerSummaries({
        onRestart: () => {
            if (!state.sessionOriginalSeconds || !state.sessionMode) return;
            controls.setMode(state.sessionMode);
            controls.setDuration(state.sessionOriginalSeconds);
            controls.start();
            bus.emit('onSummaryRestart');
        },
        onBreak: () => {
            state.showBreakSummary = true;
            controls.setMode('break');
            controls.setDuration(DEFAULT_MINUTES.break * 60);
            controls.start();
            bus.emit('onSummaryBreak', { minutes: DEFAULT_MINUTES.break });
        },
        onHome: () => {
            controls.stop();
            bus.emit('onSummaryHome');
        },
        onResume: () => {
            const nextFocusSeconds = state.plannedFocusSeconds ?? state.focusDefault * 60;
            controls.setMode('focus');
            controls.setDuration(nextFocusSeconds);
            controls.start();
            bus.emit('onBreakResume');
        },
        onLater: () => {
            controls.stop();
            bus.emit('onBreakLater');
        },
        getDefaultBreakMinutes: () => state.breakDefault,
        onSummary: (payload) => bus.emit('onSummary', payload),
    });

    const ticker = createTicker({
        state,
        emit: bus.emit,
        showSummary,
        breakSummary,
        updateUI: ui.updateUI,
    });

    const controls = createTimerControls({
        state,
        emit: bus.emit,
        updateUI: ui.updateUI,
        showTimer: ui.showTimer,
        hideTimer: ui.hideTimer,
        ensureTick: ticker.ensureTick,
        stopTick: ticker.stopTick,
        limits: LIMITS,
    });

    const menus = initTimerMenus({
        elements: dom.elements,
        limits: LIMITS,
        getFocusDefaultMinutes: () => state.focusDefault,
        getBreakDefaultMinutes: () => state.breakDefault,
        onStartWithDuration: (nextMode, durationSeconds) => {
            controls.setMode(nextMode);
            if (durationSeconds != null) {
                controls.setDuration(durationSeconds);
            }
            controls.start();
        },
    });

    const settings = createTimerSettings({
        state,
        limits: LIMITS,
        updateUI: ui.updateUI,
        writeStored,
        storageKeys: STORAGE_KEYS,
        setBreakEnabledUI: () => { },
    });

    const setModeLabel = (text) => {
        state.labelOverride = text ? String(text) : null;
        ui.updateUI();
    };

    dom.startBtn?.addEventListener('click', () => {
        state.isRunning ? controls.pause() : controls.start();
    });

    dom.endBtn?.addEventListener('click', () => {
        if (state.mode === 'focus') {
            const elapsedSeconds = Math.max(0, state.duration - state.remaining);
            controls.pause();
            showSummary(elapsedSeconds);
            return;
        }
        if (state.mode === 'break') {
            const elapsedSeconds = Math.max(0, state.duration - state.remaining);
            controls.pause();
            const minutes = Math.max(0, Math.ceil(elapsedSeconds / 60));
            if (state.showBreakSummary) {
                breakSummary.open({ minutes });
                return;
            }
            controls.stop();
            return;
        }
        controls.stop();
    });

    menus.wireMenu();
    ui.hideTimer();
    ui.updateUI();

    return {
        start: controls.start,
        pause: controls.pause,
        reset: controls.reset,
        stop: controls.stop,
        setMode: controls.setMode,
        setDuration: controls.setDuration,
        setPlannedFocusDuration: controls.setPlannedFocusDuration,
        applyDefaults: settings.applyDefaults,
        resetTimerToDefault: controls.resetTimerToDefault,
        setBreakEnabled: settings.setBreakEnabled,
        getFocusDefaultMinutes: settings.getFocusDefaultMinutes,
        setRemaining: controls.setRemaining,
        setBreakSummaryEnabled: settings.setBreakSummaryEnabled,
        setModeLabel,
        onTick: (fn) => bus.on('onTick', fn),
        onStart: (fn) => bus.on('onStart', fn),
        onPause: (fn) => bus.on('onPause', fn),
        onStop: (fn) => bus.on('onStop', fn),
        onReset: (fn) => bus.on('onReset', fn),
        onComplete: (fn) => bus.on('onComplete', fn),
        onSummary: (fn) => bus.on('onSummary', fn),
        onSummaryRestart: (fn) => bus.on('onSummaryRestart', fn),
        onSummaryBreak: (fn) => bus.on('onSummaryBreak', fn),
        onSummaryHome: (fn) => bus.on('onSummaryHome', fn),
        onBreakResume: (fn) => bus.on('onBreakResume', fn),
        onBreakLater: (fn) => bus.on('onBreakLater', fn),
        openDurationMenu: menus.openDurationMenu,
        openBreakDurationMenu: menus.openBreakDurationMenu,
        setLaunchHandler: menus.setLaunchHandler,
    };
}
