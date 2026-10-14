"""Интеграция API → бизнес-логика → БД; браузер и реальные платежи не нужны."""
import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import Order, Product
from app.db.session import SessionLocal
from .conftest import login, register_verified

pytestmark = pytest.mark.asyncio


async def setup_shop(client, **changes):
    admin = await login(client)
    buyer = await register_verified(client)
    payload = {'name': 'Tea', 'price': 2000, 'stock': 10, **changes}
    response = await client.post('/api/products', json=payload, headers=admin)
    assert response.status_code == 201, response.text
    return admin, buyer, response.json()


def checkout(pid, **changes):
    return {'name': 'Buyer', 'phone': '+7 701 123 45 67', 'delivery': 'pickup', 'payment': 'cash', 'items': [{'id': pid, 'qty': 2}], **changes}


@pytest.mark.parametrize('delivery', ['courier', 'kazakhstan'])
@pytest.mark.parametrize('missing', ['city', 'address'])
async def test_shipping_address_required_without_stock_mutation(client, delivery, missing):
    _, buyer, p = await setup_shop(client)
    data = checkout(p['id'], delivery=delivery, city='Костанай', address='Абая 1')
    data[missing] = ''
    assert (await client.post('/api/orders', json=data, headers=buyer)).status_code == 422
    async with SessionLocal() as db:
        assert (await db.get(Product, p['id'])).stock == 10
        assert (await db.scalars(select(Order))).all() == []


@pytest.mark.parametrize('offset,fee', [(-1, 1000), (0, 0), (1, 0)])
async def test_courier_free_shipping_boundary(client, monkeypatch, offset, fee):
    monkeypatch.setattr(get_settings(), 'free_shipping_from', 15000)
    monkeypatch.setattr(get_settings(), 'courier_price', 1000)
    _, buyer, p = await setup_shop(client, price=15000 + offset)
    data = checkout(p['id'], delivery='courier', city='Костанай', address='Абая 1', items=[{'id': p['id'], 'qty': 1}])
    response = await client.post('/api/orders', json=data, headers=buyer)
    assert response.status_code == 201, response.text
    assert response.json()['deliveryPrice'] == fee
    assert response.json()['total'] == 15000 + offset + fee


@pytest.mark.parametrize('changes', [{'stock': 0}, {'status': 'hidden'}])
async def test_unavailable_cart_returns_conflict_without_order(client, changes):
    _, buyer, p = await setup_shop(client, **changes)
    response = await client.post('/api/orders', json=checkout(p['id']), headers=buyer)
    assert response.status_code == 409
    assert (await client.get('/api/orders/my', headers=buyer)).json() == []


async def test_mixed_cart_skips_missing_product(client):
    _, buyer, p = await setup_shop(client)
    data = checkout(p['id'], items=[{'id': 'missing', 'qty': 1}, {'id': p['id'], 'qty': 2}])
    response = await client.post('/api/orders', json=data, headers=buyer)
    assert response.status_code == 201, response.text
    assert [item['id'] for item in response.json()['items']] == [p['id']]
    assert response.json()['subtotal'] == 4000


async def test_repeated_product_lines_cannot_oversell(client):
    _, buyer, p = await setup_shop(client, stock=3)
    data = checkout(p['id'], items=[{'id': p['id'], 'qty': 2}, {'id': p['id'], 'qty': 2}])
    response = await client.post('/api/orders', json=data, headers=buyer)
    assert response.status_code == 201, response.text
    assert sum(item['qty'] for item in response.json()['items']) == 3
    assert response.json()['subtotal'] == 6000
    async with SessionLocal() as db:
        assert (await db.get(Product, p['id'])).stock == 0


async def test_checkout_cancel_repeat_and_reopen_stock_lifecycle(client):
    admin, buyer, p = await setup_shop(client)
    response = await client.post('/api/orders', json=checkout(p['id']), headers=buyer)
    assert response.status_code == 201, response.text
    url = '/api/admin/orders/' + response.json()['id']
    for status, expected_stock in [('cancelled', 10), ('cancelled', 10), ('processing', 8), ('processing', 8), ('done', 8)]:
        patch = await client.patch(url, json={'status': status}, headers=admin)
        assert patch.status_code == 200 and patch.json()['status'] == status
        async with SessionLocal() as db:
            assert (await db.get(Product, p['id'])).stock == expected_stock


async def test_order_history_isolated_between_buyers(client):
    admin, buyer, p = await setup_shop(client)
    other = await register_verified(client, 'other@example.com')
    response = await client.post('/api/orders', json=checkout(p['id']), headers=buyer)
    assert response.status_code == 201
    assert (await client.get('/api/orders/my', headers=other)).json() == []
    mine = (await client.get('/api/orders/my', headers=buyer)).json()
    assert [o['id'] for o in mine] == [response.json()['id']]
    forbidden = await client.patch('/api/admin/orders/' + mine[0]['id'], json={'status': 'cancelled'}, headers=other)
    assert forbidden.status_code == 403
    assert len((await client.get('/api/admin/orders', headers=admin)).json()) == 1


async def test_order_snapshot_survives_product_edit_and_delete(client):
    admin, buyer, p = await setup_shop(client)
    response = await client.post('/api/orders', json=checkout(p['id']), headers=buyer)
    assert response.status_code == 201
    original = response.json()
    edited = await client.put('/api/products/' + p['id'], json={'name': 'Renamed', 'price': 9999, 'stock': 8}, headers=admin)
    assert edited.status_code == 200
    assert (await client.delete('/api/products/' + p['id'], headers=admin)).status_code == 200
    saved = (await client.get('/api/orders/my', headers=buyer)).json()[0]
    assert saved['items'] == original['items'] and saved['total'] == original['total']


async def test_failed_payment_start_rolls_back_entire_checkout(client, monkeypatch):
    from app.services.payments import METHODS
    _, buyer, p = await setup_shop(client)

    async def fail(*args):
        from fastapi import HTTPException
        raise HTTPException(503, 'Test payment unavailable')

    monkeypatch.setattr(METHODS['cash'], 'start', fail)
    response = await client.post('/api/orders', json=checkout(p['id']), headers=buyer)
    assert response.status_code == 503
    async with SessionLocal() as db:
        assert (await db.get(Product, p['id'])).stock == 10
        assert (await db.scalars(select(Order))).all() == []


async def test_cancelled_order_cannot_reopen_after_stock_is_sold(client):
    admin, buyer, p = await setup_shop(client, stock=2)
    original = (await client.post('/api/orders', json=checkout(p['id']), headers=buyer)).json()
    url = '/api/admin/orders/' + original['id']
    assert (await client.patch(url, json={'status': 'cancelled'}, headers=admin)).status_code == 200
    assert (await client.post('/api/orders', json=checkout(p['id']), headers=buyer)).status_code == 201
    response = await client.patch(url, json={'status': 'processing', 'paymentStatus': 'paid'}, headers=admin)
    assert response.status_code == 409
    async with SessionLocal() as db:
        assert (await db.get(Product, p['id'])).stock == 0
        saved = await db.scalar(select(Order).where(Order.id == original['id']))
        assert saved.status == 'cancelled' and saved.payment_status != 'paid'


async def test_reopen_checks_combined_quantity_of_duplicate_product_lines(client):
    admin, buyer, p = await setup_shop(client, stock=3)
    data = checkout(p['id'], items=[{'id': p['id'], 'qty': 2}, {'id': p['id'], 'qty': 1}])
    original = (await client.post('/api/orders', json=data, headers=buyer)).json()
    url = '/api/admin/orders/' + original['id']
    assert (await client.patch(url, json={'status': 'cancelled'}, headers=admin)).status_code == 200
    assert (await client.post('/api/orders', json=checkout(p['id'], items=[{'id': p['id'], 'qty': 1}]), headers=buyer)).status_code == 201
    assert (await client.patch(url, json={'status': 'processing'}, headers=admin)).status_code == 409
    async with SessionLocal() as db:
        assert (await db.get(Product, p['id'])).stock == 2


async def test_reopen_is_atomic_when_one_product_has_insufficient_stock(client):
    admin, buyer, p = await setup_shop(client, stock=2)
    q = (await client.post('/api/products', json={'name': 'Second', 'price': 1000, 'stock': 2}, headers=admin)).json()
    data = checkout(p['id'], items=[{'id': p['id'], 'qty': 2}, {'id': q['id'], 'qty': 2}])
    original = (await client.post('/api/orders', json=data, headers=buyer)).json()
    url = '/api/admin/orders/' + original['id']
    assert (await client.patch(url, json={'status': 'cancelled'}, headers=admin)).status_code == 200
    assert (await client.post('/api/orders', json=checkout(q['id']), headers=buyer)).status_code == 201
    assert (await client.patch(url, json={'status': 'processing'}, headers=admin)).status_code == 409
    async with SessionLocal() as db:
        assert (await db.get(Product, p['id'])).stock == 2
        assert (await db.get(Product, q['id'])).stock == 0


async def test_reopen_rejects_deleted_product(client):
    admin, buyer, p = await setup_shop(client)
    original = (await client.post('/api/orders', json=checkout(p['id']), headers=buyer)).json()
    url = '/api/admin/orders/' + original['id']
    assert (await client.patch(url, json={'status': 'cancelled'}, headers=admin)).status_code == 200
    assert (await client.delete('/api/products/' + p['id'], headers=admin)).status_code == 200
    assert (await client.patch(url, json={'status': 'processing'}, headers=admin)).status_code == 409
    saved = (await client.get('/api/orders/my', headers=buyer)).json()[0]
    assert saved['status'] == 'cancelled'
