/* Каталог → боковая панель: дерево категорий, «Новинки», «Скидки», фильтры «Для чего» и «Бренд»
   (с количеством товаров в текущей подборке). */
(() => {
  const { ui, db } = App;
  const $ = (id) => document.getElementById(id);

  /** Флажки фильтра: значения и количество товаров с ними (в текущей категории). */
  function checkboxFilter(state, title, key, values) {
    if (values.length < 2) return '';
    return `
      <div class="aside-filter">
        <h4>${title}</h4>
        ${values
          .map(
            ([value, count]) =>
              `<label class="check"><input type="checkbox" value="${ui.esc(value)}" data-filter="${key}" ${state[key].includes(value) ? 'checked' : ''}> ${ui.esc(value)} <small>(${count})</small></label>`
          )
          .join('')}
      </div>`;
  }

  function counts(list, getValues) {
    const map = new Map();
    list.forEach((p) => getValues(p).forEach((v) => map.set(v, (map.get(v) || 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }

  function render(ctx) {
    const { state, FLAGS, base } = ctx;
    const link = (params) => ui.catalogUrl(params);
    const group = (c) => `
      <div class="cat-group">
        <div class="cat-group-head${state.cat === c.id && !state.sub ? ' is-active' : ''}">
          <a href="${link({ cat: c.id })}" data-nav>${ui.esc(c.name)}</a>
          ${c.subs.length ? `<button type="button" data-toggle aria-label="Свернуть">${ui.icon('chevron-up')}</button>` : ''}
        </div>
        ${
          c.subs.length
            ? `<div class="cat-sub">${c.subs
                .map(
                  (s) =>
                    `<a href="${link({ cat: c.id, sub: s.id })}" data-nav class="${state.cat === c.id && state.sub === s.id ? 'is-active' : ''}">${ui.esc(s.name)}</a>`
                )
                .join('')}</div>`
            : ''
        }
      </div>`;
    const flagGroup = (flag) =>
      `<div class="cat-group"><div class="cat-group-head${state.flag === flag ? ' is-active' : ''}"><a href="${link({ flag })}" data-nav>${FLAGS[flag]}</a></div></div>`;

    $('aside').innerHTML = `
      <div class="aside-close"><b>Фильтры</b><button class="icon-btn" type="button" data-close-aside aria-label="Закрыть">${ui.icon('x')}</button></div>
      <a class="cat-all${!state.cat && !state.flag ? ' is-active' : ''}" href="${link()}" data-nav>Все товары</a>
      ${db.categories.all().map(group).join('')}
      ${flagGroup('new')}
      ${flagGroup('sale')}
      ${checkboxFilter(state, 'Для чего', 'purpose', counts(base, (p) => p.purpose).slice(0, 12))}
      ${checkboxFilter(
        state,
        'Бренд',
        'brand',
        counts(base, (p) => [p.brand])
      )}`;
  }

  App.catalogFilters = { render };
})();
