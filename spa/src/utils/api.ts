import axios, { type AxiosRequestConfig } from "axios";
import type {
  CreateMemoResponse,
  GetMemoResponse,
  ListMemosResponse,
  UpdateMemoResponse,
} from "../types/api";
import { SESSION_STORAGE_TOKEN_KEY } from "./auth";

/**
 * リクエストの共通設定を取得
 * @returns {AxiosRequestConfig} リクエストの共通設定
 */
const getRequestConfig = (): AxiosRequestConfig => {
  const config: AxiosRequestConfig = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  // 本番環境のみ、アクセストークンをAuthorizationヘッダーに付与
  if (import.meta.env.PROD) {
    const accessToken = sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY);
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }
  }

  return config;
};

/**
 * メモ一覧を取得
 * @returns {Promise<ListMemosResponse>} メモ一覧
 */
export const listMemos = async (): Promise<ListMemosResponse> => {
  const response = await axios.get<ListMemosResponse>(
    "/memo",
    getRequestConfig()
  );
  return response.data;
};

/**
 * メモを作成
 * @param {string} title メモのタイトル
 * @param {string} content メモのコンテンツ
 * @returns {Promise<CreateMemoResponse>} 作成されたメモのIDとタイトル
 */
export const createMemo = async (
  title: string,
  content: string
): Promise<CreateMemoResponse> => {
  const response = await axios.post<CreateMemoResponse>(
    "/memo",
    {
      title,
      content,
    },
    getRequestConfig()
  );
  return response.data;
};

/**
 * メモを取得
 * @param {string} memoId メモのID
 * @returns {Promise<GetMemoResponse>} メモの詳細
 */
export const getMemo = async (memoId: string): Promise<GetMemoResponse> => {
  const response = await axios.get<GetMemoResponse>(
    `/memo/${memoId}`,
    getRequestConfig()
  );
  return response.data;
};

/**
 * メモを更新
 * @param {string} memoId メモのID
 * @param {string} title メモのタイトル
 * @param {string} content メモのコンテンツ
 * @returns {Promise<UpdateMemoResponse>} 更新されたメモの詳細
 */
export const updateMemo = async (
  memoId: string,
  title: string,
  content: string
): Promise<UpdateMemoResponse> => {
  const response = await axios.put<UpdateMemoResponse>(
    `/memo/${memoId}`,
    {
      title,
      content,
    },
    getRequestConfig()
  );
  return response.data;
};

/**
 * メモを削除
 * @param {string} memoId メモのID
 * @returns {Promise<void>}
 */
export const deleteMemo = async (memoId: string): Promise<void> => {
  await axios.delete(`/memo/${memoId}`, getRequestConfig());
};
