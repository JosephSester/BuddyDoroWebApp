import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';
import {
  apiToFrontend,
  createTask,
  deleteTask,
  fetchTasks,
  frontendToApi,
  updateTask,
} from '../../../../../apps/web/js/api/taskService.js';

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

test('fetchTasks requests the tasks endpoint', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, async json() { return [{ id: 't1' }]; } };
  };

  const result = await fetchTasks();

  assert.deepEqual(result, [{ id: 't1' }]);
  assert.equal(request.url, `${API_BASE}/tasks`);
});

test('createTask posts the default panel id', async () => {
  global.localStorage = createStorage();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201, async json() { return { id: 't1' }; } };
  };

  await createTask('Study');

  assert.equal(request.url, `${API_BASE}/tasks`);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, JSON.stringify({
    text: 'Study',
    panelId: 'tasksPanel-1',
  }));
});

test('updateTask requires an id', async () => {
  await assert.rejects(updateTask(null, {}), /updateTask: id is required/);
});

test('deleteTask requires an id', async () => {
  await assert.rejects(deleteTask(undefined), /deleteTask: id is required/);
});

test('apiToFrontend maps API tasks into frontend shape', () => {
  assert.deepEqual(apiToFrontend({
    id: 't1',
    text: 'Write tests',
    completed: true,
  }), {
    id: 't1',
    name: 'Write tests',
    total: 1,
    done: 1,
    panelId: 'tasksPanel-1',
    apiId: 't1',
  });
});

test('frontendToApi maps frontend tasks into API shape', () => {
  assert.deepEqual(frontendToApi({
    name: 'Write tests',
    done: 2,
  }), {
    text: 'Write tests',
    completed: true,
  });
});
