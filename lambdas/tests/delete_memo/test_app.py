"""指定した1件の保存済みメモを削除するユニットテスト"""

import json
from typing import Any, Dict
from unittest.mock import MagicMock, patch

from lambdas.delete_memo.app import lambda_handler


@patch("lambdas.delete_memo.app.get_dynamodb_client")
@patch("lambdas.delete_memo.app.os.environ.get")
def test_lambda_handler_success(mock_env_get, mock_get_dynamodb_client) -> None:
    """正常系: メモの削除が成功する"""
    # モックの設定
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.return_value = {
        "Item": {
            "memo_id": {"S": "test-memo-id"},
            "title": {"S": "テストメモ"},
            "content": {"S": "# テスト内容"},
        }
    }
    mock_get_dynamodb_client.return_value = mock_dynamodb

    # イベントの作成
    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    # 実行
    response = lambda_handler(event, context)

    # 検証
    assert response["statusCode"] == 204
    assert response["body"] == ""
    mock_dynamodb.get_item.assert_called_once()
    mock_dynamodb.delete_item.assert_called_once()


@patch("lambdas.delete_memo.app.get_dynamodb_client")
@patch("lambdas.delete_memo.app.os.environ.get")
def test_lambda_handler_not_found(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: メモが見つからない場合"""
    # モックの設定
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.return_value = {}
    mock_get_dynamodb_client.return_value = mock_dynamodb

    # イベントの作成
    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "non-existent-id"},
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    # 実行
    response = lambda_handler(event, context)

    # 検証
    assert response["statusCode"] == 404
    response_body = json.loads(response["body"])
    assert "見つかりません" in response_body["message"]
    mock_dynamodb.get_item.assert_called_once()
    mock_dynamodb.delete_item.assert_not_called()


@patch("lambdas.delete_memo.app.get_dynamodb_client")
@patch("lambdas.delete_memo.app.os.environ.get")
def test_lambda_handler_no_memo_id(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: memoIdが指定されていない場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {},
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "memoId" in response_body["message"]
    mock_dynamodb.get_item.assert_not_called()
    mock_dynamodb.delete_item.assert_not_called()


@patch("lambdas.delete_memo.app.get_dynamodb_client")
@patch("lambdas.delete_memo.app.os.environ.get")
def test_lambda_handler_no_user_id(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: user_idが取得できない場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "requestContext": {"authorizer": {}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 401
    response_body = json.loads(response["body"])
    assert "認証" in response_body["message"]
    mock_dynamodb.get_item.assert_not_called()
    mock_dynamodb.delete_item.assert_not_called()


@patch("lambdas.delete_memo.app.get_dynamodb_client")
@patch("lambdas.delete_memo.app.os.environ.get")
def test_lambda_handler_dynamodb_error(
    mock_env_get, mock_get_dynamodb_client
) -> None:
    """異常系: DynamoDBエラーが発生した場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.side_effect = Exception("DynamoDB error")
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 500
    response_body = json.loads(response["body"])
    assert "サーバーエラー" in response_body["message"]
