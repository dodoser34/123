"""Каталог: категории и товары (смотреть — всем, менять — администратору), загрузка фото."""
import base64
import binascii
import re
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import get_settings
from ...core.rate_limit import limit
from ...db.session import get_db
from ..deps import admin_user, first, optional_user
from ...db.models import Category, Product, User, new_id
from ...schemas import CategoryIn, ProductIn, UploadIn
from ..serializers import PRODUCT_COLUMNS, product_out

router = APIRouter(tags=['Каталог'])


# ---------- Категории ----------
async def categories_list(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(select(Category).order_by(Category.position, Category.name))).scalars().all()
    return [{'id': c.id, 'name': c.name, 'icon': c.icon, 'subs': c.subs or []} for c in rows]


@router.get('/categories', summary='Категории и подкатегории')
async def get_categories(db: AsyncSession = Depends(get_db)):
    return await categories_list(db)


@router.put('/categories', summary='Сохранить все категории (как в разделе «Категории» админки)')
async def save_categories(data: list[CategoryIn], db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    ids = [c.id for c in data]
    if len(set(ids)) != len(ids):
        raise HTTPException(422, 'У двух категорий одинаковый адрес')
    existing = {c.id: c for c in (await db.execute(select(Category))).scalars().all()}
    for cid, cat in existing.items():
        if cid not in ids:
            used = await db.scalar(select(func.count()).select_from(Product).where(Product.category == cid))
            if used:
                raise HTTPException(409, f'В категории «{cat.name}» есть товары ({used}). Сначала перенесите их.')
            await db.delete(cat)
    for i, c in enumerate(data):
        row = existing.get(c.id) or Category(id=c.id)
        row.name, row.icon, row.position, row.subs = c.name, c.icon, i, [s.model_dump() for s in c.subs]
        db.add(row)
    await db.commit()
    return await categories_list(db)


# ---------- Товары ----------
def _slugify(text: str) -> str:
    table = str.maketrans({
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y',
        'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
        'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    })
    s = re.sub(r'[^a-z0-9]+', '-', text.lower().translate(table)).strip('-')
    return s[:100] or 'item'


async def _unique_slug(db: AsyncSession, slug: str, own_id: str | None = None) -> str:
    base, n, candidate = slug, 2, slug
    while True:
        row = await first(db, select(Product).where(Product.slug == candidate))
        if not row or row.id == own_id:
            return candidate
        candidate, n = f'{base}-{n}', n + 1


async def _fill(db: AsyncSession, p: Product, data: ProductIn) -> Product:
    raw = data.model_dump()
    if data.category and not await db.get(Category, data.category):
        raise HTTPException(422, 'Такой категории нет')
    p.name, p.brand, p.category, p.sub, p.status = data.name, data.brand, data.category, data.sub, data.status
    p.price, p.old_price, p.stock = data.price, data.oldPrice or None, data.stock
    p.slug = await _unique_slug(db, _slugify(data.slug or data.name), p.id)
    p.data = {k: v for k, v in raw.items() if k not in PRODUCT_COLUMNS}
    return p


@router.get('/products', summary='Товары (администратору с all=1 — включая скрытые)')
async def list_products(all: bool = False, db: AsyncSession = Depends(get_db), user: User | None = Depends(optional_user)):
    q = select(Product).order_by(Product.created_at)
    if not (all and user and user.role == 'admin'):
        q = q.where(Product.status == 'published')
    return [product_out(p) for p in (await db.execute(q)).scalars().all()]


@router.get('/products/{key}', summary='Товар по id или адресу (slug)')
async def get_product(key: str, db: AsyncSession = Depends(get_db), user: User | None = Depends(optional_user)):
    p = await db.get(Product, key) or await first(db, select(Product).where(Product.slug == key))
    if not p or (p.status == 'hidden' and not (user and user.role == 'admin')):
        raise HTTPException(404, 'Товар не найден')
    return product_out(p)


@router.post('/products', status_code=201, summary='Добавить товар')
async def create_product(data: ProductIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    wanted = str((data.model_extra or {}).get('id') or '')[:40]
    p = Product(id=wanted if wanted and not await db.get(Product, wanted) else new_id('p'))
    db.add(await _fill(db, p, data))
    await db.commit()
    return product_out(p)


@router.put('/products/{product_id}', summary='Изменить товар')
async def update_product(product_id: str, data: ProductIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(404, 'Товар не найден')
    await _fill(db, p, data)
    await db.commit()
    return product_out(p)


@router.delete('/products/{product_id}', summary='Удалить товар')
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(404, 'Товар не найден')
    await db.delete(p)
    await db.commit()
    return {'status': 'deleted'}


# ---------- Загрузка фото ----------
TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}


def image_type(raw: bytes) -> str | None:
    """Настоящий тип файла по первым байтам (сигнатуре), а не по тому, что заявил браузер:
    под видом фото нельзя загрузить HTML, SVG со скриптом или программу."""
    if raw.startswith(bytes.fromhex('ffd8ff')):
        return 'image/jpeg'
    if raw.startswith(bytes.fromhex('89504e470d0a1a0a')):
        return 'image/png'
    if raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
        return 'image/webp'
    return None


def media_public_url(path: str) -> str:
    s = get_settings()
    origin = s.public_api_url.rsplit('/api', 1)[0]
    return f'{origin}{s.media_url}/{path}'


@router.post('/uploads', status_code=201, summary='Загрузить фото (data:URL из админки) → адрес файла', dependencies=[Depends(limit('rate_write', 'uploads'))])
async def upload(data: UploadIn, _: User = Depends(admin_user)):
    s = get_settings()
    m = re.match(r'^data:(image/[a-z]+);base64,(.+)$', data.data, re.S)
    if not m or m.group(1) not in TYPES:
        raise HTTPException(422, 'Нужно фото в формате JPG, PNG или WEBP')
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except binascii.Error as e:
        raise HTTPException(422, 'Файл повреждён') from e
    if len(raw) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f'Фото больше {s.max_upload_mb} МБ')
    kind = image_type(raw)
    if not kind:
        raise HTTPException(422, 'Файл не похож на фото JPG, PNG или WEBP')
    folder = Path(s.media_dir) / data.folder
    folder.mkdir(parents=True, exist_ok=True)
    name = f'{secrets.token_hex(8)}.{TYPES[kind]}'  # имя придумывает сервер — путь из запроса не используется
    (folder / name).write_bytes(raw)
    return {'url': media_public_url(f'{data.folder}/{name}')}
