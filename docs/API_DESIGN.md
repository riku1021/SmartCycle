# SmartCycle API 設計

フロントエンドが利用する HTTP API の契約を画面単位で整理する。本書は **ドキュメント上の確定案**であり、サーバー実装が未追従の箇所は「設計のみ」と明記する。

**ドキュメントの役割分担**（サーバーから DB に保存する前提を含む）は「2.8 ドキュメントの役割分担」を参照する。テーブル定義・制約の真実は [database-design.md](./database-design.md)、HTTP の入出力と認証は本書の各節、**どの API がどのテーブルにどう書き込むか**は「2.9」「2.10」および必要に応じて各画面の表の備考で固定する。

---

## 1. 画面と API の対応（網羅性チェック用）


| 画面                         | 主に利用する API（パス）                                                                                                               | 備考                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ログイン                       | `POST /auth/signup`, `POST /auth/login`                                                                                      | 実装済み。フロントは現状 `GET /auth/me` を呼ばない（`TokenResponse.user` で足りる）。起動時検証で使う場合は別途接続。                                                                                                                                       |
| マップ                        | `GET /api/parking-lots`（設計のみ）, `GET /api/parking-statuses` または `GET /api/parking-statuses/{parking_lot_id}`（実装済み・移行予定）       | **現状フロントは自社 API 未呼び出し**（駐輪場は静的データ、ルートは外部 OSRM）。通知 UI はクライアントのみ（将来 `GET /api/notifications` を検討可）。                                                                                                                   |
| 駐輪場一覧                      | `GET /api/parking-statuses/{parking_lot_id}`（実装済み）, `GET /api/parking-lots` / `GET /api/parking-lots/{parking_lot_id}`（設計のみ） | 現状フロントは主に `GET /api/parking-statuses/{id}` のみ。一覧画面完成にはマスタ API が必要。                                                                                                                                                  |
| 予約管理                       | `GET /api/reservations/me`, `POST /api/reservations`, `PATCH /api/reservations/{reservation_id}`（設計のみ）                       | **UI は拡張済み**（[client/src/components/reservations/reservations.tsx](../client/src/components/reservations/reservations.tsx): 予約中／履歴タブ、カード、DB 準拠の `status` 表示）。データは **クライアント固定モック**。「地図で確認」「キャンセル」は **スタブ**（API 未接続）。 |
| 設定                         | `GET /auth/me`, `PATCH /auth/me`（設計のみ・プロフィール拡張）                                                                              | 現状は localStorage のみ。表示名等を API 化する案。                                                                                                                                                                                 |
| ダッシュボード                    | `GET /api/dashboard/summary`（実装済み）                                                                                           | admin / dev が利用。                                                                                                                                                                                                    |
| カメラ画像                      | `POST /camera/images`, `GET /camera/detections/latest`（実装済み）                                                                 | dev ロール想定。                                                                                                                                                                                                          |
| 管理者向け（ダッシュボード内「管理」「レポート」等） | `GET /api/dashboard/summary`, `GET /api/admin/reservations`（設計のみ）, `GET /api/admin/devices`（設計のみ）                            | 現状は summary のみ呼び出し。                                                                                                                                                                                                 |


---

## 2. 共通仕様

### 2.1 認証

- クライアントは可能な限り **`Authorization: Bearer <JWT>`** を付与する（アクセストークンはログイン／サインアップ応答の `access_token`）。
- **401 Unauthorized**: トークン未送信・形式不正・期限切れ・ユーザー不存在など。レスポンスボディは後述のエラー形式（例: `{ "detail": "Not authenticated" }`）。
- **公開エンドポイント**（Bearer 不要。実装上も認証チェックをかけない想定）:


| エンドポイント                   | メソッド | 備考                                                          |
| ------------------------- | ---- | ----------------------------------------------------------- |
| `/auth/signup`            | POST | 新規登録                                                        |
| `/auth/login`             | POST | ログイン                                                        |
| `/api/iot/parking-status` | POST | IoT 機器。将来は機器認証（別ヘッダまたはボディトークン）を追加する想定（「2.6 IoT 機器向け認証」を参照）。 |


※ 現行サーバーでは `/api/parking-statuses`, `/api/dashboard/summary`, `/camera/*` に `Depends(get_current_user)` が **未適用** のため、認証なしで応答する。**本設計ではユーザー向け・管理画面向けの読み取り API には Bearer 必須とする**（実装は別 Issue）。

### 2.2 権限（ロール）

ロールは JWT の claim（例: `role`）または `users` テーブル拡張で表現することを想定する。**現状**: DB にロール列はなく、フロントはメール等で `admin` / `dev` / `user` を保持しているのみ。以下は **API 設計上の目標**。


| ロール     | 一般ユーザー API            | dev（カメラ・検証）             | admin（集計・全件）   |
| ------- | --------------------- | ----------------------- | -------------- |
| `user`  | 利用可能（自ユーザー予約・駐輪場参照など） | 不可（カメラ POST 等）          | 不可             |
| `dev`   | 同上                    | カメラ送受信・開発用エンドポイント可      | 不可             |
| `admin` | 同上                    | 可（運用ポリシーで dev と同等扱いでも可） | 管理系一覧・集計 API 可 |


- **403 Forbidden**: 認証済みだがロール不足のとき（本書では `{"detail":"..."}` で統一）。

### 2.3 命名規則

- **URL パス**: kebab-case（例: `/api/parking-statuses`, `/api/dashboard/summary`）。
- **JSON のキー**: snake_case（例: `parking_lot_id`, `short_name`）。既存実装で camelCase が混ざる箇所は「8. ダッシュボード」の応答例および「12. 既知の差分」を参照。

### 2.4 日時

- 日時は **ISO 8601**、UTC を推奨（例: `2026-05-12T01:23:45Z`）。タイムゾーン付きでもよいが、API 間で一貫させる。

### 2.5 エラーレスポンス

- **HTTP 4xx / 5xx** のボディは FastAPI 標準に合わせ、原則 **`{ "detail": ... }`** とする。
  - `detail` が文字列の例: 認証失敗、業務ルール違反の単一メッセージ。
  - **422 Unprocessable Entity**（バリデーションエラー）: `detail` は **オブジェクトの配列**（フィールドごとの `loc`, `msg`, `type` 等）になりうる。クライアントは配列形式も扱えるようにする。

### 2.6 IoT 機器向け認証（推奨・設計）

- `POST /api/iot/parking-status` は将来、**デバイス秘密鍵**（`devices.secret_key`）による認証を追加する。
- 案: ヘッダ `X-Device-Id: <uuid>` と `Authorization: Bearer <device_secret>`、または署名付きペイロード。詳細は IoT 実装 Issue で確定する。

### 2.7 ページング

一覧 API でページングが必要な場合、クエリは次を基本とする。

- `page`: 1 始まり整数（省略時はサーバー既定、例: 1）
- `per_page`: 1 ページあたり件数（省略時はサーバー既定、例: 20）

正常応答の JSON 形:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "per_page": 20
}
```

### 2.8 ドキュメントの役割分担

| 種別 | 主なドキュメント | 書くこと |
| :--- | :--- | :--- |
| **データの形** | [database-design.md](./database-design.md) | テーブル・カラム・制約・インデックス・マイグレーション方針 |
| **HTTP の契約** | 本書（各画面の表） | メソッド・パス・クエリ／ボディ／レスポンス・認証・エラー・ページング |
| **保存の振る舞い** | 本書「2.9」「2.10」＋各表の備考 | 読み書きするテーブル、トランザクション境界、競合・冪等、権限と WHERE の対応 |

スキーマの重複定義は避け、カラムの追加変更は **必ず DB 設計書を先に**更新し、本書のマトリクスとレスポンス例を追従させる。

### 2.9 永続化の共通方針（本設計）

- **トランザクション**: 原則 **1 リクエスト＝1 DB トランザクション**。複数テーブルを更新する場合も同一トランザクション内でコミットし、失敗時はロールバックする。
- **同期レスポンス**: ユーザー向けの `POST` / `PATCH` は、**コミット後の状態**（または作成 ID）を返すことを基本とする。推論・集計など重い処理は別途ジョブ化し、API は受理結果のみ返す案も可（その場合は「2.10 エンドポイント別の永続化（マトリクス）」の当該行に「非同期」と明記する）。
- **整合性と HTTP**: ユニーク制約・外部キー・DB の `CHECK` 違反は、クライアント向けには **`409 Conflict`** または **`400 Bad Request`** のどちらに寄せるかエンドポイントごとに統一し、`detail` で理由を返す（422 は入力形式バリデーション用）。
- **行レベルアクセス**: 「自分の予約のみ」などは **API の認可**と **SQL の WHERE（`user_id = 認証ユーザー`）** を一致させ、他ユーザーの行は更新・参照できないようにする。
- **冪等性**: 二重送信が起きうる `POST`（予約作成など）は、必要に応じて **Idempotency-Key** ヘッダ、または業務上ユニークなキーでの重複拒否を設計に書き留める。IoT の空き Upsert は **同一 `(device_id, タイムスタンプ)` や連番**での重複挿入をどう扱うか（無視／上書き）を決める。
- **読み取り専用 API**: 集計・一覧は原則 **コミット済みデータ**を読む。キャッシュする場合は鮮度（TTL や `updated_at` 下限）を実装 Issue で固定する。

### 2.10 エンドポイント別の永続化（マトリクス）

「現行」は本リポジトリのサーバー実装に即した説明。「本設計」は DB 連携・認可込みの目標。

| エンドポイント | メソッド | 永続化（現行） | 永続化（本設計） | 主な読み書きテーブル（本設計） | トランザクション・整合性・備考 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/auth/signup` | POST | `users` に INSERT | 同左 | `users` | メール UNIQUE 違反 → 400。パスワードはハッシュのみ保存。 |
| `/auth/login` | POST | 読み取り＋ログ用途 | 同左 | `users`（認証） | 書き込みなしでもよい。失敗は 401。 |
| `/auth/me` | GET | `users` 参照 | 同左 | `users` | JWT の `sub` と `users.id` で取得。 |
| `/auth/me` | PATCH | なし | `users` UPDATE（部分） | `users` | 許可フィールドのみ更新。 |
| `/api/iot/parking-status` | POST | メモリのみ | **書き込み** | `parking_statuses`（UPSERT）、`parking_status_histories`（INSERT） | 機器認証成功後のみ DB 更新。`available_spots` と `is_full` を一貫させる。履歴は追記のみ。冪等は実装 Issue で決定。 |
| `/api/parking-statuses` | GET | メモリ／既定値 | **読み取り** | `parking_statuses`（必要なら `parking_lots` と JOIN） | 参照のみ。 |
| `/api/parking-statuses/{parking_lot_id}` | GET | メモリ／既定値 | **読み取り** | `parking_statuses` | **現行**: 未登録 ID でも **200** で既定の空き値を返す（[server/src/modules/iot/api.py](../server/src/modules/iot/api.py)）。**本設計**: `parking_lots` に存在しない ID は **404**、存在すれば `parking_statuses` を参照。 |
| `/api/parking-lots` | GET | なし | **読み取り** | `parking_lots` | 参照のみ。ページングは「2.7 ページング」。 |
| `/api/parking-lots/{parking_lot_id}` | GET | なし | **読み取り** | `parking_lots` | 参照のみ。 |
| `/api/reservations` | POST | なし | **書き込み** | `reservations` INSERT、`parking_lots` 参照 | `end_time > start_time`、枠・満車チェック。競合は 409。 |
| `/api/reservations/me` | GET | なし | **読み取り** | `reservations`、`parking_lots`（JOIN） | `user_id` はトークン由来のみ。 |
| `/api/reservations/{reservation_id}` | PATCH | なし | **書き込み** | `reservations` UPDATE | キャンセル時は `status` の遷移ルール（完了済みは 409 等）を固定。 |
| `/api/dashboard/summary` | GET | メモリ／モック | **読み取り（集計）** | `parking_statuses`、`parking_lots`、`reservations`、`devices` 等 | 読み取りのみ。重い場合はマテリアライズやキャッシュを別 Issue で検討。 |
| `/api/admin/reservations` | GET | なし | **読み取り** | `reservations`、`users`、`parking_lots` | admin のみ。個人情報（メール）を返すかはポリシーで固定。 |
| `/api/admin/devices` | GET | なし | **読み取り** | `devices`、`parking_lots` | admin のみ。 |
| `/camera/images` | POST | メモリのみ | **書き込み（案）** | `camera_detections`（推論後）、必要ならオブジェクトストレージ＋URL を `image_url` | 同期で DB まで書くか、ジョブ完了後に INSERT かを実装で選択。未認証→本設計では dev ＋ Bearer。 |
| `/camera/detections/latest` | GET | メモリ | **読み取り** | `camera_detections` またはキャッシュ | 直近 1 件の取得方針（ロット別キー等）を実装 Issue で固定。 |

---

## 3. ログイン


| 概要                         | 必要な画面                     | エンドポイント        | メソッド  | リクエスト                                                                                                               | レスポンス                                                                                                                                                                           |
| -------------------------- | ------------------------- | -------------- | ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[実装済み]** 新規ユーザー登録        | ログイン                      | `/auth/signup` | POST  | **Body (JSON)** `email` (string, 必須, メール形式) `password` (string, 必須, 6〜256 文字) `name` (string, 任意) ※省略時はメールローカル部等で補完 | **200** `{ "access_token": "<jwt>", "token_type": "bearer", "user": { "id": "<uuid>", "email": "...", "name": "..." } }` 重複メール時 **400** `{"detail":"Email already registered"}` |
| **[実装済み]** ログイン            | ログイン                      | `/auth/login`  | POST  | **Body** `email` (string, 必須) `password` (string, 必須, 1〜256 文字)                                                     | **200** 上記 `TokenResponse` と同形 **401** 未登録: `Email not registered`、パスワード不一致: `Invalid email or password`                                                                        |
| **[実装済み]** ログインユーザー情報取得    | 起動時検証など（現状フロント未使用）、設定（将来） | `/auth/me`     | GET   | **Header** `Authorization: Bearer <JWT>` 必須                                                                         | **200** `{ "id": "<uuid>", "email": "...", "name": "..." }` **401** 未認証・無効トークン等                                                                                                 |
| **[設計のみ]** プロフィール更新（表示名など） | 設定                        | `/auth/me`     | PATCH | **Header** Bearer 必須。**Body**（例、すべて任意で部分更新） `name` (string) 将来: `notification_enabled` (boolean) 等                  | **200** 更新後 `UserOut` 同等 JSON **401** / **403** / **422**                                                                                                                       |


---

## 4. マップ


| 概要                            | 必要な画面          | エンドポイント                                  | メソッド | リクエスト                                                                                       | レスポンス                                                                                                                                                                   |
| ----------------------------- | -------------- | ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[設計のみ]** 駐輪場マスタ一覧（地図マーカー用）  | マップ、駐輪場一覧      | `/api/parking-lots`                      | GET  | **Query（任意）** `page`, `per_page` または緯度経度バウンディング（実装 Issue で確定）                               | **200** ページング時は「2.7 ページング」に従う。各 item: `id` (uuid), `name`, `latitude`, `longitude`, `total_spots`, `price_per_hour`, `created_at`, `updated_at`                         |
| **[設計のみ]** 駐輪場詳細              | マップ            | `/api/parking-lots/{parking_lot_id}`     | GET  | **Path** `parking_lot_id` (uuid, 必須)                                                        | **200** 上記 1 件オブジェクト **404**                                                                                                                                            |
| **[実装済み]** 全駐輪場の最新空き（簡易）      | マップ（移行後）、駐輪場一覧 | `/api/parking-statuses`                  | GET  | なし（現行）                                                                                      | **200** `ParkingStatusResponse` の配列。**現行**: `parking_lot_id` は **integer**、`available_count`, `updated_at` (string)。DB 連携後は uuid・`available_spots` 等へ移行（「12. 既知の差分」参照）。 |
| **[実装済み]** 駐輪場別最新空き           | マップ、駐輪場一覧      | `/api/parking-statuses/{parking_lot_id}` | GET  | **Path** `parking_lot_id`（現行 **int**、移行後 **uuid**）                                          | **200** 単一ステータスオブジェクト（同上）                                                                                                                                               |
| **[実装済み]** IoT からの空き状況 Upsert | （デバイス・運用）      | `/api/iot/parking-status`                | POST | **Body** `parking_lot_id` (integer 必須, **現行** `> 0`) `available_count` (integer 必須, `>= 0`) | **200** `{ "parking_lot_id", "available_count", "updated_at" }`（`updated_at` はサーバー生成の ISO 文字列）                                                                          |


**通知**: マップ上の通知一覧は **現状クライアント固定データ**。サーバー連携時は `GET /api/notifications`（ページング、`items` に `title`, `body`, `read`, `created_at` 等）を別途定義してよい（本書ではマップ表から省略し、必要になったら追記）。

---

## 5. 駐輪場一覧


| 概要                           | 必要な画面 | エンドポイント                                  | メソッド | リクエスト                                                            | レスポンス                              |
| ---------------------------- | ----- | ---------------------------------------- | ---- | ---------------------------------------------------------------- | ---------------------------------- |
| **[設計のみ]** マスタ＋最新空きの合成一覧（任意） | 駐輪場一覧 | `/api/parking-lots`                      | GET  | 「4. マップ」節の表と同様。フロントは `parking_lots` と `parking_statuses` を別取得でも可 | **200** 「2.7 ページング」の形式または配列（実装で選択） |
| **[実装済み]** 単一ロットの最新ステータス取得   | 駐輪場一覧 | `/api/parking-statuses/{parking_lot_id}` | GET  | **Path** `parking_lot_id`                                        | **200** 「4. マップ」節と同じ               |


---

## 6. 予約管理

`reservations` テーブルに準拠。時刻は「2.4 日時」に従う。

フロントの予約管理画面は、タブ「予約中」「履歴」とカード UI で **`reserved` / `active` / `completed` / `cancelled`** を表示する前提のモックデータを持つ（[client/src/components/reservations/reservations.tsx](../client/src/components/reservations/reservations.tsx)）。API 接続後は下記で **予約中** ≒ `status` が `reserved` または `active`、**履歴** ≒ `completed` または `cancelled` を返すか、フロントでフィルタする。永続化の対応関係は「2.10 エンドポイント別の永続化（マトリクス）」を参照。


| 概要                 | 必要な画面            | エンドポイント                              | メソッド  | リクエスト                                                                                                  | レスポンス                                                                                                                                                                                                 |
| ------------------ | ---------------- | ------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[設計のみ]** 自分の予約一覧 | 予約管理             | `/api/reservations/me`               | GET   | **Query（任意）** `status`（`reserved` / `active` / `completed` / `cancelled` のいずれか）、`page`, `per_page`     | **200** 「2.7 ページング」に従う。`items[]`: `id`, `parking_lot_id`, `start_time`, `end_time`, `status`, `total_amount`, `created_at` + 表示用に `parking_lot_name` や所在地テキストを付与してもよい（画面の `lotName` / `location` に相当） |
| **[設計のみ]** 予約作成    | マップ（予約モーダル）、予約管理 | `/api/reservations`                  | POST  | **Body** `parking_lot_id` (uuid, 必須) `start_time` (string ISO8601, 必須) `end_time` (string ISO8601, 必須) | **201** 作成された予約オブジェクト **400** 時間帯不正・満車等 **401**                                                                                                                                                       |
| **[設計のみ]** 予約キャンセル | 予約管理             | `/api/reservations/{reservation_id}` | PATCH | **Path** `reservation_id` (uuid)。**Body** `{ "status": "cancelled" }` のみ想定、または専用サブパス                   | **200** 更新後オブジェクト **404** / **409**（既に完了等）。画面の「キャンセル」ボタンは本 API 接続先。**「地図で確認」**は `GET /api/parking-lots/{id}` 参照やクライアントルーティングのみでよい（専用 API は不要）                                                         |


---

## 7. 設定


| 概要                    | 必要な画面  | エンドポイント    | メソッド  | リクエスト         | レスポンス             |
| --------------------- | ------ | ---------- | ----- | ------------- | ----------------- |
| **[実装済み]** ログインユーザー参照 | 設定（将来） | `/auth/me` | GET   | Bearer 必須     | **200** `UserOut` |
| **[設計のみ]** プロフィール更新   | 設定     | `/auth/me` | PATCH | 「3. ログイン」節と同じ | 「3. ログイン」節と同じ     |


UI 専用のテーマ・通知 ON/OFF が localStorage のみの間は API 不要。永続化する場合は `PATCH /auth/me` の拡張または `GET/PATCH /users/me/preferences` を別 Issue で追加する。

---

## 8. ダッシュボード


| 概要                      | 必要な画面             | エンドポイント                  | メソッド | リクエスト                                           | レスポンス                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ----------------- | ------------------------ | ---- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[実装済み]** ダッシュボード用サマリー | ダッシュボード、管理者向けサマリー | `/api/dashboard/summary` | GET  | なし（現行）。**本設計**では Bearer + admin（または dev）必須とする想定 | **200** `{ "total_occupancy_rate": number, "used_count": int, "total_capacity": int, "full_lots_count": int, "total_lots_count": int, "active_reservations_count": int, "abnormal_devices_count": int, "occupancy_by_lot": [...], "status_distribution": [...] }`。**現行** `occupancy_by_lot[]` に `shortName`（camelCase）が含まれる。正規化後は `short_name`（snake_case）を推奨（「12. 既知の差分」参照）。各要素の `value` は現行実装では「空き台数」寄りの意味でロットにより異なるため、実装 Issue で指標定義を固定する |


---

## 9. カメラ画像


| 概要                     | 必要な画面 | エンドポイント                     | メソッド | リクエスト                                                         | レスポンス                                                                                                                                                                                  |
| ---------------------- | ----- | --------------------------- | ---- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[実装済み]** カメラ画像アップロード | カメラ   | `/camera/images`            | POST | **Body**: 生バイナリ（画像）。**Header** `Content-Type`: `image/jpeg` 等 | **200** JSON: `message` (string), `content_type` (string または null), `size_bytes` (int)。**400** 空ボディ: `Image payload is empty`                                                          |
| **[実装済み]** 最新検出結果取得    | カメラ   | `/camera/detections/latest` | GET  | なし                                                            | **200** JSON: `detected_count` (int), `boxes` (配列), `received_at` / `content_type` は string または null, `size_bytes` (int)。各 box は `x`, `y`, `width`, `height`, `label`, `score` (float) |


**本設計**では dev（または認証済みクライアント）＋将来のレート制限を推奨。

---

## 10. 管理者向け

ダッシュボード内の「管理」「レポート」向け。いずれも **設計のみ**（サマリー以外）。


| 概要                    | 必要な画面         | エンドポイント                   | メソッド | リクエスト                                                                                    | レスポンス                                                                          |
| --------------------- | ------------- | ------------------------- | ---- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **[設計のみ]** 予約の全件検索・一覧 | 管理者向け         | `/api/admin/reservations` | GET  | **Query** `page`, `per_page`, `status`, `parking_lot_id`, `user_id`, `from`, `to`（日時範囲）等 | **200** 「2.7 ページング」に従う。`items` は予約オブジェクト＋ユーザー識別子（メールはポリシー次第）                   |
| **[設計のみ]** デバイス健全性一覧  | 管理者向け         | `/api/admin/devices`      | GET  | **Query** `page`, `per_page`, `parking_lot_id`（任意）                                       | **200** `devices` 相当: `id`, `parking_lot_id`, `type`, `name`, `last_seen_at` 等 |
| **[実装済み]** 集計サマリー（共有） | 管理者向け、ダッシュボード | `/api/dashboard/summary`  | GET  | 「8. ダッシュボード」節と同じ                                                                         | 「8. ダッシュボード」節と同じ                                                               |


---

## 11. 運用・開発用エンドポイント（参考）

フロントの画面要件の主対象外。実装は [server/src/modules/health/api.py](../server/src/modules/health/api.py)、[server/src/modules/example/api.py](../server/src/modules/example/api.py)、[server/src/bootstrap/app_builder.py](../server/src/bootstrap/app_builder.py) 等。


| エンドポイント   | メソッド | 用途      |
| --------- | ---- | ------- |
| `/health` | GET  | ヘルスチェック |
| `/ping`   | GET  | 例示用     |
| `/test`   | GET  | 開発用疎通   |


---

## 12. 既知の差分（現行実装と本設計）


| 項目       | 現状                                            | 本設計（移行先）                                                             |
| -------- | --------------------------------------------- | -------------------------------------------------------------------- |
| 駐輪場 ID 型 | `parking_lot_id` が **integer**（メモリ保持のモック）     | [database-design.md](./database-design.md) に合わせ **UUID**             |
| 空きフィールド名 | `available_count`                             | DB 整合で `available_spots`、満車は `is_full` をレスポンスに含めてもよい                 |
| JSON キー  | `occupancy_by_lot` 内の `shortName`（camelCase）等 | **snake_case**（`short_name`）に統一                                      |
| 認証       | `/api/` の一部、`/camera/` が未保護                 | ユーザー向け GET は **Bearer 必須**、IoT POST は **機器認証**、カメラは **dev ロール** 等に整理 |
| ユーザーロール  | DB なし、フロントのみ                                  | JWT または `users` 拡張でサーバー強制                                            |
| DB 永続化   | IoT・空き・ダッシュボード・カメラが **メモリ中心**              | 「2.10 エンドポイント別の永続化（マトリクス）」のとおり **PostgreSQL** に読み書き        |


型・キー・認可・永続化の実装変更は **別 Issue** で本書（特に「2.10」および本表）に追従させる。