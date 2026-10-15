(() => {
  const { ui } = App;
  const A = App.admin;

  const label = (text, hint, forId) => `<label${forId ? ` for="${forId}"` : ''}>${text}${hint ? ` <small>— ${hint}</small>` : ''}</label>`;

  const chip = (value) =>
    `<span class="chip" data-chip-value="${ui.esc(value)}">${ui.esc(value)}<button type="button" data-chip-remove aria-label="Убрать «${ui.esc(value)}»">${ui.icon('x')}</button></span>`;

  A.chips = ({ name, title, hint, values = [], suggestions = [], placeholder = 'Введите и нажмите Enter' }) => `
    <div class="field" data-chips="${name}">
      ${label(title, hint, 'chips-' + name)}
      <div class="chips-box">
        ${values.map(chip).join('')}
        <input id="chips-${name}" class="chips-input" list="dl-${name}" placeholder="${placeholder}" autocomplete="off">
      </div>
      <datalist id="dl-${name}">${suggestions.map((s) => `<option value="${ui.esc(s)}">`).join('')}</datalist>
    </div>`;

  const listRow = (value, placeholder) => `
    <div class="list-row">
      <input class="input" value="${ui.esc(value)}" placeholder="${ui.esc(placeholder)}">
      <div class="row-actions">
        <button type="button" data-list-up aria-label="Выше">${ui.icon('chevron-up')}</button>
        <button type="button" data-list-down aria-label="Ниже">${ui.icon('chevron-down')}</button>
        <button type="button" class="del" data-list-remove aria-label="Удалить строку">${ui.icon('trash')}</button>
      </div>
    </div>`;

  A.list = ({ name, title, hint, items = [], placeholder = '', addText = 'Добавить строку', numbered = false }) => `
    <div class="field" data-list="${name}" data-placeholder="${ui.esc(placeholder)}">
      ${label(title, hint)}
      <div class="list-rows${numbered ? ' is-numbered' : ''}">${items.map((v) => listRow(v, placeholder)).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm list-add" data-list-add>${ui.icon('plus')} ${addText}</button>
    </div>`;

  const pairRow = (p = {}) => `
    <div class="list-row pair-row">
      <input class="input" data-pair="label" value="${ui.esc(p.label || '')}" placeholder="Например: Текстура">
      <input class="input" data-pair="value" value="${ui.esc(p.value || '')}" placeholder="Например: Лёгкий гель">
      <div class="row-actions"><button type="button" class="del" data-list-remove aria-label="Удалить строку">${ui.icon('trash')}</button></div>
    </div>`;

  A.pairs = ({ name, title, hint, items = [] }) => `
    <div class="field" data-pairs="${name}">
      ${label(title, hint)}
      <div class="list-rows">${items.map(pairRow).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm list-add" data-pair-add>${ui.icon('plus')} Добавить характеристику</button>
    </div>`;

  const blockRow = (b = {}) => `
    <div class="list-row block-row">
      <div class="block-fields">
        <input class="input" data-block="title" value="${ui.esc(b.title || '')}" maxlength="40" placeholder="Название вкладки, например: Материал">
        <textarea class="textarea is-short" data-block="text" rows="4" placeholder="Текст. Пустая строка — новый абзац, строка с «- » — пункт списка">${ui.esc(b.text || '')}</textarea>
      </div>
      <div class="row-actions">
        <button type="button" data-list-up aria-label="Выше">${ui.icon('chevron-up')}</button>
        <button type="button" data-list-down aria-label="Ниже">${ui.icon('chevron-down')}</button>
        <button type="button" class="del" data-list-remove aria-label="Удалить раздел">${ui.icon('trash')}</button>
      </div>
    </div>`;

  A.blocks = ({ name, title, hint, items = [] }) => `
    <div class="field" data-blocks="${name}">
      ${label(title, hint)}
      <div class="list-rows">${items.map(blockRow).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm list-add" data-block-add>${ui.icon('plus')} Добавить раздел</button>
    </div>`;

  A.readChips = (form, name) => ui.$$(`[data-chips="${name}"] [data-chip-value]`, form).map((c) => c.dataset.chipValue);
  A.readList = (form, name) =>
    ui
      .$$(`[data-list="${name}"] .list-row input`, form)
      .map((i) => i.value.trim())
      .filter(Boolean);
  A.readPairs = (form, name) =>
    ui
      .$$(`[data-pairs="${name}"] .pair-row`, form)
      .map((row) => ({
        label: row.querySelector('[data-pair="label"]').value.trim(),
        value: row.querySelector('[data-pair="value"]').value.trim()
      }))
      .filter((p) => p.label && p.value);
  A.readBlocks = (form, name) =>
    ui
      .$$(`[data-blocks="${name}"] .block-row`, form)
      .map((row) => ({
        title: row.querySelector('[data-block="title"]').value.trim(),
        text: row.querySelector('[data-block="text"]').value.trim()
      }))
      .filter((b) => b.title && b.text);

  A.initControls = (form, onChange) => {
    const changed = () => onChange && onChange();

    const addChip = (input) => {
      const box = input.closest('[data-chips]');
      const values = input.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      values.forEach((v) => {
        const exists = ui.$$('[data-chip-value]', box).some((c) => c.dataset.chipValue.toLowerCase() === v.toLowerCase());
        if (!exists) input.insertAdjacentHTML('beforebegin', chip(v));
      });
      input.value = '';
      if (values.length) changed();
    };

    form.addEventListener('keydown', (e) => {
      const input = e.target.closest('.chips-input');
      if (!input) return;
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addChip(input);
      } else if (e.key === 'Backspace' && !input.value) {
        const last = input.previousElementSibling;
        if (last && last.matches('[data-chip-value]')) {
          last.remove();
          changed();
        }
      }
    });

    form.addEventListener('change', (e) => e.target.matches('.chips-input') && addChip(e.target));
    form.addEventListener('focusout', (e) => e.target.matches('.chips-input') && e.target.value.trim() && addChip(e.target));

    form.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (e.target.closest('.chips-box') && !t) e.target.closest('.chips-box').querySelector('.chips-input').focus();
      if (!t) return;
      const row = t.closest('.list-row');
      if (t.matches('[data-chip-remove]')) t.closest('[data-chip-value]').remove();
      else if (t.matches('[data-list-remove]')) row.remove();
      else if (t.matches('[data-list-up]') && row.previousElementSibling) row.previousElementSibling.before(row);
      else if (t.matches('[data-list-down]') && row.nextElementSibling) row.nextElementSibling.after(row);
      else if (t.matches('[data-list-add]')) {
        const field = t.closest('[data-list]');
        field.querySelector('.list-rows').insertAdjacentHTML('beforeend', listRow('', field.dataset.placeholder));
        field.querySelector('.list-row:last-child input').focus();
      } else if (t.matches('[data-block-add]')) {
        const rows = t.closest('[data-blocks]').querySelector('.list-rows');
        rows.insertAdjacentHTML('beforeend', blockRow());
        rows.querySelector('.list-row:last-child input').focus();
      } else if (t.matches('[data-pair-add]')) {
        const rows = t.closest('[data-pairs]').querySelector('.list-rows');
        rows.insertAdjacentHTML('beforeend', pairRow());
        rows.querySelector('.list-row:last-child input').focus();
      } else return;
      changed();
    });
  };
})();
