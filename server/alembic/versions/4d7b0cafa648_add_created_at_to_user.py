"""Add created_at to User

Revision ID: 4d7b0cafa648
Revises: 20260511_0002
Create Date: 2026-05-18

"""

import sqlalchemy as sa
from alembic import op

revision = "4d7b0cafa648"
down_revision = "20260511_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "created_at")
