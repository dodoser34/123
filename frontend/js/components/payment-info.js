/* Как оплатить заказ: блок с реквизитами перевода на Kaspi (после оформления заказа и в личном кабинете).
   Реквизиты приходят с сервера (backend/.env: KASPI_PHONE, KASPI_RECEIVER, KASPI_PAY_LINK). */
(() => {
  const ui = App.ui;

  /** HTML блока оплаты для заказа или '' — если платить ничего не нужно. */
  ui.paymentInfo = (order) => {
    const info = order && order.paymentInstructions;
    if (!info || info.type !== 'kaspi_transfer') return '';
    const T = ui.t('checkout.kaspi');
    const row = (label, value, copy) =>
      value
        ? `<div class="pay-row"><span>${label}</span><b>${ui.esc(String(value))}</b>${copy ? `<button type="button" class="pay-copy" data-copy="${ui.esc(String(value))}" aria-label="${T.copy}">${ui.icon('copy')}</button>` : ''}</div>`
        : '';
    return `
      <div class="pay-info">
        <div class="pay-info-head"><span class="pay-kaspi">Kaspi</span><b>${T.title}</b></div>
        ${row(T.phone, info.phone, true)}
        ${row(T.receiver, info.receiver)}
        ${row(T.amount, ui.price(info.amount))}
        ${row(T.comment, info.comment, true)}
        ${info.link ? `<a class="btn btn-primary btn-sm pay-link" href="${ui.esc(info.link)}" target="_blank" rel="noopener">${T.link}</a>` : ''}
        <p class="muted pay-note">${T.note}</p>
      </div>`;
  };

  // кнопка «скопировать» у номера и комментария
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => ui.toast({ title: ui.t('checkout.kaspi.copied'), text }))
      .catch(() => {});
  });
})();
