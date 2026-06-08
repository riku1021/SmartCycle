# scripts

SmartCycle 用の補助スクリプトを置くディレクトリです。

## `ev3_touch_monitor.py`

LEGO Mindstorms EV3 のタッチセンサー (ポート 1 / 2 / 3) を監視し、
押下個数を「駐輪中の自転車台数」とみなして SmartCycle バックエンドに送信します。

### 前提条件

1. PC と EV3 本体を OS の Bluetooth 設定で **事前にペアリング** しておく
2. EV3 のポート 1 / 2 / 3 にタッチセンサーを接続
3. SmartCycle バックエンドを起動しておく (docker compose 利用時はホストから `http://localhost:8000` が一般的)

### インストール

```bash
pip install ev3-dc requests
```

### 実行例

```bash
# 環境変数で EV3 の MAC アドレス等を指定して実行
EV3_MAC=00:16:53:82:75:10 PARKING_LOT_ID=1 python scripts/ev3_touch_monitor.py
```

### 押下個数とステータスの対応

| 押下個数 | `available_count` | バックエンドが返すラベル (例) |
| -------- | ----------------- | ----------------------------- |
| 0        | 3                 | 空きあり                       |
| 1        | 2                 | 空きあり                       |
| 2        | 1                 | 空きあり、残りわずか           |
| 3        | 0                 | 空きなし                       |

### 環境変数

| 変数名             | 説明                                          | デフォルト                |
| ------------------ | --------------------------------------------- | ------------------------- |
| `EV3_MAC`          | EV3 の Bluetooth MAC アドレス                  | `00:16:53:82:75:10`       |
| `PARKING_LOT_ID`   | 更新対象の駐輪場 ID                            | `1` (梅田ステーション東) |
| `API_BASE_URL`     | SmartCycle バックエンドのベース URL            | `http://localhost:8000`   |
| `POLL_INTERVAL_SEC`| タッチセンサーの監視間隔 (秒)                  | `0.1`                     |

### LINE 通知（バックエンド側）

押下数が変わると `POST /api/iot/parking-status` が呼ばれ、バックエンドが LINE Messaging API で通知します。

| 押下個数 | 通知 |
| -------- | ---- |
| 1        | なし |
| 2        | 「空きが残りわずかです！」など |
| 3        | 「満車です」＋近隣のおすすめ駐輪場 |

バックエンドの `server/envs/.env` に以下を設定してください。

- `LINE_CHANNEL_ACCESS_TOKEN` … Messaging API チャネルの**長期**アクセストークン（チャネル ID ではありません）
- `LINE_USE_BROADCAST=true`（デフォルト）… 公式アカウントを友だち追加した**全ユーザー**へ一斉送信

個別ユーザーだけに送りたい開発時は `LINE_USE_BROADCAST=false` と `LINE_NOTIFY_USER_IDS=Uxxx` を指定します。
