/* Кнопки «В корзину» и «♡» работают на любой странице; счётчики в шапке обновляются сами */
(() => {
  const ui = App.ui;
  const base = ui.base;

  function addToCart(button) {
    const id = button.dataset.addCart;
    const p = App.db.products.get(id);
    if (!App.db.cart.add(id, +(button.dataset.qty || 1))) {
      ui.toast({ title: ui.t('common.toasts.outOfStock'), text: p ? p.name : '', icon: 'x' });
      return;
    }
    ui.flyToCart(button);
    ui.toast({
      title: ui.t('common.toasts.addedToCart'),
      text: p.name,
      image: p.images[0] || '',
      link: ui.page('cart'),
      linkText: ui.t('common.toasts.goToCart')
    });
    ui.$$('[data-cart-count]').forEach((b) => {
      b.classList.remove('bump');
      void b.offsetWidth; // перезапуск анимации
      b.classList.add('bump');
    });
    if (button.classList.contains('pc-cart')) {
      const html = button.innerHTML;
      button.classList.add('is-added');
      button.innerHTML = ui.icon('check') + `<span>${ui.t('common.card.inCart')}</span>`;
      setTimeout(() => {
        button.classList.remove('is-added');
        button.innerHTML = html;
      }, 1500);
    }
  }

  function toggleFavorite(button) {
    const id = button.dataset.fav;
    const active = App.db.favs.toggle(id);
    ui.$$(`[data-fav="${id}"]`).forEach((b) => {
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active);
      b.setAttribute('aria-label', ui.t(active ? 'common.card.favRemove' : 'common.card.favAdd'));
    });
    ui.toast({
      title: ui.t(active ? 'common.toasts.addedToFavs' : 'common.toasts.removedFromFavs'),
      icon: 'heart',
      link: active ? ui.page('favorites') : '',
      linkText: ui.t('common.toasts.openFavs')
    });
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-cart]');
    if (add) {
      e.preventDefault();
      addToCart(add);
      return;
    }
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      toggleFavorite(fav);
    }
  });

  document.addEventListener('store:change', (e) => {
    ui.updateCounters();
    if (e.detail.type === 'session') ui.renderHeader();
  });
})();
