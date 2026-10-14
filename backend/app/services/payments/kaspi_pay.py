"""Kaspi Pay для бизнеса: счёт создаётся через API Kaspi, покупатель платит в приложении Kaspi.kz,
Kaspi присылает уведомление (webhook) — заказ становится «Оплачен».

Как включить (когда магазин получит доступ к API в кабинете Kaspi Pay):
    1. в .env: KASPI_MERCHANT_ID, KASPI_API_KEY, KASPI_WEBHOOK_SECRET (и при необходимости KASPI_API_URL);
    2. добавить kaspi_pay в PAYMENT_METHODS;
    3. в кабинете Kaspi указать адрес уведомлений: <PUBLIC_API_URL>/payments/kaspi/webhook;
    4. сверить с документацией Kaspi места, помеченные «KASPI API» (адрес запроса, названия полей, подпись).
Всё остальное (статусы, проверка суммы, повторные уведомления) уже готово.
"""
import hashlib
import hmac
import json

import httpx
from fastapi import HTTPException

from ...core.config import Settings
from ...db.models import Order
from .base import PaymentMethod


class KaspiPay(PaymentMethod):
    code = 'kaspi_pay'
    title = 'Kaspi Pay'
    text = 'Оплата в приложении Kaspi.kz'
    env = ('KASPI_MERCHANT_ID', 'KASPI_API_KEY', 'KASPI_WEBHOOK_SECRET')

    async def start(self, order: Order, s: Settings) -> dict:
        # KASPI API: создание счёта. Сверьте адрес и поля с документацией Kaspi Pay.
        payload = {
            'merchantId': s.kaspi_merchant_id,
            'orderId': order.id,
            'amount': order.total,
            'currency': 'KZT',
            'description': f'Заказ №{order.number} — {s.app_name}',
            'returnUrl': f'{s.frontend_url}/pages/account.html#orders',
            'callbackUrl': f'{s.public_api_url}/payments/kaspi/webhook',
        }
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(
                    f'{s.kaspi_api_url}/invoices', json=payload, headers={'Authorization': f'Bearer {s.kaspi_api_key.get_secret_value()}'}
                )
            r.raise_for_status()
            data = r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise HTTPException(502, 'Kaspi Pay временно недоступен. Выберите другой способ оплаты.') from e
        order.payment_status = 'awaiting'
        order.payment_title = self.title
        order.payment_ref = str(data.get('invoiceId') or data.get('id') or '')[:120]
        url = data.get('paymentUrl') or data.get('url') or ''
        if not url.startswith('https://'):
            raise HTTPException(502, 'Kaspi Pay вернул неверную ссылку на оплату')
        return {'type': 'redirect', 'url': url, 'amount': order.total}

    @staticmethod
    def check_signature(body: bytes, signature: str, s: Settings) -> bool:
        # KASPI API: уточните, как Kaspi подписывает уведомления; здесь — HMAC-SHA256 тела запроса секретом из кабинета.
        secret = s.kaspi_webhook_secret.get_secret_value()
        good = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return bool(secret) and hmac.compare_digest(good, signature or '')

    @staticmethod
    def parse_webhook(body: bytes) -> tuple[str, str, int | None]:
        """Возвращает (id заказа, новый статус оплаты paid | failed, сумма из уведомления)."""
        data = json.loads(body or b'{}')
        if not isinstance(data, dict):
            raise ValueError('Уведомление должно быть объектом')
        status = str(data.get('status', '')).lower()
        paid = status in ('paid', 'success', 'completed')
        raw_amount = data.get('amount')
        amount = raw_amount if type(raw_amount) is int else (
            int(raw_amount) if isinstance(raw_amount, str) and raw_amount.isascii() and raw_amount.isdigit() else None
        )
        if amount is not None and amount < 0:
            amount = None
        if paid and amount is None:
            raise ValueError('Для оплаты нужна целая сумма в тенге')
        return str(data.get('orderId', '')), ('paid' if paid else 'failed'), amount
