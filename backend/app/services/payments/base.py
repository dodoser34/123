from datetime import datetime, timezone

from ...core.config import Settings
from ...db.models import Order


class PaymentMethod:
    code = ''
    title = ''
    text = ''
    env = ()

    def missing(self, s: Settings) -> list[str]:
        out = []
        for name in self.env:
            value = getattr(s, name.lower())
            value = value.get_secret_value() if hasattr(value, 'get_secret_value') else value
            if not value:
                out.append(name)
        return out

    def available(self, s: Settings) -> bool:
        return not self.missing(s)

    def info(self, s: Settings) -> dict:
        return {'code': self.code, 'title': self.title, 'text': self.text}

    async def start(self, order: Order, s: Settings) -> dict:
        raise NotImplementedError

    def instructions(self, order: Order, s: Settings) -> dict | None:
        return None


def mark_paid(order: Order) -> None:
    order.payment_status = 'paid'
    order.paid_at = datetime.now(timezone.utc)
