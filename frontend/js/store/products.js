(() => {
  const { KEYS, read, write, emit, uid, today } = App.storage;
  const db = App.db;

  const DEFAULTS = {
    name: '',
    brand: '',
    slug: '',
    category: '',
    sub: '',
    status: 'published',
    price: 0,
    oldPrice: null,
    stock: 0,
    images: [],
    short: '',
    description: '',
    purpose: [],
    audience: [],
    tags: [],
    benefits: [],
    keyIngredients: [],
    composition: '',
    whenToUse: [],
    frequency: '',
    usage: [],
    warnings: '',
    specs: { volume: '', country: '', shelfLife: '', sku: '' },
    attributes: [],
    sections: [],
    seoTitle: '',
    seoDescription: '',
    isHit: false,
    isNew: false,
    isPopular: false,
    createdAt: ''
  };

  function normalize(p) {
    const out = Object.assign({}, DEFAULTS, p);
    out.specs = Object.assign({}, DEFAULTS.specs, p.specs);
    ['images', 'purpose', 'audience', 'tags', 'benefits', 'keyIngredients', 'whenToUse', 'usage', 'attributes', 'sections'].forEach((k) => {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (!out.audience.length && Array.isArray(p.skinTypes)) out.audience = p.skinTypes.slice();
    delete out.skinTypes;
    delete out.rating;
    delete out.reviewsCount;
    return out;
  }

  const WHEN = App.ui.t('common.whenToUse');

  db.products = {
    WHEN,
    normalize,

    all: () => read(KEYS.products, []).map(normalize),

    visible: () => db.products.all().filter((p) => p.status !== 'hidden'),
    get: (id) => db.products.all().find((p) => p.id === id),
    bySlug: (slug) => db.products.all().find((p) => p.slug === slug),
    isAvailable: (p) => !!p && p.status !== 'hidden' && p.stock > 0,

    save(product) {
      const list = read(KEYS.products, []);
      if (!product.id) {
        product.id = uid('p');
        product.createdAt = today();
      }
      const i = list.findIndex((p) => p.id === product.id);
      const saved = normalize(i >= 0 ? Object.assign({}, list[i], product) : product);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      if (!write(KEYS.products, list)) return null;
      emit('products', { id: saved.id });
      return saved;
    },

    remove(id) {
      write(
        KEYS.products,
        read(KEYS.products, []).filter((p) => p.id !== id)
      );
      db.cart.remove(id, true);
      db.favs.remove(id);
      emit('products', { id });
    },

    rating(p) {
      const list = db.reviews.forProduct(p.id);
      if (!list.length) return { rating: 0, count: 0 };
      const sum = list.reduce((s, r) => s + r.rating, 0);
      return { rating: Math.round((sum / list.length) * 10) / 10, count: list.length };
    },

    searchText: (p) => [p.name, p.brand, p.short, ...p.tags, ...p.purpose, ...p.audience].join(' ').toLowerCase(),

    values(field) {
      const set = new Set();
      db.products.all().forEach((p) => (p[field] || []).forEach((v) => set.add(v)));
      return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
    },

    slugify(s) {
      const map = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'c',
        ч: 'ch',
        ш: 'sh',
        щ: 'shch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
        қ: 'k',
        ғ: 'g',
        ү: 'u',
        ұ: 'u',
        ң: 'n',
        ө: 'o',
        һ: 'h',
        і: 'i',
        ә: 'a'
      };
      const slug = String(s || '')
        .toLowerCase()
        .split('')
        .map((ch) => (map[ch] != null ? map[ch] : ch))
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return slug || uid('item');
    }
  };
})();
