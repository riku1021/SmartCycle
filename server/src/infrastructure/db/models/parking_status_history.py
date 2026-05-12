import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..base import Base


class ParkingStatusHistory(Base):
    __tablename__ = "parking_status_histories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid7,
    )
    parking_lot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parking_lots.id", ondelete="CASCADE"),
        nullable=False,
    )
    available_spots: Mapped[int] = mapped_column(Integer, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        "timestamp",
        DateTime(timezone=False),
        server_default=text("NOW()"),
        nullable=False,
        index=True,
    )
