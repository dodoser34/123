/* Личный кабинет: меню, переключение разделов, повтор заказа, сохранение профиля и пароля.
   Разметка разделов — account-views.js. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('account-root');

  const T = ui.t('account'); // тексты — texts/…/account.js
  const TABS = {
    orders: ['package', T.nav.orders],
    reviews: ['star', T.nav.reviews],
    profile: ['user', T.nav.profile],
    password: ['lock', T.nav.password]
  };
  let tab = TABS[location.hash.slice(1)] ? location.hash.slice(1) : 'orders';

  const VIEWS = App.accountViews;

  function render() {
    const user = db.session.user();
    root.innerHTML = `
      ${VIEWS.hero(user)}
      <div class="account-layout">
        <nav class="panel acc-nav" aria-label="${T.nav.label}">
          ${Object.entries(TABS)
            .map(
              ([k, [icon, label]]) =>
                `<button type="button" data-tab="${k}" class="${k === tab ? 'is-active' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${ui.icon(icon)}${label}</button>`
            )
            .join('')}
          <a href="${ui.page('favorites')}">${ui.icon('heart')}${T.nav.favorites}</a>
          ${user.role === 'admin' ? `<a href="${ui.page('admin')}">${ui.icon('dashboard')}${T.nav.admin}</a>` : ''}
          <button type="button" class="acc-logout" data-logout>${ui.icon('logout')}${T.nav.logout}</button>
        </nav>
        <section class="panel panel-pad acc-content" data-view="${tab}">${VIEWS[tab](user)}</section>
      </div>`;
  }

  /* ---------- События ---------- */
  const setError = (form, name, msg) => {
    const field = form.elements[name].closest('.field');
    field.classList.toggle('has-error', !!msg);
    field.querySelector('.field-error').textContent = msg || '';
  };

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      e.preventDefault(); // плитки статистики — ссылки на разделы
      tab = t.dataset.tab;
      history.replaceState(null, '', '#' + tab);
      return ui.transition(render, 'section');
    }
    if (e.target.closest('[data-logout]')) {
      db.session.end(); // core/auth-guard.js отправит на страницу входа
      return;
    }
    const repeat = e.target.closest('[data-repeat]');
    if (repeat) {
      let added = 0;
      db.orders.get(repeat.dataset.repeat).items.forEach((i) => {
        if (db.cart.add(i.id, i.qty)) added++;
      });
      ui.toast(
        added
          ? { title: T.orders.repeatAdded, link: ui.page('cart'), linkText: T.orders.repeatGoToCart }
          : { title: T.orders.repeatNone, icon: 'x' }
      );
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.name === 'phone') e.target.value = ui.maskPhone(e.target.value);
  });

  /** Пока сервер отвечает, кнопка формы заблокирована. */
  async function busy(f, task) {
    const button = f.querySelector('[type=submit]');
    button.disabled = true;
    try {
      return await task();
    } finally {
      button.disabled = false;
    }
  }

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const user = db.session.user();
    if (f.id === 'profile-form') {
      const name = f.elements.name.value.trim();
      const phone = f.elements.phone.value.trim();
      setError(f, 'name', name.length < 2 ? T.profile.errorName : '');
      setError(f, 'phone', phone && !ui.isPhoneComplete(phone) ? T.profile.errorPhone : '');
      if (name.length < 2 || (phone && !ui.isPhoneComplete(phone))) return;
      const res = await busy(f, () => db.users.update(user.id, { name, email: f.elements.email.value, phone }));
      setError(f, 'email', res.error || '');
      if (res.error) return;
      ui.toast({ title: T.profile.saved });
      render();
    }
    if (f.id === 'pw-form') {
      const n1 = f.elements.new1.value;
      const n2 = f.elements.new2.value;
      const short = n1.length < db.users.MIN_PASSWORD;
      setError(f, 'old', '');
      setError(f, 'new1', short ? ui.t('account.password.errorShort', { min: db.users.MIN_PASSWORD }) : '');
      setError(f, 'new2', n1 !== n2 ? T.password.errorMatch : '');
      if (short || n1 !== n2) return;
      const res = await busy(f, () => db.users.changePassword(user.id, f.elements.old.value, n1));
      if (res.error) return f.elements.old.type === 'hidden' ? setError(f, 'new1', res.error) : setError(f, 'old', res.error);
      f.reset();
      ui.toast({ title: T.password.saved, icon: 'lock' });
    }
    if (f.id === 'delete-form') {
      const password = f.elements.password ? f.elements.password.value : '';
      if (f.elements.password && !password) return setError(f, 'password', T.delete.passwordEmpty);
      if (!(await ui.confirm(T.delete.confirm, T.delete.button))) return;
      const res = await busy(f, () => db.users.deleteAccount(password));
      if (res.error) return f.elements.password ? setError(f, 'password', res.error) : ui.toast({ title: res.error, icon: 'x' });
      ui.toast({ title: T.delete.done });
      // сессия завершена — core/auth-guard.js отправит на страницу входа
    }
  });

  render();
});
