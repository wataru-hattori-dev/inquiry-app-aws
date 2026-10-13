# inquiry-app-aws

サーバーレス問い合わせフォーム（作成・一覧・削除）。

## 使用技術と役割

| 技術 | 役割 |
|------|------|
| **フロント: React + TypeScript (Vite)** | お問い合わせ投稿・一覧・削除 UI。ビルド成果物を公開配信する |
| **API: Python (Lambda) + API Gateway (HTTP API)** | `POST` / `GET` / `DELETE /inquiries` を提供する |
| **DB: DynamoDB** | 問い合わせレコード（`id`, `created_at`, name/email/message）の永続化 |
| **インフラ（配信）: S3 + CloudFront** | フロント静的ファイルのホスティングと HTTPS 配信（SPA） |
| **IaC: AWS SAM (`template.yaml`)** | 上記リソースを `ap-northeast-1` に定義・デプロイする |

## デプロイ済みエンドポイント（例）

| 項目 | 値 |
|------|-----|
| リージョン | `ap-northeast-1` |
| スタック名 | `inquiry-app-aws` |
| API | CloudFormation Output `ApiEndpoint` |
| フロント | CloudFormation Output `CloudFrontURL` |

※ 実 URL は `sam deploy` 後の Outputs、または次で確認:

```powershell
$env:AWS_PROFILE = "deploy"
aws cloudformation describe-stacks --stack-name inquiry-app-aws --region ap-northeast-1 --query "Stacks[0].Outputs"
```

## 前提ツール

- AWS CLI v2（SSO プロファイル例: `deploy`）
- SAM CLI
- Node.js（フロントビルド）
- Python 3.11（Lambda ランタイムと揃える）

## デプロイ手順（ap-northeast-1）

```powershell
# 1) SSO
$env:AWS_PROFILE = "deploy"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"
$env:AWS_REGION = "ap-northeast-1"
aws sso login --profile deploy

# 2) API / DB / S3 / CloudFront
sam build
sam deploy --config-file samconfig.toml

# 3) Outputs 取得
$api = aws cloudformation describe-stacks --stack-name inquiry-app-aws --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text
$bucket = aws cloudformation describe-stacks --stack-name inquiry-app-aws --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text
$distId = aws cloudformation describe-stacks --stack-name inquiry-app-aws --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
$cf = aws cloudformation describe-stacks --stack-name inquiry-app-aws --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text

# 4) フロントビルド（API URL を埋め込み）→ S3 → CloudFront 無効化
$env:VITE_API_BASE_URL = $api
Push-Location frontend
npm ci
npm run build
Pop-Location
aws s3 sync frontend/dist "s3://$bucket/" --delete --region ap-northeast-1
aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --region ap-northeast-1
Write-Host "Frontend: $cf"
```

## ローカル開発（フロントのみ）

```powershell
cd frontend
copy .env.example .env
# .env に VITE_API_BASE_URL=<ApiEndpoint> を設定
npm install
npm run dev
```

## スタック削除（ロールバック）

```powershell
$env:AWS_PROFILE = "deploy"
# S3 にオブジェクトがあるとバケット削除に失敗する場合があるため先に空にする
$bucket = aws cloudformation describe-stacks --stack-name inquiry-app-aws --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text
aws s3 rm "s3://$bucket" --recursive --region ap-northeast-1
sam delete --stack-name inquiry-app-aws --region ap-northeast-1 --no-prompts
```

## API 契約（概要）

- `POST /inquiries` → `201` + 作成オブジェクト
- `GET /inquiries` → `200` + `{ "items": [...] }`
- `DELETE /inquiries/{id}` → `204` / 未検出 `404`
- エラー: `{ "error": "...", "message": "..." }`
