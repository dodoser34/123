(() => {
  const ui = App.ui;

  ui.modal = (html, opts) => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><button class="modal-close" type="button" aria-label="${ui.t('common.modal.close')}">${ui.icon('x')}</button>${html}</div>`;
    document.body.appendChild(m);
    document.body.classList.add('no-scroll');
    const close = () => {
      m.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      setTimeout(() => m.remove(), 220);
      opts && opts.onClose && opts.onClose();
    };
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('.modal-close')) close();
    });
    m.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    requestAnimationFrame(() => {
      m.classList.add('is-open');
      const f = m.querySelector('input, textarea, select, button:not(.modal-close)');
      f && f.focus();
    });
    return { el: m, close };
  };

  ui.prompt = (title, labelText, placeholder = '') =>
    new Promise((resolve) => {
      let done = false;
      const md = ui.modal(
        `<h3>${ui.esc(title)}</h3>
        <form class="prompt-form" novalidate>
          <div class="field"><label for="prompt-input">${ui.esc(labelText)}</label><input class="input" id="prompt-input" maxlength="60" placeholder="${ui.esc(placeholder)}" required></div>
          <div class="modal-actions"><button class="btn btn-secondary btn-sm" type="button" data-no>${ui.t('common.modal.cancel')}</button><button class="btn btn-primary btn-sm" type="submit">${ui.t('common.modal.ok')}</button></div>
        </form>`,
        { onClose: () => !done && resolve(null) }
      );
      md.el.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const value = md.el.querySelector('input').value.trim();
        if (!value) return md.el.querySelector('input').focus();
        done = true;
        resolve(value);
        md.close();
      };
      md.el.querySelector('[data-no]').onclick = () => md.close();
    });
  ui.confirm = (text, okText) =>
    new Promise((resolve) => {
      const md = ui.modal(
        `<h3>${ui.t('common.modal.confirmTitle')}</h3><p class="muted modal-text">${ui.esc(text)}</p>
      <div class="modal-actions"><button class="btn btn-secondary btn-sm" data-no>${ui.t('common.modal.cancel')}</button><button class="btn btn-danger btn-sm" data-yes>${ui.esc(okText || ui.t('common.modal.delete'))}</button></div>`,
        { onClose: () => resolve(false) }
      );
      md.el.querySelector('[data-yes]').onclick = () => {
        resolve(true);
        md.close();
      };
      md.el.querySelector('[data-no]').onclick = () => md.close();
    });
})();
