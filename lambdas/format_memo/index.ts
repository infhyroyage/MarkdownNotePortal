import {
  InvokeModelCommand,
  type InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { AuthenticationError } from "@layer/errors.js";
import { format as prettierFormat } from "prettier";
import {
  CONTENT_MAX_LENGTH,
  getBedrockClient,
  getUserId,
  SYSTEM_PROMPT,
} from "../layer/nodejs/utils.js";
import type { FormatMemoRequest, FormatMemoResponse } from "../types/api.js";
import type {
  APIGatewayEvent,
  APIGatewayResponse,
} from "../types/api_gateway.js";

/**
 * Bedrockのモデル応答からテキストを取り出す
 * @param {InvokeModelCommandOutput["body"]} rawBody Bedrockのモデル応答のボディ
 * @returns {string | null} Bedrockのモデル応答から取り出したテキスト(Bedrockのモデルの応答が不正な場合はnull)
 */
export function extractAssistantTextFromBedrockBody(
  rawBody: InvokeModelCommandOutput["body"],
): string | null {
  // Bedrockのモデル応答が空の場合はnullを返す
  if (!rawBody) {
    return null;
  }

  // Bedrockのモデル応答をJSONとしてパース
  // 不正なJSONのフォーマットやブロックがない場合はnullを返す
  const json = JSON.parse(new TextDecoder().decode(rawBody as Uint8Array)) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const blocks = json.content;
  if (!Array.isArray(blocks)) {
    return null;
  }

  // テキストのみを取り出し結合したテキストを返す
  // テキストがない場合はnullを返す
  const texts = blocks
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string);
  return texts.length === 0 ? null : texts.join("");
}

/**
 * モデルがコードフェンスで囲んだ場合に外側を剥がしたテキストを取り出す
 * @param {string} raw コードフェンスで囲まれる可能性があるテキスト
 * @returns {string} コードフェンスを剥がしたテキスト
 */
export function sanitizeFormattedMarkdown(raw: string): string {
  const trimmed = raw.trim();
  const m = trimmed.match(/^```(?:markdown)?\s*\r?\n([\s\S]*?)\r?\n```$/);
  if (m) {
    return m[1].trim();
  }
  return trimmed;
}

/**
 * MarkdownをBedrockで整形するLambda関数ハンドラー
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

    // AWS環境ではBedrockのモデルを呼び出すが、ローカル環境ではBedrockの呼出しをスキップする
    const isLocal = process.env.IS_LOCAL?.toLowerCase() === "true";
    let rawMarkdown: string;
    if (isLocal) {
      rawMarkdown = content;
    } else {
      // Bedrockのモデルの呼出し
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `次のMarkdownだけを整形して返してください。\n\n${content}`,
              },
            ],
          },
        ],
      };
      const invokeResponse = await getBedrockClient().send(
        new InvokeModelCommand({
          modelId: process.env.BEDROCK_INFERENCE_PROFILE_ID,
          contentType: "application/json",
          accept: "application/json",
          body: Buffer.from(JSON.stringify(payload)),
        }),
      );

      // Bedrockのモデル応答からテキストを取り出す
      const assistantText = extractAssistantTextFromBedrockBody(
        invokeResponse.body,
      );
      if (assistantText === null) {
        console.error("Bedrock response missing assistant text");
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Internal server error" }),
        };
      }

      // モデルがコードフェンスで囲んだ場合に外側を剥がしたテキストを取り出す
      rawMarkdown = sanitizeFormattedMarkdown(assistantText);
    }

    // Prettierで整形(改行・記号などの表記ゆれを正規化)
    const formatted = await prettierFormat(rawMarkdown, {
      parser: "markdown",
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
