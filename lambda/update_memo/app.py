"""指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新する"""

import logging
from typing import Any, Dict

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

    return {"statusCode": 200, "body": "Not Implemented"}
