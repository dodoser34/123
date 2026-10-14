/* ДЕМО: заказы демо-покупателя Айгерим — чтобы личный кабинет и админка не были пустыми.
   Удаляются вместе с папкой frontend/demo. */
App.seed = App.seed || {};

App.seed.orders = [
  {
    id: 'o-demo-1',
    number: 1001,
    userId: 'u-demo-customer',
    status: 'done',
    createdAt: '2026-09-14T11:20:00.000Z',
    name: 'Айгерим',
    phone: '+7 (701) 555-12-34',
    email: 'buyer@demo.kz',
    delivery: 'courier',
    deliveryTitle: 'Курьер по Костанаю',
    city: 'Костанай',
    address: 'ул. Демонстрационная, 1',
    payment: 'card',
    paymentTitle: 'Картой онлайн (демо), •••• 4242',
    paid: true,
    cardLast4: '4242',
    cardBrand: 'Visa',
    comment: '',
    items: [
      {
        id: 'p1',
        name: 'Успокаивающий тонер Anua Heartleaf 77%',
        price: 12990,
        qty: 1,
        image: 'demo/images/products/face/anua-toner.jpg'
      },
      { id: 'h3', name: 'Ромашка', price: 1990, qty: 2, image: 'demo/images/products/herbs/herb-chamomile.jpg' }
    ],
    subtotal: 16970,
    deliveryPrice: 0,
    total: 16970
  },
  {
    id: 'o-demo-2',
    number: 1002,
    userId: 'u-demo-customer',
    status: 'shipped',
    createdAt: '2026-10-08T15:45:00.000Z',
    name: 'Айгерим',
    phone: '+7 (701) 555-12-34',
    email: 'buyer@demo.kz',
    delivery: 'kazakhstan',
    deliveryTitle: 'Доставка по Казахстану',
    city: 'Астана',
    address: 'пр. Демонстрационный, 10',
    payment: 'cash',
    paymentTitle: 'Наличными при получении',
    comment: 'Позвонить за час',
    items: [
      {
        id: 'p4',
        name: 'Увлажняющая сыворотка Torriden Dive-In',
        price: 9990,
        qty: 1,
        image: 'demo/images/products/face/torriden-serum.jpg'
      },
      { id: 'h1', name: 'Сбор для иммунитета', price: 3990, qty: 1, image: 'demo/images/products/herbs/herb-immunity.jpg' }
    ],
    subtotal: 13980,
    deliveryPrice: 0,
    total: 13980
  }
];
