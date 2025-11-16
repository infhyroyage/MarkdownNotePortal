/**
 * create_memo/index.tsのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

// モックの作成
const mockSend = vi.fn();
const mockGetUserId = vi.fn();
const mockGetDynamoDBClient = vi.fn();

vi.mock('crypto', () => ({
  randomUUID: vi.fn(),
}));

vi.mock('../../layer/nodejs/utils.js', async () => {
  const actual = await vi.importActual('../../layer/nodejs/utils.js');
  return {
    ...actual,
    getDynamoDBClient: mockGetDynamoDBClient,
    getUserId: mockGetUserId,
  };
});

// テスト対象のモジュールをインポート
const { handler } = await import('../../create_memo/index.js');
import type { APIGatewayEvent } from '../../types/index.js';
import { AuthenticationError } from '../../types/index.js';

describe('create_memo handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDynamoDBClient.mockReturnValue({
      send: mockSend,
    } as unknown as DynamoDBClient);
    mockGetUserId.mockReturnValue('test-user-id');
    mockSend.mockResolvedValue({});
    (randomUUID as unknown as ReturnType<typeof vi.fn>).mockReturnValue('test-memo-id');
  });

  it('正常にメモを作成する', async () => {
    const event: APIGatewayEvent = {
      body: JSON.stringify({
        title: 'Test Title',
        content: 'Test Content',
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    expect(mockSend).toHaveBeenCalledWith(expect.any(PutItemCommand));
    
    const body = JSON.parse(response.body);
    expect(body.memoId).toBe('test-memo-id');
    expect(body.title).toBe('Test Title');
    expect(body.lastUpdatedAt).toBeDefined();
  });

  it('タイトルが空の場合は400エラーを返す', async () => {
    const event: APIGatewayEvent = {
      body: JSON.stringify({
        title: '',
        content: 'Test Content',
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('title must be between 1 and 200 characters');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('タイトルが201文字以上の場合は400エラーを返す', async () => {
    const event: APIGatewayEvent = {
      body: JSON.stringify({
        title: 'a'.repeat(201),
        content: 'Test Content',
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('title must be between 1 and 200 characters');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('contentが文字列でない場合は400エラーを返す', async () => {
    const event: APIGatewayEvent = {
      body: JSON.stringify({
        title: 'Test Title',
        content: 123,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('content must be a string');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('リクエストボディが無効なJSONの場合は400エラーを返す', async () => {
    const event: APIGatewayEvent = {
      body: 'invalid json',
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Request body is invalid');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('認証エラーの場合は401エラーを返す', async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError('Not authenticated');
    });

    const event: APIGatewayEvent = {
      body: JSON.stringify({
        title: 'Test Title',
        content: 'Test Content',
      }),
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
      body: JSON.stringify({
        title: 'Test Title',
        content: 'Test Content',
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Internal server error');
  });

  it('タイトルの前後の空白をトリムする', async () => {
    const event: APIGatewayEvent = {
      body: JSON.stringify({
        title: '  Test Title  ',
        content: 'Test Content',
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.title).toBe('Test Title');
  });
});
