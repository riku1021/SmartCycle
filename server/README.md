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

設定は **`envs/.env`** から読み込みます。テンプレートは [`envs/.env.example`](./envs/.env.example) です。
