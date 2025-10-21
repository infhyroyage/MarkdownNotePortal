"""ユーティリティ関数のユニットテスト"""

from unittest.mock import patch

from lambdas.layer.python.utils import get_dynamodb_client


@patch("lambdas.layer.python.utils.boto3.client")
@patch("lambdas.layer.python.utils.os.environ.get")
def test_get_dynamodb_client_aws_environment(mock_env_get, mock_boto3_client):
    """get_dynamodb_client関数のテスト(AWS環境)"""
    mock_env_get.return_value = None
    sentinel = object()
    mock_boto3_client.return_value = sentinel

    client = get_dynamodb_client()

    mock_env_get.assert_called_once_with("DYNAMODB_ENDPOINT")
    mock_boto3_client.assert_called_once_with("dynamodb")
    assert client is sentinel


@patch("lambdas.layer.python.utils.boto3.client")
@patch("lambdas.layer.python.utils.os.environ.get")
def test_get_dynamodb_client_local_environment(mock_env_get, mock_boto3_client):
    """get_dynamodb_client関数のテスト(ローカル環境)"""
    mock_env_get.return_value = "http://dynamodb-local:8000"
    sentinel = object()
    mock_boto3_client.return_value = sentinel

    client = get_dynamodb_client()

    mock_env_get.assert_called_once_with("DYNAMODB_ENDPOINT")
    mock_boto3_client.assert_called_once_with(
        "dynamodb",
        endpoint_url="http://dynamodb-local:8000",
        region_name="fakeRegion",
        aws_access_key_id="fakeMyKeyId",
        aws_secret_access_key="fakeSecretAccessKey",
    )
    assert client is sentinel
