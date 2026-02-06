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

// Timer
const timer = initTimer({
  onStart: () => topbar?.setTimerRunning?.(true),
  onPause: () => topbar?.setTimerRunning?.(false),
  onReset: () => topbar?.setTimerRunning?.(false),
  onComplete: () => topbar?.setTimerRunning?.(false),
});

// ---- Topbar + EarnDoros -----------------------------------------------------
async function initUserTopbarAndEarnDoros() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: 'Bearer ' + authToken },
    });

    if (!res.ok) throw new Error('Auth lookup failed');

    const user = await res.json();

    if (user?.name) {
      localStorage.setItem('userName', user.name);
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

// Store
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
