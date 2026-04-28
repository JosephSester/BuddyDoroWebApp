import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { initTimerSummaries } from '../../../../../../apps/web/js/features/timerFeature/summary.js';

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
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
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

  focus() {}
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

test('timer summaries compute minutes and doros from elapsed seconds', () => {
  global.document = createDocument([
    'timerSummaryBackdrop',
    'timerSummaryDialog',
    'timerSummaryMinutes',
    'timerSummaryDoros',
    'timerSummaryRestart',
    'timerSummaryBreak',
    'timerSummaryHome',
    'timerBreakPrompt',
    'breakSummaryBackdrop',
    'breakSummaryDialog',
    'breakSummaryMinutes',
    'breakSummaryResume',
    'breakSummaryLater',
    'timerChip',
  ]);

  const summariesSeen = [];
  const { summary, breakSummary, showSummary } = initTimerSummaries({
    onSummary(payload) {
      summariesSeen.push(payload);
    },
  });

  showSummary(11 * 60);

  assert.equal(document.getElementById('timerSummaryMinutes').textContent, '11');
  assert.equal(document.getElementById('timerSummaryDoros').textContent, '100');
  assert.equal(document.getElementById('timerSummaryDialog').hidden, false);
  assert.deepEqual(summariesSeen, [{ minutes: 11, doros: 100 }]);

  breakSummary.open({ minutes: 7 });
  assert.equal(document.getElementById('breakSummaryMinutes').textContent, '7');
  assert.equal(document.getElementById('breakSummaryDialog').hidden, false);

  summary.close();
  breakSummary.close();
  assert.equal(document.getElementById('timerSummaryDialog').hidden, true);
  assert.equal(document.getElementById('breakSummaryDialog').hidden, true);
});
