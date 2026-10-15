from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
WEAK_SECRETS = ('change-me', 'changeme', 'password', 'secret', '12345', 'admin')

DEV_DATABASE_URL = f'sqlite+aiosqlite:///{(BACKEND_DIR / "dev.db").as_posix()}'
DEV_ADMIN_EMAIL = 'admin@demo.kz'
DEV_ADMIN_PASSWORD = 'admin12345'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=('.env', BACKEND_DIR / '.env'), env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'K-Beauty | C-Health'
    environment: str = 'development'
    secret_key: SecretStr = Field(SecretStr('change-me-in-production-0000'), description='подпись кодов и state; ≥ 32 символов в production')
    frontend_url: str = 'http://localhost:5174'
    public_api_url: str = 'http://localhost:8000/api'
    cors_origins: str = 'http://localhost:5174,http://127.0.0.1:5174'
    allowed_hosts: str = '*'
    docs_enabled: bool | None = None
    trust_proxy: bool = False
    proxy_hops: int = 1

    database_url: SecretStr = SecretStr('')
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_statement_timeout_ms: int = 15000
    db_ssl: bool = False
    auto_create_tables: bool = True

    admin_email: str = ''
    admin_password: SecretStr = SecretStr('')
    admin_password_hash: SecretStr = SecretStr('')
    admin_name: str = 'Администратор'

    session_days: int = 30
    password_min_length: int = 8
    code_ttl_minutes: int = 10
    code_resend_seconds: int = 60
    code_max_attempts: int = 5
    allowed_email_domains: str = ''

    rate_limit_enabled: bool = True
    rate_login: str = '10/minute'
    rate_login_email: str = '5/minute'
    rate_codes: str = '5/minute'
    rate_register: str = '5/hour'
    rate_write: str = '60/minute'
    rate_global: str = '300/minute'
    max_body_kb: int = 1024

    email_backend: str = 'console'
    email_log_file: str = ''
    smtp_host: str = 'smtp.gmail.com'
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: SecretStr = SecretStr('')
    smtp_from: str = ''
    smtp_tls: bool = True

    free_shipping_from: int = 15000
    courier_price: int = 1000
    media_dir: str = str(BACKEND_DIR / 'media')
    media_url: str = '/media'
    max_upload_mb: int = 8

    payment_methods: str = 'kaspi_transfer,cash,test_card,test_kaspi'
    kaspi_phone: str = ''
    kaspi_receiver: str = ''
    kaspi_pay_link: str = ''
    kaspi_api_url: str = 'https://kaspi.kz/pay/api'
    kaspi_merchant_id: str = ''
    kaspi_api_key: SecretStr = SecretStr('')
    kaspi_webhook_secret: SecretStr = SecretStr('')

    @field_validator('database_url', mode='before')
    @classmethod
    def async_driver(cls, url):
        url = url.get_secret_value() if isinstance(url, SecretStr) else str(url)
        for prefix in ('postgres://', 'postgresql://'):
            if url.startswith(prefix):
                return 'postgresql+asyncpg://' + url[len(prefix):]
        return url

    @model_validator(mode='after')
    def dev_defaults(self):
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
    def secret(self) -> bytes:
        return self.secret_key.get_secret_value().encode()

    def problems(self) -> list[str]:
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
            else:
                if not self.smtp_host.strip():
                    out.append('SMTP_HOST: укажите сервер отправки писем')
                if not 1 <= self.smtp_port <= 65535:
                    out.append('SMTP_PORT: нужен порт от 1 до 65535')
                if '@' not in (self.smtp_from or self.smtp_user):
                    out.append('SMTP_FROM / SMTP_USER: укажите адрес отправителя')
                password = self.smtp_password.get_secret_value()
                if bool(self.smtp_user.strip()) != bool(password):
                    out.append('SMTP_USER / SMTP_PASSWORD: укажите и логин, и пароль SMTP')
                elif self.smtp_host.lower() == 'smtp.gmail.com' and not self.smtp_user.strip():
                    out.append('SMTP_USER / SMTP_PASSWORD: для Gmail нужны почта и пароль приложения')
            from ..services.payments import METHODS

            for code in self.payment_list:
                if code not in METHODS:
                    out.append(f'PAYMENT_METHODS: неизвестный способ оплаты {code}')
                elif METHODS[code].missing(self):
                    out.append(f'PAYMENT_METHODS: для {code} заполните ' + ', '.join(METHODS[code].missing(self)))
        return out


@lru_cache
def get_settings() -> Settings:
    return Settings()
