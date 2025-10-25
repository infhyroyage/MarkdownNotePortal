"""指定した1件の保存済みメモを削除する"""

import json
import logging
import os
from typing import Any, Dict

from utils import get_dynamodb_client

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
        # user_idの取得(Cognito JWTトークンのsubクレームから)
        # ローカル環境の場合は認証をスキップ
        is_local = os.environ.get("IS_LOCAL", "false").lower() == "true"
        
        if is_local:
            user_id = "local_user"
        else:
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

        # DynamoDBからメモを取得して存在確認
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

        # メモを削除
        dynamodb.delete_item(
            TableName=table_name,
            Key={"user_id": {"S": user_id}, "memo_id": {"S": memo_id}},
        )

        logger.info("メモを削除しました: user_id=%s, memo_id=%s", user_id, memo_id)

        return {
            "statusCode": 204,
            "headers": {"Content-Type": "application/json"},
            "body": "",
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
