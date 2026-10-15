(() => {
  const { ui, db } = App;
  const codes = new Map();
  const emailKey = email => String(email).trim().toLowerCase();
  const userByEmail = email => db.users.all().find(user => user.email === emailKey(email));
  const issue = (email, purpose) => {
    codes.set(purpose + ':' + emailKey(email), { expires: Date.now() + 600000 });
    ui.toast({ title: 'Тестовый код: 246810', text: 'Демонстрация: письмо не отправляется.', icon: 'mail' });
    return { status: 'sent', email: emailKey(email) };
  };
  const consume = (email, code, purpose) => {
    const key = purpose + ':' + emailKey(email);
    const challenge = codes.get(key);
    if (!challenge || challenge.expires < Date.now() || code !== '246810') return false;
    codes.delete(key);
    return true;
  };
  db.users.forgot = email => issue(email, 'reset');
  db.users.resetPassword = (email, code, password) => {
    if (!consume(email, code, 'reset')) return { error: 'Неверный или устаревший тестовый код' };
    const user = userByEmail(email);
    if (!user || user.blocked) return { error: 'Демо-аккаунт недоступен' };
    if (password.length < db.users.MIN_PASSWORD) return { error: 'Слишком короткий пароль' };
    db.users.update(user.id, { passwordHash: App.storage.pwHash(user.id, password) });
    db.session.start(user.id);
    return { user: db.users.safe(db.users.get(user.id)) };
  };
  App.texts.login.steps.resetEnter.lead = 'Демо: используйте тестовый код 246810 и придумайте пароль для этой локальной копии.';
  App.extensions.auth = {
    content: () => `<div class="auth-extra demo-accounts">
      <p class="demo-title">Быстрый вход для проверки</p>
      ${(App.seed.users || []).map(user => `<button type="button" class="demo-card" data-demo="${ui.esc(user.id)}">
        <span class="avatar${user.role === 'admin' ? ' is-admin' : ''}">${user.role === 'admin' ? ui.icon('settings') : ui.esc(user.name.charAt(0))}</span>
        <span class="demo-body"><b>${ui.esc(user.demo.title)}</b><small>${ui.esc(user.demo.text)}</small><code>${ui.esc(user.email)} · ${ui.esc(user.password)}</code></span>
        <span class="demo-go">Войти ${ui.icon('arrow-right')}</span></button>`).join('')}</div>`,
    async click(event, goNext) {
      const button = event.target.closest('[data-demo]');
      if (!button) return false;
      const user = App.seed.users.find(user => user.id === button.dataset.demo);
      if (!user) return true;
      const result = await db.users.login(user.email, user.password);
      if (result.error) ui.toast({ title: result.error, icon: 'x' });
      else goNext(result.user);
      return true;
    }
  };
})();
