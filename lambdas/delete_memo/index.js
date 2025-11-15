/**
 * 指定した1件の保存済みメモを削除する
 */

import { GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

// Lambda環境では/opt/nodejsから、テスト環境では相対パスからインポート
let utils;
try {
  utils = await import('/opt/nodejs/utils.js');
} catch {
  utils = await import('../layer/nodejs/utils.js');
}
const { getDynamoDBClient, getUserId, AuthenticationError } = utils;

/**
 * 指定した1件の保存済みメモを削除するLambda関数ハンドラー
 * @param {Object} event - API Gatewayイベント
 * @param {Object} _context - Lambda実行コンテキスト
 * @returns {Object} API Gatewayレスポンス
 */
export async function handler(event, _context) {
  try {
    const userId = getUserId(event);

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

    // メモを削除
    await dynamodb.send(new DeleteItemCommand({
      TableName: 'mkmemoportal-dynamodb',
      Key: {
        user_id: { S: userId },
        memo_id: { S: memoId },
      },
    }));

    console.log(`Memo deleted: user_id=${userId}, memo_id=${memoId}`);

    return {
      statusCode: 204,
      headers: { 'Content-Type': 'application/json' },
      body: '',
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

    console.error(`Unexpected error: ${error.message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
