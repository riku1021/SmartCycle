import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.infrastructure.db.models.device import Device
from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.parking_status import ParkingStatus
from src.infrastructure.logger.logger import logger


async def seed_parking_domain(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """ダッシュボード検証用の駐輪場、ステータス、デバイスを冪等に投入する。"""
    async with session_maker() as session:
        try:
            now = datetime.now(UTC).replace(tzinfo=None)

            lots_data = [
                ("グランフロント", 34.7044, 135.4946, 3, 100, 3),
                ("中之島ゲート", 34.7061, 135.4962, 150, 150, 2),
                ("本町サイクルデッキ", 34.7028, 135.4950, 100, 200, 45),
            ]

            legacy_lot_result = await session.execute(
                select(ParkingLot).where(ParkingLot.name == "梅田ステーション東")
            )
            legacy_lot = legacy_lot_result.scalar_one_or_none()
            if legacy_lot is not None:
                legacy_lot.name = "グランフロント"
                legacy_lot.latitude = 34.7044
                legacy_lot.longitude = 135.4946
                legacy_lot.total_spots = 3

            lots_by_name: dict[str, ParkingLot] = {}
            inserted_lots = 0
            inserted_statuses = 0
            inserted_devices = 0

            for name, lat, lng, spots, price, _available in lots_data:
                existing_lot = await session.execute(
                    select(ParkingLot).where(ParkingLot.name == name)
                )
                lot = existing_lot.scalar_one_or_none()
                if lot is not None:
                    if lot.total_spots != spots or lot.latitude != lat or lot.longitude != lng:
                        lot.total_spots = spots
                        lot.latitude = lat
                        lot.longitude = lng
                    lots_by_name[name] = lot
                    continue

                lot = ParkingLot(
                    id=uuid.uuid4(),
                    name=name,
                    latitude=lat,
                    longitude=lng,
                    total_spots=spots,
                    price_per_hour=price,
                )
                session.add(lot)
                lots_by_name[name] = lot
                inserted_lots += 1
            await session.flush()

            for name, _lat, _lng, _spots, _price, available in lots_data:
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
                    lots_by_name["グランフロント"].id,
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
