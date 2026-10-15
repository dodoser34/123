(() => {
  const { read, write, emit } = App.storage;
  const db = App.db;
  const KEY = 'site-photos';

  db.media = {

    gallery: () => read(KEY, {}).gallery || {},

    setGallery(i, src) {
      const data = read(KEY, {});
      data.gallery = Object.assign({}, data.gallery, { [i]: src });
      const ok = write(KEY, data);
      if (ok) emit('media');
      return ok;
    },

    resetGallery(i) {
      const data = read(KEY, {});
      if (data.gallery) delete data.gallery[i];
      write(KEY, data);
      emit('media');
    }
  };
})();
