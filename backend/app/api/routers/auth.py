import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import get_settings
from ...core.rate_limit import client_ip, enforce, limit
from ...core.security import (
    code_hash,
    hash_password,
    new_code,
    new_token,
    password_problem,
    same,
    token_hash,
    verify_password,
)


from ...db.models import EmailCode, Session, User
from ...db.session import get_db
from ...schemas import CodeIn, DeleteMeIn, EmailIn, LoginIn, PasswordIn, ProfileIn, RegisterIn, ResetIn
from ...services.emails import send_code
from ..deps import current_session_hash, current_user, first
from ..serializers import user_out

router = APIRouter(prefix='/auth', tags=['Аккаунт'])
log = logging.getLogger('kbch.security')


def _utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _user_by_email(db: AsyncSession, email: str) -> User | None:
    return await first(db, select(User).where(User.email == email.lower()))


async def _session(db: AsyncSession, user: User) -> dict:
    token = new_token()
    db.add(Session(token_hash=token_hash(token), user_id=user.id, expires_at=datetime.now(timezone.utc) + timedelta(days=get_settings().session_days)))
    await db.execute(delete(Session).where(Session.user_id == user.id, Session.expires_at < datetime.now(timezone.utc)))
    await db.commit()
    return {'token': token, 'user': user_out(user)}


def _check_password(password: str, email: str = '') -> None:
    problem = password_problem(password, email)
    if problem:
        raise HTTPException(422, problem)


def _check_domain(email: str) -> None:
    domains = get_settings().email_domains
    if domains and email.split('@')[-1].lower() not in domains:
        raise HTTPException(422, 'Регистрация возможна только с почтой: ' + ', '.join('@' + d for d in domains))


def _per_email(request: Request, email: str, rule: str = 'rate_codes') -> None:
    enforce(f'{rule}:{email.lower()}', getattr(get_settings(), rule))


async def _issue_code(db: AsyncSession, email: str, purpose: str) -> None:
    s = get_settings()
    email = email.lower()
    last = await first(db, select(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose).order_by(desc(EmailCode.id)))
    if last and (datetime.now(timezone.utc) - _utc(last.created_at)).total_seconds() < s.code_resend_seconds:
        raise HTTPException(429, f'Код уже отправлен. Повторно можно запросить через {s.code_resend_seconds} секунд.')
    code = new_code()
    await db.execute(delete(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose, EmailCode.used.is_(False)))
    db.add(EmailCode(email=email, purpose=purpose, code_hash=code_hash(email, code), expires_at=datetime.now(timezone.utc) + timedelta(minutes=s.code_ttl_minutes)))
    await db.commit()
    try:
        await send_code(email, code, purpose)
    except Exception as e:
        logging.getLogger('kbch.email').exception('Не удалось отправить письмо: %s', e)
        raise HTTPException(502, 'Не удалось отправить письмо. Попробуйте позже.') from e


async def _use_code(db: AsyncSession, email: str, code: str, purpose: str) -> None:
    s = get_settings()
    email = email.lower()
    row = await first(
        db,
        select(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose, EmailCode.used.is_(False)).order_by(desc(EmailCode.id)),
    )
    if not row or _utc(row.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(400, 'Код устарел. Запросите новый.')
    if row.attempts >= s.code_max_attempts:
        raise HTTPException(429, 'Слишком много попыток. Запросите новый код.')
    row.attempts += 1
    if not same(row.code_hash, code_hash(email, code)):
        await db.commit()
        log.warning('Неверный код (%s) для %s', purpose, email)
        raise HTTPException(400, 'Неверный код')
    row.used = True
    await db.commit()


@router.post('/register', summary='Регистрация: создаёт аккаунт и отправляет код подтверждения на почту', dependencies=[Depends(limit('rate_register', 'register'))])
async def register(data: RegisterIn, request: Request, db: AsyncSession = Depends(get_db)):
    email = data.email.lower()
    _per_email(request, email)
    _check_domain(email)
    _check_password(data.password, email)
    user = await _user_by_email(db, email)
    if user and user.email_verified:
        raise HTTPException(409, 'Этот email уже зарегистрирован. Войдите в аккаунт.')
    if user:
        raise HTTPException(409, 'Регистрация уже начата. Войдите по коду из письма или сбросьте пароль.')
    db.add(User(email=email, name=data.name, password_hash=hash_password(data.password)))
    try:
        await _issue_code(db, email, 'verify')
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(409, 'Регистрация уже начата. Войдите по коду из письма или сбросьте пароль.') from e
    return {'status': 'verify', 'email': email}


@router.post('/verify', summary='Подтвердить почту кодом из письма → вход', dependencies=[Depends(limit('rate_login', 'verify'))])
async def verify(data: CodeIn, db: AsyncSession = Depends(get_db)):
    user = await _user_by_email(db, data.email)
    if not user:
        raise HTTPException(404, 'Аккаунт не найден')
    if user.blocked:
        raise HTTPException(403, 'Аккаунт заблокирован. Свяжитесь с магазином.')
    if user.email_verified:
        raise HTTPException(400, 'Почта уже подтверждена. Войдите в аккаунт.')
    await _use_code(db, data.email, data.code, 'verify')
    user.email_verified = True
    return await _session(db, user)


@router.post('/resend', summary='Отправить код подтверждения ещё раз', dependencies=[Depends(limit('rate_codes', 'codes'))])
async def resend(data: EmailIn, request: Request, db: AsyncSession = Depends(get_db)):
    _per_email(request, data.email)
    user = await _user_by_email(db, data.email)
    if user and not user.email_verified:
        await _issue_code(db, data.email, 'verify')
    return {'status': 'sent'}


@router.post('/login', summary='Вход по email и паролю', dependencies=[Depends(limit('rate_login', 'login'))])
async def login(data: LoginIn, request: Request, db: AsyncSession = Depends(get_db)):
    email = data.email.lower()
    _per_email(request, email, 'rate_login_email')
    user = await _user_by_email(db, email)
    if not verify_password(data.password, user.password_hash if user else None) or not user:
        log.warning('Неудачный вход: %s с IP %s', email, client_ip(request))
        raise HTTPException(401, 'Неверный email или пароль')
    if user.blocked:
        raise HTTPException(403, 'Аккаунт заблокирован. Свяжитесь с магазином.')
    if not user.email_verified:
        try:
            await _issue_code(db, user.email, 'verify')
        except HTTPException as e:
            if e.status_code != 429:
                raise
        raise HTTPException(403, {'code': 'email_not_verified', 'message': 'Подтвердите почту: мы отправили код на ' + user.email})
    log.info('Вход: %s', email)
    return await _session(db, user)


@router.post('/logout', summary='Выйти (завершить текущую сессию)')
async def logout(session_hash: str | None = Depends(current_session_hash), db: AsyncSession = Depends(get_db)):
    if session_hash:
        await db.execute(delete(Session).where(Session.token_hash == session_hash))
        await db.commit()
    return {'status': 'ok'}


@router.post('/logout/all', summary='Выйти на всех устройствах')
async def logout_all(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Session).where(Session.user_id == user.id))
    await db.commit()
    return {'status': 'ok'}


@router.get('/me', summary='Текущий пользователь')
async def me(user: User = Depends(current_user)):
    return user_out(user)


@router.patch('/me', summary='Изменить имя и телефон')
async def update_me(data: ProfileIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if data.name is not None:
        user.name = data.name
    if data.phone is not None:
        user.phone = data.phone
    await db.commit()
    return user_out(user)


@router.post('/password/change', summary='Сменить пароль', dependencies=[Depends(limit('rate_login', 'password'))])
async def change_password(
    data: PasswordIn,
    user: User = Depends(current_user),
    session_hash: str | None = Depends(current_session_hash),
    db: AsyncSession = Depends(get_db),
):
    if user.password_hash and not verify_password(data.old, user.password_hash):
        raise HTTPException(400, 'Текущий пароль указан неверно')
    _check_password(data.new, user.email)
    user.password_hash = hash_password(data.new)
    await db.execute(delete(Session).where(Session.user_id == user.id, Session.token_hash != session_hash))
    await db.commit()
    log.info('Смена пароля: %s', user.email)
    return {'status': 'ok'}


@router.post('/password/forgot', summary='Сброс пароля: отправить код на почту', dependencies=[Depends(limit('rate_codes', 'codes'))])
async def forgot(data: EmailIn, request: Request, db: AsyncSession = Depends(get_db)):
    _per_email(request, data.email)
    if await _user_by_email(db, data.email):
        await _issue_code(db, data.email, 'reset')
    return {'status': 'sent'}


@router.post('/password/reset', summary='Сброс пароля по коду из письма → вход', dependencies=[Depends(limit('rate_login', 'reset'))])
async def reset(data: ResetIn, db: AsyncSession = Depends(get_db)):
    _check_password(data.password, data.email)
    await _use_code(db, data.email, data.code, 'reset')
    user = await _user_by_email(db, data.email)
    if not user:
        raise HTTPException(404, 'Аккаунт не найден')
    user.password_hash, user.email_verified = hash_password(data.password), True
    await db.execute(delete(EmailCode).where(EmailCode.email == user.email, EmailCode.purpose == 'verify'))
    await db.execute(delete(Session).where(Session.user_id == user.id))
    log.info('Сброс пароля: %s', user.email)
    return await _session(db, user)


@router.delete('/me', summary='Удалить аккаунт', dependencies=[Depends(limit('rate_login', 'delete'))])
async def delete_me(data: DeleteMeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if user.role == 'admin':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Аккаунт администратора задаётся в настройках сервера и не удаляется')
    if user.password_hash and not verify_password(data.password, user.password_hash):
        raise HTTPException(400, 'Пароль указан неверно')
    log.info('Удалён аккаунт: %s', user.email)
    await db.delete(user)
    await db.commit()
    return {'status': 'deleted'}
