/* Подвал сайта: преимущества, ссылки, контакты, копирайт */
(() => {
  const ui = App.ui;
  const base = ui.base;
  const C = App.config;

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.className = 'site-footer';
    el.innerHTML = `
      ${document.body.dataset.noBenefits ? '' : `<div class="benefits-bar"><div class="container">${ui.benefits(false)}</div></div>`}
      ${ui.decor('branch-bottom-right.png')}
      <div class="container">
        <div class="footer-main">
          <div class="footer-brand">
            ${ui.logo(true)}
            <p>Корейская косметика и натуральные травы для вашей красоты, здоровья и гармонии каждый день.</p>
          </div>
          <div class="footer-col">
            <h4>Каталог</h4>
            <a href="${ui.catalogUrl({ cat: 'korean-cosmetics' })}">Корейская косметика</a>
            <a href="${ui.catalogUrl({ cat: 'herbs' })}">Травы и сборы</a>
            <a href="${ui.catalogUrl({ cat: 'sets' })}">Подарочные наборы</a>
            <a href="${ui.catalogUrl({ flag: 'new' })}">Новинки</a>
            <a href="${ui.catalogUrl({ flag: 'sale' })}">Скидки</a>
          </div>
          <div class="footer-col">
            <h4>Покупателям</h4>
            <a href="${base}delivery.html">Доставка и оплата</a>
            <a href="${base}delivery.html#faq">Вопросы и ответы</a>
            <a href="${base}about.html">О нас</a>
            <a href="${base}about.html#contacts">Контакты</a>
            <a href="${base}account.html">Личный кабинет</a>
          </div>
          <div class="footer-col">
            <h4>Контакты</h4>
            ${C.address ? `<a href="${C.mapUrl || '#'}" target="_blank" rel="noopener">${ui.icon('pin')}${ui.esc(C.address)}</a>` : ''}
            <a href="mailto:${C.email}">${ui.icon('mail')}${ui.esc(C.email)}</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} ${ui.esc(C.shopName)}. Все права защищены.</span>
          <span class="hand">Природная забота — каждый день ♡</span>
        </div>
      </div>`;
  }

  ui.renderFooter = renderFooter;
})();
