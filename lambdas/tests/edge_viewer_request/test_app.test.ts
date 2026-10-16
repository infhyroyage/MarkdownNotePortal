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
 * 任意のペイロードからJWTトークンを生成するヘルパー関数
 * Cognitoが発行するトークンと同じく、各パートをパディングなしのbase64urlでエンコードする
 * @param {Record<string, unknown>} payload JWTペイロード
 * @returns {string} JWTトークン
 */
function createTestJwtFromPayload(payload: Record<string, unknown>): string {
  const encode = (value: string): string =>
    Buffer.from(value).toString("base64url");
  const header = encode(JSON.stringify({ kid: "test-kid=", alg: "RS256" }));
  const body = encode(JSON.stringify(payload));
  const signature = encode("test-signature");
  return `${header}.${body}.${signature}`;
}

/**
 * Cognitoアクセストークンの標準的なクレームにacr/amrを加えたペイロードを生成するヘルパー関数
 * @param {number | undefined} expOffset 現在時刻からの有効期限オフセット(秒)。undefinedの場合はexpを含めない
 * @param {Record<string, unknown>} overrides 追加・上書きするクレーム
 * @returns {Record<string, unknown>} JWTペイロード
 */
function createCognitoAccessTokenPayload(
  expOffset: number | undefined,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub: "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
    iss: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_EXAMPLE",
    version: 2,
    client_id: TEST_CONFIG.clientId,
    origin_jti: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    event_id: "64f513be-32db-42b0-b78e-b02127b4f463",
    token_use: "access",
    scope: "openid email profile",
    auth_time: now,
    iat: now,
    jti: "11112222-3333-4444-5555-666677778888",
    username: "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
    acr: "urn:cognito:loa:4",
    amr: ["pwd", "otp", "mfa"],
    ...overrides,
  };
  if (expOffset !== undefined) {
    payload.exp = now + expOffset;
  }
  return payload;
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
      expect(accessTokenCookie?.value).toContain("Max-Age=43200");

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

  describe("Cognitoトークンへのクレーム追加(acr/amr)に対する前方互換性", () => {
    /**
     * AWS Healthの通知に記載されたサンプルトークンのiat
     */
    const FIXED_NOW_SECONDS = 1790000000;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(FIXED_NOW_SECONDS * 1000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /**
     * アクセストークンCookieを持つリクエストでhandlerを呼び出す
     * @param {string} accessToken アクセストークン
     * @returns {Promise<CloudFrontRequest | CloudFrontResponse>} handlerの結果
     */
    async function invokeWithAccessToken(
      accessToken: string
    ): Promise<CloudFrontRequest | CloudFrontResponse> {
      const event = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/index.html",
        headers: createCookieHeader({
          mkmemoportal_access_token: accessToken,
        }),
      });
      return (await handler(event)) as CloudFrontRequest | CloudFrontResponse;
    }

    /**
     * Cognito Hosted UIのログイン画面へリダイレクトされたことを検証する
     * @param {CloudFrontRequest | CloudFrontResponse} result handlerの結果
     */
    function expectLoginRedirect(
      result: CloudFrontRequest | CloudFrontResponse
    ): void {
      const response = result as CloudFrontResponse;
      expect(response.status).toBe("302");
      expect(response.headers.location[0].value).toContain(
        `https://${TEST_CONFIG.domain}/login?`
      );
      expect(response.headers["set-cookie"][0].value).toContain(
        "mkmemoportal_code_verifier="
      );
    }

    // Given: 通知の「変更後」サンプルと同じacr(loa:1)と要素1つのamr配列を含む有効なアクセストークン
    // When: handlerを呼び出す
    // Then: acr/amrを無視してexpのみで判定し、リクエストを通過させる
    it("TC-N-06: acrと要素1つのamr配列を含む有効なトークンの場合、リクエストを通過させる", async () => {
      const token = createTestJwtFromPayload({
        sub: "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        token_use: "access",
        scope: "openid profile",
        username: "jane.doe",
        iat: FIXED_NOW_SECONDS,
        exp: FIXED_NOW_SECONDS + 3600,
        acr: "urn:cognito:loa:1",
        amr: ["pwd"],
      });

      const result = await invokeWithAccessToken(token);

      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).not.toHaveProperty("status");
    });

    // Given: MFA必須のユーザープールで発行される、acr(loa:4)と複数要素のamr配列を含むアクセストークン
    // When: handlerを呼び出す
    // Then: リクエストを通過させる
    it("TC-N-07: MFA認証時のacr/amrを含む有効なトークンの場合、リクエストを通過させる", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600)
      );

      const result = await invokeWithAccessToken(token);

      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).not.toHaveProperty("status");
    });

    // Given: 将来追加され得る未知のクレーム(オブジェクト・配列・数値・長い文字列)を含み、サイズが大きいトークン
    // When: handlerを呼び出す
    // Then: 未知のクレームとトークンサイズの増加を許容し、リクエストを通過させる
    it("TC-N-08: 未知のクレームを含みサイズが増加したトークンの場合、リクエストを通過させる", async () => {
      const baselineToken = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600)
      );
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600, {
          "future:object_claim": { level: { values: ["a", "b"] } },
          "future:array_claim": [1, "two", { three: 3 }],
          "future:number_claim": 12345,
          "future:string_claim": "x".repeat(1500),
        })
      );
      expect(token.length).toBeGreaterThan(baselineToken.length * 2);
      expect(token.length).toBeLessThan(4096);

      const result = await invokeWithAccessToken(token);

      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).not.toHaveProperty("status");
    });

    // Given: トークンエンドポイントがacr/amrを含むアクセストークンと、未使用のメンバーを含むレスポンスを返す
    // When: Authorization Code付きでhandlerを呼び出し、発行されたCookieで再度handlerを呼び出す
    // Then: アクセストークン全体が切り詰められずにCookieへ設定され、そのCookieでリクエストが通過する
    it("TC-N-09: acr/amrを含むアクセストークンをそのままCookieに保存し、以降のリクエストで認証できる", async () => {
      const accessToken = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600)
      );
      const idToken = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600, {
          token_use: "id",
          aud: TEST_CONFIG.clientId,
        })
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: accessToken,
          id_token: idToken,
          refresh_token: "test-refresh-token",
          expires_in: 43200,
          token_type: "Bearer",
        }),
      });
      const callbackEvent = createCloudFrontRequestEvent({
        method: "GET",
        uri: "/",
        querystring: "code=test-auth-code",
        headers: createCookieHeader({
          mkmemoportal_code_verifier: "test-code-verifier",
        }),
      });

      const callbackResult = (await handler(
        callbackEvent
      )) as CloudFrontResponse;
      const accessTokenCookie = callbackResult.headers["set-cookie"].find(
        (c) => c.value.startsWith("mkmemoportal_access_token=")
      );
      const storedToken = accessTokenCookie?.value
        .split(";")[0]
        .slice("mkmemoportal_access_token=".length);
      const nextResult = await invokeWithAccessToken(storedToken ?? "");

      expect(callbackResult.status).toBe("302");
      expect(accessTokenCookie?.value).toBe(
        `mkmemoportal_access_token=${accessToken}; Max-Age=43200; Path=/; Secure; SameSite=Lax`
      );
      expect(storedToken).toBe(accessToken);
      expect(nextResult).toHaveProperty("uri", "/index.html");
      expect(nextResult).not.toHaveProperty("status");
    });

    // Given: acr/amrを含むが有効期限切れのアクセストークン
    // When: handlerを呼び出す
    // Then: acr/amrの有無に関係なく期限切れとして扱い、ログイン画面へリダイレクトする
    it("TC-A-08: acr/amrを含む期限切れトークンの場合、リダイレクトする", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(-3600)
      );

      const result = await invokeWithAccessToken(token);

      expectLoginRedirect(result);
    });

    // Given: acr/amrを含むがexpクレームを持たないトークン
    // When: handlerを呼び出す
    // Then: 有効なトークンとみなさず、ログイン画面へリダイレクトする
    it("TC-A-09: acr/amrを含むがexpがないトークンの場合、リダイレクトする", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(undefined)
      );

      const result = await invokeWithAccessToken(token);

      expectLoginRedirect(result);
    });

    // Given: acr/amrを含むペイロードだが、署名パートが欠落したJWT(2パート)
    // When: handlerを呼び出す
    // Then: JWT構造が不正としてログイン画面へリダイレクトする
    it("TC-A-10: acr/amrを含むが署名パートが欠落したトークンの場合、リダイレクトする", async () => {
      const [header, body] = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600)
      ).split(".");

      const result = await invokeWithAccessToken(`${header}.${body}`);

      expectLoginRedirect(result);
    });

    // Given: acr/amrを含み、有効期限がちょうど現在時刻のトークン
    // When: handlerを呼び出す
    // Then: 期限切れとして扱い、ログイン画面へリダイレクトする
    it("TC-B-04: acr/amrを含み有効期限がちょうど現在時刻の場合、リダイレクトする", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(0)
      );

      const result = await invokeWithAccessToken(token);

      expectLoginRedirect(result);
    });

    // Given: acr/amrを含み、有効期限が1秒後のトークン
    // When: handlerを呼び出す
    // Then: リクエストを通過させる
    it("TC-B-05: acr/amrを含み有効期限が1秒後の場合、リクエストを通過させる", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(1)
      );

      const result = await invokeWithAccessToken(token);

      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).not.toHaveProperty("status");
    });

    // Given: amrが空配列、acrが空文字の有効なトークン
    // When: handlerを呼び出す
    // Then: acr/amrの値に依存せず、リクエストを通過させる
    it("TC-B-06: amrが空配列・acrが空文字の場合でも、リクエストを通過させる", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600, { acr: "", amr: [] })
      );

      const result = await invokeWithAccessToken(token);

      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).not.toHaveProperty("status");
    });

    // Given: acr/amrがnullの有効なトークン
    // When: handlerを呼び出す
    // Then: acr/amrの値に依存せず、リクエストを通過させる
    it("TC-B-07: acr/amrがnullの場合でも、リクエストを通過させる", async () => {
      const token = createTestJwtFromPayload(
        createCognitoAccessTokenPayload(3600, { acr: null, amr: null })
      );

      const result = await invokeWithAccessToken(token);

      expect(result).toHaveProperty("uri", "/index.html");
      expect(result).not.toHaveProperty("status");
    });
  });
});
