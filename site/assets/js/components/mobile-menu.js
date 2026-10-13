/* Мобильное меню (полноэкранное, открывается кнопкой ≡). Пересобирается при каждом открытии,
   чтобы кнопка «Войти / имя пользователя» всегда была актуальной. */
(() => {
  const ui = App.ui;
  const base = ui.base;
  let menuEl = null;
  let lastFocus = null;

  function template() {
    const page = document.body.dataset.page;
    const user = App.db.session.user();
    const item = (pageName, href, icon, label) =>
      `<li class="${page === pageName ? 'is-active' : ''}"><a href="${href}">${ui.icon(icon)}${label}</a></li>`;
    return `
      ${ui.decor('branch-bottom-right.png')}
      <div class="mm-head">${ui.logo(false)}<button class="icon-btn mm-close" type="button" aria-label="Закрыть меню">${ui.icon('x')}</button></div>
      <ul class="mm-nav">
        ${item('home', base + 'index.html', 'home', 'Главная')}
        <li class="is-open ${page === 'catalog' ? 'is-active' : ''}">
          <button type="button" aria-expanded="true">${ui.icon('grid')}Каталог${ui.icon('chevron-down', 'chev')}</button>
          <div class="mm-sub">
            <a href="${base}catalog.html">Все товары</a>
            <a href="${ui.catalogUrl({ cat: 'korean-cosmetics' })}">Корейская косметика</a>
            <a href="${ui.catalogUrl({ cat: 'herbs' })}">Травы</a>
            <a href="${ui.catalogUrl({ cat: 'sets' })}">Наборы</a>
            <a href="${ui.catalogUrl({ flag: 'new' })}">Новинки</a>
            <a href="${ui.catalogUrl({ flag: 'sale' })}">Скидки</a>
          </div>
        </li>
        ${item('favorites', base + 'favorites.html', 'heart', 'Избранное')}
        ${item('about', base + 'about.html', 'user', 'О нас')}
        ${item('delivery', base + 'delivery.html', 'truck', 'Доставка и оплата')}
        ${item('', base + 'about.html#contacts', 'mail', 'Контакты')}
      </ul>
      <div class="mm-foot">
        ${
          user
            ? `<a class="btn btn-primary btn-block" href="${base}account.html">${ui.icon('user')}${ui.esc(user.name)}</a>`
            : `<a class="btn btn-primary btn-block" href="${base}login.html">Войти</a>
               <a class="btn btn-secondary btn-block mm-register" href="${base}login.html?mode=register">Регистрация</a>`
        }
      </div>`;
  }

  function build() {
    if (menuEl) menuEl.remove();
    menuEl = document.createElement('div');
    menuEl.className = 'mobile-menu';
    menuEl.setAttribute('role', 'dialog');
    menuEl.setAttribute('aria-modal', 'true');
    menuEl.setAttribute('aria-label', 'Меню');
    menuEl.innerHTML = template();
    document.body.appendChild(menuEl);

    menuEl.querySelector('.mm-close').addEventListener('click', closeMenu);
    menuEl.querySelector('.mm-nav button').addEventListener('click', (e) => {
      const li = e.currentTarget.parentElement;
      li.classList.toggle('is-open');
      e.currentTarget.setAttribute('aria-expanded', li.classList.contains('is-open'));
    });
    menuEl.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeMenu();
    });
    menuEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
      if (e.key === 'Tab') {
        // фокус не выходит за пределы меню
        const focusable = ui.$$('a, button', menuEl);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    let startX = null;
    menuEl.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
    menuEl.addEventListener('touchend', (e) => {
      if (startX != null && e.changedTouches[0].clientX - startX > 80) closeMenu();
      startX = null;
    });
  }

  function openMenu() {
    build();
    lastFocus = document.activeElement;
    requestAnimationFrame(() => menuEl.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    const burger = ui.$('.burger');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    setTimeout(() => menuEl.querySelector('.mm-close').focus(), 50);
  }

  function closeMenu() {
    if (!menuEl) return;
    menuEl.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    const burger = ui.$('.burger');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    if (lastFocus) lastFocus.focus();
  }

  ui.openMenu = openMenu;
})();
