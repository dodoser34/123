(() => {
  const { KEYS: STORE_KEYS, read, write, remove, emit, clone, pwHash } = App.storage;
  const KEYS = Object.assign({}, STORE_KEYS, { demoIds: 'demo-ids' });
  const db = App.db;
  const VERSION = 6;

  const DEMO = {
    products: App.seed.products || [],
    reviews: App.seed.reviews || [],
    users: App.seed.users || [],
    orders: App.seed.orders || []
  };
  const hasDemo = Object.values(DEMO).some((list) => list.length);
  const idsOf = (list) => list.map((x) => x.id);

  function rememberDemo() {
    if (!hasDemo) return;
    write(KEYS.demoIds, {
      products: idsOf(DEMO.products),
      reviews: idsOf(DEMO.reviews),
      users: idsOf(DEMO.users),
      orders: idsOf(DEMO.orders)
    });
  }

  function removeDemo() {
    const ids = read(KEYS.demoIds, null);
    if (!ids) return;
    const keep = (key, list) =>
      write(
        KEYS[key],
        read(KEYS[key], []).filter((x) => !(list || []).includes(x.id))
      );
    keep('products', ids.products);
    keep('reviews', ids.reviews);
    keep('orders', ids.orders);
    keep('users', ids.users);
    write(
      KEYS.reviews,
      read(KEYS.reviews, []).filter((r) => !(ids.products || []).includes(r.productId))
    );
    write(
      KEYS.cart,
      read(KEYS.cart, []).filter((i) => !(ids.products || []).includes(i.id))
    );
    write(
      KEYS.favs,
      read(KEYS.favs, []).filter((id) => !(ids.products || []).includes(id))
    );
    const session = read(KEYS.session, null);
    if (session && (ids.users || []).includes(session.userId)) remove(KEYS.session);
    remove(KEYS.demoIds);
  }

  const demoUsers = () =>
    DEMO.users.map((s) => {
      const u = Object.assign({}, s, { passwordHash: pwHash(s.id, s.password) });
      delete u.password;
      delete u.demo;
      return u;
    });

  function writeUsers() {
    const demo = demoUsers();
    const others = read(KEYS.users, []).filter((u) => !demo.some((d) => d.email === u.email || d.id === u.id));
    write(KEYS.users, demo.concat(others));
  }

  function seedAll() {
    write(KEYS.products, DEMO.products.map(db.products.normalize));
    write(KEYS.categories, clone(App.seed.categories));
    write(KEYS.reviews, clone(DEMO.reviews));
    write(KEYS.orders, clone(DEMO.orders));
    writeUsers();
    if (hasDemo) rememberDemo();
    else remove(KEYS.demoIds);
    write(KEYS.version, VERSION);
  }

  function migrate(from) {
    App.migrations.run(from, { demo: DEMO, writeUsers, rememberDemo });
    write(KEYS.version, VERSION);
  }

  function init() {
    if (App.apiUrl) return;
    const version = read(KEYS.version, 0);
    if (version < VERSION) {
      if (!read(KEYS.products, null)) seedAll();
      else migrate(version);
    }
    if (!hasDemo) removeDemo();
  }

  db.reset = function () {
    seedAll();
    emit('reset');
  };

  App.extensions.resetText = 'Вернуть демонстрационные товары, фото, отзывы и аккаунты. Изменения этой демо-копии будут удалены.';
  App.extensions.resetLabel = 'Сбросить демо';
  init();
})();
