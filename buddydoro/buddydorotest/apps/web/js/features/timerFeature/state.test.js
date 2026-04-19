import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimerState } from '../../../../../../apps/web/js/features/timerFeature/state.js';

test('createTimerState initializes focus mode from provided defaults', () => {
  const state = createTimerState({
    focusDefault: 25,
    breakDefault: 5,
    longBreakDefault: 15,
  });

  assert.deepEqual(state, {
    mode: 'focus',
    isRunning: false,
    duration: 1500,
    remaining: 1500,
    lastTs: null,
    intervalId: null,
    plannedFocusSeconds: null,
    labelOverride: null,
    focusDefault: 25,
    breakDefault: 5,
    longBreakDefault: 15,
  });
});
