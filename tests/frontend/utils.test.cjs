const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, JS_DIR } = require('./helpers.cjs');

for (const [input, expected] of [[null, ''], [undefined, ''], [0, '0'], ['<b>&"\'', '&lt;b&gt;&amp;&quot;&#39;'], ['Ромашка', 'Ромашка']]) {
  test(`escape HTML: ${String(input)}`, () => assert.equal(browser().App.ui.esc(input), expected));
}
for (const [n, expected] of [[0, 'many'], [1, 'one'], [2, 'few'], [4, 'few'], [5, 'many'], [11, 'many'], [12, 'many'], [14, 'many'], [21, 'one'], [22, 'few'], [111, 'many']]) {
  test(`plural: ${n}`, () => assert.equal(browser().App.ui.plural(n, 'one', 'few', 'many'), expected));
}
for (const [input, expected] of [['87011234567', '+7 (701) 123-45-67'], ['7011234567', '+7 (701) 123-45-67'], ['+7 (701) 123-45-67', '+7 (701) 123-45-67'], ['', ''], ['abc', ''], ['870112345678999', '+7 (701) 123-45-67']]) {
  test(`phone mask: ${input}`, () => assert.equal(browser().App.ui.maskPhone(input), expected));
}
for (const [input, expected] of [[0, '0 ₸'], [12990, '12 990 ₸'], [12.6, '13 ₸'], [null, '0 ₸']]) {
  test(`price: ${input}`, () => assert.equal(browser().App.ui.price(input), expected));
}
test('nested page links and encoded parameters', () => {
  const { ui } = browser({ base: '../' }).App;
  assert.equal(ui.page('home'), '../index.html');
  assert.equal(ui.page('admin'), '../admin/index.html');
  const url = ui.catalogUrl({ q: 'чай & мёд', cat: 'herbs' });
  assert.equal(new URLSearchParams(url.split('?')[1]).get('q'), 'чай & мёд');
  assert.equal(ui.productUrl({ slug: 'tea' }), '../pages/product.html?slug=tea');
});
for (const src of ['https://cdn.example/a.png', '/media/a.jpg', 'data:image/png;base64,abc', 'blob:example']) {
  test(`absolute asset unchanged: ${src}`, () => assert.equal(browser({ base: '../' }).App.ui.url(src), src));
}
test('relative asset uses page base', () => assert.equal(browser({ base: '../' }).App.ui.url('assets/a.jpg'), '../assets/a.jpg'));
test('query reads Unicode and missing values', () => {
  const { ui } = browser({ search: '?q=%D1%87%D0%B0%D0%B9' }).App;
  assert.equal(ui.qs('q'), 'чай');
  assert.equal(ui.qs('missing'), null);
});
test('debounce invokes only latest arguments', () => {
  const pending = new Map();
  let seq = 0;

  const vm = require('node:vm');
  const fs = require('node:fs');
  const path = require('node:path');
  const c = vm.createContext({ App: {}, document: { documentElement: { dataset: {} } },
    setTimeout: fn => { pending.set(++seq, fn); return seq; }, clearTimeout: id => pending.delete(id) });
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, 'core/utils.js'), 'utf8'), c);
  const calls = [];
  const fn = c.App.ui.debounce(value => calls.push(value), 100);
  fn('old'); fn('latest');
  assert.equal(pending.size, 1);
  [...pending.values()][0]();
  assert.deepEqual(calls, ['latest']);
});

test('phone typed without country code is completed on blur', () => {
  const ui = browser().App.ui;
  let typed = '';
  for (const ch of '7011234567') typed = ui.maskPhone(typed + ch);
  assert.equal(ui.isPhoneComplete(typed), false);
  assert.equal(ui.fixPhone(typed), '+7 (701) 123-45-67');
  assert.equal(ui.fixPhone('+7 (701) 123-45-67'), '+7 (701) 123-45-67');
  assert.equal(ui.fixPhone('+7 (701) 12'), '+7 (701) 12');
});
