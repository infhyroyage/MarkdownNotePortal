"""指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するユニットテスト"""

import json
from typing import Any, Dict
from unittest.mock import MagicMock, patch

from lambdas.update_memo.app import lambda_handler


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
@patch("lambdas.update_memo.app.datetime")
def test_lambda_handler_success(
    mock_datetime, mock_env_get, mock_get_dynamodb_client
) -> None:
    """正常系: メモの更新が成功する"""
    # モックの設定
    mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T00:00:00Z"
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.return_value = {
        "Item": {
            "memo_id": {"S": "test-memo-id"},
            "title": {"S": "古いタイトル"},
            "content": {"S": "古い内容"},
        }
    }
    mock_get_dynamodb_client.return_value = mock_dynamodb

    # イベントの作成
    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "body": json.dumps({"title": "新しいタイトル", "content": "# 新しい内容"}),
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    # 実行
    response = lambda_handler(event, context)

    # 検証
    assert response["statusCode"] == 200
    response_body = json.loads(response["body"])
    assert response_body["memoId"] == "test-memo-id"
    assert response_body["title"] == "新しいタイトル"
    assert response_body["content"] == "# 新しい内容"
    mock_dynamodb.get_item.assert_called_once()
    mock_dynamodb.update_item.assert_called_once()


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
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
        "body": json.dumps({"title": "新しいタイトル", "content": "# 新しい内容"}),
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
    mock_dynamodb.update_item.assert_not_called()


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
def test_lambda_handler_missing_title(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: titleが空の場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "body": json.dumps({"title": "", "content": "# 新しい内容"}),
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "title" in response_body["message"]
    mock_dynamodb.get_item.assert_not_called()
    mock_dynamodb.update_item.assert_not_called()


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
def test_lambda_handler_title_too_long(
    mock_env_get, mock_get_dynamodb_client
) -> None:
    """異常系: titleが200文字を超える場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    long_title = "a" * 201
    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "body": json.dumps({"title": long_title, "content": "# 新しい内容"}),
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "title" in response_body["message"]
    mock_dynamodb.get_item.assert_not_called()
    mock_dynamodb.update_item.assert_not_called()


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
def test_lambda_handler_no_memo_id(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: memoIdが指定されていない場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {},
        "body": json.dumps({"title": "新しいタイトル", "content": "# 新しい内容"}),
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
    mock_dynamodb.update_item.assert_not_called()


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
def test_lambda_handler_no_user_id(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: user_idが取得できない場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "body": json.dumps({"title": "新しいタイトル", "content": "# 新しい内容"}),
        "requestContext": {"authorizer": {}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 401
    response_body = json.loads(response["body"])
    assert "認証" in response_body["message"]
    mock_dynamodb.get_item.assert_not_called()
    mock_dynamodb.update_item.assert_not_called()


@patch("lambdas.update_memo.app.get_dynamodb_client")
@patch("lambdas.update_memo.app.os.environ.get")
def test_lambda_handler_invalid_json(mock_env_get, mock_get_dynamodb_client) -> None:
    """異常系: 不正なJSONの場合"""
    mock_env_get.return_value = "test-table"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "pathParameters": {"memoId": "test-memo-id"},
        "body": "invalid json",
        "requestContext": {
            "authorizer": {"claims": {"sub": "test-user-id"}}
        },
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "不正" in response_body["message"]
    mock_dynamodb.get_item.assert_not_called()
    mock_dynamodb.update_item.assert_not_called()
