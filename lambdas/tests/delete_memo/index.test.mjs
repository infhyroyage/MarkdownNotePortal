/**
 * 指定した1件の保存済みメモを削除するユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../delete_memo/index.mjs';

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
  GetItemCommand: vi.fn(),
  DeleteItemCommand: vi.fn(),
}));

describe('delete_memo handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: メモの削除が成功する', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi
      .fn()
      .mockResolvedValueOnce({
        Item: {
          memo_id: { S: 'test-memo-id' },
          title: { S: 'テストメモ' },
          content: { S: '# テスト内容' },
        },
      })
      .mockResolvedValueOnce({});

    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('異常系: メモが見つからない場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi.fn().mockResolvedValue({});
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'non-existent-id' },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('not found');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('異常系: memoIdが指定されていない場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: {},
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('memoId');
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
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: DynamoDBエラーが発生した場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi.fn().mockRejectedValue(new Error('DynamoDB error'));
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
  });
});
