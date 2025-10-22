"""DynamoDB Localにテーブルを自動作成するスクリプト"""

import boto3


def create_table_if_not_exists(client: boto3.client, table_name: str) -> None:
    """テーブルが存在しない場合のみ作成する

    Args:
        client: DynamoDBクライアント
        table_name: 作成するテーブル名
    """
    # テーブルが存在する場合は何もしない
    if table_name in client.list_tables()["TableNames"]:
        return

    # テーブルを作成
    client.create_table(
        TableName=table_name,
        AttributeDefinitions=[
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "memo_id", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "memo_id", "KeyType": "RANGE"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # テーブルがアクティブになるまで待機
    client.get_waiter("table_exists").wait(TableName=table_name)


if __name__ == "__main__":
    # DynamoDBクライアントを作成
    dynamodb_client = boto3.client(
        "dynamodb",
        endpoint_url="http://dynamodb-local:8000",
        region_name="fakeRegion",
        aws_access_key_id="fakeMyKeyId",
        aws_secret_access_key="fakeSecretAccessKey",
    )

    # テーブルを作成
    create_table_if_not_exists(dynamodb_client, "mkmemoportal-dynamodb")
