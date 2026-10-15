(() => {
  const { ui } = App;

  const loadable = (list) =>
    Promise.all(
      list.map(
        (src) =>
          new Promise((resolve) => {
            if (!src) return resolve(null);
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = ui.url(src);
            setTimeout(() => resolve(src), 3000);
          })
      )
    ).then((found) => found.filter(Boolean));

  function create(p) {
    const g = { images: [''], current: 0 };

    g.load = () =>
      loadable(p.images).then((found) => {
        g.images = found.length ? found : [''];
      });

    const thumbButtons = (inner) =>
      g.images
        .map(
          (src, i) =>
            `<button type="button" data-thumb="${i}" class="${i === g.current ? 'is-active' : ''}" aria-label="${ui.t('product.gallery.photo', { n: i + 1 })}">${inner(src)}</button>`
        )
        .join('');

    g.html = (fav) => {
      const many = g.images.length > 1;
      return `
        <div class="pp-thumbs" role="group" aria-label="${ui.t('product.gallery.label')}">
          ${many ? thumbButtons((src) => ui.img(src, '')) : ''}
        </div>
        <div>
          <div class="pp-main" id="pp-main" title="${ui.t('product.gallery.zoom')}">
            ${ui.img(g.images[g.current], p.name, '', 'id="pp-img"')}
            <button class="pc-fav${fav ? ' is-active' : ''}" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${ui.t(fav ? 'common.card.favRemove' : 'common.card.favAdd')}">${ui.icon('heart')}</button>
            <div class="pc-badges">${ui.badges(p)}</div>
          </div>
          ${many ? `<div class="pp-dots">${thumbButtons(() => '')}</div>` : ''}
        </div>`;
    };

    g.show = (i) => {
      const count = g.images.length;
      const next = (i + count) % count;
      if (next === g.current) return;
      const dir = i > g.current ? 1 : -1;
      g.current = next;
      const old = document.querySelector('#pp-main #pp-img, #pp-main .img-ph');
      const tmp = document.createElement('div');
      tmp.innerHTML = ui.img(g.images[g.current], p.name, '', 'id="pp-img"');
      const img = tmp.firstElementChild;
      old.replaceWith(img);
      ui.slideIn(img, dir, 40);
      ui.$$('[data-thumb]').forEach((b) => b.classList.toggle('is-active', +b.dataset.thumb === g.current));
    };

    g.bind = () => {
      ui.$$('[data-thumb]').forEach((b) => b.addEventListener('click', () => g.show(+b.dataset.thumb)));
      const main = document.getElementById('pp-main');
      main.addEventListener('click', (e) => {
        if (!e.target.closest('[data-fav]') && g.images[0]) ui.lightbox(g.images, g.current, p.name, g.show);
      });
      let startX = null;
      main.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
      main.addEventListener('touchend', (e) => {
        if (startX == null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40 && g.images.length > 1) g.show(g.current + (dx < 0 ? 1 : -1));
        startX = null;
      });
    };

    return g;
  }

  App.productGallery = { create };
})();
