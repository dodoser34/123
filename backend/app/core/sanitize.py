"""Очистка текста от опасного HTML (защита от XSS).

Тексты сайта из админки вставляются на страницы как HTML (в них разрешены переносы строк и жирный шрифт),
поэтому перед сохранением всё, кроме нескольких безопасных тегов без атрибутов, превращается в обычный текст.
Остальные данные (названия, отзывы, описания) сайт всегда выводит экранированными — HTML в них не работает.
"""
import html
import re
from urllib.parse import urlparse

ALLOWED_TAGS = ('b', 'strong', 'i', 'em', 'br', 'small')
_TAG = re.compile(r'&lt;(/?)(' + '|'.join(ALLOWED_TAGS) + r')\s*/?&gt;', re.I)
_CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')


def clean_text(value: str) -> str:
    """Убрать управляющие символы (кроме переноса строки и табуляции)."""
    return _CONTROL.sub('', value)


def safe_html(value: str) -> str:
    """Оставить только <b>, <strong>, <i>, <em>, <br>, <small> без атрибутов; всё остальное — как текст."""
    escaped = html.escape(clean_text(value), quote=True)
    return _TAG.sub(lambda m: f'<{m.group(1)}{m.group(2).lower()}>', escaped)


def safe_url(value: str, allow_relative: bool = True) -> bool:
    """Адрес картинки или ссылки: только https://, http:// или путь на этом же сайте — никаких javascript:, data: и т.п."""
    v = value.strip()
    if not v:
        return True
    if allow_relative and not re.match(r'^[a-z][a-z0-9+.-]*:', v, re.I) and not v.startswith('//'):
        return '\\' not in v
    parsed = urlparse(v)
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)
