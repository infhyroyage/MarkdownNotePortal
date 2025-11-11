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
   */
  content: string;

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
