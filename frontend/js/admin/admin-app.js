/* Админка → каркас: проверка доступа, боковое меню, роутер (переключение разделов по адресу #products, #orders…).
   Разделы лежат в отдельных файлах рядом и регистрируют себя в App.admin.views. */
(() => {
  const A = (App.admin = { views: {}, dirty: false });

  const NAV = [
    ['dashboard', 'dashboard', 'Обзор'],
    ['products', 'package', 'Товары'],
    ['categories', 'folder', 'Категории'],
    ['orders', 'bag', 'Заказы'],
    ['users', 'users', 'Пользователи'],
    ['reviews', 'star', 'Отзывы'],
    ['texts', 'edit', 'Тексты сайта'],
    ['photos', 'image', 'Фото «О нас»'],
    ['settings', 'settings', 'Настройки']
  ];

  document.addEventListener('app:ready', () => {
    const { ui, db } = App;
    const root = document.getElementById('admin-root');
    const B = (A.base = ui.base); // '../'

    /* ---------- Доступ ---------- */
    const me = (A.me = db.session.user());
    if (!me || me.role !== 'admin') {
      root.innerHTML = `
        <div class="login-gate"><div>
          <div style="color:var(--primary);display:flex;justify-content:center;margin-bottom:16px">${ui.logo(true)}</div>
          <h1 style="font-size:40px;margin-bottom:10px">Админ-панель</h1>
          <p class="muted" style="margin-bottom:24px">${me ? 'У вашего аккаунта нет прав администратора.' : 'Войдите под учётной записью администратора.'}</p>
          <a class="btn btn-primary" href="${ui.page('login')}?next=admin/index.html">${me ? 'Войти другим аккаунтом' : 'Войти'}</a>
          <p style="margin-top:16px"><a class="link-arrow" href="${ui.page('home')}">${ui.icon('arrow-left')} На сайт</a></p>
        </div></div>`;
      if (me) root.querySelector('.btn').addEventListener('click', () => db.session.end());
      return;
    }

    /* ---------- Каркас ---------- */
    root.innerHTML = `
      <div class="adm">
        <aside class="adm-side" id="adm-side">
          <a class="logo" href="#dashboard">${ui.logoSvg}<span class="logo-text">${ui.esc(App.config.shopName)}<small>Админ-панель</small></span></a>
          <nav class="adm-nav" id="adm-nav"></nav>
          <div class="adm-side-foot">
            <a href="${ui.page('home')}" target="_blank" rel="noopener">${ui.icon('external')}Открыть сайт</a>
            <button type="button" id="adm-logout">${ui.icon('logout')}Выйти</button>
          </div>
        </aside>
        <div class="adm-main">
          <header class="adm-top">
            <button class="icon-btn adm-burger" type="button" id="adm-burger" aria-label="Меню">${ui.icon('menu')}</button>
            <h1 id="adm-title"></h1>
            <div class="spacer"></div>
            <div class="adm-user"><span class="avatar">${ui.esc(me.name.charAt(0))}</span><span>${ui.esc(me.name)}</span></div>
          </header>
          <div class="adm-content" id="adm-content"></div>
        </div>
      </div>
      <div class="drawer-backdrop" id="adm-backdrop"></div>`;

    A.$content = document.getElementById('adm-content');
    const $title = document.getElementById('adm-title');
    const side = document.getElementById('adm-side'),
      backdrop = document.getElementById('adm-backdrop');
    document.getElementById('adm-burger').onclick = () => {
      side.classList.add('is-open');
      backdrop.classList.add('is-open');
    };
    backdrop.onclick = () => {
      side.classList.remove('is-open');
      backdrop.classList.remove('is-open');
    };
    document.getElementById('adm-logout').onclick = () => {
      db.session.end(); // core/auth-guard.js отправит на страницу входа
    };

    /** Боковое меню; у «Заказов» и «Отзывов» — счётчики того, что ждёт внимания. */
    function renderNav(active) {
      const counts = {
        orders: db.orders.all().filter((o) => o.status === 'new').length,
        reviews: db.reviews.all().filter((r) => r.id.startsWith('r-') && !r.reply && r.status !== 'hidden').length // новые отзывы покупателей без ответа
      };
      document.getElementById('adm-nav').innerHTML = NAV.map(
        ([k, icon, label]) =>
          `<a href="#${k}" class="${k === active ? 'is-active' : ''}"${k === active ? ' aria-current="page"' : ''}>${ui.icon(icon)}${label}${counts[k] ? `<span class="count" title="Ждут внимания">${counts[k]}</span>` : ''}</a>`
      ).join('');
    }

    /* ---------- Общие помощники для разделов ---------- */
    A.setTitle = (t) => {
      $title.textContent = t;
      document.title = t + ' — Админ-панель';
    };
    A.catName = (id) => {
      const c = db.categories.get(id);
      return c ? c.name : '—';
    };
    A.subName = (c, s) => {
      const x = db.categories.sub(c, s);
      return x ? x.name : '';
    };

    /* ---------- Роутер ---------- */
    let currentHash = location.hash;
    A.route = function () {
      const [view, id] = (location.hash.slice(1) || 'dashboard').split('/');
      side.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      A.dirty = false;
      A.$content.onclick = A.$content.onchange = A.$content.oninput = null;
      const fn = A.views[view] || A.views.dashboard;
      fn(id);
      renderNav(view === 'product' ? 'products' : A.views[view] ? view : 'dashboard');
      currentHash = location.hash;
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', () => {
      if (A.dirty && !confirm('Есть несохранённые изменения. Уйти без сохранения?')) {
        history.replaceState(null, '', currentHash);
        return;
      }
      ui.transition(A.route, 'section');
    });
    window.addEventListener('beforeunload', (e) => {
      if (A.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    document.addEventListener('store:change', (e) => {
      if (['orders', 'reviews'].includes(e.detail.type))
        renderNav((location.hash.slice(1) || 'dashboard').split('/')[0].replace('product', 'products'));
    });

    A.route();
  });
})();
