// apps/web/js/main.js

import { initScene } from './features/scene.js';
import { initDragon } from './features/dragon.js';
import { initTopbar } from './features/topbar.js';
import { initTimer } from './features/timerFeature/index.js';
import { initManualPomodoroLogic } from './features/timerFeature/manualPomodoroLogic.js';
import { initTaskPomodoroLogic } from './features/timerFeature/taskPomodoroLogic.js';
import { initEarnDoros } from './features/earndoros.js';
import { initStore } from './features/store.js';
import { initTasks, getActiveTask } from './features/taskfeature/index.js';
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
  onStart: () => topbar?.setTimerActive?.(true),
  onPause: () => topbar?.setTimerActive?.(true),
  onReset: () => topbar?.setTimerActive?.(true),
  onComplete: () => topbar?.setTimerActive?.(true),
  onStop: () => topbar?.setTimerActive?.(false),
});

const focusPanelSlot = document.getElementById('focusPanelSlot');
const todoButton = document.getElementById('addTasksPanel');
let currentFocusTask = null;

const setTodoButtonVisible = (visible) => {
  if (!todoButton) return;
  todoButton.style.display = visible ? '' : 'none';
};

const clearFocusPanel = ({ clearTask = false } = {}) => {
  if (!focusPanelSlot) return;
  focusPanelSlot.innerHTML = '';
  focusPanelSlot.hidden = true;
  if (clearTask) currentFocusTask = null;
};

const showFocusPanel = (task) => {
  if (!focusPanelSlot || !task) return;
  currentFocusTask = task;
  const panelId = task.panelId ? String(task.panelId) : null;
  if (!panelId) return;

  const panel = document.getElementById(panelId)
    || document.querySelector(`.tasks-list[data-panel-id="${panelId}"]`)?.closest('.tasks-panel');
  if (!panel) return;

  const clone = panel.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('focus-panel');
  clone.querySelectorAll('.task-add').forEach(btn => btn.remove());
  clone.querySelectorAll('.tasks-header-actions').forEach(el => el.remove());

  focusPanelSlot.innerHTML = '';
  focusPanelSlot.appendChild(clone);
  focusPanelSlot.hidden = false;
};

const taskPomodoro = initTaskPomodoroLogic({
  timer,
  onFocusStart: ({ task }) => showFocusPanel(task),
  onFocusStop: () => clearFocusPanel({ clearTask: true }),
});

const manualPomodoro = initManualPomodoroLogic({
  timer,
});

timer.onStart(({ mode }) => {
  if (mode === 'break') {
    clearFocusPanel();
  }
});

timer.onSummaryBreak(() => clearFocusPanel());
timer.onSummaryHome(() => clearFocusPanel({ clearTask: true }));
timer.onBreakLater(() => clearFocusPanel({ clearTask: true }));
timer.onBreakResume(() => {
  if (currentFocusTask) showFocusPanel(currentFocusTask);
});

timer.setLaunchHandler?.((mode) => {
  if (mode === 'focus') {
    taskPomodoro.stop?.();
    clearFocusPanel({ clearTask: true });
    timer.stop();
    manualPomodoro.startManualFocus?.();
    return;
  }
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

// ---- AI Plan ----------------------------------------------------
initAiPlan();
