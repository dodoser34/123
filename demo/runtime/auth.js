/* Быстрый вход существует только в отдельной демонстрационной сборке. */
(() => {
  const { ui, db } = App;
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
  App.extensions.resetText = 'Вернуть демонстрационные товары, фото, отзывы и аккаунты. Изменения этой демо-копии будут удалены.';
  App.extensions.resetLabel = 'Сбросить демо';
})();
