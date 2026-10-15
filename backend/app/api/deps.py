from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import token_hash
from ..db.models import Session, User
from ..db.session import get_db


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith('bearer ') and len(authorization) <= 200:
        return authorization[7:].strip() or None
    return None


async def optional_user(authorization: str | None = Header(None), db: AsyncSession = Depends(get_db)) -> User | None:
    token = _bearer(authorization)
    if not token:
        return None
    row = await db.get(Session, token_hash(token))
    if not row:
        return None
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.delete(row)
        await db.commit()
        return None
    user = await db.get(User, row.user_id)
    if not user or user.blocked:
        return None
    return user


async def current_user(user: User | None = Depends(optional_user)) -> User:
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Войдите в аккаунт')
    return user


async def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != 'admin':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Нужны права администратора')
    return user


async def current_session_hash(authorization: str | None = Header(None)) -> str | None:
    token = _bearer(authorization)
    return token_hash(token) if token else None


async def first(db: AsyncSession, query):
    return (await db.execute(query)).scalars().first()


__all__ = ['optional_user', 'current_user', 'admin_user', 'current_session_hash', 'first', 'select']
