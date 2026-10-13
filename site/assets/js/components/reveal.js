/* Плавное появление блоков при прокрутке.
   Блоки, которые уже видны при открытии страницы, не анимируются — так ничего не «мигает».
   Блоки ниже экрана заранее прячутся (.will-reveal) и проявляются, когда до них доскроллили.
   Новые элементы (например, карточки после смены фильтра) подхватываются автоматически. */
(() => {
  const ui = App.ui;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const SELECTOR = '.reveal, .product-card, .section-head, .cat-circle, .trust-card, .gallery-grid > button, .contact-card, .page-head';
  const DECOR = '.decor, .promo-herbs img';
  const seen = new WeakSet();
  const running = new Set();
  let mutations = null;

  const inViewport = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0 && r.width > 0;
  };

  function appear(target) {
    observer.unobserve(target);
    target.classList.remove('will-reveal');
    if (motion.matches || !target.animate) return;
    const siblings = [...target.parentElement.children].filter((el) => el.matches(SELECTOR));
    const delay = Math.min(Math.max(siblings.indexOf(target), 0), 5) * 65;
    const animation = target.animate(
      [
        { opacity: 0, translate: '0 24px' },
        { opacity: 1, translate: '0 0' }
      ],
      { duration: 700, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }
    );
    running.add(animation);
    animation.onfinish = animation.oncancel = () => running.delete(animation);
  }

  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach(({ target, isIntersecting }) => {
              if (target.matches(DECOR)) target.classList.toggle('motion-visible', isIntersecting);
              else if (isIntersecting) appear(target);
            }),
          { threshold: 0.08 }
        )
      : null;

  function register(root) {
    const all = SELECTOR + ', ' + DECOR;
    const elements = [...root.querySelectorAll(all)];
    if (root.matches && root.matches(all)) elements.unshift(root);
    elements.forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (!observer) return;
      if (el.matches(DECOR)) return observer.observe(el);
      if (motion.matches || inViewport(el)) return; // уже на экране — показываем сразу, без анимации
      el.classList.add('will-reveal');
      observer.observe(el);
    });
  }

  ui.reveal = () => {
    register(document);
    if (mutations) return;
    const main = document.querySelector('main') || document.body;
    mutations = new MutationObserver((records) =>
      records.forEach((record) => {
        record.removedNodes.forEach((node) => {
          if (node.nodeType !== 1 || !observer) return;
          observer.unobserve(node);
          node.querySelectorAll(SELECTOR + ', ' + DECOR).forEach((el) => observer.unobserve(el));
        });
        record.addedNodes.forEach((node) => node.nodeType === 1 && register(node));
      })
    );
    mutations.observe(main, { childList: true, subtree: true });
  };

  /* Страховка: если браузер не сообщил о появлении блока (например, вкладка была свёрнута),
     всё, что оказалось на экране после прокрутки страницы или карусели, показывается сразу. */
  const isOnScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  };
  const sweep = ui.debounce(() => {
    document.querySelectorAll('.will-reveal').forEach((el) => isOnScreen(el) && appear(el));
  }, 200);
  document.addEventListener('scroll', sweep, { capture: true, passive: true });
  window.addEventListener('resize', sweep);
  document.addEventListener('visibilitychange', sweep);

  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    running.forEach((animation) => animation.cancel());
    document.querySelectorAll('.will-reveal').forEach((el) => el.classList.remove('will-reveal'));
  });
})();
