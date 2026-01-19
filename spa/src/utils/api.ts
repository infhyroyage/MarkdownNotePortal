import axios, { type AxiosRequestConfig } from "axios";
import type {
  CreateMemoResponse,
  GetMemoResponse,
  ListMemosResponse,
  UpdateMemoResponse,
} from "../types/api";
import { COOKIE_NAME_ACCESS_TOKEN } from "./const";

/**
 * API Gatewayのエンドポイント
 */
const API_ENDPOINT: string = import.meta.env.VITE_API_ENDPOINT;

/**
 * Cookieから指定した名前の値を取得する
 * @param {string} name Cookie名
 * @returns {string | null} Cookie値(存在しない場合はnull)
 */
function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");
    if (cookieName === name) {
      return valueParts.join("=");
    }
  }
  return null;
}

/**
 * リクエストの共通設定を取得する
 * @returns {AxiosRequestConfig} リクエストの共通設定
 */
function getRequestConfig(): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (import.meta.env.PROD) {
    // AWS環境の場合、API Gatewayのエンドポイントを設定
    config.baseURL = API_ENDPOINT;

    // AWS環境の場合、CookieからアクセストークンをAuthorizationヘッダーに付与
    const accessToken: string | null = getCookie(COOKIE_NAME_ACCESS_TOKEN);
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }
  }

  return config;
}

/**
 * 発生したエラーからアラートに表示するエラーメッセージを取得する
 * @param {unknown} error 発生したエラー
 * @param {string} defaultMessage デフォルトのエラーメッセージ
 * @returns {string} アラートに表示するエラーメッセージ
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string
): string {
  return axios.isAxiosError(error)
    ? error.response?.data?.message || defaultMessage
    : error instanceof Error
    ? error.message
    : defaultMessage;
}

/**
 * [GET] /memoにアクセスして、メモ一覧を取得する
 * @param {string} [search] 検索文字列(省略可能)
 * @returns {Promise<ListMemosResponse>} メモ一覧
 */
export async function listMemos(search?: string): Promise<ListMemosResponse> {
  const config = getRequestConfig();
  if (search) {
    config.params = { search };
  }
  const response = await axios.get<ListMemosResponse>("/memo", config);
  return response.data;
}

/**
 * [POST] /memoにアクセスして、メモを作成する
 * @param {string} title メモのタイトル
 * @param {string} content メモのコンテンツ
 * @returns {Promise<CreateMemoResponse>} 作成されたメモのIDとタイトル
 */
export async function createMemo(
  title: string,
  content: string
): Promise<CreateMemoResponse> {
  const response = await axios.post<CreateMemoResponse>(
    "/memo",
    {
      title,
      content,
    },
    getRequestConfig()
  );
  return response.data;
}

/**
 * [GET] /memo/{memoId}にアクセスして、メモを取得する
 * @param {string} memoId メモのID
 * @returns {Promise<GetMemoResponse>} メモの詳細
 */
export async function getMemo(memoId: string): Promise<GetMemoResponse> {
  const response = await axios.get<GetMemoResponse>(
    `/memo/${memoId}`,
    getRequestConfig()
  );
  return response.data;
}

/**
 * [PUT] /memo/{memoId}にアクセスして、メモを更新する
 * @param {string} memoId メモのID
 * @param {string} title メモのタイトル
 * @param {string} content メモのコンテンツ
 * @returns {Promise<UpdateMemoResponse>} 更新されたメモの詳細
 */
export async function updateMemo(
  memoId: string,
  title: string,
  content: string
): Promise<UpdateMemoResponse> {
  const response = await axios.put<UpdateMemoResponse>(
    `/memo/${memoId}`,
    {
      title,
      content,
    },
    getRequestConfig()
  );
  return response.data;
}

/**
 * [DELETE] /memo/{memoId}にアクセスして、メモを削除する
 * @param {string} memoId メモのID
 * @returns {Promise<void>}
 */
export async function deleteMemo(memoId: string): Promise<void> {
  await axios.delete(`/memo/${memoId}`, getRequestConfig());
}
