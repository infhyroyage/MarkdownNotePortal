/**
 * API Gateway Event型定義
 */
export interface APIGatewayEvent {
  body?: string;
  pathParameters?: Record<string, string>;
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
        };
      };
    };
  };
}

/**
 * API Gateway Response型定義
 */
export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
