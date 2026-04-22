import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimerControls } from '../../../../../../apps/web/js/features/timerFeature/controls.js';

test('timer controls start, pause, reset, stop, and emit the expected events', () => {
  const emitted = [];
  let uiUpdates = 0;
  let shown = 0;
  let ticking = 0;
  let stopped = 0;
  const originalPerformance = global.performance;
  global.performance = { now: () => 12345 };

  const state = {
    isRunning: false,
    mode: 'focus',
    duration: 1500,
    remaining: 1500,
    lastTs: null,
    plannedFocusSeconds: 1800,
    focusDefault: 25,
    breakDefault: 5,
    longBreakDefault: 15,
    labelOverride: null,
  };

  try {
    const controls = createTimerControls({
      state,
      emit(type, payload) {
        emitted.push([type, payload]);
      },
      updateUI() {
        uiUpdates += 1;
      },
      showTimer() {
        shown += 1;
      },
      ensureTick() {
        ticking += 1;
      },
      stopTick() {
        stopped += 1;
      },
      limits: { min: 1, max: 180 },
    });

    controls.start();
    assert.equal(state.isRunning, true);
    assert.equal(state.lastTs, 12345);
    assert.equal(state.sessionOriginalSeconds, 1500);
    assert.equal(state.sessionMode, 'focus');

    controls.pause();
    assert.equal(state.isRunning, false);
    assert.equal(state.lastTs, null);

    controls.reset();
    assert.equal(state.remaining, 1500);

    controls.stop();
    assert.equal(state.mode, 'focus');
    assert.equal(state.duration, 1800);
    assert.equal(state.remaining, 1800);
    assert.equal(state.labelOverride, null);

    assert.equal(shown, 1);
    assert.equal(ticking, 1);
    assert.equal(stopped, 1);
    assert.equal(uiUpdates >= 4, true);
    assert.deepEqual(emitted.map(([type]) => type), ['onStart', 'onPause', 'onReset', 'onStop']);
  } finally {
    global.performance = originalPerformance;
  }
});

test('timer controls mode and duration setters clamp and reset state correctly', () => {
  const state = {
    isRunning: false,
    mode: null,
    duration: 1500,
    remaining: 1500,
    lastTs: null,
    plannedFocusSeconds: null,
    focusDefault: 25,
    breakDefault: 5,
    longBreakDefault: 20,
    labelOverride: 'On a Break',
  };

  const controls = createTimerControls({
    state,
    emit() {},
    updateUI() {},
    showTimer() {},
    ensureTick() {},
    stopTick() {},
    limits: { min: 1, max: 180 },
  });

  controls.setMode('break');
  assert.equal(state.duration, 300);
  assert.equal(state.remaining, 300);
  assert.equal(state.labelOverride, 'On a Break');

  controls.setMode('longBreak');
  assert.equal(state.duration, 1200);
  assert.equal(state.labelOverride, null);

  controls.setDuration(999999);
  assert.equal(state.duration, 180 * 60);
  assert.equal(state.remaining, 180 * 60);

  controls.setPlannedFocusDuration(30, { applyIfIdle: true });
  assert.equal(state.plannedFocusSeconds, 60);

  controls.setMode('focus');
  assert.equal(state.duration, 60);
  assert.equal(state.remaining, 60);

  controls.setRemaining(9999);
  assert.equal(state.remaining, 60);

  controls.resetTimerToDefault();
  assert.equal(state.duration, 25 * 60);
  assert.equal(state.remaining, 25 * 60);

  controls.setPlannedFocusDuration(null, { applyIfIdle: true });
  assert.equal(state.plannedFocusSeconds, null);
});
