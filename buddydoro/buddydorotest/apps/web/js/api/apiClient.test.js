import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_BASE,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '../../../../../apps/web/js/api/apiClient.js';

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
  };
}

afterEach(() => {
  delete global.localStorage;
  delete global.fetch;
  delete global.window;
});

test('apiGet sends the bearer token and returns parsed JSON', async () => {
  global.localStorage = createStorage();
  localStorage.setItem('authToken', 'abc123');

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true };
      },
    };
  };

  const result = await apiGet('/tasks');

  assert.deepEqual(result, { ok: true });
  assert.equal(request.url, `${API_BASE}/tasks`);
  assert.equal(request.options.headers.Authorization, 'Bearer abc123');
});

test('apiPost sends JSON payloads', async () => {
  global.localStorage = createStorage();
  localStorage.setItem('authToken', 'abc123');

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 201,
      async json() {
        return { id: 1 };
      },
    };
  };

  const result = await apiPost('/tasks', { text: 'Read' });

  assert.deepEqual(result, { id: 1 });
  assert.equal(request.url, `${API_BASE}/tasks`);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.body, JSON.stringify({ text: 'Read' }));
});

test('apiPut throws a server-provided error message', async () => {
  global.localStorage = createStorage();
  const originalError = console.error;
  console.error = () => {};
  global.fetch = async () => ({
    ok: false,
    status: 400,
    async json() {
      return { error: 'Bad update' };
    },
  });

  try {
    await assert.rejects(apiPut('/tasks/1', { done: true }), /Bad update/);
  } finally {
    console.error = originalError;
  }
});

test('apiPatch throws when fetch fails', async () => {
  global.localStorage = createStorage();
  const error = new Error('network down');
  const originalError = console.error;
  console.error = () => {};
  global.fetch = async () => {
    throw error;
  };

  try {
    await assert.rejects(apiPatch('/user/preferences', { skinOpen: 'Dragon.png' }), /network down/);
  } finally {
    console.error = originalError;
  }
});

test('apiDelete returns parsed JSON on success', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return { deleted: true };
      },
    };
  };

  const result = await apiDelete('/tasks/1');

  assert.deepEqual(result, { deleted: true });
  assert.equal(request.options.method, 'DELETE');
});

test('apiGet clears auth state and redirects on unauthorized responses', async () => {
  global.localStorage = createStorage();
  localStorage.setItem('authToken', 'expired');
  localStorage.setItem('hasSeenOnboarding', 'true');
  global.window = { location: { href: '' } };
  global.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return {};
    },
  });

  const result = await apiGet('/tasks');

  assert.equal(result, undefined);
  assert.equal(localStorage.getItem('authToken'), null);
  assert.equal(localStorage.getItem('hasSeenOnboarding'), null);
  assert.equal(window.location.href, 'login.html');
});
