"""Способы оплаты. Какие включены — PAYMENT_METHODS в deploy/.env; подробная настройка — docs/14-Платежи.md.

Чтобы добавить новый способ (например, банковскую карту через платёжный сервис):
создайте файл по образцу kaspi_pay.py и добавьте класс в METHODS ниже.
"""
from fastapi import HTTPException

from ...core.config import Settings, get_settings
from .base import PaymentMethod, mark_paid
from .cash import Cash
from .kaspi_pay import KaspiPay
from .kaspi_transfer import KaspiTransfer

METHODS: dict[str, PaymentMethod] = {m.code: m for m in (KaspiTransfer(), Cash(), KaspiPay())}


def enabled_methods(s: Settings | None = None) -> list[PaymentMethod]:
    """Способы, которые включены в .env и для которых заполнены все настройки."""
    s = s or get_settings()
    return [METHODS[c] for c in s.payment_list if c in METHODS and METHODS[c].available(s)]


def get_method(code: str) -> PaymentMethod:
    for m in enabled_methods():
        if m.code == code:
            return m
    raise HTTPException(400, 'Этот способ оплаты недоступен')


def readiness(s: Settings | None = None) -> list[dict]:
    """Состояние всех способов оплаты — для админки («Готовность к запуску»)."""
    s = s or get_settings()
    return [
        {'code': m.code, 'title': m.title, 'enabled': m.code in s.payment_list, 'missing': m.missing(s)}
        for m in METHODS.values()
    ]


__all__ = ['METHODS', 'PaymentMethod', 'KaspiPay', 'enabled_methods', 'get_method', 'mark_paid', 'readiness']
