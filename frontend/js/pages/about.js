/* О нас: ценности, счётчики, «Почему нам доверяют», фотогалерея, контакты */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const C = App.config;
  const T = ui.t('about'); // тексты — texts/…/about.js

  const VALUE_ICONS = ['leaf', 'droplet', 'hand-heart'];
  document.getElementById('values').innerHTML = T.mission.values
    .map((text, i) => [VALUE_ICONS[i] || 'leaf', text])
    .map(([icon, text]) => `<li><span class="v-ic">${ui.icon(icon)}</span><span>${text}</span></li>`)
    .join('');

  const TRUST_ICONS = ['plane', 'certificate', 'message', 'sprout'];
  document.getElementById('trust').innerHTML = T.trust.items
    .map((text, i) => [TRUST_ICONS[i] || 'leaf', text])
    .map(([icon, text]) => `<div class="trust-card reveal">${ui.icon(icon)}${text}</div>`)
    .join('');

  /* ---------- Фотогалерея «Жизнь магазина» ---------- */
  // фото gallery-1.jpg, gallery-2.jpg… — по числу подписей в texts/…/about.js
  // фото, заменённые в админке («Фото «О нас»»), подставляются вместо исходных
  const custom = db.media.gallery();
  const GALLERY = T.gallery.photos.map((alt, i) => [custom[i] || `assets/images/pages/about/gallery-${i + 1}.jpg`, alt]);
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = GALLERY.map(
    ([file, alt], i) =>
      `<button type="button" data-photo="${i}" aria-label="${ui.t('about.gallery.open', { alt })}">${ui.img(file, alt)}</button>`
  ).join('');
  gallery.addEventListener('click', (e) => {
    const b = e.target.closest('[data-photo]');
    if (b)
      ui.lightbox(
        GALLERY.map(([file]) => file),
        +b.dataset.photo,
        GALLERY[+b.dataset.photo][1]
      );
  });

  /* ---------- Контакты ---------- */
  const contactsGrid = document.getElementById('contacts-grid');
  contactsGrid.classList.toggle('is-single', !C.address);
  contactsGrid.innerHTML = `
    ${
      C.address
        ? `<div class="panel contact-card"><span class="benefit-ic">${ui.icon('pin')}</span><div><b>${T.contacts.address}</b>
             <p class="muted">${ui.esc(C.address)}</p>
             ${C.mapUrl ? `<a href="${C.mapUrl}" target="_blank" rel="noopener">${T.contacts.map}</a>` : ''}</div></div>`
        : ''
    }
    <div class="panel contact-card"><span class="benefit-ic">${ui.icon('mail')}</span><div><b>${T.contacts.email}</b>
      <p class="muted">${T.contacts.emailText}</p>
      <a href="mailto:${C.email}">${ui.esc(C.email)}</a></div></div>`;

  /* ---------- Счётчики, которые «досчитываются» при появлении на экране ---------- */
  document.getElementById('stats').innerHTML = T.stats.items
    .map((s) => `<div><b data-count="${s.count === 'catalog' ? db.products.visible().length : s.count}">0</b><span>${s.label}</span></div>`)
    .join('');
  const format = (value, el) => {
    const decimals = String(el.dataset.count).includes('.') ? 1 : 0;
    return value.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (el.dataset.suffix || '');
  };
  const run = (el) => {
    const target = +el.dataset.count;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = format(target, el);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / 1200);
      el.textContent = format(target * (1 - Math.pow(1 - k, 3)), el);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counters = ui.$$('[data-count]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          run(en.target);
          io.unobserve(en.target);
        }),
      { threshold: 0.5 }
    );
    counters.forEach((el) => io.observe(el));
  } else {
    counters.forEach(run);
  }
});
