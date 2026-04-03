// apps/web/js/main.js

import { initScene, setBackground } from './features/scene.js';
import { initDragon } from './features/dragon.js';
import { initTopbar } from './features/topbar.js';
import { initTimer } from './features/timerFeature/index.js';
import { initManualPomodoroLogic } from './features/timerFeature/manualPomodoroLogic.js';
import { initTaskPomodoroLogic } from './features/timerFeature/taskPomodoroLogic.js';
import { initEarnDoros } from './features/earndoros.js';
import { initInventory } from './features/inventory.js';
import { initDiamondStore } from './features/diamondStore.js';
import { initTasks, getActiveTask } from './features/taskfeature/index.js';
import { state as taskState } from './features/taskfeature/state.js';
import { initCompanionThoughts } from './features/companionThoughts.js';
import { initMusic } from './features/music.js';
import { API_BASE } from './api/apiClient.js';
import { saveSession } from './features/historyStorage.js';
import { initAppTour } from './features/appTour.js';
import { initSession, applySessionDoneVisuals } from './features/session.js';

// ---- Auth guard -------------------------------------------------
const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
if (!authToken) {
  window.location.href = 'login.html';
  throw new Error('Not authenticated');
}

// ---- Onboarding guard -------------------------------------------
if (localStorage.getItem('hasSeenOnboarding') !== 'true') {
  window.location.href = 'onboarding.html';
  throw new Error('Onboarding not complete');
}

// UI features

// ----- 1) Background & dragon -------------------------------------------------
// ---- Scene ------------------------------------------------------
initScene({
  background: 'BackgroundDay.jpg',
  preloadExtra: ['Dragon.png'],
});

// Seed the default background so the store shows it as equipped on first visit.
// backgroundnight.js owns the actual display — it reads this key and applies day/night.
if (!localStorage.getItem('buddydoro.background')) {
  localStorage.setItem('buddydoro.background', 'Backgrounds/BackgroundDay.jpg');
}

initDragon?.();

// Timer
const timer = initTimer({
  onStart: () => topbar?.setTimerActive?.(true),
  onPause: () => topbar?.setTimerActive?.(true),
  onReset: () => topbar?.setTimerActive?.(true),
  onComplete: () => topbar?.setTimerActive?.(true),
  onStop: () => topbar?.setTimerActive?.(false),
});

const taskPomodoro = initTaskPomodoroLogic({ timer });
initSession(timer);

// ---- Pomodoro flow --------------------------------------------------
// Tracks completed focus rounds to decide short vs long break.
let pomodoroFocusCount = 0;

function advancePomodoro(fromMode) {
  if (fromMode === 'focus') pomodoroFocusCount++;
  const nextMode = fromMode === 'focus'
    ? (pomodoroFocusCount % 4 === 0 ? 'longBreak' : 'break')
    : 'focus';
  timer.setMode(nextMode);
  timer.activateChip(nextMode);
  // Do NOT auto-start — user presses Start
}

timer.onComplete(({ mode, duration }) => {
  if (mode === 'focus' && duration > 0) {
    const taskName = getActiveTask()?.name || null;
    saveSession({ taskName, seconds: duration });
  }
  advancePomodoro(mode);
});

document.getElementById('resetBtn')?.addEventListener('click', () => {
  timer.reset();
});

document.getElementById('nextBtn')?.addEventListener('click', () => {
  advancePomodoro(timer.getMode());
});

const manualPomodoro = initManualPomodoroLogic({
  timer,
});


// ---- Topbar + EarnDoros -----------------------------------------------------
async function initUserTopbarAndEarnDoros() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer ' + authToken },
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('hasSeenOnboarding');
      window.location.href = 'login.html';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`Auth lookup failed: ${res.status}`);

    const user = await res.json();

    if (user?.name) {
      localStorage.setItem('userName', user.name);
    }

    // Apply saved timer settings
    if (user?.settings) {
      const { focusMinutes, breakMinutes } = user.settings;
      if (focusMinutes || breakMinutes) {
        timer.applyDefaults({ focusMinutes, breakMinutes });
        if (focusMinutes) {
          const inputEl = document.getElementById('settingFocus');
          const chip = document.querySelector('.chip[data-mode="focus"]');
          if (inputEl) inputEl.value = focusMinutes;
          if (chip) chip.dataset.minutes = focusMinutes;
        }
        if (breakMinutes) {
          const inputEl = document.getElementById('settingShort');
          const chip = document.querySelector('.chip[data-mode="break"]');
          if (inputEl) inputEl.value = breakMinutes;
          if (chip) chip.dataset.minutes = breakMinutes;
        }
      }
    }

    const topbar = initTopbar({
      userName: user?.name || localStorage.getItem('userName') || 'Player',
      startingDoros: user?.doros ?? 0,
      onOpenStore: () => {
        // your store open logic if needed
      }
    });

    const earnDoros = initEarnDoros(timer, topbar);

    window.earnDoros = earnDoros;

    // This is all you need — topbar will paint the pill automatically
    earnDoros.setBalance(user?.doros ?? 0);
    if (window.Diamonds) {
      window.Diamonds.setBalance(user?.diamonds ?? 0);
    }

    // Force greeting update only (keep this, it's safe)
    const greetTextEl = document.getElementById('greetText');
    if (greetTextEl && user?.name) {
      greetTextEl.textContent = `Hello, ${user.name}`;
    }

    return { topbar, earnDoros };
  } catch (err) {
    console.error('User fetch failed:', err);

    const topbar = initTopbar({ userName: 'Player', startingDoros: 0 });
    const earnDoros = initEarnDoros(timer, topbar);
    earnDoros.setBalance(0);

    return { topbar, earnDoros };
  }
}

const { topbar, earnDoros } = await initUserTopbarAndEarnDoros();

// Dedicated inventory modal (separate from store purchase flow).
initInventory();

// Bottom-right mini music player (ambient on load; default tracks follow the focus timer).
initMusic({ timer });

// ----- Diamond Store ----------------------------------------------------------
initDiamondStore();


// ----- 5) Tasks ---------------------------------------------------------------
// ---- Tasks ------------------------------------------------------
await initTasks({
  onActiveTaskChange: async () => {
    const task = getActiveTask();
    manualPomodoro.stop?.();
    timer.stop();
    await taskPomodoro.handleActiveTaskChange(task);
  },
  onShouldStopTimer: () => {
    taskPomodoro.stop();
    manualPomodoro.stop();
    timer.stop();
  },
  onTaskEstimate: minutes =>
    minutes > 0 && timer.setPlannedFocusDuration(minutes * 60),
  onSubtaskEstimate: minutes =>
    minutes > 0 && timer.setPlannedFocusDuration(minutes * 60),
});

taskState.handlers.onAfterRender = applySessionDoneVisuals;
applySessionDoneVisuals();

initCompanionThoughts({
  getActiveTask: () => getActiveTask()
});

// ---- AI Plan ----------------------------------------------------

// ---- First-visit app tour ---------------------------------------
initAppTour();

