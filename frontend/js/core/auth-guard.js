/* Вход нужен только там, где без аккаунта не обойтись: оформление заказа, личный кабинет и админка.
   Каталог, товары, корзина, избранное и остальные страницы открыты всем.
   С закрытой страницы гость уходит на вход, а после входа возвращается туда, куда шёл.
   Подключается сразу после store/*.js — до отрисовки страницы, поэтому закрытая страница не мелькает. */
(() => {
  const { ui, db } = App;
  const PRIVATE = ['checkout', 'account', 'admin'];

  /** Текущая страница относительно корня сайта: index.html, pages/checkout.html, admin/index.html#orders. */
  function currentPath() {
    const parts = location.pathname.split('/');
    const file = parts.pop() || 'index.html';
    const folder = ui.base ? parts.pop() + '/' : '';
    return folder + file + location.search + location.hash;
  }

  function toLogin() {
    App.auth.redirecting = true;
    location.replace(ui.page('login') + '?next=' + encodeURIComponent(currentPath()));
  }

  App.auth = { required: PRIVATE.includes(App.page), redirecting: false };

  if (App.auth.required && !db.session.user()) toLogin();

  // вышли из аккаунта (в этой или другой вкладке) на закрытой странице — уйти на вход
  document.addEventListener('store:change', (e) => {
    if (e.detail.type === 'session' && App.auth.required && !db.session.user()) toLogin();
  });
})();
