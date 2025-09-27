"""指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するユニットテスト"""

from typing import Any, Dict

from lambdas.update_memo.app import lambda_handler


def test_lambda_handler() -> None:
    """lambda_handler関数のテスト"""
    event: Dict[str, Any] = {}
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 200
    assert response["body"] == "Not Implemented"
