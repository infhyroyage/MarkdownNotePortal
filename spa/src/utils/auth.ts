import axios, { type AxiosResponse } from "axios";
import {
  SESSION_STORAGE_KEY_ACCESS_TOKEN,
  SESSION_STORAGE_KEY_CODE_VERIFIER,
} from "./const";

/**
 * Cognito Hosted UIのクライアントID
 */
const COGNITO_CLIENT_ID: string = import.meta.env.VITE_COGNITO_CLIENT_ID;

/**
 * Cognito Hosted UIのドメイン
 */
const COGNITO_DOMAIN: string = import.meta.env.VITE_COGNITO_DOMAIN;

/**
 * PKCEフロー用のcode_verifierを生成する
 * @param {number} length 生成するPKCEフロー用のcode_verifierの長さ
 * @returns {string} PKCEフロー用のcode_verifier
 */
function generateCodeVerifier(length: number): string {
  const array: Uint8Array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => ("0" + byte.toString(16)).slice(-2)).join(
    ""
  );
}

/**
 * PKCEフロー用のcode_verifierから、PKCEフロー用のcode_challengeを生成する
 * @param {string} codeVerifier PKCEフロー用のcode_verifier
 * @returns {Promise<string>} PKCEフロー用のcode_challenge
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // PKCEフロー用のcode_verifierのSHA-256ハッシュを計算
  const hash: ArrayBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );

  // SHA-256ハッシュをBase64URL形式にエンコード
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * アクセストークンの有効性を検証する
 * @returns {boolean} アクセストークンが有効の場合はtrue、無効または存在しない場合はfalse
 */
export function isAccessTokenValid(): boolean {
  const accessToken: string | null = sessionStorage.getItem(
    SESSION_STORAGE_KEY_ACCESS_TOKEN
  );

  // アクセストークンが存在しない場合は無効とする
  if (!accessToken) {
    return false;
  }

  // JWTトークンとしての構造が不正な場合は無効とする
  const parts: string[] = accessToken.split(".");
  if (parts.length !== 3) {
    return false;
  }

  // JWTトークンのペイロード(2番目)をBase64URL形式からデコードして取得
  const payload: Record<string, unknown> = JSON.parse(
    decodeURIComponent(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
  );

  // 有効期限をチェック(現在時刻より後であれば有効とする)
  const exp: number = payload.exp as number;
  const now: number = Math.floor(Date.now() / 1000);
  return exp > now;
}

/**
 * アクセストークンを発行して、Session Storageに保存する
 * @param {string} code Authorization Code
 * @param {string} codeVerifier PKCEフロー用のcode_verifier
 * @returns {Promise<void>}
 */
export async function issueAccessToken(
  code: string,
  codeVerifier: string
): Promise<void> {
  const response: AxiosResponse<{ access_token: string }> = await axios.post<{
    access_token: string;
  }>(
    `https://${COGNITO_DOMAIN}/oauth2/token`,
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: COGNITO_CLIENT_ID,
      code: code,
      redirect_uri: window.location.origin + "/",
      code_verifier: codeVerifier,
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // アクセストークンをSession Storageに保存
  const accessToken: string = response.data.access_token;
  sessionStorage.setItem(SESSION_STORAGE_KEY_ACCESS_TOKEN, accessToken);

  // PKCEフロー用のcode_verifierは用済みのため削除
  sessionStorage.removeItem(SESSION_STORAGE_KEY_CODE_VERIFIER);
}

/**
 * Cognito Hosted UIのログインページURLを生成する
 * @returns {string} Cognito Hosted UIのログインページURL
 */
export async function getLoginUrl(): Promise<string> {
  // アクセストークンとPKCEフロー用のcode_verifierが残っている場合は事前に削除しておく
  sessionStorage.removeItem(SESSION_STORAGE_KEY_ACCESS_TOKEN);
  sessionStorage.removeItem(SESSION_STORAGE_KEY_CODE_VERIFIER);

  // PKCEフロー用のcode_verifierとcode_challengeを生成
  const codeVerifier: string = generateCodeVerifier(32);
  const codeChallenge: string = await generateCodeChallenge(codeVerifier);

  // PKCEフロー用のcode_verifierをSession Storageに保存
  sessionStorage.setItem(SESSION_STORAGE_KEY_CODE_VERIFIER, codeVerifier);

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    redirect_uri: window.location.origin + "/",
    response_type: "code",
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://${COGNITO_DOMAIN}/login?${params.toString()}`;
}

/**
 * Cognito Hosted UIのログアウトページURLを生成する
 * @returns {string} Cognito Hosted UIのログアウトページURL
 */
export function getLogoutUrl(): string {
  // アクセストークンとPKCEフロー用のcode_verifierが残っている場合は事前に削除しておく
  sessionStorage.removeItem(SESSION_STORAGE_KEY_ACCESS_TOKEN);
  sessionStorage.removeItem(SESSION_STORAGE_KEY_CODE_VERIFIER);

  const params: URLSearchParams = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: window.location.origin + "/",
  });
  return `https://${COGNITO_DOMAIN}/logout?${params.toString()}`;
}
