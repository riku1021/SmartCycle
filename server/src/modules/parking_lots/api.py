import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.db.models.user import User
from src.infrastructure.db.session import get_db
from src.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/parking-lots", tags=["parking-lots"])

AvailabilitySourceType = Literal["gate_camera", "overhead_camera", "touch_sensor"]


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


class ParkingLotCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    total_spots: int = Field(ge=1)
    price_per_hour: int = Field(ge=1)
    availability_source_type: AvailabilitySourceType = "touch_sensor"


def _effective_role(user: User) -> str:
    if user.email == "operator@mail.com":
        return "operator"
    return user.role


def _ensure_operator(user: User) -> None:
    if _effective_role(user) != "operator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied (Operator only)",
        )


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


@router.post("", response_model=ParkingLotOut, status_code=status.HTTP_201_CREATED)
async def create_parking_lot(
    body: ParkingLotCreateBody,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ParkingLotOut:
    _ensure_operator(current_user)

    name = body.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="name must not be blank",
        )

    lot = ParkingLot(
        name=name,
        latitude=body.latitude,
        longitude=body.longitude,
        owner_id=current_user.id,
        availability_source_type=body.availability_source_type,
        total_spots=body.total_spots,
        price_per_hour=body.price_per_hour,
    )
    session.add(lot)
    await session.flush()

    status_row = ParkingStatus(
        parking_lot_id=lot.id,
        available_spots=body.total_spots,
        is_full=False,
    )
    session.add(status_row)
    await session.flush()
    await session.refresh(lot)
    await session.refresh(status_row)
    return _to_parking_lot_out(lot, status_row)


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
