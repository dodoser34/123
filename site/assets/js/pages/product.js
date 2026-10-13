/* Страница товара: галерея, цена и покупка, вкладки, отзывы, похожие товары.
   Информационные блоки — product-info.js, отзывы — product-reviews.js, форма отзыва — product-review-form.js. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const info = App.productInfo;
  const root = document.getElementById('product-root');
  const p = db.products.bySlug(ui.qs('slug') || '');
  const isAdmin = (db.session.user() || {}).role === 'admin';

  if (!p || (p.status === 'hidden' && !isAdmin)) {
    document.title = 'Товар не найден — ' + App.config.shopName;
    root.innerHTML = `<div class="container nf"><div class="num">404</div><h1>Товар не найден</h1>
      <p class="muted">Возможно, он закончился или был удалён.</p>
      <a class="btn btn-primary" href="catalog.html">Перейти в каталог ${ui.icon('arrow-right', 'icon-arrow')}</a></div>`;
    return;
  }

  let images = [''];
  const out = p.stock <= 0;
  const TABS = [
    ['desc', 'Описание'],
    ['comp', 'Состав'],
    ['usage', 'Применение'],
    ['specs', 'Характеристики'],
    ['reviews', 'Отзывы']
  ];
  let current = 0;
  let qty = 1;

  document.title = (p.seoTitle || `${p.name} — купить в Казахстане`) + ' | ' + App.config.shopName;
  const meta = document.createElement('meta');
  meta.name = 'description';
  meta.content = p.seoDescription || p.short;
  document.head.appendChild(meta);

  function breadcrumbs() {
    const cat = db.categories.get(p.category);
    const sub = db.categories.sub(p.category, p.sub);
    return `
      <nav class="breadcrumbs" aria-label="Хлебные крошки">
        <a href="index.html">Главная</a><span aria-hidden="true">/</span>
        ${cat ? `<a href="${ui.catalogUrl({ cat: cat.id })}">${ui.esc(cat.name)}</a><span aria-hidden="true">/</span>` : ''}
        ${sub ? `<a href="${ui.catalogUrl({ cat: cat.id, sub: sub.id })}">${ui.esc(sub.name)}</a><span aria-hidden="true">/</span>` : ''}
        <span>${ui.esc(p.name)}</span>
      </nav>`;
  }

  function gallery(fav) {
    const many = images.length > 1;
    return `
      <div class="pp-thumbs" role="group" aria-label="Фото товара">
        ${many ? images.map((src, i) => `<button type="button" data-thumb="${i}" class="${i === current ? 'is-active' : ''}" aria-label="Фото ${i + 1}">${ui.img(src, '')}</button>`).join('') : ''}
      </div>
      <div>
        <div class="pp-main" id="pp-main" title="Нажмите, чтобы увеличить">
          ${ui.img(images[current], p.name, '', 'id="pp-img"')}
          <button class="pc-fav${fav ? ' is-active' : ''}" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}">${ui.icon('heart')}</button>
          <div class="pc-badges">${ui.badges(p)}</div>
        </div>
        ${many ? `<div class="pp-dots">${images.map((_, i) => `<button type="button" data-thumb="${i}" class="${i === current ? 'is-active' : ''}" aria-label="Фото ${i + 1}"></button>`).join('')}</div>` : ''}
      </div>`;
  }

  function buyBlock(r, fav) {
    const stockText = out ? 'Нет в наличии — напишите нам, сообщим о поступлении' : p.stock <= 5 ? `Осталось ${p.stock} шт.` : 'В наличии';
    return `
      <div class="pp-info">
        <span class="pc-brand">${ui.esc(p.brand)}</span>
        <h1>${ui.esc(p.name)}</h1>
        ${p.status === 'hidden' ? `<p class="alert alert-error">${ui.icon('eye-off')} Товар скрыт с сайта — его видите только вы как администратор.</p>` : ''}
        <div class="pp-rating">
          ${r.count ? `${ui.stars(r.rating)} <b>${r.rating.toFixed(1)}</b>` : ''}
          <a href="#reviews" data-tab-link="reviews">${r.count ? `${r.count} ${ui.plural(r.count, 'отзыв', 'отзыва', 'отзывов')}` : 'Отзывов пока нет — оставьте первый'}</a>
        </div>
        <div class="pp-price"><span class="price">${ui.price(p.price)}</span>${p.oldPrice > p.price ? `<span class="price-old">${ui.price(p.oldPrice)}</span>` : ''}</div>
        <p class="pp-short">${ui.esc(p.short)}</p>
        ${info.chips(p)}
        <div class="pp-buy" id="pp-buy">
          ${
            out
              ? ''
              : `<div class="qty" role="group" aria-label="Количество">
                   <button type="button" data-q="-1" aria-label="Уменьшить">${ui.icon('minus')}</button>
                   <input type="number" min="1" max="${p.stock}" value="${qty}" id="qty" aria-label="Количество">
                   <button type="button" data-q="1" aria-label="Увеличить">${ui.icon('plus')}</button>
                 </div>`
          }
          <button class="btn btn-primary" type="button" id="buy-btn" ${out ? 'disabled' : `data-add-cart="${p.id}" data-qty="${qty}"`}>${ui.icon('cart')} ${out ? 'Нет в наличии' : 'В корзину'}</button>
          <button class="btn-icon${fav ? ' is-active' : ''}" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="В избранное">${ui.icon('heart')}</button>
        </div>
        <p class="pp-stock${out ? ' is-out' : ''}">${stockText}</p>
        <div class="pp-benefits">
          <div class="benefit"><span class="benefit-ic">${ui.icon('leaf')}</span><small>Оригинальная<br>продукция</small></div>
          <div class="benefit"><span class="benefit-ic">${ui.icon('truck')}</span><small>Доставка по<br>Казахстану</small></div>
          <div class="benefit"><span class="benefit-ic">${ui.icon('card')}</span><small>Картой или<br>наличными</small></div>
        </div>
      </div>`;
  }

  function related() {
    const all = db.products.visible().filter((x) => x.id !== p.id && x.stock > 0);
    const shared = (x) =>
      x.purpose.filter((v) => p.purpose.includes(v)).length + (x.sub === p.sub ? 2 : 0) + (x.category === p.category ? 1 : 0);
    return all.sort((a, b) => shared(b) - shared(a)).slice(0, 8);
  }

  function render() {
    const r = db.products.rating(p);
    const fav = db.favs.has(p.id);
    root.innerHTML = `
      <div class="container">
        ${breadcrumbs()}
        <section class="pp-top">${gallery(fav)}${buyBlock(r, fav)}</section>
        <section class="pp-details">
          <div class="panel pp-tabs-panel">
            <div class="tabs" role="tablist">
              ${TABS.map(([k, label], i) => `<button type="button" role="tab" data-tab="${k}" class="${i ? '' : 'is-active'}" aria-selected="${!i}">${label}${k === 'reviews' ? ` (${r.count})` : ''}</button>`).join('')}
            </div>
            ${TABS.map(([k], i) => `<div class="tab-panel${i ? '' : ' is-active'}" data-panel="${k}" ${k === 'reviews' ? 'id="reviews"' : ''} role="tabpanel">${k === 'reviews' ? App.productReviews.html(p) : info.tabs[k](p)}</div>`).join('')}
          </div>
          ${info.aside(p)}
        </section>
      </div>
      <section class="related">
        ${ui.decor('branch-left.png', 'decor-l')}${ui.decor('branch-right.png', 'decor-r')}
        <div class="container">
          <div class="section-head"><h2>С этим товаром покупают</h2></div>
          <div class="carousel" id="related">
            <button class="carousel-btn prev" type="button" aria-label="Назад">${ui.icon('chevron-left')}</button>
            <div class="carousel-track">${related()
              .map((x) => ui.productCard(x, 'full'))
              .join('')}</div>
            <button class="carousel-btn next" type="button" aria-label="Вперёд">${ui.icon('chevron-right')}</button>
          </div>
        </div>
      </section>
      ${out ? '' : `<div class="sticky-buy" id="sticky-buy"><div><small class="muted">${ui.esc(p.name)}</small><span class="price">${ui.price(p.price)}</span></div><button class="btn btn-primary btn-sm" type="button" data-add-cart="${p.id}">${ui.icon('cart')} В корзину</button></div>`}`;

    ui.carousel(document.getElementById('related'));
    bind();
    ui.tabsInk(root.querySelector('.pp-tabs-panel .tabs'));
    jsonLd(r);
  }

  /** Перерисовать только блок отзывов (и счётчики), не трогая галерею и выбранное количество. */
  function rerenderReviews() {
    ui.transition(() => {
      const panel = document.getElementById('reviews');
      const r = db.products.rating(p);
      panel.innerHTML = App.productReviews.html(p);
      document.querySelector('[data-tab="reviews"]').textContent = `Отзывы (${r.count})`;
      ui.tabsInk(document.querySelector('.pp-tabs-panel .tabs'));
      const rating = document.querySelector('.pp-rating');
      rating.innerHTML = `${r.count ? `${ui.stars(r.rating)} <b>${r.rating.toFixed(1)}</b>` : ''}<a href="#reviews" data-tab-link="reviews">${r.count} ${ui.plural(r.count, 'отзыв', 'отзыва', 'отзывов')}</a>`;
      jsonLd(r);
    });
  }
  const openReviewForm = () => App.productReviewForm.open(p, rerenderReviews);

  /** Переключить вкладку; новая выезжает с той стороны, где стоит её заголовок. */
  function switchTab(name) {
    const order = TABS.map(([k]) => k);
    const was = order.indexOf((document.querySelector('[data-tab].is-active') || {}).dataset?.tab);
    const now = order.indexOf(name);
    ui.$$('[data-tab]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.tab === name);
      b.setAttribute('aria-selected', b.dataset.tab === name);
    });
    ui.$$('[data-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === name));
    ui.tabsInk(document.querySelector('.pp-tabs-panel .tabs'));
    if (was !== now) ui.slideIn(document.querySelector(`[data-panel="${name}"]`), now > was ? 1 : -1, 24);
  }

  function setImage(i) {
    const dir = i > current ? 1 : -1;
    if ((i + images.length) % images.length === current) return;
    current = (i + images.length) % images.length;
    const old = document.querySelector('#pp-main #pp-img, #pp-main .img-ph');
    const tmp = document.createElement('div');
    tmp.innerHTML = ui.img(images[current], p.name, '', 'id="pp-img"');
    const img = tmp.firstElementChild;
    old.replaceWith(img);
    ui.slideIn(img, dir, 40);
    ui.$$('[data-thumb]').forEach((b) => b.classList.toggle('is-active', +b.dataset.thumb === current));
  }

  function bind() {
    const qtyInput = document.getElementById('qty');
    const buy = document.getElementById('buy-btn');
    const setQty = (v) => {
      qty = Math.max(1, Math.min(p.stock, v | 0 || 1));
      if (qtyInput) qtyInput.value = qty;
      buy.dataset.qty = qty;
    };
    ui.$$('[data-q]').forEach((b) => b.addEventListener('click', () => setQty(qty + +b.dataset.q)));
    if (qtyInput) qtyInput.addEventListener('change', () => setQty(+qtyInput.value));

    ui.$$('[data-thumb]').forEach((b) => b.addEventListener('click', () => setImage(+b.dataset.thumb)));
    const main = document.getElementById('pp-main');
    main.addEventListener('click', (e) => {
      if (!e.target.closest('[data-fav]') && images[0]) ui.lightbox(images, current, p.name, (i) => setImage(i));
    });
    let startX = null;
    main.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
    main.addEventListener('touchend', (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40 && images.length > 1) setImage(current + (dx < 0 ? 1 : -1));
      startX = null;
    });

    ui.$$('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        switchTab(b.dataset.tab);
        history.replaceState(null, '', location.search + '#' + b.dataset.tab);
      })
    );
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-tab-link]')) return;
      e.preventDefault();
      switchTab('reviews');
      document.querySelector('.pp-details').scrollIntoView({ behavior: 'smooth' });
    });
    App.productReviews.bind(document.getElementById('reviews'), p, rerenderReviews, openReviewForm);

    const sticky = document.getElementById('sticky-buy');
    if (sticky && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) =>
        sticky.classList.toggle('is-visible', !en.isIntersecting && en.boundingClientRect.top < 0)
      ).observe(document.getElementById('pp-buy'));
    }

    const hash = location.hash.slice(1);
    if (TABS.some(([k]) => k === hash)) switchTab(hash);
    // ссылка «Оценить» из личного кабинета: product.html?slug=…&review=1
    if (ui.qs('review') === '1') {
      switchTab('reviews');
      setTimeout(openReviewForm, 300);
    }
  }

  function jsonLd(r) {
    let s = document.getElementById('ld-product');
    if (!s) {
      s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'ld-product';
      document.head.appendChild(s);
    }
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.specs.sku || undefined,
      brand: { '@type': 'Brand', name: p.brand },
      description: p.short,
      image: images.filter(Boolean).map((i) => new URL(ui.url(i), location.href).href),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'KZT',
        price: p.price,
        availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
      }
    };
    if (r.count) data.aggregateRating = { '@type': 'AggregateRating', ratingValue: r.rating, reviewCount: r.count };
    s.textContent = JSON.stringify(data);
  }

  /** Оставить только фото, которые реально есть на сервере: дополнительные ракурсы можно докладывать в папку позже. */
  const loadable = (list) =>
    Promise.all(
      list.map(
        (src) =>
          new Promise((resolve) => {
            if (!src) return resolve(null);
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = ui.url(src);
            setTimeout(() => resolve(src), 3000); // медленная сеть — показываем как есть
          })
      )
    ).then((found) => found.filter(Boolean));

  loadable(p.images).then((found) => {
    images = found.length ? found : [''];
    render();
  });
});
