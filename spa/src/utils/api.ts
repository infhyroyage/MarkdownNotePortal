import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  isAxiosError,
} from "axios";
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
 * リクエストの共通設定を取得
 * @returns {AxiosRequestConfig} リクエストの共通設定
 */
const getRequestConfig = (): AxiosRequestConfig => {
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
};

/**
 * Axiosエラーから適切なエラーメッセージを取得
 * @param {unknown} error エラーオブジェクト
 * @param {string} defaultMessage デフォルトのエラーメッセージ
 * @returns {string} エラーメッセージ
 */
export const getErrorMessage = (
  error: unknown,
  defaultMessage: string
): string => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    // レスポンスのmessageフィールドを優先
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    // HTTPステータスに基づいたメッセージ
    if (axiosError.response?.status === 401) {
      return "Authentication failed. Please sign in again.";
    }
    if (axiosError.response?.status === 403) {
      return "You don't have permission to perform this action.";
    }
    if (axiosError.response?.status === 404) {
      return "The requested resource was not found.";
    }
    if (axiosError.response?.status === 500) {
      return "Server error. Please try again later.";
    }
    // ネットワークエラー
    if (axiosError.code === "ERR_NETWORK") {
      return "Network error. Please check your connection.";
    }
    // その他のaxiosエラー
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  // 一般的なエラー
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
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
