"""Реальные ограничения SQL и каскады на изолированной SQLite из conftest."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.db.models import User, Session, EmailCode, Product, Review, ReviewVote, Order, SiteSetting
from app.db.session import SessionLocal

pytestmark = pytest.mark.asyncio


def product(**changes):
    return Product(**{'id': 'p-db', 'slug': 'db-tea', 'name': 'Tea', 'price': 1000, 'stock': 5, **changes})


def order(**changes):
    return Order(**{'id': 'o-db', 'name': 'Buyer', 'phone': '+77011234567', 'delivery': 'pickup', 'payment': 'cash', **changes})


@pytest.mark.parametrize('changes', [{'price': -1}, {'old_price': -1}, {'stock': -1}, {'status': 'draft'}])
async def test_database_rejects_invalid_product(client, changes):
    async with SessionLocal() as db:
        db.add(product(**changes))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()
        assert await db.get(Product, 'p-db') is None


@pytest.mark.parametrize('changes', [{'role': 'superuser'}, {'email': 'UPPER@example.com'}])
async def test_database_rejects_invalid_user(client, changes):
    async with SessionLocal() as db:
        db.add(User(**{'email': 'db@example.com', 'name': 'Buyer', **changes}))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()


@pytest.mark.parametrize('changes', [{'subtotal': -1}, {'delivery_price': -1}, {'total': -1}, {'status': 'lost'}, {'payment_status': 'unknown'}])
async def test_database_rejects_invalid_order(client, changes):
    async with SessionLocal() as db:
        db.add(order(**changes))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()


@pytest.mark.parametrize('changes', [{'rating': 0}, {'rating': 6}, {'helpful': -1}, {'status': 'draft'}])
async def test_database_rejects_invalid_review(client, changes):
    async with SessionLocal() as db:
        db.add(product()); await db.commit()
        db.add(Review(**{'id': 'r-db', 'product_id': 'p-db', 'name': 'Buyer', 'rating': 5, 'text': 'A useful review', **changes}))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()
        assert await db.get(Product, 'p-db') is not None


@pytest.mark.parametrize('model,first,second', [
    (User, {'email': 'same@example.com', 'name': 'A'}, {'email': 'same@example.com', 'name': 'B'}),
    (User, {'email': 'a@example.com', 'name': 'A', 'google_sub': 'same'}, {'email': 'b@example.com', 'name': 'B', 'google_sub': 'same'}),
    (Product, {'slug': 'same', 'name': 'A'}, {'slug': 'same', 'name': 'B'}),
])
async def test_unique_identity_constraints(client, model, first, second):
    async with SessionLocal() as db:
        db.add(model(**first)); await db.commit()
        db.add(model(**second))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()


async def test_session_requires_existing_user(client):
    async with SessionLocal() as db:
        db.add(Session(token_hash='a' * 64, user_id='missing', expires_at=datetime.now(timezone.utc)))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()


async def test_email_code_purpose_constraint(client):
    async with SessionLocal() as db:
        db.add(EmailCode(email='a@example.com', purpose='admin', code_hash='x' * 64, expires_at=datetime.now(timezone.utc)))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()


async def test_duplicate_review_vote_rejected(client):
    async with SessionLocal() as db:
        db.add(product()); await db.flush()
        db.add(Review(id='r-db', product_id='p-db', name='Buyer', rating=5, text='Review')); await db.flush()
        db.add(ReviewVote(review_id='r-db', voter='browser-1')); await db.commit()
        db.add(ReviewVote(review_id='r-db', voter='browser-1'))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()
        assert len((await db.scalars(select(ReviewVote))).all()) == 1


async def test_product_delete_cascades_reviews_and_votes(client):
    async with SessionLocal() as db:
        db.add(product()); await db.flush()
        db.add(Review(id='r-db', product_id='p-db', name='Buyer', rating=5, text='Review')); await db.flush()
        db.add(ReviewVote(review_id='r-db', voter='browser-1')); await db.commit()
        await db.execute(delete(Product).where(Product.id == 'p-db')); await db.commit()
    async with SessionLocal() as db:
        assert await db.get(Review, 'r-db') is None
        assert (await db.scalars(select(ReviewVote))).all() == []


async def test_user_delete_revokes_sessions_and_keeps_history(client):
    async with SessionLocal() as db:
        db.add(User(id='u-db', email='db@example.com', name='Buyer')); db.add(product()); await db.flush()
        db.add(Session(token_hash='b' * 64, user_id='u-db', expires_at=datetime.now(timezone.utc) + timedelta(days=1)))
        db.add(Review(id='r-db', product_id='p-db', user_id='u-db', name='Buyer', rating=4, text='Review'))
        db.add(order(user_id='u-db', items=[{'id': 'p-db', 'name': 'Tea', 'qty': 1, 'price': 1000}]))
        await db.commit()
        await db.execute(delete(User).where(User.id == 'u-db')); await db.commit()
    async with SessionLocal() as db:
        assert await db.get(Session, 'b' * 64) is None
        assert (await db.get(Review, 'r-db')).user_id is None
        saved = (await db.scalars(select(Order).where(Order.id == 'o-db'))).one()
        assert saved.user_id is None and saved.items[0]['name'] == 'Tea'


async def test_json_unicode_round_trip(client):
    value = {'title': 'Чай 🌿', 'nested': {'items': [1, None, True, 'қазақша']}}
    async with SessionLocal() as db:
        db.add(SiteSetting(key='test', value=value)); await db.commit()
    async with SessionLocal() as db:
        assert (await db.get(SiteSetting, 'test')).value == value


async def test_rollback_restores_stock_and_discards_order(client):
    async with SessionLocal() as db:
        db.add(product()); await db.commit()
        row = await db.get(Product, 'p-db'); row.stock = 1
        db.add(order()); await db.flush(); await db.rollback()
    async with SessionLocal() as db:
        assert (await db.get(Product, 'p-db')).stock == 5
        assert (await db.scalars(select(Order))).all() == []
