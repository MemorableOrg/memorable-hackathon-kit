import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, isExpired, refresh } from '../src/auth/session.js';

test('a fresh session is not expired', () => {
  globalThis.__now = 1000;
  const s = createSession('u1', 500);
  assert.equal(isExpired(s), false);
});

test('a session is expired at the exact expiry instant', () => {
  globalThis.__now = 1000;
  const s = createSession('u1', 500);
  globalThis.__now = 1500;
  assert.equal(isExpired(s), true);
});

test('refresh extends a live session', () => {
  globalThis.__now = 1000;
  const s = createSession('u1', 500);
  globalThis.__now = 1200;
  assert.equal(refresh(s, 500).expiresAt, 1700);
});
