(() => {
  const ui = App.ui;
  const base = ui.base;

  ui.placeholder = (cls) => `<div class="img-ph${cls ? ' ' + cls : ''}" aria-hidden="true">${ui.logoSvg}</div>`;

  ui.img = (src, alt, cls, extra) =>
    src
      ? `<img src="${ui.esc(ui.url(src))}" alt="${ui.esc(alt || '')}"${cls ? ` class="${cls}"` : ''} loading="lazy" decoding="async"${extra ? ' ' + extra : ''}>`
      : ui.placeholder(cls);

  ui.imgFail = (el) => {
    if (el.dataset.decor !== undefined) {
      el.remove();
      return;
    }
    const ph = document.createElement('div');
    ph.className = 'img-ph ' + (el.className || '');
    ph.setAttribute('aria-hidden', 'true');
    ph.innerHTML = ui.logoSvg;
    el.replaceWith(ph);
  };

  ui.decor = (file, cls, style) =>
    `<img class="decor ${cls || ''}" src="${base}assets/images/decor/${file}" alt="" aria-hidden="true" loading="lazy" decoding="async" data-decor${style ? ` style="${style}"` : ''}>`;

  ui.emptyState = ({ title, text, actions = '', icon = '' }) => `
    <div class="empty-state">
      <div class="es-art">
        <img src="${base}assets/images/common/empty-state.png" alt="" aria-hidden="true" data-decor>
        ${icon ? `<span class="es-ic">${ui.icon(icon)}</span>` : ''}
      </div>
      <h3>${title}</h3>
      ${text ? `<p>${text}</p>` : ''}
      ${actions ? `<div class="es-actions">${actions}</div>` : ''}
    </div>`;
})();
