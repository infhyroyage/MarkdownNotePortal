/**
 * 1件のメモを保存する
 */

import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';
import { getDynamoDBClient, getUserId } from '../layer/nodejs/utils.js';
import type { 
  APIGatewayEvent, 
  APIGatewayResponse,
  CreateMemoRequest,
  CreateMemoResponse,
} from '../types/index.js';
import { AuthenticationError } from '../types/index.js';

/**
 * 1件のメモを保存するLambda関数ハンドラー
 * @param event - API Gatewayイベント
 * @returns API Gatewayレスポンス
 */
export async function handler(
  event: APIGatewayEvent,
): Promise<APIGatewayResponse> {
  try {
    const userId = getUserId(event);

    // リクエストボディの取得とパース
    const body: CreateMemoRequest = JSON.parse(event.body || '{}');
    const title = (body.title || '').trim();
    const content = body.content || '';

    // バリデーションチェック
    if (!title || title.length < 1 || title.length > 200) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'title must be between 1 and 200 characters' }),
      };
    }
    if (typeof content !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'content must be a string' }),
      };
    }

    // メモIDを生成して保存
    const memoId = randomUUID();
    const createAt = new Date().toISOString();
    const dynamodb = getDynamoDBClient();
    
    await dynamodb.send(new PutItemCommand({
      TableName: 'mkmemoportal-dynamodb',
      Item: {
        user_id: { S: userId },
        memo_id: { S: memoId },
        title: { S: title },
        content: { S: content },
        create_at: { S: createAt },
      },
    }));

    console.log(`Memo created: user_id=${userId}, memo_id=${memoId}`);

    const response: CreateMemoResponse = {
      memoId,
      title,
      lastUpdatedAt: createAt,
    };

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`JSON parse error: ${error.message}`);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Request body is invalid' }),
      };
    }
    
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
