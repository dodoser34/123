/* Страница товара → окно «Оставить отзыв»: оценка звёздами, заголовок, текст, достоинства,
   недостатки, «рекомендую», сколько пользуется. Отзыв оставляет вошедший покупатель (и может потом изменить),
   гость сначала попадает на вход и затем возвращается к отзывам этого товара. */
(() => {
  const { ui, db } = App;
  const MIN_TEXT = 20;
  const T = ui.t('product.reviewForm'); // тексты — texts/…/product.js
  const LABELS = T.ratingLabels;

  function open(p, onSaved) {
    const user = db.session.user();
    if (!user) {
      location.href = ui.page('login') + '?next=' + encodeURIComponent('pages/product.html' + location.search + '#reviews');
      return;
    }
    const mine = db.reviews.byUser(p.id, user.id);
    const v = Object.assign({ rating: 0, title: '', text: '', pros: '', cons: '', recommend: true, period: '' }, mine || {});
    const verified = db.reviews.hasPurchased(p.id, user.id);

    const md = ui.modal(`
      <h3>${mine ? T.titleEdit : T.titleNew}</h3>
      <p class="muted review-form-product">${ui.esc(p.name)}</p>
      ${verified ? `<p class="review-verified">${ui.icon('check-circle')}${T.verified}</p>` : ''}
      <form id="review-form" class="review-form" novalidate>
        <div class="field">
          <span class="label" id="rate-label">${T.rating}</span>
          <div class="rate-row">
          <div class="rate-input" role="radiogroup" aria-labelledby="rate-label">
            ${[5, 4, 3, 2, 1].map((s) => `<input type="radio" name="rating" id="rt${s}" value="${s}" ${v.rating === s ? 'checked' : ''}><label for="rt${s}" title="${LABELS[s]}" aria-label="${s} — ${LABELS[s]}">${ui.icon('star')}</label>`).join('')}
          </div>
          <span class="rate-text" aria-live="polite">${v.rating ? LABELS[v.rating] : T.chooseRating}</span>
          </div>
          <span class="field-error"></span>
        </div>
        <div class="field"><label for="rv-title">${T.title}</label><input class="input" id="rv-title" name="title" maxlength="80" placeholder="${T.titlePlaceholder}" value="${ui.esc(v.title)}"></div>
        <div class="field">
          <label for="rv-text">${T.text}</label>
          <textarea class="textarea" id="rv-text" name="text" maxlength="1500" placeholder="${T.textPlaceholder}">${ui.esc(v.text)}</textarea>
          <span class="field-hint" id="rv-count"></span><span class="field-error"></span>
        </div>
        <div class="form-row">
          <div class="field"><label for="rv-pros">${T.pros}</label><input class="input" id="rv-pros" name="pros" maxlength="200" value="${ui.esc(v.pros)}"></div>
          <div class="field"><label for="rv-cons">${T.cons}</label><input class="input" id="rv-cons" name="cons" maxlength="200" value="${ui.esc(v.cons)}"></div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="rv-period">${T.period}</label>
            <select class="select" id="rv-period" name="period">
              <option value="">${T.periodNone}</option>
              ${Object.entries(db.reviews.USAGE_PERIODS)
                .map(([k, label]) => `<option value="${k}" ${v.period === k ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <span class="label">${T.recommend}</span>
            <div class="segmented">
              <label><input type="radio" name="recommend" value="yes" ${v.recommend ? 'checked' : ''}><span>${ui.icon('thumbs-up')}${T.yes}</span></label>
              <label><input type="radio" name="recommend" value="no" ${v.recommend ? '' : 'checked'}><span>${ui.icon('x')}${T.no}</span></label>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${mine ? T.save : T.publish}</button>
      </form>`);

    const f = md.el.querySelector('form');
    const count = md.el.querySelector('#rv-count');
    const updateCount = () => {
      const n = f.elements.text.value.trim().length;
      count.textContent = n < MIN_TEXT ? ui.t('product.reviewForm.charsLeft', { count: MIN_TEXT - n }) : `${n} / 1500`;
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

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = +(f.elements.rating.value || 0);
      const text = f.elements.text.value.trim();
      const errors = [
        ['rating', !rating && T.errorRating],
        ['text', text.length < MIN_TEXT && ui.t('product.reviewForm.errorText', { min: MIN_TEXT })]
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

      const result = await db.reviews.save({
        productId: p.id,
        userId: user.id,
        name: user.name,
        rating,
        text,
        title: f.elements.title.value.trim(),
        pros: f.elements.pros.value.trim(),
        cons: f.elements.cons.value.trim(),
        period: f.elements.period.value,
        recommend: f.elements.recommend.value === 'yes'
      });
      if (result.error) return ui.toast({ title: result.error, icon: 'x' });
      md.close();
      ui.toast({ title: result.updated ? T.updated : T.thanks, icon: 'star' });
      if (onSaved) onSaved();
    });
  }

  App.productReviewForm = { open };
})();
