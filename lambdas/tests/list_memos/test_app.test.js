/**
 * 保存済みメモの一覧を返すユニットテスト
 */

import { jest } from '@jest/globals';

// モジュールのモック
const mockSend = jest.fn();
const mockGetUserId = jest.fn();
const mockGetDynamoDBClient = jest.fn(() => ({
  send: mockSend,
}));

// モックの設定
jest.unstable_mockModule('../../layer/nodejs/utils.js', () => ({
  getDynamoDBClient: mockGetDynamoDBClient,
  getUserId: mockGetUserId,
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
}));

// テスト対象のモジュールをインポート
const { handler } = await import('../../list_memos/index.js');
const { AuthenticationError } = await import('../../layer/nodejs/utils.js');

describe('list_memos handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockReturnValue('test-user-id');
  });

  test('正常系: メモ一覧の取得が成功する', async () => {
    mockSend.mockResolvedValue({
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

    const event = {};

    const response = await handler(event, {});

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

  test('正常系: メモが0件の場合', async () => {
    mockSend.mockResolvedValue({ Items: [] });

    const event = {};

    const response = await handler(event, {});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(0);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('異常系: user_idが取得できない場合', async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event = {};

    const response = await handler(event, {});

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: DynamoDBエラーが発生した場合', async () => {
    mockSend.mockRejectedValue(new Error('DynamoDB error'));

    const event = {};

    const response = await handler(event, {});

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
  });
});
