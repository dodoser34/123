/* Админка → фото товара: загрузка файлов (кнопкой или перетаскиванием), путь к файлу на сайте,
   порядок фото, главное фото, удаление. Первое фото — главное (его видно в каталоге). */
(() => {
  const { ui } = App;
  const A = App.admin;

  A.imagesBlock = () => `
    <label class="dropzone" id="dz" tabindex="0">
      ${ui.icon('upload')}
      <span><b>Выберите файлы</b> или перетащите сюда</span>
      <small>JPG, PNG, WEBP. Фото автоматически уменьшаются до 1000 px. Первое фото — главное.</small>
      <input type="file" id="f-files" accept="image/*" multiple hidden>
    </label>
    <div class="url-row">
      <input class="input" id="f-url" placeholder="или путь к файлу на сайте: assets/images/products/face/new.jpg">
      <button class="btn btn-secondary btn-sm" type="button" id="add-url">Добавить</button>
    </div>
    <p class="field-hint">Совет: снимите 3 фото — общий вид, текстуру крупным планом и товар в руке или в использовании.</p>
    <div class="img-list" id="img-list"></div>`;

  /** Подключить поведение. images — массив, который меняется на месте; onChange вызывается после каждой правки. */
  A.initImages = (images, onChange) => {
    const list = document.getElementById('img-list');
    const dz = document.getElementById('dz');
    const fileInput = document.getElementById('f-files');
    const urlInput = document.getElementById('f-url');

    const draw = () => {
      list.innerHTML = images.length
        ? images
            .map(
              (src, i) => `
          <div class="img-item">
            ${ui.img(src, '')}
            ${i === 0 ? '<span class="tag main-badge">Главное</span>' : ''}
            <div class="ii-actions">
              ${i > 0 ? `<button type="button" data-img-left="${i}" title="Левее" aria-label="Переместить левее">${ui.icon('chevron-left')}</button>` : ''}
              ${i > 0 ? `<button type="button" data-img-main="${i}" title="Сделать главным" aria-label="Сделать главным">${ui.icon('star')}</button>` : ''}
              ${i < images.length - 1 ? `<button type="button" data-img-right="${i}" title="Правее" aria-label="Переместить правее">${ui.icon('chevron-right')}</button>` : ''}
              <button type="button" data-img-del="${i}" title="Удалить" aria-label="Удалить фото">${ui.icon('trash')}</button>
            </div>
          </div>`
            )
            .join('')
        : '<p class="muted img-empty">Фото пока нет — на сайте будет показана заглушка с лотосом.</p>';
    };
    const update = () => {
      draw();
      onChange();
    };

    async function addFiles(files) {
      const pictures = Array.from(files).filter((f) => f.type.startsWith('image/'));
      for (const file of pictures) {
        try {
          images.push(await A.compress(file));
        } catch (e) {
          ui.toast({ title: 'Не удалось загрузить ' + file.name, icon: 'x' });
        }
      }
      if (pictures.length) update();
    }

    dz.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', () => {
      addFiles(fileInput.files);
      fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => (e.preventDefault(), dz.classList.add('is-over'))));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => (e.preventDefault(), dz.classList.remove('is-over'))));
    dz.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

    const addUrl = () => {
      const value = urlInput.value.trim();
      if (!value) return;
      images.push(value);
      urlInput.value = '';
      update();
    };
    document.getElementById('add-url').addEventListener('click', addUrl);
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addUrl();
      }
    });

    list.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.imgDel != null) images.splice(+d.imgDel, 1);
      if (d.imgLeft != null) [images[+d.imgLeft - 1], images[+d.imgLeft]] = [images[+d.imgLeft], images[+d.imgLeft - 1]];
      if (d.imgRight != null) [images[+d.imgRight + 1], images[+d.imgRight]] = [images[+d.imgRight], images[+d.imgRight + 1]];
      if (d.imgMain != null) images.unshift(images.splice(+d.imgMain, 1)[0]);
      update();
    });

    draw();
  };
})();
