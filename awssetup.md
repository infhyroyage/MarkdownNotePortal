# AWS 環境構築手順・削除手順

## 構築手順

### 1. 必要な前提条件の準備

1. AWS アカウントを用意する
2. AWS マネージドポリシー AdministratorAccess 相当の権限を持つ IAM ユーザーでログインし、アクセスキーを発行する
3. 当リポジトリで使用する以下の S3 バケット名をすべて決定する
   - Lambda 関数のビルドアーティファクトを保存するバケット
   - SPA のビルドアーティファクトを保存するバケット
4. Cognito Hosted UI でのログイン用に使用するユーザーのメールアドレス・パスワードをすべて決定する
5. 以下のツールを事前にインストールしておく:
   - Git
   - [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
6. 発行したアクセスキーを AWS CLI に設定する
7. GitHub アカウントを用意して、このリポジトリをフォークし、ローカル環境にクローンする

### 2. GitHub Actions 用シークレット・変数設定

当リポジトリの Setting > Secrets And variables > Actions より、以下の GitHub Actions 用シークレット・変数をすべて設定する。

#### シークレット

Secrets タブから「New repository secret」ボタンを押下して、下記の通りシークレットをすべて設定する。

| シークレット名        | シークレット値                                 |
| --------------------- | ---------------------------------------------- |
| AWS_ACCESS_KEY_ID     | 発行したアクセスキーのアクセスキー ID          |
| AWS_SECRET_ACCESS_KEY | 発行したアクセスキーのシークレットアクセスキー |

#### 変数

Variables タブから「New repository variable」ボタンを押下して、下記の通り変数をすべて設定する。

| 変数名                      | 変数値                                                  |
| --------------------------- | ------------------------------------------------------- |
| S3_LAMBDA_BUCKET_NAME       | Lambda 関数のビルドアーティファクトを保存するバケット名 |
| S3_SPA_BUCKET_NAME          | SPA のビルドアーティファクトを保存するバケット名        |
| COGNITO_HOSTED_UI_SUBDOMAIN | Cognito Hosted UI のドメイン                            |

### 3. AWS リソースのデプロイ

用意した AWS アカウントに対し、[technologystack.md](technologystack.md)に記載した AWS リソースをデプロイする。

1. 当リポジトリの Actions > 左側の Deploy All AWS Resources を押下する。
2. Deploy All AWS Resources の workflow が無効化されている場合は、workflow を有効化する。
3. 右上の「Re-run jobs」から「Re-run all jobs」を押下し、確認ダイアログ内の「Re-run jobs」ボタンを押下する。

### 4. Amazon Cognito ユーザープールへのサインアップ

デプロイした Amazon Cognito ユーザープールに対し、以下のコマンドを実行して、Cognito Hosted UI でのログイン用ユーザーを作成する:

```bash
USER_POOL_ID=$(aws cognito-idp list-user-pools \
  --max-results 60 \
  --query "UserPools[?Name=='mkmemoportal-cognito'].Id" \
  --output text)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username {メールアドレス} \
  --user-attributes Name=email,Value={メールアドレス} Name=email_verified,Value=true \
  --message-action SUPPRESS
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username {メールアドレス} \
  --password {パスワード} \
  --permanent
```

## 削除手順

1. 当リポジトリの各 workflow をすべて無効化する。
2. 当リポジトリの Setting > Secrets And variables > Actions より、Secrets・Variables タブから初期構築時に設定した各シークレット・変数に対し、ゴミ箱のボタンを押下する。
3. ターミナルを起動して以下のコマンドを実行し、Cognito Hosted UI でのログイン用ユーザーを削除する:

   ```bash
   USER_POOL_ID=$(aws cognito-idp list-user-pools \
     --max-results 60 \
     --query "UserPools[?Name=='mkmemoportal-cognito'].Id" \
     --output text)
   aws cognito-idp admin-delete-user \
     --user-pool-id $USER_POOL_ID \
     --username {メールアドレス}
   ```

4. 3 のターミナルで以下のコマンドを実行し、それぞれの Amazon S3 バケット内のすべてのオブジェクトを削除する:

   ```bash
   aws s3 rm s3://{Lambda関数のビルドアーティファクトを保存するバケット名} --recursive
   aws s3 rm s3://{SPAのビルドアーティファクトを保存するバケット名} --recursive
   ```

5. 3 のターミナルで以下のコマンドを実行し、CloudFormation テンプレートでデプロイしたスタックを削除する:

   ```bash
   aws cloudformation delete-stack --stack-name mkmemoportal-stack
   ```

6. 3 のターミナルで以下のコマンドを実行し、Lambda 関数のビルドアーティファクトを保存するバケット名を削除する:

   ```bash
   aws s3 rb s3://{Lambda関数のビルドアーティファクトを保存するバケット名}
   ```
