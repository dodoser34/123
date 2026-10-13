/* Оформление заказа: контакты, доставка, оплата (демо-оплата картой или наличными), проверка полей.
   Поля карты и их проверка — в checkout-payment.js. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const payment = App.checkoutPayment;
  const root = document.getElementById('checkout-root');
  const user = db.session.user();
  const lastOrder = user ? db.orders.forUser(user.id)[0] : null;
  const form = { delivery: 'courier', payment: 'card', agree: true };

  const DELIVERY = {
    courier: { title: 'Курьер по Костанаю', text: 'В день заказа или на следующий день' },
    kazakhstan: { title: 'Доставка по Казахстану', text: 'Курьерская служба или Казпочта, 2–7 дней, по тарифу службы' },
    pickup: { title: 'Самовывоз', text: (App.config.address || 'Адрес сообщим при подтверждении') + ' — бесплатно' }
  };
  const PAYMENT = {
    card: { title: 'Картой онлайн', text: 'Visa, Mastercard и другие карты (демо-оплата)' },
    cash: { title: 'Наличными при получении', text: 'Курьеру или при самовывозе' }
  };

  function success(order) {
    root.innerHTML = `
      <div class="success">
        <div class="success-ic">${ui.icon('check')}</div>
        <h1>Спасибо за заказ!</h1>
        <p class="lead muted">Заказ <b>№${order.number}</b> на сумму <b>${ui.price(order.total)}</b> оформлен.</p>
        <p class="muted">${order.payment === 'card' ? `Оплачено картой ${ui.esc(order.cardBrand)} •••• ${order.cardLast4} (демо-оплата). ` : 'Оплата наличными при получении. '}Мы свяжемся с вами по номеру ${ui.esc(order.phone)} для подтверждения.</p>
        <div class="es-actions">
          ${order.userId ? '<a class="btn btn-secondary" href="account.html#orders">Мои заказы</a>' : ''}
          <a class="btn btn-primary" href="catalog.html">Продолжить покупки</a>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  function render() {
    const t = db.cart.totals(form.delivery);
    if (!t.items.length) {
      root.innerHTML = ui.emptyState({
        title: 'Нет товаров для оформления',
        text: t.unavailable.length
          ? 'Товары в корзине закончились. Загляните в каталог за похожими.'
          : 'Добавьте товары в корзину, чтобы оформить заказ.',
        actions: '<a class="btn btn-primary" href="catalog.html">В каталог</a>'
      });
      return;
    }
    const v = (k, fallback) => ui.esc(form[k] != null ? form[k] : fallback || '');
    const radios = (name, options) =>
      Object.entries(options)
        .map(
          ([k, o]) =>
            `<label class="radio-card"><input type="radio" name="${name}" value="${k}" ${form[name] === k ? 'checked' : ''}><span><b>${o.title}</b><small>${o.text}</small></span></label>`
        )
        .join('');
    const deliveryPrice =
      form.delivery === 'kazakhstan' ? '<span class="muted">по тарифу</span>' : t.delivery ? ui.price(t.delivery) : 'бесплатно';

    root.innerHTML = `
      <div class="page-head"><h1>Оформление заказа</h1>
        ${user ? '' : '<p class="lead">Уже покупали у нас? <a class="link-strong" href="login.html?next=checkout.html">Войдите</a>, чтобы видеть историю заказов.</p>'}</div>
      <form class="cart-layout" id="checkout-form" novalidate>
        <div>
          <section class="panel panel-pad checkout-block">
            <h3><span class="num">1</span>Контактные данные</h3>
            <div class="form-row">
              <div class="field"><label for="c-name">Имя и фамилия *</label><input class="input" id="c-name" name="name" autocomplete="name" value="${v('name', user && user.name)}"><span class="field-error"></span></div>
              <div class="field"><label for="c-phone">Телефон *</label><input class="input" id="c-phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" value="${v('phone', (user && user.phone) || (lastOrder && lastOrder.phone))}"><span class="field-error"></span></div>
            </div>
            <div class="field"><label for="c-email">Email</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" value="${v('email', user && user.email)}"><span class="field-error"></span></div>
          </section>
          <section class="panel panel-pad checkout-block">
            <h3><span class="num">2</span>Доставка</h3>
            <div class="radio-cards">${radios('delivery', DELIVERY)}</div>
            ${
              form.delivery === 'pickup'
                ? ''
                : `<div class="form-row checkout-address">
                     <div class="field"><label for="c-city">Город *</label><input class="input" id="c-city" name="city" autocomplete="address-level2" value="${v('city', (lastOrder && lastOrder.city) || (form.delivery === 'courier' ? 'Костанай' : ''))}"><span class="field-error"></span></div>
                     <div class="field"><label for="c-address">Улица, дом, квартира *</label><input class="input" id="c-address" name="address" autocomplete="street-address" value="${v('address', lastOrder && lastOrder.address)}"><span class="field-error"></span></div>
                   </div>`
            }
            <div class="field field-last"><label for="c-comment">Комментарий к заказу</label><textarea class="textarea" id="c-comment" name="comment" placeholder="Удобное время доставки, пожелания…">${v('comment')}</textarea></div>
          </section>
          <section class="panel panel-pad checkout-block">
            <h3><span class="num">3</span>Оплата</h3>
            <div class="radio-cards">${radios('payment', PAYMENT)}</div>
            ${form.payment === 'card' ? payment.fields() : ''}
          </section>
        </div>
        <aside class="panel panel-pad summary">
          <h3>Ваш заказ</h3>
          ${t.items.map(({ product: p, qty }) => `<div class="mini-item">${ui.img(p.images[0], '')}<span>${ui.esc(p.name)} <span class="muted">× ${qty}</span></span><b>${ui.price(p.price * qty)}</b></div>`).join('')}
          <div class="summary-totals">
            <div class="sum-row"><span>Товары</span><span>${ui.price(t.subtotal)}</span></div>
            <div class="sum-row"><span>Доставка</span><span>${deliveryPrice}</span></div>
            <div class="sum-row total"><span>Итого</span><span>${ui.price(t.total)}</span></div>
          </div>
          <label class="check summary-agree"><input type="checkbox" name="agree" ${form.agree ? 'checked' : ''}> Согласен(на) на обработку персональных данных</label>
          <span class="field-error" id="agree-error"></span>
          <button class="btn btn-primary btn-block" type="submit" id="submit-order">${form.payment === 'card' ? `${ui.icon('lock')} Оплатить ${ui.price(t.total)}` : 'Подтвердить заказ'}</button>
        </aside>
      </form>`;
  }

  /* ---------- События ---------- */
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.name) return;
    if (payment.format(el)) return; // поля карты не сохраняем даже в памяти страницы
    if (el.name === 'phone') el.value = ui.maskPhone(el.value);
    form[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    const field = el.closest('.field');
    if (field) field.classList.remove('has-error');
  });

  root.addEventListener('change', (e) => {
    if (e.target.name === 'delivery' || e.target.name === 'payment') {
      form[e.target.name] = e.target.value;
      render();
    }
  });

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    ui.$$('input:not([type=radio]), textarea', f).forEach((el) => {
      if (el.name && !el.name.startsWith('card')) form[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const errors = {};
    if ((form.name || '').trim().length < 2) errors.name = 'Укажите имя';
    if (!ui.isPhoneComplete(form.phone)) errors.phone = 'Введите номер полностью: +7 XXX XXX XX XX';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Некорректный email';
    if (form.delivery !== 'pickup') {
      if (!(form.city || '').trim()) errors.city = 'Укажите город';
      if (!(form.address || '').trim()) errors.address = 'Укажите адрес';
    }
    if (form.payment === 'card') Object.assign(errors, payment.validate(f));

    ui.$$('.field', f).forEach((field) => {
      field.classList.remove('has-error');
      const err = field.querySelector('.field-error');
      if (err) err.textContent = '';
    });
    Object.entries(errors).forEach(([k, msg]) => {
      const field = f.elements[k].closest('.field');
      field.classList.add('has-error');
      field.querySelector('.field-error').textContent = msg;
    });
    document.getElementById('agree-error').textContent = form.agree ? '' : 'Необходимо согласие';
    if (Object.keys(errors).length || !form.agree) {
      const first = f.querySelector('.has-error input');
      if (first) first.focus();
      return;
    }

    let paid = null;
    if (form.payment === 'card') {
      const button = document.getElementById('submit-order');
      button.disabled = true;
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Проводим оплату…';
      paid = await payment.pay(f);
    }

    const res = db.orders.create({
      name: form.name.trim(),
      phone: form.phone,
      email: (form.email || '').trim(),
      delivery: form.delivery,
      deliveryTitle: DELIVERY[form.delivery].title,
      city: form.delivery === 'pickup' ? 'Костанай' : form.city.trim(),
      address: form.delivery === 'pickup' ? 'Самовывоз' : form.address.trim(),
      payment: form.payment,
      paymentTitle: form.payment === 'card' ? `Картой онлайн (демо), •••• ${paid.last4}` : PAYMENT.cash.title,
      paid: form.payment === 'card',
      cardLast4: paid ? paid.last4 : '',
      cardBrand: paid ? paid.brand : '',
      comment: (form.comment || '').trim()
    });
    if (res.error) {
      ui.toast({ title: res.error, icon: 'x' });
      render();
      return;
    }
    success(res.order);
  });

  render();
});
