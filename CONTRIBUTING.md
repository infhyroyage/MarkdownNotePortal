# Contribution Guide

## 開発ツール

本システムの開発には、以下のツールとテクノロジーを使用する:

- Node.js (TypeScript ランタイム)
- TypeScript (Lambda 関数の実装言語)
- React (フロントエンドフレームワーク)
- Vite (ビルドツール・フロントエンドの開発サーバー)
- ESLint (Typescript コードの静的解析)
- Tailwind CSS + daisyUI (UI フレームワーク)
- Vitest (ユニットテストフレームワーク)
- Docker (ローカル環境構築)

## 開発時の実装規則

コード品質と一貫性を確保するため、以下の実装規則に従う:

- ほとんどのインフラストラクチャは Infrastructure as Code (IaC) で管理し、手動構成は行わない。本システムでは、フロントエンド・バックエンドの AWS リソースを統合的に定義する、以下の CloudFormation テンプレートファイルを使用する。
  - **`resources/cfn_ap-northeast-1.yaml`**: AWS WAF/Lambda@Edge 以外のすべての AWS リソースを ap-northeast-1 リージョンで定義
  - **`resources/cfn_us-east-1.yaml`**: AWS WAF/Lambda@Edge を us-east-1 リージョンで定義
- GitHub Actions と連携して CloudFormation スタックの構築・更新を行い、AWS リソースの継続的デプロイを行う。この GitHub Actions ワークフローは、GitHub リポジトリの main ブランチへの commit をトリガーとして実行される。
- AWS Lambda 関数間で共通する処理は Lambda レイヤーとして lambdas/layer に実装し、コードの重複を避ける。
- AWS Lambda 関数の型定義は lambdas/types に集約し、型安全性を確保する。
- AWS Lambda 関数のユニットテストは lambdas/tests に実装し、カバレッジ率 80%以上をみたすようにして、コード品質を担保する。AWS Lambda 関数のユニットテストは、以下のコマンドで実行する:
  ```bash
  cd lambdas && npm run test
  ```
- AWS Lambda 関数は、必ず ESLint の警告・エラーをすべて解消するように、コード品質を担保する。AWS Lambda 関数の ESLint の静的解析は、以下のコマンドで実行する:
  ```bash
  cd lambdas && npm run lint
  ```
- SPA の型定義は spa/src/types に集約し、型安全性を確保する。
- SPA は、必ず ESLint の警告・エラーをすべて解消するように、コード品質を担保する。SPA の ESLint の静的解析は、以下のコマンドで実行する:
  ```bash
  cd spa && npm run lint
  ```
- 以下の CI/CD パイプラインは GitHub Actions によって自動化する:
  - **`.github/workflows/build-and-deploy-lambdas.yaml`**: AWS Lambda 関数のテスト・ビルド・デプロイ
  - **`.github/workflows/build-and-deploy-spa.yaml`**: SPA のビルド・デプロイ
  - **`.github/workflows/deploy-resources.yaml`**: CloudFormation スタックでの AWS リソースのデプロイ、AWS Lambda 関数のテスト・ビルド・デプロイ、SPA のビルド・デプロイ
  - **`.github/workflows/lint-spa.yaml`**: Pull Request 発行時の SPA の ESLint 実行
  - **`.github/workflows/test-lint-lambdas.yaml`**: Pull Request 発行時の AWS Lambda 関数のユニットテスト・ESLint 実行

## プルリクエストの要件

プルリクエスト作成時は以下を満たすこと:

- [ ] 以下のコマンドを実行して、Lambda 関数のすべてのユニットテストが成功し、カバレッジを 80% 以上にする:
  ```bash
  cd lambdas && npm test
  ```
- [ ] 以下のコマンドを実行して、Lambda 関数の ESLint の警告・エラーをすべて解消する:
  ```bash
  cd lambdas && npm run lint
  ```
- [ ] 以下のコマンドを実行して、SPA の ESLint の警告・エラーをすべて解消する:
  ```bash
  cd spa && npm run lint
  ```
- [ ] ターゲットを main ブランチに設定している。

## 依存関係管理

本システムでは、セキュリティの脆弱性や新機能に対応するように定期的にパッケージのバージョンアップを自動的に提案する GitHub の機能である GitHub Dependabot を使用して、以下の実行方式で依存関係を`.github/dependabot.yaml`で管理する。

- Node.js パッケージ (Lambda 関数)
  - **実行スケジュール**: 毎週木曜日 10:00 (Asia/Tokyo)
  - **対象ファイル**: `lambdas/package.json`
  - **更新方式**: プルリクエストによる自動提案
  - **レビュー担当**: 指定されたリポジトリ管理者
- Node.js パッケージ (SPA)
  - **実行スケジュール**: 毎週木曜日 10:30 (Asia/Tokyo)
  - **対象ファイル**: `spa/package.json`
  - **更新方式**: プルリクエストによる自動提案
  - **レビュー担当**: 指定されたリポジトリ管理者
- GitHub Actions
  - **実行スケジュール**: 毎週木曜日 11:00 (Asia/Tokyo)
  - **対象ファイル**: `.github/workflows`配下の各 yaml ファイル
  - **更新方式**: プルリクエストによる自動提案
  - **レビュー担当**: 指定されたリポジトリ管理者
