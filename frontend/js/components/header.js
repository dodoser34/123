(() => {
  const ui = App.ui;
  const base = ui.base;
  let listenersReady = false;

  function catalogMenu() {
    return App.db.categories
      .all()
      .map(
        (c) => `
        <div>
          <h4><a href="${ui.catalogUrl({ cat: c.id })}">${ui.esc(c.name)}</a></h4>
          ${c.subs.map((s) => `<a href="${ui.catalogUrl({ cat: c.id, sub: s.id })}">${ui.esc(s.name)}</a>`).join('')}
          ${c.subs.length ? '' : `<a href="${ui.catalogUrl({ flag: 'new' })}">${ui.t('common.flags.new')}</a><a href="${ui.catalogUrl({ flag: 'sale' })}">${ui.t('common.flags.sale')}</a>`}
        </div>`
      )
      .join('');
  }

  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const page = document.body.dataset.page;
    const user = App.db.session.user();
    const active = (on) => (on ? ' class="is-active"' : '');
    const T = ui.t('common.header');

    el.className = 'site-header' + (page === 'home' ? ' is-transparent' : '');
    el.innerHTML = `
      <div class="container header-inner">
        ${ui.logo(true)}
        <nav class="main-nav" aria-label="${T.menuLabel}">
          <div class="nav-drop${page === 'catalog' ? ' is-active' : ''}">
            <a class="nav-drop-link" href="${ui.page('catalog')}" aria-haspopup="true">${T.catalog} ${ui.icon('chevron-down')}</a>
            <div class="nav-menu">${catalogMenu()}</div>
          </div>
          <a href="${ui.page('about')}"${active(page === 'about')}>${T.about}</a>
        </nav>
        <form class="header-search" role="search" action="${ui.page('catalog')}">
          ${ui.icon('search')}
          <label class="sr-only" for="hs-input">${T.searchLabel}</label>
          <input id="hs-input" name="q" type="search" placeholder="${T.searchPlaceholder}" autocomplete="off">
          <div class="search-suggest" role="listbox"></div>
        </form>
        <button class="header-cancel" type="button">${T.cancel}</button>
        <div class="header-actions">
          <button class="icon-btn mobile-search-btn" type="button" aria-label="${T.searchButton}">${ui.icon('search')}</button>
          <a class="icon-btn hide-m" href="${ui.page('favorites')}" aria-label="${T.favorites}">${ui.icon('heart')}<span class="badge-count" data-fav-count></span></a>
          <a class="icon-btn hide-m" href="${ui.page(user ? 'account' : 'login')}" aria-label="${user ? T.account : T.login}" title="${user ? ui.esc(user.name) : T.login}">${ui.icon('user')}</a>
          <a class="icon-btn" href="${ui.page('cart')}" aria-label="${T.cart}">${ui.icon('bag')}<span class="badge-count" data-cart-count></span></a>
          <button class="icon-btn burger" type="button" aria-label="${T.openMenu}" aria-expanded="false">${ui.icon('menu')}</button>
        </div>
      </div>`;

    updateCounters();
    initSearch(el);
    const inner = el.querySelector('.header-inner');
    el.querySelector('.burger').addEventListener('click', () => ui.openMenu());
    el.querySelector('.mobile-search-btn').addEventListener('click', () => {
      inner.classList.add('is-searching');
      el.querySelector('#hs-input').focus();
    });
    el.querySelector('.header-cancel').addEventListener('click', () => inner.classList.remove('is-searching'));

    if (!listenersReady) {
      listenersReady = true;
      const onScroll = () => {
        const header = document.getElementById('site-header');
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      document.addEventListener('click', (e) => {
        const form = document.querySelector('.header-search');
        if (form && !form.contains(e.target)) form.querySelector('.search-suggest').classList.remove('is-open');
      });
    }
  }

  function initSearch(header) {
    const form = header.querySelector('.header-search');
    const input = form.querySelector('input');
    const box = form.querySelector('.search-suggest');
    let focus = -1;

    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        box.classList.remove('is-open');
        return;
      }
      const found = App.db.products
        .visible()
        .filter((p) => App.db.products.searchText(p).includes(q))
        .slice(0, 6);
      box.innerHTML = found.length
        ? found
            .map(
              (p) =>
                `<a href="${ui.productUrl(p)}" role="option">${ui.img(p.images[0], '')}<span>${ui.esc(p.name)}</span><span class="price">${ui.price(p.price)}</span></a>`
            )
            .join('') + `<a href="${ui.catalogUrl({ q: input.value.trim() })}" role="option"><b>${ui.t('common.header.allResults')}</b></a>`
        : `<div class="empty">${ui.t('common.header.nothingFound')}</div>`;
      box.classList.add('is-open');
      focus = -1;
    };

    input.addEventListener('input', ui.debounce(render, 150));
    input.addEventListener('focus', render);
    input.addEventListener('keydown', (e) => {
      const links = ui.$$('a', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!links.length) return;
        focus = (focus + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach((l, i) => l.classList.toggle('is-focus', i === focus));
      } else if (e.key === 'Enter' && focus >= 0) {
        e.preventDefault();
        links[focus].click();
      } else if (e.key === 'Escape') {
        box.classList.remove('is-open');
      }
    });
    form.addEventListener('submit', (e) => {
      if (!input.value.trim()) e.preventDefault();
    });
  }

  function updateCounters() {
    const set = (selector, n) =>
      ui.$$(selector).forEach((b) => {
        b.textContent = n || '';
        b.dataset.count = n;
      });
    set('[data-cart-count]', App.db.cart.count());
    set('[data-fav-count]', App.db.favs.all().length);
  }

  ui.updateCounters = updateCounters;
  ui.renderHeader = renderHeader;
})();
