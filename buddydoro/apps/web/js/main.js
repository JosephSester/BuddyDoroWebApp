// apps/web/js/main.js

// Scene / sprite
import { initScene } from './features/scene.js';
import { initDragon } from './features/dragon.js';

// UI features
import { initTopbar } from './features/topbar.js';
import { initTimer } from './features/timer.js';
import { initStore } from './features/store.js';
import { initTasks, getActiveTaskId } from './features/tasks.js';
import { initOnboarding } from './features/onboarding.js';

// ----- 1) Background & dragon -------------------------------------------------
initScene({
  background: 'BackgroundDay.jpg',
  preloadExtra: ['Dragon.png']
});
initDragon?.(); // safe if initDragon is a no-op

// ----- 2) Topbar (greeting + Doros) ------------------------------------------
const topbar = initTopbar({
  userName: 'Joe',
  startingDoros: 1250
});
// `topbar` should expose getDoros/setDoros/addDoros/subDoros/paintDoros.
// (That’s what the module code you pasted provides.)

// ----- 3) Timer ---------------------------------------------------------------
const timer = initTimer({
  // You can extend this later; for now we only need stop()
});
// We'll also manage the Start button enabled/disabled state from here:
const startBtn = document.getElementById('startBtn');
const syncStartEnabled = () => {
  if (!startBtn) return;
  startBtn.disabled = (getActiveTaskId() == null);
};
syncStartEnabled(); // initial state

// ----- 4) Store ---------------------------------------------------------------
initStore({
  // Read Doros balance from EarnDoros (single source of truth)
  getDoros: () => {
    if (window.EarnDoros && typeof window.EarnDoros.getBalance === 'function') {
      return window.EarnDoros.getBalance();
    }

    // Fallback: read from the pill if EarnDoros is missing
    const el = document.getElementById('dorosAmount');
    if (!el) return 0;
    const raw = (el.textContent || '').replace(/[^\d]/g, '');
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  // Spend Doros via EarnDoros
  spendDoros: (amount) => {
    if (window.EarnDoros && typeof window.EarnDoros.spend === 'function') {
      window.EarnDoros.spend(amount);
      return;
    }

    // Fallback: subtract directly from the pill if EarnDoros is missing
    const el = document.getElementById('dorosAmount');
    if (!el) return;
    const raw = (el.textContent || '').replace(/[^\d]/g, '');
    let bal = parseInt(raw, 10);
    if (!Number.isFinite(bal)) bal = 0;
    bal = Math.max(0, bal - Math.max(0, amount | 0));
    el.textContent = bal.toLocaleString('en-US');
  }
});


// ----- 5) Tasks ---------------------------------------------------------------
initTasks({
  onActiveTaskChange: () => {
    // Enable/disable Start button depending on whether a task is selected
    syncStartEnabled();
  },
  onShouldStopTimer: () => {
    // If the active task disappears while the timer is running, stop it.
    timer?.stop?.();
    syncStartEnabled();
  },
});

// ----- 6) Onboarding ----------------------------------------------------------
// Initialize onboarding tutorial for first-time users
const onboarding = initOnboarding();

// Connect restart tour button in greeting menu
const restartTourBtn = document.getElementById('restartTourBtn');
if (restartTourBtn && onboarding) {
  restartTourBtn.addEventListener('click', () => {
    // Close the greeting menu first
    const greetChip = document.getElementById('greetChip');
    const greetMenu = document.getElementById('greetMenu');
    if (greetMenu) greetMenu.hidden = true;
    if (greetChip) greetChip.setAttribute('aria-expanded', 'false');

    // Restart the onboarding tour
    onboarding.restart();
  });
}

// Dispatch custom events for onboarding to track progress
// Listen for task creation
document.addEventListener('DOMContentLoaded', () => {
  const originalAddTaskFn = window.addTask;
  if (originalAddTaskFn) {
    window.addTask = function (...args) {
      const result = originalAddTaskFn.apply(this, args);
      document.dispatchEvent(new CustomEvent('buddydoro:task-created'));
      return result;
    };
  }
});

// Listen for timer start
startBtn?.addEventListener('click', () => {
  if (!startBtn.disabled) {
    document.dispatchEvent(new CustomEvent('buddydoro:timer-started'));
  }
});

// Listen for store open
const storeChip = document.getElementById('storeChip');
storeChip?.addEventListener('click', () => {
  document.dispatchEvent(new CustomEvent('buddydoro:store-opened'));
});

// Each feature owns its own DOM and logic.
// This file only glues them together.
