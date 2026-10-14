/* Страница товара → информационные блоки: «Для чего», теги, вкладки «Описание», «Состав»,
   «Применение», «Характеристики» и боковая карточка «Кому подходит». */
(() => {
  const { ui, db } = App;
  const T = ui.t('product.info'); // тексты — texts/…/product.js
  const list = (items, icon) =>
    items.length ? `<ul class="leaf-list">${items.map((b) => `<li>${ui.icon(icon)}${ui.esc(b)}</li>`).join('')}</ul>` : '';

  /** «Для чего» — чипы-ссылки на каталог с этим назначением; теги — ссылки на каталог с тегом. */
  function chips(p) {
    const purpose = p.purpose.length
      ? `<div class="pp-chips"><span class="pp-chips-label">${ui.icon('target')}${T.purpose}</span>${p.purpose
          .map((x) => `<a class="chip chip-link" href="${ui.catalogUrl({ purpose: x })}">${ui.esc(x)}</a>`)
          .join('')}</div>`
      : '';
    const tags = p.tags.length
      ? `<div class="pp-tags">${p.tags.map((t) => `<a href="${ui.catalogUrl({ tag: t })}">#${ui.esc(t)}</a>`).join('')}</div>`
      : '';
    return purpose + tags;
  }

  /** Ключевые компоненты: строки «Название — что делает». */
  function ingredients(p) {
    if (!p.keyIngredients.length) return '';
    return `
      <h4 class="tab-subtitle">${T.keyIngredients}</h4>
      <div class="ingredients">${p.keyIngredients
        .map((line) => {
          const [name, ...rest] = line.split(' — ');
          return `<div class="ingredient">${ui.icon('flask')}<div><b>${ui.esc(name)}</b>${rest.length ? `<span>${ui.esc(rest.join(' — '))}</span>` : ''}</div></div>`;
        })
        .join('')}</div>`;
  }

  const tabs = {
    desc: (p) => `
      <p>${ui.esc(p.description)}</p>
      ${p.benefits.length ? `<h4 class="tab-subtitle">${T.benefits}</h4>${list(p.benefits, 'leaf')}` : ''}`,

    comp: (p) => `
      ${ingredients(p)}
      <h4 class="tab-subtitle">${T.composition}</h4>
      <p class="composition">${ui.esc(p.composition || T.compositionUnknown)}</p>`,

    usage: (p) => {
      const when = p.whenToUse.length
        ? `<div class="when">${p.whenToUse
            .map(
              (k) =>
                `<span class="when-item">${ui.icon({ morning: 'sunrise', day: 'sun', evening: 'moon' }[k] || 'clock')}${db.products.WHEN[k] || k}</span>`
            )
            .join('')}${p.frequency ? `<span class="when-freq">${ui.esc(p.frequency)}</span>` : ''}</div>`
        : '';
      const steps = p.usage.length
        ? `<ol class="steps">${p.usage.map((s) => `<li>${ui.esc(s)}</li>`).join('')}</ol>`
        : `<p class="muted">${T.usageUnknown}</p>`;
      const warn = p.warnings
        ? `<div class="warning">${ui.icon('alert')}<div><b>${T.warnings}</b><p>${ui.esc(p.warnings)}</p></div></div>`
        : '';
      return when + steps + warn;
    },

    specs: (p) => {
      const cat = db.categories.get(p.category);
      const sub = db.categories.sub(p.category, p.sub);
      const rows = [
        [T.specs.brand, p.brand],
        [T.specs.category, [cat && cat.name, sub && sub.name].filter(Boolean).join(' / ')],
        [T.specs.volume, p.specs.volume],
        [T.specs.country, p.specs.country],
        [T.specs.shelfLife, p.specs.shelfLife],
        [T.specs.sku, p.specs.sku],
        ...p.attributes.map((a) => [a.label, a.value])
      ].filter(([, v]) => v);
      return `<table class="specs-table"><tbody>${rows.map(([k, v]) => `<tr><th>${ui.esc(k)}</th><td>${ui.esc(v)}</td></tr>`).join('')}</tbody></table>`;
    }
  };

  /** Боковая карточка: «Кому подходит» или предложение консультации. */
  function aside(p) {
    if (p.audience.length) {
      const icons = ['droplet', 'leaf', 'sparkles', 'user'];
      return `
        <aside class="panel suits">
          <h3>${T.suits}</h3>
          <ul>${p.audience.map((s, i) => `<li><span class="s-ic">${ui.icon(icons[i % icons.length])}</span>${ui.esc(s)}</li>`).join('')}</ul>
          ${p.specs.volume ? `<p class="suits-note">${ui.icon('package')}${ui.esc(p.specs.volume)}${p.specs.country ? ' · ' + ui.esc(p.specs.country) : ''}</p>` : ''}
        </aside>`;
    }
    return `
      <aside class="panel suits">
        <h3>${T.consultTitle}</h3>
        <p class="muted">${T.consultText}</p>
        <a class="btn btn-primary btn-block" href="${ui.contactLink(ui.t('product.info.consultSubject', { name: p.name }))}">${ui.icon('mail')} ${T.consultAction}</a>
      </aside>`;
  }

  /** Свой раздел товара из админки: пустая строка — новый абзац, строки с «- » — список, перенос строки сохраняется. */
  function custom(section) {
    return section.text
      .split(/\n\s*\n/)
      .map((block) => {
        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length && lines.every((l) => /^[-•–]\s+/.test(l)))
          return `<ul class="custom-list">${lines.map((l) => `<li>${ui.esc(l.replace(/^[-•–]\s+/, ''))}</li>`).join('')}</ul>`;
        return `<p class="custom-text">${lines.map(ui.esc).join('<br>')}</p>`;
      })
      .join('');
  }

  App.productInfo = { chips, tabs, aside, custom };
})();
