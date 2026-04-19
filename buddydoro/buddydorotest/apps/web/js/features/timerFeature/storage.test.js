import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearTimerSession,
  loadTimerSession,
  readStored,
  saveTimerSession,
  writeStored,
} from '../../../../../../apps/web/js/features/timerFeature/storage.js';

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
    clear() {
      store.clear();
    },
  };
}

function installStorage() {
  global.localStorage = createStorage();
}

afterEach(() => {
  delete global.localStorage;
});

test('saveTimerSession and loadTimerSession round-trip a valid session', () => {
  installStorage();
  const originalNow = Date.now;
  Date.now = () => 1000;

  try {
    saveTimerSession({
      mode: 'focus',
      remaining: 900,
      duration: 1500,
      labelOverride: 'Deep work',
    });

    assert.deepEqual(loadTimerSession(), {
      mode: 'focus',
      remaining: 900,
      duration: 1500,
      labelOverride: 'Deep work',
      savedAt: 1000,
    });
  } finally {
    Date.now = originalNow;
  }
});

test('loadTimerSession rejects sessions with too little time remaining', () => {
  installStorage();
  localStorage.setItem('buddydoro_timer_session', JSON.stringify({
    mode: 'focus',
    remaining: 59,
    duration: 1500,
    savedAt: Date.now(),
  }));

  assert.equal(loadTimerSession(), null);
});

test('loadTimerSession clears stale sessions older than a day', () => {
  installStorage();
  const originalNow = Date.now;
  Date.now = () => 24 * 60 * 60 * 1000 + 5;
  localStorage.setItem('buddydoro_timer_session', JSON.stringify({
    mode: 'focus',
    remaining: 900,
    duration: 1500,
    savedAt: 1,
  }));

  try {
    assert.equal(loadTimerSession(), null);
    assert.equal(localStorage.getItem('buddydoro_timer_session'), null);
  } finally {
    Date.now = originalNow;
  }
});

test('clearTimerSession removes the saved timer session', () => {
  installStorage();
  localStorage.setItem('buddydoro_timer_session', 'value');

  clearTimerSession();

  assert.equal(localStorage.getItem('buddydoro_timer_session'), null);
});

test('readStored returns fallback when the stored value is invalid', () => {
  installStorage();
  localStorage.setItem('focusDefaultMinutes', '999');

  assert.equal(readStored('focusDefaultMinutes', 25, { min: 1, max: 180 }), 25);
});

test('readStored returns parsed values inside the allowed limits', () => {
  installStorage();
  localStorage.setItem('focusDefaultMinutes', '45');

  assert.equal(readStored('focusDefaultMinutes', 25, { min: 1, max: 180 }), 45);
});

test('writeStored persists values as strings', () => {
  installStorage();

  writeStored('focusDefaultMinutes', 30);

  assert.equal(localStorage.getItem('focusDefaultMinutes'), '30');
});

test('writeStored swallows quota errors without throwing', () => {
  installStorage();
  let warned = false;
  const originalWarn = console.warn;
  console.warn = () => {
    warned = true;
  };
  localStorage.setItem = () => {
    const error = new Error('quota');
    error.name = 'QuotaExceededError';
    throw error;
  };

  try {
    assert.doesNotThrow(() => writeStored('focusDefaultMinutes', 30));
    assert.equal(warned, true);
  } finally {
    console.warn = originalWarn;
  }
});
