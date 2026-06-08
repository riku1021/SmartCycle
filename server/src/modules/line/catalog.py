"""IoT 連携用の駐輪場メタデータ（整数 ID）."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ParkingLotMeta:
    id: int
    name: str
    total_spots: int
    default_available: int
    alternative_ids: tuple[int, ...]


# フロントの地図・EV3 スクリプトと同じ ID 体系
PARKING_LOTS: dict[int, ParkingLotMeta] = {
    1: ParkingLotMeta(
        id=1,
        name="グランフロント",
        total_spots=3,
        default_available=3,
        alternative_ids=(2, 4),
    ),
    2: ParkingLotMeta(
        id=2,
        name="本町サイクルデッキ",
        total_spots=28,
        default_available=3,
        alternative_ids=(1, 4),
    ),
    4: ParkingLotMeta(
        id=4,
        name="北浜サイクルポート",
        total_spots=30,
        default_available=12,
        alternative_ids=(1, 2),
    ),
}


def get_lot_meta(parking_lot_id: int) -> ParkingLotMeta | None:
    return PARKING_LOTS.get(parking_lot_id)
