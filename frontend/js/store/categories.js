(() => {
  const { KEYS, read, write, emit } = App.storage;
  const db = App.db;

  db.categories = {
    all: () => read(KEYS.categories, []),
    get: (id) => db.categories.all().find((c) => c.id === id),
    sub(catId, subId) {
      const c = db.categories.get(catId);
      return c && c.subs.find((s) => s.id === subId);
    },
    saveAll(list) {
      write(KEYS.categories, list);
      emit('categories');
    }
  };
})();
