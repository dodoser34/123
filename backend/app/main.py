"""Бэкенд магазина K-Beauty | C-Health на FastAPI. Документация API: /api/docs (только в разработке).

Слои приложения (подробно — docs/12-Архитектура.md):
    core/      настройки, безопасность, лимиты запросов, очистка ввода, защитный middleware
    db/        подключение к PostgreSQL и таблицы
    schemas/   проверка входящих данных
    services/  письма, оплата, стартовое наполнение
    api/       маршруты /api/…
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .api.routers import auth, catalog, orders, reviews, site
from .core.config import get_settings
from .core.middleware import install as install_security
from .core.security import hash_password, verify_password
from .db.models import User
from .db.session import Base, SessionLocal, engine, get_db
from .services.seed import default_frontend, is_empty, seed

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
log = logging.getLogger('kbch')


async def ensure_admin() -> None:
    """Администратор один — тот, чья почта и пароль указаны в .env (ADMIN_EMAIL + ADMIN_PASSWORD или ADMIN_PASSWORD_HASH).
    При каждом запуске: создаётся, если его нет; пароль обновляется, если его поменяли в .env;
    у остальных аккаунтов роль администратора снимается. В базе хранится только bcrypt-хеш пароля."""
    s = get_settings()
    email = s.admin_email.strip().lower()
    pwd, pwd_hash = s.admin_password.get_secret_value(), s.admin_password_hash.get_secret_value().strip()
    async with SessionLocal() as db:
        admin = (await db.execute(select(User).where(User.email == email))).scalars().first()
        if not admin:
            admin = User(email=email, name=s.admin_name)
            db.add(admin)
            log.info('Создан администратор %s', email)
        admin.role, admin.email_verified, admin.blocked = 'admin', True, False
        if pwd_hash.startswith('$2'):
            admin.password_hash = pwd_hash
        elif pwd and not verify_password(pwd, admin.password_hash):
            admin.password_hash = hash_password(pwd)
        elif not pwd:
            log.error('Пароль администратора не задан: укажите ADMIN_PASSWORD или ADMIN_PASSWORD_HASH в .env')
        for other in (await db.execute(select(User).where(User.role == 'admin', User.email != email))).scalars().all():
            other.role = 'customer'
        await db.commit()


def check_settings() -> None:
    """Небезопасные настройки: в production сервер не запустится, в разработке — предупреждение в логе."""
    s = get_settings()
    problems = s.problems()
    if problems and s.is_production:
        raise RuntimeError('Небезопасные настройки .env:\n  - ' + '\n  - '.join(problems))
    if not s.is_production:
        log.info('Локальный режим (development): база %s, администратор %s', 'SQLite dev.db' if s.is_sqlite else 'PostgreSQL', s.admin_email)
        if problems:
            log.info('Для сервера нужно будет настроить: %s', '; '.join(p.split(':')[0] for p in problems))


async def prepare_dev_database() -> None:
    """Локальный запуск: таблицы в SQLite-файле создаются сами, добавляются только категории.
    На сервере (PostgreSQL) схему создают миграции: alembic upgrade head."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if await is_empty():
        try:
            await seed(default_frontend())
        except (OSError, SystemExit, ValueError):
            log.warning('Начальные категории пропущены: не найдена папка фронтенда')


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    check_settings()
    s = get_settings()
    if not s.is_production and s.is_sqlite and s.auto_create_tables:
        await prepare_dev_database()
    try:
        await ensure_admin()
    except Exception:  # noqa: BLE001 — таблиц ещё нет: сначала alembic upgrade head
        log.exception('Не удалось создать администратора. Выполнены ли миграции (alembic upgrade head)?')
        if s.is_production:
            raise RuntimeError('Не удалось подготовить базу данных и администратора')
    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title=f'{s.app_name} — API',
        version='1.1.0',
        docs_url='/api/docs' if s.show_docs else None,
        redoc_url=None,
        openapi_url='/api/openapi.json' if s.show_docs else None,
        lifespan=lifespan,
    )
    # порядок: последний добавленный middleware выполняется первым
    install_security(app)
    if s.cors_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=s.cors_list,
            allow_credentials=False,  # вход по токену в заголовке Authorization, cookie не используются → CSRF невозможен
            allow_methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
            allow_headers=['Authorization', 'Content-Type'],
            max_age=600,
        )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=s.hosts_list)

    for r in (auth, catalog, reviews, orders, site):
        app.include_router(r.router, prefix='/api')

    @app.get('/api/health', tags=['Сервис'], summary='Проверка, что сервер работает')
    async def health(db: AsyncSession = Depends(get_db)):
        try:
            await db.scalar(select(1))
        except Exception as exc:
            log.exception('Проверка готовности: база данных недоступна')
            raise HTTPException(503, 'База данных недоступна') from exc
        return {'status': 'ok'}

    Path(s.media_dir).mkdir(parents=True, exist_ok=True)
    app.mount(s.media_url, StaticFiles(directory=s.media_dir), name='media')
    return app


app = create_app()
