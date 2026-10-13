/* Главная: преимущества, карусели «Популярные» и «Новинки», круги категорий */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;

  document.getElementById('hero-benefits').innerHTML = ui.benefits(true);

  /** Заполнить карусель товарами; пустой раздел (например, когда каталог ещё пуст) скрывается. */
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

  const cats = [
    { icon: 'bottle', name: 'Корейская косметика', href: ui.catalogUrl({ cat: 'korean-cosmetics' }) },
    { icon: 'face', name: 'Уход за кожей', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'face' }) },
    { icon: 'bottle', name: 'Уход за телом', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'body' }) },
    { icon: 'face', name: 'Декоративная косметика', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'makeup' }) },
    { icon: 'leaf', name: 'Травы', href: ui.catalogUrl({ cat: 'herbs' }) },
    { icon: 'hair', name: 'Для волос', href: ui.catalogUrl({ cat: 'korean-cosmetics', sub: 'hair' }) },
    { icon: 'gift', name: 'Подарочные наборы', href: ui.catalogUrl({ cat: 'sets' }) }
  ];
  document.getElementById('cats-row').innerHTML = cats
    .map((c) => `<a class="cat-circle" href="${c.href}">${ui.icon(c.icon)}<span>${c.name}</span></a>`)
    .join('');
  const categoryTrack = document.getElementById('cats-row');
  ui.carousel(categoryTrack, { track: categoryTrack, autoplay: true });

  // товары изменили в админке или в другой вкладке — карусели плавно обновляются без перезагрузки страницы
  document.addEventListener('store:change', (e) => {
    if (['products', 'reset'].includes(e.detail.type)) ui.transition(renderProducts);
  });
});
