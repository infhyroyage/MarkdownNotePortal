/**
 * delete_memo/index.tsのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

// モックの作成
const mockSend = vi.fn();
const mockGetUserId = vi.fn();
const mockGetDynamoDBClient = vi.fn();

vi.mock('../../layer/nodejs/utils.js', async () => {
  const actual = await vi.importActual('../../layer/nodejs/utils.js');
  return {
    ...actual,
    getDynamoDBClient: mockGetDynamoDBClient,
    getUserId: mockGetUserId,
  };
});

// テスト対象のモジュールをインポート
const { handler } = await import('../../delete_memo/index.js');
const { AuthenticationError } = await import('../../layer/nodejs/utils.js');
import type { APIGatewayEvent } from '../../layer/nodejs/utils.js';

describe('delete_memo handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDynamoDBClient.mockReturnValue({
      send: mockSend,
    } as unknown as DynamoDBClient);
    mockGetUserId.mockReturnValue('test-user-id');
  });

  it('正常にメモを削除する', async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: {
          memo_id: { S: 'test-memo-id' },
          title: { S: 'Test Title' },
          content: { S: 'Test Content' },
        },
      })
      .mockResolvedValueOnce({});

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: 'test-memo-id',
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(204);
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetItemCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteItemCommand));
    expect(response.body).toBe('');
  });

  it('memoIdが指定されていない場合は400エラーを返す', async () => {
    const event: APIGatewayEvent = {
      pathParameters: {},
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('memoId is required');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('メモが見つからない場合は404エラーを返す', async () => {
    mockSend.mockResolvedValue({
      Item: undefined,
    });

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: 'non-existent-memo-id',
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Memo not found');
  });

  it('認証エラーの場合は401エラーを返す', async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: 'test-memo-id',
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Not authenticated');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('予期しないエラーの場合は500エラーを返す', async () => {
    mockSend.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: 'test-memo-id',
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Internal server error');
  });
});
