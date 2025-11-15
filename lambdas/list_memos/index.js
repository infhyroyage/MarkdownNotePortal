/**
 * 保存済みメモの一覧を返す
 */

const { QueryCommand } = require('@aws-sdk/client-dynamodb');
const { getDynamoDBClient, getUserId, AuthenticationError } = require('/opt/nodejs/utils');

/**
 * 保存済みのメモの一覧を返すLambda関数ハンドラー
 * 
 * @param {Object} event - API Gatewayイベント
 * @param {Object} context - Lambda実行コンテキスト
 * @returns {Object} API Gatewayレスポンス
 */
exports.handler = async (event, context) => {
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
    const items = (response.Items || []).map(item => {
      // update_atが存在する場合はupdate_at、存在しない場合はcreate_atを使用
      const lastUpdatedAt = item.update_at?.S || item.create_at?.S || '';
      return {
        memoId: item.memo_id?.S || '',
        title: item.title?.S || '',
        lastUpdatedAt,
      };
    });

    // 最終更新日時の降順でソート
    items.sort((a, b) => {
      const dateA = a.lastUpdatedAt || '';
      const dateB = b.lastUpdatedAt || '';
      return dateB.localeCompare(dateA);
    });

    console.log(`Memo list retrieved: user_id=${userId}, count=${items.length}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
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
