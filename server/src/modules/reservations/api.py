import math
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.reservation import Reservation
from src.infrastructure.db.models.user import User
from src.infrastructure.db.session import get_db
from src.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/reservations", tags=["reservations"])

ReservationStatus = Literal["reserved", "active", "completed", "cancelled"]


class ReservationCreateBody(BaseModel):
    parking_lot_id: uuid.UUID
    start_time: datetime
    end_time: datetime


class ReservationUpdateBody(BaseModel):
    status: Literal["cancelled"]


class ReservationOut(BaseModel):
    id: uuid.UUID
    parking_lot_id: uuid.UUID
    parking_lot_name: str
    location: str
    start_time: datetime
    end_time: datetime
    status: ReservationStatus
    total_amount: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


def _format_location(parking_lot: ParkingLot) -> str:
    return f"緯度 {parking_lot.latitude:.5f}, 経度 {parking_lot.longitude:.5f}"


def _calculate_total_amount(start_time: datetime, end_time: datetime, price_per_hour: int) -> int:
    duration_seconds = (end_time - start_time).total_seconds()
    billable_hours = max(math.ceil(duration_seconds / 3600), 1)
    return price_per_hour * billable_hours


def _to_reservation_out(reservation: Reservation, parking_lot: ParkingLot) -> ReservationOut:
    return ReservationOut(
        id=reservation.id,
        parking_lot_id=reservation.parking_lot_id,
        parking_lot_name=parking_lot.name,
        location=_format_location(parking_lot),
        start_time=reservation.start_time,
        end_time=reservation.end_time,
        status=reservation.status,  # type: ignore[arg-type]
        total_amount=reservation.total_amount,
        created_at=reservation.created_at,
    )


async def _get_owned_reservation_with_lot(
    session: AsyncSession,
    reservation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> tuple[Reservation, ParkingLot] | None:
    result = await session.execute(
        select(Reservation, ParkingLot)
        .join(ParkingLot, Reservation.parking_lot_id == ParkingLot.id)
        .where(Reservation.id == reservation_id, Reservation.user_id == user_id)
    )
    row = result.one_or_none()
    if row is None:
        return None
    return row[0], row[1]


@router.get("/me", response_model=list[ReservationOut])
async def list_my_reservations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[ReservationOut]:
    result = await session.execute(
        select(Reservation, ParkingLot)
        .join(ParkingLot, Reservation.parking_lot_id == ParkingLot.id)
        .where(Reservation.user_id == current_user.id)
        .order_by(Reservation.start_time.desc())
    )
    return [_to_reservation_out(reservation, parking_lot) for reservation, parking_lot in result]


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    body: ReservationCreateBody,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ReservationOut:
    if body.end_time <= body.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_time must be after start_time",
        )

    parking_lot = await session.get(ParkingLot, body.parking_lot_id)
    if parking_lot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking lot not found",
        )

    reservation = Reservation(
        user_id=current_user.id,
        parking_lot_id=parking_lot.id,
        start_time=body.start_time,
        end_time=body.end_time,
        status="reserved",
        total_amount=_calculate_total_amount(
            body.start_time,
            body.end_time,
            parking_lot.price_per_hour,
        ),
    )
    session.add(reservation)
    await session.flush()
    await session.refresh(reservation)
    return _to_reservation_out(reservation, parking_lot)


@router.patch("/{reservation_id}", response_model=ReservationOut)
async def cancel_reservation(
    reservation_id: uuid.UUID,
    body: ReservationUpdateBody,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ReservationOut:
    if body.status != "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only cancellation is supported",
        )

    row = await _get_owned_reservation_with_lot(session, reservation_id, current_user.id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )

    reservation, parking_lot = row
    if reservation.status in {"completed", "cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation cannot be cancelled",
        )

    reservation.status = "cancelled"
    await session.flush()
    await session.refresh(reservation)
    return _to_reservation_out(reservation, parking_lot)
