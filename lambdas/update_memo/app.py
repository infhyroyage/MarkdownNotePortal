"""指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新する"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

from utils import get_dynamodb_client

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
        # user_idの取得（Cognito JWTトークンのsubクレームから）
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        user_id = authorizer.get("claims", {}).get("sub")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "認証が必要です"}),
            }

        # memo_idの取得
        path_parameters = event.get("pathParameters", {})
        memo_id = path_parameters.get("memoId")

        if not memo_id:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "memoIdが指定されていません"}),
            }

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

        # 更新日時の生成
        updated_at = datetime.now(timezone.utc).isoformat()

        # DynamoDBでメモを更新
        table_name = os.environ.get("TABLE_NAME")
        if not table_name:
            raise ValueError("TABLE_NAME環境変数が設定されていません")

        dynamodb = get_dynamodb_client()

        # メモの存在確認
        get_response = dynamodb.get_item(
            TableName=table_name,
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
        )

        if "Item" not in get_response:
            logger.info("メモが見つかりません: user_id=%s, memo_id=%s", user_id, memo_id)
            return {
                "statusCode": 404,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "メモが見つかりません"}),
            }

        # メモを更新
        dynamodb.update_item(
            TableName=table_name,
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
            UpdateExpression="SET title = :title, content = :content, updated_at = :updated_at",
            ExpressionAttributeValues={
                ":title": {"S": title},
                ":content": {"S": content},
                ":updated_at": {"S": updated_at},
            },
        )

        logger.info("メモを更新しました: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(
                {"memoId": memo_id, "title": title, "content": content}
            ),
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
    except Exception as e:
        logger.error("予期しないエラー: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "サーバーエラーが発生しました"}),
        }
