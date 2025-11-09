"""保存済みメモの一覧を返す"""

import json
import logging
from typing import Any, Dict, List

from utils import AuthenticationError, get_dynamodb_client, get_user_id

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
            ProjectionExpression="memo_id, title, create_at, update_at",
        )

        # レスポンスの整形
        items: List[Dict[str, str]] = []
        for item in response.get("Items", []):
            # update_atが存在する場合はupdate_at、存在しない場合はcreate_atを使用
            last_updated_at = item.get("update_at", {}).get("S") or item.get(
                "create_at", {}
            ).get("S", "")
            items.append(
                {
                    "memoId": item.get("memo_id", {}).get("S", ""),
                    "title": item.get("title", {}).get("S", ""),
                    "lastUpdatedAt": last_updated_at,
                }
            )

        # 最終更新日時の降順でソート
        items.sort(key=lambda x: x.get("lastUpdatedAt", ""), reverse=True)

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
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Internal server error"}),
        }
