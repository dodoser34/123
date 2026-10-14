"""Каталог: категории, товары, загрузка фото."""
import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..core.sanitize import clean_text, safe_url
from .base import In

SLUG = r'^[a-z0-9][a-z0-9-]*$'
MAX_PRODUCT_JSON = 200_000  # предельный размер описания товара (символов) — защита от «раздутых» записей


class SubIn(In):
    id: str = Field(min_length=1, max_length=60, pattern=SLUG)
    name: str = Field(min_length=1, max_length=80)


class CategoryIn(In):
    id: str = Field(min_length=1, max_length=60, pattern=SLUG)
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field('leaf', max_length=32, pattern=r'^[a-z0-9-]+$')
    subs: list[SubIn] = Field(default_factory=list, max_length=50)


def _clean_deep(value, depth=0):
    """Почистить вложенные строки товара от управляющих символов; ограничить глубину вложенности."""
    if depth > 5:
        raise ValueError('Слишком сложная структура данных')
    if isinstance(value, str):
        return clean_text(value)
    if isinstance(value, list):
        return [_clean_deep(v, depth + 1) for v in value]
    if isinstance(value, dict):
        return {str(k)[:60]: _clean_deep(v, depth + 1) for k, v in value.items()}
    return value


class ProductIn(BaseModel):
    """Товар целиком, как его собирает форма админки. Остальные поля (описание, состав…) сохраняются в data."""

    model_config = ConfigDict(extra='allow', str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field('', max_length=120)
    brand: str = Field('', max_length=80)
    category: str = Field('', max_length=60)
    sub: str = Field('', max_length=60)
    status: Literal['published', 'hidden'] = 'published'
    price: int = Field(0, ge=0, le=100_000_000)
    oldPrice: int | None = Field(None, ge=0, le=100_000_000)
    stock: int = Field(0, ge=0, le=1_000_000)
    images: list[str] = Field(default_factory=list, max_length=20)

    @field_validator('price', 'stock', mode='before')
    @classmethod
    def empty_is_zero(cls, v):
        return 0 if v in ('', None) else v

    @field_validator('images')
    @classmethod
    def safe_images(cls, images):
        for src in images:
            if len(src) > 500 or not safe_url(src):
                raise ValueError('Недопустимый адрес фото')
        return images

    @model_validator(mode='after')
    def limit_extra(self):
        extra = _clean_deep(self.model_extra or {})
        if len(json.dumps(extra, ensure_ascii=False)) > MAX_PRODUCT_JSON:
            raise ValueError('Слишком много данных в карточке товара')
        self.__pydantic_extra__ = extra
        return self


class UploadIn(BaseModel):
    data: str = Field(max_length=20_000_000)  # фото в виде data:image/jpeg;base64,…
    folder: Literal['products', 'site'] = 'products'
