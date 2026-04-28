import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBars,
  buildSubtaskTotals,
  filterByPeriod,
  fmtDuration,
  loadAllSessions,
  loadRecordsFromAPI,
  loadSessionRecords,
  loadSessionsFromAPI,
  saveSession,
  saveSessionRecord,
} from '../../../../../apps/web/js/features/historyStorage.js';

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
    clear() {
      store.clear();
    },
  };
}

function withMockedDate(isoString, fn) {
  const OriginalDate = Date;
  const fixed = new OriginalDate(isoString);
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) return new OriginalDate(fixed);
      return new OriginalDate(...args);
    }
    static now() {
      return fixed.getTime();
    }
    static parse(value) {
      return OriginalDate.parse(value);
    }
    static UTC(...args) {
      return OriginalDate.UTC(...args);
    }
  };

  try {
    return fn();
  } finally {
    global.Date = OriginalDate;
  }
}

afterEach(() => {
  delete global.localStorage;
  delete global.fetch;
});

test('saveSession persists a rounded local record and ignores empty durations', () => {
  global.localStorage = createStorage();
  global.fetch = async () => ({ ok: true });

  withMockedDate('2026-04-17T15:45:00.000Z', () => {
    saveSession({ subtaskName: 'Outline', taskName: 'Write', seconds: 125.7 });
    saveSession({ subtaskName: 'Skip', taskName: 'Ignored', seconds: 0 });
  });

  assert.deepEqual(loadAllSessions(), [
    {
      subtaskName: 'Outline',
      taskName: 'Write',
      seconds: 126,
      completedAt: '2026-04-17T15:45:00.000Z',
    },
  ]);
});

test('saveSessionRecord persists completed study sessions locally', () => {
  global.localStorage = createStorage();
  global.fetch = async () => ({ ok: true });

  saveSessionRecord({
    goalName: 'Math',
    pomodorosCompleted: 3,
    totalSeconds: 3700.4,
    goalComplete: true,
    completedAt: '2026-04-16T18:00:00.000Z',
  });

  assert.deepEqual(loadSessionRecords(), [
    {
      goalName: 'Math',
      pomodorosCompleted: 3,
      totalSeconds: 3700,
      goalComplete: true,
      completedAt: '2026-04-16T18:00:00.000Z',
    },
  ]);
});

test('loadSessionsFromAPI and loadRecordsFromAPI refresh localStorage from the server', async () => {
  global.localStorage = createStorage();
  let calls = 0;
  global.fetch = async (url) => {
    calls += 1;
    if (url.endsWith('/history/sessions')) {
      return {
        ok: true,
        async json() {
          return [{ subtaskName: 'A', seconds: 60, completedAt: '2026-04-17T12:00:00.000Z' }];
        },
      };
    }

    return {
      ok: true,
      async json() {
        return [{ goalName: 'Goal', totalSeconds: 600, completedAt: '2026-04-17T12:00:00.000Z' }];
      },
    };
  };

  const sessions = await loadSessionsFromAPI();
  const records = await loadRecordsFromAPI();

  assert.equal(calls, 2);
  assert.deepEqual(sessions, [{ subtaskName: 'A', seconds: 60, completedAt: '2026-04-17T12:00:00.000Z' }]);
  assert.deepEqual(records, [{ goalName: 'Goal', totalSeconds: 600, completedAt: '2026-04-17T12:00:00.000Z' }]);
});

test('filterByPeriod filters daily, weekly, monthly, yearly, and lifetime buckets', () => {
  const records = [
    { completedAt: '2026-04-17T10:00:00.000Z', seconds: 60 },
    { completedAt: '2026-04-15T10:00:00.000Z', seconds: 120 },
    { completedAt: '2026-03-20T10:00:00.000Z', seconds: 180 },
    { completedAt: '2025-12-31T10:00:00.000Z', seconds: 240 },
    { completedAt: 'not-a-date', seconds: 300 },
  ];

  withMockedDate('2026-04-17T15:45:00.000Z', () => {
    assert.equal(filterByPeriod(records, 'daily').length, 1);
    assert.equal(filterByPeriod(records, 'weekly').length, 2);
    assert.equal(filterByPeriod(records, 'monthly').length, 2);
    assert.equal(filterByPeriod(records, 'yearly').length, 3);
    assert.equal(filterByPeriod(records, 'lifetime').length, 4);
  });
});

test('buildBars groups records by period and buildSubtaskTotals sorts descending', () => {
  const localHourIso = (year, monthIndex, day, hour, minute = 0) =>
    new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString();

  const dailyRecords = [
    { completedAt: localHourIso(2026, 3, 17, 0, 10), seconds: 30 },
    { completedAt: localHourIso(2026, 3, 17, 13, 10), seconds: 90 },
  ];

  withMockedDate('2026-04-17T15:45:00.000Z', () => {
    const daily = buildBars(dailyRecords, 'daily');
    assert.equal(daily[0].label, '12a');
    assert.equal(daily[0].seconds, 30);
    assert.equal(daily[13].label, '1p');
    assert.equal(daily[13].seconds, 90);

    const weekly = buildBars([
      { completedAt: localHourIso(2026, 3, 13, 10, 0), seconds: 50 },
      { completedAt: localHourIso(2026, 3, 17, 10, 0), seconds: 70 },
    ], 'weekly');
    assert.deepEqual(
      weekly.filter((bar) => bar.seconds > 0).map((bar) => bar.seconds).sort((a, b) => a - b),
      [50, 70]
    );

    const monthly = buildBars([
      { completedAt: localHourIso(2026, 3, 1, 10, 0), seconds: 10 },
      { completedAt: localHourIso(2026, 3, 17, 10, 0), seconds: 20 },
    ], 'monthly');
    assert.equal(monthly[0].seconds, 10);
    assert.equal(monthly[16].seconds, 20);

    const yearly = buildBars([
      { completedAt: localHourIso(2026, 0, 1, 10, 0), seconds: 10 },
      { completedAt: localHourIso(2026, 3, 17, 10, 0), seconds: 20 },
    ], 'yearly');
    assert.equal(yearly[0].label, 'Jan');
    assert.equal(yearly[0].seconds, 10);
    assert.equal(yearly[3].label, 'Apr');
    assert.equal(yearly[3].seconds, 20);
  });

  const lifetime = buildBars([
    { completedAt: new Date(2024, 0, 1, 12, 0, 0, 0).toISOString(), seconds: 10 },
    { completedAt: new Date(2025, 0, 1, 12, 0, 0, 0).toISOString(), seconds: 20 },
    { completedAt: new Date(2025, 5, 1, 12, 0, 0, 0).toISOString(), seconds: 5 },
  ], 'lifetime');
  assert.deepEqual(lifetime, [
    { label: '2024', seconds: 10 },
    { label: '2025', seconds: 25 },
  ]);

  assert.deepEqual(buildSubtaskTotals([
    { subtaskName: 'Review', seconds: 40 },
    { subtaskName: 'Draft', seconds: 90 },
    { subtaskName: 'Review', seconds: 20 },
    { seconds: 15 },
  ]), [
    { name: 'Draft', seconds: 90 },
    { name: 'Review', seconds: 60 },
    { name: 'Unassigned', seconds: 15 },
  ]);
});

test('fmtDuration renders hours and minutes', () => {
  assert.equal(fmtDuration(3660), '1h 1m');
  assert.equal(fmtDuration(1800), '30m');
});
