"""add parking domain tables

Revision ID: 20260511_0002
Revises: 20260422_0001
Create Date: 2026-05-11
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260511_0002"
down_revision = "20260422_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "parking_lots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("total_spots", sa.Integer(), nullable=False),
        sa.Column("price_per_hour", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_parking_lots"),
    )
    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parking_lot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("secret_key", sa.String(length=255), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=False), nullable=True),
        sa.ForeignKeyConstraint(
            ["parking_lot_id"],
            ["parking_lots.id"],
            name="fk_devices_parking_lot_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_devices"),
    )
    op.create_table(
        "camera_detections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parking_lot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("detected_count", sa.Integer(), nullable=False),
        sa.Column("detection_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("image_url", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["device_id"],
            ["devices.id"],
            name="fk_camera_detections_device_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["parking_lot_id"],
            ["parking_lots.id"],
            name="fk_camera_detections_parking_lot_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_camera_detections"),
    )
    op.create_index(
        "ix_camera_detections_created_at",
        "camera_detections",
        ["created_at"],
        unique=False,
    )
    op.create_table(
        "parking_statuses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parking_lot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("available_spots", sa.Integer(), nullable=False),
        sa.Column("is_full", sa.Boolean(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["parking_lot_id"],
            ["parking_lots.id"],
            name="fk_parking_statuses_parking_lot_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_parking_statuses"),
        sa.UniqueConstraint("parking_lot_id", name="uq_parking_statuses_parking_lot_id"),
    )
    op.create_table(
        "parking_status_histories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parking_lot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("available_spots", sa.Integer(), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["parking_lot_id"],
            ["parking_lots.id"],
            name="fk_parking_status_histories_parking_lot_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_parking_status_histories"),
    )
    op.create_index(
        "ix_parking_status_histories_timestamp",
        "parking_status_histories",
        ["timestamp"],
        unique=False,
    )
    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parking_lot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=False), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=False), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("total_amount", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint("end_time > start_time", name="ck_reservations_end_after_start"),
        sa.CheckConstraint(
            "status IN ('reserved', 'active', 'completed', 'cancelled')",
            name="ck_reservations_status_allowed",
        ),
        sa.ForeignKeyConstraint(
            ["parking_lot_id"],
            ["parking_lots.id"],
            name="fk_reservations_parking_lot_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_reservations_user_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_reservations"),
    )


def downgrade() -> None:
    op.drop_table("reservations")
    op.drop_index("ix_parking_status_histories_timestamp", table_name="parking_status_histories")
    op.drop_table("parking_status_histories")
    op.drop_table("parking_statuses")
    op.drop_index("ix_camera_detections_created_at", table_name="camera_detections")
    op.drop_table("camera_detections")
    op.drop_table("devices")
    op.drop_table("parking_lots")
