import { AuthenticationError } from "@layer/errors.js";
import prettier from "prettier";
import parserMarkdown from "prettier/plugins/markdown";
import { CONTENT_MAX_LENGTH, getUserId } from "../layer/nodejs/utils.js";
import type { FormatMemoRequest, FormatMemoResponse } from "../types/api.js";
import type {
  APIGatewayEvent,
  APIGatewayResponse,
} from "../types/api_gateway.js";

/**
 * MarkdownをPrettierで整形するLambda関数ハンドラー
 * @param {APIGatewayEvent} event API Gatewayイベント
 * @returns {APIGatewayResponse} API Gatewayレスポンス
 */
export async function handler(
  event: APIGatewayEvent,
): Promise<APIGatewayResponse> {
  try {
    void getUserId(event);

    // リクエストボディの取得とパース
    const body: FormatMemoRequest = JSON.parse(event.body || "{}");
    const content = body.content;

    // バリデーションチェック
    if (typeof content !== "string") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "content must be a string" }),
      };
    }

    if (content.length < 1 || content.length > CONTENT_MAX_LENGTH) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "content must be 1-100000 characters",
        }),
      };
    }

    const formatted = await prettier.format(content, {
      parser: "markdown",
      plugins: [parserMarkdown],
      proseWrap: "preserve",
    });

    const result: FormatMemoResponse = { content: formatted };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`JSON parse error: ${error.message}`);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Request body is invalid" }),
      };
    }

    if (error instanceof AuthenticationError) {
      console.error(`Authentication error: ${error.message}`);
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Not authenticated" }),
      };
    }

    console.error(
      `Unexpected error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
}
