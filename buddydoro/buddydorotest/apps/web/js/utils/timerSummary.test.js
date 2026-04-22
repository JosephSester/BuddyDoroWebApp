import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initBreakSummary,
  initTimerSummary,
} from '../../../../../apps/web/js/utils/timerSummary.js';

class MockElement {
  constructor(id = '') {
    this.id = id;
    this.hidden = false;
    this.textContent = '';
    this.listeners = new Map();
    this.attributes = new Map();
    this._children = new Set();
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach((name) => this.classList.values.add(name)),
      remove: (...names) => names.forEach((name) => this.classList.values.delete(name)),
      contains: (name) => this.classList.values.has(name),
    };
    this.focused = false;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  click() {
    this.listeners.get('click')?.();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  contains(node) {
    return this._children.has(node);
  }

  registerContained(node) {
    this._children.add(node);
  }

  focus() {
    this.focused = true;
  }
}

function createDocument(ids) {
  const elements = new Map(ids.map((id) => [id, new MockElement(id)]));
  return {
    body: new MockElement('body'),
    activeElement: null,
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };
}

afterEach(() => {
  delete global.document;
});

test('timer summary opens, renders values, and closes back to hidden state', () => {
  global.document = createDocument([
    'timerSummaryBackdrop',
    'timerSummaryDialog',
    'timerSummaryMinutes',
    'timerSummaryDoros',
    'timerSummaryRestart',
    'timerSummaryBreak',
    'timerSummaryHome',
    'timerBreakPrompt',
    'timerChip',
  ]);

  const summary = initTimerSummary();

  summary.open({ minutes: 25, doros: 8 });

  assert.equal(document.getElementById('timerSummaryMinutes').textContent, '25');
  assert.equal(document.getElementById('timerSummaryDoros').textContent, '8');
  assert.equal(document.getElementById('timerSummaryDialog').hidden, false);
  assert.equal(document.getElementById('timerSummaryDialog').getAttribute('aria-hidden'), 'false');
  assert.equal(document.getElementById('timerSummaryBackdrop').hidden, false);

  summary.close();

  assert.equal(document.getElementById('timerSummaryDialog').hidden, true);
  assert.equal(document.getElementById('timerSummaryDialog').getAttribute('aria-hidden'), 'true');
  assert.equal(document.getElementById('timerSummaryBackdrop').hidden, true);
  assert.equal(document.getElementById('timerBreakPrompt').hidden, true);
});

test('timer summary break button uses the default break minutes callback when available', () => {
  global.document = createDocument([
    'timerSummaryBackdrop',
    'timerSummaryDialog',
    'timerSummaryMinutes',
    'timerSummaryDoros',
    'timerSummaryRestart',
    'timerSummaryBreak',
    'timerSummaryHome',
    'timerBreakPrompt',
    'timerChip',
  ]);

  const breaks = [];
  initTimerSummary({
    getDefaultBreakMinutes: () => 10,
    onBreak(minutes) {
      breaks.push(minutes);
    },
  });

  document.getElementById('timerSummaryBreak').click();

  assert.deepEqual(breaks, [10]);
  assert.equal(document.getElementById('timerSummaryDialog').hidden, true);
});

test('break summary resume and later buttons close the dialog and invoke callbacks', () => {
  global.document = createDocument([
    'breakSummaryBackdrop',
    'breakSummaryDialog',
    'breakSummaryMinutes',
    'breakSummaryResume',
    'breakSummaryLater',
    'timerChip',
  ]);

  let resumed = 0;
  let deferred = 0;
  const summary = initBreakSummary({
    onResume() {
      resumed += 1;
    },
    onLater() {
      deferred += 1;
    },
  });

  summary.open({ minutes: 5 });
  assert.equal(document.getElementById('breakSummaryMinutes').textContent, '5');
  assert.equal(document.getElementById('breakSummaryDialog').hidden, false);

  document.getElementById('breakSummaryResume').click();
  assert.equal(resumed, 1);
  assert.equal(document.getElementById('breakSummaryDialog').hidden, true);

  summary.open({ minutes: 7 });
  document.getElementById('breakSummaryLater').click();
  assert.equal(deferred, 1);
  assert.equal(document.getElementById('breakSummaryBackdrop').hidden, true);
});
