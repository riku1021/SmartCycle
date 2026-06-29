"""add owner id to parking lots

Revision ID: 8fcc1ee90250
Revises: 7fcc1ee90249
Create Date: 2026-06-29

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "8fcc1ee90250"
down_revision = "7fcc1ee90249"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "parking_lots",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_parking_lots_owner_id",
        "parking_lots",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_parking_lots_owner_id", "parking_lots", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_parking_lots_owner_id", table_name="parking_lots")
    op.drop_constraint("fk_parking_lots_owner_id", "parking_lots", type_="foreignkey")
    op.drop_column("parking_lots", "owner_id")
