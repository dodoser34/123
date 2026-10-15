document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('fav-root');

  function render() {
    const list = db.favs
      .all()
      .map((id) => db.products.get(id))
      .filter((p) => p && p.status !== 'hidden');
    root.innerHTML = list.length
      ? `<div class="products-grid fav-grid">${list.map((p) => ui.productCard(p, 'full')).join('')}</div>`
      : ui.emptyState({
          title: ui.t('favorites.empty.title'),
          text: ui.t('favorites.empty.text'),
          actions: `<a class="btn btn-primary" href="${ui.page('catalog')}">${ui.t('favorites.empty.action')}</a>`
        });
    ui.nameCards(root);
  }

  document.addEventListener('store:change', (e) => {
    if (['favs', 'products', 'reset'].includes(e.detail.type)) ui.transition(render);
  });
  render();
});
