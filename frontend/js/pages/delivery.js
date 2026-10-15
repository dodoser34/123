document.addEventListener('app:ready', () => {
  const { ui } = App;
  const D = ui.t('delivery');
  const C = App.config;

  const text = (r) => (r.textNoAddress && !C.address ? r.textNoAddress : r.text.replace('{address}', C.address));
  const row = (r) => `
    <div class="info-row">
      <span class="benefit-ic">${ui.icon(r.icon)}</span>
      <b>${ui.esc(r.title)}</b>
      <div><p>${ui.esc(text(r))}</p>
        ${r.logos ? `<div class="pay-logos">${r.logos.map((l) => `<span>${l}</span>`).join('')}</div>` : ''}
        ${r.map && C.address && C.mapUrl ? `<a href="${C.mapUrl}" target="_blank" rel="noopener">${D.showOnMap} ${ui.icon('arrow-right')}</a>` : ''}
      </div>
    </div>`;
  document.getElementById('delivery-rows').innerHTML = D.delivery.map(row).join('');
  document.getElementById('pay-rows').innerHTML = D.pay.map(row).join('');
  document.getElementById('rates-head').innerHTML = D.ratesHead.map((h) => `<th>${ui.esc(h)}</th>`).join('');
  document.getElementById('rates').innerHTML = D.rates.map((r) => `<tr>${r.map((c) => `<td>${ui.esc(c)}</td>`).join('')}</tr>`).join('');
  document.getElementById('faq-list').innerHTML = D.faq
    .map(([q, a]) => `<details><summary>${ui.esc(q)} ${ui.icon('plus')}</summary><p>${ui.esc(a)}</p></details>`)
    .join('');
  document.getElementById('wa-btn').href = ui.contactLink(D.cta.subject);
});
