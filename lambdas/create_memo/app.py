"""1件のメモを保存する"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from utils import get_dynamodb_client

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
        # リクエストボディの取得とパース
        body = json.loads(event.get("body", "{}"))
        title = body.get("title", "").strip()
        content = body.get("content", "")

        # バリデーション
        if not title or len(title) < 1 or len(title) > 200:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(
                    {"message": "titleは1〜200文字である必要があります"}
                ),
            }

        if not isinstance(content, str):
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "contentは文字列である必要があります"}),
            }

        # user_idの取得（Cognito JWTトークンのsubクレームから）
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        user_id = authorizer.get("claims", {}).get("sub")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "認証が必要です"}),
            }

        # メモIDの生成
        memo_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        # DynamoDBへの保存
        table_name = os.environ.get("TABLE_NAME")
        if not table_name:
            raise ValueError("TABLE_NAME環境変数が設定されていません")

        dynamodb = get_dynamodb_client()
        dynamodb.put_item(
            TableName=table_name,
            Item={
                "user_id": {"S": user_id},
                "memo_id": {"S": memo_id},
                "title": {"S": title},
                "content": {"S": content},
                "created_at": {"S": created_at},
            },
        )

        logger.info("メモを作成しました: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 201,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"memoId": memo_id, "title": title}),
        }

    except json.JSONDecodeError as e:
        logger.error("JSONパースエラー: %s", str(e))
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "リクエストボディが不正です"}),
        }
    except ValueError as e:
        logger.error("バリデーションエラー: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "サーバーエラーが発生しました"}),
        }
    except Exception as e:  # pylint: disable=broad-except
        logger.error("予期しないエラー: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "サーバーエラーが発生しました"}),
        }
