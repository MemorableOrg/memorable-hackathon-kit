export function total(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function addItem(cart, item) {
  const existing = cart.find((i) => i.sku === item.sku);
  if (existing) {
    existing.qty += item.qty;
    return cart;
  }
  return [...cart, { ...item }];
}
