/**
 * 指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../update_memo/index.mjs';

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
  UpdateItemCommand: vi.fn(),
}));

describe('update_memo handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: メモの更新が成功する', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi
      .fn()
      .mockResolvedValueOnce({
        Item: {
          memo_id: { S: 'test-memo-id' },
          title: { S: '古いタイトル' },
          content: { S: '古い内容' },
        },
      })
      .mockResolvedValueOnce({});

    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.memoId).toBe('test-memo-id');
    expect(body.title).toBe('新しいタイトル');
    expect(body.content).toBe('# 新しい内容');
    expect(body.lastUpdatedAt).toBeDefined();
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('異常系: メモが見つからない場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi.fn().mockResolvedValue({});
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'non-existent-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('not found');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('異常系: titleが空の場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '', content: '# 新しい内容' }),
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
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: longTitle, content: '# 新しい内容' }),
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
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: 123 }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('content must be a string');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('異常系: memoIdが指定されていない場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: {},
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
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
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
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
      pathParameters: { memoId: 'test-memo-id' },
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

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi.fn().mockRejectedValue(new Error('DynamoDB error'));
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
