import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCatalog } from '../../../../../apps/web/js/api/storeService.js';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';

test('fetchCatalog requests the items endpoint', async () => {
  global.localStorage = {
    getItem() {
      return 'token-123';
    },
  };

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return { items: [] };
      },
    };
  };

  try {
    const result = await fetchCatalog();

    assert.deepEqual(result, { items: [] });
    assert.equal(request.url, `${API_BASE}/items`);
    assert.equal(request.options.headers.Authorization, 'Bearer token-123');
  } finally {
    delete global.localStorage;
    delete global.fetch;
  }
});
