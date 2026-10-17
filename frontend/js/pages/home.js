document.addEventListener('app:ready', () => {
  const { ui, db } = App;

  const hero = document.querySelector('.hero-layered');
  if (hero) {
    const background = hero.querySelector('.hero-background');
    const products = hero.querySelector('.hero-products');
    const revealProducts = () => {
      if (!background.complete || !products.complete) return;
      if (!background.naturalWidth || !products.naturalWidth) {
        background.src = 'assets/images/pages/home/hero.jpg';
        products.hidden = true;
        return;
      }
      hero.classList.add('is-ready');
    };
    [background, products].forEach((image) => {
      image.addEventListener('load', revealProducts, { once: true });
      image.addEventListener('error', revealProducts, { once: true });
    });
    revealProducts();
  }

  document.getElementById('hero-benefits').innerHTML = ui.benefits(true);

  const fill = (id, list) => {
    const root = document.getElementById(id);
    root.closest('section').hidden = !list.length;
    root.querySelector('.prev').innerHTML = ui.icon('chevron-left');
    root.querySelector('.next').innerHTML = ui.icon('chevron-right');
    root.querySelector('.carousel-track').innerHTML = list.map((p) => ui.productCard(p, 'compact')).join('');
    ui.carousel(root, { autoplay: true });
  };
  const renderProducts = () => {
    const all = db.products.visible();
    const popular = all.filter((p) => p.isPopular || p.isHit);
    fill('popular', (popular.length ? popular : all).slice(0, 10));
    const fresh = all.filter((p) => p.isNew).concat(all.filter((p) => !p.isNew).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    fill('new', fresh.slice(0, 8));
  };
  renderProducts();

  const names = ui.t('home.categories.items');
  const cats = [
    { icon: 'bottle', href: ui.catalogUrl({ cat: 'korean-cosmetics' }) },
    { icon: 'face', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'face' }) },
    { icon: 'bottle', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'body' }) },
    { icon: 'face', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'makeup' }) },
    { icon: 'leaf', href: ui.catalogUrl({ cat: 'herbs' }) },
    { icon: 'hair', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'hair' }) },
    { icon: 'gift', href: ui.catalogUrl({ cat: 'sets' }) }
  ].map((c, i) => Object.assign(c, { name: names[i] || '' }));
  document.getElementById('cats-row').innerHTML = cats
    .map((c) => `<a class="cat-circle" href="${c.href}">${ui.icon(c.icon)}<span>${c.name}</span></a>`)
    .join('');
  const categoryTrack = document.getElementById('cats-row');
  ui.carousel(categoryTrack, { track: categoryTrack, autoplay: true });

  document.addEventListener('store:change', (e) => {
    if (['products', 'reset'].includes(e.detail.type)) ui.transition(renderProducts);
  });
});
