(() => {
  const ui = App.ui;

  ui.paymentInfo = (order) => {
    const info = order && order.paymentInstructions;
    if (info && info.type === 'test_payment')
      return `
      <div class="pay-info pay-info-test">
        <div class="pay-info-head"><b>${ui.t('checkout.testPay.title')}</b></div>
        <p class="muted pay-note">${ui.t('checkout.testPay.note')}</p>
        <a class="btn btn-primary btn-sm pay-link" href="${ui.base + info.url}">${ui.icon('lock')} ${ui.t('checkout.testPay.go', { sum: ui.price(info.amount) })}</a>
      </div>`;
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

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => ui.toast({ title: ui.t('checkout.kaspi.copied'), text }))
      .catch(() => {});
  });
})();
