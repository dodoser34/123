/* Админка → уменьшение загружаемых фото (до 1000 px, JPEG), чтобы они помещались в память браузера */
(() => {
  const A = App.admin;

  function compress(file, max = 1000, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#F3EFE6';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  A.compress = compress;
})();
