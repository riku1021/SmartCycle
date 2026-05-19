"""駐輪場ステータスに応じた LINE 通知文面."""

from src.modules.line.catalog import PARKING_LOTS, ParkingLotMeta


def build_few_spots_message(lot_name: str) -> str:
    return f"【SmartCycle】{lot_name}\n空きが残りわずかです！\nお早めのご利用をおすすめします。"


def build_full_message(
    lot_name: str,
    recommendations: list[tuple[str, int, int]],
) -> str:
    lines = [
        f"【SmartCycle】{lot_name}",
        "満車です。",
        "",
        "近くのおすすめ駐輪場:",
    ]
    if recommendations:
        for name, available, total in recommendations:
            lines.append(f"・{name}（空き {available}/{total} 台）")
    else:
        lines.append("・現在、近隣に十分な空きがある駐輪場は見つかりませんでした。")
    return "\n".join(lines)


def pick_recommendations(
    source_lot: ParkingLotMeta,
    available_by_lot_id: dict[int, int],
) -> list[tuple[str, int, int]]:
    """代替駐輪場のうち空きがあるものを、空き台数の多い順に返す."""
    candidates: list[tuple[str, int, int]] = []
    for alt_id in source_lot.alternative_ids:
        alt_meta = PARKING_LOTS.get(alt_id)
        if alt_meta is None:
            continue
        available = available_by_lot_id.get(alt_id, alt_meta.default_available)
        if available > 0:
            candidates.append((alt_meta.name, available, alt_meta.total_spots))
    candidates.sort(key=lambda item: item[1], reverse=True)
    return candidates
