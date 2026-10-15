from pydantic import Field, field_validator

from ..core.sanitize import safe_url
from .base import In


class UserPatchIn(In):
    blocked: bool | None = None
    name: str | None = Field(None, min_length=2, max_length=80)


class SitePhotoIn(In):
    index: int = Field(ge=0, le=5)
    url: str = Field('', max_length=500)

    @field_validator('url')
    @classmethod
    def safe(cls, url):
        if not safe_url(url):
            raise ValueError('Недопустимый адрес фото')
        return url
