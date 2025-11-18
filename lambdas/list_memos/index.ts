import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { AuthenticationError } from "../layer/nodejs/errors.js";
import { getDynamoDBClient, getUserId } from "../layer/nodejs/utils.js";
import type { APIGatewayEvent, APIGatewayResponse } from "../types/api.js";
import type {
  DynamoDBItem,
  ListMemosResponse,
  MemoListItem,
} from "../types/dynamodb.js";

/**
 * 保存済みのメモの一覧を返すLambda関数ハンドラー
 * @param {APIGatewayEvent} event API Gatewayイベント
 * @returns {APIGatewayResponse} API Gatewayレスポンス
 */
export async function handler(
  event: APIGatewayEvent
): Promise<APIGatewayResponse> {
  try {
    const userId = getUserId(event);

    // クエリパラメータから検索文字列を取得
    const searchQuery = event.queryStringParameters?.search?.trim() || "";

    // メモ一覧を取得
    const dynamodb = getDynamoDBClient();
    const queryParams = {
      TableName: "mkmemoportal-dynamodb",
      KeyConditionExpression: "user_id = :user_id",
      ExpressionAttributeValues: {
        ":user_id": { S: userId },
      },
      // 検索文字列が指定されている場合、contentも取得
      ProjectionExpression: searchQuery
        ? "memo_id, title, content, create_at, update_at"
        : "memo_id, title, create_at, update_at",
    };

    const response = await dynamodb.send(new QueryCommand(queryParams));

    // レスポンスの整形（フィルタリング用に一時的にcontentも含める）
    interface MemoListItemWithContent extends MemoListItem {
      content: string;
    }

    let itemsWithContent: MemoListItemWithContent[] = (response.Items || []).map(
      (item: DynamoDBItem) => {
        const memoId = item.memo_id?.S || "";
        const title = item.title?.S || "";
        const content = item.content?.S || "";
        const lastUpdatedAt = item.update_at?.S || item.create_at?.S || "";

        return {
          memoId,
          title,
          content,
          lastUpdatedAt,
        };
      }
    );

    // 検索文字列が指定されている場合、大文字小文字を区別せずにフィルタリング
    if (searchQuery) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      itemsWithContent = itemsWithContent.filter((item) => {
        const lowerTitle = item.title.toLowerCase();
        const lowerContent = item.content.toLowerCase();
        return (
          lowerTitle.includes(lowerSearchQuery) ||
          lowerContent.includes(lowerSearchQuery)
        );
      });
    }

    // contentプロパティを除外して最終的なレスポンス形式に変換
    const items: MemoListItem[] = itemsWithContent.map(
      ({ memoId, title, lastUpdatedAt }) => ({
        memoId,
        title,
        lastUpdatedAt,
      })
    );

    // 最終更新日時の降順でソート
    items.sort((a, b) => {
      const dateA = a.lastUpdatedAt || "";
      const dateB = b.lastUpdatedAt || "";
      return dateB.localeCompare(dateA);
    });

    console.log(
      `Memo list retrieved: user_id=${userId}, count=${items.length}`
    );

    const result: ListMemosResponse = { items };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
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
