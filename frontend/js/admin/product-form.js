(() => {
  const { ui, db } = App;
  const A = App.admin;

  function productForm(id) {
    const isNew = !id || id === 'new';
    const source = isNew ? null : db.products.get(id);
    if (!isNew && !source) {
      A.setTitle('Товар не найден');
      A.$content.innerHTML = '<div class="adm-empty">Товар не найден. <a href="#products">К списку товаров</a></div>';
      return;
    }
    const cats = db.categories.all();
    const p = db.products.normalize(source || { category: cats[0] ? cats[0].id : '', stock: 10, isNew: true });
    let slugTouched = !isNew;
    A.setTitle(isNew ? 'Новый товар' : 'Редактирование');
    A.$content.innerHTML = A.productFormTemplate(p, isNew);

    const form = document.getElementById('pf');
    const F = form.elements;

    const fillSubs = () => {
      const c = db.categories.get(F.category.value);
      F.sub.innerHTML =
        '<option value="">— без подкатегории —</option>' +
        (c ? c.subs.map((s) => `<option value="${s.id}" ${p.sub === s.id ? 'selected' : ''}>${ui.esc(s.name)}</option>`).join('') : '') +
        (c ? '<option value="__new">＋ Новая подкатегория…</option>' : '');
    };

    async function createCategory(isSub) {
      const all = db.categories.all();
      const parent = isSub ? all.find((c) => c.id === F.category.value) : null;
      const name = await ui.prompt(
        isSub ? `Новая подкатегория в «${parent.name}»` : 'Новая категория',
        'Название',
        isSub ? 'Например: Маски для лица' : 'Например: Уход за волосами'
      );
      if (!name) return false;
      const taken = isSub ? parent.subs : all;
      let id = db.products.slugify(name) || 'cat';
      for (let n = 2, base = id; taken.some((x) => x.id === id); n++) id = base + '-' + n;
      if (isSub) parent.subs.push({ id, name });
      else all.push({ id, name, icon: 'leaf', subs: [] });
      if ((await db.categories.saveAll(all)) === false) return false;
      ui.toast({
        title: isSub ? 'Подкатегория создана' : 'Категория создана',
        text: name + ' — её можно переименовать в разделе «Категории».'
      });
      return id;
    }

    function collect() {
      const num = (v) => (v === '' ? '' : Math.max(0, +v));
      Object.assign(p, {
        name: F.name.value.trim(),
        brand: F.brand.value.trim(),
        slug: F.slug.value.trim(),
        category: F.category.value,
        sub: F.sub.value,
        status: F.status.value,
        short: F.short.value.trim(),
        description: F.description.value.trim(),
        purpose: A.readChips(form, 'purpose'),
        audience: A.readChips(form, 'audience'),
        tags: A.readChips(form, 'tags'),
        benefits: A.readList(form, 'benefits'),
        keyIngredients: A.readList(form, 'keyIngredients'),
        usage: A.readList(form, 'usage'),
        composition: F.composition.value.trim(),
        frequency: F.frequency.value.trim(),
        warnings: F.warnings.value.trim(),
        whenToUse: ui.$$('[name="whenToUse"]:checked', form).map((c) => c.value),
        specs: {
          volume: F.volume.value.trim(),
          country: F.country.value.trim(),
          shelfLife: F.shelfLife.value.trim(),
          sku: F.sku.value.trim()
        },
        attributes: A.readPairs(form, 'attributes'),
        sections: A.readBlocks(form, 'sections'),
        seoTitle: F.seoTitle.value.trim(),
        seoDescription: F.seoDescription.value.trim(),
        price: num(F.price.value),
        oldPrice: F.oldPrice.value ? Math.max(0, +F.oldPrice.value) : null,
        stock: Math.max(0, parseInt(F.stock.value, 10) || 0),
        isHit: F.isHit.checked,
        isNew: F.isNew.checked,
        isPopular: F.isPopular.checked
      });
      return p;
    }

    function refresh() {
      collect();
      const demo = Object.assign({}, p, {
        id: '__preview',
        name: p.name || 'Название товара',
        brand: p.brand || 'Бренд',
        price: +p.price || 0,
        slug: p.slug || 'preview'
      });
      document.getElementById('preview').innerHTML = ui.productCard(demo, 'full');
      document.getElementById('short-count').textContent = `${F.short.value.length} / 220`;
      document.getElementById('slug-hint').textContent = `Адрес: pages/product.html?slug=${p.slug || '…'}`;
      const done = A.PRODUCT_CHECKS.filter(([, test]) => test(p)).length;
      document.getElementById('completeness').innerHTML = `
        <div class="progress"><b style="width:${(done / A.PRODUCT_CHECKS.length) * 100}%"></b></div>
        <p class="progress-text">${done} из ${A.PRODUCT_CHECKS.length} заполнено</p>
        <ul class="checklist">${A.PRODUCT_CHECKS.map(([name, test]) => `<li class="${test(p) ? 'is-done' : ''}">${ui.icon(test(p) ? 'check-circle' : 'info')}${name}</li>`).join('')}</ul>`;
    }

    const markDirty = () => {
      A.dirty = true;
      document.getElementById('pf-status').textContent = 'Есть несохранённые изменения';
      document.getElementById('pf-status').classList.add('is-dirty');
      refresh();
    };

    fillSubs();
    A.initControls(form, markDirty);
    A.initImages(p.images, markDirty);
    refresh();

    form.addEventListener('input', (e) => {
      if (e.target.name === 'name' && !slugTouched) F.slug.value = A.uniqueSlug(db.products.slugify(F.name.value), p.id);
      if (e.target.name === 'slug') slugTouched = true;
      const field = e.target.closest('.field');
      if (field) field.classList.remove('has-error');
      if (!e.target.matches('.chips-input, #f-url')) markDirty();
    });
    form.addEventListener('change', (e) => {
      if (e.target.value === '__new' && (e.target.name === 'category' || e.target.name === 'sub')) {
        const isSub = e.target.name === 'sub';
        const prev = isSub ? p.sub : p.category;
        createCategory(isSub).then((id) => {
          if (isSub) {
            p.sub = id || prev || '';
            fillSubs();
          } else {
            F.category.innerHTML =
              db.categories
                .all()
                .map((c) => `<option value="${c.id}">${ui.esc(c.name)}</option>`)
                .join('') + '<option value="__new">＋ Новая категория…</option>';
            F.category.value = id || prev;
            p.category = F.category.value;
            p.sub = '';
            fillSubs();
          }
          markDirty();
        });
        return;
      }
      if (e.target.name === 'category') {
        p.category = e.target.value;
        p.sub = '';
        fillSubs();
      }
      if (!e.target.matches('.chips-input, #f-files, #f-url')) markDirty();
    });
    A.$content.querySelector('.pf-nav').addEventListener('click', (e) => {
      const link = e.target.closest('[data-jump]');
      if (!link) return;
      e.preventDefault();
      document.getElementById(link.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const del = document.getElementById('pf-delete');
    if (del) {
      del.addEventListener('click', async () => {
        if (!(await ui.confirm(`Удалить «${source.name}»? Действие нельзя отменить.`))) return;
        await db.products.remove(source.id);
        A.dirty = false;
        ui.toast({ title: 'Товар удалён', icon: 'trash' });
        location.hash = 'products';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      collect();
      if (!p.slug) p.slug = db.products.slugify(p.name);
      p.slug = db.products.slugify(p.slug);
      const errors = {
        name: p.name.length < 2 && 'Укажите название',
        brand: !p.brand && 'Укажите бренд',
        price: !(p.price > 0) && 'Укажите цену больше 0',
        oldPrice: p.oldPrice && p.oldPrice <= p.price && 'Старая цена должна быть больше текущей',
        slug: db.products.all().some((x) => x.slug === p.slug && x.id !== p.id) && 'Такой адрес уже занят'
      };
      ui.$$('.field', form).forEach((f) => {
        f.classList.remove('has-error');
        const err = f.querySelector('.field-error');
        if (err) err.textContent = '';
      });
      const failed = Object.keys(errors).filter((k) => errors[k]);
      failed.forEach((k) => {
        const field = F[k].closest('.field');
        field.classList.add('has-error');
        field.querySelector('.field-error').textContent = errors[k];
      });
      if (failed.length) {
        F[failed[0]].focus();
        return;
      }
      const button = form.querySelector('[type=submit]');
      if (button) button.disabled = true;
      const saved = await db.products.save(p);
      if (button) button.disabled = false;
      if (!saved) return;
      A.dirty = false;
      ui.toast({ title: isNew ? 'Товар создан' : 'Изменения сохранены', text: saved.name, image: saved.images[0] || '' });
      location.hash = 'products';
    });
  }

  A.views.product = productForm;
})();
