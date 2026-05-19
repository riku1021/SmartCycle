"""LEGO Mindstorms EV3 と Bluetooth (Classic) で接続し、

ポート 1 / 2 / 3 に取り付けたタッチセンサーの押下個数に応じて
SmartCycle バックエンドの駐輪場ステータスをリアルタイム更新する常駐スクリプト。

押下個数 (= 駐輪中の自転車台数) と空き状況の対応:
  - 0 個押下 -> available_count=3 (空きあり)
  - 1 個押下 -> available_count=2 (空きあり)
  - 2 個押下 -> available_count=1 (空きあり、残りわずか)
  - 3 個押下 -> available_count=0 (空きなし)

事前準備:
  1. PC と EV3 を OS の Bluetooth 設定でペアリングしておく
  2. `pip install ev3-dc requests`
  3. EV3 のポート 1 / 2 / 3 にタッチセンサーを接続
  4. SmartCycle バックエンドを起動 (docker compose 利用時はホストから http://localhost:8000 が一般的)

実行:
  python ev3_touch_monitor.py

必要に応じて環境変数で挙動を変更可能:
  EV3_MAC            EV3 の Bluetooth MAC アドレス (例: "00:16:53:82:75:10")
  PARKING_LOT_ID     更新対象の駐輪場 ID (デフォルト: 1 = 梅田ステーション東)
  API_BASE_URL       SmartCycle バックエンドのベース URL (デフォルト: http://localhost:8000)
  POLL_INTERVAL_SEC  タッチセンサーの監視間隔 (秒、デフォルト 0.1)
"""

from __future__ import annotations

import os
import sys
import time
from typing import TYPE_CHECKING

import ev3_dc as ev3
import requests

if TYPE_CHECKING:
    from collections.abc import Iterable

EV3_MAC: str = os.environ.get("EV3_MAC", "00:16:53:82:75:10")
PARKING_LOT_ID: int = int(os.environ.get("PARKING_LOT_ID", "1"))
API_BASE_URL: str = os.environ.get("API_BASE_URL", "http://localhost:8000").rstrip("/")
POLL_INTERVAL_SEC: float = float(os.environ.get("POLL_INTERVAL_SEC", "0.1"))

TOTAL_SLOTS: int = 3

TOUCH_PORTS: tuple[int, int, int] = (
    ev3.PORT_1,
    ev3.PORT_2,
    ev3.PORT_3,
)


def status_label_from_available(available_count: int) -> str:
    """available_count から表示用ラベルへ変換 (ログ表示用)."""
    if available_count <= 0:
        return "空きなし"
    if available_count == 1:
        return "空きあり、残りわずか"
    return "空きあり"


def post_parking_status(available_count: int) -> None:
    """SmartCycle バックエンドへ最新の空き台数を送信する."""
    url = f"{API_BASE_URL}/api/iot/parking-status"
    payload = {
        "parking_lot_id": PARKING_LOT_ID,
        "available_count": available_count,
    }
    try:
        response = requests.post(url, json=payload, timeout=3.0)
        response.raise_for_status()
    except requests.RequestException as err:
        print(f"[WARN] API 送信失敗: {err}", file=sys.stderr)


def count_pressed(touch_sensors: Iterable[ev3.Touch]) -> int:
    """各ポートのタッチセンサーで押下中の個数を返す."""
    return sum(1 for sensor in touch_sensors if sensor.touched)


def main() -> int:
    print(
        f"EV3 ({EV3_MAC}) に Bluetooth 接続します。"
        f"対象駐輪場 ID={PARKING_LOT_ID}, バックエンド={API_BASE_URL}"
    )
    print("Ctrl+C で終了します。")

    with ev3.EV3(protocol=ev3.BLUETOOTH, host=EV3_MAC) as ev3_hub:
        touch_sensors = [ev3.Touch(port, ev3_obj=ev3_hub) for port in TOUCH_PORTS]

        last_count: int | None = None
        try:
            while True:
                pressed = count_pressed(touch_sensors)
                # 初回または押下数が変わったときだけ POST（起動直後に現在状態を登録）
                if last_count is None or pressed != last_count:
                    available = max(TOTAL_SLOTS - pressed, 0)
                    label = status_label_from_available(available)
                    print(
                        f"押下数 {pressed}/{TOTAL_SLOTS} -> available_count={available} ({label})"
                    )
                    post_parking_status(available)
                    last_count = pressed
                time.sleep(POLL_INTERVAL_SEC)
        except KeyboardInterrupt:
            print("\n停止しました。")
            return 0


if __name__ == "__main__":
    sys.exit(main())
