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
const makeModeState = (k) => {
  const d = MODES[k].duration;
  return { key: k, duration: d, remaining: d, running: false, lastUpdated: null };
};
const state = { study: makeModeState('study'), break: makeModeState('break') };
let currentMode = 'study';
let tickId = null;
let activeTaskId = null; // comes from Tasks module to enable/disable Start

// DOM
let display, startBtn, resetBtn, modeLabel, chipEls;
let timerMenuBtn, timerMenu, timerMenuForm, timerMenuCancel, timerMenuError;
let timerStudyInput, timerBreakInput;

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const anyRunning = () => Object.values(state).some(m => m.running);

function ensureTick() {
  if (!tickId) tickId = setInterval(() => { updateAllNow(); paint(); }, 1000);
}
function maybeStopTick() {
  if (!anyRunning() && tickId) { clearInterval(tickId); tickId = null; }
}
function updateModeNow(k, now = Date.now()) {
  const m = state[k]; if (!m.running) return;
  if (m.lastUpdated == null) { m.lastUpdated = now; return; }
  const d = Math.floor((now - m.lastUpdated) / 1000);
  if (d > 0) {
    m.remaining = Math.max(0, m.remaining - d);
    m.lastUpdated = now;
    if (m.remaining === 0) { m.running = false; m.lastUpdated = null; }
  }
}
function updateAllNow() { const n = Date.now(); Object.keys(state).forEach(k => updateModeNow(k, n)); }

function paint() {
  const m = state[currentMode];
  if (display) display.textContent = fmt(m.remaining);
  const atStart = m.remaining === m.duration;
  const running = m.running;
  const finished = m.remaining === 0;
  if (startBtn) startBtn.textContent = running ? 'Pause' : ((atStart || finished) ? 'Start Timer' : 'Resume');
  if (resetBtn) resetBtn.disabled = !running && atStart;
  updateTimerAvailability();
}

function start() {
  const m = state[currentMode];
  if (m.running) return;
  if (m.remaining === 0) m.remaining = m.duration;
  m.running = true;
  m.lastUpdated = Date.now();
  ensureTick();
  paint();
  // Notify EarnDoros module if callback available
  if (typeof window.EarnDoros?.onTimerStart === 'function') {
    window.EarnDoros.onTimerStart();
  }
}

function stop() {
  const m = state[currentMode];
  m.running = false;
  m.lastUpdated = null;
  maybeStopTick();
  paint();
  // Notify EarnDoros module if callback available
  if (typeof window.EarnDoros?.onTimerPause === 'function') {
    window.EarnDoros.onTimerPause();
  }
}
function reset() { const m = state[currentMode]; m.running = false; m.remaining = m.duration; m.lastUpdated = null; maybeStopTick(); paint(); }

function setMode(modeKey) {
  if (!MODES[modeKey]) return;
  updateAllNow();
  currentMode = modeKey;
  if (modeLabel) modeLabel.textContent = MODES[modeKey].label;
  chipEls.forEach(ch => {
    const a = ch.dataset.mode === modeKey;
    ch.classList.toggle('is-active', a);
    ch.setAttribute('aria-pressed', a ? 'true' : 'false');
  });
  anyRunning() ? ensureTick() : maybeStopTick();
  updateTimerAvailability(); // Update button state when mode changes
  paint();
}

function updateTimerAvailability() {
  // Both Study and Break modes can run without a task
  if (startBtn) startBtn.disabled = false;
}

export function setActiveTaskIdForTimer(id) {
  activeTaskId = id;
  if (activeTaskId == null && anyRunning()) {
    // If timer is running in study mode and task is removed, stop the timer
    if (currentMode === 'study') stop();
  }
  updateTimerAvailability();
}

// ----- Defaults (menu) -----
function validateDefaultValue(value, label) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return { error: `${label} is required.` };
  const parsed = Number(trimmed);
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

  const pF = state.study.duration;
  const pB = state.break.duration;

  // Update MODES durations
  MODES.study.duration = focusSec;
  MODES.break.duration = breakSec;

  // Update state durations
  MODES.study.duration = state.study.duration = focusSec;
  // If study timer is at the old default (not started/modified), update remaining time
  if (state.study.remaining === pF) state.study.remaining = focusSec;

  MODES.break.duration = state.break.duration = breakSec;
  if (state.break.remaining === pB) state.break.remaining = breakSec;

  paint();
}

// Set timer from task estimate (in minutes)
export function setTimerFromTask(minutes) {
  if (!minutes || minutes <= 0) return;
  const seconds = Math.min(minutes * 60, 180 * 60); // Cap at 180 minutes
  const m = state[currentMode];

  // Stop timer if running
  if (m.running) {
    m.running = false;
    m.lastUpdated = null;
    maybeStopTick();
  }

  // Set duration and remaining time
  m.duration = seconds;
  m.remaining = seconds;

  paint();
}

// Reset timer to default duration for current mode
export function resetTimerToDefault() {
  const m = state[currentMode];

  // Stop timer if running
  if (m.running) {
    m.running = false;
    m.lastUpdated = null;
    maybeStopTick();
  }

  // Reset to mode's default duration
  const defaultDuration = MODES[currentMode].duration;
  m.duration = defaultDuration;
  m.remaining = defaultDuration;

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
    const m = state[currentMode];
    if (!m.running && m.remaining === 0) m.remaining = m.duration;
    m.running ? stop() : start();
  });
  resetBtn?.addEventListener('click', reset);

  chipEls.forEach(ch => ch.addEventListener('click', () => setMode(ch.dataset.mode)));
  setMode(currentMode);

  wireMenu();
  paint();

  return {
    setActiveTaskId: setActiveTaskIdForTimer,
    applyDefaults: applyTimerDefaults,
    setTimerFromTask: setTimerFromTask,
    resetTimerToDefault: resetTimerToDefault,
    setMode,
  };
}
