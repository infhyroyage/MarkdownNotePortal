import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
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
const { handler } = await import("../../update_memo/index.js");

describe("update_memo handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDynamoDBClient.mockReturnValue({
      send: mockSend,
    } as unknown as DynamoDBClient);
    mockGetUserId.mockReturnValue("test-user-id");
  });

  it("正常にメモを更新する", async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: {
          memo_id: { S: "test-memo-id" },
          title: { S: "Old Title" },
          content: { S: "Old Content" },
        },
      })
      .mockResolvedValueOnce({});

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "Updated Title",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetItemCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateItemCommand));

    const body = JSON.parse(response.body);
    expect(body.memoId).toBe("test-memo-id");
    expect(body.title).toBe("Updated Title");
    expect(body.content).toBe("Updated Content");
    expect(body.lastUpdatedAt).toBeDefined();
  });

  it("memoIdが指定されていない場合は400エラーを返す", async () => {
    const event: APIGatewayEvent = {
      pathParameters: {},
      body: JSON.stringify({
        title: "Updated Title",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("memoId is required");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("タイトルが空の場合は400エラーを返す", async () => {
    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("title must be between 1 and 200 characters");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("タイトルが201文字以上の場合は400エラーを返す", async () => {
    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "a".repeat(201),
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("title must be between 1 and 200 characters");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("contentが文字列でない場合は400エラーを返す", async () => {
    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "Updated Title",
        content: 123,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("content must be a string");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("メモが見つからない場合は404エラーを返す", async () => {
    mockSend.mockResolvedValue({
      Item: undefined,
    });

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "non-existent-memo-id",
      },
      body: JSON.stringify({
        title: "Updated Title",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Memo not found");
  });

  it("リクエストボディが無効なJSONの場合は400エラーを返す", async () => {
    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: "invalid json",
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Request body is invalid");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("認証エラーの場合は401エラーを返す", async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError("Not authenticated");
    });

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "Updated Title",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Not authenticated");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("予期しないエラーの場合は500エラーを返す", async () => {
    mockSend.mockRejectedValue(new Error("DynamoDB error"));

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "Updated Title",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Unexpected error");
  });

  it("タイトルの前後の空白をトリムする", async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: {
          memo_id: { S: "test-memo-id" },
          title: { S: "Old Title" },
          content: { S: "Old Content" },
        },
      })
      .mockResolvedValueOnce({});

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
      body: JSON.stringify({
        title: "  Updated Title  ",
        content: "Updated Content",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.title).toBe("Updated Title");
  });
});
