import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearConfigCache,
    handler,
    setConfigCache,
} from "../../edge_viewer_request/index.js";
import type {
    CloudFrontHeaders,
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
} from "../../types/cloudfront.js";

// SSMClientのモック
vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  GetParametersCommand: vi.fn(),
}));

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * テスト用のCognito設定
 */
const TEST_CONFIG = {
  clientId: "test-client-id",
  domain: "test-domain.auth.ap-northeast-1.amazoncognito.com",
  cloudfrontDomain: "d111111abcdef8.cloudfront.net",
};

/**
 * 有効なJWTトークンを生成するヘルパー関数
 * @param {number} expOffset 現在時刻からの有効期限オフセット(秒)
 * @returns {string} JWTトークン
 */
function createTestJwt(expOffset: number): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "test-user-id",
      exp: Math.floor(Date.now() / 1000) + expOffset,
    })
  );
  const signature = btoa("test-signature");
  return `${header}.${payload}.${signature}`;
}

/**
 * テスト用のCloudFrontリクエストイベントを生成するヘルパー関数
 */
function createCloudFrontRequestEvent(
  request: Partial<CloudFrontRequest>
): CloudFrontRequestEvent {
  const defaultRequest: CloudFrontRequest = {
    clientIp: "203.0.113.1",
    headers: {
      host: [{ key: "Host", value: "d111111abcdef8.cloudfront.net" }],
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

/**
 * Cookieヘッダーを生成するヘルパー関数
 */
function createCookieHeader(cookies: Record<string, string>): CloudFrontHeaders {
  const cookieString = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return {
    host: [{ key: "Host", value: "d111111abcdef8.cloudfront.net" }],
    cookie: [{ key: "Cookie", value: cookieString }],
  };
}

describe("edge_viewer_request handler", () => {
  beforeEach(() => {
    // テスト前に設定キャッシュをセット
    setConfigCache(TEST_CONFIG);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // テスト後に設定キャッシュをクリア
    clearConfigCache();
  });

  describe("有効なトークンがある場合", () => {
    // Given: 有効なアクセストークンCookieがある
    // When: handlerを呼び出す
    // Then: リクエストがそのまま通過する
    it("TC-N-01: 有効なアクセストークンCookieがある場合、リクエストを通過させる", async () => {
      const validToken = createTestJwt(3600); // 1時間後に期限切れ
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/index.html",
        headers: createCookieHeader({
          mkmemoportal_access_token: validToken,
        }),
      });

      const result = await handler(event);

      // リクエストがそのまま返される(CloudFrontRequestオブジェクト)
      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).toHaveProperty("method", "GET");
      expect(result).not.toHaveProperty("status");
    });

    // Given: 有効なアクセストークンCookieと他のCookieがある
    // When: handlerを呼び出す
    // Then: リクエストがそのまま通過する
    it("TC-N-02: 複数のCookieがある場合でも正常に認証できる", async () => {
      const validToken = createTestJwt(3600);
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/page",
        headers: createCookieHeader({
          other_cookie: "other_value",
          mkmemoportal_access_token: validToken,
          another_cookie: "another_value",
        }),
      });

      const result = await handler(event);

      expect(result).toHaveProperty("uri", "/page");
      expect(result).not.toHaveProperty("status");
    });
  });

  describe("トークンがない場合", () => {
    // Given: Cookieヘッダーがない
    // When: handlerを呼び出す
    // Then: Cognito Hosted UIにリダイレクトされる
    it("TC-A-01: Cookieがない場合、Cognito Hosted UIにリダイレクトする", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: {
          host: [{ key: "Host", value: "d111111abcdef8.cloudfront.net" }],
        },
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain(TEST_CONFIG.domain);
      expect(result.headers.location[0].value).toContain("/login");
      expect(result.headers.location[0].value).toContain(
        `client_id=${TEST_CONFIG.clientId}`
      );
      // code_verifier Cookieが設定される
      expect(result.headers["set-cookie"]).toBeDefined();
      expect(result.headers["set-cookie"][0].value).toContain(
        "mkmemoportal_code_verifier"
      );
    });

    // Given: アクセストークンCookieがない(他のCookieはある)
    // When: handlerを呼び出す
    // Then: Cognito Hosted UIにリダイレクトされる
    it("TC-A-02: アクセストークンCookieがない場合、リダイレクトする", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          other_cookie: "other_value",
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/login");
    });
  });

  describe("無効/期限切れトークンの場合", () => {
    // Given: 期限切れのアクセストークンCookieがある
    // When: handlerを呼び出す
    // Then: Cognito Hosted UIにリダイレクトされる
    it("TC-A-03: 期限切れトークンの場合、リダイレクトする", async () => {
      const expiredToken = createTestJwt(-3600); // 1時間前に期限切れ
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          mkmemoportal_access_token: expiredToken,
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/login");
    });

    // Given: 不正な形式のトークンがある
    // When: handlerを呼び出す
    // Then: Cognito Hosted UIにリダイレクトされる
    it("TC-A-04: 不正な形式のトークンの場合、リダイレクトする", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          mkmemoportal_access_token: "invalid-token",
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/login");
    });

    // Given: JWTの構造が不正(パート数が3ではない)
    // When: handlerを呼び出す
    // Then: Cognito Hosted UIにリダイレクトされる
    it("TC-A-05: JWT構造が不正な場合、リダイレクトする", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          mkmemoportal_access_token: "only.two.parts.not.valid",
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/login");
    });
  });

  describe("Authorization Codeがある場合", () => {
    // Given: Authorization Codeとcode_verifier Cookieがある
    // When: handlerを呼び出す
    // Then: トークンを交換してCookieにセットしリダイレクトする
    it("TC-N-03: Authorization Codeとcode_verifierがある場合、トークン交換を行う", async () => {
      const mockAccessToken = createTestJwt(3600);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: mockAccessToken }),
      });

      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        querystring: "code=test-auth-code",
        headers: createCookieHeader({
          mkmemoportal_code_verifier: "test-code-verifier",
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      // トークンエンドポイントが呼ばれる
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/oauth2/token"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
      );

      // リダイレクトレスポンス
      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toBe(
        `https://${TEST_CONFIG.cloudfrontDomain}/`
      );

      // アクセストークンCookieが設定される
      const setCookies = result.headers["set-cookie"];
      expect(setCookies).toBeDefined();

      const accessTokenCookie = setCookies.find((c) =>
        c.value.startsWith("mkmemoportal_access_token=")
      );
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie?.value).toContain(mockAccessToken);

      // code_verifier Cookieが削除される
      const codeVerifierCookie = setCookies.find((c) =>
        c.value.startsWith("mkmemoportal_code_verifier=")
      );
      expect(codeVerifierCookie).toBeDefined();
      expect(codeVerifierCookie?.value).toContain("Max-Age=0");
    });

    // Given: Authorization Codeはあるがcode_verifier Cookieがない
    // When: handlerを呼び出す
    // Then: ログインフローを再開始する
    it("TC-A-06: code_verifierがない場合、ログインフローを再開始する", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        querystring: "code=test-auth-code",
        headers: {
          host: [{ key: "Host", value: "d111111abcdef8.cloudfront.net" }],
        },
      });

      const result = (await handler(event)) as CloudFrontResponse;

      // トークンエンドポイントは呼ばれない
      expect(mockFetch).not.toHaveBeenCalled();

      // ログインページにリダイレクト
      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/login");

      // 新しいcode_verifierが設定される
      expect(result.headers["set-cookie"][0].value).toContain(
        "mkmemoportal_code_verifier"
      );
    });

    // Given: トークン交換が失敗する
    // When: handlerを呼び出す
    // Then: ログインページにリダイレクトする
    it("TC-A-07: トークン交換が失敗した場合、ログインページにリダイレクトする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        querystring: "code=invalid-auth-code",
        headers: createCookieHeader({
          mkmemoportal_code_verifier: "test-code-verifier",
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/login");
    });
  });

  describe("ログアウトリクエスト", () => {
    // Given: logout=trueクエリパラメータがある
    // When: handlerを呼び出す
    // Then: Cognito Hosted UIのログアウトページにリダイレクトしCookieを削除する
    it("TC-N-04: ログアウトリクエストの場合、Cookieを削除してログアウトページにリダイレクトする", async () => {
      const validToken = createTestJwt(3600);
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        querystring: "logout=true",
        headers: createCookieHeader({
          mkmemoportal_access_token: validToken,
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      // ログアウトページにリダイレクト
      expect(result.status).toBe("302");
      expect(result.headers.location[0].value).toContain("/logout");
      expect(result.headers.location[0].value).toContain(
        `client_id=${TEST_CONFIG.clientId}`
      );

      // Cookieが削除される
      const setCookies = result.headers["set-cookie"];
      expect(setCookies.length).toBe(2);

      // アクセストークンCookieが削除される
      const accessTokenCookie = setCookies.find((c) =>
        c.value.startsWith("mkmemoportal_access_token=")
      );
      expect(accessTokenCookie?.value).toContain("Max-Age=0");

      // code_verifier Cookieも削除される
      const codeVerifierCookie = setCookies.find((c) =>
        c.value.startsWith("mkmemoportal_code_verifier=")
      );
      expect(codeVerifierCookie?.value).toContain("Max-Age=0");
    });
  });

  describe("境界値テスト", () => {
    // Given: 有効期限がちょうど現在時刻のトークン
    // When: handlerを呼び出す
    // Then: リダイレクトされる(期限切れとして扱う)
    it("TC-B-01: 有効期限がちょうど現在時刻の場合、リダイレクトする", async () => {
      const expiredToken = createTestJwt(0);
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          mkmemoportal_access_token: expiredToken,
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
    });

    // Given: 有効期限が1秒後のトークン
    // When: handlerを呼び出す
    // Then: リクエストが通過する
    it("TC-B-02: 有効期限が1秒後の場合、リクエストを通過させる", async () => {
      const validToken = createTestJwt(1);
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          mkmemoportal_access_token: validToken,
        }),
      });

      const result = await handler(event);

      expect(result).not.toHaveProperty("status");
      expect(result).toHaveProperty("uri", "/");
    });

    // Given: 空のCookie値
    // When: handlerを呼び出す
    // Then: リダイレクトされる
    it("TC-B-03: 空のトークン値の場合、リダイレクトする", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        headers: createCookieHeader({
          mkmemoportal_access_token: "",
        }),
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
    });
  });

  describe("PKCEフロー", () => {
    // Given: ログインリダイレクトが発生する
    // When: handlerを呼び出す
    // Then: code_challengeパラメータが含まれる
    it("TC-N-05: ログインURLにPKCEパラメータが含まれる", async () => {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
      });

      const result = (await handler(event)) as CloudFrontResponse;

      expect(result.status).toBe("302");
      const loginUrl = result.headers.location[0].value;
      expect(loginUrl).toContain("code_challenge=");
      expect(loginUrl).toContain("code_challenge_method=S256");
    });
  });
});
