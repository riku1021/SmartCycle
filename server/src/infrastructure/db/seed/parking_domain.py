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
            # 駐輪場が既に存在するか確認
            existing = await session.execute(select(ParkingLot).limit(1))
            if existing.first() is not None:
                logger.info("駐輪場関連データは既に投入済みのためスキップしました")
                return

            now = datetime.now(UTC).replace(tzinfo=None)

            # 駐輪場の追加
            lots_data = [
                ("グランフロント大阪 南館 駐輪場", 34.7042, 135.4946, 200, 100),
                ("ヨドバシ梅田タワー 駐輪場", 34.7061, 135.4962, 150, 150),
                ("大阪ステーションシティ 駐輪場", 34.7028, 135.4950, 100, 200),
                ("梅田スカイビル 駐輪場", 34.7051, 135.4897, 80, 150),
            ]
            lots = []
            for name, lat, lng, spots, price in lots_data:
                lot = ParkingLot(
                    id=uuid.uuid4(),
                    name=name,
                    latitude=lat,
                    longitude=lng,
                    total_spots=spots,
                    price_per_hour=price,
                )
                session.add(lot)
                lots.append(lot)
            await session.flush()

            # 駐輪場ステータスの追加
            statuses_data = [
                (lots[0].id, 180, lots[0].total_spots),  # 空き多数
                (lots[1].id, 2, lots[1].total_spots),  # ほぼ満車
                (lots[2].id, 45, lots[2].total_spots),  # 半分空き
                (lots[3].id, 0, lots[3].total_spots),  # 満車
            ]
            for lot_id, available, total in statuses_data:
                session.add(
                    ParkingStatus(
                        parking_lot_id=lot_id,
                        available_spots=available,
                        is_full=(available == 0 or available < total * 0.05),
                    )
                )

            # デバイスの追加（1つは正常、1つは異常＝古すぎる）
            session.add(
                Device(
                    parking_lot_id=lots[0].id,
                    type="camera",
                    name="カメラ1",
                    last_seen_at=now - timedelta(minutes=5),  # 正常
                )
            )
            session.add(
                Device(
                    parking_lot_id=lots[1].id,
                    type="sensor",
                    name="センサー1",
                    last_seen_at=now - timedelta(days=2),  # 異常（古い）
                )
            )

            await session.commit()
            logger.info("ダッシュボード検証用のデータを投入しました")
        except Exception:
            await session.rollback()
            raise
