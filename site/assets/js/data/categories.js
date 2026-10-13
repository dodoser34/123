/* Стартовые категории и подкатегории каталога */
App.seed = App.seed || {};

App.seed.categories = [
  {
    id: 'korean-cosmetics',
    name: 'Корейская косметика',
    icon: 'bottle',
    subs: [
      { id: 'face', name: 'Уход за лицом' },
      { id: 'body', name: 'Уход за телом' },
      { id: 'hair', name: 'Для волос' },
      { id: 'makeup', name: 'Декоративная косметика' }
    ]
  },
  {
    id: 'herbs',
    name: 'Травы и сборы',
    icon: 'sprout',
    subs: [
      { id: 'immunity', name: 'Для иммунитета' },
      { id: 'digestion', name: 'Для пищеварения' },
      { id: 'womens-health', name: 'Для женского здоровья' },
      { id: 'nervous-system', name: 'Для нервной системы' }
    ]
  },
  { id: 'sets', name: 'Наборы', icon: 'gift', subs: [] }
];
