const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../../../server/routes/protected');
const authenticateToken = require('../../../server/authMiddleware');

function getRouteHandler(routerInstance, method, path) {
  const layer = routerInstance.stack.find((entry) => entry.route && entry.route.path === path);
  assert.ok(layer, `Expected route ${method.toUpperCase()} ${path}`);
  assert.equal(layer.route.methods[method], true);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('protected dashboard route returns the authenticated user id', () => {
  const handler = getRouteHandler(router, 'get', '/dashboard');
  const req = { user: { userId: 'user-1' } };
  const res = {
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  handler(req, res);

  assert.deepEqual(res.body, {
    message: 'Welcome to your dashboard!',
    userId: 'user-1',
  });
});

test('protected dashboard route keeps auth middleware attached', () => {
  const layer = router.stack.find((entry) => entry.route && entry.route.path === '/dashboard');
  assert.equal(layer.route.stack[0].handle, authenticateToken);
});
