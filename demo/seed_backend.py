"""Необязательный импорт примеров только в локальную БД: python demo/seed_backend.py.
Существующие товары не перезаписываются; production запрещён.
Фото примеров копируются в папку загрузок сервера (backend/media/products/demo/) и получают адреса /media/… —
так же, как фото, загруженные из админки, поэтому основной сайт с API показывает их без папки demo.
"""
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'backend'))

from sqlalchemy import select

from app.api.routers.catalog import media_public_url
from app.api.serializers import PRODUCT_COLUMNS
from app.db.models import Category, Product, Review
from app.db.session import SessionLocal

PROJECT_DIR = Path(__file__).resolve().parent.parent


def default_frontend() -> Path:
    """Папка фронтенда рядом с backend/."""
    return PROJECT_DIR / 'frontend'


async def is_empty() -> bool:
    async with SessionLocal() as db:
        return (await db.execute(select(Category.id).limit(1))).first() is None


def read_js_array(path: Path, name: str) -> list:
    """Достать массив App.seed.<name> = [...] из JS-файла фронтенда (это почти JSON)."""
    text = path.read_text(encoding='utf-8')
    m = re.search(rf'App\.seed\.{name}\s*=\s*(\[.*?\]);\s*$', text, re.S | re.M)
    if not m:
        raise SystemExit(f'В {path} не найден App.seed.{name}')
    return json.loads(js_to_json(m.group(1)))


def js_to_json(js: str) -> str:
    """Перевести литерал JS (объекты, массивы, строки в '…', комментарии) в JSON, не трогая содержимое строк."""
    out, i, n = [], 0, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':  # строка: переносим как JSON-строку
            j, buf = i + 1, []
            while js[j] != c:
                if js[j] == '\\':
                    nxt = js[j + 1]
                    buf.append({'n': '\n', 't': '\t'}.get(nxt, nxt))
                    j += 2
                else:
                    buf.append(js[j])
                    j += 1
            out.append(json.dumps(''.join(buf), ensure_ascii=False))
            i = j + 1
        elif js.startswith('/*', i):
            i = js.index('*/', i) + 2
        elif js.startswith('//', i):
            i = js.find('\n', i) if '\n' in js[i:] else n
        else:
            out.append(c)
            i += 1
    text = ''.join(out)
    text = re.sub(r'([{,]\s*)([A-Za-z_$][\w$]*)\s*:', r'\1"\2":', text)  # ключи без кавычек
    text = re.sub(r',(\s*[}\]])', r'\1', text)  # висячие запятые
    return text


DEMO_IMAGES = 'demo/images/products/'


def local_images(value):
    """Заменить пути demo/images/products/… на копии в папке загрузок сервера (во вложенных полях тоже)."""
    from app.core.config import get_settings

    if isinstance(value, str) and value.startswith(DEMO_IMAGES):
        source = PROJECT_DIR / value
        if not source.is_file():
            return value
        relative = 'products/demo/' + value[len(DEMO_IMAGES):]
        target = Path(get_settings().media_dir) / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copyfile(source, target)
        return media_public_url(relative)
    if isinstance(value, list):
        return [local_images(v) for v in value]
    if isinstance(value, dict):
        return {k: local_images(v) for k, v in value.items()}
    return value


async def seed(frontend: Path, demo: bool) -> None:
    from app.core.config import get_settings
    if get_settings().is_production:
        raise ValueError('Sample importer is for a local development database only')
    async with SessionLocal() as db:
        cats = read_js_array(frontend / 'js/data/categories.js', 'categories')
        added = 0
        for i, c in enumerate(cats):
            if not await db.get(Category, c['id']):
                db.add(Category(id=c['id'], name=c['name'], icon=c.get('icon', 'leaf'), position=i, subs=c.get('subs', [])))
                added += 1
        print(f'Категории: добавлено {added} из {len(cats)}')
        if demo:
            products = read_js_array(PROJECT_DIR / 'demo/data/products.js', 'products')
            added = 0
            for p in products:
                p = local_images(p)
                if await db.get(Product, p['id']) or (await db.execute(select(Product).where(Product.slug == p['slug']))).scalars().first():
                    continue
                db.add(
                    Product(
                        id=p['id'], slug=p['slug'], status=p.get('status', 'published'), category=p.get('category', ''), sub=p.get('sub', ''),
                        name=p['name'], brand=p.get('brand', ''), price=int(p.get('price') or 0), old_price=p.get('oldPrice'),
                        stock=int(p.get('stock') or 0), data={k: v for k, v in p.items() if k not in PRODUCT_COLUMNS},
                        created_at=datetime.fromisoformat(p['createdAt']).replace(tzinfo=timezone.utc) if p.get('createdAt') else None,
                    )
                )
                added += 1
            print(f'Товары: добавлено {added} из {len(products)}')
            await db.flush()
            reviews = read_js_array(PROJECT_DIR / 'demo/data/reviews.js', 'reviews')
            added = 0
            for r in reviews:
                if await db.get(Review, r['id']) or not await db.get(Product, r['productId']):
                    continue
                db.add(
                    Review(
                        id=r['id'], product_id=r['productId'], name=r.get('name', 'Покупатель')[:40], rating=int(r['rating']),
                        title=r.get('title', ''), text=r['text'], pros=r.get('pros', ''), cons=r.get('cons', ''),
                        recommend=r.get('recommend', True), period=r.get('period', ''), helpful=int(r.get('helpful', 0)),
                        status=r.get('status', 'published'), verified=bool(r.get('verified')), reply=r.get('reply'),
                        created_at=datetime.fromisoformat(r['date']).replace(tzinfo=timezone.utc) if r.get('date') else None,
                    )
                )
                added += 1
            print(f'Отзывы: добавлено {added} из {len(reviews)}')
        await db.commit()

if __name__ == "__main__":
    import asyncio
    asyncio.run(seed(default_frontend(), demo=True))
