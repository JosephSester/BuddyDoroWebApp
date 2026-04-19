import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';
import {
  deleteItem,
  fetchInventory,
  inventoryToMap,
  mapToInventory,
  purchaseItem,
  useItem,
} from '../../../../../apps/web/js/api/inventoryService.js';

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

test('fetchInventory requests the inventory endpoint', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { items: [] }; } };
  };

  await fetchInventory();

  assert.equal(request.url, `${API_BASE}/inventory`);
});

test('purchaseItem posts the sku payload', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  await purchaseItem('revival-potion');

  assert.equal(request.url, `${API_BASE}/inventory/purchase`);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, JSON.stringify({ sku: 'revival-potion' }));
});

test('useItem sends a put request payload', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  await useItem('water');

  assert.equal(request.url, `${API_BASE}/inventory/use`);
  assert.equal(request.options.method, 'PUT');
  assert.equal(request.options.body, JSON.stringify({ sku: 'water' }));
});

test('deleteItem issues a delete request to the sku endpoint', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  await deleteItem('apple');

  assert.equal(request.url, `${API_BASE}/inventory/apple`);
  assert.equal(request.options.method, 'DELETE');
});

test('inventoryToMap converts API items into a lookup map', () => {
  const map = inventoryToMap({
    items: [
      { sku: 'water', count: 2 },
      { sku: 'food', count: 5 },
    ],
  });

  assert.equal(map.get('water'), 2);
  assert.equal(map.get('food'), 5);
});

test('mapToInventory converts a map back into API shape', () => {
  const result = mapToInventory(new Map([
    ['water', 2],
    ['food', 5],
  ]));

  assert.deepEqual(result, {
    items: [
      { sku: 'water', count: 2 },
      { sku: 'food', count: 5 },
    ],
  });
});
