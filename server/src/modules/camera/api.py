"""カメラ画像受信用 API。"""

from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.db.models.camera_detection import CameraDetection
from src.infrastructure.db.models.device import Device
from src.infrastructure.db.session import get_db

from .service import detect_bicycles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/camera", tags=["camera"])

_DEVICE_NAME = "開発用カメラ-梅田東"


class CameraImageReceiveResponse(BaseModel):
    message: str
    content_type: str | None
    size_bytes: int


class DetectionBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str
    score: float


class LatestDetectionResponse(BaseModel):
    detected_count: int
    boxes: list[DetectionBox]
    received_at: str | None
    content_type: str | None
    size_bytes: int


# フォールバック用メモリ保持
_latest_detection = LatestDetectionResponse(
    detected_count=0,
    boxes=[],
    received_at=None,
    content_type=None,
    size_bytes=0,
)


@router.post("/images", response_model=CameraImageReceiveResponse)
async def receive_camera_image(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> CameraImageReceiveResponse:
    image_bytes = await request.body()
    content_type = request.headers.get("content-type")
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image payload is empty",
        )

    # --- 物体検出 ---
    try:
        boxes_raw = detect_bicycles(image_bytes)
        boxes = [DetectionBox(**b) for b in boxes_raw]
        detected_count = len(boxes)
        message = "Detection succeeded."
    except (ValueError, RuntimeError) as exc:
        logger.warning("Detection failed: %s", exc)
        return CameraImageReceiveResponse(
            message=f"Detection failed: {exc}",
            content_type=content_type,
            size_bytes=len(image_bytes),
        )

    # --- DB永続化 ---
    try:
        result = await db.execute(
            select(Device).where(Device.name == _DEVICE_NAME)
        )
        device = result.scalar_one_or_none()

        if device is not None:
            
            detection_data: dict[str, Any] = {
                "boxes": [b.model_dump() for b in boxes]
            }
            detection = CameraDetection(
                parking_lot_id=device.parking_lot_id,
                device_id=device.id,
                detected_count=detected_count,
                detection_data=detection_data,
                image_url=None,
            )
            db.add(detection)
            await db.flush()
    except Exception as exc:
        logger.warning("DB保存失敗: %s", exc)

    # メモリ更新（フォールバック用）
    # TODO: 認証/署名検証強化
    # TODO: モデル差し替えは service.py の _MODEL_PATH を変更
    global _latest_detection
    _latest_detection = LatestDetectionResponse(
        detected_count=detected_count,
        boxes=boxes,
        received_at=datetime.now(UTC).isoformat(),
        content_type=content_type,
        size_bytes=len(image_bytes),
    )

    return CameraImageReceiveResponse(
        message=message,
        content_type=content_type,
        size_bytes=len(image_bytes),
    )


@router.get("/detections/latest", response_model=LatestDetectionResponse)
async def get_latest_detection(
    db: AsyncSession = Depends(get_db),
) -> LatestDetectionResponse:
    """最新の検出結果をDBから返す。DBに記録がなければメモリの値を返す。"""
    try:
        result = await db.execute(
            select(CameraDetection)
            .order_by(CameraDetection.created_at.desc())
            .limit(1)
        )
        detection = result.scalar_one_or_none()

        if detection is not None:
            boxes: list[DetectionBox] = []
            if detection.detection_data and "boxes" in detection.detection_data:
                boxes = [DetectionBox(**b) for b in detection.detection_data["boxes"]]
            return LatestDetectionResponse(
                detected_count=detection.detected_count,
                boxes=boxes,
                received_at=detection.created_at.isoformat(),
                content_type=None,
                size_bytes=0,
            )
    except Exception as exc:
        logger.warning("DB取得失敗: %s", exc)

    return _latest_detection

class TripEventRequest(BaseModel):
    direction: str  # "in" or "out"


@router.post("/trip", status_code=status.HTTP_200_OK)
async def record_trip_event(
    body: TripEventRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """自転車の通過イベントを受信し、駐輪場の空き台数を更新する。"""
    try:
        # デバイスから parking_lot_id を取得
        device_result = await db.execute(
            select(Device).where(Device.name == _DEVICE_NAME)
        )
        device = device_result.scalar_one_or_none()
        if device is None:
            raise HTTPException(status_code=404, detail="Device not found")

        # parking_lot を取得
        lot_result = await db.execute(
            select(ParkingLot).where(ParkingLot.id == device.parking_lot_id)
        )
        parking_lot = lot_result.scalar_one_or_none()
        if parking_lot is None:
            raise HTTPException(status_code=404, detail="Parking lot not found")

        # parking_status を取得または作成
        status_result = await db.execute(
            select(ParkingStatus).where(
                ParkingStatus.parking_lot_id == device.parking_lot_id
            )
        )
        parking_status = status_result.scalar_one_or_none()

        if parking_status is None:
            parking_status = ParkingStatus(
                parking_lot_id=device.parking_lot_id,
                available_spots=parking_lot.total_spots,
                is_full=False,
            )
            db.add(parking_status)
            await db.flush()

        # 空き台数を更新
        if body.direction == "in":
            parking_status.available_spots = max(0, parking_status.available_spots - 1)
        elif body.direction == "out":
            parking_status.available_spots = min(
                parking_lot.total_spots,
                parking_status.available_spots + 1
            )

        parking_status.is_full = parking_status.available_spots == 0
        await db.commit()

    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("parking_status更新失敗: %s", exc)

    return {"message": "ok"}
