/* Админка → настройки: экспорт, импорт, сброс */
(() => {
  const { ui, db } = App;
  const A = App.admin;

  /* Что настроено на сервере (deploy/.env): почта, вход через Google, способы оплаты. Сами секреты сервер не присылает. */
  async function renderSystem() {
    const box = document.getElementById('system');
    let s;
    try {
      s = await App.api.get('/admin/system');
    } catch (e) {
      if (box) box.querySelector('p').textContent = 'Не удалось получить настройки сервера.';
      return;
    }
    if (!box || !box.isConnected) return;
    const row = (ok, title, note) =>
      `<li style="display:flex;gap:8px;align-items:flex-start;margin:6px 0">
        <span style="color:var(${ok ? '--sage' : '--danger'})">${ui.icon(ok ? 'check' : 'x')}</span>
        <span><b>${ui.esc(title)}</b>${note ? `<br><span class="muted">${ui.esc(note)}</span>` : ''}</span>
      </li>`;
    const pays = s.payments
      .filter((p) => p.enabled)
      .map((p) => row(!p.missing.length, 'Оплата: ' + p.title, p.missing.length ? 'Заполните в настройках сервера: ' + p.missing.join(', ') : 'готово'));
    box.innerHTML = `
      <h3>Готовность к запуску</h3>
      <p class="muted" style="margin-bottom:8px">Режим сервера: <b>${s.environment === 'production' ? 'рабочий' : 'разработка'}</b>. Настройки меняются в файле <code>deploy/.env</code> на сервере (docs/11-Бэкенд-и-деплой.md).</p>
      <ul style="list-style:none;padding:0;margin:0">
        ${row(s.email.ready, 'Письма с кодами', s.email.ready ? 'отправляются через SMTP' : 'не настроены — коды пишутся только в журнал сервера (SMTP_USER, SMTP_PASSWORD)')}
        ${row(s.google, 'Вход через Google', s.google ? 'включён' : 'не настроен (необязательно): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET')}
        ${pays.join('')}
        ${s.problems.map((p) => row(false, p.split(':')[0], p.split(':').slice(1).join(':').trim())).join('')}
      </ul>`;
  }

  function settings() {
    A.setTitle('Настройки');
    const kb = Math.round(db.usage() / 1024);
    if (App.remote.enabled) {
      // данные на сервере: сброс и импорт отключены, резервную копию делает сервер (бэкап PostgreSQL)
      A.$content.innerHTML = `
        <section class="adm-card adm-card-pad">
          <h3>Данные магазина</h3>
          <p class="muted" style="margin-bottom:16px">Сайт работает с сервером: товары, заказы, отзывы и аккаунты хранятся в базе PostgreSQL и общие для всех посетителей.
            Резервные копии базы делаются на сервере (см. docs/11-Бэкенд-и-деплой.md). Здесь можно скачать текущие данные в JSON.</p>
          <button class="btn btn-secondary btn-sm" type="button" id="exp">${ui.icon('upload')} Экспорт JSON</button>
        </section>
        <section class="adm-card adm-card-pad" id="system" style="margin-top:16px">
          <h3>Готовность к запуску</h3>
          <p class="muted">Проверяем настройки сервера…</p>
        </section>`;
      renderSystem();
    } else {
      A.$content.innerHTML = `
      <div class="adm-grid-2">
        <section class="adm-card adm-card-pad">
          <h3>Данные магазина</h3>
          <p class="muted" style="margin-bottom:16px">Данные сохраняются в этом браузере. Занято: <b>${kb} КБ</b> из ~5 000 КБ. Для общего каталога и заказов подключите API в <code>env.js</code>.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" type="button" id="exp">${ui.icon('upload')} Экспорт JSON</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer">${ui.icon('folder')} Импорт JSON<input type="file" id="imp" accept="application/json" hidden></label>
          </div>
        </section>
        <section class="adm-card adm-card-pad">
          <h3>Сброс</h3>
          <p class="muted" style="margin-bottom:16px">${App.extensions.resetText || 'Очистить товары, отзывы и заказы и вернуть стартовые категории. Зарегистрированные покупатели и администраторы сохранятся.'}</p>
          <button class="btn btn-danger btn-sm" type="button" id="reset">${ui.icon('refresh')} ${App.extensions.resetLabel || 'Очистить магазин'}</button>
        </section>
      </div>`;
    }
    A.$content.onclick = async (e) => {
      if (e.target.closest('#exp')) {
        const data = {
          products: db.products.all(),
          categories: db.categories.all(),
          orders: db.orders.all(),
          reviews: db.reviews.all(),
          exportedAt: new Date().toISOString()
        };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = 'kbch-data-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      if (
        e.target.closest('#reset') &&
        (await ui.confirm('Сбросить товары, категории и отзывы к исходным? Заказы будут удалены.', 'Сбросить'))
      ) {
        db.reset();
        ui.toast({ title: 'Данные сброшены' });
        A.route();
      }
    };
    A.$content.onchange = (e) => {
      if (e.target.id !== 'imp' || !e.target.files[0]) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!Array.isArray(d.products) || !Array.isArray(d.categories)) throw new Error('format');
          const { KEYS, write } = App.storage;
          write(KEYS.products, d.products.map(db.products.normalize));
          write(KEYS.categories, d.categories);
          if (Array.isArray(d.orders)) write(KEYS.orders, d.orders);
          if (Array.isArray(d.reviews)) write(KEYS.reviews, d.reviews);
          ui.toast({ title: 'Данные импортированы', text: d.products.length + ' товаров' });
          A.route();
        } catch (er) {
          ui.toast({ title: 'Неверный файл', text: 'Ожидается экспорт из этой админки', icon: 'x' });
        }
      };
      r.readAsText(e.target.files[0]);
    };
    A.$content.oninput = null;
  }

  A.views.settings = settings;
})();
