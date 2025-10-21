"""ユーティリティ関数"""

import os

import boto3


def get_dynamodb_client():
    """DynamoDBクライアントを取得する

    Returns:
        boto3.client: DynamoDBクライアント
    """
    endpoint_url = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint_url:
        # ローカル環境のDynamoDB(DynamoDB Local)
        return boto3.client(
            "dynamodb",
            endpoint_url=endpoint_url,
            region_name="fakeRegion",
            aws_access_key_id="fakeMyKeyId",
            aws_secret_access_key="fakeSecretAccessKey",
        )

    # AWS環境のDynamoDB
    return boto3.client("dynamodb")
