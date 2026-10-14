"""Общий вид способа оплаты. Новый способ = новый класс с этими методами + строка в METHODS (payments/__init__.py)."""
from datetime import datetime, timezone

from ...core.config import Settings
from ...db.models import Order


class PaymentMethod:
    code = ''  # как способ называется в .env (PAYMENT_METHODS) и в заказе
    title = ''  # название для покупателя
    text = ''  # подсказка под названием
    env = ()  # какие настройки .env нужны (для проверки готовности)

    def missing(self, s: Settings) -> list[str]:
        """Каких настроек не хватает (пусто — способ готов к работе)."""
        out = []
        for name in self.env:
            value = getattr(s, name.lower())
            value = value.get_secret_value() if hasattr(value, 'get_secret_value') else value
            if not value:
                out.append(name)
        return out

    def available(self, s: Settings) -> bool:
        return not self.missing(s)

    def info(self, s: Settings) -> dict:  # noqa: ARG002
        return {'code': self.code, 'title': self.title, 'text': self.text}

    async def start(self, order: Order, s: Settings) -> dict:
        """После создания заказа: поставить статус оплаты и вернуть инструкцию для покупателя."""
        raise NotImplementedError

    def instructions(self, order: Order, s: Settings) -> dict | None:  # noqa: ARG002
        """Инструкция по оплате уже созданного заказа (показывается в личном кабинете)."""
        return None


def mark_paid(order: Order) -> None:
    order.payment_status = 'paid'
    order.paid_at = datetime.now(timezone.utc)
