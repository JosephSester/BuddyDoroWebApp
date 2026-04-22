import test from 'node:test';
import assert from 'node:assert/strict';
import { initTaskPomodoroLogic } from '../../../../../../apps/web/js/features/timerFeature/taskPomodoroLogic.js';

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
    };
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id) this.ownerDocument.elementsById.set(child.id, child);
    return child;
  }

  querySelector() {
    return null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    }
    if (this.id) this.ownerDocument.elementsById.delete(this.id);
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

function createTimer() {
  const calls = [];
  const handlers = {
    start: [],
    complete: [],
  };

  return {
    calls,
    setPlannedFocusDuration(value) {
      calls.push(['setPlannedFocusDuration', value]);
    },
    setModeLabel(value) {
      calls.push(['setModeLabel', value]);
    },
    setMode(value) {
      calls.push(['setMode', value]);
    },
    setDuration(value) {
      calls.push(['setDuration', value]);
    },
    setRemaining(value) {
      calls.push(['setRemaining', value]);
    },
    start() {
      calls.push(['start']);
    },
    onStart(fn) {
      handlers.start.push(fn);
    },
    onComplete(fn) {
      handlers.complete.push(fn);
    },
    emitStart(payload) {
      handlers.start.forEach((fn) => fn(payload));
    },
    emitComplete(payload) {
      handlers.complete.forEach((fn) => fn(payload));
    },
  };
}

test('task pomodoro logic starts focus for a new active task and resets on stop', async () => {
  const timer = createTimer();
  const starts = [];
  const stops = [];
  const logic = initTaskPomodoroLogic({
    timer,
    onFocusStart(payload) {
      starts.push(payload);
    },
    onFocusStop(payload) {
      stops.push(payload);
    },
  });

  await logic.handleActiveTaskChange({
    id: 'task-1',
    name: 'Deep Work',
    total: 2,
    done: 0,
    panelId: 'tasksPanel-1',
  });

  assert.deepEqual(starts, [{
    taskId: 'task-1',
    task: { id: 'task-1', name: 'Deep Work', total: 2, done: 0, panelId: 'tasksPanel-1' },
  }]);
  assert.deepEqual(timer.calls.slice(0, 8), [
    ['setPlannedFocusDuration', null],
    ['setModeLabel', null],
    ['setPlannedFocusDuration', 1500],
    ['setModeLabel', 'Focusing on Deep Work'],
    ['setMode', 'focus'],
    ['setDuration', 1500],
    ['setRemaining', 1500],
    ['start'],
  ]);

  logic.stop();
  assert.deepEqual(stops, [{
    taskId: 'task-1',
    task: { id: 'task-1', name: 'Deep Work', total: 2, done: 0, panelId: 'tasksPanel-1' },
  }]);
  assert.deepEqual(timer.calls.slice(-2), [
    ['setPlannedFocusDuration', null],
    ['setModeLabel', null],
  ]);
});

test('task pomodoro logic reapplies the label on start and resets after focus completion', async () => {
  global.document = createMockDocument();
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = () => 1;
  const timer = createTimer();
  const stops = [];
  try {
    const logic = initTaskPomodoroLogic({
      timer,
      onFocusStop(payload) {
        stops.push(payload);
      },
    });

    await logic.handleActiveTaskChange({ id: 'task-2', name: 'Read', total: 1, done: 0, panelId: 'p1' });
    timer.emitStart({ mode: 'focus' });
    assert.deepEqual(timer.calls.at(-1), ['setModeLabel', 'Focusing on Read']);

    timer.emitComplete({ mode: 'focus' });
    assert.equal(stops.length, 1);
    assert.deepEqual(timer.calls.slice(-2), [
      ['setPlannedFocusDuration', null],
      ['setModeLabel', null],
    ]);

    const container = document.getElementById('notifications-container');
    assert.ok(container);
    assert.equal(container.children.length, 1);

    await logic.handleActiveTaskChange(null);
    assert.equal(stops.length, 1);
  } finally {
    delete global.document;
    global.setTimeout = originalSetTimeout;
  }
});
