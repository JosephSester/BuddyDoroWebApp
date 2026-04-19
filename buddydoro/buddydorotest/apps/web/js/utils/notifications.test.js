import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

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
    this._removed = false;
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
    this._removed = true;
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    }
    if (this.id) this.ownerDocument.elementsById.delete(this.id);
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
});

test('showNotification creates a container and appends a notification', async () => {
  global.document = createMockDocument();
  const timers = [];
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (fn, delay) => {
    timers.push({ fn, delay });
    return timers.length;
  };

  try {
    const { showNotification } = await import(`../../../../../apps/web/js/utils/notifications.js?case=show-${Date.now()}`);
    showNotification('Saved!', 'success', 1500);

    const container = document.getElementById('notifications-container');
    assert.ok(container);
    assert.equal(container.children.length, 1);
    assert.equal(container.children[0].className, 'notification notification--success');
    assert.equal(timers.length, 1);
    assert.equal(timers[0].delay, 1500);
  } finally {
    global.setTimeout = originalSetTimeout;
  }
});

test('setBusy builds an indicator once and toggles target element state', async () => {
  global.document = createMockDocument();
  const target = document.createElement('section');
  document.body.appendChild(target);
  const { setBusy } = await import(`../../../../../apps/web/js/utils/notifications.js?case=busy-${Date.now()}`);

  setBusy(true, 'Working...', target);

  const indicator = document.getElementById('busy-indicator');
  assert.ok(indicator);
  assert.ok(indicator.classList.contains('active'));
  assert.equal(indicator.querySelector('.busy-text')?.textContent, 'Working...');
  assert.equal(target.style.opacity, '0.55');
  assert.equal(target.style.pointerEvents, 'none');

  setBusy(false, 'Done', target);

  assert.equal(indicator.classList.contains('active'), false);
  assert.equal(target.style.opacity, '');
  assert.equal(target.style.pointerEvents, '');
});
