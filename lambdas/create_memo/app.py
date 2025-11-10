"""1件のメモを保存する"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from utils import AuthenticationError, get_dynamodb_client, get_user_id

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    1件のメモを保存するLambda関数ハンドラー

    Args:
        event (Dict[str, Any]): API Gatewayイベント
        context (Any): Lambda実行コンテキスト

    Returns:
        Dict[str, Any]: API Gatewayレスポンス
    """
    try:
        user_id = get_user_id(event)

        # リクエストボディの取得とパース
        body = json.loads(event.get("body", "{}"))
        title = body.get("title", "").strip()
        content = body.get("content", "")

        # バリデーションチェック
        if not title or len(title) < 1 or len(title) > 200:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(
                    {"message": "title must be between 1 and 200 characters"}
                ),
            }
        if not isinstance(content, str):
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "content must be a string"}),
            }

        # メモIDを生成して保存
        memo_id = str(uuid.uuid4())
        create_at = datetime.now(timezone.utc).isoformat()
        dynamodb = get_dynamodb_client()
        dynamodb.put_item(
            TableName="mkmemoportal-dynamodb",
            Item={
                "user_id": {"S": user_id},
                "memo_id": {"S": memo_id},
                "title": {"S": title},
                "content": {"S": content},
                "create_at": {"S": create_at},
            },
        )
        logger.info("Memo created: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 201,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"memoId": memo_id, "title": title, "lastUpdatedAt": create_at}),
        }

    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s", str(e))
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Request body is invalid"}),
        }
    except AuthenticationError as e:
        logger.error("Authentication error: %s", str(e))
        return {
            "statusCode": 401,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Not authenticated"}),
        }
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Internal server error"}),
        }
