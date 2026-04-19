import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../../../../../../apps/web/js/features/taskfeature/state.js';
import {
  setTasksBusy,
  showTaskNotification,
} from '../../../../../../apps/web/js/features/taskfeature/notifications.js';

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.id = '';
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.attributes = new Map();
    this.classList = {
      add: (...names) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => classes.add(name));
        this.className = Array.from(classes).join(' ');
      },
      toggle: (name, force) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        const shouldHave = force ?? !classes.has(name);
        if (shouldHave) classes.add(name);
        else classes.delete(name);
        this.className = Array.from(classes).join(' ');
      },
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id) this.ownerDocument.elementsById.set(child.id, child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    }
    if (this.id) this.ownerDocument.elementsById.delete(this.id);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  querySelector(selector) {
    if (!selector.startsWith('.')) return null;
    const className = selector.slice(1);
    return this.children.find((child) => child.className.split(/\s+/).includes(className)) ?? null;
  }
}

function createMockDocument() {
  const elementsById = new Map();
  const document = {
    elementsById,
    body: null,
    createElement(tagName) {
      return new MockElement(tagName, document);
    },
    getElementById(id) {
      return elementsById.get(id) ?? null;
    },
  };
  document.body = new MockElement('body', document);
  return document;
}

afterEach(() => {
  delete global.document;
  delete global.window;
  state.els.tasksList = null;
  state.els.addTaskBtn = null;
});

test('showTaskNotification delegates to the global notification UI', () => {
  global.document = createMockDocument();
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = () => 1;

  try {
    showTaskNotification('Saved task', 'success');

    const container = document.getElementById('notifications-container');
    assert.ok(container);
    assert.equal(container.children.length, 1);
    assert.equal(container.children[0].className, 'notification notification--success');
  } finally {
    global.setTimeout = originalSetTimeout;
  }
});

test('setTasksBusy updates task list busy state and disables the add button', () => {
  global.document = createMockDocument();
  state.els.tasksList = document.createElement('section');
  state.els.addTaskBtn = document.createElement('button');
  document.body.append(state.els.tasksList, state.els.addTaskBtn);

  setTasksBusy(true, 'Working...');

  const indicator = document.getElementById('busy-indicator');
  assert.ok(indicator);
  assert.equal(indicator.classList.contains('active'), true);
  assert.equal(state.els.tasksList.style.opacity, '0.55');
  assert.equal(state.els.addTaskBtn.disabled, true);
  assert.equal(state.els.addTaskBtn.getAttribute('aria-busy'), 'true');

  setTasksBusy(false);

  assert.equal(indicator.classList.contains('active'), false);
  assert.equal(state.els.tasksList.style.opacity, '');
  assert.equal(state.els.addTaskBtn.disabled, false);
  assert.equal(state.els.addTaskBtn.getAttribute('aria-busy'), 'false');
});
