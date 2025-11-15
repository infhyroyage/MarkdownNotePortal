/**
 * 1件のメモを保存する
 */

const { PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { randomUUID } = require('crypto');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('/opt/nodejs/utils');

/**
 * 1件のメモを保存するLambda関数ハンドラー
 * 
 * @param {Object} event - API Gatewayイベント
 * @param {Object} context - Lambda実行コンテキスト
 * @returns {Object} API Gatewayレスポンス
 */
exports.handler = async (event, context) => {
  try {
    const userId = getUserId(event);

    // リクエストボディの取得とパース
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('JSON parse error:', error);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Request body is invalid' }),
      };
    }

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

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoId,
        title,
        lastUpdatedAt: createAt,
      }),
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication error:', error);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not authenticated' }),
      };
    }

    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
