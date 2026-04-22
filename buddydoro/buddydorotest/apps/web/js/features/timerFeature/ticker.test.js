import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicker } from '../../../../../../apps/web/js/features/timerFeature/ticker.js';

test('ticker accumulates elapsed milliseconds and emits ticks once full seconds pass', () => {
  const events = [];
  let uiUpdates = 0;
  const state = {
    isRunning: true,
    lastTs: 1000,
    remaining: 10,
    duration: 10,
    mode: 'focus',
    intervalId: null,
  };

  const ticker = createTicker({
    state,
    emit(type, payload) {
      events.push([type, payload]);
    },
    updateUI() {
      uiUpdates += 1;
    },
  });

  ticker.tick(1500);
  assert.equal(state.remaining, 10);
  assert.equal(events.length, 0);

  ticker.tick(2100);
  assert.equal(state.remaining, 9);
  assert.deepEqual(events[0], ['onTick', {
    remainingSeconds: 9,
    elapsedSeconds: 1,
    mode: 'focus',
    isRunning: true,
  }]);
  assert.equal(uiUpdates, 1);
});

test('ticker completes a session, clears intervals, and resets remaining to full duration', () => {
  const events = [];
  const cleared = [];
  const originalClearInterval = global.clearInterval;
  global.clearInterval = (id) => {
    cleared.push(id);
  };

  const state = {
    isRunning: true,
    lastTs: 1000,
    remaining: 1,
    duration: 1,
    mode: 'break',
    intervalId: 77,
  };

  try {
    const ticker = createTicker({
      state,
      emit(type, payload) {
        events.push([type, payload]);
      },
      updateUI() {},
    });

    ticker.tick(2100);

    assert.equal(state.isRunning, false);
    assert.equal(state.lastTs, null);
    assert.equal(state.intervalId, null);
    assert.equal(state.remaining, 1);
    assert.deepEqual(cleared, [77]);
    assert.deepEqual(events, [
      ['onTick', {
        remainingSeconds: 0,
        elapsedSeconds: 1,
        mode: 'break',
        isRunning: true,
      }],
      ['onComplete', { mode: 'break', duration: 1 }],
    ]);
  } finally {
    global.clearInterval = originalClearInterval;
  }
});

test('ticker ensureTick and stopTick manage the interval id once', () => {
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const created = [];
  const cleared = [];
  global.setInterval = (fn, ms) => {
    created.push(ms);
    return 123;
  };
  global.clearInterval = (id) => {
    cleared.push(id);
  };

  const state = {
    isRunning: false,
    lastTs: null,
    remaining: 10,
    duration: 10,
    mode: 'focus',
    intervalId: null,
  };

  try {
    const ticker = createTicker({
      state,
      emit() {},
      updateUI() {},
    });

    ticker.ensureTick();
    ticker.ensureTick();
    assert.deepEqual(created, [1000]);
    assert.equal(state.intervalId, 123);

    ticker.stopTick();
    assert.deepEqual(cleared, [123]);
    assert.equal(state.intervalId, null);
  } finally {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});
