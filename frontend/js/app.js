/* Загрузчик сайта. Подключается в <head> каждой страницы одной строкой:
     <script src="js/app.js?v=21" data-page="catalog"></script>
   и по порядку подгружает нужные файлы из js/.
   Порядок важен: настройки → данные → хранилище → компоненты → страница → запуск.
   VERSION — меняйте при каждой публикации, чтобы браузеры посетителей скачали свежие файлы. */
(function () {
  var VERSION = '23';
  var base = document.documentElement.getAttribute('data-base') || '';
  var page = document.currentScript.getAttribute('data-page');
  window.App = window.App || {};
  App.page = page; // нужен core/auth-guard.js раньше, чем нарисуется страница
  App.texts = App.texts || {}; // тексты сайта: frontend/texts/<язык>/*.js

  /* Язык сайта — из <html lang="ru">. Тексты лежат в frontend/texts/<язык>/; чтобы добавить язык,
     скопируйте папку texts/ru в texts/<код языка>, переведите и поменяйте lang у страниц. */
  var LANG = document.documentElement.lang || 'ru';

  // Картинка не загрузилась → заглушка с лотосом (декор просто убирается). Один общий перехватчик вместо
  // onerror="…" в разметке: встроенные обработчики запрещены политикой безопасности (CSP).
  // До запуска сайта такие картинки только помечаются, а заменяются в core/start.js.
  document.addEventListener(
    'error',
    function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'IMG') return;
      if (App.started && App.ui && App.ui.imgFail) App.ui.imgFail(el);
      else el.setAttribute('data-failed', '');
    },
    true
  );

  // Дополнительные модули задаёт конфигурация конкретной сборки в env.js.
  var EXTRA_DATA = [];

  var COMMON = [
    'config.js',
    'core/utils.js',
    'texts:common',
    'core/texts.js',
    'core/icons.js',
    'components/transitions.js',
    'data/categories.js',
    EXTRA_DATA,
    'store/storage.js',
    'store/categories.js',
    'store/products.js',
    'store/reviews.js',
    'store/users.js',
    'store/session.js',
    'store/cart.js',
    'store/favorites.js',
    'store/orders.js',
    'store/media.js',
    'store/init.js',
    'store/remote.js',
    'core/auth-guard.js',
    'components/images.js',
    'components/lightbox.js',
    'components/header.js',
    'components/mobile-menu.js',
    'components/benefits.js',
    'components/footer.js',
    'components/product-card.js',
    'components/toast.js',
    'components/modal.js',
    'components/carousel.js',
    'components/reveal.js',
    'components/cart-favorites-actions.js'
  ];

  var PAGES = {
    home: ['texts:home', 'pages/home.js'],
    catalog: [
      'texts:catalog',
      'pages/catalog-state.js',
      'pages/catalog-filters.js',
      'pages/catalog-toolbar.js',
      'pages/catalog-results.js',
      'pages/catalog.js'
    ],
    product: [
      'texts:product',
      'pages/product-seo.js',
      'pages/product-gallery.js',
      'pages/product-info.js',
      'pages/product-reviews.js',
      'pages/product-review-form.js',
      'pages/product.js'
    ],
    about: ['texts:about', 'pages/about.js'],
    delivery: ['texts:delivery', 'pages/delivery.js'],
    cart: ['texts:cart', 'pages/cart.js'],
    checkout: ['texts:checkout', 'components/payment-info.js', 'pages/checkout.js'],
    favorites: ['texts:favorites', 'pages/favorites.js'],
    login: ['texts:login', 'pages/login.js'],
    account: ['texts:account', 'texts:checkout', 'components/payment-info.js', 'pages/account-views.js', 'pages/account.js'],
    404: ['texts:not-found'],
    // админке нужны все тексты сайта — для раздела «Тексты сайта»
    admin: [
      'texts:home',
      'texts:catalog',
      'texts:product',
      'texts:about',
      'texts:delivery',
      'texts:cart',
      'texts:checkout',
      'texts:favorites',
      'texts:login',
      'texts:account',
      'texts:not-found',
      'admin/admin-app.js',
      'admin/form-controls.js',
      'admin/image-tools.js',
      'admin/dashboard.js',
      'admin/products-list.js',
      'admin/product-images.js',
      'admin/product-form-template.js',
      'admin/product-form.js',
      'admin/categories.js',
      'admin/orders.js',
      'admin/users.js',
      'admin/reviews.js',
      'admin/site-texts.js',
      'admin/site-photos.js',
      'admin/settings.js'
    ]
  };

  /* Сервер (бэкенд). Адрес API задаётся в frontend/env.js (KBCH_API_URL):
     пусто — локальное хранилище; '/api' или https://… — данные берутся с сервера. */
  function scriptsFor(api) {
    var files = [];
    var extra = App.extensions;
    var selected = PAGES[page] || [];
    var pageTexts = selected.filter(function (src) { return src.indexOf('texts:') === 0; });
    var pageCode = selected.filter(function (src) { return src.indexOf('texts:') !== 0; });
    var modules = COMMON.concat(extra.runtime || [], pageTexts, (extra.pages || {})[page] || [], pageCode, ['core/start.js']);
    modules.forEach(function (src) {
      if (src === EXTRA_DATA) {
        if (!api) (extra.data || []).forEach(function (file) { files.push(file); });
      } else if (src.indexOf('texts:') === 0) files.push('texts/' + LANG + '/' + src.slice(6) + '.js');
      else files.push(src.indexOf('@') === 0 ? src.slice(1) : 'js/' + src);
    });
    return files;
  }

  function addScript(src, onload) {
    var s = document.createElement('script');
    s.src = base + src + (src.includes('?') ? '&' : '?') + 'v=' + VERSION;
    s.async = false; // сохранить порядок выполнения
    // страница показывается, когда всё подключено и нарисовано, — без мигания пустой шапки и плавный переход между страницами
    s.setAttribute('blocking', 'render');
    if (onload) s.onload = s.onerror = onload;
    document.head.appendChild(s);
  }

  // пока данные и скрипты загружаются, страница скрыта (start.js показывает её); на всякий случай — не дольше 6 секунд
  var hide = document.createElement('style');
  hide.id = 'boot-hide';
  hide.textContent = 'html.is-booting body{opacity:0}';
  document.head.appendChild(hide);
  document.documentElement.classList.add('is-booting');
  setTimeout(function () {
    document.documentElement.classList.remove('is-booting');
  }, 6000);

  addScript('env.js', function () {
    var api = String(window.KBCH_API_URL || '').replace(/\/+$/, '');
    App.apiUrl = api;
    App.storagePrefix = window.KBCH_STORAGE_PREFIX || 'kbch.v1.';
    App.extensions = api ? {} : window.KBCH_EXTENSIONS || {};
    (App.extensions.styles || []).forEach(function (src) {
      var link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = base + src + '?v=' + VERSION;
      document.head.appendChild(link);
    });
    if (!api)
      return scriptsFor('').forEach(function (f) {
        addScript(f);
      });
    // вход через Google возвращает на страницу входа с #token=… — сохраняем токен до загрузки данных
    var m = /[#&]token=([^&]+)/.exec(location.hash);
    if (m) {
      try {
        localStorage.setItem('kbch.v1.token', decodeURIComponent(m[1]));
      } catch (e) {}
    }
    var boot = (App.boot = { ok: false, error: '' });
    var token = '';
    var voter = '';
    try {
      token = localStorage.getItem('kbch.v1.token') || '';
      voter = JSON.parse(localStorage.getItem('kbch.v1.voter-id') || '""');
    } catch (e) {}
    fetch(api + '/bootstrap?voter=' + encodeURIComponent(voter || ''), { headers: token ? { Authorization: 'Bearer ' + token } : {} })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        boot.ok = true;
        boot.data = data;
        try {
          // данные сервера кладутся в тот же кеш, из которого читают страницы (js/store/*)
          var P = 'kbch.v1.';
          var set = function (k, v) {
            localStorage.setItem(P + k, JSON.stringify(v));
          };
          set('products', data.products);
          set('categories', data.categories);
          set('reviews', data.reviews);
          set('orders', data.orders);
          set('users', data.users);
          set('text-edits', data.site.textEdits || {});
          set('site-photos', data.site.sitePhotos || {});
          if (data.user) set('session', { userId: data.user.id });
          else {
            localStorage.removeItem(P + 'session');
            if (token) localStorage.removeItem(P + 'token'); // токен устарел или аккаунт заблокирован
          }
        } catch (e) {}
      })
      .catch(function (e) {
        boot.error = e.message || 'network'; // сервер недоступен — страница откроется с последними сохранёнными данными
      })
      .then(function () {
        scriptsFor(api).forEach(function (f) {
          addScript(f);
        });
      });
  });
})();
