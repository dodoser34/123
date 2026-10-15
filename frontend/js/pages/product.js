document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const info = App.productInfo;
  const T = ui.t('product');
  const seo = App.productSeo;
  const root = document.getElementById('product-root');
  const p = db.products.bySlug(ui.qs('slug') || '');
  const isAdmin = (db.session.user() || {}).role === 'admin';

  if (!p || (p.status === 'hidden' && !isAdmin)) {
    document.title = T.notFound.title + ' — ' + App.config.shopName;
    root.innerHTML = `<div class="container nf"><div class="num">404</div><h1>${T.notFound.title}</h1>
      <p class="muted">${T.notFound.text}</p>
      <a class="btn btn-primary" href="${ui.page('catalog')}">${T.notFound.action} ${ui.icon('arrow-right', 'icon-arrow')}</a></div>`;
    return;
  }

  const gallery = App.productGallery.create(p);
  const out = p.stock <= 0;
  const TABS = [
    ['desc', T.tabs.desc],
    ['comp', T.tabs.comp],
    ['usage', T.tabs.usage],
    ['specs', T.tabs.specs],

    ...p.sections.map((sec, i) => ['x' + i, ui.esc(sec.title)]),
    ['reviews', T.tabs.reviews]
  ];
  let qty = 1;

  seo.meta(p);

  function breadcrumbs() {
    const cat = db.categories.get(p.category);
    const sub = db.categories.sub(p.category, p.sub);
    return `
      <nav class="breadcrumbs" aria-label="${ui.t('common.breadcrumbs.label')}">
        <a href="${ui.page('home')}">${ui.t('common.breadcrumbs.home')}</a><span aria-hidden="true">/</span>
        ${cat ? `<a href="${ui.catalogUrl({ cat: cat.id })}">${ui.esc(cat.name)}</a><span aria-hidden="true">/</span>` : ''}
        ${sub ? `<a href="${ui.catalogUrl({ cat: cat.id, sub: sub.id })}">${ui.esc(sub.name)}</a><span aria-hidden="true">/</span>` : ''}
        <span>${ui.esc(p.name)}</span>
      </nav>`;
  }

  const ratingHtml = (r) => `
    ${r.count ? `${ui.stars(r.rating)} <b>${r.rating.toFixed(1)}</b>` : ''}
    <a href="#reviews" data-tab-link="reviews">${r.count ? ui.t('product.buy.reviews', { count: r.count }) : T.buy.noReviews}</a>`;

  function buyBlock(r, fav) {
    const stockText = out ? T.buy.stockOut : p.stock <= 5 ? ui.t('product.buy.stockFew', { count: p.stock }) : T.buy.stockIn;
    return `
      <div class="pp-info">
        <span class="pc-brand">${ui.esc(p.brand)}</span>
        <h1>${ui.esc(p.name)}</h1>
        ${p.status === 'hidden' ? `<p class="alert alert-error">${ui.icon('eye-off')} ${T.hiddenNotice}</p>` : ''}
        <div class="pp-rating">${ratingHtml(r)}</div>
        <div class="pp-price"><span class="price">${ui.price(p.price)}</span>${p.oldPrice > p.price ? `<span class="price-old">${ui.price(p.oldPrice)}</span>` : ''}</div>
        <p class="pp-short">${ui.esc(p.short)}</p>
        ${info.chips(p)}
        <div class="pp-buy" id="pp-buy">
          ${
            out
              ? ''
              : `<div class="qty" role="group" aria-label="${T.buy.quantity}">
                   <button type="button" data-q="-1" aria-label="${T.buy.decrease}">${ui.icon('minus')}</button>
                   <input type="number" min="1" max="${p.stock}" value="${qty}" id="qty" aria-label="${T.buy.quantity}">
                   <button type="button" data-q="1" aria-label="${T.buy.increase}">${ui.icon('plus')}</button>
                 </div>`
          }
          <button class="btn btn-primary" type="button" id="buy-btn" ${out ? 'disabled' : `data-add-cart="${p.id}" data-qty="${qty}"`}>${ui.icon('cart')} ${out ? T.buy.outOfStock : T.buy.toCart}</button>
          <button class="btn-icon${fav ? ' is-active' : ''}" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${T.buy.favorite}">${ui.icon('heart')}</button>
        </div>
        <p class="pp-stock${out ? ' is-out' : ''}">${stockText}</p>
        <div class="pp-benefits">
          ${ui
            .t('common.benefits')
            .map(
              (b, i) =>
                `<div class="benefit"><span class="benefit-ic">${ui.icon(['leaf', 'truck', 'card'][i] || 'leaf')}</span><small>${b.short}</small></div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function tabsPanel(r) {
    return `
      <div class="panel pp-tabs-panel">
        <div class="tabs" role="tablist">
          ${TABS.map(([k, label], i) => `<button type="button" role="tab" data-tab="${k}" class="${i ? '' : 'is-active'}" aria-selected="${!i}">${label}${k === 'reviews' ? ` (${r.count})` : ''}</button>`).join('')}
        </div>
        ${TABS.map(([k], i) => `<div class="tab-panel${i ? '' : ' is-active'}" data-panel="${k}" ${k === 'reviews' ? 'id="reviews"' : ''} role="tabpanel">${k === 'reviews' ? App.productReviews.html(p) : k[0] === 'x' ? info.custom(p.sections[+k.slice(1)]) : info.tabs[k](p)}</div>`).join('')}
      </div>`;
  }

  function related() {
    const all = db.products.visible().filter((x) => x.id !== p.id && x.stock > 0);
    const shared = (x) =>
      x.purpose.filter((v) => p.purpose.includes(v)).length + (x.sub === p.sub ? 2 : 0) + (x.category === p.category ? 1 : 0);
    return all.sort((a, b) => shared(b) - shared(a)).slice(0, 8);
  }

  function relatedSection() {
    return `
      <section class="related">
        ${ui.decor('tea-branch.png', 'botanical decor-l')}${ui.decor('centella-leaves.png', 'botanical decor-r')}
        <div class="container">
          <div class="section-head"><h2>${T.related}</h2></div>
          <div class="carousel" id="related">
            <button class="carousel-btn prev" type="button" aria-label="${ui.t('common.carousel.prev')}">${ui.icon('chevron-left')}</button>
            <div class="carousel-track">${related()
              .map((x) => ui.productCard(x, 'full'))
              .join('')}</div>
            <button class="carousel-btn next" type="button" aria-label="${ui.t('common.carousel.next')}">${ui.icon('chevron-right')}</button>
          </div>
        </div>
      </section>`;
  }

  const stickyBuy = () =>
    out
      ? ''
      : `<div class="sticky-buy" id="sticky-buy"><div><small class="muted">${ui.esc(p.name)}</small><span class="price">${ui.price(p.price)}</span></div><button class="btn btn-primary btn-sm" type="button" data-add-cart="${p.id}">${ui.icon('cart')} ${T.buy.toCart}</button></div>`;

  function render() {
    const r = db.products.rating(p);
    const fav = db.favs.has(p.id);
    root.innerHTML = `
      <div class="container">
        ${breadcrumbs()}
        <section class="pp-top">${gallery.html(fav)}${buyBlock(r, fav)}</section>
        <section class="pp-details">${tabsPanel(r)}${info.aside(p)}</section>
      </div>
      ${relatedSection()}
      ${stickyBuy()}`;

    ui.carousel(document.getElementById('related'));
    bind();
    ui.tabsInk(root.querySelector('.pp-tabs-panel .tabs'));
    seo.jsonLd(p, r, gallery.images);
  }

  function rerenderReviews() {
    ui.transition(() => {
      const r = db.products.rating(p);
      document.getElementById('reviews').innerHTML = App.productReviews.html(p);
      document.querySelector('[data-tab="reviews"]').textContent = ui.t('product.reviewsTab', { count: r.count });
      document.querySelector('.pp-rating').innerHTML = ratingHtml(r);
      ui.tabsInk(document.querySelector('.pp-tabs-panel .tabs'));
      seo.jsonLd(p, r, gallery.images);
    });
  }
  const openReviewForm = () => App.productReviewForm.open(p, rerenderReviews);

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

  function bindQuantity() {
    const qtyInput = document.getElementById('qty');
    const buy = document.getElementById('buy-btn');
    const setQty = (v) => {
      qty = Math.max(1, Math.min(p.stock, v | 0 || 1));
      if (qtyInput) qtyInput.value = qty;
      buy.dataset.qty = qty;
    };
    ui.$$('[data-q]').forEach((b) => b.addEventListener('click', () => setQty(qty + +b.dataset.q)));
    if (qtyInput) qtyInput.addEventListener('change', () => setQty(+qtyInput.value));
  }

  function bindTabs() {
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
  }

  function bindStickyBuy() {
    const sticky = document.getElementById('sticky-buy');
    if (!sticky || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([en]) => sticky.classList.toggle('is-visible', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(
      document.getElementById('pp-buy')
    );
  }

  function bind() {
    bindQuantity();
    gallery.bind();
    bindTabs();
    App.productReviews.bind(document.getElementById('reviews'), p, rerenderReviews, openReviewForm);
    bindStickyBuy();

    const hash = location.hash.slice(1);
    if (TABS.some(([k]) => k === hash)) switchTab(hash);

    if (ui.qs('review') === '1') {
      switchTab('reviews');
      setTimeout(openReviewForm, 300);
    }
  }

  gallery.load().then(render);
});
