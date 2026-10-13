/* Личный кабинет: заказы (с кнопками «Оценить»), мои отзывы, профиль, смена пароля */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('account-root');
  if (!db.session.user()) {
    location.replace('login.html?next=account.html');
    return;
  }

  const TABS = {
    orders: ['package', 'Мои заказы'],
    reviews: ['star', 'Мои отзывы'],
    profile: ['user', 'Профиль'],
    password: ['lock', 'Пароль']
  };
  let tab = TABS[location.hash.slice(1)] ? location.hash.slice(1) : 'orders';

  const productLink = (id, extra) => {
    const p = db.products.get(id);
    return p ? ui.productUrl(p) + (extra || '') : '';
  };

  /* ---------- Разделы ---------- */
  function ordersView(user) {
    const orders = db.orders.forUser(user.id);
    if (!orders.length) {
      return `<h2>Мои заказы</h2>${ui.emptyState({ title: 'Заказов пока нет', text: 'Самое время выбрать что-нибудь приятное.', actions: '<a class="btn btn-primary" href="catalog.html">В каталог</a>' })}`;
    }
    const item = (o, i) => {
      const link = productLink(i.id);
      const canRate = (o.status === 'done' || o.status === 'shipped') && link;
      const mine = db.reviews.byUser(i.id, user.id);
      const action = !canRate
        ? ''
        : mine
          ? `<span class="order-rated">${ui.stars(mine.rating, 'stars-sm')}</span>`
          : `<a class="btn btn-secondary btn-sm" href="${productLink(i.id, '&review=1#reviews')}">${ui.icon('star')} Оценить</a>`;
      return `
        <li class="order-item">
          ${link ? `<a href="${link}">${ui.img(i.image, i.name)}</a>` : ui.img(i.image, i.name)}
          <div><span class="order-item-name">${ui.esc(i.name)}</span><small class="muted">${i.qty} × ${ui.price(i.price)}</small></div>
          ${action}
        </li>`;
    };
    return (
      `<h2>Мои заказы</h2>` +
      orders
        .map(
          (o) => `
        <article class="order-card">
          <div class="order-head"><b>Заказ №${o.number}</b><span class="status status-${o.status}">${db.orders.STATUSES[o.status]}</span></div>
          <div class="muted order-sub">${ui.date(o.createdAt)} · ${ui.esc(o.deliveryTitle)} · ${ui.esc(o.paymentTitle)}</div>
          <ul class="order-items">${o.items.map((i) => item(o, i)).join('')}</ul>
          <div class="order-head"><span class="muted">${o.items.reduce((s, i) => s + i.qty, 0)} шт.</span><b class="price">${ui.price(o.total)}</b></div>
          <div class="order-actions">
            <button class="btn btn-secondary btn-sm" type="button" data-repeat="${o.id}">${ui.icon('refresh')} Повторить заказ</button>
            <a class="btn btn-ghost btn-sm" href="${ui.contactLink('Вопрос по заказу №' + o.number)}">Вопрос по заказу</a>
          </div>
        </article>`
        )
        .join('')
    );
  }

  function reviewsView(user) {
    const mine = db.reviews.all().filter((r) => r.userId === user.id);
    if (!mine.length) {
      return `<h2>Мои отзывы</h2>${ui.emptyState({ title: 'Вы ещё не оставляли отзывов', text: 'Оценить товар можно на его странице или в разделе «Мои заказы».' })}`;
    }
    return (
      `<h2>Мои отзывы</h2>` +
      mine
        .map((r) => {
          const p = db.products.get(r.productId);
          return `
          <article class="order-card my-review">
            <div class="order-head">
              ${p ? `<a class="my-review-product" href="${ui.productUrl(p)}">${ui.img(p.images[0], '')}<b>${ui.esc(p.name)}</b></a>` : '<b>Товар удалён</b>'}
              ${r.status === 'hidden' ? '<span class="status status-cancelled">Скрыт модератором</span>' : '<span class="status status-done">Опубликован</span>'}
            </div>
            <div class="review-meta">${ui.stars(r.rating, 'stars-sm')}<time datetime="${r.date}">${ui.date(r.date)}</time>${r.helpful ? `<span>· Полезно: ${r.helpful}</span>` : ''}</div>
            ${r.title ? `<h4 class="review-title">${ui.esc(r.title)}</h4>` : ''}
            <p>${ui.esc(r.text)}</p>
            ${r.reply ? `<div class="review-reply">${ui.icon('reply')}<div><b>Ответ магазина</b><p>${ui.esc(r.reply.text)}</p></div></div>` : ''}
            ${p ? `<a class="btn btn-ghost btn-sm" href="${ui.productUrl(p)}&review=1#reviews">${ui.icon('edit')} Изменить отзыв</a>` : ''}
          </article>`;
        })
        .join('')
    );
  }

  const profileView = (user) => `
    <h2>Профиль</h2>
    <form id="profile-form" class="acc-form" novalidate>
      <div class="field"><label for="p-name">Имя</label><input class="input" id="p-name" name="name" value="${ui.esc(user.name)}" autocomplete="name"><span class="field-error"></span></div>
      <div class="field"><label for="p-email">Email</label><input class="input" id="p-email" name="email" type="email" value="${ui.esc(user.email)}" autocomplete="email"><span class="field-error"></span></div>
      <div class="field"><label for="p-phone">Телефон</label><input class="input" id="p-phone" name="phone" type="tel" placeholder="+7 (___) ___-__-__" value="${ui.esc(user.phone || '')}" autocomplete="tel"><span class="field-error"></span></div>
      <button class="btn btn-primary" type="submit">Сохранить</button>
    </form>`;

  const passwordView = () => `
    <h2>Смена пароля</h2>
    <form id="pw-form" class="acc-form" novalidate>
      <div class="field"><label for="old">Текущий пароль</label><input class="input" id="old" name="old" type="password" autocomplete="current-password"><span class="field-error"></span></div>
      <div class="field"><label for="new1">Новый пароль</label><input class="input" id="new1" name="new1" type="password" autocomplete="new-password"><span class="field-hint">Не менее ${db.users.MIN_PASSWORD} символов</span><span class="field-error"></span></div>
      <div class="field"><label for="new2">Повторите новый пароль</label><input class="input" id="new2" name="new2" type="password" autocomplete="new-password"><span class="field-error"></span></div>
      <button class="btn btn-primary" type="submit">Изменить пароль</button>
    </form>`;

  const VIEWS = { orders: ordersView, reviews: reviewsView, profile: profileView, password: passwordView };

  function render() {
    const user = db.session.user();
    if (!user) return location.replace('login.html');
    root.innerHTML = `
      <div class="account-layout">
        <nav class="panel acc-nav" aria-label="Личный кабинет">
          <div class="acc-user"><span class="avatar">${ui.esc(user.name.charAt(0).toUpperCase())}</span><div><b>${ui.esc(user.name)}</b><small>${ui.esc(user.email)}</small></div></div>
          ${Object.entries(TABS)
            .map(
              ([k, [icon, label]]) =>
                `<button type="button" data-tab="${k}" class="${k === tab ? 'is-active' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${ui.icon(icon)}${label}</button>`
            )
            .join('')}
          <a href="favorites.html">${ui.icon('heart')}Избранное</a>
          ${user.role === 'admin' ? `<a href="admin/index.html">${ui.icon('dashboard')}Админ-панель</a>` : ''}
          <button type="button" data-logout>${ui.icon('logout')}Выйти</button>
        </nav>
        <section class="panel panel-pad acc-content">${VIEWS[tab](user)}</section>
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
      tab = t.dataset.tab;
      history.replaceState(null, '', '#' + tab);
      return ui.transition(render, 'section');
    }
    if (e.target.closest('[data-logout]')) {
      db.session.end();
      location.href = 'index.html';
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
          ? { title: 'Товары добавлены в корзину', link: 'cart.html', linkText: 'Перейти в корзину' }
          : { title: 'Этих товаров сейчас нет в наличии', icon: 'x' }
      );
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.name === 'phone') e.target.value = ui.maskPhone(e.target.value);
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const user = db.session.user();
    if (f.id === 'profile-form') {
      const name = f.elements.name.value.trim();
      const phone = f.elements.phone.value.trim();
      setError(f, 'name', name.length < 2 ? 'Укажите имя' : '');
      setError(f, 'phone', phone && !ui.isPhoneComplete(phone) ? 'Введите номер полностью' : '');
      if (name.length < 2 || (phone && !ui.isPhoneComplete(phone))) return;
      const res = db.users.update(user.id, { name, email: f.elements.email.value, phone });
      setError(f, 'email', res.error || '');
      if (res.error) return;
      ui.toast({ title: 'Профиль сохранён' });
      render();
    }
    if (f.id === 'pw-form') {
      const n1 = f.elements.new1.value;
      const n2 = f.elements.new2.value;
      const short = n1.length < db.users.MIN_PASSWORD;
      setError(f, 'old', '');
      setError(f, 'new1', short ? `Не менее ${db.users.MIN_PASSWORD} символов` : '');
      setError(f, 'new2', n1 !== n2 ? 'Пароли не совпадают' : '');
      if (short || n1 !== n2) return;
      const res = db.users.changePassword(user.id, f.elements.old.value, n1);
      if (res.error) return setError(f, 'old', res.error);
      f.reset();
      ui.toast({ title: 'Пароль изменён', icon: 'lock' });
    }
  });

  document.addEventListener('store:change', (e) => {
    if (e.detail.type === 'session' && !db.session.user()) location.replace('login.html');
  });
  render();
});
