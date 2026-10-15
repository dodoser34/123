(() => {
  const { KEYS, read, write, emit, uid, hash, pwHash } = App.storage;
  const db = App.db;

  const EMAIL_RE = /^\S+@\S+\.\S+$/;

  const isOwnerEmail = (email) => (App.config.adminEmails || []).some((e) => String(e).trim().toLowerCase() === email);
  const MIN_PASSWORD = 8;

  const checkPassword = (user, password) =>
    user.passwordHash === pwHash(user.id, password) || user.passwordHash === hash(user.email.toLowerCase() + '::' + password, 7);

  db.users = {
    MIN_PASSWORD,
    all: () => read(KEYS.users, []),
    get: (id) => db.users.all().find((u) => u.id === id),

    register({ name, email, password }) {
      name = String(name || '').trim();
      email = String(email || '')
        .trim()
        .toLowerCase();
      if (name.length < 2 || name.length > 80) return { error: App.ui.t('common.errors.name') };
      if (!EMAIL_RE.test(email)) return { error: App.ui.t('common.errors.email') };
      if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
        return { error: App.ui.t('common.errors.passwordShort', { min: MIN_PASSWORD }) };
      }
      const users = db.users.all();
      if (users.some((u) => u.email === email)) return { error: App.ui.t('common.errors.emailTaken') };

      const id = uid('u');
      const user = {
        id,
        role: isOwnerEmail(email) ? 'admin' : 'customer',
        name,
        email,
        phone: '',
        passwordHash: pwHash(id, password),
        createdAt: new Date().toISOString()
      };
      if (!write(KEYS.users, users.concat(user))) return { error: App.ui.t('common.errors.saveFailed') };
      emit('users', { id });
      db.session.start(id);
      return { user: db.users.safe(user) };
    },

    login(email, password) {
      email = String(email || '')
        .trim()
        .toLowerCase();
      const user = db.users.all().find((u) => u.email === email);
      if (!user || !checkPassword(user, password)) return { error: App.ui.t('common.errors.wrongLogin') };
      if (user.blocked) return { error: App.ui.t('common.errors.blocked') };

      if (user.passwordHash !== pwHash(user.id, password)) db.users.update(user.id, { passwordHash: pwHash(user.id, password) });

      if (user.role !== 'admin' && isOwnerEmail(email)) db.users.update(user.id, { role: 'admin' });
      db.session.start(user.id);
      return { user: db.users.safe(db.users.get(user.id)) };
    },

    update(id, patch) {
      const users = db.users.all();
      const i = users.findIndex((u) => u.id === id);
      if (i < 0) return { error: App.ui.t('common.errors.userNotFound') };
      if (patch.email != null) {
        patch.email = patch.email.trim().toLowerCase();
        if (!EMAIL_RE.test(patch.email)) return { error: App.ui.t('common.errors.emailInvalid') };
        if (users.some((u) => u.email === patch.email && u.id !== id)) return { error: App.ui.t('common.errors.emailUsed') };
      }
      users[i] = Object.assign({}, users[i], patch);
      write(KEYS.users, users);
      emit('users', { id });
      return { user: db.users.safe(users[i]) };
    },

    changePassword(id, oldPassword, newPassword) {
      const user = db.users.get(id);
      if (!user || !checkPassword(user, oldPassword)) return { error: App.ui.t('common.errors.wrongPassword') };
      if (String(newPassword).length < MIN_PASSWORD) return { error: App.ui.t('common.errors.minChars', { min: MIN_PASSWORD }) };
      db.users.update(id, { passwordHash: pwHash(id, newPassword) });
      return { ok: true };
    },

    remove(id) {
      write(
        KEYS.users,
        db.users.all().filter((u) => u.id !== id)
      );
      emit('users');
    },

    deleteAccount(password) {
      const me = db.session.user();
      const user = me && db.users.get(me.id);
      if (!user || !checkPassword(user, password)) return { error: App.ui.t('common.errors.wrongPassword') };
      if (user.role === 'admin') return { error: App.ui.t('account.delete.adminForbidden') };
      db.session.end();
      db.users.remove(user.id);
      return { ok: true };
    },

    safe(user) {
      if (!user) return null;
      const copy = Object.assign({}, user);
      delete copy.passwordHash;
      return copy;
    }
  };
})();
