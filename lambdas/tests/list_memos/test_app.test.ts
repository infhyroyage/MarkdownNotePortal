import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { AuthenticationError } from "@layer/errors.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayEvent } from "../../types/api.js";

// モックの作成
const mockSend = vi.fn();
const mockGetUserId = vi.fn();
const mockGetDynamoDBClient = vi.fn();

vi.mock("../../layer/nodejs/utils.js", async () => {
  const actual = await vi.importActual("../../layer/nodejs/utils.js");
  return {
    ...actual,
    getDynamoDBClient: mockGetDynamoDBClient,
    getUserId: mockGetUserId,
  };
});

// テスト対象のモジュールをインポート
const { handler } = await import("../../list_memos/index.js");

describe("list_memos handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDynamoDBClient.mockReturnValue({
      send: mockSend,
    } as unknown as DynamoDBClient);
    mockGetUserId.mockReturnValue("test-user-id");
  });

  it("正常にメモ一覧を取得する", async () => {
    mockSend.mockResolvedValue({
      Items: [
        {
          memo_id: { S: "memo-1" },
          title: { S: "Title 1" },
          create_at: { S: "2023-01-01T00:00:00.000Z" },
        },
        {
          memo_id: { S: "memo-2" },
          title: { S: "Title 2" },
          create_at: { S: "2023-01-02T00:00:00.000Z" },
          update_at: { S: "2023-01-03T00:00:00.000Z" },
        },
      ],
    });

    const event: APIGatewayEvent = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));

    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(2);

    // 最新順にソートされているか確認
    expect(body.items[0].memoId).toBe("memo-2");
    expect(body.items[0].lastUpdatedAt).toBe("2023-01-03T00:00:00.000Z");
    expect(body.items[1].memoId).toBe("memo-1");
    expect(body.items[1].lastUpdatedAt).toBe("2023-01-01T00:00:00.000Z");
  });

  it("メモが存在しない場合は空配列を返す", async () => {
    mockSend.mockResolvedValue({
      Items: [],
    });

    const event: APIGatewayEvent = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toEqual([]);
  });

  it("認証エラーの場合は401エラーを返す", async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError("Not authenticated");
    });

    const event: APIGatewayEvent = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Not authenticated");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("予期しないエラーの場合は500エラーを返す", async () => {
    mockSend.mockRejectedValue(new Error("DynamoDB error"));

    const event: APIGatewayEvent = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Internal server error");
  });

  it("update_atがない場合はcreate_atを使用する", async () => {
    mockSend.mockResolvedValue({
      Items: [
        {
          memo_id: { S: "memo-1" },
          title: { S: "Title 1" },
          create_at: { S: "2023-01-01T00:00:00.000Z" },
        },
      ],
    });

    const event: APIGatewayEvent = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items[0].lastUpdatedAt).toBe("2023-01-01T00:00:00.000Z");
  });

  it("検索クエリが指定された場合、FilterExpressionが適用される", async () => {
    mockSend.mockResolvedValue({
      Items: [
        {
          memo_id: { S: "memo-1" },
          title: { S: "Test Title" },
          content: { S: "Test Content" },
          create_at: { S: "2023-01-01T00:00:00.000Z" },
        },
      ],
    });

    const event: APIGatewayEvent = {
      queryStringParameters: {
        search: "Test",
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          FilterExpression: "contains(title, :search) OR contains(content, :search)",
          ProjectionExpression: "memo_id, title, content, create_at, update_at",
          ExpressionAttributeValues: expect.objectContaining({
            ":search": { S: "Test" },
          }),
        }),
      })
    );
  });

  it("検索クエリが空文字の場合、FilterExpressionは適用されない", async () => {
    mockSend.mockResolvedValue({
      Items: [
        {
          memo_id: { S: "memo-1" },
          title: { S: "Title 1" },
          create_at: { S: "2023-01-01T00:00:00.000Z" },
        },
      ],
    });

    const event: APIGatewayEvent = {
      queryStringParameters: {
        search: "",
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          ProjectionExpression: "memo_id, title, create_at, update_at",
        }),
      })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.not.objectContaining({
          FilterExpression: expect.anything(),
        }),
      })
    );
  });
});
