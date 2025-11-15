/**
 * ユーティリティ関数のユニットテスト
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('../../layer/nodejs/utils');

// DynamoDBClientをモック化
jest.mock('@aws-sdk/client-dynamodb');

describe('getDynamoDBClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    DynamoDBClient.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('AWS環境でDynamoDBクライアントを取得できる', () => {
    delete process.env.DYNAMODB_ENDPOINT;

    getDynamoDBClient();

    expect(DynamoDBClient).toHaveBeenCalledWith({});
  });

  test('ローカル環境でDynamoDBクライアントを取得できる', () => {
    process.env.DYNAMODB_ENDPOINT = 'http://dynamodb-local:8000';

    getDynamoDBClient();

    expect(DynamoDBClient).toHaveBeenCalledWith({
      endpoint: 'http://dynamodb-local:8000',
      region: 'fakeRegion',
      credentials: {
        accessKeyId: 'fakeMyKeyId',
        secretAccessKey: 'fakeSecretAccessKey',
      },
    });
  });
});

describe('getUserId', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('AWS環境でuser_idを取得できる', () => {
    process.env.IS_LOCAL = 'false';
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: 'test-user-id',
            },
          },
        },
      },
    };

    const userId = getUserId(event);

    expect(userId).toBe('test-user-id');
  });

  test('ローカル環境でlocal_userを返す', () => {
    process.env.IS_LOCAL = 'true';
    const event = {};

    const userId = getUserId(event);

    expect(userId).toBe('local_user');
  });

  test('認証エラーの場合はAuthenticationErrorをスローする', () => {
    process.env.IS_LOCAL = 'false';
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {},
          },
        },
      },
    };

    expect(() => getUserId(event)).toThrow(AuthenticationError);
    expect(() => getUserId(event)).toThrow('Not authenticated');
  });

  test('subが存在しない場合はAuthenticationErrorをスローする', () => {
    process.env.IS_LOCAL = 'false';
    const event = {};

    expect(() => getUserId(event)).toThrow(AuthenticationError);
  });
});

describe('AuthenticationError', () => {
  test('AuthenticationErrorを作成できる', () => {
    const error = new AuthenticationError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('AuthenticationError');
  });
});
