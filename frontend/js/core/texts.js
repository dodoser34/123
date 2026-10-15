(() => {
  const ui = App.ui;
  const texts = App.texts;

  const lookup = (key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), texts);

  ui.t = (key, vars) => {
    const value = lookup(key);
    if (value == null) {
      console.warn('Нет текста «' + key + '» — добавьте его в frontend/texts/');
      return key;
    }
    if (typeof value !== 'string') return value;
    if (!vars) return value;
    return value
      .replace(/\{(\w+)\|([^}]+)\}/g, (m, name, forms) => {
        const [one, few, many] = forms.split('|');
        return ui.plural(Number(vars[name]) || 0, one, few || one, many || few || one);
      })
      .replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  };

  const ATTRS = { placeholder: 'placeholder', label: 'aria-label', alt: 'alt', title: 'title' };

  ui.applyTexts = (root = document) => {
    ui.$$('[data-t]', root).forEach((el) => (el.innerHTML = ui.t(el.dataset.t)));
    Object.entries(ATTRS).forEach(([name, attr]) =>
      ui.$$(`[data-t-${name}]`, root).forEach((el) => el.setAttribute(attr, ui.t(el.getAttribute('data-t-' + name))))
    );
  };

  ui.applyMeta = (section) => {
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
