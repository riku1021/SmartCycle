"""カメラ画像受信用 API。"""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

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

    # TODO: ここで物体検出（自転車検出）を実装してください。
    # 例: image_bytes を推論モデルへ入力し、detected_count と boxes を実値で更新する。

    # TODO: 推論結果のDB永続化は別タスクで実装する。
    global _latest_detection
    _latest_detection = LatestDetectionResponse(
        detected_count=0,
        boxes=[],
        received_at=datetime.now(UTC).isoformat(),
        content_type=content_type,
        size_bytes=len(image_bytes),
    )

    return CameraImageReceiveResponse(
        message="Camera image received. Processing is not implemented yet.",
        content_type=content_type,
        size_bytes=len(image_bytes),
    )


@router.get("/detections/latest", response_model=LatestDetectionResponse)
async def get_latest_detection() -> LatestDetectionResponse:
    return _latest_detection
