/**
 * 保存済みメモの一覧を返すユニットテスト
 */

const { QueryCommand } = require('@aws-sdk/client-dynamodb');
const { handler } = require('../../list_memos/index');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('../../layer/nodejs/utils');

// モック化
jest.mock('../../layer/nodejs/utils');

describe('list_memos Lambda handler', () => {
  let mockDynamoDBClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDynamoDBClient = {
      send: jest.fn(),
    };
    getDynamoDBClient.mockReturnValue(mockDynamoDBClient);
    getUserId.mockReturnValue('test-user-id');
  });

  test('正常系: メモ一覧の取得が成功する', async () => {
    mockDynamoDBClient.send.mockResolvedValueOnce({
      Items: [
        {
          memo_id: { S: 'memo-1' },
          title: { S: 'メモ1' },
          create_at: { S: '2024-01-01T00:00:00Z' },
        },
        {
          memo_id: { S: 'memo-2' },
          title: { S: 'メモ2' },
          create_at: { S: '2024-01-02T00:00:00Z' },
          update_at: { S: '2024-01-03T00:00:00Z' },
        },
      ],
    });

    const event = {};

    const response = await handler(event, null);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.items).toHaveLength(2);
    expect(responseBody.items[0].memoId).toBe('memo-2'); // 最終更新日時で降順ソート
    expect(responseBody.items[0].lastUpdatedAt).toBe('2024-01-03T00:00:00Z');
    expect(responseBody.items[1].memoId).toBe('memo-1');
    expect(responseBody.items[1].lastUpdatedAt).toBe('2024-01-01T00:00:00Z');
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
    expect(mockDynamoDBClient.send).toHaveBeenCalledWith(expect.any(QueryCommand));
  });

  test('正常系: メモが0件の場合', async () => {
    mockDynamoDBClient.send.mockResolvedValueOnce({
      Items: [],
    });

    const event = {};

    const response = await handler(event, null);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.items).toHaveLength(0);
  });

  test('異常系: 認証エラーの場合', async () => {
    getUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event = {};

    const response = await handler(event, null);

    expect(response.statusCode).toBe(401);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('Not authenticated');
    expect(mockDynamoDBClient.send).not.toHaveBeenCalled();
  });

  test('異常系: DynamoDBエラーが発生した場合', async () => {
    mockDynamoDBClient.send.mockRejectedValue(new Error('DynamoDB error'));

    const event = {};

    const response = await handler(event, null);

    expect(response.statusCode).toBe(500);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toContain('error');
  });
});
