"""add role to user

Revision ID: 6fcc1ee90248
Revises: 4d7b0cafa648
Create Date: 2026-05-18

"""

import sqlalchemy as sa
from alembic import op

revision = "6fcc1ee90248"
down_revision = "4d7b0cafa648"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("role", sa.String(length=50), server_default="user", nullable=False)
    )


def downgrade() -> None:
    op.drop_column("users", "role")
