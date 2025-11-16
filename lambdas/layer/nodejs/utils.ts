/**
 * ユーティリティ関数
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { APIGatewayEvent } from '../../types/api.js';
import { AuthenticationError } from '../../types/errors.js';

/**
 * DynamoDBクライアントを取得する
 * @returns DynamoDBクライアント
 */
export function getDynamoDBClient(): DynamoDBClient {
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
 * @param event - API Gatewayイベント
 * @returns user_idの文字列
 * @throws {AuthenticationError} 認証エラー
 */
export function getUserId(event: APIGatewayEvent): string {
  // ローカル環境の場合は認証が存在しないため、"local_user"を返す
  const isLocal = process.env.IS_LOCAL?.toLowerCase() === 'true';
  if (isLocal) {
    return 'local_user';
  }

  const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    throw new AuthenticationError('Not authenticated');
  }
  return userId;
}

// 型定義は types/ からインポートするため、ここでは再エクスポートのみ
export { AuthenticationError } from '../../types/errors.js';
