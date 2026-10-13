/* Избранное: товары, отмеченные сердечком (скрытые админом не показываются) */
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
          title: 'В избранном пока пусто',
          text: 'Нажимайте ♡ на карточках товаров, чтобы сохранить понравившееся.',
          actions: '<a class="btn btn-primary" href="catalog.html">Перейти в каталог</a>'
        });
    ui.nameCards(root);
  }

  document.addEventListener('store:change', (e) => {
    if (['favs', 'products', 'reset'].includes(e.detail.type)) ui.transition(render);
  });
  render();
});
