(() => {
  const { P, KEYS, read, write, clone, emit } = App.storage;
  const db = App.db;
  if (!App.apiUrl && read(KEYS.categories, null) === null) write(KEYS.categories, clone(App.seed.categories));
  db.reset = () => {
    ['products', 'orders', 'reviews', 'cart', 'favs'].forEach(key => write(KEYS[key], []));
    write(KEYS.categories, clone(App.seed.categories));
    emit('reset');
  };
  db.usage = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(P)) total += (localStorage.getItem(key) || '').length * 2;
    }
    return total;
  };
  window.addEventListener('storage', event => {
    if (event.key && event.key.startsWith(P)) emit(event.key.slice(P.length));
  });
})();
