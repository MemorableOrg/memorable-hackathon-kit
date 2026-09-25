import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total, addItem } from '../src/cart/cart.js';

test('total sums price times qty', () => {
  assert.equal(total([{ sku: 'a', price: 2, qty: 3 }]), 6);
});

test('addItem merges the same sku', () => {
  const cart = addItem([{ sku: 'a', price: 2, qty: 1 }], { sku: 'a', price: 2, qty: 2 });
  assert.equal(cart[0].qty, 3);
});
