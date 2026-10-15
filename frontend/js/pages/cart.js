document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const T = ui.t('cart');
  const root = document.getElementById('cart-root');

  const row = ({ product: p, qty, available }) => `
    <div class="cart-item${available ? '' : ' is-unavailable'}" style="view-transition-name: cart-${p.id}">
      <a href="${ui.productUrl(p)}">${ui.img(p.images[0], p.name)}</a>
      <div>
        <span class="pc-brand">${ui.esc(p.brand)}</span>
        <a class="ci-title" href="${ui.productUrl(p)}">${ui.esc(p.name)}</a>
        <span class="muted ci-unit">${available ? ui.t('cart.item.perUnit', { price: ui.price(p.price) }) : T.item.outOfStock}</span>
      </div>
      ${
        available
          ? `<div class="qty qty-sm" role="group" aria-label="${T.item.quantity}">
               <button type="button" data-dec="${p.id}" aria-label="${T.item.decrease}">${ui.icon('minus')}</button>
               <input type="number" value="${qty}" min="1" max="${p.stock}" data-set="${p.id}" aria-label="${T.item.quantity}">
               <button type="button" data-inc="${p.id}" aria-label="${T.item.increase}" ${qty >= p.stock ? 'disabled' : ''}>${ui.icon('plus')}</button>
             </div>
             <span class="ci-sum">${ui.price(p.price * qty)}</span>`
          : '<span></span><span></span>'
      }
      <button class="ci-del" type="button" data-del="${p.id}" aria-label="${ui.t('cart.item.remove', { name: ui.esc(p.name) })}">${ui.icon('trash')}</button>
    </div>`;

  function render() {
    const t = db.cart.totals('courier');
    if (!t.items.length && !t.unavailable.length) {
      root.innerHTML = ui.emptyState({
        title: T.empty.title,
        text: T.empty.text,
        actions: `<a class="btn btn-primary" href="${ui.page('catalog')}">${T.empty.action} ${ui.icon('arrow-right', 'icon-arrow')}</a>`
      });
      return;
    }
    const left = Math.max(0, App.config.freeShippingFrom - t.subtotal);
    const progress = Math.min(100, (t.subtotal / App.config.freeShippingFrom) * 100);
    root.innerHTML = `
      <div class="page-head"><h1>${T.title}</h1><p class="lead">${ui.t('cart.lead', { count: t.count, sum: ui.price(t.subtotal) })}</p></div>
      <div class="cart-layout">
        <section class="panel cart-list">
          ${t.items.map(row).join('')}
          ${t.unavailable.length ? `<p class="cart-note">${ui.icon('info')} ${T.unavailable}</p>${t.unavailable.map(row).join('')}` : ''}
          <div class="cart-foot">
            <a class="link-arrow" href="${ui.page('catalog')}">${ui.icon('arrow-left')} ${T.continue}</a>
            <button class="btn-ghost muted" type="button" id="clear-cart">${T.clear}</button>
          </div>
        </section>
        <aside class="panel panel-pad summary">
          <h3>${T.summary.title}</h3>
          <div class="sum-row"><span>${ui.t('cart.summary.items', { count: t.count })}</span><span>${ui.price(t.subtotal + t.discount)}</span></div>
          ${t.discount ? `<div class="sum-row is-discount"><span>${T.summary.discount}</span><span>−${ui.price(t.discount)}</span></div>` : ''}
          <div class="sum-row"><span>${T.summary.delivery}</span><span class="muted">${T.summary.deliveryLater}</span></div>
          <div class="sum-row total"><span>${T.summary.total}</span><span>${ui.price(t.subtotal)}</span></div>
          <div class="free-ship">
            ${left ? ui.t('cart.summary.freeLeft', { sum: ui.price(left) }) : T.summary.freeReached}
            <i><b style="width:${progress}%"></b></i>
          </div>
          ${
            t.items.length
              ? `<a class="btn btn-primary btn-block" href="${ui.page('checkout')}">${T.summary.checkout} ${ui.icon('arrow-right', 'icon-arrow')}</a>
                 <p class="muted summary-note">${T.summary.paymentNote}</p>`
              : `<p class="muted summary-note">${T.summary.nothingAvailable}</p>`
          }
        </aside>
      </div>`;
  }

  const qtyOf = (id) => (db.cart.raw().find((i) => i.id === id) || {}).qty || 1;

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.inc) db.cart.set(b.dataset.inc, qtyOf(b.dataset.inc) + 1);
    else if (b.dataset.dec) db.cart.set(b.dataset.dec, qtyOf(b.dataset.dec) - 1);
    else if (b.dataset.del) db.cart.remove(b.dataset.del);
    else if (b.id === 'clear-cart' && (await ui.confirm(T.clearConfirm, T.clearConfirmButton))) db.cart.clear();
  });
  root.addEventListener('change', (e) => {
    if (e.target.dataset.set) db.cart.set(e.target.dataset.set, +e.target.value || 1);
  });
  document.addEventListener('store:change', (e) => {
    if (['cart', 'products', 'reset'].includes(e.detail.type)) ui.transition(render);
  });
  render();
});
