from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c3d9e1a4b7f2'
down_revision: Union[str, None] = 'b51c0d2e7f13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM email_codes WHERE purpose = 'login'")
    with op.batch_alter_table('email_codes') as batch:
        batch.drop_constraint('ck_email_codes_purpose', type_='check')
        batch.create_check_constraint('ck_email_codes_purpose', "purpose IN ('verify', 'reset')")
    with op.batch_alter_table('users') as batch:
        batch.drop_column('google_sub')


def downgrade() -> None:
    with op.batch_alter_table('users') as batch:
        batch.add_column(sa.Column('google_sub', sa.String(length=64), nullable=True))
        batch.create_unique_constraint('uq_users_google_sub', ['google_sub'])
    with op.batch_alter_table('email_codes') as batch:
        batch.drop_constraint('ck_email_codes_purpose', type_='check')
        batch.create_check_constraint('ck_email_codes_purpose', "purpose IN ('verify', 'login', 'reset')")
