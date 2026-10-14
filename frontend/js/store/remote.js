/* Работа с сервером (бэкенд на FastAPI). Включается, если в frontend/env.js указан адрес API.
   • Читают страницы, как и раньше, из кеша в браузере — его заполняет app.js ответом /api/bootstrap.
   • Всё, что меняет данные (вход, регистрация, заказы, товары, отзывы, тексты, фото), уходит на сервер,
     после ответа кеш обновляется и страницы получают событие store:change.
   • Методы, которые на сервере выполняются не мгновенно, возвращают Promise — страницы вызывают их через await
     (в демо-режиме await просто получает готовое значение). */
(() => {
  const API = App.apiUrl;
  App.remote = { enabled: !!API };
  if (!API) return;

  const { KEYS, read, write, remove, emit, uid } = App.storage;
  const db = App.db;
  const ui = App.ui;
  const TOKEN_KEY = 'kbch.v1.token';

  /* ---------- Запросы ---------- */
  const getToken = () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  };
  const setToken = (t) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  };

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    let r;
    try {
      r = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw Object.assign(new Error(ui.t('common.errors.offlineTitle')), { status: 0 });
    }
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const d = data && data.detail;
      const message =
        typeof d === 'string'
          ? d
          : d && d.message
            ? d.message
            : r.status === 422
              ? ui.t('common.errors.invalid')
              : ui.t('common.errors.server');
      throw Object.assign(new Error(message), { status: r.status, code: d && d.code });
    }
    return data;
  }
  const api = (App.api = {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b || {}),
    put: (p, b) => request('PUT', p, b),
    patch: (p, b) => request('PATCH', p, b),
    del: (p, b) => request('DELETE', p, b)
  });
  /** Выполнить запрос и вернуть {error}, а не исключение — так страницы показывают ошибку под формой. */
  const safe = (promise) => promise.catch((e) => ({ error: e.message, status: e.status }));
  const fail = (e) => {
    ui.toast({ title: e.message, icon: 'x' });
    return null;
  };

  /* ---------- Кеш ---------- */
  function applyBoot(data) {
    App.boot = { ok: true, data };
    write(KEYS.products, data.products);
    write(KEYS.categories, data.categories);
    write(KEYS.reviews, data.reviews);
    write(KEYS.orders, data.orders);
    write(KEYS.users, data.users);
    write('site-photos', data.site.sitePhotos || {});
    if (data.user) write(KEYS.session, { userId: data.user.id });
    else remove(KEYS.session);
  }
  /** Перечитать всё с сервера (после входа, заказа, смены статусов). */
  App.remote.refresh = async () => {
    const voter = read(KEYS.voter, '');
    applyBoot(await api.get('/bootstrap?voter=' + encodeURIComponent(voter)));
    ['categories', 'products', 'reviews', 'orders', 'users'].forEach((t) => emit(t));
  };
  const replaceIn = (key, item) => {
    const list = read(key, []);
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item;
    else list.unshift(item);
    write(key, list);
  };
  const dropFrom = (key, id) =>
    write(
      key,
      read(key, []).filter((x) => x.id !== id)
    );

  /** Фото из админки (data:URL) → файл на сервере → адрес файла. */
  async function upload(src, folder) {
    if (!/^data:/.test(src)) return src;
    return (await api.post('/uploads', { data: src, folder })).url;
  }

  /* ---------- Аккаунт ---------- */
  async function afterLogin(res) {
    setToken(res.token);
    write(KEYS.users, [res.user]);
    write(KEYS.session, { userId: res.user.id });
    await App.remote.refresh().catch(() => {});
    emit('session');
    return { user: res.user };
  }
  function clearSession() {
    setToken('');
    remove(KEYS.session);
    write(KEYS.users, []);
    write(KEYS.orders, []);
    emit('session');
  }

  Object.assign(db.users, {
    MIN_PASSWORD: 8,
    /** Регистрация: аккаунт создаётся, на почту уходит код → {verify: true, email}. */
    register: ({ name, email, password }) =>
      safe(api.post('/auth/register', { name, email, password }).then((r) => ({ verify: true, email: r.email }))),
    verify: (email, code) => safe(api.post('/auth/verify', { email, code }).then(afterLogin)),
    resend: (email) => safe(api.post('/auth/resend', { email })),
    login: (email, password) =>
      api
        .post('/auth/login', { email, password })
        .then(afterLogin)
        .catch((e) => (e.code === 'email_not_verified' ? { verify: true, email, error: e.message } : { error: e.message })),
    requestCode: (email) => safe(api.post('/auth/code/request', { email })),
    loginWithCode: (email, code) => safe(api.post('/auth/code/verify', { email, code }).then(afterLogin)),
    forgot: (email) => safe(api.post('/auth/password/forgot', { email })),
    resetPassword: (email, code, password) => safe(api.post('/auth/password/reset', { email, code, password }).then(afterLogin)),
    googleUrl: (next) =>
      App.boot && App.boot.data && App.boot.data.config.google ? `${API}/auth/google/login?next=${encodeURIComponent(next || '')}` : '',

    async update(id, patch) {
      const me = db.session.user();
      try {
        let user;
        if (me && id === me.id) user = await api.patch('/auth/me', { name: patch.name, phone: patch.phone });
        else if (patch.role) return { error: 'Администратор один — он задаётся в настройках сервера (.env)' };
        else user = await api.patch('/admin/users/' + id, { blocked: patch.blocked, name: patch.name });
        replaceIn(KEYS.users, user);
        emit('users', { id });
        return { user };
      } catch (e) {
        return { error: e.message };
      }
    },
    changePassword: (id, oldPassword, newPassword) =>
      safe(api.post('/auth/password/change', { old: oldPassword, new: newPassword }).then(() => ({ ok: true }))),
    async remove(id) {
      try {
        await api.del('/admin/users/' + id);
        dropFrom(KEYS.users, id);
        emit('users');
      } catch (e) {
        fail(e);
      }
    },
    /** Удалить свой аккаунт (пароль — для подтверждения). */
    deleteAccount: (password) =>
      safe(
        api.del('/auth/me', { password }).then(() => {
          clearSession();
          return { ok: true };
        })
      )
  });

  db.session.end = () => {
    api.post('/auth/logout').catch(() => {});
    clearSession();
  };

  /* ---------- Каталог ---------- */
  Object.assign(db.products, {
    async save(product) {
      const current = product.id ? read(KEYS.products, []).find((p) => p.id === product.id) : null;
      const full = db.products.normalize(Object.assign({}, current || {}, product));
      try {
        full.images = await Promise.all(full.images.map((src) => upload(src, 'products')));
        const saved = current ? await api.put('/products/' + full.id, full) : await api.post('/products', full);
        replaceIn(KEYS.products, saved);
        emit('products', { id: saved.id });
        return db.products.normalize(saved);
      } catch (e) {
        return fail(e);
      }
    },
    async remove(id) {
      try {
        await api.del('/products/' + id);
        dropFrom(KEYS.products, id);
        db.cart.remove(id, true);
        db.favs.remove(id);
        emit('products', { id });
      } catch (e) {
        fail(e);
      }
    }
  });

  db.categories.saveAll = async (list) => {
    try {
      write(KEYS.categories, await api.put('/categories', list));
      emit('categories');
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  };

  /* ---------- Отзывы ---------- */
  const voterId = () => {
    let id = read(KEYS.voter, null);
    if (!id) write(KEYS.voter, (id = uid('v')));
    return id;
  };
  const patchReview = (review) => {
    replaceIn(KEYS.reviews, review);
    emit('reviews', { id: review.productId });
    return review;
  };
  Object.assign(db.reviews, {
    save: (data) =>
      safe(
        api.post(`/products/${data.productId}/reviews`, Object.assign({}, data, { voter: voterId() })).then((res) => {
          patchReview(res.review);
          return { updated: res.updated };
        })
      ),
    async vote(id) {
      try {
        const res = await api.post(`/reviews/${id}/vote`, { voter: voterId() });
        const review = db.reviews.get(id);
        if (review) patchReview(Object.assign({}, review, { helpful: res.helpful, voted: true }));
        return res.voted;
      } catch (e) {
        return fail(e) || false;
      }
    },
    hasVoted: (review) => !!review.voted,
    setStatus: (id, status) => api.patch(`/reviews/${id}/status`, { status }).then(patchReview, fail),
    reply: (id, text) => api.post(`/reviews/${id}/reply`, { text }).then(patchReview, fail),
    remove: (id) =>
      api.del('/reviews/' + id).then(() => {
        dropFrom(KEYS.reviews, id);
        emit('reviews');
      }, fail)
  });

  /* ---------- Заказы и оплата ---------- */
  Object.assign(db.orders, {
    /** Включённые на сервере способы оплаты: [{code, title, text}]. */
    paymentMethods: () => (App.boot && App.boot.data && App.boot.data.payments) || [],
    async create(data) {
      const totals = db.cart.totals(data.delivery);
      if (!totals.items.length) return { error: ui.t('common.errors.cartEmpty') };
      try {
        const order = await api.post(
          '/orders',
          Object.assign({}, data, { items: totals.items.map((i) => ({ id: i.product.id, qty: i.qty })) })
        );
        order.items.forEach((item) => db.cart.remove(item.id, true));
        await App.remote.refresh().catch(() => replaceIn(KEYS.orders, order));
        emit('cart');
        return { order };
      } catch (e) {
        return { error: e.message };
      }
    },
    async setStatus(id, status) {
      try {
        replaceIn(KEYS.orders, await api.patch('/admin/orders/' + id, { status }));
        await App.remote.refresh(); // отмена заказа возвращает товары на склад
      } catch (e) {
        fail(e);
      }
    },
    async setPaymentStatus(id, paymentStatus) {
      try {
        replaceIn(KEYS.orders, await api.patch('/admin/orders/' + id, { paymentStatus }));
        emit('orders', { id });
      } catch (e) {
        fail(e);
      }
    },
    async remove(id) {
      try {
        await api.del('/admin/orders/' + id);
        dropFrom(KEYS.orders, id);
        emit('orders');
      } catch (e) {
        fail(e);
      }
    }
  });

  /* ---------- Фото и тексты сайта ---------- */
  const savePhotos = (site) => {
    write('site-photos', site.sitePhotos || {});
    emit('media');
    return true;
  };
  Object.assign(db.media, {
    async setGallery(i, src) {
      try {
        return savePhotos(await api.put('/site/photos', { index: i, url: await upload(src, 'site') }));
      } catch (e) {
        return fail(e) || false;
      }
    },
    resetGallery: (i) => api.put('/site/photos', { index: i, url: '' }).then(savePhotos, fail)
  });

  // правки текстов из админки сохраняются на сервере (вместе, через полсекунды после последней правки)
  const pushTexts = ui.debounce(() => api.put('/site/texts', { edits: ui.textEdits.all() }).catch(fail), 500);
  ['set', 'reset'].forEach((name) => {
    const local = ui.textEdits[name];
    ui.textEdits[name] = (...args) => {
      const ok = local(...args);
      pushTexts();
      return ok;
    };
  });

  // сброс к демо-данным на сервере не делается — только в демо-режиме
  db.reset = null;
})();
