/* Быстрый вход существует только в отдельной демонстрационной сборке. */
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
  db.users.requestCode = email => issue(email, 'login');
  db.users.forgot = email => issue(email, 'reset');
  db.users.loginWithCode = (email, code) => {
    if (!consume(email, code, 'login')) return { error: 'Неверный или устаревший тестовый код' };
    const user = userByEmail(email);
    if (!user) return db.users.register({ name: emailKey(email).split('@')[0].slice(0, 80), email, password: 'Demo-code-246810' });
    if (user.blocked) return { error: 'Демо-аккаунт заблокирован' };
    db.session.start(user.id);
    return { user: db.users.safe(user) };
  };
  db.users.resetPassword = (email, code, password) => {
    if (!consume(email, code, 'reset')) return { error: 'Неверный или устаревший тестовый код' };
    const user = userByEmail(email);
    if (!user || user.blocked) return { error: 'Демо-аккаунт недоступен' };
    if (password.length < db.users.MIN_PASSWORD) return { error: 'Слишком короткий пароль' };
    db.users.update(user.id, { passwordHash: App.storage.pwHash(user.id, password) });
    db.session.start(user.id);
    return { user: db.users.safe(db.users.get(user.id)) };
  };
  App.texts.login.steps.codeEnter.lead = 'Демо: письма не отправляются. Тестовый код для <b>{email}</b>: 246810.';
  App.texts.login.steps.resetEnter.lead = 'Демо: используйте тестовый код 246810 и придумайте пароль для этой локальной копии.';
  App.extensions.auth = {
    otherWays: (mode, googleLogo) => `${mode === 'login' ? '<p class="auth-forgot"><a href="#" data-step="reset">Забыли пароль?</a></p>' : ''}
      <div class="auth-or"><span>или</span></div>
      <div class="auth-ways">
        <button type="button" class="btn btn-secondary btn-block auth-google" data-google-demo>${googleLogo}Войти через Google</button>
        <button type="button" class="btn btn-ghost btn-block" data-step="code">${ui.icon('mail')} Войти по коду из письма</button>
      </div><p class="muted demo-auth-note">Демонстрация: Google не подключён, письма не отправляются.</p>`,
    content: () => `<div class="auth-extra demo-accounts">
      <p class="demo-title">Быстрый вход для проверки</p>
      ${(App.seed.users || []).map(user => `<button type="button" class="demo-card" data-demo="${ui.esc(user.id)}">
        <span class="avatar${user.role === 'admin' ? ' is-admin' : ''}">${user.role === 'admin' ? ui.icon('settings') : ui.esc(user.name.charAt(0))}</span>
        <span class="demo-body"><b>${ui.esc(user.demo.title)}</b><small>${ui.esc(user.demo.text)}</small><code>${ui.esc(user.email)} · ${ui.esc(user.password)}</code></span>
        <span class="demo-go">Войти ${ui.icon('arrow-right')}</span></button>`).join('')}</div>`,
    async click(event, goNext) {
      if (event.target.closest('[data-google-demo]')) {
        ui.toast({ title: 'Вход через Google', text: 'Это демонстрация. Для настоящего входа подключите API и настройте Google OAuth на сервере.', icon: 'info' });
        return true;
      }
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
