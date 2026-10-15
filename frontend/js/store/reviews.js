(() => {
  const { KEYS, read, write, emit, uid, today } = App.storage;
  const db = App.db;

  const USAGE_PERIODS = App.ui.t('common.usagePeriods');

  function normalize(r) {
    return Object.assign(
      {
        title: '',
        pros: '',
        cons: '',
        recommend: true,
        period: '',
        helpful: 0,
        status: 'published',
        reply: null,
        verified: false,
        userId: null
      },
      r
    );
  }

  function voterId() {
    let id = read(KEYS.voter, null);
    if (!id) {
      id = uid('v');
      write(KEYS.voter, id);
    }
    return id;
  }

  function saveAll(list, detail) {
    write(KEYS.reviews, list);
    emit('reviews', detail);
  }

  function patch(id, change) {
    const list = read(KEYS.reviews, []);
    const r = list.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, change);
    saveAll(list, { id: r.productId });
    return normalize(r);
  }

  db.reviews = {
    USAGE_PERIODS,

    all: () =>
      read(KEYS.reviews, [])
        .map(normalize)
        .sort((a, b) => b.date.localeCompare(a.date)),

    forProduct: (productId) => db.reviews.all().filter((r) => r.productId === productId && r.status !== 'hidden'),
    byUser: (productId, userId) => (userId ? db.reviews.all().find((r) => r.productId === productId && r.userId === userId) : null),
    get: (id) => db.reviews.all().find((r) => r.id === id),

    hasPurchased: (productId, userId) =>
      !!userId && db.orders.forUser(userId).some((o) => o.status !== 'cancelled' && o.items.some((i) => i.id === productId)),

    save(data) {
      const list = read(KEYS.reviews, []);
      const existing = data.userId && list.find((r) => r.productId === data.productId && r.userId === data.userId);
      const fields = {
        name: data.name,
        rating: data.rating,
        title: data.title,
        text: data.text,
        pros: data.pros,
        cons: data.cons,
        recommend: data.recommend,
        period: data.period,
        verified: db.reviews.hasPurchased(data.productId, data.userId)
      };
      if (existing) {
        Object.assign(existing, fields, { edited: today() });
      } else {
        list.push(
          Object.assign(
            { id: uid('r'), productId: data.productId, userId: data.userId || null, date: today(), helpful: 0, status: 'published' },
            fields
          )
        );
      }
      saveAll(list, { id: data.productId });
      return { updated: !!existing };
    },

    vote(id) {
      const voter = voterId();
      const list = read(KEYS.reviews, []);
      const r = list.find((x) => x.id === id);
      if (!r) return false;
      r.voters = r.voters || [];
      if (r.voters.includes(voter)) return false;
      r.voters.push(voter);
      r.helpful = (r.helpful || 0) + 1;
      saveAll(list, { id: r.productId });
      return true;
    },
    hasVoted: (review) => (review.voters || []).includes(read(KEYS.voter, '')),

    setStatus: (id, status) => patch(id, { status }),
    reply: (id, text) => patch(id, { reply: text ? { text, date: today() } : null }),
    remove(id) {
      saveAll(read(KEYS.reviews, []).filter((r) => r.id !== id));
    }
  };
})();
