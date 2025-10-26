"""保存済みメモの一覧を返す"""

import json
import logging
from typing import Any, Dict, List

from lambdas.layer.python.utils import (
    AuthenticationError,
    get_dynamodb_client,
    get_user_id,
)

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
        user_id = get_user_id(event)

        # メモ一覧を取得
        dynamodb = get_dynamodb_client()
        response = dynamodb.query(
            TableName="mkmemoportal-dynamodb",
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

        logger.info("Memo list retrieved: user_id=%s, count=%d", user_id, len(items))

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"items": items}),
        }

    except AuthenticationError as e:
        logger.error("Authentication error: %s", str(e))
        return {
            "statusCode": 401,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Not authenticated"}),
        }
    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Internal server error"}),
        }
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Internal server error"}),
        }
