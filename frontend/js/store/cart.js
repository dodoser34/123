(() => {
  const { KEYS, read, write, emit } = App.storage;
  const db = App.db;

  const maxQty = (p) => Math.max(1, Math.min(99, p && p.stock > 0 ? p.stock : 99));

  db.cart = {
    raw: () => read(KEYS.cart, []),

    items() {
      return db.cart
        .raw()
        .map((i) => ({ product: db.products.get(i.id), qty: i.qty }))
        .filter((i) => i.product)
        .map((i) => Object.assign(i, { available: db.products.isAvailable(i.product), qty: Math.min(i.qty, maxQty(i.product)) }));
    },

    add(id, qty = 1) {
      const p = db.products.get(id);
      if (!db.products.isAvailable(p)) return false;
      const cart = db.cart.raw();
      const item = cart.find((i) => i.id === id);
      if (item) item.qty = Math.min(maxQty(p), item.qty + qty);
      else cart.push({ id, qty: Math.min(maxQty(p), qty) });
      write(KEYS.cart, cart);
      emit('cart', { id, added: qty });
      return true;
    },

    set(id, qty) {
      const cart = db.cart.raw();
      const item = cart.find((i) => i.id === id);
      if (!item) return;
      item.qty = Math.max(1, Math.min(maxQty(db.products.get(id)), qty | 0));
      write(KEYS.cart, cart);
      emit('cart', { id });
    },

    remove(id, silent) {
      write(
        KEYS.cart,
        db.cart.raw().filter((i) => i.id !== id)
      );
      if (!silent) emit('cart', { id });
    },

    clear() {
      write(KEYS.cart, []);
      emit('cart');
    },

    count: () => db.cart.raw().reduce((s, i) => s + i.qty, 0),

    totals(deliveryMethod) {
      const all = db.cart.items();
      const items = all.filter((i) => i.available);
      const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
      const fullPrice = items.reduce((s, i) => s + (i.product.oldPrice || i.product.price) * i.qty, 0);
      let delivery = 0;
      if (deliveryMethod === 'courier') delivery = subtotal >= App.config.freeShippingFrom ? 0 : App.config.courierPrice;
      return {
        items,
        unavailable: all.filter((i) => !i.available),
        subtotal,
        discount: fullPrice - subtotal,
        delivery,
        total: subtotal + delivery,
        count: items.reduce((s, i) => s + i.qty, 0)
      };
    }
  };
})();
