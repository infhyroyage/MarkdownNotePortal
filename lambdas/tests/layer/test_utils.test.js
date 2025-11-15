/**
 * ユーティリティ関数のユニットテスト
 */

import { jest } from '@jest/globals';
import { getDynamoDBClient, getUserId, AuthenticationError } from '../../layer/nodejs/utils.js';

// DynamoDBClientのモック
jest.unstable_mockModule('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
}));

describe('utils', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDynamoDBClient', () => {
    test('AWS環境でDynamoDBクライアントを取得できる', () => {
      delete process.env.DYNAMODB_ENDPOINT;
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });

    test('ローカル環境でDynamoDBクライアントを取得できる', () => {
      process.env.DYNAMODB_ENDPOINT = 'http://dynamodb-local:8000';
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });
  });

  describe('getUserId', () => {
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

    test('認証エラーを投げる', () => {
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
  });
});
