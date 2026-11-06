const test = require('node:test');
const assert = require('node:assert/strict');
const { authFlags, requiresCurrentPassword, buildResetUrl } = require('../utils/authFlags');

test('authFlags: email-only login flags', () => {
  assert.deepEqual(authFlags(null), { hasGoogle: false, hasPassword: true });
  assert.deepEqual(authFlags({ email: 'test@example.com' }), { hasGoogle: false, hasPassword: true });
});

test('requiresCurrentPassword: always true for password-based accounts', () => {
  assert.equal(requiresCurrentPassword(null), true);
  assert.equal(requiresCurrentPassword({}), true);
  assert.equal(requiresCurrentPassword({ email: 'test@example.com' }), true);
});

test('buildResetUrl: trailing slashes collapse and values are encoded', () => {
  const token = 'ab'.repeat(32);
  const email = 'a+b@x.test';
  const expected = `https://app.test/#reset-password?token=${token}&email=a%2Bb%40x.test`;
  for (const origin of ['https://app.test', 'https://app.test/', 'https://app.test///']) {
    assert.equal(buildResetUrl(origin, token, email), expected, origin);
  }
});

test('buildResetUrl: token is encoded and the query round-trips through URLSearchParams', () => {
  const cases = [
    ['ab'.repeat(32), 'a+b@x.test'],
    ['t o&k=en+/?#', 'user@example.test'],
    ['plain', 'x y+z@x.test']
  ];
  for (const [token, email] of cases) {
    const url = buildResetUrl('https://app.test', token, email);
    assert.ok(url.includes(`token=${encodeURIComponent(token)}&`), url);
    const query = url.slice(url.indexOf('?') + 1);
    const params = new URLSearchParams(query);
    assert.equal(params.get('token'), token);
    assert.equal(params.get('email'), email);
  }
});
