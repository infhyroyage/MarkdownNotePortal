/**
 * 指定した1件の保存済みメモのタイトルと内容を返すユニットテスト
 */

const { GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { handler } = require('../../get_memo/index');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('../../layer/nodejs/utils');

// モック化
jest.mock('../../layer/nodejs/utils');

describe('get_memo Lambda handler', () => {
  let mockDynamoDBClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDynamoDBClient = {
      send: jest.fn(),
    };
    getDynamoDBClient.mockReturnValue(mockDynamoDBClient);
    getUserId.mockReturnValue('test-user-id');
  });

  test('正常系: メモの取得が成功する', async () => {
    mockDynamoDBClient.send.mockResolvedValueOnce({
      Item: {
        memo_id: { S: 'test-memo-id' },
        title: { S: 'テストメモ' },
        content: { S: '# テスト内容' },
      },
    });

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.memoId).toBe('test-memo-id');
    expect(responseBody.title).toBe('テストメモ');
    expect(responseBody.content).toBe('# テスト内容');
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
    expect(mockDynamoDBClient.send).toHaveBeenCalledWith(expect.any(GetItemCommand));
  });

  test('異常系: memoIdが指定されていない場合', async () => {
    const event = {
      pathParameters: {},
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(400);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('memoId is required');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: メモが見つからない場合', async () => {
    mockDynamoDBClient.send.mockResolvedValueOnce({});

    const event = {
      pathParameters: { memoId: 'non-existent-id' },
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
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(401);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('Not authenticated');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: DynamoDBエラーが発生した場合', async () => {
    mockDynamoDBClient.send.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      pathParameters: { memoId: 'test-memo-id' },
    };

    const response = await handler(event, null);

    expect(response.statusCode).toBe(500);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('error');
  });
});
