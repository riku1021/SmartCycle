"""駐輪場ステータスに応じた LINE 通知文面."""


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
