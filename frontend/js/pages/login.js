document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const root = document.getElementById('auth-root');
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !root.animate;
  const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';

  const nextParam = ui.qs('next') || '';
  const next = /^((pages|admin)\/)?[\w-]+\.html([?#][^:]*)?$/.test(nextParam) && !/login\.html/.test(nextParam) ? nextParam : '';
  let mode = ui.qs('mode') === 'register' ? 'register' : 'login';

  const T = ui.t('login');
  const MIN = db.users.MIN_PASSWORD;

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

  const field = (name, label, type, autocomplete) =>
    `<div class="field"><label for="auth-${name}">${label}</label><input class="input" id="auth-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" required aria-describedby="err-${name}"${name === 'name' ? ' maxlength="80"' : ''}><span class="field-error" id="err-${name}"></span></div>`;

  const passwordField = (registering, label = T.fields.password) => `
    <div class="field"><label for="auth-password">${label}</label>
      <div class="input-pw"><input class="input" id="auth-password" name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required aria-describedby="err-password"${registering ? ' minlength="8"' : ''}>
      <button type="button" data-eye aria-label="${T.fields.showPassword}" aria-pressed="false">${ui.icon('eye')}</button></div>
      ${registering ? `<small class="muted">${ui.t('login.fields.passwordHint', { min: MIN })}</small>` : ''}
      <span class="field-error" id="err-password"></span>
    </div>`;

  const extras = App.extensions.auth;

  const forgotLink = (m) =>
    m === 'login' && db.users.forgot ? `<p class="auth-forgot"><a href="#" data-step="reset">${T.forgot}</a></p>` : '';

  function stepContent(step, email) {
    const S = T.steps[step];
    const askEmail = step === 'reset';
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
      ${forgotLink(m)}
      <p class="auth-alt">${t.altQuestion} <a href="${urlFor(t.alt)}" data-mode="${t.alt}">${t.altLink}</a></p>
      ${!registering && extras ? extras.content() : ''}`;
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
  root.classList.add('is-intro');
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

  const fly = (el, frames, options) => el.animate(frames, Object.assign({ easing: EASE_OUT }, options));

  const done = (animation, ms) => Promise.race([animation.finished, new Promise((resolve) => setTimeout(resolve, ms))]);

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

  let step = '';
  function showStep(name, email) {
    step = name;
    return swapTo(stepContent(name, email), 1, false).then(() => {
      const input = $('#auth-code') || $('#auth-email');
      if (input) input.focus();
    });
  }

  async function swapTo(html, dir, flourish) {
    const swap = $('.auth-swap');
    if (calm()) {
      swap.innerHTML = html;
      return;
    }
    if (!flourish) return swapContent(swap, html, dir);

    fly($('.auth-light'), [{ transform: `translateX(${-dir * 100}%)` }, { transform: `translateX(${dir * 100}%)` }], { duration: 1100 });
    const decor = $('.auth-decor');
    if (decor) fly(decor, [{ opacity: 0.4 }, { opacity: 0.25 }, { opacity: 0.4 }], { duration: 1200 });

    return swapContent(swap, html, dir);
  }

  async function swapContent(swap, html, dir) {

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

    swap.innerHTML = html;
    swap.style.height = '';
    const endHeight = swap.offsetHeight;
    done(fly(swap, [{ height: startHeight + 'px' }, { height: endHeight + 'px' }], { duration: 560 }), 700).then(() =>
      swap.classList.remove('is-switching')
    );

    const items = [...swap.children].flatMap((el) => (el.matches('form, .auth-extra') ? [...el.children] : [el]));
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
    const tab = e.target.closest('a[data-mode]');
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
      const send = { verify: db.users.resend, resetEnter: db.users.forgot }[f.dataset.step];
      const res = await send(email);
      return res && res.error ? showError(res.error) : ui.toast({ title: T.resent, icon: 'mail' });
    }
    if (extras && (await extras.click(e, goNext))) return;
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
    const email = name === 'reset' ? f.elements.email.value.trim() : f.dataset.email;
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
        reset: () => db.users.forgot(email),
        resetEnter: () => db.users.resetPassword(email, code, f.elements.password.value)
      })[name]()
    );
    if (res && res.error) return showError(res.error);
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

    if (result.verify) return showStep('verify', result.email || email);
    if (result.error) return showError(result.error);
    goNext(result.user);
  });

});
