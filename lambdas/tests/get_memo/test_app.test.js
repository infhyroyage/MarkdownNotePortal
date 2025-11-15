/**
 * 指定した1件の保存済みメモのタイトルと内容(Markdown文字列)を返すユニットテスト
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
const { handler } = await import('../../get_memo/index.js');
const { AuthenticationError } = await import('../../layer/nodejs/utils.js');

describe('get_memo handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockReturnValue('test-user-id');
  });

  test('正常系: メモの取得が成功する', async () => {
    mockSend.mockResolvedValue({
      Item: {
        memo_id: { S: 'test-memo-id' },
        title: { S: 'テストメモ' },
        content: { S: '# テスト内容' },
      },
    });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.memoId).toBe('test-memo-id');
    expect(body.title).toBe('テストメモ');
    expect(body.content).toBe('# テスト内容');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('異常系: メモが見つからない場合', async () => {
    mockSend.mockResolvedValue({});

    const event = {
      pathParameters: { memoId: 'non-existent-id' },
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('not found');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('異常系: memoIdが指定されていない場合', async () => {
    const event = {
      pathParameters: {},
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
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('異常系: DynamoDBエラーが発生した場合', async () => {
    mockSend.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event, {});

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('error');
  });
});
