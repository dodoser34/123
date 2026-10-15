import json
import re
from pathlib import Path

from sqlalchemy import select

from ..db.models import Category
from ..db.session import SessionLocal

PROJECT_DIR = Path(__file__).resolve().parents[3]


def default_frontend() -> Path:
    return PROJECT_DIR / 'frontend'


async def is_empty() -> bool:
    async with SessionLocal() as db:
        return (await db.execute(select(Category.id).limit(1))).first() is None


def read_js_array(path: Path, name: str) -> list:
    text = path.read_text(encoding='utf-8')
    m = re.search(rf'App\.seed\.{name}\s*=\s*(\[.*?\]);\s*$', text, re.S | re.M)
    if not m:
        raise SystemExit(f'В {path} не найден App.seed.{name}')
    return json.loads(js_to_json(m.group(1)))


def js_to_json(js: str) -> str:
    out, i, n = [], 0, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':
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
    text = re.sub(r'([{,]\s*)([A-Za-z_$][\w$]*)\s*:', r'\1"\2":', text)
    text = re.sub(r',(\s*[}\]])', r'\1', text)
    return text


async def seed(frontend: Path) -> None:
    async with SessionLocal() as db:
        cats = read_js_array(frontend / 'js/data/categories.js', 'categories')
        added = 0
        for i, c in enumerate(cats):
            if not await db.get(Category, c['id']):
                db.add(Category(id=c['id'], name=c['name'], icon=c.get('icon', 'leaf'), position=i, subs=c.get('subs', [])))
                added += 1
        print(f'Категории: добавлено {added} из {len(cats)}')
        await db.commit()
