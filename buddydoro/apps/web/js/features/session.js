// apps/web/js/features/session.js
// Session state machine — manages the active study session flow.

import { activateTask } from './taskfeature/index.js';
import { getSubtasks, setSubtasks } from './subtasks.js';
import { saveSessionRecord } from './historyStorage.js';

const SESSION_DONE_KEY = 'buddydoro_session_done_tasks';

let _timer = null;
let _sessionState = null; // { goalPanelId, goalTitle, tasks[], currentTaskId, completedTaskIds (Set), pomodoroCount, startTime }
let _menuOverrideController = null;

export function initSession(timer) {
  _timer = timer;

  timer.onComplete(({ mode }) => {
    if (mode !== 'focus') return;
    if (!_sessionState) return;

    _sessionState.pomodoroCount++;

    const task = _sessionState.tasks.find(t => String(t.id) === _sessionState.currentTaskId);
    if (!task) return;

    const subtasks = getSubtasks(task.id);
    if (subtasks.length === 0) {
      // No subtasks → pomodoro completion = task done
      handleTaskComplete();
    } else {
      // Has subtasks → reset timer, wait for all subtasks to be checked
      _timer?.stop?.();
    }
  });

  document.getElementById('endSessionBtn')?.addEventListener('click', () => endSession(false));
  document.getElementById('sessionCollapseBtn')?.addEventListener('click', closeSessionPanel);
  document.getElementById('sessionEndFromPromptBtn')?.addEventListener('click', () => {
    // If all tasks are done, record goal as complete
    const allDone = _sessionState &&
      _sessionState.tasks.every(t => _sessionState.completedTaskIds.has(String(t.id)));
    endSession(!!allDone);
  });
}

export function startSession({ goalPanelId, goalTitle, tasks, startTaskId }) {
  // Pre-populate with tasks already completed in previous sessions
  const persistedIds = loadSessionDoneIds();
  const completedTaskIds = new Set(
    tasks.map(t => String(t.id)).filter(id => persistedIds.has(id))
  );

  _sessionState = {
    goalPanelId,
    goalTitle,
    tasks: [...tasks],
    currentTaskId: startTaskId ? String(startTaskId) : (tasks[0] ? String(tasks[0].id) : null),
    completedTaskIds,
    pomodoroCount: 0,
    startTime: Date.now(),
  };

  // Close sidebar so the session panel is visible
  document.getElementById('sidebar')?.classList.remove('is-open');
  document.getElementById('sidebarBackdrop')?.classList.remove('is-open');

  setupMenuOverride();
  openSessionPanel();
  activateCurrentTask();
}

function activateCurrentTask() {
  if (!_sessionState || !_sessionState.currentTaskId) return;

  activateTask(_sessionState.currentTaskId);
  document.querySelector('.right-ui')?.classList.add('is-open');
  renderSessionPanel();
}

function openSessionPanel() {
  document.getElementById('sessionPanel')?.classList.add('is-open');
}

function closeSessionPanel() {
  document.getElementById('sessionPanel')?.classList.remove('is-open');
}

function setupMenuOverride() {
  _menuOverrideController = new AbortController();
  document.getElementById('menuButton')?.addEventListener('click', e => {
    e.stopImmediatePropagation();
    document.getElementById('sessionPanel')?.classList.toggle('is-open');
  }, { capture: true, signal: _menuOverrideController.signal });
}

function teardownMenuOverride() {
  _menuOverrideController?.abort();
  _menuOverrideController = null;
}

function handleTaskComplete() {
  if (!_sessionState) return;
  _timer?.stop?.();

  _sessionState.completedTaskIds.add(_sessionState.currentTaskId);
  markTaskCardDone(_sessionState.currentTaskId);
  renderSessionPanel();

  const remaining = _sessionState.tasks.filter(
    t => !_sessionState.completedTaskIds.has(String(t.id))
  );

  if (remaining.length > 0) {
    showTaskPickerPrompt(remaining);
  } else {
    showGoalCompleteOverlay();
  }
}

function showTaskPickerPrompt(remaining) {
  const overlay   = document.getElementById('sessionNextOverlay');
  const iconEl    = document.getElementById('sessionNextIcon');
  const titleEl   = document.getElementById('sessionNextTitle');
  const bodyEl    = document.getElementById('sessionNextBody');
  const pickerEl  = document.getElementById('sessionTaskPicker');
  if (!overlay) return;

  if (iconEl)  iconEl.textContent = '🎉';
  if (titleEl) titleEl.textContent = 'Task Complete!';
  if (bodyEl)  bodyEl.textContent = 'Which task would you like to do next?';

  if (pickerEl) {
    pickerEl.innerHTML = '';
    remaining.forEach(task => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'session-pick-task-btn';
      btn.textContent = task.name || 'Task';
      btn.addEventListener('click', () => {
        overlay.hidden = true;
        _sessionState.currentTaskId = String(task.id);
        activateCurrentTask();
      });
      pickerEl.appendChild(btn);
    });
  }

  overlay.hidden = false;
}

function showGoalCompleteOverlay() {
  const overlay   = document.getElementById('sessionNextOverlay');
  const iconEl    = document.getElementById('sessionNextIcon');
  const titleEl   = document.getElementById('sessionNextTitle');
  const bodyEl    = document.getElementById('sessionNextBody');
  const pickerEl  = document.getElementById('sessionTaskPicker');
  if (!overlay) { endSession(true); return; }

  if (iconEl)   iconEl.textContent = '🏆';
  if (titleEl)  titleEl.textContent = 'Goal Complete!';
  if (bodyEl)   bodyEl.textContent = 'Amazing work — all tasks finished!';
  if (pickerEl) pickerEl.innerHTML = '';
  overlay.hidden = false;
}

function endSession(goalComplete = false) {
  if (!_sessionState) return;

  saveSessionRecord({
    goalName: _sessionState.goalTitle,
    pomodorosCompleted: _sessionState.pomodoroCount,
    totalSeconds: Math.round((Date.now() - _sessionState.startTime) / 1000),
    goalComplete: !!goalComplete,
    completedAt: new Date().toISOString(),
  });

  // Persist completed task IDs so sidebar shows green ✓ after session
  persistSessionDoneIds(_sessionState.completedTaskIds);

  teardownMenuOverride();
  _timer?.stop?.();
  activateTask(null);
  closeSessionPanel();
  document.querySelector('.right-ui')?.classList.remove('is-open');

  const overlay = document.getElementById('sessionNextOverlay');
  if (overlay) overlay.hidden = true;

  _sessionState = null;
}

function renderSessionPanel() {
  if (!_sessionState) return;

  const titleEl = document.getElementById('sessionGoalTitle');
  if (titleEl) titleEl.textContent = _sessionState.goalTitle;

  const listEl = document.getElementById('sessionTaskList');
  if (!listEl) return;
  listEl.innerHTML = '';

  _sessionState.tasks.forEach(task => {
    const taskId   = String(task.id);
    const isActive = taskId === _sessionState.currentTaskId;
    const isDone   = _sessionState.completedTaskIds.has(taskId);

    const item = document.createElement('div');
    item.className = 'session-task-item' +
      (isActive ? ' is-active' : '') +
      (isDone   ? ' is-done'   : '');

    const nameEl = document.createElement('div');
    nameEl.className = 'session-task-name';
    if (isDone) {
      nameEl.innerHTML = `<span class="session-done-check">✓</span> ${escHtml(task.name || 'Task')}`;
    } else {
      nameEl.textContent = task.name || 'Task';
    }
    item.appendChild(nameEl);

    if (isActive) {
      const subtasks = getSubtasks(task.id);
      if (subtasks.length > 0) {
        const subList = document.createElement('div');
        subList.className = 'session-subtask-list';

        subtasks.forEach(sub => {
          const row = document.createElement('label');
          row.className = 'session-subtask-row' + (sub.done ? ' is-done' : '');

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'session-subtask-cb';
          cb.checked = !!sub.done;
          cb.addEventListener('change', () => {
            const updated = getSubtasks(task.id).map(s =>
              s.id === sub.id ? { ...s, done: cb.checked } : s
            );
            setSubtasks(task.id, updated);
            renderSessionPanel();
            if (updated.every(s => s.done)) handleTaskComplete();
          });

          const lbl = document.createElement('span');
          lbl.className = 'session-subtask-label';
          lbl.textContent = sub.title || 'Subtask';

          row.append(cb, lbl);
          subList.appendChild(row);
        });

        item.appendChild(subList);
      }
    }

    listEl.appendChild(item);
  });
}

// ── Session-done persistence ──────────────────────────────────────

function loadSessionDoneIds() {
  try {
    const raw = localStorage.getItem(SESSION_DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}

function persistSessionDoneIds(ids) {
  try {
    const existing = loadSessionDoneIds();
    ids.forEach(id => existing.add(String(id)));
    localStorage.setItem(SESSION_DONE_KEY, JSON.stringify([...existing]));
  } catch {}
}

/** Apply green ✓ styling to task cards completed in any past or current session. */
export function applySessionDoneVisuals() {
  const ids = loadSessionDoneIds();
  if (_sessionState) {
    _sessionState.completedTaskIds.forEach(id => ids.add(id));
  }
  if (!ids.size) return;
  document.querySelectorAll('.task-card[data-task-id]').forEach(card => {
    if (ids.has(card.dataset.taskId)) {
      card.classList.add('is-session-done');
      checkAllSubtasksInCard(card, card.dataset.taskId);
    }
  });
}

/** Mark a single task card as session-done immediately (no reload needed). */
function markTaskCardDone(taskId) {
  // Persist all subtasks as done so re-renders keep them checked
  const subs = getSubtasks(taskId);
  if (subs.length) {
    setSubtasks(taskId, subs.map(s => ({ ...s, done: true })));
  }
  document.querySelectorAll(`.task-card[data-task-id="${taskId}"]`).forEach(card => {
    card.classList.add('is-session-done');
    checkAllSubtasksInCard(card, taskId);
  });
}

/** Force-check every subtask checkbox inside a card and update localStorage. */
function checkAllSubtasksInCard(card, taskId) {
  card.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
  const subs = getSubtasks(taskId);
  if (subs.length && subs.some(s => !s.done)) {
    setSubtasks(taskId, subs.map(s => ({ ...s, done: true })));
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
