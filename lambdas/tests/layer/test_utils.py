"""ユーティリティ関数のユニットテスト"""

from unittest.mock import patch

import pytest

from lambdas.layer.python.utils import (
    AuthenticationError,
    get_dynamodb_client,
    get_user_id,
)


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


@patch("lambdas.layer.python.utils.os.environ.get")
def test_get_user_id_aws_environment(mock_env_get):
    """get_user_id関数のテスト(AWS環境)"""
    mock_env_get.return_value = "false"
    event = {"requestContext": {"authorizer": {"claims": {"sub": "test-user-id"}}}}

    user_id = get_user_id(event)

    assert user_id == "test-user-id"


@patch("lambdas.layer.python.utils.os.environ.get")
def test_get_user_id_local_environment(mock_env_get):
    """get_user_id関数のテスト(ローカル環境)"""
    mock_env_get.return_value = "true"
    event = {}

    user_id = get_user_id(event)

    assert user_id == "local_user"


@patch("lambdas.layer.python.utils.os.environ.get")
def test_get_user_id_not_authenticated(mock_env_get):
    """get_user_id関数のテスト(認証エラー)"""
    mock_env_get.return_value = "false"
    event = {"requestContext": {"authorizer": {}}}

    with pytest.raises(AuthenticationError) as exc_info:
        get_user_id(event)

    assert "Not authenticated" in str(exc_info.value)
