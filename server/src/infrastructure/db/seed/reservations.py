"""開発・検証用の予約データを冪等に投入するシード処理。"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.models.reservation import Reservation
from src.infrastructure.db.models.user import User
from src.infrastructure.logger.logger import logger


@dataclass(frozen=True)
class _SeedReservation:
    parking_lot_name: str
    start_time: datetime
    end_time: datetime
    status: str
    total_amount: int | None


_RESERVATION_USER_EMAIL = "user@mail.com"

_SEED_RESERVATIONS: tuple[_SeedReservation, ...] = (
    _SeedReservation(
        parking_lot_name="梅田ステーション東",
        start_time=datetime(2026, 5, 12, 9, 30),
        end_time=datetime(2026, 5, 12, 11, 30),
        status="active",
        total_amount=200,
    ),
    _SeedReservation(
        parking_lot_name="中之島ゲート",
        start_time=datetime(2026, 5, 13, 17, 30),
        end_time=datetime(2026, 5, 13, 18, 30),
        status="reserved",
        total_amount=120,
    ),
    _SeedReservation(
        parking_lot_name="中之島ゲート",
        start_time=datetime(2026, 4, 21, 12, 0),
        end_time=datetime(2026, 4, 21, 13, 0),
        status="cancelled",
        total_amount=None,
    ),
    _SeedReservation(
        parking_lot_name="本町サイクルデッキ",
        start_time=datetime(2026, 4, 20, 9, 0),
        end_time=datetime(2026, 4, 20, 11, 0),
        status="completed",
        total_amount=300,
    ),
    _SeedReservation(
        parking_lot_name="梅田ステーション東",
        start_time=datetime(2026, 4, 18, 13, 20),
        end_time=datetime(2026, 4, 18, 14, 20),
        status="completed",
        total_amount=120,
    ),
)


async def seed_reservations(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """予約管理画面のモック相当データを冪等に投入する。

    - user@mail.com を対象に投入
    - 駐輪場マスタが未投入の場合、予約投入はスキップ
    - 同一 user・同一期間の予約があればスキップ
    """
    async with session_maker() as session:
        try:
            inserted = await _seed_reservations(session)
            if inserted:
                await session.commit()
                logger.info(f"予約シードを投入しました: count={inserted}")
            else:
                logger.info("予約シードは投入済み、または依存データ未投入のためスキップしました")
        except Exception:
            await session.rollback()
            raise


async def _seed_reservations(session: AsyncSession) -> int:
    user_result = await session.execute(select(User).where(User.email == _RESERVATION_USER_EMAIL))
    user = user_result.scalar_one_or_none()
    if user is None:
        logger.warning(
            f"予約シード対象ユーザーが見つからないためスキップしました: email={_RESERVATION_USER_EMAIL}"
        )
        return 0

    required_lot_names = {seed.parking_lot_name for seed in _SEED_RESERVATIONS}
    lots_result = await session.execute(
        select(ParkingLot).where(ParkingLot.name.in_(required_lot_names))
    )
    parking_lots = {lot.name: lot for lot in lots_result.scalars()}

    missing_lot_names = sorted(required_lot_names - parking_lots.keys())
    if missing_lot_names:
        logger.warning(
            "予約シードに必要な駐輪場が見つからないためスキップしました: "
            f"missing_lot_names={missing_lot_names}"
        )
        return 0

    inserted = 0
    for seed in _SEED_RESERVATIONS:
        parking_lot = parking_lots[seed.parking_lot_name]
        existing = await session.execute(
            select(Reservation).where(
                Reservation.user_id == user.id,
                Reservation.start_time == seed.start_time,
                Reservation.end_time == seed.end_time,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        session.add(
            Reservation(
                user_id=user.id,
                parking_lot_id=parking_lot.id,
                start_time=seed.start_time,
                end_time=seed.end_time,
                status=seed.status,
                total_amount=seed.total_amount,
            )
        )
        inserted += 1

    return inserted
