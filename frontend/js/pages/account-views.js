/* Личный кабинет → разделы: «Мои заказы» (с кнопками «Оценить»), «Мои отзывы», «Профиль», «Пароль».
   Каждая функция получает пользователя и возвращает HTML раздела. */
(() => {
  const { ui, db } = App;
  const T = ui.t('account'); // тексты — texts/…/account.js

  const productLink = (id, extra) => {
    const p = db.products.get(id);
    return p ? ui.productUrl(p) + (extra || '') : '';
  };

  /* ---------- Приветствие и статистика над разделами ---------- */
  const initials = (name) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');

  function greeting() {
    const h = new Date().getHours();
    const g = T.greeting;
    return h < 5 ? g.night : h < 12 ? g.morning : h < 18 ? g.day : g.evening;
  }

  function heroView(user) {
    const orders = db.orders.forUser(user.id).filter((o) => o.status !== 'cancelled');
    const spent = orders.reduce((sum, o) => sum + o.total, 0);
    const reviews = db.reviews.all().filter((r) => r.userId === user.id).length;
    const favs = db.favs.all().length;
    const stat = (icon, value, label, attrs) =>
      `<${attrs ? 'a' : 'div'} class="acc-stat" ${attrs || ''}><span class="acc-stat-ic">${ui.icon(icon)}</span><b>${value}</b><small>${label}</small></${attrs ? 'a' : 'div'}>`;
    return `
      <section class="acc-hero">
        ${ui.decor('branch-right.png', 'acc-hero-decor')}
        <div class="acc-hero-main">
          <span class="avatar avatar-lg">${ui.esc(initials(user.name))}</span>
          <div>
            <span class="acc-hello hand">${greeting()},</span>
            <h1>${ui.esc(user.name)}</h1>
            <p class="muted">${ui.esc(user.email)}${user.createdAt ? ' · ' + ui.t('account.since', { date: ui.date(user.createdAt) }) : ''}</p>
          </div>
        </div>
        <div class="acc-stats">
          ${stat('package', orders.length, ui.t('account.stats.orders', { count: orders.length }), 'href="#orders" data-tab="orders"')}
          ${stat('card', ui.price(spent), T.stats.spent)}
          ${stat('star', reviews, ui.t('account.stats.reviews', { count: reviews }), 'href="#reviews" data-tab="reviews"')}
          ${stat('heart', favs, T.stats.favorites, `href="${ui.page('favorites')}"`)}
        </div>
      </section>`;
  }

  /* ---------- Мои заказы ---------- */
  const STEPS = ['new', 'processing', 'shipped', 'done'].map((k) => [k, T.orders.steps[k]]);

  /** Шкала «Принят → Собираем → В пути → Получен»; у отменённого заказа её нет. */
  function progress(o) {
    const at = STEPS.findIndex(([k]) => k === o.status);
    if (at < 0) return '';
    return `<ol class="order-progress" aria-label="${T.orders.progressLabel}">${STEPS.map(
      ([, label], i) =>
        `<li class="${i < at ? 'is-done' : i === at ? 'is-current' : ''}"><span>${i <= at ? ui.icon('check') : ''}</span>${label}</li>`
    ).join('')}</ol>`;
  }

  function ordersView(user) {
    const orders = db.orders.forUser(user.id);
    if (!orders.length) {
      return `<h2>${T.orders.title}</h2>${ui.emptyState({ title: T.orders.emptyTitle, text: T.orders.emptyText, actions: `<a class="btn btn-primary" href="${ui.page('catalog')}">${T.orders.emptyAction}</a>` })}`;
    }
    const item = (o, i) => {
      const link = productLink(i.id);
      const canRate = (o.status === 'done' || o.status === 'shipped') && link;
      const mine = db.reviews.byUser(i.id, user.id);
      const action = !canRate
        ? ''
        : mine
          ? `<span class="order-rated">${ui.stars(mine.rating, 'stars-sm')}</span>`
          : `<a class="btn btn-secondary btn-sm" href="${productLink(i.id, '&review=1#reviews')}">${ui.icon('star')} ${T.orders.rate}</a>`;
      return `
        <li class="order-item">
          ${link ? `<a href="${link}">${ui.img(i.image, i.name)}</a>` : ui.img(i.image, i.name)}
          <div><span class="order-item-name">${ui.esc(i.name)}</span><small class="muted">${i.qty} × ${ui.price(i.price)}</small></div>
          ${action}
        </li>`;
    };
    return (
      `<h2>${T.orders.title}</h2>` +
      orders
        .map(
          (o) => `
        <article class="order-card">
          <div class="order-head"><b>${ui.t('account.orders.number', { number: o.number })}</b><span class="status status-${o.status}">${db.orders.STATUSES[o.status]}</span></div>
          <div class="muted order-sub">${ui.date(o.createdAt)} · ${ui.esc(o.deliveryTitle)} · ${ui.esc(o.paymentTitle)}</div>
          ${progress(o)}
          ${o.paymentStatus && o.status !== 'cancelled' ? `<p class="order-pay status-pay-${o.paymentStatus}">${T.orders.payment[o.paymentStatus] || ''}</p>` : ''}
          ${o.status !== 'cancelled' && ui.paymentInfo ? ui.paymentInfo(o) : ''}
          <ul class="order-items">${o.items.map((i) => item(o, i)).join('')}</ul>
          <div class="order-head"><span class="muted">${ui.t('account.orders.pieces', { count: o.items.reduce((s, i) => s + i.qty, 0) })}</span><b class="price">${ui.price(o.total)}</b></div>
          <div class="order-actions">
            <button class="btn btn-secondary btn-sm" type="button" data-repeat="${o.id}">${ui.icon('refresh')} ${T.orders.repeat}</button>
            <a class="btn btn-ghost btn-sm" href="${ui.contactLink(ui.t('account.orders.questionSubject', { number: o.number }))}">${T.orders.question}</a>
          </div>
        </article>`
        )
        .join('')
    );
  }

  function reviewsView(user) {
    const mine = db.reviews.all().filter((r) => r.userId === user.id);
    if (!mine.length) {
      return `<h2>${T.reviews.title}</h2>${ui.emptyState({ title: T.reviews.emptyTitle, text: T.reviews.emptyText })}`;
    }
    return (
      `<h2>${T.reviews.title}</h2>` +
      mine
        .map((r) => {
          const p = db.products.get(r.productId);
          return `
          <article class="order-card my-review">
            <div class="order-head">
              ${p ? `<a class="my-review-product" href="${ui.productUrl(p)}">${ui.img(p.images[0], '')}<b>${ui.esc(p.name)}</b></a>` : `<b>${T.reviews.productDeleted}</b>`}
              ${r.status === 'hidden' ? `<span class="status status-cancelled">${T.reviews.hidden}</span>` : `<span class="status status-done">${T.reviews.published}</span>`}
            </div>
            <div class="review-meta">${ui.stars(r.rating, 'stars-sm')}<time datetime="${r.date}">${ui.date(r.date)}</time>${r.helpful ? `<span>${ui.t('account.reviews.helpful', { count: r.helpful })}</span>` : ''}</div>
            ${r.title ? `<h4 class="review-title">${ui.esc(r.title)}</h4>` : ''}
            <p>${ui.esc(r.text)}</p>
            ${r.reply ? `<div class="review-reply">${ui.icon('reply')}<div><b>${T.reviews.reply}</b><p>${ui.esc(r.reply.text)}</p></div></div>` : ''}
            ${p ? `<a class="btn btn-ghost btn-sm" href="${ui.productUrl(p)}&review=1#reviews">${ui.icon('edit')} ${T.reviews.edit}</a>` : ''}
          </article>`;
        })
        .join('')
    );
  }

  const profileView = (user) => `
    <h2>${T.profile.title}</h2>
    <form id="profile-form" class="acc-form" novalidate>
      <div class="field"><label for="p-name">${T.profile.name}</label><input class="input" id="p-name" name="name" value="${ui.esc(user.name)}" autocomplete="name"><span class="field-error"></span></div>
      <div class="field"><label for="p-email">${T.profile.email}</label><input class="input" id="p-email" name="email" type="email" value="${ui.esc(user.email)}" autocomplete="email"${App.remote.enabled ? ` readonly aria-describedby="p-email-hint"><span class="field-hint" id="p-email-hint">${T.profile.emailFixed}</span` : ''}><span class="field-error"></span></div>
      <div class="field"><label for="p-phone">${T.profile.phone}</label><input class="input" id="p-phone" name="phone" type="tel" placeholder="+7 (___) ___-__-__" value="${ui.esc(user.phone || '')}" autocomplete="tel"><span class="field-error"></span></div>
      <button class="btn btn-primary" type="submit">${T.profile.save}</button>
    </form>
    <section class="acc-danger">
      <h3>${T.delete.title}</h3>
      <p class="muted">${T.delete.text}</p>
      <form id="delete-form" class="acc-form" novalidate>
        ${
          user.hasPassword === false
            ? ''
            : `<div class="field"><label for="d-password">${T.delete.password}</label><input class="input" id="d-password" name="password" type="password" autocomplete="current-password"><span class="field-error"></span></div>`
        }
        <button class="btn btn-danger" type="submit">${ui.icon('trash')} ${T.delete.button}</button>
      </form>
    </section>`;

  const passwordView = (user) => `
    <h2>${T.password.title}</h2>
    <form id="pw-form" class="acc-form" novalidate>
      ${
        user.hasPassword === false
          ? `<p class="muted acc-note">${T.password.noPassword}</p><input type="hidden" name="old" value="">`
          : `<div class="field"><label for="old">${T.password.old}</label><input class="input" id="old" name="old" type="password" autocomplete="current-password"><span class="field-error"></span></div>`
      }
      <div class="field"><label for="new1">${T.password.new1}</label><input class="input" id="new1" name="new1" type="password" autocomplete="new-password"><span class="field-hint">${ui.t('account.password.hint', { min: db.users.MIN_PASSWORD })}</span><span class="field-error"></span></div>
      <div class="field"><label for="new2">${T.password.new2}</label><input class="input" id="new2" name="new2" type="password" autocomplete="new-password"><span class="field-error"></span></div>
      <button class="btn btn-primary" type="submit">${T.password.save}</button>
    </form>`;

  App.accountViews = { hero: heroView, orders: ordersView, reviews: reviewsView, profile: profileView, password: passwordView };
})();
