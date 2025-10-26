"""1件のメモを保存するユニットテスト"""

import json
from typing import Any, Dict
from unittest.mock import MagicMock, patch

from lambdas.create_memo.app import lambda_handler


@patch("lambdas.create_memo.app.get_dynamodb_client")
@patch("lambdas.create_memo.app.uuid.uuid4")
@patch("lambdas.create_memo.app.datetime")
def test_lambda_handler_success(
    mock_datetime, mock_uuid, mock_get_dynamodb_client
) -> None:
    """正常系: メモの作成が成功する"""
    # モックの設定
    mock_uuid_obj = MagicMock()
    mock_uuid_obj.__str__.return_value = "test-memo-id"
    mock_uuid.return_value = mock_uuid_obj
    mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T00:00:00Z"
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    # イベントの作成
    event: Dict[str, Any] = {
        "body": json.dumps({"title": "テストメモ", "content": "# テスト内容"}),
        "requestContext": {"authorizer": {"claims": {"sub": "test-user-id"}}},
    }
    context: Any = None

    # 実行
    response = lambda_handler(event, context)

    # 検証
    assert response["statusCode"] == 201
    response_body = json.loads(response["body"])
    assert response_body["memoId"] == "test-memo-id"
    assert response_body["title"] == "テストメモ"
    mock_dynamodb.put_item.assert_called_once()


@patch("lambdas.create_memo.app.get_dynamodb_client")
def test_lambda_handler_missing_title(mock_get_dynamodb_client) -> None:
    """異常系: titleが空の場合"""
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "body": json.dumps({"title": "", "content": "# テスト内容"}),
        "requestContext": {"authorizer": {"claims": {"sub": "test-user-id"}}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "title" in response_body["message"]
    mock_dynamodb.put_item.assert_not_called()


@patch("lambdas.create_memo.app.get_dynamodb_client")
def test_lambda_handler_title_too_long(mock_get_dynamodb_client) -> None:
    """異常系: titleが200文字を超える場合"""
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    long_title = "a" * 201
    event: Dict[str, Any] = {
        "body": json.dumps({"title": long_title, "content": "# テスト内容"}),
        "requestContext": {"authorizer": {"claims": {"sub": "test-user-id"}}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "title" in response_body["message"]
    mock_dynamodb.put_item.assert_not_called()


@patch("lambdas.create_memo.app.get_dynamodb_client")
def test_lambda_handler_no_user_id(mock_get_dynamodb_client) -> None:
    """異常系: user_idが取得できない場合"""
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "body": json.dumps({"title": "テストメモ", "content": "# テスト内容"}),
        "requestContext": {"authorizer": {}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 401
    response_body = json.loads(response["body"])
    assert "認証" in response_body["message"]
    mock_dynamodb.put_item.assert_not_called()


@patch("lambdas.create_memo.app.get_dynamodb_client")
def test_lambda_handler_invalid_json(mock_get_dynamodb_client) -> None:
    """異常系: 不正なJSONの場合"""
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "body": "invalid json",
        "requestContext": {"authorizer": {"claims": {"sub": "test-user-id"}}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 400
    response_body = json.loads(response["body"])
    assert "不正" in response_body["message"]
    mock_dynamodb.put_item.assert_not_called()


@patch("lambdas.create_memo.app.get_dynamodb_client")
@patch("lambdas.create_memo.app.uuid.uuid4")
@patch("lambdas.create_memo.app.datetime")
def test_lambda_handler_dynamodb_error(
    mock_datetime, mock_uuid, mock_get_dynamodb_client
) -> None:
    """異常系: DynamoDBエラーが発生した場合"""
    mock_uuid.return_value = MagicMock(hex="test-memo-id")
    mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T00:00:00Z"
    mock_dynamodb = MagicMock()
    mock_dynamodb.put_item.side_effect = Exception("DynamoDB error")
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {
        "body": json.dumps({"title": "テストメモ", "content": "# テスト内容"}),
        "requestContext": {"authorizer": {"claims": {"sub": "test-user-id"}}},
    }
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 500
    response_body = json.loads(response["body"])
    assert "サーバーエラー" in response_body["message"]
