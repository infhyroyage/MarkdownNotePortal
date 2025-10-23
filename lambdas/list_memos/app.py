"""保存済みメモの一覧を返す"""

import json
import logging
import os
from typing import Any, Dict, List

from utils import get_dynamodb_client

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    保存済みのメモの一覧を返すLambda関数ハンドラー

    Args:
        event (Dict[str, Any]): API Gatewayイベント
        context (Any): Lambda実行コンテキスト

    Returns:
        Dict[str, Any]: API Gatewayレスポンス
    """
    try:
        # user_idの取得（Cognito JWTトークンのsubクレームから）
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        user_id = authorizer.get("claims", {}).get("sub")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "認証が必要です"}),
            }

        # DynamoDBからメモ一覧を取得
        table_name = os.environ.get("TABLE_NAME")
        if not table_name:
            raise ValueError("TABLE_NAME環境変数が設定されていません")

        dynamodb = get_dynamodb_client()
        response = dynamodb.query(
            TableName=table_name,
            KeyConditionExpression="user_id = :user_id",
            ExpressionAttributeValues={":user_id": {"S": user_id}},
            ProjectionExpression="memo_id, title",
        )

        # レスポンスの整形
        items: List[Dict[str, str]] = []
        for item in response.get("Items", []):
            items.append(
                {
                    "memoId": item.get("memo_id", {}).get("S", ""),
                    "title": item.get("title", {}).get("S", ""),
                }
            )

        logger.info("メモ一覧を取得しました: user_id=%s, count=%d", user_id, len(items))

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"items": items}),
        }

    except ValueError as e:
        logger.error("バリデーションエラー: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "サーバーエラーが発生しました"}),
        }
    except Exception as e:
        logger.error("予期しないエラー: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "サーバーエラーが発生しました"}),
        }
