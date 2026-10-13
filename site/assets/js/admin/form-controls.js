/* Админка → общие элементы форм:
   • chips — метки (теги, «Для чего», «Кому подходит») с подсказками из уже введённых значений;
   • list  — список строк с кнопками «выше / ниже / удалить» (преимущества, шаги применения, компоненты);
   • pairs — таблица «название — значение» (дополнительные характеристики).
   Разметку возвращают функции A.chips / A.list / A.pairs, поведение подключает A.initControls(form). */
(() => {
  const { ui } = App;
  const A = App.admin;

  const label = (text, hint, forId) => `<label${forId ? ` for="${forId}"` : ''}>${text}${hint ? ` <small>— ${hint}</small>` : ''}</label>`;

  /* ---------- Метки ---------- */
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

  /* ---------- Список строк ---------- */
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

  /* ---------- Пары «название — значение» ---------- */
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

  /* ---------- Чтение значений ---------- */
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

  /* ---------- Поведение ---------- */
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
    // выбор из подсказки или уход с поля тоже добавляет метку
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
      } else if (t.matches('[data-pair-add]')) {
        const rows = t.closest('[data-pairs]').querySelector('.list-rows');
        rows.insertAdjacentHTML('beforeend', pairRow());
        rows.querySelector('.list-row:last-child input').focus();
      } else return;
      changed();
    });
  };
})();
