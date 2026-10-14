/* Каталог → состояние: фильтры хранятся в адресе страницы (ссылкой на подборку можно поделиться),
   отбор и сортировка товаров по этим фильтрам. */
(() => {
  const { db, ui } = App;
  const SORTS = ui.t('catalog.sorts'); // названия — texts/…/catalog.js
  const FLAGS = ui.t('common.flags');
  const VIEW_KEY = App.storage.P + 'view';
  const TEXT_PARAMS = ['cat', 'sub', 'flag', 'q', 'tag'];
  const LIST_PARAMS = ['brand', 'purpose']; // параметры-списки: brand=A,B

  /* ---------- Адрес страницы ⇄ состояние ---------- */
  function read() {
    const p = new URLSearchParams(location.search);
    const state = {
      sort: SORTS[p.get('sort')] ? p.get('sort') : 'popular',
      min: p.get('min') ? +p.get('min') : null,
      max: p.get('max') ? +p.get('max') : null,
      page: Math.max(1, +(p.get('page') || 1)),
      more: +(p.get('more') || 0),
      view: loadView()
    };
    TEXT_PARAMS.forEach((k) => (state[k] = p.get(k) || ''));
    LIST_PARAMS.forEach((k) => (state[k] = p.get(k) ? p.get(k).split(',') : []));
    return state;
  }

  /** Состояние → строка адреса (только то, что отличается от значений по умолчанию). */
  function toQuery(state) {
    const p = new URLSearchParams();
    TEXT_PARAMS.forEach((k) => state[k] && p.set(k, state[k]));
    if (state.sort !== 'popular') p.set('sort', state.sort);
    if (state.min != null) p.set('min', state.min);
    if (state.max != null) p.set('max', state.max);
    LIST_PARAMS.forEach((k) => state[k].length && p.set(k, state[k].join(',')));
    if (state.page > 1) p.set('page', state.page);
    if (state.more) p.set('more', state.more);
    return p.toString() ? '?' + p : '';
  }

  /* Вид списка (крупно / сетка / список) запоминается в браузере, а не в адресе */
  function loadView() {
    try {
      return localStorage.getItem(VIEW_KEY) || 'grid';
    } catch (e) {
      return 'grid'; // браузер запретил хранилище
    }
  }
  function saveView(view) {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch (e) {
      /* браузер запретил хранилище */
    }
  }

  /* ---------- Отбор и сортировка ---------- */
  /** Товары с учётом категории, флага, поиска и тега — до фильтров цены, бренда и назначения. */
  function baseList(state) {
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

  /** Итоговый список: все фильтры + сортировка. Товары не в наличии — в конце. */
  function filtered(state) {
    let list = baseList(state);
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
    return list.sort((a, b) => (a.stock <= 0) - (b.stock <= 0) || sorters[state.sort](a, b));
  }

  /** Границы ползунка цены, округлённые до сотен. */
  function priceRange(list) {
    const prices = list.map((p) => p.price);
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...prices) / 100) * 100, max: Math.ceil(Math.max(...prices) / 100) * 100 };
  }

  /** Заголовок страницы: подкатегория, категория, «Новинки», «Поиск» или просто «Каталог». */
  function title(state) {
    if (state.flag) return FLAGS[state.flag];
    const sub = state.sub && db.categories.sub(state.cat, state.sub);
    if (sub) return sub.name;
    const cat = state.cat && db.categories.get(state.cat);
    if (cat) return cat.name;
    return ui.t(state.q || state.tag ? 'catalog.searchTitle' : 'catalog.title');
  }

  App.catalogState = { SORTS, FLAGS, LIST_PARAMS, read, toQuery, saveView, baseList, filtered, priceRange, title };
})();
