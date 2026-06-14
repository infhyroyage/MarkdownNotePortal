import { AuthenticationError } from "@layer/errors.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayEvent } from "../../types/api_gateway.js";

const mockGetUserId = vi.fn();

vi.mock("../../layer/nodejs/utils.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../layer/nodejs/utils.js")
  >("../../layer/nodejs/utils.js");
  return {
    ...actual,
    getUserId: mockGetUserId,
  };
});

const { handler } = await import("../../format_memo/index.js");

describe("format_memo handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockReturnValue("test-user-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // TC-N-01
  it("正常にPrettierでMarkdownを整形して返す", async () => {
    // Given: 見出しの余計な空白と末尾改行なしの入力
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "#  見出し\n\n本文" }),
    };

    // When: ハンドラを実行する
    const response = await handler(event);

    // Then: 200、Prettierにより見出しの空白が1個に正規化され末尾改行が付与される
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe("# 見出し\n\n本文\n");
  });

  // TC-N-02
  it("余計な空白行・見出し記号の表記ゆれをPrettierが正規化する", async () => {
    // Given: 連続する空行や見出しの余計な空白を含む入力
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "#  Title\n\n\n\nfoo" }),
    };

    // When
    const response = await handler(event);

    // Then: 連続空行が1行に潰され、見出しの余計な空白が除去され、末尾改行が付与される
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe("# Title\n\nfoo\n");
  });

  // TC-A-01
  it("content が空文字のときは400を返す", async () => {
    // Given
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "" }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      "content must be 1-100000 characters",
    );
  });

  // TC-A-02
  it("content が未定義のときは400を返す", async () => {
    // Given
    const event: APIGatewayEvent = {
      body: JSON.stringify({}),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe("content must be a string");
  });

  // TC-A-03
  it("content が文字列でないときは400を返す", async () => {
    // Given
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: 123 }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe("content must be a string");
  });

  // TC-A-04
  it("content が100001文字のときは400を返す", async () => {
    // Given
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "a".repeat(100_001) }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      "content must be 1-100000 characters",
    );
  });

  // TC-A-05
  it("content がちょうど100000文字のときは200で整形結果を返す", async () => {
    // Given
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "x".repeat(100_000) }),
    };

    // When
    const response = await handler(event);

    // Then: Prettier整形で末尾改行が付与される
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).content).toBe(`${"x".repeat(100_000)}\n`);
  });

  // TC-A-06
  it("リクエストボディが不正なJSONのときは400を返す", async () => {
    // Given
    const event: APIGatewayEvent = {
      body: "not json",
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe("Request body is invalid");
  });

  // TC-A-07
  it("認証エラーのときは401を返す", async () => {
    // Given
    mockGetUserId.mockImplementation(() => {
      throw new AuthenticationError("Not authenticated");
    });
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "x" }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).message).toBe("Not authenticated");
  });
});
