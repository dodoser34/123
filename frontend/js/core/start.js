(() => {
  const ui = App.ui;

  const SECTION = { 404: 'notFound' };
  ui.init = () => {
    ui.applyTexts();
    ui.applyMeta(SECTION[App.page] || App.page);
    ui.$$('img[data-failed]').forEach(ui.imgFail);
    App.started = true;
    ui.renderHeader();
    ui.renderFooter();
    ui.reveal();
  };
  const go = () => {
    if (App.auth.redirecting) return;
    ui.init();
    document.dispatchEvent(new Event('app:ready'));
    document.documentElement.classList.remove('is-booting');
    if (App.boot && !App.boot.ok)
      ui.toast({ title: ui.t('common.errors.offlineTitle'), text: ui.t('common.errors.offlineText'), icon: 'alert' });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
