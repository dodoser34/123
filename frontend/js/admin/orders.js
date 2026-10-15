(() => {
  const { ui, db } = App;
  const A = App.admin;

  const oState = { status: '', q: '' };
  function ordersTable(list, compact) {
    return `<div class="adm-table-wrap"><table class="adm-table">
      <thead><tr><th>№</th><th>Покупатель</th>${compact ? '' : '<th class="hide-sm">Дата</th><th class="hide-sm">Доставка</th>'}<th>Сумма</th><th>Статус</th></tr></thead>
      <tbody>${list
        .map(
          (o) => `
        <tr class="is-click" data-order="${o.id}" tabindex="0">
          <td><b>${o.number}</b></td>
          <td class="cell-name"><b>${ui.esc(o.name)}</b><small>${ui.esc(o.phone)}</small></td>
          ${compact ? '' : `<td class="hide-sm">${new Date(o.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td class="hide-sm">${ui.esc(o.deliveryTitle)}<br><small class="muted">${ui.esc(o.city)}</small></td>`}
          <td><b>${ui.price(o.total)}</b></td>
          <td><span class="status status-${o.status}">${db.orders.STATUSES[o.status]}</span></td>
        </tr>`
        )
        .join('')}</tbody></table></div>`;
  }
  function bindOrderRows() {
    ui.$$('[data-order]', A.$content).forEach((r) => {
      r.addEventListener('click', () => A.orderModal(r.dataset.order));
      r.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') A.orderModal(r.dataset.order);
      });
    });
  }
  function orders() {
    A.setTitle('Заказы');
    const S = db.orders.STATUSES;
    A.$content.innerHTML = `
      <div class="adm-toolbar">
        <div class="search">${ui.icon('search')}<input class="input" type="search" id="o-q" placeholder="Номер, имя или телефон" value="${ui.esc(oState.q)}"></div>
        <select class="select" id="o-status" aria-label="Статус"><option value="">Все статусы</option>${Object.entries(S)
          .map(([k, v]) => `<option value="${k}" ${oState.status === k ? 'selected' : ''}>${v}</option>`)
          .join('')}</select>
      </div>
      <section class="adm-card" id="o-table"></section>`;
    const draw = () => {
      let list = db.orders.all();
      if (oState.status) list = list.filter((o) => o.status === oState.status);
      const q = oState.q.toLowerCase().trim();
      if (q)
        list = list.filter((o) => (o.number + ' ' + o.name + ' ' + o.phone.replace(/\D/g, '') + ' ' + o.phone).toLowerCase().includes(q));
      document.getElementById('o-table').innerHTML = list.length
        ? A.ordersTable(list)
        : `<div class="adm-empty">${db.orders.all().length ? 'Ничего не найдено' : 'Заказов пока нет. Оформите тестовый заказ на сайте — он появится здесь.'}</div>`;
      A.bindOrderRows();
    };
    draw();
    document.getElementById('o-q').addEventListener(
      'input',
      ui.debounce((e) => {
        oState.q = e.target.value;
        draw();
      }, 200)
    );
    document.getElementById('o-status').onchange = (e) => {
      oState.status = e.target.value;
      draw();
    };
    A.$content.onclick = null;
    A.$content.onchange = null;
    A.$content.oninput = null;
  }
  function orderModal(id) {
    const o = db.orders.get(id);
    if (!o) return;
    const S = db.orders.STATUSES;
    const PAY = ui.t('account.orders.payment');
    const md = ui.modal(`
      <div class="order-detail">
        <h3>Заказ №${o.number}</h3>
        <dl>
          <dt>Дата</dt><dd>${new Date(o.createdAt).toLocaleString('ru-RU')}</dd>
          <dt>Покупатель</dt><dd>${ui.esc(o.name)}${o.userId ? ' <span class="tag tag-soft">аккаунт</span>' : ''}</dd>
          <dt>Телефон</dt><dd><a href="https://wa.me/${o.phone.replace(/\D/g, '')}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600">${ui.esc(o.phone)}</a></dd>
          ${o.email ? `<dt>Email</dt><dd>${ui.esc(o.email)}</dd>` : ''}
          <dt>Доставка</dt><dd>${ui.esc(o.deliveryTitle)}<br>${ui.esc(o.city)}, ${ui.esc(o.address)}</dd>
          <dt>Оплата</dt><dd>${ui.esc(o.paymentTitle)} ${o.paid ? '<span class="tag tag-soft">Оплачен</span>' : `<span class="tag tag-warn">${PAY[o.paymentStatus] || 'Оплата при получении'}</span>`}</dd>
          ${o.comment ? `<dt>Комментарий</dt><dd>${ui.esc(o.comment)}</dd>` : ''}
        </dl>
        ${o.items.map((i) => `<div class="mini-item">${ui.img(i.image, '')}<span>${ui.esc(i.name)} <span class="muted">× ${i.qty}</span></span><b>${ui.price(i.price * i.qty)}</b></div>`).join('')}
        <div class="sum-row" style="margin-top:8px"><span>Доставка</span><span>${o.deliveryPrice ? ui.price(o.deliveryPrice) : o.delivery === 'kazakhstan' ? 'по тарифу' : 'бесплатно'}</span></div>
        <div class="sum-row total"><span>Итого</span><span>${ui.price(o.total)}</span></div>
        <div class="field" style="margin-top:18px"><label for="o-st">Статус</label><select class="select" id="o-st">${Object.entries(S)
          .map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`)
          .join('')}</select></div>
        ${
          App.remote.enabled && o.paymentStatus
            ? `<div class="field"><label for="o-pay">Оплата</label><select class="select" id="o-pay">${Object.entries(PAY)
                .map(([k, v]) => `<option value="${k}" ${o.paymentStatus === k ? 'selected' : ''}>${v}</option>`)
                .join('')}</select><span class="field-hint">Получили перевод на Kaspi — выберите «Оплачен».</span></div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" type="button" id="o-del" style="color:var(--danger)">${ui.icon('trash')} Удалить</button>
          <button class="btn btn-primary btn-sm" type="button" id="o-save">Сохранить</button>
        </div>
      </div>`);
    md.el.querySelector('#o-save').onclick = async () => {
      const status = md.el.querySelector('#o-st').value;
      if (status !== o.status) await db.orders.setStatus(o.id, status);
      const pay = md.el.querySelector('#o-pay');
      if (pay && pay.value !== o.paymentStatus) await db.orders.setPaymentStatus(o.id, pay.value);
      md.close();
      ui.toast({ title: 'Статус обновлён' });
      A.route();
    };
    md.el.querySelector('#o-del').onclick = async () => {
      md.close();
      if (await ui.confirm(`Удалить заказ №${o.number}?`)) {
        await db.orders.remove(o.id);
        ui.toast({ title: 'Заказ удалён', icon: 'trash' });
        A.route();
      }
    };
  }

  A.views.orders = orders;
  A.ordersTable = ordersTable;
  A.bindOrderRows = bindOrderRows;
  A.orderModal = orderModal;
})();
