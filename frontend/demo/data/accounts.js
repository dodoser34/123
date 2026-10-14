/* ДЕМО: аккаунты покупателя и администратора. На странице входа показаны карточками «Быстрый вход».
   Удаляются вместе с папкой frontend/demo. Администратора для настоящего магазина задайте в js/config.js (adminEmails). */
App.seed = App.seed || {};

App.seed.users = [
  {
    id: 'u-demo-customer',
    role: 'customer',
    name: 'Айгерим',
    email: 'buyer@demo.kz',
    password: 'demo123',
    phone: '+7 (701) 555-12-34',
    createdAt: '2026-06-02',
    demo: { title: 'Покупатель', text: 'Корзина, избранное, оформление заказа и личный кабинет с историей заказов' }
  },
  {
    id: 'u-demo-admin',
    role: 'admin',
    name: 'Администратор',
    email: 'admin@demo.kz',
    password: 'admin123',
    phone: '',
    createdAt: '2026-01-01',
    demo: { title: 'Администратор', text: 'Полный доступ к админ-панели: товары, категории, заказы, пользователи' }
  }
];
