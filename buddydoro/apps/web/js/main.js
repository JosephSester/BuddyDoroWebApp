// apps/web/js/main.js

import { initScene } from './features/scene.js';
import { initDragon } from './features/dragon.js';
import { initTopbar } from './features/topbar.js';
import { initTimer } from './features/timerFeature/index.js';
import { initManualPomodoroLogic } from './features/timerFeature/manualPomodoroLogic.js';
import { initTaskPomodoroLogic } from './features/timerFeature/taskPomodoroLogic.js';
import { initEarnDoros } from './features/earndoros.js';
import { initStore } from './features/store.js';
import { initInventory } from './features/inventory.js';
import { initDiamondStore } from './features/diamondStore.js';
import { initTasks, getActiveTask } from './features/taskfeature/index.js';
import { initAiPlan } from './features/aiPlan.js';
import { initCompanionThoughts } from './features/companionThoughts.js';
import { API_BASE } from './api/apiClient.js';
import { saveSession } from './features/historyStorage.js';
import { getSubtasks } from './features/subtasks.js';

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
const tasksStack = document.getElementById('tasksStack');
const focusTaskNameEl = document.getElementById('focusTaskName');
const chipRow = document.querySelector('.tasks-chip-row');
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
  if (tasksStack) tasksStack.hidden = false;
  if (chipRow) chipRow.hidden = false;
  if (focusTaskNameEl) {
    focusTaskNameEl.textContent = '';
    focusTaskNameEl.hidden = true;
  }
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
  if (tasksStack) tasksStack.hidden = true;
  if (chipRow) chipRow.hidden = true;
  if (focusTaskNameEl) {
    focusTaskNameEl.textContent = task?.name || '';
    focusTaskNameEl.hidden = !task?.name;
  }
};

let completedFocusSessions = 0;
const sessionCountEl = document.getElementById('timerSessionCount');
if (sessionCountEl) sessionCountEl.hidden = false;

const updateSessionCount = () => {
  if (!sessionCountEl) return;
  sessionCountEl.textContent = `${completedFocusSessions} session${completedFocusSessions !== 1 ? 's' : ''} done`;
  sessionCountEl.hidden = false;
};

// ---- Subtask selector -------------------------------------------------------
const subtaskSelectorEl = document.getElementById('subtaskSelector');
const subtaskSelectEl   = document.getElementById('subtaskSelect');

function populateSubtaskSelector(task) {
  if (!subtaskSelectorEl || !subtaskSelectEl || !task) return;
  const subtasks = getSubtasks(task.id);
  subtaskSelectEl.innerHTML = '<option value="">— select subtask —</option>';
  subtasks.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.title;
    opt.textContent = sub.title;
    subtaskSelectEl.appendChild(opt);
  });
  subtaskSelectorEl.hidden = subtasks.length === 0;
}

function clearSubtaskSelector() {
  if (!subtaskSelectorEl || !subtaskSelectEl) return;
  subtaskSelectEl.innerHTML = '<option value="">— select subtask —</option>';
  subtaskSelectorEl.hidden = true;
}
// -----------------------------------------------------------------------------

const taskPomodoro = initTaskPomodoroLogic({
  timer,
  onFocusStart: ({ task }) => {
    completedFocusSessions = 0;
    updateSessionCount();
    showFocusPanel(task);
    populateSubtaskSelector(task);
  },
  onFocusStop: () => {
    clearFocusPanel({ clearTask: true });
    clearSubtaskSelector();
  },
});

timer.onComplete(({ mode }) => {
  if (mode === 'focus') {
    completedFocusSessions++;
    updateSessionCount();
  }
});

// Save a history record whenever a focus session summary fires
timer.onSummary(({ minutes }) => {
  if (minutes <= 0) return;
  const subtaskName = subtaskSelectEl?.value || null;
  const taskName    = currentFocusTask?.name  || null;
  saveSession({ subtaskName, taskName, seconds: minutes * 60 });
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
    const res = await fetch(`${API_BASE}/auth/me`, {
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

// Store
initStore({
  getDoros: () => earnDoros.getBalance(),
  spendDoros: amount => earnDoros.spend(amount),
});

// Dedicated inventory modal (separate from store purchase flow).
initInventory();

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

initCompanionThoughts({
  getActiveTask: () => getActiveTask()
});

// ---- AI Plan ----------------------------------------------------
initAiPlan();
