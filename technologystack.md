# 技術スタック

## 1. 要件と概要

### 1.1 要件

手軽に Markdown 形式でメモを参照・保存できる Web アプリケーションを提供する。

### 1.2 ソリューション概要

ログインページ(ルート)とワークスペースページの 2 画面構成である React + TypeScript 製のシングルページアプリケーション(SPA)を、Amazon S3 にホスティングし、Amazon CloudFront から配信する。Amazon Cognito User Pool オーソライザーを有効にした Amazon API Gateway 経由で API の認証・認可を行う。メモを Amazon DynamoDB に保存・参照・削除するバックエンド処理は、Node.js 製の AWS Lambda で行う。

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
  - AWS CloudFormation (スタック管理)
  - AWS IAM (権限管理)
  - AWS Lambda (バックエンドのロジック実装)
  - AWS Shield (Web アプリケーションの DDoS 攻撃を防御)
  - AWS WAF (Web アプリケーション用ファイアウォール)
- GitHub (コードリポジトリ)
- GitHub Actions (CloudFormation スタックの CI/CD パイプライン)

### 2.2 AWS リソース構成

以下の表は、本システムのフロントエンド・バックエンドで使用する主要な AWS リソースとその役割を示している:

| AWS リソース名 (論理 ID)          | AWS サービス       | 概要                                                           |
| --------------------------------- | ------------------ | -------------------------------------------------------------- |
| (ユーザー指定)                    | Amazon S3          | SPA・Lambda 関数 のビルドアーティファクトを保存するバケット    |
| `mkmemoportal-apig`               | Amazon API Gateway | Cognito User Pool オーソライザーを適用した API エンドポイント  |
| `mkmemoportal-cloudfront`         | Amazon CloudFront  | SPA を配信する CDN                                             |
| `mkmemoportal-cognito`            | Amazon Cognito     | ユーザー管理、認証・認可を行うユーザープール                   |
| `mkmemoportal-dynamodb`           | Amazon DynamoDB    | メモを保存するテーブル (PK: `user_id`, SK: `memo_id`)          |
| `mkmemoportal-lambda-create-memo` | AWS Lambda         | \[POST\] /memo のバックエンド処理を行う Lambda 関数            |
| `mkmemoportal-lambda-delete-memo` | AWS Lambda         | \[DELETE\] /memo/{memoId} のバックエンド処理を行う Lambda 関数 |
| `mkmemoportal-lambda-get-memo`    | AWS Lambda         | \[GET\] /memo/{memoId} のバックエンド処理を行う Lambda 関数    |
| `mkmemoportal-lambda-list-memos`  | AWS Lambda         | \[GET\] /memo のバックエンド処理を行う Lambda 関数             |
| `mkmemoportal-lambda-update-memo` | AWS Lambda         | \[PUT\] /memo/{memoId} のバックエンド処理を行う Lambda 関数    |
| `mkmemoportal-stack`              | AWS CloudFormation | システム全体の AWS リソースを管理する統合スタック              |
| `mkmemoportal-waf`                | AWS WAF            | CloudFront ディストリビューションにアタッチする Web ACL        |

### 2.3 AWS アーキテクチャー図

以下の図は、システム全体のアーキテクチャを示している:

TODO

## 3. コア機能の実装詳細

### 3.1 認証・認可システム

Amazon Cognito User Pool を用いて、以下の方式により認証・認可を行う。

- Authorization Code (PKCE) フローでのサインイン方式を採用する。
- Web アプリケーションでのセルフサインアップは無効化し、初期セットアップ時に管理者が手動でユーザー登録する。
- フロントエンドのログインページ(ルート)ではサインインを行うことができ、サインイン後はワークスペースページにリダイレクトする。
- サインイン時に取得するアクセストークンはブラウザの Session Storage で管理し、 `Authorization` ヘッダーにアクセストークン付与して API を呼び出す。
- ワークスペースページではサインアウトを行うことができ、サインアウト後はログインページ(ルート)にリダイレクトする。

### 3.2 API 仕様

API Gateway で以下の API エンドポイントを管理する。

- [POST] /memo

  - 概要: 1 件のメモを保存する。
  - リクエストボディ: `{ "title": string, "content": string }`
  - 成功レスポンス: `201 Created` `{ "memoId": string, "title": string }`
  - バリデーション: `title` は 1〜200 文字、`content` は Markdown 文字列

- [GET] /memo

  - 概要: 保存済みメモの一覧を返す。
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

### 3.3 UI/UX 設計

レスポンシブデザインに対応した Web アプリケーションを実現するために、Tailwind CSS によるモバイルファースト設計を採用する。
Tailwind CSS ベースな UI を統一的に提供するために、daisyUI を採用する。
システム設定と連動したダークモードも用意しており、ユーザーが柔軟に切替できる。
