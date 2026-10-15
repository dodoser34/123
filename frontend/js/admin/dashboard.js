(() => {
  const { ui, db } = App;
  const A = App.admin;

  function dashboard() {
    A.setTitle('Обзор');
    const orders = db.orders.all();
    const active = orders.filter((o) => o.status !== 'cancelled');
    const revenue = active.reduce((s, o) => s + o.total, 0);
    const products = db.products.all();
    const low = products.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock);
    const customers = db.users.all().filter((u) => u.role !== 'admin').length;
    const sold = {};
    active.forEach((o) =>
      o.items.forEach((i) => {
        sold[i.id] = (sold[i.id] || 0) + i.qty;
      })
    );
    const top = Object.entries(sold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, q]) => ({ p: db.products.get(id), q }))
      .filter((x) => x.p);

    A.$content.innerHTML = `
      <div class="kpis">
        ${kpi('card', 'Выручка', ui.price(revenue))}
        ${kpi('bag', 'Заказы', orders.length + (orders.filter((o) => o.status === 'new').length ? ` <small style="display:inline;color:#B07D16">+${orders.filter((o) => o.status === 'new').length} новых</small>` : ''))}
        ${kpi('package', 'Товары', products.length)}
        ${kpi('users', 'Покупатели', customers)}
      </div>
      <div class="adm-grid-2">
        <section class="adm-card adm-card-pad">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3>Последние заказы</h3><a class="link-arrow" href="#orders">Все ${ui.icon('arrow-right')}</a></div>
          ${orders.length ? A.ordersTable(orders.slice(0, 6), true) : `<div class="adm-empty">Заказов пока нет. Оформите тестовый заказ на сайте — он появится здесь.</div>`}
        </section>
        <div style="display:grid;gap:20px;align-content:start">
          <section class="adm-card adm-card-pad">
            <h3>Заканчиваются</h3>
            ${
              low.length
                ? low
                    .slice(0, 6)
                    .map(
                      (p) =>
                        `<a href="#product/${p.id}" class="mini-item">${ui.img(p.images[0], '', 'adm-thumb')}<span>${ui.esc(p.name)}</span><b style="color:${p.stock === 0 ? 'var(--danger)' : '#B07D16'}">${p.stock} шт.</b></a>`
                    )
                    .join('')
                : '<p class="muted">Все товары в достатке.</p>'
            }
          </section>
          <section class="adm-card adm-card-pad">
            <h3>Топ продаж</h3>
            ${top.length ? top.map((x) => `<div class="mini-item">${ui.img(x.p.images[0], '', 'adm-thumb')}<span>${ui.esc(x.p.name)}</span><b>${x.q} шт.</b></div>`).join('') : '<p class="muted">Появится после первых заказов.</p>'}
          </section>
        </div>
      </div>`;
    A.bindOrderRows();
  }
  const kpi = (ic, label, val) =>
    `<div class="adm-card kpi"><span class="k-ic">${ui.icon(ic)}</span><div><small>${label}</small><b>${val}</b></div></div>`;

  A.views.dashboard = dashboard;
})();
