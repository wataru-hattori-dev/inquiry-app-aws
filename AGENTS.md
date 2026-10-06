# AGENTS.md

## プロジェクト概要
お問い合わせフォーム（Inquiry Form）のサーバーレスWebアプリケーション。

## アーキテクチャ構成
- **フロントエンド**: React + TypeScript (Vite)
- **バックエンド**: Python (AWS Lambda) + API Gateway (HTTP API)
- **データベース**: Amazon DynamoDB
- **IaC / デプロイ**: AWS SAM (`template.yaml`)

## 機能要件
- **作成**: お問い合わせを新規登録できること
- **一覧確認**: 登録済みのお問い合わせ一覧を確認できること
- **削除**: 指定したお問い合わせを削除できること

## ディレクトリ構造想定
inquiry-app-aws/
├── AGENTS.md
├── template.yaml          # AWS SAM インフラ定義
├── backend/                # Lambda関数ソースコード (Python)
│   ├── src/
│   │   ├── create_inquiry.py
│   │   ├── list_inquiries.py
│   │   └── delete_inquiry.py
│   └── requirements.txt
└── frontend/               # フロントエンドソースコード (React + TS)

## データモデル
問い合わせレコードには、少なくとも次のフィールドを含めること。
- `id` (String): 一意な識別子（UUID 等）
- `created_at` (String): 作成日時（ISO 8601 形式、例: `2026-10-01T12:00:00+09:00`）

## API契約

### POST /inquiries
問い合わせを作成する。
- リクエスト Body（JSON）例: `{ "name": "...", "email": "...", "message": "..." }`
- 成功時: `201` と作成された問い合わせオブジェクト（`id`, `created_at` を含む）

### GET /inquiries
問い合わせ一覧を取得する。
- 成功時: `200` と問い合わせ配列

### DELETE /inquiries/{id}
指定 ID の問い合わせを削除する。
- 成功時: `204`（または `200` と削除結果）
- 対象が存在しない場合: `404`

### エラーレスポンス形式
エラー時は HTTP ステータスコードに加え、必ず次の JSON 形式で返すこと。

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message"
}
```

例:
- バリデーションエラー (`400`): `{ "error": "ValidationError", "message": "email is required" }`
- 未検出 (`404`): `{ "error": "NotFound", "message": "Inquiry not found" }`
- サーバーエラー (`500`): `{ "error": "InternalServerError", "message": "Unexpected error occurred" }`

## コーディング規約・ルール
1. **バックエンド (Python)**:
   - レスポンスには適切な CORS ヘッダーを含めること。
   - エラーハンドリングを徹底し、500エラー時も上記 JSON 形式でエラーメッセージを返すこと。
   - 問い合わせ作成時に `id` と `created_at`（ISO 8601）を必ず付与すること。
2. **フロントエンド (React / TS)**:
   - TypeScriptの型定義を厳格に行うこと（`any` の多用を避ける）。
   - 環境変数（APIエンドポイントURL等）は `.env` 経由で参照すること。
3. **インフラ (SAM)**:
   - 最小権限の法則に基づいた IAM ポリシーを設定すること。
     - Create: `DynamoDBWritePolicy`
     - List: `DynamoDBReadPolicy`
     - Delete: DeleteItem のみを許可するポリシー（`DynamoDBDeletePolicy` 相当）
