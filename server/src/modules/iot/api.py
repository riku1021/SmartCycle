"""IoT機器から駐輪場ステータスを受け取るAPI。"""

from datetime import UTC, datetime

from fastapi import APIRouter
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
