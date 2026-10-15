from fastapi import HTTPException

from ...core.config import Settings, get_settings
from .base import PaymentMethod, mark_paid
from .cash import Cash
from .kaspi_pay import KaspiPay
from .kaspi_transfer import KaspiTransfer
from .sandbox import SandboxCard, SandboxKaspi, SandboxPayment

METHODS: dict[str, PaymentMethod] = {m.code: m for m in (KaspiTransfer(), Cash(), KaspiPay(), SandboxCard(), SandboxKaspi())}


def enabled_methods(s: Settings | None = None) -> list[PaymentMethod]:
    s = s or get_settings()
    return [METHODS[c] for c in s.payment_list if c in METHODS and METHODS[c].available(s)]


def get_method(code: str) -> PaymentMethod:
    for m in enabled_methods():
        if m.code == code:
            return m
    raise HTTPException(400, 'Этот способ оплаты недоступен')


def readiness(s: Settings | None = None) -> list[dict]:
    s = s or get_settings()
    return [
        {'code': m.code, 'title': m.title, 'enabled': m.code in s.payment_list, 'missing': m.missing(s), 'test': getattr(m, 'test', False)}
        for m in METHODS.values()
    ]


__all__ = ['METHODS', 'PaymentMethod', 'KaspiPay', 'SandboxPayment', 'enabled_methods', 'get_method', 'mark_paid', 'readiness']
