# 実装・テスト計画書（plan.md）

本計画は `docs/spec.md` を実現するための実装ステップとテスト計画である。  
実装前に仕様（`spec.md`）を正とし、完了条件は本計画のチェックリストで判定する。

---

## 1. 目的と完了定義

### 1.1 目的

仕様書の機能要件 F-01〜F-03（作成・一覧確認・削除）を、SAM インフラ上の Lambda + DynamoDB と React フロントで実現する。

### 1.2 Definition of Done（DoD）

- [ ] `template.yaml` が仕様のリソース・権限・CORS と一致している
- [ ] `create_inquiry.py` / `list_inquiries.py` / `delete_inquiry.py` が API 契約どおり動作する
- [ ] フロントから作成・一覧・削除が一通りできる
- [ ] エラーが仕様の JSON 形式で返る
- [ ] 下記「必須テスト」がすべて Pass

---

## 2. 前提・依存関係

| 項目 | 内容 |
|------|------|
| 仕様 | `docs/spec.md` |
| エージェント規約 | `AGENTS.md` |
| IaC | `template.yaml`（CORS DELETE・3 Lambda・最小権限済み） |
| ツール | AWS CLI, SAM CLI, Node.js, Python 3.11 |
| 認証 | 初期スコープでは不要（公開 API） |

実装順序の原則: **インフラ確認 → バックエンド → ローカル/デプロイ検証 → フロント → E2E**

---

## 3. 実装ステップ

### Phase 0 — 準備（ドキュメント・骨格）

| ステータス | Step | 作業 | 成果物 | 完了条件 |
|---|---|---|---|---|
| [ ] | 0.1 | 仕様・計画のレビュー | `docs/spec.md`, `docs/plan.md` | F-01〜F-03 と API が明確 |
| [ ] | 0.2 | ディレクトリ作成 | `backend/src/`, `frontend/` | `AGENTS.md` の構成と一致 |
| [ ] | 0.3 | `backend/requirements.txt` | boto3 等の依存定義 | ローカル/ SAM ビルドで解決可能 |

---

### Phase 1 — インフラ確認・調整

| ステータス | Step | 作業 | 成果物 | 完了条件 |
|---|---|---|---|---|
| [ ] | 1.1 | `template.yaml` を仕様と突合 | （既存テンプレート） | POST/GET/DELETE、CORS、IAM が仕様どおり |
| [ ] | 1.2 | 不足があればテンプレート修正 | `template.yaml` | `sam validate` 成功 |
| [ ] | 1.3 | Outputs の API URL 確認 | Output `ApiEndpoint` | フロント `.env` に転記可能 |

**チェックポイント:** Create=Write / List=Read / Delete=DeleteItem のみ。

---

### Phase 2 — バックエンド実装

共通ユーティリティ（任意だが推奨）:

- CORS ヘッダー付与
- エラーレスポンス生成 `{ "error", "message" }`
- `TABLE_NAME` の読み込み

#### 2.1 POST /inquiries — `create_inquiry.py`

| ステータス | Step | 作業 | 完了条件 |
|---|---|---|---|
| [ ] | 2.1.1 | Body JSON パース | 不正 JSON → 400 `ValidationError` |
| [ ] | 2.1.2 | name / email / message バリデーション | 仕様 3.3 に準拠 |
| [ ] | 2.1.3 | `id`（UUID）と `created_at`（ISO8601）をサーバー生成 | クライアント値は無視 |
| [ ] | 2.1.4 | DynamoDB `PutItem` | アイテム永続化 |
| [ ] | 2.1.5 | `201` + 作成オブジェクト返却 | 仕様 4.1 どおり |
| [ ] | 2.1.6 | 例外時 `500` JSON | 仕様 5 どおり |

#### 2.2 GET /inquiries — `list_inquiries.py`

| ステータス | Step | 作業 | 完了条件 |
|---|---|---|---|
| [ ] | 2.2.1 | DynamoDB `Scan` | 全件取得（初期スコープ） |
| [ ] | 2.2.2 | `created_at` 降順ソート | 新しい順 |
| [ ] | 2.2.3 | `200` + `{ "items": [...] }` | 空配列も可 |
| [ ] | 2.2.4 | 例外時 `500` JSON | 仕様 5 どおり |

#### 2.3 DELETE /inquiries/{id} — `delete_inquiry.py`

| ステータス | Step | 作業 | 完了条件 |
|---|---|---|---|
| [ ] | 2.3.1 | パスパラメータ `id` 取得 | 空なら 400 |
| [ ] | 2.3.2 | `DeleteItem` + 存在確認 | 未存在 → 404 `NotFound` |
| [ ] | 2.3.3 | 成功時 `204`（ボディなし） | 仕様 4.3 どおり |
| [ ] | 2.3.4 | 例外時 `500` JSON | 仕様 5 どおり |

---

### Phase 3 — バックエンド検証・デプロイ

| ステータス | Step | 作業 | 完了条件 |
|---|---|---|---|
| [ ] | 3.1 | `sam build` | ビルド成功 |
| [ ] | 3.2 | `sam local invoke` または `sam local start-api` で 3 API 確認 | 作成→一覧→削除が一通り通る |
| [ ] | 3.3 | `sam deploy`（または `sam deploy --guided`） | スタック作成・更新成功 |
| [ ] | 3.4 | デプロイ後の実 API を curl 等で確認 | 本番相当エンドポイントで Pass |

---

### Phase 4 — フロントエンド実装

> **フォーム画面（F-01）の詳細計画は [`docs/実装計画書_お問い合わせフォーム画面.md`](./実装計画書_お問い合わせフォーム画面.md) を正とする。**  
> 仕様優先順: `要件定義書_お問い合わせフォーム画面.md` → `spec.md` §6.1 / §3.3 / §4.1 / §5。  
> Step 4.1〜4.4 / フォーム分の 4.7 は、同ファイルの Step F-0〜F-7 に分解して実施する。  
> 環境変数名は **`VITE_API_BASE_URL`**（旧表記 `VITE_API_ENDPOINT` は使わない）。

| ステータス | Step | 作業 | 成果物 | 完了条件 |
|---|---|---|---|---|
| [ ] | 4.1 | Vite + React + TS プロジェクト初期化 | `frontend/` | 開発サーバ起動可（→ form 計画 F-0） |
| [ ] | 4.2 | Inquiry 型・API クライアント（POST 作成） | types, api module | `any` なし（→ F-1, F-3） |
| [ ] | 4.3 | `.env` に `VITE_API_BASE_URL` | `.env.example` / ローカル `.env` | ハードコードなし（→ F-3） |
| [ ] | 4.4 | 投稿フォーム画面 | Form UI | POST 成功で完了表示・二重送信防止・バリデーション（→ F-2, F-4〜F-7） |
| [ ] | 4.5 | 一覧画面 | List UI | GET で表示（**フォーム計画の対象外・後続**） |
| [ ] | 4.6 | 削除ボタン + 確認ダイアログ | Delete UI | DELETE 後に一覧更新（**フォーム計画の対象外・後続**） |
| [ ] | 4.7 | エラー表示 | UI | `message` をユーザーに表示（フォーム分は 4.4 に含む。一覧・削除は各 Step で） |

---

### Phase 5 — 結合・仕上げ

| ステータス | Step | 作業 | 完了条件 |
|---|---|---|---|
| [ ] | 5.1 | フロント ↔ デプロイ済み API の E2E | 作成・一覧・削除が UI から完走 |
| [ ] | 5.2 | CORS 確認（ブラウザ） | プリフライト・DELETE 含めて成功 |
| [ ] | 5.3 | README に起動・デプロイ手順を追記（任意） | 第三者が再現可能 |
| [ ] | 5.4 | DoD チェックリスト最終確認 | すべてチェック済み |

---

## 4. テスト計画

### 4.1 テスト方針

| レベル | 対象 | 手段 |
|--------|------|------|
| 単体 | バリデーション・レスポンス整形 | pytest 等（任意）。最低限はローカル invoke |
| API | 3 エンドポイントの契約 | curl / HTTP クライアント / `sam local start-api` |
| 結合 | UI ↔ API | ブラウザ手動（必須） |
| 回帰 | デプロイ後 | 必須テストケースを再実行 |

### 4.2 必須テストケース

#### T-POST（作成）

| ID | ケース | 期待 |
|----|--------|------|
| T-POST-01 | 正常な name/email/message | `201`、body に `id` と `created_at` |
| T-POST-02 | email 欠落 | `400` `ValidationError` |
| T-POST-03 | 不正 JSON | `400` `ValidationError` |
| T-POST-04 | message が空文字 | `400` `ValidationError` |

#### T-GET（一覧）

| ID | ケース | 期待 |
|----|--------|------|
| T-GET-01 | 1 件以上存在 | `200`、`items` 配列に含まれる |
| T-GET-02 | 0 件 | `200`、`{ "items": [] }` |
| T-GET-03 | 複数件 | `created_at` 降順 |

#### T-DELETE（削除）

| ID | ケース | 期待 |
|----|--------|------|
| T-DELETE-01 | 存在する id | `204`、再 GET で当該件なし |
| T-DELETE-02 | 存在しない id | `404` `NotFound` |
| T-DELETE-03 | id 空 | `400` `ValidationError` |

#### T-UI（フロント結合）

| ID | ケース | 期待 |
|----|--------|------|
| T-UI-01 | フォーム送信 | 一覧に新規件が表示される |
| T-UI-02 | 削除確認→実行 | 一覧から消える |
| T-UI-03 | API エラー時 | エラーメッセージが表示される |

#### T-SEC（権限・CORS）

| ID | ケース | 期待 |
|----|--------|------|
| T-SEC-01 | ブラウザから DELETE | CORS でブロックされない |
| T-SEC-02 | IAM（設計レビュー） | 各 Lambda が仕様 2.2 の権限のみ |

### 4.3 テスト実行手順（推奨）

```bash
# ビルド
sam build

# ローカル API（任意）
sam local start-api

# 作成
curl -s -X POST http://127.0.0.1:3000/inquiries \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"email\":\"t@example.com\",\"message\":\"hello\"}"

# 一覧
curl -s http://127.0.0.1:3000/inquiries

# 削除（{id} を置換）
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://127.0.0.1:3000/inquiries/{id}
```

デプロイ後は `ApiEndpoint` に差し替えて同ケースを再実行する。

### 4.4 合格基準

- 必須テスト（T-POST / T-GET / T-DELETE / T-UI / T-SEC）がすべて Pass
- エラーレスポンスが常に `{ "error", "message" }` 形式
- 個人情報をログに出していない（コードレビューで確認）

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| SimpleTable にソートキーなし | 時系列ソートは Scan + アプリ側 | 初期はアプリ側降順。件数増なら GSI を仕様更新後に追加 |
| CORS Origin `*` | 本番セキュリティ不足 | 初期は許容。本番前に Origin 制限を仕様へ追加 |
| 公開 API | 誰でも一覧・削除可能 | 仕様上スコープ外と明記。必要時に認証を仕様追加 |
| `DynamoDBDeletePolicy` 非存在 | デプロイ失敗 | インライン `DeleteItem` ポリシーを継続使用 |

---

## 6. マイルストーン

| マイルストーン | 内容 | 退出条件 |
|----------------|------|----------|
| M1 | 仕様確定 | `spec.md` / `plan.md` レビュー完了 |
| M2 | API 完成 | T-POST / T-GET / T-DELETE Pass |
| M3 | UI 完成 | T-UI Pass |
| M4 | 提出可能 | DoD すべて完了 |

---

## 7. 実装時の参照優先順位

1. `docs/spec.md`（API・データ・エラーの正）
2. 画面単位の要件・計画（例: フォームは `要件定義書_お問い合わせフォーム画面.md` + `実装計画書_お問い合わせフォーム画面.md`）
3. `docs/plan.md`（本計画の全体順序・テスト）
4. `AGENTS.md`（コーディング規約）
5. `template.yaml`（インフラの正）

仕様と実装が食い違う場合は、**先に `spec.md`（および該当する画面要件定義書）を更新してからコードを直す**。  
フォーム画面のみ実装する場合は Phase 4.1〜4.4 を `実装計画書_お問い合わせフォーム画面.md` の F-0〜F-7 で置き換えて進めてよい。
