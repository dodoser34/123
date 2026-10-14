/* Админка → «Фото «О нас»»: замена 6 фото блока «Жизнь магазина» и подписей к ним.
   Фото уменьшаются до 1200 px и хранятся в браузере (store/media.js); подписи — правки текстов (about.gallery.photos). */
(() => {
  const { ui, db } = App;
  const A = App.admin;
  const COUNT = 6;
  const original = (i) => `assets/images/pages/about/gallery-${i + 1}.jpg`;
  const captionKey = (i) => `about.gallery.photos.${i}`;

  function sitePhotos() {
    A.setTitle('Фото «О нас»');

    const draw = () => {
      const custom = db.media.gallery();
      A.$content.innerHTML = `
        <section class="adm-card adm-card-pad site-photos-intro">
          <h3>Жизнь магазина</h3>
          <p class="muted">Шесть фото на странице «О нас»: полки, травы, любимые средства. Замените любое фото на актуальное и поправьте подпись —
            она видна при наведении и читается программами для незрячих. Лучше всего подходят квадратные фото от 1200 × 1200 px;
            большие фото уменьшаются автоматически.</p>
          <a class="link-arrow" href="${ui.page('about')}#gallery-title" target="_blank" rel="noopener">${ui.icon('external')} Посмотреть на сайте</a>
        </section>
        <div class="site-photos">
          ${Array.from({ length: COUNT }, (_, i) => {
            const isCustom = !!custom[i];
            return `
            <article class="adm-card site-photo" data-slot="${i}">
              <div class="site-photo-img">
                ${ui.img(custom[i] || original(i), '')}
                <span class="site-photo-num">${i + 1}</span>
                ${isCustom ? '<span class="site-photo-badge">Заменено</span>' : ''}
              </div>
              <div class="site-photo-body">
                <label class="field">
                  <span class="label">Подпись к фото</span>
                  <input class="input" data-caption="${i}" value="${ui.esc(ui.t(captionKey(i)))}" maxlength="120">
                </label>
                <div class="site-photo-actions">
                  <label class="btn btn-secondary btn-sm">${ui.icon('upload')} Заменить фото
                    <input type="file" accept="image/*" data-file="${i}" hidden>
                  </label>
                  ${isCustom ? `<button class="btn btn-ghost btn-sm" type="button" data-reset="${i}">${ui.icon('refresh')} Вернуть исходное</button>` : ''}
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>`;
    };
    draw();

    A.$content.onchange = async (e) => {
      const input = e.target.closest('[data-file]');
      if (input && input.files[0]) {
        const i = +input.dataset.file;
        const card = input.closest('.site-photo');
        card.classList.add('is-loading');
        try {
          const src = await A.compress(input.files[0], 1200, 0.82);
          if (await db.media.setGallery(i, src)) ui.toast({ title: `Фото ${i + 1} заменено`, icon: 'image' });
        } catch (err) {
          ui.toast({ title: 'Не удалось прочитать файл', text: 'Выберите фото в формате JPG, PNG или WEBP.', icon: 'x' });
        }
        draw();
      }
      const caption = e.target.closest('[data-caption]');
      if (caption) {
        const i = +caption.dataset.caption;
        const value = caption.value.trim();
        if (value ? ui.textEdits.set(captionKey(i), value) : ui.textEdits.reset(captionKey(i))) ui.toast({ title: 'Подпись сохранена' });
        if (!value) caption.value = ui.t(captionKey(i));
      }
    };
    A.$content.onclick = async (e) => {
      const reset = e.target.closest('[data-reset]');
      if (!reset) return;
      const i = +reset.dataset.reset;
      if (!(await ui.confirm(`Вернуть исходное фото ${i + 1}?`, 'Вернуть'))) return;
      await db.media.resetGallery(i);
      ui.toast({ title: 'Исходное фото возвращено', icon: 'refresh' });
      draw();
    };
  }

  A.views.photos = sitePhotos;
})();
