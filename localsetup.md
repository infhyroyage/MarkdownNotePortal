# ローカル環境構築手順・削除手順

## 構築手順

1. 以下をすべてインストールする。

   - Docker Desktop
   - Git
   - Node.js v24

2. GitHub アカウントを用意して、このリポジトリをフォークし、ローカル環境にクローンする

3. ターミナルを起動して以下のコマンドを実行し、Lambda 関数の依存関係をインストールし、TypeScript コードをビルドする:

   ```bash
   pushd lambdas && npm install && npm run build && popd
   ```

4. 3 と同じターミナルで以下のコマンドを実行し、Docker Compose でそれぞれの Lambda 関数、および DynamoDB Local の Docker コンテナをすべて起動する。実行したターミナルはそのまま放置する:
   ```bash
   docker compose up
   ```
   実行後、以下の Docker コンテナが起動する。
   - **DynamoDB Local**(ポート番号:9000)
   - **[POST] /memo の Lambda 関数**(ポート番号:9001)
   - **[GET] /memo の Lambda 関数**(ポート番号:9002)
   - **[GET] /memo/{memoId} の Lambda 関数**(ポート番号:9003)
   - **[PUT] /memo/{memoId} の Lambda 関数**(ポート番号:9004)
   - **[DELETE] /memo/{memoId} の Lambda 関数**(ポート番号:9005)

> [!IMPORTANT]
> DynamoDB テーブル`mkmemoportal-dynamodb`は、上記コマンド実行時に`docker/scripts/create_table.sh`を自動実行して作成されるため、明示的にテーブルを手動作成する必要はない。

5. 4 とは別のターミナルで以下のコマンドを実行し、フロントエンドのディレクトリに移動して、Node.js の依存関係をインストールする:

   ```bash
   cd spa
   npm install
   ```

6. 5 と同じターミナルで以下のコマンドを実行し、Vite 開発サーバーを起動する:

   ```bash
   npm run dev
   ```

7. 任意のブラウザを起動し、アドレスバーに`http://localhost:5173` を入力してアクセスする。

## 削除手順

1. 構築手順の 7 で起動した Vite 開発サーバーのターミナルに対して Ctrl+C キーを入力し、起動した Vite 開発サーバーを停止する。

2. ターミナルを起動して以下のコマンドを実行し、構築手順の 4 で起動した Lambda 関数、および DynamoDB Local の Docker コンテナをすべて停止する:

   ```bash
   docker compose down
   ```

3. (オプション)DynamoDB Local のデータを全削除したい場合は、`docker/dynamodb`フォルダごと階層的に削除する。
