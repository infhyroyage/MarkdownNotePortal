"""保存済みメモの一覧を返すユニットテスト"""

import json
from typing import Any, Dict
from unittest.mock import MagicMock, patch

from utils import AuthenticationError

from lambdas.list_memos.app import lambda_handler


@patch("lambdas.list_memos.app.get_user_id")
@patch("lambdas.list_memos.app.get_dynamodb_client")
def test_lambda_handler_success(mock_get_dynamodb_client, mock_get_user_id) -> None:
    """正常系: メモ一覧の取得が成功する"""
    # モックの設定
    mock_get_user_id.return_value = "test-user-id"
    mock_dynamodb = MagicMock()
    mock_dynamodb.query.return_value = {
        "Items": [
            {
                "memo_id": {"S": "memo-1"},
                "title": {"S": "メモ1"},
                "create_at": {"S": "2024-01-01T00:00:00Z"},
                "update_at": {"S": "2024-01-02T00:00:00Z"},
            },
            {
                "memo_id": {"S": "memo-2"},
                "title": {"S": "メモ2"},
                "create_at": {"S": "2024-01-03T00:00:00Z"},
            },
        ]
    }
    mock_get_dynamodb_client.return_value = mock_dynamodb

    # イベントの作成
    event: Dict[str, Any] = {}
    context: Any = None

    # 実行
    response = lambda_handler(event, context)

    # 検証
    assert response["statusCode"] == 200
    response_body = json.loads(response["body"])
    assert len(response_body["items"]) == 2
    # 最終更新日時の降順でソートされていることを確認（memo-2が最新）
    assert response_body["items"][0]["memoId"] == "memo-2"
    assert response_body["items"][0]["title"] == "メモ2"
    assert response_body["items"][0]["lastUpdatedAt"] == "2024-01-03T00:00:00Z"
    assert response_body["items"][1]["memoId"] == "memo-1"
    assert response_body["items"][1]["title"] == "メモ1"
    assert response_body["items"][1]["lastUpdatedAt"] == "2024-01-02T00:00:00Z"
    mock_dynamodb.query.assert_called_once()


@patch("lambdas.list_memos.app.get_user_id")
@patch("lambdas.list_memos.app.get_dynamodb_client")
def test_lambda_handler_empty_list(mock_get_dynamodb_client, mock_get_user_id) -> None:
    """正常系: メモが0件の場合"""
    # モックの設定
    mock_get_user_id.return_value = "test-user-id"
    mock_dynamodb = MagicMock()
    mock_dynamodb.query.return_value = {"Items": []}
    mock_get_dynamodb_client.return_value = mock_dynamodb

    # イベントの作成
    event: Dict[str, Any] = {}
    context: Any = None

    # 実行
    response = lambda_handler(event, context)

    # 検証
    assert response["statusCode"] == 200
    response_body = json.loads(response["body"])
    assert len(response_body["items"]) == 0
    mock_dynamodb.query.assert_called_once()


@patch("lambdas.list_memos.app.get_user_id")
@patch("lambdas.list_memos.app.get_dynamodb_client")
def test_lambda_handler_no_user_id(mock_get_dynamodb_client, mock_get_user_id) -> None:
    """異常系: user_idが取得できない場合"""
    mock_get_user_id.side_effect = AuthenticationError("Not authenticated")
    mock_dynamodb = MagicMock()
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {}
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 401
    response_body = json.loads(response["body"])
    assert "Not authenticated" in response_body["message"]
    mock_dynamodb.query.assert_not_called()


@patch("lambdas.list_memos.app.get_user_id")
@patch("lambdas.list_memos.app.get_dynamodb_client")
def test_lambda_handler_dynamodb_error(
    mock_get_dynamodb_client, mock_get_user_id
) -> None:
    """異常系: DynamoDBエラーが発生した場合"""
    mock_get_user_id.return_value = "test-user-id"
    mock_dynamodb = MagicMock()
    mock_dynamodb.query.side_effect = Exception("DynamoDB error")
    mock_get_dynamodb_client.return_value = mock_dynamodb

    event: Dict[str, Any] = {}
    context: Any = None

    response = lambda_handler(event, context)

    assert response["statusCode"] == 500
    response_body = json.loads(response["body"])
    assert "error" in response_body["message"]
