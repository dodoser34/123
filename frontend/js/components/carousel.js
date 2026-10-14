/* Карусель: стрелки, прокрутка пальцем и автопрокрутка.
   Если над каруселью есть заголовок раздела (.section-head), стрелки переносятся в него,
   чтобы не перекрывать карточки. Автопрокрутка работает всегда и лишь ненадолго
   уступает, пока человек сам листает карусель. */
(() => {
  const ui = App.ui;
  const INTERVAL = 3200; // как часто карусель сдвигается сама, мс
  const RESUME_AFTER = 5000; // через сколько после ручной прокрутки она продолжит, мс

  ui.carousel = (root, options = {}) => {
    const track = options.track || root.querySelector('.carousel-track');
    if (!track || track.dataset.carouselReady) return;
    track.dataset.carouselReady = 'true';
    const prev = root.querySelector('.prev'),
      next = root.querySelector('.next');
    const head = root.previousElementSibling && root.previousElementSibling.matches('.section-head') ? root.previousElementSibling : null;
    if (head) {
      const nav = document.createElement('div');
      nav.className = 'carousel-nav';
      [prev, next].forEach((b) => b && nav.append(b));
      head.append(nav);
    }
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const step = () => {
      const children = track.children;
      return children.length > 1
        ? children[1].offsetLeft - children[0].offsetLeft
        : (children[0]?.offsetWidth || 300) + (parseFloat(getComputedStyle(track).columnGap) || 0);
    };
    let pausedUntil = 0,
      pressed = false;
    const manual = () => {
      pausedUntil = Date.now() + RESUME_AFTER;
    };
    const move = (distance) => {
      manual();
      track.scrollBy({ left: distance, behavior: 'smooth' });
    };
    const update = () => {
      if (prev) prev.disabled = track.scrollLeft < 5;
      if (next) next.disabled = track.scrollLeft >= max() - 5;
    };
    prev?.addEventListener('click', () => move(-step()));
    next?.addEventListener('click', () => move(step()));
    track.addEventListener('scroll', ui.debounce(update, 60), { passive: true });
    window.addEventListener('resize', update);
    // картинки и ссылки внутри карусели не перетаскиваются мышью
    track.addEventListener('dragstart', (e) => e.preventDefault());
    update();
    if (!options.autoplay) return;

    let visible = !('IntersectionObserver' in window),
      direction = 1,
      timer = null;
    const tick = () => {
      if (pressed || Date.now() < pausedUntil || max() < 5) return;
      if (track.scrollLeft >= max() - 5) direction = -1;
      else if (track.scrollLeft <= 5) direction = 1;
      track.scrollTo({ left: Math.max(0, Math.min(max(), track.scrollLeft + direction * step())), behavior: 'smooth' });
    };
    const schedule = () => {
      clearInterval(timer);
      timer = visible && !document.hidden ? setInterval(tick, INTERVAL) : null;
    };
    track.addEventListener('pointerdown', () => {
      pressed = true;
      manual();
    });
    window.addEventListener('pointerup', () => {
      if (pressed) manual();
      pressed = false;
    });
    ['wheel', 'keydown', 'touchmove'].forEach((event) => track.addEventListener(event, manual, { passive: true }));
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          schedule();
        },
        { threshold: 0.25 }
      ).observe(track);
    }
    schedule();
  };
})();
