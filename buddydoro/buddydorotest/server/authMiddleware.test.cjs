const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../../server/authMiddleware');

function createResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
}

test('authenticateToken returns 401 when no bearer token is provided', () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, { message: 'Access denied, no token provided' });
});

test('authenticateToken attaches payload and calls next for a valid token', () => {
  const originalVerify = jwt.verify;
  process.env.JWT_SECRET = 'test-secret';
  jwt.verify = (token, secret) => {
    assert.equal(token, 'good-token');
    assert.equal(secret, 'test-secret');
    return { userId: 'abc123' };
  };

  const req = { headers: { authorization: 'Bearer good-token' } };
  const res = createResponse();
  let nextCalled = false;

  try {
    authenticateToken(req, res, () => {
      nextCalled = true;
    });
  } finally {
    jwt.verify = originalVerify;
  }

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { userId: 'abc123' });
  assert.equal(res.statusCode, null);
});

test('authenticateToken returns 403 when token verification fails', () => {
  const originalVerify = jwt.verify;
  jwt.verify = () => {
    throw new Error('bad token');
  };

  const req = { headers: { authorization: 'Bearer expired-token' } };
  const res = createResponse();
  let nextCalled = false;

  try {
    authenticateToken(req, res, () => {
      nextCalled = true;
    });
  } finally {
    jwt.verify = originalVerify;
  }

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, { message: 'Invalid or expired token' });
});
