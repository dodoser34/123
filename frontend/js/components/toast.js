/* Всплывающие уведомления в углу экрана */
(() => {
  const ui = App.ui;

  ui.toast = ({ title, text, image, link, linkText, icon }) => {
    let wrap = ui.$('.toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toasts';
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${image !== undefined ? ui.img(image, '') : `<span class="t-ic">${ui.icon(icon || 'check')}</span>`}
      <div><b>${ui.esc(title)}</b>${text ? `<small>${ui.esc(text)}</small>` : ''}${link ? `<div><a href="${link}">${ui.esc(linkText || ui.t('common.toasts.goTo'))}</a></div>` : ''}</div>`;
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add('is-out');
      // после исчезновения место плавно схлопывается, остальные уведомления мягко съезжают
      setTimeout(() => {
        if (!t.animate) return t.remove();
        t.animate(
          [
            { height: t.offsetHeight + 'px', marginTop: '0px' },
            { height: '0px', marginTop: '-10px', paddingTop: '0px', paddingBottom: '0px' }
          ],
          {
            duration: 220,
            easing: 'ease-in'
          }
        ).onfinish = () => t.remove();
      }, 240);
    }, 3200);
  };
})();
