/* Вход и регистрация. Под формой входа — быстрый вход под демо-аккаунтами (site/demo/data/accounts.js),
   если папка demo есть на сайте. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('auth-root');
  const registering = ui.qs('mode') === 'register';
  const nextParam = ui.qs('next');
  const next = /^(account|checkout|cart|favorites|catalog)\.html$/.test(nextParam || '') ? nextParam : '';
  const alternate = 'login.html' + (registering ? (next ? '?next=' + next : '') : '?mode=register' + (next ? '&next=' + next : ''));
  const field = (name, label, type, autocomplete) =>
    `<div class="field"><label for="auth-${name}">${label}</label><input class="input" id="auth-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" required aria-describedby="err-${name}"${name === 'name' ? ' maxlength="80"' : ''}><span class="field-error" id="err-${name}"></span></div>`;
  root.innerHTML = `
    <div class="auth-side">
      <img src="assets/images/pages/login/auth-side.jpg" alt="" onerror="imgFail(this)">
      <span class="hand">Красота начинается<br>с заботы о себе ♡</span>
    </div>
    <div class="auth-form"><div class="auth-box">
      ${ui.logo(true)}
      <nav class="auth-tabs" aria-label="Вход и регистрация">
        <a href="login.html${next ? '?next=' + next : ''}" ${!registering ? 'aria-current="page"' : ''}>Вход</a>
        <a href="login.html?mode=register${next ? '&next=' + next : ''}" ${registering ? 'aria-current="page"' : ''}>Регистрация</a>
      </nav>
      <h1>${registering ? 'Создать аккаунт' : 'С возвращением'}</h1>
      <p class="lead">${registering ? 'Сохраняйте избранное и следите за своими заказами.' : 'Войдите, чтобы продолжить покупки.'}</p>
      <div id="form-alert" aria-live="polite"></div>
      <form id="auth-form" novalidate>
        ${registering ? field('name', 'Имя', 'text', 'name') : ''}
        ${field('email', 'Email', 'email', 'email')}
        <div class="field"><label for="auth-password">Пароль</label>
          <div class="input-pw"><input class="input" id="auth-password" name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required aria-describedby="err-password"${registering ? ' minlength="8"' : ''}>
          <button type="button" data-eye aria-label="Показать пароль" aria-pressed="false">${ui.icon('eye')}</button></div>
          ${registering ? '<small class="muted">Не менее 8 символов</small>' : ''}
          <span class="field-error" id="err-password"></span>
        </div>
        ${registering ? field('confirm', 'Повторите пароль', 'password', 'new-password') : ''}
        <button class="btn btn-primary btn-block" type="submit">${registering ? 'Зарегистрироваться' : 'Войти'}</button>
      </form>
      <p class="auth-alt">${registering ? 'Уже есть аккаунт?' : 'Нет аккаунта?'} <a href="${alternate}">${registering ? 'Войти' : 'Зарегистрироваться'}</a></p>
      ${
        registering || !(App.seed.users || []).length
          ? ''
          : `
      <div class="demo-accounts">
        <p class="demo-title">Быстрый вход для проверки</p>
        ${App.seed.users
          .map(
            (u) => `
          <button type="button" class="demo-card" data-demo="${u.id}">
            <span class="avatar${u.role === 'admin' ? ' is-admin' : ''}">${u.role === 'admin' ? ui.icon('settings') : ui.esc(u.name.charAt(0))}</span>
            <span class="demo-body"><b>${ui.esc(u.demo.title)}</b><small>${ui.esc(u.demo.text)}</small><code>${ui.esc(u.email)} · ${ui.esc(u.password)}</code></span>
            <span class="demo-go">Войти ${ui.icon('arrow-right')}</span>
          </button>`
          )
          .join('')}
      </div>`
      }
      <p class="auth-local">Аккаунт и заказы сохраняются в этом браузере.</p>
    </div></div>`;
  document.title = (registering ? 'Регистрация' : 'Вход') + ' — ' + App.config.shopName;
  root.querySelectorAll('[data-demo]').forEach((button) =>
    button.addEventListener('click', () => {
      const u = App.seed.users.find((x) => x.id === button.dataset.demo);
      const result = db.users.login(u.email, u.password);
      if (result.error) return ui.toast({ title: result.error, icon: 'x' });
      location.href = next || (result.user.role === 'admin' ? 'admin/index.html' : 'account.html');
    })
  );

  const form = root.querySelector('form');
  const setErr = (name, message) => {
    const input = form.elements[name];
    const field = input.closest('.field');
    field.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', String(!!message));
    field.querySelector('.field-error').textContent = message;
  };
  form.addEventListener('click', (e) => {
    const button = e.target.closest('[data-eye]');
    if (!button) return;
    const input = form.elements.password;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.innerHTML = ui.icon(show ? 'eye-off' : 'eye');
    button.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    button.setAttribute('aria-pressed', String(show));
  });
  form.addEventListener('input', (e) => {
    if (e.target.name) setErr(e.target.name, '');
    document.getElementById('form-alert').textContent = '';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const errors = {
      email: /^\S+@\S+\.\S+$/.test(email) ? '' : 'Введите корректный email',
      password: registering ? (password.length >= 8 ? '' : 'Введите не менее 8 символов') : password ? '' : 'Введите пароль'
    };
    if (registering) {
      const name = form.elements.name.value.trim();
      errors.name = name.length >= 2 && name.length <= 80 ? '' : 'Введите имя от 2 до 80 символов';
      errors.confirm = form.elements.confirm.value === password && password ? '' : 'Пароли не совпадают';
    }
    Object.entries(errors).forEach(([name, message]) => setErr(name, message));
    const first = Object.keys(errors).find((name) => errors[name]);
    if (first) {
      form.elements[first].focus();
      return;
    }
    const result = registering ? db.users.register({ name: form.elements.name.value, email, password }) : db.users.login(email, password);
    if (result.error) {
      document.getElementById('form-alert').innerHTML = `<div class="alert alert-error" role="alert">${ui.esc(result.error)}</div>`;
      return;
    }
    location.href = next || (result.user.role === 'admin' ? 'admin/index.html' : 'account.html');
  });
});
