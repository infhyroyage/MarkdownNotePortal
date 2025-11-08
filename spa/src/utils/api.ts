import axios, { type AxiosRequestConfig } from "axios";
import type {
  CreateMemoResponse,
  GetMemoResponse,
  ListMemosResponse,
  UpdateMemoResponse,
} from "../types/api";
import { SESSION_STORAGE_TOKEN_KEY } from "./auth";

/**
 * API Gatewayのエンドポイント
 */
const API_ENDPOINT: string = import.meta.env.VITE_API_ENDPOINT;

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

    // AWS環境の場合、アクセストークンをAuthorizationヘッダーに付与
    const accessToken = sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY);
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
 * @returns {Promise<ListMemosResponse>} メモ一覧
 */
export async function listMemos(): Promise<ListMemosResponse> {
  const response = await axios.get<ListMemosResponse>(
    "/memo",
    getRequestConfig()
  );
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
