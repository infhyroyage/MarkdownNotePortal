/**
 * utils.tsのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDynamoDBClient, getUserId, AuthenticationError } from '../../layer/nodejs/utils.js';
import type { APIGatewayEvent } from '../../layer/nodejs/utils.js';

describe('utils', () => {
  describe('getDynamoDBClient', () => {
    beforeEach(() => {
      delete process.env.DYNAMODB_ENDPOINT;
    });

    it('ローカル環境のDynamoDBクライアントを返す', () => {
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });

    it('AWS環境のDynamoDBクライアントを返す', () => {
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });
  });

  describe('getUserId', () => {
    const originalIsLocal = process.env.IS_LOCAL;

    afterEach(() => {
      if (originalIsLocal) {
        process.env.IS_LOCAL = originalIsLocal;
      } else {
        delete process.env.IS_LOCAL;
      }
    });

    it('ローカル環境の場合は"local_user"を返す', () => {
      process.env.IS_LOCAL = 'true';
      const event: APIGatewayEvent = {};
      const userId = getUserId(event);
      expect(userId).toBe('local_user');
    });

    it('AWS環境で認証情報が存在する場合はuser_idを返す', () => {
      delete process.env.IS_LOCAL;
      const event: APIGatewayEvent = {
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

    it('AWS環境で認証情報が存在しない場合はAuthenticationErrorを投げる', () => {
      delete process.env.IS_LOCAL;
      const event: APIGatewayEvent = {};
      expect(() => getUserId(event)).toThrow(AuthenticationError);
    });
  });

  describe('AuthenticationError', () => {
    it('エラーメッセージが正しく設定される', () => {
      const error = new AuthenticationError('Test error');
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Test error');
    });
  });
});
