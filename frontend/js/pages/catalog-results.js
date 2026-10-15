(() => {
  const { ui, db } = App;
  const { FLAGS, LIST_PARAMS } = App.catalogState;
  const $ = (id) => document.getElementById(id);

  function crumbs(state) {
    const items = [`<a href="${ui.page('home')}">${ui.t('common.breadcrumbs.home')}</a>`];
    const c = state.cat && db.categories.get(state.cat);
    const s = c && state.sub && db.categories.sub(state.cat, state.sub);
    const catalog = ui.t('common.breadcrumbs.catalog');
    items.push(c || state.flag ? `<a href="${ui.page('catalog')}">${catalog}</a>` : `<span>${catalog}</span>`);
    if (c) items.push(s ? `<a href="${ui.catalogUrl({ cat: c.id })}">${ui.esc(c.name)}</a>` : `<span>${ui.esc(c.name)}</span>`);
    if (s) items.push(`<span>${ui.esc(s.name)}</span>`);
    if (state.flag) items.push(`<span>${FLAGS[state.flag]}</span>`);
    $('crumbs').innerHTML = items.join('<span aria-hidden="true">/</span>');
  }

  function chips(state, total, range) {
    const list = [];
    if (state.q) list.push(['q', `«${state.q}»`]);
    if (state.tag) list.push(['tag', '#' + state.tag]);
    if (state.min != null || state.max != null) {
      list.push([
        'price',
        `${ui.price(state.min != null ? state.min : range.min)} – ${ui.price(state.max != null ? state.max : range.max)}`
      ]);
    }
    LIST_PARAMS.forEach((k) => state[k].forEach((v) => list.push([k + ':' + v, v])));

    const chip = ([k, v]) =>
      `<span class="chip">${ui.esc(v)}<button type="button" data-chip="${ui.esc(k)}" aria-label="${ui.t('catalog.removeFilter')}">${ui.icon('x')}</button></span>`;
    $('found').innerHTML =
      `<span>${ui.t('catalog.found', { count: total })}</span>` +
      list.map(chip).join('') +
      (list.length > 1 ? `<button class="btn-ghost chip-reset" type="button" data-chip="all">${ui.t('catalog.resetAll')}</button>` : '');
  }

  function pagination(state, pages) {
    const last = state.page + state.more;
    let html = '';
    if (pages > 1) {
      if (last < pages) html += `<button class="btn btn-secondary btn-sm" type="button" data-more>${ui.t('catalog.more')}</button>`;
      html += '<div class="pages">';
      for (let i = 1; i <= pages; i++) {
        html += `<button type="button" data-page="${i}" class="${i >= state.page && i <= last ? 'is-active' : ''}" aria-label="${ui.t('catalog.page', { page: i })}">${i}</button>`;
      }
      if (last < pages)
        html += `<button type="button" data-page="${last + 1}" aria-label="${ui.t('catalog.nextPage')}">${ui.icon('chevron-right')}</button>`;
      html += '</div>';
    }
    $('pagination').innerHTML = html;
  }

  App.catalogResults = { crumbs, chips, pagination };
})();
