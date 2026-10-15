(() => {
  const ui = App.ui;

  ui.lightbox = (images, start = 0, alt = '', onChange) => {
    const list = images.filter(Boolean);
    if (!list.length) return;
    let current = Math.min(Math.max(start, 0), list.length - 1);
    const lastFocus = document.activeElement;

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', ui.t('common.lightbox.label'));
    lb.innerHTML = `
      <img alt="${ui.esc(alt)}">
      <button class="lb-close" type="button" aria-label="${ui.t('common.lightbox.close')}">${ui.icon('x')}</button>
      ${
        list.length > 1
          ? `<button class="lb-prev" type="button" aria-label="${ui.t('common.lightbox.prev')}">${ui.icon('chevron-left')}</button>
             <button class="lb-next" type="button" aria-label="${ui.t('common.lightbox.next')}">${ui.icon('chevron-right')}</button>
             <span class="lb-count" aria-live="polite"></span>`
          : ''
      }`;
    const img = lb.querySelector('img');
    const counter = lb.querySelector('.lb-count');

    const show = (dir) => {
      img.src = ui.url(list[current]);
      if (dir) ui.slideIn(img, dir, 60);
      if (counter) counter.textContent = `${current + 1} / ${list.length}`;
      if (onChange) onChange(current);
    };
    const go = (delta) => {
      current = (current + delta + list.length) % list.length;
      show(delta);
    };
    const close = () => {
      lb.classList.remove('is-open');
      setTimeout(() => lb.remove(), 260);
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };

    lb.addEventListener('click', (e) => {
      if (e.target.closest('.lb-prev')) go(-1);
      else if (e.target.closest('.lb-next')) go(1);
      else if (e.target === lb || e.target.closest('.lb-close')) close();
    });
    let startX = null;
    lb.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40 && list.length > 1) go(dx < 0 ? 1 : -1);
      startX = null;
    });
    document.addEventListener('keydown', onKey);

    show();
    document.body.appendChild(lb);
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
    document.body.classList.add('no-scroll');
    lb.querySelector('.lb-close').focus();
  };
})();
