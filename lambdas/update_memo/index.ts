/**
 * 指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新する
 */

import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { getDynamoDBClient, getUserId } from '../layer/nodejs/utils.js';
import type { 
  APIGatewayEvent, 
  APIGatewayResponse,
  UpdateMemoRequest,
  UpdateMemoResponse,
} from '../types/index.js';
import { AuthenticationError } from '../types/index.js';

/**
 * 指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するLambda関数ハンドラー
 * @param event - API Gatewayイベント
 * @returns API Gatewayレスポンス
 */
export async function handler(
  event: APIGatewayEvent,
): Promise<APIGatewayResponse> {
  try {
    const userId = getUserId(event);

    // リクエストボディの取得とパース
    const body: UpdateMemoRequest = JSON.parse(event.body || '{}');
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

    // memo_idの取得
    const memoId = event.pathParameters?.memoId;
    if (!memoId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'memoId is required' }),
      };
    }

    // メモが見つからない場合は404エラーをレスポンス
    const dynamodb = getDynamoDBClient();
    const getResponse = await dynamodb.send(new GetItemCommand({
      TableName: 'mkmemoportal-dynamodb',
      Key: {
        user_id: { S: userId },
        memo_id: { S: memoId },
      },
    }));

    if (!getResponse.Item) {
      console.log(`Memo not found: user_id=${userId}, memo_id=${memoId}`);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Memo not found' }),
      };
    }

    // メモを更新
    const updateAt = new Date().toISOString();
    await dynamodb.send(new UpdateItemCommand({
      TableName: 'mkmemoportal-dynamodb',
      Key: {
        user_id: { S: userId },
        memo_id: { S: memoId },
      },
      UpdateExpression: 'SET title = :title, content = :content, update_at = :update_at',
      ExpressionAttributeValues: {
        ':title': { S: title },
        ':content': { S: content },
        ':update_at': { S: updateAt },
      },
    }));

    console.log(`Memo updated: user_id=${userId}, memo_id=${memoId}`);

    const result: UpdateMemoResponse = {
      memoId,
      title,
      content,
      lastUpdatedAt: updateAt,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
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
      body: JSON.stringify({ message: 'Unexpected error' }),
    };
  }
}
