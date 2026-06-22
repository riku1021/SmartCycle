"""add availability source type to parking lots

Revision ID: 7fcc1ee90249
Revises: 6fcc1ee90248
Create Date: 2026-06-15

"""

import sqlalchemy as sa
from alembic import op

revision = "7fcc1ee90249"
down_revision = "6fcc1ee90248"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "parking_lots",
        sa.Column(
            "availability_source_type",
            sa.String(length=50),
            server_default="touch_sensor",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "chk_availability_source_type",
        "parking_lots",
        "availability_source_type IN ('gate_camera', 'overhead_camera', 'touch_sensor')",
    )


def downgrade() -> None:
    op.drop_constraint("chk_availability_source_type", "parking_lots", type_="check")
    op.drop_column("parking_lots", "availability_source_type")
