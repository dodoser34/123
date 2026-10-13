/* О нас: ценности, счётчики, «Почему нам доверяют», фотогалерея, контакты */
document.addEventListener('app:ready', () => {
  const { ui, db } = App;
  const C = App.config;

  document.getElementById('values').innerHTML = [
    ['leaf', 'Только проверенные бренды'],
    ['droplet', 'Действительно натуральные составы'],
    ['hand-heart', 'Забота о каждом клиенте']
  ]
    .map(([icon, text]) => `<li><span class="v-ic">${ui.icon(icon)}</span><span>${text}</span></li>`)
    .join('');

  document.getElementById('trust').innerHTML = [
    ['plane', 'Прямые поставки из Кореи'],
    ['certificate', 'Сертификаты на всю продукцию'],
    ['message', 'Помощь в подборе ухода'],
    ['sprout', 'Травы от проверенных сборщиков']
  ]
    .map(([icon, text]) => `<div class="trust-card reveal">${ui.icon(icon)}${text}</div>`)
    .join('');

  /* ---------- Фотогалерея «Жизнь магазина» ---------- */
  const GALLERY = [
    ['gallery-1.jpg', 'Тонер на камне среди листьев эвкалипта'],
    ['gallery-2.jpg', 'Полка магазина с косметикой и растениями'],
    ['gallery-3.jpg', 'Чаша с сушёной ромашкой'],
    ['gallery-4.jpg', 'Текстура крема на керамической тарелке'],
    ['gallery-5.jpg', 'Банки с травами на деревянной полке'],
    ['gallery-6.jpg', 'Открытая баночка крема в руке']
  ];
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = GALLERY.map(
    ([file, alt], i) =>
      `<button type="button" data-photo="${i}" aria-label="Открыть фото: ${alt}">${ui.img('assets/images/pages/about/' + file, alt)}</button>`
  ).join('');
  gallery.addEventListener('click', (e) => {
    const b = e.target.closest('[data-photo]');
    if (b)
      ui.lightbox(
        GALLERY.map(([file]) => 'assets/images/pages/about/' + file),
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
        ? `<div class="panel contact-card"><span class="benefit-ic">${ui.icon('pin')}</span><div><b>Адрес</b>
             <p class="muted">${ui.esc(C.address)}</p>
             ${C.mapUrl ? `<a href="${C.mapUrl}" target="_blank" rel="noopener">Показать на карте</a>` : ''}</div></div>`
        : ''
    }
    <div class="panel contact-card"><span class="benefit-ic">${ui.icon('mail')}</span><div><b>Email</b>
      <p class="muted">Вопросы о заказах, подбор ухода, сотрудничество и оптовые заказы</p>
      <a href="mailto:${C.email}">${ui.esc(C.email)}</a></div></div>`;

  /* ---------- Счётчики, которые «досчитываются» при появлении на экране ---------- */
  document.getElementById('catalog-count').dataset.count = db.products.visible().length;
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
