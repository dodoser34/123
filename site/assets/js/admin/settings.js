/* Админка → настройки: экспорт, импорт, сброс */
(() => {
  const { ui, db } = App;
  const A = App.admin;

  function settings() {
    A.setTitle('Настройки');
    const kb = Math.round(db.usage() / 1024);
    A.$content.innerHTML = `
      <div class="adm-grid-2">
        <section class="adm-card adm-card-pad">
          <h3>Данные магазина</h3>
          <p class="muted" style="margin-bottom:16px">Сейчас сайт работает в демо-режиме: товары, заказы и пользователи хранятся в браузере (localStorage). Занято: <b>${kb} КБ</b> из ~5 000 КБ. Чтобы данные были общими для всех посетителей, подключите бэкенд — для этого переписываются файлы <code>assets/js/store/</code>, остальной сайт менять не нужно.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" type="button" id="exp">${ui.icon('upload')} Экспорт JSON</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer">${ui.icon('folder')} Импорт JSON<input type="file" id="imp" accept="application/json" hidden></label>
          </div>
        </section>
        <section class="adm-card adm-card-pad">
          <h3>Сброс</h3>
          <p class="muted" style="margin-bottom:16px">${App.seed.products ? 'Вернуть стартовые категории и демо-наполнение (товары, отзывы, демо-аккаунты, демо-заказы). Новые товары и заказы будут удалены, зарегистрированные покупатели сохранятся.' : 'Очистить товары, отзывы и заказы и вернуть стартовые категории. Зарегистрированные покупатели и администраторы сохранятся.'}</p>
          <button class="btn btn-danger btn-sm" type="button" id="reset">${ui.icon('refresh')} ${App.seed.products ? 'Сбросить к демо-данным' : 'Очистить магазин'}</button>
        </section>
      </div>`;
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
