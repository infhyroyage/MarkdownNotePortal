/**
 * 保存済みメモの一覧を返す
 */

import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { getDynamoDBClient, getUserId } from '../layer/nodejs/utils.js';
import type { 
  APIGatewayEvent, 
  APIGatewayResponse,
  ListMemosResponse,
} from '../types/index.js';
import { AuthenticationError, convertDynamoDBToMemoListItem } from '../types/index.js';

/**
 * 保存済みのメモの一覧を返すLambda関数ハンドラー
 * @param event - API Gatewayイベント
 * @returns API Gatewayレスポンス
 */
export async function handler(
  event: APIGatewayEvent,
): Promise<APIGatewayResponse> {
  try {
    const userId = getUserId(event);

    // メモ一覧を取得
    const dynamodb = getDynamoDBClient();
    const response = await dynamodb.send(new QueryCommand({
      TableName: 'mkmemoportal-dynamodb',
      KeyConditionExpression: 'user_id = :user_id',
      ExpressionAttributeValues: {
        ':user_id': { S: userId },
      },
      ProjectionExpression: 'memo_id, title, create_at, update_at',
    }));

    // レスポンスの整形
    const items = (response.Items || []).map(convertDynamoDBToMemoListItem);

    // 最終更新日時の降順でソート
    items.sort((a, b) => {
      const dateA = a.lastUpdatedAt || '';
      const dateB = b.lastUpdatedAt || '';
      return dateB.localeCompare(dateA);
    });

    console.log(`Memo list retrieved: user_id=${userId}, count=${items.length}`);

    const result: ListMemosResponse = { items };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error(`Authentication error: ${error.message}`);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not authenticated' }),
      };
    }

    console.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
