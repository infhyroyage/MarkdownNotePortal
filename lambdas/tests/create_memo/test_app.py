"""1件のメモを保存するユニットテスト"""

from typing import Any, Dict

from lambdas.create_memo.app import lambda_handler


def test_lambda_handler() -> None:
    """lambda_handler関数のテスト"""
    event: Dict[str, Any] = {}
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 201
    assert response["body"] == "Not Implemented"
