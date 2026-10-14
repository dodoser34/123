/* Оформление заказа: контакты, доставка, оплата, проверка полей.
   В локальном режиме способы оплаты могут дополняться модулем конкретной сборки.
   С сервером: способы оплаты приходят с сервера (перевод на Kaspi, наличные, Kaspi Pay), сумму считает сервер. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const payment = App.checkoutPayment || { format: () => false };
  const root = document.getElementById('checkout-root');
  const user = db.session.user();
  const lastOrder = user ? db.orders.forUser(user.id)[0] : null;
  const form = { delivery: 'courier', payment: '', agree: true };

  const T = ui.t('checkout'); // тексты — texts/…/checkout.js
  const D = T.delivery;
  const DELIVERY = {
    courier: D.courier,
    kazakhstan: D.kazakhstan,
    pickup: { title: D.pickup.title, text: ui.t('checkout.delivery.pickup.text', { address: App.config.address || D.addressUnknown }) }
  };
  const PAYMENT = App.remote.enabled
    ? Object.fromEntries(db.orders.paymentMethods().map((m) => [m.code, T.payment[m.code] || { title: m.title, text: m.text }]))
    : Object.assign({ cash: T.payment.cash }, App.extensions.paymentMethods || {});
  form.payment = Object.keys(PAYMENT)[0] || '';

  function success(order) {
    root.innerHTML = `
      <div class="success">
        <div class="success-ic">${ui.icon('check')}</div>
        <h1>${T.done.title}</h1>
        <p class="lead muted">${ui.t('checkout.done.lead', { number: order.number, sum: ui.price(order.total) })}</p>
        <p class="muted">${
          order.payment === 'card'
            ? ui.t('checkout.done.paidCard', { brand: ui.esc(order.cardBrand), last4: order.cardLast4 })
            : order.payment === 'kaspi_transfer'
              ? T.done.paidKaspi
              : T.done.paidCash
        } ${ui.t('checkout.done.callback', { phone: ui.esc(order.phone) })}</p>
        ${ui.paymentInfo ? ui.paymentInfo(order) : ''}
        <div class="es-actions">
          ${order.userId ? `<a class="btn btn-secondary" href="${ui.page('account')}#orders">${T.done.myOrders}</a>` : ''}
          <a class="btn btn-primary" href="${ui.page('catalog')}">${T.done.continue}</a>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  function render() {
    const t = db.cart.totals(form.delivery);
    if (!t.items.length) {
      root.innerHTML = ui.emptyState({
        title: T.empty.title,
        text: t.unavailable.length ? T.empty.textUnavailable : T.empty.text,
        actions: `<a class="btn btn-primary" href="${ui.page('catalog')}">${T.empty.action}</a>`
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
      form.delivery === 'kazakhstan' ? `<span class="muted">${D.byTariff}</span>` : t.delivery ? ui.price(t.delivery) : D.free;

    root.innerHTML = `
      <div class="page-head"><h1>${T.title}</h1></div>
      <form class="cart-layout" id="checkout-form" novalidate>
        <div>
          <section class="panel panel-pad checkout-block">
            <h3><span class="num">1</span>${T.steps.contacts}</h3>
            <div class="form-row">
              <div class="field"><label for="c-name">${T.fields.name}</label><input class="input" id="c-name" name="name" autocomplete="name" value="${v('name', user && user.name)}"><span class="field-error"></span></div>
              <div class="field"><label for="c-phone">${T.fields.phone}</label><input class="input" id="c-phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" value="${v('phone', (user && user.phone) || (lastOrder && lastOrder.phone))}"><span class="field-error"></span></div>
            </div>
            <div class="field"><label for="c-email">Email</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" value="${v('email', user && user.email)}"><span class="field-error"></span></div>
          </section>
          <section class="panel panel-pad checkout-block">
            <h3><span class="num">2</span>${T.steps.delivery}</h3>
            <div class="radio-cards">${radios('delivery', DELIVERY)}</div>
            ${
              form.delivery === 'pickup'
                ? ''
                : `<div class="form-row checkout-address">
                     <div class="field"><label for="c-city">${T.fields.city}</label><input class="input" id="c-city" name="city" autocomplete="address-level2" value="${v('city', (lastOrder && lastOrder.city) || (form.delivery === 'courier' ? D.courierCity : ''))}"><span class="field-error"></span></div>
                     <div class="field"><label for="c-address">${T.fields.address}</label><input class="input" id="c-address" name="address" autocomplete="street-address" value="${v('address', lastOrder && lastOrder.address)}"><span class="field-error"></span></div>
                   </div>`
            }
            <div class="field field-last"><label for="c-comment">${T.fields.comment}</label><textarea class="textarea" id="c-comment" name="comment" placeholder="${T.fields.commentPlaceholder}">${v('comment')}</textarea></div>
          </section>
          <section class="panel panel-pad checkout-block">
            <h3><span class="num">3</span>${T.steps.payment}</h3>
            <div class="radio-cards">${radios('payment', PAYMENT)}</div>
            ${form.payment === 'card' ? payment.fields() : ''}
          </section>
        </div>
        <aside class="panel panel-pad summary">
          <h3>${T.summary.title}</h3>
          ${t.items.map(({ product: p, qty }) => `<div class="mini-item">${ui.img(p.images[0], '')}<span>${ui.esc(p.name)} <span class="muted">× ${qty}</span></span><b>${ui.price(p.price * qty)}</b></div>`).join('')}
          <div class="summary-totals">
            <div class="sum-row"><span>${T.summary.items}</span><span>${ui.price(t.subtotal)}</span></div>
            <div class="sum-row"><span>${T.summary.delivery}</span><span>${deliveryPrice}</span></div>
            <div class="sum-row total"><span>${T.summary.total}</span><span>${ui.price(t.total)}</span></div>
          </div>
          <label class="check summary-agree"><input type="checkbox" name="agree" ${form.agree ? 'checked' : ''}> ${T.summary.agree}</label>
          <span class="field-error" id="agree-error"></span>
          <button class="btn btn-primary btn-block" type="submit" id="submit-order">${form.payment === 'card' ? `${ui.icon('lock')} ${ui.t('checkout.summary.pay', { sum: ui.price(t.total) })}` : T.summary.confirm}</button>
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
    if ((form.name || '').trim().length < 2) errors.name = T.errors.name;
    if (!ui.isPhoneComplete(form.phone)) errors.phone = T.errors.phone;
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = T.errors.email;
    if (form.delivery !== 'pickup') {
      if (!(form.city || '').trim()) errors.city = T.errors.city;
      if (!(form.address || '').trim()) errors.address = T.errors.address;
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
    document.getElementById('agree-error').textContent = form.agree ? '' : T.errors.agree;
    if (Object.keys(errors).length || !form.agree) {
      const first = f.querySelector('.has-error input');
      if (first) first.focus();
      return;
    }

    let paid = null;
    if (form.payment === 'card') {
      const button = document.getElementById('submit-order');
      button.disabled = true;
      button.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${T.payment.processing}`;
      paid = await payment.pay(f);
    }

    const button = document.getElementById('submit-order');
    button.disabled = true;
    const res = await db.orders.create({
      name: form.name.trim(),
      phone: form.phone,
      email: (form.email || '').trim(),
      delivery: form.delivery,
      deliveryTitle: DELIVERY[form.delivery].title,
      city: form.delivery === 'pickup' ? D.pickupCity : form.city.trim(),
      address: form.delivery === 'pickup' ? D.pickupAddress : form.address.trim(),
      payment: form.payment,
      paymentTitle: form.payment === 'card' ? ui.t('checkout.payment.cardOrderTitle', { last4: paid.last4 }) : PAYMENT[form.payment].title,
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
    // Kaspi Pay и другие онлайн-оплаты: переход на страницу оплаты
    const pay = res.order.paymentInstructions;
    if (pay && pay.type === 'redirect' && pay.url) return (location.href = pay.url);
    success(res.order);
  });

  render();
});
