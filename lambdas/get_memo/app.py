"""指定した1件の保存済みメモのタイトルと内容(Markdown文字列)を返す"""

import json
import logging
import os
from typing import Any, Dict

from lambdas.layer.python.utils import get_dynamodb_client

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    指定した1件の保存済みメモのタイトルと内容(Markdown文字列)を返すLambda関数ハンドラー

    Args:
        event (Dict[str, Any]): API Gatewayイベント
        context (Any): Lambda実行コンテキスト

    Returns:
        Dict[str, Any]: API Gatewayレスポンス
    """
    try:
        # user_idの取得(Cognito JWTトークンのsubクレームから)
        # ローカル環境の場合は認証をスキップ
        if os.environ.get("IS_LOCAL", "false").lower() == "true":
            user_id = "local_user"
        else:
            authorizer = event.get("requestContext", {}).get("authorizer", {})
            user_id = authorizer.get("claims", {}).get("sub")
            if not user_id:
                return {
                    "statusCode": 401,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"message": "Not authenticated"}),
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

        # レスポンスの整形
        item = response["Item"]
        memo = {
            "memoId": item.get("memo_id", {}).get("S", ""),
            "title": item.get("title", {}).get("S", ""),
            "content": item.get("content", {}).get("S", ""),
        }

        logger.info("Memo retrieved: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(memo),
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
