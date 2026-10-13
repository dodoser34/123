/* Стартовые данные и обновления формата данных.
   • Первый запуск: заполняет хранилище категориями (assets/js/data/) и демо-наполнением (site/demo/), если оно есть.
   • Обновление сайта: аккуратно дополняет уже сохранённые данные новыми полями,
     не стирая правки администратора, корзину и заказы.
   • Папку site/demo удалили: демо-товары, отзывы, заказы и аккаунты убираются и из браузеров,
     где они уже были сохранены. Всё, что добавил администратор и покупатели, остаётся.
   Подключается последним из store/*.js. */
(() => {
  const { P, KEYS, read, write, remove, emit, clone, pwHash } = App.storage;
  const db = App.db;
  const VERSION = 6;

  /** Демо-наполнение из site/demo/data/. Если папку удалили — всё пустое. */
  const DEMO = {
    products: App.seed.products || [],
    reviews: App.seed.reviews || [],
    users: App.seed.users || [],
    orders: App.seed.orders || []
  };
  const hasDemo = Object.values(DEMO).some((list) => list.length);
  const idsOf = (list) => list.map((x) => x.id);

  /** Запомнить, какие записи — демо, чтобы убрать их, когда папку demo удалят. */
  function rememberDemo() {
    if (!hasDemo) return;
    write(KEYS.demoIds, {
      products: idsOf(DEMO.products),
      reviews: idsOf(DEMO.reviews),
      users: idsOf(DEMO.users),
      orders: idsOf(DEMO.orders)
    });
  }

  /** Папку demo удалили — убрать демо-записи из сохранённых данных, не трогая остальные. */
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

  /** Демо-аккаунты из demo/data/accounts.js в формате хранилища (с хешем пароля). */
  const demoUsers = () =>
    DEMO.users.map((s) => {
      const u = Object.assign({}, s, { passwordHash: pwHash(s.id, s.password) });
      delete u.password;
      delete u.demo;
      return u;
    });

  /** Записать демо-аккаунты, сохранив остальных пользователей. */
  function writeUsers() {
    const demo = demoUsers();
    const others = read(KEYS.users, []).filter((u) => !demo.some((d) => d.email === u.email || d.id === u.id));
    write(KEYS.users, demo.concat(others));
  }

  /** Полное заполнение стартовыми данными (первый запуск или «Сброс» в админке). */
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

  /** Обновление данных, сохранённых старыми версиями сайта. */
  function migrate(from) {
    const seedById = Object.fromEntries(DEMO.products.map((p) => [p.id, p]));
    let products = read(KEYS.products, []);

    // v2: товары, добавленные в каталог позже (если их ещё нет и они не были удалены осознанно)
    if (from < 2 && !read('catalog-expansion-20261013', false)) {
      const additions = ['p8', 'p9', 'p10', 'p11', 'p12', 'p13']
        .map((id) => seedById[id])
        .filter((p) => p && !products.some((x) => x.id === p.id || x.slug === p.slug));
      products = products.concat(clone(additions));
    }
    remove('catalog-expansion-20261013');
    remove('seeded');

    // v3: новые поля товара (для чего, кому, теги, состав, применение, характеристики) и новый формат отзывов
    if (from < 3) {
      const FIELDS = ['purpose', 'audience', 'tags', 'keyIngredients', 'whenToUse', 'frequency', 'warnings', 'specs', 'attributes'];
      products = products.map((stored) => {
        const p = db.products.normalize(stored);
        const s = seedById[p.id];
        if (s && Array.isArray(stored.skinTypes)) p.audience = clone(s.audience); // старое поле «Подходит для» → «Кому подходит»
        if (s) {
          FIELDS.forEach((k) => {
            const empty = Array.isArray(p[k]) ? !p[k].length : k === 'specs' ? !Object.values(p.specs).some(Boolean) : !p[k];
            if (empty && s[k] != null) p[k] = clone(s[k]);
          });
        }
        return p;
      });
      const reviews = read(KEYS.reviews, []);
      DEMO.reviews.forEach((r) => {
        const i = reviews.findIndex((x) => x.id === r.id);
        if (i < 0) reviews.push(clone(r));
        else if (!('title' in reviews[i])) reviews[i] = clone(r); // стартовый отзыв в старом формате → новая версия
      });
      write(KEYS.reviews, reviews);
      writeUsers(); // новый формат хеша пароля у демо-аккаунтов
    }

    // v4: русские названия товаров (только если администратор не менял название сам)
    if (from < 4) {
      const RENAMED = {
        p1: ['Anua Heartleaf 77% Soothing Toner', 'Успокаивающий тонер Anua Heartleaf 77%'],
        p2: ['Beauty of Joseon Dynasty Cream', 'Питательный крем Beauty of Joseon Dynasty'],
        p3: ['Round Lab 1025 Dokdo Cleanser', 'Пенка для умывания Round Lab 1025 Dokdo'],
        p4: ['Torriden Dive-In Serum', 'Увлажняющая сыворотка Torriden Dive-In'],
        p5: ['COSRX Advanced Snail 96', 'Эссенция с муцином улитки COSRX Advanced Snail 96'],
        p6: ['MEDIPEEL Glutathione', 'Ампула для ровного тона MEDIPEEL Glutathione'],
        p7: ['Mise en Scène Perfect Serum', 'Масло-сыворотка для волос Mise en Scène Perfect'],
        p8: ['rom&nd Juicy Lasting Tint', 'Тинт для губ rom&nd Juicy Lasting'],
        p9: ['CLIO Kill Cover Mesh Glow Essential Cushion', 'Тональный кушон CLIO Kill Cover Mesh Glow'],
        p10: ['ETUDE Curl Fix Mascara', 'Подкручивающая тушь ETUDE Curl Fix'],
        p11: ['ILLIYOON Ceramide Ato Lotion', 'Лосьон для тела с церамидами ILLIYOON Ceramide Ato'],
        p12: ['ILLIYOON Ceramide Ato Top To Toe Wash', 'Средство для душа с церамидами ILLIYOON Top To Toe'],
        p13: ['HAPPY BATH Original Collection Body Wash', 'Гель для душа HAPPY BATH Original Collection']
      };
      products = products.map((p) => (RENAMED[p.id] && p.name === RENAMED[p.id][0] ? Object.assign(p, { name: RENAMED[p.id][1] }) : p));
    }

    // v5: фото товаров разложены по папкам разделов: products/anua-toner.jpg → products/face/anua-toner.jpg
    if (from < 5) {
      const FOLDERS = {
        face: [
          'anua-toner',
          'anua-toner-2',
          'anua-toner-3',
          'anua-toner-4',
          'anua-toner-5',
          'boj-dynasty-cream',
          'roundlab-dokdo-cleanser',
          'torriden-serum',
          'cosrx-snail-96',
          'medipeel-glutathione'
        ],
        hair: ['mise-en-scene-serum'],
        makeup: ['romand-juicy-tint', 'clio-mesh-cushion', 'etude-curl-mascara'],
        body: ['illiyoon-body-lotion', 'illiyoon-top-to-toe-wash', 'happybath-body-wash'],
        herbs: ['herb-immunity', 'herb-thyme', 'herb-chamomile', 'herb-digestion', 'herb-womens', 'herb-calm'],
        sets: ['set-glow', 'set-herbal']
      };
      const folderOf = {};
      Object.entries(FOLDERS).forEach(([folder, names]) => names.forEach((n) => (folderOf[n] = folder)));
      const fix = (src) => {
        const m = /^assets\/images\/products\/([\w-]+)\.(jpg|png|webp)$/.exec(src || '');
        return m && folderOf[m[1]] ? `assets/images/products/${folderOf[m[1]]}/${m[1]}.${m[2]}` : src;
      };
      products = products.map((p) => {
        p.images = (p.images || []).map(fix);
        const s = seedById[p.id];
        // дополнительные ракурсы для галереи, если у товара было только стартовое фото
        if (s && p.images.length === 1 && p.images[0] === s.images[0]) p.images = clone(s.images);
        return p;
      });
      write(
        KEYS.orders,
        read(KEYS.orders, []).map((o) => Object.assign(o, { items: o.items.map((i) => Object.assign(i, { image: fix(i.image) })) }))
      );
    }

    // v6: демо-наполнение переехало в отдельную папку site/demo/
    if (from < 6) {
      const moved = (src) => (src || '').replace(/^assets\/images\/products\//, 'demo/images/products/');
      products = products.map((p) => Object.assign(p, { images: (p.images || []).map(moved) }));
      write(
        KEYS.orders,
        read(KEYS.orders, []).map((o) => Object.assign(o, { items: o.items.map((i) => Object.assign(i, { image: moved(i.image) })) }))
      );
      rememberDemo();
    }

    write(KEYS.products, products);
    write(KEYS.version, VERSION);
  }

  function init() {
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

  /** Сколько байт занимают данные магазина в памяти браузера. */
  db.usage = function () {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(P)) total += (localStorage.getItem(key) || '').length * 2;
    }
    return total;
  };

  // синхронизация между вкладками
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(P)) emit(e.key.slice(P.length));
  });

  init();
})();
