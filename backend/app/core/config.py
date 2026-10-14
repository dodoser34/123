"""Настройки бэкенда.

Локально (ENVIRONMENT=development, по умолчанию) ничего настраивать не нужно: база — файл backend/dev.db,
администратор — admin@demo.kz / admin12345, письма — в лог и backend/dev-mail.log.

На сервере (ENVIRONMENT=production) всё берётся из переменных окружения — файл deploy/.env
(образец: deploy/.env.example) или панель хостинга. Секреты живут ТОЛЬКО там: в git и в ответы API они не попадают.
С небезопасными или незаполненными настройками сервер в production не запускается (см. problems()).
"""
from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
WEAK_SECRETS = ('change-me', 'changeme', 'password', 'secret', '12345', 'admin')

# значения только для локальной разработки — в production они не подставляются
DEV_DATABASE_URL = f'sqlite+aiosqlite:///{(BACKEND_DIR / "dev.db").as_posix()}'
DEV_ADMIN_EMAIL = 'admin@demo.kz'
DEV_ADMIN_PASSWORD = 'admin12345'


class Settings(BaseSettings):
    # .env ищется в текущей папке и в папке backend/ — сервер можно запускать из любой из них
    model_config = SettingsConfigDict(env_file=('.env', BACKEND_DIR / '.env'), env_file_encoding='utf-8', extra='ignore')

    # ---------- Общее ----------
    app_name: str = 'K-Beauty | C-Health'
    environment: str = 'development'  # development | production
    secret_key: SecretStr = Field(SecretStr('change-me-in-production-0000'), description='подпись кодов и state; ≥ 32 символов в production')
    frontend_url: str = 'http://localhost:5174'  # адрес сайта: сюда возвращает вход через Google
    public_api_url: str = 'http://localhost:8000/api'  # адрес API снаружи: для Google и ссылок на фото
    cors_origins: str = 'http://localhost:5174,http://127.0.0.1:5174'  # с каких сайтов можно обращаться к API
    allowed_hosts: str = '*'  # имена хостов, на которые отвечает API (через запятую): shop.kz,www.shop.kz
    docs_enabled: bool | None = None  # /api/docs; по умолчанию включено в development и выключено в production
    trust_proxy: bool = False  # за Nginx/Render: брать IP посетителя из X-Forwarded-For (нужно для ограничения запросов)
    proxy_hops: int = 1  # сколько прокси стоит перед бэкендом (Nginx — 1; Cloudflare + Nginx — 2)

    # ---------- База данных PostgreSQL ----------
    database_url: SecretStr = SecretStr('')  # пусто в разработке → SQLite-файл backend/dev.db
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_statement_timeout_ms: int = 15000  # долгий запрос прерывается — защита от «зависания» базы
    db_ssl: bool = False  # шифровать соединение с базой (внешние облачные базы)
    auto_create_tables: bool = True  # только разработка на SQLite: создать таблицы и демо-наполнение без миграций

    # ---------- Администратор (один). Создаётся/обновляется при каждом запуске ----------
    admin_email: str = ''
    # можно указать пароль (ADMIN_PASSWORD) или его bcrypt-хеш (ADMIN_PASSWORD_HASH — тогда пароль нигде не хранится открыто).
    # хеш: python -m app.cli hash-password
    admin_password: SecretStr = SecretStr('')
    admin_password_hash: SecretStr = SecretStr('')
    admin_name: str = 'Администратор'

    # ---------- Сессии, пароли, коды из писем ----------
    session_days: int = 30
    password_min_length: int = 8
    code_ttl_minutes: int = 10
    code_resend_seconds: int = 60
    code_max_attempts: int = 5
    allowed_email_domains: str = ''  # с каких почт можно регистрироваться (через запятую); пусто — с любых

    # ---------- Ограничение частоты запросов (защита от перебора паролей и DDoS) ----------
    rate_limit_enabled: bool = True
    rate_login: str = '10/minute'  # вход с одного IP
    rate_login_email: str = '5/minute'  # попытки входа в один аккаунт
    rate_codes: str = '5/minute'  # отправка писем с кодами
    rate_register: str = '5/hour'  # регистраций с одного IP
    rate_write: str = '60/minute'  # заказы, отзывы, голоса с одного IP
    rate_global: str = '300/minute'  # любые запросы к API с одного IP
    max_body_kb: int = 1024  # предельный размер запроса (кроме загрузки фото)

    # ---------- Отправка писем ----------
    email_backend: str = 'console'  # console — коды пишутся в лог (разработка); smtp — настоящая отправка
    email_log_file: str = ''  # разработка: при console письма ещё и дописываются в файл
    smtp_host: str = 'smtp.gmail.com'
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: SecretStr = SecretStr('')  # Gmail — «пароль приложения»
    smtp_from: str = ''
    smtp_tls: bool = True

    # ---------- Вход через Google ----------
    google_client_id: str = ''
    google_client_secret: SecretStr = SecretStr('')

    # ---------- Магазин, доставка, фото ----------
    free_shipping_from: int = 15000
    courier_price: int = 1000
    media_dir: str = str(BACKEND_DIR / 'media')
    media_url: str = '/media'
    max_upload_mb: int = 8

    # ---------- Оплата (см. docs/14-Платежи.md) ----------
    payment_methods: str = 'kaspi_transfer,cash'  # kaspi_transfer, cash, kaspi_pay
    kaspi_phone: str = ''
    kaspi_receiver: str = ''
    kaspi_pay_link: str = ''
    kaspi_api_url: str = 'https://kaspi.kz/pay/api'
    kaspi_merchant_id: str = ''
    kaspi_api_key: SecretStr = SecretStr('')
    kaspi_webhook_secret: SecretStr = SecretStr('')

    # ---------- Проверки ----------
    @field_validator('database_url', mode='before')
    @classmethod
    def async_driver(cls, url):
        # Render и другие хостинги выдают адрес вида postgres://… — переводим на асинхронный драйвер asyncpg
        url = url.get_secret_value() if isinstance(url, SecretStr) else str(url)
        for prefix in ('postgres://', 'postgresql://'):
            if url.startswith(prefix):
                return 'postgresql+asyncpg://' + url[len(prefix):]
        return url

    @model_validator(mode='after')
    def dev_defaults(self):
        # локальный запуск без .env: всё нужное подставляется само. В production — только явные значения.
        if not self.is_production:
            if not self.database_url.get_secret_value():
                self.database_url = SecretStr(DEV_DATABASE_URL)
            if not self.admin_email:
                self.admin_email = DEV_ADMIN_EMAIL
            if not self.admin_password.get_secret_value() and not self.admin_password_hash.get_secret_value():
                self.admin_password = SecretStr(DEV_ADMIN_PASSWORD)
            if self.email_backend == 'console' and not self.email_log_file:
                self.email_log_file = str(BACKEND_DIR / 'dev-mail.log')
            self.kaspi_phone = self.kaspi_phone or '+7 700 000 00 00'
            self.kaspi_receiver = self.kaspi_receiver or 'Магазин (тест)'
        return self

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.get_secret_value().startswith('sqlite')

    @property
    def is_production(self) -> bool:
        return self.environment == 'production'

    @property
    def show_docs(self) -> bool:
        return (not self.is_production) if self.docs_enabled is None else self.docs_enabled

    @staticmethod
    def _list(value: str) -> list[str]:
        return [x.strip() for x in value.split(',') if x.strip()]

    @property
    def cors_list(self) -> list[str]:
        return self._list(self.cors_origins)

    @property
    def hosts_list(self) -> list[str]:
        return self._list(self.allowed_hosts) or ['*']

    @property
    def email_domains(self) -> list[str]:
        return [x.lower().lstrip('@') for x in self._list(self.allowed_email_domains)]

    @property
    def payment_list(self) -> list[str]:
        return self._list(self.payment_methods)

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret.get_secret_value())

    @property
    def secret(self) -> bytes:
        return self.secret_key.get_secret_value().encode()

    def problems(self) -> list[str]:
        """Что настроено небезопасно. В production при любой проблеме сервер не запускается."""
        out = []
        key = self.secret_key.get_secret_value()
        if len(key) < 32 or any(w in key.lower() for w in WEAK_SECRETS):
            out.append('SECRET_KEY: нужна случайная строка не короче 32 символов')
        pwd = self.admin_password.get_secret_value()
        if not pwd and not self.admin_password_hash.get_secret_value():
            out.append('ADMIN_PASSWORD или ADMIN_PASSWORD_HASH: пароль администратора не задан')
        if pwd and (len(pwd) < 12 or any(w in pwd.lower() for w in WEAK_SECRETS)):
            out.append('ADMIN_PASSWORD: нужен пароль не короче 12 символов без простых слов')
        if '@' not in self.admin_email or self.admin_email.endswith(('@example.com', '@demo.kz')):
            out.append('ADMIN_EMAIL: укажите настоящую почту администратора')
        if self.is_production:
            if not self.database_url.get_secret_value() or self.is_sqlite:
                out.append('DATABASE_URL: в production нужна база PostgreSQL')
            if '*' in self.cors_list:
                out.append('CORS_ORIGINS: в production нельзя разрешать все сайты (*)')
            if 'localhost' in self.frontend_url or 'localhost' in self.public_api_url:
                out.append('FRONTEND_URL / PUBLIC_API_URL: укажите адреса сайта, а не localhost')
            if self.email_backend != 'smtp':
                out.append('EMAIL_BACKEND=smtp: иначе покупатели не получат коды подтверждения')
            from ..services.payments import METHODS  # здесь, а не наверху: оплата сама читает настройки

            for code in self.payment_list:
                if code not in METHODS:
                    out.append(f'PAYMENT_METHODS: неизвестный способ оплаты {code}')
                elif METHODS[code].missing(self):
                    out.append(f'PAYMENT_METHODS: для {code} заполните ' + ', '.join(METHODS[code].missing(self)))
        return out


@lru_cache
def get_settings() -> Settings:
    return Settings()
