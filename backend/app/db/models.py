import secrets
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .session import Base, JSONType


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f'{prefix}-{secrets.token_hex(5)}'


class User(Base):
    __tablename__ = 'users'
    __table_args__ = (
        CheckConstraint("role IN ('customer', 'admin')", name='ck_users_role'),
        CheckConstraint('email = lower(email)', name='ck_users_email_lower'),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id('u'))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(32), default='')
    password_hash: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(16), default='customer')
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    sessions: Mapped[list['Session']] = relationship(back_populates='user', cascade='all, delete-orphan', passive_deletes=True)


class Session(Base):

    __tablename__ = 'sessions'
    __table_args__ = (Index('ix_sessions_expires_at', 'expires_at'),)

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates='sessions')


class EmailCode(Base):

    __tablename__ = 'email_codes'
    __table_args__ = (
        CheckConstraint("purpose IN ('verify', 'reset')", name='ck_email_codes_purpose'),
        Index('ix_email_codes_email_purpose', 'email', 'purpose'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    purpose: Mapped[str] = mapped_column(String(16))
    code_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Category(Base):
    __tablename__ = 'categories'

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(32), default='leaf')
    position: Mapped[int] = mapped_column(Integer, default=0)
    subs: Mapped[list] = mapped_column(JSONType, default=list)


class Product(Base):

    __tablename__ = 'products'
    __table_args__ = (
        CheckConstraint('price >= 0', name='ck_products_price'),
        CheckConstraint('old_price IS NULL OR old_price >= 0', name='ck_products_old_price'),
        CheckConstraint('stock >= 0', name='ck_products_stock'),
        CheckConstraint("status IN ('published', 'hidden')", name='ck_products_status'),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id('p'))
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default='published')
    category: Mapped[str] = mapped_column(String(60), index=True, default='')
    sub: Mapped[str] = mapped_column(String(60), default='')
    name: Mapped[str] = mapped_column(String(160))
    brand: Mapped[str] = mapped_column(String(80), default='')
    price: Mapped[int] = mapped_column(Integer, default=0)
    old_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    data: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Review(Base):
    __tablename__ = 'reviews'
    __table_args__ = (
        CheckConstraint('rating BETWEEN 1 AND 5', name='ck_reviews_rating'),
        CheckConstraint("status IN ('published', 'hidden')", name='ck_reviews_status'),
        CheckConstraint('helpful >= 0', name='ck_reviews_helpful'),
        Index('ix_reviews_product_status', 'product_id', 'status'),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id('r'))
    product_id: Mapped[str] = mapped_column(ForeignKey('products.id', ondelete='CASCADE'), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(40))
    rating: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(80), default='')
    text: Mapped[str] = mapped_column(Text)
    pros: Mapped[str] = mapped_column(String(200), default='')
    cons: Mapped[str] = mapped_column(String(200), default='')
    recommend: Mapped[bool] = mapped_column(Boolean, default=True)
    period: Mapped[str] = mapped_column(String(16), default='')
    helpful: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default='published')
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    reply: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ReviewVote(Base):

    __tablename__ = 'review_votes'
    __table_args__ = (UniqueConstraint('review_id', 'voter'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[str] = mapped_column(ForeignKey('reviews.id', ondelete='CASCADE'), index=True)
    voter: Mapped[str] = mapped_column(String(64))


class Order(Base):
    __tablename__ = 'orders'
    __table_args__ = (
        CheckConstraint("status IN ('new', 'processing', 'shipped', 'done', 'cancelled')", name='ck_orders_status'),
        CheckConstraint("payment_status IN ('pending', 'awaiting', 'paid', 'failed', 'refunded')", name='ck_orders_payment_status'),
        CheckConstraint('subtotal >= 0 AND delivery_price >= 0 AND total >= 0', name='ck_orders_sums'),
        Index('ix_orders_created_at', 'created_at'),
    )

    seq: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id: Mapped[str] = mapped_column(String(40), unique=True, index=True, default=lambda: new_id('o'))
    user_id: Mapped[str | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default='new')
    name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(32))
    email: Mapped[str] = mapped_column(String(254), default='')
    delivery: Mapped[str] = mapped_column(String(16))
    delivery_title: Mapped[str] = mapped_column(String(120), default='')
    city: Mapped[str] = mapped_column(String(80), default='')
    address: Mapped[str] = mapped_column(String(200), default='')
    comment: Mapped[str] = mapped_column(Text, default='')
    payment: Mapped[str] = mapped_column(String(24))
    payment_title: Mapped[str] = mapped_column(String(120), default='')
    payment_status: Mapped[str] = mapped_column(String(16), default='pending')
    payment_ref: Mapped[str] = mapped_column(String(120), default='')
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    items: Mapped[list] = mapped_column(JSONType, default=list)
    subtotal: Mapped[int] = mapped_column(Integer, default=0)
    delivery_price: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    @property
    def number(self) -> int:
        return (self.seq or 0) + 1000


class SiteSetting(Base):

    __tablename__ = 'site_settings'

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONType, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
