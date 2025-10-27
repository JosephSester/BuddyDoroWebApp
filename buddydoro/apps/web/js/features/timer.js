// Timer + menu + defaults persistence
const DEFAULT_MINUTES = { focus: 25, break: 5, long: 15 };
const DEFAULT_LIMITS = { min: 1, max: 180 };
const STORAGE_KEYS = {
  focus: 'focusDefaultMinutes',
  break: 'breakDefaultMinutes',
  long:  'longDefaultMinutes',
};

const readStored = (key, fb) => {
  try {
    const raw = localStorage.getItem(key);
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n>=DEFAULT_LIMITS.min && n<=DEFAULT_LIMITS.max) return n;
  } catch {}
  return fb;
};
const writeStored = (key, val) => { try { localStorage.setItem(key, String(val)); } catch {} };

let focusDefault = readStored(STORAGE_KEYS.focus, DEFAULT_MINUTES.focus);
let breakDefault = readStored(STORAGE_KEYS.break, DEFAULT_MINUTES.break);
let longDefault  = readStored(STORAGE_KEYS.long,  DEFAULT_MINUTES.long);

const MODES = {
  study: { label: 'Study Timer',  duration: focusDefault * 60 },
  short: { label: 'Short Break',  duration: breakDefault  * 60 },
  long:  { label: 'Long Break',   duration: longDefault   * 60 },
};
const makeModeState = (k) => {
  const d = MODES[k].duration;
  return { key:k, duration:d, remaining:d, running:false, lastUpdated:null };
};
const state = { study:makeModeState('study'), short:makeModeState('short'), long:makeModeState('long') };
let currentMode = 'study';
let tickId = null;
let activeTaskId = null; // comes from Tasks module to enable/disable Start

// DOM
let display, startBtn, resetBtn, modeLabel, chipEls;
let timerMenuBtn, timerMenu, timerMenuForm, timerMenuCancel, timerMenuError;
let timerStudyInput, timerShortInput, timerLongInput;

const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const anyRunning = () => Object.values(state).some(m => m.running);

function ensureTick(){
  if (!tickId) tickId = setInterval(() => { updateAllNow(); paint(); }, 1000);
}
function maybeStopTick(){
  if (!anyRunning() && tickId){ clearInterval(tickId); tickId = null; }
}
function updateModeNow(k, now=Date.now()){
  const m = state[k]; if(!m.running) return;
  if(m.lastUpdated==null){ m.lastUpdated = now; return; }
  const d = Math.floor((now-m.lastUpdated)/1000);
  if (d>0){
    m.remaining = Math.max(0, m.remaining - d);
    m.lastUpdated = now;
    if (m.remaining === 0){ m.running=false; m.lastUpdated=null; }
  }
}
function updateAllNow(){ const n=Date.now(); Object.keys(state).forEach(k => updateModeNow(k,n)); }

function paint(){
  const m = state[currentMode];
  if (display) display.textContent = fmt(m.remaining);
  const atStart = m.remaining===m.duration;
  const running = m.running;
  const finished = m.remaining===0;
  if (startBtn) startBtn.textContent = running ? 'Pause' : ((atStart||finished) ? 'Start Timer' : 'Resume');
  if (resetBtn) resetBtn.disabled = !running && atStart;
  updateTimerAvailability();
}

function start(){ const m=state[currentMode]; if(m.running) return; if(m.remaining===0) m.remaining=m.duration; m.running=true; m.lastUpdated=Date.now(); ensureTick(); paint(); }
function stop(){  const m=state[currentMode]; m.running=false; m.lastUpdated=null; maybeStopTick(); paint(); }
function reset(){ const m=state[currentMode]; m.running=false; m.remaining=m.duration; m.lastUpdated=null; maybeStopTick(); paint(); }

function setMode(modeKey){
  if(!MODES[modeKey]) return;
  updateAllNow();
  currentMode = modeKey;
  if (modeLabel) modeLabel.textContent = MODES[modeKey].label;
  chipEls.forEach(ch=>{
    const a = ch.dataset.mode===modeKey;
    ch.classList.toggle('is-active', a);
    ch.setAttribute('aria-pressed', a?'true':'false');
  });
  anyRunning()?ensureTick():maybeStopTick();
  paint();
}

function updateTimerAvailability(){
  if (startBtn) startBtn.disabled = activeTaskId==null;
}

export function setActiveTaskIdForTimer(id){
  activeTaskId = id;
  if (activeTaskId==null && anyRunning()) stop();
  updateTimerAvailability();
}

// ----- Defaults (menu) -----
function validateDefaultValue(value, label){
  const trimmed = String(value ?? '').trim();
  if(trimmed==='') return { error: `${label} is required.` };
  const parsed = Number(trimmed);
  if(!Number.isFinite(parsed) || !Number.isInteger(parsed)) return { error: `${label} must be a whole number.` };
  if(parsed<DEFAULT_LIMITS.min || parsed>DEFAULT_LIMITS.max){
    return { error: `${label} must be between ${DEFAULT_LIMITS.min} and ${DEFAULT_LIMITS.max}.` };
  }
  return { value: parsed };
}

export function applyTimerDefaults({ focusMinutes, breakMinutes, longMinutes }={}){
  const nextFocus = focusMinutes ?? focusDefault;
  const nextBreak = breakMinutes ?? breakDefault;
  const nextLong  = longMinutes  ?? longDefault;

  const focusSec = nextFocus * 60;
  const breakSec = nextBreak * 60;
  const longSec  = nextLong  * 60;

  const pF = state.study.duration;
  const pS = state.short.duration;
  const pL = state.long.duration;

  MODES.study.duration = state.study.duration = focusSec;
  if(!state.study.running && state.study.remaining===pF) state.study.remaining = focusSec;

  MODES.short.duration = state.short.duration = breakSec;
  if(!state.short.running && state.short.remaining===pS) state.short.remaining = breakSec;

  MODES.long.duration  = state.long.duration  = longSec;
  if(!state.long.running && state.long.remaining===pL) state.long.remaining  = longSec;

  if(!anyRunning() || !state[currentMode].running) paint();
}

function wireMenu(){
  if (!(timerMenuBtn && timerMenu && timerMenuForm && timerStudyInput && timerShortInput && timerLongInput)) return;

  let handleDocumentClick; let handleKeydown;

  const clearErr = () => { if(!timerMenuError) return; timerMenuError.hidden=true; timerMenuError.textContent=''; };
  const showErr  = (m) => { if(!timerMenuError) return; timerMenuError.hidden=false; timerMenuError.textContent=m; };

  const hydrate = () => {
    timerStudyInput.value = String(focusDefault);
    timerShortInput.value = String(breakDefault);
    timerLongInput.value  = String(longDefault);
    clearErr();
  };

  const closeMenu = ({ focusTrigger=false }={}) => {
    if (timerMenu.hidden) return;
    timerMenu.hidden = true;
    timerMenu.classList.remove('is-open');
    timerMenu.style.display = 'none';
    timerMenuBtn.setAttribute('aria-expanded','false');
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleKeydown);
    if (focusTrigger) timerMenuBtn.focus({ preventScroll:true });
  };

  handleDocumentClick = (e) => {
    if (timerMenu.contains(e.target) || timerMenuBtn.contains(e.target)) return;
    closeMenu();
  };
  handleKeydown = (e) => { if (e.key==='Escape'){ e.preventDefault(); closeMenu({focusTrigger:true}); } };

  const openMenu = () => {
    if (!timerMenu.hidden) return;
    hydrate();
    timerMenu.hidden=false;
    timerMenu.classList.add('is-open');
    timerMenu.style.display='';
    timerMenuBtn.setAttribute('aria-expanded','true');
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    requestAnimationFrame(()=> timerStudyInput.focus({ preventScroll:true }));
  };

  timerMenuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); timerMenu.hidden ? openMenu() : closeMenu(); });
  timerMenuBtn.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); e.stopPropagation(); timerMenu.hidden ? openMenu() : closeMenu(); }
  });
  timerMenuCancel?.addEventListener('click', ()=> closeMenu({ focusTrigger:true }));

  timerMenuForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const f = validateDefaultValue(timerStudyInput.value, 'Study session');  if(f.error){ showErr(f.error); timerStudyInput.focus(); return; }
    const s = validateDefaultValue(timerShortInput.value, 'Short break');    if(s.error){ showErr(s.error); timerShortInput.focus(); return; }
    const l = validateDefaultValue(timerLongInput.value, 'Long break');      if(l.error){ showErr(l.error); timerLongInput.focus(); return; }

    clearErr();
    focusDefault = f.value; breakDefault = s.value; longDefault = l.value;
    writeStored(STORAGE_KEYS.focus, focusDefault);
    writeStored(STORAGE_KEYS.break, breakDefault);
    writeStored(STORAGE_KEYS.long,  longDefault);
    applyTimerDefaults({ focusMinutes: focusDefault, breakMinutes: breakDefault, longMinutes: longDefault });
    closeMenu({ focusTrigger:true });
  });
}

export function initTimer(){
  // cache DOM
  display   = document.getElementById('timerDisplay');
  startBtn  = document.getElementById('startBtn');
  resetBtn  = document.getElementById('resetBtn');
  modeLabel = document.getElementById('modeLabel');
  chipEls   = Array.from(document.querySelectorAll('.mode-chips .chip'));

  timerMenuBtn    = document.getElementById('timerMenuBtn');
  timerMenu       = document.getElementById('timerMenu');
  timerMenuForm   = document.getElementById('timerMenuForm');
  timerMenuCancel = document.getElementById('timerMenuCancel');
  timerMenuError  = document.getElementById('timerMenuError');
  timerStudyInput = document.getElementById('timerStudyInput');
  timerShortInput = document.getElementById('timerShortInput');
  timerLongInput  = document.getElementById('timerLongInput');

  // events
  startBtn?.addEventListener('click', ()=>{
    const m = state[currentMode];
    if(!m.running && m.remaining===0) m.remaining=m.duration;
    m.running ? stop() : start();
  });
  resetBtn?.addEventListener('click', reset);

  chipEls.forEach(ch => ch.addEventListener('click', ()=> setMode(ch.dataset.mode)));
  setMode(currentMode);

  wireMenu();
  paint();

  return {
    setActiveTaskId: setActiveTaskIdForTimer,
    applyDefaults: applyTimerDefaults,
    setMode,
  };
}
