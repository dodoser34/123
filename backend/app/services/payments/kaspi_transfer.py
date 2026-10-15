from ...core.config import Settings
from ...db.models import Order
from .base import PaymentMethod


class KaspiTransfer(PaymentMethod):
    code = 'kaspi_transfer'
    title = 'Перевод на Kaspi'
    text = 'Переведите сумму заказа на Kaspi магазина — номер покажем после оформления'
    env = ('KASPI_PHONE', 'KASPI_RECEIVER')

    async def start(self, order: Order, s: Settings) -> dict:
        order.payment_status = 'awaiting'
        order.payment_title = self.title
        return self.instructions(order, s)

    def instructions(self, order: Order, s: Settings) -> dict | None:
        if order.payment_status in ('paid', 'refunded'):
            return None
        return {
            'type': 'kaspi_transfer',
            'phone': s.kaspi_phone,
            'receiver': s.kaspi_receiver,
            'link': s.kaspi_pay_link,
            'amount': order.total,
            'comment': f'Заказ №{order.number}',
        }
