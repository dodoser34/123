(() => {
  const ui = (App.ui = {});
  const base = document.documentElement.dataset.base || '';
  ui.base = base;

  ui.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  ui.url = (p) => (!p ? '' : /^(data:|https?:|blob:|\/)/.test(p) ? p : base + p);

  ui.price = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)).replace(/\s/g, ' ') + ' ₸';

  ui.plural = (n, one, few, many) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  ui.date = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  ui.qs = (name) => new URLSearchParams(location.search).get(name);
  ui.$ = (sel, root) => (root || document).querySelector(sel);
  ui.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  ui.debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  ui.page = (name, params) =>
    base +
    (name === 'home' ? 'index.html' : name === 'admin' ? 'admin/index.html' : 'pages/' + name + '.html') +
    (params ? '?' + new URLSearchParams(params).toString() : '');
  ui.productUrl = (p) => ui.page('product', { slug: p.slug });
  ui.catalogUrl = (params) => ui.page('catalog', params);
  ui.contactLink = (subject) => 'mailto:' + App.config.email + '?subject=' + encodeURIComponent(subject || ui.t('common.mailSubject'));

  ui.maskPhone = (value) => {
    const raw = String(value || '').trim();
    let d = raw.replace(/\D/g, '');

    if (!raw.startsWith('+') && d.length === 10 && d.startsWith('7')) d = '7' + d;
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d && !d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    const parts = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    let out = d ? '+7' : '';
    if (parts[0]) out += ' (' + parts[0] + (parts[1] ? ')' : '');
    if (parts[1]) out += ' ' + parts[1];
    if (parts[2]) out += '-' + parts[2];
    if (parts[3]) out += '-' + parts[3];
    return out;
  };

  ui.fixPhone = (value) => {
    const d = String(value || '').replace(/\D/g, '');
    return d.length === 10 ? ui.maskPhone('+7' + d) : value;
  };
  ui.isPhoneComplete = (value) => String(value || '').replace(/\D/g, '').length === 11;
})();
