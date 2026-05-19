# server/src/modules/camera/service.py
"""自転車検出サービス。"""

from __future__ import annotations
from typing import Any

import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

# COCO クラス ID: 1 = bicycle
_BICYCLE_CLASS_ID = 1
_CONFIDENCE_THRESHOLD = 0.4
_MODEL_PATH = "yolov8n.pt"  # TODO:


def _load_model() -> Any:
    """モデルを遅延ロード（初回推論時のみ）。"""
    from ultralytics import YOLO  # noqa: PLC0415
    return YOLO(_MODEL_PATH)


_model = None


def get_model() -> Any:
    global _model
    if _model is None:
        _model = _load_model()
    return _model


def detect_bicycles(image_bytes: bytes) -> list[dict]:
    """
    画像バイト列から自転車を検出し、結果リストを返す。

    Returns:
        [{"x": float, "y": float, "width": float, "height": float,
          "label": str, "score": float}, ...]
        座標は画像ピクセル単位（左上原点）。

    Raises:
        ValueError: 画像のデコードに失敗した場合。
        RuntimeError: 推論中に予期せぬエラーが発生した場合。
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"画像デコード失敗: {exc}") from exc

    try:
        model = get_model()
        results = model(image, verbose=False)
    except Exception as exc:
        raise RuntimeError(f"推論エラー: {exc}") from exc

    boxes_out: list[dict] = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            cls_id = int(box.cls[0])
            score = float(box.conf[0])
            if cls_id != _BICYCLE_CLASS_ID or score < _CONFIDENCE_THRESHOLD:
                continue
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            boxes_out.append({
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1,
                "label": "bicycle",
                "score": score,
            })

    return boxes_out
