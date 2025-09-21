# Contribution Guide

## 開発ツール

本システムの開発には、以下のツールとテクノロジーを使用する:

- Node.js (TypeScript ランタイム)
- React + TypeScript (フロントエンドフレームワーク)
- Vite (ビルドツール・開発サーバー)
- ESLint (コード静的解析)
- Tailwind CSS + shadcn/ui (UI フレームワーク)
- React Router (ルーティング)
- Axios (HTTP クライアント)
- Python (プログラミング言語)
- pytest (ユニットテスト)
- pylint (コード静的解析)

## ローカル開発環境のセットアップ

[localsetup.md](localsetup.md) 参照。

## 開発時の実装規則

コード品質と一貫性を確保するため、以下の実装規則に従う:

- ほとんどのインフラストラクチャは Infrastructure as Code (IaC) で管理し、手動構成は行わない。本システムでは、目的に応じて以下の CloudFormation テンプレートファイルを使用する:
  - **`frontend.yaml`**: フロントエンドの AWS リソースを定義
  - **`backend.yaml`**: バックエンドの AWS リソースを定義
- フロントエンド・バックエンドのそれぞれの AWS リソースのデプロイは、GitHub Actions と連携した CI/CD パイプラインを実行して AWS CloudFormation スタックの構築・更新により行う。この CI/CD パイプラインは、GitHub リポジトリの main ブランチへの commit をトリガーとして実行される。
- AWS Lambda 関数の Python のユニットテストは lambdas/tests に実装し、カバレッジ率 80%以上をみたすようにして、コード品質を担保する。ユニットテストは、以下のコマンドで実行する。
  ```bash
  pytest --cov=lambdas --cov-report=term-missing --cov-fail-under=80 lambdas/tests
  ```
- AWS Lambda 関数間で共通する処理は Lambda レイヤーとして lambdas/layer に実装し、コードの重複を避ける。
- AWS Lambda 関数は Python を用いてコーディングし、.pylintrc に記載した例外を除き、必ず Pylint の警告・エラーをすべて解消するように、コード品質を担保する。Pylint の静的解析は、以下のコマンドで実行する。
  ```bash
  pylint lambdas/**/*.py --disable=import-error
  ```
- 以下の CI/CD パイプラインは GitHub Actions によって自動化する:
  - **`.github/workflows/deploy-frontend.yaml`**: フロントエンドの AWS リソースのデプロイ
  - **`.github/workflows/build-and-deploy-backend.yaml`**: AWS Lambda 関数のユニットテスト、およびバックエンドの AWS リソースのデプロイ
  - **`.github/workflows/lint-frontend.yaml`**: Pull Request 発行時の ESLint 実行
  - **`.github/workflows/test-lint-backend.yaml`**: Pull Request 発行時の AWS Lambda 関数のユニットテスト・Pylint 実行

## プルリクエストの要件

プルリクエスト作成時は以下を満たすこと:

- [ ] 以下のコマンドを実行して、すべてのユニットテストが成功し、カバレッジを 80% 以上にする:
  ```bash
  pytest --cov=lambdas --cov-report=term-missing --cov-fail-under=80 lambdas/tests
  ```
- [ ] 以下のコマンドを実行して、Pylint の警告・エラーをすべて解消する:
  ```bash
  pylint lambdas/**/*.py --disable=import-error
  ```
- [ ] ターゲットを main ブランチに設定している。

## Python の依存関係管理

本システムでは、セキュリティの脆弱性や新機能に対応するように定期的にパッケージのバージョンアップを自動的に提案する GitHub の機能である GitHub Dependabot を使用して、以下の実行方式で依存関係を`.github/dependabot.yaml`で管理する。

- Python パッケージ
  - **実行スケジュール**: 毎週木曜日 10:00 (Asia/Tokyo)
  - **対象ファイル**: `requirements.txt`
  - **更新方式**: プルリクエストによる自動提案
  - **レビュー担当**: 指定されたリポジトリ管理者
- Node.js パッケージ
  - **実行スケジュール**: 毎週木曜日 10:30 (Asia/Tokyo)
  - **対象ファイル**: `package.json`
  - **更新方式**: プルリクエストによる自動提案
  - **レビュー担当**: 指定されたリポジトリ管理者
- Node.js パッケージ
  - **実行スケジュール**: 毎週木曜日 11:00 (Asia/Tokyo)
  - **対象ファイル**: `.github/workflows`配下の各 yaml ファイル
  - **更新方式**: プルリクエストによる自動提案
  - **レビュー担当**: 指定されたリポジトリ管理者
