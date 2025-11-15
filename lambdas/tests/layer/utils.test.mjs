/**
 * ユーティリティ関数のユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDynamoDBClient, getUserId, AuthenticationError } from '../../layer/nodejs/utils.mjs';

describe('utils', () => {
  describe('getDynamoDBClient', () => {
    beforeEach(() => {
      delete process.env.DYNAMODB_ENDPOINT;
    });

    it('AWS環境のDynamoDBクライアントを取得', () => {
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
      expect(client.config).toBeDefined();
    });

    it('ローカル環境のDynamoDBクライアントを取得', () => {
      process.env.DYNAMODB_ENDPOINT = 'http://dynamodb-local:8000';
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
      expect(client.config).toBeDefined();
      expect(client.config.endpoint).toBeDefined();
    });
  });

  describe('getUserId', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('AWS環境でuser_idを取得', () => {
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

    it('ローカル環境でuser_idを取得', () => {
      process.env.IS_LOCAL = 'true';
      const event = {};

      const userId = getUserId(event);
      expect(userId).toBe('local_user');
    });

    it('認証エラー', () => {
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

  describe('AuthenticationError', () => {
    it('AuthenticationErrorのインスタンスを作成', () => {
      const error = new AuthenticationError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AuthenticationError');
    });
  });
});
