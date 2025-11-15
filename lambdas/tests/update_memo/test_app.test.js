/**
 * 指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するユニットテスト
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
const { handler } = await import('../../update_memo/index.js');
const { AuthenticationError } = await import('../../layer/nodejs/utils.js');

describe('update_memo handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockReturnValue('test-user-id');
    
    // Date.prototype.toISOStringのモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('正常系: メモの更新が成功する', async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: {
          memo_id: { S: 'test-memo-id' },
          title: { S: '古いタイトル' },
          content: { S: '古い内容' },
        },
      })
      .mockResolvedValueOnce({});

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.memoId).toBe('test-memo-id');
    expect(body.title).toBe('新しいタイトル');
    expect(body.content).toBe('# 新しい内容');
    expect(body.lastUpdatedAt).toBe('2024-01-01T00:00:00Z');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test('異常系: メモが見つからない場合', async () => {
    mockSend.mockResolvedValue({});

    const event = {
      pathParameters: { memoId: 'non-existent-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('not found');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('異常系: titleが空の場合', async () => {
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '', content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('title');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: titleが200文字を超える場合', async () => {
    const longTitle = 'a'.repeat(201);
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: longTitle, content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('title');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: contentが文字列ではない場合', async () => {
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: 123 }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('content must be a string');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: memoIdが指定されていない場合', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('memoId');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: user_idが取得できない場合', async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: 不正なJSONの場合', async () => {
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: 'invalid json',
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('invalid');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: DynamoDBエラーが発生した場合', async () => {
    mockSend.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '新しいタイトル', content: '# 新しい内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
