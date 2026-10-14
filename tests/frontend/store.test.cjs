const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, plain } = require('./helpers.cjs');

function shop(products = [{ id: 'tea', name: 'Tea', price: 2000, oldPrice: 2500, stock: 10 }]) {
  const b = browser({ products });
  b.load('store/cart.js'); b.load('store/favorites.js');
  return b;
}
test('storage round trip and namespace', () => {
  const b = shop();
  assert.equal(b.App.storage.write('custom', { text: 'чай', items: [1, 2] }), true);
  assert.deepEqual(plain(b.App.storage.read('custom')), { text: 'чай', items: [1, 2] });
  assert.ok(b.values.has('kbch.v1.custom'));
});
for (const raw of [undefined, '{broken', 'undefined']) {
  test(`storage fallback: ${raw}`, () => {
    const b = shop();
    if (raw !== undefined) b.values.set('kbch.v1.cart', raw);
    assert.deepEqual(plain(b.App.storage.read('cart', [])), []);
  });
}
test('quota failure is reported without throwing', () => {
  const b = shop(); b.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(b.App.storage.write('cart', []), false);
});
test('storage removal preserves unrelated keys', () => {
  const b = shop(); b.App.storage.write('a', 1); b.App.storage.write('b', 2);
  b.App.storage.remove('a');
  assert.equal(b.App.storage.read('a', null), null);
  assert.equal(b.App.storage.read('b'), 2);
});
test('cart merges repeated additions and emits event', () => {
  const b = shop(); const cart = b.App.db.cart;
  assert.equal(cart.add('tea', 2), true); cart.add('tea', 3);
  assert.deepEqual(plain(cart.raw()), [{ id: 'tea', qty: 5 }]);
  assert.equal(b.events.at(-1).type, 'store:change');
  assert.deepEqual(plain(b.events.at(-1).detail), { type: 'cart', id: 'tea', added: 3 });
});
for (const product of [undefined, { id: 'tea', stock: 0 }, { id: 'tea', stock: 5, status: 'hidden' }]) {
  test(`unavailable addition: ${JSON.stringify(product)}`, () => {
    const b = shop(product ? [product] : []);
    assert.equal(b.App.db.cart.add('tea'), false);
    assert.deepEqual(plain(b.App.db.cart.raw()), []);
    assert.equal(b.events.length, 0);
  });
}
for (const [qty, expected] of [[0, 1], [-3, 1], [3.9, 3], [1000, 10]]) {
  test(`cart quantity clamp: ${qty}`, () => {
    const { cart } = shop().App.db; cart.add('tea'); cart.set('tea', qty);
    assert.equal(cart.raw()[0].qty, expected);
  });
}
test('cart addition caps at stock and global maximum', () => {
  const b = shop([{ id: 'tea', stock: 500, price: 1 }]);
  b.App.db.cart.add('tea', 200);
  assert.equal(b.App.db.cart.raw()[0].qty, 99);
});
test('unknown cart update is a no-op', () => {
  const b = shop(); b.App.db.cart.set('missing', 2);
  assert.equal(b.events.length, 0); assert.equal(b.App.db.cart.count(), 0);
});
test('deleted products omitted; hidden products excluded from total', () => {
  const b = shop([{ id: 'tea', stock: 2, price: 1000, status: 'hidden' }]);
  b.App.storage.write('cart', [{ id: 'tea', qty: 2 }, { id: 'deleted', qty: 5 }]);
  const t = b.App.db.cart.totals('pickup');
  assert.equal(t.total, 0); assert.equal(t.count, 0); assert.equal(t.unavailable.length, 1);
});
for (const [price, method, fee] of [[14999, 'courier', 1000], [15000, 'courier', 0], [15001, 'courier', 0], [1000, 'pickup', 0], [1000, 'kazakhstan', 0]]) {
  test(`delivery threshold: ${price}/${method}`, () => {
    const { cart } = shop([{ id: 'tea', stock: 1, price }]).App.db;
    cart.add('tea'); const t = cart.totals(method);
    assert.equal(t.delivery, fee); assert.equal(t.total, price + fee);
  });
}
test('discount and count calculated for available quantity', () => {
  const { cart } = shop().App.db; cart.add('tea', 2);
  const t = cart.totals('pickup');
  assert.equal(t.subtotal, 4000); assert.equal(t.discount, 1000); assert.equal(t.count, 2);
});
test('silent removal and clear', () => {
  const b = shop(); b.App.db.cart.add('tea'); b.App.db.cart.remove('tea', true);
  assert.equal(b.events.length, 1); assert.equal(b.App.db.cart.count(), 0);
  b.App.db.cart.add('tea'); b.App.db.cart.clear();
  assert.deepEqual(plain(b.App.db.cart.raw()), []); assert.equal(b.events.at(-1).detail.type, 'cart');
});
test('favorite toggles without duplicates and keeps other entries', () => {
  const b = shop(); const f = b.App.db.favs;
  assert.equal(f.toggle('tea'), true); f.toggle('cream');
  assert.equal(f.has('tea'), true); assert.equal(f.toggle('tea'), false);
  assert.deepEqual(plain(f.all()), ['cream']);
  f.remove('missing'); assert.deepEqual(plain(f.all()), ['cream']);
  f.remove('cream'); assert.deepEqual(plain(f.all()), []);
});
