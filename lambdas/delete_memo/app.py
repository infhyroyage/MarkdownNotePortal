"""指定した1件の保存済みメモを削除する"""

import json
import logging
from typing import Any, Dict

from lambdas.layer.python.utils import (
    AuthenticationError,
    get_dynamodb_client,
    get_user_id,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    指定した1件の保存済みメモを削除するLambda関数ハンドラー

    Args:
        event (Dict[str, Any]): API Gatewayイベント
        context (Any): Lambda実行コンテキスト

    Returns:
        Dict[str, Any]: API Gatewayレスポンス
    """
    try:
        user_id = get_user_id(event)

        # memo_idの取得
        memo_id = event.get("pathParameters", {}).get("memoId")
        if not memo_id:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "memoId is required"}),
            }

        # メモが見つからない場合は404エラーをレスポンス
        dynamodb = get_dynamodb_client()
        response = dynamodb.get_item(
            TableName="mkmemoportal-dynamodb",
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
        )
        if "Item" not in response:
            logger.info("Memo not found: user_id=%s, memo_id=%s", user_id, memo_id)
            return {
                "statusCode": 404,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "Memo not found"}),
            }

        # メモを削除
        dynamodb.delete_item(
            TableName="mkmemoportal-dynamodb",
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
        )

        logger.info("Memo deleted: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 204,
            "headers": {"Content-Type": "application/json"},
            "body": "",
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
