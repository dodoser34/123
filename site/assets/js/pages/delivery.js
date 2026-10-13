/* Страница «Доставка и оплата». Тексты лежат в data/delivery-info.js */
document.addEventListener('app:ready', () => {
  const { ui } = App;
  const D = App.deliveryInfo;
  const row = (r) => `
    <div class="info-row">
      <span class="benefit-ic">${ui.icon(r.icon)}</span>
      <b>${ui.esc(r.title)}</b>
      <div><p>${ui.esc(r.text)}</p>
        ${r.logos ? `<div class="pay-logos">${r.logos.map((l) => `<span>${l}</span>`).join('')}</div>` : ''}
        ${r.map && App.config.address && App.config.mapUrl ? `<a href="${App.config.mapUrl}" target="_blank" rel="noopener">Показать на карте ${ui.icon('arrow-right')}</a>` : ''}
      </div>
    </div>`;
  document.getElementById('delivery-rows').innerHTML = D.delivery.map(row).join('');
  document.getElementById('pay-rows').innerHTML = D.pay.map(row).join('');
  document.getElementById('rates').innerHTML = D.rates.map((r) => `<tr>${r.map((c) => `<td>${ui.esc(c)}</td>`).join('')}</tr>`).join('');
  document.getElementById('faq-list').innerHTML = D.faq
    .map(([q, a]) => `<details><summary>${ui.esc(q)} ${ui.icon('plus')}</summary><p>${ui.esc(a)}</p></details>`)
    .join('');
  document.getElementById('wa-btn').href = ui.contactLink('Здравствуйте! У меня вопрос по доставке');
});
