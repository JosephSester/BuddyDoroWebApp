import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATE_DEFAULT_ESTIMATE,
  CREATE_NAME_MAX,
  MAX_PANELS,
  PANELS_STORAGE_KEY,
  SESSION_MAX,
  TASK_NAME_ALLOWED_MESSAGE,
  TASK_NAME_PATTERN,
  TASK_PANEL_MAP_KEY,
  TASK_SESSIONS_MAP_KEY,
  TODO_ESCAPE_MAP,
} from '../../../../../../apps/web/js/features/taskfeature/constants.js';

test('taskfeature constants expose the expected limits and storage keys', () => {
  assert.equal(SESSION_MAX, 999);
  assert.equal(CREATE_NAME_MAX, 80);
  assert.equal(CREATE_DEFAULT_ESTIMATE, 50);
  assert.equal(MAX_PANELS, 5);
  assert.equal(PANELS_STORAGE_KEY, 'buddydoro_panels');
  assert.equal(TASK_PANEL_MAP_KEY, 'buddydoro_task_panel_map');
  assert.equal(TASK_SESSIONS_MAP_KEY, 'buddydoro_task_sessions_map');
  assert.deepEqual(TODO_ESCAPE_MAP, {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });
});

test('task name validation pattern accepts reasonable names and rejects invalid ones', () => {
  assert.equal(typeof TASK_NAME_ALLOWED_MESSAGE, 'string');
  assert.equal(TASK_NAME_PATTERN.test('Task 1'), true);
  assert.equal(TASK_NAME_PATTERN.test("Plan-day's work"), true);
  assert.equal(TASK_NAME_PATTERN.test(' bad start'), false);
  assert.equal(TASK_NAME_PATTERN.test(''), false);
  assert.equal(TASK_NAME_PATTERN.test('@@@'), false);
});
