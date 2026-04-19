import test from 'node:test';
import assert from 'node:assert/strict';

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

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    dataset: {},
    hidden: false,
    className: '',
    textContent: '',
    attributes: new Map(),
    listeners: new Map(),
    append(...nodes) {
      this.children.push(...nodes);
    },
    appendChild(node) {
      this.children.push(node);
      return node;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    click() {
      this.listeners.get('click')?.({
        stopPropagation() {},
      });
    },
  };
}

test('subtasks helpers store values, sync task payloads, and build lightweight UI wrappers', async () => {
  global.localStorage = createStorage();
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { ok: true };
    },
  });
  global.document = {
    createElement,
  };

  const subtasks = await import(`../../../../../apps/web/js/features/subtasks.js?case=${Date.now()}`);

  try {
    assert.deepEqual(subtasks.getSubtasks('task-1'), []);

    subtasks.setSubtasks('task-1', [
      { id: 'sub-1', title: 'Draft', estimate: 25, done: false },
    ]);
    assert.deepEqual(subtasks.getSubtasks('task-1'), [
      { id: 'sub-1', title: 'Draft', estimate: 25, done: false },
    ]);

    subtasks.syncSubtasksFromTasks([
      { id: 'task-2', subtasks: [{ id: 'sub-2', title: 'Review', done: true }] },
      { id: 'task-3', subtasks: [] },
    ]);
    assert.deepEqual(subtasks.getSubtasks('task-2'), [
      { id: 'sub-2', title: 'Review', done: true },
    ]);

    subtasks.deleteTaskSubtasks('task-1');
    assert.deepEqual(subtasks.getSubtasks('task-1'), []);

    const { wrap, list } = subtasks.createSubtasksSection({ id: 'task-2' });
    assert.equal(wrap.className, 'subtasks-container');
    assert.equal(wrap.hidden, true);
    assert.equal(list.className, 'subtasks-list');
    assert.equal(list.children.length, 1);

    const toggle = subtasks.createSubtasksToggle({ id: 'task-2' }, wrap, {
      onAddSubtask() {},
    });
    assert.equal(toggle.className, 'subtask-toggle');
    assert.equal(toggle.textContent, '+');

    toggle.click();
    assert.equal(wrap.hidden, false);
    assert.equal(toggle.attributes.get('aria-expanded'), 'true');

    const generated = subtasks.makeSubtaskId();
    assert.match(generated, /^\d+-\d+$/);
  } finally {
    delete global.localStorage;
    delete global.fetch;
    delete global.document;
  }
});
