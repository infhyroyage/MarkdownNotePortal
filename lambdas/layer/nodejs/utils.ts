import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { APIGatewayEvent } from "../../types/api_gateway.js";
import { AuthenticationError } from "./errors.js";

/**
 * Markdown入力の最大文字数
 */
export const CONTENT_MAX_LENGTH = 100000;

/**
 * モデルへ渡すシステムプロンプト
 */
export const SYSTEM_PROMPT = `あなたはMarkdownドキュメントを整形するアシスタントです。
与えられたMarkdownを読み、意味を変えずに整形してください。
- 誤字・脱字があれば修正する。
- 繰り返し構造が明確な情報（例: 複数レコードが同じ項目セットで並ぶ）は表形式へ変換してよい。
- コードブロック、インラインコード、URL、固有名詞の意味は変えない。
- 出力は**Markdown本文のみ**。前置き、説明、見出しでの前置き、コードフェンス（\`\`\`）での囲みは禁止。
- 入力と異なる言語への翻訳はしない（入力が日本語なら日本語のまま）。`;

/**
 * DynamoDBクライアントを取得する
 * @returns {DynamoDBClient} DynamoDBクライアント
 */
export function getDynamoDBClient(): DynamoDBClient {
  const endpointUrl = process.env.DYNAMODB_ENDPOINT;

  if (endpointUrl) {
    // ローカル環境のDynamoDB(DynamoDB Local)
    return new DynamoDBClient({
      endpoint: endpointUrl,
      region: "fakeRegion",
      credentials: {
        accessKeyId: "fakeMyKeyId",
        secretAccessKey: "fakeSecretAccessKey",
      },
    });
  }

  // AWS環境のDynamoDB
  return new DynamoDBClient({});
}

/**
 * Bedrock Runtimeクライアントを取得する
 * @returns {BedrockRuntimeClient} Bedrock Runtimeクライアント
 */
export function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({});
}

/**
 * API GatewayのCognito Authorizerでの認証で生成したCognito JWTトークンのsubクレームからuser_idを取得する
 * @param {APIGatewayEvent} event API Gatewayイベント
 * @returns {string} user_idの文字列
 * @throws {AuthenticationError} 認証エラー
 */
export function getUserId(event: APIGatewayEvent): string {
  // ローカル環境の場合は認証が存在しないため、"local_user"を返す
  const isLocal = process.env.IS_LOCAL?.toLowerCase() === "true";
  if (isLocal) {
    return "local_user";
  }

  const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    throw new AuthenticationError("Not authenticated");
  }
  return userId;
}
