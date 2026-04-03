// apps/web/js/features/timerFeature/index.js
// Simplified classic Pomodoro timer — Focus / Short Break / Long Break.
import { DEFAULT_MINUTES, LIMITS, STORAGE_KEYS } from './constants.js';
import { saveTimerSession, loadTimerSession, clearTimerSession } from './storage.js';
import { formatSeconds } from './format.js';
import { createEventBus } from './events.js';
import { getTimerDom } from './dom.js';
import { createTimerState } from './state.js';
import { createTimerUI } from './ui.js';
import { createTicker } from './ticker.js';
import { createTimerControls } from './controls.js';
import { createTimerSettings } from './settings.js';

export function initTimer(hooks = {}) {
    const focusDefault     = DEFAULT_MINUTES.focus;
    const breakDefault     = DEFAULT_MINUTES.break;
    const longBreakDefault = DEFAULT_MINUTES.longBreak;

    const bus  = createEventBus(hooks);
    const dom  = getTimerDom();
    const state = createTimerState({ focusDefault, breakDefault, longBreakDefault });
    const ui   = createTimerUI({ dom, formatSeconds, state });

    const ticker = createTicker({ state, emit: bus.emit, updateUI: ui.updateUI });

    const controls = createTimerControls({
        state,
        emit: bus.emit,
        updateUI: ui.updateUI,
        showTimer: ui.showTimer,
        ensureTick: ticker.ensureTick,
        stopTick: ticker.stopTick,
        limits: LIMITS,
    });

    const timerSettings = createTimerSettings({
        state,
        limits: LIMITS,
        updateUI: ui.updateUI,
        writeStored: (key, val) => { try { localStorage.setItem(key, String(val)); } catch {} },
        storageKeys: STORAGE_KEYS,
        setBreakEnabledUI: () => {},
    });

    // ── Mode chips (Focus / Short Break / Long Break) ──────────────────────
    const modeChipEls = document.querySelectorAll('.mode-chips .chip[data-mode]');

    function activateChip(mode) {
        modeChipEls.forEach(chip =>
            chip.classList.toggle('is-active', chip.dataset.mode === mode)
        );
    }

    modeChipEls.forEach(chip => {
        chip.addEventListener('click', () => {
            const mode    = chip.dataset.mode;
            const minutes = parseInt(chip.dataset.minutes, 10);
            controls.setMode(mode);
            controls.setDuration(minutes * 60);
            activateChip(mode);
        });
    });

    // ── Start / Pause button ───────────────────────────────────────────────
    dom.startBtn?.addEventListener('click', () => {
        state.isRunning ? controls.pause() : controls.start();
    });

    // ── Session restore ────────────────────────────────────────────────────
    const savedSession = loadTimerSession();
    if (savedSession?.mode) {
        state.mode      = savedSession.mode;
        state.duration  = savedSession.duration;
        state.remaining = savedSession.remaining;
        state.labelOverride = savedSession.labelOverride;
        activateChip(savedSession.mode);
    } else {
        activateChip('focus');
    }

    ui.showTimer();
    ui.updateUI();

    bus.on('onPause',    () => { if (state.mode && state.remaining > 60) saveTimerSession(state); });
    bus.on('onStop',     () => clearTimerSession());
    bus.on('onComplete', () => {
        clearTimerSession();
        activateChip(state.mode); // keep same chip highlighted after reset
        ui.updateUI();
    });

    window.addEventListener('beforeunload', () => {
        if (state.mode && state.remaining > 60) saveTimerSession(state);
    });

    // ── Public API ─────────────────────────────────────────────────────────
    const setModeLabel = (text) => {
        state.labelOverride = text ? String(text) : null;
        ui.updateUI();
    };

    return {
        start:                  controls.start,
        pause:                  controls.pause,
        stop:                   controls.stop,
        reset:                  controls.reset,
        setMode:                controls.setMode,
        setDuration:            controls.setDuration,
        setPlannedFocusDuration: controls.setPlannedFocusDuration,
        resetTimerToDefault:    controls.resetTimerToDefault,
        setRemaining:           controls.setRemaining,
        applyDefaults:          timerSettings.applyDefaults,
        getMode:                () => state.mode,
        setModeLabel,
        activateChip,
        onTick:     (fn) => bus.on('onTick', fn),
        onStart:    (fn) => bus.on('onStart', fn),
        onPause:    (fn) => bus.on('onPause', fn),
        onStop:     (fn) => bus.on('onStop', fn),
        onComplete: (fn) => bus.on('onComplete', fn),
    };
}
