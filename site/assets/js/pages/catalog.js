/* Каталог: категории, поиск, фильтры (бренд, «для чего», цена, тег), сортировка, страницы.
   Все фильтры хранятся в адресе страницы — ссылкой на подборку можно поделиться. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const PER_PAGE = 9;
  const SORTS = {
    popular: 'Популярные',
    'price-asc': 'Сначала дешевле',
    'price-desc': 'Сначала дороже',
    new: 'Новинки',
    rating: 'По рейтингу'
  };
  const FLAGS = { new: 'Новинки', sale: 'Скидки' };
  const VIEW_KEY = 'kbch.v1.view';
  const LIST_PARAMS = ['brand', 'purpose']; // параметры-списки: brand=A,B

  const $ = (id) => document.getElementById(id);
  const state = {};

  /* ---------- Адрес страницы ⇄ состояние ---------- */
  function readState() {
    const p = new URLSearchParams(location.search);
    Object.assign(state, {
      cat: p.get('cat') || '',
      sub: p.get('sub') || '',
      flag: p.get('flag') || '',
      q: p.get('q') || '',
      tag: p.get('tag') || '',
      sort: SORTS[p.get('sort')] ? p.get('sort') : 'popular',
      min: p.get('min') ? +p.get('min') : null,
      max: p.get('max') ? +p.get('max') : null,
      page: Math.max(1, +(p.get('page') || 1)),
      more: +(p.get('more') || 0)
    });
    LIST_PARAMS.forEach((k) => (state[k] = p.get(k) ? p.get(k).split(',') : []));
    let saved = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch (e) {
      /* браузер запретил хранилище */
    }
    state.view = saved || 'grid';
  }

  /** Записать фильтры в адрес страницы и перерисовать. animate — плавно (карточки переезжают на новые места). */
  function writeState(push = true, animate = push) {
    const p = new URLSearchParams();
    ['cat', 'sub', 'flag', 'q', 'tag'].forEach((k) => state[k] && p.set(k, state[k]));
    if (state.sort !== 'popular') p.set('sort', state.sort);
    if (state.min != null) p.set('min', state.min);
    if (state.max != null) p.set('max', state.max);
    LIST_PARAMS.forEach((k) => state[k].length && p.set(k, state[k].join(',')));
    if (state.page > 1) p.set('page', state.page);
    if (state.more) p.set('more', state.more);
    history[push ? 'pushState' : 'replaceState'](null, '', location.pathname + (p.toString() ? '?' + p : ''));
    render(animate);
  }

  /** Изменить фильтры и вернуться на первую страницу. */
  const reset = (patch, push = true) => {
    Object.assign(state, { page: 1, more: 0 }, patch);
    writeState(push);
  };

  /* ---------- Фильтрация ---------- */
  /** Товары с учётом категории, флага, поиска и тега — до фильтров цены, бренда и назначения. */
  function baseList() {
    let list = db.products.visible();
    if (state.cat) list = list.filter((p) => p.category === state.cat);
    if (state.sub) list = list.filter((p) => p.sub === state.sub);
    if (state.flag === 'new') list = list.filter((p) => p.isNew);
    if (state.flag === 'sale') list = list.filter((p) => p.oldPrice > p.price);
    if (state.tag) list = list.filter((p) => p.tags.includes(state.tag));
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter((p) => db.products.searchText(p).includes(q));
    }
    return list;
  }

  function filtered() {
    let list = baseList();
    if (state.min != null) list = list.filter((p) => p.price >= state.min);
    if (state.max != null) list = list.filter((p) => p.price <= state.max);
    if (state.brand.length) list = list.filter((p) => state.brand.includes(p.brand));
    if (state.purpose.length) list = list.filter((p) => p.purpose.some((x) => state.purpose.includes(x)));

    const ratings = new Map(list.map((p) => [p.id, db.products.rating(p)]));
    const score = (p) => (p.isHit ? 3 : 0) + (p.isPopular ? 2 : 0) + ratings.get(p.id).count / 10;
    const sorters = {
      popular: (a, b) => score(b) - score(a),
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      new: (a, b) => b.isNew - a.isNew || b.createdAt.localeCompare(a.createdAt),
      rating: (a, b) => ratings.get(b.id).rating - ratings.get(a.id).rating
    };
    // товары не в наличии — в конец
    return list.sort((a, b) => (a.stock <= 0) - (b.stock <= 0) || sorters[state.sort](a, b));
  }

  /* ---------- Отрисовка ---------- */
  function title() {
    if (state.flag) return FLAGS[state.flag];
    const sub = state.sub && db.categories.sub(state.cat, state.sub);
    if (sub) return sub.name;
    const cat = state.cat && db.categories.get(state.cat);
    if (cat) return cat.name;
    return state.q || state.tag ? 'Поиск' : 'Каталог';
  }

  function renderCrumbs() {
    const crumbs = ['<a href="index.html">Главная</a>'];
    const c = state.cat && db.categories.get(state.cat);
    const s = c && state.sub && db.categories.sub(state.cat, state.sub);
    crumbs.push(c || state.flag ? '<a href="catalog.html">Каталог</a>' : '<span>Каталог</span>');
    if (c) crumbs.push(s ? `<a href="${ui.catalogUrl({ cat: c.id })}">${ui.esc(c.name)}</a>` : `<span>${ui.esc(c.name)}</span>`);
    if (s) crumbs.push(`<span>${ui.esc(s.name)}</span>`);
    if (state.flag) crumbs.push(`<span>${FLAGS[state.flag]}</span>`);
    $('crumbs').innerHTML = crumbs.join('<span aria-hidden="true">/</span>');
  }

  function renderChips(total, range) {
    const chips = [];
    if (state.q) chips.push(['q', `«${state.q}»`]);
    if (state.tag) chips.push(['tag', '#' + state.tag]);
    if (state.min != null || state.max != null) {
      chips.push([
        'price',
        `${ui.price(state.min != null ? state.min : range.min)} – ${ui.price(state.max != null ? state.max : range.max)}`
      ]);
    }
    LIST_PARAMS.forEach((k) => state[k].forEach((v) => chips.push([k + ':' + v, v])));
    $('found').innerHTML =
      `<span>Найдено: ${total} ${ui.plural(total, 'товар', 'товара', 'товаров')}</span>` +
      chips
        .map(
          ([k, v]) =>
            `<span class="chip">${ui.esc(v)}<button type="button" data-chip="${ui.esc(k)}" aria-label="Убрать фильтр">${ui.icon('x')}</button></span>`
        )
        .join('') +
      (chips.length > 1 ? '<button class="btn-ghost chip-reset" type="button" data-chip="all">Сбросить всё</button>' : '');
  }

  function renderPagination(pages) {
    const last = state.page + state.more;
    let html = '';
    if (pages > 1) {
      if (last < pages) html += '<button class="btn btn-secondary btn-sm" type="button" data-more>Показать ещё</button>';
      html += '<div class="pages">';
      for (let i = 1; i <= pages; i++) {
        html += `<button type="button" data-page="${i}" class="${i >= state.page && i <= last ? 'is-active' : ''}" aria-label="Страница ${i}">${i}</button>`;
      }
      if (last < pages)
        html += `<button type="button" data-page="${last + 1}" aria-label="Следующая страница">${ui.icon('chevron-right')}</button>`;
      html += '</div>';
    }
    $('pagination').innerHTML = html;
  }

  const render = (animate) => (animate ? ui.transition(draw) : draw());

  function draw() {
    const t = title();
    document.title = t + ' — ' + App.config.shopName;
    $('cat-title').textContent = t;
    $('cat-lead').textContent = state.q
      ? `Результаты по запросу «${state.q}»`
      : state.tag
        ? `Товары с тегом #${state.tag}`
        : 'Выберите категорию и найдите то, что подходит именно вам.';
    if (document.activeElement !== $('q')) $('q').value = state.q;
    renderCrumbs();

    const prices = baseList().map((p) => p.price);
    const range = prices.length
      ? { min: Math.floor(Math.min(...prices) / 100) * 100, max: Math.ceil(Math.max(...prices) / 100) * 100 }
      : { min: 0, max: 0 };
    App.catalogFilters.render({ state, FLAGS, base: baseList() });
    App.catalogToolbar.render({ state, SORTS, reset }, range);

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    const shown = list.slice((state.page - 1) * PER_PAGE, (state.page + state.more) * PER_PAGE);
    renderChips(list.length, range);

    const grid = $('grid');
    grid.className = 'products-grid' + (state.view === 'list' ? ' is-list' : state.view === 'large' ? ' is-large' : '');
    grid.innerHTML = shown.length
      ? shown.map((p) => ui.productCard(p, 'full')).join('')
      : ui.emptyState({
          title: 'Ничего не найдено',
          text: 'Попробуйте изменить запрос или сбросить фильтры.',
          actions:
            (state.q && (state.cat || state.flag)
              ? `<a class="btn btn-primary" href="${ui.catalogUrl({ q: state.q })}">Искать во всём каталоге</a>`
              : '') + '<a class="btn btn-secondary" href="catalog.html">Сбросить фильтры</a>'
        });
    ui.nameCards(grid);
    renderPagination(pages);
  }

  /* ---------- События ---------- */
  function onChip(key) {
    if (key === 'all') reset({ q: '', tag: '', min: null, max: null, brand: [], purpose: [] });
    else if (key === 'q') reset({ q: '' });
    else if (key === 'tag') reset({ tag: '' });
    else if (key === 'price') reset({ min: null, max: null });
    else {
      const [k, ...rest] = key.split(':');
      const value = rest.join(':');
      reset({ [k]: state[k].filter((v) => v !== value) });
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const dropdown = t.closest('.dropdown');
    ui.$$('.dropdown.is-open').forEach((d) => d !== dropdown && d.classList.remove('is-open'));
    if (t.closest('.dropdown-btn') && dropdown) {
      dropdown.classList.toggle('is-open');
      return;
    }
    const nav = t.closest('a[data-nav]');
    if (nav) {
      e.preventDefault();
      closeAside();
      const p = new URL(nav.href).searchParams;
      reset({ cat: p.get('cat') || '', sub: p.get('sub') || '', flag: p.get('flag') || '', brand: [], purpose: [] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (t.closest('[data-toggle]')) return t.closest('.cat-group').classList.toggle('is-collapsed');
    const sort = t.closest('[data-sort]');
    if (sort) return reset({ sort: sort.dataset.sort });
    const view = t.closest('[data-view]');
    if (view) {
      state.view = view.dataset.view;
      try {
        localStorage.setItem(VIEW_KEY, state.view);
      } catch (er) {
        /* браузер запретил хранилище */
      }
      return render(true);
    }
    const page = t.closest('[data-page]');
    if (page) {
      state.page = +page.dataset.page;
      state.more = 0;
      writeState();
      $('grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (t.closest('[data-more]')) {
      state.more++;
      return writeState(false, true);
    }
    const chip = t.closest('[data-chip]');
    if (chip) return onChip(chip.dataset.chip);
    if (t.closest('#open-filters')) openAside();
    if (t.closest('[data-close-aside]') || t.id === 'backdrop') closeAside();
  });

  document.addEventListener('change', (e) => {
    const key = e.target.dataset.filter;
    if (!key) return;
    const value = e.target.value;
    reset({ [key]: e.target.checked ? state[key].concat(value) : state[key].filter((x) => x !== value) });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ui.$$('.dropdown.is-open').forEach((d) => d.classList.remove('is-open'));
    if ($('aside').classList.contains('is-open')) closeAside();
  });

  // при наборе текста адрес заменяется, а не добавляется в историю на каждую букву
  $('q').addEventListener(
    'input',
    ui.debounce(() => reset({ q: $('q').value.trim() }, false), 300)
  );
  $('cat-search').addEventListener('submit', (e) => {
    e.preventDefault();
    reset({ q: $('q').value.trim() });
  });

  function openAside() {
    $('aside').classList.add('is-open');
    $('backdrop').classList.add('is-open');
    document.body.classList.add('no-scroll');
  }
  function closeAside() {
    $('aside').classList.remove('is-open');
    $('backdrop').classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  window.addEventListener('popstate', () => {
    readState();
    render(true);
  });
  document.addEventListener('store:change', (e) => {
    if (['products', 'categories', 'reviews', 'reset'].includes(e.detail.type)) render();
  });

  readState();
  render();
});
