(() => {
  const ui = App.ui;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const SELECTOR =
    '.reveal, .product-card, .section-head, .cat-circle, .trust-card, .gallery-grid > button, .contact-card, .page-head, .mission-img';

  const PHOTO = '.gallery-grid > button, .mission-img, .delivery-side';
  const DECOR = '.decor';
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
    const easing = 'cubic-bezier(.22, 1, .36, 1)';
    const photo = target.matches(PHOTO);
    const animation = photo
      ? target.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1100, delay: delay * 1.5, easing, fill: 'backwards' })
      : target.animate(
          [
            { opacity: 0, translate: '0 24px' },
            { opacity: 1, translate: '0 0' }
          ],
          { duration: 700, delay, easing, fill: 'backwards' }
        );
    const img = photo && target.querySelector('img');
    if (img) img.animate([{ scale: 1.18 }, { scale: 1 }], { duration: 1500, delay: delay * 1.5, easing, fill: 'backwards' });
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
      if (motion.matches || inViewport(el)) return;
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
