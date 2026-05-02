# AGENTS.md

## Cursor Cloud specific instructions

### サービス概要

MarkdownNotePortal — Markdown形式でメモを管理するWebアプリケーション。React SPA（`spa/`）+ AWS Lambda バックエンド（`lambdas/`）+ DynamoDB の構成。ローカル開発ではDockerで Lambda と DynamoDB Local をエミュレートする。

### サービス起動手順

ローカル開発では以下の2つのサービスを起動する必要がある（詳細は `localsetup.md` 参照）:

1. **バックエンド（Docker Compose）**: Lambda関数のビルド後に `docker compose up` で DynamoDB Local + 5つのLambda関数コンテナを起動
2. **フロントエンド（Vite dev server）**: `cd spa && npm run dev` でポート5173に開発サーバーを起動

### 注意事項・Gotcha

- **DynamoDB Local の権限問題**: `docker/dynamodb/` ディレクトリに書き込み権限が必要。初回起動時に `mkdir -p docker/dynamodb && chmod 777 docker/dynamodb` を実行すること。権限が不足すると DynamoDB Local が SQLite エラーで起動に失敗する。
- **Lambda ビルドが必須**: Docker Compose で Lambda コンテナを起動する前に `cd lambdas && npm run build` が必要（`lambdas/dist/` をボリュームマウントしているため）。
- **ローカル認証は無効**: ローカル環境では Cognito 認証がバイパスされ、`Authorization` ヘッダーの検証も行わない。
- **パッケージマネージャー**: npm を使用（`package-lock.json` が `lambdas/` と `spa/` の両方に存在）。

### Lint・テスト・ビルドコマンド

`CONTRIBUTING.md` を参照。主要なコマンド:

- `cd lambdas && npm run lint` — Lambda関数のESLint
- `cd lambdas && npm run test` — Lambda関数のVitest（カバレッジ80%以上が必要）
- `cd lambdas && npm run build` — Lambda関数のビルド（Viteベース）
- `cd spa && npm run lint` — SPAのESLint
- `cd spa && npm run dev` — Vite開発サーバー（ポート5173）
