import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimerSettings } from '../../../../../../apps/web/js/features/timerFeature/settings.js';

test('timer settings apply defaults, update storage, and expose toggle helpers', () => {
  const writes = [];
  let uiUpdates = 0;
  let breakUiValue = null;
  const state = {
    mode: 'focus',
    focusDefault: 25,
    breakDefault: 5,
    duration: 25 * 60,
    remaining: 25 * 60,
    breakEnabled: true,
    showBreakSummary: false,
  };

  const settings = createTimerSettings({
    state,
    updateUI() {
      uiUpdates += 1;
    },
    writeStored(key, value) {
      writes.push([key, value]);
    },
    storageKeys: {
      focus: 'focusDefaultMinutes',
      break: 'breakDefaultMinutes',
    },
    setBreakEnabledUI(value) {
      breakUiValue = value;
    },
  });

  settings.applyDefaults({ focusMinutes: 30, breakMinutes: 8 });
  assert.equal(state.focusDefault, 30);
  assert.equal(state.breakDefault, 8);
  assert.equal(state.duration, 30 * 60);
  assert.equal(state.remaining, 30 * 60);
  assert.deepEqual(writes, [
    ['focusDefaultMinutes', 30],
    ['breakDefaultMinutes', 8],
  ]);

  settings.setBreakEnabled(false);
  settings.setBreakSummaryEnabled(true);

  assert.equal(state.breakEnabled, false);
  assert.equal(breakUiValue, false);
  assert.equal(state.showBreakSummary, true);
  assert.equal(settings.getFocusDefaultMinutes(), 30);
  assert.equal(settings.getBreakDefaultMinutes(), 8);
  assert.equal(uiUpdates, 1);
});

test('timer settings only replace matching duration for the active mode', () => {
  const state = {
    mode: 'break',
    focusDefault: 25,
    breakDefault: 5,
    duration: 5 * 60,
    remaining: 5 * 60,
  };

  const settings = createTimerSettings({
    state,
    updateUI() {},
    writeStored() {},
    storageKeys: { focus: 'f', break: 'b' },
    setBreakEnabledUI() {},
  });

  settings.applyDefaults({ focusMinutes: 40, breakMinutes: 10 });

  assert.equal(state.duration, 10 * 60);
  assert.equal(state.remaining, 10 * 60);
});
