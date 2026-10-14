/* Админка → «Тексты сайта»: правка любых надписей сайта без редактирования файлов.
   Исходные тексты — в frontend/texts/<язык>/, правки хранятся в браузере и накладываются поверх (ui.textEdits в core/texts.js). */
(() => {
  const { ui } = App;
  const A = App.admin;

  const SECTIONS = [
    ['common', 'Общее'],
    ['home', 'Главная'],
    ['catalog', 'Каталог'],
    ['product', 'Товар'],
    ['about', 'О нас'],
    ['delivery', 'Доставка'],
    ['cart', 'Корзина'],
    ['checkout', 'Оформление'],
    ['favorites', 'Избранное'],
    ['login', 'Вход'],
    ['account', 'Кабинет'],
    ['notFound', '404']
  ];
  // понятные названия групп текстов
  const GROUPS = {
    meta: 'Вкладка браузера и поисковики',
    header: 'Шапка',
    menu: 'Мобильное меню',
    flags: 'Новинки и скидки',
    footer: 'Подвал',
    benefits: 'Три преимущества',
    card: 'Карточка товара',
    toasts: 'Уведомления',
    modal: 'Окна',
    lightbox: 'Просмотр фото',
    carousel: 'Карусели',
    breadcrumbs: 'Хлебные крошки',
    orderStatuses: 'Статусы заказа',
    errors: 'Сообщения об ошибках',
    whenToUse: 'Когда применять',
    usagePeriods: 'Сколько пользуется',
    hero: 'Первый экран',
    popular: 'Популярные товары',
    fresh: 'Новинки',
    categories: 'Категории',
    search: 'Поиск',
    aside: 'Боковая панель',
    toolbar: 'Панель над товарами',
    sorts: 'Сортировка',
    empty: 'Когда ничего нет',
    notFound: 'Товар не найден',
    buy: 'Покупка',
    gallery: 'Галерея',
    tabs: 'Вкладки',
    info: 'Описание товара',
    reviews: 'Отзывы',
    reviewForm: 'Форма отзыва',
    mission: 'Наша миссия',
    stats: 'Цифры',
    trust: 'Почему нам доверяют',
    contacts: 'Контакты',
    delivery: 'Доставка',
    pay: 'Оплата',
    rates: 'Таблица сроков',
    ratesHead: 'Таблица сроков — заголовки',
    faq: 'Частые вопросы',
    cta: 'Блок «Остались вопросы?»',
    item: 'Товар в корзине',
    summary: 'Итог заказа',
    payment: 'Оплата',
    steps: 'Шаги',
    fields: 'Поля',
    done: 'Спасибо за заказ',
    modes: 'Вход и регистрация',
    demo: 'Демо-вход',
    greeting: 'Приветствие',
    nav: 'Меню кабинета',
    orders: 'Мои заказы',
    profile: 'Профиль',
    password: 'Пароль'
  };
  const OTHER = 'Основное';

  // понятные названия отдельных надписей; остальные показываются как есть
  const NAMES = {
    title: 'Заголовок',
    description: 'Описание для поисковиков',
    lead: 'Подзаголовок',
    text: 'Текст',
    short: 'Коротко',
    button: 'Кнопка',
    action: 'Кнопка',
    all: 'Ссылка «Смотреть все»',
    label: 'Подпись (для программ чтения с экрана)',
    placeholder: 'Подсказка в пустом поле',
    photoAlt: 'Описание фото',
    caption: 'Надпись на фото',
    count: 'Число',
    items: 'Пункт',
    photos: 'Фото',
    values: 'Ценность',
    subject: 'Тема письма',
    close: 'Кнопка «Закрыть»',
    prev: 'Кнопка «Назад»',
    next: 'Кнопка «Вперёд»',
    cancel: 'Кнопка «Отмена»',
    empty: 'Когда пусто',
    note: 'Примечание'
  };
  const humanize = (parts) => parts.map((k, i) => (/^\d+$/.test(k) ? `№ ${+k + 1}` : NAMES[k] || (i === 0 && GROUPS[k]) || k)).join(' › ');

  /** Все тексты раздела списком: [{ path, group, name, value }]. */
  function fields(section) {
    const out = [];
    const walk = (node, path) => {
      if (typeof node === 'string' || typeof node === 'number') {
        const rest = path.split('.').slice(1);
        const group = rest.length > 1 ? GROUPS[rest[0]] || rest[0] : OTHER;
        out.push({ path, group, name: humanize(rest.length > 1 ? rest.slice(1) : rest), value: node });
      } else if (node && typeof node === 'object') {
        Object.keys(node).forEach((k) => walk(node[k], path + '.' + k));
      }
    };
    walk(ui.textEdits.original(section), section);
    return out;
  }

  const placeholders = (s) => (String(s).match(/\{[^}]+\}/g) || []).sort().join(' ');

  function field(f) {
    const current = ui.t(f.path);
    const edited = f.path in ui.textEdits.all();
    const long = String(current).length > 70 || /<br>/.test(current);
    const input =
      typeof f.value === 'number'
        ? `<input class="input" type="number" data-text="${f.path}" value="${ui.esc(current)}">`
        : long
          ? `<textarea class="textarea is-short" data-text="${f.path}" rows="3">${ui.esc(current)}</textarea>`
          : `<input class="input" data-text="${f.path}" value="${ui.esc(current)}">`;
    return `
      <div class="text-field${edited ? ' is-edited' : ''}" data-search="${ui.esc((f.name + ' ' + current + ' ' + f.value).toLowerCase())}">
        <div class="text-field-head">
          <small>${ui.esc(f.name)}</small>
          ${edited ? `<span class="text-edited">изменено</span><button type="button" class="btn-ghost text-reset" data-reset-text="${f.path}" title="Было: ${ui.esc(String(f.value))}">${ui.icon('refresh')} Вернуть как было</button>` : ''}
        </div>
        ${input}
      </div>`;
  }

  function siteTexts(arg) {
    A.setTitle('Тексты сайта');
    let section = SECTIONS.some(([k]) => k === arg) ? arg : 'common';
    let query = '';

    const draw = () => {
      const list = fields(section);
      const groups = [...new Set(list.map((f) => f.group))];
      const editedCount = (k) => Object.keys(ui.textEdits.all()).filter((p) => p.split('.')[0] === k).length;
      A.$content.innerHTML = `
        <section class="adm-card adm-card-pad texts-intro">
          <p class="muted">Здесь можно поменять любую надпись на сайте. Изменения сохраняются сразу и видны на сайте при следующем открытии страницы.
            Слова в фигурных скобках — <code>{count}</code>, <code>{name}</code> — сайт заменяет числом или названием, их не удаляйте.
            <code>{count|товар|товара|товаров}</code> — слово в нужной форме для числа. <code>&lt;br&gt;</code> — перенос строки.</p>
          <div class="texts-search">${ui.icon('search')}<input class="input" type="search" id="texts-q" placeholder="Найти текст на всех страницах…" value="${ui.esc(query)}"></div>
        </section>
        <nav class="texts-tabs" aria-label="Разделы сайта">
          ${SECTIONS.map(([k, label]) => `<button type="button" data-section="${k}" class="${k === section ? 'is-active' : ''}">${label}${editedCount(k) ? ` <span class="count">${editedCount(k)}</span>` : ''}</button>`).join('')}
        </nav>
        <div id="texts-list">
          ${groups
            .map(
              (g) => `
            <section class="adm-card adm-card-pad text-group">
              <h3>${ui.esc(g)}</h3>
              ${list
                .filter((f) => f.group === g)
                .map(field)
                .join('')}
            </section>`
            )
            .join('')}
        </div>`;
      if (query) filter();
    };

    /** Поиск: ищет по всем разделам и показывает найденное. */
    const filter = () => {
      const q = query.toLowerCase();
      const box = document.getElementById('texts-list');
      if (!q) return draw();
      const found = SECTIONS.flatMap(([k, label]) => fields(k).map((f) => Object.assign(f, { group: label + ' → ' + f.group })))
        .filter((f) => (f.name + ' ' + ui.t(f.path) + ' ' + f.value).toLowerCase().includes(q))
        .slice(0, 80);
      box.innerHTML = found.length
        ? `<section class="adm-card adm-card-pad text-group"><h3>Найдено: ${found.length}</h3>${found
            .map((f) => field(Object.assign({}, f, { name: f.group + ' › ' + f.name })))
            .join('')}</section>`
        : '<div class="adm-empty">Ничего не найдено</div>';
    };

    draw();

    A.$content.onclick = (e) => {
      const tab = e.target.closest('[data-section]');
      if (tab) {
        section = tab.dataset.section;
        query = '';
        history.replaceState(null, '', '#texts/' + section);
        return ui.transition(draw, 'section');
      }
      const reset = e.target.closest('[data-reset-text]');
      if (reset) {
        ui.textEdits.reset(reset.dataset.resetText);
        ui.toast({ title: 'Текст возвращён', icon: 'refresh' });
        query ? filter() : draw();
      }
    };
    A.$content.oninput = ui.debounce((e) => {
      if (e.target.id !== 'texts-q') return;
      query = e.target.value.trim();
      filter();
    }, 200);
    A.$content.onchange = (e) => {
      const input = e.target.closest('[data-text]');
      if (!input) return;
      const path = input.dataset.text;
      const original = ui.textEdits.original(path);
      let value = typeof original === 'number' ? Number(input.value) || 0 : input.value;
      if (value === '' || value === 0) value = original; // пустое поле — вернуть исходный текст
      if (!ui.textEdits.set(path, value))
        return ui.toast({ title: 'Не удалось сохранить', text: 'Память браузера переполнена.', icon: 'x' });
      if (placeholders(value) !== placeholders(original))
        ui.toast({
          title: 'Проверьте фигурные скобки',
          text: `В исходном тексте: ${placeholders(original) || 'нет'}. Без них сайт не подставит значение.`,
          icon: 'alert'
        });
      else ui.toast({ title: 'Сохранено' });
      const row = input.closest('.text-field');
      row.outerHTML = field({ path, value: original, name: row.querySelector('small').textContent, group: '' });
    };
  }

  A.views.texts = siteTexts;
})();
