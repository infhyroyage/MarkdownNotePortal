# 技術スタック

## 1. 要件と概要

### 1.1 要件

手軽に Markdown 形式でメモを参照・保存できる Web アプリケーションを提供する。

### 1.2 ソリューション概要

TODO(以下のような文章を作文予定)

```
Google PubSubHubbub Hub を経由した WebSub の仕組みを利用して YouTube ライブ配信開始イベントを検知し、ライブ配信の情報(配信タイトル、動画 URL、サムネイル画像 URL)を SMS で通知するように AWS Lambda を実行するサーバーレスアプリケーションを構築する。このアプローチにより、手動操作なしでリアルタイムな通知を実現する。
```

## 2. アーキテクチャ

### 2.1 使用サービス

#### AWS サービス

本システムでは、以下の AWS サービスを利用して、スケーラブルかつ耐障害性の高いアーキテクチャを構築する:

- Amazon API Gateway (バックエンドの API 管理)
- Amazon CloudFront (フロントエンドを構成する CDN サービス)
- Amazon CloudWatch (ログ・モニタリング)
- Amazon Cognito (ユーザープールによる認証機能の提供)
- Amazon DynamoDB (保存したメモの管理)
- Amazon S3 (フロントエンドのビルドファイルの格納)
- AWS CloudFormation (スタック管理)
- AWS IAM (権限管理)
- AWS Lambda (バックエンドのロジック実装)

#### 外部サービス

AWS 以外の外部サービスとも連携することにより、コア機能を実現する:

- GitHub (コードリポジトリ)
- GitHub Actions (フロントエンド・バックエンドの CI/CD パイプライン)

### 2.2 AWS リソース構成

以下の表は、本システムで使用する主要な AWS リソースとその役割を示している:

| AWS リソース名 (論理 ID)          | AWS サービス       | 概要                                                                      |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `mkmemoportal-apig`               | Amazon API Gateway | WebSub での YouTube ライブ配信通知を受け取る API エンドポイント           |
| `mkmemoportal-build`              | AWS CodeBuild      | ビルドプロセスを管理するアプリケーション                                  |
| `mkmemoportal-dynamodb`           | Amazon DynamoDB    | 作成した markdown 形式のメモを記録するデータベース                        |
| `mkmemoportal-lambda-get-notify`  | AWS Lambda         | WebSub サブスクリプション確認処理を行う Lambda 関数                       |
| `mkmemoportal-lambda-post-notify` | AWS Lambda         | WebSub での YouTube ライブ配信通知情報をもとに SMS で通知する Lambda 関数 |
| `mkmemoportal-lambda-websub`      | AWS Lambda         | Google PubSubHubbub Hub のサブスクリプションを再登録する Lambda 関数      |
| (ユーザー指定)                    | Amazon S3          | CI/CD パイプラインのビルドアーティファクトを保存するバケット              |
| `mkmemoportal-stack-backend`      | AWS CloudFormation | バックエンドの AWS リソースを管理するスタック                             |
| `mkmemoportal-stack-frontend`     | AWS CloudFormation | フロントエンドの AWS リソースを管理するスタック                           |

### 2.3 AWS アーキテクチャー図

以下の図は、システム全体のアーキテクチャを示している:

TODO

## 3. コア機能の実装詳細

### 3.1 認証システム

TODO

### 3.2 状態管理

以下の Jotai での Atom を用いた状態管理により、コンポーネント間でのデータ共有を実現する。

### 3.3 UI/UX 設計

レスポンシブデザインに対応した Web アプリケーションを実現するために、Tailwind CSS によるモバイルファースト設計を採用する。
Tailwind CSS ベースな UI を統一的に提供するために、daisyUI を採用する。
システム設定と連動したダークモードも用意しており、ユーザーが柔軟に切替できる。
