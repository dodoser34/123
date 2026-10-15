const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS_DIR = path.join(__dirname, '../../frontend/js');

function browser({ base = '', search = '', products = [] } = {}) {
  const values = new Map();
  const events = [];
  const context = vm.createContext({
    App: { config: { freeShippingFrom: 15000, courierPrice: 1000 } },
    URLSearchParams, Intl, setTimeout, clearTimeout,
    console: { error() {} },
    location: { search },
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key)
    },
    document: { documentElement: { dataset: { base } }, dispatchEvent: event => events.push(event) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  });
  const load = file => vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), 'utf8'), context, { filename: file });
  load('core/utils.js');
  load('store/storage.js');
  context.App.db.products = {
    get: id => products.find(p => p.id === id),
    visible: () => products.filter(p => p.status !== 'hidden'),
    isAvailable: p => Boolean(p && p.status !== 'hidden' && p.stock > 0),
    searchText: p => `${p.name} ${p.brand}`.toLowerCase(),
    rating: p => ({ rating: p.rating || 0, count: p.reviews || 0 })
  };
  context.App.ui.t = key => key === 'catalog.sorts'
    ? { popular: 'Popular', 'price-asc': 'Ascending', 'price-desc': 'Descending', new: 'New', rating: 'Rating' }
    : key === 'common.flags' ? { new: 'New', sale: 'Sale' } : key;
  return { ...context, load, values, events };
}
const plain = value => JSON.parse(JSON.stringify(value));
module.exports = { browser, plain, JS_DIR };
