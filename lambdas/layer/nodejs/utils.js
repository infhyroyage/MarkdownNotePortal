/**
 * ユーティリティ関数
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

/**
 * DynamoDBクライアントを取得する
 * 
 * @returns {DynamoDBClient} DynamoDBクライアント
 */
function getDynamoDBClient() {
  const endpointUrl = process.env.DYNAMODB_ENDPOINT;
  
  if (endpointUrl) {
    // ローカル環境のDynamoDB(DynamoDB Local)
    return new DynamoDBClient({
      endpoint: endpointUrl,
      region: 'fakeRegion',
      credentials: {
        accessKeyId: 'fakeMyKeyId',
        secretAccessKey: 'fakeSecretAccessKey',
      },
    });
  }

  // AWS環境のDynamoDB
  return new DynamoDBClient({});
}

/**
 * API GatewayのCognito Authorizerでの認証で生成したCognito JWTトークンのsubクレームからuser_idを取得する
 * 
 * @param {Object} event - API Gatewayイベント
 * @returns {string} user_idの文字列
 * @throws {AuthenticationError} 認証エラー
 */
function getUserId(event) {
  // ローカル環境の場合は認証が存在しないため、"local_user"を返す
  if (process.env.IS_LOCAL?.toLowerCase() === 'true') {
    return 'local_user';
  }

  const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    throw new AuthenticationError('Not authenticated');
  }
  return userId;
}

/**
 * 認証エラー
 */
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

module.exports = {
  getDynamoDBClient,
  getUserId,
  AuthenticationError,
};
