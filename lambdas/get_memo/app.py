"""指定した1件の保存済みメモのタイトルと内容(Markdown文字列)を返す"""

import json
import logging
import os
from typing import Any, Dict

from utils import get_dynamodb_client

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

        # DynamoDBからメモを取得
        table_name = os.environ.get("TABLE_NAME")
        if not table_name:
            raise ValueError("TABLE_NAME環境変数が設定されていません")

        dynamodb = get_dynamodb_client()
        response = dynamodb.get_item(
            TableName=table_name,
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
        )

        # メモが見つからない場合
        if "Item" not in response:
            logger.info("メモが見つかりません: user_id=%s, memo_id=%s", user_id, memo_id)
            return {
                "statusCode": 404,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "メモが見つかりません"}),
            }

        # レスポンスの整形
        item = response["Item"]
        memo = {
            "memoId": item.get("memo_id", {}).get("S", ""),
            "title": item.get("title", {}).get("S", ""),
            "content": item.get("content", {}).get("S", ""),
        }

        logger.info("メモを取得しました: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(memo),
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
