# AGENTS.md

## Cursor Cloud specific instructions

### サービス概要

MarkdownNotePortal — Markdown形式でメモを管理するWebアプリケーション。React SPA(`spa/`)+ AWS Lambda バックエンド(`lambdas/`)+ DynamoDB の構成。ローカル開発ではDockerで Lambda と DynamoDB Local をエミュレートする。

### サービス起動手順

ローカル開発では以下の2つのサービスを起動する必要がある(詳細は `localsetup.md` 参照):

1. **Docker デーモンの起動**: このVMには systemd がないため、Docker は自動起動しない。バックエンド起動前に一度だけ `sudo dockerd > /tmp/dockerd.log 2>&1 &`(バックグラウンド)で起動しておく。`sudo docker info` で `Server Version` が返れば起動済み。
2. **バックエンド(Docker Compose)**: Lambda関数のビルド後に `docker compose up -d` で DynamoDB Local + 6つのLambda関数コンテナ(ポート9000〜9006)を起動。テーブル `mkmemoportal-dynamodb` は起動時に自動作成される。
3. **フロントエンド(Vite dev server)**: `cd spa && npm run dev` でポート5173に開発サーバーを起動。`http://localhost:5173` にアクセスするとメモの新規作成・編集は**自動保存**される(明示的な保存ボタンはない)。

### 注意事項・Gotcha

- **Node.js は v24 が必須**: プロジェクトは Node 24(`public.ecr.aws/lambda/nodejs:24` と `@types/node@^24`)を前提とする。このVMでは非対話シェルの `PATH` 先頭に `/exec-daemon/node`(v22)が割り込むため、素の `node` が v22 になることがある。Node 24 は nvm で導入済み(`nvm alias default` が 24、`~/.bashrc` で対話シェルの先頭 `PATH` に前置済み)。ビルド/実行前に `node -v` が v24 であることを確認し、v22 なら `source ~/.nvm/nvm.sh && nvm use 24` で切り替える。
- **`npm install` を Node 22 で実行しない**: Node 22(npm 10)で `npm install` すると `package-lock.json` から `libc` フィールドが除去され差分が発生する。依存の再取得はロックファイルを書き換えない `npm ci`(起動時の update script でも使用)で行うこと。
- **Docker 29 + fuse-overlayfs 設定**: このVMではカーネル制約のため `/etc/docker/daemon.json` で `storage-driver=fuse-overlayfs` かつ `features.containerd-snapshotter=false`、iptables は legacy を使用する(設定済み・スナップショットに保持)。この設定なしでは dockerd が起動しない。
- **DynamoDB Local の権限問題**: `docker/dynamodb/` ディレクトリに書き込み権限が必要。初回起動時に `mkdir -p docker/dynamodb && chmod 777 docker/dynamodb` を実行すること。権限が不足すると DynamoDB Local が SQLite エラーで起動に失敗する。
- **Lambda ビルドが必須**: Docker Compose で Lambda コンテナを起動する前に `cd lambdas && npm run build` が必要(`lambdas/dist/` をボリュームマウントしているため)。ビルドは Node 24 で実行すること。
- **ローカル認証は無効**: ローカル環境では Cognito 認証がバイパスされ、`Authorization` ヘッダーの検証も行わない。
- **パッケージマネージャー**: npm を使用(`package-lock.json` が `lambdas/` と `spa/` と `resources/` に存在)。

### Lint・テスト・ビルドコマンド

`CONTRIBUTING.md` を参照。主要なコマンド:

- `cd lambdas && npm run lint` — Lambda関数のESLint
- `cd lambdas && npm run test` — Lambda関数のVitest(カバレッジ80%以上が必要)
- `cd lambdas && npm run build` — Lambda関数のビルド(Viteベース)
- `cd resources && npm run lint` — AWS CDKのESLint
- `cd resources && npm run test` — AWS CDKのVitest(カバレッジ80%以上が必要)
- `cd resources && npm run build` — AWS CDKの合成 (`cdk synth`)
- `cd spa && npm run lint` — SPAのESLint
- `cd spa && npm run dev` — Vite開発サーバー(ポート5173)
