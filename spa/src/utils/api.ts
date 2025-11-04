import axios, { type AxiosInstance } from "axios";
import { SESSION_STORAGE_TOKEN_KEY } from "./auth";

/**
 * API呼び出し用のaxiosインスタンスを作成
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.DEV ? "/memo" : "/memo",
    headers: {
      "Content-Type": "application/json",
    },
  });

  // リクエストインターセプター：Authorizationヘッダーを追加
  client.interceptors.request.use((config) => {
    // ローカル環境ではAuthorizationヘッダーを付与しない
    if (import.meta.env.DEV) {
      return config;
    }

    // 本番環境ではSession Storageからアクセストークンを取得して付与
    const accessToken = sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  return client;
};

const apiClient = createApiClient();

/**
 * API呼び出し関数
 */

/**
 * メモ一覧を取得
 * @returns メモ一覧
 */
export const listMemos = async (): Promise<{
  items: Array<{ memoId: string; title: string }>;
}> => {
  const response = await apiClient.get<{
    items: Array<{ memoId: string; title: string }>;
  }>("");
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
): Promise<{ memoId: string; title: string }> => {
  const response = await apiClient.post<{ memoId: string; title: string }>(
    "",
    {
      title,
      content,
    }
  );
  return response.data;
};

/**
 * メモを取得
 * @param memoId メモのID
 * @returns メモの詳細
 */
export const getMemo = async (
  memoId: string
): Promise<{ memoId: string; title: string; content: string }> => {
  const response = await apiClient.get<{
    memoId: string;
    title: string;
    content: string;
  }>(`/${memoId}`);
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
): Promise<{ memoId: string; title: string; content: string }> => {
  const response = await apiClient.put<{
    memoId: string;
    title: string;
    content: string;
  }>(`/${memoId}`, {
    title,
    content,
  });
  return response.data;
};

/**
 * メモを削除
 * @param memoId メモのID
 */
export const deleteMemo = async (memoId: string): Promise<void> => {
  await apiClient.delete(`/${memoId}`);
};
