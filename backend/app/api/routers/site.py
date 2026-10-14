"""Пользователи (админка), тексты и фото сайта, общий запрос при открытии страницы (/bootstrap)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import get_settings
from ...db.session import get_db
from ..deps import admin_user, optional_user
from ...db.models import Order, Product, SiteSetting, User
from ...services.payments import enabled_methods, readiness
from ...schemas import SitePhotoIn, TextEditsIn, UserPatchIn
from ..serializers import product_out, user_out
from .catalog import categories_list
from .orders import orders_out
from .reviews import reviews_list

router = APIRouter(tags=['Сайт и пользователи'])


# ---------- Пользователи ----------
@router.get('/admin/users', summary='Все пользователи')
async def users(db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    return [user_out(u) for u in (await db.execute(select(User).order_by(User.created_at))).scalars().all()]


@router.patch('/admin/users/{user_id}', summary='Заблокировать / разблокировать, переименовать')
async def patch_user(user_id: str, data: UserPatchIn, db: AsyncSession = Depends(get_db), me: User = Depends(admin_user)):
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(404, 'Пользователь не найден')
    if u.id == me.id and data.blocked:
        raise HTTPException(400, 'Нельзя заблокировать себя')
    if data.blocked is not None:
        u.blocked = data.blocked
    if data.name:
        u.name = data.name
    await db.commit()
    return user_out(u)


@router.delete('/admin/users/{user_id}', summary='Удалить пользователя')
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db), me: User = Depends(admin_user)):
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(404, 'Пользователь не найден')
    if u.id == me.id or u.role == 'admin':
        raise HTTPException(400, 'Администратора удалить нельзя')
    await db.delete(u)
    await db.commit()
    return {'status': 'deleted'}


# ---------- Тексты и фото сайта ----------
async def _setting(db: AsyncSession, key: str) -> dict:
    row = await db.get(SiteSetting, key)
    return dict(row.value) if row else {}


async def _save_setting(db: AsyncSession, key: str, value: dict) -> None:
    row = await db.get(SiteSetting, key) or SiteSetting(key=key)
    row.value = value
    db.add(row)
    await db.commit()


async def site_data(db: AsyncSession) -> dict:
    return {'textEdits': await _setting(db, 'text-edits'), 'sitePhotos': await _setting(db, 'site-photos')}


@router.get('/site', summary='Правки текстов и заменённые фото')
async def get_site(db: AsyncSession = Depends(get_db)):
    return await site_data(db)


@router.put('/site/texts', summary='Сохранить правки текстов сайта (все разом)')
async def save_texts(data: TextEditsIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    await _save_setting(db, 'text-edits', data.edits)
    return await site_data(db)


@router.put('/site/photos', summary='Заменить фото «Жизнь магазина» (пустой url — вернуть исходное)')
async def save_photo(data: SitePhotoIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    photos = await _setting(db, 'site-photos')
    gallery = dict(photos.get('gallery') or {})
    if data.url:
        gallery[str(data.index)] = data.url
    else:
        gallery.pop(str(data.index), None)
    photos['gallery'] = gallery
    await _save_setting(db, 'site-photos', photos)
    return await site_data(db)


# ---------- Всё для открытия страницы одним запросом ----------
@router.get('/bootstrap', summary='Данные для сайта: пользователь, каталог, отзывы, заказы, тексты')
async def bootstrap(voter: str = Query('', max_length=64, pattern=r'^[\w-]*$'), db: AsyncSession = Depends(get_db), user: User | None = Depends(optional_user)):
    s = get_settings()
    admin = bool(user and user.role == 'admin')
    q = select(Product).order_by(Product.created_at)
    if not admin:
        q = q.where(Product.status == 'published')
    if admin:
        orders = (await db.execute(select(Order).order_by(Order.seq.desc()))).scalars().all()
        users_ = [user_out(u) for u in (await db.execute(select(User).order_by(User.created_at))).scalars().all()]
    elif user:
        orders = (await db.execute(select(Order).where(Order.user_id == user.id).order_by(Order.seq.desc()))).scalars().all()
        users_ = [user_out(user)]
    else:
        orders, users_ = [], []
    return {
        'user': user_out(user) if user else None,
        'categories': await categories_list(db),
        'products': [product_out(p) for p in (await db.execute(q)).scalars().all()],
        'reviews': await reviews_list(db, user, voter, everything=admin),
        'orders': orders_out(orders),
        'users': users_,
        'site': await site_data(db),
        'payments': [m.info(s) for m in enabled_methods(s)],
        'config': {'freeShippingFrom': s.free_shipping_from, 'courierPrice': s.courier_price, 'google': s.google_enabled},
    }


# ---------- Готовность к запуску (админка → Настройки) ----------
@router.get('/admin/system', summary='Что настроено на сервере: почта, Google, оплата, предупреждения (без секретов)')
async def system(_: User = Depends(admin_user)):
    s = get_settings()
    return {
        'environment': s.environment,
        'email': {'backend': s.email_backend, 'ready': s.email_backend == 'smtp' and bool(s.smtp_user and s.smtp_password.get_secret_value())},
        'google': s.google_enabled,
        'payments': readiness(s),
        'problems': s.problems(),
    }
