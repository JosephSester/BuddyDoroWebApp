import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';
import {
  applyPreferencesToStorage,
  BG_STORAGE_KEY,
  DEFAULT_PREFERENCES,
  getStoredPreferences,
  hydratePreferencesFromUser,
  saveUserPreferences,
  SKIN_CLOSED_KEY,
  SKIN_OPEN_KEY,
} from '../../../../../apps/web/js/utils/preferences.js';

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

afterEach(() => {
  delete global.localStorage;
  delete global.fetch;
});

test('getStoredPreferences falls back to defaults when storage is empty', () => {
  global.localStorage = createStorage();

  assert.deepEqual(getStoredPreferences(), DEFAULT_PREFERENCES);
});

test('applyPreferencesToStorage normalizes blanks and preserves existing values when requested', () => {
  global.localStorage = createStorage();
  localStorage.setItem(SKIN_OPEN_KEY, 'Robot.png');
  localStorage.setItem(SKIN_CLOSED_KEY, 'Robot_spritesheet.png');
  localStorage.setItem(BG_STORAGE_KEY, 'Backgrounds/MoonBackground.png');

  const next = applyPreferencesToStorage({
    skinOpen: '  ',
    preferences: {
      background: 'Backgrounds/JungleBackgroundDay.png',
    },
  }, { preserveExisting: true });

  assert.deepEqual(next, {
    skinOpen: 'Robot.png',
    skinClosed: 'Robot_spritesheet.png',
    background: 'Backgrounds/JungleBackgroundDay.png',
  });
});

test('hydratePreferencesFromUser reports when server values should be backfilled', () => {
  global.localStorage = createStorage();
  localStorage.setItem(SKIN_OPEN_KEY, 'Alien.png');

  const result = hydratePreferencesFromUser({
    skinClosed: 'AlienClosed.png',
  });

  assert.equal(result.shouldBackfill, true);
  assert.deepEqual(result.preferences, {
    skinOpen: 'Alien.png',
    skinClosed: 'AlienClosed.png',
    background: DEFAULT_PREFERENCES.background,
  });
});

test('saveUserPreferences sends normalized data and persists returned preferences', async () => {
  global.localStorage = createStorage();
  localStorage.setItem('authToken', 'token-123');

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return {
          preferences: {
            skinOpen: 'Frog.png',
            skinClosed: 'FrogSleep.png',
            background: 'Backgrounds/BeachBackgroundDay.png',
          },
        };
      },
    };
  };

  const result = await saveUserPreferences({
    skinOpen: '  Frog.png ',
    skinClosed: '',
    background: 'Backgrounds/BeachBackgroundDay.png',
  });

  assert.equal(request.url, `${API_BASE}/user/preferences`);
  assert.equal(request.options.method, 'PATCH');
  assert.equal(request.options.headers.Authorization, 'Bearer token-123');
  assert.equal(request.options.body, JSON.stringify({
    skinOpen: 'Frog.png',
    skinClosed: null,
    background: 'Backgrounds/BeachBackgroundDay.png',
  }));
  assert.deepEqual(result, {
    preferences: {
      skinOpen: 'Frog.png',
      skinClosed: 'FrogSleep.png',
      background: 'Backgrounds/BeachBackgroundDay.png',
    },
  });
  assert.deepEqual(getStoredPreferences(), {
    skinOpen: 'Frog.png',
    skinClosed: 'FrogSleep.png',
    background: 'Backgrounds/BeachBackgroundDay.png',
  });
});

test('saveUserPreferences returns null when no auth token exists', async () => {
  global.localStorage = createStorage();
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error('should not run');
  };

  const result = await saveUserPreferences({ skinOpen: 'Dragon.png' });

  assert.equal(result, null);
  assert.equal(called, false);
});

test('saveUserPreferences throws the server error message on failure', async () => {
  global.localStorage = createStorage();
  localStorage.setItem('token', 'fallback-token');
  global.fetch = async () => ({
    ok: false,
    status: 400,
    async json() {
      return { error: 'Preference update failed' };
    },
  });

  await assert.rejects(
    saveUserPreferences({ skinOpen: 'Dragon.png' }),
    /Preference update failed/
  );
});
