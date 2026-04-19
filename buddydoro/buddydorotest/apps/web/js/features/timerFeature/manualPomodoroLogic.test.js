import test from 'node:test';
import assert from 'node:assert/strict';
import { initManualPomodoroLogic } from '../../../../../../apps/web/js/features/timerFeature/manualPomodoroLogic.js';

test('manual pomodoro logic exposes a no-op start and clears the timer label on stop', () => {
  const labels = [];
  const logic = initManualPomodoroLogic({
    timer: {
      setModeLabel(value) {
        labels.push(value);
      },
    },
  });

  assert.doesNotThrow(() => logic.startManualFocus());
  logic.stop();

  assert.deepEqual(labels, [null]);
});
