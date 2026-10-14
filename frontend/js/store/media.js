/* Фото сайта, которые администратор может заменить в админке («Фото «О нас»»):
   6 фото блока «Жизнь магазина». Хранятся в браузере, как и фото товаров. */
(() => {
  const { read, write, emit } = App.storage;
  const db = App.db;
  const KEY = 'site-photos';

  db.media = {
    /** Заменённые фото галереи: { номер фото (0–5): data:URL }. */
    gallery: () => read(KEY, {}).gallery || {},
    /** Заменить фото номер i. Возвращает false, если память браузера переполнена. */
    setGallery(i, src) {
      const data = read(KEY, {});
      data.gallery = Object.assign({}, data.gallery, { [i]: src });
      const ok = write(KEY, data);
      if (ok) emit('media');
      return ok;
    },
    /** Вернуть исходное фото номер i. */
    resetGallery(i) {
      const data = read(KEY, {});
      if (data.gallery) delete data.gallery[i];
      write(KEY, data);
      emit('media');
    }
  };
})();
