import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { AuthenticationError } from "@layer/errors.js";
import { getDynamoDBClient, getUserId } from "../layer/nodejs/utils.js";
import type { APIGatewayEvent, APIGatewayResponse } from "../types/api.js";
import type { GetMemoResponse } from "../types/dynamodb.js";
/**
 * 指定した1件の保存済みメモのタイトルと内容(Markdown文字列)を返すLambda関数ハンドラー
 * @param {APIGatewayEvent} event API Gatewayイベント
 * @returns {APIGatewayResponse} API Gatewayレスポンス
 */
export async function handler(
  event: APIGatewayEvent
): Promise<APIGatewayResponse> {
  try {
    const userId = getUserId(event);

    // memo_idの取得
    const memoId = event.pathParameters?.memoId;
    if (!memoId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "memoId is required" }),
      };
    }

    // メモが見つからない場合は404エラーをレスポンス
    const dynamodb = getDynamoDBClient();
    const response = await dynamodb.send(
      new GetItemCommand({
        TableName: "mkmemoportal-dynamodb",
        Key: {
          user_id: { S: userId },
          memo_id: { S: memoId },
        },
      })
    );

    if (!response.Item) {
      console.log(`Memo not found: user_id=${userId}, memo_id=${memoId}`);
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Memo not found" }),
      };
    }

    // レスポンスの整形
    const item: GetMemoResponse = {
      memoId: response.Item.memo_id?.S || "",
      title: response.Item.title?.S || "",
      content: response.Item.content?.S || "",
    };

    console.log(`Memo retrieved: user_id=${userId}, memo_id=${memoId}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    };
  } catch (error) {
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
      }`
    );
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
}
