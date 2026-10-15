import secrets
from datetime import date

from ...core.config import Settings
from ...db.models import Order
from .base import PaymentMethod, mark_paid

DECLINED = {
    '4000000000000002': 'Банк отклонил платёж. Попробуйте другую карту.',
    '4000000000009995': 'Недостаточно средств на карте.',
}


def luhn(number: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(number)):
        d = int(ch)
        if i % 2:
            d = d * 2 - 9 if d > 4 else d * 2
        total += d
    return total % 10 == 0


def check_card(number: str, expiry: str, cvc: str) -> str | None:
    if not (12 <= len(number) <= 19) or not number.isdigit() or not luhn(number):
        return 'Неверный номер карты'
    month, _, year = expiry.partition('/')
    if not (month.isdigit() and year.isdigit() and 1 <= int(month) <= 12 and len(year) == 2):
        return 'Неверный срок действия'
    today = date.today()
    if (2000 + int(year), int(month)) < (today.year, today.month):
        return 'Срок действия карты истёк'
    if not (cvc.isdigit() and len(cvc) in (3, 4)):
        return 'Неверный CVC'
    return DECLINED.get(number)


class SandboxPayment(PaymentMethod):
    kind = ''
    test = True

    async def start(self, order: Order, s: Settings) -> dict:
        order.payment_status = 'awaiting'
        order.payment_title = self.title
        order.payment_ref = 'test-' + secrets.token_hex(6)
        return self.instructions(order, s)

    def instructions(self, order: Order, s: Settings) -> dict | None:
        if order.payment_status in ('paid', 'refunded'):
            return None
        return {'type': 'test_payment', 'method': self.kind, 'url': f'pages/pay.html?order={order.id}', 'amount': order.total}

    def pay(self, order: Order, data) -> str | None:
        raise NotImplementedError


class SandboxCard(SandboxPayment):
    code = 'test_card'
    kind = 'card'
    title = 'Банковская карта (тестовая оплата)'
    text = 'Visa, Mastercard — имитация оплаты, деньги не списываются'

    def pay(self, order: Order, data) -> str | None:
        number = ''.join(ch for ch in data.card or '' if ch.isdigit())
        problem = check_card(number, data.expiry or '', data.cvc or '')
        if problem:
            if number in DECLINED:
                order.payment_status = 'failed'
            return problem
        mark_paid(order)
        order.payment_title = f'Карта •••• {number[-4:]} (тестовая оплата)'
        return None


class SandboxKaspi(SandboxPayment):
    code = 'test_kaspi'
    kind = 'kaspi'
    title = 'Kaspi (тестовая оплата)'
    text = 'Имитация оплаты в приложении Kaspi.kz, деньги не списываются'

    def pay(self, order: Order, data) -> str | None:
        if data.action == 'cancel':
            order.payment_status = 'failed'
            return 'Оплата отменена в Kaspi'
        mark_paid(order)
        order.payment_title = 'Kaspi (тестовая оплата)'
        return None
