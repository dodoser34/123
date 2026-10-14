"""Границы входных данных: без HTTP, почты и внешних сервисов."""
import pytest
from pydantic import ValidationError

from app.schemas.catalog import ProductIn, CategoryIn
from app.schemas.orders import OrderIn, OrderItemIn, OrderPatchIn
from app.schemas.reviews import ReviewIn
from app.schemas.auth import CodeIn, ProfileIn


@pytest.mark.parametrize('field,value', [
    ('name', ''), ('name', 'x' * 161), ('price', -1), ('price', 100_000_001),
    ('stock', -1), ('stock', 1_000_001), ('oldPrice', -1), ('status', 'deleted'),
    ('images', ['a.jpg'] * 21), ('images', ['https://example.com/' + 'a' * 500]),
    ('images', ['javascript:alert(1)']), ('images', ['//evil.example/img.png']),
])
def test_product_rejects_invalid_field(field, value):
    with pytest.raises(ValidationError):
        ProductIn.model_validate({'name': 'Tea', field: value})


@pytest.mark.parametrize('field,value', [('price', 0), ('price', 100_000_000), ('stock', 0), ('stock', 1_000_000), ('oldPrice', 0)])
def test_product_numeric_boundaries(field, value):
    assert getattr(ProductIn.model_validate({'name': 'Tea', field: value}), field) == value


@pytest.mark.parametrize('value', ['', None])
def test_empty_product_numbers_become_zero(value):
    product = ProductIn(name='Tea', price=value, stock=value)
    assert product.price == product.stock == 0


def test_product_preserves_custom_data_and_cleans_controls():
    product = ProductIn(name=' Tea ', ingredients={'text': 'tea\x00leaf'}, tags=['сон'])
    assert product.name == 'Tea'
    assert product.model_dump()['ingredients'] == {'text': 'tealeaf'}
    assert product.model_dump()['tags'] == ['сон']


def test_product_rejects_excessively_nested_data():
    value = 'leaf'
    for _ in range(8):
        value = {'child': value}
    with pytest.raises(ValidationError):
        ProductIn(name='Tea', description=value)


def test_product_rejects_oversized_custom_description():
    with pytest.raises(ValidationError):
        ProductIn(name='Tea', description='x' * 200_001)


@pytest.mark.parametrize('slug', ['', 'Herbs', 'чай', '../tea', 'tea space', '-tea'])
def test_category_invalid_slug(slug):
    with pytest.raises(ValidationError):
        CategoryIn(id=slug, name='Tea')


@pytest.mark.parametrize('qty', [0, -1, 100, 1.5, 'abc'])
def test_order_item_invalid_quantity(qty):
    with pytest.raises(ValidationError):
        OrderItemIn(id='p-test', qty=qty)


@pytest.mark.parametrize('qty', [1, 99])
def test_order_item_quantity_boundaries(qty):
    assert OrderItemIn(id='p-test', qty=qty).qty == qty


@pytest.mark.parametrize('items', [[], [{'id': 'p-test', 'qty': 1}] * 51])
def test_order_item_count_limits(items):
    with pytest.raises(ValidationError):
        OrderIn(name='Buyer', phone='+7 701 123 45 67', delivery='pickup', payment='cash', items=items)


@pytest.mark.parametrize('field,value', [('status', 'unknown'), ('paymentStatus', 'unknown')])
def test_order_patch_invalid_status(field, value):
    with pytest.raises(ValidationError):
        OrderPatchIn.model_validate({field: value})


@pytest.mark.parametrize('field,value', [('rating', 0), ('rating', 6), ('text', 'x' * 19), ('text', 'x' * 1501), ('period', 'forever'), ('voter', 'bad voter')])
def test_review_invalid_fields(field, value):
    with pytest.raises(ValidationError):
        ReviewIn.model_validate({'rating': 5, 'text': 'x' * 20, field: value})


@pytest.mark.parametrize('length', [20, 1500])
@pytest.mark.parametrize('rating', [1, 5])
def test_review_accepts_boundaries(length, rating):
    review = ReviewIn(rating=rating, text='x' * length)
    assert len(review.text) == length and review.rating == rating


@pytest.mark.parametrize('code', ['', '12345', '1234567', 'abcdef', '12-456'])
def test_email_code_format(code):
    with pytest.raises(ValidationError):
        CodeIn(email='buyer@example.com', code=code)


def test_profile_ignores_role_and_normalizes_name():
    data = ProfileIn.model_validate({'name': '  Buyer  ', 'role': 'admin'})
    assert data.name == 'Buyer'
    assert 'role' not in data.model_dump()
