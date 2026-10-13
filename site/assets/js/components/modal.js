/* Модальные окна и окно подтверждения «Вы уверены?» */
(() => {
  const ui = App.ui;

  ui.modal = (html, opts) => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><button class="modal-close" type="button" aria-label="Закрыть">${ui.icon('x')}</button>${html}</div>`;
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
  ui.confirm = (text, okText) =>
    new Promise((resolve) => {
      const md = ui.modal(
        `<h3>Подтвердите действие</h3><p class="muted" style="margin-bottom:24px">${ui.esc(text)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-secondary btn-sm" data-no>Отмена</button><button class="btn btn-danger btn-sm" data-yes>${ui.esc(okText || 'Удалить')}</button></div>`,
        { onClose: () => resolve(false) }
      );
      md.el.querySelector('[data-yes]').onclick = () => {
        resolve(true);
        md.close();
      };
      md.el.querySelector('[data-no]').onclick = () => md.close();
    });
})();
