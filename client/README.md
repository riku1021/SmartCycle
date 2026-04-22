# SmartCycle（フロントエンド）

Vite + React + TypeScript。ルーティングは TanStack Router、品質管理に Biome を使います。

## 開発方針（`src/` 以下）

- **`routes/`** — ページ単位のルート。ディレクトリとファイルをここに追加し、画面（ルート定義）を置く。
- **`components/`** — 複数画面で使う UI・共通部品。画面専用の部品は、該当 `routes/...` 近くに切ってもよい。

## 依存関係のインストール

```sh
pnpm install
```

## 主なスクリプト

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー起動（既定ポートは `vite.config` に準拠） |
| `pnpm build` | 型検査（`tsc -b`）のあと本番ビルド |
| `pnpm lint` / `pnpm fix` | Biome によるチェック／自動修正 |
| `pnpm test` | Vitest |

## 環境変数

雛形は [`envs/.env.example`](./envs/.env.example) です。API のベース URL 等は `VITE_*` を参照（詳細はリポジトリルートの README および `src/config/env.ts`）。

## 認証

- バックエンドの `POST /auth/signup`・`POST /auth/login` で JWT を受け取り、[`src/lib/apiClient.ts`](./src/lib/apiClient.ts) の `setAccessToken` で `localStorage` に保存して以降のリクエストに付与します。
- 画面は [`src/routes/login/`](./src/routes/login/) など。`GET /auth/me` でログイン状態を確認できます。

## リポジトリ全体

Docker の起動手順・URL は、リポジトリルートの [README.md](../README.md) を参照してください。
