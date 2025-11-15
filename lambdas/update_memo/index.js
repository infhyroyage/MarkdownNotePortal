/**
 * 指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新する
 */

const { GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('/opt/nodejs/utils');

/**
 * 指定した1件の保存済みのメモのタイトルと内容(Markdown文字列)を更新するLambda関数ハンドラー
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoId,
        title,
        content,
        lastUpdatedAt: updateAt,
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
      body: JSON.stringify({ message: 'Unexpected error' }),
    };
  }
};
