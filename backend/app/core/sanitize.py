import re
from urllib.parse import urlparse

_CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')


def clean_text(value: str) -> str:
    return _CONTROL.sub('', value)


def safe_url(value: str, allow_relative: bool = True) -> bool:
    v = value.strip()
    if not v:
        return True
    if allow_relative and not re.match(r'^[a-z][a-z0-9+.-]*:', v, re.I) and not v.startswith('//'):
        return '\\' not in v
    parsed = urlparse(v)
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)
