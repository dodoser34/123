/* Плавные переходы: между страницами, при смене содержимого и при добавлении в корзину.
   • Между страницами: браузер плавно сменяет одну страницу другой (View Transitions API),
     шапка остаётся на месте, а фото товара «перелетает» из карточки на страницу товара и обратно.
     Оформление переходов — в css/components/transitions.css.
   • ui.transition(update) — плавная смена содержимого без перезагрузки (фильтры, вкладки, разделы админки).
   • ui.flyToCart(button) — миниатюра товара улетает в значок корзины.
   Старые браузеры получают простое плавное появление страницы. */
(() => {
  const ui = App.ui;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => motion.matches;
  const PHOTO = 'product-photo';

  if (!('onpagereveal' in window)) document.documentElement.classList.add('no-vt');

  /**
   * Плавно применить изменения на странице. update() меняет разметку, браузер анимирует разницу:
   * карточки «переезжают» на новые места, новые проявляются, лишние растворяются.
   * type — вид перехода для CSS: 'swap' (по умолчанию), 'section' (смена раздела).
   */
  ui.transition = (update, type = 'swap') => {
    if (!document.startViewTransition || calm() || document.hidden) {
      update();
      return null;
    }
    try {
      return document.startViewTransition({ update, types: [type] });
    } catch (e) {
      return document.startViewTransition(update); // браузеры без «типов» переходов
    }
  };

  /** Дать карточкам товаров имена, чтобы при сортировке и фильтрах они плавно меняли места. */
  ui.nameCards = (container) => {
    container.querySelectorAll('.product-card[data-id]').forEach((card) => {
      card.style.viewTransitionName = 'card-' + card.dataset.id;
    });
  };

  /** Сдвинуть элемент с проявлением: dir 1 — справа, -1 — слева, 0 — снизу. */
  ui.slideIn = (el, dir = 0, distance = 28) => {
    if (!el || !el.animate || calm()) return;
    el.animate(
      [
        { opacity: 0, translate: dir ? `${dir * distance}px 0` : `0 ${distance / 2}px` },
        { opacity: 1, translate: '0 0' }
      ],
      { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    );
  };

  /** Бегунок под активной вкладкой: плавно переезжает к выбранной. Вызывать после каждой смены вкладки. */
  ui.tabsInk = (tabs) => {
    if (!tabs) return;
    let ink = tabs.querySelector('.tabs-ink');
    const first = !ink;
    if (first) {
      ink = document.createElement('span');
      ink.className = 'tabs-ink';
      ink.setAttribute('aria-hidden', 'true');
      tabs.append(ink);
      tabs.classList.add('has-ink');
      ink.style.transition = 'none';
      window.addEventListener('resize', () => ui.tabsInk(tabs));
    }
    const active = tabs.querySelector('.is-active');
    if (!active) return;
    ink.style.width = active.offsetWidth + 'px';
    ink.style.transform = `translateX(${active.offsetLeft}px)`;
    if (first) requestAnimationFrame(() => requestAnimationFrame(() => (ink.style.transition = '')));
  };

  /* ---------- Фото товара «перелетает» между карточкой и страницей товара ---------- */
  const clearPhotoNames = () =>
    document.querySelectorAll('[data-vt-photo]').forEach((el) => {
      el.style.viewTransitionName = '';
      el.removeAttribute('data-vt-photo');
    });
  const namePhoto = (img) => {
    if (!img) return;
    img.style.viewTransitionName = PHOTO;
    img.setAttribute('data-vt-photo', '');
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.product-card a[href*="product.html"]');
    if (!link || e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    clearPhotoNames();
    // на странице товара у главного фото то же имя — убираем, чтобы имя было одно
    document.querySelectorAll('.pp-main img').forEach((img) => {
      img.style.viewTransitionName = 'none';
      img.setAttribute('data-vt-photo', '');
    });
    namePhoto(link.closest('.product-card').querySelector('.pc-media img'));
  });

  // Возврат со страницы товара: фото улетает обратно в свою карточку, если она видна на экране
  window.addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    const from = window.navigation && navigation.activation && navigation.activation.from;
    const slug = from && from.url && new URL(from.url).searchParams.get('slug');
    if (slug && !document.querySelector('.pp-main')) {
      const media = document.querySelector(`.product-card .pc-media[href$="slug=${CSS.escape(slug)}"]`);
      const img = media && media.querySelector('img');
      if (img) {
        const r = img.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) {
          clearPhotoNames();
          namePhoto(img);
        }
      }
    }
    e.viewTransition.finished.finally(clearPhotoNames);
  });

  /* ---------- Товар улетает в корзину ---------- */
  ui.flyToCart = (button) => {
    if (calm()) return;
    const source = button.closest('.product-card, .pp-top, .sticky-buy, .toast');
    const img = source && (source.querySelector('.pc-media img, .pp-main img') || document.querySelector('.pp-main img'));
    const target = [...document.querySelectorAll('[data-cart-count]')]
      .map((b) => b.parentElement)
      .find((el) => el.getBoundingClientRect().width > 0);
    if (!img || !target || !img.animate) return;
    const from = img.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!from.width) return;
    const size = Math.min(from.width, from.height, 120);
    const ghost = img.cloneNode();
    ghost.removeAttribute('id');
    ghost.removeAttribute('style');
    ghost.className = 'fly-ghost';
    ghost.style.cssText = `width:${size}px;height:${size}px;left:${from.left + (from.width - size) / 2}px;top:${from.top + (from.height - size) / 2}px`;
    document.body.appendChild(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const fly = ghost.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 60}px) scale(.55)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.4 }
      ],
      { duration: 750, easing: 'cubic-bezier(.45, 0, .2, 1)' }
    );
    const done = () => {
      ghost.remove();
      target.animate([{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '10deg' }, { rotate: '0deg' }], {
        duration: 420,
        easing: 'ease-out'
      });
    };
    fly.onfinish = done;
    fly.oncancel = () => ghost.remove();
  };
})();
