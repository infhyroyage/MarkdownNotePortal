"""ユーティリティ関数のユニットテスト"""

from unittest.mock import patch

from lambdas.layer.python.utils import get_dynamodb_client


@patch("lambdas.layer.python.utils.boto3.client")
def test_get_dynamodb_client(mock_boto3_client):
    """get_dynamodb_client関数のテスト"""
    sentinel = object()
    mock_boto3_client.return_value = sentinel

    client = get_dynamodb_client()

    mock_boto3_client.assert_called_once_with("dynamodb")
    assert client is sentinel
