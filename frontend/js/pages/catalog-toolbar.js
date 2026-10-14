/* Каталог → панель над товарами: сортировка, фильтр цены с ползунком, переключатель вида (крупно / сетка / список) */
(() => {
  const { ui } = App;
  const { SORTS } = App.catalogState;
  const T = ui.t('catalog.toolbar');
  const $ = (id) => document.getElementById(id);

  /** range — границы цены в подборке, reset(patch) — применить фильтр. */
  function render(state, range, reset) {
    $('open-filters').innerHTML = `${ui.icon('sliders')} ${T.filters}`;
    $('sort-dd').innerHTML = `
      <button class="dropdown-btn" type="button" aria-haspopup="listbox">${SORTS[state.sort]} ${ui.icon('chevron-down')}</button>
      <div class="dropdown-menu" role="listbox">${Object.entries(SORTS)
        .map(
          ([k, v]) => `<button type="button" data-sort="${k}" class="${k === state.sort ? 'is-active' : ''}" role="option">${v}</button>`
        )
        .join('')}</div>`;
    const hasPrice = state.min != null || state.max != null;
    const min = state.min != null ? state.min : range.min,
      max = state.max != null ? state.max : range.max;
    $('price-dd').innerHTML = `
      <button class="dropdown-btn" type="button">${hasPrice ? `${ui.price(min)} – ${ui.price(max)}` : T.price} ${ui.icon('chevron-down')}</button>
      <div class="dropdown-menu price-pop">
        <div class="range"><div class="track"></div><div class="fill"></div>
          <input type="range" min="${range.min}" max="${range.max}" step="10" value="${min}" data-r="min" aria-label="${T.priceFrom}">
          <input type="range" min="${range.min}" max="${range.max}" step="10" value="${max}" data-r="max" aria-label="${T.priceTo}"></div>
        <div class="form-row"><input class="input" type="number" inputmode="numeric" placeholder="${T.from}" value="${min}" data-p="min" aria-label="${T.priceFrom}"><input class="input" type="number" inputmode="numeric" placeholder="${T.to}" value="${max}" data-p="max" aria-label="${T.priceTo}"></div>
        <div class="actions"><button class="btn btn-ghost" type="button" data-price-reset>${T.reset}</button><button class="btn btn-primary btn-sm" type="button" data-price-apply>${T.apply}</button></div>
      </div>`;
    const pop = $('price-dd');
    const [rMin, rMax] = ui.$$('[data-r]', pop),
      [pMin, pMax] = ui.$$('[data-p]', pop),
      fill = pop.querySelector('.fill');
    const sync = (from) => {
      let a = +rMin.value,
        b = +rMax.value;
      if (from === 'p') {
        a = +pMin.value || range.min;
        b = +pMax.value || range.max;
        rMin.value = a;
        rMax.value = b;
      }
      if (a > b) [a, b] = [b, a];
      if (from !== 'p') {
        pMin.value = a;
        pMax.value = b;
      }
      const span = range.max - range.min || 1;
      fill.style.left = ((a - range.min) / span) * 100 + '%';
      fill.style.right = 100 - ((b - range.min) / span) * 100 + '%';
    };
    [rMin, rMax].forEach((r) => r.addEventListener('input', () => sync('r')));
    [pMin, pMax].forEach((r) => r.addEventListener('input', () => sync('p')));
    sync('r');
    pop.querySelector('[data-price-apply]').onclick = () => {
      let a = +pMin.value,
        b = +pMax.value;
      if (a > b) [a, b] = [b, a];
      reset({ min: a > range.min ? a : null, max: b < range.max ? b : null });
    };
    pop.querySelector('[data-price-reset]').onclick = () => reset({ min: null, max: null });

    const views = [
      ['large', 'grid-large', T.views.large],
      ['grid', 'grid', T.views.grid],
      ['list', 'list', T.views.list]
    ];
    $('view-switch').innerHTML = views
      .map(
        ([k, ic, label]) =>
          `<button type="button" class="${k === state.view ? 'is-active' : ''} ${k === 'large' ? 'vs-large' : ''}" data-view="${k}" aria-label="${label}" aria-pressed="${k === state.view}">${ui.icon(ic)}</button>`
      )
      .join('');
  }

  App.catalogToolbar = { render };
})();
