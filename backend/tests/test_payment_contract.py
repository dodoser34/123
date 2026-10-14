"""Локальные проверки адаптера: подпись и целая сумма обязательны для подтверждения оплаты."""
import hashlib
import hmac
import json

import pytest
from pydantic import SecretStr

from app.core.config import get_settings
from app.services.payments import KaspiPay
from .conftest import login, register_verified


@pytest.mark.parametrize('amount', [None, '', '1000.5', 1000.5, 1000.0, True, -1, 'NaN', '١٠٠٠', [], {}])
def test_paid_webhook_requires_nonnegative_integer_amount(amount):
    with pytest.raises(ValueError):
        KaspiPay.parse_webhook(json.dumps({'orderId': 'o-test', 'status': 'paid', 'amount': amount}).encode())


@pytest.mark.parametrize('amount', [0, 1000, '0', '1000'])
def test_paid_webhook_accepts_integer_tenge(amount):
    assert KaspiPay.parse_webhook(json.dumps({'orderId': 'o-test', 'status': 'paid', 'amount': amount}).encode()) == (
        'o-test', 'paid', int(amount)
    )


@pytest.mark.parametrize('body', [b'[]', b'null', b'1', b'"paid"'])
def test_webhook_requires_json_object(body):
    with pytest.raises(ValueError):
        KaspiPay.parse_webhook(body)


@pytest.mark.asyncio
async def test_signed_paid_webhook_without_amount_cannot_pay_order(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'payment_methods', 'cash,kaspi_pay')
    monkeypatch.setattr(settings, 'kaspi_webhook_secret', SecretStr('test-webhook-secret'))
    admin = await login(client)
    buyer = await register_verified(client)
    product = (await client.post('/api/products', json={'name': 'Tea', 'price': 1000, 'stock': 2}, headers=admin)).json()
    order = (await client.post('/api/orders', json={
        'name': 'Buyer', 'phone': '+77011234567', 'delivery': 'pickup', 'payment': 'cash',
        'items': [{'id': product['id'], 'qty': 1}],
    }, headers=buyer)).json()
    for data in [
        {'orderId': order['id'], 'status': 'paid'},
        {'orderId': order['id'], 'status': 'paid', 'amount': 1000.9},
        {'orderId': order['id'], 'status': 'paid', 'amount': True},
    ]:
        body = json.dumps(data).encode()
        signature = hmac.new(b'test-webhook-secret', body, hashlib.sha256).hexdigest()
        response = await client.post('/api/payments/kaspi/webhook', content=body, headers={'X-Signature': signature})
        assert response.status_code == 400
        saved = (await client.get('/api/orders/my', headers=buyer)).json()[0]
        assert saved['paymentStatus'] != 'paid'
