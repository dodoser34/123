(() => {
  const { ui, db } = App;
  const PRIVATE = ['checkout', 'pay', 'account', 'admin'];

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

  document.addEventListener('store:change', (e) => {
    if (e.detail.type === 'session' && App.auth.required && !db.session.user()) toLogin();
  });
})();
