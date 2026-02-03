// apps/web/js/features/timer.js
import { initTimerSummary, initBreakSummary } from '../utils/timerSummary.js';

const DEFAULT_MINUTES = { focus: 25, break: 5 };
const LIMITS = { min: 1, max: 180 };
const STORAGE_KEYS = {
  focus: 'focusDefaultMinutes',
  break: 'breakDefaultMinutes',
};

const readStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= LIMITS.min && n <= LIMITS.max) return n;
  } catch { }
  return fallback;
};

const writeStored = (key, val) => {
  try { localStorage.setItem(key, String(val)); } catch { }
};

let focusDefault = readStored(STORAGE_KEYS.focus, DEFAULT_MINUTES.focus);
let breakDefault = readStored(STORAGE_KEYS.break, DEFAULT_MINUTES.break);

let handlers = {
  onTick: [],
  onStart: [],
  onPause: [],
  onReset: [],
  onComplete: [],
  onSummary: [],
};

function emit(type, payload) {
  handlers[type]?.forEach((fn) => {
    try { fn(payload); } catch (e) { console.error(e); }
  });
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function initTimer(hooks = {}) {
  Object.keys(hooks).forEach((k) => {
    if (handlers[k] && typeof hooks[k] === 'function') handlers[k].push(hooks[k]);
  });

  // DOM
  const rightUi = document.querySelector('.right-ui');
  const display = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('startBtn');
  const endBtn = document.getElementById('endBtn');
  const modeLabel = document.getElementById('modeLabel');

  const timerChip = document.getElementById('timerChip');
  const timerLaunchMenu = document.getElementById('timerLaunchMenu');
  const timerLaunchError = document.getElementById('timerLaunchError');
  const timerModeButtons = Array.from(document.querySelectorAll('.timer-mode-option'));
  const timerLaunchBackdrop = document.getElementById('timerLaunchBackdrop');
  const timerLaunchOk = document.getElementById('timerLaunchOk');
  const timerDurationBackdrop = document.getElementById('timerDurationBackdrop');
  const timerDurationMenu = document.getElementById('timerDurationMenu');
  const timerDurationSlider = document.getElementById('timerDurationSlider');
  const timerDurationValue = document.getElementById('timerDurationValue');
  const timerDurationOk = document.getElementById('timerDurationOk');

  // state
  let mode = null; // null = idle
  let isRunning = false;
  let duration = focusDefault * 60;
  let remaining = duration;
  let lastTs = null;
  let intervalId = null;
  let plannedFocusSeconds = null;
  let breakEnabled = true;
  let sessionOriginalSeconds = null;
  let sessionMode = null;
  let pendingDurationSeconds = null;
  let pendingMode = null;

  // ---------------- internal ----------------
  function updateUI() {
    if (display) display.textContent = fmt(remaining);

    const atStart = remaining === duration;
    if (startBtn) startBtn.textContent = isRunning ? 'Pause' : (atStart ? 'Resume' : 'Resume');
    if (startBtn) startBtn.disabled = !mode;
    if (endBtn) endBtn.disabled = !mode;

    if (modeLabel) modeLabel.textContent = mode ? (mode === 'focus' ? 'Focus' : 'Break') : 'Idle';
  }

  function hideTimer() {
    rightUi?.classList.add('is-hidden');
  }

  function showTimer() {
    rightUi?.classList.remove('is-hidden');
  }

  function tick(now = Date.now()) {
    if (!isRunning) return;

    if (lastTs == null) {
      lastTs = now;
      return;
    }

    const delta = Math.floor((now - lastTs) / 1000);
    if (delta <= 0) return;

    remaining = Math.max(0, remaining - delta);
    lastTs = now;

    emit('onTick', {
      remainingSeconds: remaining,
      elapsedSeconds: duration - remaining,
      mode,
      isRunning,
    });

    if (remaining === 0) {
      isRunning = false;
      lastTs = null;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      emit('onComplete', { mode, duration });
      if (mode === 'focus') {
        const elapsedSeconds = duration;
        showSummary(elapsedSeconds);
      } else if (mode === 'break') {
        const elapsedSeconds = duration;
        const minutes = Math.max(0, Math.ceil(elapsedSeconds / 60));
        breakSummary.open({ minutes });
      }
    }

    updateUI();
  }

  function ensureTick() {
    if (!intervalId) intervalId = setInterval(tick, 1000);
  }

  function stopTick() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function validateDefaultValue(raw, label) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return { error: `${label} must be a whole number.` };
    if (parsed < LIMITS.min || parsed > LIMITS.max) {
      return { error: `${label} must be between ${LIMITS.min} and ${LIMITS.max}.` };
    }
    return { value: parsed };
  }

  function applyDefaults({ focusMinutes, breakMinutes } = {}) {
    const prevFocus = focusDefault;
    const prevBreak = breakDefault;

    focusDefault = focusMinutes ?? focusDefault;
    breakDefault = breakMinutes ?? breakDefault;

    writeStored(STORAGE_KEYS.focus, focusDefault);
    writeStored(STORAGE_KEYS.break, breakDefault);

    const prevFocusSec = prevFocus * 60;
    const prevBreakSec = prevBreak * 60;
    const nextFocusSec = focusDefault * 60;
    const nextBreakSec = breakDefault * 60;

    if (mode === 'focus' || mode == null) {
      if (duration === prevFocusSec) duration = nextFocusSec;
      if (remaining === prevFocusSec) remaining = nextFocusSec;
    }

    if (mode === 'break') {
      if (duration === prevBreakSec) duration = nextBreakSec;
      if (remaining === prevBreakSec) remaining = nextBreakSec;
    }

    updateUI();
  }

  function setBreakEnabled(enabled) {
    breakEnabled = !!enabled;
    timerModeButtons.forEach((input) => {
      if (input.dataset.mode !== 'break') return;
      const isDisabled = !breakEnabled;
      input.disabled = isDisabled;
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) label.classList.toggle('is-disabled', isDisabled);
      if (isDisabled && input.checked) input.checked = false;
    });
  }

  // ---------------- public API ----------------
  function start() {
    if (isRunning) return;
    if (!mode) return;

    if (remaining === 0) remaining = duration;

    if (remaining === duration) {
      sessionOriginalSeconds = duration;
      sessionMode = mode;
    }

    isRunning = true;
    lastTs = Date.now();
    ensureTick();
    emit('onStart', { mode });
    showTimer();
    updateUI();
  }

  function pause() {
    if (!isRunning) return;
    isRunning = false;
    lastTs = null;
    stopTick();
    emit('onPause', { mode });
    updateUI();
  }

  function reset() {
    pause();
    remaining = duration;
    emit('onReset');
    updateUI();
  }

  function stop() {
    pause();
    setMode(null);
    hideTimer();
    updateUI();
  }

  function setMode(nextMode) {
    if (nextMode === 'break' && !breakEnabled) return;
    pause();
    mode = nextMode;

    if (mode === 'focus') {
      duration = plannedFocusSeconds ?? focusDefault * 60;
    } else if (mode === 'break') {
      duration = breakDefault * 60;
    } else {
      duration = plannedFocusSeconds ?? focusDefault * 60;
    }

    remaining = duration;
    updateUI();
  }

  function setDuration(seconds) {
    pause();
    const minSeconds = LIMITS.min * 60;
    const maxSeconds = LIMITS.max * 60;
    const safe = Math.max(minSeconds, Math.min(Math.floor(seconds), maxSeconds));
    duration = safe;
    remaining = safe;
    updateUI();
  }

  function setPlannedFocusDuration(seconds, { applyIfIdle = true } = {}) {
    if (seconds == null) {
      plannedFocusSeconds = null;
      if (!isRunning && mode == null && applyIfIdle) {
        duration = focusDefault * 60;
        remaining = duration;
        updateUI();
      }
      return;
    }
    const minSeconds = LIMITS.min * 60;
    const maxSeconds = LIMITS.max * 60;
    plannedFocusSeconds = Math.max(minSeconds, Math.min(Math.floor(seconds), maxSeconds));
    if (!isRunning && mode == null && applyIfIdle) {
      duration = plannedFocusSeconds;
      remaining = plannedFocusSeconds;
      updateUI();
    }
  }

  function resetTimerToDefault() {
    pause();
    if (mode === 'break') {
      duration = breakDefault * 60;
    } else {
      duration = focusDefault * 60;
    }
    remaining = duration;
    updateUI();
  }

  function getFocusDefaultMinutes() {
    return focusDefault;
  }

  function computeDorosEarned(elapsedSeconds) {
    const BLOCK_SECONDS = 5 * 60;
    const DOROS_PER_BLOCK = 50;
    const blocks = Math.floor(elapsedSeconds / BLOCK_SECONDS);
    return blocks * DOROS_PER_BLOCK;
  }

  const summary = initTimerSummary({
    onRestart: () => {
      if (!sessionOriginalSeconds || !sessionMode) return;
      setMode(sessionMode);
      setDuration(sessionOriginalSeconds);
      start();
    },
    onBreak: (minutes) => {
      setMode('break');
      setDuration(minutes * 60);
      start();
    },
    onHome: () => stop(),
    getDefaultBreakMinutes: () => breakDefault,
  });

  const breakSummary = initBreakSummary({
    onResume: () => {
      const nextFocusSeconds = plannedFocusSeconds ?? focusDefault * 60;
      setMode('focus');
      setDuration(nextFocusSeconds);
      start();
    },
    onLater: () => stop(),
  });

  function showSummary(elapsedSeconds) {
    const minutes = Math.max(0, Math.ceil(elapsedSeconds / 60));
    const doros = computeDorosEarned(elapsedSeconds);
    summary.open({ minutes, doros });
    emit('onSummary', { minutes, doros });
  }

  // ---------------- menu wiring ----------------
  let handleDocumentClick;
  let handleKeydown;

  const clearErr = () => { if (!timerLaunchError) return; timerLaunchError.hidden = true; timerLaunchError.textContent = ''; };
  const showErr = (m) => { if (!timerLaunchError) return; timerLaunchError.hidden = false; timerLaunchError.textContent = m; };

  const setSelectedMode = (nextMode) => {
    timerModeButtons.forEach((input) => {
      input.checked = input.dataset.mode === nextMode;
    });
  };

  const closeMenu = ({ focusTrigger = false } = {}) => {
    if (!timerLaunchMenu) return;
    timerLaunchMenu.hidden = true;
    timerLaunchMenu.classList.remove('is-open');
    timerLaunchMenu.setAttribute('aria-hidden', 'true');
    timerChip?.setAttribute('aria-expanded', 'false');
    if (timerLaunchBackdrop) timerLaunchBackdrop.hidden = true;
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleKeydown);
    if (focusTrigger) timerChip?.focus({ preventScroll: true });
  };

  handleDocumentClick = (e) => {
    if (!timerLaunchMenu || !timerChip) return;
    if (timerLaunchMenu.contains(e.target) || timerChip.contains(e.target)) return;
    closeMenu();
  };

  handleKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu({ focusTrigger: true });
    }
  };

  const openMenu = () => {
    if (!timerLaunchMenu || !timerChip) return;
    if (!timerLaunchMenu.hidden) return;
    clearErr();
    setSelectedMode(null);
    pendingMode = null;
    pendingDurationSeconds = null;
    timerLaunchMenu.hidden = false;
    timerLaunchMenu.classList.add('is-open');
    timerLaunchMenu.setAttribute('aria-hidden', 'false');
    timerChip.setAttribute('aria-expanded', 'true');
    if (timerLaunchBackdrop) timerLaunchBackdrop.hidden = false;
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    if (timerLaunchMinutes) requestAnimationFrame(() => timerLaunchMinutes.focus({ preventScroll: true }));
  };

  const wireMenu = () => {
    if (!(timerChip && timerLaunchMenu && timerLaunchOk)) {
      console.warn('[Timer] Launch elements not found - menu wiring skipped');
      return;
    }

    timerChip.addEventListener('click', (e) => {
      e.stopPropagation();
      timerLaunchMenu.hidden ? openMenu() : closeMenu();
    });
    timerChip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        timerLaunchMenu.hidden ? openMenu() : closeMenu();
      }
    });
    timerLaunchBackdrop?.addEventListener('click', () => closeMenu({ focusTrigger: true }));

    const closeDurationMenu = () => {
      if (!timerDurationMenu) return;
      timerDurationMenu.hidden = true;
      timerDurationMenu.classList.remove('is-open');
      timerDurationMenu.setAttribute('aria-hidden', 'true');
      if (timerDurationBackdrop) timerDurationBackdrop.hidden = true;
    };

    const openDurationMenu = (modeKey) => {
      if (!timerDurationMenu || !timerDurationSlider) return;
      const baseMinutes = modeKey === 'break' ? breakDefault : focusDefault;
      timerDurationSlider.value = String(baseMinutes);
      if (timerDurationValue) timerDurationValue.textContent = String(baseMinutes);
      const min = Number(timerDurationSlider.min || LIMITS.min);
      const max = Number(timerDurationSlider.max || LIMITS.max);
      const pct = ((baseMinutes - min) / (max - min)) * 100;
      timerDurationSlider.style.setProperty('--slider-fill', `${pct}%`);
      timerDurationMenu.hidden = false;
      timerDurationMenu.classList.add('is-open');
      timerDurationMenu.setAttribute('aria-hidden', 'false');
      if (timerDurationBackdrop) timerDurationBackdrop.hidden = false;
    };

    const updateSliderFill = () => {
      if (!timerDurationSlider) return;
      const min = Number(timerDurationSlider.min || LIMITS.min);
      const max = Number(timerDurationSlider.max || LIMITS.max);
      const val = Number(timerDurationSlider.value || min);
      const pct = ((val - min) / (max - min)) * 100;
      timerDurationSlider.style.setProperty('--slider-fill', `${pct}%`);
      if (timerDurationValue) timerDurationValue.textContent = String(val);
    };

    timerDurationSlider?.addEventListener('input', updateSliderFill);

    timerDurationOk?.addEventListener('click', () => {
      const minutes = Number.parseInt(timerDurationSlider?.value || '0', 10);
      if (!Number.isFinite(minutes)) return;
      pendingDurationSeconds = Math.max(LIMITS.min, Math.min(minutes, LIMITS.max)) * 60;
      closeDurationMenu();
      if (pendingMode) {
        setMode(pendingMode);
        if (pendingDurationSeconds != null) {
          setDuration(pendingDurationSeconds);
        }
        start();
        pendingMode = null;
      }
    });

    timerDurationBackdrop?.addEventListener('click', closeDurationMenu);

    timerModeButtons.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.disabled) return;
        setSelectedMode(input.dataset.mode);
      });
    });

    timerLaunchOk.addEventListener('click', () => {
      const selected = timerModeButtons.find((input) => input.checked);
      if (!selected) { showErr('Pick Focus or Break.'); return; }

      clearErr();
      pendingMode = selected.dataset.mode;
      closeMenu({ focusTrigger: true });
      openDurationMenu(pendingMode);
    });
  };

  // ---------------- event wiring ----------------
  startBtn?.addEventListener('click', () => {
    isRunning ? pause() : start();
  });
  endBtn?.addEventListener('click', () => {
    if (mode === 'focus') {
      const elapsedSeconds = Math.max(0, duration - remaining);
      pause();
      showSummary(elapsedSeconds);
      return;
    }
    if (mode === 'break') {
      const elapsedSeconds = Math.max(0, duration - remaining);
      pause();
      const minutes = Math.max(0, Math.ceil(elapsedSeconds / 60));
      breakSummary.open({ minutes });
      return;
    }
    stop();
  });

  wireMenu();
  setBreakEnabled(breakEnabled);
  hideTimer();
  updateUI();

  return {
    // lifecycle
    start,
    pause,
    reset,
    stop,

    // config
    setMode,
    setDuration,
    setPlannedFocusDuration,

    // compatibility helpers
    applyDefaults,
    resetTimerToDefault,
    setBreakEnabled,
    getFocusDefaultMinutes,

    // event hooks (optional late binding)
    onTick: (fn) => handlers.onTick.push(fn),
    onStart: (fn) => handlers.onStart.push(fn),
    onPause: (fn) => handlers.onPause.push(fn),
    onReset: (fn) => handlers.onReset.push(fn),
    onComplete: (fn) => handlers.onComplete.push(fn),
    onSummary: (fn) => handlers.onSummary.push(fn),
  };
}
