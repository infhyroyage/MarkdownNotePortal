import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "../types/cloudfront.js";
/**
 * CloudFrontビューワーリクエストを処理するLambda@Edge関数ハンドラー
 * @param {CloudFrontRequestEvent} event CloudFrontリクエストイベント
 * @returns {CloudFrontRequestResult} CloudFrontリクエスト結果
 */
export async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequestResult> {
  const request = event.Records[0].cf.request;
  // TODO: 現時点では未実装であり、リクエストをそのまま返す
  return request;
}
