App.texts.account = {
  meta: { title: 'Личный кабинет — {shop}' },

  greeting: { night: 'Доброй ночи', morning: 'Доброе утро', day: 'Добрый день', evening: 'Добрый вечер' },
  since: 'с нами с {date}',
  stats: {
    orders: '{count|заказ|заказа|заказов}',
    spent: 'сумма покупок',
    reviews: '{count|отзыв|отзыва|отзывов}',
    favorites: 'в избранном'
  },

  nav: {
    label: 'Личный кабинет',
    orders: 'Мои заказы',
    reviews: 'Мои отзывы',
    profile: 'Профиль',
    password: 'Пароль',
    favorites: 'Избранное',
    admin: 'Админ-панель',
    logout: 'Выйти'
  },

  orders: {
    title: 'Мои заказы',
    emptyTitle: 'Заказов пока нет',
    emptyText: 'Самое время выбрать что-нибудь приятное.',
    emptyAction: 'В каталог',
    number: 'Заказ №{number}',
    pieces: '{count} шт.',
    rate: 'Оценить',
    repeat: 'Повторить заказ',
    question: 'Вопрос по заказу',
    questionSubject: 'Вопрос по заказу №{number}',
    progressLabel: 'Статус заказа',

    payment: {
      awaiting: 'Ждёт оплаты',
      paid: 'Оплачен',
      pending: 'Оплата при получении',
      failed: 'Оплата не прошла',
      refunded: 'Деньги возвращены'
    },

    steps: { new: 'Принят', processing: 'Собираем', shipped: 'В пути', done: 'Получен' },
    repeatAdded: 'Товары добавлены в корзину',
    repeatGoToCart: 'Перейти в корзину',
    repeatNone: 'Этих товаров сейчас нет в наличии'
  },

  reviews: {
    title: 'Мои отзывы',
    emptyTitle: 'Вы ещё не оставляли отзывов',
    emptyText: 'Оценить товар можно на его странице или в разделе «Мои заказы».',
    productDeleted: 'Товар удалён',
    hidden: 'Скрыт модератором',
    published: 'Опубликован',
    helpful: '· Полезно: {count}',
    reply: 'Ответ магазина',
    edit: 'Изменить отзыв'
  },

  profile: {
    title: 'Профиль',
    name: 'Имя',
    email: 'Email',
    phone: 'Телефон',
    save: 'Сохранить',
    saved: 'Профиль сохранён',
    emailFixed: 'Почта — это логин аккаунта, изменить её нельзя.',
    errorName: 'Укажите имя',
    errorPhone: 'Введите номер полностью'
  },

  password: {
    title: 'Смена пароля',
    old: 'Текущий пароль',
    new1: 'Новый пароль',
    hint: 'Не менее {min} символов',
    new2: 'Повторите новый пароль',
    save: 'Изменить пароль',
    saved: 'Пароль изменён',
    errorShort: 'Не менее {min} символов',
    errorMatch: 'Пароли не совпадают',
    noPassword: 'У аккаунта пока нет пароля. Задайте его, чтобы входить по почте и паролю.'
  },

  delete: {
    title: 'Удалить аккаунт',
    text: 'Аккаунт и вход будут удалены навсегда. История заказов останется у магазина без привязки к вам.',
    password: 'Пароль для подтверждения',
    passwordEmpty: 'Введите пароль',
    button: 'Удалить аккаунт',
    confirm: 'Удалить аккаунт навсегда? Восстановить его будет нельзя.',
    done: 'Аккаунт удалён',
    adminForbidden: 'Аккаунт администратора удалить нельзя'
  }
};
