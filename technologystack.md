# 技術スタック

## 1. 要件と概要

### 1.1 要件

手軽に Markdown 形式でメモを参照・保存できる Web アプリケーションを提供する。

### 1.2 ソリューション概要

Cognito Hosted UI で構成されたログインページ(ルート)でログインし、Amazon S3 にホスティングして Amazon CloudFront から配信されたシングルページアプリケーション(SPA)で、ワークスペースページにアクセスする。ワークスペースページでは、Amazon Cognito User Pool オーソライザーを有効にした Amazon API Gateway 経由で API の認証・認可を行い、Amazon DynamoDB をデータベースとする AWS Lambda で構成したバックエンド処理により、メモ管理を行う。

## 2. アーキテクチャ

### 2.1 使用サービス

本システムでは以下のサービスを利用して、セキュアかつスケーラブルかつ耐障害性の高いフロントエンド・バックエンドのアーキテクチャを構築する:

- AWS
  - Amazon API Gateway (バックエンドの API 管理)
  - Amazon CloudFront (フロントエンドを構成する CDN サービス)
  - Amazon CloudWatch (ログ・モニタリング)
  - Amazon Cognito (ユーザープールによる認証機能の提供)
  - Amazon DynamoDB (保存したメモの管理)
  - Amazon S3 (フロントエンド・バックエンドのビルドアーティファクト格納)
  - AWS Backup (バックアップ管理)
  - AWS CloudFormation (スタック管理)
  - AWS IAM (権限管理)
  - AWS Lambda (バックエンドのロジック実装)
  - AWS Lambda@Edge (CloudFront エッジロケーションでのリクエスト処理)
  - AWS Shield (Web アプリケーションの DDoS 攻撃を防御)
  - AWS WAF (Web アプリケーション用ファイアウォール)
- GitHub (コードリポジトリ)
- GitHub Actions (CloudFormation スタックの CI/CD パイプライン)

### 2.2 AWS リソース構成

以下の表は、本システムのフロントエンド・バックエンドで使用する主要な AWS リソースとその役割を示している:

| AWS リソース名 (論理 ID)                  | AWS サービス       | リージョン     | 概要                                                           |
| ----------------------------------------- | ------------------ | -------------- | -------------------------------------------------------------- |
| (ユーザー指定)                            | Amazon S3          | ap-northeast-1 | Lambda 関数のビルドアーティファクトを保存するバケット          |
| (ユーザー指定)                            | Amazon S3          | us-east-1      | Lambda@Edge 関数のビルドアーティファクトを保存するバケット     |
| (ユーザー指定)                            | Amazon S3          | ap-northeast-1 | SPA のビルドアーティファクトを保存するバケット                 |
| `mkmemoportal-apig`                       | Amazon API Gateway | ap-northeast-1 | Cognito User Pool オーソライザーを適用した API エンドポイント  |
| `mkmemoportal-cloudfront`                 | Amazon CloudFront  | ap-northeast-1 | SPA を配信する CDN                                             |
| `mkmemoportal-cognito`                    | Amazon Cognito     | ap-northeast-1 | ユーザー管理、認証・認可を行うユーザープール                   |
| `mkmemoportal-dynamodb`                   | Amazon DynamoDB    | ap-northeast-1 | メモを保存するテーブル (PK: `user_id`, SK: `memo_id`)          |
| `mkmemoportal-lambda-create-memo`         | AWS Lambda         | ap-northeast-1 | \[POST\] /memo のバックエンド処理を行う Lambda 関数            |
| `mkmemoportal-lambda-delete-memo`         | AWS Lambda         | ap-northeast-1 | \[DELETE\] /memo/{memoId} のバックエンド処理を行う Lambda 関数 |
| `mkmemoportal-lambda-get-memo`            | AWS Lambda         | ap-northeast-1 | \[GET\] /memo/{memoId} のバックエンド処理を行う Lambda 関数    |
| `mkmemoportal-lambda-list-memos`          | AWS Lambda         | ap-northeast-1 | \[GET\] /memo のバックエンド処理を行う Lambda 関数             |
| `mkmemoportal-lambda-update-memo`         | AWS Lambda         | ap-northeast-1 | \[PUT\] /memo/{memoId} のバックエンド処理を行う Lambda 関数    |
| `mkmemoportal-lambda-edge-viewer-request` | AWS Lambda@Edge    | us-east-1      | CloudFront ビューワーリクエストを処理する Lambda@Edge 関数     |
| `mkmemoportal-stack-ap-northeast-1`       | AWS CloudFormation | ap-northeast-1 | ap-northeast-1 リージョンでの AWS リソースを管理するスタック   |
| `mkmemoportal-stack-us-east-1`            | AWS CloudFormation | us-east-1      | us-east-1 リージョンでの AWS リソースを管理するスタック        |
| `mkmemoportal-waf`                        | AWS WAF            | us-east-1      | CloudFront ディストリビューションにアタッチする Web ACL        |

### 2.3 AWS アーキテクチャー図

以下の図は、システム全体のアーキテクチャを示している:

![architecture.drawio](architecture.drawio.svg)

## 3. コア機能の実装詳細

### 3.1 認証・認可システム

Amazon Cognito ユーザープールを用いて、以下の方式により認証・認可を行う。

- Cognito Hosted UI を用いた Authorization Code (PKCE) フローでのサインイン方式を採用する。
- Cognito Hosted UI・SPA でのセルフサインアップは無効化し、サインアップは初期セットアップ時に管理者が手動登録する運用とする。
- ログインページは Cognito Hosted UI を採用し、ログイン成功後に CloudFront から配信された SPA のルートページにコールバックする。
- 認証処理は CloudFront のビューワーリクエストに関連付けた Lambda@Edge で、AWS Systems Manager Parameter Store からパラメーターを取得しながら実行する。
- ログイン成功時に取得するアクセストークンはブラウザの Cookie で管理し、アクセストークンの有効期限は 60 分とする。
- CloudFront へのリクエスト時に、Lambda@Edge がアクセストークンの有効性をチェックし、有効でない場合は Cognito Hosted UI のログインページにリダイレクトする。
- SPA からの API 呼び出しには、Cookie から取得したアクセストークンを `Authorization` ヘッダーに付与することで、API の認証を行う。API の認証に失敗した場合は、Cognito Hosted UI のログインページにリダイレクトする。
- SPA からサインアウトを行うことができ、サインアウト時は Lambda@Edge がログアウト処理(Cookie 削除と Cognito ログアウトページへのリダイレクト)を行う。

なお、ローカル環境の場合、認証・認可は何も行わず、`Authorization` ヘッダーによる API の認証も何も行わない。

### 3.2 API 仕様

API Gateway で以下の API エンドポイントを管理する。

- [POST] /memo
  - 概要: 1 件のメモを保存する。
  - リクエストボディ: `{ "title": string, "content": string }`
  - 成功レスポンス: `201 Created` `{ "memoId": string, "title": string }`
  - バリデーション: `title` は 1〜200 文字、`content` は Markdown 文字列
- [GET] /memo
  - 概要: 保存済みメモの一覧を返す。クエリパラメータ `search` を指定した場合、メモのタイトルまたはコンテンツに検索文字列が含まれるメモのみを返す(大文字小文字を区別しない)。
  - クエリパラメータ: `search` (省略可能)
  - 成功レスポンス: `200 OK` `{ "items": [{ "memoId": string, "title": string }] }`
- [GET] /memo/{memoId}
  - 概要: 指定した 1 件の保存済みのメモのタイトルと内容(Markdown 文字列)を返す。
  - 成功レスポンス: `200 OK` `{ "memoId": string, "title": string, "content": string }`
  - 取得不可: `404 Not Found`
- [PUT] /memo/{memoId}
  - 概要: 指定した 1 件の保存済みのメモのタイトルと内容(Markdown 文字列)を更新する。
  - リクエストボディ: `{ "title": string, "content": string }`
  - 成功レスポンス: `200 OK` `{ "memoId": string, "title": string, "content": string }`
  - バリデーション: `title` は 1〜200 文字、`content` は Markdown 文字列
- [DELETE] /memo/{memoId}
  - 概要: 指定した 1 件の保存済みのメモを削除する。
  - 成功レスポンス: `204 No Content`
  - 取得不可: `404 Not Found`

API Gateway には Cognito User Pool オーソライザーが設定されており、フロントエンドから付与したヘッダー `Authorization: Bearer <JWT>` の検証により、API の認可を強制する。
リクエストは全てログインユーザー単位でスコープされ、バックエンドはトークンの `sub` を `user_id` として用いてデータの分離を保証する。レスポンスは `application/json`とする。

### 3.3 DynamoDB テーブル仕様

以下の属性定義を持つ DynamoDB テーブル `mkmemoportal-dynamodb` を構築して、メモデータを管理する。

| 属性名       | データ型 | 必須 | キー               | 説明                                                           |
| ------------ | -------- | ---- | ------------------ | -------------------------------------------------------------- |
| `user_id`    | String   | ✓    | パーティションキー | ユーザー識別子 (Cognito JWT の `sub` クレーム)                 |
| `memo_id`    | String   | ✓    | ソートキー         | メモ識別子 (UUID 形式、システムが自動生成)                     |
| `title`      | String   | ✓    |                    | メモのタイトル (1〜200 文字)                                   |
| `content`    | String   | ✓    |                    | メモの内容 (Markdown 形式の文字列)                             |
| `created_at` | String   | ✓    |                    | メモの作成日時 (ISO 8601 形式、例: `2024-01-01T12:00:00Z`)     |
| `updated_at` | String   |      |                    | メモの最終更新日時 (ISO 8601 形式、例: `2024-01-01T12:00:00Z`) |

パーティションキー`user_id`、ソートキー`memo_id`とする構成により、以下の API アクセス時にメモデータを効率的に取得できる。

- [GET] /memo: `user_id`を指定して Query の DynamoDB API を実行して、特定のユーザーでのすべてのメモを取得。
- [GET] /memo/{memoId}: `user_id` と `memo_id` を組み合わせて指定して GetItem の DynamoDB API を実行して、特定のユーザーでの特定のメモを取得

## 3.4 DynamoDB テーブルのバックアップ

DynamoDB テーブル `mkmemoportal-dynamodb` は、自身の削除に伴うメモのデータの喪失に備え、 DynamoDB の PITR 機能ではなく AWS Backup で、以下の通り日次バックアップを取得する。

- **スケジュール**: 毎日 UTC 18:00(日本時間3:00)
- **保持期間**: 3 日間
- **保存先**: AWS Backup Vault `mkmemoportal-backup-vault`

### 3.5 UI/UX 設計

レスポンシブデザインに対応した Web アプリケーションを実現するために、Tailwind CSS によるモバイルファースト設計を採用する。
Tailwind CSS ベースな UI を統一的に提供するために、daisyUI を採用する。
システム設定と連動したダークモードも用意しており、ユーザーが柔軟に切替できる。
