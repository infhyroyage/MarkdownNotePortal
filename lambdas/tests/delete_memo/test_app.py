"""指定した1件の保存済みメモを削除するユニットテスト"""

from typing import Any, Dict

from lambdas.delete_memo.app import lambda_handler


def test_lambda_handler() -> None:
    """lambda_handler関数のテスト"""
    event: Dict[str, Any] = {}
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 204
    assert response["body"] == "Not Implemented"
