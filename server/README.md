# SmartCycle（バックエンド）

FastAPI。パッジョン管理に **uv** を使います。

## 開発方針（`src/` 以下）

- **`modules/<機能名>/`** — 機能ごとにディレクトリを切る。
- **`api.py`** — そのモジュールの HTTP（ルート、リクエスト／レスポンス型）。
- **`service.py`** — ロジック。`api` から呼び出す。

共有の設定は `infrastructure/config`、HTTP 層の例外処理は `infrastructure/http` など、用途別のディレクトリにまとまっています。

## 依存関係のインストール

リポジトリルートで mise を揃えたうえで、本ディレクトリで次を実行します。

```sh
uv sync
```

`pyproject.toml` を更新した直後は **`uv lock` を再実行**して `uv.lock` を揃えてから `uv sync` してください。

## データベース（PostgreSQL）

- 接続 URL は **`DATABASE_URL`**（例: `postgresql+asyncpg://user:pass@host:5432/dbname`）。非同期接続用に **`+asyncpg`** を使います。
- スキーマ変更は **Alembic**（`alembic/`、`alembic.ini`）。例:

```sh
# server をカレントに、DATABASE_URL を export してから
uv run alembic -c alembic.ini upgrade head
```

## 認証 API（例）

- `POST /auth/signup` — 新規登録
- `POST /auth/login` — ログイン（JWT 発行）
- `GET /auth/me` — 現在ユーザー（`Authorization: Bearer`）

設定は **`envs/.env`** から読み込みます。テンプレートは [`envs/.env.example`](./envs/.env.example) です。少なくとも **`DATABASE_URL` と `JWT_SECRET`** が必要です。
