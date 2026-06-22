import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.infrastructure.db.models.device import Device
from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.logger.logger import logger

EV3_LOT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
EV3_LOT_NAME = "梅田ステーション東"


async def _ensure_ev3_parking_lot(session: AsyncSession) -> ParkingLot:
    """EV3 連携用駐輪場を固定 UUID で冪等に確保する。"""
    lot = await session.get(ParkingLot, EV3_LOT_ID)
    if lot is not None:
        lot.name = EV3_LOT_NAME
        lot.latitude = 34.70631
        lot.longitude = 135.49887
        lot.total_spots = 3
        lot.price_per_hour = 100
        lot.availability_source_type = "touch_sensor"
        return lot

    name_collision = await session.execute(
        select(ParkingLot).where(ParkingLot.name == EV3_LOT_NAME)
    )
    existing_by_name = name_collision.scalar_one_or_none()
    if existing_by_name is not None:
        existing_by_name.name = f"{EV3_LOT_NAME} (legacy)"

    legacy_lot = await session.execute(
        select(ParkingLot).where(ParkingLot.name == "グランフロント")
    )
    legacy = legacy_lot.scalar_one_or_none()
    if legacy is not None and legacy.id != EV3_LOT_ID:
        legacy.name = "グランフロント (legacy)"

    lot = ParkingLot(
        id=EV3_LOT_ID,
        name=EV3_LOT_NAME,
        latitude=34.70631,
        longitude=135.49887,
        availability_source_type="touch_sensor",
        total_spots=3,
        price_per_hour=100,
    )
    session.add(lot)
    await session.flush()
    return lot


async def seed_parking_domain(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """ダッシュボード検証用の駐輪場、ステータス、デバイスを冪等に投入する。"""
    async with session_maker() as session:
        try:
            now = datetime.now(UTC).replace(tzinfo=None)

            lots_data = [
                ("グランフロント大阪 南館 駐輪場", 34.7042, 135.4946, 200, 100, 50, "touch_sensor"),
                ("ヨドバシ梅田タワー 駐輪場", 34.7061, 135.4962, 150, 150, 30, "touch_sensor"),
                ("大阪ステーションシティ 駐輪場", 34.7028, 135.4950, 100, 200, 20, "touch_sensor"),
                ("梅田スカイビル 駐輪場", 34.7051, 135.4897, 80, 150, 10, "touch_sensor"),
                ("梅田ステーション東", 34.70631, 135.49887, 3, 100, 3, "touch_sensor"),
                ("中之島ゲート", 34.69000, 135.49000, 150, 150, 2, "overhead_camera"),
                ("本町サイクルデッキ", 34.68462, 135.50213, 100, 200, 45, "gate_camera"),
            ]

            ev3_lot = await _ensure_ev3_parking_lot(session)

            lots_by_name: dict[str, ParkingLot] = {EV3_LOT_NAME: ev3_lot}
            inserted_lots = 0
            inserted_statuses = 0
            inserted_devices = 0

            for name, lat, lng, spots, price, _available, source_type in lots_data:
                existing_lot = await session.execute(
                    select(ParkingLot).where(ParkingLot.name == name)
                )
                lot = existing_lot.scalar_one_or_none()
                if lot is not None:
                    if (
                        lot.total_spots != spots
                        or lot.latitude != lat
                        or lot.longitude != lng
                        or lot.availability_source_type != source_type
                    ):
                        lot.total_spots = spots
                        lot.latitude = lat
                        lot.longitude = lng
                        lot.availability_source_type = source_type
                    lots_by_name[name] = lot
                    continue

                if name == EV3_LOT_NAME:
                    lots_by_name[name] = ev3_lot
                    continue

                lot = ParkingLot(
                    id=uuid.uuid4(),
                    name=name,
                    latitude=lat,
                    longitude=lng,
                    availability_source_type=source_type,
                    total_spots=spots,
                    price_per_hour=price,
                )
                session.add(lot)
                lots_by_name[name] = lot
                inserted_lots += 1
            await session.flush()

            for name, _lat, _lng, _spots, _price, available, _source_type in lots_data:
                lot = lots_by_name[name]
                existing_status = await session.execute(
                    select(ParkingStatus).where(ParkingStatus.parking_lot_id == lot.id)
                )
                if existing_status.scalar_one_or_none() is not None:
                    continue
                session.add(
                    ParkingStatus(
                        parking_lot_id=lot.id,
                        available_spots=available,
                        is_full=(available == 0 or available < lot.total_spots * 0.05),
                    )
                )
                inserted_statuses += 1

            devices_data = [
                (
                    lots_by_name["梅田ステーション東"].id,
                    "camera",
                    "カメラ1",
                    now - timedelta(minutes=5),
                ),
                (lots_by_name["中之島ゲート"].id, "sensor", "センサー1", now - timedelta(days=2)),
            ]
            for lot_id, device_type, device_name, last_seen_at in devices_data:
                existing_device = await session.execute(
                    select(Device).where(
                        Device.parking_lot_id == lot_id,
                        Device.type == device_type,
                        Device.name == device_name,
                    )
                )
                if existing_device.scalar_one_or_none() is not None:
                    continue
                session.add(
                    Device(
                        parking_lot_id=lot_id,
                        type=device_type,
                        name=device_name,
                        last_seen_at=last_seen_at,
                    )
                )
                inserted_devices += 1

            await session.commit()
            if inserted_lots or inserted_statuses or inserted_devices:
                logger.info(
                    "ダッシュボード検証用のデータを投入/補完しました: "
                    f"lots={inserted_lots} statuses={inserted_statuses} devices={inserted_devices}"
                )
            else:
                logger.info("駐輪場関連データは既に最新のためスキップしました")
        except Exception:
            await session.rollback()
            raise
