import { describe, expect, it } from "vitest";
import { handler } from "../../edge_viewer_request/index.js";
import type {
  CloudFrontRequest,
  CloudFrontRequestEvent,
} from "../../types/cloudfront.js";

/**
 * テスト用のCloudFrontリクエストイベントを生成するヘルパー関数
 */
function createCloudFrontRequestEvent(
  request: Partial<CloudFrontRequest>
): CloudFrontRequestEvent {
  const defaultRequest: CloudFrontRequest = {
    clientIp: "203.0.113.1",
    headers: {
      host: [{ key: "Host", value: "example.com" }],
    },
    method: "GET",
    querystring: "",
    uri: "/",
    ...request,
  };

  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: "d111111abcdef8.cloudfront.net",
            distributionId: "EDFDVBD6EXAMPLE",
            eventType: "viewer-request",
            requestId: "test-request-id",
          },
          request: defaultRequest,
        },
      },
    ],
  };
}

describe("edge_viewer_request handler", () => {
  // Given: 標準的なGETリクエスト
  // When: handlerを呼び出す
  // Then: リクエストがそのまま返される
  it("TC-N-01: 標準的なGETリクエストをそのまま返す", async () => {
    const event = createCloudFrontRequestEvent({
      method: "GET",
      uri: "/index.html",
      clientIp: "203.0.113.1",
    });

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(result).toHaveProperty("method", "GET");
    expect(result).toHaveProperty("uri", "/index.html");
    expect(result).toHaveProperty("clientIp", "203.0.113.1");
  });

  // Given: 標準的なPOSTリクエスト
  // When: handlerを呼び出す
  // Then: リクエストがそのまま返される
  it("TC-N-02: 標準的なPOSTリクエストをそのまま返す", async () => {
    const event = createCloudFrontRequestEvent({
      method: "POST",
      uri: "/api/data",
      body: {
        inputTruncated: false,
        action: "read-only",
        encoding: "text",
        data: '{"key": "value"}',
      },
    });

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(result).toHaveProperty("method", "POST");
    expect(result).toHaveProperty("uri", "/api/data");
    expect(result).toHaveProperty("body");
  });

  // Given: クエリパラメータ付きリクエスト
  // When: handlerを呼び出す
  // Then: リクエストとクエリパラメータがそのまま返される
  it("TC-N-03: クエリパラメータ付きリクエストをそのまま返す", async () => {
    const event = createCloudFrontRequestEvent({
      method: "GET",
      uri: "/search",
      querystring: "q=test&page=1",
    });

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(result).toHaveProperty("querystring", "q=test&page=1");
  });

  // Given: カスタムヘッダー付きリクエスト
  // When: handlerを呼び出す
  // Then: リクエストとヘッダーがそのまま返される
  it("TC-N-04: カスタムヘッダー付きリクエストをそのまま返す", async () => {
    const event = createCloudFrontRequestEvent({
      method: "GET",
      uri: "/page",
      headers: {
        host: [{ key: "Host", value: "example.com" }],
        "x-custom-header": [{ key: "X-Custom-Header", value: "custom-value" }],
        "accept-language": [{ key: "Accept-Language", value: "ja-JP" }],
      },
    });

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(result).toHaveProperty("headers");
    const resultRequest = result as CloudFrontRequest;
    expect(resultRequest.headers["x-custom-header"]).toEqual([
      { key: "X-Custom-Header", value: "custom-value" },
    ]);
    expect(resultRequest.headers["accept-language"]).toEqual([
      { key: "Accept-Language", value: "ja-JP" },
    ]);
  });

  // Given: 空のquerystringのリクエスト
  // When: handlerを呼び出す
  // Then: リクエストがそのまま返される
  it("TC-B-01: 空のquerystringでも正常に処理する", async () => {
    const event = createCloudFrontRequestEvent({
      method: "GET",
      uri: "/page",
      querystring: "",
    });

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(result).toHaveProperty("querystring", "");
  });

  // Given: ルートURI (`/`) のリクエスト
  // When: handlerを呼び出す
  // Then: リクエストがそのまま返される
  it("TC-B-02: ルートURIでも正常に処理する", async () => {
    const event = createCloudFrontRequestEvent({
      method: "GET",
      uri: "/",
    });

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(result).toHaveProperty("uri", "/");
  });
});
