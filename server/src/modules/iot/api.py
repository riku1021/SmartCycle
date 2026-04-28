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
    
    # 駐輪場ごとのデフォルト値（モックデータ）
    default_values = {
        1: 180,  # グランフロント大阪
        2: 150,  # ヨドバシ梅田
        3: 45,   # 大阪ステーションシティ
        4: 37,   # 梅田スカイビル
    }
    capacities = {
        1: 200,
        2: 150,
        3: 100,
        4: 80,
    }
    
    occupancy_by_lot = []
    lot_names = {
        1: ("グランフロント大阪 南館 駐輪場", "グランフロント大阪"),
        2: ("ヨドバシ梅田タワー 駐輪場", "ヨドバシ梅田"),
        3: ("大阪ステーションシティ 駐輪場", "大阪ステーション"),
        4: ("梅田スカイビル 駐輪場", "梅田スカイビル"),
    }
    
    used_count = 0
    full_lots_count = 0
    total_capacity = sum(capacities.values())
    total_lots_count = len(lot_names)
    
    for lot_id, (name, short_name) in lot_names.items():
        # メモリにデータがあればそれを使い、なければデフォルト値を使用
        current_val = _latest_status_by_lot_id.get(
            lot_id, 
            ParkingStatusResponse(parking_lot_id=lot_id, available_count=default_values[lot_id], updated_at="")
        ).available_count
        
        occupancy_by_lot.append({
            "name": name,
            "shortName": short_name,
            "value": current_val
        })
        used_count += current_val
        
        # 満車判定（ここでは 稼働率 95% 以上を満車とする）
        if current_val >= capacities[lot_id] * 0.95:
            full_lots_count += 1
            
    return DashboardSummaryResponse(
        total_occupancy_rate=round((used_count / total_capacity) * 100, 1) if total_capacity > 0 else 0,
        used_count=used_count,
        total_capacity=total_capacity,
        full_lots_count=full_lots_count,
        total_lots_count=total_lots_count,
        active_reservations_count=24,  # モック値
        abnormal_devices_count=1,      # モック値
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
