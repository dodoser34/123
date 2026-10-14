/* Запуск: подключается последним. Вставляет тексты из frontend/texts/, рисует шапку и подвал,
   затем сообщает страницам «можно начинать» (событие app:ready) */
(() => {
  const ui = App.ui;
  // раздел текстов для заголовка вкладки: страница 404 → texts/…/not-found.js (App.texts.notFound)
  const SECTION = { 404: 'notFound' };
  ui.init = () => {
    ui.applyTexts();
    ui.applyMeta(SECTION[App.page] || App.page);
    ui.$$('img[data-failed]').forEach(ui.imgFail);
    App.started = true; // дальше незагрузившиеся картинки сразу заменяются заглушкой (см. app.js)
    ui.renderHeader();
    ui.renderFooter();
    ui.reveal();
  };
  const go = () => {
    if (App.auth.redirecting) return; // идёт переход на страницу входа
    ui.init();
    document.dispatchEvent(new Event('app:ready'));
    document.documentElement.classList.remove('is-booting'); // страница готова — показываем (см. app.js)
    if (App.boot && !App.boot.ok)
      ui.toast({ title: ui.t('common.errors.offlineTitle'), text: ui.t('common.errors.offlineText'), icon: 'alert' });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
