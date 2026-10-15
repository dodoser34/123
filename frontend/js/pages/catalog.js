document.addEventListener('app:ready', () => {
  const { ui } = App;
  const store = App.catalogState;
  const results = App.catalogResults;
  const PER_PAGE = 12;
  const $ = (id) => document.getElementById(id);
  const state = {};

  const readState = () => Object.assign(state, store.read());

  function writeState(push = true, animate = push) {
    history[push ? 'pushState' : 'replaceState'](null, '', location.pathname + store.toQuery(state));
    render(animate);
  }

  const reset = (patch, push = true) => {
    Object.assign(state, { page: 1, more: 0 }, patch);
    writeState(push);
  };

  const render = (animate) => (animate ? ui.transition(draw) : draw());

  function drawHead() {
    const title = store.title(state);
    document.title = title + ' — ' + App.config.shopName;
    $('cat-title').textContent = title;
    $('cat-lead').textContent = state.q
      ? ui.t('catalog.leadSearch', { query: state.q })
      : state.tag
        ? ui.t('catalog.leadTag', { tag: state.tag })
        : ui.t('catalog.lead');
    if (document.activeElement !== $('q')) $('q').value = state.q;
    results.crumbs(state);
  }

  function drawGrid(shown) {
    const grid = $('grid');
    grid.className = 'products-grid' + (state.view === 'list' ? ' is-list' : state.view === 'large' ? ' is-large' : '');
    grid.innerHTML = shown.length
      ? shown.map((p) => ui.productCard(p, 'full')).join('')
      : ui.emptyState({
          title: ui.t('catalog.empty.title'),
          text: ui.t('catalog.empty.text'),
          actions:
            (state.q && (state.cat || state.flag)
              ? `<a class="btn btn-primary" href="${ui.catalogUrl({ q: state.q })}">${ui.t('catalog.empty.searchEverywhere')}</a>`
              : '') + `<a class="btn btn-secondary" href="${ui.page('catalog')}">${ui.t('catalog.empty.reset')}</a>`
        });
    ui.nameCards(grid);
  }

  function draw() {
    drawHead();
    const base = store.baseList(state);
    const range = store.priceRange(base);
    App.catalogFilters.render(state, base);
    App.catalogToolbar.render(state, range, reset);

    const list = store.filtered(state);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    results.chips(state, list.length, range);
    drawGrid(list.slice((state.page - 1) * PER_PAGE, (state.page + state.more) * PER_PAGE));
    results.pagination(state, pages);
  }

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
      store.saveView(state.view);
      return render(true);
    }
    const page = t.closest('#pagination [data-page]');
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

  $('q').addEventListener(
    'input',
    ui.debounce(() => reset({ q: $('q').value.trim() }, false), 300)
  );
  $('cat-search').addEventListener('submit', (e) => {
    e.preventDefault();
    reset({ q: $('q').value.trim() });
  });

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
