/**
 * メモ一覧取得のレスポンス
 */
export interface ListMemosResponse {
  /**
   * メモ一覧
   */
  items: Array<{
    /**
     * メモのID
     */
    memoId: string;
    /**
     * メモのタイトル
     */
    title: string;
    /**
     * 最終更新日時
     */
    lastUpdatedAt: string;
  }>;
}

/**
 * メモ作成のリクエスト
 */
export interface CreateMemoRequest {
  /**
   * メモのタイトル
   */
  title: string;
  /**
   * メモのコンテンツ
   */
  content: string;
}

/**
 * メモ作成のレスポンス
 */
export interface CreateMemoResponse {
  /**
   * 作成されたメモのID
   */
  memoId: string;
  /**
   * 作成されたメモのタイトル
   */
  title: string;
  /**
   * 最終更新日時
   */
  lastUpdatedAt: string;
}

/**
 * メモ取得のレスポンス
 */
export interface GetMemoResponse {
  /**
   * メモのID
   */
  memoId: string;
  /**
   * メモのタイトル
   */
  title: string;
  /**
   * メモのコンテンツ
   */
  content: string;
}

/**
 * メモ更新のリクエスト
 */
export interface UpdateMemoRequest {
  /**
   * メモのタイトル
   */
  title: string;
  /**
   * メモのコンテンツ
   */
  content: string;
}

/**
 * メモ更新のレスポンス
 */
export interface UpdateMemoResponse {
  /**
   * 更新されたメモのID
   */
  memoId: string;
  /**
   * 更新されたメモのタイトル
   */
  title: string;
  /**
   * 更新されたメモのコンテンツ
   */
  content: string;
  /**
   * 最終更新日時
   */
  lastUpdatedAt: string;
}
