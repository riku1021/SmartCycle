"""IoT機器から駐輪場ステータスを受け取るAPI。"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.db.models.device import Device
from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.db.models.reservation import Reservation
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api", tags=["iot"])


class ParkingStatusUpsertBody(BaseModel):
    parking_lot_id: int = Field(gt=0)
    available_count: int = Field(ge=0)


class ParkingStatusResponse(BaseModel):
    parking_lot_id: int
    available_count: int
    updated_at: str


_latest_status_by_lot_id: dict[int, ParkingStatusResponse] = {}


@router.post("/iot/parking-status", response_model=ParkingStatusResponse)
async def upsert_parking_status(body: ParkingStatusUpsertBody) -> ParkingStatusResponse:
    # TODO: 認証・バリデーション強化（機器署名など）
    # TODO: DB保存（履歴テーブル/最新テーブル分離）
    # TODO: 異常値検知（負値、急激なジャンプなど）
    latest = ParkingStatusResponse(
        parking_lot_id=body.parking_lot_id,
        available_count=body.available_count,
        updated_at=datetime.now(UTC).isoformat(),
    )
    _latest_status_by_lot_id[body.parking_lot_id] = latest
    return latest


@router.get("/parking-statuses", response_model=list[ParkingStatusResponse])
async def list_parking_statuses() -> list[ParkingStatusResponse]:
    """すべての駐輪場の最新ステータスを取得"""
    return list(_latest_status_by_lot_id.values())


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
async def get_parking_status(parking_lot_id: int) -> ParkingStatusResponse:
    # TODO: DBから最新状態を取得する実装に置き換える
    latest = _latest_status_by_lot_id.get(parking_lot_id)
    if latest is None:
        # IoT からの初回 POST 前でもフロントがポーリングできるよう、既定値を返す
        return ParkingStatusResponse(
            parking_lot_id=parking_lot_id,
            available_count=3,
            updated_at=datetime.now(UTC).isoformat(),
        )
    return latest
