"""Пользователи (админка), тексты и фото сайта."""
import re

from pydantic import BaseModel, Field, field_validator

from ..core.sanitize import safe_html, safe_url
from .base import In

TEXT_KEY = re.compile(r'^[A-Za-z][\w-]*(\.[\w-]+){0,6}$')


class UserPatchIn(In):
    blocked: bool | None = None
    name: str | None = Field(None, min_length=2, max_length=80)


class TextEditsIn(BaseModel):
    """Правки текстов сайта: «адрес текста» → новый текст. HTML очищается: остаются только <b>, <i>, <br>…"""

    edits: dict[str, str | int] = Field(default_factory=dict, max_length=2000)

    @field_validator('edits')
    @classmethod
    def clean(cls, edits):
        out = {}
        for key, value in edits.items():
            if len(key) > 120 or not TEXT_KEY.match(key):
                raise ValueError('Недопустимый адрес текста')
            out[key] = safe_html(value)[:5000] if isinstance(value, str) else value
        return out


class SitePhotoIn(In):
    index: int = Field(ge=0, le=5)
    url: str = Field('', max_length=500)  # пусто — вернуть исходное

    @field_validator('url')
    @classmethod
    def safe(cls, url):
        if not safe_url(url):
            raise ValueError('Недопустимый адрес фото')
        return url
