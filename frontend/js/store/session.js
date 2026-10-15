(() => {
  const { KEYS, read, write, remove, emit } = App.storage;
  const db = App.db;

  db.session = {
    start(userId) {
      write(KEYS.session, { userId, at: Date.now() });
      emit('session');
    },
    end() {
      remove(KEYS.session);
      emit('session');
    },
    user() {
      const s = read(KEYS.session, null);
      return s ? db.users.safe(db.users.get(s.userId)) : null;
    }
  };
})();
