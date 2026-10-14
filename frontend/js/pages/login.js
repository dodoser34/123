/* Вход и регистрация. Нужны для оформления заказа, личного кабинета и админки (core/auth-guard.js), смотреть сайт можно без входа.
   С сервером (store/remote.js) добавляются: подтверждение почты кодом после регистрации, вход по коду из письма,
   «Забыли пароль?» и вход через Google; шаги с кодом показываются на месте формы.
   Вкладки «Вход» ⇄ «Регистрация» переключаются без перезагрузки: старая форма уходит в сторону, высота плавно
   перетекает, новые поля «вплывают» по очереди, по фото пробегает блик, меняется надпись.
   Под формой входа — быстрый вход под демо-аккаунтами (frontend/demo/data/accounts.js), если папка demo есть на сайте. */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('auth-root');
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !root.animate;
  const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';

  // вернуться можно только на страницу этого же сайта: index.html, pages/catalog.html?cat=herbs, admin/index.html
  const nextParam = ui.qs('next') || '';
  const next = /^((pages|admin)\/)?[\w-]+\.html([?#][^:]*)?$/.test(nextParam) && !/login\.html/.test(nextParam) ? nextParam : '';
  let mode = ui.qs('mode') === 'register' ? 'register' : 'login';

  const T = ui.t('login'); // тексты — texts/…/login.js
  const MIN = db.users.MIN_PASSWORD;
  // alt — на какую вкладку ведёт ссылка под формой
  const MODES = {
    login: Object.assign({ alt: 'register' }, T.modes.login),
    register: Object.assign({ alt: 'login' }, T.modes.register)
  };

  const urlFor = (m) => {
    const p = new URLSearchParams();
    if (m === 'register') p.set('mode', 'register');
    if (next) p.set('next', next);
    return ui.page('login') + (p.toString() ? '?' + p : '');
  };

  /* ---------- Разметка ---------- */
  const field = (name, label, type, autocomplete) =>
    `<div class="field"><label for="auth-${name}">${label}</label><input class="input" id="auth-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" required aria-describedby="err-${name}"${name === 'name' ? ' maxlength="80"' : ''}><span class="field-error" id="err-${name}"></span></div>`;

  const passwordField = (registering, label = T.fields.password) => `
    <div class="field"><label for="auth-password">${label}</label>
      <div class="input-pw"><input class="input" id="auth-password" name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required aria-describedby="err-password"${registering ? ' minlength="8"' : ''}>
      <button type="button" data-eye aria-label="${T.fields.showPassword}" aria-pressed="false">${ui.icon('eye')}</button></div>
      ${registering ? `<small class="muted">${ui.t('login.fields.passwordHint', { min: MIN })}</small>` : ''}
      <span class="field-error" id="err-password"></span>
    </div>`;

  const demoAccounts = () =>
    (App.seed.users || []).length
      ? `
      <div class="demo-accounts">
        <p class="demo-title">${T.demo.title}</p>
        ${App.seed.users
          .map(
            (u) => `
          <button type="button" class="demo-card" data-demo="${u.id}">
            <span class="avatar${u.role === 'admin' ? ' is-admin' : ''}">${u.role === 'admin' ? ui.icon('settings') : ui.esc(u.name.charAt(0))}</span>
            <span class="demo-body"><b>${ui.esc(u.demo.title)}</b><small>${ui.esc(u.demo.text)}</small><code>${ui.esc(u.email)} · ${ui.esc(u.password)}</code></span>
            <span class="demo-go">${T.demo.go} ${ui.icon('arrow-right')}</span>
          </button>`
          )
          .join('')}
      </div>`
      : '';

  const GOOGLE_LOGO =
    '<svg class="google-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  /** Другие способы входа — только когда сайт работает с сервером. */
  function otherWays(m) {
    if (!App.remote.enabled) return '';
    const google = db.users.googleUrl(next);
    return `
      ${m === 'login' ? `<p class="auth-forgot"><a href="#" data-step="reset">${T.forgot}</a></p>` : ''}
      <div class="auth-or"><span>${T.or}</span></div>
      <div class="auth-ways">
        ${google ? `<a class="btn btn-secondary btn-block auth-google" href="${google}">${GOOGLE_LOGO}${T.google}</a>` : ''}
        <button type="button" class="btn btn-ghost btn-block" data-step="code">${ui.icon('mail')} ${T.codeLink}</button>
      </div>`;
  }

  /** Шаги с кодом из письма: verify — подтверждение почты, code/codeEnter — вход по коду, reset/resetEnter — новый пароль. */
  function stepContent(step, email) {
    const S = T.steps[step];
    const askEmail = step === 'code' || step === 'reset';
    const askCode = !askEmail;
    return `
      <h1>${S.title}</h1>
      <p class="lead">${ui.t('login.steps.' + step + '.lead', { email: ui.esc(email) })}</p>
      <div id="form-alert" aria-live="polite"></div>
      <form id="auth-form" data-step="${step}" data-email="${ui.esc(email)}" novalidate>
        ${askEmail ? field('email', T.fields.email, 'email', 'email') : ''}
        ${
          askCode
            ? `<div class="field"><label for="auth-code">${T.codeField}</label><input class="input auth-code" id="auth-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required aria-describedby="err-code"><span class="field-error" id="err-code"></span></div>`
            : ''
        }
        ${step === 'resetEnter' ? passwordField(true, T.newPassword) : ''}
        <button class="btn btn-primary btn-block" type="submit">${S.submit}</button>
      </form>
      <p class="auth-alt">${askCode ? `<button type="button" class="link-btn" data-resend>${T.resend}</button> · ` : ''}<a href="#" data-back>${T.back}</a></p>`;
  }

  /** Меняющаяся часть: заголовок, форма, ссылка на другую вкладку, демо-аккаунты. */
  function content(m) {
    const t = MODES[m];
    const registering = m === 'register';
    return `
      <h1>${t.title}</h1>
      <p class="lead">${t.lead}</p>
      <div id="form-alert" aria-live="polite"></div>
      <form id="auth-form" novalidate>
        ${registering ? field('name', T.fields.name, 'text', 'name') : ''}
        ${field('email', T.fields.email, 'email', 'email')}
        ${passwordField(registering)}
        ${registering ? field('confirm', T.fields.confirm, 'password', 'new-password') : ''}
        <button class="btn btn-primary btn-block" type="submit">${t.submit}</button>
      </form>
      ${otherWays(m)}
      <p class="auth-alt">${t.altQuestion} <a href="${urlFor(t.alt)}" data-mode="${t.alt}">${t.altLink}</a></p>
      ${registering ? '' : demoAccounts()}`;
  }

  root.innerHTML = `
    <div class="auth-side">
      <img src="${ui.base}assets/images/pages/login/auth-side.jpg" alt="">
      <span class="auth-light" aria-hidden="true"></span>
      <span class="hand auth-caption">${MODES[mode].caption}</span>
    </div>
    <div class="auth-form">
      ${ui.decor('chamomile-sprig.png', 'botanical auth-decor')}
      <div class="auth-box">
        ${ui.logo(true)}
        <nav class="auth-tabs tabs" aria-label="${T.tabsLabel}">
          ${Object.keys(MODES)
            .map((m) => `<a href="${urlFor(m)}" data-mode="${m}">${MODES[m].tab}</a>`)
            .join('')}
        </nav>
        <div class="auth-swap">${content(mode)}</div>
        <p class="auth-local">${App.remote.enabled ? T.noteServer : T.note}</p>
      </div>
    </div>`;
  root.classList.add('is-intro'); // первое появление — каскадом из CSS (pages/login.css)
  setTimeout(() => root.classList.remove('is-intro'), 1600);

  const $ = (sel) => root.querySelector(sel);
  const tabs = $('.auth-tabs');

  function syncTabs() {
    ui.$$('[data-mode]', tabs).forEach((a) => {
      const on = a.dataset.mode === mode;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    ui.tabsInk(tabs);
    document.title = MODES[mode].tab + ' — ' + App.config.shopName;
  }
  syncTabs();

  /* ---------- Переключение вкладок ---------- */
  const fly = (el, frames, options) => el.animate(frames, Object.assign({ easing: EASE_OUT }, options));
  /** Конец анимации, но не позже чем через ms: если браузер притормозил анимации (вкладка в фоне), форма всё равно сменится. */
  const done = (animation, ms) => Promise.race([animation.finished, new Promise((resolve) => setTimeout(resolve, ms))]);

  /** Надпись на фото: тает с размытием и проявляется новой. */
  function swapCaption(html) {
    const caption = $('.auth-caption');
    if (calm()) return (caption.innerHTML = html);
    const out = fly(
      caption,
      [
        { opacity: 1, filter: 'blur(0)' },
        { opacity: 0, filter: 'blur(8px)', transform: 'translateY(-10px)' }
      ],
      { duration: 300, fill: 'forwards' }
    );
    done(out, 400).then(() => {
      out.cancel();
      caption.innerHTML = html;
      fly(
        caption,
        [
          { opacity: 0, filter: 'blur(8px)', transform: 'translateY(14px)' },
          { opacity: 1, filter: 'blur(0)', transform: 'none' }
        ],
        {
          duration: 900
        }
      );
    });
  }

  async function switchMode(m) {
    if (m === mode && !step) return;
    const dir = m === 'register' ? 1 : -1;
    const changed = m !== mode;
    mode = m;
    step = '';
    history.replaceState(null, '', urlFor(m));
    syncTabs();
    if (changed) swapCaption(MODES[m].caption);
    return swapTo(content(m), dir, changed);
  }

  /** Показать шаг с кодом из письма на месте формы. */
  let step = '';
  function showStep(name, email) {
    step = name;
    return swapTo(stepContent(name, email), 1, false).then(() => {
      const input = $('#auth-code') || $('#auth-email');
      if (input) input.focus();
    });
  }

  /** Сменить содержимое под вкладками: старое уходит в сторону, высота перетекает, новое «вплывает». */
  async function swapTo(html, dir, flourish) {
    const swap = $('.auth-swap');
    if (calm()) {
      swap.innerHTML = html;
      return;
    }
    if (!flourish) return swapContent(swap, html, dir);

    // по фото пробегает мягкий блик, ветка рядом с формой качается в сторону перехода
    fly($('.auth-light'), [{ transform: `translateX(${-dir * 100}%)` }, { transform: `translateX(${dir * 100}%)` }], { duration: 1100 });
    const decor = $('.auth-decor');
    if (decor) fly(decor, [{ opacity: 0.4 }, { opacity: 0.25 }, { opacity: 0.4 }], { duration: 1200 });

    return swapContent(swap, html, dir);
  }

  async function swapContent(swap, html, dir) {
    // 1. старое содержимое уходит в противоположную сторону и размывается
    const startHeight = swap.offsetHeight;
    swap.classList.add('is-switching');
    swap.style.height = startHeight + 'px';
    const leaving = [...swap.children].map((el, i) =>
      fly(el, [{ opacity: 1 }, { opacity: 0, transform: `translateX(${-dir * 32}px)`, filter: 'blur(6px)' }], {
        duration: 240,
        delay: i * 25,
        easing: 'cubic-bezier(.4, 0, 1, 1)',
        fill: 'forwards'
      })
    );
    await done({ finished: Promise.all(leaving.map((a) => a.finished)) }, 500);

    // 2. новое содержимое, высота перетекает к новой
    swap.innerHTML = html;
    swap.style.height = '';
    const endHeight = swap.offsetHeight;
    done(fly(swap, [{ height: startHeight + 'px' }, { height: endHeight + 'px' }], { duration: 560 }), 700).then(() =>
      swap.classList.remove('is-switching')
    );

    // 3. элементы «вплывают» по очереди с той стороны, где стоит выбранная вкладка
    const items = [...swap.children].flatMap((el) => (el.matches('form, .demo-accounts') ? [...el.children] : [el]));
    items.forEach((el, i) =>
      fly(
        el,
        [
          { opacity: 0, transform: `translateX(${dir * 36}px)`, filter: 'blur(6px)' },
          { opacity: 1, transform: 'none', filter: 'blur(0)' }
        ],
        {
          duration: 700,
          delay: 80 + i * 60,
          fill: 'backwards'
        }
      )
    );
  }

  /* ---------- События (делегирование: форма перерисовывается при смене вкладки) ---------- */
  const form = () => $('#auth-form');
  const setErr = (name, message) => {
    const input = form().elements[name];
    const box = input.closest('.field');
    box.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', String(!!message));
    box.querySelector('.field-error').textContent = message;
  };
  const goNext = (user) => (location.href = next ? ui.base + next : ui.page(user.role === 'admin' ? 'admin' : 'home'));

  const showError = (message) => ($('#form-alert').innerHTML = `<div class="alert alert-error" role="alert">${ui.esc(message)}</div>`);

  root.addEventListener('click', async (e) => {
    const tab = e.target.closest('a[data-mode]'); // вкладки и ссылка «Зарегистрироваться» / «Войти»
    if (tab) {
      e.preventDefault();
      return switchMode(tab.dataset.mode);
    }
    const stepLink = e.target.closest('[data-step]:not(form)');
    if (stepLink) {
      e.preventDefault();
      return showStep(stepLink.dataset.step, '');
    }
    if (e.target.closest('[data-back]')) {
      e.preventDefault();
      return switchMode(mode);
    }
    if (e.target.closest('[data-resend]')) {
      const f = form();
      const email = f.dataset.email;
      const send = { verify: db.users.resend, codeEnter: db.users.requestCode, resetEnter: db.users.forgot }[f.dataset.step];
      const res = await send(email);
      return res && res.error ? showError(res.error) : ui.toast({ title: T.resent, icon: 'mail' });
    }
    const demo = e.target.closest('[data-demo]');
    if (demo) {
      const u = App.seed.users.find((x) => x.id === demo.dataset.demo);
      const result = await db.users.login(u.email, u.password);
      if (result.error) return ui.toast({ title: result.error, icon: 'x' });
      return goNext(result.user);
    }
    const eye = e.target.closest('[data-eye]');
    if (eye) {
      const input = form().elements.password;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.innerHTML = ui.icon(show ? 'eye-off' : 'eye');
      eye.setAttribute('aria-label', show ? T.fields.hidePassword : T.fields.showPassword);
      eye.setAttribute('aria-pressed', String(show));
    }
  });

  root.addEventListener('input', (e) => {
    if (!e.target.closest('#auth-form')) return;
    if (e.target.name) setErr(e.target.name, '');
    $('#form-alert').textContent = '';
  });

  /** Отправка формы: кнопка блокируется, пока сервер не ответит. */
  async function busy(f, task) {
    const button = f.querySelector('[type=submit]');
    button.disabled = true;
    try {
      return await task();
    } finally {
      button.disabled = false;
    }
  }

  async function submitStep(f) {
    const name = f.dataset.step;
    const email = name === 'code' || name === 'reset' ? f.elements.email.value.trim() : f.dataset.email;
    if (f.elements.email) {
      setErr('email', /^\S+@\S+\.\S+$/.test(email) ? '' : T.errors.email);
      if (!/^\S+@\S+\.\S+$/.test(email)) return f.elements.email.focus();
    }
    const code = f.elements.code ? f.elements.code.value.replace(/\D/g, '') : '';
    if (f.elements.code) {
      setErr('code', code.length === 6 ? '' : T.codeError);
      if (code.length !== 6) return f.elements.code.focus();
    }
    if (name === 'resetEnter') {
      const ok = f.elements.password.value.length >= MIN;
      setErr('password', ok ? '' : ui.t('login.errors.passwordShort', { min: MIN }));
      if (!ok) return f.elements.password.focus();
    }
    const res = await busy(f, () =>
      ({
        verify: () => db.users.verify(email, code),
        code: () => db.users.requestCode(email),
        codeEnter: () => db.users.loginWithCode(email, code),
        reset: () => db.users.forgot(email),
        resetEnter: () => db.users.resetPassword(email, code, f.elements.password.value)
      })[name]()
    );
    if (res && res.error) return showError(res.error);
    if (name === 'code') return showStep('codeEnter', email);
    if (name === 'reset') return showStep('resetEnter', email);
    goNext(res.user);
  }

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form();
    if (f.dataset.step) return submitStep(f);
    const registering = mode === 'register';
    const email = f.elements.email.value.trim();
    const password = f.elements.password.value;
    const errors = {
      email: /^\S+@\S+\.\S+$/.test(email) ? '' : T.errors.email,
      password: registering
        ? password.length >= MIN
          ? ''
          : ui.t('login.errors.passwordShort', { min: MIN })
        : password
          ? ''
          : T.errors.passwordEmpty
    };
    if (registering) {
      const name = f.elements.name.value.trim();
      errors.name = name.length >= 2 && name.length <= 80 ? '' : T.errors.name;
      errors.confirm = f.elements.confirm.value === password && password ? '' : T.errors.confirm;
    }
    Object.entries(errors).forEach(([name, message]) => setErr(name, message));
    const first = Object.keys(errors).find((name) => errors[name]);
    if (first) return f.elements[first].focus();

    const result = await busy(f, () =>
      registering ? db.users.register({ name: f.elements.name.value, email, password }) : db.users.login(email, password)
    );
    // сервер просит подтвердить почту — показываем шаг с кодом
    if (result.verify) return showStep('verify', result.email || email);
    if (result.error) return showError(result.error);
    goNext(result.user);
  });

  /* ---------- Возврат после входа через Google: #token=…&next=… или #error=… ---------- */
  const back = new URLSearchParams(location.hash.slice(1));
  if (back.has('token') || back.has('error')) {
    history.replaceState(null, '', location.pathname + location.search);
    const user = db.session.user();
    const target = back.get('next') || '';
    if (back.has('token') && user) {
      location.href =
        /^((pages|admin)\/)?[\w-]+\.html([?#][^:]*)?$/.test(target) && !/login\.html/.test(target)
          ? ui.base + target
          : ui.page(user.role === 'admin' ? 'admin' : 'home');
    } else showError(back.get('error') === 'blocked' ? T.blockedError : T.googleError);
  }
});
