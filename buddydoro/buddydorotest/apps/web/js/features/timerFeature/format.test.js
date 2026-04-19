import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSeconds } from '../../../../../../apps/web/js/features/timerFeature/format.js';

test('formatSeconds clamps negatives to zero', () => {
  assert.equal(formatSeconds(-5), '00:00');
});

test('formatSeconds renders mm:ss for durations under an hour', () => {
  assert.equal(formatSeconds(65.9), '01:05');
});

test('formatSeconds renders h:mm:ss for durations of an hour or more', () => {
  assert.equal(formatSeconds(3661), '1:01:01');
});
