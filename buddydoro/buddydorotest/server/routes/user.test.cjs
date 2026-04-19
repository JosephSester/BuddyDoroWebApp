const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../../../server/routes/user');
const User = require('../../../server/models/User');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandler(method, path) {
  const layer = router.stack.find((entry) => entry.route && entry.route.path === path);
  assert.ok(layer, `Expected route ${method.toUpperCase()} ${path}`);
  assert.equal(layer.route.methods[method], true);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('PATCH /preferences rejects empty requests', async () => {
  const handler = getRouteHandler('patch', '/preferences');
  const req = { body: {}, user: { userId: 'u1' } };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Nothing to update' });
});

test('PATCH /preferences normalizes values and saves them', async () => {
  const handler = getRouteHandler('patch', '/preferences');
  const originalFindById = User.findById;
  let saved = false;
  const user = {
    preferences: { skinOpen: 'Dragon.png', skinClosed: 'DragonEyesClosed.png', background: null },
    async save() {
      saved = true;
    },
  };
  User.findById = async (id) => {
    assert.equal(id, 'u1');
    return user;
  };

  try {
    const req = {
      body: { skinOpen: '  Frog.png ', skinClosed: '   ', background: 'Beach.png' },
      user: { userId: 'u1' },
    };
    const res = createResponse();

    await handler(req, res);

    assert.equal(saved, true);
    assert.deepEqual(user.preferences, {
      skinOpen: 'Frog.png',
      skinClosed: null,
      background: 'Beach.png',
    });
    assert.deepEqual(res.body, {
      preferences: {
        skinOpen: 'Frog.png',
        skinClosed: null,
        background: 'Beach.png',
      },
    });
  } finally {
    User.findById = originalFindById;
  }
});

test('PATCH /statuses rejects direct health updates', async () => {
  const handler = getRouteHandler('patch', '/statuses');
  const req = { body: { health: 10 }, user: { userId: 'u1' } };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'health is derived and cannot be set directly' });
});

test('PATCH /statuses derives and clamps health from the updated status fields', async () => {
  const handler = getRouteHandler('patch', '/statuses');
  const originalFindById = User.findById;
  let saved = false;
  const user = {
    companionStatuses: {
      health: 14,
      happiness: 14,
      thirst: 14,
      hunger: 14,
    },
    async save() {
      saved = true;
    },
  };
  User.findById = async () => user;

  try {
    const req = { body: { happiness: 6, thirst: 9, hunger: 3 }, user: { userId: 'u1' } };
    const res = createResponse();

    await handler(req, res);

    assert.equal(saved, true);
    assert.deepEqual(user.companionStatuses, {
      health: 6,
      happiness: 6,
      thirst: 9,
      hunger: 3,
    });
    assert.deepEqual(res.body, { companionStatuses: user.companionStatuses });
  } finally {
    User.findById = originalFindById;
  }
});

test('PATCH /life validates the current value range', async () => {
  const handler = getRouteHandler('patch', '/life');
  const req = { body: { current: 99 }, user: { userId: 'u1' } };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'current must be a number between 0 and 14' });
});

test('PATCH /life updates provided fields and resets decay when requested', async () => {
  const handler = getRouteHandler('patch', '/life');
  const originalFindById = User.findById;
  let saved = false;
  const originalNow = Date;
  const fixedNow = new originalNow('2026-04-15T15:30:00.000Z');
  global.Date = class extends originalNow {
    constructor(value) {
      return value ? new originalNow(value) : new originalNow(fixedNow);
    }
    static now() {
      return fixedNow.getTime();
    }
    static parse(value) {
      return originalNow.parse(value);
    }
  };

  const user = {
    life: { current: 4, max: 10 },
    lastCareAt: null,
    lastSessionEnd: null,
    async save() {
      saved = true;
    },
  };
  User.findById = async () => user;

  try {
    const req = {
      body: {
        current: 7,
        max: 12,
        resetDecay: true,
        lastSessionEnd: '2026-04-15T14:00:00.000Z',
      },
      user: { userId: 'u1' },
    };
    const res = createResponse();

    await handler(req, res);

    assert.equal(saved, true);
    assert.equal(user.life.current, 7);
    assert.equal(user.life.max, 12);
    assert.equal(user.lastCareAt.toISOString(), '2026-04-15T15:30:00.000Z');
    assert.equal(user.lastSessionEnd.toISOString(), '2026-04-15T14:00:00.000Z');
    assert.deepEqual(res.body, {
      life: { current: 7, max: 12 },
      lastCareAt: user.lastCareAt,
      lastSessionEnd: user.lastSessionEnd,
    });
  } finally {
    User.findById = originalFindById;
    global.Date = originalNow;
  }
});
