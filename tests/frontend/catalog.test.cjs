const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, plain } = require('./helpers.cjs');
const products = [
  { id: 'a', name: 'Ромашка', brand: 'A', category: 'herbs', sub: 'tea', price: 2100, stock: 2, tags: ['сон'], purpose: ['sleep'], isNew: true, createdAt: '2026-01-02', rating: 5 },
  { id: 'b', name: 'Cream', brand: 'B', category: 'skin', price: 1000, oldPrice: 1500, stock: 3, tags: [], purpose: ['care'], createdAt: '2026-01-01', rating: 4 },
  { id: 'c', name: 'Tea', brand: 'A', category: 'herbs', price: 500, stock: 0, tags: [], purpose: [], createdAt: '2026-01-01' },
  { id: 'secret', name: 'Hidden', status: 'hidden', stock: 3, price: 1 }
];
function catalog(search = '') { const b = browser({ search, products }); b.load('pages/catalog-state.js'); return b; }
test('default catalog state has empty query', () => {
  const s = catalog().App.catalogState;
  assert.equal(s.read().sort, 'popular'); assert.equal(s.read().page, 1);
  assert.equal(s.toQuery(s.read()), '');
});
test('unknown sort and negative page fall back', () => {
  const state = catalog('?sort=invalid&page=-4').App.catalogState.read();
  assert.equal(state.sort, 'popular'); assert.equal(state.page, 1);
});
test('query round trip preserves filters and Unicode', () => {
  const a = catalog('?cat=herbs&q=чай&brand=A,B&purpose=sleep&min=0&max=5000&page=2&more=1&sort=price-asc').App.catalogState;
  const initial = a.read(); const b = catalog(a.toQuery(initial)).App.catalogState;
  assert.deepEqual(plain(b.read()), plain(initial));
});
for (const [query, ids] of [['?cat=herbs', ['a', 'c']], ['?sub=tea', ['a']], ['?flag=new', ['a']], ['?flag=sale', ['b']], ['?tag=сон', ['a']], ['?q=РОМАШКА', ['a']], ['?brand=B', ['b']], ['?purpose=care', ['b']], ['?min=1000&max=1000', ['b']], ['?min=3000', []], ['?sort=price-asc', ['b', 'a', 'c']], ['?sort=price-desc', ['a', 'b', 'c']], ['?sort=rating', ['a', 'b', 'c']]]) {
  test(`catalog selection ${query}`, () => {
    const s = catalog(query).App.catalogState;
    assert.deepEqual(plain(s.filtered(s.read()).map(p => p.id)), ids);
  });
}
test('price range rounds outward and handles empty result', () => {
  const s = catalog().App.catalogState;
  assert.deepEqual(plain(s.priceRange([])), { min: 0, max: 0 });
  assert.deepEqual(plain(s.priceRange([{ price: 1999 }, { price: 2501 }])), { min: 1900, max: 2600 });
});
test('view stored independently of URL', () => {
  const s = catalog().App.catalogState; s.saveView('list');
  assert.equal(s.read().view, 'list'); assert.equal(s.toQuery(s.read()), '');
});
