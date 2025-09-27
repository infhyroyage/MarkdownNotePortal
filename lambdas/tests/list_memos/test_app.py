"""保存済みメモの一覧を返すユニットテスト"""

from typing import Any, Dict

from lambdas.list_memos.app import lambda_handler


def test_lambda_handler() -> None:
    """lambda_handler関数のテスト"""
    event: Dict[str, Any] = {}
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 200
    assert response["body"] == "Not Implemented"
