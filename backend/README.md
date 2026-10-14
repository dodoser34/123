# Бэкенд K-Beauty | C-Health

FastAPI + PostgreSQL (SQLAlchemy 2, Alembic). Документация API — `/api/docs` (в рабочем режиме выключена).

## Свой компьютер — без настроек

```bash
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
python -m pytest                                    # тесты: функции + безопасность
```

Сам создаётся `dev.db` (SQLite) с демо-товарами; администратор `admin@demo.kz` / `admin12345`; коды из писем — в `dev-mail.log`.
Для своих значений можно (не обязательно) положить сюда `.env` с любыми переменными из `../deploy/.env.example`.

## Сервер

Все настройки — `deploy/.env` (образец со всеми пояснениями — [`deploy/.env.example`](../deploy/.env.example)).
Пошагово — [docs/11-Бэкенд-и-деплой.md](../docs/11-Бэкенд-и-деплой.md), архитектура — [docs/12](../docs/12-Архитектура.md),
платежи — [docs/14](../docs/14-Платежи.md), безопасность — [docs/15](../docs/15-Безопасность.md).

## Команды

```bash
python -m app.cli check            # что настроено и чего не хватает
python -m app.cli secret           # сгенерировать SECRET_KEY
python -m app.cli hash-password    # хеш пароля администратора → ADMIN_PASSWORD_HASH
python -m app.cli seed [--demo]    # стартовое наполнение базы
python -m app.cli admin            # применить администратора из .env сейчас
```

## Где что

| Папка | Что внутри |
|---|---|
| `app/core/` | настройки, пароли и токены, лимиты попыток, очистка ввода, защитный middleware |
| `app/db/` | подключение к базе, таблицы с ограничениями |
| `app/schemas/` | проверка входящих данных |
| `app/services/` | оплата (`payments/`), письма, наполнение |
| `app/api/` | маршруты `/api/…`, права, формат ответов |
| `migrations/` | схема базы |
| `tests/` | `test_api.py`, `test_security.py` |

Новая таблица или поле: поменять `app/db/models.py` → `alembic revision --autogenerate -m "что изменилось"` → проверить файл в `migrations/versions/` → `alembic upgrade head` (на сервере применяется сама при запуске).
