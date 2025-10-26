"""ユーティリティ関数"""

import os
from typing import Any, Dict

import boto3


def get_dynamodb_client():
    """
    DynamoDBクライアントを取得する

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


def get_user_id(event: Dict[str, Any]) -> str:
    """
    API GatewayのCognito Authorizerでの認証で生成したCognito JWTトークンのsubクレームからuser_idを取得する

    Args:
        event (Dict[str, Any]): API Gatewayイベント

    Returns:
        str: user_idの文字列

    Raises:
        AuthenticationError: 認証エラー
    """
    # ローカル環境の場合は認証が存在しないため、"local_user"を返す
    if os.environ.get("IS_LOCAL", "false").lower() == "true":
        return "local_user"

    user_id = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
        .get("sub")
    )
    if not user_id:
        raise AuthenticationError("Not authenticated")
    return user_id


class AuthenticationError(Exception):
    """認証エラー"""
