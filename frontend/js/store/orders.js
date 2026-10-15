(() => {
  const { KEYS, read, write, emit, uid } = App.storage;
  const db = App.db;

  db.orders = {
    STATUSES: App.ui.t('common.orderStatuses'),
    all: () => read(KEYS.orders, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    get: (id) => db.orders.all().find((o) => o.id === id),
    forUser: (userId) => db.orders.all().filter((o) => o.userId === userId),

    create(data) {
      const totals = db.cart.totals(data.delivery);
      if (!totals.items.length) return { error: App.ui.t('common.errors.cartEmpty') };
      const orders = read(KEYS.orders, []);
      const user = db.session.user();
      const order = Object.assign({}, data, {
        id: uid('o'),
        number: Math.max(1000, ...orders.map((o) => o.number || 0)) + 1,
        userId: user ? user.id : null,
        status: 'new',
        createdAt: new Date().toISOString(),
        items: totals.items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          qty: i.qty,
          image: i.product.images[0] || ''
        })),
        subtotal: totals.subtotal,
        deliveryPrice: totals.delivery,
        total: totals.total
      });

      const products = read(KEYS.products, []);
      order.items.forEach((item) => {
        const p = products.find((x) => x.id === item.id);
        if (p) p.stock = Math.max(0, (p.stock || 0) - item.qty);
      });
      write(KEYS.products, products);
      write(KEYS.orders, orders.concat(order));
      order.items.forEach((item) => db.cart.remove(item.id, true));
      emit('orders', { id: order.id });
      emit('cart');
      return { order };
    },

    setStatus(id, status) {
      const orders = read(KEYS.orders, []);
      const order = orders.find((o) => o.id === id);
      if (!order) return;
      order.status = status;
      write(KEYS.orders, orders);
      emit('orders', { id });
    },

    remove(id) {
      write(
        KEYS.orders,
        read(KEYS.orders, []).filter((o) => o.id !== id)
      );
      emit('orders');
    }
  };
})();
