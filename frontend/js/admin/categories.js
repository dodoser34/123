/* Админка → редактор категорий */
(() => {
  const { ui, db } = App;
  const A = App.admin;

  function categories() {
    A.setTitle('Категории');
    let cats = db.categories.all();
    const used = (c, s) => db.products.all().filter((p) => p.category === c && (s == null || p.sub === s)).length;
    const draw = () => {
      A.$content.innerHTML = `
        <p class="muted" style="margin:-6px 0 18px">Названия категорий показываются в меню сайта и в каталоге. Изменения сохраняются кнопкой внизу.</p>
        <div class="cat-admin">${cats
          .map(
            (c, ci) => `
          <section class="adm-card adm-card-pad">
            <div class="cat-line"><span class="benefit-ic" style="width:40px;height:40px">${ui.icon(c.icon || 'folder')}</span>
              <input class="input" value="${ui.esc(c.name)}" data-cname="${ci}" aria-label="Название категории" style="font-weight:700">
              <span class="muted">${used(c.id)} тов.</span>
              <div class="row-actions"><button type="button" class="del" data-cdel="${ci}" aria-label="Удалить категорию">${ui.icon('trash')}</button></div></div>
            ${c.subs
              .map(
                (s, si) => `
              <div class="cat-line is-sub">${ui.icon('chevron-right')}
                <input class="input" value="${ui.esc(s.name)}" data-sname="${ci}:${si}" aria-label="Название подкатегории">
                <span class="muted">${used(c.id, s.id)} тов.</span>
                <div class="row-actions"><button type="button" class="del" data-sdel="${ci}:${si}" aria-label="Удалить подкатегорию">${ui.icon('trash')}</button></div></div>`
              )
              .join('')}
            <div class="cat-line is-sub"><button class="btn btn-ghost btn-sm" type="button" data-sadd="${ci}">${ui.icon('plus')} Подкатегория</button></div>
          </section>`
          )
          .join('')}
        </div>
        <div class="pf-actions"><button class="btn btn-secondary" type="button" id="cat-add">${ui.icon('plus')} Новая категория</button><button class="btn btn-primary" type="button" id="cat-save">${ui.icon('check')} Сохранить</button></div>`;
    };
    draw();
    const slugFor = (name, list) => {
      let s = db.products.slugify(name),
        i = 2,
        b = s;
      while (list.some((x) => x.id === s)) s = b + '-' + i++;
      return s;
    };
    A.$content.oninput = (e) => {
      A.dirty = true;
      if (e.target.dataset.cname != null) cats[+e.target.dataset.cname].name = e.target.value;
      if (e.target.dataset.sname != null) {
        const [ci, si] = e.target.dataset.sname.split(':');
        cats[ci].subs[si].name = e.target.value;
      }
    };
    A.$content.onclick = async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.cdel != null) {
        const c = cats[+b.dataset.cdel];
        const n = used(c.id);
        if (n) {
          ui.toast({ title: 'Нельзя удалить', text: `В категории ${n} тов. Сначала перенесите их.`, icon: 'x' });
          return;
        }
        if (await ui.confirm(`Удалить категорию «${c.name}»?`)) {
          cats.splice(+b.dataset.cdel, 1);
          A.dirty = true;
          draw();
        }
      }
      if (b.dataset.sdel != null) {
        const [ci, si] = b.dataset.sdel.split(':').map(Number);
        const s = cats[ci].subs[si];
        const n = used(cats[ci].id, s.id);
        if (n) {
          ui.toast({ title: 'Нельзя удалить', text: `В подкатегории ${n} тов.`, icon: 'x' });
          return;
        }
        cats[ci].subs.splice(si, 1);
        A.dirty = true;
        draw();
      }
      if (b.dataset.sadd != null) {
        const c = cats[+b.dataset.sadd];
        const name = 'Новая подкатегория';
        c.subs.push({ id: slugFor(name, c.subs), name });
        A.dirty = true;
        draw();
        const inputs = ui.$$(`[data-sname^="${b.dataset.sadd}:"]`);
        const last = inputs[inputs.length - 1];
        last.focus();
        last.select();
      }
      if (b.id === 'cat-add') {
        const name = 'Новая категория';
        cats.push({ id: slugFor(name, cats), name, icon: 'folder', subs: [] });
        A.dirty = true;
        draw();
        const inputs = ui.$$('[data-cname]');
        inputs[inputs.length - 1].focus();
        inputs[inputs.length - 1].select();
      }
      if (b.id === 'cat-save') {
        if (cats.some((c) => !c.name.trim() || c.subs.some((s) => !s.name.trim()))) {
          ui.toast({ title: 'Заполните все названия', icon: 'x' });
          return;
        }
        cats.forEach((c) => {
          c.name = c.name.trim();
          c.subs.forEach((s) => {
            s.name = s.name.trim();
          });
        });
        if ((await db.categories.saveAll(cats)) === false) return; // false — сервер отказал
        A.dirty = false;
        cats = db.categories.all();
        draw();
        ui.toast({ title: 'Категории сохранены' });
      }
    };
  }

  A.views.categories = categories;
})();
