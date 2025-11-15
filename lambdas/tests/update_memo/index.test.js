/**
 * 指定した1件の保存済みメモを更新するユニットテスト
 */

const { GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { handler } = require('../../update_memo/index');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('../../layer/nodejs/utils');

// モック化
jest.mock('../../layer/nodejs/utils');

describe('update_memo Lambda handler', () => {
  let mockDynamoDBClient;
  const mockDate = '2024-01-01T00:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();

    // Date.prototypeをモック化
    jest.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

    mockDynamoDBClient = {
      send: jest.fn(),
    };
    getDynamoDBClient.mockReturnValue(mockDynamoDBClient);
    getUserId.mockReturnValue('test-user-id');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('正常系: メモの更新が成功する', async () => {
    mockDynamoDBClient.send
      .mockResolvedValueOnce({ Item: { memo_id: { S: 'test-memo-id' } } }) // GetItem
      .mockResolvedValueOnce({}); // UpdateItem

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '更新後タイトル', content: '# 更新後内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.memoId).toBe('test-memo-id');
    expect(responseBody.title).toBe('更新後タイトル');
    expect(responseBody.content).toBe('# 更新後内容');
    expect(responseBody.lastUpdatedAt).toBe(mockDate);
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(2);
    expect(mockDynamoDBClient.send).toHaveBeenNthCalledWith(1, expect.any(GetItemCommand));
    expect(mockDynamoDBClient.send).toHaveBeenNthCalledWith(2, expect.any(UpdateItemCommand));
  });

  test('異常系: memoIdが指定されていない場合', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({ title: '更新後タイトル', content: '# 更新後内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('memoId is required');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: titleが空の場合', async () => {
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '', content: '# 更新後内容' }),
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
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: longTitle, content: '# 更新後内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('title');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: contentが文字列ではない場合', async () => {
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '更新後タイトル', content: 123 }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('content must be a string');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: メモが見つからない場合', async () => {
    mockDynamoDBClient.send.mockResolvedValueOnce({});

    const event = {
      pathParameters: { memoId: 'non-existent-id' },
      body: JSON.stringify({ title: '更新後タイトル', content: '# 更新後内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(404);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('Memo not found');
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
  });

  test('異常系: 認証エラーの場合', async () => {
    getUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '更新後タイトル', content: '# 更新後内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(401);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('Not authenticated');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: 不正なJSONの場合', async () => {
    const event = {
      pathParameters: { memoId: 'test-memo-id' },
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
      pathParameters: { memoId: 'test-memo-id' },
      body: JSON.stringify({ title: '更新後タイトル', content: '# 更新後内容' }),
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(500);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('error');
  });
});
