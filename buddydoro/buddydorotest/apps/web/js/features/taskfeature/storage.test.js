import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteTaskPanel,
  deleteTaskSessions,
  loadPanelsFromStorage,
  readTaskPanelMap,
  readTaskSessionsMap,
  savePanelsToStorage,
  setTaskPanel,
  setTaskSessions,
} from '../../../../../../apps/web/js/features/taskfeature/storage.js';
import {
  PANELS_STORAGE_KEY,
  TASK_PANEL_MAP_KEY,
  TASK_SESSIONS_MAP_KEY,
} from '../../../../../../apps/web/js/features/taskfeature/constants.js';

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function createPanel({ title, panelId }) {
  return {
    querySelector(selector) {
      if (selector === '.tasks-title') return { textContent: title };
      if (selector === '.tasks-list') return { dataset: { panelId } };
      return null;
    },
  };
}

afterEach(() => {
  delete global.localStorage;
  delete global.document;
});

test('task panel helpers persist and remove panel mappings', () => {
  global.localStorage = createStorage();

  setTaskPanel('task-1', 'tasksPanel-2');
  assert.deepEqual(readTaskPanelMap(), { 'task-1': 'tasksPanel-2' });

  deleteTaskPanel('task-1');
  assert.deepEqual(readTaskPanelMap(), {});
});

test('task session helpers normalize values and remove entries', () => {
  global.localStorage = createStorage();

  setTaskSessions('task-1', { total: '3', done: '2' });
  assert.deepEqual(readTaskSessionsMap(), {
    'task-1': { total: 3, done: 2 },
  });

  deleteTaskSessions('task-1');
  assert.deepEqual(readTaskSessionsMap(), {});
});

test('read helpers return empty objects when storage is invalid JSON', () => {
  global.localStorage = createStorage();
  localStorage.setItem(TASK_PANEL_MAP_KEY, '{bad');
  localStorage.setItem(TASK_SESSIONS_MAP_KEY, '{bad');

  assert.deepEqual(readTaskPanelMap(), {});
  assert.deepEqual(readTaskSessionsMap(), {});
});

test('savePanelsToStorage serializes the current panel DOM structure', () => {
  global.localStorage = createStorage();
  global.document = {
    querySelectorAll(selector) {
      assert.equal(selector, '.tasks-panel');
      return [
        createPanel({ title: 'Goal A', panelId: 'tasksPanel-1' }),
        createPanel({ title: 'Goal B', panelId: 'tasksPanel-9' }),
      ];
    },
  };

  savePanelsToStorage();

  assert.deepEqual(JSON.parse(localStorage.getItem(PANELS_STORAGE_KEY)), [
    { panelId: 'tasksPanel-1', title: 'Goal A' },
    { panelId: 'tasksPanel-9', title: 'Goal B' },
  ]);
});

test('loadPanelsFromStorage returns parsed panels or null when missing', () => {
  global.localStorage = createStorage();

  assert.equal(loadPanelsFromStorage(), null);

  localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify([
    { panelId: 'tasksPanel-1', title: 'Goal A' },
  ]));

  assert.deepEqual(loadPanelsFromStorage(), [
    { panelId: 'tasksPanel-1', title: 'Goal A' },
  ]);
});
