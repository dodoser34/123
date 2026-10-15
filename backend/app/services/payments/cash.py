from ...core.config import Settings
from ...db.models import Order
from .base import PaymentMethod


class Cash(PaymentMethod):
    code = 'cash'
    title = 'Наличными при получении'
    text = 'Курьеру или при самовывозе; можно картой через терминал курьера'

    async def start(self, order: Order, s: Settings) -> dict:
        order.payment_status = 'pending'
        order.payment_title = self.title
        return {'type': 'cash', 'amount': order.total}
