/* Избранное */
(() => {
  const { KEYS, read, write, emit } = App.storage;
  const db = App.db;

  db.favs = {
    all: () => read(KEYS.favs, []),
    has: (id) => db.favs.all().includes(id),
    /** Добавить или убрать товар; возвращает true, если товар теперь в избранном. */
    toggle(id) {
      const list = db.favs.all();
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else list.push(id);
      write(KEYS.favs, list);
      emit('favs', { id, active: i < 0 });
      return i < 0;
    },
    remove(id) {
      write(
        KEYS.favs,
        db.favs.all().filter((x) => x !== id)
      );
      emit('favs', { id });
    }
  };
})();
