import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../src/auth/token.js';

test('round trip', () => {
  const t = sign({ id: 7 }, 's3cret');
  assert.deepEqual(verify(t, 's3cret'), { id: 7 });
});

test('bad secret fails', () => {
  assert.equal(verify(sign({ id: 7 }, 'a'), 'b'), null);
});
