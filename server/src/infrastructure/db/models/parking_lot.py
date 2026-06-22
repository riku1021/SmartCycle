import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, Integer, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..base import Base


class ParkingLot(Base):
    __tablename__ = "parking_lots"
    __table_args__ = (
        CheckConstraint(
            "availability_source_type IN ('gate_camera', 'overhead_camera', 'touch_sensor')",
            name="chk_availability_source_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid7,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    availability_source_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="touch_sensor"
    )
    total_spots: Mapped[int] = mapped_column(Integer, nullable=False)
    price_per_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("NOW()"),
        onupdate=func.now(),
        nullable=False,
    )
