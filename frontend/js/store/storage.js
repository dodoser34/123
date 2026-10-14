/* Хранилище на localStorage — общая «полка» для всех частей App.db.
   В локальном режиме пароли, роли и заказы хранятся в браузере пользователя.
   При подключении бэкенда заменяется реализация файлов store/*.js — страницы менять не нужно. */
(() => {
  const P = App.storagePrefix || 'kbch.v1.';
  const KEYS = {
    products: 'products',
    categories: 'categories',
    users: 'users',
    session: 'session',
    cart: 'cart',
    favs: 'favs',
    orders: 'orders',
    reviews: 'reviews',
    version: 'data-version',
    voter: 'voter-id'
  };

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(P + key);
      return value == null ? fallback : JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(P + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(e);
      if (App.ui && App.ui.toast) {
        App.ui.toast({ title: App.ui.t('common.errors.storageTitle'), text: App.ui.t('common.errors.storageText'), icon: 'x' });
      }
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(P + key);
  }

  /** Сообщить страницам, что данные изменились (событие store:change). */
  function emit(type, detail) {
    document.dispatchEvent(new CustomEvent('store:change', { detail: Object.assign({ type }, detail || {}) }));
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const today = () => new Date().toISOString().slice(0, 10);

  // Простой синхронный хеш (cyrb53) — для локального режима, не криптостойкий.
  function hash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /** Хеш пароля привязан к id пользователя, поэтому смена email не ломает вход. */
  const pwHash = (userId, password) => hash(userId + '::' + password, 7);

  App.storage = { P, KEYS, read, write, remove, emit, uid, clone, today, hash, pwHash };
  App.db = {};
})();
