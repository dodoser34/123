/* Карточка товара и звёзды рейтинга */
(() => {
  const ui = App.ui;

  /** Пять звёзд; дробный рейтинг округляется до ближайшей звезды. */
  ui.stars = (rating, cls) => {
    let html = `<span class="stars${cls ? ' ' + cls : ''}" role="img" aria-label="Оценка ${rating} из 5">`;
    for (let i = 1; i <= 5; i++) html += ui.icon('star', rating >= i - 0.25 ? '' : 'off');
    return html + '</span>';
  };

  /** Метки «Хит», «Новинка», «−15%». */
  ui.badges = (p) =>
    [
      p.isHit ? '<span class="tag">Хит</span>' : '',
      p.isNew ? '<span class="tag">Новинка</span>' : '',
      p.oldPrice > p.price ? `<span class="tag tag-sale">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ''
    ].join('');

  /**
   * variant: 'compact' — квадратная кнопка корзины рядом с ценой (карусели на главной),
   *          'full'    — широкая кнопка «В корзину» (каталог, похожие товары).
   */
  ui.productCard = (p, variant) => {
    const fav = App.db.favs.has(p.id);
    const out = p.stock <= 0;
    const r = App.db.products.rating(p);
    const price = `<span class="price">${ui.price(p.price)}${p.oldPrice > p.price ? `<span class="price-old">${ui.price(p.oldPrice)}</span>` : ''}</span>`;
    const rating = r.count
      ? `<span class="pc-rating" title="${r.count} ${ui.plural(r.count, 'отзыв', 'отзыва', 'отзывов')}">${ui.icon('star')}${r.rating.toFixed(1)} <small>(${r.count})</small></span>`
      : '';
    const compactCart = out
      ? ''
      : `<button class="pc-cart-sq" type="button" data-add-cart="${p.id}" aria-label="Добавить ${ui.esc(p.name)} в корзину">${ui.icon('basket')}</button>`;
    const fullCart = out
      ? '<div class="pc-out">Нет в наличии</div>'
      : `<button class="btn btn-primary pc-cart" type="button" data-add-cart="${p.id}">${ui.icon('cart')}<span>В корзину</span></button>`;

    return `
      <article class="product-card" data-id="${p.id}">
        <a class="pc-media" href="${ui.productUrl(p)}" tabindex="-1" aria-hidden="true">${ui.img(p.images[0], p.name)}</a>
        <div class="pc-badges">${ui.badges(p)}</div>
        <button class="pc-fav${fav ? ' is-active' : ''}" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}">${ui.icon('heart')}</button>
        <div class="pc-body">
          <span class="pc-meta"><span class="pc-brand">${ui.esc(p.brand)}</span>${rating}</span>
          <a class="pc-title" href="${ui.productUrl(p)}">${ui.esc(p.name)}</a>
          <p class="pc-desc">${ui.esc(p.short)}</p>
          <div class="pc-row">${price}${variant === 'compact' ? compactCart : ''}</div>
        </div>
        ${variant === 'compact' ? (out ? '<div class="pc-out">Нет в наличии</div>' : '') : fullCart}
      </article>`;
  };
})();
