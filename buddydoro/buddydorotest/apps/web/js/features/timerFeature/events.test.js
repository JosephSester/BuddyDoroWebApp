import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../../../../../../apps/web/js/features/timerFeature/events.js';

test('createEventBus registers initial hooks, supports on(), and ignores handler errors', () => {
  const calls = [];
  const originalError = console.error;
  let logged = false;
  console.error = () => {
    logged = true;
  };

  try {
    const bus = createEventBus({
      onStart(payload) {
        calls.push(['start', payload.mode]);
      },
    });

    bus.on('onStart', (payload) => {
      calls.push(['extra', payload.mode]);
    });
    bus.on('onPause', () => {
      throw new Error('boom');
    });

    bus.emit('onStart', { mode: 'focus' });
    bus.emit('onPause', { mode: 'focus' });

    assert.deepEqual(calls, [
      ['start', 'focus'],
      ['extra', 'focus'],
    ]);
    assert.equal(logged, true);
    assert.equal(Array.isArray(bus.handlers.onSummary), true);
  } finally {
    console.error = originalError;
  }
});
