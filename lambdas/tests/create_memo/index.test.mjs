/**
 * 1件のメモを保存するユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../create_memo/index.mjs';

// モジュールのモック
vi.mock('/opt/nodejs/utils.mjs', () => ({
  getDynamoDBClient: vi.fn(),
  getUserId: vi.fn(),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  PutItemCommand: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(),
}));

describe('create_memo handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: メモの作成が成功する', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');
    const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    const { randomUUID } = await import('crypto');

    getUserId.mockReturnValue('test-user-id');
    randomUUID.mockReturnValue('test-memo-id');

    const mockSend = vi.fn().mockResolvedValue({});
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.memoId).toBe('test-memo-id');
    expect(body.title).toBe('テストメモ');
    expect(body.lastUpdatedAt).toBeDefined();
    expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
  });

  it('異常系: titleが空の場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      body: JSON.stringify({ title: '', content: '# テスト内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('title');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: titleが200文字を超える場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const longTitle = 'a'.repeat(201);
    const event = {
      body: JSON.stringify({ title: longTitle, content: '# テスト内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('title');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: contentが文字列ではない場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: 123 }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('content must be a string');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: user_idが取得できない場合', async () => {
    const { getUserId, getDynamoDBClient, AuthenticationError } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: 不正なJSONの場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      body: 'invalid json',
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('invalid');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: DynamoDBエラーが発生した場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');
    const { randomUUID } = await import('crypto');

    getUserId.mockReturnValue('test-user-id');
    randomUUID.mockReturnValue('test-memo-id');

    const mockSend = vi.fn().mockRejectedValue(new Error('DynamoDB error'));
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
  });
});
