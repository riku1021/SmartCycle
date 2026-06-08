# SmartCycle

フロントエンドの詳細は [client/README.md](client/README.md)、バックエンドは [server/README.md](server/README.md) を参照してください。

ローカル開発・動作確認で使うテストアカウント（管理者 / 開発者 / エンドユーザー）は [docs/ACCOUNTS.md](docs/ACCOUNTS.md) にまとめています。

## セットアップ

[mise](https://mise.jdx.dev/) が未導入なら、[公式のインストール手順](https://mise.jdx.dev/installing-mise.html)（[Getting Started](https://mise.jdx.dev/getting-started.html) など）から自分の環境に合う方法を選んで入れてください。

リポジトリルートで mise を使う。`mise install` のあと **mise の Python と uv の Python を揃える**（[`mise sync python --uv`](https://mise.jdx.dev/cli/sync/python.html#uv)）と、タスク `install-deps`（内部でも同じ同期を実行）が走り、`client` と `server` で依存関係のインストールまで進みます。

```sh
mise install
mise sync python --uv
```


依存関係の同期を実行する場合は次のとおり。

~/clientで実行

```sh
pnpm install
```

~/serverで実行（インタプリタは uv 経由。ルートで mise を使うので先に `mise sync python --uv` を実行）

```sh
uv sync
```

### サーバー（`server/envs/.env`）

バックエンドは **`server/envs/.env`** から設定を読み込みます。テンプレートは [`server/envs/.env.example`](server/envs/.env.example) です。

フロントエンドも `.env` ベースに統一します。（雛形は [`client/envs/.env.example`](client/envs/.env.example)）。

## アプリの起動
プロジェクトルートで実行
```sh
docker-compose up --build
```

開発・検証用シードは `users` → `parking_lots` → `reservations` の順に投入します。`reservations` は `parking_lots` の UUID を参照するため、駐輪場マスタが未投入の場合は予約シードのみスキップされます。

### アクセス URL（フロントエンド）

| 環境 | URL |
| --- | --- |
| フロントエンド | [http://localhost:3000/](http://localhost:3000/) |
| フロントエンド | [http://localhost:8000/](http://localhost:8000/) |

## アプリのシャットダウン
プロジェクトルートで実行
```sh
docker-compose down
```

## カメラ検出機能（自転車検出）

YOLOv8 を使ってカメラ映像から自転車を検出します。ゲートカメラと俯瞰カメラの2種類があります。

### ゲートカメラ（入退場検知）

ゲートに設置し、トリップワイヤーで自転車の通過を検知して空き台数を ±1 更新します。

1. プロジェクトルートで起動

```sh
docker-compose up
```

2. ブラウザで `http://localhost:3000/gate-camera` を開く

3. カメラに自転車を映し、中央の赤いラインを通過させる

4. 検出結果を確認

```sh
curl http://localhost:8000/gate-camera/detections/latest
```

### 俯瞰カメラ（台数カウント）

駐輪場内を俯瞰し、フレーム内の自転車台数から空き台数を直接更新します（`available_spots = total_spots - detected_count`）。

1. ブラウザで `http://localhost:3000/overhead-camera` を開く

2. 駐輪場内の自転車を映す

3. 検出結果と空き台数を確認

```sh
curl http://localhost:8000/overhead-camera/detections/latest
curl http://localhost:8000/api/parking-lots
```

### 注意

ゲートカメラ（trip ±1）と俯瞰カメラ（直接上書き）は同一駐輪場の `parking_statuses` を共有します。開発時はどちらか一方の画面のみ使用してください。

### 関連ファイル

- `server/src/modules/gate_camera/api.py` — ゲートカメラ API
- `server/src/modules/overhead_camera/api.py` — 俯瞰カメラ API
- `server/src/modules/camera/service.py` — YOLOv8 推論ロジック（共通）

### TODO

- モデル差し替え（`service.py` の `_MODEL_PATH` を変更）
- 認証/署名検証強化