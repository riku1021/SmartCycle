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
