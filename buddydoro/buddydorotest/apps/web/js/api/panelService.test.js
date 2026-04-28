import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';
import {
  createPanel,
  deletePanel,
  fetchPanels,
  reorderPanels,
  updatePanel,
} from '../../../../../apps/web/js/api/panelService.js';

function createStorage() {
  const store = new Map([['authToken', 'token-123']]);
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
});

test('fetchPanels requests the panels endpoint', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return []; } };
  };

  await fetchPanels();

  assert.equal(request.url, `${API_BASE}/panels`);
});

test('createPanel posts a title payload', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201, async json() { return { id: 'panel-1' }; } };
  };

  await createPanel('Today');

  assert.equal(request.url, `${API_BASE}/panels`);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, JSON.stringify({ title: 'Today' }));
});

test('updatePanel sends a put request with updates', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  await updatePanel('panel-1', { title: 'Renamed' });

  assert.equal(request.url, `${API_BASE}/panels/panel-1`);
  assert.equal(request.options.method, 'PUT');
  assert.equal(request.options.body, JSON.stringify({ title: 'Renamed' }));
});

test('deletePanel adds the moveTo query string when provided', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  await deletePanel('panel-1', { moveTo: 'panel 2' });

  assert.equal(request.url, `${API_BASE}/panels/panel-1?moveTo=panel%202`);
  assert.equal(request.options.method, 'DELETE');
});

test('reorderPanels posts the array payload as-is', async () => {
  global.localStorage = createStorage();
  const items = [{ id: 'panel-1', order: 2 }];
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  await reorderPanels(items);

  assert.equal(request.url, `${API_BASE}/panels/reorder`);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, JSON.stringify(items));
});
