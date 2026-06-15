import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/parking-lots", tags=["parking-lots"])


class ParkingLotOut(BaseModel):
    id: uuid.UUID
    name: str
    latitude: float
    longitude: float
    availability_source_type: str
    available_spots: int
    total_spots: int
    price_per_hour: int
    created_at: datetime
    updated_at: datetime


def _to_parking_lot_out(lot: ParkingLot, status_row: ParkingStatus | None) -> ParkingLotOut:
    return ParkingLotOut(
        id=lot.id,
        name=lot.name,
        latitude=lot.latitude,
        longitude=lot.longitude,
        availability_source_type=lot.availability_source_type,
        available_spots=status_row.available_spots if status_row is not None else lot.total_spots,
        total_spots=lot.total_spots,
        price_per_hour=lot.price_per_hour,
        created_at=lot.created_at,
        updated_at=lot.updated_at,
    )


async def _load_statuses_by_lot_id(session: AsyncSession) -> dict[uuid.UUID, ParkingStatus]:
    result = await session.execute(select(ParkingStatus))
    return {status_row.parking_lot_id: status_row for status_row in result.scalars()}


@router.get("", response_model=list[ParkingLotOut])
async def list_parking_lots(session: AsyncSession = Depends(get_db)) -> list[ParkingLotOut]:
    statuses = await _load_statuses_by_lot_id(session)
    result = await session.execute(select(ParkingLot).order_by(ParkingLot.name.asc()))
    return [_to_parking_lot_out(lot, statuses.get(lot.id)) for lot in result.scalars()]


@router.get("/{parking_lot_id}", response_model=ParkingLotOut)
async def get_parking_lot(
    parking_lot_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> ParkingLotOut:
    lot = await session.get(ParkingLot, parking_lot_id)
    if lot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking lot not found",
        )

    statuses = await _load_statuses_by_lot_id(session)
    return _to_parking_lot_out(lot, statuses.get(lot.id))
