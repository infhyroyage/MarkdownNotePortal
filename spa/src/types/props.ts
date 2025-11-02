import type { ChangeEvent } from "react";
import type { Memo } from "./state";

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
export interface DrawerProps {
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

  /**
   * ドロワーを閉じる関数
   */
  onCloseDrawer: () => void;

  /**
   * メモを追加する関数
   */
  onAddMemo: () => void;

  /**
   * メモを削除する関数
   */
  onDeleteMemo: (memoId: string) => void;
}

/**
 * ヘッダーコンポーネントのProps
 */
export interface HeaderProps {
  /**
   * ヘッダーのタイトル
   */
  title: string;

  /**
   * ドロワーの表示/非表示を切り替える関数
   */
  onToggleDrawer: () => void;

  /**
   * ドロワーが開いているかどうか
   */
  isDrawerOpen: boolean;

  /**
   * タイトルを更新する関数
   */
  onUpdateTitle: (newTitle: string) => void;

  /**
   * 選択中のメモが存在するかどうか
   */
  hasSelectedMemo: boolean;
}

/**
 * ハンバーガーメニューボタンを表示するコンポーネントのProps
 */
export interface HamburgerMenuButtonProps {
  /**
   * ドロワーの表示/非表示を切り替える関数
   */
  onToggleDrawer: () => void;

  /**
   * ドロワーが開いているかどうか
   */
  isDrawerOpen: boolean;
}
