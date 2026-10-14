/* Блок из трёх преимуществ (оригинал, доставка, удобная оплата) */
(() => {
  const ui = App.ui;

  const ICONS = ['leaf', 'truck', 'card']; // по порядку преимуществ в texts/…/common.js → benefits

  ui.benefits = (compact) => `
    <div class="benefits${compact ? ' is-compact' : ''}">
      ${ui
        .t('common.benefits')
        .map(
          (b, i) =>
            `<div class="benefit"><span class="benefit-ic">${ui.icon(ICONS[i] || 'leaf')}</span><span><b>${b.title}</b>${compact ? '' : `<small>${b.text}</small>`}</span></div>`
        )
        .join('')}
    </div>`;
})();
