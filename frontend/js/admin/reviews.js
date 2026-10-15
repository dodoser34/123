(() => {
  const { ui, db } = App;
  const A = App.admin;
  const state = { filter: 'all', rating: '', q: '' };
  const FILTERS = { all: 'Все', noreply: 'Без ответа', published: 'Опубликованные', hidden: 'Скрытые' };

  function filtered() {
    let list = db.reviews.all();
    if (state.filter === 'noreply') list = list.filter((r) => !r.reply && r.status !== 'hidden');
    if (state.filter === 'published') list = list.filter((r) => r.status !== 'hidden');
    if (state.filter === 'hidden') list = list.filter((r) => r.status === 'hidden');
    if (state.rating) list = list.filter((r) => r.rating === +state.rating);
    const q = state.q.toLowerCase().trim();
    if (q) {
      list = list.filter((r) => {
        const p = db.products.get(r.productId);
        return [r.name, r.title, r.text, r.pros, r.cons, p && p.name].join(' ').toLowerCase().includes(q);
      });
    }
    return list;
  }

  function card(r) {
    const p = db.products.get(r.productId);
    const hidden = r.status === 'hidden';
    return `
      <article class="adm-card adm-review${hidden ? ' is-hidden' : ''}">
        <header class="adm-review-head">
          ${p ? `<a class="adm-review-product" href="${ui.productUrl(p)}" target="_blank" rel="noopener">${ui.img(p.images[0], '', 'adm-thumb')}<span>${ui.esc(p.name)}</span></a>` : '<span class="muted">Товар удалён</span>'}
          <div class="flags">
            ${hidden ? '<span class="tag tag-muted">Скрыт</span>' : '<span class="tag tag-soft">Опубликован</span>'}
            ${r.verified ? '<span class="tag tag-soft">Покупка подтверждена</span>' : ''}
            ${r.reply ? '' : '<span class="tag tag-warn">Без ответа</span>'}
          </div>
        </header>
        <div class="review-meta">${ui.stars(r.rating, 'stars-sm')}<b>${ui.esc(r.name)}</b><time datetime="${r.date}">${ui.date(r.date)}</time>${r.helpful ? `<span>· Полезно: ${r.helpful}</span>` : ''}${r.recommend ? '' : '<span class="tag tag-sale">Не рекомендует</span>'}</div>
        ${r.title ? `<h4 class="review-title">${ui.esc(r.title)}</h4>` : ''}
        <p>${ui.esc(r.text)}</p>
        ${r.pros || r.cons ? `<dl class="review-pc">${r.pros ? `<div><dt>Достоинства</dt><dd>${ui.esc(r.pros)}</dd></div>` : ''}${r.cons ? `<div><dt>Недостатки</dt><dd>${ui.esc(r.cons)}</dd></div>` : ''}</dl>` : ''}
        ${r.reply ? `<div class="review-reply">${ui.icon('reply')}<div><b>Ответ магазина · ${ui.date(r.reply.date)}</b><p>${ui.esc(r.reply.text)}</p></div></div>` : ''}
        <footer class="adm-review-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-reply="${r.id}">${ui.icon('reply')} ${r.reply ? 'Изменить ответ' : 'Ответить'}</button>
          <button class="btn btn-ghost btn-sm" type="button" data-status="${r.id}">${ui.icon(hidden ? 'eye' : 'eye-off')} ${hidden ? 'Опубликовать' : 'Скрыть'}</button>
          <button class="btn btn-ghost btn-sm adm-danger" type="button" data-rdel="${r.id}">${ui.icon('trash')} Удалить</button>
        </footer>
      </article>`;
  }

  function replyModal(r) {
    const md = ui.modal(`
      <h3>Ответ магазина</h3>
      <p class="muted modal-quote">«${ui.esc(r.text.length > 160 ? r.text.slice(0, 160) + '…' : r.text)}» — ${ui.esc(r.name)}</p>
      <form id="reply-form" novalidate>
        <div class="field"><label for="reply-text">Текст ответа</label>
          <textarea class="textarea" id="reply-text" maxlength="800" placeholder="Спасибо за отзыв! …">${ui.esc(r.reply ? r.reply.text : '')}</textarea>
          <span class="field-hint">Ответ увидят все покупатели под этим отзывом.</span></div>
        <div class="modal-actions">
          ${r.reply ? '<button class="btn btn-ghost adm-danger" type="button" data-remove-reply>Удалить ответ</button>' : ''}
          <button class="btn btn-primary" type="submit">Опубликовать ответ</button>
        </div>
      </form>`);
    const textarea = md.el.querySelector('#reply-text');
    md.el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return textarea.focus();
      await db.reviews.reply(r.id, text);
      md.close();
      ui.toast({ title: 'Ответ опубликован', icon: 'reply' });
      reviews();
    });
    const removeBtn = md.el.querySelector('[data-remove-reply]');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        await db.reviews.reply(r.id, '');
        md.close();
        reviews();
      });
    }
  }

  function reviews() {
    A.setTitle('Отзывы');
    const all = db.reviews.all();
    const counts = {
      all: all.length,
      noreply: all.filter((r) => !r.reply && r.status !== 'hidden').length,
      published: all.filter((r) => r.status !== 'hidden').length,
      hidden: all.filter((r) => r.status === 'hidden').length
    };
    const list = filtered();
    A.$content.innerHTML = `
      <div class="adm-toolbar">
        <div class="seg-tabs">${Object.entries(FILTERS)
          .map(
            ([k, v]) =>
              `<button type="button" data-filter="${k}" class="${state.filter === k ? 'is-active' : ''}">${v} <small>${counts[k]}</small></button>`
          )
          .join('')}</div>
        <div class="search">${ui.icon('search')}<input class="input" type="search" id="r-q" placeholder="Текст, автор или товар" value="${ui.esc(state.q)}"></div>
        <select class="select" id="r-rating" aria-label="Оценка"><option value="">Любая оценка</option>${[5, 4, 3, 2, 1].map((s) => `<option value="${s}" ${+state.rating === s ? 'selected' : ''}>${'★'.repeat(s)}</option>`).join('')}</select>
      </div>
      <div class="adm-reviews">${list.length ? list.map(card).join('') : '<div class="adm-empty">Отзывов по этим условиям нет.</div>'}</div>`;

    const search = document.getElementById('r-q');
    search.addEventListener(
      'input',
      ui.debounce(() => {
        state.q = search.value;
        reviews();
        const again = document.getElementById('r-q');
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }, 300)
    );
    document.getElementById('r-rating').onchange = (e) => ((state.rating = e.target.value), reviews());

    A.$content.onclick = async (e) => {
      const t = (sel) => e.target.closest(sel);
      if (t('[data-filter]')) return (state.filter = t('[data-filter]').dataset.filter), reviews();
      if (t('[data-reply]')) return replyModal(db.reviews.get(t('[data-reply]').dataset.reply));
      if (t('[data-status]')) {
        const r = db.reviews.get(t('[data-status]').dataset.status);
        await db.reviews.setStatus(r.id, r.status === 'hidden' ? 'published' : 'hidden');
        ui.toast({ title: r.status === 'hidden' ? 'Отзыв опубликован' : 'Отзыв скрыт', icon: r.status === 'hidden' ? 'eye' : 'eye-off' });
        return reviews();
      }
      if (t('[data-rdel]') && (await ui.confirm('Удалить этот отзыв? Действие нельзя отменить.'))) {
        await db.reviews.remove(t('[data-rdel]').dataset.rdel);
        ui.toast({ title: 'Отзыв удалён', icon: 'trash' });
        reviews();
      }
    };
  }

  A.views.reviews = reviews;
})();
