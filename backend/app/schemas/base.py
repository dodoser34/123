"""Общая основа схем: пробелы по краям обрезаются, управляющие символы удаляются."""
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.sanitize import clean_text


class In(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator('*', mode='before')
    @classmethod
    def _clean(cls, v):
        return clean_text(v) if isinstance(v, str) else v
