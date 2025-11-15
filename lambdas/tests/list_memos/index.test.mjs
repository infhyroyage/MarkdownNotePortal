/**
 * 保存済みメモの一覧を返すユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../list_memos/index.mjs';

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
  QueryCommand: vi.fn(),
}));

describe('list_memos handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: メモ一覧の取得が成功する', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi.fn().mockResolvedValue({
      Items: [
        {
          memo_id: { S: 'memo-1' },
          title: { S: 'メモ1' },
          create_at: { S: '2024-01-01T00:00:00Z' },
          update_at: { S: '2024-01-02T00:00:00Z' },
        },
        {
          memo_id: { S: 'memo-2' },
          title: { S: 'メモ2' },
          create_at: { S: '2024-01-03T00:00:00Z' },
        },
      ],
    });

    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(2);
    // 最終更新日時の降順でソートされていることを確認（memo-2が最新）
    expect(body.items[0].memoId).toBe('memo-2');
    expect(body.items[0].title).toBe('メモ2');
    expect(body.items[0].lastUpdatedAt).toBe('2024-01-03T00:00:00Z');
    expect(body.items[1].memoId).toBe('memo-1');
    expect(body.items[1].title).toBe('メモ1');
    expect(body.items[1].lastUpdatedAt).toBe('2024-01-02T00:00:00Z');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('正常系: メモが0件の場合', async () => {
    const { getUserId, getDynamoDBClient } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockReturnValue('test-user-id');

    const mockSend = vi.fn().mockResolvedValue({ Items: [] });
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(0);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('異常系: user_idが取得できない場合', async () => {
    const { getUserId, getDynamoDBClient, AuthenticationError } = await import('/opt/nodejs/utils.mjs');

    getUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });
    const mockSend = vi.fn();
    getDynamoDBClient.mockReturnValue({ send: mockSend });

    const event = {};

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

    const event = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
  });
});
