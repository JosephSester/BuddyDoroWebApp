import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeDomId,
  state,
} from '../../../../../../apps/web/js/features/taskfeature/state.js';

test('makeDomId increments the shared counter with the requested prefix', () => {
  const original = state.domIdCounter;

  try {
    state.domIdCounter = 0;
    assert.equal(makeDomId('task'), 'task-1');
    assert.equal(makeDomId('task'), 'task-2');
    assert.equal(makeDomId(), 'id-3');
  } finally {
    state.domIdCounter = original;
  }
});

test('task feature state exposes safe default handlers and values', () => {
  assert.deepEqual(state.tasks, []);
  assert.equal(state.activeTaskId, null);
  assert.equal(typeof state.handlers.onActiveTaskChange, 'function');
  assert.equal(typeof state.handlers.onShouldStopTimer, 'function');
  assert.equal(typeof state.handlers.onTaskVisualsRefresh, 'function');
});
