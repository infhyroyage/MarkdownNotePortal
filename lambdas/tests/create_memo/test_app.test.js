/**
 * 1件のメモを保存するユニットテスト
 */

import { jest } from '@jest/globals';

// モジュールのモック
const mockSend = jest.fn();
const mockGetUserId = jest.fn();
const mockGetDynamoDBClient = jest.fn(() => ({
  send: mockSend,
}));
const mockRandomUUID = jest.fn();

// モックの設定
jest.unstable_mockModule('crypto', () => ({
  randomUUID: mockRandomUUID,
}));

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
const { handler } = await import('../../create_memo/index.js');
const { AuthenticationError } = await import('../../layer/nodejs/utils.js');

describe('create_memo handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのモック設定
    mockGetUserId.mockReturnValue('test-user-id');
    mockRandomUUID.mockReturnValue('test-memo-id');
    mockSend.mockResolvedValue({});
    
    // Date.prototype.toISOStringのモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('正常系: メモの作成が成功する', async () => {
    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.memoId).toBe('test-memo-id');
    expect(body.title).toBe('テストメモ');
    expect(body.lastUpdatedAt).toBe('2024-01-01T00:00:00Z');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('異常系: titleが空の場合', async () => {
    const event = {
      body: JSON.stringify({ title: '', content: '# テスト内容' }),
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
      body: JSON.stringify({ title: longTitle, content: '# テスト内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('title');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: contentが文字列ではない場合', async () => {
    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: 123 }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('content must be a string');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: user_idが取得できない場合', async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: 不正なJSONの場合', async () => {
    const event = {
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
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
  });
});
