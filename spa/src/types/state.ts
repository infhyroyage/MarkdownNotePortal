/**
 * メモの型定義
 */
export interface Memo {
  /**
   * メモのID
   */
  id: string;

  /**
   * メモのタイトル
   */
  title: string;

  /**
   * メモのコンテンツ
   * 一覧取得時は undefined、詳細取得後に実際のコンテンツ（空文字列含む）が設定される
   */
  content: string | undefined;

  /**
   * 最終更新日時
   */
  lastUpdatedAt: string;
}

/**
 * 自動保存の状態
 */
export type SaveStatus = "idle" | "saving" | "saved";

/**
 * ワークスペースのレイアウトモード
 */
export type LayoutMode = "horizontal" | "vertical";
