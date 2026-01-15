/**
 * CloudFront Request Headers型定義
 */
export interface CloudFrontHeaders {
  [key: string]: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * CloudFront Origin (S3)型定義
 */
export interface CloudFrontS3Origin {
  authMethod: "origin-access-identity" | "none";
  customHeaders: CloudFrontHeaders;
  domainName: string;
  path: string;
  region: string;
}

/**
 * CloudFront Origin (Custom)型定義
 */
export interface CloudFrontCustomOrigin {
  customHeaders: CloudFrontHeaders;
  domainName: string;
  keepaliveTimeout: number;
  path: string;
  port: number;
  protocol: "http" | "https";
  readTimeout: number;
  sslProtocols: string[];
}

/**
 * CloudFront Origin型定義
 */
export interface CloudFrontOrigin {
  s3?: CloudFrontS3Origin;
  custom?: CloudFrontCustomOrigin;
}

/**
 * CloudFront Request型定義
 */
export interface CloudFrontRequest {
  clientIp: string;
  headers: CloudFrontHeaders;
  method: string;
  querystring: string;
  uri: string;
  body?: {
    inputTruncated: boolean;
    action: "read-only" | "replace";
    encoding: "base64" | "text";
    data: string;
  };
  origin?: CloudFrontOrigin;
}

/**
 * CloudFront Response型定義
 */
export interface CloudFrontResponse {
  status: string;
  statusDescription?: string;
  headers: CloudFrontHeaders;
  body?: string;
  bodyEncoding?: "text" | "base64";
}

/**
 * CloudFront Event Record型定義
 */
export interface CloudFrontEventRecord {
  cf: {
    config: {
      distributionDomainName: string;
      distributionId: string;
      eventType:
        | "viewer-request"
        | "viewer-response"
        | "origin-request"
        | "origin-response";
      requestId: string;
    };
    request: CloudFrontRequest;
    response?: CloudFrontResponse;
  };
}

/**
 * CloudFront Request Event型定義 (viewer-request, origin-request)
 */
export interface CloudFrontRequestEvent {
  Records: CloudFrontEventRecord[];
}

/**
 * CloudFront Request Result型定義
 * リクエストをそのまま返すか、レスポンスを生成して返す
 */
export type CloudFrontRequestResult = CloudFrontRequest | CloudFrontResponse;
