# SmartCycle データベース設計

## 1. 概要

| テーブル | 説明 |
| :--- | :--- |
| **users** | 利用者情報 |
| **parking_lots** | 駐輪場マスタ |
| **devices** | IoT 機器（カメラ／センサー） |
| **camera_detections** | カメラによる物体検出履歴 |
| **parking_statuses** | 駐輪場の最新ステータス |
| **parking_status_histories** | 駐輪場の空き状況履歴 |
| **reservations** | 利用予約 |

## 2. テーブル定義

### 2.1 users（ユーザー）

既存の実装を継承。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| name | VARCHAR(255) | NOT NULL | ユーザー名 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| password_hash | VARCHAR(255) | NOT NULL | ハッシュ化されたパスワード |

### 2.2 parking_lots（駐輪場マスタ）

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| name | VARCHAR(255) | NOT NULL | 駐輪場名 |
| latitude | DOUBLE PRECISION | NOT NULL | 緯度 |
| longitude | DOUBLE PRECISION | NOT NULL | 経度 |
| total_spots | INTEGER | NOT NULL | 総収容台数 |
| price_per_hour | INTEGER | NOT NULL | 時間単価（円） |
| created_at | TIMESTAMP | DEFAULT NOW() | 登録日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### 2.3 devices（デバイス）

駐輪場に設置されるカメラやセンサー。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| parking_lot_id | UUID | FK(parking_lots) | 設置場所 |
| type | VARCHAR(50) | NOT NULL | `camera`, `sensor` 等 |
| name | VARCHAR(255) | | デバイス名称 |
| secret_key | VARCHAR(255) | | デバイス認証用トークン |
| last_seen_at | TIMESTAMP | | 最終通信確認日時 |

### 2.4 camera_detections（カメラ検出履歴）

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| parking_lot_id | UUID | FK(parking_lots) | 駐輪場 ID |
| device_id | UUID | FK(devices) | 送信元デバイス |
| detected_count | INTEGER | NOT NULL | 検知された自転車数 |
| detection_data | JSONB | | 座標などの詳細データ |
| image_url | VARCHAR(255) | | 画像 URL／パス |
| created_at | TIMESTAMP | DEFAULT NOW(), INDEX | 検知日時 |

### 2.5 parking_statuses（最新ステータス）

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| parking_lot_id | UUID | FK(parking_lots), UNIQUE | 駐輪場 ID |
| available_spots | INTEGER | NOT NULL | 現在の空き台数 |
| is_full | BOOLEAN | NOT NULL | 満車フラグ |
| updated_at | TIMESTAMP | DEFAULT NOW() | 最終更新日時 |

### 2.6 parking_status_histories（ステータス履歴）

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| parking_lot_id | UUID | FK(parking_lots) | 駐輪場 ID |
| available_spots | INTEGER | NOT NULL | 空き台数 |
| timestamp | TIMESTAMP | DEFAULT NOW(), INDEX | 記録日時 |

### 2.7 reservations（予約）

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | UUIDv7 |
| user_id | UUID | FK(users) | ユーザー ID |
| parking_lot_id | UUID | FK(parking_lots) | 駐輪場 ID |
| start_time | TIMESTAMP | NOT NULL | 開始予定時刻 |
| end_time | TIMESTAMP | NOT NULL | 終了予定時刻 |
| status | VARCHAR(50) | NOT NULL | `reserved`, `active`, `completed`, `cancelled` |
| total_amount | INTEGER | | 利用料金合計 |
| created_at | TIMESTAMP | DEFAULT NOW() | 予約作成日時 |

## 3. 実装参照（リポジトリ内）

| 種別 | パス |
| :--- | :--- |
| Alembic（駐輪場ドメイン） | [server/alembic/versions/20260511_0002_add_parking_domain_tables.py](../server/alembic/versions/20260511_0002_add_parking_domain_tables.py) |
| Alembic（users） | [server/alembic/versions/20260422_0001_create_users_table.py](../server/alembic/versions/20260422_0001_create_users_table.py) |
| SQLAlchemy モデル | [server/src/infrastructure/db/models/](../server/src/infrastructure/db/models/) |

実装では `parking_status_histories.timestamp` に対応する ORM 属性名は `recorded_at` です。`reservations` には `end_time > start_time` および `status` の許容値を限定する CHECK 制約が付与されています。

## 4. DB マイグレーション（Alembic）

設定ファイルは [server/alembic.ini](../server/alembic.ini)、環境スクリプトは [server/alembic/env.py](../server/alembic/env.py) です。`DATABASE_URL` は **`postgresql+asyncpg://` で指定して問題ありません**（Alembic 実行時に同期ドライバ `postgresql+psycopg://` へ置き換えられます）。

作業ディレクトリは **`server/`** を前提とします。仮想環境を使う場合は `.venv/bin/alembic`、プロジェクトで `uv` を使う場合は `uv run alembic` を読み替えてください。

### 4.1 よく使うコマンド

PostgreSQL が起動している状態で、接続文字列を環境変数にセットして実行します（値は環境に合わせて変更してください）。

```bash
cd server
export DATABASE_URL='postgresql+asyncpg://smartcycle:smartcycle@127.0.0.1:5432/smartcycle'
```

| 目的 | コマンド |
| :--- | :--- |
| 最新リビジョンまで適用 | `alembic upgrade head` |
| 1 つ前のリビジョンに戻す | `alembic downgrade -1` |
| 特定リビジョンまで適用 | `alembic upgrade <revision_id>`（例: `alembic upgrade 20260511_0002`） |
| 特定リビジョンまで戻す | `alembic downgrade <revision_id>`（例: `alembic downgrade 20260422_0001`） |
| 現在の DB バージョン表示 | `alembic current` |
| 履歴一覧 | `alembic history` |

実行例（リポジトリ直下の `.venv` を使う場合）:

```bash
cd server
DATABASE_URL='postgresql+asyncpg://smartcycle:smartcycle@127.0.0.1:5432/smartcycle' \
  .venv/bin/alembic upgrade head
```

### 4.2 Docker Compose 利用時

[docker-compose.yml](../docker-compose.yml) の `backend` サービスは起動時に `alembic upgrade head` を実行する設定になっています。ホストから手動でマイグレーションする場合は、`postgres` をポート公開したうえで `127.0.0.1`（または `localhost`）向けの `DATABASE_URL` を指定してください。コンテナ内から実行する場合はホスト名に `postgres` を使います。
