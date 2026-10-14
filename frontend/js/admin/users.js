/* Админка → пользователи и роли */
(() => {
  const { ui, db } = App;
  const A = App.admin;

  function users() {
    A.setTitle('Пользователи');
    const draw = () => {
      const list = db.users.all();
      const allOrders = db.orders.all();
      A.$content.innerHTML = `<section class="adm-card"><div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Имя</th><th class="hide-sm">Телефон</th><th class="hide-sm">Создан</th><th>Заказы</th><th>Роль</th><th></th></tr></thead>
        <tbody>${list
          .map((u) => {
            const uo = allOrders.filter((o) => o.userId === u.id);
            return `<tr>
            <td class="cell-name"><b>${ui.esc(u.name)}${u.id === A.me.id ? ' <span class="tag tag-soft">вы</span>' : ''}</b><small>${ui.esc(u.email)}</small></td>
            <td class="hide-sm">${ui.esc(u.phone || '—')}</td>
            <td class="hide-sm">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
            <td>${uo.length} <small class="muted">${uo.length ? '· ' + ui.price(uo.reduce((s, o) => s + o.total, 0)) : ''}</small></td>
            <td>${
              App.remote.enabled
                ? u.role === 'admin'
                  ? '<span class="tag tag-soft">Администратор</span>'
                  : `<button type="button" class="btn btn-ghost btn-sm" data-block="${u.id}">${u.blocked ? 'Разблокировать' : 'Заблокировать'}</button>${u.blocked ? ' <span class="tag tag-warn">заблокирован</span>' : ''}`
                : `<select class="select" data-role="${u.id}" ${u.id === A.me.id ? 'disabled' : ''} style="height:36px;font-size:13px;width:150px"><option value="customer" ${u.role !== 'admin' ? 'selected' : ''}>Покупатель</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Администратор</option></select>`
            }</td>
            <td><div class="row-actions">${u.id === A.me.id ? '' : `<button type="button" class="del" data-udel="${u.id}" aria-label="Удалить">${ui.icon('trash')}</button>`}</div></td>
          </tr>`;
          })
          .join('')}</tbody></table></div></section>`;
    };
    draw();
    A.$content.onchange = async (e) => {
      if (e.target.dataset.role) {
        await db.users.update(e.target.dataset.role, { role: e.target.value });
        ui.toast({ title: 'Роль изменена' });
      }
    };
    A.$content.onclick = async (e) => {
      const block = e.target.closest('[data-block]');
      if (block) {
        const u = db.users.get(block.dataset.block);
        const res = await db.users.update(u.id, { blocked: !u.blocked });
        if (res.error) return ui.toast({ title: res.error, icon: 'x' });
        ui.toast({ title: u.blocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован — он сразу выйдет из аккаунта' });
        return draw();
      }
      const b = e.target.closest('[data-udel]');
      if (!b) return;
      const u = db.users.get(b.dataset.udel);
      if (await ui.confirm(`Удалить пользователя ${u.name}? Его заказы сохранятся.`)) {
        await db.users.remove(u.id);
        draw();
        ui.toast({ title: 'Пользователь удалён', icon: 'trash' });
      }
    };
    A.$content.oninput = null;
  }

  A.views.users = users;
})();
