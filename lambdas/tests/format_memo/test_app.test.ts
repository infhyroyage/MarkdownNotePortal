import { AuthenticationError } from "@layer/errors.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayEvent } from "../../types/api_gateway.js";

const mockSend = vi.fn();
const mockGetUserId = vi.fn();
const mockGetBedrockClient = vi.fn();

vi.mock("../../layer/nodejs/utils.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../layer/nodejs/utils.js")
  >("../../layer/nodejs/utils.js");
  return {
    ...actual,
    getBedrockClient: mockGetBedrockClient,
    getUserId: mockGetUserId,
  };
});

const { handler } = await import("../../format_memo/index.js");

describe("format_memo handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBedrockClient.mockReturnValue({
      send: mockSend,
    });
    mockGetUserId.mockReturnValue("test-user-id");
    vi.stubEnv("IS_LOCAL", "false");
    vi.stubEnv(
      "BEDROCK_INFERENCE_PROFILE_ID",
      "global.anthropic.claude-3-5-haiku-20241022-v1:0",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // TC-N-01
  it("正常にBedrockでMarkdownを整形した上で末尾改行などPrettier整形を加えて返す", async () => {
    // Given: 有効なMarkdown入力とBedrockの正常応答(末尾改行なし)
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: "# 見出し\n\n整形済み" }],
        }),
      ),
    });

    // When: ハンドラを実行する
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "# 見出し\n\n本文" }),
    };
    const response = await handler(event);

    // Then: 200、InvokeModel が1回呼ばれ、Prettierにより末尾改行が付与される
    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const body = JSON.parse(response.body);
    expect(body.content).toBe("# 見出し\n\n整形済み\n");
  });

  // TC-N-02
  it("IS_LOCAL=true のときはBedrockを呼ばずに入力をPrettierで整形して返す", async () => {
    // Given: ローカルモード、見出しの余計な空白と末尾改行なしの入力
    vi.stubEnv("IS_LOCAL", "true");

    // When
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "#  ローカル\n\n本文" }),
    };
    const response = await handler(event);

    // Then: Bedrockは呼ばれず、Prettierが見出しの空白を1個に正規化し末尾改行を付与する
    expect(response.statusCode).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
    const body = JSON.parse(response.body);
    expect(body.content).toBe("# ローカル\n\n本文\n");
  });

  // TC-N-03
  it("Bedrock出力の余計な空白行・見出し記号の表記ゆれをPrettierが正規化する", async () => {
    // Given: 連続する空行や見出しの余計な空白を含む応答
    const noisy = "#  Title\n\n\n\nfoo";
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: noisy }],
        }),
      ),
    });

    // When
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "入力" }),
    };
    const response = await handler(event);

    // Then: 連続空行が1行に潰され、見出しの余計な空白が除去され、末尾改行が付与される
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe("# Title\n\nfoo\n");
  });

  // TC-N-04
  it("Bedrock出力が全体をmarkdownコードフェンスで囲む場合は剥がしてからPrettier整形する", async () => {
    // Given: システムプロンプト違反でフェンス付きの本文を返すBedrock応答
    const fenced = "```markdown\n# 見出し\n\n本文\n```";
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: fenced }],
        }),
      ),
    });

    // When
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "入力" }),
    };
    const response = await handler(event);

    // Then: フェンス内のMarkdownのみが返り、Prettierで末尾改行が付与される
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe("# 見出し\n\n本文\n");
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
    expect(mockSend).not.toHaveBeenCalled();
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
    expect(mockSend).not.toHaveBeenCalled();
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
    expect(mockSend).not.toHaveBeenCalled();
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
    expect(mockSend).not.toHaveBeenCalled();
  });

  // TC-A-05
  it("content がちょうど100000文字のときは200でBedrockを呼ぶ", async () => {
    // Given
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
        }),
      ),
    });
    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "x".repeat(100_000) }),
    };

    // When
    const response = await handler(event);

    // Then: Prettier整形で末尾改行が付与される
    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(JSON.parse(response.body).content).toBe("ok\n");
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
    expect(mockSend).not.toHaveBeenCalled();
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
    expect(mockSend).not.toHaveBeenCalled();
  });

  // TC-A-08
  it("Bedrockがスロットリング等で失敗したときは500を返す", async () => {
    // Given
    mockSend.mockRejectedValueOnce(new Error("ThrottlingException"));

    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "本文" }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Internal server error");
  });

  // TC-A-09
  it("Bedrock応答にテキストブロックがないときは500を返す", async () => {
    // Given
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ content: [] })),
    });

    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "本文" }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Internal server error");
  });

  // TC-A-10
  it("BEDROCK_INFERENCE_PROFILE_ID が空文字でも InvokeModel は試みられ、応答 body が無い場合は500を返す", async () => {
    // Given: システム定義の推論プロファイル ID が空でも送信は行われ、Bedrock 応答に body が無い（不正応答）
    vi.stubEnv("BEDROCK_INFERENCE_PROFILE_ID", "");
    mockSend.mockResolvedValueOnce({ body: undefined });

    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "本文" }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Internal server error");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  // TC-A-11
  it("Bedrock呼び出しがタイムアウト相当のエラーでも500を返す", async () => {
    // Given
    const timeoutErr = new Error("timeout");
    timeoutErr.name = "TimeoutError";
    mockSend.mockRejectedValueOnce(timeoutErr);

    const event: APIGatewayEvent = {
      body: JSON.stringify({ content: "本文" }),
    };

    // When
    const response = await handler(event);

    // Then
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Internal server error");
  });
});

describe("format_memo helpers", () => {
  it("extractAssistantTextFromBedrockBody がテキストを結合して返す", async () => {
    const { extractAssistantTextFromBedrockBody } =
      await import("../../format_memo/index.js");
    const raw = new TextEncoder().encode(
      JSON.stringify({
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      }),
    ) as Parameters<typeof extractAssistantTextFromBedrockBody>[0];
    expect(extractAssistantTextFromBedrockBody(raw)).toBe("ab");
  });

  it("sanitizeFormattedMarkdown が全体フェンス(mdp)を剥がす", async () => {
    const { sanitizeFormattedMarkdown } =
      await import("../../format_memo/index.js");
    const s = "```markdown\n# a\n\nb\n```";
    expect(sanitizeFormattedMarkdown(s)).toBe("# a\n\nb");
  });

  it("sanitizeFormattedMarkdown が言語名なしの全体フェンスを剥がす", async () => {
    const { sanitizeFormattedMarkdown } =
      await import("../../format_memo/index.js");
    const s = "```\n# a\n```";
    expect(sanitizeFormattedMarkdown(s)).toBe("# a");
  });

  it("sanitizeFormattedMarkdown が部分フェンスのみの本文は改変しない", async () => {
    const { sanitizeFormattedMarkdown } =
      await import("../../format_memo/index.js");
    const s = "pre\n```\ncode\n```\npost";
    expect(sanitizeFormattedMarkdown(s)).toBe("pre\n```\ncode\n```\npost");
  });
});
