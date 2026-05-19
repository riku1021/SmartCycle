# SmartCycle

フロントエンドの詳細は [client/README.md](client/README.md)、バックエンドは [server/README.md](server/README.md) を参照してください。

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

YOLOv8 を使ってカメラ映像から自転車を検出します。

### 手動確認手順

1. プロジェクトルートで起動

```sh
docker-compose up
```

2. ブラウザで `http://localhost:3000` を開き、カメラ画面に移動

3. カメラに自転車を映す

4. 以下のエンドポイントで検出結果を確認

```sh
curl http://localhost:8000/camera/detections/latest
```

以下のようなレスポンスが返れば成功：

```json
{
  "detected_count": 1,
  "boxes": [
    {
      "x": 139.5,
      "y": 195.8,
      "width": 385.8,
      "height": 225.2,
      "label": "bicycle",
      "score": 0.88
    }
  ],
  "received_at": "2026-05-12T01:47:05.446836+00:00",
  "content_type": "image/jpeg",
  "size_bytes": 64450
}
```

### 関連ファイル

- `src/modules/camera/api.py` — エンドポイント定義
- `src/modules/camera/service.py` — YOLOv8 推論ロジック

### TODO

- DB永続化（`camera_detections` テーブルへの書き込み）
- モデル差し替え（`service.py` の `_MODEL_PATH` を変更）
- 認証/署名検証強化