/* Загрузчик сайта. Подключается в <head> каждой страницы одной строкой:
     <script src="assets/js/app.js?v=10" data-page="catalog"></script>
   и по порядку подгружает нужные файлы из assets/js/.
   Порядок важен: настройки → данные (и демо из site/demo/) → хранилище → компоненты → страница → запуск.
   VERSION — меняйте при каждой публикации, чтобы браузеры посетителей скачали свежие файлы. */
(function () {
  var VERSION = '10';
  var base = document.documentElement.getAttribute('data-base') || '';
  var page = document.currentScript.getAttribute('data-page');

  // Картинки, которые не загрузились раньше, чем сайт запустился, помечаются и потом заменяются заглушкой
  window.imgFail = function (el) {
    el.setAttribute('data-failed', '');
  };

  /* Демо-наполнение: товары, отзывы, демо-аккаунты и демо-заказы лежат в отдельной папке site/demo/.
     Чтобы запустить магазин без демо, просто удалите папку demo — сайт продолжит работать с пустым каталогом
     (браузер один раз сообщит, что файлов нет, — это не ошибка). Подробнее: site/demo/README.md. */
  var DEMO = ['data/products.js', 'data/reviews.js', 'data/accounts.js', 'data/orders.js'];

  var COMMON = [
    'config.js',
    'core/utils.js',
    'core/icons.js',
    'components/transitions.js',
    'data/categories.js',
    DEMO,
    'store/storage.js',
    'store/categories.js',
    'store/products.js',
    'store/reviews.js',
    'store/users.js',
    'store/session.js',
    'store/cart.js',
    'store/favorites.js',
    'store/orders.js',
    'store/seed.js',
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
    home: ['pages/home.js'],
    catalog: ['pages/catalog-filters.js', 'pages/catalog-toolbar.js', 'pages/catalog.js'],
    product: ['pages/product-info.js', 'pages/product-reviews.js', 'pages/product-review-form.js', 'pages/product.js'],
    about: ['pages/about.js'],
    delivery: ['data/delivery-info.js', 'pages/delivery.js'],
    cart: ['pages/cart.js'],
    checkout: ['pages/checkout-payment.js', 'pages/checkout.js'],
    favorites: ['pages/favorites.js'],
    login: ['pages/login.js'],
    account: ['pages/account.js'],
    admin: [
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
      'admin/settings.js'
    ]
  };

  var files = [];
  COMMON.concat(PAGES[page] || [], ['core/start.js']).forEach(function (src) {
    if (src === DEMO)
      DEMO.forEach(function (d) {
        files.push('demo/' + d);
      });
    else files.push('assets/js/' + src);
  });

  files.forEach(function (src) {
    var s = document.createElement('script');
    s.src = base + src + '?v=' + VERSION;
    s.async = false; // сохранить порядок выполнения
    // страница показывается, когда всё подключено и нарисовано, — без мигания пустой шапки и плавный переход между страницами
    s.setAttribute('blocking', 'render');
    document.head.appendChild(s);
  });
})();
