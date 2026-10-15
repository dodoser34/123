from datetime import date

import pytest

from app.core.config import get_settings
from app.services.payments.sandbox import check_card, luhn

from .conftest import login, register_verified

GOOD_CARD = '4242 4242 4242 4242'
NEXT_YEAR = f'12/{(date.today().year + 1) % 100:02d}'


@pytest.fixture
def sandbox():
    s = get_settings()
    old = s.payment_methods
    s.payment_methods = 'kaspi_transfer,cash,test_card,test_kaspi'
    yield
    s.payment_methods = old


async def _order(client, headers, payment):
    admin = await login(client)
    await client.put('/api/categories', json=[{'id': 'k-beauty', 'name': 'K-Beauty', 'subs': []}], headers=admin)
    p = (await client.post('/api/products', json={'name': 'Тонер', 'category': 'k-beauty', 'price': 5000, 'stock': 5}, headers=admin)).json()
    order = {'name': 'Айгерим', 'phone': '+7 701 000 00 00', 'delivery': 'pickup', 'payment': payment, 'items': [{'id': p['id'], 'qty': 1}]}
    r = await client.post('/api/orders', json=order, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_luhn_and_card_rules():
    assert luhn('4242424242424242') and not luhn('4242424242424241')
    assert check_card('4242424242424242', NEXT_YEAR, '123') is None
    assert check_card('4242424242424241', NEXT_YEAR, '123') == 'Неверный номер карты'
    assert check_card('4242424242424242', '01/20', '123') == 'Срок действия карты истёк'
    assert check_card('4242424242424242', '13/30', '123') == 'Неверный срок действия'
    assert check_card('4242424242424242', NEXT_YEAR, '1') == 'Неверный CVC'
    assert 'отклонил' in check_card('4000000000000002', NEXT_YEAR, '123')


async def test_sandbox_methods_offered(client, sandbox):
    codes = [m['code'] for m in (await client.get('/api/payments/methods')).json()]
    assert 'test_card' in codes and 'test_kaspi' in codes


async def test_card_payment_flow(client, sandbox):
    buyer = await register_verified(client)
    o = await _order(client, buyer, 'test_card')
    assert o['paymentStatus'] == 'awaiting'
    assert o['paymentInstructions'] == {'type': 'test_payment', 'method': 'card', 'url': f'pages/pay.html?order={o["id"]}', 'amount': o['total']}
    url = f'/api/payments/sandbox/{o["id"]}'

    r = await client.post(url, json={'card': '4242 4242 4242 4241', 'expiry': NEXT_YEAR, 'cvc': '123'}, headers=buyer)
    assert r.status_code == 402 and r.json()['detail'] == 'Неверный номер карты'

    r = await client.post(url, json={'card': '4000 0000 0000 0002', 'expiry': NEXT_YEAR, 'cvc': '123'}, headers=buyer)
    assert r.status_code == 402
    assert (await client.get('/api/orders/my', headers=buyer)).json()[0]['paymentStatus'] == 'failed'

    r = await client.post(url, json={'card': GOOD_CARD, 'expiry': NEXT_YEAR, 'cvc': '123'}, headers=buyer)
    assert r.status_code == 200, r.text
    paid = r.json()
    assert paid['paymentStatus'] == 'paid' and paid['paymentTitle'] == 'Карта •••• 4242 (тестовая оплата)'
    assert '4242424242424242' not in r.text and 'paymentInstructions' not in paid

    r = await client.post(url, json={'card': GOOD_CARD, 'expiry': NEXT_YEAR, 'cvc': '123'}, headers=buyer)
    assert r.status_code == 409


async def test_kaspi_payment_and_cancel(client, sandbox):
    buyer = await register_verified(client)
    o = await _order(client, buyer, 'test_kaspi')
    url = f'/api/payments/sandbox/{o["id"]}'
    r = await client.post(url, json={'action': 'cancel'}, headers=buyer)
    assert r.status_code == 402
    assert (await client.get('/api/orders/my', headers=buyer)).json()[0]['paymentStatus'] == 'failed'
    r = await client.post(url, json={'action': 'pay'}, headers=buyer)
    assert r.status_code == 200 and r.json()['paymentStatus'] == 'paid'


async def test_only_own_order_and_only_sandbox_method(client, sandbox):
    buyer = await register_verified(client)
    other = await register_verified(client, 'other@example.com', 'Zt5-lime-pear')
    o = await _order(client, buyer, 'test_kaspi')
    r = await client.post(f'/api/payments/sandbox/{o["id"]}', json={'action': 'pay'}, headers=other)
    assert r.status_code == 404
    assert (await client.post(f'/api/payments/sandbox/{o["id"]}', json={'action': 'pay'})).status_code == 401
    cash = await _order(client, buyer, 'cash')
    r = await client.post(f'/api/payments/sandbox/{cash["id"]}', json={'action': 'pay'}, headers=buyer)
    assert r.status_code == 400


async def test_sandbox_disabled_when_removed_from_settings(client, sandbox):
    buyer = await register_verified(client)
    o = await _order(client, buyer, 'test_kaspi')
    get_settings().payment_methods = 'kaspi_transfer,cash'
    r = await client.post(f'/api/payments/sandbox/{o["id"]}', json={'action': 'pay'}, headers=buyer)
    assert r.status_code == 400
