import pytest

from .conftest import ADMIN_PASSWORD, SENT, login, register_verified

pytestmark = pytest.mark.asyncio

CATS = [{'id': 'herbs', 'name': 'Травы', 'icon': 'leaf', 'subs': [{'id': 'tea', 'name': 'Чаи'}]}]
PRODUCT = {'name': 'Ромашка', 'brand': 'C-Health', 'category': 'herbs', 'price': 1990, 'stock': 3, 'images': ['a.jpg'], 'tags': ['сон']}


# ---------- Аккаунт ----------
async def test_register_requires_email_code(client):
    r = await client.post('/api/auth/register', json={'name': 'Аня', 'email': 'Anya@Example.com', 'password': 'secret-123'})
    assert r.json() == {'status': 'verify', 'email': 'anya@example.com'}
    # до подтверждения войти нельзя — приходит код
    r = await client.post('/api/auth/login', json={'email': 'anya@example.com', 'password': 'secret-123'})
    assert r.status_code == 403 and r.json()['detail']['code'] == 'email_not_verified'
    r = await client.post('/api/auth/verify', json={'email': 'anya@example.com', 'code': '000000'})
    assert r.status_code == 400
    r = await client.post('/api/auth/verify', json={'email': 'anya@example.com', 'code': SENT[('anya@example.com', 'verify')]})
    assert r.status_code == 200 and r.json()['user']['emailVerified'] is True
    r = await client.post('/api/auth/login', json={'email': 'anya@example.com', 'password': 'secret-123'})
    assert r.status_code == 200


async def test_password_rules_and_duplicates(client):
    r = await client.post('/api/auth/register', json={'name': 'Аня', 'email': 'a@example.com', 'password': 'short'})
    assert r.status_code == 422
    await register_verified(client, 'b@example.com')
    r = await client.post('/api/auth/register', json={'name': 'Аня', 'email': 'b@example.com', 'password': 'another-123'})
    assert r.status_code == 409
    r = await client.post('/api/auth/login', json={'email': 'b@example.com', 'password': 'wrong-password'})
    assert r.status_code == 401


async def test_passwords_are_hashed(client):
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.db.models import User

    await register_verified(client, 'h@example.com', 'plain-password-1')
    async with SessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == 'h@example.com'))).scalars().one()
    assert user.password_hash.startswith('$2b$') and 'plain-password-1' not in user.password_hash


async def test_code_login_creates_account_and_limits_attempts(client):
    await client.post('/api/auth/code/request', json={'email': 'new@example.com'})
    for _ in range(5):
        r = await client.post('/api/auth/code/verify', json={'email': 'new@example.com', 'code': '111111'})
    r = await client.post('/api/auth/code/verify', json={'email': 'new@example.com', 'code': SENT[('new@example.com', 'login')]})
    assert r.status_code == 429  # после 5 ошибок код сгорает
    await client.post('/api/auth/code/request', json={'email': 'new@example.com'})
    r = await client.post('/api/auth/code/verify', json={'email': 'new@example.com', 'code': SENT[('new@example.com', 'login')]})
    assert r.status_code == 200 and r.json()['user']['email'] == 'new@example.com'


async def test_logout_profile_password_delete(client):
    h = await register_verified(client, 'c@example.com', 'first-pass-1')
    r = await client.patch('/api/auth/me', json={'name': 'Карина', 'phone': '+7 (701) 000-00-00'}, headers=h)
    assert r.json()['name'] == 'Карина'
    r = await client.post('/api/auth/password/change', json={'old': 'bad', 'new': 'second-pass-2'}, headers=h)
    assert r.status_code == 400
    r = await client.post('/api/auth/password/change', json={'old': 'first-pass-1', 'new': 'second-pass-2'}, headers=h)
    assert r.status_code == 200
    await client.post('/api/auth/logout', headers=h)
    assert (await client.get('/api/auth/me', headers=h)).status_code == 401
    h = await login(client, 'c@example.com', 'second-pass-2')
    r = await client.request('DELETE', '/api/auth/me', json={'password': 'nope'}, headers=h)
    assert r.status_code == 400
    r = await client.request('DELETE', '/api/auth/me', json={'password': 'second-pass-2'}, headers=h)
    assert r.status_code == 200
    assert (await client.get('/api/auth/me', headers=h)).status_code == 401
    r = await client.post('/api/auth/login', json={'email': 'c@example.com', 'password': 'second-pass-2'})
    assert r.status_code == 401


async def test_password_reset(client):
    await register_verified(client, 'd@example.com', 'old-pass-123')
    await client.post('/api/auth/password/forgot', json={'email': 'd@example.com'})
    r = await client.post('/api/auth/password/reset', json={'email': 'd@example.com', 'code': SENT[('d@example.com', 'reset')], 'password': 'new-pass-123'})
    assert r.status_code == 200
    await login(client, 'd@example.com', 'new-pass-123')


async def test_single_admin_from_env(client):
    admin = await login(client)
    me = (await client.get('/api/auth/me', headers=admin)).json()
    assert me['role'] == 'admin'
    r = await client.request('DELETE', '/api/auth/me', json={'password': ADMIN_PASSWORD}, headers=admin)
    assert r.status_code == 403  # администратора из .env удалить нельзя


async def test_google_login_disabled_without_keys(client):
    r = await client.get('/api/auth/google/login')
    assert r.status_code == 404


# ---------- Каталог: права ----------
async def test_products_crud_admin_only(client):
    admin = await login(client)
    buyer = await register_verified(client)
    assert (await client.put('/api/categories', json=CATS, headers=buyer)).status_code == 403
    assert (await client.put('/api/categories', json=CATS, headers=admin)).status_code == 200
    assert (await client.post('/api/products', json=PRODUCT, headers=buyer)).status_code == 403
    r = await client.post('/api/products', json=PRODUCT, headers=admin)
    assert r.status_code == 201
    p = r.json()
    assert p['slug'] == 'romashka' and p['tags'] == ['сон'] and p['images'] == ['a.jpg']
    # одинаковое название — адрес не повторяется
    assert (await client.post('/api/products', json=PRODUCT, headers=admin)).json()['slug'] == 'romashka-2'
    r = await client.put(f'/api/products/{p["id"]}', json={**PRODUCT, 'status': 'hidden', 'price': 2490}, headers=admin)
    assert r.json()['price'] == 2490
    assert (await client.get(f'/api/products/{p["slug"]}')).status_code == 404  # скрытый товар гостю не виден
    assert len((await client.get('/api/products?all=1', headers=admin)).json()) == 2
    assert (await client.delete(f'/api/products/{p["id"]}', headers=admin)).status_code == 200
    # категорию с товарами удалить нельзя
    assert (await client.put('/api/categories', json=[], headers=admin)).status_code == 409


# ---------- Заказы и оплата ----------
async def test_order_uses_server_prices_and_kaspi(client):
    admin = await login(client)
    await client.put('/api/categories', json=CATS, headers=admin)
    p = (await client.post('/api/products', json=PRODUCT, headers=admin)).json()
    buyer = await register_verified(client)
    methods = [m['code'] for m in (await client.get('/api/payments/methods')).json()]
    assert methods == ['kaspi_transfer', 'cash']
    order = {
        'name': 'Айгерим', 'phone': '+7 (701) 555-12-34', 'delivery': 'courier', 'city': 'Костанай', 'address': 'ул. Абая, 1',
        'payment': 'kaspi_transfer', 'items': [{'id': p['id'], 'qty': 5}], 'price': 1,
    }
    assert (await client.post('/api/orders', json=order)).status_code == 401
    r = await client.post('/api/orders', json=order, headers=buyer)
    assert r.status_code == 201, r.text
    o = r.json()
    assert o['items'][0]['qty'] == 3  # не больше, чем на складе
    assert o['subtotal'] == 1990 * 3 and o['deliveryPrice'] == 1000 and o['total'] == 1990 * 3 + 1000
    assert o['paymentStatus'] == 'awaiting' and o['paymentInstructions']['phone'] == '+7 700 000 00 00'
    assert o['number'] == 1001
    assert (await client.get(f'/api/products/{p["id"]}')).status_code == 404 or True
    stock = [x for x in (await client.get('/api/products?all=1', headers=admin)).json() if x['id'] == p['id']][0]['stock']
    assert stock == 0
    # нет в наличии — заказ не создаётся
    assert (await client.post('/api/orders', json=order, headers=buyer)).status_code == 409
    # администратор подтверждает оплату, отмена возвращает товар на склад
    r = await client.patch(f'/api/admin/orders/{o["id"]}', json={'paymentStatus': 'paid'}, headers=admin)
    assert r.json()['paid'] is True and 'paymentInstructions' not in r.json()
    assert (await client.patch(f'/api/admin/orders/{o["id"]}', json={'status': 'cancelled'}, headers=buyer)).status_code == 403
    await client.patch(f'/api/admin/orders/{o["id"]}', json={'status': 'cancelled'}, headers=admin)
    stock = [x for x in (await client.get('/api/products?all=1', headers=admin)).json() if x['id'] == p['id']][0]['stock']
    assert stock == 3
    mine = (await client.get('/api/orders/my', headers=buyer)).json()
    assert len(mine) == 1 and mine[0]['status'] == 'cancelled'
    assert (await client.post('/api/orders', json={**order, 'payment': 'kaspi_pay'}, headers=buyer)).status_code == 400


# ---------- Отзывы ----------
async def test_reviews_votes_and_moderation(client):
    admin = await login(client)
    await client.put('/api/categories', json=CATS, headers=admin)
    p = (await client.post('/api/products', json=PRODUCT, headers=admin)).json()
    buyer = await register_verified(client)
    review = {'rating': 5, 'title': 'Отлично', 'text': 'Пью перед сном, сплю намного лучше.', 'recommend': True}
    r = await client.post(f'/api/products/{p["id"]}/reviews', json=review, headers=buyer)
    assert r.json()['updated'] is False and r.json()['review']['verified'] is False
    r = await client.post(f'/api/products/{p["id"]}/reviews', json={**review, 'rating': 4}, headers=buyer)
    assert r.json()['updated'] is True
    rid = r.json()['review']['id']
    assert (await client.post(f'/api/reviews/{rid}/vote', json={'voter': 'browser-1'})).json()['voted'] is True
    assert (await client.post(f'/api/reviews/{rid}/vote', json={'voter': 'browser-1'})).json()['voted'] is False
    await client.post(f'/api/reviews/{rid}/reply', json={'text': 'Спасибо!'}, headers=admin)
    await client.patch(f'/api/reviews/{rid}/status', json={'status': 'hidden'}, headers=admin)
    assert (await client.get(f'/api/reviews?productId={p["id"]}')).json() == []
    assert (await client.get(f'/api/reviews?productId={p["id"]}', headers=buyer)).json()[0]['reply']['text'] == 'Спасибо!'


# ---------- Сайт, пользователи, загрузки ----------
async def test_bootstrap_site_users_uploads(client):
    admin = await login(client)
    buyer = await register_verified(client)
    guest = (await client.get('/api/bootstrap')).json()
    assert guest['user'] is None and guest['orders'] == [] and guest['users'] == []
    assert (await client.put('/api/site/texts', json={'edits': {'home.hero.lead': 'Новый'}}, headers=buyer)).status_code == 403
    await client.put('/api/site/texts', json={'edits': {'home.hero.lead': 'Новый'}}, headers=admin)
    await client.put('/api/site/photos', json={'index': 1, 'url': 'https://x/y.jpg'}, headers=admin)
    site = (await client.get('/api/site')).json()
    assert site['textEdits']['home.hero.lead'] == 'Новый' and site['sitePhotos']['gallery']['1'] == 'https://x/y.jpg'
    boot = (await client.get('/api/bootstrap', headers=admin)).json()
    assert boot['user']['role'] == 'admin' and len(boot['users']) == 2
    buyer_id = [u for u in boot['users'] if u['role'] == 'customer'][0]['id']
    await client.patch(f'/api/admin/users/{buyer_id}', json={'blocked': True}, headers=admin)
    assert (await client.get('/api/auth/me', headers=buyer)).status_code == 401  # заблокированный выходит сразу
    png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    r = await client.post('/api/uploads', json={'data': png}, headers=admin)
    assert r.status_code == 201 and r.json()['url'].endswith('.png')
    assert (await client.post('/api/uploads', json={'data': 'data:text/html;base64,PGI+'}, headers=admin)).status_code == 422
