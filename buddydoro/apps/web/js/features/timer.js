// Timer + menu + defaults persistence
const DEFAULT_MINUTES = { focus: 25, break: 5 };
const DEFAULT_LIMITS = { min: 1, max: 180 };
const STORAGE_KEYS = {
  focus: 'focusDefaultMinutes',
  break: 'breakDefaultMinutes',
};

const readStored = (key, fb) => {
  try {
    const raw = localStorage.getItem(key);
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= DEFAULT_LIMITS.min && n <= DEFAULT_LIMITS.max) return n;
  } catch { }
  return fb;
};
const writeStored = (key, val) => { try { localStorage.setItem(key, String(val)); } catch { } };

let focusDefault = readStored(STORAGE_KEYS.focus, DEFAULT_MINUTES.focus);
let breakDefault = readStored(STORAGE_KEYS.break, DEFAULT_MINUTES.break);

const MODES = {
  study: { label: 'Study Timer', duration: focusDefault * 60 },
  break: { label: 'Break', duration: breakDefault * 60 },
};

const state = {
  duration: MODES.study.duration,
  remaining: MODES.study.duration,
  running: false,
  lastUpdated: null,
};

let currentMode = 'study';
let tickId = null;
let breakEnabled = true;

// DOM
let display, startBtn, resetBtn, modeLabel, chipEls;
let timerMenuBtn, timerMenu, timerMenuForm, timerMenuCancel, timerMenuError;
let timerStudyInput, timerBreakInput;

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const anyRunning = () => state.running;

function ensureTick() {
  if (!tickId) tickId = setInterval(() => { updateNow(); paint(); }, 1000);
}
function maybeStopTick() {
  if (!anyRunning() && tickId) { clearInterval(tickId); tickId = null; }
}
function updateNow(now = Date.now()) {
  if (!state.running) return;
  if (state.lastUpdated == null) { state.lastUpdated = now; return; }
  const d = Math.floor((now - state.lastUpdated) / 1000);
  if (d > 0) {
    state.remaining = Math.max(0, state.remaining - d);
    state.lastUpdated = now;
    if (state.remaining === 0) { state.running = false; state.lastUpdated = null; }
  }
}

function paint() {
  if (display) display.textContent = fmt(state.remaining);
  const atStart = state.remaining === state.duration;
  const running = state.running;
  const finished = state.remaining === 0;
  if (startBtn) startBtn.textContent = running ? 'Pause' : ((atStart || finished) ? 'Start Timer' : 'Resume');
  if (resetBtn) resetBtn.disabled = !running && atStart;
}

function start() {
  if (state.running) return;
  if (state.remaining === 0) state.remaining = state.duration;
  state.running = true;
  state.lastUpdated = Date.now();
  ensureTick();
  paint();
  // Notify EarnDoros module if callback available
  if (typeof window.EarnDoros?.onTimerStart === 'function') {
    window.EarnDoros.onTimerStart();
  }
}

function stop() {
  state.running = false;
  state.lastUpdated = null;
  maybeStopTick();
  paint();
  // Notify EarnDoros module if callback available
  if (typeof window.EarnDoros?.onTimerPause === 'function') {
    window.EarnDoros.onTimerPause();
  }
}
function reset() {
  state.running = false;
  state.remaining = state.duration;
  state.lastUpdated = null;
  maybeStopTick();
  paint();
}

function setMode(modeKey, resetTime = true) {
  if (!MODES[modeKey]) return;
  updateNow();

  if (state.running) {
    state.running = false;
    state.lastUpdated = null;
    maybeStopTick();
  }

  currentMode = modeKey;
  if (resetTime) {
    const nextDuration = MODES[modeKey].duration;
    state.duration = nextDuration;
    state.remaining = nextDuration;
  }

  if (modeLabel) modeLabel.textContent = MODES[modeKey].label;
  chipEls.forEach(ch => {
    const a = ch.dataset.mode === modeKey;
    ch.classList.toggle('is-active', a);
    ch.setAttribute('aria-pressed', a ? 'true' : 'false');
  });

  anyRunning() ? ensureTick() : maybeStopTick();
  paint();
}

function setBreakEnabled(enabled) {
  breakEnabled = !!enabled;
  if (chipEls && chipEls.length > 0) {
    chipEls.forEach(ch => {
      if (ch.dataset.mode === 'break') {
        const isDisabled = !breakEnabled;
        ch.disabled = isDisabled;
        ch.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
        ch.classList.toggle('is-disabled', isDisabled);
      }
    });
  }
}

function validateDefaultValue(raw, label) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return { error: `${label} must be a whole number.` };
  if (parsed < DEFAULT_LIMITS.min || parsed > DEFAULT_LIMITS.max) {
    return { error: `${label} must be between ${DEFAULT_LIMITS.min} and ${DEFAULT_LIMITS.max}.` };
  }
  return { value: parsed };
}

export function applyTimerDefaults({ focusMinutes, breakMinutes } = {}) {
  const nextFocus = focusMinutes ?? focusDefault;
  const nextBreak = breakMinutes ?? breakDefault;

  // Update defaults
  focusDefault = nextFocus;
  breakDefault = nextBreak;

  const focusSec = nextFocus * 60;
  const breakSec = nextBreak * 60;

  const prevFocusSec = MODES.study.duration;
  const prevBreakSec = MODES.break.duration;

  // Update MODES durations
  MODES.study.duration = focusSec;
  MODES.break.duration = breakSec;

  // Update active timer only if it's still using the old default for this mode
  if (currentMode === 'study') {
    if (state.duration === prevFocusSec) state.duration = focusSec;
    if (state.remaining === prevFocusSec) state.remaining = focusSec;
  }

  if (currentMode === 'break') {
    if (state.duration === prevBreakSec) state.duration = breakSec;
    if (state.remaining === prevBreakSec) state.remaining = breakSec;
  }

  paint();
}

// Reset timer to default duration for current mode
export function resetTimerToDefault() {
  // Stop timer if running
  if (state.running) {
    state.running = false;
    state.lastUpdated = null;
    maybeStopTick();
  }

  // Reset to mode's default duration
  const defaultDuration = MODES[currentMode].duration;
  state.duration = defaultDuration;
  state.remaining = defaultDuration;

  paint();
}

export function setDuration(seconds, { reset = true } = {}) {
  const safeSeconds = Math.max(1, Math.min(180 * 60, Math.floor(seconds)));

  if (state.running) {
    state.running = false;
    state.lastUpdated = null;
    maybeStopTick();
  }

  state.duration = safeSeconds;
  if (reset) state.remaining = safeSeconds;
  paint();
}

let handleDocumentClick, handleKeydown;

const clearErr = () => { if (!timerMenuError) return; timerMenuError.hidden = true; timerMenuError.textContent = ''; };
const showErr = (m) => { if (!timerMenuError) return; timerMenuError.hidden = false; timerMenuError.textContent = m; };

const hydrate = () => {
  timerStudyInput.value = String(focusDefault);
  timerBreakInput.value = String(breakDefault);
  clearErr();
};

const closeMenu = ({ focusTrigger = false } = {}) => {
  timerMenu.hidden = true;
  timerMenu.style.display = 'none';
  timerMenuBtn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
  if (focusTrigger) timerMenuBtn.focus({ preventScroll: true });
};

handleDocumentClick = (e) => {
  if (timerMenu.contains(e.target) || timerMenuBtn.contains(e.target)) return;
  closeMenu();
};
handleKeydown = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeMenu({ focusTrigger: true }); } };

const openMenu = () => {
  if (!timerMenu.hidden) return;
  hydrate();
  timerMenu.hidden = false;
  timerMenu.classList.add('is-open');
  timerMenu.style.display = '';
  timerMenuBtn.setAttribute('aria-expanded', 'true');
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  requestAnimationFrame(() => timerStudyInput.focus({ preventScroll: true }));
};

const wireMenu = () => {
  if (!(timerMenuBtn && timerMenu && timerMenuForm && timerStudyInput && timerBreakInput)) {
    console.warn('[Timer] Menu elements not found - menu wiring skipped');
    return;
  }

  console.log('[Timer] Menu wiring initialized');
  timerMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('[Timer] Menu button clicked, menu hidden:', timerMenu.hidden);
    timerMenu.hidden ? openMenu() : closeMenu();
  });
  timerMenuBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); timerMenu.hidden ? openMenu() : closeMenu(); }
  });
  timerMenuCancel?.addEventListener('click', () => closeMenu({ focusTrigger: true }));

  timerMenuForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = validateDefaultValue(timerStudyInput.value, 'Study session'); if (f.error) { showErr(f.error); timerStudyInput.focus(); return; }
    const b = validateDefaultValue(timerBreakInput.value, 'Break'); if (b.error) { showErr(b.error); timerBreakInput.focus(); return; }

    clearErr();
    focusDefault = f.value; breakDefault = b.value;
    writeStored(STORAGE_KEYS.focus, focusDefault);
    writeStored(STORAGE_KEYS.break, breakDefault);
    applyTimerDefaults({ focusMinutes: focusDefault, breakMinutes: breakDefault });
    closeMenu({ focusTrigger: true });
  });
};

export function initTimer() {
  // cache DOM
  display = document.getElementById('timerDisplay');
  startBtn = document.getElementById('startBtn');
  resetBtn = document.getElementById('resetBtn');
  modeLabel = document.getElementById('modeLabel');
  chipEls = Array.from(document.querySelectorAll('.mode-chips .chip'));

  timerMenuBtn = document.getElementById('timerMenuBtn');
  timerMenu = document.getElementById('timerMenu');
  timerMenuForm = document.getElementById('timerMenuForm');
  timerMenuCancel = document.getElementById('timerMenuCancel');
  timerMenuError = document.getElementById('timerMenuError');
  timerStudyInput = document.getElementById('timerStudyInput');
  timerBreakInput = document.getElementById('timerBreakInput');

  // events
  startBtn?.addEventListener('click', () => {
    if (!state.running && state.remaining === 0) state.remaining = state.duration;
    state.running ? stop() : start();
  });
  resetBtn?.addEventListener('click', reset);

  chipEls.forEach(ch => {
    ch.addEventListener('click', (e) => {
      // Prevent clicking disabled chips
      if (ch.classList.contains('is-disabled')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      setMode(ch.dataset.mode);
    });
    ch.addEventListener('keydown', (e) => {
      // Prevent Enter/Space on disabled chips
      if (ch.classList.contains('is-disabled') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
  setMode(currentMode);

  wireMenu();
  paint();

  setBreakEnabled(breakEnabled);

  return {
    applyDefaults: applyTimerDefaults,
    resetTimerToDefault: resetTimerToDefault,
    setDuration,
    setMode,
    setBreakEnabled,
    stop,
  };
}
