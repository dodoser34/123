/* Тексты сайта: сами тексты лежат в frontend/texts/<язык>/ (по файлу на раздел), здесь — как их достать и вставить.
   • ui.t('catalog.empty.title') — текст по «адресу» раздел.ключ.
   • ui.t('catalog.found', { count: 5 }) — с подстановкой: {count} → 5,
     {count|товар|товара|товаров} → форма слова для числа count («5 товаров»).
   • В HTML: <h1 data-t="about.title"></h1> — текст подставится при загрузке.
     Атрибуты: data-t-placeholder, data-t-label (aria-label), data-t-alt, data-t-title.
   • Заголовок вкладки и описание страницы берутся из <раздел>.meta (title, description).
   • Правки из админки («Тексты сайта») хранятся отдельно и накладываются поверх файлов texts/ — см. ui.textEdits. */
(() => {
  const ui = App.ui;
  const texts = App.texts;
  const EDITS_KEY = 'kbch.v1.text-edits';
  const defaults = (App.textDefaults = {}); // исходные тексты из файлов — для «вернуть как было»
  const ready = {};

  const readEdits = () => {
    try {
      return JSON.parse(localStorage.getItem(EDITS_KEY)) || {};
    } catch (e) {
      return {};
    }
  };
  let edits = readEdits();

  const clone = (v) => JSON.parse(JSON.stringify(v));
  function setPath(root, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const node = parts.reduce((n, k) => (n == null ? n : n[k]), root);
    if (node != null && typeof node === 'object' && last in node) node[last] = value;
  }

  /* Правки текстов вставляются как HTML, поэтому в них оставляются только <b>, <strong>, <i>, <em>, <br>, <small>
     без атрибутов — остальное становится обычным текстом (защита от XSS; на сервере та же очистка). */
  const ALLOWED_TAGS = ['B', 'STRONG', 'I', 'EM', 'BR', 'SMALL'];
  const DROP_TAGS = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH'];
  ui.safeHtml = (html) => {
    if (typeof html !== 'string' || !/[<&]/.test(html)) return html;
    const tpl = document.createElement('template'); // содержимое <template> не выполняется и ничего не загружает
    tpl.innerHTML = html;
    const walk = (node) =>
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1 || DROP_TAGS.includes(ch.tagName.toUpperCase())) return ch.remove();
        walk(ch);
        if (ALLOWED_TAGS.includes(ch.tagName)) Array.from(ch.attributes).forEach((a) => ch.removeAttribute(a.name));
        else ch.replaceWith(...ch.childNodes);
      });
    walk(tpl.content);
    const box = document.createElement('div');
    box.appendChild(tpl.content);
    return box.innerHTML;
  };

  /** Перед первым обращением к разделу запомнить исходные тексты и наложить правки из админки. */
  function prepare(section) {
    if (ready[section] || !texts[section]) return;
    ready[section] = true;
    defaults[section] = clone(texts[section]);
    Object.entries(edits).forEach(([path, value]) => {
      if (path.split('.')[0] === section) setPath(texts, path, ui.safeHtml(value));
    });
  }

  function lookup(key) {
    prepare(key.split('.')[0]);
    return key.split('.').reduce((node, part) => (node == null ? node : node[part]), texts);
  }

  ui.t = (key, vars) => {
    const value = lookup(key);
    if (value == null) {
      console.warn('Нет текста «' + key + '» — добавьте его в frontend/texts/');
      return key;
    }
    if (typeof value !== 'string') return value; // списки и группы текстов
    if (!vars) return value;
    return value
      .replace(/\{(\w+)\|([^}]+)\}/g, (m, name, forms) => {
        const [one, few, many] = forms.split('|');
        return ui.plural(Number(vars[name]) || 0, one, few || one, many || few || one);
      })
      .replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  };

  /** Правки текстов из админки: адрес текста → новый текст. Хранятся в браузере, как товары и заказы. */
  ui.textEdits = {
    all: () => Object.assign({}, edits),
    /** Исходный текст из файла texts/ (без правок). */
    original(path) {
      const section = path.split('.')[0];
      prepare(section);
      return path.split('.').reduce((n, k) => (n == null ? n : n[k]), defaults);
    },
    set(path, value) {
      const original = ui.textEdits.original(path);
      if (value === original) delete edits[path];
      else edits[path] = value;
      setPath(texts, path, value);
      return save();
    },
    reset(path) {
      setPath(texts, path, ui.textEdits.original(path));
      delete edits[path];
      return save();
    }
  };
  function save() {
    try {
      localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
      return true;
    } catch (e) {
      return false;
    }
  }
  // правки, сделанные в другой вкладке (например, в админке), подхватываются при следующем открытии страницы
  window.addEventListener('storage', (e) => {
    if (e.key === EDITS_KEY) edits = readEdits();
  });

  const ATTRS = { placeholder: 'placeholder', label: 'aria-label', alt: 'alt', title: 'title' };

  /** Вставить тексты в разметку: элементы с data-t и data-t-<атрибут>. */
  ui.applyTexts = (root = document) => {
    ui.$$('[data-t]', root).forEach((el) => (el.innerHTML = ui.t(el.dataset.t)));
    Object.entries(ATTRS).forEach(([name, attr]) =>
      ui.$$(`[data-t-${name}]`, root).forEach((el) => el.setAttribute(attr, ui.t(el.getAttribute('data-t-' + name))))
    );
  };

  /** Заголовок вкладки и meta description страницы из <раздел>.meta. */
  ui.applyMeta = (section) => {
    prepare(section);
    const meta = texts[section] && texts[section].meta;
    if (!meta) return;
    if (meta.title) document.title = meta.title.replace('{shop}', App.config.shopName);
    if (meta.description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.content = meta.description;
    }
  };
})();
