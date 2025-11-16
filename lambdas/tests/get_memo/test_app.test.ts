import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
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
const { handler } = await import("../../get_memo/index.js");

describe("get_memo handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDynamoDBClient.mockReturnValue({
      send: mockSend,
    } as unknown as DynamoDBClient);
    mockGetUserId.mockReturnValue("test-user-id");
  });

  it("正常にメモを取得する", async () => {
    mockSend.mockResolvedValue({
      Item: {
        memo_id: { S: "test-memo-id" },
        title: { S: "Test Title" },
        content: { S: "Test Content" },
      },
    });

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetItemCommand));

    const body = JSON.parse(response.body);
    expect(body.memoId).toBe("test-memo-id");
    expect(body.title).toBe("Test Title");
    expect(body.content).toBe("Test Content");
  });

  it("memoIdが指定されていない場合は400エラーを返す", async () => {
    const event: APIGatewayEvent = {
      pathParameters: {},
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("memoId is required");
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
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Memo not found");
  });

  it("認証エラーの場合は401エラーを返す", async () => {
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError("Not authenticated");
    });

    const event: APIGatewayEvent = {
      pathParameters: {
        memoId: "test-memo-id",
      },
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
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Internal server error");
  });
});
