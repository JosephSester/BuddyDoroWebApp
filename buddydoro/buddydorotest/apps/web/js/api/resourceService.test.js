import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE } from '../../../../../apps/web/js/api/apiClient.js';
import {
  createNote,
  deleteNote,
  deleteResource,
  fetchNotes,
  fetchSavedResources,
  getWebSearchUrls,
  saveResource,
  searchBooks,
  searchVideos,
  updateNote,
  updateResourceNote,
} from '../../../../../apps/web/js/api/resourceService.js';

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

function installFetchRecorder(response = {}) {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return response;
      },
    };
  };
  return () => request;
}

test('searchVideos URL-encodes the query', async () => {
  global.localStorage = createStorage();
  const getRequest = installFetchRecorder([]);

  await searchVideos('deep work', 4);

  assert.equal(getRequest().url, `${API_BASE}/resources/search/videos?q=deep%20work&maxResults=4`);
});

test('searchBooks uses the provided limit', async () => {
  global.localStorage = createStorage();
  const getRequest = installFetchRecorder([]);

  await searchBooks('focus', 3);

  assert.equal(getRequest().url, `${API_BASE}/resources/search/books?q=focus&limit=3`);
});

test('getWebSearchUrls URL-encodes the query', async () => {
  global.localStorage = createStorage();
  const getRequest = installFetchRecorder([]);

  await getWebSearchUrls('calm music');

  assert.equal(getRequest().url, `${API_BASE}/resources/search/web?q=calm%20music`);
});

test('saved resource operations use the expected endpoints', async () => {
  global.localStorage = createStorage();

  let getRequest = installFetchRecorder([]);
  await fetchSavedResources();
  assert.equal(getRequest().url, `${API_BASE}/resources`);

  getRequest = installFetchRecorder({ ok: true });
  await saveResource({ title: 'Book' });
  assert.equal(getRequest().url, `${API_BASE}/resources`);
  assert.equal(getRequest().options.method, 'POST');
  assert.equal(getRequest().options.body, JSON.stringify({ title: 'Book' }));

  getRequest = installFetchRecorder({ ok: true });
  await updateResourceNote('1', 'Nice');
  assert.equal(getRequest().url, `${API_BASE}/resources/1`);
  assert.equal(getRequest().options.method, 'PUT');
  assert.equal(getRequest().options.body, JSON.stringify({ note: 'Nice' }));

  getRequest = installFetchRecorder({ ok: true });
  await deleteResource('1');
  assert.equal(getRequest().url, `${API_BASE}/resources/1`);
  assert.equal(getRequest().options.method, 'DELETE');
});

test('note operations use the expected endpoints', async () => {
  global.localStorage = createStorage();

  let getRequest = installFetchRecorder([]);
  await fetchNotes();
  assert.equal(getRequest().url, `${API_BASE}/resources/notes`);

  getRequest = installFetchRecorder({ ok: true });
  await createNote({ title: 'Plan' });
  assert.equal(getRequest().url, `${API_BASE}/resources/notes`);
  assert.equal(getRequest().options.method, 'POST');
  assert.equal(getRequest().options.body, JSON.stringify({ title: 'Plan' }));

  getRequest = installFetchRecorder({ ok: true });
  await updateNote('2', { body: 'Text' });
  assert.equal(getRequest().url, `${API_BASE}/resources/notes/2`);
  assert.equal(getRequest().options.method, 'PUT');
  assert.equal(getRequest().options.body, JSON.stringify({ body: 'Text' }));

  getRequest = installFetchRecorder({ ok: true });
  await deleteNote('2');
  assert.equal(getRequest().url, `${API_BASE}/resources/notes/2`);
  assert.equal(getRequest().options.method, 'DELETE');
});
