# 仕様書（spec.md）

お問い合わせフォーム サーバーレス Web アプリケーションの仕様定義。  
根拠: `AGENTS.md` / `template.yaml`

---

## 1. 概要

| 項目 | 内容 |
|------|------|
| プロダクト名 | inquiry-app-aws |
| 目的 | お問い合わせの作成・一覧確認・削除を提供する |
| 開発方針 | 仕様駆動開発（Spec-Driven Development）。本仕様を実装・テストの単一の正とする |

### 1.1 機能要件

| ID | 要件 | 説明 |
|----|------|------|
| F-01 | 作成 | お問い合わせを新規登録できる |
| F-02 | 一覧確認 | 登録済みお問い合わせの一覧を確認できる |
| F-03 | 削除 | 指定したお問い合わせを削除できる |

### 1.2 非機能要件（初期スコープ）

| ID | 要件 | 内容 |
|----|------|------|
| NF-01 | ランタイム | Lambda Python 3.11、Timeout 10s、Memory 128MB |
| NF-02 | CORS | GET / POST / DELETE / OPTIONS を許可（開発時 Origin は `*`） |
| NF-03 | 権限 | 関数ごとに DynamoDB 最小権限 |
| NF-04 | 認証 | 本仕様の初期スコープでは未実装（API は公開） |

---

## 2. システム構成

```
[Browser]
   │  React + TypeScript (Vite)
   │  .env の API エンドポイントを参照
   ▼
[API Gateway HTTP API]  InquiryApi
   │  CORS: GET, POST, DELETE, OPTIONS
   ├─ POST   /inquiries          → CreateInquiryFunction
   ├─ GET    /inquiries          → ListInquiriesFunction
   └─ DELETE /inquiries/{id}     → DeleteInquiryFunction
   ▼
[Amazon DynamoDB]  InquiriesTable (PK: id)
```

### 2.1 コンポーネント一覧

| レイヤ | 技術 | 役割 |
|--------|------|------|
| フロントエンド | React + TypeScript (Vite) | 投稿フォーム、一覧確認、削除 UI |
| API | API Gateway HTTP API | ルーティング・CORS |
| バックエンド | AWS Lambda (Python 3.11) | ビジネスロジック |
| データストア | DynamoDB SimpleTable | 問い合わせ永続化 |
| IaC | AWS SAM (`template.yaml`) | インフラ定義・デプロイ |

### 2.2 Lambda と IAM

| 関数 | ハンドラ | 権限 |
|------|----------|------|
| CreateInquiryFunction | `create_inquiry.lambda_handler` | `DynamoDBWritePolicy` |
| ListInquiriesFunction | `list_inquiries.lambda_handler` | `DynamoDBReadPolicy` |
| DeleteInquiryFunction | `delete_inquiry.lambda_handler` | `dynamodb:DeleteItem` のみ（DynamoDBDeletePolicy 相当） |

共通環境変数: `TABLE_NAME` = `InquiriesTable`

### 2.3 ディレクトリ構成

```
inquiry-app-aws/
├── AGENTS.md
├── template.yaml
├── docs/
│   ├── spec.md          # 本仕様書
│   └── plan.md          # 実装・テスト計画
├── backend/
│   ├── src/
│   │   ├── create_inquiry.py
│   │   ├── list_inquiries.py
│   │   └── delete_inquiry.py
│   └── requirements.txt
└── frontend/            # React + TypeScript (Vite)
```

---

## 3. データモデル

### 3.1 テーブル

| 項目 | 値 |
|------|-----|
| 論理名 | Inquiries |
| 物理名 | InquiriesTable |
| 種類 | `AWS::Serverless::SimpleTable` |
| パーティションキー | `id` (String) |
| ソートキー | なし |

### 3.2 問い合わせアイテム（Inquiry）

| 属性 | 型 | 必須 | 説明 |
|------|----|------|------|
| `id` | String | Yes | 一意 ID（UUID v4 推奨）。サーバー側で採番 |
| `created_at` | String | Yes | 作成日時。ISO 8601（例: `2026-10-01T12:00:00+09:00`）。サーバー側で付与 |
| `name` | String | Yes | 問い合わせ者名 |
| `email` | String | Yes | 連絡先メールアドレス |
| `message` | String | Yes | 問い合わせ本文 |

### 3.3 バリデーション規則

| フィールド | 規則 |
|------------|------|
| `name` | 必須。空文字・空白のみ不可。最大 100 文字 |
| `email` | 必須。簡易メール形式（`local@domain`）。最大 254 文字 |
| `message` | 必須。空文字・空白のみ不可。最大 2000 文字 |
| `id` / `created_at` | クライアント送信値は無視し、サーバーが生成 |

### 3.4 サンプルレコード

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-10-01T12:00:00+09:00",
  "name": "山田太郎",
  "email": "taro@example.com",
  "message": "サービスについて質問があります。"
}
```

---

## 4. API 仕様

ベース URL: API Gateway の Output `ApiEndpoint`（フロントは `.env` で参照）

共通レスポンスヘッダー（Lambda から返却）:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json`（ボディがある場合） |
| `Access-Control-Allow-Origin` | `*`（開発時。API Gateway CORS と整合） |

---

### 4.1 POST /inquiries — 作成（F-01）

問い合わせを新規作成する。

**Request**

| 項目 | 内容 |
|------|------|
| Method | `POST` |
| Path | `/inquiries` |
| Content-Type | `application/json` |

Body:

```json
{
  "name": "山田太郎",
  "email": "taro@example.com",
  "message": "サービスについて質問があります。"
}
```

**Success Response — `201 Created`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-10-01T12:00:00+09:00",
  "name": "山田太郎",
  "email": "taro@example.com",
  "message": "サービスについて質問があります。"
}
```

**Error**

| Status | error | 条件 |
|--------|-------|------|
| 400 | `ValidationError` | 必須欠落・形式不正・文字数超過・不正 JSON |
| 500 | `InternalServerError` | 予期しない障害 |

---

### 4.2 GET /inquiries — 一覧確認（F-02）

登録済み問い合わせの一覧を返す。

**Request**

| 項目 | 内容 |
|------|------|
| Method | `GET` |
| Path | `/inquiries` |
| Query | なし（初期スコープ。ページネーションなし） |

**Success Response — `200 OK`**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-10-01T12:00:00+09:00",
      "name": "山田太郎",
      "email": "taro@example.com",
      "message": "サービスについて質問があります。"
    }
  ]
}
```

- 0 件の場合: `{ "items": [] }`
- 並び順: `created_at` 降順（新しい順）。アプリ側ソート可

**Error**

| Status | error | 条件 |
|--------|-------|------|
| 500 | `InternalServerError` | 予期しない障害 |

---

### 4.3 DELETE /inquiries/{id} — 削除（F-03）

指定 ID の問い合わせを削除する。

**Request**

| 項目 | 内容 |
|------|------|
| Method | `DELETE` |
| Path | `/inquiries/{id}` |
| Path param | `id` — 問い合わせ ID |

**Success Response — `204 No Content`**

- レスポンスボディなし

**Error**

| Status | error | 条件 |
|--------|-------|------|
| 400 | `ValidationError` | `id` が空・未指定 |
| 404 | `NotFound` | 対象レコードが存在しない |
| 500 | `InternalServerError` | 予期しない障害 |

削除の存在確認: `DeleteItem` の `ReturnValues=ALL_OLD` 等で削除前アイテムの有無を判定し、無ければ `404` とする。

---

## 5. エラーハンドリング規約

### 5.1 共通エラーボディ

すべてのエラーレスポンスは次の JSON とする。

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message"
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `error` | string | 機械可読なエラー種別 |
| `message` | string | 人が読める説明（クライアント表示・デバッグ用） |

### 5.2 エラー種別一覧

| HTTP | error | 用途 |
|------|-------|------|
| 400 | `ValidationError` | 入力・パス不正 |
| 404 | `NotFound` | リソース未検出 |
| 500 | `InternalServerError` | 予期しない例外 |

### 5.3 実装ルール

1. 未捕捉例外も `500` + 上記 JSON で返す（プレーンテキストや空ボディ禁止）
2. ログに個人情報（`email`, `message` 全文など）を出さない
3. CORS ヘッダーは成功・失敗の双方に付与する
4. フロントは `error` / `message` を型定義し、ユーザー向け表示に利用する

### 5.4 エラー例

```json
{ "error": "ValidationError", "message": "email is required" }
```

```json
{ "error": "NotFound", "message": "Inquiry not found" }
```

```json
{ "error": "InternalServerError", "message": "Unexpected error occurred" }
```

---

## 6. フロントエンド仕様

| 画面 | 役割 | 利用 API |
|------|------|----------|
| 投稿フォーム（お問い合わせフォーム） | 名前・メール・本文の入力と送信 | `POST /inquiries` |
| 管理（一覧） | 一覧表示・削除 | `GET /inquiries`, `DELETE /inquiries/{id}` |

共通:

- TypeScript で Inquiry / API エラー型を定義し、`any` を避ける
- API ベース URL は `import.meta.env`（`.env`）経由で参照する（例: `VITE_API_BASE_URL`）
- 管理画面の削除前に確認ダイアログを表示する

---

### 6.1 お問い合わせフォーム画面（F-01）

本節はこれから実装する投稿フォームの詳細仕様である。  
バックエンドの `POST /inquiries`（4.1）、バリデーション（3.3）、エラー形式（5）、CORS（1.2 / 4 / 5.3）と整合させる。

#### 6.1.1 画面構成

| UI 要素 | 入力種別 | 送信キー | 必須 |
|---------|----------|----------|------|
| 名前 | テキスト（1 行） | `name` | Yes |
| メールアドレス | テキスト（`type="email"` 推奨） | `email` | Yes |
| お問い合わせ本文 | 複数行（textarea） | `message` | Yes |
| 送信ボタン | button / submit | — | — |

- 上記 3 入力＋送信ボタンを最低限含める
- `id` / `created_at` の入力欄は設けない（サーバー側で付与。3.3）
- 認証ヘッダーは付与しない（初期スコープで API は公開。NF-04）

#### 6.1.2 クライアント側バリデーション

送信前に検証し、失敗時は API を呼ばない。規則はサーバー（3.3）と同一とする。

| フィールド | 規則 |
|------------|------|
| `name` | 必須。空文字・空白のみ不可。最大 100 文字 |
| `email` | 必須。空文字・空白のみ不可。簡易メール形式（`local@domain`）。最大 254 文字 |
| `message` | 必須。空文字・空白のみ不可。最大 2000 文字 |

- フィールドエラーは該当入力の近傍に表示する
- メール形式はバックエンドと同等の簡易チェックとする（サーバー実装例: `local@domain` 系のパターン）

#### 6.1.3 UI 挙動（送信時）

| ID | 要件 |
|----|------|
| FE-01 | 送信操作でクライアントバリデーションを実行する |
| FE-02 | バリデーション失敗時は API 未呼び出しのまま、フィールドエラーを表示する |
| FE-03 | リクエスト開始〜完了（成功／失敗）まで送信中状態とする |
| FE-04 | 送信中はローディング表示を行う（ボタン文言変更、スピナー、`aria-busy` 等） |
| FE-05 | 送信中は送信ボタンを disabled にし、二重送信・連打を防ぐ |
| FE-06 | ブラウザのデフォルト submit によるページリロードを行わない |
| FE-07 | リクエスト完了後は送信中状態を解除する |

#### 6.1.4 API 連携とメッセージ表示

**リクエスト**

| 項目 | 内容 |
|------|------|
| Method | `POST` |
| URL | `{API_BASE_URL}/inquiries` |
| Headers | `Content-Type: application/json` |
| Body | `{ "name", "email", "message" }`（必要なら trim して送る） |

**レスポンス処理**

| 結果 | 条件 | 画面表示 |
|------|------|----------|
| 成功 | HTTP `201` と Inquiry オブジェクト | 「送信完了」を表示する。入力内容をクリアする。直前のエラー表示は消す |
| バリデーションエラー | HTTP `400` + `error: ValidationError` | API の `message` をエラーとして表示する |
| サーバーエラー | HTTP `500` + `error: InternalServerError` | エラーメッセージを表示する（例: 「送信に失敗しました。時間をおいて再度お試しください」） |
| 通信失敗等 | ネットワークエラー、CORS 失敗、想定外ステータス | エラーメッセージを表示する（例: 「サーバーに接続できませんでした」） |

- 成功メッセージとエラーメッセージは同時に出さない（新しい結果で上書き）
- API エラーボディ `{ error, message }` を型定義し、ユーザー向け表示に利用する（5.3）
- 成功後は同一画面に留まる（一覧への自動遷移は必須としない）

#### 6.1.5 CORS・接続仕様（フロント視点）

ブラウザ（Vite 開発サーバーを含む）から `POST /inquiries` を呼ぶ前提で、次が満たされていること。

| 項目 | 仕様（バックエンド／インフラ側） |
|------|----------------------------------|
| 許可 Method | `GET`, `POST`, `DELETE`, `OPTIONS` |
| 許可 Header | `Content-Type`, `Authorization` |
| 許可 Origin | `*`（開発時。本番制限はスコープ外） |
| Lambda 応答 | 成功・失敗の双方に `Access-Control-Allow-Origin: *` 等の CORS ヘッダー |

フロント側の接続要件:

1. `.env` の API ベース URL を参照して `POST` する
2. 本リクエストは `Content-Type: application/json` のみとし、不要ヘッダーでプリフライトを壊さない
3. ローカル確認時、ブラウザからプリフライト `OPTIONS` と本リクエスト `POST` が通ること
4. 環境変数未設定時は、曖昧な失敗にせず設定不足が分かること

---

## 7. スコープ外（初期リリース）

- 認証・認可（Cognito 等）
- ページネーション / 検索 / フィルタ
- 問い合わせ詳細取得 API（`GET /inquiries/{id}`）
- メール通知
- 本番向け CORS Origin 制限（必要になった時点で `template.yaml` を更新）

---

## 8. 仕様変更ルール

1. API・データモデル・エラー形式の変更は、先に本 `spec.md` を更新する
2. `AGENTS.md` / `template.yaml` と矛盾する場合は、更新後の `spec.md` を正とし、他を追随させる
3. 実装・テストは `docs/plan.md` の手順に従う
