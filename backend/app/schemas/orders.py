from typing import Literal

from pydantic import Field

from .base import In


class OrderItemIn(In):
    id: str = Field(min_length=1, max_length=40)
    qty: int = Field(ge=1, le=99)


class OrderIn(In):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=10, max_length=32, pattern=r'^[\d\s()+\-]+$')
    email: str = Field('', max_length=254, pattern=r'^$|^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$')
    delivery: Literal['courier', 'kazakhstan', 'pickup']
    deliveryTitle: str = Field('', max_length=120)
    city: str = Field('', max_length=80)
    address: str = Field('', max_length=200)
    comment: str = Field('', max_length=1000)
    payment: str = Field(max_length=24, pattern=r'^[a-z_]+$')
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)


class OrderPatchIn(In):
    status: Literal['new', 'processing', 'shipped', 'done', 'cancelled'] | None = None
    paymentStatus: Literal['pending', 'awaiting', 'paid', 'failed', 'refunded'] | None = None


class SandboxPayIn(In):
    action: Literal['pay', 'cancel'] = 'pay'
    card: str = Field('', max_length=23, pattern=r'^[\d ]*$')
    expiry: str = Field('', max_length=5, pattern=r'^(\d{2}/\d{2})?$')
    cvc: str = Field('', max_length=4, pattern=r'^\d{0,4}$')
