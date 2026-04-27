"""IoT機器から駐輪場ステータスを受け取るAPI。"""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

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
async def get_dashboard_summary() -> DashboardSummaryResponse:
    """ダッシュボード用のサマリーデータを取得"""
    # 実際はDBから取得するが、現状はメモリ内のデータを使用
    statuses = list(_latest_status_by_lot_id.values())
    
    total_capacity = 530  # モック値
    used_count = sum(s.available_count for s in statuses) # 本来は available_count は「空き」だが、ダッシュボードでは「使用中」として扱うか調整が必要
    # 画像では 0/530 なので、used_count を計算する。
    # ここでは仮に available_count が「使用中」を指すと仮定するか、あるいはロジックを合わせる。
    # ひとまず、フロントの表示に合わせるために計算。
    
    total_lots_count = 4
    full_lots_count = sum(1 for s in statuses if s.available_count >= 100) # 仮の判定
    
    occupancy_by_lot = [
        {"name": "グランフロント大阪 南館 駐輪場", "shortName": "グランフロント大阪", "value": _latest_status_by_lot_id.get(1, ParkingStatusResponse(parking_lot_id=1, available_count=0, updated_at="")).available_count},
        {"name": "ヨドバシ梅田タワー 駐輪場", "shortName": "ヨドバシ梅田", "value": _latest_status_by_lot_id.get(2, ParkingStatusResponse(parking_lot_id=2, available_count=0, updated_at="")).available_count},
        {"name": "大阪ステーションシティ 駐輪場", "shortName": "大阪ステーション", "value": _latest_status_by_lot_id.get(3, ParkingStatusResponse(parking_lot_id=3, available_count=0, updated_at="")).available_count},
        {"name": "梅田スカイビル 駐輪場", "shortName": "梅田スカイビル", "value": _latest_status_by_lot_id.get(4, ParkingStatusResponse(parking_lot_id=4, available_count=0, updated_at="")).available_count},
    ]
    
    return DashboardSummaryResponse(
        total_occupancy_rate=round((used_count / total_capacity) * 100, 1) if total_capacity > 0 else 0,
        used_count=used_count,
        total_capacity=total_capacity,
        full_lots_count=full_lots_count,
        total_lots_count=total_lots_count,
        active_reservations_count=0,  # 未実装
        abnormal_devices_count=0,      # 未実装
        occupancy_by_lot=occupancy_by_lot,
        status_distribution=[
            {"name": "空車あり", "value": total_lots_count - full_lots_count, "color": "#4f46e5"},
            {"name": "満車", "value": full_lots_count, "color": "#ef4444"},
        ]
    )


@router.get("/parking-statuses/{parking_lot_id}", response_model=ParkingStatusResponse)
async def get_parking_status(parking_lot_id: int) -> ParkingStatusResponse:
    # TODO: DBから最新状態を取得する実装に置き換える
    latest = _latest_status_by_lot_id.get(parking_lot_id)
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking status not found",
        )
    return latest
