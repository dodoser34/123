/* Запуск: подключается последним. Рисует шапку и подвал, затем сообщает страницам «можно начинать» (событие app:ready) */
(() => {
  const ui = App.ui;
  window.imgFail = ui.imgFail;
  ui.init = () => {
    ui.$$('img[data-failed]').forEach(ui.imgFail);
    ui.renderHeader();
    ui.renderFooter();
    ui.reveal();
  };
  const go = () => {
    ui.init();
    document.dispatchEvent(new Event('app:ready'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
