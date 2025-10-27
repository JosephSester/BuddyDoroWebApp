// apps/web/js/main.js

// Scene / sprite
import { initScene }             from './features/scene.js';
import { initDragon }            from './features/dragon.js';

// UI features
import { initTopbar }            from './features/topbar.js';
import { initTimer }             from './features/timer.js';
import { initStore }             from './features/store.js';
import { initTasks, getActiveTaskId } from './features/tasks.js';

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
  // Let the store read/update Doros and repaint the chip in the topbar.
  getDoros: topbar.getDoros,
  setDoros: (n) => { topbar.setDoros(n); topbar.paintDoros(); },
  addDoros: (n) => { topbar.addDoros(n); topbar.paintDoros(); },
  subDoros: (n) => { topbar.subDoros(n); topbar.paintDoros(); },
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

// Each feature owns its own DOM and logic.
// This file only glues them together.
