import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import type {
  CloudFrontHeaders,
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
  CloudFrontResponse,
} from "../types/cloudfront.js";

/**
 * Cookie名の定数
 */
const COOKIE_NAME_ACCESS_TOKEN = "mkmemoportal_access_token";
const COOKIE_NAME_CODE_VERIFIER = "mkmemoportal_code_verifier";

/**
 * Parameter Storeのパラメータ名
 */
const SSM_PARAM_COGNITO_CLIENT_ID = "/mkmemoportal/cognito/client_id";
const SSM_PARAM_COGNITO_DOMAIN = "/mkmemoportal/cognito/domain";
const SSM_PARAM_CLOUDFRONT_DOMAIN = "/mkmemoportal/cloudfront/domain";

/**
 * Parameter Storeから取得した設定のキャッシュ
 */
interface CognitoConfig {
  clientId: string;
  domain: string;
  cloudfrontDomain: string;
}

let cachedConfig: CognitoConfig | null = null;

/**
 * Parameter Storeから設定を取得する(キャッシュ付き)
 * @returns {Promise<CognitoConfig>} Cognito設定
 */
async function getConfig(): Promise<CognitoConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const client = new SSMClient({ region: "ap-northeast-1" });
  const command = new GetParametersCommand({
    Names: [
      SSM_PARAM_COGNITO_CLIENT_ID,
      SSM_PARAM_COGNITO_DOMAIN,
      SSM_PARAM_CLOUDFRONT_DOMAIN,
    ],
  });

  const response = await client.send(command);
  const params = response.Parameters || [];

  const getParamValue = (name: string): string => {
    const param = params.find(
      (p: { Name?: string; Value?: string }) => p.Name === name
    );
    if (!param || !param.Value) {
      throw new Error(`Parameter ${name} not found`);
    }
    return param.Value;
  };

  cachedConfig = {
    clientId: getParamValue(SSM_PARAM_COGNITO_CLIENT_ID),
    domain: getParamValue(SSM_PARAM_COGNITO_DOMAIN),
    cloudfrontDomain: getParamValue(SSM_PARAM_CLOUDFRONT_DOMAIN),
  };

  return cachedConfig;
}

/**
 * CloudFrontヘッダーからCookieを解析する
 * @param {CloudFrontHeaders} headers CloudFrontヘッダー
 * @returns {Record<string, string>} Cookie名と値のマップ
 */
function parseCookies(headers: CloudFrontHeaders): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeader = headers["cookie"];

  if (!cookieHeader || cookieHeader.length === 0) {
    return cookies;
  }

  for (const header of cookieHeader) {
    const pairs = header.value.split(";");
    for (const pair of pairs) {
      const [name, ...valueParts] = pair.trim().split("=");
      if (name) {
        cookies[name.trim()] = valueParts.join("=").trim();
      }
    }
  }

  return cookies;
}

/**
 * PKCEフロー用のcode_verifierを生成する
 * @returns {string} code_verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => ("0" + byte.toString(16)).slice(-2)).join(
    ""
  );
}

/**
 * PKCEフロー用のcode_challengeを生成する
 * @param {string} codeVerifier code_verifier
 * @returns {Promise<string>} code_challenge
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * アクセストークンの有効性を検証する
 * @param {string} accessToken アクセストークン
 * @returns {boolean} 有効な場合はtrue
 */
function isAccessTokenValid(accessToken: string): boolean {
  try {
    // JWTトークンとしての構造をチェック
    const parts = accessToken.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // ペイロードをデコード
    const payload = JSON.parse(
      decodeURIComponent(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );

    // 有効期限をチェック
    const exp = payload.exp as number;
    const now = Math.floor(Date.now() / 1000);
    return exp > now;
  } catch {
    return false;
  }
}

/**
 * Cognito Hosted UIのログインURLを生成する
 * @param {CognitoConfig} config Cognito設定
 * @param {string} codeChallenge code_challenge
 * @returns {string} ログインURL
 */
function buildLoginUrl(config: CognitoConfig, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `https://${config.cloudfrontDomain}/`,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://${config.domain}/login?${params.toString()}`;
}

/**
 * Cognito Hosted UIのログアウトURLを生成する
 * @param {CognitoConfig} config Cognito設定
 * @returns {string} ログアウトURL
 */
function buildLogoutUrl(config: CognitoConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: `https://${config.cloudfrontDomain}/`,
  });
  return `https://${config.domain}/logout?${params.toString()}`;
}

/**
 * Cognitoトークンエンドポイントからアクセストークンを取得する
 * @param {CognitoConfig} config Cognito設定
 * @param {string} code Authorization Code
 * @param {string} codeVerifier code_verifier
 * @returns {Promise<string>} アクセストークン
 */
async function exchangeCodeForToken(
  config: CognitoConfig,
  code: string,
  codeVerifier: string
): Promise<string> {
  const tokenUrl = `https://${config.domain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code: code,
    redirect_uri: `https://${config.cloudfrontDomain}/`,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Set-Cookieヘッダーを生成する
 * @param {string} name Cookie名
 * @param {string} value Cookie値
 * @param {object} options オプション
 * @returns {string} Set-Cookie値
 */
function buildSetCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    expires?: Date;
  } = {}
): string {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join("; ");
}

/**
 * リダイレクトレスポンスを生成する
 * @param {string} location リダイレクト先URL
 * @param {string[]} setCookies Set-Cookieヘッダーの配列
 * @returns {CloudFrontResponse} CloudFrontレスポンス
 */
function buildRedirectResponse(
  location: string,
  setCookies: string[] = []
): CloudFrontResponse {
  const headers: CloudFrontHeaders = {
    location: [{ key: "Location", value: location }],
    "cache-control": [{ key: "Cache-Control", value: "no-cache, no-store" }],
  };

  if (setCookies.length > 0) {
    headers["set-cookie"] = setCookies.map((cookie) => ({
      key: "Set-Cookie",
      value: cookie,
    }));
  }

  return {
    status: "302",
    statusDescription: "Found",
    headers,
  };
}

/**
 * クエリストリングをパースする
 * @param {string} querystring クエリストリング
 * @returns {Record<string, string>} パラメータマップ
 */
function parseQueryString(querystring: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!querystring) {
    return params;
  }

  const pairs = querystring.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  }

  return params;
}

/**
 * CloudFrontビューワーリクエストを処理するLambda@Edge関数ハンドラー
 * @param {CloudFrontRequestEvent} event CloudFrontリクエストイベント
 * @returns {CloudFrontRequestResult} CloudFrontリクエスト結果
 */
export async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequestResult> {
  const request: CloudFrontRequest = event.Records[0].cf.request;

  try {
    // Parameter Storeから設定を取得
    const config = await getConfig();

    // Cookieを解析
    const cookies = parseCookies(request.headers);

    // クエリパラメータを解析
    const queryParams = parseQueryString(request.querystring);

    // ログアウトリクエストの処理
    if (queryParams["logout"] === "true") {
      const logoutUrl = buildLogoutUrl(config);
      // アクセストークンとcode_verifierのCookieを削除
      const deleteCookies = [
        buildSetCookie(COOKIE_NAME_ACCESS_TOKEN, "", {
          maxAge: 0,
          path: "/",
          secure: true,
          sameSite: "Lax",
        }),
        buildSetCookie(COOKIE_NAME_CODE_VERIFIER, "", {
          maxAge: 0,
          path: "/",
          secure: true,
          sameSite: "Lax",
        }),
      ];
      return buildRedirectResponse(logoutUrl, deleteCookies);
    }

    // Authorization Codeがある場合(Cognitoからのコールバック)
    const authCode = queryParams["code"];
    if (authCode) {
      const codeVerifier = cookies[COOKIE_NAME_CODE_VERIFIER];

      // code_verifierがない場合は、再度ログインフローを開始
      if (!codeVerifier) {
        const newCodeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(newCodeVerifier);
        const loginUrl = buildLoginUrl(config, codeChallenge);

        const setCookie = buildSetCookie(
          COOKIE_NAME_CODE_VERIFIER,
          newCodeVerifier,
          {
            maxAge: 300, // 5分
            path: "/",
            secure: true,
            sameSite: "Lax",
          }
        );

        return buildRedirectResponse(loginUrl, [setCookie]);
      }

      // トークンを交換
      const accessToken = await exchangeCodeForToken(
        config,
        authCode,
        codeVerifier
      );

      // アクセストークンをCookieに設定し、code_verifierを削除してリダイレクト
      const setCookies = [
        buildSetCookie(COOKIE_NAME_ACCESS_TOKEN, accessToken, {
          maxAge: 3600, // 1時間(Cognitoのトークン有効期限に合わせる)
          path: "/",
          secure: true,
          sameSite: "Lax",
        }),
        buildSetCookie(COOKIE_NAME_CODE_VERIFIER, "", {
          maxAge: 0,
          path: "/",
          secure: true,
          sameSite: "Lax",
        }),
      ];

      // codeパラメータを削除してリダイレクト
      return buildRedirectResponse(
        `https://${config.cloudfrontDomain}/`,
        setCookies
      );
    }

    // アクセストークンの検証
    const accessToken = cookies[COOKIE_NAME_ACCESS_TOKEN];
    if (accessToken && isAccessTokenValid(accessToken)) {
      // 有効なトークンがある場合、リクエストを通過させる
      return request;
    }

    // トークンがない、または無効な場合、Cognito Hosted UIにリダイレクト
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const loginUrl = buildLoginUrl(config, codeChallenge);

    const setCookie = buildSetCookie(COOKIE_NAME_CODE_VERIFIER, codeVerifier, {
      maxAge: 300, // 5分
      path: "/",
      secure: true,
      sameSite: "Lax",
    });

    return buildRedirectResponse(loginUrl, [setCookie]);
  } catch (error) {
    // エラー発生時はログインページにリダイレクト
    console.error("Authentication error:", error);

    // キャッシュされた設定がある場合はそれを使用
    if (cachedConfig) {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const loginUrl = buildLoginUrl(cachedConfig, codeChallenge);

      const setCookie = buildSetCookie(COOKIE_NAME_CODE_VERIFIER, codeVerifier, {
        maxAge: 300,
        path: "/",
        secure: true,
        sameSite: "Lax",
      });

      return buildRedirectResponse(loginUrl, [setCookie]);
    }

    // 設定取得に失敗した場合はエラーレスポンスを返す
    return {
      status: "500",
      statusDescription: "Internal Server Error",
      headers: {
        "content-type": [{ key: "Content-Type", value: "text/plain" }],
      },
      body: "Authentication configuration error",
    };
  }
}

/**
 * テスト用にキャッシュをクリアする関数
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * テスト用にキャッシュを設定する関数
 * @param {CognitoConfig | null} config 設定
 */
export function setConfigCache(config: CognitoConfig | null): void {
  cachedConfig = config;
}
