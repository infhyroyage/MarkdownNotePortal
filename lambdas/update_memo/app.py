"""指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新する"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from utils import AuthenticationError, get_dynamodb_client, get_user_id

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するLambda関数ハンドラー

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

        # メモを更新
        update_at = datetime.now(timezone.utc).isoformat()
        dynamodb.update_item(
            TableName="mkmemoportal-dynamodb",
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
            UpdateExpression="SET title = :title, content = :content, update_at = :update_at",
            ExpressionAttributeValues={
                ":title": {"S": title},
                ":content": {"S": content},
                ":update_at": {"S": update_at},
            },
        )

        logger.info("Memo updated: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"memoId": memo_id, "title": title, "content": content, "lastUpdatedAt": update_at}),
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
            "body": json.dumps({"message": "Unexpected error"}),
        }
