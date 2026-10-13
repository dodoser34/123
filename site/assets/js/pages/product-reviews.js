/* Страница товара → отзывы: сводка (средняя оценка, % рекомендаций, распределение по звёздам),
   фильтр по звёздам, сортировка, «Полезно», ответы магазина, «Показать ещё». */
(() => {
  const { ui, db } = App;
  const PAGE = 5;
  const SORTS = { new: 'Сначала новые', helpful: 'Сначала полезные', high: 'Сначала высокие оценки', low: 'Сначала низкие оценки' };
  const state = { sort: 'new', star: 0, shown: PAGE };

  function sorted(list) {
    const by = {
      new: (a, b) => b.date.localeCompare(a.date),
      helpful: (a, b) => (b.helpful || 0) - (a.helpful || 0) || b.date.localeCompare(a.date),
      high: (a, b) => b.rating - a.rating || b.date.localeCompare(a.date),
      low: (a, b) => a.rating - b.rating || b.date.localeCompare(a.date)
    };
    return list.slice().sort(by[state.sort]);
  }

  function review(r) {
    const voted = db.reviews.hasVoted(r);
    const period = db.reviews.USAGE_PERIODS[r.period];
    return `
      <article class="review">
        <header class="review-head">
          <span class="avatar">${ui.esc(r.name.charAt(0).toUpperCase())}</span>
          <div>
            <b>${ui.esc(r.name)}</b>
            ${r.verified ? `<span class="review-verified">${ui.icon('check-circle')}Покупка подтверждена</span>` : ''}
            <div class="review-meta">${ui.stars(r.rating, 'stars-sm')}<time datetime="${r.date}">${ui.date(r.date)}</time>${period ? `<span>· Пользуется: ${period.toLowerCase()}</span>` : ''}</div>
          </div>
        </header>
        ${r.title ? `<h4 class="review-title">${ui.esc(r.title)}</h4>` : ''}
        <p>${ui.esc(r.text)}</p>
        ${r.pros || r.cons ? `<dl class="review-pc">${r.pros ? `<div><dt>Достоинства</dt><dd>${ui.esc(r.pros)}</dd></div>` : ''}${r.cons ? `<div><dt>Недостатки</dt><dd>${ui.esc(r.cons)}</dd></div>` : ''}</dl>` : ''}
        <footer class="review-foot">
          <span class="review-rec${r.recommend ? '' : ' is-no'}">${ui.icon(r.recommend ? 'thumbs-up' : 'x')}${r.recommend ? 'Рекомендует' : 'Не рекомендует'}</span>
          <button type="button" class="review-helpful${voted ? ' is-voted' : ''}" data-helpful="${r.id}" ${voted ? 'disabled' : ''} aria-label="Отзыв полезен">${ui.icon('thumbs-up')}Полезно${r.helpful ? ` · ${r.helpful}` : ''}</button>
        </footer>
        ${r.reply ? `<div class="review-reply">${ui.icon('reply')}<div><b>Ответ магазина</b><p>${ui.esc(r.reply.text)}</p></div></div>` : ''}
      </article>`;
  }

  function html(p) {
    const all = db.reviews.forProduct(p.id);
    const r = db.products.rating(p);
    const dist = [5, 4, 3, 2, 1].map((s) => all.filter((x) => x.rating === s).length);
    const recommend = all.length ? Math.round((all.filter((x) => x.recommend).length / all.length) * 100) : 0;
    const mine = db.reviews.byUser(p.id, (db.session.user() || {}).id);
    const filtered = sorted(state.star ? all.filter((x) => x.rating === state.star) : all);

    const summary = `
      <div class="reviews-summary">
        <div class="rs-score">
          <div class="rs-big">${r.count ? r.rating.toFixed(1) : '—'}</div>
          ${ui.stars(r.rating)}
          <div class="muted">${r.count} ${ui.plural(r.count, 'отзыв', 'отзыва', 'отзывов')}</div>
          ${r.count ? `<div class="rs-recommend">${ui.icon('thumbs-up')}${recommend}% рекомендуют</div>` : ''}
        </div>
        <div class="rs-bars" role="group" aria-label="Фильтр по оценке">
          ${[5, 4, 3, 2, 1]
            .map(
              (s, i) => `
            <button type="button" data-star="${s}" class="${state.star === s ? 'is-active' : ''}" ${dist[i] ? '' : 'disabled'} aria-pressed="${state.star === s}">
              <span>${s} ${ui.icon('star')}</span><i><b style="width:${all.length ? (dist[i] / all.length) * 100 : 0}%"></b></i><span>${dist[i]}</span>
            </button>`
            )
            .join('')}
        </div>
        <div class="rs-cta">
          <p class="muted">${mine ? 'Вы уже оставили отзыв об этом товаре.' : 'Пользовались этим товаром? Расскажите другим покупателям.'}</p>
          <button class="btn btn-primary btn-sm" type="button" id="add-review">${ui.icon('edit')} ${mine ? 'Изменить мой отзыв' : 'Оставить отзыв'}</button>
        </div>
      </div>`;

    if (!all.length) return summary + '<p class="muted reviews-empty">Пока нет отзывов. Будьте первым!</p>';

    const toolbar = `
      <div class="reviews-toolbar">
        <span>${state.star ? `Оценка ${state.star}: ${filtered.length} ${ui.plural(filtered.length, 'отзыв', 'отзыва', 'отзывов')} <button type="button" class="btn-ghost" data-star="0">Показать все</button>` : `Все отзывы (${all.length})`}</span>
        <label class="reviews-sort">Сортировка
          <select class="select" id="reviews-sort">${Object.entries(SORTS)
            .map(([k, v]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>${v}</option>`)
            .join('')}</select>
        </label>
      </div>`;
    const more =
      filtered.length > state.shown
        ? `<button class="btn btn-secondary btn-sm reviews-more" type="button" data-more-reviews>Показать ещё ${Math.min(PAGE, filtered.length - state.shown)}</button>`
        : '';
    return summary + toolbar + filtered.slice(0, state.shown).map(review).join('') + more;
  }

  /** Обработчики внутри блока отзывов. rerender() перерисовывает только этот блок. */
  function bind(container, p, rerender, openForm) {
    container.addEventListener('click', (e) => {
      const star = e.target.closest('[data-star]');
      if (star) {
        state.star = +star.dataset.star === state.star ? 0 : +star.dataset.star;
        state.shown = PAGE;
        return rerender();
      }
      if (e.target.closest('[data-more-reviews]')) {
        state.shown += PAGE;
        return rerender();
      }
      const helpful = e.target.closest('[data-helpful]');
      if (helpful) {
        if (db.reviews.vote(helpful.dataset.helpful)) ui.toast({ title: 'Спасибо за оценку отзыва!', icon: 'thumbs-up' });
        return rerender();
      }
      if (e.target.closest('#add-review')) openForm();
    });
    container.addEventListener('change', (e) => {
      if (e.target.id !== 'reviews-sort') return;
      state.sort = e.target.value;
      state.shown = PAGE;
      rerender();
    });
  }

  App.productReviews = { html, bind };
})();
