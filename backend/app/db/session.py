import ssl
from collections.abc import AsyncIterator

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ..core.config import get_settings

JSONType = JSON().with_variant(JSONB(), 'postgresql')


class Base(DeclarativeBase):
    pass


def make_engine():
    s = get_settings()
    url = s.database_url.get_secret_value() or 'postgresql+asyncpg://not-configured/none'
    if not url.startswith('postgresql'):
        return create_async_engine(url)
    connect_args = {'server_settings': {'statement_timeout': str(s.db_statement_timeout_ms), 'application_name': 'kbch-api'}}
    if s.db_ssl:
        connect_args['ssl'] = ssl.create_default_context()
    return create_async_engine(
        url,
        pool_pre_ping=True,
        pool_size=s.db_pool_size,
        max_overflow=s.db_max_overflow,
        pool_recycle=1800,
        connect_args=connect_args,
    )


engine = make_engine()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
