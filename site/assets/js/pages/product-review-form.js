/* Страница товара → окно «Оставить отзыв»: оценка звёздами, заголовок, текст, достоинства,
   недостатки, «рекомендую», сколько пользуется. Вошедший покупатель может изменить свой отзыв. */
(() => {
  const { ui, db } = App;
  const MIN_TEXT = 20;
  const LABELS = { 1: 'Ужасно', 2: 'Плохо', 3: 'Нормально', 4: 'Хорошо', 5: 'Отлично' };

  function open(p, onSaved) {
    const user = db.session.user();
    const mine = user ? db.reviews.byUser(p.id, user.id) : null;
    const v = Object.assign({ rating: 0, title: '', text: '', pros: '', cons: '', recommend: true, period: '' }, mine || {});
    const verified = user && db.reviews.hasPurchased(p.id, user.id);

    const md = ui.modal(`
      <h3>${mine ? 'Изменить отзыв' : 'Ваш отзыв'}</h3>
      <p class="muted review-form-product">${ui.esc(p.name)}</p>
      ${verified ? `<p class="review-verified">${ui.icon('check-circle')}Вы покупали этот товар — отзыв будет отмечен «Покупка подтверждена»</p>` : ''}
      <form id="review-form" class="review-form" novalidate>
        <div class="field">
          <span class="label" id="rate-label">Оценка *</span>
          <div class="rate-row">
          <div class="rate-input" role="radiogroup" aria-labelledby="rate-label">
            ${[5, 4, 3, 2, 1].map((s) => `<input type="radio" name="rating" id="rt${s}" value="${s}" ${v.rating === s ? 'checked' : ''}><label for="rt${s}" title="${LABELS[s]}" aria-label="${s} — ${LABELS[s]}">${ui.icon('star')}</label>`).join('')}
          </div>
          <span class="rate-text" aria-live="polite">${v.rating ? LABELS[v.rating] : 'Выберите оценку'}</span>
          </div>
          <span class="field-error"></span>
        </div>
        ${user ? '' : `<div class="field"><label for="rv-name">Ваше имя *</label><input class="input" id="rv-name" name="name" maxlength="40" autocomplete="given-name"><span class="field-error"></span></div>`}
        <div class="field"><label for="rv-title">Заголовок</label><input class="input" id="rv-title" name="title" maxlength="80" placeholder="Коротко о главном" value="${ui.esc(v.title)}"></div>
        <div class="field">
          <label for="rv-text">Отзыв *</label>
          <textarea class="textarea" id="rv-text" name="text" maxlength="1500" placeholder="Какой эффект заметили? Как пользуетесь?">${ui.esc(v.text)}</textarea>
          <span class="field-hint" id="rv-count"></span><span class="field-error"></span>
        </div>
        <div class="form-row">
          <div class="field"><label for="rv-pros">Достоинства</label><input class="input" id="rv-pros" name="pros" maxlength="200" value="${ui.esc(v.pros)}"></div>
          <div class="field"><label for="rv-cons">Недостатки</label><input class="input" id="rv-cons" name="cons" maxlength="200" value="${ui.esc(v.cons)}"></div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="rv-period">Сколько пользуетесь</label>
            <select class="select" id="rv-period" name="period">
              <option value="">Не указано</option>
              ${Object.entries(db.reviews.USAGE_PERIODS)
                .map(([k, label]) => `<option value="${k}" ${v.period === k ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <span class="label">Рекомендуете товар?</span>
            <div class="segmented">
              <label><input type="radio" name="recommend" value="yes" ${v.recommend ? 'checked' : ''}><span>${ui.icon('thumbs-up')}Да</span></label>
              <label><input type="radio" name="recommend" value="no" ${v.recommend ? '' : 'checked'}><span>${ui.icon('x')}Нет</span></label>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${mine ? 'Сохранить изменения' : 'Опубликовать отзыв'}</button>
        ${user ? '' : '<p class="field-hint review-form-hint">Войдите в аккаунт, чтобы потом можно было изменить отзыв.</p>'}
      </form>`);

    const f = md.el.querySelector('form');
    const count = md.el.querySelector('#rv-count');
    const updateCount = () => {
      const n = f.elements.text.value.trim().length;
      count.textContent =
        n < MIN_TEXT ? `Ещё минимум ${MIN_TEXT - n} ${ui.plural(MIN_TEXT - n, 'символ', 'символа', 'символов')}` : `${n} / 1500`;
    };
    updateCount();
    f.addEventListener('input', (e) => {
      if (e.target.name === 'text') updateCount();
      const field = e.target.closest('.field');
      if (field) field.classList.remove('has-error');
    });
    f.addEventListener('change', (e) => {
      if (e.target.name === 'rating') md.el.querySelector('.rate-text').textContent = LABELS[e.target.value];
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const rating = +(f.elements.rating.value || 0);
      const name = user ? user.name : f.elements.name.value.trim();
      const text = f.elements.text.value.trim();
      const errors = [
        ['rating', !rating && 'Поставьте оценку'],
        ['name', !user && name.length < 2 && 'Укажите имя'],
        ['text', text.length < MIN_TEXT && `Напишите хотя бы ${MIN_TEXT} символов`]
      ];
      let ok = true;
      errors.forEach(([key, msg]) => {
        const input = key === 'rating' ? md.el.querySelector('.rate-input') : f.elements[key];
        if (!input) return;
        const field = input.closest('.field');
        field.classList.toggle('has-error', !!msg);
        field.querySelector('.field-error').textContent = msg || '';
        if (msg) ok = false;
      });
      if (!ok) return;

      const result = db.reviews.save({
        productId: p.id,
        userId: user ? user.id : null,
        name,
        rating,
        text,
        title: f.elements.title.value.trim(),
        pros: f.elements.pros.value.trim(),
        cons: f.elements.cons.value.trim(),
        period: f.elements.period.value,
        recommend: f.elements.recommend.value === 'yes'
      });
      md.close();
      ui.toast({ title: result.updated ? 'Отзыв обновлён' : 'Спасибо за отзыв!', icon: 'star' });
      if (onSaved) onSaved();
    });
  }

  App.productReviewForm = { open };
})();
