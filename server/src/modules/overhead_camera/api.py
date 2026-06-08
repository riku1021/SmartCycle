"""俯瞰カメラ画像受信用 API。"""

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.db.models.camera_detection import CameraDetection
from src.infrastructure.db.models.device import Device
from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.db.session import get_db
from src.modules.camera.service import detect_bicycles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/overhead-camera", tags=["overhead-camera"])

_DEVICE_NAME = "開発用俯瞰カメラ-梅田東"


class DetectionBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str
    score: float


class OverheadImageReceiveResponse(BaseModel):
    message: str
    detected_count: int
    available_spots: int | None
    total_spots: int | None
    content_type: str | None
    size_bytes: int


class LatestOverheadDetectionResponse(BaseModel):
    detected_count: int
    boxes: list[DetectionBox]
    available_spots: int | None
    total_spots: int | None
    received_at: str | None
    content_type: str | None
    size_bytes: int


_latest_detection = LatestOverheadDetectionResponse(
    detected_count=0,
    boxes=[],
    available_spots=None,
    total_spots=None,
    received_at=None,
    content_type=None,
    size_bytes=0,
)


async def _update_parking_status(
    db: AsyncSession,
    parking_lot: ParkingLot,
    detected_count: int,
) -> tuple[int, int]:
    """検出台数から空き台数を直接更新する。"""
    available_spots = max(0, parking_lot.total_spots - detected_count)
    is_full = available_spots == 0

    status_result = await db.execute(
        select(ParkingStatus).where(ParkingStatus.parking_lot_id == parking_lot.id)
    )
    parking_status = status_result.scalar_one_or_none()

    if parking_status is None:
        parking_status = ParkingStatus(
            parking_lot_id=parking_lot.id,
            available_spots=available_spots,
            is_full=is_full,
        )
        db.add(parking_status)
    else:
        parking_status.available_spots = available_spots
        parking_status.is_full = is_full

    await db.commit()
    return available_spots, parking_lot.total_spots


@router.post("/images", response_model=OverheadImageReceiveResponse)
async def receive_overhead_image(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> OverheadImageReceiveResponse:
    image_bytes = await request.body()
    content_type = request.headers.get("content-type")
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image payload is empty",
        )

    try:
        boxes_raw = detect_bicycles(image_bytes)
        boxes = [DetectionBox(**b) for b in boxes_raw]
        detected_count = len(boxes)
        message = "Detection succeeded."
    except (ValueError, RuntimeError) as exc:
        logger.warning("Detection failed: %s", exc)
        return OverheadImageReceiveResponse(
            message=f"Detection failed: {exc}",
            detected_count=0,
            available_spots=None,
            total_spots=None,
            content_type=content_type,
            size_bytes=len(image_bytes),
        )

    available_spots: int | None = None
    total_spots: int | None = None

    try:
        device_result = await db.execute(select(Device).where(Device.name == _DEVICE_NAME))
        device = device_result.scalar_one_or_none()

        if device is not None:
            detection_data: dict[str, Any] = {"boxes": [b.model_dump() for b in boxes]}
            detection = CameraDetection(
                parking_lot_id=device.parking_lot_id,
                device_id=device.id,
                detected_count=detected_count,
                detection_data=detection_data,
                image_url=None,
            )
            db.add(detection)
            await db.flush()

            lot_result = await db.execute(
                select(ParkingLot).where(ParkingLot.id == device.parking_lot_id)
            )
            parking_lot = lot_result.scalar_one_or_none()
            if parking_lot is not None:
                available_spots, total_spots = await _update_parking_status(
                    db, parking_lot, detected_count
                )
    except Exception as exc:
        logger.warning("DB保存/空き更新失敗: %s", exc)

    global _latest_detection
    _latest_detection = LatestOverheadDetectionResponse(
        detected_count=detected_count,
        boxes=boxes,
        available_spots=available_spots,
        total_spots=total_spots,
        received_at=datetime.now(UTC).isoformat(),
        content_type=content_type,
        size_bytes=len(image_bytes),
    )

    return OverheadImageReceiveResponse(
        message=message,
        detected_count=detected_count,
        available_spots=available_spots,
        total_spots=total_spots,
        content_type=content_type,
        size_bytes=len(image_bytes),
    )


@router.get("/detections/latest", response_model=LatestOverheadDetectionResponse)
async def get_latest_overhead_detection(
    db: AsyncSession = Depends(get_db),
) -> LatestOverheadDetectionResponse:
    """俯瞰カメラの最新検出結果をDBから返す。"""
    try:
        device_result = await db.execute(select(Device).where(Device.name == _DEVICE_NAME))
        device = device_result.scalar_one_or_none()

        if device is not None:
            result = await db.execute(
                select(CameraDetection)
                .where(CameraDetection.device_id == device.id)
                .order_by(CameraDetection.created_at.desc())
                .limit(1)
            )
            detection = result.scalar_one_or_none()

            if detection is not None:
                boxes: list[DetectionBox] = []
                if detection.detection_data and "boxes" in detection.detection_data:
                    boxes = [DetectionBox(**b) for b in detection.detection_data["boxes"]]

                lot_result = await db.execute(
                    select(ParkingLot).where(ParkingLot.id == detection.parking_lot_id)
                )
                parking_lot = lot_result.scalar_one_or_none()
                total_spots = parking_lot.total_spots if parking_lot else None

                status_result = await db.execute(
                    select(ParkingStatus).where(
                        ParkingStatus.parking_lot_id == detection.parking_lot_id
                    )
                )
                parking_status = status_result.scalar_one_or_none()
                available_spots = parking_status.available_spots if parking_status else None

                return LatestOverheadDetectionResponse(
                    detected_count=detection.detected_count,
                    boxes=boxes,
                    available_spots=available_spots,
                    total_spots=total_spots,
                    received_at=detection.created_at.isoformat(),
                    content_type=None,
                    size_bytes=0,
                )
    except Exception as exc:
        logger.warning("DB取得失敗: %s", exc)

    return _latest_detection
