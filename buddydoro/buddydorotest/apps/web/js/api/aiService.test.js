import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../../../../../apps/web/js/api/aiService.js';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';

test('generatePlan posts the goal to the AI plan endpoint', async () => {
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
        return { plan: ['Step 1'] };
      },
    };
  };

  try {
    const result = await generatePlan('Ship tests');

    assert.deepEqual(result, { plan: ['Step 1'] });
    assert.equal(request.url, `${API_BASE}/ai/plan`);
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.body, JSON.stringify({ goal: 'Ship tests' }));
  } finally {
    delete global.localStorage;
    delete global.fetch;
  }
});
