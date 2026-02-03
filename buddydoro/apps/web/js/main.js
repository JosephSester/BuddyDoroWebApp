// apps/web/js/main.js

import { initScene } from './features/scene.js';
import { initDragon } from './features/dragon.js';
import { initTopbar } from './features/topbar.js';
import { initTimer } from './features/timer.js';
import { initEarnDoros } from './features/earndoros.js';
import { initStore } from './features/store.js';
import { initTasks, getActiveTask } from './features/tasks.js';
import { initAiPlan } from './features/aiPlan.js';

// ---- Auth guard -------------------------------------------------
const authToken = localStorage.getItem('authToken');
if (!authToken) {
  window.location.href = 'login.html';
  throw new Error('Not authenticated');
}

// ---- Scene ------------------------------------------------------
initScene({
  background: 'BackgroundDay.jpg',
  preloadExtra: ['Dragon.png'],
});
initDragon?.();

// ---- Topbar -----------------------------------------------------
async function initUserTopbar() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: 'Bearer ' + authToken },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await res.json();

    if (window.EarnDoros && typeof window.EarnDoros.setBalance === 'function') {
      window.EarnDoros.setBalance(data.doros);
    }

    return initTopbar({
      userName: data.name,
      doros: data.doros,
    });
  } catch {
    return initTopbar({
      userName: 'Player',
      doros: 0,
    });
  }
}

const topbar = await initUserTopbar();

// ---- Timer + EarnDoros ------------------------------------------
const timer = initTimer({
  onStart: () => topbar?.setTimerRunning?.(true),
  onPause: () => topbar?.setTimerRunning?.(false),
  onReset: () => topbar?.setTimerRunning?.(false),
  onComplete: () => topbar?.setTimerRunning?.(false),
});
const earnDoros = initEarnDoros(timer, topbar);

// ---- Store ------------------------------------------------------
initStore({
  getDoros: () => earnDoros.getBalance(),
  spendDoros: amount => earnDoros.spend(amount),
});

// ---- Tasks ------------------------------------------------------
const sessionsToSeconds = sessions =>
  Math.max(1, Number(sessions || 1)) *
  timer.getFocusDefaultMinutes() *
  60;

await initTasks({
  onActiveTaskChange: () => {
    const task = getActiveTask();
    if (task) {
      timer.setPlannedFocusDuration(sessionsToSeconds(task.total));
    } else {
      timer.setPlannedFocusDuration(null);
    }
  },
  onShouldStopTimer: () => timer.stop(),
  onTaskEstimate: minutes =>
    minutes > 0 && timer.setPlannedFocusDuration(minutes * 60),
  onSubtaskEstimate: minutes =>
    minutes > 0 && timer.setPlannedFocusDuration(minutes * 60),
});

// ---- AI Plan ----------------------------------------------------
initAiPlan();
