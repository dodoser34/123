/* Админка → разметка формы товара: разделы, поля, боковая панель. Логика формы — в product-form.js. */
(() => {
  const { ui, db } = App;
  const A = App.admin;

  const SECTIONS = [
    ['pf-main', 'Основное'],
    ['pf-photos', 'Фото'],
    ['pf-purpose', 'Для чего и кому'],
    ['pf-composition', 'Состав'],
    ['pf-usage', 'Применение'],
    ['pf-specs', 'Характеристики'],
    ['pf-seo', 'Для поисковиков']
  ];

  /** Что проверяем в шкале «Заполненность карточки». */
  const CHECKS = [
    ['Фото', (p) => p.images.length > 0],
    ['Краткое описание', (p) => !!p.short],
    ['Полное описание', (p) => !!p.description],
    ['Для чего', (p) => p.purpose.length > 0],
    ['Кому подходит', (p) => p.audience.length > 0],
    ['Что даёт', (p) => p.benefits.length > 0],
    ['Состав', (p) => !!p.composition || p.keyIngredients.length > 0],
    ['Как применять', (p) => p.usage.length > 0],
    ['Объём / вес', (p) => !!p.specs.volume],
    ['Теги', (p) => p.tags.length > 0]
  ];

  const section = (id, title, hint, body) => `
    <section class="adm-card adm-card-pad pf-section" id="${id}">
      <h3>${title}</h3>${hint ? `<p class="pf-hint">${hint}</p>` : ''}${body}
    </section>`;

  function template(p, isNew) {
    const F = (name, title, input, hint) =>
      `<div class="field"><label for="f-${name}">${title}${hint ? ` <small>— ${hint}</small>` : ''}</label>${input}<span class="field-error"></span></div>`;
    const cats = db.categories.all();
    const when = Object.entries(db.products.WHEN)
      .map(
        ([k, v]) =>
          `<label class="check"><input type="checkbox" name="whenToUse" value="${k}" ${p.whenToUse.includes(k) ? 'checked' : ''}> ${v}</label>`
      )
      .join('');

    return `
      <p class="pf-back"><a class="link-arrow" href="#products">${ui.icon('arrow-left')} Все товары</a></p>
      <nav class="pf-nav" aria-label="Разделы формы">${SECTIONS.map(([id, t]) => `<a href="#${id}" data-jump="${id}">${t}</a>`).join('')}</nav>
      <form class="pf" id="pf" novalidate>
        <div>
          ${section(
            'pf-main',
            'Основное',
            '',
            `
            ${F('name', 'Название *', `<input class="input" id="f-name" name="name" value="${ui.esc(p.name)}" maxlength="120" placeholder="Например: Успокаивающий тонер Anua Heartleaf 77%">`, 'тип средства + бренд + линия')}
            <div class="form-row">
              ${F('brand', 'Бренд *', `<input class="input" id="f-brand" name="brand" value="${ui.esc(p.brand)}" list="brands"><datalist id="brands">${[...new Set(db.products.all().map((x) => x.brand))].map((b) => `<option value="${ui.esc(b)}">`).join('')}</datalist>`)}
              ${F('slug', 'Адрес страницы', `<input class="input" id="f-slug" name="slug" value="${ui.esc(p.slug)}"><span class="field-hint" id="slug-hint"></span>`, 'латиница, создаётся сам')}
            </div>
            <div class="form-row">
              ${F('category', 'Категория *', `<select class="select" id="f-category" name="category">${cats.map((c) => `<option value="${c.id}" ${p.category === c.id ? 'selected' : ''}>${ui.esc(c.name)}</option>`).join('')}</select>`)}
              ${F('sub', 'Подкатегория', '<select class="select" id="f-sub" name="sub"></select>')}
            </div>
            ${F('short', 'Краткое описание', `<textarea class="textarea is-short" id="f-short" name="short" maxlength="220">${ui.esc(p.short)}</textarea><span class="field-hint" id="short-count"></span>`, 'видно рядом с ценой и в виде «список»')}
            ${F('description', 'Полное описание', `<textarea class="textarea is-tall" id="f-description" name="description">${ui.esc(p.description)}</textarea>`, 'вкладка «Описание»')}
          `
          )}
          ${section('pf-photos', 'Фото', '', A.imagesBlock())}
          ${section(
            'pf-purpose',
            'Для чего и кому',
            'Эти поля видны на странице товара и работают как фильтры каталога. Подсказки — значения, уже использованные в других товарах.',
            `
            ${A.chips({ name: 'purpose', title: 'Для чего', hint: 'какие задачи решает: «Увлажнение», «Покраснения»', values: p.purpose, suggestions: db.products.values('purpose') })}
            ${A.chips({ name: 'audience', title: 'Кому подходит', hint: 'тип кожи, волос или человека', values: p.audience, suggestions: db.products.values('audience') })}
            ${A.list({ name: 'benefits', title: 'Что даёт', hint: 'результат для покупателя, каждый пункт — отдельная строка', items: p.benefits, placeholder: 'Например: Успокаивает и снимает покраснения', addText: 'Добавить пункт' })}
            ${A.chips({ name: 'tags', title: 'Теги', hint: 'для поиска и подборок, без #', values: p.tags, suggestions: db.products.values('tags') })}
          `
          )}
          ${section(
            'pf-composition',
            'Состав',
            '',
            `
            ${A.list({ name: 'keyIngredients', title: 'Ключевые компоненты', hint: 'формат «Компонент — что делает»', items: p.keyIngredients, placeholder: 'Центелла — успокаивает кожу', addText: 'Добавить компонент' })}
            ${F('composition', 'Полный состав', `<textarea class="textarea" id="f-composition" name="composition">${ui.esc(p.composition)}</textarea>`, 'INCI с упаковки')}
          `
          )}
          ${section(
            'pf-usage',
            'Применение',
            '',
            `
            <div class="field"><span class="label">Когда применять</span><div class="check-row">${when}</div></div>
            ${F('frequency', 'Как часто', `<input class="input" id="f-frequency" name="frequency" value="${ui.esc(p.frequency)}" placeholder="Например: Ежедневно, 2 раза в день">`)}
            ${A.list({ name: 'usage', title: 'Как применять', hint: 'шаги по порядку', items: p.usage, placeholder: 'Например: Нанесите на очищенную кожу', addText: 'Добавить шаг', numbered: true })}
            ${F('warnings', 'Меры предосторожности', `<textarea class="textarea is-short" id="f-warnings" name="warnings" placeholder="Противопоказания, аллергия, беременность…">${ui.esc(p.warnings)}</textarea>`, 'показывается в жёлтой рамке')}
          `
          )}
          ${section(
            'pf-specs',
            'Характеристики',
            '',
            `
            <div class="form-row">
              ${F('volume', 'Объём / вес', `<input class="input" id="f-volume" name="volume" value="${ui.esc(p.specs.volume)}" placeholder="250 мл">`)}
              ${F('country', 'Страна производства', `<input class="input" id="f-country" name="country" value="${ui.esc(p.specs.country)}" list="countries"><datalist id="countries"><option value="Южная Корея"><option value="Казахстан"></datalist>`)}
            </div>
            <div class="form-row">
              ${F('shelfLife', 'Срок годности', `<input class="input" id="f-shelfLife" name="shelfLife" value="${ui.esc(p.specs.shelfLife)}" placeholder="36 месяцев">`)}
              ${F('sku', 'Артикул', `<input class="input" id="f-sku" name="sku" value="${ui.esc(p.specs.sku)}">`)}
            </div>
            ${A.pairs({ name: 'attributes', title: 'Дополнительно', hint: 'текстура, аромат, финиш, вкус…', items: p.attributes })}
          `
          )}
          ${section(
            'pf-seo',
            'Для поисковиков',
            'Необязательно. Если пусто — используются название и краткое описание.',
            `
            ${F('seoTitle', 'Заголовок вкладки браузера', `<input class="input" id="f-seoTitle" name="seoTitle" maxlength="70" value="${ui.esc(p.seoTitle)}">`)}
            ${F('seoDescription', 'Описание для Google и Яндекса', `<textarea class="textarea is-short" id="f-seoDescription" name="seoDescription" maxlength="160">${ui.esc(p.seoDescription)}</textarea>`)}
          `
          )}
        </div>

        <div class="pf-side">
          <section class="adm-card adm-card-pad">
            <h3>Публикация</h3>
            <div class="segmented">
              <label><input type="radio" name="status" value="published" ${p.status !== 'hidden' ? 'checked' : ''}><span>${ui.icon('eye')}На сайте</span></label>
              <label><input type="radio" name="status" value="hidden" ${p.status === 'hidden' ? 'checked' : ''}><span>${ui.icon('eye-off')}Скрыт</span></label>
            </div>
            <p class="field-hint pf-status-hint">Скрытый товар не виден покупателям, но сохраняется со всеми данными.</p>
          </section>
          <section class="adm-card adm-card-pad">
            <h3>Цена и наличие</h3>
            ${F('price', 'Цена, ₸ *', `<input class="input" id="f-price" name="price" type="number" min="0" step="10" value="${p.price || ''}">`)}
            ${F('oldPrice', 'Старая цена, ₸', `<input class="input" id="f-oldPrice" name="oldPrice" type="number" min="0" step="10" value="${p.oldPrice || ''}">`, 'для скидки')}
            ${F('stock', 'Остаток, шт.', `<input class="input" id="f-stock" name="stock" type="number" min="0" value="${p.stock}">`)}
          </section>
          <section class="adm-card adm-card-pad">
            <h3>Метки</h3>
            <div class="toggle-list">
              <label class="switch">Хит продаж<input type="checkbox" name="isHit" ${p.isHit ? 'checked' : ''}></label>
              <label class="switch">Новинка<input type="checkbox" name="isNew" ${p.isNew ? 'checked' : ''}></label>
              <label class="switch">Показывать в «Популярных»<input type="checkbox" name="isPopular" ${p.isPopular ? 'checked' : ''}></label>
            </div>
          </section>
          <section class="adm-card adm-card-pad"><h3>Заполненность</h3><div id="completeness"></div></section>
          <section class="adm-card adm-card-pad pf-preview"><h3>Превью карточки</h3><div id="preview"></div></section>
        </div>

        <div class="pf-actions">
          <span class="pf-status" id="pf-status">${isNew ? 'Новый товар' : 'Изменений нет'}</span>
          ${isNew ? '' : `<button class="btn btn-ghost pf-delete" type="button" id="pf-delete">${ui.icon('trash')} Удалить</button>`}
          <a class="btn btn-secondary" href="#products">Отмена</a>
          <button class="btn btn-primary" type="submit">${ui.icon('check')} ${isNew ? 'Создать товар' : 'Сохранить'}</button>
        </div>
      </form>`;
  }

  A.productFormTemplate = template;
  A.PRODUCT_CHECKS = CHECKS;
})();
