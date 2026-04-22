# SmartCycle

## セットアップ

[mise](https://mise.jdx.dev/) が未導入なら、[公式のインストール手順](https://mise.jdx.dev/installing-mise.html)（[Getting Started](https://mise.jdx.dev/getting-started.html) など）から自分の環境に合う方法を選んで入れてください。

リポジトリルートで mise を使う。`mise install` のあと **mise の Python と uv の Python を揃える**（[`mise sync python --uv`](https://mise.jdx.dev/cli/sync/python.html#uv)）と、タスク `install-deps`（内部でも同じ同期を実行）が走り、`client` と `server` で依存関係のインストールまで進みます。

```sh
mise install
mise sync python --uv
```

`postinstall` で `install-deps` が走る場合も、タスク先頭で `mise sync python --uv` が実行されます。Python のパッチ版は `server/.python-version` とルート `.mise.toml` の `python` で揃えています。

依存関係だけ入れ直したいときは次でも同じ内容になる。

```sh
mise run install-deps
```

手動で分けて実行する場合は次のとおり。

~/clientで実行

```sh
pnpm install
```

~/serverで実行（インタプリタは uv 経由。ルートで mise を使うなら先に `mise sync python --uv` を推奨）

```sh
uv sync
```

### サーバー（`server/envs/.env`）

バックエンドは **`server/envs/.env`** から設定を読み込みます。テンプレートは [`server/envs/.env.example`](server/envs/.env.example) です。

`docker compose` 利用時は、`docker-compose.yml` の `env_file: ./server/envs/.env` で同じファイルがコンテナに渡ります。Firebase 鍵ファイルは compose の `volumes` でコンテナ内パスと一致させてください。

フロントエンドも `.env` ベースに統一します。ルートの `.env` に `VITE_API_BASE_URL` を定義してください（雛形は [`client/envs/.env.example`](client/envs/.env.example)）。

## アプリの起動

リポジトリルートで `.env` の設定を読んで起動します。

```sh
docker-compose up --build
```

### アクセス URL（フロントエンド）

| 環境 | URL |
| --- | --- |
| 開発相当（`.env` 既定値） | [http://localhost:3000/](http://localhost:3000/) |
| 本番相当（`.env` を prod 用に変更） | [http://localhost:4173/](http://localhost:4173/) |

バックエンド API は `http://localhost:8000`（コンテナ内はいずれも 8000 番で待ち受け、ホスト側の公開ポートが上記のとおり）。

終了するときは同じディレクトリで `down` します。

```sh
docker-compose down
```
