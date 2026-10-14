import pytest

from .conftest import login

pytestmark = pytest.mark.asyncio


async def test_duplicate_category_ids_rejected_atomically(client):
    admin = await login(client)
    initial = [{'id': 'tea', 'name': 'Tea'}]
    assert (await client.put('/api/categories', json=initial, headers=admin)).status_code == 200
    response = await client.put('/api/categories', json=[{'id': 'skin', 'name': 'A'}, {'id': 'skin', 'name': 'B'}], headers=admin)
    assert response.status_code == 422
    assert [c['id'] for c in (await client.get('/api/categories')).json()] == ['tea']


async def test_categories_preserve_admin_order(client):
    admin = await login(client)
    data = [{'id': 'z', 'name': 'Z'}, {'id': 'a', 'name': 'A'}]
    response = await client.put('/api/categories', json=data, headers=admin)
    assert response.status_code == 200
    assert [c['id'] for c in (await client.get('/api/categories')).json()] == ['z', 'a']


async def test_unknown_category_does_not_create_product(client):
    admin = await login(client)
    response = await client.post('/api/products', json={'name': 'Tea', 'category': 'missing'}, headers=admin)
    assert response.status_code == 422
    assert (await client.get('/api/products?all=1', headers=admin)).json() == []


async def test_slug_stable_on_update_and_unique_on_collision(client):
    admin = await login(client)
    data = {'name': 'Ромашка', 'price': 1000, 'stock': 3}
    rows = []
    for _ in range(3):
        response = await client.post('/api/products', json=data, headers=admin)
        assert response.status_code == 201
        rows.append(response.json())
    assert [p['slug'] for p in rows] == ['romashka', 'romashka-2', 'romashka-3']
    response = await client.put('/api/products/' + rows[1]['id'], json={**data, 'slug': rows[1]['slug']}, headers=admin)
    assert response.status_code == 200 and response.json()['slug'] == 'romashka-2'


@pytest.mark.parametrize('method,path,body', [
    ('PUT', '/api/products/missing', {'name': 'Tea'}),
    ('DELETE', '/api/products/missing', None),
    ('PATCH', '/api/admin/orders/missing', {'status': 'done'}),
    ('DELETE', '/api/admin/orders/missing', None),
    ('PATCH', '/api/admin/users/missing', {'blocked': True}),
])
async def test_missing_resource_returns_404(client, method, path, body):
    admin = await login(client)
    response = await client.request(method, path, json=body, headers=admin)
    assert response.status_code == 404


async def test_site_texts_replace_previous_edits(client):
    admin = await login(client)
    for edits in [{'home.hero.title': 'First'}, {'home.hero.text': 'Second'}, {}]:
        response = await client.put('/api/site/texts', json={'edits': edits}, headers=admin)
        assert response.status_code == 200
        assert (await client.get('/api/site')).json()['textEdits'] == edits


async def test_photo_reset_preserves_other_photo(client):
    admin = await login(client)
    for index in [0, 1]:
        response = await client.put('/api/site/photos', json={'index': index, 'url': f'/media/{index}.jpg'}, headers=admin)
        assert response.status_code == 200
    response = await client.put('/api/site/photos', json={'index': 0, 'url': ''}, headers=admin)
    assert response.status_code == 200
    assert (await client.get('/api/site')).json()['sitePhotos']['gallery'] == {'1': '/media/1.jpg'}
