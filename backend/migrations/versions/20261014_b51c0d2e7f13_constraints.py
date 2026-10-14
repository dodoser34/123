"""Защита данных на уровне базы: проверки значений (CHECK) и индексы для частых запросов.

Даже если в коде появится ошибка, база не примет отрицательную цену, неизвестную роль или оценку 7 из 5.

Revision ID: b51c0d2e7f13
Revises: a8720e66388e
Create Date: 2026-10-14 19:10:00
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'b51c0d2e7f13'
down_revision: Union[str, None] = 'a8720e66388e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CHECKS = {
    'users': [
        ('ck_users_role', "role IN ('customer', 'admin')"),
        ('ck_users_email_lower', 'email = lower(email)'),
    ],
    'email_codes': [
        ('ck_email_codes_purpose', "purpose IN ('verify', 'login', 'reset')"),
    ],
    'products': [
        ('ck_products_price', 'price >= 0'),
        ('ck_products_old_price', 'old_price IS NULL OR old_price >= 0'),
        ('ck_products_stock', 'stock >= 0'),
        ('ck_products_status', "status IN ('published', 'hidden')"),
    ],
    'reviews': [
        ('ck_reviews_rating', 'rating BETWEEN 1 AND 5'),
        ('ck_reviews_status', "status IN ('published', 'hidden')"),
        ('ck_reviews_helpful', 'helpful >= 0'),
    ],
    'orders': [
        ('ck_orders_status', "status IN ('new', 'processing', 'shipped', 'done', 'cancelled')"),
        ('ck_orders_payment_status', "payment_status IN ('pending', 'awaiting', 'paid', 'failed', 'refunded')"),
        ('ck_orders_sums', 'subtotal >= 0 AND delivery_price >= 0 AND total >= 0'),
    ],
}

INDEXES = [
    ('ix_sessions_expires_at', 'sessions', ['expires_at']),
    ('ix_email_codes_email_purpose', 'email_codes', ['email', 'purpose']),
    ('ix_reviews_product_status', 'reviews', ['product_id', 'status']),
    ('ix_orders_created_at', 'orders', ['created_at']),
]


def upgrade() -> None:
    # batch_alter_table — чтобы миграция работала и на PostgreSQL, и на SQLite (там таблица пересоздаётся)
    for table, checks in CHECKS.items():
        with op.batch_alter_table(table) as batch:
            for name, condition in checks:
                batch.create_check_constraint(name, condition)
    for name, table, columns in INDEXES:
        op.create_index(name, table, columns)


def downgrade() -> None:
    for name, table, _ in INDEXES:
        op.drop_index(name, table_name=table)
    for table, checks in CHECKS.items():
        with op.batch_alter_table(table) as batch:
            for name, _ in checks:
                batch.drop_constraint(name, type_='check')
