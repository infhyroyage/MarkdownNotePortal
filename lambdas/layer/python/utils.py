"""ユーティリティ関数"""

import boto3


def get_dynamodb_client():
    """DynamoDBクライアントを取得する

    Returns:
        boto3.client: DynamoDBクライアント
    """
    return boto3.client("dynamodb")
