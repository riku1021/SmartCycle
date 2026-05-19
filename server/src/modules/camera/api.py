"""カメラ画像受信用 API。"""

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from .service import detect_bicycles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/camera", tags=["camera"])


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

    # TODO: 推論結果のDB永続化（別タスク）
    # TODO: 認証/署名検証強化
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
async def get_latest_detection() -> LatestDetectionResponse:
    return _latest_detection
