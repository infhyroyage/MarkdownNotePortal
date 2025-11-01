import type { ChangeEvent } from "react";

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
}

/**
 * ワークスペースの左側にあるMarkdownエディターを表示するコンポーネントのProps
 */
export interface WorkspaceEditorProps {
  /**
   * Markdownコンテンツ
   */
  markdownContent: string;

  /**
   * Markdownコンテンツを変更する関数
   */
  handleMarkdownContentChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

/**
 * ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネントのProps
 */
export interface WorkspacePreviewProps {
  /**
   * Markdownコンテンツ
   */
  markdownContent: string;
}

/**
 * メモドロワーコンポーネントのProps
 */
export interface MemoDrawerProps {
  /**
   * メモのリスト
   */
  memos: Memo[];

  /**
   * 選択中のメモのID
   */
  selectedMemoId: string | null;

  /**
   * メモを選択する関数
   */
  onSelectMemo: (memoId: string) => void;

  /**
   * ドロワーが開いているかどうか
   */
  isOpen: boolean;
}

/**
 * ヘッダーコンポーネントのProps
 */
export interface HeaderProps {
  /**
   * ドロワーの表示/非表示を切り替える関数
   */
  onToggleDrawer: () => void;
}
