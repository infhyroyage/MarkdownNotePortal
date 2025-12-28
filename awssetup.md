# AWS 環境構築手順・削除手順

## 構築手順

### 1. 必要な前提条件の準備

1. AWS アカウントを用意する。
2. 当リポジトリで使用する以下の S3 バケット名をすべて決定する。
   - Lambda 関数のビルドアーティファクトを保存するバケット
   - SPA のビルドアーティファクトを保存するバケット
3. Cognito Hosted UI でのログイン用に使用するユーザーのメールアドレス・パスワードをすべて決定する。
4. 以下のツールを事前にインストールしておく:
   - Git
   - [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
5. GitHub アカウントを用意して、このリポジトリをフォークし、ローカル環境にクローンする。

### 2. GitHub Actions 用の IAM OIDC プロバイダーの作成

> [!NOTE]
> あらかじめ、GitHub Actions 用の IAM OIDC プロバイダーが AWS アカウントに作成済みの場合、本手順はスキップすること。

一時的な認証情報を用いて、GitHub Actions から AWS リソースへ安全にアクセスするため、AWS アカウントに GitHub Actions 用の IAM OIDC プロバイダーを作成する。

1. AWS マネジメントコンソールにサインインし、IAM コンソールを開く。
2. 左側のナビゲーションペインから「ID プロバイダ」を選択し、「プロバイダを追加」ボタンを押下する。
3. 以下の通り設定する:
   - **プロバイダのタイプ**: OpenID Connect
   - **プロバイダの URL**: `https://token.actions.githubusercontent.com`
   - **対象者**: `sts.amazonaws.com`
4. 「プロバイダを追加」ボタンを押下する。

### 3. GitHub Actions 用の IAM ロールの作成

GitHub Actions のワークフローが AWS CLI を実行して AWS リソースを操作するための IAM ロールを作成する。

1. AWS マネジメントコンソールにサインインし、IAM コンソールを開く。
2. 左側のナビゲーションペインから「ロール」を選択し、「ロールを作成」ボタンを押下する。
3. 「信頼されたエンティティタイプ」で「カスタム信頼ポリシー」を選択する。
4. 「カスタム信頼ポリシー」のテキストエリアに、以下の json 形式の文字列を入力して、「次へ」ボタンを押下する:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::(AWSアカウントID):oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": [
               "repo:(GitHubユーザー名またはGitHub Organization名)/(フォークしたGitHubリポジトリ名):ref:refs/heads/main",
               "repo:(GitHubユーザー名またはGitHub Organization名)/(フォークしたGitHubリポジトリ名):ref:refs/heads/main"
             ]
           }
         }
       }
     ]
   }
   ```
5. 「許可を追加」画面で、以下の AWS 管理ポリシーを検索して選択し、「次へ」ボタンを押下する:
   - AmazonS3FullAccess: S3 のフルアクセス権限
   - AWSCloudFormationFullAccess: CloudFormation のフルアクセス権限
   - AWSLambda_FullAccess: Lambda のフルアクセス権限
   - AWSWAFFullAccess: WAF のフルアクセス権限
   - CloudFrontFullAccess: CloudFront のフルアクセス権限
   - CloudWatchLogsFullAccess: CloudWatch Logs のフルアクセス権限
6. 「ロール名」に任意の IAM ロール名を入力し、「ロールを作成」ボタンを押下して、IAM ロールを作成する。
7. ロールの一覧から作成した IAM ロールを選択し、ロールの ARN(`arn:aws:iam::(AWSアカウントID):role/(IAMロール名)`)を手元に控える。

### 4. GitHub Actions 用シークレット・変数設定

当リポジトリの Setting > Secrets And variables > Actions より、以下の GitHub Actions 用シークレット・変数をすべて設定する。

#### シークレット

Secrets タブから「New repository secret」ボタンを押下して、下記の通りシークレットをすべて設定する。

| シークレット名                  | シークレット値                    |
| ------------------------------- | --------------------------------- |
| AWS_ARN_IAM_ROLE_GITHUB_ACTIONS | 前手順で作成した IAM ロールの ARN |

#### 変数

Variables タブから「New repository variable」ボタンを押下して、下記の通り変数をすべて設定する。

| 変数名                      | 変数値                                                  |
| --------------------------- | ------------------------------------------------------- |
| S3_LAMBDA_BUCKET_NAME       | Lambda 関数のビルドアーティファクトを保存するバケット名 |
| S3_SPA_BUCKET_NAME          | SPA のビルドアーティファクトを保存するバケット名        |
| COGNITO_HOSTED_UI_SUBDOMAIN | Cognito Hosted UI のドメイン                            |

### 5. AWS リソースのデプロイ

用意した AWS アカウントに対し、[technologystack.md](technologystack.md)に記載した AWS リソースをデプロイする。

1. 当リポジトリの Actions > 左側の Deploy All AWS Resources を押下する。
2. Deploy All AWS Resources の workflow が無効化されている場合は、workflow を有効化する。
3. 右上の「Re-run jobs」から「Re-run all jobs」を押下し、確認ダイアログ内の「Re-run jobs」ボタンを押下する。

### 6. Amazon Cognito ユーザープールへのサインアップ

デプロイした Amazon Cognito ユーザープールに対し、以下のコマンドを実行して、Cognito Hosted UI でのログイン用ユーザーを作成する:

```bash
USER_POOL_ID=$(aws cognito-idp list-user-pools \
  --max-results 1 \
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

### 7. Web アプリケーションへのアクセス

以下のコマンドを実行して Web アプリケーションの URL を入手し、任意のブラウザを起動して、入手した URL をアドレスバーに入力してアクセスする:

```bash
aws cloudformation describe-stacks \
  --stack-name mkmemoportal-stack \
  --query "Stacks[0].Outputs[?OutputKey=='MarkdownMemoPortalUrl'].OutputValue" \
  --output text
```

## 削除手順

1. 当リポジトリの各 workflow をすべて無効化する。
2. 当リポジトリの Setting > Secrets And variables > Actions より、Secrets・Variables タブから初期構築時に設定した各シークレット・変数に対し、ゴミ箱のボタンを押下する。
3. ターミナルを起動して以下のコマンドを実行し、Cognito Hosted UI でのログイン用ユーザーを削除する:

   ```bash
   USER_POOL_ID=$(aws cognito-idp list-user-pools \
     --max-results 1 \
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
