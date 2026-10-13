/* Блок из трёх преимуществ (оригинал, доставка, удобная оплата) */
(() => {
  const ui = App.ui;

  ui.benefits = (compact) => `
    <div class="benefits${compact ? ' is-compact' : ''}">
      <div class="benefit"><span class="benefit-ic">${ui.icon('leaf')}</span><span><b>Оригинальная продукция</b>${compact ? '' : '<small>Только проверенные бренды из Кореи и натуральные травы</small>'}</span></div>
      <div class="benefit"><span class="benefit-ic">${ui.icon('truck')}</span><span><b>Доставка по Казахстану</b>${compact ? '' : '<small>Быстро и надёжно в любой город</small>'}</span></div>
      <div class="benefit"><span class="benefit-ic">${ui.icon('card')}</span><span><b>Удобная оплата</b>${compact ? '' : '<small>Картой онлайн или наличными при получении</small>'}</span></div>
    </div>`;
})();
