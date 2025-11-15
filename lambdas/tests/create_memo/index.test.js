/**
 * 1件のメモを保存するユニットテスト
 */

const { PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { handler } = require('../../create_memo/index');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('../../layer/nodejs/utils');

// モック化
jest.mock('../../layer/nodejs/utils');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-memo-id'),
}));

describe('create_memo Lambda handler', () => {
  let mockDynamoDBClient;
  const mockDate = '2024-01-01T00:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Date.prototypeをモック化
    jest.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

    mockDynamoDBClient = {
      send: jest.fn().mockResolvedValue({}),
    };
    getDynamoDBClient.mockReturnValue(mockDynamoDBClient);
    getUserId.mockReturnValue('test-user-id');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('正常系: メモの作成が成功する', async () => {
    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(201);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.memoId).toBe('test-memo-id');
    expect(responseBody.title).toBe('テストメモ');
    expect(responseBody.lastUpdatedAt).toBe(mockDate);
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
    expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
      expect.any(PutItemCommand)
    );
  });

  test('異常系: titleが空の場合', async () => {
    const event = {
      body: JSON.stringify({ title: '', content: '# テスト内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('title');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: titleが200文字を超える場合', async () => {
    const longTitle = 'a'.repeat(201);
    const event = {
      body: JSON.stringify({ title: longTitle, content: '# テスト内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('title');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: contentが文字列ではない場合', async () => {
    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: 123 }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('content must be a string');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: user_idが取得できない場合', async () => {
    getUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(401);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('Not authenticated');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: 不正なJSONの場合', async () => {
    const event = {
      body: 'invalid json',
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('invalid');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: DynamoDBエラーが発生した場合', async () => {
    mockDynamoDBClient.send.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      body: JSON.stringify({ title: 'テストメモ', content: '# テスト内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(500);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('error');
  });
});
