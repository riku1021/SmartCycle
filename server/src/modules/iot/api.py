"""IoT機器から駐輪場ステータスを受け取るAPI。"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.config.deps import get_settings
from src.infrastructure.config.settings import Settings
from src.infrastructure.db.models.device import Device
from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.db.models.parking_status_history import ParkingStatusHistory
from src.infrastructure.db.models.reservation import Reservation
from src.infrastructure.db.session import get_db
from src.modules.line.service import LineNotifier

router = APIRouter(prefix="/api", tags=["iot"])


class ParkingStatusUpsertBody(BaseModel):
    parking_lot_id: uuid.UUID
    available_spots: int = Field(ge=0)


class ParkingStatusResponse(BaseModel):
    parking_lot_id: uuid.UUID
    available_spots: int
    updated_at: str


async def _available_counts_snapshot(session: AsyncSession) -> dict[uuid.UUID, int]:
    statuses = await session.execute(select(ParkingStatus))
    return {status.parking_lot_id: status.available_spots for status in statuses.scalars()}


async def _send_line_notification(
    settings: Settings,
    parking_lot_id: uuid.UUID,
    previous_available: int | None,
    new_available: int,
    available_by_lot_id: dict[uuid.UUID, int],
) -> None:
    notifier = LineNotifier(settings)
    await notifier.notify_status_change(
        parking_lot_id,
        previous_available,
        new_available,
        available_by_lot_id,
    )


@router.post("/iot/parking-status", response_model=ParkingStatusResponse)
async def upsert_parking_status(
    body: ParkingStatusUpsertBody,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ParkingStatusResponse:
    # 駐輪場の存在確認
    lot = await session.get(ParkingLot, body.parking_lot_id)
    if lot is None:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking lot not found",
        )

    # 現在のステータス取得
    status_result = await session.execute(
        select(ParkingStatus).where(ParkingStatus.parking_lot_id == body.parking_lot_id)
    )
    parking_status = status_result.scalar_one_or_none()

    previous_available = parking_status.available_spots if parking_status else None

    # ParkingStatus UPSERT
    if parking_status is None:
        parking_status = ParkingStatus(
            parking_lot_id=body.parking_lot_id,
            available_spots=body.available_spots,
            is_full=body.available_spots == 0,
        )
        session.add(parking_status)
    else:
        parking_status.available_spots = body.available_spots
        parking_status.is_full = body.available_spots == 0

    # ParkingStatusHistory INSERT
    history = ParkingStatusHistory(
        parking_lot_id=body.parking_lot_id,
        available_spots=body.available_spots,
        recorded_at=datetime.now(UTC).replace(tzinfo=None),
    )
    session.add(history)

    # デバイス最終検知日時の更新 (touch_sensor)
    device_result = await session.execute(
        select(Device).where(
            Device.parking_lot_id == body.parking_lot_id, Device.type == "touch_sensor"
        )
    )
    device = device_result.scalar_one_or_none()
    if device is not None:
        device.last_seen_at = datetime.now(UTC).replace(tzinfo=None)

    await session.commit()

    latest = ParkingStatusResponse(
        parking_lot_id=body.parking_lot_id,
        available_spots=body.available_spots,
        updated_at=datetime.now(UTC).isoformat(),
    )

    snapshot = await _available_counts_snapshot(session)
    background_tasks.add_task(
        _send_line_notification,
        settings,
        body.parking_lot_id,
        previous_available,
        body.available_spots,
        snapshot,
    )

    return latest


@router.get("/parking-statuses", response_model=list[ParkingStatusResponse])
async def list_parking_statuses(
    session: AsyncSession = Depends(get_db),
) -> list[ParkingStatusResponse]:
    """すべての駐輪場の最新ステータスを取得"""
    statuses = await session.execute(select(ParkingStatus))
    return [
        ParkingStatusResponse(
            parking_lot_id=status.parking_lot_id,
            available_spots=status.available_spots,
            updated_at=datetime.now(
                UTC
            ).isoformat(),  # DB上のupdated_atがあればそれを使うべきだが、モデルに無いので現在時刻か生成時刻
        )
        for status in statuses.scalars()
    ]


class DashboardSummaryResponse(BaseModel):
    total_occupancy_rate: float
    used_count: int
    total_capacity: int
    full_lots_count: int
    total_lots_count: int
    active_reservations_count: int
    abnormal_devices_count: int
    occupancy_by_lot: list[dict]
    status_distribution: list[dict]


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    session: AsyncSession = Depends(get_db),
) -> DashboardSummaryResponse:
    """ダッシュボード用のサマリーデータを取得"""

    # 全駐輪場を取得
    lots_result = await session.execute(select(ParkingLot))
    lots = lots_result.scalars().all()

    # ステータスを取得
    statuses_result = await session.execute(select(ParkingStatus))
    statuses = {s.parking_lot_id: s for s in statuses_result.scalars().all()}

    # 予約を取得
    reservations_count = (
        await session.execute(
            select(func.count(Reservation.id)).where(Reservation.status.in_(["reserved", "active"]))
        )
    ).scalar_one()

    # 異常デバイスを取得（1時間以上音沙汰なし）
    threshold_time = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
    abnormal_devices_count = (
        await session.execute(
            select(func.count(Device.id)).where(Device.last_seen_at < threshold_time)
        )
    ).scalar_one()

    occupancy_by_lot = []
    used_count = 0
    full_lots_count = 0
    total_capacity = sum(lot.total_spots for lot in lots)
    total_lots_count = len(lots)

    for lot in lots:
        status = statuses.get(lot.id)
        # 空き台数（ステータスが無い場合は全空きとみなす）
        available_spots = status.available_spots if status else lot.total_spots
        is_full = status.is_full if status else False

        # 使用数
        current_used = lot.total_spots - available_spots
        used_count += current_used
        if is_full:
            full_lots_count += 1

        short_name = lot.name.replace(" 駐輪場", "").replace(" 南館", "").replace("シティ", "")

        occupancy_by_lot.append(
            {
                "id": str(lot.id),
                "name": lot.name,
                "short_name": short_name,
                "value": current_used,  # フロントではvalueを「利用数」または「稼働率」で描画
                "latitude": lot.latitude,
                "longitude": lot.longitude,
                "total_spots": lot.total_spots,
                "price_per_hour": lot.price_per_hour,
            }
        )

    return DashboardSummaryResponse(
        total_occupancy_rate=round((used_count / total_capacity) * 100, 1)
        if total_capacity > 0
        else 0,
        used_count=used_count,
        total_capacity=total_capacity,
        full_lots_count=full_lots_count,
        total_lots_count=total_lots_count,
        active_reservations_count=reservations_count,
        abnormal_devices_count=abnormal_devices_count,
        occupancy_by_lot=occupancy_by_lot,
        status_distribution=[
            {"name": "空車あり", "value": total_lots_count - full_lots_count, "color": "#4f46e5"},
            {"name": "満車", "value": full_lots_count, "color": "#ef4444"},
        ],
    )


@router.get("/parking-statuses/{parking_lot_id}", response_model=ParkingStatusResponse)
async def get_parking_status(
    parking_lot_id: uuid.UUID, session: AsyncSession = Depends(get_db)
) -> ParkingStatusResponse:
    from fastapi import HTTPException, status

    # 駐輪場存在チェック
    lot = await session.get(ParkingLot, parking_lot_id)
    if lot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking lot not found",
        )

    # ステータス取得
    status_result = await session.execute(
        select(ParkingStatus).where(ParkingStatus.parking_lot_id == parking_lot_id)
    )
    parking_status = status_result.scalar_one_or_none()

    if parking_status is None:
        return ParkingStatusResponse(
            parking_lot_id=parking_lot_id,
            available_spots=lot.total_spots,
            updated_at=datetime.now(UTC).isoformat(),
        )

    return ParkingStatusResponse(
        parking_lot_id=parking_lot_id,
        available_spots=parking_status.available_spots,
        updated_at=datetime.now(UTC).isoformat(),
    )
