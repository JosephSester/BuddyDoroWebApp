// apps/web/js/features/tasks.js
// Full-featured Tasks module (create/select/delete + session editing)
// Exposes: initTasks({ onActiveTaskChange, onShouldStopTimer, onTaskEstimate }), getActiveTaskId(), getActiveTask()

// INTEGRATION: Import API service for backend communication
import { fetchTasks, createTask, updateTask, deleteTask as apiDeleteTask } from '../api/taskService.js';
import { fetchPanels, createPanel as apiCreatePanel, updatePanel as apiUpdatePanel, deletePanel as apiDeletePanel } from '../api/panelService.js';

// INTEGRATION: Import universal notification system
import { showNotification, setBusy } from '../utils/notifications.js';
import { createSubtasksSection, createSubtasksToggle, deleteTaskSubtasks, getSubtasks, setSubtasks, makeSubtaskId, renderList } from './subtasks.js';

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------
let onActiveTaskChange = () => { };
let onShouldStopTimer = () => { };
let onTaskEstimate = null;

export async function initTasks(opts = {}) {
  onActiveTaskChange = typeof opts.onActiveTaskChange === 'function'
    ? opts.onActiveTaskChange : () => { };
  onShouldStopTimer = typeof opts.onShouldStopTimer === 'function'
    ? opts.onShouldStopTimer : () => { };
  onTaskEstimate = typeof opts.onTaskEstimate === 'function'
    ? opts.onTaskEstimate : null;

  // Default to first panel's ids (keeps old behavior if present)
  els.addTaskBtn = document.getElementById('addTaskBtn');
  els.tasksList = document.getElementById('tasksList');

  // Set panel ID for the first panel's task list
  if (els.tasksList) {
    els.tasksList.dataset.panelId = 'tasksPanel-1';
  }

  // === Sync panels with server first (fallback to local) ===
  let savedPanels = loadPanelsFromStorage();
  try {
    let apiPanels = await fetchPanels();
    if (!Array.isArray(apiPanels) || apiPanels.length === 0) {
      const created = await apiCreatePanel('Goal');
      apiPanels = [created];
    }
    const normalized = apiPanels.map((p, idx) => ({ panelId: String(p.id), title: p.title || 'Goal', order: Number.isFinite(p.order) ? p.order : idx }));
    localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(normalized));
    savedPanels = normalized;
    // Set first panel dataset to the first server panel id
    if (els.tasksList && savedPanels[0]) {
      els.tasksList.dataset.panelId = savedPanels[0].panelId;
    }
    console.log('[Panels] Synced from server:', normalized);
  } catch (e) {
    console.warn('[Panels] Server sync failed, using local panels if any:', e);
  }

  // === Restore panels from localStorage first ===
  // (By here, savedPanels likely reflect server state)
  console.log('[Init] savedPanels result:', savedPanels);
  if (savedPanels && savedPanels.length > 1) {
    const stack = document.getElementById('tasksStack');
    const template = stack?.querySelector('.tasks-panel');

    console.log('[Init] Found stack:', !!stack, 'Found template:', !!template);
    console.log('[Init] Current panels in DOM:', stack?.querySelectorAll('.tasks-panel').length);

    if (stack && template) {
      // Keep first panel, restore additional panels
      for (let i = 1; i < savedPanels.length; i++) {
        const panel = savedPanels[i];
        console.log(`[Init] Restoring panel ${i}:`, panel);
        const clone = template.cloneNode(true);

        // Set panelId and title
        clone.id = panel.panelId;
        const list = clone.querySelector('.tasks-list');
        if (list) {
          list.id = `tasksList-${i + 1}`;
          list.dataset.panelId = panel.panelId;
          list.innerHTML = ''; // Clear any tasks
        }

        const titleEl = clone.querySelector('.tasks-title');
        if (titleEl) titleEl.textContent = panel.title;

        const createBtn = clone.querySelector('.task-add');
        if (createBtn) {
          createBtn.id = `addTaskBtn-${i + 1}`;
        }

        // Wire header actions and create button for this restored panel
        clone.querySelectorAll('.task-add').forEach(btn => {
          btn.addEventListener('click', onAddTaskClick);
        });

        // Need to call these after the functions are defined - will wire after IIFE
        stack.appendChild(clone);
      }

      // Update first panel title if saved
      if (savedPanels[0]) {
        const firstTitleEl = template.querySelector('.tasks-title');
        if (firstTitleEl) firstTitleEl.textContent = savedPanels[0].title;
      }

      console.log(`[Init] Restored ${savedPanels.length} panels from storage`);
      console.log('[Init] Panels now in DOM:', stack?.querySelectorAll('.tasks-panel').length);
    }
  } else {
    console.log('[Init] No panels to restore or only 1 panel');
  }

  // === Wire ALL existing "+ Create a Task" buttons ===
  document.querySelectorAll('.tasks-panel .task-add')
    .forEach(btn => btn.addEventListener('click', onAddTaskClick));

  // === Wire header buttons for ALL panels (including restored ones) ===
  document.querySelectorAll('.tasks-panel').forEach(panel => {
    wireHeaderRename(panel);
    wireHeaderDelete(panel);
  });

  // INTEGRATION: Load tasks from API
  try {
    console.log('Loading tasks from API...');
    const apiTasks = await fetchTasks();
    tasks.length = 0; // Clear array
    nextTaskId = 1;

    const localPanelMap = readTaskPanelMap();
    const localSessionsMap = readTaskSessionsMap();
    apiTasks.forEach(t => {
      const resolvedPanelId = t.panelId || localPanelMap?.[String(t.id)] || 'tasksPanel-1';
      const localSess = localSessionsMap?.[String(t.id)] || null;
      const resolvedTotal = (typeof t.total === 'number' && t.total > 0)
        ? t.total
        : (localSess?.total || CREATE_DEFAULT_ESTIMATE);
      const resolvedDone = (typeof t.done === 'number' && t.done >= 0)
        ? t.done
        : (typeof t.completed === 'boolean' ? (t.completed ? 1 : 0) : (localSess?.done || 0));
      tasks.push({
        id: t.id,
        name: t.text,
        total: resolvedTotal,
        done: Math.min(resolvedDone, resolvedTotal),
        panelId: resolvedPanelId
      });
      // Track the highest ID to avoid collisions
      const numId = Number(t.id);
      if (numId >= nextTaskId) nextTaskId = numId + 1;
    });

    console.log(`Loaded ${tasks.length} tasks from API`);

    // After loading, backfill missing panelIds to the server using local mapping (one-time migration)
    try {
      const localMap = readTaskPanelMap();
      const missing = tasks.filter(t => !apiTasks.find(s => s.id === t.id)?.panelId && localMap?.[String(t.id)]);
      for (const t of missing) {
        await updateTask(t.id, { panelId: t.panelId });
        console.log('[Init] Backfilled panelId to server for task', t.id, '->', t.panelId);
      }
    } catch (e) {
      console.warn('[Init] Could not backfill panelId to server:', e);
    }
  } catch (error) {
    console.error('Failed to load tasks from API:', error);
    // Fall back to empty list, don't break the app
  }

  renderAllTasks();
  notifyActiveChange();

  // Save panel structure after loading (ensures persistence on page load)
  savePanelsToStorage();
}

export function getActiveTaskId() {
  return activeTaskId;
}

export function getActiveTask() {
  if (activeTaskId == null) return null;
  return tasks.find(t => String(t.id) === String(activeTaskId)) || null;
}

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const els = { addTaskBtn: null, tasksList: null };

const tasks = []; // Each task has: { id, name, total, done, panelId }

let nextTaskId = 1;
let activeTaskId = null;

let sessionEditor = null;
let createTaskCtx = null;

const SESSION_MAX = 999;
const CREATE_NAME_MAX = 80;
const CREATE_DEFAULT_ESTIMATE = 50;

let domIdCounter = 0;
const makeDomId = (prefix = 'id') => `${prefix}-${Date.now()}-${++domIdCounter}`;

// -----------------------------------------------------------------------------
// Panel Persistence in localStorage
// -----------------------------------------------------------------------------
const PANELS_STORAGE_KEY = 'buddydoro_panels';
const TASK_PANEL_MAP_KEY = 'buddydoro_task_panel_map';
const TASK_SESSIONS_MAP_KEY = 'buddydoro_task_sessions_map';

function readTaskPanelMap() {
  try {
    const raw = localStorage.getItem(TASK_PANEL_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeTaskPanelMap(map) {
  try { localStorage.setItem(TASK_PANEL_MAP_KEY, JSON.stringify(map)); } catch { }
}

function setTaskPanel(taskId, panelId) {
  if (!taskId || !panelId) return;
  const map = readTaskPanelMap();
  map[String(taskId)] = panelId;
  writeTaskPanelMap(map);
}

function deleteTaskPanel(taskId) {
  const map = readTaskPanelMap();
  delete map[String(taskId)];
  writeTaskPanelMap(map);
}

function readTaskSessionsMap() {
  try {
    const raw = localStorage.getItem(TASK_SESSIONS_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeTaskSessionsMap(map) {
  try { localStorage.setItem(TASK_SESSIONS_MAP_KEY, JSON.stringify(map)); } catch { }
}

function setTaskSessions(taskId, sessions) {
  if (!taskId || !sessions) return;
  const map = readTaskSessionsMap();
  map[String(taskId)] = { total: Number(sessions.total) || 0, done: Number(sessions.done) || 0 };
  writeTaskSessionsMap(map);
}

function deleteTaskSessions(taskId) {
  const map = readTaskSessionsMap();
  delete map[String(taskId)];
  writeTaskSessionsMap(map);
}

function savePanelsToStorage() {
  try {
    const panels = [];
    document.querySelectorAll('.tasks-panel').forEach((panel, index) => {
      const titleEl = panel.querySelector('.tasks-title');
      const list = panel.querySelector('.tasks-list');
      panels.push({
        panelId: list?.dataset.panelId || `tasksPanel-${index + 1}`,
        title: titleEl?.textContent || 'Goal'
      });
    });
    localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(panels));
    console.log('[Panels] Saved panel structure:', panels);
    console.log('[Panels] localStorage now contains:', localStorage.getItem(PANELS_STORAGE_KEY));
  } catch (error) {
    console.error('[Panels] Failed to save panel structure:', error);
  }
}

function loadPanelsFromStorage() {
  try {
    const stored = localStorage.getItem(PANELS_STORAGE_KEY);
    console.log('[Panels] Raw localStorage value:', stored);
    if (!stored) {
      console.log('[Panels] No panels in localStorage');
      return null;
    }
    const panels = JSON.parse(stored);
    console.log('[Panels] Loaded panel structure:', panels);
    return panels;
  } catch (error) {
    console.error('[Panels] Failed to load panel structure:', error);
    return null;
  }
}

// ============================================================================
// Task-specific wrappers for universal notification system
// ============================================================================
/**
 * Shows a task-related notification
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showTaskNotification(message, type = 'info') {
  showNotification(message, type);
}

/**
 * Shows or hides loading state for tasks panel
 * @param {boolean} isBusy - Whether tasks are loading
 * @param {string} message - Loading message
 */
function setTasksBusy(isBusy, message = 'Working...') {
  setBusy(isBusy, message, els.tasksList);

  // Also disable the add task button
  if (els.addTaskBtn) {
    els.addTaskBtn.disabled = !!isBusy;
    els.addTaskBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }
}
let TASK_NAME_PATTERN;
try {
  TASK_NAME_PATTERN = new RegExp("^[\\p{L}\\p{N}][\\p{L}\\p{N}\\s'-]{0,79}$", 'u');
} catch (_err) {
  TASK_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s'-]{0,79}$/;
}
const TASK_NAME_ALLOWED_MESSAGE =
  'Name can include letters, numbers, spaces, apostrophes, or hyphens.';

// -----------------------------------------------------------------------------
// Utilities / side-effects to main app
// -----------------------------------------------------------------------------
function notifyActiveChange() {
  try { onActiveTaskChange(activeTaskId); } catch { /* noop */ }
}

// === NEW: handle clicks on ANY "+ Create a Task" button in ANY panel ===
function onAddTaskClick(e) {
  const button = e.currentTarget || e.target;
  const panel = button.closest('.tasks-panel');
  const list = panel?.querySelector('.tasks-list');
  if (!panel || !list) return;

  // Point the module at THIS panel's elements before opening the editor
  els.addTaskBtn = button;
  els.tasksList = list;

  // CRITICAL: Ensure this list has a unique panelId
  // If the panel has an ID, use it; otherwise generate a unique one
  if (!list.dataset.panelId || list.dataset.panelId === '') {
    const panelId = panel.id || `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    list.dataset.panelId = panelId;
    console.log(`[Tasks] Setting panelId: ${panelId} for list`);
  }
  console.log(`[Tasks] Creating task in panel: ${list.dataset.panelId}`);

  if (createTaskCtx) {
    createTaskCtx.nameInput.focus({ preventScroll: true });
    createTaskCtx.nameInput.select();
    return;
  }
  if (tasks.length >= 50) {
    alert('You can create up to 50 tasks.');
    return;
  }
  startCreateTask();
}



// ▼▼▼ NEW: header rename wiring (title + pencil) ▼▼▼
function wireHeaderRename(panel) {
  const titleEl = panel.querySelector('.tasks-title');
  const btn = panel.querySelector('.task-title-edit');
  const header = btn?.closest('.tasks-header') || titleEl?.parentNode;
  if (!titleEl || !btn) return;

  let editing = false;

  const closeInline = () => {
    const inline = header?.querySelector('.task-title-inline');
    if (inline) inline.remove();
    titleEl.hidden = false;
    btn.hidden = false;
    editing = false;
  };

  const saveTitle = async (value) => {
    const clean = (value || '').trim();
    if (!clean) { closeInline(); return; }
    titleEl.textContent = clean.slice(0, 40);
    savePanelsToStorage();
    try {
      const panelId = panel.id || panel.querySelector('.tasks-list')?.dataset.panelId;
      if (panelId) await apiUpdatePanel(panelId, { title: titleEl.textContent });
    } catch (e) { console.warn('[Panels] Failed to update panel title:', e); }
    closeInline();
  };

  const startInline = () => {
    if (editing) return;
    editing = true;
    // Remove any existing inline in this header (safety)
    const existing = header?.querySelector('.task-title-inline');
    if (existing) existing.remove();
    titleEl.hidden = true;
    btn.hidden = true;

    const wrapper = document.createElement('div');
    wrapper.className = 'task-title-inline';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-title-input';
    input.value = (titleEl.textContent || 'Tasks').trim();
    input.maxLength = 40;
    input.setAttribute('aria-label', 'Goal name');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveTitle(input.value); }
      if (e.key === 'Escape') { e.preventDefault(); closeInline(); }
    });
    input.addEventListener('blur', () => { closeInline(); });

    wrapper.append(input);
    if (header) {
      header.insertBefore(wrapper, titleEl);
    } else {
      titleEl.parentNode.insertBefore(wrapper, titleEl);
    }
    input.focus({ preventScroll: true });
    input.select();
  };

  btn.addEventListener('click', (e) => { e.stopPropagation(); startInline(); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startInline(); }
  });
}


// ▼▼▼ Header delete wiring (trash button with confirm) ▼▼▼
function wireHeaderDelete(panel) {
  const delBtn = panel.querySelector('.task-title-delete');
  if (!delBtn) return;

  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();

    const titleEl = panel.querySelector('.tasks-title');
    const name = (titleEl?.textContent || 'this goal').trim() || 'this goal';

    // prevent deleting the last remaining panel
    const stack = panel.closest('#tasksStack') || document;
    const total = stack.querySelectorAll('.tasks-panel').length;
    if (total <= 1) {
      alert('You must keep at least one goal.');
      return;
    }

    const ok = confirm(`Are you sure you want to delete "${name}"?`);
    if (!ok) return;

    // Get the panelId from the panel being deleted
    const panelId = panel.id || panel.querySelector('.tasks-list')?.dataset.panelId;

    // Delete all tasks in this panel from the backend
    if (panelId) {
      const tasksInPanel = tasks.filter(t => t.panelId === panelId);
      console.log(`[Panel Delete] Found ${tasksInPanel.length} tasks in panel ${panelId}:`);

      // Check if the active task is in this panel - if so, reset timer when panel is deleted
      const activeTaskInPanel = tasksInPanel.some(t => t.id === activeTaskId);

      setTasksBusy(true, 'Deleting goal and its tasks...');

      for (const task of tasksInPanel) {
        try {
          console.log(`[Panel Delete] Deleting task ${task.id} from panel ${panelId}`);
          await apiDeleteTask(task.id);
          // Remove from local state and mapping
          const i = tasks.findIndex(t => t.id === task.id);
          if (i !== -1) tasks.splice(i, 1);
          deleteTaskPanel(task.id);
          deleteTaskSessions(task.id);
          deleteTaskSubtasks(task.id);
        } catch (error) {
          console.error(`[Panel Delete] Failed to delete task ${task.id}:`, error);
        }
      }

      setTasksBusy(false);

      // Reset active task if it was deleted with the panel
      if (activeTaskInPanel) {
        console.log('[Panel Delete] Active task was in deleted panel');
        activeTaskId = null;
        updateActiveTaskVisuals();
        notifyActiveChange();
      }

      // Delete panel from server
      try {
        await apiDeletePanel(panelId);
        console.log('[Panel Delete] Deleted panel from server:', panelId);
      } catch (e) {
        console.warn('[Panel Delete] Failed to delete panel from server:', e);
      }
    }

    // remove the entire tasks panel
    panel.remove();

    // Save panel structure to localStorage
    savePanelsToStorage();

    // re-enable adder if it was disabled at limit
    const addBtn = document.querySelector('#addTasksPanel');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.title = '';
    }
  });
}


// -----------------------------------------------------------------------------
// Rendering & interactions
// -----------------------------------------------------------------------------
const isEditingSessions = () => sessionEditor != null;
const formatSessions = task => `${task.done}/${task.total}`;
const formatSubtaskProgress = task => {
  const subs = getSubtasks(task.id);
  if (!subs.length) return '0/0';
  const done = subs.filter(s => s.done).length;
  return `${done}/${subs.length}`;
};

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.setAttribute('role', 'option');
  card.dataset.taskId = String(task.id);
  card.id = `task-option-${task.id}`;
  card.tabIndex = 0;

  const main = document.createElement('div');
  main.className = 'task-main';
  const name = document.createElement('span');
  name.className = 'task-name';
  name.textContent = task.name;
  main.append(name);

  const right = document.createElement('div');
  right.className = 'task-right';

  const bubble = document.createElement('div');
  bubble.className = 'session-bubble';
  bubble.tabIndex = 0;
  bubble.setAttribute('role', 'button');
  bubble.setAttribute('aria-label', `Completed ${formatSubtaskProgress(task)} subtasks`);
  bubble.textContent = formatSubtaskProgress(task);
  bubble.addEventListener('click', evt => evt.stopPropagation());
  bubble.addEventListener('mousedown', evt => evt.stopPropagation());
  bubble.addEventListener('dblclick', evt => {
    evt.preventDefault(); evt.stopPropagation(); startSessionEdit(task, bubble);
  });
  bubble.addEventListener('keydown', evt => {
    if (sessionEditor && sessionEditor.bubble === bubble) return;
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault(); evt.stopPropagation(); startSessionEdit(task, bubble);
    }
  });

  const del = document.createElement('button');
  del.className = 'task-del';
  del.type = 'button';
  del.setAttribute('aria-label', `Delete task: ${task.name}`);
  del.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2H8l1-2zm1 6v8m4-8v8"
          fill="none" stroke="#2b2213" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  del.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (confirm(`Delete "${task.name}"?`)) deleteTask(task.id);
  });

  right.append(bubble, del);
  card.append(main, right);

  // Subtasks UI: Create subtasks section and toggle button
  const subsSection = createSubtasksSection(task, {
    onSetTimerFromEstimate: onTaskEstimate,
    onChange: renderAllTasks,
  });

  // Insert toggle button into task-right, before delete button
  const subToggle = createSubtasksToggle(task, subsSection.wrapInner, {
    onAddSubtask: () => {
      const title = prompt('Subtask name');
      if (!title || !title.trim()) return;
      const estRaw = prompt('Estimate (minutes, optional)');
      let estimate = Number(estRaw);
      if (!Number.isInteger(estimate) || estimate < 1) estimate = null;
      const sub = { id: makeSubtaskId(), title: title.trim(), estimate, done: false };
      const next = [...getSubtasks(task.id), sub];
      setSubtasks(task.id, next);
      renderList(task, subsSection.list, { onSetTimerFromEstimate: onTaskEstimate, onChange: renderAllTasks });
      subsSection.wrapInner.hidden = false;
      subToggle.setAttribute('aria-expanded', 'true');
    },
    onSetTimerFromEstimate: onTaskEstimate,
    onChange: renderAllTasks,
  });
  right.insertBefore(subToggle, del);

  // Append the subtasks block below the card
  card.append(subsSection.wrap);

  wireTaskCardInteractions(card);
  return card;
}

function wireTaskCardInteractions(card) {
  const toggleHover = isOn => card.classList.toggle('is-hover', isOn);
  card.addEventListener('mouseenter', () => toggleHover(true));
  card.addEventListener('mouseleave', () => toggleHover(false));
  card.addEventListener('focus', () => toggleHover(true));
  card.addEventListener('blur', () => toggleHover(false));
  card.addEventListener('click', () => {
    if (isEditingSessions()) return;
    setActiveTask(card.dataset.taskId); // Keep as string
  });
  card.addEventListener('keydown', evt => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault(); setActiveTask(card.dataset.taskId); return;
    }
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      evt.preventDefault();
      focusSiblingCard(card, evt.key === 'ArrowDown' ? 1 : -1);
    }
  });
}

function focusSiblingCard(card, offset) {
  // Find the task list that contains this card
  const list = card.closest('.tasks-list');
  if (!list) return;

  const cards = Array.from(list.querySelectorAll('.task-card'));
  const idx = cards.indexOf(card); if (idx === -1 || cards.length === 0) return;
  let next = idx + offset;
  if (next < 0) next = cards.length - 1;
  if (next >= cards.length) next = 0;
  cards[next]?.focus();
}

function updateActiveTaskVisuals() {
  let activeCard = null;
  // Update visuals in ALL panels, not just the currently selected one
  document.querySelectorAll('.tasks-panel .task-card').forEach(card => {
    const isActive = String(card.dataset.taskId) === String(activeTaskId);
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) activeCard = card;
  });

  // Update aria-activedescendant for all task lists
  document.querySelectorAll('.tasks-list').forEach(list => {
    const activeInList = list.querySelector('.task-card.is-active');
    if (activeInList) {
      list.setAttribute('aria-activedescendant', activeInList.id);
    } else {
      list.removeAttribute('aria-activedescendant');
    }
  });
}

function ensureActiveTaskIsValid() {
  if (activeTaskId != null && !tasks.some(t => String(t.id) === String(activeTaskId))) {
    activeTaskId = null;
    try { onShouldStopTimer(); } catch { /* noop */ }
  }
}

function renderAllTasks() {
  cancelSessionEdit({ restoreOriginal: false });

  // Render tasks into ALL panels, each showing only its own tasks
  document.querySelectorAll('.tasks-panel').forEach(panel => {
    const list = panel.querySelector('.tasks-list');
    if (!list) return;

    // Ensure panel has an ID for tracking
    const panelId = list.dataset.panelId || panel.id || makeDomId('panel');
    if (!list.dataset.panelId) list.dataset.panelId = panelId;

    // Only add the create node to the currently active panel
    const createNode = (list === els.tasksList) ? (createTaskCtx?.container || null) : null;

    // STRICT FILTER: Only show tasks that explicitly match this panel's ID
    const panelTasks = tasks.filter(t => {
      const matches = t.panelId === panelId;
      if (!matches && t.panelId) {
        // Task belongs to a different panel, skip it
        return false;
      }
      return matches;
    });

    list.innerHTML = '';
    if (createNode) list.appendChild(createNode);
    panelTasks.forEach(t => list.appendChild(createTaskCard(t)));
  });

  ensureActiveTaskIsValid();
  updateActiveTaskVisuals();
  // consumer decides what to do with start button, etc.
  notifyActiveChange();
}

// -----------------------------------------------------------------------------
// CRUD
// -----------------------------------------------------------------------------
async function addTask(name, total, { atTop = false, panelId: providedPanelId } = {}) {
  setTasksBusy(true, 'Saving task...');
  try {
    // Resolve the panel ID: use provided context, else current list, else default
    const panelId = providedPanelId || els.tasksList?.dataset.panelId || 'tasksPanel-1';

    // Validation: ensure panelId is valid
    if (!panelId || panelId === '') {
      console.error('[Tasks] Invalid panelId during task creation!');
      throw new Error('Cannot create task without valid panel ID');
    }

    console.log(`[Tasks] Adding task "${name}" to panel: ${panelId}`);

    // Create task on API with panelId
    const apiTask = await createTask(name, panelId);

    // Add to local state
    const t = {
      id: apiTask.id,
      name: apiTask.text,
      total: Number(total || CREATE_DEFAULT_ESTIMATE),
      done: 0,
      panelId: panelId  // Track which panel this task belongs to
    };
    if (atTop) tasks.unshift(t); else tasks.push(t);
    // Persist sessions mapping locally so refresh preserves 0/total
    setTaskSessions(t.id, { total: t.total, done: t.done });
    // persist mapping locally so refresh can recover placement if server lacks panelId
    setTaskPanel(t.id, panelId);
    renderAllTasks();
    console.log('Task created:', t);
    showTaskNotification('Task created successfully', 'success');
    return t;
  } catch (error) {
    console.error('Failed to create task:', error);
    const errorMsg = error.message || 'Could not save task. Please try again.';
    showTaskNotification(errorMsg, 'error');
    throw error;
  } finally {
    setTasksBusy(false);
  }
}

async function deleteTask(id) {
  setTasksBusy(true, 'Deleting task...');
  try {
    // Delete from API first
    await apiDeleteTask(id);

    // Remove from local state
    const i = tasks.findIndex(t => t.id === id);
    if (i === -1) return;
    const [removed] = tasks.splice(i, 1);
    if (removed.id === activeTaskId) {
      activeTaskId = null;
      try { onShouldStopTimer(); } catch { /* noop */ }
    }
    // Also remove local mappings
    deleteTaskPanel(id);
    deleteTaskSessions(id);
    deleteTaskSubtasks(id);
    renderAllTasks();
    console.log('Task deleted:', id);
    showTaskNotification('Task deleted', 'success');
  } catch (error) {
    console.error('Failed to delete task:', error);
    const errorMsg = error.message || 'Could not delete task. Please try again.';
    showTaskNotification(errorMsg, 'error');
    throw error;
  } finally {
    setTasksBusy(false);
  }
}

function setActiveTask(taskId) {
  // Convert to string for comparison (MongoDB IDs are strings)
  const taskIdStr = taskId != null ? String(taskId) : null;
  if (taskIdStr != null && !tasks.some(t => String(t.id) === taskIdStr)) return; // Invalid ID

  // Toggle: clicking the same task again deselects it
  if (String(activeTaskId) === taskIdStr) {
    activeTaskId = null;
    try { onShouldStopTimer(); } catch { /* noop */ }
    updateActiveTaskVisuals();
    notifyActiveChange();
    return;
  }

  activeTaskId = taskIdStr;
  if (activeTaskId == null) {
    try { onShouldStopTimer(); } catch { /* noop */ }
  }
  updateActiveTaskVisuals();
  notifyActiveChange();
}

// -----------------------------------------------------------------------------
// Create Task inline editor
// -----------------------------------------------------------------------------
function startCreateTask(initial = {}) {
  if (createTaskCtx) {
    if (typeof initial.title === 'string') {
      createTaskCtx.nameInput.value = initial.title.trim().slice(0, CREATE_NAME_MAX);
    }
    if (initial.estimate !== undefined) {
      let estValue = Number(initial.estimate);
      if (!Number.isInteger(estValue) || estValue < 1 || estValue > SESSION_MAX) {
        estValue = CREATE_DEFAULT_ESTIMATE;
      }
      createTaskCtx.estimateInput.value = String(estValue);
    }
    if (initial.error) {
      createTaskCtx.shouldShowErrors = true;
      showCreateTaskError(initial.error, createTaskCtx);
    }
    validateCreateTask(createTaskCtx);
    if (initial.error) { showCreateTaskError(initial.error, createTaskCtx); }
    createTaskCtx.nameInput.focus({ preventScroll: true });
    createTaskCtx.nameInput.select();
    return;
  }

  cancelSessionEdit();

  const initialTitle = (initial.title ?? '').trim().slice(0, CREATE_NAME_MAX);
  let initialEstimate = Number(initial.estimate);
  if (!Number.isInteger(initialEstimate) || initialEstimate < 1 || initialEstimate > SESSION_MAX) {
    initialEstimate = CREATE_DEFAULT_ESTIMATE;
  }

  const container = document.createElement('div');
  container.className = 'task-card task-create';
  const labelId = makeDomId('createTaskLabel');
  container.setAttribute('role', 'form');
  container.setAttribute('aria-labelledby', labelId);

  const heading = document.createElement('div');
  heading.id = labelId;
  heading.className = 'sr-only';
  heading.textContent = 'Create task';
  container.appendChild(heading);

  const fields = document.createElement('div');
  fields.className = 'task-create-fields';

  const nameField = document.createElement('div');
  nameField.className = 'task-create-field';
  const nameInputId = makeDomId('createTaskName');
  const nameLabel = document.createElement('label');
  nameLabel.className = 'task-create-label';
  nameLabel.textContent = 'Name';
  nameLabel.setAttribute('for', nameInputId);
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'task-create-input task-create-name';
  nameInput.placeholder = 'Task name...';
  nameInput.maxLength = CREATE_NAME_MAX;
  nameInput.value = initialTitle;
  nameInput.required = true;
  nameInput.setAttribute('aria-label', 'Task name');
  nameInput.id = nameInputId;
  nameField.append(nameLabel, nameInput);

  const estimateField = document.createElement('div');
  estimateField.className = 'task-create-field';
  const estimateInputId = makeDomId('createTaskEstimate');
  const estimateLabel = document.createElement('label');
  estimateLabel.className = 'task-create-label';
  estimateLabel.textContent = 'Estimate';
  estimateLabel.setAttribute('for', estimateInputId);
  const estimateInput = document.createElement('input');
  estimateInput.type = 'number';
  estimateInput.className = 'task-create-input task-create-estimate';
  estimateInput.min = '1';
  estimateInput.max = String(SESSION_MAX);
  estimateInput.step = '1';
  estimateInput.inputMode = 'numeric';
  estimateInput.value = String(initialEstimate);
  estimateInput.setAttribute('aria-label', 'Estimated sessions');
  estimateInput.id = estimateInputId;
  estimateField.append(estimateLabel, estimateInput);

  fields.append(nameField, estimateField);
  container.appendChild(fields);

  const actions = document.createElement('div');
  actions.className = 'task-create-actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'task-create-save';
  saveBtn.textContent = 'Save';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'task-create-cancel';
  cancelBtn.textContent = 'Cancel';
  actions.append(saveBtn, cancelBtn);
  container.appendChild(actions);

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');
  errorEl.hidden = true;
  container.appendChild(errorEl);

  const stopPropagation = evt => evt.stopPropagation();
  [container, nameInput, estimateInput, saveBtn, cancelBtn].forEach(el => {
    ['click', 'mousedown', 'mouseup', 'dblclick'].forEach(evtName => el.addEventListener(evtName, stopPropagation));
  });

  const ctx = {
    container,
    nameInput,
    estimateInput,
    saveBtn,
    cancelBtn,
    errorEl,
    panelId: els.tasksList?.dataset.panelId || 'tasksPanel-1',
    shouldShowErrors: Boolean(initial.error),
    cleanupFns: []
  };

  const handleInput = () => { ctx.shouldShowErrors = true; validateCreateTask(ctx); };
  nameInput.addEventListener('input', handleInput);
  estimateInput.addEventListener('input', handleInput);
  ctx.cleanupFns.push(() => nameInput.removeEventListener('input', handleInput));
  ctx.cleanupFns.push(() => estimateInput.removeEventListener('input', handleInput));

  const handleNameKey = evt => {
    if (evt.key === 'Enter') { evt.preventDefault(); ctx.shouldShowErrors = true; attemptCreateTaskSave(); }
    else if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
  };
  const handleEstimateKey = evt => {
    if (evt.key === 'Enter') { evt.preventDefault(); ctx.shouldShowErrors = true; attemptCreateTaskSave(); }
    else if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
  };
  nameInput.addEventListener('keydown', handleNameKey);
  estimateInput.addEventListener('keydown', handleEstimateKey);
  ctx.cleanupFns.push(() => nameInput.removeEventListener('keydown', handleNameKey));
  ctx.cleanupFns.push(() => estimateInput.removeEventListener('keydown', handleEstimateKey));

  const handleButtonKey = evt => {
    if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
  };
  saveBtn.addEventListener('keydown', handleButtonKey);
  cancelBtn.addEventListener('keydown', handleButtonKey);
  ctx.cleanupFns.push(() => saveBtn.removeEventListener('keydown', handleButtonKey));
  ctx.cleanupFns.push(() => cancelBtn.removeEventListener('keydown', handleButtonKey));

  const onSaveClick = () => { ctx.shouldShowErrors = true; attemptCreateTaskSave(); };
  const onCancelClick = () => cancelCreateTask();
  saveBtn.addEventListener('click', onSaveClick);
  cancelBtn.addEventListener('click', onCancelClick);
  ctx.cleanupFns.push(() => saveBtn.removeEventListener('click', onSaveClick));
  ctx.cleanupFns.push(() => cancelBtn.removeEventListener('click', onCancelClick));

  const onContainerKeydown = evt => {
    if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
  };
  container.addEventListener('keydown', onContainerKeydown);
  ctx.cleanupFns.push(() => container.removeEventListener('keydown', onContainerKeydown));

  els.tasksList.prepend(container);
  createTaskCtx = ctx;
  setCreateButtonDisabled(true);

  validateCreateTask(ctx);
  if (initial.error) { showCreateTaskError(initial.error, ctx); }
  nameInput.focus();
  nameInput.select();
}

function validateCreateTask(ctx, { forceShow = false } = {}) {
  if (!ctx) return { valid: false };
  if (forceShow) ctx.shouldShowErrors = true;
  const title = ctx.nameInput.value.trim();

  let message = '';
  if (!title) message = 'Name is required.';
  else if (title.length > CREATE_NAME_MAX) message = `Name must be ${CREATE_NAME_MAX} characters or fewer.`;
  else if (!TASK_NAME_PATTERN.test(title)) message = TASK_NAME_ALLOWED_MESSAGE;

  const rawEstimate = ctx.estimateInput.value.trim();
  let estimateValue = null;
  if (!message) {
    if (rawEstimate === '') { message = 'Estimate is required.'; }
    else {
      const estNumber = Number(rawEstimate);
      if (!Number.isFinite(estNumber)) message = 'Estimate must be a number.';
      else if (!Number.isInteger(estNumber)) message = 'Estimate must be a whole number.';
      else if (estNumber < 1) message = 'Estimate must be at least 1.';
      else if (estNumber > SESSION_MAX) message = `Estimate must be ${SESSION_MAX} or less.`;
      else estimateValue = estNumber;
    }
  }

  if (!message) {
    ctx.estimateInput.value = String(estimateValue);
  }

  ctx.saveBtn.disabled = Boolean(message);
  const shouldShow = ctx.shouldShowErrors || forceShow;
  showCreateTaskError(shouldShow ? message : '', ctx);
  return { valid: !message, title, estimate: estimateValue };
}

async function attemptCreateTaskSave() {
  if (!createTaskCtx) return;
  const ctx = createTaskCtx;
  const result = validateCreateTask(ctx, { forceShow: true });
  if (!result.valid) return;

  const { title, estimate } = result;
  if (tasks.length >= 50) {
    showCreateTaskError('You can create up to 50 tasks.', ctx);
    ctx.saveBtn.disabled = true;
    return;
  }

  // CRITICAL: await the task creation to prevent race conditions
  try {
    await addTask(title, estimate, { atTop: true, panelId: ctx.panelId });
    teardownCreateTaskEditor({ focusButton: false });
  } catch (err) {
    // Show error inline if task creation fails
    showCreateTaskError(err?.message || 'Unable to create task. Please try again.', ctx);
  }
}

function cancelCreateTask({ focusButton = true } = {}) {
  if (!createTaskCtx) return;
  teardownCreateTaskEditor({ focusButton });
}

function teardownCreateTaskEditor({ focusButton = true } = {}) {
  if (!createTaskCtx) return;
  const ctx = createTaskCtx;
  ctx.cleanupFns.forEach(fn => { try { fn(); } catch { } });
  ctx.cleanupFns.length = 0;
  if (ctx.container.parentElement) { ctx.container.parentElement.removeChild(ctx.container); }
  createTaskCtx = null;
  setCreateButtonDisabled(false);
  if (focusButton && els.addTaskBtn) { els.addTaskBtn.focus({ preventScroll: true }); }
}

function showCreateTaskError(message, ctx = createTaskCtx) {
  if (!ctx || !ctx.errorEl) return;
  if (message) {
    ctx.errorEl.hidden = false;
    ctx.errorEl.textContent = message;
  } else {
    ctx.errorEl.hidden = true;
    ctx.errorEl.textContent = '';
  }
}

function setCreateButtonDisabled(disabled) {
  if (!els.addTaskBtn) return;
  els.addTaskBtn.disabled = !!disabled;
}

// -----------------------------------------------------------------------------
// Session inline editor on the task bubble
// -----------------------------------------------------------------------------
function createSessionField(labelText, initialValue) {
  const wrapper = document.createElement('div');
  wrapper.className = 'session-field';

  const safeSuffix = labelText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const inputId = makeDomId(`sessionField-${safeSuffix}`);

  const label = document.createElement('label');
  label.className = 'session-field-label';
  label.textContent = labelText;
  label.setAttribute('for', inputId);

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'session-input';
  input.inputMode = 'numeric';
  input.min = '0';
  input.max = String(SESSION_MAX);
  input.step = '1';
  input.value = String(initialValue);
  input.setAttribute('aria-label', labelText);
  input.setAttribute('role', 'spinbutton');
  input.id = inputId;

  wrapper.append(label, input);
  return { wrapper, input };
}

function paintSessionBubble(task, bubble) {
  if (!bubble) return;
  bubble.textContent = formatSessions(task);
  bubble.setAttribute('aria-label', `Completed ${task.done} of ${task.total} sessions`);
}

function paintSessionBubbleFromTask(task) {
  // Find the list for this task's panel and update its bubble
  const list = document.querySelector(`.tasks-list[data-panel-id="${task.panelId}"]`);
  const card = list?.querySelector(`.task-card[data-task-id="${task.id}"]`);
  if (!card) return;
  const bubble = card.querySelector('.session-bubble');
  paintSessionBubble(task, bubble);
}

function startSessionEdit(task, bubble) {
  if (sessionEditor && sessionEditor.bubble === bubble) return;
  if (sessionEditor) cancelSessionEdit({ restoreOriginal: false });
  const card = bubble.closest('.task-card');
  if (!card) return;

  const ctx = {
    taskRef: task,
    taskId: task.id,
    bubble,
    card,
    originalDone: task.done,
    originalTotal: task.total,
  };

  bubble.classList.add('editing');
  bubble.setAttribute('role', 'group');
  bubble.setAttribute('aria-label', `Edit sessions for ${task.name}`);
  bubble.innerHTML = '';

  const liveRegion = document.createElement('div');
  liveRegion.className = 'sr-only';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.textContent = `Editing sessions for ${task.name}`;
  bubble.appendChild(liveRegion);

  const completedField = createSessionField('Completed', task.done);
  const estimateField = createSessionField('Estimate', task.total);
  bubble.append(completedField.wrapper, estimateField.wrapper);

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');
  errorEl.hidden = true;
  bubble.appendChild(errorEl);

  const stopEvt = evt => evt.stopPropagation();
  ['click', 'mousedown', 'mouseup', 'dblclick', 'keydown'].forEach(evtName => {
    completedField.input.addEventListener(evtName, stopEvt);
    estimateField.input.addEventListener(evtName, stopEvt);
  });

  const onKey = evt => {
    if (evt.key === 'Enter') { evt.preventDefault(); commitSessionEdit(); }
    else if (evt.key === 'Escape') { evt.preventDefault(); cancelSessionEdit(); }
  };
  completedField.input.addEventListener('keydown', onKey);
  estimateField.input.addEventListener('keydown', onKey);

  const onFocusOut = () => {
    setTimeout(() => {
      if (!sessionEditor || sessionEditor.bubble !== bubble) return;
      if (!bubble.contains(document.activeElement)) commitSessionEdit();
    }, 0);
  };
  bubble.addEventListener('focusout', onFocusOut);

  ctx.completedInput = completedField.input;
  ctx.estimateInput = estimateField.input;
  ctx.errorEl = errorEl;
  ctx.blurHandler = onFocusOut;
  ctx.cleanupFns = [
    () => completedField.input.removeEventListener('keydown', onKey),
    () => estimateField.input.removeEventListener('keydown', onKey),
    () => bubble.removeEventListener('focusout', onFocusOut)
  ];

  sessionEditor = ctx;
  completedField.input.focus();
  completedField.input.select();
}

function cancelSessionEdit({ restoreOriginal = true } = {}) {
  if (!sessionEditor) return;
  const ctx = sessionEditor;
  if (restoreOriginal) {
    ctx.taskRef.done = ctx.originalDone;
    ctx.taskRef.total = ctx.originalTotal;
  }
  teardownSessionEditor(ctx);
  if (ctx.bubble.isConnected) ctx.bubble.focus({ preventScroll: true });
}

function commitSessionEdit() {
  if (!sessionEditor) return;
  const ctx = sessionEditor;
  const { completedInput, estimateInput, taskRef } = ctx;

  const completedResult = readSessionValue(completedInput, 'Completed');
  if (completedResult.error) {
    showSessionError(completedResult.error, ctx);
    completedInput.focus(); completedInput.select(); return;
  }
  const estimateResult = readSessionValue(estimateInput, 'Estimate');
  if (estimateResult.error) {
    showSessionError(estimateResult.error, ctx);
    estimateInput.focus(); estimateInput.select(); return;
  }

  const completedVal = completedResult.value;
  const estimateVal = estimateResult.value;

  if (completedVal > estimateVal) {
    showSessionError('Completed cannot exceed estimate.', ctx);
    completedInput.focus(); completedInput.select(); return;
  }

  showSessionError('', ctx);

  if (completedVal === taskRef.done && estimateVal === taskRef.total) {
    teardownSessionEditor(ctx);
    ctx.bubble.focus({ preventScroll: true });
    return;
  }

  const prevDone = taskRef.done;
  const prevTotal = taskRef.total;

  taskRef.done = completedVal;
  taskRef.total = estimateVal;
  // Persist sessions to localStorage
  setTaskSessions(taskRef.id, { total: estimateVal, done: completedVal });

  // If this is the active task, notify estimate change
  if (String(taskRef.id) === String(activeTaskId) && onTaskEstimate) {
    try {
      onTaskEstimate(estimateVal);
    } catch (err) {
      console.error('Failed to handle task estimate:', err);
    }
  }

  teardownSessionEditor(ctx);
  if (ctx.bubble.isConnected) ctx.bubble.focus({ preventScroll: true });

  // Stubbed persistence update:
  Promise.resolve({ ok: true }).catch(err => {
    taskRef.done = prevDone;
    taskRef.total = prevTotal;
    setTaskSessions(taskRef.id, { total: prevTotal, done: prevDone });
    paintSessionBubbleFromTask(taskRef);
    flashSessionError(ctx.taskId, err?.message || 'Unable to save changes');
  });
}

function teardownSessionEditor(providedCtx) {
  const ctx = providedCtx || sessionEditor;
  if (!ctx) return;
  const { bubble, taskRef, cleanupFns = [] } = ctx;
  cleanupFns.forEach(fn => { try { fn(); } catch { } });
  bubble.classList.remove('editing');
  bubble.innerHTML = '';
  bubble.setAttribute('role', 'button');
  paintSessionBubble(taskRef, bubble);
  sessionEditor = null;
}

function readSessionValue(input, label) {
  const raw = String(input.value ?? '').trim();
  if (raw === '') return { error: `${label} is required.` };
  const num = Number(raw);
  if (!Number.isFinite(num)) return { error: `${label} must be a number.` };
  if (!Number.isInteger(num)) return { error: `${label} must be a whole number.` };
  if (num < 0) return { error: `${label} must be 0 or greater.` };
  if (num > SESSION_MAX) return { error: `${label} must be ${SESSION_MAX} or less.` };
  input.value = String(num);
  return { value: num };
}

function showSessionError(message, ctx = sessionEditor) {
  if (!ctx || !ctx.errorEl) return;
  if (message) {
    ctx.errorEl.hidden = false;
    ctx.errorEl.textContent = message;
  } else {
    ctx.errorEl.hidden = true;
    ctx.errorEl.textContent = '';
  }
}

function flashSessionError(taskId, message) {
  // Route error message to the correct panel by taskId → panelId
  const task = tasks.find(t => String(t.id) === String(taskId));
  const list = task ? document.querySelector(`.tasks-list[data-panel-id="${task.panelId}"]`) : els.tasksList;
  const card = list?.querySelector(`.task-card[data-task-id="${taskId}"]`);
  if (!card) return;
  let container = card.querySelector('.session-error');
  if (!container) {
    container = document.createElement('div');
    container.className = 'field-error session-error';
    container.setAttribute('role', 'alert');
    card.querySelector('.task-right')?.appendChild(container);
  }
  container.textContent = message;
  container.hidden = false;
  setTimeout(() => { if (container && container.parentElement) { container.remove(); } }, 4000);
}

// -----------------------------------------------------------------------------
// Goals Panel Adder (outside the goals panel, below it)
// -----------------------------------------------------------------------------
(function mountTasksPanelAdder() {
  const MAX_PANELS = 5;
  const stack = document.querySelector('#tasksStack');
  const addBtn = document.querySelector('#addTasksPanel');
  if (!stack || !addBtn) return;

  // First panel is the template
  const template = stack.querySelector('.tasks-panel');
  if (!template) return;

  // <<< ADD: keep the outside "+" chip aligned under the stack >>>
  const chipRow = document.querySelector('.tasks-chip-row');

  function placeChipRow() {
    if (!chipRow || !stack) return;
    const r = stack.getBoundingClientRect();
    chipRow.style.position = 'absolute';
    chipRow.style.right = '3vw';
    chipRow.style.top = `${Math.round(window.scrollY + r.bottom + 12)}px`;
  }

  // initial placement + keep in sync on resize/stack size changes
  placeChipRow();
  new ResizeObserver(() => placeChipRow()).observe(stack);
  window.addEventListener('resize', placeChipRow);
  // <<< /ADD >>>



  // Make sure the header buttons work on the first panel
  wireHeaderRename(template);
  wireHeaderDelete(template);

  function countPanels() {
    return stack.querySelectorAll('.tasks-panel').length;
  }

  function uniquifyIds(panel, index) {
    panel.id = `tasksPanel-${index}`;
    const list = panel.querySelector('.tasks-list[id]');
    if (list) {
      list.id = `tasksList-${index}`;
      // CRITICAL: Reset panelId so this list is independent
      list.dataset.panelId = `tasksPanel-${index}`;
    }
    const createBtn = panel.querySelector('.task-add[id]');
    if (createBtn) createBtn.id = `addTaskBtn-${index}`;
  }

  // One canonical reset that also prevents doubles/nesting
  function resetPanel(panel) {
    // 1) Clear any tasks in the cloned panel
    panel.querySelectorAll('.tasks-list').forEach(list => {
      list.innerHTML = '';
      // CRITICAL: Remove inherited panelId so it gets reassigned
      delete list.dataset.panelId;
    });

    // 2) Reset the header title
    const titleEl = panel.querySelector('.tasks-title');
    if (titleEl) titleEl.textContent = 'Goal';

    // 3) REMOVE any accidentally nested .tasks-panel inside this panel
    const innerPanels = Array.from(panel.querySelectorAll('.tasks-panel'));
    innerPanels.forEach(p => { if (p !== panel) p.remove(); });

    // 4) Ensure there is only ONE "+ Create a Task" button in the panel
    const addButtons = Array.from(panel.querySelectorAll('.task-add'));
    addButtons.slice(1).forEach(btn => btn.remove());
  }

  // Rebind header actions for a given panel (no placeholder rows)
  function rebindPanelEvents(panel) {
    // Wire the header buttons for this panel
    wireHeaderRename(panel);
    wireHeaderDelete(panel);
  } // <-- close the function

  // Ensure the first (template) panel has its local header actions wired
  rebindPanelEvents(template);

  // Wire the template panel's create button
  template.querySelectorAll('.task-add')
    .forEach(btn => btn.addEventListener('click', onAddTaskClick));


  // Outside "+" button: add a brand-new Tasks panel (clone) up to MAX_PANELS
  addBtn.addEventListener('click', async () => {
    const current = countPanels();
    if (current >= MAX_PANELS) {
      addBtn.disabled = true;
      addBtn.title = 'Maximum of 5 goals reached';
      return;
    }

    const nextIndex = current + 1;

    // Create panel on server first
    let serverPanel = null;
    try {
      serverPanel = await apiCreatePanel('Goal');
      console.log('[Panels] Created on server:', serverPanel);
    } catch (e) {
      console.warn('[Panels] Failed to create on server:', e);
      // Fallback: create with local id
      serverPanel = { id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, title: 'Goal' };
    }

    // Clone the whole panel box
    const clone = template.cloneNode(true);

    // Clear any inner tasks + normalize header + dedupe inner "Create a Task" buttons
    resetPanel(clone);

    // Give the clone the server's panelId
    clone.id = serverPanel.id;
    const cloneList = clone.querySelector('.tasks-list');
    if (cloneList) {
      cloneList.dataset.panelId = serverPanel.id;
      console.log(`[Tasks] Created new panel with ID: ${serverPanel.id}`);
    }

    // Wire header actions for this clone
    rebindPanelEvents(clone);

    // === NEW: wire the "+ Create a Task" button inside the new panel ===
    clone.querySelectorAll('.task-add')
      .forEach(btn => btn.addEventListener('click', onAddTaskClick));

    // Mount it
    stack.appendChild(clone);
    placeChipRow(); // <<< ADD: reposition "+" after adding a panel

    clone.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Save panel structure to localStorage
    savePanelsToStorage();

    // Cap at MAX_PANELS
    if (nextIndex >= MAX_PANELS) {
      addBtn.disabled = true;
      addBtn.title = 'Maximum of 5 goals reached';
    }
  });

  // end IIFE
})();
