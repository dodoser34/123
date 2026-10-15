(() => {
  const ui = App.ui;
  const base = ui.base;
  const C = App.config;

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const T = ui.t('common.footer');
    el.className = 'site-footer';
    el.innerHTML = `
      ${document.body.dataset.noBenefits ? '' : `<div class="benefits-bar"><div class="container">${ui.benefits(false)}</div></div>`}
      ${ui.decor('eucalyptus-round-spray.png', 'botanical footer-botanical')}
      ${ui.decor('jasmine-divider.png', 'botanical footer-bloom')}
      <div class="container">
        <div class="footer-main">
          <div class="footer-brand">
            ${ui.logo(true)}
            <p>${T.about}</p>
          </div>
          <div class="footer-col">
            <h4>${T.catalogTitle}</h4>
            <a href="${ui.catalogUrl({ cat: 'korean-cosmetics' })}">${T.koreanCosmetics}</a>
            <a href="${ui.catalogUrl({ cat: 'herbs' })}">${T.herbs}</a>
            <a href="${ui.catalogUrl({ cat: 'sets' })}">${T.sets}</a>
            <a href="${ui.catalogUrl({ flag: 'new' })}">${ui.t('common.flags.new')}</a>
            <a href="${ui.catalogUrl({ flag: 'sale' })}">${ui.t('common.flags.sale')}</a>
          </div>
          <div class="footer-col">
            <h4>${T.buyersTitle}</h4>
            <a href="${ui.page('delivery')}">${T.delivery}</a>
            <a href="${ui.page('delivery')}#faq">${T.faq}</a>
            <a href="${ui.page('about')}">${T.aboutUs}</a>
            <a href="${ui.page('about')}#contacts">${T.contacts}</a>
            <a href="${ui.page('account')}">${T.account}</a>
          </div>
          <div class="footer-col">
            <h4>${T.contactsTitle}</h4>
            ${C.address ? `<a href="${C.mapUrl || '#'}" target="_blank" rel="noopener">${ui.icon('pin')}${ui.esc(C.address)}</a>` : ''}
            <a href="mailto:${C.email}">${ui.icon('mail')}${ui.esc(C.email)}</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>${ui.t('common.footer.rights', { year: new Date().getFullYear(), shop: ui.esc(C.shopName) })}</span>
          <span class="hand">${T.slogan}</span>
        </div>
      </div>`;
  }

  ui.renderFooter = renderFooter;
})();
