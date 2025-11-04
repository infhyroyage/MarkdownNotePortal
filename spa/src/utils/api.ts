import axios, { type AxiosRequestConfig } from "axios";
import type {
  CreateMemoRequest,
  CreateMemoResponse,
  GetMemoResponse,
  ListMemosResponse,
  UpdateMemoRequest,
  UpdateMemoResponse,
} from "../types/api";
import { SESSION_STORAGE_TOKEN_KEY } from "./auth";

/**
 * API のベース URL
 */
const API_BASE_URL = "/memo";

/**
 * axios リクエストの共通設定を取得
 * @returns axios リクエストの共通設定
 */
const getAxiosConfig = (): AxiosRequestConfig => {
  const config: AxiosRequestConfig = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  // ローカル環境ではAuthorizationヘッダーを付与しない
  if (import.meta.env.DEV) {
    return config;
  }

  // 本番環境ではSession Storageからアクセストークンを取得して付与
  const accessToken = sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY);
  if (accessToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return config;
};

/**
 * API呼び出し関数
 */

/**
 * メモ一覧を取得
 * @returns メモ一覧
 */
export const listMemos = async (): Promise<ListMemosResponse> => {
  const response = await axios.get<ListMemosResponse>(
    API_BASE_URL,
    getAxiosConfig()
  );
  return response.data;
};

/**
 * メモを作成
 * @param title メモのタイトル
 * @param content メモのコンテンツ
 * @returns 作成されたメモのIDとタイトル
 */
export const createMemo = async (
  title: string,
  content: string
): Promise<CreateMemoResponse> => {
  const requestBody: CreateMemoRequest = {
    title,
    content,
  };
  const response = await axios.post<CreateMemoResponse>(
    API_BASE_URL,
    requestBody,
    getAxiosConfig()
  );
  return response.data;
};

/**
 * メモを取得
 * @param memoId メモのID
 * @returns メモの詳細
 */
export const getMemo = async (memoId: string): Promise<GetMemoResponse> => {
  const response = await axios.get<GetMemoResponse>(
    `${API_BASE_URL}/${memoId}`,
    getAxiosConfig()
  );
  return response.data;
};

/**
 * メモを更新
 * @param memoId メモのID
 * @param title メモのタイトル
 * @param content メモのコンテンツ
 * @returns 更新されたメモの詳細
 */
export const updateMemo = async (
  memoId: string,
  title: string,
  content: string
): Promise<UpdateMemoResponse> => {
  const requestBody: UpdateMemoRequest = {
    title,
    content,
  };
  const response = await axios.put<UpdateMemoResponse>(
    `${API_BASE_URL}/${memoId}`,
    requestBody,
    getAxiosConfig()
  );
  return response.data;
};

/**
 * メモを削除
 * @param memoId メモのID
 */
export const deleteMemo = async (memoId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${memoId}`, getAxiosConfig());
};
