# =============================================================================
# マルチステージビルド対応統合Dockerfile
# 開発環境・本番環境の両方に対応
# =============================================================================

# ベースステージ：共通設定
FROM node:24-slim@sha256:06e5c9f86bfa0aaa7163cf37a5eaa8805f16b9acb48e3f85645b09d459fc2a9f AS base

# pnpmのインストール
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# パッケージ関連ファイルのコピー（依存関係のレイヤーキャッシュを活用）
COPY client/package.json client/pnpm-lock.yaml client/pnpm-workspace.yaml ./

# =============================================================================
# 開発環境ステージ
# =============================================================================
FROM base AS development

# 開発用依存関係インストール（devDependenciesも含む）
RUN pnpm install

# アプリケーションコードのコピー
COPY client/ .

# 開発サーバーのポート
EXPOSE 3000

# 開発サーバー起動
CMD ["pnpm", "dev"]

# =============================================================================
# ビルドステージ
# =============================================================================
FROM base AS build

# ビルド用の依存関係をインストール（全依存関係）
RUN pnpm install --frozen-lockfile

# ソースコードのコピー
COPY client/ .

# compose の build args から Vite の環境変数を受け取る
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 本番用ビルド実行
RUN pnpm build

# =============================================================================
# 本番環境ステージ
# =============================================================================
FROM node:24-slim@sha256:06e5c9f86bfa0aaa7163cf37a5eaa8805f16b9acb48e3f85645b09d459fc2a9f AS production

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
