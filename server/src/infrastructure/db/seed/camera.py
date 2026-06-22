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
        result = await session.execute(
            select(ParkingLot).where(ParkingLot.name == "梅田ステーション東")
        )
        parking_lot = result.scalar_one_or_none()

        nakanoshima_result = await session.execute(
            select(ParkingLot).where(ParkingLot.name == "中之島ゲート")
        )
        nakanoshima_lot = nakanoshima_result.scalar_one_or_none()

        honmachi_result = await session.execute(
            select(ParkingLot).where(ParkingLot.name == "本町サイクルデッキ")
        )
        honmachi_lot = honmachi_result.scalar_one_or_none()

        if parking_lot is None:
            parking_lot = ParkingLot(
                id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                name="梅田ステーション東",
                latitude=34.70631,
                longitude=135.49887,
                availability_source_type="touch_sensor",
                total_spots=3,
                price_per_hour=100,
            )
            session.add(parking_lot)
            await session.flush()

        touch_device_result = await session.execute(
            select(Device).where(Device.name == "EV3タッチセンサー-梅田東")
        )
        if touch_device_result.scalar_one_or_none() is None:
            touch_device = Device(
                id=uuid.uuid7(),
                parking_lot_id=parking_lot.id,
                type="touch_sensor",
                name="EV3タッチセンサー-梅田東",
            )
            session.add(touch_device)
            await session.flush()

        gate_lot = honmachi_lot if honmachi_lot is not None else parking_lot
        gate_device_result = await session.execute(
            select(Device).where(Device.type == "gate_camera")
        )
        existing_gate_device = gate_device_result.scalar_one_or_none()
        if existing_gate_device is not None:
            if existing_gate_device.parking_lot_id != gate_lot.id:
                existing_gate_device.parking_lot_id = gate_lot.id
            gate_device = existing_gate_device
        else:
            gate_device = Device(
                id=uuid.uuid7(),
                parking_lot_id=gate_lot.id,
                type="gate_camera",
                name="開発用カメラ-本町",
            )
            session.add(gate_device)
            await session.flush()

        if nakanoshima_lot is not None:
            overhead_device_result = await session.execute(
                select(Device).where(Device.type == "overhead_camera")
            )
            existing_overhead_device = overhead_device_result.scalar_one_or_none()
            if existing_overhead_device is not None:
                if existing_overhead_device.parking_lot_id != nakanoshima_lot.id:
                    existing_overhead_device.parking_lot_id = nakanoshima_lot.id
            else:
                overhead_device = Device(
                    id=uuid.uuid7(),
                    parking_lot_id=nakanoshima_lot.id,
                    type="overhead_camera",
                    name="開発用俯瞰カメラ-中之島",
                )
                session.add(overhead_device)
                await session.flush()

        detection_result = await session.execute(
            select(CameraDetection).where(CameraDetection.device_id == gate_device.id).limit(1)
        )
        existing_detection = detection_result.scalar_one_or_none()
        if existing_detection is None:
            detection = CameraDetection(
                id=uuid.uuid7(),
                parking_lot_id=gate_device.parking_lot_id,
                device_id=gate_device.id,
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
