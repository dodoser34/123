document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('pay-root');
  const T = ui.t('pay');
  const order = db.orders.all().find((o) => o.id === ui.qs('order'));
  const info = order && order.paymentInstructions;

  if (!order || !info || info.type !== 'test_payment') {
    root.innerHTML = ui.emptyState({
      title: T.notFound,
      icon: 'bag',
      actions: `<a class="btn btn-secondary" href="${ui.page('account')}#orders">${T.toAccount}</a><a class="btn btn-primary" href="${ui.page('catalog')}">${T.toCatalog}</a>`
    });
    return;
  }

  const head = `
    <div class="pay-head">
      <span class="pay-badge">${ui.icon('lock')} ${T.testBadge}</span>
      <h1>${T.title}</h1>
      <p class="muted">${ui.t('pay.order', { number: order.number })}</p>
      <div class="pay-sum"><span>${T.amount}</span><b>${ui.price(order.total)}</b></div>
    </div>`;
  const note = `<p class="pay-test-note">${ui.icon('info')} ${T.testNote}</p>`;

  function done(paid) {
    root.innerHTML = `
      <div class="success pay-success">
        <div class="success-ic">${ui.icon('check')}</div>
        <h1>${T.success.title}</h1>
        <p class="lead muted">${ui.t('pay.success.text', { number: paid.number })}</p>
        <div class="es-actions">
          <a class="btn btn-secondary" href="${ui.page('account')}#orders">${T.toAccount}</a>
          <a class="btn btn-primary" href="${ui.page('catalog')}">${T.toCatalog}</a>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  async function send(body, button) {
    const label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${T.processing}`;
    const res = await db.orders.sandboxPay(order.id, body);
    if (res.order) return done(res.order);
    button.disabled = false;
    button.innerHTML = label;
    ui.toast({ title: T.failed, text: res.error, icon: 'x' });
    return null;
  }

  const groups = (digits) => digits.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  const brand = (digits) => (/^4/.test(digits) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(digits) ? 'Mastercard' : '');

  function cardView() {
    const C = T.card;
    root.innerHTML = `
      <div class="pay-layout">
        ${head}
        <div class="pay-card-wrap">
          <div class="pay-card" aria-hidden="true">
            <div class="pay-card-face pay-card-front">
              <span class="pay-card-chip"></span>
              <span class="pay-card-brand" data-brand></span>
              <span class="pay-card-number" data-show-number>•••• •••• •••• ••••</span>
              <span class="pay-card-exp" data-show-exp>ММ/ГГ</span>
            </div>
            <div class="pay-card-face pay-card-back">
              <span class="pay-card-stripe"></span>
              <span class="pay-card-cvc" data-show-cvc>•••</span>
            </div>
          </div>
          <form class="pay-form" novalidate autocomplete="off">
            <label class="field"><span class="label">${C.number}</span>
              <input class="input" name="card" inputmode="numeric" placeholder="0000 0000 0000 0000" maxlength="23" required></label>
            <div class="form-row">
              <label class="field"><span class="label">${C.expiry}</span>
                <input class="input" name="expiry" inputmode="numeric" placeholder="${C.expiryPlaceholder}" maxlength="5" required></label>
              <label class="field"><span class="label">${C.cvc}</span>
                <input class="input" name="cvc" inputmode="numeric" placeholder="123" maxlength="4" required></label>
            </div>
            <button class="btn btn-primary btn-block" type="submit">${ui.icon('lock')} ${ui.t('pay.card.pay', { sum: ui.price(order.total) })}</button>
            ${note}
          </form>
        </div>
        <section class="pay-hints">
          <h3>${C.hintsTitle}</h3>
          <ul>${C.hints.map(([num, what]) => `<li><code>${num}</code><span>${what}</span><button type="button" class="link-btn" data-use="${num}">${C.use}</button></li>`).join('')}</ul>
          <p class="muted">${C.hintsNote}</p>
        </section>
      </div>`;

    const f = root.querySelector('.pay-form');
    const card = root.querySelector('.pay-card');
    const show = (sel, value) => (root.querySelector(sel).textContent = value);
    const sync = () => {
      const digits = f.elements.card.value.replace(/\D/g, '');
      show('[data-show-number]', (digits.length > 16 ? digits : digits.padEnd(16, '•')).replace(/(.{4})(?=.)/g, '$1 '));
      show('[data-brand]', brand(digits));
      show('[data-show-exp]', f.elements.expiry.value || T.card.expiryPlaceholder);
      show('[data-show-cvc]', f.elements.cvc.value.replace(/./g, '•') || '•••');
    };
    f.addEventListener('input', (e) => {
      const el = e.target;
      if (el.name === 'card') el.value = groups(el.value);
      if (el.name === 'expiry') {
        const d = el.value.replace(/\D/g, '').slice(0, 4);
        el.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
      }
      if (el.name === 'cvc') el.value = el.value.replace(/\D/g, '').slice(0, 4);
      sync();
    });
    f.elements.cvc.addEventListener('focus', () => card.classList.add('is-flipped'));
    f.elements.cvc.addEventListener('blur', () => card.classList.remove('is-flipped'));
    root.querySelector('.pay-hints').addEventListener('click', (e) => {
      const b = e.target.closest('[data-use]');
      if (!b) return;
      const next = new Date().getFullYear() % 100 + 2;
      f.elements.card.value = b.dataset.use;
      f.elements.expiry.value = '12/' + String(next).padStart(2, '0');
      f.elements.cvc.value = '123';
      sync();
      f.elements.card.focus();
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const missing = ['card', 'expiry', 'cvc'].find((n) => !f.elements[n].value.trim());
      if (missing) return f.elements[missing].focus();
      send({ card: f.elements.card.value, expiry: f.elements.expiry.value, cvc: f.elements.cvc.value }, f.querySelector('[type=submit]'));
    });
    sync();
  }

  function qr(seed) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const N = 25;
    const cells = [];
    const finder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (finder(x, y)) continue;
        h = (h * 1103515245 + 12345) >>> 0;
        if (h & 0x10000) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    return `<svg viewBox="-1 -1 ${N + 2} ${N + 2}" class="pay-qr" aria-hidden="true"><rect x="-1" y="-1" width="${N + 2}" height="${N + 2}" fill="#fff"/>${eye(0, 0)}${eye(N - 7, 0)}${eye(0, N - 7)}${cells.join('')}</svg>`;
  }

  function kaspiView() {
    const K = T.kaspi;
    root.innerHTML = `
      <div class="pay-layout">
        ${head}
        <div class="pay-kaspi-box">
          <div class="pay-kaspi-logo">Kaspi<span>.kz</span></div>
          <div class="pay-qr-wrap">${qr(order.id)}<span class="pay-qr-scan" aria-hidden="true"></span></div>
          <p class="muted">${K.scan}</p>
          <button class="btn btn-primary btn-block pay-kaspi-open" type="button">${K.open}</button>
          ${note}
        </div>
      </div>`;
    root.querySelector('.pay-kaspi-open').addEventListener('click', () => {
      const md = ui.modal(
        `<div class="pay-phone">
          <div class="pay-phone-bar"><span class="pay-kaspi-logo">Kaspi<span>.kz</span></span></div>
          <h3>${K.appTitle}</h3>
          <div class="pay-row"><span>${K.shop}</span><b>${ui.esc(App.config.shopName)}</b></div>
          <div class="pay-row"><span>${ui.t('pay.order', { number: order.number })}</span><b>${ui.price(order.total)}</b></div>
          <button class="btn btn-primary btn-block" type="button" data-kaspi="pay">${K.confirm}</button>
          <button class="btn btn-ghost btn-block" type="button" data-kaspi="cancel">${K.cancel}</button>
        </div>`
      );
      md.el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-kaspi]');
        if (!b) return;
        const action = b.dataset.kaspi;
        const ok = await send({ action }, b);
        if (ok !== null || action === 'cancel') md.close();
      });
    });
  }

  if (info.method === 'kaspi') kaspiView();
  else cardView();
});
