"""カメラ・検出履歴シードデータ投入。"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.infrastructure.db.models.camera_detection import CameraDetection
from src.infrastructure.db.models.device import Device
from src.infrastructure.db.models.parking_lot import ParkingLot


async def seed_camera(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """devices と camera_detections のシードデータを投入する。"""
    async with session_maker() as session:
        # 梅田ステーション東の parking_lot_id を取得
        result = await session.execute(
            select(ParkingLot).where(ParkingLot.name == "梅田ステーション東")
        )
        parking_lot = result.scalar_one_or_none()
        if parking_lot is None:
            parking_lot = ParkingLot(
                id=uuid.uuid7(),
                name="梅田ステーション東",
                latitude=34.7024,
                longitude=135.4959,
                total_spots=20,
                price_per_hour=100,
            )
            session.add(parking_lot)
            await session.flush()

        # devices の重複チェック
        device_result = await session.execute(
            select(Device).where(Device.name == "開発用カメラ-梅田東")
        )
        existing_device = device_result.scalar_one_or_none()
        if existing_device is not None:
            device = existing_device
        else:
            device = Device(
                id=uuid.uuid7(),
                parking_lot_id=parking_lot.id,
                type="camera",
                name="開発用カメラ-梅田東",
            )
            session.add(device)
            await session.flush()

        # camera_detections の重複チェック
        detection_result = await session.execute(
            select(CameraDetection).where(
                CameraDetection.device_id == device.id
            )
        )
        existing_detection = detection_result.scalar_one_or_none()
        if existing_detection is None:
            detection = CameraDetection(
                id=uuid.uuid7(),
                parking_lot_id=parking_lot.id,
                device_id=device.id,
                detected_count=2,
                detection_data={
                    "boxes": [
                        {
                            "x": 100.0,
                            "y": 150.0,
                            "width": 200.0,
                            "height": 180.0,
                            "label": "bicycle",
                            "score": 0.91,
                        },
                        {
                            "x": 350.0,
                            "y": 160.0,
                            "width": 190.0,
                            "height": 170.0,
                            "label": "bicycle",
                            "score": 0.85,
                        },
                    ]
                },
                image_url=None,
            )
            session.add(detection)

        await session.commit()
